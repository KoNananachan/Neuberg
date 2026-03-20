import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCustomIndex } from '../../api/hooks/use-custom-index';
import { useT, tr, TFn } from '../../i18n';

type View = 'INDICES' | 'COMPONENTS' | 'ANALYTICS';

interface Component {
  ticker: string; name: string; weight: number; sector: string;
  price: number; change1d: number; change1w: number; change1m: number; changeYtd: number;
  volume: number; contribution1d: number; beta: number; correlation: number;
}

interface Index {
  id: string; name: string; description: string;
  level: number; change1d: number; change1dPct: number; changeYtd: number;
  components: Component[];
  history: { date: string; level: number }[];
  sectorBreakdown: { sector: string; weight: number }[];
  stats: { sharpeRatio: number; volatility: number; maxDrawdown: number; beta: number; trackingError: number; infoRatio: number };
}

export function CustomIndexPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCustomIndex();
  const [view, setView] = useState<View>('INDICES');
  const [selectedIdx, setSelectedIdx] = useState('mega-cap-tech');

  const indices = useMemo(() => (data?.indices ?? []) as Index[], [data]);
  const selected = useMemo(() => indices.find(i => i.id === selectedIdx) ?? indices[0], [indices, selectedIdx]);

  const fmtVal = (v: number) => {
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return v.toFixed(0);
  };

  const chgColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400';
  const VIEWS: View[] = ['INDICES', 'COMPONENTS', 'ANALYTICS'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'panelCustomIndex', 'Custom Index Builder')}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">{indices.length} indices</span>
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-violet-400 bg-violet-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-violet-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {(view === 'COMPONENTS' || view === 'ANALYTICS') && indices.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {indices.map(idx => (
            <button key={idx.id} onClick={() => setSelectedIdx(idx.id)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${selectedIdx === idx.id ? 'text-violet-400 bg-violet-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{idx.name}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'INDICES' && data && <IndicesView indices={indices} onSelect={setSelectedIdx} setView={setView} chgColor={chgColor} />}
        {view === 'COMPONENTS' && selected && <ComponentsView index={selected} chgColor={chgColor} fmtVal={fmtVal} />}
        {view === 'ANALYTICS' && selected && <AnalyticsView index={selected} chgColor={chgColor} />}
      </div>
    </div>
  );
}

function IndicesView({ indices, onSelect, setView, chgColor }: {
  indices: Index[];
  onSelect: (id: string) => void;
  setView: (v: 'COMPONENTS') => void;
  chgColor: (v: number) => string;
}) {
  return (
    <div className="p-2 space-y-2">
      {indices.map(idx => (
        <div key={idx.id} onClick={() => { onSelect(idx.id); setView('COMPONENTS'); }}
          className="bg-[#050505] border border-border/10 px-3 py-2 hover:bg-violet-400/[0.02] transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-[9px] font-mono font-bold text-white">{idx.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 ml-2">{idx.description}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-violet-400">{idx.level.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-neutral-600">1D:</span>
              <span className={`text-[8px] font-mono font-bold ${chgColor(idx.change1dPct)}`}>{idx.change1dPct > 0 ? '+' : ''}{idx.change1dPct.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-neutral-600">YTD:</span>
              <span className={`text-[8px] font-mono font-bold ${chgColor(idx.changeYtd)}`}>{idx.changeYtd > 0 ? '+' : ''}{idx.changeYtd.toFixed(1)}%</span>
            </div>
            <div className="flex-1 h-1.5 bg-neutral-900 relative">
              {idx.history.slice(-20).map((h, i, arr) => {
                const min = Math.min(...arr.map(a => a.level));
                const max = Math.max(...arr.map(a => a.level));
                const range = max - min || 1;
                return (
                  <div key={i} className="absolute bottom-0 bg-violet-400/40"
                    style={{ left: `${(i / (arr.length - 1)) * 100}%`, width: '3%', height: `${((h.level - min) / range) * 100}%` }} />
                );
              })}
            </div>
            <span className="text-[7px] font-mono text-neutral-500">{idx.components.length} stocks</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComponentsView({ index, chgColor, fmtVal }: { index: Index; chgColor: (v: number) => string; fmtVal: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase">TICKER</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">WT%</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1D%</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1W%</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">YTD%</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">CONTR</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">BETA</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">VOL</span>
      </div>
      {index.components.map(c => (
        <div key={c.ticker} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-violet-400/[0.02] transition-colors">
          <span className="w-[48px] text-[8px] font-mono font-bold text-white">{c.ticker}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-violet-400 font-bold">{c.weight}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{c.price.toFixed(0)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right font-bold ${chgColor(c.change1d)}`}>{c.change1d > 0 ? '+' : ''}{c.change1d.toFixed(1)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(c.change1w)}`}>{c.change1w > 0 ? '+' : ''}{c.change1w.toFixed(1)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(c.changeYtd)}`}>{c.changeYtd > 0 ? '+' : ''}{c.changeYtd.toFixed(0)}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(c.contribution1d)}`}>{c.contribution1d > 0 ? '+' : ''}{c.contribution1d.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{c.beta.toFixed(2)}</span>
          <span className="w-[40px] text-[7px] font-mono text-right text-neutral-500 pr-1">{fmtVal(c.volume)}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsView({ index, chgColor }: { index: Index; chgColor: (v: number) => string }) {
  const maxLevel = Math.max(...index.history.map(h => h.level));
  const minLevel = Math.min(...index.history.map(h => h.level));
  const range = maxLevel - minLevel || 1;

  return (
    <div className="p-2 space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: 'SHARPE', value: index.stats.sharpeRatio.toFixed(2), color: index.stats.sharpeRatio > 1 ? 'text-green-400' : 'text-neutral-300' },
          { label: 'VOLATILITY', value: index.stats.volatility.toFixed(1) + '%', color: 'text-neutral-300' },
          { label: 'MAX DD', value: index.stats.maxDrawdown.toFixed(1) + '%', color: 'text-red-400' },
          { label: 'BETA', value: index.stats.beta.toFixed(2), color: 'text-neutral-300' },
          { label: 'TRACK ERR', value: index.stats.trackingError.toFixed(1) + '%', color: 'text-neutral-300' },
          { label: 'INFO RATIO', value: index.stats.infoRatio.toFixed(2), color: chgColor(index.stats.infoRatio) },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className={`text-[10px] font-mono font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">30-Day Performance</div>
        {index.history.map((h, i) => (
          <div key={i} className="flex items-center gap-1 py-0.5">
            <span className="w-[50px] text-[6px] font-mono text-neutral-600">{h.date.slice(5)}</span>
            <div className="flex-1 h-1.5 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-violet-400/40" style={{ width: `${((h.level - minLevel) / range) * 100}%` }} />
            </div>
            <span className="w-[48px] text-[7px] font-mono text-right text-neutral-400">{h.level.toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">Sector Breakdown</div>
        {index.sectorBreakdown.map(s => (
          <div key={s.sector} className="flex items-center gap-2 py-0.5">
            <span className="w-[80px] text-[7px] font-mono text-neutral-400">{s.sector}</span>
            <div className="flex-1 h-2 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-violet-400/30" style={{ width: `${s.weight}%` }} />
            </div>
            <span className="w-[28px] text-[8px] font-mono text-right text-violet-400 font-bold">{s.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
