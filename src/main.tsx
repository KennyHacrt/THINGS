import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Companion } from './Companion';
import { QuickTask } from './QuickTask';
import './styles.css';
import './enhancements.css';
import './live.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{new URLSearchParams(location.search).has('companion') ? <Companion/> : new URLSearchParams(location.search).has('quick') ? <QuickTask/> : <App />}</React.StrictMode>,
);
