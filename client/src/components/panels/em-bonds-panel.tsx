import { useState, useMemo } from 'react';
import { useEmBonds } from '../../api/hooks/use-em-bonds';

const ACCENT = '#ef4444'; // red-500
const ACCENT_DIM = 'rgba(239,68,68,0.08)';

type Tab = 'spreads' | 'indices' | 'yields' | 'regions';

export function EmBondsPanel() {
  const { data, isLoading, error } = useEmBonds();
  const [tab, setTab] = useState<Tab>('spreads');
  const [sortCol, setSortCol] = useState<string>('hardCurrSpread');
  const [sortAsc, setSortAsc] = useState(false);

  const countriesSorted = useMemo(() => {
    if (!data?.countries) return [];
    const arr = [...data.countries];
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

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading EM bond data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'spreads', label: 'SPREADS' },
    { key: 'indices', label: 'INDICES' },
    { key: 'yields', label: 'LOCAL YIELDS' },
    { key: 'regions', label: 'REGIONS' },
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
        {tab === 'spreads' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="name" label="Country" />
                <SortHeader col="rating" label="Rating" />
                <SortHeader col="hardCurrSpread" label="HC Spread" right />
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-right font-bold">1W</th>
                <th className="px-2 py-1.5 text-right font-bold">1M</th>
                <SortHeader col="cdsSpread5y" label="CDS 5Y" right />
                <SortHeader col="fxVol3m" label="FX Vol" right />
              </tr>
            </thead>
            <tbody>
              {countriesSorted.map((c: any) => (
                <tr key={c.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.id}</span>
                    <span className="text-neutral/30 ml-1.5">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${c.rating.startsWith('A') ? 'bg-bullish/15 text-bullish' : c.rating.startsWith('BBB') ? 'bg-yellow-500/15 text-yellow-400' : 'bg-bearish/15 text-bearish'}`}>
                      {c.rating}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{c.hardCurrSpread}bp</td>
                  <td className={`px-2 py-1.5 text-right ${c.spreadChange1d <= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.spreadChange1d > 0 ? '+' : ''}{c.spreadChange1d}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${c.spreadChange1w <= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.spreadChange1w > 0 ? '+' : ''}{c.spreadChange1w}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${c.spreadChange1m <= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.spreadChange1m > 0 ? '+' : ''}{c.spreadChange1m}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.cdsSpread5y}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.fxVol3m}%</td>
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
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Spread</div>
                    <div className="text-white/80 font-bold">{idx.spread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">1D Chg</div>
                    <div className={idx.spreadChange1d <= 0 ? 'text-bullish' : 'text-bearish'}>{idx.spreadChange1d > 0 ? '+' : ''}{idx.spreadChange1d}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">MTD Return</div>
                    <div className={idx.mtdReturn >= 0 ? 'text-bullish' : 'text-bearish'}>{idx.mtdReturn >= 0 ? '+' : ''}{idx.mtdReturn}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">YTD Return</div>
                    <div className={idx.ytdReturn >= 0 ? 'text-bullish font-bold' : 'text-bearish font-bold'}>{idx.ytdReturn >= 0 ? '+' : ''}{idx.ytdReturn}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'yields' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="name" label="Country" />
                <SortHeader col="localYield10y" label="10Y Yield" right />
                <SortHeader col="realYield" label="Real Yield" right />
                <SortHeader col="policyRate" label="Policy Rate" right />
                <SortHeader col="inflation" label="CPI" right />
                <SortHeader col="hardCurrYield" label="HC Yield" right />
              </tr>
            </thead>
            <tbody>
              {countriesSorted.map((c: any) => (
                <tr key={c.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.id}</span>
                    <span className="text-neutral/30 ml-1.5">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70 font-bold">{c.localYield10y}%</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${c.realYield >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.realYield >= 0 ? '+' : ''}{c.realYield}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.policyRate}%</td>
                  <td className={`px-2 py-1.5 text-right ${c.inflation > 5 ? 'text-bearish' : 'text-white/50'}`}>{c.inflation}%</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{c.hardCurrYield}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'regions' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono mb-4">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Region</th>
                  <th className="px-2 py-1.5 text-right">Countries</th>
                  <th className="px-2 py-1.5 text-right">Avg HC Spread</th>
                  <th className="px-2 py-1.5 text-right">Avg Local Yld</th>
                  <th className="px-2 py-1.5 text-right">Avg Real Yld</th>
                </tr>
              </thead>
              <tbody>
                {data.regionAgg?.map((r: any) => (
                  <tr key={r.region} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.region}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{r.count}</td>
                    <td className="px-2 py-1.5 text-right text-white/70 font-bold">{r.avgSpread}bp</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{r.avgLocalYield}%</td>
                    <td className={`px-2 py-1.5 text-right ${r.avgRealYield >= 0 ? 'text-bullish' : 'text-bearish'}`}>{r.avgRealYield >= 0 ? '+' : ''}{r.avgRealYield}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Spread comparison bars */}
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Hard Currency Spreads</div>
            {data.countries?.sort((a: any, b: any) => b.hardCurrSpread - a.hardCurrSpread).map((c: any) => {
              const maxSpread = Math.max(...data.countries.map((x: any) => x.hardCurrSpread));
              return (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] font-mono w-6" style={{ color: ACCENT }}>{c.id}</span>
                  <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
                    <div style={{ width: `${(c.hardCurrSpread / maxSpread) * 100}%`, height: '100%', background: c.hardCurrSpread > 300 ? '#f87171' : c.hardCurrSpread > 150 ? '#fbbf24' : '#4ade80', opacity: 0.5 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/50 w-12 text-right">{c.hardCurrSpread}bp</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
