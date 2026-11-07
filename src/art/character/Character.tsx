import { createContext, memo, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import './character.css';
import {
  ANKLE, ARM_LEN, BEIGE, BLUE, BLUSH, CHAR_H, CHAR_W, CUFF, CUFF_BAND, CX, GRIP_LOCAL, GROUND, HAND_Y, HIP, HIP_Y, INK, JACKET, LEG_LEN, LILAC, L_IDLE, L_TILT, NECK_Y, PALM,
  PAPER, SHAPES as S, SKIN, SHOE, SHOULDER_L, SHOULDER_R, SLEEVE, SPLIT, THUMB, TROUSER, handPath, rotAbout, type HandKind,
} from './geometry';
import * as V from './v2shapes';
import { play } from '../../audio/sound';
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
      <clipPath id="sv2-shoulder"><rect x="-50" y="150" width="500" height="104" /></clipPath>
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
      <O d={v.shin} fill={SKIN} />
      <Foot side={side} transform={shoe} part="tabs" />
      {/* the white line between the two legs */}
      <O d={V.SKIRT} stroke={SKIN} w={8} deco clip={`url(#sv2-notch-${side})`} />
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
      <O d={V.JACKETR} stroke={INK} w={8} deco />
      <O d={V.JACKETR} fill={JACKET} />
      <Inside><path className="o" pathLength={1} d={V.POCKET} fill={BLUE} /></Inside>
    </g>
  );
});

// The shoulders of both jackets drawn again over the top of the arms, so every arm's shoulder end is tucked under the jacket at any angle.
const ShoulderCaps = memo(function ShoulderCaps() {
  return (
    <Inside>
      <g clipPath="url(#sv2-shoulder)">
        <path d={V.JACKETR} fill={JACKET} />
        <path d={V.JACKETL} fill={JACKET} />
      </g>
    </Inside>
  );
});

const JacketL = memo(function JacketL() {
  return <g id="jacket-left" style={k(0.5)}><O d={V.JACKETL} stroke={INK} w={8} deco /><O d={V.JACKETL} fill={JACKET} /></g>;
});

// One sleeve with its cuff: narrower at the shoulder, wider at the cuff, a slight elbow bend, a visible cuff edge. No lines down the sleeve.
const Sleeve = () => (
  <>
    <O d={SLEEVE} stroke={INK} w={8} deco />
    <O d={SLEEVE} fill={JACKET} />
    <O d={CUFF_BAND} stroke={INK} w={8} deco />
    <O d={CUFF_BAND} fill="#434343" />
    <Inside><path className="o" pathLength={1} d={CUFF} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" /></Inside>
  </>
);
// A soft mitten with a small thumb, white like the face, coming out of the cuff
const Mitten = () => (
  <g transform={`translate(0 ${HAND_Y})`}>
    <O d={THUMB} fill={SKIN} />
    <O d={PALM} fill={SKIN} />
  </g>
);

// Free arm (screen right): sleeve and hand pivot at the shoulder, which hides under the jacket.
const FreeArm = memo(function FreeArm({ angle, flip, hand }: { angle: number; flip: boolean; hand: HandKind }) {
  return (
    <g id="arm-right" transform={`translate(${SHOULDER_R[0]} ${SHOULDER_R[1]}) rotate(${angle - 90})`} style={k(0.55)}>
      {hand === 'mitten' ? <Mitten /> : (
        <g transform={`translate(0 ${HAND_Y + 8}) rotate(90) translate(-6 0) scale(1 ${flip ? -1 : 1})`}>
          <O d={handPath(hand)} fill={SKIN} />
        </g>
      )}
      <Sleeve />
    </g>
  );
});

