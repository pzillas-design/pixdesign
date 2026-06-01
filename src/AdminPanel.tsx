import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import mediaData from './lib/media.json';

type MediaItem = {
  file: string;
  thumb?: string;
  tags: string[];
  title?: string;
  description?: string;
};

// Erlaubte Tags — muss mit der validTags-Liste in api/chat.ts übereinstimmen.
const CATEGORY_TAGS = ['web', 'photo', 'video'];
const CONTENT_TAGS = [
  'architektur', 'brand', 'business', 'event', 'landing',
  'menschen', 'realestate', 'startscreen', 'tools',
];
const ALL_TAGS = [...CATEGORY_TAGS, ...CONTENT_TAGS];

const ACCENT = '#0a84ff'; // Apple system blue (dark)

const IS_LOCAL = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export function AdminPanel() {
  if (!IS_LOCAL) {
    return (
      <div style={st.gate}>
        <div>
          <img src="/pix-logo.svg" alt="PIX" style={{ height: 24, filter: 'invert(1)', marginBottom: 16 }} />
          <p>Die Mediathek-Verwaltung läuft nur lokal.<br />Starte <code style={{ color: ACCENT }}>npm run dev</code> und öffne <code style={{ color: ACCENT }}>localhost:4302/admin</code>.</p>
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
  const [selected, setSelected] = useState<number | null>(null);
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

  const sel = selected !== null ? items[selected] : null;

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
      alert('Speichern fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)) +
        '\n\nLäuft der lokale Dev-Server? (npm run dev)');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={st.page}>
      {/* Top bar */}
      <header style={st.header}>
        <div style={st.headerLeft}>
          <img src="/pix-logo.svg" alt="PIX" style={{ height: 18, filter: 'invert(1)' }} />
          <span style={st.title}>Mediathek</span>
          <span style={st.count}>{filtered.length === items.length ? `${items.length}` : `${filtered.length} / ${items.length}`}</span>
        </div>
        <div style={st.searchWrap}>
          <Search size={14} color="#86868b" strokeWidth={2.2} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen" style={st.search} />
        </div>
        <button onClick={save} disabled={!dirty || saving} style={{ ...st.saveBtn, opacity: dirty && !saving ? 1 : 0.45 }}>
          {saved ? <Check size={15} strokeWidth={2.5} /> : null}
          {saving ? 'Sichern…' : saved ? 'Gesichert' : 'Sichern'}
        </button>
      </header>

      {/* Filter pills */}
      <div style={st.filterBar}>
        <button onClick={() => setFilterTag(null)} style={pill(filterTag === null, false, 'filter')}>Alle</button>
        {ALL_TAGS.map((tag) => (
          <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} style={pill(filterTag === tag, CATEGORY_TAGS.includes(tag), 'filter')}>
            {tag}
          </button>
        ))}
      </div>

      {/* Body: grid + inspector */}
      <div style={st.body}>
        <div style={st.gridScroll}>
          <div style={st.grid}>
            {filtered.map(({ item, index }) => {
              const isSel = selected === index;
              const cat = item.tags.find((t) => CATEGORY_TAGS.includes(t));
              return (
                <button key={item.file} onClick={() => setSelected(index)} style={{ ...st.tile, outline: isSel ? `2.5px solid ${ACCENT}` : '2.5px solid transparent' }}>
                  <img src={item.thumb || item.file} alt="" loading="lazy" style={st.tileImg} />
                  <div style={st.tileBar}>
                    <span style={st.tileTitle}>{item.title || item.file.replace('/media/', '')}</span>
                    {cat && <span style={{ ...st.dot, background: catColor(cat) }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inspector */}
        <aside style={st.inspector}>
          {sel === null ? (
            <div style={st.inspectorEmpty}>Wähle ein Medium</div>
          ) : (
            <div style={st.inspectorInner}>
              <div style={st.previewWrap}>
                <img src={sel.file} alt="" style={st.preview} />
              </div>
              <code style={st.path}>{sel.file.replace('/media/', '')}</code>

              <label style={st.label}>Titel</label>
              <input value={sel.title ?? ''} onChange={(e) => update(selected!, { title: e.target.value })} placeholder="Titel" style={st.input} />

              <label style={st.label}>Beschreibung</label>
              <textarea value={sel.description ?? ''} onChange={(e) => update(selected!, { description: e.target.value })} placeholder="Beschreibung" rows={3} style={st.textarea} />

              <label style={st.label}>Kategorie</label>
              <div style={st.tagRow}>
                {CATEGORY_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(selected!, tag)} style={pill(sel.tags.includes(tag), true, 'edit')}>{tag}</button>
                ))}
              </div>

              <label style={st.label}>Inhalt</label>
              <div style={st.tagRow}>
                {CONTENT_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(selected!, tag)} style={pill(sel.tags.includes(tag), false, 'edit')}>{tag}</button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function catColor(tag: string): string {
  return tag === 'web' ? ACCENT : tag === 'photo' ? '#30d158' : '#ff9f0a';
}

function pill(active: boolean, category: boolean, ctx: 'filter' | 'edit'): React.CSSProperties {
  const accent = category ? ACCENT : '#48484a';
  return {
    fontSize: ctx === 'filter' ? 12.5 : 12,
    lineHeight: 1,
    padding: ctx === 'filter' ? '6px 11px' : '6px 10px',
    borderRadius: 999,
    border: '1px solid ' + (active ? accent : 'rgba(255,255,255,0.10)'),
    background: active ? (category ? 'rgba(10,132,255,0.22)' : 'rgba(255,255,255,0.10)') : 'transparent',
    color: active ? '#fff' : '#86868b',
    cursor: 'pointer',
    fontWeight: active ? 590 : 420,
    letterSpacing: '-0.01em',
    transition: 'all 0.13s ease',
    fontFamily: 'inherit',
  };
}

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

const st: Record<string, React.CSSProperties> = {
  gate: { minHeight: '100vh', background: '#000', color: '#86868b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, textAlign: 'center', padding: 24, lineHeight: 1.6 },
  page: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#f5f5f7', fontFamily: FONT, overflow: 'hidden' },

  header: { display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', height: 52, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(20,20,22,0.72)', backdropFilter: 'saturate(180%) blur(20px)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' },
  count: { fontSize: 12.5, color: '#86868b', fontVariantNumeric: 'tabular-nums' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 11px', flex: 1, maxWidth: 280, marginLeft: 'auto' },
  search: { background: 'transparent', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: 13.5, width: '100%', fontFamily: FONT },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: FONT },

  filterBar: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 18px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' },

  body: { display: 'flex', flex: 1, minHeight: 0 },
  gridScroll: { flex: 1, overflowY: 'auto', padding: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 10 },
  tile: { position: 'relative', padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#141416', aspectRatio: '1 / 1', display: 'block', outlineOffset: '-2.5px' },
  tileImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  tileBar: { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '14px 8px 6px', background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent)' },
  tileTitle: { fontSize: 10.5, color: '#fff', fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' },
  dot: { width: 7, height: 7, borderRadius: 999, flexShrink: 0, boxShadow: '0 0 0 1.5px rgba(0,0,0,0.4)' },

  inspector: { width: 320, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#0d0d0f', overflowY: 'auto' },
  inspectorEmpty: { padding: 40, textAlign: 'center', color: '#5a5a5e', fontSize: 13.5, marginTop: 40 },
  inspectorInner: { padding: 18, display: 'flex', flexDirection: 'column', gap: 0 },
  previewWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 12, aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', height: '100%', objectFit: 'contain' },
  path: { fontSize: 11, color: '#5a5a5e', wordBreak: 'break-all', marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 7px' },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 11px', color: '#f5f5f7', fontSize: 13.5, outline: 'none', fontFamily: FONT },
  textarea: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 11px', color: '#e5e5e7', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: FONT, lineHeight: 1.45 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
};
