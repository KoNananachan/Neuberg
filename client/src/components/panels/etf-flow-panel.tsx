import { useState } from 'react';
import { useEtfFlow } from '../../api/hooks/use-etf-flow';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface EtfFlowEntry {
  ticker: string;
  name: string;
  category: string;
  aum: number;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  flowYtd: number;
  price: number;
  changePct: number;
}

interface CategoryFlow {
  category: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  flowYtd: number;
  totalAum: number;
  etfCount: number;
}

interface SectorFlow {
  sector: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  netAssets: number;
}

interface CreationRedemption {
  ticker: string;
  shares: number;
  value: number;
}

interface EtfFlowSummary {
  totalAssets: number;
  dailyFlow: number;
  weeklyFlow: number;
  monthlyFlow: number;
  activeEtfCount: number;
  newLaunches: number;
}

type Tab = 'inflows' | 'outflows' | 'category' | 'sector' | 'crrd';

const TABS: { key: Tab; label: string }[] = [
  { key: 'inflows', label: 'TOP INFLOWS' },
  { key: 'outflows', label: 'TOP OUTFLOWS' },
  { key: 'category', label: 'CATEGORY' },
  { key: 'sector', label: 'SECTOR' },
  { key: 'crrd', label: 'CR / RD' },
];

// ── Formatting ──

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtDollar(n: number): string {
  return '$' + fmtNum(Math.abs(n));
}

function fmtFlow(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return sign + '$' + fmtNum(Math.abs(n));
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return sign + Math.abs(n).toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  return '$' + n.toFixed(2);
}

