import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AdvocatePortal from './components/AdvocatePortal';
import AgencyHQPortal from './components/AgencyHQPortal';
import AffiliatePortal from './components/AffiliatePortal';
import api, { setUserEmail } from './api';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncUser() {
      const storedEmail = localStorage.getItem('nj_user_email');
      if (storedEmail) {
        try {
          setUserEmail(storedEmail);
          
          // Sync with local backend to get role and other metadata
          const res = await api.get('/api/user/profile');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to sync profile', err);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-amber-500 text-xs tracking-widest uppercase">
      Initialising Legal Engine...
    </div>
  );

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  switch (user.role) {
    case 'advocate':
      return <AdvocatePortal user={user} onLogout={handleLogout} onUpdateUser={setUser} />;
    case 'affiliate':
      return <AffiliatePortal user={user} onLogout={handleLogout} />;
    case 'agency':
      return <AgencyHQPortal user={user} onLogout={handleLogout} />;
    default:
      return <AdvocatePortal user={user} onLogout={handleLogout} onUpdateUser={setUser} />;
  }
}
