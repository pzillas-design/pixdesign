create table public.pix_tools (
  id          text primary key,
  name        text not null,
  description text not null,
  config      jsonb not null default '{}',
  active      boolean not null default true,
  sort_order  int default 0,
  updated_at  timestamptz default now()
);

insert into public.pix_tools (id, name, description, config, sort_order) values
('contact', 'Kontakt', 'Zeigt Kontaktinformationen wenn der User Kontakt aufnehmen möchte.', '{"email":"hallo@pix-frankfurt.de","phone":"+49 69 000 000 00","cta_email":"E-Mail schreiben","cta_phone":"Anrufen"}', 0),
('book', 'Shooting buchen', 'Öffnet das Buchungsmodul wenn der User ein Shooting oder Erstgespräch buchen möchte.', '{"url":"https://cal.com/pix","label":"Termin auswählen","note":"Kostenloses Erstgespräch · 30 Minuten"}', 1),
('references', 'Referenzen', 'Zeigt Referenzprojekte. Optionaler Parameter category: web | photo | video.', '{"title":"Unsere Arbeiten"}', 2);
