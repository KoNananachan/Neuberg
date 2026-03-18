import { useState } from 'react';
import { usePrimaryDealer } from '../../api/hooks/use-primary-dealer';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#60a5fa';
const ACCENT_DIM = 'rgba(96,165,250,0.08)';

type Tab = 'positions' | 'corporate' | 'trend' | 'financing';

const TABS: { key: Tab; label: string }[] = [
  { key: 'positions', label: 'POSITIONS' },
  { key: 'corporate', label: 'CORPORATE' },
  { key: 'trend', label: 'TREND' },
  { key: 'financing', label: 'FINANCING' },
];

// ── Formatting helpers ──

function fmtB(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(1)}B`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// ── Color helpers ──

function netColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function netColorHex(n: number): string {
  if (n > 0) return '#4ade80';
  if (n < 0) return '#f87171';
  return 'rgba(255,255,255,0.3)';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400/70';
  if (n < 0) return 'text-red-400/70';
  return 'text-neutral-600';
}

// ── Net Position Bar ──

function NetBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? (Math.abs(value) / maxAbs) * 100 : 0;
  const color = netColorHex(value);
  return (
    <div className="w-16 h-1.5 bg-white/[0.03] relative overflow-hidden">
      <div
        className="h-full absolute"
        style={{
          width: `${Math.min(pct, 100)}%`,
          backgroundColor: color,
          opacity: 0.6,
          ...(value >= 0 ? { left: 0 } : { right: 0 }),
        }}
      />
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const items = [
    { label: 'TOTAL NET', value: fmtB(summary.totalNet ?? 0), color: netColor(summary.totalNet ?? 0) },
    { label: 'TREASURY NET', value: fmtB(summary.treasuryNet ?? 0), color: netColor(summary.treasuryNet ?? 0) },
    { label: 'AGENCY NET', value: fmtB(summary.agencyNet ?? 0), color: netColor(summary.agencyNet ?? 0) },
    { label: 'CORP NET', value: fmtB(summary.corpNet ?? 0), color: netColor(summary.corpNet ?? 0) },
    {
      label: 'WEEKLY CHG',
      value: fmtChange(summary.weeklyChange ?? 0),
      color: netColor(summary.weeklyChange ?? 0),
      badge: (summary.weeklyChange ?? 0) >= 0 ? 'BULLISH' : 'BEARISH',
      badgeColor: (summary.weeklyChange ?? 0) >= 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/10">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0" style={{ backgroundColor: ACCENT_DIM }}>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{item.label}</div>
          <div className={`text-[9px] font-mono font-bold ${item.color}`}>{item.value}</div>
          {item.badge && (
            <span className={`text-[6px] font-mono font-black uppercase tracking-wider px-1 py-px ${item.badgeColor}`}>
              {item.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Positions Tab ──

function PositionsTab({ data }: { data: any }) {
  const positions = data?.positions ?? [];
  if (positions.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No position data available
      </div>
    );
  }

  const maxAbsNet = Math.max(...positions.map((p: any) => Math.abs(p.net ?? 0)), 1);

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_72px_48px_48px_68px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Category</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Long ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Short ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Net ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">4W Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Net</span>
      </div>

      {/* Table rows */}
      {positions.map((pos: any, i: number) => (
        <div
          key={pos.category ?? i}
          className="grid grid-cols-[1fr_64px_64px_72px_48px_48px_68px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {pos.category}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtB(pos.long ?? 0)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtB(pos.short ?? 0)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${netColor(pos.net ?? 0)}`}>
            {fmtB(pos.net ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(pos.change1w ?? 0)}`}>
            {fmtChange(pos.change1w ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(pos.change4w ?? 0)}`}>
            {fmtChange(pos.change4w ?? 0)}
          </span>
          <div className="flex justify-end pr-1">
            <NetBar value={pos.net ?? 0} maxAbs={maxAbsNet} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Corporate Tab ──

function CorporateTab({ data }: { data: any }) {
  const corporates = data?.corporate ?? [];
  if (corporates.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No corporate data available
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Category</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Net Position ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">4W Chg</span>
      </div>

      {/* Table rows */}
      {corporates.map((row: any, i: number) => (
        <div
          key={row.category ?? i}
          className="grid grid-cols-[1fr_80px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {row.category}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${netColor(row.net ?? 0)}`}>
            {fmtB(row.net ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(row.change1w ?? 0)}`}>
            {fmtChange(row.change1w ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(row.change4w ?? 0)}`}>
            {fmtChange(row.change4w ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Trend Tab ──

function TrendTab({ data }: { data: any }) {
  const weeks = data?.trend ?? [];
  if (weeks.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No trend data available
      </div>
    );
  }

  const maxAbsTotal = Math.max(...weeks.map((w: any) => Math.abs(w.totalNet ?? 0)), 1);

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[80px_72px_72px_72px_68px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Week Ending</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Total Net ($B)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Treasury Net</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Corp Net</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Total</span>
      </div>

      {/* 12-week rows */}
      {weeks.slice(0, 12).map((week: any, i: number) => (
        <div
          key={week.weekEnding ?? i}
          className="grid grid-cols-[80px_72px_72px_72px_68px] gap-0 px-2 py-[3px] border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>
            {week.weekEnding}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${netColor(week.totalNet ?? 0)}`}>
            {fmtB(week.totalNet ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${netColor(week.treasuryNet ?? 0)}`}>
            {fmtB(week.treasuryNet ?? 0)}
          </span>
          <span className={`text-[8px] font-mono text-right ${netColor(week.corpNet ?? 0)}`}>
            {fmtB(week.corpNet ?? 0)}
          </span>
          <div className="flex justify-end pr-1">
            <NetBar value={week.totalNet ?? 0} maxAbs={maxAbsTotal} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Financing Tab ──

function FinancingTab({ data }: { data: any }) {
  const financing = data?.financing;
  if (!financing) {
    return (
      <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No financing data available
      </div>
    );
  }

  const cards = [
    { label: 'TRI-PARTY REPO', value: financing.triPartyRepo ?? 0 },
    { label: 'BILATERAL REPO', value: financing.bilateralRepo ?? 0 },
    { label: 'REVERSE REPO', value: financing.reverseRepo ?? 0 },
    { label: 'NET FINANCING', value: financing.netFinancing ?? 0 },
    { label: '1W CHG', value: financing.change1w ?? 0, isChange: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-px p-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="px-3 py-2.5 border border-border/10 hover:bg-white/[0.02] transition-colors"
          style={{ backgroundColor: ACCENT_DIM }}
        >
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            {card.label}
          </div>
          <div className={`text-[11px] font-mono font-bold ${card.isChange ? changeColor(card.value) : netColor(card.value)}`}>
            {card.isChange ? fmtChange(card.value) : fmtB(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function PrimaryDealerPanel() {
  const { data, isLoading, refetch } = usePrimaryDealer();
  const [tab, setTab] = useState<Tab>('positions');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: ACCENT }}>
            Primary Dealer Positions
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 transition-colors"
          style={{ ['--tw-text-opacity' as string]: 1 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={(e) => (e.currentTarget.style.color = '')}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'text-[#60a5fa] bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.2)]'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            <SummaryBar data={data} />
            {tab === 'positions' && <PositionsTab data={data} />}
            {tab === 'corporate' && <CorporateTab data={data} />}
            {tab === 'trend' && <TrendTab data={data} />}
            {tab === 'financing' && <FinancingTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
