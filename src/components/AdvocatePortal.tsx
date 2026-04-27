import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import api from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { speakWithGemini, consultGemini, stopSpeaking } from "../lib/gemini";
import { 
  Key, 
  ExternalLink, 
  Clipboard, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Volume2, 
  VolumeX,
  AlertTriangle,
  X,
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Copy,
  Trash2,
  Download,
  RefreshCw,
  LogOut,
  Wifi
} from 'lucide-react';

const Icon = ({ path, size = 20, strokeWidth = 2 }: { path: string | string[], size?: number, strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(path) ? path.map((d, i) => <path key={i} d={d} />) : <path d={path} />}
  </svg>
);

const CLIENTS = [
  { slNo: 1, name: 'Sreedharan K.', phone: '+91 9876543210', courtName: 'District Court, Aluva', caseNumber: 'OS 145/2025', oppAdvocateName: 'Ramesh Menon', nextPostingDate: '2026-03-15', purposeOfPosting: 'Filing Written Statement' },
  { slNo: 2, name: 'Elena Rodriguez', phone: '+1 555-0199', courtName: 'High Court', caseNumber: 'WP(C) 204/2026', oppAdvocateName: 'Sarah Jenkins', nextPostingDate: '2026-03-20', purposeOfPosting: 'Hearing' },
  { slNo: 3, name: 'Marcus Thorne', phone: '+1 555-0188', courtName: 'Magistrate Court', caseNumber: 'CC 55/2026', oppAdvocateName: 'David Clark', nextPostingDate: '2026-04-05', purposeOfPosting: 'Evidence' },
  { slNo: 4, name: 'Sarah Jenkins', phone: '+1 555-0177', courtName: 'Family Court', caseNumber: 'OP 89/2025', oppAdvocateName: 'Priya Sharma', nextPostingDate: '2026-03-10', purposeOfPosting: 'Counseling' },
  { slNo: 5, name: 'Orbital Tech Corp', phone: '+1 555-0166', courtName: 'Commercial Court', caseNumber: 'CS 12/2026', oppAdvocateName: 'Michael Chang', nextPostingDate: '2026-04-12', purposeOfPosting: 'Framing of Issues' },
];

const VOICE_RECORDS = [
  { id: 'H01', client: 'Sreedharan K.', date: '16/02/2026', duration: '3m 4s', summary: 'Property boundary dispute in Aluva. Neighbor encroaching via new fence. Needs interim injunction.' },
  { id: 'H02', client: 'Elena Rodriguez', date: '15/02/2026', duration: '12m 15s', summary: 'IP theft consultation. Competitor launched identical product. Cease & desist draft requested.' },
  { id: 'H03', client: 'Marcus Thorne', date: '10/02/2026', duration: '8m 42s', summary: 'Real estate fraud follow-up. New evidence documents provided. Court strategy scheduled.' },
];

const NOTIFICATIONS = [
  { id: 1, message: "Welcome to Nexus Justice v3.1. Your affiliate link is ready.", date: "2026-02-27", read: false, type: 'general' },
  { id: 2, message: "John Doe (555-0192) joined under you — congratulations!", date: "2026-02-27", read: false, type: 'payment' },
];

const LAW_CATEGORIES = [
  { id: 'railway', label: 'Railway Law', color: '#f59e0b' },
  { id: 'cooperative', label: 'Cooperative Law', color: '#10b981' },
  { id: 'property', label: 'Property Law', color: '#6366f1' },
  { id: 'criminal', label: 'Criminal Law', color: '#ef4444' },
  { id: 'labour', label: 'Labour Law', color: '#8b5cf6' },
];

const getCatRgb = (color: string) => {
  const map: Record<string, string> = { '#f59e0b': '245,158,11', '#10b981': '16,185,129', '#6366f1': '99,102,241', '#ef4444': '239,68,68', '#8b5cf6': '139,92,246' };
  return map[color] || '99,102,241';
};

