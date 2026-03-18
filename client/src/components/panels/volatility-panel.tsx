import { useVolatility, useStockVolatility, type VolatilityData, type StockVolData } from '../../api/hooks/use-volatility';
import { useT } from '../../i18n';
import { Zap, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export function VolatilityPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useVolatility();
  const { data: stockVol } = useStockVolatility();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {t('panelVolatility')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-orange-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('volNoData')}
          </div>
        )}

        {data && (
          <>
            <VixDashboard data={data} />
            <TermStructureChart data={data} />
            <HVvsIVComparison data={data} />
            <VolETFTable data={data} />
            {stockVol && <StockVolSection data={stockVol} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── VIX Dashboard ──

function VixDashboard({ data }: { data: VolatilityData }) {
  const t = useT();
  const isUp = data.vixChange >= 0;

  // VIX percentile color
  const pctColor = data.vixPercentile > 70
    ? 'text-red-400'
    : data.vixPercentile > 40
      ? 'text-yellow-400'
      : 'text-emerald-400';

  const pctBarColor = data.vixPercentile > 70
    ? 'bg-red-500'
    : data.vixPercentile > 40
      ? 'bg-yellow-500'
      : 'bg-emerald-500';

  // Current VIX position in 252-day range
  const range = data.vixHigh252 - data.vixLow252;
  const positionPct = range > 0 ? ((data.vix - data.vixLow252) / range) * 100 : 50;

  return (
    <div className="border-b border-border/20">
      {/* Main VIX value */}
      <div className="px-3 py-3 flex items-start justify-between">
        <div>
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">CBOE VIX</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[28px] font-black font-mono text-white leading-none">
              {data.vix.toFixed(2)}
            </span>
            <div className="flex items-center gap-0.5">
              {isUp ? (
                <TrendingUp className="w-3 h-3 text-red-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-emerald-400" />
              )}
              <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
                {isUp ? '+' : ''}{data.vixChange.toFixed(2)} ({isUp ? '+' : ''}{data.vixChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Contango/Backwardation badge */}
        <div className={`px-2 py-1 rounded text-[8px] font-black font-mono uppercase tracking-wider ${
          data.isContango
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {data.isContango ? t('volContango') : t('volBackwardation')}
        </div>
      </div>

      {/* Percentile + Range */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-3">
        {/* VIX Percentile */}
        <div>
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
            {t('volPercentile')} (252D)
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 bg-white/[0.03] rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all ${pctBarColor}`}
                style={{ width: `${data.vixPercentile}%` }}
              />
            </div>
            <span className={`text-[11px] font-mono font-black ${pctColor}`}>
              {data.vixPercentile}%
            </span>
          </div>
        </div>

        {/* 252-day Range */}
        <div>
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
            252D Range
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral/50">{data.vixLow252.toFixed(1)}</span>
            <div className="flex-1 h-3 bg-white/[0.03] rounded-sm relative overflow-hidden">
              <div
                className="absolute top-0 h-full w-1.5 bg-orange-400 rounded-sm"
                style={{ left: `calc(${Math.min(Math.max(positionPct, 2), 98)}% - 3px)` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral/50">{data.vixHigh252.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Term Structure Chart ──

function TermStructureChart({ data }: { data: VolatilityData }) {
  const t = useT();
  const { termStructure } = data;

  if (termStructure.length < 2) return null;

  const W = 300;
  const H = 110;
  const PAD_X = 35;
  const PAD_Y = 15;
  const PAD_BOTTOM = 20;

  const values = termStructure.map((p) => p.value);
  const minY = Math.min(...values) - 1;
  const maxY = Math.max(...values) + 1;

  const scaleX = (i: number) => PAD_X + (i / (termStructure.length - 1)) * (W - PAD_X * 2);
  const scaleY = (v: number) => PAD_Y + ((maxY - v) / (maxY - minY)) * (H - PAD_Y - PAD_BOTTOM);

  const points = termStructure.map((p, i) => ({ x: scaleX(i), y: scaleY(p.value), ...p }));
  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Gradient: green for contango (upward), red for backwardation (downward)
  const lineColor = data.isContango ? '#34d399' : '#f87171';

  // Y-axis ticks
  const yStep = (maxY - minY) > 4 ? 2 : 1;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
    yTicks.push(v);
  }

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {t('volTermStructure')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 130 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_X} y1={scaleY(v)} x2={W - PAD_X} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
            />
            <text
              x={PAD_X - 4} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x},${H - PAD_BOTTOM} L ${points[0].x},${H - PAD_BOTTOM} Z`}
          fill={data.isContango ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'}
        />

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* Data points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={lineColor} />
            <circle cx={p.x} cy={p.y} r={2} fill="#000" />
            {/* Value label */}
            <text
              x={p.x} y={p.y - 7}
              textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7} fontFamily="monospace" fontWeight="bold"
            >
              {p.value.toFixed(1)}
            </text>
            {/* Tenor label */}
            <text
              x={p.x} y={H - 5}
              textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={7} fontFamily="monospace"
            >
              {p.tenor}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── HV vs IV Comparison ──

function HVvsIVComparison({ data }: { data: VolatilityData }) {
  const t = useT();

  const bars = [
    { label: t('volHV20'), value: data.hv20, color: '#60a5fa' },
    { label: t('volHV60'), value: data.hv60, color: '#818cf8' },
    { label: t('volHV252'), value: data.hv252, color: '#a78bfa' },
    { label: t('volImplied'), value: data.vix, color: '#fb923c' },
  ];

  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  // IV premium/discount relative to HV20
  const ivDiff = data.vix - data.hv20;
  const ivLabel = ivDiff > 0 ? 'IV Premium' : 'IV Discount';
  const ivColor = ivDiff > 0 ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40">
          {t('volHistorical')} vs {t('volImplied')}
        </div>
        {data.hv20 > 0 && (
          <span className={`text-[8px] font-mono font-bold ${ivColor}`}>
            {ivLabel}: {ivDiff > 0 ? '+' : ''}{ivDiff.toFixed(1)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral/50 w-14 text-right shrink-0">{bar.label}</span>
            <div className="flex-1 h-4 bg-white/[0.03] rounded-sm overflow-hidden relative">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${Math.max((bar.value / maxVal) * 100, 2)}%`,
                  backgroundColor: bar.color,
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-white w-10 text-right shrink-0">
              {bar.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Volatility ETFs Table ──

function VolETFTable({ data }: { data: VolatilityData }) {
  const t = useT();

  if (data.etfs.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-1.5">
          {t('volETFs')}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>{t('symbol')}</span>
        <span className="text-right">{t('price')}</span>
        <span className="text-right">{t('moversChange')}</span>
      </div>
      {data.etfs.map((etf) => (
        <div
          key={etf.symbol}
          className="grid grid-cols-[1fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors"
        >
          <div>
            <div className="text-[10px] font-mono font-bold text-white">{etf.symbol}</div>
            <div className="text-[7px] font-mono text-neutral/30 truncate">{etf.name}</div>
          </div>
          <span className="text-[10px] font-mono text-white text-right self-center">
            ${etf.price.toFixed(2)}
          </span>
          <span
            className={`text-[10px] font-mono font-bold text-right self-center ${
              etf.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Selected Stock Volatility ──

function StockVolSection({ data }: { data: StockVolData }) {
  const t = useT();

  const bars = [
    { label: t('volHV20'), value: data.hv20, color: '#60a5fa' },
    { label: t('volHV60'), value: data.hv60, color: '#818cf8' },
    { label: t('volHV252'), value: data.hv252, color: '#a78bfa' },
  ];

  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {data.symbol} {t('volHistorical')}
      </div>

      {/* HV bars */}
      <div className="space-y-1.5 mb-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral/50 w-14 text-right shrink-0">{bar.label}</span>
            <div className="flex-1 h-4 bg-white/[0.03] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${Math.max((bar.value / maxVal) * 100, 2)}%`,
                  backgroundColor: bar.color,
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-white w-10 text-right shrink-0">
              {bar.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Rolling HV mini chart */}
      {data.hvSeries.length > 2 && <RollingHVChart series={data.hvSeries} />}
    </div>
  );
}

// ── Rolling HV Mini Chart ──

function RollingHVChart({ series }: { series: Array<{ timestamp: number; hv20: number }> }) {
  const t = useT();

  const W = 280;
  const H = 70;
  const PAD_X = 30;
  const PAD_Y = 10;
  const PAD_BOTTOM = 10;

  const values = series.map((s) => s.hv20);
  const minY = Math.max(Math.min(...values) - 2, 0);
  const maxY = Math.max(...values) + 2;

  const scaleX = (i: number) => PAD_X + (i / (series.length - 1)) * (W - PAD_X * 2);
  const scaleY = (v: number) => PAD_Y + ((maxY - v) / (maxY - minY)) * (H - PAD_Y - PAD_BOTTOM);

  const pathD = series.map((s, i) => {
    const x = scaleX(i);
    const y = scaleY(s.hv20);
    return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
  }).join(' ');

  const areaD = `${pathD} L ${scaleX(series.length - 1)},${H - PAD_BOTTOM} L ${scaleX(0)},${H - PAD_BOTTOM} Z`;

  // Y-axis ticks
  const yStep = (maxY - minY) > 20 ? 10 : 5;
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
    yTicks.push(v);
  }

  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider mb-1">
        {t('volHV20')} Rolling (60D)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 80 }}>
        {/* Grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_X} y1={scaleY(v)} x2={W - PAD_X} y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)" strokeDasharray="2,2"
            />
            <text
              x={PAD_X - 3} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Area + line */}
        <path d={areaD} fill="rgba(96,165,250,0.08)" />
        <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth={1.5} opacity={0.7} />
      </svg>
    </div>
  );
}
