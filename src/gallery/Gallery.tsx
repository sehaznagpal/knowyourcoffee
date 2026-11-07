import { useCallback, useEffect, useRef, useState } from 'react';
import { frames as framesArt } from '../art-loader';
import { AnimatedCharacter, type CharacterState } from '../art/character/Character';
import { LABEL } from '../data/colors';
import type { Drink } from '../data/drinks';
import { MapStrip } from './MapView';
import { Foreground, World } from './World';
import {
  CHAR_H, CHAR_W, DEAD_ZONE, DOOR_X, FEET_Y, FOREGROUND_PARALLAX, FRAMES, PROXIMITY, START_X, STAGE_W, TEST_DOOR_X, TOUR_X, WALK_SPEED,
  WORLD_W, recipeLine, type FramePlace, type Room,
} from './layout';

type Props = { scale: number; entering: boolean; active: boolean; onHome: () => void; onTest: () => void };
type Target = { kind: 'frame'; id: string } | { kind: 'door' } | { kind: 'tour' } | { kind: 'testdoor' } | null;
type Auto = { x: number; then: 'open' | 'tour' | 'none'; id?: string } | null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const STRIDE = 60; // about one step; the first-visit hint goes after three
const POINT_MS = 1100; // she points at a frame on the tour before the card opens
// the art's root svg says fill="none", which its children inherit, so it moves onto a wrapper group
const SPRITE = `<g fill="none">${framesArt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`;
const sameTarget = (a: Target, b: Target) => a === b || (!!a && !!b && a.kind === b.kind && (a.kind !== 'frame' || a.id === (b as { id: string }).id));

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
  const [tour, setTour] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [cstate, setCstate] = useState<CharacterState>('wave');
  const [facing, setFacing] = useState<1 | -1>(1);
  const [hint, setHint] = useState(true);

  const live = useRef({
    x: START_X, cx: START_X, keys: new Set<string>(), hold: 0 as -1 | 0 | 1, walked: 0, face: 1 as 1 | -1,
    waveUntil: performance.now() + 1800, pointUntil: 0, target: null as Target, cstate: 'wave' as CharacterState, hint: true,
    auto: null as Auto, tour: null as number | null, tourWait: false, openAt: 0, openId: '',
    viewW, scale, active, modal: false,
  });
  live.current.viewW = viewW;
  live.current.scale = scale;
  live.current.active = active;
  live.current.modal = !!card || mapOpen;

  // ---- actions ----
  const endTour = useCallback(() => {
    const L = live.current;
    L.tour = null; L.tourWait = false; L.auto = null;
    setTour(null); setCard(null);
  }, []);
  const goTourStop = useCallback((i: number) => {
    const L = live.current;
    L.tour = i; L.tourWait = false;
    L.auto = { x: FRAMES[i].x, then: 'tour' };
    setTour(i); setCard(null);
  }, []);
  const startTour = useCallback(() => { setMapOpen(false); goTourStop(0); }, [goTourStop]);
  const walkTo = useCallback((x: number, then: Auto = null) => { live.current.auto = then ?? { x, then: 'none' }; }, []);
  const walkToFrame = useCallback((f: FramePlace) => {
    const L = live.current;
    setMapOpen(false);
    if (Math.abs(L.x - f.x) < 8) setCard(f.drink);
    else L.auto = { x: f.x, then: 'open', id: f.id };
  }, []);
  const pickRoom = useCallback((r: Room) => { setMapOpen(false); walkTo(r.enter); }, [walkTo]);
  const look = useCallback(() => {
    const t = live.current.target;
    if (t?.kind === 'frame') setCard(FRAMES.find((f) => f.id === t.id)!.drink);
    else if (t?.kind === 'door') onHome();
    else if (t?.kind === 'tour') startTour();
    else if (t?.kind === 'testdoor') onTest();
  }, [onHome, onTest, startTour]);

  // ---- keyboard ----
  useEffect(() => {
    const L = live.current;
    const onKey = (e: KeyboardEvent) => {
      if (!L.active) return;
      if (e.key === 'Escape') {
        if (L.tour !== null) endTour();
        setCard(null); setMapOpen(false);
        return;
      }
      if (e.code === 'KeyM' && !e.repeat) { setMapOpen((o) => !o); return; }
      if (L.modal) return;
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
  }, [look, endTour]);

  // ---- world loop: walk, camera, proximity ----
  useEffect(() => {
    const L = live.current;
    const viewport = rootEl.current!.closest('.viewport') as HTMLElement | null;
    const hv0 = L.viewW / 2;
    L.cx = clamp(L.x, hv0, WORLD_W - hv0);
    let raf = 0, last = performance.now(), facingNow: 1 | -1 = 1;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const held = L.keys.has('ArrowLeft') || L.keys.has('KeyA') ? -1 : L.keys.has('ArrowRight') || L.keys.has('KeyD') ? 1 : L.hold;
      let dir: -1 | 0 | 1 = L.modal || !L.active ? 0 : held;
      let run = L.keys.has('ShiftLeft') || L.keys.has('ShiftRight');

      // walking by hand cancels an automatic walk (and the tour); otherwise she walks herself at run speed
      if (L.auto && dir) { if (L.tour !== null) { L.tour = null; L.tourWait = false; setTour(null); } L.auto = null; }
      if (L.auto && !L.modal && L.active) {
        const dx = L.auto.x - L.x;
        if (Math.abs(dx) < 6) {
          const a = L.auto;
          L.x = a.x; L.auto = null;
          if (a.then === 'open') { L.openAt = now + 220; L.openId = a.id!; }
          if (a.then === 'tour') { L.pointUntil = now + POINT_MS; L.tourWait = true; }
        } else { dir = dx > 0 ? 1 : -1; run = true; }
      }
      if (L.openId && now >= L.openAt) { const f = FRAMES.find((q) => q.id === L.openId); L.openId = ''; if (f) setCard(f.drink); }
      if (L.tourWait && L.tour !== null && now >= L.pointUntil) { L.tourWait = false; setCard(FRAMES[L.tour].drink); }

      if (dir) {
        const step = dir * WALK_SPEED * (run ? 2 : 1) * dt;
        const before = L.x;
        L.x = clamp(L.x + step, 80, WORLD_W - 80);
        if (L.x === before) L.auto = null; // walked into a wall
        L.walked += Math.abs(step);
        L.face = dir;
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
      rootEl.current!.style.setProperty('--pos', String(L.x / WORLD_W));

      // what is she standing in front of?
      let t: Target = null;
      let best = PROXIMITY;
      const consider = (d: number, tt: Target) => { if (d <= best) { best = d; t = tt; } };
      for (const f of FRAMES) consider(Math.abs(f.x - L.x), { kind: 'frame', id: f.id });
      consider(Math.abs(DOOR_X - L.x), { kind: 'door' });
      consider(Math.abs(TOUR_X - L.x), { kind: 'tour' });
      consider(Math.abs(TEST_DOOR_X - L.x), { kind: 'testdoor' });
      if (!sameTarget(L.target, t)) { L.target = t; setTarget(t); }

      // her pose
      const next: CharacterState =
        now < L.waveUntil && !dir ? 'wave'
        : now < L.pointUntil && !dir ? 'point'
        : L.modal ? 'look'
        : dir ? (run ? 'run' : 'walk')
        : L.target ? 'look' : 'idle';
      if (next !== L.cstate) { L.cstate = next; setCstate(next); }
      if (dir && L.face !== facingNow) { facingNow = L.face; setFacing(L.face); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // after a card closes, put focus back on the frame it came from
  const prevCard = useRef<Drink | null>(null);
  useEffect(() => {
    if (prevCard.current && !card) document.querySelector<HTMLElement>(`.gframe[data-id="${prevCard.current.id}"]`)?.focus();
    prevCard.current = card;
  }, [card]);

  const onHold = (d: -1 | 0 | 1) => { live.current.hold = d; };
  const recipe = card ? recipeLine(card, (i) => LABEL[i]) : '';
  const near = target && target.kind !== 'frame' ? target.kind : null;
  const miniW = 300;

  return (
    <div ref={rootEl} className={`gallery${entering ? ' g-enter' : ''}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="frames-art" viewBox="0 0 294 204" dangerouslySetInnerHTML={{ __html: SPRITE }} />
      </svg>

      <div ref={worldEl} className="g-world">
        <World activeId={target?.kind === 'frame' ? target.id : null} near={near} onOpen={walkToFrame} onTour={startTour} />
        <div ref={charEl} className="g-char" style={{ top: FEET_Y - CHAR_H, width: CHAR_W, height: CHAR_H }}>
          <AnimatedCharacter state={cstate} facing={facing} height={CHAR_H} />
        </div>
      </div>
      <div ref={fgEl} className="g-world g-fg"><Foreground /></div>

      <button type="button" className="wordmark g-wordmark" style={{ left: viewLeft + 60 }} onClick={onHome}>know your coffee</button>
      <button type="button" className="g-mini" style={{ left: viewLeft + viewW - 20 - miniW - 24 }} aria-label="Open the map (M)" onClick={() => setMapOpen(true)}>
        <MapStrip width={miniW} boxHeight={14} labelSize={10} />
      </button>
      {hint && !card && !mapOpen ? <p className="g-hint">use ← → to walk around</p> : null}

      <WalkButton dir={-1} left={viewLeft + 24} onHold={onHold} />
      <WalkButton dir={1} left={viewLeft + viewW - 24 - 56} onHold={onHold} />
      <button type="button" className="btn test-btn g-test" onClick={onTest}>test what you learned</button>

      {mapOpen ? (
        <div className="g-bigmap" role="dialog" aria-label="Map of the gallery">
          <h2>map</h2>
          <p>click a room or a frame and she walks there</p>
          <MapStrip width={860} boxHeight={72} labelSize={14} onRoom={pickRoom} onFrame={walkToFrame} />
          <button type="button" className="btn-inline" autoFocus onClick={() => setMapOpen(false)}>close</button>
        </div>
      ) : null}

      {card ? (
        <div className="look-card" role="dialog" aria-label={`${card.name}: ${recipe}`}>
          <p className="lc-note">{tour !== null ? `tour · ${tour + 1} of ${FRAMES.length}` : 'card coming in a later stage'}</p>
          <h2>{card.name}</h2>
          <span className="lc-cat">{card.category}</span>
          <p className="lc-recipe">{recipe}</p>
          <p className="lc-tip">{card.tip}</p>
          {tour !== null ? (
            <div className="lc-tour">
              {tour + 1 < FRAMES.length ? <button type="button" className="btn-primary" autoFocus onClick={() => goTourStop(tour + 1)}>NEXT</button> : null}
              <button type="button" className="btn-inline" autoFocus={tour + 1 >= FRAMES.length} onClick={endTour}>{tour + 1 < FRAMES.length ? 'end tour' : 'finish'}</button>
            </div>
          ) : (
            <button type="button" className="btn-inline" autoFocus onClick={() => setCard(null)}>close</button>
          )}
        </div>
      ) : null}
    </div>
  );
}
