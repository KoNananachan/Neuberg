import { useState } from 'react';
import { useSportsMediaRights } from '../../api/hooks/use-sports-media-rights';
import { RefreshCw, Trophy } from 'lucide-react';

type Tab = 'mediaDeals' | 'franchises' | 'streaming' | 'deals';

const TABS: Tab[] = ['mediaDeals', 'franchises', 'streaming', 'deals'];

const TAB_LABELS: Record<Tab, string> = {
  mediaDeals: 'MEDIA DEALS',
  franchises: 'FRANCHISES',
  streaming: 'STREAMING',
  deals: 'DEALS',
};

/* ---------- Formatters ---------- */

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(0);
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

/* ---------- Main Panel ---------- */

export function SportsMediaRightsPanel() {
  const [tab, setTab] = useState<Tab>('mediaDeals');
  const { data, isLoading, refetch } = useSportsMediaRights();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-rose-500/30 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            SPORTS & MEDIA RIGHTS
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? 'text-rose-400 border-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider animate-pulse">
              LOADING SPORTS MEDIA DATA...
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            FAILED TO LOAD SPORTS MEDIA DATA
          </div>
        )}

        {data && tab === 'mediaDeals' && <MediaDealsTab data={data} />}
        {data && tab === 'franchises' && <FranchisesTab data={data} />}
        {data && tab === 'streaming' && <StreamingTab data={data} />}
        {data && tab === 'deals' && <DealsTab data={data} />}
      </div>
    </div>
  );
}

/* ---------- Media Deals Tab ---------- */

function MediaDealsTab({ data }: { data: any }) {
  const deals = data.mediaDeals ?? data.media_deals ?? [];
  if (!deals || deals.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-rose-500/30 bg-rose-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-rose-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-rose-400">
            League Broadcast Deals
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr]">
        <span>LEAGUE</span>
        <span className="text-right">TOTAL VALUE</span>
        <span>BROADCASTER</span>
        <span className="text-right">TERM</span>
        <span className="text-right">RENEWAL</span>
        <span className="text-right">ESCALATION</span>
      </div>

      {deals.map((d: any, i: number) => (
        <div
          key={d.league ?? d.id ?? i}
          className={`grid grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-rose-400 truncate">
            {d.league ?? d.name}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtMoney(d.totalValue ?? d.value)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {d.broadcaster ?? d.network ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {d.term ?? d.duration ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right tabular-nums">
            {d.renewalYear ?? d.renewal ?? '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(d.escalation)}`}>
            {d.escalation != null ? fmtPct(d.escalation) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Franchises Tab ---------- */

function FranchisesTab({ data }: { data: any }) {
  const franchises = data.franchises ?? data.teams ?? [];
  if (!franchises || franchises.length === 0) return <EmptyState />;

  const sorted = [...franchises].sort((a: any, b: any) => (b.value ?? b.valuation ?? 0) - (a.value ?? a.valuation ?? 0));

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-rose-500/30 bg-rose-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-rose-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-rose-400">
            Team Valuations
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.3fr_0.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr]">
        <span>TEAM</span>
        <span>LEAGUE</span>
        <span className="text-right">VALUE</span>
        <span>OWNER</span>
        <span className="text-right">REVENUE</span>
        <span className="text-right">OP. INCOME</span>
        <span className="text-right">YOY</span>
      </div>

      {sorted.map((f: any, i: number) => (
        <div
          key={f.team ?? f.name ?? i}
          className={`grid grid-cols-[1.3fr_0.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.5fr] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-rose-400 truncate">
            {f.team ?? f.name}
          </span>
          <span className="text-[7px] font-mono font-bold uppercase px-1 py-0.5 bg-rose-500/10 text-rose-400/70 border border-rose-500/20 text-center whitespace-nowrap">
            {f.league ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtMoney(f.value ?? f.valuation)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {f.owner ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtMoney(f.revenue)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            (f.operatingIncome ?? f.opIncome ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {fmtMoney(f.operatingIncome ?? f.opIncome)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${pctColor(f.yoyChange ?? f.yoy)}`}>
            {f.yoyChange != null ? fmtPct(f.yoyChange) : f.yoy != null ? fmtPct(f.yoy) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Streaming Tab ---------- */

function StreamingTab({ data }: { data: any }) {
  const platforms = data.streaming ?? data.platforms ?? [];
  if (!platforms || platforms.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-rose-500/30 bg-rose-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-rose-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-rose-400">
            Streaming Platform Comparison
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1fr_0.7fr_0.7fr_1.2fr_0.6fr]">
        <span>PLATFORM</span>
        <span className="text-right">SPORTS SPEND</span>
        <span className="text-right">SUBSCRIBERS</span>
        <span>KEY RIGHTS</span>
        <span className="text-right">LIVE HRS</span>
      </div>

      {platforms.map((p: any, i: number) => (
        <div
          key={p.platform ?? p.name ?? i}
          className={`grid grid-cols-[1fr_0.7fr_0.7fr_1.2fr_0.6fr] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-rose-400 truncate">
            {p.platform ?? p.name}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtMoney(p.sportsSpend ?? p.spend)}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {p.subscribers != null ? fmtNum(p.subscribers) : '--'}
          </span>
          <div className="flex flex-wrap gap-1">
            {(p.keyRights ?? p.rights ?? []).map((r: string) => (
              <span
                key={r}
                className="px-1 py-0.5 text-[6px] font-bold uppercase bg-rose-500/10 text-rose-400/70 border border-rose-500/20"
              >
                {r}
              </span>
            ))}
            {(!p.keyRights && !p.rights) && (
              <span className="text-[8px] font-mono text-neutral-500">--</span>
            )}
          </div>
          <span className="text-[9px] font-mono text-neutral-300 text-right tabular-nums">
            {p.liveHours != null ? fmtNum(p.liveHours) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Deals Tab ---------- */

function DealsTab({ data }: { data: any }) {
  const transactions = data.deals ?? data.transactions ?? data.recentDeals ?? [];
  if (!transactions || transactions.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-rose-500/30 bg-rose-500/[0.03]">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 bg-rose-400" />
          <span className="text-[7px] font-black uppercase tracking-widest text-rose-400">
            Recent Transactions & Signings
          </span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[0.6fr_1.2fr_0.7fr_1.5fr]">
        <span>DATE</span>
        <span>TRANSACTION</span>
        <span className="text-right">VALUE</span>
        <span>DETAILS</span>
      </div>

      {transactions.map((t: any, i: number) => (
        <div
          key={t.id ?? `${t.date}-${i}`}
          className={`grid grid-cols-[0.6fr_1.2fr_0.7fr_1.5fr] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono text-neutral-500 tabular-nums whitespace-nowrap">
            {t.date ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-rose-400 truncate">
            {t.transaction ?? t.title ?? t.name}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
            {fmtMoney(t.value ?? t.amount)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {t.details ?? t.description ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Shared Components ---------- */

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
      NO DATA AVAILABLE
    </div>
  );
}
