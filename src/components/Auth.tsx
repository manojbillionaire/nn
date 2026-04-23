import React, { useState } from 'react';
import api from '../api';
import { motion } from 'motion/react';
import { Shield, Key, ExternalLink } from 'lucide-react';
import { SignInButton } from '@clerk/clerk-react';

export default function Auth({ onLogin, mode = 'user', isClerkAuthenticated = false }: { 
  onLogin: (user: any) => void, 
  mode?: 'user' | 'agency',
  isClerkAuthenticated?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [showApiKeyStep, setShowApiKeyStep] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // If Clerk is authenticated but we don't have a backend user yet, 
  // show the API key step or a "Finish Profile" step
  if (isClerkAuthenticated && !showApiKeyStep) {
    // Automatically trigger API key step if needed
    setShowApiKeyStep(true);
  }

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/user/apikey', { apiKey });
      // After saving API key, the backend should be able to return a profile
      const res = await api.get('/api/user/profile');
      onLogin(res.data);
    } catch (err) {
      alert('Failed to save API key and sync profile');
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
            Welcome to the Nexus! To use the AI Legal Engine, please provide your Gemini API key.
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
                {loading ? 'Activating...' : 'Activate AI Portal'}
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
          <SignInButton mode="redirect">
            <button
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Get Started with Clerk
            </button>
          </SignInButton>

          {/* Warning if keys might be missing */}
          {/* @ts-ignore */}
          {!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-500 font-bold uppercase tracking-widest text-center">
              Configuration Missing: Please set VITE_CLERK_PUBLISHABLE_KEY in Settings
            </div>
          )}

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-600"><span className="bg-slate-900 px-4">Secure Authentication</span></div>
          </div>
          
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
            Advanced cryptographic identity management powered by Clerk infrastructure.
          </p>
        </div>

        <div className="mt-12 text-center border-t border-slate-800/50 pt-8">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">
            Federal Law Enforcement Standard v4.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
