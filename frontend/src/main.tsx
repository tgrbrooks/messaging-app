import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('Service Worker registration successful with scope:', registration.scope);

            if (navigator.onLine && 'sync' in registration) {
                try {
                    await (registration as any).sync.register('process-unsent-requests');
                    console.log('Background sync registered');
                } catch (error) {
                    console.error('Background sync registration failed:', error);
                }
            }

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed');
            });

            registration.addEventListener('statechange', () => {
                console.log('Service Worker state changed:', registration.active?.state);
            });

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.log('Service Workers are not supported');
    }
}

window.addEventListener('load', registerServiceWorker);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
) 