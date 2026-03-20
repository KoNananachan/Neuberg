import { useMemo } from 'react';
import { useSovereignDebt } from '../../api/hooks/use-sovereign-debt';
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

function fmtReserves(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}T`;
  return `$${n.toFixed(0)}B`;
}

function fmtMaturity(n: number): string {
  return `${n.toFixed(1)}y`;
}

// ── Color helpers ──

function debtToGdpColor(val: number): string {
  if (val > 100) return 'text-red-400';
  if (val >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

function outlookColor(outlook: string): string {
  if (outlook === 'Negative') return 'text-red-400';
  if (outlook === 'Positive') return 'text-green-400';
  return 'text-neutral-500';
}

function outlookBg(outlook: string): string {
  if (outlook === 'Negative') return 'bg-red-400/10';
  if (outlook === 'Positive') return 'bg-green-400/10';
  return 'bg-neutral-500/10';
}

function cdsColor(spread: number): string {
  if (spread > 400) return 'text-red-400';
  if (spread > 200) return 'text-orange-400';
  if (spread > 100) return 'text-yellow-400';
  return 'text-neutral-300';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function balanceColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Types ──

interface CountryData {
  name: string;
  isoCode: string;
  region: string;
  debtToGdp: number;
  totalDebt: number;
  rating: string;
  ratingOutlook: string;
  tenYearYield: number;
  cdsSpread: number;
  fiscalBalance: number;
  currentAccount: number;
  fxReserves: number;
  debtMaturityAvg: number;
  changeDebtToGdp1Y: number;
}

interface SummaryData {
  avgDebtToGdp: number;
  avgYield: number;
  avgCds: number;
  totalGlobalDebt: number;
  countriesNegativeOutlook: number;
}

interface SovereignDebtData {
  countries: CountryData[];
  summary: SummaryData;
}

// ── Main Panel ──

export function SovereignDebtPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignDebt() as {
    data: SovereignDebtData | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const sortedCountries = useMemo(() => {
    if (!data?.countries) return [];
    return [...data.countries].sort((a, b) => b.debtToGdp - a.debtToGdp);
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {tr(t, 'sdSovereignDebtMonitor', 'Sovereign Debt Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {/* No data */}
        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sdNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Summary bar */}
            <SummaryBar summary={data.summary} t={t} />

            {/* Main table */}
            <DebtTable countries={sortedCountries} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: SummaryData;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'sdTotalGlobalDebt', 'Total Global Debt'),
      value: fmtDebt(summary.totalGlobalDebt),
    },
    {
      label: tr(t, 'sdAvgDebtGdp', 'Avg Debt/GDP'),
      value: fmtPct(summary.avgDebtToGdp),
    },
    {
      label: tr(t, 'sdAvgYield', 'Avg 10Y Yield'),
      value: fmtYield(summary.avgYield),
    },
    {
      label: tr(t, 'sdAvgCds', 'Avg CDS 5Y'),
      value: `${fmtCds(summary.avgCds)} bps`,
    },
    {
      label: tr(t, 'sdNegOutlook', 'Negative Outlook'),
      value: String(summary.countriesNegativeOutlook),
      color: summary.countriesNegativeOutlook > 0 ? 'text-red-400' : 'text-green-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-sky-400/30 bg-black">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-sky-400/10 last:border-r-0">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {m.label}
          </div>
          <div className={`text-[10px] font-mono font-bold ${m.color ?? 'text-sky-400'}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Debt Table ──

function DebtTable({ countries }: { countries: CountryData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-sky-400/30">
            <Th label="Country" align="left" />
            <Th label="Rating" align="left" />
            <Th label="Outlook" align="left" />
            <Th label="Debt/GDP" align="right" />
            <Th label="1Y Chg" align="right" />
            <Th label="Total Debt" align="right" />
            <Th label="10Y Yield" align="right" />
            <Th label="CDS 5Y" align="right" />
            <Th label="Fiscal Bal" align="right" />
            <Th label="Curr Acct" align="right" />
            <Th label="FX Reserves" align="right" />
            <Th label="Avg Mat" align="right" />
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <CountryRow key={country.isoCode} country={country} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Table header cell ──

function Th({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-sky-400/70 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Country Row ──

function CountryRow({ country }: { country: CountryData }) {
  return (
    <tr className="border-b border-neutral-800/30 hover:bg-sky-400/[0.02] transition-colors">
      {/* Country */}
      <td className="px-1.5 py-1 whitespace-nowrap text-left">
        <span className="text-white font-bold">{country.isoCode}</span>
        <span className="text-neutral-600 ml-1">{country.name}</span>
      </td>

      {/* Rating */}
      <td className="px-1.5 py-1 whitespace-nowrap text-left">
        <span className="text-neutral-300 font-bold">{country.rating}</span>
      </td>

      {/* Outlook */}
      <td className="px-1.5 py-1 whitespace-nowrap text-left">
        <span
          className={`text-[7px] font-bold px-1 py-0.5 uppercase ${outlookColor(country.ratingOutlook)} ${outlookBg(country.ratingOutlook)}`}
        >
          {country.ratingOutlook}
        </span>
      </td>

      {/* Debt/GDP */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${debtToGdpColor(country.debtToGdp)}`}>
        {fmtPct(country.debtToGdp)}
      </td>

      {/* 1Y Change */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right ${changeColor(country.changeDebtToGdp1Y)}`}>
        {fmtPctSigned(country.changeDebtToGdp1Y)}
      </td>

      {/* Total Debt */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
        {fmtDebt(country.totalDebt)}
      </td>

      {/* 10Y Yield */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
        {fmtYield(country.tenYearYield)}
      </td>

      {/* CDS 5Y */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${cdsColor(country.cdsSpread)}`}>
        {fmtCds(country.cdsSpread)}
      </td>

      {/* Fiscal Balance */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right ${balanceColor(country.fiscalBalance)}`}>
        {fmtPctSigned(country.fiscalBalance)}
      </td>

      {/* Current Account */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right ${balanceColor(country.currentAccount)}`}>
        {fmtPctSigned(country.currentAccount)}
      </td>

      {/* FX Reserves */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
        {fmtReserves(country.fxReserves)}
      </td>

      {/* Avg Maturity */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
        {fmtMaturity(country.debtMaturityAvg)}
      </td>
    </tr>
  );
}
