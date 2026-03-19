import { useState, useMemo } from 'react';
import { useCorporateActionCalendar } from '../../api/hooks/use-corporate-action-calendar';

// ── Types ──

type TabKey = 'calendar' | 'dividends' | 'splits' | 'ma' | 'lockups';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'calendar', label: 'CALENDAR' },
  { key: 'dividends', label: 'DIVIDENDS' },
  { key: 'splits', label: 'SPLITS' },
  { key: 'ma', label: 'M&A' },
  { key: 'lockups', label: 'LOCKUPS' },
];

interface CalendarEvent {
  date: string;
  ticker: string;
  company: string;
  type: 'DIVIDEND' | 'SPLIT' | 'MERGER' | 'ACQUISITION' | 'LOCKUP' | 'SPINOFF' | 'TENDER' | string;
  description: string;
}

interface DividendEntry {
  ticker: string;
  company: string;
  exDate: string;
  amount: number;
  yield: number;
  frequency: string;
}

interface SplitEntry {
  ticker: string;
  company: string;
  effectiveDate: string;
  ratio: string;
  type: 'FORWARD' | 'REVERSE' | string;
}

interface MaDeal {
  acquirer: string;
  target: string;
  dealValue: number;
  voteDate: string | null;
  regulatoryDeadline: string | null;
  expectedClose: string;
  status: string;
}

interface LockupEntry {
  ticker: string;
  company: string;
  expirationDate: string;
  sharesReleased: number;
  pctOfFloat: number;
  ipoDate: string;
}

interface CorporateActionCalendarData {
  events: CalendarEvent[];
  dividends: DividendEntry[];
  splits: SplitEntry[];
  maDeals: MaDeal[];
  lockups: LockupEntry[];
  timestamp: string;
}

// ── Formatting helpers ──

function fmtDate(iso: string | null): string {
  if (!iso) return '--';
  return iso.slice(0, 10);
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtPct(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtMoney(n: number | null): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2);
}

