'use client';

import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, Plus, Trash2, CheckCircle } from 'lucide-react';

interface Model { id: string; label: string; promptTokenCost: number; completionTokenCost: number; }
interface Settings { hasKey: boolean; temperature: number; maxTokens: number; models: Model[]; }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [temp, setTemp] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(4000);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Settings) => {
        setSettings(d);
        setModels(d.models);
        setTemp(d.temperature);
        setMaxTokens(d.maxTokens);
      });
  }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = { temperature: temp, maxTokens, models };
    if (apiKey) body.openrouterKey = apiKey;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaved(true);
    setApiKey('');
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
    const fresh = await fetch('/api/settings').then((r) => r.json()) as Settings;
    setSettings(fresh);
  }

  function updateModel(idx: number, field: keyof Model, val: string | number) {
    setModels((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  }

  function addModel() {
    setModels((prev) => [...prev, { id: '', label: 'New Model', promptTokenCost: 0.001, completionTokenCost: 0.002 }]);
  }

  function removeModel(idx: number) {
    setModels((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="page-title">API Settings</h1>
        <p className="text-sm text-gray-500">Configure your OpenRouter key and model preferences.</p>
      </div>

      {/* API Key */}
      <section className="stat-card space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800">OpenRouter API Key</h2>
          {settings?.hasKey && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Keys are AES-256-GCM encrypted at rest. Never exposed in logs or frontend responses.
        </p>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={settings?.hasKey ? '••••••••••••• (key saved — enter new to replace)' : 'sk-or-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
            autoComplete="off"
          />
          <button
            type="button"
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Get your OpenRouter API key →
        </a>
      </section>

      {/* Model Defaults */}
      <section className="stat-card space-y-4">
        <h2 className="font-semibold text-gray-800">Default Parameters</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
            <input type="number" min={0} max={2} step={0.05} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
            <input type="number" min={500} max={8000} step={100} value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} />
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="stat-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Models</h2>
          <button onClick={addModel} className="btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Model
          </button>
        </div>
        <div className="space-y-3">
          {models.map((m, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Model {i + 1}</span>
                <button onClick={() => removeModel(i)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                  <input type="text" value={m.label} onChange={(e) => updateModel(i, 'label', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Model ID</label>
                  <input type="text" value={m.id} onChange={(e) => updateModel(i, 'id', e.target.value)} placeholder="openai/gpt-4o" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prompt cost ($/1k tok)</label>
                  <input type="number" step={0.0001} value={m.promptTokenCost} onChange={(e) => updateModel(i, 'promptTokenCost', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Completion cost ($/1k tok)</label>
                  <input type="number" step={0.0001} value={m.completionTokenCost} onChange={(e) => updateModel(i, 'completionTokenCost', parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}</>}
      </button>
    </div>
  );
}
