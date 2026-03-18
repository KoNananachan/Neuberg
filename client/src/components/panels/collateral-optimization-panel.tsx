import { Loader2 } from 'lucide-react';
import { useCollateralOptimization } from '../../api/hooks/use-collateral-optimization';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Local types --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SummaryData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InventoryItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DemandItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptSuggestion = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CtdItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarginCallForecast = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VelocityMetrics = any;

// -- Formatting helpers --

function fmtAmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(1);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0) + 'bp';
}

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2) + '%';
}

// -- Color helpers --

function surplusColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function confidenceBarWidth(pct: number | null | undefined): string {
  if (pct == null || isNaN(pct)) return '0%';
  return `${Math.min(Math.max(pct, 0), 100)}%`;
}

function eligibilityBadge(label: string): string {
  const l = label.toUpperCase();
  if (l === 'HQLA' || l === 'LEVEL 1') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (l === 'LEVEL 2A' || l === 'ELIGIBLE') return 'bg-blue-400/20 text-blue-400 border-blue-400/30';
  if (l === 'LEVEL 2B' || l === 'CONDITIONAL') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'INELIGIBLE' || l === 'REJECTED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

// -- Main Panel --

export function CollateralOptimizationPanel() {
  const t = useT();
  const { data, isLoading, error } = useCollateralOptimization();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'coptError', 'Failed to load collateral optimization data')}
        </div>
      </div>
    );
  }

  const summary: SummaryData = data?.summary;
  const inventory: InventoryItem[] = data?.inventory ?? [];
  const demand: DemandItem[] = data?.demand ?? [];
  const suggestions: OptSuggestion[] = data?.optimizationSuggestions ?? [];
  const ctdRanking: CtdItem[] = data?.ctdRanking ?? [];
  const marginForecast: MarginCallForecast[] = data?.marginCallForecast ?? [];
  const velocity: VelocityMetrics = data?.velocityMetrics;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-pink-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-pink-400">
            {tr(t, 'panelCollateralOptimization', 'Collateral Optimization')}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Summary Bar */}
        {summary && <SummarySection summary={summary} />}

        {/* Inventory Table */}
        {inventory.length > 0 && <InventorySection items={inventory} />}

        {/* Demand by Counterparty */}
        {demand.length > 0 && <DemandSection items={demand} />}

        {/* Optimization Suggestions */}
        {suggestions.length > 0 && <SuggestionsSection items={suggestions} />}

        {/* CTD Ranking */}
        {ctdRanking.length > 0 && <CtdRankingSection items={ctdRanking} />}

        {/* Margin Call Forecast */}
        {marginForecast.length > 0 && <MarginForecastSection items={marginForecast} />}

        {/* Velocity Metrics */}
        {velocity && <VelocitySection metrics={velocity} />}

      </div>
    </div>
  );
}

// -- Summary Section --

function SummarySection({ summary }: { summary: SummaryData }) {
  return (
    <div className="grid grid-cols-4 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      <div>
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Total Inventory</div>
        <div className="text-[11px] font-mono font-black text-pink-400">{fmtAmt(summary?.totalInventory)}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Total Demand</div>
        <div className="text-[11px] font-mono font-black text-white/80">{fmtAmt(summary?.totalDemand)}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Excess / Deficit</div>
        <div className={`text-[11px] font-mono font-black ${surplusColor(summary?.excessDeficit)}`}>
          {summary?.excessDeficit != null
            ? (summary.excessDeficit >= 0 ? '+' : '') + fmtAmt(summary.excessDeficit)
            : '-'}
        </div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Optimization Savings</div>
        <div className="text-[11px] font-mono font-black text-green-400">{fmtAmt(summary?.optimizationSavings)}</div>
      </div>
    </div>
  );
}

// -- Inventory Section --

