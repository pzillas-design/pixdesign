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
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import React, { MouseEvent, Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CanvasEditor } from './CanvasEditor';
import { sendMessage, resetSession, sendInquiry, appendModelTurn, setRuntimeContext, type GalleryCategory } from './lib/gemini';
import { useLiveVoice } from './lib/useLiveVoice';
import { getMediaByTags } from './lib/mediaLibrary';
import { trackPhoneClick, trackWhatsAppClick, trackEmailClick, trackInquirySent } from './lib/tracking';

const AdminPanel = React.lazy(() => import('./AdminPanel').then((module) => ({ default: module.AdminPanel })));

const bubbleAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] as const },
};

const rowExit = { opacity: 0, y: -4, transition: { duration: 0.22, ease: [0.7, 0, 0.84, 0] as const } };
const STRIP_TRANSITION_MS = 820;

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
  | 'contact-whatsapp'
  | 'contact-more'
  | 'about'
  | 'impressum';

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
  | 'whatsapp'
  | 'circlehelp'
  | 'users';

type ImageMeta = { tag?: string; title?: string; description?: string };

type ChatNode = {
  id: NodeId;
  text: string;
  aiHandled?: boolean; // skip static text, let AI agent respond instead
  chips?: Array<{ label: string; displayLabel?: string; targetId: NodeId; icon?: IconName; href?: string }>;
  action?: { label: string; href: string; icon?: IconName };
  images: string[];
  imageMeta?: ImageMeta[];
  imageMode?: 'logo' | 'gallery';
};

type Message =
  | { id: string; type: 'system'; nodeId: NodeId }
  | { id: string; type: 'user'; text: string }
  | { id: string; type: 'ai'; text: string }
  | { id: string; type: 'images'; images: string[] }
  | { id: string; type: 'sent' }
  | { id: string; type: 'typing' };

