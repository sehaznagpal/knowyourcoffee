import { ellipse, sketch, type Pt } from './sketch';

// Everything is drawn in Sehaz's own proportions: a 316 x 768 box, feet on y = 768, facing right.
export const CHAR_W = 316;
export const CHAR_H = 768;

export const INK = '#1e1e1e';
export const PAPER = '#f7f5f1';
export const BLUE = '#8fe5ff';
export const LILAC = '#c9b6cb';

const closed = (pts: Pt[], seed: number, jitter = 1.5, step = 18) => sketch(pts, { seed, jitter, step });
const dense = (pts: Pt[], seed: number, jitter = 1) => sketch(pts, { seed, jitter, step: 100 });
const line = (pts: Pt[], seed: number, jitter = 1) => sketch(pts, { closed: false, seed, jitter, step: 16 });

const lerp = (keys: [number, number][], y: number) => {
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i][0]) {
      const [y0, x0] = keys[i - 1], [y1, x1] = keys[i];
      return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
  }
  return keys[keys.length - 1][1];
};

// Long wavy hair: scalloped lobes down both sides, hidden under the jacket at the bottom.
function hairPoints(): Pt[] {
  const left: [number, number][] = [[20, 98], [70, 64], [120, 48], [190, 30], [260, 22], [340, 40]];
  const right: [number, number][] = [[20, 222], [70, 258], [120, 280], [190, 290], [260, 296], [340, 286]];
  const lobe = (y: number) => 13 * Math.abs(Math.sin((Math.PI * (y - 30)) / 66));
  const pts: Pt[] = [[98, 22], [118, 8], [150, 2], [186, 3], [220, 10], [246, 22]];
  for (let y = 40; y <= 340; y += 6) pts.push([lerp(right, y) + lobe(y), y]);
  pts.push([280, 352], [160, 358], [48, 352]);
  for (let y = 340; y >= 40; y -= 6) pts.push([lerp(left, y) - lobe(y), y]);
  return pts;
}

const shoeBase: Pt[] = [[94, 706], [126, 702], [134, 720], [168, 738], [194, 750], [202, 762], [198, 768], [84, 768], [76, 758], [80, 732]];
const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);
const shoe = (dx: number, dy: number, seed: number) => ({
  body: closed(shift(shoeBase, dx, dy), seed, 1.1, 14),
  sole: line([[78 + dx, 761 + dy], [200 + dx, 761 + dy]], seed + 1, 0.6),
  laces: [
    line([[118 + dx, 722 + dy], [132 + dx, 730 + dy]], seed + 2, 0.3),
    line([[126 + dx, 732 + dy], [141 + dx, 740 + dy]], seed + 3, 0.3),
    line([[136 + dx, 742 + dy], [152 + dx, 750 + dy]], seed + 4, 0.3),
  ],
});

