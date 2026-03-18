import { useState, useMemo } from 'react';
import { useCounterpartyExposure } from '../../api/hooks/use-counterparty-exposure';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

interface Counterparty {
  name: string;
  currentExposure: number;
  pfe: number;
  cva: number;
  dva: number;
  collateralHeld: number;
  netExposure: number;
  creditRating: string;
  ratingOutlook: string;
  limit: number;
  utilization: number;
}

interface ProductExposure {
  product: string;
  grossExposure: number;
  nettingBenefit: number;
  netExposure: number;
  tradeCount: number;
  avgMaturity: number;
}

interface WrongWayRisk {
  counterparty: string;
  product: string;
  notional: number;
  correlation: number;
  wwrCharge: number;
  flag: string;
}

interface MarginCall {
  counterparty: string;
  direction: string;
  amount: number;
  disputed: number;
  deadline: string;
  status: string;
  responseTime: string;
}

interface CounterpartyExposureData {
  totalExposure: number;
  totalPfe: number;
  totalCva: number;
  totalCollateral: number;
  totalNetExposure: number;
  counterparties: Counterparty[];
  productExposures: ProductExposure[];
  wrongWayRisks: WrongWayRisk[];
  marginCalls: MarginCall[];
  timestamp: string;
}

// ── Tab type ──

type TabKey = 'EXPOSURES' | 'PRODUCTS' | 'WWR' | 'MARGIN';

const TABS: { key: TabKey; label: string; fallback: string }[] = [
  { key: 'EXPOSURES', label: 'ceTabExposures', fallback: 'Top Exposures' },
  { key: 'PRODUCTS', label: 'ceTabProducts', fallback: 'By Product' },
  { key: 'WWR', label: 'ceTabWwr', fallback: 'Wrong-Way Risk' },
  { key: 'MARGIN', label: 'ceTabMargin', fallback: 'Margin Calls' },
];

// ── Formatting helpers ──

function fmtAmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtCorr(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

// ── Color helpers ──

function getRatingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-green-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function getUtilColor(pct: number): string {
  if (pct >= 90) return '#f87171';
  if (pct >= 75) return '#fb923c';
  if (pct >= 50) return '#fbbf24';
  return '#4ade80';
}

function getExposureColor(net: number): string {
  if (net > 0) return 'text-red-400';
  return 'text-emerald-400';
}

function getCorrColor(corr: number): string {
  if (corr > 0.5) return 'text-red-400';
  if (corr > 0.3) return 'text-orange-400';
  if (corr > 0.1) return 'text-yellow-400';
  return 'text-neutral-400';
}

function getStatusColor(status: string): { text: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'pending': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'sent': return { text: 'text-blue-400', bg: 'bg-blue-400/10' };
    case 'received': return { text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    case 'disputed': return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'settled': return { text: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

function getFlagColor(flag: string): { text: string; bg: string } {
  switch (flag.toUpperCase()) {
    case 'HIGH': return { text: 'text-red-400', bg: 'bg-red-400/15' };
    case 'MEDIUM': return { text: 'text-orange-400', bg: 'bg-orange-400/15' };
    case 'LOW': return { text: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    default: return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

// ── Sorting ──

type ExposureSortKey = 'name' | 'currentExposure' | 'pfe' | 'netExposure' | 'creditRating' | 'utilization';

const RATING_ORDER: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 'A+': 5, 'A': 6, 'A-': 7,
  'BBB+': 8, 'BBB': 9, 'BBB-': 10, 'BB+': 11, 'BB': 12, 'BB-': 13,
  'B+': 14, 'B': 15, 'B-': 16, 'CCC': 17, 'CC': 18, 'C': 19, 'D': 20,
};

function sortCounterparties(entries: Counterparty[], key: ExposureSortKey, asc: boolean): Counterparty[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'currentExposure': cmp = a.currentExposure - b.currentExposure; break;
      case 'pfe': cmp = a.pfe - b.pfe; break;
      case 'netExposure': cmp = a.netExposure - b.netExposure; break;
      case 'creditRating': cmp = (RATING_ORDER[a.creditRating] ?? 99) - (RATING_ORDER[b.creditRating] ?? 99); break;
      case 'utilization': cmp = a.utilization - b.utilization; break;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Sortable Table Header ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: ExposureSortKey;
  currentSort: ExposureSortKey;
  currentAsc: boolean;
  onSort: (key: ExposureSortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-red-400 select-none whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-red-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Utilization Bar ──

function UtilBar({ pct }: { pct: number }) {
  const color = getUtilColor(pct);
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[7px] font-mono tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Main Panel ──

export function CounterpartyExposurePanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useCounterpartyExposure();
  const data = rawData as CounterpartyExposureData | undefined;

  const [activeTab, setActiveTab] = useState<TabKey>('EXPOSURES');
  const [sortKey, setSortKey] = useState<ExposureSortKey>('netExposure');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: ExposureSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'creditRating');
    }
  };

  const sortedCounterparties = useMemo(() => {
    if (!data?.counterparties) return [];
    return sortCounterparties(data.counterparties, sortKey, sortAsc);
  }, [data, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'ceTitle', 'Counterparty Exposure')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 text-red-400 bg-red-400/10">
              NET {fmtAmt(data.totalNetExposure)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {data && (
        <div className="flex items-center gap-0 border-b border-border/20 shrink-0 bg-[#050505]">
          <SummaryCell label={tr(t, 'ceGrossExp', 'Gross Exp')} value={fmtAmt(data.totalExposure)} />
          <SummaryCell label={tr(t, 'cePfe', 'PFE')} value={fmtAmt(data.totalPfe)} />
          <SummaryCell label={tr(t, 'ceCva', 'CVA')} value={fmtAmt(data.totalCva)} accent />
          <SummaryCell label={tr(t, 'ceCollateral', 'Collateral')} value={fmtAmt(data.totalCollateral)} />
          <SummaryCell label={tr(t, 'ceNet', 'Net')} value={fmtAmt(data.totalNetExposure)} accent />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[7px] font-mono font-bold uppercase px-2 py-0.5 transition-colors ${
              activeTab === tab.key
                ? 'text-red-400 bg-red-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tr(t, tab.label, tab.fallback)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400/60 text-[9px] font-mono uppercase">
            {tr(t, 'ceError', 'Failed to load counterparty data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'ceNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'EXPOSURES' && (
          <ExposuresTable
            entries={sortedCounterparties}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
          />
        )}

        {data && activeTab === 'PRODUCTS' && (
          <ProductBreakdown products={data.productExposures} />
        )}

        {data && activeTab === 'WWR' && (
          <WrongWayRiskTable risks={data.wrongWayRisks} />
        )}

        {data && activeTab === 'MARGIN' && (
          <MarginCallSummary calls={data.marginCalls} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1.5 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'ceLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 px-2 py-1 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-[10px] font-mono font-bold tabular-nums ${accent ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

// ── Tab 1: Top Exposures Table ──

function ExposuresTable({
  entries,
  sortKey,
  sortAsc,
  onSort,
}: {
  entries: Counterparty[];
  sortKey: ExposureSortKey;
  sortAsc: boolean;
  onSort: (key: ExposureSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <Th label="Counterparty" sortKey="name" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Current Exp" sortKey="currentExposure" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="PFE" sortKey="pfe" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              CVA/DVA
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Collateral
            </th>
            <Th label="Net Exp" sortKey="netExposure" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="Rating" sortKey="creditRating" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Util" sortKey="utilization" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {entries.map((cp) => (
            <ExposureRow key={cp.name} cp={cp} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExposureRow({ cp }: { cp: Counterparty }) {
  return (
    <tr className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
      {/* Name */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className="text-white font-bold">{cp.name}</span>
      </td>

      {/* Current Exposure */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-neutral-300">
        {fmtAmt(cp.currentExposure)}
      </td>

      {/* PFE */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-neutral-300">
        {fmtAmt(cp.pfe)}
      </td>

      {/* CVA / DVA */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right">
        <span className="text-red-400 tabular-nums">{fmtAmt(cp.cva)}</span>
        <span className="text-neutral-600 mx-0.5">/</span>
        <span className="text-emerald-400 tabular-nums">{fmtAmt(cp.dva)}</span>
      </td>

      {/* Collateral */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-blue-400">
        {fmtAmt(cp.collateralHeld)}
      </td>

      {/* Net Exposure */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right tabular-nums font-bold ${getExposureColor(cp.netExposure)}`}>
        {fmtAmt(cp.netExposure)}
      </td>

      {/* Credit Rating + Outlook */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`font-bold ${getRatingColor(cp.creditRating)}`}>{cp.creditRating}</span>
        {cp.ratingOutlook && (
          <span className="ml-1 text-[7px] text-neutral-600">
            {cp.ratingOutlook.slice(0, 3).toUpperCase()}
          </span>
        )}
      </td>

      {/* Utilization */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <UtilBar pct={cp.utilization} />
      </td>
    </tr>
  );
}

// ── Tab 2: Exposure by Product ──

function ProductBreakdown({ products }: { products: ProductExposure[] }) {
  const t = useT();

  const totalGross = useMemo(
    () => products.reduce((s, p) => s + p.grossExposure, 0),
    [products],
  );

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'ceProductBreakdown', 'Exposure by Product Type')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_64px_64px_64px_48px_48px] gap-0 px-1.5 mb-0.5">
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">Product</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">Gross</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">Netting</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">Net</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">Trades</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-right">Avg Mat</span>
      </div>

      {/* Rows */}
      {products.map((p) => {
        const nettingPct = p.grossExposure > 0
          ? (p.nettingBenefit / p.grossExposure) * 100
          : 0;
        const sharePct = totalGross > 0 ? (p.grossExposure / totalGross) * 100 : 0;

        return (
          <div
            key={p.product}
            className="grid grid-cols-[1fr_64px_64px_64px_48px_48px] gap-0 px-1.5 py-[3px] border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            {/* Product name + share bar */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
                {p.product}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-16 h-1 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-red-400"
                    style={{ width: `${sharePct}%`, opacity: 0.5 }}
                  />
                </div>
                <span className="text-[6px] font-mono text-neutral-600">
                  {sharePct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Gross */}
            <span className="text-[8px] font-mono tabular-nums text-right text-neutral-300">
              {fmtAmt(p.grossExposure)}
            </span>

            {/* Netting benefit */}
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-mono tabular-nums text-emerald-400">
                -{fmtAmt(p.nettingBenefit)}
              </span>
              <span className="text-[6px] font-mono text-neutral-600">
                {nettingPct.toFixed(1)}%
              </span>
            </div>

            {/* Net */}
            <span className="text-[8px] font-mono font-bold tabular-nums text-right text-white">
              {fmtAmt(p.netExposure)}
            </span>

            {/* Trades */}
            <span className="text-[8px] font-mono tabular-nums text-right text-neutral-400">
              {p.tradeCount}
            </span>

            {/* Avg Maturity */}
            <span className="text-[8px] font-mono tabular-nums text-right text-neutral-400">
              {p.avgMaturity.toFixed(1)}Y
            </span>
          </div>
        );
      })}

      {/* Total row */}
      {products.length > 0 && (
        <div className="grid grid-cols-[1fr_64px_64px_64px_48px_48px] gap-0 px-1.5 py-1 border-t border-border/30 mt-0.5">
          <span className="text-[8px] font-mono font-black text-neutral-400 uppercase">Total</span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-neutral-300">
            {fmtAmt(products.reduce((s, p) => s + p.grossExposure, 0))}
          </span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-emerald-400">
            -{fmtAmt(products.reduce((s, p) => s + p.nettingBenefit, 0))}
          </span>
          <span className="text-[8px] font-mono font-black tabular-nums text-right text-white">
            {fmtAmt(products.reduce((s, p) => s + p.netExposure, 0))}
          </span>
          <span className="text-[8px] font-mono font-bold tabular-nums text-right text-neutral-400">
            {products.reduce((s, p) => s + p.tradeCount, 0)}
          </span>
          <span className="text-[8px] font-mono tabular-nums text-right text-neutral-600">
            --
          </span>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Wrong-Way Risk ──

function WrongWayRiskTable({ risks }: { risks: WrongWayRisk[] }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'ceWrongWayRisk', 'Wrong-Way Risk Positions')}
      </div>

      {risks.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'ceNoWwr', 'No wrong-way risk flags')}
        </div>
      )}

      {risks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Counterparty
                </th>
                <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Product
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Notional
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Correlation
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  WWR Charge
                </th>
                <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Flag
                </th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r, idx) => {
                const flagStyle = getFlagColor(r.flag);
                return (
                  <tr
                    key={`${r.counterparty}-${r.product}-${idx}`}
                    className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                      {r.counterparty}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                      {r.product}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-neutral-300">
                      {fmtAmt(r.notional)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right tabular-nums font-bold ${getCorrColor(r.correlation)}`}>
                      {fmtCorr(r.correlation)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-red-400 font-bold">
                      {fmtAmt(r.wwrCharge)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-center">
                      <span className={`text-[7px] font-bold px-1 py-0.5 ${flagStyle.text} ${flagStyle.bg}`}>
                        {r.flag.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WWR summary metrics */}
      {risks.length > 0 && (
        <div className="flex items-center gap-3 mt-2 px-1 pt-2 border-t border-border/10">
          <div>
            <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Total Charge</div>
            <div className="text-[10px] font-mono font-bold text-red-400 tabular-nums">
              {fmtAmt(risks.reduce((s, r) => s + r.wwrCharge, 0))}
            </div>
          </div>
          <div>
            <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Avg Corr</div>
            <div className={`text-[10px] font-mono font-bold tabular-nums ${getCorrColor(risks.reduce((s, r) => s + r.correlation, 0) / risks.length)}`}>
              {fmtCorr(risks.reduce((s, r) => s + r.correlation, 0) / risks.length)}
            </div>
          </div>
          <div>
            <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Flagged</div>
            <div className="text-[10px] font-mono font-bold text-white tabular-nums">
              {risks.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Margin Call Summary ──

function MarginCallSummary({ calls }: { calls: MarginCall[] }) {
  const t = useT();

  const pendingCount = useMemo(
    () => calls.filter((c) => c.status.toLowerCase() === 'pending').length,
    [calls],
  );
  const totalDisputed = useMemo(
    () => calls.reduce((s, c) => s + c.disputed, 0),
    [calls],
  );
  const totalAmount = useMemo(
    () => calls.reduce((s, c) => s + c.amount, 0),
    [calls],
  );

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'ceMarginCalls', 'Margin Call Summary')}
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-0 mb-2 border border-border/20">
        <div className="flex-1 px-2 py-1.5 border-r border-border/10">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Total Calls</div>
          <div className="text-[10px] font-mono font-bold text-white tabular-nums">{calls.length}</div>
        </div>
        <div className="flex-1 px-2 py-1.5 border-r border-border/10">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Pending</div>
          <div className="text-[10px] font-mono font-bold text-yellow-400 tabular-nums">{pendingCount}</div>
        </div>
        <div className="flex-1 px-2 py-1.5 border-r border-border/10">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Total Amt</div>
          <div className="text-[10px] font-mono font-bold text-white tabular-nums">{fmtAmt(totalAmount)}</div>
        </div>
        <div className="flex-1 px-2 py-1.5">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Disputed</div>
          <div className="text-[10px] font-mono font-bold text-red-400 tabular-nums">{fmtAmt(totalDisputed)}</div>
        </div>
      </div>

      {calls.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'ceNoMarginCalls', 'No active margin calls')}
        </div>
      )}

      {calls.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="border-b border-border/20">
                <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Counterparty
                </th>
                <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Dir
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Amount
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Disputed
                </th>
                <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Deadline
                </th>
                <th className="px-1.5 py-1 text-center text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Status
                </th>
                <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                  Resp Time
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((mc, idx) => {
                const statusStyle = getStatusColor(mc.status);
                const isReceive = mc.direction.toLowerCase() === 'receive';
                return (
                  <tr
                    key={`${mc.counterparty}-${idx}`}
                    className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                      {mc.counterparty}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-center">
                      <span className={`text-[7px] font-bold px-1 py-0.5 ${
                        isReceive
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-red-400 bg-red-400/10'
                      }`}>
                        {mc.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-neutral-300 font-bold">
                      {fmtAmt(mc.amount)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right tabular-nums ${
                      mc.disputed > 0 ? 'text-red-400 font-bold' : 'text-neutral-600'
                    }`}>
                      {mc.disputed > 0 ? fmtAmt(mc.disputed) : '--'}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                      {mc.deadline}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-center">
                      <span className={`text-[7px] font-bold px-1 py-0.5 ${statusStyle.text} ${statusStyle.bg}`}>
                        {mc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right tabular-nums text-neutral-400">
                      {mc.responseTime}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
