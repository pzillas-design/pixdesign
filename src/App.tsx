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
  AudioWaveform,
  ArrowUp,
  Loader,
  Volume2,
  VolumeX,
  AudioLines,
  CircleQuestionMark,
  MicOff,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MouseEvent, useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEditor } from './CanvasEditor';
import { AdminPanel } from './AdminPanel';
import { sendMessage, generateSpeech, resetSession, sendInquiry, type GalleryCategory } from './lib/gemini';
import { supabase } from './lib/supabase';

const bubbleAnim = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

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

type ChatNode = {
  id: NodeId;
  text: string;
  chips?: Array<{ label: string; displayLabel?: string; targetId: NodeId; icon?: IconName }>;
  action?: { label: string; href: string; icon?: IconName };
  images: string[];
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
  },
  'web-business': {
    id: 'web-business',
    text: 'Dann wuerde ich zuerst klaeren, was Menschen in den ersten zehn Sekunden verstehen muessen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/pms/cover.webp', '/media/web-projects/leasehub/02-dahsboard.webp'],
  },
  'web-tools': {
    id: 'web-tools',
    text: 'Wenn heute noch viel in Tabellen, Mails oder Bauchgefuehl steckt, kann ein kleines Tool sehr viel Ruhe reinbringen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/leasehub/02-dahsboard.webp', '/media/web-projects/tososto/05-karte.webp'],
  },
  'web-landing': {
    id: 'web-landing',
    text: 'Landing Pages sollten nicht viel erklaeren, sondern schnell die richtige Entscheidung leichter machen.',
    chips: [{ label: 'Zurueck', targetId: 'web', icon: 'rotateccw' }],
    images: ['/media/web-projects/600kids/cover.webp', '/media/web-projects/crewting/cover.webp'],
  },
  'photo-business': {
    id: 'photo-business',
    text: 'Bei Business-Fotos geht es meistens um Vertrauen. Nicht zu steif, nicht zu inszeniert.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/1_business.webp', '/media/foto-hd/17_business.webp', '/media/foto-hd/28_business.jpg'],
  },
  'photo-events': {
    id: 'photo-events',
    text: 'Events brauchen Bilder, die sich spaeter noch nach dem Abend anfuehlen.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/12_event.jpg', '/media/foto-hd/15_event.webp', '/media/foto-hd/29_event.jpg'],
  },
  'photo-realestate': {
    id: 'photo-realestate',
    text: 'Bei Immobilien wuerde ich ruhig bleiben. Klare Perspektiven, gutes Licht, kein Show-Effekt.',
    chips: [{ label: 'Zurueck', targetId: 'photo', icon: 'rotateccw' }],
    images: ['/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg', '/media/foto-hd/30_architektur.jpg'],
  },
  'video-brand': {
    id: 'video-brand',
    text: 'Ein Imagefilm sollte ein Gefuehl setzen und schnell zeigen, warum es euch gibt.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-brand.webp', '/media/detail/video-story.webp', '/media/detail/video-motion.webp'],
  },
  'video-event': {
    id: 'video-event',
    text: 'Ein Eventfilm braucht Tempo, Stimmen und die kleinen Momente zwischen den Programmpunkten.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-event.webp', '/media/detail/video-konferenz.webp', '/media/foto-hd/12_event.jpg'],
  },
  'video-realestate': {
    id: 'video-realestate',
    text: 'Immobilienfilm darf ruhig sein. Ein guter Rundgang zeigt Orientierung und laesst Raeume wirken.',
    chips: [{ label: 'Zurueck', targetId: 'video', icon: 'rotateccw' }],
    images: ['/media/detail/video-drone.webp', '/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg'],
  },
  'contact-call': {
    id: 'contact-call',
    text: 'Einfach anrufen — am besten werktags zwischen 9 und 18 Uhr.',
    action: { label: '0159 06401995', href: 'tel:+4915906401995', icon: 'phone' },
    chips: [],
    images: ['/media/detail/portrait.webp'],
  },
  'contact-mail': {
    id: 'contact-mail',
    text: 'Kurz Projekt, Zeitraum und Idee schreiben — ich melde mich schnell.',
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
      return <CircleQuestionMark {...iconProps} />;
    default:
      return null;
  }
}

