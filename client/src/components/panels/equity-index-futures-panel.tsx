import { useState, useMemo } from 'react';
import { useEquityIndexFutures } from '../../api/hooks/use-equity-index-futures';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Contract = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RollEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TermPoint = any;

// ── Tab definitions ──

type TabKey = 'CONTRACTS' | 'ROLL_CALENDAR' | 'BASIS' | 'TERM_STRUCTURE';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'CONTRACTS', label: 'CONTRACTS' },
  { key: 'ROLL_CALENDAR', label: 'ROLL CALENDAR' },
  { key: 'BASIS', label: 'BASIS' },
  { key: 'TERM_STRUCTURE', label: 'TERM STRUCTURE' },
];

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} bp`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVolume(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  return d;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function basisColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  // Positive basis = rich (trading above fair value) = red
  // Negative basis = cheap (trading below fair value) = green
  if (n > 1) return 'text-red-400';
  if (n > 0.25) return 'text-red-400/70';
  if (n < -1) return 'text-green-400';
  if (n < -0.25) return 'text-green-400/70';
  return 'text-neutral-400';
}

function basisLabel(n: number | null | undefined): string {
  if (n == null) return '';
  if (n > 1) return 'RICH';
  if (n > 0.25) return 'RICH';
  if (n < -1) return 'CHEAP';
  if (n < -0.25) return 'CHEAP';
  return 'FAIR';
}

function fairValueColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 2) return 'text-red-400';
  if (n > 0) return 'text-red-400/60';
  if (n < -2) return 'text-green-400';
  if (n < 0) return 'text-green-400/60';
  return 'text-neutral-400';
}

// ── Skeleton / shimmer block ──

function Skeleton({ w = 'w-16', h = 'h-3' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} bg-neutral-800 animate-pulse`} />
  );
}

function SkeletonRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 px-3 py-1.5 border-b border-border/5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} w={c === 0 ? 'w-12' : 'w-14'} />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Sparkline component ──

function Sparkline({
  values,
  width = 160,
  height = 24,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const last = values[values.length - 1];
  const first = values[0];
  const color = last >= first ? '#38bdf8' : '#f87171';

  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Zero line when values cross zero */}
      {min < 0 && max > 0 && (
        <line
          x1={pad}
          y1={height - pad - ((0 - min) / range) * (height - pad * 2)}
          x2={width - pad}
          y2={height - pad - ((0 - min) / range) * (height - pad * 2)}
          stroke="#525252"
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )}
    </svg>
  );
}

// ── Main Panel ──

