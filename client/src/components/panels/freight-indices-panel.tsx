import { useState } from 'react';
import { useFreightIndices } from '../../api/hooks/use-freight-indices';

const ACCENT = '#38bdf8'; // sky-400
const ACCENT_DIM = 'rgba(56,189,248,0.08)';

type Tab = 'dry' | 'container' | 'tanker' | 'routes' | 'seasonal';

export function FreightIndicesPanel() {
  const { data, isLoading, error } = useFreightIndices();
  const [tab, setTab] = useState<Tab>('dry');

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading freight data...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dry', label: 'DRY BULK' },
    { key: 'container', label: 'CONTAINER' },
    { key: 'tanker', label: 'TANKER' },
    { key: 'routes', label: 'TRADE ROUTES' },
    { key: 'seasonal', label: 'SEASONALITY' },
  ];

  const ChgCell = ({ val, suffix }: { val: number; suffix?: string }) => (
    <span className={`font-bold ${val >= 0 ? 'text-bullish' : 'text-bearish'}`}>
      {val >= 0 ? '+' : ''}{val.toLocaleString()}{suffix || ''}
    </span>
  );

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
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
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'dry' && (
          <div>
            {data.dryBulk?.map((idx: any) => (
              <div key={idx.id} className="border-b border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idx.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{idx.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-mono font-black text-white">{idx.current.toLocaleString()}</span>
                    <span className={`text-[9px] font-mono ml-2 ${idx.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {idx.change1d >= 0 ? '+' : ''}{idx.change1d}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-[8px] font-mono">
                  <div><div className="text-neutral/40">1W</div><ChgCell val={idx.change1w} /></div>
                  <div><div className="text-neutral/40">1M</div><ChgCell val={idx.change1m} /></div>
                  <div><div className="text-neutral/40">YTD</div><ChgCell val={idx.ytdChange} /></div>
                  <div><div className="text-neutral/40">52W H</div><div className="text-white/50">{idx.high52w.toLocaleString()}</div></div>
                  <div><div className="text-neutral/40">52W L</div><div className="text-white/50">{idx.low52w.toLocaleString()}</div></div>
                </div>
                {/* Mini chart */}
                <div className="mt-2 flex items-end gap-[1px] h-8">
                  {idx.history?.slice(-30).map((h: any, i: number) => {
                    const vals = idx.history.slice(-30).map((x: any) => x.value);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const range = max - min || 1;
                    const pct = ((h.value - min) / range) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-0"
                        style={{ height: `${Math.max(5, pct)}%`, background: ACCENT, opacity: 0.3 + (i / 30) * 0.7 }}
                        title={`${h.date}: ${h.value}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'container' && (
          <div>
            {data.container?.map((idx: any) => (
              <div key={idx.id} className="border-b border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idx.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{idx.name}</span>
                  </div>
                  <span className="text-[12px] font-mono font-black text-white">{idx.current.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[8px] font-mono">
                  <div><div className="text-neutral/40">1D</div><ChgCell val={idx.change1d} /></div>
                  <div><div className="text-neutral/40">1W</div><ChgCell val={idx.change1w} /></div>
                  <div><div className="text-neutral/40">1M</div><ChgCell val={idx.change1m} /></div>
                </div>
                <div className="mt-2 flex items-end gap-[2px] h-8">
                  {idx.history?.map((h: any, i: number) => {
                    const vals = idx.history.map((x: any) => x.value);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const range = max - min || 1;
                    const pct = ((h.value - min) / range) * 100;
                    return (
                      <div key={i} className="flex-1 min-w-0" style={{ height: `${Math.max(5, pct)}%`, background: ACCENT, opacity: 0.4 + (i / idx.history.length) * 0.6 }} title={`${h.date}: ${h.value}`} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tanker' && (
          <div>
            {data.tanker?.map((idx: any) => (
              <div key={idx.id} className="border-b border-border/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idx.id}</span>
                    <span className="text-[8px] font-mono text-neutral/40 ml-2">{idx.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-mono font-black text-white">{idx.current.toLocaleString()}</span>
                    <span className={`text-[9px] font-mono ml-2 ${idx.change1d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {idx.change1d >= 0 ? '+' : ''}{idx.change1d}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[8px] font-mono">
                  <div><div className="text-neutral/40">1D Change</div><ChgCell val={idx.change1d} /></div>
                  <div><div className="text-neutral/40">1W Change</div><ChgCell val={idx.change1w} /></div>
                </div>
                <div className="mt-2 flex items-end gap-[2px] h-8">
                  {idx.history?.slice(-30).map((h: any, i: number) => {
                    const vals = idx.history.slice(-30).map((x: any) => x.value);
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const range = max - min || 1;
                    const pct = ((h.value - min) / range) * 100;
                    return (
                      <div key={i} className="flex-1 min-w-0" style={{ height: `${Math.max(5, pct)}%`, background: ACCENT, opacity: 0.3 + (i / 30) * 0.7 }} title={`${h.date}: ${h.value}`} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'routes' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Route</th>
                  <th className="px-2 py-1.5 text-left">Name</th>
                  <th className="px-2 py-1.5 text-right">Current</th>
                  <th className="px-2 py-1.5 text-right">Unit</th>
                  <th className="px-2 py-1.5 text-right">1D Chg</th>
                  <th className="px-2 py-1.5 text-right">1W Chg</th>
                </tr>
              </thead>
              <tbody>
                {data.tradeRoutes?.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.id}</td>
                    <td className="px-2 py-1.5 text-white/60">{r.name}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-white">{r.current.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right text-neutral/40">{r.unit}</td>
                    <td className="px-2 py-1.5 text-right"><ChgCell val={r.change1d} /></td>
                    <td className="px-2 py-1.5 text-right"><ChgCell val={r.change1w} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Commodity Correlations */}
            <div className="mt-4 border-t border-border/10 pt-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-2">BDI Commodity Correlations</div>
              {data.commodityCorrelation?.map((c: any) => (
                <div key={c.commodity} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] font-mono text-white/50 w-16">{c.commodity}</span>
                  <div className="flex-1 h-2 bg-white/5 overflow-hidden">
                    <div style={{ width: `${c.correlation * 100}%`, height: '100%', background: ACCENT, opacity: 0.6 }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/60 w-8 text-right">{c.correlation.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'seasonal' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">Baltic Dry Index Seasonality</div>
            <div className="flex items-end gap-[3px] h-32">
              {data.seasonality?.map((s: any, i: number) => {
                const maxVal = Math.max(...data.seasonality.map((x: any) => Math.max(x.avgBDI5y, x.currentYear)));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-[1px] h-full justify-end">
                    <div className="w-full flex gap-[1px] items-end flex-1">
                      <div className="flex-1" style={{ height: `${(s.avgBDI5y / maxVal) * 100}%`, background: 'rgba(255,255,255,0.15)' }} title={`5Y Avg: ${s.avgBDI5y}`} />
                      <div className="flex-1" style={{ height: `${(s.currentYear / maxVal) * 100}%`, background: ACCENT, opacity: 0.7 }} title={`Current: ${s.currentYear}`} />
                    </div>
                    <span className="text-[7px] font-mono text-neutral/30">{s.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[7px] font-mono text-neutral/40">
              <span className="text-white/30">■ 5Y Average</span>
              <span style={{ color: ACCENT }}>■ Current Year</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
