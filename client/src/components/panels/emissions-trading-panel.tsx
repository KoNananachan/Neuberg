import { useState } from 'react';
import { useEmissionsTrading } from '../../api/hooks/use-emissions-trading';

const ACCENT = '#22c55e';
const ACCENT_DIM = 'rgba(34,197,94,0.08)';

type Tab = 'markets' | 'futures' | 'auctions' | 'offsets';

export function EmissionsTradingPanel() {
  const { data, isLoading, error } = useEmissionsTrading();
  const [tab, setTab] = useState<Tab>('markets');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading emissions trading data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'markets', label: 'MARKETS' },
    { key: 'futures', label: 'FUTURES' },
    { key: 'auctions', label: 'AUCTIONS' },
    { key: 'offsets', label: 'OFFSETS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">EU ETS</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{'\u20ac'}{data.summary?.euEtsPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">RGGI</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.rggiPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">CCA</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.ccaPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Global Vol</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.globalVolume} Mt</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg 1W Chg</div>
          <div className={`text-[11px] font-mono font-black ${data.summary?.avg1wChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {data.summary?.avg1wChange >= 0 ? '+' : ''}{data.summary?.avg1wChange}%
          </div>
        </div>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'markets' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Market</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
                <th className="px-2 py-1.5 text-right font-bold">Currency</th>
                <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">1W Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                <th className="px-2 py-1.5 text-right font-bold">OI</th>
                <th className="px-2 py-1.5 text-right font-bold">Vintage</th>
              </tr>
            </thead>
            <tbody>
              {data.markets?.map((m: any) => (
                <tr key={m.market} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{m.market}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{m.price}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{m.currency}</td>
                  <td className={`px-2 py-1.5 text-right ${m.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.change1d >= 0 ? '+' : ''}{m.change1d}%
                  </td>
                  <td className={`px-2 py-1.5 text-right ${m.change1w >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.change1w >= 0 ? '+' : ''}{m.change1w}%
                  </td>
                  <td className={`px-2 py-1.5 text-right ${m.change1m >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {m.change1m >= 0 ? '+' : ''}{m.change1m}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{m.volume} Mt</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{m.openInterest}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{m.vintage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'futures' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">Price (EUR)</th>
                <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread to Spot</th>
                <th className="px-2 py-1.5 text-right font-bold">Implied Carry</th>
              </tr>
            </thead>
            <tbody>
              {data.futures?.map((f: any) => (
                <tr key={f.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{f.tenor}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{'\u20ac'}{f.price}</td>
                  <td className={`px-2 py-1.5 text-right ${f.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {f.change1d >= 0 ? '+' : ''}{f.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">
                    {f.spreadToSpot >= 0 ? '+' : ''}{f.spreadToSpot}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{f.impliedCarry}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'auctions' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Market</th>
                <th className="px-2 py-1.5 text-right font-bold">Date</th>
                <th className="px-2 py-1.5 text-right font-bold">Clearing Price</th>
                <th className="px-2 py-1.5 text-right font-bold">Cover Ratio</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                <th className="px-2 py-1.5 text-right font-bold">Participants</th>
                <th className="px-2 py-1.5 text-right font-bold">Chg vs Prev</th>
              </tr>
            </thead>
            <tbody>
              {data.auctions?.map((a: any, i: number) => (
                <tr key={`${a.market}-${i}`} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{a.market}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{a.date}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{a.clearingPrice}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{a.coverRatio}x</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{a.volume} Mt</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{a.participants}</td>
                  <td className={`px-2 py-1.5 text-right ${a.changeVsPrev >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {a.changeVsPrev >= 0 ? '+' : ''}{a.changeVsPrev}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'offsets' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-right font-bold">Price ($/ton)</th>
                <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume (Mt YTD)</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Project Type</th>
              </tr>
            </thead>
            <tbody>
              {data.offsets?.map((o: any) => (
                <tr key={o.type} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{o.type}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${o.price}</td>
                  <td className={`px-2 py-1.5 text-right ${o.change1m >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {o.change1m >= 0 ? '+' : ''}{o.change1m}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{o.volumeYtd} Mt</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{o.avgProjectType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
