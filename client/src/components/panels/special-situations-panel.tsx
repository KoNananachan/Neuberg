import { useState } from 'react';
import { useSpecialSituations } from '../../api/hooks/use-special-situations';
import { RefreshCw } from 'lucide-react';

// -- Formatting helpers --

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2);
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// -- Color helpers --

function spreadColor(n: number): string {
  if (n > 8) return 'text-green-400';
  if (n > 5) return 'text-green-400/70';
  if (n > 2) return 'text-pink-400';
  return 'text-neutral-500';
}

function riskBadge(level: string): string {
  const l = level?.toLowerCase() ?? '';
  if (l === 'low') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (l === 'medium' || l === 'moderate') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (l === 'high') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function statusBadge(status: string): string {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active' || s === 'ongoing') return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
  if (s === 'won' || s === 'completed' || s === 'closed') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (s === 'pending' || s === 'announced') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (s === 'regulatory review') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (s === 'settled' || s === 'withdrawn') return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
  if (s === 'at risk' || s === 'challenged') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function activistStatusBadge(status: string): string {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active' || s === 'escalating') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (s === 'won' || s === 'settled') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (s === 'withdrawn' || s === 'lost') return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
  if (s === 'proxy fight') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
}

function typeBadge(type: string): string {
  const t = type?.toUpperCase() ?? '';
  if (t === 'M&A' || t === 'MERGER') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  if (t === 'ACTIVIST') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (t === 'SPINOFF') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  if (t === 'RESTRUCTURING') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (t === 'TENDER') return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
  if (t === 'BUYBACK') return 'bg-green-500/10 text-green-400 border-green-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

// -- Interfaces --

interface Situation {
  id: string;
  type: string;
  target: string;
  details: string;
  spreadPct: number | null;
  returnPct: number | null;
  status: string;
  riskLevel: string;
  announcedDate: string | null;
  expectedClose: string | null;
}

interface MergerDeal {
  target: string;
  acquirer: string;
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedPct: number;
  riskFactors: string;
  expectedClose: string | null;
  dealValue: number | null;
  dealType: string;
  status: string;
}

interface ActivistCampaign {
  fund: string;
  target: string;
  stakePct: number;
  demands: string;
  boardSeats: number | null;
  status: string;
  filingDate: string | null;
}

interface PipelineDeal {
  target: string;
  acquirer: string;
  value: number | null;
  status: string;
  category: string;
  date: string | null;
}

interface SpreadEntry {
  target: string;
  acquirer: string;
  spreadPct: number;
  annualizedPct: number;
  probabilityPct: number;
  riskLevel: string;
  percentile: number | null;
}

// -- Tab types --

type Tab = 'ACTIVE' | 'MERGER_ARB' | 'ACTIVISTS' | 'PIPELINE' | 'SPREADS';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ACTIVE', label: 'ACTIVE' },
  { key: 'MERGER_ARB', label: 'MERGER ARB' },
  { key: 'ACTIVISTS', label: 'ACTIVISTS' },
  { key: 'PIPELINE', label: 'PIPELINE' },
  { key: 'SPREADS', label: 'SPREADS' },
];

// -- Active Tab --

function ActiveTab({ situations }: { situations: Situation[] }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_1fr_52px_52px_60px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Details</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Return</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Status</span>
      </div>

      {/* Rows */}
      {situations.map((s, i) => (
        <div
          key={s.id || `sit-${i}`}
          className="grid grid-cols-[56px_1fr_1fr_52px_52px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <div className="flex">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${typeBadge(s.type)}`}>
              {s.type}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{s.target}</span>
          <span className="text-[8px] font-mono text-neutral-400 truncate pr-1">{s.details}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${s.spreadPct != null ? spreadColor(s.spreadPct) : 'text-neutral-500'}`}>
            {fmtPct(s.spreadPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${s.returnPct != null && s.returnPct > 0 ? 'text-green-400' : 'text-neutral-500'}`}>
            {fmtPct(s.returnPct)}
          </span>
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${statusBadge(s.status)}`}>
              {s.status}
            </span>
          </div>
        </div>
      ))}

      {situations.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
          No active situations
        </div>
      )}
    </div>
  );
}

// -- Merger Arb Tab --

function MergerArbTab({ deals }: { deals: MergerDeal[] }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_48px_1fr_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target / Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Offer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Curr</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ann%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Risk Factors</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Exp Close</span>
      </div>

      {/* Rows */}
      {deals.map((m, i) => (
        <div
          key={`merger-${i}`}
          className="grid grid-cols-[1fr_56px_56px_48px_48px_1fr_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <div className="truncate pr-1">
            <span className="text-[8px] font-mono font-bold text-white">{m.target}</span>
            {m.acquirer && (
              <span className="text-[7px] font-mono text-neutral-600"> / {m.acquirer}</span>
            )}
          </div>
          <span className="text-[8px] font-mono text-white text-right">{fmtPrice(m.offerPrice)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPrice(m.currentPrice)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(m.spreadPct)}`}>
            {fmtPct(m.spreadPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${m.annualizedPct > 10 ? 'text-green-400' : 'text-pink-400'}`}>
            {fmtPct(m.annualizedPct)}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">{m.riskFactors}</span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{fmtDate(m.expectedClose)}</span>
        </div>
      ))}

      {deals.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
          No merger arb deals
        </div>
      )}
    </div>
  );
}

// -- Activists Tab --

function ActivistsTab({ campaigns }: { campaigns: ActivistCampaign[] }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_48px_1fr_40px_60px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Fund</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Stake%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Demands</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Seats</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Status</span>
      </div>

      {/* Rows */}
      {campaigns.map((c, i) => (
        <div
          key={`activist-${i}`}
          className="grid grid-cols-[1fr_1fr_48px_1fr_40px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate pr-1">{c.fund}</span>
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{c.target}</span>
          <span className="text-[8px] font-mono font-bold text-pink-400 text-right">
            {c.stakePct != null ? c.stakePct.toFixed(1) + '%' : '--'}
          </span>
          <span className="text-[7px] font-mono text-neutral-400 truncate">{c.demands}</span>
          <span className="text-[8px] font-mono text-white/60 text-right">
            {c.boardSeats != null ? c.boardSeats : '--'}
          </span>
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${activistStatusBadge(c.status)}`}>
              {c.status}
            </span>
          </div>
        </div>
      ))}

      {campaigns.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
          No activist campaigns
        </div>
      )}
    </div>
  );
}

