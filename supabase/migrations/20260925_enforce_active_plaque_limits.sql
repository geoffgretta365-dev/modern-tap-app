-- NOT APPLIED by the implementation. Run in a test project first.
-- Populate moderntap_private.price_entitlements with approved Stripe Price IDs
-- before allowing customers to create/reactivate plaques. No existing plaque is disabled.
begin;
create schema if not exists moderntap_private;
revoke all on schema moderntap_private from public, anon, authenticated;

create table moderntap_private.price_entitlements (
  stripe_price_id text primary key,
  plan_key text not null,
  maximum_active integer not null check (maximum_active > 0),
  constraint approved_plaque_limits check (
    (plan_key = 'starter' and maximum_active = 5) or
    (plan_key = 'growth' and maximum_active = 10) or
    (plan_key = 'pro' and maximum_active = 20) or
    (plan_key = 'business' and maximum_active = 30) or
    (plan_key = 'custom' and maximum_active >= 31) or
    (plan_key = 'legacy' and maximum_active > 0)
  )
);
-- Custom/legacy limits require an explicit operator-approved Price ID and allowance.
-- No authenticated/service API has write access to this configuration.
create table moderntap_private.plaque_usage (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  active_count integer not null default 0 check (active_count >= 0)
);
create table moderntap_private.plan_change_locks (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  token uuid not null,
  expires_at timestamptz not null
);
revoke all on all tables in schema moderntap_private from public, anon, authenticated, service_role;

revoke truncate on public.plaques from public, anon, authenticated, service_role;

-- Block writes while initializing counters; existing over-limit rows are retained.
lock table public.plaques in share row exclusive mode;
insert into moderntap_private.plaque_usage (business_id, active_count)
select b.id, count(p.id) filter (where p.active)::integer
from public.businesses b left join public.plaques p on p.business_id = b.id group by b.id;

create function moderntap_private.guard_plaque_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target_business uuid;
  delta integer;
  max_active integer;
  subscription_status text;
  subscription_ref text;
  price_ref text;
begin
  target_business := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
  if coalesce(auth.role(), '') not in ('service_role', '') and
    (auth.uid() is null or not exists (
      select 1 from public.businesses where id = target_business and owner_id = auth.uid()
    )) then raise exception using errcode = '42501', message = 'Plaque ownership required'; end if;
  if tg_op = 'UPDATE' and new.business_id is distinct from old.business_id then
    raise exception using errcode = '42501', message = 'Plaque transfers require a reviewed administrative workflow';
  end if;
  delta := case when tg_op = 'INSERT' then new.active::integer
    when tg_op = 'DELETE' then -old.active::integer
    else new.active::integer - old.active::integer end;
  if delta = 0 then return coalesce(new, old); end if;
  -- The row counter, not a count-then-insert snapshot, serializes concurrent changes.
  if delta > 0 then
    insert into moderntap_private.plaque_usage(business_id) values (target_business) on conflict do nothing;
    select status, stripe_subscription_id, stripe_price_id
    into subscription_status, subscription_ref, price_ref
    from public.subscriptions where business_id = target_business for share;
    if subscription_status is null or subscription_status not in ('active', 'trialing') or nullif(subscription_ref, '') is null then
      raise exception using errcode = 'P0001', message = 'MT_SUBSCRIPTION_REQUIRED';
    end if;
    select maximum_active into max_active from moderntap_private.price_entitlements where stripe_price_id = price_ref;
    if max_active is null then raise exception using errcode = 'P0001', message = 'MT_ENTITLEMENT_UNCONFIGURED'; end if;
    update moderntap_private.plaque_usage set active_count = active_count + 1
      where business_id = target_business and active_count < max_active;
    if not found then raise exception using errcode = 'P0001', message = 'MT_PLAQUE_LIMIT'; end if;
  else
    -- Business deletion may already have cascaded the usage row away.
    update moderntap_private.plaque_usage set active_count = active_count - 1
      where business_id = target_business and active_count > 0;
  end if;
  return coalesce(new, old);
end;
$$;
-- AFTER ensures ON CONFLICT/no-op inserts and other BEFORE triggers cannot drift counters.
create trigger enforce_active_plaque_capacity after insert or update or delete on public.plaques
  for each row execute function moderntap_private.guard_plaque_capacity();
revoke all on function moderntap_private.guard_plaque_capacity() from public;

-- Do not depend on undocumented deployed RLS policies for protected subscription writes.
-- Stripe webhooks retain service-role writes; customer apps only need SELECT.
revoke insert, update, delete, truncate on public.subscriptions from public, anon, authenticated;
do $$ declare c record; begin
  for c in select column_name from information_schema.columns where table_schema='public' and table_name='subscriptions' loop
    execute format('revoke insert (%I), update (%I) on public.subscriptions from public, anon, authenticated', c.column_name, c.column_name);
  end loop;
end $$;

create function public.plaque_entitlement(p_business_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.role() is distinct from 'service_role' and not exists (
    select 1 from public.businesses where id = p_business_id and owner_id = auth.uid()
  ) then raise exception using errcode = '42501', message = 'Business ownership required'; end if;
  select jsonb_build_object(
    'activeCount', coalesce(u.active_count, 0),
    'maximum', case when s.status in ('active','trialing') and nullif(s.stripe_subscription_id,'') is not null then e.maximum_active else null end,
    'planKey', e.plan_key
  ) into result
  from public.businesses b
  left join moderntap_private.plaque_usage u on u.business_id = b.id
  left join public.subscriptions s on s.business_id = b.id
  left join moderntap_private.price_entitlements e on e.stripe_price_id = s.stripe_price_id
  where b.id = p_business_id;
  return result;
end;
$$;
revoke all on function public.plaque_entitlement(uuid) from public, anon;
grant execute on function public.plaque_entitlement(uuid) to authenticated, service_role;

-- Serialize app-initiated Stripe updates across server instances. No customer RPC access.
create function public.reserve_plan_change(p_business_id uuid, p_expected_price text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lease uuid := gen_random_uuid(); acquired uuid;
begin
  if not exists (select 1 from public.subscriptions where business_id = p_business_id
    and stripe_price_id = p_expected_price and status in ('active','trialing')) then return null; end if;
  insert into moderntap_private.plan_change_locks as locks values (p_business_id, lease, now() + interval '10 minutes')
  on conflict (business_id) do update set token = excluded.token, expires_at = excluded.expires_at
    where locks.expires_at < now()
  returning token into acquired;
  return acquired;
end;
$$;
create function public.release_plan_change(p_business_id uuid, p_token uuid) returns void
language sql security definer set search_path = '' as $$
  delete from moderntap_private.plan_change_locks where business_id = p_business_id and token = p_token;
$$;
revoke all on function public.reserve_plan_change(uuid,text), public.release_plan_change(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_plan_change(uuid,text), public.release_plan_change(uuid,uuid) to service_role;
create function public.configured_plaque_limit(p_price_id text) returns integer
language sql stable security definer set search_path = '' as $$
  select maximum_active from moderntap_private.price_entitlements where stripe_price_id = p_price_id;
$$;
revoke all on function public.configured_plaque_limit(text) from public, anon, authenticated;
grant execute on function public.configured_plaque_limit(text) to service_role;
commit;
