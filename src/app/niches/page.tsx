'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, RefreshCw } from 'lucide-react';

interface Niche { id: number; name: string; slug: string; enabled: number; }

export default function NichesPage() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/niches').then((r) => r.json()) as Niche[];
    setNiches(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!newName.trim()) return;
    await fetch('/api/niches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    setNewName('');
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this niche and all its queries/results?')) return;
    await fetch('/api/niches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function toggle(id: number, enabled: number) {
    await fetch('/api/niches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    load();
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return;
    await fetch('/api/niches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, name: editName }),
    });
    setEditId(null);
    load();
  }

  async function genQueries(nicheId: number) {
    await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche_id: nicheId }),
    });
    alert('Queries generated — view them in the Queries tab.');
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Niches</h1>
        <p className="text-sm text-gray-500">Manage the niches for your research runs.</p>
      </div>

      {/* Add */}
      <div className="stat-card">
        <h2 className="font-semibold text-gray-800 mb-3">Add Niche</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Fintech, HR Tech, Gaming…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="flex-1"
          />
          <button onClick={add} className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="stat-card p-0 overflow-hidden">
        <table className="table-auto">
          <thead>
            <tr>
              <th>Niche</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-gray-400 py-8">Loading…</td></tr>
            ) : niches.map((n) => (
              <tr key={n.id}>
                <td>
                  {editId === n.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-40"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <span className="font-medium text-gray-800">{n.name}</span>
                  )}
                </td>
                <td className="text-gray-500 font-mono text-xs">{n.slug}</td>
                <td>
                  <button
                    onClick={() => toggle(n.id, n.enabled)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer
                      ${n.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {n.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditId(n.id); setEditName(n.name); }}
                      className="text-gray-400 hover:text-blue-600" title="Rename"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => genQueries(n.id)}
                      className="text-gray-400 hover:text-green-600" title="Generate queries"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="text-gray-400 hover:text-red-600" title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
