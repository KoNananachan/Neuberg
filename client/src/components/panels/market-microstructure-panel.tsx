import { useState, useMemo } from 'react';
import {
  useMarketMicrostructure,
  type MicrostructureEntry,
  type MicrostructureResponse,
} from '../../api/hooks/use-market-microstructure';
import { useT } from '../../i18n';
import { Layers, RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ROSE = '#f43f5e';
const ROSE_LIGHT = '#fb7185';
const GREEN = '#34d399';
const BRIGHT_GREEN = '#4ade80';
const YELLOW = '#facc15';
const RED = '#f87171';
const BLUE = '#60a5fa';
const WHITE_DIM = 'rgba(255,255,255,0.35)';
const WHITE_FAINT = 'rgba(255,255,255,0.2)';

// ── Formatting helpers ──

function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function spreadColor(percentile: number): string {
  if (percentile > 80) return RED;
  if (percentile > 60) return YELLOW;
  if (percentile > 40) return WHITE_DIM;
  return GREEN;
}

function liqScoreColor(score: number): string {
  if (score >= 70) return GREEN;
  if (score >= 40) return YELLOW;
  return RED;
}

function signalBadge(signal: string | null): { text: string; color: string; bg: string } | null {
  switch (signal) {
    case 'WIDE_SPREAD':
      return { text: 'WIDE SPR', color: RED, bg: 'rgba(248,113,113,0.15)' };
    case 'UNUSUAL_VOLUME':
      return { text: 'UNSL VOL', color: YELLOW, bg: 'rgba(250,204,21,0.12)' };
    case 'BLOCK_ACTIVITY':
      return { text: 'BLOCK', color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'LOW_LIQUIDITY':
      return { text: 'LOW LIQ', color: RED, bg: 'rgba(248,113,113,0.18)' };
    default:
      return null;
  }
}

// ── Sort ──

type SortKey =
  | 'symbol'
  | 'price'
  | 'spreadBps'
  | 'avgDailyVolume'
  | 'relativeVolume'
  | 'avgTradeSize'
  | 'blockTradesPct'
  | 'darkPoolPct'
  | 'liquidityScore';

function sortEntries(
  entries: MicrostructureEntry[],
  key: SortKey,
  asc: boolean,
): MicrostructureEntry[] {
  return [...entries].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    if (key === 'symbol') {
      va = a.symbol;
      vb = b.symbol;
      return asc ? (va as string).localeCompare(vb as string) : (vb as string).localeCompare(va as string);
    }
    va = a[key] as number;
    vb = b[key] as number;
    return asc ? va - vb : vb - va;
  });
}

// ── Mini Depth Bars (SVG) ──

