import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AgencyHQPortal from './components/AgencyHQPortal';
import api, { setUserEmail } from './api';

export default function AgencyApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncUser() {
      const storedEmail = localStorage.getItem('nj_user_email');
      if (storedEmail) {
        try {
          setUserEmail(storedEmail);
          const res = await api.get('/api/user/profile');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to sync agency profile', err);
          setUser(null);
        }
      } else {
        setUserEmail(null);
        setUser(null);
      }
      setLoading(false);
    }
    
    syncUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nj_user_email');
    setUser(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-indigo-500 text-xs tracking-widest uppercase">
      Initialising Agency HQ...
    </div>
  );

  if (!user) {
    return <Auth onLogin={setUser} mode="agency" />;
  }

  return <AgencyHQPortal user={user} onLogout={handleLogout} />;
}
