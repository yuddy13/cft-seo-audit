import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY || body.apiKey;
    if (!apiKey) return NextResponse.json({ error: 'Missing OpenRouter API key' }, { status: 400 });
    const model = body.model || 'openai/gpt-4o-mini';
    const prompt = body.prompt || '';
    const brand = body.brandName || 'the target brand';
    const niche = body.nicheName || 'the niche';
    const system = `You are an SEO citation research assistant for Charles Floate Training. Return concise research on sources AI models cite for a niche. Include useful source URLs where possible. Focus on citation opportunities, communities, review pages, guides, forums, and domains that could influence AI visibility.`;
    const user = `Niche: ${niche}\nTarget brand/project: ${brand}\nResearch prompt: ${prompt}\n\nFind likely citation sources and opportunities. Include URLs when you can. Output short bullets.`;

    const started = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://charlesfloatetraining.com',
        'X-Title': 'CFT Source Map Builder'
      },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.2, max_tokens: 900 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || data?.error || 'OpenRouter request failed', raw: data }, { status: res.status });
    const answer = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ answer, usage: data?.usage || {}, model, ms: Date.now()-started });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
