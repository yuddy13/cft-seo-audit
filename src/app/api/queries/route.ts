import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateQueries } from '@/lib/query-generator';

export async function GET(req: NextRequest) {
  try {
    const nicheId = req.nextUrl.searchParams.get('niche_id');
    const db = getDb();
    const q = nicheId
      ? db.prepare('SELECT * FROM queries WHERE niche_id = ? ORDER BY query_num').all(nicheId)
      : db.prepare('SELECT * FROM queries ORDER BY niche_id, query_num').all();
    return NextResponse.json(q);
  } catch (e) {
    console.error('GET /api/queries:', e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { niche_id, regenerate } = await req.json() as { niche_id: number; regenerate?: boolean };
    const db = getDb();
    const niche = db.prepare('SELECT * FROM niches WHERE id = ?').get(niche_id) as {
      id: number; name: string; slug: string;
    } | undefined;
    if (!niche) return NextResponse.json({ error: 'Niche not found' }, { status: 404 });

    if (regenerate) {
      db.prepare('DELETE FROM queries WHERE niche_id = ?').run(niche_id);
    }

    const existing = (db.prepare('SELECT COUNT(*) as c FROM queries WHERE niche_id = ?').get(niche_id) as { c: number }).c;
    if (existing > 0 && !regenerate) {
      return NextResponse.json(db.prepare('SELECT * FROM queries WHERE niche_id = ? ORDER BY query_num').all(niche_id));
    }

    const queries = generateQueries(niche.slug, niche.name);
    const insert = db.prepare('INSERT INTO queries (niche_id, query_num, query_text, intent_type) VALUES (?, ?, ?, ?)');
    const insertAll = db.transaction(() => {
      for (const q of queries) insert.run(niche_id, q.query_num, q.query_text, q.intent_type);
    });
    insertAll();

    return NextResponse.json(db.prepare('SELECT * FROM queries WHERE niche_id = ? ORDER BY query_num').all(niche_id));
  } catch (e) {
    console.error('POST /api/queries:', e);
    return NextResponse.json([]);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, query_text } = await req.json() as { id: number; query_text: string };
    getDb().prepare('UPDATE queries SET query_text = ?, edited = 1 WHERE id = ?').run(query_text, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
