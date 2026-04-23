import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import AgencyApp from './AgencyApp.tsx';
import './index.css';

// @ts-ignore
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// To switch to Agency mode, set VITE_APP_MODE=agency in environment
// @ts-ignore
const isAgencyMode = import.meta.env.VITE_APP_MODE === 'agency';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {isAgencyMode ? <AgencyApp /> : <App />}
    </ClerkProvider>
  </StrictMode>,
);
