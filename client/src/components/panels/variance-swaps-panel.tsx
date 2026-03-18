import { useState } from 'react';
import { useVarianceSwaps } from '../../api/hooks/use-variance-swaps';

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.08)';

type Tab = 'termStructure' | 'vrp' | 'convexity' | 'sectors';

export function VarianceSwapsPanel() {
  const { data, isLoading, error } = useVarianceSwaps();
  const [tab, setTab] = useState<Tab>('termStructure');
  const [selectedIdx, setSelectedIdx] = useState('SPX');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading variance swap data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'termStructure', label: 'TERM STRUCTURE' },
    { key: 'vrp', label: 'VRP HISTORY' },
    { key: 'convexity', label: 'CONVEXITY' },
    { key: 'sectors', label: 'SECTORS' },
  ];

  const idxData = data.indices?.find((i: any) => i.id === selectedIdx);

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg VRP</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgVRP} vol pts</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Implied</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.avgImpliedVol}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Realized</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgRealizedVol}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalNotional}B</div>
        </div>
      </div>

      <div className="flex items-center border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1 px-2 border-r border-border/20">
          {data.indices?.map((idx: any) => (
            <button key={idx.id} onClick={() => setSelectedIdx(idx.id)} className="px-2 py-2 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: selectedIdx === idx.id ? ACCENT : 'rgba(255,255,255,0.3)', background: selectedIdx === idx.id ? ACCENT_DIM : 'transparent' }}>
              {idx.id}
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
        {tab === 'termStructure' && idxData && (
          <div className="p-0">
            <div className="grid grid-cols-3 gap-0 border-b border-border/10 px-3 py-2">
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">Spot Vol (30d)</div>
                <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{idxData.spotVol}%</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">Index</div>
                <div className="text-[11px] font-mono font-black text-white/80">{idxData.name}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral/40 uppercase">Region</div>
                <div className="text-[11px] font-mono font-black text-white/60">{idxData.region}</div>
              </div>
            </div>

            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">Var Strike</th>
                  <th className="px-2 py-1.5 text-right font-bold">Implied</th>
                  <th className="px-2 py-1.5 text-right font-bold">Realized</th>
                  <th className="px-2 py-1.5 text-right font-bold">VRP</th>
                  <th className="px-2 py-1.5 text-right font-bold">Mark</th>
                  <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                </tr>
              </thead>
              <tbody>
                {idxData.termStructure?.map((t: any) => (
                  <tr key={t.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{t.varSwapStrike}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{t.impliedVar}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{t.realizedVar}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${t.varRiskPremium > 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {t.varRiskPremium > 0 ? '+' : ''}{t.varRiskPremium}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60">{t.mark}</td>
                    <td className={`px-2 py-1.5 text-right ${t.change1d >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                      {t.change1d >= 0 ? '+' : ''}{t.change1d}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'vrp' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Variance Risk Premium — 6-Month History (Vol Points)</div>
            {data.indices?.map((idx: any) => (
              <div key={idx.id} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idx.id}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{idx.region}</span>
                </div>
                <div className="flex items-end gap-2 h-12">
                  {idx.vrpHistory?.map((v: any, i: number) => {
                    const maxVrp = Math.max(...idx.vrpHistory.map((x: any) => Math.abs(x.vrp)));
                    const h = maxVrp > 0 ? (Math.abs(v.vrp) / maxVrp) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full relative" style={{ height: '40px' }}>
                          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${h}%`, background: v.vrp >= 0 ? ACCENT : '#ef4444', opacity: 0.4 }} />
                        </div>
                        <div className="text-[6px] text-neutral/30 mt-0.5">{v.month}</div>
                        <div className={`text-[7px] font-bold ${v.vrp >= 0 ? 'text-white/60' : 'text-bearish'}`}>{v.vrp > 0 ? '+' : ''}{v.vrp}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'convexity' && idxData && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Convexity Adjustment — {idxData.id} ({idxData.name})</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">ATM Vol</th>
                  <th className="px-2 py-1.5 text-right font-bold">Var Strike</th>
                  <th className="px-2 py-1.5 text-right font-bold">Convexity Adj</th>
                </tr>
              </thead>
              <tbody>
                {data.convexity?.filter((c: any) => c.index === selectedIdx).map((c: any) => (
                  <tr key={c.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{c.atmVol}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.varSwapStrike}</td>
                    <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>+{c.convexityAdj}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 text-[8px] font-mono text-neutral/40 uppercase mb-2">Convexity by Tenor</div>
            <div className="flex items-end gap-4 h-16">
              {data.convexity?.filter((c: any) => c.index === selectedIdx).map((c: any) => {
                const maxAdj = Math.max(...data.convexity.filter((x: any) => x.index === selectedIdx).map((x: any) => x.convexityAdj));
                return (
                  <div key={c.tenor} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: '50px' }}>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(c.convexityAdj / maxAdj) * 100}%`, background: ACCENT, opacity: 0.35 }} />
                    </div>
                    <div className="text-[7px] text-neutral/30">{c.tenor}</div>
                    <div className="text-[7px] font-bold" style={{ color: ACCENT }}>+{c.convexityAdj}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'sectors' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Sector Variance Decomposition</div>
            {data.sectorVariance?.map((s: any) => (
              <div key={s.sector} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.sector}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{s.dispersionContribution}% of total</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Implied Var</div>
                    <div className="text-white/80 font-bold">{s.impliedVariance}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Realized Var</div>
                    <div className="text-white/60">{s.realizedVariance}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">VRP</div>
                    <div className={`font-bold ${s.vrp >= 0 ? 'text-bullish' : 'text-bearish'}`}>{s.vrp > 0 ? '+' : ''}{s.vrp}</div>
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
