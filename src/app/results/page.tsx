'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface Niche { id: number; name: string; }
interface Citation {
  id: number; query_num: number; query_text: string; intent_type: string;
  model_label: string; root_domain: string; full_url: string;
  citation_type: string; recommended_brand: string; created_at: string;
}

const CITATION_COLORS: Record<string, string> = {
  Linked: 'bg-green-100 text-green-800',
  'Named Mention': 'bg-blue-100 text-blue-800',
  'Brand Domain': 'bg-purple-100 text-purple-800',
};

export default function ResultsPage() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<number | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch('/api/niches').then((r) => r.json()).then((d: Niche[]) => {
      setNiches(d);
      if (d.length) setSelectedNiche(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedNiche) return;
    setLoading(true);
    setPage(0);
    fetch(`/api/citations?niche_id=${selectedNiche}`)
      .then((r) => r.json())
      .then(setCitations)
      .finally(() => setLoading(false));
  }, [selectedNiche]);

  const filtered = citations.filter((c) => {
    if (search && !c.root_domain.includes(search.toLowerCase()) && !c.query_text.toLowerCase().includes(search.toLowerCase())) return false;
    if (modelFilter && c.model_label !== modelFilter) return false;
    if (intentFilter && c.intent_type !== intentFilter) return false;
    return true;
  });

  const PAGE_SIZE = 100;
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const models = Array.from(new Set(citations.map((c) => c.model_label)));
  const intents = Array.from(new Set(citations.map((c) => c.intent_type)));

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="text-sm text-gray-500">Browse extracted citations by niche.</p>
        </div>
        {selectedNiche && (
          <div className="flex gap-2">
            <a href={`/api/export?niche_id=${selectedNiche}&format=csv`} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> CSV
            </a>
            <a href={`/api/export?niche_id=${selectedNiche}&format=xlsx`} className="btn-primary text-xs">
              <Download className="w-3.5 h-3.5" /> XLSX
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="w-44" value={selectedNiche ?? ''} onChange={(e) => setSelectedNiche(parseInt(e.target.value))}>
          {niches.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search domain or query…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <select className="w-36" value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
          <option value="">All models</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="w-36" value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)}>
          <option value="">All intents</option>
          {intents.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} results</span>
      </div>

      <div className="stat-card p-0 overflow-hidden overflow-x-auto">
        <table className="table-auto min-w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Domain</th>
              <th>Model</th>
              <th>Intent</th>
              <th>Type</th>
              <th>Brand</th>
              <th>Query</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">No citations yet — run a niche first.</td></tr>
            ) : paginated.map((c) => (
              <tr key={c.id}>
                <td className="text-gray-400 text-xs">{c.query_num}</td>
                <td>
                  <a
                    href={c.full_url || `https://${c.root_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-medium text-sm"
                  >
                    {c.root_domain}
                  </a>
                </td>
                <td className="text-sm">{c.model_label}</td>
                <td><span className="text-xs text-gray-500">{c.intent_type}</span></td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CITATION_COLORS[c.citation_type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {c.citation_type}
                  </span>
                </td>
                <td className="text-sm text-gray-600">{c.recommended_brand || '—'}</td>
                <td className="text-sm text-gray-500 max-w-xs truncate" title={c.query_text}>{c.query_text}</td>
                <td className="text-xs text-gray-400">{c.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs">← Prev</button>
          <span className="text-sm text-gray-500">Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length} className="btn-secondary text-xs">Next →</button>
        </div>
      )}
    </div>
  );
}
