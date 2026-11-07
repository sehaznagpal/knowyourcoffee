import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { frames as framesArt } from '../art-loader';
import { AnimatedCharacter, type CharacterState } from '../art/character/Character';
import type { Drink } from '../data/drinks';
import { sketch } from '../art/character/sketch';
import { clearSeenAndTour, getTourAt, markSeen, seenIds, setTourAt } from './saved';
import { BagButton, BagPanel, bagCount, type BagState } from './Bag';
import { DRINKS } from '../data/drinks';
import { CoffeeCard } from './CoffeeCard';
import { loadProgress, resetProgress } from '../logic/storage';
import { MapStrip } from './MapView';
import { SearchBox, type SearchHandle } from './SearchBox';
import { TestingRoom } from './Room';
import { useCompact } from './compact';
import { PhoneUI } from './PhoneUI';
import { Walkthrough, walkthroughSeen } from './Walkthrough';
import { SpeakerIcon } from './SpeakerIcon';
import { armGestureUnlock, play, setDuck, toggleMuted, useMuted } from '../audio/sound';
import { Foreground, World } from './World';
import {
  CHAR_H, CHAR_W, DEAD_ZONE, DOOR_X, FEET_Y, FOREGROUND_PARALLAX, FRAMES, FRAME_PITCH, PROXIMITY, ROOMS, START_X, STAGE_W, TEST_DOOR_X, TOUR_X,
  WALK_SPEED, WORLD_W, frameIndex, placeFor, rng, type FramePlace,
} from './layout';

type Props = { scale: number; entering: boolean; active: boolean; onHome: () => void; onTest: () => void };
type Target = { kind: 'frame'; id: string } | { kind: 'door' } | { kind: 'tour' } | { kind: 'testdoor' } | null;
type Auto = { x: number; then: 'open' | 'tour' | 'point' | 'none'; id?: string } | null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const STRIDE = 60; // about one step; the first-visit hint goes after three
const ROOM_CHAR_X = 230; // where she stands in the testing room (stage px)
const POINT_MS = 1100; // she points at a frame on the tour before the card opens
// the art's root svg says fill="none", which its children inherit, so it moves onto a wrapper group
const SPRITE = `<g fill="none">${framesArt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`;
// phase lengths in ms; the sum is a little under 1.1 s so frame timing keeps the whole teleport within it
const TP = { turn: 85, out: 330, pan: 285, in: 330 };
const roomOf = (x: number) => ROOMS.findIndex((r) => x >= r.x0 && x < r.x1);

// Horizontal wobble lines that streak across the screen while the camera pans in a teleport (no CSS blur).
const MOTION_LINES = (() => {
  const r = rng(11);
  return Array.from({ length: 16 }, (_, i) => {
    const y = 70 + r() * 700, x = r() * 3800, len = 300 + r() * 600;
    return { d: sketch([[x, y], [x + len, y + (r() - 0.5) * 6]], { closed: false, seed: i + 1, jitter: 3, step: 60 }), floor: y > 540 };
  });
})();
function MotionLines() {
  return (
    <svg className="g-motion" width="4480" height="832" viewBox="0 0 4480 832" aria-hidden="true">
      {MOTION_LINES.map((l, i) => <path key={i} d={l.d} fill="none" stroke={l.floor ? '#1e1e1e' : '#f4f0e4'} strokeWidth={3} strokeLinecap="round" />)}
    </svg>
  );
}

type Teleport = { room?: 'enter' | 'leave'; phase: 'turn' | 'out' | 'pan' | 'in' | 'paper'; t0: number; start: number; x: number; frame?: string; point?: boolean; fromCx: number; toCx: number; wipe: boolean; jumped: boolean };
const sameTarget = (a: Target, b: Target) => a === b || (!!a && !!b && a.kind === b.kind && (a.kind !== 'frame' || a.id === (b as { id: string }).id));

