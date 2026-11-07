// All the sound: one shared AudioContext, a music bus (the looped track) and an effects bus (everything synthesized here, peak about 0.25).
// Nothing plays before the first user gesture, and effects are silent while muted.
import { useSyncExternalStore } from 'react';

const KEY = 'kyc-sound';
const MUSIC_URL = `${import.meta.env.BASE_URL}audio/background.mp3`;
const GAIN = { normal: 0.08, duck: 0.05 };
const FADE_IN = 3, FADE_OUT = 1, XFADE = 2;

let ctx: AudioContext | null = null;
let sfx: GainNode, music: GainNode, noiseBuf: AudioBuffer;
let muted = (() => { try { return localStorage.getItem(KEY) === '0'; } catch { return false; } })();
let ducked = false;
let started = false;
let fadeInDone = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const target = () => (muted ? 0 : ducked ? GAIN.duck : GAIN.normal);
function ramp(sec: number) {
  if (!ctx) return;
  const g = music.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(target(), t + sec);
}

// ---- state ----
export const isMuted = () => muted;
export function useMuted() { return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => muted); }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? '0' : '1'); } catch { /* ignore */ }
  ramp(m ? FADE_OUT : 0.4);
  emit();
}
export const toggleMuted = () => setMuted(!muted);
/** Lower the music while a card, the bag or the walkthrough is open. */
export function setDuck(d: boolean) { if (d === ducked) return; ducked = d; if (fadeInDone) ramp(0.4); }

// ---- starting: only from a user gesture ----
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    sfx = ctx.createGain(); sfx.gain.value = 0.25; sfx.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0; music.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  if (!started) { started = true; loadMusic(); }
}
/** For screens reached without the landing: the first gesture anywhere starts the audio. */
export function armGestureUnlock() {
  const go = () => { unlock(); off(); };
  const off = () => { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); };
  document.addEventListener('pointerdown', go, true);
  document.addEventListener('keydown', go, true);
}

// ---- music: the track loops with a 2 s crossfade at the loop point ----
async function loadMusic() {
  try {
    const buf = await ctx!.decodeAudioData(await (await fetch(MUSIC_URL)).arrayBuffer());
    startLoop(buf);
  } catch { /* no music: effects still work */ }
}
function startLoop(buf: AudioBuffer) {
  const c = ctx!, dur = buf.duration;
  const up = new Float32Array(64).map((_, i) => Math.sin((i / 63) * Math.PI / 2));
  const down = new Float32Array(64).map((_, i) => Math.cos((i / 63) * Math.PI / 2));
  let nextAt = c.currentTime + 0.1, first = true;
  const schedule = () => {
    const t = nextAt;
    const s = c.createBufferSource(); s.buffer = buf;
    const g = c.createGain();
    if (first) g.gain.setValueAtTime(1, t); else g.gain.setValueCurveAtTime(up, t, XFADE);
    g.gain.setValueCurveAtTime(down, t + dur - XFADE, XFADE);
    s.connect(g).connect(music); s.start(t);
    first = false;
    nextAt = t + dur - XFADE;
  };
  schedule();
  // fade in over 3 s from the moment the music starts
  music.gain.cancelScheduledValues(c.currentTime);
  music.gain.setValueAtTime(0, c.currentTime);
  music.gain.linearRampToValueAtTime(target(), c.currentTime + FADE_IN);
  window.setTimeout(() => { fadeInDone = true; ramp(0); }, FADE_IN * 1000);
  window.setInterval(() => { if (c.currentTime > nextAt - 8) schedule(); }, 1000);
}

