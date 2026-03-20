import { useCorporateActions } from '../../api/hooks/use-corporate-actions';
import { useT, tr, TFn } from '../../i18n';

// ── Types (mirroring server response) ──

interface UpcomingAction {
  ticker: string;
  companyName: string;
  actionType: string;
  exDate: string;
  recordDate: string;
  payDate: string;
  details: string;
  status: string;
}

interface DividendCalendarEntry {
  ticker: string;
  company: string;
  exDate: string;
  amount: number;
  yield: number;
  frequency: string;
  type: string;
}

interface MaDeal {
  acquirer: string;
  target: string;
  dealValue: number;
  premium: number;
  dealType: string;
  status: string;
  expectedClose: string;
  spreadToOffer: number;
}

interface Summary {
  totalUpcoming: number;
  dividendCount: number;
  maDeals: number;
  totalMaValue: number;
  nextMajorAction: string;
  timestamp: string;
}

interface CorporateActionsResponse {
  upcomingActions: UpcomingAction[];
  dividendCalendar: DividendCalendarEntry[];
  maPipeline: MaDeal[];
  summary: Summary;
}

// ── Formatting helpers ──

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtB(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

// ── Action type badge colors ──

function actionTypeColor(type: string): string {
  switch (type) {
    case 'DIVIDEND':
      return 'bg-green-400/10 text-green-400';
    case 'STOCK_SPLIT':
      return 'bg-blue-400/10 text-blue-400';
    case 'MERGER':
      return 'bg-purple-400/10 text-purple-300';
    case 'SPINOFF':
      return 'bg-cyan-400/10 text-cyan-400';
    case 'RIGHTS_ISSUE':
      return 'bg-yellow-400/10 text-yellow-400';
    case 'TENDER_OFFER':
      return 'bg-orange-400/10 text-orange-400';
    case 'DELISTING':
      return 'bg-red-400/10 text-red-400';
    default:
      return 'bg-white/5 text-white/50';
  }
}

function actionTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

// ── Status color helper ──

function statusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'CLOSING':
      return 'text-green-400/80';
    case 'PENDING':
    case 'SHAREHOLDER_VOTE':
      return 'text-yellow-400/80';
    case 'ANNOUNCED':
      return 'text-purple-400/80';
    case 'REGULATORY_REVIEW':
      return 'text-orange-400/80';
    default:
      return 'text-white/40';
  }
}

// ── Main Panel ──

