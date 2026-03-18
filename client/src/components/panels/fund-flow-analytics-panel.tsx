import { useFundFlowAnalytics } from '../../api/hooks/use-fund-flow-analytics';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const GREEN = '#4ade80';
const GREEN_DIM = 'rgba(74,222,128,0.08)';
const RED = '#f87171';
const RED_DIM = 'rgba(248,113,113,0.08)';
const YELLOW = '#fbbf24';

// ── Formatting ──

function fmtB(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPctPlain(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function momentumBadge(m: string): { text: string; color: string; bg: string } {
  switch (m) {
    case 'accelerating':
      return { text: 'ACCELERATING', color: GREEN, bg: 'rgba(74,222,128,0.15)' };
    case 'decelerating':
      return { text: 'DECELERATING', color: YELLOW, bg: 'rgba(251,191,36,0.15)' };
    case 'reversing':
      return { text: 'REVERSING', color: RED, bg: 'rgba(248,113,113,0.15)' };
    default:
      return { text: m?.toUpperCase?.() ?? 'STABLE', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' };
  }
}

function implicationBadge(imp: string): { text: string; color: string; bg: string } {
  switch (imp) {
    case 'bullish':
      return { text: 'BULLISH', color: GREEN, bg: 'rgba(74,222,128,0.15)' };
    case 'bearish':
      return { text: 'BEARISH', color: RED, bg: 'rgba(248,113,113,0.15)' };
    case 'neutral':
    default:
      return { text: 'NEUTRAL', color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
  }
}

function streakDisplay(n: number): { text: string; color: string } {
  if (n > 0) return { text: `${n}W IN`, color: GREEN };
  if (n < 0) return { text: `${Math.abs(n)}W OUT`, color: RED };
  return { text: '0W', color: 'rgba(255,255,255,0.3)' };
}

// ── Flow bar ──

function FlowBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const color = value >= 0 ? GREEN : RED;

  return (
    <div className="w-16 h-1.5 bg-white/[0.03] relative overflow-hidden">
      <div
        className="absolute top-0 h-full"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          opacity: 0.5,
          left: value >= 0 ? 0 : undefined,
          right: value < 0 ? 0 : undefined,
        }}
      />
    </div>
  );
}

// ── Percentile Gauge ──

function PercentileGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 75 ? RED : pct > 50 ? YELLOW : GREEN;

  return (
    <div className="flex items-center gap-1">
      <div className="w-14 h-1.5 bg-white/[0.04] relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.6 }}
        />
      </div>
      <span className="text-[7px] font-mono text-white/40">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-[#050505]">
      <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-green-400/60">
        {label}
      </span>
    </div>
  );
}

// ── Table Header Cell ──

function Th({ label, right }: { label: string; right?: boolean }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-white/25 whitespace-nowrap ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── 1. Asset Class Flows ──

function AssetClassFlows({ items }: { items: any[] }) {
  const maxAbs = Math.max(...items.map((r: any) => Math.abs(r.weeklyFlow ?? 0)), 1);

  return (
    <div>
      <SectionHeader label="Asset Class Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Asset Class" />
              <Th label="Weekly" right />
              <Th label="Bar" />
              <Th label="Monthly" right />
              <Th label="YTD" right />
              <Th label="AUM ($B)" right />
              <Th label="% AUM" right />
              <Th label="Streak" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const sk = streakDisplay(row.streak ?? 0);
              return (
                <tr key={`ac-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-green-400">
                    {row.assetClass}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.weeklyFlow) }}>
                    {fmtB(row.weeklyFlow)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <FlowBar value={row.weeklyFlow} maxAbs={maxAbs} />
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.monthlyFlow) }}>
                    {fmtB(row.monthlyFlow)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.ytdFlow) }}>
                    {fmtB(row.ytdFlow)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                    {(row.aum ?? 0).toFixed(1)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right" style={{ color: flowColor(row.flowPctAum ?? 0) }}>
                    {fmtPct(row.flowPctAum ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: sk.color }}>
                    {sk.text}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 2. Regional Flows ──

function RegionalFlows({ items }: { items: any[] }) {
  const globalTotal = items.reduce((s: number, r: any) => s + Math.abs(r.weeklyFlow ?? 0), 0) || 1;

  return (
    <div>
      <SectionHeader label="Regional Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Region" />
              <Th label="Weekly" right />
              <Th label="Monthly" right />
              <Th label="% Global" right />
              <Th label="Direction" />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const weekly = row.weeklyFlow ?? 0;
              const monthly = row.monthlyFlow ?? 0;
              const pctGlobal = (Math.abs(weekly) / globalTotal) * 100;
              const dirColor = weekly > 0 ? GREEN : weekly < 0 ? RED : 'rgba(255,255,255,0.3)';
              const dirBg = weekly > 0 ? GREEN_DIM : weekly < 0 ? RED_DIM : 'rgba(255,255,255,0.03)';
              const dirText = weekly > 0 ? 'INFLOW' : weekly < 0 ? 'OUTFLOW' : 'FLAT';

              return (
                <tr key={`rg-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-green-400">
                    {row.region}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(weekly) }}>
                    {fmtB(weekly)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(monthly) }}>
                    {fmtB(monthly)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/40">
                    {fmtPctPlain(pctGlobal)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: dirColor, backgroundColor: dirBg }}
                    >
                      {dirText}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 3. Sector Flows ──

function SectorFlows({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Sector Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Sector" />
              <Th label="Weekly" right />
              <Th label="Monthly" right />
              <Th label="Momentum" />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const mb = momentumBadge(row.momentum ?? 'stable');
              return (
                <tr key={`sec-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-green-400">
                    {row.sector}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.weeklyFlow ?? 0) }}>
                    {fmtB(row.weeklyFlow ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.monthlyFlow ?? 0) }}>
                    {fmtB(row.monthlyFlow ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: mb.color, backgroundColor: mb.bg }}
                    >
                      {mb.text}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. Strategy Flows ──

function StrategyFlows({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Strategy Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Strategy" />
              <Th label="Weekly" right />
              <Th label="Monthly" right />
              <Th label="Mkt Share" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={`st-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-green-400">
                  {row.strategy}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.weeklyFlow ?? 0) }}>
                  {fmtB(row.weeklyFlow ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.monthlyFlow ?? 0) }}>
                  {fmtB(row.monthlyFlow ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtPctPlain(row.marketShare ?? 0)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 5. Contrarian Signals ──

function ContrarianSignals({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Contrarian Signals" />
      <div className="grid grid-cols-1 gap-0">
        {items.map((sig: any, i: number) => {
          const imp = implicationBadge(sig.implication ?? 'neutral');
          return (
            <div
              key={`cs-${i}`}
              className="px-2 py-1.5 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono font-bold text-green-400 uppercase">
                  {sig.signal}
                </span>
                <span
                  className="text-[7px] font-bold px-1 py-0.5"
                  style={{ color: imp.color, backgroundColor: imp.bg }}
                >
                  {imp.text}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-white/25 uppercase">Reading:</span>
                  <span className="text-[8px] font-mono font-bold text-white/70">
                    {typeof sig.reading === 'number' ? sig.reading.toFixed(1) : sig.reading}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-white/25 uppercase">Percentile:</span>
                  <PercentileGauge value={sig.percentile ?? 50} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] font-mono text-white/25 uppercase">Hit Rate:</span>
                  <span className="text-[8px] font-mono font-bold text-white/50">
                    {fmtPctPlain(sig.hitRate ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
            No signals
          </div>
        )}
      </div>
    </div>
  );
}

// ── 6. Top Funds ──

function TopFunds({ inflows, outflows }: { inflows: any[]; outflows: any[] }) {
  return (
    <div>
      <SectionHeader label="Top Funds" />
      <div className="grid grid-cols-2 divide-x divide-border/20">
        {/* Top Inflows */}
        <div>
          <div className="px-2 py-0.5 border-b border-border/10">
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-green-400/50">
              Top Inflows
            </span>
          </div>
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-b border-border/20">
                <Th label="Name" />
                <Th label="Ticker" />
                <Th label="Flow" right />
                <Th label="AUM" right />
              </tr>
            </thead>
            <tbody>
              {(inflows ?? []).slice(0, 5).map((f: any, i: number) => (
                <tr key={`in-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/60 truncate max-w-[80px]">
                    {f.name}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-green-400">
                    {f.ticker}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: GREEN }}>
                    {fmtB(f.flow ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/40">
                    {(f.aum ?? 0).toFixed(1)}B
                  </td>
                </tr>
              ))}
              {(!inflows || inflows.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-3 text-white/20 text-[7px] font-mono uppercase">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Outflows */}
        <div>
          <div className="px-2 py-0.5 border-b border-border/10">
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-red-400/50">
              Top Outflows
            </span>
          </div>
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-b border-border/20">
                <Th label="Name" />
                <Th label="Ticker" />
                <Th label="Flow" right />
                <Th label="AUM" right />
              </tr>
            </thead>
            <tbody>
              {(outflows ?? []).slice(0, 5).map((f: any, i: number) => (
                <tr key={`out-${i}`} className="border-b border-border/10 hover:bg-green-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/60 truncate max-w-[80px]">
                    {f.name}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-red-400">
                    {f.ticker}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: RED }}>
                    {fmtB(f.flow ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/40">
                    {(f.aum ?? 0).toFixed(1)}B
                  </td>
                </tr>
              ))}
              {(!outflows || outflows.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-3 text-white/20 text-[7px] font-mono uppercase">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function FundFlowAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, error } = useFundFlowAnalytics();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-400">
            {tr(t, 'fundFlowAnalyticsTitle', 'Fund Flow Analytics')}
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[6px] text-white/20 font-mono">
            {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {error && !d && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-red-400/60 uppercase tracking-widest font-bold">
              FAILED TO LOAD
            </span>
          </div>
        )}

        {d && (
          <>
            {/* 1. Asset Class Flows */}
            <AssetClassFlows items={d.assetClassFlows ?? []} />

            {/* 2. Regional Flows */}
            <RegionalFlows items={d.regionalFlows ?? []} />

            {/* 3. Sector Flows */}
            <SectorFlows items={d.sectorFlows ?? []} />

            {/* 4. Strategy Flows */}
            <StrategyFlows items={d.strategyFlows ?? []} />

            {/* 5. Contrarian Signals */}
            <ContrarianSignals items={d.contrarianSignals ?? []} />

            {/* 6. Top Funds */}
            <TopFunds
              inflows={d.topInflows ?? []}
              outflows={d.topOutflows ?? []}
            />

            {/* Footer Timestamp */}
            <div className="px-3 py-1 border-t border-border/10">
              <span className="text-[7px] font-mono text-white/15">
                Last update: {new Date(d.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
