import { useState } from 'react';
import { useInsuranceLinked } from '../../api/hooks/use-insurance-linked';

const ACCENT = '#f87171'; // red-400
const ACCENT_DIM = 'rgba(248,113,113,0.08)';

type Tab = 'secondary' | 'ilw' | 'reinsurance' | 'pipeline';

export function InsuranceLinkedPanel() {
  const { data, isLoading, error } = useInsuranceLinked();
  const [tab, setTab] = useState<Tab>('secondary');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading insurance-linked data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'secondary', label: 'SECONDARY' },
    { key: 'ilw', label: 'ILW' },
    { key: 'reinsurance', label: 'REINSURANCE' },
    { key: 'pipeline', label: 'PIPELINE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Outstanding</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.outstanding}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">New Issuance YTD</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.newIssuanceYtd}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Losses YTD</div>
          <div className="text-[11px] font-mono font-black text-bearish">${data.summary?.lossesYtd}M</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg EL</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgEl}%</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'secondary' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Name</th>
                <th className="px-2 py-1.5 text-left font-bold">Sponsor</th>
                <th className="px-2 py-1.5 text-left font-bold">Peril</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread (bp)</th>
                <th className="px-2 py-1.5 text-right font-bold">Price (cts)</th>
                <th className="px-2 py-1.5 text-right font-bold">EL (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">Attach/Exhaust</th>
                <th className="px-2 py-1.5 text-left font-bold">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.secondary?.map((s: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.name}</td>
                  <td className="px-2 py-1.5 text-white/60">{s.sponsor}</td>
                  <td className="px-2 py-1.5 text-white/70">{s.peril}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{s.spread}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{s.price}</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{s.el}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{s.attach}/{s.exhaust}%</td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${s.rating?.startsWith('BB') ? 'bg-bullish/15 text-bullish' : s.rating?.startsWith('B') && !s.rating?.startsWith('BB') ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-white/50'}`}>
                      {s.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'ilw' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Peril</th>
                <th className="px-2 py-1.5 text-right font-bold">Trigger ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Rate (% of limit)</th>
                <th className="px-2 py-1.5 text-right font-bold">1Y Chg (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">Capacity ($M)</th>
              </tr>
            </thead>
            <tbody>
              {data.ilw?.map((w: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{w.peril}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${w.trigger}B</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{w.rate}%</td>
                  <td className={`px-2 py-1.5 text-right ${w.change1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {w.change1y >= 0 ? '+' : ''}{w.change1y}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">${w.capacity}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'reinsurance' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Line</th>
                <th className="px-2 py-1.5 text-right font-bold">Rate on Line (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">1Y Chg (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">Loss Ratio (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">Combined Ratio (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.reinsurance?.map((r: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.line}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{r.rateOnLine}%</td>
                  <td className={`px-2 py-1.5 text-right ${r.change1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {r.change1y >= 0 ? '+' : ''}{r.change1y}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70">{r.lossRatio}%</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${r.combinedRatio > 100 ? 'text-bearish' : 'text-bullish'}`}>
                    {r.combinedRatio}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'pipeline' && (
          <div className="p-3 space-y-3">
            {data.pipeline?.map((p: any, i: number) => (
              <div key={i} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{p.name}</span>
                  <span className={`text-[7px] font-bold px-1.5 py-0.5 ${p.status === 'Pricing' ? 'bg-bullish/15 text-bullish' : p.status === 'In Market' ? 'bg-yellow-500/15 text-yellow-400' : p.status === 'Roadshow' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/10 text-white/50'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono mt-2">
                  <div>
                    <div className="text-neutral/40">Sponsor</div>
                    <div className="text-white/70">{p.sponsor}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Expected Size</div>
                    <div className="text-white/80 font-bold">${p.expectedSize}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Peril</div>
                    <div className="text-white/70">{p.peril}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Exp. Spread</div>
                    <div style={{ color: ACCENT }}>{p.expectedSpread}bp</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
