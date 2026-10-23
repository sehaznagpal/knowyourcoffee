import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const art = fileURLToPath(new URL('../art/', import.meta.url));
const has = (s, id) => new RegExp(`\\bid="${id}"`).test(s);
const rows = [];
const add = (name, req, opt = []) => {
  const p = join(art, name);
  if (!existsSync(p)) return rows.push([name, 'MISSING', '-', req.join(','), '']);
  const s = readFileSync(p, 'utf8');
  const vb = (s.match(/viewBox="([^"]+)"/) || [])[1] || '-';
  const miss = req.filter((i) => !has(s, i));
  const opts = opt.filter((i) => has(s, i));
  rows.push([name, String(s.length), vb, miss.length ? 'MISSING: ' + miss.join(',') : 'ok', opts.join(',')]);
};
add('landing.svg', ['door']);
add('table.svg', []);
add('frames.svg', []);
const vdir = join(art, 'vessel');
const files = existsSync(vdir) ? readdirSync(vdir).filter((f) => f.endsWith('.svg')).sort() : [];
files.forEach((f) => add(`vessel/${f}`, ['liquid-mask', 'outline'], ['back']));
add('test-glass.svg', ['liquid-mask', 'outline']);
console.log(['file', 'bytes', 'viewBox', 'required ids', 'optional'].join(' | '));
rows.forEach((r) => console.log(r.join(' | ')));
if (rows.some((r) => r[3].startsWith('MISSING') || r[1] === 'MISSING')) process.exitCode = 1;
