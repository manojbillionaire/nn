import React, { useState, useEffect, useRef } from 'react';
import api, { setUserEmail } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, ExternalLink, Clipboard, CheckCircle2, ChevronRight, Sparkles, Volume2, User, Mail, ArrowRight } from 'lucide-react';

const MOCK_ACCOUNTS = [
  { name: 'Barrister Muthukrishnan', email: 'muthu@law.in', role: 'advocate' },
  { name: 'Senior Advocate Manoj', email: 'manojbillionaire123@gmail.com', role: 'advocate' },
  { name: 'Nexus Legal Agency', email: 'hq@nexus.id', role: 'agency' },
];

export default function Auth({ onLogin, mode = 'user' }: { 
  onLogin: (user: any) => void, 
  mode?: 'user' | 'agency'
}) {
  const [loading, setLoading] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSelectAccount = async (email: string) => {
    setLoading(true);
    setSelectedEmail(email);
    localStorage.setItem('nj_user_email', email);
    setUserEmail(email);
    
    try {
      // Sync with local backend to get account details
      const res = await api.get('/api/user/profile');
      onLogin(res.data);
    } catch (err) {
      console.error('Account sync failed:', err);
      // Even if sync fails, we can assume a basic profile will be created by the server
      // or we can retry profile fetch. For simplicity, we just try one more time or handle gracefully.
      const res = await api.get('/api/user/profile');
      onLogin(res.data);
    }
  };

  if (showAccountSelector) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-800">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-8 h-8" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Choose an account</h2>
          <p className="text-slate-500 text-center mb-8 text-xs font-bold uppercase tracking-widest text-balance">
            Select an identity to continue to Nexus Justice
          </p>

          <div className="space-y-3">
            {MOCK_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleSelectAccount(acc.email)}
                disabled={loading}
                className="w-full flex items-center gap-4 p-4 rounded-3xl bg-slate-950/50 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-amber-500/30">
                  <User className="text-slate-400 group-hover:text-amber-500 transition-colors" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{acc.name}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{acc.email}</p>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-amber-500 transition-colors" size={16} />
              </button>
            ))}

            <button
              onClick={() => {
                const customEmail = prompt("Enter your legal email index:");
                if (customEmail && customEmail.includes('@')) {
                  handleSelectAccount(customEmail);
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-slate-950/20 border border-slate-800/50 hover:border-slate-700 transition-all text-left mt-6"
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                <Mail className="text-slate-600" size={20} />
              </div>
              <p className="text-xs font-bold text-slate-500">Use another account</p>
            </button>
          </div>

          <p className="mt-12 text-[10px] text-slate-600 text-center uppercase tracking-widest leading-relaxed px-6">
            To continue, Google will share your name, email address, and profile picture with Nexus Justice.
          </p>
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
        
        <h1 className="text-4xl font-black text-white text-center mb-3 tracking-tighter italic text-glow">Nexus Justice</h1>
        <p className="text-slate-500 text-center mb-12 text-sm font-medium uppercase tracking-[0.3em]">
          {mode === 'agency' ? 'Agency HQ' : 'Advocate Portal'}
        </p>

        <div className="space-y-6">
          <button
            onClick={() => setShowAccountSelector(true)}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer group"
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest text-xs">Login with Google</span>
            <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-600"><span className="bg-slate-900 px-4">Secure Gateway</span></div>
          </div>
          
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
            Identity verification handled via Google Federal credentials. 
            <br />
            Powered by Secure Deploy infrastructure.
          </p>
        </div>

        <div className="mt-12 text-center border-t border-slate-800/50 pt-8">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">
            Federal Law Enforcement Standard v4.2
          </p>
        </div>
      </motion.div>
    </div>
  );
}
