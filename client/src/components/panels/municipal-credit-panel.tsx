import { useMunicipalCredit } from '../../api/hooks/use-municipal-credit';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtYield(n: number): string {
  return n.toFixed(2);
}

function fmtRatio(n: number): string {
  return n.toFixed(0);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtAmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}T`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
}

function fmtDebt(n: number): string {
  return `$${n.toLocaleString()}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function yieldChangeColor(n: number): string {
  // Yields up = red (bond convention), yields down = green
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA')) return 'text-green-400';
  if (rating.startsWith('AA')) return 'text-blue-400';
  if (rating.startsWith('A')) return 'text-yellow-400';
  if (rating.startsWith('BBB')) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingBorderColor(rating: string): string {
  if (rating.startsWith('AAA')) return 'border-l-green-500/40';
  if (rating.startsWith('AA')) return 'border-l-blue-500/40';
  if (rating.startsWith('A')) return 'border-l-yellow-500/40';
  if (rating.startsWith('BBB')) return 'border-l-red-500/40';
  return 'border-l-neutral-500/40';
}

function directionBadge(direction: string): { text: string; bg: string } {
  switch (direction?.toUpperCase()) {
    case 'UPGRADE':
      return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
    case 'DOWNGRADE':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  }
}

function outlookColor(outlook: string): string {
  const o = outlook?.toUpperCase();
  if (o === 'POSITIVE' || o === 'STABLE') return 'text-green-400';
  if (o === 'NEGATIVE') return 'text-red-400';
  if (o === 'DEVELOPING') return 'text-yellow-400';
  return 'text-neutral-500';
}

function taxStatusBadge(status: string): { text: string; bg: string } {
  switch (status?.toUpperCase()) {
    case 'TAX-EXEMPT':
    case 'EXEMPT':
      return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
    case 'TAXABLE':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
    case 'AMT':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  }
}

// -- Interfaces --

interface YieldCurveRow {
  rating: string;
  yields: number[];
}

interface MuniTreasuryRatio {
  maturity: string;
  muniYield: number;
  treasuryYield: number;
  ratio: number;
}

interface TopIssuer {
  name: string;
  outstanding: number;
  rating: string;
  state: string;
}

interface SectorBreakdown {
  sector: string;
  marketShare: number;
  avgYield: number;
  spread: number;
}

interface RatingChange {
  issuer: string;
  direction: string;
  fromRating: string;
  toRating: string;
  agency: string;
  date: string;
}

interface NewIssuanceDeal {
  issuer: string;
  size: number;
  type: string;
  taxStatus: string;
  coupon: number;
  maturity: string;
}

interface StateMetric {
  state: string;
  debtPerCapita: number;
  pensionFunding: number;
  creditOutlook: string;
  rating: string;
}

interface MarketStats {
  totalOutstanding: number;
  avgYield: number;
  fundFlows: number;
  weeklyChange: number;
}

// -- Main Panel --

export function MunicipalCreditPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMunicipalCredit();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-blue-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'panelMunicipalCredit', 'Municipal Credit')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            {d.marketStats && <MarketStatsBar stats={d.marketStats} />}
            {d.yieldCurve && <YieldCurveSection data={d.yieldCurve} />}
            {d.muniTreasuryRatios && <MuniTreasuryRatioSection ratios={d.muniTreasuryRatios} />}
            {d.topIssuers && <TopIssuersSection issuers={d.topIssuers} />}
            {d.sectorBreakdown && <SectorBreakdownSection sectors={d.sectorBreakdown} />}
            {d.ratingChanges && <RatingChangesSection changes={d.ratingChanges} />}
            {d.newIssuance && <NewIssuanceSection deals={d.newIssuance} />}
            {d.stateMetrics && <StateMetricsSection metrics={d.stateMetrics} />}
          </>
        )}
      </div>
    </div>
  );
}

// -- Market Stats Bar --

