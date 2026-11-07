import { COLOR, LABEL } from '../data/colors';
import { DRINKS, type Drink } from '../data/drinks';
import { isFloater } from '../logic/layers';
import { orderHint } from '../logic/quiz';
import { FrameArt } from './Frame';
import { placeFor, recipeLine } from './layout';

export const CARD_W = 320;
export const CARD_H = 460;
const FOOTNOTE = 'Proportions are typical café ratios; real cafés vary.';

/** Front: the picture as it hangs on the wall, the name, the category, and a lilac stamp once the drink has been built right. */
export function CardFront({ drink, mastered }: { drink: Drink; mastered: boolean }) {
  const f = placeFor(drink);
  return (
    <div className="cf">
      <span className="cf-tag">{drink.category}</span>
      {mastered ? <span className="cf-stamp">NAILED IT</span> : null}
      <div className="cf-pic" style={{ width: f.w, height: f.h }}><FrameArt f={f} /></div>
      <h2 className="cf-name" style={{ fontSize: drink.name.length > 12 ? 31 : 40 }}>{drink.name.toLowerCase()}</h2>
      <p className="cf-recipe">{recipeLine(drink, (i) => LABEL[i])}</p>
    </div>
  );
}

/** Back: the layers as a small labelled diagram, the tip, what it is often confused with, and a note where the order matters. */
export function CardBack({ drink, onJump }: { drink: Drink; onJump: (id: string) => void }) {
  const ordered = [...drink.layers.filter((l) => !isFloater(l.ing)), ...drink.layers.filter((l) => isFloater(l.ing))];
  return (
    <div className="cb">
      <h3>{drink.name.toLowerCase()}<small>{drink.category}</small></h3>
      <ul className="cb-layers" aria-label="Layers from the top down">
        {[...ordered].reverse().map((l, i) => (
          <li key={i} style={{ height: 26 + l.parts * 9 }}>
            <span className="cb-swatch" style={{ background: drink.blended ? COLOR.blend : COLOR[l.ing] }} />
            <span className="cb-line" />
            <span className="cb-tag">{LABEL[l.ing]} x{l.parts}</span>
          </li>
        ))}
      </ul>
      {drink.orderMatters ? <p className="cb-order">{orderHint(drink)}</p> : null}
      <p className="cb-tip">{drink.tip}</p>
      {drink.confusedWith.length ? (
        <div className="cb-confused">
          <h4>often confused with</h4>
          {drink.confusedWith.map((c) => {
            const other = DRINKS.find((d) => d.id === c.id)!;
            return (
              <button key={c.id} type="button" className="cb-chip" onClick={() => onJump(c.id)} aria-label={`${other.name}: ${c.text} Go to ${other.name}.`}>
                <b>{other.name.toLowerCase()}</b><span>{c.text}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="cb-foot">{FOOTNOTE}</p>
    </div>
  );
}

export const Footnote = () => <>{FOOTNOTE}</>;
export const cardLabel = (d: Drink) => `${d.name}, ${d.category}: ${recipeLine(d, (i) => LABEL[i])}`;
export { placeFor };
