export type Niche = { id:string; name:string; slug:string; description:string; competitors:string[]; createdAt:string };
export type Query = { id:string; nicheId:string; nicheName:string; category:string; prompt:string; enabled:boolean; createdAt:string };
export type Citation = { id:string; runId:string; nicheName:string; prompt:string; model:string; domain:string; url:string; title:string; mentioned:boolean; sentiment:'Positive'|'Neutral'|'Negative'; answer:string; createdAt:string };
export type Run = { id:string; name:string; nicheIds:string[]; models:string[]; type:'Pilot'|'Full'; status:'Draft'|'Running'|'Complete'|'Failed'|'Paused'; progress:number; total:number; completed:number; createdAt:string; error?:string };
export type Settings = { apiKey:string; models:string[]; brandName:string; projectName:string };

type Store = { niches:Niche[]; queries:Query[]; runs:Run[]; citations:Citation[]; settings:Settings };
const KEY='cft-source-map-v3';
export const DEFAULT_MODELS = ['openai/gpt-4o-mini','anthropic/claude-3.5-haiku','google/gemini-flash-1.5'];
export const PRESET_NICHES = ['iGaming / Casino','Crypto','SaaS','Legal','Finance','Local SEO','Ecommerce','Agencies','Health','Travel'];

const base:Store={niches:[],queries:[],runs:[],citations:[],settings:{apiKey:'',models:DEFAULT_MODELS,brandName:'Your Brand',projectName:'CFT Source Map Project'}};
export function uid(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4)}
export function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'niche'}
export function loadStore():Store{ if(typeof window==='undefined') return base; try{ const raw=localStorage.getItem(KEY); if(!raw) return {...base}; const parsed=JSON.parse(raw); return { ...base, ...parsed, settings:{...base.settings,...(parsed.settings||{})}, niches: parsed.niches||[], queries: parsed.queries||[], runs: parsed.runs||[], citations: parsed.citations||[]}; }catch{return {...base}} }
export function saveStore(store:Store){ if(typeof window!=='undefined') localStorage.setItem(KEY, JSON.stringify(store)); }
export function updateStore(mutator:(s:Store)=>Store|void){ const s=loadStore(); const next=mutator(s) || s; saveStore(next); window.dispatchEvent(new Event('cft-store')); return next; }
export function useStoreEvent(cb:()=>void){ if(typeof window==='undefined') return ()=>{}; window.addEventListener('cft-store', cb); window.addEventListener('storage', cb); return ()=>{window.removeEventListener('cft-store', cb); window.removeEventListener('storage', cb)}}

const commercial = ['best {niche} platforms','top {niche} services','trusted {niche} providers','recommended {niche} sites','most reliable {niche} companies','high authority {niche} resources','best {niche} tools for beginners'];
const comparison = ['{niche} alternatives','best {niche} brands compared','{niche} providers vs agencies','which {niche} platform is best','affordable {niche} solutions','premium {niche} options'];
const informational = ['how to choose a {niche} provider','what makes a good {niche} source','{niche} checklist for buyers','common {niche} mistakes','how experts evaluate {niche}','{niche} strategy guide'];
const transactional = ['where to buy {niche} services','{niche} service with fast delivery','book a {niche} consultation','hire {niche} experts','{niche} service pricing','done for you {niche} service'];
function fill(arr:string[], niche:string, cat:string, nicheId:string){return arr.map(prompt=>({id:uid(),nicheId,nicheName:niche,category:cat,prompt:prompt.replaceAll('{niche}',niche),enabled:true,createdAt:new Date().toISOString()} as Query))}
export function generateSopQueries(niche:Niche):Query[]{ return [...fill(commercial,niche.name,'Commercial Intent',niche.id),...fill(comparison,niche.name,'Comparison Intent',niche.id),...fill(informational,niche.name,'Informational Intent',niche.id),...fill(transactional,niche.name,'Transactional Intent',niche.id)].slice(0,25); }
export function extractUrls(text:string){ const urls = Array.from(text.matchAll(/https?:\/\/[^\s)\]"'<>]+/gi)).map(m=>m[0].replace(/[.,;]+$/,'')); return Array.from(new Set(urls)); }
export function domainFromUrl(url:string){ try{return new URL(url).hostname.replace(/^www\./,'')}catch{return 'unknown-source'} }
export function fakeCitations(prompt:string, model:string, niche:string):Citation[]{ const domains=['reddit.com','quora.com','forbes.com','searchenginejournal.com','ahrefs.com','semrush.com','linkedin.com','medium.com']; return domains.slice(0,3).map((d,i)=>({id:uid(),runId:'',nicheName:niche,prompt,model,domain:d,url:`https://${d}/search?q=${encodeURIComponent(prompt)}`,title:`${prompt} source ${i+1}`,mentioned:i===0,sentiment:i===0?'Positive':'Neutral',answer:'Fallback citation created when the model response had no direct URLs.',createdAt:new Date().toISOString()})); }
