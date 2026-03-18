import { useState, useMemo } from 'react';
import { useCountryRisk, type CountryRiskEntry, type CountryRiskResponse } from '../../api/hooks/use-country-risk';
import { useT } from '../../i18n';
import { Shield, RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Constants ──

type ViewMode = 'TABLE' | 'MATRIX';
type RegionFilter = 'ALL' | 'NORTH AMERICA' | 'EUROPE' | 'ASIA' | 'LATIN AMERICA' | 'AFRICA/ME' | 'OCEANIA';
type SortKey =
  | 'country' | 'creditRating' | 'cdsSpread5y' | 'cdsChange1d'
  | 'debtToGdp' | 'fiscalBalance' | 'currentAccount' | 'inflation'
  | 'policyRate' | 'realRate' | 'gdpGrowth' | 'overallRiskScore' | 'riskTier';

const REGIONS: RegionFilter[] = ['ALL', 'NORTH AMERICA', 'EUROPE', 'ASIA', 'LATIN AMERICA', 'AFRICA/ME', 'OCEANIA'];

const REGION_MAP: Record<string, RegionFilter> = {
  'North America': 'NORTH AMERICA',
  'Europe': 'EUROPE',
  'Asia': 'ASIA',
  'Latin America': 'LATIN AMERICA',
  'Africa/ME': 'AFRICA/ME',
  'Oceania': 'OCEANIA',
};

const FLAG_MAP: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', CN: '\u{1F1E8}\u{1F1F3}', JP: '\u{1F1EF}\u{1F1F5}', DE: '\u{1F1E9}\u{1F1EA}',
  GB: '\u{1F1EC}\u{1F1E7}', FR: '\u{1F1EB}\u{1F1F7}', IT: '\u{1F1EE}\u{1F1F9}', ES: '\u{1F1EA}\u{1F1F8}',
  KR: '\u{1F1F0}\u{1F1F7}', BR: '\u{1F1E7}\u{1F1F7}', IN: '\u{1F1EE}\u{1F1F3}', MX: '\u{1F1F2}\u{1F1FD}',
  ZA: '\u{1F1FF}\u{1F1E6}', TR: '\u{1F1F9}\u{1F1F7}', RU: '\u{1F1F7}\u{1F1FA}', AU: '\u{1F1E6}\u{1F1FA}',
  CA: '\u{1F1E8}\u{1F1E6}', ID: '\u{1F1EE}\u{1F1E9}', AR: '\u{1F1E6}\u{1F1F7}', PL: '\u{1F1F5}\u{1F1F1}',
};

const RATING_ORDER: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 'A+': 5, 'A': 6, 'A-': 7,
  'BBB+': 8, 'BBB': 9, 'BBB-': 10, 'BB+': 11, 'BB': 12, 'BB-': 13,
  'B+': 14, 'B': 15, 'B-': 16, 'CCC': 17,
};

// ── Color helpers ──

