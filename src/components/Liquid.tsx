import type { Geom } from '../art-loader/geometry';
import { COLOR, ICE_OUTLINE } from '../data/colors';
import type { Band } from '../logic/layers';

const SW = 2.5;

function Dots({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const out: React.ReactElement[] = [];
  let k = 0;
  for (let cy = y + 3; cy < y + h - 1; cy += 5) {
    for (let cx = x + 3 + ((k++ % 2) ? 3 : 0); cx < x + w - 1; cx += 6) out.push(<circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.9} fill="#C9B07E" />);
  }
  return <>{out}</>;
}

function Scoop({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const r = Math.max(4, Math.min(h * 0.55, w * 0.22));
  const cx = x + w / 2, cy = y + h - r * 0.9;
  return (
    <g>
      <path d={`M ${cx - r * 0.9} ${cy + r * 0.3} L ${cx - r * 0.75} ${cy + r * 0.95} Q ${cx} ${cy + r * 1.25} ${cx + r * 0.75} ${cy + r * 0.95} L ${cx + r * 0.9} ${cy + r * 0.3}`} fill={COLOR['ice-cream']} stroke="#1e1e1e" strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={r} fill={COLOR['ice-cream']} stroke="#1e1e1e" strokeWidth={SW} />
    </g>
  );
}

function Cubes({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const s = Math.max(6, Math.min(h * 0.8, w / 3.4));
  const spots = [[0.22, 0], [0.5, 0.12], [0.78, -0.04]];
  return (
    <g>
      {spots.map(([fx, off], i) => (
        <rect key={i} x={x + w * fx - s / 2} y={y + h - s + off * s} width={s} height={s} rx={s * 0.22}
          fill={COLOR.ice} stroke={ICE_OUTLINE} strokeWidth={SW} transform={`rotate(${[-8, 6, -4][i]} ${x + w * fx} ${y + h - s / 2})`} />
      ))}
    </g>
  );
}

function Whipped({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const n = Math.max(3, Math.round(w / 12)), r = w / n / 2, top = y + r * 0.6;
  let d = `M ${x} ${y + h} L ${x} ${top + r * 0.6}`;
  for (let i = 0; i < n; i++) d += ` A ${r} ${r} 0 0 1 ${x + (i + 1) * 2 * r} ${top + r * 0.6}`;
  d += ` L ${x + w} ${y + h} Z`;
  return <path d={d} fill="#FFFFFF" stroke="#1e1e1e" strokeWidth={SW} strokeLinejoin="round" />;
}

type Props = {
  geom: Geom;
  bands: Band[];
  blended?: boolean;
  crema?: boolean;
  microfoam?: boolean;
  clipId: string;
};

/** Flat layers clipped to the vessel's liquid mask; each grows from its own bottom edge (see .layer in CSS). */
export function Liquid({ geom: g, bands, blended, crema, microfoam, clipId }: Props) {
  const { x, w } = g.bbox;
  const list = blended
    ? [{ ing: 'blend' as const, parts: 1, y: bands[bands.length - 1].y, h: bands.reduce((a, b) => a + b.h, 0), top: true }]
    : bands;
  return (
    <svg className="liquid" width={g.w} height={g.h} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={g.d} transform={`translate(${g.dx} ${g.dy})`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {list.map((b, i) => {
          const floater = b.ing === 'ice' || b.ing === 'ice-cream';
          const pad = 0.5; // avoid hairline gaps between layers
          return (
            <g key={i} className="layer" style={{ '--i': i } as React.CSSProperties}>
              {!floater && b.ing !== 'whipped-cream' ? <rect x={x - 2} y={b.y} width={w + 4} height={b.h + pad} fill={COLOR[b.ing]} /> : null}
              {b.ing === 'foam' ? <Dots x={x} y={b.y} w={w} h={b.h} /> : null}
              {b.ing === 'ice' ? <Cubes x={x} y={b.y} w={w} h={b.h} /> : null}
              {b.ing === 'ice-cream' ? <Scoop x={x} y={b.y} w={w} h={b.h} /> : null}
              {b.ing === 'whipped-cream' ? <Whipped x={x} y={b.y} w={w} h={b.h} /> : null}
              {crema && b.top && b.ing === 'espresso' ? <rect x={x - 2} y={b.y} width={w + 4} height={Math.min(3, b.h)} fill="#C98F55" /> : null}
              {microfoam && b.top ? <rect x={x - 2} y={b.y} width={w + 4} height={Math.min(3, b.h)} fill={COLOR.foam} /> : null}
              {!b.top && !floater ? <rect x={x - 2} y={b.y - 1} width={w + 4} height={2} fill="#1e1e1e" /> : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
