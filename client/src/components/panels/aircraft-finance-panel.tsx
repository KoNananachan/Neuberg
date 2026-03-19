import { useState } from 'react';
import { useAircraftFinance } from '../../api/hooks/use-aircraft-finance';
import { RefreshCw, Plane } from 'lucide-react';

type Tab = 'leaseRates' | 'eetcAbs' | 'airlines' | 'lessors';

const ACCENT = '#38bdf8'; // sky-400
const ACCENT_DIM = 'rgba(56,189,248,0.08)';

const TABS: Tab[] = ['leaseRates', 'eetcAbs', 'airlines', 'lessors'];

const TAB_LABELS: Record<Tab, string> = {
  leaseRates: 'LEASE RATES',
  eetcAbs: 'EETC/ABS',
  airlines: 'AIRLINES',
  lessors: 'LESSORS',
};

/* ---------- Formatters ---------- */

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(0);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(0);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0) + 'bp';
}

function fmtYears(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'y';
}

function fmtX(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'x';
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  return n >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'text-neutral-500';
  const r = rating.toUpperCase();
  if (r.startsWith('AA')) return 'text-emerald-400';
  if (r.startsWith('A')) return 'text-sky-400';
  if (r.startsWith('BBB')) return 'text-amber-400';
  if (r.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

/* ---------- Main Panel ---------- */

export function AircraftFinancePanel() {
  const [tab, setTab] = useState<Tab>('leaseRates');
  const { data, isLoading, refetch } = useAircraftFinance();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            AIRCRAFT FINANCE
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider border-b-2 transition-colors ${
              tab === t
                ? 'text-sky-400 border-sky-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[9px] font-mono text-sky-400 uppercase tracking-wider animate-pulse">
              LOADING AIRCRAFT FINANCE DATA...
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
            FAILED TO LOAD AIRCRAFT FINANCE DATA
          </div>
        )}

        {data && tab === 'leaseRates' && <LeaseRatesTab data={data.leaseRates} />}
        {data && tab === 'eetcAbs' && <EetcAbsTab data={data.eetcAbs} />}
        {data && tab === 'airlines' && <AirlinesTab data={data.airlines} />}
        {data && tab === 'lessors' && <LessorsTab data={data.lessors} />}
      </div>
    </div>
  );
}

/* ---------- Lease Rates Tab ---------- */

