import { useEffect, useState } from 'react';

// A phone held sideways: a touch screen that is not tall. Tablets keep the desktop layout. ?compact=1 forces it for review on a desktop.
const QUERY = '(pointer: coarse) and (max-height: 520px)';
const forced = () => new URLSearchParams(window.location.search).get('compact') === '1';

export function useCompact() {
  const [c, setC] = useState(() => forced() || window.matchMedia(QUERY).matches);
  useEffect(() => {
    const m = window.matchMedia(QUERY);
    const on = () => setC(forced() || m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return c;
}
