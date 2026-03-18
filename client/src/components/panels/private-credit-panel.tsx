import { useState, useMemo } from 'react';
import { usePrivateCredit } from '../../api/hooks/use-private-credit';

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.08)';

type Tab = 'bdcs' | 'loans' | 'defaults' | 'overview';

export function PrivateCreditPanel() {
  const { data, isLoading, error } = usePrivateCredit();
  const [tab, setTab] = useState<Tab>('bdcs');
  const [sortCol, setSortCol] = useState<string>('ticker');
  const [sortAsc, setSortAsc] = useState(true);

  const bdcsSorted = useMemo(() => {
    if (!data?.bdcs) return [];
    const arr = [...data.bdcs];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? a.portfolio?.[sortCol] ?? 0;
      const vb = b[sortCol] ?? b.portfolio?.[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading private credit data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bdcs', label: 'BDCs' },
    { key: 'loans', label: 'LOAN INDICES' },
    { key: 'defaults', label: 'DEFAULTS' },
    { key: 'overview', label: 'OVERVIEW' },
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
      {/* Tabs */}
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
          SOFR: {data.marketMetrics?.sofrRate}%
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'bdcs' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="name" label="Name" />
                <SortHeader col="aum" label="AUM ($B)" right />
                <SortHeader col="nav" label="NAV" right />
                <SortHeader col="price" label="Price" right />
                <SortHeader col="premDisc" label="Prem/Disc" right />
                <SortHeader col="divYield" label="Div Yield" right />
                <SortHeader col="totalReturn1y" label="1Y Return" right />
                <SortHeader col="nonAccrual" label="Non-Accrual" right />
                <SortHeader col="leverage" label="Leverage" right />
                <SortHeader col="pctFirstLien" label="1st Lien %" right />
              </tr>
            </thead>
            <tbody>
              {bdcsSorted.map((b: any) => (
                <tr key={b.ticker} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{b.ticker}</td>
                  <td className="px-2 py-1.5 text-white/70">{b.name}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{b.aum}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">${b.nav.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">${b.price.toFixed(2)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${b.premDisc >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {b.premDisc >= 0 ? '+' : ''}{b.premDisc.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{b.divYield.toFixed(2)}%</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${b.totalReturn1y >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {b.totalReturn1y >= 0 ? '+' : ''}{b.totalReturn1y.toFixed(2)}%
                  </td>
                  <td className={`px-2 py-1.5 text-right ${b.portfolio.nonAccrual > 3 ? 'text-bearish' : 'text-white/50'}`}>
                    {b.portfolio.nonAccrual.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.portfolio.leverage.toFixed(2)}x</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{b.portfolio.pctFirstLien.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'loans' && (
          <div className="p-3 space-y-4">
            {data.loanIndices?.map((l: any) => (
              <div key={l.id} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: ACCENT }}>{l.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{l.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-white">{l.level.toFixed(3)}</span>
                    <span className={`text-[8px] font-mono ml-2 ${l.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {l.change1d >= 0 ? '+' : ''}{l.change1d.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40 uppercase">Yield</div>
                    <div className="text-white/80 font-bold">{l.yield.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40 uppercase">1D Chg</div>
                    <div className={l.change1d >= 0 ? 'text-bullish' : 'text-bearish'}>{l.change1d >= 0 ? '+' : ''}{l.change1d.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40 uppercase">1M Chg</div>
                    <div className={l.change1m >= 0 ? 'text-bullish' : 'text-bearish'}>{l.change1m >= 0 ? '+' : ''}{l.change1m.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40 uppercase">3M Chg</div>
                    <div className={l.change3m >= 0 ? 'text-bullish' : 'text-bearish'}>{l.change3m >= 0 ? '+' : ''}{l.change3m.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40 uppercase">Sprd/SOFR</div>
                    <div className="text-white/70">{l.spreadToSOFR}bp</div>
                  </div>
                </div>
                {/* Mini sparkline bar chart for history */}
                <div className="mt-2 flex items-end gap-[2px] h-6">
                  {l.history?.map((h: any, i: number) => {
                    const min = Math.min(...l.history.map((x: any) => x.yield));
                    const max = Math.max(...l.history.map((x: any) => x.yield));
                    const range = max - min || 1;
                    const pct = ((h.yield - min) / range) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-0"
                        style={{ height: `${Math.max(10, pct)}%`, background: ACCENT, opacity: 0.4 + (i / l.history.length) * 0.6 }}
                        title={`${h.date}: ${h.yield}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'defaults' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Month</th>
                  <th className="px-2 py-1.5 text-right">Lev Loan Default %</th>
                  <th className="px-2 py-1.5 text-right">HY Default %</th>
                  <th className="px-2 py-1.5 text-right">Recovery Rate %</th>
                </tr>
              </thead>
              <tbody>
                {data.defaultTrend?.map((d: any, i: number) => (
                  <tr key={i} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 text-white/60">{d.date}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${d.leveragedLoanDefault > 2.5 ? 'text-bearish' : 'text-white/70'}`}>
                      {d.leveragedLoanDefault.toFixed(2)}%
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${d.highYieldDefault > 3.0 ? 'text-bearish' : 'text-white/70'}`}>
                      {d.highYieldDefault.toFixed(2)}%
                    </td>
                    <td className={`px-2 py-1.5 text-right ${d.recoveryRate < 50 ? 'text-bearish/70' : 'text-bullish/70'}`}>
                      {d.recoveryRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'overview' && (
          <div className="p-4 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">Market Overview</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Private Credit AUM', value: `$${data.marketMetrics?.totalPrivateCreditAUM}T`, accent: true },
                { label: 'Avg BDC Div Yield', value: `${data.marketMetrics?.avgBDCDivYield}%`, accent: true },
                { label: 'Avg BDC Prem/Disc', value: `${data.marketMetrics?.avgBDCPremDisc > 0 ? '+' : ''}${data.marketMetrics?.avgBDCPremDisc}%`, bullBear: data.marketMetrics?.avgBDCPremDisc },
                { label: 'Avg Loan Yield', value: `${data.marketMetrics?.avgLoanYield}%` },
                { label: 'Current Default Rate', value: `${data.marketMetrics?.currentDefaultRate}%`, warn: data.marketMetrics?.currentDefaultRate > 2.5 },
                { label: 'SOFR Rate', value: `${data.marketMetrics?.sofrRate}%` },
              ].map((m, i) => (
                <div key={i} className="border border-border/10 p-3">
                  <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{m.label}</div>
                  <div
                    className="text-[14px] font-mono font-black"
                    style={{
                      color: m.accent ? ACCENT : m.bullBear !== undefined ? (m.bullBear >= 0 ? '#4ade80' : '#f87171') : m.warn ? '#f87171' : 'white',
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
