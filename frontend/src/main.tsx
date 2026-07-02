import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Handle chunk load / dynamic import errors gracefully by reloading the page
window.addEventListener('error', (event) => {
  const chunkFailedMessage = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/;
  if (event.message && chunkFailedMessage.test(event.message)) {
    const chunkErrorReloadKey = 'chunk-error-reload';
    const lastReload = sessionStorage.getItem(chunkErrorReloadKey);
    const now = Date.now();
    // Only reload if we haven't reloaded due to a chunk error in the last 10 seconds
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(chunkErrorReloadKey, now.toString());
      console.warn("Dynamic import failed (likely due to a new deployment). Reloading page...");
      window.location.reload();
    } else {
      console.error("Dynamic import failed repeatedly. Skipping reload to avoid loop.");
    }
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
