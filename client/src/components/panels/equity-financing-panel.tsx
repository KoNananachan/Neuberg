import { Loader2 } from 'lucide-react';
import { useEquityFinancing } from '../../api/hooks/use-equity-financing';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#facc15'; // yellow-400

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtMillions(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}B`;
  return `${n.toFixed(1)}M`;
}

function fmtChange(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtChangePct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function borrowRateColor(rate: number | null | undefined): string {
  if (rate == null) return 'text-neutral-500';
  if (rate >= 50) return 'text-red-400';
  if (rate >= 20) return 'text-orange-400';
  if (rate >= 5) return 'text-yellow-400';
  return 'text-green-400';
}

function feeScoreBadge(score: string | null | undefined): { text: string; bg: string } {
  if (!score) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const s = score.toLowerCase();
  if (s === 'gc' || s === 'general collateral')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'warm')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (s === 'special')
    return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (s === 'hard to borrow' || s === 'htb')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function squeezeScoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-neutral-500';
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-green-400';
  return 'text-neutral-500';
}

function riskLevelBadge(level: string | null | undefined): { text: string; bg: string } {
  if (!level) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'extreme')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (l === 'high')
    return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (l === 'medium' || l === 'moderate')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (l === 'low')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function trendBadge(trend: string | null | undefined): { text: string; bg: string } {
  if (!trend) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const t = trend.toLowerCase();
  if (t === 'rising' || t === 'increasing' || t === 'up')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (t === 'falling' || t === 'decreasing' || t === 'down')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (t === 'stable' || t === 'flat')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function eventBadge(event: string | null | undefined): { text: string; bg: string } {
  if (!event) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const e = event.toLowerCase();
  if (e.includes('squeeze') || e.includes('recall'))
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (e.includes('upgrade') || e.includes('decrease') || e.includes('eased'))
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (e.includes('downgrade') || e.includes('increase') || e.includes('tighten'))
    return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  if (e.includes('new') || e.includes('special'))
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (e.includes('threshold'))
    return { text: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' };
  return { text: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' };
}

function impactBadge(impact: string | null | undefined): { text: string; bg: string } {
  if (!impact) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const i = impact.toLowerCase();
  if (i === 'high' || i === 'critical')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (i === 'medium' || i === 'moderate')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (i === 'low')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// ── Main Panel ──

export function EquityFinancingPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useEquityFinancing() as { data: any; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load equity financing data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Market Summary Bar */}
        {data.marketSummary && (
          <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
            <SummaryItem label="Total On Loan" value={fmtMillions(data.marketSummary.totalOnLoan)} color={ACCENT} />
            <SummaryItem label="Avg Utilization" value={fmtPct(data.marketSummary.avgUtilization)} />
            <SummaryItem label="Avg Borrow Fee" value={fmtPct(data.marketSummary.avgBorrowFee)} color={ACCENT} />
            <SummaryItem label="Specials" value={String(data.marketSummary.specialsCount ?? '-')} />
            <SummaryItem label="Hard to Borrow" value={String(data.marketSummary.hardToBorrowCount ?? '-')} />
            <SummaryItem label="Most Expensive" value={data.marketSummary.mostExpensive ?? '-'} color={ACCENT} />
          </div>
        )}

        {/* Borrow Rates Table */}
        {data.borrowRates && data.borrowRates.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'ef.borrowRates', 'Borrow Rates')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Ticker</th>
                  <th className="px-2 py-1 text-left font-bold">Name</th>
                  <th className="px-2 py-1 text-right font-bold">Borrow Rate</th>
                  <th className="px-2 py-1 text-right font-bold">Prior Day</th>
                  <th className="px-2 py-1 text-right font-bold">Change</th>
                  <th className="px-2 py-1 text-right font-bold">Util %</th>
                  <th className="px-2 py-1 text-right font-bold">On Loan (M)</th>
                  <th className="px-2 py-1 text-right font-bold">Days Cover</th>
                  <th className="px-2 py-1 text-center font-bold">Fee Score</th>
                </tr>
              </thead>
              <tbody>
                {data.borrowRates.map((r: any, i: number) => {
                  const fb = feeScoreBadge(r.feeScore);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                      <td className="px-2 py-1 text-left">
                        <span className="font-bold" style={{ color: ACCENT }}>{r.ticker}</span>
                      </td>
                      <td className="px-2 py-1 text-left text-white/50 truncate max-w-[120px]">{r.name ?? '-'}</td>
                      <td className={`px-2 py-1 text-right font-bold ${borrowRateColor(r.borrowRate)}`}>
                        {fmtPct(r.borrowRate)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.priorDay)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${changeColor(r.change)}`}>
                        {fmtChangePct(r.change)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtPct(r.utilization)}</td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtMillions(r.sharesOnLoan)}</td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtNum(r.daysToCover, 1)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${fb.text} ${fb.bg}`}>
                          {r.feeScore ?? '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Short Squeeze Indicators Table */}
        {data.shortSqueezeIndicators && data.shortSqueezeIndicators.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'ef.shortSqueezeIndicators', 'Short Squeeze Indicators')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Ticker</th>
                  <th className="px-2 py-1 text-right font-bold">SI %</th>
                  <th className="px-2 py-1 text-right font-bold">SI Chg</th>
                  <th className="px-2 py-1 text-right font-bold">Days Cover</th>
                  <th className="px-2 py-1 text-right font-bold">Cost Borrow</th>
                  <th className="px-2 py-1 text-right font-bold">Call OI Ratio</th>
                  <th className="px-2 py-1 text-right font-bold">DP Short %</th>
                  <th className="px-2 py-1 text-right font-bold">Squeeze</th>
                  <th className="px-2 py-1 text-center font-bold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.shortSqueezeIndicators.map((s: any, i: number) => {
                  const rl = riskLevelBadge(s.riskLevel);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                      <td className="px-2 py-1 text-left">
                        <span className="font-bold" style={{ color: ACCENT }}>{s.ticker}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtPct(s.shortInterest)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${changeColor(s.shortInterestChange)}`}>
                        {fmtChangePct(s.shortInterestChange)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtNum(s.daysToCover, 1)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${borrowRateColor(s.costToBorrow)}`}>
                        {fmtPct(s.costToBorrow)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtNum(s.callOIRatio)}</td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtPct(s.darkPoolShortVolume)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${squeezeScoreColor(s.squeezeScore)}`}>
                        {fmtNum(s.squeezeScore, 0)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${rl.text} ${rl.bg}`}>
                          {s.riskLevel ?? '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Market Aggregates Table */}
        {data.marketAggregates && data.marketAggregates.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'ef.marketAggregates', 'Market Aggregates')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Metric</th>
                  <th className="px-2 py-1 text-right font-bold">Value</th>
                  <th className="px-2 py-1 text-right font-bold">Prior Week</th>
                  <th className="px-2 py-1 text-right font-bold">Change</th>
                  <th className="px-2 py-1 text-right font-bold">Percentile</th>
                  <th className="px-2 py-1 text-center font-bold">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.marketAggregates.map((m: any, i: number) => {
                  const tb = trendBadge(m.trend);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                      <td className="px-2 py-1 text-left font-bold text-white">{m.metric}</td>
                      <td className="px-2 py-1 text-right" style={{ color: ACCENT }}>{m.value ?? '-'}</td>
                      <td className="px-2 py-1 text-right text-white/60">{m.priorWeek ?? '-'}</td>
                      <td className={`px-2 py-1 text-right font-bold ${changeColor(typeof m.change === 'number' ? m.change : null)}`}>
                        {typeof m.change === 'number' ? fmtChange(m.change) : (m.change ?? '-')}
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">
                        {m.percentile != null ? `${fmtNum(m.percentile, 0)}th` : '-'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${tb.text} ${tb.bg}`}>
                          {m.trend ?? '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Activity Table */}
        {data.recentActivity && data.recentActivity.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'ef.recentActivity', 'Recent Activity')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Ticker</th>
                  <th className="px-2 py-1 text-center font-bold">Event</th>
                  <th className="px-2 py-1 text-right font-bold">Prev Rate</th>
                  <th className="px-2 py-1 text-right font-bold">Curr Rate</th>
                  <th className="px-2 py-1 text-right font-bold">Change</th>
                  <th className="px-2 py-1 text-right font-bold">Time</th>
                  <th className="px-2 py-1 text-center font-bold">Impact</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((a: any, i: number) => {
                  const eb = eventBadge(a.event);
                  const ib = impactBadge(a.impact);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-yellow-400/[0.02]">
                      <td className="px-2 py-1 text-left">
                        <span className="font-bold" style={{ color: ACCENT }}>{a.ticker}</span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${eb.text} ${eb.bg}`}>
                          {a.event ?? '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtPct(a.previousRate)}</td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtPct(a.currentRate)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${changeColor(a.change)}`}>
                        {fmtChangePct(a.change)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/40">
                        {a.timestamp ? new Date(a.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${ib.text} ${ib.bg}`}>
                          {a.impact ?? '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Item ──

function SummaryItem({
  label,
  value,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  color?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 min-w-0 px-2 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
        {label}
      </div>
      <div
        className={`text-[10px] font-mono font-bold truncate ${valueColor ?? ''}`}
        style={!valueColor && color ? { color } : !valueColor ? { color: 'white' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
