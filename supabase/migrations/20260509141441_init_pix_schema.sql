-- ============================================================
-- PIX Admin Schema
-- ============================================================

-- Mediathek
create table public.pix_media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  url          text not null,
  filename     text not null,
  alt          text default '',
  tags         text[] default '{}',
  theme        text default '',
  width        int,
  height       int,
  size_bytes   int,
  created_at   timestamptz default now()
);

-- Chat Flow Nodes
create table public.pix_flow_nodes (
  id          text primary key,
  text        text not null,
  chips       jsonb default '[]',
  media_ids   uuid[] default '{}',
  image_mode  text default 'gallery',
  sort_order  int default 0,
  updated_at  timestamptz default now()
);

-- AI Konfiguration
create table public.pix_ai_config (
  id           text primary key default 'default',
  base_prompt  text not null default '',
  about_pix    text not null default '',
  persona_tone text not null default ''
);

-- AI Bild-Regeln
create table public.pix_ai_rules (
  id               uuid primary key default gen_random_uuid(),
  trigger_keywords text[] not null default '{}',
  media_ids        uuid[] not null default '{}',
  description      text default '',
  created_at       timestamptz default now()
);

-- ============================================================
-- Storage Bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('pix-media', 'pix-media', true)
on conflict do nothing;

create policy "Public read"
  on storage.objects for select
  using ( bucket_id = 'pix-media' );

create policy "Auth upload"
  on storage.objects for insert
  with check ( bucket_id = 'pix-media' and auth.role() = 'authenticated' );

create policy "Auth delete"
  on storage.objects for delete
  using ( bucket_id = 'pix-media' and auth.role() = 'authenticated' );

-- ============================================================
-- Seed: Flow Nodes
-- ============================================================
insert into public.pix_flow_nodes (id, text, chips, sort_order) values
  ('start',            'Hallo, willkommen bei PIX. Kreative Agentur in Frankfurt fuer Websites, Apps, Fotos und Filme.', '[{"label":"Webdesign","targetId":"web","icon":"globe"},{"label":"Fotografie","targetId":"photo","icon":"camera"},{"label":"Videos","targetId":"video","icon":"film"}]', 0),
  ('web',              'Klar. Geht es eher um einen Auftritt, ein digitales Tool oder eine sehr fokussierte Landing Page?', '[{"label":"Business","targetId":"web-business","icon":"briefcase"},{"label":"Tools","targetId":"web-tools","icon":"wrench"},{"label":"Landing Pages","targetId":"web-landing","icon":"zap"}]', 1),
  ('photo',            'Professionelle Fotografie fuer jeden Anlass. Was moechtest du sehen?', '[{"label":"Business","targetId":"photo-business","icon":"briefcase"},{"label":"Events","targetId":"photo-events","icon":"calendar"},{"label":"Immobilien","targetId":"photo-realestate","icon":"home"}]', 2),
  ('video',            'Bewegtbild, das nicht nur dekoriert. Welche Richtung passt zu deinem Projekt?', '[{"label":"Imagefilme","targetId":"video-brand","icon":"play"},{"label":"Events","targetId":"video-event","icon":"clapperboard"},{"label":"Immobilien","targetId":"video-realestate","icon":"home"}]', 3),
  ('web-business',     'Dann wuerde ich zuerst klaeren, was Menschen in den ersten zehn Sekunden verstehen muessen.', '[{"label":"Zurueck","targetId":"web","icon":"rotateccw"}]', 4),
  ('web-tools',        'Wenn heute noch viel in Tabellen, Mails oder Bauchgefuehl steckt, kann ein kleines Tool sehr viel Ruhe reinbringen.', '[{"label":"Zurueck","targetId":"web","icon":"rotateccw"}]', 5),
  ('web-landing',      'Landing Pages sollten nicht viel erklaeren, sondern schnell die richtige Entscheidung leichter machen.', '[{"label":"Zurueck","targetId":"web","icon":"rotateccw"}]', 6),
  ('photo-business',   'Bei Business-Fotos geht es meistens um Vertrauen. Nicht zu steif, nicht zu inszeniert.', '[{"label":"Zurueck","targetId":"photo","icon":"rotateccw"}]', 7),
  ('photo-events',     'Events brauchen Bilder, die sich spaeter noch nach dem Abend anfuehlen.', '[{"label":"Zurueck","targetId":"photo","icon":"rotateccw"}]', 8),
  ('photo-realestate', 'Bei Immobilien wuerde ich ruhig bleiben. Klare Perspektiven, gutes Licht, kein Show-Effekt.', '[{"label":"Zurueck","targetId":"photo","icon":"rotateccw"}]', 9),
  ('video-brand',      'Ein Imagefilm sollte ein Gefuehl setzen und schnell zeigen, warum es euch gibt.', '[{"label":"Zurueck","targetId":"video","icon":"rotateccw"}]', 10),
  ('video-event',      'Ein Eventfilm braucht Tempo, Stimmen und die kleinen Momente zwischen den Programmpunkten.', '[{"label":"Zurueck","targetId":"video","icon":"rotateccw"}]', 11),
  ('video-realestate', 'Immobilienfilm darf ruhig sein. Ein guter Rundgang zeigt Orientierung und laesst Raeume wirken.', '[{"label":"Zurueck","targetId":"video","icon":"rotateccw"}]', 12);

-- Default AI Config
insert into public.pix_ai_config (id, base_prompt, about_pix, persona_tone) values (
  'default',
  'Du bist ein freundlicher, knapper Assistent fuer PIX, eine Kreativagentur in Frankfurt. Antworte auf Deutsch, kurz und praezise.',
  'PIX ist eine Kreativagentur in Frankfurt. Wir machen Webdesign, Fotografie und Videoproduktion.',
  'Ruhig, professionell, auf Augenhoehe. Kein Marketing-Speak.'
);
