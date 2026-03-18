import { useState, useMemo } from 'react';
import { useCommodityCurves } from '../../api/hooks/use-commodity-curves';

const ACCENT = '#f97316'; // orange-500
const ACCENT_DIM = 'rgba(249,115,22,0.08)';

type Tab = 'overview' | 'curve' | 'spreads' | 'history';

export function CommodityCurvesPanel() {
  const { data, isLoading, error } = useCommodityCurves();
  const [tab, setTab] = useState<Tab>('overview');
  const [selected, setSelected] = useState<string | null>(null);

  const selectedCommodity = useMemo(() => {
    if (!data?.commodities) return null;
    return data.commodities.find((c: any) => c.id === selected) || data.commodities[0];
  }, [data, selected]);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading commodity curves...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'OVERVIEW' },
    { key: 'curve', label: 'FORWARD CURVE' },
    { key: 'spreads', label: 'CALENDAR SPR' },
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
          Contango: {data.structureSummary?.contango} | Backw: {data.structureSummary?.backwardation}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'overview' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left">Commodity</th>
                <th className="px-2 py-1.5 text-right">Spot</th>
                <th className="px-2 py-1.5 text-right">1D Chg</th>
                <th className="px-2 py-1.5 text-left">Structure</th>
                <th className="px-2 py-1.5 text-right">M1-M2</th>
                <th className="px-2 py-1.5 text-right">Ann. Roll</th>
                <th className="px-2 py-1.5 text-right">F-B Spread</th>
              </tr>
            </thead>
            <tbody>
              {data.commodities?.map((c: any) => (
                <tr key={c.id} className={`border-b border-border/5 cursor-pointer transition-colors ${selected === c.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`} onClick={() => setSelected(c.id)}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.id}</span>
                    <span className="text-neutral/30 ml-1.5">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.spotPrice} <span className="text-neutral/30">{c.unit}</span></td>
                  <td className={`px-2 py-1.5 text-right font-bold ${c.change1dPct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.change1dPct >= 0 ? '+' : ''}{c.change1dPct}%
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1.5 py-0.5 ${c.structure === 'Backwardation' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>
                      {c.structure === 'Backwardation' ? 'BACKW' : 'CONTANGO'}
                    </span>
                  </td>
                  <td className={`px-2 py-1.5 text-right ${c.spread12 > 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.spread12 > 0 ? '+' : ''}{c.spread12}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${c.annualizedRoll > 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.annualizedRoll > 0 ? '+' : ''}{c.annualizedRoll}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.spreadFrontBack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'curve' && selectedCommodity && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select value={selectedCommodity.id} onChange={e => setSelected(e.target.value)} className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1">
                {data.commodities.map((c: any) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
              </select>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 ${selectedCommodity.structure === 'Backwardation' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>
                {selectedCommodity.structure}
              </span>
            </div>

            {/* Curve chart */}
            <div className="border border-border/10 p-3 mb-3">
              <div className="flex items-end gap-[4px] h-28">
                {selectedCommodity.curve?.map((pt: any, i: number) => {
                  const prices = selectedCommodity.curve.map((x: any) => x.price);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  const range = max - min || 1;
                  const pct = ((pt.price - min) / range) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="text-[7px] font-mono text-white/40 mb-1">{pt.price}</div>
                      <div className="w-full" style={{ height: `${Math.max(10, pct)}%`, background: ACCENT, opacity: 0.4 + (i === 0 ? 0.4 : 0) }} />
                      <div className="text-[6px] font-mono text-neutral/30 mt-1">{pt.contract}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contract details */}
            <table className="w-full text-[8px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left">Contract</th>
                  <th className="px-2 py-1 text-left">Month</th>
                  <th className="px-2 py-1 text-right">Price</th>
                  <th className="px-2 py-1 text-right">Volume</th>
                  <th className="px-2 py-1 text-right">Open Int.</th>
                </tr>
              </thead>
              <tbody>
                {selectedCommodity.curve?.map((pt: any) => (
                  <tr key={pt.contract} className="border-b border-border/5">
                    <td className="px-2 py-1 font-bold" style={{ color: ACCENT }}>{pt.contract}</td>
                    <td className="px-2 py-1 text-white/50">{pt.month}</td>
                    <td className="px-2 py-1 text-right text-white/70">{pt.price}</td>
                    <td className="px-2 py-1 text-right text-white/40">{pt.volume.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right text-white/40">{pt.openInterest.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'spreads' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">M1-M2 Calendar Spreads</div>
            {data.commodities?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border/5">
                <span className="text-[9px] font-mono font-bold w-8" style={{ color: ACCENT }}>{c.id}</span>
                <span className="text-[8px] font-mono text-neutral/30 w-20">{c.name}</span>
                <div className="flex-1 h-3 relative flex items-center">
                  <div className="absolute inset-0 bg-white/5" />
                  <div
                    className="absolute h-full"
                    style={{
                      left: c.spread12 >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(c.spread12) * 5)}%`,
                      width: `${Math.min(50, Math.abs(c.spread12) * 5)}%`,
                      background: c.spread12 >= 0 ? '#4ade80' : '#f87171',
                      opacity: 0.5,
                    }}
                  />
                </div>
                <span className={`text-[8px] font-mono font-bold w-12 text-right ${c.spread12 >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {c.spread12 >= 0 ? '+' : ''}{c.spread12}
                </span>
                <span className={`text-[7px] font-mono w-14 text-right ${c.annualizedRoll >= 0 ? 'text-bullish/60' : 'text-bearish/60'}`}>
                  {c.annualizedRoll >= 0 ? '+' : ''}{c.annualizedRoll}% ann
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && selectedCommodity && (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              <select value={selectedCommodity.id} onChange={e => setSelected(e.target.value)} className="bg-black border border-border/20 text-[9px] font-mono text-white px-2 py-1">
                {data.commodities.map((c: any) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
              </select>
            </div>
            <div className="border border-border/10 p-3 mb-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2">Front Month vs M2 (30D)</div>
              <div className="flex items-end gap-[3px] h-20">
                {selectedCommodity.history?.map((h: any, i: number) => {
                  const maxVal = Math.max(...selectedCommodity.history.map((x: any) => Math.max(x.front, x.m2)));
                  const minVal = Math.min(...selectedCommodity.history.map((x: any) => Math.min(x.front, x.m2)));
                  const range = maxVal - minVal || 1;
                  return (
                    <div key={i} className="flex-1 flex gap-[1px] items-end h-full">
                      <div className="flex-1" style={{ height: `${Math.max(5, ((h.front - minVal) / range) * 100)}%`, background: ACCENT, opacity: 0.7 }} title={`Front: ${h.front}`} />
                      <div className="flex-1" style={{ height: `${Math.max(5, ((h.m2 - minVal) / range) * 100)}%`, background: '#60a5fa', opacity: 0.5 }} title={`M2: ${h.m2}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[7px] font-mono">
                <span style={{ color: ACCENT }}>■ Front</span>
                <span className="text-blue-400">■ M2</span>
              </div>
            </div>
            <div className="border border-border/10 p-3">
              <div className="text-[8px] font-mono text-neutral/40 mb-2">Calendar Spread (30D)</div>
              <div className="flex items-center gap-[3px] h-12">
                {selectedCommodity.history?.map((h: any, i: number) => {
                  const maxAbs = Math.max(...selectedCommodity.history.map((x: any) => Math.abs(x.spread)));
                  const pct = Math.max(5, (Math.abs(h.spread) / maxAbs) * 50);
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col justify-center">
                      <div style={{ height: `${pct}%`, background: h.spread >= 0 ? '#4ade80' : '#f87171', opacity: 0.5, marginTop: h.spread >= 0 ? 'auto' : 0, marginBottom: h.spread < 0 ? 'auto' : 0 }} />
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
