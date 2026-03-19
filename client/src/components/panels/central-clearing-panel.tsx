import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useCentralClearing } from '../../api/hooks/use-central-clearing';

// -- Local types --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CCPEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetClassEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegulatoryMetrics = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductBreakdown = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarginComposition = any;

type SortField =
  | 'ccp'
  | 'region'
  | 'dailyNotional'
  | 'monthlyNotional'
  | 'im'
  | 'defaultFund'
  | 'members'
  | 'top5Share';

// -- Formatting helpers --

function fmtAmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1) + '%';
}

function fmtInt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// -- Color helpers --

function shareColor(pct: number | null | undefined): string {
  if (pct == null) return 'text-neutral-500';
  if (pct >= 60) return 'text-red-400';
  if (pct >= 40) return 'text-yellow-400';
  return 'text-neutral-400';
}

function coverageColor(ratio: number | null | undefined): string {
  if (ratio == null) return 'text-neutral-500';
  if (ratio >= 1.1) return 'text-green-400';
  if (ratio >= 1.0) return 'text-yellow-400';
  return 'text-red-400';
}

function stressTestBadge(status: string | null | undefined): { label: string; cls: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'PASS' || s === 'PASSED' || s === 'COVERED') {
    return { label: 'PASS', cls: 'bg-green-400/20 text-green-400 border border-green-400/30' };
  }
  if (s === 'WARNING' || s === 'MARGINAL') {
    return { label: 'WARN', cls: 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' };
  }
  if (s === 'FAIL' || s === 'FAILED' || s === 'BREACH') {
    return { label: 'FAIL', cls: 'bg-red-400/20 text-red-400 border border-red-400/30' };
  }
  return { label: status ?? '-', cls: 'bg-neutral-400/20 text-neutral-400 border border-neutral-400/30' };
}

// -- Sort helpers --

function getSortValue(entry: CCPEntry, field: SortField): string | number {
  switch (field) {
    case 'ccp':
      return (entry?.name ?? entry?.ccp ?? '').toLowerCase();
    case 'region':
      return (entry?.region ?? '').toLowerCase();
    case 'dailyNotional':
      return entry?.dailyNotional ?? 0;
    case 'monthlyNotional':
      return entry?.monthlyNotional ?? 0;
    case 'im':
      return entry?.im ?? entry?.initialMargin ?? 0;
    case 'defaultFund':
      return entry?.defaultFund ?? 0;
    case 'members':
      return entry?.members ?? entry?.memberCount ?? 0;
    case 'top5Share':
      return entry?.top5Share ?? 0;
    default:
      return 0;
  }
}

// -- Main Panel --

export function CentralClearingPanel() {
  const { data, isLoading } = useCentralClearing();
  const [selectedCCP, setSelectedCCP] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('dailyNotional');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
          No data available
        </div>
      </div>
    );
  }

  const ccps: CCPEntry[] = data?.ccps ?? data?.clearingHouses ?? [];
  const assetClasses: AssetClassEntry[] = data?.assetClasses ?? data?.assetClassBreakdown ?? [];
  const regulatory: RegulatoryMetrics = data?.regulatory ?? data?.regulatoryMetrics;
  const totalNotional: number | undefined = data?.totalNotional ?? data?.summary?.totalNotional;
  const totalIM: number | undefined = data?.totalIM ?? data?.summary?.totalIM ?? data?.summary?.totalInitialMargin;

  const selectedEntry = selectedCCP
    ? ccps.find((c: CCPEntry) => (c?.name ?? c?.ccp) === selectedCCP)
    : null;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <HeaderSection
        totalNotional={totalNotional}
        totalIM={totalIM}
        isLoading={isLoading}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* CCP Table */}
        <CCPTableSection
          ccps={ccps}
          sortField={sortField}
          sortAsc={sortAsc}
          selectedCCP={selectedCCP}
          onSort={(field) => {
            if (field === sortField) {
              setSortAsc(!sortAsc);
            } else {
              setSortField(field);
              setSortAsc(false);
            }
          }}
          onSelect={(name) => setSelectedCCP(name === selectedCCP ? null : name)}
        />

        {/* Selected CCP detail */}
        {selectedEntry && (
          <CCPDetailSection entry={selectedEntry} />
        )}

        {/* Asset class breakdown */}
        {assetClasses.length > 0 && (
          <AssetClassSection items={assetClasses} />
        )}

        {/* Regulatory metrics */}
        {regulatory && (
          <RegulatorySection metrics={regulatory} />
        )}
      </div>
    </div>
  );
}

