import { useDebtCapitalMarkets } from '../../api/hooks/use-debt-capital-markets';
import { useT, tr, TFn } from '../../i18n';

// i18n helper with fallback
// ── Types ──

interface DCMIssuance {
  issuer: string;
  rating: string;
  size: number;
  coupon: number;
  maturity: string;
  spread: number;
  bookrunner: string;
  status: 'priced' | 'launched' | 'roadshow' | 'mandate';
}

interface DCMMarketSummary {
  igVolume: number;
  hyVolume: number;
  igSpread: number;
  hySpread: number;
  igSpreadChg: number;
  hySpreadChg: number;
  igDealCount: number;
  hyDealCount: number;
}

interface DCMLeagueEntry {
  bank: string;
  deals: number;
  volume: number;
  share: number;
}

interface DebtCapitalMarketsData {
  timestamp: string;
  issuancePipeline: DCMIssuance[];
  marketSummary: DCMMarketSummary;
  leagueTable: DCMLeagueEntry[];
}

// ── Formatting helpers ──

function fmtSize(n: number): string {
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bp';
}

function fmtBpsSigned(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}bp`;
}

function fmtPct(n: number): string {
  return n.toFixed(3) + '%';
}

function fmtShare(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Status badge color ──

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'priced': return 'text-green-400 bg-green-500/10 border border-green-500/30';
    case 'launched': return 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
    case 'roadshow': return 'text-amber-400 bg-amber-500/10 border border-amber-500/30';
    case 'mandate': return 'text-purple-400 bg-purple-500/10 border border-purple-500/30';
    default: return 'text-white/40 bg-white/5 border border-white/10';
  }
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-white/40';
}

// ── Main Panel ──

export function DebtCapitalMarketsPanel() {
  const t = useT();
  const { data: rawData, isLoading } = useDebtCapitalMarkets();
  const data = rawData as DebtCapitalMarketsData | undefined;

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'dcmTitle', 'Debt Capital Markets')}
          </span>
        </div>
        <div className="flex items-center justify-center flex-1">
          <span className="text-[9px] text-white/40 uppercase tracking-wider">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  const pipeline = data?.issuancePipeline ?? [];
  const summary = data?.marketSummary;
  const league = data?.leagueTable ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
        <div className="w-1.5 h-1.5 bg-indigo-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
          {tr(t, 'dcmTitle', 'Debt Capital Markets')}
        </span>
        {data?.timestamp && (
          <span className="ml-auto text-[7px] text-white/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── Section 1: New Issuance Pipeline ── */}
        <div className="border-b border-border/20">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
              {tr(t, 'dcmPipeline', 'New Issuance Pipeline')}
            </span>
          </div>

          {pipeline.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-[8px] text-white/20 uppercase tracking-wider">
              {tr(t, 'dcmNoPipeline', 'No issues in pipeline')}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_36px_44px_44px_48px_40px_1fr_44px] gap-px px-2 py-1 border-b border-border/20 text-[7px] font-black text-white/25 uppercase tracking-wider sticky top-0 bg-black z-10">
                <span>{tr(t, 'dcmIssuer', 'Issuer')}</span>
                <span className="text-center">{tr(t, 'dcmRating', 'Rtg')}</span>
                <span className="text-right">{tr(t, 'dcmSize', 'Size')}</span>
                <span className="text-right">{tr(t, 'dcmCoupon', 'Cpn')}</span>
                <span className="text-right">{tr(t, 'dcmMaturity', 'Mat')}</span>
                <span className="text-right">{tr(t, 'dcmSpread', 'Spd')}</span>
                <span>{tr(t, 'dcmBookrunner', 'Bookrunner')}</span>
                <span className="text-center">{tr(t, 'dcmStatus', 'Status')}</span>
              </div>

              {/* Rows */}
              {pipeline.map((issue, i) => (
                <div
                  key={`${issue.issuer}-${i}`}
                  className="grid grid-cols-[1fr_36px_44px_44px_48px_40px_1fr_44px] gap-px px-2 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors"
                >
                  <span className="text-[8px] font-bold text-white/80 truncate">{issue.issuer}</span>
                  <span className="text-[8px] text-white/50 text-center">{issue.rating}</span>
                  <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtSize(issue.size)}</span>
                  <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtPct(issue.coupon)}</span>
                  <span className="text-[8px] text-white/50 text-right">{issue.maturity}</span>
                  <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtBps(issue.spread)}</span>
                  <span className="text-[7px] text-white/30 truncate">{issue.bookrunner}</span>
                  <span className="flex items-center justify-center">
                    <span className={`text-[6px] font-black px-1 py-px uppercase ${statusBadgeClass(issue.status)}`}>
                      {issue.status}
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Section 2: Market Summary ── */}
        {summary && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1 border-b border-border/20">
              <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
                {tr(t, 'dcmMarketSummary', 'Market Summary')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border/20">
              {/* IG column */}
              <div className="bg-black px-3 py-2">
                <div className="text-[7px] font-black uppercase tracking-wider text-blue-400 mb-1">
                  Investment Grade
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Volume</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{fmtSize(summary.igVolume)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Deals</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{summary.igDealCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Spread</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{fmtBps(summary.igSpread)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Chg</span>
                    <span className={`text-[9px] font-bold tabular-nums ${changeColor(summary.igSpreadChg)}`}>
                      {fmtBpsSigned(summary.igSpreadChg)}
                    </span>
                  </div>
                </div>
              </div>

              {/* HY column */}
              <div className="bg-black px-3 py-2">
                <div className="text-[7px] font-black uppercase tracking-wider text-amber-400 mb-1">
                  High Yield
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Volume</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{fmtSize(summary.hyVolume)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Deals</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{summary.hyDealCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Spread</span>
                    <span className="text-[9px] font-bold text-white tabular-nums">{fmtBps(summary.hySpread)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-white/25 uppercase tracking-wider">Chg</span>
                    <span className={`text-[9px] font-bold tabular-nums ${changeColor(summary.hySpreadChg)}`}>
                      {fmtBpsSigned(summary.hySpreadChg)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Bookrunner League Table ── */}
        {league.length > 0 && (
          <div>
            <div className="px-2 py-1 border-b border-border/20">
              <span className="text-[7px] font-black uppercase tracking-wider text-white/25">
                {tr(t, 'dcmLeagueTable', 'Bookrunner League Table')}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[20px_1fr_40px_56px_48px] gap-px px-2 py-1 border-b border-border/20 text-[7px] font-black text-white/25 uppercase tracking-wider">
              <span className="text-center">#</span>
              <span>{tr(t, 'dcmBank', 'Bank')}</span>
              <span className="text-right">{tr(t, 'dcmDeals', 'Deals')}</span>
              <span className="text-right">{tr(t, 'dcmVolume', 'Volume')}</span>
              <span className="text-right">{tr(t, 'dcmShare', 'Share')}</span>
            </div>

            {/* Rows */}
            {league.map((entry, i) => (
              <div
                key={`${entry.bank}-${i}`}
                className="grid grid-cols-[20px_1fr_40px_56px_48px] gap-px px-2 py-1 border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors"
              >
                <span className="text-[8px] text-white/25 text-center tabular-nums">{i + 1}</span>
                <span className="text-[8px] font-bold text-white/80 truncate">{entry.bank}</span>
                <span className="text-[8px] text-white/50 text-right tabular-nums">{entry.deals}</span>
                <span className="text-[8px] text-white/70 text-right tabular-nums">{fmtSize(entry.volume)}</span>
                <span className="text-[8px] text-indigo-400 font-bold text-right tabular-nums">{fmtShare(entry.share)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
