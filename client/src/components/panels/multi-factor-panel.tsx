import { useState, useMemo } from 'react';
import { useMultiFactor } from '../../api/hooks/use-multi-factor';

const ACCENT = '#e879f9'; // fuchsia-400
const ACCENT_DIM = 'rgba(232,121,249,0.08)';

type Tab = 'factors' | 'exposures' | 'correlation' | 'risk';

export function MultiFactorPanel() {
  const { data, isLoading, error } = useMultiFactor();
  const [tab, setTab] = useState<Tab>('factors');
  const [sortCol, setSortCol] = useState<string>('returnYtd');
  const [sortAsc, setSortAsc] = useState(false);

  const factorsSorted = useMemo(() => {
    if (!data?.factorReturns) return [];
    const arr = [...data.factorReturns];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0; const vb = b[sortCol] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const stocksSorted = useMemo(() => {
    if (!data?.stockExposures) return [];
    const arr = [...data.stockExposures];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? a.exposures?.[sortCol] ?? 0;
      const vb = b[sortCol] ?? b.exposures?.[sortCol] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading factor model...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'factors', label: 'FACTOR RETURNS' },
    { key: 'exposures', label: 'STOCK BETAS' },
    { key: 'correlation', label: 'CORRELATION' },
    { key: 'risk', label: 'RISK DECOMP' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const ReturnCell = ({ val }: { val: number }) => (
    <span className={`font-bold ${val >= 0 ? 'text-bullish' : 'text-bearish'}`}>{val >= 0 ? '+' : ''}{val.toFixed(2)}%</span>
  );

  const factors = data.factorReturns?.map((f: any) => f.id) ?? [];

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
        {tab === 'factors' && (
          <div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <SortHeader col="id" label="Factor" />
                  <SortHeader col="return1d" label="1D" right />
                  <SortHeader col="return1w" label="1W" right />
                  <SortHeader col="return1m" label="1M" right />
                  <SortHeader col="returnYtd" label="YTD" right />
                  <SortHeader col="sharpe" label="Sharpe" right />
                  <SortHeader col="volatility" label="Vol" right />
                  <SortHeader col="zScore" label="Z-Score" right />
                </tr>
              </thead>
              <tbody>
                {factorsSorted.map((f: any) => (
                  <tr key={f.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ACCENT }}>{f.id}</span>
                      <span className="text-neutral/30 ml-1.5">{f.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right"><ReturnCell val={f.return1d} /></td>
                    <td className="px-2 py-1.5 text-right"><ReturnCell val={f.return1w} /></td>
                    <td className="px-2 py-1.5 text-right"><ReturnCell val={f.return1m} /></td>
                    <td className="px-2 py-1.5 text-right"><ReturnCell val={f.returnYtd} /></td>
                    <td className={`px-2 py-1.5 text-right ${f.sharpe >= 1 ? 'text-bullish' : f.sharpe < 0 ? 'text-bearish' : 'text-white/50'}`}>{f.sharpe.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{f.volatility.toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`px-1 py-0 ${Math.abs(f.zScore) >= 2 ? 'bg-bearish/15 text-bearish' : Math.abs(f.zScore) >= 1 ? 'bg-yellow-500/15 text-yellow-400' : 'text-white/40'}`}>
                        {f.zScore >= 0 ? '+' : ''}{f.zScore.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Monthly factor return heatmap */}
            <div className="p-3 border-t border-border/10">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Monthly Returns (12M)</div>
              {data.factorReturns?.map((f: any) => (
                <div key={f.id} className="flex items-center gap-1 mb-1">
                  <span className="text-[7px] font-mono w-8" style={{ color: ACCENT }}>{f.id}</span>
                  <div className="flex gap-[2px] flex-1">
                    {f.history?.map((h: any, i: number) => {
                      const intensity = Math.min(1, Math.abs(h.return) / 5);
                      return (
                        <div
                          key={i}
                          className="flex-1 h-3"
                          style={{ background: h.return >= 0 ? `rgba(74,222,128,${intensity})` : `rgba(248,113,113,${intensity})` }}
                          title={`${h.date}: ${h.return}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'exposures' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Stock" />
                {factors.map((f: string) => <SortHeader key={f} col={f} label={f} right />)}
                <SortHeader col="totalRisk" label="Risk" right />
                <SortHeader col="alpha" label="Alpha" right />
                <SortHeader col="r2" label="R²" right />
              </tr>
            </thead>
            <tbody>
              {stocksSorted.map((s: any) => (
                <tr key={s.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{s.ticker}</span>
                  </td>
                  {factors.map((f: string) => {
                    const v = s.exposures[f];
                    return (
                      <td key={f} className="px-2 py-1.5 text-right">
                        <span style={{
                          background: v > 0.5 ? 'rgba(74,222,128,0.15)' : v < -0.5 ? 'rgba(248,113,113,0.15)' : 'transparent',
                          color: v > 0.5 ? '#4ade80' : v < -0.5 ? '#f87171' : 'rgba(255,255,255,0.4)',
                          padding: '0 3px',
                        }}>
                          {v >= 0 ? '+' : ''}{v.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right text-white/50">{s.totalRisk.toFixed(1)}%</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${s.alpha >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {s.alpha >= 0 ? '+' : ''}{s.alpha.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">{s.r2.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'correlation' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-3">Factor Correlation Matrix</div>
            <div className="overflow-x-auto">
              <table className="text-[8px] font-mono">
                <thead>
                  <tr>
                    <th className="px-2 py-1"></th>
                    {factors.map((f: string) => <th key={f} className="px-2 py-1 text-center" style={{ color: ACCENT }}>{f}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.correlationMatrix?.map((row: any) => (
                    <tr key={row.factor}>
                      <td className="px-2 py-1 font-bold" style={{ color: ACCENT }}>{row.factor}</td>
                      {row.correlations.map((c: any) => {
                        const abs = Math.abs(c.value);
                        const bg = c.value === 1 ? 'rgba(255,255,255,0.1)' : c.value > 0 ? `rgba(74,222,128,${abs * 0.4})` : `rgba(248,113,113,${abs * 0.4})`;
                        return (
                          <td key={c.factor} className="px-2 py-1 text-center" style={{ background: bg }}>
                            {c.value === 1 ? '1.00' : c.value.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sector exposures */}
            <div className="mt-4 border-t border-border/10 pt-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Sector Average Exposures</div>
              <table className="w-full text-[8px] font-mono">
                <thead className="text-neutral/50 border-b border-border/10">
                  <tr>
                    <th className="px-2 py-1 text-left">Sector</th>
                    {factors.map((f: string) => <th key={f} className="px-2 py-1 text-right">{f}</th>)}
                    <th className="px-2 py-1 text-right">Avg Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sectorExposures?.map((s: any) => (
                    <tr key={s.sector} className="border-b border-border/5">
                      <td className="px-2 py-1 text-white/60">{s.sector}</td>
                      {factors.map((f: string) => (
                        <td key={f} className={`px-2 py-1 text-right ${s.avgExposures[f] > 0.3 ? 'text-bullish' : s.avgExposures[f] < -0.3 ? 'text-bearish' : 'text-white/40'}`}>
                          {s.avgExposures[f]?.toFixed(2)}
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right text-white/50">{s.avgRisk.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="p-4 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-2">Portfolio Risk Decomposition</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">Systematic Risk</div>
                <div className="text-[16px] font-mono font-black" style={{ color: ACCENT }}>{data.riskDecomposition?.systematic}%</div>
              </div>
              <div className="border border-border/10 p-3">
                <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">Specific Risk</div>
                <div className="text-[16px] font-mono font-black text-white/70">{data.riskDecomposition?.specific}%</div>
              </div>
            </div>

            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Factor Risk Contributions</div>
              {data.riskDecomposition?.factorContributions?.map((f: any) => (
                <div key={f.factor} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] font-mono w-8" style={{ color: ACCENT }}>{f.factor}</span>
                  <div className="flex-1 h-3 bg-white/5 overflow-hidden">
                    <div style={{ width: `${Math.min(100, f.contribution * 5)}%`, height: '100%', background: ACCENT, opacity: 0.5 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/60 w-10 text-right">{f.contribution}%</span>
                </div>
              ))}
            </div>

            {/* Pie-like risk split */}
            <div className="flex items-center gap-4 border border-border/10 p-3">
              <div className="w-16 h-16 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={ACCENT} strokeWidth="3" strokeDasharray={`${data.riskDecomposition?.systematic} ${100 - data.riskDecomposition?.systematic}`} strokeDashoffset="25" />
                </svg>
              </div>
              <div className="text-[8px] font-mono space-y-1">
                <div><span style={{ color: ACCENT }}>■</span> Systematic: {data.riskDecomposition?.systematic}%</div>
                <div><span className="text-white/30">■</span> Specific: {data.riskDecomposition?.specific}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