const flow: Record<NodeId, ChatNode> = {
  start: {
    id: 'start',
    text: 'Willkommen bei PIX ✌️\nIch baue Webseiten, mache Fotos und Videos in Frankfurt und Umgebung. Womit kann ich helfen?',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Foto', targetId: 'photo', icon: 'camera' },
      { label: 'Video', targetId: 'video', icon: 'film' },
      { label: '', displayLabel: 'Anrufen', targetId: 'contact-call', icon: 'phone', href: atob('dGVsOis0OTE1OTA2NDAxOTk1') },
      { label: '', displayLabel: 'WhatsApp', targetId: 'contact-whatsapp', icon: 'whatsapp', href: atob('aHR0cHM6Ly93YS5tZS80OTE1OTA2NDAxOTk1') },
      { label: '', displayLabel: 'E-Mail', targetId: 'contact-mail', icon: 'mail', href: atob('bWFpbHRvOnB6aWxsYXMyQGdtYWlsLmNvbQ==') },
      { label: '', displayLabel: 'Mehr erfahren', targetId: 'contact-more', icon: 'circlehelp' },
    ],
    images: getMediaByTags(['startscreen']),
    imageMode: 'gallery',
  },
  web: {
    id: 'web',
    aiHandled: true,
    text: 'Klar. Geht es eher um einen Auftritt, ein digitales Tool oder eine sehr fokussierte Landing Page?',
    chips: [],
    images: [
      '/media/web_leasehub_cover.webp',
      '/media/web_crewting_cover.webp',
      '/media/web_jakobs_cover.webp',
    ],
    imageMeta: [
      { tag: 'LeaseHub', title: 'LeaseHub', description: 'SaaS-Plattform für Fahrzeug-Leasingverwaltung' },
      { tag: 'Crewting', title: 'Crewting', description: 'Matching-App für Kreativteams und Freelancer' },
      { tag: 'Jakobs', title: 'Jakobs Consulting', description: 'Unternehmensauftritt für eine Unternehmensberatung' },
    ],
  },
  photo: {
    id: 'photo',
    aiHandled: true,
    text: 'Professionelle Fotografie fuer jeden Anlass. Was moechtest du sehen?',
    chips: [],
    images: [
      '/media/hd_12_event.jpg',
      '/media/hd_1_business.webp',
      '/media/hd_2_immobilien.webp',
      '/media/hd_30_architektur.jpg',
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
    aiHandled: true,
    text: 'Bewegtbild, das nicht nur dekoriert. Welche Richtung passt zu deinem Projekt?',
    chips: [],
    images: ['/media/video-brand.webp', '/media/video-event.webp', '/media/video-drone.webp'],
    imageMeta: [
      { tag: 'Imagefilm', title: 'Imagefilm' },
      { tag: 'Event', title: 'Eventfilm' },
      { tag: 'Drohne', title: 'Drohnenaufnahmen' },
    ],
  },
  'web-business': {
    id: 'web-business',
    aiHandled: true,
    text: 'Dann wuerde ich zuerst klaeren, was Menschen in den ersten zehn Sekunden verstehen muessen.',
    chips: [],
    images: ['/media/web_pms_cover.webp', '/media/web_leasehub_02-dahsboard.webp'],
    imageMeta: [
      { tag: 'PMS', title: 'PMS Verwaltung', description: 'Verwaltungsplattform für Property Management' },
      { tag: 'LeaseHub', title: 'LeaseHub Dashboard', description: 'Dashboard-Ansicht der LeaseHub-Plattform' },
    ],
  },
  'web-tools': {
    id: 'web-tools',
    aiHandled: true,
    text: 'Wenn heute noch viel in Tabellen, Mails oder Bauchgefuehl steckt, kann ein kleines Tool sehr viel Ruhe reinbringen.',
    chips: [],
    images: ['/media/web_leasehub_02-dahsboard.webp', '/media/web_tososto_05-karte.webp'],
    imageMeta: [
      { tag: 'LeaseHub', title: 'LeaseHub', description: 'SaaS-Tool für Leasingverwaltung' },
      { tag: 'Tososto', title: 'Tososto', description: 'Kartenbasiertes Tool zur Standortsuche' },
    ],
  },
  'web-landing': {
    id: 'web-landing',
    aiHandled: true,
    text: 'Landing Pages sollten nicht viel erklaeren, sondern schnell die richtige Entscheidung leichter machen.',
    chips: [],
    images: ['/media/web_600kids_cover.webp', '/media/web_crewting_cover.webp'],
    imageMeta: [
      { tag: '600 Kids', title: '600 Kids Festival', description: 'Event-Landing-Page für ein Jugendfestival' },
      { tag: 'Crewting', title: 'Crewting', description: 'Landing Page für eine Kreativ-Matching-App' },
    ],
  },
  'photo-business': {
    id: 'photo-business',
    aiHandled: true,
    text: 'Bei Business-Fotos geht es meistens um Vertrauen. Nicht zu steif, nicht zu inszeniert.',
    chips: [],
    images: ['/media/hd_1_business.webp', '/media/hd_17_business.webp', '/media/hd_28_business.jpg'],
    imageMeta: [
      { tag: 'Business', title: 'Business-Portrait' },
      { tag: 'Team', title: 'Team-Fotografie' },
      { tag: 'Portrait', title: 'Portrait-Shooting' },
    ],
  },
  'photo-events': {
    id: 'photo-events',
    aiHandled: true,
    text: 'Events brauchen Bilder, die sich spaeter noch nach dem Abend anfuehlen.',
    chips: [],
    images: ['/media/hd_12_event.jpg', '/media/hd_15_event.webp', '/media/hd_29_event.jpg'],
    imageMeta: [
      { tag: '600 Kids', title: '600 Kids Festival', description: 'Eventfotografie für ein Jugendfestival in Frankfurt' },
      { tag: 'Konferenz', title: 'Konferenzfotografie' },
      { tag: 'Event', title: 'Eventfotografie' },
    ],
  },
  'photo-realestate': {
    id: 'photo-realestate',
    aiHandled: true,
    text: 'Klare Perspektiven, gutes Licht – Fotos die Räume wirken lassen. Shooting ab 80 €, Ergebnisse binnen 48 h. Wann soll ich kommen?',
    chips: [],
    images: ['/media/hd_2_immobilien.webp', '/media/hd_7_immobilien.jpg', '/media/hd_30_architektur.jpg'],
    imageMeta: [
      { tag: 'Exposé', title: 'Immobilien Exposé', description: 'Exposé-Fotografie für eine Wohnimmobilie' },
      { tag: 'Wohnung', title: 'Wohnungsfotografie' },
      { tag: 'Architektur', title: 'Architekturfotografie' },
    ],
  },
  'video-brand': {
    id: 'video-brand',
    aiHandled: true,
    text: 'Ein Imagefilm sollte ein Gefuehl setzen und schnell zeigen, warum es euch gibt.',
    chips: [],
    images: ['/media/video-brand.webp', '/media/video-story.webp', '/media/video-motion.webp'],
    imageMeta: [
      { tag: 'Imagefilm', title: 'Imagefilm' },
      { tag: 'Story', title: 'Storytelling' },
      { tag: 'Motion', title: 'Motion Design' },
    ],
  },
  'video-event': {
    id: 'video-event',
    aiHandled: true,
    text: 'Ein Eventfilm braucht Tempo, Stimmen und die kleinen Momente zwischen den Programmpunkten.',
    chips: [],
    images: ['/media/video-event.webp', '/media/video-konferenz.webp', '/media/hd_12_event.jpg'],
    imageMeta: [
      { tag: 'Event', title: 'Eventfilm' },
      { tag: 'Konferenz', title: 'Konferenzfilm' },
      { tag: '600 Kids', title: '600 Kids Festival' },
    ],
  },
  'video-realestate': {
    id: 'video-realestate',
    aiHandled: true,
    text: 'Immobilienfilm darf ruhig sein. Ein guter Rundgang zeigt Orientierung und laesst Raeume wirken.',
    chips: [],
    images: ['/media/video-drone.webp', '/media/hd_2_immobilien.webp', '/media/hd_7_immobilien.jpg'],
    imageMeta: [
      { tag: 'Drohne', title: 'Drohnenfilm', description: 'Luftaufnahmen für Immobilienpräsentationen' },
      { tag: 'Exposé', title: 'Immobilienfilm' },
      { tag: 'Rundgang', title: 'Virtueller Rundgang' },
    ],
  },
  'contact-call': {
    id: 'contact-call',
    aiHandled: true,
    text: 'Einfachste Option: anrufen.',
    action: { label: '0159 06401995', href: 'tel:+4915906401995', icon: 'phone' },
    chips: [],
    images: ['/media/portrait.webp'],
  },
  'contact-whatsapp': {
    id: 'contact-whatsapp',
    aiHandled: true,
    text: 'Schreib mir direkt auf WhatsApp — ich antworte so schnell ich kann.',
    action: { label: 'WhatsApp öffnen', href: 'https://wa.me/4915906401995', icon: 'whatsapp' },
    chips: [],
    images: ['/media/portrait.webp'],
  },
  'contact-mail': {
    id: 'contact-mail',
    aiHandled: true,
    text: 'Erzähl mir was du brauchst und ich meld mich in Kürze bei dir.',
    action: { label: 'pzillas2@gmail.com', href: 'mailto:pzillas2@gmail.com', icon: 'mail' },
    chips: [],
    images: ['/media/portrait.webp'],
  },
  'contact-more': {
    id: 'contact-more',
    text: 'Diese Webseite ist ein kleiner Vorgeschmack, wie sich das Internet von morgen anfühlen könnte. KI-Agenten werden einen Großteil des Internets ersetzen. Sie werden Informationen beschaffen, anfragen stellen, einkaufen, planen, Benutzeroberflächen individuell für ihre Nutzer erzeugen.\n\nWas sie nicht können: wollen. Sie haben keinen Drang, etwas zu erschaffen. Genau dafür gibt\'s uns und dabei will ich dich unterstützen.',
    chips: [
      { label: 'About PIX', targetId: 'about' },
      { label: 'Impressum', targetId: 'impressum' },
    ],
    images: [],
  },
  about: {
    id: 'about',
    text: 'PIX ist die Kreativagentur von Michael Pzillas in Frankfurt.\nGelernter Mediengestalter, 10+ Jahre Erfahrung. Referenzen u.a. Engel & Völkers, Guinness, S.Oliver.\n\nAnsatz: direkt, auf Augenhöhe, fair. Kein Overhead, kein Bullshit — nur das, was dein Projekt wirklich braucht.',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Foto', targetId: 'photo', icon: 'camera' },
      { label: 'Video', targetId: 'video', icon: 'film' },
    ],
    images: [],
  },
  impressum: {
    id: 'impressum',
    text: 'Angaben gemäß § 5 TMG\n\nMichael Pzillas\nLahnstraße 96\n60326 Frankfurt am Main\n\nKontakt:\nTel: 0159 06401995\nMail: pzillas2@gmail.com\n\nUmsatzsteuer-ID gemäß § 27a UStG: wird auf Anfrage mitgeteilt.\n\nVerantwortlich für den Inhalt nach § 55 Abs. 2 RStV: Michael Pzillas',
    chips: [],
    images: [],
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
    case 'whatsapp':
      return <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
    case 'mail':
      return <Mail {...iconProps} />;
    case 'circlehelp':
      return (
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.005 6.66994C7.40827 5.44557 8.20424 4.41315 9.25192 3.75552C10.2996 3.09789 11.5314 2.8575 12.7291 3.07692C13.9269 3.29634 15.0133 3.96142 15.7959 4.95435C16.5785 5.94728 17.0068 7.20399 17.005 8.5019C17.005 12.1658 11.8592 13.9978 11.8592 13.9978" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20H12.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'users':
      return <Users {...iconProps} />;
    default:
      return null;
  }
}

