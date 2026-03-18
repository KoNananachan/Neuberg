import { useState } from 'react';
import { useCreditAuction } from '../../api/hooks/use-credit-auction';
import { useT } from '../../i18n';
import { Gavel, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ACCENT = '#fb7185';
const ACCENT_DIM = 'rgba(251,113,133,0.08)';

type TabMode = 'recent' | 'pending' | 'recovery' | 'bids';
const TABS: TabMode[] = ['recent', 'pending', 'recovery', 'bids'];

// ── Color helpers ──

function getCreditEventBadge(event: string): { label: string; color: string } {
  switch (event) {
    case 'Bankruptcy':
      return { label: 'BANKRUPTCY', color: 'text-red-400 bg-red-400/15' };
    case 'Failure to Pay':
      return { label: 'FAILURE TO PAY', color: 'text-orange-400 bg-orange-400/15' };
    case 'Restructuring':
      return { label: 'RESTRUCTURING', color: 'text-yellow-400 bg-yellow-400/15' };
    default:
      return { label: event.toUpperCase(), color: 'text-neutral-400 bg-neutral-400/10' };
  }
}

function getRecoveryColor(rate: number): string {
  if (rate >= 60) return 'text-emerald-400';
  if (rate >= 40) return 'text-yellow-400';
  if (rate >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function getRecoveryBarColor(rate: number): string {
  if (rate >= 60) return '#34d399';
  if (rate >= 40) return '#fbbf24';
  if (rate >= 20) return '#fb923c';
  return '#f87171';
}

// ── Main Panel ──

export function CreditAuctionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditAuction();
  const [tab, setTab] = useState<TabMode>('recent');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            {tr(t, 'creditAuctionTitle', 'Credit Default Auction Monitor')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-rose-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Bar */}
      {data && (
        <div className="grid grid-cols-4 border-b border-border/20 shrink-0">
          <SummaryCell label="Total Auctions (YTD)" value={String(data.summary.totalAuctions)} />
          <SummaryCell label="Avg Recovery" value={`${data.summary.avgRecovery.toFixed(1)}%`} />
          <SummaryCell label="Total Notional" value={`$${data.summary.totalNotional.toFixed(1)}B`} />
          <SummaryCell label="Pending" value={String(data.summary.pending)} />
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex items-center px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0 gap-0.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
              tab === t
                ? 'text-rose-400 bg-rose-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'creditAuctionNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'recent' && <RecentView auctions={data.recent} />}
        {data && tab === 'pending' && <PendingView pending={data.pending} />}
        {data && tab === 'recovery' && <RecoveryView sectors={data.recovery} />}
        {data && tab === 'bids' && <BidsView bids={data.bids} auctionEntity={data.bidsAuctionEntity} />}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'creditAuctionLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0" style={{ background: ACCENT_DIM }}>
      <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-[9px] font-mono font-black text-white">{value}</div>
    </div>
  );
}

// ── Recent View ──

function RecentView({ auctions }: { auctions: CreditAuctionRecent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Entity" />
            <ThStatic label="Event Date" />
            <ThStatic label="Auction Date" />
            <ThStatic label="Recovery %" />
            <ThStatic label="Final Price" />
            <ThStatic label="Credit Event" />
            <ThStatic label="Protocol" />
            <ThStatic label="Notional ($M)" />
          </tr>
        </thead>
        <tbody>
          {auctions.map((a, idx) => {
            const badge = getCreditEventBadge(a.creditEvent);
            return (
              <tr key={`${a.entity}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {a.entity}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{a.eventDate}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">{a.auctionDate}</td>
                <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getRecoveryColor(a.recoveryRate)}`}>
                  {a.recoveryRate.toFixed(2)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">{a.finalPrice.toFixed(2)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${badge.color}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">{a.protocol}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300 text-right">{a.notional.toFixed(1)}</td>
              </tr>
            );
          })}
          {auctions.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No recent auctions
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Pending View ──

function PendingView({ pending }: { pending: CreditAuctionPending[] }) {
  return (
    <div className="px-3 py-2 space-y-1">
      {pending.map((p, idx) => (
        <div
          key={`${p.entity}-${idx}`}
          className="p-2 border border-border/20 bg-[#060606] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
              {p.entity}
            </span>
            <span className="text-[7px] font-mono text-neutral-500">{p.sector}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <PendingField label="Expected Date" value={p.expectedDate} />
            <PendingField label="Trigger" value={p.trigger} />
            <PendingField label="Est. Notional" value={`$${p.estimatedNotional.toFixed(1)}M`} />
            <PendingField label="CDS Spread" value={`${p.currentCdsSpread.toFixed(1)} bps`} />
          </div>
        </div>
      ))}
      {pending.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          No pending auctions
        </div>
      )}
    </div>
  );
}

function PendingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[7px] font-mono text-neutral-600 uppercase">{label}</span>
      <span className="text-[8px] font-mono text-neutral-300 font-bold">{value}</span>
    </div>
  );
}

// ── Recovery View ──

function RecoveryView({ sectors }: { sectors: CreditAuctionRecovery[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Sector" />
            <ThStatic label="Avg Recovery %" />
            <ThStatic label="" />
            <ThStatic label="Count" />
            <ThStatic label="Min %" />
            <ThStatic label="Max %" />
            <ThStatic label="Std Dev" />
          </tr>
        </thead>
        <tbody>
          {sectors.map((s, idx) => {
            const barColor = getRecoveryBarColor(s.avgRecovery);
            const barWidth = Math.min(100, Math.max(0, s.avgRecovery));
            return (
              <tr key={`${s.sector}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {s.sector}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getRecoveryColor(s.avgRecovery)}`}>
                  {s.avgRecovery.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap w-24">
                  <div className="w-full h-2 bg-neutral-900 relative">
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor, opacity: 0.5 }}
                    />
                  </div>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400 text-right">{s.count}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">{s.min.toFixed(1)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">{s.max.toFixed(1)}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">{s.stdDev.toFixed(2)}</td>
              </tr>
            );
          })}
          {sectors.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No recovery data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Bids View ──

function BidsView({ bids, auctionEntity }: { bids: CreditAuctionBid[]; auctionEntity: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="px-3 py-1.5 border-b border-border/10">
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">
          Bids for:{' '}
        </span>
        <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
          {auctionEntity}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Dealer" />
            <ThStatic label="Initial Bid" />
            <ThStatic label="Final Bid" />
            <ThStatic label="Notional ($M)" />
          </tr>
        </thead>
        <tbody>
          {bids.map((b, idx) => (
            <tr key={`${b.dealer}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                {b.dealer}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">{b.initialBid.toFixed(2)}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{b.finalBid.toFixed(2)}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300 text-right">{b.notionalSubmitted.toFixed(1)}</td>
            </tr>
          ))}
          {bids.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No bid data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Static Table Header ──

function ThStatic({ label }: { label: string }) {
  return (
    <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
      {label}
    </th>
  );
}

// ── Type Definitions ──

interface CreditAuctionRecent {
  entity: string;
  eventDate: string;
  auctionDate: string;
  recoveryRate: number;
  finalPrice: number;
  creditEvent: string;
  protocol: string;
  notional: number;
}

interface CreditAuctionPending {
  entity: string;
  expectedDate: string;
  trigger: string;
  sector: string;
  estimatedNotional: number;
  currentCdsSpread: number;
}

interface CreditAuctionRecovery {
  sector: string;
  avgRecovery: number;
  count: number;
  min: number;
  max: number;
  stdDev: number;
}

interface CreditAuctionBid {
  dealer: string;
  initialBid: number;
  finalBid: number;
  notionalSubmitted: number;
}
