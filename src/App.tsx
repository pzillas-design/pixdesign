import {
  X,
  Phone,
  Mail,
  Ellipsis,
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
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { CanvasEditor } from './CanvasEditor';

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
  | 'rotateccw';

type ChatNode = {
  id: NodeId;
  text: string;
  chips?: Array<{ label: string; targetId: NodeId; icon?: IconName }>;
  images: string[];
  imageMode?: 'logo' | 'gallery';
};

type Message =
  | { id: string; type: 'system'; nodeId: NodeId }
  | { id: string; type: 'user'; text: string };

const flow: Record<NodeId, ChatNode> = {
  start: {
    id: 'start',
    text: 'Willkommen bei PIX ✌️\nIch baue tolle Webseiten und mache Fotos und Videos in Frankfurt und Umgebung. Womit kann ich helfen?',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Fotografie', targetId: 'photo', icon: 'camera' },
      { label: 'Videos', targetId: 'video', icon: 'film' },
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
    text: 'Klar. Am schnellsten ist ein kurzer Call. Erzaehl in zwei Saetzen, worum es geht, dann schauen wir gemeinsam, ob und wie PIX helfen kann.',
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Fotografie', targetId: 'photo', icon: 'camera' },
      { label: 'Videos', targetId: 'video', icon: 'film' },
    ],
    images: ['/media/detail/portrait.webp', '/media/detail/konferenz-foto.webp'],
  },
  'contact-mail': {
    id: 'contact-mail',
    text: 'Schick uns gern eine kurze Mail mit Ziel, Zeitraum und ein paar Bildern oder Links. Wir sortieren das und melden uns mit einer klaren Rueckfrage.',
    chips: [
      { label: 'Beispiele', targetId: 'web', icon: 'briefcase' },
      { label: 'Fotos', targetId: 'photo', icon: 'camera' },
      { label: 'Filme', targetId: 'video', icon: 'film' },
    ],
    images: ['/media/detail/booking.webp', '/media/detail/interface.webp'],
  },
  'contact-more': {
    id: 'contact-more',
    text: 'Du kannst dich einfach treiben lassen: Arbeiten ansehen, eine Richtung waehlen oder direkt ein Projekt erzaehlen. Der Chat fuehrt dich durch.',
    chips: [
      { label: 'Website', targetId: 'web', icon: 'globe' },
      { label: 'Fotos', targetId: 'photo', icon: 'camera' },
      { label: 'Videos', targetId: 'video', icon: 'film' },
    ],
    images: ['/media/detail/slider-start.png', '/media/detail/system.webp'],
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

  const [messages, setMessages] = useState<Message[]>([{ id: 'system-start', type: 'system', nodeId: 'start' }]);
  const [sliderNodeId, setSliderNodeId] = useState<NodeId>('start');
  const [composerText, setComposerText] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeNode = flow[sliderNodeId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleChipClick(label: string, targetId: NodeId, fromIndex: number) {
    const userMessage: Message = { id: createId('user'), type: 'user', text: label };
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

  function handleComposerSubmit() {
    const text = composerText.trim();
    if (!text) return;
    const userMessage: Message = { id: createId('user'), type: 'user', text };
    setMessages((current) => [...current, userMessage]);
    setComposerText('');
  }

  return (
    <main className={`portfolio-chat theme-${timeTheme}`}>
      <section ref={scrollRef} className="chat-scroll" aria-label="PIX Portfolio Chat">
        <div className="chat-stack">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              if (message.type === 'user') return null;

              const node = flow[message.nodeId];
              // Previous user message → shown at TOP of this section
              const prevMsg = messages[index - 1];
              const prevUserMsg = prevMsg?.type === 'user' ? prevMsg : null;
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
                  {/* Previous answer visible at top of this section */}
                  {prevUserMsg && (
                    <motion.div
                      key={prevUserMsg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="user-row"
                    >
                      <div className="user-bubble">{prevUserMsg.text}</div>
                    </motion.div>
                  )}

                  {/* Spacer or logo pushes question to bottom */}
                  {isFirst ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="chat-logo"
                    >
                      <img src="/pix-logo.svg" alt="PIX" />
                      <div className="chat-logo__actions" aria-label="Kontakt">
                        <button type="button" aria-label="Anrufen" onClick={() => dropHeaderMessage('Anrufen', 'contact-call')}>
                          <Phone size={24} strokeWidth={1.8} />
                        </button>
                        <button type="button" aria-label="Mail schreiben" onClick={() => dropHeaderMessage('Mail', 'contact-mail')}>
                          <Mail size={24} strokeWidth={1.8} />
                        </button>
                        <button type="button" aria-label="Mehr" onClick={() => dropHeaderMessage('Mehr', 'contact-more')}>
                          <Ellipsis size={26} strokeWidth={1.8} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="system-row__spacer" />
                  )}

                  {!isFirst && <ImageStrip node={node} variant="inline" />}

                  <div className="system-content">
                    <div className="system-bubble">
                      <div>{node.text}</div>
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
                            key={chip.label}
                            type="button"
                            onClick={() => handleChipClick(chip.label, chip.targetId, index)}
                            className={`chip-button chip-button--${chipIndex % 4}${selectedChip === chip.label ? ' chip-button--active' : ''}`}
                          >
                            {chip.icon && <span className="chip-icon">{getIconComponent(chip.icon)}</span>}
                            <span>{chip.label}</span>
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

          <form className="chat-composer" aria-label="Nachricht schreiben" onSubmit={(event) => { event.preventDefault(); handleComposerSubmit(); }}>
            <input
              type="text"
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              placeholder="Schreibe etwas..."
              aria-label="Nachricht"
            />
            {composerText.trim() ? (
              <button
                type="submit"
                className="is-active"
                aria-label="Senden"
              >
                <ArrowUp size={22} strokeWidth={2.2} />
              </button>
            ) : (
              <button
                type="button"
                className={voiceActive ? 'is-active' : ''}
                aria-label="Spracheingabe starten"
                aria-pressed={voiceActive}
                onClick={() => setVoiceActive((current) => !current)}
              >
                <AudioWaveform size={24} strokeWidth={1.8} />
              </button>
            )}
          </form>
        </div>
      </section>

      <ImageStrip node={activeNode} />
    </main>
  );
}
