import { useDebtMaturityWall } from '../../api/hooks/use-debt-maturity-wall';
import { useT } from '../../i18n';

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
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  return (n * 1000).toFixed(0) + 'M';
}

function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}bp`;
}

function fmtCoupon(n: number): string {
  return n.toFixed(3) + '%';
}

// ── Color helpers ──

const AMBER = '#fbbf24';
const BLUE = '#60a5fa';
const ORANGE = '#fb923c';
const PURPLE = '#a78bfa';

function refiRiskColor(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'low':
      return 'text-green-400';
    case 'medium':
    case 'moderate':
      return 'text-yellow-400';
    case 'high':
      return 'text-red-400';
    default:
      return 'text-neutral-500';
  }
}

function refiRiskBg(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'low':
      return 'bg-green-500/10 border-green-500/30';
    case 'medium':
    case 'moderate':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'high':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-neutral-500/10 border-neutral-500/30';
  }
}

// ── Section Header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-border/10">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </div>
  );
}

// ── Section 1: Maturity Profile (Stacked Bar Visualization) ──

function MaturityProfile({ years }: { years: any[] }) {
  if (!years || years.length === 0) return null;

  const maxTotal = Math.max(...years.map((y: any) => (y.ig || 0) + (y.hy || 0) + (y.loans || 0)), 1);
  const peakYear = years.reduce(
    (peak: any, y: any) => {
      const total = (y.ig || 0) + (y.hy || 0) + (y.loans || 0);
      return total > peak.total ? { year: y.year, total } : peak;
    },
    { year: 0, total: 0 },
  );

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Maturity Wall Profile (2025-2034)" />
      <div className="px-3 py-2">
        {/* Legend */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: BLUE }} />
            <span className="text-[7px] font-mono text-neutral-500">IG</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: ORANGE }} />
            <span className="text-[7px] font-mono text-neutral-500">HY</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: PURPLE }} />
            <span className="text-[7px] font-mono text-neutral-500">LOANS</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-amber-400" />
            <span className="text-[7px] font-mono text-amber-400/60">PEAK YEAR</span>
          </div>
        </div>

        {/* Stacked bars */}
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {years.map((y: any) => {
            const ig = y.ig || 0;
            const hy = y.hy || 0;
            const loans = y.loans || 0;
            const total = ig + hy + loans;
            const barHeight = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            const igPct = total > 0 ? (ig / total) * 100 : 0;
            const hyPct = total > 0 ? (hy / total) * 100 : 0;
            const loansPct = total > 0 ? (loans / total) * 100 : 0;
            const isPeak = y.year === peakYear.year;

            return (
              <div key={y.year} className="flex-1 flex flex-col items-center group">
                {/* Total label */}
                <span
                  className={`text-[6px] font-mono font-bold mb-0.5 ${
                    isPeak ? 'text-amber-400' : 'text-neutral-600'
                  }`}
                >
                  {fmtB(total)}
                </span>

                {/* Stacked bar */}
                <div
                  className={`w-full relative hover:bg-amber-400/[0.02] ${
                    isPeak ? 'ring-1 ring-amber-400/40' : ''
                  }`}
                  style={{ height: `${barHeight}%`, minHeight: total > 0 ? 2 : 0 }}
                >
                  <div className="w-full h-full flex flex-col-reverse">
                    {ig > 0 && (
                      <div
                        style={{ height: `${igPct}%`, backgroundColor: BLUE, opacity: 0.7 }}
                      />
                    )}
                    {hy > 0 && (
                      <div
                        style={{ height: `${hyPct}%`, backgroundColor: ORANGE, opacity: 0.7 }}
                      />
                    )}
                    {loans > 0 && (
                      <div
                        style={{ height: `${loansPct}%`, backgroundColor: PURPLE, opacity: 0.7 }}
                      />
                    )}
                  </div>
                </div>

                {/* Year label */}
                <span
                  className={`text-[7px] font-mono mt-1 ${
                    isPeak ? 'text-amber-400 font-bold' : 'text-neutral-600'
                  }`}
                >
                  {String(y.year).slice(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scale reference */}
        <div className="flex justify-between mt-1 border-t border-border/10 pt-1">
          <span className="text-[6px] font-mono text-neutral-700">0</span>
          <span className="text-[6px] font-mono text-neutral-700">{fmtB(maxTotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Section 2: Rating Breakdown ──

function RatingBreakdown({ ratings }: { ratings: any[] }) {
  if (!ratings || ratings.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Rating Breakdown" />
      <div className="px-3 py-1.5">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase">
          <span className="w-10 shrink-0">RATING</span>
          <span className="w-16 text-right shrink-0">MATURING</span>
          <span className="w-14 text-right shrink-0">AVG CPN</span>
          <span className="w-14 text-right shrink-0">CUR YLD</span>
          <span className="flex-1 text-right">REFI SPD</span>
        </div>

        {ratings.map((r: any) => {
          const refiNegative = (r.refiSpread ?? 0) < 0;
          return (
            <div
              key={r.rating}
              className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono"
            >
              <span className="w-10 shrink-0 font-bold text-amber-400/80">{r.rating}</span>
              <span className="w-16 text-right shrink-0 text-white/70">{fmtB(r.maturing)}</span>
              <span className="w-14 text-right shrink-0 text-white/50">{fmtCoupon(r.avgCoupon)}</span>
              <span className="w-14 text-right shrink-0 text-white/50">{fmtCoupon(r.currentYield)}</span>
              <span
                className={`flex-1 text-right font-bold ${refiNegative ? 'text-red-400' : 'text-green-400'}`}
              >
                {fmtBps(r.refiSpread)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 3: Sector Exposure ──

function SectorExposure({ sectors }: { sectors: any[] }) {
  if (!sectors || sectors.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Sector Exposure — Next 12M" />
      <div className="px-3 py-1.5">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase">
          <span className="flex-1 shrink-0">SECTOR</span>
          <span className="w-16 text-right shrink-0">MATURING</span>
          <span className="w-12 text-right shrink-0">AVG RTG</span>
          <span className="w-16 text-right shrink-0">REFI RISK</span>
        </div>

        {sectors.map((s: any) => (
          <div
            key={s.sector}
            className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono"
          >
            <span className="flex-1 shrink-0 text-white/70 truncate">{s.sector}</span>
            <span className="w-16 text-right shrink-0 text-white/50">{fmtB(s.maturing12m)}</span>
            <span className="w-12 text-right shrink-0 text-white/50">{s.avgRating}</span>
            <span className="w-16 text-right shrink-0">
              <span
                className={`px-1 py-px text-[7px] font-bold border ${refiRiskColor(
                  s.refiRisk,
                )} ${refiRiskBg(s.refiRisk)}`}
              >
                {(s.refiRisk || 'N/A').toUpperCase()}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Refinancing Risk Summary ──

function RefinancingRisk({ risk }: { risk: any }) {
  if (!risk) return null;

  const stressIndex = risk.stressIndex ?? 0;
  const stressColor =
    stressIndex >= 70
      ? 'text-red-400'
      : stressIndex >= 40
        ? 'text-yellow-400'
        : 'text-green-400';
  const stressBg =
    stressIndex >= 70
      ? 'bg-red-400'
      : stressIndex >= 40
        ? 'bg-yellow-400'
        : 'bg-green-400';
  const stressGaugePct = Math.min(stressIndex, 100);

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Refinancing Risk Assessment" />
      <div className="px-3 py-2">
        {/* Stress Index Gauge */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-mono text-neutral-500 uppercase">
              Refi Stress Index
            </span>
            <span className={`text-[10px] font-mono font-black ${stressColor}`}>
              {stressIndex.toFixed(1)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.04] overflow-hidden">
            <div
              className={`h-full ${stressBg}`}
              style={{ width: `${stressGaugePct}%`, opacity: 0.7 }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[6px] font-mono text-green-400/50">LOW</span>
            <span className="text-[6px] font-mono text-yellow-400/50">MODERATE</span>
            <span className="text-[6px] font-mono text-red-400/50">SEVERE</span>
          </div>
        </div>

        {/* Summary metrics grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">
              Total Needing Refi
            </div>
            <div className="text-[10px] font-mono font-bold text-amber-400">
              {fmtB(risk.totalNeedingRefi ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">
              Est. Higher Cost
            </div>
            <div className="text-[10px] font-mono font-bold text-red-400">
              {fmtBps(risk.estimatedHigherCost ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">
              Distressed Count
            </div>
            <div className="text-[10px] font-mono font-bold text-red-400">
              {risk.distressedCount ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase">
              Downgrade Candidates
            </div>
            <div className="text-[10px] font-mono font-bold text-orange-400">
              {risk.downgradeCandidates ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 5: Recent Issuance ──

function RecentIssuance({ deals }: { deals: any[] }) {
  if (!deals || deals.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Recent Refinancing Deals" />
      <div className="px-3 py-1.5">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase">
          <span className="flex-1 shrink-0">ISSUER</span>
          <span className="w-14 text-right shrink-0">SIZE</span>
          <span className="w-14 text-right shrink-0">OLD CPN</span>
          <span className="w-14 text-right shrink-0">NEW CPN</span>
          <span className="w-14 text-right shrink-0">SPREAD</span>
        </div>

        {deals.map((deal: any, i: number) => {
          const oldCpn = deal.oldCoupon ?? 0;
          const newCpn = deal.newCoupon ?? 0;
          const cpnDiff = newCpn - oldCpn;
          const cpnColor = cpnDiff > 0 ? 'text-red-400' : cpnDiff < 0 ? 'text-green-400' : 'text-neutral-500';

          return (
            <div
              key={`${deal.issuer}-${i}`}
              className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono"
            >
              <span className="flex-1 shrink-0 text-white/70 truncate">{deal.issuer}</span>
              <span className="w-14 text-right shrink-0 text-white/50">{fmtB(deal.size ?? 0)}</span>
              <span className="w-14 text-right shrink-0 text-white/40">{fmtPct(oldCpn)}</span>
              <span className={`w-14 text-right shrink-0 font-bold ${cpnColor}`}>
                {fmtPct(newCpn)}
              </span>
              <span className="w-14 text-right shrink-0 text-amber-400/70">
                {fmtBps(deal.spread ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function DebtMaturityPanel() {
  const t = useT();
  const { data, isLoading, error } = useDebtMaturityWall();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            Debt Maturity Wall
          </span>
        </div>
        {d?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar text-[9px] font-mono">
        {isLoading && !d && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest animate-pulse">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {error && !d && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
              FAILED TO LOAD
            </span>
          </div>
        )}

        {d && (
          <>
            <MaturityProfile years={d.maturityProfile ?? d.years ?? []} />
            <RatingBreakdown ratings={d.ratingBreakdown ?? d.ratings ?? []} />
            <SectorExposure sectors={d.sectorExposure ?? d.sectors ?? []} />
            <RefinancingRisk risk={d.refinancingRisk ?? d.risk ?? null} />
            <RecentIssuance deals={d.recentIssuance ?? d.deals ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
