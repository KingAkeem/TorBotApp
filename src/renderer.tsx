import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Unable to find the application root.');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
