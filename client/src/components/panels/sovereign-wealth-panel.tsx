import { useState } from 'react';
import { useSovereignWealth } from '../../api/hooks/use-sovereign-wealth';
import { useT, tr, TFn } from '../../i18n';
import { Landmark, RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#818cf8';
const ACCENT_DIM = 'rgba(129,140,248,0.08)';
const GREEN = '#34d399';
const RED = '#f87171';

// ── Types ──

type Tab = 'funds' | 'transactions' | 'allocation' | 'geography';

const TABS: { key: Tab; label: string }[] = [
  { key: 'funds', label: 'FUNDS' },
  { key: 'transactions', label: 'TRANSACTIONS' },
  { key: 'allocation', label: 'ALLOCATION' },
  { key: 'geography', label: 'GEOGRAPHY' },
];

// ── Formatting helpers ──

function fmtT(n: number): string {
  return '$' + n.toFixed(2) + 'T';
}

function fmtB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtM(n: number): string {
  return '$' + n.toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPp(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + 'pp';
}

function fmtAvgPct(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function returnColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function transparencyColor(score: number): string {
  if (score >= 7) return GREEN;
  if (score >= 4) return '#fbbf24';
  return RED;
}

// ── Main Panel ──

export function SovereignWealthPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignWealth();
  const [tab, setTab] = useState<Tab>('funds');

  const summary = data?.summary;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/10 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ACCENT }}>
            {tr(t, 'swfTitle', 'Sovereign Wealth Funds')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-indigo-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/10 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/10 shrink-0">
          <SummaryCell label="TOTAL AUM" value={fmtT(summary.totalAum)} accent />
          <SummaryCell label="ACTIVE FUNDS" value={String(summary.activeFunds)} />
          <SummaryCell label="AVG YTD" value={fmtPct(summary.avgYtdReturn)} color={returnColor(summary.avgYtdReturn)} />
          <SummaryCell label="LARGEST FUND" value={summary.largestFund} />
          <SummaryCell label="TOP SHIFT" value={summary.topShift} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase tracking-widest">
            {tr(t, 'swfNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'funds' && <FundsTab funds={data.funds} />}
        {data && tab === 'transactions' && <TransactionsTab transactions={data.transactions} />}
        {data && tab === 'allocation' && <AllocationTab allocations={data.allocations} />}
        {data && tab === 'geography' && <GeographyTab regions={data.geography} />}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({
  label,
  value,
  accent,
  color,
}: {
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0" style={{ backgroundColor: ACCENT_DIM }}>
      <div className="text-[6px] font-mono text-white/25 uppercase tracking-wider mb-0.5">{label}</div>
      <div
        className="text-[9px] font-mono font-black truncate"
        style={{ color: accent ? ACCENT : color ?? 'rgba(255,255,255,0.7)' }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Funds Tab ──

function FundsTab({ funds }: { funds: SovereignFund[] }) {
  if (funds.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        No fund data available
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_48px_64px_80px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">AUM ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YTD %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Source</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Top Hold</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Alloc</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Transp</span>
      </div>

      {/* Table rows */}
      {funds.map((fund) => (
        <div
          key={fund.name}
          className="grid grid-cols-[1fr_56px_56px_56px_48px_64px_80px_56px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          {/* Name */}
          <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {fund.name}
          </span>

          {/* Country */}
          <span className="text-[8px] font-mono text-white/40 truncate">{fund.country}</span>

          {/* AUM */}
          <span className="text-[8px] font-mono text-white/60 text-right">{fmtB(fund.aumB)}</span>

          {/* YTD Return */}
          <span className="text-[8px] font-mono font-bold text-right" style={{ color: returnColor(fund.ytdReturn) }}>
            {fmtPct(fund.ytdReturn)}
          </span>

          {/* Source */}
          <span className="text-[7px] font-mono text-white/30 truncate">{fund.source}</span>

          {/* Top Holding */}
          <span className="text-[7px] font-mono text-white/50 truncate">{fund.topHolding}</span>

          {/* Allocation mini stacked text */}
          <div className="flex items-center gap-0.5 justify-center">
            <span className="text-[5px] font-mono text-white/25">E:{fund.allocation.equity}</span>
            <span className="text-[5px] font-mono text-white/25">FI:{fund.allocation.fixedIncome}</span>
            <span className="text-[5px] font-mono text-white/25">RE:{fund.allocation.realEstate}</span>
            <span className="text-[5px] font-mono text-white/25">Alt:{fund.allocation.alternatives}</span>
            <span className="text-[5px] font-mono text-white/25">Inf:{fund.allocation.infrastructure}</span>
            <span className="text-[5px] font-mono text-white/25">C:{fund.allocation.cash}</span>
          </div>

          {/* Transparency */}
          <div className="flex items-center justify-center gap-1 px-1">
            <div className="w-full h-2.5 bg-white/[0.04] relative">
              <div
                className="h-full transition-all"
                style={{
                  width: `${fund.transparency * 10}%`,
                  backgroundColor: transparencyColor(fund.transparency),
                  opacity: 0.6,
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white/70">
                {fund.transparency}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Transactions Tab ──

function TransactionsTab({ transactions }: { transactions: SovereignTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        No transaction data available
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_80px_72px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Fund</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Action</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Asset</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Sector</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Size ($M)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Date</span>
      </div>

      {/* Table rows */}
      {transactions.map((tx, i) => {
        const isBullish = tx.action === 'Buy' || tx.action === 'Increase';
        const badgeBg = isBullish ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)';
        const badgeColor = isBullish ? GREEN : RED;

        return (
          <div
            key={`${tx.fund}-${tx.asset}-${tx.date}-${i}`}
            className="grid grid-cols-[1fr_64px_80px_72px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Fund */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {tx.fund}
            </span>

            {/* Action badge */}
            <div className="flex items-center justify-center">
              <span
                className="px-1.5 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider"
                style={{ color: badgeColor, backgroundColor: badgeBg }}
              >
                {tx.action}
              </span>
            </div>

            {/* Asset */}
            <span className="text-[8px] font-mono text-white/60 truncate">{tx.asset}</span>

            {/* Sector */}
            <span className="text-[7px] font-mono text-white/35 truncate">{tx.sector}</span>

            {/* Size */}
            <span className="text-[8px] font-mono text-white/60 text-right">{fmtM(tx.sizeM)}</span>

            {/* Date */}
            <span className="text-[7px] font-mono text-white/30 text-right">{tx.date}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Allocation Tab ──

function AllocationTab({ allocations }: { allocations: SovereignAllocation[] }) {
  if (allocations.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        No allocation data available
      </div>
    );
  }

  const maxPct = Math.max(...allocations.map((a) => a.currentAvg), 1);

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_100px_48px_48px_72px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Asset Class</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Bar</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1Y Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3Y Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Top Alloc</span>
      </div>

      {/* Table rows */}
      {allocations.map((alloc) => {
        const pctWidth = maxPct > 0 ? Math.min((alloc.currentAvg / maxPct) * 100, 100) : 0;

        return (
          <div
            key={alloc.assetClass}
            className="grid grid-cols-[1fr_48px_100px_48px_48px_72px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Asset Class */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {alloc.assetClass}
            </span>

            {/* Current Avg */}
            <span className="text-[8px] font-mono text-white/60 text-right">{fmtAvgPct(alloc.currentAvg)}</span>

            {/* Horizontal bar */}
            <div className="px-1">
              <div className="w-full h-2.5 bg-white/[0.04] relative overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${pctWidth}%`,
                    backgroundColor: ACCENT,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>

            {/* 1Y Change */}
            <span
              className="text-[8px] font-mono font-bold text-right"
              style={{ color: returnColor(alloc.oneYearChange) }}
            >
              {fmtPp(alloc.oneYearChange)}
            </span>

            {/* 3Y Change */}
            <span className="text-[8px] font-mono text-white/40 text-right">
              {fmtPp(alloc.threeYearChange)}
            </span>

            {/* Top Allocator */}
            <span className="text-[7px] font-mono text-white/40 truncate">{alloc.topAllocator}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Geography Tab ──

function GeographyTab({ regions }: { regions: SovereignGeography[] }) {
  if (regions.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        No geography data available
      </div>
    );
  }

  const maxPct = Math.max(...regions.map((r) => r.avgAllocation), 1);

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_100px_48px_80px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Region</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg %</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Bar</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1Y Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Top Holding</span>
      </div>

      {/* Table rows */}
      {regions.map((region) => {
        const pctWidth = maxPct > 0 ? Math.min((region.avgAllocation / maxPct) * 100, 100) : 0;

        return (
          <div
            key={region.region}
            className="grid grid-cols-[1fr_48px_100px_48px_80px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Region */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {region.region}
            </span>

            {/* Avg Allocation */}
            <span className="text-[8px] font-mono text-white/60 text-right">{fmtAvgPct(region.avgAllocation)}</span>

            {/* Horizontal bar */}
            <div className="px-1">
              <div className="w-full h-2.5 bg-white/[0.04] relative overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${pctWidth}%`,
                    backgroundColor: ACCENT,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>

            {/* 1Y Change */}
            <span
              className="text-[8px] font-mono font-bold text-right"
              style={{ color: returnColor(region.oneYearChange) }}
            >
              {fmtPp(region.oneYearChange)}
            </span>

            {/* Top Holding */}
            <span className="text-[7px] font-mono text-white/40 truncate">{region.topHolding}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Data Types ──

interface SovereignFund {
  name: string;
  country: string;
  aumB: number;
  ytdReturn: number;
  source: string;
  topHolding: string;
  allocation: {
    equity: number;
    fixedIncome: number;
    realEstate: number;
    alternatives: number;
    infrastructure: number;
    cash: number;
  };
  transparency: number;
}

interface SovereignTransaction {
  fund: string;
  action: 'Buy' | 'Sell' | 'Increase' | 'Decrease';
  asset: string;
  sector: string;
  sizeM: number;
  date: string;
}

interface SovereignAllocation {
  assetClass: string;
  currentAvg: number;
  oneYearChange: number;
  threeYearChange: number;
  topAllocator: string;
}

interface SovereignGeography {
  region: string;
  avgAllocation: number;
  oneYearChange: number;
  topHolding: string;
}
