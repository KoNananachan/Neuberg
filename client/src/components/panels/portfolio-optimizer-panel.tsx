import { useState, useMemo, useCallback } from 'react';
import {
  usePortfolioOptimizer,
  type PortfolioOptimizerData,
  type PortfolioPoint,
  type AssetInfo,
} from '../../api/hooks/use-portfolio-optimizer';
import { useT } from '../../i18n';
import { RefreshCw, Target } from 'lucide-react';

// ── Translation helper with fallback ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Constants ──

const TABS = ['frontier', 'allocations', 'correlation'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  frontier: 'Efficient Frontier',
  allocations: 'Optimal Allocations',
  correlation: 'Correlation Matrix',
};

const ASSET_COLORS = [
  '#22d3ee', // cyan
  '#a78bfa', // purple
  '#fb923c', // orange
  '#34d399', // emerald
  '#f87171', // red
  '#fbbf24', // amber
  '#818cf8', // indigo
  '#f472b6', // pink
  '#2dd4bf', // teal
  '#a3e635', // lime
  '#e879f9', // fuchsia
  '#60a5fa', // blue
  '#facc15', // yellow
  '#c084fc', // violet
  '#38bdf8', // sky
];

const STRATEGY_LABELS: Record<string, string> = {
  minVariance: 'Min Variance',
  maxSharpe: 'Max Sharpe',
  equalWeight: 'Equal Weight',
  riskParity: 'Risk Parity',
};

const STRATEGY_COLORS: Record<string, string> = {
  minVariance: '#3b82f6',
  maxSharpe: '#f59e0b',
  equalWeight: '#ffffff',
  riskParity: '#22c55e',
};

const DEFAULT_SYMBOLS = 'AAPL,MSFT,GOOGL,AMZN,NVDA';

// ── Main Panel ──

