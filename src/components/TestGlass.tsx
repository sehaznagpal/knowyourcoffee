import { useId } from 'react';
import { vessels } from '../art-loader';
import { geom } from '../art-loader/geometry';
import type { Drink, Layer } from '../data/drinks';
import { bands } from '../logic/layers';
import { CAPACITY } from '../logic/quiz';
import { Liquid } from './Liquid';

type Props = { layers: Layer[]; drink?: Drink; scale?: number };

/** The test glass at its own size (or scaled for the side-by-side result), capacity 8 parts. */
export function TestGlass({ layers, drink, scale = 1 }: Props) {
  const g = geom('test-glass');
  const id = useId().replace(/:/g, '');
  return (
    <div className="glass" style={{ width: g.w * scale, height: g.h * scale }}>
      <div className="glass-inner" style={{ width: g.w, height: g.h, transform: `scale(${scale})` }}>
        <div className="vessel" dangerouslySetInnerHTML={{ __html: vessels['test-glass'] }} />
        <Liquid geom={g} bands={bands(layers, CAPACITY, g)} blended={drink?.blended} crema={drink?.crema} microfoam={drink?.microfoam} clipId={`tg-${id}`} />
      </div>
    </div>
  );
}
