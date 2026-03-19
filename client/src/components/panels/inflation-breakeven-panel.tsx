import { useInflationBreakeven } from '../../api/hooks/use-inflation-breakeven';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + 'bp';
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '--';
  return s.slice(5); // MM-DD
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function beColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 3.5) return 'text-red-400';
  if (n >= 3.0) return 'text-orange-300';
  if (n >= 2.5) return 'text-orange-400';
  if (n >= 2.0) return 'text-amber-400';
  if (n >= 1.5) return 'text-yellow-400';
  return 'text-blue-400';
}

function realYieldColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#080808] border-b border-border/20">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-yellow-400">
        {title}
      </span>
    </div>
  );
}

// ── SVG Line Chart Helper ──

function SvgLineChart({
  data,
  width,
  height,
  padX,
  padY,
  padBottom,
  lineColor,
  fillColor,
  showDots,
  showLabels,
  labelKey,
}: {
  data: { value: number; label?: string }[];
  width: number;
  height: number;
  padX: number;
  padY: number;
  padBottom: number;
  lineColor: string;
  fillColor: string;
  showDots?: boolean;
  showLabels?: boolean;
  labelKey?: string;
}) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const chartW = width - padX * 2;
  const chartH = height - padY - padBottom;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + ((maxV - d.value) / range) * chartH,
    label: d.label,
    value: d.value,
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x},${height - padBottom} L ${points[0].x},${height - padBottom} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + (range * i) / yTicks);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {yTickValues.map((v, i) => {
        const y = padY + ((maxV - v) / range) * chartH;
        return (
          <g key={`grid-${i}`}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
            <text x={padX - 3} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill={fillColor} opacity={0.08} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.8} />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={1.5} fill={lineColor} opacity={0.6} />
        ))}

      {/* Current point */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={lineColor} opacity={0.9} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={1.5} fill="#000" />

      {/* Current value label */}
      <text
        x={points[points.length - 1].x - 3}
        y={points[points.length - 1].y - 6}
        textAnchor="end"
        fill={lineColor}
        fontSize={7}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {points[points.length - 1].value.toFixed(2)}
      </text>

      {/* X-axis labels */}
      {showLabels &&
        points.map((p, i) => {
          if (data.length <= 7 || i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) {
            return (
              <text key={`x-${labelKey}-${i}`} x={p.x} y={height - 3} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
                {p.label ?? ''}
              </text>
            );
          }
          return null;
        })}
    </svg>
  );
}

// ── 1. Breakeven Rates Table ──

