import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const totals = db.prepare(`
      SELECT
        SUM(total_calls) as total_calls,
        SUM(done_calls) as done_calls,
        SUM(failed_calls) as failed_calls,
        SUM(retried_calls) as retried_calls,
        SUM(tokens_in) as tokens_in,
        SUM(tokens_out) as tokens_out,
        SUM(spend_usd) as spend_usd
      FROM runs
    `).get() as {
      total_calls: number; done_calls: number; failed_calls: number; retried_calls: number;
      tokens_in: number; tokens_out: number; spend_usd: number;
    };

    const byModel = db.prepare(`
      SELECT model_label,
        COUNT(*) as calls,
        SUM(prompt_tokens) as tokens_in,
        SUM(completion_tokens) as tokens_out,
        SUM(spend_usd) as spend_usd
      FROM run_results
      GROUP BY model_label ORDER BY spend_usd DESC
    `).all() as Array<{ model_label: string; calls: number; tokens_in: number; tokens_out: number; spend_usd: number }>;

    const byNiche = db.prepare(`
      SELECT n.name,
        COUNT(rr.id) as calls,
        SUM(rr.spend_usd) as spend_usd
      FROM run_results rr
      JOIN niches n ON n.id = rr.niche_id
      GROUP BY rr.niche_id ORDER BY spend_usd DESC
    `).all() as Array<{ name: string; calls: number; spend_usd: number }>;

    const avgCostPerCall = totals.done_calls > 0
      ? totals.spend_usd / totals.done_calls
      : 0;

    return NextResponse.json({ totals, byModel, byNiche, avgCostPerCall });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
