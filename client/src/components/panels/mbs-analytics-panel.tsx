import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useMbsAnalytics } from '../../api/hooks/use-mbs-analytics';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => { try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; } };

type View = 'POOLS' | 'PREPAY' | 'COUPON';

interface Pool {
  id: string; issuer: string; type: string; coupon: number;
  wac: number; wam: number; wala: number;
  prepayment: { cpr1m: number; cpr3m: number; cpr6m: number; cprLife: number; psa: number };
  pricing: { price: number; yield: number; oas: number; zSpread: number };
  risk: { duration: number; modifiedDuration: number; convexity: number };
  pool: { factor: number; originalBalance: number; currentBalance: number };
  prepayHistory: { date: string; cpr: number; smm: number }[];
}

export function MbsAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMbsAnalytics();
  const [view, setView] = useState<View>('POOLS');
  const [issuerFilter, setIssuerFilter] = useState('ALL');
  const [selectedPool, setSelectedPool] = useState('FNMA30-6.0');

  const pools = useMemo(() => (data?.pools ?? []) as Pool[], [data]);
  const issuers = useMemo(() => ['ALL', ...new Set(pools.map(p => p.issuer))], [pools]);
  const filtered = useMemo(() => {
    if (issuerFilter === 'ALL') return pools;
    return pools.filter(p => p.issuer === issuerFilter);
  }, [pools, issuerFilter]);

  const fmtBal = (v: number) => {
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(0) + 'M';
    return '$' + (v / 1e3).toFixed(0) + 'K';
  };

  const VIEWS: View[] = ['POOLS', 'PREPAY', 'COUPON'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'panelMbsAnalytics', 'MBS Analytics')}
          </span>
          {data?.summary && (
            <span className="text-[7px] font-mono text-neutral-500">{filtered.length} pools</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${view === v ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{v}</button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view === 'POOLS' && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          {issuers.map(s => (
            <button key={s} onClick={() => setIssuerFilter(s)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase whitespace-nowrap transition-colors ${issuerFilter === s ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-600 hover:text-neutral-400'}`}
            >{s}</button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {view === 'POOLS' && data && <PoolsView pools={filtered} summary={data.summary} fmtBal={fmtBal} />}
        {view === 'PREPAY' && data && <PrepayView pools={pools} selected={selectedPool} onSelect={setSelectedPool} />}
        {view === 'COUPON' && data && <CouponView couponStacks={data.couponStacks} />}
      </div>
    </div>
  );
}

function PoolsView({ pools, summary, fmtBal }: { pools: Pool[]; summary: { totalPools: number; totalBalance: number; avgCPR: number; avgOAS: number; avgDuration: number; avgConvexity: number }; fmtBal: (v: number) => string }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-2 p-2">
        {[
          { label: 'TOTAL BALANCE', value: fmtBal(summary.totalBalance) },
          { label: 'AVG CPR', value: summary.avgCPR.toFixed(1) + '%' },
          { label: 'AVG OAS', value: summary.avgOAS + ' bp' },
          { label: 'AVG DURATION', value: summary.avgDuration.toFixed(2) },
          { label: 'AVG CONVEXITY', value: summary.avgConvexity.toFixed(2) },
          { label: 'POOLS', value: summary.totalPools.toString() },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className="text-[10px] font-mono font-bold text-amber-400">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-[72px] text-[7px] font-mono text-neutral-600 uppercase">POOL</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">CPN</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">PRICE</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">YLD</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">OAS</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">DUR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">CVX</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right">CPR</span>
        <span className="w-[32px] text-[7px] font-mono text-neutral-600 uppercase text-right">PSA</span>
        <span className="w-[36px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">FCT</span>
      </div>
      {pools.map(p => (
        <div key={p.id} className="flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors">
          <span className="w-[72px] text-[7px] font-mono font-bold text-white truncate">{p.id}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-amber-400">{p.coupon.toFixed(1)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{p.pricing.price.toFixed(2)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{p.pricing.yield.toFixed(2)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.pricing.oas}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{p.risk.duration.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-red-400">{p.risk.convexity.toFixed(1)}</span>
          <span className="w-[36px] text-[8px] font-mono text-right text-neutral-300">{p.prepayment.cpr1m.toFixed(1)}</span>
          <span className="w-[32px] text-[8px] font-mono text-right text-neutral-300">{p.prepayment.psa}</span>
          <span className="w-[36px] text-[7px] font-mono text-right text-neutral-500 pr-1">{p.pool.factor.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

function PrepayView({ pools, selected, onSelect }: { pools: Pool[]; selected: string; onSelect: (id: string) => void }) {
  const pool = pools.find(p => p.id === selected) ?? pools[0];
  if (!pool) return null;
  const maxCPR = Math.max(...pool.prepayHistory.map(h => h.cpr), 1);

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-2">
        <select value={selected} onChange={e => onSelect(e.target.value)}
          className="bg-black border border-border/30 text-[8px] font-mono text-white px-1.5 py-0.5 outline-none">
          {pools.map(p => <option key={p.id} value={p.id}>{p.id} ({p.issuer})</option>)}
        </select>
        <span className="text-[7px] font-mono text-neutral-500">{pool.type} | WAC: {pool.wac}% | WAM: {pool.wam}mo</span>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-3">
        {[
          { label: 'CPR 1M', value: pool.prepayment.cpr1m.toFixed(1) + '%' },
          { label: 'CPR 3M', value: pool.prepayment.cpr3m.toFixed(1) + '%' },
          { label: 'CPR 6M', value: pool.prepayment.cpr6m.toFixed(1) + '%' },
          { label: 'CPR LIFE', value: pool.prepayment.cprLife.toFixed(1) + '%' },
          { label: 'PSA SPEED', value: pool.prepayment.psa.toString() + '%' },
        ].map(s => (
          <div key={s.label} className="bg-[#050505] border border-border/10 px-2 py-1.5">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{s.label}</div>
            <div className="text-[10px] font-mono font-bold text-amber-400">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1 tracking-wider">12-Month Prepayment History (CPR)</div>
      {pool.prepayHistory.map((h, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-[48px] text-[7px] font-mono text-neutral-500">{h.date}</span>
          <div className="flex-1 h-2 bg-neutral-900 relative">
            <div className="absolute left-0 top-0 h-full bg-amber-400/40" style={{ width: `${(h.cpr / maxCPR) * 100}%` }} />
          </div>
          <span className="w-[36px] text-[8px] font-mono text-right text-white font-bold">{h.cpr.toFixed(1)}</span>
          <span className="w-[40px] text-[7px] font-mono text-right text-neutral-500">SMM {h.smm.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

function CouponView({ couponStacks }: { couponStacks: { coupon: number; avgPrice: number; avgOAS: number; avgCPR: number; count: number }[] }) {
  const maxPrice = Math.max(...couponStacks.map(s => s.avgPrice), 1);

  return (
    <div className="p-2">
      <div className="text-[7px] font-mono text-neutral-600 uppercase mb-2 tracking-wider">30Y Fixed Coupon Stack Analysis</div>
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 bg-[#030303] mb-1">
        <span className="w-[48px] text-[7px] font-mono text-neutral-600 uppercase">COUPON</span>
        <span className="w-[52px] text-[7px] font-mono text-neutral-600 uppercase text-right">AVG PRICE</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">OAS</span>
        <span className="w-[40px] text-[7px] font-mono text-neutral-600 uppercase text-right">CPR</span>
        <span className="flex-1 text-[7px] font-mono text-neutral-600 uppercase text-center">PRICE BAR</span>
        <span className="w-[24px] text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">#</span>
      </div>
      {couponStacks.map(s => (
        <div key={s.coupon} className="flex items-center px-2 py-2 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors">
          <span className="w-[48px] text-[10px] font-mono font-bold text-amber-400">{s.coupon.toFixed(1)}%</span>
          <span className="w-[52px] text-[8px] font-mono text-right text-white font-bold">{s.avgPrice.toFixed(3)}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{s.avgOAS}</span>
          <span className="w-[40px] text-[8px] font-mono text-right text-neutral-300">{s.avgCPR.toFixed(1)}</span>
          <div className="flex-1 px-3">
            <div className="h-3 bg-neutral-900 relative">
              <div className="absolute left-0 top-0 h-full bg-amber-400/30" style={{ width: `${(s.avgPrice / maxPrice) * 100}%` }} />
              {s.avgPrice >= 100 && <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${(100 / maxPrice) * 100}%` }} />}
            </div>
          </div>
          <span className="w-[24px] text-[7px] font-mono text-right text-neutral-500 pr-1">{s.count}</span>
        </div>
      ))}
    </div>
  );
}
