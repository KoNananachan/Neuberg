import { useState, useMemo, useCallback } from 'react';
import { useETFHoldings, type ETFHolding, type SectorWeight } from '../../api/hooks/use-etf-holdings';
import { useT, tr, TFn } from '../../i18n';
import { Layers, RefreshCw, Search } from 'lucide-react';

// ── Helpers ──

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + fmtCompact(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

// Safe i18n: try translation key, fallback to literal
// ── Preset ETFs ──

const PRESET_ETFS = ['SPY', 'QQQ', 'IWM', 'DIA', 'XLK', 'XLF', 'XLE'];

// ── Sector Colors ──

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#2dd4bf',
  'Healthcare': '#818cf8',
  'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#f472b6',
  'Communication Services': '#a78bfa',
  'Industrials': '#60a5fa',
  'Consumer Defensive': '#34d399',
  'Energy': '#fb923c',
  'Utilities': '#94a3b8',
  'Real Estate': '#c084fc',
  'Basic Materials': '#fbbf24',
};

function getSectorColor(sector: string, index: number): string {
  return SECTOR_COLORS[sector] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const FALLBACK_COLORS = [
  '#2dd4bf', '#818cf8', '#f59e0b', '#f472b6', '#a78bfa',
  '#60a5fa', '#34d399', '#fb923c', '#94a3b8', '#c084fc', '#fbbf24',
];

// ── Squarified Treemap Algorithm ──

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  holding: ETFHolding;
  color: string;
}

function squarify(
  items: { weight: number; holding: ETFHolding; color: string }[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, w, h, holding: items[0].holding, color: items[0].color }];
  }

  const totalWeight = items.reduce((s, it) => s + it.weight, 0);
  if (totalWeight <= 0) return [];

  // Normalize weights to areas
  const area = w * h;
  const normalized = items.map(it => ({
    ...it,
    area: (it.weight / totalWeight) * area,
  }));

  const rects: TreemapRect[] = [];
  layoutStrip(normalized, x, y, w, h, rects);
  return rects;
}

interface NormalizedItem {
  weight: number;
  holding: ETFHolding;
  color: string;
  area: number;
}

function layoutStrip(
  items: NormalizedItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  out: TreemapRect[],
): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ x, y, w, h, holding: items[0].holding, color: items[0].color });
    return;
  }

  // Determine layout direction: lay out along shorter side
  const isHorizontal = w >= h;
  const sideLen = isHorizontal ? h : w;

  // Greedily add items to current row until aspect ratio worsens
  let rowArea = 0;
  let bestAspect = Infinity;
  let splitIndex = 1;

  for (let i = 0; i < items.length; i++) {
    rowArea += items[i].area;
    const rowLen = rowArea / sideLen;
    // Worst aspect ratio of items in this row
    let worstAspect = 0;
    let checkArea = 0;
    for (let j = 0; j <= i; j++) {
      checkArea += items[j].area;
      const itemLen = items[j].area / rowLen;
      const aspect = Math.max(rowLen / itemLen, itemLen / rowLen);
      if (aspect > worstAspect) worstAspect = aspect;
    }

    if (worstAspect <= bestAspect) {
      bestAspect = worstAspect;
      splitIndex = i + 1;
    } else {
      break;
    }
  }

  // Layout the row
  const rowItems = items.slice(0, splitIndex);
  const remaining = items.slice(splitIndex);
  const rowTotalArea = rowItems.reduce((s, it) => s + it.area, 0);

  if (isHorizontal) {
    const rowWidth = rowTotalArea / h;
    let cy = y;
    for (const item of rowItems) {
      const itemHeight = item.area / rowWidth;
      out.push({ x, y: cy, w: rowWidth, h: itemHeight, holding: item.holding, color: item.color });
      cy += itemHeight;
    }
    // Recurse on remaining area
    if (remaining.length > 0) {
      const remainingArea = remaining.reduce((s, it) => s + it.area, 0);
      const newW = w - rowWidth;
      // Re-normalize remaining items to remaining area
      const reNormalized = remaining.map(it => ({
        ...it,
        area: (it.area / remainingArea) * (newW * h),
      }));
      layoutStrip(reNormalized, x + rowWidth, y, newW, h, out);
    }
  } else {
    const rowHeight = rowTotalArea / w;
    let cx = x;
    for (const item of rowItems) {
      const itemWidth = item.area / rowHeight;
      out.push({ x: cx, y, w: itemWidth, h: rowHeight, holding: item.holding, color: item.color });
      cx += itemWidth;
    }
    // Recurse on remaining area
    if (remaining.length > 0) {
      const remainingArea = remaining.reduce((s, it) => s + it.area, 0);
      const newH = h - rowHeight;
      const reNormalized = remaining.map(it => ({
        ...it,
        area: (it.area / remainingArea) * (w * newH),
      }));
      layoutStrip(reNormalized, x, y + rowHeight, w, newH, out);
    }
  }
}

