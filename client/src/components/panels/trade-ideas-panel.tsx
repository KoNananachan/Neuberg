import { useState, useMemo } from 'react';
import { useTradeIdeas } from '../../api/hooks/use-trade-ideas';

const ACCENT = '#f472b6'; // pink-400
const ACCENT_DIM = 'rgba(244,114,182,0.08)';

type Tab = 'ideas' | 'signals' | 'assets' | 'summary';

export function TradeIdeasPanel() {
  const { data, isLoading, error } = useTradeIdeas();
  const [tab, setTab] = useState<Tab>('ideas');
  const [filterDir, setFilterDir] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredIdeas = useMemo(() => {
    if (!data?.ideas) return [];
    return data.ideas.filter((i: any) =>
      (filterDir === 'all' || i.direction === filterDir) &&
      (filterStatus === 'all' || i.status === filterStatus)
    );
  }, [data, filterDir, filterStatus]);

  if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading trade ideas...</div></div>;
  if (error || !data) return <div className="h-full flex items-center justify-center bg-black"><div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load data</div></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ideas', label: 'IDEAS' },
    { key: 'signals', label: 'SIGNAL MAP' },
    { key: 'assets', label: 'BY ASSET' },
    { key: 'summary', label: 'SUMMARY' },
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
        <div className="px-3 text-[8px] font-mono text-neutral/25">
          {data.summary?.totalIdeas} ideas | {data.summary?.newCount} new
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'ideas' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10">
              <select value={filterDir} onChange={e => setFilterDir(e.target.value)} className="bg-black border border-border/20 text-[8px] font-mono text-white px-1.5 py-0.5">
                <option value="all">ALL</option>
                <option value="Bullish">BULLISH</option>
                <option value="Bearish">BEARISH</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-black border border-border/20 text-[8px] font-mono text-white px-1.5 py-0.5">
                <option value="all">ALL STATUS</option>
                <option value="New">NEW</option>
                <option value="Active">ACTIVE</option>
                <option value="Expired">EXPIRED</option>
              </select>
              <span className="text-[8px] font-mono text-neutral/30 ml-auto">{filteredIdeas.length} results</span>
            </div>

            {filteredIdeas.map((idea: any) => (
              <div key={idea.id} className="border-b border-border/10 p-3 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>{idea.asset}</span>
                  <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 ${idea.direction === 'Bullish' ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish'}`}>
                    {idea.direction.toUpperCase()}
                  </span>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 ${idea.status === 'New' ? 'bg-blue-500/15 text-blue-400' : idea.status === 'Active' ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'}`}>
                    {idea.status}
                  </span>
                  <span className="text-[7px] font-mono text-neutral/30 ml-auto">{idea.timeframe}</span>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[8px] font-mono text-white/50">{idea.signalType}</span>
                  <span className="text-[8px] font-mono text-neutral/30">→</span>
                  <span className="text-[8px] font-mono text-white/60">{idea.strategy}</span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Confidence</div>
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-1.5 bg-white/5 overflow-hidden">
                        <div style={{ width: `${idea.confidence}%`, height: '100%', background: idea.confidence >= 80 ? '#4ade80' : idea.confidence >= 60 ? '#fbbf24' : '#f87171' }} />
                      </div>
                      <span className="font-bold text-white/70">{idea.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Exp. Return</div>
                    <div className={idea.expectedReturn >= 0 ? 'text-bullish font-bold' : 'text-bearish font-bold'}>
                      {idea.expectedReturn >= 0 ? '+' : ''}{idea.expectedReturn}%
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Risk/Reward</div>
                    <div className="text-white/60">{idea.riskReward}:1</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Win Rate</div>
                    <div className="text-white/60">{idea.historicalWinRate}%</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Stop Loss</div>
                    <div className="text-bearish/70">{idea.stopLoss}%</div>
                  </div>
                </div>

                {/* Signal pills */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {idea.signals.map((s: any, i: number) => (
                    <span key={i} className={`text-[7px] font-mono px-1 py-0 ${s.triggered ? 'bg-bullish/10 text-bullish/70' : 'bg-white/5 text-white/25'}`}>
                      {s.name}: {s.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'signals' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-widest mb-3">Signal Heatmap</div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Signal</th>
                  <th className="px-2 py-1.5 text-right">Bullish</th>
                  <th className="px-2 py-1.5 text-right">Bearish</th>
                  <th className="px-2 py-1.5 text-right">Net</th>
                  <th className="px-2 py-1.5 text-right">Strength</th>
                </tr>
              </thead>
              <tbody>
                {data.signalHeatmap?.map((s: any) => (
                  <tr key={s.signal} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 text-white/70">{s.signal}</td>
                    <td className="px-2 py-1.5 text-right text-bullish">{s.bullish}</td>
                    <td className="px-2 py-1.5 text-right text-bearish">{s.bearish}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${s.bullish - s.bearish >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {s.bullish - s.bearish >= 0 ? '+' : ''}{s.bullish - s.bearish}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-12 h-1.5 bg-white/5 overflow-hidden">
                          <div style={{ width: `${s.strength}%`, height: '100%', background: ACCENT, opacity: 0.6 }} />
                        </div>
                        <span className="text-white/50">{s.strength}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'assets' && (
          <div className="p-3">
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1.5 text-left">Asset</th>
                  <th className="px-2 py-1.5 text-right">Ideas</th>
                  <th className="px-2 py-1.5 text-right">Avg Confidence</th>
                  <th className="px-2 py-1.5 text-right">Net Direction</th>
                  <th className="px-2 py-1.5 text-right">Bias</th>
                </tr>
              </thead>
              <tbody>
                {data.assetBreakdown?.map((a: any) => (
                  <tr key={a.asset} className="border-b border-border/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{a.asset}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{a.count}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{a.avgConfidence}%</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${a.netDirection >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {a.netDirection >= 0 ? '+' : ''}{a.netDirection}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 ${a.netDirection > 0 ? 'bg-bullish/15 text-bullish' : a.netDirection < 0 ? 'bg-bearish/15 text-bearish' : 'bg-white/5 text-white/30'}`}>
                        {a.netDirection > 0 ? 'BULLISH' : a.netDirection < 0 ? 'BEARISH' : 'NEUTRAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'summary' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Ideas', value: data.summary?.totalIdeas, accent: true },
                { label: 'Avg Confidence', value: `${data.summary?.avgConfidence}%`, accent: true },
                { label: 'Bullish', value: data.summary?.bullish, color: '#4ade80' },
                { label: 'Bearish', value: data.summary?.bearish, color: '#f87171' },
                { label: 'New Ideas', value: data.summary?.newCount },
                { label: 'Active Ideas', value: data.summary?.activeCount },
              ].map((m, i) => (
                <div key={i} className="border border-border/10 p-3">
                  <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{m.label}</div>
                  <div className="text-[14px] font-mono font-black" style={{ color: m.accent ? ACCENT : m.color || 'white' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="border border-border/10 p-3">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Top Signal Type</div>
              <div className="text-[11px] font-mono font-bold" style={{ color: ACCENT }}>{data.summary?.topSignalType}</div>
            </div>

            {/* Bull/Bear gauge */}
            <div className="border border-border/10 p-3">
              <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Market Bias</div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-bearish">BEARISH</span>
                <div className="flex-1 h-3 bg-white/5 overflow-hidden relative">
                  <div className="absolute inset-0 flex">
                    <div style={{ width: `${(data.summary.bullish / data.summary.totalIdeas) * 100}%` }} className="bg-bullish/40 h-full" />
                    <div style={{ width: `${(data.summary.bearish / data.summary.totalIdeas) * 100}%` }} className="bg-bearish/40 h-full" />
                  </div>
                </div>
                <span className="text-[8px] font-mono text-bullish">BULLISH</span>
              </div>
              <div className="text-center text-[8px] font-mono text-neutral/30 mt-1">
                {Math.round((data.summary.bullish / data.summary.totalIdeas) * 100)}% Bullish
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