function DepthBars({ entry }: { entry: MicrostructureEntry }) {
  const { bidDepth, askDepth } = entry.marketDepth;
  const W = 52;
  const H = 14;
  const MID = W / 2;
  const levels = 5;
  const barH = H / levels - 0.5;

  const maxDepth = Math.max(...bidDepth, ...askDepth, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {/* Center divider */}
      <line x1={MID} y1={0} x2={MID} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      {Array.from({ length: levels }).map((_, i) => {
        const y = i * (H / levels);
        const bidW = (bidDepth[i] / maxDepth) * (MID - 1);
        const askW = (askDepth[i] / maxDepth) * (MID - 1);
        return (
          <g key={i}>
            {/* Bid bar (left, green) */}
            <rect
              x={MID - bidW - 0.5}
              y={y}
              width={bidW}
              height={barH}
              fill={GREEN}
              fillOpacity={0.5 - i * 0.06}
            />
            {/* Ask bar (right, red) */}
            <rect
              x={MID + 0.5}
              y={y}
              width={askW}
              height={barH}
              fill={RED}
              fillOpacity={0.5 - i * 0.06}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── Size Distribution Stacked Bar ──

function SizeDistBar({ dist }: { dist: MicrostructureEntry['tradeSizeDistribution'] }) {
  const W = 44;
  const H = 8;
  const segments = [
    { pct: dist.small, color: 'rgba(255,255,255,0.2)' },   // gray — small
    { pct: dist.medium, color: 'rgba(96,165,250,0.5)' },    // blue — medium
    { pct: dist.large, color: 'rgba(250,204,21,0.5)' },     // yellow — large
    { pct: dist.block, color: 'rgba(248,113,113,0.6)' },    // red — block
  ];

  let x = 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {segments.map((seg, i) => {
        const segW = (seg.pct / 100) * W;
        const rect = (
          <rect key={i} x={x} y={0} width={segW} height={H} fill={seg.color} />
        );
        x += segW;
        return rect;
      })}
    </svg>
  );
}

// ── Liquidity Score Bar ──

function LiqScoreBar({ score }: { score: number }) {
  const W = 36;
  const H = 6;
  const fillW = (score / 100) * W;
  const color = liqScoreColor(score);

  return (
    <div className="flex items-center gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
        <rect x={0} y={0} width={fillW} height={H} fill={color} fillOpacity={0.5} />
      </svg>
      <span className="text-[7px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Sparkline (spread history) ──

function SpreadSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 44;
  const H = 12;
  const PAD = 1;

  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;

  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - minV) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');

  // Color based on trend — last vs first
  const trend = data[data.length - 1] - data[0];
  const lineColor = trend > 0 ? RED : GREEN;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={0.8} strokeOpacity={0.7} />
      {/* Endpoint dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r={1.2}
        fill={lineColor}
        fillOpacity={0.9}
      />
    </svg>
  );
}

// ── Column Header ──

function ColHeader({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
  align = 'right',
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentAsc: boolean;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  const textAlign = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';

  return (
    <span
      className={`cursor-pointer select-none uppercase tracking-wider ${textAlign} ${className}`}
      style={{ color: isActive ? ROSE_LIGHT : WHITE_FAINT }}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-[4px]">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </span>
  );
}

// ── Main Panel ──

export function MarketMicrostructurePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarketMicrostructure();

  const [sortKey, setSortKey] = useState<SortKey>('liquidityScore');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return sortEntries(data.entries, sortKey, sortAsc);
  }, [data, sortKey, sortAsc]);

  const summary = data?.marketSummary;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: ROSE }} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ROSE }}>
            {tr(t, 'microTitle', 'Market Microstructure')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {summary && (
            <>
              <span
                className="text-[5px] font-bold uppercase px-1 py-0.5"
                style={{ color: ROSE_LIGHT, backgroundColor: 'rgba(244,63,94,0.1)' }}
              >
                AVG {summary.avgSpreadBps.toFixed(1)} BPS
              </span>
              <span
                className="text-[5px] font-bold uppercase px-1 py-0.5"
                style={{ color: WHITE_DIM, backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                VOL {compactNumber(summary.totalVolume)}
              </span>
              {summary.wideSpreadsCount > 0 && (
                <span
                  className="text-[5px] font-bold uppercase px-1 py-0.5"
                  style={{ color: RED, backgroundColor: 'rgba(248,113,113,0.12)' }}
                >
                  {summary.wideSpreadsCount} WIDE
                </span>
              )}
            </>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-rose-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data && sorted.length > 0 ? (
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[5px]">
                <th className="py-1 px-1.5 text-left">
                  <ColHeader label="Symbol" sortKey="symbol" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} align="left" />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Price" sortKey="price" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Spread" sortKey="spreadBps" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="ADV" sortKey="avgDailyVolume" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Rel Vol" sortKey="relativeVolume" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Avg Size" sortKey="avgTradeSize" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Block%" sortKey="blockTradesPct" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Dark%" sortKey="darkPoolPct" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1 text-center">
                  <span className="uppercase tracking-wider" style={{ color: WHITE_FAINT }}>Depth</span>
                </th>
                <th className="py-1 px-1 text-center">
                  <span className="uppercase tracking-wider" style={{ color: WHITE_FAINT }}>Size Dist</span>
                </th>
                <th className="py-1 px-1">
                  <ColHeader label="Liq Score" sortKey="liquidityScore" currentSort={sortKey} currentAsc={sortAsc} onSort={handleSort} />
                </th>
                <th className="py-1 px-1 text-center">
                  <span className="uppercase tracking-wider" style={{ color: WHITE_FAINT }}>Signal</span>
                </th>
                <th className="py-1 px-1 text-center">
                  <span className="uppercase tracking-wider" style={{ color: WHITE_FAINT }}>Spark</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => {
                const badge = signalBadge(e.microSignal);
                return (
                  <tr
                    key={e.symbol}
                    className="border-b border-white/[0.02] hover:bg-rose-400/[0.02] transition-colors"
                  >
                    {/* Symbol + Name */}
                    <td className="py-0.5 px-1.5">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-white/70">{e.symbol}</span>
                        <span className="text-[5px] text-white/25 truncate max-w-[70px]">{e.name}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-0.5 px-1 text-right">
                      <span className="text-[8px] text-white/60 font-bold">
                        {e.price.toFixed(2)}
                      </span>
                    </td>

                    {/* Spread (cents + bps) */}
                    <td className="py-0.5 px-1 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-bold" style={{ color: spreadColor(e.spreadPercentile) }}>
                          {e.bidAskSpread.toFixed(1)}\u00A2
                        </span>
                        <span className="text-[5px]" style={{ color: spreadColor(e.spreadPercentile) }}>
                          {e.spreadBps.toFixed(1)} bps
                        </span>
                      </div>
                    </td>

                    {/* ADV */}
                    <td className="py-0.5 px-1 text-right">
                      <span className="text-[8px] text-white/50">
                        {compactNumber(e.avgDailyVolume)}
                      </span>
                    </td>

                    {/* Relative Volume */}
                    <td className="py-0.5 px-1 text-right">
                      <span
                        className="text-[8px] font-bold"
                        style={{ color: e.relativeVolume > 2 ? RED : e.relativeVolume > 1.2 ? YELLOW : WHITE_DIM }}
                      >
                        {e.relativeVolume.toFixed(2)}x
                      </span>
                    </td>

                    {/* Avg Trade Size */}
                    <td className="py-0.5 px-1 text-right">
                      <span className="text-[8px] text-white/50">
                        {e.avgTradeSize.toLocaleString()}
                      </span>
                    </td>

                    {/* Block % */}
                    <td className="py-0.5 px-1 text-right">
                      <span
                        className="text-[8px] font-bold"
                        style={{ color: e.blockTradesPct > 15 ? BLUE : WHITE_DIM }}
                      >
                        {e.blockTradesPct.toFixed(1)}%
                      </span>
                    </td>

                    {/* Dark Pool % */}
                    <td className="py-0.5 px-1 text-right">
                      <span className="text-[8px] text-white/40">
                        {e.darkPoolPct.toFixed(1)}%
                      </span>
                    </td>

                    {/* Depth mini visualization */}
                    <td className="py-0.5 px-1">
                      <div className="flex justify-center">
                        <DepthBars entry={e} />
                      </div>
                    </td>

                    {/* Size Distribution */}
                    <td className="py-0.5 px-1">
                      <div className="flex justify-center">
                        <SizeDistBar dist={e.tradeSizeDistribution} />
                      </div>
                    </td>

                    {/* Liquidity Score */}
                    <td className="py-0.5 px-1">
                      <div className="flex justify-end">
                        <LiqScoreBar score={e.liquidityScore} />
                      </div>
                    </td>

                    {/* Signal */}
                    <td className="py-0.5 px-1 text-center">
                      {badge ? (
                        <span
                          className="text-[5px] font-black uppercase px-1 py-0.5 inline-block"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.text}
                        </span>
                      ) : (
                        <span className="text-[5px] text-white/10">&mdash;</span>
                      )}
                    </td>

                    {/* Sparkline */}
                    <td className="py-0.5 px-1">
                      <div className="flex justify-center">
                        <SpreadSparkline data={e.spreadHistory} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'microNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
