import { NextRequest, NextResponse } from 'next/server';
import { setPause } from '@/lib/run-state';

export async function POST(req: NextRequest) {
  try {
    const { run_id, paused } = await req.json() as { run_id: number; paused: boolean };
    setPause(run_id, paused);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
