import { useState } from 'react';
import { useCreditFlow } from '../../api/hooks/use-credit-flow';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#fb923c';
const ACCENT_DIM = 'rgba(251,146,60,0.08)';
const GREEN = '#34d399';
const RED = '#f87171';
const GRAY = 'rgba(255,255,255,0.4)';

type Tab = 'flows' | 'issuance' | 'spreads' | 'calendar';
const TABS: { key: Tab; label: string }[] = [
  { key: 'flows', label: 'FLOWS' },
  { key: 'issuance', label: 'ISSUANCE' },
  { key: 'spreads', label: 'SPREADS' },
  { key: 'calendar', label: 'CALENDAR' },
];

// ── Color helpers ──

function bullBear(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return GRAY;
}

function fmtSigned(n: number, suffix = ''): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}${suffix}`;
}

function fmtBp(n: number): string {
  return `${n.toFixed(0)} bp`;
}

function fmtBpChange(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(0)} bp`;
}

function streakDisplay(n: number): { text: string; color: string } {
  if (n > 0) return { text: `+${n}W`, color: GREEN };
  if (n < 0) return { text: `${n}W`, color: RED };
  return { text: '0W', color: GRAY };
}

function typeBadge(type: string): { color: string; bg: string } {
  switch (type) {
    case 'IG':
      return { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
    case 'HY':
      return { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
    case 'Loan':
      return { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' };
    default:
      return { color: GRAY, bg: 'rgba(255,255,255,0.05)' };
  }
}

function signalBadge(signal: string): { color: string; bg: string } {
  switch (signal) {
    case 'Tight':
      return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'Wide':
      return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    default:
      return { color: GRAY, bg: 'rgba(255,255,255,0.05)' };
  }
}

function statusBadge(status: string): { color: string; bg: string } {
  switch (status) {
    case 'Roadshow':
      return { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
    case 'Pricing':
      return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'Pre-Marketing':
      return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
    default:
      return { color: GRAY, bg: 'rgba(255,255,255,0.05)' };
  }
}

function ratingBadge(rating: string): { color: string; bg: string } {
  if (rating.startsWith('A') || rating === 'BBB+' || rating === 'BBB') {
    return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
  }
  if (rating.startsWith('BB')) {
    return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
  }
  if (rating.startsWith('B') || rating.startsWith('C')) {
    return { color: RED, bg: 'rgba(248,113,113,0.12)' };
  }
  return { color: GRAY, bg: 'rgba(255,255,255,0.05)' };
}

function spreadDirDisplay(dir: string): { text: string; color: string } {
  if (dir === 'Tightening') return { text: 'TIGHTENING', color: GREEN };
  if (dir === 'Widening') return { text: 'WIDENING', color: RED };
  return { text: 'NEUTRAL', color: GRAY };
}

// ── Main Panel ──

export function CreditFlowPanel() {
  const { data, isLoading, error, refetch } = useCreditFlow();
  const [tab, setTab] = useState<Tab>('flows');

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            Credit Market Flows
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-orange-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Bar */}
      {data?.summary && (
        <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
          <SummaryCell label="IG Flows 1W" value={`$${data.summary.igFlows1w.toFixed(1)}B`} bullish={data.summary.igFlows1w > 0} />
          <SummaryCell label="HY Flows 1W" value={`$${data.summary.hyFlows1w.toFixed(1)}B`} bullish={data.summary.hyFlows1w > 0} />
          <SummaryCell label="Loan Flows 1W" value={`$${data.summary.loanFlows1w.toFixed(1)}B`} bullish={data.summary.loanFlows1w > 0} />
          <SummaryCell label="New Issue YTD" value={`$${data.summary.newIssueYtd.toFixed(1)}B`} />
          <SummaryCell label="Spread Dir" value={spreadDirDisplay(data.summary.spreadDir).text} color={spreadDirDisplay(data.summary.spreadDir).color} />
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === t.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
            Loading credit flow data...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            Failed to load data
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && tab === 'flows' && <FlowsView flows={data.flows} />}
        {data && tab === 'issuance' && <IssuanceView issuance={data.issuance} />}
        {data && tab === 'spreads' && <SpreadsView spreads={data.spreads} />}
        {data && tab === 'calendar' && <CalendarView calendar={data.calendar} />}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              Last update: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({ label, value, bullish, color }: { label: string; value: string; bullish?: boolean; color?: string }) {
  const valueColor = color ?? (bullish === true ? GREEN : bullish === false ? RED : 'white');
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0" style={{ background: ACCENT_DIM }}>
      <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-[9px] font-mono font-black" style={{ color: valueColor }}>{value}</div>
    </div>
  );
}

// ── Flows Tab ──

function FlowsView({ flows }: { flows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Category" />
            <ThStatic label="1W Flow ($M)" right />
            <ThStatic label="4W Flow ($M)" right />
            <ThStatic label="YTD ($B)" right />
            <ThStatic label="AUM ($B)" right />
            <ThStatic label="Streak" right />
          </tr>
        </thead>
        <tbody>
          {flows.map((f: any, idx: number) => {
            const sk = streakDisplay(f.streak);
            return (
              <tr key={`${f.category}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {f.category}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: bullBear(f.flow1w) }}>
                  {fmtSigned(f.flow1w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: bullBear(f.flow4w) }}>
                  {fmtSigned(f.flow4w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {f.ytd.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {f.aum.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: sk.color }}>
                  {sk.text}
                </td>
              </tr>
            );
          })}
          {flows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No flow data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Issuance Tab ──

function IssuanceView({ issuance }: { issuance: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Issuer" />
            <ThStatic label="Rating" />
            <ThStatic label="Coupon" right />
            <ThStatic label="Maturity" />
            <ThStatic label="Size ($M)" right />
            <ThStatic label="Spread (bp)" right />
            <ThStatic label="Book" right />
            <ThStatic label="Date" />
            <ThStatic label="Type" />
          </tr>
        </thead>
        <tbody>
          {issuance.map((d: any, idx: number) => {
            const rt = ratingBadge(d.rating);
            const tp = typeBadge(d.type);
            return (
              <tr key={`${d.issuer}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {d.issuer}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span
                    className="text-[7px] font-bold px-1 py-0.5"
                    style={{ color: rt.color, backgroundColor: rt.bg }}
                  >
                    {d.rating}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {d.coupon.toFixed(3)}%
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                  {d.maturity}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {d.size.toLocaleString()}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right" style={{ color: ACCENT }}>
                  {fmtBp(d.spread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {d.bookCover.toFixed(1)}x
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500">
                  {d.date}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span
                    className="text-[7px] font-bold px-1 py-0.5"
                    style={{ color: tp.color, backgroundColor: tp.bg }}
                  >
                    {d.type}
                  </span>
                </td>
              </tr>
            );
          })}
          {issuance.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No issuance data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Spreads Tab ──

function SpreadsView({ spreads }: { spreads: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Index" />
            <ThStatic label="Spread (bp)" right />
            <ThStatic label="1W Chg" right />
            <ThStatic label="1M Chg" right />
            <ThStatic label="Percentile" />
            <ThStatic label="Signal" />
          </tr>
        </thead>
        <tbody>
          {spreads.map((s: any, idx: number) => {
            const sig = signalBadge(s.signal);
            const pctWidth = Math.min(100, Math.max(0, s.percentile));
            return (
              <tr key={`${s.index}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {s.index}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtBp(s.spread)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: bullBear(-s.chg1w) }}>
                  {fmtBpChange(s.chg1w)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: bullBear(-s.chg1m) }}>
                  {fmtBpChange(s.chg1m)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-neutral-900 relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{
                          width: `${pctWidth}%`,
                          backgroundColor: pctWidth > 75 ? RED : pctWidth < 25 ? GREEN : '#fbbf24',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[7px] text-neutral-400">{s.percentile}%</span>
                  </div>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span
                    className="text-[7px] font-bold px-1 py-0.5"
                    style={{ color: sig.color, backgroundColor: sig.bg }}
                  >
                    {s.signal}
                  </span>
                </td>
              </tr>
            );
          })}
          {spreads.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No spread data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Calendar Tab ──

function CalendarView({ calendar }: { calendar: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThStatic label="Issuer" />
            <ThStatic label="Exp. Rating" />
            <ThStatic label="Exp. Size ($M)" right />
            <ThStatic label="Tenor" />
            <ThStatic label="Sector" />
            <ThStatic label="Status" />
          </tr>
        </thead>
        <tbody>
          {calendar.map((c: any, idx: number) => {
            const st = statusBadge(c.status);
            return (
              <tr key={`${c.issuer}-${idx}`} className="border-b border-border/10 hover:bg-white/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold" style={{ color: ACCENT }}>
                  {c.issuer}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span
                    className="text-[7px] font-bold px-1 py-0.5"
                    style={{ color: ratingBadge(c.expectedRating).color, backgroundColor: ratingBadge(c.expectedRating).bg }}
                  >
                    {c.expectedRating}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {c.expectedSize.toLocaleString()}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                  {c.tenor}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                  {c.sector}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span
                    className="text-[7px] font-bold px-1 py-0.5"
                    style={{ color: st.color, backgroundColor: st.bg }}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            );
          })}
          {calendar.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No upcoming issuance
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Static Table Header ──

function ThStatic({ label, right }: { label: string; right?: boolean }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}
