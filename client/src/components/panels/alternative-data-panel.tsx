import { useState, useMemo } from 'react';
import { useAlternativeData } from '../../api/hooks/use-alternative-data';

const ACCENT = '#a78bfa'; // violet-400
const ACCENT_DIM = 'rgba(167,139,250,0.08)';

type Tab = 'overview' | 'web' | 'app' | 'satellite' | 'sentiment' | 'jobs';

export function AlternativeDataPanel() {
  const { data, isLoading, error } = useAlternativeData();
  const [tab, setTab] = useState<Tab>('overview');
  const [sortCol, setSortCol] = useState<string>('compositeScore');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!data?.companies) return [];
    const arr = [...data.companies];
    arr.sort((a: any, b: any) => {
      const resolve = (obj: any, col: string): any =>
        obj[col] ?? obj.webTraffic?.[col] ?? obj.appMetrics?.[col] ?? obj.satelliteProxy?.[col] ?? obj.socialSentiment?.[col] ?? obj.jobPostings?.[col] ?? 0;
      const va = resolve(a, sortCol);
      const vb = resolve(b, sortCol);
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading alternative data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'COMPOSITE' },
    { key: 'web', label: 'WEB TRAFFIC' },
    { key: 'app', label: 'APP DATA' },
    { key: 'satellite', label: 'SATELLITE' },
    { key: 'sentiment', label: 'SOCIAL' },
    { key: 'jobs', label: 'JOBS' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const ScoreCell = ({ val, max = 100 }: { val: number; max?: number }) => (
    <div className="flex items-center gap-1">
      <div className="w-10 h-1.5 bg-white/5 overflow-hidden">
        <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: val >= 70 ? '#4ade80' : val >= 40 ? '#fbbf24' : '#f87171' }} />
      </div>
      <span className="text-white/60">{val}</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="px-2.5 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap" style={{ color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.35)', borderBottom: tab === t.key ? `1px solid ${ACCENT}` : '1px solid transparent', background: tab === t.key ? ACCENT_DIM : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'overview' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="compositeScore" label="Composite" right />
                <SortHeader col="indexScore" label="Web" right />
                <SortHeader col="engagementIndex" label="App" right />
                <SortHeader col="activityIndex" label="Satellite" right />
                <SortHeader col="overallScore" label="Sentiment" right />
                <SortHeader col="totalActive" label="Jobs" right />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{c.ticker}</span>
                    <span className="text-neutral/30 ml-1.5">{c.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right"><ScoreCell val={c.compositeScore} /></td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.webTraffic.indexScore}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.appMetrics.engagementIndex}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.satelliteProxy.activityIndex}</td>
                  <td className={`px-2 py-1.5 text-right ${c.socialSentiment.overallScore >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.socialSentiment.overallScore >= 0 ? '+' : ''}{c.socialSentiment.overallScore.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.jobPostings.totalActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'web' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="indexScore" label="Traffic Idx" right />
                <SortHeader col="uniqueVisitors" label="Unique Visitors" right />
                <th className="px-2 py-1.5 text-right font-bold">7D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">30D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                  <td className="px-2 py-1.5 text-right"><ScoreCell val={c.webTraffic.indexScore} /></td>
                  <td className="px-2 py-1.5 text-right text-white/60">{(c.webTraffic.uniqueVisitors / 1000000).toFixed(2)}M</td>
                  <td className={`px-2 py-1.5 text-right ${c.webTraffic.change7d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.webTraffic.change7d >= 0 ? '+' : ''}{c.webTraffic.change7d}%
                  </td>
                  <td className={`px-2 py-1.5 text-right ${c.webTraffic.change30d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.webTraffic.change30d >= 0 ? '+' : ''}{c.webTraffic.change30d}%
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-end gap-[1px] h-4 justify-end">
                      {c.webTraffic.trend?.map((t: any, i: number) => {
                        const vals = c.webTraffic.trend.map((x: any) => x.score);
                        const min = Math.min(...vals); const max = Math.max(...vals);
                        const range = max - min || 1;
                        return <div key={i} className="w-1.5" style={{ height: `${Math.max(15, ((t.score - min) / range) * 100)}%`, background: ACCENT, opacity: 0.4 + (i / vals.length) * 0.6 }} />;
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'app' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="downloadRank" label="DL Rank" right />
                <SortHeader col="ratingScore" label="Rating" right />
                <SortHeader col="dailyActiveUsers" label="DAU" right />
                <SortHeader col="engagementIndex" label="Engagement" right />
                <th className="px-2 py-1.5 text-right font-bold">7D Chg</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">#{c.appMetrics.downloadRank}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={c.appMetrics.ratingScore >= 4.5 ? 'text-bullish' : c.appMetrics.ratingScore >= 3.5 ? 'text-white/60' : 'text-bearish'}>
                      {c.appMetrics.ratingScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/60">{(c.appMetrics.dailyActiveUsers / 1000).toFixed(0)}K</td>
                  <td className="px-2 py-1.5 text-right"><ScoreCell val={c.appMetrics.engagementIndex} /></td>
                  <td className={`px-2 py-1.5 text-right ${c.appMetrics.change7d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.appMetrics.change7d >= 0 ? '+' : ''}{c.appMetrics.change7d}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'satellite' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="activityIndex" label="Activity Idx" right />
                <th className="px-2 py-1.5 text-right font-bold">Parking Fill</th>
                <th className="px-2 py-1.5 text-right font-bold">Ship Vol</th>
                <th className="px-2 py-1.5 text-right font-bold">Construction</th>
                <th className="px-2 py-1.5 text-right font-bold">30D Chg</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                  <td className="px-2 py-1.5 text-right"><ScoreCell val={c.satelliteProxy.activityIndex} /></td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.satelliteProxy.parkingLotFill}%</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.satelliteProxy.shippingVolume}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.satelliteProxy.constructionActivity}</td>
                  <td className={`px-2 py-1.5 text-right ${c.satelliteProxy.change30d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.satelliteProxy.change30d >= 0 ? '+' : ''}{c.satelliteProxy.change30d}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'sentiment' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="overallScore" label="Score" right />
                <th className="px-2 py-1.5 text-right font-bold">24H Vol</th>
                <th className="px-2 py-1.5 text-right font-bold">Vol Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Twitter</th>
                <th className="px-2 py-1.5 text-right font-bold">Reddit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => {
                const twitter = c.socialSentiment.sources?.find((s: any) => s.source === 'Twitter/X');
                const reddit = c.socialSentiment.sources?.find((s: any) => s.source === 'Reddit');
                return (
                  <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${c.socialSentiment.overallScore >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {c.socialSentiment.overallScore >= 0 ? '+' : ''}{c.socialSentiment.overallScore.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60">{c.socialSentiment.volume24h.toLocaleString()}</td>
                    <td className={`px-2 py-1.5 text-right ${c.socialSentiment.volumeChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {c.socialSentiment.volumeChange >= 0 ? '+' : ''}{c.socialSentiment.volumeChange}%
                    </td>
                    <td className={`px-2 py-1.5 text-right ${(twitter?.sentiment ?? 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {twitter ? twitter.sentiment.toFixed(2) : '-'}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${(reddit?.sentiment ?? 0) >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {reddit ? reddit.sentiment.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === 'jobs' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="totalActive" label="Active Jobs" right />
                <th className="px-2 py-1.5 text-right font-bold">30D Chg</th>
                <th className="px-2 py-1.5 text-right font-bold">Eng %</th>
                <th className="px-2 py-1.5 text-left font-bold">Top Category</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02]">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                  <td className="px-2 py-1.5 text-right text-white/70 font-bold">{c.jobPostings.totalActive}</td>
                  <td className={`px-2 py-1.5 text-right ${c.jobPostings.change30d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {c.jobPostings.change30d >= 0 ? '+' : ''}{c.jobPostings.change30d}%
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/50">{c.jobPostings.engineeringPct}%</td>
                  <td className="px-2 py-1.5 text-white/40">{c.jobPostings.topCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
