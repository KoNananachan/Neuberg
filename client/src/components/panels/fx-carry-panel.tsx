import { useMemo } from 'react';
import { useFxCarry } from '../../api/hooks/use-fx-carry';
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

// ── Types ──

interface CarryPairRow {
  pair: string;
  spotRate: number;
  carry3M: number;
  carry12M: number;
  forwardPoints: number;
  yieldDiff: number;
  sharpe: number;
  maxDD: number;
  vol: number;
  ytdReturn: number;
}

interface CentralBankRow {
  country: string;
  bank: string;
  rate: number;
  lastChange: string;
  nextMeeting: string;
  marketImplied: number;
  direction: 'hawkish' | 'dovish' | 'neutral';
}

interface FundingCurrencyRow {
  currency: string;
  overnightRate: number;
  borrowingCost: number;
  avgCarry: number;
}

interface PerformerRow {
  pair: string;
  ytdReturn: number;
  carryReturn: number;
  fxReturn: number;
  sharpe: number;
}

interface RiskMetrics {
  globalCarryIndex: number;
  carryMomentum: number;
  riskReversal: number;
  impliedVol: number;
  corrSPX: number;
  corrVIX: number;
}

interface SummaryMetrics {
  avgCarry3M: number;
  avgSharpe: number;
  totalReturn1M: number;
  fundingCost: number;
  bestCarry: { pair: string; value: number };
  worstCarry: { pair: string; value: number };
}

interface FxCarryData {
  timestamp: string;
  summary: SummaryMetrics;
  risk: RiskMetrics;
  carryPairs: CarryPairRow[];
  centralBanks: CentralBankRow[];
  fundingCurrencies: FundingCurrencyRow[];
  topPerformers: PerformerRow[];
  worstPerformers: PerformerRow[];
}

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtSpot(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  return n.toFixed(4);
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

function fmtFwd(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function sharpeColor(n: number): string {
  if (n >= 1.0) return 'text-green-400';
  if (n >= 0.5) return 'text-yellow-400';
  if (n >= 0) return 'text-neutral-400';
  return 'text-red-400';
}

function directionBadge(dir: 'hawkish' | 'dovish' | 'neutral'): { text: string; bg: string; label: string } {
  if (dir === 'hawkish') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'HAWK' };
  if (dir === 'dovish') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'DOVE' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30', label: 'HOLD' };
}

// ── Main Panel ──

export function FxCarryPanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useFxCarry();

  const data = rawData as FxCarryData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'fxcTitle', 'FX Carry Trade Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'fxcError', 'Failed to load carry data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'fxcNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryBar summary={data.summary} t={t} />
            <RiskMetricsBar risk={data.risk} t={t} />
            <CarryPairsTable pairs={data.carryPairs} t={t} />
            <CentralBankRatesTable banks={data.centralBanks} t={t} />
            <FundingCurrenciesTable currencies={data.fundingCurrencies} t={t} />
            <PerformersSection top={data.topPerformers} worst={data.worstPerformers} t={t} />
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.carryPairs?.length ?? 0} pairs` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.centralBanks?.length ?? 0} central banks` : '---'}
        </span>
      </div>
    </div>
  );
}

