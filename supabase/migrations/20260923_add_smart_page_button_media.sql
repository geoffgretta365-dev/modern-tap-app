-- Apply before deploying readers of these columns. Existing rows remain text-only.
alter table public.smart_page_buttons
  add column icon_key text null,
  add column image_path text null,
  add constraint smart_page_buttons_one_media_check
    check (icon_key is null or image_path is null),
  add constraint smart_page_buttons_icon_key_check
    check (icon_key is null or icon_key in (
      'instagram', 'facebook', 'tiktok', 'youtube', 'website', 'menu',
      'reviews', 'order', 'reservation', 'phone', 'email', 'directions', 'shop'
    ));
