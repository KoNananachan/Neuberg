import { useState, useMemo } from 'react';
import { useSecuritiesBorrowingLending } from '../../api/hooks/use-securities-borrowing-lending';
import { useT } from '../../i18n';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Constants --

const ACCENT = '#f87171'; // red-400
const ACCENT_DIM = 'rgba(248,113,113,0.08)';

const TABS = ['hotStocks', 'sectors', 'feeDistribution', 'recentChanges'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  hotStocks: 'HOT STOCKS',
  sectors: 'SECTORS',
  feeDistribution: 'FEE DISTRIBUTION',
  recentChanges: 'RECENT CHANGES',
};

// -- Formatting helpers --

function fmtPct(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  return `${v.toFixed(2)}%`;
}

function fmtBps(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  return `${v.toFixed(1)}bp`;
}

function fmtMoney(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtNum(n: unknown): string {
  const v = Number(n);
  if (Number.isNaN(v)) return '--';
  return v.toLocaleString();
}

// -- Color helpers --

function feeColor(fee: unknown): string {
  const v = Number(fee);
  if (v >= 500) return '#f87171';   // red-400 high fee
  if (v >= 200) return '#fb923c';   // orange-400
  if (v >= 50) return '#fbbf24';    // yellow-400
  return '#4ade80';                  // green-400 low fee
}

function changeColor(n: unknown): string {
  const v = Number(n);
  if (v > 0) return 'text-red-400';
  if (v < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changeSign(n: unknown): string {
  const v = Number(n);
  if (v > 0) return '+';
  return '';
}

function specialFlag(flag: unknown): boolean {
  return flag === true || flag === 'SPECIAL' || flag === 'special';
}

// -- Main Panel --

export function SecuritiesBorrowingLendingPanel() {
  const t = useT();
  const { data, isLoading, error } = useSecuritiesBorrowingLending();
  const [activeTab, setActiveTab] = useState<Tab>('hotStocks');
  const [sortCol, setSortCol] = useState<string>('fee');
  const [sortAsc, setSortAsc] = useState(false);

  // Sort hot stocks
  const sortedHotStocks = useMemo(() => {
    if (!data?.hotStocks) return [];
    const arr = [...data.hotStocks];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'sblLoading', 'Loading securities borrowing & lending data...')}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'sblError', 'Failed to load data')}
        </div>
      </div>
    );
  }

  const stats = data?.marketStats;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Stats Header */}
      {stats ? (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Total On Loan</div>
            <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
              {fmtMoney(stats.totalOnLoan)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Avg Fee</div>
            <div className="text-[11px] font-mono font-black text-white/80">
              {fmtBps(stats.avgFee)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Utilization</div>
            <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
              {fmtPct(stats.utilization)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Specials</div>
            <div className="text-[11px] font-mono font-black text-yellow-300">
              {fmtNum(stats.specialCount)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Lendable</div>
            <div className="text-[11px] font-mono font-black text-white/60">
              {fmtMoney(stats.lendableValue)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === tab ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: activeTab === tab ? ACCENT_DIM : 'transparent',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'hotStocks' ? (
          <HotStocksTab
            stocks={sortedHotStocks}
            sortCol={sortCol}
            sortAsc={sortAsc}
            onSort={handleSort}
            t={t}
          />
        ) : activeTab === 'sectors' ? (
          <SectorsTab sectors={data?.sectorSummary ?? []} t={t} />
        ) : activeTab === 'feeDistribution' ? (
          <FeeDistributionTab distribution={data?.feeDistribution ?? []} t={t} />
        ) : activeTab === 'recentChanges' ? (
          <RecentChangesTab changes={data?.recentChanges ?? []} t={t} />
        ) : null}
      </div>
    </div>
  );
}

// -- Sort Header Component --

function SortHeader({
  col,
  label,
  right,
  sortCol,
  sortAsc,
  onSort,
}: {
  col: string;
  label: string;
  right?: boolean;
  sortCol: string;
  sortAsc: boolean;
  onSort: (col: string) => void;
}) {
  return (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${
        right ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(col)}
    >
      {label}
      {sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );
}

// -- Tab 1: Hot Stocks --

function HotStocksTab({
  stocks,
  sortCol,
  sortAsc,
  onSort,
  t,
}: {
  stocks: any[];
  sortCol: string;
  sortAsc: boolean;
  onSort: (col: string) => void;
  t: TFn;
}) {
  if (stocks.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        {tr(t, 'sblNoHotStocks', 'No hot stocks data available')}
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
        <tr>
          <SortHeader col="ticker" label="Ticker" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="fee" label="Fee" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="utilization" label="Util%" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="available" label="Avail" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="onLoan" label="On Loan" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="daysToCover" label="DTC" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <SortHeader col="change" label="Chg" right sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
          <th className="px-2 py-1.5 text-center font-bold">Flag</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((s: any, idx: number) => {
          const isSpecial = specialFlag(s.special);
          return (
            <tr
              key={String(s.ticker ?? idx)}
              className={`border-b border-border/5 hover:bg-red-400/[0.02] ${isSpecial ? 'bg-yellow-300/[0.03]' : ''}`}
            >
              {/* Ticker */}
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: feeColor(s.fee) }}>
                  {String(s.ticker ?? '--')}
                </span>
                {s.sector ? (
                  <span className="text-neutral-500 ml-1.5 text-[8px]">{String(s.sector)}</span>
                ) : null}
              </td>

              {/* Fee */}
              <td className="px-2 py-1.5 text-right font-bold" style={{ color: feeColor(s.fee) }}>
                {fmtBps(s.fee)}
              </td>

              {/* Utilization */}
              <td
                className="px-2 py-1.5 text-right"
                style={{
                  color:
                    Number(s.utilization) >= 90
                      ? '#f87171'
                      : Number(s.utilization) >= 70
                        ? '#fbbf24'
                        : 'rgba(255,255,255,0.5)',
                }}
              >
                {fmtPct(s.utilization)}
              </td>

              {/* Available */}
              <td className="px-2 py-1.5 text-right text-white/50">
                {fmtNum(s.available)}
              </td>

              {/* On Loan */}
              <td className="px-2 py-1.5 text-right text-white/60">
                {fmtMoney(s.onLoan)}
              </td>

              {/* Days to Cover */}
              <td className="px-2 py-1.5 text-right text-white/50">
                {String(s.daysToCover ?? '--')}
              </td>

              {/* Change */}
              <td className={`px-2 py-1.5 text-right ${changeColor(s.change)}`}>
                {changeSign(s.change)}{fmtBps(s.change)}
              </td>

              {/* Special Flag */}
              <td className="px-2 py-1.5 text-center">
                {isSpecial ? (
                  <span className="text-[7px] font-black text-yellow-300 bg-yellow-300/10 px-1 py-px">
                    SPECIAL
                  </span>
                ) : (
                  <span className="text-neutral-700">-</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// -- Tab 2: Sectors --

function SectorsTab({ sectors, t }: { sectors: any[]; t: TFn }) {
  if (sectors.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        {tr(t, 'sblNoSectors', 'No sector data available')}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
        {tr(t, 'sblSectorBreakdown', 'Sector Borrowing & Lending Breakdown')}
      </div>
      {sectors.map((s: any, idx: number) => {
        const utilPct = Number(s.utilization) || 0;
        return (
          <div
            key={String(s.sector ?? idx)}
            className="border border-border/20 p-3 hover:bg-red-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>
                {String(s.sector ?? '--')}
              </span>
              <div className="flex items-center gap-3">
                {s.specialCount ? (
                  <span className="text-[7px] font-black text-yellow-300 bg-yellow-300/10 px-1 py-px">
                    {String(s.specialCount)} SPECIAL
                  </span>
                ) : null}
                <span className="text-[8px] font-mono text-neutral-500">
                  {fmtNum(s.stockCount)} stocks
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Avg Fee</div>
                <div className="font-bold" style={{ color: feeColor(s.avgFee) }}>
                  {fmtBps(s.avgFee)}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Utilization</div>
                <div
                  className="font-bold"
                  style={{
                    color: utilPct >= 90 ? '#f87171' : utilPct >= 70 ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {fmtPct(s.utilization)}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">On Loan</div>
                <div className="text-white/60">{fmtMoney(s.totalOnLoan)}</div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Lendable</div>
                <div className="text-white/60">{fmtMoney(s.lendableValue)}</div>
              </div>
            </div>
            {/* Utilization bar */}
            <div className="mt-2 h-1.5 bg-white/5 overflow-hidden">
              <div
                style={{
                  width: `${Math.min(utilPct, 100)}%`,
                  height: '100%',
                  backgroundColor: utilPct >= 90 ? '#f87171' : utilPct >= 70 ? '#fbbf24' : '#4ade80',
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Tab 3: Fee Distribution --

function FeeDistributionTab({ distribution, t }: { distribution: any[]; t: TFn }) {
  if (distribution.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        {tr(t, 'sblNoFeeData', 'No fee distribution data available')}
      </div>
    );
  }

  // Calculate max count for bar sizing
  const maxCount = Math.max(...distribution.map((d: any) => Number(d.count) || 0), 1);

  return (
    <div className="p-3 space-y-2">
      <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
        {tr(t, 'sblFeeBreakdown', 'Borrow Fee Distribution')}
      </div>
      {distribution.map((d: any, idx: number) => {
        const count = Number(d.count) || 0;
        const barWidth = (count / maxCount) * 100;
        const tierColor = feeColor(d.maxFee ?? d.avgFee ?? 0);

        return (
          <div
            key={String(d.range ?? d.tier ?? idx)}
            className="border border-border/20 p-3 hover:bg-red-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3" style={{ backgroundColor: tierColor }} />
                <span className="text-[10px] font-mono font-black" style={{ color: tierColor }}>
                  {String(d.range ?? d.tier ?? '--')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-neutral-500">
                  {fmtNum(count)} securities
                </span>
                {d.pct ? (
                  <span className="text-[8px] font-mono font-bold" style={{ color: tierColor }}>
                    {fmtPct(d.pct)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[8px] font-mono mb-2">
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Avg Fee</div>
                <div className="font-bold" style={{ color: tierColor }}>
                  {fmtBps(d.avgFee)}
                </div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Total Value</div>
                <div className="text-white/60">{fmtMoney(d.totalValue)}</div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase tracking-wider">Avg Util</div>
                <div className="text-white/60">{fmtPct(d.avgUtilization)}</div>
              </div>
            </div>
            {/* Distribution bar */}
            <div className="h-1.5 bg-white/5 overflow-hidden">
              <div
                style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: tierColor,
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Tab 4: Recent Changes --

function RecentChangesTab({ changes, t }: { changes: any[]; t: TFn }) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        {tr(t, 'sblNoChanges', 'No recent changes')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider">
          {tr(t, 'sblRecentActivity', 'Recent Borrowing & Lending Changes')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px_48px] gap-0 px-2 py-1 border-b border-border/20 bg-black/95">
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider font-bold">
          Ticker
        </span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right font-bold">
          Prev Fee
        </span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right font-bold">
          New Fee
        </span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right font-bold">
          Change
        </span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right font-bold">
          Util%
        </span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-center font-bold">
          Flag
        </span>
      </div>

      {/* Rows */}
      {changes.map((c: any, idx: number) => {
        const isSpecial = specialFlag(c.special);
        const feeChange = Number(c.change) || 0;
        return (
          <div
            key={String(c.ticker ?? idx)}
            className={`grid grid-cols-[1fr_56px_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center ${
              isSpecial ? 'bg-yellow-300/[0.03]' : ''
            }`}
          >
            {/* Ticker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-white">
                {String(c.ticker ?? '--')}
              </span>
              {c.timestamp ? (
                <span className="text-[6px] font-mono text-neutral-600">
                  {String(c.timestamp)}
                </span>
              ) : null}
            </div>

            {/* Previous Fee */}
            <span className="text-[8px] font-mono text-neutral-500 text-right">
              {fmtBps(c.prevFee)}
            </span>

            {/* New Fee */}
            <span className="text-[8px] font-mono font-bold text-right" style={{ color: feeColor(c.newFee) }}>
              {fmtBps(c.newFee)}
            </span>

            {/* Change */}
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(feeChange)}`}>
              {changeSign(feeChange)}{fmtBps(feeChange)}
            </span>

            {/* Utilization */}
            <span
              className="text-[8px] font-mono text-right"
              style={{
                color:
                  Number(c.utilization) >= 90
                    ? '#f87171'
                    : Number(c.utilization) >= 70
                      ? '#fbbf24'
                      : 'rgba(255,255,255,0.5)',
              }}
            >
              {fmtPct(c.utilization)}
            </span>

            {/* Special Flag */}
            <div className="flex justify-center">
              {isSpecial ? (
                <span className="text-[6px] font-black text-yellow-300 bg-yellow-300/10 px-1 py-px">
                  SPECIAL
                </span>
              ) : (
                <span className="text-neutral-700 text-[8px]">-</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
