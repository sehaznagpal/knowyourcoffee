import { useEffect, useState } from 'react';
import { Landing } from './components/Landing';

const FRAME = { w: 1280, h: 832 };

function useStageScale() {
  const calc = () => Math.min(window.innerWidth / FRAME.w, window.innerHeight / FRAME.h);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const [screen, setScreen] = useState<'landing' | 'table'>(params.get('screen') === 'table' ? 'table' : 'landing');
  const scale = useStageScale();

  return (
    <div className={`viewport screen-${screen}`}>
      <div
        className="stage"
        style={{ width: FRAME.w, height: FRAME.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {screen === 'landing' ? <Landing onStart={() => setScreen('table')} /> : null}
      </div>
      <div className="rotate-note">rotate your phone</div>
    </div>
  );
}
