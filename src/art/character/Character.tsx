import type { CSSProperties } from 'react';
import './character.css';
import { BLUE, CHAR_H, CHAR_W, INK, LILAC, PAPER, SHAPES as S } from './shapes';

export type CharacterState = 'idle' | 'walk' | 'run' | 'look' | 'point' | 'wave' | 'order' | 'teleport-out' | 'teleport-in';

type Props = {
  state?: CharacterState;
  facing?: 1 | -1; // 1 = facing right
  bubble?: string; // speech bubble text (shown in the 'order' state)
  height?: number | string; // CSS height; width follows
  className?: string;
};

const W = 8; // outline weight in character units: about 3.3px when she stands 38% of an 832px frame
const D = 5; // detail strokes

type PathProps = { d: string; fill?: string; stroke?: string; w?: number };
// Every outline has pathLength 1 so the teleport can erase and redraw it with stroke-dashoffset.
const P = ({ d, fill = 'none', stroke = INK, w = W }: PathProps) => (
  <path className="o" pathLength={1} d={d} fill={fill} stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" />
);
const Detail = ({ d, stroke = INK, w = D }: { d: string; stroke?: string; w?: number }) => <P d={d} stroke={stroke} w={w} />;
// Teleport order: 0 = feet, 1 = head
const k = (v: number) => ({ '--k': v }) as CSSProperties;

export function Character({ state = 'idle', facing = 1, bubble = 'make me a ___', height = 360, className }: Props) {
  return (
    <svg
      className={`char${className ? ' ' + className : ''}`}
      data-state={state}
      viewBox={`0 0 ${CHAR_W} ${CHAR_H}`}
      style={{ height, width: 'auto', aspectRatio: `${CHAR_W} / ${CHAR_H}`, '--dir': facing } as CSSProperties}
      role="img"
      aria-label="Sehaz, the gallery guide"
    >
      <g className="facing">
        {/* pencil flicks that stay behind when she is erased */}
        <g className="flick">
          {S.flicks.map((d, i) => <path key={i} d={d} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />)}
        </g>

        <g className="legs">
          <g id="leg-right" className="leg leg-right" style={k(0.12)}>
            <P d={S.legRight} fill={INK} />
            <P d={S.ankleRight} fill={PAPER} />
            <Detail d={S.creaseRight} stroke={PAPER} w={3} />
            <g id="shoe-right" className="shoe shoe-right" style={k(0)}>
              <P d={S.shoeRight.body} fill={BLUE} />
              <P d={S.shoeRight.sole} w={6} />
              {S.shoeRight.laces.map((d, i) => <Detail key={i} d={d} w={4} />)}
            </g>
          </g>
          <g id="leg-left" className="leg leg-left" style={k(0.12)}>
            <P d={S.legLeft} fill={INK} />
            <P d={S.ankleLeft} fill={PAPER} />
            <Detail d={S.creaseLeft} stroke={PAPER} w={3} />
            <g id="shoe-left" className="shoe shoe-left" style={k(0)}>
              <P d={S.shoeLeft.body} fill={BLUE} />
              <P d={S.shoeLeft.sole} w={6} />
              {S.shoeLeft.laces.map((d, i) => <Detail key={i} d={d} w={4} />)}
            </g>
          </g>
        </g>

        <g className="torso">
          <g id="hair-back" className="hairback" style={k(1)}>
            <P d={S.hairBack} fill={INK} />
            {S.hairLines.map((d, i) => <Detail key={i} d={d} stroke={PAPER} w={2.5} />)}
          </g>
          <g id="trousers" style={k(0.25)}><P d={S.trousers} fill={INK} /></g>
          <g id="tee" style={k(0.4)}><P d={S.tee} fill={BLUE} /></g>
          <g id="top" style={k(0.45)}><P d={S.top} fill={LILAC} /></g>
          <g style={k(0.7)}><P d={S.neck} fill={PAPER} /></g>

          <g className="head" style={k(0.85)}>
            <g id="head"><P d={S.head} fill={PAPER} />{S.fringe.map((d, i) => <Detail key={i} d={d} />)}</g>
            <P d={S.ear} fill={PAPER} w={6} />
            <Detail d={S.earInner} w={3.5} />
            <g id="earring"><Detail d={S.earringStem} w={3} /><P d={S.earring} fill={BLUE} w={4.5} /></g>
            <g id="face">
              <path className="o" d={S.blushLeft} fill={LILAC} />
              <path className="o" d={S.blushRight} fill={LILAC} />
              <g className="eyes">
                <path className="o" d={S.eyeLeft} fill={INK} />
                <path className="o" d={S.eyeRight} fill={INK} />
              </g>
              <Detail d={S.nose} w={4} />
            </g>
          </g>

          <g id="jacket" style={k(0.55)}>
            <P d={S.jacketRight} fill={PAPER} />
            {S.foldsRight.map((d, i) => <Detail key={i} d={d} />)}
            <Detail d={S.glint} stroke={BLUE} w={6} />
            <P d={S.jacketLeft} fill={PAPER} />
            {S.foldsLeft.map((d, i) => <Detail key={i} d={d} />)}
          </g>

          <g className="swing" style={k(0.3)}>
            <g id="bag">
              <P d={S.bagHandle} stroke={INK} w={11} />
              <Detail d={S.bagHandle} stroke={LILAC} w={4} />
              <P d={S.bagBody} fill={LILAC} />
              <Detail d={S.bagZip} />
              <Detail d={S.bagTab} w={4} />
              <Detail d={S.bagSeam} w={4} />
            </g>
          </g>
          <g id="hand" style={k(0.35)}>
            <P d={S.hand} fill={PAPER} />
            {S.fingers.map((d, i) => <Detail key={i} d={d} w={3} />)}
          </g>

          {/* the free arm: tucked away until she points or waves */}
          <g className="arm" transform="translate(226 206)" style={k(0.5)}>
            <g className="arm-rot">
              <P d={S.sleeve} fill={PAPER} />
              <Detail d={S.sleeveFold} w={4} />
              <P d={S.armHand} fill={PAPER} w={6} />
              <Detail d={S.thumb} w={5} />
            </g>
          </g>
        </g>

      </g>
      <g className="bubble" transform="translate(214 -92)">
        <P d={S.bubble} fill={PAPER} w={6} />
        <text x={127} y={46} textAnchor="middle" fontFamily="Excon, sans-serif" fontWeight={700} fontSize={30} fill={INK}>{bubble}</text>
        </g>
    </svg>
  );
}