// -- Pipeline Tab --

function PipelineTab({ pipeline }: { pipeline: PipelineDeal[] }) {
  const announcedThisWeek = pipeline.filter(d => d.category === 'announced');
  const pendingRegulatory = pipeline.filter(d => d.category === 'regulatory');
  const closingThisMonth = pipeline.filter(d => d.category === 'closing');

  const renderSection = (title: string, items: PipelineDeal[], dotColor: string) => (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1" style={{ backgroundColor: dotColor }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {title}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">{items.length}</span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_64px_60px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Status</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Date</span>
      </div>

      {items.map((d, i) => (
        <div
          key={`pipe-${d.category}-${i}`}
          className="grid grid-cols-[1fr_1fr_64px_60px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{d.target}</span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">{d.acquirer}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(d.value)}</span>
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${statusBadge(d.status)}`}>
              {d.status}
            </span>
          </div>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{fmtDate(d.date)}</span>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          None
        </div>
      )}
    </div>
  );

  return (
    <div>
      {renderSection('Announced This Week', announcedThisWeek, '#f472b6')}
      {renderSection('Pending Regulatory', pendingRegulatory, '#fbbf24')}
      {renderSection('Closing This Month', closingThisMonth, '#34d399')}
    </div>
  );
}

// -- Spreads Tab --

function SpreadsTab({ spreads }: { spreads: SpreadEntry[] }) {
  const sorted = [...spreads].sort((a, b) => b.spreadPct - a.spreadPct);
  const tightest = [...spreads].sort((a, b) => a.spreadPct - b.spreadPct).slice(0, 5);
  const widest = [...spreads].sort((a, b) => b.spreadPct - a.spreadPct).slice(0, 5);
  const maxSpread = sorted.length > 0 ? sorted[0].spreadPct : 1;

  return (
    <div>
      {/* Tightest Spreads */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
          <div className="w-1 h-1 bg-neutral-500" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Tightest Spreads
          </span>
        </div>

        {tightest.map((s, i) => (
          <div
            key={`tight-${i}`}
            className="flex items-center gap-1 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors"
          >
            <span className="w-16 text-[8px] font-mono font-bold text-white truncate">{s.target}</span>
            <span className="w-16 text-[7px] font-mono text-neutral-500 truncate">{s.acquirer}</span>
            <div className="flex-1 h-2 bg-white/[0.02] relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-neutral-500/40"
                style={{ width: `${(s.spreadPct / (maxSpread || 1)) * 100}%` }}
              />
            </div>
            <span className="w-12 text-[8px] font-mono text-neutral-400 text-right">{fmtPct(s.spreadPct)}</span>
            <span className="w-10 text-[7px] font-mono text-neutral-600 text-right">
              {s.percentile != null ? `P${s.percentile}` : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Widest Spreads */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
          <div className="w-1 h-1 bg-green-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Widest Spreads (Opportunity)
          </span>
        </div>

        {widest.map((s, i) => (
          <div
            key={`wide-${i}`}
            className="flex items-center gap-1 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors"
          >
            <span className="w-16 text-[8px] font-mono font-bold text-green-400 truncate">{s.target}</span>
            <span className="w-16 text-[7px] font-mono text-neutral-500 truncate">{s.acquirer}</span>
            <div className="flex-1 h-2 bg-white/[0.02] relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-500/40"
                style={{ width: `${(s.spreadPct / (maxSpread || 1)) * 100}%` }}
              />
            </div>
            <span className="w-12 text-[8px] font-mono font-bold text-green-400 text-right">{fmtPct(s.spreadPct)}</span>
            <span className="w-10 text-[7px] font-mono text-neutral-600 text-right">
              {s.percentile != null ? `P${s.percentile}` : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Risk / Reward Matrix */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
          <div className="w-1 h-1 bg-pink-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Risk / Reward Matrix
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Acquirer</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd%</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ann%</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Prob%</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Risk</span>
        </div>

        {sorted.map((s, i) => (
          <div
            key={`matrix-${i}`}
            className="grid grid-cols-[1fr_1fr_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{s.target}</span>
            <span className="text-[8px] font-mono text-neutral-400 truncate">{s.acquirer}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s.spreadPct)}`}>
              {fmtPct(s.spreadPct)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${s.annualizedPct > 10 ? 'text-green-400' : 'text-pink-400'}`}>
              {fmtPct(s.annualizedPct)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${s.probabilityPct >= 80 ? 'text-green-400' : s.probabilityPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {fmtPct(s.probabilityPct)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${riskBadge(s.riskLevel)}`}>
                {s.riskLevel}
              </span>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
            No spread data
          </div>
        )}
      </div>
    </div>
  );
}

