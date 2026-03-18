import { useState } from 'react';
import { useWeatherDerivatives } from '../../api/hooks/use-weather-derivatives';

const ACCENT = '#38bdf8'; // sky-400
const ACCENT_DIM = 'rgba(56,189,248,0.08)';

type Tab = 'cities' | 'contracts' | 'strips' | 'cat';

export function WeatherDerivativesPanel() {
  const { data, isLoading, error } = useWeatherDerivatives();
  const [tab, setTab] = useState<Tab>('cities');
  const [selectedCity, setSelectedCity] = useState('New York');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading weather derivatives data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cities', label: 'CITIES' },
    { key: 'contracts', label: 'FUTURES' },
    { key: 'strips', label: 'STRIPS' },
    { key: 'cat', label: 'CAT INDEX' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalNotional}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Contracts</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.activeContracts}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Most Active</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.mostActiveCity}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Season</div>
          <div className="text-[11px] font-mono font-black" style={{ color: data.summary?.currentSeason === 'Heating' ? '#f97316' : ACCENT }}>{data.summary?.currentSeason}</div>
        </div>
      </div>

      <div className="flex items-center border-b border-border/20 shrink-0">
        <div className="flex items-center gap-0 overflow-x-auto no-scrollbar px-1 border-r border-border/20">
          {data.cities?.map((c: any) => (
            <button key={c.city} onClick={() => setSelectedCity(c.city)} className="px-2 py-2 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap" style={{ color: selectedCity === c.city ? ACCENT : 'rgba(255,255,255,0.3)', background: selectedCity === c.city ? ACCENT_DIM : 'transparent' }}>
              {c.city}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'cities' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">City</th>
                <th className="px-2 py-1.5 text-right font-bold">Temp</th>
                <th className="px-2 py-1.5 text-right font-bold">Normal</th>
                <th className="px-2 py-1.5 text-right font-bold">Depart</th>
                <th className="px-2 py-1.5 text-right font-bold">HDD YTD</th>
                <th className="px-2 py-1.5 text-right font-bold">CDD YTD</th>
              </tr>
            </thead>
            <tbody>
              {data.cities?.map((c: any) => (
                <tr key={c.city} className={`border-b border-border/5 hover:bg-white/[0.02] ${c.city === selectedCity ? 'bg-white/[0.03]' : ''}`} onClick={() => setSelectedCity(c.city)}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.city}</span>
                    <span className="text-neutral/30 ml-1.5 text-[7px]">{c.state}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.currentTemp}°F</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.normalTemp}°F</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${c.departure > 0 ? 'text-bearish' : c.departure < 0 ? 'text-bullish' : 'text-white/40'}`}>
                    {c.departure > 0 ? '+' : ''}{c.departure}°F
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: '#f97316' }}>
                    {c.hddCumulative} <span className="text-[7px] text-neutral/30">({c.hddNormal})</span>
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>
                    {c.cddCumulative} <span className="text-[7px] text-neutral/30">({c.cddNormal})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'contracts' && (() => {
          const cityContracts = data.contracts?.filter((c: any) => c.city === selectedCity);
          return (
            <div className="p-0">
              <div className="text-[8px] font-mono text-neutral/40 uppercase px-3 py-2 border-b border-border/10">
                Futures — {selectedCity}
              </div>
              <table className="w-full text-[9px] font-mono">
                <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold">Month</th>
                    <th className="px-2 py-1.5 text-left font-bold">Type</th>
                    <th className="px-2 py-1.5 text-right font-bold">Last</th>
                    <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                    <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                    <th className="px-2 py-1.5 text-right font-bold">OI</th>
                    <th className="px-2 py-1.5 text-right font-bold">Impl Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {cityContracts?.map((c: any) => (
                    <tr key={c.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.tenor}</td>
                      <td className="px-2 py-1.5">
                        <span className={`text-[7px] font-bold px-1 py-0 ${c.type === 'HDD' ? 'bg-orange-500/15 text-orange-400' : 'bg-sky-400/15 text-sky-400'}`}>{c.type}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.lastPrice}</td>
                      <td className={`px-2 py-1.5 text-right ${c.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {c.change1d >= 0 ? '+' : ''}{c.change1d}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/50">{c.volume}</td>
                      <td className="px-2 py-1.5 text-right text-white/40">{c.openInterest}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{c.impliedTemp}°F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {tab === 'strips' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Seasonal Strip Prices</div>
            {data.cities?.map((c: any) => {
              const strips = data.seasonalStrips?.filter((s: any) => s.city === c.city);
              if (!strips?.length) return null;
              return (
                <div key={c.city} className="border border-border/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{c.city}</span>
                    <span className="text-[8px] font-mono text-neutral/40">{c.currentTemp}°F</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[8px] font-mono">
                    {strips.map((s: any) => (
                      <div key={s.strip}>
                        <div className="text-neutral/40 mb-1">{s.strip}</div>
                        <div className="text-white/80 font-bold">{s.price}</div>
                        <div className={`text-[7px] ${s.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {s.change >= 0 ? '+' : ''}{s.change}
                        </div>
                        <div className="text-[7px] text-neutral/30">Impl: {s.impliedAvgTemp}°F</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'cat' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Cumulative Average Temperature Index</div>
            {data.catIndices?.map((c: any) => (
              <div key={c.city} className="flex items-center gap-3">
                <span className="text-[9px] font-mono w-20 text-right font-bold" style={{ color: ACCENT }}>{c.city}</span>
                <div className="flex-1 h-5 bg-white/5 overflow-hidden relative">
                  <div style={{ width: `${Math.min(100, (c.current / (c.normal * 1.3)) * 100)}%`, height: '100%', background: ACCENT, opacity: 0.3 }} />
                  <div style={{ position: 'absolute', left: `${Math.min(100, (c.normal / (c.normal * 1.3)) * 100)}%`, top: 0, width: '2px', height: '100%', background: '#fbbf24' }} />
                  <span className="absolute right-1 top-0.5 text-[7px] text-white/50">{c.current} / {c.normal}</span>
                </div>
                <span className={`text-[8px] font-mono w-14 text-right ${c.deviation > 0 ? 'text-bearish' : 'text-bullish'}`}>
                  {c.deviation > 0 ? '+' : ''}{c.deviation}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-4 text-[7px] font-mono text-neutral/30 mt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-1.5" style={{ background: ACCENT, opacity: 0.5 }} /> Current CAT</span>
              <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-yellow-500" /> Normal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
