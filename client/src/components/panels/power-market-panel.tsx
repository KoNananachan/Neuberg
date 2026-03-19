import { useState, useMemo } from 'react';
import { usePowerMarket } from '../../api/hooks/use-power-market';
import { RefreshCw } from 'lucide-react';

type Tab = 'markets' | 'generation' | 'forwards' | 'spreads' | 'capacity';

const ACCENT = '#facc15';
const ACCENT_DIM = 'rgba(250,204,21,0.08)';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toFixed(decimals);
}

function fmtPrice(n: number): string {
  if (n == null || isNaN(n)) return '\u2014';
  if (Math.abs(n) >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  if (n == null || isNaN(n)) return '\u2014';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtGw(n: number): string {
  if (n == null || isNaN(n)) return '\u2014';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}TW`;
  return `${n.toFixed(1)}GW`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function priceColor(price: number, high: number, low: number): string {
  if (price >= high) return 'text-red-400';
  if (price <= low) return 'text-green-400';
  return 'text-white';
}

function reserveMarginColor(pct: number): string {
  if (pct >= 20) return 'text-green-400';
  if (pct >= 10) return 'text-yellow-400';
  return 'text-red-400';
}

function marginBg(pct: number): string {
  if (pct >= 20) return 'bg-green-500/10';
  if (pct >= 10) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

// ── Generation mix colors ──

const GEN_COLORS: Record<string, string> = {
  nuclear: '#a78bfa',
  gas: '#f97316',
  coal: '#78716c',
  wind: '#22d3ee',
  solar: '#facc15',
  hydro: '#3b82f6',
  other: '#6b7280',
};

const GEN_LABELS: Record<string, string> = {
  nuclear: 'Nuclear',
  gas: 'Gas',
  coal: 'Coal',
  wind: 'Wind',
  solar: 'Solar',
  hydro: 'Hydro',
  other: 'Other',
};

// ── Main Panel ──

export function PowerMarketPanel() {
  const [tab, setTab] = useState<Tab>('markets');
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = usePowerMarket() as any;

  const tabs: Tab[] = ['markets', 'generation', 'forwards', 'spreads', 'capacity'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            Power Market Analytics
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {data && <SummaryBar data={data} />}

      {/* Tab bar */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            Loading...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            Failed to load power market data
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && tab === 'markets' && <MarketsTab data={data} />}
        {data && tab === 'generation' && <GenerationTab data={data} />}
        {data && tab === 'forwards' && (
          <ForwardsTab data={data} selectedMarket={selectedMarket} onSelectMarket={setSelectedMarket} />
        )}
        {data && tab === 'spreads' && <SpreadsTab data={data} />}
        {data && tab === 'capacity' && <CapacityTab data={data} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const items = [
    { label: 'Avg LMP', value: `$${fmtPrice(summary.avgLmp)}`, unit: '$/MWh' },
    { label: 'Peak Load', value: fmtNum(summary.peakLoad, 1), unit: 'GW' },
    { label: 'Renewable', value: fmtNum(summary.renewableShare, 1), unit: '%' },
    { label: 'Avg Spark', value: `$${fmtPrice(summary.avgSparkSpread)}`, unit: '$/MWh' },
    { label: 'Avg Reserve', value: fmtNum(summary.avgReserveMargin, 1), unit: '%' },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-border/20 shrink-0" style={{ backgroundColor: ACCENT_DIM }}>
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 text-center border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {item.label}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {item.value}
            {item.unit && <span className="text-[7px] text-neutral-500 ml-0.5">{item.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Markets Tab: ISOs with real-time LMP, day-ahead, peak/off-peak, load, change ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketsTab({ data }: { data: any }) {
  const markets = data?.markets;
  if (!markets || !markets.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No market data
      </div>
    );
  }

  // Determine high/low thresholds for price coloring
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prices = markets.map((m: any) => m.lmp).filter((p: number) => p != null && !isNaN(p));
  const highThreshold = prices.length > 0 ? Math.max(...prices) * 0.8 : 100;
  const lowThreshold = prices.length > 0 ? Math.min(...prices) * 1.2 : 20;

  return (
    <div>
      {/* Column header */}
      <div className="grid grid-cols-[1.3fr_0.7fr_0.6fr_0.7fr_0.7fr_0.7fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>ISO / Market</span>
        <span className="text-right">LMP $/MWh</span>
        <span className="text-right">Chg</span>
        <span className="text-right">Day-Ahead</span>
        <span className="text-right">Peak</span>
        <span className="text-right">Off-Peak</span>
        <span className="text-right">Load GW</span>
        <span className="text-right">Status</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {markets.map((m: any) => (
        <div
          key={m.iso}
          className="grid grid-cols-[1.3fr_0.7fr_0.6fr_0.7fr_0.7fr_0.7fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
              {m.iso}
            </span>
            {m.zone && (
              <span className="text-[7px] font-mono text-neutral-600 truncate">{m.zone}</span>
            )}
          </div>
          <span className={`text-[9px] font-mono font-bold text-right ${priceColor(m.lmp, highThreshold, lowThreshold)}`}>
            {fmtPrice(m.lmp)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(m.changePct)}`}>
            {fmtPct(m.changePct)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtPrice(m.dayAhead)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(m.peak)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtPrice(m.offPeak)}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtGw(m.load)}
          </span>
          <div className="flex justify-end items-center">
            <LoadStatusBadge status={m.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadStatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toLowerCase();
  let colorClass = 'text-neutral-400 border-neutral-500/30 bg-neutral-500/10';
  if (normalized === 'normal' || normalized === 'stable') {
    colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
  } else if (normalized === 'elevated' || normalized === 'watch') {
    colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  } else if (normalized === 'emergency' || normalized === 'critical' || normalized === 'alert') {
    colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
  }

  return (
    <span className={`inline-block px-1.5 py-px text-[7px] font-mono font-bold uppercase tracking-wider border ${colorClass}`}>
      {status || '\u2014'}
    </span>
  );
}

