import { useState } from 'react';
import { useTotalReturnSwaps } from '../../api/hooks/use-total-return-swaps';

const ACCENT = '#e879f9'; // fuchsia-400
const ACCENT_DIM = 'rgba(232,121,249,0.08)';

type Tab = 'active' | 'financing' | 'collateral' | 'counterparty';

export function TotalReturnSwapsPanel() {
  const { data, isLoading, error } = useTotalReturnSwaps();
  const [tab, setTab] = useState<Tab>('active');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading TRS data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'ACTIVE TRS' },
    { key: 'financing', label: 'FINANCING' },
    { key: 'collateral', label: 'COLLATERAL' },
    { key: 'counterparty', label: 'COUNTERPARTY' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalNotional}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.avgFinancingSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Tenor</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgTenor}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Active</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.activeSwaps}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Collateral</div>
          <div className="text-[11px] font-mono font-black text-white/60">${data.summary?.totalCollateral}B</div>
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
        {tab === 'active' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">ID</th>
                <th className="px-2 py-1.5 text-left font-bold">Ref Asset</th>
                <th className="px-2 py-1.5 text-right font-bold">Notional</th>
                <th className="px-2 py-1.5 text-right font-bold">Dir</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread</th>
                <th className="px-2 py-1.5 text-right font-bold">Tenor</th>
                <th className="px-2 py-1.5 text-right font-bold">MTM</th>
                <th className="px-2 py-1.5 text-right font-bold">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.activeSwaps?.map((s: any) => (
                <tr key={s.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 text-white/40">{s.id}</td>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{s.referenceAsset}</span>
                    <span className="text-neutral/30 ml-1.5 text-[7px]">{s.assetType}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">${s.notional}M</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[7px] font-bold px-1 py-0 ${s.direction === 'Long' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>{s.direction}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{s.financingSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{s.tenor}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${s.currentMTM >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {s.currentMTM >= 0 ? '+' : ''}${s.currentMTM}M
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">{s.marginRequirement}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'financing' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">
              Financing Rates by Asset Type — SOFR: {data.summary?.sofrRate ?? '4.30'}%
            </div>
            {data.financingRates?.map((f: any) => (
              <div key={f.assetType} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{f.assetType}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{f.spreadRange}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Spread</div>
                    <div className="text-white/80 font-bold">{f.avgSpread}bp</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">All-in Rate</div>
                    <div className="font-bold" style={{ color: ACCENT }}>{f.allInRate}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Active Count</div>
                    <div className="text-white/60">{f.count}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'collateral' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Collateral Summary</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Total Posted</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>${data.collateral?.totalPosted}M</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Excess</div>
                <div className="text-[14px] font-mono font-black text-bullish">${data.collateral?.excessCollateral}M</div>
              </div>
            </div>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">By Type</div>
            {data.collateral?.byType?.map((t: any) => (
              <div key={t.type} className="flex items-center gap-3">
                <span className="text-[9px] font-mono w-12 text-right font-bold" style={{ color: ACCENT }}>{t.type}</span>
                <div className="flex-1 h-4 bg-white/5 overflow-hidden relative">
                  <div style={{ width: `${(t.amount / data.collateral.totalPosted) * 100}%`, height: '100%', background: ACCENT, opacity: 0.35 }} />
                  <span className="absolute right-1 top-0.5 text-[7px] text-white/50">${t.amount}M ({t.pct}%)</span>
                </div>
              </div>
            ))}

            {data.collateral?.marginCallsPending > 0 && (
              <div className="border border-bearish/20 p-3 bg-bearish/5">
                <div className="text-[9px] font-mono font-bold text-bearish">MARGIN CALLS PENDING: {data.collateral.marginCallsPending}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'counterparty' && (
          <div className="p-3 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Counterparty Exposure</div>
            {data.counterpartyExposure?.map((c: any) => (
              <div key={c.dealer} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{c.dealer}</span>
                  <span className={`text-[8px] font-mono font-bold ${c.netExposure >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                    Net: {c.netExposure >= 0 ? '+' : ''}${c.netExposure}M
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Notional</div>
                    <div className="text-white/80 font-bold">${c.notional}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">MTM Exposure</div>
                    <div className={`font-bold ${c.mtmExposure >= 0 ? 'text-bullish' : 'text-bearish'}`}>${c.mtmExposure}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Collateral Rcvd</div>
                    <div className="text-white/60">${c.collateralReceived}M</div>
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