// Bag arm (screen left): the bag hangs from the hand, on a handle that runs to both ends of the bag.
const BagHand = memo(function BagHand({ rot }: { rot: number }) {
  return (
    <g id="hand" transform={`translate(${SHOULDER_L[0]} ${SHOULDER_L[1]}) rotate(${rot})`} style={k(0.3)}><Mitten /></g>
  );
});
const BagSleeve = memo(function BagSleeve({ rot }: { rot: number }) {
  return (
    <g id="arm-left" transform={`translate(${SHOULDER_L[0]} ${SHOULDER_L[1]}) rotate(${rot})`} style={k(0.3)}><Sleeve /></g>
  );
});
// The handle: a lilac stroke with its own beige outline (the figure's edge ring sits under the trousers, so it is drawn here too).
const HANDLE = 'M40 537Q58 505 79.5 491Q101 505 119 538';
const Bag = memo(function Bag({ transform }: { transform: string }) {
  return (
    <g id="bag" transform={transform} style={k(0.3)}>
      <O d={HANDLE} stroke={BEIGE} w={22} deco />
      <O d={HANDLE} stroke={LILAC} w={8} />
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
  const blink = useRef({ dur: 3 + Math.random() * 2, delay: -Math.random() * 3 }).current; // each blink comes every 3 to 5 s
  return (
    <g className="head" transform={`rotate(${tilt} ${CX} ${NECK_Y})`} style={k(0.85)}>
      <g id="head"><O d={V.FACE} fill={SKIN} /></g>
      <Inside>
        <g id="face" className="feat">
          <g transform={`translate(${de} 0)`}>
            <path className="o" pathLength={1} d={V.EARHOLE} fill={INK} />
            <circle className="o" cx={100.334} cy={170} r={8.5} fill={BLUE} stroke={INK} />
          </g>
          <g transform={`translate(${dx} 0)`}>
            <g className="eyes" style={{ animationDuration: `${blink.dur}s`, animationDelay: `${blink.delay}s` }}>
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
  bagLag?: number; // the bag arm's rotation a moment ago, so the bag trails it
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
export function Character({ pose = IDLE, turn = 1, erase = 0, bubble = null, edgePx = 3, bunDy = 0, bagLag, viewBox, height = 360, className }: Props) {
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
  const rotL = Math.round((Math.max(-40, Math.min(40, aL - L_IDLE)) + L_TILT) * 10) / 10; // the bag arm hangs at its drawn tilt
  const handFlipR = Math.sin(rad(aR)) > 0.4;
  // The bag hangs from the hand and lags a little behind the arm (bagLag is the arm's rotation a moment ago)
  const lag = bagLag ?? rotL;
  const grip = rotAbout([SHOULDER_L[0] + GRIP_LOCAL[0], SHOULDER_L[1] + GRIP_LOCAL[1]], SHOULDER_L, rotL);
  const bagAngle = Math.round(Math.max(-35, Math.min(35, -0.8 * (lag - L_TILT) + 0.3 * (rotL - lag))) * 10) / 10;
  const bagT = `translate(${grip[0].toFixed(1)} ${grip[1].toFixed(1)}) rotate(${bagAngle}) translate(-79.5 -491)`;

  // The viewBox has room all round for every pose (arm raised, bubble), and negative margins keep the layout size at the figure's own box,
  // so nothing is ever cut off at the figure's edge.
  const PAD = { x: 180, t: 130, b: 12 };
  const padded = !viewBox && typeof height === 'number';
  const vb = (viewBox ?? (padded ? `${-PAD.x} ${-PAD.t} ${CHAR_W + 2 * PAD.x} ${CHAR_H + PAD.t + PAD.b}` : `0 0 ${CHAR_W} ${CHAR_H}`)).split(' ').map(Number);
  const unit = padded ? CHAR_H : vb[3]; // character units shown over `height`
  const px = padded ? height / CHAR_H : 1; // screen px per character unit
  const edge = height && typeof height === 'number' ? (edgePx * unit) / height : 0;
  const tilt = Math.round(pose.tilt * 10) / 10;
  const figure = () => (
    <g transform={`translate(${CX} 0) scale(${sx} 1) translate(${-CX} 0)`}>
      <Leg side="R" transform={rt.transform} shoe={rt.shoe} />
      <Leg side="L" transform={lt.transform} shoe={lt.shoe} />
      <g transform={`translate(${pose.shiftX} ${hipY - HIP_Y}) rotate(${pose.lean} ${CX} ${HIP_Y})`}>
        <g className="breath">
          <HairBack tilt={tilt} dy={Math.round(bunDy * 10) / 10} />
          <Torso />
          <JacketR />
          <JacketL />
          <Bag transform={bagT} />
          <BagHand rot={rotL} />
          <FreeArm angle={Math.round(aR * 10) / 10} flip={handFlipR} hand={pose.handR} />
          <BagSleeve rot={rotL} />
          <ShoulderCaps />
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
      style={{ height: padded ? vb[3] * px : height, width: 'auto', aspectRatio: `${vb[2]} / ${vb[3]}`, ...(padded ? { margin: `${-PAD.t * px}px ${-PAD.x * px}px ${-PAD.b * px}px` } : {}), '--erase': erase } as CSSProperties}
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

type Frame = { pose: Pose; turn: number; erase: number; opacity: number; bunDy: number; bagLag: number };
const near = (a: number, b: number) => Math.abs(a - b) < 0.02;
const same = (a: Frame | null, b: Frame) =>
  !!a && near(a.turn, b.turn) && near(a.erase, b.erase) && near(a.opacity, b.opacity) && near(a.bunDy, b.bunDy) && near(a.bagLag, b.bagLag) &&
  near(a.pose.legL.a, b.pose.legL.a) && near(a.pose.legR.a, b.pose.legR.a) && near(a.pose.legL.lift ?? 0, b.pose.legL.lift ?? 0) && near(a.pose.legR.lift ?? 0, b.pose.legR.lift ?? 0) &&
  near(a.pose.armL.a1, b.pose.armL.a1) && near(a.pose.armL.a2, b.pose.armL.a2) && near(a.pose.armR.a1, b.pose.armR.a1) && near(a.pose.armR.a2, b.pose.armR.a2) &&
  near(a.pose.lean, b.pose.lean) && near(a.pose.shiftX, b.pose.shiftX) && near(a.pose.tilt, b.pose.tilt) && near(a.pose.flareR, b.pose.flareR) && a.pose.handR === b.pose.handR;

export function useCharacterMotion(state: CharacterState, facing: 1 | -1, steps = false) {
  const [frame, setFrame] = useState({ pose: IDLE, turn: facing as number, erase: state === 'teleport-in' ? 1 : 0, opacity: 1, bunDy: 0, bagLag: 4.4 });
  const live = useRef({ pose: IDLE, turn: facing as number, state, facing, since: performance.now(), dy: 0, bun: 0, lag: 4.4, stepIdx: -1 });
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
      const dt = Math.min(0.1, (now - last) / 1000); // real frame time, so Low Power Mode (30 fps) keeps the same speed
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
      // a soft tap on each foot-contact frame of the walk and run cycles
      if (steps && cyc) {
        const idx = Math.floor((now / 1000) * (L.state === 'run' ? 16 : 8));
        if (idx !== L.stepIdx) { L.stepIdx = idx; if (idx % 2 === 0) play.step(L.state === 'run'); }
      } else L.stepIdx = -1;
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
      // the bag trails the arm by about 0.1 s
      const rotNow = Math.max(-40, Math.min(40, 0.35 * L.pose.armL.a1 + 0.65 * L.pose.armL.a2 - L_IDLE)) + L_TILT;
      L.lag += (rotNow - L.lag) * Math.min(1, dt / 0.1);
      const next = { pose: L.pose, turn: L.turn, erase, opacity, bunDy: reduced() ? 0 : L.bun, bagLag: Math.round(L.lag * 10) / 10 };
      if (!same(sent, next)) { sent = next; setFrame(next); } // resting poses do not re-render at all
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return frame;
}

export function AnimatedCharacter({ state = 'idle', facing = 1, bubble, height, className, steps = false }: { state?: CharacterState; facing?: 1 | -1; bubble?: string | null; height?: number | string; className?: string; steps?: boolean }) {
  const m = useCharacterMotion(state, facing, steps);
  return (
    <div style={{ opacity: m.opacity, display: 'inline-block', lineHeight: 0 }}>
      <Character pose={m.pose} turn={m.turn} erase={m.erase} bunDy={m.bunDy} bagLag={m.bagLag} bubble={state === 'order' ? (bubble ?? 'make me a ___') : null} height={height} className={className} />
    </div>
  );
}
