-- Pilot results and clean tap counts. NOT APPLIED to production.
-- Requires 20260929_add_admin_pilots.sql; does not enable billing/entitlements.
begin;

alter table public.tap_events
  add column is_bot boolean not null default false,
  add column is_repeat boolean not null default false;

-- Reuse any valid, non-partial btree index starting with these two columns.
do $$
begin
  if not exists (
    select 1 from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_am am on am.oid = c.relam
    join pg_attribute p on p.attrelid = i.indrelid and p.attnum = i.indkey[0]
    join pg_attribute t on t.attrelid = i.indrelid and t.attnum = i.indkey[1]
    where i.indrelid = 'public.tap_events'::regclass and i.indisvalid
      and i.indpred is null and i.indnkeyatts >= 2 and am.amname = 'btree'
      and p.attname = 'plaque_id' and t.attname = 'created_at'
  ) then
    create index tap_events_plaque_created_at_idx on public.tap_events (plaque_id, created_at);
  end if;
end;
$$;

-- Classify historical rows from available evidence. Historical HEAD methods were
-- not stored, so they cannot be identified retrospectively without a bot UA.
-- Markers match lib/tap-classification.ts (case-insensitive substring matching).
with classified as (
  select id,
    lower(coalesce(user_agent, '')) like any (array[
      '%facebookexternalhit%', '%facebot%', '%twitterbot%', '%slackbot%',
      '%linkedinbot%', '%whatsapp%', '%telegrambot%', '%discordbot%',
      '%googlebot%', '%bingbot%', '%crawler%', '%spider%', '%bot/%'
    ]) as bot,
    coalesce(created_at - lag(created_at) over (
      partition by plaque_id, user_agent order by created_at, id
    ) <= interval '30 seconds', false) as repeat
  from public.tap_events
)
update public.tap_events t set is_bot = c.bot, is_repeat = c.repeat
from classified c where c.id = t.id;

-- Lock per plaque before checking the previous event. At READ COMMITTED, the
-- subsequent query sees the prior inserter's committed row after waiting.
-- Use recording time after the lock, not a transaction-start timestamp.
create function moderntap_private.classify_repeat_tap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.plaques where id = new.plaque_id for update;
  new.created_at := clock_timestamp();
  new.is_repeat := exists (
    select 1 from public.tap_events
    where plaque_id = new.plaque_id
      and user_agent is not distinct from new.user_agent
      and created_at >= new.created_at - interval '30 seconds'
      and created_at <= new.created_at
  );
  return new;
end;
$$;
revoke all on function moderntap_private.classify_repeat_tap() from public;
create trigger classify_repeat_tap before insert on public.tap_events
  for each row execute function moderntap_private.classify_repeat_tap();

alter table public.businesses add column pilot_share_token text unique;

-- The previous pilot-field guard remains intact; extend protection to tokens.
create function moderntap_private.protect_pilot_share_token() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.pilot_share_token is not null) or
     (tg_op = 'UPDATE' and new.pilot_share_token is distinct from old.pilot_share_token) then
    raise exception using errcode = '42501', message = 'Pilot sharing requires an administrator';
  end if;
  return new;
end;
$$;
revoke all on function moderntap_private.protect_pilot_share_token() from public;
create trigger protect_pilot_share_token before insert or update on public.businesses
  for each row execute function moderntap_private.protect_pilot_share_token();

-- Correct pilot dates written at UTC midnight by the original pilot form.
-- Preserve the chosen calendar dates; leave already-Eastern or custom times alone.
update public.businesses
set trial_started_at = (trial_started_at at time zone 'UTC') at time zone 'America/New_York',
    trial_ends_at = (trial_ends_at at time zone 'UTC') at time zone 'America/New_York'
where is_pilot = true
  and (trial_started_at at time zone 'UTC')::time = time '00:00'
  and (trial_ends_at at time zone 'UTC')::time = time '00:00';

commit;
