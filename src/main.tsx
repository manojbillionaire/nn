import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import AgencyApp from './AgencyApp.tsx';
import './index.css';

// @ts-ignore
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Fail gracefully instead of crashing the whole app
function Root() {
  // @ts-ignore
  const isAgencyMode = import.meta.env.VITE_APP_MODE === 'agency';

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 mb-6 font-black text-rose-500 italic rotate-12">
          !
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Configuration Required</h1>
        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
          Clerk Publishable Key is missing. Please add <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-500">VITE_CLERK_PUBLISHABLE_KEY</code> to your environment settings to activate the identity gateway.
        </p>
        <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
          Nexus Justice Legal Engine v4.0
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {isAgencyMode ? <AgencyApp /> : <App />}
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
