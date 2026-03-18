import { useState } from 'react';
import { useCreditPortfolio } from '../../api/hooks/use-credit-portfolio';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtNotional(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtBps(n: number): string {
  return `${n.toFixed(1)}bp`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtDv01(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtDuration(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function ratingColor(rating: string): string {
  const r = rating.toUpperCase();
  if (r.startsWith('AAA') || r.startsWith('AA') || r.startsWith('A') || r.startsWith('BBB')) {
    return 'text-green-400';
  }
  if (r.startsWith('BB')) return 'text-amber-400';
  if (r.startsWith('B') && !r.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function ratingBg(rating: string): string {
  const r = rating.toUpperCase();
  if (r.startsWith('AAA') || r.startsWith('AA') || r.startsWith('A') || r.startsWith('BBB')) {
    return 'bg-green-500/5';
  }
  if (r.startsWith('BB')) return 'bg-amber-500/5';
  if (r.startsWith('B') && !r.startsWith('BB')) return 'bg-orange-500/5';
  return 'bg-red-500/5';
}

function owColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Tab types ──

type TabId = 'summary' | 'dv01' | 'ratings' | 'sectors' | 'issuers';

const TABS: { id: TabId; label: string }[] = [
  { id: 'summary', label: 'SUMMARY' },
  { id: 'dv01', label: 'DV01 LADDER' },
  { id: 'ratings', label: 'RATINGS' },
  { id: 'sectors', label: 'SECTORS' },
  { id: 'issuers', label: 'ISSUERS' },
];

// ── Main Panel ──

export function CreditPortfolioPanel() {
  const t = useT();
  const { data, isLoading, isError, refetch } = useCreditPortfolio();
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'cpTitle', 'Credit Portfolio')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-yellow-400 border-b border-yellow-400 bg-yellow-400/[0.03]'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-yellow-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING CREDIT DATA...
          </div>
        )}

        {isError && !data && (
          <div className="text-center py-8">
            <div className="text-red-400 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono text-yellow-400 hover:text-yellow-300 uppercase tracking-wider"
            >
              RETRY
            </button>
          </div>
        )}

        {data && activeTab === 'summary' && <SummaryTab data={data} t={t} />}
        {data && activeTab === 'dv01' && <Dv01LadderTab data={data} t={t} />}
        {data && activeTab === 'ratings' && <RatingsTab data={data} t={t} />}
        {data && activeTab === 'sectors' && <SectorsTab data={data} t={t} />}
        {data && activeTab === 'issuers' && <IssuersTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── Tab 1: Summary ──

function SummaryTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const metrics = [
    { label: 'TOTAL NOTIONAL', value: fmtNotional(data.totalNotional ?? 0) },
    { label: 'MARKET VALUE', value: fmtNotional(data.marketValue ?? 0) },
    { label: 'AVG SPREAD', value: fmtBps(data.avgSpread ?? 0) },
    { label: 'AVG RATING', value: data.avgRating ?? 'N/A' },
    { label: 'DV01', value: fmtDv01(data.dv01 ?? 0) },
    { label: 'SPREAD DURATION', value: fmtDuration(data.spreadDuration ?? 0) },
    { label: 'YTW', value: fmtYield(data.ytw ?? 0) },
    { label: 'POSITIONS', value: String(data.positions ?? 0) },
  ];

  const riskMetrics = [
    { label: 'CREDIT VAR (95%)', value: fmtNotional(data.creditVar95 ?? 0) },
    { label: 'CREDIT VAR (99%)', value: fmtNotional(data.creditVar99 ?? 0) },
    { label: 'EXPECTED SHORTFALL', value: fmtNotional(data.expectedShortfall ?? 0) },
    { label: 'SPREAD VOL', value: fmtBps(data.spreadVol ?? 0) },
    { label: 'MAX DRAWDOWN', value: fmtPct(data.maxDrawdown ?? 0) },
    { label: 'SHARPE RATIO', value: (data.sharpeRatio ?? 0).toFixed(2) },
  ];

  return (
    <div>
      {/* Key Metrics Grid */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cpKeyMetrics', 'Key Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {metrics.map((m: any) => (
            <div key={m.label} className="bg-black px-2.5 py-2 hover:bg-yellow-400/[0.02] transition-colors">
              <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-0.5">
                {m.label}
              </div>
              <div className="text-[11px] font-mono font-bold text-white">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cpRiskMetrics', 'Risk Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          {riskMetrics.map((m: any) => (
            <div key={m.label} className="bg-black px-2.5 py-2 hover:bg-yellow-400/[0.02] transition-colors">
              <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-0.5">
                {m.label}
              </div>
              <div className="text-[11px] font-mono font-bold text-white">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: DV01 Ladder ──

function Dv01LadderTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const buckets = data.dv01Ladder ?? [];
  const maxDv01 = Math.max(...buckets.map((b: any) => Math.abs(b.dv01 ?? 0)), 1);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cpDv01Ladder', 'DV01 by Maturity Bucket')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[100px_80px_1fr_90px_80px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">BUCKET</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">DV01</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 pl-3">% OF TOTAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">NOTIONAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AVG SPREAD</span>
      </div>

      {/* Table Rows */}
      {buckets.map((b: any) => {
        const pct = b.pctOfTotal ?? 0;
        const barWidth = Math.min(Math.abs(b.dv01 ?? 0) / maxDv01 * 100, 100);

        return (
          <div
            key={b.bucket}
            className="grid grid-cols-[100px_80px_1fr_90px_80px] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">{b.bucket}</span>
            <span className="text-[9px] font-mono text-white text-right">{fmtDv01(b.dv01 ?? 0)}</span>
            <div className="flex items-center gap-2 pl-3">
              <div className="flex-1 h-2.5 bg-neutral-900">
                <div
                  className="h-full bg-yellow-400/30"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-neutral-400 w-10 text-right">{fmtPct(pct)}</span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtNotional(b.notional ?? 0)}</span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtBps(b.avgSpread ?? 0)}</span>
          </div>
        );
      })}

      {buckets.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO DV01 DATA
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Ratings ──

function RatingsTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const ratings = data.ratingDistribution ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cpRatingDist', 'Rating Distribution')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[70px_90px_60px_80px_80px_70px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">RATING</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">NOTIONAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">%</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AVG SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AVG YIELD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">DV01</span>
      </div>

      {/* Table Rows */}
      {ratings.map((r: any) => (
        <div
          key={r.rating}
          className={`grid grid-cols-[70px_90px_60px_80px_80px_70px] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors ${ratingBg(r.rating)}`}
        >
          <span className={`text-[9px] font-mono font-bold ${ratingColor(r.rating)}`}>
            {r.rating}
          </span>
          <span className="text-[9px] font-mono text-white text-right">{fmtNotional(r.notional ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPct(r.pct ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtBps(r.avgSpread ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtYield(r.avgYield ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtDv01(r.dv01 ?? 0)}</span>
        </div>
      ))}

      {ratings.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO RATING DATA
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Sectors ──

function SectorsTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const sectors = data.sectorExposure ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cpSectorExposure', 'Sector Exposure')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_90px_55px_80px_70px_80px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SECTOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">NOTIONAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">%</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AVG SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AVG RTG</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">OW/UW</span>
      </div>

      {/* Table Rows */}
      {sectors.map((s: any) => (
        <div
          key={s.sector}
          className="grid grid-cols-[1fr_90px_55px_80px_70px_80px] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">{s.sector}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtNotional(s.notional ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPct(s.pct ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtBps(s.avgSpread ?? 0)}</span>
          <span className={`text-[9px] font-mono text-right ${ratingColor(s.avgRating ?? 'N/A')}`}>
            {s.avgRating ?? 'N/A'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${owColor(s.overUnderweight ?? 0)}`}>
            {(s.overUnderweight ?? 0) >= 0 ? '+' : ''}{fmtPct(s.overUnderweight ?? 0)}
          </span>
        </div>
      ))}

      {sectors.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO SECTOR DATA
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Issuers ──

function IssuersTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const issuers = (data.topIssuers ?? []).slice(0, 15);

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cpTopIssuers', 'Top 15 Issuer Concentration')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_60px_90px_55px_50px_70px_90px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">ISSUER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TICKER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">NOTIONAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">%</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">RTG</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SECTOR</span>
      </div>

      {/* Table Rows */}
      {issuers.map((iss: any, idx: any) => (
        <div
          key={iss.issuer ?? idx}
          className="grid grid-cols-[1fr_60px_90px_55px_50px_70px_90px] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">{iss.issuer}</span>
          <span className="text-[9px] font-mono text-yellow-400">{iss.ticker}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtNotional(iss.notional ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPct(iss.pctOfPortfolio ?? 0)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${ratingColor(iss.rating ?? 'N/A')}`}>
            {iss.rating ?? 'N/A'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{fmtBps(iss.spread ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-500 text-right truncate">{iss.sector ?? ''}</span>
        </div>
      ))}

      {issuers.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO ISSUER DATA
        </div>
      )}
    </div>
  );
}
