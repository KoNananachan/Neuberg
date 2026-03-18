import { useSecuritization } from '../../api/hooks/use-securitization';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(0)}bp`;
}

function fmtDollarB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

function fmtSize(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(bps: number | null | undefined): string {
  if (bps == null) return 'text-neutral-500';
  if (bps <= 80) return 'text-green-400';
  if (bps <= 200) return 'text-emerald-400';
  if (bps <= 400) return 'text-amber-400';
  if (bps <= 700) return 'text-orange-400';
  return 'text-red-400';
}

function ratingColor(rating: string | null | undefined): string {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('AAA')) return 'text-green-400';
  if (r.startsWith('AA')) return 'text-emerald-400';
  if (r.startsWith('A')) return 'text-cyan-400';
  if (r.startsWith('BBB')) return 'text-blue-400';
  if (r.startsWith('BB')) return 'text-amber-400';
  if (r.startsWith('B')) return 'text-orange-400';
  if (r.startsWith('NR') || r.startsWith('N/R')) return 'text-neutral-500';
  return 'text-neutral-400';
}

function delinquencyColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 10) return 'text-red-400';
  if (n >= 5) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function lossColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 5) return 'text-red-400';
  if (n >= 2) return 'text-orange-400';
  if (n >= 1) return 'text-yellow-400';
  return 'text-green-400';
}

function statusStyle(status: string | null | undefined): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'PRICED' || s === 'CLOSED') return 'text-green-400 bg-green-500/10 border border-green-500/30';
  if (s === 'MARKETING' || s === 'ROADSHOW') return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
  if (s === 'LAUNCHED' || s === 'BOOKBUILDING') return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
  if (s === 'PENDING' || s === 'ANNOUNCED') return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30';
}

function trendBadge(trend: string | null | undefined): { text: string; bg: string } {
  const s = (trend ?? '').toLowerCase();
  if (s === 'improving' || s === 'decreasing' || s === 'tightening')
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'deteriorating' || s === 'increasing' || s === 'widening')
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (s === 'stable' || s === 'flat')
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function qualityColor(score: number | null | undefined): string {
  if (score == null) return 'text-neutral-500';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

// -- Main Panel --

export function SecuritizationPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = useSecuritization() as { data: any; isLoading: boolean; error: any; refetch: () => void };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-emerald-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'panelSecuritization', 'Securitization Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8">
            <div className="text-red-400 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
            >
              RETRY
            </button>
          </div>
        )}

        {data && (
          <>
            <MarketVolumeSection data={data} t={t} />
            <NewIssuanceSection data={data} t={t} />
            <SpreadsGridSection data={data} t={t} />
            <PipelineSection data={data} t={t} />
            <PerformanceSection data={data} t={t} />
            <TopIssuersSection data={data} t={t} />
            <CollateralQualitySection data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// -- Section 1: Market Volume --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketVolumeSection({ data, t }: { data: any; t: TFn }) {
  const volumes = data.marketVolume ?? data.ytdIssuance ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secMarketVolume', 'YTD Issuance Volume')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_70px_70px_60px_60px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TYPE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">YTD VOL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PRIOR YR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">CHG %</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">DEALS</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {volumes.map((v: any, i: number) => (
        <div
          key={v.type ?? v.sector ?? i}
          className="grid grid-cols-[1fr_70px_70px_60px_60px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-emerald-400 truncate">{v.type ?? v.sector ?? ''}</span>
          <span className="text-[9px] font-mono font-bold text-white text-right">{fmtDollarB(v.ytdVolume ?? v.ytd ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtDollarB(v.priorYear ?? v.prior ?? 0)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(v.changePercent ?? v.change ?? 0)}`}>
            {fmtChange(v.changePercent ?? v.change ?? 0)}%
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{v.dealCount ?? v.deals ?? '-'}</span>
        </div>
      ))}

      {volumes.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO VOLUME DATA
        </div>
      )}
    </div>
  );
}

