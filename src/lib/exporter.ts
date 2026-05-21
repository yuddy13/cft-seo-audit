import * as XLSX from 'xlsx';
import { sanitizeCell } from './extractor';

export interface RawRow {
  queryNum: number;
  queryText: string;
  intentType: string;
  model: string;
  citedDomain: string;
  fullUrl: string;
  citationType: string;
  recommendedBrand: string;
  rawResponse: string;
  timestamp: string;
}

export interface FrequencyRow {
  domain: string;
  chatgpt: number;
  gemini: number;
  perplexity: number;
  total: number;
  intentTypes: string;
}

export interface ComparisonRow {
  domain: string;
  trustCategory: string;
  modelsCiting: string;
  totalCitations: number;
  intentTypes: string;
}

export function buildWorkbook(
  nicheName: string,
  rawRows: RawRow[],
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // --- Tab 1: Raw Data ---
  const rawData = [
    ['Query #', 'Query Text', 'Intent Type', 'Model', 'Cited Domain', 'Full URL',
     'Citation Type', 'Recommended Brand', 'Raw Response', 'Timestamp'],
    ...rawRows.map((r) => [
      r.queryNum, sanitizeCell(r.queryText), sanitizeCell(r.intentType),
      sanitizeCell(r.model), sanitizeCell(r.citedDomain), sanitizeCell(r.fullUrl),
      sanitizeCell(r.citationType), sanitizeCell(r.recommendedBrand),
      sanitizeCell(r.rawResponse.slice(0, 500)), sanitizeCell(r.timestamp),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rawData), 'Raw Data');

  // --- Tab 2: Publisher Frequency ---
  const freqMap = new Map<string, { chatgpt: number; gemini: number; perplexity: number; intents: Set<string> }>();
  for (const row of rawRows) {
    if (!row.citedDomain) continue;
    const d = row.citedDomain.toLowerCase();
    if (!freqMap.has(d)) freqMap.set(d, { chatgpt: 0, gemini: 0, perplexity: 0, intents: new Set() });
    const entry = freqMap.get(d)!;
    const model = row.model.toLowerCase();
    if (model.includes('chatgpt') || model.includes('gpt')) entry.chatgpt++;
    else if (model.includes('gemini')) entry.gemini++;
    else if (model.includes('perplexity')) entry.perplexity++;
    entry.intents.add(row.intentType);
  }
  const freqRows = Array.from(freqMap.entries())
    .map(([domain, v]) => ({
      domain,
      chatgpt: v.chatgpt,
      gemini: v.gemini,
      perplexity: v.perplexity,
      total: v.chatgpt + v.gemini + v.perplexity,
      intentTypes: Array.from(v.intents).join(', '),
    }))
    .sort((a, b) => b.total - a.total);

  const freqData = [
    ['Publisher Domain', 'ChatGPT Citations', 'Gemini Citations', 'Perplexity Citations', 'Total', 'Intent Types'],
    ...freqRows.map((r) => [
      sanitizeCell(r.domain), r.chatgpt, r.gemini, r.perplexity, r.total, sanitizeCell(r.intentTypes),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(freqData), 'Publisher Frequency');

  // --- Tab 3: Model Comparison ---
  const compRows: ComparisonRow[] = freqRows.map((r) => {
    const models: string[] = [];
    if (r.chatgpt > 0) models.push('ChatGPT');
    if (r.gemini > 0) models.push('Gemini');
    if (r.perplexity > 0) models.push('Perplexity');
    const trustCategory =
      models.length === 3 ? 'Universal Trust' :
      models.length === 2 ? 'Dual Trust' : 'Single Model';
    return {
      domain: r.domain,
      trustCategory,
      modelsCiting: models.join(', '),
      totalCitations: r.total,
      intentTypes: r.intentTypes,
    };
  }).sort((a, b) => b.totalCitations - a.totalCitations);

  const compData = [
    ['Publisher Domain', 'Trust Category', 'Models Citing', 'Total Citations', 'Primary Intent Types'],
    ...compRows.map((r) => [
      sanitizeCell(r.domain), sanitizeCell(r.trustCategory),
      sanitizeCell(r.modelsCiting), r.totalCitations, sanitizeCell(r.intentTypes),
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(compData), 'Model Comparison');

  // --- Tab 4: Action Summary ---
  const actionData = [
    ['Publisher Domain', 'Total Citations', 'Models', 'Recommended Action', 'Notes'],
    ...freqRows.slice(0, 50).map((r) => {
      const models: string[] = [];
      if (r.chatgpt > 0) models.push('ChatGPT');
      if (r.gemini > 0) models.push('Gemini');
      if (r.perplexity > 0) models.push('Perplexity');
      return [sanitizeCell(r.domain), r.total, sanitizeCell(models.join(', ')), '', ''];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actionData), 'Action Summary');

  return wb;
}

export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
