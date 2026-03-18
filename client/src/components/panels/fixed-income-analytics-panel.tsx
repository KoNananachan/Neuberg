import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useFixedIncomeAnalytics } from '../../api/hooks/use-fixed-income-analytics';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'BONDS' | 'RISK' | 'KRD';
type SortKey = 'ticker' | 'yield' | 'duration' | 'oas' | 'convexity' | 'dv01' | 'price';

interface Bond {
  name: string; ticker: string; coupon: number; maturityDate: string; rating: string; sector: string;
  analytics: { yield: number; price: number; duration: number; modifiedDuration: number; convexity: number; oas: number; zSpread: number; iSpread: number };
  keyRateDurations: Record<string, number>;
  riskMetrics: { dv01: number; pvbp: number; yieldChange1d: number; yieldChange1w: number; priceChange1d: number; totalReturn1m: number; totalReturn3m: number; totalReturnYtd: number };
  spread: { govtSpread: number; swapSpread: number; industrySpread: number };
}

export function FixedIncomeAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFixedIncomeAnalytics();
  const [view, setView] = useState<View>('BONDS');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortAsc, setSortAsc] = useState(true);

  const sectors = useMemo(() => {
    if (!data?.bonds) return ['ALL'];
    return ['ALL', ...new Set(data.bonds.map((b: Bond) => b.sector))];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.bonds) return [] as Bond[];
    let items = data.bonds as Bond[];
    if (sectorFilter !== 'ALL') items = items.filter(b => b.sector === sectorFilter);
    return [...items].sort((a, b) => {
      if (sortKey === 'ticker') return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      const va = sortKey === 'dv01' ? a.riskMetrics.dv01 : sortKey === 'price' ? a.analytics.price : a.analytics[sortKey as keyof Bond['analytics']] as number;
      const vb = sortKey === 'dv01' ? b.riskMetrics.dv01 : sortKey === 'price' ? b.analytics.price : b.analytics[sortKey as keyof Bond['analytics']] as number;
      return sortAsc ? va - vb : vb - va;
    });
  }, [data, sectorFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const VIEWS: View[] = ['BONDS', 'RISK', 'KRD'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'panelFixedIncomeAnalytics', 'Fixed Income Analytics')}
          </span>
          {data?.bonds && (
            <span className="text-[7px] font-mono text-neutral-500">{filtered.length} bonds</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-blue-400 bg-blue-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-blue-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view !== 'KRD' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {sectors.map(s => (
            <button key={s as string} onClick={() => setSectorFilter(s as string)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${sectorFilter === s ? 'text-blue-400 bg-blue-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{s as string}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'BONDS' && data && <BondsView bonds={filtered} onSort={handleSort} sortKey={sortKey} sortAsc={sortAsc} />}
        {view === 'RISK' && data && <RiskView bonds={filtered} />}
        {view === 'KRD' && data && <KRDView bonds={data.bonds as Bond[]} summary={data.summary} />}
      </div>
    </div>
  );
}

// ── Bonds View ──
function BondsView({ bonds, onSort, sortKey, sortAsc }: {
  bonds: Bond[];
  onSort: (k: SortKey) => void;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  const cols: { key: SortKey; label: string; w: string }[] = [
    { key: 'ticker', label: 'TICKER', w: 'w-[56px]' },
    { key: 'yield', label: 'YLD%', w: 'w-[40px]' },
    { key: 'price', label: 'PRICE', w: 'w-[48px]' },
    { key: 'duration', label: 'DUR', w: 'w-[36px]' },
    { key: 'oas', label: 'OAS', w: 'w-[36px]' },
    { key: 'convexity', label: 'CNVX', w: 'w-[40px]' },
    { key: 'dv01', label: 'DV01', w: 'w-[40px]' },
  ];

  const yieldColor = (v: number) => v > 6 ? 'text-red-400' : v < 3 ? 'text-green-400' : 'text-neutral-300';

  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        {cols.map(c => (
          <button key={c.key} onClick={() => onSort(c.key)}
            className={`${c.w} text-[7px] font-mono uppercase text-right pr-1.5 ${sortKey === c.key ? 'text-blue-400' : 'text-neutral-600'} hover:text-blue-300`}
          >{c.label}{sortKey === c.key ? (sortAsc ? ' ↑' : ' ↓') : ''}</button>
        ))}
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">RTG</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">SECT</span>
      </div>
      {bonds.map(b => (
        <div key={b.ticker} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
          <span className="w-[56px] text-[8px] font-mono font-bold text-white pr-1.5 truncate">{b.ticker}</span>
          <span className={`w-[40px] text-[8px] font-mono text-right pr-1.5 font-bold ${yieldColor(b.analytics.yield)}`}>{b.analytics.yield.toFixed(2)}</span>
          <span className="w-[48px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.analytics.price.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.analytics.duration.toFixed(1)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.analytics.oas}</span>
          <span className="w-[40px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.analytics.convexity.toFixed(1)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.riskMetrics.dv01.toFixed(3)}</span>
          <span className="w-[44px] text-[7px] font-mono text-right pr-1.5 text-neutral-500">{b.rating}</span>
          <span className="w-[44px] text-[7px] font-mono text-right pr-1.5 text-neutral-600 truncate">{b.sector.slice(0, 6)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Risk View ──
function RiskView({ bonds }: { bonds: Bond[] }) {
  const chgColor = (v: number) => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-neutral-400';
  return (
    <div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase pr-1.5">TICKER</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">Δ1D BP</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">Δ1W BP</span>
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">Δ PX 1D</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">TR 1M</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">TR 3M</span>
        <span className="w-[44px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">TR YTD</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">GOVT</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1.5">Z-SPR</span>
      </div>
      {bonds.map(b => (
        <div key={b.ticker} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
          <span className="w-[56px] text-[8px] font-mono font-bold text-white pr-1.5 truncate">{b.ticker}</span>
          <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 ${chgColor(-b.riskMetrics.yieldChange1d)}`}>{b.riskMetrics.yieldChange1d > 0 ? '+' : ''}{b.riskMetrics.yieldChange1d.toFixed(1)}</span>
          <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 ${chgColor(-b.riskMetrics.yieldChange1w)}`}>{b.riskMetrics.yieldChange1w > 0 ? '+' : ''}{b.riskMetrics.yieldChange1w.toFixed(1)}</span>
          <span className={`w-[48px] text-[8px] font-mono text-right pr-1.5 ${chgColor(b.riskMetrics.priceChange1d)}`}>{b.riskMetrics.priceChange1d > 0 ? '+' : ''}{b.riskMetrics.priceChange1d.toFixed(3)}</span>
          <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 ${chgColor(b.riskMetrics.totalReturn1m)}`}>{b.riskMetrics.totalReturn1m > 0 ? '+' : ''}{b.riskMetrics.totalReturn1m.toFixed(1)}%</span>
          <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 ${chgColor(b.riskMetrics.totalReturn3m)}`}>{b.riskMetrics.totalReturn3m > 0 ? '+' : ''}{b.riskMetrics.totalReturn3m.toFixed(1)}%</span>
          <span className={`w-[44px] text-[8px] font-mono text-right pr-1.5 ${chgColor(b.riskMetrics.totalReturnYtd)}`}>{b.riskMetrics.totalReturnYtd > 0 ? '+' : ''}{b.riskMetrics.totalReturnYtd.toFixed(1)}%</span>
          <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.spread.govtSpread}</span>
          <span className="w-[36px] text-[8px] font-mono text-right pr-1.5 text-neutral-300">{b.spread.industrySpread}</span>
        </div>
      ))}
    </div>
  );
}

// ── KRD View ──
function KRDView({ bonds, summary }: { bonds: Bond[]; summary: { avgDuration: number; avgYield: number; avgOAS: number; totalDV01: number; avgConvexity: number } }) {
  const tenors = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
  const krdKeys = ['kr1y', 'kr2y', 'kr3y', 'kr5y', 'kr7y', 'kr10y', 'kr20y', 'kr30y'];
  const maxKRD = Math.max(...bonds.flatMap(b => krdKeys.map(k => b.keyRateDurations[k])), 0.01);

  return (
    <div className="p-2">
      <div className="grid grid-cols-5 gap-2 mb-3">
        {[
          { label: 'AVG DURATION', value: summary.avgDuration.toFixed(2) },
          { label: 'AVG YIELD', value: summary.avgYield.toFixed(3) + '%' },
          { label: 'AVG OAS', value: summary.avgOAS + ' bp' },
          { label: 'TOTAL DV01', value: summary.totalDV01.toFixed(4) },
          { label: 'AVG CONVEXITY', value: summary.avgConvexity.toFixed(2) },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className="text-[10px] font-mono font-bold text-blue-400">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">Key Rate Duration Profile</div>
      <div className="flex items-center px-1 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[56px] text-[7px] font-mono text-neutral-600 uppercase">TICKER</span>
        {tenors.map(t => (
          <span key={t} className="flex-1 text-[6px] font-mono text-neutral-600 text-center">{t}</span>
        ))}
      </div>
      {bonds.map(b => (
        <div key={b.ticker} className="flex items-center px-1 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors">
          <span className="w-[56px] text-[7px] font-mono font-bold text-white truncate">{b.ticker}</span>
          {krdKeys.map(k => {
            const v = b.keyRateDurations[k];
            const pct = (v / maxKRD) * 100;
            return (
              <div key={k} className="flex-1 px-0.5">
                <div className="h-2 bg-neutral-900 relative">
                  <div className="absolute left-0 top-0 h-full bg-blue-400/40" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[6px] font-mono text-neutral-500 text-center">{v.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
