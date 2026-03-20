import { useCounterpartyRisk } from '../../api/hooks/use-counterparty-risk';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Types --

interface CounterpartyRow {
  name: string;
  rating: string;
  grossExposure: number;
  netExposure: number;
  cva: number;
  dva: number;
  pfe: number;
  limitUtilization: number;
}

interface NettingSummary {
  grossPositiveMtm: number;
  nettingBenefit: number;
  collateral: number;
  netExposure: number;
}

interface CvaDvaTotals {
  totalCva: number;
  totalDva: number;
  netCvaDva: number;
  change1d: number;
}

interface CounterpartyRiskData {
  counterparties: CounterpartyRow[];
  nettingSummary: NettingSummary;
  cvaDvaTotals: CvaDvaTotals;
  timestamp: string;
}

// -- Formatting helpers --

function fmtAmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// -- Color helpers --

function getRatingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-green-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function getUtilColor(pct: number): string {
  if (pct >= 90) return '#f87171';
  if (pct >= 75) return '#fb923c';
  if (pct >= 50) return '#fbbf24';
  return '#4ade80';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// -- Utilization Bar --

function UtilBar({ pct }: { pct: number }) {
  const color = getUtilColor(pct);
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[7px] font-mono tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// -- Main Panel --

export function CounterpartyRiskPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useCounterpartyRisk();
  const data = rawData as CounterpartyRiskData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            {tr(t, 'panelCounterpartyRisk', 'Counterparty Risk')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {/* Counterparty Exposure Table */}
            <CounterpartyTable counterparties={data?.counterparties} />

            {/* Netting Summary */}
            <NettingSummarySection summary={data?.nettingSummary} />

            {/* CVA/DVA Totals */}
            <CvaDvaTotalsSection totals={data?.cvaDvaTotals} />

            {/* Timestamp */}
            {data?.timestamp && (
              <div className="px-3 py-1.5 border-t border-border/10">
                <span className="text-[7px] font-mono text-neutral-700">
                  Last update: {new Date(data.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Counterparty Exposure Table --

function CounterpartyTable({
  counterparties,
}: {
  counterparties: CounterpartyRow[] | undefined;
}) {
  if (!counterparties || counterparties.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Counterparty Exposure
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_56px_44px_44px_48px_56px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">
          Name
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-center">
          Rtg
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">
          Gross
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">
          Net
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">
          CVA
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">
          DVA
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">
          PFE
        </span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right pr-2">
          Limit %
        </span>
      </div>

      {/* Rows */}
      {counterparties.map((cp, i) => (
        <div
          key={`${cp.name}-${i}`}
          className="grid grid-cols-[1fr_40px_56px_56px_44px_44px_48px_56px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {cp.name}
          </span>
          <span className={`text-[8px] font-mono font-bold text-center ${getRatingColor(cp.rating)}`}>
            {cp.rating}
          </span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-300">
            {fmtAmt(cp.grossExposure)}
          </span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-white">
            {fmtAmt(cp.netExposure)}
          </span>
          <span className="text-[8px] font-mono tabular-nums text-right text-red-400">
            {fmtAmt(cp.cva)}
          </span>
          <span className="text-[8px] font-mono tabular-nums text-right text-emerald-400">
            {fmtAmt(cp.dva)}
          </span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-300">
            {fmtAmt(cp.pfe)}
          </span>
          <div className="flex justify-end pr-2">
            <UtilBar pct={cp.limitUtilization} />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Netting Summary --

function NettingSummarySection({
  summary,
}: {
  summary: NettingSummary | undefined;
}) {
  if (!summary) return null;

  const nettingPct =
    summary.grossPositiveMtm > 0
      ? ((summary.nettingBenefit / summary.grossPositiveMtm) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Netting Summary
        </span>
      </div>

      <div className="flex items-center gap-0 divide-x divide-amber-400/10 bg-[#030303]">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Gross +MtM
          </div>
          <div className="text-[10px] font-mono font-bold text-white tabular-nums">
            {fmtAmt(summary.grossPositiveMtm)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Netting
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400 tabular-nums">
            -{fmtAmt(summary.nettingBenefit)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 tabular-nums">
            {nettingPct}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Collateral
          </div>
          <div className="text-[10px] font-mono font-bold text-blue-400 tabular-nums">
            {fmtAmt(summary.collateral)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Net Exp
          </div>
          <div className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
            {fmtAmt(summary.netExposure)}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- CVA/DVA Totals --

function CvaDvaTotalsSection({
  totals,
}: {
  totals: CvaDvaTotals | undefined;
}) {
  if (!totals) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CVA / DVA Totals
        </span>
      </div>

      <div className="flex items-center gap-0 divide-x divide-amber-400/10 bg-[#030303]">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total CVA
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400 tabular-nums">
            {fmtAmt(totals.totalCva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total DVA
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400 tabular-nums">
            {fmtAmt(totals.totalDva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Net CVA/DVA
          </div>
          <div className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
            {fmtAmt(totals.netCvaDva)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            1D Chg
          </div>
          <div className={`text-[10px] font-mono font-bold tabular-nums ${changeColor(totals.change1d)}`}>
            {fmtChg(totals.change1d)}
          </div>
        </div>
      </div>
    </div>
  );
}
