import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const art = fileURLToPath(new URL('../art/', import.meta.url));
const read = (n) => (existsSync(join(art, n)) ? readFileSync(join(art, n), 'utf8') : null);
const vb = (s) => (s.match(/viewBox="([^"]+)"/) || [])[1] || '-';
const paths = (s) => [...s.matchAll(/<path[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]);
const nums = (d) => d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
const cmds = (d) => d.replace(/e-?\d+/g, '').replace(/[^a-zA-Z]/g, '');

// A mask is a separate svg whose path is a translated copy of a path inside the vessel.
function offset(vessel, mask) {
  const m = paths(mask)[0];
  const mn = nums(m);
  for (const p of paths(vessel)) {
    if (cmds(p) !== cmds(m)) continue;
    const vn = nums(p);
    const dx = vn[0] - mn[0], dy = vn[1] - mn[1];
    if (vn.every((x, k) => Math.abs(x - mn[k] - (k % 2 ? dy : dx)) < 0.6)) return [+dx.toFixed(2), +dy.toFixed(2)];
  }
  return null;
}

const rows = [];
for (const n of ['landing.svg', 'table.svg', 'frames.svg']) {
  const s = read(n);
  rows.push([n, s ? s.length : 'MISSING', s ? vb(s) : '-', '-', '-']);
}
const pairs = [['vessel/01.svg', 'vessel/liquid-mask_01.svg'], ['vessel/02.svg', 'vessel/liquid-mask_02.svg'],
  ['vessel/03.svg', 'vessel/liquid-mask_03.svg'], ['test-glass.svg', 'liquid-mask_test-glass.svg']];
for (const [v, m] of pairs) {
  const vs = read(v), ms = read(m);
  if (!vs || !ms) { rows.push([v, vs ? vs.length : 'MISSING', '-', ms ? vb(ms) : 'MASK MISSING', '-']); continue; }
  rows.push([v, vs.length, vb(vs), `mask ${vb(ms)}`, JSON.stringify(offset(vs, ms) ?? 'NO MATCH')]);
}
console.log('file | bytes | viewBox | mask viewBox | mask offset in vessel');
rows.forEach((r) => console.log(r.join(' | ')));
if (rows.some((r) => String(r[1]) === 'MISSING' || String(r[3]).includes('MISSING') || r[4] === '"NO MATCH"')) process.exitCode = 1;
