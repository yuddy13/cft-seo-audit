import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const nicheId = req.nextUrl.searchParams.get('niche_id');
    const runId = req.nextUrl.searchParams.get('run_id');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '2000');
    const db = getDb();

    let sql = 'SELECT * FROM citations WHERE 1=1';
    const params: unknown[] = [];
    if (nicheId) { sql += ' AND niche_id = ?'; params.push(nicheId); }
    if (runId) { sql += ' AND run_id = ?'; params.push(runId); }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/citations:', e);
    return NextResponse.json([]);
  }
}
