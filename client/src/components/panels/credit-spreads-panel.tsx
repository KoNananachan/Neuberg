import { useMemo } from 'react';
import {
  useCreditSpreads,
  type CreditSpreadsData,
  type CreditInstrument,
  type SpreadData,
  type SpreadHistory,
  type YieldCurveData,
} from '../../api/hooks/use-credit-spreads';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtSpread(n: number): string {
  return n.toFixed(4);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(4)}`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendColor(trend: string): string {
  if (trend === 'tightening') return 'text-green-400';
  if (trend === 'widening') return 'text-red-400';
  return 'text-yellow-400';
}

function trendBg(trend: string): string {
  if (trend === 'tightening') return 'bg-green-500/10 border-green-500/30';
  if (trend === 'widening') return 'bg-red-500/10 border-red-500/30';
  return 'bg-yellow-500/10 border-yellow-500/30';
}

function sentimentStyle(sentiment: string): { text: string; bg: string } {
  if (sentiment === 'Risk On') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (sentiment === 'Risk Off') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

// ── Main Panel ──

export function CreditSpreadsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditSpreads();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'csCreditSpreadMonitor', 'Credit Spread Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <SentimentBadge sentiment={data.riskSentiment} t={t} />}
          {data && <YieldCurveBadge yieldCurve={data.yieldCurve} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'csNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <BondEtfDashboard instruments={data.instruments} t={t} />
            <SpreadChartsSection spreads={data.spreads} t={t} />
            <YieldCurveSection yieldCurve={data.yieldCurve} t={t} />
            <SummaryMetrics data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Header Badges ──

function SentimentBadge({
  sentiment,
  t,
}: {
  sentiment: string;
  t: ReturnType<typeof useT>;
}) {
  const style = sentimentStyle(sentiment);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${style.text} ${style.bg}`}>
      {sentiment === 'Risk On'
        ? tr(t, 'csRiskOn', 'Risk On')
        : sentiment === 'Risk Off'
          ? tr(t, 'csRiskOff', 'Risk Off')
          : tr(t, 'csNeutral', 'Neutral')}
    </span>
  );
}

