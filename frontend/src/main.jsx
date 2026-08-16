import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { PWAProvider } from './context/PWAContext.jsx'

// Register Service Worker only in production to prevent caching local development assets
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[SW] Registered, scope:', reg.scope))
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('[SW] Unregistered active service worker for development mode');
          window.location.reload(); // Reload once to fetch fresh assets from network
        }
      });
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PWAProvider>
      <App />
    </PWAProvider>
  </StrictMode>,
)

