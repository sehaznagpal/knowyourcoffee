import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedCharacter, type CharacterState } from '../art/character/Character';
import { LABEL } from '../data/colors';
import type { Drink } from '../data/drinks';
import { Foreground, World } from './World';
import {
  CHAR_H, CHAR_W, DEAD_ZONE, DOOR_X, FEET_Y, FOREGROUND_PARALLAX, FRAMES, PROXIMITY, START_X, STAGE_W, WALK_SPEED, WORLD_W,
  recipeLine, type FramePlace,
} from './layout';

type Props = { scale: number; entering: boolean; active: boolean; onHome: () => void; onTest: () => void };
type Target = { kind: 'frame'; id: string } | { kind: 'door' } | null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const STRIDE = 60; // about one step; the first-visit hint goes after three

function WalkButton({ dir, left, onHold }: { dir: -1 | 1; left: number; onHold: (d: -1 | 0 | 1) => void }) {
  return (
    <button
      type="button"
      className="arrow-btn walk-btn"
      style={{ left, top: 748 }}
      aria-label={dir < 0 ? 'Walk left (hold)' : 'Walk right (hold)'}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onHold(dir); }}
      onPointerUp={() => onHold(0)}
      onPointerCancel={() => onHold(0)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHold(dir); } }}
      onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') onHold(0); }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d={dir < 0 ? 'M13 3 6 10l7 7' : 'M7 3l7 7-7 7'} stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function Gallery({ scale, entering, active, onHome, onTest }: Props) {
  const rootEl = useRef<HTMLDivElement>(null);
  const worldEl = useRef<HTMLDivElement>(null);
  const fgEl = useRef<HTMLDivElement>(null);
  const charEl = useRef<HTMLDivElement>(null);

  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const viewW = vw / scale; // visible width in stage px
  const viewLeft = (STAGE_W - viewW) / 2;

  const [target, setTarget] = useState<Target>(null);
  const [card, setCard] = useState<Drink | null>(null);
  const [cstate, setCstate] = useState<CharacterState>('wave');
  const [facing, setFacing] = useState<1 | -1>(1);
  const [hint, setHint] = useState(true);

  const live = useRef({
    x: START_X, cx: START_X, keys: new Set<string>(), hold: 0 as -1 | 0 | 1, walked: 0, face: 1 as 1 | -1,
    waveUntil: performance.now() + 1800, target: null as Target, cstate: 'wave' as CharacterState, hint: true,
    viewW, scale, active, card: null as Drink | null,
  });
  live.current.viewW = viewW;
  live.current.scale = scale;
  live.current.active = active;
  live.current.card = card;

  const look = useCallback(() => {
    const t = live.current.target;
    if (t?.kind === 'frame') setCard(FRAMES.find((f) => f.id === t.id)!.drink);
    else if (t?.kind === 'door') onHome();
  }, [onHome]);
  const openFrame = useCallback((f: FramePlace) => setCard(f.drink), []);

  // keyboard
  useEffect(() => {
    const L = live.current;
    const onKey = (e: KeyboardEvent) => {
      if (!L.active) return;
      if (e.key === 'Escape') { setCard(null); return; }
      if (L.card) return;
      const k = e.code;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(k)) {
        if (k.startsWith('Arrow')) e.preventDefault();
        L.keys.add(k);
      } else if (k === 'ArrowUp' || k === 'KeyW' || (k === 'Enter' && !(e.target as Element).closest?.('button,[role=button]'))) {
        e.preventDefault();
        look();
      }
    };
    const onUp = (e: KeyboardEvent) => { L.keys.delete(e.code); };
    const onBlur = () => L.keys.clear();
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', onBlur); };
  }, [look]);

  // world loop: walk, camera, proximity
  useEffect(() => {
    const L = live.current;
    const viewport = rootEl.current!.closest('.viewport') as HTMLElement | null;
    const hv0 = L.viewW / 2;
    L.cx = clamp(L.x, hv0, WORLD_W - hv0);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const holding = L.keys.has('ArrowLeft') || L.keys.has('KeyA') ? -1 : L.keys.has('ArrowRight') || L.keys.has('KeyD') ? 1 : L.hold;
      const dir = L.card || !L.active ? 0 : holding;
      const run = L.keys.has('ShiftLeft') || L.keys.has('ShiftRight');
      if (dir) {
        const step = dir * WALK_SPEED * (run ? 2 : 1) * dt;
        L.x = clamp(L.x + step, 80, WORLD_W - 80);
        L.walked += Math.abs(step);
        L.face = dir as 1 | -1;
        if (L.hint && L.walked > STRIDE * 3) { L.hint = false; setHint(false); }
      }

      // camera: dead zone, then smooth catch-up (about 150 ms); reduced motion jumps
      const hv = L.viewW / 2, dz = (L.viewW * DEAD_ZONE) / 2;
      const off = L.x - L.cx;
      const goal = off > dz ? L.x - dz : off < -dz ? L.x + dz : L.cx;
      L.cx = clamp(reduced() ? goal : L.cx + (goal - L.cx) * (1 - Math.exp(-dt / 0.05)), hv, WORLD_W - hv);

      worldEl.current!.style.transform = `translate3d(${STAGE_W / 2 - L.cx}px,0,0)`;
      fgEl.current!.style.transform = `translate3d(${STAGE_W / 2 - L.cx * FOREGROUND_PARALLAX}px,0,0)`;
      charEl.current!.style.transform = `translate3d(${L.x - CHAR_W / 2}px,0,0)`;
      viewport?.style.setProperty('--cam', `${(L.cx - STAGE_W / 2) * L.scale}px`);

      // what is she standing in front of?
      let t: Target = null;
      let best = PROXIMITY;
      for (const f of FRAMES) {
        const d = Math.abs(f.x - L.x);
        if (d <= best) { best = d; t = { kind: 'frame', id: f.id }; }
      }
      if (!t && Math.abs(DOOR_X - L.x) <= PROXIMITY) t = { kind: 'door' };
      const same = (a: Target, b: Target) => (a === null ? b === null : b !== null && a.kind === b.kind && (a.kind !== 'frame' || (b as { id?: string }).id === a.id));
      if (!same(L.target, t)) { L.target = t; setTarget(t); }

      // her pose
      const next: CharacterState =
        now < L.waveUntil && !dir ? 'wave' : L.card ? 'look' : dir ? (run ? 'run' : 'walk') : L.target ? 'look' : 'idle';
      if (next !== L.cstate) { L.cstate = next; setCstate(next); }
      if (dir && L.face !== facingRef.current) { facingRef.current = L.face; setFacing(L.face); }
      raf = requestAnimationFrame(loop);
    };
    const facingRef = { current: 1 as 1 | -1 };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // after the card closes, put focus back on the frame it was opened from
  const prevCard = useRef<Drink | null>(null);
  useEffect(() => {
    if (prevCard.current && !card) document.querySelector<HTMLElement>(`.gframe[data-id="${prevCard.current.id}"]`)?.focus();
    prevCard.current = card;
  }, [card]);

  const onHold = (d: -1 | 0 | 1) => { live.current.hold = d; };
  const recipe = card ? recipeLine(card, (i) => LABEL[i]) : '';

  return (
    <div ref={rootEl} className={`gallery${entering ? ' g-enter' : ''}`}>
      <div ref={worldEl} className="g-world">
        <World activeId={target?.kind === 'frame' ? target.id : null} doorActive={target?.kind === 'door'} onOpen={openFrame} />
        <div ref={charEl} className="g-char" style={{ top: FEET_Y - CHAR_H, width: CHAR_W, height: CHAR_H }}>
          <AnimatedCharacter state={cstate} facing={facing} height={CHAR_H} />
        </div>
      </div>
      <div ref={fgEl} className="g-world g-fg"><Foreground /></div>

      <button type="button" className="wordmark g-wordmark" style={{ left: viewLeft + 60 }} onClick={onHome}>know your coffee</button>
      {hint && !card ? <p className="g-hint">use ← → to walk around</p> : null}

      <WalkButton dir={-1} left={viewLeft + 24} onHold={onHold} />
      <WalkButton dir={1} left={viewLeft + viewW - 24 - 56} onHold={onHold} />
      <button type="button" className="btn test-btn g-test" onClick={onTest}>test what you learned</button>

      {card ? (
        <div className="look-card" role="dialog" aria-label={`${card.name}: ${recipe}`}>
          <p className="lc-note">card coming in a later stage</p>
          <h2>{card.name}</h2>
          <span className="lc-cat">{card.category}</span>
          <p className="lc-recipe">{recipe}</p>
          <p className="lc-tip">{card.tip}</p>
          <button type="button" className="btn-inline" autoFocus onClick={() => setCard(null)}>close</button>
        </div>
      ) : null}
    </div>
  );
}
