import { useState, useMemo } from 'react';
import { useConvertibleBonds } from '../../api/hooks/use-convertible-bonds';

const ACCENT = '#818cf8'; // indigo-400
const ACCENT_DIM = 'rgba(129,140,248,0.08)';

type Tab = 'bonds' | 'greeks' | 'credit' | 'summary';

export function ConvertibleBondsPanel() {
  const { data, isLoading, error } = useConvertibleBonds();
  const [tab, setTab] = useState<Tab>('bonds');
  const [sortCol, setSortCol] = useState<string>('bondPrice');
  const [sortAsc, setSortAsc] = useState(false);

  const bondsSorted = useMemo(() => {
    if (!data?.bonds) return [];
    const arr = [...data.bonds];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0; const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading convertible bond data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bonds', label: 'BONDS' },
    { key: 'greeks', label: 'GREEKS' },
    { key: 'credit', label: 'CREDIT' },
    { key: 'summary', label: 'SUMMARY' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const MoneynessTag = ({ m }: { m: string }) => (
    <span className={`text-[7px] font-bold px-1 py-0 ${m === 'ITM' ? 'bg-bullish/15 text-bullish' : m === 'ATM' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-bearish/15 text-bearish'}`}>
      {m}
    </span>
  );

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
        {tab === 'bonds' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="issuer" label="Issuer" />
                <SortHeader col="maturity" label="Mat" right />
                <SortHeader col="bondPrice" label="Price" right />
                <SortHeader col="parity" label="Parity" right />
                <SortHeader col="premium" label="Premium" right />
                <SortHeader col="stockPrice" label="Stock" right />
                <SortHeader col="change1d" label="1D" right />
                <th className="px-2 py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bondsSorted.map((b: any) => (
                <tr key={b.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{b.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{b.issuer}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">{b.maturity}</td>
                  <td className="px-2 py-1.5 text-right text-white/80 font-bold">{b.bondPrice}</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.parity}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{b.premium}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">${b.stockPrice}</td>
                  <td className={`px-2 py-1.5 text-right ${b.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {b.change1d >= 0 ? '+' : ''}{b.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right"><MoneynessTag m={b.moneyness} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'greeks' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="delta" label="Delta" right />
                <SortHeader col="gamma" label="Gamma" right />
                <SortHeader col="impliedVol" label="Impl Vol" right />
                <SortHeader col="conversionRatio" label="Conv Ratio" right />
                <SortHeader col="conversionPrice" label="Conv Price" right />
                <th className="px-2 py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bondsSorted.map((b: any) => (
                <tr key={b.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{b.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{b.coupon}% {b.maturity}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={b.delta >= 0.7 ? 'text-bullish font-bold' : b.delta >= 0.4 ? 'text-white/80 font-bold' : 'text-white/50'}>{b.delta}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.gamma}</td>
                  <td className="px-2 py-1.5 text-right text-white/70 font-bold">{b.impliedVol}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.conversionRatio}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">${b.conversionPrice}</td>
                  <td className="px-2 py-1.5 text-right"><MoneynessTag m={b.moneyness} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'credit' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="coupon" label="Coupon" right />
                <SortHeader col="creditSpread" label="Cr Spread" right />
                <SortHeader col="ytm" label="YTM" right />
                <SortHeader col="ytc" label="YTC" right />
                <SortHeader col="size" label="Size ($M)" right />
                <SortHeader col="stockChange1d" label="Stk 1D" right />
              </tr>
            </thead>
            <tbody>
              {bondsSorted.map((b: any) => (
                <tr key={b.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{b.ticker}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{b.issuer}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{b.coupon}%</td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: ACCENT }}>{b.creditSpread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/70">{b.ytm}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.ytc}%</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.size}</td>
                  <td className={`px-2 py-1.5 text-right ${b.stockChange1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {b.stockChange1d >= 0 ? '+' : ''}{b.stockChange1d}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'summary' && (
          <div className="p-3 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Total Bonds</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.totalBonds}</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Outstanding</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalOutstanding}B</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Premium</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.avgPremium}%</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Delta</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.avgDelta}</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Impl Vol</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.avgImpliedVol}%</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Spread</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgCreditSpread}bp</div>
              </div>
            </div>

            {/* Moneyness breakdown */}
            <div className="border border-border/10 p-3">
              <div className="text-[9px] font-mono font-black uppercase mb-3" style={{ color: ACCENT }}>Moneyness Breakdown</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase">ITM</div>
                  <div className="text-[16px] font-mono font-black text-bullish">{data.summary?.moneynessBreakdown?.itm}</div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase">ATM</div>
                  <div className="text-[16px] font-mono font-black text-yellow-400">{data.summary?.moneynessBreakdown?.atm}</div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase">OTM</div>
                  <div className="text-[16px] font-mono font-black text-bearish">{data.summary?.moneynessBreakdown?.otm}</div>
                </div>
              </div>
            </div>

            {/* Delta bars */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Delta by Issue</div>
              {data.bonds?.sort((a: any, b: any) => b.delta - a.delta).map((b: any) => (
                <div key={b.ticker} className="flex items-center gap-2 py-0.5">
                  <span className="text-[8px] font-mono w-10 text-right" style={{ color: ACCENT }}>{b.ticker}</span>
                  <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
                    <div style={{ width: `${b.delta * 100}%`, height: '100%', background: b.delta >= 0.7 ? '#4ade80' : b.delta >= 0.4 ? ACCENT : '#f87171', opacity: 0.4 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/50 w-8 text-right">{b.delta}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
