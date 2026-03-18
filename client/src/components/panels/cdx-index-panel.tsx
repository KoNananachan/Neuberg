import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCdxIndex } from '../../api/hooks/use-cdx-index';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'INDICES' | 'TRANCHES' | 'MOVERS';

interface CdxIdx {
  id: string; name: string; series: number; tenor: string;
  region: string; members: number;
  spread: number; price: number; change1d: number; change1w: number; change1m: number;
  impliedProb: number;
  history: { date: string; spread: number }[];
  tranches?: { name: string; attachment: number; detachment: number; spread: number; upfrontPct: number; change1d: number }[];
}

interface Mover {
  ticker: string; name: string; sector: string;
  cdsSpread: number; change1d: number; changePct: number;
  rating: string; impliedRating: string;
}

export function CdxIndexPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCdxIndex();
  const [view, setView] = useState<View>('INDICES');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [selectedIdx, setSelectedIdx] = useState('CDX.NA.IG');

  const indices = useMemo(() => (data?.indices ?? []) as CdxIdx[], [data]);
  const regions = useMemo(() => ['ALL', ...new Set(indices.map(i => i.region))], [indices]);
  const filtered = useMemo(() => {
    if (regionFilter === 'ALL') return indices;
    return indices.filter(i => i.region === regionFilter);
  }, [indices, regionFilter]);

  const selected = useMemo(() => indices.find(i => i.id === selectedIdx) ?? indices[0], [indices, selectedIdx]);

  const chgColor = (v: number) => v > 0 ? 'text-red-400' : v < 0 ? 'text-green-400' : 'text-neutral-400';
  const VIEWS: View[] = ['INDICES', 'TRANCHES', 'MOVERS'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'panelCdxIndex', 'CDX / iTraxx Index')}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">{indices.length} indices</span>
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-rose-400 bg-rose-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-rose-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view === 'INDICES' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${regionFilter === r ? 'text-rose-400 bg-rose-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{r}</button>
          ))}
        </div>
      )}

      {view === 'TRANCHES' && indices.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {indices.filter(i => i.tranches).map(i => (
            <button key={i.id} onClick={() => setSelectedIdx(i.id)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${selectedIdx === i.id ? 'text-rose-400 bg-rose-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{i.id}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'INDICES' && data && <IndicesView indices={filtered} chgColor={chgColor} />}
        {view === 'TRANCHES' && selected && <TranchesView index={selected} chgColor={chgColor} basisTrades={data?.basisTrades} />}
        {view === 'MOVERS' && data && <MoversView movers={(data.topMovers ?? []) as Mover[]} chgColor={chgColor} />}
      </div>
    </div>
  );
}

function IndicesView({ indices, chgColor }: { indices: CdxIdx[]; chgColor: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[100px] text-[7px] font-mono text-neutral-600 uppercase">INDEX</span>
        <span className="w-[24px] text-[7px] font-mono text-neutral-600 uppercase text-right">SER</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">TNR</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">SPREAD</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1D</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1W</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1M</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">PROB</span>
      </div>
      {indices.map(idx => (
        <div key={idx.id} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors">
          <span className="w-[100px] text-[7px] font-mono font-bold text-white truncate">{idx.id}</span>
          <span className="w-[24px] text-[7px] font-mono text-right text-neutral-500">{idx.series}</span>
          <span className="w-[28px] text-[7px] font-mono text-right text-neutral-500">{idx.tenor}</span>
          <span className="w-[44px] text-[9px] font-mono text-right font-bold text-rose-400">{idx.spread}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right font-bold ${chgColor(idx.change1d)}`}>{idx.change1d > 0 ? '+' : ''}{idx.change1d}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(idx.change1w)}`}>{idx.change1w > 0 ? '+' : ''}{idx.change1w}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(idx.change1m)}`}>{idx.change1m > 0 ? '+' : ''}{idx.change1m}</span>
          <span className="w-[44px] text-[8px] font-mono text-right text-neutral-300">{idx.price.toFixed(2)}</span>
          <span className="w-[36px] text-[7px] font-mono text-right text-neutral-500 pr-1">{idx.impliedProb.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function TranchesView({ index, chgColor, basisTrades }: { index: CdxIdx; chgColor: (v: number) => string; basisTrades?: { index: string; indexSpread: number; intrinsicSpread: number; basis: number }[] }) {
  if (!index.tranches) return (
    <div className="text-center py-8 text-neutral-600 text-[9px] font-mono">Tranche data available for IG indices only</div>
  );

  const maxSpread = Math.max(...index.tranches.map(t => t.spread), 1);
  const basis = basisTrades?.find(b => b.index === index.id);

  return (
    <div className="p-2 space-y-3">
      <div className="bg-[#050505] border border-border/10 px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono font-bold text-white">{index.id} Series {index.series}</span>
          <span className="text-[10px] font-mono font-bold text-rose-400">{index.spread} bp</span>
        </div>
        {basis && (
          <div className="flex items-center gap-3 text-[7px] font-mono">
            <span className="text-neutral-600">Index: {basis.indexSpread} bp</span>
            <span className="text-neutral-600">Intrinsic: {basis.intrinsicSpread} bp</span>
            <span className={basis.basis > 0 ? 'text-red-400' : 'text-green-400'}>Basis: {basis.basis > 0 ? '+' : ''}{basis.basis} bp</span>
          </div>
        )}
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">Tranche Spreads</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase">TRANCHE</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">SPREAD</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1D</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right">UPFRONT</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">RISK</span>
      </div>
      {index.tranches.map(tr => (
        <div key={tr.name} className="flex items-center px-2 py-1.5 border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors">
          <span className="w-[56px] text-[8px] font-mono font-bold text-white">{tr.name}</span>
          <span className="w-[44px] text-[9px] font-mono text-right font-bold text-rose-400">{tr.spread}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(tr.change1d)}`}>{tr.change1d > 0 ? '+' : ''}{tr.change1d}</span>
          <span className="w-[48px] text-[8px] font-mono text-right text-neutral-300">{tr.upfrontPct > 0 ? tr.upfrontPct.toFixed(1) + '%' : '-'}</span>
          <div className="flex-1 px-2">
            <div className="h-2.5 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-rose-400/30" style={{ width: `${(tr.spread / maxSpread) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MoversView({ movers, chgColor }: { movers: Mover[]; chgColor: (v: number) => string }) {
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral-600 uppercase px-3 py-1 tracking-wider">Top CDS Single-Name Movers</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase">TICKER</span>
        <span className="w-[80px] text-[7px] font-mono text-neutral-600 uppercase">NAME</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase">SECTOR</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right">CDS</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1D BP</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">1D %</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">RTG</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">IMP</span>
      </div>
      {movers.map(m => (
        <div key={m.ticker} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors">
          <span className="w-[40px] text-[8px] font-mono font-bold text-white">{m.ticker}</span>
          <span className="w-[80px] text-[7px] font-mono text-neutral-400 truncate">{m.name}</span>
          <span className="w-[52px] text-[7px] font-mono text-neutral-500 truncate">{m.sector}</span>
          <span className="w-[44px] text-[9px] font-mono text-right font-bold text-rose-400">{m.cdsSpread}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right font-bold ${chgColor(m.change1d)}`}>{m.change1d > 0 ? '+' : ''}{m.change1d}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right ${chgColor(m.changePct)}`}>{m.changePct > 0 ? '+' : ''}{m.changePct.toFixed(1)}%</span>
          <span className="w-[32px] text-[7px] font-mono text-right text-neutral-500">{m.rating}</span>
          <span className="w-[36px] text-[7px] font-mono text-right text-neutral-500 pr-1">{m.impliedRating}</span>
        </div>
      ))}
    </div>
  );
}
