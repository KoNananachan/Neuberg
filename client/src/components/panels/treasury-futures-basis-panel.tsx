import { useState } from 'react';
import { useTreasuryFuturesBasis } from '../../api/hooks/use-treasury-futures-basis';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// ── Local types ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FuturesContract = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CtdBond = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeliveryOptionValue = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisHistoryPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImpliedRepoPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CalendarSpread = any;

// ── Formatting helpers ──

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(4);
}

function fmtDv01(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(2)}`;
}

function fmtBasis(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtCoupon(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtCF(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(4);
}

function fmtTicks(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

function basisColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 2) return 'text-green-400';
  if (n > 0) return 'text-neutral-300';
  if (n < -2) return 'text-red-400';
  return 'text-neutral-500';
}

function repoColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 5) return 'text-green-400';
  if (n > 0) return 'text-neutral-300';
  if (n < -5) return 'text-red-400';
  return 'text-yellow-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function optionColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 1) return 'text-blue-400';
  if (n > 0) return 'text-neutral-300';
  return 'text-neutral-600';
}

// ── SVG Chart: Historical Basis (30D) ──

function HistoricalBasisChart({ history }: { history: BasisHistoryPoint[] }) {
  if (!history || history.length < 2) return null;

  const width = 320;
  const height = 80;
  const padX = 28;
  const padY = 12;
  const padBottom = 16;

  const values: number[] = history.map((h: BasisHistoryPoint) => h?.basis ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Area fill
  const firstX = padX;
  const lastX = padX + chartW;
  const bottomY = padY + chartH;
  const areaPoints = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const color = lastVal >= firstVal ? '#60a5fa' : '#f87171';

  // Y-axis labels
  const yLabels = [min, min + range / 2, max];

  // Zero line
  const hasZero = min < 0 && max > 0;
  const zeroY = padY + chartH - ((0 - min) / range) * chartH;

  return (
    <svg width={width} height={height} className="block w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yLabels.map((val, i) => {
        const y = padY + chartH - ((val - min) / range) * chartH;
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#262626" strokeWidth="0.5" />
            <text x={padX - 3} y={y + 2.5} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="end">
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {hasZero && (
        <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke="#525252" strokeWidth="0.5" strokeDasharray="2,2" />
      )}

      {/* Area */}
      <polygon points={areaPoints} fill={color} fillOpacity="0.08" />

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />

      {/* X-axis labels */}
      <text x={padX} y={height - 2} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="start">
        {history[0]?.date ?? '-30D'}
      </text>
      <text x={width - padX} y={height - 2} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="end">
        {history[history.length - 1]?.date ?? 'NOW'}
      </text>

      {/* Last value dot */}
      {(() => {
        const lx = padX + ((values.length - 1) / (values.length - 1)) * chartW;
        const ly = padY + chartH - ((lastVal - min) / range) * chartH;
        return <circle cx={lx} cy={ly} r="2" fill={color} />;
      })()}
    </svg>
  );
}

// ── SVG Chart: Implied Repo Term Structure ──

function ImpliedRepoTermStructureChart({ data }: { data: ImpliedRepoPoint[] }) {
  if (!data || data.length < 2) return null;

  const width = 320;
  const height = 72;
  const padX = 28;
  const padY = 10;
  const padBottom = 16;

  const values: number[] = data.map((d: ImpliedRepoPoint) => d?.rate ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;

  const barWidth = Math.min(16, (chartW / data.length) * 0.6);
  const gap = (chartW - barWidth * data.length) / (data.length - 1 || 1);

  // Reference line (overnight rate)
  const refRate = data[0]?.rate ?? 0;
  const refY = padY + chartH - ((refRate - min) / range) * chartH;

  return (
    <svg width={width} height={height} className="block w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Reference line */}
      <line x1={padX} y1={refY} x2={width - padX} y2={refY} stroke="#525252" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x={padX - 3} y={refY + 2.5} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="end">
        {refRate.toFixed(1)}%
      </text>

      {/* Y-axis top/bottom */}
      <text x={padX - 3} y={padY + 3} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="end">
        {max.toFixed(1)}%
      </text>
      <text x={padX - 3} y={padY + chartH + 3} fill="#525252" fontSize="6" fontFamily="monospace" textAnchor="end">
        {min.toFixed(1)}%
      </text>

      {/* Bars */}
      {data.map((d: ImpliedRepoPoint, i: number) => {
        const x = padX + i * (barWidth + gap);
        const barH = ((d?.rate ?? 0) - min) / range * chartH;
        const y = padY + chartH - barH;
        const barColor = (d?.rate ?? 0) >= refRate ? '#60a5fa' : '#f87171';

        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} fill={barColor} fillOpacity="0.7" />
            <text x={x + barWidth / 2} y={height - 2} fill="#525252" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
              {d?.tenor ?? ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Contract tab definitions ──

const CONTRACT_TABS = [
  { key: 'ZT', label: '2Y' },
  { key: 'ZF', label: '5Y' },
  { key: 'ZN', label: '10Y' },
  { key: 'ZB', label: '30Y' },
  { key: 'UB', label: 'ULTRA' },
] as const;

// ── Main Panel ──

export function TreasuryFuturesBasisPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTreasuryFuturesBasis();
  const [activeTab, setActiveTab] = useState<string>('ZN');

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'tfbError', 'Failed to load treasury futures basis data')}
        </div>
      </div>
    );
  }

  const contracts: FuturesContract[] = data?.contracts ?? [];
  const ctdAnalysis = data?.ctdAnalysis?.[activeTab] ?? {};
  const deliveryOptions: DeliveryOptionValue[] = data?.deliveryOptions?.[activeTab] ?? [];
  const basisHistory: BasisHistoryPoint[] = data?.basisHistory?.[activeTab] ?? [];
  const impliedRepoTermStructure: ImpliedRepoPoint[] = data?.impliedRepoTermStructure?.[activeTab] ?? [];
  const calendarSpreads: CalendarSpread[] = data?.calendarSpreads ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-blue-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'panelTreasuryFuturesBasis', 'Treasury Futures Basis')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contract Selector Tabs */}
      <div className="flex items-center gap-0 border-b border-blue-400/20 bg-[#030303] shrink-0">
        {CONTRACT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-[8px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-blue-400 border-blue-400 bg-blue-400/[0.05]'
                : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-blue-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Futures Contracts Table */}
        {contracts.length > 0 && <FuturesContractsTable contracts={contracts} activeTab={activeTab} t={t} />}

        {/* CTD Analysis */}
        <CtdAnalysisSection ctd={ctdAnalysis} t={t} />

        {/* Delivery Option Values */}
        {deliveryOptions.length > 0 && <DeliveryOptionsSection options={deliveryOptions} t={t} />}

        {/* Historical Basis Chart (30D) */}
        {basisHistory.length > 0 && (
          <HistoricalBasisSection history={basisHistory} contract={activeTab} t={t} />
        )}

        {/* Implied Repo Term Structure */}
        {impliedRepoTermStructure.length > 0 && (
          <ImpliedRepoSection data={impliedRepoTermStructure} t={t} />
        )}

        {/* Calendar Spread Table */}
        {calendarSpreads.length > 0 && <CalendarSpreadTable spreads={calendarSpreads} t={t} />}
      </div>
    </div>
  );
}

// ── Futures Contracts Table ──

function FuturesContractsTable({
  contracts,
  activeTab,
  t,
}: {
  contracts: FuturesContract[];
  activeTab: string;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbContractsTitle', 'Futures Contracts')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[80px_56px_52px_80px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'tfbContract', 'Contract')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbDv01', 'DV01')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbCtd', 'CTD')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbBasis', 'Basis')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbImplRepo', 'Impl Repo')}
        </span>
      </div>

      {/* Rows */}
      {contracts.map((c: FuturesContract, i: number) => {
        const isActive = c?.symbol === activeTab || c?.contract?.startsWith?.(activeTab);
        return (
          <div
            key={c?.contract ?? i}
            className={`grid grid-cols-[80px_56px_52px_80px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center ${
              isActive ? 'bg-blue-400/[0.04]' : ''
            }`}
          >
            <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
              {c?.contract ?? '-'}
            </span>
            <span className="text-[8px] font-mono text-white text-right font-bold">
              {fmtPrice(c?.price)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtDv01(c?.dv01)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right truncate">
              {c?.ctd ?? '-'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${basisColor(c?.basis)}`}>
              {fmtBasis(c?.basis)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${repoColor(c?.impliedRepo)}`}>
              {fmtRate(c?.impliedRepo)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── CTD Analysis Section ──

function CtdAnalysisSection({
  ctd,
  t,
}: {
  ctd: CtdBond;
  t: ReturnType<typeof useT>;
}) {
  const bond = ctd?.bond ?? {};
  const metrics = ctd?.metrics ?? {};

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbCtdAnalysis', 'CTD Analysis')}
        </span>
      </div>

      {/* Bond identification */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-border/10 px-2 py-1.5 bg-[#030303]">
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbCusip', 'CUSIP')}
          </div>
          <div className="text-[10px] font-bold text-blue-400">
            {bond?.cusip ?? '-'}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbCoupon', 'Coupon')}
          </div>
          <div className="text-[10px] font-bold text-white">
            {fmtCoupon(bond?.coupon)}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbMaturity', 'Maturity')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {bond?.maturity ?? '-'}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbConvFactor', 'Conv Factor')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {fmtCF(bond?.conversionFactor)}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-5 gap-0 divide-x divide-border/10 px-2 py-1.5">
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbGrossBasis', 'Gross Basis')}
          </div>
          <div className={`text-[10px] font-bold ${basisColor(metrics?.grossBasis)}`}>
            {fmtBasis(metrics?.grossBasis)}
            <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbNetBasis', 'Net Basis')}
          </div>
          <div className={`text-[10px] font-bold ${basisColor(metrics?.netBasis)}`}>
            {fmtBasis(metrics?.netBasis)}
            <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbCarry', 'Carry')}
          </div>
          <div className={`text-[10px] font-bold ${changeColor(metrics?.carry)}`}>
            {fmtBps(metrics?.carry)}
            <span className="text-[7px] text-neutral-600 ml-0.5">bp</span>
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbImplRepoRate', 'Impl Repo')}
          </div>
          <div className={`text-[10px] font-bold ${repoColor(metrics?.impliedRepo)}`}>
            {fmtRate(metrics?.impliedRepo)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbBasisDv01', 'Basis DV01')}
          </div>
          <div className="text-[10px] font-bold text-white">
            {fmtDv01(metrics?.basisDv01)}
          </div>
        </div>
      </div>

      {/* Switch probability */}
      {metrics?.switchProbability != null && (
        <div className="flex items-center gap-2 px-3 py-1 border-t border-border/10">
          <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'tfbSwitchProb', 'CTD Switch Probability')}
          </span>
          <div className="flex-1 h-1 bg-neutral-800">
            <div
              className="h-full bg-blue-400"
              style={{ width: `${Math.min(100, Math.max(0, metrics.switchProbability))}%` }}
            />
          </div>
          <span className="text-[8px] font-bold text-blue-400">
            {metrics.switchProbability.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ── Delivery Option Values ──

function DeliveryOptionsSection({
  options,
  t,
}: {
  options: DeliveryOptionValue[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbDelivOptions', 'Delivery Option Values')}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-0 divide-x divide-border/10">
        {options.slice(0, 4).map((opt: DeliveryOptionValue, i: number) => (
          <div key={opt?.name ?? i} className="px-3 py-1.5 text-center">
            <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
              {opt?.name ?? '-'}
            </div>
            <div className={`text-[10px] font-bold ${optionColor(opt?.value)}`}>
              {fmtTicks(opt?.value)}
              {opt?.value != null && (
                <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
              )}
            </div>
            {opt?.change != null && (
              <div className={`text-[7px] ${changeColor(opt.change)}`}>
                {fmtBps(opt.change)}
                <span className="text-neutral-600 ml-0.5">1D</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional options overflow */}
      {options.length > 4 && (
        <div className="grid grid-cols-4 gap-0 divide-x divide-border/10 border-t border-border/10">
          {options.slice(4, 8).map((opt: DeliveryOptionValue, i: number) => (
            <div key={opt?.name ?? i} className="px-3 py-1.5 text-center">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
                {opt?.name ?? '-'}
              </div>
              <div className={`text-[10px] font-bold ${optionColor(opt?.value)}`}>
                {fmtTicks(opt?.value)}
                {opt?.value != null && (
                  <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Historical Basis Section (SVG 30D Chart) ──

function HistoricalBasisSection({
  history,
  contract,
  t,
}: {
  history: BasisHistoryPoint[];
  contract: string;
  t: ReturnType<typeof useT>;
}) {
  const latest = history[history.length - 1];
  const oldest = history[0];
  const currentBasis = latest?.basis ?? 0;
  const change30d = currentBasis - (oldest?.basis ?? 0);
  const high = Math.max(...history.map((h: BasisHistoryPoint) => h?.basis ?? 0));
  const low = Math.min(...history.map((h: BasisHistoryPoint) => h?.basis ?? 0));

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbHistBasis', `${contract} Basis — 30D`)}
        </span>
        <div className="flex items-center gap-1">
          {change30d >= 0 ? (
            <TrendingUp className="w-2.5 h-2.5 text-green-400" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 text-red-400" />
          )}
          <span className={`text-[7px] font-bold ${changeColor(change30d)}`}>
            {fmtBasis(change30d)}
          </span>
        </div>
      </div>

      <div className="px-2 py-2">
        <HistoricalBasisChart history={history} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-border/10 px-2 py-1 border-t border-border/10">
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase">
            {tr(t, 'tfbCurrent', 'Current')}
          </div>
          <div className={`text-[9px] font-bold ${basisColor(currentBasis)}`}>
            {fmtBasis(currentBasis)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase">
            {tr(t, 'tfb30dChg', '30D Chg')}
          </div>
          <div className={`text-[9px] font-bold ${changeColor(change30d)}`}>
            {fmtBasis(change30d)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase">
            {tr(t, 'tfbHigh', 'High')}
          </div>
          <div className="text-[9px] font-bold text-neutral-300">
            {fmtBasis(high)}
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[7px] text-neutral-600 uppercase">
            {tr(t, 'tfbLow', 'Low')}
          </div>
          <div className="text-[9px] font-bold text-neutral-300">
            {fmtBasis(low)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Implied Repo Term Structure (SVG) ──

function ImpliedRepoSection({
  data,
  t,
}: {
  data: ImpliedRepoPoint[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbImplRepoTerm', 'Implied Repo Term Structure')}
        </span>
      </div>

      <div className="px-2 py-2">
        <ImpliedRepoTermStructureChart data={data} />
      </div>

      {/* Rate table */}
      <div className="grid grid-cols-6 gap-0 px-2 py-0.5 border-t border-border/10">
        {data.slice(0, 6).map((d: ImpliedRepoPoint, i: number) => (
          <div key={d?.tenor ?? i} className="text-center px-1 py-1">
            <div className="text-[7px] text-neutral-600 uppercase">
              {d?.tenor ?? '-'}
            </div>
            <div className={`text-[8px] font-bold ${repoColor(d?.rate)}`}>
              {fmtRate(d?.rate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar Spread Table ──

function CalendarSpreadTable({
  spreads,
  t,
}: {
  spreads: CalendarSpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tfbCalSpreads', 'Calendar Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[96px_56px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'tfbSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbFrontPx', 'Front Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbBackPx', 'Back Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbNetChg', 'Net Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbCarryVal', 'Carry')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'tfbVolume', 'Volume')}
        </span>
      </div>

      {/* Rows */}
      {spreads.map((s: CalendarSpread, i: number) => (
        <div
          key={s?.name ?? i}
          className="grid grid-cols-[96px_56px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
            {s?.name ?? '-'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {fmtPrice(s?.frontPrice)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPrice(s?.backPrice)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s?.netChange)}`}>
            {fmtSpread(s?.netChange)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s?.carry)}`}>
            {fmtBps(s?.carry)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {s?.volume != null ? s.volume.toLocaleString() : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}
