import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

const root = createRoot(document.getElementById('root')!);
if (window.location.pathname.replace(/\/+$/, '') === '/dev/character') {
  import('./dev/CharacterReview').then(({ CharacterReview }) => root.render(<CharacterReview />));
} else {
  root.render(<App />);
}