// ── Section 1: Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: SummaryMetrics;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'fxcAvgCarry3M', 'Avg Carry 3M'),
      value: fmtPct(summary.avgCarry3M),
      color: changeColor(summary.avgCarry3M),
    },
    {
      label: tr(t, 'fxcAvgSharpe', 'Avg Sharpe'),
      value: fmtRatio(summary.avgSharpe),
      color: sharpeColor(summary.avgSharpe),
    },
    {
      label: tr(t, 'fxcTotalReturn1M', 'Total Return 1M'),
      value: fmtPct(summary.totalReturn1M),
      color: changeColor(summary.totalReturn1M),
    },
    {
      label: tr(t, 'fxcFundingCost', 'Funding Cost'),
      value: fmtRate(summary.fundingCost),
      color: 'text-neutral-300',
    },
    {
      label: tr(t, 'fxcBestCarry', 'Best Carry'),
      value: `${summary.bestCarry.pair} ${fmtPct(summary.bestCarry.value)}`,
      color: 'text-green-400',
    },
    {
      label: tr(t, 'fxcWorstCarry', 'Worst Carry'),
      value: `${summary.worstCarry.pair} ${fmtPct(summary.worstCarry.value)}`,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color} truncate`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 2: Risk Metrics Bar ──

function RiskMetricsBar({
  risk,
  t,
}: {
  risk: RiskMetrics;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'fxcGlobalCarry', 'Global Carry Idx'),
      value: fmtRatio(risk.globalCarryIndex),
      color: changeColor(risk.globalCarryIndex),
    },
    {
      label: tr(t, 'fxcMomentum', 'Carry Momentum'),
      value: fmtRatio(risk.carryMomentum),
      color: changeColor(risk.carryMomentum),
    },
    {
      label: tr(t, 'fxcRiskReversal', 'Risk Reversal'),
      value: fmtPct(risk.riskReversal),
      color: changeColor(risk.riskReversal),
    },
    {
      label: tr(t, 'fxcImpliedVol', 'Implied Vol'),
      value: fmtRate(risk.impliedVol),
      color: risk.impliedVol > 12 ? 'text-red-400' : risk.impliedVol > 8 ? 'text-yellow-400' : 'text-green-400',
    },
    {
      label: tr(t, 'fxcCorrSPX', 'Corr SPX'),
      value: fmtRatio(risk.corrSPX),
      color: risk.corrSPX > 0.5 ? 'text-red-400' : risk.corrSPX > 0.2 ? 'text-yellow-400' : 'text-neutral-400',
    },
    {
      label: tr(t, 'fxcCorrVIX', 'Corr VIX'),
      value: fmtRatio(risk.corrVIX),
      color: risk.corrVIX < -0.5 ? 'text-red-400' : risk.corrVIX < -0.2 ? 'text-yellow-400' : 'text-neutral-400',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-0.5 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxcRiskMetrics', 'Risk Metrics')}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3a: Carry Pairs Table ──

function CarryPairsTable({
  pairs,
  t,
}: {
  pairs: CarryPairRow[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...(pairs ?? [])].sort((a, b) => b.carry3M - a.carry3M).slice(0, 15),
    [pairs],
  );

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-0.5 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxcCarryPairs', 'Carry Pairs')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">
          {sorted.length} {tr(t, 'fxcPairs', 'pairs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[68px_56px_48px_48px_48px_48px_40px_40px_40px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'fxcPair', 'Pair')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcSpot', 'Spot')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxc3M', '3M%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxc12M', '12M%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcFwd', 'Fwd')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcYldDf', 'YldDf')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcSR', 'SR')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcDD', 'DD%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcVol', 'Vol%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcYTD', 'YTD%')}</span>
      </div>

      {/* Rows */}
      {sorted.map((pair) => (
        <div
          key={pair.pair}
          className="grid grid-cols-[68px_56px_48px_48px_48px_48px_40px_40px_40px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{pair.pair}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtSpot(pair.spotRate)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.carry3M)}`}>{fmtPct(pair.carry3M)}</span>
          <span className={`text-[8px] font-mono text-right ${changeColor(pair.carry12M)}`}>{fmtPct(pair.carry12M)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtFwd(pair.forwardPoints)}</span>
          <span className={`text-[8px] font-mono text-right ${changeColor(pair.yieldDiff)}`}>{fmtPct(pair.yieldDiff)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${sharpeColor(pair.sharpe)}`}>{fmtRatio(pair.sharpe)}</span>
          <span className="text-[8px] font-mono text-red-400/70 text-right">{fmtRate(pair.maxDD)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(pair.vol)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.ytdReturn)}`}>{fmtPct(pair.ytdReturn)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section 3b: Central Bank Rates Table ──

function CentralBankRatesTable({
  banks,
  t,
}: {
  banks: CentralBankRow[];
  t: ReturnType<typeof useT>;
}) {
  const rows = useMemo(() => (banks ?? []).slice(0, 12), [banks]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-0.5 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxcCentralBanks', 'Central Bank Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[52px_64px_44px_56px_56px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'fxcCountry', 'Ctry')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'fxcBank', 'Bank')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcRatePct', 'Rate%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcLastChg', 'Last Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcNextMtg', 'Next Mtg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcMktImpl', 'Impl%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">{tr(t, 'fxcDir', 'Dir')}</span>
      </div>

      {/* Rows */}
      {rows.map((bank) => {
        const badge = directionBadge(bank.direction);
        return (
          <div
            key={bank.country}
            className="grid grid-cols-[52px_64px_44px_56px_56px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{bank.country}</span>
            <span className="text-[8px] font-mono text-neutral-400 truncate">{bank.bank}</span>
            <span className="text-[8px] font-mono text-emerald-400/80 text-right font-bold">{fmtRate(bank.rate)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{bank.lastChange}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{bank.nextMeeting}</span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtRate(bank.marketImplied)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${badge.text} ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 3c: Funding Currencies Table ──

function FundingCurrenciesTable({
  currencies,
  t,
}: {
  currencies: FundingCurrencyRow[];
  t: ReturnType<typeof useT>;
}) {
  const rows = useMemo(() => (currencies ?? []).slice(0, 4), [currencies]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-0.5 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fxcFunding', 'Funding Currencies')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_80px_80px_80px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'fxcCcy', 'CCY')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcONRate', 'O/N Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcBorrCost', 'Borr Cost')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcAvgCarry', 'Avg Carry')}</span>
      </div>

      {/* Rows */}
      {rows.map((ccy) => (
        <div
          key={ccy.currency}
          className="grid grid-cols-[64px_80px_80px_80px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{ccy.currency}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtRate(ccy.overnightRate)}</span>
          <span className="text-[8px] font-mono text-red-400/70 text-right">{fmtRate(ccy.borrowingCost)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(ccy.avgCarry)}`}>{fmtPct(ccy.avgCarry)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section 3d: Top/Worst Performers ──

function PerformersSection({
  top,
  worst,
  t,
}: {
  top: PerformerRow[];
  worst: PerformerRow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="grid grid-cols-2 gap-px bg-border/10">
      {/* Top Performers */}
      <div className="bg-black">
        <div className="px-2 py-0.5 border-b border-border/10 flex items-center gap-1">
          <div className="w-1 h-1 bg-green-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'fxcTopPerf', 'Top Performers')}
          </span>
        </div>
        <PerformerTableHeader t={t} />
        {(top ?? []).map((p) => (
          <PerformerRow key={p.pair} row={p} />
        ))}
      </div>

      {/* Worst Performers */}
      <div className="bg-black">
        <div className="px-2 py-0.5 border-b border-border/10 flex items-center gap-1">
          <div className="w-1 h-1 bg-red-400" />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'fxcWorstPerf', 'Worst Performers')}
          </span>
        </div>
        <PerformerTableHeader t={t} />
        {(worst ?? []).map((p) => (
          <PerformerRow key={p.pair} row={p} />
        ))}
      </div>
    </div>
  );
}

function PerformerTableHeader({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div className="grid grid-cols-[56px_44px_44px_44px_36px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'fxcPair', 'Pair')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcYTDRet', 'YTD')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcCarryRet', 'Carry')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcFXRet', 'FX')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'fxcSR', 'SR')}</span>
    </div>
  );
}

function PerformerRow({ row }: { row: PerformerRow }) {
  return (
    <div className="grid grid-cols-[56px_44px_44px_44px_36px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-white">{row.pair}</span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.ytdReturn)}`}>{fmtPct(row.ytdReturn)}</span>
      <span className={`text-[8px] font-mono text-right ${changeColor(row.carryReturn)}`}>{fmtPct(row.carryReturn)}</span>
      <span className={`text-[8px] font-mono text-right ${changeColor(row.fxReturn)}`}>{fmtPct(row.fxReturn)}</span>
      <span className={`text-[8px] font-mono font-bold text-right ${sharpeColor(row.sharpe)}`}>{fmtRatio(row.sharpe)}</span>
    </div>
  );
}