function getTierColor(tier: string): { text: string; bg: string } {
  switch (tier) {
    case 'LOW': return { text: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    case 'MODERATE': return { text: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    case 'ELEVATED': return { text: 'text-orange-400', bg: 'bg-orange-400/15' };
    case 'HIGH': return { text: 'text-red-400', bg: 'bg-red-400/15' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/15' };
  }
}

function getOutlookColor(outlook: string): string {
  switch (outlook) {
    case 'Positive': return 'text-emerald-400 bg-emerald-400/10';
    case 'Negative': return 'text-red-400 bg-red-400/10';
    case 'Watch': return 'text-amber-400 bg-amber-400/10';
    default: return 'text-neutral-500 bg-neutral-500/10';
  }
}

function getChangeColor(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function getSignColor(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function getCdsColor(spread: number): string {
  if (spread > 500) return 'text-red-400';
  if (spread > 200) return 'text-orange-400';
  if (spread > 100) return 'text-yellow-400';
  return 'text-emerald-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return '#34d399'; // emerald-400
  if (score >= 55) return '#fbbf24'; // yellow-400
  if (score >= 35) return '#fb923c'; // orange-400
  return '#f87171'; // red-400
}

function getAlertInfo(alert: string | null): { label: string; color: string } | null {
  if (!alert) return null;
  switch (alert) {
    case 'CDS_SPIKE': return { label: 'CDS SPIKE', color: 'text-red-400 bg-red-400/15' };
    case 'DOWNGRADE_RISK': return { label: 'DG RISK', color: 'text-orange-400 bg-orange-400/15' };
    case 'FISCAL_STRESS': return { label: 'FISC STRESS', color: 'text-amber-400 bg-amber-400/15' };
    default: return { label: alert, color: 'text-neutral-400 bg-neutral-400/10' };
  }
}

// ── Sorting ──

function sortEntries(entries: CountryRiskEntry[], sortKey: SortKey, asc: boolean): CountryRiskEntry[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'country': cmp = a.country.localeCompare(b.country); break;
      case 'creditRating': cmp = (RATING_ORDER[a.creditRating] ?? 99) - (RATING_ORDER[b.creditRating] ?? 99); break;
      case 'cdsSpread5y': cmp = a.cdsSpread5y - b.cdsSpread5y; break;
      case 'cdsChange1d': cmp = a.cdsChange1d - b.cdsChange1d; break;
      case 'debtToGdp': cmp = a.debtToGdp - b.debtToGdp; break;
      case 'fiscalBalance': cmp = a.fiscalBalance - b.fiscalBalance; break;
      case 'currentAccount': cmp = a.currentAccount - b.currentAccount; break;
      case 'inflation': cmp = a.inflation - b.inflation; break;
      case 'policyRate': cmp = a.policyRate - b.policyRate; break;
      case 'realRate': cmp = a.realRate - b.realRate; break;
      case 'gdpGrowth': cmp = a.gdpGrowth - b.gdpGrowth; break;
      case 'overallRiskScore': cmp = a.overallRiskScore - b.overallRiskScore; break;
      case 'riskTier': cmp = a.overallRiskScore - b.overallRiskScore; break;
      default: cmp = 0;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Sparkline component ──

function CdsSparkline({ values }: { values: number[] }) {
  const W = 48;
  const H = 14;
  const PAD = 1;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Color based on trend: last > first = widening (red), else green
  const trend = values[values.length - 1] > values[0];
  const color = trend ? '#f87171' : '#34d399';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="inline-block" style={{ width: 48, height: 14 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.5}
        fill={color}
      />
    </svg>
  );
}

// ── Score bar ──

function ScoreBar({ score }: { score: number }) {
  const color = getScoreBarColor(score);
  return (
    <div className="flex items-center gap-1">
      <div className="w-10 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${score}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[8px] font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Table header cell ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-orange-400 select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-orange-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Matrix tile ──

function MatrixTile({ entry }: { entry: CountryRiskEntry }) {
  const tierColor = getTierColor(entry.riskTier);
  return (
    <div
      className={`p-1.5 border border-border/20 bg-[#060606] hover:bg-orange-400/[0.02] transition-colors`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono font-black text-white">
          {FLAG_MAP[entry.code] || ''} {entry.code}
        </span>
        <span className={`text-[7px] font-mono font-bold px-1 py-0.5 ${tierColor.text} ${tierColor.bg}`}>
          {entry.riskTier}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-0.5">
        <span className={`text-[9px] font-mono font-bold ${getCdsColor(entry.cdsSpread5y)}`}>
          {entry.cdsSpread5y}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">bps</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-500">{entry.creditRating}</span>
        <ScoreBar score={entry.overallRiskScore} />
      </div>
    </div>
  );
}

// ── Main Panel ──

export function CountryRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCountryRisk();

  const [view, setView] = useState<ViewMode>('TABLE');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('overallRiskScore');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'country' || key === 'creditRating');
    }
  };

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let entries = data.entries;
    if (regionFilter !== 'ALL') {
      entries = entries.filter((e) => REGION_MAP[e.region] === regionFilter);
    }
    return sortEntries(entries, sortKey, sortAsc);
  }, [data, regionFilter, sortKey, sortAsc]);

  // Group entries by region for matrix view
  const groupedByRegion = useMemo(() => {
    const groups: Record<string, CountryRiskEntry[]> = {};
    for (const entry of filteredEntries) {
      const region = entry.region;
      if (!groups[region]) groups[region] = [];
      groups[region].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'countryRiskTitle', 'Country Risk')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 text-orange-400 bg-orange-400/10">
              GRI {data.globalRiskIndex}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0 gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          {(['TABLE', 'MATRIX'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                view === v
                  ? 'text-orange-400 bg-orange-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Region filter */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors whitespace-nowrap ${
                regionFilter === r
                  ? 'text-orange-400 bg-orange-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'countryRiskNoData', 'No data available')}
          </div>
        )}

        {data && view === 'TABLE' && (
          <TableView
            entries={filteredEntries}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
          />
        )}

        {data && view === 'MATRIX' && (
          <MatrixView groups={groupedByRegion} />
        )}
      </div>
    </div>
  );
}

// ── Table View ──

function TableView({
  entries,
  sortKey,
  sortAsc,
  onSort,
}: {
  entries: CountryRiskEntry[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <Th label="Country" sortKey="country" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Rating" sortKey="creditRating" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="CDS 5Y" sortKey="cdsSpread5y" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label={'\u0394 1D'} sortKey="cdsChange1d" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Debt/GDP" sortKey="debtToGdp" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Fisc Bal" sortKey="fiscalBalance" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Cur Acct" sortKey="currentAccount" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="CPI" sortKey="inflation" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Rate" sortKey="policyRate" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Real" sortKey="realRate" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="GDP" sortKey="gdpGrowth" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Score" sortKey="overallRiskScore" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Tier" sortKey="riskTier" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Alert
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Spark
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <TableRow key={entry.code} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ entry }: { entry: CountryRiskEntry }) {
  const tierColor = getTierColor(entry.riskTier);
  const outlookColor = getOutlookColor(entry.ratingOutlook);
  const alertInfo = getAlertInfo(entry.alert);

  return (
    <tr className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors">
      {/* Country + flag */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className="text-white font-bold">
          {FLAG_MAP[entry.code] || ''} {entry.code}
        </span>
      </td>

      {/* Rating + Outlook */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className="text-neutral-300 font-bold">{entry.creditRating}</span>
        <span className={`ml-1 text-[7px] px-1 py-0.5 ${outlookColor}`}>
          {entry.ratingOutlook.slice(0, 3).toUpperCase()}
        </span>
      </td>

      {/* CDS 5Y */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getCdsColor(entry.cdsSpread5y)}`}>
        {entry.cdsSpread5y.toFixed(1)}
      </td>

      {/* CDS change 1D + 1W */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`font-bold ${getChangeColor(entry.cdsChange1d)}`}>
          {entry.cdsChange1d > 0 ? '+' : ''}{entry.cdsChange1d.toFixed(1)}
        </span>
        <span className={`ml-1 text-[7px] ${getChangeColor(entry.cdsChange1w)}`}>
          {entry.cdsChange1w > 0 ? '+' : ''}{entry.cdsChange1w.toFixed(1)}w
        </span>
      </td>

      {/* Debt/GDP */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${entry.debtToGdp > 100 ? 'text-red-400' : 'text-neutral-300'}`}>
        {entry.debtToGdp.toFixed(1)}%
      </td>

      {/* Fiscal Balance */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getSignColor(entry.fiscalBalance)}`}>
        {entry.fiscalBalance > 0 ? '+' : ''}{entry.fiscalBalance.toFixed(1)}%
      </td>

      {/* Current Account */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getSignColor(entry.currentAccount)}`}>
        {entry.currentAccount > 0 ? '+' : ''}{entry.currentAccount.toFixed(1)}%
      </td>

      {/* Inflation */}
      <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
        {entry.inflation.toFixed(1)}%
      </td>

      {/* Policy Rate */}
      <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
        {entry.policyRate.toFixed(2)}%
      </td>

      {/* Real Rate */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${entry.realRate < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
        {entry.realRate > 0 ? '+' : ''}{entry.realRate.toFixed(2)}%
      </td>

      {/* GDP Growth */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getSignColor(entry.gdpGrowth)}`}>
        {entry.gdpGrowth > 0 ? '+' : ''}{entry.gdpGrowth.toFixed(1)}%
      </td>

      {/* Risk Score */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <ScoreBar score={entry.overallRiskScore} />
      </td>

      {/* Tier */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`text-[7px] font-bold px-1 py-0.5 ${tierColor.text} ${tierColor.bg}`}>
          {entry.riskTier}
        </span>
      </td>

      {/* Alert */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        {alertInfo && (
          <span className={`text-[7px] font-bold px-1 py-0.5 ${alertInfo.color}`}>
            {alertInfo.label}
          </span>
        )}
      </td>

      {/* Sparkline */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <CdsSparkline values={entry.cdsHistory} />
      </td>
    </tr>
  );
}

// ── Matrix View ──

function MatrixView({ groups }: { groups: Record<string, CountryRiskEntry[]> }) {
  const t = useT();
  const regionOrder = ['North America', 'Europe', 'Asia', 'Latin America', 'Africa/ME', 'Oceania'];

  return (
    <div className="px-3 py-2 space-y-3">
      {regionOrder.map((region) => {
        const entries = groups[region];
        if (!entries || entries.length === 0) return null;
        return (
          <div key={region}>
            <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 border-b border-border/10 pb-1">
              {tr(t, `region_${region}`, region)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {entries.map((entry) => (
                <MatrixTile key={entry.code} entry={entry} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
