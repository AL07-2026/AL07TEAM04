import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import '@/styles/globals.css';

// Automatically recover when a new deployment invalidates cached chunk hashes
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    window.location.reload();
  });
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('앱을 표시할 #root 요소를 찾을 수 없습니다.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

