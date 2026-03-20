import { useState } from 'react';
import { useCapitalStructure } from '../../api/hooks/use-capital-structure';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types (matching server response) ──

interface CompanyProfile {
  ticker: string;
  company: string;
  mktCapB: number;
  evB: number;
  totalDebtB: number;
  netDebtB: number;
  debtEquityPct: number;
  leverageX: number;
  coverageX: number;
  rating: string;
  outlook: string;
}

interface DebtInstrument {
  instrument: string;
  amountB: number;
  couponPct: number;
  maturity: string;
  spreadBps: number;
  rating: string;
}

interface DebtStack {
  ticker: string;
  company: string;
  instruments: DebtInstrument[];
}

interface MaturityBucket {
  year: number;
  totalMaturingB: number;
  igB: number;
  hyB: number;
  avgCouponPct: number;
}

interface CapitalStructureSummary {
  avgDebtEquity: number;
  avgNetLeverage: number;
  avgCoverage: number;
  mostLeveraged: string;
  leastLeveraged: string;
}

interface CapitalStructureData {
  summary: CapitalStructureSummary;
  companies: CompanyProfile[];
  debtStacks: DebtStack[];
  maturityProfile: MaturityBucket[];
  timestamp?: string;
}

// ── Formatting helpers ──

function fmtB(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'T';
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtX(n: number): string {
  return n.toFixed(1) + 'x';
}

// ── Color helpers ──

function leverageColor(x: number): string {
  if (x > 5) return 'text-red-400';
  if (x > 3) return 'text-orange-400';
  if (x > 2) return 'text-yellow-400';
  return 'text-emerald-400';
}

function deColor(pct: number): string {
  if (pct > 200) return 'text-red-400';
  if (pct > 100) return 'text-orange-400';
  if (pct > 50) return 'text-yellow-400';
  return 'text-emerald-400';
}

function coverageColor(x: number): string {
  if (x < 2) return 'text-red-400';
  if (x < 4) return 'text-yellow-400';
  return 'text-emerald-400';
}

function outlookBadge(outlook: string): { color: string; bg: string } {
  switch (outlook?.toUpperCase()) {
    case 'POSITIVE':
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    case 'NEGATIVE':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'WATCH':
      return { color: 'text-orange-400', bg: 'bg-orange-400/15' };
    default:
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
  }
}

function ratingColor(rating: string): string {
  if (!rating) return 'text-neutral-500';
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return 'text-emerald-300';
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return 'text-emerald-400';
  if (rating.startsWith('A') && !rating.startsWith('AA')) return 'text-green-400';
  if (rating.startsWith('BBB') || rating.startsWith('Baa')) return 'text-yellow-400';
  if (rating.startsWith('BB') || rating.startsWith('Ba')) return 'text-amber-400';
  if (rating.startsWith('B') && !rating.startsWith('BB') && !rating.startsWith('Ba')) return 'text-orange-400';
  return 'text-red-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-red-400/30">
      <div className="w-1 h-1 shrink-0 bg-red-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-red-400">
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

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: CapitalStructureSummary }) {
  const metrics = [
    {
      label: 'Avg D/E',
      value: fmtPct(summary.avgDebtEquity),
      color: deColor(summary.avgDebtEquity),
    },
    {
      label: 'Avg Net Leverage',
      value: fmtX(summary.avgNetLeverage),
      color: leverageColor(summary.avgNetLeverage),
    },
    {
      label: 'Avg Coverage',
      value: fmtX(summary.avgCoverage),
      color: coverageColor(summary.avgCoverage),
    },
    {
      label: 'Most Leveraged',
      value: summary.mostLeveraged,
      color: 'text-red-400',
    },
    {
      label: 'Least Leveraged',
      value: summary.leastLeveraged,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-red-400/30 bg-black">
      {metrics.map((m, i) => (
        <div key={m.label} className={`px-2 py-1.5 ${i < 4 ? 'border-r border-red-400/10' : ''}`}>
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

// ── Company Profiles Table ──

function CompanyProfilesTable({ companies }: { companies: CompanyProfile[] }) {
  const sorted = [...companies].sort((a, b) => b.leverageX - a.leverageX);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Ticker" align="left" />
            <ThCell label="Company" align="left" />
            <ThCell label="Mkt Cap ($B)" align="right" />
            <ThCell label="EV ($B)" align="right" />
            <ThCell label="Total Debt" align="right" />
            <ThCell label="Net Debt" align="right" />
            <ThCell label="D/E (%)" align="right" />
            <ThCell label="Leverage (x)" align="right" />
            <ThCell label="Coverage (x)" align="right" />
            <ThCell label="Rating" align="left" />
            <ThCell label="Outlook" align="left" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const outlook = outlookBadge(c.outlook);
            return (
              <tr key={c.ticker} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-red-400 font-bold">
                  {c.ticker}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold truncate max-w-[120px]">
                  {c.company}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtB(c.mktCapB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtB(c.evB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtB(c.totalDebtB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtB(c.netDebtB)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${deColor(c.debtEquityPct)}`}>
                  {fmtPct(c.debtEquityPct)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${leverageColor(c.leverageX)}`}>
                  {fmtX(c.leverageX)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${coverageColor(c.coverageX)}`}>
                  {fmtX(c.coverageX)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-left font-bold ${ratingColor(c.rating)}`}>
                  {c.rating}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${outlook.color} ${outlook.bg}`}>
                    {c.outlook}
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

// ── Debt Stack (Collapsible per company) ──

function DebtStackSection({ stacks }: { stacks: DebtStack[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (ticker: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  if (!stacks || stacks.length === 0) return null;

  return (
    <div>
      {stacks.map((stack) => {
        const isOpen = expanded.has(stack.ticker);
        return (
          <div key={stack.ticker} className="border-b border-border/10">
            {/* Collapsible header */}
            <button
              onClick={() => toggle(stack.ticker)}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors text-left"
            >
              <span className="text-[8px] font-mono text-red-400/60">
                {isOpen ? '\u25BC' : '\u25B6'}
              </span>
              <span className="text-[9px] font-mono font-bold text-red-400">{stack.ticker}</span>
              <span className="text-[8px] font-mono text-neutral-500">{stack.company}</span>
              <span className="ml-auto text-[7px] font-mono text-neutral-600">
                {stack.instruments.length} instruments
              </span>
            </button>

            {/* Expanded waterfall */}
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-[9px] font-mono">
                  <thead className="bg-[#080808]">
                    <tr className="border-b border-border/20">
                      <ThCell label="Instrument" align="left" />
                      <ThCell label="Amount ($B)" align="right" />
                      <ThCell label="Coupon (%)" align="right" />
                      <ThCell label="Maturity" align="left" />
                      <ThCell label="Spread (bps)" align="right" />
                      <ThCell label="Rating" align="left" />
                    </tr>
                  </thead>
                  <tbody>
                    {stack.instruments.map((inst, idx) => (
                      <tr key={`${stack.ticker}-${idx}`} className="border-b border-border/5 hover:bg-red-400/[0.02] transition-colors">
                        <td className="px-1.5 py-1 whitespace-nowrap text-left text-white/80">
                          <div className="flex items-center gap-1.5">
                            {/* Seniority waterfall indicator */}
                            <div className="w-0.5 h-3 bg-red-400/30" style={{ opacity: 1 - idx * 0.15 }} />
                            {inst.instrument}
                          </div>
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                          {fmtB(inst.amountB)}
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                          {inst.couponPct.toFixed(3)}%
                        </td>
                        <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                          {inst.maturity}
                        </td>
                        <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${
                          inst.spreadBps > 300 ? 'text-red-400' : inst.spreadBps > 150 ? 'text-orange-400' : 'text-neutral-300'
                        }`}>
                          {inst.spreadBps.toFixed(0)}
                        </td>
                        <td className={`px-1.5 py-1 whitespace-nowrap text-left font-bold ${ratingColor(inst.rating)}`}>
                          {inst.rating}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Maturity Profile Table ──

function MaturityProfileTable({ buckets }: { buckets: MaturityBucket[] }) {
  if (!buckets || buckets.length === 0) return null;

  const sorted = [...buckets].sort((a, b) => a.year - b.year);
  const maxTotal = Math.max(...sorted.map((b) => b.totalMaturingB), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Year" align="left" />
            <ThCell label="Total Maturing ($B)" align="right" />
            <ThCell label="IG ($B)" align="right" />
            <ThCell label="HY ($B)" align="right" />
            <ThCell label="Avg Coupon (%)" align="right" />
            <th className="px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-left w-24">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const barPct = (b.totalMaturingB / maxTotal) * 100;
            const igPct = b.totalMaturingB > 0 ? (b.igB / b.totalMaturingB) * 100 : 0;
            return (
              <tr key={b.year} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {b.year}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-red-400">
                  {fmtB(b.totalMaturingB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-blue-400">
                  {fmtB(b.igB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-orange-400">
                  {fmtB(b.hyB)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {b.avgCouponPct.toFixed(2)}%
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <div className="w-20 h-2 bg-neutral-900 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${barPct}%` }}
                    >
                      {/* IG portion */}
                      <div
                        className="h-full float-left bg-blue-400/60"
                        style={{ width: `${igPct}%` }}
                      />
                      {/* HY portion */}
                      <div
                        className="h-full float-left bg-orange-400/60"
                        style={{ width: `${100 - igPct}%` }}
                      />
                    </div>
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

// ── Main Panel ──

export function CapitalStructurePanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCapitalStructure();

  const d = data as CapitalStructureData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'csTitle', 'Capital Structure Analysis')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.summary && (
            <span className="text-[8px] font-mono font-black tabular-nums text-red-400">
              AVG LEV {d.summary.avgNetLeverage.toFixed(1)}x
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !d && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
            FAILED TO LOAD
          </span>
        </div>
      )}

      {/* No data */}
      {!d && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {d && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          {d.summary && (
            <SummaryBar summary={d.summary} />
          )}

          {/* Company Profiles */}
          {d.companies && d.companies.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'csCompanyProfiles', 'Company Profiles')} />
              <CompanyProfilesTable companies={d.companies} />
            </>
          )}

          {/* Debt Stack */}
          {d.debtStacks && d.debtStacks.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'csDebtStack', 'Debt Stack — Seniority Waterfall')} />
              <DebtStackSection stacks={d.debtStacks} />
            </>
          )}

          {/* Maturity Profile */}
          {d.maturityProfile && d.maturityProfile.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'csMaturityProfile', 'Maturity Profile')} />
              <MaturityProfileTable buckets={d.maturityProfile} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
