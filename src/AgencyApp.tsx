import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import Auth from './components/Auth';
import AgencyHQPortal from './components/AgencyHQPortal';
import api, { setAuthToken } from './api';

export default function AgencyApp() {
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
          
          const res = await api.get('/api/user/profile');
          if (res.data.role === 'agency') {
            setUser(res.data);
          } else {
            // If they are not an agency user but reached here, we might want to sign them out or handle it
            setUser(res.data); // Let's just set it and the portal can handle restrictions
          }
        } catch (err) {
          console.error('Failed to sync agency profile', err);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-indigo-500 text-xs tracking-widest uppercase">
      Initialising Agency HQ...
    </div>
  );

  if (!isSignedIn) {
    return <Auth onLogin={setUser} mode="agency" />;
  }

  if (!user) {
    return <Auth onLogin={setUser} mode="agency" isClerkAuthenticated={true} />;
  }

  return <AgencyHQPortal user={user} onLogout={handleLogout} />;
}
