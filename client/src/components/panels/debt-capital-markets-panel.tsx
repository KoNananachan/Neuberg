import { useState } from 'react';
import { useDebtCapitalMarkets } from '../../api/hooks/use-debt-capital-markets';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

interface DCMNewIssue {
  issuer: string;
  rating: string;
  coupon: number;
  maturity: string;
  spread: number;
  size: number;
  type: 'IG' | 'HY' | 'EM' | 'SSA' | 'FIG';
  status: 'priced' | 'launched' | 'roadshow' | 'mandate';
  oversubscription: number;
  currency: string;
}

interface DCMPricedDeal {
  issuer: string;
  rating: string;
  coupon: number;
  maturity: string;
  initialGuidance: number;
  finalSpread: number;
  tightening: number;
  nip: number;
  aftermarketBps: number;
  size: number;
  type: 'IG' | 'HY' | 'EM' | 'SSA' | 'FIG';
}

interface DCMPipelineDeal {
  issuer: string;
  rating: string;
  expectedSize: number;
  expectedMaturity: string;
  type: 'IG' | 'HY' | 'EM' | 'SSA' | 'FIG';
  status: 'roadshow' | 'mandate' | 'rumored';
  expectedDate: string;
  bookrunners: string[];
}

interface DCMMarketStats {
  ytdVolume: number;
  weeklyVolume: number;
  avgSpreadIG: number;
  avgSpreadHY: number;
  demandIndex: number;
  windowStatus: 'open' | 'cautious' | 'closed';
  igDealCount: number;
  hyDealCount: number;
  concessionAvg: number;
  oversubAvg: number;
}

interface DebtCapitalMarketsData {
  timestamp: string;
  newIssues: DCMNewIssue[];
  pricedDeals: DCMPricedDeal[];
  pipeline: DCMPipelineDeal[];
  marketStats: DCMMarketStats;
}

// ── Constants ──

const INDIGO = '#818cf8';

// ── Formatting helpers ──

function fmtSize(n: number): string {
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
}

function fmtBps(n: number, signed = false): string {
  const prefix = signed && n > 0 ? '+' : signed && n < 0 ? '' : '';
  return `${prefix}${n.toFixed(0)}bp`;
}

function fmtPct(n: number): string {
  return n.toFixed(3) + '%';
}

function fmtOversub(n: number): string {
  return n.toFixed(1) + 'x';
}

// ── Color helpers ──

function typeBadgeStyle(type: string): string {
  switch (type) {
    case 'IG': return 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
    case 'HY': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
    case 'EM': return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
    case 'SSA': return 'text-purple-400 bg-purple-500/10 border border-purple-500/30';
    case 'FIG': return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
    default: return 'text-white/40 bg-white/5 border border-white/10';
  }
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case 'priced': return 'text-green-400 bg-green-500/10 border border-green-500/30';
    case 'launched': return 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
    case 'roadshow': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
    case 'mandate': return 'text-purple-400 bg-purple-500/10 border border-purple-500/30';
    case 'rumored': return 'text-white/40 bg-white/5 border border-white/10';
    default: return 'text-white/40 bg-white/5 border border-white/10';
  }
}

