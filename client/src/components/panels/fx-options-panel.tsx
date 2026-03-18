import { useState, useMemo } from 'react';
import { useFxOptions } from '../../api/hooks/use-fx-options';

const ACCENT = '#2dd4bf'; // teal-400
const ACCENT_DIM = 'rgba(45,212,191,0.08)';

type Tab = 'matrix' | 'surface' | 'skew' | 'history';

export function FxOptionsPanel() {
  const { data, isLoading, error } = useFxOptions();
  const [tab, setTab] = useState<Tab>('matrix');
  const [selected, setSelected] = useState<string | null>(null);

  const selectedPair = useMemo(() => {
    if (!data?.pairs) return null;
    return data.pairs.find((p: any) => p.id === selected) || data.pairs[0];
  }, [data, selected]);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading FX options data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'matrix', label: 'VOL MATRIX' },
    { key: 'surface', label: 'TERM STRUCT' },
    { key: 'skew', label: 'RR & BF' },
    { key: 'history', label: 'HISTORY' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="px-3 text-[8px] font-mono text-neutral/25">
          G10 Avg: {data.summary?.avgG10Vol}% | EM Avg: {data.summary?.avgEMVol}%
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'matrix' && (
          <div>
            {/* Pair overview table */}
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Pair</th>
                  <th className="px-2 py-1.5 text-right">Spot</th>
                  <th className="px-2 py-1.5 text-right">1W</th>
                  <th className="px-2 py-1.5 text-right">1M</th>
                  <th className="px-2 py-1.5 text-right">3M</th>
                  <th className="px-2 py-1.5 text-right">6M</th>
                  <th className="px-2 py-1.5 text-right">1Y</th>
                  <th className="px-2 py-1.5 text-right">1D Chg</th>
                </tr>
              </thead>
              <tbody>
                {data.pairs?.map((p: any) => {
                  const getAtm = (tenor: string) => p.volMatrix?.find((v: any) => v.tenor === tenor)?.atmVol ?? '-';
                  return (
                    <tr key={p.id} className={`border-b border-border/5 cursor-pointer transition-colors ${selected === p.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`} onClick={() => setSelected(p.id)}>
                      <td className="px-2 py-1.5">
                        <span className="font-bold" style={{ color: ACCENT }}>{p.id}</span>
                        <span className="text-neutral/25 ml-1">{p.spot}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/60">{p.spot}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{getAtm('1W')}</td>
                      <td className="px-2 py-1.5 text-right text-white/70 font-bold">{getAtm('1M')}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{getAtm('3M')}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{getAtm('6M')}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{getAtm('1Y')}</td>
                      <td className={`px-2 py-1.5 text-right font-bold ${p.atmChange1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {p.atmChange1d >= 0 ? '+' : ''}{p.atmChange1d}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'surface' && selectedPair && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select value={selectedPair.id} onChange={e => setSelected(e.target.value)} className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1">
                {data.pairs.map((p: any) => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
              <span className="text-[8px] font-mono text-neutral/30">Spot: {selectedPair.spot} | BE 1M: ±{selectedPair.impliedBreakeven1m}</span>
            </div>

            {/* Full vol matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-[8px] font-mono">
                <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Tenor</th>
                    <th className="px-2 py-1.5 text-right">10P</th>
                    <th className="px-2 py-1.5 text-right">25P</th>
                    <th className="px-2 py-1.5 text-right font-black">ATM</th>
                    <th className="px-2 py-1.5 text-right">25C</th>
                    <th className="px-2 py-1.5 text-right">10C</th>
                    <th className="px-2 py-1.5 text-right">RR25</th>
                    <th className="px-2 py-1.5 text-right">BF25</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPair.volMatrix?.map((v: any) => (
                    <tr key={v.tenor} className="border-b border-border/5">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{v.tenor}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{v.deltas['10P']}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{v.deltas['25P']}</td>
                      <td className="px-2 py-1.5 text-right text-white font-bold">{v.atmVol}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{v.deltas['25C']}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{v.deltas['10C']}</td>
                      <td className={`px-2 py-1.5 text-right ${v.rr25 >= 0 ? 'text-bullish' : 'text-bearish'}`}>{v.rr25 >= 0 ? '+' : ''}{v.rr25}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{v.bf25}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'skew' && selectedPair && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select value={selectedPair.id} onChange={e => setSelected(e.target.value)} className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1">
                {data.pairs.map((p: any) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </div>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">25-Delta Risk Reversal by Tenor</div>
            <div className="flex items-center gap-[4px] h-20 mb-4">
              {selectedPair.volMatrix?.map((v: any) => {
                const maxAbs = Math.max(...selectedPair.volMatrix.map((x: any) => Math.abs(x.rr25)));
                const pct = (Math.abs(v.rr25) / maxAbs) * 50;
                return (
                  <div key={v.tenor} className="flex-1 flex flex-col items-center h-full justify-center">
                    <div className="flex-1 flex flex-col justify-center w-full">
                      <div style={{ height: `${pct}%`, background: v.rr25 >= 0 ? '#4ade80' : '#f87171', opacity: 0.6, marginTop: v.rr25 >= 0 ? 'auto' : 0, marginBottom: v.rr25 < 0 ? 'auto' : 0 }} />
                    </div>
                    <div className="text-[7px] font-mono text-neutral/30 mt-1">{v.tenor}</div>
                    <div className={`text-[7px] font-mono ${v.rr25 >= 0 ? 'text-bullish' : 'text-bearish'}`}>{v.rr25}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">25-Delta Butterfly by Tenor</div>
            <div className="flex items-end gap-[4px] h-16">
              {selectedPair.volMatrix?.map((v: any) => {
                const maxBf = Math.max(...selectedPair.volMatrix.map((x: any) => Math.abs(x.bf25)));
                const pct = Math.max(5, (Math.abs(v.bf25) / maxBf) * 100);
                return (
                  <div key={v.tenor} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-full" style={{ height: `${pct}%`, background: ACCENT, opacity: 0.5 }} />
                    <div className="text-[7px] font-mono text-neutral/30 mt-1">{v.tenor}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'history' && selectedPair && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select value={selectedPair.id} onChange={e => setSelected(e.target.value)} className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1">
                {data.pairs.map((p: any) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </div>

            <div className="border border-border/10 p-3 mb-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2">1M ATM Vol (30D)</div>
              <div className="flex items-end gap-[3px] h-20">
                {selectedPair.history?.map((h: any, i: number) => {
                  const vals = selectedPair.history.map((x: any) => x.atm1m);
                  const min = Math.min(...vals); const max = Math.max(...vals);
                  const range = max - min || 1;
                  return (
                    <div key={i} className="flex-1 min-w-0" style={{ height: `${Math.max(10, ((h.atm1m - min) / range) * 100)}%`, background: ACCENT, opacity: 0.4 + (i / vals.length) * 0.6 }} title={`${h.date}: ${h.atm1m}%`} />
                  );
                })}
              </div>
            </div>

            <div className="border border-border/10 p-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2">1M 25D Risk Reversal (30D)</div>
              <div className="flex items-center gap-[3px] h-16">
                {selectedPair.history?.map((h: any, i: number) => {
                  const maxAbs = Math.max(...selectedPair.history.map((x: any) => Math.abs(x.rr25_1m)));
                  const pct = (Math.abs(h.rr25_1m) / maxAbs) * 50;
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-center">
                      <div style={{ height: `${Math.max(5, pct)}%`, background: h.rr25_1m >= 0 ? '#4ade80' : '#f87171', opacity: 0.5 + (i / 30) * 0.5, marginTop: h.rr25_1m >= 0 ? 'auto' : 0, marginBottom: h.rr25_1m < 0 ? 'auto' : 0 }} title={`${h.date}: ${h.rr25_1m}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
