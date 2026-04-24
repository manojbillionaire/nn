import { useState, useEffect } from 'react';
import api from '../api';
import { LayoutDashboard, Users, CreditCard, AlertCircle, Share2, Megaphone, Brain, Search } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

const Icon = ({ icon: IconComp, size = 20 }: { icon: any, size?: number }) => (
  <IconComp size={size} />
);

export default function AgencyHQPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [tab, setTab] = useState('dashboard');
  const [advocates, setAdvocates] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [advsRes, statsRes] = await Promise.all([
        api.get('/api/agency/advocates').catch(() => ({ data: [] })),
        api.get('/api/agency/stats').catch(() => ({ data: { totalAdvocates: 0, pending: 0, affiliates: 0, totalCases: 0 } })),
      ]);
      setAdvocates(advsRes.data);
      setStats(statsRes.data);
    } catch (e) { console.error('Load error:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = advocates.filter(a => !searchQ || a.name?.toLowerCase().includes(searchQ.toLowerCase()) || a.email?.toLowerCase().includes(searchQ.toLowerCase()));

  const NAVS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'advocates', label: 'Advocates', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'pending', label: 'Pending', icon: AlertCircle },
    { id: 'affiliates', label: 'Affiliates', icon: Share2 },
    { id: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
    { id: 'ai-intel', label: 'AI Intelligence', icon: Brain },
  ];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col py-6">
        <div className="px-6 mb-8">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <span className="text-2xl font-black text-slate-950 italic">T</span>
          </div>
          <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Agency HQ</h2>
          <h1 className="text-lg font-bold text-white">Admin Portal</h1>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{user.email}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAVS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === item.id 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon icon={item.icon} size={18} />
              {item.label}
              {item.id === 'pending' && pending.length > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pending.length}</span>
              )}
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
              <span className="text-amber-500 font-black italic">Agency HQ</span>
            </div>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
              <div className={`w-1.5 h-1.5 rounded-full ${user.gemini_api_key ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${user.gemini_api_key ? 'text-emerald-500' : 'text-rose-500'}`}>
                {user.gemini_api_key ? 'Gemini 2.0 Flash Active' : 'Gemini Not Active'}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="hidden md:flex px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-500 uppercase tracking-wider items-center">
              {stats.totalAdvocates || 0} Advocates
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {tab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Advocates', val: stats.totalAdvocates || 0, color: 'text-indigo-400' },
                  { label: 'Pending Approval', val: stats.pending || 0, color: 'text-amber-400' },
                  { label: 'Total Affiliates', val: stats.affiliates || 0, color: 'text-emerald-400' },
                  { label: 'Total Cases', val: stats.totalCases || 0, color: 'text-purple-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Recent Advocate Registrations</h3>
                </div>
                <div className="divide-y divide-slate-800">
                      {advocates.slice(0, 5).map((a) => (
                        <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold">
                            {a.name?.[0] || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white tracking-tight">{a.name || 'Anonymous'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{a.email}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {a.status}
                          </span>
                        </div>
                      ))}
                      {advocates.length === 0 && (
                        <div className="px-6 py-12 text-center text-slate-600 text-xs uppercase tracking-widest font-bold">
                          No advocates registered yet
                        </div>
                      )}
                </div>
              </div>
            </div>
          )}

          {tab === 'advocates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold italic">All Advocates</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search advocates..."
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-amber-500 w-64"
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Name', 'Email', 'Bar Council No.', 'Plan', 'Status', 'Joined'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{a.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{a.email}</td>
                        <td className="px-6 py-4 text-sm text-indigo-400 font-mono">{a.bar_council_no}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {a.plan || 'Starter'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{a.joined_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-600 text-xs italic">
                          No advocates found matching your search.
                        </td>
                      </tr>
                    )}
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
