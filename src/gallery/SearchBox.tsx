import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Drink } from '../data/drinks';
import { isSeen } from './saved';
import { closest, search } from './search';

export type SearchHandle = { focus: () => void };

/** "find a coffee": matches as you type (names and aliases), arrow keys and Enter pick one. */
export const SearchBox = forwardRef<SearchHandle, { onPick: (d: Drink) => void; className?: string; autoFocus?: boolean; style?: React.CSSProperties }>(function SearchBox({ onPick, className, autoFocus, style }, ref) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const results = useMemo(() => search(q).slice(0, 6).map((r) => r.drink), [q]);
  const alt = useMemo(() => (q && !results.length ? closest(q) : []), [q, results]);
  const list = results.length ? results : alt;
  useEffect(() => setI(0), [q]);

  const pick = (d: Drink) => { setQ(''); setOpen(false); input.current?.blur(); onPick(d); };

  return (
    <div className={`g-search${className ? ' ' + className : ''}`} style={style} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && list.length ? `${id}-${i}` : undefined}
        aria-label="Find a coffee (press / to focus)"
        placeholder="find a coffee"
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
          else if (e.key === 'Enter' && results.length) { e.preventDefault(); pick(results[i] ?? results[0]); }
          else if (e.key === 'Escape') { e.stopPropagation(); setQ(''); setOpen(false); input.current?.blur(); }
        }}
      />
      {open && q ? (
        <div className="g-results" id={`${id}-list`} role="listbox">
          {!results.length ? <p className="g-none">not on the walls yet. closest:</p> : null}
          {list.map((d, n) => (
            <button
              key={d.id}
              id={`${id}-${n}`}
              type="button"
              role="option"
              aria-selected={n === i}
              className="g-result"
              onMouseEnter={() => setI(n)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(d)}
            >
              <b>{d.name.toLowerCase()}</b>
              <small>{d.category}</small>
              {isSeen(d.id) ? <i className="seen-dot" title="already in your bag" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