export function CorporateActionsPanel() {
  const t = useT();
  const { data, isLoading } = useCorporateActions();

  const actions = data as CorporateActionsResponse | undefined;

  // Loading state
  if (isLoading && !actions) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-purple-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  // Error / no data state
  if (!actions?.upcomingActions) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'caNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  const summary = actions.summary;

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-4 gap-px bg-purple-400/[0.06] mb-1">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">UPCOMING ACTIONS</div>
          <div className="text-[11px] font-black text-purple-400">{summary.totalUpcoming}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">DIVIDENDS</div>
          <div className="text-[11px] font-black text-purple-400">{summary.dividendCount}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">M&A DEALS</div>
          <div className="text-[11px] font-black text-purple-400">{summary.maDeals}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL M&A ($B)</div>
          <div className="text-[11px] font-black text-purple-400">${fmtB(summary.totalMaValue)}B</div>
        </div>
      </div>

      {/* ── Upcoming Actions ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-purple-400/60 uppercase tracking-wider font-bold">
            UPCOMING ACTIONS
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[60px] shrink-0">EX DATE</span>
          <span className="w-[40px] shrink-0">TICKER</span>
          <span className="w-[100px] shrink-0">COMPANY</span>
          <span className="w-[72px] shrink-0">TYPE</span>
          <span className="flex-1">DETAILS</span>
          <span className="w-[60px] shrink-0 text-right">STATUS</span>
        </div>

        {/* Rows */}
        {actions.upcomingActions.map((a, i) => (
          <div
            key={`${a.ticker}-${a.exDate}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="w-[60px] shrink-0 text-[7px] text-white/30">{fmtDate(a.exDate)}</span>
            <span className="w-[40px] shrink-0 text-[8px] font-bold text-purple-400">{a.ticker}</span>
            <span className="w-[100px] shrink-0 text-white/40 truncate">{a.companyName}</span>
            <span className="w-[72px] shrink-0">
              <span className={`px-1 py-[1px] text-[6px] font-bold uppercase ${actionTypeColor(a.actionType)}`}>
                {actionTypeLabel(a.actionType)}
              </span>
            </span>
            <span className="flex-1 text-white/40 truncate">{a.details}</span>
            <span className={`w-[60px] shrink-0 text-right text-[7px] font-bold ${statusColor(a.status)}`}>
              {a.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* ── Dividend Calendar ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-purple-400/60 uppercase tracking-wider font-bold">
            DIVIDEND CALENDAR
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[60px] shrink-0">EX DATE</span>
          <span className="w-[40px] shrink-0">TICKER</span>
          <span className="w-[52px] shrink-0 text-right">AMOUNT</span>
          <span className="w-[48px] shrink-0 text-right">YIELD %</span>
          <span className="w-[64px] shrink-0 text-center">FREQUENCY</span>
          <span className="flex-1 text-right">TYPE</span>
        </div>

        {/* Rows */}
        {actions.dividendCalendar.map((d, i) => (
          <div
            key={`${d.ticker}-${d.exDate}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="w-[60px] shrink-0 text-[7px] text-white/30">{fmtDate(d.exDate)}</span>
            <span className="w-[40px] shrink-0 text-[8px] font-bold text-purple-400">{d.ticker}</span>
            <span className="w-[52px] shrink-0 text-right text-white/60">${fmtPrice(d.amount)}</span>
            <span className={`w-[48px] shrink-0 text-right font-bold ${d.yield >= 3.0 ? 'text-green-400/80' : 'text-white/50'}`}>
              {fmtPct(d.yield)}
            </span>
            <span className="w-[64px] shrink-0 text-center text-white/30 text-[7px]">{d.frequency}</span>
            <span className="flex-1 text-right">
              {d.type === 'SPECIAL' ? (
                <span className="text-[6px] font-bold text-yellow-400/80 bg-yellow-400/[0.08] px-1 py-[1px]">SPECIAL</span>
              ) : d.type === 'INTERIM' ? (
                <span className="text-[6px] font-bold text-cyan-400/80 bg-cyan-400/[0.08] px-1 py-[1px]">INTERIM</span>
              ) : (
                <span className="text-white/30 text-[7px]">{d.type}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ── M&A Pipeline ── */}
      <div>
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-purple-400/60 uppercase tracking-wider font-bold">
            M&A PIPELINE
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[90px] shrink-0">ACQUIRER</span>
          <span className="w-[90px] shrink-0">TARGET</span>
          <span className="w-[48px] shrink-0 text-right">VALUE $B</span>
          <span className="w-[48px] shrink-0 text-right">PREM %</span>
          <span className="w-[40px] shrink-0 text-center">TYPE</span>
          <span className="w-[72px] shrink-0 text-center">STATUS</span>
          <span className="w-[60px] shrink-0 text-right">EXP CLOSE</span>
          <span className="flex-1 text-right">SPREAD</span>
        </div>

        {/* Rows */}
        {actions.maPipeline.map((deal, i) => {
          const wideSpread = deal.spreadToOffer >= 5.0;
          return (
            <div
              key={`${deal.acquirer}-${deal.target}-${i}`}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="w-[90px] shrink-0 text-white/50 truncate text-[7px]">{deal.acquirer}</span>
              <span className="w-[90px] shrink-0 text-[8px] font-bold text-purple-400 truncate">{deal.target}</span>
              <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(deal.dealValue)}</span>
              <span className="w-[48px] shrink-0 text-right text-green-400/70">{fmtPct(deal.premium)}</span>
              <span className="w-[40px] shrink-0 text-center text-white/30 text-[7px]">{deal.dealType}</span>
              <span className={`w-[72px] shrink-0 text-center text-[7px] font-bold ${statusColor(deal.status)}`}>
                {deal.status.replace(/_/g, ' ')}
              </span>
              <span className="w-[60px] shrink-0 text-right text-white/30 text-[7px]">{fmtDate(deal.expectedClose)}</span>
              <span
                className={`flex-1 text-right font-bold ${wideSpread ? 'text-orange-400' : 'text-white/40'}`}
              >
                {fmtPct(deal.spreadToOffer)}
                {wideSpread && (
                  <span className="ml-1 text-[6px] text-orange-400/80 bg-orange-400/[0.08] px-0.5">WIDE</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
