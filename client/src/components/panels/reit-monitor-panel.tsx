import { useState, useMemo } from 'react';
import { useReitMonitor } from '../../api/hooks/use-reit-monitor';

const ACCENT = '#a3e635'; // lime-400
const ACCENT_DIM = 'rgba(163,230,53,0.08)';

type Tab = 'reits' | 'types' | 'valuation' | 'summary';

export function ReitMonitorPanel() {
  const { data, isLoading, error } = useReitMonitor();
  const [tab, setTab] = useState<Tab>('reits');
  const [sortCol, setSortCol] = useState<string>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);

  const reitsSorted = useMemo(() => {
    if (!data?.reits) return [];
    const arr = [...data.reits];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0; const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading REIT data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'reits', label: 'REITS' },
    { key: 'types', label: 'BY TYPE' },
    { key: 'valuation', label: 'VALUATION' },
    { key: 'summary', label: 'SUMMARY' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

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
        {tab === 'reits' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="type" label="Type" />
                <SortHeader col="price" label="Price" right />
                <SortHeader col="nav" label="NAV" right />
                <SortHeader col="premDisc" label="Prem/Disc" right />
                <SortHeader col="divYield" label="Div Yield" right />
                <SortHeader col="ffoYield" label="FFO Yield" right />
                <SortHeader col="marketCap" label="Mkt Cap" right />
              </tr>
            </thead>
            <tbody>
              {reitsSorted.map((r: any) => (
                <tr key={r.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{r.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{r.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-white/40">{r.type}</td>
                  <td className="px-2 py-1.5 text-right text-white/70 font-bold">${r.price}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">${r.nav}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${r.premDisc >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {r.premDisc >= 0 ? '+' : ''}{r.premDisc}%
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{r.divYield}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{r.ffoYield}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">${r.marketCap}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'types' && (
          <div className="p-3 space-y-3">
            {data.typeAverages?.map((t: any) => (
              <div key={t.type} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{t.type}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{t.count} REITs</span>
                </div>
                <div className="grid grid-cols-5 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg P/D</div>
                    <div className={t.avgPremDisc >= 0 ? 'text-bullish font-bold' : 'text-bearish font-bold'}>{t.avgPremDisc >= 0 ? '+' : ''}{t.avgPremDisc}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">FFO Yield</div>
                    <div className="text-white/80 font-bold">{t.avgFFOYield}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Div Yield</div>
                    <div style={{ color: ACCENT }} className="font-bold">{t.avgDivYield}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Occupancy</div>
                    <div className="text-white/70 font-bold">{t.avgOccupancy}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Cap Rate</div>
                    <div className="text-white/60">{t.avgCapRate}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'valuation' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="capRate" label="Cap Rate" right />
                <SortHeader col="occupancy" label="Occupancy" right />
                <SortHeader col="debtToEquity" label="D/E" right />
                <SortHeader col="payoutRatio" label="Payout" right />
                <SortHeader col="spread10y" label="vs 10Y" right />
                <SortHeader col="totalReturn1y" label="1Y Return" right />
              </tr>
            </thead>
            <tbody>
              {reitsSorted.map((r: any) => (
                <tr key={r.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{r.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{r.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70">{r.capRate}%</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={r.occupancy >= 95 ? 'text-bullish' : r.occupancy >= 90 ? 'text-white/70' : 'text-bearish'}>{r.occupancy}%</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={r.debtToEquity > 1.0 ? 'text-bearish' : 'text-white/60'}>{r.debtToEquity}x</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={r.payoutRatio > 90 ? 'text-bearish' : 'text-white/60'}>{r.payoutRatio}%</span>
                  </td>
                  <td className={`px-2 py-1.5 text-right ${r.spread10y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {r.spread10y >= 0 ? '+' : ''}{r.spread10y}%
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${r.totalReturn1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {r.totalReturn1y >= 0 ? '+' : ''}{r.totalReturn1y}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'summary' && (
          <div className="p-3 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Total Market Cap</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalMarketCap}T</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Div Yield</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgDivYield}%</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">10Y Treasury</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.treasury10y}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Prem/Disc</div>
                <div className={`text-[14px] font-mono font-black ${(data.summary?.avgPremDisc ?? 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {(data.summary?.avgPremDisc ?? 0) >= 0 ? '+' : ''}{data.summary?.avgPremDisc}%
                </div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg FFO Yield</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.avgFFOYield}%</div>
              </div>
            </div>

            {/* Yield bar chart */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Dividend Yield Comparison</div>
              {data.reits?.sort((a: any, b: any) => b.divYield - a.divYield).map((r: any) => (
                <div key={r.ticker} className="flex items-center gap-2 py-0.5">
                  <span className="text-[8px] font-mono w-10 text-right" style={{ color: ACCENT }}>{r.ticker}</span>
                  <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
                    <div style={{ width: `${(r.divYield / 8) * 100}%`, height: '100%', background: ACCENT, opacity: 0.4 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/50 w-10 text-right">{r.divYield}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
