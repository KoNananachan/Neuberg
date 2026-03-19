import { useState } from 'react';
import { useWarrantPricing } from '../../api/hooks/use-warrant-pricing';
import { useT } from '../../i18n';

// ── Translation helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Format helpers ──

function fmtNum(n: number | undefined | null, dp = 2): string {
  if (n == null) return '--';
  return n.toFixed(dp);
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtChange(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtPrice(n: number | undefined | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

function fmtCompact(n: number | undefined | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

// ── Color helpers ──

function changeColor(n: number | undefined | null): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function moneynessBadge(m: string | undefined | null): { label: string; color: string; bg: string } {
  if (!m) return { label: '--', color: 'text-neutral-500', bg: '' };
  const u = m.toUpperCase();
  if (u === 'ITM') return { label: 'ITM', color: 'text-green-400', bg: 'bg-green-500/10' };
  if (u === 'ATM') return { label: 'ATM', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  if (u === 'OTM') return { label: 'OTM', color: 'text-red-400', bg: 'bg-red-500/10' };
  return { label: m, color: 'text-neutral-400', bg: '' };
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

// ── Tab types ──

type ViewTab = 'warrants' | 'greeks' | 'movers' | 'issuers' | 'analysis';

// ── 1. Warrants Tab ──

function WarrantsTab({ data }: { data: any }) {
  const warrants = data?.warrants ?? [];

  if (!warrants.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No warrant data available
      </div>
    );
  }

  return (
    <div>
      <SectionHeader label="Warrant Pricing" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="ISIN" />
              <Th label="Underlying" />
              <Th label="Type" />
              <Th label="Strike" right />
              <Th label="Expiry" />
              <Th label="Bid" right />
              <Th label="Ask" right />
              <Th label="IV" right />
              <Th label="Delta" right />
              <Th label="Gearing" right />
              <Th label="Moneyness" />
            </tr>
          </thead>
          <tbody>
            {warrants.map((w: any, i: number) => {
              const badge = moneynessBadge(w.moneyness);
              return (
                <tr
                  key={`w-${i}`}
                  className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                    {w.isin ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/70">
                    {w.underlying ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/50 uppercase">
                    {w.type ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                    {fmtPrice(w.strike)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/50">
                    {w.expiry ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtPrice(w.bid)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtPrice(w.ask)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtPct(w.iv)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtNum(w.delta, 3)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-fuchsia-400">
                    {fmtNum(w.gearing, 1)}x
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span
                      className={`inline-block px-1 py-0.5 text-[7px] font-bold uppercase ${badge.color} ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 2. Greeks Tab ──

function GreeksTab({ data }: { data: any }) {
  const warrants = data?.warrants ?? [];

  if (!warrants.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No greeks data available
      </div>
    );
  }

  return (
    <div>
      <SectionHeader label="Greeks Detail" />

      {/* Aggregate summary */}
      {data?.greeksSummary && (
        <div className="grid grid-cols-4 gap-px bg-border/10 mb-px">
          {[
            { label: 'Avg Delta', value: fmtNum(data.greeksSummary.avgDelta, 3) },
            { label: 'Avg Gamma', value: fmtNum(data.greeksSummary.avgGamma, 4) },
            { label: 'Avg Theta', value: fmtNum(data.greeksSummary.avgTheta, 3) },
            { label: 'Avg Vega', value: fmtNum(data.greeksSummary.avgVega, 3) },
          ].map((s, i) => (
            <div key={`gs-${i}`} className="bg-black px-2 py-2">
              <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                {s.label}
              </div>
              <div className="text-[11px] font-mono font-black text-fuchsia-400">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Greeks grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="ISIN" />
              <Th label="Underlying" />
              <Th label="Type" />
              <Th label="Delta" right />
              <Th label="Gamma" right />
              <Th label="Theta" right />
              <Th label="Vega" right />
              <Th label="Rho" right />
              <Th label="IV" right />
            </tr>
          </thead>
          <tbody>
            {warrants.map((w: any, i: number) => (
              <tr
                key={`gk-${i}`}
                className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                  {w.isin ?? '--'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-white/70">
                  {w.underlying ?? '--'}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-white/50 uppercase">
                  {w.type ?? '--'}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(w.delta)}`}>
                  {fmtNum(w.delta, 4)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtNum(w.gamma, 5)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${changeColor(w.theta)}`}>
                  {fmtNum(w.theta, 4)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtNum(w.vega, 4)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                  {fmtNum(w.rho, 4)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                  {fmtPct(w.iv)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 3. Movers Tab ──

function MoversTab({ data }: { data: any }) {
  const priceMovers = data?.movers?.priceMovers ?? [];
  const volumeLeaders = data?.movers?.volumeLeaders ?? [];

  if (!priceMovers.length && !volumeLeaders.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No movers data available
      </div>
    );
  }

  return (
    <div>
      {/* Biggest price changes */}
      <SectionHeader label="Biggest Daily Price Changes" />
      {priceMovers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <Th label="ISIN" />
                <Th label="Underlying" />
                <Th label="Type" />
                <Th label="Last" right />
                <Th label="Chg" right />
                <Th label="Chg%" right />
                <Th label="Volume" right />
                <Th label="Moneyness" />
              </tr>
            </thead>
            <tbody>
              {priceMovers.map((m: any, i: number) => {
                const badge = moneynessBadge(m.moneyness);
                return (
                  <tr
                    key={`pm-${i}`}
                    className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                      {m.isin ?? '--'}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-white/70">
                      {m.underlying ?? '--'}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-white/50 uppercase">
                      {m.type ?? '--'}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                      {fmtPrice(m.last)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(m.change)}`}>
                      {fmtPrice(m.change)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(m.changePct)}`}>
                      {fmtChange(m.changePct)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                      {fmtCompact(m.volume)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap">
                      <span
                        className={`inline-block px-1 py-0.5 text-[7px] font-bold uppercase ${badge.color} ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
          No price movers
        </div>
      )}

      {/* Most active by volume */}
      <SectionHeader label="Most Active by Volume" />
      {volumeLeaders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-[#080808] z-10">
              <tr className="border-b border-border/20">
                <Th label="ISIN" />
                <Th label="Underlying" />
                <Th label="Type" />
                <Th label="Volume" right />
                <Th label="Turnover" right />
                <Th label="Last" right />
                <Th label="Chg%" right />
              </tr>
            </thead>
            <tbody>
              {volumeLeaders.map((v: any, i: number) => (
                <tr
                  key={`vl-${i}`}
                  className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                    {v.isin ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/70">
                    {v.underlying ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-white/50 uppercase">
                    {v.type ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                    {fmtCompact(v.volume)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtCompact(v.turnover)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtPrice(v.last)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(v.changePct)}`}>
                    {fmtChange(v.changePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-white/20 text-[8px] font-mono uppercase">
          No volume data
        </div>
      )}
    </div>
  );
}

// ── 4. Issuers Tab ──

function IssuersTab({ data }: { data: any }) {
  const issuers = data?.issuers ?? [];

  if (!issuers.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No issuer data available
      </div>
    );
  }

  const maxShare = Math.max(...issuers.map((iss: any) => iss.marketShare ?? 0), 1);

  return (
    <div>
      <SectionHeader label="Issuer Comparison" />
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th label="Issuer" />
              <Th label="Products" right />
              <Th label="Avg Spread" right />
              <Th label="Avg IV" right />
              <Th label="Market Share" right />
              <Th label="Share" />
            </tr>
          </thead>
          <tbody>
            {issuers.map((iss: any, i: number) => {
              const sharePct = maxShare > 0 ? ((iss.marketShare ?? 0) / maxShare) * 100 : 0;
              return (
                <tr
                  key={`iss-${i}`}
                  className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                    {iss.name ?? '--'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-white">
                    {iss.productCount ?? 0}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtNum(iss.avgSpread, 3)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                    {fmtPct(iss.avgIV)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                    {fmtPct(iss.marketShare)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap w-24">
                    <div className="w-full h-1.5 bg-white/[0.03] overflow-hidden">
                      <div
                        className="h-full bg-fuchsia-400/50"
                        style={{ width: `${sharePct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Issuer summary stats */}
      {data?.issuerSummary && (
        <>
          <SectionHeader label="Market Overview" />
          <div className="grid grid-cols-3 gap-px bg-border/10">
            {[
              { label: 'Total Issuers', value: data.issuerSummary.totalIssuers ?? '--', color: 'text-white' },
              { label: 'Total Products', value: fmtCompact(data.issuerSummary.totalProducts), color: 'text-fuchsia-400' },
              { label: 'Avg Mkt Spread', value: fmtNum(data.issuerSummary.avgMarketSpread, 3), color: 'text-white' },
            ].map((s, i) => (
              <div key={`io-${i}`} className="bg-black px-2 py-2">
                <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider">
                  {s.label}
                </div>
                <div className={`text-[11px] font-mono font-black ${s.color}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 5. Analysis Tab ──

function AnalysisTab({ data }: { data: any }) {
  const ivScatter = data?.analysis?.ivVsHistorical ?? [];
  const premiumDecay = data?.analysis?.premiumDecay ?? [];
  const moneynessDistribution = data?.analysis?.moneynessDistribution ?? {};

  const hasData = ivScatter.length > 0 || premiumDecay.length > 0 || Object.keys(moneynessDistribution).length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No analysis data available
      </div>
    );
  }

  return (
    <div>
      {/* IV vs Historical Vol scatter */}
      {ivScatter.length > 0 && (
        <>
          <SectionHeader label="IV vs Historical Volatility" />
          <div className="overflow-x-auto">
            <table className="w-full text-[8px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <Th label="Underlying" />
                  <Th label="IV" right />
                  <Th label="HV (20d)" right />
                  <Th label="IV-HV Spread" right />
                  <Th label="IV Rank" right />
                  <Th label="Signal" />
                </tr>
              </thead>
              <tbody>
                {ivScatter.map((row: any, i: number) => {
                  const spread = (row.iv ?? 0) - (row.hv ?? 0);
                  const signal = spread > 10 ? 'OVERPRICED' : spread < -10 ? 'UNDERPRICED' : 'FAIR';
                  const sigColor =
                    signal === 'OVERPRICED'
                      ? 'text-red-400'
                      : signal === 'UNDERPRICED'
                        ? 'text-green-400'
                        : 'text-yellow-400';

                  return (
                    <tr
                      key={`iv-${i}`}
                      className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                    >
                      <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                        {row.underlying ?? '--'}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                        {fmtPct(row.iv)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                        {fmtPct(row.hv)}
                      </td>
                      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(spread)}`}>
                        {fmtChange(spread)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                        {fmtPct(row.ivRank)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        <span className={`text-[7px] font-bold uppercase ${sigColor}`}>
                          {signal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Premium Decay Analysis */}
      {premiumDecay.length > 0 && (
        <>
          <SectionHeader label="Premium Decay Analysis" />
          <div className="overflow-x-auto">
            <table className="w-full text-[8px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <Th label="Underlying" />
                  <Th label="Days to Expiry" right />
                  <Th label="Time Value" right />
                  <Th label="Daily Decay" right />
                  <Th label="Decay Rate" right />
                  <Th label="Decay Bar" />
                </tr>
              </thead>
              <tbody>
                {premiumDecay.map((row: any, i: number) => {
                  const maxDecay = Math.max(...premiumDecay.map((r: any) => Math.abs(r.dailyDecay ?? 0)), 0.01);
                  const barPct = Math.min((Math.abs(row.dailyDecay ?? 0) / maxDecay) * 100, 100);

                  return (
                    <tr
                      key={`pd-${i}`}
                      className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
                    >
                      <td className="px-1.5 py-1 whitespace-nowrap font-bold text-fuchsia-400">
                        {row.underlying ?? '--'}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70">
                        {row.daysToExpiry ?? '--'}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60">
                        {fmtPrice(row.timeValue)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-red-400 font-bold">
                        {fmtPrice(row.dailyDecay)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/50">
                        {fmtPct(row.decayRate)}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap w-20">
                        <div className="w-full h-1.5 bg-white/[0.03] overflow-hidden">
                          <div
                            className="h-full bg-red-400/50"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Moneyness Distribution */}
      {Object.keys(moneynessDistribution).length > 0 && (
        <>
          <SectionHeader label="Moneyness Distribution" />
          <div className="px-2 py-2 space-y-2">
            {(['ITM', 'ATM', 'OTM'] as const).map((key) => {
              const count = moneynessDistribution[key] ?? 0;
              const total =
                (moneynessDistribution.ITM ?? 0) +
                (moneynessDistribution.ATM ?? 0) +
                (moneynessDistribution.OTM ?? 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              const badge = moneynessBadge(key);

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[8px] font-mono font-bold uppercase ${badge.color}`}>
                      {key}
                    </span>
                    <span className="text-[8px] font-mono text-white/50">
                      {count} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full ${
                        key === 'ITM'
                          ? 'bg-green-400/50'
                          : key === 'ATM'
                            ? 'bg-yellow-400/50'
                            : 'bg-red-400/50'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Panel ──

export function WarrantPricingPanel() {
  const t = useT();
  const { data, isLoading } = useWarrantPricing();
  const d = data as any;
  const [activeTab, setActiveTab] = useState<ViewTab>('warrants');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'warrantPricingTitle', 'Warrant Pricing Analytics')}
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[6px] text-white/20 font-mono">
            {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['warrants', 'Warrants'],
            ['greeks', 'Greeks'],
            ['movers', 'Movers'],
            ['issuers', 'Issuers'],
            ['analysis', 'Analysis'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ViewTab)}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-fuchsia-400 border-b border-fuchsia-400 bg-fuchsia-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
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

        {!d && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No warrant pricing data available
          </div>
        )}

        {d && (
          <>
            {activeTab === 'warrants' && <WarrantsTab data={d} />}
            {activeTab === 'greeks' && <GreeksTab data={d} />}
            {activeTab === 'movers' && <MoversTab data={d} />}
            {activeTab === 'issuers' && <IssuersTab data={d} />}
            {activeTab === 'analysis' && <AnalysisTab data={d} />}

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
