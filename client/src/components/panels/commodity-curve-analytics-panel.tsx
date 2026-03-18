import { Loader2 } from 'lucide-react';
import { useCommodityCurveAnalytics } from '../../api/hooks/use-commodity-curve-analytics';
import { useT } from '../../i18n';

// -- Formatting helpers --

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString();
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function zscoreColor(z: number | null | undefined): string {
  if (z == null) return 'text-zinc-400';
  if (z >= 2) return 'text-red-400';
  if (z >= 1) return 'text-orange-400';
  if (z <= -2) return 'text-green-400';
  if (z <= -1) return 'text-blue-400';
  return 'text-zinc-400';
}

function structureBadge(structure: string | null | undefined): { text: string; bg: string } {
  const s = (structure ?? '').toLowerCase();
  if (s.includes('contango')) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (s.includes('backwardation')) return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function signalBadge(signal: string | null | undefined): { text: string; bg: string } {
  const s = (signal ?? '').toLowerCase();
  if (s.includes('tightening')) return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s.includes('loosening')) return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function dominantColor(dominant: string | null | undefined): string {
  const s = (dominant ?? '').toLowerCase();
  if (s.includes('contango')) return 'text-yellow-400';
  if (s.includes('backwardation')) return 'text-green-400';
  return 'text-zinc-400';
}

// -- Main Panel --

export function CommodityCurveAnalyticsPanel() {
  const _t = useT();
  const { data, isLoading, error } = useCommodityCurveAnalytics();

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
          Failed to load commodity curve analytics
        </div>
      </div>
    );
  }

  const curveShapes: any[] = data.curveShapes ?? [];
  const rollYield: any[] = data.rollYield ?? [];
  const basisAnalysis: any[] = data.basisAnalysis ?? [];
  const inventoryCurveCorrelation: any[] = data.inventoryCurveCorrelation ?? [];
  const summary = data.marketSummary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Contango Depth</div>
            <div className="text-[11px] font-mono font-black text-amber-400">{fmtPct(summary.avgContangoDepth)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">In Backwardation</div>
            <div className="text-[11px] font-mono font-black text-green-400">{summary.commoditiesInBackwardation ?? 0}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Best Roll Yield</div>
            <div className="text-[11px] font-mono font-black text-green-400">{fmtPct(summary.bestRollYield)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Worst Roll Yield</div>
            <div className="text-[11px] font-mono font-black text-red-400">{fmtPct(summary.worstRollYield)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Dominant Structure</div>
            <div className={`text-[11px] font-mono font-black truncate ${dominantColor(summary.dominantStructure)}`}>
              {summary.dominantStructure ?? '-'}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Curve Shapes */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Curve Shapes</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                <th className="px-2 py-1.5 text-right font-bold">1M</th>
                <th className="px-2 py-1.5 text-right font-bold">3M</th>
                <th className="px-2 py-1.5 text-right font-bold">6M</th>
                <th className="px-2 py-1.5 text-right font-bold">12M</th>
                <th className="px-2 py-1.5 text-right font-bold">24M</th>
                <th className="px-2 py-1.5 text-center font-bold">Structure</th>
                <th className="px-2 py-1.5 text-right font-bold">Ann. Roll</th>
                <th className="px-2 py-1.5 text-right font-bold">Slope</th>
              </tr>
            </thead>
            <tbody>
              {curveShapes.map((c: any, i: number) => {
                const badge = structureBadge(c.structure);
                return (
                  <tr key={c.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold text-amber-400">{c.commodity}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(c.spot)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(c.month1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(c.month3)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(c.month6)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(c.month12)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(c.month24)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${badge.text} ${badge.bg}`}>
                        {c.structure ?? '-'}
                      </span>
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.annualizedRoll)}`}>
                      {fmtPct(c.annualizedRoll)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.curveSlope)}`}>
                      {fmtSigned(c.curveSlope)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Roll Yield */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Roll Yield</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Front</th>
                <th className="px-2 py-1.5 text-right font-bold">Second</th>
                <th className="px-2 py-1.5 text-right font-bold">Monthly</th>
                <th className="px-2 py-1.5 text-right font-bold">Annualized</th>
                <th className="px-2 py-1.5 text-right font-bold">Roll Cost</th>
                <th className="px-2 py-1.5 text-right font-bold">Optimal Window</th>
                <th className="px-2 py-1.5 text-right font-bold">Calendar Spread</th>
              </tr>
            </thead>
            <tbody>
              {rollYield.map((r: any, i: number) => (
                <tr key={r.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-amber-400">{r.commodity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(r.frontMonth)}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(r.secondMonth)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.rollYieldMonthly)}`}>
                    {fmtPct(r.rollYieldMonthly)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.rollYieldAnnualized)}`}>
                    {fmtPct(r.rollYieldAnnualized)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtPrice(r.rollCost)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{r.optimalRollWindow ?? '-'}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.calendarSpread)}`}>
                    {fmtSigned(r.calendarSpread)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Basis Analysis */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Basis Analysis</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Cash</th>
                <th className="px-2 py-1.5 text-right font-bold">Near Futures</th>
                <th className="px-2 py-1.5 text-right font-bold">Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">Basis %</th>
                <th className="px-2 py-1.5 text-right font-bold">Hist Avg</th>
                <th className="px-2 py-1.5 text-right font-bold">Z-Score</th>
                <th className="px-2 py-1.5 text-right font-bold">Convergence</th>
              </tr>
            </thead>
            <tbody>
              {basisAnalysis.map((b: any, i: number) => (
                <tr key={b.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-amber-400">{b.commodity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(b.cashPrice)}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(b.nearFutures)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(b.basis)}`}>
                    {fmtSigned(b.basis)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(b.basisPercent)}`}>
                    {fmtPct(b.basisPercent)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtSigned(b.historicalAvgBasis)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${zscoreColor(b.zscore)}`}>
                    {b.zscore != null ? b.zscore.toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {b.convergenceDays != null ? `${b.convergenceDays}d` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inventory-Curve Correlation */}
        <div>
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">Inventory-Curve Correlation</span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Inventory</th>
                <th className="px-2 py-1.5 text-right font-bold">Inv Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Days Supply</th>
                <th className="px-2 py-1.5 text-right font-bold">Curve Slope</th>
                <th className="px-2 py-1.5 text-right font-bold">Correlation</th>
                <th className="px-2 py-1.5 text-center font-bold">Signal</th>
              </tr>
            </thead>
            <tbody>
              {inventoryCurveCorrelation.map((ic: any, i: number) => {
                const badge = signalBadge(ic.signal);
                return (
                  <tr key={ic.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold text-amber-400">{ic.commodity}</td>
                    <td className="px-2 py-1.5 text-right text-white/80">{fmtNum(ic.inventoryLevel)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(ic.inventoryChange)}`}>
                      {fmtPct(ic.inventoryChange)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">
                      {ic.daysOfSupply != null ? ic.daysOfSupply.toFixed(1) : '-'}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(ic.curveSlope)}`}>
                      {fmtSigned(ic.curveSlope)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60">
                      {ic.correlation != null ? ic.correlation.toFixed(2) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${badge.text} ${badge.bg}`}>
                        {ic.signal ?? '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
