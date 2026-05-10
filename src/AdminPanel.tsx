import { useEffect, useRef, useState } from 'react';
import { supabase, PixMedia } from './lib/supabase';
import { Upload, Trash2, Save, LogOut, Image, MessageSquare, Bot, X, Plus, Loader, Mail, Euro, Mic } from 'lucide-react';

type Tab = 'media' | 'knowledge' | 'inquiry';

// ─────────────────────────────────────────────
// Auth Gate
// ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onLogin();
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
      <form onSubmit={handleSubmit} style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <img src="/pix-logo.svg" alt="PIX" style={{ width: 80, marginBottom: 16, filter: 'invert(1)' }} />
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: 0 }}>Admin</h1>
        {error && <p style={{ color: '#ff6b6b', fontSize: 14, margin: 0 }}>{error}</p>}
        <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Einloggen...' : 'Einloggen'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mediathek
// ─────────────────────────────────────────────
function MediaTab() {
  const [media, setMedia] = useState<PixMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<PixMedia | null>(null);
  const [tagInput, setTagInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMedia(); }, []);

  async function fetchMedia() {
    setLoading(true);
    const { data } = await supabase.from('pix_media').select('*').order('created_at', { ascending: false });
    setMedia(data ?? []);
    setLoading(false);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('pix-media').upload(path, file);
      if (upErr) continue;
      const { data: urlData } = supabase.storage.from('pix-media').getPublicUrl(path);
      await supabase.from('pix_media').insert({ storage_path: path, url: urlData.publicUrl, filename: file.name, size_bytes: file.size });
    }
    await fetchMedia();
    setUploading(false);
  }

  async function handleDelete(item: PixMedia) {
    if (!confirm(`"${item.filename}" löschen?`)) return;
    await supabase.storage.from('pix-media').remove([item.storage_path]);
    await supabase.from('pix_media').delete().eq('id', item.id);
    setSelected(null);
    fetchMedia();
  }

  async function saveSelected() {
    if (!selected) return;
    await supabase.from('pix_media').update({ alt: selected.alt, tags: selected.tags, theme: selected.theme }).eq('id', selected.id);
    fetchMedia();
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || !selected || selected.tags.includes(t)) return;
    setSelected({ ...selected, tags: [...selected.tags, t] });
    setTagInput('');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', height: '100%' }}>
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={primaryBtn}>
            {uploading ? <Loader size={16} /> : <Upload size={16} />}
            {uploading ? 'Uploading...' : 'Bilder hochladen'}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{media.length} Bilder</span>
        </div>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: 60 }}>Lädt...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {media.map(item => (
              <div key={item.id} onClick={() => setSelected(item)} style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: selected?.id === item.id ? '2px solid #fff' : '2px solid transparent', background: '#111' }}>
                <img src={item.url} alt={item.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Details</span>
            <button onClick={() => setSelected(null)} style={iconBtn}><X size={16} /></button>
          </div>
          <img src={selected.url} alt="" style={{ width: '100%', borderRadius: 10, objectFit: 'cover' }} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Alt-Text</span>
            <input value={selected.alt} onChange={e => setSelected({ ...selected, alt: e.target.value })} style={inputStyle} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Tags</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {selected.tags.map(t => (
                <span key={t} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t}
                  <button onClick={() => setSelected({ ...selected, tags: selected.tags.filter(x => x !== t) })} style={{ background: 'none', color: 'rgba(255,255,255,0.5)', padding: 0, lineHeight: 1 }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Tag hinzufügen" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addTag} style={iconBtn}><Plus size={16} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button onClick={saveSelected} style={{ ...primaryBtn, flex: 1 }}><Save size={15} /> Speichern</button>
            <button onClick={() => handleDelete(selected)} style={{ ...iconBtn, background: 'rgba(255,80,80,0.15)', color: '#ff6b6b' }}><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Knowledge Base Editor
// ─────────────────────────────────────────────
type KnowledgeRow = { id: string; key: string; value: string; label: string; hint: string };

const DEFAULT_KNOWLEDGE: Omit<KnowledgeRow, 'id'>[] = [
  { key: 'persona', label: 'Persona & Ton', hint: 'Wie verhält sich der Assistent? Was ist sein Stil?', value: 'Du bist der persönliche KI-Assistent von PIX, einer Kreativagentur in Frankfurt. Ruhig, direkt, auf Augenhöhe. Kein Marketing-Speak. Chat-typisch kurz. Antworte immer auf Deutsch.' },
  { key: 'services_web', label: 'Webdesign', hint: 'Was bietet PIX im Bereich Web an?', value: 'Websites, Web-Apps, Tools, Landing Pages. Modern, durchdacht, mit Fokus auf Wirkung. Ab 3.000 EUR.' },
  { key: 'services_photo', label: 'Fotografie', hint: 'Was bietet PIX im Bereich Foto an?', value: 'Business-Portraits, Events, Immobilien, Architektur. Klare Bildsprache, kein Show-Effekt. Ab 800 EUR (Halbtag).' },
  { key: 'services_video', label: 'Video', hint: 'Was bietet PIX im Bereich Video an?', value: 'Imagefilme, Eventfilme, Immobilienvideos, Drohne. Bewegtbild, das nicht nur dekoriert. Ab 1.500 EUR.' },
  { key: 'not_offered', label: 'Was wir NICHT machen', hint: 'Was lehnt PIX ab?', value: 'Kein Printdesign (Flyer, Visitenkarten). Keine Social-Media-Verwaltung. Kein Massengeschäft.' },
  { key: 'contact', label: 'Kontakt & E-Mail', hint: 'Kontaktdaten die der Assistent nennen darf', value: 'E-Mail: pzillas2@gmail.com — Erstkontakt ist unverbindlich.' },
  { key: 'location', label: 'Standort', hint: 'Wo ist PIX tätig?', value: 'Frankfurt am Main und Umgebung.' },
];

function KnowledgeTab() {
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('pix_knowledge').select('*');
    if (data && data.length > 0) {
      // Merge with defaults to ensure all keys present
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
      setRows(DEFAULT_KNOWLEDGE.map((d, i) => ({ ...d, id: String(i), value: map[d.key] ?? d.value })));
    } else {
      setRows(DEFAULT_KNOWLEDGE.map((d, i) => ({ ...d, id: String(i) })));
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const upserts = rows.map(r => ({ key: r.key, value: r.value }));
    await supabase.from('pix_knowledge').upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(key: string, value: string) {
    setRows(rs => rs.map(r => r.key === key ? { ...r, value } : r));
  }

  if (loading) return <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)' }}>Lädt...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 28, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Knowledge Base</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '4px 0 0' }}>Was die AI über PIX weiß — direkt editierbar</p>
        </div>
        <button onClick={save} disabled={saving} style={primaryBtn}>
          <Save size={15} /> {saving ? 'Speichert...' : saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>

      {rows.map(row => (
        <label key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>{row.label}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{row.hint}</span>
          <textarea
            value={row.value}
            onChange={e => update(row.key, e.target.value)}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Anfrage-Felder Editor
// ─────────────────────────────────────────────
type InquiryField = { id: string; label: string; question: string; required: boolean };

const DEFAULT_FIELDS: InquiryField[] = [
  { id: '1', label: 'Art', question: 'Was soll entstehen? (Webseite, Fotoshooting, Video...)', required: true },
  { id: '2', label: 'Datum', question: 'Für welches Datum oder welchen Zeitraum planst du das?', required: true },
  { id: '3', label: 'Ort', question: 'Wo soll es stattfinden?', required: false },
  { id: '4', label: 'Beschreibung', question: 'Kurze Beschreibung des Projekts', required: true },
  { id: '5', label: 'Name', question: 'Wie heißt du?', required: false },
  { id: '6', label: 'E-Mail', question: 'Unter welcher E-Mail kann Michael dich erreichen?', required: false },
];

function InquiryTab() {
  const [fields, setFields] = useState<InquiryField[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('pix_inquiry_fields').select('*').order('sort_order');
    setFields(data && data.length > 0 ? data : DEFAULT_FIELDS);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    await supabase.from('pix_inquiry_fields').delete().neq('id', '');
    await supabase.from('pix_inquiry_fields').insert(
      fields.map((f, i) => ({ id: f.id, label: f.label, question: f.question, required: f.required, sort_order: i }))
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(id: string, patch: Partial<InquiryField>) {
    setFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function addField() {
    setFields(fs => [...fs, { id: Date.now().toString(), label: '', question: '', required: false }]);
  }

  if (loading) return <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)' }}>Lädt...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Anfrage-Felder</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '4px 0 0' }}>Welche Infos soll die AI abfragen bevor sie eine Anfrage abschickt?</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addField} style={ghostBtn}><Plus size={15} /> Feld</button>
          <button onClick={save} disabled={saving} style={primaryBtn}>
            <Save size={15} /> {saving ? 'Speichert...' : saved ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
        Die AI stellt diese Fragen nacheinander im Chat. "Label" erscheint später in der E-Mail die du bekommst.
      </p>

      {fields.map((field, i) => (
        <div key={field.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Feld {i + 1}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={field.required} onChange={e => update(field.id, { required: e.target.checked })} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Pflichtfeld</span>
              </label>
              <button onClick={() => setFields(fs => fs.filter(f => f.id !== field.id))} style={{ ...iconBtn, width: 28, height: 28, color: '#ff6b6b', background: 'rgba(255,80,80,0.1)' }}><X size={13} /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Label (in der Mail)</div>
              <input value={field.label} onChange={e => update(field.id, { label: e.target.value })} placeholder="z.B. Datum" style={inputStyle} />
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Frage die die AI stellt</div>
              <input value={field.question} onChange={e => update(field.id, { question: e.target.value })} placeholder="z.B. Für welches Datum planst du das?" style={inputStyle} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────
export function AdminPanel() {
  const [session, setSession] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('knowledge');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    supabase.auth.onAuthStateChange((_, s) => setSession(!!s));
  }, []);

  if (session === null) return null;
  if (!session) return <LoginScreen onLogin={() => setSession(true)} />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'knowledge', label: 'Knowledge Base', icon: <Bot size={18} /> },
    { id: 'inquiry', label: 'Anfrage-Felder', icon: <Mail size={18} /> },
    { id: 'media', label: 'Mediathek', icon: <Image size={18} /> },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: '100vh', background: '#050505', color: '#fff', fontFamily: 'inherit' }}>
      <aside style={{ borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', padding: 20, gap: 6 }}>
        <img src="/pix-logo.svg" alt="PIX" style={{ width: 64, marginBottom: 24, filter: 'invert(1)' }} />
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, textAlign: 'left', border: 'none', cursor: 'pointer', width: '100%' }}>
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={() => supabase.auth.signOut()}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 'auto', border: 'none', cursor: 'pointer', width: '100%' }}>
          <LogOut size={16} /> Abmelden
        </button>
      </aside>

      <main style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'knowledge' && <KnowledgeTab />}
        {tab === 'inquiry' && <InquiryTab />}
        {tab === 'media' && <MediaTab />}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  padding: '10px 14px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 999,
  background: '#fff',
  color: '#050505',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  flexShrink: 0,
};

const iconBtn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 38,
  height: 38,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  cursor: 'pointer',
  border: 'none',
  flexShrink: 0,
};

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 13,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
};
