-- Apply before deploying V2 readers. No customer records are updated.
begin;
alter table public.smart_pages
  add column presentation_version smallint not null default 1
    check (presentation_version in (1, 2)),
  add column page_background_color text null
    check (page_background_color is null or page_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column background_mode text null
    check (background_mode is null or background_mode in ('solid', 'gradient')),
  add column gradient_end_color text null
    check (gradient_end_color is null or gradient_end_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column gradient_direction text null
    check (gradient_direction is null or gradient_direction in ('down', 'diagonal')),
  add column logo_size text null
    check (logo_size is null or logo_size in ('small', 'medium', 'large')),
  add column content_alignment text null
    check (content_alignment is null or content_alignment in ('center', 'left'));

alter table public.smart_pages drop constraint smart_pages_theme_preset_check;
alter table public.smart_pages add constraint smart_pages_theme_preset_check
  check (theme_preset in ('clean', 'dark', 'modern', 'warm', 'minimal', 'bold',
    'bistro', 'espresso', 'studio', 'motion', 'boutique', 'coastal'));
commit;
