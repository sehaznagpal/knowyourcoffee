import { createContext, memo, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import './character.css';
import {
  BEIGE, BLUE, CHAR_H, CHAR_W, CX, HAIR_FIT, HIP_X, HIP_Y, INK, LEG_LEN, LILAC, NECK_Y, PAPER, SHAPES as S, arm, face, hairPoint, handPath, type HandKind,
} from './geometry';
import { HAIR } from './hair';
import { IDLE, POSES, RUN, WALK, cyclePose, lerpPose, type Pose } from './poses';

export type CharacterState = 'idle' | 'walk' | 'run' | 'look' | 'point' | 'wave' | 'order' | 'cheer' | 'turn' | 'teleport-out' | 'teleport-in';

const HAIR_T = `translate(${HAIR_FIT.x} ${HAIR_FIT.y}) scale(${HAIR_FIT.scale})`;
const WISPS = [
  { d: HAIR.wispsLeft, at: hairPoint(132, 244) },
  { d: HAIR.wispsRight, at: hairPoint(320, 244) },
];
const W = 8; // one even outline: about 3.3px when she stands 38% of an 832px frame
const rad = (d: number) => (d * Math.PI) / 180;
const GROUND = HIP_Y + LEG_LEN + 0; // ankle height when standing straight (706)

type PathProps = { d: string; fill?: string; w?: number; stroke?: string; evenodd?: boolean };
// The sticker edge: the whole figure is drawn once more underneath in beige, every stroke widened by 2x the edge, so the
// cut-out outline is one even width all the way round.
const EdgeCtx = createContext(0);
// Every outline has pathLength 1 so the teleport can erase and redraw it with stroke-dashoffset.
const O = ({ d, fill = 'none', w = W, stroke = INK, evenodd = false }: PathProps) => {
  const e = useContext(EdgeCtx);
  return (
    <path
      className="o" pathLength={1} d={d}
      fill={e && fill !== 'none' ? BEIGE : fill}
      stroke={e ? BEIGE : stroke}
      strokeWidth={e ? w + 2 * e : w}
      strokeLinejoin="round" strokeLinecap="round"
      fillRule={evenodd ? 'evenodd' : undefined}
    />
  );
};
// Teleport order: 0 = feet, 1 = head
const k = (v: number) => ({ '--k': v }) as CSSProperties;

// Pieces that change rarely are memoised: while she walks only the legs, arms and bag are redrawn every frame.
const StaticBody = memo(function StaticBody() {
  return (
    <>
      <g id="trousers" style={k(0.2)}><O d={S.hips} fill={INK} /></g>
      <g id="tee" style={k(0.35)}><O d={S.tee} fill={BLUE} /></g>
      <g id="top" style={k(0.4)}><O d={S.top} fill={LILAC} /></g>
      <g style={k(0.65)}><O d={S.neck} fill={PAPER} /></g>
      <g id="jacket" style={k(0.5)}><O d={S.panelR} fill={PAPER} /><O d={S.panelL} fill={PAPER} /></g>
    </>
  );
});

const Legs = memo(function Legs({ rt, rtShoe, lt, ltShoe }: { rt: string; rtShoe: string; lt: string; ltShoe: string }) {
  return (
    <>
      <g id="leg-right" transform={rt} style={k(0.1)}>
        <O d={S.leg} fill={INK} />
        <O d={S.ankle} fill={PAPER} w={6} />
        <g id="shoe-right" transform={rtShoe} style={k(0)}>
          <O d={S.shoe} fill={BLUE} />
          {S.laces.map((d, i) => <O key={i} d={d} w={4} />)}
        </g>
      </g>
      <g id="leg-left" transform={lt} style={k(0.1)}>
        <O d={S.leg} fill={INK} />
        <O d={S.seam} stroke={PAPER} w={3.5} />
        <O d={S.ankle} fill={PAPER} w={6} />
        <g id="shoe-left" transform={ltShoe} style={k(0)}>
          <O d={S.shoe} fill={BLUE} />
          {S.laces.map((d, i) => <O key={i} d={d} w={4} />)}
        </g>
      </g>
    </>
  );
});

const Head = memo(function Head({ tilt, turn, bunDy }: { tilt: number; turn: number; bunDy: number }) {
  const f = face(turn);
  return (
    <g className="head" transform={`rotate(${tilt} ${CX} ${NECK_Y})`} style={k(0.85)}>
      <g id="head"><O d={S.face} fill={PAPER} /></g>
      {/* hair: potrace of the reference close-up, kept as traced; solid ink, no outline stroke */}
      <g id="hair" style={k(1)} transform={HAIR_T}>
        <g className="bun" transform={`translate(0 ${bunDy / HAIR_FIT.scale})`}><O d={HAIR.bun} fill={INK} w={0} evenodd /></g>
        <O d={HAIR.cap} fill={INK} w={0} evenodd />
      </g>
      {WISPS.map((wi, i) => (
        <g key={i} className="strand" style={{ transformOrigin: `${wi.at[0]}px ${wi.at[1]}px`, animationDelay: `${-i * 0.9}s` }}>
          <g transform={HAIR_T} style={k(1)}><O d={wi.d} fill={INK} w={0} evenodd /></g>
        </g>
      ))}
      <g id="face">
        <g className="eyes"><O d={f.eyeL} fill={INK} w={0} /><O d={f.eyeR} fill={INK} w={0} /></g>
        <O d={f.nose} w={4} />
        <O d={f.smile} w={4} />
      </g>
      <g id="earring"><O d={f.stud} fill={BLUE} w={3.5} /></g>
    </g>
  );
});

type ArmProps = { sleeve: string; wx: number; wy: number; angle: number };
const FreeArm = memo(function FreeArm({ sleeve, wx, wy, angle, flip, hand }: ArmProps & { flip: boolean; hand: HandKind }) {
  return (
    <g style={k(0.55)}>
      <g id="hand-right" transform={`translate(${wx} ${wy}) rotate(${angle}) translate(-12 0) scale(1 ${flip ? -1 : 1})`}>
        <O d={handPath(hand)} fill={PAPER} />
      </g>
      <O d={sleeve} fill={PAPER} />
    </g>
  );
});

const BagArm = memo(function BagArm({ sleeve, wx, wy, angle, gx, gy, bagAngle }: ArmProps & { gx: number; gy: number; bagAngle: number }) {
  return (
    <g style={k(0.3)}>
      <g id="bag" transform={`translate(${gx} ${gy - 6}) rotate(${bagAngle})`}>
        <O d={S.bagHandle} stroke={INK} w={W} />
        <O d={S.bagBody} fill={LILAC} />
      </g>
      <g id="hand" transform={`translate(${wx} ${wy}) rotate(${angle}) translate(-12 0)`}>
        <O d={handPath('mitten')} fill={PAPER} />
      </g>
      <O d={sleeve} fill={PAPER} />
    </g>
  );
});

type Props = {
  pose?: Pose;
  turn?: number; // 1 = facing right, -1 = facing left, 0 = facing us (three-quarter between the two)
  erase?: number; // 0 = fully drawn, 1 = erased (feet first); counting back down redraws head first
  bubble?: string | null; // speech bubble text
  viewBox?: string; // crop, for close-ups (default: the whole figure)
  edgePx?: number; // width of the beige sticker edge in screen px (needs a numeric height)
  bunDy?: number; // the bun's follow-through behind the body bob, in character units
  height?: number | string;
  className?: string;
};

/** Where the hips sit for a pose: the planted foot stays on the floor, the hips drop when the legs spread. */
export function hipYOf(pose: Pose) {
  const legs = { L: pose.legL, R: pose.legR };
  const planted = (['L', 'R'] as const).filter((s) => !legs[s].lift);
  const ref = (planted.length ? planted : ['L' as const]).reduce((a, b) => (Math.abs(legs[b].a) > Math.abs(legs[a].a) ? b : a));
  return GROUND - LEG_LEN * Math.cos(rad(legs[ref].a)) + (legs[ref].lift ?? 0);
}

/** One still of Sehaz. Named groups: hair-back, head, face, earring, jacket, top, tee, trousers, leg-left, leg-right, shoe-left, shoe-right, hand, bag. */
export function Character({ pose = IDLE, turn = 1, erase = 0, bubble = null, edgePx = 3, bunDy = 0, viewBox, height = 360, className }: Props) {
  const t = Math.abs(turn);
  const sign = turn < 0 ? -1 : 1;
  const sx = sign * (0.88 + 0.12 * t);

  // Legs: keep the planted foot on the floor, drop the hips when the legs spread
  const legs = { L: pose.legL, R: pose.legR };
  const hipY = hipYOf(pose);
  const legT = (s: 'L' | 'R') => {
    const l = legs[s];
    const rise = hipY + LEG_LEN * Math.cos(rad(l.a)) - GROUND + (l.lift ?? 0);
    return { rise, transform: `translate(${HIP_X[s]} ${hipY - rise}) rotate(${-l.a})`, shoe: `translate(0 ${LEG_LEN}) rotate(${0.9 * l.a + (l.lift ? 8 : 0)}) scale(${0.55 + 0.45 * t} 1)` };
  };
  const lt = legT('L'), rt = legT('R');

  const aL = arm('L', pose.armL.a1, pose.armL.a2, 16);
  const aR = arm('R', pose.armR.a1, pose.armR.a2, pose.flareR);
  const f = face(t);
  const handFlipR = Math.sin(rad(pose.armR.a2)) > 0.4;
  const grip: [number, number] = [aL.wrist[0] + 14 * Math.cos(rad(aL.angle)), aL.wrist[1] + 14 * Math.sin(rad(aL.angle))];
  const bagAngle = Math.max(-35, Math.min(35, 0.45 * (90 - aL.angle)));

  const vb = (viewBox ?? `0 0 ${CHAR_W} ${CHAR_H}`).split(' ').map(Number);
  const edge = height && typeof height === 'number' ? (edgePx * vb[3]) / height : 0;
  const figure = () => (
    <g transform={`translate(${CX} 0) scale(${sx} 1) translate(${-CX} 0)`}>
      <Legs rt={rt.transform} rtShoe={rt.shoe} lt={lt.transform} ltShoe={lt.shoe} />
      <g transform={`translate(${pose.shiftX} ${hipY - HIP_Y}) rotate(${pose.lean} ${CX} ${HIP_Y})`}>
        <g className="breath">
          <StaticBody />
          <Head tilt={Math.round(pose.tilt * 10) / 10} turn={Math.round(t * 50) / 50} bunDy={Math.round(bunDy * 10) / 10} />
          {/* free arm: sleeve from shoulder to a wide cuff, hand out of the cuff */}
          <FreeArm sleeve={aR.sleeve} wx={aR.wrist[0]} wy={aR.wrist[1]} angle={aR.angle} flip={handFlipR} hand={pose.handR} />
          {/* bag arm: the bag hangs from the hand */}
          <BagArm sleeve={aL.sleeve} wx={aL.wrist[0]} wy={aL.wrist[1]} angle={aL.angle} gx={Math.round(grip[0] * 10) / 10} gy={Math.round(grip[1] * 10) / 10} bagAngle={Math.round(bagAngle * 10) / 10} />
        </g>
      </g>
    </g>
  );

  return (
    <svg
      className={`char${className ? ' ' + className : ''}`}
      data-erasing={erase > 0.001 ? '' : undefined}
      viewBox={vb.join(' ')}
      style={{ height, width: 'auto', aspectRatio: `${vb[2]} / ${vb[3]}`, '--erase': erase } as CSSProperties}
      role="img"
      aria-label="Sehaz, the gallery guide"
    >
      <g className="flick">{S.flicks.map((d, i) => <path key={i} d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />)}</g>

      <EdgeCtx.Provider value={edge}>{figure()}</EdgeCtx.Provider>
      <EdgeCtx.Provider value={0}>{figure()}</EdgeCtx.Provider>

      {bubble ? (
        <g className="bubble" transform="translate(206 -96)">
          <O d={S.bubble} fill={PAPER} w={6} />
          <text x={127} y={46} textAnchor="middle" fontFamily="Excon, sans-serif" fontWeight={700} fontSize={30} fill={INK}>{bubble}</text>
        </g>
      ) : null}
    </svg>
  );
}

// ---- animation: state -> pose, driven per frame ----
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TELEPORT_MS = 330;

type Frame = { pose: Pose; turn: number; erase: number; opacity: number; bunDy: number };
const near = (a: number, b: number) => Math.abs(a - b) < 0.02;
const same = (a: Frame | null, b: Frame) =>
  !!a && near(a.turn, b.turn) && near(a.erase, b.erase) && near(a.opacity, b.opacity) && near(a.bunDy, b.bunDy) &&
  near(a.pose.legL.a, b.pose.legL.a) && near(a.pose.legR.a, b.pose.legR.a) && near(a.pose.legL.lift ?? 0, b.pose.legL.lift ?? 0) && near(a.pose.legR.lift ?? 0, b.pose.legR.lift ?? 0) &&
  near(a.pose.armL.a1, b.pose.armL.a1) && near(a.pose.armL.a2, b.pose.armL.a2) && near(a.pose.armR.a1, b.pose.armR.a1) && near(a.pose.armR.a2, b.pose.armR.a2) &&
  near(a.pose.lean, b.pose.lean) && near(a.pose.shiftX, b.pose.shiftX) && near(a.pose.tilt, b.pose.tilt) && near(a.pose.flareR, b.pose.flareR) && a.pose.handR === b.pose.handR;

export function useCharacterMotion(state: CharacterState, facing: 1 | -1) {
  const [frame, setFrame] = useState({ pose: IDLE, turn: facing as number, erase: state === 'teleport-in' ? 1 : 0, opacity: 1, bunDy: 0 });
  const live = useRef({ pose: IDLE, turn: facing as number, state, facing, since: performance.now(), dy: 0, bun: 0 });
  const prevState = useRef(state);

  if (prevState.current !== state) {
    prevState.current = state;
    live.current.since = performance.now();
  }
  live.current.state = state;
  live.current.facing = facing;

  useEffect(() => {
    let raf = 0, last = performance.now();
    let sent: Frame | null = null;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      const age = (now - L.since) / 1000;
      const cyc = L.state === 'walk' || L.state === 'run';
      const target =
        L.state === 'walk' ? cyclePose(WALK, (now / 1000) * 8)
        : L.state === 'run' ? cyclePose(RUN, (now / 1000) * 16)
        : L.state === 'turn' ? POSES.turn
        : L.state in POSES ? POSES[L.state as keyof typeof POSES]
        : IDLE;
      L.pose = lerpPose(L.pose, target, 1 - Math.exp(-dt / (cyc ? 0.03 : 0.07)));
      // turning passes through the three-quarter view, then flips
      const front = L.state === 'turn' || L.state.startsWith('teleport'); // the teleport faces the viewer first
      const want = front ? 0 : L.facing;
      const step = dt / (front ? 0.1 : 0.24);
      L.turn += Math.max(-step, Math.min(step, want - L.turn));
      // the bun follows the body bob about 1px (2.4 units at gallery size) late
      const dy = hipYOf(L.pose) - HIP_Y;
      const vel = (dy - L.dy) / Math.max(dt, 0.001);
      L.dy = dy;
      L.bun += (Math.max(-2.4, Math.min(2.4, -vel * 0.012)) - L.bun) * Math.min(1, dt / 0.05);
      let erase = 0, opacity = 1;
      if (L.state === 'teleport-out') { erase = Math.min(1, (age * 1000) / TELEPORT_MS); }
      if (L.state === 'teleport-in') { erase = Math.max(0, 1 - (age * 1000) / TELEPORT_MS); }
      if (reduced() && L.state.startsWith('teleport')) { opacity = L.state === 'teleport-out' ? Math.max(0, 1 - age / 0.2) : Math.min(1, age / 0.2); erase = 0; }
      const next = { pose: L.pose, turn: L.turn, erase, opacity, bunDy: reduced() ? 0 : L.bun };
      if (!same(sent, next)) { sent = next; setFrame(next); } // resting poses do not re-render at all
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return frame;
}

export function AnimatedCharacter({ state = 'idle', facing = 1, bubble, height, className }: { state?: CharacterState; facing?: 1 | -1; bubble?: string | null; height?: number | string; className?: string }) {
  const m = useCharacterMotion(state, facing);
  return (
    <div style={{ opacity: m.opacity, display: 'inline-block', lineHeight: 0 }}>
      <Character pose={m.pose} turn={m.turn} erase={m.erase} bunDy={m.bunDy} bubble={state === 'order' ? (bubble ?? 'make me a ___') : null} height={height} className={className} />
    </div>
  );
}
