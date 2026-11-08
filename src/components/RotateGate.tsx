import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BeanBand } from '../gallery/CardFace';

const QUERY = '(orientation: portrait) and (max-width: 899px)';
export const isPortraitPhone = () => window.matchMedia(QUERY).matches;

/** True while a phone or tablet is held upright. */
export function usePortrait() {
  const [p, setP] = useState(isPortraitPhone);
  useEffect(() => {
    const mq = window.matchMedia(QUERY), on = () => setP(mq.matches);
    mq.addEventListener('change', on);
    window.addEventListener('resize', on);
    return () => { mq.removeEventListener('change', on); window.removeEventListener('resize', on); };
  }, []);
  return p;
}

/** A full-screen beige overlay above everything while the screen is upright; it fades out over 200 ms in landscape. Nothing underneath resets. */
export function RotateGate({ portrait }: { portrait: boolean }) {
  const [mounted, setMounted] = useState(portrait);
  useEffect(() => {
    if (portrait) { setMounted(true); return; }
    const t = window.setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [portrait]);
  if (!mounted) return null;
  return createPortal(
    <div className={`rg${portrait ? '' : ' is-out'}`} role="alertdialog" aria-modal="true" aria-label="Turn your phone sideways">
      <div className="rg-beans" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <BeanBand key={i} className="rg-tile" />)}</div>
      <div className="rg-box">
      <svg className="rg-phone" width="84" height="120" viewBox="0 0 84 120" fill="none" aria-hidden="true">
        <path d="M14 6C28 4 56 5 70 6C76 7 78 11 78 16L79 104C79 110 75 114 70 114C56 116 28 116 14 114C8 113 6 109 6 104L5 16C5 11 8 7 14 6Z" stroke="#1e1e1e" strokeWidth="5" strokeLinejoin="round" fill="#f7f5f1" />
        <path d="M30 16C38 15 46 15 54 16" stroke="#1e1e1e" strokeWidth="4" strokeLinecap="round" />
        <circle cx="42" cy="102" r="4" stroke="#1e1e1e" strokeWidth="3" />
      </svg>
      <p className="rg-title">turn your phone sideways</p>
      <p className="rg-body">the coffee tour only works in landscape.</p>
      <p className="rg-small">rotation locked? turn it off in your control centre.</p>
      </div>
    </div>,
    document.body,
  );
}
