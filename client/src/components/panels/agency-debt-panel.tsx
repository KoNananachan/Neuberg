import { useState } from 'react';
import { useAgencyDebt } from '../../api/hooks/use-agency-debt';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Tab definitions ──

type Tab = 'ISSUERS' | 'ISSUANCE' | 'SPREADS' | 'CALLABLE' | 'DISCOUNT NOTES';
const TABS: Tab[] = ['ISSUERS', 'ISSUANCE', 'SPREADS', 'CALLABLE', 'DISCOUNT NOTES'];

// ── Formatting helpers ──

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

function fmtSpreadSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${n.toFixed(1)}B`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(0)}d`;
}

function fmtDuration(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadLevelColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 50) return 'text-red-400';
  if (n > 25) return 'text-yellow-400';
  return 'text-blue-400';
}

function ratingColor(rating: string | null | undefined): string {
  if (!rating) return 'text-neutral-500';
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return 'text-green-400';
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return 'text-blue-400';
  if (rating.startsWith('A')) return 'text-yellow-400';
  return 'text-neutral-400';
}

// ── Skeleton shimmer ──

function Shimmer({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-3 py-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-2 bg-neutral-800 flex-1" />
          <div className="h-2 bg-neutral-800 w-14" />
          <div className="h-2 bg-neutral-800 w-10" />
          <div className="h-2 bg-neutral-800 w-12" />
          <div className="h-2 bg-neutral-800 w-10" />
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function AgencyDebtPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useAgencyDebt();
  const [activeTab, setActiveTab] = useState<Tab>('ISSUERS');
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'panelAgencyDebt', 'Agency Debt Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.asOfDate ? (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {String(d.asOfDate)}
            </span>
          ) : null}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
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
                  ? 'text-blue-400 bg-blue-500/10'
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
              FAILED TO LOAD AGENCY DEBT DATA
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Data views */}
        {d && (
          <>
            {activeTab === 'ISSUERS' && <IssuersView d={d} t={t} />}
            {activeTab === 'ISSUANCE' && <IssuanceView d={d} t={t} />}
            {activeTab === 'SPREADS' && <SpreadsView d={d} t={t} />}
            {activeTab === 'CALLABLE' && <CallableView d={d} t={t} />}
            {activeTab === 'DISCOUNT NOTES' && <DiscountNotesView d={d} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── ISSUERS View ──

function IssuersView({ d, t }: { d: any; t: TFn }) {
  const issuers = d?.issuers ?? [];

  return (
    <div>
      {/* Summary banner */}
      {issuers.length > 0 && (
        <div className="border-b border-border/20 bg-[#030303]">
          <div className="flex items-center gap-0 divide-x divide-border/10">
            <div className="flex-1 px-3 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adTotalIssuers', 'Total Issuers')}
              </div>
              <div className="text-[13px] font-mono font-bold text-blue-400 mt-0.5">
                {String(issuers.length)}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adTotalOutstanding', 'Total Outstanding')}
              </div>
              <div className="text-[13px] font-mono font-bold text-white mt-0.5">
                {issuers[0]?.totalOutstanding != null ? fmtBn(issuers[0].totalOutstanding) : '--'}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adAvgSpread', 'Avg Spread (bp)')}
              </div>
              <div className="text-[13px] font-mono font-bold text-blue-400 mt-0.5">
                {issuers[0]?.avgSpread != null ? fmtSpread(issuers[0].avgSpread) : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'adGseIssuers', 'GSE / Agency Issuers')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1.2fr_60px_55px_55px_55px_50px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adOutstanding', 'Outstd ($B)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adChg', 'Chg (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDuration', 'Dur')}
        </span>
      </div>

      {/* Rows */}
      {issuers.map((row: any, i: number) => (
        <div
          key={row.name ? String(row.name) : i}
          className="grid grid-cols-[1.2fr_60px_55px_55px_55px_50px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.name ? String(row.name) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${ratingColor(row.rating)}`}>
            {row.rating ? String(row.rating) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtBn(row.outstanding)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadLevelColor(row.spread)}`}>
            {fmtSpread(row.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.spreadChange)}`}>
            {fmtSpreadSigned(row.spreadChange)}
          </span>
          <span className="text-[8px] font-mono text-blue-400 text-right">
            {fmtYield(row.yield)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDuration(row.duration)}
          </span>
        </div>
      ))}

      {issuers.length === 0 && (
        <div className="px-3 py-6 text-center text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          No issuer data available
        </div>
      )}
    </div>
  );
}

// ── ISSUANCE View ──

function IssuanceView({ d, t }: { d: any; t: TFn }) {
  const issuance = d?.recentIssuance ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'adRecentIssuance', 'Recent Agency Issuance')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.9fr_1fr_55px_50px_50px_50px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adIssuerName', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adSize', 'Size ($B)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adCoupon', 'Coupon')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adMaturity', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adIssuanceSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adType', 'Type')}
        </span>
      </div>

      {/* Rows */}
      {issuance.map((row: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[0.9fr_1fr_55px_50px_50px_50px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {row.date ? String(row.date) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.issuer ? String(row.issuer) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtBn(row.size)}
          </span>
          <span className="text-[8px] font-mono text-blue-400 text-right">
            {row.coupon != null ? fmtPct(row.coupon) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {row.maturity ? String(row.maturity) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadLevelColor(row.spread)}`}>
            {fmtSpread(row.spread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right uppercase">
            {row.type ? String(row.type) : '--'}
          </span>
        </div>
      ))}

      {issuance.length === 0 && (
        <div className="px-3 py-6 text-center text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          No recent issuance data
        </div>
      )}
    </div>
  );
}

// ── SPREADS View ──

function SpreadsView({ d, t }: { d: any; t: TFn }) {
  const curve = d?.spreadCurve ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'adSpreadCurve', 'Agency Spread Curve vs. Treasuries')}
        </span>
      </div>

      {/* Visual spread bars */}
      {curve.length > 0 && (
        <div className="px-3 py-2 border-b border-border/10">
          <div className="flex items-end gap-1 h-16">
            {curve.map((pt: any, i: number) => {
              const maxSpread = Math.max(...curve.map((c: any) => Math.abs(c.spread ?? 0)), 1);
              const height = Math.abs(pt.spread ?? 0) / maxSpread * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[6px] font-mono text-blue-400 font-bold">
                    {pt.spread != null ? fmtSpread(pt.spread) : '--'}
                  </span>
                  <div
                    className="w-full bg-blue-400/30 border-t border-blue-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[6px] font-mono text-neutral-600 uppercase">
                    {pt.tenor ? String(pt.tenor) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adAgencyYld', 'Agency Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adTsyYld', 'Tsy Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adSpreadBp', 'Spread (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adChgBp', '1D Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adZScore', 'Z-Score')}
        </span>
      </div>

      {/* Rows */}
      {curve.map((row: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {row.tenor ? String(row.tenor) : '--'}
          </span>
          <span className="text-[8px] font-mono text-blue-400 text-right">
            {fmtYield(row.agencyYield)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtYield(row.tsyYield)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadLevelColor(row.spread)}`}>
            {fmtSpread(row.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.change1d)}`}>
            {fmtSpreadSigned(row.change1d)}
          </span>
          <span className={`text-[8px] font-mono text-right ${
            row.zScore != null && Math.abs(row.zScore) > 1.5 ? 'text-yellow-400' : 'text-neutral-500'
          }`}>
            {row.zScore != null ? Number(row.zScore).toFixed(2) : '--'}
          </span>
        </div>
      ))}

      {curve.length === 0 && (
        <div className="px-3 py-6 text-center text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          No spread curve data
        </div>
      )}
    </div>
  );
}

// ── CALLABLE View ──

function CallableView({ d, t }: { d: any; t: TFn }) {
  const schedule = d?.callSchedule ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'adCallSchedule', 'Callable Agency Bonds')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_0.8fr_50px_50px_55px_50px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adBondId', 'CUSIP / ID')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adCallIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adCallCoupon', 'Cpn %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adCallDate', 'Call Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adCallPrice', 'Call Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adYtc', 'YTC %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adYtm', 'YTM %')}
        </span>
      </div>

      {/* Rows */}
      {schedule.map((row: any, i: number) => (
        <div
          key={row.cusip ? String(row.cusip) : i}
          className="grid grid-cols-[1fr_0.8fr_50px_50px_55px_50px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
            {row.cusip ? String(row.cusip) : row.id ? String(row.id) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.issuer ? String(row.issuer) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {row.coupon != null ? fmtPct(row.coupon) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {row.callDate ? String(row.callDate) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(row.callPrice)}
          </span>
          <span className="text-[8px] font-mono text-blue-400 text-right">
            {row.ytc != null ? fmtYield(row.ytc) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {row.ytm != null ? fmtYield(row.ytm) : '--'}
          </span>
        </div>
      ))}

      {schedule.length === 0 && (
        <div className="px-3 py-6 text-center text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          No callable bond data
        </div>
      )}
    </div>
  );
}

// ── DISCOUNT NOTES View ──

function DiscountNotesView({ d, t }: { d: any; t: TFn }) {
  const notes = d?.discountNotes ?? [];

  return (
    <div>
      {/* Summary banner */}
      {notes.length > 0 && (
        <div className="border-b border-border/20 bg-[#030303]">
          <div className="flex items-center gap-0 divide-x divide-border/10">
            <div className="flex-1 px-3 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adDnCount', 'Active Issues')}
              </div>
              <div className="text-[13px] font-mono font-bold text-blue-400 mt-0.5">
                {String(notes.length)}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adDnAvgYield', 'Avg Yield')}
              </div>
              <div className="text-[13px] font-mono font-bold text-white mt-0.5">
                {notes[0]?.yield != null ? `${fmtYield(notes[0].yield)}%` : '--'}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'adDnAvgDays', 'Avg Days to Mat')}
              </div>
              <div className="text-[13px] font-mono font-bold text-blue-400 mt-0.5">
                {notes[0]?.daysToMaturity != null ? fmtDays(notes[0].daysToMaturity) : '--'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'adDiscountNotes', 'Agency Discount Notes')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_0.8fr_55px_55px_55px_50px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adDnIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'adDnMatDate', 'Maturity')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDnDays', 'Days')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDnYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDnDiscount', 'Discount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDnPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'adDnSize', 'Size ($B)')}
        </span>
      </div>

      {/* Rows */}
      {notes.map((row: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_0.8fr_55px_55px_55px_50px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.issuer ? String(row.issuer) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">
            {row.maturityDate ? String(row.maturityDate) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {row.daysToMaturity != null ? fmtDays(row.daysToMaturity) : '--'}
          </span>
          <span className="text-[8px] font-mono text-blue-400 font-bold text-right">
            {fmtYield(row.yield)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {row.discount != null ? fmtPct(row.discount) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(row.price)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {fmtBn(row.size)}
          </span>
        </div>
      ))}

      {notes.length === 0 && (
        <div className="px-3 py-6 text-center text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
          No discount note data
        </div>
      )}
    </div>
  );
}
