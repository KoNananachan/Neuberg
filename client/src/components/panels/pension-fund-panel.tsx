import { useState, useMemo } from 'react';
import { usePensionFund } from '../../api/hooks/use-pension-fund';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtAssets(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'T';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'B';
  return '$' + n.toFixed(1) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtRatio(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtSurplus(n: number): string {
  const abs = Math.abs(n);
  const prefix = n >= 0 ? '+$' : '-$';
  if (abs >= 1e6) return prefix + (abs / 1e6).toFixed(1) + 'T';
  if (abs >= 1e3) return prefix + (abs / 1e3).toFixed(1) + 'B';
  return prefix + abs.toFixed(1) + 'M';
}

function fmtNumber(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

const AMBER = '#fbbf24';

function fundedColor(ratio: number): string {
  if (ratio >= 100) return 'text-green-400';
  if (ratio >= 80) return 'text-yellow-400';
  return 'text-red-400';
}

function returnColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/40';
}

// ── Types (loose — API returns any) ──

interface PensionFund {
  name: string;
  country: string;
  totalAssets: number;
  fundedRatio: number;
  ytdReturn: number;
  return1y: number;
  return5y: number;
  return10y: number;
  allocation: {
    equities: number;
    fixedIncome: number;
    alternatives: number;
    realEstate: number;
    cash: number;
  };
  surplus: number;
  trackingError: number;
  informationRatio: number;
  sharpeRatio: number;
  contributions: number[];
  benefitPayments: number[];
}

interface PensionData {
  summary: {
    totalGlobalAssets: number;
    averageFundedRatio: number;
    averageReturn: number;
  };
  funds: PensionFund[];
  timestamp: string;
}

// ── Stacked Allocation Bar ──

const ALLOC_COLORS: { key: keyof PensionFund['allocation']; color: string; label: string }[] = [
  { key: 'equities', color: '#60a5fa', label: 'Equities' },
  { key: 'fixedIncome', color: '#34d399', label: 'Fixed Income' },
  { key: 'alternatives', color: '#a78bfa', label: 'Alternatives' },
  { key: 'realEstate', color: '#fb923c', label: 'Real Estate' },
  { key: 'cash', color: '#94a3b8', label: 'Cash' },
];

function AllocationBar({ allocation }: { allocation: PensionFund['allocation'] }) {
  return (
    <div>
      <div className="h-2.5 w-full flex overflow-hidden bg-white/[0.03]">
        {ALLOC_COLORS.map(({ key, color }) => {
          const pct = allocation[key] ?? 0;
          if (pct <= 0) return null;
          return (
            <div
              key={key}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.75 }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {ALLOC_COLORS.map(({ key, color, label }) => {
          const pct = allocation[key] ?? 0;
          if (pct <= 0) return null;
          return (
            <div key={key} className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5" style={{ backgroundColor: color, opacity: 0.75 }} />
              <span className="text-[6px] font-mono text-white/30">
                {label} {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cash Flow Mini Chart ──

function CashFlowChart({ contributions, payments }: { contributions: number[]; payments: number[] }) {
  const W = 160;
  const H = 40;
  const PAD_X = 4;
  const PAD_Y = 4;

  const chartH = H - PAD_Y * 2;
  const n = Math.max(contributions.length, payments.length);
  if (n < 2) return null;

  const allVals = [...contributions, ...payments];
  const maxV = Math.max(...allVals, 1);

  const chartW = W - PAD_X * 2;
  const barW = chartW / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 50 }}>
      {/* Grid lines */}
      <line x1={PAD_X} y1={PAD_Y} x2={W - PAD_X} y2={PAD_Y} stroke="rgba(255,255,255,0.03)" strokeWidth={0.3} />
      <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.3} />

      {contributions.map((v, i) => {
        const x = PAD_X + i * barW;
        const h = (v / maxV) * chartH;
        const y = PAD_Y + chartH - h;
        return (
          <rect
            key={`c-${i}`}
            x={x + barW * 0.05}
            y={y}
            width={barW * 0.4}
            height={Math.max(h, 0.5)}
            fill="rgba(52,211,153,0.5)"
          />
        );
      })}
      {payments.map((v, i) => {
        const x = PAD_X + i * barW;
        const h = (v / maxV) * chartH;
        const y = PAD_Y + chartH - h;
        return (
          <rect
            key={`p-${i}`}
            x={x + barW * 0.5}
            y={y}
            width={barW * 0.4}
            height={Math.max(h, 0.5)}
            fill="rgba(248,113,113,0.5)"
          />
        );
      })}

      {/* Legend */}
      <rect x={PAD_X} y={1} width={4} height={3} fill="rgba(52,211,153,0.6)" />
      <text x={PAD_X + 6} y={3.5} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">CONTRIB</text>
      <rect x={PAD_X + 40} y={1} width={4} height={3} fill="rgba(248,113,113,0.6)" />
      <text x={PAD_X + 48} y={3.5} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">BENEFITS</text>
    </svg>
  );
}

// ── Funded Status Badge ──

function FundedBadge({ ratio, surplus, t }: { ratio: number; surplus: number; t: ReturnType<typeof useT> }) {
  let label: string;
  let textColor: string;
  let bgStyle: string;

  if (ratio >= 100) {
    label = tr(t, 'pfOverfunded', 'OVERFUNDED');
    textColor = 'text-green-400';
    bgStyle = 'bg-green-500/10 border border-green-500/30';
  } else if (ratio >= 80) {
    label = tr(t, 'pfUnderfunded', 'UNDERFUNDED');
    textColor = 'text-yellow-400';
    bgStyle = 'bg-yellow-500/10 border border-yellow-500/30';
  } else {
    label = tr(t, 'pfCritical', 'CRITICAL');
    textColor = 'text-red-400';
    bgStyle = 'bg-red-500/10 border border-red-500/30';
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-1 py-0.5 text-[6px] font-black font-mono uppercase tracking-wider ${textColor} ${bgStyle}`}>
        {label}
      </span>
      <span className={`text-[8px] font-mono font-bold ${surplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {fmtSurplus(surplus)}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PensionFundPanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = usePensionFund();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = rawData as PensionData | undefined;

  const selectedFund = useMemo(() => {
    if (!data?.funds?.length) return null;
    if (hoveredIndex !== null && hoveredIndex < data.funds.length) return data.funds[hoveredIndex];
    return data.funds[0];
  }, [data, hoveredIndex]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: AMBER }}>
            {tr(t, 'panelPensionFund', 'Pension Fund Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                LOADING PENSION DATA...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
              {tr(t, 'pfLoadError', 'Failed to load pension data')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[9px] font-mono text-amber-400 hover:text-white border border-amber-400/30 px-2 py-0.5 transition-colors"
            >
              {tr(t, 'retry', 'Retry')}
            </button>
          </div>
        )}

        {/* No data */}
        {!isLoading && !error && !data && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'pfNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Summary Bar */}
            <div className="flex gap-0 border-b border-border/20">
              <div className="flex-1 px-2 py-1.5 border-r border-white/[0.06] bg-white/[0.01]">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  {tr(t, 'pfGlobalAssets', 'Global Pension Assets')}
                </div>
                <div className="text-[10px] font-bold" style={{ color: AMBER }}>
                  {fmtAssets(data.summary.totalGlobalAssets)}
                </div>
              </div>
              <div className="flex-1 px-2 py-1.5 border-r border-white/[0.06] bg-white/[0.01]">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  {tr(t, 'pfAvgFunded', 'Avg Funded Ratio')}
                </div>
                <div className={`text-[10px] font-bold ${fundedColor(data.summary.averageFundedRatio)}`}>
                  {fmtRatio(data.summary.averageFundedRatio)}
                </div>
              </div>
              <div className="flex-1 px-2 py-1.5 bg-white/[0.01]">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  {tr(t, 'pfAvgReturn', 'Avg Return')}
                </div>
                <div className={`text-[10px] font-bold ${returnColor(data.summary.averageReturn)}`}>
                  {fmtPct(data.summary.averageReturn)}
                </div>
              </div>
            </div>

            {/* Major Funds Table */}
            <div className="border-b border-border/20">
              <div className="px-3 py-1 border-b border-border/10">
                <span className="text-[8px] font-black uppercase tracking-wider text-white/30">
                  {tr(t, 'pfMajorFunds', 'Major Pension Funds')}
                </span>
              </div>

              {/* Table header */}
              <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/25 uppercase tracking-wider gap-1">
                <span className="w-28 shrink-0">FUND</span>
                <span className="w-10 shrink-0">CTRY</span>
                <span className="w-16 text-right shrink-0">ASSETS</span>
                <span className="w-14 text-right shrink-0">FUNDED</span>
                <span className="w-12 text-right shrink-0">YTD</span>
                <span className="w-12 text-right shrink-0">1Y</span>
                <span className="w-12 text-right shrink-0">5Y</span>
                <span className="w-12 text-right shrink-0">10Y</span>
              </div>

              {/* Fund rows */}
              <div className="max-h-[220px] overflow-auto no-scrollbar">
                {data.funds.map((fund: PensionFund, idx: number) => (
                  <div
                    key={fund.name}
                    className={`flex items-center px-2 py-1 border-b border-white/[0.03] gap-1 transition-colors cursor-pointer hover:bg-amber-400/[0.02] ${
                      hoveredIndex === idx ? 'bg-amber-400/[0.04]' : ''
                    }`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <span className="w-28 shrink-0 text-white/80 font-bold truncate text-[8px]">
                      {fund.name}
                    </span>
                    <span className="w-10 shrink-0 text-white/30 text-[8px]">
                      {fund.country}
                    </span>
                    <span className="w-16 text-right shrink-0 text-white/60 text-[8px]">
                      {fmtAssets(fund.totalAssets)}
                    </span>
                    <span className={`w-14 text-right shrink-0 font-bold text-[8px] ${fundedColor(fund.fundedRatio)}`}>
                      {fmtRatio(fund.fundedRatio)}
                    </span>
                    <span className={`w-12 text-right shrink-0 font-bold text-[8px] ${returnColor(fund.ytdReturn)}`}>
                      {fmtPct(fund.ytdReturn)}
                    </span>
                    <span className={`w-12 text-right shrink-0 text-[8px] ${returnColor(fund.return1y)}`}>
                      {fmtPct(fund.return1y)}
                    </span>
                    <span className={`w-12 text-right shrink-0 text-[8px] ${returnColor(fund.return5y)}`}>
                      {fmtPct(fund.return5y)}
                    </span>
                    <span className={`w-12 text-right shrink-0 text-[8px] ${returnColor(fund.return10y)}`}>
                      {fmtPct(fund.return10y)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Fund Detail */}
            {selectedFund && (
              <>
                {/* Asset Allocation */}
                <div className="border-b border-border/20">
                  <div className="px-3 py-1 border-b border-border/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-wider text-white/30">
                        {tr(t, 'pfAssetAllocation', 'Asset Allocation')}
                      </span>
                      <span className="text-[8px] font-bold" style={{ color: AMBER }}>
                        {selectedFund.name}
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <AllocationBar allocation={selectedFund.allocation} />
                  </div>
                </div>

                {/* Funded Status */}
                <div className="border-b border-border/20">
                  <div className="px-3 py-1 border-b border-border/10">
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/30">
                      {tr(t, 'pfFundedStatus', 'Funded Status')}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <FundedBadge ratio={selectedFund.fundedRatio} surplus={selectedFund.surplus} t={t} />
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] text-white/30 uppercase">Funded:</span>
                        <div className="w-24 h-1.5 bg-white/[0.03] overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min(selectedFund.fundedRatio, 120) / 1.2}%`,
                              backgroundColor: selectedFund.fundedRatio >= 100
                                ? 'rgba(74,222,128,0.6)'
                                : selectedFund.fundedRatio >= 80
                                  ? 'rgba(250,204,21,0.6)'
                                  : 'rgba(248,113,113,0.6)',
                            }}
                          />
                        </div>
                        <span className={`text-[7px] font-bold ${fundedColor(selectedFund.fundedRatio)}`}>
                          {fmtRatio(selectedFund.fundedRatio)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance vs Benchmark */}
                <div className="border-b border-border/20">
                  <div className="px-3 py-1 border-b border-border/10">
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/30">
                      {tr(t, 'pfPerfBenchmark', 'Performance vs Benchmark')}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="px-2 py-1.5 border border-border/20">
                        <div className="text-[7px] text-white/30 uppercase tracking-wider">
                          {tr(t, 'pfTrackingError', 'Tracking Error')}
                        </div>
                        <div className="text-[10px] font-bold text-white">
                          {fmtNumber(selectedFund.trackingError)}%
                        </div>
                      </div>
                      <div className="px-2 py-1.5 border border-border/20">
                        <div className="text-[7px] text-white/30 uppercase tracking-wider">
                          {tr(t, 'pfInfoRatio', 'Information Ratio')}
                        </div>
                        <div className={`text-[10px] font-bold ${selectedFund.informationRatio >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtNumber(selectedFund.informationRatio)}
                        </div>
                      </div>
                      <div className="px-2 py-1.5 border border-amber-400/30 bg-amber-400/5">
                        <div className="text-[7px] text-white/30 uppercase tracking-wider">
                          {tr(t, 'pfSharpe', 'Sharpe Ratio')}
                        </div>
                        <div className="text-[10px] font-bold" style={{ color: AMBER }}>
                          {fmtNumber(selectedFund.sharpeRatio)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Flow Trend */}
                {selectedFund.contributions?.length > 0 && (
                  <div className="border-b border-border/20">
                    <div className="px-3 py-1 border-b border-border/10">
                      <span className="text-[8px] font-black uppercase tracking-wider text-white/30">
                        {tr(t, 'pfCashFlow', 'Cash Flow Trend')}
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      <CashFlowChart
                        contributions={selectedFund.contributions}
                        payments={selectedFund.benefitPayments}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Timestamp */}
            <div className="px-3 py-1.5">
              <span className="text-[7px] text-white/15">
                {tr(t, 'pfLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
