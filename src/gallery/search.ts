import { DRINKS, type Drink } from '../data/drinks';

/** Lower case, no accents, no spaces or hyphens: "Café au lait" and "cafe-au-lait" both become "cafeaulait". */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const INDEX = DRINKS.map((d) => ({ d, keys: [d.name, ...d.aliases].map(norm) }));

export type Result = { drink: Drink; score: number };

/** Drinks whose name or alias matches what has been typed so far, best first. */
export function search(query: string): Result[] {
  const q = norm(query);
  if (!q) return [];
  const out: Result[] = [];
  INDEX.forEach(({ d, keys }, order) => {
    let best = 0;
    for (const k of keys) {
      if (k === q) best = Math.max(best, 100);
      else if (k.startsWith(q)) best = Math.max(best, 80);
      else if (k.includes(q)) best = Math.max(best, 60);
    }
    if (best) out.push({ drink: d, score: best * 100 - order });
  });
  return out.sort((a, b) => b.score - a.score);
}

function distance(a: string, b: string) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** When nothing matches: the three closest drink names. */
export function closest(query: string, n = 3): Drink[] {
  const q = norm(query);
  return INDEX
    .map(({ d, keys }) => ({ d, dist: Math.min(...keys.map((k) => distance(q, k.slice(0, Math.max(q.length, 3))))) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n)
    .map((o) => o.d);
}
