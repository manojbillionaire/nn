import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AgencyHQPortal from './components/AgencyHQPortal';

export default function AgencyApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('nj_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === 'agency') {
        setUser(parsed);
      } else {
        localStorage.removeItem('nj_token');
        localStorage.removeItem('nj_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nj_token');
    localStorage.removeItem('nj_user');
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    return <Auth onLogin={setUser} mode="agency" />;
  }

  return <AgencyHQPortal user={user} onLogout={handleLogout} />;
}
