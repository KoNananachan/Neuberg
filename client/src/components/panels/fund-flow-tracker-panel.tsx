import { useFundFlowTracker } from '../../api/hooks/use-fund-flow-tracker';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Activity, TrendingUp, TrendingDown, AlertTriangle, BarChart3, PieChart } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtB(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}T`;
  return `${sign}$${abs.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPctPlain(n: number): string {
  return n.toFixed(1) + '%';
}

// -- Color helpers --

const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const DIM = 'rgba(255,255,255,0.25)';

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return DIM;
}

function flowCls(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalBadgeCls(signal: string): string {
  const s = signal?.toUpperCase() ?? '';
  if (s === 'BULLISH' || s === 'BUY' || s === 'STRONG BUY') return 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30';
  if (s === 'BEARISH' || s === 'SELL' || s === 'STRONG SELL') return 'bg-red-400/15 text-red-400 border-red-400/30';
  if (s === 'CONTRARIAN BUY') return 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30';
  if (s === 'CONTRARIAN SELL') return 'bg-orange-400/15 text-orange-400 border-orange-400/30';
  return 'bg-neutral-400/15 text-neutral-400 border-neutral-400/30';
}

function heatColor(value: number, maxAbs: number): string {
  if (maxAbs === 0) return 'rgba(255,255,255,0.05)';
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  if (value > 0) return `rgba(52,211,153,${0.1 + intensity * 0.5})`;
  if (value < 0) return `rgba(248,113,113,${0.1 + intensity * 0.5})`;
  return 'rgba(255,255,255,0.05)';
}

// -- Section Header --

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-[#050505]">
      {icon}
      <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-emerald-400/60">
        {label}
      </span>
    </div>
  );
}

// -- 1. Asset Class Flow Summary Cards --

