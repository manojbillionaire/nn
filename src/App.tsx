import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import AdvocatePortal from './components/AdvocatePortal';
import AgencyHQPortal from './components/AgencyHQPortal';
import AffiliatePortal from './components/AffiliatePortal';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('nj_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
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
    return <Auth onLogin={setUser} />;
  }

  switch (user.role) {
    case 'advocate':
      return <AdvocatePortal user={user} onLogout={handleLogout} />;
    case 'affiliate':
      return <AffiliatePortal user={user} onLogout={handleLogout} />;
    default:
      // If an agency user tries to log in here, log them out
      handleLogout();
      return <Auth onLogin={setUser} mode="user" />;
  }
}
