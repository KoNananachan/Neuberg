import { useState, useMemo } from 'react';
import { useLeveragedLoans } from '../../api/hooks/use-leveraged-loans';

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.08)';

type Tab = 'loans' | 'indices' | 'pipeline' | 'sectors';

export function LeveragedLoansPanel() {
  const { data, isLoading, error } = useLeveragedLoans();
  const [tab, setTab] = useState<Tab>('loans');
  const [sortCol, setSortCol] = useState<string>('price');
  const [sortAsc, setSortAsc] = useState(false);

  const loansSorted = useMemo(() => {
    if (!data?.loans) return [];
    const arr = [...data.loans];
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

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading leveraged loan data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'loans', label: 'LOANS' },
    { key: 'indices', label: 'INDICES' },
    { key: 'pipeline', label: 'PIPELINE' },
    { key: 'sectors', label: 'SECTORS' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Price</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Outstanding</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalOutstanding}T</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Distressed</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.distressedCount}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Default Rate</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.defaultRate}%</div>
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
        {tab === 'loans' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="issuer" label="Issuer" />
                <SortHeader col="rating" label="Rating" />
                <SortHeader col="price" label="Price" right />
                <SortHeader col="change1d" label="1D" right />
                <SortHeader col="spread" label="Spread" right />
                <SortHeader col="yield" label="Yield" right />
                <SortHeader col="size" label="Size" right />
                <SortHeader col="bidAskSpread" label="B/A" right />
              </tr>
            </thead>
            <tbody>
              {loansSorted.map((l: any) => (
                <tr key={l.issuer} className={`border-b border-border/5 hover:bg-white/[0.02] ${l.distressed ? 'bg-bearish/5' : ''}`}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: l.distressed ? '#f87171' : ACCENT }}>{l.issuer}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{l.sector}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${l.rating.startsWith('BB') ? 'bg-bullish/15 text-bullish' : l.rating.startsWith('B') && !l.rating.startsWith('BB') ? 'bg-yellow-500/15 text-yellow-400' : 'bg-bearish/15 text-bearish'}`}>
                      {l.rating}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: l.price >= 97 ? '#4ade80' : l.price >= 90 ? 'rgba(255,255,255,0.8)' : '#f87171' }}>{l.price}</td>
                  <td className={`px-2 py-1.5 text-right ${l.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {l.change1d >= 0 ? '+' : ''}{l.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{l.spread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{l.yield}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">${l.size}M</td>
                  <td className="px-2 py-1.5 text-right text-white/40">{l.bidAskSpread}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'indices' && (
          <div className="p-3 space-y-3">
            {data.indices?.map((idx: any) => (
              <div key={idx.id} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idx.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{idx.name}</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Level</div>
                    <div className="text-white/80 font-bold">{idx.level}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Spread</div>
                    <div style={{ color: ACCENT }} className="font-bold">{idx.spread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">1D Chg</div>
                    <div className={idx.change1d >= 0 ? 'text-bullish' : 'text-bearish'}>{idx.change1d >= 0 ? '+' : ''}{idx.change1d}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">MTD</div>
                    <div className={idx.mtdReturn >= 0 ? 'text-bullish' : 'text-bearish'}>{idx.mtdReturn >= 0 ? '+' : ''}{idx.mtdReturn}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">YTD</div>
                    <div className={idx.ytdReturn >= 0 ? 'text-bullish font-bold' : 'text-bearish font-bold'}>{idx.ytdReturn >= 0 ? '+' : ''}{idx.ytdReturn}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pipeline' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-left font-bold">Rating</th>
                <th className="px-2 py-1.5 text-right font-bold">Size ($M)</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread</th>
                <th className="px-2 py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.pipeline?.map((p: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{p.issuer}</td>
                  <td className="px-2 py-1.5 text-white/50">{p.type}</td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${p.rating.startsWith('BB') ? 'bg-bullish/15 text-bullish' : p.rating.startsWith('B') && !p.rating.startsWith('BB') ? 'bg-yellow-500/15 text-yellow-400' : 'bg-bearish/15 text-bearish'}`}>
                      {p.rating}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70">${p.size}M</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{p.spread}bp</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[7px] font-bold px-1.5 py-0.5 ${p.status === 'Pricing' ? 'bg-bullish/15 text-bullish' : p.status === 'In Market' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-white/50'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'sectors' && (
          <div className="p-3 space-y-3">
            {data.sectors?.map((s: any) => (
              <div key={s.sector} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.sector}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{s.count} loans</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Price</div>
                    <div className="text-white/80 font-bold">{s.avgPrice}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Avg Spread</div>
                    <div style={{ color: ACCENT }} className="font-bold">{s.avgSpread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Total Size</div>
                    <div className="text-white/60">${s.totalSize}M</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Price distribution bars */}
            <div className="mt-4">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Price Distribution</div>
              {data.loans?.sort((a: any, b: any) => a.price - b.price).map((l: any) => (
                <div key={l.issuer} className="flex items-center gap-2 py-0.5">
                  <span className="text-[7px] font-mono w-20 text-right truncate" style={{ color: l.distressed ? '#f87171' : ACCENT }}>{l.issuer}</span>
                  <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
                    <div style={{ width: `${((l.price - 70) / 32) * 100}%`, height: '100%', background: l.price >= 97 ? '#4ade80' : l.price >= 90 ? ACCENT : '#f87171', opacity: 0.4 }} />
                  </div>
                  <span className="text-[7px] font-mono text-white/50 w-8 text-right">{l.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
