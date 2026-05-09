import { Phone, Mail, CalendarDays, ExternalLink, Globe, Camera, Film } from 'lucide-react';
import { motion } from 'motion/react';

// ─── Contact ────────────────────────────────────────────────
export function ContactTool({ config }: { config: Record<string, string> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="chat-tool chat-tool--contact"
    >
      <p className="chat-tool__label">Melde dich gerne</p>
      <div className="chat-tool__actions">
        <a href={`tel:${config.phone}`} className="chat-tool__btn chat-tool__btn--primary">
          <Phone size={18} strokeWidth={2} />
          {config.cta_phone ?? 'Anrufen'}
        </a>
        <a href={`mailto:${config.email}`} className="chat-tool__btn">
          <Mail size={18} strokeWidth={2} />
          {config.cta_email ?? 'E-Mail'}
        </a>
      </div>
      <p className="chat-tool__meta">{config.phone} · {config.email}</p>
    </motion.div>
  );
}

// ─── Book ────────────────────────────────────────────────────
export function BookTool({ config }: { config: Record<string, string> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="chat-tool chat-tool--book"
    >
      <p className="chat-tool__label">{config.note ?? 'Termin vereinbaren'}</p>
      <a
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-tool__btn chat-tool__btn--primary"
      >
        <CalendarDays size={18} strokeWidth={2} />
        {config.label ?? 'Termin auswählen'}
        <ExternalLink size={14} strokeWidth={2} style={{ opacity: 0.5 }} />
      </a>
    </motion.div>
  );
}

// ─── References ──────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string[]> = {
  web: [
    '/media/web-projects/leasehub/cover.webp',
    '/media/web-projects/crewting/cover.webp',
    '/media/web-projects/jakobs/cover.webp',
    '/media/web-projects/pms/cover.webp',
  ],
  photo: [
    '/media/foto-hd/1_business.webp',
    '/media/foto-hd/12_event.jpg',
    '/media/foto-hd/2_immobilien.webp',
    '/media/foto-hd/30_architektur.jpg',
  ],
  video: [
    '/media/detail/video-brand.webp',
    '/media/detail/video-event.webp',
    '/media/detail/video-drone.webp',
  ],
};

const ALL_IMAGES = [...CATEGORY_IMAGES.web, ...CATEGORY_IMAGES.photo, ...CATEGORY_IMAGES.video];

const CATEGORY_ICONS = {
  web: <Globe size={14} strokeWidth={2} />,
  photo: <Camera size={14} strokeWidth={2} />,
  video: <Film size={14} strokeWidth={2} />,
};

const CATEGORY_LABELS = { web: 'Web', photo: 'Foto', video: 'Video' };

export function ReferencesTool({
  config,
  category,
}: {
  config: Record<string, string>;
  category?: 'web' | 'photo' | 'video';
}) {
  const images = category ? CATEGORY_IMAGES[category] : ALL_IMAGES.slice(0, 6);
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="chat-tool chat-tool--references"
    >
      <div className="chat-tool__ref-header">
        <p className="chat-tool__label">{config.title ?? 'Unsere Arbeiten'}</p>
        {!category && (
          <div className="chat-tool__ref-filters">
            {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => (
              <span key={cat} className="chat-tool__ref-tag">
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="chat-tool__ref-grid">
        {images.map((src) => (
          <button
            key={src}
            type="button"
            className={`chat-tool__ref-item${active === src ? ' is-active' : ''}`}
            onClick={() => setActive(active === src ? null : src)}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
      {active && (
        <motion.div
          className="chat-tool__ref-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setActive(null)}
        >
          <img src={active} alt="" onClick={(e) => e.stopPropagation()} />
        </motion.div>
      )}
    </motion.div>
  );
}

import React from 'react';
