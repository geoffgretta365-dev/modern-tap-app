-- Review Card purpose is independent of the plaque's routing mode.
alter table public.plaques
  add column if not exists purpose text not null default 'general';

alter table public.plaques
  add constraint plaques_purpose_check
  check (purpose in ('general', 'review'));

create table public.design_change_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plaque_id uuid not null references public.plaques(id) on delete cascade,
  request_type text not null default 'design_change'
    check (request_type = 'design_change'),
  notes text not null check (char_length(notes) between 1 and 2000),
  inspiration_url text null
    check (inspiration_url is null or (char_length(inspiration_url) <= 2048
      and inspiration_url ~* '^https?://[^[:space:]]+$')),
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'designing', 'ready', 'completed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index design_change_requests_business_created_idx
  on public.design_change_requests (business_id, created_at desc);

alter table public.design_change_requests enable row level security;

grant select on public.design_change_requests to authenticated;
grant insert (business_id, plaque_id, notes, inspiration_url)
  on public.design_change_requests to authenticated;

create policy "Owners can view their design requests"
  on public.design_change_requests for select to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = design_change_requests.business_id
      and b.owner_id = auth.uid()
  ));

create policy "Owners can request designs for their plaques"
  on public.design_change_requests for insert to authenticated
  with check (
    status = 'submitted'
    and request_type = 'design_change'
    and exists (
      select 1 from public.businesses b
      join public.plaques p on p.business_id = b.id
      where b.id = design_change_requests.business_id
        and p.id = design_change_requests.plaque_id
        and b.owner_id = auth.uid()
    )
  );

-- No customer UPDATE or DELETE policy: status belongs to the server-side admin workflow.
