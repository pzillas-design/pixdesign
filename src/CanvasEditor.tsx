import { ArrowBendUpLeft, ArrowSquareOut, Copy, Plus, Trash } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';

type CanvasChip = {
  label: string;
  targetId: string;
  icon?: string;
};

type CanvasNode = {
  id: string;
  text: string;
  chips: CanvasChip[];
  images: string[];
};

type CanvasFlow = Record<string, CanvasNode>;

const storageKey = 'pix-canvas-flow-v1';
const oldStartText = 'Hallo, willkommen bei PIX. Kreative Agentur in Frankfurt fuer Websites, Apps, Fotos und Filme.';
const previousStartText = 'Willkommen bei PIX ✌️ Ich baue tolle Webseiten und mache Fotos und Videos in Frankfurt und Umgebung. Womit kann ich helfen?';
const startText = 'Willkommen bei PIX ✌️\nIch baue tolle Webseiten und mache Fotos und Videos in Frankfurt und Umgebung. Womit kann ich helfen?';

const starterFlow: CanvasFlow = {
  start: {
    id: 'start',
    text: startText,
    chips: [
      { label: 'Webdesign', targetId: 'web', icon: 'globe' },
      { label: 'Fotografie', targetId: 'photo', icon: 'camera' },
      { label: 'Videos', targetId: 'video', icon: 'film' },
    ],
    images: ['/media/detail/slider-start.png'],
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
    chips: [],
    images: ['/media/web-projects/pms/cover.webp', '/media/web-projects/leasehub/02-dahsboard.webp'],
  },
  'web-tools': {
    id: 'web-tools',
    text: 'Wenn heute noch viel in Tabellen, Mails oder Bauchgefuehl steckt, kann ein kleines Tool sehr viel Ruhe reinbringen.',
    chips: [],
    images: ['/media/web-projects/leasehub/02-dahsboard.webp', '/media/web-projects/tososto/05-karte.webp'],
  },
  'web-landing': {
    id: 'web-landing',
    text: 'Landing Pages sollten nicht viel erklaeren, sondern schnell die richtige Entscheidung leichter machen.',
    chips: [],
    images: ['/media/web-projects/600kids/cover.webp', '/media/web-projects/crewting/cover.webp'],
  },
  'photo-business': {
    id: 'photo-business',
    text: 'Bei Business-Fotos geht es meistens um Vertrauen. Nicht zu steif, nicht zu inszeniert.',
    chips: [],
    images: ['/media/foto-hd/1_business.webp', '/media/foto-hd/17_business.webp', '/media/foto-hd/28_business.jpg'],
  },
  'photo-events': {
    id: 'photo-events',
    text: 'Events brauchen Bilder, die sich spaeter noch nach dem Abend anfuehlen.',
    chips: [],
    images: ['/media/foto-hd/12_event.jpg', '/media/foto-hd/15_event.webp', '/media/foto-hd/29_event.jpg'],
  },
  'photo-realestate': {
    id: 'photo-realestate',
    text: 'Bei Immobilien wuerde ich ruhig bleiben. Klare Perspektiven, gutes Licht, kein Show-Effekt.',
    chips: [],
    images: ['/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg', '/media/foto-hd/30_architektur.jpg'],
  },
  'video-brand': {
    id: 'video-brand',
    text: 'Ein Imagefilm sollte ein Gefuehl setzen und schnell zeigen, warum es euch gibt.',
    chips: [],
    images: ['/media/detail/video-brand.webp', '/media/detail/video-story.webp', '/media/detail/video-motion.webp'],
  },
  'video-event': {
    id: 'video-event',
    text: 'Ein Eventfilm braucht Tempo, Stimmen und die kleinen Momente zwischen den Programmpunkten.',
    chips: [],
    images: ['/media/detail/video-event.webp', '/media/detail/video-konferenz.webp', '/media/foto-hd/12_event.jpg'],
  },
  'video-realestate': {
    id: 'video-realestate',
    text: 'Immobilienfilm darf ruhig sein. Ein guter Rundgang zeigt Orientierung und laesst Raeume wirken.',
    chips: [],
    images: ['/media/detail/video-drone.webp', '/media/foto-hd/2_immobilien.webp', '/media/foto-hd/7_immobilien.jpg'],
  },
};

function readInitialFlow() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return starterFlow;

  try {
    const parsed = JSON.parse(saved) as CanvasFlow;
    if (parsed.start?.text === oldStartText || parsed.start?.text === previousStartText) {
      return {
        ...parsed,
        start: {
          ...parsed.start,
          text: startText,
        },
      };
    }
    return parsed;
  } catch {
    return starterFlow;
  }
}

function createNodeId(flow: CanvasFlow, base = 'node') {
  let index = Object.keys(flow).length + 1;
  let id = `${base}-${index}`;
  while (flow[id]) {
    index += 1;
    id = `${base}-${index}`;
  }
  return id;
}

function buildParents(flow: CanvasFlow) {
  const parents = new Map<string, string>();
  Object.values(flow).forEach((node) => {
    node.chips.forEach((chip) => {
      if (!parents.has(chip.targetId)) parents.set(chip.targetId, node.id);
    });
  });
  return parents;
}

function getPathToRoot(selectedId: string, parents: Map<string, string>) {
  const path = [selectedId];
  const seen = new Set(path);
  let current = selectedId;

  while (parents.has(current)) {
    const parent = parents.get(current);
    if (!parent || seen.has(parent)) break;
    path.unshift(parent);
    seen.add(parent);
    current = parent;
  }

  return path;
}

