import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNaturalGasStorage } from '../../api/hooks/use-natural-gas-storage';
import { useT, tr, TFn } from '../../i18n';

// ── Tab types ──

type Tab = 'storage' | 'regions' | 'history' | 'forecast' | 'supply';

const TABS: { key: Tab; label: string }[] = [
  { key: 'storage', label: 'STORAGE' },
  { key: 'regions', label: 'REGIONS' },
  { key: 'history', label: 'HISTORY' },
  { key: 'forecast', label: 'FORECAST' },
  { key: 'supply', label: 'SUPPLY' },
];

// ── Formatting helpers ──

function fmtBcf(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' Bcf';
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(1);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return '$' + n.toFixed(2);
}

function fmtBcfd(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1) + ' Bcf/d';
}

// ── Color helpers ──

function injectionWithdrawalColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function vs5yrAvgColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-blue-400';
  if (n < 0) return 'text-amber-400';
  return 'text-zinc-400';
}

function surpriseColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-zinc-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-zinc-400';
}

// ── Main Panel ──

export function NaturalGasStoragePanel() {
  const t = useT();
  const { data, isLoading } = useNaturalGasStorage();
  const [activeTab, setActiveTab] = useState<Tab>('storage');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!data && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'ngStorageFailed', 'Failed to load natural gas storage data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'storage' && <StorageTab data={data} />}
        {activeTab === 'regions' && <RegionsTab data={data} />}
        {activeTab === 'history' && <HistoryTab data={data} />}
        {activeTab === 'forecast' && <ForecastTab data={data} />}
        {activeTab === 'supply' && <SupplyTab data={data} />}
      </div>
    </div>
  );
}

// ── Storage Tab ──

