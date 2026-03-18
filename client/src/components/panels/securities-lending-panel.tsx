import { useState, useMemo } from 'react';
import { useSecuritiesLending } from '../../api/hooks/use-securities-lending';

const ACCENT = '#f59e0b'; // amber-500
const ACCENT_DIM = 'rgba(245,158,11,0.08)';

type Tab = 'securities' | 'htb' | 'sectors' | 'tiers';

export function SecuritiesLendingPanel() {
  const { data, isLoading, error } = useSecuritiesLending();
  const [tab, setTab] = useState<Tab>('securities');
  const [sortCol, setSortCol] = useState<string>('borrowRate');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!data?.securities) return [];
    const arr = [...data.securities];
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

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading securities lending data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'securities', label: 'SECURITIES' },
    { key: 'htb', label: 'HARD TO BORROW' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'tiers', label: 'COST TIERS' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const availColor = (a: string) => {
    if (a === 'Special') return '#ef4444';
    if (a === 'Hard') return '#f97316';
    if (a === 'Medium') return '#fbbf24';
    return '#22c55e';
  };

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Lendable Value</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalLendableValue}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">On Loan</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalOnLoan}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Cost</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgBorrowCost}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Util</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgUtilization}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Hard-to-Borrow</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.hardToBorrowCount}</div>
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
        {tab === 'securities' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="borrowRate" label="Borrow" right />
                <SortHeader col="utilization" label="Util%" right />
                <SortHeader col="daysToCover" label="DTC" right />
                <SortHeader col="shortInterestRatio" label="SI%" right />
                <th className="px-2 py-1.5 text-right font-bold">Avail</th>
                <SortHeader col="change1d" label="1D Chg" right />
                <th className="px-2 py-1.5 text-right font-bold">Recall</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s: any) => (
                <tr key={s.ticker} className={`border-b border-border/5 hover:bg-white/[0.02] ${s.availability === 'Special' ? 'bg-bearish/5' : ''}`}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: s.borrowRate >= 500 ? '#ef4444' : ACCENT }}>{s.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{s.sector}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: s.borrowRate >= 500 ? '#ef4444' : s.borrowRate >= 100 ? '#f97316' : 'rgba(255,255,255,0.7)' }}>
                    {s.borrowRate}bp
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: s.utilization >= 80 ? '#ef4444' : s.utilization >= 50 ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                    {s.utilization}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{s.daysToCover}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{s.shortInterestRatio}%</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-[7px] font-bold px-1 py-0" style={{ color: availColor(s.availability), background: `${availColor(s.availability)}15` }}>{s.availability}</span>
                  </td>
                  <td className={`px-2 py-1.5 text-right ${s.change1d >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                    {s.change1d >= 0 ? '+' : ''}{s.change1d}bp
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[7px] font-bold ${s.recallRisk === 'High' ? 'text-bearish' : s.recallRisk === 'Medium' ? 'text-yellow-400' : 'text-white/30'}`}>{s.recallRisk}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'htb' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Hard-to-Borrow List — Squeeze Risk Monitor</div>
            {data.hardToBorrow?.map((h: any) => (
              <div key={h.ticker} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-black text-bearish">{h.ticker}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{h.daysOnList}d on list</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{h.borrowRate}bp</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Utilization</div>
                    <div className="text-white/80 font-bold">{h.utilization}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Squeeze Score</div>
                    <div className={`font-bold ${h.squeezeScore >= 70 ? 'text-bearish' : h.squeezeScore >= 40 ? 'text-yellow-400' : 'text-white/60'}`}>{h.squeezeScore}/100</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Squeeze Risk</div>
                    <div className="h-3 bg-white/5 overflow-hidden mt-1">
                      <div style={{ width: `${h.squeezeScore}%`, height: '100%', background: h.squeezeScore >= 70 ? '#ef4444' : h.squeezeScore >= 40 ? '#fbbf24' : '#22c55e', opacity: 0.5 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'sectors' && (
          <div className="p-3 space-y-3">
            {data.sectors?.map((s: any) => (
              <div key={s.sector} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.sector}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{s.hardToBorrowCount} HTB</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Borrow</div>
                    <div className="text-white/80 font-bold">{s.avgBorrowRate}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Avg Util</div>
                    <div className="text-white/60">{s.avgUtilization}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">On Loan</div>
                    <div className="text-white/60">${s.totalOnLoan}M</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tiers' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Borrow Cost Distribution</div>
            {data.costTiers?.map((t: any) => (
              <div key={t.tier} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: t.tier === 'Special' ? '#ef4444' : t.tier === 'Hard' ? '#f97316' : t.tier === 'Warm' ? '#fbbf24' : '#22c55e' }}>{t.tier}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{t.rateRange}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Securities</div>
                    <div className="text-[12px] font-bold text-white/80">{t.count}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Total Value</div>
                    <div className="text-[12px] font-bold" style={{ color: ACCENT }}>${t.totalValue}M</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-white/5 overflow-hidden">
                  <div style={{ width: `${(t.count / data.securities.length) * 100}%`, height: '100%', background: t.tier === 'Special' ? '#ef4444' : t.tier === 'Hard' ? '#f97316' : t.tier === 'Warm' ? '#fbbf24' : '#22c55e', opacity: 0.4 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
