import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const totalRuns = (db.prepare('SELECT COUNT(*) as c FROM runs').get() as { c: number }).c;
    const totalCitations = (db.prepare('SELECT COUNT(*) as c FROM citations').get() as { c: number }).c;
    const totalDomains = (db.prepare('SELECT COUNT(DISTINCT root_domain) as c FROM citations').get() as { c: number }).c;
    const totalSpend = (db.prepare('SELECT SUM(spend_usd) as s FROM runs').get() as { s: number | null }).s ?? 0;

    // Citations by model
    const byModel = db.prepare(`
      SELECT model_label, COUNT(*) as cnt FROM citations GROUP BY model_label
    `).all() as Array<{ model_label: string; cnt: number }>;

    // Top domains overall
    const topDomains = db.prepare(`
      SELECT root_domain, COUNT(*) as total FROM citations
      GROUP BY root_domain ORDER BY total DESC LIMIT 20
    `).all() as Array<{ root_domain: string; total: number }>;

    // Citations by niche
    const byNiche = db.prepare(`
      SELECT n.name, COUNT(c.id) as citations, COUNT(DISTINCT c.root_domain) as domains
      FROM citations c JOIN niches n ON n.id = c.niche_id
      GROUP BY c.niche_id ORDER BY citations DESC
    `).all() as Array<{ name: string; citations: number; domains: number }>;

    // Heatmap: niche × model
    const heatmap = db.prepare(`
      SELECT n.name as niche, c.model_label as model, COUNT(*) as cnt
      FROM citations c JOIN niches n ON n.id = c.niche_id
      GROUP BY c.niche_id, c.model_label
    `).all() as Array<{ niche: string; model: string; cnt: number }>;

    // Recent runs
    const recentRuns = db.prepare(`
      SELECT * FROM runs ORDER BY created_at DESC LIMIT 5
    `).all();

    // Cost over time (by day)
    const costOverTime = db.prepare(`
      SELECT date(created_at) as day, SUM(spend_usd) as spend
      FROM runs WHERE spend_usd > 0
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all();

    return NextResponse.json({
      totalRuns, totalCitations, totalDomains, totalSpend,
      byModel, topDomains, byNiche, heatmap, recentRuns, costOverTime,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
