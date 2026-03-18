import { useState, useMemo } from 'react';
import { useEsgRatings } from '../../api/hooks/use-esg-ratings';

type TFn = (key: string) => string;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.08)';

const RATING_COLORS: Record<string, string> = {
  'AAA': '#22c55e', 'AA': '#4ade80', 'A': '#86efac',
  'BBB': '#fbbf24', 'BB': '#fb923c', 'B': '#f87171', 'CCC': '#ef4444',
};

type Tab = 'ratings' | 'sectors' | 'controversies' | 'distribution';

export function EsgRatingsPanel() {
  const { data, isLoading, error } = useEsgRatings();
  const [tab, setTab] = useState<Tab>('ratings');
  const [sortCol, setSortCol] = useState<string>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const sectors = useMemo((): string[] => {
    if (!data?.companies) return [];
    return ['all', ...Array.from(new Set<string>(data.companies.map((c: any) => c.sector)))];
  }, [data]);

  const companiesSorted = useMemo(() => {
    if (!data?.companies) return [];
    let arr = [...data.companies];
    if (sectorFilter !== 'all') arr = arr.filter((c: any) => c.sector === sectorFilter);
    arr.sort((a: any, b: any) => {
      const va = a.scores?.[sortCol] ?? a[sortCol] ?? 0;
      const vb = b.scores?.[sortCol] ?? b[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc, sectorFilter]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading ESG ratings...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ratings', label: 'RATINGS' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'controversies', label: 'CONTROVERSIES' },
    { key: 'distribution', label: 'DISTRIBUTION' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const ScoreBar = ({ score, max = 100 }: { score: number; max?: number }) => (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-white/5 overflow-hidden">
        <div
          style={{
            width: `${(score / max) * 100}%`,
            height: '100%',
            background: score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171',
          }}
        />
      </div>
      <span className="text-white/60 w-5 text-right">{score}</span>
    </div>
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
        {tab === 'ratings' && (
          <select
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="bg-black border border-border/20 text-[8px] font-mono text-white/60 px-1.5 py-0.5 mr-2"
          >
            {sectors.map((s: string) => (
              <option key={s} value={s}>{s === 'all' ? 'ALL SECTORS' : s.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'ratings' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="name" label="Company" />
                <SortHeader col="sector" label="Sector" />
                <SortHeader col="rating" label="Rating" />
                <SortHeader col="total" label="Total" right />
                <SortHeader col="environmental" label="E" right />
                <SortHeader col="social" label="S" right />
                <SortHeader col="governance" label="G" right />
                <SortHeader col="carbonIntensity" label="Carbon" right />
                <SortHeader col="controversyLevel" label="Controv." right />
                <SortHeader col="peerRank" label="Rank" right />
              </tr>
            </thead>
            <tbody>
              {companiesSorted.map((c: any) => (
                <tr key={c.ticker} className="border-b border-border/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.ticker}</td>
                  <td className="px-2 py-1.5 text-white/70">{c.name}</td>
                  <td className="px-2 py-1.5 text-white/40">{c.sector}</td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 text-[8px] font-black" style={{
                      background: `${RATING_COLORS[c.rating] || '#888'}20`,
                      color: RATING_COLORS[c.rating] || '#888',
                    }}>
                      {c.rating}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right"><ScoreBar score={c.scores.total} /></td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.scores.environmental}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.scores.social}</td>
                  <td className="px-2 py-1.5 text-right text-white/60">{c.scores.governance}</td>
                  <td className={`px-2 py-1.5 text-right ${c.carbonIntensity > 200 ? 'text-bearish' : 'text-white/50'}`}>
                    {c.carbonIntensity.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={c.controversyLevel >= 3 ? 'text-bearish font-bold' : 'text-white/40'}>
                      {c.controversyLevel}/4
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/40">#{c.peerRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'sectors' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Sector</th>
                  <th className="px-2 py-1.5 text-right">Companies</th>
                  <th className="px-2 py-1.5 text-right">Avg Total</th>
                  <th className="px-2 py-1.5 text-right">Avg E</th>
                  <th className="px-2 py-1.5 text-right">Avg S</th>
                  <th className="px-2 py-1.5 text-right">Avg G</th>
                  <th className="px-2 py-1.5 text-right">Avg Carbon</th>
                </tr>
              </thead>
              <tbody>
                {data.sectorAverages?.map((s: any) => (
                  <tr key={s.sector} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.sector}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{s.count}</td>
                    <td className="px-2 py-1.5 text-right"><ScoreBar score={s.avgTotal} /></td>
                    <td className="px-2 py-1.5 text-right text-white/60">{s.avgE}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{s.avgS}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{s.avgG}</td>
                    <td className={`px-2 py-1.5 text-right ${s.avgCarbon > 200 ? 'text-bearish' : 'text-white/50'}`}>
                      {s.avgCarbon.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'controversies' && (
          <div className="p-3 space-y-3">
            {data.companies?.filter((c: any) => c.controversies.length > 0).map((c: any) => (
              <div key={c.ticker} className="border border-border/10 p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{c.ticker}</span>
                  <span className="text-[8px] font-mono text-white/40">{c.name}</span>
                  <span className={`ml-auto text-[8px] font-mono font-bold ${c.controversyLevel >= 3 ? 'text-bearish' : 'text-warning'}`}>
                    Level {c.controversyLevel}/4
                  </span>
                </div>
                {c.controversies.map((cv: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[8px] font-mono py-0.5">
                    <span className={`px-1 py-0 ${
                      cv.severity === 'Critical' ? 'bg-bearish/20 text-bearish' :
                      cv.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                      cv.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {cv.severity}
                    </span>
                    <span className="text-white/60">{cv.type}</span>
                    <span className="text-white/25 ml-auto">{cv.date}</span>
                  </div>
                ))}
              </div>
            ))}
            {data.companies?.filter((c: any) => c.controversies.length > 0).length === 0 && (
              <div className="text-[9px] font-mono text-neutral/30 text-center py-8">No controversies reported</div>
            )}
          </div>
        )}

        {tab === 'distribution' && (
          <div className="p-4">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-4">Rating Distribution</div>
            <div className="space-y-2">
              {data.ratingDist?.map((r: any) => {
                const maxCount = Math.max(...data.ratingDist.map((x: any) => x.count));
                return (
                  <div key={r.rating} className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-mono font-black w-8"
                      style={{ color: RATING_COLORS[r.rating] || '#888' }}
                    >
                      {r.rating}
                    </span>
                    <div className="flex-1 h-4 bg-white/5 overflow-hidden">
                      <div
                        style={{
                          width: maxCount > 0 ? `${(r.count / maxCount) * 100}%` : '0%',
                          height: '100%',
                          background: RATING_COLORS[r.rating] || '#888',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-white/50 w-4 text-right">{r.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Trend for top companies */}
            <div className="mt-6">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">Quarterly Trend (Top 5)</div>
              {data.companies?.slice(0, 5).map((c: any) => (
                <div key={c.ticker} className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{c.ticker}</span>
                    <span className="text-[7px] font-mono text-neutral/30">{c.rating}</span>
                  </div>
                  <div className="flex gap-2">
                    {c.trend?.map((t: any, i: number) => (
                      <div key={i} className="flex-1 text-center">
                        <div className="text-[7px] font-mono text-neutral/30 mb-0.5">{t.quarter}</div>
                        <div className="text-[9px] font-mono font-bold text-white/70">{t.total}</div>
                        <div className="flex gap-0.5 mt-0.5">
                          <div className="flex-1 h-1" style={{ background: '#4ade80', opacity: t.e / 100 }} title={`E: ${t.e}`} />
                          <div className="flex-1 h-1" style={{ background: '#60a5fa', opacity: t.s / 100 }} title={`S: ${t.s}`} />
                          <div className="flex-1 h-1" style={{ background: '#c084fc', opacity: t.g / 100 }} title={`G: ${t.g}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-4 mt-2 text-[7px] font-mono text-neutral/40">
                <span style={{ color: '#4ade80' }}>■ Environmental</span>
                <span style={{ color: '#60a5fa' }}>■ Social</span>
                <span style={{ color: '#c084fc' }}>■ Governance</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
