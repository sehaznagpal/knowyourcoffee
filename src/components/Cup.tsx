import { vessels } from '../art-loader';
import type { Drink } from '../data/drinks';
import { VESSEL_SIZE } from '../data/layout';

type Props = { drink: Drink; x: number };

export function Cup({ drink, x }: Props) {
  const v = VESSEL_SIZE[drink.vessel];
  const recipe = drink.layers.map((l) => `${l.ing.replace(/-/g, ' ')} x${l.parts}`).join(', ');
  return (
    <div
      className="cup"
      role="button"
      tabIndex={0}
      aria-label={`${drink.name}: ${recipe}`}
      style={{ left: x - v.w / 2, top: v.top, width: v.w, height: v.h }}
      dangerouslySetInnerHTML={{ __html: vessels[drink.vessel] }}
    />
  );
}