// -- 1. Header Section --

function HeaderSection({
  totalNotional,
  totalIM,
  isLoading,
}: {
  totalNotional: number | undefined;
  totalIM: number | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-indigo-400/30 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-indigo-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
          Central Clearing Statistics
        </span>
      </div>
      <div className="flex items-center gap-3">
        {totalNotional != null && (
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Notional
            </span>
            <span className="text-[9px] font-mono font-bold text-white/80 tabular-nums">
              {fmtAmt(totalNotional)}
            </span>
          </div>
        )}
        {totalIM != null && (
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              Total IM
            </span>
            <span className="text-[9px] font-mono font-bold text-indigo-400 tabular-nums">
              {fmtAmt(totalIM)}
            </span>
          </div>
        )}
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
      </div>
    </div>
  );
}

// -- 2. CCP Table Section --

const CCP_COLUMNS: { key: SortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'ccp', label: 'CCP', align: 'left' },
  { key: 'region', label: 'Region', align: 'left' },
  { key: 'dailyNotional', label: 'Daily Notional', align: 'right' },
  { key: 'monthlyNotional', label: 'Monthly', align: 'right' },
  { key: 'im', label: 'IM', align: 'right' },
  { key: 'defaultFund', label: 'Default Fund', align: 'right' },
  { key: 'members', label: 'Members', align: 'right' },
  { key: 'top5Share', label: 'Top5 Share', align: 'right' },
];

function CCPTableSection({
  ccps,
  sortField,
  sortAsc,
  selectedCCP,
  onSort,
  onSelect,
}: {
  ccps: CCPEntry[];
  sortField: SortField;
  sortAsc: boolean;
  selectedCCP: string | null;
  onSort: (field: SortField) => void;
  onSelect: (name: string) => void;
}) {
  const sorted = useMemo(() => {
    const copy = [...ccps];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [ccps, sortField, sortAsc]);

  return (
    <div className="border-b border-border/20">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            {CCP_COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-2 py-1.5 font-bold cursor-pointer select-none hover:text-indigo-400 transition-colors ${
                  col.align === 'left' ? 'text-left' : 'text-right'
                } ${sortField === col.key ? 'text-indigo-400' : ''}`}
                onClick={() => onSort(col.key)}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="ml-0.5">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((ccp: CCPEntry, i: number) => {
            const name = ccp?.name ?? ccp?.ccp ?? `CCP-${i}`;
            const isSelected = name === selectedCCP;
            return (
              <tr
                key={name}
                className={`border-b border-border/5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-400/[0.06]'
                    : 'hover:bg-indigo-400/[0.02]'
                }`}
                onClick={() => onSelect(name)}
              >
                <td className="px-2 py-1 text-left text-indigo-400 font-bold truncate max-w-[100px]">
                  {name}
                </td>
                <td className="px-2 py-1 text-left text-neutral-400">
                  {ccp?.region ?? '-'}
                </td>
                <td className="px-2 py-1 text-right text-white/80 tabular-nums">
                  {fmtAmt(ccp?.dailyNotional)}
                </td>
                <td className="px-2 py-1 text-right text-white/70 tabular-nums">
                  {fmtAmt(ccp?.monthlyNotional)}
                </td>
                <td className="px-2 py-1 text-right text-indigo-400 font-bold tabular-nums">
                  {fmtAmt(ccp?.im ?? ccp?.initialMargin)}
                </td>
                <td className="px-2 py-1 text-right text-white/70 tabular-nums">
                  {fmtAmt(ccp?.defaultFund)}
                </td>
                <td className="px-2 py-1 text-right text-white/70 tabular-nums">
                  {fmtInt(ccp?.members ?? ccp?.memberCount)}
                </td>
                <td className={`px-2 py-1 text-right font-bold tabular-nums ${shareColor(ccp?.top5Share)}`}>
                  {fmtPct(ccp?.top5Share)}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- 3. CCP Detail Section --

function CCPDetailSection({ entry }: { entry: CCPEntry }) {
  const products: ProductBreakdown[] = entry?.products ?? entry?.productBreakdown ?? [];
  const marginComposition: MarginComposition = entry?.marginComposition ?? entry?.margin;
  const stressTest = entry?.stressTest ?? entry?.stressTestStatus;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
        <span className="text-[8px] font-mono font-black text-indigo-400 uppercase tracking-wider">
          {entry?.name ?? entry?.ccp ?? 'CCP'} Detail
        </span>
        {stressTest && (
          <StressTestBadge status={typeof stressTest === 'string' ? stressTest : stressTest?.status} />
        )}
      </div>

      {/* Product Breakdown - horizontal bar chart */}
      {products.length > 0 && (
        <ProductBreakdownChart products={products} />
      )}

      {/* Margin Composition */}
      {marginComposition && (
        <MarginCompositionSection composition={marginComposition} />
      )}
    </div>
  );
}

function StressTestBadge({ status }: { status: string | null | undefined }) {
  const badge = stressTestBadge(status);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider ${badge.cls}`}>
      Stress: {badge.label}
    </span>
  );
}

