import { masks, vessels } from './index';

export type Geom = {
  d: string; // liquid-mask path, in the mask file's own coordinates
  dx: number; // where the mask sits inside the vessel svg
  dy: number;
  bbox: { x: number; y: number; w: number; h: number }; // mask bounds in vessel coordinates
  w: number; // vessel svg size
  h: number;
};

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;
const pathDs = (svg: string) => [...svg.matchAll(/<path[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]);
const cmdsOf = (d: string) => d.replace(/e-?\d+/g, '').replace(/[^a-zA-Z]/g, '');

// The mask file is a translated copy of a path inside the vessel art; find the translation.
function findOffset(vessel: string, maskD: string): [number, number] {
  const mn = maskD.match(NUM)!.map(Number);
  for (const p of pathDs(vessel)) {
    if (cmdsOf(p) !== cmdsOf(maskD)) continue;
    const vn = p.match(NUM)!.map(Number);
    const dx = vn[0] - mn[0], dy = vn[1] - mn[1];
    if (vn.every((x, k) => Math.abs(x - mn[k] - (k % 2 ? dy : dx)) < 0.6)) return [dx, dy];
  }
  throw new Error('liquid mask does not match the vessel art');
}

const cache: Record<string, Geom> = {};

export function geom(id: string): Geom {
  if (cache[id]) return cache[id];
  const vessel = vessels[id];
  const d = pathDs(masks[id])[0];
  const [dx, dy] = findOffset(vessel, d);
  const vb = vessel.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  svg.style.cssText = 'position:absolute;visibility:hidden';
  document.body.appendChild(svg);
  const b = path.getBBox();
  svg.remove();
  return (cache[id] = { d, dx, dy, bbox: { x: b.x + dx, y: b.y + dy, w: b.width, h: b.height }, w: +vb[1], h: +vb[2] });
}
