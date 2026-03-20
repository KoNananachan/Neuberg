import { Loader2 } from 'lucide-react';
import { useCommodityStorage } from '../../api/hooks/use-commodity-storage';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0) + ' bps';
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function structureBadge(structure: string | null | undefined): { text: string; bg: string } {
  const s = (structure ?? '').toLowerCase();
  if (s.includes('contango')) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (s.includes('backwardation')) return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

function utilizationColor(pct: number | null | undefined): string {
  if (pct == null) return 'text-zinc-400';
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  return 'text-green-400';
}

// -- Main Panel --

export function CommodityStoragePanel() {
  const t = useT();
  const { data, isLoading, error } = useCommodityStorage();

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
          {tr(t, 'cstorageFailed', 'Failed to load commodity storage data')}
        </div>
      </div>
    );
  }

  const storageEconomics: any[] = data.storageEconomics ?? [];
  const inventoryLevels: any[] = data.inventoryLevels ?? [];
  const cashAndCarry: any[] = data.cashAndCarry ?? [];
  const facilityRates: any[] = data.facilityRates ?? [];
  const summary = data.summary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Contango</div>
            <div className="text-[11px] font-mono font-black text-amber-400">{fmtPct(summary.avgContango)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Best Carry</div>
            <div className="text-[11px] font-mono font-black text-green-400">{fmtPct(summary.bestCarryReturn)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Utilization</div>
            <div className={`text-[11px] font-mono font-black ${utilizationColor(summary.avgUtilization)}`}>
              {summary.avgUtilization != null ? summary.avgUtilization.toFixed(1) + '%' : '-'}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">In Backwardation</div>
            <div className="text-[11px] font-mono font-black text-green-400">{summary.backwardationCount ?? 0}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Days Supply</div>
            <div className="text-[11px] font-mono font-black text-white/80">
              {summary.avgDaysSupply != null ? summary.avgDaysSupply.toFixed(1) : '-'}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Storage Economics */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">
              {tr(t, 'cstorageEconomics', 'Storage Economics')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                <th className="px-2 py-1.5 text-right font-bold">Front Mo</th>
                <th className="px-2 py-1.5 text-center font-bold">Structure</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread %</th>
                <th className="px-2 py-1.5 text-right font-bold">Storage $/mo</th>
                <th className="px-2 py-1.5 text-right font-bold">Finance Cost</th>
                <th className="px-2 py-1.5 text-right font-bold">Insurance</th>
                <th className="px-2 py-1.5 text-right font-bold">Total Cost</th>
                <th className="px-2 py-1.5 text-right font-bold">Net Carry</th>
              </tr>
            </thead>
            <tbody>
              {storageEconomics.map((r: any, i: number) => {
                const badge = structureBadge(r.structure);
                return (
                  <tr key={r.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold text-amber-400">{r.commodity}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(r.spotPrice)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(r.frontMonth)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`text-[7px] font-mono font-black px-1 py-px uppercase border ${badge.text} ${badge.bg}`}>
                        {r.structure ?? '-'}
                      </span>
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.spreadPct)}`}>
                      {fmtPct(r.spreadPct)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtPrice(r.storageCost)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtBps(r.financeCostBps)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtBps(r.insuranceBps)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtPct(r.totalCostPct)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.netCarryReturn)}`}>
                      {fmtPct(r.netCarryReturn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inventory Levels */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">
              {tr(t, 'cstorageInventory', 'Inventory Levels')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Current</th>
                <th className="px-2 py-1.5 text-right font-bold">5Y Avg</th>
                <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
                <th className="px-2 py-1.5 text-right font-bold">Days Supply</th>
                <th className="px-2 py-1.5 text-right font-bold">Capacity</th>
                <th className="px-2 py-1.5 text-right font-bold">Utilization</th>
                <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLevels.map((r: any, i: number) => (
                <tr key={r.commodity ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-amber-400">{r.commodity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNumber(r.current)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtNumber(r.fiveYearAvg)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span
                      className={`text-[7px] font-bold px-1.5 py-0.5 ${
                        r.vs5yAvgPct < 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {fmtPct(r.vs5yAvgPct)} {r.vs5yAvgPct < 0 ? 'TIGHT' : 'AMPLE'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">
                    {r.daysSupply != null ? r.daysSupply.toFixed(1) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtNumber(r.capacity)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${utilizationColor(r.utilizationPct)}`}>
                    {r.utilizationPct != null ? r.utilizationPct.toFixed(1) + '%' : '-'}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1wPct)}`}>
                    {fmtPct(r.change1wPct)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change1mPct)}`}>
                    {fmtPct(r.change1mPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cash-and-Carry Analysis */}
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">
              {tr(t, 'cstorageCashCarry', 'Cash-and-Carry Analysis')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Trade</th>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Entry</th>
                <th className="px-2 py-1.5 text-right font-bold">Exit</th>
                <th className="px-2 py-1.5 text-right font-bold">Gross Return</th>
                <th className="px-2 py-1.5 text-right font-bold">Net Return</th>
                <th className="px-2 py-1.5 text-right font-bold">Ann. Return</th>
                <th className="px-2 py-1.5 text-right font-bold">Sharpe</th>
                <th className="px-2 py-1.5 text-right font-bold">Horizon</th>
              </tr>
            </thead>
            <tbody>
              {cashAndCarry.map((r: any, i: number) => (
                <tr key={r.trade ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-amber-400 max-w-[120px] truncate">{r.trade}</td>
                  <td className="px-2 py-1.5 text-white/60">{r.commodity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80">{fmtPrice(r.entryPrice)}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{fmtPrice(r.exitPrice)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.grossReturn)}`}>
                    {fmtPct(r.grossReturn)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.netReturn)}`}>
                    {fmtPct(r.netReturn)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.annualizedReturn)}`}>
                    {fmtPct(r.annualizedReturn)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span
                      className={`font-bold ${
                        r.sharpe >= 1.5
                          ? 'text-green-400'
                          : r.sharpe >= 0.5
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {r.sharpe != null ? r.sharpe.toFixed(2) : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {r.horizonDays != null ? r.horizonDays + 'd' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Storage Facility Rates */}
        <div>
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-amber-400 uppercase tracking-wider">
              {tr(t, 'cstorageFacilities', 'Storage Facility Rates')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Hub</th>
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-right font-bold">Capacity</th>
                <th className="px-2 py-1.5 text-right font-bold">Utilization</th>
                <th className="px-2 py-1.5 text-right font-bold">Rate $/mo</th>
                <th className="px-2 py-1.5 text-right font-bold">Rate Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Avail Capacity</th>
                <th className="px-2 py-1.5 text-right font-bold">Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {facilityRates.map((r: any, i: number) => (
                <tr key={r.hub ?? i} className="border-b border-border/10 hover:bg-amber-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-amber-400">{r.hub}</td>
                  <td className="px-2 py-1.5 text-white/40 uppercase">{r.type}</td>
                  <td className="px-2 py-1.5 text-right text-white/80">{fmtNumber(r.capacity)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <UtilizationBar pct={r.utilizationPct} />
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtPrice(r.ratePerMonth)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.rateChangePct)}`}>
                    {fmtPct(r.rateChangePct)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtNumber(r.availableCapacity)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {r.leadTimeDays != null ? r.leadTimeDays + 'd' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// -- Utilization Bar (inline in table cell) --

function UtilizationBar({ pct }: { pct: number | null | undefined }) {
  const val = pct ?? 0;
  const color =
    val >= 90 ? '#ef4444' :
    val >= 75 ? '#eab308' :
    '#22c55e';

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-12 h-1.5 bg-white/5 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(val, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className={`text-[8px] font-mono font-bold ${utilizationColor(pct)}`}>
        {val.toFixed(1)}%
      </span>
    </div>
  );
}
