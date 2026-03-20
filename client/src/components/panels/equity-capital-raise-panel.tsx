import { useEquityCapitalRaise } from '../../api/hooks/use-equity-capital-raise';
import { useT, tr, TFn } from '../../i18n';

// ── Types ──

interface RecentDeal {
  company: string;
  type: string;
  size: number | null;
  offerPrice: number | null;
  currentPrice: number | null;
  return: number | null;
  bookrunner: string | null;
  oversubscription: number | null;
}

interface PipelineDeal {
  company: string;
  type: string | null;
  expectedSize: number | null;
  expectedDate: string | null;
  status: string;
  sector: string | null;
  leadBookrunner: string | null;
}

interface MarketStats {
  ytdIpoCount: number | null;
  ytdIpoVolume: number | null;
  followOnVolume: number | null;
  avgFirstDayReturn: number | null;
  pipelineValue: number | null;
}

interface SectorRow {
  sector: string;
  dealCount: number | null;
  volume: number | null;
  avgReturn: number | null;
}

interface ApiData {
  recentDeals: RecentDeal[];
  pipeline: PipelineDeal[];
  marketStats: MarketStats;
  sectorBreakdown: SectorRow[];
  summary: Record<string, unknown>;
}

// ── Formatting helpers ──

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtDealSize(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + fmtCompact(n);
}

function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return '$' + n.toFixed(2);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtOversubscription(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'x';
}

// ── Color helpers ──

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Deal type badge ──

function dealTypeBadge(type: string): { text: string; bg: string } {
  switch (type.toLowerCase()) {
    case 'ipo':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' };
    case 'follow-on':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' };
    case 'secondary':
      return { text: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/20' };
    case 'block':
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/20' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/20' };
  }
}

// ── Pipeline status badge ──

function pipelineStatusBadge(status: string): { text: string; bg: string } {
  switch (status.toLowerCase()) {
    case 'filed':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/20' };
    case 'roadshow':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/20' };
    case 'priced':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' };
    case 'withdrawn':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/20' };
  }
}

// ── Main Panel ──

