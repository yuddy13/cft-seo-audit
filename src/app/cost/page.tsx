'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Zap, AlertCircle, RefreshCw } from 'lucide-react';

interface CostData {
  totals: {
    total_calls: number; done_calls: number; failed_calls: number;
    retried_calls: number; tokens_in: number; tokens_out: number; spend_usd: number;
  };
  byModel: Array<{ model_label: string; calls: number; tokens_in: number; tokens_out: number; spend_usd: number }>;
  byNiche: Array<{ name: string; calls: number; spend_usd: number }>;
  avgCostPerCall: number;
}

export default function CostPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/cost').then((r) => r.json()) as CostData;
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load cost data</div>;

  const t = data.totals;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Cost Report</h1>
          <p className="text-sm text-gray-500">API usage and spend across all runs.</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-500" />} label="Total Spend" value={`$${(t.spend_usd ?? 0).toFixed(4)}`} />
        <StatCard icon={<Zap className="w-5 h-5 text-blue-500" />} label="API Calls Done" value={(t.done_calls ?? 0).toLocaleString()} />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-red-500" />} label="Failed Calls" value={t.failed_calls ?? 0} />
        <StatCard icon={<RefreshCw className="w-5 h-5 text-orange-500" />} label="Retried Calls" value={t.retried_calls ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Tokens In (prompt)</p>
          <p className="text-2xl font-bold">{(t.tokens_in ?? 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Tokens Out (completion)</p>
          <p className="text-2xl font-bold">{(t.tokens_out ?? 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Avg Cost per Call</p>
          <p className="text-2xl font-bold">${data.avgCostPerCall.toFixed(5)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Calls (incl. pending)</p>
          <p className="text-2xl font-bold">{(t.total_calls ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* By model */}
      <div className="stat-card">
        <h2 className="font-semibold text-gray-800 mb-3">Cost by Model</h2>
        <table className="table-auto">
          <thead><tr><th>Model</th><th>Calls</th><th>Tokens In</th><th>Tokens Out</th><th>Spend</th></tr></thead>
          <tbody>
            {data.byModel.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">No data yet</td></tr>
            ) : data.byModel.map((m) => (
              <tr key={m.model_label}>
                <td className="font-medium">{m.model_label}</td>
                <td>{m.calls.toLocaleString()}</td>
                <td className="font-mono text-xs">{m.tokens_in.toLocaleString()}</td>
                <td className="font-mono text-xs">{m.tokens_out.toLocaleString()}</td>
                <td className="font-mono font-medium">${m.spend_usd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By niche */}
      <div className="stat-card">
        <h2 className="font-semibold text-gray-800 mb-3">Cost by Niche</h2>
        <table className="table-auto">
          <thead><tr><th>Niche</th><th>Calls</th><th>Spend</th></tr></thead>
          <tbody>
            {data.byNiche.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6">No data yet</td></tr>
            ) : data.byNiche.map((n) => (
              <tr key={n.name}>
                <td className="font-medium">{n.name}</td>
                <td>{n.calls.toLocaleString()}</td>
                <td className="font-mono font-medium">${n.spend_usd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
