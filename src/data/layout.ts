import type { VesselId } from './drinks';

// Frame px, measured from the Figma "home" frame.
export const SLOT_PITCH = 187.5;
export const FIRST_CENTER = 172; // centre of the first cup (vessel/03 at x=124, w=96)
export const VESSEL_SIZE: Record<VesselId, { w: number; h: number; top: number }> = {
  '03': { w: 96, h: 80, top: 437 },
  '02': { w: 96, h: 133, top: 383 },
  '01': { w: 152, h: 94, top: 420 },
};
// Tag position relative to the centre of the first cup in its group (x) and absolute y.
export const TAG_POS: Record<string, { dx: number; y: number }> = {
  shots: { dx: -107, y: 290 },
  'with water': { dx: -13.5, y: 294 },
};
export const TAG_DEFAULT = { dx: -107, y: 290 };
export const slotCenter = (slot: number) => FIRST_CENTER + slot * SLOT_PITCH;
