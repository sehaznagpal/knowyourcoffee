import { geom } from '../art-loader/geometry';
import { LABEL } from '../data/colors';
import type { Drink } from '../data/drinks';
import { VESSEL_SIZE } from '../data/layout';
import { bands } from '../logic/layers';

type Props = { drink: Drink; x: number };

const LIFT = 8;
const TAG_H = 32;
const GAP = 34;
const TIP_INK_TOP = 4; // measured: the tip's first line starts 4px below its box top
const PILL_GAP = 4; // clear space between the name pill and the tip's glyph tops (pill is anchored by its bottom edge)

/** Name tag, leader lines to a tag per layer, and the tip. Positioned in stage px above the active cup. */
export function DrinkCard({ drink, x }: Props) {
  const v = VESSEL_SIZE[drink.vessel];
  const g = geom(drink.vessel);
  const total = drink.layers.reduce((a, l) => a + l.parts, 0);
  const b = bands(drink.layers, total, g);
  const labels = drink.blended
    ? [{ text: drink.layers.map((l) => `${LABEL[l.ing]} x${l.parts}`).join(' + '), y: (b[0].y + b[b.length - 1].y + b[b.length - 1].h) / 2 }]
    : b.map((band) => ({ text: `${LABEL[band.ing]} x${band.parts}`, y: band.y + band.h / 2 }));

  const top = v.top - LIFT;
  const midY = (y: number) => top + y; // vessel svg coords -> stage coords
  const bx = x - v.w / 2 + g.bbox.x + g.bbox.w / 2; // liquid centre x
  const side = (i: number) => (x < 300 ? 'right' : x > 980 ? 'left' : i % 2 === 0 ? 'left' : 'right');

  const placed = labels.map((l, i) => ({ ...l, side: side(i) as 'left' | 'right', ty: midY(l.y) }));
  (['left', 'right'] as const).forEach((s) => {
    const col = placed.filter((p) => p.side === s).sort((a, c) => c.ty - a.ty); // bottom first
    for (let k = 1; k < col.length; k++) col[k].ty = Math.min(col[k].ty, col[k - 1].ty - GAP);
  });

  const nameY = top - 150;
  const tipW = 560;
  const tipLeft = Math.min(Math.max(x - tipW / 2, 16), 1264 - tipW);
  const nameX = Math.min(Math.max(x, 140), 1140);

  return (
    <div className="card" aria-hidden="true">
      <span className="card-name" style={{ left: nameX, top: nameY + 62 + TIP_INK_TOP - PILL_GAP }}>{drink.name}</span>
      <p className="card-tip" style={{ left: tipLeft, top: nameY + 62, width: tipW }}>{drink.tip}</p>
      <svg className="card-lines" width="1280" height="832" viewBox="0 0 1280 832">
        {placed.map((p, i) => {
          const edge = p.side === 'left' ? x - v.w / 2 - 36 : x + v.w / 2 + 36;
          const ex = bx + (p.side === 'left' ? -g.bbox.w * 0.22 : g.bbox.w * 0.22);
          return (
            <g key={i}>
              <polyline points={`${edge},${p.ty} ${edge + (p.side === 'left' ? 14 : -14)},${p.ty} ${ex},${midY(labels[i].y)}`} fill="none" stroke="#f4f0e4" strokeWidth="1.5" />
              <circle cx={ex} cy={midY(labels[i].y)} r="2.5" fill="#f4f0e4" stroke="#1e1e1e" strokeWidth="1" />
            </g>
          );
        })}
      </svg>
      {placed.map((p, i) => (
        <span
          key={i}
          className={`card-layer ${p.side}`}
          style={p.side === 'left' ? { right: 1280 - (x - v.w / 2 - 36), top: p.ty - TAG_H / 2 } : { left: x + v.w / 2 + 36, top: p.ty - TAG_H / 2 }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
}
