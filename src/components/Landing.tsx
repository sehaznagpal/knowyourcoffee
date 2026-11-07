import { useEffect, useRef, useState } from 'react';
import { landing } from '../art-loader';
import { AnimatedCharacter } from '../art/character/Character';

type Props = { onStart: () => void; zooming: boolean };

// Door box in frame px, read from reference/landing.png.
const DOOR = { left: 632, top: 312, width: 136, height: 336 };
const CHAR_H = 215; // the scale of the café chairs: she is a little taller than the chair backs
const FEET = 700; // the pavement
const HOME_X = 574; // between the A-frame sign and the door
const DOOR_X = 700; // the middle of the door
const WALK_MS = 800;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Landing({ onStart, zooming }: Props) {
  const [phase, setPhase] = useState<'idle' | 'walk' | 'in'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const tap = () => {
    if (zooming) return;
    // a second tap skips the walk, and so does reduced motion
    if (phase !== 'idle' || reduced()) { timers.current.forEach(clearTimeout); timers.current = []; setPhase('in'); onStart(); return; }
    setPhase('walk');
    timers.current.push(window.setTimeout(() => setPhase('in'), WALK_MS));
    timers.current.push(window.setTimeout(onStart, WALK_MS + 220));
  };

  return (
    <div className={`landing${zooming ? ' zooming' : ''}`}>
      <div className="landing-art" dangerouslySetInnerHTML={{ __html: landing }} />
      <p className="landing-sign">never sure what coffee to order? welcome to the coffee tour to walk around, understand what goes in each cup, and make your next order easy!</p>
      <div className={`landing-char${phase === 'in' ? ' is-in' : ''}`} style={{ left: (phase === 'idle' ? HOME_X : DOOR_X) - CHAR_H * 0.2, top: FEET - CHAR_H, transitionDuration: phase === 'walk' || phase === 'in' ? `${WALK_MS}ms` : '0ms' }} aria-hidden="true">
        <AnimatedCharacter state={phase === 'walk' ? 'walk' : phase === 'in' ? 'idle' : 'idle'} facing={1} height={CHAR_H} />
      </div>
      <p className="landing-caption">tap on the door to start.</p>
      <button
        type="button"
        className="door-hit"
        style={DOOR}
        aria-label="Open the door and start"
        onClick={tap}
        disabled={zooming}
      />
    </div>
  );
}
