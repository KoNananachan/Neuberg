import { useMemo, useState } from 'react';
import {
  useSwapRates,
  type SwapRatesData,
  type SwapRate,
  type SwapCurve,
} from '../../api/hooks/use-swap-rates';
import { useT, tr, TFn } from '../../i18n';
import { TrendingUp, RefreshCw } from 'lucide-react';

// ── Types ──

type View = 'table' | 'curve' | 'comparison';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'AUD' | 'CAD';

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'];

const CURRENCY_COLORS: Record<Currency, string> = {
  USD: '#10b981',
  EUR: '#3b82f6',
  GBP: '#f59e0b',
  JPY: '#ef4444',
  CHF: '#a855f7',
  AUD: '#06b6d4',
  CAD: '#f97316',
};

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers (bond convention: rates up = red, rates down = green) ──

function bpsColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function SwapRatesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSwapRates();
  const [activeView, setActiveView] = useState<View>('table');
  const [selectedCcy, setSelectedCcy] = useState<Currency>('USD');

  // Find the 2s10s spread for selected currency
  const spread2s10s = useMemo(() => {
    if (!data) return null;
    const row = data.rates.find((r) => r.currency === selectedCcy && r.tenor === '2Y');
    return row?.spread2s10s ?? null;
  }, [data, selectedCcy]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'srTitle', 'Swap Rates')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {spread2s10s !== null && (
            <span
              className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${
                spread2s10s < 0
                  ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              2s10s {fmtBps(spread2s10s)}bp
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Currency selector */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {CURRENCIES.map((ccy) => (
            <button
              key={ccy}
              onClick={() => setSelectedCcy(ccy)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                selectedCcy === ccy
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {ccy}
            </button>
          ))}
        </div>
        <div className="flex gap-px px-2 py-1 border-l border-border/20">
          {(['table', 'curve', 'comparison'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeView === v
                  ? 'text-emerald-400 border-b border-emerald-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v === 'table'
                ? tr(t, 'srTable', 'Table')
                : v === 'curve'
                  ? tr(t, 'srCurve', 'Curve')
                  : tr(t, 'srComparison', 'Comparison')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'srNoData', 'No data available')}
          </div>
        )}

        {data && activeView === 'table' && <TableView data={data} ccy={selectedCcy} t={t} />}
        {data && activeView === 'curve' && <CurveView data={data} ccy={selectedCcy} t={t} />}
        {data && activeView === 'comparison' && <ComparisonView data={data} t={t} />}
      </div>
    </div>
  );
}

// ── TABLE VIEW ──

function TableView({ data, ccy, t }: { data: SwapRatesData; ccy: Currency; t: ReturnType<typeof useT> }) {
  const ccyRates = useMemo(
    () => data.rates.filter((r) => r.currency === ccy),
    [data.rates, ccy],
  );

  // Find butterfly for this currency
  const butterfly = data.butterfly.find((b) => b.currency === ccy);

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[44px_56px_44px_44px_44px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'srTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'srRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sr1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sr1W', '\u03941W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sr1M', '\u03941M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'srSpread', 'Sprd bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'sr20D', '20D')}
        </span>
      </div>

      {/* Table rows */}
      {ccyRates.map((rate) => (
        <SwapRateRow key={`${rate.currency}-${rate.tenor}`} rate={rate} />
      ))}

      {/* Butterfly footer */}
      {butterfly && (
        <div className="px-3 py-1.5 border-t border-border/20 flex items-center gap-3">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            2s5s10s Butterfly:
          </span>
          <span className={`text-[8px] font-mono font-bold ${butterfly.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtBps(butterfly.value)}bp
          </span>
          <span className={`text-[7px] font-mono ${butterfly.change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            ({fmtBps(butterfly.change)})
          </span>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'srUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function SwapRateRow({ rate }: { rate: SwapRate }) {
  return (
    <div className="grid grid-cols-[44px_56px_44px_44px_44px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center">
      {/* Tenor */}
      <span className="text-[8px] font-mono font-bold text-white">{rate.tenor}</span>

      {/* Rate */}
      <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(rate.rate)}</span>

      {/* 1D change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1d)}`}>
        {fmtBps(rate.change1d)}
      </span>

      {/* 1W change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1w)}`}>
        {fmtBps(rate.change1w)}
      </span>

      {/* 1M change */}
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1m)}`}>
        {fmtBps(rate.change1m)}
      </span>

      {/* Swap spread vs treasury */}
      <span className={`text-[8px] font-mono font-bold text-right ${
        rate.spreadVsTreasury > 15
          ? 'text-yellow-400'
          : rate.spreadVsTreasury < 5
            ? 'text-blue-400'
            : 'text-neutral-400'
      }`}>
        {rate.spreadVsTreasury > 0 ? '+' : ''}{rate.spreadVsTreasury}
      </span>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <MiniSparkline data={rate.history} />
      </div>
    </div>
  );
}

// ── Mini Sparkline ──

function MiniSparkline({ data }: { data: number[] }) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const W = 48;
    const H = 14;
    const PAD = 1;

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rangeV = maxV - minV || 0.001;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    return { linePath, W, H };
  }, [data]);

  if (!path) return null;

  // Bond convention: price up (rate down) = green
  const rateDown = data[data.length - 1] < data[0];
  const color = rateDown ? '#10b981' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={48} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

// ── CURVE VIEW ──

function CurveView({ data, ccy, t }: { data: SwapRatesData; ccy: Currency; t: ReturnType<typeof useT> }) {
  const curve = useMemo(
    () => data.curves.find((c) => c.currency === ccy),
    [data.curves, ccy],
  );

  if (!curve) return null;

  const W = 420;
  const H = 220;
  const PAD_L = 42;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;

  // Collect all rates for range
  const allRates = [
    ...curve.rates,
    ...curve.prevRates,
    ...curve.weekAgoRates,
    ...curve.monthAgoRates,
  ];
  const minRate = Math.min(...allRates) - 0.05;
  const maxRate = Math.max(...allRates) + 0.05;
  const rateRange = maxRate - minRate || 1;

  const tenorPositions = curve.tenors.map((_, i) => PAD_L + (i / (curve.tenors.length - 1)) * (W - PAD_L - PAD_R));
  const scaleY = (rate: number) => PAD_T + ((maxRate - rate) / rateRange) * (H - PAD_T - PAD_B);

  function buildPath(rates: number[]): string {
    return rates
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${tenorPositions[i].toFixed(1)},${scaleY(r).toFixed(1)}`)
      .join(' ');
  }

  const currentPath = buildPath(curve.rates);
  const prevPath = buildPath(curve.prevRates);
  const weekPath = buildPath(curve.weekAgoRates);
  const monthPath = buildPath(curve.monthAgoRates);

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = rateRange > 2 ? 0.5 : rateRange > 0.5 ? 0.1 : 0.05;
  for (let r = Math.ceil(minRate / step) * step; r <= maxRate; r += step) {
    yTicks.push(Math.round(r * 1000) / 1000);
  }

  const lines = [
    { path: monthPath, color: 'rgba(168,85,247,0.4)', label: '1M Ago', dash: '4,3' },
    { path: weekPath, color: 'rgba(59,130,246,0.5)', label: '1W Ago', dash: '3,2' },
    { path: prevPath, color: 'rgba(245,158,11,0.6)', label: 'Prev Day', dash: '2,2' },
    { path: currentPath, color: '#10b981', label: 'Current', dash: '' },
  ];

  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {ccy} {tr(t, 'srSwapCurve', 'IRS Curve')}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
        {/* Grid lines */}
        {yTicks.map((r) => (
          <g key={r}>
            <line
              x1={PAD_L}
              y1={scaleY(r)}
              x2={W - PAD_R}
              y2={scaleY(r)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,3"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(r) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={7}
              fontFamily="monospace"
            >
              {r.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis: tenor labels + grid */}
        {curve.tenors.map((tenor, i) => (
          <g key={tenor}>
            <line
              x1={tenorPositions[i]}
              y1={PAD_T}
              x2={tenorPositions[i]}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2,3"
            />
            <text
              x={tenorPositions[i]}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {tenor}
            </text>
          </g>
        ))}

        {/* Curve lines */}
        {lines.map((l) => (
          <path
            key={l.label}
            d={l.path}
            fill="none"
            stroke={l.color}
            strokeWidth={l.label === 'Current' ? 1.5 : 1}
            strokeDasharray={l.dash}
          />
        ))}

        {/* Data points on current curve */}
        {curve.rates.map((r, i) => (
          <g key={curve.tenors[i]}>
            <circle
              cx={tenorPositions[i]}
              cy={scaleY(r)}
              r={2.5}
              fill="#10b981"
              stroke="black"
              strokeWidth={0.5}
            />
            <text
              x={tenorPositions[i]}
              y={scaleY(r) - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize={6}
              fontFamily="monospace"
            >
              {r.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1">
        <LegendItem color="#10b981" label={tr(t, 'srCurrent', 'Current')} dashed={false} />
        <LegendItem color="rgba(245,158,11,0.6)" label={tr(t, 'srPrevDay', 'Prev Day')} dashed />
        <LegendItem color="rgba(59,130,246,0.5)" label={tr(t, 'sr1WAgo', '1W Ago')} dashed />
        <LegendItem color="rgba(168,85,247,0.4)" label={tr(t, 'sr1MAgo', '1M Ago')} dashed />
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'srUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── COMPARISON VIEW ──

function ComparisonView({ data, t }: { data: SwapRatesData; t: ReturnType<typeof useT> }) {
  const W = 420;
  const H = 220;
  const PAD_L = 42;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;

  // Collect all rates across all currencies
  const allRates = data.curves.flatMap((c) => c.rates);
  const minRate = Math.min(...allRates) - 0.1;
  const maxRate = Math.max(...allRates) + 0.1;
  const rateRange = maxRate - minRate || 1;

  // Use first curve's tenors for x-axis (they're all the same)
  const tenors = data.curves[0]?.tenors ?? [];
  const tenorPositions = tenors.map((_, i) => PAD_L + (i / Math.max(tenors.length - 1, 1)) * (W - PAD_L - PAD_R));
  const scaleY = (rate: number) => PAD_T + ((maxRate - rate) / rateRange) * (H - PAD_T - PAD_B);

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = rateRange > 3 ? 1 : rateRange > 1 ? 0.5 : 0.2;
  for (let r = Math.ceil(minRate / step) * step; r <= maxRate; r += step) {
    yTicks.push(Math.round(r * 100) / 100);
  }

  // Build path per currency
  const curvePaths = data.curves.map((curve) => {
    const path = curve.rates
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${tenorPositions[i].toFixed(1)},${scaleY(r).toFixed(1)}`)
      .join(' ');
    return { currency: curve.currency as Currency, path };
  });

  // Comparison table: 2Y, 5Y, 10Y
  const comparisonTenors = ['2Y', '5Y', '10Y'];

  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'srMultiCcy', 'Multi-Currency IRS Overlay')}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
        {/* Grid lines */}
        {yTicks.map((r) => (
          <g key={r}>
            <line
              x1={PAD_L}
              y1={scaleY(r)}
              x2={W - PAD_R}
              y2={scaleY(r)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,3"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(r) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={7}
              fontFamily="monospace"
            >
              {r.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {tenors.map((tenor, i) => (
          <g key={tenor}>
            <line
              x1={tenorPositions[i]}
              y1={PAD_T}
              x2={tenorPositions[i]}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2,3"
            />
            <text
              x={tenorPositions[i]}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {tenor}
            </text>
          </g>
        ))}

        {/* Currency curves */}
        {curvePaths.map((cp) => (
          <path
            key={cp.currency}
            d={cp.path}
            fill="none"
            stroke={CURRENCY_COLORS[cp.currency]}
            strokeWidth={1.2}
            opacity={0.85}
          />
        ))}

        {/* Endpoint labels */}
        {data.curves.map((curve) => {
          const lastIdx = curve.rates.length - 1;
          const lastRate = curve.rates[lastIdx];
          return (
            <text
              key={`label-${curve.currency}`}
              x={tenorPositions[lastIdx] + 4}
              y={scaleY(lastRate) + 3}
              fill={CURRENCY_COLORS[curve.currency as Currency]}
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {curve.currency}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 px-1 flex-wrap">
        {CURRENCIES.map((ccy) => (
          <LegendItem key={ccy} color={CURRENCY_COLORS[ccy]} label={ccy} dashed={false} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="mt-3 border-t border-border/20 pt-2">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
          {tr(t, 'srKeyTenors', 'Key Tenor Comparison')}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[48px_repeat(3,1fr)] gap-0 px-1 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CCY</span>
          {comparisonTenors.map((tenor) => (
            <span key={tenor} className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tenor}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {data.curves.map((curve) => (
          <div
            key={curve.currency}
            className="grid grid-cols-[48px_repeat(3,1fr)] gap-0 px-1 py-[2px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span
              className="text-[8px] font-mono font-bold"
              style={{ color: CURRENCY_COLORS[curve.currency as Currency] }}
            >
              {curve.currency}
            </span>
            {comparisonTenors.map((tenor) => {
              const idx = curve.tenors.indexOf(tenor);
              const rate = idx >= 0 ? curve.rates[idx] : null;
              return (
                <span key={tenor} className="text-[8px] font-mono font-bold text-white text-right">
                  {rate !== null ? rate.toFixed(3) : '--'}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'srUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Legend Item ──

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-3 h-[2px]"
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          borderBottom: dashed ? `1px dashed ${color}` : 'none',
        }}
      />
      <span className="text-[7px] font-mono text-neutral-500">{label}</span>
    </div>
  );
}
