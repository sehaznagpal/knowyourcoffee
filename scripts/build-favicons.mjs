// Renders public/favicon.svg (from the Figma favicon node) into every icon size, and writes favicon.ico and the web manifest.
import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync('public/favicon.svg', 'utf8');
const BEIGE = '#F4F0E4';
const b = await chromium.launch();
async function png(file, size, { bg = null, art = 1 } = {}) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  const a = Math.round(size * art);
  await p.setContent(`<body style="margin:0;width:${size}px;height:${size}px;background:${bg ?? 'transparent'};display:flex;align-items:center;justify-content:center">${svg.replace('<svg', `<svg style="width:${a}px;height:${a}px;display:block"`)}</body>`);
  const buf = await p.screenshot({ omitBackground: !bg });
  fs.writeFileSync(`public/${file}`, buf); await p.close(); return buf;
}
const p16 = await png('favicon-16x16.png', 16);
const p32 = await png('favicon-32x32.png', 32);
const p48 = await png('favicon-48.tmp.png', 48);
fs.unlinkSync('public/favicon-48.tmp.png');
await png('apple-touch-icon.png', 180, { bg: BEIGE, art: 0.85 });
await png('icon-192.png', 192);
await png('icon-512.png', 512);
await b.close();
// favicon.ico with 16, 32 and 48 px PNG images
const imgs = [[16, p16], [32, p32], [48, p48]];
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let off = 6 + 16 * imgs.length;
const dir = imgs.map(([s, d]) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(d.length, 8); e.writeUInt32LE(off, 12); off += d.length; return e; });
fs.writeFileSync('public/favicon.ico', Buffer.concat([head, ...dir, ...imgs.map(([, d]) => d)]));
fs.writeFileSync('public/site.webmanifest', JSON.stringify({
  name: 'Know Your Coffee', short_name: 'Know Your Coffee',
  icons: [{ src: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' }],
  theme_color: BEIGE, background_color: BEIGE, display: 'standalone',
}, null, 2) + '\n');
console.log('ok');
