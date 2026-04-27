import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AgencyApp from './AgencyApp.tsx';
import './index.css';

// Fail gracefully instead of crashing the whole app
function Root() {
  // @ts-ignore
  const isAgencyMode = import.meta.env.VITE_APP_MODE === 'agency';

  return isAgencyMode ? <AgencyApp /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
