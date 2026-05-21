'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Edit3, Check, X } from 'lucide-react';

interface Niche { id: number; name: string; slug: string; }
interface Query { id: number; niche_id: number; query_num: number; query_text: string; intent_type: string; edited: number; }

const INTENT_COLORS: Record<string, string> = {
  best: 'bg-blue-100 text-blue-800',
  'how-to': 'bg-green-100 text-green-800',
  vs: 'bg-purple-100 text-purple-800',
  'what-is': 'bg-orange-100 text-orange-800',
  provider: 'bg-pink-100 text-pink-800',
};

export default function QueriesPage() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<number | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/niches')
      .then((r) => r.json())
      .then((d: Niche[]) => {
        setNiches(d);
        if (d.length > 0) setSelectedNiche(d[0].id);
      });
  }, []);

  useEffect(() => {
    if (selectedNiche == null) return;
    setLoading(true);
    fetch(`/api/queries?niche_id=${selectedNiche}`)
      .then((r) => r.json())
      .then((d: Query[]) => setQueries(d))
      .finally(() => setLoading(false));
  }, [selectedNiche]);

  async function generate(regen = false) {
    if (!selectedNiche) return;
    setLoading(true);
    const d = await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche_id: selectedNiche, regenerate: regen }),
    }).then((r) => r.json()) as Query[];
    setQueries(d);
    setLoading(false);
  }

  async function saveEdit() {
    if (!editId) return;
    await fetch('/api/queries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, query_text: editText }),
    });
    setQueries((prev) => prev.map((q) => q.id === editId ? { ...q, query_text: editText, edited: 1 } : q));
    setEditId(null);
  }

  const byIntent = queries.reduce<Record<string, Query[]>>((acc, q) => {
    (acc[q.intent_type] = acc[q.intent_type] || []).push(q);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="page-title">Queries</h1>
        <p className="text-sm text-gray-500">25 queries per niche across 5 intent types. Edit before running.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="w-52"
          value={selectedNiche ?? ''}
          onChange={(e) => setSelectedNiche(parseInt(e.target.value))}
        >
          {niches.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        {queries.length === 0 ? (
          <button onClick={() => generate(false)} className="btn-primary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Generate Queries
          </button>
        ) : (
          <button onClick={() => generate(true)} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Regenerate
          </button>
        )}
        {queries.length > 0 && (
          <span className="text-sm text-gray-500">{queries.length} queries • {queries.filter((q) => q.edited).length} edited</span>
        )}
      </div>

      {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}

      {!loading && queries.length === 0 && (
        <div className="stat-card text-center py-12">
          <p className="text-gray-500 mb-4">No queries yet. Click Generate to create 25 queries for this niche.</p>
        </div>
      )}

      {Object.entries(byIntent).map(([intent, qs]) => (
        <div key={intent} className="stat-card space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${INTENT_COLORS[intent] ?? 'bg-gray-100 text-gray-700'}`}>
              {intent}
            </span>
            <span className="text-sm text-gray-500">{qs.length} queries</span>
          </div>
          {qs.map((q) => (
            <div key={q.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">#{q.query_num}</span>
              {editId === q.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-sm text-gray-800 flex-1 ${q.edited ? 'italic' : ''}`}>{q.query_text}</span>
                  {q.edited && <span className="text-xs text-blue-500 flex-shrink-0">edited</span>}
                  <button
                    onClick={() => { setEditId(q.id); setEditText(q.query_text); }}
                    className="text-gray-300 hover:text-blue-500 flex-shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