function BreakevenRatesTable({ d }: { d: any }) {
  const rows: any[] = d?.breakevenRates ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Breakeven Rates by Maturity" />
      <div className="grid grid-cols-[48px_56px_48px_52px_52px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1D Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1W Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1M Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Z-Score</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[48px_56px_48px_52px_52px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className={`text-[8px] font-bold text-right ${beColor(row.rate)}`}>{fmtPct(row.rate)}</span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1d)}`}>{fmtBps(row.change1d)}</span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1w)}`}>{fmtBps(row.change1w)}</span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1m)}`}>{fmtBps(row.change1m)}</span>
          <span className={`text-[7px] text-right pr-1 ${(row.zScore ?? 0) > 1 ? 'text-red-400' : (row.zScore ?? 0) < -1 ? 'text-green-400' : 'text-neutral-400'}`}>
            {row.zScore != null ? ((row.zScore >= 0 ? '+' : '') + row.zScore.toFixed(2)) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 2. Breakeven Curve Chart (SVG) ──

function BreakevenCurveChart({ d }: { d: any }) {
  const rows: any[] = d?.breakevenRates ?? [];
  if (rows.length < 2) return null;

  const chartData = rows.map((r: any) => ({ value: r.rate ?? 0, label: r.tenor }));

  return (
    <div className="border-b border-border/20 px-2 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1">
        Breakeven Curve
      </div>
      <SvgLineChart
        data={chartData}
        width={300}
        height={100}
        padX={28}
        padY={8}
        padBottom={14}
        lineColor="#facc15"
        fillColor="#facc15"
        showDots
        showLabels
        labelKey="be-curve"
      />
    </div>
  );
}

// ── 3. 5Y5Y Forward Highlight Card ──

function ForwardHighlightCard({ d }: { d: any }) {
  const fwd = d?.forward5y5y;
  if (!fwd) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="5Y5Y Forward Inflation" />
      <div className="px-2 py-2">
        <div className="border border-yellow-400/30 bg-yellow-400/[0.03] p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-yellow-400" />
              <span className="text-[8px] font-black text-yellow-400 uppercase tracking-wider">
                5Y5Y FWD BREAKEVEN
              </span>
            </div>
            <span className={`text-[7px] font-bold uppercase px-1 py-0.5 ${
              fwd.signal === 'anchored' ? 'text-green-400 bg-green-400/10' :
              fwd.signal === 'de-anchoring' ? 'text-red-400 bg-red-400/10' :
              'text-amber-400 bg-amber-400/10'
            }`}>
              {fwd.signal ?? '--'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Current</div>
              <div className={`text-[12px] font-black ${beColor(fwd.rate)}`}>{fmtPct(fwd.rate)}</div>
            </div>
            <div>
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Chg 1D</div>
              <div className={`text-[10px] font-bold ${changeColor(fwd.change1d)}`}>{fmtBps(fwd.change1d)}</div>
            </div>
            <div>
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">52W High</div>
              <div className="text-[10px] font-bold text-neutral-300">{fmtPct(fwd.high52w)}</div>
            </div>
            <div>
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">52W Low</div>
              <div className="text-[10px] font-bold text-neutral-300">{fmtPct(fwd.low52w)}</div>
            </div>
          </div>

          {/* Range bar */}
          {fwd.high52w != null && fwd.low52w != null && fwd.rate != null && (
            <div className="mt-2">
              <div className="h-1 bg-neutral-900 relative">
                <div className="absolute left-0 top-0 h-full w-full bg-yellow-400/10" />
                {(() => {
                  const range = fwd.high52w - fwd.low52w;
                  const pos = range > 0 ? ((fwd.rate - fwd.low52w) / range) * 100 : 50;
                  return (
                    <div
                      className="absolute top-1/2 w-2 h-2 bg-yellow-400"
                      style={{ left: `${Math.max(0, Math.min(100, pos))}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  );
                })()}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[5px] text-neutral-600">{fmtPct(fwd.low52w)}</span>
                <span className="text-[5px] text-neutral-600">{fmtPct(fwd.high52w)}</span>
              </div>
            </div>
          )}

          {/* Fed target reference */}
          {fwd.fedTarget != null && (
            <div className="mt-1.5 flex items-center gap-1">
              <div className="w-1 h-1 bg-blue-400" />
              <span className="text-[6px] text-neutral-500 uppercase">Fed Target: {fmtPct(fwd.fedTarget)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 4. Real Yield Comparison ──

function RealYieldComparison({ d }: { d: any }) {
  const rows: any[] = d?.realYields ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Real Yield Comparison" />
      <div className="grid grid-cols-[56px_52px_52px_52px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Nominal</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">TIPS</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[56px_52px_52px_52px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.nominal)}</span>
          <span className={`text-[8px] font-bold text-right ${realYieldColor(row.tips)}`}>{fmtPct(row.tips)}</span>
          <span className={`text-[8px] font-bold text-right ${beColor(row.breakeven)}`}>{fmtPct(row.breakeven)}</span>
          <span className={`text-[8px] font-bold text-right ${realYieldColor(row.realYield)}`}>{fmtPct(row.realYield)}</span>
          <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>{fmtBps(row.change)}</span>
        </div>
      ))}
    </div>
  );
}

// ── 5. Cross-Country Comparison Table ──

function CrossCountryTable({ d }: { d: any }) {
  const rows: any[] = d?.crossCountry ?? [];
  if (rows.length === 0) return null;

  const flagMap: Record<string, string> = { US: 'US', UK: 'UK', EU: 'EU', Japan: 'JP', JP: 'JP' };

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Cross-Country Breakevens" />
      <div className="grid grid-cols-[40px_52px_48px_52px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Ctry</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">10Y BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">5Y5Y Fwd</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">CPI</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Target</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Gap</span>
      </div>
      {rows.map((row: any) => {
        const gap = row.breakeven10y != null && row.target != null ? row.breakeven10y - row.target : null;
        return (
          <div
            key={row.country}
            className="grid grid-cols-[40px_52px_48px_52px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-yellow-400">{flagMap[row.country] ?? row.country}</span>
            <span className={`text-[8px] font-bold text-right ${beColor(row.breakeven10y)}`}>{fmtPct(row.breakeven10y)}</span>
            <span className={`text-[7px] font-bold text-right ${changeColor(row.change1d)}`}>{fmtBps(row.change1d)}</span>
            <span className={`text-[8px] text-right ${beColor(row.forward5y5y)}`}>{fmtPct(row.forward5y5y)}</span>
            <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.cpiLatest)}</span>
            <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.target)}</span>
            <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(gap)}`}>
              {gap != null ? fmtChange(gap) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 6. Historical Trend Chart (30 Days) ──

function HistoricalTrendChart({ d }: { d: any }) {
  const history: any[] = d?.history ?? [];
  if (history.length < 2) return null;

  const chartData = history.map((h: any) => ({ value: h.breakeven ?? 0, label: fmtDate(h.date) }));

  // Determine trend direction
  const first = history[0]?.breakeven ?? 0;
  const last = history[history.length - 1]?.breakeven ?? 0;
  const trending = last > first ? 'up' : last < first ? 'down' : 'flat';
  const trendColor = trending === 'up' ? '#facc15' : trending === 'down' ? '#60a5fa' : '#a3a3a3';

  return (
    <div className="border-b border-border/20 px-2 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          30-Day Breakeven Trend
        </div>
        <div className="flex items-center gap-1">
          {trending === 'up' && <TrendingUp className="w-3 h-3 text-yellow-400" />}
          {trending === 'down' && <TrendingDown className="w-3 h-3 text-blue-400" />}
          <span className="text-[7px] font-bold uppercase" style={{ color: trendColor }}>
            {trending}
          </span>
        </div>
      </div>
      <SvgLineChart
        data={chartData}
        width={300}
        height={120}
        padX={28}
        padY={8}
        padBottom={16}
        lineColor={trendColor}
        fillColor={trendColor}
        showLabels
        labelKey="hist-trend"
      />
    </div>
  );
}

// ── 7. CPI / PCE Latest Prints Summary ──

function CpiPceSummary({ d }: { d: any }) {
  const cpi = d?.cpiLatest;
  const pce = d?.pceLatest;
  if (!cpi && !pce) return null;

  const items = [
    { label: 'CPI YoY', value: cpi?.yoy, prev: cpi?.prevYoy },
    { label: 'CPI MoM', value: cpi?.mom, prev: cpi?.prevMom },
    { label: 'CORE CPI YoY', value: cpi?.coreYoy, prev: cpi?.corePrevYoy },
    { label: 'PCE YoY', value: pce?.yoy, prev: pce?.prevYoy },
    { label: 'PCE MoM', value: pce?.mom, prev: pce?.prevMom },
    { label: 'CORE PCE YoY', value: pce?.coreYoy, prev: pce?.corePrevYoy },
  ].filter((i) => i.value != null);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="CPI / PCE Latest Prints" />
      <div className="grid grid-cols-3 gap-0">
        {items.map((item) => {
          const chg = item.value != null && item.prev != null ? item.value - item.prev : null;
          return (
            <div key={item.label} className="px-2 py-1.5 border-b border-r border-border/10">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{item.label}</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-[10px] font-bold ${beColor(item.value)}`}>
                  {fmtPct(item.value)}
                </span>
                {chg != null && (
                  <span className={`text-[7px] font-bold ${changeColor(chg)}`}>
                    {fmtChange(chg)}
                  </span>
                )}
              </div>
              {item.prev != null && (
                <div className="text-[6px] text-neutral-600">
                  prev: {fmtPct(item.prev)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Release dates */}
      <div className="px-2 py-1 flex gap-4">
        {cpi?.releaseDate && (
          <span className="text-[6px] text-neutral-600 uppercase">
            CPI: {cpi.releaseDate}
          </span>
        )}
        {pce?.releaseDate && (
          <span className="text-[6px] text-neutral-600 uppercase">
            PCE: {pce.releaseDate}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function InflationBreakevenPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInflationBreakeven();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'inflationBreakevenTitle', 'Inflation Breakeven Dashboard')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'inflationBreakevenNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* 1. Breakeven rates table by maturity with daily change */}
            <BreakevenRatesTable d={data} />

            {/* 2. Breakeven curve chart (SVG line) */}
            <BreakevenCurveChart d={data} />

            {/* 3. 5Y5Y forward highlight card */}
            <ForwardHighlightCard d={data} />

            {/* 4. Real yield comparison */}
            <RealYieldComparison d={data} />

            {/* 5. Cross-country comparison table (US/UK/EU/Japan) */}
            <CrossCountryTable d={data} />

            {/* 6. Historical trend chart (SVG, 30 days) */}
            <HistoricalTrendChart d={data} />

            {/* 7. CPI/PCE latest prints summary */}
            <CpiPceSummary d={data} />
          </>
        )}
      </div>
    </div>
  );
}