// -- Section 2: New Issuance --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NewIssuanceSection({ data, t }: { data: any; t: TFn }) {
  const deals = data.newIssuance ?? data.recentDeals ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secNewIssuance', 'New Issuance')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[50px_1fr_65px_55px_60px_60px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TYPE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">ISSUER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SIZE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">RATING</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SPREAD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">STATUS</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {deals.map((deal: any, i: number) => (
        <div
          key={deal.issuer ?? deal.name ?? i}
          className="grid grid-cols-[50px_1fr_65px_55px_60px_60px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono text-neutral-400 truncate">{deal.type ?? ''}</span>
          <span className="text-[9px] font-mono font-bold text-white truncate">{deal.issuer ?? deal.name ?? ''}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtSize(deal.size ?? 0)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${ratingColor(deal.rating)}`}>
            {deal.rating ?? '-'}
          </span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(deal.spread ?? 0)}`}>
            {fmtBps(deal.spread)}
          </span>
          <span className={`text-[7px] font-mono font-bold text-center px-1 py-px ${statusStyle(deal.status)}`}>
            {(deal.status ?? 'TBD').toUpperCase()}
          </span>
        </div>
      ))}

      {deals.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO ISSUANCE DATA
        </div>
      )}
    </div>
  );
}

// -- Section 3: Spreads Grid --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsGridSection({ data, t }: { data: any; t: TFn }) {
  const spreads = data.spreadsGrid ?? data.spreads ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secSpreads', 'Spreads by Sector & Rating')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SECTOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AAA</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">AA</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">A</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BBB</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">BB</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {spreads.map((row: any, i: number) => (
        <div
          key={row.sector ?? row.name ?? i}
          className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-emerald-400 truncate">{row.sector ?? row.name ?? ''}</span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(row.aaa ?? 0)}`}>{fmtBps(row.aaa)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(row.aa ?? 0)}`}>{fmtBps(row.aa)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(row.a ?? 0)}`}>{fmtBps(row.a)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(row.bbb ?? 0)}`}>{fmtBps(row.bbb)}</span>
          <span className={`text-[9px] font-mono text-right ${spreadColor(row.bb ?? 0)}`}>{fmtBps(row.bb)}</span>
        </div>
      ))}

      {spreads.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO SPREAD DATA
        </div>
      )}
    </div>
  );
}

