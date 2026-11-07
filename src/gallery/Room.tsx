import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TestGlass } from '../components/TestGlass';
import { COLOR, LABEL } from '../data/colors';
import { DRINKS, type Drink, type Ingredient } from '../data/drinks';
import { CAPACITY, Deck, SHELF, check, countsOf, displayLayers, feedback, hintStep, type Result } from '../logic/quiz';
import { loadProgress, recordAnswer, type Progress } from '../logic/storage';
import { CARD_H, CARD_W, CardFront } from './CardFace';
import { Art, closed } from './props';
import type { BagState } from './Bag';
import { inBag } from './Bag';
import { FLOOR_Y } from './layout';

export const COUNTER_TOP = 590;
const GLASS_W = 219, GLASS_H = 306;
const SHELF_X = 300, PITCH = 118; // the shelf is centred on the screen: its 712 px board runs from 284 to 996
const ROW_TOP = [50, 160];
const INK = '#1e1e1e', PAPER = '#f7f5f1';

type Mode = 'mix' | 'seen' | 'learn';
const MODES: { id: Mode; label: string }[] = [{ id: 'mix', label: 'mix' }, { id: 'seen', label: "what i've seen" }, { id: 'learn', label: 'still to learn' }];

const ROW1: Ingredient[] = [...SHELF[0].items, ...SHELF[1].items, ...SHELF[3].items]; // coffee, water, sweet
const ROW2: Ingredient[] = SHELF[2].items; // dairy
const CAPTIONS = [
  { row: 0, at: 0, text: 'coffee' }, { row: 0, at: 2, text: 'water' }, { row: 0, at: 5, text: 'sweet' }, { row: 1, at: 0, text: 'dairy' },
];

function JarArt({ ing }: { ing: Ingredient }) {
  const content = ing === 'ice' ? [[14, 36], [82, 36], [86, 70], [82, 76], [14, 76], [10, 70]] : [[12, 30], [84, 30], [88, 70], [84, 76], [12, 76], [8, 70]];
  return (
    <Art
      width={96}
      height={80}
      shapes={[
        { d: closed([[8, 10], [88, 10], [92, 70], [86, 78], [10, 78], [4, 70]], 90 + ing.length, 16), fill: PAPER, w: 4 },
        { d: closed(content as [number, number][], 120 + ing.length, 16), fill: COLOR[ing], stroke: INK, w: ing === 'ice' ? 3 : 0 },
        { d: closed([[20, 0], [76, 0], [76, 12], [20, 12]], 150 + ing.length, 20), fill: INK, w: 4 },
      ]}
    />
  );
}

type Props = {
  viewLeft: number;
  bag: BagState;
  onMood: (m: 'order' | 'cheer' | 'idle') => void;
  onCheer: () => void;
  onAnswered: () => void;
  compact: boolean; // phone landscape: the controls move to a fixed bar in real pixels
};