// Color for treemap: green/red gradient based on pseudo daily change
// Since we don't have real-time change%, use weight-rank as a visual proxy
// (heavier = darker teal, lighter = more muted)
function treemapColor(weight: number, maxWeight: number): string {
  const intensity = Math.min(weight / maxWeight, 1);
  // Teal gradient: from dark (#0d4744) to bright (#2dd4bf)
  const r = Math.round(13 + intensity * (45 - 13));
  const g = Math.round(71 + intensity * (212 - 71));
  const b = Math.round(68 + intensity * (191 - 68));
  return `rgb(${r},${g},${b})`;
}

// ── Holdings Table Tab ──

function HoldingsTab({ holdings }: { holdings: ETFHolding[] }) {
  const top25 = holdings.slice(0, 25);
  if (top25.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No holdings data available
      </div>
    );
  }

  const maxWeight = Math.max(...top25.map(h => h.weight), 0.1);
  const top10Weight = holdings.slice(0, 10).reduce((s, h) => s + h.weight, 0);

  return (
    <div className="flex-1 overflow-auto min-h-0">
      {/* Top 10 concentration badge */}
      <div className="px-3 py-1.5 border-b border-white/[0.04] bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Top 10 Concentration</span>
          <span className="text-[12px] font-mono font-bold text-teal-400">{top10Weight.toFixed(1)}%</span>
          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
              style={{ width: `${Math.min(top10Weight, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm z-10 grid grid-cols-[28px_60px_1fr_55px_1fr] text-[7px] font-mono text-neutral/40 uppercase tracking-wider px-3 py-1 border-b border-white/[0.04]">
        <span>#</span>
        <span>Symbol</span>
        <span>Name</span>
        <span className="text-right">Weight</span>
        <span className="pl-2">Distribution</span>
      </div>

      {top25.map((h, i) => {
        const barWidthPct = (h.weight / maxWeight) * 100;
        return (
          <div
            key={h.symbol || i}
            className="grid grid-cols-[28px_60px_1fr_55px_1fr] text-[9px] font-mono px-3 py-1 border-b border-white/[0.02] hover:bg-teal-500/[0.04] transition-colors items-center"
          >
            <span className="text-neutral/30">{i + 1}</span>
            <span className="text-teal-400 font-bold">{h.symbol}</span>
            <span className="text-neutral/60 truncate pr-1">{h.name}</span>
            <span className="text-right text-neutral/80 font-bold">{h.weight.toFixed(2)}%</span>
            <div className="pl-2 flex items-center">
              <div className="flex-1 h-2.5 bg-white/[0.02] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${barWidthPct}%`,
                    background: `linear-gradient(90deg, rgba(45,212,191,0.7) 0%, rgba(45,212,191,0.15) 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sectors Tab (SVG horizontal bar chart) ──

function SectorsTab({ sectors }: { sectors: SectorWeight[] }) {
  if (sectors.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No sector data available
      </div>
    );
  }

  const maxWeight = Math.max(...sectors.map(s => s.weight), 0.1);
  const barHeight = 22;
  const labelWidth = 130;
  const pctWidth = 50;
  const chartWidth = 400;
  const barStart = labelWidth;
  const barMaxWidth = chartWidth - labelWidth - pctWidth - 10;
  const svgHeight = sectors.length * barHeight + 4;

  return (
    <div className="flex-1 overflow-auto min-h-0 p-3">
      <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" preserveAspectRatio="xMinYMin meet">
        {sectors.map((s, i) => {
          const y = i * barHeight + 2;
          const barW = Math.max(2, (s.weight / maxWeight) * barMaxWidth);
          const color = getSectorColor(s.sector, i);

          return (
            <g key={s.sector}>
              {/* Sector label */}
              <text
                x={labelWidth - 6}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                className="text-[8px] font-mono"
                fill="rgba(255,255,255,0.5)"
              >
                {s.sector.length > 20 ? s.sector.slice(0, 20) + '...' : s.sector}
              </text>

              {/* Bar */}
              <rect
                x={barStart}
                y={y + 3}
                width={barW}
                height={barHeight - 6}
                rx={2}
                fill={color}
                opacity={0.7}
              />

              {/* Weight % label */}
              <text
                x={barStart + barW + 5}
                y={y + barHeight / 2 + 1}
                textAnchor="start"
                className="text-[8px] font-mono font-bold"
                fill={color}
              >
                {s.weight.toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Treemap Tab ──

function TreemapTab({ holdings }: { holdings: ETFHolding[] }) {
  const top20 = holdings.slice(0, 20);

  const rects = useMemo(() => {
    if (top20.length === 0) return [];
    const maxW = Math.max(...top20.map(h => h.weight), 0.1);
    const items = top20.map(h => ({
      weight: h.weight,
      holding: h,
      color: treemapColor(h.weight, maxW),
    }));
    return squarify(items, 0, 0, 600, 400);
  }, [top20]);

  if (rects.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No holdings data for treemap
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-2">
      <svg viewBox="0 0 600 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="etfShadow">
            <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>
        {rects.map((rect, i) => {
          const showText = rect.w > 30 && rect.h > 22;
          const showWeight = rect.w > 40 && rect.h > 35;
          // Font sizes scale with rectangle dimensions
          const tickerSize = Math.min(Math.max(rect.w / 6, 8), 16);
          const weightSize = Math.min(Math.max(rect.w / 8, 6), 11);

          return (
            <g key={rect.holding.symbol || i}>
              {/* Rectangle */}
              <rect
                x={rect.x + 0.5}
                y={rect.y + 0.5}
                width={Math.max(0, rect.w - 1)}
                height={Math.max(0, rect.h - 1)}
                fill={rect.color}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={1}
                rx={2}
                className="transition-opacity hover:opacity-80"
              />

              {/* Ticker symbol */}
              {showText && (
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2 + (showWeight ? -2 : 2)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="bold"
                  fontSize={tickerSize}
                  filter="url(#etfShadow)"
                >
                  {rect.holding.symbol}
                </text>
              )}

              {/* Weight % */}
              {showWeight && (
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2 + tickerSize * 0.7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.7)"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="normal"
                  fontSize={weightSize}
                  filter="url(#etfShadow)"
                >
                  {rect.holding.weight.toFixed(1)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Stats Bar ──

function StatsBadge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center px-2 py-1">
      <span className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${accent ? 'text-teal-400' : 'text-neutral/80'}`}>{value}</span>
    </div>
  );
}

