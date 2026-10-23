const KEY = 'know-your-coffee:progress:v1';

export type Progress = { built: string[]; attempts: number; correct: number; streak: number; bestStreak: number };

export const EMPTY: Progress = { built: [], attempts: 0, correct: 0, streak: 0, bestStreak: 0 };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable: progress lasts for this visit only */ }
}

export function recordAnswer(p: Progress, drinkId: string, ok: boolean): Progress {
  const streak = ok ? p.streak + 1 : 0;
  const next: Progress = {
    built: ok && !p.built.includes(drinkId) ? [...p.built, drinkId] : p.built,
    attempts: p.attempts + 1,
    correct: p.correct + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
  };
  save(next);
  return next;
}

export function resetProgress(): Progress {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return { ...EMPTY };
}
