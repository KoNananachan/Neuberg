import { useState } from 'react';
import { useFiscalDeficit } from '../../api/hooks/use-fiscal-deficit';

// ── Constants ──

const ROSE = '#fb7185';
const ROSE_DIM = 'rgba(251,113,133,0.5)';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const WHITE_DIM = 'rgba(255,255,255,0.3)';

const COUNTRIES = [
  'US', 'CN', 'JP', 'DE', 'GB', 'FR', 'IN', 'IT', 'BR', 'CA',
  'KR', 'AU', 'ES', 'MX', 'ID', 'NL', 'SA', 'TR', 'CH', 'TW',
] as const;

// ── Number Formatting ──

function fmtTrillions(n: number | undefined | null): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'T';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(1) + 'M';
}

function fmtPct(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

function fmtAbsPct(n: number | undefined | null, decimals = 1): string {
  if (n == null) return '--';
  return n.toFixed(decimals) + '%';
}

function fmtDebt(n: number | undefined | null): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtYears(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(1) + 'Y';
}

// ── Color Helpers ──

function deficitColor(v: number | undefined | null): string {
  if (v == null) return WHITE_DIM;
  return v < 0 ? RED : GREEN;
}

function ratioRiskColor(ratio: number | undefined | null): string {
  if (ratio == null) return WHITE_DIM;
  if (ratio > 100) return RED;
  if (ratio > 60) return YELLOW;
  return GREEN;
}

function sustainabilityColor(score: number | undefined | null): string {
  if (score == null) return WHITE_DIM;
  if (score >= 70) return GREEN;
  if (score >= 40) return YELLOW;
  return RED;
}

function riskLabel(score: number | undefined | null): string {
  if (score == null) return 'N/A';
  if (score >= 70) return 'LOW RISK';
  if (score >= 40) return 'MODERATE';
  return 'HIGH RISK';
}

function trendArrow(trend: string | undefined | null): string {
  if (!trend) return '--';
  switch (trend) {
    case 'improving': return '\u25B2';
    case 'deteriorating': return '\u25BC';
    case 'stable': return '\u25C6';
    default: return '--';
  }
}

function trendColor(trend: string | undefined | null): string {
  if (!trend) return WHITE_DIM;
  switch (trend) {
    case 'improving': return GREEN;
    case 'deteriorating': return RED;
    case 'stable': return YELLOW;
    default: return WHITE_DIM;
  }
}

function outlookColor(outlook: string | undefined | null): string {
  if (!outlook) return WHITE_DIM;
  switch (outlook?.toLowerCase()) {
    case 'positive': return GREEN;
    case 'negative': return RED;
    case 'stable': return YELLOW;
    default: return WHITE_DIM;
  }
}

// ── Issuance Horizontal Bar ──

function IssuanceBar({
  planned,
  issued,
  remaining,
}: {
  planned: number;
  issued: number;
  remaining: number;
}) {
  const total = planned || 1;
  const issuedPct = Math.min((issued / total) * 100, 100);
  const remainingPct = Math.min((remaining / total) * 100, 100 - issuedPct);

  return (
    <div className="px-2 py-1.5 border-b border-white/[0.04]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">Issuance Plan</span>
        <span className="text-[6px] text-white/20">
          {fmtDebt(issued)} / {fmtDebt(planned)}
        </span>
      </div>
      <div className="w-full h-2 bg-white/[0.03] relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${issuedPct}%`, backgroundColor: ROSE, opacity: 0.7 }}
        />
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${issuedPct}%`,
            width: `${remainingPct}%`,
            backgroundColor: ROSE,
            opacity: 0.2,
          }}
        />
      </div>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="flex items-center gap-1 text-[6px] text-white/30">
          <span className="inline-block w-2 h-1" style={{ backgroundColor: ROSE, opacity: 0.7 }} />
          ISSUED
        </span>
        <span className="flex items-center gap-1 text-[6px] text-white/30">
          <span className="inline-block w-2 h-1" style={{ backgroundColor: ROSE, opacity: 0.2 }} />
          REMAINING
        </span>
        <span className="ml-auto text-[6px] font-bold" style={{ color: ROSE }}>
          {((issued / total) * 100).toFixed(1)}% COMPLETE
        </span>
      </div>
    </div>
  );
}

// ── Sustainability Score Visual ──

function SustainabilityScore({ score }: { score: number | undefined | null }) {
  const s = score ?? 0;
  const color = sustainabilityColor(score);
  const label = riskLabel(score);

  return (
    <div className="px-2 py-1.5 border-b border-white/[0.04]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          Sustainability Score
        </span>
        <span
          className="text-[5px] font-black uppercase px-1 py-0"
          style={{
            color,
            backgroundColor: color + '18',
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Score bar */}
        <div className="flex-1 h-2 bg-white/[0.03] relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full transition-all duration-500"
            style={{ width: `${s}%`, backgroundColor: color, opacity: 0.65 }}
          />
        </div>
        <span className="text-[10px] font-black font-mono" style={{ color }}>
          {score != null ? score : '--'}
        </span>
      </div>
      {/* Tick marks */}
      <div className="flex justify-between mt-0.5">
        {[0, 20, 40, 60, 80, 100].map((tick) => (
          <span key={tick} className="text-[5px] text-white/15 font-mono">
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Revenue / Expenditure Breakdown ──

function RevenueExpenditureSection({
  revenue,
  expenditure,
}: {
  revenue?: {
    total?: number;
    tax?: number;
    otherRevenue?: number;
    yoyChange?: number;
    taxYoyChange?: number;
    otherYoyChange?: number;
  };
  expenditure?: {
    total?: number;
    mandatory?: number;
    discretionary?: number;
    interest?: number;
    yoyChange?: number;
    mandatoryYoyChange?: number;
    discretionaryYoyChange?: number;
    interestYoyChange?: number;
  };
}) {
  return (
    <div className="px-2 py-1 border-b border-white/[0.04]">
      <span className="text-[6px] text-white/25 uppercase tracking-wider">
        Revenue vs Expenditure
      </span>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {/* Revenue column */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[7px] font-bold" style={{ color: GREEN }}>REVENUE</span>
            <span className="text-[7px] font-bold" style={{ color: GREEN }}>
              {fmtDebt(revenue?.total)}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-white/40">Tax</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60">{fmtDebt(revenue?.tax)}</span>
                <span
                  className="text-[6px] font-bold"
                  style={{ color: deficitColor(revenue?.taxYoyChange ?? 0) }}
                >
                  {fmtPct(revenue?.taxYoyChange, 1)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-white/40">Other</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60">{fmtDebt(revenue?.otherRevenue)}</span>
                <span
                  className="text-[6px] font-bold"
                  style={{ color: deficitColor(revenue?.otherYoyChange ?? 0) }}
                >
                  {fmtPct(revenue?.otherYoyChange, 1)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-0.5">
              <span className="text-[7px] text-white/40">YoY Change</span>
              <span
                className="text-[7px] font-bold"
                style={{ color: deficitColor(revenue?.yoyChange ?? 0) }}
              >
                {fmtPct(revenue?.yoyChange, 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Expenditure column */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[7px] font-bold" style={{ color: RED }}>EXPENDITURE</span>
            <span className="text-[7px] font-bold" style={{ color: RED }}>
              {fmtDebt(expenditure?.total)}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-white/40">Mandatory</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60">{fmtDebt(expenditure?.mandatory)}</span>
                <span
                  className="text-[6px] font-bold"
                  style={{ color: deficitColor(-(expenditure?.mandatoryYoyChange ?? 0)) }}
                >
                  {fmtPct(expenditure?.mandatoryYoyChange, 1)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-white/40">Discretionary</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60">{fmtDebt(expenditure?.discretionary)}</span>
                <span
                  className="text-[6px] font-bold"
                  style={{ color: deficitColor(-(expenditure?.discretionaryYoyChange ?? 0)) }}
                >
                  {fmtPct(expenditure?.discretionaryYoyChange, 1)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-white/40">Interest</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] text-white/60">{fmtDebt(expenditure?.interest)}</span>
                <span
                  className="text-[6px] font-bold"
                  style={{ color: deficitColor(-(expenditure?.interestYoyChange ?? 0)) }}
                >
                  {fmtPct(expenditure?.interestYoyChange, 1)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-0.5">
              <span className="text-[7px] text-white/40">YoY Change</span>
              <span
                className="text-[7px] font-bold"
                style={{ color: deficitColor(-(expenditure?.yoyChange ?? 0)) }}
              >
                {fmtPct(expenditure?.yoyChange, 1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Interest Burden Section ──

function InterestBurdenSection({
  interestToRevenue,
  interestToGdp,
  avgCouponRate,
  weightedMaturity,
}: {
  interestToRevenue?: number;
  interestToGdp?: number;
  avgCouponRate?: number;
  weightedMaturity?: number;
}) {
  return (
    <div className="px-2 py-1 border-b border-white/[0.04]">
      <span className="text-[6px] text-white/25 uppercase tracking-wider">Interest Burden</span>
      <div className="grid grid-cols-4 gap-1 mt-1">
        <div>
          <div className="text-[6px] text-white/30">Int/Rev</div>
          <div
            className="text-[9px] font-bold"
            style={{ color: (interestToRevenue ?? 0) > 20 ? RED : (interestToRevenue ?? 0) > 10 ? YELLOW : GREEN }}
          >
            {fmtAbsPct(interestToRevenue)}
          </div>
        </div>
        <div>
          <div className="text-[6px] text-white/30">Int/GDP</div>
          <div
            className="text-[9px] font-bold"
            style={{ color: (interestToGdp ?? 0) > 5 ? RED : (interestToGdp ?? 0) > 3 ? YELLOW : GREEN }}
          >
            {fmtAbsPct(interestToGdp)}
          </div>
        </div>
        <div>
          <div className="text-[6px] text-white/30">Avg Coupon</div>
          <div className="text-[9px] font-bold text-white/70">
            {fmtAbsPct(avgCouponRate)}
          </div>
        </div>
        <div>
          <div className="text-[6px] text-white/30">Wtd Maturity</div>
          <div className="text-[9px] font-bold text-white/70">
            {fmtYears(weightedMaturity)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upcoming Auctions ──

function UpcomingAuctions({
  auctions,
}: {
  auctions?: Array<{
    date?: string;
    type?: string;
    tenor?: string;
    amount?: number;
    status?: string;
  }>;
}) {
  if (!auctions?.length) {
    return (
      <div className="px-2 py-1.5">
        <span className="text-[6px] text-white/25 uppercase tracking-wider">
          Upcoming Issuance
        </span>
        <div className="text-[7px] text-white/20 mt-1">No scheduled auctions</div>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <span className="text-[6px] text-white/25 uppercase tracking-wider">
        Upcoming Issuance
      </span>
      <div className="mt-1 max-h-24 overflow-y-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="text-[6px] text-white/20 uppercase">
              <th className="text-left py-0.5 font-normal">Date</th>
              <th className="text-left py-0.5 font-normal">Type</th>
              <th className="text-left py-0.5 font-normal">Tenor</th>
              <th className="text-right py-0.5 font-normal">Amount</th>
              <th className="text-right py-0.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((auction, i) => (
              <tr
                key={i}
                className="border-t border-white/[0.03] hover:bg-rose-400/[0.02] transition-colors"
              >
                <td className="text-[7px] text-white/50 py-0.5">{auction.date ?? '--'}</td>
                <td className="text-[7px] text-white/50 py-0.5">{auction.type ?? '--'}</td>
                <td className="text-[7px] text-white/60 py-0.5 font-bold">{auction.tenor ?? '--'}</td>
                <td className="text-[7px] text-white/60 py-0.5 text-right font-bold">
                  {fmtDebt(auction.amount)}
                </td>
                <td className="text-right py-0.5">
                  <span
                    className="text-[5px] font-black uppercase px-1"
                    style={{
                      color:
                        auction.status === 'confirmed'
                          ? GREEN
                          : auction.status === 'tentative'
                            ? YELLOW
                            : WHITE_DIM,
                      backgroundColor:
                        auction.status === 'confirmed'
                          ? 'rgba(52,211,153,0.1)'
                          : auction.status === 'tentative'
                            ? 'rgba(251,191,36,0.1)'
                            : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {auction.status?.toUpperCase() ?? 'TBD'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Credit Rating Display ──

function CreditRating({
  ratings,
}: {
  ratings?: {
    sp?: { rating?: string; outlook?: string };
    moodys?: { rating?: string; outlook?: string };
    fitch?: { rating?: string; outlook?: string };
  };
}) {
  const agencies = [
    { name: 'S&P', data: ratings?.sp },
    { name: "Moody's", data: ratings?.moodys },
    { name: 'Fitch', data: ratings?.fitch },
  ];

  return (
    <div className="flex items-center gap-2">
      {agencies.map((agency) => (
        <div key={agency.name} className="flex items-center gap-0.5">
          <span className="text-[6px] text-white/30">{agency.name}</span>
          <span className="text-[8px] font-bold text-white/80">
            {agency.data?.rating ?? '--'}
          </span>
          {agency.data?.outlook && (
            <span
              className="text-[5px] font-black uppercase"
              style={{ color: outlookColor(agency.data.outlook) }}
            >
              {agency.data.outlook.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function FiscalDeficitPanel() {
  const { data, isLoading } = useFiscalDeficit();
  const [selectedCountry, setSelectedCountry] = useState('US');

  const countries: string[] = data?.countries
    ? Object.keys(data.countries)
    : [...COUNTRIES];

  const countryData = data?.countries?.[selectedCountry];
  const globalDebt = data?.globalDebt;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="3" width="12" height="10" fill="none" stroke={ROSE} strokeWidth="0.8" />
            <line x1="2" y1="7" x2="14" y2="7" stroke={ROSE} strokeWidth="0.5" opacity="0.5" />
            <line x1="8" y1="3" x2="8" y2="13" stroke={ROSE} strokeWidth="0.5" opacity="0.5" />
            <path d="M4 10L7 6L10 8.5L13 4.5" stroke={ROSE} strokeWidth="1" fill="none" />
            <circle cx="13" cy="4.5" r="0.8" fill={ROSE} />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ROSE }}>
            Fiscal Deficit Monitor
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {globalDebt != null && (
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-white/20 uppercase">Global Debt</span>
              <span className="text-[8px] font-black" style={{ color: ROSE }}>
                {fmtDebt(globalDebt)}
              </span>
            </div>
          )}
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Country Selector */}
      <div className="flex items-center border-b border-border/20 shrink-0 overflow-x-auto scrollbar-thin bg-[#030303]">
        {countries.map((code) => {
          const isActive = code === selectedCountry;
          return (
            <button
              key={code}
              onClick={() => setSelectedCountry(code)}
              className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'border-rose-400 text-rose-400 bg-rose-400/[0.05]'
                  : 'border-transparent text-white/30 hover:text-white/50 hover:bg-rose-400/[0.02]'
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                Loading...
              </span>
            </div>
          </div>
        ) : countryData ? (
          <>
            {/* Key Metrics */}
            <div className="px-2 py-1.5 border-b border-border/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  Key Metrics
                </span>
                <CreditRating ratings={countryData.creditRating} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Budget Balance */}
                <div>
                  <div className="text-[6px] text-white/30 uppercase">Budget Balance (% GDP)</div>
                  <div
                    className="text-[12px] font-black"
                    style={{ color: deficitColor(countryData.budgetBalancePctGdp) }}
                  >
                    {fmtPct(countryData.budgetBalancePctGdp, 1)}
                  </div>
                  <div className="text-[6px] text-white/20">
                    {(countryData.budgetBalancePctGdp ?? 0) < 0 ? 'DEFICIT' : 'SURPLUS'}
                  </div>
                </div>

                {/* Debt-to-GDP */}
                <div>
                  <div className="text-[6px] text-white/30 uppercase">Debt-to-GDP</div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-[12px] font-black"
                      style={{ color: ratioRiskColor(countryData.debtToGdp) }}
                    >
                      {fmtAbsPct(countryData.debtToGdp)}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: trendColor(countryData.debtToGdpTrend) }}
                    >
                      {trendArrow(countryData.debtToGdpTrend)}
                    </span>
                  </div>
                  <div className="text-[6px] uppercase" style={{ color: trendColor(countryData.debtToGdpTrend) }}>
                    {countryData.debtToGdpTrend ?? '--'}
                  </div>
                </div>

                {/* Total Debt */}
                <div>
                  <div className="text-[6px] text-white/30 uppercase">Total Debt</div>
                  <div className="text-[12px] font-black" style={{ color: ROSE_DIM }}>
                    {fmtDebt(countryData.totalDebt)}
                  </div>
                  <div className="text-[6px] text-white/20">
                    YoY {fmtPct(countryData.totalDebtYoyChange, 1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue vs Expenditure */}
            <RevenueExpenditureSection
              revenue={countryData.revenue}
              expenditure={countryData.expenditure}
            />

            {/* Interest Burden */}
            <InterestBurdenSection
              interestToRevenue={countryData.interestBurden?.interestToRevenue}
              interestToGdp={countryData.interestBurden?.interestToGdp}
              avgCouponRate={countryData.interestBurden?.avgCouponRate}
              weightedMaturity={countryData.interestBurden?.weightedMaturity}
            />

            {/* Issuance Plan */}
            {countryData.issuancePlan && (
              <IssuanceBar
                planned={countryData.issuancePlan.planned ?? 0}
                issued={countryData.issuancePlan.issued ?? 0}
                remaining={countryData.issuancePlan.remaining ?? 0}
              />
            )}

            {/* Sustainability Score */}
            <SustainabilityScore score={countryData.sustainabilityScore} />

            {/* Upcoming Auctions */}
            <UpcomingAuctions auctions={countryData.upcomingAuctions} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
