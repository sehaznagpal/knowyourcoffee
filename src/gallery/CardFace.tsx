import { useLayoutEffect, useRef } from 'react';
import { COLOR, LABEL } from '../data/colors';
import { DRINKS, type Drink } from '../data/drinks';
import { isFloater } from '../logic/layers';
import { CARD_PIC, CardArt } from './Frame';
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
      <div className="cf-pic" style={{ width: CARD_PIC.w, height: CARD_PIC.h }}><CardArt f={f} /></div>
      <h2 className="cf-name">{drink.name.toLowerCase()}</h2>
      <p className="cf-recipe">{recipeLine(drink, (i) => LABEL[i])}</p>
    </div>
  );
}

// ---- the back of a card: a shared bean pattern on top, a colour block by category below ----
export const CAT_STYLE: Record<Drink['category'], { bg: string; fg: string }> = {
  shots: { bg: '#4A2E22', fg: '#F4F0E4' },
  'with water': { bg: '#A3E3FA', fg: '#1E1E1E' },
  'with drip': { bg: '#C69469', fg: '#1E1E1E' },
  'with milk': { bg: '#EADCC6', fg: '#1E1E1E' },
  'cold & sweet': { bg: '#F2D4D4', fg: '#1E1E1E' },
};
// Big cut-paper beans: [centre x, centre y, half length, half width, rotation]. They overlap and run off the band's edges.
const BEANS: [number, number, number, number, number][] = [
  [26, 28, 74, 46, -32], [118, 44, 68, 44, 24], [205, 14, 64, 40, -52], [282, 62, 64, 48, 16], [78, 128, 74, 44, -8], [214, 128, 76, 46, 18],
];
// a hand-cut polygon around each bean: straight edges, a little uneven
const beanPoints = (rx: number, ry: number, seed: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const t = (i / 10) * Math.PI * 2, j = 0.9 + 0.12 * Math.sin(i * 2.3 + seed);
    return `${(Math.cos(t) * rx * j).toFixed(1)},${(Math.sin(t) * ry * j).toFixed(1)}`;
  }).join(' ');
export function BeanBand({ className = 'cb-band' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 138" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="138" fill="#F4F0E4" />
      <defs>
        {BEANS.map(([x, y, rx, ry, r], i) => (
          <clipPath key={i} id={`cb-bean-${i}`}><polygon points={beanPoints(rx, ry, i)} transform={`translate(${x} ${y}) rotate(${r})`} /></clipPath>
        ))}
      </defs>
      {BEANS.map(([x, y, rx, ry, r], i) => <polygon key={i} points={beanPoints(rx, ry, i)} transform={`translate(${x} ${y}) rotate(${r})`} fill="#1E1E1E" />)}
      {/* the centre crease of each bean is cut out as a paper gap */}
      {BEANS.map(([x, y, rx, ry, r], i) => (
        <g key={i} clipPath={`url(#cb-bean-${i})`}>
          <path d={`M${-rx * 1.1} ${ry * 0.05} C${-rx * 0.4} ${-ry * 0.35} ${rx * 0.4} ${ry * 0.35} ${rx * 1.1} ${-ry * 0.05}`} transform={`translate(${x} ${y}) rotate(${r})`} fill="none" stroke="#F4F0E4" strokeWidth="7" strokeLinecap="butt" />
        </g>
      ))}
    </svg>
  );
}
const orderNote = (d: Drink) => {
  const names = d.layers.map((l) => LABEL[l.ing]);
  return `\u2605 ${names[0]} first, then ${names.slice(1).join(', then ')}.`;
};

/** Back: the pattern band, then the layers as a small labelled diagram, the tip, what it is often confused with, and a note where the order matters. */
export function CardBack({ drink, onJump }: { drink: Drink; onJump: (id: string) => void }) {
  const ordered = [...drink.layers.filter((l) => !isFloater(l.ing)), ...drink.layers.filter((l) => isFloater(l.ing))];
  const c = CAT_STYLE[drink.category];
  // the colour block is 70% of the card: a card with a lot to say is scaled down a little so nothing is cut off or touches the edges
  const fit = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = fit.current;
    if (!el?.parentElement) return;
    const run = () => {
      const avail = el.parentElement!.clientHeight - 32;
      el.style.width = '100%'; el.style.height = 'auto'; el.style.transform = 'none';
      const need = el.offsetHeight;
      const k = Math.max(0.68, Math.min(1, avail / need));
      el.style.width = `${100 / k}%`; el.style.height = `${avail / k}px`; el.style.transform = k < 1 ? `scale(${k})` : 'none';
    };
    run();
    document.fonts?.ready.then(run);
  }, [drink.id]);
  return (
    <div className="cb" style={{ '--cb-bg': c.bg, '--cb-fg': c.fg } as React.CSSProperties}>
      <BeanBand />
      <div className="cb-body">
       <div className="cb-fit" ref={fit}>
        <h3>{drink.name.toLowerCase()}<small>{drink.category}</small></h3>
        <div className="cb-row">
          <ul className="cb-layers" aria-label="Layers from the top down">
            {[...ordered].reverse().map((l, i) => (
              <li key={i} style={{ height: 16 + l.parts * 6 }}>
                <span className="cb-swatch" style={{ background: drink.blended ? COLOR.blend : COLOR[l.ing] }} />
                <span className="cb-line" />
                <span className="cb-tag">{LABEL[l.ing]} x{l.parts}</span>
              </li>
            ))}
          </ul>
          {drink.orderMatters ? <p className="cb-order">{orderNote(drink)}</p> : null}
        </div>
        <p className="cb-tip">{drink.tip}</p>
        {drink.confusedWith.length ? (
          <div className="cb-confused">
            <h4>often confused with</h4>
            {drink.confusedWith.map((cw) => {
              const other = DRINKS.find((d) => d.id === cw.id)!;
              return (
                <button key={cw.id} type="button" className="cb-chip" onClick={() => onJump(cw.id)} aria-label={`${other.name}: ${cw.text} Go to ${other.name}.`}>
                  <b>{other.name.toLowerCase()}</b><span>{cw.text}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <p className="cb-foot">{FOOTNOTE}</p>
       </div>
      </div>
    </div>
  );
}

export const Footnote = () => <>{FOOTNOTE}</>;
export const cardLabel = (d: Drink) => `${d.name}, ${d.category}: ${recipeLine(d, (i) => LABEL[i])}`;
export { placeFor };
