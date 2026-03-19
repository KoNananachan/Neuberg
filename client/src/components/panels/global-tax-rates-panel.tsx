import { useState, useMemo } from 'react';
import { useGlobalTaxRates } from '../../api/hooks/use-global-tax-rates';

// ── Formatting helpers ──

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtScore(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

function fmtDay(n: number | undefined | null): string {
  if (n == null) return '--';
  return Math.round(n).toString();
}

// ── Color helpers ──

function rateColor(rate: number | undefined | null): string {
  if (rate == null) return 'text-neutral-500';
  if (rate >= 40) return 'text-red-400';
  if (rate >= 30) return 'text-orange-400';
  if (rate >= 20) return 'text-yellow-400';
  if (rate >= 10) return 'text-neutral-300';
  return 'text-green-400';
}

function scoreColor(score: number | undefined | null): string {
  if (score == null) return 'text-neutral-500';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function statusBadge(status: string | undefined | null): string {
  if (!status) return 'bg-neutral-400/10 text-neutral-500 border-neutral-400/20';
  const s = status.toUpperCase();
  if (s === 'YES' || s === 'ACTIVE' || s === 'ADOPTED')
    return 'bg-green-400/10 text-green-400 border-green-400/20';
  if (s === 'NO' || s === 'NONE' || s === 'NOT ADOPTED')
    return 'bg-neutral-400/10 text-neutral-500 border-neutral-400/20';
  if (s === 'PARTIAL' || s === 'PENDING' || s === 'IN PROGRESS')
    return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
  return 'bg-neutral-400/10 text-neutral-500 border-neutral-400/20';
}

function changeIcon(direction: string | undefined | null): string {
  if (!direction) return '';
  const d = direction.toUpperCase();
  if (d === 'UP' || d === 'INCREASE') return '\u25B2';
  if (d === 'DOWN' || d === 'DECREASE') return '\u25BC';
  return '\u25C6';
}

function changeColor(direction: string | undefined | null): string {
  if (!direction) return 'text-neutral-500';
  const d = direction.toUpperCase();
  if (d === 'UP' || d === 'INCREASE') return 'text-red-400';
  if (d === 'DOWN' || d === 'DECREASE') return 'text-green-400';
  return 'text-neutral-500';
}

// ── Types ──

type TabId = 'OVERVIEW' | 'CORPORATE' | 'INCOME' | 'VAT' | 'CAPITAL_GAINS';

interface OECDAverage {
  corporate?: number;
  income?: number;
  vat?: number;
  capitalGains?: number;
}

interface TaxCountry {
  country: string;
  countryCode?: string;
  corporate?: {
    headline?: number;
    effective?: number;
    sme?: number;
    combined?: number;
    competitivenessScore?: number;
  };
  income?: {
    topRate?: number;
    middleRate?: number;
    lowerRate?: number;
    threshold?: string;
  };
  vat?: {
    standard?: number;
    reduced?: number;
    exemptSectors?: string;
  };
  capitalGains?: {
    shortTerm?: number;
    longTerm?: number;
    qualified?: number;
  };
  socialSecurity?: {
    employer?: number;
    employee?: number;
  };
  digitalServicesTax?: string;
  minimumTax?: string;
  recentChanges?: Array<{
    year?: number;
    description?: string;
    direction?: string;
  }>;
  taxFreedomDay?: number;
  overallScore?: number;
}

interface TaxTrend {
  title?: string;
  description?: string;
}

// ── Constants ──

const TABS: { id: TabId; label: string }[] = [
  { id: 'CORPORATE', label: 'CORPORATE' },
  { id: 'INCOME', label: 'INCOME' },
  { id: 'VAT', label: 'VAT' },
  { id: 'CAPITAL_GAINS', label: 'CAPITAL GAINS' },
  { id: 'OVERVIEW', label: 'OVERVIEW' },
];

// ── Sort logic ──

type SortDir = 'asc' | 'desc';

function getSortValue(country: TaxCountry, field: string): number | string {
  switch (field) {
    case 'country':
      return country.country?.toLowerCase() ?? '';
    case 'corp_headline':
      return country.corporate?.headline ?? -1;
    case 'corp_effective':
      return country.corporate?.effective ?? -1;
    case 'corp_sme':
      return country.corporate?.sme ?? -1;
    case 'corp_combined':
      return country.corporate?.combined ?? -1;
    case 'corp_score':
      return country.corporate?.competitivenessScore ?? -1;
    case 'income_top':
      return country.income?.topRate ?? -1;
    case 'income_middle':
      return country.income?.middleRate ?? -1;
    case 'income_lower':
      return country.income?.lowerRate ?? -1;
    case 'income_threshold':
      return country.income?.threshold ?? '';
    case 'vat_standard':
      return country.vat?.standard ?? -1;
    case 'vat_reduced':
      return country.vat?.reduced ?? -1;
    case 'vat_exempt':
      return country.vat?.exemptSectors ?? '';
    case 'cg_short':
      return country.capitalGains?.shortTerm ?? -1;
    case 'cg_long':
      return country.capitalGains?.longTerm ?? -1;
    case 'cg_qualified':
      return country.capitalGains?.qualified ?? -1;
    case 'ov_corp':
      return country.corporate?.headline ?? -1;
    case 'ov_income':
      return country.income?.topRate ?? -1;
    case 'ov_vat':
      return country.vat?.standard ?? -1;
    case 'ov_cg':
      return country.capitalGains?.longTerm ?? -1;
    case 'ov_score':
      return country.overallScore ?? -1;
    case 'taxFreedomDay':
      return country.taxFreedomDay ?? -1;
    default:
      return '';
  }
}

function sortCountries(
  countries: TaxCountry[],
  field: string,
  dir: SortDir,
): TaxCountry[] {
  return [...countries].sort((a, b) => {
    const va = getSortValue(a, field);
    const vb = getSortValue(b, field);
    if (typeof va === 'string' && typeof vb === 'string') {
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    const na = typeof va === 'number' ? va : 0;
    const nb = typeof vb === 'number' ? vb : 0;
    return dir === 'asc' ? na - nb : nb - na;
  });
}

// ── Sortable header ──

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  align = 'right',
}: {
  label: string;
  field: string;
  sortField: string;
  sortDir: SortDir;
  onSort: (f: string) => void;
  align?: 'left' | 'right';
}) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`text-[7px] font-mono uppercase tracking-wider cursor-pointer select-none hover:text-yellow-400 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'text-yellow-400' : 'text-neutral-600'}`}
    >
      {label}
      {active && (
        <span className="ml-0.5">
          {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
        </span>
      )}
    </button>
  );
}

