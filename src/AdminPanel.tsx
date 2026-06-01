import { useMemo, useState } from 'react';
import { Save, Check, Search } from 'lucide-react';
import mediaData from './lib/media.json';

type MediaItem = {
  file: string;
  thumb?: string;
  tags: string[];
  title?: string;
  description?: string;
};

// Erlaubte Tags — muss mit der validTags-Liste in api/chat.ts übereinstimmen.
const ALL_TAGS = [
  'web', 'photo', 'video', // Hauptkategorien
  'architektur', 'brand', 'business', 'event', 'landing',
  'menschen', 'realestate', 'startscreen', 'tools',
];

const CATEGORY_TAGS = ['web', 'photo', 'video'];

const IS_LOCAL = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export function AdminPanel() {
  if (!IS_LOCAL) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <div>
          <img src="/pix-logo.svg" alt="PIX" style={{ height: 24, filter: 'invert(1)', marginBottom: 16 }} />
          <p>Die Mediathek-Verwaltung läuft nur lokal.<br />Starte <code style={{ color: '#4f8cff' }}>npm run dev</code> und öffne <code style={{ color: '#4f8cff' }}>localhost:4302/admin</code>.</p>
        </div>
      </div>
    );
  }
  return <AdminEditor />;
}

function AdminEditor() {
  const [items, setItems] = useState<MediaItem[]>(() =>
    (mediaData as MediaItem[]).map((m) => ({ ...m, tags: [...m.tags] }))
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (filterTag && !item.tags.includes(filterTag)) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          item.file.toLowerCase().includes(q) ||
          (item.title ?? '').toLowerCase().includes(q) ||
          (item.description ?? '').toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q))
        );
      });
  }, [items, query, filterTag]);

  function update(index: number, patch: Partial<MediaItem>) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setDirty(true);
    setSaved(false);
  }

  function toggleTag(index: number, tag: string) {
    const item = items[index];
    const has = item.tags.includes(tag);
    update(index, { tags: has ? item.tags.filter((t) => t !== tag) : [...item.tags, tag] });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/__save-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Fehler');
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(
        'Speichern fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)) +
        '\n\nLäuft der lokale Dev-Server? (npm run dev) — Speichern geht nur lokal.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/pix-logo.svg" alt="PIX" style={{ height: 22, filter: 'invert(1)' }} />
          <span style={st.headerTitle}>Mediathek</span>
          <span style={st.count}>{items.length} Medien</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={st.searchWrap}>
            <Search size={15} color="#888" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              style={st.search}
            />
          </div>
          <button onClick={save} disabled={!dirty || saving} style={{ ...st.saveBtn, opacity: dirty && !saving ? 1 : 0.5 }}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Speichern…' : saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>
      </header>

      <div style={st.filterBar}>
        <button onClick={() => setFilterTag(null)} style={chipStyle(filterTag === null, false)}>Alle</button>
        {ALL_TAGS.map((tag) => (
          <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} style={chipStyle(filterTag === tag, CATEGORY_TAGS.includes(tag))}>
            {tag}
          </button>
        ))}
      </div>

      <div style={st.grid}>
        {filtered.map(({ item, index }) => (
          <div key={item.file} style={st.card}>
            <div style={st.thumbWrap}>
              <img src={item.thumb || item.file} alt={item.title || ''} style={st.thumb} loading="lazy" />
            </div>
            <div style={st.cardBody}>
              <code style={st.file}>{item.file.replace('/media/', '')}</code>
              <input
                value={item.title ?? ''}
                onChange={(e) => update(index, { title: e.target.value })}
                placeholder="Titel"
                style={st.titleInput}
              />
              <textarea
                value={item.description ?? ''}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="Beschreibung"
                rows={2}
                style={st.descInput}
              />
              <div style={st.tagRow}>
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(index, tag)}
                    style={chipStyle(item.tags.includes(tag), CATEGORY_TAGS.includes(tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function chipStyle(active: boolean, category: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid ' + (active ? (category ? '#4f8cff' : '#3a3a3a') : '#262626'),
    background: active ? (category ? '#1a3a6b' : '#2a2a2a') : 'transparent',
    color: active ? '#fff' : '#777',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.12s',
  };
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#eee', fontFamily: 'system-ui, sans-serif', paddingBottom: 80 },
  header: {
    position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1c1c1c',
  },
  headerTitle: { fontSize: 16, fontWeight: 600 },
  count: { fontSize: 13, color: '#666' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 6, background: '#161616', border: '1px solid #262626', borderRadius: 8, padding: '6px 10px' },
  search: { background: 'transparent', border: 'none', outline: 'none', color: '#eee', fontSize: 14, width: 160 },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#1a6cf5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  filterBar: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 24px', borderBottom: '1px solid #161616' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, padding: 24 },
  card: { display: 'flex', flexDirection: 'column', background: '#131313', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' },
  thumbWrap: { width: '100%', height: 180, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  file: { fontSize: 11, color: '#666', wordBreak: 'break-all' },
  titleInput: { background: '#1a1a1a', border: '1px solid #262626', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 14, outline: 'none' },
  descInput: { background: '#1a1a1a', border: '1px solid #262626', borderRadius: 6, padding: '7px 10px', color: '#ccc', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 },
};
