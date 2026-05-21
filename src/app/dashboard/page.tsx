'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe, Link2, Tag, TrendingUp, DollarSign, Play } from 'lucide-react';

interface DashData {
  totalRuns: number;
  totalCitations: number;
  totalDomains: number;
  totalSpend: number;
  byModel: Array<{ model_label: string; cnt: number }>;
  topDomains: Array<{ root_domain: string; total: number }>;
  byNiche: Array<{ name: string; citations: number; domains: number }>;
  heatmap: Array<{ niche: string; model: string; cnt: number }>;
  recentRuns: Array<{
    id: number; name: string; status: string; total_calls: number;
    done_calls: number; spend_usd: number; created_at: string;
  }>;
}

const MODEL_COLORS: Record<string, string> = {
  ChatGPT: '#10b981',
  Gemini: '#3b82f6',
  Perplexity: '#8b5cf6',
};

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageShell><div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard…</div></PageShell>;
  if (!data) return <PageShell><div className="text-red-500 p-6">Failed to load dashboard</div></PageShell>;

  // Build heatmap grid
  const niches = Array.from(new Set(data.heatmap.map((h) => h.niche)));
  const models = ['ChatGPT', 'Gemini', 'Perplexity'];
  const heatLookup = new Map(data.heatmap.map((h) => [`${h.niche}|${h.model}`, h.cnt]));
  const maxHeat = Math.max(...data.heatmap.map((h) => h.cnt), 1);

  return (
    <PageShell>
      <div className="p-6 space-y-6 max-w-7xl">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500">AI citation research overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Play className="w-5 h-5 text-blue-500" />} label="Total Runs" value={data.totalRuns} />
          <StatCard icon={<Link2 className="w-5 h-5 text-green-500" />} label="Citations Collected" value={data.totalCitations.toLocaleString()} />
          <StatCard icon={<Globe className="w-5 h-5 text-purple-500" />} label="Unique Domains" value={data.totalDomains.toLocaleString()} />
          <StatCard icon={<DollarSign className="w-5 h-5 text-orange-500" />} label="Total Spend" value={`$${data.totalSpend.toFixed(4)}`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Citations by Model */}
          <div className="stat-card">
            <h2 className="font-semibold text-gray-800 mb-4">Citations by Model</h2>
            {data.byModel.length === 0 ? (
              <Empty text="No data yet — run a niche to see results" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byModel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="model_label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cnt" name="Citations" radius={[4, 4, 0, 0]}>
                    {data.byModel.map((m) => (
                      <Cell key={m.model_label} fill={MODEL_COLORS[m.model_label] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Domains */}
          <div className="stat-card">
            <h2 className="font-semibold text-gray-800 mb-3">Top Cited Domains</h2>
            {data.topDomains.length === 0 ? <Empty text="No citations yet" /> : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {data.topDomains.slice(0, 15).map((d, i) => (
                  <div key={d.root_domain} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-gray-800">{d.root_domain}</span>
                        <span className="text-xs text-gray-500">{d.total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(d.total / (data.topDomains[0]?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Heatmap: Niche × Model */}
        {niches.length > 0 && (
          <div className="stat-card overflow-x-auto">
            <h2 className="font-semibold text-gray-800 mb-4">Niche × Model Citation Heatmap</h2>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-gray-500 py-2 pr-4 min-w-[140px]">Niche</th>
                  {models.map((m) => (
                    <th key={m} className="text-center font-medium text-gray-500 py-2 px-4 min-w-[100px]">{m}</th>
                  ))}
                  <th className="text-center font-medium text-gray-500 py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {niches.map((niche) => {
                  const rowTotal = models.reduce((s, m) => s + (heatLookup.get(`${niche}|${m}`) ?? 0), 0);
                  return (
                    <tr key={niche} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-700">{niche}</td>
                      {models.map((m) => {
                        const v = heatLookup.get(`${niche}|${m}`) ?? 0;
                        const pct = v / maxHeat;
                        return (
                          <td key={m} className="py-2 px-4 text-center">
                            <span
                              className="inline-block px-3 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: v === 0 ? '#f3f4f6' : `rgba(59, 130, 246, ${0.1 + pct * 0.85})`,
                                color: pct > 0.5 ? '#1e3a8a' : '#374151',
                              }}
                            >
                              {v}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-center font-medium text-gray-700">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* By Niche */}
        {data.byNiche.length > 0 && (
          <div className="stat-card">
            <h2 className="font-semibold text-gray-800 mb-3">Coverage by Niche</h2>
            <table className="table-auto">
              <thead>
                <tr>
                  <th>Niche</th>
                  <th>Citations</th>
                  <th>Unique Domains</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {data.byNiche.map((n) => (
                  <tr key={n.name}>
                    <td className="font-medium">{n.name}</td>
                    <td>{n.citations.toLocaleString()}</td>
                    <td>{n.domains}</td>
                    <td>
                      <span className={n.domains >= 50 ? 'text-green-600' : 'text-yellow-600'}>
                        {n.domains >= 50 ? 'Good' : 'Needs more data'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Runs */}
        {data.recentRuns.length > 0 && (
          <div className="stat-card">
            <h2 className="font-semibold text-gray-800 mb-3">Recent Runs</h2>
            <table className="table-auto">
              <thead><tr><th>Name</th><th>Status</th><th>Progress</th><th>Spend</th><th>Date</th></tr></thead>
              <tbody>
                {data.recentRuns.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-gray-600">{r.done_calls}/{r.total_calls}</td>
                    <td className="font-mono text-xs">${r.spend_usd.toFixed(4)}</td>
                    <td className="text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.totalCitations === 0 && (
          <div className="stat-card text-center py-12">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No data yet</h3>
            <p className="text-gray-500 text-sm mb-4">Set up your API key, choose niches, generate queries, and run a pilot.</p>
            <a href="/settings" className="btn-primary">Configure API Key →</a>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-8">{text}</p>;
}
