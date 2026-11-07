import { vessels } from '../art-loader';
import { geom } from '../art-loader/geometry';
import { ribs } from '../components/Cup';
import { Liquid } from '../components/Liquid';
import { LABEL } from '../data/colors';
import { VESSEL_SIZE } from '../data/layout';
import { bands } from '../logic/layers';
import { FRAME_ART, recipeLine, type FramePlace } from './layout';

type Props = { f: FramePlace; active: boolean; onOpen: (f: FramePlace) => void };

/** One coffee on the wall: Sehaz's frame art (cropped, beans / heart covered), the drink's vessel filled with its layers, and a placard. */
export function Frame({ f, active, onOpen }: Props) {
  const art = FRAME_ART[f.kind];
  const v = VESSEL_SIZE[f.drink.vessel];
  const g = geom(f.drink.vessel);
  const total = f.drink.layers.reduce((a, l) => a + l.parts, 0);
  const b = bands(f.drink.layers, total, g);
  const recipe = recipeLine(f.drink, (i) => LABEL[i]);
  const left = f.x - f.w / 2;

  return (
    <>
      <div
        className={`gframe${active ? ' is-active' : ''}`}
        role="button"
        tabIndex={0}
        data-id={f.id}
        aria-label={`${f.drink.name}, ${f.drink.category}: ${recipe}. Look closer.`}
        onClick={() => onOpen(f)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(f); } }}
        style={{ left, top: f.top, width: f.w, height: f.h, rotate: `${f.rot}deg` }}
      >
        <svg className="gframe-art" width={f.w} height={f.h} viewBox={`${art.crop[0]} ${art.crop[1]} ${art.crop[2]} ${art.crop[3]}`} aria-hidden="true">
          <use href="#frames-art" width="294" height="204" />
          <rect x={art.cover.x + art.crop[0]} y={art.cover.y + art.crop[1]} width={art.cover.w} height={art.cover.h} fill={art.cover.fill} />
        </svg>
        <div className="gvessel" style={{ left: art.inner.cx * f.s - v.w / 2, top: art.inner.cy * f.s - v.h / 2, width: v.w, height: v.h, '--vh': `${v.h}px` } as React.CSSProperties}>
          <div className="gv-art" dangerouslySetInnerHTML={{ __html: vessels[f.drink.vessel] }} />
          <Liquid geom={g} bands={b} blended={f.drink.blended} crema={f.drink.crema} microfoam={f.drink.microfoam} clipId={`frame-${f.id}`} />
          {f.drink.vessel === '01' ? <div className="gv-art" dangerouslySetInnerHTML={{ __html: ribs() }} /> : null}
        </div>
      </div>

      <div className={`placard${active ? ' is-active' : ''}`} style={{ left: f.x - 100, top: f.top + f.h + 14 }} aria-hidden="true">
        <b>{f.drink.name}</b>
        <span>{f.drink.category}</span>
        <span>{recipe}</span>
        {active ? <i className="look-hint">↑ look closer</i> : null}
      </div>
    </>
  );
}