function WalkButton({ dir, left, onHold }: { dir: -1 | 1; left: number; onHold: (d: -1 | 0 | 1, run?: boolean) => void }) {
  return (
    <button
      type="button"
      className="arrow-btn walk-btn"
      style={{ left, top: 748 }}
      title="walk · shift to run"
      aria-label={dir < 0 ? 'Walk left (hold; shift to run)' : 'Walk right (hold; shift to run)'}
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

export function Gallery({ scale, entering, active, onHome }: Props) {
  const rootEl = useRef<HTMLDivElement>(null);
  const worldEl = useRef<HTMLDivElement>(null);
  const fgEl = useRef<HTMLDivElement>(null);
  const charEl = useRef<HTMLDivElement>(null);
  const charInner = useRef<HTMLDivElement>(null);
  const topEl = useRef<HTMLDivElement>(null); // her own layer: above the world and the foreground, below the HUD
  const gridEl = useRef<HTMLDivElement>(null);
  const [vpEl, setVpEl] = useState<HTMLElement | null>(null);
  useEffect(() => setVpEl(rootEl.current!.closest('.viewport')), []);
  const compact = useCompact();
  // she stands about 38% of the screen height on a desktop and about 45% on a phone held sideways
  const charH = compact ? 374 : CHAR_H;
  const charW = Math.round((charH * 309) / 772);
  const feetY = compact ? 760 : FEET_Y;
  const startInRoom = useRef(new URLSearchParams(window.location.search).get('test') === '1');

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
  const [bagOpen, setBagOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const soundOff = useMuted();
  const helpFrom = useRef<number | null>(null); // where she was when the walkthrough opened, so she can go back
  const [, setVer] = useState(0);
  const [tourSaved, setTourSaved] = useState<number | null>(getTourAt());
  const fromBag = useRef(false);
  const [cstate, setCstate] = useState<CharacterState>('wave');
  const [facing, setFacing] = useState<1 | -1>(1);
  const [hint, setHint] = useState(!startInRoom.current);
  const [inRoom, setInRoom] = useState(startInRoom.current);
  const [blur, setBlur] = useState(0); // key of the current streak overlay
  const [paper, setPaper] = useState(0); // key of the current paper wipe
  const searchRef = useRef<SearchHandle>(null);

  const live = useRef({
    x: START_X, cx: START_X, keys: new Set<string>(), hold: 0 as -1 | 0 | 1, walked: 0, face: 1 as 1 | -1,
    waveUntil: startInRoom.current ? 0 : performance.now() + 1800, pointUntil: 0, target: null as Target, cstate: 'wave' as CharacterState, hint: true,
    tp: null as Teleport | null, auto: null as Auto, tour: null as number | null, tourWait: false, openAt: 0, openId: '',
    queued: null as 'enter' | 'leave' | null, viewW, scale, active, modal: false, bag: false, card: false, mapOpen: false, charW, holdRun: false,
    room: startInRoom.current, returnX: START_X, mood: 'order' as 'order' | 'cheer' | 'idle',
  });
  live.current.viewW = viewW;
  live.current.charW = charW;
  live.current.scale = scale;
  live.current.active = active;
  live.current.modal = !!card || mapOpen || bagOpen || help;
  live.current.bag = bagOpen; live.current.card = !!card; live.current.mapOpen = mapOpen;
  const bagState: BagState = { seen: new Set(seenIds()), mastered: new Set(loadProgress().built) };

  // ---- actions ----
  const endTour = useCallback(() => {
    const L = live.current;
    L.tour = null; L.tourWait = false; L.auto = null;
    setTour(null); setCard(null);
  }, []);
  const finishTour = useCallback(() => { setTourAt(null); setTourSaved(null); endTour(); }, [endTour]);
  const goTourStop = useCallback((i: number) => {
    const L = live.current;
    L.tour = i; L.tourWait = false;
    L.auto = { x: FRAMES[i].x, then: 'tour' };
    setTourAt(i); setTourSaved(i);
    setTour(i); setCard(null);
  }, []);
  const startTour = useCallback(() => {
    setMapOpen(false); setBagOpen(false);
    const at = getTourAt();
    goTourStop(at !== null && at >= 0 && at < FRAMES.length ? at : 0);
  }, [goTourStop]);
  // Getting somewhere: close by (in view, or within 2 frames) she runs there; far away she teleports (about 1.1 s).
  const goTo = useCallback((x: number, f?: FramePlace, openCard = true) => {
    const L = live.current;
    if (L.tp) return;
    if (L.tour !== null) { L.tour = null; L.tourWait = false; setTour(null); }
    setMapOpen(false); setBagOpen(false); setCard(null); fromBag.current = false;
    const dest = clamp(x, 80, WORLD_W - 80);
    const visible = Math.abs(dest - L.cx) < L.viewW / 2 - 100;
    if (visible || Math.abs(dest - L.x) <= 2 * FRAME_PITCH) {
      if (f && Math.abs(L.x - dest) < 8) { const now = performance.now(); L.pointUntil = now + (openCard ? 220 : 700); if (openCard) { L.openAt = now + 220; L.openId = f.id; } }
      else L.auto = { x: dest, then: f ? (openCard ? 'open' : 'point') : 'none', id: f?.id };
      return;
    }
    const now = performance.now();
    const rm = reduced();
    L.tp = { phase: rm ? 'paper' : 'turn', t0: now, start: now, x: dest, frame: openCard ? f?.id : undefined, point: !!f && !openCard, fromCx: L.cx, toCx: 0, wipe: Math.abs(roomOf(dest) - roomOf(L.x)) > 3, jumped: false };
    if (rm) setPaper((k) => k + 1);
    play.teleportOut();
  }, []);
  const walkToFrame = useCallback((f: FramePlace) => goTo(f.x, f), [goTo]);
  // Into the testing room and back: the same teleport, with a paper wipe hiding the change of scene.
  const goRoom = useCallback((enter: boolean) => {
    const L = live.current;
    if (L.tp) { L.queued = enter ? 'enter' : 'leave'; return; } // asked for mid-teleport: do it as soon as she has arrived
    if (L.room === enter) return;
    if (L.tour !== null) { L.tour = null; L.tourWait = false; setTour(null); }
    setMapOpen(false); setBagOpen(false); setCard(null); fromBag.current = false; L.auto = null;
    if (enter) L.returnX = L.x;
    const now = performance.now();
    const rm = reduced();
    L.tp = { room: enter ? 'enter' : 'leave', phase: rm ? 'paper' : 'turn', t0: now, start: now, x: enter ? L.x : L.returnX, fromCx: L.cx, toCx: 0, wipe: true, jumped: false };
    if (rm) setPaper((k) => k + 1);
    play.teleportOut();
  }, []);
  const bounce = useCallback(() => {
    charInner.current?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0)' }],
      { duration: 520, easing: 'ease-out' },
    );
  }, []);
  const look = useCallback(() => {
    const t = live.current.target;
    if (t?.kind === 'frame') setCard(FRAMES.find((f) => f.id === t.id)!.drink);
    else if (t?.kind === 'door') { play.door(); onHome(); }
    else if (t?.kind === 'tour') startTour();
    else if (t?.kind === 'testdoor') { play.door(); goRoom(true); }
  }, [onHome, goRoom, startTour]);

  // ---- keyboard ----
  useEffect(() => {
    const L = live.current;
    const onKey = (e: KeyboardEvent) => {
      if (!L.active) return;
      if ((e.target as Element).closest?.('input')) return; // typing in the search box
      if (e.code === 'KeyS' && !e.repeat && !e.ctrlKey && !e.metaKey) { toggleMuted(); return; }
      if (e.key === '/' && !L.modal) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'Escape') {
        if (L.tour !== null) endTour();
        setCard(null); setMapOpen(false); setBagOpen(false);
        return;
      }
      if (e.code === 'KeyM' && !e.repeat && !L.bag && !L.room) { setMapOpen((o) => !o); return; }
      if (e.code === 'KeyB' && !e.repeat && !L.card && !L.mapOpen) { setBagOpen((o) => !o); return; }
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
    const hv0 = L.viewW / 2;
    L.cx = clamp(L.x, hv0, WORLD_W - hv0);
    let raf = 0, last = performance.now(), facingNow: 1 | -1 = 1;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const held = L.keys.has('ArrowLeft') || L.keys.has('KeyA') ? -1 : L.keys.has('ArrowRight') || L.keys.has('KeyD') ? 1 : L.hold;
      const hv = L.viewW / 2;
      let dir: -1 | 0 | 1 = L.modal || !L.active || L.tp || L.room ? 0 : held;
      let run = L.keys.has('ShiftLeft') || L.keys.has('ShiftRight') || (L.hold !== 0 && L.holdRun);

      // walking by hand cancels an automatic walk (and the tour); otherwise she walks herself at run speed
      // teleport: turn (100 ms), erase feet to head (350), camera pan or paper wipe (300), redraw head to feet (350)
      let tpCam = false;
      const applyRoom = (T: Teleport) => {
        if (T.room === 'enter') { L.room = true; setInRoom(true); }
        else if (T.room === 'leave') { L.room = false; setInRoom(false); L.x = T.x; L.cx = clamp(T.x, hv, WORLD_W - hv); }
      };
      const T = L.tp;
      if (T) {
        const e = now - T.t0;
        if (T.phase === 'turn' && e >= TP.turn) { T.phase = 'out'; T.t0 = now; }
        else if (T.phase === 'out' && e >= TP.out) {
          T.phase = 'pan'; T.t0 = now; L.x = T.x; T.fromCx = L.cx; T.toCx = clamp(T.x, hv, WORLD_W - hv);
          if (T.wipe) setPaper((k) => k + 1); else setBlur((k) => k + 1);
        } else if (T.phase === 'pan') {
          const f = clamp(e / TP.pan, 0, 1), ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
          if (T.wipe) { if (!T.jumped && f >= 0.5) { L.cx = T.toCx; T.jumped = true; applyRoom(T); } } else L.cx = T.fromCx + (T.toCx - T.fromCx) * ease;
          if (e >= TP.pan) { L.cx = T.toCx; T.phase = 'in'; T.t0 = now; L.face = 1; play.teleportIn(); }
        } else if (T.phase === 'paper' && !T.jumped && e >= 100) { L.x = T.x; L.cx = clamp(T.x, hv, WORLD_W - hv); T.jumped = true; applyRoom(T); }
        const done = (T.phase === 'in' && e >= TP.in) || (T.phase === 'paper' && e >= 200);
        if (done) {
          L.tp = null;
          rootEl.current!.dataset.tpMs = String(Math.round(now - T.start));
          if (L.queued) { const q = L.queued; L.queued = null; setTimeout(() => goRoom(q === 'enter'), 0); }
          if (T.frame) { L.pointUntil = now + 200; L.openAt = now + 200; L.openId = T.frame; }
          else if (T.point) L.pointUntil = now + 700;
        }
        tpCam = T.phase === 'pan' || T.phase === 'paper';
      }

      if (L.auto && dir) { if (L.tour !== null) { L.tour = null; L.tourWait = false; setTour(null); } L.auto = null; }
      if (L.auto && !L.modal && L.active) {
        const dx = L.auto.x - L.x;
        if (Math.abs(dx) < 6) {
          const a = L.auto;
          L.x = a.x; L.auto = null;
          if (a.then === 'open') { L.openAt = now + 220; L.pointUntil = now + 220; L.openId = a.id!; }
          if (a.then === 'tour') { L.pointUntil = now + POINT_MS; L.tourWait = true; }
          if (a.then === 'point') L.pointUntil = now + 700;
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
      const dz = (L.viewW * DEAD_ZONE) / 2;
      const off = L.x - L.cx;
      const goal = off > dz ? L.x - dz : off < -dz ? L.x + dz : L.cx;
      if (!tpCam) L.cx = clamp(reduced() ? goal : L.cx + (goal - L.cx) * (1 - Math.exp(-dt / 0.05)), hv, WORLD_W - hv);

      worldEl.current!.style.transform = `translate3d(${STAGE_W / 2 - L.cx}px,0,0)`;
      topEl.current!.style.transform = `translate3d(${STAGE_W / 2 - L.cx}px,0,0)`;
      fgEl.current!.style.transform = `translate3d(${STAGE_W / 2 - L.cx * FOREGROUND_PARALLAX}px,0,0)`;
      // in the room she stands at a fixed spot on screen (the world layer is translated by the camera, so undo that)
      const wx = L.room ? L.cx + ROOM_CHAR_X - STAGE_W / 2 : L.x;
      charEl.current!.style.transform = `translate3d(${wx - L.charW / 2}px,0,0)`;
      // The wall grid repeats every 20 stage px, so only the remainder is applied, as a transform (no repaint).
      // Per-frame values are written straight to elements: an inherited CSS variable would restyle the whole page every frame.
      const camLeft = L.cx - STAGE_W / 2;
      if (gridEl.current) gridEl.current.style.transform = `translateX(${-(((camLeft % 20) + 20) % 20) * L.scale}px)`;
      const pct = `${(L.x / WORLD_W) * 100}%`;
      for (const dot of document.querySelectorAll<HTMLElement>('.map-dot')) if (dot.style.left !== pct) dot.style.left = pct;

      // what is she standing in front of?
      let t: Target = null;
      let best = PROXIMITY;
      const consider = (d: number, tt: Target) => { if (d <= best) { best = d; t = tt; } };
      for (const f of FRAMES) consider(Math.abs(f.x - L.x), { kind: 'frame', id: f.id });
      consider(Math.abs(DOOR_X - L.x), { kind: 'door' });
      consider(Math.abs(TOUR_X - L.x), { kind: 'tour' });
      consider(Math.abs(TEST_DOOR_X - L.x), { kind: 'testdoor' });
      if (L.room) t = null;
      if (!sameTarget(L.target, t)) { L.target = t; setTarget(t); }

      // her pose
      const tpState: CharacterState | null = !L.tp || L.tp.phase === 'paper' ? null : L.tp.phase === 'turn' ? 'turn' : L.tp.phase === 'in' ? 'teleport-in' : 'teleport-out';
      const next: CharacterState =
        tpState ? tpState
        : L.room ? L.mood
        : now < L.waveUntil && !dir ? 'wave'
        : now < L.pointUntil && !dir ? 'point'
        : L.modal ? 'look'
        : dir ? (run ? 'run' : 'walk')
        : L.target ? 'look' : 'idle';
      if (next !== L.cstate) { L.cstate = next; setCstate(next); }
      if ((dir || L.tp) && L.face !== facingNow) { facingNow = L.face; setFacing(L.face); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => { if (card && markSeen(card.id)) setVer((v) => v + 1); }, [card]);

  // after a card closes, put focus back on the frame it came from
  const prevCard = useRef<Drink | null>(null);
  useEffect(() => {
    if (prevCard.current && !card) {
      if (fromBag.current) { fromBag.current = false; setBagOpen(true); }
      else document.querySelector<HTMLElement>(`.gframe[data-id="${prevCard.current.id}"]`)?.focus();
    }
    prevCard.current = card;
  }, [card]);

  // the walkthrough opens by itself on the first visit to the lobby, and again whenever "?" is pressed
  useEffect(() => {
    if (startInRoom.current || walkthroughSeen()) return;
    const id = window.setTimeout(() => { helpFrom.current = live.current.x; setHelp(true); }, 1200);
    return () => clearTimeout(id);
  }, []);
  const openHelp = () => { setMapOpen(false); setBagOpen(false); setCard(null); helpFrom.current = live.current.x; setHelp(true); };
  const closeHelp = () => {
    setHelp(false);
    const back = helpFrom.current; helpFrom.current = null;
    if (back !== null && Math.abs(back - live.current.x) > 40) goTo(back);
  };
  const helpStep = (i: number) => {
    if (i !== 1) return;
    const on = [...document.querySelectorAll('.gframe')].some((e) => { const r = e.getBoundingClientRect(); return r.left > 60 && r.right < window.innerWidth - 60; });
    if (!on) goTo(FRAMES[0].x, FRAMES[0], false);
  };
  // sound: the music ducks while a card, the bag or the walkthrough is open; the bag and the cards have their own sounds
  useEffect(() => { armGestureUnlock(); }, []);
  useEffect(() => { setDuck(!!card || bagOpen || help); }, [card, bagOpen, help]);
  const firstBag = useRef(true);
  useEffect(() => { if (firstBag.current) { firstBag.current = false; return; } play.bag(bagOpen); }, [bagOpen]);
  const hadCard = useRef(false);
  useEffect(() => { if (card && !hadCard.current) play.cardOpen(); hadCard.current = !!card; }, [card]);
  const onHold = (d: -1 | 0 | 1, run = false) => { live.current.hold = d; live.current.holdRun = d !== 0 && run; };
  const lookLabels = { frame: 'Look closer', door: 'Back to the café', tour: 'Take the tour', testdoor: 'Test what you learned' } as const;
  const near = target && target.kind !== 'frame' ? target.kind : null;
  const announce = inRoom ? 'You are in the testing room.' : target?.kind === 'frame' ? `In front of ${FRAMES.find((f) => f.id === target.id)!.drink.name}. Press up arrow or Enter to look closer.` : target ? `${lookLabels[target.kind]}: press up arrow.` : '';
  const miniW = 300;
  const hintText = !target ? null : target.kind === 'frame' ? '↑ look closer' : target.kind === 'door' ? '↑ back to the café' : target.kind === 'tour' ? (tourSaved ? '↑ continue the tour' : '↑ start the tour') : '↑ test what you learned';

  return (
    <div ref={rootEl} className={`gallery${compact ? ' compact' : ''}${entering ? ' g-enter' : ''}`}>
      <h1 className="sr-only">Know Your Coffee: a gallery with a coffee on every wall</h1>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="frames-art" viewBox="0 0 294 204" dangerouslySetInnerHTML={{ __html: SPRITE }} />
      </svg>

      {vpEl ? createPortal(<div ref={gridEl} className="g-grid" aria-hidden="true" />, vpEl) : null}
      {inRoom ? (
        <TestingRoom
          viewLeft={viewLeft}
          bag={bagState}
          onMood={(m) => { live.current.mood = m; }}
          onCheer={bounce}
          onAnswered={() => setVer((v) => v + 1)}
          compact={compact}
        />
      ) : null}
      <div ref={worldEl} className="g-world" style={{ visibility: inRoom ? 'hidden' : undefined }}>
        <World activeId={target?.kind === 'frame' ? target.id : null} near={near} tourAt={tourSaved} onOpen={walkToFrame} onTour={startTour} />
      </div>
      <div ref={fgEl} className="g-world g-fg" style={{ visibility: inRoom ? 'hidden' : undefined }}><Foreground /></div>
      {/* she is the top world layer: nothing in the world or the foreground draws over her, only the HUD below */}
      <div ref={topEl} className="g-world g-top">
        <div ref={charEl} className="g-char" data-wt="her" style={{ top: feetY - charH, width: charW, height: charH }}>
          <div ref={charInner}><AnimatedCharacter state={cstate} facing={facing} height={charH} bubble="" steps /></div>
          {hintText && !card && !mapOpen && !inRoom ? <i className="look-hint">{hintText}</i> : null}
        </div>
      </div>

      {!compact ? (
        <button type="button" className={`arrow-btn g-sound${inRoom ? ' in-room' : ''}`} data-wt="sound" style={{ left: inRoom ? viewLeft + viewW - 24 - 38 : viewLeft + 24 }} aria-pressed={!soundOff} aria-label={soundOff ? 'Sound is off (S)' : 'Sound is on (S)'} onClick={toggleMuted}>
          <SpeakerIcon off={soundOff} />
        </button>
      ) : null}
      {!inRoom && !compact ? <SearchBox ref={searchRef} style={{ left: viewLeft + 24 + 48 + 14 }} onPick={(d) => { const f = FRAMES.find((q) => q.id === d.id)!; goTo(f.x, f); }} /> : null}
      {inRoom && !compact ? <button type="button" className="g-back" style={{ left: viewLeft + viewW - 24, top: 768, transform: 'translateX(-100%)' }} onClick={() => goRoom(false)}>← back to the gallery</button> : null}
      {!inRoom && !compact ? (
        <button type="button" className="g-mini" data-wt="map" style={{ left: viewLeft + viewW - 20 - miniW - 24 }} aria-label="Open the map (M)" onClick={() => setMapOpen(true)}>
          <MapStrip width={miniW} boxHeight={14} labelSize={10} />
        </button>
      ) : null}
      {hint && !card && !mapOpen && !inRoom ? <p className="g-hint">{compact ? 'hold an arrow to walk · double-tap and hold to run' : '← → to walk · hold shift to run'}</p> : null}

      {!inRoom && !compact ? (
        <>
          <WalkButton dir={-1} left={viewLeft + 24} onHold={onHold} />
          <BagButton state={bagState} left={viewLeft + 24} onClick={() => setBagOpen(true)} />
          <button type="button" className="arrow-btn g-help" data-wt="help" style={{ left: viewLeft + 24 + 56 + 14 }} aria-label="Help: the walkthrough" onClick={openHelp}>?</button>
          <WalkButton dir={1} left={viewLeft + viewW - 24 - 56} onHold={onHold} />
          <button type="button" className="btn test-btn g-test" data-wt="test" onClick={() => goRoom(true)}>test what you learned</button>
        </>
      ) : null}

      {blur ? <MotionLines key={`b${blur}`} /> : null}
      {paper ? <div key={`p${paper}`} className="g-paper" style={{ '--wipe': reduced() ? '200ms' : '300ms' } as React.CSSProperties} /> : null}

      {mapOpen ? createPortal(
        <div className="cc-backdrop" onClick={() => setMapOpen(false)}>
          <div className="g-bigmap" role="dialog" aria-modal="true" aria-label="Map of the gallery" onClick={(e) => e.stopPropagation()}>
            <h2>map</h2>
            <p>{compact ? 'tap a room or a frame and she goes there' : 'click a room or a frame and she goes there'}</p>
            <MapStrip width={Math.min(860, vw * 0.94 - 70)} boxHeight={compact ? 56 : 72} labelSize={compact ? 12 : 14} onRoom={(r) => goTo(r.enter)} onFrame={walkToFrame} />
            <button type="button" className="btn-inline" autoFocus onClick={() => setMapOpen(false)}>close</button>
          </div>
        </div>,
        document.body,
      ) : null}


      {compact ? (
        <PhoneUI
          ref={searchRef}
          inRoom={inRoom}
          bagText={`${bagCount(bagState)} / ${DRINKS.length}`}
          canLook={!!target}
          lookLabel={target ? lookLabels[target.kind] : 'Look closer'}
          onLook={look}
          onHold={onHold}
          onBack={() => goRoom(false)}
          onMap={() => setMapOpen(true)}
          onBag={() => setBagOpen(true)}
          onHelp={openHelp}
          onTest={() => goRoom(true)}
          onPick={(d) => { const f = FRAMES.find((q) => q.id === d.id)!; goTo(f.x, f); }}
        />
      ) : null}
      {help ? <Walkthrough onClose={closeHelp} onStep={helpStep} touch={compact} /> : null}
      {bagOpen ? (
        <BagPanel
          state={bagState}
          onClose={() => setBagOpen(false)}
          onShow={(d) => { setBagOpen(false); const f = placeFor(d); goTo(f.x, f, false); }}
          onReset={() => { resetProgress(); clearSeenAndTour(); setTourSaved(null); setVer((v) => v + 1); }}
          compact={compact}
        />
      ) : null}
      {card ? (
        <CoffeeCard
          drink={card}
          mastered={bagState.mastered.has(card.id)}
          tour={tour !== null ? { i: tour, total: FRAMES.length, onNext: () => goTourStop(tour + 1), onEnd: tour + 1 < FRAMES.length ? endTour : finishTour } : null}
          onClose={tour !== null ? endTour : () => setCard(null)}
          onNav={(d) => setCard(FRAMES[(frameIndex(card) + d + FRAMES.length) % FRAMES.length].drink)}
          onJump={(id) => { const f = FRAMES.find((q) => q.id === id)!; goTo(f.x, f); }}
          onShow={() => { const f = placeFor(card); goTo(f.x, f, false); }}
          compact={compact}
        />
      ) : null}
    </div>
  );
}
