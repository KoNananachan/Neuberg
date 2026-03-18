import { useMemo } from 'react';
import { useDurationManagement } from '../../api/hooks/use-duration-management';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Local types (hook does not export types) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DurationManagementData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyMetrics = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyRateDuration = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Position = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScenarioResult = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectorBreakdown = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HedgingRecommendation = any;

// ── Constants ──

const ACCENT = '#38bdf8'; // sky-400

const KRD_BUCKETS = ['2Y', '5Y', '10Y', '20Y', '30Y'] as const;

const SCENARIO_SHIFTS = ['-100bp', '-50bp', '-25bp', '+25bp', '+50bp', '+100bp'] as const;

// ── Helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}bp`;
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '' : '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function impactColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-600';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function DurationManagementPanel() {
  const t = useT();
  const { data, isLoading, error } = useDurationManagement();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'panelDurationManagement', 'Duration Management')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.metrics && (
            <span className="text-[7px] font-mono text-neutral-600">
              {tr(t, 'durAsOf', 'As of')} {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '-'}
            </span>
          )}
          <div className="p-1 text-neutral-500">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'durError', 'Failed to load duration data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <KeyMetricsCards data={data} t={t} />
            <KeyRateDurationChart data={data} t={t} />
            <PositionTable data={data} t={t} />
            <ScenarioAnalysis data={data} t={t} />
            <SectorBreakdownSection data={data} t={t} />
            <HedgingRecommendations data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Key Metrics Cards ──

