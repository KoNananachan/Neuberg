import { useState } from 'react';
import { useCarbonCredits } from '../../api/hooks/use-carbon-credits';

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.08)';

type Tab = 'markets' | 'futures' | 'offsets' | 'calendar';

export function CarbonCreditsPanel() {
  const { data, isLoading, error } = useCarbonCredits();
  const [tab, setTab] = useState<Tab>('markets');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading carbon credits data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'markets', label: 'MARKETS' },
    { key: 'futures', label: 'EU ETS CURVE' },
    { key: 'offsets', label: 'OFFSETS' },
    { key: 'calendar', label: 'REGULATORY' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Market Value</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.globalMarketValue}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Price</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.avgCarbonPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">YTD</div>
          <div className={`text-[11px] font-mono font-black ${data.summary?.ytdChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {data.summary?.ytdChange >= 0 ? '+' : ''}{data.summary?.ytdChange}%
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Volume</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.totalVolume} Mt</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Markets</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.activeMarkets}</div>
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
        {tab === 'markets' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Market</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-right font-bold">1W</th>
                <th className="px-2 py-1.5 text-right font-bold">YTD</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                <th className="px-2 py-1.5 text-right font-bold">Cap</th>
              </tr>
            </thead>
            <tbody>
              {data.markets?.map((m: any) => (
                <tr key={m.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{m.id}</span>
                    <span className="text-neutral/30 ml-1.5 text-[7px]">{m.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                    {m.currency === 'USD' ? '$' : m.currency === 'EUR' ? '\u20ac' : m.currency === 'GBP' ? '\u00a3' : ''}{m.price}
                    {m.priceUSD && m.currency !== 'USD' && <span className="text-neutral/30 text-[7px] ml-1">${m.priceUSD}</span>}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${m.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.change1d >= 0 ? '+' : ''}{m.change1d}%
                  </td>
                  <td className={`px-2 py-1.5 text-right ${m.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.change1w >= 0 ? '+' : ''}{m.change1w}%
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${m.changeYTD >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.changeYTD >= 0 ? '+' : ''}{m.changeYTD}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{m.volume24h}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{m.allocationCap} Mt</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'futures' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">EU ETS Futures Curve — Dec Contracts</div>
            <table className="w-full text-[9px] font-mono mb-4">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Contract</th>
                  <th className="px-2 py-1.5 text-right font-bold">Price</th>
                  <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">Spread</th>
                  <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                  <th className="px-2 py-1.5 text-right font-bold">Structure</th>
                </tr>
              </thead>
              <tbody>
                {data.futuresCurve?.map((f: any) => (
                  <tr key={f.contract} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{f.contract}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{'\u20ac'}{f.price}</td>
                    <td className={`px-2 py-1.5 text-right ${f.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {f.change >= 0 ? '+' : ''}{f.change}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{f.spreadVsSpot >= 0 ? '+' : ''}{f.spreadVsSpot}</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{f.volume}</td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`text-[7px] font-bold ${f.structure === 'Contango' ? 'text-bullish' : 'text-bearish'}`}>{f.structure}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Curve Visualization</div>
            <div className="flex items-end gap-4 h-20">
              {data.futuresCurve?.map((f: any) => {
                const prices = data.futuresCurve.map((x: any) => x.price);
                const min = Math.min(...prices) * 0.95;
                const max = Math.max(...prices) * 1.05;
                const pct = ((f.price - min) / (max - min)) * 100;
                return (
                  <div key={f.contract} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: '60px' }}>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${pct}%`, background: ACCENT, opacity: 0.35 }} />
                    </div>
                    <div className="text-[7px] text-neutral/30">{f.contract}</div>
                    <div className="text-[7px] font-bold" style={{ color: ACCENT }}>{'\u20ac'}{f.price}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'offsets' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Voluntary Carbon Offset Credits</div>
            {data.offsetCredits?.map((o: any) => (
              <div key={o.type} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{o.type}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{o.standard}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Price</div>
                    <div className="text-white/80 font-bold">${o.avgPrice}/t</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Volume</div>
                    <div className="text-white/60">{o.volume} MtCO2e</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Vintage</div>
                    <div className="text-white/50">{o.vintageRange}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'calendar' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Upcoming Regulatory Events</div>
            {data.regulatoryCalendar?.map((e: any, i: number) => (
              <div key={i} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{e.market}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{e.date}</span>
                </div>
                <div className="text-[9px] font-mono text-white/70 mb-1">{e.event}</div>
                <span className={`text-[7px] font-bold px-1 py-0 ${e.impact === 'Bullish' ? 'bg-bullish/15 text-bullish' : e.impact === 'Bearish' ? 'bg-bearish/15 text-bearish' : 'bg-white/10 text-white/50'}`}>
                  {e.impact}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
