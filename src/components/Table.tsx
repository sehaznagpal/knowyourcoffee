import { table, frames } from '../art-loader';
import { CATEGORIES, DRINKS } from '../data/drinks';
import { TAG_DEFAULT, TAG_POS, slotCenter } from '../data/layout';
import { Cup } from './Cup';
import { Legend } from './Legend';

type Props = { onHome: () => void; onTest: () => void };

export function Table({ onHome, onTest }: Props) {
  return (
    <div className="table-screen">
      <div className="frames" dangerouslySetInnerHTML={{ __html: frames }} />
      <button type="button" className="wordmark" onClick={onHome}>know your coffee</button>
      <div className="table-art" dangerouslySetInnerHTML={{ __html: table }} />
      <div className="cups">
        {DRINKS.map((d, i) => <Cup key={d.id} drink={d} x={slotCenter(i)} />)}
        {CATEGORIES.map((c) => {
          const first = DRINKS.findIndex((d) => d.category === c);
          const pos = TAG_POS[c] ?? TAG_DEFAULT;
          return <span key={c} className="tag" style={{ left: slotCenter(first) + pos.dx, top: pos.y }}>{c}</span>;
        })}
      </div>
      <Legend />
      <button type="button" className="btn test-btn" onClick={onTest}>test what you learned</button>
    </div>
  );
}
