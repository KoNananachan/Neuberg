import { useState } from 'react';
import { useSovereignDebtMaturity } from '../../api/hooks/use-sovereign-debt-maturity';
import { RefreshCw } from 'lucide-react';

// ── Tabs ──

type Tab = 'overview' | 'maturity-wall' | 'auctions' | 'ratings' | 'global';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'maturity-wall', label: 'Maturity Wall' },
  { key: 'auctions', label: 'Auctions' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'global', label: 'Global' },
];

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtDebt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}Q`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}T`;
  return `$${n.toFixed(0)}B`;
}

function fmtMaturity(n: number): string {
  return `${n.toFixed(1)}y`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)} bps`;
}

function fmtDate(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

// ── Color helpers ──

function debtToGdpColor(val: number): string {
  if (val > 100) return 'text-red-400';
  if (val >= 60) return 'text-amber-400';
  return 'text-green-400';
}

function avgMaturityColor(val: number): string {
  if (val < 4) return 'text-red-400';
  if (val < 6) return 'text-amber-400';
  return 'text-green-400';
}

function ratingColor(rating: string): string {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('AAA') || r.startsWith('AA')) return 'text-green-400';
  if (r.startsWith('A')) return 'text-emerald-400';
  if (r.startsWith('BBB')) return 'text-green-400';
  if (r.startsWith('BB')) return 'text-red-400';
  if (r.startsWith('B') || r.startsWith('CCC') || r.startsWith('CC') || r.startsWith('C') || r.startsWith('D'))
    return 'text-red-400';
  return 'text-neutral-400';
}

function ratingBgColor(rating: string): string {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('AAA') || r.startsWith('AA')) return 'bg-green-400/10';
  if (r.startsWith('A')) return 'bg-emerald-400/10';
  if (r.startsWith('BBB')) return 'bg-green-400/10';
  return 'bg-red-400/10';
}

function isInvestmentGrade(rating: string): boolean {
  const r = (rating ?? '').toUpperCase();
  return r.startsWith('AAA') || r.startsWith('AA') || r.startsWith('A') || r.startsWith('BBB');
}

function refinancingColor(pct: number): string {
  if (pct > 20) return 'text-red-400';
  if (pct > 12) return 'text-amber-400';
  return 'text-neutral-300';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20">
      <div className="w-1 h-1 shrink-0 bg-rose-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-rose-400">
        {title}
      </span>
    </div>
  );
}

// ── Table header cell ──

function Th({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-rose-400/70 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Overview Tab ──

function OverviewTab({
  data,
  onSelectCountry,
  selectedCountry,
}: {
  data: any;
  onSelectCountry: (code: string) => void;
  selectedCountry: string;
}) {
  const countries = Array.isArray(data?.countries) ? data.countries : [];

  if (countries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-neutral-600 uppercase">No country data available</span>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Country Debt Overview" />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black z-10">
            <tr className="border-b border-border/20">
              <Th label="Country" align="left" />
              <Th label="Debt/GDP" align="right" />
              <Th label="Total Outstd" align="right" />
              <Th label="Avg Maturity" align="right" />
              <Th label="10Y Yield" align="right" />
              <Th label="Refi Need" align="right" />
            </tr>
          </thead>
          <tbody>
            {countries.map((c: any) => {
              const code = c?.isoCode ?? c?.code ?? '';
              const isSelected = selectedCountry === code;
              return (
                <tr
                  key={code || c?.name}
                  onClick={() => onSelectCountry(code)}
                  className={`border-b border-border/10 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-rose-400/[0.06]'
                      : 'hover:bg-rose-400/[0.02]'
                  }`}
                >
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span className="text-white font-bold">{code}</span>
                    <span className="text-neutral-600 ml-1">{c?.name ?? ''}</span>
                  </td>
                  <td
                    className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtToGdpColor(c?.debtToGdp ?? 0)}`}
                  >
                    {fmtPct(c?.debtToGdp ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                    {fmtDebt(c?.totalOutstanding ?? 0)}
                  </td>
                  <td
                    className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${avgMaturityColor(c?.avgMaturity ?? 0)}`}
                  >
                    {fmtMaturity(c?.avgMaturity ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                    {fmtYield(c?.tenYearYield ?? 0)}
                  </td>
                  <td
                    className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${refinancingColor(c?.refinancingNeed ?? 0)}`}
                  >
                    {fmtPct(c?.refinancingNeed ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Maturity Wall Tab (text-based horizontal bar chart) ──

function MaturityWallTab({
  data,
  selectedCountry,
}: {
  data: any;
  selectedCountry: string;
}) {
  const countries = Array.isArray(data?.countries) ? data.countries : [];
  const country = countries.find(
    (c: any) => (c?.isoCode ?? c?.code) === selectedCountry,
  );

  if (!selectedCountry) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-neutral-600 uppercase">
          Select a country from Overview tab
        </span>
      </div>
    );
  }

  const profile = country?.maturityProfile ?? data?.maturityProfiles?.[selectedCountry];
  const quarters = Array.isArray(profile) ? profile : [];

  if (quarters.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-neutral-600 uppercase">
          No maturity profile for {selectedCountry}
        </span>
      </div>
    );
  }

  const maxAmount = Math.max(...quarters.map((q: any) => q?.amount ?? 0), 1);
  const BAR_MAX_CHARS = 40;

  return (
    <div>
      <SectionHeader title={`${selectedCountry} Maturity Profile`} />

      {/* Country summary line */}
      {country && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20 bg-black">
          <div>
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="text-[10px] font-mono font-bold text-rose-400">
              {fmtDebt(country.totalOutstanding ?? 0)}
            </div>
          </div>
          <div>
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              Avg Maturity
            </span>
            <div className={`text-[10px] font-mono font-bold ${avgMaturityColor(country.avgMaturity ?? 0)}`}>
              {fmtMaturity(country.avgMaturity ?? 0)}
            </div>
          </div>
          <div>
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              Debt/GDP
            </span>
            <div className={`text-[10px] font-mono font-bold ${debtToGdpColor(country.debtToGdp ?? 0)}`}>
              {fmtPct(country.debtToGdp ?? 0)}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            Quarterly Maturity Breakdown
          </span>
        </div>

        {quarters.map((q: any, i: number) => {
          const label = q?.label ?? q?.quarter ?? `Q${i + 1}`;
          const amount = q?.amount ?? 0;
          const barLen = maxAmount > 0 ? Math.round((amount / maxAmount) * BAR_MAX_CHARS) : 0;
          const barStr = '\u2588'.repeat(barLen);
          const isLarge = amount / maxAmount > 0.7;

          return (
            <div
              key={label}
              className="flex items-center gap-2 py-0.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
            >
              <span className="w-16 shrink-0 text-[8px] font-mono text-neutral-400 text-right">
                {label}
              </span>
              <span
                className={`text-[8px] font-mono leading-none ${
                  isLarge ? 'text-rose-400' : 'text-rose-400/60'
                }`}
              >
                {barStr || '\u2502'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 ml-auto shrink-0">
                {fmtDebt(amount)}
              </span>
            </div>
          );
        })}

        {/* Scale */}
        <div className="flex justify-between mt-1 pt-1 border-t border-border/10">
          <span className="text-[6px] font-mono text-neutral-700">0</span>
          <span className="text-[6px] font-mono text-neutral-700">{fmtDebt(maxAmount)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Auctions Tab ──

function AuctionsTab({ data }: { data: any }) {
  const auctions = Array.isArray(data?.auctions) ? data.auctions : [];

  if (auctions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-neutral-600 uppercase">No upcoming auctions</span>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Upcoming Sovereign Auctions" />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black z-10">
            <tr className="border-b border-border/20">
              <Th label="Date" align="left" />
              <Th label="Country" align="left" />
              <Th label="Tenor" align="left" />
              <Th label="Size" align="right" />
              <Th label="Coupon" align="right" />
              <Th label="Type" align="left" />
            </tr>
          </thead>
          <tbody>
            {auctions.map((a: any, idx: number) => (
              <tr
                key={`${a?.country ?? ''}-${a?.date ?? ''}-${idx}`}
                className="border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-300">
                  {fmtDate(a?.date ?? '')}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className="text-white font-bold">{a?.isoCode ?? a?.country ?? ''}</span>
                  {a?.name && <span className="text-neutral-600 ml-1">{a.name}</span>}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-rose-400/80 font-bold">
                  {a?.tenor ?? '--'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {a?.size != null ? fmtDebt(a.size) : '--'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {a?.coupon != null ? fmtYield(a.coupon) : '--'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-500">
                  {a?.type ?? '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ratings Tab ──

function RatingsTab({ data }: { data: any }) {
  const countries = Array.isArray(data?.countries) ? data.countries : [];
  const ratings = Array.isArray(data?.ratings)
    ? data.ratings
    : countries.filter((c: any) => c?.rating);

  if (ratings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] font-mono text-neutral-600 uppercase">No ratings data available</span>
      </div>
    );
  }

  const sorted = [...ratings].sort((a: any, b: any) => {
    const aIG = isInvestmentGrade(a?.rating ?? '');
    const bIG = isInvestmentGrade(b?.rating ?? '');
    if (aIG !== bIG) return aIG ? -1 : 1;
    return (a?.spreadVsUst ?? 0) - (b?.spreadVsUst ?? 0);
  });

  return (
    <div>
      <SectionHeader title="Sovereign Credit Ratings" />

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-1 border-b border-border/20">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400/50" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Investment Grade</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-400/50" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Sub-IG</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black z-10">
            <tr className="border-b border-border/20">
              <Th label="Country" align="left" />
              <Th label="S&P" align="left" />
              <Th label="Moody's" align="left" />
              <Th label="Fitch" align="left" />
              <Th label="Outlook" align="left" />
              <Th label="Sprd vs UST" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r: any, idx: number) => {
              const code = r?.isoCode ?? r?.code ?? '';
              const spRating = r?.sp ?? r?.rating ?? '';
              const moodys = r?.moodys ?? '--';
              const fitch = r?.fitch ?? '--';
              const outlook = r?.outlook ?? r?.ratingOutlook ?? '--';
              const spread = r?.spreadVsUst ?? r?.spread ?? 0;
              const ig = isInvestmentGrade(spRating);

              return (
                <tr
                  key={code || idx}
                  className={`border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors ${
                    ig ? '' : 'bg-red-400/[0.02]'
                  }`}
                >
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span className="text-white font-bold">{code}</span>
                    <span className="text-neutral-600 ml-1">{r?.name ?? ''}</span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span
                      className={`text-[8px] font-bold px-1 py-0.5 ${ratingColor(spRating)} ${ratingBgColor(spRating)}`}
                    >
                      {spRating || '--'}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span
                      className={`text-[8px] font-bold px-1 py-0.5 ${ratingColor(moodys)} ${ratingBgColor(moodys)}`}
                    >
                      {moodys}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span
                      className={`text-[8px] font-bold px-1 py-0.5 ${ratingColor(fitch)} ${ratingBgColor(fitch)}`}
                    >
                      {fitch}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-left">
                    <span
                      className={`text-[7px] font-bold px-1 py-0.5 uppercase ${
                        outlook === 'Negative' || outlook === 'NEGATIVE'
                          ? 'text-red-400 bg-red-400/10'
                          : outlook === 'Positive' || outlook === 'POSITIVE'
                            ? 'text-green-400 bg-green-400/10'
                            : 'text-neutral-500 bg-neutral-500/10'
                      }`}
                    >
                      {outlook}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                    {fmtBps(spread)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Global Tab ──

function GlobalTab({ data }: { data: any }) {
  const global = data?.global ?? data?.summary ?? {};
  const countries = Array.isArray(data?.countries) ? data.countries : [];

  // Countries sorted by refinancing need (heaviest first)
  const heaviestRefi = [...countries]
    .sort((a: any, b: any) => (b?.refinancingNeed ?? 0) - (a?.refinancingNeed ?? 0))
    .slice(0, 10);

  // Maturity wall summary from global data
  const maturitySummary = Array.isArray(data?.globalMaturityWall)
    ? data.globalMaturityWall
    : [];

  return (
    <div>
      {/* Global summary metrics */}
      <SectionHeader title="Global Sovereign Debt Summary" />
      <div className="grid grid-cols-4 border-b border-border/20 bg-black">
        <div className="px-2 py-1.5 border-r border-border/10">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            Total Global Debt
          </div>
          <div className="text-[10px] font-mono font-bold text-rose-400">
            {global?.totalGlobalDebt != null ? fmtDebt(global.totalGlobalDebt) : '--'}
          </div>
        </div>
        <div className="px-2 py-1.5 border-r border-border/10">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            Avg Debt/GDP
          </div>
          <div className={`text-[10px] font-mono font-bold ${debtToGdpColor(global?.avgDebtToGdp ?? 0)}`}>
            {global?.avgDebtToGdp != null ? fmtPct(global.avgDebtToGdp) : '--'}
          </div>
        </div>
        <div className="px-2 py-1.5 border-r border-border/10">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            Avg 10Y Yield
          </div>
          <div className="text-[10px] font-mono font-bold text-neutral-300">
            {global?.avgYield != null ? fmtYield(global.avgYield) : '--'}
          </div>
        </div>
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            Countries Tracked
          </div>
          <div className="text-[10px] font-mono font-bold text-rose-400">
            {countries.length}
          </div>
        </div>
      </div>

      {/* Heaviest refinancing needs */}
      {heaviestRefi.length > 0 && (
        <>
          <SectionHeader title="Heaviest Refinancing Needs" />
          <div className="px-3 py-1.5">
            {heaviestRefi.map((c: any) => {
              const code = c?.isoCode ?? c?.code ?? '';
              const refiNeed = c?.refinancingNeed ?? 0;
              const maxRefi = heaviestRefi[0]?.refinancingNeed ?? 1;
              const barPct = maxRefi > 0 ? (refiNeed / maxRefi) * 100 : 0;

              return (
                <div
                  key={code}
                  className="flex items-center gap-2 py-0.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
                >
                  <span className="w-8 shrink-0 text-[8px] font-mono font-bold text-white">
                    {code}
                  </span>
                  <span className="w-20 shrink-0 text-[8px] font-mono text-neutral-600 truncate">
                    {c?.name ?? ''}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full ${refiNeed > 20 ? 'bg-red-400/70' : refiNeed > 12 ? 'bg-amber-400/70' : 'bg-rose-400/40'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span
                    className={`w-12 shrink-0 text-[8px] font-mono font-bold text-right ${refinancingColor(refiNeed)}`}
                  >
                    {fmtPct(refiNeed)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Global maturity wall summary */}
      {maturitySummary.length > 0 && (
        <>
          <SectionHeader title="Global Maturity Wall" />
          <div className="px-3 py-1.5">
            {(() => {
              const maxAmt = Math.max(
                ...maturitySummary.map((m: any) => m?.amount ?? 0),
                1,
              );
              return maturitySummary.map((m: any, idx: number) => {
                const label = m?.year ?? m?.label ?? `${idx}`;
                const amount = m?.amount ?? 0;
                const barPct = maxAmt > 0 ? (amount / maxAmt) * 100 : 0;

                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 py-0.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
                  >
                    <span className="w-10 shrink-0 text-[8px] font-mono text-neutral-400 text-right">
                      {label}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full bg-rose-400/50"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-[8px] font-mono text-neutral-300 text-right">
                      {fmtDebt(amount)}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* Fallback if no maturity wall and no refi data */}
      {heaviestRefi.length === 0 && maturitySummary.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            No global summary data available
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function SovereignDebtMaturityPanel() {
  const { data, isLoading, refetch } = useSovereignDebtMaturity();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  const d = data as any;

  const handleSelectCountry = (code: string) => {
    setSelectedCountry(code);
    setActiveTab('maturity-wall');
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            Sovereign Debt Maturity
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Tab bar */}
      <div className="flex items-center border-b border-border/20 bg-black shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-rose-400 border-rose-400'
                : 'text-neutral-600 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {/* Loading */}
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest animate-pulse">
              LOADING SOVEREIGN DEBT DATA...
            </span>
          </div>
        )}

        {/* No data */}
        {!d && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-neutral-600 uppercase">
              No data available
            </span>
          </div>
        )}

        {/* Tab content */}
        {d && (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                data={d}
                onSelectCountry={handleSelectCountry}
                selectedCountry={selectedCountry}
              />
            )}
            {activeTab === 'maturity-wall' && (
              <MaturityWallTab data={d} selectedCountry={selectedCountry} />
            )}
            {activeTab === 'auctions' && <AuctionsTab data={d} />}
            {activeTab === 'ratings' && <RatingsTab data={d} />}
            {activeTab === 'global' && <GlobalTab data={d} />}
          </>
        )}
      </div>
    </div>
  );
}
