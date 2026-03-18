import { useState, useMemo } from 'react';
import {
  useEquityRiskPremium,
  type EquityRiskPremiumData,
  type ErpMarket,
  type ErpDecomposition,
} from '../../api/hooks/use-equity-risk-premium';
import { useT } from '../../i18n';
import { Scale, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type ViewMode = 'MARKETS' | 'DECOMPOSITION' | 'HISTORY';
type SortKey =
  | 'market' | 'earningsYield' | 'dividendYield' | 'riskFreeRate' | 'erp'
  | 'forwardPe' | 'cape' | 'impliedReturn' | 'percentile' | 'signal';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtSignedPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, dec = 1): string {
  return n.toFixed(dec);
}

// ── Color helpers ──

function signalColor(signal: string | null): { text: string; bg: string } {
  switch (signal) {
    case 'EXTREME_CHEAP': return { text: 'text-emerald-300', bg: 'bg-emerald-400/20 border-emerald-400/40' };
    case 'CHEAP': return { text: 'text-green-400', bg: 'bg-green-400/15 border-green-400/30' };
    case 'FAIR': return { text: 'text-neutral-400', bg: 'bg-neutral-400/10 border-neutral-400/20' };
    case 'RICH': return { text: 'text-red-400', bg: 'bg-red-400/15 border-red-400/30' };
    case 'EXTREME_RICH': return { text: 'text-red-300', bg: 'bg-red-400/20 border-red-400/40' };
    default: return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border-neutral-500/20' };
  }
}

function erpColor(erp: number): string {
  if (erp >= 7) return 'text-emerald-400';
  if (erp >= 5) return 'text-green-400';
  if (erp >= 3) return 'text-yellow-400';
  if (erp >= 1) return 'text-orange-400';
  return 'text-red-400';
}

function percentileBarColor(pct: number): string {
  if (pct >= 70) return '#34d399'; // emerald-400
  if (pct >= 40) return '#fbbf24'; // yellow-400
  return '#f87171'; // red-400
}

function vsAvgColor(diff: number): string {
  if (diff > 0.5) return 'text-green-400';
  if (diff < -0.5) return 'text-red-400';
  return 'text-yellow-400';
}

// ── Sorting ──

function sortMarkets(markets: ErpMarket[], key: SortKey, asc: boolean): ErpMarket[] {
  const sorted = [...markets];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'market': cmp = a.market.localeCompare(b.market); break;
      case 'earningsYield': cmp = a.earningsYield - b.earningsYield; break;
      case 'dividendYield': cmp = a.dividendYield - b.dividendYield; break;
      case 'riskFreeRate': cmp = a.riskFreeRate - b.riskFreeRate; break;
      case 'erp': cmp = a.erp - b.erp; break;
      case 'forwardPe': cmp = a.forwardPe - b.forwardPe; break;
      case 'cape': cmp = a.cape - b.cape; break;
      case 'impliedReturn': cmp = a.impliedReturn - b.impliedReturn; break;
      case 'percentile': cmp = a.percentile - b.percentile; break;
      case 'signal': cmp = (a.signal || '').localeCompare(b.signal || ''); break;
    }
    return asc ? cmp : -cmp;
  });
  return sorted;
}

// ── Main Panel ──

