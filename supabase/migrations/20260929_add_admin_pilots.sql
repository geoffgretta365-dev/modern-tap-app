-- Admin pilot setup. NOT APPLIED to production by this implementation.
-- This migration works with or without the optional 20260925 entitlement migration.
-- If installing entitlement enforcement later, reapply the conditional function block below
-- after 20260925 so that its trigger retains the service-role-only pilot exception.
begin;

alter table public.businesses
  alter column owner_id drop not null,
  add column is_pilot boolean not null default false,
  add column trial_started_at timestamptz,
  add column trial_ends_at timestamptz,
  add column pilot_reviews_start integer check (pilot_reviews_start >= 0),
  add column pilot_rating_start numeric check (pilot_rating_start between 1 and 5),
  add column pilot_reviews_end integer check (pilot_reviews_end >= 0),
  add column pilot_rating_end numeric check (pilot_rating_end between 1 and 5),
  add column pilot_notes text,
  add constraint businesses_pilot_trial_dates check (
    trial_ends_at is null or trial_started_at is null or trial_ends_at > trial_started_at
  );

alter table public.plaques add column placement text
  check (placement in ('table', 'checkbook', 'register', 'other'));

-- Restrictive policies AND with the existing permissive policies; they do not grant access.
-- NULL owners never match auth.uid(), including anonymous requests.
alter table public.businesses enable row level security;
create policy businesses_owner_boundary on public.businesses
  as restrictive for all to anon, authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Table-level customer UPDATE/INSERT grants must not allow clients to self-assign pilot status.
-- Preserve those grants (and existing onboarding writes), protecting only new admin fields.
create schema if not exists moderntap_private;
revoke all on schema moderntap_private from public, anon, authenticated;
create or replace function moderntap_private.protect_pilot_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.is_pilot or new.trial_started_at is not null or new.trial_ends_at is not null
      or new.pilot_reviews_start is not null or new.pilot_rating_start is not null
      or new.pilot_reviews_end is not null or new.pilot_rating_end is not null
      or new.pilot_notes is not null then
      raise exception using errcode = '42501', message = 'Pilot fields require an administrator';
    end if;
  elsif row(new.is_pilot, new.trial_started_at, new.trial_ends_at,
    new.pilot_reviews_start, new.pilot_rating_start, new.pilot_reviews_end,
    new.pilot_rating_end, new.pilot_notes) is distinct from
    row(old.is_pilot, old.trial_started_at, old.trial_ends_at,
    old.pilot_reviews_start, old.pilot_rating_start, old.pilot_reviews_end,
    old.pilot_rating_end, old.pilot_notes) then
    raise exception using errcode = '42501', message = 'Pilot fields require an administrator';
  end if;
  return new;
end;
$$;
revoke all on function moderntap_private.protect_pilot_fields() from public;
create trigger protect_business_pilot_fields before insert or update on public.businesses
  for each row execute function moderntap_private.protect_pilot_fields();

-- Do not install or enable entitlement enforcement when it is absent.
do $migration$
begin
  if to_regprocedure('moderntap_private.guard_plaque_capacity()') is not null then
    execute $definition$
create or replace function moderntap_private.guard_plaque_capacity() returns trigger
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
    -- Pilot bypass is limited to trusted server requests; owners still use normal capacity checks.
    if auth.role() = 'service_role' and exists (
      select 1 from public.businesses where id = target_business and is_pilot = true
    ) then
      update moderntap_private.plaque_usage set active_count = active_count + 1
        where business_id = target_business;
      return new;
    end if;
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
$definition$;
  end if;
end;
$migration$;

commit;
