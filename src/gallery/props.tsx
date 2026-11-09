import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { play } from '../audio/sound';
import { sketch, type Pt } from '../art/character/sketch';
import { WORLD_W, FLOOR_Y, FRAME_TOP_MIN, rng } from './layout';

const INK = '#1e1e1e', PAPER = '#f7f5f1', BEIGE = '#f4f0e4';
type Shape = { d: string; fill?: string; stroke?: string; w?: number };

export const closed = (pts: Pt[], seed: number, step = 20) => sketch(pts, { seed, jitter: 0.8, step });
export const open = (pts: Pt[], seed: number, step = 30) => sketch(pts, { closed: false, seed, jitter: 0.6, step });

/** Props are drawn like Sehaz: solid shapes with an outline and a 3px beige sticker edge, so black pieces still read on the black wall. */
export function Art({ width, height, shapes, style, className }: { width: number; height: number; shapes: Shape[]; style?: CSSProperties; className?: string }) {
  const E = 3;
  return (
    <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', display: 'block', ...style }} aria-hidden="true">
      {shapes.map((s, i) => (
        <path key={`e${i}`} d={s.d} fill={s.fill ? BEIGE : 'none'} stroke={BEIGE} strokeWidth={(s.w ?? 5) + 2 * E} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {shapes.map((s, i) => (
        <path key={i} d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke ?? INK} strokeWidth={s.w ?? 5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}

const rot = (pts: Pt[], deg: number, [ox, oy]: Pt): Pt[] => {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return pts.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]);
};

/** A plant: hover it (or tap it on a phone) and its leaves shake, with a soft rustle. */
export function Plant({ seed = 1 }: { seed?: number }) {
  const leaf: Pt[] = [[60, 142], [50, 110], [44, 70], [54, 28], [64, 68], [70, 108]];
  const angles = [-52, -26, 0, 24, 50];
  const leaves = angles.map((a, i) => closed(rot(leaf, a, [60, 142]), seed * 10 + i, 24));
  const pot = closed([[28, 140], [92, 140], [84, 198], [36, 198]], seed * 10 + 9);
  const [shaking, setShaking] = useState(false);
  const timer = useRef(0);
  const shake = () => {
    play.leaves();
    if (shaking) return;
    setShaking(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShaking(false), 800);
  };
  const E = 3;
  const layer = (edge: boolean) => (
    <>
      {leaves.map((d, i) => (
        <g key={i} className="leaf" style={{ '--dir': i % 2 ? 1 : -1, '--i': i } as CSSProperties}>
          <path d={d} fill={edge ? BEIGE : PAPER} stroke={edge ? BEIGE : INK} strokeWidth={edge ? 4 + 2 * E : 4} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      <path d={pot} fill={edge ? BEIGE : INK} stroke={edge ? BEIGE : INK} strokeWidth={edge ? 5 + 2 * E : 5} strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
  return (
    <span
      className={`plant${shaking ? ' is-shaking' : ''}`}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') shake(); }}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') shake(); }}
    >
      <svg width={120} height={200} viewBox="0 0 120 200" style={{ overflow: 'visible', display: 'block' }} aria-hidden="true">
        {layer(true)}
        {layer(false)}
      </svg>
    </span>
  );
}

export function Bench() {
  return (
    <Art width={230} height={84} shapes={[
      { d: closed([[0, 8], [230, 8], [224, 36], [6, 36]], 31), fill: PAPER },
      { d: closed([[26, 36], [44, 36], [42, 82], [28, 82]], 32), fill: INK },
      { d: closed([[186, 36], [204, 36], [202, 82], [188, 82]], 33), fill: INK },
    ]} />
  );
}

// A pendant lamp that hangs from a bracket just below the top band, so nothing is drawn under the search or the map.
// Hover it (or tap it on a phone) and a neat blue glow lights up just around the shade, behind it.
export function Lamp({ drop = 90 }: { drop?: number }) {
  const [lit, setLit] = useState(false);
  const shade = closed([[8, drop], [92, drop], [70, drop - 44], [30, drop - 44]], 42);
  return (
    <div
      className={`lamp${lit ? ' is-lit' : ''}`}
      style={{ width: 100, height: drop + 10 }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setLit(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setLit(false); }}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') setLit((v) => !v); }}
    >
      <svg className="lamp-glow" width={100} height={drop + 10} viewBox={`0 0 100 ${drop + 10}`} style={{ overflow: 'visible' }} aria-hidden="true">
        <path d={shade} fill="#8fe5ff" stroke="#8fe5ff" strokeWidth={11} strokeLinejoin="round" />
      </svg>
      <Art width={100} height={drop + 10} shapes={[
        { d: closed([[40, FRAME_TOP_MIN - 4], [60, FRAME_TOP_MIN - 4], [60, FRAME_TOP_MIN + 4], [40, FRAME_TOP_MIN + 4]], 43, 30), fill: INK, w: 3 },
        { d: open([[50, FRAME_TOP_MIN], [50, drop - 44]], 41, 200), w: 3 },
        { d: shade, fill: PAPER },
      ]} style={{ position: 'relative' }} />
    </div>
  );
}

export function Door() {
  return (
    <Art width={130} height={250} shapes={[
      { d: closed([[0, 0], [130, 0], [130, 250], [0, 250]], 51, 30), fill: PAPER },
      { d: closed([[18, 22], [112, 22], [112, 108], [18, 108]], 52, 30), w: 4 },
      { d: closed([[18, 128], [112, 128], [112, 228], [18, 228]], 53, 30), w: 4 },
      { d: closed([[94, 114], [106, 114], [106, 126], [94, 126]], 54, 30), fill: INK, w: 4 },
    ]} />
  );
}

export function Arch() {
  // the arch tops out below the top band, so nothing is drawn under the search or the map
  const top = FRAME_TOP_MIN, k = (FLOOR_Y - top) / (FLOOR_Y - 44);
  const ring: Pt[] = ([[0, FLOOR_Y], [0, 150], [10, 100], [40, 62], [120, 44], [200, 62], [230, 100], [240, 150], [240, FLOOR_Y], [196, FLOOR_Y], [196, 170], [180, 122], [120, 104], [60, 122], [44, 170], [44, FLOOR_Y]] as Pt[]).map(([x, y]) => [x, y >= FLOOR_Y ? y : top + (y - 44) * k]);
  return <Art width={240} height={FLOOR_Y} shapes={[{ d: closed(ring, 61, 24), fill: PAPER, w: 6 }]} />;
}

export function Stanchions({ gap = 190 }: { gap?: number }) {
  const post = (x: number, seed: number): Shape[] => [
    { d: closed([[x - 5, 10], [x + 5, 10], [x + 5, 78], [x - 5, 78]], seed, 40), fill: INK, w: 4 },
    { d: closed([[x - 26, 78], [x + 26, 78], [x + 30, 90], [x - 30, 90]], seed + 1, 20), fill: INK, w: 4 },
    { d: closed([[x - 9, 2], [x + 9, 2], [x + 9, 14], [x - 9, 14]], seed + 2, 20), fill: INK, w: 4 },
  ];
  return (
    <Art width={gap} height={96} shapes={[
      ...post(0, 71), ...post(gap, 75),
      { d: open([[0, 22], [gap * 0.3, 46], [gap * 0.7, 46], [gap, 22]], 79, 60), w: 5 },
    ]} />
  );
}

/** Loose floorboard strokes across the whole floor. */
export function Floor() {
  const r = rng(7);
  const lines: string[] = [];
  const rows = [586, 634, 690, 752, 808];
  rows.forEach((y, ri) => {
    let x = r() * 160;
    while (x < WORLD_W) {
      const len = 120 + r() * 300;
      lines.push(sketch([[x, y + (r() - 0.5) * 3], [x + len, y + (r() - 0.5) * 3]], { closed: false, seed: ri * 1000 + lines.length, jitter: 1, step: 80 }));
      x += len + 40 + r() * 140;
    }
  });
  return (
    <svg className="g-floor" width={WORLD_W} height={832 - FLOOR_Y} viewBox={`0 ${FLOOR_Y} ${WORLD_W} ${832 - FLOOR_Y}`} aria-hidden="true">
      {lines.map((d, i) => <path key={i} d={d} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.85} />)}
    </svg>
  );
}

export const At = ({ x, y, children, className, style }: { x: number; y: number; children: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={className} style={{ position: 'absolute', left: x, top: y, ...style }}>{children}</div>
);
