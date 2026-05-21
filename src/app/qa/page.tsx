'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

interface Warning { severity: 'error' | 'warn'; category: string; message: string; detail?: string; }
interface QAData { warnings: Warning[]; stats: { totalWarnings: number; errors: number; warns: number }; }

export default function QAPage() {
  const [data, setData] = useState<QAData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/qa').then((r) => r.json()) as QAData;
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">QA Checks</h1>
          <p className="text-sm text-gray-500">Automated checks to validate your research output quality.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-gray-900">{data.stats.totalWarnings}</p>
            <p className="text-sm text-gray-500">Total Issues</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-red-600">{data.stats.errors}</p>
            <p className="text-sm text-gray-500">Errors</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-yellow-500">{data.stats.warns}</p>
            <p className="text-sm text-gray-500">Warnings</p>
          </div>
        </div>
      )}

      {loading && <div className="text-center text-gray-400 py-12">Running checks…</div>}

      {data && data.warnings.length === 0 && !loading && (
        <div className="stat-card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">All checks passed</h3>
          <p className="text-sm text-gray-400 mt-1">No quality issues detected.</p>
        </div>
      )}

      {data && data.warnings.length > 0 && (
        <div className="space-y-3">
          {/* Group by category */}
          {Array.from(new Set(data.warnings.map((w) => w.category))).map((cat) => {
            const catWarnings = data.warnings.filter((w) => w.category === cat);
            return (
              <div key={cat} className="stat-card space-y-2">
                <h3 className="font-semibold text-gray-700">{cat}</h3>
                {catWarnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${w.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    {w.severity === 'error'
                      ? <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className={`text-sm font-medium ${w.severity === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>
                        {w.message}
                      </p>
                      {w.detail && <p className="text-xs text-gray-500 mt-0.5">{w.detail}</p>}
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${w.severity === 'error' ? 'badge-error' : 'badge-warn'}`}>
                      {w.severity}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="stat-card">
        <h2 className="font-semibold text-gray-800 mb-3">Checklist</h2>
        <ChecklistItem label="OpenRouter API key configured" href="/settings" />
        <ChecklistItem label="Niches enabled and queries generated" href="/niches" />
        <ChecklistItem label="Queries reviewed and edited if needed" href="/queries" />
        <ChecklistItem label="Pilot run completed successfully" href="/runs" />
        <ChecklistItem label="Citation extraction reviewed in Results" href="/results" />
        <ChecklistItem label="QA warnings resolved" />
        <ChecklistItem label="XLSX exported per niche" href="/results" />
      </div>
    </div>
  );
}

function ChecklistItem({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0" />
      <span className="text-sm text-gray-700">{label}</span>
      {href && <a href={href} className="ml-auto text-xs text-blue-600 hover:underline">Go →</a>}
    </div>
  );
}