function fmtShares(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDealValue(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString();
}

function isToday(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function daysUntil(iso: string): number {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Color helpers ──

function eventTypeBadge(type: string): { label: string; cls: string } {
  switch (type) {
    case 'DIVIDEND':
      return { label: 'DIV', cls: 'text-green-400 bg-green-400/10' };
    case 'SPLIT':
      return { label: 'SPLIT', cls: 'text-blue-400 bg-blue-400/10' };
    case 'MERGER':
    case 'ACQUISITION':
      return { label: 'M&A', cls: 'text-purple-400 bg-purple-400/10' };
    case 'LOCKUP':
      return { label: 'LOCK', cls: 'text-amber-400 bg-amber-400/10' };
    case 'SPINOFF':
      return { label: 'SPIN', cls: 'text-cyan-400 bg-cyan-400/10' };
    case 'TENDER':
      return { label: 'TNDR', cls: 'text-orange-400 bg-orange-400/10' };
    default:
      return { label: type.slice(0, 4), cls: 'text-white/40 bg-white/5' };
  }
}

function maStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
      return 'text-green-400';
    case 'PENDING':
    case 'SHAREHOLDER_VOTE':
      return 'text-yellow-400';
    case 'REGULATORY_REVIEW':
      return 'text-orange-400';
    case 'ANNOUNCED':
      return 'text-indigo-400';
    default:
      return 'text-white/40';
  }
}

// ── Tab: Calendar ──

function CalendarTab({ events }: { events: CalendarEvent[] }) {
  const grouped = useMemo(() => {
    if (!events?.length) return [];
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const dateKey = fmtDate(e.date);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  if (!events?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO UPCOMING EVENTS
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {grouped.map(([dateKey, items]) => {
        const today = isToday(dateKey);
        return (
          <div key={dateKey}>
            <div
              className={`sticky top-0 z-10 px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-widest border-b border-border/20 ${
                today
                  ? 'bg-indigo-400/10 text-indigo-400'
                  : 'bg-[#080808] text-indigo-400/60'
              }`}
            >
              {fmtDateShort(dateKey)}
              {today && (
                <span className="ml-2 text-[6px] font-bold bg-indigo-400/20 text-indigo-300 px-1 py-[1px]">
                  TODAY
                </span>
              )}
            </div>
            {items.map((e, i) => {
              const badge = eventTypeBadge(e.type);
              return (
                <div
                  key={`${e.ticker}-${e.type}-${i}`}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.02] hover:bg-indigo-400/[0.02] transition-colors"
                >
                  <span className="w-[36px] shrink-0">
                    <span className={`text-[6px] font-bold uppercase px-1 py-[1px] ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </span>
                  <span className="w-[48px] shrink-0 text-[8px] font-bold text-indigo-400">{e.ticker}</span>
                  <span className="w-[100px] shrink-0 text-white/40 truncate">{e.company}</span>
                  <span className="flex-1 text-white/30 truncate">{e.description}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Dividends ──

function DividendsTab({ dividends }: { dividends: DividendEntry[] }) {
  if (!dividends?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO UPCOMING DIVIDENDS
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center px-2 py-0.5 border-b border-border/20 bg-black text-[7px] text-white/20 uppercase tracking-wider font-black">
        <span className="w-[60px] shrink-0">EX DATE</span>
        <span className="w-[48px] shrink-0">TICKER</span>
        <span className="w-[100px] shrink-0">COMPANY</span>
        <span className="w-[52px] shrink-0 text-right">AMOUNT</span>
        <span className="w-[48px] shrink-0 text-right">YIELD</span>
        <span className="flex-1 text-right">FREQ</span>
      </div>

      {dividends.map((d, i) => {
        const today = isToday(d.exDate);
        const highYield = d.yield >= 5.0;
        return (
          <div
            key={`${d.ticker}-${d.exDate}-${i}`}
            className={`flex items-center px-2 py-[3px] border-b border-white/[0.02] hover:bg-indigo-400/[0.02] transition-colors ${
              today ? 'bg-indigo-400/[0.06]' : ''
            }`}
          >
            <span className={`w-[60px] shrink-0 text-[7px] ${today ? 'text-indigo-400 font-bold' : 'text-white/30'}`}>
              {fmtDate(d.exDate)}
              {today && (
                <span className="ml-1 text-[5px] bg-indigo-400/20 text-indigo-300 px-0.5">EX</span>
              )}
            </span>
            <span className="w-[48px] shrink-0 text-[8px] font-bold text-indigo-400">{d.ticker}</span>
            <span className="w-[100px] shrink-0 text-white/40 truncate">{d.company}</span>
            <span className="w-[52px] shrink-0 text-right text-white/60">{fmtMoney(d.amount)}</span>
            <span
              className={`w-[48px] shrink-0 text-right font-bold ${
                highYield ? 'text-green-400' : 'text-white/50'
              }`}
            >
              {fmtPct(d.yield)}
            </span>
            <span className="flex-1 text-right text-white/30 text-[7px]">{d.frequency}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Splits ──

function SplitsTab({ splits }: { splits: SplitEntry[] }) {
  if (!splits?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO UPCOMING SPLITS
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center px-2 py-0.5 border-b border-border/20 bg-black text-[7px] text-white/20 uppercase tracking-wider font-black">
        <span className="w-[60px] shrink-0">EFF DATE</span>
        <span className="w-[48px] shrink-0">TICKER</span>
        <span className="w-[100px] shrink-0">COMPANY</span>
        <span className="w-[60px] shrink-0 text-right">RATIO</span>
        <span className="flex-1 text-right">TYPE</span>
      </div>

      {splits.map((s, i) => {
        const isReverse = s.type === 'REVERSE';
        return (
          <div
            key={`${s.ticker}-${s.effectiveDate}-${i}`}
            className="flex items-center px-2 py-[3px] border-b border-white/[0.02] hover:bg-indigo-400/[0.02] transition-colors"
          >
            <span className="w-[60px] shrink-0 text-[7px] text-white/30">{fmtDate(s.effectiveDate)}</span>
            <span className="w-[48px] shrink-0 text-[8px] font-bold text-indigo-400">{s.ticker}</span>
            <span className="w-[100px] shrink-0 text-white/40 truncate">{s.company}</span>
            <span className={`w-[60px] shrink-0 text-right font-bold ${isReverse ? 'text-red-400' : 'text-white/60'}`}>
              {s.ratio}
            </span>
            <span className="flex-1 text-right">
              <span
                className={`text-[6px] font-bold uppercase px-1 py-[1px] ${
                  isReverse
                    ? 'text-red-400 bg-red-400/10'
                    : 'text-blue-400 bg-blue-400/10'
                }`}
              >
                {s.type}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: M&A ──

function MaTab({ deals }: { deals: MaDeal[] }) {
  if (!deals?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO M&A ACTIVITY
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center px-2 py-0.5 border-b border-border/20 bg-black text-[7px] text-white/20 uppercase tracking-wider font-black">
        <span className="w-[80px] shrink-0">ACQUIRER</span>
        <span className="w-[80px] shrink-0">TARGET</span>
        <span className="w-[56px] shrink-0 text-right">VALUE</span>
        <span className="w-[56px] shrink-0 text-right">VOTE</span>
        <span className="w-[56px] shrink-0 text-right">REG DL</span>
        <span className="w-[56px] shrink-0 text-right">EXP CLS</span>
        <span className="flex-1 text-right">STATUS</span>
      </div>

      {deals.map((d, i) => (
        <div
          key={`${d.acquirer}-${d.target}-${i}`}
          className="flex items-center px-2 py-[3px] border-b border-white/[0.02] hover:bg-indigo-400/[0.02] transition-colors"
        >
          <span className="w-[80px] shrink-0 text-white/50 truncate text-[7px]">{d.acquirer}</span>
          <span className="w-[80px] shrink-0 text-[8px] font-bold text-indigo-400 truncate">{d.target}</span>
          <span className="w-[56px] shrink-0 text-right text-white/60 text-[7px]">{fmtDealValue(d.dealValue)}</span>
          <span className="w-[56px] shrink-0 text-right text-white/30 text-[7px]">{fmtDate(d.voteDate)}</span>
          <span className="w-[56px] shrink-0 text-right text-white/30 text-[7px]">{fmtDate(d.regulatoryDeadline)}</span>
          <span className="w-[56px] shrink-0 text-right text-white/30 text-[7px]">{fmtDate(d.expectedClose)}</span>
          <span className={`flex-1 text-right text-[7px] font-bold ${maStatusColor(d.status)}`}>
            {d.status.replace(/_/g, ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Lockups ──

function LockupsTab({ lockups }: { lockups: LockupEntry[] }) {
  if (!lockups?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO UPCOMING LOCKUP EXPIRATIONS
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center px-2 py-0.5 border-b border-border/20 bg-black text-[7px] text-white/20 uppercase tracking-wider font-black">
        <span className="w-[60px] shrink-0">EXP DATE</span>
        <span className="w-[48px] shrink-0">TICKER</span>
        <span className="w-[90px] shrink-0">COMPANY</span>
        <span className="w-[60px] shrink-0 text-right">SHARES</span>
        <span className="w-[52px] shrink-0 text-right">% FLOAT</span>
        <span className="flex-1 text-right">IPO DATE</span>
      </div>

      {lockups.map((l, i) => {
        const days = daysUntil(l.expirationDate);
        const imminent = days >= 0 && days <= 7;
        return (
          <div
            key={`${l.ticker}-${l.expirationDate}-${i}`}
            className={`flex items-center px-2 py-[3px] border-b border-white/[0.02] hover:bg-indigo-400/[0.02] transition-colors ${
              imminent ? 'bg-amber-400/[0.04]' : ''
            }`}
          >
            <span className={`w-[60px] shrink-0 text-[7px] ${imminent ? 'text-amber-400 font-bold' : 'text-white/30'}`}>
              {fmtDate(l.expirationDate)}
              {imminent && (
                <span className="ml-1 text-[5px] bg-amber-400/20 text-amber-300 px-0.5">
                  {days === 0 ? 'TODAY' : days + 'D'}
                </span>
              )}
            </span>
            <span className="w-[48px] shrink-0 text-[8px] font-bold text-indigo-400">{l.ticker}</span>
            <span className="w-[90px] shrink-0 text-white/40 truncate">{l.company}</span>
            <span className="w-[60px] shrink-0 text-right text-white/60 text-[7px]">{fmtShares(l.sharesReleased)}</span>
            <span
              className={`w-[52px] shrink-0 text-right font-bold text-[7px] ${
                l.pctOfFloat >= 20 ? 'text-amber-400' : 'text-white/50'
              }`}
            >
              {fmtPct(l.pctOfFloat)}
            </span>
            <span className="flex-1 text-right text-white/30 text-[7px]">{fmtDate(l.ipoDate)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function CorporateActionCalendarPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const { data: rawData, isLoading } = useCorporateActionCalendar();

  const data = rawData as CorporateActionCalendarData | undefined;

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        <span className="text-[9px] font-mono text-indigo-400/40 uppercase tracking-widest animate-pulse">
          LOADING CORPORATE ACTIONS...
        </span>
      </div>
    );
  }

  // Empty / error state
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          NO DATA AVAILABLE
        </span>
      </div>
    );
  }

  const content = (() => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarTab events={data.events} />;
      case 'dividends':
        return <DividendsTab dividends={data.dividends} />;
      case 'splits':
        return <SplitsTab splits={data.splits} />;
      case 'ma':
        return <MaTab deals={data.maDeals} />;
      case 'lockups':
        return <LockupsTab lockups={data.lockups} />;
      default:
        return null;
    }
  })();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/20 bg-black shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
            CORPORATE ACTION CALENDAR
          </span>
        </div>
        {data.timestamp && (
          <span className="text-[7px] text-white/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === key
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {content}
      </div>
    </div>
  );
}
