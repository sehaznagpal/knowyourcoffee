import { COUNT, LEN, cupBase, tagBase } from '../data/layout';
import { CATEGORIES } from '../data/drinks';

export { COUNT };
const TAGS = CATEGORIES.length;

/**
 * Scroll position is in px: cup i stands at cupBase[i] - pos. The strip is `copies` loops long, wrapped over
 * [lo, lo + copies * LEN), so cups, gaps and tags repeat together on wide screens.
 */
export type Strip = { lo: number; copies: number };

/** `viewLeft` / `viewW`: visible left edge and width in stage px. Covers the screen plus about 2 cups each side. */
export function stripFor(viewLeft: number, viewW: number): Strip {
  const margin = 560;
  return { lo: viewLeft - margin, copies: Math.max(1, Math.ceil((viewW + 2 * margin) / LEN)) };
}

const wrapX = (v: number, { lo, copies }: Strip) => {
  const m = copies * LEN;
  return ((((v - lo) % m) + m) % m) + lo;
};

/** `index` runs over every rendered cup: loop copy * COUNT + drink. Returns the cup centre in stage px. */
export const cupX = (index: number, pos: number, strip: Strip) =>
  wrapX(cupBase[index % COUNT] + Math.floor(index / COUNT) * LEN - pos, strip);
/** Left edge of tag `index` (loop copy * 5 + category). */
export const tagX = (index: number, pos: number, strip: Strip) =>
  wrapX(tagBase[index % TAGS] + Math.floor(index / TAGS) * LEN - pos, strip);

/** Scroll offset at which cup number `m` (any integer, counted along the endless loop) is at rest. */
export const stopOffset = (m: number) => cupBase[((m % COUNT) + COUNT) % COUNT] - cupBase[0] + Math.floor(m / COUNT) * LEN;
/** Number of the cup whose rest offset is nearest to `pos`. */
export function nearestStop(pos: number): number {
  const base = Math.floor(pos / LEN) * COUNT;
  let best = base, bd = Infinity;
  for (let m = base - 1; m <= base + COUNT; m++) {
    const d = Math.abs(stopOffset(m) - pos);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Animates a scalar scroll position and reports every change. */
export class Mover {
  pos = 0;
  target = 0;
  private raf = 0;

  constructor(private onChange: (pos: number) => void) {}

  set(pos: number) {
    this.cancel();
    this.pos = this.target = pos;
    this.onChange(pos);
  }

  animateTo(to: number, duration: number, ease: (t: number) => number = easeOutCubic) {
    this.cancel();
    const from = this.pos;
    this.target = to;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      this.pos = from + (to - from) * ease(t);
      this.onChange(this.pos);
      this.raf = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Re-report the current position (after the cup list changed). */
  refresh() {
    this.onChange(this.pos);
  }

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.target = this.pos;
  }

  dispose() {
    this.cancel();
  }
}
