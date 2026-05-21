import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const runs = db.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM run_results rr WHERE rr.run_id = r.id) as result_count
      FROM runs r ORDER BY r.created_at DESC
    `).all();
    return NextResponse.json(runs);
  } catch (e) {
    console.error('GET /api/runs:', e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, niche_ids, is_pilot } = await req.json() as {
      name: string;
      niche_ids: number[];
      is_pilot?: boolean;
    };
    if (!name || !niche_ids?.length) {
      return NextResponse.json({ error: 'name and niche_ids required' }, { status: 400 });
    }
    const db = getDb();

    // Count total calls: niches × queries × models
    const settings = db.prepare('SELECT value FROM settings WHERE key = ?');
    const modelsRaw = (settings.get('models') as { value: string } | undefined)?.value;
    const models = modelsRaw ? JSON.parse(modelsRaw) : [{ id: 'openai/gpt-4o' }, { id: 'google/gemini-2.0-flash-001' }, { id: 'perplexity/sonar-pro' }];

    let totalCalls = 0;
    for (const nicheId of niche_ids) {
      const qCount = (db.prepare('SELECT COUNT(*) as c FROM queries WHERE niche_id = ?').get(nicheId) as { c: number }).c;
      totalCalls += qCount * models.length;
    }

    const result = db.prepare(`
      INSERT INTO runs (name, niche_ids, is_pilot, total_calls, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(name, JSON.stringify(niche_ids), is_pilot ? 1 : 0, totalCalls);

    return NextResponse.json({ id: result.lastInsertRowid, name, niche_ids, is_pilot, total_calls: totalCalls, status: 'pending' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