function InventorySection({ items }: { items: InventoryItem[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Collateral Inventory
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Type</th>
            <th className="px-2 py-1.5 text-right font-bold">Mkt Value</th>
            <th className="px-2 py-1.5 text-right font-bold">Haircut %</th>
            <th className="px-2 py-1.5 text-right font-bold">Post-Haircut</th>
            <th className="px-2 py-1.5 text-left font-bold">Eligibility</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: InventoryItem, i: number) => (
            <tr key={item?.type ?? i} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
              <td className="px-2 py-1 text-left text-pink-400 font-bold">{item?.type ?? '-'}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtAmt(item?.marketValue)}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtPct(item?.haircut)}</td>
              <td className="px-2 py-1 text-right text-white font-bold">{fmtAmt(item?.postHaircutValue)}</td>
              <td className="px-2 py-1 text-left">
                <div className="flex gap-0.5 flex-wrap">
                  {(item?.eligibility as string[] | undefined)?.map((badge: string, j: number) => (
                    <span
                      key={j}
                      className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase border ${eligibilityBadge(badge)}`}
                    >
                      {badge}
                    </span>
                  ))}
                  {(!item?.eligibility || (item.eligibility as string[]).length === 0) && (
                    <span className="text-neutral-600">-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- Demand by Counterparty Section --

function DemandSection({ items }: { items: DemandItem[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Demand by Counterparty
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">CCP / Counterparty</th>
            <th className="px-2 py-1.5 text-right font-bold">IM</th>
            <th className="px-2 py-1.5 text-right font-bold">VM</th>
            <th className="px-2 py-1.5 text-right font-bold">Total</th>
            <th className="px-2 py-1.5 text-right font-bold">Posted</th>
            <th className="px-2 py-1.5 text-right font-bold">Surplus/Deficit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: DemandItem, i: number) => {
            const surplus = item?.surplus ?? (item?.posted != null && item?.total != null ? item.posted - item.total : null);
            return (
              <tr key={item?.counterparty ?? i} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-left text-pink-400 font-bold">{item?.counterparty ?? '-'}</td>
                <td className="px-2 py-1 text-right text-white/80">{fmtAmt(item?.im)}</td>
                <td className="px-2 py-1 text-right text-white/80">{fmtAmt(item?.vm)}</td>
                <td className="px-2 py-1 text-right text-white font-bold">{fmtAmt(item?.total)}</td>
                <td className="px-2 py-1 text-right text-white/80">{fmtAmt(item?.posted)}</td>
                <td className={`px-2 py-1 text-right font-bold ${surplusColor(surplus)}`}>
                  {surplus != null ? (surplus >= 0 ? '+' : '') + fmtAmt(surplus) : '-'}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- Optimization Suggestions Section --

function SuggestionsSection({ items }: { items: OptSuggestion[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Optimization Suggestions
        </span>
      </div>
      <div className="px-2 py-1 space-y-1">
        {items.map((item: OptSuggestion, i: number) => (
          <div
            key={i}
            className="border border-border/20 bg-[#050505] px-2 py-1.5 hover:bg-pink-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-mono font-bold text-pink-400 uppercase tracking-wider">
                Swap #{i + 1}
              </span>
              <span className="text-[8px] font-mono font-bold text-green-400">
                Save {fmtAmt(item?.costSavings)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono">
              <span className="text-white/70">{item?.currentCollateral ?? '-'}</span>
              <span className="text-neutral-600 px-1">&rarr;</span>
              <span className="text-white font-bold">{item?.suggestedCollateral ?? '-'}</span>
            </div>
            {item?.reason && (
              <div className="text-[7px] font-mono text-neutral-500 mt-0.5">{item.reason}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -- CTD Ranking Section --

function CtdRankingSection({ items }: { items: CtdItem[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Cheapest-to-Deliver Ranking
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Rank</th>
            <th className="px-2 py-1.5 text-left font-bold">Security</th>
            <th className="px-2 py-1.5 text-right font-bold">Yield</th>
            <th className="px-2 py-1.5 text-right font-bold">Haircut</th>
            <th className="px-2 py-1.5 text-right font-bold">Net Cost</th>
            <th className="px-2 py-1.5 text-right font-bold">Funding Sprd</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: CtdItem, i: number) => (
            <tr key={item?.security ?? i} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
              <td className="px-2 py-1 text-left text-pink-400 font-bold">#{i + 1}</td>
              <td className="px-2 py-1 text-left text-white font-bold">{item?.security ?? '-'}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtRate(item?.yield)}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtPct(item?.haircut)}</td>
              <td className="px-2 py-1 text-right text-white font-bold">{fmtBps(item?.netCost)}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtBps(item?.fundingSpread)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- Margin Call Forecast Section --

function MarginForecastSection({ items }: { items: MarginCallForecast[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Margin Call Forecast (5-Day)
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Day</th>
            <th className="px-2 py-1.5 text-right font-bold">Expected Call</th>
            <th className="px-2 py-1.5 text-right font-bold">Confidence</th>
            <th className="px-2 py-1.5 text-left font-bold w-24">Confidence Bar</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: MarginCallForecast, i: number) => (
            <tr key={item?.day ?? i} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
              <td className="px-2 py-1 text-left text-pink-400 font-bold">{item?.day ?? `T+${i + 1}`}</td>
              <td className="px-2 py-1 text-right text-white font-bold">{fmtAmt(item?.expectedCall)}</td>
              <td className="px-2 py-1 text-right text-white/80">{fmtPct(item?.confidence)}</td>
              <td className="px-2 py-1 text-left">
                <div className="w-20 h-1.5 bg-neutral-800 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-pink-400"
                    style={{ width: confidenceBarWidth(item?.confidence) }}
                  />
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- Velocity Metrics Section --

function VelocitySection({ metrics }: { metrics: VelocityMetrics }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-wider">
          Velocity Metrics
        </span>
      </div>
      <div className="grid grid-cols-2 gap-0">
        <div className="px-3 py-2 border-r border-border/20">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Reuse Rate</div>
          <div className="text-[11px] font-mono font-black text-white/80">{fmtPct(metrics?.reuseRate)}</div>
          {metrics?.reuseRateTrend != null && (
            <div className={`text-[7px] font-mono font-bold ${surplusColor(metrics.reuseRateTrend)}`}>
              {metrics.reuseRateTrend >= 0 ? '+' : ''}{fmtPct(metrics.reuseRateTrend)} vs prev
            </div>
          )}
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Settlement Efficiency</div>
          <div className="text-[11px] font-mono font-black text-white/80">{fmtPct(metrics?.settlementEfficiency)}</div>
          {metrics?.settlementEfficiencyTrend != null && (
            <div className={`text-[7px] font-mono font-bold ${surplusColor(metrics.settlementEfficiencyTrend)}`}>
              {metrics.settlementEfficiencyTrend >= 0 ? '+' : ''}{fmtPct(metrics.settlementEfficiencyTrend)} vs prev
            </div>
          )}
        </div>
      </div>
      {(metrics?.avgSettlementTime != null || metrics?.failRate != null) && (
        <div className="grid grid-cols-2 gap-0 border-t border-border/10">
          <div className="px-3 py-2 border-r border-border/20">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Settlement Time</div>
            <div className="text-[11px] font-mono font-black text-white/80">
              {metrics?.avgSettlementTime != null ? `${metrics.avgSettlementTime}h` : '-'}
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Fail Rate</div>
            <div className="text-[11px] font-mono font-black text-white/80">{fmtPct(metrics?.failRate)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
