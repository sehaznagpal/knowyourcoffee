import { FIRST_CENTER, SLOT_PITCH } from '../data/layout';

export const COUNT = 18;
const LO = -2; // a cup wraps while it is off-screen: slots span [-2, 16), i.e. x in [-203, 3172)

export const wrap = (s: number) => ((((s - LO) % COUNT) + COUNT) % COUNT) + LO;
export const slotX = (index: number, pos: number) => FIRST_CENTER + wrap(index - pos) * SLOT_PITCH;

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

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.target = this.pos;
  }

  dispose() {
    this.cancel();
  }
}