function AssetClassSummary({ data }: { data: any }) {
  const items = [
    { label: 'EQUITY', flow: data?.equityFlow ?? 0, aum: data?.equityAum ?? 0 },
    { label: 'FIXED INCOME', flow: data?.fixedIncomeFlow ?? 0, aum: data?.fixedIncomeAum ?? 0 },
    { label: 'MONEY MARKET', flow: data?.moneyMarketFlow ?? 0, aum: data?.moneyMarketAum ?? 0 },
    { label: 'COMMODITY', flow: data?.commodityFlow ?? 0, aum: data?.commodityAum ?? 0 },
  ];

  return (
    <div>
      <SectionHeader
        icon={<PieChart className="w-2.5 h-2.5 text-emerald-400/40" />}
        label="Asset Class Flows (Weekly)"
      />
      <div className="grid grid-cols-4 divide-x divide-border/10">
        {items.map((item) => (
          <div key={item.label} className="px-2 py-1.5">
            <div className="text-[6px] font-mono text-white/25 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className={`text-[10px] font-mono font-black ${flowCls(item.flow)}`}>
              {fmtB(item.flow)}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex-1 h-1 bg-white/[0.04] relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(Math.abs(item.flow) / (Math.abs(item.aum) || 1) * 100 * 10, 100)}%`,
                    backgroundColor: item.flow >= 0 ? GREEN : RED,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span className="text-[6px] font-mono text-white/20">
                {item.aum > 0 ? fmtPct(item.flow / item.aum * 100) : '0.00%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- 2. Regional Flow Bar Chart (SVG) --

function RegionalFlowChart({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  const maxAbs = Math.max(...items.map((r: any) => Math.abs(r.weeklyFlow ?? 0)), 0.1);
  const barHeight = 14;
  const labelWidth = 60;
  const valueWidth = 50;
  const chartWidth = 200;
  const totalWidth = labelWidth + chartWidth + valueWidth + 10;
  const totalHeight = items.length * (barHeight + 3) + 4;
  const midX = labelWidth + chartWidth / 2;

  return (
    <div>
      <SectionHeader
        icon={<BarChart3 className="w-2.5 h-2.5 text-emerald-400/40" />}
        label="Regional Flows"
      />
      <div className="px-2 py-1.5 overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full"
          style={{ minWidth: 280 }}
        >
          {/* Center line */}
          <line x1={midX} y1={0} x2={midX} y2={totalHeight} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

          {items.map((item: any, i: number) => {
            const flow = item.weeklyFlow ?? 0;
            const barW = (Math.abs(flow) / maxAbs) * (chartWidth / 2);
            const y = i * (barHeight + 3) + 2;

            return (
              <g key={`rgn-${i}`}>
                {/* Region label */}
                <text
                  x={labelWidth - 4}
                  y={y + barHeight / 2 + 1}
                  textAnchor="end"
                  fill="rgba(52,211,153,0.7)"
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {(item.region ?? '').toUpperCase()}
                </text>

                {/* Bar */}
                {flow >= 0 ? (
                  <rect
                    x={midX}
                    y={y + 1}
                    width={barW}
                    height={barHeight - 2}
                    fill={GREEN}
                    opacity={0.5}
                  />
                ) : (
                  <rect
                    x={midX - barW}
                    y={y + 1}
                    width={barW}
                    height={barHeight - 2}
                    fill={RED}
                    opacity={0.5}
                  />
                )}

                {/* Value label */}
                <text
                  x={labelWidth + chartWidth + 6}
                  y={y + barHeight / 2 + 1}
                  textAnchor="start"
                  fill={flowColor(flow)}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {fmtB(flow)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// -- 3. ETF vs Mutual Fund Comparison --

function EtfVsMutualFund({ data }: { data: any }) {
  const etf = data?.etf;
  const mf = data?.mutualFund;
  if (!etf && !mf) return null;

  const rows = [
    { label: 'WEEKLY FLOW', etfVal: etf?.weeklyFlow ?? 0, mfVal: mf?.weeklyFlow ?? 0, isFlow: true },
    { label: 'MONTHLY FLOW', etfVal: etf?.monthlyFlow ?? 0, mfVal: mf?.monthlyFlow ?? 0, isFlow: true },
    { label: 'YTD FLOW', etfVal: etf?.ytdFlow ?? 0, mfVal: mf?.ytdFlow ?? 0, isFlow: true },
    { label: 'TOTAL AUM', etfVal: etf?.aum ?? 0, mfVal: mf?.aum ?? 0, isFlow: false },
    { label: 'MARKET SHARE', etfVal: etf?.marketShare ?? 0, mfVal: mf?.marketShare ?? 0, isPct: true },
  ];

  return (
    <div>
      <SectionHeader
        icon={<Activity className="w-2.5 h-2.5 text-emerald-400/40" />}
        label="ETF vs Mutual Fund"
      />
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-left">
                Metric
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-emerald-400/50 text-right">
                ETF
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-blue-400/50 text-right">
                Mutual Fund
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-right">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = row.etfVal - row.mfVal;
              return (
                <tr key={row.label} className="border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/40">
                    {row.label}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: row.isFlow ? flowColor(row.etfVal) : GREEN }}>
                    {row.isPct ? fmtPctPlain(row.etfVal) : fmtB(row.etfVal)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: row.isFlow ? flowColor(row.mfVal) : '#60a5fa' }}>
                    {row.isPct ? fmtPctPlain(row.mfVal) : fmtB(row.mfVal)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(delta) }}>
                    {row.isPct ? fmtPct(delta) : fmtB(delta)}
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

// -- 4. Top Inflows / Outflows with Flow Bars --

function TopFlowsList({ items, direction }: { items: any[]; direction: 'inflow' | 'outflow' }) {
  const isInflow = direction === 'inflow';
  const rows = (items ?? []).slice(0, 10);
  const maxAbs = Math.max(...rows.map((r: any) => Math.abs(r.flow ?? r.weeklyFlow ?? 0)), 0.1);

  return (
    <div>
      <SectionHeader
        icon={isInflow
          ? <TrendingUp className="w-2.5 h-2.5 text-emerald-400/40" />
          : <TrendingDown className="w-2.5 h-2.5 text-red-400/40" />
        }
        label={isInflow ? 'Top Inflows' : 'Top Outflows'}
      />
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-left">
                Name
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-left">
                Ticker
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-right">
                Flow
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 w-20">
                Bar
              </th>
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-right">
                % AUM
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => {
              const flow = row.flow ?? row.weeklyFlow ?? 0;
              const pctAum = row.flowPctAum ?? row.pctAum ?? 0;
              const barPct = (Math.abs(flow) / maxAbs) * 100;

              return (
                <tr key={`tf-${i}`} className="border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/50 truncate max-w-[100px]">
                    {row.name}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-emerald-400">
                    {row.ticker}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(flow) }}>
                    {fmtB(flow)}
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="w-full h-[5px] bg-white/[0.03] relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: isInflow ? GREEN : RED,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right" style={{ color: flowColor(pctAum) }}>
                    {fmtPct(pctAum)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- 5. Historical Flow Chart (SVG Line/Area, 12 weeks) --

function HistoricalFlowChart({ data }: { data: any }) {
  const weeks = data?.weeks ?? data?.history ?? [];
  if (!weeks || weeks.length === 0) return null;

  const W = 320;
  const H = 100;
  const padL = 35;
  const padR = 8;
  const padT = 8;
  const padB = 16;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const equityFlows = weeks.map((w: any) => w.equityFlow ?? 0);
  const bondFlows = weeks.map((w: any) => w.bondFlow ?? w.fixedIncomeFlow ?? 0);
  const totalFlows = weeks.map((w: any) => w.totalFlow ?? (w.equityFlow ?? 0) + (w.bondFlow ?? w.fixedIncomeFlow ?? 0));

  const allVals = [...equityFlows, ...bondFlows, ...totalFlows];
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, -1);
  const range = maxVal - minVal || 1;

  const n = weeks.length;
  const dx = n > 1 ? chartW / (n - 1) : chartW;

  function toY(v: number): number {
    return padT + chartH - ((v - minVal) / range) * chartH;
  }

  function toX(i: number): number {
    return padL + i * dx;
  }

  const zeroY = toY(0);

  function makePath(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  }

  function makeArea(values: number[]): string {
    const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    return `${line} L${toX(values.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${toX(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
  }

  // Y-axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minVal + (range / tickCount) * i);

  return (
    <div>
      <SectionHeader
        icon={<Activity className="w-2.5 h-2.5 text-emerald-400/40" />}
        label="Historical Flows (12 Weeks)"
      />
      <div className="px-2 py-1.5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 260 }}>
          {/* Grid lines */}
          {ticks.map((tick, i) => {
            const y = toY(tick);
            return (
              <g key={`tick-${i}`}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
                <text x={padL - 3} y={y + 1} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">
                  {tick >= 0 ? '+' : ''}{tick.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Zero line */}
          <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} strokeDasharray="2,2" />

          {/* Total flow area */}
          <path d={makeArea(totalFlows)} fill="rgba(52,211,153,0.06)" />
          <path d={makePath(totalFlows)} fill="none" stroke={GREEN} strokeWidth={1} opacity={0.6} />

          {/* Equity flow line */}
          <path d={makePath(equityFlows)} fill="none" stroke="#60a5fa" strokeWidth={0.8} opacity={0.7} strokeDasharray="3,2" />

          {/* Bond flow line */}
          <path d={makePath(bondFlows)} fill="none" stroke={YELLOW} strokeWidth={0.8} opacity={0.7} strokeDasharray="1,1" />

          {/* Data points for total */}
          {totalFlows.map((v: number, i: number) => (
            <circle key={`pt-${i}`} cx={toX(i)} cy={toY(v)} r={1.5} fill={flowColor(v)} opacity={0.8} />
          ))}

          {/* X-axis labels */}
          {weeks.map((w: any, i: number) => {
            if (n <= 6 || i % 2 === 0 || i === n - 1) {
              const label = w.label ?? w.week ?? `W${i + 1}`;
              return (
                <text
                  key={`xl-${i}`}
                  x={toX(i)}
                  y={H - 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.2)"
                  fontSize={4.5}
                  fontFamily="monospace"
                >
                  {label}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-[2px]" style={{ backgroundColor: GREEN }} />
            <span className="text-[6px] font-mono text-white/30 uppercase">Total</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-[2px]" style={{ backgroundColor: '#60a5fa' }} />
            <span className="text-[6px] font-mono text-white/30 uppercase">Equity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-[2px]" style={{ backgroundColor: YELLOW }} />
            <span className="text-[6px] font-mono text-white/30 uppercase">Bond</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- 6. Sector Rotation Heatmap/Grid --

function SectorRotationHeatmap({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  const periods = ['1W', '1M', '3M', 'YTD'];
  const allFlows = items.flatMap((s: any) => [
    s.flow1w ?? 0,
    s.flow1m ?? 0,
    s.flow3m ?? 0,
    s.flowYtd ?? 0,
  ]);
  const maxAbs = Math.max(...allFlows.map(Math.abs), 0.1);

  function getFlow(sector: any, period: string): number {
    switch (period) {
      case '1W': return sector.flow1w ?? sector.weeklyFlow ?? 0;
      case '1M': return sector.flow1m ?? sector.monthlyFlow ?? 0;
      case '3M': return sector.flow3m ?? 0;
      case 'YTD': return sector.flowYtd ?? sector.ytdFlow ?? 0;
      default: return 0;
    }
  }

  return (
    <div>
      <SectionHeader
        icon={<BarChart3 className="w-2.5 h-2.5 text-emerald-400/40" />}
        label="Sector Rotation Heatmap"
      />
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-left">
                Sector
              </th>
              {periods.map((p) => (
                <th key={p} className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-center w-14">
                  {p}
                </th>
              ))}
              <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 text-center">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((sector: any, i: number) => {
              const trend = sector.trend ?? sector.momentum ?? 0;
              const trendIcon = trend > 0 ? '\u25B2' : trend < 0 ? '\u25BC' : '\u25C6';

              return (
                <tr key={`sr-${i}`} className="border-b border-border/10">
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-emerald-400 text-[7px]">
                    {(sector.sector ?? sector.name ?? '').toUpperCase()}
                  </td>
                  {periods.map((p) => {
                    const flow = getFlow(sector, p);
                    return (
                      <td key={p} className="px-0.5 py-0.5 text-center">
                        <div
                          className="mx-auto px-1 py-0.5 text-[7px] font-mono font-bold"
                          style={{
                            backgroundColor: heatColor(flow, maxAbs),
                            color: flow > 0 ? GREEN : flow < 0 ? RED : 'rgba(255,255,255,0.3)',
                          }}
                        >
                          {fmtB(flow)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1.5 py-1 text-center">
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: trend > 0 ? GREEN : trend < 0 ? RED : DIM }}
                    >
                      {trendIcon}
                    </span>
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

// -- 7. Contrarian Signal Indicators --

function ContrarianSignals({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader
        icon={<AlertTriangle className="w-2.5 h-2.5 text-yellow-400/40" />}
        label="Contrarian Signals"
      />
      <div className="grid grid-cols-1 gap-0">
        {items.map((sig: any, i: number) => {
          const strength = sig.strength ?? sig.score ?? 50;
          const strengthPct = Math.min(100, Math.max(0, strength));
          const strengthColor = strengthPct >= 70 ? RED : strengthPct >= 40 ? YELLOW : GREEN;

          return (
            <div
              key={`cs-${i}`}
              className="px-2 py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase">
                  {sig.name ?? sig.signal ?? sig.indicator}
                </span>
                <span className={`text-[7px] font-bold px-1.5 py-0.5 border ${signalBadgeCls(sig.signal ?? sig.implication ?? 'neutral')}`}>
                  {(sig.signal ?? sig.implication ?? 'NEUTRAL').toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Reading */}
                <div className="flex items-center gap-1">
                  <span className="text-[6px] font-mono text-white/20 uppercase">Reading:</span>
                  <span className="text-[7px] font-mono font-bold text-white/60">
                    {typeof sig.reading === 'number' ? sig.reading.toFixed(1) : sig.reading ?? '-'}
                  </span>
                </div>

                {/* Strength gauge */}
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[6px] font-mono text-white/20 uppercase">Str:</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] relative overflow-hidden max-w-[60px]">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{
                        width: `${strengthPct}%`,
                        backgroundColor: strengthColor,
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[6px] font-mono text-white/30">{strengthPct.toFixed(0)}</span>
                </div>

                {/* Percentile */}
                {sig.percentile != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] font-mono text-white/20 uppercase">%ile:</span>
                    <span className="text-[7px] font-mono font-bold text-white/40">
                      {fmtPctPlain(sig.percentile)}
                    </span>
                  </div>
                )}

                {/* Hit Rate */}
                {sig.hitRate != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] font-mono text-white/20 uppercase">Hit:</span>
                    <span className="text-[7px] font-mono font-bold text-white/40">
                      {fmtPctPlain(sig.hitRate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {sig.description && (
                <div className="text-[6px] font-mono text-white/15 mt-0.5 truncate">
                  {sig.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Main Panel --

export function FundFlowTrackerPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFundFlowTracker();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono uppercase">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'fundFlowTrackerTitle', 'Fund Flow Tracker')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {!d && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-white/20 uppercase tracking-widest">
              {tr(t, 'noData', 'No data available')}
            </span>
          </div>
        )}

        {d && (
          <>
            {/* 1. Asset Class Summary Cards */}
            <AssetClassSummary data={d.assetClassSummary ?? d.summary ?? d} />

            {/* 2. Regional Flow Bar Chart (SVG) */}
            <RegionalFlowChart items={d.regionalFlows ?? d.geoFlows ?? []} />

            {/* 3. ETF vs Mutual Fund */}
            <EtfVsMutualFund data={d.etfVsMutualFund ?? d.vehicleComparison ?? d} />

            {/* 4. Top Inflows */}
            <TopFlowsList items={d.topInflows ?? []} direction="inflow" />

            {/* 5. Top Outflows */}
            <TopFlowsList items={d.topOutflows ?? []} direction="outflow" />

            {/* 6. Historical Flow Chart (SVG) */}
            <HistoricalFlowChart data={d.historicalFlows ?? d} />

            {/* 7. Sector Rotation Heatmap */}
            <SectorRotationHeatmap items={d.sectorRotation ?? d.sectorFlows ?? []} />

            {/* 8. Contrarian Signals */}
            <ContrarianSignals items={d.contrarianSignals ?? []} />

            {/* Footer */}
            {d.timestamp && (
              <div className="px-3 py-1 border-t border-border/10">
                <span className="text-[7px] font-mono text-white/15 normal-case">
                  Last update: {new Date(d.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
