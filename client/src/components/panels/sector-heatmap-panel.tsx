import { useState, useMemo, useCallback } from 'react';
import {
  useSectorHeatmap,
  type SectorEntry,
  type SectorStock,
} from '../../api/hooks/use-sector-heatmap';
import { useAppStore } from '../../stores/use-app-store';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Grid3X3 } from 'lucide-react';

// ── i18n helper with fallback ──

// ── Constants ──

const ACCENT = '#f59e0b'; // amber-400

// ── Squarified treemap algorithm ──

interface TreemapItem { id: string; weight: number }
interface TreemapRect { id: string; x: number; y: number; w: number; h: number }
interface Rect { x: number; y: number; w: number; h: number }

function squarify(items: TreemapItem[], rect: Rect): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ id: items[0].id, x: rect.x, y: rect.y, w: rect.w, h: rect.h }];
  }

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) {
    // Distribute evenly if all weights are 0
    const n = items.length;
    const cols = Math.ceil(Math.sqrt(n));
    const cellW = rect.w / cols;
    const cellH = rect.h / Math.ceil(n / cols);
    return items.map((item, i) => ({
      id: item.id,
      x: rect.x + (i % cols) * cellW,
      y: rect.y + Math.floor(i / cols) * cellH,
      w: cellW,
      h: cellH,
    }));
  }

  // Sort descending by weight
  const sorted = [...items].sort((a, b) => b.weight - a.weight);

  // Slice-and-dice with aspect-ratio optimization
  const isHorizontal = rect.w >= rect.h;

  // Find the best split point that minimizes worst aspect ratio
  let bestSplit = 1;
  let bestRatio = Infinity;
  let runningWeight = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    runningWeight += sorted[i].weight;
    const fraction = runningWeight / totalWeight;

    // Calculate aspect ratios for both halves
    let r1w: number, r1h: number, r2w: number, r2h: number;
    if (isHorizontal) {
      r1w = rect.w * fraction;
      r1h = rect.h;
      r2w = rect.w * (1 - fraction);
      r2h = rect.h;
    } else {
      r1w = rect.w;
      r1h = rect.h * fraction;
      r2w = rect.w;
      r2h = rect.h * (1 - fraction);
    }

    const ar1 = Math.max(r1w / (r1h || 1), r1h / (r1w || 1));
    const ar2 = Math.max(r2w / (r2h || 1), r2h / (r2w || 1));
    const worstAr = Math.max(ar1, ar2);

    if (worstAr < bestRatio) {
      bestRatio = worstAr;
      bestSplit = i + 1;
    }
  }

  const left = sorted.slice(0, bestSplit);
  const right = sorted.slice(bestSplit);

  const leftWeight = left.reduce((s, i) => s + i.weight, 0);
  const fraction = leftWeight / totalWeight;

  let leftRect: Rect;
  let rightRect: Rect;

  if (isHorizontal) {
    const splitX = rect.x + rect.w * fraction;
    leftRect = { x: rect.x, y: rect.y, w: rect.w * fraction, h: rect.h };
    rightRect = { x: splitX, y: rect.y, w: rect.w * (1 - fraction), h: rect.h };
  } else {
    const splitY = rect.y + rect.h * fraction;
    leftRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h * fraction };
    rightRect = { x: rect.x, y: splitY, w: rect.w, h: rect.h * (1 - fraction) };
  }

  return [
    ...squarify(left, leftRect),
    ...squarify(right, rightRect),
  ];
}

// ── Color helpers ──

function getHeatColor(changePct: number): string {
  const abs = Math.min(Math.abs(changePct), 3);
  const intensity = abs / 3; // 0..1

  if (Math.abs(changePct) < 0.05) return '#27272a'; // zinc-800 for ~0%

  if (changePct > 0) {
    // Green: from emerald-900 (#064e3b) to emerald-500 (#10b981)
    const r = Math.round(6 + intensity * (16 - 6));
    const g = Math.round(78 + intensity * (185 - 78));
    const b = Math.round(59 + intensity * (129 - 59));
    return `rgb(${r},${g},${b})`;
  } else {
    // Red: from red-900 (#7f1d1d) to red-500 (#ef4444)
    const r = Math.round(127 + intensity * (239 - 127));
    const g = Math.round(29 + intensity * (68 - 29));
    const b = Math.round(29 + intensity * (68 - 29));
    return `rgb(${r},${g},${b})`;
  }
}

function getTextColor(changePct: number): string {
  if (changePct > 0) return '#6ee7b7'; // emerald-300
  if (changePct < 0) return '#fca5a5'; // red-300
  return 'rgba(255,255,255,0.5)';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  return String(Math.round(n));
}

// ── Treemap SVG component ──

