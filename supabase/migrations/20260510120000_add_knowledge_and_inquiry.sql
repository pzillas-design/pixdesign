-- Knowledge base table (key-value, editable in admin)
create table public.pix_knowledge (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz default now()
);

-- Inquiry fields (what the AI should ask before sending email)
create table public.pix_inquiry_fields (
  id          text primary key,
  label       text not null,
  question    text not null,
  required    boolean not null default false,
  sort_order  int default 0,
  updated_at  timestamptz default now()
);

-- Enable RLS (anon read, authenticated write)
alter table public.pix_knowledge enable row level security;
alter table public.pix_inquiry_fields enable row level security;

create policy "public read knowledge" on public.pix_knowledge for select using (true);
create policy "auth write knowledge" on public.pix_knowledge for all using (auth.role() = 'authenticated');

create policy "public read inquiry fields" on public.pix_inquiry_fields for select using (true);
create policy "auth write inquiry fields" on public.pix_inquiry_fields for all using (auth.role() = 'authenticated');
