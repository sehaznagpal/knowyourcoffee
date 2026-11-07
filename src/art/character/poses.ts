import type { HandKind } from './geometry';

// Leg angles are degrees, positive = forward (toward the way she faces). `lift` raises a foot off the floor;
// leave it out and the foot is planted. Arm angles are absolute screen degrees: 0 = right, 90 = down, -90 = up.
export type Leg = { a: number; lift?: number };
export type Arm = { a1: number; a2: number };
export type Pose = {
  legL: Leg; legR: Leg; // L = screen left, the bag hand's side; R = the free arm's side
  armL: Arm; armR: Arm;
  lean: number; // torso lean, degrees, forward positive
  shiftX: number; // torso shift over the standing leg
  tilt: number; // head tilt, degrees, negative = looking up
  flareR: number; // cuff flare of the free sleeve
  handR: HandKind;
};

export const IDLE: Pose = {
  legL: { a: 9 }, legR: { a: -2 },
  armL: { a1: 99, a2: 98 }, armR: { a1: 79, a2: 84 },
  lean: -1, shiftX: 5, tilt: 2, flareR: 16, handR: 'mitten',
};
const P = (o: Partial<Pose>): Pose => ({ ...IDLE, ...o });

export const POSES = {
  idle: IDLE,
  look: P({ tilt: -10, shiftX: 3, lean: -2 }),
  point: P({ armR: { a1: -33, a2: -33 }, handR: 'point', flareR: 0, tilt: -3, shiftX: 3 }),
  wave: P({ armR: { a1: -30, a2: -98 }, handR: 'open', tilt: 3 }),
  order: P({ armR: { a1: 64, a2: -24 }, tilt: -2 }),
  turn: P({ legL: { a: 3 }, legR: { a: -3 }, shiftX: 0, lean: 0, tilt: 0 }),
};

const W = (o: Partial<Pose>) => P({ lean: 2, shiftX: 0, tilt: 0, ...o });
// contact, passing, contact, passing: legs and arms in opposition
export const WALK: Pose[] = [
  W({ legL: { a: 17 }, legR: { a: -17 }, armL: { a1: 110, a2: 106 }, armR: { a1: 60, a2: 42 } }),
  W({ legL: { a: 0 }, legR: { a: -7, lift: 20 }, armL: { a1: 100, a2: 94 }, armR: { a1: 80, a2: 76 } }),
  W({ legL: { a: -17 }, legR: { a: 17 }, armL: { a1: 84, a2: 56 }, armR: { a1: 97, a2: 102 } }),
  W({ legL: { a: -7, lift: 20 }, legR: { a: 0 }, armL: { a1: 90, a2: 84 }, armR: { a1: 80, a2: 78 } }),
];

const R = (o: Partial<Pose>) => P({ lean: 9, shiftX: 4, tilt: -2, ...o });
export const RUN: Pose[] = [
  R({ legL: { a: 28 }, legR: { a: -36, lift: 30 }, armL: { a1: 114, a2: 112 }, armR: { a1: 58, a2: -46 } }),
  R({ legL: { a: 5 }, legR: { a: 30, lift: 48 }, armL: { a1: 102, a2: 84 }, armR: { a1: 76, a2: 22 } }),
  R({ legR: { a: 28 }, legL: { a: -36, lift: 30 }, armR: { a1: 102, a2: 104 }, armL: { a1: 72, a2: -42 } }),
  R({ legR: { a: 5 }, legL: { a: 30, lift: 48 }, armR: { a1: 86, a2: 70 }, armL: { a1: 92, a2: 64 } }),
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpLeg = (a: Leg, b: Leg, t: number): Leg => ({ a: lerp(a.a, b.a, t), lift: lerp(a.lift ?? 0, b.lift ?? 0, t) || undefined });
const lerpArm = (a: Arm, b: Arm, t: number): Arm => ({ a1: lerp(a.a1, b.a1, t), a2: lerp(a.a2, b.a2, t) });

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    legL: lerpLeg(a.legL, b.legL, t), legR: lerpLeg(a.legR, b.legR, t),
    armL: lerpArm(a.armL, b.armL, t), armR: lerpArm(a.armR, b.armR, t),
    lean: lerp(a.lean, b.lean, t), shiftX: lerp(a.shiftX, b.shiftX, t), tilt: lerp(a.tilt, b.tilt, t),
    flareR: lerp(a.flareR, b.flareR, t), handR: t < 0.5 ? a.handR : b.handR,
  };
}

/** Pose along a 4-pose cycle at `phase` (0..4, one unit per pose). */
export function cyclePose(keys: Pose[], phase: number): Pose {
  const n = keys.length;
  const i = Math.floor(phase) % n;
  const f = phase - Math.floor(phase);
  const e = f * f * (3 - 2 * f); // smoothstep between the key poses
  return lerpPose(keys[i], keys[(i + 1) % n], e);
}
