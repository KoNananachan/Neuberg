import { useWarrantConvertible } from '../../api/hooks/use-warrant-convertible';
import { useT, tr, TFn } from '../../i18n';

// i18n helper with fallback
// ── Formatting ──

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtNum(n: number, dp = 2): string {
  return n.toFixed(dp);
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// ── Color helpers ──

function richCheapColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function richCheapLabel(val: number): string {
  if (val > 0) return 'RICH';
  if (val < 0) return 'CHEAP';
  return 'FAIR';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-[#050505]">
      <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-fuchsia-400/60">
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

// ── Z-Score Bar ──

function ZScoreBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs * 100, 100) : 0;
  const color = value >= 0 ? '#4ade80' : '#f87171';
  const isPositive = value >= 0;

  return (
    <div className="flex items-center gap-1">
      <div className="w-20 h-1.5 bg-white/[0.03] relative overflow-hidden">
        <div
          className="absolute top-0 h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.6,
            left: isPositive ? 0 : undefined,
            right: !isPositive ? 0 : undefined,
          }}
        />
      </div>
      <span className="text-[7px] font-mono" style={{ color }}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

// ── 1. Convertible Bonds Table ──

function ConvertibleBondsTable({ items }: { items: any[] }) {
  if (!items?.length) return null;

  return (
    <div>
      <SectionHeader label="Convertible Bonds" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Issuer" />
              <Th label="Coupon" right />
              <Th label="Maturity" />
              <Th label="Conv Prem%" right />
              <Th label="Theo Price" right />
              <Th label="Mkt Price" right />
              <Th label="Rich/Cheap" right />
              <Th label="Impl Vol" right />
              <Th label="Delta" right />
              <Th label="Gamma" right />
              <Th label="Cr Spread" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const diff = (row.marketPrice ?? 0) - (row.theoreticalPrice ?? 0);
              const rcColor = richCheapColor(diff);
              const rcLabel = richCheapLabel(diff);

              return (
                <tr key={`cb-${i}`} className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors">
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                    {row.issuer}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtNum(row.coupon ?? 0)}%
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/50">
                    {row.maturity}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtNum(row.conversionPremium ?? 0)}%
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtPrice(row.theoreticalPrice ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                    {fmtPrice(row.marketPrice ?? 0)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${rcColor}`}>
                    {rcLabel} {fmtNum(Math.abs(diff))}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtNum(row.impliedVol ?? 0)}%
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtNum(row.delta ?? 0, 3)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtNum(row.gamma ?? 0, 4)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                    {fmtNum(row.creditSpread ?? 0)}bp
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
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

// ── 2. Warrants Table ──

function WarrantsTable({ items }: { items: any[] }) {
  if (!items?.length) return null;

  return (
    <div>
      <SectionHeader label="Warrants" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Issuer" />
              <Th label="Strike" right />
              <Th label="Expiry" />
              <Th label="Underlying" right />
              <Th label="Intrinsic" right />
              <Th label="Time Val" right />
              <Th label="Impl Vol" right />
              <Th label="Delta" right />
              <Th label="Leverage" right />
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={`w-${i}`} className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                  {row.issuer}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                  {fmtPrice(row.strike ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-white/50">
                  {row.expiry}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                  {fmtPrice(row.underlyingPrice ?? 0)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(row.intrinsicValue ?? 0)}`}>
                  {fmtPrice(row.intrinsicValue ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtPrice(row.timeValue ?? 0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtNum(row.impliedVol ?? 0)}%
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtNum(row.delta ?? 0, 3)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-fuchsia-400">
                  {fmtNum(row.leverage ?? 0, 1)}x
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
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

// ── 3. Market Summary ──

function MarketSummary({ summary }: { summary: any }) {
  if (!summary) return null;

  const stats = [
    { label: 'Total Outstanding', value: fmtCompact(summary.totalOutstanding ?? 0), color: 'text-white' },
    { label: 'Avg Premium', value: fmtNum(summary.avgPremium ?? 0) + '%', color: 'text-white' },
    { label: 'Avg Delta', value: fmtNum(summary.avgDelta ?? 0, 3), color: 'text-white' },
    { label: 'Issuance MTD', value: fmtCompact(summary.issuanceMTD ?? 0), color: 'text-fuchsia-400' },
  ];

  return (
    <div>
      <SectionHeader label="Market Summary" />
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {stats.map((s, i) => (
          <div key={`ms-${i}`} className="bg-black px-2 py-2">
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
              {s.label}
            </div>
            <div className={`text-[11px] font-mono font-black ${s.color}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Greeks Analysis ──

function GreeksAnalysis({ greeks }: { greeks: any }) {
  if (!greeks) return null;

  const items = [
    { label: 'Portfolio Delta', value: greeks.portfolioDelta ?? 0, dp: 3, barMax: 1 },
    { label: 'Portfolio Gamma', value: greeks.portfolioGamma ?? 0, dp: 4, barMax: 0.1 },
    { label: 'Portfolio Vega', value: greeks.portfolioVega ?? 0, dp: 2, barMax: 100 },
    { label: 'Portfolio Theta', value: greeks.portfolioTheta ?? 0, dp: 2, barMax: 50 },
    { label: 'Portfolio Rho', value: greeks.portfolioRho ?? 0, dp: 3, barMax: 10 },
  ];

  return (
    <div>
      <SectionHeader label="Aggregate Greeks" />
      <div className="px-2 py-2 space-y-2">
        {items.map((item, i) => {
          const pct = item.barMax > 0 ? Math.min(Math.abs(item.value) / item.barMax * 100, 100) : 0;
          const color = item.value >= 0 ? '#4ade80' : '#f87171';

          return (
            <div key={`g-${i}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color }}>
                  {item.value >= 0 ? '+' : ''}{fmtNum(item.value, item.dp)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Rich/Cheap Analysis ──

function RichCheapAnalysis({ rich, cheap }: { rich: any[]; cheap: any[] }) {
  if (!rich?.length && !cheap?.length) return null;

  const allScores = [...(rich ?? []), ...(cheap ?? [])].map((r: any) => Math.abs(r.zScore ?? 0));
  const maxAbs = Math.max(...allScores, 1);

  return (
    <div>
      <SectionHeader label="Rich / Cheap Analysis" />
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Rich (overvalued) */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-green-400/60">
              Top 5 Rich
            </span>
          </div>
          <div className="px-2 py-1 space-y-1.5">
            {(rich ?? []).slice(0, 5).map((item: any, i: number) => (
              <div key={`rich-${i}`} className="hover:bg-fuchsia-400/[0.02] transition-colors px-0.5 py-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-mono font-bold text-green-400">
                    {item.issuer}
                  </span>
                  <span className="text-[7px] font-mono text-white/40">
                    {fmtPct(item.premium ?? 0)}
                  </span>
                </div>
                <ZScoreBar value={item.zScore ?? 0} maxAbs={maxAbs} />
              </div>
            ))}
            {(!rich || rich.length === 0) && (
              <div className="text-center py-2 text-white/20 text-[7px] font-mono uppercase">
                No data
              </div>
            )}
          </div>
        </div>

        {/* Cheap (undervalued) */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/10">
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-red-400/60">
              Top 5 Cheap
            </span>
          </div>
          <div className="px-2 py-1 space-y-1.5">
            {(cheap ?? []).slice(0, 5).map((item: any, i: number) => (
              <div key={`cheap-${i}`} className="hover:bg-fuchsia-400/[0.02] transition-colors px-0.5 py-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-mono font-bold text-red-400">
                    {item.issuer}
                  </span>
                  <span className="text-[7px] font-mono text-white/40">
                    {fmtPct(item.premium ?? 0)}
                  </span>
                </div>
                <ZScoreBar value={item.zScore ?? 0} maxAbs={maxAbs} />
              </div>
            ))}
            {(!cheap || cheap.length === 0) && (
              <div className="text-center py-2 text-white/20 text-[7px] font-mono uppercase">
                No data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function WarrantConvertiblePanel() {
  const t = useT();
  const { data, isLoading, error } = useWarrantConvertible();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'warrantConvertibleTitle', 'Warrant & Convertible Monitor')}
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
              <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin" />
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
            {/* 1. Convertible Bonds */}
            <ConvertibleBondsTable items={d.convertibleBonds ?? []} />

            {/* 2. Warrants */}
            <WarrantsTable items={d.warrants ?? []} />

            {/* 3. Market Summary */}
            <MarketSummary summary={d.marketSummary} />

            {/* 4. Greeks Analysis */}
            <GreeksAnalysis greeks={d.greeksAnalysis} />

            {/* 5. Rich/Cheap Analysis */}
            <RichCheapAnalysis
              rich={d.richCheap?.rich ?? []}
              cheap={d.richCheap?.cheap ?? []}
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