// ── Main Panel ──

export function GlobalTaxRatesPanel() {
  const { data, isLoading } = useGlobalTaxRates();

  const [selectedTab, setSelectedTab] = useState<TabId>('OVERVIEW');
  const [sortField, setSortField] = useState<string>('country');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const oecdAverages = data?.oecdAverages as OECDAverage | undefined;
  const countries = data?.countries as TaxCountry[] | undefined;
  const trends = data?.trends as TaxTrend[] | undefined;

  const sortedCountries = useMemo(() => {
    if (!countries) return [];
    return sortCountries(countries, sortField, sortDir);
  }, [countries, sortField, sortDir]);

  const selectedCountryData = useMemo(() => {
    if (!selectedCountry || !countries) return null;
    return countries.find((c) => c.country === selectedCountry) ?? null;
  }, [selectedCountry, countries]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function handleRowClick(countryName: string) {
    setSelectedCountry((prev) =>
      prev === countryName ? null : countryName,
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            GLOBAL TAX RATES
          </span>
        </div>
        {oecdAverages && (
          <div className="flex items-center gap-3">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              OECD AVG
            </span>
            <span className="text-[7px] font-mono text-neutral-400">
              CORP {fmtPct(oecdAverages.corporate)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400">
              INC {fmtPct(oecdAverages.income)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400">
              VAT {fmtPct(oecdAverages.vat)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400">
              CG {fmtPct(oecdAverages.capitalGains)}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border/20 bg-[#030303] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedTab(tab.id);
              setSortField('country');
              setSortDir('asc');
            }}
            className={`px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider border-b-2 transition-colors ${
              selectedTab === tab.id
                ? 'text-yellow-400 border-yellow-400'
                : 'text-neutral-600 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            NO DATA AVAILABLE
          </div>
        )}

        {data && (
          <>
            {/* Main table */}
            {selectedTab === 'CORPORATE' && (
              <CorporateTable
                countries={sortedCountries}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                selectedCountry={selectedCountry}
                onRowClick={handleRowClick}
              />
            )}
            {selectedTab === 'INCOME' && (
              <IncomeTable
                countries={sortedCountries}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                selectedCountry={selectedCountry}
                onRowClick={handleRowClick}
              />
            )}
            {selectedTab === 'VAT' && (
              <VATTable
                countries={sortedCountries}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                selectedCountry={selectedCountry}
                onRowClick={handleRowClick}
              />
            )}
            {selectedTab === 'CAPITAL_GAINS' && (
              <CapitalGainsTable
                countries={sortedCountries}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                selectedCountry={selectedCountry}
                onRowClick={handleRowClick}
              />
            )}
            {selectedTab === 'OVERVIEW' && (
              <OverviewTable
                countries={sortedCountries}
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                selectedCountry={selectedCountry}
                onRowClick={handleRowClick}
              />
            )}

            {/* Country detail panel */}
            {selectedCountryData && (
              <CountryDetail
                country={selectedCountryData}
                onClose={() => setSelectedCountry(null)}
              />
            )}

            {/* Global trends */}
            {trends && trends.length > 0 && (
              <TrendsSection trends={trends} />
            )}

            {/* Tax Freedom Day comparison */}
            {sortedCountries.length > 0 && (
              <TaxFreedomDaySection countries={sortedCountries} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared table props ──

interface TableProps {
  countries: TaxCountry[];
  sortField: string;
  sortDir: SortDir;
  onSort: (f: string) => void;
  selectedCountry: string | null;
  onRowClick: (c: string) => void;
}

// ── CORPORATE tab ──

function CorporateTable({
  countries,
  sortField,
  sortDir,
  onSort,
  selectedCountry,
  onRowClick,
}: TableProps) {
  return (
    <div className="border-b border-border/20">
      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <SortHeader label="Country" field="country" sortField={sortField} sortDir={sortDir} onSort={onSort} align="left" />
        <SortHeader label="Headline" field="corp_headline" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Effective" field="corp_effective" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="SME" field="corp_sme" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Combined" field="corp_combined" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Score" field="corp_score" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      </div>
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          onClick={() => onRowClick(c.country)}
          className={`grid grid-cols-[1fr_56px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center cursor-pointer ${
            selectedCountry === c.country ? 'bg-yellow-400/[0.04]' : ''
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {c.countryCode ? `${c.countryCode} ` : ''}{c.country}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.corporate?.headline)}`}>
            {fmtPct(c.corporate?.headline)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.corporate?.effective)}`}>
            {fmtPct(c.corporate?.effective)}
          </span>
          <span className={`text-[9px] font-mono text-right ${rateColor(c.corporate?.sme)}`}>
            {fmtPct(c.corporate?.sme)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.corporate?.combined)}`}>
            {fmtPct(c.corporate?.combined)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${scoreColor(c.corporate?.competitivenessScore)}`}>
            {fmtScore(c.corporate?.competitivenessScore)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── INCOME tab ──

function IncomeTable({
  countries,
  sortField,
  sortDir,
  onSort,
  selectedCountry,
  onRowClick,
}: TableProps) {
  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-[1fr_56px_56px_56px_80px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <SortHeader label="Country" field="country" sortField={sortField} sortDir={sortDir} onSort={onSort} align="left" />
        <SortHeader label="Top Rate" field="income_top" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Middle" field="income_middle" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Lower" field="income_lower" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Threshold" field="income_threshold" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      </div>
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          onClick={() => onRowClick(c.country)}
          className={`grid grid-cols-[1fr_56px_56px_56px_80px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center cursor-pointer ${
            selectedCountry === c.country ? 'bg-yellow-400/[0.04]' : ''
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {c.countryCode ? `${c.countryCode} ` : ''}{c.country}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.income?.topRate)}`}>
            {fmtPct(c.income?.topRate)}
          </span>
          <span className={`text-[9px] font-mono text-right ${rateColor(c.income?.middleRate)}`}>
            {fmtPct(c.income?.middleRate)}
          </span>
          <span className={`text-[9px] font-mono text-right ${rateColor(c.income?.lowerRate)}`}>
            {fmtPct(c.income?.lowerRate)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right truncate">
            {c.income?.threshold ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── VAT tab ──

function VATTable({
  countries,
  sortField,
  sortDir,
  onSort,
  selectedCountry,
  onRowClick,
}: TableProps) {
  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-[1fr_56px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <SortHeader label="Country" field="country" sortField={sortField} sortDir={sortDir} onSort={onSort} align="left" />
        <SortHeader label="Standard" field="vat_standard" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Reduced" field="vat_reduced" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Exempt Sectors" field="vat_exempt" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      </div>
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          onClick={() => onRowClick(c.country)}
          className={`grid grid-cols-[1fr_56px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center cursor-pointer ${
            selectedCountry === c.country ? 'bg-yellow-400/[0.04]' : ''
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {c.countryCode ? `${c.countryCode} ` : ''}{c.country}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.vat?.standard)}`}>
            {fmtPct(c.vat?.standard)}
          </span>
          <span className={`text-[9px] font-mono text-right ${rateColor(c.vat?.reduced)}`}>
            {fmtPct(c.vat?.reduced)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right truncate">
            {c.vat?.exemptSectors ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CAPITAL GAINS tab ──

function CapitalGainsTable({
  countries,
  sortField,
  sortDir,
  onSort,
  selectedCountry,
  onRowClick,
}: TableProps) {
  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-[1fr_64px_64px_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <SortHeader label="Country" field="country" sortField={sortField} sortDir={sortDir} onSort={onSort} align="left" />
        <SortHeader label="Short-Term" field="cg_short" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Long-Term" field="cg_long" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Qualified" field="cg_qualified" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      </div>
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          onClick={() => onRowClick(c.country)}
          className={`grid grid-cols-[1fr_64px_64px_64px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center cursor-pointer ${
            selectedCountry === c.country ? 'bg-yellow-400/[0.04]' : ''
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {c.countryCode ? `${c.countryCode} ` : ''}{c.country}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.capitalGains?.shortTerm)}`}>
            {fmtPct(c.capitalGains?.shortTerm)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.capitalGains?.longTerm)}`}>
            {fmtPct(c.capitalGains?.longTerm)}
          </span>
          <span className={`text-[9px] font-mono text-right ${rateColor(c.capitalGains?.qualified)}`}>
            {fmtPct(c.capitalGains?.qualified)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── OVERVIEW tab ──

function OverviewTable({
  countries,
  sortField,
  sortDir,
  onSort,
  selectedCountry,
  onRowClick,
}: TableProps) {
  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <SortHeader label="Country" field="country" sortField={sortField} sortDir={sortDir} onSort={onSort} align="left" />
        <SortHeader label="Corp" field="ov_corp" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Income" field="ov_income" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="VAT" field="ov_vat" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="CapGns" field="ov_cg" sortField={sortField} sortDir={sortDir} onSort={onSort} />
        <SortHeader label="Score" field="ov_score" sortField={sortField} sortDir={sortDir} onSort={onSort} />
      </div>
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          onClick={() => onRowClick(c.country)}
          className={`grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors items-center cursor-pointer ${
            selectedCountry === c.country ? 'bg-yellow-400/[0.04]' : ''
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-yellow-400 truncate">
            {c.countryCode ? `${c.countryCode} ` : ''}{c.country}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.corporate?.headline)}`}>
            {fmtPct(c.corporate?.headline)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.income?.topRate)}`}>
            {fmtPct(c.income?.topRate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.vat?.standard)}`}>
            {fmtPct(c.vat?.standard)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${rateColor(c.capitalGains?.longTerm)}`}>
            {fmtPct(c.capitalGains?.longTerm)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${scoreColor(c.overallScore)}`}>
            {fmtScore(c.overallScore)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Country detail panel ──

function CountryDetail({
  country,
  onClose,
}: {
  country: TaxCountry;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-yellow-400/30 bg-[#050505]">
      {/* Detail header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-yellow-400/20">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-yellow-400">
          {country.countryCode ? `${country.countryCode} ` : ''}{country.country} — DETAIL
        </span>
        <button
          onClick={onClose}
          className="text-[9px] font-mono text-neutral-500 hover:text-yellow-400 transition-colors px-1"
        >
          CLOSE
        </button>
      </div>

      {/* Tax rates grid */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-border/20">
        {/* Corporate */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">CORPORATE</div>
          <DetailRow label="HEADLINE" value={fmtPct(country.corporate?.headline)} color={rateColor(country.corporate?.headline)} />
          <DetailRow label="EFFECTIVE" value={fmtPct(country.corporate?.effective)} color={rateColor(country.corporate?.effective)} />
          <DetailRow label="SME" value={fmtPct(country.corporate?.sme)} color={rateColor(country.corporate?.sme)} />
          <DetailRow label="COMBINED" value={fmtPct(country.corporate?.combined)} color={rateColor(country.corporate?.combined)} />
          <DetailRow label="SCORE" value={fmtScore(country.corporate?.competitivenessScore)} color={scoreColor(country.corporate?.competitivenessScore)} />
        </div>

        {/* Income */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">INCOME</div>
          <DetailRow label="TOP RATE" value={fmtPct(country.income?.topRate)} color={rateColor(country.income?.topRate)} />
          <DetailRow label="MIDDLE" value={fmtPct(country.income?.middleRate)} color={rateColor(country.income?.middleRate)} />
          <DetailRow label="LOWER" value={fmtPct(country.income?.lowerRate)} color={rateColor(country.income?.lowerRate)} />
          <DetailRow label="THRESHOLD" value={country.income?.threshold ?? '--'} color="text-neutral-400" />
        </div>

        {/* VAT */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">VAT / GST</div>
          <DetailRow label="STANDARD" value={fmtPct(country.vat?.standard)} color={rateColor(country.vat?.standard)} />
          <DetailRow label="REDUCED" value={fmtPct(country.vat?.reduced)} color={rateColor(country.vat?.reduced)} />
          <DetailRow label="EXEMPT" value={country.vat?.exemptSectors ?? '--'} color="text-neutral-400" />
        </div>

        {/* Capital Gains */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">CAPITAL GAINS</div>
          <DetailRow label="SHORT-TERM" value={fmtPct(country.capitalGains?.shortTerm)} color={rateColor(country.capitalGains?.shortTerm)} />
          <DetailRow label="LONG-TERM" value={fmtPct(country.capitalGains?.longTerm)} color={rateColor(country.capitalGains?.longTerm)} />
          <DetailRow label="QUALIFIED" value={fmtPct(country.capitalGains?.qualified)} color={rateColor(country.capitalGains?.qualified)} />
        </div>
      </div>

      {/* Social security + digital services + minimum tax */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-border/20 border-t border-border/20">
        {/* Social security */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">SOCIAL SECURITY</div>
          <DetailRow label="EMPLOYER" value={fmtPct(country.socialSecurity?.employer)} color={rateColor(country.socialSecurity?.employer)} />
          <DetailRow label="EMPLOYEE" value={fmtPct(country.socialSecurity?.employee)} color={rateColor(country.socialSecurity?.employee)} />
        </div>

        {/* Digital services tax */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">DIGITAL SERVICES TAX</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${statusBadge(country.digitalServicesTax)}`}>
              {country.digitalServicesTax ?? '--'}
            </span>
          </div>
        </div>

        {/* Minimum tax */}
        <div className="px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">GLOBAL MINIMUM TAX (PILLAR 2)</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`inline-block px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${statusBadge(country.minimumTax)}`}>
              {country.minimumTax ?? '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent changes timeline */}
      {country.recentChanges && country.recentChanges.length > 0 && (
        <div className="border-t border-border/20 px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">RECENT CHANGES</div>
          {country.recentChanges.map((change, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="text-[8px] font-mono font-bold text-yellow-400 shrink-0 w-8">
                {change.year ?? '--'}
              </span>
              <span className={`text-[8px] font-mono shrink-0 ${changeColor(change.direction)}`}>
                {changeIcon(change.direction)}
              </span>
              <span className="text-[8px] font-mono text-neutral-400">
                {change.description ?? '--'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail row helper ──

function DetailRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-[1px]">
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-[8px] font-mono font-bold ${color}`}>
        {value}
      </span>
    </div>
  );
}

// ── Global trends section ──

function TrendsSection({ trends }: { trends: TaxTrend[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          GLOBAL TAX POLICY TRENDS
        </span>
      </div>
      {trends.map((trend, i) => (
        <div
          key={i}
          className="px-3 py-1 border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <div className="text-[8px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
            {trend.title ?? '--'}
          </div>
          <div className="text-[8px] font-mono text-neutral-400 mt-0.5">
            {trend.description ?? '--'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tax Freedom Day section ──

function TaxFreedomDaySection({ countries }: { countries: TaxCountry[] }) {
  const withDay = countries
    .filter((c) => c.taxFreedomDay != null)
    .sort((a, b) => (a.taxFreedomDay ?? 0) - (b.taxFreedomDay ?? 0));

  if (withDay.length === 0) return null;

  const maxDay = Math.max(...withDay.map((c) => c.taxFreedomDay ?? 0), 1);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TAX FREEDOM DAY (DAY OF YEAR)
        </span>
      </div>
      {withDay.map((c, i) => {
        const day = c.taxFreedomDay ?? 0;
        const pct = (day / maxDay) * 100;
        return (
          <div
            key={`tfd-${c.country}-${i}`}
            className="flex items-center gap-2 px-2 py-[2px] border-b border-border/20 hover:bg-yellow-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 w-16 shrink-0 truncate">
              {c.countryCode ?? c.country?.slice(0, 3)?.toUpperCase()}
            </span>
            <div className="flex-1 h-2 bg-neutral-900 relative">
              <div
                className="absolute top-0 left-0 h-full bg-yellow-400/40"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-neutral-400 w-8 text-right shrink-0">
              {fmtDay(day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
