import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, DRINKS, type Drink } from '../data/drinks';
import { CARD_H, CARD_W, CardFront, Footnote, cardLabel } from './CardFace';

export type BagState = { seen: Set<string>; mastered: Set<string> };
export const inBag = (s: BagState, id: string) => s.seen.has(id) || s.mastered.has(id);
export const bagCount = (s: BagState) => DRINKS.filter((d) => inBag(s, d.id)).length;

const FILTERS = ['all', 'seen', 'mastered', 'still to learn'] as const;
type Filter = (typeof FILTERS)[number];
const THUMB = 0.3; // thumbnails are the card fronts scaled down

/** A round lilac button, the size and style of the arrow buttons, with a black bag on it. The counts are inside the bag. */
export function BagButton({ state, left, onClick, className = 'arrow-btn g-bag' }: { state: BagState; left?: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={className} style={left === undefined ? undefined : { left }} onClick={onClick} aria-label={`Open the bag (B): ${bagCount(state)} of ${DRINKS.length} cards`}>
      <svg width="28" height="28" viewBox="0 0 30 28" fill="none" aria-hidden="true">
        <path d="M9 10C9 3 21 3 21 10" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" />
        <path d="M3 10h24l2 15H1Z" fill="#1e1e1e" stroke="#1e1e1e" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** All 18 cards in wall order, grouped by category: face-down until she has looked at them, stamped once mastered. */
export function BagPanel({ state, onOpen, onClose, onReset, compact }: { state: BagState; onOpen: (d: Drink) => void; onClose: () => void; onReset: () => void; compact: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sure, setSure] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const calc = () => Math.min(1, (window.innerWidth * 0.94) / 980, (window.innerHeight * 0.92) / 700);
  const [fit, setFit] = useState(calc);
  useEffect(() => {
    const on = () => setFit(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus?.(); };
  }, []);

  const show = (d: Drink) =>
    filter === 'all' ? true : filter === 'seen' ? inBag(state, d.id) : filter === 'mastered' ? state.mastered.has(d.id) : !state.mastered.has(d.id);

  return createPortal(
    <div className="cc-backdrop" onClick={onClose}>
      <div className={`bag-fit${compact ? ' is-compact' : ''}`} style={{ transform: `translate(-50%, -50%) scale(${compact ? 1 : fit})` }} ref={box} role="dialog" aria-modal="true" aria-label="Your bag of coffee cards" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>bag</h2>
          <span className="bag-count">{bagCount(state)} / {DRINKS.length} seen · {state.mastered.size} mastered</span>
          <div className="bag-filters" role="group" aria-label="Filter">
            {FILTERS.map((f) => <button key={f} type="button" className="bag-filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
          <button type="button" className="btn-inline" onClick={onClose}>close</button>
        </header>

        <div className="bag-groups">
          {CATEGORIES.map((c) => {
            const cards = DRINKS.filter((d) => d.category === c && show(d));
            if (!cards.length) return null;
            return (
              <section key={c} className="bag-group">
                <h3>{c}</h3>
                <div className="bag-row">
                  {cards.map((d) => {
                    const open = inBag(state, d.id);
                    return (
                      <button key={d.id} type="button" className={`bag-card${open ? '' : ' is-down'}`} aria-label={cardLabel(d) + (open ? '' : ' (not seen yet)')} onClick={() => onOpen(d)}>
                        {open ? (
                          <span className="bag-thumb" style={{ transform: `scale(${THUMB})`, width: CARD_W, height: CARD_H }} aria-hidden="true"><CardFront drink={d} mastered={state.mastered.has(d.id)} /></span>
                        ) : (
                          <span className="bag-down" aria-hidden="true"><b>?</b><small>{d.category}</small></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!DRINKS.some(show) ? <p className="bag-empty">nothing here yet. walk the gallery, or test what you learned.</p> : null}
        </div>

        <footer>
          <small><Footnote /></small>
          <button type="button" className="reset" onClick={() => (sure ? (onReset(), setSure(false)) : setSure(true))} onBlur={() => setSure(false)}>
            {sure ? 'click again to reset progress' : 'reset progress'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
