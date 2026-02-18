import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './core/styles/globals.css';
import './core/styles/fonts.ts'; // Import fonts
import './core/i18n'; // Initialize i18n

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <React.Suspense fallback={<div className="h-screen w-screen bg-stone-950" />}>
      <App />
    </React.Suspense>
  </React.StrictMode>
);