import { useState } from 'react';
import { useLoanCds } from '../../api/hooks/use-loan-cds';

const ACCENT = '#f472b6'; // pink-400
const ACCENT_DIM = 'rgba(244,114,182,0.08)';

type Tab = 'names' | 'index' | 'recovery' | 'relValue';

export function LoanCdsPanel() {
  const { data, isLoading, error } = useLoanCds();
  const [tab, setTab] = useState<Tab>('names');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading LCDS data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'names', label: 'SINGLE NAMES' },
    { key: 'index', label: 'LCDX INDEX' },
    { key: 'recovery', label: 'RECOVERY' },
    { key: 'relValue', label: 'REL VALUE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-6 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">LCDX</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.lcdxSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">1D Chg</div>
          <div className={`text-[11px] font-mono font-black ${data.summary?.change1d >= 0 ? 'text-bearish' : 'text-bullish'}`}>
            {data.summary?.change1d >= 0 ? '+' : ''}{data.summary?.change1d}bp
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Notional</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalNotional}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Spread</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgSingleNameSpread}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Recovery</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.recoveryRate}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Names</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.activeNames}</div>
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
        {tab === 'names' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Name</th>
                <th className="px-2 py-1.5 text-left font-bold">Rating</th>
                <th className="px-2 py-1.5 text-right font-bold">LCDS</th>
                <th className="px-2 py-1.5 text-right font-bold">CDS</th>
                <th className="px-2 py-1.5 text-right font-bold">Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-right font-bold">Loan Px</th>
              </tr>
            </thead>
            <tbody>
              {data.singleNames?.map((n: any) => (
                <tr key={n.name} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{n.name}</span>
                    <span className="text-neutral/30 ml-1 text-[7px]">{n.sector}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${n.rating.startsWith('CCC') ? 'bg-bearish/15 text-bearish' : n.rating === 'B-' ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{n.rating}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{n.lcdsSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{n.cdsSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-bullish">{n.basisVsUnsecured}bp</td>
                  <td className={`px-2 py-1.5 text-right ${n.change1d >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                    {n.change1d >= 0 ? '+' : ''}{n.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{n.loanPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'index' && data.index && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">LCDX Index — Series {data.index.series}</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Spread</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.index.spread}bp</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Price</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.index.price}</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">DV01</div>
                <div className="text-[14px] font-mono font-black text-white/60">${data.index.dv01}K</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-[8px] font-mono">
              <div>
                <div className="text-neutral/40">1D Change</div>
                <div className={data.index.change1d >= 0 ? 'text-bearish' : 'text-bullish'}>{data.index.change1d >= 0 ? '+' : ''}{data.index.change1d}bp</div>
              </div>
              <div>
                <div className="text-neutral/40">1W Change</div>
                <div className={data.index.change1w >= 0 ? 'text-bearish' : 'text-bullish'}>{data.index.change1w >= 0 ? '+' : ''}{data.index.change1w}bp</div>
              </div>
              <div>
                <div className="text-neutral/40">Coupon</div>
                <div className="text-white/70">{data.index.coupon}bp</div>
              </div>
              <div>
                <div className="text-neutral/40">Maturity</div>
                <div className="text-white/50">{data.index.maturity}</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'recovery' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Recovery Rate Analysis</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">LCDS Recovery</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.recovery?.lcdsAssumption}%</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">CDS Recovery</div>
                <div className="text-[14px] font-mono font-black text-white/60">{data.recovery?.cdsAssumption}%</div>
              </div>
            </div>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Historical Recovery by Sector</div>
            {data.recovery?.bySector?.map((s: any) => (
              <div key={s.sector} className="flex items-center gap-3">
                <span className="text-[8px] font-mono w-20 text-right" style={{ color: ACCENT }}>{s.sector}</span>
                <div className="flex-1 flex gap-1">
                  <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                    <div style={{ width: `${s.loanRecovery}%`, height: '100%', background: ACCENT, opacity: 0.4 }} />
                    <span className="absolute right-1 top-0 text-[6px] text-white/50">Loan {s.loanRecovery}%</span>
                  </div>
                  <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                    <div style={{ width: `${s.bondRecovery}%`, height: '100%', background: '#94a3b8', opacity: 0.4 }} />
                    <span className="absolute right-1 top-0 text-[6px] text-white/50">Bond {s.bondRecovery}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'relValue' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Name</th>
                <th className="px-2 py-1.5 text-right font-bold">LCDS</th>
                <th className="px-2 py-1.5 text-right font-bold">CDS</th>
                <th className="px-2 py-1.5 text-right font-bold">Loan Px</th>
                <th className="px-2 py-1.5 text-right font-bold">Bond Px</th>
                <th className="px-2 py-1.5 text-right font-bold">Basis</th>
                <th className="px-2 py-1.5 text-right font-bold">Signal</th>
              </tr>
            </thead>
            <tbody>
              {data.relativeValue?.map((r: any) => (
                <tr key={r.name} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.name}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{r.lcdsSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{r.cdsSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{r.loanPrice}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{r.bondPrice}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{r.impliedBasis}%</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[7px] font-bold px-1 py-0 ${r.signal === 'Cheap' ? 'bg-bullish/15 text-bullish' : r.signal === 'Rich' ? 'bg-bearish/15 text-bearish' : 'bg-white/10 text-white/50'}`}>{r.signal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
