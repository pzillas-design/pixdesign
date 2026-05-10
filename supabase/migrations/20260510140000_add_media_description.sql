alter table public.pix_media add column if not exists description text not null default '';
alter table public.pix_media add column if not exists category text not null default '';
