import { FIRST_CENTER, SLOT_PITCH } from '../data/layout';

export const COUNT = 18; // drinks in the sequence

/** Slots the strip spans: [lo, lo + count). A cup wraps while it is off-screen, so the strip covers the viewport plus 2 cups each side. */
export type Slots = { lo: number; count: number };

/** `viewW` / `viewLeft`: visible width and left edge in stage px. `count` is a multiple of COUNT so the drink sequence repeats cleanly. */
export function slotsFor(viewLeft: number, viewW: number): Slots {
  const lo = Math.floor((viewLeft - FIRST_CENTER) / SLOT_PITCH) - 2;
  const need = Math.ceil(viewW / SLOT_PITCH) + 5;
  return { lo, count: COUNT * Math.ceil(need / COUNT) };
}

export const wrap = (s: number, { lo, count }: Slots) => ((((s - lo) % count) + count) % count) + lo;
export const slotX = (index: number, pos: number, slots: Slots) => FIRST_CENTER + wrap(index - pos, slots) * SLOT_PITCH;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Animates a scalar position (in slots) and reports every change. */
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
