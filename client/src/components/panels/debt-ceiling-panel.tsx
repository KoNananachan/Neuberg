import { useDebtCeiling } from '../../api/hooks/use-debt-ceiling';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtTrillions(n: number): string {
  return `$${n.toFixed(3)}T`;
}

function fmtBillions(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function headroomColor(pct: number): string {
  if (pct <= 1) return 'text-red-400';
  if (pct <= 3) return 'text-orange-400';
  if (pct <= 5) return 'text-yellow-400';
  return 'text-emerald-400';
}

function headroomBarColor(pct: number): string {
  if (pct <= 1) return 'bg-red-400';
  if (pct <= 3) return 'bg-orange-400';
  if (pct <= 5) return 'bg-yellow-400';
  return 'bg-emerald-400';
}

function usagePctColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-orange-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-neutral-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function urgencyColor(level: string): { color: string; bg: string } {
  const l = level.toUpperCase();
  if (l === 'CRITICAL') return { color: 'text-red-400', bg: 'bg-red-400/15' };
  if (l === 'HIGH') return { color: 'text-orange-400', bg: 'bg-orange-400/15' };
  if (l === 'MEDIUM') return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
  return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
}

// ── Interfaces ──

interface DebtGauge {
  currentDebt: number;
  debtLimit: number;
  headroom: number;
  headroomPct: number;
  utilizationPct: number;
}

interface XDateProjection {
  projectedDate: string;
  daysRemaining: number;
  confidence: string;
  source: string;
}

interface ExtraordinaryMeasure {
  name: string;
  capacity: number;
  used: number;
  remaining: number;
}

interface TimelineEvent {
  date: string;
  event: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DailyBorrowing {
  date: string;
  amount: number;
  type: string;
}

interface HistoricalCeiling {
  date: string;
  limit: number;
  increase: number;
  method: string;
}

interface MarketImpact {
  instrument: string;
  value: number;
  change1d: number;
  change1w: number;
  unit: string;
}

interface DebtCeilingData {
  gauge: DebtGauge;
  xDate: XDateProjection;
  extraordinaryMeasures: ExtraordinaryMeasure[];
  timeline: TimelineEvent[];
  dailyBorrowing: DailyBorrowing[];
  historicalCeilings: HistoricalCeiling[];
  marketImpact: MarketImpact[];
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-rose-400/30">
      <div className="w-1 h-1 shrink-0 bg-rose-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-rose-400">
        {title}
      </span>
    </div>
  );
}

// ── Table header cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Debt Gauge Section ──

function DebtGaugeSection({ gauge }: { gauge: DebtGauge }) {
  return (
    <div className="border-b border-rose-400/30 bg-[#030303]">
      {/* Top metrics row */}
      <div className="grid grid-cols-3 divide-x divide-rose-400/10">
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Current Debt
          </div>
          <div className="text-[13px] font-mono font-bold text-white">
            {fmtTrillions(gauge.currentDebt)}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Debt Limit
          </div>
          <div className="text-[13px] font-mono font-bold text-rose-400">
            {fmtTrillions(gauge.debtLimit)}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Headroom
          </div>
          <div className={`text-[13px] font-mono font-bold ${headroomColor(gauge.headroomPct)}`}>
            {fmtBillions(gauge.headroom)}
          </div>
        </div>
      </div>

      {/* Visual gauge bar */}
      <div className="px-3 pb-2 pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Utilization
          </span>
          <span className={`text-[8px] font-mono font-bold ${headroomColor(gauge.headroomPct)}`}>
            {fmtPct(gauge.utilizationPct)}
          </span>
        </div>
        <div className="w-full h-2 bg-neutral-900 relative">
          <div
            className={`absolute top-0 left-0 h-full ${headroomBarColor(gauge.headroomPct)} transition-all`}
            style={{ width: `${Math.min(gauge.utilizationPct, 100)}%` }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 h-full w-px bg-yellow-400/40" style={{ left: '95%' }} />
          <div className="absolute top-0 h-full w-px bg-red-400/40" style={{ left: '99%' }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[6px] font-mono text-neutral-700">0%</span>
          <span className="text-[6px] font-mono text-yellow-400/60">95%</span>
          <span className="text-[6px] font-mono text-red-400/60">99%</span>
          <span className="text-[6px] font-mono text-neutral-700">100%</span>
        </div>
      </div>
    </div>
  );
}

// ── X-Date Countdown ──

function XDateSection({ xDate }: { xDate: XDateProjection }) {
  const daysColor =
    xDate.daysRemaining <= 30
      ? 'text-red-400'
      : xDate.daysRemaining <= 90
        ? 'text-orange-400'
        : xDate.daysRemaining <= 180
          ? 'text-yellow-400'
          : 'text-emerald-400';

  return (
    <div className="border-b border-rose-400/30 bg-[#030303]">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-rose-400/10">
        <div className="w-1 h-1 shrink-0 bg-rose-400" />
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-rose-400">
          X-Date Projection
        </span>
      </div>
      <div className="grid grid-cols-4 divide-x divide-rose-400/10">
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Projected Date
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {xDate.projectedDate}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Days Remaining
          </div>
          <div className={`text-[13px] font-mono font-bold tabular-nums ${daysColor}`}>
            {xDate.daysRemaining}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Confidence
          </div>
          <div className="text-[10px] font-mono font-bold text-neutral-300">
            {xDate.confidence}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Source
          </div>
          <div className="text-[10px] font-mono font-bold text-neutral-400 truncate">
            {xDate.source}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Extraordinary Measures Table ──

function ExtraordinaryMeasuresSection({ measures }: { measures: ExtraordinaryMeasure[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Measure" align="left" />
            <ThCell label="Capacity ($B)" align="right" />
            <ThCell label="Used ($B)" align="right" />
            <ThCell label="Remaining ($B)" align="right" />
            <ThCell label="Usage" align="left" />
          </tr>
        </thead>
        <tbody>
          {measures.map((m) => {
            const usedPct = m.capacity > 0 ? (m.used / m.capacity) * 100 : 0;
            return (
              <tr key={m.name} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-rose-400 font-bold">
                  {m.name}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {m.capacity.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white font-bold">
                  {m.used.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${usagePctColor(usedPct)}`}>
                  {m.remaining.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-neutral-900 relative">
                      <div
                        className="absolute top-0 left-0 h-full bg-rose-400"
                        style={{ width: `${Math.min(usedPct, 100)}%`, opacity: 0.7 }}
                      />
                    </div>
                    <span className={`text-[7px] font-mono font-bold tabular-nums ${usagePctColor(usedPct)}`}>
                      {usedPct.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Timeline Section ──

function TimelineSection({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Event" align="left" />
            <ThCell label="Significance" align="left" />
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => {
            const sig = urgencyColor(ev.significance);
            return (
              <tr key={`${ev.date}-${i}`} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                  {ev.date}
                </td>
                <td className="px-1.5 py-1 text-left text-neutral-300 max-w-[240px] truncate">
                  {ev.event}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${sig.color} ${sig.bg}`}>
                    {ev.significance}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Daily Borrowing Section ──

function DailyBorrowingSection({ borrowing }: { borrowing: DailyBorrowing[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Amount ($B)" align="right" />
            <ThCell label="Type" align="left" />
          </tr>
        </thead>
        <tbody>
          {borrowing.map((b, i) => (
            <tr key={`${b.date}-${i}`} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                {b.date}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-white font-bold">
                {b.amount.toFixed(1)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-500">
                {b.type}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Historical Ceilings Section ──

function HistoricalCeilingsSection({ ceilings }: { ceilings: HistoricalCeiling[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Limit ($T)" align="right" />
            <ThCell label="Increase ($T)" align="right" />
            <ThCell label="Method" align="left" />
          </tr>
        </thead>
        <tbody>
          {ceilings.map((c, i) => (
            <tr key={`${c.date}-${i}`} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                {c.date}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-white font-bold">
                {c.limit.toFixed(3)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-rose-400 font-bold">
                {c.increase > 0 ? '+' : ''}{c.increase.toFixed(3)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-500">
                {c.method}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Market Impact Section ──

function MarketImpactSection({ impacts }: { impacts: MarketImpact[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Instrument" align="left" />
            <ThCell label="Value" align="right" />
            <ThCell label="Unit" align="left" />
            <ThCell label="1D Chg" align="right" />
            <ThCell label="1W Chg" align="right" />
          </tr>
        </thead>
        <tbody>
          {impacts.map((m, i) => (
            <tr key={`${m.instrument}-${i}`} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-rose-400 font-bold">
                {m.instrument}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-white font-bold">
                {fmtBps(m.value)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-500">
                {m.unit}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(m.change1d)}`}>
                {fmtChg(m.change1d)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(m.change1w)}`}>
                {fmtChg(m.change1w)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function DebtCeilingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useDebtCeiling();

  const ceilingData = data as DebtCeilingData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-rose-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            {tr(t, 'panelDebtCeiling', 'Debt Ceiling Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ceilingData?.gauge && (
            <span className="text-[8px] font-mono font-black tabular-nums text-rose-400">
              {fmtPct(ceilingData.gauge.utilizationPct)} UTIL
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !ceilingData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!ceilingData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data available')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {ceilingData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Debt Gauge */}
          {ceilingData.gauge && (
            <DebtGaugeSection gauge={ceilingData.gauge} />
          )}

          {/* X-Date Countdown */}
          {ceilingData.xDate && (
            <XDateSection xDate={ceilingData.xDate} />
          )}

          {/* Extraordinary Measures */}
          {ceilingData.extraordinaryMeasures && ceilingData.extraordinaryMeasures.length > 0 && (
            <>
              <SectionHeader title="Extraordinary Measures" />
              <ExtraordinaryMeasuresSection measures={ceilingData.extraordinaryMeasures} />
            </>
          )}

          {/* Timeline */}
          {ceilingData.timeline && ceilingData.timeline.length > 0 && (
            <>
              <SectionHeader title="Key Dates & Events" />
              <TimelineSection events={ceilingData.timeline} />
            </>
          )}

          {/* Daily Borrowing */}
          {ceilingData.dailyBorrowing && ceilingData.dailyBorrowing.length > 0 && (
            <>
              <SectionHeader title="Daily Borrowing" />
              <DailyBorrowingSection borrowing={ceilingData.dailyBorrowing} />
            </>
          )}

          {/* Historical Ceilings */}
          {ceilingData.historicalCeilings && ceilingData.historicalCeilings.length > 0 && (
            <>
              <SectionHeader title="Historical Ceilings" />
              <HistoricalCeilingsSection ceilings={ceilingData.historicalCeilings} />
            </>
          )}

          {/* Market Impact */}
          {ceilingData.marketImpact && ceilingData.marketImpact.length > 0 && (
            <>
              <SectionHeader title="Market Impact" />
              <MarketImpactSection impacts={ceilingData.marketImpact} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