function LeaseRatesTab({ data }: { data: any }) {
  if (!data || !data.aircraft || data.aircraft.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Summary */}
      {data.summary && (
        <div
          className="grid grid-cols-3 gap-px shrink-0 border-b border-border/20"
          style={{ background: ACCENT_DIM }}
        >
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">AVG LRF</div>
            <div className="text-[11px] font-mono font-black text-sky-400">
              {fmtPct(data.summary.avgLrf)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">TOTAL BACKLOG</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtNum(data.summary.totalBacklog)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">IN SERVICE</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtNum(data.summary.totalInService)}
            </div>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.4fr_0.7fr_0.6fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr]">
        <span>AIRCRAFT</span>
        <span className="text-right">LEASE/MO</span>
        <span className="text-right">LRF%</span>
        <span className="text-right">MKT VALUE</span>
        <span className="text-right">HALF-LIFE</span>
        <span className="text-right">RESIDUAL</span>
        <span className="text-right">IN-SVC</span>
        <span className="text-right">BACKLOG</span>
      </div>
      {data.aircraft.map((a: any, i: number) => (
        <div
          key={a.type ?? a.id ?? i}
          className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[10px] font-mono font-bold text-sky-400">
              {a.type ?? a.name}
            </span>
            {a.manufacturer && (
              <span className="text-[7px] font-mono text-neutral-600 ml-1.5">{a.manufacturer}</span>
            )}
          </div>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtRate(a.monthlyLeaseRate)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(a.lrf)}`}>
            {a.lrf != null ? a.lrf.toFixed(2) + '%' : '--'}
          </span>
          <span className="text-[9px] font-mono text-white/80 text-right">
            {fmtMoney(a.marketValue)}
          </span>
          <span className="text-[9px] font-mono text-white/60 text-right">
            {fmtMoney(a.halfLifeValue)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(a.residual)}`}>
            {a.residual != null ? a.residual.toFixed(1) + '%' : '--'}
          </span>
          <span className="text-[9px] font-mono text-white/70 text-right">
            {fmtNum(a.inService)}
          </span>
          <span className="text-[9px] font-mono text-white/70 text-right">
            {fmtNum(a.backlog)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- EETC/ABS Tab ---------- */

function EetcAbsTab({ data }: { data: any }) {
  if (!data || !data.deals || data.deals.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Market Summary */}
      {data.summary && (
        <div
          className="grid grid-cols-3 gap-px shrink-0 border-b border-border/20"
          style={{ background: ACCENT_DIM }}
        >
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">YTD ISSUANCE</div>
            <div className="text-[11px] font-mono font-black text-sky-400">
              {fmtMoney(data.summary.ytdIssuance)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">AVG COUPON</div>
            <div className="text-[11px] font-mono font-black text-white">
              {data.summary.avgCoupon != null ? data.summary.avgCoupon.toFixed(2) + '%' : '--'}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">AVG LTV</div>
            <div className="text-[11px] font-mono font-black text-white">
              {data.summary.avgLtv != null ? data.summary.avgLtv.toFixed(1) + '%' : '--'}
            </div>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.2fr_0.6fr_0.6fr_0.5fr_0.5fr_0.5fr_1fr]">
        <span>AIRLINE</span>
        <span>TRANCHE</span>
        <span className="text-right">SIZE</span>
        <span className="text-right">COUPON</span>
        <span className="text-right">RATING</span>
        <span className="text-right">LTV</span>
        <span className="text-right">COLLATERAL</span>
      </div>
      {data.deals.map((d: any, i: number) => (
        <div
          key={d.id ?? `${d.airline}-${d.tranche}-${i}`}
          className="grid grid-cols-[1.2fr_0.6fr_0.6fr_0.5fr_0.5fr_0.5fr_1fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[10px] font-mono font-bold text-sky-400 truncate">
            {d.airline}
          </span>
          <span className="text-[9px] font-mono text-white/70">
            {d.tranche}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtMoney(d.size)}
          </span>
          <span className="text-[9px] font-mono text-white/80 text-right">
            {d.coupon != null ? d.coupon.toFixed(2) + '%' : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${ratingColor(d.rating)}`}>
            {d.rating ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-white/70 text-right">
            {d.ltv != null ? d.ltv.toFixed(1) + '%' : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right truncate">
            {d.collateral ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Airlines Tab ---------- */

function AirlinesTab({ data }: { data: any }) {
  if (!data || !data.airlines || data.airlines.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-border/20" style={{ background: ACCENT_DIM }}>
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-sky-400">
          AIRLINE CREDIT MONITOR
        </span>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[1.3fr_0.5fr_0.6fr_0.6fr_0.6fr_0.6fr]">
        <span>AIRLINE</span>
        <span className="text-right">RATING</span>
        <span className="text-right">CDS (BP)</span>
        <span className="text-right">LEVERAGE</span>
        <span className="text-right">FLEET AGE</span>
        <span className="text-right">LIQUIDITY</span>
      </div>
      {data.airlines.map((a: any, i: number) => (
        <div
          key={a.name ?? a.ticker ?? i}
          className="grid grid-cols-[1.3fr_0.5fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <div>
            <span className="text-[10px] font-mono font-bold text-sky-400">
              {a.name ?? a.ticker}
            </span>
            {a.ticker && a.name && (
              <span className="text-[7px] font-mono text-neutral-600 ml-1.5">{a.ticker}</span>
            )}
          </div>
          <span className={`text-[9px] font-mono font-bold text-right ${ratingColor(a.rating)}`}>
            {a.rating ?? '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${
            (a.cds ?? 0) > 500 ? 'text-red-400' : (a.cds ?? 0) > 300 ? 'text-amber-400' : 'text-white'
          }`}>
            {fmtBps(a.cds)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${
            (a.leverage ?? 0) > 5 ? 'text-red-400' : (a.leverage ?? 0) > 3 ? 'text-amber-400' : 'text-white'
          }`}>
            {fmtX(a.leverage)}
          </span>
          <span className={`text-[9px] font-mono text-right ${
            (a.fleetAge ?? 0) > 15 ? 'text-amber-400' : 'text-white/70'
          }`}>
            {fmtYears(a.fleetAge)}
          </span>
          <span className="text-[9px] font-mono text-white/70 text-right">
            {fmtMoney(a.liquidity)}
          </span>
        </div>
      ))}

      {/* CDS Spread Comparison */}
      {data.cdsComparison && data.cdsComparison.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider text-sky-400">
              CDS SPREAD COMPARISON
            </span>
          </div>
          {data.cdsComparison.map((c: any, i: number) => (
            <div key={c.name ?? i} className="px-3 py-1.5 border-b border-border/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono font-bold text-white/80">{c.name}</span>
                <span className={`text-[9px] font-mono font-bold ${
                  (c.cds ?? 0) > 500 ? 'text-red-400' : 'text-sky-400'
                }`}>
                  {fmtBps(c.cds)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, Math.max(2, (c.cds / (data.maxCds || c.cds)) * 100))}%`,
                    background: (c.cds ?? 0) > 500 ? '#f87171' : ACCENT,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Lessors Tab ---------- */

function LessorsTab({ data }: { data: any }) {
  if (!data || !data.lessors || data.lessors.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Market Overview */}
      {data.overview && (
        <div
          className="grid grid-cols-3 gap-px shrink-0 border-b border-border/20"
          style={{ background: ACCENT_DIM }}
        >
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">TOTAL FLEET</div>
            <div className="text-[11px] font-mono font-black text-sky-400">
              {fmtNum(data.overview.totalFleet)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">PORTFOLIO VALUE</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtMoney(data.overview.totalPortfolioValue)}
            </div>
          </div>
          <div className="px-3 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">ORDER BOOK</div>
            <div className="text-[11px] font-mono font-black text-white">
              {fmtNum(data.overview.totalOrderBook)}
            </div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-sky-400">
          LESSOR RANKINGS
        </span>
      </div>

      {/* Table Header */}
      <div className="px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider grid grid-cols-[0.3fr_1.2fr_0.6fr_0.8fr_0.6fr_0.6fr]">
        <span>#</span>
        <span>LESSOR</span>
        <span className="text-right">FLEET</span>
        <span className="text-right">PORT. VALUE</span>
        <span className="text-right">AVG AGE</span>
        <span className="text-right">ORDERS</span>
      </div>
      {data.lessors.map((l: any, i: number) => (
        <div
          key={l.name ?? l.id ?? i}
          className="grid grid-cols-[0.3fr_1.2fr_0.6fr_0.8fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-sky-400/60">
            {l.rank ?? i + 1}
          </span>
          <div>
            <span className="text-[10px] font-mono font-bold text-sky-400">
              {l.name}
            </span>
            {l.country && (
              <span className="text-[7px] font-mono text-neutral-600 ml-1.5">{l.country}</span>
            )}
          </div>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtNum(l.fleetCount)}
          </span>
          <span className="text-[9px] font-mono text-white/80 text-right">
            {fmtMoney(l.portfolioValue)}
          </span>
          <span className={`text-[9px] font-mono text-right ${
            (l.avgAge ?? 0) > 10 ? 'text-amber-400' : 'text-white/70'
          }`}>
            {fmtYears(l.avgAge)}
          </span>
          <span className="text-[9px] font-mono text-white/70 text-right">
            {fmtNum(l.orderBook)}
          </span>
        </div>
      ))}

      {/* Fleet Composition */}
      {data.fleetComposition && data.fleetComposition.length > 0 && (
        <div className="mt-1">
          <div className="px-3 py-1.5 border-b border-border/20">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider text-sky-400">
              FLEET COMPOSITION
            </span>
          </div>
          {data.fleetComposition.map((f: any, i: number) => (
            <div key={f.type ?? i} className="px-3 py-1.5 border-b border-border/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono font-bold text-white/80">{f.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-neutral-400">{fmtNum(f.count)}</span>
                  <span className="text-[8px] font-mono font-bold text-sky-400">
                    {f.pct != null ? f.pct.toFixed(1) + '%' : '--'}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, Math.max(2, f.pct ?? 0))}%`,
                    background: ACCENT,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Shared Components ---------- */

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
      NO DATA AVAILABLE
    </div>
  );
}
