import { useDebtMaturity } from '../../api/hooks/use-debt-maturity';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Formatting helpers --

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

function fmtDate(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

// -- Color helpers --

const BLUE = '#60a5fa';
const ORANGE = '#fb923c';
const PURPLE = '#a78bfa';

function riskColor(risk: string): string {
  switch (risk?.toUpperCase()) {
    case 'LOW':
      return 'text-green-400';
    case 'MODERATE':
      return 'text-yellow-400';
    case 'HIGH':
      return 'text-orange-400';
    case 'CRITICAL':
      return 'text-red-400';
    default:
      return 'text-neutral-500';
  }
}

function riskBadgeBg(risk: string): string {
  switch (risk?.toUpperCase()) {
    case 'LOW':
      return 'bg-green-500/10 border-green-500/30';
    case 'MODERATE':
      return 'bg-yellow-500/10 border-yellow-500/30';
    case 'HIGH':
      return 'bg-orange-500/10 border-orange-500/30';
    case 'CRITICAL':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-neutral-500/10 border-neutral-500/30';
  }
}

function ratingBadgeColor(rating: string): string {
  const r = rating?.toUpperCase() || '';
  if (r.startsWith('AAA') || r.startsWith('AA')) return 'text-green-400 bg-green-400/10 border-green-400/30';
  if (r.startsWith('A')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  if (r.startsWith('BBB')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  if (r.startsWith('BB')) return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
  if (r.startsWith('B')) return 'text-red-400 bg-red-400/10 border-red-400/30';
  if (r.startsWith('CCC') || r.startsWith('CC') || r.startsWith('C')) return 'text-red-500 bg-red-500/10 border-red-500/30';
  return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30';
}

function refiStatusBadge(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'REFINANCED':
      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'IN PROGRESS':
    case 'PENDING':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'AT RISK':
    case 'DISTRESSED':
      return 'text-red-400 bg-red-400/10 border-red-400/30';
    default:
      return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30';
  }
}

// -- Section Header --

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-border/10">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </div>
  );
}

// -- Section 1: Maturity Wall Bar Chart (2024-2032) --

