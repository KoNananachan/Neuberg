import { useSovereignDebtMonitor } from '../../api/hooks/use-sovereign-debt-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtPctSigned(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtCds(n: number): string {
  return n.toFixed(0);
}

function fmtDebt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}Q`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}T`;
  return `$${n.toFixed(0)}B`;
}

function fmtBps(n: number): string {
  return n.toFixed(1);
}

// ── Color helpers ──

function debtToGdpColor(val: number): string {
  if (val > 100) return 'text-red-400';
  if (val >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

function deficitColor(val: number): string {
  if (val < -5) return 'text-red-400';
  if (val < -3) return 'text-orange-400';
  if (val < 0) return 'text-yellow-400';
  return 'text-green-400';
}

function yieldColor(val: number): string {
  if (val > 8) return 'text-red-400';
  if (val > 5) return 'text-orange-400';
  if (val > 3) return 'text-yellow-400';
  return 'text-neutral-300';
}

function cdsColor(spread: number): string {
  if (spread > 400) return 'text-red-400';
  if (spread > 200) return 'text-orange-400';
  if (spread > 100) return 'text-yellow-400';
  return 'text-neutral-300';
}

function outlookColor(outlook: string): string {
  const o = (outlook ?? '').toLowerCase();
  if (o === 'negative') return 'text-red-400';
  if (o === 'positive') return 'text-green-400';
  return 'text-neutral-500';
}

function outlookBg(outlook: string): string {
  const o = (outlook ?? '').toLowerCase();
  if (o === 'negative') return 'bg-red-400/10';
  if (o === 'positive') return 'bg-green-400/10';
  return 'bg-neutral-500/10';
}

function interestRevenueColor(val: number): string {
  if (val > 25) return 'text-red-400';
  if (val > 15) return 'text-orange-400';
  if (val > 10) return 'text-yellow-400';
  return 'text-neutral-300';
}

function balanceColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function debtServiceColor(val: number): string {
  if (val > 30) return 'text-red-400';
  if (val > 20) return 'text-orange-400';
  if (val > 10) return 'text-yellow-400';
  return 'text-neutral-300';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-orange-400/30">
      <div className="w-1 h-1 shrink-0 bg-orange-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-orange-400">
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

// ── Country Profiles Table ──

function CountryProfilesTable({ profiles }: { profiles: any[] }) {
  const items = Array.isArray(profiles) ? profiles : [];
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Debt/GDP" align="right" />
            <ThCell label="Deficit/GDP" align="right" />
            <ThCell label="10Y Yield" align="right" />
            <ThCell label="CDS 5Y" align="right" />
            <ThCell label="Rating" align="left" />
            <ThCell label="Outlook" align="left" />
          </tr>
        </thead>
        <tbody>
          {items.map((c: any, idx: number) => (
            <tr
              key={c?.isoCode ?? c?.country ?? idx}
              className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
            >
              <td className="px-1.5 py-1 whitespace-nowrap text-left">
                <span className="text-white font-bold">{c?.isoCode ?? ''}</span>
                <span className="text-neutral-600 ml-1">{c?.country ?? ''}</span>
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtToGdpColor(c?.debtToGdp ?? 0)}`}>
                {fmtPct(c?.debtToGdp ?? 0)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${deficitColor(c?.deficitToGdp ?? 0)}`}>
                {fmtPctSigned(c?.deficitToGdp ?? 0)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${yieldColor(c?.tenYearYield ?? 0)}`}>
                {fmtYield(c?.tenYearYield ?? 0)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${cdsColor(c?.cdsSpread ?? 0)}`}>
                {fmtCds(c?.cdsSpread ?? 0)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300 font-bold">
                {c?.rating ?? '\u2014'}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left">
                <span
                  className={`text-[7px] font-bold px-1 py-0.5 uppercase ${outlookColor(c?.outlook ?? '')} ${outlookBg(c?.outlook ?? '')}`}
                >
                  {c?.outlook ?? '\u2014'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Debt Sustainability Table ──

function DebtSustainabilityTable({ sustainability }: { sustainability: any[] }) {
  const items = Array.isArray(sustainability) ? sustainability : [];
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Country" align="left" />
            <ThCell label="Interest/Revenue" align="right" />
            <ThCell label="Primary Balance" align="right" />
            <ThCell label="Debt Service" align="right" />
          </tr>
        </thead>
        <tbody>
          {items.map((s: any, idx: number) => (
            <tr
              key={s?.isoCode ?? s?.country ?? idx}
              className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
            >
              <td className="px-1.5 py-1 whitespace-nowrap text-left">
                <span className="text-white font-bold">{s?.isoCode ?? ''}</span>
                <span className="text-neutral-600 ml-1">{s?.country ?? ''}</span>
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${interestRevenueColor(s?.interestToRevenue ?? 0)}`}>
                {fmtPct(s?.interestToRevenue ?? 0)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right ${balanceColor(s?.primaryBalance ?? 0)}`}>
                {fmtPctSigned(s?.primaryBalance ?? 0)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtServiceColor(s?.debtService ?? 0)}`}>
                {fmtPct(s?.debtService ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Global Summary Stats ──

function GlobalSummaryStats({ summary, t }: { summary: any; t: ReturnType<typeof useT> }) {
  if (!summary) return null;

  const metrics = [
    {
      label: tr(t, 'sdmTotalGlobalDebt', 'Total Global Debt'),
      value: summary.totalGlobalDebt != null ? fmtDebt(summary.totalGlobalDebt) : '\u2014',
      color: 'text-orange-400',
    },
    {
      label: tr(t, 'sdmAvgDebtGdp', 'Avg Debt/GDP'),
      value: summary.avgDebtToGdp != null ? fmtPct(summary.avgDebtToGdp) : '\u2014',
      color: summary.avgDebtToGdp > 80 ? 'text-red-400' : 'text-orange-400',
    },
    {
      label: tr(t, 'sdmAvgYield', 'Avg 10Y Yield'),
      value: summary.avgYield != null ? fmtYield(summary.avgYield) : '\u2014',
      color: 'text-neutral-300',
    },
    {
      label: tr(t, 'sdmAvgCds', 'Avg CDS 5Y'),
      value: summary.avgCds != null ? `${fmtBps(summary.avgCds)} bps` : '\u2014',
      color: 'text-neutral-300',
    },
    {
      label: tr(t, 'sdmNegOutlook', 'Negative Outlook'),
      value: summary.countriesNegativeOutlook != null ? String(summary.countriesNegativeOutlook) : '\u2014',
      color: (summary.countriesNegativeOutlook ?? 0) > 0 ? 'text-red-400' : 'text-green-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-orange-400/30 bg-black">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-orange-400/10 last:border-r-0">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {m.label}
          </div>
          <div className={`text-[10px] font-mono font-bold ${m.color}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function SovereignDebtMonitorPanel() {
  const t = useT();
  const { data, isLoading } = useSovereignDebtMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-orange-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-orange-400">
            {tr(t, 'sdmTitle', 'Sovereign Debt Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString()}
            </span>
          )}
          <RefreshCw className={`w-3 h-3 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
      </div>

      {/* Loading */}
      {isLoading && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-orange-400 uppercase tracking-wider animate-pulse">
            Loading...
          </span>
        </div>
      )}

      {/* No data */}
      {!d && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data available')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {d && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Global Summary Stats */}
          {d?.summary && (
            <GlobalSummaryStats summary={d.summary} t={t} />
          )}

          {/* Country Profiles */}
          {d?.countryProfiles && d.countryProfiles.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'sdmCountryProfiles', 'Country Profiles')} />
              <CountryProfilesTable profiles={d.countryProfiles} />
            </>
          )}

          {/* Debt Sustainability */}
          {d?.debtSustainability && d.debtSustainability.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'sdmDebtSustainability', 'Debt Sustainability')} />
              <DebtSustainabilityTable sustainability={d.debtSustainability} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
