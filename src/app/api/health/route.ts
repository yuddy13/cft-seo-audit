import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){
  const { apiKey } = await req.json().catch(()=>({}));
  const key = process.env.OPENROUTER_API_KEY || apiKey;
  if(!key) return NextResponse.json({ok:false,error:'Missing API key'},{status:400});
  try{
    const res = await fetch('https://openrouter.ai/api/v1/models',{headers:{Authorization:`Bearer ${key}`}});
    if(!res.ok) return NextResponse.json({ok:false,error:'API key could not access OpenRouter'},{status:res.status});
    return NextResponse.json({ok:true});
  }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'Validation failed'},{status:500})}
}
