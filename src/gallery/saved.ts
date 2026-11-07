// What she has looked at closely, plus the tour position. Mastered drinks come from the quiz (storage.ts, `built`).
// Everything is wrapped in try/catch: without storage the state just lasts for this visit.
const SEEN = 'know-your-coffee:seen:v1';
const TOUR = 'know-your-coffee:tour:v1';
let seen: Set<string> | null = null;
let tourAt: number | null | undefined;

function load(): Set<string> {
  if (seen) return seen;
  try { seen = new Set(JSON.parse(localStorage.getItem(SEEN) ?? '[]')); } catch { seen = new Set(); }
  return seen;
}

export const seenIds = () => [...load()];
export const isSeen = (id: string) => load().has(id);
/** Returns true when the card was new to the bag. */
export function markSeen(id: string): boolean {
  const s = load();
  if (s.has(id)) return false;
  s.add(id);
  try { localStorage.setItem(SEEN, JSON.stringify([...s])); } catch { /* ignore */ }
  return true;
}

export function getTourAt(): number | null {
  if (tourAt !== undefined) return tourAt;
  try { const v = localStorage.getItem(TOUR); tourAt = v === null ? null : Number(v); } catch { tourAt = null; }
  return tourAt;
}
export function setTourAt(i: number | null) {
  tourAt = i;
  try { if (i === null) localStorage.removeItem(TOUR); else localStorage.setItem(TOUR, String(i)); } catch { /* ignore */ }
}

export function clearSeenAndTour() {
  seen = new Set();
  tourAt = null;
  try { localStorage.removeItem(SEEN); localStorage.removeItem(TOUR); } catch { /* ignore */ }
}
