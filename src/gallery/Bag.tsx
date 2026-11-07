import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DRINKS, type Category, type Drink } from '../data/drinks';
import { CARD_H, CARD_W, CardBack, CardFront, cardLabel } from './CardFace';
import { FRAMES } from './layout';

export type BagState = { seen: Set<string>; mastered: Set<string> };
export const inBag = (s: BagState, id: string) => s.seen.has(id) || s.mastered.has(id);
export const bagCount = (s: BagState) => DRINKS.filter((d) => inBag(s, d.id)).length;

const FILTERS = ['all', 'seen', 'mastered', 'still to learn'] as const;
type Filter = (typeof FILTERS)[number];
const GRID_H = 3 * 109 + 2 * 8; // the grid's height; the big card is scaled to match it exactly
const THUMB = 76 / CARD_W; // thumbnails are the card fronts scaled down
const CAT_COLOR: Record<Category, string> = { shots: '#3B2314', 'with water': '#8FE5FF', 'with drip': '#7A4A2E', 'with milk': '#C9B6CB', 'cold & sweet': '#FF6F82' };

/** A round lilac button, the size and style of the arrow buttons, with a black bag on it. The counts are inside the bag. */
export function BagButton({ state, left, onClick, className = 'arrow-btn g-bag' }: { state: BagState; left?: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={className} style={left === undefined ? undefined : { left }} onClick={onClick} data-wt="bag" aria-label={`Open the bag (B): ${bagCount(state)} of ${DRINKS.length} cards`}>
      <svg width="28" height="28" viewBox="0 0 30 28" fill="none" aria-hidden="true">
        <path d="M9 10C9 3 21 3 21 10" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" />
        <path d="M3 10h24l2 15H1Z" fill="#1e1e1e" stroke="#1e1e1e" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** The bag: the selected card large on the left (flip, prev/next, show on the wall); all 18 as small cards in wall order on the right. */
export function BagPanel({ state, onShow, onClose, onReset, compact }: { state: BagState; onShow: (d: Drink) => void; onClose: () => void; onReset: () => void; compact: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sure, setSure] = useState(false);
  const wall = FRAMES.map((f) => f.drink);
  const [sel, setSel] = useState(() => (wall.find((d) => inBag(state, d.id)) ?? wall[0]).id);
  const [flipped, setFlipped] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const calc = () => Math.min(1, (window.innerWidth * 0.96) / 980, (window.innerHeight * 0.94) / 700);
  const [fit, setFit] = useState(calc);
  useEffect(() => {
    const on = () => setFit(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const go = (d: 1 | -1) => { const i = wall.findIndex((x) => x.id === sel); setSel(wall[(i + d + wall.length) % wall.length].id); setFlipped(false); };
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key !== 'Tab' || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus?.(); };
  });

  const show = (d: Drink) =>
    filter === 'all' ? true : filter === 'seen' ? inBag(state, d.id) : filter === 'mastered' ? state.mastered.has(d.id) : !state.mastered.has(d.id);
  const cur = wall.find((d) => d.id === sel)!;
  const curOpen = inBag(state, cur.id);

  return createPortal(
    <div className="cc-backdrop" onClick={onClose}>
      <div className={`bag-fit${compact ? ' is-compact' : ''}`} style={{ transform: `translate(-50%, -50%) scale(${fit})`, '--fit': fit } as React.CSSProperties} ref={box} role="dialog" aria-modal="true" aria-label="Your bag of coffee cards" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>bag</h2>
          <div className="bag-filters" role="group" aria-label="Filter">
            {FILTERS.map((f) => <button key={f} type="button" className="bag-filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
          <button type="button" className="arrow-btn bag-x" aria-label="Close the bag" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 4l12 12M16 4 4 16" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="bag-body">
          <div className="bag-left">
            <div className="bag-bigwrap" style={{ width: Math.round(CARD_W * GRID_H / CARD_H), height: GRID_H }}>
            <div className={`cc bag-big${flipped && curOpen ? ' is-flipped' : ''}`} style={{ width: CARD_W, height: CARD_H, transform: `scale(${GRID_H / CARD_H})` }} onClick={() => curOpen && setFlipped((f) => !f)}>
              <div className="cc-flip">
                <div className="cc-face cc-front">
                  {curOpen ? <CardFront drink={cur} mastered={state.mastered.has(cur.id)} /> : <span className="bag-down bag-down-big"><b>?</b><small>not seen yet</small></span>}
                </div>
                <div className="cc-face cc-back">{curOpen ? <CardBack drink={cur} onJump={(id) => { setSel(id); setFlipped(false); }} /> : null}</div>
              </div>
            </div>
            </div>
            <div className="cc-bar bag-bar">
              <button type="button" className="arrow-btn bag-step" aria-label="Previous coffee" onClick={() => go(-1)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M13 3 6 10l7 7" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" className="btn-inline" disabled={!curOpen} onClick={() => setFlipped((f) => !f)}>{flipped ? 'front' : 'flip'}</button>
              <button type="button" className="btn-inline" onClick={() => onShow(cur)}>show on the wall</button>
              <button type="button" className="arrow-btn bag-step" aria-label="Next coffee" onClick={() => go(1)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3l7 7-7 7" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          <div className="bag-right">
            <div className="bag-grid">
              {wall.map((d) => {
                const open = inBag(state, d.id);
                return (
                  <button key={d.id} type="button" className={`bag-card${open ? '' : ' is-down'}${d.id === sel ? ' is-sel' : ''}${show(d) ? '' : ' is-dim'}`} aria-label={cardLabel(d) + (open ? '' : ' (not seen yet)')} aria-pressed={d.id === sel} onClick={() => { setSel(d.id); setFlipped(false); }}>
                    <i className="bag-strip" style={{ background: CAT_COLOR[d.category] }} />
                    {open ? (
                      <span className="bag-thumb" style={{ transform: `scale(${THUMB})`, width: CARD_W, height: CARD_H }} aria-hidden="true"><CardFront drink={d} mastered={state.mastered.has(d.id)} /></span>
                    ) : (
                      <span className="bag-down" aria-hidden="true"><b>?</b></span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="bag-rbar"><button type="button" className="bag-reset" onClick={() => (sure ? (onReset(), setSure(false)) : setSure(true))} onBlur={() => setSure(false)}>
              {sure ? 'click again to reset' : 'reset progress'}
            </button></div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
