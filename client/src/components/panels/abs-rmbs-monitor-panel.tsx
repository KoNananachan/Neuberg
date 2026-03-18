import { Loader2 } from 'lucide-react';
import { useAbsRmbsMonitor } from '../../api/hooks/use-abs-rmbs-monitor';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (_t: TFn, _key: string, fallback: string): string => {
  try { return (_t as (k: string) => string)(_key) || fallback; } catch { return fallback; }
};

const ACCENT = '#2dd4bf'; // teal-400

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)} bp`;
}

function fmtDollarB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

function fmtMonths(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(0)}`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function surpriseColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 2) return 'text-red-400';
  if (n > 0) return 'text-yellow-400';
  if (n < -2) return 'text-green-400';
  if (n < 0) return 'text-teal-400';
  return 'text-neutral-500';
}

function delinquencyColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 10) return 'text-red-400';
  if (n >= 5) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function lossSeverityColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 50) return 'text-red-400';
  if (n >= 30) return 'text-orange-400';
  if (n >= 15) return 'text-yellow-400';
  return 'text-green-400';
}

function cushionColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 10) return 'text-green-400';
  if (n >= 5) return 'text-yellow-400';
  if (n >= 0) return 'text-orange-400';
  return 'text-red-400';
}

function dq60PlusColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 8) return 'text-red-400';
  if (n >= 4) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function trendBadge(trend: string | null | undefined): { text: string; bg: string } {
  const s = trend?.toLowerCase() ?? '';
  if (s === 'improving' || s === 'decreasing' || s === 'tightening')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'deteriorating' || s === 'increasing' || s === 'widening')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (s === 'stable' || s === 'flat')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// ── Main Panel ──

export function AbsRmbsMonitorPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = useAbsRmbsMonitor() as { data: any; isLoading: boolean; error: any };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load ABS/RMBS data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {data.marketSummary && <MarketSummaryBar summary={data.marketSummary} />}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Prepayment Speeds */}
        {data.prepaymentSpeeds && data.prepaymentSpeeds.length > 0 && (
          <PrepaymentSpeedsTable rows={data.prepaymentSpeeds} t={t} />
        )}

        {/* Delinquency Data */}
        {data.delinquencyData && data.delinquencyData.length > 0 && (
          <DelinquencyTable rows={data.delinquencyData} t={t} />
        )}

        {/* Loss Severity */}
        {data.lossSeverity && data.lossSeverity.length > 0 && (
          <LossSeverityTable rows={data.lossSeverity} t={t} />
        )}

        {/* Vintage Analysis */}
        {data.vintageAnalysis && data.vintageAnalysis.length > 0 && (
          <VintageAnalysisTable rows={data.vintageAnalysis} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary }: { summary: any }) {
  const dominantBadge = trendBadge(summary.dominantTrend);

  return (
    <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      <SummaryItem label="Avg CPR" value={fmtPct(summary.avgCPR)} color={ACCENT} />
      <SummaryItem label="Total DQ Rate" value={fmtPct(summary.totalDelinquencyRate)} color={delinquencyColor(summary.totalDelinquencyRate) === 'text-green-400' ? '#4ade80' : delinquencyColor(summary.totalDelinquencyRate) === 'text-yellow-400' ? '#facc15' : delinquencyColor(summary.totalDelinquencyRate) === 'text-orange-400' ? '#fb923c' : '#f87171'} />
      <SummaryItem label="Avg Loss Severity" value={fmtPct(summary.avgLossSeverity)} />
      <SummaryItem label="New Issuance YTD" value={fmtDollarB(summary.newIssuanceYTD)} color={ACCENT} />
      <SummaryItem label="Spread to TSY" value={fmtBps(summary.spreadToTreasury)} />
      <div className="flex-1 min-w-0 px-2">
        <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">Dominant Trend</div>
        <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${dominantBadge.text} ${dominantBadge.bg}`}>
          {summary.dominantTrend ?? '-'}
        </span>
      </div>
    </div>
  );
}

// ── Prepayment Speeds Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PrepaymentSpeedsTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'absRmbs.prepaymentSpeeds', 'Prepayment Speeds')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR 1M</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR 3M</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR 6M</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR 12M</th>
            <th className="px-2 py-1.5 text-right font-bold">CPR Long</th>
            <th className="px-2 py-1.5 text-right font-bold">Model</th>
            <th className="px-2 py-1.5 text-right font-bold">Surprise</th>
            <th className="px-2 py-1.5 text-center font-bold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((r: any, i: number) => {
            const badge = trendBadge(r.trend);
            return (
              <tr key={`${r.sector}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
                <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.sector}</td>
                <td className="px-2 py-1.5 text-right text-white/80">{fmtPct(r.cpr1m)}</td>
                <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.cpr3m)}</td>
                <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.cpr6m)}</td>
                <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.cpr12m)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(r.cprLong)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(r.model)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${surpriseColor(r.surprise)}`}>
                  {r.surprise != null ? `${r.surprise >= 0 ? '+' : ''}${fmtNum(r.surprise)}` : '-'}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.text} ${badge.bg}`}>
                    {r.trend ?? '-'}
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

