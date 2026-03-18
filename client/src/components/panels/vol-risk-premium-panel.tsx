import { useState, useMemo } from 'react';
import { useVolRiskPremium } from '../../api/hooks/use-vol-risk-premium';

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.08)';

type Tab = 'dashboard' | 'term' | 'history' | 'strategies';

export function VolRiskPremiumPanel() {
  const { data, isLoading, error } = useVolRiskPremium();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selected, setSelected] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string>('vrp');
  const [sortAsc, setSortAsc] = useState(false);

  const selectedAsset = useMemo(() => {
    if (!data?.assets) return null;
    return data.assets.find((a: any) => a.id === selected) || data.assets[0];
  }, [data, selected]);

  const assetsSorted = useMemo(() => {
    if (!data?.assets) return [];
    const arr = [...data.assets];
    arr.sort((a: any, b: any) => {
      const va = a.current?.[sortCol] ?? 0;
      const vb = b.current?.[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading vol risk premium data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'DASHBOARD' },
    { key: 'term', label: 'TERM STRUCTURE' },
    { key: 'history', label: 'HISTORY' },
    { key: 'strategies', label: 'STRATEGIES' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === t.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-3 text-[8px] font-mono text-neutral/25">
          VIX: {data.summary?.vixLevel} | VVIX: {data.summary?.vvix}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'dashboard' && (
          <div>
            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-0 border-b border-border/10">
              {[
                { label: 'Avg VRP', value: `${data.summary.avgVRP}%` },
                { label: 'Max VRP', value: `${data.summary.maxVRP.id} ${data.summary.maxVRP.vrp}%` },
                { label: 'VIX', value: `${data.summary.vixLevel}`, sub: `${data.summary.vix1dChange >= 0 ? '+' : ''}${data.summary.vix1dChange}` },
                { label: 'VVIX', value: `${data.summary.vvix}` },
              ].map((m, i) => (
                <div key={i} className="px-3 py-2 border-r border-border/10 last:border-r-0">
                  <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{m.label}</div>
                  <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{m.value}</div>
                  {m.sub && <span className={`text-[8px] font-mono ${parseFloat(m.sub) >= 0 ? 'text-bullish' : 'text-bearish'}`}>{m.sub}</span>}
                </div>
              ))}
            </div>
            {/* Assets table */}
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <SortHeader col="id" label="Asset" />
                  <SortHeader col="iv30d" label="IV 30D" right />
                  <SortHeader col="rv30d" label="RV 30D" right />
                  <SortHeader col="vrp" label="VRP" right />
                  <SortHeader col="vrpPctile" label="VRP %ile" right />
                  <SortHeader col="iv10d" label="IV 10D" right />
                  <SortHeader col="rv10d" label="RV 10D" right />
                  <SortHeader col="iv60d" label="IV 60D" right />
                  <SortHeader col="rv60d" label="RV 60D" right />
                </tr>
              </thead>
              <tbody>
                {assetsSorted.map((a: any) => (
                  <tr
                    key={a.id}
                    className={`border-b border-border/5 cursor-pointer transition-colors ${selected === a.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                    onClick={() => setSelected(a.id)}
                  >
                    <td className="px-2 py-1.5">
                      <span className="font-bold" style={{ color: ACCENT }}>{a.id}</span>
                      <span className="text-neutral/30 ml-1.5">{a.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/70">{a.current.iv30d.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{a.current.rv30d.toFixed(1)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${a.current.vrp >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {a.current.vrp >= 0 ? '+' : ''}{a.current.vrp.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className="px-1.5 py-0.5" style={{
                        background: a.current.vrpPctile > 70 ? 'rgba(74,222,128,0.15)' : a.current.vrpPctile < 30 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
                        color: a.current.vrpPctile > 70 ? '#4ade80' : a.current.vrpPctile < 30 ? '#f87171' : 'rgba(255,255,255,0.5)',
                      }}>
                        {a.current.vrpPctile}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{a.current.iv10d.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{a.current.rv10d.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{a.current.iv60d.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{a.current.rv60d.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'term' && selectedAsset && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select
                value={selectedAsset.id}
                onChange={e => setSelected(e.target.value)}
                className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1"
              >
                {data.assets.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.id} — {a.name}</option>
                ))}
              </select>
            </div>
            <table className="w-full text-[9px] font-mono mb-4">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Tenor</th>
                  <th className="px-2 py-1.5 text-right">IV</th>
                  <th className="px-2 py-1.5 text-right">RV</th>
                  <th className="px-2 py-1.5 text-right">VRP</th>
                  <th className="px-2 py-1.5 text-right">IV-RV Bar</th>
                </tr>
              </thead>
              <tbody>
                {selectedAsset.termStructure?.map((t: any) => (
                  <tr key={t.tenor} className="border-b border-border/5">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{t.iv.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{t.rv.toFixed(1)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${t.vrp >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {t.vrp >= 0 ? '+' : ''}{t.vrp.toFixed(1)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-16 h-2 bg-white/5 relative overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full"
                            style={{
                              width: `${Math.min(100, Math.abs(t.vrp) * 3)}%`,
                              background: t.vrp >= 0 ? '#4ade80' : '#f87171',
                              opacity: 0.6,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'history' && selectedAsset && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select
                value={selectedAsset.id}
                onChange={e => setSelected(e.target.value)}
                className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1"
              >
                {data.assets.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.id} — {a.name}</option>
                ))}
              </select>
            </div>
            {/* Chart-like history */}
            <div className="border border-border/10 p-3 mb-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2 uppercase">30-Day IV vs RV</div>
              <div className="flex items-end gap-[3px] h-24">
                {selectedAsset.history?.map((h: any, i: number) => {
                  const maxVal = Math.max(...selectedAsset.history.map((x: any) => Math.max(x.iv, x.rv)));
                  return (
                    <div key={i} className="flex-1 flex gap-[1px] items-end h-full">
                      <div
                        className="flex-1"
                        style={{ height: `${(h.iv / maxVal) * 100}%`, background: ACCENT, opacity: 0.7 }}
                        title={`${h.date} IV: ${h.iv}`}
                      />
                      <div
                        className="flex-1"
                        style={{ height: `${(h.rv / maxVal) * 100}%`, background: '#60a5fa', opacity: 0.7 }}
                        title={`${h.date} RV: ${h.rv}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[7px] font-mono">
                <span style={{ color: ACCENT }}>■ Implied Vol</span>
                <span style={{ color: '#60a5fa' }}>■ Realized Vol</span>
              </div>
            </div>
            {/* VRP history */}
            <div className="border border-border/10 p-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2 uppercase">VRP (IV − RV)</div>
              <div className="flex items-center gap-[3px] h-12">
                {selectedAsset.history?.map((h: any, i: number) => {
                  const maxAbs = Math.max(...selectedAsset.history.map((x: any) => Math.abs(x.vrp)));
                  const pct = (Math.abs(h.vrp) / maxAbs) * 50;
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-center">
                      <div
                        style={{
                          height: `${pct}%`,
                          background: h.vrp >= 0 ? '#4ade80' : '#f87171',
                          opacity: 0.6,
                          marginTop: h.vrp >= 0 ? 'auto' : 0,
                          marginBottom: h.vrp < 0 ? 'auto' : 0,
                        }}
                        title={`${h.date} VRP: ${h.vrp}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'strategies' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">Strategy P&L (1M, % of notional)</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Asset</th>
                  <th className="px-2 py-1.5 text-right">Short Straddle</th>
                  <th className="px-2 py-1.5 text-right">Short Put</th>
                  <th className="px-2 py-1.5 text-right">Iron Condor</th>
                  <th className="px-2 py-1.5 text-right">Var Swap</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((a: any) => (
                  <tr key={a.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{a.id}</td>
                    {(['shortStraddle1m', 'shortPut1m', 'ironCondor1m', 'varianceSwap1m'] as const).map(k => {
                      const v = a.strategyReturns[k];
                      return (
                        <td key={k} className={`px-2 py-1.5 text-right font-bold ${v >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
                        </td>
                      );
                    })}
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
