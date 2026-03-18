import { useEtfFlowMonitor } from '../../api/hooks/use-etf-flow-monitor';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Formatting ──

function fmtAum(n: number): string {
  if (Math.abs(n) >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtFlow(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
  return sign + '$' + abs.toFixed(0);
}

// ── Color helpers ──

const GREEN = '#4ade80';
const RED = '#f87171';
const DIM = 'rgba(255,255,255,0.3)';

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return DIM;
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.02]">
      <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
        {title}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

// ── Top Flows Table ──

function TopFlowsTable({ data }: { data: any }) {
  const items = (data?.topFlows ?? []).slice(0, 10);

  return (
    <div>
      <SectionHeader title="TOP FLOWS" />
      {/* Column headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="flex-1 min-w-0">NAME</span>
        <span className="w-16 text-right shrink-0">AUM</span>
        <span className="w-16 text-right shrink-0">1D FLOW</span>
        <span className="w-16 text-right shrink-0">1W FLOW</span>
        <span className="w-16 text-right shrink-0">1M FLOW</span>
      </div>
      {items.map((item: any, i: number) => (
        <div
          key={item.ticker ?? i}
          className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-pink-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-pink-400">
            {item.ticker}
          </span>
          <span className="flex-1 min-w-0 text-[8px] font-mono text-white/30 truncate pr-2">
            {item.name}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono text-white/50">
            {fmtAum(item.aum ?? 0)}
          </span>
          <span
            className="w-16 text-right shrink-0 text-[9px] font-mono font-bold"
            style={{ color: flowColor(item.dailyFlow ?? 0) }}
          >
            {fmtFlow(item.dailyFlow ?? 0)}
          </span>
          <span
            className="w-16 text-right shrink-0 text-[8px] font-mono"
            style={{ color: flowColor(item.weeklyFlow ?? 0) }}
          >
            {fmtFlow(item.weeklyFlow ?? 0)}
          </span>
          <span
            className="w-16 text-right shrink-0 text-[8px] font-mono"
            style={{ color: flowColor(item.monthlyFlow ?? 0) }}
          >
            {fmtFlow(item.monthlyFlow ?? 0)}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-4 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO FLOW DATA
        </div>
      )}
    </div>
  );
}

// ── Category Summary ──

function CategorySummary({ data }: { data: any }) {
  const categories = (data?.categories ?? []).slice(0, 8);

  return (
    <div>
      <SectionHeader title="CATEGORY SUMMARY" />
      {/* Column headers */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="flex-1 min-w-0">CATEGORY</span>
        <span className="w-20 text-right shrink-0">FLOWS</span>
        <span className="w-16 text-right shrink-0">AUM</span>
      </div>
      {categories.map((cat: any, i: number) => (
        <div
          key={cat.name ?? i}
          className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-pink-400/[0.02] transition-colors"
        >
          <span className="flex-1 min-w-0 text-[8px] font-mono font-bold text-white/60 truncate">
            {cat.name}
          </span>
          <span
            className="w-20 text-right shrink-0 text-[9px] font-mono font-bold"
            style={{ color: flowColor(cat.dailyFlow ?? 0) }}
          >
            {fmtFlow(cat.dailyFlow ?? 0)}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono text-white/40">
            {fmtAum(cat.aum ?? 0)}
          </span>
        </div>
      ))}
      {categories.length === 0 && (
        <div className="text-center py-4 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO CATEGORY DATA
        </div>
      )}
    </div>
  );
}

// ── Largest Inflows / Outflows Today ──

function LargestMovers({ data }: { data: any }) {
  const inflows = (data?.inflows ?? []).slice(0, 5);
  const outflows = (data?.outflows ?? []).slice(0, 5);

  return (
    <div className="grid grid-cols-2 divide-x divide-border/20">
      {/* Inflows */}
      <div>
        <SectionHeader title="LARGEST INFLOWS TODAY" />
        {inflows.map((item: any, i: number) => (
          <div
            key={item.ticker ?? i}
            className="flex items-center justify-between px-2 py-1 border-b border-border/20 hover:bg-pink-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-mono font-bold text-pink-400 shrink-0">
                {item.ticker}
              </span>
              <span className="text-[7px] font-mono text-white/25 truncate">
                {item.name}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold shrink-0 ml-1" style={{ color: GREEN }}>
              {fmtFlow(item.dailyFlow ?? 0)}
            </span>
          </div>
        ))}
        {inflows.length === 0 && (
          <div className="text-center py-3 text-[8px] font-mono text-white/15 uppercase">
            NO DATA
          </div>
        )}
      </div>

      {/* Outflows */}
      <div>
        <SectionHeader title="LARGEST OUTFLOWS TODAY" />
        {outflows.map((item: any, i: number) => (
          <div
            key={item.ticker ?? i}
            className="flex items-center justify-between px-2 py-1 border-b border-border/20 hover:bg-pink-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] font-mono font-bold text-pink-400 shrink-0">
                {item.ticker}
              </span>
              <span className="text-[7px] font-mono text-white/25 truncate">
                {item.name}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold shrink-0 ml-1" style={{ color: RED }}>
              {fmtFlow(item.dailyFlow ?? 0)}
            </span>
          </div>
        ))}
        {outflows.length === 0 && (
          <div className="text-center py-3 text-[8px] font-mono text-white/15 uppercase">
            NO DATA
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function EtfFlowMonitorPanel() {
  const t = useT();
  const { data, isLoading } = useEtfFlowMonitor();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="shrink-0 border-b border-border/20">
        <div className="h-[2px] bg-pink-400" />
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
            {tr(t, 'etfFlowMonitor', 'ETF FLOW MONITOR')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
              Loading...
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            <TopFlowsTable data={data} />
            <CategorySummary data={data} />
            <LargestMovers data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
