import { useState } from 'react';
import { useInfrastructureDebt } from '../../api/hooks/use-infrastructure-debt';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const LIME = '#a3e635';
const LIME_DIM = 'rgba(163,230,53,0.12)';
const GREEN = '#4ade80';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const BLUE = '#60a5fa';
const PURPLE = '#c084fc';
const CYAN = '#22d3ee';

// ── Formatting helpers ──

function fmtBn(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtUsd(n: number): string {
  return '$' + fmtBn(n);
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bps';
}

function fmtBpsSigned(n: number): string {
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(0) + 'bps';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtYears(n: number): string {
  return n.toFixed(1) + 'Y';
}

// ── Color helpers ──

function changeClass(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  const r = rating.toUpperCase();
  if (r.startsWith('AAA')) return '#4ade80';
  if (r.startsWith('AA')) return '#a3e635';
  if (r.startsWith('A')) return '#facc15';
  if (r.startsWith('BBB')) return '#fb923c';
  return '#f87171';
}

function trendBadge(trend: string): { text: string; color: string; bg: string } {
  const t = trend.toLowerCase();
  if (t === 'tightening' || t === 'improving') return { text: trend.toUpperCase(), color: GREEN, bg: 'rgba(74,222,128,0.12)' };
  if (t === 'stable' || t === 'steady') return { text: trend.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.10)' };
  if (t === 'widening' || t === 'deteriorating') return { text: trend.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: trend.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

// ── Sector color map ──

const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  transport:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  energy:        { color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  renewables:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  telecom:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  social:        { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  water:         { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  digital:       { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  ppp:           { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
};

function sectorStyle(sector: string): { color: string; bg: string } {
  const key = sector.toLowerCase();
  return SECTOR_COLORS[key] ?? { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)' };
}

// ── Types ──

type Tab = 'OVERVIEW' | 'SECTORS' | 'DEALS' | 'ESG';

// ── Main Panel ──

export function InfrastructureDebtPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInfrastructureDebt();
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  const tabs: Tab[] = ['OVERVIEW', 'SECTORS', 'DEALS', 'ESG'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="9" width="4" height="6" fill={LIME} opacity="0.7" />
            <rect x="6" y="5" width="4" height="10" fill={LIME} opacity="0.85" />
            <rect x="11" y="1" width="4" height="14" fill={LIME} />
            <line x1="0" y1="15.5" x2="16" y2="15.5" stroke={LIME} strokeWidth="0.5" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-lime-400">
            {tr(t, 'panelInfrastructureDebt', 'Infrastructure Debt')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          {tabs.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className="px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider transition-colors"
              style={{
                color: tab === tb ? LIME : 'rgba(255,255,255,0.25)',
                borderBottom: tab === tb ? `1px solid ${LIME}` : '1px solid transparent',
                background: tab === tb ? 'rgba(163,230,53,0.04)' : 'transparent',
              }}
            >
              {tb}
            </button>
          ))}
          {data && (
            <span className="text-[6px] text-white/20 ml-1">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-lime-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                LOADING INFRASTRUCTURE DEBT DATA...
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && tab === 'OVERVIEW' && <OverviewTab data={data} t={t} />}
        {data && tab === 'SECTORS' && <SectorsTab data={data} t={t} />}
        {data && tab === 'DEALS' && <DealsTab data={data} t={t} />}
        {data && tab === 'ESG' && <EsgTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ──

function OverviewTab({ data, t }: { data: any; t: TFn }) {
  const summary = data?.overview?.summary;
  const yieldComparison = data?.overview?.yieldComparison ?? [];
  const riskMetrics = data?.overview?.riskMetrics ?? [];

  const summaryItems = [
    { label: tr(t, 'idTotalSize', 'Total Market Size'), value: summary?.totalSize ? fmtUsd(summary.totalSize) : '-' },
    { label: tr(t, 'idIssuance', 'YTD Issuance'), value: summary?.ytdIssuance ? fmtUsd(summary.ytdIssuance) : '-' },
    { label: tr(t, 'idAvgSpread', 'Avg Spread'), value: summary?.avgSpread != null ? fmtBps(summary.avgSpread) : '-' },
    { label: tr(t, 'idAvgTenor', 'Avg Tenor'), value: summary?.avgTenor != null ? fmtYears(summary.avgTenor) : '-' },
    { label: tr(t, 'idAvgRating', 'Avg Rating'), value: summary?.avgRating ?? '-' },
    { label: tr(t, 'idDefaultRate', 'Default Rate'), value: summary?.defaultRate != null ? fmtPct(summary.defaultRate) : '-' },
  ];

  return (
    <>
      {/* Summary Grid */}
      <div className="grid grid-cols-6 border-b border-border/20 shrink-0">
        {summaryItems.map((item) => (
          <div key={item.label} className="px-2 py-1.5 border-r border-border/20 last:border-r-0">
            <div className="text-[6px] uppercase tracking-wider text-white/25 font-bold">{item.label}</div>
            <div className="text-[10px] font-black text-lime-400 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Yield Comparison Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'idYieldComparison', 'Yield Comparison')}
          </span>
        </div>
        <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="flex-[2] min-w-0">Asset Class</span>
          <span className="w-14 shrink-0 text-right">Yield</span>
          <span className="w-14 shrink-0 text-right">Spread</span>
          <span className="w-12 shrink-0 text-right">Duration</span>
          <span className="w-14 shrink-0 text-right">1M Chg</span>
          <span className="w-12 shrink-0 text-center">Rating</span>
        </div>
        {yieldComparison.map((row: any, i: number) => (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-lime-400/[0.02] transition-colors"
          >
            <span className="flex-[2] min-w-0 text-[8px] font-bold text-white/70 truncate">
              {row?.name ?? '-'}
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/80 tabular-nums">
              {row?.yield != null ? fmtPct(row.yield) : '-'}
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold tabular-nums" style={{ color: LIME }}>
              {row?.spread != null ? fmtBps(row.spread) : '-'}
            </span>
            <span className="w-12 shrink-0 text-right text-[7px] text-white/40 tabular-nums">
              {row?.duration != null ? fmtYears(row.duration) : '-'}
            </span>
            <span className={`w-14 shrink-0 text-right text-[8px] font-bold tabular-nums ${changeClass(row?.monthChange ?? 0)}`}>
              {row?.monthChange != null ? fmtBpsSigned(row.monthChange) : '-'}
            </span>
            <span className="w-12 shrink-0 text-center text-[7px] font-bold" style={{ color: ratingColor(row?.rating ?? 'NR') }}>
              {row?.rating ?? '-'}
            </span>
          </div>
        ))}
      </div>

      {/* Risk Metrics Cards */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'idRiskMetrics', 'Risk Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {riskMetrics.map((metric: any, i: number) => (
            <div key={i} className="bg-black px-2 py-1.5 hover:bg-lime-400/[0.02] transition-colors">
              <div className="text-[6px] text-white/25 uppercase tracking-wider mb-0.5">
                {metric?.label ?? '-'}
              </div>
              <div className="text-[10px] font-bold text-white tabular-nums">{metric?.value ?? '-'}</div>
              {metric?.subtext && (
                <div className="text-[7px] text-white/30 mt-0.5">{metric.subtext}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── SECTORS TAB ──

function SectorsTab({ data, t }: { data: any; t: TFn }) {
  const sectors = data?.sectors ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'idSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="w-20 shrink-0">Sector</span>
        <span className="w-16 shrink-0 text-right">Outstanding</span>
        <span className="w-14 shrink-0 text-right">Spread</span>
        <span className="w-12 shrink-0 text-right">Tenor</span>
        <span className="w-12 shrink-0 text-center">Rating</span>
        <span className="w-14 shrink-0 text-right">Green %</span>
        <span className="flex-1 text-center">Trend</span>
      </div>
      {/* Rows */}
      {sectors.map((sector: any, i: number) => {
        const style = sectorStyle(sector?.name ?? '');
        const trend = trendBadge(sector?.trend ?? 'stable');
        return (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-lime-400/[0.02] transition-colors"
          >
            <span className="w-20 shrink-0">
              <span
                className="text-[6px] font-black uppercase px-1 py-px"
                style={{ color: style.color, backgroundColor: style.bg }}
              >
                {sector?.name ?? '-'}
              </span>
            </span>
            <span className="w-16 shrink-0 text-right text-[8px] font-bold text-white/60 tabular-nums">
              {sector?.outstanding != null ? fmtUsd(sector.outstanding) : '-'}
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold tabular-nums" style={{ color: LIME }}>
              {sector?.spread != null ? fmtBps(sector.spread) : '-'}
            </span>
            <span className="w-12 shrink-0 text-right text-[7px] text-white/40 tabular-nums">
              {sector?.avgTenor != null ? fmtYears(sector.avgTenor) : '-'}
            </span>
            <span
              className="w-12 shrink-0 text-center text-[7px] font-bold"
              style={{ color: ratingColor(sector?.avgRating ?? 'NR') }}
            >
              {sector?.avgRating ?? '-'}
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold tabular-nums" style={{ color: GREEN }}>
              {sector?.greenBondPct != null ? fmtPct(sector.greenBondPct) : '-'}
            </span>
            <span className="flex-1 flex justify-center">
              <span
                className="text-[5px] font-black uppercase px-1 py-px"
                style={{ color: trend.color, backgroundColor: trend.bg }}
              >
                {trend.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── DEALS TAB ──

function DealsTab({ data, t }: { data: any; t: TFn }) {
  const deals = data?.recentDeals ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'idRecentDeals', 'Recent Deals')}
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="flex-[2] min-w-0">Borrower</span>
        <span className="w-14 shrink-0 text-right">Amount</span>
        <span className="w-10 shrink-0 text-center">Ccy</span>
        <span className="w-10 shrink-0 text-right">Tenor</span>
        <span className="w-14 shrink-0 text-right">Spread</span>
        <span className="w-10 shrink-0 text-center">Rtg</span>
        <span className="w-16 shrink-0 text-center">Structure</span>
        <span className="w-12 shrink-0 text-center">Green</span>
      </div>
      {/* Rows */}
      {deals.map((deal: any, i: number) => (
        <div
          key={i}
          className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-lime-400/[0.02] transition-colors"
        >
          <span className="flex-[2] min-w-0 text-[8px] font-bold text-white/70 truncate">
            {deal?.borrower ?? '-'}
          </span>
          <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/60 tabular-nums">
            {deal?.amount != null ? fmtUsd(deal.amount) : '-'}
          </span>
          <span className="w-10 shrink-0 text-center text-[7px] text-white/40">
            {deal?.currency ?? '-'}
          </span>
          <span className="w-10 shrink-0 text-right text-[7px] text-white/40 tabular-nums">
            {deal?.tenor ?? '-'}
          </span>
          <span className="w-14 shrink-0 text-right text-[8px] font-bold tabular-nums" style={{ color: LIME }}>
            {deal?.spread != null ? fmtBps(deal.spread) : '-'}
          </span>
          <span
            className="w-10 shrink-0 text-center text-[7px] font-bold"
            style={{ color: ratingColor(deal?.rating ?? 'NR') }}
          >
            {deal?.rating ?? '-'}
          </span>
          <span className="w-16 shrink-0 text-center text-[7px] text-white/40 uppercase">
            {deal?.structure ?? '-'}
          </span>
          <span className="w-12 shrink-0 flex justify-center">
            {deal?.isGreen ? (
              <span
                className="text-[5px] font-black uppercase px-1 py-px"
                style={{ color: GREEN, backgroundColor: 'rgba(74,222,128,0.12)' }}
              >
                GREEN
              </span>
            ) : (
              <span className="text-[5px] text-white/15">-</span>
            )}
          </span>
        </div>
      ))}
      {deals.length === 0 && (
        <div className="flex items-center justify-center py-4 text-[8px] text-white/20 uppercase">
          No recent deals
        </div>
      )}
    </div>
  );
}

// ── ESG TAB ──

function EsgTab({ data, t }: { data: any; t: TFn }) {
  const esg = data?.esg;

  const metrics = [
    { label: tr(t, 'idGreenBondShare', 'Green Bond Share'), value: esg?.greenBondShare, color: GREEN },
    { label: tr(t, 'idSocialBondShare', 'Social Bond Share'), value: esg?.socialBondShare, color: BLUE },
    { label: tr(t, 'idCarbonIntensity', 'Carbon Intensity'), value: esg?.carbonIntensity, color: YELLOW, unit: 'tCO2/m', isRaw: true },
    { label: tr(t, 'idTaxonomyAlignment', 'EU Taxonomy Alignment'), value: esg?.taxonomyAlignment, color: PURPLE },
  ];

  const breakdownItems = esg?.breakdown ?? [];

  return (
    <>
      {/* ESG Metrics Cards */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'idEsgMetrics', 'ESG Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {metrics.map((metric, i) => {
            const pctValue = metric.isRaw ? null : metric.value;
            return (
              <div key={i} className="bg-black px-2 py-2 hover:bg-lime-400/[0.02] transition-colors">
                <div className="text-[6px] text-white/25 uppercase tracking-wider mb-1">
                  {metric.label}
                </div>
                <div className="text-[12px] font-black tabular-nums" style={{ color: metric.color }}>
                  {metric.isRaw
                    ? (metric.value != null ? `${metric.value.toFixed(1)} ${metric.unit}` : '-')
                    : (metric.value != null ? fmtPct(metric.value) : '-')
                  }
                </div>
                {/* Visual bar for percentage values */}
                {pctValue != null && (
                  <div className="mt-1.5 h-1 bg-white/[0.04] w-full">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(pctValue, 100)}%`,
                        backgroundColor: metric.color,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ESG Breakdown */}
      {breakdownItems.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'idEsgBreakdown', 'ESG Breakdown by Category')}
            </span>
          </div>
          {breakdownItems.map((item: any, i: number) => {
            const barColor = item?.type === 'green' ? GREEN : item?.type === 'social' ? BLUE : CYAN;
            return (
              <div
                key={i}
                className="flex items-center px-2 py-1 border-b border-white/[0.03] hover:bg-lime-400/[0.02] transition-colors"
              >
                <span className="w-24 shrink-0 text-[8px] font-bold text-white/60 truncate">
                  {item?.category ?? '-'}
                </span>
                <div className="flex-1 h-1.5 bg-white/[0.03] mx-2 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${item?.share != null ? Math.min(item.share, 100) : 0}%`,
                      backgroundColor: barColor,
                      opacity: 0.5,
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-[8px] font-bold tabular-nums" style={{ color: barColor }}>
                  {item?.share != null ? fmtPct(item.share) : '-'}
                </span>
                <span className="w-14 shrink-0 text-right text-[7px] text-white/40 tabular-nums">
                  {item?.amount != null ? fmtUsd(item.amount) : '-'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!esg && (
        <div className="flex items-center justify-center py-8 text-[8px] text-white/20 uppercase">
          No ESG data available
        </div>
      )}
    </>
  );
}
