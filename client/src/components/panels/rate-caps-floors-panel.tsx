import { useState } from 'react';
import { useRateCapsFloors } from '../../api/hooks/use-rate-caps-floors';

const ACCENT = '#2dd4bf'; // teal-400
const ACCENT_DIM = 'rgba(45,212,191,0.08)';

type Tab = 'caps' | 'floors' | 'collars' | 'forwards';

export function RateCapsFloorsPanel() {
  const { data, isLoading, error } = useRateCapsFloors();
  const [tab, setTab] = useState<Tab>('caps');
  const [currency, setCurrency] = useState('USD');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading rate caps/floors data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'caps', label: 'CAPS' },
    { key: 'floors', label: 'FLOORS' },
    { key: 'collars', label: 'COLLARS' },
    { key: 'forwards', label: 'FORWARDS' },
  ];

  const ccyData = data.currencies?.find((c: any) => c.currency === currency);
  const capStrikes = data.summary?.capStrikes ?? [];
  const floorStrikes = data.summary?.floorStrikes ?? [];

  const premColor = (p: number) => {
    if (p >= 500) return '#ef4444';
    if (p >= 300) return '#f97316';
    if (p >= 150) return '#fbbf24';
    if (p >= 50) return '#a3e635';
    return '#22d3ee';
  };

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1 px-2 border-r border-border/20">
          {data.currencies?.map((c: any) => (
            <button key={c.currency} onClick={() => setCurrency(c.currency)} className="px-2 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: currency === c.currency ? ACCENT : 'rgba(255,255,255,0.3)', background: currency === c.currency ? ACCENT_DIM : 'transparent' }}>
              {c.currency}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'caps' && ccyData && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Cap Premiums (bp per notional) — {currency} ({ccyData.name})</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider">
                <tr>
                  <th className="px-1.5 py-1 text-left font-bold border-b border-border/10">Tenor</th>
                  {capStrikes.map((s: number) => (
                    <th key={s} className="px-1.5 py-1 text-right font-bold border-b border-border/10">{s.toFixed(2)}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccyData.capGrid?.map((row: any) => (
                  <tr key={row.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-1.5 py-1.5 font-bold" style={{ color: ACCENT }}>{row.tenor}</td>
                    {capStrikes.map((s: number) => {
                      const cell = row[s.toFixed(2)];
                      return (
                        <td key={s} className="px-1.5 py-1.5 text-right" style={{ color: premColor(cell?.premium ?? 0) }}>
                          <span className="font-bold">{cell?.premium ?? '-'}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'floors' && ccyData && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Floor Premiums (bp per notional) — {currency}</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider">
                <tr>
                  <th className="px-1.5 py-1 text-left font-bold border-b border-border/10">Tenor</th>
                  {floorStrikes.map((s: number) => (
                    <th key={s} className="px-1.5 py-1 text-right font-bold border-b border-border/10">{s.toFixed(2)}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccyData.floorGrid?.map((row: any) => (
                  <tr key={row.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-1.5 py-1.5 font-bold" style={{ color: ACCENT }}>{row.tenor}</td>
                    {floorStrikes.map((s: number) => {
                      const cell = row[s.toFixed(2)];
                      return (
                        <td key={s} className="px-1.5 py-1.5 text-right" style={{ color: premColor(cell?.premium ?? 0) }}>
                          <span className="font-bold">{cell?.premium ?? '-'}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'collars' && ccyData && (
          <div className="p-3 space-y-4">
            {ccyData.collars?.map((collar: any, ci: number) => (
              <div key={ci}>
                <div className="text-[9px] font-mono font-black mb-2" style={{ color: ACCENT }}>
                  Collar: Buy {collar[0]?.capStrike}% Cap / Sell {collar[0]?.floorStrike}% Floor
                </div>
                <table className="w-full text-[8px] font-mono">
                  <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                    <tr>
                      <th className="px-2 py-1 text-left font-bold">Tenor</th>
                      <th className="px-2 py-1 text-right font-bold">Cap Prem</th>
                      <th className="px-2 py-1 text-right font-bold">Floor Prem</th>
                      <th className="px-2 py-1 text-right font-bold">Net Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collar?.map((c: any) => (
                      <tr key={c.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.tenor}</td>
                        <td className="px-2 py-1.5 text-right text-bearish">{c.capPremium}bp</td>
                        <td className="px-2 py-1.5 text-right text-bullish">-{c.floorPremium}bp</td>
                        <td className={`px-2 py-1.5 text-right font-bold ${c.netPremium > 0 ? 'text-bearish' : 'text-bullish'}`}>
                          {c.netPremium > 0 ? '' : ''}{c.netPremium}bp
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {tab === 'forwards' && ccyData && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Forward Rates & ATM Cap Vols — {currency}</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                  <th className="px-2 py-1.5 text-right font-bold">1Y Fwd</th>
                  <th className="px-2 py-1.5 text-right font-bold">2Y Fwd</th>
                  <th className="px-2 py-1.5 text-right font-bold">ATM Vol</th>
                </tr>
              </thead>
              <tbody>
                {ccyData.forwardRates?.map((f: any) => (
                  <tr key={f.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{f.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{f.spot}%</td>
                    <td className={`px-2 py-1.5 text-right ${f.forward1y < f.spot ? 'text-bullish' : 'text-white/60'}`}>{f.forward1y}%</td>
                    <td className={`px-2 py-1.5 text-right ${f.forward2y < f.spot ? 'text-bullish' : 'text-white/60'}`}>{f.forward2y}%</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{f.atmCapVol}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Rate Path Implied by Market</div>
              <div className="flex items-end gap-4 h-20">
                {ccyData.forwardRates?.map((f: any) => {
                  const maxRate = Math.max(...ccyData.forwardRates.map((x: any) => Math.max(x.spot, x.forward1y, x.forward2y)));
                  return (
                    <div key={f.tenor} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: '60px' }}>
                        {[{ v: f.spot, c: ACCENT }, { v: f.forward1y, c: '#fbbf24' }, { v: f.forward2y, c: '#a78bfa' }].map((bar, i) => (
                          <div key={i} className="flex-1 relative" style={{ height: '60px' }}>
                            <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(bar.v / maxRate) * 100}%`, background: bar.c, opacity: 0.35 }} />
                          </div>
                        ))}
                      </div>
                      <div className="text-[7px] text-neutral/30">{f.tenor}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-1 text-[7px] font-mono text-neutral/30">
                <span className="flex items-center gap-1"><span className="w-3 h-1.5" style={{ background: ACCENT, opacity: 0.5 }} /> Spot</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-yellow-500/50" /> 1Y Fwd</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-violet-400/50" /> 2Y Fwd</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
