import { useCountryRisk } from '../../api/hooks/use-country-risk';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Shield } from 'lucide-react';

// i18n fallback helper
// ── Types (matching server response) ──

interface CountryRiskScore {
  country: string;
  isoCode: string;
  overallRisk: number;
  creditRating: string;
  cds5y: number;
  fxVolatility: number;
  politicalRisk: number;
  economicRisk: number;
  change1w: number;
}

interface RiskEvent {
  country: string;
  event: string;
  date: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface FxReservesEntry {
  country: string;
  reserves: number;
  monthsImportCover: number;
  change3m: number;
  adequacyRatio: number;
}

interface CountryRiskSummary {
  avgEmRisk: number;
  highRiskCount: number;
  avgEmCds: number;
  globalRiskTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  timestamp: string;
}

interface CountryRiskData {
  riskScores: CountryRiskScore[];
  riskEvents: RiskEvent[];
  fxReserves: FxReservesEntry[];
  summary: CountryRiskSummary;
}

// ── Color helpers ──

function riskBarColor(score: number): string {
  if (score < 30) return '#34d399'; // green
  if (score <= 60) return '#fbbf24'; // yellow
  return '#f87171'; // red
}

function changeColor(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function changeSign(value: number): string {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function cdsColor(spread: number): string {
  if (spread > 500) return 'text-red-400';
  if (spread > 200) return 'text-orange-400';
  if (spread > 100) return 'text-yellow-400';
  return 'text-emerald-400';
}

function trendBadge(trend: string): { text: string; color: string; bg: string } {
  switch (trend) {
    case 'IMPROVING':
      return { text: 'IMPROVING', color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    case 'DETERIORATING':
      return { text: 'DETERIORATING', color: 'text-red-400', bg: 'bg-red-400/15' };
    default:
      return { text: 'STABLE', color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
  }
}

function impactBadge(level: string): { color: string; bg: string } {
  switch (level) {
    case 'HIGH':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'MEDIUM':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    default:
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
  }
}

function reserveChangeColor(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function adequacyColor(ratio: number): string {
  if (ratio >= 2.0) return 'text-emerald-400';
  if (ratio >= 1.0) return 'text-yellow-400';
  return 'text-red-400';
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

// ── Risk Score Bar ──

function RiskBar({ score }: { score: number }) {
  const color = riskBarColor(score);
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary, t }: { summary: CountryRiskSummary; t: ReturnType<typeof useT> }) {
  const trend = trendBadge(summary.globalRiskTrend);

  const metrics = [
    {
      label: tr(t, 'crAvgEmRisk', 'Avg EM Risk'),
      value: summary.avgEmRisk.toFixed(1),
      color: summary.avgEmRisk >= 60 ? 'text-red-400' : summary.avgEmRisk >= 40 ? 'text-yellow-400' : 'text-emerald-400',
    },
    {
      label: tr(t, 'crHighRisk', 'High Risk'),
      value: String(summary.highRiskCount),
      color: summary.highRiskCount > 3 ? 'text-red-400' : 'text-yellow-400',
    },
    {
      label: tr(t, 'crAvgEmCds', 'Avg EM CDS'),
      value: `${summary.avgEmCds.toFixed(0)} bps`,
      color: 'text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-rose-400/30 bg-black">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-rose-400/10">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {m.label}
          </div>
          <div className={`text-[10px] font-mono font-bold ${m.color}`}>
            {m.value}
          </div>
        </div>
      ))}
      <div className="px-2 py-1.5">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'crGlobalTrend', 'Global Risk Trend')}
        </div>
        <span className={`text-[9px] font-mono font-black uppercase px-1 py-0.5 ${trend.color} ${trend.bg}`}>
          {trend.text}
        </span>
      </div>
    </div>
  );
}

// ── Country Risk Scores Table ──

function RiskScoresTable({ scores }: { scores: CountryRiskScore[] }) {
  const sorted = [...scores].sort((a, b) => b.overallRisk - a.overallRisk);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Rating" align="left" />
            <ThCell label="Overall Risk" align="left" />
            <ThCell label="CDS 5Y (bps)" align="right" />
            <ThCell label="FX Vol (%)" align="right" />
            <ThCell label="Political" align="right" />
            <ThCell label="Economic" align="right" />
            <ThCell label="1W Chg" align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.isoCode} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left">
                <span className="text-white font-bold">{s.isoCode}</span>
                <span className="text-neutral-600 ml-1">{s.country}</span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300 font-bold">
                {s.creditRating}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left">
                <RiskBar score={s.overallRisk} />
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${cdsColor(s.cds5y)}`}>
                {s.cds5y.toFixed(1)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                {s.fxVolatility.toFixed(1)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${s.politicalRisk >= 60 ? 'text-red-400' : s.politicalRisk >= 40 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                {s.politicalRisk}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${s.economicRisk >= 60 ? 'text-red-400' : s.economicRisk >= 40 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                {s.economicRisk}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(s.change1w)}`}>
                {changeSign(s.change1w)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Upcoming Risk Events Table ──

function RiskEventsTable({ events }: { events: RiskEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Country" align="left" />
            <ThCell label="Event" align="left" />
            <ThCell label="Impact" align="left" />
            <ThCell label="Description" align="left" />
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => {
            const impact = impactBadge(ev.impactLevel);
            return (
              <tr key={`${ev.country}-${ev.event}-${i}`} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                  {ev.date}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {ev.country}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300">
                  {ev.event}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${impact.color} ${impact.bg}`}>
                    {ev.impactLevel}
                  </span>
                </td>
                <td className="px-1.5 py-1 text-left text-neutral-500 max-w-[240px] truncate">
                  {ev.description}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── FX Reserves Table ──

function FxReservesTable({ reserves }: { reserves: FxReservesEntry[] }) {
  const sorted = [...reserves].sort((a, b) => b.reserves - a.reserves);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Reserves ($B)" align="right" />
            <ThCell label="Months Import Cover" align="right" />
            <ThCell label="3M Change (%)" align="right" />
            <ThCell label="Adequacy Ratio" align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.country} className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                {r.country}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                {r.reserves >= 1000
                  ? `$${(r.reserves / 1000).toFixed(1)}T`
                  : `$${r.reserves.toFixed(0)}B`}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${r.monthsImportCover < 5 ? 'text-red-400' : r.monthsImportCover < 8 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                {r.monthsImportCover.toFixed(1)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${reserveChangeColor(r.change3m)}`}>
                {r.change3m > 0 ? '+' : ''}{r.change3m.toFixed(1)}%
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${adequacyColor(r.adequacyRatio)}`}>
                {r.adequacyRatio.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

// ── Main Panel ──

export function CountryRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCountryRisk();

  const riskData = data as CountryRiskData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-rose-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            {tr(t, 'crTitle', 'Country Risk Dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {riskData?.summary && (
            <span className="text-[8px] font-mono font-black tabular-nums text-rose-400">
              EM {riskData.summary.avgEmRisk.toFixed(1)}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-rose-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !riskData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!riskData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {riskData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          {riskData.summary && (
            <SummaryBar summary={riskData.summary} t={t} />
          )}

          {/* Country Risk Scores */}
          {riskData.riskScores && riskData.riskScores.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'crRiskScores', 'Country Risk Scores')} />
              <RiskScoresTable scores={riskData.riskScores} />
            </>
          )}

          {/* Upcoming Risk Events */}
          {riskData.riskEvents && riskData.riskEvents.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'crRiskEvents', 'Upcoming Risk Events')} />
              <RiskEventsTable events={riskData.riskEvents} />
            </>
          )}

          {/* FX Reserves */}
          {riskData.fxReserves && riskData.fxReserves.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'crFxReserves', 'FX Reserves')} />
              <FxReservesTable reserves={riskData.fxReserves} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
