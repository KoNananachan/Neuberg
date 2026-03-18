import { useCrossBorderMa } from '../../api/hooks/use-cross-border-ma';
import { useT } from '../../i18n';

// ── Types (mirroring server response) ──

interface ActiveDeal {
  acquirer: string;
  acquirerCountry: string;
  target: string;
  targetCountry: string;
  sector: string;
  valueBn: number;
  premium: number;
  dealType: string;
  status: string;
  regulatoryRisk: string;
  expectedClose: string;
}

interface RegionalFlow {
  from: string;
  to: string;
  deals: number;
  valueBn: number;
  avgPremium: number;
  topSector: string;
  yoyChange: number;
}

interface RegulatoryItem {
  deal: string;
  jurisdiction: string;
  filingDate: string;
  expectedDecision: string;
  outcome: string;
  keyIssue: string;
}

interface Summary {
  totalDeals: number;
  totalValueBn: number;
  avgPremium: number;
  topCorridor: string;
  blockedCount: number;
}

interface CrossBorderMaResponse {
  summary: Summary;
  activeDeals: ActiveDeal[];
  regionalFlows: RegionalFlow[];
  regulatoryTracker: RegulatoryItem[];
}

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtB(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtYoy(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtDate(iso: string): string {
  if (!iso) return '--';
  return iso.slice(0, 10);
}

// ── Status color helpers ──

function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'text-green-400/80';
    case 'PENDING':
    case 'DUE_DILIGENCE':
      return 'text-yellow-400/80';
    case 'ANNOUNCED':
      return 'text-cyan-400/80';
    case 'REGULATORY_REVIEW':
      return 'text-orange-400/80';
    case 'HOSTILE':
      return 'text-red-400/80';
    case 'BLOCKED':
    case 'WITHDRAWN':
      return 'text-red-400';
    default:
      return 'text-white/40';
  }
}

function regulatoryRiskColor(risk: string): string {
  switch (risk) {
    case 'LOW':
      return 'bg-green-400/10 text-green-400';
    case 'MEDIUM':
      return 'bg-yellow-400/10 text-yellow-400';
    case 'HIGH':
      return 'bg-orange-400/10 text-orange-400';
    case 'CRITICAL':
      return 'bg-red-400/10 text-red-400';
    default:
      return 'bg-white/5 text-white/50';
  }
}

function outcomeColor(outcome: string): string {
  switch (outcome) {
    case 'APPROVED':
    case 'CLEARED':
      return 'text-green-400/80';
    case 'APPROVED_WITH_CONDITIONS':
    case 'CONDITIONS':
      return 'text-yellow-400/80';
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'text-orange-400/80';
    case 'BLOCKED':
    case 'REJECTED':
      return 'text-red-400';
    default:
      return 'text-white/40';
  }
}

// ── Main Panel ──

