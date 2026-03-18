import { useState, useMemo } from 'react';
import { useTreasuryAuctions } from '../../api/hooks/use-treasury-auctions';

const ACCENT = '#facc15'; // yellow-400
const ACCENT_DIM = 'rgba(250,204,21,0.08)';

type Tab = 'recent' | 'upcoming' | 'stats';

export function TreasuryAuctionsPanel() {
  const { data, isLoading, error } = useTreasuryAuctions();
  const [tab, setTab] = useState<Tab>('recent');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const countries = useMemo((): string[] => {
    if (!data?.recentAuctions) return ['all'];
    return ['all', ...Array.from(new Set<string>(data.recentAuctions.map((a: any) => a.country)))];
  }, [data]);

  const filteredRecent = useMemo(() => {
    if (!data?.recentAuctions) return [];
    if (countryFilter === 'all') return data.recentAuctions;
    return data.recentAuctions.filter((a: any) => a.country === countryFilter);
  }, [data, countryFilter]);

  const filteredUpcoming = useMemo(() => {
    if (!data?.upcomingAuctions) return [];
    if (countryFilter === 'all') return data.upcomingAuctions;
    return data.upcomingAuctions.filter((a: any) => a.country === countryFilter);
  }, [data, countryFilter]);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading auction data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'recent', label: 'RECENT' },
    { key: 'upcoming', label: 'UPCOMING' },
    { key: 'stats', label: 'STATISTICS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="bg-black border border-border/20 text-[8px] font-mono text-white/60 px-1.5 py-0.5 mr-2">
          {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'ALL' : c}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'recent' && (
          <div>
            {filteredRecent.map((a: any, idx: number) => (
              <div key={idx} className="border-b border-border/10 p-3 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{a.country}</span>
                  <span className="text-[9px] font-mono text-white/70 font-bold">{a.tenor}</span>
                  <span className="text-[7px] font-mono text-neutral/30">{a.countryName}</span>
                  <span className="text-[7px] font-mono text-neutral/25 ml-auto">{a.date}</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-[8px] font-mono">
                  <div><div className="text-neutral/40">High Yield</div><div className="text-white/80 font-bold">{a.highYield}%</div></div>
                  <div><div className="text-neutral/40">WI Yield</div><div className="text-white/60">{a.whenIssuedYield}%</div></div>
                  <div><div className="text-neutral/40">Bid/Cover</div><div className={a.bidTocover >= 2.5 ? 'text-bullish font-bold' : a.bidTocover < 2.0 ? 'text-bearish' : 'text-white/60'}>{a.bidTocover}x</div></div>
                  <div><div className="text-neutral/40">Tail</div><div className={a.tailBps > 1 ? 'text-bearish' : a.tailBps < 0 ? 'text-bullish' : 'text-white/60'}>{a.tailBps > 0 ? '+' : ''}{a.tailBps}bp</div></div>
                  <div><div className="text-neutral/40">Size</div><div className="text-white/60">{a.currency === 'JPY' ? `¥${(a.size / 100).toFixed(0)}B` : `$${a.size}M`}</div></div>
                  <div><div className="text-neutral/40">Indirect</div><div className="text-white/50">{a.breakdown.indirect}%</div></div>
                </div>
                <div className="mt-1 flex gap-3 text-[7px] font-mono text-neutral/25">
                  <span>Direct: {a.breakdown.direct}%</span>
                  <span>Dealers: {a.breakdown.primaryDealer}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'upcoming' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <th className="px-2 py-1.5 text-left">Country</th>
                <th className="px-2 py-1.5 text-left">Tenor</th>
                <th className="px-2 py-1.5 text-left">Date</th>
                <th className="px-2 py-1.5 text-right">Exp. Size</th>
                <th className="px-2 py-1.5 text-right">WI Yield</th>
              </tr>
            </thead>
            <tbody>
              {filteredUpcoming.map((a: any, idx: number) => (
                <tr key={idx} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{a.country} <span className="text-neutral/30 font-normal">{a.countryName}</span></td>
                  <td className="px-2 py-1.5 text-white/70 font-bold">{a.tenor}</td>
                  <td className="px-2 py-1.5 text-white/50">{a.date}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{a.currency === 'JPY' ? `¥${(a.expectedSize / 100).toFixed(0)}B` : `$${a.expectedSize}M`}</td>
                  <td className="px-2 py-1.5 text-right" style={{ color: ACCENT }}>{a.whenIssuedYield}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'stats' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Country</th>
                  <th className="px-2 py-1.5 text-right">Recent</th>
                  <th className="px-2 py-1.5 text-right">Upcoming</th>
                  <th className="px-2 py-1.5 text-right">Avg B/C</th>
                  <th className="px-2 py-1.5 text-right">Avg Tail</th>
                  <th className="px-2 py-1.5 text-right">Total Issuance</th>
                </tr>
              </thead>
              <tbody>
                {data.countryStats?.map((s: any) => (
                  <tr key={s.country} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.country} <span className="text-neutral/30 font-normal">{s.name}</span></td>
                    <td className="px-2 py-1.5 text-right text-white/60">{s.recentCount}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{s.upcomingCount}</td>
                    <td className={`px-2 py-1.5 text-right ${s.avgBidToCover >= 2.5 ? 'text-bullish' : s.avgBidToCover < 2.0 ? 'text-bearish' : 'text-white/60'}`}>{s.avgBidToCover}x</td>
                    <td className={`px-2 py-1.5 text-right ${s.avgTail > 1 ? 'text-bearish' : 'text-white/50'}`}>{s.avgTail > 0 ? '+' : ''}{s.avgTail}bp</td>
                    <td className="px-2 py-1.5 text-right text-white/50">${(s.totalIssuance / 1000).toFixed(1)}B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