// -- Section 4: Pipeline --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PipelineSection({ data, t }: { data: any; t: TFn }) {
  const pipeline = data.pipeline ?? data.upcomingDeals ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secPipeline', 'Deal Pipeline')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[50px_1fr_65px_55px_65px_60px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TYPE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">ISSUER / DEAL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">EST SIZE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">RATING</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">EXP DATE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">STAGE</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {pipeline.map((deal: any, i: number) => (
        <div
          key={deal.issuer ?? deal.deal ?? i}
          className="grid grid-cols-[50px_1fr_65px_55px_65px_60px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono text-neutral-400 truncate">{deal.type ?? ''}</span>
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-emerald-400 truncate">{deal.issuer ?? deal.deal ?? ''}</div>
            {deal.manager && (
              <div className="text-[7px] font-mono text-neutral-600 truncate">{deal.manager}</div>
            )}
          </div>
          <span className="text-[9px] font-mono text-white text-right">{fmtSize(deal.estimatedSize ?? deal.size ?? 0)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${ratingColor(deal.expectedRating ?? deal.rating)}`}>
            {deal.expectedRating ?? deal.rating ?? '-'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{deal.expectedDate ?? deal.date ?? ''}</span>
          <span className={`text-[7px] font-mono font-bold text-center px-1 py-px ${statusStyle(deal.stage ?? deal.status)}`}>
            {(deal.stage ?? deal.status ?? 'TBD').toUpperCase()}
          </span>
        </div>
      ))}

      {pipeline.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO PIPELINE DATA
        </div>
      )}
    </div>
  );
}

// -- Section 5: Performance Metrics --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PerformanceSection({ data, t }: { data: any; t: TFn }) {
  const metrics = data.performanceMetrics ?? data.performance ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secPerformance', 'Performance Metrics')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_60px_60px_60px_60px_55px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SECTOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">DQ RATE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PREPAY</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">LOSS RT</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">CHG 1M</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">TREND</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {metrics.map((m: any, i: number) => {
        const badge = trendBadge(m.trend);
        return (
          <div
            key={m.sector ?? m.name ?? i}
            className="grid grid-cols-[1fr_60px_60px_60px_60px_55px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-emerald-400 truncate">{m.sector ?? m.name ?? ''}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${delinquencyColor(m.delinquencyRate ?? m.dqRate ?? 0)}`}>
              {fmtPct(m.delinquencyRate ?? m.dqRate)}
            </span>
            <span className="text-[9px] font-mono text-white text-right">
              {fmtPct(m.prepaymentRate ?? m.prepay)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${lossColor(m.lossRate ?? m.loss ?? 0)}`}>
              {fmtPct(m.lossRate ?? m.loss)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(m.change1m ?? m.change ?? 0)}`}>
              {fmtChange(m.change1m ?? m.change)}
            </span>
            <div className="text-center flex items-center justify-center">
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.text} ${badge.bg}`}>
                {m.trend ?? '-'}
              </span>
            </div>
          </div>
        );
      })}

      {metrics.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO PERFORMANCE DATA
        </div>
      )}
    </div>
  );
}

// -- Section 6: Top Issuers --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TopIssuersSection({ data, t }: { data: any; t: TFn }) {
  const issuers = data.topIssuers ?? data.issuers ?? [];

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secTopIssuers', 'Top Issuers')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[28px_1fr_70px_60px_60px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">#</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">ISSUER</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">YTD VOL</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">DEALS</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">MKT SHR</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {issuers.map((issuer: any, i: number) => (
        <div
          key={issuer.name ?? issuer.issuer ?? i}
          className="grid grid-cols-[28px_1fr_70px_60px_60px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-neutral-600">{i + 1}</span>
          <span className="text-[9px] font-mono font-bold text-white truncate">{issuer.name ?? issuer.issuer ?? ''}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtDollarB(issuer.ytdVolume ?? issuer.volume ?? 0)}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">{issuer.dealCount ?? issuer.deals ?? '-'}</span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold text-right">{fmtPct(issuer.marketShare ?? issuer.share, 1)}</span>
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

// -- Section 7: Collateral Quality --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CollateralQualitySection({ data, t }: { data: any; t: TFn }) {
  const indicators = data.collateralQuality ?? data.collateral ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secCollateral', 'Collateral Quality Indicators')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_55px_55px_60px_55px] px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">INDICATOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">CURRENT</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">PRIOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">SCORE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">TREND</span>
      </div>

      {/* Table Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {indicators.map((ind: any, i: number) => {
        const badge = trendBadge(ind.trend);
        return (
          <div
            key={ind.indicator ?? ind.name ?? i}
            className="grid grid-cols-[1fr_55px_55px_60px_55px] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{ind.indicator ?? ind.name ?? ''}</span>
            <span className="text-[9px] font-mono text-white text-right">{fmtNum(ind.current ?? ind.value)}</span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtNum(ind.prior ?? ind.previous)}</span>
            <span className="flex items-center gap-1 justify-end">
              <div className="w-10 h-1.5 bg-neutral-800 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${qualityColor(ind.score ?? 0) === 'text-green-400' ? 'bg-green-400' : qualityColor(ind.score ?? 0) === 'text-emerald-400' ? 'bg-emerald-400' : qualityColor(ind.score ?? 0) === 'text-yellow-400' ? 'bg-yellow-400' : qualityColor(ind.score ?? 0) === 'text-orange-400' ? 'bg-orange-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(ind.score ?? 0, 100)}%` }}
                />
              </div>
              <span className={`text-[8px] font-mono font-bold ${qualityColor(ind.score ?? 0)}`}>
                {fmtNum(ind.score, 0)}
              </span>
            </span>
            <div className="text-center flex items-center justify-center">
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.text} ${badge.bg}`}>
                {ind.trend ?? '-'}
              </span>
            </div>
          </div>
        );
      })}

      {indicators.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO COLLATERAL DATA
        </div>
      )}

      {/* Timestamp */}
      {data.timestamp && (
        <div className="px-3 py-1.5 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
