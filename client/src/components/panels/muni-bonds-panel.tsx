import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMuniBonds } from '../../api/hooks/use-muni-bonds';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'STATES' | 'BONDS' | 'CURVE';

interface StateAgg {
  state: string; name: string; rating: string; stateTaxRate: number;
  outstanding: number; bondCount: number; avgYield: number; avgTEY: number;
  avgDuration: number; spreadVsAAA: number;
}

interface Bond {
  state: string; stateName: string; stateRating: string; sector: string;
  coupon: number; maturityDate: string; maturityYears: number;
  yield: number; taxEquivYield: number; muniTreasuryRatio: number;
  price: number; duration: number; spread: number;
  callable: boolean; callDate: string | null;
}

export function MuniBondsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMuniBonds();
  const [view, setView] = useState<View>('STATES');
  const [stateFilter, setStateFilter] = useState('ALL');

  const states = useMemo(() => (data?.stateAggregates ?? []) as StateAgg[], [data]);
  const bonds = useMemo(() => {
    const all = (data?.bonds ?? []) as Bond[];
    if (stateFilter === 'ALL') return all;
    return all.filter(b => b.state === stateFilter);
  }, [data, stateFilter]);

  const VIEWS: View[] = ['STATES', 'BONDS', 'CURVE'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'panelMuniBonds', 'Municipal Bonds')}
          </span>
          <span className="text-[7px] font-mono text-neutral-500">{bonds.length} bonds</span>
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-emerald-400 bg-emerald-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view === 'BONDS' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          <button onClick={() => setStateFilter('ALL')}
            className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${stateFilter === 'ALL' ? 'text-emerald-400 bg-emerald-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
          >ALL</button>
          {states.map(s => (
            <button key={s.state} onClick={() => setStateFilter(s.state)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${stateFilter === s.state ? 'text-emerald-400 bg-emerald-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{s.state}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}
        {view === 'STATES' && data && <StatesView states={states} />}
        {view === 'BONDS' && data && <BondsView bonds={bonds} />}
        {view === 'CURVE' && data && <CurveView curvePoints={data.curvePoints} sectorBreakdown={data.sectorBreakdown} />}
      </div>
    </div>
  );
}

function StatesView({ states }: { states: StateAgg[] }) {
  const maxTEY = Math.max(...states.map(s => s.avgTEY), 1);
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase">ST</span>
        <span className="w-[64px] text-[7px] font-mono text-neutral-600 uppercase">NAME</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right">RTG</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">TAX</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">YLD</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">TEY</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">DUR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">SPR</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">TEY BAR</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">#</span>
      </div>
      {states.map(s => (
        <div key={s.state} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors">
          <span className="w-[32px] text-[8px] font-mono font-bold text-emerald-400">{s.state}</span>
          <span className="w-[64px] text-[7px] font-mono text-neutral-400 truncate">{s.name}</span>
          <span className="w-[28px] text-[7px] font-mono text-right text-neutral-500">{s.rating}</span>
          <span className="w-[32px] text-[7px] font-mono text-right text-neutral-500">{s.stateTaxRate > 0 ? s.stateTaxRate.toFixed(1) : '-'}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{s.avgYield.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right font-bold text-white">{s.avgTEY.toFixed(2)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{s.avgDuration.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{s.spreadVsAAA}</span>
          <div className="flex-1 px-1">
            <div className="h-1.5 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-emerald-400/40" style={{ width: `${(s.avgTEY / maxTEY) * 100}%` }} />
            </div>
          </div>
          <span className="w-[28px] text-[7px] font-mono text-right text-neutral-500 pr-1">{s.bondCount}</span>
        </div>
      ))}
    </div>
  );
}

function BondsView({ bonds }: { bonds: Bond[] }) {
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase">ST</span>
        <span className="w-[60px] text-[7px] font-mono text-neutral-600 uppercase">SECTOR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">CPN</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">MAT</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">YLD</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">TEY</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">DUR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">M/T%</span>
        <span className="w-[28px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">CLL</span>
      </div>
      {bonds.map((b, i) => (
        <div key={i} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors">
          <span className="w-[28px] text-[8px] font-mono font-bold text-emerald-400">{b.state}</span>
          <span className="w-[60px] text-[7px] font-mono text-neutral-400 truncate">{b.sector}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{b.coupon.toFixed(1)}</span>
          <span className="w-[32px] text-[7px] font-mono text-right text-neutral-500">{b.maturityYears}Y</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{b.yield.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right font-bold text-white">{b.taxEquivYield.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{b.price.toFixed(2)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{b.duration.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-500">{b.muniTreasuryRatio}</span>
          <span className="w-[28px] text-[7px] font-mono text-right text-neutral-600 pr-1">{b.callable ? 'Y' : '-'}</span>
        </div>
      ))}
    </div>
  );
}

function CurveView({ curvePoints, sectorBreakdown }: {
  curvePoints: { maturity: number; muniYield: number; treasuryYield: number; ratio: number }[];
  sectorBreakdown: { sector: string; count: number; avgYield: number; avgDuration: number }[];
}) {
  const maxYield = Math.max(...curvePoints.map(p => Math.max(p.muniYield, p.treasuryYield)), 1);

  return (
    <div className="p-2 space-y-3">
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">AAA Muni vs Treasury Curve</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase">MAT</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">MUNI</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">TSY</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">RATIO</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">COMPARISON</span>
      </div>
      {curvePoints.map(p => (
        <div key={p.maturity} className="flex items-center px-2 py-1 border-b border-border/5">
          <span className="w-[32px] text-[8px] font-mono font-bold text-white">{p.maturity}Y</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-emerald-400">{p.muniYield.toFixed(2)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-blue-400">{p.treasuryYield.toFixed(2)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.ratio}%</span>
          <div className="flex-1 px-2 flex items-center gap-0.5">
            <div className="flex-1 h-2 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-1 bg-emerald-400/50" style={{ width: `${(p.muniYield / maxYield) * 100}%` }} />
              <div className="absolute left-0 bottom-0 h-1 bg-blue-400/50" style={{ width: `${(p.treasuryYield / maxYield) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 px-2">
        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-emerald-400/50" /><span className="text-[6px] font-mono text-neutral-500">AAA Muni</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-blue-400/50" /><span className="text-[6px] font-mono text-neutral-500">Treasury</span></div>
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider mt-3">Sector Breakdown</div>
      {sectorBreakdown.map((s: { sector: string; count: number; avgYield: number; avgDuration: number }) => (
        <div key={s.sector} className="flex items-center gap-2 px-2 py-1 border-b border-border/5">
          <span className="w-[80px] text-[7px] font-mono text-neutral-400 truncate">{s.sector}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-emerald-400">{s.avgYield.toFixed(2)}</span>
          <span className="w-[32px] text-[7px] font-mono text-right text-neutral-500">D:{s.avgDuration.toFixed(1)}</span>
          <span className="w-[24px] text-[7px] font-mono text-right text-neutral-600">{s.count}</span>
        </div>
      ))}
    </div>
  );
}
