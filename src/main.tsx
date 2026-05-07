import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './debug-env'; // Debug env vars
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
