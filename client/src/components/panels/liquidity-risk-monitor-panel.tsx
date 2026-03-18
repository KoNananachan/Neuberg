import { Loader2 } from 'lucide-react';
import { useLiquidityRiskMonitor } from '../../api/hooks/use-liquidity-risk-monitor';
import { useT } from '../../i18n';

// -- Formatting helpers --

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtSignedPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtDollarM(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}M`;
}

function fmtDollarB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(2)}B`;
}

// -- Color helpers --

function zscoreColor(z: number | null | undefined): string {
  if (z == null) return 'text-zinc-400';
  const abs = Math.abs(z);
  if (abs >= 2.5) return 'text-red-400';
  if (abs >= 1.5) return 'text-orange-400';
  if (abs >= 1.0) return 'text-yellow-400';
  return 'text-zinc-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function liquidityScoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-zinc-400';
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function resiliencyColor(r: number | null | undefined): string {
  if (r == null) return 'text-zinc-400';
  if (r >= 70) return 'text-green-400';
  if (r >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function percentileColor(p: number | null | undefined): string {
  if (p == null) return 'text-zinc-400';
  if (p >= 80) return 'text-red-400';
  if (p >= 60) return 'text-orange-400';
  if (p >= 40) return 'text-zinc-400';
  return 'text-green-400';
}

// -- Badge helpers --

function trendBadge(trend: string | null | undefined): { text: string; cls: string; bg: string } {
  const t = (trend ?? '').toLowerCase();
  if (t.includes('widen')) return { text: 'WIDENING', cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (t.includes('tight')) return { text: 'TIGHTENING', cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (t.includes('stable')) return { text: 'STABLE', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
  return { text: trend ?? '-', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function regimeBadge(regime: string | null | undefined): { text: string; cls: string; bg: string } {
  const r = (regime ?? '').toLowerCase();
  if (r.includes('normal')) return { text: 'Normal', cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (r.includes('caution')) return { text: 'Caution', cls: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (r.includes('stress')) return { text: 'Stress', cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: regime ?? '-', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function signalBadge(signal: string | null | undefined): { text: string; cls: string; bg: string } {
  const s = (signal ?? '').toLowerCase();
  if (s.includes('ample')) return { text: 'Ample', cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s.includes('adequate')) return { text: 'Adequate', cls: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
  if (s.includes('tight')) return { text: 'Tight', cls: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (s.includes('stress')) return { text: 'Stressed', cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: signal ?? '-', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function toxicityBadge(level: string | null | undefined): { text: string; cls: string; bg: string } {
  const l = (level ?? '').toLowerCase();
  if (l.includes('low')) return { text: 'Low', cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (l.includes('moderate') || l.includes('medium')) return { text: 'Moderate', cls: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (l.includes('high')) return { text: 'High', cls: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  if (l.includes('extreme') || l.includes('critical')) return { text: 'Extreme', cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: level ?? '-', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function alertBadge(level: string | null | undefined): { text: string; cls: string; bg: string } {
  const l = (level ?? '').toLowerCase();
  if (l.includes('green') || l.includes('normal') || l.includes('low')) return { text: level ?? '-', cls: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (l.includes('yellow') || l.includes('elevated') || l.includes('watch')) return { text: level ?? '-', cls: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (l.includes('orange') || l.includes('high') || l.includes('warning')) return { text: level ?? '-', cls: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  if (l.includes('red') || l.includes('critical') || l.includes('extreme')) return { text: level ?? '-', cls: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: level ?? '-', cls: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

// -- Main Panel --

export function LiquidityRiskMonitorPanel() {
  const _t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useLiquidityRiskMonitor() as { data: any; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load liquidity risk monitor
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bidAskSpreads: any[] = data.bidAskSpreads ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marketDepth: any[] = data.marketDepth ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liquidityScoreboard: any[] = data.liquidityScoreboard ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flowToxicity: any[] = data.flowToxicity ?? [];
  const summary = data.marketSummary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Composite Liquidity</div>
            <div className="text-[11px] font-mono font-black text-amber-400">{fmtNum(summary.compositeLiquidityIndex)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg B/A Z-Score</div>
            <div className={`text-[11px] font-mono font-black ${zscoreColor(summary.avgBidAskZscore)}`}>
              {fmtSigned(summary.avgBidAskZscore)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Stressed Markets</div>
            <div className="text-[11px] font-mono font-black text-red-400">{summary.stressedMarkets ?? 0}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg VPIN</div>
            <div className="text-[11px] font-mono font-black text-white/80">{fmtNum(summary.avgVPIN)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Liquidity Regime</div>
            {(() => {
              const badge = regimeBadge(summary.liquidityRegime);
              return (
                <span className={`text-[9px] font-mono font-black px-1 py-px uppercase border inline-block mt-0.5 ${badge.cls} ${badge.bg}`}>
                  {badge.text}
                </span>
              );
            })()}
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Worst Liquidity</div>
            <div className="text-[11px] font-mono font-black text-red-400 truncate">{summary.worstLiquidity ?? '-'}</div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Bid-Ask Spreads */}
        {bidAskSpreads.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Bid-Ask Spreads</span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Asset</th>
                  <th className="px-2 py-1.5 text-right font-bold">Current</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg 30d</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg 90d</th>
                  <th className="px-2 py-1.5 text-right font-bold">Pctl</th>
                  <th className="px-2 py-1.5 text-right font-bold">Z-Score</th>
                  <th className="px-2 py-1.5 text-right font-bold">Liq Score</th>
                  <th className="px-2 py-1.5 text-center font-bold">Trend</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {bidAskSpreads.map((s: any, i: number) => {
                  const trend = trendBadge(s.trend);
                  return (
                    <tr key={s.asset ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold text-amber-400">{s.asset}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(s.currentSpread)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(s.avg30d)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(s.avg90d)}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${percentileColor(s.percentile)}`}>
                        {fmtPct(s.percentile)}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold ${zscoreColor(s.zscore)}`}>
                        {fmtSigned(s.zscore)}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold ${liquidityScoreColor(s.liquidityScore)}`}>
                        {s.liquidityScore != null ? s.liquidityScore : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${trend.cls} ${trend.bg}`}>
                          {trend.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Market Depth */}
        {marketDepth.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Market Depth</span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Market</th>
                  <th className="px-2 py-1.5 text-right font-bold">Top of Book</th>
                  <th className="px-2 py-1.5 text-right font-bold">Depth 5bp</th>
                  <th className="px-2 py-1.5 text-right font-bold">Depth 10bp</th>
                  <th className="px-2 py-1.5 text-right font-bold">Resiliency</th>
                  <th className="px-2 py-1.5 text-right font-bold">Daily Vol</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg Trade</th>
                  <th className="px-2 py-1.5 text-right font-bold">Fragmentation</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {marketDepth.map((d: any, i: number) => (
                  <tr key={d.market ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold text-amber-400">{d.market}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtDollarM(d.topOfBook)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtDollarM(d.depth5bp)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtDollarM(d.depth10bp)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${resiliencyColor(d.resiliency)}`}>
                      {d.resiliency != null ? d.resiliency : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtDollarB(d.dailyVolume)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtDollarM(d.avgTradeSize)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">
                      {d.fragmentation != null ? fmtNum(d.fragmentation) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Liquidity Scoreboard */}
        {liquidityScoreboard.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Liquidity Scoreboard</span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Index</th>
                  <th className="px-2 py-1.5 text-right font-bold">Current</th>
                  <th className="px-2 py-1.5 text-right font-bold">Prior Week</th>
                  <th className="px-2 py-1.5 text-right font-bold">Change</th>
                  <th className="px-2 py-1.5 text-center font-bold">Signal</th>
                  <th className="px-2 py-1.5 text-right font-bold">Pctl</th>
                  <th className="px-2 py-1.5 text-center font-bold">Regime</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {liquidityScoreboard.map((l: any, i: number) => {
                  const sig = signalBadge(l.signal);
                  const reg = regimeBadge(l.regime);
                  return (
                    <tr key={l.index ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold text-amber-400">{l.index}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(l.currentValue)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(l.priorWeek)}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${changeColor(l.change)}`}>
                        {fmtSignedPct(l.change)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${sig.cls} ${sig.bg}`}>
                          {sig.text}
                        </span>
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold ${percentileColor(l.percentile)}`}>
                        {fmtPct(l.percentile)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${reg.cls} ${reg.bg}`}>
                          {reg.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Flow Toxicity */}
        {flowToxicity.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Flow Toxicity</span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Market</th>
                  <th className="px-2 py-1.5 text-right font-bold">VPIN</th>
                  <th className="px-2 py-1.5 text-center font-bold">Toxicity</th>
                  <th className="px-2 py-1.5 text-right font-bold">Informed %</th>
                  <th className="px-2 py-1.5 text-right font-bold">Order Imbal</th>
                  <th className="px-2 py-1.5 text-right font-bold">Flash Crash %</th>
                  <th className="px-2 py-1.5 text-center font-bold">Alert</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {flowToxicity.map((f: any, i: number) => {
                  const tox = toxicityBadge(f.toxicityLevel);
                  const alert = alertBadge(f.alertLevel);
                  return (
                    <tr key={f.market ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold text-amber-400">{f.market}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(f.vpin)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${tox.cls} ${tox.bg}`}>
                          {tox.text}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(f.informedTrading)}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${changeColor(f.orderImbalance)}`}>
                        {fmtSigned(f.orderImbalance)}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold ${
                        (f.flashCrashProb ?? 0) >= 10 ? 'text-red-400' :
                        (f.flashCrashProb ?? 0) >= 5 ? 'text-orange-400' :
                        'text-white/60'
                      }`}>
                        {fmtPct(f.flashCrashProb)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${alert.cls} ${alert.bg}`}>
                          {alert.text}
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
