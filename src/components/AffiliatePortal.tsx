import { useState, useEffect } from 'react';
import api from '../api';
import { LayoutDashboard, Users, CreditCard, Share2, Copy, Check } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

export default function AffiliatePortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/api/affiliate/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      // Mock data for build phase
      setData({
        aff: user,
        subscribers: [],
        earned: 0,
        paymentHistory: []
      });
      setLoading(false);
    });
  }, [user]);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
    </div>
  );

  const aff = data?.aff || user;
  const subscribers = data?.subscribers || [];
  const earned = data?.earned || 0;
  const affiliateLink = `${window.location.origin}/signup?ref=${aff?.code || 'NEXUS123'}`;

  const NAVS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscribers', label: 'Subscribers', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'share', label: 'Share & Earn', icon: Share2 },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col py-6">
        <div className="px-6 mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <span className="text-2xl font-black text-slate-950">A</span>
          </div>
          <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Affiliate Portal</h2>
          <h1 className="text-lg font-bold text-white truncate">{aff?.name}</h1>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{aff?.email}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAVS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 mt-auto pt-6 border-t border-slate-800 flex justify-center">
          <UserButton afterSignOutUrl="/" showName />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-400">Nexus Justice</span>
              <span className="text-emerald-500 font-black italic">Affiliate Portal</span>
            </div>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
              <div className={`w-1.5 h-1.5 rounded-full ${user.gemini_api_key ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${user.gemini_api_key ? 'text-emerald-500' : 'text-rose-500'}`}>
                {user.gemini_api_key ? 'GEMINI 2.5 FLASH ACTIVE' : 'AI OFFLINE'}
              </span>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="hidden sm:flex px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
              Code: {aff?.code || '—'}
            </div>
            <div className="hidden md:flex px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              ₹{earned.toFixed(2)} Earned
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {tab === 'dashboard' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold italic">Affiliate Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Referral Code', val: aff?.code || 'N/A', color: 'text-amber-400' },
                  { label: 'Total Referrals', val: subscribers.length, color: 'text-indigo-400' },
                  { label: 'Active Referrals', val: subscribers.filter((s:any) => s.status === 'active').length, color: 'text-emerald-400' },
                  { label: 'Commission Earned', val: `₹${earned.toFixed(2)}`, color: 'text-purple-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8">
                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Your Referral Link</h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-slate-400 truncate">
                    {affiliateLink}
                  </div>
                  <button 
                    onClick={() => copyCode(affiliateLink)}
                    className="flex items-center gap-2 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Share this link with advocates. You earn <span className="text-emerald-400 font-bold">10% commission</span> for every month they remain active on a paid plan.
                </p>
              </div>
            </div>
          )}

          {tab === 'subscribers' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold italic">Referred Advocates</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Name', 'Email', 'Plan', 'Status', 'Joined'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No referrals yet. Share your link to start earning!</td>
                      </tr>
                    ) : subscribers.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{s.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{s.email}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-indigo-500/20">
                            {s.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{(s.joined_at || s.joinedAt)?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
