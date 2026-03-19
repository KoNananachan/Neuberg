import { useFundFlow } from '../../api/hooks/use-fund-flow';

// ── Formatting ──

function fmtB(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}T`;
  return `${sign}$${abs.toFixed(1)}B`;
}

function fmtBPlain(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}T`;
  return `$${abs.toFixed(1)}B`;
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPctPlain(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtExpenseRatio(n: number): string {
  return n.toFixed(2) + '%';
}

// ── Color helpers ──

function flowCls(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/30';
}

function flowColor(n: number): string {
  if (n > 0) return '#4ade80';
  if (n < 0) return '#f87171';
  return 'rgba(255,255,255,0.3)';
}

function streakText(n: number): string {
  if (n > 0) return `+${n}W`;
  if (n < 0) return `${n}W`;
  return '0W';
}

function streakCls(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/30';
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-[#050505]">
      <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-blue-400/60">
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

// ── Horizontal Bar ──

function HBar({ value, maxAbs, label }: { value: number; maxAbs: number; label?: string }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[7px] font-mono text-white/40 w-14 shrink-0 truncate">
          {label}
        </span>
      )}
      <div className="flex-1 h-[6px] bg-white/[0.03] relative overflow-hidden">
        {isPositive ? (
          <div
            className="absolute top-0 left-0 h-full bg-green-400/50"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div
            className="absolute top-0 right-0 h-full bg-red-400/50"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className={`text-[7px] font-mono font-bold w-12 shrink-0 text-right ${flowCls(value)}`}>
        {fmtB(value)}
      </span>
    </div>
  );
}

// ── 1. Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const riskColor =
    summary.riskAppetite === 'risk-on'
      ? 'text-green-400 bg-green-400/10'
      : summary.riskAppetite === 'risk-off'
        ? 'text-red-400 bg-red-400/10'
        : 'text-yellow-400 bg-yellow-400/10';

  const items = [
    { label: 'EQUITY FLOW 1W', value: fmtB(summary.equityFlow1W ?? 0), cls: flowCls(summary.equityFlow1W ?? 0) },
    { label: 'BOND FLOW 1W', value: fmtB(summary.bondFlow1W ?? 0), cls: flowCls(summary.bondFlow1W ?? 0) },
    { label: 'EQ/BOND RATIO', value: (summary.equityBondRatio ?? 0).toFixed(2) + 'x', cls: 'text-blue-400' },
    {
      label: 'RISK APPETITE',
      value: (summary.riskAppetite ?? 'NEUTRAL').toUpperCase(),
      cls: riskColor,
      badge: true,
    },
    { label: 'BIGGEST INFLOW', value: summary.biggestInflow ?? '-', cls: 'text-green-400' },
    { label: 'BIGGEST OUTFLOW', value: summary.biggestOutflow ?? '-', cls: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-6 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-0.5">
            {item.label}
          </div>
          {item.badge ? (
            <span className={`text-[8px] font-mono font-black px-1 py-0.5 ${item.cls}`}>
              {item.value}
            </span>
          ) : (
            <div className={`text-[9px] font-mono font-bold ${item.cls}`}>
              {item.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 2. Money Market ──

function MoneyMarketSection({ data }: { data: any }) {
  const mm = data?.moneyMarket;
  if (!mm) return null;

  const items = [
    { label: 'TOTAL AUM', value: fmtBPlain(mm.totalAum ?? 0), cls: 'text-blue-400' },
    { label: 'FLOW 1W', value: fmtB(mm.flow1W ?? 0), cls: flowCls(mm.flow1W ?? 0) },
    { label: 'FLOW 1M', value: fmtB(mm.flow1M ?? 0), cls: flowCls(mm.flow1M ?? 0) },
    { label: 'GOV/PRIME', value: `${fmtPctPlain(mm.govPct ?? 0)} / ${fmtPctPlain(mm.primePct ?? 0)}`, cls: 'text-white/50' },
    { label: 'YIELD', value: fmtPctPlain(mm.yield ?? 0), cls: 'text-blue-400' },
  ];

  return (
    <div>
      <SectionHeader label="Money Market" />
      <div className="grid grid-cols-5 border-b border-border/20">
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
    </div>
  );
}

// ── 3a. Equity Flows Table ──

function EquityFlowsTable({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Equity Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Region" />
              <Th label="1W" right />
              <Th label="1M" right />
              <Th label="YTD" right />
              <Th label="Cumul. YTD" right />
              <Th label="Streak" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={`eq-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.region}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1W ?? 0) }}>
                  {fmtB(row.flow1W ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1M ?? 0) }}>
                  {fmtB(row.flow1M ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flowYtd ?? 0) }}>
                  {fmtB(row.flowYtd ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtBPlain(row.cumulativeYtd ?? 0)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${streakCls(row.streak ?? 0)}`}>
                  {streakText(row.streak ?? 0)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
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

// ── 3b. Bond Flows Table ──

function BondFlowsTable({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Bond Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Category" />
              <Th label="1W" right />
              <Th label="1M" right />
              <Th label="YTD" right />
              <Th label="Cumul. YTD" right />
              <Th label="Streak" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={`bd-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.category}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1W ?? 0) }}>
                  {fmtB(row.flow1W ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1M ?? 0) }}>
                  {fmtB(row.flow1M ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flowYtd ?? 0) }}>
                  {fmtB(row.flowYtd ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtBPlain(row.cumulativeYtd ?? 0)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${streakCls(row.streak ?? 0)}`}>
                  {streakText(row.streak ?? 0)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
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

// ── 3c. Alternative Flows ──

function AlternativeFlows({ items }: { items: any[] }) {
  return (
    <div>
      <SectionHeader label="Alternative Flows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Asset" />
              <Th label="1W" right />
              <Th label="1M" right />
              <Th label="YTD" right />
              <Th label="Cumul. YTD" right />
              <Th label="Streak" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={`alt-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.asset}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1W ?? 0) }}>
                  {fmtB(row.flow1W ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flow1M ?? 0) }}>
                  {fmtB(row.flow1M ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.flowYtd ?? 0) }}>
                  {fmtB(row.flowYtd ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtBPlain(row.cumulativeYtd ?? 0)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${streakCls(row.streak ?? 0)}`}>
                  {streakText(row.streak ?? 0)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
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

// ── 3d. Top Fund Inflows ──

function TopFundInflows({ items }: { items: any[] }) {
  const rows = (items ?? []).slice(0, 15);

  return (
    <div>
      <SectionHeader label="Top Fund Inflows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Fund Name" />
              <Th label="Ticker" />
              <Th label="Category" />
              <Th label="AUM" right />
              <Th label="1W" right />
              <Th label="1M" right />
              <Th label="YTD" right />
              <Th label="Exp." right />
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={`ti-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-white/50 truncate max-w-[120px]">
                  {row.name}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.ticker}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-white/30 text-[7px] truncate max-w-[80px]">
                  {row.category}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtBPlain(row.aum ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-green-400">
                  {fmtB(row.flow1W ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-green-400">
                  {fmtB(row.flow1M ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-green-400">
                  {fmtB(row.flowYtd ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/30">
                  {fmtExpenseRatio(row.expenseRatio ?? 0)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
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

// ── 3e. Top Fund Outflows ──

function TopFundOutflows({ items }: { items: any[] }) {
  const rows = (items ?? []).slice(0, 15);

  return (
    <div>
      <SectionHeader label="Top Fund Outflows" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Fund Name" />
              <Th label="Ticker" />
              <Th label="Category" />
              <Th label="AUM" right />
              <Th label="1W" right />
              <Th label="1M" right />
              <Th label="YTD" right />
              <Th label="Exp." right />
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={`to-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-white/50 truncate max-w-[120px]">
                  {row.name}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.ticker}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-white/30 text-[7px] truncate max-w-[80px]">
                  {row.category}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtBPlain(row.aum ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-red-400">
                  {fmtB(row.flow1W ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-red-400">
                  {fmtB(row.flow1M ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-red-400">
                  {fmtB(row.flowYtd ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/30">
                  {fmtExpenseRatio(row.expenseRatio ?? 0)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
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

// ── 3f. Retail vs Institutional ──

function RetailVsInstitutional({ data }: { data: any }) {
  const rv = data?.retailVsInstitutional;
  if (!rv) return null;

  const sentimentColor =
    rv.retailSentiment === 'bullish'
      ? 'text-green-400 bg-green-400/10'
      : rv.retailSentiment === 'bearish'
        ? 'text-red-400 bg-red-400/10'
        : 'text-yellow-400 bg-yellow-400/10';

  const rows = [
    { label: 'Retail Equity', value: rv.retailEquityFlow ?? 0 },
    { label: 'Retail Bond', value: rv.retailBondFlow ?? 0 },
    { label: 'Institutional Equity', value: rv.institutionalEquityFlow ?? 0 },
    { label: 'Institutional Bond', value: rv.institutionalBondFlow ?? 0 },
  ];

  return (
    <div>
      <SectionHeader label="Retail vs Institutional" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Segment" />
              <Th label="Flow 1W" right />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`rv-${i}`} className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-blue-400">
                  {row.label}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold" style={{ color: flowColor(row.value) }}>
                  {fmtB(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 px-2 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">SENTIMENT</span>
          <span className={`text-[7px] font-mono font-black px-1 py-0.5 ${sentimentColor}`}>
            {(rv.retailSentiment ?? 'NEUTRAL').toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-white/25 uppercase tracking-wider">AAII BULL%</span>
          <span className="text-[8px] font-mono font-bold text-blue-400">
            {fmtPctPlain(rv.aaiiBullPct ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 3g. Leveraged Positioning ──

function LeveragedPositioning({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  const maxAbs = Math.max(...items.map((r: any) => Math.abs(r.netPositioning ?? 0)), 1);

  return (
    <div>
      <SectionHeader label="Leveraged Positioning" />
      <div className="px-2 py-1.5 space-y-1.5">
        {items.map((row: any, i: number) => (
          <HBar
            key={`lp-${i}`}
            value={row.netPositioning ?? 0}
            maxAbs={maxAbs}
            label={row.instrument}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function FundFlowPanel() {
  const { data, isLoading, error } = useFundFlow();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="shrink-0 border-b border-border/20">
        <div className="h-[2px] bg-blue-400" />
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400" />
            <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
              FUND FLOW ANALYTICS
            </span>
          </div>
          {d?.timestamp && (
            <span className="text-[6px] text-white/20 font-mono">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                LOADING...
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
            {/* 1. Summary Bar */}
            <SummaryBar data={d} />

            {/* 2. Money Market */}
            <MoneyMarketSection data={d} />

            {/* 3a. Equity Flows */}
            <EquityFlowsTable items={d.equityFlows ?? []} />

            {/* 3b. Bond Flows */}
            <BondFlowsTable items={d.bondFlows ?? []} />

            {/* 3c. Alternative Flows */}
            <AlternativeFlows items={d.alternativeFlows ?? []} />

            {/* 3d. Top Fund Inflows */}
            <TopFundInflows items={d.topInflows ?? []} />

            {/* 3e. Top Fund Outflows */}
            <TopFundOutflows items={d.topOutflows ?? []} />

            {/* 3f. Retail vs Institutional */}
            <RetailVsInstitutional data={d} />

            {/* 3g. Leveraged Positioning */}
            <LeveragedPositioning items={d.leveragedPositioning ?? []} />

            {/* Footer */}
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
