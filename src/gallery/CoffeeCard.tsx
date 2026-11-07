import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Drink } from '../data/drinks';
import { CARD_H, CARD_W, CardBack, CardFront, cardLabel } from './CardFace';
import { firstOpen } from './saved';

type Tour = { i: number; total: number; onNext: () => void; onEnd: () => void };
type Props = {
  drink: Drink;
  mastered: boolean;
  tour: Tour | null;
  onClose: () => void;
  onNav: (delta: 1 | -1) => void;
  onJump: (id: string) => void;
  onShow: () => void;
  compact: boolean;
};

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useFit(compact: boolean) {
  // phone: the card takes about 90% of the screen height and the buttons stand beside it
  const calc = () => compact
    ? Math.min(1.15, (window.innerHeight * 0.9) / CARD_H, (window.innerWidth * 0.96) / (CARD_W + 450))
    : Math.min(1.15, (window.innerHeight * 0.84) / (CARD_H + 64), (window.innerWidth * 0.9) / (CARD_W + 170));
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

/** A coffee card, centred over a dimmed wall: flips front to back (click or Space), prev/next along the wall, swipe on touch. */
export function CoffeeCard({ drink, mastered, tour, onClose, onNav, onJump, onShow, compact }: Props) {
  const [flipped, setFlipped] = useState(false);
  const fit = useFit(compact);
  const box = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);
  useEffect(() => setFlipped(false), [drink.id]);
  // the first time a card is ever opened it flips by itself after 4 s, unless it has been flipped already
  const userFlipped = useRef(false);
  useEffect(() => {
    userFlipped.current = false;
    if (!firstOpen(drink.id)) return;
    const t = window.setTimeout(() => { if (!userFlipped.current) setFlipped(true); }, 4000);
    return () => clearTimeout(t);
  }, [drink.id]);
  const flip = () => { userFlipped.current = true; setFlipped((f) => !f); };

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (e: KeyboardEvent) => {
      const onButton = !!(e.target as Element).closest?.('button');
      if (e.code === 'Space' && !onButton) { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowRight' && !tour) { e.preventDefault(); onNav(1); }
      else if (e.key === 'ArrowLeft' && !tour) { e.preventDefault(); onNav(-1); }
      else if (e.key === 'Tab' && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onNav, tour]);

  return createPortal(
    <div className="cc-backdrop" onClick={onClose}>
      <div
        className={`cc-fit${compact ? ' is-compact' : ''}`}
        style={{ transform: `translate(-50%, -50%) scale(${fit})`, '--fit': fit } as React.CSSProperties}
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={cardLabel(drink)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {!tour ? (
          <>
            <button type="button" className="arrow-btn cc-arrow cc-prev" aria-label="Previous coffee" onClick={() => onNav(-1)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M13 3 6 10l7 7" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="arrow-btn cc-arrow cc-next" aria-label="Next coffee" onClick={() => onNav(1)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3l7 7-7 7" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        ) : null}

        <div
          className={`cc${flipped ? ' is-flipped' : ''}`}
          style={{ width: CARD_W, height: CARD_H }}
          onClick={(e) => { if (!(e.target as Element).closest('button')) flip(); }}
          onPointerDown={(e) => { if (e.pointerType === 'touch') swipe.current = e.clientX; }}
          onPointerUp={(e) => {
            if (swipe.current === null || tour) return;
            const dx = e.clientX - swipe.current;
            swipe.current = null;
            if (Math.abs(dx) > 60) onNav(dx < 0 ? 1 : -1);
          }}
        >
          <div className="cc-flip">
            <div className="cc-face cc-front" aria-hidden={flipped}><CardFront drink={drink} mastered={mastered} /></div>
            <div className="cc-face cc-back" aria-hidden={!flipped}><CardBack drink={drink} onJump={onJump} /></div>
          </div>
        </div>

        <div className="cc-bar">
          <button type="button" className="btn-primary cc-flipbtn" onClick={flip}>{flipped ? 'front' : 'flip'}</button>
          {tour ? (
            <>
              {tour.i + 1 < tour.total ? <button type="button" className="btn-inline" onClick={tour.onNext}>next stop</button> : null}
              <button type="button" className="btn-inline" onClick={tour.onEnd}>{tour.i + 1 < tour.total ? 'end tour' : 'finish'}</button>
              <span className="cc-count">{tour.i + 1} of {tour.total}</span>
            </>
          ) : (
            <>
              <button type="button" className="btn-inline" onClick={onShow}>show on the wall</button>
              <button type="button" className="btn-inline" onClick={onClose}>close</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
