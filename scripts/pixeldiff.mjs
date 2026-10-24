import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const W = 1280, H = 832, PORT = 4173;
// Regions [x, y, w, h] excluded from the comparison (e.g. undesigned part of the cup strip).
const MASKS = { landing: [], table: [[0, 270, 1280, 290], [625, 715, 335, 65], [880, 270, 400, 80], [0, 380, 110, 140], [56, 55, 270, 108], [500, 55, 280, 108], [160, 0, 270, 210], // wordmark centred on the screen, hanging board not in reference/table.png
    [20, 384, 64, 64], [1196, 384, 64, 64]] }; // cups 2+ and the tags beyond 'with water' are not designed yet; hint text, arrow buttons and the wrapped last cup at the left edge are not in the design
const SCREENS = [['landing', '/', 'reference/landing.png'], ['table', '/?screen=table&static=1', 'reference/table.png']];

const sh = (cmd, args) => new Promise((res, rej) => spawn(cmd, args, { cwd: root, stdio: 'inherit' }).on('exit', (c) => (c ? rej(new Error(cmd + ' failed')) : res())));
await sh('npm', ['run', 'build']);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

mkdirSync(root + '.diff', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

for (const [name, path, ref] of SCREENS) {
  await page.goto(`http://localhost:${PORT}${path}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const shot = PNG.sync.read(await page.screenshot());
  const exp = PNG.sync.read(readFileSync(root + ref));
  for (const [x, y, w, h] of MASKS[name]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const k = (j * W + i) * 4; for (let c = 0; c < 4; c++) { shot.data[k + c] = 0; exp.data[k + c] = 0; }
  }
  const diff = new PNG({ width: W, height: H });
  const n = pixelmatch(shot.data, exp.data, diff.data, W, H, { threshold: 0.1, includeAA: false });
  writeFileSync(`${root}.diff/${name}.png`, PNG.sync.write(diff));
  // largest mismatch regions: 64px grid cells ranked by count
  const cell = 64, cols = Math.ceil(W / cell), counts = new Map();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (diff.data[(j * W + i) * 4] === 255 && diff.data[(j * W + i) * 4 + 1] === 0) {
    const key = Math.floor(j / cell) * cols + Math.floor(i / cell); counts.set(key, (counts.get(key) || 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c]) => `[x${(k % cols) * cell},y${Math.floor(k / cols) * cell},${cell}x${cell}:${c}px]`);
  console.log(`${name}: ${((n / (W * H)) * 100).toFixed(3)}% mismatch (${n}px) ${top.join(' ')}`);
}
await browser.close();
server.kill();
