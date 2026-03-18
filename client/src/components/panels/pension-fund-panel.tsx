import { useState } from 'react';
import { usePensionFund } from '../../api/hooks/use-pension-fund';

const ACCENT = '#fcd34d'; // amber-300
const ACCENT_DIM = 'rgba(252,211,77,0.08)';

type Tab = 'funds' | 'allocation' | 'liability' | 'trend';

export function PensionFundPanel() {
  const { data, isLoading, error } = usePensionFund();
  const [tab, setTab] = useState<Tab>('funds');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading pension fund data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'funds', label: 'FUNDS' },
    { key: 'allocation', label: 'ALLOCATION' },
    { key: 'liability', label: 'LIABILITY' },
    { key: 'trend', label: 'TREND' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Funding</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgFundingRatio}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Total Assets</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalAssets}T</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Total Liabilities</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalLiabilities}T</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Discount Rate</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgDiscountRate}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">YTD Return</div>
          <div className={`text-[11px] font-mono font-black ${data.summary?.ytdReturn >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {data.summary?.ytdReturn >= 0 ? '+' : ''}{data.summary?.ytdReturn}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
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

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'funds' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Name</th>
                <th className="px-2 py-1.5 text-right font-bold">Assets ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Liabilities ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Funding %</th>
                <th className="px-2 py-1.5 text-right font-bold">Disc. Rate</th>
                <th className="px-2 py-1.5 text-right font-bold">YTD</th>
                <th className="px-2 py-1.5 text-left font-bold">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {data.funds?.map((f: any) => {
                const fundingColor = f.fundingRatio >= 100 ? 'text-bullish' : f.fundingRatio >= 80 ? 'text-warning' : 'text-bearish';
                return (
                  <tr key={f.name} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{f.name}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{f.assets}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{f.liabilities}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${fundingColor}`}>{f.fundingRatio}%</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{f.discountRate}%</td>
                    <td className={`px-2 py-1.5 text-right ${f.ytdReturn >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {f.ytdReturn >= 0 ? '+' : ''}{f.ytdReturn}%
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0 h-2 w-24 overflow-hidden">
                        {f.allocation?.equity != null && (
                          <div style={{ width: `${f.allocation.equity}%`, height: '100%', background: '#60a5fa' }} title={`Equity ${f.allocation.equity}%`} />
                        )}
                        {f.allocation?.fixedIncome != null && (
                          <div style={{ width: `${f.allocation.fixedIncome}%`, height: '100%', background: '#34d399' }} title={`FI ${f.allocation.fixedIncome}%`} />
                        )}
                        {f.allocation?.realEstate != null && (
                          <div style={{ width: `${f.allocation.realEstate}%`, height: '100%', background: '#c084fc' }} title={`RE ${f.allocation.realEstate}%`} />
                        )}
                        {f.allocation?.alternatives != null && (
                          <div style={{ width: `${f.allocation.alternatives}%`, height: '100%', background: '#fb923c' }} title={`Alt ${f.allocation.alternatives}%`} />
                        )}
                        {f.allocation?.cash != null && (
                          <div style={{ width: `${f.allocation.cash}%`, height: '100%', background: 'rgba(255,255,255,0.15)' }} title={`Cash ${f.allocation.cash}%`} />
                        )}
                      </div>
                      <div className="flex gap-1 mt-0.5 text-[6px] text-neutral/30">
                        <span style={{ color: '#60a5fa' }}>EQ {f.allocation?.equity}%</span>
                        <span style={{ color: '#34d399' }}>FI {f.allocation?.fixedIncome}%</span>
                        <span style={{ color: '#c084fc' }}>RE {f.allocation?.realEstate}%</span>
                        <span style={{ color: '#fb923c' }}>ALT {f.allocation?.alternatives}%</span>
                        <span className="text-white/20">CA {f.allocation?.cash}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === 'allocation' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-3">Aggregate Asset Allocation</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Category</th>
                  <th className="px-2 py-1.5 text-right font-bold">% of Total</th>
                  <th className="px-2 py-1.5 text-left font-bold pl-4">Distribution</th>
                  <th className="px-2 py-1.5 text-right font-bold">1Y Chg (pp)</th>
                  <th className="px-2 py-1.5 text-right font-bold">Benchmark %</th>
                </tr>
              </thead>
              <tbody>
                {data.allocation?.map((a: any) => (
                  <tr key={a.category} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{a.category}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{a.pctOfTotal}%</td>
                    <td className="px-2 py-1.5 pl-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-24 h-1.5 bg-white/5 overflow-hidden">
                          <div
                            style={{
                              width: `${a.pctOfTotal}%`,
                              height: '100%',
                              background: ACCENT,
                              opacity: 0.6,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={`px-2 py-1.5 text-right ${a.oneYearChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {a.oneYearChange >= 0 ? '+' : ''}{a.oneYearChange}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/40">{a.benchmarkPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'liability' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-3">Liability Metrics</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Duration Gap</div>
                <div className="text-[16px] font-mono font-black" style={{ color: ACCENT }}>
                  {data.liability?.durationGap ?? '--'}
                </div>
                <div className="text-[7px] font-mono text-neutral/30 mt-0.5">years</div>
              </div>
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">PVBO per bp</div>
                <div className="text-[16px] font-mono font-black" style={{ color: ACCENT }}>
                  {data.liability?.pvboPerBp ?? '--'}
                </div>
                <div className="text-[7px] font-mono text-neutral/30 mt-0.5">$ million</div>
              </div>
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Interest Rate Sensitivity</div>
                <div className="text-[16px] font-mono font-black text-white/80">
                  {data.liability?.interestRateSensitivity ?? '--'}%
                </div>
                <div className="text-[7px] font-mono text-neutral/30 mt-0.5">per 100bp move</div>
              </div>
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Inflation Sensitivity</div>
                <div className="text-[16px] font-mono font-black text-white/80">
                  {data.liability?.inflationSensitivity ?? '--'}%
                </div>
                <div className="text-[7px] font-mono text-neutral/30 mt-0.5">per 100bp move</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'trend' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-3">12-Month Funding Trend</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Month</th>
                  <th className="px-2 py-1.5 text-left font-bold pl-4">Avg Funding Ratio</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg Disc. Rate</th>
                  <th className="px-2 py-1.5 text-right font-bold">S&P 500</th>
                </tr>
              </thead>
              <tbody>
                {data.trend?.map((t: any) => {
                  const maxFunding = Math.max(...(data.trend?.map((x: any) => x.avgFundingRatio) ?? [100]));
                  const barWidth = maxFunding > 0 ? (t.avgFundingRatio / maxFunding) * 100 : 0;
                  const fundingColor = t.avgFundingRatio >= 100 ? '#4ade80' : t.avgFundingRatio >= 80 ? '#fbbf24' : '#f87171';
                  return (
                    <tr key={t.month} className="border-b border-border/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-bold text-white/70">{t.month}</td>
                      <td className="px-2 py-1.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 overflow-hidden">
                            <div
                              style={{
                                width: `${barWidth}%`,
                                height: '100%',
                                background: fundingColor,
                                opacity: 0.6,
                              }}
                            />
                          </div>
                          <span className="font-bold" style={{ color: fundingColor }}>{t.avgFundingRatio}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/50">{t.avgDiscountRate}%</td>
                      <td className={`px-2 py-1.5 text-right ${t.sp500Return >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {t.sp500Return >= 0 ? '+' : ''}{t.sp500Return}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