export default function AdvocatePortal({ user, onLogout, onUpdateUser }: { user: any, onLogout: () => void, onUpdateUser?: (u: any) => void }) {
  const [view, setView] = useState("command");

  const [clients, setClients] = useState(CLIENTS);
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<any>({});
  const [clientDocs, setClientDocs] = useState<any>({});
  const [clientDocsModal, setClientDocsModal] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [voiceRecords, setVoiceRecords] = useState(VOICE_RECORDS);
  const [activeCallRecord, setActiveCallRecord] = useState<any>(null);
  const [gdrive, setGdrive] = useState<any>({ connected: false, folderId: null, loading: false });
  const [voiceAiOn, setVoiceAiOn] = useState(false);
  const [voiceAiListening, setVoiceAiListening] = useState(false);
  const [voiceAiReply, setVoiceAiReply] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [calls, setCalls] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [supportMsgs, setSupportMsgs] = useState([{ id: 1, role: 'ai', text: 'Hello. I am the Nexus Support AI. Please describe any issues you are facing with the platform.' }]);
  const [supportInput, setSupportInput] = useState("");
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [brain1Ready, setBrain1Ready] = useState(false);
  const [brain2Ready, setBrain2Ready] = useState(false);
  const [downloadingBrain, setDownloadingBrain] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeBrain, setActiveBrain] = useState<'gemini' | 'gemma2b' | 'gemma4b'>('gemini');
  const [showWifiWarning, setShowWifiWarning] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActive = useRef(false);
  const isStartingRef = useRef(false);

  const safeStartRecognition = useCallback(() => {
    if (recognitionRef.current && !isRecognitionActive.current && !isStartingRef.current && voiceAiOn && !isSpeaking) {
      try {
        isStartingRef.current = true;
        recognitionRef.current.start();
      } catch (e) {
        isStartingRef.current = false;
      }
    }
  }, [voiceAiOn, isSpeaking]);

  const stopAiVoiceCompletely = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    isRecognitionActive.current = false;
    isStartingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const [kbDocs, setKbDocs] = useState([
    { id: 1, category: 'railway', name: 'Railways Act, 1989.pdf', size: '2.4 MB', date: '2026-01-12', pages: 184 },
    { id: 2, category: 'railway', name: 'Railway Claims Tribunal Rules.pdf', size: '840 KB', date: '2026-01-15', pages: 62 },
    { id: 3, category: 'cooperative', name: 'Kerala Co-operative Societies Act.pdf', size: '1.1 MB', date: '2025-11-20', pages: 96 },
    { id: 4, category: 'property', name: 'Transfer of Property Act, 1882.pdf', size: '960 KB', date: '2025-10-05', pages: 78 },
  ]);

  const [tempInstructions, setTempInstructions] = useState([
    { id: 1, text: 'If Raju calls, tell him to meet me tomorrow at 10 AM.', active: true, created: '2026-03-06 09:00' },
    { id: 2, text: 'If my clerk calls, tell him to bring A4 size paper.', active: true, created: '2026-03-06 10:30' },
  ]);
  const activeInstructions = tempInstructions.filter(i => i.active);

  const [draftPages, setDraftPages] = useState([
    "IN THE COURT OF THE DISTRICT JUDGE, ERNAKULAM\n\nO.S. No. 145 of 2025...",
    "FACTS OF THE CASE:\n\n1. The Plaintiff is the absolute owner...",
    "CAUSE OF ACTION:\n\n5. The cause of action for this suit arose..."
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [draftSuggestions, setDraftSuggestions] = useState([
    { id: 1, type: 'add', text: 'Add valuation clause: "The suit is valued at ₹1,00,000/- for the purpose of court fees and jurisdiction."', status: 'pending', line: 'Page 3 — Valuation' },
    { id: 2, type: 'delete', text: 'Remove vague phrase "approximately 2 Cents" — use exact survey measurement from the title deed instead.', status: 'pending', line: 'Page 2 — Para 3' },
  ]);

  const [scanPhase, setScanPhase] = useState('idle'); 
  const [scannedText, setScannedText] = useState('');
  const [convPages, setConvPages] = useState<any[]>([]);
  const [transSourceText, setTransSourceText] = useState('');
  const [transResult, setTransResult] = useState('');

  const chatRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sideNav = [
    { id: 'command', label: 'Command', icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
    { id: 'feed', label: 'Feed', icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
    { id: 'consult', label: 'Consult', icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" },
    { id: 'clients', label: 'Clients', icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: 'knowledge-base', label: 'Knowledge', icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: 'temp-instructions', label: 'Instructions', icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { id: 'notifications', label: 'Notif.', icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    { id: 'support', label: 'Support', icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" },
    { id: 'reading-room', label: 'Read', icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: 'doc-converter', label: 'Convert', icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
    { id: 'writing-desk', label: 'Writing', icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
    { id: 'dialer', label: 'Dialer', icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  ];

  const S = {
    page: { display: 'flex', height: '100vh', background: '#020617', color: '#e2e8f0', overflow: 'hidden' },
    sidebar: { width: 72, background: '#070b14', borderRight: '1px solid rgba(255,255,255,.05)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, padding: '20px 0', gap: 8, flexShrink: 0, overflowY: 'auto' as const },
    sideBtn: (active: boolean) => ({ width: 44, height: 44, borderRadius: 12, background: active ? 'rgba(245,158,11,.1)' : 'transparent', border: active ? '1px solid rgba(245,158,11,.25)' : '1px solid transparent', color: active ? '#f59e0b' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const, transition: 'all .2s' }),
    header: { height: 56, background: '#0a0f1d', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 },
    card: { background: '#0a0f1d', borderRadius: 24, padding: 28, border: '1px solid rgba(255,255,255,.05)' },
  };

  const startScan = async () => {
    setScanPhase('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanPhase('live');
    } catch {
      setScanPhase('error');
    }
  };

  useEffect(() => {
    const sse = new EventSource('/api/calls/stream');
    sse.addEventListener('call', (e) => {
      const call = JSON.parse(e.data);
      if (call.status === 'incoming') {
        setIncomingCall(call);
        // Auto-answer logic (simulated)
        setTimeout(() => {
          setIncomingCall(prev => prev?.id === call.id ? { ...prev, status: 'answered' } : prev);
        }, 3000);
      } else if (call.status === 'ended' || call.status === 'missed') {
        setIncomingCall(null);
        setVoiceRecords(prev => [call, ...prev]);
      }
    });
    return () => sse.close();
  }, []);

  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true);
      // Resume audio context if it exists
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      // Also try to speak a silent sound to "unlock" SpeechSynthesis/Audio
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Personalized Welcome Voice
  useEffect(() => {
    if (user.gemini_api_key && !welcomeSpoken && view === 'command' && userInteracted) {
      const triggerWelcome = async () => {
        try {
          const userName = user.name || 'Advocate';
          setIsSpeaking(true);
          console.log("Attempting welcome voice for:", userName);
          await speakWithGemini(`Welcome to Nexus Justice, Advocate ${userName}. How can I help you today?`, user.gemini_api_key);
          setWelcomeSpoken(true);
        } catch (err) {
          console.error("Failed to speak welcome:", err);
        } finally {
          setIsSpeaking(false);
        }
      };
      // Delay slightly for UI to settle
      const timer = setTimeout(triggerWelcome, 1000);
      return () => clearTimeout(timer);
    }
  }, [user.gemini_api_key, welcomeSpoken, view, user.name, userInteracted]);

  // Camera Management
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCam() {
      if (camOn) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          camStreamRef.current = stream;
          // Use a small delay to ensure video element is mounted
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }, 100);
        } catch (err) {
          console.error("Camera access denied:", err);
          setCamOn(false);
        }
      } else {
        if (camStreamRef.current) {
          camStreamRef.current.getTracks().forEach(t => t.stop());
          camStreamRef.current = null;
        }
      }
    }
    startCam();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [camOn]);

  // Microphone Management
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startMic() {
      let recognition: any = null;
      if (voiceAiOn) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
          
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.fftSize = 256;
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => Number(a) + Number(b), 0) / dataArray.length;
            setMicLevel(average);
            requestAnimationFrame(updateLevel);
          };
          updateLevel();

          // Speech Recognition Setup
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false; 
            recognition.interimResults = true;
            recognition.lang = 'en-IN';

            recognition.onstart = () => {
              isRecognitionActive.current = true;
              isStartingRef.current = false;
            };

            recognition.onresult = (event: any) => {
              let interimTranscript = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                  setVoiceAiReply(transcript);
                  sendConsult(transcript);
                } else {
                  interimTranscript += transcript;
                  setVoiceAiReply(interimTranscript);
                }
              }
            };

            recognition.onerror = (event: any) => {
              if (event.error === 'no-speech') {
                // Ignore no-speech errors to reduce console noise
                return;
              }
              console.error('Speech recognition error', event.error);
            };

            recognition.onend = () => {
              isRecognitionActive.current = false;
              isStartingRef.current = false;
              // Only restart if voice AI is actually on and NOT currently speaking
              if (voiceAiOn && !isSpeaking) {
                // Add a bigger delay before restart to prevent tight loops and aborted errors
                const timer = setTimeout(() => {
                  if (voiceAiOn && !isSpeaking) safeStartRecognition();
                }, 1000);
                return () => clearTimeout(timer);
              }
            };
            
            recognition.onerror = (event: any) => {
              isStartingRef.current = false;
              if (event.error === 'aborted') {
                isRecognitionActive.current = false;
              }
            };

            recognitionRef.current = recognition;
            if (voiceAiOn) safeStartRecognition();
          } else {
            console.warn("Speech recognition not supported in this browser.");
            setVoiceAiReply("Voice input (STT) not supported in this browser. Please use Chrome.");
          }

          setVoiceAiListening(true);
        } catch (err) {
          console.error("Mic access denied:", err);
          setVoiceAiOn(false);
        }
      } else {
        if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(t => t.stop());
          micStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        setVoiceAiListening(false);
        setMicLevel(0);
      }
    }
    startMic();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [voiceAiOn]);

  const sendConsult = async (inputText?: string) => {
    const textToProcess = (inputText || consoleInput).trim();
    if (!textToProcess || consoleLoading) return;
    if (activeBrain === 'gemini' && !user.gemini_api_key) {
      setShowApiKeyModal(true);
      return;
    }
    const text = textToProcess; 
    if (!inputText) setConsoleInput('');
    setChatHistory(h => [...h, { role: 'user', text, id: Date.now() }]);
    if (voiceAiOn) setVoiceAiReply("Thinking...");
    setConsoleLoading(true);
    try {
      let reply: string = "";
      let usedFallback = false;

      if (activeBrain === 'gemini') {
        try {
          if (!user.gemini_api_key) throw new Error("No Key");
          reply = await consultGemini(text, chatHistory, user.gemini_api_key) || "";
        } catch (e) {
          console.warn("Gemini Primary failed, trying local fallback:", e);
          if (brain2Ready || brain1Ready) {
            usedFallback = true;
            await new Promise(r => setTimeout(r, 1000));
            const brainName = brain2Ready ? 'Gemma3n E4B' : 'Gemma3n E2B';
            reply = `(Hybrid Fallback: ${brainName} Processing)\n\nI have analyzed your request regarding "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}". As your local fallback brain, I recommend the following...`;
          } else {
            throw e;
          }
        }
      } else {
        // Explicit local selection
        await new Promise(r => setTimeout(r, 1500));
        const brainName = activeBrain === 'gemma2b' ? 'Gemma3n E2B' : 'Gemma3n E4B';
        reply = `(Local Brain: ${brainName} Processing)\n\nI have analyzed your request regarding "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}". Processing offline for maximum privacy.`;
      }

      if (reply) {
        setChatHistory(h => [...h, { role: 'ai', text: reply, id: Date.now() }]);
        if (voiceAiOn) {
          setVoiceAiReply("Generating audio...");
          setIsSpeaking(true);
          // Pass undefined if no key, so it uses environment key or fallback
          speakWithGemini(reply, user.gemini_api_key || undefined)
            .then(success => {
              if (success) {
                setVoiceAiReply(reply.slice(0, 100) + '...');
              } else {
                setVoiceAiReply("Voice guidance unavailable for this response.");
              }
            })
            .catch(err => {
              console.error("Voice error:", err);
              setVoiceAiReply("Voice engine error. Please check internet connection.");
            })
            .finally(() => setIsSpeaking(false));
        }
      } else {
        throw new Error("No reply from AI");
      }
    } catch (err) {
      console.error("Consult error:", err);
      setChatHistory(h => [...h, { role: 'ai', text: 'AI service unavailable. Please check your connection or API key.', id: Date.now() }]);
    }
    setConsoleLoading(false);
  };

  const stopAiAudio = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (voiceAiOn && !isSpeaking) {
      // Small delay to ensure synthesis has fully released audio hardware
      const timer = setTimeout(() => {
        if (voiceAiOn && !isSpeaking) {
          safeStartRecognition();
        }
      }, 700);
      return () => clearTimeout(timer);
    } else if (!voiceAiOn || isSpeaking) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      isRecognitionActive.current = false;
    }
  }, [isSpeaking, voiceAiOn, safeStartRecognition]);

  const resetChat = () => {
    stopAiVoiceCompletely();
    setChatHistory([]);
    setVoiceAiReply('');
    setVoiceAiOn(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadTextAsFile = (text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "nexus_consultation.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadBrain = (num: number, bypassWarning = false) => {
    if (downloadingBrain !== null) return;
    if (brain1Ready && num === 1) return;
    if (brain2Ready && num === 2) return;

    // Custom UI warning is handled in the JSX block
    if (num === 2 && !showWifiWarning && !brain2Ready && !bypassWarning) {
      setShowWifiWarning(true);
      return;
    }

    setDownloadingBrain(num);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloadingBrain(null);
          if (num === 1) {
            setBrain1Ready(true);
            // Don't auto-switch, keep Gemini Primary
          } else {
            setBrain2Ready(true);
            // Don't auto-switch, keep Gemini Primary
          }
          return 100;
        }
        // Downloading larger model takes longer (simulated by slower progress)
        const increment = num === 2 ? 0.5 : 2;
        return prev + increment;
      });
    }, num === 2 ? 100 : 50);
  };

  return (
    <div style={S.page}>
      <div style={S.sidebar}>
        <div style={{ width: 44, height: 44, background: '#f59e0b', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#000', fontStyle: 'italic' }}>T</span>
        </div>
        {sideNav.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} title={item.label} style={S.sideBtn(view === item.id)}>
            <Icon path={item.icon} size={18} />
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={S.header}>
          <div className="flex items-center gap-4">
            <span className="text-amber-500 font-bold uppercase text-[10px] tracking-widest">Advocate Portal</span>
            <span className="text-slate-700">|</span>
            <span className="text-white font-medium text-sm">{user.name || 'Advocate'}</span>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2 mr-2">
                <div className={`w-1.5 h-1.5 rounded-full ${user.gemini_api_key ? (activeBrain === 'gemini' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-indigo-400') : 'bg-slate-700'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${user.gemini_api_key ? (activeBrain === 'gemini' ? 'text-emerald-500' : 'text-indigo-400') : 'text-slate-600'}`}>
                  Gemini 2.5 {activeBrain === 'gemini' ? 'Primary' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${activeBrain !== 'gemini' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : (brain1Ready || brain2Ready ? 'bg-emerald-500/50' : 'bg-slate-700/50')}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${activeBrain !== 'gemini' ? 'text-amber-400' : 'text-slate-600'}`}>
                  Gemma 2 {activeBrain === 'gemini' ? (brain1Ready || brain2Ready ? 'Fallback Ready' : 'Sync Required') : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }} className="hidden sm:inline">Nexus Justice <span style={{ color: '#6366f1' }}>v3.2</span></span>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {view === 'command' && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!user.gemini_api_key && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="col-span-full bg-rose-500/10 border-2 border-rose-500/20 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_40px_rgba(244,63,94,0.05)]"
                >
                  <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/20">
                      <AlertTriangle size={28} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white italic uppercase tracking-tight">AI Engine Temporarily Offline</h4>
                      <p className="text-xs text-rose-200/60 font-medium max-w-md">Your legal intelligence engine requires a Gemini API key. Click the "Get api key" tab in the command center below to activate.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowApiKeyModal(true)}
                    className="px-8 py-3 bg-rose-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-rose-400 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                  >
                    Activate Nexus AI
                  </button>
                </motion.div>
              )}
              <div style={S.card} className="col-span-full lg:col-span-1">
                <h3 className="text-xl font-bold mb-4 italic text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  Command Center
                </h3>
                <div className="space-y-4">
                  <button onClick={() => setView('consult')} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                    Open AI Consultant
                  </button>
                  <button onClick={() => setView('writing-desk')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold border border-slate-700 transition-all">
                    Open Writing Desk
                  </button>
                  <button 
                    onClick={() => setShowApiKeyModal(true)} 
                    disabled={!!user.gemini_api_key}
                    className={`w-full py-4 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${
                      user.gemini_api_key 
                        ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                        : 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:bg-amber-400'
                    }`}
                  >
                    {!user.gemini_api_key && <Sparkles size={16} className="animate-pulse" />}
                    {user.gemini_api_key ? 'Get api key' : 'Get api key'}
                  </button>
                  <button onClick={async () => {
                    await api.post('/api/calls/webhook', {
                      caller: 'Raju (Client)',
                      phone: '+91 98765 43210',
                      status: 'incoming',
                      advocateEmail: user.email
                    });
                  }} className="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:border-slate-700 transition-all">
                    Simulate Incoming Call
                  </button>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Brain Sync</h4>
                      <div className="flex bg-slate-900 p-1 rounded-lg gap-1 border border-slate-800">
                        <button 
                          onClick={() => setActiveBrain('gemini')}
                          disabled={!user.gemini_api_key}
                          className={`px-3 py-1 rounded-md text-[8px] font-bold transition-all ${!user.gemini_api_key ? 'opacity-30 cursor-not-allowed grayscale' : activeBrain === 'gemini' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          GEMINI {user.gemini_api_key ? '' : '(LOCKED)'}
                        </button>
                        {brain1Ready && (
                          <button 
                            onClick={() => setActiveBrain('gemma2b')}
                            className={`px-3 py-1 rounded-md text-[8px] font-bold transition-all ${activeBrain === 'gemma2b' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            2B
                          </button>
                        )}
                        {brain2Ready && (
                          <button 
                            onClick={() => setActiveBrain('gemma4b')}
                            className={`px-3 py-1 rounded-md text-[8px] font-bold transition-all ${activeBrain === 'gemma4b' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            4B
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {showWifiWarning && !brain2Ready && downloadingBrain === null && (
                        <div className="col-span-full mb-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-amber-500">
                            <Wifi size={14} />
                            <span className="text-[9px] font-black uppercase tracking-wider">Wifi Highly Recommended</span>
                          </div>
                          <p className="text-[8px] text-amber-500/70 leading-tight">Gemma E4B is ~2.5GB. Proceed with download?</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setShowWifiWarning(false);
                                handleDownloadBrain(2, true);
                              }}
                              className="px-3 py-1 bg-amber-500 text-black text-[8px] font-bold rounded-lg"
                            >
                              START SYNC
                            </button>
                            <button 
                              onClick={() => setShowWifiWarning(false)}
                              className="px-3 py-1 bg-slate-800 text-slate-400 text-[8px] font-bold rounded-lg"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => handleDownloadBrain(1)}
                        disabled={brain1Ready || downloadingBrain !== null}
                        className={`group relative overflow-hidden py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 border ${
                          brain1Ready 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 cursor-default' 
                            : downloadingBrain === 1
                              ? 'bg-slate-900 border-slate-800 text-amber-500'
                              : downloadingBrain !== null
                                ? 'bg-slate-900/50 border-slate-800 text-slate-700 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50 hover:border-slate-600 cursor-pointer active:scale-95 shadow-lg shadow-black/20'
                        }`}
                      >
                        {downloadingBrain === 1 ? (
                          <div className="w-full px-4">
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                            </div>
                            <span className="text-[8px] animate-pulse">Syncing Brain 1...</span>
                          </div>
                        ) : (
                          <>
                            <div className={`p-2 rounded-lg ${brain1Ready ? 'bg-emerald-500/20' : 'bg-slate-700 group-hover:bg-slate-600'}`}>
                              {brain1Ready ? <CheckCircle2 size={14} /> : <Download size={14} />}
                            </div>
                            {brain1Ready ? 'Gemma3n E2B Ready' : 'Download Brain 1 (E2B)'}
                          </>
                        )}
                      </button>

                      <button 
                        onClick={() => handleDownloadBrain(2)}
                        disabled={brain2Ready || downloadingBrain !== null}
                        className={`group relative overflow-hidden py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 border ${
                          brain2Ready 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 cursor-default' 
                            : downloadingBrain === 2
                                ? 'bg-slate-900 border-slate-800 text-amber-500'
                                : downloadingBrain !== null
                                  ? 'bg-slate-900/50 border-slate-800 text-slate-700 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50 hover:border-slate-600 cursor-pointer active:scale-95 shadow-lg shadow-black/20'
                        }`}
                      >
                        {downloadingBrain === 2 ? (
                          <div className="w-full px-4">
                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                              <Wifi size={10} className="text-amber-500 animate-pulse" />
                              <span className="text-[7px] font-bold text-amber-500/70">WIFI Recommended</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-2">
                              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                            </div>
                            <span className="text-[8px] animate-pulse">Syncing E4B (Second Brain)...</span>
                          </div>
                        ) : (
                          <>
                            <div className={`p-2 rounded-lg ${brain2Ready ? 'bg-emerald-500/20' : 'bg-slate-700 group-hover:bg-slate-600'}`}>
                              {brain2Ready ? <CheckCircle2 size={14} /> : <Download size={14} />}
                            </div>
                            <div className="flex flex-col gap-1">
                              <span>{brain2Ready ? 'Gemma3n E4B Ready' : 'Download Brain 2 (E4B)'}</span>
                              {!brain2Ready && (
                                <div className="flex items-center justify-center gap-1 opacity-50">
                                  <Wifi size={8} />
                                  <span className="text-[7px]">Wifi Required</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={S.card} className="lg:col-span-2">
                <h3 className="text-xl font-bold mb-4 italic">Recent Call Records</h3>
                <div className="space-y-3">
                  {voiceRecords.map((r: any) => (
                    <div key={r.id} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all cursor-pointer">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-slate-200">{r.caller || r.client}</span>
                        <span className="text-slate-500 text-xs font-mono">{(r.timestamp || r.date)?.slice(0, 10)}</span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{r.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'feed' && (
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold italic">Hearing Feed</h2>
              <div style={S.card}>
                <div className="space-y-4">
                  {CLIENTS.slice(0, 3).map(c => (
                    <div key={c.slNo} className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0">
                      <div>
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.caseNumber} · {c.courtName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-500 font-bold text-sm">{c.nextPostingDate}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{c.purposeOfPosting}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'consult' && (
            <div className="h-full flex flex-col p-6 gap-4">
              <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                      <Sparkles size={16} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Nexus Consultant AI</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={resetChat}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
                    >
                      <RefreshCw size={14} />
                      New Chat
                    </button>
                    {isSpeaking && (
                      <button 
                        onClick={stopAiAudio}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all border border-rose-500/20 shadow-lg shadow-rose-500/5 animate-pulse"
                      >
                        <VolumeX size={14} />
                        Stop Reading
                      </button>
                    )}
                  </div>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Icon path="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" size={32} />
                      </div>
                      <p className="text-lg font-medium">Ask Nexus AI anything legal</p>
                      <p className="text-sm">Drafting, case strategy, or legal research</p>
                    </div>
                  )}
                  {chatHistory.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-5 rounded-2xl leading-relaxed relative group ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                        <div className={`prose prose-invert max-w-none text-sm ${m.role === 'user' ? 'text-white' : 'text-slate-200'}`}>
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                        
                        {m.role === 'ai' && (
                          <div className="mt-4 flex gap-2 pt-4 border-t border-slate-700/50">
                            <button onClick={() => copyToClipboard(m.text)} title="Copy to clipboard" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => downloadTextAsFile(m.text)} title="Download Text" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Download size={14} />
                            </button>
                            <button onClick={() => setChatHistory(prev => prev.filter(item => item.id !== m.id))} title="Delete message" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-500 transition-all ml-auto">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {consoleLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 p-5 rounded-2xl rounded-tl-none border border-slate-700 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75" />
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex gap-4">
                  <input 
                    value={consoleInput}
                    onChange={e => setConsoleInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendConsult()}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 transition-all text-sm"
                    placeholder="Describe the legal issue or ask for a draft..."
                  />
                  <button onClick={() => sendConsult()} className="px-8 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">Send</button>
                </div>
              </div>
            </div>
          )}

          {view === 'clients' && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold italic">Client Registry</h2>
                <button onClick={() => setAddingClient(true)} className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl text-xs uppercase tracking-widest">+ Add Client</button>
              </div>
              <div style={S.card} className="overflow-hidden p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="p-5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Client</th>
                      <th className="p-5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Case No.</th>
                      <th className="p-5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Next Date</th>
                      <th className="p-5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.slNo} className="border-b border-slate-900/50 hover:bg-slate-900/30 transition-all">
                        <td className="p-5">
                          <div className="font-bold text-sm">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.phone}</div>
                        </td>
                        <td className="p-5">
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-mono font-bold border border-indigo-500/20">{c.caseNumber}</span>
                        </td>
                        <td className="p-5 text-sm font-medium text-emerald-500">{c.nextPostingDate}</td>
                        <td className="p-5">
                          <button className="text-slate-500 hover:text-white transition-all">View Files</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'knowledge-base' && (
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold italic">Knowledge Base</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kbDocs.map(doc => (
                  <div key={doc.id} style={S.card} className="p-6 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <Icon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{doc.size}</span>
                    </div>
                    <div className="font-bold text-sm mb-1">{doc.name}</div>
                    <div className="text-xs text-slate-500">{doc.pages} pages · Added {doc.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'temp-instructions' && (
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold italic">Temporary Instructions</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div style={S.card} className="border-amber-500/20">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">Add New Instruction</h4>
                  <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm mb-4" rows={4} placeholder="e.g. If my clerk calls, tell him to bring the OS 145 file..." />
                  <button className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl text-xs uppercase tracking-widest">Save Instruction</button>
                </div>
                <div className="space-y-3">
                  {tempInstructions.map(instr => (
                    <div key={instr.id} style={S.card} className={`p-5 ${instr.active ? 'border-emerald-500/20' : 'opacity-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm leading-relaxed">{instr.text}</p>
                        <div className={`w-2 h-2 rounded-full ${instr.active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      </div>
                      <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{instr.created}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'notifications' && (
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold italic">Notifications</h2>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} style={S.card} className="p-5 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${n.read ? 'bg-slate-800' : 'bg-indigo-500 animate-pulse'}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${n.read ? 'text-slate-500' : 'text-slate-200 font-medium'}`}>{n.message}</p>
                      <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{n.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'support' && (
            <div className="h-full flex flex-col p-8 gap-6">
              <h2 className="text-2xl font-bold italic">Help Desk</h2>
              <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
                <div ref={supportRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                  {supportMsgs.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-amber-500 text-black font-medium rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-slate-800 flex gap-4">
                  <input className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 outline-none text-sm" placeholder="Describe your issue..." />
                  <button className="px-8 bg-amber-500 text-black font-bold rounded-2xl">Send</button>
                </div>
              </div>
            </div>
          )}

          {view === 'reading-room' && (
            <div className="p-8 space-y-6 h-full flex flex-col">
              <h2 className="text-2xl font-bold italic">Reading Room</h2>
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
                <div style={S.card} className="flex flex-col items-center justify-center border-dashed border-2 border-slate-800">
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6">
                    <Icon path="M15 12a3 3 0 11-6 0 3 3 0 016 0z" size={40} />
                  </div>
                  <button onClick={startScan} className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20">Start Camera OCR</button>
                  <p className="text-xs text-slate-500 mt-6 uppercase tracking-widest font-bold">Hold document steady for scanning</p>
                </div>
                <div style={S.card} className="bg-slate-950/50 flex flex-col">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-4">Scanned Text Output</h4>
                  <div className="flex-1 overflow-y-auto font-mono text-sm text-slate-400 leading-relaxed italic">
                    {scannedText || "Scanning results will appear here..."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'doc-converter' && (
            <div className="p-8 space-y-6 h-full flex flex-col">
              <h2 className="text-2xl font-bold italic">Document Converter</h2>
              <div style={S.card} className="flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-800">
                <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                  <Icon path="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" size={32} />
                </div>
                <h3 className="text-lg font-bold mb-2">Multi-page Converter</h3>
                <p className="text-sm text-slate-500 mb-8 max-w-sm text-center">Scan multiple pages, translate to Indian languages, and export as searchable PDF or Text.</p>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-indigo-600 rounded-xl font-bold">Upload PDF</button>
                  <button className="px-8 py-3 bg-slate-800 border border-slate-700 rounded-xl font-bold">Scan Pages</button>
                </div>
              </div>
            </div>
          )}

          {view === 'writing-desk' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 bg-slate-950 p-10 overflow-y-auto font-mono text-sm leading-relaxed">
                  <div className="max-w-3xl mx-auto bg-white text-black p-16 shadow-2xl min-h-full rounded-sm">
                    <pre className="whitespace-pre-wrap font-serif text-base">{draftPages[currentPage-1]}</pre>
                  </div>
                </div>
                <div className="w-96 bg-slate-900 border-l border-slate-800 p-8 flex flex-col gap-8 shadow-2xl">
                  <div>
                    <h3 className="font-bold text-amber-500 uppercase text-[10px] tracking-[0.2em] mb-6">AI Drafting Assistant</h3>
                    <div className="space-y-4">
                      {draftSuggestions.map(s => (
                        <div key={s.id} className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${s.type === 'add' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>{s.type}</span>
                            <span className="text-[9px] text-slate-500 font-bold">{s.line}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mb-4">{s.text}</p>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">Accept</button>
                            <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center px-8 justify-between">
                <div className="flex gap-2">
                  {draftPages.map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i+1)} className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${currentPage === i+1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-110' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>{i+1}</button>
                  ))}
                  <button className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-500 font-bold hover:bg-slate-700 transition-all">+</button>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest">Export Draft</button>
                </div>
              </div>
            </div>
          )}

          {view === 'dialer' && (
            <div className="p-8 h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="text-3xl font-mono tracking-widest text-white mb-2 h-10">
                    {consoleInput || "Nexus Dialer"}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nexus Link Online</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map(num => (
                    <button 
                      key={num} 
                      onClick={() => setConsoleInput(prev => prev + num)}
                      className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-bold transition-all active:scale-90"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={() => setConsoleInput(prev => prev.slice(0, -1))}
                    className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition-all"
                  >
                    <Icon path="M12 19l-7-7 7-7m5 14l-7-7 7-7" size={20} />
                  </button>
                  <button className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                    <Icon path="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" size={28} />
                  </button>
                  <button 
                    onClick={() => setVoiceAiOn(!voiceAiOn)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${voiceAiOn ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'}`}
                  >
                    <Icon path="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" size={20} />
                  </button>
                </div>
              </div>
              
              <div className="mt-8 w-full max-w-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4 text-center">Recent Activity</h4>
                <div className="space-y-2">
                  {voiceRecords.slice(0, 3).map((r: any) => (
                    <div key={r.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">{r.caller || r.client}</div>
                        <div className="text-[10px] text-slate-500">{r.duration} · {(r.timestamp || r.date)?.slice(0, 10)}</div>
                      </div>
                      <Icon path="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" size={14} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        
        {incomingCall && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-[40px] p-10 text-center shadow-[0_0_100px_rgba(79,70,229,0.2)]">
              <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                <Icon path="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" size={40} />
              </div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">{incomingCall.caller || 'Unknown Caller'}</h2>
              <p className="text-indigo-400 font-mono text-lg mb-8">{incomingCall.phone}</p>
              
              <div className="bg-slate-800/50 rounded-3xl p-6 mb-8 border border-slate-700">
                <div className="flex items-center gap-3 mb-3 justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    {incomingCall.status === 'incoming' ? 'Automatic Answering...' : 'Call Answered'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 italic">
                  {incomingCall.status === 'incoming' 
                    ? "Nexus AI is preparing to handle this call based on your instructions." 
                    : "AI is currently speaking with the client. Summary will be generated soon."}
                </p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIncomingCall(null)} className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-bold transition-all">End Call</button>
                <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold border border-slate-700 transition-all">Take Over</button>
              </div>
            </div>
          </div>
        )}

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 pointer-events-none">
          {camOn && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="pointer-events-auto w-48 h-32 bg-slate-900 border-2 border-indigo-500 rounded-3xl overflow-hidden shadow-2xl mb-2"
            >
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-125 contrast-75" />
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            </motion.div>
          )}
          {voiceAiOn && (
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-3xl p-6 w-96 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-indigo-500/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] ${micLevel > 10 || isSpeaking ? 'animate-pulse scale-125' : ''} ${isSpeaking ? 'bg-amber-400 shadow-amber-500/50' : 'bg-emerald-500'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSpeaking ? 'text-amber-400' : 'text-emerald-500'}`}>
                    {isSpeaking ? 'Nexus Speaking' : 'Nexus Listening'}
                  </span>
                </div>
                {isSpeaking && (
                  <button 
                    onClick={stopAiAudio}
                    className="flex items-center gap-2 px-3 py-1 bg-rose-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-wider animate-pulse"
                  >
                    <VolumeX size={10} />
                    Stop Voice
                  </button>
                )}
                <div className="flex gap-1.5 items-end h-4">
                  {[...Array(6)].map((_, i) => (
                    <motion.div 
                      key={i} 
                      animate={{ height: (micLevel > 5 || isSpeaking) ? 4 + (Math.random() * (micLevel > 5 ? micLevel / 4 : 8)) : 4 }}
                      className={`w-1 rounded-full ${isSpeaking ? 'bg-amber-500/50' : 'bg-indigo-500/50'}`} 
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isSpeaking ? 'AI Guidance' : 'Last Command'}</p>
                <p className="text-sm text-slate-200 leading-relaxed italic font-medium">
                  {voiceAiReply || (micLevel > 10 ? 'Transcribing legal query...' : 'Listening for your command...')}
                </p>
              </div>
            </div>
          )}
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-full p-3 flex items-center gap-3 shadow-2xl border-t-white/5">
            <button onClick={() => { setCamOn(!camOn); setView('consult'); }} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${camOn ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
              <Icon path="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" size={22} />
            </button>
            <button 
              onClick={() => { 
                const newState = !voiceAiOn;
                setVoiceAiOn(newState); 
                setView('consult');
                if (newState && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance("Nexus Voice Intelligence Active");
                  const voices = window.speechSynthesis.getVoices();
                  const voice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en')) || voices[0];
                  if (voice) u.voice = voice;
                  u.volume = 1;
                  window.speechSynthesis.speak(u);
                } else if (!newState) {
                  stopAiVoiceCompletely();
                }
              }} 
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${voiceAiOn ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-110' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
              <Icon path="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" size={22} />
            </button>
            {isSpeaking && (
              <button 
                onClick={stopAiAudio}
                className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-bounce active:scale-90 transition-all pointer-events-auto"
                title="Stop Speaking"
              >
                <VolumeX size={22} />
              </button>
            )}
          </div>
        </div>
        {/* Gemini API Key Modal */}
        <AnimatePresence>
          {showApiKeyModal && (
            <GeminiKeyModal 
              onClose={() => setShowApiKeyModal(false)} 
              onSuccess={() => {
                setShowApiKeyModal(false);
                // Refresh user state immediately to avoid repeated prompts
                api.get('/api/user/profile').then(res => {
                  if (onUpdateUser) onUpdateUser(res.data);
                  else window.location.reload();
                });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GeminiKeyModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidKey = apiKey.startsWith('AIza') && apiKey.length > 20;

  const voiceMessages = {
    1: "Navigate to Google AI Studio to generate your unique Gemini key.",
    2: "Copy the key securely to your device's clipboard now.",
    3: "Paste the key below to unlock your legal engine."
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (!isSuccess) {
      speak(voiceMessages[currentStep as keyof typeof voiceMessages]);
    }
  }, [currentStep, isSuccess]);

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setApiKeyError('Clipboard API not supported or blocked. Please paste manually.');
        return;
      }
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (e) {
      setApiKeyError('Clipboard access denied. Please click the input and paste (Ctrl+V) manually.');
    }
  };

  const handleSave = async () => {
    if (!isValidKey) return;
    setLoading(true);
    setApiKeyError('');
    try {
      const res = await api.post('/api/user/apikey', { apiKey });
      if (res.data?.success) {
        setIsSuccess(true);
        speak("Access granted. Your engine is now live.");
        setTimeout(() => onSuccess(), 2000);
      } else {
        setApiKeyError('Failed to save key. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('apikey save error:', err);
      const msg = err?.response?.data?.error || 'Failed to save API key.';
      setApiKeyError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

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
                <div className="w-16 h-16 bg-amber-500/10 rounded-[20px] flex items-center justify-center border border-amber-500/20 mb-6 relative">
                  <Key className="text-amber-500 w-8 h-8" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-amber-500 rounded-[20px] blur-xl -z-10"
                  />
                </div>
                <h2 className="text-2xl font-black text-white text-center tracking-tight mb-2 uppercase italic">Activate AI</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700/50">
                    <Volume2 className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Voice Aid: Step {currentStep}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      if (!next) handleStopSpeaking();
                    }}
                    className={`p-2 rounded-full border transition-all ${voiceEnabled ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    title={voiceEnabled ? "Mute Voice Guidance" : "Unmute Voice Guidance"}
                  >
                    {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  </button>
                  {voiceEnabled && (
                    <button 
                      onClick={handleStopSpeaking}
                      className="p-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all"
                      title="Stop Current Voice"
                    >
                      <VolumeX size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between mb-8 px-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${currentStep === s ? 'border-amber-500 bg-amber-500 text-black font-black scale-110 shadow-lg shadow-amber-500/20' : currentStep > s ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-slate-800 text-slate-600'}`}>
                      {currentStep > s ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px]">{s}</span>}
                    </div>
                    <div className={`text-[9px] font-black uppercase tracking-tighter ${currentStep === s ? 'text-amber-500' : 'text-slate-600'}`}>
                      {s === 1 ? 'ലഭിക്കുക' : s === 2 ? 'പകർത്തുക' : 'ചേർക്കുക'}
                    </div>
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                      <p className="text-slate-400 text-xs leading-relaxed mb-4 font-medium italic">Generate your key at Google AI Studio.</p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" onClick={() => setCurrentStep(2)}
                        className="flex items-center justify-between w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 rounded-xl transition-all shadow-xl shadow-amber-500/10 group font-bold text-sm"
                      >
                        <span>Obtain Key</span>
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                      <p className="text-slate-400 text-xs leading-relaxed mb-4 font-medium italic">Copy the key (AIza...) to your clipboard.</p>
                      <button onClick={() => setCurrentStep(3)} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border border-slate-700 transition-all font-bold text-sm">
                        Key Copied <ChevronRight size={16} className="inline ml-2" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">ചേർക്കുക (Paste Key)</label>
                      <div className="relative mb-5">
                        <input
                          ref={inputRef}
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className={`w-full bg-slate-950 border ${isValidKey ? 'border-emerald-500' : 'border-slate-800'} rounded-xl py-4 pl-5 pr-12 text-white outline-none font-mono text-xs tracking-widest`}
                          placeholder="AIzaSy..."
                        />
                        <button onClick={handlePaste} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500"><Clipboard size={18} /></button>
                      </div>
                      <button onClick={handleSave} disabled={loading || !isValidKey} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl transition-all disabled:opacity-20 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                        {loading ? 'Activating...' : <>Unlock AI <Sparkles size={14} /></>}
                      </button>
                      {apiKeyError && (
                        <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-4 text-center animate-pulse">
                          {apiKeyError}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 relative">
                <CheckCircle2 className="text-slate-950 w-10 h-10" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-emerald-500 rounded-full" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 italic tracking-tight">AI ACTIVE</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest leading-relaxed">Identity Verified. Nexus Gateway Open.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
