// Which coffees she has looked at closely. Stage 4 builds the bag on this; search already shows a lilac dot for seen ones.
const KEY = 'know-your-coffee:seen:v1';
let seen: Set<string> | null = null;

function load(): Set<string> {
  if (seen) return seen;
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { seen = new Set(); }
  return seen;
}

export const isSeen = (id: string) => load().has(id);
export function markSeen(id: string) {
  const s = load();
  if (s.has(id)) return;
  s.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* storage unavailable: kept for this visit only */ }
}
