import { useState } from 'react';
import { useInflationLinkedBonds } from '../../api/hooks/use-inflation-linked-bonds';

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.08)';

type Tab = 'tips' | 'global' | 'breakeven' | 'realCurve';

export function InflationLinkedBondsPanel() {
  const { data, isLoading, error } = useInflationLinkedBonds();
  const [tab, setTab] = useState<Tab>('tips');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading inflation-linked bond data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tips', label: 'US TIPS' },
    { key: 'global', label: 'GLOBAL LINKERS' },
    { key: 'breakeven', label: 'BREAKEVENS' },
    { key: 'realCurve', label: 'REAL CURVE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="grid grid-cols-6 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Outstanding</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalOutstanding}T</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Real Yld</div>
          <div className="text-[11px] font-mono font-black text-white/80">{data.summary?.avgRealYield}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">10Y BE</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.breakeven10Y}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">5Y5Y Fwd</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.forward5Y5Y}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">CPI YoY</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.latestCPI}%</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg BE</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgBreakeven}%</div>
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
        {tab === 'tips' && (
          <table className="w-full text-[8px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Maturity</th>
                <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">Real Yld</th>
                <th className="px-2 py-1.5 text-right font-bold">Nominal</th>
                <th className="px-2 py-1.5 text-right font-bold">BE</th>
                <th className="px-2 py-1.5 text-right font-bold">Price</th>
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-right font-bold">Idx Ratio</th>
              </tr>
            </thead>
            <tbody>
              {data.usTips?.map((t: any) => (
                <tr key={t.maturity} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{t.maturity}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{t.coupon}%</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{t.realYield}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{t.nominalYield}%</td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{t.breakeven}%</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{t.price}</td>
                  <td className={`px-2 py-1.5 text-right ${t.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {t.change1d >= 0 ? '+' : ''}{t.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">{t.indexRatio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'global' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Country</th>
                <th className="px-2 py-1.5 text-left font-bold">Bond</th>
                <th className="px-2 py-1.5 text-right font-bold">Maturity</th>
                <th className="px-2 py-1.5 text-right font-bold">Real Yld</th>
                <th className="px-2 py-1.5 text-right font-bold">BE</th>
                <th className="px-2 py-1.5 text-right font-bold">1D</th>
                <th className="px-2 py-1.5 text-right font-bold">CCY</th>
              </tr>
            </thead>
            <tbody>
              {data.globalLinkers?.map((g: any) => (
                <tr key={g.name} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{g.country}</td>
                  <td className="px-2 py-1.5 text-white/60">{g.name}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{g.maturity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{g.realYield}%</td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{g.breakeven}%</td>
                  <td className={`px-2 py-1.5 text-right ${g.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {g.change1d >= 0 ? '+' : ''}{g.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">{g.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'breakeven' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Breakeven Term Structure</div>
            <table className="w-full text-[9px] font-mono mb-4">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">BE Rate</th>
                  <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">vs 1Y Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.breakevenTermStructure?.map((b: any) => (
                  <tr key={b.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{b.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{b.breakeven}%</td>
                    <td className={`px-2 py-1.5 text-right ${b.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {b.change1d >= 0 ? '+' : ''}{b.change1d}bp
                    </td>
                    <td className={`px-2 py-1.5 text-right ${b.change1m >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {b.change1m >= 0 ? '+' : ''}{b.change1m}bp
                    </td>
                    <td className={`px-2 py-1.5 text-right ${b.relativeToAvg >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                      {b.relativeToAvg >= 0 ? '+' : ''}{b.relativeToAvg}bp
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Monthly CPI Seasonality</div>
            <div className="flex items-end gap-2 h-16">
              {data.seasonality?.map((s: any) => {
                const max = Math.max(...data.seasonality.map((x: any) => Math.abs(x.factor)));
                const h = max > 0 ? (Math.abs(s.factor) / max) * 100 : 0;
                return (
                  <div key={s.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: '50px' }}>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${h}%`, background: s.factor >= 0 ? ACCENT : '#60a5fa', opacity: 0.4 }} />
                    </div>
                    <div className="text-[6px] text-neutral/30 mt-0.5">{s.month}</div>
                    <div className={`text-[6px] font-bold ${s.factor >= 0 ? '' : 'text-blue-400'}`} style={{ color: s.factor >= 0 ? ACCENT : undefined }}>{s.factor > 0 ? '+' : ''}{s.factor}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'realCurve' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Real Yield Curve</div>
            <table className="w-full text-[9px] font-mono mb-4">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Tenor</th>
                  <th className="px-2 py-1.5 text-right font-bold">Real Yield</th>
                  <th className="px-2 py-1.5 text-right font-bold">Nominal</th>
                  <th className="px-2 py-1.5 text-right font-bold">Breakeven</th>
                  <th className="px-2 py-1.5 text-right font-bold">1D Chg</th>
                </tr>
              </thead>
              <tbody>
                {data.realYieldCurve?.map((r: any) => (
                  <tr key={r.tenor} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.tenor}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{r.realYield}%</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{r.nominalYield}%</td>
                    <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{r.breakeven}%</td>
                    <td className={`px-2 py-1.5 text-right ${r.change1d >= 0 ? 'text-bearish' : 'text-bullish'}`}>
                      {r.change1d >= 0 ? '+' : ''}{r.change1d}bp
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Curve Visualization</div>
            <div className="flex items-end gap-4 h-20">
              {data.realYieldCurve?.map((r: any) => {
                const maxY = Math.max(...data.realYieldCurve.map((x: any) => x.nominalYield));
                return (
                  <div key={r.tenor} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: '60px' }}>
                      {[{ v: r.realYield, c: ACCENT }, { v: r.breakeven, c: '#60a5fa' }].map((bar, i) => (
                        <div key={i} className="flex-1 relative" style={{ height: '60px' }}>
                          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(bar.v / maxY) * 100}%`, background: bar.c, opacity: 0.35 }} />
                        </div>
                      ))}
                    </div>
                    <div className="text-[7px] text-neutral/30">{r.tenor}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-1 text-[7px] font-mono text-neutral/30">
              <span className="flex items-center gap-1"><span className="w-3 h-1.5" style={{ background: ACCENT, opacity: 0.5 }} /> Real Yield</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-400/50" /> Breakeven</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
