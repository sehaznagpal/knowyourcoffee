export type Pt = [number, number];

// Seeded noise so the wobble is the same on every render.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

/**
 * Turns a polygon (or polyline) into a hand-drawn looking path: long edges are split and nudged sideways by a
 * smoothed random walk, then the points are joined with quadratic curves so corners round off like pen lines.
 * `step` is the spacing of the extra points; pass a large step for shapes whose points are already dense.
 */
export function sketch(pts: Pt[], o: { closed?: boolean; jitter?: number; step?: number; seed?: number } = {}): string {
  const { closed = true, jitter = 1.4, step = 18, seed = 1 } = o;
  const r = rng(seed);
  const n = pts.length;
  const dense: Pt[] = [];
  let walk = 0;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.max(1, Math.round(len / step));
    const nx = -dy / len, ny = dx / len;
    for (let j = 0; j < k; j++) {
      walk = walk * 0.55 + (r() - 0.5) * 2 * jitter * 0.45;
      const off = j === 0 ? walk * 0.3 : walk; // keep corners close to where they were drawn
      const t = j / k;
      dense.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
    }
  }
  if (!closed) dense.push(pts[n - 1]);
  const m = dense.length;
  if (closed) {
    let d = `M${f(mid(dense[m - 1], dense[0]))}`;
    for (let i = 0; i < m; i++) d += `Q${f(dense[i])} ${f(mid(dense[i], dense[(i + 1) % m]))}`;
    return d + 'Z';
  }
  let d = `M${f(dense[0])}`;
  for (let i = 1; i < m - 1; i++) d += `Q${f(dense[i])} ${f(mid(dense[i], dense[i + 1]))}`;
  return d + `L${f(dense[m - 1])}`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 12, rot = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)] as Pt;
  });
}
