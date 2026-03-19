import { useState, useMemo } from 'react';
import { useGlobalIndexMonitor } from '../../api/hooks/use-global-index-monitor';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface IndexEntry {
  name: string;
  symbol: string;
  region: string;
  last: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  ytdPercent: number;
  pe: number | null;
  divYield: number | null;
  status: 'OPEN' | 'CLOSED' | 'PRE';
}

interface RegionSummary {
  region: string;
  avgReturn: number;
  count: number;
}

type RegionFilter = 'ALL' | 'AMERICAS' | 'EUROPE' | 'ASIA-PACIFIC';

const REGION_FILTERS: RegionFilter[] = ['ALL', 'AMERICAS', 'EUROPE', 'ASIA-PACIFIC'];

const REGION_ORDER = ['AMERICAS', 'EUROPE', 'ASIA-PACIFIC'];

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 10000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(2);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-green-400';
    case 'PRE':
      return 'bg-yellow-400';
    default:
      return 'bg-neutral-500';
  }
}

function statusTextColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'text-green-400';
    case 'PRE':
      return 'text-yellow-400';
    default:
      return 'text-neutral-500';
  }
}

// ── Main Panel ──

export function GlobalIndexMonitorPanel() {
  const { data, isLoading, refetch } = useGlobalIndexMonitor();
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');

  const indices = (data?.indices as IndexEntry[] | undefined) ?? [];

  // Compute advancers / decliners
  const { advancers, decliners } = useMemo(() => {
    let adv = 0;
    let dec = 0;
    for (const idx of indices) {
      if (idx.changePercent > 0) adv++;
      else if (idx.changePercent < 0) dec++;
    }
    return { advancers: adv, decliners: dec };
  }, [indices]);

  // Filter by region
  const filteredIndices = useMemo(() => {
    if (regionFilter === 'ALL') return indices;
    return indices.filter((idx) => idx.region?.toUpperCase() === regionFilter);
  }, [indices, regionFilter]);

  // Group by region
  const grouped = useMemo(() => {
    const map = new Map<string, IndexEntry[]>();
    for (const idx of filteredIndices) {
      const region = idx.region ?? 'OTHER';
      const arr = map.get(region) ?? [];
      arr.push(idx);
      map.set(region, arr);
    }
    return map;
  }, [filteredIndices]);

  // Region performance summary
  const regionSummaries: RegionSummary[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const idx of indices) {
      const region = idx.region ?? 'OTHER';
      const entry = map.get(region) ?? { total: 0, count: 0 };
      entry.total += idx.changePercent ?? 0;
      entry.count++;
      map.set(region, entry);
    }
    return Array.from(map.entries())
      .map(([region, { total, count }]) => ({
        region,
        avgReturn: count > 0 ? total / count : 0,
        count,
      }))
      .sort((a, b) => {
        const ai = REGION_ORDER.indexOf(a.region);
        const bi = REGION_ORDER.indexOf(b.region);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }, [indices]);

  // Best & worst performers
  const { best, worst } = useMemo(() => {
    if (indices.length === 0) return { best: [], worst: [] };
    const sorted = [...indices].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    return {
      best: sorted.slice(0, 5),
      worst: sorted.slice(-5).reverse(),
    };
  }, [indices]);

  // Max absolute avg return for bar scaling
  const maxAbsAvgReturn = useMemo(() => {
    if (regionSummaries.length === 0) return 1;
    return Math.max(...regionSummaries.map((r) => Math.abs(r.avgReturn)), 0.01);
  }, [regionSummaries]);

  // Ordered regions for display
  const displayRegions = useMemo(() => {
    if (regionFilter === 'ALL') {
      return REGION_ORDER.filter((r) => grouped.has(r)).concat(
        Array.from(grouped.keys()).filter((r) => !REGION_ORDER.includes(r))
      );
    }
    return Array.from(grouped.keys());
  }, [grouped, regionFilter]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            WORLD EQUITY INDICES
          </span>
          {indices.length > 0 && (
            <span className="text-[8px] font-mono text-neutral-500 ml-2">
              <span className="text-green-400">{advancers}</span>
              <span className="text-neutral-600 mx-0.5">/</span>
              <span className="text-red-400">{decliners}</span>
              <span className="text-neutral-600 ml-1">A/D</span>
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Region filter tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 bg-[#050505] shrink-0">
        {REGION_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setRegionFilter(filter)}
            className={`px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              regionFilter === filter
                ? 'text-sky-400 border-b border-sky-400 bg-sky-400/[0.05]'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {/* No data */}
        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {/* Index table grouped by region */}
            <div className="overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 z-10 bg-[#080808]">
                  <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/20">
                    <th className="text-left px-2 py-1 font-normal sticky left-0 bg-[#080808]">Index</th>
                    <th className="text-right px-2 py-1 font-normal">Last</th>
                    <th className="text-right px-2 py-1 font-normal">Chg</th>
                    <th className="text-right px-2 py-1 font-normal">Chg%</th>
                    <th className="text-right px-2 py-1 font-normal">Open</th>
                    <th className="text-right px-2 py-1 font-normal">High</th>
                    <th className="text-right px-2 py-1 font-normal">Low</th>
                    <th className="text-right px-2 py-1 font-normal">YTD%</th>
                    <th className="text-right px-2 py-1 font-normal">P/E</th>
                    <th className="text-right px-2 py-1 font-normal">Div%</th>
                    <th className="text-center px-2 py-1 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRegions.map((region) => {
                    const regionIndices = grouped.get(region);
                    if (!regionIndices || regionIndices.length === 0) return null;
                    return (
                      <RegionGroup key={region} region={region} indices={regionIndices} />
                    );
                  })}
                  {filteredIndices.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-4 text-neutral-600">
                        No indices found for this region
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom section: two columns */}
            {indices.length > 0 && (
              <div className="grid grid-cols-2 border-t border-border/20">
                {/* Left: Region performance summary */}
                <div className="border-r border-border/20 p-2">
                  <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
                    Region Performance (Avg Return)
                  </div>
                  <div className="space-y-1.5">
                    {regionSummaries.map((rs) => (
                      <div key={rs.region} className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-neutral-400 w-20 shrink-0 truncate">
                          {rs.region}
                        </span>
                        <div className="flex-1 h-3 relative bg-neutral-900">
                          {/* Center line */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
                          {/* Bar */}
                          <div
                            className={`absolute top-0 bottom-0 ${
                              rs.avgReturn >= 0 ? 'bg-green-400/40 left-1/2' : 'bg-red-400/40 right-1/2'
                            }`}
                            style={{
                              width: `${(Math.abs(rs.avgReturn) / maxAbsAvgReturn) * 50}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-[8px] font-mono font-bold w-14 text-right shrink-0 ${changeColor(
                            rs.avgReturn
                          )}`}
                        >
                          {fmtPct(rs.avgReturn)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Best & worst performers */}
                <div className="p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Best */}
                    <div>
                      <div className="text-[7px] font-black font-mono uppercase tracking-wider text-green-400/60 mb-1.5">
                        Best Performers
                      </div>
                      <div className="space-y-0.5">
                        {best.map((idx) => (
                          <div
                            key={idx.symbol}
                            className="flex items-center justify-between px-1 py-0.5 hover:bg-sky-400/[0.02]"
                          >
                            <span className="text-[8px] font-mono text-neutral-300 truncate max-w-[80px]">
                              {idx.name}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-green-400">
                              {fmtPct(idx.changePercent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Worst */}
                    <div>
                      <div className="text-[7px] font-black font-mono uppercase tracking-wider text-red-400/60 mb-1.5">
                        Worst Performers
                      </div>
                      <div className="space-y-0.5">
                        {worst.map((idx) => (
                          <div
                            key={idx.symbol}
                            className="flex items-center justify-between px-1 py-0.5 hover:bg-sky-400/[0.02]"
                          >
                            <span className="text-[8px] font-mono text-neutral-300 truncate max-w-[80px]">
                              {idx.name}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-red-400">
                              {fmtPct(idx.changePercent)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Region Group (header + rows) ──

function RegionGroup({ region, indices }: { region: string; indices: IndexEntry[] }) {
  return (
    <>
      <tr className="bg-white/[0.02]">
        <td
          colSpan={11}
          className="px-2 py-1 border-b border-border/20 sticky left-0"
        >
          <span className="text-[7px] font-black uppercase tracking-[0.15em] text-sky-400/60">
            {region}
          </span>
        </td>
      </tr>
      {indices.map((idx) => (
        <tr
          key={idx.symbol}
          className="border-b border-neutral-900 hover:bg-sky-400/[0.02] transition-colors"
        >
          <td className="px-2 py-1 text-white font-bold truncate max-w-[140px] sticky left-0 bg-black">
            {idx.name}
          </td>
          <td className="px-2 py-1 text-right text-white font-bold tabular-nums">
            {fmtPrice(idx.last)}
          </td>
          <td className={`px-2 py-1 text-right font-bold tabular-nums ${changeColor(idx.change)}`}>
            {fmtChange(idx.change)}
          </td>
          <td className={`px-2 py-1 text-right font-bold tabular-nums ${changeColor(idx.changePercent)}`}>
            {fmtPct(idx.changePercent)}
          </td>
          <td className="px-2 py-1 text-right text-neutral-400 tabular-nums">
            {fmtPrice(idx.open)}
          </td>
          <td className="px-2 py-1 text-right text-neutral-400 tabular-nums">
            {fmtPrice(idx.high)}
          </td>
          <td className="px-2 py-1 text-right text-neutral-400 tabular-nums">
            {fmtPrice(idx.low)}
          </td>
          <td className={`px-2 py-1 text-right font-bold tabular-nums ${changeColor(idx.ytdPercent)}`}>
            {fmtPct(idx.ytdPercent)}
          </td>
          <td className="px-2 py-1 text-right text-neutral-400 tabular-nums">
            {fmtNum(idx.pe, 1)}
          </td>
          <td className="px-2 py-1 text-right text-neutral-400 tabular-nums">
            {idx.divYield != null ? `${fmtNum(idx.divYield, 2)}%` : '--'}
          </td>
          <td className="px-2 py-1 text-center">
            <span className="inline-flex items-center gap-1">
              <span className={`w-1 h-1 ${statusDotColor(idx.status)}`} />
              <span className={`text-[7px] font-bold uppercase ${statusTextColor(idx.status)}`}>
                {idx.status}
              </span>
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}
