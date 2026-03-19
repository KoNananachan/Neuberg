import { useState } from 'react';
import { useVarianceSwap } from '../../api/hooks/use-variance-swap';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const VIOLET = '#a78bfa';
const VIOLET_DIM = 'rgba(167,139,250,0.12)';

type Tab = 'INDICES' | 'TERM' | 'STOCKS' | 'IDEAS';

// ── Color helpers ──

function getChangeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function getSignalBadge(signal: string): { bg: string; color: string } {
  switch (signal) {
    case 'BUY':
    case 'LONG':
      return { bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'SELL':
    case 'SHORT':
      return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'NEUTRAL':
      return { bg: 'rgba(163,163,163,0.12)', color: '#a3a3a3' };
    default:
      return { bg: VIOLET_DIM, color: VIOLET };
  }
}

function premiumColor(val: number): string {
  if (val > 2) return '#f87171';
  if (val > 0) return '#34d399';
  if (val < -2) return '#60a5fa';
  return '#a3a3a3';
}

// ── Main Panel ──

export function VarianceSwapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useVarianceSwap();
  const [activeTab, setActiveTab] = useState<Tab>('INDICES');

  const tabs: Tab[] = ['INDICES', 'TERM', 'STOCKS', 'IDEAS'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: VIOLET }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: VIOLET }}>
            {tr(t, 'varianceSwapTitle', 'Variance Swap Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-violet-400 border-b border-violet-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'varianceSwapNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'INDICES' && <IndicesTab data={data} t={t} />}
        {data && activeTab === 'TERM' && <TermTab data={data} t={t} />}
        {data && activeTab === 'STOCKS' && <StocksTab data={data} t={t} />}
        {data && activeTab === 'IDEAS' && <IdeasTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── INDICES Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndicesTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.indices ?? [];
  const dispersion = data?.dispersion;
  const vvix = data?.vvix;

  return (
    <div>
      {/* Index Variance Table */}
      <div className="px-1 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'vsIndexVariance', 'Index Variance')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[60px_52px_52px_56px_40px_40px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Underlying</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Impl Var</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Real Var</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">VRP</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1D Chg</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">1W Chg</span>
        </div>

        {indices.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
            {tr(t, 'vsNoIndices', 'No index data')}
          </div>
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {indices.map((idx: any) => (
          <div
            key={idx?.underlying ?? idx?.symbol}
            className="grid grid-cols-[60px_52px_52px_56px_40px_40px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {idx?.underlying ?? idx?.symbol ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: VIOLET }}>
              {idx?.impliedVar != null ? idx.impliedVar.toFixed(2) : '--'}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {idx?.realizedVar != null ? idx.realizedVar.toFixed(2) : '--'}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: premiumColor(idx?.varianceRiskPremium ?? 0) }}
            >
              {idx?.varianceRiskPremium != null ? (idx.varianceRiskPremium > 0 ? '+' : '') + idx.varianceRiskPremium.toFixed(2) : '--'}
            </span>
            <span className={`text-[7.5px] font-mono text-right tabular-nums ${getChangeColor(idx?.change1d ?? 0)}`}>
              {idx?.change1d != null ? (idx.change1d > 0 ? '+' : '') + idx.change1d.toFixed(1) + '%' : '--'}
            </span>
            <span className={`text-[7.5px] font-mono text-right tabular-nums pr-1 ${getChangeColor(idx?.change1w ?? 0)}`}>
              {idx?.change1w != null ? (idx.change1w > 0 ? '+' : '') + idx.change1w.toFixed(1) + '%' : '--'}
            </span>
          </div>
        ))}
      </div>

      {/* Dispersion Metrics Card */}
      {dispersion && (
        <div className="mx-2 mb-2 border border-border/20 p-2" style={{ background: VIOLET_DIM }}>
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
            {tr(t, 'vsDispersionMetrics', 'Dispersion Metrics')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Index-Comp Spread</div>
              <div className="text-[12px] font-black font-mono tabular-nums" style={{ color: VIOLET }}>
                {dispersion?.indexCompSpread != null ? dispersion.indexCompSpread.toFixed(2) : '--'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Avg Correlation</div>
              <div className="text-[12px] font-black font-mono tabular-nums" style={{ color: VIOLET }}>
                {dispersion?.avgCorrelation != null ? dispersion.avgCorrelation.toFixed(3) : '--'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Disp. Ratio</div>
              <div className="text-[12px] font-black font-mono tabular-nums" style={{ color: VIOLET }}>
                {dispersion?.dispersionRatio != null ? dispersion.dispersionRatio.toFixed(2) : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VVIX Card */}
      {vvix && (
        <div className="mx-2 mb-2 border border-border/20 p-2" style={{ background: VIOLET_DIM }}>
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
            {tr(t, 'vsVvix', 'Vol-of-Vol (VVIX)')}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">VVIX Level</div>
              <div className="text-[14px] font-black font-mono tabular-nums" style={{ color: VIOLET }}>
                {vvix?.level != null ? vvix.level.toFixed(2) : '--'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Percentile</div>
              <div className="text-[12px] font-black font-mono tabular-nums text-neutral-300">
                {vvix?.percentile != null ? vvix.percentile + '%' : '--'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Change</div>
              <div className={`text-[12px] font-black font-mono tabular-nums ${getChangeColor(vvix?.change ?? 0)}`}>
                {vvix?.change != null ? (vvix.change > 0 ? '+' : '') + vvix.change.toFixed(2) : '--'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TERM Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermTab({ data, t }: { data: any; t: TFn }) {
  const termStructure = data?.termStructure ?? [];

  return (
    <div className="px-1 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'vsSpxTermStructure', 'SPX Variance Term Structure')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[52px_52px_52px_56px_48px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Tenor</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Implied</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Realized</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Premium</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">Skew</span>
      </div>

      {termStructure.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'vsNoTermData', 'No term structure data')}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {termStructure.map((tenor: any) => (
        <div
          key={tenor?.tenor ?? tenor?.label}
          className="grid grid-cols-[52px_52px_52px_56px_48px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/20 items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200">
            {tenor?.tenor ?? tenor?.label ?? '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: VIOLET }}>
            {tenor?.implied != null ? tenor.implied.toFixed(2) : '--'}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
            {tenor?.realized != null ? tenor.realized.toFixed(2) : '--'}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: premiumColor(tenor?.premium ?? 0) }}
          >
            {tenor?.premium != null ? (tenor.premium > 0 ? '+' : '') + tenor.premium.toFixed(2) : '--'}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400 pr-1">
            {tenor?.skew != null ? tenor.skew.toFixed(2) : '--'}
          </span>
        </div>
      ))}

      {/* Term structure visual */}
      {termStructure.length >= 2 && (
        <div className="px-2 py-3 border-t border-border/20 mt-1">
          <TermStructureChart termStructure={termStructure} />
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureChart({ termStructure }: { termStructure: any[] }) {
  const W = 280;
  const H = 90;
  const PAD_L = 28;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 18;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const impliedValues = termStructure.map((t) => t?.implied ?? 0);
  const realizedValues = termStructure.map((t) => t?.realized ?? 0);
  const allValues = [...impliedValues, ...realizedValues].filter((v) => v > 0);
  if (allValues.length === 0) return null;

  const minY = Math.min(...allValues) - 1;
  const maxY = Math.max(...allValues) + 1;

  const scaleX = (i: number) => PAD_L + (i / (termStructure.length - 1)) * plotW;
  const scaleY = (v: number) => PAD_T + ((maxY - v) / (maxY - minY)) * plotH;

  const impliedPath = impliedValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  const realizedPath = realizedValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 110 }}>
      {/* Grid */}
      {[minY, (minY + maxY) / 2, maxY].map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2"
          />
          <text x={PAD_L - 3} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
            {v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Tenor labels */}
      {termStructure.map((tenor, i) => (
        <text
          key={i}
          x={scaleX(i)} y={H - 3}
          textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
        >
          {tenor?.tenor ?? tenor?.label ?? ''}
        </text>
      ))}

      {/* Realized line */}
      <path d={realizedPath} fill="none" stroke="rgba(163,163,163,0.5)" strokeWidth={1} strokeDasharray="3,2" />

      {/* Implied line */}
      <path d={impliedPath} fill="none" stroke={VIOLET} strokeWidth={1.5} />

      {/* Points */}
      {impliedValues.map((v, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={2.5} fill={VIOLET} />
      ))}

      {/* Legend */}
      <line x1={PAD_L} y1={5} x2={PAD_L + 12} y2={5} stroke={VIOLET} strokeWidth={1.5} />
      <text x={PAD_L + 15} y={7} fill={VIOLET} fontSize={6} fontFamily="monospace" opacity={0.7}>Impl</text>
      <line x1={PAD_L + 42} y1={5} x2={PAD_L + 54} y2={5} stroke="rgba(163,163,163,0.5)" strokeWidth={1} strokeDasharray="3,2" />
      <text x={PAD_L + 57} y={7} fill="rgba(163,163,163,0.7)" fontSize={6} fontFamily="monospace" opacity={0.7}>Real</text>
    </svg>
  );
}

// ── STOCKS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StocksTab({ data, t }: { data: any; t: TFn }) {
  const stocks = data?.stocks ?? [];

  return (
    <div className="px-1 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'vsSingleStockVariance', 'Single Stock Variance')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_44px_44px_48px_48px_52px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Ticker</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Impl Var</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Real Var</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Premium</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Earn Imp</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right pr-1">Signal</span>
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'vsNoStockData', 'No stock data')}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {stocks.map((stock: any) => {
        const signal = stock?.signal ?? 'NEUTRAL';
        const badge = getSignalBadge(signal);
        return (
          <div
            key={stock?.ticker ?? stock?.symbol}
            className="grid grid-cols-[48px_44px_44px_48px_48px_52px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {stock?.ticker ?? stock?.symbol ?? '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: VIOLET }}>
              {stock?.impliedVar != null ? stock.impliedVar.toFixed(2) : '--'}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {stock?.realizedVar != null ? stock.realizedVar.toFixed(2) : '--'}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: premiumColor(stock?.premium ?? 0) }}
            >
              {stock?.premium != null ? (stock.premium > 0 ? '+' : '') + stock.premium.toFixed(2) : '--'}
            </span>
            <span className={`text-[7.5px] font-mono text-right tabular-nums ${getChangeColor(stock?.earningsImpact ?? 0)}`}>
              {stock?.earningsImpact != null ? (stock.earningsImpact > 0 ? '+' : '') + stock.earningsImpact.toFixed(1) + '%' : '--'}
            </span>
            <div className="flex justify-end pr-1">
              <span
                className="text-[6px] font-mono font-black uppercase px-1.5 py-[1px]"
                style={{ background: badge.bg, color: badge.color }}
              >
                {signal}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── IDEAS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IdeasTab({ data, t }: { data: any; t: TFn }) {
  const ideas = data?.ideas ?? [];

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
        {tr(t, 'vsTradeIdeas', 'Trade Ideas')}
      </div>

      {ideas.length === 0 && (
        <div className="text-center py-8 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'vsNoIdeas', 'No trade ideas available')}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {ideas.map((idea: any, i: number) => (
        <div
          key={idea?.id ?? i}
          className="mb-2 border border-border/20 p-2"
          style={{ background: VIOLET_DIM }}
        >
          {/* Trade description */}
          <div className="text-[9px] font-mono font-bold text-neutral-200 mb-1">
            {idea?.trade ?? idea?.description ?? 'Unnamed Trade'}
          </div>

          {/* Rationale */}
          <div className="text-[7px] font-mono text-neutral-500 mb-2 leading-relaxed">
            {idea?.rationale ?? '--'}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Expected P&L</div>
              <div
                className="text-[11px] font-black font-mono tabular-nums"
                style={{ color: (idea?.expectedPnl ?? 0) >= 0 ? '#34d399' : '#f87171' }}
              >
                {idea?.expectedPnl != null
                  ? (idea.expectedPnl >= 0 ? '+' : '') + (typeof idea.expectedPnl === 'number' ? idea.expectedPnl.toFixed(1) + '%' : idea.expectedPnl)
                  : '--'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral-600 uppercase">Risk/Reward</div>
              <div className="text-[11px] font-black font-mono tabular-nums" style={{ color: VIOLET }}>
                {idea?.riskReward != null
                  ? (typeof idea.riskReward === 'number' ? '1:' + idea.riskReward.toFixed(1) : idea.riskReward)
                  : '--'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
