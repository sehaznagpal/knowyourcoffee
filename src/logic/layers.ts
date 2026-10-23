import type { Geom } from '../art-loader/geometry';
import type { Ingredient, Layer } from '../data/drinks';

export const isFloater = (i: Ingredient) => i === 'ice' || i === 'ice-cream';

export type Band = { ing: Ingredient; parts: number; y: number; h: number; top: boolean };

/**
 * Lay layers out bottom to top inside the mask bounds. `capacity` is the number of parts the glass holds;
 * floating items (ice, ice cream) are moved to the top of the stack.
 */
export function bands(layers: Layer[], capacity: number, g: Geom): Band[] {
  const ordered = [...layers.filter((l) => !isFloater(l.ing)), ...layers.filter((l) => isFloater(l.ing))];
  const { y, h } = g.bbox;
  let used = 0;
  return ordered.map((l, i) => {
    const bh = (l.parts / capacity) * h;
    const by = y + h - (used + l.parts) / capacity * h;
    used += l.parts;
    return { ing: l.ing, parts: l.parts, y: by, h: bh, top: i === ordered.length - 1 };
  });
}
