'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Brain, Database, Download, KeyRound, Library, PlayCircle, Settings } from 'lucide-react';

const main = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/runs', label: 'Research Runs', icon: PlayCircle },
  { href: '/niches', label: 'Research Niches', icon: Database },
  { href: '/queries', label: 'Prompt Library', icon: Library },
  { href: '/results', label: 'Citation Intelligence', icon: Brain },
  { href: '/exports', label: 'Exports', icon: Download },
];
const settings = [
  { href: '/settings', label: 'API Configuration', icon: KeyRound },
  { href: '/project', label: 'Project Settings', icon: Settings },
];

export default function Sidebar(){
  const path = usePathname();
  const Nav = ({items}:{items: typeof main}) => <>{items.map((item)=>{ const Icon=item.icon; const active = path===item.href || path.startsWith(item.href + '/'); return <Link key={item.href} href={item.href} className={`nav-link ${active?'active':''}`}><Icon size={18}/><span>{item.label}</span></Link>})}</>;
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">CFT</div><div><div className="brand-title">Source Map Builder</div><div className="brand-sub">Charles Floate Training</div></div></div>
    <div className="nav-section">Research Workflow</div><Nav items={main}/>
    <div className="nav-section">Settings</div><Nav items={settings}/>
    <div className="sidebar-footer"><strong>CFT Methodology Tool</strong><br/>Niche → prompts → AI research → citation sources → export.</div>
  </aside>
}
