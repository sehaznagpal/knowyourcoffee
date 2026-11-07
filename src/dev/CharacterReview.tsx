import { useEffect, useState } from 'react';
import figmaExport from '../../reference/character/sehaz-character.figma-export.svg?url';
import { landing } from '../art-loader';
import { Character, type CharacterState } from '../art/character/Character';
import './review.css';

const STATES: { state: CharacterState; label: string; note: string }[] = [
  { state: 'idle', label: 'Idle', note: 'breathing 2.4 s, blink every ~4 s, hair sway' },
  { state: 'walk', label: 'Walk', note: '4 poses, 8 a second, 3 px bob, bag swings' },
  { state: 'run', label: 'Run (Shift)', note: 'same cycle at 2x, slight lean' },
  { state: 'idle', label: 'Turn', note: 'mirrors on x with a 120 ms squash' },
  { state: 'look', label: 'Look', note: 'head tilts up' },
  { state: 'point', label: 'Point', note: 'free arm toward a frame' },
  { state: 'wave', label: 'Wave', note: 'one wave on entering the lobby' },
  { state: 'order', label: 'Order', note: 'speech bubble in the testing room' },
  { state: 'teleport-out', label: 'Teleport', note: 'erased feet to head, redrawn head to feet' },
];

function useLoop<T>(steps: { value: T; ms: number }[]) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % steps.length), steps[i].ms);
    return () => clearTimeout(t);
  }, [i, steps]);
  return steps[i].value;
}

const TELEPORT = [
  { value: 'teleport-out' as CharacterState, ms: 900 },
  { value: 'teleport-in' as CharacterState, ms: 1500 },
];
const WAVE = [{ value: 'idle' as CharacterState, ms: 600 }, { value: 'wave' as CharacterState, ms: 2400 }];

function Cell({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <figure className="cell">
      <div className="stage">{children}</div>
      <figcaption><b>{label}</b><span>{note}</span></figcaption>
    </figure>
  );
}

export function CharacterReview() {
  const [facing, setFacing] = useState<1 | -1>(1);
  useEffect(() => {
    const t = setInterval(() => setFacing((f) => (f === 1 ? -1 : 1)), 1400);
    return () => clearInterval(t);
  }, []);
  const teleport = useLoop(TELEPORT);
  const wave = useLoop(WAVE);

  return (
    <main className="review">
      <h1>/dev/character</h1>
      <p className="lede">Stage 0 review. Left: Sehaz's drawing exactly as exported from Figma. Right: the same character in the café line style.</p>

      <section className="pair">
        <figure><img src={figmaExport} alt="Original character from Figma" style={{ height: 560 }} /><figcaption>original (Figma export)</figcaption></figure>
        <figure><Character state="idle" height={560} /><figcaption>line version</figcaption></figure>
      </section>

      <h2>States</h2>
      <section className="grid">
        {STATES.map(({ state, label, note }) => (
          <Cell key={label} label={label} note={note}>
            <Character
              state={label === 'Teleport' ? teleport : label === 'Wave' ? wave : state}
              facing={label === 'Turn' ? facing : 1}
              height={300}
            />
          </Cell>
        ))}
      </section>

      <h2>Line weight check</h2>
      <p className="lede">The café from the landing page at its real size (769 px wide) next to her at gallery size (38% of an 832 px stage).</p>
      <section className="weight">
        <div className="cafe" dangerouslySetInnerHTML={{ __html: landing }} />
        <Character state="idle" height={Math.round(832 * 0.38)} />
      </section>
    </main>
  );
}