// ── Tab types ──

type TabId = 'holdings' | 'sectors' | 'treemap';

// ── Main Panel ──

export function ETFHoldingsPanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('SPY');
  const [inputValue, setInputValue] = useState('SPY');
  const [activeTab, setActiveTab] = useState<TabId>('holdings');

  const { data, isLoading, refetch, dataUpdatedAt } = useETFHoldings(symbol);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim().toUpperCase();
    if (val && val !== symbol) setSymbol(val);
  }, [inputValue, symbol]);

  const handlePreset = useCallback((sym: string) => {
    setInputValue(sym);
    if (sym !== symbol) setSymbol(sym);
  }, [symbol]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'holdings', label: tr(t, 'etfHoldingsTab', 'Holdings') },
    { id: 'sectors', label: tr(t, 'etfSectorsTab', 'Sectors') },
    { id: 'treemap', label: tr(t, 'etfTreemapTab', 'Treemap') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'panelETFHoldings', 'ETF HOLDINGS / INDEX COMPOSITION')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-teal-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Symbol input + presets */}
      <div className="px-3 py-1.5 border-b border-border/30 bg-black/40 shrink-0 space-y-1">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Search size={10} className="text-neutral/30" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="ETF SYMBOL"
            className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-white placeholder:text-neutral/30 uppercase"
            maxLength={10}
          />
          <button
            type="submit"
            className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 transition-colors"
          >
            Go
          </button>
        </form>

        {/* Preset buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRESET_ETFS.map((sym) => (
            <button
              key={sym}
              onClick={() => handlePreset(sym)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors border ${
                symbol === sym
                  ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                  : 'text-neutral/40 border-white/[0.06] hover:text-teal-400 hover:border-teal-500/30'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* ETF Info bar */}
      {data && (
        <div className="flex items-center gap-3 px-3 py-1 border-b border-white/[0.04] bg-black/20 shrink-0">
          <span className="text-[11px] font-mono font-bold text-teal-400">{data.symbol}</span>
          <span className="text-[9px] font-mono text-neutral/60 truncate flex-1">{data.name}</span>
          <span className="text-[10px] font-mono font-bold text-white">${data.price.toFixed(2)}</span>
          {data.aum != null && (
            <span className="text-[8px] font-mono text-neutral/40">AUM: {fmtDollar(data.aum)}</span>
          )}
          {data.expenseRatio != null && (
            <span className="text-[8px] font-mono text-neutral/40">ER: {data.expenseRatio.toFixed(2)}%</span>
          )}
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {!isLoading && !data && (
        <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {tr(t, 'etfHoldingsEmpty', 'Enter an ETF symbol to view holdings')}
        </div>
      )}

      {data && (
        <>
          {/* Stats Summary Bar */}
          <div className="flex items-center justify-around px-2 py-1 border-b border-white/[0.04] bg-black/10 shrink-0 overflow-x-auto no-scrollbar">
            <StatsBadge label="AUM" value={data.aum != null ? fmtDollar(data.aum) : '--'} accent />
            <StatsBadge label="Expense Ratio" value={data.expenseRatio != null ? fmtPct(data.expenseRatio) : '--'} />
            <StatsBadge label="Holdings" value={data.stats.totalHoldings > 0 ? String(data.stats.totalHoldings) : '--'} />
            <StatsBadge label="Top 10 Conc." value={fmtPct(data.stats.top10Weight)} accent />
            <StatsBadge label="Yield" value={data.stats.yield != null ? fmtPct(data.stats.yield) : '--'} />
            <StatsBadge label="Beta" value={data.stats.beta != null ? data.stats.beta.toFixed(2) : '--'} />
            <StatsBadge label="Turnover" value={data.stats.turnover != null ? fmtPct(data.stats.turnover) : '--'} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-3 py-1 border-b border-white/[0.04] bg-black/10 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'text-neutral/50 hover:text-white border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto min-h-0">
            {activeTab === 'holdings' && <HoldingsTab holdings={data.holdings} />}
            {activeTab === 'sectors' && <SectorsTab sectors={data.sectorWeights} />}
            {activeTab === 'treemap' && <TreemapTab holdings={data.holdings} />}
          </div>
        </>
      )}
    </div>
  );
}