function windowBadgeStyle(status: string): { text: string; color: string; bg: string } {
  switch (status) {
    case 'open': return { text: 'WINDOW OPEN', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
    case 'cautious': return { text: 'CAUTIOUS', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
    case 'closed': return { text: 'WINDOW CLOSED', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
    default: return { text: status.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/40';
}

// ── Tab type ──

type Tab = 'issues' | 'pricing' | 'pipeline' | 'stats';

// ── Main Panel ──

export function DebtCapitalMarketsPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useDebtCapitalMarkets();
  const data = rawData as DebtCapitalMarketsData | undefined;
  const [tab, setTab] = useState<Tab>('issues');

  const windowBadge = data?.marketStats ? windowBadgeStyle(data.marketStats.windowStatus) : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'dcmTitle', 'Debt Capital Markets')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {windowBadge && (
            <span
              className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5"
              style={{ color: windowBadge.color, backgroundColor: windowBadge.bg }}
            >
              {windowBadge.text}
            </span>
          )}
          {data && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-white/30 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {([
          { key: 'issues' as Tab, label: tr(t, 'dcmNewIssues', 'New Issues') },
          { key: 'pricing' as Tab, label: tr(t, 'dcmPricing', 'Pricing') },
          { key: 'pipeline' as Tab, label: tr(t, 'dcmPipeline', 'Pipeline') },
          { key: 'stats' as Tab, label: tr(t, 'dcmStats', 'Stats') },
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === item.key
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'dcmNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'issues' && <NewIssuesTab issues={data.newIssues} t={t} />}
        {data && tab === 'pricing' && <PricingSummaryTab deals={data.pricedDeals} t={t} />}
        {data && tab === 'pipeline' && <PipelineTab pipeline={data.pipeline} t={t} />}
        {data && tab === 'stats' && <MarketStatsTab stats={data.marketStats} t={t} />}
      </div>
    </div>
  );
}

// ── Tab 1: New Issues ──

function NewIssuesTab({ issues, t }: { issues: DCMNewIssue[]; t: ReturnType<typeof useT> }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[9px] text-white/30 uppercase">
        {tr(t, 'dcmNoIssues', 'No new issues')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_48px_52px_44px_48px_32px_40px_38px] gap-px px-2 py-1 border-b border-border/20 text-[7px] font-black text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'dcmIssuer', 'Issuer')}</span>
        <span className="text-center">{tr(t, 'dcmRating', 'Rtg')}</span>
        <span className="text-right">{tr(t, 'dcmCoupon', 'Cpn')}</span>
        <span className="text-right">{tr(t, 'dcmMaturity', 'Mat')}</span>
        <span className="text-right">{tr(t, 'dcmSpread', 'Spd')}</span>
        <span className="text-right">{tr(t, 'dcmSize', 'Size')}</span>
        <span className="text-center">{tr(t, 'dcmType', 'Type')}</span>
        <span className="text-center">{tr(t, 'dcmStatus', 'Sts')}</span>
        <span className="text-right">{tr(t, 'dcmOversub', 'O/S')}</span>
      </div>

      {/* Rows */}
      {issues.map((issue, i) => (
        <div
          key={`${issue.issuer}-${i}`}
          className="grid grid-cols-[1fr_40px_48px_52px_44px_48px_32px_40px_38px] gap-px px-2 py-1 border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors"
        >
          <div className="truncate">
            <span className="text-[8px] font-bold text-white/80">{issue.issuer}</span>
          </div>
          <span className="text-[8px] text-white/50 text-center">{issue.rating}</span>
          <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtPct(issue.coupon)}</span>
          <span className="text-[8px] text-white/50 text-right">{issue.maturity}</span>
          <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtBps(issue.spread)}</span>
          <span className="text-[8px] text-white/70 text-right tabular-nums">
            {issue.currency !== 'USD' && <span className="text-white/30 mr-0.5">{issue.currency}</span>}
            {fmtSize(issue.size)}
          </span>
          <span className="flex items-center justify-center">
            <span className={`text-[6px] font-black px-1 py-px uppercase ${typeBadgeStyle(issue.type)}`}>
              {issue.type}
            </span>
          </span>
          <span className="flex items-center justify-center">
            <span className={`text-[6px] font-black px-1 py-px uppercase ${statusBadgeStyle(issue.status)}`}>
              {issue.status}
            </span>
          </span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${
            issue.oversubscription >= 3 ? 'text-green-400' :
            issue.oversubscription >= 2 ? 'text-emerald-400/70' :
            'text-white/50'
          }`}>
            {fmtOversub(issue.oversubscription)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: Pricing Summary ──

function PricingSummaryTab({ deals, t }: { deals: DCMPricedDeal[]; t: ReturnType<typeof useT> }) {
  if (!deals || deals.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[9px] text-white/30 uppercase">
        {tr(t, 'dcmNoPriced', 'No priced deals')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_36px_44px_44px_44px_36px_40px_32px] gap-px px-2 py-1 border-b border-border/20 text-[7px] font-black text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'dcmIssuer', 'Issuer')}</span>
        <span className="text-center">{tr(t, 'dcmType', 'Type')}</span>
        <span className="text-right">{tr(t, 'dcmGuidance', 'IPT')}</span>
        <span className="text-right">{tr(t, 'dcmFinal', 'Final')}</span>
        <span className="text-right">{tr(t, 'dcmTighten', 'Tight')}</span>
        <span className="text-right">{tr(t, 'dcmNIP', 'NIP')}</span>
        <span className="text-right">{tr(t, 'dcmAfterMkt', 'Aft.Mkt')}</span>
        <span className="text-right">{tr(t, 'dcmSize', 'Size')}</span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => (
        <div
          key={`${deal.issuer}-${i}`}
          className="grid grid-cols-[1fr_36px_44px_44px_44px_36px_40px_32px] gap-px px-2 py-1 border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors"
        >
          <div className="truncate">
            <span className="text-[8px] font-bold text-white/80">{deal.issuer}</span>
            <span className="text-[7px] text-white/30 ml-1">{deal.rating}</span>
          </div>
          <span className="flex items-center justify-center">
            <span className={`text-[6px] font-black px-1 py-px uppercase ${typeBadgeStyle(deal.type)}`}>
              {deal.type}
            </span>
          </span>
          <span className="text-[8px] text-white/50 text-right tabular-nums">
            {fmtBps(deal.initialGuidance)}
          </span>
          <span className="text-[8px] text-white/70 text-right tabular-nums font-bold">
            {fmtBps(deal.finalSpread)}
          </span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${
            deal.tightening > 0 ? 'text-green-400' : 'text-white/40'
          }`}>
            {deal.tightening > 0 ? '-' : ''}{Math.abs(deal.tightening).toFixed(0)}bp
          </span>
          <span className={`text-[8px] text-right tabular-nums ${
            deal.nip <= 0 ? 'text-green-400' : deal.nip <= 5 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {deal.nip.toFixed(0)}bp
          </span>
          <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(deal.aftermarketBps)}`}>
            {deal.aftermarketBps >= 0 ? '+' : ''}{deal.aftermarketBps.toFixed(0)}bp
          </span>
          <span className="text-[8px] text-white/60 text-right tabular-nums">{fmtSize(deal.size)}</span>
        </div>
      ))}

      {/* Aggregate stats */}
      {deals.length > 1 && (
        <div className="px-2 py-1.5 border-t border-border/20 bg-white/[0.01]">
          <div className="flex items-center gap-4 text-[7px]">
            <span className="text-white/25 uppercase tracking-wider">
              {tr(t, 'dcmAvg', 'Avg')}:
            </span>
            <span className="text-white/40">
              Tightening{' '}
              <span className="text-green-400 font-bold">
                {(deals.reduce((s, d) => s + d.tightening, 0) / deals.length).toFixed(0)}bp
              </span>
            </span>
            <span className="text-white/40">
              NIP{' '}
              <span className="text-indigo-400 font-bold">
                {(deals.reduce((s, d) => s + d.nip, 0) / deals.length).toFixed(1)}bp
              </span>
            </span>
            <span className="text-white/40">
              Aft.Mkt{' '}
              <span className={`font-bold ${
                deals.reduce((s, d) => s + d.aftermarketBps, 0) / deals.length >= 0
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {((deals.reduce((s, d) => s + d.aftermarketBps, 0) / deals.length) >= 0 ? '+' : '')}
                {(deals.reduce((s, d) => s + d.aftermarketBps, 0) / deals.length).toFixed(1)}bp
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Pipeline ──

function PipelineTab({ pipeline, t }: { pipeline: DCMPipelineDeal[]; t: ReturnType<typeof useT> }) {
  if (!pipeline || pipeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[9px] text-white/30 uppercase">
        {tr(t, 'dcmNoPipeline', 'No pipeline deals')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_36px_40px_52px_48px_44px_1fr] gap-px px-2 py-1 border-b border-border/20 text-[7px] font-black text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'dcmIssuer', 'Issuer')}</span>
        <span className="text-center">{tr(t, 'dcmRating', 'Rtg')}</span>
        <span className="text-center">{tr(t, 'dcmType', 'Type')}</span>
        <span className="text-right">{tr(t, 'dcmExpSize', 'Exp.Size')}</span>
        <span className="text-right">{tr(t, 'dcmExpMat', 'Exp.Mat')}</span>
        <span className="text-center">{tr(t, 'dcmStatus', 'Status')}</span>
        <span>{tr(t, 'dcmBookrunners', 'Bookrunners')}</span>
      </div>

      {/* Rows */}
      {pipeline.map((deal, i) => (
        <div
          key={`${deal.issuer}-${i}`}
          className="grid grid-cols-[1fr_36px_40px_52px_48px_44px_1fr] gap-px px-2 py-1 border-b border-border/10 hover:bg-indigo-400/[0.02] transition-colors"
        >
          <div className="truncate">
            <span className="text-[8px] font-bold text-white/80">{deal.issuer}</span>
          </div>
          <span className="text-[8px] text-white/50 text-center">{deal.rating}</span>
          <span className="flex items-center justify-center">
            <span className={`text-[6px] font-black px-1 py-px uppercase ${typeBadgeStyle(deal.type)}`}>
              {deal.type}
            </span>
          </span>
          <span className="text-[8px] text-white/60 text-right tabular-nums">
            {deal.expectedSize > 0 ? fmtSize(deal.expectedSize) : '-'}
          </span>
          <span className="text-[8px] text-white/50 text-right">{deal.expectedMaturity}</span>
          <span className="flex items-center justify-center">
            <span className={`text-[6px] font-black px-1 py-px uppercase ${statusBadgeStyle(deal.status)}`}>
              {deal.status}
            </span>
          </span>
          <span className="text-[7px] text-white/30 truncate">
            {deal.bookrunners.slice(0, 3).join(', ')}
            {deal.bookrunners.length > 3 && ` +${deal.bookrunners.length - 3}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 4: Market Stats ──

function MarketStatsTab({ stats, t }: { stats: DCMMarketStats; t: ReturnType<typeof useT> }) {
  const windowBadge = windowBadgeStyle(stats.windowStatus);

  const metrics = [
    {
      label: tr(t, 'dcmYtdVolume', 'YTD Issuance'),
      value: fmtSize(stats.ytdVolume),
      detail: `${stats.igDealCount} IG / ${stats.hyDealCount} HY deals`,
    },
    {
      label: tr(t, 'dcmWeeklyVol', 'Weekly Volume'),
      value: fmtSize(stats.weeklyVolume),
      detail: null,
    },
    {
      label: tr(t, 'dcmAvgSpreadIG', 'Avg IG Spread'),
      value: fmtBps(stats.avgSpreadIG),
      detail: null,
    },
    {
      label: tr(t, 'dcmAvgSpreadHY', 'Avg HY Spread'),
      value: fmtBps(stats.avgSpreadHY),
      detail: null,
    },
    {
      label: tr(t, 'dcmDemandIdx', 'Demand Index'),
      value: stats.demandIndex.toFixed(1),
      detail: stats.demandIndex >= 1.5 ? 'Strong' : stats.demandIndex >= 1.0 ? 'Moderate' : 'Weak',
    },
    {
      label: tr(t, 'dcmAvgConcession', 'Avg NIC'),
      value: fmtBps(stats.concessionAvg),
      detail: null,
    },
    {
      label: tr(t, 'dcmAvgOversub', 'Avg Oversub'),
      value: fmtOversub(stats.oversubAvg),
      detail: null,
    },
  ];

  return (
    <div>
      {/* Window status banner */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div>
          <div className="text-[7px] text-white/25 uppercase tracking-wider mb-0.5">
            {tr(t, 'dcmIssuanceWindow', 'Primary Market Window')}
          </div>
          <span
            className="text-[9px] font-black font-mono uppercase px-2 py-0.5"
            style={{ color: windowBadge.color, backgroundColor: windowBadge.bg }}
          >
            {windowBadge.text}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[7px] text-white/25 uppercase tracking-wider mb-0.5">
            {tr(t, 'dcmDemandIdx', 'Demand Index')}
          </div>
          <span className={`text-[14px] font-mono font-black ${
            stats.demandIndex >= 1.5 ? 'text-green-400' :
            stats.demandIndex >= 1.0 ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {stats.demandIndex.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Volume metrics */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <div className="px-3 py-2 bg-black">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
            {tr(t, 'dcmYtdVolume', 'YTD Issuance')}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[14px] font-mono font-black text-white">{fmtSize(stats.ytdVolume)}</span>
          </div>
          <div className="text-[7px] text-white/30 mt-0.5">
            {stats.igDealCount} IG / {stats.hyDealCount} HY deals
          </div>
        </div>
        <div className="px-3 py-2 bg-black">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider">
            {tr(t, 'dcmWeeklyVol', 'Weekly Volume')}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[14px] font-mono font-black text-white">{fmtSize(stats.weeklyVolume)}</span>
          </div>
        </div>
      </div>

      {/* Spread metrics */}
      <div className="border-t border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[7px] font-black font-mono uppercase tracking-wider text-white/25">
            {tr(t, 'dcmSpreadMetrics', 'Spread Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-white/25 uppercase">IG Avg</div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">{fmtBps(stats.avgSpreadIG)}</div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-white/25 uppercase">HY Avg</div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">{fmtBps(stats.avgSpreadHY)}</div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-white/25 uppercase">Avg NIC</div>
            <div className="text-[10px] font-mono font-bold text-indigo-400 mt-0.5">{fmtBps(stats.concessionAvg)}</div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-white/25 uppercase">Avg O/S</div>
            <div className={`text-[10px] font-mono font-bold mt-0.5 ${
              stats.oversubAvg >= 3 ? 'text-green-400' :
              stats.oversubAvg >= 2 ? 'text-emerald-400/70' :
              'text-white/60'
            }`}>
              {fmtOversub(stats.oversubAvg)}
            </div>
          </div>
        </div>
      </div>

      {/* Deal count breakdown */}
      <div className="border-t border-border/20 px-3 py-2">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-white/25 mb-1.5">
          {tr(t, 'dcmDealBreakdown', 'Deal Breakdown')}
        </div>
        <div className="flex gap-3">
          <DealBar label="IG" count={stats.igDealCount} total={stats.igDealCount + stats.hyDealCount} color="#60a5fa" />
          <DealBar label="HY" count={stats.hyDealCount} total={stats.igDealCount + stats.hyDealCount} color="#fbbf24" />
        </div>
      </div>
    </div>
  );
}

// ── Deal breakdown bar ──

function DealBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-mono font-bold" style={{ color }}>{label}</span>
        <span className="text-[7px] font-mono text-white/40">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 bg-white/[0.03] overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}
