import { usePrivateEquity } from '../../api/hooks/use-private-equity';
import { useT } from '../../i18n';

// ── Types (mirroring server response) ──

interface Deal {
  sponsor: string;
  target: string;
  sector: string;
  dealValue: number;
  evEbitda: number;
  debtEbitda: number;
  equityCheck: number;
  status: string;
  date: string;
}

interface FundraisingEntry {
  firm: string;
  fundName: string;
  vintage: number;
  target: number;
  closed: number;
  strategy: string;
  date: string;
}

interface DryPowderEntry {
  strategy: string;
  available: number;
  deployed1Y: number;
  ratio: number;
}

interface Summary {
  totalDealVolume: number;
  avgMultiple: number;
  dryPowderTotal: number;
  topSector: string;
  ytdFundraising: number;
  timestamp: string;
}

interface PrivateEquityResponse {
  recentDeals: Deal[];
  fundraising: FundraisingEntry[];
  dryPowder: DryPowderEntry[];
  summary: Summary;
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

function fmtX(n: number): string {
  return n.toFixed(1) + 'x';
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(0) + '%';
}

// ── Status color helper ──

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'closed':
      return 'bg-green-500/15 text-green-400';
    case 'signed':
      return 'bg-fuchsia-500/15 text-fuchsia-400';
    case 'announced':
      return 'bg-yellow-500/15 text-yellow-400';
    case 'rumored':
      return 'bg-white/10 text-white/50';
    case 'in progress':
      return 'bg-blue-500/15 text-blue-400';
    default:
      return 'bg-white/10 text-white/40';
  }
}

// ── Main Panel ──