function ImageStrip({ node, variant = 'side' }: { node: ChatNode; variant?: 'side' | 'inline' }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  function closeLightbox(event?: MouseEvent) {
    event?.stopPropagation();
    setLightboxImage(null);
  }

  return (
    <>
      <aside className={`image-strip image-strip--${variant}`} aria-label={`${node.id} Bilder`}>
        <motion.div
          key={node.id}
          className="image-strip__track"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {node.images.map((image, index) => (
            <motion.figure
              className="image-strip__item"
              key={`${node.id}-${image}`}
              initial={{
                opacity: 0,
                y: isMobile || variant === 'inline' ? 0 : 42,
                x: isMobile || variant === 'inline' ? 72 : 0,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                x: 0,
                scale: 1,
              }}
              transition={{
                delay: index * 0.08,
                type: 'spring',
                stiffness: 185,
                damping: 25,
              }}
              onClick={() => setLightboxImage(image)}
            >
              <img src={image} alt="" />
            </motion.figure>
          ))}
        </motion.div>
      </aside>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            className="image-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeLightbox}
          >
            <motion.button
              type="button"
              className="image-lightbox__close"
              aria-label="Schliessen"
              onClick={closeLightbox}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <X size={22} strokeWidth={2.4} />
            </motion.button>
            <motion.img
              src={lightboxImage}
              alt=""
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            />
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const lastAiTextRef = useRef<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const activeNode = flow[sliderNodeId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleChipClick(label: string, targetId: NodeId, fromIndex: number, displayLabel?: string) {
    const bubbleText = displayLabel || label;
    // Contact chips → navigate directly to contact node
    if (targetId.startsWith('contact-')) {
      const userMessage: Message = { id: createId('user'), type: 'user', text: bubbleText };
      const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };
      setMessages((current) => [...current, userMessage, systemMessage]);
      setSliderNodeId(targetId);
      return;
    }
    // Chips on the start node → hand off to AI
    if (fromIndex === 0) {
      const userMessage: Message = { id: createId('user'), type: 'user', text: bubbleText };
      const typingId = createId('typing');
      setMessages((current) => [...current, userMessage, { id: typingId, type: 'typing' }]);
      setAiLoading(true);
      const aiResponse = await sendMessage(label);
      lastAiTextRef.current = aiResponse.text;
      const aiMessage: Message = { id: createId('ai'), type: 'ai', text: aiResponse.text };
      setMessages((current) => current.map((m) => (m.id === typingId ? aiMessage : m)));
      setAiLoading(false);
      return;
    }
    // Other chips → static flow
    const userMessage: Message = { id: createId('user'), type: 'user', text: bubbleText };
    const systemMessage: Message = { id: createId('system'), type: 'system', nodeId: targetId };
    setMessages((current) => [...current.slice(0, fromIndex + 1), userMessage, systemMessage]);
    setSliderNodeId(targetId);
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
    const aiResponse = await sendMessage(text);
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

  async function speakText(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      setVoiceMode('speaking');
      setIsPlaying(true);
      const base64 = await generateSpeech(text);
      if (!base64) { setIsPlaying(false); setVoiceMode('idle'); resolve(); return; }
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        const binary = atob(base64);
        const view = new DataView(new ArrayBuffer(binary.length));
        for (let i = 0; i < binary.length; i++) view.setUint8(i, binary.charCodeAt(i));
        const floatData = new Float32Array(binary.length / 2);
        for (let i = 0; i < floatData.length; i++) floatData[i] = view.getInt16(i * 2, true) / 32768;
        const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
        audioBuffer.copyToChannel(floatData, 0);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => { setIsPlaying(false); setVoiceMode('idle'); resolve(); };
        sourceNodeRef.current = source;
        source.start();
      } catch { setIsPlaying(false); setVoiceMode('idle'); resolve(); }
    });
  }

  function stopVoice() {
    sourceNodeRef.current?.stop();
    sourceNodeRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsPlaying(false);
    setVoiceMode('idle');
  }

  async function handleVoiceDialog() {
    if (voiceMode !== 'idle') { stopVoice(); return; }

    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Dein Browser unterstützt keine Spracheingabe.'); return; }

    setVoiceMode('listening');
    const recognition: SpeechRecognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;
      const userMessage: Message = { id: createId('user'), type: 'user', text: spokenText };
      const typingId = createId('typing');
      const typingMessage: Message = { id: typingId, type: 'typing' };
      setMessages((current) => [...current, userMessage, typingMessage]);
      setVoiceMode('thinking');

      const aiResponse = await sendMessage(spokenText);
      lastAiTextRef.current = aiResponse.text;
      const aiMessage: Message = { id: createId('ai'), type: 'ai', text: aiResponse.text };
      setMessages((current) => current.map((m) => (m.id === typingId ? aiMessage : m)));

      await speakText(aiResponse.text);
    };

    recognition.onerror = () => setVoiceMode('idle');
    recognition.onend = () => { if (voiceMode === 'listening') setVoiceMode('idle'); };
    recognition.start();
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
                  <div key={message.id} className="user-row">
                    <motion.div className="user-bubble" {...bubbleAnim}>
                      {message.text}
                    </motion.div>
                  </div>
                );
              }

              // Sent confirmation chip
              if (message.type === 'sent') {
                return (
                  <div key={message.id} className="sent-badge-row">
                    <motion.div className="sent-badge" {...bubbleAnim}>
                      <ArrowUp size={13} strokeWidth={2.5} style={{ transform: 'rotate(45deg)' }} />
                      Anfrage versendet
                    </motion.div>
                  </div>
                );
              }

              // Typing indicator
              if (message.type === 'typing') {
                return (
                  <div key={message.id} className="system-row">
                    <div className="system-row__spacer" />
                    <div className="system-content">
                      <motion.div className="system-bubble typing-bubble" {...bubbleAnim}>
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </motion.div>
                    </div>
                  </div>
                );
              }

              // AI message
              if (message.type === 'ai') {
                return (
                  <div key={message.id} className="system-row">
                    <div className="system-row__spacer" />
                    <div className="system-content">
                      <motion.div className="system-bubble" {...bubbleAnim}>
                        {message.text}
                      </motion.div>
                    </div>
                  </div>
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

                  {!isFirst && <ImageStrip node={node} variant="inline" />}

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
        <input
          type="text"
          value={composerText}
          onChange={(event) => setComposerText(event.target.value)}
          placeholder="Schreibe etwas..."
          aria-label="Nachricht"
        />
        {composerText.trim() ? (
          <button type="submit" className="is-active" aria-label="Senden">
            <ArrowUp size={22} strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="button"
            className={voiceMode !== 'idle' ? 'is-active' : ''}
            aria-label={voiceMode === 'idle' ? 'Sprachdialog starten' : 'Stoppen'}
            onClick={handleVoiceDialog}
          >
            {voiceMode === 'idle' && <AudioLines size={20} strokeWidth={2} />}
            {voiceMode === 'listening' && <AudioWaveform size={20} strokeWidth={2} style={{ animation: 'pulse 1s ease-in-out infinite' }} />}
            {voiceMode === 'thinking' && <Loader size={20} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />}
            {voiceMode === 'speaking' && <Volume2 size={20} strokeWidth={2} />}
          </button>
        )}
      </form>

      <ImageStrip
        node={aiGalleryImages ? { ...activeNode, images: aiGalleryImages } : activeNode}
      />
    </main>
  );
}
