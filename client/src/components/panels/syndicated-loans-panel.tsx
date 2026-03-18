import { useState } from 'react';
import { useSyndicatedLoans } from '../../api/hooks/use-syndicated-loans';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#34d399';
const ACCENT_DIM = 'rgba(52,211,153,0.08)';

type Tab = 'pipeline' | 'secondary' | 'leverage' | 'sectors';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'leverage', label: 'Leverage' },
  { key: 'sectors', label: 'Sectors' },
];

// ── Formatting helpers ──

function fmtB(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'T';
  return n.toFixed(1);
}

function fmtM(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'B';
  return n.toFixed(0);
}

function fmtBp(n: number): string {
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtLev(n: number): string {
  return n.toFixed(1) + 'x';
}

function fmtBid(n: number): string {
  return n.toFixed(2);
}

function fmtChg(n: number): string {
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2);
}

// ── Color helpers ──

function chgColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function statusStyle(status: string): { text: string; bg: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'launched') return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
  if (s === 'committed') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (s === 'flexed') return { text: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/30' };
  if (s === 'closed') return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function ratingBadge(rating: string): { text: string; bg: string } {
  const r = rating?.toUpperCase() ?? '';
  if (r.startsWith('BB') || r.startsWith('BA')) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (r.startsWith('B') || r.startsWith('B')) return { text: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/30' };
  if (r.startsWith('CCC') || r.startsWith('CAA')) return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  if (r.startsWith('A') || r.startsWith('BBB') || r.startsWith('BAA')) return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

// ── Main Panel ──

export function SyndicatedLoansPanel() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const { data, isLoading, refetch } = useSyndicatedLoans();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            SYNDICATED LOAN MARKET
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Bar */}
      {data?.summary && <SummaryBar summary={data.summary} />}

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 shrink-0 bg-black/40">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
              tab === t.key
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-neutral-500 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
              LOADING...
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            NO DATA AVAILABLE
          </div>
        )}

        {data && tab === 'pipeline' && <PipelineTab deals={data.pipeline ?? []} />}
        {data && tab === 'secondary' && <SecondaryTab trades={data.secondary ?? []} />}
        {data && tab === 'leverage' && <LeverageTab tiers={data.leverage ?? []} />}
        {data && tab === 'sectors' && <SectorsTab sectors={data.sectors ?? []} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

interface SummaryData {
  newDealVolYtd: number;
  avgSpread: number;
  avgBid: number;
  leveragedVolYtd: number;
  defaultRate: number;
}

function SummaryBar({ summary }: { summary: SummaryData }) {
  const items = [
    { label: 'NEW DEAL VOL YTD', value: '$' + fmtB(summary.newDealVolYtd) + 'B' },
    { label: 'AVG SPREAD', value: fmtBp(summary.avgSpread) + ' BP' },
    { label: 'AVG BID', value: fmtBid(summary.avgBid) },
    { label: 'LEVERAGED VOL YTD', value: '$' + fmtB(summary.leveragedVolYtd) + 'B' },
    { label: 'DEFAULT RATE', value: fmtPct(summary.defaultRate) },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-2 py-1.5 border-r border-border/10 last:border-r-0"
          style={{ backgroundColor: ACCENT_DIM }}
        >
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {item.label}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline Tab ──

interface PipelineDeal {
  borrower: string;
  sponsor: string;
  facility: string;
  size: number;
  spread: number;
  tenor: string;
  leverage: number;
  rating: string;
  status: string;
}

function PipelineTab({ deals }: { deals: PipelineDeal[] }) {
  if (!deals.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO PIPELINE DEALS
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_80px_70px_60px_65px_45px_45px_50px_60px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>BORROWER</span>
        <span>SPONSOR</span>
        <span>FACILITY</span>
        <span className="text-right">SIZE ($M)</span>
        <span className="text-right">SOFR+BP</span>
        <span className="text-right">TENOR</span>
        <span className="text-right">LEV</span>
        <span className="text-center">RATING</span>
        <span className="text-center">STATUS</span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => {
        const st = statusStyle(deal.status);
        const rt = ratingBadge(deal.rating);
        return (
          <div
            key={`${deal.borrower}-${i}`}
            className="grid grid-cols-[1fr_80px_70px_60px_65px_45px_45px_50px_60px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            <span className="font-bold truncate" style={{ color: ACCENT }}>{deal.borrower}</span>
            <span className="text-neutral-400 truncate">{deal.sponsor}</span>
            <span className="text-neutral-400 truncate">{deal.facility}</span>
            <span className="text-right text-white">{fmtM(deal.size)}</span>
            <span className="text-right text-white">{fmtBp(deal.spread)}</span>
            <span className="text-right text-neutral-400">{deal.tenor}</span>
            <span className="text-right text-white">{fmtLev(deal.leverage)}</span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[7px] font-bold ${rt.text} ${rt.bg}`}>
                {deal.rating}
              </span>
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[7px] font-bold uppercase ${st.text} ${st.bg}`}>
                {deal.status}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Secondary Tab ──

interface SecondaryTrade {
  borrower: string;
  bid: number;
  ask: number;
  bidAskSpread: number;
  chg1d: number;
  chg1w: number;
  dm: number;
  rating: string;
}

function SecondaryTab({ trades }: { trades: SecondaryTrade[] }) {
  if (!trades.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO SECONDARY TRADES
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px_55px_50px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>BORROWER</span>
        <span className="text-right">BID</span>
        <span className="text-right">ASK</span>
        <span className="text-right">B-A</span>
        <span className="text-right">1D CHG</span>
        <span className="text-right">1W CHG</span>
        <span className="text-right">DM (BP)</span>
        <span className="text-center">RATING</span>
      </div>

      {/* Rows */}
      {trades.map((trade, i) => {
        const rt = ratingBadge(trade.rating);
        return (
          <div
            key={`${trade.borrower}-${i}`}
            className="grid grid-cols-[1fr_55px_55px_55px_55px_55px_55px_50px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            <span className="font-bold truncate" style={{ color: ACCENT }}>{trade.borrower}</span>
            <span className="text-right text-white">{fmtBid(trade.bid)}</span>
            <span className="text-right text-white">{fmtBid(trade.ask)}</span>
            <span className="text-right text-neutral-400">{fmtBid(trade.bidAskSpread)}</span>
            <span className={`text-right font-bold ${chgColor(trade.chg1d)}`}>{fmtChg(trade.chg1d)}</span>
            <span className={`text-right font-bold ${chgColor(trade.chg1w)}`}>{fmtChg(trade.chg1w)}</span>
            <span className="text-right text-white">{fmtBp(trade.dm)}</span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[7px] font-bold ${rt.text} ${rt.bg}`}>
                {trade.rating}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Leverage Tab ──

interface LeverageTier {
  rating: string;
  avgLeverage: number;
  avgSpread: number;
  avgBid: number;
  avgRecovery: number;
  count: number;
}

function LeverageTab({ tiers }: { tiers: LeverageTier[] }) {
  if (!tiers.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO LEVERAGE DATA
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_60px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>RATING</span>
        <span className="text-right">AVG LEV (X)</span>
        <span className="text-right">AVG SPREAD (BP)</span>
        <span className="text-right">AVG BID</span>
        <span className="text-right">AVG RECOVERY (%)</span>
        <span className="text-right">COUNT</span>
      </div>

      {/* Rows */}
      {tiers.map((tier, i) => {
        const rt = ratingBadge(tier.rating);
        return (
          <div
            key={`${tier.rating}-${i}`}
            className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_60px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            <span>
              <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold ${rt.text} ${rt.bg}`}>
                {tier.rating}
              </span>
            </span>
            <span className="text-right text-white font-bold">{fmtLev(tier.avgLeverage)}</span>
            <span className="text-right text-white">{fmtBp(tier.avgSpread)}</span>
            <span className="text-right text-white">{fmtBid(tier.avgBid)}</span>
            <span className="text-right text-white">{fmtPct(tier.avgRecovery)}</span>
            <span className="text-right text-neutral-400">{tier.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sectors Tab ──

interface SectorData {
  sector: string;
  volumeYtd: number;
  avgSpread: number;
  avgLeverage: number;
  dealCount: number;
  defaultRate: number;
}

function SectorsTab({ sectors }: { sectors: SectorData[] }) {
  if (!sectors.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        NO SECTOR DATA
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_70px_70px_60px_60px_70px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>SECTOR</span>
        <span className="text-right">VOL YTD ($B)</span>
        <span className="text-right">AVG SPREAD (BP)</span>
        <span className="text-right">AVG LEV (X)</span>
        <span className="text-right">DEALS</span>
        <span className="text-right">DEFAULT (%)</span>
      </div>

      {/* Rows */}
      {sectors.map((sector, i) => (
        <div
          key={`${sector.sector}-${i}`}
          className="grid grid-cols-[1fr_70px_70px_60px_60px_70px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="font-bold truncate" style={{ color: ACCENT }}>{sector.sector}</span>
          <span className="text-right text-white">{fmtB(sector.volumeYtd)}</span>
          <span className="text-right text-white">{fmtBp(sector.avgSpread)}</span>
          <span className="text-right text-white">{fmtLev(sector.avgLeverage)}</span>
          <span className="text-right text-neutral-400">{sector.dealCount}</span>
          <span className="text-right text-white">{fmtPct(sector.defaultRate)}</span>
        </div>
      ))}
    </div>
  );
}
