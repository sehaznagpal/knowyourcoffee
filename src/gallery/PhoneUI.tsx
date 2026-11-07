import { forwardRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Drink } from '../data/drinks';
import { SearchBox, type SearchHandle } from './SearchBox';
import { toggleMuted, useMuted } from '../audio/sound';
import { SpeakerIcon } from './SpeakerIcon';

type Props = {
  inRoom: boolean;
  bagText: string;
  canLook: boolean;
  lookLabel: string;
  onLook: () => void;
  onHold: (d: -1 | 0 | 1, run?: boolean) => void;
  onBack: () => void;
  onMap: () => void;
  onBag: () => void;
  onHelp: () => void;
  onTest: () => void;
  onPick: (d: Drink) => void;
};

const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d={left ? 'M13 3 6 10l7 7' : 'M7 3l7 7-7 7'} stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Phone landscape: controls in real screen pixels (touch targets of 44 px and up), outside the scaled stage, inside the safe areas. */
export const PhoneUI = forwardRef<SearchHandle, Props>(function PhoneUI(p, ref) {
  const [searching, setSearching] = useState(false);
  const soundOff = useMuted();
  const last = useState({ t: 0 })[0]; // time of the previous release, for double-tap-and-hold to run

  const hold = (dir: -1 | 1) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      p.onHold(dir, performance.now() - last.t < 320);
    },
    onPointerUp: () => { last.t = performance.now(); p.onHold(0); },
    onPointerCancel: () => p.onHold(0),
  });

  return createPortal(
    <div className="ph" role="presentation">
      <div className="ph-top">
        {p.inRoom ? <button type="button" className="ph-back" onClick={p.onBack}>← back to the gallery</button> : <span />}
        <div className="ph-top-right">
          <button type="button" className="ph-icon ph-help" aria-pressed={!soundOff} aria-label={soundOff ? 'Sound is off' : 'Sound is on'} onClick={toggleMuted}><SpeakerIcon off={soundOff} /></button>
          {!p.inRoom ? (
            <>
              <button type="button" className="ph-icon" data-wt="search" aria-label="Find a coffee" aria-expanded={searching} onClick={() => setSearching((s) => !s)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="#1e1e1e" strokeWidth="3" /><path d="m15 15 6 6" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" /></svg>
              </button>
              <button type="button" className="ph-icon" data-wt="map" aria-label="Open the map" onClick={p.onMap}>
                <svg width="26" height="22" viewBox="0 0 26 22" fill="none" aria-hidden="true"><rect x="2" y="5" width="22" height="12" rx="2" stroke="#1e1e1e" strokeWidth="3" /><path d="M9 5v12M16 5v12" stroke="#1e1e1e" strokeWidth="2.5" /></svg>
              </button>
            </>
          ) : null}
          <button type="button" className="ph-icon ph-bag" data-wt="bag" aria-label={`Open the bag: ${p.bagText}`} onClick={p.onBag}>
            <svg width="26" height="26" viewBox="0 0 30 28" fill="none" aria-hidden="true"><path d="M9 10C9 3 21 3 21 10" stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" /><path d="M3 10h24l2 15H1Z" fill="#1e1e1e" stroke="#1e1e1e" strokeWidth="3" strokeLinejoin="round" /></svg>
          </button>
          {!p.inRoom ? <button type="button" className="ph-icon ph-help" data-wt="help" aria-label="Help: the walkthrough" onClick={p.onHelp}>?</button> : null}
          {!p.inRoom ? <button type="button" className="ph-test" data-wt="test" onClick={p.onTest}>test</button> : null}
        </div>
      </div>
      {searching && !p.inRoom ? (
        <SearchBox ref={ref} className="ph-search" autoFocus onPick={(d) => { setSearching(false); p.onPick(d); }} />
      ) : null}

      {!p.inRoom ? (
        <>
          <div className="ph-walk">
            <button type="button" className="arrow-btn ph-arrow" aria-label="Walk left (hold; double-tap and hold to run)" {...hold(-1)}><Chevron left /></button>
            <button type="button" className="arrow-btn ph-arrow" aria-label="Walk right (hold; double-tap and hold to run)" {...hold(1)}><Chevron /></button>
          </div>
          <button type="button" className="ph-look" disabled={!p.canLook} aria-label={p.canLook ? p.lookLabel : 'Look closer (stand in front of a frame)'} onClick={p.onLook}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M2 15C6 7 24 7 28 15 24 23 6 23 2 15Z" stroke="#1e1e1e" strokeWidth="3" strokeLinejoin="round" /><circle cx="15" cy="15" r="4" fill="#1e1e1e" /></svg>
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  );
});
