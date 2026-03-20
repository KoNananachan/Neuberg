import { useState } from 'react';
import { useBondFuturesBasis } from '../../api/hooks/use-bond-futures-basis';
import { useT, tr, TFn } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContractData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeliverableBond = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeliveryOptions = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisTradeSummary = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisHistoryPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RollAnalysis = any;

// ── Formatting helpers ──

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(4);
}

function fmtCoupon(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtCF(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(4);
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

function fmtDv01(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(2)}`;
}

function fmtTicks(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
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

function optionValueColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 1) return 'text-purple-400';
  if (n > 0) return 'text-neutral-300';
  return 'text-neutral-600';
}

// ── Contract tab definitions ──

const CONTRACT_TABS = [
  { key: 'ZT', label: 'ZT 2Y' },
  { key: 'ZF', label: 'ZF 5Y' },
  { key: 'ZN', label: 'ZN 10Y' },
  { key: 'ZB', label: 'ZB 30Y' },
  { key: 'UB', label: 'Ultra' },
] as const;

// ── Sparkline component ──

function BasisSparkline({ history }: { history: BasisHistoryPoint[] }) {
  if (!history || history.length === 0) return null;

  const values: number[] = history.map((h: BasisHistoryPoint) => h?.netBasis ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 200;
  const height = 28;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const lastValue = values[values.length - 1];
  const firstValue = values[0];
  const strokeColor = lastValue >= firstValue ? '#a78bfa' : '#f87171';

  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line
          x1={padding}
          y1={height - padding - ((0 - min) / range) * (height - padding * 2)}
          x2={width - padding}
          y2={height - padding - ((0 - min) / range) * (height - padding * 2)}
          stroke="#525252"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )}
    </svg>
  );
}

// ── Main Panel ──

export function BondFuturesBasisPanel() {
  const t = useT();
  const { data, isLoading, error } = useBondFuturesBasis();
  const [activeContract, setActiveContract] = useState<string>('ZN');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'bfbError', 'Failed to load bond futures basis data')}
        </div>
      </div>
    );
  }

  const contractData: ContractData = data?.contracts?.[activeContract] ?? {};
  const ctd: DeliverableBond | null = contractData?.ctd ?? null;
  const deliverables: DeliverableBond[] = contractData?.deliverables ?? [];
  const deliveryOptions: DeliveryOptions = contractData?.deliveryOptions ?? {};
  const tradeSummary: BasisTradeSummary = contractData?.tradeSummary ?? {};
  const basisHistory: BasisHistoryPoint[] = contractData?.basisHistory ?? [];
  const rollAnalysis: RollAnalysis = contractData?.rollAnalysis ?? {};

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-purple-400">
            {tr(t, 'panelBondFuturesBasis', 'Bond Futures Basis / DLV Analysis')}
          </span>
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {activeContract}
        </span>
      </div>

      {/* Contract Selector Tabs */}
      <div className="flex items-center gap-0 border-b border-purple-400/20 bg-[#030303] shrink-0">
        {CONTRACT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveContract(tab.key)}
            className={`px-3 py-1 text-[8px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeContract === tab.key
                ? 'text-purple-400 border-purple-400 bg-purple-400/[0.05]'
                : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-purple-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* CTD Highlight */}
        {ctd && <CtdHighlight ctd={ctd} t={t} />}

        {/* Deliverable Basket Table */}
        {deliverables.length > 0 && <DeliverableBasketTable bonds={deliverables} t={t} />}

        {/* Delivery Options */}
        <DeliveryOptionsSection options={deliveryOptions} t={t} />

        {/* Basis Trade Summary */}
        <BasisTradeSummarySection summary={tradeSummary} t={t} />

        {/* Historical Basis Sparkline */}
        {basisHistory.length > 0 && (
          <HistoricalBasisSection history={basisHistory} contract={activeContract} t={t} />
        )}

        {/* Roll Analysis */}
        <RollAnalysisSection roll={rollAnalysis} t={t} />
      </div>
    </div>
  );
}

