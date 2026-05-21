import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const niches = db.prepare('SELECT * FROM niches ORDER BY id').all();
    return NextResponse.json(niches);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const db = getDb();
    const result = db.prepare('INSERT INTO niches (name, slug) VALUES (?, ?)').run(name.trim(), slug);
    return NextResponse.json({ id: result.lastInsertRowid, name: name.trim(), slug, enabled: 1 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Niche already exists' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name, enabled } = await req.json() as { id: number; name?: string; enabled?: boolean };
    const db = getDb();
    if (name !== undefined) db.prepare('UPDATE niches SET name = ? WHERE id = ?').run(name, id);
    if (enabled !== undefined) db.prepare('UPDATE niches SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: number };
    getDb().prepare('DELETE FROM niches WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
