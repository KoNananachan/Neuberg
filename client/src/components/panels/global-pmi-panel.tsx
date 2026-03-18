import { useState, useMemo } from 'react';
import { useGlobalPmi } from '../../api/hooks/use-global-pmi';

const ACCENT = '#f472b6'; // pink-400
const ACCENT_DIM = 'rgba(244,114,182,0.08)';

type Tab = 'heatmap' | 'details' | 'regions' | 'trends';

export function GlobalPmiPanel() {
  const { data, isLoading, error } = useGlobalPmi();
  const [tab, setTab] = useState<Tab>('heatmap');
  const [sortCol, setSortCol] = useState<string>('compositePmi');
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

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading PMI data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'heatmap', label: 'HEATMAP' },
    { key: 'details', label: 'DETAILS' },
    { key: 'regions', label: 'REGIONS' },
    { key: 'trends', label: 'TRENDS' },
  ];

  const pmiColor = (val: number) => {
    if (val >= 55) return '#22c55e';
    if (val >= 52) return '#4ade80';
    if (val >= 50) return '#86efac';
    if (val >= 48) return '#fbbf24';
    if (val >= 45) return '#f97316';
    return '#ef4444';
  };

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Global Mfg</div>
          <div className="text-[11px] font-mono font-black" style={{ color: pmiColor(data.summary?.globalMfg) }}>{data.summary?.globalMfg}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Global Svc</div>
          <div className="text-[11px] font-mono font-black" style={{ color: pmiColor(data.summary?.globalSvc) }}>{data.summary?.globalSvc}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Expansion</div>
          <div className="text-[11px] font-mono font-black text-bullish">{data.summary?.expansion}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Contraction</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.contraction}</div>
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
        {tab === 'heatmap' && (
          <div className="p-3">
            <div className="grid grid-cols-6 gap-1">
              {data.countries?.sort((a: any, b: any) => b.compositePmi - a.compositePmi).map((c: any) => (
                <div key={c.id} className="p-2 text-center" style={{ background: `${pmiColor(c.mfgPmi)}15`, border: `1px solid ${pmiColor(c.mfgPmi)}30` }}>
                  <div className="text-[10px] font-mono font-black" style={{ color: pmiColor(c.mfgPmi) }}>{c.id}</div>
                  <div className="text-[8px] font-mono text-neutral/40 mt-0.5">Mfg</div>
                  <div className="text-[11px] font-mono font-bold" style={{ color: pmiColor(c.mfgPmi) }}>{c.mfgPmi}</div>
                  <div className="text-[8px] font-mono text-neutral/40 mt-0.5">Svc</div>
                  <div className="text-[10px] font-mono" style={{ color: pmiColor(c.svcPmi) }}>{c.svcPmi}</div>
                  <div className={`text-[7px] font-mono mt-0.5 ${c.mfgChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.mfgChange >= 0 ? '+' : ''}{c.mfgChange}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-[7px] font-mono text-neutral/40">
              <span>Legend:</span>
              {[{ label: '>55', color: '#22c55e' }, { label: '52-55', color: '#4ade80' }, { label: '50-52', color: '#86efac' }, { label: '48-50', color: '#fbbf24' }, { label: '45-48', color: '#f97316' }, { label: '<45', color: '#ef4444' }].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="w-2 h-2" style={{ background: l.color, opacity: 0.5 }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === 'details' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="id" label="Country" />
                <SortHeader col="mfgPmi" label="Mfg" right />
                <SortHeader col="mfgChange" label="Chg" right />
                <SortHeader col="svcPmi" label="Svc" right />
                <SortHeader col="svcChange" label="Chg" right />
                <SortHeader col="compositePmi" label="Comp" right />
                <SortHeader col="newOrders" label="Orders" right />
                <SortHeader col="employment" label="Empl" right />
              </tr>
            </thead>
            <tbody>
              {countriesSorted.map((c: any) => (
                <tr key={c.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.id}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: pmiColor(c.mfgPmi) }}>{c.mfgPmi}</td>
                  <td className={`px-2 py-1.5 text-right ${c.mfgChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.mfgChange >= 0 ? '+' : ''}{c.mfgChange}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: pmiColor(c.svcPmi) }}>{c.svcPmi}</td>
                  <td className={`px-2 py-1.5 text-right ${c.svcChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.svcChange >= 0 ? '+' : ''}{c.svcChange}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: pmiColor(c.compositePmi) }}>{c.compositePmi}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: pmiColor(c.newOrders) }}>{c.newOrders}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: pmiColor(c.employment) }}>{c.employment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'regions' && (
          <div className="p-3 space-y-3">
            {data.regions?.map((r: any) => (
              <div key={r.region} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{r.region}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{r.count} countries</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Manufacturing</div>
                    <div className="text-[12px] font-bold" style={{ color: pmiColor(r.avgMfg) }}>{r.avgMfg}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Avg Services</div>
                    <div className="text-[12px] font-bold" style={{ color: pmiColor(r.avgSvc) }}>{r.avgSvc}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Composite</div>
                    <div className="text-[12px] font-bold" style={{ color: pmiColor(r.avgComposite) }}>{r.avgComposite}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'trends' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Manufacturing PMI — 6 Month Trend</div>
            {data.countries?.slice(0, 12).map((c: any) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-[8px] font-mono w-6 shrink-0" style={{ color: ACCENT }}>{c.id}</span>
                <div className="flex-1 flex items-end gap-px h-6">
                  {c.trend?.map((t: any, i: number) => {
                    const pct = Math.max(0, Math.min(100, ((t.mfg - 40) / 25) * 100));
                    return (
                      <div key={i} className="flex-1 relative" style={{ height: '24px' }}>
                        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${pct}%`, background: pmiColor(t.mfg), opacity: 0.35, minHeight: '2px' }} />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[8px] font-mono w-8 text-right font-bold" style={{ color: pmiColor(c.mfgPmi) }}>{c.mfgPmi}</span>
              </div>
            ))}

            <div className="text-[8px] font-mono text-neutral/40 uppercase mt-4 mb-2">Sub-Index Comparison (Top 8)</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-1 py-1 text-left">Country</th>
                  <th className="px-1 py-1 text-right">Orders</th>
                  <th className="px-1 py-1 text-right">Output</th>
                  <th className="px-1 py-1 text-right">Empl</th>
                  <th className="px-1 py-1 text-right">Delivery</th>
                  <th className="px-1 py-1 text-right">In Price</th>
                  <th className="px-1 py-1 text-right">Out Price</th>
                </tr>
              </thead>
              <tbody>
                {countriesSorted.slice(0, 8).map((c: any) => (
                  <tr key={c.id} className="border-b border-border/5">
                    <td className="px-1 py-1 font-bold" style={{ color: ACCENT }}>{c.id}</td>
                    <td className="px-1 py-1 text-right" style={{ color: pmiColor(c.newOrders) }}>{c.newOrders}</td>
                    <td className="px-1 py-1 text-right" style={{ color: pmiColor(c.output) }}>{c.output}</td>
                    <td className="px-1 py-1 text-right" style={{ color: pmiColor(c.employment) }}>{c.employment}</td>
                    <td className="px-1 py-1 text-right" style={{ color: pmiColor(c.deliveryTimes) }}>{c.deliveryTimes}</td>
                    <td className="px-1 py-1 text-right text-white/50">{c.inputPrices}</td>
                    <td className="px-1 py-1 text-right text-white/50">{c.outputPrices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