export const SHAPES = {
  hairBack: closed(hairPoints(), 3, 1, 100),
  hairLines: [
    line([[82, 92], [66, 150], [60, 210]], 11, 1),
    line([[252, 112], [284, 170], [290, 240]], 12, 1),
    line([[112, 34], [140, 20]], 13, 0.5),
  ],

  trousers: closed([[62, 466], [254, 464], [257, 596], [60, 596]], 21),
  legLeft: closed([[62, 556], [153, 562], [151, 688], [60, 694]], 22),
  legRight: closed([[157, 562], [255, 556], [257, 684], [158, 690]], 23),
  ankleLeft: closed([[96, 690], [126, 690], [126, 712], [96, 712]], 24, 0.6),
  ankleRight: closed([[186, 686], [216, 686], [216, 708], [186, 708]], 25, 0.6),
  creaseLeft: line([[100, 592], [97, 668]], 26, 0.8),
  creaseRight: line([[206, 590], [210, 660]], 27, 0.8),

  shoeLeft: shoe(0, 0, 30),
  shoeRight: shoe(85, -5, 40),

  tee: closed([[140, 358], [201, 360], [209, 468], [132, 468]], 50),
  top: closed([[142, 192], [158, 204], [172, 210], [186, 204], [198, 192], [201, 360], [139, 358]], 51, 1.2, 14),
  neck: closed([[152, 186], [190, 186], [188, 220], [154, 220]], 52, 0.8),

  head: dense([[104, 98], [118, 70], [148, 54], [184, 50], [218, 58], [243, 84], [250, 124], [242, 160], [218, 186], [184, 200], [152, 196], [126, 178], [108, 150], [100, 122]], 60, 0.9),
  ear: dense(ellipse(101, 139, 16, 19, 10), 61, 0.6),
  earInner: line([[96, 130], [104, 138], [98, 148]], 62, 0.4),
  earring: dense(ellipse(106, 176, 8.5, 8.5, 9), 63, 0.4),
  earringStem: line([[104, 156], [105, 168]], 64, 0.3),
  eyeLeft: dense(ellipse(168, 108, 6.5, 8.5, 8), 65, 0.2),
  eyeRight: dense(ellipse(205, 108, 6.5, 8.5, 8), 66, 0.2),
  nose: line([[184, 127], [189, 138], [182, 141]], 67, 0.3),
  blushLeft: dense(ellipse(134, 148, 15, 10, 8), 68, 0.4),
  blushRight: dense(ellipse(226, 144, 15, 10, 8), 69, 0.4),
  fringe: [line([[178, 54], [185, 74], [188, 92]], 70, 0.5), line([[190, 54], [197, 72]], 71, 0.5)],

  jacketLeft: closed([[140, 194], [106, 190], [84, 206], [62, 262], [38, 336], [14, 434], [28, 454], [62, 458], [72, 474], [114, 484], [128, 480], [132, 360], [138, 260]], 80, 1.6),
  jacketRight: closed([[190, 190], [226, 190], [250, 224], [272, 300], [296, 440], [292, 476], [250, 486], [190, 480], [186, 360], [188, 260]], 81, 1.6),
  foldsLeft: [line([[62, 352], [64, 436]], 82, 0.8), line([[104, 264], [112, 350]], 83, 0.8), line([[30, 438], [48, 448]], 84, 0.5)],
  foldsRight: [line([[228, 256], [268, 380]], 85, 0.8), line([[276, 420], [280, 452]], 86, 0.6)],
  glint: line([[224, 376], [243, 430]], 87, 0.5),

  hand: dense([[70, 476], [108, 478], [116, 500], [104, 520], [80, 518], [66, 498]], 90, 0.6),
  fingers: [line([[80, 500], [102, 506]], 91, 0.3), line([[80, 508], [100, 513]], 92, 0.3)],

  bagHandle: line([[38, 552], [38, 524], [60, 507], [82, 506], [106, 509], [124, 526], [126, 552]], 95, 0.8),
  bagBody: closed([[24, 548], [142, 548], [160, 614], [150, 640], [18, 644], [4, 612]], 96, 1.4),
  bagZip: line([[28, 566], [128, 562]], 97, 0.6),
  bagTab: line([[12, 588], [40, 584]], 98, 0.4),
  bagSeam: line([[42, 592], [46, 634]], 99, 0.5),

  // free arm, drawn pointing right from the shoulder (origin 0,0); posed by rotation
  sleeve: closed([[0, -24], [70, -34], [120, -30], [130, 0], [122, 34], [70, 32], [0, 32]], 100, 1.4),
  sleeveFold: line([[40, -16], [44, 22]], 101, 0.5),
  armHand: dense([[124, -12], [146, -16], [200, -11], [205, -3], [152, 3], [148, 14], [124, 16]], 102, 0.5),
  thumb: line([[140, -16], [150, -30]], 103, 0.3),

  flicks: [
    line([[70, 752], [54, 740]], 110, 0.3), line([[120, 764], [112, 748]], 111, 0.3),
    line([[230, 760], [248, 745]], 112, 0.3), line([[196, 767], [208, 750]], 113, 0.3),
  ],
  bubble: closed([[0, 0], [250, 0], [254, 6], [254, 70], [248, 76], [60, 76], [30, 100], [34, 76], [6, 76], [0, 70]], 120, 1.2, 20),
};
