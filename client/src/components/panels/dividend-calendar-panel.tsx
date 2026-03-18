import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useDividendCalendar } from '../../api/hooks/use-dividend-calendar';
import { useT } from '../../i18n';
import { DollarSign, RefreshCw } from 'lucide-react';

// ── Types ──

type TabKey = 'upcoming' | 'topYields' | 'growth' | 'calendar' | 'changes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'UPCOMING' },
  { key: 'topYields', label: 'TOP YIELDS' },
  { key: 'growth', label: 'GROWTH' },
  { key: 'calendar', label: 'CALENDAR' },
  { key: 'changes', label: 'CHANGES' },
];

// ── Helpers ──

function fmtDate(d: string | null): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtPct(n: number | null, decimals = 2): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtMoney(n: number | null): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function changePctColor(n: number | null): string {
  if (n == null) return 'text-neutral/40';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral/50';
}

function safetyBadge(safety: string | null): { label: string; cls: string } {
  switch (safety?.toUpperCase()) {
    case 'SAFE':
      return { label: 'SAFE', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
    case 'WATCH':
      return { label: 'WATCH', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    case 'AT RISK':
      return { label: 'AT RISK', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    default:
      return { label: '--', cls: 'text-neutral/30 bg-white/5 border-border/20' };
  }
}

function changeTypeBadge(type: string | null): { label: string; cls: string } {
  switch (type?.toUpperCase()) {
    case 'INCREASE':
      return { label: 'INCREASE', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
    case 'DECREASE':
      return { label: 'DECREASE', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    case 'INITIATION':
      return { label: 'INITIATION', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'SUSPENSION':
      return { label: 'SUSPENSION', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    case 'SPECIAL':
      return { label: 'SPECIAL', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    default:
      return { label: type ?? '--', cls: 'text-neutral/40 bg-white/5 border-border/20' };
  }
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ── Tab Views ──

function UpcomingTab({ data }: { data: any }) {
  const items = data?.upcoming ?? [];

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[52px_1fr_62px_62px_52px_48px_52px_52px_70px] text-[7px] font-mono font-black text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-border/20 bg-black">
        <span>TICKER</span>
        <span>NAME</span>
        <span className="text-right">EX-DATE</span>
        <span className="text-right">PAY-DATE</span>
        <span className="text-right">AMOUNT</span>
        <span className="text-right">YIELD</span>
        <span className="text-right">PREV</span>
        <span className="text-right">CHG %</span>
        <span className="text-right">SECTOR</span>
      </div>

      {items.map((item: any, i: any) => (
        <div
          key={`${item.ticker}-${i}`}
          className="grid grid-cols-[52px_1fr_62px_62px_52px_48px_52px_52px_70px] text-[9px] font-mono px-2 py-1.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-emerald-400 font-black truncate">{item.ticker}</span>
          <span className="text-neutral/50 truncate">{item.name}</span>
          <span className="text-right text-neutral/60">{fmtDate(item.exDate)}</span>
          <span className="text-right text-neutral/50">{fmtDate(item.payDate)}</span>
          <span className="text-right text-neutral/70">{fmtMoney(item.amount)}</span>
          <span className="text-right text-emerald-400 font-bold">{item.yield != null ? item.yield.toFixed(2) + '%' : '--'}</span>
          <span className="text-right text-neutral/40">{fmtMoney(item.previousAmount)}</span>
          <span className={`text-right font-bold ${changePctColor(item.changePct)}`}>{fmtPct(item.changePct)}</span>
          <span className="text-right text-neutral/40 truncate">{item.sector ?? '--'}</span>
        </div>
      ))}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
          NO UPCOMING DIVIDENDS
        </div>
      )}
    </div>
  );
}

function TopYieldsTab({ data }: { data: any }) {
  const items = data?.topYields ?? [];

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[52px_1fr_56px_52px_80px_56px_42px_60px] text-[7px] font-mono font-black text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-border/20 bg-black">
        <span>TICKER</span>
        <span>NAME</span>
        <span className="text-right">YIELD</span>
        <span className="text-right">AMOUNT</span>
        <span className="text-right">PAYOUT RATIO</span>
        <span className="text-right">5Y CAGR</span>
        <span className="text-right">YRS</span>
        <span className="text-right">SAFETY</span>
      </div>

      {items.map((item: any, i: any) => {
        const badge = safetyBadge(item.safety);
        const payoutPct = item.payoutRatio != null ? Math.min(item.payoutRatio, 100) : 0;
        return (
          <div
            key={`${item.ticker}-${i}`}
            className="grid grid-cols-[52px_1fr_56px_52px_80px_56px_42px_60px] text-[9px] font-mono px-2 py-1.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-emerald-400 font-black truncate">{item.ticker}</span>
            <span className="text-neutral/50 truncate">{item.name}</span>
            <span className="text-right text-emerald-400 font-bold text-[10px]">{item.yield != null ? item.yield.toFixed(2) + '%' : '--'}</span>
            <span className="text-right text-neutral/60">{fmtMoney(item.amount)}</span>
            <span className="text-right flex items-center justify-end gap-1">
              <div className="w-12 h-1.5 bg-white/5 relative">
                <div
                  className="h-full bg-emerald-400/40"
                  style={{ width: `${payoutPct}%` }}
                />
              </div>
              <span className="text-neutral/40 text-[8px] w-8 text-right">{item.payoutRatio != null ? item.payoutRatio.toFixed(0) + '%' : '--'}</span>
            </span>
            <span className="text-right text-neutral/50">{item.growthRate5Y != null ? fmtPct(item.growthRate5Y) : '--'}</span>
            <span className="text-right text-neutral/50">{item.consecutiveYears ?? '--'}</span>
            <span className="text-right">
              <span className={`inline-block px-1 py-0.5 text-[7px] font-black border ${badge.cls}`}>
                {badge.label}
              </span>
            </span>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
          NO YIELD DATA
        </div>
      )}
    </div>
  );
}

function GrowthTab({ data }: { data: any }) {
  const items = data?.growth ?? [];

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[52px_1fr_52px_56px_56px_56px_72px] text-[7px] font-mono font-black text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-border/20 bg-black">
        <span>TICKER</span>
        <span>NAME</span>
        <span className="text-right">YIELD</span>
        <span className="text-right">1Y CAGR</span>
        <span className="text-right">3Y CAGR</span>
        <span className="text-right">5Y CAGR</span>
        <span className="text-right">STATUS</span>
      </div>

      {items.map((item: any, i: any) => (
        <div
          key={`${item.ticker}-${i}`}
          className="grid grid-cols-[52px_1fr_52px_56px_56px_56px_72px] text-[9px] font-mono px-2 py-1.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-emerald-400 font-black truncate">{item.ticker}</span>
          <span className="text-neutral/50 truncate">{item.name}</span>
          <span className="text-right text-emerald-400">{item.currentYield != null ? item.currentYield.toFixed(2) + '%' : '--'}</span>
          <span className={`text-right font-bold ${changePctColor(item.cagr1Y)}`}>{fmtPct(item.cagr1Y)}</span>
          <span className={`text-right font-bold ${changePctColor(item.cagr3Y)}`}>{fmtPct(item.cagr3Y)}</span>
          <span className={`text-right font-bold ${changePctColor(item.cagr5Y)}`}>{fmtPct(item.cagr5Y)}</span>
          <span className="text-right">
            {item.isAristocrat && (
              <span className="inline-block px-1 py-0.5 text-[7px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
                ARISTOCRAT
              </span>
            )}
          </span>
        </div>
      ))}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
          NO GROWTH DATA
        </div>
      )}
    </div>
  );
}

function CalendarTab({ data }: { data: any }) {
  const months = data?.calendar ?? [];

  return (
    <div className="overflow-auto p-2">
      <div className="grid grid-cols-4 gap-px">
        {MONTH_NAMES.map((name: any, idx: any) => {
          const month = months.find((m: any) => m.month === idx + 1) ?? {};
          return (
            <div
              key={name}
              className="bg-black border border-border/20 p-2 hover:bg-emerald-400/[0.02] transition-colors"
            >
              {/* Month header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[7px] font-mono font-black text-neutral/50 uppercase tracking-wider">{name}</span>
                <span className="text-[8px] font-mono text-emerald-400 font-bold">
                  {month.paymentCount ?? 0}
                </span>
              </div>

              {/* Total amount */}
              <div className="text-[10px] font-mono font-bold text-neutral/70 mb-1.5">
                {month.totalAmount != null ? `$${month.totalAmount.toFixed(2)}` : '$0.00'}
              </div>

              {/* Top payers */}
              <div className="space-y-0.5">
                {(month.topPayers ?? []).slice(0, 3).map((payer: any, pi: any) => (
                  <div key={pi} className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-emerald-400/70 truncate">{payer.ticker}</span>
                    <span className="text-neutral/40">{fmtMoney(payer.amount)}</span>
                  </div>
                ))}
              </div>

              {(!month.topPayers || month.topPayers.length === 0) && (
                <div className="text-[8px] font-mono text-neutral/20">--</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChangesTab({ data }: { data: any }) {
  const items = data?.changes ?? [];

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[52px_72px_56px_52px_52px_56px_62px] text-[7px] font-mono font-black text-neutral/40 uppercase tracking-wider px-2 py-1 border-b border-border/20 bg-black">
        <span>TICKER</span>
        <span>TYPE</span>
        <span className="text-right">OLD</span>
        <span className="text-center">-&gt;</span>
        <span className="text-right">NEW</span>
        <span className="text-right">CHG %</span>
        <span className="text-right">DATE</span>
      </div>

      {items.map((item: any, i: any) => {
        const badge = changeTypeBadge(item.type);
        return (
          <div
            key={`${item.ticker}-${i}`}
            className="grid grid-cols-[52px_72px_56px_52px_52px_56px_62px] text-[9px] font-mono px-2 py-1.5 border-b border-border/20 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-emerald-400 font-black truncate">{item.ticker}</span>
            <span>
              <span className={`inline-block px-1 py-0.5 text-[7px] font-black border ${badge.cls}`}>
                {badge.label}
              </span>
            </span>
            <span className="text-right text-neutral/40">{fmtMoney(item.oldAmount)}</span>
            <span className="text-center text-neutral/30">&rarr;</span>
            <span className="text-right text-neutral/70 font-bold">{fmtMoney(item.newAmount)}</span>
            <span className={`text-right font-bold ${changePctColor(item.changePct)}`}>{fmtPct(item.changePct)}</span>
            <span className="text-right text-neutral/50">{fmtDate(item.date)}</span>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
          NO RECENT CHANGES
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function DividendCalendarPanel() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const { data, isLoading, error, refetch } = useDividendCalendar();

  const content = useMemo(() => {
    if (!data) return null;
    switch (activeTab) {
      case 'upcoming': return <UpcomingTab data={data} />;
      case 'topYields': return <TopYieldsTab data={data} />;
      case 'growth': return <GrowthTab data={data} />;
      case 'calendar': return <CalendarTab data={data} />;
      case 'changes': return <ChangesTab data={data} />;
      default: return null;
    }
  }, [data, activeTab]);

  return (
    <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-black shrink-0">
        <div className="flex items-center gap-1.5">
          <DollarSign size={11} className="text-emerald-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {t('panelDividendCalendar' as any) || 'DIVIDEND CALENDAR'}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-0.5 text-neutral/40 hover:text-emerald-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-black shrink-0">
        {TABS.map(({ key, label }: any) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
              activeTab === key
                ? 'bg-emerald-400/20 text-emerald-400'
                : 'text-neutral/40 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest">
              LOADING DIVIDEND DATA...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
              FAILED TO LOAD
            </span>
            <button
              onClick={() => refetch()}
              className="text-[9px] font-mono text-emerald-400 hover:text-white border border-emerald-400/30 px-2 py-0.5 transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : (
          content
        )}
      </div>
    </GlassCard>
  );
}
