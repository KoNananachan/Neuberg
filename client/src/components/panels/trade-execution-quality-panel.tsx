import { useState } from 'react';
import { useTradeExecutionQuality } from '../../api/hooks/use-trade-execution-quality';

// ── Constants ──

const ACCENT = '#38bdf8'; // sky-400
const GREEN = '#22c55e';
const RED = '#ef4444';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const DIM = 'rgba(255,255,255,0.4)';

type Tab = 'trades' | 'brokers' | 'venues' | 'timing' | 'compliance';

// ── Formatting helpers ──

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtQty(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms.toFixed(0)}ms`;
}

// ── Color helpers ──

function slippageColor(bps: number): string {
  const abs = Math.abs(bps);
  if (abs <= 0.5) return GREEN;
  if (abs <= 2) return YELLOW;
  if (abs <= 5) return ORANGE;
  return RED;
}

function scoreColor(score: number): string {
  if (score >= 90) return GREEN;
  if (score >= 75) return ACCENT;
  if (score >= 60) return YELLOW;
  if (score >= 40) return ORANGE;
  return RED;
}

function sideColor(side: string): string {
  const s = side.toUpperCase();
  return s === 'BUY' ? GREEN : RED;
}

function complianceColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'PASS' || s === 'COMPLIANT') return GREEN;
  if (s === 'WARNING' || s === 'REVIEW') return YELLOW;
  return RED;
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-white/[0.01]">
      <span className="text-[6px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
        {label}
      </span>
    </div>
  );
}

// ── Metric Cell ──

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-2 py-1.5 bg-black">
      <div className="text-[5px] text-white/20 font-mono uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[10px] font-mono font-bold" style={{ color: color ?? 'rgba(255,255,255,0.6)' }}>
        {value}
      </div>
    </div>
  );
}

// ── Trades Tab ──

function TradesTab({ trades }: { trades: any[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-white/30 uppercase">No trades available</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
        <span className="w-[40px] shrink-0">Symbol</span>
        <span className="w-[28px] shrink-0">Side</span>
        <span className="w-[36px] shrink-0 text-right">Qty</span>
        <span className="w-[44px] shrink-0 text-right">Avg Px</span>
        <span className="w-[44px] shrink-0 text-right">VWAP</span>
        <span className="w-[44px] shrink-0 text-right">IS (bps)</span>
        <span className="w-[44px] shrink-0 text-right">Slip</span>
        <span className="w-[44px] shrink-0 text-right">Impact</span>
        <span className="flex-1 text-right">Venue</span>
      </div>

      {/* Rows */}
      {trades.map((trade: any, i: number) => (
        <div
          key={i}
          className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[40px] shrink-0 text-white/70 font-bold">{trade.symbol}</span>
          <span
            className="w-[28px] shrink-0 font-bold text-[7px] uppercase"
            style={{ color: sideColor(trade.side ?? '') }}
          >
            {(trade.side ?? '').toUpperCase()}
          </span>
          <span className="w-[36px] shrink-0 text-right text-white/50">{fmtQty(trade.qty ?? 0)}</span>
          <span className="w-[44px] shrink-0 text-right text-white/60">{fmtPrice(trade.avgPrice ?? 0)}</span>
          <span className="w-[44px] shrink-0 text-right text-white/40">{fmtPrice(trade.vwap ?? 0)}</span>
          <span
            className="w-[44px] shrink-0 text-right font-bold"
            style={{ color: slippageColor(trade.implementationShortfall ?? 0) }}
          >
            {fmtBps(trade.implementationShortfall ?? 0)}
          </span>
          <span
            className="w-[44px] shrink-0 text-right font-bold"
            style={{ color: slippageColor(trade.slippageBps ?? 0) }}
          >
            {fmtBps(trade.slippageBps ?? 0)}
          </span>
          <span className="w-[44px] shrink-0 text-right text-white/35">
            {fmtBps(trade.marketImpact ?? 0)}
          </span>
          <span className="flex-1 text-right text-white/30 text-[7px] truncate">{trade.venue ?? '-'}</span>
        </div>
      ))}

      {/* Venue breakdown summary */}
      {trades.length > 0 && (() => {
        const venueCounts: Record<string, number> = {};
        trades.forEach((t: any) => {
          const v = t.venue ?? 'UNKNOWN';
          venueCounts[v] = (venueCounts[v] || 0) + 1;
        });
        const sorted = Object.entries(venueCounts).sort((a, b) => b[1] - a[1]);
        const total = trades.length;

        return (
          <div className="px-2 py-1.5 border-t border-border/20">
            <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              Venue Breakdown
            </span>
            <div className="mt-1 flex flex-col gap-0.5">
              {sorted.map(([venue, count]) => {
                const pct = (count / total) * 100;
                return (
                  <div key={venue} className="flex items-center gap-2">
                    <span className="text-[7px] font-mono text-white/40 w-[60px] truncate">{venue}</span>
                    <div className="flex-1 h-[4px] bg-white/[0.03] relative">
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{ width: `${pct}%`, backgroundColor: ACCENT, opacity: 0.5 }}
                      />
                    </div>
                    <span className="text-[7px] font-mono text-white/30 w-[32px] text-right">
                      {fmtPct(pct)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Brokers Tab ──

function BrokersTab({ brokers }: { brokers: any[] }) {
  if (brokers.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-white/30 uppercase">No broker data available</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
        <span className="w-[60px] shrink-0">Broker</span>
        <span className="w-[28px] shrink-0 text-right">Rank</span>
        <span className="w-[52px] shrink-0 text-right">Avg IS (bps)</span>
        <span className="w-[44px] shrink-0 text-right">Exec Score</span>
        <span className="w-[44px] shrink-0 text-right">Fill Qual</span>
        <span className="w-[36px] shrink-0 text-right">Orders</span>
        <span className="flex-1 text-right">Fill Rate</span>
      </div>

      {/* Rows */}
      {brokers.map((broker: any, i: number) => (
        <div
          key={i}
          className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[60px] shrink-0 text-white/60 font-bold text-[7px] truncate">{broker.name}</span>
          <span className="w-[28px] shrink-0 text-right text-white/40 font-bold">#{broker.rank ?? i + 1}</span>
          <span
            className="w-[52px] shrink-0 text-right font-bold"
            style={{ color: slippageColor(broker.avgShortfall ?? 0) }}
          >
            {fmtBps(broker.avgShortfall ?? 0)}
          </span>
          <span
            className="w-[44px] shrink-0 text-right font-bold"
            style={{ color: scoreColor(broker.executionScore ?? 0) }}
          >
            {(broker.executionScore ?? 0).toFixed(0)}
          </span>
          <span
            className="w-[44px] shrink-0 text-right font-bold"
            style={{ color: scoreColor(broker.fillQuality ?? 0) }}
          >
            {(broker.fillQuality ?? 0).toFixed(0)}
          </span>
          <span className="w-[36px] shrink-0 text-right text-white/35">{broker.orderCount ?? 0}</span>
          <span className="flex-1 text-right text-white/50">{fmtPct(broker.fillRate ?? 0)}</span>
        </div>
      ))}

      {/* Score bar visualization */}
      {brokers.length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            Execution Score Ranking
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {brokers
              .slice()
              .sort((a: any, b: any) => (b.executionScore ?? 0) - (a.executionScore ?? 0))
              .map((broker: any) => (
                <div key={broker.name} className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-white/40 w-[60px] truncate">{broker.name}</span>
                  <div className="flex-1 h-[5px] bg-white/[0.03] relative">
                    <div
                      className="absolute left-0 top-0 h-full transition-all"
                      style={{
                        width: `${broker.executionScore ?? 0}%`,
                        backgroundColor: scoreColor(broker.executionScore ?? 0),
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span
                    className="text-[7px] font-mono font-bold w-[20px] text-right"
                    style={{ color: scoreColor(broker.executionScore ?? 0) }}
                  >
                    {(broker.executionScore ?? 0).toFixed(0)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Venues Tab ──

function VenuesTab({ venues }: { venues: any[] }) {
  if (venues.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-white/30 uppercase">No venue data available</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
        <span className="w-[56px] shrink-0">Venue</span>
        <span className="w-[32px] shrink-0 text-right">Type</span>
        <span className="w-[40px] shrink-0 text-right">Fill %</span>
        <span className="w-[48px] shrink-0 text-right">Px Improv</span>
        <span className="w-[44px] shrink-0 text-right">Avg Speed</span>
        <span className="w-[36px] shrink-0 text-right">Vol %</span>
        <span className="flex-1 text-right">Score</span>
      </div>

      {/* Rows */}
      {venues.map((venue: any, i: number) => {
        const isDark = (venue.type ?? '').toUpperCase() === 'DARK';
        return (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors"
          >
            <span className="w-[56px] shrink-0 text-white/60 font-bold text-[7px] truncate">{venue.name}</span>
            <span
              className="w-[32px] shrink-0 text-right text-[6px] font-bold uppercase"
              style={{ color: isDark ? '#a78bfa' : ACCENT }}
            >
              {venue.type ?? '-'}
            </span>
            <span
              className="w-[40px] shrink-0 text-right font-bold"
              style={{ color: (venue.fillRate ?? 0) >= 90 ? GREEN : (venue.fillRate ?? 0) >= 70 ? YELLOW : RED }}
            >
              {fmtPct(venue.fillRate ?? 0)}
            </span>
            <span
              className="w-[48px] shrink-0 text-right font-bold"
              style={{ color: (venue.priceImprovement ?? 0) > 0 ? GREEN : (venue.priceImprovement ?? 0) < 0 ? RED : DIM }}
            >
              {fmtBps(venue.priceImprovement ?? 0)}
            </span>
            <span className="w-[44px] shrink-0 text-right text-white/35">
              {fmtMs(venue.avgSpeedMs ?? 0)}
            </span>
            <span className="w-[36px] shrink-0 text-right text-white/35">
              {fmtPct(venue.volumePct ?? 0)}
            </span>
            <span
              className="flex-1 text-right font-bold"
              style={{ color: scoreColor(venue.qualityScore ?? 0) }}
            >
              {(venue.qualityScore ?? 0).toFixed(0)}
            </span>
          </div>
        );
      })}

      {/* Dark vs Lit summary */}
      {venues.length > 0 && (() => {
        let darkVol = 0;
        let litVol = 0;
        venues.forEach((v: any) => {
          if ((v.type ?? '').toUpperCase() === 'DARK') {
            darkVol += v.volumePct ?? 0;
          } else {
            litVol += v.volumePct ?? 0;
          }
        });

        return (
          <div className="px-2 py-2 border-t border-border/20">
            <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              Dark Pool vs Lit
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-[8px] bg-white/[0.03] relative flex">
                <div
                  className="h-full"
                  style={{ width: `${darkVol}%`, backgroundColor: '#a78bfa', opacity: 0.6 }}
                />
                <div
                  className="h-full"
                  style={{ width: `${litVol}%`, backgroundColor: ACCENT, opacity: 0.6 }}
                />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-[6px] h-[6px]" style={{ backgroundColor: '#a78bfa', opacity: 0.6 }} />
                <span className="text-[7px] font-mono text-white/40">DARK {fmtPct(darkVol)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-[6px] h-[6px]" style={{ backgroundColor: ACCENT, opacity: 0.6 }} />
                <span className="text-[7px] font-mono text-white/40">LIT {fmtPct(litVol)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Timing Tab ──

function TimingTab({ timing }: { timing: any }) {
  const periods = timing?.periods ?? [];

  if (periods.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-white/30 uppercase">No timing data available</span>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader label="Time-of-Day Execution Quality" />

      {/* Header */}
      <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
        <span className="w-[60px] shrink-0">Period</span>
        <span className="w-[36px] shrink-0 text-right">Orders</span>
        <span className="w-[48px] shrink-0 text-right">Avg Slip</span>
        <span className="w-[48px] shrink-0 text-right">Mkt Impact</span>
        <span className="w-[44px] shrink-0 text-right">Fill Rate</span>
        <span className="w-[44px] shrink-0 text-right">Avg Speed</span>
        <span className="flex-1 text-right">Score</span>
      </div>

      {/* Rows */}
      {periods.map((period: any, i: number) => (
        <div
          key={i}
          className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-[60px] shrink-0 text-white/50 font-bold text-[7px] uppercase">{period.label}</span>
          <span className="w-[36px] shrink-0 text-right text-white/35">{period.orderCount ?? 0}</span>
          <span
            className="w-[48px] shrink-0 text-right font-bold"
            style={{ color: slippageColor(period.avgSlippageBps ?? 0) }}
          >
            {fmtBps(period.avgSlippageBps ?? 0)}
          </span>
          <span
            className="w-[48px] shrink-0 text-right"
            style={{ color: slippageColor(period.marketImpactBps ?? 0) }}
          >
            {fmtBps(period.marketImpactBps ?? 0)}
          </span>
          <span
            className="w-[44px] shrink-0 text-right"
            style={{ color: (period.fillRate ?? 0) >= 95 ? GREEN : (period.fillRate ?? 0) >= 85 ? YELLOW : RED }}
          >
            {fmtPct(period.fillRate ?? 0)}
          </span>
          <span className="w-[44px] shrink-0 text-right text-white/35">
            {fmtMs(period.avgSpeedMs ?? 0)}
          </span>
          <span
            className="flex-1 text-right font-bold"
            style={{ color: scoreColor(period.score ?? 0) }}
          >
            {(period.score ?? 0).toFixed(0)}
          </span>
        </div>
      ))}

      {/* Performance bar chart */}
      {periods.length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <span className="text-[6px] font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            Slippage by Period (bps)
          </span>
          <TimingChart periods={periods} />
        </div>
      )}

      {/* Best/worst summary */}
      {periods.length > 0 && (() => {
        const sorted = [...periods].sort((a: any, b: any) => (a.avgSlippageBps ?? 0) - (b.avgSlippageBps ?? 0));
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        return (
          <div className="grid grid-cols-2 gap-px bg-white/[0.02] border-t border-border/20">
            <MetricCell
              label="BEST PERIOD"
              value={`${best.label}: ${fmtBps(best.avgSlippageBps ?? 0)} bps`}
              color={GREEN}
            />
            <MetricCell
              label="WORST PERIOD"
              value={`${worst.label}: ${fmtBps(worst.avgSlippageBps ?? 0)} bps`}
              color={RED}
            />
          </div>
        );
      })()}
    </div>
  );
}

function TimingChart({ periods }: { periods: any[] }) {
  const W = 340;
  const H = periods.length * 16 + 8;
  const BAR_X = 80;
  const BAR_W = W - 100;
  const BAR_H = 8;
  const GAP = 16;

  const maxSlip = Math.max(...periods.map((p: any) => Math.abs(p.avgSlippageBps ?? 0)), 1);

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        {periods.map((period: any, i: number) => {
          const y = 4 + i * GAP;
          const barLen = (Math.abs(period.avgSlippageBps ?? 0) / maxSlip) * BAR_W;
          const color = slippageColor(period.avgSlippageBps ?? 0);

          return (
            <g key={period.label}>
              <text
                x={BAR_X - 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {period.label}
              </text>
              <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.02)" />
              <rect
                x={BAR_X}
                y={y}
                width={Math.max(barLen, 0.5)}
                height={BAR_H}
                fill={color}
                opacity={0.5}
              />
              <text
                x={BAR_X + barLen + 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="start"
                fill={color}
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtBps(period.avgSlippageBps ?? 0)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Compliance Tab ──

function ComplianceTab({ compliance }: { compliance: any }) {
  const summary = compliance?.summary ?? {};
  const flaggedTrades = compliance?.flaggedTrades ?? [];
  const rules = compliance?.rules ?? [];

  return (
    <div>
      {/* Overall Score */}
      <SectionHeader label="Best Execution Compliance" />
      <div className="grid grid-cols-4 gap-px bg-white/[0.02]">
        <MetricCell
          label="OVERALL SCORE"
          value={`${(summary.overallScore ?? 0).toFixed(0)}/100`}
          color={scoreColor(summary.overallScore ?? 0)}
        />
        <MetricCell
          label="STATUS"
          value={(summary.status ?? 'N/A').toUpperCase()}
          color={complianceColor(summary.status ?? '')}
        />
        <MetricCell
          label="FLAGGED TRADES"
          value={String(summary.flaggedCount ?? flaggedTrades.length)}
          color={(summary.flaggedCount ?? flaggedTrades.length) > 0 ? RED : GREEN}
        />
        <MetricCell
          label="REVIEWED"
          value={fmtPct(summary.reviewedPct ?? 0)}
          color={(summary.reviewedPct ?? 0) >= 90 ? GREEN : YELLOW}
        />
      </div>

      {/* Rule compliance */}
      {rules.length > 0 && (
        <>
          <SectionHeader label="Compliance Rules" />
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[80px] shrink-0">Rule</span>
            <span className="w-[48px] shrink-0 text-right">Status</span>
            <span className="w-[48px] shrink-0 text-right">Score</span>
            <span className="flex-1 text-right">Detail</span>
          </div>
          {rules.map((rule: any, i: number) => (
            <div
              key={i}
              className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors"
            >
              <span className="w-[80px] shrink-0 text-white/50 font-bold text-[7px]">{rule.name}</span>
              <span
                className="w-[48px] shrink-0 text-right font-bold text-[7px] uppercase"
                style={{ color: complianceColor(rule.status ?? '') }}
              >
                {rule.status ?? '-'}
              </span>
              <span
                className="w-[48px] shrink-0 text-right font-bold"
                style={{ color: scoreColor(rule.score ?? 0) }}
              >
                {(rule.score ?? 0).toFixed(0)}
              </span>
              <span className="flex-1 text-right text-white/30 text-[7px] truncate">{rule.detail ?? '-'}</span>
            </div>
          ))}
        </>
      )}

      {/* Flagged Trades */}
      {flaggedTrades.length > 0 && (
        <>
          <SectionHeader label="Flagged Trades" />
          <div className="flex items-center px-2 py-0.5 text-[5px] font-mono uppercase tracking-wider text-white/15 border-b border-white/[0.04]">
            <span className="w-[40px] shrink-0">Symbol</span>
            <span className="w-[28px] shrink-0">Side</span>
            <span className="w-[36px] shrink-0 text-right">Qty</span>
            <span className="w-[48px] shrink-0 text-right">Slip (bps)</span>
            <span className="w-[56px] shrink-0 text-right">Reason</span>
            <span className="flex-1 text-right">Severity</span>
          </div>
          {flaggedTrades.map((trade: any, i: number) => (
            <div
              key={i}
              className="flex items-center px-2 py-0.5 text-[9px] font-mono border-b border-white/[0.02] hover:bg-red-400/[0.02] transition-colors"
            >
              <span className="w-[40px] shrink-0 text-white/70 font-bold">{trade.symbol}</span>
              <span
                className="w-[28px] shrink-0 font-bold text-[7px] uppercase"
                style={{ color: sideColor(trade.side ?? '') }}
              >
                {(trade.side ?? '').toUpperCase()}
              </span>
              <span className="w-[36px] shrink-0 text-right text-white/50">{fmtQty(trade.qty ?? 0)}</span>
              <span
                className="w-[48px] shrink-0 text-right font-bold"
                style={{ color: RED }}
              >
                {fmtBps(trade.slippageBps ?? 0)}
              </span>
              <span className="w-[56px] shrink-0 text-right text-white/40 text-[7px] truncate">
                {trade.reason ?? '-'}
              </span>
              <span
                className="flex-1 text-right font-bold text-[7px] uppercase"
                style={{
                  color: (trade.severity ?? '').toUpperCase() === 'HIGH' ? RED
                    : (trade.severity ?? '').toUpperCase() === 'MEDIUM' ? ORANGE
                    : YELLOW,
                }}
              >
                {trade.severity ?? '-'}
              </span>
            </div>
          ))}
        </>
      )}

      {flaggedTrades.length === 0 && (
        <div className="px-2 py-4 text-center">
          <span className="text-[9px] font-mono uppercase" style={{ color: GREEN }}>
            No flagged trades - all executions compliant
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function TradeExecutionQualityPanel() {
  const { data, isLoading } = useTradeExecutionQuality();
  const [tab, setTab] = useState<Tab>('trades');
  const d = data as any;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'trades', label: 'TRADES' },
    { key: 'brokers', label: 'BROKERS' },
    { key: 'venues', label: 'VENUES' },
    { key: 'timing', label: 'TIMING' },
    { key: 'compliance', label: 'COMPLIANCE' },
  ];

  // Loading state
  if (isLoading && !d) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            Trade Execution Quality
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (!d) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex items-center px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            Trade Execution Quality
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono uppercase text-red-400">
            No data available
          </span>
        </div>
      </div>
    );
  }

  const trades = d.trades ?? [];
  const brokers = d.brokers ?? [];
  const venues = d.venues ?? [];
  const timing = d.timing ?? {};
  const compliance = d.compliance ?? {};

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
          Trade Execution Quality
        </span>
        {d.totalTrades != null && (
          <span className="text-[6px] font-mono text-white/20 uppercase">
            {d.totalTrades} TRADES
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              tab === key
                ? 'text-sky-400 border-b border-sky-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar text-[9px] font-mono">
        {tab === 'trades' && <TradesTab trades={trades} />}
        {tab === 'brokers' && <BrokersTab brokers={brokers} />}
        {tab === 'venues' && <VenuesTab venues={venues} />}
        {tab === 'timing' && <TimingTab timing={timing} />}
        {tab === 'compliance' && <ComplianceTab compliance={compliance} />}
      </div>
    </div>
  );
}