export function EquityIndexFuturesPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEquityIndexFutures();
  const [activeTab, setActiveTab] = useState<TabKey>('CONTRACTS');

  // ── Loading state ──
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
        <PanelHeader t={t} isLoading={true} onRefresh={refetch} />
        <TabBar active={activeTab} onChange={setActiveTab} />
        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
          <SkeletonRows rows={10} cols={7} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
        <PanelHeader t={t} isLoading={false} onRefresh={refetch} />
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="text-red-400 text-[9px] uppercase tracking-widest">
            {tr(t, 'eifError', 'Failed to load equity index futures data')}
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-[8px] uppercase tracking-wider text-sky-400 border border-sky-400/30 hover:bg-sky-400/10 transition-colors"
          >
            {tr(t, 'eifRetry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  const contracts: Contract[] = data?.contracts ?? [];
  const rollCalendar: RollEntry[] = data?.rollCalendar ?? [];
  const basisHistory: BasisPoint[] = data?.basisHistory ?? [];
  const termStructure: TermPoint[] = data?.termStructure ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      <PanelHeader t={t} isLoading={isLoading} onRefresh={refetch} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'CONTRACTS' && (
          <ContractsView contracts={contracts} t={t} />
        )}
        {activeTab === 'ROLL_CALENDAR' && (
          <RollCalendarView entries={rollCalendar} t={t} />
        )}
        {activeTab === 'BASIS' && (
          <BasisView history={basisHistory} t={t} />
        )}
        {activeTab === 'TERM_STRUCTURE' && (
          <TermStructureView points={termStructure} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Panel Header ──

function PanelHeader({
  t,
  isLoading,
  onRefresh,
}: {
  t: TFn;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-sky-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'panelEquityIndexFutures', 'Equity Index Futures')}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="p-0.5 text-neutral-600 hover:text-sky-400 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ── Tab Bar ──

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <div className="flex items-center gap-0 border-b border-sky-400/20 bg-[#030303] shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1 text-[8px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
            active === tab.key
              ? 'text-sky-400 border-sky-400 bg-sky-400/[0.05]'
              : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-sky-400/[0.02]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 1: CONTRACTS
// ══════════════════════════════════════════════

function ContractsView({ contracts, t }: { contracts: Contract[]; t: TFn }) {
  // Group contracts by index
  const grouped = useMemo(() => {
    const map: Record<string, Contract[]> = {};
    for (const c of contracts) {
      const idx = c?.index ?? c?.symbol ?? 'OTHER';
      if (!map[idx]) map[idx] = [];
      map[idx].push(c);
    }
    return map;
  }, [contracts]);

  const indices = Object.keys(grouped);

  if (contracts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[9px] uppercase tracking-wider">
        No contract data available
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <ContractSummaryBar contracts={contracts} t={t} />

      {/* Column headers */}
      <div className="grid grid-cols-[56px_72px_56px_56px_56px_48px_48px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] sticky top-0 z-10">
        <ColHeader label={tr(t, 'eifSymbol', 'Symbol')} />
        <ColHeader label={tr(t, 'eifContract', 'Contract')} />
        <ColHeader label={tr(t, 'eifLast', 'Last')} align="right" />
        <ColHeader label={tr(t, 'eifChg', 'Chg')} align="right" />
        <ColHeader label={tr(t, 'eifChgPct', 'Chg%')} align="right" />
        <ColHeader label={tr(t, 'eifHigh', 'High')} align="right" />
        <ColHeader label={tr(t, 'eifLow', 'Low')} align="right" />
        <ColHeader label={tr(t, 'eifVolume', 'Volume')} align="right" />
        <ColHeader label={tr(t, 'eifOI', 'OI')} align="right" />
      </div>

      {/* Rows grouped by index */}
      {indices.length > 1
        ? indices.map((idx) => (
            <div key={idx}>
              <div className="px-3 py-0.5 bg-[#050505] border-b border-border/10">
                <span className="text-[7px] font-black uppercase tracking-wider text-sky-400/70">
                  {idx}
                </span>
              </div>
              {grouped[idx].map((c: Contract, i: number) => (
                <ContractRow key={c?.ticker ?? i} contract={c} />
              ))}
            </div>
          ))
        : contracts.map((c: Contract, i: number) => (
            <ContractRow key={c?.ticker ?? i} contract={c} />
          ))}
    </div>
  );
}

function ContractSummaryBar({ contracts, t }: { contracts: Contract[]; t: TFn }) {
  const up = contracts.filter((c: Contract) => (c?.change ?? 0) > 0).length;
  const down = contracts.filter((c: Contract) => (c?.change ?? 0) < 0).length;
  const unch = contracts.length - up - down;

  // Find major indices for quick reference
  const es = contracts.find((c: Contract) => c?.ticker === 'ES' || c?.symbol?.includes('ES'));
  const nq = contracts.find((c: Contract) => c?.ticker === 'NQ' || c?.symbol?.includes('NQ'));
  const ym = contracts.find((c: Contract) => c?.ticker === 'YM' || c?.symbol?.includes('YM'));

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-[#080808] border-b border-border/20 shrink-0">
      <div className="flex items-center gap-3 text-[8px] font-mono">
        <span className="text-neutral-500 uppercase tracking-wider">
          {tr(t, 'eifMkt', 'Mkt')}:
        </span>
        <span className="text-green-400">{up}&#9650;</span>
        <span className="text-red-400">{down}&#9660;</span>
        <span className="text-neutral-600">{unch}&#9644;</span>
      </div>
      <div className="flex items-center gap-3 text-[8px] font-mono font-bold">
        {es && (
          <span className={changeColor(es?.changePercent ?? es?.change)}>
            ES {fmtPct(es?.changePercent ?? es?.change)}
          </span>
        )}
        {nq && (
          <span className={changeColor(nq?.changePercent ?? nq?.change)}>
            NQ {fmtPct(nq?.changePercent ?? nq?.change)}
          </span>
        )}
        {ym && (
          <span className={changeColor(ym?.changePercent ?? ym?.change)}>
            YM {fmtPct(ym?.changePercent ?? ym?.change)}
          </span>
        )}
      </div>
    </div>
  );
}

function ContractRow({ contract: c }: { contract: Contract }) {
  const chg = c?.change ?? c?.priceChange ?? null;
  const chgPct = c?.changePercent ?? c?.priceChangePercent ?? null;

  return (
    <div className="grid grid-cols-[56px_72px_56px_56px_56px_48px_48px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-bold text-sky-400 truncate">
        {c?.ticker ?? c?.symbol ?? '-'}
      </span>
      <span className="text-[8px] text-neutral-400 truncate">
        {c?.contractMonth ?? c?.expiry ?? c?.contract ?? '-'}
      </span>
      <span className="text-[9px] font-bold text-white text-right">
        {fmtPrice(c?.last ?? c?.price)}
      </span>
      <span className={`text-[8px] font-bold text-right ${changeColor(chg)}`}>
        {chg != null ? (chg >= 0 ? '+' : '') + fmtNum(chg) : '-'}
      </span>
      <span className={`text-[8px] font-bold text-right ${changeColor(chgPct)}`}>
        {fmtPct(chgPct)}
      </span>
      <span className="text-[8px] text-neutral-400 text-right">
        {fmtPrice(c?.high ?? c?.dayHigh)}
      </span>
      <span className="text-[8px] text-neutral-400 text-right">
        {fmtPrice(c?.low ?? c?.dayLow)}
      </span>
      <span className="text-[8px] text-neutral-500 text-right">
        {fmtVolume(c?.volume)}
      </span>
      <span className="text-[8px] text-neutral-600 text-right">
        {fmtVolume(c?.openInterest ?? c?.oi)}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 2: ROLL CALENDAR
// ══════════════════════════════════════════════

function RollCalendarView({ entries, t }: { entries: RollEntry[]; t: TFn }) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[9px] uppercase tracking-wider">
        No roll calendar data available
      </div>
    );
  }

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[60px_56px_56px_56px_56px_52px_60px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] sticky top-0 z-10">
        <ColHeader label={tr(t, 'eifIndex', 'Index')} />
        <ColHeader label={tr(t, 'eifFront', 'Front')} />
        <ColHeader label={tr(t, 'eifBack', 'Back')} />
        <ColHeader label={tr(t, 'eifRollDate', 'Roll Date')} />
        <ColHeader label={tr(t, 'eifFirstNotice', '1st Notice')} />
        <ColHeader label={tr(t, 'eifDaysToRoll', 'Days')} align="right" />
        <ColHeader label={tr(t, 'eifSpread', 'Spread')} align="right" />
        <ColHeader label={tr(t, 'eifStatus', 'Status')} align="center" />
      </div>

      {entries.map((entry: RollEntry, i: number) => (
        <RollCalendarRow key={entry?.index ?? i} entry={entry} />
      ))}
    </div>
  );
}

function RollCalendarRow({ entry: e }: { entry: RollEntry }) {
  const daysToRoll = e?.daysToRoll ?? e?.daysUntilRoll ?? null;
  const isUrgent = daysToRoll != null && daysToRoll <= 5;
  const isNear = daysToRoll != null && daysToRoll <= 14;

  const statusLabel = e?.status ?? (isUrgent ? 'ACTIVE' : isNear ? 'PENDING' : 'INACTIVE');
  const statusColor = isUrgent
    ? 'text-red-400'
    : isNear
      ? 'text-yellow-400'
      : 'text-neutral-600';

  return (
    <div className="grid grid-cols-[60px_56px_56px_56px_56px_52px_60px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-bold text-sky-400">
        {e?.index ?? e?.symbol ?? '-'}
      </span>
      <span className="text-[8px] text-white">
        {e?.frontMonth ?? e?.front ?? '-'}
      </span>
      <span className="text-[8px] text-neutral-400">
        {e?.backMonth ?? e?.back ?? '-'}
      </span>
      <span className="text-[8px] text-neutral-400">
        {fmtDate(e?.rollDate)}
      </span>
      <span className="text-[8px] text-neutral-400">
        {fmtDate(e?.firstNoticeDate ?? e?.firstNotice)}
      </span>
      <span className={`text-[8px] font-bold text-right ${
        isUrgent ? 'text-red-400' : isNear ? 'text-yellow-400' : 'text-neutral-300'
      }`}>
        {daysToRoll != null ? daysToRoll : '-'}
      </span>
      <span className={`text-[8px] font-bold text-right ${changeColor(e?.spread ?? e?.calendarSpread)}`}>
        {e?.spread != null
          ? (e.spread >= 0 ? '+' : '') + fmtNum(e.spread)
          : e?.calendarSpread != null
            ? (e.calendarSpread >= 0 ? '+' : '') + fmtNum(e.calendarSpread)
            : '-'}
      </span>
      <span className={`text-[7px] font-bold uppercase tracking-wider text-center ${statusColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 3: BASIS
// ══════════════════════════════════════════════

function BasisView({ history, t }: { history: BasisPoint[]; t: TFn }) {
  // Group by index/symbol for per-index basis display
  const grouped = useMemo(() => {
    const map: Record<string, BasisPoint[]> = {};
    for (const pt of history) {
      const key = pt?.index ?? pt?.symbol ?? 'ALL';
      if (!map[key]) map[key] = [];
      map[key].push(pt);
    }
    return map;
  }, [history]);

  const indices = Object.keys(grouped);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[9px] uppercase tracking-wider">
        No basis data available
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'eifBasisFairValue', 'Basis vs Fair Value')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-1 border-b border-border/10 bg-[#050505]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400" />
          <span className="text-[7px] text-neutral-500 uppercase tracking-wider">
            {tr(t, 'eifCheap', 'Cheap (Below FV)')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-400" />
          <span className="text-[7px] text-neutral-500 uppercase tracking-wider">
            {tr(t, 'eifRich', 'Rich (Above FV)')}
          </span>
        </div>
      </div>

      {/* If data is a flat list (single group), show as table */}
      {indices.length <= 1 ? (
        <BasisTable points={history} t={t} />
      ) : (
        /* Per-index basis sections */
        indices.map((idx) => (
          <div key={idx}>
            <div className="px-3 py-0.5 bg-[#050505] border-b border-border/10">
              <span className="text-[7px] font-black uppercase tracking-wider text-sky-400/70">
                {idx}
              </span>
            </div>
            <BasisIndexCard points={grouped[idx]} label={idx} t={t} />
          </div>
        ))
      )}
    </div>
  );
}

function BasisTable({ points, t }: { points: BasisPoint[]; t: TFn }) {
  return (
    <>
      <div className="grid grid-cols-[60px_56px_56px_56px_56px_48px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] sticky top-0 z-10">
        <ColHeader label={tr(t, 'eifIndex', 'Index')} />
        <ColHeader label={tr(t, 'eifFutures', 'Futures')} align="right" />
        <ColHeader label={tr(t, 'eifCash', 'Cash')} align="right" />
        <ColHeader label={tr(t, 'eifFairVal', 'Fair Val')} align="right" />
        <ColHeader label={tr(t, 'eifBasis', 'Basis')} align="right" />
        <ColHeader label={tr(t, 'eifRichCheap', 'R/C')} align="center" />
        <ColHeader label={tr(t, 'eifSpreadFV', 'vs FV')} align="right" />
      </div>

      {points.map((pt: BasisPoint, i: number) => {
        const basis = pt?.basis ?? (pt?.futuresPrice != null && pt?.cashPrice != null
          ? pt.futuresPrice - pt.cashPrice
          : null);
        const vsFV = pt?.vseFairValue ?? pt?.vsFairValue ?? pt?.spreadToFairValue ?? null;

        return (
          <div
            key={pt?.index ?? pt?.symbol ?? i}
            className="grid grid-cols-[60px_56px_56px_56px_56px_48px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-sky-400">
              {pt?.index ?? pt?.symbol ?? '-'}
            </span>
            <span className="text-[9px] font-bold text-white text-right">
              {fmtPrice(pt?.futuresPrice ?? pt?.futures)}
            </span>
            <span className="text-[8px] text-neutral-300 text-right">
              {fmtPrice(pt?.cashPrice ?? pt?.cash ?? pt?.spot)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right">
              {fmtPrice(pt?.fairValue ?? pt?.theoreticalFV)}
            </span>
            <span className={`text-[8px] font-bold text-right ${basisColor(basis)}`}>
              {basis != null ? (basis >= 0 ? '+' : '') + fmtNum(basis) : '-'}
            </span>
            <span className={`text-[7px] font-bold uppercase tracking-wider text-center ${basisColor(basis)}`}>
              {basisLabel(basis)}
            </span>
            <span className={`text-[8px] font-bold text-right ${fairValueColor(vsFV)}`}>
              {vsFV != null ? (vsFV >= 0 ? '+' : '') + fmtNum(vsFV) : '-'}
            </span>
          </div>
        );
      })}
    </>
  );
}

function BasisIndexCard({
  points,
  label,
  t,
}: {
  points: BasisPoint[];
  label: string;
  t: TFn;
}) {
  // Extract sparkline values from time series
  const sparkValues = points
    .map((pt: BasisPoint) => pt?.basis ?? pt?.value ?? null)
    .filter((v: number | null): v is number => v != null);

  const latest = points[points.length - 1];
  const basisVal = latest?.basis ?? null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-border/10">
      {/* Sparkline */}
      {sparkValues.length >= 2 && <Sparkline values={sparkValues} />}

      {/* Current basis */}
      <div className="flex flex-col gap-0.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eifCurrentBasis', 'Current Basis')}
        </div>
        <div className={`text-[10px] font-bold ${basisColor(basisVal)}`}>
          {basisVal != null ? (basisVal >= 0 ? '+' : '') + fmtNum(basisVal) : '-'}
          <span className={`text-[7px] ml-1 ${basisColor(basisVal)}`}>
            {basisLabel(basisVal)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-0.5 ml-2">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eifHigh', 'High')}
        </div>
        <div className="text-[8px] text-neutral-300">
          {sparkValues.length > 0 ? fmtNum(Math.max(...sparkValues)) : '-'}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eifLow', 'Low')}
        </div>
        <div className="text-[8px] text-neutral-300">
          {sparkValues.length > 0 ? fmtNum(Math.min(...sparkValues)) : '-'}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eifAvg', 'Avg')}
        </div>
        <div className="text-[8px] text-neutral-300">
          {sparkValues.length > 0
            ? fmtNum(sparkValues.reduce((a: number, b: number) => a + b, 0) / sparkValues.length)
            : '-'}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// TAB 4: TERM STRUCTURE
// ══════════════════════════════════════════════

function TermStructureView({ points, t }: { points: TermPoint[]; t: TFn }) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[9px] uppercase tracking-wider">
        No term structure data available
      </div>
    );
  }

  // Group by index if multiple indices present
  const grouped = useMemo(() => {
    const map: Record<string, TermPoint[]> = {};
    for (const pt of points) {
      const key = pt?.index ?? pt?.symbol ?? 'ALL';
      if (!map[key]) map[key] = [];
      map[key].push(pt);
    }
    return map;
  }, [points]);

  const indices = Object.keys(grouped);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'eifTermStructure', 'Futures Term Structure')}
        </span>
      </div>

      {indices.map((idx) => (
        <TermStructureSection key={idx} index={idx} points={grouped[idx]} t={t} showLabel={indices.length > 1} />
      ))}
    </div>
  );
}

function TermStructureSection({
  index: idx,
  points,
  t,
  showLabel,
}: {
  index: string;
  points: TermPoint[];
  t: TFn;
  showLabel: boolean;
}) {
  // Extract price values for the curve sparkline
  const priceValues = points
    .map((pt: TermPoint) => pt?.price ?? pt?.last ?? pt?.value ?? null)
    .filter((v: number | null): v is number => v != null);

  // Determine contango/backwardation
  const isContango = priceValues.length >= 2 && priceValues[priceValues.length - 1] > priceValues[0];
  const structureLabel = priceValues.length >= 2
    ? isContango ? 'CONTANGO' : 'BACKWARDATION'
    : '';
  const structureColor = isContango ? 'text-sky-400' : 'text-orange-400';

  return (
    <div className="border-b border-border/20">
      {/* Index label + structure indicator */}
      {showLabel && (
        <div className="flex items-center justify-between px-3 py-0.5 bg-[#050505] border-b border-border/10">
          <span className="text-[7px] font-black uppercase tracking-wider text-sky-400/70">
            {idx}
          </span>
          {structureLabel && (
            <span className={`text-[7px] font-bold uppercase tracking-wider ${structureColor}`}>
              {structureLabel}
            </span>
          )}
        </div>
      )}

      {!showLabel && structureLabel && (
        <div className="flex items-center justify-end px-3 py-0.5 bg-[#050505] border-b border-border/10">
          <span className={`text-[7px] font-bold uppercase tracking-wider ${structureColor}`}>
            {structureLabel}
          </span>
        </div>
      )}

      {/* Curve sparkline */}
      {priceValues.length >= 2 && (
        <div className="px-3 py-2 border-b border-border/10">
          <Sparkline values={priceValues} width={280} height={32} />
        </div>
      )}

      {/* Table */}
      <div className="grid grid-cols-[56px_60px_56px_56px_56px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <ColHeader label={tr(t, 'eifExpiry', 'Expiry')} />
        <ColHeader label={tr(t, 'eifContract', 'Contract')} />
        <ColHeader label={tr(t, 'eifPrice', 'Price')} align="right" />
        <ColHeader label={tr(t, 'eifChg', 'Chg')} align="right" />
        <ColHeader label={tr(t, 'eifVolume', 'Volume')} align="right" />
        <ColHeader label={tr(t, 'eifOI', 'OI')} align="right" />
        <ColHeader label={tr(t, 'eifSpread', 'Spread')} align="right" />
      </div>

      {points.map((pt: TermPoint, i: number) => {
        // Spread to next contract
        const nextPrice = i < points.length - 1
          ? (points[i + 1]?.price ?? points[i + 1]?.last ?? null)
          : null;
        const currentPrice = pt?.price ?? pt?.last ?? null;
        const spread = nextPrice != null && currentPrice != null
          ? nextPrice - currentPrice
          : pt?.spread ?? null;

        return (
          <div
            key={pt?.expiry ?? pt?.contractMonth ?? i}
            className="grid grid-cols-[56px_60px_56px_56px_56px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] text-neutral-400">
              {fmtDate(pt?.expiry ?? pt?.expiryDate)}
            </span>
            <span className="text-[8px] font-bold text-sky-400 truncate">
              {pt?.contract ?? pt?.contractMonth ?? pt?.ticker ?? '-'}
            </span>
            <span className="text-[9px] font-bold text-white text-right">
              {fmtPrice(currentPrice)}
            </span>
            <span className={`text-[8px] font-bold text-right ${changeColor(pt?.change)}`}>
              {pt?.change != null ? (pt.change >= 0 ? '+' : '') + fmtNum(pt.change) : '-'}
            </span>
            <span className="text-[8px] text-neutral-500 text-right">
              {fmtVolume(pt?.volume)}
            </span>
            <span className="text-[8px] text-neutral-600 text-right">
              {fmtVolume(pt?.openInterest ?? pt?.oi)}
            </span>
            <span className={`text-[8px] font-bold text-right ${changeColor(spread)}`}>
              {spread != null ? (spread >= 0 ? '+' : '') + fmtNum(spread) : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared column header ──

function ColHeader({
  label,
  align = 'left',
}: {
  label: string;
  align?: 'left' | 'right' | 'center';
}) {
  const alignClass =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <span className={`text-[7px] font-mono text-neutral-600 uppercase tracking-wider ${alignClass}`}>
      {label}
    </span>
  );
}
