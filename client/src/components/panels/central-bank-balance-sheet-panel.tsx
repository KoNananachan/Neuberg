import { useMemo } from 'react';
import {
  useCentralBankBalanceSheet,
  type BalanceSheetEntry,
  type AssetCompositionItem,
  type QtTimelineEntry,
  type BalanceSheetSummary,
} from '../../api/hooks/use-central-bank-balance-sheet';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtT(n: number): string {
  return n.toFixed(2);
}

function fmtB(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtPctChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtShare(n: number): string {
  return n.toFixed(1);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function qtColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-600';
}

// ── Main Panel ──

export function CentralBankBalanceSheetPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCentralBankBalanceSheet();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-blue-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'cbbsTitle', 'Central Bank Balance Sheets')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!data && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'cbbsNoData', 'No data available')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {data && (
        <div className="flex-1 overflow-auto no-scrollbar">
          <SummaryBar summary={data.summary} t={t} />
          <BalanceSheetsSection sheets={data.balanceSheets} t={t} />
          <AssetCompositionSection items={data.assetComposition} t={t} />
          <QtTimelineSection timeline={data.qtTimeline} t={t} />
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: BalanceSheetSummary;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    {
      label: tr(t, 'cbbsCombined', 'Combined Assets'),
      value: `$${fmtT(summary.combinedAssets)}T`,
      color: 'text-white',
    },
    {
      label: tr(t, 'cbbsYtdChg', 'YTD Change'),
      value: fmtPctChange(summary.ytdChange),
      color: changeColor(summary.ytdChange),
    },
    {
      label: tr(t, 'cbbsFastestQt', 'Fastest QT'),
      value: summary.fastestQtPace,
      color: 'text-blue-400',
    },
    {
      label: tr(t, 'cbbsAvgGdp', 'Avg % GDP'),
      value: `${fmtPct(summary.avgPctGdp)}%`,
      color: 'text-white',
    },
  ];

  return (
    <div className="border-b border-blue-400/30 bg-[#030303]">
      <div className="grid grid-cols-4 divide-x divide-blue-400/10">
        {items.map((item) => (
          <div key={item.label} className="px-2 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Balance Sheets Table ──

function BalanceSheetsSection({
  sheets,
  t,
}: {
  sheets: BalanceSheetEntry[];
  t: ReturnType<typeof useT>;
}) {
  if (!sheets || sheets.length === 0) return null;

  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbbsBalanceSheets', 'Balance Sheets')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_48px_48px_52px_48px_40px_40px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cbbsBank', 'Bank')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsAssets', 'Assets $T')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbs1mChg', '1M Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbs1yChg', '1Y Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsQePace', 'QE $B/mo')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsTsy', 'Tsy')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsMbs', 'MBS')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsGdp', '% GDP')}
        </span>
      </div>

      {/* Rows */}
      {sheets.map((entry) => (
        <BalanceSheetRow key={entry.code} entry={entry} />
      ))}
    </div>
  );
}

function BalanceSheetRow({ entry }: { entry: BalanceSheetEntry }) {
  return (
    <div className="grid grid-cols-[72px_56px_48px_48px_52px_48px_40px_40px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
        {entry.code}
      </span>
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {fmtT(entry.totalAssets)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(entry.change1m)}`}>
        {fmtPctChange(entry.change1m)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(entry.change1y)}`}>
        {fmtPctChange(entry.change1y)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${qtColor(entry.qePace)}`}>
        {fmtB(entry.qePace)}
      </span>
      <span className="text-[8px] font-mono text-neutral-300 text-right">
        {fmtPct(entry.treasuries)}%
      </span>
      <span className="text-[8px] font-mono text-neutral-300 text-right">
        {fmtPct(entry.mbs)}%
      </span>
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {fmtPct(entry.pctGdp)}
      </span>
    </div>
  );
}

// ── Asset Composition Section ──

function AssetCompositionSection({
  items,
  t,
}: {
  items: AssetCompositionItem[];
  t: ReturnType<typeof useT>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, AssetCompositionItem[]>();
    for (const item of items) {
      const arr = map.get(item.code) ?? [];
      arr.push(item);
      map.set(item.code, arr);
    }
    return map;
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbbsComposition', 'Asset Composition')}
        </span>
      </div>

      {Array.from(grouped.entries()).map(([code, bankItems]) => (
        <div key={code}>
          {/* Bank sub-header */}
          <div className="px-3 py-0.5 bg-[#060606] border-b border-blue-400/5">
            <span className="text-[7px] font-mono font-bold text-blue-400 uppercase tracking-wider">
              {code}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_64px_48px_1fr] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cbbsCategory', 'Category')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'cbbsAmount', 'Amount $T')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'cbbsShare', 'Share %')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
              {/* bar column */}
            </span>
          </div>

          {/* Rows */}
          {bankItems.map((item) => (
            <div
              key={`${item.code}-${item.category}`}
              className="grid grid-cols-[1fr_64px_48px_1fr] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {item.category}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right">
                {fmtT(item.amount)}
              </span>
              <span className="text-[8px] font-mono font-bold text-neutral-400 text-right">
                {fmtShare(item.share)}
              </span>
              <div className="flex items-center justify-end pr-2">
                <div className="w-16 h-1.5 bg-neutral-800 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-400/40"
                    style={{ width: `${Math.min(item.share, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── QT Timeline Section ──

function QtTimelineSection({
  timeline,
  t,
}: {
  timeline: QtTimelineEntry[];
  t: ReturnType<typeof useT>;
}) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div>
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cbbsQtTimeline', 'QT Timeline ($B/mo)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_48px_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cbbsMonth', 'Month')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          FED
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          ECB
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          BOJ
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          BOE
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cbbsTotal', 'Total')}
        </span>
      </div>

      {/* Rows */}
      {timeline.map((entry) => (
        <div
          key={entry.month}
          className="grid grid-cols-[56px_48px_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">
            {entry.month}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qtColor(entry.fed)}`}>
            {fmtB(entry.fed)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qtColor(entry.ecb)}`}>
            {fmtB(entry.ecb)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qtColor(entry.boj)}`}>
            {fmtB(entry.boj)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${qtColor(entry.boe)}`}>
            {fmtB(entry.boe)}
          </span>
          <span className={`text-[8px] font-mono font-black text-right ${qtColor(entry.total)}`}>
            {fmtB(entry.total)}
          </span>
        </div>
      ))}
    </div>
  );
}