function ProductBreakdownChart({ products }: { products: ProductBreakdown[] }) {
  const maxVal = products.reduce((mx: number, p: ProductBreakdown) => {
    const v = p?.volume ?? p?.notional ?? p?.value ?? 0;
    return Math.max(mx, v);
  }, 0) || 1;

  return (
    <div className="px-3 py-2 border-b border-border/10">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
        Product Breakdown
      </div>
      <div className="space-y-1">
        {products.map((p: ProductBreakdown, i: number) => {
          const name = p?.product ?? p?.name ?? p?.assetClass ?? `Product-${i}`;
          const value = p?.volume ?? p?.notional ?? p?.value ?? 0;
          const share = p?.share ?? (maxVal > 0 ? (value / maxVal) * 100 : 0);
          const barWidth = Math.max((value / maxVal) * 100, 1);

          return (
            <div key={name} className="hover:bg-indigo-400/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono text-white/80 uppercase truncate">
                  {name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[8px] font-mono text-indigo-400 tabular-nums font-bold">
                    {fmtAmt(value)}
                  </span>
                  <span className="text-[7px] font-mono text-neutral-500 tabular-nums w-[32px] text-right">
                    {fmtPct(share)}
                  </span>
                </div>
              </div>
              <div className="h-[3px] w-full bg-neutral-900 relative">
                <div
                  className="h-full bg-indigo-400 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarginCompositionSection({ composition }: { composition: MarginComposition }) {
  const cash = composition?.cash ?? 0;
  const govBonds = composition?.govBonds ?? composition?.governmentBonds ?? 0;
  const other = composition?.other ?? 0;
  const total = cash + govBonds + other || 1;

  const segments = [
    { label: 'Cash', value: cash, pct: (cash / total) * 100, color: 'bg-indigo-400' },
    { label: 'Gov Bonds', value: govBonds, pct: (govBonds / total) * 100, color: 'bg-indigo-400/50' },
  ];

  if (other > 0) {
    segments.push({ label: 'Other', value: other, pct: (other / total) * 100, color: 'bg-neutral-600' });
  }

  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
        Margin Composition
      </div>

      {/* Stacked bar */}
      <div className="flex h-[4px] w-full bg-neutral-900 mb-1.5">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`h-full ${seg.color} transition-all`}
            style={{ width: `${seg.pct}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <div className={`w-[6px] h-[4px] ${seg.color}`} />
            <span className="text-[7px] font-mono text-neutral-500 uppercase">
              {seg.label}
            </span>
            <span className="text-[7px] font-mono text-white/70 tabular-nums">
              {fmtAmt(seg.value)}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 tabular-nums">
              ({fmtPct(seg.pct)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- 4. Asset Class Breakdown Section --

function AssetClassSection({ items }: { items: AssetClassEntry[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-indigo-400 uppercase tracking-wider">
          Asset Class Breakdown
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Asset Class</th>
            <th className="px-2 py-1.5 text-right font-bold">Volume</th>
            <th className="px-2 py-1.5 text-right font-bold">Share</th>
            <th className="px-2 py-1.5 text-left font-bold">Dominant CCP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: AssetClassEntry, i: number) => {
            const name = item?.assetClass ?? item?.name ?? `Class-${i}`;
            return (
              <tr
                key={name}
                className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-left text-white/80 font-bold uppercase">
                  {name}
                </td>
                <td className="px-2 py-1 text-right text-white/70 tabular-nums">
                  {fmtAmt(item?.volume ?? item?.notional)}
                </td>
                <td className="px-2 py-1 text-right text-indigo-400 font-bold tabular-nums">
                  {fmtPct(item?.share ?? item?.marketShare)}
                </td>
                <td className="px-2 py-1 text-left text-neutral-400 truncate max-w-[80px]">
                  {item?.dominantCCP ?? item?.topCCP ?? '-'}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- 5. Regulatory Metrics Section --

function RegulatorySection({ metrics }: { metrics: RegulatoryMetrics }) {
  const coverageRatio = metrics?.coverageRatio ?? metrics?.coverage;
  const sitg = metrics?.sitg ?? metrics?.skinInTheGame;
  const qualifiedResources = metrics?.qualifiedResources ?? metrics?.totalResources;

  const entries = [
    {
      label: 'Coverage Ratio',
      value: coverageRatio != null ? coverageRatio.toFixed(2) + 'x' : '-',
      colorCls: coverageColor(coverageRatio),
      sub: 'Cover 1 / Cover 2 stress scenario',
    },
    {
      label: 'Skin in the Game (SITG)',
      value: sitg != null ? fmtAmt(sitg) : '-',
      colorCls: 'text-indigo-400',
      sub: 'CCP own capital at risk',
    },
    {
      label: 'Qualified Resources',
      value: qualifiedResources != null ? fmtAmt(qualifiedResources) : '-',
      colorCls: 'text-white/80',
      sub: 'IM + Default Fund + SITG',
    },
  ];

  // Additional regulatory fields if present
  const additionalFields: { label: string; value: string; colorCls: string }[] = [];

  if (metrics?.concentrationRatio != null) {
    additionalFields.push({
      label: 'Concentration Ratio',
      value: fmtPct(metrics.concentrationRatio),
      colorCls: shareColor(metrics.concentrationRatio),
    });
  }
  if (metrics?.liquidityRatio != null) {
    additionalFields.push({
      label: 'Liquidity Ratio',
      value: metrics.liquidityRatio.toFixed(2) + 'x',
      colorCls: coverageColor(metrics.liquidityRatio),
    });
  }
  if (metrics?.recoveryRate != null) {
    additionalFields.push({
      label: 'Recovery Rate',
      value: fmtPct(metrics.recoveryRate),
      colorCls: 'text-white/70',
    });
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-indigo-400 uppercase tracking-wider">
          Regulatory Metrics
        </span>
      </div>

      <div className="grid grid-cols-3 gap-0">
        {entries.map((e) => (
          <div
            key={e.label}
            className="px-2 py-2 border-r border-border/20 last:border-r-0"
          >
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {e.label}
            </div>
            <div className={`text-[11px] font-mono font-black tabular-nums mt-0.5 ${e.colorCls}`}>
              {e.value}
            </div>
            <div className="text-[6px] font-mono text-neutral-600 mt-0.5">
              {e.sub}
            </div>
          </div>
        ))}
      </div>

      {additionalFields.length > 0 && (
        <div className="grid grid-cols-3 gap-0 border-t border-border/10">
          {additionalFields.map((f) => (
            <div
              key={f.label}
              className="px-2 py-1.5 border-r border-border/20 last:border-r-0"
            >
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {f.label}
              </div>
              <div className={`text-[9px] font-mono font-bold tabular-nums mt-0.5 ${f.colorCls}`}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
