import { createContext, memo, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import './character.css';
import {
  ANKLE, BEIGE, BLUE, BLUSH, CHAR_H, CHAR_W, CUFF_L, CX, GRIP_L, GROUND, HAND_L, HIP, HIP_Y, INK, JACKET, LEG_LEN, LILAC, L_IDLE, NECK_Y, PAPER, R_IDLE,
  ARM_R_LEN, SEAM_R, SHAPES as S, SHOE, SHOULDER_L, SHOULDER_R, SPLIT, TROUSER, TUBE_L, TUBE_R, handPath, rotAbout, type HandKind,
} from './geometry';
import * as V from './v2shapes';
import { IDLE, POSES, RUN, WALK, cyclePose, lerpPose, type Pose } from './poses';

export type CharacterState = 'idle' | 'walk' | 'run' | 'look' | 'point' | 'wave' | 'order' | 'cheer' | 'turn' | 'teleport-out' | 'teleport-in';

const rad = (d: number) => (d * Math.PI) / 180;

type PathProps = { d: string; fill?: string; w?: number; stroke?: string; evenodd?: boolean; deco?: boolean; clip?: string; mask?: string };
// The sticker edge: the whole figure is drawn once more underneath in beige, every stroke widened by 2x the edge, so the
// cut-out outline is one even width all the way round.
const EdgeCtx = createContext(0);
// Every shape has pathLength 1 so the teleport can erase and redraw its outline with stroke-dashoffset.
// `deco` marks a line that sits inside the figure (a white or black rim under a fill): it is left out of the beige copy.
const O = ({ d, fill = 'none', w = 0, stroke = INK, evenodd = false, deco = false, clip, mask }: PathProps) => {
  const e = useContext(EdgeCtx);
  if (e && deco) return null;
  return (
    <path
      className="o" pathLength={1} d={d}
      fill={e && fill !== 'none' ? BEIGE : fill}
      stroke={e ? BEIGE : stroke}
      strokeWidth={e ? w + 2 * e : w}
      strokeLinejoin="round" strokeLinecap="round"
      fillRule={evenodd ? 'evenodd' : undefined}
      clipPath={clip}
      mask={e ? undefined : mask}
    />
  );
};
// Small features that sit inside the face or the body: left out of the beige copy.
const Inside = ({ children }: { children: React.ReactNode }) => (useContext(EdgeCtx) ? null : <>{children}</>);
// Teleport order: 0 = feet, 1 = head
const k = (v: number) => ({ '--k': v }) as CSSProperties;

// Clips and the sleeve hole, shared by every figure on the page (same geometry everywhere, so one id is fine).
const Defs = memo(function Defs() {
  const [tx, ty] = SPLIT.top, [bx, by] = SPLIT.bottom;
  return (
    <defs>
      <clipPath id="sv2-half-L"><polygon points={`-50,${ty} ${tx},${ty} ${bx},${by} -50,${by}`} /></clipPath>
      <clipPath id="sv2-half-R"><polygon points={`${tx},${ty} 400,${ty} 400,${by} ${bx},${by}`} /></clipPath>
      <clipPath id="sv2-notch-L"><polygon points={`105,${ty} ${tx},${ty} ${bx},${by} 105,${by}`} /></clipPath>
      <clipPath id="sv2-notch-R"><polygon points={`${tx},${ty} 250,${ty} 250,${by} ${bx},${by}`} /></clipPath>
      <clipPath id="sv2-below"><rect x="-50" y="244" width="500" height="600" /></clipPath>
      {/* the left jacket has an armhole where the sleeve hangs, 4 wider all round so the sleeve's white rim shows through */}
      <mask id="sv2-hole" maskUnits="userSpaceOnUse" x="-50" y="-50" width="500" height="900">
        <rect x="-50" y="-50" width="500" height="900" fill="white" />
        <path d={TUBE_L} fill="black" stroke="black" strokeWidth={8} clipPath="url(#sv2-below)" />
      </mask>
    </defs>
  );
});

const Foot = memo(function Foot({ side, transform, part }: { side: 'L' | 'R'; transform: string; part: 'base' | 'tabs' }) {
  const v = side === 'L' ? V.LEGL : V.LEGR;
  return (
    <g transform={transform} style={k(0)}>
      {part === 'base' ? (
        <>
          <O d={v.shoe} fill={SHOE} />
          <O d={v.grey} fill={JACKET} />
          <O d={v.sole} fill={INK} />
        </>
      ) : (
        <>
          <O d={v.tabA} fill={JACKET} />
          <O d={v.tabB} fill={JACKET} />
        </>
      )}
    </g>
  );
});

// One trouser leg: the shin and shoe hang from the hip pivot; the shoe is its own group pivoting at the ankle.
const Leg = memo(function Leg({ side, transform, shoe }: { side: 'L' | 'R'; transform: string; shoe: string }) {
  const v = side === 'L' ? V.LEGL : V.LEGR;
  return (
    <g id={side === 'L' ? 'leg-left' : 'leg-right'} transform={transform} style={k(0.1)}>
      <Foot side={side} transform={shoe} part="base" />
      <O d={v.shin} fill={PAPER} />
      <Foot side={side} transform={shoe} part="tabs" />
      {/* the white line between the two legs */}
      <O d={V.SKIRT} stroke={PAPER} w={8} deco clip={`url(#sv2-notch-${side})`} />
      <O d={V.SKIRT} fill={TROUSER} clip={`url(#sv2-half-${side})`} />
    </g>
  );
});

const HairBack = memo(function HairBack({ tilt, dy }: { tilt: number; dy: number }) {
  return (
    <g id="hair-back" transform={`translate(0 ${dy}) rotate(${tilt * 0.5} ${CX} ${NECK_Y})`} style={k(1)}>
      <O d={V.HAIR} fill={INK} />
    </g>
  );
});

const Torso = memo(function Torso() {
  return (
    <>
      <g id="shirt" style={k(0.4)}><O d={V.SHIRT} stroke={INK} w={8} deco /><O d={V.SHIRT} fill={LILAC} /></g>
      <g id="belt" style={k(0.35)}><O d={V.BELT} stroke={INK} w={8} deco /><O d={V.BELT} fill={BLUE} /></g>
    </>
  );
});

const JacketR = memo(function JacketR() {
  return (
    <g id="jacket-right" style={k(0.5)}>
      <O d={V.JACKETR} fill={JACKET} />
      <Inside><path className="o" pathLength={1} d={V.POCKET} fill={BLUE} /><path className="o" pathLength={1} d={V.SEAMR} fill={INK} /></Inside>
    </g>
  );
});

const JacketL = memo(function JacketL() {
  return <g id="jacket-left" style={k(0.5)}><O d={V.JACKETL} fill={JACKET} mask="url(#sv2-hole)" /></g>;
});

// Free arm (screen right): sleeve and hand pivot at the shoulder, which hides under the jacket.
const FreeArm = memo(function FreeArm({ angle, flip, hand }: { angle: number; flip: boolean; hand: HandKind }) {
  return (
    <g id="arm-right" transform={`translate(${SHOULDER_R[0]} ${SHOULDER_R[1]}) rotate(${angle - 90})`} style={k(0.55)}>
      {hand === 'mitten' ? (
        <>
          <ellipse className="o" cx={0} cy={ARM_R_LEN + 14} rx={13} ry={21} fill="none" stroke={INK} strokeWidth={8} />
          <ellipse className="o" cx={0} cy={ARM_R_LEN + 14} rx={13} ry={21} fill={PAPER} />
        </>
      ) : (
        <g transform={`translate(0 ${ARM_R_LEN - 6}) rotate(90) translate(-6 0) scale(1 ${flip ? -1 : 1})`}>
          <O d={handPath(hand)} stroke={INK} w={8} deco />
          <O d={handPath(hand)} fill={PAPER} />
        </g>
      )}
      <O d={TUBE_R} fill={JACKET} />
      <Inside><path className="o" pathLength={1} d={SEAM_R} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" /></Inside>
    </g>
  );
});

// Bag arm (screen left): the sleeve is the tube from the Figma file; the hand sits under the cuff and the bag hangs from it.
const BagSleeve = memo(function BagSleeve({ theta }: { theta: number }) {
  return (
    <g id="arm-left" transform={`rotate(${theta} ${SHOULDER_L[0]} ${SHOULDER_L[1]})`} style={k(0.3)}>
      <O d={TUBE_L} stroke={PAPER} w={8} deco />
      <O d={TUBE_L} fill={JACKET} />
      <rect className="o" x={CUFF_L.x} y={CUFF_L.y} width={CUFF_L.w} height={CUFF_L.h} rx={CUFF_L.r} fill={JACKET} />
      <Inside><O d={V.SEAML} stroke={INK} w={4} /></Inside>
    </g>
  );
});
const BagHand = memo(function BagHand({ theta }: { theta: number }) {
  return (
    <g id="hand" transform={`rotate(${theta} ${SHOULDER_L[0]} ${SHOULDER_L[1]})`} style={k(0.3)}>
      <ellipse className="o" cx={HAND_L.cx} cy={HAND_L.cy} rx={HAND_L.rx} ry={HAND_L.ry} fill="none" stroke={INK} strokeWidth={8} />
      <ellipse className="o" cx={HAND_L.cx} cy={HAND_L.cy} rx={HAND_L.rx} ry={HAND_L.ry} fill={PAPER} />
    </g>
  );
});
const Bag = memo(function Bag({ transform }: { transform: string }) {
  return (
    <g id="bag" transform={transform} style={k(0.3)}>
      <O d={V.BAGHANDLE} stroke={PAPER} w={8} />
      <O d={V.BAG} fill={LILAC} />
      <Inside>
        {[['M38.26 557.23L45.77 617.26'], ['M46.05 546.95L122.05 545.05'], ['M19.3 573.64L33.36 571.3']].map(([d]) => (
          <path key={d} className="o" pathLength={1} d={d} fill="none" stroke={PAPER} strokeWidth={4} strokeLinecap="round" />
        ))}
      </Inside>
    </g>
  );
});

// The head: face, ear hole, earring, eyes and blush are the Figma v2 parts as drawn; turning slides the features across the face.
const Head = memo(function Head({ tilt, turn }: { tilt: number; turn: number }) {
  const dx = (turn - 1) * 22, de = (turn - 1) * 8;
  return (
    <g className="head" transform={`rotate(${tilt} ${CX} ${NECK_Y})`} style={k(0.85)}>
      <g id="head"><O d={V.FACE} fill={PAPER} /></g>
      <Inside>
        <g id="face" className="feat">
          <g transform={`translate(${de} 0)`}>
            <path className="o" pathLength={1} d={V.EARHOLE} fill={INK} />
            <circle className="o" cx={100.334} cy={170} r={8.5} fill={BLUE} stroke={INK} />
          </g>
          <g transform={`translate(${dx} 0)`}>
            <g className="eyes">
              <ellipse className="o" cx={196} cy={107} rx={5} ry={11} fill={INK} />
              <ellipse className="o" cx={162} cy={107} rx={5} ry={11} fill={INK} />
            </g>
            <path className="o" pathLength={1} d={V.BLUSH} fill={BLUSH} />
            <path className="o" pathLength={1} d={V.BLUSH2} fill={BLUSH} />
          </g>
        </g>
      </Inside>
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
  bunDy?: number; // the hair's follow-through behind the body bob, in character units
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

/** One arm's single joint angle: the shoulder carries the old two-bone pose (upper arm and forearm) as one weighted angle. */
const armAngle = (a: { a1: number; a2: number }) => 0.35 * a.a1 + 0.65 * a.a2;

/** One still of Sehaz, rigged from the Figma v2 file. Named groups: hair-back, head, face, shirt, belt, jacket-left, jacket-right, arm-left, arm-right, hand, bag, leg-left, leg-right. */
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
    const [px, py] = HIP[s], [ax, ay] = ANKLE[s];
    return {
      transform: `translate(${px} ${Math.round((hipY - rise) * 10) / 10}) rotate(${-l.a}) translate(${-px} ${-py})`,
      shoe: `translate(${ax} ${ay}) rotate(${Math.round((0.9 * l.a + (l.lift ? 8 : 0)) * 10) / 10}) scale(${0.55 + 0.45 * t} 1) translate(${-ax} ${-ay})`,
    };
  };
  const lt = legT('L'), rt = legT('R');

  // Arms: absolute angles (0 = right, 90 = down) become one rotation about the shoulder
  const aR = armAngle(pose.armR), aL = armAngle(pose.armL);
  const thetaL = Math.round((aL - L_IDLE) * 10) / 10;
  const handFlipR = Math.sin(rad(aR)) > 0.4;
  const grip = rotAbout(GRIP_L, SHOULDER_L, thetaL);
  const bagAngle = Math.round(Math.max(-35, Math.min(35, -0.45 * thetaL)) * 10) / 10;
  const bagT = `translate(${grip[0].toFixed(1)} ${grip[1].toFixed(1)}) rotate(${bagAngle}) translate(${-GRIP_L[0]} ${-GRIP_L[1]})`;

  const vb = (viewBox ?? `0 0 ${CHAR_W} ${CHAR_H}`).split(' ').map(Number);
  const edge = height && typeof height === 'number' ? (edgePx * vb[3]) / height : 0;
  const tilt = Math.round(pose.tilt * 10) / 10;
  const figure = () => (
    <g transform={`translate(${CX} 0) scale(${sx} 1) translate(${-CX} 0)`}>
      <Leg side="R" transform={rt.transform} shoe={rt.shoe} />
      <Leg side="L" transform={lt.transform} shoe={lt.shoe} />
      <g transform={`translate(${pose.shiftX} ${hipY - HIP_Y}) rotate(${pose.lean} ${CX} ${HIP_Y})`}>
        <g className="breath">
          <HairBack tilt={tilt} dy={Math.round(bunDy * 10) / 10} />
          <Torso />
          <FreeArm angle={Math.round(aR * 10) / 10} flip={handFlipR} hand={pose.handR} />
          <JacketR />
          <Bag transform={bagT} />
          <BagHand theta={thetaL} />
          <BagSleeve theta={thetaL} />
          <JacketL />
          <Head tilt={tilt} turn={Math.round(t * 50) / 50} />
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
      <Defs />
      <g className="flick">{S.flicks.map((d, i) => <path key={i} d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />)}</g>

      <EdgeCtx.Provider value={edge}>{figure()}</EdgeCtx.Provider>
      <EdgeCtx.Provider value={0}>{figure()}</EdgeCtx.Provider>

      {bubble ? (
        <g className="bubble" transform="translate(206 -96)">
          <path d={S.bubble} fill={PAPER} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
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