function StorageTab({ data }: { data: any }) {
  const storage = data.storage ?? {};
  const totalBcf = storage.totalBcf;
  const netChange = storage.netChange;
  const vs5yrAvg = storage.vs5yrAvg;
  const vs5yrAvgPct = storage.vs5yrAvgPct;
  const vsYearAgo = storage.vsYearAgo;
  const vsYearAgoPct = storage.vsYearAgoPct;
  const fiveYrRangeLow = storage.fiveYrRangeLow;
  const fiveYrRangeHigh = storage.fiveYrRangeHigh;
  const fiveYrAvg = storage.fiveYrAvg;
  const percentInRange = storage.percentInRange;
  const reportDate = storage.reportDate;

  return (
    <div className="p-3 space-y-4">
      {/* Headline */}
      <div className="border border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
          US Total Working Gas in Storage
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-[22px] font-mono font-black text-orange-400">
            {fmtBcf(totalBcf)}
          </span>
          {reportDate && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase">
              Week ending {reportDate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Net Change </span>
            <span className={`text-[10px] font-mono font-bold ${injectionWithdrawalColor(netChange)}`}>
              {fmtChange(netChange)} Bcf
            </span>
            <span className={`ml-1 text-[7px] font-mono font-bold uppercase ${netChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netChange > 0 ? 'INJECTION' : netChange < 0 ? 'WITHDRAWAL' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* vs 5-Year Average */}
      <div className="border border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          vs 5-Year Average
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Difference</div>
            <div className={`text-[11px] font-mono font-bold ${vs5yrAvgColor(vs5yrAvg)}`}>
              {fmtChange(vs5yrAvg)} Bcf
            </div>
            <div className={`text-[8px] font-mono ${vs5yrAvgColor(vs5yrAvgPct)}`}>
              {fmtPct(vs5yrAvgPct)}
            </div>
          </div>
          <div className="flex-1">
            <Vs5yrBar current={totalBcf} avg={fiveYrAvg} />
          </div>
        </div>
      </div>

      {/* vs Year-Ago */}
      <div className="border border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          vs Year-Ago
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Difference</div>
            <div className={`text-[11px] font-mono font-bold ${changeColor(vsYearAgo)}`}>
              {fmtChange(vsYearAgo)} Bcf
            </div>
            <div className={`text-[8px] font-mono ${changeColor(vsYearAgoPct)}`}>
              {fmtPct(vsYearAgoPct)}
            </div>
          </div>
        </div>
      </div>

      {/* 5-Year Range Position */}
      <div className="border border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          Position in 5-Year Range
        </div>
        <FiveYearRangeBar
          low={fiveYrRangeLow}
          high={fiveYrRangeHigh}
          current={totalBcf}
          avg={fiveYrAvg}
          percentInRange={percentInRange}
        />
      </div>
    </div>
  );
}

// ── vs 5-Year Average Bar ──

function Vs5yrBar({ current, avg }: { current: number | null | undefined; avg: number | null | undefined }) {
  if (current == null || avg == null) return null;
  const max = Math.max(current, avg) * 1.1;
  const currentPct = (current / max) * 100;
  const avgPct = (avg / max) * 100;
  const isAbove = current > avg;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[7px] font-mono text-neutral-500 w-10 uppercase">Current</span>
        <div className="flex-1 h-3 bg-white/5 relative">
          <div
            className="h-full"
            style={{
              width: `${Math.min(currentPct, 100)}%`,
              backgroundColor: isAbove ? '#60a5fa' : '#fbbf24',
              opacity: 0.7,
            }}
          />
        </div>
        <span className="text-[8px] font-mono text-white/80 w-16 text-right">{fmtNum(current)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[7px] font-mono text-neutral-500 w-10 uppercase">5Y Avg</span>
        <div className="flex-1 h-3 bg-white/5 relative">
          <div
            className="h-full bg-neutral-600/50"
            style={{ width: `${Math.min(avgPct, 100)}%` }}
          />
        </div>
        <span className="text-[8px] font-mono text-neutral-500 w-16 text-right">{fmtNum(avg)}</span>
      </div>
    </div>
  );
}

// ── 5-Year Range Bar ──

function FiveYearRangeBar({
  low,
  high,
  current,
  avg,
  percentInRange,
}: {
  low: number | null | undefined;
  high: number | null | undefined;
  current: number | null | undefined;
  avg: number | null | undefined;
  percentInRange: number | null | undefined;
}) {
  if (low == null || high == null || current == null) return null;
  const range = high - low || 1;
  const currentPos = Math.max(0, Math.min(100, ((current - low) / range) * 100));
  const avgPos = avg != null ? Math.max(0, Math.min(100, ((avg - low) / range) * 100)) : null;

  return (
    <div className="space-y-2">
      <div className="relative h-6 bg-white/5">
        {/* Range fill */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-amber-500/10" />
        {/* 5-year avg marker */}
        {avgPos != null && (
          <div
            className="absolute top-0 h-full w-px bg-neutral-500"
            style={{ left: `${avgPos}%` }}
          >
            <div className="absolute -top-3 -translate-x-1/2 text-[6px] font-mono text-neutral-500 uppercase whitespace-nowrap">
              5Y Avg
            </div>
          </div>
        )}
        {/* Current position marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-orange-400"
          style={{ left: `${currentPos}%` }}
        >
          <div className="absolute -bottom-3 -translate-x-1/2 text-[6px] font-mono text-orange-400 font-bold whitespace-nowrap">
            Current
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[7px] font-mono mt-3">
        <span className="text-neutral-500">{fmtNum(low)} (Low)</span>
        {percentInRange != null && (
          <span className="text-orange-400 font-bold">{percentInRange.toFixed(0)}% of range</span>
        )}
        <span className="text-neutral-500">{fmtNum(high)} (High)</span>
      </div>
    </div>
  );
}

// ── Regions Tab ──

function RegionsTab({ data }: { data: any }) {
  const regions: any[] = data.regions ?? [];

  if (regions.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No regional data available
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          Regional Storage Breakdown
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Region</th>
            <th className="px-2 py-1.5 text-right font-bold">Storage (Bcf)</th>
            <th className="px-2 py-1.5 text-right font-bold">Change</th>
            <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
            <th className="px-2 py-1.5 text-right font-bold">Capacity</th>
            <th className="px-2 py-1.5 text-right font-bold">% Full</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r: any, i: number) => (
            <tr key={r.region ?? i} className="border-b border-border/10 hover:bg-orange-400/[0.02]">
              <td className="px-2 py-1.5 font-bold text-orange-400">{r.region}</td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(r.storageBcf)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${injectionWithdrawalColor(r.change)}`}>
                {fmtChange(r.change)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${vs5yrAvgColor(r.vs5yrAvg)}`}>
                {fmtPct(r.vs5yrAvgPct)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/50">{fmtNum(r.capacity)}</td>
              <td className="px-2 py-1.5 text-right">
                <CapacityBar pct={r.pctFull} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Capacity Bar ──

function CapacityBar({ pct }: { pct: number | null | undefined }) {
  const val = pct ?? 0;
  const color =
    val >= 90 ? '#ef4444' :
    val >= 70 ? '#fbbf24' :
    '#22c55e';

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-14 h-1.5 bg-white/5 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(val, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold text-white/70">
        {val.toFixed(1)}%
      </span>
    </div>
  );
}

// ── History Tab ──

function HistoryTab({ data }: { data: any }) {
  const history: any[] = data.history ?? [];

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No history data available
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
          Weekly Storage Report (Last 12 Weeks)
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Week</th>
            <th className="px-2 py-1.5 text-right font-bold">Actual</th>
            <th className="px-2 py-1.5 text-right font-bold">Estimate</th>
            <th className="px-2 py-1.5 text-right font-bold">Surprise</th>
            <th className="px-2 py-1.5 text-right font-bold">Inj/Wdl</th>
            <th className="px-2 py-1.5 text-right font-bold">Total</th>
            <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
          </tr>
        </thead>
        <tbody>
          {history.map((r: any, i: number) => {
            const surprise = r.surprise ?? (r.actual != null && r.estimate != null ? r.actual - r.estimate : null);
            return (
              <tr key={r.week ?? i} className="border-b border-border/10 hover:bg-orange-400/[0.02]">
                <td className="px-2 py-1.5 text-white/60">{r.week}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${injectionWithdrawalColor(r.actual)}`}>
                  {fmtChange(r.actual)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/50">{fmtChange(r.estimate)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${surpriseColor(surprise)}`}>
                  {surprise != null ? (
                    <span className="flex items-center justify-end gap-1">
                      {fmtChange(surprise)}
                      <span className={`text-[6px] font-black uppercase ${surpriseColor(surprise)}`}>
                        {surprise > 0 ? 'BEAT' : surprise < 0 ? 'MISS' : 'IN-LINE'}
                      </span>
                    </span>
                  ) : '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <InjectionWithdrawalBar value={r.actual} />
                </td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtNum(r.totalStorage)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${vs5yrAvgColor(r.vs5yrAvg)}`}>
                  {fmtChange(r.vs5yrAvg)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Injection/Withdrawal Bar ──

function InjectionWithdrawalBar({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-zinc-500">-</span>;
  const maxAbs = 150;
  const pct = Math.min(Math.abs(value) / maxAbs, 1) * 50;
  const isInjection = value > 0;

  return (
    <div className="flex items-center justify-end">
      <div className="w-20 h-2 bg-white/5 relative">
        {/* Center line */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-white/10" />
        {isInjection ? (
          <div
            className="absolute top-0 h-full bg-green-500/60"
            style={{ left: '50%', width: `${pct}%` }}
          />
        ) : (
          <div
            className="absolute top-0 h-full bg-red-500/60"
            style={{ right: '50%', width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ── Forecast Tab ──

function ForecastTab({ data }: { data: any }) {
  const forecast = data.forecast ?? {};
  const projections: any[] = forecast.projections ?? [];
  const targets = forecast.endOfSeasonTargets ?? {};
  const henryHub = forecast.henryHub ?? {};

  return (
    <div className="space-y-0">
      {/* Henry Hub Context */}
      <div className="border-b border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          Henry Hub Price Context
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Spot</div>
            <div className="text-[11px] font-mono font-black text-orange-400">{fmtPrice(henryHub.spot)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">1M Change</div>
            <div className={`text-[11px] font-mono font-bold ${changeColor(henryHub.change1m)}`}>
              {fmtPct(henryHub.change1mPct)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Winter Strip</div>
            <div className="text-[11px] font-mono font-bold text-white/80">{fmtPrice(henryHub.winterStrip)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Summer Strip</div>
            <div className="text-[11px] font-mono font-bold text-white/80">{fmtPrice(henryHub.summerStrip)}</div>
          </div>
        </div>
      </div>

      {/* End-of-Season Targets */}
      <div className="border-b border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          End-of-Season Targets
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Injection Target</div>
            <div className="text-[11px] font-mono font-bold text-green-400">{fmtBcf(targets.injectionTarget)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Withdrawal Target</div>
            <div className="text-[11px] font-mono font-bold text-red-400">{fmtBcf(targets.withdrawalTarget)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">5Y Avg EOS</div>
            <div className="text-[11px] font-mono font-bold text-white/60">{fmtBcf(targets.fiveYrAvgEOS)}</div>
          </div>
        </div>
      </div>

      {/* Forward Storage Path */}
      {projections.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
              Forward Storage Path
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Period</th>
                <th className="px-2 py-1.5 text-right font-bold">Projected (Bcf)</th>
                <th className="px-2 py-1.5 text-right font-bold">5Y Avg</th>
                <th className="px-2 py-1.5 text-right font-bold">vs 5Y Avg</th>
                <th className="px-2 py-1.5 text-right font-bold">Implied Chg</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((r: any, i: number) => (
                <tr key={r.period ?? i} className="border-b border-border/10 hover:bg-orange-400/[0.02]">
                  <td className="px-2 py-1.5 text-white/60">{r.period}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(r.projected)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{fmtNum(r.fiveYrAvg)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${vs5yrAvgColor(r.vs5yrAvg)}`}>
                    {fmtChange(r.vs5yrAvg)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${injectionWithdrawalColor(r.impliedChange)}`}>
                    {fmtChange(r.impliedChange)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {projections.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No forecast data available
        </div>
      )}
    </div>
  );
}

// ── Supply Tab ──

function SupplyTab({ data }: { data: any }) {
  const supply = data.supply ?? {};
  const production = supply.production ?? {};
  const imports = supply.imports ?? {};
  const exports = supply.exports ?? {};
  const consumption = supply.consumption ?? {};
  const sectors: any[] = consumption.sectors ?? [];

  return (
    <div className="space-y-0">
      {/* Supply/Demand Balance Header */}
      <div className="border-b border-border/20 p-3">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
          Supply / Demand Balance
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Production</div>
            <div className="text-[11px] font-mono font-black text-orange-400">{fmtBcfd(production.current)}</div>
            <div className={`text-[8px] font-mono ${changeColor(production.change)}`}>
              {fmtChange(production.change)} Bcf/d vs prior
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Imports</div>
            <div className="text-[11px] font-mono font-bold text-white/80">{fmtBcfd(imports.current)}</div>
            <div className={`text-[8px] font-mono ${changeColor(imports.change)}`}>
              {fmtChange(imports.change)} Bcf/d
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Exports (LNG)</div>
            <div className="text-[11px] font-mono font-bold text-white/80">{fmtBcfd(exports.lng)}</div>
            <div className={`text-[8px] font-mono ${changeColor(exports.lngChange)}`}>
              {fmtChange(exports.lngChange)} Bcf/d
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Exports (Pipeline)</div>
            <div className="text-[11px] font-mono font-bold text-white/80">{fmtBcfd(exports.pipeline)}</div>
            <div className={`text-[8px] font-mono ${changeColor(exports.pipelineChange)}`}>
              {fmtChange(exports.pipelineChange)} Bcf/d
            </div>
          </div>
        </div>
      </div>

      {/* Net Balance */}
      <div className="border-b border-border/20 p-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Total Supply</div>
            <div className="text-[11px] font-mono font-bold text-green-400">{fmtBcfd(supply.totalSupply)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Total Demand</div>
            <div className="text-[11px] font-mono font-bold text-red-400">{fmtBcfd(supply.totalDemand)}</div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase">Net Balance</div>
            <div className={`text-[11px] font-mono font-bold ${changeColor(supply.netBalance)}`}>
              {fmtBcfd(supply.netBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* Consumption by Sector */}
      {sectors.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-wider">
              Consumption by Sector
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Sector</th>
                <th className="px-2 py-1.5 text-right font-bold">Bcf/d</th>
                <th className="px-2 py-1.5 text-right font-bold">% of Total</th>
                <th className="px-2 py-1.5 text-right font-bold">vs Prior</th>
                <th className="px-2 py-1.5 text-right font-bold">vs Year-Ago</th>
                <th className="px-2 py-1.5 text-right font-bold">Share</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s: any, i: number) => (
                <tr key={s.sector ?? i} className="border-b border-border/10 hover:bg-orange-400/[0.02]">
                  <td className="px-2 py-1.5 font-bold text-orange-400">{s.sector}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtBcfd(s.bcfd)}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {s.pctOfTotal != null ? s.pctOfTotal.toFixed(1) + '%' : '-'}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(s.vsPrior)}`}>
                    {fmtPct(s.vsPriorPct)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${changeColor(s.vsYearAgo)}`}>
                    {fmtPct(s.vsYearAgoPct)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <SectorShareBar pct={s.pctOfTotal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sectors.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No consumption data available
        </div>
      )}
    </div>
  );
}

// ── Sector Share Bar ──

function SectorShareBar({ pct }: { pct: number | null | undefined }) {
  const val = pct ?? 0;

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-12 h-1.5 bg-white/5 relative">
        <div
          className="absolute top-0 left-0 h-full bg-orange-500/60"
          style={{ width: `${Math.min(val, 100)}%` }}
        />
      </div>
      <span className="text-[8px] font-mono text-white/50">
        {val.toFixed(1)}%
      </span>
    </div>
  );
}
