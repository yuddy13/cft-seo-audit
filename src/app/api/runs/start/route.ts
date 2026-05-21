import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDecryptedKey } from '@/lib/settings';
import { callOpenRouter, DEFAULT_MODELS, OpenRouterError } from '@/lib/openrouter';
import { extractCitations } from '@/lib/extractor';
import { buildPrompt, buildFallbackPrompt } from '@/lib/query-generator';
import { isPaused, clearPause } from '@/lib/run-state';

const MIN_CITATION_COUNT = 2;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_DELAY = 1000;

export async function POST(req: NextRequest) {
  const { run_id } = await req.json() as { run_id: number };
  if (!run_id) return NextResponse.json({ error: 'run_id required' }, { status: 400 });

  const db = getDb();
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(run_id) as {
    id: number; status: string; niche_ids: string;
  } | undefined;
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (run.status === 'running') return NextResponse.json({ error: 'Already running' }, { status: 409 });

  let apiKey: string;
  try {
    apiKey = getDecryptedKey();
  } catch {
    return NextResponse.json({ error: 'No API key configured' }, { status: 400 });
  }

  const modelsRaw = (db.prepare('SELECT value FROM settings WHERE key = ?').get('models') as { value: string } | undefined)?.value;
  const models = modelsRaw ? JSON.parse(modelsRaw) : DEFAULT_MODELS;
  const temp = parseFloat((db.prepare('SELECT value FROM settings WHERE key = ?').get('temperature') as { value: string } | undefined)?.value ?? '0.1');
  const maxTok = parseInt((db.prepare('SELECT value FROM settings WHERE key = ?').get('max_tokens') as { value: string } | undefined)?.value ?? '4000');

  db.prepare("UPDATE runs SET status = 'running', started_at = datetime('now') WHERE id = ?").run(run_id);
  clearPause(run_id);

  // Run async — respond immediately, process in background
  void processRun(run_id, JSON.parse(run.niche_ids), models, apiKey, temp, maxTok);

  return NextResponse.json({ ok: true, message: 'Run started' });
}

async function processRun(
  runId: number,
  nicheIds: number[],
  models: Array<{ id: string; label: string }>,
  apiKey: string,
  temp: number,
  maxTok: number,
) {
  const db = getDb();
  try {
    for (const nicheId of nicheIds) {
      const niche = db.prepare('SELECT * FROM niches WHERE id = ?').get(nicheId) as { id: number; name: string } | undefined;
      if (!niche) continue;

      const queries = db.prepare('SELECT * FROM queries WHERE niche_id = ? ORDER BY query_num').all(nicheId) as Array<{
        id: number; query_num: number; query_text: string; intent_type: string;
      }>;

      for (const query of queries) {
        for (const model of models) {
          if (isPaused(runId)) {
            db.prepare("UPDATE runs SET status = 'paused' WHERE id = ?").run(runId);
            return;
          }

          const resultId = (db.prepare(`
            INSERT INTO run_results (run_id, niche_id, query_id, query_text, intent_type, model_id, model_label, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'running')
          `).run(runId, nicheId, query.id, query.query_text, query.intent_type, model.id, model.label)).lastInsertRowid as number;

          let success = false;
          let lastError = '';
          let attempt = 0;

          while (!success && attempt < MAX_ATTEMPTS) {
            attempt++;
            const prompt = attempt === 1
              ? buildPrompt(query.query_text)
              : buildFallbackPrompt(query.query_text, attempt);

            try {
              await delay(RATE_LIMIT_DELAY);
              const resp = await callOpenRouter(apiKey, model.id, prompt, temp, maxTok);
              const citations = extractCitations(resp.rawText);

              // Use fallback if too few citations
              if (citations.length < MIN_CITATION_COUNT && attempt < MAX_ATTEMPTS) {
                lastError = `thin_response_attempt_${attempt}`;
                db.prepare('UPDATE runs SET retried_calls = retried_calls + 1 WHERE id = ?').run(runId);
                continue;
              }

              db.prepare(`
                UPDATE run_results SET status = 'done', raw_response = ?, prompt_tokens = ?,
                  completion_tokens = ?, spend_usd = ?, attempt = ?, finished_at = datetime('now')
                WHERE id = ?
              `).run(resp.rawText, resp.promptTokens, resp.completionTokens, resp.spendUsd, attempt, resultId);

              db.prepare(`
                UPDATE runs SET done_calls = done_calls + 1, tokens_in = tokens_in + ?,
                  tokens_out = tokens_out + ?, spend_usd = spend_usd + ? WHERE id = ?
              `).run(resp.promptTokens, resp.completionTokens, resp.spendUsd, runId);

              // Insert citations
              const insC = db.prepare(`
                INSERT INTO citations (result_id, run_id, niche_id, query_text, query_num, intent_type,
                  model_label, full_url, root_domain, citation_type, recommended_brand)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              const insAll = db.transaction(() => {
                for (const c of citations) {
                  insC.run(resultId, runId, nicheId, query.query_text, query.query_num,
                    query.intent_type, model.label, c.fullUrl, c.rootDomain,
                    c.citationType, c.recommendedBrand);
                }
              });
              insAll();
              success = true;
            } catch (e) {
              lastError = e instanceof OpenRouterError
                ? `HTTP ${e.status}: ${e.body.slice(0, 100)}`
                : String(e);
              if (e instanceof OpenRouterError && e.status === 429) {
                await delay(5000 * attempt); // back off on rate limit
              } else if (e instanceof OpenRouterError && e.status >= 500) {
                await delay(3000 * attempt);
              }
            }
          }

          if (!success) {
            db.prepare(`
              UPDATE run_results SET status = 'failed', error_msg = ?, finished_at = datetime('now') WHERE id = ?
            `).run(lastError, resultId);
            db.prepare('UPDATE runs SET failed_calls = failed_calls + 1 WHERE id = ?').run(runId);
          }
        }
      }
    }

    db.prepare("UPDATE runs SET status = 'done', finished_at = datetime('now') WHERE id = ?").run(runId);
  } catch (e) {
    db.prepare("UPDATE runs SET status = 'failed', finished_at = datetime('now') WHERE id = ?").run(runId);
    console.error('Run failed:', e);
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