export function CrossBorderMaPanel() {
  const t = useT();
  const { data, isLoading } = useCrossBorderMa();

  const ma = data as CrossBorderMaResponse | undefined;

  // Loading state
  if (isLoading && !ma) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-orange-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  // Error / no data state
  if (!ma?.activeDeals) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'cbmaNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  const summary = ma.summary;

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-5 gap-px bg-orange-400/[0.06] mb-1">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL DEALS</div>
          <div className="text-[11px] font-black text-orange-400">{summary.totalDeals}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOTAL VALUE ($B)</div>
          <div className="text-[11px] font-black text-orange-400">${fmtB(summary.totalValueBn)}B</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG PREMIUM</div>
          <div className="text-[11px] font-black text-white/60">{fmtPct(summary.avgPremium)}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOP CORRIDOR</div>
          <div className="text-[11px] font-black text-orange-400 truncate">{summary.topCorridor}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">BLOCKED</div>
          <div className={`text-[11px] font-black ${summary.blockedCount > 0 ? 'text-red-400' : 'text-white/40'}`}>
            {summary.blockedCount}
          </div>
        </div>
      </div>

      {/* ── Active Deals ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            ACTIVE DEALS
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[100px] shrink-0">ACQUIRER</span>
          <span className="w-[100px] shrink-0">TARGET</span>
          <span className="w-[60px] shrink-0">SECTOR</span>
          <span className="w-[48px] shrink-0 text-right">VALUE $B</span>
          <span className="w-[44px] shrink-0 text-right">PREM %</span>
          <span className="w-[40px] shrink-0 text-center">TYPE</span>
          <span className="w-[64px] shrink-0 text-center">STATUS</span>
          <span className="w-[56px] shrink-0 text-center">REG RISK</span>
          <span className="flex-1 text-right">EXP CLOSE</span>
        </div>

        {/* Rows */}
        {ma.activeDeals.map((deal, i) => (
          <div
            key={`${deal.acquirer}-${deal.target}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[100px] shrink-0 text-white/50 truncate text-[7px]">
              {deal.acquirer}
              <span className="text-white/20 ml-0.5">({deal.acquirerCountry})</span>
            </span>
            <span className="w-[100px] shrink-0 text-[8px] font-bold text-orange-400 truncate">
              {deal.target}
              <span className="text-orange-400/40 font-normal ml-0.5">({deal.targetCountry})</span>
            </span>
            <span className="w-[60px] shrink-0 text-white/30 truncate text-[7px]">{deal.sector}</span>
            <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(deal.valueBn)}</span>
            <span className="w-[44px] shrink-0 text-right text-green-400/70">{fmtPct(deal.premium)}</span>
            <span className="w-[40px] shrink-0 text-center text-white/30 text-[7px]">{deal.dealType}</span>
            <span className={`w-[64px] shrink-0 text-center text-[7px] font-bold ${statusColor(deal.status)}`}>
              {deal.status.replace(/_/g, ' ')}
            </span>
            <span className="w-[56px] shrink-0 text-center">
              <span className={`px-1 py-[1px] text-[6px] font-bold uppercase ${regulatoryRiskColor(deal.regulatoryRisk)}`}>
                {deal.regulatoryRisk}
              </span>
            </span>
            <span className="flex-1 text-right text-white/30 text-[7px]">{fmtDate(deal.expectedClose)}</span>
          </div>
        ))}
      </div>

      {/* ── Regional Flow ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            REGIONAL FLOW
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[64px] shrink-0">FROM</span>
          <span className="w-[64px] shrink-0">TO</span>
          <span className="w-[36px] shrink-0 text-right">DEALS</span>
          <span className="w-[48px] shrink-0 text-right">VALUE $B</span>
          <span className="w-[48px] shrink-0 text-right">AVG PREM</span>
          <span className="w-[64px] shrink-0">TOP SECTOR</span>
          <span className="flex-1 text-right">YOY CHG</span>
        </div>

        {/* Rows */}
        {ma.regionalFlows.map((flow, i) => (
          <div
            key={`${flow.from}-${flow.to}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[64px] shrink-0 text-[8px] font-bold text-orange-400">{flow.from}</span>
            <span className="w-[64px] shrink-0 text-white/50 text-[7px]">{flow.to}</span>
            <span className="w-[36px] shrink-0 text-right text-white/60">{flow.deals}</span>
            <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(flow.valueBn)}</span>
            <span className="w-[48px] shrink-0 text-right text-green-400/70">{fmtPct(flow.avgPremium)}</span>
            <span className="w-[64px] shrink-0 text-white/30 truncate text-[7px]">{flow.topSector}</span>
            <span
              className={`flex-1 text-right font-bold ${flow.yoyChange >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}
            >
              {fmtYoy(flow.yoyChange)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Regulatory Tracker ── */}
      <div>
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-orange-400/60 uppercase tracking-wider font-bold">
            REGULATORY TRACKER
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[100px] shrink-0">DEAL</span>
          <span className="w-[72px] shrink-0">JURISDICTION</span>
          <span className="w-[60px] shrink-0">FILING DATE</span>
          <span className="w-[60px] shrink-0">EXP DECISION</span>
          <span className="w-[64px] shrink-0 text-center">OUTCOME</span>
          <span className="flex-1">KEY ISSUE</span>
        </div>

        {/* Rows */}
        {ma.regulatoryTracker.map((item, i) => (
          <div
            key={`${item.deal}-${item.jurisdiction}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-orange-400/[0.02] transition-colors"
          >
            <span className="w-[100px] shrink-0 text-[8px] font-bold text-orange-400 truncate">{item.deal}</span>
            <span className="w-[72px] shrink-0 text-white/50 text-[7px]">{item.jurisdiction}</span>
            <span className="w-[60px] shrink-0 text-white/30 text-[7px]">{fmtDate(item.filingDate)}</span>
            <span className="w-[60px] shrink-0 text-white/30 text-[7px]">{fmtDate(item.expectedDecision)}</span>
            <span className={`w-[64px] shrink-0 text-center text-[7px] font-bold ${outcomeColor(item.outcome)}`}>
              {item.outcome.replace(/_/g, ' ')}
            </span>
            <span className="flex-1 text-white/40 truncate">{item.keyIssue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
