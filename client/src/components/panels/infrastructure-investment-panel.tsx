import { useInfrastructureInvestment } from '../../api/hooks/use-infrastructure-investment';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const TEAL = '#2dd4bf';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const BLUE = '#60a5fa';

// ── Formatting helpers ──

function fmtBn(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  return (n * 1_000).toFixed(0) + 'M';
}

function fmtUsd(n: number): string {
  return '$' + fmtBn(n);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function changeClass(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Sector color map ──

const SECTOR_COLORS: Record<string, { color: string; bg: string }> = {
  transport:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  energy:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  water:      { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  digital:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  social:     { color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  healthcare: { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  defense:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

function sectorStyle(sector: string): { color: string; bg: string } {
  const key = sector.toLowerCase();
  return SECTOR_COLORS[key] ?? { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)' };
}

// ── Status badge helper ──

function statusBadge(status: string): { text: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'operational') return { text: status.toUpperCase(), color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (s === 'under construction' || s === 'in progress' || s === 'construction') return { text: status.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.10)' };
  if (s === 'planning' || s === 'proposed') return { text: status.toUpperCase(), color: BLUE, bg: 'rgba(96,165,250,0.10)' };
  if (s === 'delayed' || s === 'stalled') return { text: status.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.12)' };
  if (s === 'approved') return { text: status.toUpperCase(), color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' };
  return { text: status.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

// ── Stage badge helper ──

function stageBadge(stage: string): { text: string; color: string; bg: string } {
  const s = stage.toLowerCase();
  if (s === 'awarded' || s === 'closed') return { text: stage.toUpperCase(), color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (s === 'bidding' || s === 'tendering') return { text: stage.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.10)' };
  if (s === 'pre-qualification' || s === 'shortlisted') return { text: stage.toUpperCase(), color: BLUE, bg: 'rgba(96,165,250,0.10)' };
  if (s === 'cancelled') return { text: stage.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: stage.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

// ── Outlook badge helper ──

function outlookBadge(outlook: string): { text: string; color: string; bg: string } {
  const o = outlook.toLowerCase();
  if (o === 'positive' || o === 'strong') return { text: outlook.toUpperCase(), color: GREEN, bg: 'rgba(52,211,153,0.12)' };
  if (o === 'stable' || o === 'moderate') return { text: outlook.toUpperCase(), color: YELLOW, bg: 'rgba(251,191,36,0.10)' };
  if (o === 'negative' || o === 'weak') return { text: outlook.toUpperCase(), color: RED, bg: 'rgba(248,113,113,0.12)' };
  return { text: outlook.toUpperCase(), color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
}

// ── Main Panel ──

export function InfrastructureInvestmentPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInfrastructureInvestment();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-teal-400">
            {tr(t, 'panelInfrastructureInvestment', 'Infrastructure Investment')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                LOADING INFRASTRUCTURE DATA...
              </span>
            </div>
          </div>
        )}

        {!data && !isLoading && (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Summary Bar */}
            <SummaryBar data={data} t={t} />

            {/* Major Projects Table */}
            <MajorProjectsTable projects={data.majorProjects} t={t} />

            {/* Sector Spending Breakdown */}
            <SectorSpendingSection sectors={data.sectorSpending} t={t} />

            {/* Regional Breakdown */}
            <RegionalBreakdownGrid regions={data.regionalBreakdown} t={t} />

            {/* Infrastructure ETFs */}
            <InfrastructureEtfsSection etfs={data.etfs} t={t} />

            {/* Construction Activity */}
            <ConstructionActivitySection metrics={data.constructionActivity} t={t} />

            {/* PPP Deals */}
            <PppDealsSection deals={data.pppDeals} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  data,
  t,
}: {
  data: {
    summary: { totalGlobalSpending: number; yoyGrowth: number };
  };
  t: ReturnType<typeof useT>;
}) {
  const { totalGlobalSpending, yoyGrowth } = data.summary;

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20 bg-teal-400/[0.02]">
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] text-white/30 uppercase tracking-wider">
          {tr(t, 'iiGlobalSpending', 'Global Infra Spending')}
        </span>
        <span className="text-[10px] font-bold text-white">{fmtUsd(totalGlobalSpending)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] text-white/30 uppercase tracking-wider">
          {tr(t, 'iiYoyGrowth', 'YoY Growth')}
        </span>
        <span className={`text-[10px] font-bold ${changeClass(yoyGrowth)}`}>
          {fmtPct(yoyGrowth)}
        </span>
      </div>
    </div>
  );
}

// ── Major Projects Table ──

interface MajorProject {
  name: string;
  country: string;
  sector: string;
  investmentAmount: number;
  completionYear: number;
  status: string;
  fundingType: string;
}

function MajorProjectsTable({
  projects,
  t,
}: {
  projects: MajorProject[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiMajorProjects', 'Major Projects')}
        </span>
      </div>
      {/* Table header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="flex-[2] min-w-0">Project</span>
        <span className="w-14 shrink-0 text-center">Country</span>
        <span className="w-14 shrink-0 text-center">Sector</span>
        <span className="w-14 shrink-0 text-right">Investment</span>
        <span className="w-10 shrink-0 text-right">Year</span>
        <span className="w-20 shrink-0 text-center">Status</span>
        <span className="w-16 shrink-0 text-center">Funding</span>
      </div>
      {/* Table body */}
      {projects.map((project, i) => {
        const sector = sectorStyle(project.sector);
        const status = statusBadge(project.status);
        return (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-teal-400/[0.02] transition-colors"
          >
            <span className="flex-[2] min-w-0 text-[8px] font-bold text-white/70 truncate">
              {project.name}
            </span>
            <span className="w-14 shrink-0 text-center text-[7px] text-white/40">
              {project.country}
            </span>
            <span className="w-14 shrink-0 flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-px"
                style={{ color: sector.color, backgroundColor: sector.bg }}
              >
                {project.sector}
              </span>
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/60">
              {fmtUsd(project.investmentAmount)}
            </span>
            <span className="w-10 shrink-0 text-right text-[7px] text-white/40">
              {project.completionYear}
            </span>
            <span className="w-20 shrink-0 flex justify-center">
              <span
                className="text-[5px] font-black uppercase px-1 py-px"
                style={{ color: status.color, backgroundColor: status.bg }}
              >
                {status.text}
              </span>
            </span>
            <span className="w-16 shrink-0 text-center text-[7px] text-white/40 uppercase">
              {project.fundingType}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sector Spending Breakdown ──

interface SectorSpending {
  sector: string;
  annualSpending: number;
  growthPct: number;
  publicSharePct: number;
  privateSharePct: number;
}

function SectorSpendingSection({
  sectors,
  t,
}: {
  sectors: SectorSpending[];
  t: ReturnType<typeof useT>;
}) {
  const maxSpending = Math.max(...sectors.map((s) => s.annualSpending), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiSectorSpending', 'Sector Spending Breakdown')}
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="w-16 shrink-0">Sector</span>
        <span className="flex-1" />
        <span className="w-14 shrink-0 text-right">Annual</span>
        <span className="w-12 shrink-0 text-right">Growth</span>
        <span className="w-12 shrink-0 text-right">Public</span>
        <span className="w-12 shrink-0 text-right">Private</span>
      </div>
      {sectors.map((sector, i) => {
        const style = sectorStyle(sector.sector);
        const barWidth = (sector.annualSpending / maxSpending) * 100;
        return (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-teal-400/[0.02] transition-colors"
          >
            <span className="w-16 shrink-0">
              <span
                className="text-[6px] font-black uppercase px-1 py-px"
                style={{ color: style.color, backgroundColor: style.bg }}
              >
                {sector.sector}
              </span>
            </span>
            <div className="flex-1 h-1.5 bg-white/[0.03] mx-1 overflow-hidden">
              <div
                className="h-full"
                style={{ width: `${barWidth}%`, backgroundColor: style.color, opacity: 0.4 }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/60">
              {fmtUsd(sector.annualSpending)}
            </span>
            <span className={`w-12 shrink-0 text-right text-[8px] font-bold ${changeClass(sector.growthPct)}`}>
              {fmtPct(sector.growthPct)}
            </span>
            <span className="w-12 shrink-0 text-right text-[7px] text-white/40">
              {sector.publicSharePct.toFixed(0)}%
            </span>
            <span className="w-12 shrink-0 text-right text-[7px] text-white/40">
              {sector.privateSharePct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Regional Breakdown Grid ──

interface RegionalBreakdown {
  region: string;
  totalInvestment: number;
  topSector: string;
  outlook: string;
}

function RegionalBreakdownGrid({
  regions,
  t,
}: {
  regions: RegionalBreakdown[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiRegionalBreakdown', 'Regional Breakdown')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {regions.map((region, i) => {
          const outlook = outlookBadge(region.outlook);
          const topSectorStyle = sectorStyle(region.topSector);
          return (
            <div
              key={i}
              className="bg-black px-2 py-1.5 hover:bg-teal-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-bold text-white/70 uppercase">{region.region}</span>
                <span
                  className="text-[5px] font-black uppercase px-1 py-px"
                  style={{ color: outlook.color, backgroundColor: outlook.bg }}
                >
                  {outlook.text}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white">{fmtUsd(region.totalInvestment)}</span>
                <span
                  className="text-[6px] font-black uppercase px-1 py-px"
                  style={{ color: topSectorStyle.color, backgroundColor: topSectorStyle.bg }}
                >
                  {region.topSector}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Infrastructure ETFs Section ──

interface InfrastructureEtf {
  ticker: string;
  price: number;
  changePct: number;
  ytdReturn: number;
  aum: number;
  expenseRatio: number;
}

function InfrastructureEtfsSection({
  etfs,
  t,
}: {
  etfs: InfrastructureEtf[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiInfraEtfs', 'Infrastructure ETFs')}
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="w-12 shrink-0">Ticker</span>
        <span className="w-14 shrink-0 text-right">Price</span>
        <span className="w-12 shrink-0 text-right">Chg%</span>
        <span className="w-12 shrink-0 text-right">YTD</span>
        <span className="flex-1 text-right">AUM</span>
        <span className="w-12 shrink-0 text-right">ER</span>
      </div>
      {etfs.map((etf, i) => (
        <div
          key={i}
          className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-teal-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[8px] font-bold" style={{ color: TEAL }}>
            {etf.ticker}
          </span>
          <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/60">
            ${fmtPrice(etf.price)}
          </span>
          <span className={`w-12 shrink-0 text-right text-[8px] font-bold ${changeClass(etf.changePct)}`}>
            {fmtPct(etf.changePct)}
          </span>
          <span className={`w-12 shrink-0 text-right text-[8px] font-bold ${changeClass(etf.ytdReturn)}`}>
            {fmtPct(etf.ytdReturn)}
          </span>
          <span className="flex-1 text-right text-[7px] text-white/40">
            {fmtUsd(etf.aum)}
          </span>
          <span className="w-12 shrink-0 text-right text-[7px] text-white/40">
            {etf.expenseRatio.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Construction Activity Metrics ──

interface ConstructionActivity {
  housingStarts: number;
  housingStartsChange: number;
  buildingPermits: number;
  buildingPermitsChange: number;
  totalSpending: number;
  totalSpendingChange: number;
  materialCosts: number;
  materialCostsChange: number;
}

function ConstructionActivitySection({
  metrics,
  t,
}: {
  metrics: ConstructionActivity;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    {
      label: tr(t, 'iiHousingStarts', 'Housing Starts'),
      value: (metrics.housingStarts / 1000).toFixed(0) + 'K',
      change: metrics.housingStartsChange,
    },
    {
      label: tr(t, 'iiBuildingPermits', 'Building Permits'),
      value: (metrics.buildingPermits / 1000).toFixed(0) + 'K',
      change: metrics.buildingPermitsChange,
    },
    {
      label: tr(t, 'iiTotalSpending', 'Total Spending'),
      value: fmtUsd(metrics.totalSpending),
      change: metrics.totalSpendingChange,
    },
    {
      label: tr(t, 'iiMaterialCosts', 'Material Costs Index'),
      value: metrics.materialCosts.toFixed(1),
      change: metrics.materialCostsChange,
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiConstructionActivity', 'Construction Activity')}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {items.map((item, i) => (
          <div key={i} className="bg-black px-2 py-1.5 hover:bg-teal-400/[0.02] transition-colors">
            <div className="text-[6px] text-white/25 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className="text-[10px] font-bold text-white">{item.value}</div>
            <div className={`text-[8px] font-bold ${changeClass(item.change)}`}>
              {fmtPct(item.change)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PPP Deals Section ──

interface PppDeal {
  project: string;
  country: string;
  value: number;
  sector: string;
  stage: string;
}

function PppDealsSection({
  deals,
  t,
}: {
  deals: PppDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'iiPppDeals', 'PPP Deals')}
        </span>
      </div>
      {/* Header */}
      <div className="flex items-center px-2 py-0.5 border-b border-border/10 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="flex-[2] min-w-0">Project</span>
        <span className="w-14 shrink-0 text-center">Country</span>
        <span className="w-14 shrink-0 text-right">Value</span>
        <span className="w-14 shrink-0 text-center">Sector</span>
        <span className="w-18 shrink-0 text-center">Stage</span>
      </div>
      {deals.map((deal, i) => {
        const sector = sectorStyle(deal.sector);
        const stage = stageBadge(deal.stage);
        return (
          <div
            key={i}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-teal-400/[0.02] transition-colors"
          >
            <span className="flex-[2] min-w-0 text-[8px] font-bold text-white/70 truncate">
              {deal.project}
            </span>
            <span className="w-14 shrink-0 text-center text-[7px] text-white/40">
              {deal.country}
            </span>
            <span className="w-14 shrink-0 text-right text-[8px] font-bold text-white/60">
              {fmtUsd(deal.value)}
            </span>
            <span className="w-14 shrink-0 flex justify-center">
              <span
                className="text-[6px] font-black uppercase px-1 py-px"
                style={{ color: sector.color, backgroundColor: sector.bg }}
              >
                {deal.sector}
              </span>
            </span>
            <span className="w-18 shrink-0 flex justify-center">
              <span
                className="text-[5px] font-black uppercase px-1 py-px"
                style={{ color: stage.color, backgroundColor: stage.bg }}
              >
                {stage.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
