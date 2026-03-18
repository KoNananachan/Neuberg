import { useState, useMemo } from 'react';
import { useDistressedDebt } from '../../api/hooks/use-distressed-debt';

const ACCENT = '#f87171'; // red-400
const ACCENT_DIM = 'rgba(248,113,113,0.08)';

type Tab = 'issuers' | 'recovery' | 'sectors' | 'ratings';

export function DistressedDebtPanel() {
  const { data, isLoading, error } = useDistressedDebt();
  const [tab, setTab] = useState<Tab>('issuers');
  const [sortCol, setSortCol] = useState<string>('price');
  const [sortAsc, setSortAsc] = useState(true);

  const issuersSorted = useMemo(() => {
    if (!data?.issuers) return [];
    const arr = [...data.issuers];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0; const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading distressed debt data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'issuers', label: 'ISSUERS' },
    { key: 'recovery', label: 'RECOVERY' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'ratings', label: 'RATINGS' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const StatusTag = ({ status }: { status: string }) => (
    <span className={`text-[7px] font-bold px-1 py-0 ${status === 'Chapter 11' ? 'bg-bearish/20 text-bearish' : status === 'Defaulted' ? 'bg-bearish/15 text-red-300' : status === 'Deeply Distressed' ? 'bg-orange-500/15 text-orange-400' : status === 'Distressed' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-white/50'}`}>
      {status}
    </span>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/10 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Issuers</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.totalIssuers}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Face Value</div>
          <div className="text-[11px] font-mono font-black text-white/80">${data.summary?.totalFaceValue}B</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Price</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>{data.summary?.avgPrice}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Defaulted</div>
          <div className="text-[11px] font-mono font-black text-bearish">{data.summary?.defaultedCount}</div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Recovery</div>
          <div className="text-[11px] font-mono font-black text-white/60">{data.summary?.avgRecovery}%</div>
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
        {tab === 'issuers' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="name" label="Issuer" />
                <SortHeader col="rating" label="Rating" />
                <SortHeader col="price" label="Price" right />
                <SortHeader col="change1d" label="1D" right />
                <SortHeader col="ytw" label="YTW" right />
                <SortHeader col="spread" label="Spread" right />
                <SortHeader col="recoveryEst" label="Recovery" right />
                <th className="px-2 py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {issuersSorted.map((iss: any) => (
                <tr key={iss.name} className={`border-b border-border/5 hover:bg-white/[0.02] ${iss.chapter11 ? 'bg-bearish/5' : ''}`}>
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: iss.price < 20 ? '#f87171' : ACCENT }}>{iss.name}</span>
                    <span className="text-neutral/30 ml-1.5 text-[8px]">{iss.sector}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[7px] font-bold px-1 py-0 ${iss.rating === 'D' ? 'bg-bearish/20 text-bearish' : iss.rating.startsWith('CC') && !iss.rating.startsWith('CCC') ? 'bg-red-400/15 text-red-300' : 'bg-orange-500/15 text-orange-400'}`}>
                      {iss.rating}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold" style={{ color: iss.price < 20 ? '#f87171' : iss.price < 50 ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}>{iss.price}</td>
                  <td className={`px-2 py-1.5 text-right ${iss.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {iss.change1d >= 0 ? '+' : ''}{iss.change1d}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{iss.ytw}%</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{iss.spread}bp</td>
                  <td className="px-2 py-1.5 text-right text-white/50">{iss.recoveryEst}%</td>
                  <td className="px-2 py-1.5 text-right"><StatusTag status={iss.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'recovery' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Recovery Rate Distribution</div>
            {data.recoveryBands?.map((b: any) => (
              <div key={b.band} className="flex items-center gap-3">
                <span className="text-[9px] font-mono w-16 text-right" style={{ color: ACCENT }}>{b.band}</span>
                <div className="flex-1 h-4 bg-white/5 overflow-hidden relative">
                  <div style={{ width: `${(b.count / data.summary.totalIssuers) * 100}%`, height: '100%', background: ACCENT, opacity: 0.35 }} />
                  <span className="absolute right-1 top-0.5 text-[7px] text-white/50">{b.count} issuers</span>
                </div>
                <span className="text-[8px] font-mono text-white/40 w-16 text-right">${b.totalFace}M</span>
              </div>
            ))}

            <div className="mt-4 text-[8px] font-mono text-neutral/40 uppercase mb-2">Price vs Recovery Estimate</div>
            {data.issuers?.sort((a: any, b: any) => a.price - b.price).map((iss: any) => (
              <div key={iss.name} className="flex items-center gap-2 py-0.5">
                <span className="text-[7px] font-mono w-24 text-right truncate" style={{ color: iss.price < 20 ? '#f87171' : ACCENT }}>{iss.name}</span>
                <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                  <div style={{ width: `${iss.price}%`, height: '100%', background: '#fbbf24', opacity: 0.3 }} />
                  <div style={{ position: 'absolute', left: `${iss.recoveryEst}%`, top: 0, width: '2px', height: '100%', background: '#22c55e' }} />
                </div>
                <span className="text-[7px] font-mono text-white/50 w-6 text-right">{iss.price}</span>
              </div>
            ))}
            <div className="flex items-center gap-4 text-[7px] font-mono text-neutral/30 mt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-yellow-500/30" /> Price</span>
              <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-green-500" /> Recovery Est</span>
            </div>
          </div>
        )}

        {tab === 'sectors' && (
          <div className="p-3 space-y-3">
            {data.sectors?.map((s: any) => (
              <div key={s.sector} className="border border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{s.sector}</span>
                  <span className="text-[8px] font-mono text-neutral/40">{s.count} issuers</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Avg Price</div>
                    <div className="text-white/80 font-bold">{s.avgPrice}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Outstanding</div>
                    <div className="text-white/60">${s.totalOutstanding}M</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Defaulted</div>
                    <div className={s.defaulted > 0 ? 'text-bearish font-bold' : 'text-white/40'}>{s.defaulted}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'ratings' && (
          <div className="p-3 space-y-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Rating Distribution</div>
            {data.ratingDist?.map((r: any) => (
              <div key={r.rating} className="flex items-center gap-3">
                <span className={`text-[9px] font-mono w-10 text-right font-bold ${r.rating === 'D' ? 'text-bearish' : r.rating === 'CC' ? 'text-red-300' : 'text-orange-400'}`}>{r.rating}</span>
                <div className="flex-1 h-5 bg-white/5 overflow-hidden relative">
                  <div style={{ width: `${(r.count / data.summary.totalIssuers) * 100}%`, height: '100%', background: r.rating === 'D' ? '#f87171' : r.rating === 'CC' ? '#fca5a5' : '#fb923c', opacity: 0.35 }} />
                  <span className="absolute left-2 top-0.5 text-[8px] font-mono text-white/70">{r.count} issuers — avg price {r.avgPrice}</span>
                </div>
              </div>
            ))}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Total Face Value</div>
                <div className="text-[14px] font-mono font-black" style={{ color: ACCENT }}>${data.summary?.totalFaceValue}B</div>
              </div>
              <div className="border border-border/10 p-3 text-center">
                <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">Avg Recovery</div>
                <div className="text-[14px] font-mono font-black text-white/80">{data.summary?.avgRecovery}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
