import { useMunicipalBondMonitor } from '../../api/hooks/use-municipal-bond-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtYield(n: number): string {
  return n.toFixed(2);
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

// ── Color helpers ──

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

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadChangeColor(n: number): string {
  // Wider = bad (red), tighter = good (green)
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function statusBadge(status: string): { text: string; bg: string } {
  switch (status?.toUpperCase()) {
    case 'PRICED':
      return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
    case 'PRICING':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
    case 'UPCOMING':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
    case 'POSTPONED':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  }
}

// ── Main Panel ──

export function MunicipalBondMonitorPanel() {
  const t = useT();
  const { data, isLoading, error } = useMunicipalBondMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'muniBondTitle', 'Municipal Bond Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.marketStats && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-lime-400 bg-lime-500/10 border border-lime-500/30">
              {fmtAmt(d.marketStats.totalOutstanding)} OUTSTANDING
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            {d.yieldCurves && <YieldCurvesSection data={d.yieldCurves} t={t} />}
            {d.taxEquivalent && <TaxEquivalentSection data={d.taxEquivalent} t={t} />}
            {d.marketStats && <MarketStatsSection data={d.marketStats} t={t} />}
            {d.sectorBreakdown && <SectorBreakdownSection data={d.sectorBreakdown} t={t} />}
            {d.newIssuance && <NewIssuanceSection data={d.newIssuance} t={t} />}
            {d.topMovers && <TopMoversSection data={d.topMovers} t={t} />}
            {d.timestamp && (
              <div className="px-3 py-1.5 border-t border-border/10">
                <span className="text-[7px] font-mono text-neutral-700">
                  {tr(t, 'muniUpdated', 'Updated')}: {new Date(d.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Yield Curves ──

function YieldCurvesSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const tenors = data?.tenors ?? ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];
  const ratings = data?.ratings ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniYieldCurves', 'Muni Yield Curves by Rating')}
        </span>
      </div>

      {/* Table header */}
      <div className="flex px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="w-12 text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'muniRating', 'Rating')}
        </span>
        {tenors.map((tenor: string) => (
          <span key={tenor} className="flex-1 text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tenor}
          </span>
        ))}
      </div>

      {/* Rating rows */}
      {ratings.map((row: any) => (
        <div
          key={row.rating}
          className={`flex px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors border-l-2 ${ratingBorderColor(row.rating)}`}
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

// ── Section 2: Tax Equivalent Yields ──

function TaxEquivalentSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const comparisons = data?.comparisons ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniTaxEquiv', 'Tax Equivalent Yields')}
        </span>
        {data?.taxBracket && (
          <span className="text-[7px] font-mono text-neutral-600 ml-2">
            ({fmtPct(data.taxBracket)} bracket)
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'muniTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniMuniYld', 'Muni')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniTaxEquivYld', 'Tax Eq')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniTsyYld', 'TSY')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniRatio', 'Ratio')}
        </span>
      </div>

      {/* Rows */}
      {comparisons.map((row: any) => {
        const ratio = row.muniTreasuryRatio ?? 0;
        const ratioColor = ratio > 100 ? 'text-green-400' : ratio > 85 ? 'text-yellow-400' : 'text-neutral-400';

        return (
          <div
            key={row.tenor}
            className="grid grid-cols-[80px_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.tenor}</span>
            <span className="text-[8px] font-mono font-bold text-lime-400 text-right">
              {fmtYield(row.muniYield ?? 0)}%
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtYield(row.taxEquivYield ?? 0)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtYield(row.treasuryYield ?? 0)}%
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${ratioColor}`}>
              {fmtPct(ratio)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 3: Market Stats ──

function MarketStatsSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const stats = [
    {
      label: tr(t, 'muniTotalOutstanding', 'Total Outstanding'),
      value: data.totalOutstanding ? fmtAmt(data.totalOutstanding) : '--',
    },
    {
      label: tr(t, 'muniIssuanceVol', 'Issuance Volume (30D)'),
      value: data.issuanceVolume30d ? fmtAmt(data.issuanceVolume30d) : '--',
    },
    {
      label: tr(t, 'muniFundFlows', 'Fund Flows (Weekly)'),
      value: data.fundFlowsWeekly != null ? `${data.fundFlowsWeekly >= 0 ? '+' : ''}${fmtAmt(Math.abs(data.fundFlowsWeekly))}` : '--',
      color: data.fundFlowsWeekly != null ? (data.fundFlowsWeekly >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white',
    },
    {
      label: tr(t, 'muniADRatio', 'A/D Ratio'),
      value: data.advanceDeclineRatio != null ? data.advanceDeclineRatio.toFixed(2) : '--',
      color: data.advanceDeclineRatio != null ? (data.advanceDeclineRatio >= 1 ? 'text-green-400' : 'text-red-400') : 'text-white',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniMarketStats', 'Market Statistics')}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-1.5 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {stat.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${stat.color ?? 'text-white'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 4: Sector Breakdown ──

function SectorBreakdownSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const sectors = data ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_52px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'muniSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniAvgYld', 'Avg Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniSpread', 'Sprd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniIssuance', 'Issuance')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniMktShare', 'Mkt Shr')}
        </span>
      </div>

      {/* Sector rows */}
      {sectors.map((sector: any) => (
        <div
          key={sector.name}
          className="grid grid-cols-[1fr_52px_52px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{sector.name}</span>
          <span className="text-[8px] font-mono font-bold text-lime-400 text-right">
            {fmtYield(sector.avgYield ?? 0)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadChangeColor(sector.spreadChange ?? 0)}`}>
            {fmtBps(sector.spread ?? 0)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {sector.issuance ? fmtAmt(sector.issuance) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {sector.marketShare != null ? fmtPct(sector.marketShare) : '--'}
          </span>
        </div>
      ))}

      {/* Market share bar visualization */}
      {sectors.length > 0 && (
        <div className="px-2 py-1.5 flex gap-px h-2">
          {sectors.map((sector: any) => {
            const share = sector.marketShare ?? 0;
            return (
              <div
                key={sector.name}
                className="bg-lime-500/30 hover:bg-lime-500/50 transition-colors"
                style={{ width: `${share}%` }}
                title={`${sector.name}: ${fmtPct(share)}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section 5: New Issuance ──

function NewIssuanceSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const deals = data ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniNewIssuance', 'New Issuance')}
        </span>
        {deals.length > 0 && (
          <span className="text-[7px] font-mono text-neutral-600 ml-2">
            ({deals.length} deals)
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_48px_44px_60px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'muniIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniAmount', 'Amount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'muniCoupon', 'Cpn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'muniRatingHdr', 'Rtg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'muniStatus', 'Status')}
        </span>
      </div>

      {/* Deal rows */}
      {deals.map((deal: any, i: number) => {
        const badge = statusBadge(deal.status);
        return (
          <div
            key={deal.issuer ?? i}
            className="grid grid-cols-[1fr_64px_48px_44px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
          >
            <div className="min-w-0">
              <span className="text-[8px] font-mono font-bold text-white truncate block">{deal.issuer}</span>
              {deal.maturity && (
                <span className="text-[7px] font-mono text-neutral-600">{deal.maturity}</span>
              )}
            </div>
            <span className="text-[8px] font-mono font-bold text-white text-right self-center">
              {deal.amount ? fmtAmt(deal.amount) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
              {deal.coupon != null ? `${deal.coupon.toFixed(2)}%` : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-center self-center ${ratingColor(deal.rating ?? '')}`}>
              {deal.rating ?? '--'}
            </span>
            <div className="flex justify-center self-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}>
                {deal.status}
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

// ── Section 6: Top Movers ──

function TopMoversSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const wideners = data?.wideners ?? [];
  const tighteners = data?.tighteners ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'muniTopMovers', 'Top Movers')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Wideners */}
        <div className="bg-black">
          <div className="px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-red-400 uppercase tracking-wider">
              {tr(t, 'muniWideners', 'Wideners')}
            </span>
          </div>
          {wideners.map((item: any, i: number) => (
            <div
              key={item.name ?? i}
              className="flex items-center justify-between px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono font-bold text-white truncate block">{item.name}</span>
                {item.rating && (
                  <span className={`text-[7px] font-mono ${ratingColor(item.rating)}`}>{item.rating}</span>
                )}
              </div>
              <div className="text-right ml-2">
                <span className="text-[8px] font-mono font-bold text-red-400">
                  +{fmtBps(Math.abs(item.spreadChange ?? 0))}bp
                </span>
                {item.spread != null && (
                  <span className="text-[7px] font-mono text-neutral-600 block">
                    {fmtBps(item.spread)}bp
                  </span>
                )}
              </div>
            </div>
          ))}
          {wideners.length === 0 && (
            <div className="text-center py-2 text-[7px] font-mono text-neutral-600">--</div>
          )}
        </div>

        {/* Tighteners */}
        <div className="bg-black">
          <div className="px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-green-400 uppercase tracking-wider">
              {tr(t, 'muniTighteners', 'Tighteners')}
            </span>
          </div>
          {tighteners.map((item: any, i: number) => (
            <div
              key={item.name ?? i}
              className="flex items-center justify-between px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono font-bold text-white truncate block">{item.name}</span>
                {item.rating && (
                  <span className={`text-[7px] font-mono ${ratingColor(item.rating)}`}>{item.rating}</span>
                )}
              </div>
              <div className="text-right ml-2">
                <span className="text-[8px] font-mono font-bold text-green-400">
                  -{fmtBps(Math.abs(item.spreadChange ?? 0))}bp
                </span>
                {item.spread != null && (
                  <span className="text-[7px] font-mono text-neutral-600 block">
                    {fmtBps(item.spread)}bp
                  </span>
                )}
              </div>
            </div>
          ))}
          {tighteners.length === 0 && (
            <div className="text-center py-2 text-[7px] font-mono text-neutral-600">--</div>
          )}
        </div>
      </div>
    </div>
  );
}
