import { useEffect, useRef, useState } from 'react';
import { COLOR } from '../data/colors';

const Swatch = ({ color, dots, label }: { color: string; dots?: boolean; label: string }) => (
  <span className="sw-row">
    <span className="sw" style={{ background: color }}>
      {dots ? <i /> : null}
    </span>
    {label}
  </span>
);

export function Legend() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="legend-wrap" ref={root}>
      {open ? (
        <div className="legend-pop" role="dialog" aria-label="Coffee legend">
          <Swatch color={COLOR.drip} label="coffee" />
          <Swatch color={COLOR['steamed-milk']} label="milk" />
          <Swatch color={COLOR.foam} dots label="foam" />
          <Swatch color={COLOR['hot-water']} label="water" />
          <span className="sw-row extras">
            extras
            <span className="sw" style={{ background: COLOR.chocolate }} title="chocolate" />
            <span className="sw" style={{ background: COLOR['whipped-cream'] }} title="cream" />
            <span className="sw" style={{ background: COLOR['ice-cream'] }} title="ice cream" />
          </span>
          <p>typical cafe proportions</p>
        </div>
      ) : null}
      <button type="button" className="legend" aria-expanded={open} aria-label="Coffee legend" onClick={() => setOpen((o) => !o)}>
        <span className="legend-help">?</span>
        <span>coffee legend</span>
      </button>
    </div>
  );
}
