import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { play } from '../audio/sound';

const KEY = 'kyc-walkthrough-seen';
export const walkthroughSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } };

const STEPS = [
  { key: 'her', text: 'this is you. use ← → or the arrows to walk. hold shift to run.', touch: 'this is you. use ← → or the arrows to walk. double-tap and hold an arrow to run.' },
  { key: 'frame', text: 'every coffee hangs here. walk up and press ↑ to look closer.' },
  { key: 'search', text: "know what you want? search and she'll take you there." },
  { key: 'map', text: 'where you are in the gallery. tap a room to jump to it.' },
  { key: 'bag', text: 'every coffee you look at is saved here as a card.' },
  { key: 'test', text: 'think you know them? build drinks in the testing room.' },
  { key: 'help', text: 'come back here anytime. proportions are typical café ratios; real cafés vary.' },
] as const;

type Box = { x: number; y: number; w: number; h: number };
const PAD = 10, NOTE_W = 300, GAP = 18;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function find(key: string): Box | null {
  let el: Element | null | undefined;
  if (key === 'frame') {
    el = [...document.querySelectorAll('.gframe')].find((e) => { const r = e.getBoundingClientRect(); return r.left > 60 && r.right < window.innerWidth - 60; });
  } else el = document.querySelector(`[data-wt="${key}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** The first-visit tour: the screen dims, a rounded spotlight shows one thing at a time, a note sits beside it. */
export function Walkthrough({ onClose, onStep, touch }: { onClose: () => void; onStep: (i: number) => void; touch: boolean }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const noteEl = useRef<HTMLDivElement>(null);
  const [noteH, setNoteH] = useState(150);
  const step = STEPS[i];

  const close = () => { markSeen(); onClose(); };
  const next = () => { play.next(); if (i + 1 < STEPS.length) setI(i + 1); else close(); };

  useEffect(() => { onStep(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  // follow the target every frame (the camera may still be moving when she has just been sent to a frame)
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const b = find(step.key);
      setBox((o) => (b && (!o || Math.abs(o.x - b.x) + Math.abs(o.y - b.y) + Math.abs(o.w - b.w) + Math.abs(o.h - b.h) > 0.5) ? b : o));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step.key]);
  useLayoutEffect(() => { if (noteEl.current) setNoteH(noteEl.current.offsetHeight); }, [i]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); next(); }
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  });

  const vw = window.innerWidth, vh = window.innerHeight;
  const sp = box ? { x: box.x - PAD, y: box.y - PAD, w: box.w + 2 * PAD, h: box.h + 2 * PAD } : null;
  // the note goes below, above, to the right or to the left, whichever has room
  let note = { left: vw / 2 - NOTE_W / 2, top: vh / 2 - noteH / 2 }, side: 'top' | 'bottom' | 'left' | 'right' | null = null, arrow = 0;
  if (sp) {
    const cx = sp.x + sp.w / 2, cy = sp.y + sp.h / 2;
    const clampX = (x: number) => Math.max(16, Math.min(vw - NOTE_W - 16, x));
    const clampY = (y: number) => Math.max(16, Math.min(vh - noteH - 16, y));
    const fits = {
      top: sp.y + sp.h + GAP + noteH < vh - 8,
      bottom: sp.y - GAP - noteH > 8,
      left: sp.x + sp.w + GAP + NOTE_W < vw - 8,
      right: sp.x - GAP - NOTE_W > 8,
    };
    // beside her and beside the frame, the note goes to the side so it never covers them
    const order = step.key === 'her' || step.key === 'frame' ? (['left', 'right', 'top', 'bottom'] as const) : (['top', 'bottom', 'left', 'right'] as const);
    side = order.find((o) => fits[o]) ?? 'top';
    if (side === 'top') { note = { left: clampX(cx - NOTE_W / 2), top: sp.y + sp.h + GAP }; arrow = cx - note.left; }
    else if (side === 'bottom') { note = { left: clampX(cx - NOTE_W / 2), top: sp.y - GAP - noteH }; arrow = cx - note.left; }
    else if (side === 'left') { note = { left: sp.x + sp.w + GAP, top: clampY(cy - noteH / 2) }; arrow = cy - note.top; }
    else { note = { left: sp.x - GAP - NOTE_W, top: clampY(cy - noteH / 2) }; arrow = cy - note.top; }
  }
  const t = reduced() ? 'none' : 'left 250ms ease, top 250ms ease, width 250ms ease, height 250ms ease';

  return createPortal(
    <div className="wt" role="dialog" aria-modal="true" aria-label="Walkthrough">
      {sp ? <div className="wt-spot" style={{ left: sp.x, top: sp.y, width: sp.w, height: sp.h, transition: t }} /> : <div className="wt-dim" />}
      <div ref={noteEl} className="wt-note" style={{ left: note.left, top: note.top, width: NOTE_W, transition: reduced() ? 'none' : 'left 250ms ease, top 250ms ease' }}>
        {side ? <i className={`wt-arrow wt-arrow-${side}`} style={side === 'top' || side === 'bottom' ? { left: Math.max(18, Math.min(NOTE_W - 18, arrow)) } : { top: Math.max(18, Math.min(noteH - 18, arrow)) }} /> : null}
        <p>{touch && 'touch' in step ? step.touch : step.text}</p>
        <div className="wt-foot">
          <span className="wt-dots">{i + 1} / {STEPS.length}</span>
          <button type="button" className="wt-skip" onClick={close}>skip</button>
          <button type="button" className="wt-next" autoFocus onClick={next}>{i + 1 < STEPS.length ? 'next' : 'done'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
