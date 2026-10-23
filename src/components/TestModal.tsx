import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COLOR, LABEL } from '../data/colors';
import type { Ingredient } from '../data/drinks';
import { CAPACITY, Deck, SHELF, check, countsOf, displayLayers, feedback, hintText, type Result } from '../logic/quiz';
import { loadProgress, recordAnswer, resetProgress } from '../logic/storage';
import { ErrorBoundary } from './ErrorBoundary';
import { TestGlass } from './TestGlass';

const W = 760, H = 560;

function useFit() {
  const calc = () => Math.min(1, (window.innerWidth * 0.9) / W, (window.innerHeight * 0.9) / H);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

function Modal({ onClose }: { onClose: () => void }) {
  const deck = useRef<Deck>(new Deck());
  const [drink, setDrink] = useState(() => deck.current.next());
  const [pours, setPours] = useState<Ingredient[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState(false);
  const [pour, setPour] = useState<{ ing: Ingredient; n: number } | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const fit = useFit();
  const card = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countsOf(pours), [pours]);
  const full = pours.length >= CAPACITY;
  const mine = displayLayers(pours, !!drink.orderMatters);
  const answer = displayLayers(drink.layers.flatMap((l) => Array<Ingredient>(l.parts).fill(l.ing)), !!drink.orderMatters);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); prev?.focus?.(); };
  }, [onClose]);

  const add = (ing: Ingredient) => {
    if (full || result) return;
    setPours((p) => [...p, ing]);
    setPour((x) => ({ ing, n: (x?.n ?? 0) + 1 }));
  };

  const serve = () => {
    const r = check(drink, pours);
    deck.current.report(drink.id, r.ok);
    setProgress((p) => recordAnswer(p, drink.id, r.ok));
    setResult(r);
  };

  const next = () => {
    setDrink(deck.current.next());
    setPours([]);
    setResult(null);
    setHint(false);
    setPour(null);
  };

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-fit" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${fit})` }}>
        <div className="modal" ref={card} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
          <button type="button" className="modal-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" stroke="#1e1e1e" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
          <header id="modal-title">
            <span className="m-small">make me a</span>
            <span className="m-name">{drink.name}</span>
          </header>

          {!result ? (
            <div className="m-body">
              <div className="m-glass">
                <TestGlass layers={mine} />
                {pour ? <span key={pour.n} className="stream" style={{ background: COLOR[pour.ing] }} /> : null}
              </div>
              <div className="m-side">
                <div className="shelf">
                  {SHELF.map((g) => (
                    <div key={g.group} className="shelf-group">
                      <span className="shelf-label">{g.group}</span>
                      <div className="shelf-items">
                        {g.items.map((ing) => (
                          <button key={ing} type="button" className="pill" disabled={full} onClick={() => add(ing)}>
                            <span className="swatch" style={{ background: COLOR[ing] }} />
                            {LABEL[ing]}
                            {(counts.get(ing) ?? 0) >= 2 ? <span className="chip">x{counts.get(ing)}</span> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {hint ? <p className="m-hint">{hintText(drink)}</p> : null}
                <div className="m-actions">
                  <button type="button" className="btn-inline" disabled={!pours.length} onClick={() => setPours((p) => p.slice(0, -1))}>undo</button>
                  <button type="button" className="btn-inline" disabled={!pours.length} onClick={() => setPours([])}>clear</button>
                  <button type="button" className="btn-inline" onClick={() => setHint(true)}>hint</button>
                  <button type="button" className="btn-primary" disabled={!pours.length} onClick={serve}>SERVE IT</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="m-body result">
              <div className="m-pair">
                <figure><TestGlass layers={mine} scale={0.62} /><figcaption>yours</figcaption></figure>
                <figure><TestGlass layers={answer} drink={drink} scale={0.62} /><figcaption>correct</figcaption></figure>
              </div>
              <div className="m-side">
                <span className={`stamp ${result.ok ? 'win' : 'miss'}`}>{result.ok ? 'NAILED IT' : 'NOT QUITE'}</span>
                <p className="m-feedback">{feedback(drink, result)}</p>
                <p className="m-tip">{drink.tip}</p>
                <div className="m-actions"><button type="button" className="btn-primary" autoFocus onClick={next}>NEXT DRINK</button></div>
              </div>
            </div>
          )}

          <footer>
            <span>{progress.correct} right of {progress.attempts} - streak {progress.streak}</span>
            <button type="button" className="reset" onClick={() => setProgress(resetProgress())}>reset progress</button>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function TestModal({ onClose }: { onClose: () => void }) {
  return (
    <ErrorBoundary onReset={onClose}>
      <Modal onClose={onClose} />
    </ErrorBoundary>
  );
}