// ── Delinquency Data Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DelinquencyTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'absRmbs.delinquencyData', 'Delinquency Data')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Category</th>
            <th className="px-2 py-1.5 text-right font-bold">Current%</th>
            <th className="px-2 py-1.5 text-right font-bold">30D%</th>
            <th className="px-2 py-1.5 text-right font-bold">60D%</th>
            <th className="px-2 py-1.5 text-right font-bold">90D+%</th>
            <th className="px-2 py-1.5 text-right font-bold">Forecl%</th>
            <th className="px-2 py-1.5 text-right font-bold">REO%</th>
            <th className="px-2 py-1.5 text-right font-bold">Total DQ%</th>
            <th className="px-2 py-1.5 text-right font-bold">Change</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((r: any, i: number) => (
            <tr key={`${r.category}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.category}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtPct(r.current)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.dq30)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.dq60)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.dq90plus)}</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(r.foreclosure)}</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(r.reo)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${delinquencyColor(r.totalDQ)}`}>
                {fmtPct(r.totalDQ)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(r.change)}`}>
                {r.change != null ? `${r.change >= 0 ? '+' : ''}${fmtNum(r.change)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Loss Severity Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LossSeverityTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'absRmbs.lossSeverity', 'Loss Severity')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">Loss Sev%</th>
            <th className="px-2 py-1.5 text-right font-bold">Recovery%</th>
            <th className="px-2 py-1.5 text-right font-bold">Avg Timeline</th>
            <th className="px-2 py-1.5 text-right font-bold">Cum Loss%</th>
            <th className="px-2 py-1.5 text-right font-bold">Proj Loss%</th>
            <th className="px-2 py-1.5 text-right font-bold">Cushion%</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((r: any, i: number) => (
            <tr key={`${r.sector}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.sector}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${lossSeverityColor(r.lossSeverity)}`}>
                {fmtPct(r.lossSeverity)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.recoveryRate)}</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtMonths(r.avgTimeline)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.cumulativeLoss)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.projectedLoss)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${cushionColor(r.cushion)}`}>
                {fmtPct(r.cushion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Vintage Analysis Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VintageAnalysisTable({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'absRmbs.vintageAnalysis', 'Vintage Analysis')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Vintage</th>
            <th className="px-2 py-1.5 text-right font-bold">WAC</th>
            <th className="px-2 py-1.5 text-right font-bold">WAM</th>
            <th className="px-2 py-1.5 text-right font-bold">FICO</th>
            <th className="px-2 py-1.5 text-right font-bold">LTV%</th>
            <th className="px-2 py-1.5 text-right font-bold">DQ 60+%</th>
            <th className="px-2 py-1.5 text-right font-bold">Cum Loss%</th>
            <th className="px-2 py-1.5 text-right font-bold">Factor</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((r: any, i: number) => (
            <tr key={`${r.vintage}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
              <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.vintage}</td>
              <td className="px-2 py-1.5 text-right text-white/80">{fmtPct(r.wac)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(r.wam, 0)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(r.fico, 0)}</td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.ltv)}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${dq60PlusColor(r.dq60plus)}`}>
                {fmtPct(r.dq60plus)}
              </td>
              <td className="px-2 py-1.5 text-right text-white/70">{fmtPct(r.cumulativeLoss)}</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(r.factor, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Summary Item ──

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 min-w-0 px-2">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">{label}</div>
      <div className="text-[11px] font-mono font-black truncate" style={{ color: color ?? 'rgba(255,255,255,0.8)' }}>
        {value}
      </div>
    </div>
  );
}
