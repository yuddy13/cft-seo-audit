import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const warnings: Array<{ severity: 'error' | 'warn'; category: string; message: string; detail?: string }> = [];

    // Niches with fewer than 50 unique domains
    const nicheDomains = db.prepare(`
      SELECT n.name, COUNT(DISTINCT c.root_domain) as domains
      FROM niches n LEFT JOIN citations c ON c.niche_id = n.id
      GROUP BY n.id
    `).all() as Array<{ name: string; domains: number }>;
    for (const row of nicheDomains) {
      if (row.domains < 50 && row.domains > 0) {
        warnings.push({ severity: 'warn', category: 'Coverage', message: `${row.name}: only ${row.domains} unique domains (need 50+)` });
      }
    }

    // Queries with no citations
    const emptyQueries = db.prepare(`
      SELECT rr.query_text, n.name as niche, rr.model_label
      FROM run_results rr
      JOIN niches n ON n.id = rr.niche_id
      WHERE rr.status = 'done'
        AND NOT EXISTS (SELECT 1 FROM citations c WHERE c.result_id = rr.id)
      LIMIT 20
    `).all() as Array<{ query_text: string; niche: string; model_label: string }>;
    for (const q of emptyQueries) {
      warnings.push({ severity: 'warn', category: 'Empty Response', message: `No citations: "${q.query_text.slice(0, 60)}" via ${q.model_label} (${q.niche})` });
    }

    // Failed calls
    const failedCalls = (db.prepare("SELECT COUNT(*) as c FROM run_results WHERE status = 'failed'").get() as { c: number }).c;
    if (failedCalls > 0) {
      warnings.push({ severity: 'error', category: 'Failed Calls', message: `${failedCalls} API calls failed`, detail: 'Check run results for error messages' });
    }

    // Duplicate domains per niche (same domain, same query, same model)
    const dupes = db.prepare(`
      SELECT root_domain, query_text, model_label, COUNT(*) as cnt
      FROM citations
      GROUP BY root_domain, query_text, model_label
      HAVING cnt > 1
      LIMIT 10
    `).all() as Array<{ root_domain: string; cnt: number }>;
    if (dupes.length > 0) {
      warnings.push({ severity: 'warn', category: 'Duplicates', message: `${dupes.length} duplicate domain/query/model combinations found` });
    }

    // Models with thin responses
    const thinModels = db.prepare(`
      SELECT rr.model_label, COUNT(*) as thin
      FROM run_results rr
      WHERE rr.status = 'done'
        AND (SELECT COUNT(*) FROM citations c WHERE c.result_id = rr.id) < 2
      GROUP BY rr.model_label
      HAVING thin > 5
    `).all() as Array<{ model_label: string; thin: number }>;
    for (const m of thinModels) {
      warnings.push({ severity: 'warn', category: 'Thin Responses', message: `${m.model_label} returned < 2 citations in ${m.thin} calls` });
    }

    const stats = {
      totalWarnings: warnings.length,
      errors: warnings.filter((w) => w.severity === 'error').length,
      warns: warnings.filter((w) => w.severity === 'warn').length,
    };

    return NextResponse.json({ warnings, stats });
  } catch (e) {
    console.error('GET /api/qa:', e);
    return NextResponse.json({ warnings: [], stats: { totalWarnings: 0, errors: 0, warns: 0 } });
  }
}
