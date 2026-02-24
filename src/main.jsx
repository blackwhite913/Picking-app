import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Service worker registration is handled by vite-plugin-pwa auto-injection in build

if (import.meta.env.DEV) {
  console.log("ENV VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
  // #region agent log
  fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H1',location:'src/main.jsx:8',message:'App startup env resolved',data:{hasApiBaseUrl:!!import.meta.env.VITE_API_BASE_URL,apiBaseUrl:import.meta.env.VITE_API_BASE_URL||null,mode:import.meta.env.MODE},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  // #region agent log
  window.addEventListener('error', (event) => {
    fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H4',location:'src/main.jsx:12',message:'Window error event',data:{message:event.message||null,filename:event.filename||null,lineno:event.lineno||null,colno:event.colno||null},timestamp:Date.now()})}).catch(()=>{});
  });
  // #endregion

  // #region agent log
  window.addEventListener('unhandledrejection', (event) => {
    fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H5',location:'src/main.jsx:18',message:'Unhandled promise rejection',data:{reason:String(event.reason||'unknown')},timestamp:Date.now()})}).catch(()=>{});
  });
  // #endregion
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
