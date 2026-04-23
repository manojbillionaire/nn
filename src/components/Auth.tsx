import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion } from 'motion/react';
import { Shield, Key, ExternalLink } from 'lucide-react';

export default function Auth({ onLogin, mode = 'user' }: { onLogin: (user: any) => void, mode?: 'user' | 'agency' }) {
  const [loading, setLoading] = useState(false);
  const [showApiKeyStep, setShowApiKeyStep] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user: loggedUser } = event.data;
        localStorage.setItem('nj_token', token);
        localStorage.setItem('nj_user', JSON.stringify(loggedUser));
        setUser(loggedUser);
        
        if (!loggedUser.gemini_api_key) {
          setShowApiKeyStep(true);
        } else {
          onLogin(loggedUser);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auth/google/url');
      window.open(res.data.url, 'google_login', 'width=600,height=700');
    } catch (err: any) {
      const message = err.response?.data?.details || err.response?.data?.error || 'Failed to get login URL';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/user/apikey', { apiKey });
      const updatedUser = { ...user, gemini_api_key: apiKey };
      localStorage.setItem('nj_user', JSON.stringify(updatedUser));
      onLogin(updatedUser);
    } catch (err) {
      alert('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  if (showApiKeyStep) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center border border-amber-500/20">
              <Key className="text-amber-500 w-10 h-10" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white text-center mb-4 tracking-tight">Setup Gemini AI</h2>
          <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">
            To use the AI Legal Engine, you need a free Gemini API key from Google AI Studio.
          </p>

          <div className="space-y-6">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl border border-slate-700 transition-all group"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Step 1</span>
                <span className="text-sm font-medium text-white">Get Free API Key</span>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </a>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Step 2: Paste your key here</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-amber-500 transition-all outline-none font-mono text-sm"
                  placeholder="AIzaSy..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !apiKey}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/10 disabled:opacity-50 mt-4 uppercase tracking-widest text-xs"
              >
                {loading ? 'Saving...' : 'Activate AI Portal'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] p-12 shadow-2xl"
      >
        <div className="flex justify-center mb-10">
          <div className={`w-20 h-20 ${mode === 'agency' ? 'bg-indigo-600' : 'bg-amber-500'} rounded-[28px] flex items-center justify-center shadow-2xl shadow-black/50`}>
            <Shield className="text-slate-950 w-12 h-12" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-white text-center mb-3 tracking-tighter italic">Nexus Justice</h1>
        <p className="text-slate-500 text-center mb-12 text-sm font-medium uppercase tracking-[0.3em]">
          {mode === 'agency' ? 'Agency HQ' : 'Advocate Portal'}
        </p>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-600"><span className="bg-slate-900 px-4">Development</span></div>
          </div>

          <button
            type="button"
            onClick={() => {
              const mockUser = {
                id: 1,
                email: 'admin@nexusjustice.ai',
                role: mode === 'agency' ? 'agency' : 'advocate',
                name: 'Administrator',
                gemini_api_key: 'mock-key'
              };
              localStorage.setItem('nj_token', 'dev-skip-token');
              localStorage.setItem('nj_user', JSON.stringify(mockUser));
              onLogin(mockUser);
            }}
            className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-500 font-bold py-4 rounded-2xl transition-all border border-slate-800 text-xs uppercase tracking-widest"
          >
            Skip Login (Dev Only)
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">
            Secure Legal Infrastructure v3.1
          </p>
        </div>
      </motion.div>
    </div>
  );
}