function MaturityWallChart({ buckets }: { buckets: any[] }) {
  if (!buckets || buckets.length === 0) return null;

  const years = Array.from({ length: 9 }, (_, i) => 2024 + i);
  const bucketMap = new Map(buckets.map((b: any) => [b.year, b]));

  const barData = years.map((year) => {
    const b = bucketMap.get(year);
    if (!b) return { year, ig: 0, hy: 0, loans: 0, total: 0, risk: 'LOW' };
    const rb = b.ratingBreakdown || {};
    const ig = (rb.aaa_aa || 0) + (rb.a || 0) + (rb.bbb || 0);
    const hy = rb.highYield || 0;
    const loans = b.loans || 0;
    const total = b.amount || (ig + hy + loans);
    return { year, ig, hy, loans, total, risk: b.refinancingRisk || 'LOW' };
  });

  const maxTotal = Math.max(...barData.map((d) => d.total), 1);

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Maturity Wall 2024-2032" />
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
        </div>

        {/* Stacked bars */}
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {barData.map((d) => {
            const barHeight = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
            const igPct = d.total > 0 ? (d.ig / d.total) * 100 : 0;
            const hyPct = d.total > 0 ? (d.hy / d.total) * 100 : 0;
            const loansPct = d.total > 0 ? (d.loans / d.total) * 100 : 0;

            return (
              <div key={d.year} className="flex-1 flex flex-col items-center group">
                {/* Total label */}
                <span className="text-[6px] font-mono font-bold mb-0.5 text-neutral-600">
                  {fmtB(d.total)}
                </span>

                {/* Stacked bar */}
                <div
                  className="w-full relative hover:bg-amber-400/[0.02]"
                  style={{ height: `${barHeight}%`, minHeight: d.total > 0 ? 2 : 0 }}
                >
                  <div className="w-full h-full flex flex-col-reverse">
                    {d.ig > 0 && (
                      <div style={{ height: `${igPct}%`, backgroundColor: BLUE, opacity: 0.7 }} />
                    )}
                    {d.hy > 0 && (
                      <div style={{ height: `${hyPct}%`, backgroundColor: ORANGE, opacity: 0.7 }} />
                    )}
                    {d.loans > 0 && (
                      <div style={{ height: `${loansPct}%`, backgroundColor: PURPLE, opacity: 0.7 }} />
                    )}
                  </div>
                </div>

                {/* Year + risk badge */}
                <span className="text-[7px] font-mono mt-1 text-neutral-600">
                  {String(d.year).slice(2)}
                </span>
                <span
                  className={`text-[5px] font-mono font-bold uppercase ${riskColor(d.risk)}`}
                >
                  {d.risk?.slice(0, 3)}
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

// -- Section 2: Refinancing Cost --

function RefinancingCostSection({ buckets, refinancingCost }: { buckets: any[]; refinancingCost: number }) {
  if (!buckets || buckets.length === 0) return null;

  // Compute IG and HY aggregates from buckets
  let igCouponSum = 0;
  let igYieldSum = 0;
  let igCount = 0;
  let hyCouponSum = 0;
  let hyYieldSum = 0;
  let hyCount = 0;

  for (const b of buckets) {
    const rb = b.ratingBreakdown || {};
    const igAmt = (rb.aaa_aa || 0) + (rb.a || 0) + (rb.bbb || 0);
    const hyAmt = rb.highYield || 0;
    if (igAmt > 0) {
      igCouponSum += (b.avgCoupon || 0) * igAmt;
      igYieldSum += (b.avgYield || 0) * igAmt;
      igCount += igAmt;
    }
    if (hyAmt > 0) {
      hyCouponSum += (b.avgCoupon || 0) * hyAmt;
      hyYieldSum += (b.avgYield || 0) * hyAmt;
      hyCount += hyAmt;
    }
  }

  const igCoupon = igCount > 0 ? igCouponSum / igCount : 0;
  const igYield = igCount > 0 ? igYieldSum / igCount : 0;
  const hyCoupon = hyCount > 0 ? hyCouponSum / hyCount : 0;
  const hyYield = hyCount > 0 ? hyYieldSum / hyCount : 0;

  const igIncrease = igYield - igCoupon;
  const hyIncrease = hyYield - hyCoupon;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Refinancing Cost Analysis" />
      <div className="px-3 py-2">
        {/* IG vs HY comparison */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {/* IG */}
          <div className="border border-border/10 p-2">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              Investment Grade
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[7px] font-mono text-neutral-600">Current Coupon</span>
              <span className="text-[9px] font-mono font-bold text-white/70">{fmtCoupon(igCoupon)}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[7px] font-mono text-neutral-600">New Issue Yield</span>
              <span className="text-[9px] font-mono font-bold text-white/70">{fmtCoupon(igYield)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/10 pt-1">
              <span className="text-[7px] font-mono text-neutral-600">Cost Increase</span>
              <span className={`text-[9px] font-mono font-bold ${igIncrease > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {fmtBps(igIncrease * 100)}
              </span>
            </div>
          </div>

          {/* HY */}
          <div className="border border-border/10 p-2">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              High Yield
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[7px] font-mono text-neutral-600">Current Coupon</span>
              <span className="text-[9px] font-mono font-bold text-white/70">{fmtCoupon(hyCoupon)}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[7px] font-mono text-neutral-600">New Issue Yield</span>
              <span className="text-[9px] font-mono font-bold text-white/70">{fmtCoupon(hyYield)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/10 pt-1">
              <span className="text-[7px] font-mono text-neutral-600">Cost Increase</span>
              <span className={`text-[9px] font-mono font-bold ${hyIncrease > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {fmtBps(hyIncrease * 100)}
              </span>
            </div>
          </div>
        </div>

        {/* Total additional interest */}
        <div className="flex items-center justify-between bg-white/[0.02] px-2 py-1.5 border border-border/10">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            Total Additional Interest
          </span>
          <span className="text-[10px] font-mono font-black text-amber-400">
            {fmtB(refinancingCost)}
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Section 3: Sector Breakdown Table --

function SectorBreakdownSection({ buckets }: { buckets: any[] }) {
  if (!buckets || buckets.length === 0) return null;

  // Aggregate by sector from bucket data
  const sectorMap = new Map<string, { total: number; couponSum: number; count: number; ratings: string[]; risks: string[] }>();

  for (const b of buckets) {
    const sector = b.sector || 'Other';
    const existing = sectorMap.get(sector) || { total: 0, couponSum: 0, count: 0, ratings: [], risks: [] };
    existing.total += b.amount || 0;
    existing.couponSum += (b.avgCoupon || 0) * (b.count || 1);
    existing.count += b.count || 1;
    if (b.avgRating) existing.ratings.push(b.avgRating);
    if (b.refinancingRisk) existing.risks.push(b.refinancingRisk);
    sectorMap.set(sector, existing);
  }

  const sectors = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      total: data.total,
      avgCoupon: data.count > 0 ? data.couponSum / data.count : 0,
      avgRating: data.ratings[0] || 'N/A',
      refiRisk: data.risks.includes('CRITICAL')
        ? 'CRITICAL'
        : data.risks.includes('HIGH')
          ? 'HIGH'
          : data.risks.includes('MODERATE')
            ? 'MODERATE'
            : 'LOW',
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (sectors.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Sector Breakdown" />
      <div className="px-3 py-1.5">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          <span className="flex-1 shrink-0">Sector</span>
          <span className="w-16 text-right shrink-0">Maturing</span>
          <span className="w-14 text-right shrink-0">Avg Cpn</span>
          <span className="w-12 text-center shrink-0">Rating</span>
          <span className="w-16 text-right shrink-0">Refi Risk</span>
        </div>

        {sectors.map((s) => (
          <div
            key={s.sector}
            className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono"
          >
            <span className="flex-1 shrink-0 text-white/70 truncate">{s.sector}</span>
            <span className="w-16 text-right shrink-0 text-white/50">{fmtB(s.total)}</span>
            <span className="w-14 text-right shrink-0 text-white/50">{fmtCoupon(s.avgCoupon)}</span>
            <span className="w-12 text-center shrink-0">
              <span className={`px-1 py-px text-[7px] font-bold border ${ratingBadgeColor(s.avgRating)}`}>
                {s.avgRating}
              </span>
            </span>
            <span className="w-16 text-right shrink-0">
              <span className={`px-1 py-px text-[7px] font-bold border ${riskColor(s.refiRisk)} ${riskBadgeBg(s.refiRisk)}`}>
                {s.refiRisk}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Section 4: Largest Maturities Table --

function LargestMaturitiesSection({ buckets }: { buckets: any[] }) {
  if (!buckets || buckets.length === 0) return null;

  // Extract individual maturities if available
  const maturities: any[] = [];
  for (const b of buckets) {
    if (b.topIssuers) {
      for (const iss of b.topIssuers) {
        maturities.push({ ...iss, year: b.year, bucketRisk: b.refinancingRisk });
      }
    } else if (b.issuer) {
      maturities.push(b);
    }
  }

  // Fallback: show bucket-level data as largest maturities
  const items = maturities.length > 0
    ? maturities.sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0)).slice(0, 12)
    : buckets
        .filter((b: any) => b.amount > 0)
        .sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 12)
        .map((b: any) => ({
          issuer: b.entity || b.issuer || `${b.year} Bucket`,
          sector: b.sector || '--',
          amount: b.amount,
          maturityDate: b.maturityDate || `${b.year}`,
          coupon: b.avgCoupon,
          rating: b.avgRating || '--',
          spread: b.spread || 0,
          status: b.refinancingRisk === 'CRITICAL' || b.refinancingRisk === 'HIGH' ? 'AT RISK' : 'PENDING',
        }));

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Largest Maturities" />
      <div className="px-3 py-1.5 overflow-x-auto">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider min-w-[480px]">
          <span className="w-24 shrink-0">Issuer</span>
          <span className="w-16 shrink-0">Sector</span>
          <span className="w-14 text-right shrink-0">Amount</span>
          <span className="w-16 text-right shrink-0">Maturity</span>
          <span className="w-12 text-right shrink-0">Coupon</span>
          <span className="w-10 text-center shrink-0">Rtg</span>
          <span className="w-12 text-right shrink-0">Spread</span>
          <span className="w-16 text-right shrink-0">Status</span>
        </div>

        {items.map((item: any, i: number) => (
          <div
            key={`${item.issuer}-${i}`}
            className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono min-w-[480px]"
          >
            <span className="w-24 shrink-0 text-amber-400/80 font-bold truncate">
              {item.issuer || '--'}
            </span>
            <span className="w-16 shrink-0 text-white/50 truncate">{item.sector || '--'}</span>
            <span className="w-14 text-right shrink-0 text-white/70">{fmtB(item.amount || 0)}</span>
            <span className="w-16 text-right shrink-0 text-white/50">
              {item.maturityDate ? fmtDate(item.maturityDate) : item.year || '--'}
            </span>
            <span className="w-12 text-right shrink-0 text-white/50">
              {item.coupon ? fmtPct(item.coupon) : '--'}
            </span>
            <span className="w-10 text-center shrink-0">
              {item.rating && item.rating !== '--' ? (
                <span className={`px-0.5 py-px text-[6px] font-bold border ${ratingBadgeColor(item.rating)}`}>
                  {item.rating}
                </span>
              ) : (
                <span className="text-neutral-600">--</span>
              )}
            </span>
            <span className="w-12 text-right shrink-0 text-white/50">
              {item.spread ? fmtBps(item.spread) : '--'}
            </span>
            <span className="w-16 text-right shrink-0">
              {item.status ? (
                <span className={`px-1 py-px text-[6px] font-bold border ${refiStatusBadge(item.status)}`}>
                  {item.status}
                </span>
              ) : (
                <span className="text-neutral-600">--</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Section 5: Rating Migration --

function RatingMigrationSection({ data }: { data: any }) {
  const migration = data?.ratingMigration || data?.migration;
  if (!migration) return null;

  const upgrades = migration.upgrades ?? 0;
  const downgrades = migration.downgrades ?? 0;
  const fallenAngels = migration.fallenAngels ?? 0;
  const risingStars = migration.risingStars ?? 0;

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Rating Migration" />
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Upgrades</div>
            <div className="text-[11px] font-mono font-black text-green-400">{upgrades}</div>
          </div>
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Downgrades</div>
            <div className="text-[11px] font-mono font-black text-red-400">{downgrades}</div>
          </div>
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Fallen Angels</div>
            <div className="text-[11px] font-mono font-black text-red-400">{fallenAngels}</div>
          </div>
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Rising Stars</div>
            <div className="text-[11px] font-mono font-black text-green-400">{risingStars}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Section 6: Maturity by Rating (with progress bars) --

function MaturityByRatingSection({ buckets }: { buckets: any[] }) {
  if (!buckets || buckets.length === 0) return null;

  // Aggregate by rating
  const ratingLabels = ['AAA/AA', 'A', 'BBB', 'HY'];
  const ratingKeys: Array<keyof { aaa_aa: number; a: number; bbb: number; highYield: number }> = [
    'aaa_aa',
    'a',
    'bbb',
    'highYield',
  ];

  let grandTotal = 0;
  const ratingTotals = ratingKeys.map(() => 0);

  for (const b of buckets) {
    const rb = b.ratingBreakdown || {};
    ratingKeys.forEach((key, idx) => {
      const val = rb[key] || 0;
      ratingTotals[idx] += val;
      grandTotal += val;
    });
  }

  if (grandTotal === 0) {
    // Fallback: if no rating breakdown, use bucket amounts
    const totalAmount = buckets.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    if (totalAmount === 0) return null;

    // Show bucket-level maturities by year as a simple list
    const items = buckets
      .filter((b: any) => b.amount > 0)
      .sort((a: any, b: any) => b.amount - a.amount);

    return (
      <div className="border-b border-border/20">
        <SectionHeader label="Maturity by Year" />
        <div className="px-3 py-1.5">
          {items.map((b: any) => {
            const pct = totalAmount > 0 ? (b.amount / totalAmount) * 100 : 0;
            return (
              <div
                key={b.year}
                className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono gap-2"
              >
                <span className="w-10 shrink-0 font-bold text-amber-400/80">{b.year}</span>
                <span className="w-14 text-right shrink-0 text-white/70">{fmtB(b.amount)}</span>
                <span className="w-10 text-right shrink-0 text-white/50">{pct.toFixed(1)}%</span>
                <div className="flex-1 h-1.5 bg-white/[0.04] overflow-hidden">
                  <div className="h-full bg-amber-400/50" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label="Maturity by Rating" />
      <div className="px-3 py-1.5">
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          <span className="w-14 shrink-0">Rating</span>
          <span className="w-16 text-right shrink-0">Maturing</span>
          <span className="w-12 text-right shrink-0">% Outstd</span>
          <span className="flex-1 pl-2">Distribution</span>
        </div>

        {ratingLabels.map((label, idx) => {
          const total = ratingTotals[idx];
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div
              key={label}
              className="flex items-center py-0.5 border-b border-border/5 hover:bg-amber-400/[0.02] text-[8px] font-mono gap-0"
            >
              <span className="w-14 shrink-0">
                <span className={`px-1 py-px text-[7px] font-bold border ${ratingBadgeColor(label)}`}>
                  {label}
                </span>
              </span>
              <span className="w-16 text-right shrink-0 text-white/70">{fmtB(total)}</span>
              <span className="w-12 text-right shrink-0 text-white/50">{pct.toFixed(1)}%</span>
              <div className="flex-1 pl-2">
                <div className="w-full h-1.5 bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full bg-amber-400/50"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Grand total */}
        <div className="flex items-center py-1 text-[8px] font-mono border-t border-border/10 mt-1">
          <span className="w-14 shrink-0 font-bold text-amber-400/80">TOTAL</span>
          <span className="w-16 text-right shrink-0 font-bold text-amber-400">{fmtB(grandTotal)}</span>
          <span className="w-12 text-right shrink-0 text-white/50">100%</span>
          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
}

// -- Main Panel --

export function DebtMaturityPanel() {
  const t = useT();
  const { data, isLoading, error } = useDebtMaturity();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            {tr(t, 'panelDebtMaturity', 'Debt Maturity Wall')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest animate-pulse">
              LOADING DEBT MATURITY DATA...
            </span>
          </div>
        )}

        {error && !data && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
              FAILED TO LOAD
            </span>
          </div>
        )}

        {data && (
          <>
            {/* Maturity Wall Bar Chart */}
            <MaturityWallChart buckets={data.buckets ?? []} />

            {/* Refinancing Cost */}
            <RefinancingCostSection
              buckets={data.buckets ?? []}
              refinancingCost={data.refinancingCost ?? 0}
            />

            {/* Sector Breakdown */}
            <SectorBreakdownSection buckets={data.buckets ?? []} />

            {/* Largest Maturities */}
            <LargestMaturitiesSection buckets={data.buckets ?? []} />

            {/* Rating Migration */}
            <RatingMigrationSection data={data} />

            {/* Maturity by Rating */}
            <MaturityByRatingSection buckets={data.buckets ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
