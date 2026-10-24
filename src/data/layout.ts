import { CATEGORIES, DRINKS, type VesselId } from './drinks';

// Frame px, measured from the Figma "home" frame (1280 x 832).
export const PITCH = 187; // centre-to-centre inside a group: mean of the 174.6 and 199.4 measured in the frame
export const FIRST_CENTER = 192; // centre of the first cup (vessel/03 at x=144, w=96)
export const VESSEL_SIZE: Record<VesselId, { w: number; h: number; top: number }> = {
  '03': { w: 96, h: 80, top: 437 },
  '02': { w: 96, h: 133, top: 383 },
  '01': { w: 152, h: 94, top: 420 },
};

// The mock's cups stand 32px higher than the app's, so tag and label rows are the frame's y + 32.
export const TAG_TOP = 509; // frame y 477
export const LABEL_TOP = 529; // frame y 497, 16px tall, below every cup base (saucers end at 516)
export const TAG_W: Record<string, number> = { shots: 62.5, 'with water': 113.2, 'with drip': 97.9, 'with milk': 98.8, 'cold & sweet': 131.6 }; // rendered outer widths

const CLEAR = 12; // minimum clear space on both sides of a tag
const FRAME_GAP = 273 - PITCH; // frame: 273 between the last cup of one group and the first of the next, minus the regular pitch

const groupOf = (i: number) => CATEGORIES.indexOf(DRINKS[i].category);
const half = (i: number) => VESSEL_SIZE[DRINKS[(i + DRINKS.length) % DRINKS.length].vessel].w / 2;
const firstOf = CATEGORIES.map((c) => DRINKS.findIndex((d) => d.category === c));

/** Extra space between groups: the frame's, widened only where a tag would leave less than CLEAR px on a side. */
const needed = firstOf.map((s, g) => TAG_W[CATEGORIES[g]] + 2 * CLEAR + half(s) + half(s - 1) - PITCH);
export const GAP = Math.ceil(Math.max(FRAME_GAP, ...needed));

export const COUNT = DRINKS.length;
export const LEN = COUNT * PITCH + CATEGORIES.length * GAP; // one full loop

export const cupBase = DRINKS.map((_, i) => FIRST_CENTER + i * PITCH + GAP * groupOf(i));
/** Left edge of each tag: centred in the clear space between the previous group's last cup and its first cup. */
export const tagBase = firstOf.map((s, g) => {
  const prevCentre = s === 0 ? cupBase[COUNT - 1] - LEN : cupBase[s - 1];
  const prevRight = prevCentre + half(s - 1);
  const nextLeft = cupBase[s] - half(s);
  return (prevRight + nextLeft) / 2 - TAG_W[CATEGORIES[g]] / 2 + 2; // +2: the tag's CSS margin pulls its border box 2px left
});
