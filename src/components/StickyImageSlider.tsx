import { AnimatePresence, motion } from 'motion/react';
import { useState, useRef } from 'react';

type StickyImageSliderProps = {
  images: string[];
  activeIndex: number;
  direction: number;
  mode?: 'logo' | 'gallery';
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
};

export function StickyImageSlider({
  images,
  activeIndex,
  direction,
  mode = 'gallery',
  onPrevious,
  onNext,
  onSelect,
}: StickyImageSliderProps) {
  const touchStartRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (images.length === 0) return null;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = e.touches[0]?.clientX ?? null;
    touchMovedRef.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartRef.current === null) return;
    const diff = Math.abs(touchStartRef.current - (e.touches[0]?.clientX ?? 0));
    if (diff > 10) touchMovedRef.current = true;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0]?.clientX ?? null;
    if (touchEnd === null) return;

    const diff = touchStartRef.current - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) onNext();
      else onPrevious();
    } else if (!touchMovedRef.current) {
      // tap without swipe → lightbox
      setLightboxSrc(images[activeIndex]);
    }

    touchStartRef.current = null;
    touchMovedRef.current = false;
  }

  if (mode === 'logo') {
    return (
      <div className="image-stage image-stage--logo">
        <motion.img
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt=""
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
        />
      </div>
    );
  }

  const nextIndex = (activeIndex + 1) % images.length;

  return (
    <>
      <div className="image-stage">
        <div className="slider-shell">
          <motion.div
            key={`${activeIndex}-${images[activeIndex]}`}
            className="slider-main"
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80, scale: 0.94, rotateY: direction > 0 ? -7 : 7 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 190, damping: 26, mass: 0.9 }}
            style={{ transformPerspective: 1200, cursor: 'zoom-in' }}
            onClick={() => setLightboxSrc(images[activeIndex])}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={images[activeIndex]} alt="" />
          </motion.div>

          {images.length > 1 && (
            <motion.button
              type="button"
              onClick={onNext}
              className="slider-preview slider-preview--right"
              whileHover={{ width: 144, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <img src={images[nextIndex]} alt="" />
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxSrc(null)}
          >
            <motion.img
              src={lightboxSrc}
              alt=""
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
