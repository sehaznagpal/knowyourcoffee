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
  legL: { a: 1.5 }, legR: { a: -1.5 },
  armL: { a1: 98.35, a2: 98.35 }, armR: { a1: 82.25, a2: 82.25 },
  lean: -1, shiftX: 5, tilt: 2, flareR: 16, handR: 'mitten',
};
const P = (o: Partial<Pose>): Pose => ({ ...IDLE, ...o });

export const POSES = {
  idle: IDLE,
  look: P({ tilt: -10, shiftX: 3, lean: -2 }),
  point: P({ armR: { a1: -33, a2: -33 }, handR: 'point', flareR: 0, tilt: -3, shiftX: 3 }),
  wave: P({ armR: { a1: -30, a2: -98 }, handR: 'open', tilt: 3 }),
  order: P({ armR: { a1: 64, a2: -24 }, tilt: -2 }),
  cheer: P({ armR: { a1: -72, a2: -96 }, handR: 'open', tilt: -5, shiftX: 2 }),
  turn: P({ legL: { a: 3 }, legR: { a: -3 }, shiftX: 0, lean: 0, tilt: 0 }),
};

// Arms swing against the leg on the same side: about 8 degrees in the walk, 12 in the run; the bag arm only 4. They hang relaxed.
const AR = 82.25, AL = 98.35; // the arms at rest (absolute angles; bigger = further back)
const swing = (rest: number, d: number) => ({ a1: rest + d, a2: rest + d });
const W = (o: Partial<Pose>) => P({ lean: 2, shiftX: 0, tilt: 0, ...o });
// contact, passing, contact, passing
export const WALK: Pose[] = [
  W({ legL: { a: 17 }, legR: { a: -17 }, armL: swing(AL, 4), armR: swing(AR, -8) }),
  W({ legL: { a: 0 }, legR: { a: -7, lift: 20 }, armL: swing(AL, 0), armR: swing(AR, 0) }),
  W({ legL: { a: -17 }, legR: { a: 17 }, armL: swing(AL, -4), armR: swing(AR, 8) }),
  W({ legL: { a: -7, lift: 20 }, legR: { a: 0 }, armL: swing(AL, 0), armR: swing(AR, 0) }),
];

const R = (o: Partial<Pose>) => P({ lean: 9, shiftX: 4, tilt: -2, ...o });
export const RUN: Pose[] = [
  R({ legL: { a: 28 }, legR: { a: -36, lift: 30 }, armL: swing(AL, 4), armR: swing(AR, -12) }),
  R({ legL: { a: 5 }, legR: { a: 30, lift: 48 }, armL: swing(AL, 0), armR: swing(AR, 0) }),
  R({ legR: { a: 28 }, legL: { a: -36, lift: 30 }, armR: swing(AR, 12), armL: swing(AL, -4) }),
  R({ legR: { a: 5 }, legL: { a: 30, lift: 48 }, armR: swing(AR, 0), armL: swing(AL, 0) }),
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