// E-Mails und Telefonnummern in KI-Antworten zu klickbaren Deeplinks machen.
// Telefon: nur Läufe mit >=9 Ziffern/Leerzeichen → Preise (mit . , € /) matchen nicht.
const LINK_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\+?\d[\d ]{7,}\d)/g;

function linkify(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const match = m[0];
    if (m[1]) {
      parts.push(<a key={key++} href={`mailto:${match}`} className="chat-link">{match}</a>);
    } else {
      parts.push(<a key={key++} href={`tel:${match.replace(/\s+/g, '')}`} className="chat-link">{match}</a>);
    }
    last = m.index + match.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function ImageStrip({ node, onCenterChange, onReady }: { node: ChatNode; onCenterChange?: (src: string) => void; onReady?: () => void }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const [ready, setReady] = useState(false);
  const lightboxTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const loadedCountRef = useRef(0);
  const imagesLoadedRef = useRef(false);
  const positionedRef = useRef(false);
  const openNotifiedRef = useRef(false);
  const readyNotifiedRef = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const lastCenterRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const jumpingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const rafRef = useRef<number>(0);
  const centerRafRef = useRef<number>(0);
  const resumeAutoScrollRef = useRef<number>(0);
  const scrollAccRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  const images = node.images ?? [];
  const imageKey = images.join('|');
  const meta = node.imageMeta ?? [];
  const singleImage = images.length <= 1;
  // Triple for infinite scroll — aber nur bei mehreren Bildern.
  // Ein einzelnes Bild wird NICHT wiederholt (sonst 3x dasselbe).
  const tripled = useMemo(() => (singleImage ? images : [...images, ...images, ...images]), [imageKey, singleImage]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  if (!images.length) return null;

  const updateCenter = useCallback(() => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;
    const scrollCenter = strip.scrollLeft + strip.clientWidth / 2;
    let minDist = Infinity;
    let centerSrc: string | null = null;
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - scrollCenter);
      if (dist < minDist) { minDist = dist; centerSrc = tripled[i]; }
    });
    if (centerSrc && centerSrc !== lastCenterRef.current) {
      lastCenterRef.current = centerSrc;
      onCenterChange?.(centerSrc);
    }
  }, [tripled, onCenterChange]);

  const scheduleCenterUpdate = useCallback(() => {
    if (centerRafRef.current) return;
    centerRafRef.current = requestAnimationFrame(() => {
      centerRafRef.current = 0;
      updateCenter();
    });
  }, [updateCenter]);

  const pauseAutoScroll = useCallback((resumeDelay = 0) => {
    isDraggingRef.current = true;
    if (resumeAutoScrollRef.current) {
      window.clearTimeout(resumeAutoScrollRef.current);
      resumeAutoScrollRef.current = 0;
    }
    if (resumeDelay > 0) {
      resumeAutoScrollRef.current = window.setTimeout(() => {
        isDraggingRef.current = false;
        scrollAccRef.current = stripRef.current?.scrollLeft ?? scrollAccRef.current;
      }, resumeDelay);
    }
  }, []);

  const markStripReady = useCallback(() => {
    if (!positionedRef.current || readyNotifiedRef.current) return;
    readyNotifiedRef.current = true;
    setReady(true);
  }, []);

  const positionStrip = useCallback(() => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;
    // Einzelbild: kein Endlos-Scroll, einfach am Anfang stehen lassen.
    if (singleImage) {
      strip.scrollLeft = 0;
      scrollAccRef.current = 0;
      positionedRef.current = true;
      updateCenter();
      markStripReady();
      return;
    }
    const oneThird = track.scrollWidth / 3;
    if (oneThird <= 0) {
      requestAnimationFrame(positionStrip);
      return;
    }
    strip.scrollLeft = oneThird;
    scrollAccRef.current = oneThird;
    positionedRef.current = true;
    updateCenter();
    markStripReady();
  }, [markStripReady, updateCenter, singleImage]);

  const markImagesLoaded = useCallback(() => {
    imagesLoadedRef.current = true;
    if (!openNotifiedRef.current) {
      openNotifiedRef.current = true;
      onReadyRef.current?.();
    }
    requestAnimationFrame(() => {
      positionStrip();
    });
  }, [positionStrip]);

  // Scroll to middle set on mount — hide until positioned to avoid flash
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    setReady(false);
    loadedCountRef.current = 0;
    imagesLoadedRef.current = false;
    positionedRef.current = false;
    openNotifiedRef.current = false;
    readyNotifiedRef.current = false;
    lastCenterRef.current = null;

    // Check for already-cached images (onLoad won't fire for these)
    const imgs = Array.from(track.querySelectorAll('img')) as HTMLImageElement[];
    const firstSet = imgs.slice(0, images.length);
    const alreadyLoaded = firstSet.filter(img => img.complete && img.naturalWidth > 0).length;
    if (alreadyLoaded >= images.length) {
      markImagesLoaded();
    } else {
      loadedCountRef.current = alreadyLoaded;
    }
  }, [node.id, imageKey, images.length]);

  // Infinite loop + center detection
  useEffect(() => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;

    function onScroll() {
      if (!strip || !track || jumpingRef.current) return;
      if (singleImage) { scheduleCenterUpdate(); return; }
      const oneThird = track.scrollWidth / 3;
      if (strip.scrollLeft < oneThird * 0.25) {
        jumpingRef.current = true;
        strip.scrollLeft += oneThird;
        jumpingRef.current = false;
      } else if (strip.scrollLeft > oneThird * 1.75) {
        jumpingRef.current = true;
        strip.scrollLeft -= oneThird;
        jumpingRef.current = false;
      }
      scheduleCenterUpdate();
    }

    strip.addEventListener('scroll', onScroll, { passive: true });
    return () => strip.removeEventListener('scroll', onScroll);
  }, [node.id, updateCenter]);

  // Auto-scroll slowly, pause on hover/drag
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const stripEl = strip;
    if (singleImage) return; // Einzelbild: kein Auto-Scroll
    const speed = 10.5; // px per second
    // Track float position ourselves so sub-pixel moves are smooth
    scrollAccRef.current = stripEl.scrollLeft;
    function tick(now: number) {
      const previous = lastTickRef.current ?? now;
      const delta = Math.min(now - previous, 40) / 1000;
      lastTickRef.current = now;
      if (readyNotifiedRef.current && !isHoveredRef.current && !isDraggingRef.current) {
        scrollAccRef.current += speed * delta;
        stripEl.scrollLeft = scrollAccRef.current;
      } else {
        // Re-sync when user drags or hovers (so we resume from correct position)
        scrollAccRef.current = stripEl.scrollLeft;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (centerRafRef.current) cancelAnimationFrame(centerRafRef.current);
      if (resumeAutoScrollRef.current) window.clearTimeout(resumeAutoScrollRef.current);
    };
  }, [node.id]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') showPreviousImage();
      if (e.key === 'ArrowRight') showNextImage();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length]);

  const currentMeta = lightboxIndex !== null ? (meta[lightboxIndex] ?? null) : null;

  function showPreviousImage() {
    setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : 0);
  }

  function showNextImage() {
    setLightboxIndex(i => i !== null ? (i + 1) % images.length : 0);
  }

  return (
    <>
      <div
        ref={stripRef}
        className="image-strip"
        style={{ cursor: grabbing ? 'grabbing' : 'grab', opacity: ready ? 1 : 0 }}
        onMouseDown={(e) => {
          pauseAutoScroll();
          hasDraggedRef.current = false;
          dragStartXRef.current = e.clientX;
          scrollStartRef.current = stripRef.current?.scrollLeft ?? 0;
          setGrabbing(true);
          stripRef.current?.classList.add('image-strip--user-dragging');
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          if (!isDraggingRef.current || !stripRef.current) return;
          const dx = e.clientX - dragStartXRef.current;
          if (Math.abs(dx) > 4) hasDraggedRef.current = true;
          stripRef.current.scrollLeft = scrollStartRef.current - dx;
        }}
        onMouseEnter={() => { isHoveredRef.current = true; }}
        onMouseUp={() => { pauseAutoScroll(900); setGrabbing(false); stripRef.current?.classList.remove('image-strip--user-dragging'); }}
        onMouseLeave={() => { pauseAutoScroll(900); setGrabbing(false); isHoveredRef.current = false; stripRef.current?.classList.remove('image-strip--user-dragging'); }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          dragStartXRef.current = t.clientX;
          (stripRef.current as any)._touchStartY = t.clientY;
          pauseAutoScroll();
          hasDraggedRef.current = false;
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          const dx = Math.abs(t.clientX - dragStartXRef.current);
          const dy = Math.abs(t.clientY - ((stripRef.current as any)._touchStartY ?? t.clientY));
          // If predominantly vertical — let the chat scroll handle it, don't block
          if (dy > dx * 1.5) return;
          hasDraggedRef.current = true;
          scrollAccRef.current = stripRef.current?.scrollLeft ?? scrollAccRef.current;
        }}
        onTouchEnd={() => { pauseAutoScroll(1400); }}
      >
        <div ref={trackRef} className="image-strip__track">
          {tripled.map((image, index) => (
            <div
              className="image-strip__item"
              key={`${node.id}-${index}`}
              onClick={() => { if (!hasDraggedRef.current) setLightboxIndex(index % images.length); }}
            >
              <img
                src={image}
                alt={meta[index % images.length]?.title ?? ''}
                draggable={false}
                decoding="async"
                onLoad={() => {
                  // only count first set (not duplicates)
                  if (index < images.length) {
                    loadedCountRef.current += 1;
                    if (loadedCountRef.current >= images.length) markImagesLoaded();
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {createPortal(
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            className="image-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxIndex(null)}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              lightboxTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchEnd={(e) => {
              const start = lightboxTouchStartRef.current;
              const touch = e.changedTouches[0];
              lightboxTouchStartRef.current = null;
              if (!start || !touch || images.length < 2) return;
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
              e.stopPropagation();
              if (dx < 0) showNextImage();
              else showPreviousImage();
            }}
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
                <div className="image-lightbox__image-wrap">
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
                    <>
                      <button
                        type="button"
                        className="image-lightbox__nav image-lightbox__nav--prev"
                        aria-label="Vorheriges Bild"
                        onClick={(e) => { e.stopPropagation(); showPreviousImage(); }}
                      >
                        <ChevronLeft size={22} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="image-lightbox__nav image-lightbox__nav--next"
                        aria-label="Naechstes Bild"
                        onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                      >
                        <ChevronRight size={22} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      , document.body)}
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
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050505' }} />}>
        <AdminPanel />
      </Suspense>
    );
  }

  const [messages, setMessages] = useState<Message[]>([{ id: 'system-start', type: 'system', nodeId: 'start' }]);
  const [sliderNodeId, setSliderNodeId] = useState<NodeId>('start');
  const [activeStripId, setActiveStripId] = useState<string>('system-start');
  const [stripReadyIds, setStripReadyIds] = useState<Set<string>>(new Set());
  const [composerText, setComposerText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastAiTextRef = useRef<string>('');
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLDivElement | null>(null);
  const stripSwitchingRef = useRef(false);
  const resetToStartRef = useRef(false);
  const focusedUserMessageIdRef = useRef<string | null>(null);

  const { state: voiceMode, start: startLiveVoice, stop: stopLiveVoice } = useLiveVoice();

  const activeNode = flow[sliderNodeId];


  function scrollMessageToTop(messageId: string, behavior: ScrollBehavior = 'smooth') {
    const scroller = scrollRef.current;
    const messageEl = scroller?.querySelector<HTMLElement>(`[data-chat-message-id="${messageId}"]`);
    if (!scroller || !messageEl) return;
    scroller.scrollTo({
      top: Math.max(0, messageEl.offsetTop),
      behavior,
    });
  }

  function settleMessageNearTop(messageId: string) {
    requestAnimationFrame(() => scrollMessageToTop(messageId, 'smooth'));
    window.setTimeout(() => scrollMessageToTop(messageId, 'smooth'), Math.round(STRIP_TRANSITION_MS * 0.45));
    window.setTimeout(() => scrollMessageToTop(messageId, 'smooth'), STRIP_TRANSITION_MS + 80);
  }

  useEffect(() => {
    if (focusedUserMessageIdRef.current) {
      requestAnimationFrame(() => {
        scrollMessageToTop(focusedUserMessageIdRef.current!, 'smooth');
      });
      return;
    }

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: stripSwitchingRef.current ? 'auto' : 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (composerText === '' && composerInputRef.current?.textContent) {
      composerInputRef.current.textContent = '';
    }
  }, [composerText]);

  // Keep AI runtime context in sync
  useEffect(() => {
    setRuntimeContext({ activeBranch: activeNode?.text ? activeNode.text.slice(0, 60) : sliderNodeId });
  }, [sliderNodeId, activeNode]);

  // Hash routing
  const HASH_ROUTES: Record<string, { label: string; targetId: NodeId; title: string; description: string }> = {
    immobilien: {
      label: 'Immobilienfotografie',
      targetId: 'photo-realestate',
      title: 'Immobilienfotografie Frankfurt · PIX',
      description: 'Professionelle Immobilienfotos in Frankfurt. Shooting ab 80 €, Lieferung in 48 h. Kunden: Engel & Völkers, Vonovia, Von Poll.',
    },
    webdesign: {
      label: 'Webdesign',
      targetId: 'web',
      title: 'Webdesign & Web-Apps Frankfurt · PIX',
      description: 'Webdesign und Web-Apps aus Frankfurt. Keine Templates, keine Kompromisse — direkt, sauber, fertig.',
    },
    video: {
      label: 'Video',
      targetId: 'video',
      title: 'Imagefilm & Videoproduktion Frankfurt · PIX',
      description: 'Imagefilm, Eventfilm und Videoproduktion in Frankfurt. Inkl. Konzeption, Dreh, Schnitt, Color Grading.',
    },
  };
  const [pendingHash] = useState(() => {
    const hash = window.location.hash.slice(1).toLowerCase();
    const route = HASH_ROUTES[hash];
    if (route) {
      document.title = route.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', route.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', route.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', route.description);
    }
    return route ?? null;
  });

  // Start gallery — hardcoded, served from /public via Vercel
  const startGalleryImages = [
    '/media/hd_6_immobilien.jpg',
    '/media/expose.png',
    '/media/hd_10_architektur.jpg',
    '/media/tososto.png',
    '/media/hd_21_menschen.jpg',
    '/media/wassertechnik.png',
    '/media/hd_26_business.jpg',
  ];



  function handleChipClick(label: string, targetId: NodeId, fromIndex: number, displayLabel?: string) {
    const bubbleText = displayLabel || label;
    const userMessage: Message = { id: createId('user'), type: 'user', text: bubbleText };
    const targetNode = flow[targetId];
    const targetHasImages = !!(targetNode?.images?.length);
    const isAiHandled = !!(targetNode?.aiHandled);
    stripSwitchingRef.current = targetHasImages;
    focusedUserMessageIdRef.current = userMessage.id;
    setMessages((current) => current.slice(0, fromIndex + 1));
    if (targetHasImages) {
      setActiveStripId('');
      setStripReadyIds(new Set());
    }
    resetSession();
    setTimeout(() => {
      setMessages((current) => [...current, userMessage]);
    }, targetHasImages ? 140 : 320);
    setTimeout(async () => {
      const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };
      setMessages((current) => [...current, systemMessage]);
      setSliderNodeId(targetId);
      if (targetHasImages) {
        setActiveStripId(systemMessage.id);
        requestAnimationFrame(() => settleMessageNearTop(userMessage.id));
      }
      window.setTimeout(() => {
        stripSwitchingRef.current = false;
        focusedUserMessageIdRef.current = null;
      }, targetHasImages ? STRIP_TRANSITION_MS : 0);

      if (isAiHandled) {
        const typingId = createId('typing');
        setMessages((current) => [...current, { id: typingId, type: 'typing' }]);
        setAiLoading(true);
        const aiResponse = await sendMessage(bubbleText);
        lastAiTextRef.current = aiResponse.text;
        const aiImgMsgs: Message[] = [];
        // Hat der angeklickte Node schon einen eigenen kuratierten Streifen,
        // KEINEN zweiten KI-Streifen dazupacken → sonst Dopplung nach Chip-Klick.
        if (!targetHasImages && aiResponse.showImages?.length) {
          const imgs = getMediaByTags(aiResponse.showImages);
          if (imgs.length) aiImgMsgs.push({ id: createId('images'), type: 'images', images: imgs });
        }
        if (aiResponse.sendEmail) {
          const result = await sendInquiry(aiResponse.sendEmail);
          if (result.ok) trackInquirySent();
          appendModelTurn(aiResponse.text);
          const msgs: Message[] = [...aiImgMsgs];
          if (aiResponse.text) msgs.push({ id: createId('ai'), type: 'ai', text: aiResponse.text });
          if (result.ok) msgs.push({ id: createId('sent'), type: 'sent' });
          else msgs.push({ id: createId('ai'), type: 'ai', text: `Senden fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}` });
          setMessages((current) => current.filter(m => m.type !== 'images').map((m) => m.id === typingId ? msgs[0] : m).concat(msgs.slice(1)));
        } else {
          const msgs: Message[] = [...aiImgMsgs, { id: createId('ai'), type: 'ai', text: aiResponse.text }];
          setMessages((current) => current.filter(m => m.type !== 'images').map((m) => m.id === typingId ? msgs[0] : m).concat(msgs.slice(1)));
        }
        setAiLoading(false);
      }
    }, targetHasImages ? STRIP_TRANSITION_MS : 560);
  }

  // Trigger hash route chip once on mount
  const hashTriggeredRef = useRef(false);
  useEffect(() => {
    if (!pendingHash || hashTriggeredRef.current) return;
    hashTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      handleChipClick(pendingHash.label, pendingHash.targetId, 0);
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  function resetToStartWithStripTransition() {
    if (resetToStartRef.current || activeStripId === 'system-start') return;
    resetToStartRef.current = true;
    stripSwitchingRef.current = true;
    setActiveStripId('');
    setStripReadyIds(new Set());
    resetSession();

    window.setTimeout(() => {
      setSliderNodeId('start');
      setActiveStripId('system-start');
      window.setTimeout(() => {
        stripSwitchingRef.current = false;
        resetToStartRef.current = false;
      }, STRIP_TRANSITION_MS);
    }, STRIP_TRANSITION_MS);
  }

  function dropHeaderMessage(label: string, targetId: NodeId) {
    const userMessage: Message = { id: createId('user'), type: 'user', text: label };
    const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };
    setMessages((current) => [...current, userMessage, systemMessage]);
    setSliderNodeId(targetId);
    setActiveStripId(systemMessage.id);
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

    const aiResponse = await sendMessage(text);
    lastAiTextRef.current = aiResponse.text;

    const aiImgMsgs: Message[] = [];
    if (aiResponse.showImages?.length) {
      const imgs = getMediaByTags(aiResponse.showImages);
      if (imgs.length) aiImgMsgs.push({ id: createId('images'), type: 'images', images: imgs });
    }

    if (aiResponse.sendEmail) {
      const result = await sendInquiry(aiResponse.sendEmail);
      if (result.ok) trackInquirySent();
      appendModelTurn(aiResponse.text);
      const msgs: Message[] = [...aiImgMsgs];
      if (aiResponse.text) msgs.push({ id: createId('ai'), type: 'ai', text: aiResponse.text });
      if (result.ok) msgs.push({ id: createId('sent'), type: 'sent' });
      else msgs.push({ id: createId('ai'), type: 'ai', text: `Senden fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}. Schreib direkt an pzillas2@gmail.com.` });
      setMessages((current) => current.map((m) => m.id === typingId ? msgs[0] : m).concat(msgs.slice(1)));
    } else {
      const msgs: Message[] = [...aiImgMsgs, { id: createId('ai'), type: 'ai', text: aiResponse.text }];
      setMessages((current) => current.map((m) => m.id === typingId ? msgs[0] : m).concat(msgs.slice(1)));
    }
    setAiLoading(false);
  }

  function handleVoiceDialog() {
    if (voiceMode !== 'idle') { stopLiveVoice(); return; }
    startLiveVoice();
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleComposerSubmit();
  }

  return (
    <main className={`portfolio-chat theme-${timeTheme}`}>
      {/* Ambient background glow — portalled to body to avoid overflow:hidden clipping */}
      {createPortal(
        <div
          className="chat-bg-glow"
          style={{ '--glow-image': bgImage ? `url(${bgImage})` : 'none' } as CSSProperties}
        />,
        document.body
      )}

      <section ref={scrollRef} className="chat-scroll" aria-label="PIX Portfolio Chat">
        <AnimatePresence initial={false} mode="popLayout">
          {(() => {
            const chatElements: React.ReactNode[] = [];

            messages.forEach((message, index) => {
              if (message.type === 'user') {
                chatElements.push(
                  <motion.div key={message.id} data-chat-message-id={message.id} className="chat-segment user-row" exit={rowExit}>
                    <motion.div className="user-bubble" {...bubbleAnim}>{message.text}</motion.div>
                  </motion.div>
                );
                return;
              }
              if (message.type === 'sent') {
                chatElements.push(
                  <motion.div key={message.id} className="chat-segment sent-badge-row" exit={rowExit}>
                    <motion.div className="sent-badge" {...bubbleAnim}>
                      <ArrowUp size={13} strokeWidth={2.5} style={{ transform: 'rotate(45deg)' }} />
                      Anfrage versendet
                    </motion.div>
                  </motion.div>
                );
                return;
              }
              if (message.type === 'typing') {
                chatElements.push(
                  <motion.div key={message.id} className="chat-segment system-row" exit={rowExit}>
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
                return;
              }
              if (message.type === 'images') {
                const syntheticNode: ChatNode = { id: 'start', text: '', images: message.images, chips: [] };
                chatElements.push(
                  <motion.div
                    key={message.id}
                    className="strip-shutter-frame"
                    initial={{ height: 0, opacity: 0, clipPath: 'inset(0% 0 100%)' }}
                    animate={{ height: 'var(--strip-height)', opacity: 1, clipPath: 'inset(0% 0 0%)' }}
                    exit={{ position: 'absolute', height: 0, opacity: 0, clipPath: 'inset(0% 0 100%)' }}
                    transition={{ duration: STRIP_TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ImageStrip node={syntheticNode} onCenterChange={setBgImage} />
                  </motion.div>
                );
                return;
              }

              if (message.type === 'ai') {
                chatElements.push(
                  <motion.div key={message.id} className="chat-segment system-row" exit={rowExit}>
                    <div className="system-row__spacer" />
                    <div className="system-content">
                      <motion.div className="system-bubble" {...bubbleAnim}>{linkify(message.text)}</motion.div>
                    </div>
                  </motion.div>
                );
                return;
              }

              // System message (node)
              const isFirst = message.id === 'system-start';
              const baseImages = isFirst ? startGalleryImages : flow[message.nodeId].images;
              const node = { ...flow[message.nodeId], images: baseImages };
              const nextMsg = messages[index + 1];
              const selectedChip = nextMsg?.type === 'user' ? nextMsg.text : null;

              // Logo before everything — only for start message, always visible
              if (isFirst) {
                chatElements.push(
                  <header key="pix-logo" className={`chat-header${activeStripId === 'system-start' && stripReadyIds.has('system-start') ? ' chat-header--over-strip' : ''}`}>
                    <img src="/pix-logo.svg" alt="PIX" className="chat-header__logo" />
                  </header>
                );
              }

              // Strip above this message — only if it's the active strip
              if (baseImages?.length && message.id === activeStripId) {
                const stripOpen = stripReadyIds.has(message.id);
                chatElements.push(
                  <motion.div
                    key={`strip-${message.id}`}
                    className="strip-shutter-frame"
                    initial={{ height: 0, opacity: 0, clipPath: 'inset(0% 0 100%)' }}
                    animate={stripOpen
                      ? { height: 'var(--strip-height)', opacity: 1, clipPath: 'inset(0% 0 0%)' }
                      : { height: 0, opacity: 0, clipPath: 'inset(0% 0 100%)' }}
                    exit={{ position: 'absolute', height: 0, opacity: 0, clipPath: 'inset(0% 0 100%)' }}
                    transition={{ duration: STRIP_TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ImageStrip
                      node={node}
                      onCenterChange={setBgImage}
                      onReady={() => setStripReadyIds(prev => new Set([...prev, message.id]))}
                    />
                  </motion.div>
                );
              }

              // Content segment
              chatElements.push(
                <motion.article
                  key={message.id}
                  className="chat-segment system-row"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="system-row__spacer" />
                  <div className="system-content">
                    {(!node.aiHandled || node.action) && (
                      <div className="system-bubble">
                        {!node.aiHandled && <div>{node.text}</div>}
                        {node.action && (
                          <a href={node.action.href} className="bubble-action-btn">
                            {node.action.icon && <span className="chip-icon">{getIconComponent(node.action.icon)}</span>}
                            <span>{node.action.label}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {node.chips && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.32 }}
                        className={`chip-row${selectedChip ? ' chip-row--has-selection' : ''}`}
                      >
                        {node.chips.map((chip, chipIndex) => {
                          const chipText = chip.displayLabel || chip.label;
                          const isActive = selectedChip === chipText;
                          return (
                            <button
                              key={chip.targetId}
                              type="button"
                              onClick={() => {
                                if (chip.href) {
                                  if (chip.targetId === 'contact-call') trackPhoneClick();
                                  else if (chip.targetId === 'contact-whatsapp') trackWhatsAppClick();
                                  else if (chip.targetId === 'contact-mail') trackEmailClick();
                                  window.open(chip.href, '_blank', 'noopener');
                                } else if (isActive) {
                                  // Second click → reset to start
                                  resetToStartWithStripTransition();
                                } else {
                                  handleChipClick(chip.label, chip.targetId, index, chip.displayLabel);
                                }
                              }}
                              className={`chip-button chip-button--${chipIndex % 4}${isActive ? ' chip-button--active' : ''}`}
                            >
                              {chip.icon && <span className="chip-icon">{getIconComponent(chip.icon)}</span>}
                              {chip.label && <span>{chip.label}</span>}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.article>
              );
            });

            return chatElements;
          })()}
        </AnimatePresence>
        <div className="chat-stack__spacer" aria-hidden="true" />
      </section>

      <div
        className="chat-composer"
        role="form"
        aria-label="Nachricht schreiben"
        style={{ '--glow-image': bgImage ? `url(${bgImage})` : 'none' } as CSSProperties}
      >
        {voiceMode !== 'idle' ? (
          <div ref={waveformRef} className="voice-waveform-pill" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="voice-bar" style={{ animationDelay: `${(i * 60) % 500}ms` }} />
            ))}
          </div>
        ) : (
          <div
            ref={composerInputRef}
            className="chat-composer__input"
            role="textbox"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Frag mich etwas..."
            onKeyDown={handleComposerKeyDown}
            onInput={(event) => setComposerText(event.currentTarget.textContent ?? '')}
            aria-label="Nachricht"
            spellCheck={false}
          />
        )}
        {composerText.trim() && voiceMode === 'idle' ? (
          <button type="button" className="is-active" aria-label="Senden" onClick={handleComposerSubmit}>
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
      </div>

    </main>
  );
}