export function PortfolioOptimizerPanel() {
  const tr = useTr();
  const [inputValue, setInputValue] = useState(DEFAULT_SYMBOLS);
  const [riskFreeInput, setRiskFreeInput] = useState('5');
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS.split(','));
  const [riskFree, setRiskFree] = useState(0.05);
  const [activeTab, setActiveTab] = useState<Tab>('frontier');

  const { data, isLoading, refetch } = usePortfolioOptimizer(symbols, riskFree);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = inputValue
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (parsed.length >= 2) {
        setSymbols(parsed);
      }
      const rf = parseFloat(riskFreeInput);
      if (!isNaN(rf) && rf >= 0 && rf <= 20) {
        setRiskFree(rf / 100);
      }
    },
    [inputValue, riskFreeInput],
  );

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr('panelPortfolioOptimizer', 'PORTFOLIO OPTIMIZER')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-b border-border/20 shrink-0 flex-wrap"
      >
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr('poSymbols', 'Symbols')}:
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value.toUpperCase())}
            placeholder="AAPL,MSFT,GOOGL"
            className="w-48 px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[9px] font-mono text-white placeholder:text-neutral/30 focus:outline-none focus:border-amber-400/40"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr('poRiskFree', 'Rf%')}:
          </span>
          <input
            type="text"
            value={riskFreeInput}
            onChange={e => setRiskFreeInput(e.target.value)}
            placeholder="5"
            className="w-10 px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[9px] font-mono text-white placeholder:text-neutral/30 focus:outline-none focus:border-amber-400/40 text-center"
          />
        </div>
        <button
          type="submit"
          className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-[8px] font-black font-mono uppercase text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          {tr('poOptimize', 'OPTIMIZE')}
        </button>
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 border-b border-border/20 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral/40 hover:text-neutral/60'
            }`}
          >
            {tr(`poTab_${tab}`, TAB_LABELS[tab])}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest">
              {tr('loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-[9px] font-mono text-neutral/30 uppercase tracking-wider">
              {tr('poNoData', 'Enter at least 2 symbols and click Optimize')}
            </span>
          </div>
        )}

        {data && (
          <>
            {activeTab === 'frontier' && <FrontierTab data={data} />}
            {activeTab === 'allocations' && <AllocationsTab data={data} />}
            {activeTab === 'correlation' && <CorrelationTab data={data} />}
            <SummaryBar data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Efficient Frontier ──

function FrontierTab({ data }: { data: PortfolioOptimizerData }) {
  const tr = useTr();
  const [hoveredPoint, setHoveredPoint] = useState<PortfolioPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const W = 720;
  const H = 380;
  const PAD_L = 52;
  const PAD_R = 24;
  const PAD_T = 24;
  const PAD_B = 36;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Compute bounds from all points
  const allPoints = useMemo(() => {
    const pts: PortfolioPoint[] = [
      ...data.frontier,
      data.optimal.minVariance,
      data.optimal.maxSharpe,
      data.optimal.equalWeight,
      data.optimal.riskParity,
    ];
    // Add individual asset points
    for (const asset of data.assets) {
      pts.push({
        return: asset.annReturn,
        volatility: asset.annVol,
        sharpe: asset.sharpe,
        weights: [],
      });
    }
    return pts;
  }, [data]);

  const bounds = useMemo(() => {
    const vols = allPoints.map(p => p.volatility);
    const rets = allPoints.map(p => p.return);
    const minVol = Math.min(...vols, 0);
    const maxVol = Math.max(...vols) * 1.1;
    const minRet = Math.min(...rets, 0);
    const maxRet = Math.max(...rets) * 1.1;
    return { minVol, maxVol, minRet, maxRet };
  }, [allPoints]);

  const scaleX = useCallback(
    (vol: number) =>
      PAD_L + ((vol - bounds.minVol) / (bounds.maxVol - bounds.minVol || 1)) * chartW,
    [bounds, chartW],
  );
  const scaleY = useCallback(
    (ret: number) =>
      PAD_T + chartH - ((ret - bounds.minRet) / (bounds.maxRet - bounds.minRet || 1)) * chartH,
    [bounds, chartH],
  );

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = bounds.maxRet - bounds.minRet;
    const step = range > 0.5 ? 0.1 : range > 0.2 ? 0.05 : 0.02;
    for (let v = Math.ceil(bounds.minRet / step) * step; v <= bounds.maxRet; v += step) {
      ticks.push(Math.round(v * 1000) / 1000);
    }
    return ticks;
  }, [bounds]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = bounds.maxVol - bounds.minVol;
    const step = range > 0.5 ? 0.1 : range > 0.2 ? 0.05 : 0.02;
    for (let v = Math.ceil(bounds.minVol / step) * step; v <= bounds.maxVol; v += step) {
      ticks.push(Math.round(v * 1000) / 1000);
    }
    return ticks;
  }, [bounds]);

  // Capital Market Line
  const cmlLine = useMemo(() => {
    const ms = data.optimal.maxSharpe;
    if (ms.volatility === 0) return null;
    const slope = (ms.return - data.riskFreeRate) / ms.volatility;
    const x1 = bounds.minVol;
    const y1 = data.riskFreeRate + slope * x1;
    const x2 = bounds.maxVol;
    const y2 = data.riskFreeRate + slope * x2;
    return { x1: scaleX(x1), y1: scaleY(y1), x2: scaleX(x2), y2: scaleY(y2) };
  }, [data, bounds, scaleX, scaleY]);

  // Efficient frontier line path
  const frontierPath = useMemo(() => {
    if (data.frontier.length < 2) return '';
    const sorted = [...data.frontier].sort((a, b) => a.volatility - b.volatility);
    return sorted
      .map((p, i) => {
        const x = scaleX(p.volatility);
        const y = scaleY(p.return);
        return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
      })
      .join(' ');
  }, [data.frontier, scaleX, scaleY]);

  const handlePointHover = useCallback(
    (point: PortfolioPoint, svgX: number, svgY: number) => {
      setHoveredPoint(point);
      setTooltipPos({ x: svgX, y: svgY });
    },
    [],
  );

  const handlePointLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('poFrontierTitle', 'Efficient Frontier & Optimal Portfolios')}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yTicks.map(v => {
            const y = scaleY(v);
            return (
              <g key={`y-${v}`}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={W - PAD_R}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3,3"
                />
                <text
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={7}
                  fontFamily="monospace"
                >
                  {(v * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {xTicks.map(v => {
            const x = scaleX(v);
            return (
              <g key={`x-${v}`}>
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={H - PAD_B}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3,3"
                />
                <text
                  x={x}
                  y={H - PAD_B + 14}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize={7}
                  fontFamily="monospace"
                >
                  {(v * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={W / 2}
            y={H - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {tr('poVolatility', 'VOLATILITY (RISK)')}
          </text>
          <text
            x={12}
            y={H / 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
            transform={`rotate(-90, 12, ${H / 2})`}
          >
            {tr('poReturn', 'RETURN')}
          </text>

          {/* Capital Market Line */}
          {cmlLine && (
            <line
              x1={cmlLine.x1}
              y1={cmlLine.y1}
              x2={cmlLine.x2}
              y2={cmlLine.y2}
              stroke="rgba(245,158,11,0.3)"
              strokeWidth={1}
              strokeDasharray="6,3"
            />
          )}

          {/* Monte Carlo cloud - frontier points as gray dots */}
          {data.frontier.map((p, i) => (
            <circle
              key={`mc-${i}`}
              cx={scaleX(p.volatility)}
              cy={scaleY(p.return)}
              r={2}
              fill="rgba(161,161,170,0.2)"
              onMouseEnter={() => handlePointHover(p, scaleX(p.volatility), scaleY(p.return))}
              onMouseLeave={handlePointLeave}
              className="cursor-pointer"
            />
          ))}

          {/* Efficient frontier curve */}
          {frontierPath && (
            <path
              d={frontierPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1.5}
              opacity={0.7}
            />
          )}

          {/* Risk-free rate point */}
          <circle
            cx={scaleX(0)}
            cy={scaleY(data.riskFreeRate)}
            r={3}
            fill="#6b7280"
            stroke="#9ca3af"
            strokeWidth={1}
          />
          <text
            x={scaleX(0) + 6}
            y={scaleY(data.riskFreeRate) + 3}
            fill="#9ca3af"
            fontSize={7}
            fontFamily="monospace"
          >
            Rf
          </text>

          {/* Individual assets (colored squares) */}
          {data.assets.map((asset, i) => {
            const x = scaleX(asset.annVol);
            const y = scaleY(asset.annReturn);
            const color = ASSET_COLORS[i % ASSET_COLORS.length];
            return (
              <g key={`asset-${i}`}>
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={8}
                  height={8}
                  fill={color}
                  opacity={0.8}
                />
                <text
                  x={x + 7}
                  y={y + 3}
                  fill={color}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {asset.symbol}
                </text>
              </g>
            );
          })}

          {/* Min Variance (blue circle) */}
          {renderSpecialMarker(
            scaleX(data.optimal.minVariance.volatility),
            scaleY(data.optimal.minVariance.return),
            'circle',
            '#3b82f6',
            handlePointHover,
            handlePointLeave,
            data.optimal.minVariance,
          )}

          {/* Max Sharpe (gold star) */}
          {renderStar(
            scaleX(data.optimal.maxSharpe.volatility),
            scaleY(data.optimal.maxSharpe.return),
            '#f59e0b',
            handlePointHover,
            handlePointLeave,
            data.optimal.maxSharpe,
          )}

          {/* Equal Weight (white triangle) */}
          {renderTriangle(
            scaleX(data.optimal.equalWeight.volatility),
            scaleY(data.optimal.equalWeight.return),
            '#ffffff',
            handlePointHover,
            handlePointLeave,
            data.optimal.equalWeight,
          )}

          {/* Risk Parity (green diamond) */}
          {renderDiamond(
            scaleX(data.optimal.riskParity.volatility),
            scaleY(data.optimal.riskParity.return),
            '#22c55e',
            handlePointHover,
            handlePointLeave,
            data.optimal.riskParity,
          )}

          {/* Hover tooltip */}
          {hoveredPoint && (
            <g>
              <rect
                x={Math.min(tooltipPos.x + 8, W - 140)}
                y={Math.max(tooltipPos.y - 50, PAD_T)}
                width={130}
                height={hoveredPoint.weights.length > 0 ? 14 + hoveredPoint.weights.length * 10 + 6 : 40}
                fill="rgba(0,0,0,0.9)"
                stroke="rgba(245,158,11,0.4)"
                strokeWidth={0.5}
              />
              <text
                x={Math.min(tooltipPos.x + 14, W - 134)}
                y={Math.max(tooltipPos.y - 38, PAD_T + 12)}
                fill="#f59e0b"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {`Ret: ${(hoveredPoint.return * 100).toFixed(1)}% | Vol: ${(hoveredPoint.volatility * 100).toFixed(1)}% | SR: ${hoveredPoint.sharpe.toFixed(2)}`}
              </text>
              {hoveredPoint.weights.length > 0 &&
                hoveredPoint.weights.map((w, i) => (
                  <text
                    key={i}
                    x={Math.min(tooltipPos.x + 14, W - 134)}
                    y={Math.max(tooltipPos.y - 26, PAD_T + 24) + i * 10}
                    fill="rgba(255,255,255,0.7)"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {data.symbols[i] ?? `Asset${i}`}: {(w * 100).toFixed(1)}%
                  </text>
                ))}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
        <LegendItem shape="circle" color="#3b82f6" label={tr('poMinVar', 'Min Variance')} />
        <LegendItem shape="star" color="#f59e0b" label={tr('poMaxSharpe', 'Max Sharpe')} />
        <LegendItem shape="triangle" color="#ffffff" label={tr('poEqualWeight', 'Equal Weight')} />
        <LegendItem shape="diamond" color="#22c55e" label={tr('poRiskParity', 'Risk Parity')} />
        <LegendItem shape="square" color="#a1a1aa" label={tr('poAssets', 'Individual Assets')} />
        <LegendItem shape="line" color="rgba(245,158,11,0.5)" label={tr('poCML', 'Capital Mkt Line')} />
      </div>

      {/* Asset stats table */}
      <div className="mt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-1">
          {tr('poAssetStats', 'Individual Asset Statistics')}
        </div>
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 py-1 border-b border-border/15">
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
            {tr('poSymbol', 'Symbol')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poAnnReturn', 'Ann. Return')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poAnnVol', 'Ann. Vol')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poSharpe', 'Sharpe')}
          </span>
        </div>
        {data.assets.map((asset, i) => (
          <div
            key={asset.symbol}
            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 py-1 border-b border-border/8 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold flex items-center gap-1">
              <span
                className="inline-block w-2 h-2"
                style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }}
              />
              <span style={{ color: ASSET_COLORS[i % ASSET_COLORS.length] }}>{asset.symbol}</span>
              <span className="text-neutral/40 text-[7px] truncate">{asset.name}</span>
            </span>
            <span
              className={`text-[9px] font-mono font-bold text-right ${
                asset.annReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(asset.annReturn * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] font-mono text-neutral/60 text-right">
              {(asset.annVol * 100).toFixed(1)}%
            </span>
            <span
              className={`text-[9px] font-mono font-bold text-right ${
                asset.sharpe >= 1 ? 'text-emerald-400' : asset.sharpe >= 0 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {asset.sharpe.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Optimal Allocations ──

function AllocationsTab({ data }: { data: PortfolioOptimizerData }) {
  const tr = useTr();

  const strategies = useMemo(
    () => [
      { key: 'maxSharpe', portfolio: data.optimal.maxSharpe },
      { key: 'minVariance', portfolio: data.optimal.minVariance },
      { key: 'riskParity', portfolio: data.optimal.riskParity },
      { key: 'equalWeight', portfolio: data.optimal.equalWeight },
    ],
    [data.optimal],
  );

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-3">
        {tr('poAllocTitle', 'Allocation Strategies Comparison')}
      </div>

      {/* Stacked bar charts */}
      {strategies.map(({ key, portfolio }) => (
        <div key={key} className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[9px] font-black font-mono uppercase tracking-wider"
              style={{ color: STRATEGY_COLORS[key] }}
            >
              {tr(`poStrat_${key}`, STRATEGY_LABELS[key])}
            </span>
            <span className="text-[7px] font-mono text-neutral/40">
              SR: {portfolio.sharpe.toFixed(2)}
            </span>
          </div>

          {/* Horizontal stacked bar */}
          <div className="flex h-5 w-full border border-border/20 overflow-hidden">
            {portfolio.weights.map((w, i) => {
              const pct = w * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={i}
                  className="h-full relative flex items-center justify-center overflow-hidden"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length],
                    opacity: 0.8,
                  }}
                  title={`${data.symbols[i]}: ${pct.toFixed(1)}%`}
                >
                  {pct > 8 && (
                    <span className="text-[7px] font-mono font-black text-black leading-none">
                      {data.symbols[i]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Weight labels */}
          <div className="flex flex-wrap gap-x-2 gap-y-0 mt-1">
            {portfolio.weights.map((w, i) => {
              const pct = w * 100;
              if (pct < 0.5) return null;
              return (
                <span key={i} className="text-[7px] font-mono text-neutral/50">
                  <span
                    className="inline-block w-1.5 h-1.5 mr-0.5"
                    style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }}
                  />
                  {data.symbols[i]}: {pct.toFixed(1)}%
                </span>
              );
            })}
          </div>
        </div>
      ))}

      {/* Comparison table */}
      <div className="mt-4 border-t border-border/20 pt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
          {tr('poCompare', 'Strategy Comparison')}
        </div>
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 py-1 border-b border-border/15">
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
            {tr('poStrategy', 'Strategy')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poReturn', 'Return')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poRisk', 'Risk')}
          </span>
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
            {tr('poSharpe', 'Sharpe')}
          </span>
        </div>
        {strategies.map(({ key, portfolio }) => (
          <div
            key={key}
            className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-1 px-1 py-1.5 border-b border-border/8 hover:bg-white/[0.02] transition-colors"
          >
            <span
              className="text-[9px] font-mono font-bold"
              style={{ color: STRATEGY_COLORS[key] }}
            >
              {STRATEGY_LABELS[key]}
            </span>
            <span
              className={`text-[9px] font-mono font-bold text-right ${
                portfolio.return >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(portfolio.return * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] font-mono text-neutral/60 text-right">
              {(portfolio.volatility * 100).toFixed(1)}%
            </span>
            <span
              className={`text-[9px] font-mono font-bold text-right ${
                portfolio.sharpe >= 1
                  ? 'text-emerald-400'
                  : portfolio.sharpe >= 0
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {portfolio.sharpe.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Detailed weights table */}
      <div className="mt-4 border-t border-border/20 pt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
          {tr('poWeightDetail', 'Detailed Weight Allocations (%)')}
        </div>
        <div
          className="grid gap-1 px-1 py-1 border-b border-border/15"
          style={{ gridTemplateColumns: `1.2fr ${data.symbols.map(() => '0.6fr').join(' ')}` }}
        >
          <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
            {tr('poStrategy', 'Strategy')}
          </span>
          {data.symbols.map((sym, i) => (
            <span
              key={sym}
              className="text-[7px] font-black font-mono uppercase tracking-wider text-right"
              style={{ color: ASSET_COLORS[i % ASSET_COLORS.length] }}
            >
              {sym}
            </span>
          ))}
        </div>
        {strategies.map(({ key, portfolio }) => (
          <div
            key={key}
            className="grid gap-1 px-1 py-1 border-b border-border/8 hover:bg-white/[0.02] transition-colors"
            style={{ gridTemplateColumns: `1.2fr ${data.symbols.map(() => '0.6fr').join(' ')}` }}
          >
            <span
              className="text-[8px] font-mono font-bold"
              style={{ color: STRATEGY_COLORS[key] }}
            >
              {STRATEGY_LABELS[key]}
            </span>
            {portfolio.weights.map((w, i) => (
              <span key={i} className="text-[8px] font-mono text-neutral/60 text-right">
                {(w * 100).toFixed(1)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 3: Correlation Matrix ──

function CorrelationTab({ data }: { data: PortfolioOptimizerData }) {
  const tr = useTr();

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('poCorrTitle', 'Asset Correlation Matrix')}
      </div>

      <div className="overflow-auto">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="p-1 text-[8px] font-mono text-neutral/30 w-12" />
              {data.symbols.map((sym, i) => (
                <th
                  key={sym}
                  className="p-1 text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: ASSET_COLORS[i % ASSET_COLORS.length] }}
                >
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.correlation.map((row, i) => (
              <tr key={data.symbols[i]}>
                <td
                  className="p-1 text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: ASSET_COLORS[i % ASSET_COLORS.length] }}
                >
                  {data.symbols[i]}
                </td>
                {row.map((val, j) => {
                  const isDiagonal = i === j;
                  return (
                    <td
                      key={j}
                      className="p-1.5 text-center border border-border/10"
                      style={{ backgroundColor: getCorrColor(val, isDiagonal) }}
                    >
                      <span
                        className="text-[9px] font-mono font-bold"
                        style={{ color: isDiagonal ? '#71717a' : getCorrTextColor(val) }}
                      >
                        {val.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-border/20" style={{ backgroundColor: 'rgba(239,68,68,0.5)' }} />
          <span className="text-[7px] font-mono text-neutral/40">
            {tr('poHighCorr', 'High +Corr')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-transparent border border-border/20" />
          <span className="text-[7px] font-mono text-neutral/40">
            {tr('poNoCorr', 'None')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-border/20" style={{ backgroundColor: 'rgba(34,197,94,0.5)' }} />
          <span className="text-[7px] font-mono text-neutral/40">
            {tr('poNegCorr', 'Negative')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: PortfolioOptimizerData }) {
  const tr = useTr();

  const ms = data.optimal.maxSharpe;
  const mv = data.optimal.minVariance;

  return (
    <div className="px-3 py-3 border-t border-border/20 bg-amber-500/[0.02]">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('poSummary', 'Optimization Summary')}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
            {tr('poBestSharpe', 'Best Sharpe')}
          </div>
          <div className="text-[13px] font-black font-mono text-amber-400">
            {ms.sharpe.toFixed(2)}
          </div>
          <div className="text-[7px] font-mono text-neutral/30">
            {(ms.return * 100).toFixed(1)}% ret / {(ms.volatility * 100).toFixed(1)}% vol
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
            {tr('poMinRisk', 'Min Risk')}
          </div>
          <div className="text-[13px] font-black font-mono text-blue-400">
            {(mv.volatility * 100).toFixed(1)}%
          </div>
          <div className="text-[7px] font-mono text-neutral/30">
            {(mv.return * 100).toFixed(1)}% ret / SR: {mv.sharpe.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
            {tr('poAssetCount', 'Assets')}
          </div>
          <div className="text-[13px] font-black font-mono text-white">
            {data.symbols.length}
          </div>
          <div className="text-[7px] font-mono text-neutral/30">
            {data.symbols.join(', ')}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
            {tr('poRiskFreeLabel', 'Risk-Free Rate')}
          </div>
          <div className="text-[13px] font-black font-mono text-neutral/60">
            {(data.riskFreeRate * 100).toFixed(1)}%
          </div>
          <div className="text-[7px] font-mono text-neutral/30">
            {tr('poTreasury', 'Treasury yield')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SVG Shape helpers ──

function renderSpecialMarker(
  x: number,
  y: number,
  _shape: string,
  color: string,
  onHover: (p: PortfolioPoint, x: number, y: number) => void,
  onLeave: () => void,
  point: PortfolioPoint,
) {
  return (
    <g className="cursor-pointer" onMouseEnter={() => onHover(point, x, y)} onMouseLeave={onLeave}>
      <circle cx={x} cy={y} r={6} fill={color} opacity={0.3} />
      <circle cx={x} cy={y} r={4} fill={color} opacity={0.8} />
      <circle cx={x} cy={y} r={2} fill="#000" />
    </g>
  );
}

function renderStar(
  cx: number,
  cy: number,
  color: string,
  onHover: (p: PortfolioPoint, x: number, y: number) => void,
  onLeave: () => void,
  point: PortfolioPoint,
) {
  // 5-point star
  const r1 = 6;
  const r2 = 3;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <g className="cursor-pointer" onMouseEnter={() => onHover(point, cx, cy)} onMouseLeave={onLeave}>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.15} />
      <polygon points={pts.join(' ')} fill={color} opacity={0.9} />
    </g>
  );
}

function renderTriangle(
  cx: number,
  cy: number,
  color: string,
  onHover: (p: PortfolioPoint, x: number, y: number) => void,
  onLeave: () => void,
  point: PortfolioPoint,
) {
  const size = 6;
  const pts = [
    `${cx},${cy - size}`,
    `${cx - size * 0.866},${cy + size * 0.5}`,
    `${cx + size * 0.866},${cy + size * 0.5}`,
  ].join(' ');
  return (
    <g className="cursor-pointer" onMouseEnter={() => onHover(point, cx, cy)} onMouseLeave={onLeave}>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.1} />
      <polygon points={pts} fill={color} opacity={0.8} stroke={color} strokeWidth={0.5} />
    </g>
  );
}

function renderDiamond(
  cx: number,
  cy: number,
  color: string,
  onHover: (p: PortfolioPoint, x: number, y: number) => void,
  onLeave: () => void,
  point: PortfolioPoint,
) {
  const size = 6;
  const pts = [
    `${cx},${cy - size}`,
    `${cx + size},${cy}`,
    `${cx},${cy + size}`,
    `${cx - size},${cy}`,
  ].join(' ');
  return (
    <g className="cursor-pointer" onMouseEnter={() => onHover(point, cx, cy)} onMouseLeave={onLeave}>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.1} />
      <polygon points={pts} fill={color} opacity={0.8} />
    </g>
  );
}

// ── Legend item ──

function LegendItem({
  shape,
  color,
  label,
}: {
  shape: 'circle' | 'star' | 'triangle' | 'diamond' | 'square' | 'line';
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <svg width={10} height={10} viewBox="0 0 10 10">
        {shape === 'circle' && <circle cx={5} cy={5} r={3.5} fill={color} />}
        {shape === 'star' && (
          <polygon
            points={(() => {
              const pts: string[] = [];
              for (let i = 0; i < 10; i++) {
                const angle = -Math.PI / 2 + (Math.PI / 5) * i;
                const r = i % 2 === 0 ? 4.5 : 2;
                pts.push(`${5 + r * Math.cos(angle)},${5 + r * Math.sin(angle)}`);
              }
              return pts.join(' ');
            })()}
            fill={color}
          />
        )}
        {shape === 'triangle' && <polygon points="5,1.5 1,8.5 9,8.5" fill={color} />}
        {shape === 'diamond' && <polygon points="5,1 9,5 5,9 1,5" fill={color} />}
        {shape === 'square' && <rect x={1.5} y={1.5} width={7} height={7} fill={color} />}
        {shape === 'line' && (
          <line x1={0} y1={5} x2={10} y2={5} stroke={color} strokeWidth={1.5} strokeDasharray="2,1" />
        )}
      </svg>
      <span className="text-[7px] font-mono text-neutral/50">{label}</span>
    </div>
  );
}

// ── Correlation color helpers ──

function getCorrColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'rgba(63,63,70,0.3)';
  if (value > 0) {
    const intensity = Math.min(value, 1);
    return `rgba(239,68,68,${intensity * 0.5})`;
  }
  if (value < 0) {
    const intensity = Math.min(Math.abs(value), 1);
    return `rgba(34,197,94,${intensity * 0.5})`;
  }
  return 'transparent';
}

function getCorrTextColor(value: number): string {
  const abs = Math.abs(value);
  if (abs > 0.7) return '#ffffff';
  if (abs > 0.4) return '#e4e4e7';
  return '#a1a1aa';
}
