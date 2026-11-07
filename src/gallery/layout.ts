import { DRINKS, type Category, type Drink, type VesselId } from '../data/drinks';
import { VESSEL_SIZE } from '../data/layout';

// Stage units (the 1280 x 832 frame). One unit = one px at stage scale.
export const STAGE_W = 1280;
export const STAGE_H = 832;
export const FLOOR_Y = 540; // wall above, floor below
export const FEET_Y = 710; // her feet
export const CHAR_H = 316; // 38% of the stage height
export const CHAR_W = Math.round((CHAR_H * 316) / 768);
export const WALK_SPEED = 320; // stage px/s: about 360 px/s on a 1440 px wide window
export const PROXIMITY = 120;
export const DEAD_ZONE = 0.1; // she can move 10% of the screen before the camera follows
export const FOREGROUND_PARALLAX = 1.25;

// ---- frames: the two wall frames from art/frames.svg, cropped, with the beans / heart covered by a patch of mat colour ----
export type FrameKind = 'blue' | 'paper';
export const FRAME_ART = {
  blue: { crop: [0, 0, 131, 162], inner: { cx: 65.4, cy: 80.7, w: 108, h: 139 }, cover: { x: 36, y: 48, w: 65, h: 64, fill: '#8fe5ff' }, maxH: 270 },
  paper: { crop: [169, 50, 125, 154], inner: { cx: 62, cy: 77, w: 106, h: 134 }, cover: { x: 25, y: 43, w: 76, h: 75, fill: '#f7f5f1' }, maxH: 270 },
} as const;
const BASE_SCALE: Record<VesselId, number> = { '01': 1.6, '02': 1.45, '03': 1.35 };
export const FRAME_BOTTOM = 290; // frames hang with their lower edge about here; placards sit under them

export type FramePlace = {
  id: string;
  drink: Drink;
  x: number; // world x of the frame centre
  kind: FrameKind;
  s: number; // frame art scale
  w: number; h: number; top: number; rot: number;
};

function place(drink: Drink, x: number, i: number): FramePlace {
  const kind: FrameKind = i % 2 === 0 ? 'blue' : 'paper';
  const art = FRAME_ART[kind];
  const v = VESSEL_SIZE[drink.vessel];
  const need = Math.max((v.w + 36) / art.inner.w, (v.h + 36) / art.inner.h);
  const cap = art.maxH / art.crop[3];
  const s = Math.max(Math.min(BASE_SCALE[drink.vessel] + (i % 3) * 0.05, cap), need);
  const w = art.crop[2] * s, h = art.crop[3] * s;
  const dy = [-6, 8, -10, 4, -2, 10, -8, 2][i % 8]; // hung by hand
  const rot = [-0.7, 0.6, 0.3, -0.5, 0.8, -0.3, 0.5, -0.8][i % 8];
  return { id: drink.id, drink, x, kind, s, w, h, top: FRAME_BOTTOM - h + dy, rot };
}

// ---- layout, left to right. Stage 1 builds the lobby and the with-milk wing; the other wings slot in between later. ----
export const LOBBY_W = 1250;
export const ARCH_W = 240;
export const FIRST_FRAME_GAP = 200;
export const FRAME_PITCH = 384;

export type Wing = { category: Category; archX: number; frames: FramePlace[]; end: number };

function wing(category: Category, archX: number): Wing {
  const drinks = DRINKS.filter((d) => d.category === category);
  const x0 = archX + ARCH_W + FIRST_FRAME_GAP;
  const frames = drinks.map((d, i) => place(d, x0 + i * FRAME_PITCH, i));
  return { category, archX, frames, end: frames[frames.length - 1].x + 300 };
}

export const CATEGORY_ORDER: Category[] = ['shots', 'with water', 'with drip', 'with milk', 'cold & sweet'];
export const WINGS: Wing[] = (() => {
  let x = LOBBY_W;
  return CATEGORY_ORDER.map((c) => {
    const w = wing(c, x);
    x = w.end;
    return w;
  });
})();
export const CORRIDOR_END = WINGS[WINGS.length - 1].end;
export const WORLD_W = CORRIDOR_END + 420; // the testing room closes the corridor
export const FRAMES: FramePlace[] = WINGS.flatMap((w) => w.frames);

// lobby fixtures
export const DOOR_X = 190; // entrance, back to the landing
export const START_X = 470;
export const TOUR_X = 610; // "take the tour" sign
export const DIRECTORY_X = 880; // the map, drawn on the wall
export const TEST_DOOR_X = WORLD_W - 190; // the testing room door at the end of the corridor
export const LAMPS = [700, ...WINGS.map((w) => w.frames[0].x + 192)];

export type Room = { id: string; label: string; x0: number; x1: number; enter: number };
const SHORT: Record<Category, string> = { shots: 'shots', 'with water': 'water', 'with drip': 'drip', 'with milk': 'milk', 'cold & sweet': 'sweet' };
export const ROOMS: Room[] = [
  { id: 'lobby', label: 'lobby', x0: 0, x1: LOBBY_W, enter: START_X },
  ...WINGS.map((w) => ({ id: w.category, label: SHORT[w.category], x0: w.archX, x1: w.end, enter: w.archX + ARCH_W / 2 })),
  { id: 'testing', label: 'test', x0: CORRIDOR_END, x1: WORLD_W, enter: TEST_DOOR_X - 90 },
];

export const recipeLine = (d: Drink, label: (i: Drink['layers'][number]['ing']) => string) =>
  d.layers.map((l) => `${label(l.ing)} ${l.parts}`).join(' · ');

// a tiny seeded random, for floorboards
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
