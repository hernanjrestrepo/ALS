import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// El archivo sw.js siempre existio pero nunca se registraba: sin esto el
// navegador no ofrece "instalar como app" (PWA) y las notificaciones push
// nunca llegaban a activarse, porque navigator.serviceWorker.ready nunca
// se resuelve sin un service worker activo.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker:', error);
    });
  });
}
