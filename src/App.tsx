import { useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { Table } from './components/Table';
import { Gallery } from './gallery/Gallery';
import { FLOOR_Y } from './gallery/layout';
import './gallery/gallery.css';
import { TestModal } from './components/TestModal';
import { installClickSound } from './audio/sound';
import { RotateGate, usePortrait } from './components/RotateGate';

const FRAME = { w: 1280, h: 832 };
const DOOR_CENTER = { x: 700, y: 480 };
const ZOOM_MS = 1000;
const ENTER_MS = 900;
const FADE_MS = 200;

type Phase = 'landing' | 'zoom' | 'table' | 'leaving';

function useStageScale() {
  const calc = () => Math.min(window.innerWidth / FRAME.w, window.innerHeight / FRAME.h);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const staticMode = params.get('static') === '1';
  // the walkable gallery is the world now; ?screen=table still opens the old table for the pixel diff
  const world: 'gallery' | 'table' = params.get('screen') === 'table' ? 'table' : 'gallery';
  const [phase, setPhase] = useState<Phase>(params.get('screen') === 'table' || params.get('screen') === 'gallery' || params.get('test') === '1' ? 'table' : 'landing');
  const [entering, setEntering] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(params.get('test') === '1' && world === 'table'); // in the gallery, ?test=1 starts inside the testing room
  const scale = useStageScale();
  const portrait = usePortrait();
  // while upright, nothing underneath can be reached or focused (and nothing resets)
  useEffect(() => {
    // everything but the gate (the stage, and cards, bag and walkthrough rendered into the body)
    const kids = [...document.body.children].filter((e) => !e.classList.contains('rg') && e.tagName !== 'SCRIPT');
    kids.forEach((e) => (portrait ? e.setAttribute('inert', '') : e.removeAttribute('inert')));
  }, [portrait]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => installClickSound(), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const start = () => {
    if (staticMode) return setPhase('table');
    const reduced = reducedMotion();
    setPhase('zoom');
    later(() => {
      setPhase('table');
      setEntering(true);
      later(() => setEntering(false), reduced ? FADE_MS : ENTER_MS);
    }, reduced ? FADE_MS : ZOOM_MS);
  };

  const goHome = () => {
    if (staticMode) return setPhase('landing');
    setPhase('leaving');
    later(() => {
      setPhase('landing');
      setFadeIn(true);
      later(() => setFadeIn(false), FADE_MS);
    }, FADE_MS);
  };

  const onTable = phase === 'table' || phase === 'leaving';
  const stageTop = (window.innerHeight - FRAME.h * scale) / 2;
  const stageLeft = (window.innerWidth - FRAME.w * scale) / 2;
  const split = stageTop + (world === 'gallery' ? FLOOR_Y : 465) * scale;

  // black circle growing from the door centre to cover the whole screen
  const cx = (window.innerWidth - FRAME.w * scale) / 2 + DOOR_CENTER.x * scale;
  const cy = (window.innerHeight - FRAME.h * scale) / 2 + DOOR_CENTER.y * scale;
  const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
  const showCircle = phase === 'zoom' || entering;

  return (
    <div
      className={`viewport screen-${onTable ? world : 'landing'}`}
      style={{ '--split': `${split}px`, '--s': scale, '--sl': `${stageLeft}px`, '--st': `${stageTop}px` } as React.CSSProperties}
    >
      <div
        className={`stage${phase === 'leaving' ? ' leaving' : ''}${fadeIn ? ' fade-in' : ''}${entering ? ' reveal' : ''}`}
        style={{ width: FRAME.w, height: FRAME.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {onTable ? (
          world === 'gallery' ? (
            <Gallery scale={scale} entering={entering} active={phase === 'table' && !isTestOpen && !portrait} onHome={goHome} onTest={() => setIsTestOpen(true)} />
          ) : (
            <Table scale={scale} entering={entering} active={phase === 'table' && !isTestOpen && !portrait} onHome={goHome} onTest={() => setIsTestOpen(true)} />
          )
        ) : (
          <Landing onStart={start} zooming={phase === 'zoom'} />
        )}
      </div>
      {showCircle ? (
        <div
          className={`wipe ${phase === 'zoom' ? 'grow' : 'out'}`}
          style={{ left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }}
        />
      ) : null}
      {isTestOpen ? <TestModal onClose={() => setIsTestOpen(false)} /> : null}
      <RotateGate portrait={portrait} />
    </div>
  );
}
