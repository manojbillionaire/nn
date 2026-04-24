import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import Auth from './components/Auth';
import AdvocatePortal from './components/AdvocatePortal';
import AgencyHQPortal from './components/AgencyHQPortal';
import AffiliatePortal from './components/AffiliatePortal';
import api, { setAuthToken } from './api';

export default function App() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut, getToken } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncUser() {
      if (isSignedIn && clerkUser) {
        try {
          const token = await getToken();
          setAuthToken(token);
          
          // Sync with local backend to get role and other metadata
          const res = await api.get('/api/user/profile');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to sync profile', err);
          // If profile fetch fails, it might be a new user
          setUser(null);
        }
      } else {
        setAuthToken(null);
        setUser(null);
      }
      setLoading(false);
    }
    
    if (isLoaded) {
      syncUser();
    }
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const handleLogout = () => {
    signOut();
    localStorage.removeItem('nj_token');
    localStorage.removeItem('nj_user');
    setUser(null);
  };

  if (!isLoaded || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-amber-500 text-xs tracking-widest uppercase">
      Initialising Legal Engine...
    </div>
  );

  if (!isSignedIn) {
    return <Auth onLogin={setUser} />;
  }

  // If signed in to Clerk but backend sync failed or user doesn't exist in DB
  if (!user) {
    // This could happen if it's a first-time login
    // We can either redirect to a setup page or handle it in Auth
    return <Auth onLogin={setUser} isClerkAuthenticated={true} />;
  }

  switch (user.role) {
    case 'advocate':
      return <AdvocatePortal user={user} onLogout={handleLogout} />;
    case 'affiliate':
      return <AffiliatePortal user={user} onLogout={handleLogout} />;
    case 'agency':
      return <AgencyHQPortal user={user} onLogout={handleLogout} />;
    default:
      return <AdvocatePortal user={user} onLogout={handleLogout} />;
  }
}
