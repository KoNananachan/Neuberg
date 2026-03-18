import { useState } from 'react';
import { useSwaptionVol } from '../../api/hooks/use-swaption-vol';

const ACCENT = '#a78bfa'; // violet-400
const ACCENT_DIM = 'rgba(167,139,250,0.08)';

type Tab = 'cube' | 'changes' | 'skew' | 'benchmarks';

export function SwaptionVolPanel() {
  const { data, isLoading, error } = useSwaptionVol();
  const [tab, setTab] = useState<Tab>('cube');
  const [currency, setCurrency] = useState('USD');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading swaption vol data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cube', label: 'VOL CUBE' },
    { key: 'changes', label: '1D CHANGES' },
    { key: 'skew', label: 'SKEW' },
    { key: 'benchmarks', label: 'BENCHMARKS' },
  ];

  const ccyData = data.currencies?.find((c: any) => c.currency === currency);
  const tenors = data.summary?.tenors ?? [];

  const volColor = (vol: number) => {
    if (vol >= 110) return '#ef4444';
    if (vol >= 100) return '#f97316';
    if (vol >= 90) return '#fbbf24';
    if (vol >= 80) return '#a3e635';
    return '#22d3ee';
  };

  const changeColor = (chg: number) => chg > 0 ? '#f87171' : chg < 0 ? '#4ade80' : 'rgba(255,255,255,0.4)';

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Currency selector + tabs */}
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
        {tab === 'cube' && ccyData && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">ATM Normal Vol (bp) — {currency} Swaptions</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider">
                <tr>
                  <th className="px-1.5 py-1 text-left font-bold border-b border-border/10">Exp \ Tnr</th>
                  {tenors.map((t: string) => (
                    <th key={t} className="px-1.5 py-1 text-right font-bold border-b border-border/10">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccyData.volGrid?.map((row: any) => (
                  <tr key={row.expiry} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-1.5 py-1.5 font-bold" style={{ color: ACCENT }}>{row.expiry}</td>
                    {tenors.map((t: string) => (
                      <td key={t} className="px-1.5 py-1.5 text-right font-bold" style={{ color: volColor(row[t]) }}>
                        {row[t]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-2 text-[7px] font-mono text-neutral/40">
              <span>Vol:</span>
              {[{ label: '>110', color: '#ef4444' }, { label: '100-110', color: '#f97316' }, { label: '90-100', color: '#fbbf24' }, { label: '80-90', color: '#a3e635' }, { label: '<80', color: '#22d3ee' }].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="w-2 h-2" style={{ background: l.color, opacity: 0.6 }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === 'changes' && ccyData && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">1-Day Vol Changes (bp) — {currency}</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider">
                <tr>
                  <th className="px-1.5 py-1 text-left font-bold border-b border-border/10">Exp \ Tnr</th>
                  {tenors.map((t: string) => (
                    <th key={t} className="px-1.5 py-1 text-right font-bold border-b border-border/10">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccyData.changeGrid?.map((row: any) => (
                  <tr key={row.expiry} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-1.5 py-1.5 font-bold" style={{ color: ACCENT }}>{row.expiry}</td>
                    {tenors.map((t: string) => (
                      <td key={t} className="px-1.5 py-1.5 text-right" style={{ color: changeColor(row[t]) }}>
                        {row[t] > 0 ? '+' : ''}{row[t]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'skew' && ccyData && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Volatility Skew — {currency} (Normal Vol bp)</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Point</th>
                  <th className="px-2 py-1 text-right font-bold">10D Recv</th>
                  <th className="px-2 py-1 text-right font-bold">25D Recv</th>
                  <th className="px-2 py-1 text-right font-bold">ATM</th>
                  <th className="px-2 py-1 text-right font-bold">25D Pay</th>
                  <th className="px-2 py-1 text-right font-bold">10D Pay</th>
                  <th className="px-2 py-1 text-right font-bold">Skew</th>
                </tr>
              </thead>
              <tbody>
                {ccyData.skewPoints?.map((s: any, i: number) => {
                  const skew = Math.round((s.recv25d - s.pay25d) * 10) / 10;
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.expiry} x {s.tenor}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{s.recv10d}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{s.recv25d}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">{s.atm}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{s.pay25d}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{s.pay10d}</td>
                      <td className="px-2 py-1.5 text-right font-bold" style={{ color: skew > 0 ? '#f87171' : '#4ade80' }}>
                        {skew > 0 ? '+' : ''}{skew}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Term structure */}
            <div className="mt-4">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">1Y Expiry Term Structure — {currency}</div>
              <div className="space-y-1">
                {ccyData.termStructure1y?.map((t: any) => {
                  const maxVol = Math.max(...ccyData.termStructure1y.map((x: any) => x.vol));
                  return (
                    <div key={t.tenor} className="flex items-center gap-2">
                      <span className="text-[8px] font-mono w-8 text-right" style={{ color: ACCENT }}>{t.tenor}</span>
                      <div className="flex-1 h-3 bg-white/5 overflow-hidden">
                        <div style={{ width: `${(t.vol / maxVol) * 100}%`, height: '100%', background: volColor(t.vol), opacity: 0.35 }} />
                      </div>
                      <span className="text-[8px] font-mono text-white/60 w-10 text-right">{t.vol}bp</span>
                      <span className={`text-[7px] font-mono w-10 text-right ${t.change1d > 0 ? 'text-bearish' : t.change1d < 0 ? 'text-bullish' : 'text-neutral/30'}`}>
                        {t.change1d > 0 ? '+' : ''}{t.change1d}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'benchmarks' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Key Swaption Benchmarks (USD)</div>
            {data.benchmarks?.map((b: any) => (
              <div key={b.name} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{b.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">ATM Vol</div>
                    <div className="text-white/80 font-bold text-[11px]">{b.vol}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">1D Chg</div>
                    <div style={{ color: changeColor(b.change1d) }}>{b.change1d > 0 ? '+' : ''}{b.change1d}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">1W Chg</div>
                    <div style={{ color: changeColor(b.change1w) }}>{b.change1w > 0 ? '+' : ''}{b.change1w}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">1M Chg</div>
                    <div style={{ color: changeColor(b.change1m) }}>{b.change1m > 0 ? '+' : ''}{b.change1m}bp</div>
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
