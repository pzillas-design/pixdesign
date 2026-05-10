import {
  X,
  Phone,
  Mail,
  Globe,
  Camera,
  Film,
  Briefcase,
  Wrench,
  Zap,
  Users,
  Calendar,
  Home,
  Play,
  Clapperboard,
  RotateCcw,
  ArrowUp,
  AudioLines,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MouseEvent, useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEditor } from './CanvasEditor';
import { AdminPanel } from './AdminPanel';
import { sendMessage, resetSession, sendInquiry, type GalleryCategory } from './lib/gemini';
import { useLiveVoice } from './lib/useLiveVoice';
import { supabase } from './lib/supabase';

const bubbleAnim = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

const rowExit = { opacity: 0, y: -10, transition: { duration: 0.18, ease: 'easeIn' } };

function Typewriter({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    const tick = () => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current < text.length) {
        setTimeout(tick, speed);
      }
    };
    setTimeout(tick, speed);
  }, [text, speed]);

  return <>{displayed}</>;
}

type NodeId =
  | 'start'
  | 'web'
  | 'photo'
  | 'video'
  | 'web-business'
  | 'web-tools'
  | 'web-landing'
  | 'photo-business'
  | 'photo-events'
  | 'photo-realestate'
  | 'video-brand'
  | 'video-event'
  | 'video-realestate'
  | 'contact-call'
  | 'contact-mail'
  | 'contact-more';

type IconName =
  | 'globe'
  | 'camera'
  | 'film'
  | 'briefcase'
  | 'wrench'
  | 'zap'
  | 'calendar'
  | 'home'
  | 'play'
  | 'clapperboard'
  | 'rotateccw'
  | 'phone'
  | 'mail'
  | 'circlehelp';

type ImageMeta = { tag?: string; title?: string; description?: string };

type ChatNode = {
  id: NodeId;
  text: string;
  chips?: Array<{ label: string; displayLabel?: string; targetId: NodeId; icon?: IconName }>;
  action?: { label: string; href: string; icon?: IconName };
  images: string[];
  imageMeta?: ImageMeta[];
  imageMode?: 'logo' | 'gallery';
};

type Message =
  | { id: string; type: 'system'; nodeId: NodeId }
  | { id: string; type: 'user'; text: string }
  | { id: string; type: 'ai'; text: string }
  | { id: string; type: 'sent' }
  | { id: string; type: 'typing' };

