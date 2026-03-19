import { useState } from 'react';
import { useCommercialPaper } from '../../api/hooks/use-commercial-paper';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Tab definitions ──

type Tab = 'RATES' | 'ISSUANCE' | 'OUTSTANDING' | 'SPREADS' | 'TOP ISSUERS';
const TABS: Tab[] = ['RATES', 'ISSUANCE', 'OUTSTANDING', 'SPREADS', 'TOP ISSUERS'];

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${n.toFixed(1)}B`;
}

function fmtBnSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 1000) return `${sign}${(n / 1000).toFixed(1)}T`;
  return `${sign}${n.toFixed(1)}B`;
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(0)}d`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 50) return 'text-red-400';
  if (n > 20) return 'text-yellow-400';
  return 'text-neutral-400';
}

function flowColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Skeleton shimmer ──

function Shimmer({ rows = 5 }: { rows?: number }) {
  return (
    <div className="px-3 py-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-2 bg-neutral-800 flex-1" />
          <div className="h-2 bg-neutral-800 w-12" />
          <div className="h-2 bg-neutral-800 w-10" />
          <div className="h-2 bg-neutral-800 w-14" />
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function CommercialPaperPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCommercialPaper();
  const [activeTab, setActiveTab] = useState<Tab>('RATES');
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            {tr(t, 'panelCommercialPaper', 'Commercial Paper Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.asOfDate && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {d.asOfDate}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#030303]">
        <div className="flex gap-px px-2 py-1 flex-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !d && <Shimmer rows={8} />}

        {/* Error state */}
        {error && !d && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
              FAILED TO LOAD COMMERCIAL PAPER DATA
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-rose-400 border border-rose-400/30 hover:bg-rose-400/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Data views */}
        {d && (
          <>
            {activeTab === 'RATES' && <RatesView d={d} t={t} />}
            {activeTab === 'ISSUANCE' && <IssuanceView d={d} t={t} />}
            {activeTab === 'OUTSTANDING' && <OutstandingView d={d} t={t} />}
            {activeTab === 'SPREADS' && <SpreadsView d={d} t={t} />}
            {activeTab === 'TOP ISSUERS' && <TopIssuersView d={d} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── RATES View ──

function RatesView({ d, t }: { d: any; t: TFn }) {
  const rates = d?.rates ?? [];

  return (
    <div>
      {/* Summary banner */}
      {rates.length > 0 && (
        <div className="border-b border-border/20 bg-[#030303]">
          <div className="flex items-center gap-0 divide-x divide-border/10">
            <div className="flex-1 px-3 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cpONRate', 'Overnight Rate')}
              </div>
              <div className="text-[13px] font-mono font-bold text-white mt-0.5">
                {fmtRate(rates[0]?.rate)}%
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cp1DChg', '1D Change')}
              </div>
              <div className={`text-[13px] font-mono font-bold mt-0.5 ${changeColor(rates[0]?.change1d)}`}>
                {fmtBps(rates[0]?.change1d)}bp
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'cpAvgMaturity', 'Avg Maturity')}
              </div>
              <div className="text-[13px] font-mono font-bold text-rose-400 mt-0.5">
                {fmtDays(rates[0]?.avgMaturity)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rates table header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'cpRatesByTenor', 'Rates by Tenor')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_55px_50px_55px_55px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cpTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpChg', 'Chg (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cp30dAvg', '30D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cp90dAvg', '90D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpVolume', 'Vol ($B)')}
        </span>
      </div>

      {rates.map((r: any) => (
        <div
          key={r.tenor ?? r.name}
          className="grid grid-cols-[1fr_55px_50px_55px_55px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {r.tenor ?? r.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(r.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1d ?? r.changeBps)}`}>
            {fmtBps(r.change1d ?? r.changeBps)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(r.avg30d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(r.avg90d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBn(r.volume)}
          </span>
        </div>
      ))}

      {rates.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── ISSUANCE View ──

function IssuanceView({ d, t }: { d: any; t: TFn }) {
  const issuance = d?.issuance ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'cpIssuanceActivity', 'Issuance Activity')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cpPeriod', 'Period')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpVolume', 'Volume')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpDealCount', 'Deals')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpAvgSize', 'Avg Size')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpChgVol', 'Chg')}
        </span>
      </div>

      {issuance.map((row: any, i: number) => (
        <div
          key={row.period ?? i}
          className="grid grid-cols-[1fr_60px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.period ?? row.date}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(row.volume)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {row.dealCount ?? row.count ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBn(row.avgSize)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(row.change)}`}>
            {fmtBnSigned(row.change)}
          </span>
        </div>
      ))}

      {issuance.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Issuance breakdown by type */}
      {d?.issuanceByType && d.issuanceByType.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10 border-t border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cpByType', 'Breakdown by Type')}
            </span>
          </div>

          {d.issuanceByType.map((row: any) => (
            <div
              key={row.type}
              className="flex items-center justify-between px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {row.type}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-neutral-400">
                  {fmtBn(row.volume)}
                </span>
                <div className="w-20 h-1.5 bg-neutral-800">
                  <div
                    className="h-full bg-rose-400"
                    style={{ width: `${Math.min(row.pct ?? 0, 100)}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-rose-400 w-8 text-right">
                  {fmtPct(row.pct)}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── OUTSTANDING View ──

function OutstandingView({ d, t }: { d: any; t: TFn }) {
  const outstanding = d?.outstanding ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'cpOutstanding', 'Outstanding by Maturity')}
        </span>
      </div>

      {/* Summary cards */}
      {d?.outstandingSummary && (
        <div className="grid grid-cols-3 gap-px bg-border/10 border-b border-border/20">
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'cpTotalOutstanding', 'Total Outstanding')}
            </div>
            <div className="text-[12px] font-mono font-black text-white mt-0.5">
              {fmtBn(d.outstandingSummary.total)}
            </div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'cpWtdAvgMat', 'Wtd Avg Maturity')}
            </div>
            <div className="text-[12px] font-mono font-black text-rose-400 mt-0.5">
              {fmtDays(d.outstandingSummary.wtdAvgMaturity)}
            </div>
          </div>
          <div className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'cpNetChange', 'Net Change')}
            </div>
            <div className={`text-[12px] font-mono font-black mt-0.5 ${flowColor(d.outstandingSummary.netChange)}`}>
              {fmtBnSigned(d.outstandingSummary.netChange)}
            </div>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_55px_60px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cpMaturityBucket', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpAmount', 'Amount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpShare', 'Share')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpChgWk', 'Chg (Wk)')}
        </span>
      </div>

      {outstanding.map((row: any, i: number) => (
        <div
          key={row.bucket ?? row.maturity ?? i}
          className="grid grid-cols-[1fr_60px_55px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
              {row.bucket ?? row.maturity}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(row.amount)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1 bg-neutral-800">
              <div
                className="h-full bg-rose-400/60"
                style={{ width: `${Math.min(row.share ?? row.pct ?? 0, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral-400 w-8 text-right">
              {fmtPct(row.share ?? row.pct)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(row.weeklyChange ?? row.change)}`}>
            {fmtBnSigned(row.weeklyChange ?? row.change)}
          </span>
        </div>
      ))}

      {outstanding.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── SPREADS View ──

function SpreadsView({ d, t }: { d: any; t: TFn }) {
  const spreads = d?.spreads ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'cpSpreads', 'Credit Spreads vs T-Bills')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_50px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cpTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpSpread', 'Sprd (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpChg1d', '1D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpChg1w', '1W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cp30dAvg', '30D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cp52wRange', '52W Rng')}
        </span>
      </div>

      {spreads.map((row: any, i: number) => (
        <div
          key={row.tenor ?? row.name ?? i}
          className="grid grid-cols-[1fr_55px_50px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.tenor ?? row.name}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(row.spread)}`}>
            {fmtBps(row.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.change1d)}`}>
            {fmtBps(row.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.change1w)}`}>
            {fmtBps(row.change1w)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtBps(row.avg30d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {row.low52w != null && row.high52w != null
              ? `${row.low52w.toFixed(0)}-${row.high52w.toFixed(0)}`
              : '--'}
          </span>
        </div>
      ))}

      {spreads.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Spread curve visualization */}
      {spreads.length > 0 && (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cpSpreadCurve', 'Spread Curve')}
            </span>
          </div>
          <div className="px-3 py-2">
            {spreads.map((row: any) => {
              const maxSpread = Math.max(...spreads.map((s: any) => Math.abs(s.spread ?? 0)), 1);
              const pct = Math.min(Math.abs(row.spread ?? 0) / maxSpread * 100, 100);
              return (
                <div key={`curve-${row.tenor ?? row.name}`} className="flex items-center gap-2 py-px">
                  <span className="text-[7px] font-mono text-neutral-500 w-8 text-right shrink-0">
                    {row.tenor ?? row.name}
                  </span>
                  <div className="flex-1 h-[5px] bg-neutral-900">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-rose-400 w-10 text-right shrink-0">
                    {fmtBps(row.spread)}bp
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TOP ISSUERS View ──

function TopIssuersView({ d, t }: { d: any; t: TFn }) {
  const issuers = d?.topIssuers ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'cpTopIssuers', 'Top Issuers')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[20px_1fr_55px_55px_50px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          #
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'cpIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpOutAmt', 'Outstand')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpMktShare', 'Share')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'cpAvgRate', 'Avg Rate')}
        </span>
      </div>

      {issuers.map((issuer: any, i: number) => (
        <div
          key={issuer.name ?? i}
          className="grid grid-cols-[20px_1fr_55px_55px_50px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-600">
            {i + 1}
          </span>
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {issuer.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(issuer.outstanding ?? issuer.amount)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1 bg-neutral-800">
              <div
                className="h-full bg-rose-400/60"
                style={{ width: `${Math.min(issuer.marketShare ?? issuer.share ?? 0, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtPct(issuer.marketShare ?? issuer.share)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${ratingColor(issuer.rating)}`}>
            {issuer.rating ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(issuer.avgRate)}
          </span>
        </div>
      ))}

      {issuers.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Concentration indicator */}
      {issuers.length > 0 && d?.concentrationIndex != null && (
        <div className="border-t border-border/20 px-3 py-1.5 bg-[#030303]">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cpHHI', 'Herfindahl-Hirschman Index')}
            </span>
            <span className="text-[9px] font-mono font-bold text-rose-400">
              {d.concentrationIndex.toFixed(0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rating color helper ──

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'text-neutral-500';
  const r = rating.toUpperCase();
  if (r.startsWith('A-1') || r.startsWith('P-1') || r === 'F1+' || r === 'F1') return 'text-green-400';
  if (r.startsWith('A-2') || r.startsWith('P-2') || r === 'F2') return 'text-yellow-400';
  if (r.startsWith('A-3') || r.startsWith('P-3') || r === 'F3') return 'text-orange-400';
  return 'text-neutral-400';
}
