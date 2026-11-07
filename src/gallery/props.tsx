import type { CSSProperties, ReactNode } from 'react';
import { sketch, type Pt } from '../art/character/sketch';
import { WORLD_W, FLOOR_Y, rng } from './layout';

const INK = '#1e1e1e', PAPER = '#f7f5f1', BEIGE = '#f4f0e4';
type Shape = { d: string; fill?: string; stroke?: string; w?: number };

const closed = (pts: Pt[], seed: number, step = 20) => sketch(pts, { seed, jitter: 0.8, step });
const open = (pts: Pt[], seed: number, step = 30) => sketch(pts, { closed: false, seed, jitter: 0.6, step });

/** Props are drawn like Sehaz: solid shapes with an outline and a 3px beige sticker edge, so black pieces still read on the black wall. */
function Art({ width, height, shapes, style, className }: { width: number; height: number; shapes: Shape[]; style?: CSSProperties; className?: string }) {
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

export function Plant({ seed = 1 }: { seed?: number }) {
  const leaf: Pt[] = [[60, 142], [50, 110], [44, 70], [54, 28], [64, 68], [70, 108]];
  const angles = [-52, -26, 0, 24, 50];
  const shapes: Shape[] = [
    ...angles.map((a, i) => ({ d: closed(rot(leaf, a, [60, 142]), seed * 10 + i, 24), fill: PAPER, w: 4 })),
    { d: closed([[28, 140], [92, 140], [84, 198], [36, 198]], seed * 10 + 9), fill: INK, w: 5 },
  ];
  return <Art width={120} height={200} shapes={shapes} />;
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

export function Lamp({ drop = 90 }: { drop?: number }) {
  return (
    <Art width={100} height={drop + 10} shapes={[
      { d: open([[50, -400], [50, drop - 44]], 41, 200), w: 3 },
      { d: closed([[8, drop], [92, drop], [70, drop - 44], [30, drop - 44]], 42), fill: PAPER },
    ]} />
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
  const ring: Pt[] = [[0, FLOOR_Y], [0, 150], [10, 100], [40, 62], [120, 44], [200, 62], [230, 100], [240, 150], [240, FLOOR_Y], [196, FLOOR_Y], [196, 170], [180, 122], [120, 104], [60, 122], [44, 170], [44, FLOOR_Y]];
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
