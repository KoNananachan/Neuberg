import { useState } from 'react';
import { useCommodityOptions } from '../../api/hooks/use-commodity-options';

const ACCENT = '#fbbf24'; // amber-400
const ACCENT_DIM = 'rgba(251,191,36,0.08)';

type Tab = 'overview' | 'volSurface' | 'active' | 'seasonal';

export function CommodityOptionsPanel() {
  const { data, isLoading, error } = useCommodityOptions();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedCommodity, setSelectedCommodity] = useState('CL');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading commodity options data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'OVERVIEW' },
    { key: 'volSurface', label: 'VOL SURFACE' },
    { key: 'active', label: 'MOST ACTIVE' },
    { key: 'seasonal', label: 'SEASONAL VOL' },
  ];

  const volColor = (v: number) => {
    if (v >= 50) return '#ef4444';
    if (v >= 35) return '#f97316';
    if (v >= 25) return '#fbbf24';
    if (v >= 18) return '#a3e635';
    return '#22d3ee';
  };

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Total Volume</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.totalVolume}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Total OI</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.totalOI}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Most Active</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.mostActiveCommodity}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg IV</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgImpliedVol}%</div>
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
        {tab === 'overview' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                <th className="px-2 py-1.5 text-right font-bold">ATM Vol</th>
                <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Put Skew</th>
                <th className="px-2 py-1.5 text-right font-bold">P/C Ratio</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume</th>
              </tr>
            </thead>
            <tbody>
              {data.commodities?.map((c: any) => (
                <tr key={c.symbol} className={`border-b border-border/5 hover:bg-white/[0.02] cursor-pointer ${c.symbol === selectedCommodity ? 'bg-white/[0.03]' : ''}`} onClick={() => setSelectedCommodity(c.symbol)}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.symbol}</span>
                    <span className="text-neutral/30 ml-1.5 text-[7px]">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.spotPrice} {c.unit}</td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: volColor(c.atmVol) }}>{c.atmVol}%</td>
                  <td className={`px-2 py-1.5 text-right ${c.vol1mChange >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                    {c.vol1mChange >= 0 ? '+' : ''}{c.vol1mChange}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">+{c.putSkew25d}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.putCallRatio}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{c.totalVolume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'volSurface' && (() => {
          const surface = data.volSurfaces?.find((s: any) => s.symbol === selectedCommodity);
          const commodity = data.commodities?.find((c: any) => c.symbol === selectedCommodity);
          return (
            <div className="p-2">
              <div className="flex items-center gap-1 mb-2">
                {data.volSurfaces?.map((s: any) => (
                  <button key={s.symbol} onClick={() => setSelectedCommodity(s.symbol)} className="px-2 py-1 text-[8px] font-mono font-bold" style={{ color: selectedCommodity === s.symbol ? ACCENT : 'rgba(255,255,255,0.3)', background: selectedCommodity === s.symbol ? ACCENT_DIM : 'transparent' }}>
                    {s.symbol}
                  </button>
                ))}
              </div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">
                Vol Surface — {commodity?.name ?? selectedCommodity} (Spot: {commodity?.spotPrice})
              </div>
              {surface && (
                <table className="w-full text-[8px] font-mono">
                  <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                    <tr>
                      <th className="px-1.5 py-1 text-left font-bold">Strike</th>
                      {surface.tenors?.map((t: string) => (
                        <th key={t} className="px-1.5 py-1 text-right font-bold">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {surface.strikes?.map((strike: any) => (
                      <tr key={strike.strike} className="border-b border-border/5 hover:bg-white/[0.02]">
                        <td className="px-1.5 py-1 font-bold" style={{ color: strike.strike === '100%' ? ACCENT : 'rgba(255,255,255,0.5)' }}>{strike.strike}</td>
                        {strike.vols?.map((v: number, i: number) => (
                          <td key={i} className="px-1.5 py-1 text-right" style={{ color: volColor(v) }}>
                            {v}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {tab === 'active' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Commodity</th>
                <th className="px-2 py-1.5 text-left font-bold">Expiry</th>
                <th className="px-2 py-1.5 text-right font-bold">Strike</th>
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-right font-bold">Vol</th>
                <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                <th className="px-2 py-1.5 text-right font-bold">Delta</th>
              </tr>
            </thead>
            <tbody>
              {data.mostActiveOptions?.map((o: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{o.commodity}</td>
                  <td className="px-2 py-1.5 text-white/50">{o.expiry}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{o.strike}</td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${o.type === 'Call' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>{o.type}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: volColor(o.impliedVol) }}>{o.impliedVol}%</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{o.volume}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{o.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'seasonal' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Monthly Average Implied Volatility</div>
            {data.seasonalPatterns?.map((s: any) => (
              <div key={s.symbol} className="border border-border/10 p-3">
                <div className="text-[10px] font-mono font-black mb-2" style={{ color: ACCENT }}>{s.name} ({s.symbol})</div>
                <div className="flex items-end gap-1.5 h-12">
                  {s.monthlyVol?.map((m: any) => {
                    const maxV = Math.max(...s.monthlyVol.map((x: any) => x.vol));
                    const minV = Math.min(...s.monthlyVol.map((x: any) => x.vol));
                    const h = maxV > minV ? ((m.vol - minV) / (maxV - minV)) * 100 : 50;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full relative" style={{ height: '40px' }}>
                          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.max(10, h)}%`, background: volColor(m.vol), opacity: 0.35 }} />
                        </div>
                        <div className="text-[5px] text-neutral/30 mt-0.5">{m.month}</div>
                        <div className="text-[6px] font-bold" style={{ color: volColor(m.vol) }}>{m.vol}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
