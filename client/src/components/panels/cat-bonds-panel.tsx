import { useState } from 'react';
import { useCatBonds } from '../../api/hooks/use-cat-bonds';

const ACCENT = '#f97316'; // orange-500
const ACCENT_DIM = 'rgba(249,115,22,0.08)';

type Tab = 'bonds' | 'perils' | 'events' | 'pipeline';

export function CatBondsPanel() {
  const { data, isLoading, error } = useCatBonds();
  const [tab, setTab] = useState<Tab>('bonds');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading cat bond data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bonds', label: 'BONDS' },
    { key: 'perils', label: 'PERILS' },
    { key: 'events', label: 'EVENTS' },
    { key: 'pipeline', label: 'PIPELINE' },
  ];

  const perilColor = (p: string) => {
    if (p.includes('Hurricane')) return '#ef4444';
    if (p.includes('Earthquake')) return '#f97316';
    if (p.includes('Wildfire')) return '#fbbf24';
    if (p.includes('Windstorm')) return '#60a5fa';
    if (p.includes('Typhoon')) return '#a78bfa';
    if (p.includes('Flood')) return '#2dd4bf';
    return '#94a3b8';
  };

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-6 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Outstanding</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalOutstanding}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">YTD Issuance</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.ytdIssuance}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg EL</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.avgExpectedLoss}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Active</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.activeBonds}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Coupon</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgCoupon}%</div>
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
        {tab === 'bonds' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Bond</th>
                <th className="px-2 py-1.5 text-left font-bold">Peril</th>
                <th className="px-2 py-1.5 text-right font-bold">Size</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread</th>
                <th className="px-2 py-1.5 text-right font-bold">EL</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-left font-bold">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {data.bonds?.map((b: any) => (
                <tr key={b.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <div className="font-bold" style={{ color: ACCENT }}>{b.id}</div>
                    <div className="text-neutral/30 text-[7px]">{b.sponsor} — {b.rating}</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-[7px] font-bold px-1 py-0" style={{ color: perilColor(b.peril), background: `${perilColor(b.peril)}15` }}>{b.peril}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${b.size}M</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: b.spread >= 800 ? '#ef4444' : ACCENT }}>{b.spread}bp</td>
                  <td className="px-2 py-1.5 text-right text-bearish">{b.expectedLoss}%</td>
                  <td className="px-2 py-1.5 text-right text-white/70 font-bold">{b.price}</td>
                  <td className={`px-2 py-1.5 text-right ${b.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {b.change1d >= 0 ? '+' : ''}{b.change1d}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-[7px] text-neutral/40">{b.triggerType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'perils' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Peril Breakdown</div>
            {data.perilBreakdown?.map((p: any) => (
              <div key={p.peril} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: perilColor(p.peril) }}>{p.peril}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{p.count} bonds</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Outstanding</div>
                    <div className="text-white/80 font-bold">${p.totalOutstanding}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Avg Spread</div>
                    <div style={{ color: ACCENT }}>{p.avgSpread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Avg EL</div>
                    <div className="text-bearish">{p.avgExpectedLoss}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">YTD Return</div>
                    <div className={p.ytdReturn >= 0 ? 'text-bullish' : 'text-bearish'}>{p.ytdReturn >= 0 ? '+' : ''}{p.ytdReturn}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Recent Catastrophe Events</div>
            {data.recentEvents?.map((e: any, i: number) => (
              <div key={i} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black" style={{ color: perilColor(e.peril) }}>{e.event}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{e.date}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono mt-2">
                  <div>
                    <div className="text-neutral/40">Peril</div>
                    <div style={{ color: perilColor(e.peril) }}>{e.peril}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Est. Loss</div>
                    <div className="text-bearish font-bold">${e.estimatedLoss}B</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Bonds Affected</div>
                    <div className="text-white/80">{e.bondsAffected}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Price Impact</div>
                    <div className="text-bearish">{e.avgPriceImpact}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pipeline' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Issuance Pipeline</div>
            {data.issuancePipeline?.map((p: any, i: number) => (
              <div key={i} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{p.name}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{p.expectedPricing}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[8px] font-mono mt-2">
                  <div>
                    <div className="text-neutral/40">Sponsor</div>
                    <div className="text-white/70">{p.sponsor}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Peril</div>
                    <div style={{ color: perilColor(p.peril) }}>{p.peril}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Size</div>
                    <div className="text-white/80 font-bold">${p.size}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Exp. Spread</div>
                    <div style={{ color: ACCENT }}>{p.expectedSpreadRange}</div>
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
