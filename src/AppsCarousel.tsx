import { PointerEvent, useEffect, useMemo, useRef } from 'react';
import { Project } from './data';

type AppsCarouselProps = {
  projects: Project[];
  onOpen: (payload: { project: Project; rect: DOMRect }) => void;
  disabled?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const CAROUSEL = {
  cylinderRadius: 960,
  cardDensity: 22,
  cardAngle: -51,
  cylinderY: 405,
  perspective: 2400,
  horizon: 90,
  stageY: 0,
  scale: 100,
};

export function AppsCarousel({ projects, onOpen, disabled = false }: AppsCarouselProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rafRef = useRef(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const dragRef = useRef({ active: false, moved: false, lastY: 0, startY: 0 });

  const cards = useMemo(() => projects.slice(0, 9), [projects]);

  useEffect(() => {
    if (disabled) {
      window.cancelAnimationFrame(rafRef.current);
      return;
    }

    const renderCards = () => {
      const progress = currentRef.current;
      const radius = Math.min(960, Math.max(220, CAROUSEL.cylinderRadius));
      const scale = CAROUSEL.scale / 100;
      const cardWidth = Math.min(window.innerWidth * 0.84, window.innerHeight * 0.76, 980) * scale;

      cards.forEach((project, index) => {
        const card = cardRefs.current[index];
        if (!card) return;

        const rel = index - progress;
        const angle = rel * CAROUSEL.cardDensity;
        const rad = (angle * Math.PI) / 180;
        const y = -Math.sin(rad) * radius + CAROUSEL.cylinderY;
        const z = Math.cos(rad) * radius - radius - 140;
        const rotateX = angle + CAROUSEL.cardAngle;
        const visible = Math.abs(angle) < 88;
        const brightness = clamp(1 - Math.abs(rel) * 0.14, 0.42, 1);
        const aspectRatio = project.aspectRatio ?? 1.47;

        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardWidth / aspectRatio}px`;
        card.style.opacity = visible ? '1' : '0';
        card.style.transform = `translate3d(-50%, calc(-50% + ${y}px), ${z}px) rotateX(${rotateX}deg)`;
        card.style.filter = `brightness(${brightness}) saturate(${clamp(1 - Math.abs(rel) * 0.04, 0.82, 1)})`;
        card.style.zIndex = String(Math.round(1000 + z));
        card.style.pointerEvents = visible ? 'auto' : 'none';
      });
    };

    const tick = () => {
      currentRef.current += (targetRef.current - currentRef.current) * 0.14;
      if (Math.abs(targetRef.current - currentRef.current) < 0.001) {
        currentRef.current = targetRef.current;
      }
      renderCards();
      rafRef.current = window.requestAnimationFrame(tick);
    };

    renderCards();
    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [cards, disabled]);

  useEffect(() => {
    if (disabled) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetRef.current = clamp(targetRef.current - event.deltaY / 360, 0, Math.max(0, cards.length - 1));
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [cards.length, disabled]);

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (!dragRef.current.active || disabled) return;
      const delta = event.clientY - dragRef.current.lastY;
      if (Math.abs(event.clientY - dragRef.current.startY) > 8) dragRef.current.moved = true;
      targetRef.current = clamp(targetRef.current + delta / 220, 0, Math.max(0, cards.length - 1));
      dragRef.current.lastY = event.clientY;
    };

    const onPointerUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      targetRef.current = Math.round(targetRef.current);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [cards.length, disabled]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    dragRef.current = { active: true, moved: false, lastY: event.clientY, startY: event.clientY };
    stageRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    targetRef.current = Math.round(targetRef.current);
    try {
      stageRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be gone after a browser gesture.
    }
  }

  return (
    <section
      ref={stageRef}
      className="apps-carousel"
      aria-label="Apps Karussell"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="apps-carousel__scene">
        <div
          className="apps-carousel__perspective"
          style={{
            perspective: `${CAROUSEL.perspective}px`,
            perspectiveOrigin: `50% ${CAROUSEL.horizon}%`,
            transform: `translateY(${CAROUSEL.stageY}px)`,
          }}
        >
        {cards.map((project, index) => (
            <button
              key={project.id}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              type="button"
              className="apps-carousel__card"
              aria-label={project.title}
              onClick={(event) => {
                if (dragRef.current.moved || disabled) return;
                onOpen({ project, rect: event.currentTarget.getBoundingClientRect() });
              }}
              onDragStart={(event) => event.preventDefault()}
            >
              <img src={project.src} alt={project.title} draggable="false" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
