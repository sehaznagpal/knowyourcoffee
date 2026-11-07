import { ellipse, sketch, type Pt } from './sketch';

// Character units: a 316 x 768 box, feet on y = 768, about 6.5 heads tall (the face oval is 116 high).
export const CHAR_W = 316;
export const CHAR_H = 768;
export const CX = 158;

export const INK = '#1e1e1e';
export const PAPER = '#f7f5f1';
export const BLUE = '#8fe5ff';
export const LILAC = '#c9b6cb';
export const BEIGE = '#f4f0e4';

// Skeleton
export const HIP_Y = 396; // hip pivot height when standing
export const LEG_LEN = 310; // hip pivot to ankle
export const FOOT_H = 62; // ankle to sole
export const HIP_X = { L: 112, R: 204 };
export const SHOULDER = { L: [102, 208] as Pt, R: [214, 208] as Pt };
export const UPPER = 112;
export const FORE = 104;
export const NECK_Y = 176;

const clean = (pts: Pt[], seed: number, step = 16) => sketch(pts, { seed, jitter: 0.5, step });
const smooth = (pts: Pt[], seed: number) => sketch(pts, { seed, jitter: 0.3, step: 200 });
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [2 * CX - x, y]);

// ---- hair: a solid cap on the forehead, a lumpy bun on top, a few loose hooks at the temples. Nothing below the jaw. ----
const FACE = { cx: CX, cy: 108, rx: 46, ry: 58 };
// the cap's outer edge runs 5 units outside the face outline so the two share one black line
const capOuter: Pt[] = [];
for (let deg = -173; deg <= -7; deg += 14) {
  const t = (deg * Math.PI) / 180;
  capOuter.push([FACE.cx + (FACE.rx + 5) * Math.cos(t), FACE.cy + (FACE.ry + 5) * Math.sin(t)]);
}
// hairline, right temple to left: forehead showing, a slight side part (the small dip), no bangs
const hairline: Pt[] = [[207, 104], [205, 88], [192, 74], [174, 66], [158, 65], [152, 66], [147, 76], [141, 67], [126, 74], [113, 88], [109, 104]];
const bun: Pt[] = Array.from({ length: 32 }, (_, i) => {
  const t = (i / 32) * Math.PI * 2;
  const r = 24.5 + 5.5 * (0.5 - 0.5 * Math.cos(4 * t + 0.6)); // four soft lumps
  return [CX + r * Math.cos(t), 30 + r * Math.sin(t)] as Pt;
});
// short loose hooks just above where the ears would be (left side; the right side mirrors them)
const strandL: Pt[][] = [
  [[114, 92], [101, 88], [92, 95], [95, 104]],
  [[112, 103], [99, 105], [92, 114], [97, 121]],
  [[115, 113], [105, 118], [102, 126]],
];

const shoeBase: Pt[] = [[-12, 0], [18, -2], [28, 16], [62, 34], [88, 46], [96, 56], [92, 62], [-26, 62], [-34, 52], [-30, 26]];

export const SHAPES = {
  cap: smooth([...capOuter, ...hairline], 3),
  bun: smooth(bun, 4),
  strandsL: strandL.map((p, i) => sketch(p, { closed: false, seed: 70 + i, jitter: 0, step: 200 })),
  strandsR: strandL.map((p, i) => sketch(mirror(p), { closed: false, seed: 74 + i, jitter: 0, step: 200 })),
  face: smooth(ellipse(FACE.cx, FACE.cy, FACE.rx, FACE.ry, 18), 5),
  neck: clean([[144, 150], [172, 150], [174, 196], [142, 196]], 6),

  top: clean([[124, 190], [142, 192], [150, 202], [158, 206], [166, 202], [174, 192], [192, 190], [198, 204], [200, 346], [116, 346], [118, 204]], 7, 14),
  tee: clean([[116, 330], [200, 330], [206, 410], [110, 410]], 8),
  hips: clean([[76, 384], [240, 384], [246, 432], [70, 432]], 9),
  panelL: clean([[136, 192], [108, 196], [92, 210], [84, 300], [76, 398], [130, 408], [138, 300]], 10, 18),
  panelR: clean(mirror([[136, 192], [108, 196], [92, 210], [84, 300], [76, 398], [130, 408], [138, 300]]), 11, 18),

  // leg in local coordinates: origin = hip pivot, ankle at (0, 310)
  leg: clean([[-30, -28], [30, -28], [44, 292], [-44, 292]], 12, 20),
  seam: sketch([[28, 6], [40, 284]], { closed: false, seed: 13, jitter: 0.3, step: 40 }),
  ankle: clean([[-12, 286], [12, 286], [12, 316], [-12, 316]], 14, 30),
  shoe: clean(shoeBase, 15, 16),
  laces: [
    sketch([[14, 14], [30, 22]], { closed: false, seed: 16, jitter: 0, step: 40 }),
    sketch([[26, 24], [42, 32]], { closed: false, seed: 17, jitter: 0, step: 40 }),
    sketch([[38, 34], [54, 42]], { closed: false, seed: 18, jitter: 0, step: 40 }),
  ],

  // bag in local coordinates: origin = the grip, hanging straight down
  bagHandle: sketch([[-24, 40], [-20, 12], [0, 0], [20, 12], [24, 40]], { closed: false, seed: 20, jitter: 0.3, step: 200 }),
  bagBody: clean([[-50, 36], [50, 36], [64, 94], [56, 118], [-56, 118], [-64, 94]], 21, 16),

  bubble: clean([[0, 0], [250, 0], [254, 6], [254, 70], [248, 76], [60, 76], [30, 100], [34, 76], [6, 76], [0, 70]], 22, 20),
  flicks: [
    sketch([[70, 752], [54, 740]], { closed: false, seed: 30, jitter: 0, step: 40 }),
    sketch([[120, 764], [112, 748]], { closed: false, seed: 31, jitter: 0, step: 40 }),
    sketch([[230, 760], [248, 745]], { closed: false, seed: 32, jitter: 0, step: 40 }),
    sketch([[196, 767], [208, 750]], { closed: false, seed: 33, jitter: 0, step: 40 }),
  ],
};