export function PrivateEquityPanel() {
  const t = useT();
  const { data, isLoading } = usePrivateEquity();

  const pe = data as PrivateEquityResponse | undefined;

  // Loading state
  if (isLoading && !pe) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-fuchsia-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  // Error / no data state
  if (!pe?.recentDeals) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'peNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  const summary = pe.summary;

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-5 gap-px bg-fuchsia-400/[0.06] mb-1">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">DEAL VOLUME</div>
          <div className="text-[11px] font-black text-fuchsia-400">${fmtB(summary.totalDealVolume)}B</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">AVG MULTIPLE</div>
          <div className="text-[11px] font-black text-fuchsia-400">{fmtX(summary.avgMultiple)}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">DRY POWDER</div>
          <div className="text-[11px] font-black text-white/60">${fmtB(summary.dryPowderTotal)}B</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">TOP SECTOR</div>
          <div className="text-[11px] font-black text-white/60 truncate">{summary.topSector}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">YTD FUNDRAISING</div>
          <div className="text-[11px] font-black text-fuchsia-400">${fmtB(summary.ytdFundraising)}B</div>
        </div>
      </div>

      {/* ── Recent Deals ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-fuchsia-400/60 uppercase tracking-wider font-bold">
            RECENT DEALS
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[72px] shrink-0">SPONSOR</span>
          <span className="w-[80px] shrink-0">TARGET</span>
          <span className="w-[64px] shrink-0">SECTOR</span>
          <span className="w-[48px] shrink-0 text-right">VAL $B</span>
          <span className="w-[48px] shrink-0 text-right">EV/EBITDA</span>
          <span className="w-[48px] shrink-0 text-right">D/EBITDA</span>
          <span className="w-[48px] shrink-0 text-right">EQ CHK $B</span>
          <span className="w-[52px] shrink-0 text-center">STATUS</span>
          <span className="flex-1 text-right">DATE</span>
        </div>

        {/* Rows */}
        {pe.recentDeals.map((d, i) => (
          <div
            key={`${d.sponsor}-${d.target}-${i}`}
            className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-fuchsia-400/[0.02] transition-colors"
          >
            <span className="w-[72px] shrink-0 text-[8px] font-bold text-fuchsia-400 truncate">{d.sponsor}</span>
            <span className="w-[80px] shrink-0 text-white/40 truncate">{d.target}</span>
            <span className="w-[64px] shrink-0 text-white/30 truncate text-[7px]">{d.sector}</span>
            <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(d.dealValue)}</span>
            <span className="w-[48px] shrink-0 text-right text-fuchsia-400/80">{fmtX(d.evEbitda)}</span>
            <span className="w-[48px] shrink-0 text-right text-white/50">{fmtX(d.debtEbitda)}</span>
            <span className="w-[48px] shrink-0 text-right text-white/40">{fmtB(d.equityCheck)}</span>
            <span className="w-[52px] shrink-0 text-center">
              <span className={`text-[6px] font-bold px-1 py-0 ${statusColor(d.status)}`}>
                {d.status.toUpperCase()}
              </span>
            </span>
            <span className="flex-1 text-right text-white/30 text-[7px]">{fmtDate(d.date)}</span>
          </div>
        ))}
      </div>

      {/* ── Fundraising ── */}
      <div className="mb-1">
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-fuchsia-400/60 uppercase tracking-wider font-bold">
            FUNDRAISING
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[72px] shrink-0">FIRM</span>
          <span className="w-[96px] shrink-0">FUND NAME</span>
          <span className="w-[36px] shrink-0 text-right">VNTG</span>
          <span className="w-[48px] shrink-0 text-right">TGT $B</span>
          <span className="w-[48px] shrink-0 text-right">CLS $B</span>
          <span className="w-[64px] shrink-0 text-center">STRATEGY</span>
          <span className="flex-1 text-right">DATE</span>
        </div>

        {/* Rows */}
        {pe.fundraising.map((f, i) => {
          const closePct = f.target > 0 ? f.closed / f.target : 0;
          return (
            <div
              key={`${f.firm}-${f.fundName}-${i}`}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-fuchsia-400/[0.02] transition-colors"
            >
              <span className="w-[72px] shrink-0 text-[8px] font-bold text-fuchsia-400 truncate">{f.firm}</span>
              <span className="w-[96px] shrink-0 text-white/40 truncate">{f.fundName}</span>
              <span className="w-[36px] shrink-0 text-right text-white/50">{f.vintage}</span>
              <span className="w-[48px] shrink-0 text-right text-white/60">{fmtB(f.target)}</span>
              <span className="w-[48px] shrink-0 text-right text-white/60">
                {fmtB(f.closed)}
                <span className="text-[6px] text-white/20 ml-0.5">{fmtPct(closePct)}</span>
              </span>
              <span className="w-[64px] shrink-0 text-center text-[7px] text-white/30">{f.strategy}</span>
              <span className="flex-1 text-right text-white/30 text-[7px]">{fmtDate(f.date)}</span>
            </div>
          );
        })}
      </div>

      {/* ── Dry Powder ── */}
      <div>
        <div className="px-1 py-1 border-b border-border/20">
          <span className="text-[7px] text-fuchsia-400/60 uppercase tracking-wider font-bold">
            DRY POWDER BY STRATEGY
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
          <span className="w-[88px] shrink-0">STRATEGY</span>
          <span className="w-[56px] shrink-0 text-right">AVAIL $B</span>
          <span className="w-[56px] shrink-0 text-right">DEPL 1Y $B</span>
          <span className="flex-1 pl-3">RATIO</span>
        </div>

        {/* Rows */}
        {pe.dryPowder.map((dp) => {
          const barWidth = Math.min(dp.ratio * 100, 100);
          const barColor =
            dp.ratio >= 0.7
              ? 'bg-fuchsia-400/60'
              : dp.ratio >= 0.4
                ? 'bg-yellow-400/60'
                : 'bg-red-400/60';
          return (
            <div
              key={dp.strategy}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-fuchsia-400/[0.02] transition-colors"
            >
              <span className="w-[88px] shrink-0 text-[8px] font-bold text-white/60 truncate">{dp.strategy}</span>
              <span className="w-[56px] shrink-0 text-right text-fuchsia-400">{fmtB(dp.available)}</span>
              <span className="w-[56px] shrink-0 text-right text-white/50">{fmtB(dp.deployed1Y)}</span>
              <span className="flex-1 pl-3 flex items-center gap-1">
                <span className="w-[60px] h-[4px] bg-white/[0.06] relative overflow-hidden">
                  <span
                    className={`absolute inset-y-0 left-0 ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </span>
                <span className="text-white/40 text-[7px] w-[28px]">{fmtPct(dp.ratio)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
