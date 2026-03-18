import { useSovereignCds } from '../../api/hooks/use-sovereign-cds';
import { useT } from '../../i18n';
import { Loader2, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toFixed(1);
}

function fmtSpread0(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toFixed(0);
}

function fmtPd(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(1)}%`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// For CDS: widening (positive change) = red, tightening (negative) = green
function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'text-neutral-500';
  if (rating.startsWith('AAA')) return 'text-green-400';
  if (rating.startsWith('AA')) return 'text-cyan-400';
  if (rating.startsWith('A')) return 'text-blue-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('B') || rating.startsWith('CCC') || rating.startsWith('CC')) return 'text-red-400';
  return 'text-neutral-500';
}

function outlookColor(outlook: string | null | undefined): string {
  if (!outlook) return 'text-neutral-500';
  const lower = outlook.toLowerCase();
  if (lower === 'positive' || lower === 'improving') return 'text-green-400';
  if (lower === 'negative' || lower === 'deteriorating') return 'text-red-400';
  if (lower === 'stable') return 'text-neutral-400';
  if (lower === 'watch' || lower === 'developing') return 'text-yellow-400';
  return 'text-neutral-500';
}

function creditWatchBg(watch: string | null | undefined): string {
  if (!watch) return '';
  const lower = watch.toLowerCase();
  if (lower === 'positive') return 'text-green-400 bg-green-400/10';
  if (lower === 'negative') return 'text-red-400 bg-red-400/10';
  if (lower === 'developing' || lower === 'watch') return 'text-yellow-400 bg-yellow-400/10';
  if (lower === 'none' || lower === 'n/a') return 'text-neutral-500 bg-neutral-500/10';
  return 'text-neutral-400 bg-neutral-400/10';
}

// ── Main Panel ──

export function SovereignCdsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useSovereignCds();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'sovCdsTitle', 'Sovereign CDS Monitor')}
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
            {tr(t, 'sovCdsError', 'Failed to load data')}
          </div>
        )}

        {data && (
          <>
            <MarketSummaryBar summary={data.marketSummary} t={t} />
            <CdsSpreadsTable spreads={data.cdsSpreads} t={t} />
            <TermStructureTable terms={data.termStructure} t={t} />
            <CrisisComparisonTable crises={data.crisisComparison} t={t} />
            <DefaultProbabilitiesTable probs={data.defaultProbabilities} t={t} />
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

  const metrics = [
    { label: tr(t, 'sovCdsAvgDM', 'Avg DM Spread'), value: fmtSpread(summary.avgDMSpread), suffix: 'bp' },
    { label: tr(t, 'sovCdsAvgEM', 'Avg EM Spread'), value: fmtSpread(summary.avgEMSpread), suffix: 'bp' },
    {
      label: tr(t, 'sovCdsMostWidened', 'Most Widened'),
      value: summary.mostWidened || '-',
      color: 'text-red-400',
    },
    {
      label: tr(t, 'sovCdsMostTightened', 'Most Tightened'),
      value: summary.mostTightened || '-',
      color: 'text-green-400',
    },
    {
      label: tr(t, 'sovCdsGlobalRisk', 'Global Risk Index'),
      value: summary.globalRiskIndex != null ? summary.globalRiskIndex.toFixed(1) : '-',
    },
    {
      label: tr(t, 'sovCdsDominantTheme', 'Dominant Theme'),
      value: summary.dominantTheme || '-',
      color: 'text-red-400/80',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovCdsMarketSummary', 'Market Summary')}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
              {m.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${m.color || 'text-white'} truncate`}>
              {m.value}
              {m.suffix && <span className="text-[7px] text-neutral-600 ml-0.5">{m.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 2: CDS Spreads Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CdsSpreadsTable({ spreads, t }: { spreads: any[]; t: ReturnType<typeof useT> }) {
  if (!spreads || spreads.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovCdsSpreads', 'CDS Spreads')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">5Y (bp)</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Chg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">1W</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">1M</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">52W H</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">52W L</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">%ile</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Impl PD%</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Rating</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {spreads.map((row: any, i: number) => (
              <tr
                key={row.country || i}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtSpread(row.spread5y)}
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
                  {fmtSpread(row.high52w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtSpread(row.low52w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {row.percentile != null ? fmtSpread0(row.percentile) : '-'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-red-400/80">
                  {fmtPd(row.impliedPD)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${ratingColor(row.rating)}`}>
                  {row.rating || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Term Structure Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureTable({ terms, t }: { terms: any[]; t: ReturnType<typeof useT> }) {
  if (!terms || terms.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovCdsTermStructure', 'Term Structure')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Tenor</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Spread</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Chg</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Impl Hazard</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {terms.map((row: any, i: number) => (
              <tr
                key={`${row.country}-${row.tenor}-${i}`}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{row.tenor}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtSpread(row.spread)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.change)}`}>
                  {fmtChange(row.change)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtPd(row.impliedHazardRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 4: Crisis Comparison Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrisisComparisonTable({ crises, t }: { crises: any[]; t: ReturnType<typeof useT> }) {
  if (!crises || crises.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovCdsCrisisComparison', 'Crisis Comparison')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Event</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">US</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Italy</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Brazil</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Turkey</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Avg EM</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Peak Date</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {crises.map((row: any, i: number) => (
              <tr
                key={row.event || i}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.event}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtSpread(row.usSpread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtSpread(row.italySpread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtSpread(row.brazilSpread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtSpread(row.turkeySpread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-red-400/80 font-bold">
                  {fmtSpread(row.avgEM)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">
                  {row.peakDate || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 5: Default Probabilities Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DefaultProbabilitiesTable({ probs, t }: { probs: any[]; t: ReturnType<typeof useT> }) {
  if (!probs || probs.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovCdsDefaultProb', 'Default Probabilities')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">PD 1Y</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">PD 3Y</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">PD 5Y</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">PD 10Y</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Recovery%</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Cr Watch</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Outlook</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {probs.map((row: any, i: number) => (
              <tr
                key={row.country || i}
                className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPd(row.pd1y)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPd(row.pd3y)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPd(row.pd5y)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtPd(row.pd10y)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtPct(row.recoveryAssumption)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  {row.creditWatch && (
                    <span className={`text-[7px] font-bold px-1 py-0.5 ${creditWatchBg(row.creditWatch)}`}>
                      {row.creditWatch}
                    </span>
                  )}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${outlookColor(row.outlook)}`}>
                  {row.outlook || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