function KeyMetricsCards({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const metrics = data?.metrics;
  const benchmark = data?.benchmark;

  const cards = [
    {
      label: tr(t, 'durEffectiveDuration', 'Eff. Duration'),
      value: fmtNum(metrics?.effectiveDuration, 3),
      bench: benchmark?.effectiveDuration != null ? fmtNum(benchmark.effectiveDuration, 3) : null,
      diff: metrics?.effectiveDuration != null && benchmark?.effectiveDuration != null
        ? metrics.effectiveDuration - benchmark.effectiveDuration
        : null,
      unit: 'yrs',
    },
    {
      label: tr(t, 'durConvexity', 'Convexity'),
      value: fmtNum(metrics?.convexity, 3),
      bench: benchmark?.convexity != null ? fmtNum(benchmark.convexity, 3) : null,
      diff: metrics?.convexity != null && benchmark?.convexity != null
        ? metrics.convexity - benchmark.convexity
        : null,
      unit: '',
    },
    {
      label: tr(t, 'durDV01', 'DV01'),
      value: fmtDollar(metrics?.dv01),
      bench: benchmark?.dv01 != null ? fmtDollar(benchmark.dv01) : null,
      diff: null,
      unit: '',
    },
    {
      label: tr(t, 'durPortfolioYield', 'Portfolio Yield'),
      value: metrics?.portfolioYield != null ? `${metrics.portfolioYield.toFixed(2)}%` : '-',
      bench: benchmark?.portfolioYield != null ? `${benchmark.portfolioYield.toFixed(2)}%` : null,
      diff: metrics?.portfolioYield != null && benchmark?.portfolioYield != null
        ? (metrics.portfolioYield - benchmark.portfolioYield) * 100
        : null,
      unit: 'bp',
    },
    {
      label: tr(t, 'durModifiedDuration', 'Mod. Duration'),
      value: fmtNum(metrics?.modifiedDuration, 3),
      bench: benchmark?.modifiedDuration != null ? fmtNum(benchmark.modifiedDuration, 3) : null,
      diff: metrics?.modifiedDuration != null && benchmark?.modifiedDuration != null
        ? metrics.modifiedDuration - benchmark.modifiedDuration
        : null,
      unit: 'yrs',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durKeyMetrics', 'Key Metrics vs Benchmark')}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {cards.map((c) => (
          <div key={c.label} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
              {c.label}
            </div>
            <div className="text-[13px] font-mono font-black text-white mt-0.5 leading-tight">
              {c.value}
            </div>
            {c.bench && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[7px] font-mono text-neutral-600">BM: {c.bench}</span>
                {c.diff != null && (
                  <span className={`text-[7px] font-mono font-bold ${changeColor(c.diff)}`}>
                    {c.diff > 0 ? '+' : ''}{c.unit === 'bp' ? `${c.diff.toFixed(0)}${c.unit}` : c.diff.toFixed(3)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 2: Key Rate Duration Bar Chart ──

function KeyRateDurationChart({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const krdData = data?.keyRateDurations as KeyRateDuration[] | undefined;
  const benchmarkKrd = data?.benchmarkKeyRateDurations as KeyRateDuration[] | undefined;

  const chart = useMemo(() => {
    if (!krdData?.length) return null;

    const W = 360;
    const H = 120;
    const PAD_L = 35;
    const PAD_R = 10;
    const PAD_T = 14;
    const PAD_B = 22;

    const allValues: number[] = [];
    for (const d of krdData) allValues.push(d.value ?? 0);
    if (benchmarkKrd) {
      for (const d of benchmarkKrd) allValues.push(d.value ?? 0);
    }

    const maxVal = Math.max(...allValues, 0.01);
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal || 1;

    const bucketCount = krdData.length;
    const barGroupWidth = (W - PAD_L - PAD_R) / bucketCount;
    const barWidth = benchmarkKrd ? barGroupWidth * 0.35 : barGroupWidth * 0.6;
    const gap = benchmarkKrd ? barGroupWidth * 0.05 : 0;

    const zeroY = PAD_T + ((maxVal - 0) / range) * (H - PAD_T - PAD_B);
    const scaleY = (v: number) => PAD_T + ((maxVal - v) / range) * (H - PAD_T - PAD_B);

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, maxVal, minVal, barGroupWidth, barWidth, gap, zeroY, scaleY, bucketCount };
  }, [krdData, benchmarkKrd]);

  if (!chart || !krdData?.length) return null;

  const { W, H, PAD_L, PAD_B, barGroupWidth, barWidth, gap, zeroY, scaleY } = chart;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durKeyRateDuration', 'Key Rate Duration')}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-1.5 bg-sky-400" />
            <span className="text-[7px] font-mono text-neutral-500">
              {tr(t, 'durPortfolio', 'Portfolio')}
            </span>
          </div>
          {benchmarkKrd && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-1.5 bg-neutral-600" />
              <span className="text-[7px] font-mono text-neutral-500">
                {tr(t, 'durBenchmark', 'Benchmark')}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="px-3 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 130 }}>
          {/* Zero line */}
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={W - chart.PAD_R}
            y2={zeroY}
            stroke="rgba(255,255,255,0.1)"
          />

          {/* Grid lines */}
          {[chart.maxVal, chart.maxVal * 0.5, chart.minVal * 0.5, chart.minVal].filter(Boolean).map((v, i) => (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={scaleY(v)}
                x2={W - chart.PAD_R}
                y2={scaleY(v)}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 3}
                y={scaleY(v) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Portfolio bars */}
          {krdData.map((d: KeyRateDuration, i: number) => {
            const x = PAD_L + i * barGroupWidth + (barGroupWidth - (benchmarkKrd ? barWidth * 2 + gap : barWidth)) / 2;
            const val = d.value ?? 0;
            const barY = val >= 0 ? scaleY(val) : zeroY;
            const barH = Math.abs(scaleY(val) - zeroY);
            return (
              <g key={`p-${i}`}>
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={Math.max(barH, 0.5)}
                  fill={ACCENT}
                  opacity={0.85}
                />
                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={val >= 0 ? barY - 2 : barY + barH + 8}
                  textAnchor="middle"
                  fill={ACCENT}
                  fontSize={6.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Benchmark bars */}
          {benchmarkKrd?.map((d: KeyRateDuration, i: number) => {
            const x = PAD_L + i * barGroupWidth + (barGroupWidth - barWidth * 2 - gap) / 2 + barWidth + gap;
            const val = d.value ?? 0;
            const barY = val >= 0 ? scaleY(val) : zeroY;
            const barH = Math.abs(scaleY(val) - zeroY);
            return (
              <rect
                key={`b-${i}`}
                x={x}
                y={barY}
                width={barWidth}
                height={Math.max(barH, 0.5)}
                fill="rgba(255,255,255,0.2)"
              />
            );
          })}

          {/* X-axis labels */}
          {krdData.map((d: KeyRateDuration, i: number) => (
            <text
              key={`label-${i}`}
              x={PAD_L + i * barGroupWidth + barGroupWidth / 2}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={8}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {d.bucket ?? KRD_BUCKETS[i] ?? `${i}`}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Section 3: Position Table ──

function PositionTable({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const positions = data?.positions as Position[] | undefined;

  if (!positions?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durPositions', 'Position Details')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'durBond', 'Bond')}</span>
        <span className="text-right">{tr(t, 'durCoupon', 'Coupon')}</span>
        <span className="text-right">{tr(t, 'durMaturity', 'Mat.')}</span>
        <span className="text-right">{tr(t, 'durDuration', 'Duration')}</span>
        <span className="text-right">{tr(t, 'durConvexityShort', 'Cvx')}</span>
        <span className="text-right">{tr(t, 'durWeight', 'Wt%')}</span>
        <span className="text-right">{tr(t, 'durContrib', 'Contrib')}</span>
      </div>

      {/* Scrollable rows */}
      <div className="max-h-[180px] overflow-auto no-scrollbar">
        {positions.map((pos: Position, i: number) => (
          <div
            key={pos?.id ?? i}
            className={`grid grid-cols-[1.4fr_0.6fr_0.6fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="truncate">
              <div className="text-[9px] font-mono font-bold text-white truncate">{pos?.name ?? pos?.symbol ?? '-'}</div>
              <div className="text-[7px] font-mono text-neutral-600 truncate">{pos?.issuer ?? pos?.sector ?? ''}</div>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right self-center">
              {pos?.coupon != null ? `${pos.coupon.toFixed(2)}%` : '-'}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right self-center">
              {pos?.maturityDate ?? pos?.maturity ?? '-'}
            </span>
            <span className="text-[9px] font-mono font-bold text-sky-300 text-right self-center">
              {fmtNum(pos?.duration, 3)}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right self-center">
              {fmtNum(pos?.convexity, 2)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right self-center">
              {pos?.weight != null ? `${pos.weight.toFixed(1)}` : '-'}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(pos?.contribution)}`}>
              {fmtNum(pos?.contribution, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Scenario Analysis ──

function ScenarioAnalysis({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const scenarios = data?.scenarios as ScenarioResult[] | undefined;

  if (!scenarios?.length) return null;

  // Build a grid: rows = instruments/portfolio, cols = yield shifts
  const shifts = scenarios[0]?.shifts ?? SCENARIO_SHIFTS;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durScenarioAnalysis', 'Scenario Analysis — Price Impact')}
        </span>
      </div>

      {/* Header row */}
      <div
        className="grid px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider"
        style={{ gridTemplateColumns: `1.2fr repeat(${shifts.length}, 1fr)` }}
      >
        <span>{tr(t, 'durScenario', 'Yield Shift')}</span>
        {shifts.map((s: string) => (
          <span key={s} className="text-right">{s}</span>
        ))}
      </div>

      {/* Data rows */}
      {scenarios.map((row: ScenarioResult, i: number) => (
        <div
          key={row?.name ?? i}
          className={`grid px-3 py-1 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
          style={{ gridTemplateColumns: `1.2fr repeat(${shifts.length}, 1fr)` }}
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">{row?.name ?? '-'}</span>
          {(row?.impacts ?? []).map((impact: number | null, j: number) => (
            <span
              key={j}
              className={`text-[9px] font-mono font-bold text-right ${impactColor(impact)}`}
            >
              {impact != null ? fmtPct(impact, 2) : '-'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Section 5: Sector Breakdown ──

function SectorBreakdownSection({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const sectors = data?.sectorBreakdown as SectorBreakdown[] | undefined;

  const chart = useMemo(() => {
    if (!sectors?.length) return null;

    const maxContrib = Math.max(...sectors.map((s: SectorBreakdown) => Math.abs(s?.durationContribution ?? 0)), 0.01);
    return { maxContrib };
  }, [sectors]);

  if (!sectors?.length || !chart) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durSectorBreakdown', 'Duration Contribution by Sector')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_2fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'durSector', 'Sector')}</span>
        <span className="text-right">{tr(t, 'durWeight', 'Wt%')}</span>
        <span className="text-right">{tr(t, 'durContrib', 'Contrib')}</span>
        <span className="pl-3">{tr(t, 'durBar', '')}</span>
      </div>

      {sectors.map((sec: SectorBreakdown, i: number) => {
        const contrib = sec?.durationContribution ?? 0;
        const barPct = Math.abs(contrib) / chart.maxContrib * 100;
        const isPositive = contrib >= 0;

        return (
          <div
            key={sec?.name ?? i}
            className={`grid grid-cols-[1.2fr_0.6fr_0.6fr_2fr] px-3 py-1 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{sec?.name ?? '-'}</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {sec?.weight != null ? `${sec.weight.toFixed(1)}` : '-'}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(contrib)}`}>
              {fmtNum(contrib, 3)}
            </span>
            <div className="pl-3 flex items-center">
              <div className="flex-1 h-2 bg-white/[0.03] relative">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    backgroundColor: isPositive ? ACCENT : '#ef4444',
                    opacity: 0.6,
                    left: 0,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 6: Hedging Recommendations ──

function HedgingRecommendations({
  data,
  t,
}: {
  data: DurationManagementData;
  t: ReturnType<typeof useT>;
}) {
  const recommendations = data?.hedgingRecommendations as HedgingRecommendation[] | undefined;

  if (!recommendations?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'durHedging', 'Hedging Recommendations')}
        </span>
        {data?.targetDuration != null && (
          <span className="text-[7px] font-mono text-sky-400/70">
            {tr(t, 'durTarget', 'Target')}: {fmtNum(data.targetDuration, 2)} yrs
          </span>
        )}
      </div>

      {recommendations.map((rec: HedgingRecommendation, i: number) => {
        const action = (rec?.action ?? '').toUpperCase();
        const isBuy = action === 'BUY' || action === 'LONG';

        return (
          <div
            key={rec?.id ?? i}
            className={`px-3 py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1 py-px text-[7px] font-black font-mono uppercase tracking-wider border ${
                    isBuy
                      ? 'text-green-400 bg-green-500/10 border-green-500/30'
                      : 'text-red-400 bg-red-500/10 border-red-500/30'
                  }`}
                >
                  {action || '-'}
                </span>
                <span className="text-[9px] font-mono font-bold text-white">
                  {rec?.instrument ?? '-'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {rec?.notional != null && (
                  <span className="text-[8px] font-mono text-neutral-400">
                    {fmtDollar(rec.notional)}
                  </span>
                )}
                {rec?.durationImpact != null && (
                  <span className={`text-[8px] font-mono font-bold ${changeColor(rec.durationImpact)}`}>
                    {rec.durationImpact > 0 ? '+' : ''}{rec.durationImpact.toFixed(3)} dur
                  </span>
                )}
              </div>
            </div>
            {rec?.rationale && (
              <div className="text-[7px] font-mono text-neutral-600 mt-0.5 leading-tight">
                {rec.rationale}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary line */}
      {data?.hedgingSummary && (
        <div className="px-3 py-1.5 bg-[#030303] border-b border-border/10">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'durNetImpact', 'Net Duration Impact')}
            </span>
            <span className={`text-[9px] font-mono font-bold ${changeColor(data.hedgingSummary.netDurationChange)}`}>
              {fmtNum(data.hedgingSummary.netDurationChange, 3)} yrs
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'durResultingDuration', 'Resulting Duration')}
            </span>
            <span className="text-[9px] font-mono font-bold text-sky-400">
              {fmtNum(data.hedgingSummary.resultingDuration, 3)} yrs
            </span>
          </div>
          {data.hedgingSummary?.estimatedCost != null && (
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'durEstCost', 'Est. Hedge Cost')}
              </span>
              <span className="text-[9px] font-mono text-neutral-400">
                {fmtDollar(data.hedgingSummary.estimatedCost)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
