import { useEffect, useState } from 'react';
import { Landing } from './components/Landing';
import { Table } from './components/Table';

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
  const [, setIsTestOpen] = useState(false);
  const scale = useStageScale();
  const split = (window.innerHeight - FRAME.h * scale) / 2 + 465 * scale;

  return (
    <div className={`viewport screen-${screen}`} style={{ '--split': `${split}px`, '--s': scale } as React.CSSProperties}>
      <div
        className="stage"
        style={{ width: FRAME.w, height: FRAME.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {screen === 'landing' ? <Landing onStart={() => setScreen('table')} /> : <Table onHome={() => setScreen('landing')} onTest={() => setIsTestOpen(true)} />}
      </div>
      <div className="rotate-note">rotate your phone</div>
    </div>
  );
}
