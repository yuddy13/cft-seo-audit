'use client';

import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Plus, RefreshCw, AlertTriangle } from 'lucide-react';

interface Niche { id: number; name: string; enabled: number; }
interface Run {
  id: number; name: string; status: string; is_pilot: number;
  niche_ids: string; total_calls: number; done_calls: number;
  failed_calls: number; spend_usd: number; created_at: string;
}
interface RecentResult {
  id: number; query_text: string; model_label: string; niche_name: string;
  status: string; finished_at: string;
}

const STATUS_PILL: Record<string, string> = {
  done: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-700',
  failed: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

export default function RunsPage() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedNiches, setSelectedNiches] = useState<number[]>([]);
  const [runName, setRunName] = useState('');
  const [isPilot, setIsPilot] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadRuns() {
    const raw = await fetch('/api/runs').then((r) => r.json());
    const d: Run[] = Array.isArray(raw) ? raw : [];
    setRuns(d);
    const running = d.find((r) => r.status === 'running');
    if (running) setActiveRunId(running.id);
  }

  useEffect(() => {
    fetch('/api/niches').then((r) => r.json()).then((raw) => {
      const d: Niche[] = Array.isArray(raw) ? raw : [];
      setNiches(d);
      const enabled = d.filter((n) => n.enabled).map((n) => n.id);
      setSelectedNiches(enabled.slice(0, 1));
    });
    loadRuns();
  }, []);

  // Poll active run
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeRunId) return;
    pollRef.current = setInterval(async () => {
      const d = await fetch(`/api/runs/status?run_id=${activeRunId}`).then((r) => r.json()) as {
        run: Run; recentResults: RecentResult[];
      };
      setRuns((prev) => prev.map((r) => r.id === activeRunId ? d.run : r));
      setRecentResults(d.recentResults);
      if (d.run.status !== 'running') {
        clearInterval(pollRef.current!);
        setActiveRunId(null);
      }
    }, 3000);
    return () => clearInterval(pollRef.current!);
  }, [activeRunId]);

  async function createAndStart() {
    if (!runName.trim() || selectedNiches.length === 0) return;
    setCreating(true);
    const run = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: runName, niche_ids: selectedNiches, is_pilot: isPilot }),
    }).then((r) => r.json()) as Run;

    if (!run?.id) {
      setCreating(false);
      return;
    }

    await fetch('/api/runs/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run.id }),
    });

    setActiveRunId(run.id);
    setRunName('');
    setConfirmed(false);
    setCreating(false);
    loadRuns();
  }

  async function pause(runId: number) {
    await fetch('/api/runs/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId, paused: true }),
    });
  }

  async function resume(runId: number) {
    await fetch('/api/runs/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId }),
    });
    setActiveRunId(runId);
    loadRuns();
  }

  const totalCalls = selectedNiches.reduce((sum, nid) => {
    // 25 queries × 3 models
    return sum + 75;
  }, 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="page-title">Runs</h1>
        <p className="text-sm text-gray-500">Create and manage research runs across niches and models.</p>
      </div>

      {/* Create Run */}
      <div className="stat-card space-y-4">
        <h2 className="font-semibold text-gray-800">New Run</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Run Name</label>
          <input
            type="text"
            placeholder="e.g. Pilot - iGaming May 2024"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Niches</label>
          <div className="flex flex-wrap gap-2">
            {niches.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedNiches((prev) =>
                  prev.includes(n.id) ? prev.filter((id) => id !== n.id) : [...prev, n.id]
                )}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                  ${selectedNiches.includes(n.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
              >
                {n.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPilot} onChange={(e) => setIsPilot(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-gray-700">Pilot run (run 1 niche first to review citations before full run)</span>
        </label>

        {selectedNiches.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Estimated API usage</p>
              <p className="text-sm text-amber-700">
                ~{totalCalls} calls across {selectedNiches.length} niche(s). This will consume API credits.
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium text-amber-800">I confirm I want to proceed</span>
              </label>
            </div>
          </div>
        )}

        <button
          onClick={createAndStart}
          disabled={!runName.trim() || selectedNiches.length === 0 || creating || !confirmed}
          className="btn-primary"
        >
          <Play className="w-4 h-4" />
          {creating ? 'Starting…' : 'Create & Start Run'}
        </button>
      </div>

      {/* Active run progress */}
      {activeRunId && runs.find((r) => r.id === activeRunId) && (() => {
        const run = runs.find((r) => r.id === activeRunId)!;
        const pct = run.total_calls > 0 ? (run.done_calls / run.total_calls) * 100 : 0;
        return (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{run.name}</h3>
                <p className="text-sm text-gray-500">{run.done_calls}/{run.total_calls} calls • ${run.spend_usd.toFixed(4)} spent</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => loadRuns()} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
                {run.status === 'running' && (
                  <button onClick={() => pause(run.id)} className="btn-secondary text-xs">
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {run.status === 'paused' && (
                  <button onClick={() => resume(run.id)} className="btn-primary text-xs">
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${run.status === 'running' ? 'bg-blue-500' : run.status === 'done' ? 'bg-green-500' : 'bg-yellow-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{pct.toFixed(0)}% complete {run.failed_calls > 0 && `• ${run.failed_calls} failed`}</p>

            {recentResults.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Recent activity</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {recentResults.map((r) => (
                    <div key={r.id} className="text-xs flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'done' ? 'bg-green-400' : r.status === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`} />
                      <span className="text-gray-500">[{r.model_label}]</span>
                      <span className="text-gray-700 truncate">{r.query_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Runs table */}
      <div className="stat-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">All Runs</h2>
          <button onClick={loadRuns} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <table className="table-auto">
          <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Progress</th><th>Spend</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No runs yet</td></tr>
            ) : runs.map((r) => {
              const pct = r.total_calls > 0 ? Math.round((r.done_calls / r.total_calls) * 100) : 0;
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td><span className="text-xs text-gray-500">{r.is_pilot ? 'Pilot' : 'Full'}</span></td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[r.status] ?? 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">{r.done_calls}/{r.total_calls} ({pct}%)</td>
                  <td className="font-mono text-xs">${r.spend_usd.toFixed(4)}</td>
                  <td className="text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'paused' && (
                      <button onClick={() => resume(r.id)} className="btn-ghost text-xs">
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
