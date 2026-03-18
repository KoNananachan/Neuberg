import { useCdsMonitor } from '../../api/hooks/use-cds-monitor';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

// -- Color helpers --

function spreadColor(spread: number): string {
  if (spread > 500) return 'text-red-400';
  if (spread > 300) return 'text-red-400/80';
  if (spread > 150) return 'text-orange-400';
  if (spread > 80) return 'text-yellow-400';
  if (spread > 40) return 'text-emerald-400/80';
  return 'text-emerald-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-green-400/80';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('B')) return 'text-red-400/80';
  return 'text-red-400';
}

// -- Main Panel --

export function CdsMonitorPanel() {
  const t = useT();
  const { data, isLoading } = useCdsMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'cdsMonitorTitle', 'CDS Monitor')}
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {d && (
          <>
            <SingleNameCdsTable entries={d?.singleNameCds} />
            <IndexCdsTable indices={d?.indexCds} />
            <MarketSummary summary={d?.marketSummary} />
          </>
        )}
      </div>
    </div>
  );
}

// -- Section 1: Single-Name CDS Table --

function SingleNameCdsTable({ entries }: { entries: any[] }) {
  const items = Array.isArray(entries) ? entries : [];
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          SINGLE-NAME CDS
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                ENTITY
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                RATING
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                1Y
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                3Y
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                5Y
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                10Y
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                CHG
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                RECOVERY
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                DEFAULT PROB
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry: any, idx: number) => (
              <tr
                key={entry.entity || idx}
                className="border-b border-border/20 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">
                  {(entry.entity ?? '').toUpperCase()}
                </td>
                <td className={`px-1.5 py-1 font-bold whitespace-nowrap ${ratingColor(entry.rating ?? '')}`}>
                  {entry.rating ?? '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(entry.spread1y ?? 0)}`}>
                  {entry.spread1y != null ? fmtBps(entry.spread1y) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(entry.spread3y ?? 0)}`}>
                  {entry.spread3y != null ? fmtBps(entry.spread3y) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${spreadColor(entry.spread5y ?? 0)}`}>
                  {entry.spread5y != null ? fmtBps(entry.spread5y) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(entry.spread10y ?? 0)}`}>
                  {entry.spread10y != null ? fmtBps(entry.spread10y) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(entry.change ?? 0)}`}>
                  {entry.change != null ? fmtChg(entry.change) : '\u2014'}
                </td>
                <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap">
                  {entry.recovery != null ? fmtPct(entry.recovery) : '\u2014'}
                </td>
                <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap">
                  {entry.defaultProb != null ? fmtPct(entry.defaultProb) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Section 2: Index CDS --

function IndexCdsTable({ indices }: { indices: any[] }) {
  const items = Array.isArray(indices) ? indices : [];
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          INDEX CDS
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                INDEX
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                LEVEL
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                1D CHG
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                1W CHG
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                1M CHG
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((idx: any, i: number) => (
              <tr
                key={idx.name || i}
                className="border-b border-border/20 hover:bg-red-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 text-red-400 font-bold whitespace-nowrap uppercase">
                  {idx.name ?? ''}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${spreadColor(idx.level ?? 0)}`}>
                  {idx.level != null ? fmtBps(idx.level) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(idx.change1d ?? 0)}`}>
                  {idx.change1d != null ? fmtChg(idx.change1d) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(idx.change1w ?? 0)}`}>
                  {idx.change1w != null ? fmtChg(idx.change1w) : '\u2014'}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(idx.change1m ?? 0)}`}>
                  {idx.change1m != null ? fmtChg(idx.change1m) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Section 3: Market Summary --

function MarketSummary({ summary }: { summary: any }) {
  if (!summary) return null;

  const stats = [
    { label: 'IG AVG SPREAD', value: summary?.igAvgSpread, unit: 'bps', color: spreadColor(summary?.igAvgSpread ?? 0) },
    { label: 'HY AVG SPREAD', value: summary?.hyAvgSpread, unit: 'bps', color: spreadColor(summary?.hyAvgSpread ?? 0) },
    { label: 'IG WIDENERS', value: summary?.igWideners, unit: '', color: 'text-red-400' },
    { label: 'IG TIGHTENERS', value: summary?.igTighteners, unit: '', color: 'text-emerald-400' },
    { label: 'HY WIDENERS', value: summary?.hyWideners, unit: '', color: 'text-red-400' },
    { label: 'HY TIGHTENERS', value: summary?.hyTighteners, unit: '', color: 'text-emerald-400' },
    { label: 'AVG RECOVERY', value: summary?.avgRecovery, unit: '%', color: 'text-neutral-300' },
    { label: 'AVG DEFAULT PROB', value: summary?.avgDefaultProb, unit: '%', color: 'text-neutral-300' },
  ];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          MARKET SUMMARY
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/20">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-black px-2.5 py-2 hover:bg-red-400/[0.02] transition-colors"
          >
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">
              {stat.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-[11px] font-mono font-bold ${stat.color}`}>
                {stat.value != null
                  ? stat.unit === '%'
                    ? fmtPct(stat.value)
                    : fmtBps(stat.value)
                  : '\u2014'}
              </span>
              {stat.unit && stat.unit !== '%' && stat.value != null && (
                <span className="text-[7px] font-mono text-neutral-600">{stat.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