function CanvasNodeCard({
  node,
  active,
  muted,
  onSelect,
}: {
  node: CanvasNode;
  active?: boolean;
  muted?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`canvas-node${active ? ' is-active' : ''}${muted ? ' is-muted' : ''}`}
      onClick={onSelect}
    >
      <span>{node.id}</span>
      <strong>{node.text}</strong>
      <small>{node.chips.length} Buttons · {node.images.length} Bilder</small>
    </button>
  );
}

export function CanvasEditor() {
  const [flow, setFlow] = useState<CanvasFlow>(readInitialFlow);
  const [selectedId, setSelectedId] = useState('start');
  const [exportText, setExportText] = useState('');

  const selectedNode = flow[selectedId] ?? flow.start;
  const parents = useMemo(() => buildParents(flow), [flow]);
  const pathIds = useMemo(() => getPathToRoot(selectedNode.id, parents), [parents, selectedNode.id]);
  const childIds = selectedNode.chips.map((chip) => chip.targetId).filter((id) => flow[id]);

  function commit(nextFlow: CanvasFlow) {
    setFlow(nextFlow);
    window.localStorage.setItem(storageKey, JSON.stringify(nextFlow, null, 2));
  }

  function patchSelected(patch: Partial<CanvasNode>) {
    commit({
      ...flow,
      [selectedNode.id]: {
        ...selectedNode,
        ...patch,
      },
    });
  }

  function updateChip(index: number, patch: Partial<CanvasChip>) {
    patchSelected({
      chips: selectedNode.chips.map((chip, chipIndex) => (chipIndex === index ? { ...chip, ...patch } : chip)),
    });
  }

  function removeChip(index: number) {
    patchSelected({
      chips: selectedNode.chips.filter((_, chipIndex) => chipIndex !== index),
    });
  }

  function addChild() {
    const id = createNodeId(flow, selectedNode.id);
    const nextNode: CanvasNode = {
      id,
      text: 'Neue Nachricht. Was soll hier passieren?',
      chips: [],
      images: [],
    };

    commit({
      ...flow,
      [selectedNode.id]: {
        ...selectedNode,
        chips: [...selectedNode.chips, { label: 'Neue Antwort', targetId: id }],
      },
      [id]: nextNode,
    });
    setSelectedId(id);
  }

  function copyExport() {
    const json = JSON.stringify(flow, null, 2);
    setExportText(json);
    void navigator.clipboard?.writeText(json);
  }

  function resetCanvas() {
    commit(starterFlow);
    setSelectedId('start');
    setExportText('');
  }

  return (
    <main className="canvas-app">
      <header className="canvas-header">
        <div>
          <span>PIX Canvas</span>
          <strong>Chat-Baum planen</strong>
        </div>
        <nav>
          <a href="/" aria-label="Zur Website">
            <ArrowBendUpLeft size={18} weight="bold" />
            Website
          </a>
          <button type="button" onClick={copyExport}>
            <Copy size={18} weight="bold" />
            JSON kopieren
          </button>
          <button type="button" onClick={resetCanvas}>
            Reset
          </button>
        </nav>
      </header>

      <section className="canvas-workspace">
        <div className="canvas-map" aria-label="Chat Baum">
          <div className="canvas-map__scroller">
            {pathIds.map((nodeId, index) => {
              const node = flow[nodeId];
              if (!node) return null;
              const isSelected = node.id === selectedNode.id;

              return (
                <motion.div
                  className="canvas-level"
                  key={node.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.03 }}
                >
                  {index > 0 && <div className="canvas-connector" />}
                  <CanvasNodeCard
                    node={node}
                    active={isSelected}
                    muted={!isSelected}
                    onSelect={() => setSelectedId(node.id)}
                  />
                </motion.div>
              );
            })}

            {childIds.length > 0 && (
              <div className="canvas-children">
                <div className="canvas-connector canvas-connector--split" />
                <div className="canvas-children__row">
                  {childIds.map((childId) => (
                    <CanvasNodeCard
                      key={childId}
                      node={flow[childId]}
                      onSelect={() => setSelectedId(childId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="canvas-inspector" aria-label="Node bearbeiten">
          <div className="canvas-inspector__title">
            <span>Ausgewaehlt</span>
            <strong>{selectedNode.id}</strong>
          </div>

          <label>
            Nachricht
            <textarea
              value={selectedNode.text}
              onChange={(event) => patchSelected({ text: event.target.value })}
              rows={6}
            />
          </label>

          <label>
            Bilder / Slides
            <textarea
              value={selectedNode.images.join('\n')}
              onChange={(event) =>
                patchSelected({
                  images: event.target.value
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              rows={5}
              placeholder="/media/detail/example.webp"
            />
          </label>

          <div className="canvas-fieldset">
            <div className="canvas-fieldset__head">
              <span>Buttons</span>
              <button type="button" onClick={addChild}>
                <Plus size={16} weight="bold" />
                Kind anlegen
              </button>
            </div>

            {selectedNode.chips.map((chip, index) => (
              <div className="canvas-chip-editor" key={`${chip.targetId}-${index}`}>
                <input
                  value={chip.targetId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateChip(index, { label: nextValue, targetId: nextValue });
                  }}
                  aria-label="Button Text und Ziel"
                />
                <button type="button" onClick={() => removeChip(index)} aria-label="Button entfernen">
                  <Trash size={16} weight="bold" />
                </button>
                {flow[chip.targetId] && (
                  <button type="button" onClick={() => setSelectedId(chip.targetId)} aria-label="Ziel oeffnen">
                    <ArrowSquareOut size={16} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {exportText && (
            <label>
              Export
              <textarea value={exportText} readOnly rows={7} />
            </label>
          )}
        </aside>
      </section>
    </main>
  );
}