/** The testing room: a barista studio. She orders, you pour from the jars on the shelf into the glass, serve it, and get checked. */
export function TestingRoom({ viewLeft, bag, onMood, onCheer, onAnswered, compact }: Props) {
  const [mode, setMode] = useState<Mode>('mix');
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const deck = useRef<Deck | null>(null);
  const [drink, setDrink] = useState<Drink | null>(null);
  const [pours, setPours] = useState<Ingredient[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState<0 | 1 | 2>(0); // taps on hint: 1 = the kind of drink, 2 = and how many ingredients
  const [pour, setPour] = useState<{ ing: Ingredient; n: number } | null>(null);
  const [fly, setFly] = useState<Drink | null>(null);
  const flyEl = useRef<HTMLDivElement>(null);

  const pool = useMemo(() => {
    const built = new Set(progress.built);
    return mode === 'mix' ? undefined : DRINKS.filter((d) => (mode === 'seen' ? inBag(bag, d.id) : !built.has(d.id))).map((d) => d.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // a new deck whenever the mode changes
  useEffect(() => {
    deck.current = new Deck(Math.random, pool);
    const empty = pool !== undefined && pool.length === 0;
    setDrink(empty ? null : deck.current.next());
    setPours([]); setResult(null); setHint(0); setPour(null);
    onMood('order');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const full = pours.length >= CAPACITY;
  const counts = useMemo(() => countsOf(pours), [pours]);
  const mine = displayLayers(pours, !!drink?.orderMatters);
  const answer = drink ? displayLayers(drink.layers.flatMap((l) => Array<Ingredient>(l.parts).fill(l.ing)), !!drink.orderMatters) : [];

  const add = (ing: Ingredient) => {
    if (full || result || !drink) return;
    setPours((p) => [...p, ing]);
    setPour((x) => ({ ing, n: (x?.n ?? 0) + 1 }));
  };

  const serve = () => {
    if (!drink || !pours.length || result) return;
    const r = check(drink, pours);
    deck.current!.report(drink.id, r.ok);
    setProgress((p) => recordAnswer(p, drink.id, r.ok));
    setResult(r);
    onAnswered();
    if (r.ok) { onMood('cheer'); onCheer(); setFly(drink); } else onMood('idle');
  };

  const next = () => {
    const d = deck.current!.next();
    setDrink(d); setPours([]); setResult(null); setHint(0); setPour(null);
    onMood('order');
  };

  // the card flies into her bag
  useEffect(() => {
    if (!fly || !flyEl.current) return;
    const el = flyEl.current;
    const to = { x: viewLeft + 24 + 60 - CARD_W / 2, y: 706 - CARD_H / 2 };
    const from = { x: 640 - CARD_W / 2, y: 440 - CARD_H / 2 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const a = el.animate(
      reduce
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { transform: `translate(${from.x}px, ${from.y}px) scale(0.3)`, opacity: 0, offset: 0 },
            { transform: `translate(${from.x}px, ${from.y - 40}px) scale(0.36)`, opacity: 1, offset: 0.25 },
            { transform: `translate(${to.x}px, ${to.y}px) scale(0.12)`, opacity: 0.1, offset: 1 },
          ],
      { duration: reduce ? 250 : 900, delay: reduce ? 0 : 500, easing: 'ease-in', fill: 'both' },
    );
    a.onfinish = () => setFly(null);
    return () => a.cancel();
  }, [fly, viewLeft]);

  const stats = `${progress.correct} right of ${progress.attempts} · streak ${progress.streak}`;
  const empty = pool !== undefined && pool.length === 0;
  const dis = !drink || !!result || empty;

  const jar = (ing: Ingredient, i: number, row: number) => (
    <button
      key={ing}
      type="button"
      className="jar"
      style={{ left: SHELF_X + i * PITCH - 6, top: ROW_TOP[row] }}
      disabled={dis || full}
      aria-label={`Pour ${LABEL[ing]}${(counts.get(ing) ?? 0) ? `, ${counts.get(ing)} so far` : ''}`}
      onClick={() => add(ing)}
    >
      <JarArt ing={ing} />
      <span className="jar-label">{LABEL[ing]}</span>
      {(counts.get(ing) ?? 0) >= 2 ? <span className="chip jar-chip">x{counts.get(ing)}</span> : null}
    </button>
  );

  const bubbleEl = (
    <>
      {drink ? (
        <div className="room-bubble" aria-live="polite">
          <span>make me a</span>
          <b>{drink.name.toLowerCase()}</b>
          {hint ? <small>{hintStep(drink, hint)}</small> : null}
        </div>
      ) : null}
      {empty ? (
        <div className="room-bubble">
          <span>{mode === 'seen' ? 'nothing in your bag yet.' : 'you have mastered everything!'}</span>
          <small>{mode === 'seen' ? 'walk the gallery, then come back.' : 'switch to mix to practise again.'}</small>
        </div>
      ) : null}
    </>
  );
  const tabsEl = (
      <div className="room-tabs" role="group" aria-label="Question mode">
        {MODES.map((m) => <button key={m.id} type="button" className="room-tab" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
      </div>
  );
  const buttonsEl = (
      <div className="counter-buttons">
        <button type="button" className="btn-inline" disabled={dis || !pours.length} onClick={() => setPours((p) => p.slice(0, -1))}>undo</button>
        <button type="button" className="btn-inline" disabled={dis || !pours.length} onClick={() => setPours([])}>clear</button>
        <button type="button" className="btn-inline" disabled={dis || hint === 2} onClick={() => setHint((h) => (h === 0 ? 1 : 2))}>hint</button>
        <button type="button" className="btn-primary" disabled={dis || !pours.length} onClick={serve}>SERVE IT</button>
      </div>
  );
  const statsEl = (
      <p className="room-stats">{stats}</p>
  );
  const resultEl = (
    <>
      {result && drink ? (
        <div className="room-result" role="status">
          {!result.ok ? (
            <div className="rr-glasses">
              <figure><TestGlass layers={mine} scale={0.6} /><figcaption>yours</figcaption></figure>
              <figure><TestGlass layers={answer} drink={drink} scale={0.6} /><figcaption>correct</figcaption></figure>
            </div>
          ) : null}
          <div className="rr-text">
            <span className={`stamp ${result.ok ? 'win lilac' : 'miss'}`}>{result.ok ? 'NAILED IT' : 'NOT QUITE'}</span>
            <p className="rr-feedback">{feedback(drink, result)}</p>
            <p className="rr-tip">{drink.tip}</p>
            <button type="button" className="btn-primary" autoFocus onClick={next}>NEXT DRINK</button>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="g-room">
      {/* wall shelf */}
      {ROW_TOP.map((t, r) => (
        <div key={r} className="shelf-board" style={{ left: SHELF_X - 16, top: t + 74, width: (r === 0 ? ROW1.length : ROW2.length) * PITCH + 4 }} />
      ))}
      {CAPTIONS.map((c) => (
        <span key={c.text} className="shelf-cap" style={c.row === 0 ? { left: SHELF_X + c.at * PITCH, top: 26 } : { left: SHELF_X - 70, top: ROW_TOP[1] + 34 }}>{c.text}</span>
      ))}
      {ROW1.map((ing, i) => jar(ing, i, 0))}
      {ROW2.map((ing, i) => jar(ing, i, 1))}

      {!compact ? bubbleEl : null}

      {/* the counter, with the glass on it */}
      <div className="counter-art" style={{ top: COUNTER_TOP }} aria-hidden="true">
        <Art width={3200} height={112} shapes={[
          { d: closed([[0, 0], [3200, 0], [3200, 28], [0, 28]], 201, 80), fill: PAPER, w: 5 },
          { d: closed([[0, 28], [3200, 28], [3200, 110], [0, 110]], 202, 80), fill: INK, w: 5 },
        ]} />
      </div>
      <div className="room-glass" style={{ left: 640 - GLASS_W / 2, top: COUNTER_TOP - GLASS_H + 4, width: GLASS_W, height: GLASS_H }}>
        <TestGlass layers={mine} />
        {pour ? <span key={pour.n} className="stream" style={{ background: COLOR[pour.ing] }} /> : null}
        {result?.ok ? <span className="room-stamp">NAILED IT</span> : null}
      </div>

      {!compact ? <>{tabsEl}{buttonsEl}{statsEl}{resultEl}</> : null}
      {compact ? createPortal(<div className="ph-room">{bubbleEl}{resultEl}<div className="ph-room-bar">{tabsEl}<div className="ph-room-row">{buttonsEl}</div><div className="ph-room-foot">{statsEl}</div></div></div>, document.body) : null}

      {fly ? (
        <div ref={flyEl} className="fly-card" style={{ width: CARD_W, height: CARD_H }} aria-hidden="true">
          <div className="cc-face" style={{ position: 'absolute', inset: 0 }}><CardFront drink={fly} mastered /></div>
        </div>
      ) : null}
    </div>
  );
}

/** Wall, skirting and floor strokes for the room, drawn wide enough for any window. */
export function RoomBackdrop() {
  return <div className="g-skirting room-skirting" style={{ top: FLOOR_Y - 18 }} aria-hidden="true" />;
}
