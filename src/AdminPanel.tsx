import { useEffect, useRef, useState } from 'react';
import { supabase, PixMedia, PixFlowNode, PixAiConfig } from './lib/supabase';
import { Upload, Trash2, Tag, Save, LogOut, Image, MessageSquare, Bot, X, Plus, Loader } from 'lucide-react';

type Tab = 'media' | 'flow' | 'ai';

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
        <input
          type="email" placeholder="E-Mail" value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password" placeholder="Passwort" value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
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
      await supabase.from('pix_media').insert({
        storage_path: path,
        url: urlData.publicUrl,
        filename: file.name,
        size_bytes: file.size,
      });
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
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', height: '100%', gap: 0 }}>
      {/* Grid */}
      <div style={{ padding: 24, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={primaryBtn}>
            {uploading ? <Loader size={16} /> : <Upload size={16} />}
            {uploading ? 'Uploading...' : 'Bilder hochladen'}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
            onChange={e => handleUpload(e.target.files)} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{media.length} Bilder</span>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: 60 }}>Lädt...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {media.map(item => (
              <div key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                  border: selected?.id === item.id ? '2px solid #fff' : '2px solid transparent',
                  background: '#111', position: 'relative',
                }}>
                <img src={item.url} alt={item.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {item.tags.length > 0 && (
                  <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.tags.slice(0, 2).map(t => (
                      <span key={t} style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspector */}
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Theme</span>
            <input value={selected.theme} onChange={e => setSelected({ ...selected, theme: e.target.value })} placeholder="z.B. web, photo, video" style={inputStyle} />
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
// Flow Editor
// ─────────────────────────────────────────────
function FlowTab() {
  const [nodes, setNodes] = useState<PixFlowNode[]>([]);
  const [selected, setSelected] = useState<PixFlowNode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchNodes(); }, []);

  async function fetchNodes() {
    const { data } = await supabase.from('pix_flow_nodes').select('*').order('sort_order');
    setNodes(data ?? []);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    await supabase.from('pix_flow_nodes').update({ text: selected.text, chips: selected.chips, updated_at: new Date().toISOString() }).eq('id', selected.id);
    await fetchNodes();
    setSaving(false);
  }

  function updateChip(i: number, field: string, value: string) {
    if (!selected) return;
    const chips = [...selected.chips];
    chips[i] = { ...chips[i], [field]: value };
    setSelected({ ...selected, chips });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100%' }}>
      {/* Node list */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {nodes.map(node => (
          <button key={node.id} onClick={() => setSelected({ ...node })}
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, background: selected?.id === node.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: '#fff', fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{node.id}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{node.text.slice(0, 50)}</div>
          </button>
        ))}
      </div>

      {/* Editor */}
      {selected ? (
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>{selected.id}</h2>
            <button onClick={save} disabled={saving} style={primaryBtn}>
              <Save size={15} /> {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Text</span>
            <textarea value={selected.text} onChange={e => setSelected({ ...selected, text: e.target.value })}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={labelStyle}>Chips / Antworten</span>
            {selected.chips.map((chip, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input value={chip.label} onChange={e => updateChip(i, 'label', e.target.value)} placeholder="Label" style={inputStyle} />
                <input value={chip.targetId} onChange={e => updateChip(i, 'targetId', e.target.value)} placeholder="targetId" style={inputStyle} />
                <button onClick={() => setSelected({ ...selected, chips: selected.chips.filter((_, j) => j !== i) })} style={{ ...iconBtn, color: '#ff6b6b' }}><Trash2 size={15} /></button>
              </div>
            ))}
            <button onClick={() => setSelected({ ...selected, chips: [...selected.chips, { label: '', targetId: '', icon: '' }] })} style={ghostBtn}>
              <Plus size={15} /> Chip hinzufügen
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Node auswählen
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// AI Config
// ─────────────────────────────────────────────
function AiTab() {
  const [config, setConfig] = useState<PixAiConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('pix_ai_config').select('*').eq('id', 'default').single().then(({ data }) => setConfig(data));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    await supabase.from('pix_ai_config').upsert(config);
    setSaving(false);
  }

  if (!config) return <div style={{ padding: 24, color: 'rgba(255,255,255,0.4)' }}>Lädt...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>AI Konfiguration</h2>
        <button onClick={save} disabled={saving} style={primaryBtn}>
          <Save size={15} /> {saving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={labelStyle}>Basis-Prompt</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Wer ist der Assistent, wie verhält er sich?</span>
        <textarea value={config.base_prompt} onChange={e => setConfig({ ...config, base_prompt: e.target.value })}
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={labelStyle}>Über PIX</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Informationen über die Agentur — der AI als Kontext gegeben</span>
        <textarea value={config.about_pix} onChange={e => setConfig({ ...config, about_pix: e.target.value })}
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={labelStyle}>Ton / Persona</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Wie soll der Assistent klingen?</span>
        <textarea value={config.persona_tone} onChange={e => setConfig({ ...config, persona_tone: e.target.value })}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
      </label>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────
export function AdminPanel() {
  const [session, setSession] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('media');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    supabase.auth.onAuthStateChange((_, s) => setSession(!!s));
  }, []);

  if (session === null) return null;
  if (!session) return <LoginScreen onLogin={() => setSession(true)} />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'media', label: 'Mediathek', icon: <Image size={18} /> },
    { id: 'flow', label: 'Chat Flow', icon: <MessageSquare size={18} /> },
    { id: 'ai', label: 'AI Config', icon: <Bot size={18} /> },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: '100vh', background: '#050505', color: '#fff', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside style={{ borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', padding: 20, gap: 6 }}>
        <img src="/pix-logo.svg" alt="PIX" style={{ width: 64, marginBottom: 24, filter: 'invert(1)' }} />
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: tab === t.id ? 600 : 400, textAlign: 'left' }}>
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={() => supabase.auth.signOut()}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 'auto' }}>
          <LogOut size={16} /> Abmelden
        </button>
      </aside>

      {/* Content */}
      <main style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'media' && <MediaTab />}
        {tab === 'flow' && <FlowTab />}
        {tab === 'ai' && <AiTab />}
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
