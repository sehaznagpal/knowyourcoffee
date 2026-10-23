import { LABEL } from '../data/colors';
import { DRINKS, type Drink, type Ingredient, type Layer } from '../data/drinks';

export const CAPACITY = 8;

// The same twelve buttons for every question, so nothing leaks the answer.
export const SHELF: { group: string; items: Ingredient[] }[] = [
  { group: 'Coffee', items: ['espresso', 'drip'] },
  { group: 'Water', items: ['hot-water', 'cold-water', 'ice'] },
  { group: 'Dairy', items: ['cold-milk', 'steamed-milk', 'half-and-half', 'foam', 'whipped-cream', 'ice-cream'] },
  { group: 'Sweet', items: ['chocolate'] },
];
const SHELF_ORDER = SHELF.flatMap((g) => g.items);

// Fixed bottom-to-top order for drinks where pour order does not matter; ice and ice cream float on top.
const DISPLAY_ORDER: Ingredient[] = ['chocolate', 'espresso', 'drip', 'hot-water', 'cold-water', 'steamed-milk', 'cold-milk', 'half-and-half', 'foam', 'whipped-cream', 'ice', 'ice-cream'];

export const countsOf = (items: Ingredient[]) => {
  const c = new Map<Ingredient, number>();
  items.forEach((i) => c.set(i, (c.get(i) ?? 0) + 1));
  return c;
};

export const expand = (layers: Layer[]): Ingredient[] => layers.flatMap((l) => Array<Ingredient>(l.parts).fill(l.ing));

/** Layers to draw for a list of pours (or a drink's layers, expanded). */
export function displayLayers(pours: Ingredient[], orderMatters: boolean): Layer[] {
  if (orderMatters) {
    const out: Layer[] = [];
    for (const ing of pours) {
      const last = out[out.length - 1];
      if (last && last.ing === ing) last.parts++;
      else out.push({ ing, parts: 1 });
    }
    return out;
  }
  const c = countsOf(pours);
  return DISPLAY_ORDER.filter((i) => c.has(i)).map((ing) => ({ ing, parts: c.get(ing)! }));
}

export type Result = { ok: boolean; missing: Layer[]; extra: Layer[]; orderWrong: boolean };

export function check(drink: Drink, pours: Ingredient[]): Result {
  const want = expand(drink.layers);
  const a = countsOf(want), b = countsOf(pours);
  const missing: Layer[] = [], extra: Layer[] = [];
  for (const ing of SHELF_ORDER) {
    const d = (a.get(ing) ?? 0) - (b.get(ing) ?? 0);
    if (d > 0) missing.push({ ing, parts: d });
    if (d < 0) extra.push({ ing, parts: -d });
  }
  const amountsOk = !missing.length && !extra.length;
  const orderWrong = !!drink.orderMatters && amountsOk && want.some((ing, i) => pours[i] !== ing);
  return { ok: amountsOk && !orderWrong, missing, extra, orderWrong };
}

const list = (ls: Layer[]) => ls.map((l) => `${LABEL[l.ing]} x${l.parts}`).join(', ');

export function orderHint(drink: Drink) {
  const names = drink.layers.map((l) => LABEL[l.ing]);
  return `Order matters here: ${names[0]} first, then ${names.slice(1).join(', then ')}.`;
}

export function feedback(drink: Drink, r: Result): string {
  if (r.ok) return 'Spot on.';
  const parts: string[] = [];
  if (r.missing.length) parts.push(`Missing: ${list(r.missing)}.`);
  if (r.extra.length) parts.push(`Too much: ${list(r.extra)}.`);
  if (!r.missing.length && !r.extra.length) parts.push('Right ingredients, wrong order.');
  if (drink.orderMatters) parts.push(orderHint(drink));
  return parts.join(' ');
}

export const hintText = (drink: Drink) =>
  `Hint: ${SHELF_ORDER.filter((i) => drink.layers.some((l) => l.ing === i)).map((i) => LABEL[i]).join(', ')}.`;

/** Random order with no repeats until all drinks were asked; a wrong answer returns 3 to 5 questions later. */
export class Deck {
  private bag: string[] = [];
  private asked = 0;
  private last = '';
  private retries: { id: string; due: number }[] = [];

  constructor(private rand: () => number = Math.random) {}

  next(): Drink {
    this.asked++;
    const dueIdx = this.retries.findIndex((r) => r.due <= this.asked);
    let id: string;
    if (dueIdx >= 0) id = this.retries.splice(dueIdx, 1)[0].id;
    else {
      if (!this.bag.length) this.refill();
      id = this.bag.pop()!;
    }
    this.last = id;
    return DRINKS.find((d) => d.id === id)!;
  }

  report(id: string, ok: boolean) {
    if (!ok) this.retries.push({ id, due: this.asked + 3 + Math.floor(this.rand() * 3) });
  }

  private refill() {
    const waiting = new Set(this.retries.map((r) => r.id));
    const ids = DRINKS.map((d) => d.id).filter((i) => !waiting.has(i));
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const k = ids.indexOf(this.last);
    if (k >= 0 && ids.length > 1) { ids.splice(k, 1); ids.unshift(this.last); } // popped last: keep the repeat away from the start
    this.bag = ids;
  }
}
