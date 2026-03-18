import { useState, useMemo } from 'react';
import {
  useSectorPerformance,
  type SectorPerformanceEntry,
} from '../../api/hooks/use-sector-performance';
import { useT, type TranslationKey } from '../../i18n';
import { BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type PeriodKey = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | '1y';
type ViewMode = 'absolute' | 'relative';
type SortDir = 'asc' | 'desc';

const PERIODS: PeriodKey[] = ['1d', '1w', '1m', '3m', '6m', 'ytd', '1y'];
const PERIOD_LABELS: Record<PeriodKey, string> = {
  '1d': '1D',
  '1w': '1W',
  '1m': '1M',
  '3m': '3M',
  '6m': '6M',
  ytd: 'YTD',
  '1y': '1Y',
};

/** Heatmap cell color based on return percentage */
function getCellBg(value: number | null): string {
  if (value == null) return 'rgba(63,63,70,0.2)';
  if (value > 3) return 'rgba(22,163,74,0.85)';   // dark green
  if (value > 1) return 'rgba(34,197,94,0.55)';    // light green
  if (value > 0) return 'rgba(74,222,128,0.28)';   // pale green
  if (value > -1) return 'rgba(248,113,113,0.28)';  // pale red
  if (value > -3) return 'rgba(239,68,68,0.55)';    // light red
  return 'rgba(220,38,38,0.85)';                     // dark red
}

function formatReturn(value: number | null): string {
  if (value == null) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

/** Summary bar showing best/worst sector and rotation signal */
function SummaryBar({
  sectors,
  spy,
  sortPeriod,
  mode,
}: {
  sectors: SectorPerformanceEntry[];
  spy: SectorPerformanceEntry;
  sortPeriod: PeriodKey;
  mode: ViewMode;
}) {
  const data = useMemo(() => {
    const ranked = sectors
      .map((s) => ({
        name: s.name,
        symbol: s.symbol,
        val: mode === 'absolute' ? s.returns[sortPeriod] : s.relativeToSpy[sortPeriod],
      }))
      .filter((s) => s.val != null)
      .sort((a, b) => (b.val ?? 0) - (a.val ?? 0));

    const best = ranked[0] ?? null;
    const worst = ranked[ranked.length - 1] ?? null;

    // Sector rotation: compare 1M vs 3M rank changes
    let rotationFrom: string | null = null;
    let rotationTo: string | null = null;
    if (sectors.length > 1) {
      const rank1m = [...sectors]
        .sort((a, b) => (b.returns['1m'] ?? -999) - (a.returns['1m'] ?? -999))
        .map((s) => s.symbol);
      const rank3m = [...sectors]
        .sort((a, b) => (b.returns['3m'] ?? -999) - (a.returns['3m'] ?? -999))
        .map((s) => s.symbol);

      let biggestRise = 0;
      let biggestFall = 0;
      for (const s of sectors) {
        const idx1m = rank1m.indexOf(s.symbol);
        const idx3m = rank3m.indexOf(s.symbol);
        const change = idx3m - idx1m; // positive = improved (lower index = higher rank)
        if (change > biggestRise) {
          biggestRise = change;
          rotationTo = s.name;
        }
        if (change < biggestFall) {
          biggestFall = change;
          rotationFrom = s.name;
        }
      }
    }

    return { best, worst, rotationFrom, rotationTo };
  }, [sectors, sortPeriod, mode]);

  return (
    <div className="flex items-center gap-3 px-3 py-1 border-b border-border/20 bg-black/40 shrink-0 flex-wrap">
      {data.best && (
        <div className="flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase">
            {data.best.name}
          </span>
          <span className="text-[8px] font-mono text-emerald-300">
            {formatReturn(data.best.val)}%
          </span>
        </div>
      )}
      {data.worst && (
        <div className="flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3 text-red-400" />
          <span className="text-[8px] font-mono text-red-400 font-bold uppercase">
            {data.worst.name}
          </span>
          <span className="text-[8px] font-mono text-red-300">
            {formatReturn(data.worst.val)}%
          </span>
        </div>
      )}
      {data.rotationFrom && data.rotationTo && data.rotationFrom !== data.rotationTo && (
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[7px] font-mono text-neutral/40 uppercase">Rotation:</span>
          <span className="text-[8px] font-mono text-red-400">{data.rotationFrom}</span>
          <span className="text-[8px] font-mono text-neutral/30">&rarr;</span>
          <span className="text-[8px] font-mono text-emerald-400">{data.rotationTo}</span>
        </div>
      )}
    </div>
  );
}

/** SVG horizontal bar chart for selected timeframe */
function MiniBarChart({
  sectors,
  spy,
  period,
  mode,
}: {
  sectors: SectorPerformanceEntry[];
  spy: SectorPerformanceEntry;
  period: PeriodKey;
  mode: ViewMode;
}) {
  const items = useMemo(() => {
    return sectors
      .map((s) => ({
        name: s.symbol,
        value: mode === 'absolute' ? s.returns[period] : s.relativeToSpy[period],
      }))
      .filter((s) => s.value != null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }, [sectors, period, mode]);

  const spyVal = mode === 'absolute' ? (spy.returns[period] ?? 0) : 0;

  if (items.length === 0) return null;

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value ?? 0)), Math.abs(spyVal), 1);
  const barHeight = 12;
  const gap = 2;
  const labelWidth = 34;
  const valueWidth = 40;
  const chartWidth = 200;
  const totalWidth = labelWidth + chartWidth + valueWidth;
  const totalHeight = items.length * (barHeight + gap) + gap;
  const midX = labelWidth + chartWidth / 2;

  return (
    <div className="px-3 py-1.5 border-t border-border/20 bg-black/20 shrink-0 overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        style={{ maxHeight: Math.min(totalHeight, 180) }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Center line (zero) */}
        <line
          x1={midX}
          y1={0}
          x2={midX}
          y2={totalHeight}
          stroke="rgba(161,161,170,0.2)"
          strokeWidth={0.5}
        />
        {/* SPY reference line */}
        {mode === 'absolute' && spyVal !== 0 && (
          <line
            x1={midX + (spyVal / maxAbs) * (chartWidth / 2)}
            y1={0}
            x2={midX + (spyVal / maxAbs) * (chartWidth / 2)}
            y2={totalHeight}
            stroke="rgba(251,191,36,0.5)"
            strokeWidth={0.8}
            strokeDasharray="2,2"
          />
        )}
        {items.map((item, i) => {
          const y = gap + i * (barHeight + gap);
          const val = item.value ?? 0;
          const barW = (Math.abs(val) / maxAbs) * (chartWidth / 2);
          const isPositive = val >= 0;
          const barX = isPositive ? midX : midX - barW;
          const fill = isPositive ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)';

          return (
            <g key={item.name}>
              {/* Label */}
              <text
                x={labelWidth - 3}
                y={y + barHeight / 2 + 3}
                textAnchor="end"
                fill="rgba(161,161,170,0.6)"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {item.name}
              </text>
              {/* Bar */}
              <rect
                x={barX}
                y={y}
                width={Math.max(barW, 0.5)}
                height={barHeight}
                fill={fill}
                rx={1}
              />
              {/* Value */}
              <text
                x={labelWidth + chartWidth + 3}
                y={y + barHeight / 2 + 3}
                textAnchor="start"
                fill={isPositive ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)'}
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {formatReturn(val)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SectorPerformancePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSectorPerformance();

  const [mode, setMode] = useState<ViewMode>('absolute');
  const [sortPeriod, setSortPeriod] = useState<PeriodKey>('ytd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('ytd');

  const handleColumnClick = (period: PeriodKey) => {
    if (sortPeriod === period) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortPeriod(period);
      setSortDir('desc');
    }
    setSelectedPeriod(period);
  };

  const sortedSectors = useMemo(() => {
    if (!data?.sectors) return [];
    const list = [...data.sectors];
    list.sort((a, b) => {
      const aVal = mode === 'absolute' ? a.returns[sortPeriod] : a.relativeToSpy[sortPeriod];
      const bVal = mode === 'absolute' ? b.returns[sortPeriod] : b.relativeToSpy[sortPeriod];
      const av = aVal ?? -9999;
      const bv = bVal ?? -9999;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [data?.sectors, sortPeriod, sortDir, mode]);

  // Fallback translation helper
  const tf = (key: string, fallback: string): string => {
    try {
      return t(key as TranslationKey) || fallback;
    } catch {
      return fallback;
    }
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tf('sectorPerformance', 'SECTOR PERFORMANCE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5">
            {(['absolute', 'relative'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase transition-all ${
                  mode === v
                    ? 'bg-orange-400/20 text-orange-400'
                    : 'text-neutral/50 hover:text-white'
                }`}
              >
                {v === 'absolute' ? tf('spAbsolute', 'Absolute') : tf('spRelative', 'Relative')}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-orange-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <SummaryBar
          sectors={sortedSectors}
          spy={data.spy}
          sortPeriod={selectedPeriod}
          mode={mode}
        />
      )}

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
          <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest">
            {t('loading')}
          </span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
            {tf('noSectorData', 'No sector data')}
          </span>
        </div>
      )}

      {/* Main matrix */}
      {data && (
        <>
          <div className="flex-1 overflow-auto no-scrollbar">
            <table className="w-full border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[#0a0a0a] sticky top-0 z-10">
                  <th className="text-left text-[8px] font-mono font-black text-neutral/50 uppercase tracking-wider px-2 py-1.5 border-b border-border/20 min-w-[100px]">
                    {tf('spSector', 'Sector')}
                  </th>
                  {PERIODS.map((p) => (
                    <th
                      key={p}
                      onClick={() => handleColumnClick(p)}
                      className={`text-center text-[8px] font-mono font-black uppercase tracking-wider px-1 py-1.5 border-b border-border/20 cursor-pointer transition-colors select-none min-w-[48px] ${
                        sortPeriod === p
                          ? 'text-orange-400 bg-orange-400/5'
                          : 'text-neutral/50 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-0.5">
                        {PERIOD_LABELS[p]}
                        {sortPeriod === p && (
                          <span className="text-[6px]">{sortDir === 'desc' ? '\u25BC' : '\u25B2'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSectors.map((sector) => (
                  <tr key={sector.symbol} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-2 py-0.5 border-b border-border/10">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono font-black text-white/80 uppercase tracking-wider leading-tight">
                          {sector.name}
                        </span>
                        <span className="text-[7px] font-mono text-neutral/30">
                          {sector.symbol}
                          {sector.price != null && (
                            <span className="ml-1">${sector.price.toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {PERIODS.map((p) => {
                      const val =
                        mode === 'absolute'
                          ? sector.returns[p]
                          : sector.relativeToSpy[p];
                      return (
                        <td
                          key={p}
                          className={`text-center px-0.5 py-0.5 border-b border-border/10 ${
                            selectedPeriod === p ? 'ring-1 ring-inset ring-orange-400/20' : ''
                          }`}
                          style={{ backgroundColor: getCellBg(val) }}
                        >
                          <span className="text-[9px] font-mono font-bold text-white leading-none">
                            {formatReturn(val)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* SPY benchmark row */}
                <tr className="bg-white/[0.03] border-t border-border/30">
                  <td className="px-2 py-0.5 border-b border-border/10">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono font-black text-orange-400/80 uppercase tracking-wider leading-tight">
                        S&P 500
                      </span>
                      <span className="text-[7px] font-mono text-neutral/30">
                        SPY
                        {data.spy.price != null && (
                          <span className="ml-1">${data.spy.price.toFixed(2)}</span>
                        )}
                      </span>
                    </div>
                  </td>
                  {PERIODS.map((p) => {
                    const val =
                      mode === 'absolute'
                        ? data.spy.returns[p]
                        : data.spy.relativeToSpy[p];
                    return (
                      <td
                        key={p}
                        className={`text-center px-0.5 py-0.5 border-b border-border/10 ${
                          selectedPeriod === p ? 'ring-1 ring-inset ring-orange-400/20' : ''
                        }`}
                        style={{ backgroundColor: getCellBg(val) }}
                      >
                        <span className="text-[9px] font-mono font-bold text-white leading-none">
                          {formatReturn(val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mini bar chart */}
          <MiniBarChart
            sectors={sortedSectors}
            spy={data.spy}
            period={selectedPeriod}
            mode={mode}
          />
        </>
      )}
    </div>
  );
}