function fmtShares(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Color helpers ──

function flowCls(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-500';
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: Record<string, unknown> }) {
  const s = data?.summary as EtfFlowSummary | undefined;
  if (!s) return null;

  const items = [
    { label: 'TOTAL ETF ASSETS', value: fmtDollar(s.totalAssets), cls: 'text-sky-400' },
    { label: 'DAILY FLOW', value: fmtFlow(s.dailyFlow), cls: flowCls(s.dailyFlow) },
    { label: 'WEEKLY FLOW', value: fmtFlow(s.weeklyFlow), cls: flowCls(s.weeklyFlow) },
    { label: 'MONTHLY FLOW', value: fmtFlow(s.monthlyFlow), cls: flowCls(s.monthlyFlow) },
    { label: 'ACTIVE ETFS', value: String(s.activeEtfCount ?? 0), cls: 'text-white/70' },
    { label: 'NEW LAUNCHES', value: String(s.newLaunches ?? 0), cls: 'text-sky-400' },
  ];

  return (
    <div className="grid grid-cols-6 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-0.5">
            {item.label}
          </div>
          <div className={`text-[9px] font-mono font-bold ${item.cls}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Top Inflows Table ──

function TopInflowsTable({ data }: { data: Record<string, unknown> }) {
  const rows = ((data?.topInflows ?? []) as EtfFlowEntry[]).slice(0, 15);

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO INFLOW DATA
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <div className="flex items-center py-1 px-2 border-b border-border/20 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="flex-1 min-w-0">NAME</span>
        <span className="w-16 shrink-0 text-right">CATEGORY</span>
        <span className="w-14 shrink-0 text-right">AUM</span>
        <span className="w-14 shrink-0 text-right">1D</span>
        <span className="w-14 shrink-0 text-right">1W</span>
        <span className="w-14 shrink-0 text-right">1M</span>
        <span className="w-14 shrink-0 text-right">YTD</span>
        <span className="w-14 shrink-0 text-right">PRICE</span>
        <span className="w-14 shrink-0 text-right">CHG%</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.ticker ?? i}
          className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-sky-400">
            {row.ticker}
          </span>
          <span className="flex-1 min-w-0 text-[8px] font-mono text-white/30 truncate pr-1">
            {row.name}
          </span>
          <span className="w-16 shrink-0 text-[7px] font-mono text-white/25 text-right truncate">
            {row.category}
          </span>
          <span className="w-14 shrink-0 text-[8px] font-mono text-white/50 text-right">
            {fmtDollar(row.aum)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1d)}`}>
            {fmtFlow(row.flow1d)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1w)}`}>
            {fmtFlow(row.flow1w)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1m)}`}>
            {fmtFlow(row.flow1m)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flowYtd)}`}>
            {fmtFlow(row.flowYtd)}
          </span>
          <span className="w-14 shrink-0 text-[8px] font-mono text-white/50 text-right">
            {fmtPrice(row.price)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.changePct)}`}>
            {fmtPct(row.changePct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Top Outflows Table ──

function TopOutflowsTable({ data }: { data: Record<string, unknown> }) {
  const rows = ((data?.topOutflows ?? []) as EtfFlowEntry[]).slice(0, 15);

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO OUTFLOW DATA
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <div className="flex items-center py-1 px-2 border-b border-border/20 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="flex-1 min-w-0">NAME</span>
        <span className="w-16 shrink-0 text-right">CATEGORY</span>
        <span className="w-14 shrink-0 text-right">AUM</span>
        <span className="w-14 shrink-0 text-right">1D</span>
        <span className="w-14 shrink-0 text-right">1W</span>
        <span className="w-14 shrink-0 text-right">1M</span>
        <span className="w-14 shrink-0 text-right">YTD</span>
        <span className="w-14 shrink-0 text-right">PRICE</span>
        <span className="w-14 shrink-0 text-right">CHG%</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.ticker ?? i}
          className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-sky-400">
            {row.ticker}
          </span>
          <span className="flex-1 min-w-0 text-[8px] font-mono text-white/30 truncate pr-1">
            {row.name}
          </span>
          <span className="w-16 shrink-0 text-[7px] font-mono text-white/25 text-right truncate">
            {row.category}
          </span>
          <span className="w-14 shrink-0 text-[8px] font-mono text-white/50 text-right">
            {fmtDollar(row.aum)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1d)}`}>
            {fmtFlow(row.flow1d)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1w)}`}>
            {fmtFlow(row.flow1w)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1m)}`}>
            {fmtFlow(row.flow1m)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flowYtd)}`}>
            {fmtFlow(row.flowYtd)}
          </span>
          <span className="w-14 shrink-0 text-[8px] font-mono text-white/50 text-right">
            {fmtPrice(row.price)}
          </span>
          <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.changePct)}`}>
            {fmtPct(row.changePct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Category Flows Table ──

function CategoryFlowsTable({ data }: { data: Record<string, unknown> }) {
  const rows = ((data?.categoryFlows ?? []) as CategoryFlow[]).slice(0, 12);

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO CATEGORY DATA
      </div>
    );
  }

  const maxAbsYtd = Math.max(...rows.map((r) => Math.abs(r.flowYtd)), 1);

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <div className="flex items-center py-1 px-2 border-b border-border/20 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span className="w-24 shrink-0">CATEGORY</span>
        <span className="w-14 shrink-0 text-right">1D</span>
        <span className="w-14 shrink-0 text-right">1W</span>
        <span className="w-14 shrink-0 text-right">1M</span>
        <span className="w-14 shrink-0 text-right">YTD</span>
        <span className="w-16 shrink-0 text-right">TOTAL AUM</span>
        <span className="w-10 shrink-0 text-right">ETFS</span>
        <span className="flex-1 min-w-[60px] text-right pr-1">FLOW BAR</span>
      </div>
      {rows.map((row, i) => {
        const barPct = Math.min((Math.abs(row.flowYtd) / maxAbsYtd) * 100, 100);
        return (
          <div
            key={row.category ?? i}
            className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
          >
            <span className="w-24 shrink-0 text-[8px] font-mono font-bold text-sky-400 truncate">
              {row.category}
            </span>
            <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1d)}`}>
              {fmtFlow(row.flow1d)}
            </span>
            <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1w)}`}>
              {fmtFlow(row.flow1w)}
            </span>
            <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1m)}`}>
              {fmtFlow(row.flow1m)}
            </span>
            <span className={`w-14 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flowYtd)}`}>
              {fmtFlow(row.flowYtd)}
            </span>
            <span className="w-16 shrink-0 text-[8px] font-mono text-white/50 text-right">
              {fmtDollar(row.totalAum)}
            </span>
            <span className="w-10 shrink-0 text-[8px] font-mono text-white/30 text-right">
              {row.etfCount}
            </span>
            <div className="flex-1 min-w-[60px] flex items-center justify-end pr-1">
              <div className="w-full h-[6px] bg-white/[0.04] relative">
                <div
                  className={`absolute top-0 h-full ${row.flowYtd >= 0 ? 'bg-green-400/60 left-1/2' : 'bg-red-400/60 right-1/2'}`}
                  style={{ width: `${barPct / 2}%` }}
                />
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/10" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sector Flows Table ──

