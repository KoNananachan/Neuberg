import { useState, useMemo } from 'react';
import { useDividendSwaps } from '../../api/hooks/use-dividend-swaps';

const ACCENT = '#84cc16'; // lime-500
const ACCENT_DIM = 'rgba(132,204,22,0.08)';

type Tab = 'indices' | 'stocks' | 'seasonal' | 'growth';

export function DividendSwapsPanel() {
  const { data, isLoading, error } = useDividendSwaps();
  const [tab, setTab] = useState<Tab>('indices');
  const [selectedIdx, setSelectedIdx] = useState('SX5E');

  const stocksSorted = useMemo(() => {
    if (!data?.stockSwaps) return [];
    return [...data.stockSwaps].sort((a: any, b: any) => b.divYield - a.divYield);
  }, [data]);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading dividend swap data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'indices', label: 'INDEX SWAPS' },
    { key: 'stocks', label: 'SINGLE STOCK' },
    { key: 'seasonal', label: 'SEASONALITY' },
    { key: 'growth', label: 'SECTOR GROWTH' },
  ];

  const idxData = data.indexSwaps?.find((i: any) => i.id === selectedIdx);

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
        {tab === 'indices' && (
          <div className="p-0">
            {/* Index selector */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-border/10">
              {data.indexSwaps?.map((idx: any) => (
                <button key={idx.id} onClick={() => setSelectedIdx(idx.id)} className="px-2 py-1 text-[8px] font-mono font-bold uppercase transition-colors" style={{ color: selectedIdx === idx.id ? ACCENT : 'rgba(255,255,255,0.3)', background: selectedIdx === idx.id ? ACCENT_DIM : 'transparent', border: selectedIdx === idx.id ? `1px solid ${ACCENT}30` : '1px solid transparent' }}>
                  {idx.id}
                </button>
              ))}
            </div>

            {idxData && (
              <>
                <div className="grid grid-cols-3 gap-0 border-b border-border/10 px-3 py-2">
                  <div>
                    <div className="text-[7px] font-mono text-neutral/40 uppercase">Spot Dividend</div>
                    <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{idxData.spotDiv}</div>
                  </div>
                  <div>
                    <div className="text-[7px] font-mono text-neutral/40 uppercase">2Y Growth</div>
                    <div className={`text-[11px] font-mono font-black ${idxData.divGrowth >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {idxData.divGrowth >= 0 ? '+' : ''}{idxData.divGrowth}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[7px] font-mono text-neutral/40 uppercase">Region</div>
                    <div className="text-[11px] font-mono font-black text-white/60">{idxData.region}</div>
                  </div>
                </div>

                <table className="w-full text-[9px] font-mono">
                  <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-bold">Year</th>
                      <th className="px-2 py-1.5 text-right font-bold">Implied</th>
                      <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                      <th className="px-2 py-1.5 text-right font-bold">Bid</th>
                      <th className="px-2 py-1.5 text-right font-bold">Ask</th>
                      <th className="px-2 py-1.5 text-right font-bold">OI</th>
                      <th className="px-2 py-1.5 text-right font-bold">Realized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idxData.terms?.map((t: any) => (
                      <tr key={t.year} className="border-b border-border/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.year}</td>
                        <td className="px-2 py-1.5 text-right text-white/80 font-bold">{t.impliedDiv}</td>
                        <td className={`px-2 py-1.5 text-right ${t.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {t.change1d >= 0 ? '+' : ''}{t.change1d}
                        </td>
                        <td className="px-2 py-1.5 text-right text-white/50">{t.bid}</td>
                        <td className="px-2 py-1.5 text-right text-white/50">{t.ask}</td>
                        <td className="px-2 py-1.5 text-right text-white/40">{t.openInterest}</td>
                        <td className="px-2 py-1.5 text-right">{t.realizedYTD !== null ? <span style={{ color: ACCENT }}>{t.realizedYTD}</span> : <span className="text-neutral/20">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {tab === 'stocks' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Stock</th>
                <th className="px-2 py-1.5 text-right font-bold">Current</th>
                <th className="px-2 py-1.5 text-right font-bold">Yield</th>
                {data.summary?.years?.slice(0, 5).map((y: number) => (
                  <th key={y} className="px-2 py-1.5 text-right font-bold">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stocksSorted.map((stk: any) => (
                <tr key={stk.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{stk.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{stk.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${stk.currentDiv}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{stk.divYield}%</td>
                  {stk.terms?.map((t: any) => (
                    <td key={t.year} className="px-2 py-1.5 text-right">
                      <span className="text-white/70">${t.impliedDiv}</span>
                      <span className={`block text-[7px] ${t.impliedGrowth >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {t.impliedGrowth >= 0 ? '+' : ''}{t.impliedGrowth}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'seasonal' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Quarterly Dividend Seasonality (Points)</div>
            {data.seasonality?.map((s: any) => {
              const total = s.q1 + s.q2 + s.q3 + s.q4;
              return (
                <div key={s.id} className="border border-border/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40">Total: {Math.round(total * 100) / 100}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[8px] font-mono">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
                      const val = [s.q1, s.q2, s.q3, s.q4][i];
                      const pct = Math.round((val / total) * 100);
                      return (
                        <div key={q}>
                          <div className="text-neutral/40 mb-1">{q}</div>
                          <div className="h-12 bg-white/5 relative">
                            <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${pct}%`, background: ACCENT, opacity: 0.3 }} />
                          </div>
                          <div className="text-white/70 font-bold mt-0.5">{val}</div>
                          <div className="text-neutral/30 text-[7px]">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'growth' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Implied Dividend Growth by Sector</div>
            {data.sectorGrowth?.map((s: any) => (
              <div key={s.sector} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.sector}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{s.count} names</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">1Y Implied Growth</div>
                    <div className={`text-[12px] font-bold ${s.avgGrowth1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {s.avgGrowth1y >= 0 ? '+' : ''}{s.avgGrowth1y}%
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral/40">3Y Implied Growth</div>
                    <div className={`text-[12px] font-bold ${s.avgGrowth3y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {s.avgGrowth3y >= 0 ? '+' : ''}{s.avgGrowth3y}%
                    </div>
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