// -- Main Panel --

export function SpecialSituationsPanel() {
  const { data, isLoading, refetch } = useSpecialSituations();
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVE');

  const d = data as Record<string, unknown> | undefined;

  const situations = (d?.situations ?? d?.active ?? []) as Situation[];
  const mergerDeals = (d?.mergerDeals ?? d?.mergerArb ?? d?.mergers ?? []) as MergerDeal[];
  const campaigns = (d?.campaigns ?? d?.activists ?? []) as ActivistCampaign[];
  const pipeline = (d?.pipeline ?? d?.pipelineDeals ?? []) as PipelineDeal[];
  const spreads = (d?.spreads ?? d?.spreadAnalytics ?? []) as SpreadEntry[];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-pink-400">
            Special Situations
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 bg-[#030303] shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'text-pink-400 bg-pink-400/[0.12]'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!isLoading && !d && (
          <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {d && (
          <>
            {activeTab === 'ACTIVE' && <ActiveTab situations={situations} />}
            {activeTab === 'MERGER_ARB' && <MergerArbTab deals={mergerDeals} />}
            {activeTab === 'ACTIVISTS' && <ActivistsTab campaigns={campaigns} />}
            {activeTab === 'PIPELINE' && <PipelineTab pipeline={pipeline} />}
            {activeTab === 'SPREADS' && <SpreadsTab spreads={spreads} />}
          </>
        )}
      </div>
    </div>
  );
}
