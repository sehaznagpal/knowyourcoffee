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
export const BEIGE = '#F4F0E4';
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
// Left (the bag arm): the sleeve is drawn where it hangs in the Figma file and rotates about the shoulder, which sits under the jacket.
export const SHOULDER_L: Pt = [100, 226];
export const L_IDLE = 98.35; // the pose angle at which the arm hangs as drawn
export const TUBE_L = 'M96 226C82 262 62 312 56 348L51.8 475.7C51.6 480.3 55.2 484 59.8 484H100.2C104.5 484 108.1 480.5 108.2 476.2C108.7 449.9 110.4 365.4 108 356.2C105.2 345.4 103 329.4 102 320.4C99 293.7 97.5 262 97.5 262L112 226Z';
export const HAND_L = { cx: 80.5, cy: 478.5, rx: 17.5, ry: 29.5 };
export const GRIP_L: Pt = [79.5, 491]; // top of the bag handle
export const CUFF_L = { x: 52, y: 416.947, w: 57, h: 67.0531, r: 8 };

// Right (the free arm): a tube in its own frame, shoulder at the origin, hanging along +y. Hidden under the jacket at rest.
export const SHOULDER_R: Pt = [212, 226];
export const R_IDLE = 82.25; // pose angle of the free arm at rest
export const ARM_R_LEN = 214;
export const TUBE_R = 'M-19 0L-17 150L-20 206Q-20 214 -12 214L12 214Q20 214 20 206L17 150L19 0A19 19 0 0 0 -19 0Z';
export const SEAM_R = 'M-9 40C-8 100 -8 160 -9 206';

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
