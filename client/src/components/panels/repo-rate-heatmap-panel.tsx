import { useState, useMemo } from 'react';
import {
  useRepoRateHeatmap,
  type HeatmapCell,
  type SpecialRate,
  type TripartySummary,
  type FailsData,
} from '../../api/hooks/use-repo-rate-heatmap';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Tabs ──

type Tab = 'heatmap' | 'specials' | 'fails';

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtVolume(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Color helpers ──

function rateCellBg(rate: number, minRate: number, maxRate: number): string {
  if (maxRate === minRate) return 'rgba(163,230,53,0.08)';
  const t = (rate - minRate) / (maxRate - minRate);
  // 0 = green (low rate, favorable), 1 = red (high rate, expensive)
  if (t < 0.25) return 'rgba(74,222,128,0.20)';
  if (t < 0.45) return 'rgba(163,230,53,0.15)';
  if (t < 0.55) return 'rgba(250,204,21,0.12)';
  if (t < 0.75) return 'rgba(251,146,60,0.15)';
  return 'rgba(248,113,113,0.18)';
}

function rateCellText(rate: number, minRate: number, maxRate: number): string {
  if (maxRate === minRate) return '#a3e635';
  const t = (rate - minRate) / (maxRate - minRate);
  if (t < 0.25) return '#4ade80';
  if (t < 0.45) return '#a3e635';
  if (t < 0.55) return '#facc15';
  if (t < 0.75) return '#fb923c';
  return '#f87171';
}

function changeColor(n: number): string {
  if (n > 0.5) return 'text-red-400';
  if (n > 0) return 'text-orange-400/70';
  if (n < -0.5) return 'text-green-400';
  if (n < 0) return 'text-green-400/70';
  return 'text-neutral-600';
}

function efficiencyColor(pct: number): string {
  if (pct >= 99) return '#4ade80';
  if (pct >= 97) return '#a3e635';
  if (pct >= 95) return '#facc15';
  if (pct >= 90) return '#fb923c';
  return '#f87171';
}

// ── Main Panel ──

export function RepoRateHeatmapPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useRepoRateHeatmap();
  const [tab, setTab] = useState<Tab>('heatmap');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'repoHeatmapTitle', 'Repo Rate Heatmap')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['heatmap', 'specials', 'fails'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_ === 'heatmap'
              ? tr(t, 'repoTabHeatmap', 'Heatmap')
              : t_ === 'specials'
                ? tr(t, 'repoTabSpecials', 'Specials')
                : tr(t, 'repoTabFails', 'Fails')}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-lime-400/30 border-t-lime-400 animate-spin" />
              <span className="text-[9px] font-mono text-lime-400/60 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {error && !data && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
              {tr(t, 'repoError', 'Failed to load data')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono text-lime-400 hover:text-white border border-lime-400/30 px-2 py-0.5 transition-colors"
            >
              {tr(t, 'retry', 'Retry')}
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Triparty Summary — always visible */}
            <TripartySummaryRow triparty={data.triparty} t={t} />

            {tab === 'heatmap' && (
              <HeatmapMatrix
                terms={data.terms}
                collateralTypes={data.collateralTypes}
                heatmap={data.heatmap}
                t={t}
              />
            )}
            {tab === 'specials' && (
              <SpecialsTable specials={data.specials} t={t} />
            )}
            {tab === 'fails' && (
              <FailsMonitor fails={data.fails} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Triparty Summary Row ──

function TripartySummaryRow({
  triparty,
  t,
}: {
  triparty: TripartySummary;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'repoTotalVol', 'Total Volume'),
      value: fmtVolume(triparty.totalVolume),
    },
    {
      label: tr(t, 'repoAvgRate', 'Avg Rate'),
      value: `${fmtBps(triparty.avgRate)} bp`,
    },
    {
      label: tr(t, 'repoConcentration', 'Top-5 Conc.'),
      value: fmtPct(triparty.concentration),
    },
    {
      label: tr(t, 'repoClearedPct', 'Cleared'),
      value: fmtPct(triparty.clearedPct),
    },
  ];

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoTriparty', 'Triparty Summary')}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-px">
        {metrics.map((m) => (
          <div key={m.label} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heatmap Matrix ──

function HeatmapMatrix({
  terms,
  collateralTypes,
  heatmap,
  t,
}: {
  terms: string[];
  collateralTypes: string[];
  heatmap: HeatmapCell[];
  t: ReturnType<typeof useT>;
}) {
  // Build lookup: term+collateral -> cell
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of heatmap) {
      map.set(`${cell.term}|${cell.collateral}`, cell);
    }
    return map;
  }, [heatmap]);

  // Global min/max for color scaling
  const { minRate, maxRate } = useMemo(() => {
    const rates = heatmap.map((c) => c.rate).filter((r) => r > 0);
    return {
      minRate: rates.length > 0 ? Math.min(...rates) : 0,
      maxRate: rates.length > 0 ? Math.max(...rates) : 100,
    };
  }, [heatmap]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoHeatmapMatrix', 'Term x Collateral Matrix (bps)')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#050505] px-2 py-1 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-left border-b border-border/20 border-r border-border/10">
                {tr(t, 'repoTerm', 'Term')}
              </th>
              {collateralTypes.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1 text-[7px] font-mono font-black text-lime-400/70 uppercase tracking-wider text-center border-b border-border/20 border-r border-border/10 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => (
              <tr
                key={term}
                className="hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="sticky left-0 z-10 bg-black px-2 py-1 text-[8px] font-mono font-bold text-white border-b border-border/10 border-r border-border/10">
                  {term}
                </td>
                {collateralTypes.map((col) => {
                  const cell = cellMap.get(`${term}|${col}`);
                  if (!cell) {
                    return (
                      <td
                        key={col}
                        className="px-2 py-1 text-center border-b border-border/10 border-r border-border/10"
                      >
                        <span className="text-[8px] font-mono text-neutral-700">--</span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col}
                      className="px-2 py-1 text-center border-b border-border/10 border-r border-border/10"
                      style={{ backgroundColor: rateCellBg(cell.rate, minRate, maxRate) }}
                    >
                      <div
                        className="text-[9px] font-mono font-bold leading-tight"
                        style={{ color: rateCellText(cell.rate, minRate, maxRate) }}
                      >
                        {fmtBps(cell.rate)}
                      </div>
                      <div className={`text-[7px] font-mono leading-tight ${changeColor(cell.change1d)}`}>
                        {fmtChange(cell.change1d)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-3 py-1.5 border-t border-border/10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2" style={{ backgroundColor: 'rgba(74,222,128,0.20)' }} />
          <span className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'repoLegendLow', 'Low Rate')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2" style={{ backgroundColor: 'rgba(250,204,21,0.12)' }} />
          <span className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'repoLegendMid', 'Mid')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2" style={{ backgroundColor: 'rgba(248,113,113,0.18)' }} />
          <span className="text-[7px] font-mono text-neutral-600">
            {tr(t, 'repoLegendHigh', 'High Rate')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Special Collateral Rates ──

function SpecialsTable({
  specials,
  t,
}: {
  specials: SpecialRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoSpecials', 'On-the-Run UST Specials vs GC')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.8fr_0.6fr_0.6fr_0.6fr_0.6fr] px-2 py-1 border-b border-border/20 gap-1">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'repoSecurity', 'Security')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'repoCusip', 'CUSIP')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'repoSpecRate', 'Special')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'repoGcRate', 'GC')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'repoSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'repoFails', 'Fails')}
        </span>
      </div>

      {specials.length === 0 && (
        <div className="px-3 py-4 text-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'repoNoSpecials', 'No specials data')}
          </span>
        </div>
      )}

      {specials.map((s, i) => {
        const isDeep = s.spread < -50;
        const isModerate = s.spread < -10;

        return (
          <div
            key={s.cusip}
            className={`grid grid-cols-[1fr_0.8fr_0.6fr_0.6fr_0.6fr_0.6fr] px-2 py-1 border-b border-border/10 gap-1 hover:bg-lime-400/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div>
              <span className="text-[8px] font-mono font-bold text-white">{s.security}</span>
              <span className="text-[7px] font-mono text-neutral-600 ml-1">{s.maturity}</span>
            </div>
            <span className="text-[8px] font-mono text-neutral-500">{s.cusip}</span>
            <span className="text-[9px] font-mono font-bold text-lime-300 text-right">
              {fmtBps(s.specialRate)}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {fmtBps(s.gcRate)}
            </span>
            <span
              className={`text-[9px] font-mono font-bold text-right ${
                isDeep ? 'text-red-400' : isModerate ? 'text-orange-400' : 'text-neutral-400'
              }`}
            >
              {fmtChange(s.spread)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">
              {s.failsAmount > 0 ? fmtVolume(s.failsAmount) : '--'}
            </span>
          </div>
        );
      })}

      {/* Spread legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoSpreadKey', 'Spread')}:
        </span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[7px] font-mono text-neutral-600">{'< -50bp'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[7px] font-mono text-neutral-600">{'< -10bp'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-neutral-500" />
          <span className="text-[7px] font-mono text-neutral-600">{'>= -10bp'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Fails Monitor ──

function FailsMonitor({
  fails,
  t,
}: {
  fails: FailsData[];
  t: ReturnType<typeof useT>;
}) {
  // Latest entry
  const latest = fails.length > 0 ? fails[fails.length - 1] : null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoFailsMonitor', 'Settlement Fails Monitor')}
        </span>
      </div>

      {/* Summary stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-px border-b border-border/20">
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'repoDailyFails', 'Daily Fails')}
            </div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">
              {fmtVolume(latest.amount)}
            </div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'repoRollingAvg', '10D Rolling Avg')}
            </div>
            <div className="text-[10px] font-mono font-bold text-white mt-0.5">
              {fmtVolume(latest.rollingAvg)}
            </div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'repoSettleEff', 'Settle Efficiency')}
            </div>
            <div
              className="text-[10px] font-mono font-bold mt-0.5"
              style={{ color: efficiencyColor(latest.settlementEfficiency) }}
            >
              {fmtPct(latest.settlementEfficiency)}
            </div>
          </div>
        </div>
      )}

      {/* Fails bar chart */}
      {fails.length >= 2 && <FailsBarChart fails={fails} />}

      {/* Fails table */}
      <div className="px-2 py-1 border-b border-border/10">
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-1">
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
            {tr(t, 'repoDate', 'Date')}
          </span>
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
            {tr(t, 'repoAmount', 'Amount')}
          </span>
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
            {tr(t, 'repoRollAvg', 'Roll Avg')}
          </span>
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
            {tr(t, 'repoEfficiency', 'Eff %')}
          </span>
        </div>
      </div>

      {fails.length === 0 && (
        <div className="px-3 py-4 text-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'repoNoFails', 'No fails data')}
          </span>
        </div>
      )}

      {fails.map((f, i) => (
        <div
          key={f.date}
          className={`grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-2 py-1 border-b border-border/10 gap-1 hover:bg-lime-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono text-neutral-400">
            {f.date.slice(5)}
          </span>
          <span
            className={`text-[8px] font-mono font-bold text-right ${
              f.amount > f.rollingAvg * 1.5
                ? 'text-red-400'
                : f.amount > f.rollingAvg
                  ? 'text-orange-400'
                  : 'text-neutral-300'
            }`}
          >
            {fmtVolume(f.amount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {fmtVolume(f.rollingAvg)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right"
            style={{ color: efficiencyColor(f.settlementEfficiency) }}
          >
            {fmtPct(f.settlementEfficiency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Fails Bar Chart (SVG) ──

function FailsBarChart({ fails }: { fails: FailsData[] }) {
  const chart = useMemo(() => {
    if (fails.length < 2) return null;

    const W = 320;
    const H = 70;
    const PAD_L = 40;
    const PAD_R = 8;
    const PAD_T = 8;
    const PAD_B = 14;
    const CHART_W = W - PAD_L - PAD_R;
    const CHART_H = H - PAD_T - PAD_B;

    const amounts = fails.map((f) => f.amount);
    const maxAmt = Math.max(...amounts, 1);
    const barW = Math.max(CHART_W / fails.length - 1, 2);

    const scaleX = (i: number) => PAD_L + (i / fails.length) * CHART_W;
    const scaleY = (v: number) => PAD_T + CHART_H - (v / maxAmt) * CHART_H;

    // Rolling avg line
    const avgPath = fails
      .map((f, i) => `${i === 0 ? 'M' : 'L'}${(scaleX(i) + barW / 2).toFixed(1)},${scaleY(f.rollingAvg).toFixed(1)}`)
      .join(' ');

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, CHART_W, CHART_H, maxAmt, barW, scaleX, scaleY, avgPath };
  }, [fails]);

  if (!chart) return null;

  const { W, H, PAD_T, CHART_H, maxAmt, barW, scaleX, scaleY, avgPath } = chart;

  return (
    <div className="px-2 py-1 border-b border-border/10">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
        {/* Bars */}
        {fails.map((f, i) => {
          const x = scaleX(i);
          const barH = Math.max((f.amount / maxAmt) * CHART_H, 1);
          const y = PAD_T + CHART_H - barH;
          const isAboveAvg = f.amount > f.rollingAvg * 1.2;

          return (
            <rect
              key={f.date}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={isAboveAvg ? 'rgba(248,113,113,0.5)' : 'rgba(163,230,53,0.3)'}
            />
          );
        })}

        {/* Rolling average line */}
        <path d={avgPath} fill="none" stroke="#facc15" strokeWidth={1} strokeOpacity={0.7} strokeDasharray="3,2" />

        {/* Date labels (first and last) */}
        {fails.length > 0 && (
          <>
            <text
              x={scaleX(0)}
              y={H - 2}
              fill="rgba(255,255,255,0.15)"
              fontSize={5}
              fontFamily="monospace"
            >
              {fails[0].date.slice(5)}
            </text>
            <text
              x={scaleX(fails.length - 1) + barW}
              y={H - 2}
              textAnchor="end"
              fill="rgba(255,255,255,0.15)"
              fontSize={5}
              fontFamily="monospace"
            >
              {fails[fails.length - 1].date.slice(5)}
            </text>
          </>
        )}

        {/* Legend */}
        <rect x={scaleX(0)} y={H - 10} width={5} height={2} fill="rgba(163,230,53,0.4)" />
        <text x={scaleX(0) + 7} y={H - 8} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">FAILS</text>
        <line x1={scaleX(0) + 30} y1={H - 9} x2={scaleX(0) + 38} y2={H - 9} stroke="#facc15" strokeWidth={0.7} strokeDasharray="2,1" />
        <text x={scaleX(0) + 40} y={H - 8} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">10D AVG</text>
      </svg>
    </div>
  );
}
