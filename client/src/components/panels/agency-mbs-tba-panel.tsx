import { useState } from 'react';
import { useAgencyMbsTba } from '../../api/hooks/use-agency-mbs-tba';

const ACCENT = '#22d3ee';
const ACCENT_DIM = 'rgba(34,211,238,0.08)';

type Tab = 'coupons' | 'roll' | 'prepay' | 'issuance';

export function AgencyMbsTbaPanel() {
  const { data, isLoading, error } = useAgencyMbsTba();
  const [tab, setTab] = useState<Tab>('coupons');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading agency MBS data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'coupons', label: 'COUPONS' },
    { key: 'roll', label: 'ROLL' },
    { key: 'prepay', label: 'PREPAY' },
    { key: 'issuance', label: 'ISSUANCE' },
  ];

  const chgColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400';

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Current Coupon</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.currentCoupon ?? '--'}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">CC Spread (bp)</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.ccSpread ?? '--'}bp</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg CPR (%)</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.avgCpr ?? '--'}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">TBA Vol ($B)</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.tbaVolume ?? '--'}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Roll Special (32nds)</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.rollSpecial ?? '--'}</div>
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
        {tab === 'coupons' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
                <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread (bp)</th>
                <th className="px-2 py-1.5 text-right font-bold">OAS (bp)</th>
                <th className="px-2 py-1.5 text-right font-bold">Duration</th>
                <th className="px-2 py-1.5 text-right font-bold">CPR %</th>
                <th className="px-2 py-1.5 text-right font-bold">Convexity</th>
              </tr>
            </thead>
            <tbody>
              {data.coupons?.map((c: any) => (
                <tr key={c.coupon} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.coupon}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{c.price}</td>
                  <td className={`px-2 py-1.5 text-right ${chgColor(c.change1d)}`}>{c.change1d >= 0 ? '+' : ''}{c.change1d}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{c.spread}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.oas}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.duration}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.cpr}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.convexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'roll' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Month</th>
                <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">Drop (32nds)</th>
                <th className="px-2 py-1.5 text-right font-bold">Impl Financing (%)</th>
                <th className="px-2 py-1.5 text-right font-bold">Specialness</th>
                <th className="px-2 py-1.5 text-right font-bold">Day Count</th>
              </tr>
            </thead>
            <tbody>
              {data.rolls?.map((r: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.month}</td>
                  <td className="px-2 py-1.5 text-right text-white/80">{r.coupon}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{r.drop}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{r.impliedFinancing}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{r.specialness}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{r.dayCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'prepay' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Vintage</th>
                <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">CPR 1M</th>
                <th className="px-2 py-1.5 text-right font-bold">CPR 3M</th>
                <th className="px-2 py-1.5 text-right font-bold">CPR 6M</th>
                <th className="px-2 py-1.5 text-right font-bold">CPR 12M</th>
                <th className="px-2 py-1.5 text-right font-bold">Factor</th>
              </tr>
            </thead>
            <tbody>
              {data.prepays?.map((p: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{p.vintage}</td>
                  <td className="px-2 py-1.5 text-right text-white/80">{p.coupon}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{p.cpr1m}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{p.cpr3m}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{p.cpr6m}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{p.cpr12m}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{p.factor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'issuance' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Issuer</th>
                <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">Settlement</th>
                <th className="px-2 py-1.5 text-right font-bold">Size ($B)</th>
                <th className="px-2 py-1.5 text-right font-bold">Type</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
              </tr>
            </thead>
            <tbody>
              {data.issuances?.map((iss: any, i: number) => {
                const issuerColor = iss.issuer === 'FNMA' ? '#60a5fa' : iss.issuer === 'FHLMC' ? '#fbbf24' : iss.issuer === 'GNMA' ? '#4ade80' : ACCENT;
                const issuerBg = iss.issuer === 'FNMA' ? 'bg-blue-400/15' : iss.issuer === 'FHLMC' ? 'bg-yellow-400/15' : iss.issuer === 'GNMA' ? 'bg-green-400/15' : '';
                return (
                  <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5">
                      <span className={`text-[7px] font-bold px-1 py-0 ${issuerBg}`} style={{ color: issuerColor }}>{iss.issuer}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/80">{iss.coupon}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{iss.settlement}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">${iss.size}B</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{iss.type}</td>
                    <td className="px-2 py-1.5 text-right text-white/80">{iss.price}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
