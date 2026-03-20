import { useMemo } from 'react';
import { useSovereignCds } from '../../api/hooks/use-sovereign-cds';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPd(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Color helpers ──

function spreadColor(spread: number): string {
  if (spread > 500) return 'text-red-400';
  if (spread > 300) return 'text-red-400/80';
  if (spread > 150) return 'text-orange-400';
  if (spread > 80) return 'text-yellow-400';
  if (spread > 40) return 'text-emerald-400/80';
  return 'text-emerald-400';
}

function spreadBgColor(spread: number): string {
  if (spread > 500) return 'bg-red-400/10';
  if (spread > 300) return 'bg-red-400/5';
  if (spread > 150) return 'bg-orange-400/5';
  if (spread > 80) return 'bg-yellow-400/[0.03]';
  return 'bg-emerald-400/[0.03]';
}

function changeColor(n: number): string {
  // For CDS: positive change = widening = bad = red; negative = tightening = good = green
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

// ── Main Panel ──

export function SovereignCdsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useSovereignCds();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'sovereignCdsTitle', 'Sovereign CDS Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-500 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <CdsRankingsTable rankings={d.rankings} />
            <TopMovers wideners={d.topMovers?.wideners} tighteners={d.topMovers?.tighteners} />
            <TermStructure termStructure={d.termStructure} />
            <CreditEvents events={d.creditEvents} />
            <RegionalSummary regions={d.regionalSummary} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: CDS Rankings Table ──

function CdsRankingsTable({ rankings }: { rankings: any[] }) {
  const sorted = useMemo(() => {
    if (!rankings || !Array.isArray(rankings)) return [];
    return [...rankings]
      .sort((a: any, b: any) => (b.spread5y ?? 0) - (a.spread5y ?? 0))
      .slice(0, 20);
  }, [rankings]);

  if (sorted.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CDS RANKINGS — TOP 20 BY SPREAD
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                #
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                COUNTRY
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                5Y SPREAD
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
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                IMPLIED PD
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                RATING
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry: any, idx: number) => (
              <tr
                key={entry.country || idx}
                className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 text-neutral-600 whitespace-nowrap">
                  {idx + 1}
                </td>
                <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap">
                  {(entry.country ?? '').toUpperCase()}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${spreadColor(entry.spread5y ?? 0)} ${spreadBgColor(entry.spread5y ?? 0)}`}>
                  {fmtBps(entry.spread5y ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(entry.change1d ?? 0)}`}>
                  {fmtChg(entry.change1d ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(entry.change1w ?? 0)}`}>
                  {fmtChg(entry.change1w ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(entry.change1m ?? 0)}`}>
                  {fmtChg(entry.change1m ?? 0)}
                </td>
                <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap">
                  {fmtPd(entry.impliedPd ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${ratingColor(entry.rating ?? '')}`}>
                  {entry.rating ?? '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 2: Top Movers ──

function TopMovers({ wideners, tighteners }: { wideners: any[]; tighteners: any[] }) {
  const w = Array.isArray(wideners) ? wideners : [];
  const tg = Array.isArray(tighteners) ? tighteners : [];

  if (w.length === 0 && tg.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TOP MOVERS
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Wideners */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-red-400">
              WIDENERS
            </span>
          </div>
          {w.map((m: any, i: number) => (
            <div
              key={m.country || i}
              className="flex items-center justify-between px-2 py-0.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {m.country ?? ''}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-red-400">
                  {fmtChg(m.change ?? 0)} BPS
                </span>
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtBps(m.spread ?? 0)}
                </span>
              </div>
            </div>
          ))}
          {w.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center uppercase">
              NONE
            </div>
          )}
        </div>

        {/* Tighteners */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-emerald-400">
              TIGHTENERS
            </span>
          </div>
          {tg.map((m: any, i: number) => (
            <div
              key={m.country || i}
              className="flex items-center justify-between px-2 py-0.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {m.country ?? ''}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-emerald-400">
                  {fmtChg(m.change ?? 0)} BPS
                </span>
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtBps(m.spread ?? 0)}
                </span>
              </div>
            </div>
          ))}
          {tg.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center uppercase">
              NONE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Term Structure ──

function TermStructure({ termStructure }: { termStructure: any[] }) {
  const entries = Array.isArray(termStructure) ? termStructure : [];
  if (entries.length === 0) return null;

  const tenors = ['6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CDS TERM STRUCTURE (BPS)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap sticky left-0 bg-[#080808] z-10">
                COUNTRY
              </th>
              {tenors.map((tenor) => (
                <th
                  key={tenor}
                  className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
                >
                  {tenor}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((row: any, idx: number) => {
              const curve = row.curve || {};
              return (
                <tr
                  key={row.country || idx}
                  className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap sticky left-0 bg-black">
                    {(row.country ?? '').toUpperCase()}
                  </td>
                  {tenors.map((tenor) => {
                    const val = curve[tenor] ?? curve[tenor.toLowerCase()] ?? null;
                    return (
                      <td
                        key={tenor}
                        className={`px-1.5 py-1 text-right whitespace-nowrap ${val != null ? spreadColor(val) : 'text-neutral-600'}`}
                      >
                        {val != null ? fmtBps(val) : '\u2014'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 4: Credit Events ──

function CreditEvents({ events }: { events: any[] }) {
  const items = Array.isArray(events) ? events : [];
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CREDIT EVENTS
        </span>
      </div>
      <div className="divide-y divide-border/10">
        {items.map((evt: any, idx: number) => {
          const impact = (evt.impact ?? '').toLowerCase();
          const impactColor =
            impact === 'high' || impact === 'negative'
              ? 'text-red-400 bg-red-400/10'
              : impact === 'medium' || impact === 'mixed'
                ? 'text-yellow-400 bg-yellow-400/10'
                : impact === 'positive'
                  ? 'text-emerald-400 bg-emerald-400/10'
                  : 'text-neutral-400 bg-neutral-400/10';

          return (
            <div
              key={idx}
              className="px-3 py-1.5 hover:bg-rose-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono font-bold text-white uppercase">
                    {evt.country ?? ''}
                  </span>
                  <span className={`text-[7px] font-mono font-bold px-1 py-0.5 uppercase ${impactColor}`}>
                    {evt.impact ?? 'N/A'}
                  </span>
                </div>
                <span className="text-[7px] font-mono text-neutral-600">
                  {evt.date ?? ''}
                </span>
              </div>
              <div className="text-[8px] font-mono text-neutral-400 leading-tight">
                {evt.description ?? ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 5: Regional Summary ──

function RegionalSummary({ regions }: { regions: any[] }) {
  const items = Array.isArray(regions) ? regions : [];
  if (items.length === 0) return null;

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          REGIONAL SUMMARY
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border/10">
        {items.map((region: any, idx: number) => {
          const avgSpread = region.avgSpread ?? 0;
          return (
            <div
              key={region.region || idx}
              className="bg-black px-2.5 py-2 hover:bg-rose-400/[0.02] transition-colors"
            >
              <div className="text-[8px] font-mono font-black text-rose-400 uppercase tracking-wider mb-1">
                {region.region ?? ''}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">AVG SPREAD</span>
                <span className={`text-[10px] font-mono font-bold ${spreadColor(avgSpread)}`}>
                  {fmtBps(avgSpread)}
                </span>
                <span className="text-[7px] font-mono text-neutral-600">BPS</span>
              </div>
              <div className="flex items-center justify-between text-[7px] font-mono">
                <div>
                  <span className="text-neutral-600 uppercase">WORST </span>
                  <span className="text-red-400 font-bold uppercase">
                    {region.worst ?? '\u2014'}
                  </span>
                  {region.worstSpread != null && (
                    <span className="text-neutral-600 ml-1">
                      {fmtBps(region.worstSpread)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-neutral-600 uppercase">BEST </span>
                  <span className="text-emerald-400 font-bold uppercase">
                    {region.best ?? '\u2014'}
                  </span>
                  {region.bestSpread != null && (
                    <span className="text-neutral-600 ml-1">
                      {fmtBps(region.bestSpread)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
