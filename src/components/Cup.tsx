import { useMemo } from 'react';
import { vessels } from '../art-loader';
import { geom } from '../art-loader/geometry';
import type { Drink } from '../data/drinks';
import { LABEL } from '../data/colors';
import { LABEL_TOP, VESSEL_SIZE } from '../data/layout';
import { bands } from '../logic/layers';
import { Liquid } from './Liquid';

type Props = {
  drink: Drink;
  x: number;
  popDelay?: number;
  active: boolean;
  refCb: (el: HTMLDivElement | null) => void;
  onEnter: () => void;
  onLeave: () => void;
  onTap: (pointerType: string) => void;
  onFocus: () => void;
  onBlur: () => void;
};

export const recipeText = (d: Drink) => d.layers.map((l) => `${LABEL[l.ing]} x${l.parts}`).join(', ');

// The loop owns `transform` (translateX); hover and pop effects use the individual `translate` / `scale` properties.
export function Cup({ drink, x, popDelay, active, refCb, onEnter, onLeave, onTap, onFocus, onBlur }: Props) {
  const v = VESSEL_SIZE[drink.vessel];
  const g = geom(drink.vessel);
  // label centre: the liquid mask's bounding box (the cup body), so a handle does not pull it sideways
  const labelX = g.bbox.x + g.bbox.w / 2;
  const reach = LABEL_TOP + 16 - v.top; // the hit area runs down to the bottom of the label
  const total = drink.layers.reduce((a, l) => a + l.parts, 0);
  const b = useMemo(() => bands(drink.layers, total, g), [drink, total, g]);
  const lastType = { current: 'mouse' };
  return (
    <div
      ref={refCb}
      className={`cup${active ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${drink.name}: ${recipeText(drink)}`}
      aria-pressed={active}
      style={{ left: -v.w / 2, top: v.top, width: v.w, height: reach, transform: `translateX(${x}px)`, '--pop-delay': `${popDelay ?? 0}ms`, '--vh': `${v.h}px`, transformOrigin: `50% ${v.h}px` } as React.CSSProperties}
      data-pop={popDelay !== undefined ? '' : undefined}
      onPointerDown={(e) => { lastType.current = e.pointerType; }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') onEnter(); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onLeave(); }}
      onClick={() => onTap(lastType.current)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap('keyboard'); } }}
    >
      <div className="vessel" dangerouslySetInnerHTML={{ __html: vessels[drink.vessel] }} />
      <Liquid geom={g} bands={b} blended={drink.blended} crema={drink.crema} microfoam={drink.microfoam} clipId={`clip-${drink.id}`} />
      <span className="cup-label" aria-hidden="true" style={{ left: labelX, top: LABEL_TOP - v.top }}>{drink.name.toLowerCase()}</span>
      {drink.vessel === '01' ? <div className="ribs" dangerouslySetInnerHTML={{ __html: ribs() }} /> : null}
    </div>
  );
}

// The mug's black rib marks sit inside the liquid area, so they are drawn again above the liquid.
let ribCache = '';
function ribs() {
  if (ribCache) return ribCache;
  const svg = vessels['01'];
  const paths = [...svg.matchAll(/<path[^>]*fill="black"[^>]*\/>/g)].map((m) => m[0]).slice(1);
  return (ribCache = svg.replace(/<path[\s\S]*<\/svg>/, paths.join('') + '</svg>'));
}