function MarketStatsBar({ stats }: { stats: MarketStats }) {
  return (
    <div className="border-b border-blue-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-blue-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total Outstanding
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtAmt(stats.totalOutstanding)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Avg Yield
          </div>
          <div className="text-[10px] font-mono font-bold text-blue-400">
            {fmtYield(stats.avgYield)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Fund Flows
          </div>
          <div className={`text-[10px] font-mono font-bold ${changeColor(stats.fundFlows)}`}>
            {stats.fundFlows >= 0 ? '+' : ''}{fmtAmt(Math.abs(stats.fundFlows))}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Weekly Chg
          </div>
          <div className={`text-[10px] font-mono font-bold ${yieldChangeColor(stats.weeklyChange)}`}>
            {fmtChg(stats.weeklyChange)}bp
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Yield Curve Section --

function YieldCurveSection({ data }: { data: any }) {
  const tenors = data?.tenors ?? ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];
  const ratings = (data?.ratings ?? []) as YieldCurveRow[];

  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Yield Curve by Rating
        </span>
      </div>

      {/* Table header */}
      <div className="flex px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="w-12 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Rating
        </span>
        {tenors.map((tenor: string) => (
          <span key={tenor} className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tenor}
          </span>
        ))}
      </div>

      {/* Rating rows */}
      {ratings.map((row) => (
        <div
          key={row.rating}
          className={`flex px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors border-l-2 ${ratingBorderColor(row.rating)}`}
        >
          <span className={`w-12 text-[8px] font-mono font-bold ${ratingColor(row.rating)}`}>
            {row.rating}
          </span>
          {(row.yields ?? []).map((y: number, i: number) => (
            <span key={i} className={`flex-1 text-[8px] font-mono font-bold text-right ${ratingColor(row.rating)}`}>
              {fmtYield(y)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// -- Muni/Treasury Ratio Section --

function MuniTreasuryRatioSection({ ratios }: { ratios: MuniTreasuryRatio[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Muni / Treasury Ratios
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_56px_56px_56px_1fr] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Maturity
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Muni
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          TSY
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Ratio
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Bar
        </span>
      </div>

      {/* Rows */}
      {ratios.map((row) => {
        const ratioColor = row.ratio > 100 ? 'text-green-400' : row.ratio > 85 ? 'text-yellow-400' : 'text-neutral-400';
        const barColor = row.ratio > 100 ? 'bg-green-400' : row.ratio > 85 ? 'bg-yellow-400' : 'bg-neutral-500';

        return (
          <div
            key={row.maturity}
            className="grid grid-cols-[80px_56px_56px_56px_1fr] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.maturity}</span>
            <span className="text-[8px] font-mono font-bold text-blue-400 text-right">
              {fmtYield(row.muniYield)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtYield(row.treasuryYield)}%
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${ratioColor}`}>
              {fmtRatio(row.ratio)}%
            </span>
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-16 h-1.5 bg-neutral-800 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${barColor}`}
                  style={{ width: `${Math.min(row.ratio, 120) / 1.2}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Top Issuers Section --

function TopIssuersSection({ issuers }: { issuers: TopIssuer[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Top Issuers
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px_40px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Issuer
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Outstanding
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Rating
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          State
        </span>
      </div>

      {/* Rows */}
      {issuers.map((issuer, i) => (
        <div
          key={`${issuer.name}-${i}`}
          className="grid grid-cols-[1fr_72px_48px_40px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
            {issuer.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAmt(issuer.outstanding)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-center ${ratingColor(issuer.rating)}`}>
            {issuer.rating}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {issuer.state}
          </span>
        </div>
      ))}

      {issuers.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">
          No data
        </div>
      )}
    </div>
  );
}

// -- Sector Breakdown Section --

function SectorBreakdownSection({ sectors }: { sectors: SectorBreakdown[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Sector Breakdown
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Sector
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Mkt Shr
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Avg Yld
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Spread
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => (
        <div
          key={sector.sector}
          className="grid grid-cols-[1fr_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {sector.sector}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(sector.marketShare)}
          </span>
          <span className="text-[8px] font-mono font-bold text-blue-400 text-right">
            {fmtYield(sector.avgYield)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtBps(sector.spread)}bp
          </span>
        </div>
      ))}

      {/* Market share bar visualization */}
      {sectors.length > 0 && (
        <div className="px-2 py-1.5 flex gap-px h-2">
          {sectors.map((sector) => (
            <div
              key={sector.sector}
              className="bg-blue-500/30 hover:bg-blue-500/50 transition-colors"
              style={{ width: `${sector.marketShare}%` }}
              title={`${sector.sector}: ${fmtPct(sector.marketShare)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -- Rating Changes Section --

function RatingChangesSection({ changes }: { changes: RatingChange[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Rating Changes
        </span>
        {changes.length > 0 && (
          <span className="text-[7px] font-mono text-neutral-600 ml-2">
            ({changes.length} recent)
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_32px_32px_44px_52px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Issuer
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Action
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          From
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          To
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Agency
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Date
        </span>
      </div>

      {/* Rows */}
      {changes.map((change, i) => {
        const badge = directionBadge(change.direction);
        return (
          <div
            key={`${change.issuer}-${i}`}
            className="grid grid-cols-[1fr_56px_32px_32px_44px_52px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {change.issuer}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}>
                {change.direction}
              </span>
            </div>
            <span className={`text-[8px] font-mono font-bold text-center ${ratingColor(change.fromRating)}`}>
              {change.fromRating}
            </span>
            <span className={`text-[8px] font-mono font-bold text-center ${ratingColor(change.toRating)}`}>
              {change.toRating}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 text-center">
              {change.agency}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 text-right pr-2">
              {change.date}
            </span>
          </div>
        );
      })}

      {changes.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">
          No recent changes
        </div>
      )}
    </div>
  );
}

// -- New Issuance Section --

function NewIssuanceSection({ deals }: { deals: NewIssuanceDeal[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          New Issuance
        </span>
        {deals.length > 0 && (
          <span className="text-[7px] font-mono text-neutral-600 ml-2">
            ({deals.length} deals)
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Issuer
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Size
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Type
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Cpn
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Mat
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">
          Tax
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => {
        const badge = taxStatusBadge(deal.taxStatus);
        return (
          <div
            key={`${deal.issuer}-${i}`}
            className="grid grid-cols-[1fr_64px_56px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-blue-400 truncate">
              {deal.issuer}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtAmt(deal.size)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400 text-center truncate">
              {deal.type}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {deal.coupon != null ? `${deal.coupon.toFixed(2)}%` : '--'}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 text-right">
              {deal.maturity}
            </span>
            <div className="flex justify-center pr-2">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}>
                {deal.taxStatus}
              </span>
            </div>
          </div>
        );
      })}

      {deals.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">
          No recent deals
        </div>
      )}
    </div>
  );
}

// -- State Metrics Section --

function StateMetricsSection({ metrics }: { metrics: StateMetric[] }) {
  return (
    <div className="border-b border-blue-400/30">
      <div className="px-3 py-1 border-b border-blue-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          State Metrics
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_72px_64px_56px_48px] gap-0 px-2 py-0.5 border-b border-blue-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          State
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Debt/Cap
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Pension %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Outlook
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">
          Rtg
        </span>
      </div>

      {/* Rows */}
      {metrics.map((metric, i) => (
        <div
          key={`${metric.state}-${i}`}
          className="grid grid-cols-[40px_72px_64px_56px_48px] gap-0 px-2 py-[3px] border-b border-blue-400/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-blue-400">
            {metric.state}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtDebt(metric.debtPerCapita)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${metric.pensionFunding >= 80 ? 'bg-green-400' : metric.pensionFunding >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(metric.pensionFunding, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral-300 w-8 text-right">
              {fmtPct(metric.pensionFunding)}
            </span>
          </div>
          <span className={`text-[7px] font-mono font-bold text-center uppercase ${outlookColor(metric.creditOutlook)}`}>
            {metric.creditOutlook}
          </span>
          <span className={`text-[8px] font-mono font-bold text-center pr-2 ${ratingColor(metric.rating)}`}>
            {metric.rating}
          </span>
        </div>
      ))}

      {metrics.length === 0 && (
        <div className="text-center py-3 text-[7px] font-mono text-neutral-600 uppercase">
          No data
        </div>
      )}
    </div>
  );
}