// ── CTD Highlight ──

function CtdHighlight({ ctd, t }: { ctd: DeliverableBond; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-purple-400/20 bg-[#030303]">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
          {tr(t, 'bfbCtdTitle', 'Cheapest-to-Deliver')}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-0 divide-x divide-border/10 px-2 py-1.5">
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbCusip', 'CUSIP')}
          </div>
          <div className="text-[10px] font-bold text-purple-400">
            {ctd?.cusip ?? '-'}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbCoupon', 'Coupon')}
          </div>
          <div className="text-[10px] font-bold text-white">
            {fmtCoupon(ctd?.coupon)}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbMaturity', 'Maturity')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {ctd?.maturity ?? '-'}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbConvFactor', 'Conv Factor')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {fmtCF(ctd?.conversionFactor)}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbNetBasis', 'Net Basis')}
          </div>
          <div className={`text-[10px] font-bold ${basisColor(ctd?.netBasis)}`}>
            {fmtBasis(ctd?.netBasis)}
            <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deliverable Basket Table ──

function DeliverableBasketTable({
  bonds,
  t,
}: {
  bonds: DeliverableBond[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bfbDelivBasket', 'Deliverable Basket')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[72px_48px_64px_52px_52px_52px_56px_32px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'bfbCusip', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbCpn', 'Cpn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbMat', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbCF', 'CF')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbGross', 'Gross')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbNet', 'Net')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'bfbImplRepo', 'Impl Rp%')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'bfbCtd', 'CTD')}
        </span>
      </div>

      {/* Rows */}
      {bonds.map((bond: DeliverableBond, i: number) => (
        <div
          key={bond?.cusip ?? i}
          className={`grid grid-cols-[72px_48px_64px_52px_52px_52px_56px_32px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center ${
            bond?.isCTD ? 'bg-purple-400/[0.04]' : ''
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-purple-400">
            {bond?.cusip ?? '-'}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {fmtCoupon(bond?.coupon)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {bond?.maturity ?? '-'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtCF(bond?.conversionFactor)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(bond?.grossBasis)}`}>
            {fmtBasis(bond?.grossBasis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(bond?.netBasis)}`}>
            {fmtBasis(bond?.netBasis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${repoColor(bond?.impliedRepo)}`}>
            {fmtRate(bond?.impliedRepo)}
          </span>
          <span className="text-[8px] font-mono text-center">
            {bond?.isCTD ? (
              <span className="text-green-400 font-bold">&#10003;</span>
            ) : (
              <span className="text-neutral-700">-</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Delivery Options ──

function DeliveryOptionsSection({
  options,
  t,
}: {
  options: DeliveryOptions;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { label: tr(t, 'bfbTimingOpt', 'Timing Option'), value: options?.timing },
    { label: tr(t, 'bfbQualityOpt', 'Quality Option'), value: options?.quality },
    { label: tr(t, 'bfbEomOpt', 'EOM Option'), value: options?.endOfMonth },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bfbDelivOptions', 'Delivery Options')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-0 divide-x divide-border/10">
        {items.map((item) => (
          <div key={item.label} className="px-3 py-1.5 text-center">
            <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className={`text-[10px] font-bold ${optionValueColor(item.value)}`}>
              {item.value != null ? fmtTicks(item.value) : '-'}
              {item.value != null && (
                <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Basis Trade Summary ──

function BasisTradeSummarySection({
  summary,
  t,
}: {
  summary: BasisTradeSummary;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    { label: tr(t, 'bfbNetBasisSum', 'Net Basis'), value: fmtBasis(summary?.netBasis), color: basisColor(summary?.netBasis), unit: '/32' },
    { label: tr(t, 'bfbCarry', 'Carry'), value: fmtBps(summary?.carry), color: changeColor(summary?.carry), unit: 'bp' },
    { label: tr(t, 'bfbRoll', 'Roll'), value: fmtBps(summary?.roll), color: changeColor(summary?.roll), unit: 'bp' },
    { label: tr(t, 'bfbBasisDv01', 'Basis DV01/Ct'), value: fmtDv01(summary?.basisDv01), color: 'text-white', unit: '' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bfbTradeSummary', 'Basis Trade Summary')}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-0 divide-x divide-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-1.5 text-center">
            <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[10px] font-bold ${m.color}`}>
              {m.value}
              {m.unit && <span className="text-[7px] text-neutral-600 ml-0.5">{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Historical Basis Sparkline ──

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
  const change = (latest?.netBasis ?? 0) - (oldest?.netBasis ?? 0);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bfbHistBasis', `${contract} Net Basis — 20D`)}
        </span>
      </div>

      <div className="flex items-center gap-4 px-3 py-2">
        <BasisSparkline history={history} />
        <div className="flex flex-col gap-0.5">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbCurrent', 'Current')}
          </div>
          <div className={`text-[10px] font-bold ${basisColor(latest?.netBasis)}`}>
            {fmtBasis(latest?.netBasis)}
          </div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mt-1">
            {tr(t, 'bfbChg20d', '20D Chg')}
          </div>
          <div className={`text-[10px] font-bold ${changeColor(change)}`}>
            {fmtBasis(change)}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 ml-2">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbHigh', 'High')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {fmtBasis(Math.max(...history.map((h: BasisHistoryPoint) => h?.netBasis ?? 0)))}
          </div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mt-1">
            {tr(t, 'bfbLow', 'Low')}
          </div>
          <div className="text-[10px] font-bold text-neutral-300">
            {fmtBasis(Math.min(...history.map((h: BasisHistoryPoint) => h?.netBasis ?? 0)))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roll Analysis ──

function RollAnalysisSection({
  roll,
  t,
}: {
  roll: RollAnalysis;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bfbRollAnalysis', 'Roll Analysis')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-border/10">
        {/* Current Contract */}
        <div className="px-3 py-1.5">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-1">
            {tr(t, 'bfbFrontContract', 'Front Contract')}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold text-purple-400">
              {roll?.frontContract ?? '-'}
            </span>
            <span className="text-[8px] text-neutral-400">
              {fmtPrice(roll?.frontPrice)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div>
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">OI </span>
              <span className="text-[8px] text-neutral-300">
                {roll?.frontOI != null ? roll.frontOI.toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Vol </span>
              <span className="text-[8px] text-neutral-300">
                {roll?.frontVolume != null ? roll.frontVolume.toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Contract */}
        <div className="px-3 py-1.5">
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider mb-1">
            {tr(t, 'bfbBackContract', 'Back Contract')}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold text-neutral-300">
              {roll?.backContract ?? '-'}
            </span>
            <span className="text-[8px] text-neutral-400">
              {fmtPrice(roll?.backPrice)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div>
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">OI </span>
              <span className="text-[8px] text-neutral-300">
                {roll?.backOI != null ? roll.backOI.toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Vol </span>
              <span className="text-[8px] text-neutral-300">
                {roll?.backVolume != null ? roll.backVolume.toLocaleString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Spread */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-t border-border/10">
        <div>
          <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbCalSpread', 'Calendar Spread')}
          </span>
          <span className={`text-[10px] font-bold ml-2 ${changeColor(roll?.calendarSpread)}`}>
            {fmtTicks(roll?.calendarSpread)}
            <span className="text-[7px] text-neutral-600 ml-0.5">/32</span>
          </span>
        </div>
        <div>
          <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbSpreadChg', 'Chg')}
          </span>
          <span className={`text-[10px] font-bold ml-2 ${changeColor(roll?.spreadChange)}`}>
            {fmtTicks(roll?.spreadChange)}
          </span>
        </div>
        <div>
          <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {tr(t, 'bfbRollDays', 'Days to Roll')}
          </span>
          <span className="text-[10px] font-bold text-white ml-2">
            {roll?.daysToRoll ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
