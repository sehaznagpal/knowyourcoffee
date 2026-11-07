import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

// iPhone Safari: the visible height changes with the address bar and the rotation settles late. Tell every layout calculation to run again.
const kick = () => {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  window.setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
};
window.addEventListener('orientationchange', kick);
window.visualViewport?.addEventListener('resize', kick);
// holding a walk button must never scroll or bounce the page (typing in the search box and the result list still work)
document.addEventListener('touchmove', (e) => { if (!(e.target as Element | null)?.closest?.('input, .g-results, [data-scroll]')) e.preventDefault(); }, { passive: false });

const root = createRoot(document.getElementById('root')!);
if (window.location.pathname.replace(/\/+$/, '') === '/dev/character') {
  import('./dev/CharacterReview').then(({ CharacterReview }) => root.render(<CharacterReview />));
} else {
  root.render(<App />);
}
