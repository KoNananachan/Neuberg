import { useEtfPremium } from '../../api/hooks/use-etf-premium';
import { useT, tr, TFn } from '../../i18n';

// i18n helper with fallback
// ── Formatting ──

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(3) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'bp';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2);
}

function fmtAum(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtVol(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtExpense(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtZ(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

function fmtTrackErr(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3) + '%';
}

// ── Colors ──

const GREEN = '#4ade80';
const RED = '#f87171';
const YELLOW = '#facc15';
const VIOLET = '#a78bfa';
const DIM = 'rgba(255,255,255,0.3)';

function premDiscColor(n: number | null | undefined): string {
  if (n == null) return DIM;
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return DIM;
}

function zScoreColor(z: number | null | undefined): string {
  if (z == null) return DIM;
  const abs = Math.abs(z);
  if (abs > 2) return RED;
  if (abs > 1.5) return YELLOW;
  return DIM;
}

function zScoreBg(z: number | null | undefined): string {
  if (z == null) return 'transparent';
  const abs = Math.abs(z);
  if (abs > 2) return 'rgba(248,113,113,0.12)';
  if (abs > 1.5) return 'rgba(250,204,21,0.08)';
  return 'transparent';
}

// ── Category Badges ──

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  'Equity': { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Bond': { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Fixed Income': { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Commodity': { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  'Sector': { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  'International': { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Currency': { color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  'Crypto': { color: '#facc15', bg: 'rgba(250,204,21,0.10)' },
  'Real Estate': { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  'Volatility': { color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
  'Multi-Asset': { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'Leveraged': { color: '#fb7185', bg: 'rgba(251,113,133,0.10)' },
  'Inverse': { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};

const DEFAULT_BADGE = { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)' };

function getCategoryBadge(category: string | null | undefined): { color: string; bg: string } {
  if (!category) return DEFAULT_BADGE;
  return CATEGORY_COLORS[category] ?? DEFAULT_BADGE;
}

// ── Types ──

interface EtfEntry {
  ticker: string;
  name: string;
  category: string;
  nav: number;
  marketPrice: number;
  premiumDiscount: number;
  premiumDiscount30dAvg: number;
  volume: number;
  aum: number;
  expenseRatio: number;
  bid: number;
  ask: number;
  spread: number;
  zScore: number;
  trackingError: number;
}

interface EtfSummary {
  avgPremium: number;
  avgDiscount: number;
  widestPremium: number;
  widestDiscount: number;
  avgSpread: number;
  totalAum: number;
}

interface EtfPremiumData {
  etfs: EtfEntry[];
  summary: EtfSummary;
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: EtfSummary }) {
  const items: { label: string; value: string; color: string }[] = [
    { label: 'TOTAL AUM', value: fmtAum(summary.totalAum), color: VIOLET },
    { label: 'AVG PREMIUM', value: fmtBps(summary.avgPremium), color: GREEN },
    { label: 'AVG DISCOUNT', value: fmtBps(summary.avgDiscount), color: RED },
    { label: 'WIDEST PREM', value: fmtBps(summary.widestPremium), color: GREEN },
    { label: 'WIDEST DISC', value: fmtBps(summary.widestDiscount), color: RED },
    { label: 'AVG SPREAD', value: fmtBps(summary.avgSpread), color: VIOLET },
  ];

  return (
    <div className="flex items-center border-b border-violet-400/20 bg-violet-400/[0.02] shrink-0 overflow-x-auto">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col px-3 py-1.5 border-r border-violet-400/10 last:border-r-0">
          <span className="text-[6px] font-mono font-black uppercase tracking-wider text-white/20">
            {item.label}
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: item.color }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Table ──

function EtfTable({ etfs }: { etfs: EtfEntry[] }) {
  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-violet-400/30 text-[7px] font-black uppercase tracking-wider text-white/25 bg-violet-400/[0.02]">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="w-28 shrink-0">NAME</span>
        <span className="w-16 shrink-0 text-center">CATEGORY</span>
        <span className="w-14 text-right shrink-0">NAV</span>
        <span className="w-14 text-right shrink-0">MKT PRC</span>
        <span className="w-16 text-right shrink-0">PREM/DISC</span>
        <span className="w-14 text-right shrink-0">30D AVG</span>
        <span className="w-14 text-right shrink-0">Z-SCORE</span>
        <span className="w-14 text-right shrink-0">VOLUME</span>
        <span className="w-14 text-right shrink-0">AUM</span>
        <span className="w-12 text-right shrink-0">EXPENSE</span>
        <span className="w-14 text-right shrink-0">SPREAD</span>
        <span className="w-14 text-right shrink-0">TRACK ERR</span>
      </div>

      {/* Rows */}
      {etfs.map((etf, i) => {
        const badge = getCategoryBadge(etf.category);
        return (
          <div
            key={etf.ticker ?? i}
            className="flex items-center px-2 py-1 border-b border-violet-400/10 hover:bg-violet-400/[0.02] transition-colors"
          >
            {/* Ticker */}
            <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-white/80">
              {etf.ticker}
            </span>

            {/* Name */}
            <span className="w-28 shrink-0 text-[8px] font-mono text-white/30 truncate" title={etf.name}>
              {etf.name}
            </span>

            {/* Category Badge */}
            <span className="w-16 shrink-0 flex justify-center">
              <span
                className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5 truncate max-w-full"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {etf.category ?? '--'}
              </span>
            </span>

            {/* NAV */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/50">
              {fmtPrice(etf.nav)}
            </span>

            {/* Market Price */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/50">
              {fmtPrice(etf.marketPrice)}
            </span>

            {/* Premium/Discount */}
            <span
              className="w-16 text-right shrink-0 text-[9px] font-mono font-bold"
              style={{ color: premDiscColor(etf.premiumDiscount) }}
            >
              {fmtPct(etf.premiumDiscount)}
            </span>

            {/* 30d Avg */}
            <span
              className="w-14 text-right shrink-0 text-[8px] font-mono"
              style={{ color: premDiscColor(etf.premiumDiscount30dAvg) }}
            >
              {fmtPct(etf.premiumDiscount30dAvg)}
            </span>

            {/* Z-Score */}
            <span
              className="w-14 text-right shrink-0 text-[9px] font-mono font-bold px-1"
              style={{
                color: zScoreColor(etf.zScore),
                backgroundColor: zScoreBg(etf.zScore),
              }}
            >
              {fmtZ(etf.zScore)}
            </span>

            {/* Volume */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/40">
              {fmtVol(etf.volume)}
            </span>

            {/* AUM */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/40">
              {fmtAum(etf.aum)}
            </span>

            {/* Expense Ratio */}
            <span className="w-12 text-right shrink-0 text-[8px] font-mono text-white/30">
              {fmtExpense(etf.expenseRatio)}
            </span>

            {/* Spread */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/40">
              {fmtSpread(etf.spread)}
            </span>

            {/* Tracking Error */}
            <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/30">
              {fmtTrackErr(etf.trackingError)}
            </span>
          </div>
        );
      })}

      {etfs.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO ETF DATA
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function EtfPremiumPanel() {
  const t = useT();
  const { data, isLoading } = useEtfPremium();

  const premiumData = data as EtfPremiumData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 12 L5 5 L8 8 L11 3 L14 7" fill="none" stroke={VIOLET} strokeWidth="1.5" opacity="0.8" />
            <line x1="2" y1="14" x2="14" y2="14" stroke={VIOLET} strokeWidth="0.5" opacity="0.3" />
            <circle cx="5" cy="5" r="1" fill={GREEN} opacity="0.8" />
            <circle cx="8" cy="8" r="1" fill={RED} opacity="0.8" />
            <circle cx="11" cy="3" r="1" fill={GREEN} opacity="0.8" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: VIOLET }}>
            {tr(t, 'etfPremium', 'ETF Premium/Discount Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-white/15 uppercase tracking-wider">LIVE</span>
          <span className="w-1.5 h-1.5 bg-violet-400/60 animate-pulse" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {isLoading && !premiumData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-violet-400/60 uppercase tracking-widest font-mono font-bold">
              LOADING...
            </span>
          </div>
        ) : premiumData ? (
          <>
            {/* Summary Bar */}
            {premiumData.summary && <SummaryBar summary={premiumData.summary} />}

            {/* ETF Table */}
            <EtfTable etfs={premiumData.etfs ?? []} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase font-mono">
            NO DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
