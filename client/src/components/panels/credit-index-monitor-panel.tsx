import { useCreditIndexMonitor } from '../../api/hooks/use-credit-index-monitor';
import { useT, tr, TFn } from '../../i18n';
import { Loader2, RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtBp(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toFixed(1);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtNumber(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

// ── Color helpers ──
// CDS spreads: widening (positive change) = red (negative credit), tightening (negative change) = green (positive credit)

function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function basisChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function signalBadge(signal: string | null | undefined): { text: string; bg: string } {
  if (!signal) return { text: 'text-neutral-500', bg: 'bg-zinc-500/10' };
  const s = signal.toLowerCase();
  if (s === 'cheap') return { text: 'text-green-400', bg: 'bg-green-400/10' };
  if (s === 'rich') return { text: 'text-red-400', bg: 'bg-red-400/10' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-400/10' };
}

function sentimentBadge(sentiment: string | null | undefined): { text: string; bg: string } {
  if (!sentiment) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  const s = sentiment.toLowerCase();
  if (s === 'risk on' || s === 'bullish') return { text: 'text-green-400', bg: 'bg-green-400/10' };
  if (s === 'risk off' || s === 'bearish') return { text: 'text-red-400', bg: 'bg-red-400/10' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
}

function rollDirectionBadge(direction: string | null | undefined): { text: string; bg: string } {
  if (!direction) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  const d = direction.toLowerCase();
  if (d === 'positive' || d === 'tightening') return { text: 'text-green-400', bg: 'bg-green-400/10' };
  if (d === 'negative' || d === 'widening') return { text: 'text-red-400', bg: 'bg-red-400/10' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
}

// ── Main Panel ──

export function CreditIndexMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCreditIndexMonitor();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'cimTitle', 'Credit Index Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-red-400" />
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'cimError', 'Failed to load data')}
          </div>
        )}

        {data && (
          <>
            <MarketSummaryBar summary={data.marketSummary} t={t} />
            <IndexLevelsTable levels={data.indexLevels} t={t} />
            <BasisTradesTable trades={data.basisTrades} t={t} />
            <RollAnalysisTable rolls={data.rollAnalysis} t={t} />
            <TrancheDataTable tranches={data.trancheData} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: ReturnType<typeof useT> }) {
  if (!summary) return null;

  const sentStyle = sentimentBadge(summary.sentiment);

  const metrics = [
    { label: tr(t, 'cimCdxIG', 'CDX IG Spread'), value: fmtBp(summary.cdxIGSpread), suffix: 'bp' },
    { label: tr(t, 'cimCdxHY', 'CDX HY Spread'), value: fmtBp(summary.cdxHYSpread), suffix: 'bp' },
    { label: tr(t, 'cimItraxxMain', 'iTraxx Main'), value: fmtBp(summary.itraxxMainSpread), suffix: 'bp' },
    { label: tr(t, 'cimAvgBasis', 'Avg Basis'), value: fmtBp(summary.avgBasis), suffix: 'bp' },
    { label: tr(t, 'cimTotalVolume', 'Total Volume'), value: fmtVolume(summary.totalVolume) },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cimMarketSummary', 'Market Summary')}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
              {m.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white truncate">
              {m.value}
              {m.suffix && <span className="text-[7px] text-neutral-600 ml-0.5">{m.suffix}</span>}
            </div>
          </div>
        ))}
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
            {tr(t, 'cimSentiment', 'Sentiment')}
          </div>
          <div className="mt-0.5">
            <span className={`text-[7px] font-mono font-bold uppercase px-1 py-0.5 ${sentStyle.text} ${sentStyle.bg}`}>
              {summary.sentiment || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Index Levels Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndexLevelsTable({ levels, t }: { levels: any[]; t: ReturnType<typeof useT> }) {
  if (!levels || levels.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cimIndexLevels', 'Index Levels')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Index</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Spread (bp)</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Chg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">1W</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">1M</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">52W H</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">52W L</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">DV01</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Volume</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {levels.map((row: any, i: number) => (
              <tr
                key={row.index || i}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.index}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtBp(row.spread)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.change)}`}>
                  {fmtChange(row.change)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadChangeColor(row.weekChange)}`}>
                  {fmtChange(row.weekChange)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadChangeColor(row.monthChange)}`}>
                  {fmtChange(row.monthChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtBp(row.high52w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtBp(row.low52w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtNumber(row.dv01, 2)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtVolume(row.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Basis Trades Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BasisTradesTable({ trades, t }: { trades: any[]; t: ReturnType<typeof useT> }) {
  if (!trades || trades.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cimBasisTrades', 'Basis Trades')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Index</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Idx Spd</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Intrinsic</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Basis</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Basis Chg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Hist Avg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Z-Score</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Signal</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {trades.map((row: any, i: number) => {
              const sig = signalBadge(row.signal);
              return (
                <tr
                  key={row.index || i}
                  className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.index}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                    {fmtBp(row.indexSpread)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                    {fmtBp(row.intrinsicSpread)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                    {fmtBp(row.basis)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${basisChangeColor(row.basisChange)}`}>
                    {fmtChange(row.basisChange)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                    {fmtBp(row.historicalAvg)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                    {fmtNumber(row.zscore, 2)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-mono font-bold uppercase px-1 py-0.5 ${sig.text} ${sig.bg}`}>
                      {row.signal || '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 4: Roll Analysis Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RollAnalysisTable({ rolls, t }: { rolls: any[]; t: ReturnType<typeof useT> }) {
  if (!rolls || rolls.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cimRollAnalysis', 'Roll Analysis')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Index</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">OTR Series</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">OFR Series</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">OTR Spd</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">OFR Spd</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Roll Spd</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Direction</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Days</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Roll Cost</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {rolls.map((row: any, i: number) => {
              const dir = rollDirectionBadge(row.rollDirection);
              return (
                <tr
                  key={row.index || i}
                  className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.index}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
                    {row.onTheRunSeries || '-'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
                    {row.offTheRunSeries || '-'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                    {fmtBp(row.otrSpread)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                    {fmtBp(row.ofrSpread)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.rollSpread)}`}>
                    {fmtChange(row.rollSpread)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-mono font-bold uppercase px-1 py-0.5 ${dir.text} ${dir.bg}`}>
                      {row.rollDirection || '-'}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                    {row.daysToRoll != null ? row.daysToRoll : '-'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                    {fmtBp(row.rollCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 5: Tranche Data Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrancheDataTable({ tranches, t }: { tranches: any[]; t: ReturnType<typeof useT> }) {
  if (!tranches || tranches.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cimTrancheData', 'Tranche Data')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Tranche</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Spread (bp)</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Upfront%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Chg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Delta</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Impl Corr%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Base Corr%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Leverage</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tranches.map((row: any, i: number) => (
              <tr
                key={row.tranche || i}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.tranche}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtBp(row.spread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPct(row.upfront)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.change)}`}>
                  {fmtChange(row.change)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtNumber(row.delta, 2)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPct(row.impliedCorrelation)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPct(row.baseCorrelation)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 font-bold">
                  {fmtNumber(row.leverage, 1)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