// ---- synthesis helpers ----
const live = () => !!ctx && !muted && ctx.state === 'running';
type NoiseOpt = { type: BiquadFilterType; f0: number; f1?: number; q?: number; gain: number; dur: number; at?: number; attack?: number; shape?: 'decay' | 'swell' | 'flat'; am?: [number, number] };
function noise(o: NoiseOpt) {
  const c = ctx!, t = c.currentTime + (o.at ?? 0), a = o.attack ?? 0.006;
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  src.loopStart = Math.random(); src.loopEnd = 2;
  const f = c.createBiquadFilter(); f.type = o.type; f.Q.value = o.q ?? 0.8;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  if (o.shape === 'swell') { g.gain.exponentialRampToValueAtTime(o.gain, t + o.dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur); }
  else if (o.shape === 'flat') { g.gain.exponentialRampToValueAtTime(o.gain, t + 0.04); g.gain.setValueAtTime(o.gain, t + o.dur - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur); }
  else { g.gain.exponentialRampToValueAtTime(o.gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur); }
  if (o.am) { // a flutter: an oscillator wobbling the level
    const lfo = c.createOscillator(), d = c.createGain();
    lfo.frequency.value = o.am[0]; d.gain.value = o.gain * o.am[1];
    lfo.connect(d).connect(g.gain); lfo.start(t); lfo.stop(t + o.dur + 0.05);
  }
  src.connect(f).connect(g).connect(sfx);
  src.start(t); src.stop(t + o.dur + 0.05);
}
type OscOpt = { type?: OscillatorType; f0: number; f1?: number; gain: number; dur: number; at?: number; attack?: number; lfo?: [number, number] };
function osc(o: OscOpt) {
  const c = ctx!, t = c.currentTime + (o.at ?? 0);
  const s = c.createOscillator(); s.type = o.type ?? 'sine';
  s.frequency.setValueAtTime(o.f0, t);
  if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  if (o.lfo) { const l = c.createOscillator(), d = c.createGain(); l.frequency.value = o.lfo[0]; d.gain.value = o.lfo[1]; l.connect(d).connect(s.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
  s.connect(g).connect(sfx);
  s.start(t); s.stop(t + o.dur + 0.05);
}
const jitter = (v: number, p = 0.12) => v * (1 + (Math.random() * 2 - 1) * p);

// ---- the effects ----
let lastSpecial = 0;
const special = () => { lastSpecial = performance.now(); };

export const play = {
  /** A soft muffled tap on each foot contact; quicker and a little lighter when running. */
  step(run: boolean) {
    if (!live()) return;
    noise({ type: 'lowpass', f0: jitter(run ? 420 : 340), q: 0.7, gain: run ? 0.5 : 0.42, dur: 0.07 });
    osc({ f0: jitter(run ? 110 : 90), f1: 55, gain: run ? 0.5 : 0.4, dur: 0.08 });
  },
  /** Landing door and testing-room door: a soft wooden open with a latch click. */
  door() {
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 260, f1: 180, q: 3, gain: 0.35, dur: 0.22, shape: 'swell' });
    osc({ type: 'triangle', f0: 150, f1: 118, gain: 0.25, dur: 0.22 });
    noise({ type: 'highpass', f0: 2600, q: 1, gain: 0.35, dur: 0.012, at: 0.0 });
    noise({ type: 'highpass', f0: 2200, q: 1, gain: 0.3, dur: 0.012, at: 0.13 });
    osc({ f0: 900, f1: 600, gain: 0.12, dur: 0.05, at: 0.13 });
  },
  /** A quick soft pencil-scribble whoosh out, and the same in reverse coming in. */
  teleportOut() {
    if (reduced()) { play.click(); return; }
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 3200, f1: 700, q: 1.2, gain: 0.5, dur: 0.33, am: [38, 0.6] });
  },
  teleportIn() {
    if (reduced()) return;
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 700, f1: 3200, q: 1.2, gain: 0.5, dur: 0.33, shape: 'swell', am: [38, 0.6] });
  },
  /** A soft paper tap on buttons, pills, arrows and frames. */
  click() {
    if (!live() || performance.now() - lastSpecial < 90) return;
    noise({ type: 'bandpass', f0: jitter(1900, 0.05), q: 1.1, gain: 0.5, dur: 0.035 });
    osc({ f0: 240, f1: 170, gain: 0.18, dur: 0.04 });
  },
  /** The light tap on the walkthrough's "next". */
  next() {
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 2600, q: 1.2, gain: 0.4, dur: 0.03 });
    osc({ f0: 330, f1: 260, gain: 0.12, dur: 0.04 });
  },
  /** A short paper flick. */
  flip() {
    if (!live()) return; special();
    noise({ type: 'highpass', f0: 4200, f1: 1800, q: 0.7, gain: 0.45, dur: 0.09 });
    noise({ type: 'bandpass', f0: 1400, q: 1, gain: 0.2, dur: 0.05, at: 0.05 });
  },
  /** A card opening: a soft slide. */
  cardOpen() {
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 500, f1: 1300, q: 0.9, gain: 0.35, dur: 0.2, shape: 'swell' });
  },
  /** The bag: a soft fabric rustle (rising when it opens, falling when it closes). */
  bag(open: boolean) {
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: open ? 900 : 1500, f1: open ? 1500 : 800, q: 0.6, gain: 0.4, dur: 0.26, shape: 'swell', am: [23, 0.7] });
  },
  /** A quick soft reverse swish for undo and clear. */
  swish() {
    if (!live()) return; special();
    noise({ type: 'bandpass', f0: 800, f1: 2800, q: 0.9, gain: 0.35, dur: 0.16, shape: 'swell' });
  },
  /** One character of pour per ingredient, about 400 ms. */
  pour(ing: string) {
    if (!live()) return; special();
    switch (ing) {
      case 'espresso': case 'drip':
        noise({ type: 'lowpass', f0: 520, q: 0.8, gain: 0.55, dur: 0.4, shape: 'flat', am: [9, 0.5] });
        osc({ f0: 95, gain: 0.3, dur: 0.4, lfo: [7, 12] });
        break;
      case 'hot-water':
        noise({ type: 'bandpass', f0: 2300, q: 0.9, gain: 0.4, dur: 0.4, shape: 'flat', am: [14, 0.3] });
        noise({ type: 'highpass', f0: 6500, q: 0.7, gain: 0.18, dur: 0.4, shape: 'swell' });
        break;
      case 'cold-water':
        noise({ type: 'bandpass', f0: 3400, q: 1.4, gain: 0.4, dur: 0.4, shape: 'flat', am: [16, 0.25] });
        break;
      case 'ice':
        [0, 0.12, 0.26].forEach((at, i) => {
          const f = jitter(2300 + i * 350, 0.08);
          osc({ f0: f, gain: 0.3, dur: 0.1, at, attack: 0.002 });
          osc({ f0: f * 1.52, gain: 0.14, dur: 0.07, at, attack: 0.002 });
        });
        break;
      case 'steamed-milk': case 'cold-milk': case 'half-and-half':
        noise({ type: 'bandpass', f0: 1100, q: 0.7, gain: 0.45, dur: 0.4, shape: 'flat', am: [8, 0.2] });
        noise({ type: 'lowpass', f0: 1800, q: 0.6, gain: 0.2, dur: 0.4, shape: 'flat' });
        break;
      case 'foam':
        noise({ type: 'highpass', f0: 5200, q: 0.6, gain: 0.28, dur: 0.4, shape: 'swell', am: [31, 0.6] });
        break;
      case 'whipped-cream':
        noise({ type: 'highpass', f0: 3600, f1: 2400, q: 0.7, gain: 0.5, dur: 0.14 });
        break;
      case 'chocolate':
        noise({ type: 'lowpass', f0: 300, q: 0.9, gain: 0.5, dur: 0.4, shape: 'flat', am: [5, 0.6] });
        osc({ f0: 80, gain: 0.35, dur: 0.4, lfo: [5, 9] });
        break;
      case 'ice-cream':
        osc({ f0: 320, f1: 110, gain: 0.5, dur: 0.14 });
        noise({ type: 'lowpass', f0: 700, q: 0.8, gain: 0.25, dur: 0.12 });
        break;
      default:
        noise({ type: 'bandpass', f0: 1500, q: 0.8, gain: 0.35, dur: 0.4, shape: 'flat' });
    }
  },
  /** NAILED IT: a warm two-note chime and a stamp thud. */
  nailed() {
    if (!live()) return; special();
    [[392, 0], [523.25, 0.14]].forEach(([f, at]) => {
      osc({ type: 'triangle', f0: f, gain: 0.3, dur: 0.7, at, attack: 0.01 });
      osc({ f0: f * 2, gain: 0.08, dur: 0.5, at, attack: 0.01 });
    });
    osc({ f0: 100, f1: 48, gain: 0.6, dur: 0.18, at: 0.3 });
    noise({ type: 'lowpass', f0: 400, q: 0.8, gain: 0.3, dur: 0.1, at: 0.3 });
  },
  /** NOT QUITE: a single low soft thud. */
  notQuite() {
    if (!live()) return; special();
    osc({ f0: 115, f1: 62, gain: 0.5, dur: 0.24, attack: 0.012 });
    noise({ type: 'lowpass', f0: 300, q: 0.8, gain: 0.18, dur: 0.1 });
  },
};

/** The soft paper tap for every button, pill, arrow and frame; effects with their own sound call `special` first. */
export function installClickSound() {
  const on = (e: MouseEvent) => {
    if ((e.target as Element).closest?.('button, [role="button"], a, summary')) play.click();
  };
  document.addEventListener('click', on);
  return () => document.removeEventListener('click', on);
}
