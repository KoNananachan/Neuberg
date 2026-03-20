import { Loader2 } from 'lucide-react';
import { useCollateralMonitor } from '../../api/hooks/use-collateral-monitor';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}B`;
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtPctSigned(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function stressStatusColor(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'pass') return 'text-green-400';
  if (s === 'warning') return 'text-yellow-400';
  if (s === 'fail') return 'text-red-400';
  return 'text-neutral-500';
}

function stressStatusBg(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'pass') return 'bg-green-500/10 border-green-500/30';
  if (s === 'warning') return 'bg-yellow-500/10 border-yellow-500/30';
  if (s === 'fail') return 'bg-red-500/10 border-red-500/30';
  return 'bg-neutral-500/10 border-neutral-500/30';
}

function surplusColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendBg(trend: string | null | undefined): string {
  const t = (trend ?? '').toLowerCase();
  if (t === 'improving' || t === 'up') return 'bg-green-500/10 border-green-500/30 text-green-400';
  if (t === 'deteriorating' || t === 'down') return 'bg-red-500/10 border-red-500/30 text-red-400';
  return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
}

// -- Main Panel --

export function CollateralMonitorPanel() {
  const t = useT();
  const { data, isLoading, error } = useCollateralMonitor();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'cmError', 'Failed to load collateral data')}
        </div>
      </div>
    );
  }

  const summary = data.marketSummary;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories: any[] = data.collateralCategories ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const haircuts: any[] = data.haircutMatrix ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liquidity: any[] = data.liquidityCoverage ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stress: any[] = data.stressScenarios ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Total Collateral</div>
            <div className="text-[11px] font-mono font-black text-slate-400">{fmtB(summary.totalCollateral)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Haircut</div>
            <div className="text-[11px] font-mono font-black text-white/80">{fmtPct(summary.avgHaircut)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Rehypothecation</div>
            <div className="text-[11px] font-mono font-black text-white/80">{fmtPct(summary.rehypothecationLevel)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Margin Calls</div>
            <div className="text-[11px] font-mono font-black text-white/80">{summary.marginCallsToday ?? '-'}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Fails to Deliver</div>
            <div className="text-[11px] font-mono font-black text-white/80">{summary.failsToDeliver ?? '-'}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Stress Test</div>
            <div className={`text-[11px] font-mono font-black ${stressStatusColor(summary.stressTestStatus)}`}>
              {summary.stressTestStatus ?? '-'}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Collateral Categories */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider">
              {tr(t, 'cmCategories', 'Collateral Categories')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Category</th>
                <th className="px-2 py-1.5 text-right font-bold">Value ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Haircut %</th>
                <th className="px-2 py-1.5 text-right font-bold">Rehyp %</th>
                <th className="px-2 py-1.5 text-right font-bold">Util %</th>
                <th className="px-2 py-1.5 text-right font-bold">Daily Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Velocity</th>
                <th className="px-2 py-1.5 text-right font-bold">Elig CP</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat: any, i: number) => (
                <tr key={cat.category ?? i} className="border-b border-border/5 hover:bg-slate-400/[0.02] transition-colors">
                  <td className="px-2 py-1 text-left text-white font-bold">{cat.category ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtB(cat.totalValue)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(cat.haircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(cat.rehypothecationRate)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(cat.utilization)}</td>
                  <td className={`px-2 py-1 text-right font-bold ${changeColor(cat.dailyChange)}`}>
                    {fmtPctSigned(cat.dailyChange)}
                  </td>
                  <td className="px-2 py-1 text-right text-white/60">{cat.velocity ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/60">{cat.eligibleCounterparties ?? '-'}</td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Haircut Matrix */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider">
              {tr(t, 'cmHaircutMatrix', 'Haircut Matrix')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Counterparty</th>
                <th className="px-2 py-1.5 text-right font-bold">UST %</th>
                <th className="px-2 py-1.5 text-right font-bold">Agency %</th>
                <th className="px-2 py-1.5 text-right font-bold">IG %</th>
                <th className="px-2 py-1.5 text-right font-bold">HY %</th>
                <th className="px-2 py-1.5 text-right font-bold">Equity %</th>
                <th className="px-2 py-1.5 text-right font-bold">Exp ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">MC Freq</th>
              </tr>
            </thead>
            <tbody>
              {haircuts.map((row: any, i: number) => (
                <tr key={row.counterparty ?? i} className="border-b border-border/5 hover:bg-slate-400/[0.02] transition-colors">
                  <td className="px-2 py-1 text-left text-white font-bold">{row.counterparty ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(row.ustHaircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(row.agencyHaircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(row.igHaircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(row.hyHaircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtPct(row.equityHaircut)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtB(row.totalExposure)}</td>
                  <td className="px-2 py-1 text-right text-white/60">{row.marginCallFreq ?? '-'}</td>
                </tr>
              ))}
              {haircuts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Liquidity Coverage */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider">
              {tr(t, 'cmLiquidity', 'Liquidity Coverage')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Category</th>
                <th className="px-2 py-1.5 text-right font-bold">Value</th>
                <th className="px-2 py-1.5 text-right font-bold">Requirement</th>
                <th className="px-2 py-1.5 text-right font-bold">Surplus</th>
                <th className="px-2 py-1.5 text-center font-bold">Trend</th>
                <th className="px-2 py-1.5 text-right font-bold">Percentile</th>
              </tr>
            </thead>
            <tbody>
              {liquidity.map((row: any, i: number) => (
                <tr key={row.category ?? i} className="border-b border-border/5 hover:bg-slate-400/[0.02] transition-colors">
                  <td className="px-2 py-1 text-left text-white font-bold">{row.category ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/80">{row.value ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/80">{row.requirement ?? '-'}</td>
                  <td className={`px-2 py-1 text-right font-bold ${surplusColor(row.surplus)}`}>
                    {row.surplus != null ? (row.surplus >= 0 ? '+' : '') + row.surplus.toFixed(1) : '-'}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {row.trend ? (
                      <span className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase border ${trendBg(row.trend)}`}>
                        {row.trend}
                      </span>
                    ) : (
                      <span className="text-neutral-600">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right text-white/60">{row.percentile != null ? `${row.percentile}th` : '-'}</td>
                </tr>
              ))}
              {liquidity.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stress Scenarios */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-wider">
              {tr(t, 'cmStress', 'Stress Scenarios')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Scenario</th>
                <th className="px-2 py-1.5 text-right font-bold">Impact %</th>
                <th className="px-2 py-1.5 text-right font-bold">MC Est ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Shortfall ($B)</th>
                <th className="px-2 py-1.5 text-left font-bold">Worst Affected</th>
                <th className="px-2 py-1.5 text-right font-bold">Recovery (d)</th>
              </tr>
            </thead>
            <tbody>
              {stress.map((row: any, i: number) => (
                <tr key={row.scenario ?? i} className="border-b border-border/5 hover:bg-slate-400/[0.02] transition-colors">
                  <td className="px-2 py-1 text-left text-white font-bold">{row.scenario ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-red-400 font-bold">{fmtPct(row.collateralImpact)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtB(row.marginCallEstimate)}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtB(row.shortfall)}</td>
                  <td className="px-2 py-1 text-left text-white/60">{row.worstAffected ?? '-'}</td>
                  <td className="px-2 py-1 text-right text-white/60">{row.recoveryDays ?? '-'}</td>
                </tr>
              ))}
              {stress.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
