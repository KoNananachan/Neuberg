import { useState } from 'react';
import {
  useLiquidityCoverage,
  type LCRBank,
  type HQLABreakdown,
  type NSFREntry,
  type CashFlowBucket,
  type LiquidityCoverageData,
} from '../../api/hooks/use-liquidity-coverage';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const SKY = '#38bdf8';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const ORANGE = '#fb923c';

// ── Formatting helpers ──

function fmtBn(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (abs >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtRatio(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function lcrColor(ratio: number, min: number): string {
  if (ratio >= min + 30) return GREEN;
  if (ratio >= min + 10) return SKY;
  if (ratio >= min) return YELLOW;
  return RED;
}

function nsfrColor(ratio: number): string {
  if (ratio >= 120) return GREEN;
  if (ratio >= 105) return SKY;
  if (ratio >= 100) return YELLOW;
  return RED;
}

function trendArrow(trend: string): { arrow: string; color: string } {
  switch (trend) {
    case 'improving': return { arrow: '\u2191', color: GREEN };
    case 'deteriorating': return { arrow: '\u2193', color: RED };
    default: return { arrow: '\u2192', color: 'rgba(255,255,255,0.3)' };
  }
}

function netColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function statusBadge(status: LiquidityCoverageData['systemStatus']): { text: string; color: string; bg: string } {
  switch (status) {
    case 'adequate': return { text: 'ADEQUATE', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'watch': return { text: 'WATCH', color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'stressed': return { text: 'STRESSED', color: RED, bg: 'rgba(248,113,113,0.15)' };
  }
}

// ── Tabs ──

type TabKey = 'lcr' | 'hqla' | 'nsfr' | 'cashflow';

const TABS: Array<{ key: TabKey; label: string; i18nKey: string }> = [
  { key: 'lcr', label: 'LCR', i18nKey: 'lcLcrTab' },
  { key: 'hqla', label: 'HQLA', i18nKey: 'lcHqlaTab' },
  { key: 'nsfr', label: 'NSFR', i18nKey: 'lcNsfrTab' },
  { key: 'cashflow', label: 'CASH FLOW', i18nKey: 'lcCashFlowTab' },
];

// ── LCR Summary Table ──

function LCRSummaryTable({ banks, t }: { banks: LCRBank[]; t: ReturnType<typeof useT> }) {
  const sorted = [...banks].sort((a, b) => a.lcrRatio - b.lcrRatio);

  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[60px] shrink-0">BANK</span>
        <span className="w-[32px] shrink-0">TICKER</span>
        <span className="w-[36px] text-right shrink-0">HQLA</span>
        <span className="w-[40px] text-right shrink-0">OUTFLOWS</span>
        <span className="w-[32px] text-right shrink-0">LCR</span>
        <span className="w-[28px] text-right shrink-0">MIN</span>
        <span className="w-[28px] text-right shrink-0">BUF</span>
        <span className="w-[16px] text-center shrink-0">
          {tr(t, 'lcTrend', 'TRD')}
        </span>
      </div>

      {sorted.map(bank => {
        const color = lcrColor(bank.lcrRatio, bank.lcrMin);
        const trend = trendArrow(bank.trend);

        return (
          <div
            key={bank.ticker}
            className="flex items-center py-0.5 px-1 border-b border-border/20 text-[7px] font-mono gap-1 hover:bg-sky-400/[0.02] transition-colors"
          >
            <span className="w-[60px] text-white/40 truncate shrink-0 text-[6px]">{bank.name}</span>
            <span className="w-[32px] font-bold text-white/60 shrink-0">{bank.ticker}</span>
            <span className="w-[36px] text-right text-white/50 shrink-0">{fmtBn(bank.hqla)}</span>
            <span className="w-[40px] text-right text-white/50 shrink-0">{fmtBn(bank.totalOutflows)}</span>
            <span className="w-[32px] text-right font-bold shrink-0" style={{ color }}>
              {fmtRatio(bank.lcrRatio)}
            </span>
            <span className="w-[28px] text-right text-white/25 shrink-0">{fmtRatio(bank.lcrMin)}</span>
            <span
              className="w-[28px] text-right font-bold shrink-0"
              style={{ color: bank.buffer >= 20 ? GREEN : bank.buffer >= 5 ? YELLOW : RED }}
            >
              +{bank.buffer.toFixed(0)}
            </span>
            <span className="w-[16px] text-center font-bold shrink-0" style={{ color: trend.color }}>
              {trend.arrow}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── HQLA Breakdown Table ──

function HQLABreakdownTable({ breakdown }: { breakdown: HQLABreakdown[] }) {
  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[56px] shrink-0">BANK</span>
        <span className="w-[36px] text-right shrink-0">L1</span>
        <span className="w-[24px] text-right shrink-0">%</span>
        <span className="w-[36px] text-right shrink-0">L2A</span>
        <span className="w-[24px] text-right shrink-0">%</span>
        <span className="w-[36px] text-right shrink-0">L2B</span>
        <span className="w-[24px] text-right shrink-0">%</span>
        <span className="w-[36px] text-right shrink-0">TOTAL</span>
      </div>

      {breakdown.map(row => (
        <div
          key={row.bank}
          className="flex items-center py-0.5 px-1 border-b border-border/20 text-[7px] font-mono gap-1 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[56px] text-white/40 truncate shrink-0 text-[6px]">{row.bank}</span>
          <span className="w-[36px] text-right text-white/50 shrink-0">{fmtBn(row.level1)}</span>
          <span className="w-[24px] text-right shrink-0" style={{ color: SKY }}>{row.level1Pct.toFixed(0)}%</span>
          <span className="w-[36px] text-right text-white/50 shrink-0">{fmtBn(row.level2a)}</span>
          <span className="w-[24px] text-right shrink-0 text-white/35">{row.level2aPct.toFixed(0)}%</span>
          <span className="w-[36px] text-right text-white/50 shrink-0">{fmtBn(row.level2b)}</span>
          <span className="w-[24px] text-right shrink-0 text-white/25">{row.level2bPct.toFixed(0)}%</span>
          <span className="w-[36px] text-right font-bold text-white/60 shrink-0">{fmtBn(row.totalHqla)}</span>
        </div>
      ))}

      {/* Composition bar per bank */}
      <div className="px-1 pt-1.5 pb-1">
        {breakdown.map(row => (
          <div key={`bar-${row.bank}`} className="flex items-center gap-1 mb-1">
            <span className="w-[40px] text-[5px] font-mono text-white/25 truncate shrink-0">{row.bank}</span>
            <div className="flex-1 h-2 flex overflow-hidden bg-white/[0.02]">
              <div
                style={{ width: `${row.level1Pct}%`, backgroundColor: SKY, opacity: 0.7 }}
                className="h-full"
              />
              <div
                style={{ width: `${row.level2aPct}%`, backgroundColor: SKY, opacity: 0.4 }}
                className="h-full"
              />
              <div
                style={{ width: `${row.level2bPct}%`, backgroundColor: SKY, opacity: 0.2 }}
                className="h-full"
              />
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5" style={{ backgroundColor: SKY, opacity: 0.7 }} />
            <span className="text-[5px] font-mono text-white/20">L1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5" style={{ backgroundColor: SKY, opacity: 0.4 }} />
            <span className="text-[5px] font-mono text-white/20">L2A</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5" style={{ backgroundColor: SKY, opacity: 0.2 }} />
            <span className="text-[5px] font-mono text-white/20">L2B</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NSFR Summary Table ──

function NSFRSummaryTable({ entries }: { entries: NSFREntry[] }) {
  const sorted = [...entries].sort((a, b) => a.nsfrRatio - b.nsfrRatio);

  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[56px] shrink-0">BANK</span>
        <span className="w-[32px] shrink-0">TICKER</span>
        <span className="w-[44px] text-right shrink-0">ASF</span>
        <span className="w-[44px] text-right shrink-0">RSF</span>
        <span className="w-[36px] text-right shrink-0">NSFR</span>
        <span className="w-[16px] text-center shrink-0">TRD</span>
      </div>

      {sorted.map(entry => {
        const color = nsfrColor(entry.nsfrRatio);
        const trend = trendArrow(entry.trend);

        return (
          <div
            key={entry.ticker}
            className="flex items-center py-0.5 px-1 border-b border-border/20 text-[7px] font-mono gap-1 hover:bg-sky-400/[0.02] transition-colors"
          >
            <span className="w-[56px] text-white/40 truncate shrink-0 text-[6px]">{entry.bank}</span>
            <span className="w-[32px] font-bold text-white/60 shrink-0">{entry.ticker}</span>
            <span className="w-[44px] text-right text-white/50 shrink-0">{fmtBn(entry.availableStableFunding)}</span>
            <span className="w-[44px] text-right text-white/50 shrink-0">{fmtBn(entry.requiredStableFunding)}</span>
            <span className="w-[36px] text-right font-bold shrink-0" style={{ color }}>
              {fmtRatio(entry.nsfrRatio)}
            </span>
            <span className="w-[16px] text-center font-bold shrink-0" style={{ color: trend.color }}>
              {trend.arrow}
            </span>
          </div>
        );
      })}

      {/* NSFR Bar Chart */}
      <div className="px-1 pt-1.5 pb-1">
        {sorted.map(entry => {
          const color = nsfrColor(entry.nsfrRatio);
          const barW = Math.min(entry.nsfrRatio / 150 * 100, 100);
          const minLine = 100 / 150 * 100;

          return (
            <div key={`bar-${entry.ticker}`} className="flex items-center gap-1 mb-1">
              <span className="w-[28px] text-[5px] font-mono text-white/25 shrink-0">{entry.ticker}</span>
              <div className="flex-1 h-2 bg-white/[0.02] relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{ width: `${barW}%`, backgroundColor: color, opacity: 0.5 }}
                />
                {/* 100% minimum line */}
                <div
                  className="absolute top-0 h-full w-px bg-white/20"
                  style={{ left: `${minLine}%` }}
                />
              </div>
              <span className="w-[28px] text-[6px] font-mono font-bold text-right shrink-0" style={{ color }}>
                {entry.nsfrRatio.toFixed(0)}%
              </span>
            </div>
          );
        })}
        <div className="text-[5px] font-mono text-white/15 mt-0.5 text-right">
          | = 100% minimum
        </div>
      </div>
    </div>
  );
}

// ── Cash Flow Ladder Table ──

function CashFlowLadderTable({ buckets, t }: { buckets: CashFlowBucket[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="px-1">
      {/* Base scenario header */}
      <div className="px-1 py-0.5">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">
          {tr(t, 'lcBaseScenario', 'Base Scenario')}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[44px] shrink-0">BUCKET</span>
        <span className="w-[36px] text-right shrink-0">INFLOW</span>
        <span className="w-[40px] text-right shrink-0">OUTFLOW</span>
        <span className="w-[36px] text-right shrink-0">NET</span>
        <span className="w-[40px] text-right shrink-0">CUMUL</span>
      </div>

      {buckets.map(bucket => (
        <div
          key={bucket.bucket}
          className="flex items-center py-0.5 px-1 border-b border-border/20 text-[7px] font-mono gap-1 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[44px] text-white/40 shrink-0 text-[6px]">{bucket.bucket}</span>
          <span className="w-[36px] text-right shrink-0" style={{ color: GREEN }}>{fmtBn(bucket.inflows)}</span>
          <span className="w-[40px] text-right shrink-0" style={{ color: RED }}>{fmtBn(bucket.outflows)}</span>
          <span className="w-[36px] text-right font-bold shrink-0" style={{ color: netColor(bucket.net) }}>
            {bucket.net >= 0 ? '+' : ''}{fmtBn(bucket.net)}
          </span>
          <span className="w-[40px] text-right font-bold shrink-0" style={{ color: netColor(bucket.cumulative) }}>
            {fmtBn(bucket.cumulative)}
          </span>
        </div>
      ))}

      {/* Stressed scenario */}
      <div className="px-1 py-0.5 mt-1 border-t border-border/20">
        <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: ORANGE }}>
          {tr(t, 'lcStressedScenario', 'Stressed Scenario')}
        </span>
      </div>

      <div className="flex items-center py-0.5 px-1 border-b border-border/20 text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[44px] shrink-0">BUCKET</span>
        <span className="w-[52px] text-right shrink-0">STRESSED NET</span>
        <span className="w-[52px] text-right shrink-0">STRESSED CUM</span>
      </div>

      {buckets.map(bucket => (
        <div
          key={`stressed-${bucket.bucket}`}
          className="flex items-center py-0.5 px-1 border-b border-border/20 text-[7px] font-mono gap-1 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[44px] text-white/40 shrink-0 text-[6px]">{bucket.bucket}</span>
          <span className="w-[52px] text-right font-bold shrink-0" style={{ color: netColor(bucket.stressedNet) }}>
            {bucket.stressedNet >= 0 ? '+' : ''}{fmtBn(bucket.stressedNet)}
          </span>
          <span className="w-[52px] text-right font-bold shrink-0" style={{ color: netColor(bucket.stressedCumulative) }}>
            {fmtBn(bucket.stressedCumulative)}
          </span>
        </div>
      ))}

      {/* Cumulative flow chart (SVG) */}
      <CashFlowChart buckets={buckets} />
    </div>
  );
}

// ── Cash Flow Cumulative SVG Chart ──

function CashFlowChart({ buckets }: { buckets: CashFlowBucket[] }) {
  if (buckets.length < 2) return null;

  const W = 320;
  const H = 70;
  const PAD_L = 26;
  const PAD_R = 6;
  const PAD_T = 6;
  const PAD_B = 14;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;

  const allVals = buckets.flatMap(b => [b.cumulative, b.stressedCumulative]);
  const maxV = Math.max(...allVals, 0.01);
  const minV = Math.min(...allVals, 0);
  const rangeV = maxV - minV || 1;

  const xScale = (i: number) => PAD_L + (i / (buckets.length - 1)) * CHART_W;
  const yScale = (v: number) => PAD_T + ((maxV - v) / rangeV) * CHART_H;

  const basePath = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(b.cumulative).toFixed(1)}`).join(' ');
  const stressPath = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(b.stressedCumulative).toFixed(1)}`).join(' ');

  const zeroY = yScale(0);

  return (
    <div className="px-1 pt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
        {/* Zero line */}
        {minV < 0 && (
          <line
            x1={PAD_L} y1={zeroY} x2={PAD_L + CHART_W} y2={zeroY}
            stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} strokeDasharray="2,2"
          />
        )}

        {/* Base line */}
        <path d={basePath} fill="none" stroke={SKY} strokeWidth={1.2} opacity={0.8} />
        {/* Stressed line */}
        <path d={stressPath} fill="none" stroke={ORANGE} strokeWidth={1} opacity={0.6} strokeDasharray="3,2" />

        {/* Endpoints */}
        {buckets.length > 0 && (
          <>
            <circle cx={xScale(buckets.length - 1)} cy={yScale(buckets[buckets.length - 1].cumulative)} r={2} fill={SKY} />
            <circle cx={xScale(buckets.length - 1)} cy={yScale(buckets[buckets.length - 1].stressedCumulative)} r={2} fill={ORANGE} opacity={0.7} />
          </>
        )}

        {/* X-axis labels */}
        {buckets.map((b, i) => (
          <text
            key={`xlabel-${i}`}
            x={xScale(i)}
            y={H - 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.15)"
            fontSize={4}
            fontFamily="monospace"
          >
            {b.bucket}
          </text>
        ))}

        {/* Y-axis labels */}
        {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
          <text
            key={`ylabel-${i}`}
            x={PAD_L - 3}
            y={yScale(v) + 1.5}
            textAnchor="end"
            fill="rgba(255,255,255,0.15)"
            fontSize={4}
            fontFamily="monospace"
          >
            {fmtBn(v)}
          </text>
        ))}

        {/* Legend */}
        <line x1={PAD_L + CHART_W - 70} y1={PAD_T + 2} x2={PAD_L + CHART_W - 60} y2={PAD_T + 2} stroke={SKY} strokeWidth={1} />
        <text x={PAD_L + CHART_W - 58} y={PAD_T + 4} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">BASE</text>
        <line x1={PAD_L + CHART_W - 35} y1={PAD_T + 2} x2={PAD_L + CHART_W - 25} y2={PAD_T + 2} stroke={ORANGE} strokeWidth={1} strokeDasharray="2,1" />
        <text x={PAD_L + CHART_W - 23} y={PAD_T + 4} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">STRESS</text>
      </svg>
    </div>
  );
}

// ── Aggregate Metrics Bar ──

function AggregateMetrics({ data, t }: { data: LiquidityCoverageData; t: ReturnType<typeof useT> }) {
  const lcrColor = data.aggregateLcr >= 130 ? GREEN : data.aggregateLcr >= 110 ? SKY : data.aggregateLcr >= 100 ? YELLOW : RED;
  const nColor = data.aggregateNsfr >= 120 ? GREEN : data.aggregateNsfr >= 105 ? SKY : data.aggregateNsfr >= 100 ? YELLOW : RED;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20">
      <div>
        <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">
          {tr(t, 'lcAggLcr', 'Agg LCR')}
        </div>
        <div className="text-[11px] font-mono font-black" style={{ color: lcrColor }}>
          {fmtRatio(data.aggregateLcr)}
        </div>
      </div>
      <div className="w-px h-5 bg-border/20" />
      <div>
        <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">
          {tr(t, 'lcAggNsfr', 'Agg NSFR')}
        </div>
        <div className="text-[11px] font-mono font-black" style={{ color: nColor }}>
          {fmtRatio(data.aggregateNsfr)}
        </div>
      </div>
      <div className="w-px h-5 bg-border/20" />
      <div>
        <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">
          {tr(t, 'lcBanks', 'Banks')}
        </div>
        <div className="text-[11px] font-mono font-black text-white/60">
          {data.lcrBanks.length}
        </div>
      </div>
      <div className="w-px h-5 bg-border/20" />
      <div>
        <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider">
          {tr(t, 'lcBelowMin', 'Below Min')}
        </div>
        <div className="text-[11px] font-mono font-black" style={{ color: data.lcrBanks.filter(b => b.lcrRatio < b.lcrMin).length > 0 ? RED : GREEN }}>
          {data.lcrBanks.filter(b => b.lcrRatio < b.lcrMin).length}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function LiquidityCoveragePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useLiquidityCoverage();
  const [activeTab, setActiveTab] = useState<TabKey>('lcr');

  const status = data ? statusBadge(data.systemStatus) : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-sky-400">
            {tr(t, 'lcTitle', 'Liquidity Coverage')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {status && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{ color: status.color, backgroundColor: status.bg }}
            >
              {status.text}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-sky-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-1 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors border-b ${
              activeTab === tab.key
                ? 'text-sky-400 border-sky-400 bg-sky-400/[0.04]'
                : 'text-white/25 border-transparent hover:text-white/40 hover:bg-white/[0.02]'
            }`}
          >
            {tr(t, tab.i18nKey, tab.label)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : !data && !isLoading ? (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'lcNoData', 'No data available')}
          </div>
        ) : data ? (
          <>
            {/* Aggregate metrics always visible */}
            <AggregateMetrics data={data} t={t} />

            {/* Tab content */}
            {activeTab === 'lcr' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    {tr(t, 'lcLcrSummary', 'LCR Summary — HQLA / Net Outflows')}
                  </span>
                </div>
                <LCRSummaryTable banks={data.lcrBanks} t={t} />
              </div>
            )}

            {activeTab === 'hqla' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    {tr(t, 'lcHqlaBreakdown', 'HQLA Composition — Level 1 / 2A / 2B')}
                  </span>
                </div>
                <HQLABreakdownTable breakdown={data.hqlaBreakdown} />
              </div>
            )}

            {activeTab === 'nsfr' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    {tr(t, 'lcNsfrSummary', 'NSFR — Available vs Required Stable Funding')}
                  </span>
                </div>
                <NSFRSummaryTable entries={data.nsfrEntries} />
              </div>
            )}

            {activeTab === 'cashflow' && (
              <div className="border-b border-border/20">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[6px] text-white/25 uppercase tracking-wider">
                    {tr(t, 'lcCashFlowLadder', 'Cash Flow Ladder — Maturity Buckets')}
                  </span>
                </div>
                <CashFlowLadderTable buckets={data.cashFlowLadder} t={t} />
              </div>
            )}

            {/* Timestamp footer */}
            <div className="px-2 py-1 border-t border-border/20">
              <span className="text-[6px] font-mono text-white/15">
                {tr(t, 'lcLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleString()}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