// ── Generation Tab: Gen mix breakdown per market with % bars, renewable penetration ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenerationTab({ data }: { data: any }) {
  const generation = data?.generation;
  if (!generation || !generation.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No generation data
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2 flex-wrap">
        {Object.entries(GEN_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5" style={{ backgroundColor: color }} />
            <span className="text-[6px] font-mono text-neutral-600 uppercase">{GEN_LABELS[key]}</span>
          </div>
        ))}
      </div>

      {/* Per-market generation mix */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {generation.map((g: any) => {
        const sources = [
          { key: 'nuclear', value: g.nuclear || 0 },
          { key: 'gas', value: g.gas || 0 },
          { key: 'coal', value: g.coal || 0 },
          { key: 'wind', value: g.wind || 0 },
          { key: 'solar', value: g.solar || 0 },
          { key: 'hydro', value: g.hydro || 0 },
          { key: 'other', value: g.other || 0 },
        ];
        const total = sources.reduce((sum, s) => sum + s.value, 0);
        const renewablePct = ((g.wind || 0) + (g.solar || 0) + (g.hydro || 0));
        const renewableColor = renewablePct >= 40 ? 'text-green-400' : renewablePct >= 20 ? 'text-yellow-400' : 'text-neutral-400';

        return (
          <div key={g.market} className="px-3 py-2 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                {g.market}
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-[7px] font-mono font-bold ${renewableColor}`}>
                  REN {fmtNum(renewablePct, 1)}%
                </span>
                <span className="text-[7px] font-mono text-neutral-600">
                  {fmtNum(total, 0)}% TOTAL
                </span>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="flex h-2.5 w-full overflow-hidden">
              {sources.map((s) => {
                const pct = total > 0 ? (s.value / total) * 100 : 0;
                if (pct < 0.5) return null;
                return (
                  <div
                    key={s.key}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: GEN_COLORS[s.key],
                      opacity: 0.85,
                    }}
                    title={`${GEN_LABELS[s.key]}: ${s.value.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Source labels */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {sources.filter((s) => s.value > 0).map((s) => (
                <span key={s.key} className="text-[6px] font-mono text-neutral-600">
                  <span style={{ color: GEN_COLORS[s.key] }}>{GEN_LABELS[s.key]}</span>{' '}
                  {s.value.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Forwards Tab: Month-ahead forward curve for selected market ──

function ForwardsTab({
  data,
  selectedMarket,
  onSelectMarket,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  selectedMarket: string;
  onSelectMarket: (m: string) => void;
}) {
  const forwards = data?.forwards;
  if (!forwards) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No forwards data
      </div>
    );
  }

  const marketNames: string[] = Object.keys(forwards);
  const activeMarket = selectedMarket && marketNames.includes(selectedMarket)
    ? selectedMarket
    : marketNames[0] || '';

  const curve = activeMarket ? (forwards[activeMarket] || []) : [];

  return (
    <div>
      {/* Market selector */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20">
        {marketNames.map((name: string) => (
          <button
            key={name}
            onClick={() => onSelectMarket(name)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border transition-colors ${
              name === activeMarket
                ? 'border-yellow-400 text-yellow-400'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
            }`}
            style={name === activeMarket ? { backgroundColor: ACCENT_DIM } : undefined}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Forward curve mini chart */}
      {curve.length > 1 && <ForwardCurveChart points={curve} market={activeMarket} />}

      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Month</span>
        <span className="text-right">Price $/MWh</span>
        <span className="text-right">1W Chg</span>
        <span className="text-right">Vol</span>
      </div>

      {/* Rows */}
      {curve.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          No forward data for {activeMarket}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {curve.map((pt: any) => (
        <div
          key={pt.month}
          className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {pt.month}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {fmtPrice(pt.price)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(pt.change1w)}`}>
            {fmtPct(pt.change1w)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {pt.volume != null ? fmtNum(pt.volume, 0) : '\u2014'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Forward Curve Mini Chart ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForwardCurveChart({ points, market }: { points: any[]; market: string }) {
  const W = 320;
  const H = 80;
  const PAD_X = 8;
  const PAD_Y = 12;

  const chartData = useMemo(() => {
    if (!points || points.length < 2) return null;

    const values = points.map((p: { price: number }) => p.price);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) =>
      PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const trending = lastVal >= firstVal ? 'up' : 'down';

    return { linePath, fillPath, lastX: scaleX(values.length - 1), lastY: scaleY(lastVal), firstVal, lastVal, trending };
  }, [points]);

  const lineColor = chartData?.trending === 'up' ? ACCENT : '#f87171';
  const fillColor = chartData?.trending === 'up'
    ? 'rgba(250,204,21,0.08)'
    : 'rgba(248,113,113,0.08)';

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          {market} Forward Curve
        </span>
        {chartData && (
          <span className={`text-[8px] font-mono font-bold ${chartData.trending === 'up' ? 'text-yellow-400' : 'text-red-400'}`}>
            ${fmtPrice(chartData.lastVal)}
          </span>
        )}
      </div>

      {chartData ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }}>
          <path d={chartData.fillPath} fill={fillColor} />
          <path d={chartData.linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
          <circle cx={chartData.lastX} cy={chartData.lastY} r={2.5} fill={lineColor} />
        </svg>
      ) : (
        <div className="h-16 flex items-center justify-center text-[7px] font-mono text-neutral-600">
          NO DATA
        </div>
      )}

      {chartData && points.length > 0 && (
        <div className="flex justify-between text-[6px] font-mono text-neutral-600 mt-0.5">
          <span>{points[0].month}</span>
          <span>{points[points.length - 1].month}</span>
        </div>
      )}
    </div>
  );
}

// ── Spreads Tab: Spark/dark spreads, heat rates by region ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsTab({ data }: { data: any }) {
  const spreads = data?.spreads;
  if (!spreads || !spreads.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No spreads data
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Spark / Dark Spreads & Heat Rates
        </span>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Region</span>
        <span className="text-right">Spark</span>
        <span className="text-right">Dark</span>
        <span className="text-right">Heat Rate</span>
        <span className="text-right">Gas $/MMBtu</span>
        <span className="text-right">1D Chg</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {spreads.map((s: any) => {
        const sparkColor = s.sparkSpread > 0 ? 'text-green-400' : s.sparkSpread < -5 ? 'text-red-400' : 'text-neutral-400';
        const darkColor = s.darkSpread > 0 ? 'text-green-400' : s.darkSpread < -5 ? 'text-red-400' : 'text-neutral-400';

        return (
          <div
            key={s.region}
            className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
              {s.region}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${sparkColor}`}>
              ${fmtPrice(s.sparkSpread)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${darkColor}`}>
              ${fmtPrice(s.darkSpread)}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtNum(s.heatRate, 0)}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              ${fmtPrice(s.gasPrice)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(s.change1d)}`}>
              {fmtPct(s.change1d)}
            </span>
          </div>
        );
      })}

      {/* Implied heat rate summary */}
      {data?.heatRateSummary && (
        <>
          <div className="px-3 py-1 border-b border-border/10 mt-1">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              Implied Heat Rates
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>Region</span>
            <span className="text-right">On-Peak</span>
            <span className="text-right">Off-Peak</span>
            <span className="text-right">ATC</span>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {data.heatRateSummary.map((hr: any) => (
            <div
              key={hr.region}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white">{hr.region}</span>
              <span className="text-[9px] font-mono text-white text-right">{fmtNum(hr.onPeak, 0)}</span>
              <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtNum(hr.offPeak, 0)}</span>
              <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtNum(hr.atc, 0)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Capacity Tab: Auction results, reserve margins, capacity market prices ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CapacityTab({ data }: { data: any }) {
  const capacity = data?.capacity;
  if (!capacity) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No capacity data
      </div>
    );
  }

  const auctions = capacity.auctions || [];
  const reserves = capacity.reserves || [];
  const prices = capacity.prices || [];

  if (!auctions.length && !reserves.length && !prices.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No capacity data
      </div>
    );
  }

  return (
    <div>
      {/* Capacity Market Prices */}
      {prices.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              Capacity Market Prices
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>Market</span>
            <span className="text-right">$/MW-Day</span>
            <span className="text-right">Delivery Year</span>
            <span className="text-right">1Y Chg</span>
            <span className="text-right">Status</span>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {prices.map((p: any) => (
            <div
              key={`${p.market}-${p.deliveryYear}`}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                {p.market}
              </span>
              <span className="text-[9px] font-mono text-white text-right">
                ${fmtPrice(p.price)}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 text-right">
                {p.deliveryYear}
              </span>
              <span className={`text-[9px] font-mono font-bold text-right ${changeColor(p.change1y)}`}>
                {fmtPct(p.change1y)}
              </span>
              <div className="flex justify-end items-center">
                <AuctionStatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </>
      )}

      {/* Auction Results */}
      {auctions.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10 mt-1">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              Recent Auction Results
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>Auction</span>
            <span className="text-right">Clearing $/MW-Day</span>
            <span className="text-right">Procured GW</span>
            <span className="text-right">Prev Clear</span>
            <span className="text-right">Chg</span>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {auctions.map((a: any) => (
            <div
              key={a.name}
              className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                {a.name}
              </span>
              <span className="text-[9px] font-mono text-white text-right">
                ${fmtPrice(a.clearingPrice)}
              </span>
              <span className="text-[9px] font-mono text-white text-right">
                {fmtGw(a.procured)}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 text-right">
                ${fmtPrice(a.prevClearing)}
              </span>
              <span className={`text-[9px] font-mono font-bold text-right ${changeColor(a.changePct)}`}>
                {fmtPct(a.changePct)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Reserve Margins */}
      {reserves.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10 mt-1">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              Reserve Margins
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>Region</span>
            <span>Margin</span>
            <span className="text-right">Target %</span>
            <span className="text-right">Actual %</span>
            <span className="text-right">Status</span>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {reserves.map((r: any) => {
            const actual = r.actualMargin ?? 0;
            const target = r.targetMargin ?? 15;
            const barWidth = Math.min(actual / (target * 1.5) * 100, 100);
            const barColor = actual >= target ? ACCENT : actual >= target * 0.7 ? '#fbbf24' : '#f87171';

            return (
              <div
                key={r.region}
                className="grid grid-cols-[1.2fr_1fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
              >
                <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                  {r.region}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[6px] bg-white/5 relative">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor, opacity: 0.7 }}
                    />
                    {/* Target marker */}
                    <div
                      className="absolute inset-y-0 w-px bg-white/30"
                      style={{ left: `${Math.min(target / (target * 1.5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {fmtNum(target, 1)}%
                </span>
                <span className={`text-[9px] font-mono font-bold text-right ${reserveMarginColor(actual)}`}>
                  {fmtNum(actual, 1)}%
                </span>
                <div className="flex justify-end items-center">
                  <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${reserveMarginColor(actual)} ${marginBg(actual)} border border-current/20`}>
                    {actual >= target ? 'OK' : actual >= target * 0.7 ? 'WATCH' : 'TIGHT'}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AuctionStatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toLowerCase();
  let colorClass = 'text-neutral-400 border-neutral-500/30 bg-neutral-500/10';
  if (normalized === 'cleared' || normalized === 'completed') {
    colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
  } else if (normalized === 'pending' || normalized === 'upcoming') {
    colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  } else if (normalized === 'cancelled' || normalized === 'failed') {
    colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
  }

  return (
    <span className={`inline-block px-1.5 py-px text-[7px] font-mono font-bold uppercase tracking-wider border ${colorClass}`}>
      {status || '\u2014'}
    </span>
  );
}
