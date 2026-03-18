import { useState } from 'react';
import { useEquityBasketSwaps } from '../../api/hooks/use-equity-basket-swaps';

const ACCENT = '#6ee7b7'; // emerald-300
const ACCENT_DIM = 'rgba(110,231,183,0.08)';

type Tab = 'baskets' | 'financing' | 'attribution' | 'rebalance';

export function EquityBasketSwapsPanel() {
  const { data, isLoading, error } = useEquityBasketSwaps();
  const [tab, setTab] = useState<Tab>('baskets');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading equity basket swap data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'baskets', label: 'BASKETS' },
    { key: 'financing', label: 'FINANCING' },
    { key: 'attribution', label: 'ATTRIBUTION' },
    { key: 'rebalance', label: 'REBALANCE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalNotional}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Baskets</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.activeBaskets}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgFinancingSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Size</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgBasketSize} names</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Wtd YTD</div>
          <div className={`text-[11px] font-mono font-black ${data.summary?.wtdAvgYTD >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {data.summary?.wtdAvgYTD >= 0 ? '+' : ''}{data.summary?.wtdAvgYTD}%
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'baskets' && (
          <div className="p-0">
            {data.baskets?.map((b: any) => (
              <div key={b.id} className="border-b border-border/10">
                <button className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black" style={{ color: ACCENT }}>{b.name}</span>
                    <span className={`text-[7px] font-bold px-1 py-0 ${b.strategy === 'Long Only' ? 'bg-bullish/15 text-bullish' : b.strategy === 'Long-Short' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-white/50'}`}>{b.strategy}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[8px] font-mono">
                    <span className="text-white/50">${b.notional}M</span>
                    <span className={b.performance?.ytd >= 0 ? 'text-bullish' : 'text-bearish'}>
                      {b.performance?.ytd >= 0 ? '+' : ''}{b.performance?.ytd}%
                    </span>
                  </div>
                </button>
                {expanded === b.id && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-5 gap-2 text-[8px] font-mono">
                      <div>
                        <div className="text-neutral/40">1D</div>
                        <div className={b.performance?.day1 >= 0 ? 'text-bullish' : 'text-bearish'}>{b.performance?.day1 >= 0 ? '+' : ''}{b.performance?.day1}%</div>
                      </div>
                      <div>
                        <div className="text-neutral/40">1W</div>
                        <div className={b.performance?.week1 >= 0 ? 'text-bullish' : 'text-bearish'}>{b.performance?.week1 >= 0 ? '+' : ''}{b.performance?.week1}%</div>
                      </div>
                      <div>
                        <div className="text-neutral/40">1M</div>
                        <div className={b.performance?.month1 >= 0 ? 'text-bullish' : 'text-bearish'}>{b.performance?.month1 >= 0 ? '+' : ''}{b.performance?.month1}%</div>
                      </div>
                      <div>
                        <div className="text-neutral/40">Spread</div>
                        <div className="text-white/60">{b.financingSpread}bp</div>
                      </div>
                      <div>
                        <div className="text-neutral/40">Names</div>
                        <div className="text-white/60">{b.constituents}</div>
                      </div>
                    </div>
                    <div className="text-[7px] font-mono text-neutral/40 uppercase mt-1">Top Holdings</div>
                    {b.topHoldings?.map((h: any) => (
                      <div key={h.ticker} className="flex items-center justify-between text-[8px] font-mono">
                        <span className="font-bold" style={{ color: ACCENT }}>{h.ticker}</span>
                        <span className="text-white/50">{h.weight}%</span>
                        <span className={h.contribution >= 0 ? 'text-bullish' : 'text-bearish'}>{h.contribution >= 0 ? '+' : ''}{h.contribution}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'financing' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">
              Financing Rates — SOFR: {data.financing?.sofrRate}%
            </div>
            {data.financing?.byStrategy?.map((f: any) => (
              <div key={f.strategy} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{f.strategy}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{f.count} baskets</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Spread</div>
                    <div className="text-white/80 font-bold">{f.avgSpread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">All-in Rate</div>
                    <div className="font-bold" style={{ color: ACCENT }}>{f.allInRate}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Total Cost</div>
                    <div className="text-white/60">${f.totalCost}M/yr</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'attribution' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Basket</th>
                <th className="px-2 py-1.5 text-right font-bold">Alpha</th>
                <th className="px-2 py-1.5 text-right font-bold">TE</th>
                <th className="px-2 py-1.5 text-right font-bold">IR</th>
                <th className="px-2 py-1.5 text-right font-bold">Max DD</th>
              </tr>
            </thead>
            <tbody>
              {data.attribution?.map((a: any) => (
                <tr key={a.basket} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{a.basket}</span>
                    <span className="text-neutral/30 ml-1 text-[7px]">vs {a.benchmark}</span>
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${a.alpha >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {a.alpha >= 0 ? '+' : ''}{a.alpha}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{a.trackingError}%</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: a.infoRatio >= 0.5 ? ACCENT : 'rgba(255,255,255,0.5)' }}>{a.infoRatio}</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{a.maxDrawdown}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'rebalance' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Upcoming Rebalances</div>
            {data.rebalanceCalendar?.map((r: any, i: number) => (
              <div key={i} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{r.basket}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{r.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[8px] font-mono mt-2">
                  <div>
                    <div className="text-neutral/40">Expected Turnover</div>
                    <div className="text-white/80 font-bold">{r.expectedTurnover}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Last Rebal Cost</div>
                    <div className="text-white/60">{r.lastRebalanceCost}bp</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
