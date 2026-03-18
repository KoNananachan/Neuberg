import { useState } from 'react';
import { useCrossCurrencySwaps } from '../../api/hooks/use-cross-currency-swaps';

const ACCENT = '#67e8f9'; // cyan-300
const ACCENT_DIM = 'rgba(103,232,249,0.08)';

type Tab = 'pairs' | 'termStructure' | 'swaps' | 'hedging';

export function CrossCurrencySwapsPanel() {
  const { data, isLoading, error } = useCrossCurrencySwaps();
  const [tab, setTab] = useState<Tab>('pairs');
  const [selectedPair, setSelectedPair] = useState('USD/EUR');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading cross-currency swap data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pairs', label: 'PAIRS' },
    { key: 'termStructure', label: 'TERM STRUCT' },
    { key: 'swaps', label: 'ACTIVE SWAPS' },
    { key: 'hedging', label: 'HEDGE COST' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalNotional}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Basis</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.avgBasis}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Most Active</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.mostActivePair}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Active Swaps</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.activeSwaps}</div>
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
        {tab === 'pairs' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Pair</th>
                <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                <th className="px-2 py-1.5 text-right font-bold">3M Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">1Y Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">5Y Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Notional</th>
              </tr>
            </thead>
            <tbody>
              {data.currencyPairs?.map((p: any) => (
                <tr key={p.pair} className={`border-b border-border/5 hover:bg-white/[0.02] cursor-pointer ${p.pair === selectedPair ? 'bg-white/[0.03]' : ''}`} onClick={() => setSelectedPair(p.pair)}>
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{p.pair}</td>
                  <td className="px-2 py-1.5 text-right text-white/80">{p.spotRate}</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{p.basis3M}bp</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{p.basis1Y}bp</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{p.basis5Y}bp</td>
                  <td className={`px-2 py-1.5 text-right ${p.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {p.change1d >= 0 ? '+' : ''}{p.change1d}bp
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">${p.notionalOutstanding}B</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'termStructure' && (() => {
          const tsData = data.termStructure?.filter((t: any) => t.pair === selectedPair);
          return (
            <div className="p-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Basis Term Structure — {selectedPair}</div>
              <div className="flex items-center gap-1 mb-3">
                {data.currencyPairs?.slice(0, 4).map((p: any) => (
                  <button key={p.pair} onClick={() => setSelectedPair(p.pair)} className="px-2 py-1 text-[8px] font-mono font-bold" style={{ color: selectedPair === p.pair ? ACCENT : 'rgba(255,255,255,0.3)', background: selectedPair === p.pair ? ACCENT_DIM : 'transparent', border: selectedPair === p.pair ? `1px solid ${ACCENT}30` : '1px solid transparent' }}>
                    {p.pair}
                  </button>
                ))}
              </div>
              <table className="w-full text-[9px] font-mono mb-4">
                <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                    <th className="px-2 py-1.5 text-right font-bold">Basis (bp)</th>
                    <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                    <th className="px-2 py-1.5 text-right font-bold">Implied Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {tsData?.map((t: any) => (
                    <tr key={t.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.tenor}</td>
                      <td className="px-2 py-1.5 text-right text-bearish font-bold">{t.basisSpread}bp</td>
                      <td className={`px-2 py-1.5 text-right ${t.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {t.change1d >= 0 ? '+' : ''}{t.change1d}bp
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/60">{t.impliedRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Basis Curve</div>
              <div className="flex items-end gap-3 h-16">
                {tsData?.map((t: any) => {
                  const maxBasis = Math.max(...(tsData || []).map((x: any) => Math.abs(x.basisSpread)));
                  const h = maxBasis > 0 ? (Math.abs(t.basisSpread) / maxBasis) * 100 : 0;
                  return (
                    <div key={t.tenor} className="flex-1 flex flex-col items-center">
                      <div className="w-full relative" style={{ height: '50px' }}>
                        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${h}%`, background: '#ef4444', opacity: 0.3 }} />
                      </div>
                      <div className="text-[6px] text-neutral/30 mt-0.5">{t.tenor}</div>
                      <div className="text-[7px] text-bearish font-bold">{t.basisSpread}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {tab === 'swaps' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">ID</th>
                <th className="px-2 py-1.5 text-left font-bold">Pair</th>
                <th className="px-2 py-1.5 text-right font-bold">Notional</th>
                <th className="px-2 py-1.5 text-right font-bold">Dir</th>
                <th className="px-2 py-1.5 text-right font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">MTM</th>
              </tr>
            </thead>
            <tbody>
              {data.activeSwaps?.map((s: any) => (
                <tr key={s.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 text-white/40">{s.id}</td>
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.pair}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${s.notional}M</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[7px] font-bold px-1 py-0 ${s.direction === 'Pay USD' ? 'bg-bearish/15 text-bearish' : 'bg-bullish/15 text-bullish'}`}>{s.direction}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{s.tenor}</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{s.basisAtInception}bp</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${s.currentMTM >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {s.currentMTM >= 0 ? '+' : ''}${s.currentMTM}M
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'hedging' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">FX Hedging Cost — $100M Notional</div>
            {data.hedgingCosts?.map((h: any) => (
              <div key={h.pair} className="border border-border/10 p-3">
                <div className="text-[10px] font-mono font-black mb-2" style={{ color: ACCENT }}>{h.pair}</div>
                <table className="w-full text-[8px] font-mono">
                  <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                    <tr>
                      <th className="px-2 py-1 text-left font-bold">Tenor</th>
                      <th className="px-2 py-1 text-right font-bold">Basis</th>
                      <th className="px-2 py-1 text-right font-bold">Annual Cost</th>
                      <th className="px-2 py-1 text-right font-bold">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.tenors?.map((t: any) => (
                      <tr key={t.tenor} className="border-b border-border/5">
                        <td className="px-2 py-1" style={{ color: ACCENT }}>{t.tenor}</td>
                        <td className="px-2 py-1 text-right text-bearish">{t.basis}bp</td>
                        <td className="px-2 py-1 text-right text-white/70">${t.annualCost}K</td>
                        <td className="px-2 py-1 text-right text-white/80 font-bold">${t.totalCost}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
