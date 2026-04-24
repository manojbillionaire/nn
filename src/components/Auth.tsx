import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, ExternalLink, Clipboard, CheckCircle2, ChevronRight, Sparkles, Volume2 } from 'lucide-react';
import { SignInButton } from '@clerk/clerk-react';

export default function Auth({ onLogin, mode = 'user', isClerkAuthenticated = false }: { 
  onLogin: (user: any) => void, 
  mode?: 'user' | 'agency',
  isClerkAuthenticated?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [showApiKeyStep, setShowApiKeyStep] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validation
  const isValidKey = apiKey.startsWith('AIza') && apiKey.length > 20;

  // Auto-detect clipboard on Step 3
  useEffect(() => {
    if (currentStep === 3 && !apiKey) {
      const checkClipboard = async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text.startsWith('AIza')) {
            console.log('API key detected in clipboard');
          }
        } catch (e) { /* ignore */ }
      };
      checkClipboard();
      // Auto-focus after a short delay for animation
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [currentStep, apiKey]);

  // English Voice Assistance
  const voiceMessages = {
    1: "Navigate to Google AI Studio to generate your unique Gemini key.",
    2: "Copy the key securely to your device's clipboard now.",
    3: "Paste the key below to unlock your legal engine."
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (showApiKeyStep && !isSuccess) {
      speak(voiceMessages[currentStep as keyof typeof voiceMessages]);
    }
  }, [currentStep, showApiKeyStep, isSuccess]);

  const handleSaveApiKey = async () => {
    if (!isValidKey) return;
    setLoading(true);
    try {
      await api.post('/api/user/apikey', { apiKey });
      setIsSuccess(true);
      speak("Access granted. Your engine is now live.");
      setTimeout(async () => {
        const res = await api.get('/api/user/profile');
        onLogin(res.data);
      }, 2000);
    } catch (err) {
      alert('Activation failed. Please check your network or key.');
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (e) {
      alert('Clipboard access denied.');
    }
  };

  if (showApiKeyStep) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Success Glow */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-emerald-500/10 backdrop-blur-3xl z-0"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10">
            {!isSuccess ? (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-20 h-20 bg-amber-500/10 rounded-[30px] flex items-center justify-center border border-amber-500/20 mb-6 relative">
                    <Key className="text-amber-500 w-10 h-10" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-amber-500 rounded-[30px] blur-xl -z-10"
                    />
                  </div>
                  <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2">Activate AI</h2>
                  <div className="flex items-center gap-2 px-4 py-1 bg-slate-800/80 rounded-full border border-slate-700/50">
                    <Volume2 className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nexus Voice (EN): Step {currentStep}</span>
                  </div>
                  <p className="mt-4 text-slate-500 text-[10px] font-medium text-center italic max-w-[200px]">
                    "{voiceMessages[currentStep as keyof typeof voiceMessages]}"
                  </p>
                </div>

                {/* Malayalam Steps Progress */}
                <div className="flex justify-between mb-10 px-4">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentStep === s ? 'border-amber-500 bg-amber-500 text-black font-black scale-110 shadow-lg shadow-amber-500/20' : currentStep > s ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-slate-800 text-slate-600'}`}>
                        {currentStep > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                      </div>
                      <div className={`text-[10px] font-black uppercase tracking-tighter ${currentStep === s ? 'text-amber-500' : 'text-slate-600'}`}>
                        {s === 1 ? 'ലഭിക്കുക' : s === 2 ? 'പകർത്തുക' : 'ചേർക്കുക'}
                      </div>
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                          Generate your free API key at Google AI Studio.
                        </p>
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => setCurrentStep(2)}
                          className="flex items-center justify-between w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-5 rounded-2xl transition-all shadow-xl shadow-amber-500/10 group font-bold"
                        >
                          <span>Obtain Free API Key</span>
                          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                          Make sure to copy the key (AIza...) to your clipboard.
                        </p>
                        <button 
                          onClick={() => setCurrentStep(3)}
                          className="flex items-center justify-center gap-3 w-full bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl border border-slate-700 transition-all font-bold"
                        >
                          Key Copied <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 relative">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 italic">Security Input (ചേർക്കുക)</label>
                        
                        <div className="relative mb-6">
                          <input
                            ref={inputRef}
                            type="password"
                            required
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className={`w-full bg-slate-950 border ${isValidKey ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-slate-800'} rounded-2xl py-4 pl-6 pr-12 text-white focus:border-amber-500 transition-all outline-none font-mono text-sm tracking-widest`}
                            placeholder="AIzaSy..."
                          />
                          <button 
                            type="button"
                            onClick={handlePaste}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors"
                          >
                            <Clipboard size={18} title="Click to Paste" />
                          </button>
                        </div>

                        {isValidKey && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4"
                          >
                            <CheckCircle2 size={12} /> Key Detected!
                          </motion.div>
                        )}

                        <button
                          onClick={handleSaveApiKey}
                          disabled={loading || !isValidKey}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl shadow-amber-500/10 disabled:opacity-20 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                          {loading ? 'Activating...' : <>Unlock Nexus <Sparkles size={14} /></>}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {currentStep > 1 && (
                  <button 
                    onClick={() => setCurrentStep(prev => prev - 1)} 
                    className="w-full mt-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Go Back
                  </button>
                )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-12 text-center"
              >
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 relative">
                  <CheckCircle2 className="text-slate-950 w-12 h-12" />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 bg-emerald-500 rounded-full"
                  />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 italic tracking-tight">AI Active</h2>
                <p className="text-slate-400 text-sm font-medium tracking-wide">
                  Welcome to the Nexus. Your secure legal engine is now active.
                </p>
              </motion.div>
            )}
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
        
        <h1 className="text-4xl font-black text-white text-center mb-3 tracking-tighter italic text-glow">Nexus Justice</h1>
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