export function EquityRiskPremiumPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEquityRiskPremium();

  const [view, setView] = useState<ViewMode>('MARKETS');
  const [sortKey, setSortKey] = useState<SortKey>('erp');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'market');
    }
  };

  const sortedMarkets = useMemo(() => {
    if (!data) return [];
    return sortMarkets(data.markets, sortKey, sortAsc);
  }, [data, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'erpTitle', 'Equity Risk Premium')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-blue-400 bg-blue-400/10 border border-blue-400/30">
                US ERP {fmtPct(data.markets.find((m) => m.market === 'US')?.erp ?? 0)}
              </span>
              <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 border ${
                data.usErpVs20YrAvg >= 0
                  ? 'text-green-400 bg-green-400/10 border-green-400/30'
                  : 'text-red-400 bg-red-400/10 border-red-400/30'
              }`}>
                vs Avg {fmtSignedPct(data.usErpVs20YrAvg)}
              </span>
            </>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-blue-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-0.5">
          {(['MARKETS', 'DECOMPOSITION', 'HISTORY'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                view === v
                  ? 'text-blue-400 bg-blue-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'erpNoData', 'No data available')}
          </div>
        )}

        {data && view === 'MARKETS' && (
          <MarketsView
            markets={sortedMarkets}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
            globalAvgErp={data.globalAvgErp}
            t={t}
          />
        )}

        {data && view === 'DECOMPOSITION' && (
          <DecompositionView decomposition={data.decomposition} t={t} />
        )}

        {data && view === 'HISTORY' && (
          <HistoryView markets={data.markets} t={t} />
        )}

        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'erpLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sparkline ──

function Sparkline({ data, width = 60, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const pad = 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = data[data.length - 1];
  const first = data[0];
  const color = last >= first ? '#4ade80' : '#f87171';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
    </svg>
  );
}

// ── Sort Header ──

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  asc,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === key;
  return (
    <th
      className={`text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 cursor-pointer select-none whitespace-nowrap ${
        active ? 'text-blue-400' : 'text-neutral-600'
      } ${className}`}
      onClick={() => onSort(key)}
    >
      {label}
      {active && <span className="ml-0.5">{asc ? '\u25B2' : '\u25BC'}</span>}
    </th>
  );
}

// ── MARKETS View ──

function MarketsView({
  markets,
  sortKey,
  sortAsc,
  onSort,
  globalAvgErp,
  t,
}: {
  markets: ErpMarket[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  globalAvgErp: number;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Global average badge */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'erpGlobalAvg', 'Global Avg ERP')}
        </span>
        <span className={`text-[8px] font-mono font-bold ${erpColor(globalAvgErp)}`}>
          {fmtPct(globalAvgErp)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border/20">
              <SortHeader label={tr(t, 'erpMarket', 'Market')} sortKey="market" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 text-neutral-600 whitespace-nowrap">
                {tr(t, 'erpIndex', 'Index')}
              </th>
              <SortHeader label={tr(t, 'erpEpYield', 'E/P Yield')} sortKey="earningsYield" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpDivYield', 'Div Yield')} sortKey="dividendYield" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpRfRate', 'RF Rate')} sortKey="riskFreeRate" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpErp', 'ERP')} sortKey="erp" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpFwdPe', 'Fwd P/E')} sortKey="forwardPe" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpCape', 'CAPE')} sortKey="cape" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpImplied', 'Impl. Return')} sortKey="impliedReturn" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpPercentile', '%ile')} sortKey="percentile" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <SortHeader label={tr(t, 'erpSignal', 'Signal')} sortKey="signal" currentKey={sortKey} asc={sortAsc} onSort={onSort} />
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-1.5 text-neutral-600 whitespace-nowrap">
                {tr(t, 'erpSparkline', 'Trend')}
              </th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => {
              const sig = signalColor(m.signal);
              return (
                <tr key={m.market} className="border-b border-border/10 hover:bg-blue-400/[0.02]">
                  <td className="text-[9px] font-mono font-bold text-white py-1 px-1.5 whitespace-nowrap">
                    {m.market}
                  </td>
                  <td className="text-[8px] font-mono text-neutral-500 py-1 px-1.5 whitespace-nowrap">
                    {m.index}
                  </td>
                  <td className="text-[9px] font-mono text-white py-1 px-1.5">{fmtPct(m.earningsYield)}</td>
                  <td className="text-[9px] font-mono text-white py-1 px-1.5">{fmtPct(m.dividendYield)}</td>
                  <td className="text-[9px] font-mono text-neutral-400 py-1 px-1.5">{fmtPct(m.riskFreeRate)}</td>
                  <td className={`text-[9px] font-mono font-bold py-1 px-1.5 ${erpColor(m.erp)}`}>
                    {fmtPct(m.erp)}
                  </td>
                  <td className="text-[9px] font-mono text-white py-1 px-1.5">{fmtNum(m.forwardPe)}</td>
                  <td className="text-[9px] font-mono text-white py-1 px-1.5">{fmtNum(m.cape)}</td>
                  <td className="text-[9px] font-mono text-blue-400 py-1 px-1.5">{fmtPct(m.impliedReturn)}</td>
                  <td className="py-1 px-1.5">
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.min(100, m.percentile)}%`,
                            backgroundColor: percentileBarColor(m.percentile),
                          }}
                        />
                      </div>
                      <span className="text-[7px] font-mono text-neutral-500">{m.percentile}</span>
                    </div>
                  </td>
                  <td className="py-1 px-1.5">
                    {m.signal && (
                      <span className={`text-[7px] font-mono font-bold px-1 py-px border ${sig.text} ${sig.bg}`}>
                        {m.signal.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-1.5">
                    <Sparkline data={m.erpHistory} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DECOMPOSITION View ──

function DecompositionView({
  decomposition,
  t,
}: {
  decomposition: ErpDecomposition[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'erpDecompTitle', 'US Market — Expected Return Decomposition')}
        </span>
      </div>

      {/* Waterfall Chart */}
      <div className="px-3 py-3">
        <WaterfallChart decomposition={decomposition} />
      </div>

      {/* Table */}
      <div className="border-t border-border/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/20">
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-3 text-neutral-600">
                {tr(t, 'erpComponent', 'Component')}
              </th>
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-right py-1 px-3 text-neutral-600">
                {tr(t, 'erpValue', 'Value')}
              </th>
              <th className="text-[7px] font-mono font-bold uppercase tracking-wider text-left py-1 px-3 text-neutral-600">
                {tr(t, 'erpBar', '')}
              </th>
            </tr>
          </thead>
          <tbody>
            {decomposition.map((d) => {
              const isTotal = d.component === 'Total Expected Return';
              const barWidth = Math.min(100, Math.abs(d.value) * 8);
              return (
                <tr key={d.component} className={`border-b border-border/10 ${isTotal ? 'bg-blue-400/[0.05]' : 'hover:bg-blue-400/[0.02]'}`}>
                  <td className={`text-[9px] font-mono py-1.5 px-3 ${isTotal ? 'font-bold text-blue-400' : 'text-neutral-300'}`}>
                    {d.component}
                  </td>
                  <td className={`text-[9px] font-mono font-bold text-right py-1.5 px-3 ${isTotal ? 'text-blue-400' : 'text-white'}`}>
                    {fmtPct(d.value)}
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="w-24 h-1.5 bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: isTotal ? '#3b82f6' : getDecompColor(d.component),
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getDecompColor(component: string): string {
  switch (component) {
    case 'Risk Free Rate': return '#6366f1'; // indigo
    case 'Inflation Premium': return '#f59e0b'; // amber
    case 'Real Risk Free': return '#8b5cf6'; // violet
    case 'Equity Risk Premium': return '#3b82f6'; // blue
    case 'Size Premium': return '#10b981'; // emerald
    case 'Value Premium': return '#ec4899'; // pink
    default: return '#3b82f6';
  }
}

function WaterfallChart({ decomposition }: { decomposition: ErpDecomposition[] }) {
  const W = 500;
  const H = 180;
  const PAD_L = 10;
  const PAD_R = 10;
  const PAD_T = 20;
  const PAD_B = 40;

  // Filter out "Real Risk Free" and "Total Expected Return" for the waterfall bars
  // since Real Risk Free is a derived figure and Total is the sum
  const waterfallItems = decomposition.filter(
    (d) => d.component !== 'Real Risk Free' && d.component !== 'Total Expected Return',
  );
  const totalItem = decomposition.find((d) => d.component === 'Total Expected Return');

  const barCount = waterfallItems.length + (totalItem ? 1 : 0);
  const barW = Math.min(50, (W - PAD_L - PAD_R) / barCount - 8);
  const gap = (W - PAD_L - PAD_R - barW * barCount) / (barCount + 1);

  // Compute running total
  let maxVal = 0;
  let runningTotal = 0;
  const bars: { label: string; start: number; end: number; value: number; color: string; isTotal: boolean }[] = [];

  for (const item of waterfallItems) {
    const start = runningTotal;
    runningTotal += item.value;
    bars.push({
      label: item.component.split(' ').map((w) => w[0]).join(''),
      start,
      end: runningTotal,
      value: item.value,
      color: getDecompColor(item.component),
      isTotal: false,
    });
    maxVal = Math.max(maxVal, Math.abs(runningTotal));
  }

  if (totalItem) {
    bars.push({
      label: 'Total',
      start: 0,
      end: totalItem.value,
      value: totalItem.value,
      color: '#3b82f6',
      isTotal: true,
    });
  }

  const scaleMax = maxVal * 1.2;
  const chartH = H - PAD_T - PAD_B;

  const yScale = (v: number) => PAD_T + chartH - (v / scaleMax) * chartH;

  // Grid lines
  const gridValues = [0, scaleMax * 0.25, scaleMax * 0.5, scaleMax * 0.75, scaleMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {/* Grid */}
      {gridValues.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            y1={yScale(v)}
            x2={W - PAD_R}
            y2={yScale(v)}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 2}
            y={yScale(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.2)"
            fontSize={6}
            fontFamily="monospace"
          >
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {bars.map((bar, i) => {
        const x = PAD_L + gap + i * (barW + gap);
        const y1 = yScale(Math.max(bar.start, bar.end));
        const y2 = yScale(Math.min(bar.start, bar.end));
        const barHeight = Math.max(1, y2 - y1);

        return (
          <g key={i}>
            <rect
              x={x}
              y={y1}
              width={barW}
              height={barHeight}
              fill={bar.color}
              opacity={bar.isTotal ? 1 : 0.8}
            />
            {/* Value label */}
            <text
              x={x + barW / 2}
              y={y1 - 4}
              textAnchor="middle"
              fill="white"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {bar.value.toFixed(1)}%
            </text>
            {/* Label */}
            <text
              x={x + barW / 2}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={6}
              fontFamily="monospace"
            >
              {bar.label}
            </text>
            {/* Connector line to next bar (non-total) */}
            {!bar.isTotal && i < bars.length - 2 && (
              <line
                x1={x + barW}
                y1={yScale(bar.end)}
                x2={x + barW + gap}
                y2={yScale(bar.end)}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="2,2"
              />
            )}
          </g>
        );
      })}

      {/* Running total line */}
      {(() => {
        const linePoints = bars
          .filter((b) => !b.isTotal)
          .map((bar, i) => {
            const x = PAD_L + gap + i * (barW + gap) + barW / 2;
            const y = yScale(bar.end);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
        if (linePoints.length < 2) return null;
        return (
          <polyline
            points={linePoints.join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
            strokeDasharray="3,2"
          />
        );
      })()}
    </svg>
  );
}

// ── HISTORY View ──

const HISTORY_COLORS: Record<string, string> = {
  US: '#3b82f6',
  Europe: '#a855f7',
  'Emerging Markets': '#f59e0b',
};

function HistoryView({
  markets,
  t,
}: {
  markets: ErpMarket[];
  t: ReturnType<typeof useT>;
}) {
  const selectedMarkets = useMemo(
    () => markets.filter((m) => m.market === 'US' || m.market === 'Europe' || m.market === 'Emerging Markets'),
    [markets],
  );

  // All values for scale
  const allValues = selectedMarkets.flatMap((m) => m.erpHistory);
  const minVal = Math.min(...allValues) - 0.5;
  const maxVal = Math.max(...allValues) + 0.5;

  const W = 500;
  const H = 200;
  const PAD_L = 35;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const rangeV = maxVal - minVal || 1;

  const scaleX = (i: number, total: number) => PAD_L + (i / (total - 1)) * chartW;
  const scaleY = (v: number) => PAD_T + ((maxVal - v) / rangeV) * chartH;

  // Fair value band (roughly the average across time)
  const avgAll = allValues.length > 0 ? allValues.reduce((s, v) => s + v, 0) / allValues.length : 5;
  const bandTop = scaleY(avgAll + 1);
  const bandBottom = scaleY(avgAll - 1);

  // Grid values
  const gridCount = 5;
  const gridStep = rangeV / gridCount;
  const gridValues: number[] = [];
  for (let i = 0; i <= gridCount; i++) {
    gridValues.push(minVal + i * gridStep);
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'erpHistoryTitle', 'ERP History — 20 Period Comparison')}
        </span>
        <div className="flex items-center gap-3">
          {selectedMarkets.map((m) => (
            <div key={m.market} className="flex items-center gap-1">
              <div
                className="w-2 h-0.5"
                style={{ backgroundColor: HISTORY_COLORS[m.market] || '#666' }}
              />
              <span className="text-[7px] font-mono text-neutral-500">{m.market}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
          {/* Fair value band */}
          <rect
            x={PAD_L}
            y={bandTop}
            width={chartW}
            height={Math.max(0, bandBottom - bandTop)}
            fill="rgba(59,130,246,0.06)"
          />
          <line
            x1={PAD_L}
            y1={scaleY(avgAll)}
            x2={PAD_L + chartW}
            y2={scaleY(avgAll)}
            stroke="rgba(59,130,246,0.2)"
            strokeDasharray="4,3"
          />

          {/* Grid */}
          {gridValues.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={scaleY(v)}
                x2={PAD_L + chartW}
                y2={scaleY(v)}
                stroke="rgba(255,255,255,0.04)"
              />
              <text
                x={PAD_L - 4}
                y={scaleY(v) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, 4, 9, 14, 19].map((i) => {
            if (i >= 20) return null;
            return (
              <text
                key={i}
                x={scaleX(i, 20)}
                y={H - 5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize={7}
                fontFamily="monospace"
              >
                {`T-${19 - i}`}
              </text>
            );
          })}

          {/* Lines for each market */}
          {selectedMarkets.map((m) => {
            const color = HISTORY_COLORS[m.market] || '#666';
            const points = m.erpHistory.map((v, i) => {
              const x = scaleX(i, m.erpHistory.length);
              const y = scaleY(v);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            });

            const lastIdx = m.erpHistory.length - 1;
            const lastX = scaleX(lastIdx, m.erpHistory.length);
            const lastY = scaleY(m.erpHistory[lastIdx]);

            return (
              <g key={m.market}>
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.9}
                />
                <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
                <text
                  x={lastX + 5}
                  y={lastY + 3}
                  fill={color}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {m.erpHistory[lastIdx].toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Fair value label */}
          <text
            x={PAD_L + 3}
            y={bandTop - 3}
            fill="rgba(59,130,246,0.4)"
            fontSize={6}
            fontFamily="monospace"
          >
            FAIR VALUE BAND
          </text>
        </svg>
      </div>

      {/* Summary row */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="grid grid-cols-3 gap-3">
          {selectedMarkets.map((m) => {
            const last = m.erpHistory[m.erpHistory.length - 1];
            const first = m.erpHistory[0];
            const change = last - first;
            return (
              <div key={m.market}>
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {m.market}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: HISTORY_COLORS[m.market] }}
                  >
                    {fmtPct(last)}
                  </span>
                  <span className={`text-[8px] font-mono font-bold ${vsAvgColor(change)}`}>
                    {fmtSignedPct(change)}
                  </span>
                </div>
                <div className="text-[7px] font-mono text-neutral-600">
                  {tr(t, 'erpPercentile', '%ile')}: {m.percentile}
                  {m.signal && (
                    <span className={`ml-1 ${signalColor(m.signal).text}`}>{m.signal.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
