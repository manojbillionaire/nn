import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AgencyApp from './AgencyApp.tsx';
import './index.css';

// To switch to Agency mode, set VITE_APP_MODE=agency in environment
// @ts-ignore
const isAgencyMode = import.meta.env.VITE_APP_MODE === 'agency';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAgencyMode ? <AgencyApp /> : <App />}
  </StrictMode>,
);