function SectorTreemap({
  sectors,
  width,
  height,
  hoveredSector,
  onHoverSector,
  onClickStock,
}: {
  sectors: SectorEntry[];
  width: number;
  height: number;
  hoveredSector: string | null;
  onHoverSector: (name: string | null) => void;
  onClickStock: (symbol: string) => void;
}) {
  // Build sector-level treemap
  const sectorItems: TreemapItem[] = sectors.map((s) => ({
    id: s.name,
    weight: Math.max(s.marketCap, 1),
  }));

  const sectorRects = squarify(sectorItems, { x: 0, y: 0, w: width, h: height });

  // Build map for quick lookup
  const sectorMap = new Map(sectors.map((s) => [s.name, s]));
  const rectMap = new Map(sectorRects.map((r) => [r.id, r]));

  return (
    <svg width={width} height={height} className="block">
      {sectorRects.map((sr) => {
        const sector = sectorMap.get(sr.id);
        if (!sector) return null;

        const isHovered = hoveredSector === sr.id;
        const GAP = 1;

        // When hovered, show individual stocks inside the sector rect
        if (isHovered && sector.stocks.length > 0) {
          const stockItems: TreemapItem[] = sector.stocks.map((s) => ({
            id: s.symbol,
            weight: Math.max(s.marketCap, 1),
          }));

          const stockRects = squarify(stockItems, {
            x: sr.x + GAP,
            y: sr.y + GAP,
            w: sr.w - GAP * 2,
            h: sr.h - GAP * 2,
          });

          const stockMap = new Map(sector.stocks.map((s) => [s.symbol, s]));

          return (
            <g
              key={sr.id}
              onMouseLeave={() => onHoverSector(null)}
            >
              {/* Sector background border */}
              <rect
                x={sr.x}
                y={sr.y}
                width={sr.w}
                height={sr.h}
                fill={ACCENT}
                fillOpacity={0.3}
              />
              {stockRects.map((stR) => {
                const stock = stockMap.get(stR.id);
                if (!stock) return null;
                const minDim = Math.min(stR.w, stR.h);
                return (
                  <g
                    key={stR.id}
                    onClick={() => onClickStock(stock.symbol)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={stR.x}
                      y={stR.y}
                      width={Math.max(stR.w - 0.5, 0)}
                      height={Math.max(stR.h - 0.5, 0)}
                      fill={getHeatColor(stock.changePct)}
                      stroke="#000"
                      strokeWidth={0.5}
                    />
                    {minDim > 20 && (
                      <>
                        <text
                          x={stR.x + stR.w / 2}
                          y={stR.y + stR.h / 2 - (minDim > 35 ? 4 : 0)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#fff"
                          fontSize={minDim > 50 ? 9 : 7}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {stock.symbol}
                        </text>
                        {minDim > 35 && (
                          <text
                            x={stR.x + stR.w / 2}
                            y={stR.y + stR.h / 2 + 8}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={getTextColor(stock.changePct)}
                            fontSize={7}
                            fontFamily="monospace"
                          >
                            {fmtPct(stock.changePct)}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        }

        // Default: show sector block
        const minDim = Math.min(sr.w, sr.h);
        return (
          <g
            key={sr.id}
            onMouseEnter={() => onHoverSector(sr.id)}
            className="cursor-pointer"
          >
            <rect
              x={sr.x + GAP}
              y={sr.y + GAP}
              width={Math.max(sr.w - GAP * 2, 0)}
              height={Math.max(sr.h - GAP * 2, 0)}
              fill={getHeatColor(sector.changePct)}
              stroke="#000"
              strokeWidth={0.5}
            />
            {minDim > 30 && (
              <>
                <text
                  x={sr.x + sr.w / 2}
                  y={sr.y + sr.h / 2 - (minDim > 50 ? 6 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize={minDim > 70 ? 10 : 8}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {sector.name.length > 14 && sr.w < 100
                    ? sector.name.slice(0, 12) + '..'
                    : sector.name}
                </text>
                {minDim > 50 && (
                  <text
                    x={sr.x + sr.w / 2}
                    y={sr.y + sr.h / 2 + 9}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={getTextColor(sector.changePct)}
                    fontSize={9}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {fmtPct(sector.changePct)}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Sector list table ──

function SectorTable({
  sectors,
  onClickStock,
}: {
  sectors: SectorEntry[];
  onClickStock: (symbol: string) => void;
}) {
  // Sort by change% descending (strongest at top)
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b.changePct - a.changePct),
    [sectors],
  );

  const maxAbsChange = useMemo(
    () => Math.max(...sorted.map((s) => Math.abs(s.changePct)), 0.01),
    [sorted],
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[1fr_50px_60px_80px_80px] gap-1 px-2 py-1 border-b border-amber-500/20">
        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/60">Sector</span>
        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/60 text-right">ETF</span>
        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/60 text-right">Chg%</span>
        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/60 text-right">Top Gainer</span>
        <span className="text-[8px] font-mono uppercase tracking-wider text-amber-500/60 text-right">Top Loser</span>
      </div>
      {/* Rows */}
      {sorted.map((sector) => {
        const gainer = sector.stocks.length > 0
          ? sector.stocks.reduce((best, s) => s.changePct > best.changePct ? s : best, sector.stocks[0])
          : null;
        const loser = sector.stocks.length > 0
          ? sector.stocks.reduce((worst, s) => s.changePct < worst.changePct ? s : worst, sector.stocks[0])
          : null;

        const barWidth = Math.min(Math.abs(sector.changePct) / maxAbsChange, 1) * 100;
        const barColor = sector.changePct >= 0 ? '#10b981' : '#ef4444';

        return (
          <div key={sector.name} className="grid grid-cols-[1fr_50px_60px_80px_80px] gap-1 px-2 py-0.5 border-b border-white/5 hover:bg-white/[0.02] relative">
            {/* Performance bar background */}
            <div
              className="absolute inset-y-0 left-0 opacity-[0.07]"
              style={{
                width: `${barWidth}%`,
                backgroundColor: barColor,
              }}
            />
            <span className="text-[9px] font-mono text-white/70 truncate relative z-10">
              {sector.name}
            </span>
            <span className="text-[9px] font-mono text-white/40 text-right relative z-10">
              {sector.etfSymbol}
            </span>
            <span
              className="text-[9px] font-mono font-bold text-right relative z-10"
              style={{ color: sector.changePct >= 0 ? '#34d399' : '#f87171' }}
            >
              {fmtPct(sector.changePct)}
            </span>
            <span
              className="text-[9px] font-mono text-right relative z-10 cursor-pointer hover:underline"
              style={{ color: '#34d399' }}
              onClick={() => gainer && onClickStock(gainer.symbol)}
            >
              {gainer ? `${gainer.symbol} ${fmtPct(gainer.changePct)}` : '-'}
            </span>
            <span
              className="text-[9px] font-mono text-right relative z-10 cursor-pointer hover:underline"
              style={{ color: '#f87171' }}
              onClick={() => loser && onClickStock(loser.symbol)}
            >
              {loser ? `${loser.symbol} ${fmtPct(loser.changePct)}` : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main panel ──

export function SectorHeatmapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSectorHeatmap();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 300 });

  const handleClickStock = useCallback(
    (symbol: string) => setSelectedSymbol(symbol),
    [setSelectedSymbol],
  );

  const sectors = data?.sectors ?? [];
  const summary = data?.summary;

  // Measure container
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          w: Math.floor(entry.contentRect.width),
          h: Math.floor(entry.contentRect.height),
        });
      }
    });
    ro.observe(node);
    // Initial measurement
    setContainerSize({
      w: Math.floor(node.clientWidth),
      h: Math.floor(node.clientHeight),
    });
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-500/20 shrink-0">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'panelSectorHeatmap', 'SECTOR HEATMAP')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <>
              <span className="text-[8px] font-mono text-emerald-400">
                {summary.advancers} adv
              </span>
              <span className="text-[8px] font-mono text-red-400">
                {summary.decliners} dec
              </span>
            </>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-white/30 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadth & strongest/weakest */}
      {summary && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-amber-500/10 bg-black/40 shrink-0">
          <span className="text-[8px] font-mono text-white/30">
            Breadth: <span className="text-amber-400">{summary.marketBreadth}%</span>
          </span>
          <span className="text-[8px] font-mono text-white/30">
            Best: <span className="text-emerald-400">{summary.strongestSector}</span>
          </span>
          <span className="text-[8px] font-mono text-white/30">
            Worst: <span className="text-red-400">{summary.weakestSector}</span>
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <div
            className="w-5 h-5 border-2 border-t-amber-400 animate-spin"
            style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: ACCENT }}
          />
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sectors.length === 0 && (
        <div className="flex items-center justify-center flex-1">
          <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            No sector data available
          </span>
        </div>
      )}

      {/* Content */}
      {sectors.length > 0 && (
        <div className="flex-1 overflow-auto no-scrollbar flex flex-col">
          {/* Treemap area */}
          <div ref={measuredRef} className="flex-1 min-h-[180px] p-1">
            {containerSize.w > 0 && containerSize.h > 0 && (
              <SectorTreemap
                sectors={sectors}
                width={containerSize.w - 8}
                height={Math.max(containerSize.h - 8, 160)}
                hoveredSector={hoveredSector}
                onHoverSector={setHoveredSector}
                onClickStock={handleClickStock}
              />
            )}
          </div>

          {/* Sector table */}
          <div className="shrink-0 border-t border-amber-500/10 max-h-[200px] overflow-auto no-scrollbar">
            <SectorTable sectors={sectors} onClickStock={handleClickStock} />
          </div>
        </div>
      )}
    </div>
  );
}
