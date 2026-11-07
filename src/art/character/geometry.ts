import { sketch, type Pt } from './sketch';

// Character units: the Figma v2 box, 309 x 772, soles on y = 768 (see reference/character/sehaz-v2.svg).
// The part shapes live in v2shapes.ts (generated from that file); this file holds the skeleton and the few parts drawn here.
export const CHAR_W = 309;
export const CHAR_H = 772;
export const CX = 155;

export const INK = '#121212';
export const PAPER = '#F7F5F1';
export const BLUE = '#8FE5FF';
export const LILAC = '#CEB5CB';
export const SKIN = '#FFFEFA'; // ivory white: her face, neck, hands, ankles and her whole outer outline
export const BEIGE = SKIN; // the outline ring around her (kept under its old name)
export const JACKET = '#4C4C4C';
export const TROUSER = '#1E1E1E';
export const SHOE = '#13A9D6';
export const BLUSH = '#FF6F82';

// ---- skeleton ----
export const HIP_Y = 455; // hip pivot height when standing: under the belt, so the joints never show
export const LEG_LEN = 249; // hip pivot to ankle
export const GROUND = HIP_Y + LEG_LEN; // ankle height when standing straight (704); the sole is 64 below
export const HIP = { L: [100, HIP_Y] as Pt, R: [198, HIP_Y] as Pt };
export const ANKLE = { L: [113, GROUND] as Pt, R: [176.5, GROUND] as Pt };
export const NECK_Y = 185;

// The skirt is one shape; each leg takes the half on its side of this line (through the notch between the legs).
export const SPLIT = { top: [165.97, 400] as Pt, bottom: [139.7, 700] as Pt };

// ---- arms ----
// Both arms are one oversized jacket sleeve in a local frame: shoulder at the origin, hanging along +y, a little narrower at the shoulder
// and wider at the cuff, with a slight bend at the elbow. The group pivots at the shoulder, which is tucked under the jacket.
export const SHOULDER_L: Pt = [100, 226];
export const SHOULDER_R: Pt = [212, 226];
export const L_IDLE = 98.35; // pose angle at which the bag arm hangs at its drawn tilt
export const L_TILT = 4.4; // degrees the bag arm hangs from vertical at idle
export const ARM_LEN = 258; // shoulder to the bottom of the cuff
export const SLEEVE = 'M-20 0C-20 60 -20 100 -20 135C-22 175 -28 215 -31 238L-31 250Q-31 258 -23 258L23 258Q31 258 31 250L31 238C27 215 28 175 28 135C28 100 24 60 20 0A20 20 0 0 0 -20 0Z';
export const CUFF = 'M-31 238Q0 246 31 238'; // the visible edge of the cuff
export const CUFF_BAND = 'M-31 238Q0 246 31 238L31 250Q31 258 23 258L-23 258Q-31 258 -31 250Z';
export const HAND_Y = 240; // top of the palm, under the cuff
export const PALM = 'M-16 0L16 0C20 20 20 44 14 58C9 68 -9 68 -14 58C-20 44 -20 20 -16 0Z'; // a soft mitten, 20% bigger than before
export const THUMB = 'M14 14C26 12 31 28 25 40C21 44 16 40 15 34Z';
export const GRIP_LOCAL: Pt = [0, 292]; // where the bag handle meets the bag hand, in the arm's frame

const rad = (d: number) => (d * Math.PI) / 180;
/** Rotate a point about a pivot (screen degrees, clockwise positive). */
export const rotAbout = (p: Pt, o: Pt, deg: number): Pt => {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [o[0] + (p[0] - o[0]) * c - (p[1] - o[1]) * s, o[1] + (p[0] - o[0]) * s + (p[1] - o[1]) * c];
};

// ---- the bits still drawn here ----
export const SHAPES = {
  bubble: sketch([[0, 0], [250, 0], [254, 6], [254, 70], [248, 76], [60, 76], [30, 100], [34, 76], [6, 76], [0, 70]], { seed: 22, jitter: 0.5, step: 20 }),
  flicks: [
    sketch([[70, 752], [54, 740]], { closed: false, seed: 30, jitter: 0, step: 40 }),
    sketch([[120, 764], [112, 748]], { closed: false, seed: 31, jitter: 0, step: 40 }),
    sketch([[230, 760], [248, 745]], { closed: false, seed: 32, jitter: 0, step: 40 }),
    sketch([[196, 767], [208, 750]], { closed: false, seed: 33, jitter: 0, step: 40 }),
  ],
};

// ---- the free hand when it points or opens: local frame, +x runs out of the cuff along the forearm, thumb on -y ----
export type HandKind = 'mitten' | 'point' | 'open';
const HANDS: Record<'point' | 'open', Pt[]> = {
  point: [[0, -17], [20, -17], [28, -30], [40, -29], [36, -14], [82, -10], [86, -2], [36, 3], [38, 18], [0, 17]],
  open: [[0, -20], [10, -20], [18, -44], [34, -46], [36, -24], [64, -26], [72, -4], [66, 24], [0, 22]],
};
const handCache: Partial<Record<'point' | 'open', string>> = {};
export const handPath = (kind: 'point' | 'open') => (handCache[kind] ??= sketch(HANDS[kind], { seed: 50, jitter: 0.3, step: 14 }));