export function EquityCapitalRaisePanel() {
  const t = useT();
  const { data, isLoading, error } = useEquityCapitalRaise();
  const d = data as ApiData | undefined;

  if (isLoading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
          LOADING...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'ecrLoadFailed', 'FAILED TO LOAD')}
        </span>
      </div>
    );
  }

  const recentDeals: RecentDeal[] = d?.recentDeals ?? [];
  const pipeline: PipelineDeal[] = d?.pipeline ?? [];
  const marketStats: MarketStats | undefined = d?.marketStats;
  const sectorBreakdown: SectorRow[] = d?.sectorBreakdown ?? [];

  return (
    <div className="h-full bg-black text-[9px] font-mono overflow-y-auto">
      {/* ── Header ── */}
      <div className="px-3 py-1.5 border-b border-fuchsia-400/30 bg-black sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[10px] font-mono font-black text-fuchsia-400 uppercase tracking-wider">
            {tr(t, 'ecrTitle', 'Equity Capital Raise Tracker')}
          </span>
        </div>
      </div>

      {/* ── Market Stats Bar ── */}
      {marketStats && <MarketStatsBar stats={marketStats} t={t} />}

      {/* ── Recent Deals ── */}
      <SectionHeader title={tr(t, 'ecrRecentDeals', 'Recent Deals')} />
      <RecentDealsTable deals={recentDeals} t={t} />

      {/* ── Pipeline ── */}
      <SectionHeader title={tr(t, 'ecrPipeline', 'Pipeline')} />
      <PipelineTable deals={pipeline} t={t} />

      {/* ── Sector Breakdown ── */}
      <SectionHeader title={tr(t, 'ecrSectorBreakdown', 'Sector Breakdown')} />
      <SectorBreakdownGrid sectors={sectorBreakdown} t={t} />
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-1 bg-white/[0.02] border-b border-fuchsia-400/30">
      <span className="text-[8px] font-mono font-black text-fuchsia-400 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ── Market Stats Bar ──

function MarketStatsBar({
  stats,
  t,
}: {
  stats: MarketStats;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { label: tr(t, 'ecrYtdIpoCount', 'YTD IPOs'), value: String(stats.ytdIpoCount ?? '--') },
    { label: tr(t, 'ecrYtdIpoVolume', 'IPO Vol'), value: fmtDealSize(stats.ytdIpoVolume) },
    { label: tr(t, 'ecrFollowOnVol', 'Follow-On Vol'), value: fmtDealSize(stats.followOnVolume) },
    { label: tr(t, 'ecrAvgFirstDay', 'Avg 1st Day'), value: fmtPct(stats.avgFirstDayReturn), color: returnColor(stats.avgFirstDayReturn) },
    { label: tr(t, 'ecrPipelineVal', 'Pipeline Val'), value: fmtDealSize(stats.pipelineValue) },
  ];

  return (
    <div className="grid grid-cols-5 gap-px border-b border-fuchsia-400/30">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-2 py-1.5 bg-white/[0.01] hover:bg-fuchsia-400/[0.02] transition-colors"
        >
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">{item.label}</div>
          <div className={`text-[10px] font-bold tabular-nums ${item.color ?? 'text-fuchsia-400'}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recent Deals Table ──

function RecentDealsTable({
  deals,
  t,
}: {
  deals: RecentDeal[];
  t: ReturnType<typeof useT>;
}) {
  if (deals.length === 0) {
    return (
      <div className="px-3 py-4 text-[9px] font-mono text-neutral-500 uppercase tracking-widest text-center">
        {tr(t, 'ecrNoDeals', 'No recent deals')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-fuchsia-400/30">
            <th className="text-left px-2 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'company', 'Company')}
            </th>
            <th className="text-left px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrType', 'Type')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrSize', 'Size')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrOfferPx', 'Offer Px')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrCurrentPx', 'Cur Px')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrReturn', 'Return')}
            </th>
            <th className="text-left px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrBookrunner', 'Bookrunner')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrOversub', 'Oversub')}
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, i) => {
            const badge = dealTypeBadge(deal.type);
            return (
              <tr
                key={`${deal.company}-${i}`}
                className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-gray-300 truncate max-w-[130px]">
                  {deal.company}
                </td>
                <td className="px-1.5 py-1">
                  <span className={`px-1 py-px text-[7px] font-bold uppercase ${badge.text} ${badge.bg}`}>
                    {deal.type}
                  </span>
                </td>
                <td className="text-right px-1.5 py-1 text-gray-300 font-bold tabular-nums">
                  {fmtDealSize(deal.size)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral-400 tabular-nums">
                  {fmtPrice(deal.offerPrice)}
                </td>
                <td className="text-right px-1.5 py-1 text-gray-300 tabular-nums">
                  {fmtPrice(deal.currentPrice)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold tabular-nums ${returnColor(deal.return)}`}>
                  {fmtPct(deal.return)}
                </td>
                <td className="px-1.5 py-1 text-neutral-500 truncate max-w-[100px]">
                  {deal.bookrunner ?? '--'}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral-400 tabular-nums">
                  {fmtOversubscription(deal.oversubscription)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Pipeline Table ──

function PipelineTable({
  deals,
  t,
}: {
  deals: PipelineDeal[];
  t: ReturnType<typeof useT>;
}) {
  if (deals.length === 0) {
    return (
      <div className="px-3 py-4 text-[9px] font-mono text-neutral-500 uppercase tracking-widest text-center">
        {tr(t, 'ecrNoPipeline', 'No pipeline deals')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-fuchsia-400/30">
            <th className="text-left px-2 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'company', 'Company')}
            </th>
            <th className="text-left px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrType', 'Type')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrExpSize', 'Exp Size')}
            </th>
            <th className="text-right px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrExpDate', 'Exp Date')}
            </th>
            <th className="text-center px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'status', 'Status')}
            </th>
            <th className="text-left px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'sector', 'Sector')}
            </th>
            <th className="text-left px-1.5 py-1 text-neutral-500 uppercase tracking-wider font-medium">
              {tr(t, 'ecrLeadBook', 'Lead Book')}
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal, i) => {
            const badge = pipelineStatusBadge(deal.status);
            return (
              <tr
                key={`${deal.company}-${i}`}
                className="border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-gray-300 truncate max-w-[130px]">
                  {deal.company}
                </td>
                <td className="px-1.5 py-1 text-neutral-500">
                  {deal.type ?? '--'}
                </td>
                <td className="text-right px-1.5 py-1 text-gray-300 font-bold tabular-nums">
                  {fmtDealSize(deal.expectedSize)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral-500 whitespace-nowrap">
                  {fmtDate(deal.expectedDate)}
                </td>
                <td className="text-center px-1.5 py-1">
                  <span className={`px-1 py-px text-[7px] font-bold uppercase ${badge.text} ${badge.bg}`}>
                    {deal.status}
                  </span>
                </td>
                <td className="px-1.5 py-1 text-neutral-500 truncate max-w-[80px]">
                  {deal.sector ?? '--'}
                </td>
                <td className="px-1.5 py-1 text-neutral-500 truncate max-w-[100px]">
                  {deal.leadBookrunner ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Sector Breakdown Grid ──

function SectorBreakdownGrid({
  sectors,
  t,
}: {
  sectors: SectorRow[];
  t: ReturnType<typeof useT>;
}) {
  if (sectors.length === 0) {
    return (
      <div className="px-3 py-4 text-[9px] font-mono text-neutral-500 uppercase tracking-widest text-center">
        {tr(t, 'ecrNoSector', 'No sector data')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px p-2">
      {sectors.map((s) => (
        <div
          key={s.sector}
          className="px-2 py-1.5 bg-white/[0.01] border border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
        >
          <div className="text-[8px] font-bold text-fuchsia-400 uppercase tracking-wider mb-0.5">
            {s.sector}
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[7px] text-neutral-600 uppercase">{tr(t, 'ecrDeals', 'Deals')}</div>
              <div className="text-[9px] text-gray-300 font-bold tabular-nums">
                {s.dealCount ?? '--'}
              </div>
            </div>
            <div>
              <div className="text-[7px] text-neutral-600 uppercase">{tr(t, 'ecrVolume', 'Volume')}</div>
              <div className="text-[9px] text-gray-300 font-bold tabular-nums">
                {fmtDealSize(s.volume)}
              </div>
            </div>
            <div>
              <div className="text-[7px] text-neutral-600 uppercase">{tr(t, 'ecrAvgRtn', 'Avg Rtn')}</div>
              <div className={`text-[9px] font-bold tabular-nums ${returnColor(s.avgReturn)}`}>
                {fmtPct(s.avgReturn)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
