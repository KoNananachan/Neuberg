import { useState } from 'react';
import { useMoneyMarket } from '../../api/hooks/use-money-market';

const ACCENT = '#22d3ee'; // cyan-400
const ACCENT_DIM = 'rgba(34,211,238,0.08)';

type Tab = 'benchmarks' | 'tbills' | 'cp' | 'mmf' | 'fed';

export function MoneyMarketPanel() {
  const { data, isLoading, error } = useMoneyMarket();
  const [tab, setTab] = useState<Tab>('benchmarks');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading money market data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'benchmarks', label: 'BENCHMARKS' },
    { key: 'tbills', label: 'T-BILLS' },
    { key: 'cp', label: 'COMM PAPER' },
    { key: 'mmf', label: 'MMF' },
    { key: 'fed', label: 'FED FUNDS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'benchmarks' && (
          <div className="p-0">
            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2">
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">SOFR</div>
                <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.sofrRate}%</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">Fed Funds</div>
                <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.fedFundsRate}%</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">3M T-Bill</div>
                <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.tbill3m}%</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">MMF AUM</div>
                <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalMMFAUM}B</div>
              </div>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Rate</th>
                  <th className="px-2 py-1.5 text-left font-bold">Region</th>
                  <th className="px-2 py-1.5 text-right font-bold">Rate</th>
                  <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">Vol ($B)</th>
                  <th className="px-2 py-1.5 text-right font-bold">P25</th>
                  <th className="px-2 py-1.5 text-right font-bold">P75</th>
                </tr>
              </thead>
              <tbody>
                {data.benchmarks?.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ACCENT }}>{b.id}</span>
                      <span className="text-neutral/30 ml-1.5 text-[8px]">{b.name}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[7px] font-bold px-1 py-0 bg-white/5 text-white/50">{b.region}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{b.rate}%</td>
                    <td className={`px-2 py-1.5 text-right ${b.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {b.change1d >= 0 ? '+' : ''}{b.change1d}%
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{b.volume}</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{b.percentile25}%</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{b.percentile75}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'tbills' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">Yield</th>
                <th className="px-2 py-1.5 text-right font-bold">Discount</th>
                <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
              </tr>
            </thead>
            <tbody>
              {data.tbills?.map((t: any) => (
                <tr key={t.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.tenor}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{t.yield}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{t.discountRate}%</td>
                  <td className={`px-2 py-1.5 text-right ${t.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {t.change1d >= 0 ? '+' : ''}{t.change1d}bp
                  </td>
                  <td className={`px-2 py-1.5 text-right ${t.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {t.change1w >= 0 ? '+' : ''}{t.change1w}bp
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border/20">
              <tr>
                <td colSpan={5} className="px-2 py-2">
                  <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Yield Curve</div>
                  <div className="flex items-end gap-4 h-16">
                    {data.tbills?.map((t: any) => {
                      const maxY = Math.max(...data.tbills.map((x: any) => x.yield));
                      const minY = Math.min(...data.tbills.map((x: any) => x.yield));
                      const range = maxY - minY || 1;
                      const pct = ((t.yield - minY) / range) * 100;
                      return (
                        <div key={t.tenor} className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-[7px] text-white/50">{t.yield}%</div>
                          <div className="w-full bg-white/5 relative" style={{ height: '40px' }}>
                            <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.max(pct, 5)}%`, background: ACCENT, opacity: 0.4 }} />
                          </div>
                          <div className="text-[6px] text-neutral/30">{t.tenor.replace('-Week', 'W')}</div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        {tab === 'cp' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">AA Fin</th>
                <th className="px-2 py-1.5 text-right font-bold">AA Non-Fin</th>
                <th className="px-2 py-1.5 text-right font-bold">A2/P2</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread</th>
              </tr>
            </thead>
            <tbody>
              {data.commercialPaper?.map((cp: any) => (
                <tr key={cp.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{cp.tenor}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{cp.aaFinancial}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{cp.aaNonFinancial}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{cp.a2p2}%</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{cp.spread}bp</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'mmf' && (
          <div className="p-3 space-y-3">
            {data.mmFunds?.map((f: any) => (
              <div key={f.type} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{f.type}</span>
                  <span className="text-[8px] font-mono text-neutral/40">${f.totalAUM}B AUM</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">7D Yield</div>
                    <div className="text-white/80 font-bold">{f.avgYield7d}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Net Flows</div>
                    <div className={f.netFlows1w >= 0 ? 'text-bullish' : 'text-bearish'}>
                      {f.netFlows1w >= 0 ? '+' : ''}${f.netFlows1w}B
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral/40">WAM</div>
                    <div className="text-white/60">{f.avgWAM}d</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">WAL</div>
                    <div className="text-white/60">{f.avgWAL}d</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'fed' && (
          <div className="p-3 space-y-4">
            {/* RRP */}
            <div className="border border-border/10 p-3">
              <div className="text-[9px] font-mono font-black uppercase mb-2" style={{ color: ACCENT }}>Reverse Repo Facility</div>
              <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                <div>
                  <div className="text-neutral/40">Total</div>
                  <div className="text-white/80 font-bold">${data.rrpUsage?.total}B</div>
                </div>
                <div>
                  <div className="text-neutral/40">1D Chg</div>
                  <div className={data.rrpUsage?.change1d >= 0 ? 'text-bullish' : 'text-bearish'}>
                    {data.rrpUsage?.change1d >= 0 ? '+' : ''}${data.rrpUsage?.change1d}B
                  </div>
                </div>
                <div>
                  <div className="text-neutral/40">Rate</div>
                  <div className="text-white/70 font-bold">{data.rrpUsage?.rate}%</div>
                </div>
                <div>
                  <div className="text-neutral/40">Counterparties</div>
                  <div className="text-white/60">{data.rrpUsage?.counterparties}</div>
                </div>
              </div>
            </div>

            {/* Fed Funds Distribution */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Fed Funds Rate Distribution</div>
              <div className="space-y-1">
                {data.fedFundsDistribution?.map((b: any) => {
                  const maxVol = Math.max(...data.fedFundsDistribution.map((x: any) => x.volume));
                  return (
                    <div key={b.rate} className="flex items-center gap-2">
                      <span className="text-[8px] font-mono w-14 text-right text-white/50">{b.rate}%</span>
                      <div className="flex-1 h-3 bg-white/5 overflow-hidden">
                        <div style={{ width: `${(b.volume / maxVol) * 100}%`, height: '100%', background: ACCENT, opacity: 0.35 }} />
                      </div>
                      <span className="text-[8px] font-mono text-white/40 w-10 text-right">${b.volume}B</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