const flow: Record<NodeId, ChatNode> = {
  start: {
    id: 'start',
    text: 'Willkommen bei PIX ✌️\nIch baue tolle Webseiten und mache Fotos und Videos in Frankfurt und Umgebung. Womit kann ich helfen?',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Foto', targetId: 'photo', icon: 'camera' },
      { label: 'Video', targetId: 'video', icon: 'film' },
      { label: '', displayLabel: 'Anrufen', targetId: 'contact-call', icon: 'phone' },
      { label: '', displayLabel: 'E-Mail', targetId: 'contact-mail', icon: 'mail' },
      { label: '', displayLabel: 'Mehr erfahren', targetId: 'contact-more', icon: 'circlehelp' },
    ],
    images: ['/media/detail/slider-start.png'],
    imageMode: 'gallery',
  },
  web: {
    id: 'web',
    text: 'Klar. Geht es eher um einen Auftritt, ein digitales Tool oder eine sehr fokussierte Landing Page?',
    chips: [
      { label: 'Business', targetId: 'web-business', icon: 'briefcase' },
      { label: 'Tools', targetId: 'web-tools', icon: 'wrench' },
      { label: 'Landing Pages', targetId: 'web-landing', icon: 'zap' },
    ],
    images: [
      '/media/web-projects/leasehub/cover.webp',
      '/media/web-projects/crewting/cover.webp',
      '/media/web-projects/jakobs/cover.webp',
    ],
    imageMeta: [
      { tag: 'LeaseHub', title: 'LeaseHub', description: 'SaaS-Plattform für Fahrzeug-Leasingverwaltung' },
      { tag: 'Crewting', title: 'Crewting', description: 'Matching-App für Kreativteams und Freelancer' },
      { tag: 'Jakobs', title: 'Jakobs Consulting', description: 'Unternehmensauftritt für eine Unternehmensberatung' },
    ],
  },
  photo: {
    id: 'photo',
    text: 'Professionelle Fotografie fuer jeden Anlass. Was moechtest du sehen?',
    chips: [
      { label: 'Business', targetId: 'photo-business', icon: 'briefcase' },
      { label: 'Events', targetId: 'photo-events', icon: 'calendar' },
      { label: 'Immobilien', targetId: 'photo-realestate', icon: 'home' },
    ],
    images: [
      '/media/foto-hd/12_event.jpg',
      '/media/foto-hd/1_business.webp',
      '/media/foto-hd/2_immobilien.webp',
      '/media/foto-hd/30_architektur.jpg',
    ],
    imageMeta: [
      { tag: '600 Kids', title: '600 Kids Festival', description: 'Eventfotografie für ein Jugendfestival in Frankfurt' },
      { tag: 'Business', title: 'Business-Portrait', description: 'Portrait-Session für Führungskräfte und Teams' },
      { tag: 'Exposé', title: 'Immobilien Exposé', description: 'Exposé-Fotografie für eine Wohnimmobilie in Frankfurt' },
      { tag: 'Architektur', title: 'Architekturfotografie', description: 'Architekturfotografie im Rhein-Main-Gebiet' },
    ],
  },
  video: {
    id: 'video',
    text: 'Bewegtbild, das nicht nur dekoriert. Welche Richtung passt zu deinem Projekt?',
    chips: [
      { label: 'Imagefilme', targetId: 'video-brand', icon: 'play' },
      { label: 'Events', targetId: 'video-event', icon: 'clapperboard' },
      { label: 'Immobilien', targetId: 'video-realestate', icon: 'home' },
    ],
    images: ['/media/detail/video-brand.webp', '/media/detail/video-event.webp', '/media/detail/video-drone.webp'],
    imageMeta: [
      { tag: 'Imagefilm', title: 'Imagefilm' },
      { tag: 'Event', title: 'Eventfilm' },
      { tag: 'Drohne', title: 'Drohnenaufnahmen' },
    ],
  },
  'web-business': {
    id: 'web-business',
    text: 'Dann wuerde ich zuerst klaeren, was Menschen in den ersten zehn Sekunden verstehen muessen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/pms/cover.webp', '/media/web-projects/leasehub/02-dahsboard.webp'],
    imageMeta: [
      { tag: 'PMS', title: 'PMS Verwaltung', description: 'Verwaltungsplattform für Property Management' },
      { tag: 'LeaseHub', title: 'LeaseHub Dashboard', description: 'Dashboard-Ansicht der LeaseHub-Plattform' },
    ],
  },
  'web-tools': {
    id: 'web-tools',
    text: 'Wenn heute noch viel in Tabellen, Mails oder Bauchgefuehl steckt, kann ein kleines Tool sehr viel Ruhe reinbringen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/leasehub/02-dahsboard.webp', '/media/web-projects/tososto/05-karte.webp'],
    imageMeta: [
      { tag: 'LeaseHub', title: 'LeaseHub', description: 'SaaS-Tool für Leasingverwaltung' },
      { tag: 'Tososto', title: 'Tososto', description: 'Kartenbasiertes Tool zur Standortsuche' },
    ],
  },
  'web-landing': {
    id: 'web-landing',
    text: 'Landing Pages sollten nicht viel erklaeren, sondern schnell die richtige Entscheidung leichter machen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/600kids/cover.webp', '/media/web-projects/crewting/cover.webp'],
    imageMeta: [
      { tag: '600 Kids', title: '600 Kids Festival', description: 'Event-Landing-Page für ein Jugendfestival' },
      { tag: 'Crewting', title: 'Crewting', description: 'Landing Page für eine Kreativ-Matching-App' },
    ],
  },
  'photo-business': {
    id: 'photo-business',
    text: 'Bei Business-Fotos geht es meistens um Vertrauen. Nicht zu steif, nicht zu inszeniert.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/1_business.webp', '/media/foto-hd/17_business.webp', '/media/foto-hd/28_business.jpg'],
    imageMeta: [
      { tag: 'Business', title: 'Business-Portrait' },
      { tag: 'Team', title: 'Team-Fotografie' },
      { tag: 'Portrait', title: 'Portrait-Shooting' },
    ],
  },
  'photo-events': {
    id: 'photo-events',
    text: 'Events brauchen Bilder, die sich spaeter noch nach dem Abend anfuehlen.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/12_event.jpg', '/media/foto-hd/15_event.webp', '/media/foto-hd/29_event.jpg'],
    imageMeta: [
      { tag: '600 Kids', title: '600 Kids Festival', description: 'Eventfotografie für ein Jugendfestival in Frankfurt' },
      { tag: 'Konferenz', title: 'Konferenzfotografie' },
      { tag: 'Event', title: 'Eventfotografie' },
    ],
  },
  'photo-realestate': {
    id: 'photo-realestate',
    text: 'Bei Immobilien wuerde ich ruhig bleiben. Klare Perspektiven, gutes Licht, kein Show-Effekt.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg', '/media/foto-hd/30_architektur.jpg'],
    imageMeta: [
      { tag: 'Exposé', title: 'Immobilien Exposé', description: 'Exposé-Fotografie für eine Wohnimmobilie' },
      { tag: 'Wohnung', title: 'Wohnungsfotografie' },
      { tag: 'Architektur', title: 'Architekturfotografie' },
    ],
  },
  'video-brand': {
    id: 'video-brand',
    text: 'Ein Imagefilm sollte ein Gefuehl setzen und schnell zeigen, warum es euch gibt.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-brand.webp', '/media/detail/video-story.webp', '/media/detail/video-motion.webp'],
    imageMeta: [
      { tag: 'Imagefilm', title: 'Imagefilm' },
      { tag: 'Story', title: 'Storytelling' },
      { tag: 'Motion', title: 'Motion Design' },
    ],
  },
  'video-event': {
    id: 'video-event',
    text: 'Ein Eventfilm braucht Tempo, Stimmen und die kleinen Momente zwischen den Programmpunkten.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-event.webp', '/media/detail/video-konferenz.webp', '/media/foto-hd/12_event.jpg'],
    imageMeta: [
      { tag: 'Event', title: 'Eventfilm' },
      { tag: 'Konferenz', title: 'Konferenzfilm' },
      { tag: '600 Kids', title: '600 Kids Festival' },
    ],
  },
  'video-realestate': {
    id: 'video-realestate',
    text: 'Immobilienfilm darf ruhig sein. Ein guter Rundgang zeigt Orientierung und laesst Raeume wirken.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-drone.webp', '/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg'],
    imageMeta: [
      { tag: 'Drohne', title: 'Drohnenfilm', description: 'Luftaufnahmen für Immobilienpräsentationen' },
      { tag: 'Exposé', title: 'Immobilienfilm' },
      { tag: 'Rundgang', title: 'Virtueller Rundgang' },
    ],
  },
  'contact-call': {
    id: 'contact-call',
    text: 'Einfachste Option: anrufen.',
    action: { label: '0159 06401995', href: 'tel:+4915906401995', icon: 'phone' },
    chips: [],
    images: ['/media/detail/portrait.webp'],
  },
  'contact-mail': {
    id: 'contact-mail',
    text: 'Erzähl mir was du brauchst und ich meld mich in Kürze bei dir.',
    action: { label: 'pzillas2@gmail.com', href: 'mailto:pzillas2@gmail.com', icon: 'mail' },
    chips: [],
    images: ['/media/detail/portrait.webp'],
  },
  'contact-more': {
    id: 'contact-more',
    text: 'PIX macht Webdesign, Fotografie und Video in Frankfurt. Einfach ein Thema tippen oder einen der Chips wählen.',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Foto', targetId: 'photo', icon: 'camera' },
      { label: 'Video', targetId: 'video', icon: 'film' },
    ],
    images: ['/media/detail/slider-start.png'],
  },
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function getIconComponent(iconName?: IconName) {
  const iconProps = { size: 23, strokeWidth: 1.8 };

  switch (iconName) {
    case 'globe':
      return <Globe {...iconProps} />;
    case 'camera':
      return <Camera {...iconProps} />;
    case 'film':
      return <Film {...iconProps} />;
    case 'briefcase':
      return <Briefcase {...iconProps} />;
    case 'wrench':
      return <Wrench {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'calendar':
      return <Calendar {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'play':
      return <Play {...iconProps} />;
    case 'clapperboard':
      return <Clapperboard {...iconProps} />;
    case 'rotateccw':
      return <RotateCcw {...iconProps} />;
    case 'phone':
      return <Phone {...iconProps} />;
    case 'mail':
      return <Mail {...iconProps} />;
    case 'circlehelp':
      return (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.005 6.66994C7.40827 5.44557 8.20424 4.41315 9.25192 3.75552C10.2996 3.09789 11.5314 2.8575 12.7291 3.07692C13.9269 3.29634 15.0133 3.96142 15.7959 4.95435C16.5785 5.94728 17.0068 7.20399 17.005 8.5019C17.005 12.1658 11.8592 13.9978 11.8592 13.9978" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20H12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
}

function ImageStrip({ node }: { node: ChatNode }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateRotations = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const halfW = strip.clientWidth / 2;
    const scrollCenter = strip.scrollLeft + halfW;
    wrapperRefs.current.forEach((wrapper) => {
      if (!wrapper) return;
      const itemCenter = wrapper.offsetLeft + wrapper.offsetWidth / 2;
      const offset = itemCenter - scrollCenter;
      const ratio = Math.max(-1, Math.min(1, offset / (halfW * 1.05)));
      const rotateY = ratio * -46;
      const scale = 1 - Math.abs(ratio) * 0.08;
      const opacity = Math.max(0.22, 1 - Math.abs(ratio) * 0.42);
      wrapper.style.transform = `rotateY(${rotateY}deg) scale(${scale})`;
      wrapper.style.opacity = String(opacity);
    });
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    updateRotations();
    strip.addEventListener('scroll', updateRotations, { passive: true });
    window.addEventListener('resize', updateRotations, { passive: true });
    // Also update after images load
    const timer = setTimeout(updateRotations, 120);
    return () => {
      strip.removeEventListener('scroll', updateRotations);
      window.removeEventListener('resize', updateRotations);
      clearTimeout(timer);
    };
  }, [node.images, updateRotations]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? (i - 1 + node.images.length) % node.images.length : null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? (i + 1) % node.images.length : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, node.images.length]);

  if (!node.images?.length) return null;

  const images = node.images;
  const meta = node.imageMeta ?? [];
  const currentMeta = lightboxIndex !== null ? (meta[lightboxIndex] ?? null) : null;

  return (
    <>
      <div ref={stripRef} className="image-strip" aria-label={`${node.id} Bilder`}>
        <motion.div
          key={node.id}
          className="image-strip__track"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {images.map((image, index) => (
            <div
              ref={el => { wrapperRefs.current[index] = el; }}
              className="image-strip__item-3d"
              key={`${node.id}-${image}`}
            >
              <motion.figure
                className="image-strip__item"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={image}
                  alt={meta[index]?.title ?? ''}
                  onLoad={updateRotations}
                />
                {meta[index]?.tag && (
                  <span className="image-strip__tag">{meta[index].tag}</span>
                )}
              </motion.figure>
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="image-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              className="image-lightbox__inner"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="image-lightbox__close"
                aria-label="Schliessen"
                onClick={() => setLightboxIndex(null)}
              >
                <X size={18} strokeWidth={2.4} />
              </button>

              {currentMeta?.title && (
                <p className="image-lightbox__title">{currentMeta.title}</p>
              )}

              <div className="image-lightbox__stage">
                {images.length > 1 && (
                  <button
                    type="button"
                    className="image-lightbox__nav"
                    aria-label="Vorheriges Bild"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : 0); }}
                  >
                    <ChevronLeft size={22} strokeWidth={2} />
                  </button>
                )}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={lightboxIndex}
                    src={images[lightboxIndex]}
                    alt={currentMeta?.title ?? ''}
                    className="image-lightbox__main-img"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.16 }}
                  />
                </AnimatePresence>
                {images.length > 1 && (
                  <button
                    type="button"
                    className="image-lightbox__nav"
                    aria-label="Naechstes Bild"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % images.length : 0); }}
                  >
                    <ChevronRight size={22} strokeWidth={2} />
                  </button>
                )}
              </div>

              {images.length > 1 && (
                <div className="image-lightbox__thumbs">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`image-lightbox__thumb${i === lightboxIndex ? ' is-active' : ''}`}
                      onClick={() => setLightboxIndex(i)}
                    >
                      <img src={img} alt={meta[i]?.title ?? ''} />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function getTimeTheme() {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
}

export function App() {
  const [timeTheme, setTimeTheme] = useState<'light' | 'dark'>(getTimeTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = timeTheme;
  }, [timeTheme]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTheme(getTimeTheme());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  if (window.location.pathname === '/canvas') {
    return <CanvasEditor />;
  }

  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  const [messages, setMessages] = useState<Message[]>([{ id: 'system-start', type: 'system', nodeId: 'start' }]);
  const [sliderNodeId, setSliderNodeId] = useState<NodeId>('start');
  const [aiGalleryImages, setAiGalleryImages] = useState<string[] | null>(null);
  const [composerText, setComposerText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastAiTextRef = useRef<string>('');
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const { state: voiceMode, start: startLiveVoice, stop: stopLiveVoice } = useLiveVoice(
    useCallback(() => {
      setMessages(current => [
        ...current,
        { id: createId('sent'), type: 'sent' as const },
        { id: createId('ai'), type: 'ai' as const, text: 'Michael meldet sich in Kürze bei dir.' },
      ]);
    }, [])
  );

  const activeNode = flow[sliderNodeId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Build a context string from static messages for the AI
  function buildStaticContext(msgs: Message[]): string {
    const lines: string[] = [];
    for (const msg of msgs) {
      if (msg.type === 'system') {
        const node = flow[msg.nodeId];
        if (node) lines.push(`PIX: ${node.text}`);
      } else if (msg.type === 'user') {
        lines.push(`Besucher: ${msg.text}`);
      }
    }
    return lines.join('\n');
  }

  function handleChipClick(label: string, targetId: NodeId, fromIndex: number, displayLabel?: string) {
    const bubbleText = displayLabel || label;
    const userMessage: Message = { id: createId('user'), type: 'user', text: bubbleText };
    const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };
    // Step 1: fade out everything after fromIndex
    setMessages((current) => current.slice(0, fromIndex + 1));
    resetSession();
    // Step 2: after exit animation, add new branch
    setTimeout(() => {
      setMessages((current) => [...current, userMessage, systemMessage]);
      setSliderNodeId(targetId);
    }, 320);
  }

  function dropHeaderMessage(label: string, targetId: NodeId) {
    const userMessage: Message = { id: createId('user'), type: 'user', text: label };
    const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };

    setMessages((current) => [...current, userMessage, systemMessage]);
    setSliderNodeId(targetId);
  }

  async function handleComposerSubmit() {
    const text = composerText.trim();
    if (!text || aiLoading) return;
    const userMessage: Message = { id: createId('user'), type: 'user', text };
    const typingId = createId('typing');
    const typingMessage: Message = { id: typingId, type: 'typing' };
    setMessages((current) => [...current, userMessage, typingMessage]);
    setComposerText('');
    setAiLoading(true);

    // On first AI message, prepend static chat context
    const hasAiHistory = messages.some(m => m.type === 'ai');
    let messageToSend = text;
    if (!hasAiHistory) {
      const context = buildStaticContext(messages);
      if (context) {
        messageToSend = `[Bisheriger Gesprächsverlauf:\n${context}\n]\n\nNachricht des Besuchers: ${text}`;
      }
    }

    const aiResponse = await sendMessage(messageToSend);
    lastAiTextRef.current = aiResponse.text;

    if (aiResponse.gallery) {
      const { data } = await supabase
        .from('pix_media')
        .select('url')
        .eq('category', aiResponse.gallery);
      const urls = (data ?? []).map((r: any) => r.url);
      setAiGalleryImages(urls);
      const aiMessage: Message = { id: createId('ai'), type: 'ai', text: aiResponse.text || '' };
      setMessages((current) => current.map((m) => m.id === typingId ? aiMessage : m));
    } else if (aiResponse.sendEmail) {
      const ok = await sendInquiry(aiResponse.sendEmail);
      const confirmText = ok
        ? 'Michael meldet sich in Kürze bei dir.'
        : 'Beim Senden gab es leider einen Fehler. Schreib direkt an pzillas2@gmail.com.';
      const msgs: Message[] = [];
      if (aiResponse.text) msgs.push({ id: createId('ai'), type: 'ai', text: aiResponse.text });
      if (ok) msgs.push({ id: createId('sent'), type: 'sent' });
      msgs.push({ id: createId('ai'), type: 'ai', text: confirmText });
      setMessages((current) => current.map((m) => m.id === typingId ? msgs[0] : m).concat(msgs.slice(1)));
    } else {
      const aiMessage: Message = { id: createId('ai'), type: 'ai', text: aiResponse.text };
      setMessages((current) => current.map((m) => (m.id === typingId ? aiMessage : m)));
    }
    setAiLoading(false);
  }

  function handleVoiceDialog() {
    if (voiceMode !== 'idle') { stopLiveVoice(); return; }
    startLiveVoice();
  }

  return (
    <main className={`portfolio-chat theme-${timeTheme}`}>
      {/* Sticky header */}
      <header className="chat-header">
        <img src="/pix-logo.svg" alt="PIX" className="chat-header__logo" />
      </header>

      <section ref={scrollRef} className="chat-scroll" aria-label="PIX Portfolio Chat">
        <div className="chat-stack">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              // User bubble — right aligned
              if (message.type === 'user') {
                return (
                  <motion.div key={message.id} className="user-row" exit={rowExit}>
                    <motion.div className="user-bubble" {...bubbleAnim}>
                      {message.text}
                    </motion.div>
                  </motion.div>
                );
              }

              // Sent confirmation chip
              if (message.type === 'sent') {
                return (
                  <motion.div key={message.id} className="sent-badge-row" exit={rowExit}>
                    <motion.div className="sent-badge" {...bubbleAnim}>
                      <ArrowUp size={13} strokeWidth={2.5} style={{ transform: 'rotate(45deg)' }} />
                      Anfrage versendet
                    </motion.div>
                  </motion.div>
                );
              }

              // Typing indicator
              if (message.type === 'typing') {
                return (
                  <motion.div key={message.id} className="system-row" exit={rowExit}>
                    <div className="system-row__spacer" />
                    <div className="system-content">
                      <motion.div className="system-bubble typing-bubble" {...bubbleAnim}>
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              }

              // AI message
              if (message.type === 'ai') {
                return (
                  <motion.div key={message.id} className="system-row" exit={rowExit}>
                    <div className="system-row__spacer" />
                    <div className="system-content">
                      <motion.div className="system-bubble" {...bubbleAnim}>
                        {message.text}
                      </motion.div>
                    </div>
                  </motion.div>
                );
              }

              const node = flow[message.nodeId];
              const isFirst = message.id === 'system-start';
              // Which chip was selected from this message?
              const nextMsg = messages[index + 1];
              const selectedChip = nextMsg?.type === 'user' ? nextMsg.text : null;

              return (
                <motion.article
                  key={message.id}
                  data-system-id={message.id}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className="system-row"
                >
                  <div className="system-row__spacer" />

                  {!isFirst && <ImageStrip node={node} />}

                  <div className="system-content">
                    <div className="system-bubble">
                      <div>{node.text}</div>
                      {node.action && (
                        <a href={node.action.href} className="bubble-action-btn">
                          {node.action.icon && <span className="chip-icon">{getIconComponent(node.action.icon)}</span>}
                          <span>{node.action.label}</span>
                        </a>
                      )}
                    </div>

                    {node.chips && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.32 }}
                        className={`chip-row${selectedChip ? ' chip-row--has-selection' : ''}`}
                      >
                        {node.chips.map((chip, chipIndex) => (
                          <button
                            key={chip.targetId}
                            type="button"
                            onClick={() => handleChipClick(chip.label, chip.targetId, index, chip.displayLabel)}
                            className={`chip-button chip-button--${chipIndex % 4}${selectedChip === chip.label ? ' chip-button--active' : ''}`}
                          >
                            {chip.icon && <span className="chip-icon">{getIconComponent(chip.icon)}</span>}
                            {chip.label && <span>{chip.label}</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          <div className="chat-stack__spacer" aria-hidden="true" />
        </div>
      </section>

      <form className="chat-composer" aria-label="Nachricht schreiben" onSubmit={(event) => { event.preventDefault(); handleComposerSubmit(); }}>
        {voiceMode !== 'idle' ? (
          <div ref={waveformRef} className="voice-waveform-pill" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="voice-bar" style={{ animationDelay: `${(i * 60) % 500}ms` }} />
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            placeholder="Schreibe etwas..."
            aria-label="Nachricht"
          />
        )}
        {composerText.trim() && voiceMode === 'idle' ? (
          <button type="submit" className="is-active" aria-label="Senden">
            <ArrowUp size={22} strokeWidth={2.2} />
          </button>
        ) : voiceMode !== 'idle' ? (
          <button
            type="button"
            className="is-active voice-stop-btn"
            aria-label="Fertig"
            onClick={handleVoiceDialog}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <button type="button" aria-label="Sprachdialog starten" onClick={handleVoiceDialog}>
            <AudioLines size={20} strokeWidth={2} />
          </button>
        )}
      </form>

    </main>
  );
}