function YieldCurveBadge({
  yieldCurve,
  t,
}: {
  yieldCurve: YieldCurveData;
  t: ReturnType<typeof useT>;
}) {
  const inverted = yieldCurve.inverted;
  return (
    <span
      className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${
        inverted
          ? 'text-red-400 bg-red-500/10 border border-red-500/30'
          : 'text-green-400 bg-green-500/10 border border-green-500/30'
      }`}
    >
      {inverted
        ? tr(t, 'csInverted', 'Curve Inverted')
        : tr(t, 'csNormal', 'Curve Normal')}
    </span>
  );
}

// ── Section 1: Bond ETF Dashboard ──

function BondEtfDashboard({
  instruments,
  t,
}: {
  instruments: CreditInstrument[];
  t: ReturnType<typeof useT>;
}) {
  // Show key ETFs: HYG, LQD, JNK, TLT, IEF, EMB, AGG
  const displaySymbols = ['HYG', 'LQD', 'JNK', 'TLT', 'IEF', 'EMB', 'AGG'];
  const display = useMemo(
    () => displaySymbols.map((s) => instruments.find((i) => i.symbol === s)).filter(Boolean) as CreditInstrument[],
    [instruments],
  );

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'csBondEtfDashboard', 'Bond ETF Dashboard')}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {display.map((inst) => (
          <BondEtfCard key={inst.symbol} instrument={inst} />
        ))}
      </div>
    </div>
  );
}

function BondEtfCard({ instrument }: { instrument: CreditInstrument }) {
  const isUp = instrument.changePct >= 0;
  const isHY = instrument.symbol === 'HYG' || instrument.symbol === 'JNK';

  return (
    <div className={`px-2 py-1.5 bg-black ${isHY ? 'border-l-2 border-l-red-500/30' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono font-bold text-white">{instrument.symbol}</span>
        {instrument.yield != null && instrument.yield > 0 && (
          <span className="text-[7px] font-mono text-red-400/70">
            {instrument.yield.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-[7px] font-mono text-neutral-600 truncate leading-tight">
        {instrument.name}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] font-mono font-bold text-white">
          ${fmtPrice(instrument.price)}
        </span>
        <span className={`text-[8px] font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {fmtPct(instrument.changePct)}
        </span>
      </div>
    </div>
  );
}

// ── Section 2: Spread Charts (SVG) ──

function SpreadChartsSection({
  spreads,
  t,
}: {
  spreads: CreditSpreadsData['spreads'];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'csSpreadTrends', 'Credit Spread Trends (6M)')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        <SpreadChart
          label={tr(t, 'csHYSpread', 'HY Spread')}
          sublabel="HYG/TLT"
          spread={spreads.hy}
        />
        <SpreadChart
          label={tr(t, 'csIGSpread', 'IG Spread')}
          sublabel="LQD/IEF"
          spread={spreads.ig}
        />
        <SpreadChart
          label={tr(t, 'csEMSpread', 'EM Spread')}
          sublabel="EMB/TLT"
          spread={spreads.em}
        />
      </div>
    </div>
  );
}

function SpreadChart({
  label,
  sublabel,
  spread,
}: {
  label: string;
  sublabel: string;
  spread: SpreadData;
}) {
  const { history, current, change5d, trend } = spread;

  // Build SVG path from history
  const W = 160;
  const H = 60;
  const PAD_X = 4;
  const PAD_Y = 8;

  const chartPath = useMemo(() => {
    if (history.length < 2) return null;

    const values = history.map((h) => h.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 0.001;

    const scaleX = (i: number) =>
      PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    // Fill area
    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    return { linePath, fillPath, lastX: scaleX(values.length - 1), lastY: scaleY(values[values.length - 1]) };
  }, [history]);

  const lineColor = trend === 'tightening' ? '#4ade80' : trend === 'widening' ? '#f87171' : '#facc15';
  const fillColor = trend === 'tightening'
    ? 'rgba(74,222,128,0.08)'
    : trend === 'widening'
      ? 'rgba(248,113,113,0.08)'
      : 'rgba(250,204,21,0.08)';

  return (
    <div className="bg-black px-2 py-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <div>
          <span className="text-[8px] font-mono font-bold text-white">{label}</span>
          <span className="text-[7px] font-mono text-neutral-600 ml-1">{sublabel}</span>
        </div>
        <span
          className={`text-[7px] font-mono font-bold px-1 py-px ${trendBg(trend)} ${trendColor(trend)}`}
        >
          {trend.toUpperCase()}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[10px] font-mono font-bold text-white">{fmtSpread(current)}</span>
        <span className={`text-[8px] font-mono font-bold ${changeColor(change5d)}`}>
          {fmtChange(change5d)} 5D
        </span>
      </div>

      {chartPath && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
          <path d={chartPath.fillPath} fill={fillColor} />
          <path d={chartPath.linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
          <circle cx={chartPath.lastX} cy={chartPath.lastY} r={2} fill={lineColor} />
        </svg>
      )}

      {!chartPath && (
        <div className="h-12 flex items-center justify-center text-[7px] font-mono text-neutral-600">
          NO HISTORY
        </div>
      )}
    </div>
  );
}

// ── Section 3: Yield Curve Snapshot ──

function YieldCurveSection({
  yieldCurve,
  t,
}: {
  yieldCurve: YieldCurveData;
  t: ReturnType<typeof useT>;
}) {
  const { threeMonth, tenYear, thirtyYear, spread2s10s, inverted } = yieldCurve;

  // Mini yield curve SVG
  const points = [
    { label: '3M', value: threeMonth, x: 20 },
    { label: '10Y', value: tenYear, x: 90 },
    { label: '30Y', value: thirtyYear, x: 160 },
  ];

  const values = points.map((p) => p.value);
  const minV = Math.min(...values) - 0.3;
  const maxV = Math.max(...values) + 0.3;
  const rangeV = maxV - minV || 1;

  const W = 180;
  const H = 55;
  const PAD_Y = 10;

  const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

  const curvePoints = points.map((p) => ({
    ...p,
    cy: scaleY(p.value),
  }));

  const pathD = curvePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.cy}`)
    .join(' ');

  const curveColor = inverted ? '#f87171' : '#4ade80';

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'csYieldCurve', 'Yield Curve Snapshot')}
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="flex gap-4">
          {/* Mini curve chart */}
          <div className="flex-1">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 50 }}>
              {/* Grid lines */}
              {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
                <line
                  key={i}
                  x1={10}
                  y1={scaleY(v)}
                  x2={170}
                  y2={scaleY(v)}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="2,3"
                />
              ))}

              {/* Curve line */}
              <path d={pathD} fill="none" stroke={curveColor} strokeWidth={2} />

              {/* Data points + labels */}
              {curvePoints.map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy={p.cy} r={3} fill={curveColor} />
                  <text
                    x={p.x}
                    y={p.cy - 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize={7}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {p.value.toFixed(2)}%
                  </text>
                  <text
                    x={p.x}
                    y={H - 1}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Yield curve metrics */}
          <div className="w-28 flex flex-col gap-1.5">
            <div>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cs3mYield', '3M Yield')}
              </div>
              <div className="text-[10px] font-mono font-bold text-white">{fmtYield(threeMonth)}</div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cs10yYield', '10Y Yield')}
              </div>
              <div className="text-[10px] font-mono font-bold text-white">{fmtYield(tenYear)}</div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cs30yYield', '30Y Yield')}
              </div>
              <div className="text-[10px] font-mono font-bold text-white">{fmtYield(thirtyYear)}</div>
            </div>
            <div>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cs3m10sSpread', '3M/10Y Spread')}
              </div>
              <div className={`text-[10px] font-mono font-bold ${inverted ? 'text-red-400' : 'text-green-400'}`}>
                {spread2s10s >= 0 ? '+' : ''}{spread2s10s.toFixed(2)}%
                {inverted && (
                  <span className="text-[7px] text-red-400/70 ml-1">
                    {tr(t, 'csInvertedLabel', 'INVERTED')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary Metrics Row ──

function SummaryMetrics({
  data,
  t,
}: {
  data: CreditSpreadsData;
  t: ReturnType<typeof useT>;
}) {
  const { spreads, yieldCurve } = data;

  const metrics = [
    {
      label: tr(t, 'csHYDirection', 'HY Spread'),
      value: spreads.hy.trend.toUpperCase(),
      color: trendColor(spreads.hy.trend),
      detail: `${fmtSpread(spreads.hy.current)} (${fmtChange(spreads.hy.change1m)} 1M)`,
    },
    {
      label: tr(t, 'csIGDirection', 'IG Spread'),
      value: spreads.ig.trend.toUpperCase(),
      color: trendColor(spreads.ig.trend),
      detail: `${fmtSpread(spreads.ig.current)} (${fmtChange(spreads.ig.change1m)} 1M)`,
    },
    {
      label: tr(t, 'csEMDirection', 'EM Spread'),
      value: spreads.em.trend.toUpperCase(),
      color: trendColor(spreads.em.trend),
      detail: `${fmtSpread(spreads.em.current)} (${fmtChange(spreads.em.change1m)} 1M)`,
    },
    {
      label: tr(t, 'csCurveShape', 'Curve Shape'),
      value: yieldCurve.inverted ? 'INVERTED' : 'NORMAL',
      color: yieldCurve.inverted ? 'text-red-400' : 'text-green-400',
      detail: `${yieldCurve.spread2s10s >= 0 ? '+' : ''}${yieldCurve.spread2s10s.toFixed(2)}% 3M/10Y`,
    },
  ];

  // Flight to quality: compare TLT vs HYG performance
  const tlt = data.instruments.find((i) => i.symbol === 'TLT');
  const hyg = data.instruments.find((i) => i.symbol === 'HYG');
  const flightToQuality =
    tlt && hyg && tlt.changePct > 0 && hyg.changePct < 0;

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'csSummary', 'Summary')}
        </span>
        {flightToQuality && (
          <span className="text-[7px] font-mono font-bold px-1 py-px bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
            {tr(t, 'csFlightToQuality', 'Flight to Quality')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[7px] font-mono text-neutral-600">{m.detail}</div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'csLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
