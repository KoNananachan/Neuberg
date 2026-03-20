import { useLiquidityStressTest } from '../../api/hooks/use-liquidity-stress-test';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Local types (do NOT import from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiquidityStressTestData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiquidityBucket = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PositionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StressScenario = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedemptionRow = any;

// ── Constants ──

const ACCENT = '#fb923c'; // orange-400

const BUCKET_COLORS: Record<string, string> = {
  'T+0': '#22c55e',
  'T+1': '#34d399',
  'T+3': '#facc15',
  'T+7': '#fb923c',
  'T+30': '#f87171',
  'T+90': '#ef4444',
  '>T+90': '#991b1b',
};

// ── Color helpers ──

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#34d399';
  if (score >= 40) return '#facc15';
  if (score >= 20) return '#fb923c';
  return '#ef4444';
}

function impactColor(impact: number): string {
  if (impact <= 0.5) return '#22c55e';
  if (impact <= 1.0) return '#34d399';
  if (impact <= 2.0) return '#facc15';
  if (impact <= 5.0) return '#fb923c';
  return '#ef4444';
}

function spreadColor(spread: number): string {
  if (spread <= 5) return '#22c55e';
  if (spread <= 15) return '#34d399';
  if (spread <= 30) return '#facc15';
  if (spread <= 60) return '#fb923c';
  return '#ef4444';
}

function daysColor(days: number): string {
  if (days <= 1) return '#22c55e';
  if (days <= 3) return '#34d399';
  if (days <= 7) return '#facc15';
  if (days <= 30) return '#fb923c';
  return '#ef4444';
}

