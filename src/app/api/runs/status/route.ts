import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get('run_id');
    const db = getDb();
    if (runId) {
      const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
      if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const recentResults = db.prepare(`
        SELECT rr.*, n.name as niche_name
        FROM run_results rr
        JOIN niches n ON n.id = rr.niche_id
        WHERE rr.run_id = ?
        ORDER BY rr.id DESC LIMIT 20
      `).all(runId);
      return NextResponse.json({ run, recentResults });
    }
    const runs = db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT 10').all();
    return NextResponse.json(runs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