function SectorFlowsTable({ data }: { data: Record<string, unknown> }) {
  const rows = ((data?.sectorFlows ?? []) as SectorFlow[]).slice(0, 11);

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO SECTOR DATA
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <div className="flex items-center py-1 px-2 border-b border-border/20 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span className="w-28 shrink-0">SECTOR</span>
        <span className="w-16 shrink-0 text-right">1D FLOW</span>
        <span className="w-16 shrink-0 text-right">1W FLOW</span>
        <span className="w-16 shrink-0 text-right">1M FLOW</span>
        <span className="flex-1 text-right pr-1">NET ASSETS</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.sector ?? i}
          className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
        >
          <span className="w-28 shrink-0 text-[8px] font-mono font-bold text-sky-400 truncate">
            {row.sector}
          </span>
          <span className={`w-16 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1d)}`}>
            {fmtFlow(row.flow1d)}
          </span>
          <span className={`w-16 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1w)}`}>
            {fmtFlow(row.flow1w)}
          </span>
          <span className={`w-16 shrink-0 text-[8px] font-mono font-bold text-right ${flowCls(row.flow1m)}`}>
            {fmtFlow(row.flow1m)}
          </span>
          <span className="flex-1 text-[8px] font-mono text-white/50 text-right pr-1">
            {fmtDollar(row.netAssets)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Creations & Redemptions ──

function CreationsRedemptionsTable({ data }: { data: Record<string, unknown> }) {
  const creations = ((data?.creations ?? []) as CreationRedemption[]).slice(0, 8);
  const redemptions = ((data?.redemptions ?? []) as CreationRedemption[]).slice(0, 8);

  if (!creations.length && !redemptions.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
        NO CR/RD DATA
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      <div className="grid grid-cols-2 divide-x divide-border/20 h-full">
        {/* Creations */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-white/[0.02]">
            <div className="w-1 h-1 bg-green-400" />
            <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
              CREATIONS
            </span>
          </div>
          <div className="flex items-center py-0.5 px-2 border-b border-border/15 text-[7px] font-mono text-white/20 uppercase tracking-wider">
            <span className="w-12 shrink-0">TICKER</span>
            <span className="flex-1 text-right">SHARES</span>
            <span className="w-16 shrink-0 text-right">VALUE</span>
          </div>
          {creations.map((row, i) => (
            <div
              key={row.ticker ?? i}
              className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
            >
              <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-sky-400">
                {row.ticker}
              </span>
              <span className="flex-1 text-[8px] font-mono text-green-400 text-right">
                +{fmtShares(row.shares)}
              </span>
              <span className="w-16 shrink-0 text-[8px] font-mono text-green-400 text-right">
                {fmtDollar(row.value)}
              </span>
            </div>
          ))}
          {!creations.length && (
            <div className="py-3 text-center text-[8px] font-mono text-white/15 uppercase">
              NO DATA
            </div>
          )}
        </div>

        {/* Redemptions */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-white/[0.02]">
            <div className="w-1 h-1 bg-red-400" />
            <span className="text-[7px] font-mono font-black text-white/25 uppercase tracking-wider">
              REDEMPTIONS
            </span>
          </div>
          <div className="flex items-center py-0.5 px-2 border-b border-border/15 text-[7px] font-mono text-white/20 uppercase tracking-wider">
            <span className="w-12 shrink-0">TICKER</span>
            <span className="flex-1 text-right">SHARES</span>
            <span className="w-16 shrink-0 text-right">VALUE</span>
          </div>
          {redemptions.map((row, i) => (
            <div
              key={row.ticker ?? i}
              className="flex items-center py-[3px] px-2 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors"
            >
              <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-sky-400">
                {row.ticker}
              </span>
              <span className="flex-1 text-[8px] font-mono text-red-400 text-right">
                -{fmtShares(row.shares)}
              </span>
              <span className="w-16 shrink-0 text-[8px] font-mono text-red-400 text-right">
                {fmtDollar(row.value)}
              </span>
            </div>
          ))}
          {!redemptions.length && (
            <div className="py-3 text-center text-[8px] font-mono text-white/15 uppercase">
              NO DATA
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function EtfFlowPanel() {
  const [tab, setTab] = useState<Tab>('inflows');
  const { data, isLoading, error, refetch } = useEtfFlow();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="shrink-0 border-b border-border/20">
        <div className="h-[2px] bg-sky-400" />
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-sky-400" />
            <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
              ETF FLOW MONITOR
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {data && (
              <span className="text-[6px] text-white/20 font-mono">
                {new Date(
                  (data as Record<string, unknown>).timestamp as string ?? Date.now()
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="p-0.5 text-white/30 hover:text-sky-400 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 bg-black shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              tab === t.key
                ? 'text-sky-400 bg-sky-400/[0.08]'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {data && <SummaryBar data={data as Record<string, unknown>} />}

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
              LOADING...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
            FAILED TO LOAD ETF FLOW DATA
          </span>
          <button
            onClick={() => refetch()}
            className="text-[9px] font-mono border border-white/10 px-2 py-0.5 text-white/40 hover:text-white hover:border-white/20 transition-colors"
          >
            RETRY
          </button>
        </div>
      ) : data ? (
        <>
          {tab === 'inflows' && <TopInflowsTable data={data as Record<string, unknown>} />}
          {tab === 'outflows' && <TopOutflowsTable data={data as Record<string, unknown>} />}
          {tab === 'category' && <CategoryFlowsTable data={data as Record<string, unknown>} />}
          {tab === 'sector' && <SectorFlowsTable data={data as Record<string, unknown>} />}
          {tab === 'crrd' && <CreationsRedemptionsTable data={data as Record<string, unknown>} />}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[9px] text-white/40 uppercase font-mono">
          NO DATA AVAILABLE
        </div>
      )}
    </div>
  );
}
