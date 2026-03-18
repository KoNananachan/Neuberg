import { useState, useMemo } from 'react';
import { useDebtIssuance } from '../../api/hooks/use-debt-issuance';

const ACCENT = '#f59e0b'; // amber-500
const ACCENT_DIM = 'rgba(245,158,11,0.08)';

type Tab = 'deals' | 'pipeline' | 'volume' | 'summary';

export function DebtIssuancePanel() {
  const { data, isLoading, error } = useDebtIssuance();
  const [tab, setTab] = useState<Tab>('deals');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<string>('pricingDate');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredDeals = useMemo(() => {
    if (!data?.deals) return [];
    let arr = [...data.deals];
    if (typeFilter !== 'all') arr = arr.filter((d: any) => d.dealType === typeFilter);
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, typeFilter, sortCol, sortAsc]);

  const dealTypes = useMemo((): string[] => {
    if (!data?.deals) return ['all'];
    return ['all', ...Array.from(new Set<string>(data.deals.map((d: any) => d.dealType)))];
  }, [data]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading DCM data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'deals', label: 'NEW ISSUES' },
    { key: 'pipeline', label: 'PIPELINE' },
    { key: 'volume', label: 'ISSUANCE VOL' },
    { key: 'summary', label: 'OVERVIEW' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'deals' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-black border border-border/20 text-[8px] font-mono text-white/60 px-1.5 py-0.5 mr-2">
            {dealTypes.map(t => <option key={t} value={t}>{t === 'all' ? 'ALL TYPES' : t.toUpperCase()}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'deals' && (
          <div>
            {filteredDeals.map((deal: any) => (
              <div key={deal.id} className="border-b border-border/10 p-3 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{deal.issuer}</span>
                  <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 ${
                    deal.status === 'Pricing Today' ? 'bg-blue-500/20 text-blue-400' :
                    deal.status === 'Just Priced' ? 'bg-bullish/15 text-bullish' :
                    'bg-white/5 text-white/30'
                  }`}>{deal.status}</span>
                  <span className="text-[7px] font-mono text-neutral/30 ml-auto">{deal.pricingDate}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <span className="text-[7px] font-mono px-1 py-0 bg-white/5 text-white/40">{deal.dealType}</span>
                  <span className="text-[7px] font-mono px-1 py-0 bg-white/5 text-white/40">{deal.structure}</span>
                  <span className="text-[7px] font-mono px-1 py-0 bg-white/5 text-white/40">{deal.rating}</span>
                  <span className="text-[7px] font-mono px-1 py-0 bg-white/5 text-white/40">{deal.currency}</span>
                </div>

                <div className="grid grid-cols-6 gap-2 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Size</div>
                    <div className="text-white/70 font-bold">${deal.size}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Coupon</div>
                    <div className="text-white/70">{deal.coupon}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Spread</div>
                    <div style={{ color: ACCENT }}>{deal.finalSpread}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Maturity</div>
                    <div className="text-white/60">{deal.maturityYears}Y</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Book Size</div>
                    <div className="text-white/60">${deal.bookSize}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Oversub</div>
                    <div className={deal.oversubscription >= 3 ? 'text-bullish font-bold' : 'text-white/60'}>{deal.oversubscription}x</div>
                  </div>
                </div>

                <div className="mt-1 text-[7px] font-mono text-neutral/30">
                  Lead: {deal.leadManagers.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pipeline' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left">Issuer</th>
                <th className="px-2 py-1.5 text-left">Type</th>
                <th className="px-2 py-1.5 text-right">Exp. Size</th>
                <th className="px-2 py-1.5 text-left">Currency</th>
                <th className="px-2 py-1.5 text-left">Rating</th>
                <th className="px-2 py-1.5 text-left">Timing</th>
              </tr>
            </thead>
            <tbody>
              {data.pipeline?.map((p: any) => (
                <tr key={p.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{p.issuer}</td>
                  <td className="px-2 py-1.5 text-white/50">{p.dealType}</td>
                  <td className="px-2 py-1.5 text-right text-white/70">${p.expectedSize}M</td>
                  <td className="px-2 py-1.5 text-white/50">{p.currency}</td>
                  <td className="px-2 py-1.5 text-white/50">{p.rating}</td>
                  <td className="px-2 py-1.5">
                    <span className="text-[7px] font-bold px-1.5 py-0.5 bg-blue-500/15 text-blue-400">{p.expectedTiming}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'volume' && (
          <div className="p-3 space-y-4">
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-2">Volume by Type</div>
              {data.volumeByType?.map((v: any) => (
                <div key={v.type} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] font-mono text-white/50 w-28">{v.type}</span>
                  <div className="flex-1 h-3 bg-white/5 overflow-hidden">
                    <div style={{ width: `${Math.min(100, (v.volume / (data.volumeByType[0]?.volume || 1)) * 100)}%`, height: '100%', background: ACCENT, opacity: 0.6 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/60 w-20 text-right">${v.volume}M ({v.count})</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-2">Volume by Currency</div>
              {data.volumeByCurrency?.map((v: any) => (
                <div key={v.currency} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] font-mono text-white/50 w-10">{v.currency}</span>
                  <div className="flex-1 h-3 bg-white/5 overflow-hidden">
                    <div style={{ width: `${Math.min(100, (v.volume / (data.volumeByCurrency[0]?.volume || 1)) * 100)}%`, height: '100%', background: ACCENT, opacity: 0.6 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/60 w-20 text-right">${v.volume}M</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-2">Weekly Issuance (12W)</div>
              <div className="flex items-end gap-[3px] h-24">
                {data.weeklyVolume?.map((w: any, i: number) => {
                  const total = w.igVolume + w.hyVolume + w.leveragedLoan;
                  const maxVol = Math.max(...data.weeklyVolume.map((x: any) => x.igVolume + x.hyVolume + x.leveragedLoan));
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full" title={`${w.week}: $${total}M`}>
                      <div style={{ height: `${(w.igVolume / maxVol) * 100}%`, background: '#4ade80', opacity: 0.5 }} />
                      <div style={{ height: `${(w.hyVolume / maxVol) * 100}%`, background: '#fbbf24', opacity: 0.5 }} />
                      <div style={{ height: `${(w.leveragedLoan / maxVol) * 100}%`, background: '#f87171', opacity: 0.5 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[7px] font-mono">
                <span className="text-green-400/70">■ IG</span>
                <span className="text-yellow-400/70">■ HY</span>
                <span className="text-red-400/70">■ Lev Loan</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'summary' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Deals', value: data.summary?.totalDeals },
                { label: 'Total Volume', value: `$${(data.summary?.totalVolume / 1000).toFixed(1)}B` },
                { label: 'Avg Oversubscription', value: `${data.summary?.avgOversubscription}x` },
                { label: 'Pipeline', value: `${data.summary?.pipelineCount} deals` },
                { label: 'Pricing Today', value: data.summary?.todayPricing },
              ].map((m, i) => (
                <div key={i} className="border border-border/10 p-3">
                  <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{m.label}</div>
                  <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