// Face features, as a function of how far she is turned (1 = facing right, 0 = facing us)
export function face(turn: number) {
  const t = 7 * turn;
  return {
    eyeL: smooth(ellipse(CX - 15 + t, 106, 4.8, 6.4, 8), 40),
    eyeR: smooth(ellipse(CX + 17 + t, 106, 4.8, 6.4, 8), 41),
    nose: sketch([[CX + 4 + t, 112], [CX + 8 + t, 124], [CX + 1 + t, 127]], { closed: false, seed: 42, jitter: 0, step: 40 }),
    smile: sketch([[CX - 9 + t, 139], [CX + 2 + t, 145], [CX + 15 + t, 138]], { closed: false, seed: 43, jitter: 0, step: 40 }),
    stud: smooth(ellipse(CX - 40 + t * 0.6, 150, 4.5, 4.5, 8), 44),
  };
}

// ---- hands: local frame, +x runs out of the cuff along the forearm, thumb on -y ----
export type HandKind = 'mitten' | 'point' | 'open';
const HANDS: Record<HandKind, Pt[]> = {
  mitten: [[0, -18], [10, -18], [20, -37], [33, -37], [33, -21], [47, -15], [53, 4], [41, 20], [0, 18]],
  point: [[0, -17], [20, -17], [28, -30], [40, -29], [36, -14], [82, -10], [86, -2], [36, 3], [38, 18], [0, 17]],
  open: [[0, -20], [10, -20], [18, -44], [34, -46], [36, -24], [64, -26], [72, -4], [66, 24], [0, 22]],
};
export const handPath = (kind: HandKind) => sketch(HANDS[kind], { seed: 50, jitter: 0.3, step: 14 });

// ---- sleeves: a tube through shoulder, elbow, wrist with its own widths, flaring into a wide cuff ----
function tube(J: Pt[], Wd: number[]): Pt[] {
  const n = J.length;
  const dir = (i: number): Pt => {
    const dx = J[i + 1][0] - J[i][0], dy = J[i + 1][1] - J[i][1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let d: Pt, m = 1;
    if (i === 0) d = dir(0);
    else if (i === n - 1) d = dir(n - 2);
    else {
      const a = dir(i - 1), b = dir(i);
      const sx = a[0] + b[0], sy = a[1] + b[1], l = Math.hypot(sx, sy) || 1;
      d = [sx / l, sy / l];
      m = 1 / Math.max(0.62, Math.sqrt((1 + a[0] * b[0] + a[1] * b[1]) / 2));
    }
    const nx = -d[1], ny = d[0], h = (Wd[i] / 2) * m;
    left.push([J[i][0] + nx * h, J[i][1] + ny * h]);
    right.push([J[i][0] - nx * h, J[i][1] - ny * h]);
  }
  // rounded shoulder end
  const d0 = dir(0), nx0 = -d0[1], ny0 = d0[0], r = Wd[0] / 2, cap: Pt[] = [];
  for (let t = 1; t < 6; t++) {
    const th = Math.PI - (Math.PI * t) / 6;
    cap.push([J[0][0] + r * (nx0 * Math.cos(th) - d0[0] * Math.sin(th)), J[0][1] + r * (ny0 * Math.cos(th) - d0[1] * Math.sin(th))]);
  }
  return [...left, ...right.reverse(), ...cap];
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Forward kinematics for one arm. Angles are absolute screen degrees: 0 = right, 90 = down, -90 = up. */
export function arm(side: 'L' | 'R', a1: number, a2: number, flare: number) {
  const S = SHOULDER[side];
  const E: Pt = [S[0] + UPPER * Math.cos(rad(a1)), S[1] + UPPER * Math.sin(rad(a1))];
  const W: Pt = [E[0] + FORE * Math.cos(rad(a2)), E[1] + FORE * Math.sin(rad(a2))];
  const w1 = 50, w2 = 50 + flare * 0.3, w3 = 50 + flare;
  return {
    sleeve: sketch(tube([S, E, W], [w1, w2, w3]), { seed: side === 'L' ? 60 : 61, jitter: 0.3, step: 22 }),
    wrist: W,
    angle: a2,
  };
}
