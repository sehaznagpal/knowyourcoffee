import { vessels } from '../art-loader';
import type { Drink } from '../data/drinks';
import { VESSEL_SIZE } from '../data/layout';

type Props = { drink: Drink; x: number; popDelay?: number; refCb: (el: HTMLDivElement | null) => void };

// The loop owns `transform` (translateX); hover and pop effects use the individual `translate` / `scale` properties.
export function Cup({ drink, x, popDelay, refCb }: Props) {
  const v = VESSEL_SIZE[drink.vessel];
  const recipe = drink.layers.map((l) => `${l.ing.replace(/-/g, ' ')} x${l.parts}`).join(', ');
  return (
    <div
      ref={refCb}
      className="cup"
      role="button"
      tabIndex={0}
      aria-label={`${drink.name}: ${recipe}`}
      style={{ left: -v.w / 2, top: v.top, width: v.w, height: v.h, transform: `translateX(${x}px)`, '--pop-delay': `${popDelay ?? 0}ms` } as React.CSSProperties}
      data-pop={popDelay !== undefined ? '' : undefined}
      dangerouslySetInnerHTML={{ __html: vessels[drink.vessel] }}
    />
  );
}
