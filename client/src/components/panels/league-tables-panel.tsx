import { useState } from 'react';
import { useLeagueTables } from '../../api/hooks/use-league-tables';

// ── Types ──

type CategoryKey = 'globalMA' | 'globalECM' | 'globalDCM' | 'globalIPO' | 'usMA' | 'emeaMA';

interface CategoryTab {
  key: CategoryKey;
  label: string;
}

const CATEGORIES: CategoryTab[] = [
  { key: 'globalMA', label: 'GLOBAL M&A' },
  { key: 'globalECM', label: 'GLOBAL ECM' },
  { key: 'globalDCM', label: 'GLOBAL DCM' },
  { key: 'globalIPO', label: 'GLOBAL IPO' },
  { key: 'usMA', label: 'US M&A' },
  { key: 'emeaMA', label: 'EMEA M&A' },
];

// ── Formatting helpers ──

function fmtVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}T`;
  return `${n.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtAvgDeal(n: number): string {
  return n.toFixed(0);
}

function fmtDealValue(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function rankChangeIcon(change: number): { symbol: string; color: string } {
  if (change > 0) return { symbol: '\u25B2', color: 'text-green-400' };
  if (change < 0) return { symbol: '\u25BC', color: 'text-red-400' };
  return { symbol: '\u2014', color: 'text-neutral-600' };
}

function statusStyle(status: string): { text: string; bg: string; border: string } {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
  if (s === 'PENDING') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
  return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
}

// ── Main Panel ──

export function LeagueTablesPanel() {
  const { data, isLoading } = useLeagueTables();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('globalMA');

  const categoryData = data?.categories?.[selectedCategory];
  const rankings = categoryData?.rankings ?? [];
  const topDeals = data?.topDeals ?? [];
  const sectors = data?.sectorBreakdown ?? [];
  const summary = data?.summary;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-amber-400">
            Investment Banking League Tables
          </span>
        </div>
        {summary && (
          <div className="flex items-center gap-3 text-[8px]">
            <span className="text-neutral-500">
              VOL <span className="text-white font-bold">{fmtVolume(summary.totalVolume)}</span>
            </span>
            <span className="text-neutral-500">
              DEALS <span className="text-white font-bold">{summary.totalDeals?.toLocaleString()}</span>
            </span>
            <span className="text-neutral-500">
              YOY{' '}
              <span className={`font-bold ${(summary.yoyChange ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(summary.yoyChange ?? 0) >= 0 ? '+' : ''}{fmtPct(summary.yoyChange ?? 0)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0 bg-[#030303]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
              selectedCategory === cat.key
                ? 'text-amber-400 border-amber-400 bg-amber-400/[0.04]'
                : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-white/[0.01]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[8px] text-amber-400/60 uppercase tracking-widest animate-pulse">
                Loading...
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-40 text-neutral-600 uppercase tracking-wider">
            No data available
          </div>
        )}

        {data && (
          <>
            {/* Rankings Table */}
            <RankingsTable rankings={rankings} />

            {/* Top Deals */}
            {topDeals.length > 0 && <TopDealsTable deals={topDeals} />}

            {/* Sector Breakdown */}
            {sectors.length > 0 && <SectorBreakdown sectors={sectors} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Rankings Table ──

function RankingsTable({ rankings }: { rankings: readonly BankRanking[] }) {
  if (rankings.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-neutral-600 uppercase tracking-wider text-[8px]">
        No rankings for this category
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          Bank Rankings
        </span>
      </div>

      {/* Table Header */}
      <div className="flex items-center px-3 py-1 border-b border-border/20 text-[7px] uppercase tracking-wider text-neutral-600 bg-[#030303]">
        <span className="w-8 shrink-0 text-center">Rank</span>
        <span className="flex-1 min-w-0">Bank</span>
        <span className="w-12 text-right shrink-0"># Deals</span>
        <span className="w-16 text-right shrink-0">Vol ($B)</span>
        <span className="w-24 text-right shrink-0">Mkt Share</span>
        <span className="w-16 text-right shrink-0">Avg ($M)</span>
        <span className="w-12 text-right shrink-0">Chg</span>
        <span className="w-10 text-right shrink-0">Prev</span>
      </div>

      {/* Table Rows */}
      {rankings.map((bank) => {
        const isTop3 = (bank.rank ?? 99) <= 3;
        const rc = rankChangeIcon(bank.rankChange ?? 0);

        return (
          <div
            key={bank.bank}
            className={`flex items-center px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${
              isTop3 ? 'bg-amber-400/[0.03]' : ''
            }`}
          >
            {/* Rank */}
            <span className={`w-8 shrink-0 text-center font-bold ${isTop3 ? 'text-amber-400' : 'text-neutral-400'}`}>
              {bank.rank}
            </span>

            {/* Bank Name */}
            <span className={`flex-1 min-w-0 truncate font-bold ${isTop3 ? 'text-white' : 'text-neutral-300'}`}>
              {bank.bank}
            </span>

            {/* # Deals */}
            <span className="w-12 text-right shrink-0 text-neutral-300">
              {bank.deals?.toLocaleString()}
            </span>

            {/* Volume */}
            <span className="w-16 text-right shrink-0 text-white font-bold">
              {(bank.volume ?? 0).toFixed(1)}
            </span>

            {/* Market Share - bar + pct */}
            <span className="w-24 shrink-0 flex items-center justify-end gap-1">
              <div className="w-12 h-1.5 bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-amber-400/50"
                  style={{ width: `${Math.min(bank.marketShare ?? 0, 100)}%` }}
                />
              </div>
              <span className="text-amber-400/80 w-8 text-right">{fmtPct(bank.marketShare ?? 0)}</span>
            </span>

            {/* Avg Deal */}
            <span className="w-16 text-right shrink-0 text-neutral-400">
              {fmtAvgDeal(bank.avgDeal ?? 0)}
            </span>

            {/* Rank Change */}
            <span className={`w-12 text-right shrink-0 font-bold ${rc.color}`}>
              {rc.symbol}{Math.abs(bank.rankChange ?? 0) > 0 ? Math.abs(bank.rankChange ?? 0) : ''}
            </span>

            {/* Previous Year Rank */}
            <span className="w-10 text-right shrink-0 text-neutral-600">
              {bank.prevRank ?? '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Type aliases for data shapes (inferred from hook) ──

interface BankRanking {
  rank?: number;
  bank: string;
  deals?: number;
  volume?: number;
  marketShare?: number;
  avgDeal?: number;
  rankChange?: number;
  prevRank?: number;
}

interface TopDeal {
  deal: string;
  acquirer?: string;
  target?: string;
  value?: number;
  advisor?: string;
  sector?: string;
  status?: string;
}

interface SectorEntry {
  sector: string;
  volume?: number;
  deals?: number;
  pctOfTotal?: number;
}

// ── Top Deals Table ──

function TopDealsTable({ deals }: { deals: readonly TopDeal[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          Top Deals
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center px-3 py-1 border-b border-border/20 text-[7px] uppercase tracking-wider text-neutral-600 bg-[#030303]">
        <span className="flex-[2] min-w-0">Deal</span>
        <span className="flex-1 min-w-0">Acquirer</span>
        <span className="flex-1 min-w-0">Target</span>
        <span className="w-16 text-right shrink-0">Value</span>
        <span className="flex-1 min-w-0 text-right">Advisor</span>
        <span className="w-16 text-right shrink-0">Sector</span>
        <span className="w-20 text-right shrink-0">Status</span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => {
        const st = statusStyle(deal.status ?? 'ANNOUNCED');

        return (
          <div
            key={`${deal.deal}-${i}`}
            className="flex items-center px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
          >
            <span className="flex-[2] min-w-0 truncate text-white font-bold">
              {deal.deal}
            </span>
            <span className="flex-1 min-w-0 truncate text-neutral-300">
              {deal.acquirer ?? '-'}
            </span>
            <span className="flex-1 min-w-0 truncate text-neutral-300">
              {deal.target ?? '-'}
            </span>
            <span className="w-16 text-right shrink-0 text-amber-400 font-bold">
              {deal.value != null ? fmtDealValue(deal.value) : '-'}
            </span>
            <span className="flex-1 min-w-0 text-right truncate text-neutral-400">
              {deal.advisor ?? '-'}
            </span>
            <span className="w-16 text-right shrink-0 text-neutral-500 truncate">
              {deal.sector ?? '-'}
            </span>
            <span className="w-20 text-right shrink-0">
              <span
                className={`inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider border ${st.text} ${st.bg} ${st.border}`}
              >
                {deal.status?.toUpperCase() ?? 'ANNOUNCED'}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sector Breakdown ──

function SectorBreakdown({ sectors }: { sectors: readonly SectorEntry[] }) {
  const maxVolume = Math.max(...sectors.map((s) => s.volume ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          Sector Breakdown
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center px-3 py-1 border-b border-border/20 text-[7px] uppercase tracking-wider text-neutral-600 bg-[#030303]">
        <span className="flex-1 min-w-0">Sector</span>
        <span className="w-24 shrink-0">Volume</span>
        <span className="w-12 text-right shrink-0">Deals</span>
        <span className="w-14 text-right shrink-0">% Total</span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => {
        const barWidth = maxVolume > 0 ? ((sector.volume ?? 0) / maxVolume) * 100 : 0;

        return (
          <div
            key={sector.sector}
            className="flex items-center px-3 py-1 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
          >
            <span className="flex-1 min-w-0 truncate text-neutral-300 font-bold">
              {sector.sector}
            </span>

            {/* Volume with mini bar */}
            <span className="w-24 shrink-0 flex items-center gap-1">
              <div className="w-12 h-1.5 bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-amber-400/40"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-white text-right flex-1">
                {fmtVolume(sector.volume ?? 0)}
              </span>
            </span>

            <span className="w-12 text-right shrink-0 text-neutral-400">
              {sector.deals?.toLocaleString() ?? '-'}
            </span>

            <span className="w-14 text-right shrink-0 text-amber-400/80">
              {fmtPct(sector.pctOfTotal ?? 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
