import { useEffect, useState, type ReactNode } from 'react';
import styleBun from '../../reference/character/style-bun.png';
import styleBunCloseup from '../../reference/character/style-bun-closeup.png';
import styleBody from '../../reference/character/style-body.png';
import styleMain from '../../reference/character/style-main.png';
import { AnimatedCharacter, Character, type CharacterState } from '../art/character/Character';
import { POSES, RUN, WALK } from '../art/character/poses';
import './review.css';

const H = 250; // still height in the pose sheet

function useCycle<T>(steps: { value: T; ms: number }[]) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % steps.length), steps[i].ms);
    return () => clearTimeout(t);
  }, [i, steps]);
  return steps[i].value;
}
const TELEPORT = [
  { value: 'teleport-out' as CharacterState, ms: 1000 },
  { value: 'teleport-in' as CharacterState, ms: 1600 },
];
const FACING = [{ value: 1 as const, ms: 1500 }, { value: -1 as const, ms: 1500 }];

function Row({ label, note, stills, live }: { label: string; note: string; stills: ReactNode[]; live: ReactNode }) {
  return (
    <div className="prow">
      <div className="plabel"><b>{label}</b><span>{note}</span></div>
      <div className="pstills">{stills.map((s, i) => <div className="pcell" key={i}>{s}</div>)}</div>
      <div className="pcell live">{live}<small>animated</small></div>
    </div>
  );
}

export function CharacterReview() {
  const teleport = useCycle(TELEPORT);
  const facing = useCycle(FACING);

  return (
    <main className="review">
      <h1>/dev/character</h1>
      <p className="lede">Stage 0, head and hair round. Left to right: style-main.png, style-body.png and the new character, all at the same height.</p>

      <section className="refs">
        <figure><img src={styleMain} alt="style-main.png" /><figcaption>style-main.png (line, hair, face)</figcaption></figure>
        <figure><img src={styleBody} alt="style-body.png" /><figcaption>style-body.png (proportions, poses)</figcaption></figure>
        <figure><Character pose={POSES.idle} height={420} /><figcaption>new character</figcaption></figure>
      </section>

      <h2>Hair close-up</h2>
      <p className="lede">Head and shoulders, large, next to the reference the hair was traced from.</p>
      <section className="refs">
        <figure><img src={styleBun} alt="style-bun.png" /><figcaption>style-bun.png</figcaption></figure>
        <figure><img src={styleBunCloseup} alt="style-bun-closeup.png" style={{ height: 420 }} /><figcaption>style-bun-closeup.png (the traced hair)</figcaption></figure>
        <figure><Character pose={POSES.idle} viewBox="20 -66 276 330" height={420} /><figcaption>new hair, close-up</figcaption></figure>
      </section>

      <h2>Pose sheet</h2>
      <section className="sheet">
        <Row label="Idle" note="weight on one leg, bag hand down" stills={[<Character pose={POSES.idle} height={H} />]} live={<AnimatedCharacter state="idle" height={H} />} />
        <Row label="Walk" note="contact, passing, contact, passing" stills={WALK.map((p, i) => <Character key={i} pose={p} height={H} />)} live={<AnimatedCharacter state="walk" height={H} />} />
        <Row label="Run" note="longer stride, lean, big arm swing" stills={RUN.map((p, i) => <Character key={i} pose={p} height={H} />)} live={<AnimatedCharacter state="run" height={H} />} />
        <Row label="Turn" note="right, three-quarter, left" stills={[1, 0, -1].map((t) => <Character key={t} pose={POSES.turn} turn={t} height={H} />)} live={<AnimatedCharacter state="idle" facing={facing} height={H} />} />
        <Row label="Look" note="head tilted up, hands relaxed" stills={[<Character pose={POSES.look} height={H} />]} live={<AnimatedCharacter state="look" height={H} />} />
        <Row label="Point" note="free arm fully out, upper right" stills={[<Character pose={POSES.point} height={H} />]} live={<AnimatedCharacter state="point" height={H} />} />
        <Row label="Wave" note="elbow bent, hand open" stills={[<Character pose={POSES.wave} height={H} />]} live={<AnimatedCharacter state="wave" height={H} />} />
        <Row label="Order" note="hand slightly raised, speech bubble" stills={[<Character pose={POSES.order} bubble="make me a ___" height={H} />]} live={<AnimatedCharacter state="order" height={H} />} />
        <Row label="Teleport" note="fully drawn, half erased from the feet, mostly erased" stills={[0, 0.5, 0.9].map((e) => <Character key={e} pose={POSES.idle} erase={e} height={H} />)} live={<AnimatedCharacter state={teleport} height={H} />} />
      </section>

      <h2>Gallery size</h2>
      <p className="lede">38% of an 832 px frame (316 px tall) against the wall and floor of the gallery: idle, walking, running.</p>
      <section className="room">
        <div className="room-wall" />
        <div className="room-floor" />
        <div className="room-folk">
          <AnimatedCharacter state="idle" height={316} />
          <AnimatedCharacter state="walk" height={316} />
          <AnimatedCharacter state="run" height={316} />
        </div>
      </section>
    </main>
  );
}