function fmtMv(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Main Panel ──

export function LiquidityStressTestPanel() {
  const t = useT();
  const { data, isLoading, error } = useLiquidityStressTest();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="10" stroke={ACCENT} strokeWidth="1.2" fill="none" opacity="0.7" />
            <line x1="4" y1="6" x2="4" y2="10" stroke={ACCENT} strokeWidth="1.5" opacity="0.9" />
            <line x1="7" y1="5" x2="7" y2="10" stroke={ACCENT} strokeWidth="1.5" opacity="0.7" />
            <line x1="10" y1="7" x2="10" y2="10" stroke={ACCENT} strokeWidth="1.5" opacity="0.5" />
            <line x1="13" y1="8" x2="13" y2="10" stroke={ACCENT} strokeWidth="1.5" opacity="0.3" />
          </svg>
          <span
            className="text-[9px] font-black uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'panelLiquidityStressTest', 'Liquidity Stress Test')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="p-0.5 text-white/30 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-center h-full text-[10px] text-red-400/60 uppercase">
            {tr(t, 'lqaError', 'Failed to load data')}
          </div>
        ) : data ? (
          <>
            <SummaryCards data={data} />
            <LiquidityBuckets data={data} />
            <PositionTable data={data} />
            <StressScenarios data={data} />
            <RedemptionWaterfall data={data} />
            <HistoricalSparkline data={data} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'lqaNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 1. Summary Cards ──

function SummaryCards({ data }: { data: LiquidityStressTestData }) {
  const cards = [
    {
      label: 'AUM',
      value: fmtMv(data?.summary?.aum ?? 0),
      color: 'rgba(255,255,255,0.7)',
    },
    {
      label: 'LIQUID %',
      value: fmtPct(data?.summary?.liquidPct ?? 0),
      color: (data?.summary?.liquidPct ?? 0) >= 70 ? '#22c55e' : (data?.summary?.liquidPct ?? 0) >= 40 ? '#facc15' : '#ef4444',
    },
    {
      label: 'DAYS TO LIQ',
      value: (data?.summary?.daysToLiquidate ?? 0).toFixed(1),
      color: daysColor(data?.summary?.daysToLiquidate ?? 999),
    },
    {
      label: 'LCR',
      value: (data?.summary?.lcr ?? 0).toFixed(2),
      color: (data?.summary?.lcr ?? 0) >= 1.0 ? '#22c55e' : '#ef4444',
    },
    {
      label: 'LIQ SCORE',
      value: String(data?.summary?.liquidityScore ?? 0),
      color: scoreColor(data?.summary?.liquidityScore ?? 0),
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-5 divide-x divide-border/10">
        {cards.map((card) => (
          <div key={card.label} className="px-2 py-1.5 text-center">
            <div className="text-[5px] text-white/25 uppercase tracking-wider mb-0.5">{card.label}</div>
            <div className="text-[11px] font-black" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Liquidity Buckets (Horizontal Stacked Bar) ──

function LiquidityBuckets({ data }: { data: LiquidityStressTestData }) {
  const buckets: LiquidityBucket[] = data?.buckets ?? [];
  if (buckets.length === 0) return null;

  const total = buckets.reduce((s: number, b: LiquidityBucket) => s + (b?.pct ?? 0), 0);

  const W = 340;
  const H = 42;
  const BAR_Y = 4;
  const BAR_H = 14;
  const BAR_X = 8;
  const BAR_W = W - 16;

  let cumX = BAR_X;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1">
        <span className="text-[6px] text-orange-400/60 uppercase tracking-wider font-bold">
          LIQUIDITY BUCKETS
        </span>
      </div>
      <div className="px-2 py-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 42 }}>
          {/* Stacked bar */}
          {buckets.map((bucket: LiquidityBucket) => {
            const pct = bucket?.pct ?? 0;
            const segW = Math.max(0, (pct / (total || 1)) * BAR_W);
            const x = cumX;
            cumX += segW;
            const label = bucket?.label ?? '';
            const color = BUCKET_COLORS[label] ?? '#525252';

            return (
              <g key={label}>
                <rect x={x} y={BAR_Y} width={segW} height={BAR_H} fill={color} opacity={0.7} />
                {segW > 24 && (
                  <text
                    x={x + segW / 2}
                    y={BAR_Y + BAR_H / 2 + 1.5}
                    textAnchor="middle"
                    fill="#000"
                    fontSize={5}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {pct.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Border */}
          <rect x={BAR_X} y={BAR_Y} width={BAR_W} height={BAR_H} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />

          {/* Legend row */}
          {(() => {
            let lx = BAR_X;
            return buckets.map((bucket: LiquidityBucket) => {
              const label = bucket?.label ?? '';
              const color = BUCKET_COLORS[label] ?? '#525252';
              const x = lx;
              lx += 48;
              return (
                <g key={`leg-${label}`}>
                  <rect x={x} y={BAR_Y + BAR_H + 6} width={5} height={4} fill={color} opacity={0.7} />
                  <text
                    x={x + 7}
                    y={BAR_Y + BAR_H + 10}
                    fill="rgba(255,255,255,0.35)"
                    fontSize={5}
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            });
          })()}
        </svg>
      </div>
    </div>
  );
}

// ── 3. Position Table ──

function PositionTable({ data }: { data: LiquidityStressTestData }) {
  const positions: PositionRow[] = data?.positions ?? [];
  if (positions.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1 pb-0.5">
        <span className="text-[6px] text-orange-400/60 uppercase tracking-wider font-bold">
          POSITION LIQUIDITY
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/10 text-[5px] text-white/20 uppercase gap-0.5">
        <span className="w-[40px] shrink-0">TICKER</span>
        <span className="w-[48px] text-right shrink-0">MKT VAL</span>
        <span className="w-[36px] text-right shrink-0">ADV</span>
        <span className="w-[28px] text-right shrink-0">DAYS</span>
        <span className="w-[32px] text-right shrink-0">SPRD</span>
        <span className="w-[32px] text-right shrink-0">IMPACT</span>
        <span className="w-[24px] text-right shrink-0">SCORE</span>
      </div>

      {/* Rows (scrollable) */}
      <div className="max-h-[160px] overflow-y-auto no-scrollbar">
        {positions.map((pos: PositionRow, i: number) => {
          const score = pos?.score ?? 0;
          return (
            <div
              key={pos?.ticker ?? i}
              className="flex items-center py-0.5 px-1 border-b border-border/[0.04] text-[7px] gap-0.5 hover:bg-orange-400/[0.02]"
            >
              <span className="w-[40px] shrink-0 font-bold text-white/60">{pos?.ticker ?? '--'}</span>
              <span className="w-[48px] text-right shrink-0 text-white/45">{fmtMv(pos?.marketValue ?? 0)}</span>
              <span className="w-[36px] text-right shrink-0 text-white/40">{fmtMv(pos?.adv ?? 0)}</span>
              <span
                className="w-[28px] text-right shrink-0 font-bold"
                style={{ color: daysColor(pos?.daysToLiquidate ?? 999) }}
              >
                {(pos?.daysToLiquidate ?? 0).toFixed(1)}
              </span>
              <span
                className="w-[32px] text-right shrink-0"
                style={{ color: spreadColor(pos?.spread ?? 0) }}
              >
                {(pos?.spread ?? 0).toFixed(1)}bp
              </span>
              <span
                className="w-[32px] text-right shrink-0"
                style={{ color: impactColor(pos?.impact ?? 0) }}
              >
                {(pos?.impact ?? 0).toFixed(2)}%
              </span>
              <span
                className="w-[24px] text-right shrink-0 font-black text-[6px] px-0.5"
                style={{
                  color: scoreColor(score),
                  backgroundColor: `${scoreColor(score)}15`,
                }}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. Stress Scenarios ──

function StressScenarios({ data }: { data: LiquidityStressTestData }) {
  const scenarios: StressScenario[] = data?.stressScenarios ?? [];
  if (scenarios.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1 pb-0.5">
        <span className="text-[6px] text-orange-400/60 uppercase tracking-wider font-bold">
          STRESS SCENARIOS
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/10 text-[5px] text-white/20 uppercase gap-0.5">
        <span className="w-[72px] shrink-0">SCENARIO</span>
        <span className="w-[40px] text-right shrink-0">IMPACT X</span>
        <span className="w-[48px] text-right shrink-0">SPRD WIDE</span>
        <span className="w-[48px] text-right shrink-0">LIQ COST</span>
        <span className="w-[32px] text-right shrink-0">SCORE</span>
      </div>

      {scenarios.map((sc: StressScenario, i: number) => {
        const scScore = sc?.score ?? 0;
        return (
          <div
            key={sc?.name ?? i}
            className="flex items-center py-0.5 px-1 border-b border-border/[0.04] text-[7px] gap-0.5 hover:bg-orange-400/[0.02]"
          >
            <span className="w-[72px] shrink-0 text-white/50 truncate text-[6px]">{sc?.name ?? '--'}</span>
            <span
              className="w-[40px] text-right shrink-0 font-bold"
              style={{ color: (sc?.impactMultiplier ?? 1) > 2 ? '#ef4444' : (sc?.impactMultiplier ?? 1) > 1.5 ? '#fb923c' : '#facc15' }}
            >
              {(sc?.impactMultiplier ?? 1).toFixed(1)}x
            </span>
            <span
              className="w-[48px] text-right shrink-0"
              style={{ color: (sc?.spreadWidening ?? 0) > 200 ? '#ef4444' : (sc?.spreadWidening ?? 0) > 100 ? '#fb923c' : '#facc15' }}
            >
              +{(sc?.spreadWidening ?? 0).toFixed(0)}bp
            </span>
            <span
              className="w-[48px] text-right shrink-0 font-bold"
              style={{ color: (sc?.liquidationCost ?? 0) > 5 ? '#ef4444' : (sc?.liquidationCost ?? 0) > 2 ? '#fb923c' : '#facc15' }}
            >
              {(sc?.liquidationCost ?? 0).toFixed(2)}%
            </span>
            <span
              className="w-[32px] text-right shrink-0 font-black text-[6px] px-0.5"
              style={{
                color: scoreColor(scScore),
                backgroundColor: `${scoreColor(scScore)}15`,
              }}
            >
              {scScore}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Redemption Waterfall ──

function RedemptionWaterfall({ data }: { data: LiquidityStressTestData }) {
  const normal: RedemptionRow[] = data?.redemptionWaterfall?.normal ?? [];
  const stressed: RedemptionRow[] = data?.redemptionWaterfall?.stressed ?? [];
  if (normal.length === 0 && stressed.length === 0) return null;

  const horizons = normal.length > 0 ? normal : stressed;

  const W = 340;
  const ROW_H = 14;
  const PAD_LEFT = 38;
  const PAD_RIGHT = 8;
  const BAR_W = (W - PAD_LEFT - PAD_RIGHT - 8) / 2;
  const H = horizons.length * ROW_H + 22;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 pt-1 pb-0.5">
        <span className="text-[6px] text-orange-400/60 uppercase tracking-wider font-bold">
          REDEMPTION WATERFALL
        </span>
      </div>
      <div className="px-2 py-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
          {/* Column headers */}
          <text
            x={PAD_LEFT + BAR_W / 2}
            y={8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={5}
            fontFamily="monospace"
            fontWeight="bold"
          >
            NORMAL
          </text>
          <text
            x={PAD_LEFT + BAR_W + 8 + BAR_W / 2}
            y={8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={5}
            fontFamily="monospace"
            fontWeight="bold"
          >
            STRESSED
          </text>

          {horizons.map((_: RedemptionRow, i: number) => {
            const y = i * ROW_H + 14;
            const nRow = normal[i];
            const sRow = stressed[i];
            const nPct = nRow?.pctLiquidatable ?? 0;
            const sPct = sRow?.pctLiquidatable ?? 0;
            const label = nRow?.horizon ?? sRow?.horizon ?? '';

            return (
              <g key={label}>
                {/* Row label */}
                <text
                  x={PAD_LEFT - 4}
                  y={y + ROW_H / 2 + 1.5}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.35)"
                  fontSize={5.5}
                  fontFamily="monospace"
                >
                  {label}
                </text>

                {/* Normal bar */}
                <rect
                  x={PAD_LEFT}
                  y={y + 2}
                  width={BAR_W}
                  height={ROW_H - 4}
                  fill="rgba(255,255,255,0.02)"
                />
                <rect
                  x={PAD_LEFT}
                  y={y + 2}
                  width={(nPct / 100) * BAR_W}
                  height={ROW_H - 4}
                  fill="#22c55e"
                  opacity={0.5}
                />
                <text
                  x={PAD_LEFT + (nPct / 100) * BAR_W + 3}
                  y={y + ROW_H / 2 + 1.5}
                  fill="#22c55e"
                  fontSize={5.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {nPct.toFixed(0)}%
                </text>

                {/* Stressed bar */}
                <rect
                  x={PAD_LEFT + BAR_W + 8}
                  y={y + 2}
                  width={BAR_W}
                  height={ROW_H - 4}
                  fill="rgba(255,255,255,0.02)"
                />
                <rect
                  x={PAD_LEFT + BAR_W + 8}
                  y={y + 2}
                  width={(sPct / 100) * BAR_W}
                  height={ROW_H - 4}
                  fill="#ef4444"
                  opacity={0.5}
                />
                <text
                  x={PAD_LEFT + BAR_W + 8 + (sPct / 100) * BAR_W + 3}
                  y={y + ROW_H / 2 + 1.5}
                  fill="#ef4444"
                  fontSize={5.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {sPct.toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── 6. Historical Liquidity Score (30-day text sparkline) ──

function HistoricalSparkline({ data }: { data: LiquidityStressTestData }) {
  const history: number[] = data?.historicalScores ?? [];
  if (history.length === 0) return null;

  // Text sparkline using block characters
  const blocks = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const maxVal = Math.max(...history, 1);
  const minVal = Math.min(...history, 0);
  const range = maxVal - minVal || 1;

  const sparkline = history.map((v: number) => {
    const idx = Math.round(((v - minVal) / range) * (blocks.length - 1));
    return blocks[Math.min(idx, blocks.length - 1)];
  }).join('');

  const latest = history[history.length - 1] ?? 0;
  const first = history[0] ?? 0;
  const delta = latest - first;

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[6px] text-orange-400/60 uppercase tracking-wider font-bold">
          30D LIQUIDITY SCORE
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-bold" style={{ color: scoreColor(latest) }}>
            {latest}
          </span>
          <span
            className="text-[6px] font-bold"
            style={{ color: delta >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
          </span>
        </div>
      </div>
      <div
        className="text-[10px] leading-none tracking-[0.5px]"
        style={{ color: scoreColor(latest), opacity: 0.7 }}
      >
        {sparkline}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[5px] text-white/15">30D AGO</span>
        <span className="text-[5px] text-white/15">NOW</span>
      </div>
    </div>
  );
}
