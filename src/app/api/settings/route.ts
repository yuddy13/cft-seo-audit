import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { DEFAULT_MODELS } from '@/lib/openrouter';

function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export async function GET() {
  try {
    const raw = getSetting('openrouter_key_enc');
    const hasKey = !!raw;
    const temp = getSetting('temperature') ?? '0.1';
    const maxTokens = getSetting('max_tokens') ?? '4000';
    const modelsRaw = getSetting('models');
    const models = modelsRaw ? JSON.parse(modelsRaw) : DEFAULT_MODELS;
    return NextResponse.json({ hasKey, temperature: parseFloat(temp), maxTokens: parseInt(maxTokens), models });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      openrouterKey?: string;
      temperature?: number;
      maxTokens?: number;
      models?: unknown;
    };
    if (body.openrouterKey !== undefined) {
      if (body.openrouterKey === '') {
        getDb().prepare('DELETE FROM settings WHERE key = ?').run('openrouter_key_enc');
      } else {
        setSetting('openrouter_key_enc', encrypt(body.openrouterKey));
      }
    }
    if (body.temperature !== undefined) setSetting('temperature', String(body.temperature));
    if (body.maxTokens !== undefined) setSetting('max_tokens', String(body.maxTokens));
    if (body.models !== undefined) setSetting('models', JSON.stringify(body.models));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

