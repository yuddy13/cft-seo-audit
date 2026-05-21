import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildWorkbook, workbookToBuffer, RawRow } from '@/lib/exporter';

export async function GET(req: NextRequest) {
  try {
    const nicheId = req.nextUrl.searchParams.get('niche_id');
    const runId = req.nextUrl.searchParams.get('run_id');
    const fmt = req.nextUrl.searchParams.get('format') ?? 'xlsx';

    if (!nicheId) return NextResponse.json({ error: 'niche_id required' }, { status: 400 });
    const db = getDb();

    const niche = db.prepare('SELECT * FROM niches WHERE id = ?').get(nicheId) as { name: string } | undefined;
    if (!niche) return NextResponse.json({ error: 'Niche not found' }, { status: 404 });

    let query = `
      SELECT c.*, rr.raw_response, rr.finished_at as timestamp
      FROM citations c
      JOIN run_results rr ON rr.id = c.result_id
      WHERE c.niche_id = ?
    `;
    const params: unknown[] = [nicheId];
    if (runId) { query += ' AND c.run_id = ?'; params.push(runId); }

    const rows = db.prepare(query).all(...params) as Array<{
      query_num: number; query_text: string; intent_type: string; model_label: string;
      root_domain: string; full_url: string; citation_type: string; recommended_brand: string;
      raw_response: string; timestamp: string;
    }>;

    if (fmt === 'csv') {
      const header = 'Query #,Query Text,Intent Type,Model,Cited Domain,Full URL,Citation Type,Recommended Brand,Timestamp\n';
      const body = rows.map((r) =>
        [r.query_num, `"${r.query_text}"`, r.intent_type, r.model_label,
         r.root_domain, r.full_url ?? '', r.citation_type, r.recommended_brand ?? '', r.timestamp]
        .join(',')
      ).join('\n');
      return new NextResponse(header + body, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${niche.name}-citations.csv"`,
        },
      });
    }

    const rawRows: RawRow[] = rows.map((r) => ({
      queryNum: r.query_num,
      queryText: r.query_text,
      intentType: r.intent_type,
      model: r.model_label,
      citedDomain: r.root_domain,
      fullUrl: r.full_url ?? '',
      citationType: r.citation_type,
      recommendedBrand: r.recommended_brand ?? '',
      rawResponse: r.raw_response ?? '',
      timestamp: r.timestamp ?? '',
    }));

    const wb = buildWorkbook(niche.name, rawRows);
    const buf = workbookToBuffer(wb);

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${niche.name}-source-map.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
