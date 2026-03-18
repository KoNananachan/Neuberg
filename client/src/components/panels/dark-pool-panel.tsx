import { useState, useMemo } from 'react';
import { useDarkPool } from '../../api/hooks/use-dark-pool';

const ACCENT = '#64748b'; // slate-500
const ACCENT_DIM = 'rgba(100,116,139,0.08)';

type Tab = 'venues' | 'symbols' | 'blocks' | 'time';

export function DarkPoolPanel() {
  const { data, isLoading, error } = useDarkPool();
  const [tab, setTab] = useState<Tab>('venues');
  const [sortCol, setSortCol] = useState<string>('volumeShares');
  const [sortAsc, setSortAsc] = useState(false);

  const venuesSorted = useMemo(() => {
    if (!data?.atsVenues) return [];
    const arr = [...data.atsVenues];
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

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading dark pool data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'venues', label: 'ATS VENUES' },
    { key: 'symbols', label: 'TOP SYMBOLS' },
    { key: 'blocks', label: 'BLOCKS' },
    { key: 'time', label: 'TIME DIST' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Dark Volume</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.totalDarkVolume}M</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Mkt Share</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.darkPoolPct}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">ATS Count</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.totalATS}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Improv</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgPriceImprovement}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Top ATS</div>
          <div className="text-[11px] font-mono font-black text-white/60 truncate">{data.summary?.largestATS}</div>
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
        {tab === 'venues' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="name" label="Venue" />
                <SortHeader col="volumeShares" label="Vol (M)" right />
                <SortHeader col="marketShare" label="Share" right />
                <SortHeader col="avgOrderSize" label="Avg Size" right />
                <SortHeader col="priceImprovement" label="Improv" right />
                <SortHeader col="fillRate" label="Fill%" right />
                <SortHeader col="change1d" label="1D" right />
              </tr>
            </thead>
            <tbody>
              {venuesSorted.map((v: any) => (
                <tr key={v.name} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{v.name}</span>
                    <span className="text-neutral/30 ml-1.5 text-[7px]">{v.type}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{v.volumeShares}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{v.marketShare}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{v.avgOrderSize}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{v.priceImprovement}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{v.fillRate}%</td>
                  <td className={`px-2 py-1.5 text-right ${v.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {v.change1d >= 0 ? '+' : ''}{v.change1d}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'symbols' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Symbol</th>
                <th className="px-2 py-1.5 text-right font-bold">Dark Vol</th>
                <th className="px-2 py-1.5 text-right font-bold">Dark%</th>
                <th className="px-2 py-1.5 text-right font-bold">Improv</th>
                <th className="px-2 py-1.5 text-right font-bold">Avg Size</th>
                <th className="px-2 py-1.5 text-right font-bold">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {data.topSymbols?.map((s: any) => (
                <tr key={s.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.ticker}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{s.darkVolume}M</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: s.darkPct >= 45 ? '#f97316' : ACCENT }}>{s.darkPct}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{s.priceImprovement}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{s.avgTradeSize}</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{s.blockTradeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'blocks' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Block Trade Summary</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Total Blocks</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.blockTrades?.totalBlocks}</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Block Size</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.blockTrades?.avgBlockSize}</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Largest Block</div>
                <div className="text-[12px] font-mono font-black" style={{ color: ACCENT }}>{data.blockTrades?.largestBlock?.ticker}</div>
                <div className="text-[9px] font-mono text-white/50">{data.blockTrades?.largestBlock?.size} shares</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Block % of Dark</div>
                <div className="text-[14px] font-mono font-black text-white/60">{data.blockTrades?.blockPctOfDark}%</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'time' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-3">Intraday Dark Pool Volume Distribution (ET)</div>
            <div className="space-y-2">
              {data.timeDistribution?.map((t: any) => (
                <div key={t.period} className="flex items-center gap-3">
                  <span className="text-[8px] font-mono w-20 text-right text-white/50">{t.period}</span>
                  <div className="flex-1 h-4 bg-white/5 overflow-hidden relative">
                    <div style={{ width: `${t.pctOfDaily}%`, height: '100%', background: ACCENT, opacity: 0.4 }} />
                    <span className="absolute right-1 top-0.5 text-[7px] text-white/50">{t.pctOfDaily}%</span>
                  </div>
                  <span className="text-[8px] font-mono text-white/40 w-14 text-right">{t.volumeShares}M</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
