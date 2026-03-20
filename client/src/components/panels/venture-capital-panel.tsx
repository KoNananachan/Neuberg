import { useVentureCapital } from '../../api/hooks/use-venture-capital';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtM(n: number): string {
  return '$' + n.toFixed(0) + 'M';
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e3) return fmtB(n / 1e3);
  return fmtM(n);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function fmtX(n: number): string {
  return n.toFixed(1) + 'x';
}

function fmtDate(d: string | null): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-white/40';
}

function returnMultipleColor(n: number): string {
  if (n >= 10) return 'text-green-400';
  if (n >= 5) return 'text-teal-400';
  if (n >= 2) return 'text-yellow-400';
  if (n >= 1) return 'text-white/60';
  return 'text-red-400';
}

function valuationSizeClass(v: number): string {
  if (v >= 10) return 'text-[10px] font-black text-purple-400';
  if (v >= 5) return 'text-[9px] font-bold text-purple-400';
  return 'text-[8px] font-bold text-purple-400/70';
}

// -- Section header --

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-[#030303]">
      <div className="w-[2px] h-3 bg-purple-400" />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
        {title}
      </span>
    </div>
  );
}

// -- Badge helpers --

function exitTypeBadge(type: string | null): { label: string; cls: string } {
  switch (type?.toUpperCase()) {
    case 'IPO':
      return { label: 'IPO', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
    case 'M&A':
    case 'MA':
    case 'ACQUISITION':
      return { label: 'M&A', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'SPAC':
      return { label: 'SPAC', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    default:
      return { label: type?.toUpperCase() ?? '--', cls: 'text-white/40 bg-white/5 border-border/20' };
  }
}

function statusBadge(status: string | null): { label: string; cls: string } {
  switch (status?.toLowerCase()) {
    case 'private':
      return { label: 'PRIVATE', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    case 'pre-ipo':
    case 'preipo':
      return { label: 'PRE-IPO', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
    case 'spac':
      return { label: 'SPAC', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    default:
      return { label: status?.toUpperCase() ?? '--', cls: 'text-white/40 bg-white/5 border-border/20' };
  }
}

function sectorBadge(sector: string | null): string {
  return sector?.toUpperCase() ?? '--';
}

// -- Main Panel --

export function VentureCapitalPanel() {
  const t = useT();
  const { data, isLoading, error } = useVentureCapital();
  const d = data as any;

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-purple-400/40 uppercase tracking-widest animate-pulse">
          LOADING VENTURE CAPITAL DATA...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
          FAILED TO LOAD VENTURE CAPITAL DATA
        </span>
      </div>
    );
  }

  const overview = d?.overview ?? d?.fundingOverview ?? d?.summary ?? null;
  const dealsByStage = d?.dealsByStage ?? d?.stageBreakdown ?? d?.stages ?? [];
  const topDeals = d?.topDeals ?? d?.deals ?? d?.recentDeals ?? [];
  const sectorBreakdown = d?.sectorBreakdown ?? d?.sectors ?? [];
  const unicorns = d?.unicornTracker ?? d?.unicorns ?? [];
  const recentExits = d?.recentExits ?? d?.exits ?? [];
  const vcFirmActivity = d?.vcFirmActivity ?? d?.firms ?? d?.vcFirms ?? [];
  const quarterlyTrend = d?.quarterlyTrend ?? d?.quarterly ?? d?.trend ?? [];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="w-[3px] h-4 bg-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-tighter text-purple-400">
          {tr(t, 'panelVentureCapital', 'VENTURE CAPITAL')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 1. Funding Overview Banner */}
        <FundingOverviewSection overview={overview} />

        {/* 2. Deals by Stage */}
        {dealsByStage.length > 0 && <DealsByStageSection stages={dealsByStage} />}

        {/* 3. Top Deals Table */}
        {topDeals.length > 0 && <TopDealsSection deals={topDeals} />}

        {/* 4. Sector Breakdown */}
        {sectorBreakdown.length > 0 && <SectorBreakdownSection sectors={sectorBreakdown} />}

        {/* 5. Unicorn Tracker */}
        {unicorns.length > 0 && <UnicornTrackerSection unicorns={unicorns} />}

        {/* 6. Recent Exits */}
        {recentExits.length > 0 && <RecentExitsSection exits={recentExits} />}

        {/* 7. VC Firm Activity */}
        {vcFirmActivity.length > 0 && <VCFirmActivitySection firms={vcFirmActivity} />}

        {/* 8. Quarterly Trend */}
        {quarterlyTrend.length > 0 && <QuarterlyTrendSection quarters={quarterlyTrend} />}
      </div>
    </div>
  );
}

// -- 1. Funding Overview Banner --

function FundingOverviewSection({ overview }: { overview: any }) {
  const stats = [
    {
      label: 'TOTAL DEALS',
      value: overview?.totalDeals ?? overview?.deals ?? '--',
      accent: false,
    },
    {
      label: 'TOTAL VALUE',
      value: overview?.totalValue != null ? fmtB(overview.totalValue) : '--',
      accent: true,
    },
    {
      label: 'AVG DEAL SIZE',
      value: overview?.avgDealSize != null ? fmtM(overview.avgDealSize) : '--',
      accent: true,
    },
    {
      label: 'QOQ CHANGE',
      value: overview?.qoqChange != null ? fmtPct(overview.qoqChange) : '--',
      accent: false,
      color: overview?.qoqChange != null ? changeColor(overview.qoqChange) : undefined,
    },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Funding Overview" />
      <div className="grid grid-cols-4 gap-px bg-purple-400/[0.06]">
        {stats.map((s) => (
          <div key={s.label} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">{s.label}</div>
            <div
              className={`text-[11px] font-black ${
                s.color ? s.color : s.accent ? 'text-purple-400' : 'text-white/60'
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- 2. Deals by Stage --

function DealsByStageSection({ stages }: { stages: any[] }) {
  const maxValue = Math.max(...stages.map((s: any) => s.totalValue ?? s.value ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Deals by Stage" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_44px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">STAGE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DEALS</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">TOTAL</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right pr-2">AVG SIZE</span>
      </div>

      {stages.map((s: any, i: number) => {
        const val = s.totalValue ?? s.value ?? 0;
        const barWidth = Math.min((val / maxValue) * 100, 100);

        return (
          <div
            key={s.stage ?? s.name ?? i}
            className="grid grid-cols-[1fr_44px_56px_1fr] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[8px] font-bold text-white truncate uppercase">
                {s.stage ?? s.name}
              </span>
              <div className="w-full h-[2px] bg-white/[0.04]">
                <div
                  className="h-full bg-purple-400/40"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] text-white/50 text-right">
              {s.dealCount ?? s.deals ?? s.count ?? '--'}
            </span>
            <span className="text-[8px] font-bold text-purple-400 text-right">
              {val > 0 ? (val >= 1000 ? fmtB(val / 1000) : fmtM(val)) : '--'}
            </span>
            <span className="text-[8px] text-white/40 text-right pr-2">
              {s.avgDealSize != null ? fmtM(s.avgDealSize) : s.avgSize != null ? fmtM(s.avgSize) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- 3. Top Deals Table --

function TopDealsSection({ deals }: { deals: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Top Deals" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_44px_56px_56px_80px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">COMPANY</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider">SECTOR</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider">STAGE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">AMOUNT</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">VALUATION</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider">LEAD</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right pr-2">DATE</span>
      </div>

      {deals.map((d: any, i: number) => (
        <div
          key={d.company ?? d.name ?? i}
          className="grid grid-cols-[1fr_52px_44px_56px_56px_80px_52px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-purple-400 truncate">
            {d.company ?? d.name}
          </span>
          <span className="text-[7px] px-1 py-0.5 bg-white/[0.04] border border-border/20 text-white/50 truncate uppercase">
            {sectorBadge(d.sector)}
          </span>
          <span className="text-[8px] text-white/40 uppercase truncate">
            {d.stage ?? d.round ?? '--'}
          </span>
          <span className="text-[8px] font-bold text-white/70 text-right">
            {d.amount != null ? fmtM(d.amount) : '--'}
          </span>
          <span className="text-[8px] text-white/50 text-right">
            {d.valuation != null ? fmtB(d.valuation) : '--'}
          </span>
          <span className="text-[8px] text-white/40 truncate">
            {d.leadInvestor ?? d.lead ?? '--'}
          </span>
          <span className="text-[8px] text-white/30 text-right pr-2 whitespace-nowrap">
            {fmtDate(d.date ?? d.dealDate ?? null)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- 4. Sector Breakdown --

function SectorBreakdownSection({ sectors }: { sectors: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Sector Breakdown" />

      <div className="grid grid-cols-2 gap-px bg-purple-400/[0.04]">
        {sectors.map((s: any, i: number) => {
          const yoy = s.yoyChange ?? s.yoy ?? null;

          return (
            <div
              key={s.sector ?? s.name ?? i}
              className="bg-black px-2 py-1.5 hover:bg-purple-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-bold text-white uppercase truncate">
                  {s.sector ?? s.name}
                </span>
                {yoy != null && (
                  <span className={`text-[7px] font-bold ${changeColor(yoy)}`}>
                    {fmtPct(yoy)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-white/30">
                  {s.dealCount ?? s.deals ?? '--'} deals
                </span>
                <span className="text-[8px] font-bold text-purple-400">
                  {s.totalFunding != null
                    ? fmtMoney(s.totalFunding)
                    : s.totalValue != null
                      ? fmtMoney(s.totalValue)
                      : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- 5. Unicorn Tracker --

function UnicornTrackerSection({ unicorns }: { unicorns: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Unicorn Tracker" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_56px_48px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">NAME</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider">SECTOR</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">VALUATION</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">LAST RND</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">RAISED</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right pr-2">STATUS</span>
      </div>

      {unicorns.map((u: any, i: number) => {
        const badge = statusBadge(u.status);
        const valCls = valuationSizeClass(u.valuation ?? 0);

        return (
          <div
            key={u.name ?? u.company ?? i}
            className="grid grid-cols-[1fr_52px_56px_48px_52px_52px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-purple-400 truncate">
              {u.name ?? u.company}
            </span>
            <span className="text-[7px] text-white/40 uppercase truncate">
              {u.sector ?? '--'}
            </span>
            <span className={`text-right ${valCls}`}>
              {u.valuation != null ? fmtB(u.valuation) : '--'}
            </span>
            <span className="text-[8px] text-white/40 text-right uppercase">
              {u.lastRound ?? u.lastRnd ?? '--'}
            </span>
            <span className="text-[8px] text-white/50 text-right">
              {u.totalRaised != null ? fmtM(u.totalRaised) : u.raised != null ? fmtM(u.raised) : '--'}
            </span>
            <span className="text-right pr-2">
              <span className={`text-[7px] px-1 py-0.5 font-black border ${badge.cls}`}>
                {badge.label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- 6. Recent Exits --

function RecentExitsSection({ exits }: { exits: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Recent Exits" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_60px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">COMPANY</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider">TYPE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">EXIT VAL</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">RETURN</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right pr-2">SECTOR</span>
      </div>

      {exits.map((e: any, i: number) => {
        const badge = exitTypeBadge(e.type ?? e.exitType ?? null);
        const multiple = e.returnMultiple ?? e.multiple ?? e.moic ?? null;

        return (
          <div
            key={e.company ?? e.name ?? i}
            className="grid grid-cols-[1fr_48px_56px_48px_60px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white truncate">
              {e.company ?? e.name}
            </span>
            <span>
              <span className={`text-[7px] px-1 py-0.5 font-black border ${badge.cls}`}>
                {badge.label}
              </span>
            </span>
            <span className="text-[8px] font-bold text-purple-400 text-right">
              {e.exitValue != null ? fmtB(e.exitValue) : e.value != null ? fmtB(e.value) : '--'}
            </span>
            <span className={`text-[8px] font-bold text-right ${multiple != null ? returnMultipleColor(multiple) : 'text-white/40'}`}>
              {multiple != null ? fmtX(multiple) : '--'}
            </span>
            <span className="text-[8px] text-white/40 text-right pr-2 uppercase truncate">
              {e.sector ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- 7. VC Firm Activity --

function VCFirmActivitySection({ firms }: { firms: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="VC Firm Activity" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_52px_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">FIRM</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DEALS</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DEPLOYED</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">AVG CHK</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right pr-2">TOP SECTOR</span>
      </div>

      {firms.map((f: any, i: number) => (
        <div
          key={f.firm ?? f.name ?? i}
          className="grid grid-cols-[1fr_40px_56px_52px_64px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-purple-400 truncate">
            {f.firm ?? f.name}
          </span>
          <span className="text-[8px] font-bold text-white/60 text-right">
            {f.dealsThisQuarter ?? f.deals ?? '--'}
          </span>
          <span className="text-[8px] font-bold text-white/70 text-right">
            {f.totalDeployed != null ? fmtM(f.totalDeployed) : f.deployed != null ? fmtM(f.deployed) : '--'}
          </span>
          <span className="text-[8px] text-white/40 text-right">
            {f.avgCheckSize != null ? fmtM(f.avgCheckSize) : f.avgCheck != null ? fmtM(f.avgCheck) : '--'}
          </span>
          <span className="text-[8px] text-white/40 text-right pr-2 uppercase truncate">
            {f.topSector ?? f.sector ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- 8. Quarterly Trend (mini SVG bar chart) --

function QuarterlyTrendSection({ quarters }: { quarters: any[] }) {
  const data = quarters.slice(-8);
  if (data.length === 0) return null;

  const values = data.map((q: any) => q.value ?? q.totalFunding ?? q.amount ?? 0);
  const maxVal = Math.max(...values, 1);
  const labels = data.map((q: any) => q.quarter ?? q.label ?? q.period ?? '');

  const chartWidth = 280;
  const chartHeight = 60;
  const barGap = 4;
  const barWidth = (chartWidth - barGap * (data.length - 1)) / data.length;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Quarterly VC Funding Trend" />

      <div className="px-3 py-2">
        <svg
          width="100%"
          height={chartHeight + 16}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 16}`}
          className="overflow-visible"
        >
          {values.map((v: number, i: number) => {
            const barHeight = Math.max((v / maxVal) * chartHeight, 1);
            const x = i * (barWidth + barGap);
            const y = chartHeight - barHeight;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="rgb(192, 132, 252)"
                  opacity={0.5}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={1}
                  fill="rgb(192, 132, 252)"
                  opacity={0.9}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 10}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.2)"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {labels[i]}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {v >= 1000 ? `${(v / 1000).toFixed(0)}B` : `${v.toFixed(0)}M`}
                </text>
              </g>
            );
          })}
          {/* Baseline */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        </svg>
      </div>
    </div>
  );
}
