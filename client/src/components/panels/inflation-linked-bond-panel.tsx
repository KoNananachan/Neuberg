import { useInflationLinkedBond } from '../../api/hooks/use-inflation-linked-bond';
import { Loader2 } from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2) + '%';
}

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + 'bp';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(3);
}

function fmtBn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  return `$${(n / 1e9).toFixed(1)}B`;
}

function fmtReturnPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

// ── Color helpers ──

/** Positive real yields green, negative red */
function realYieldColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

/** Higher breakevens = warmer (orange/red), lower = cooler */
function breakevenColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 3.5) return 'text-red-400';
  if (n >= 3.0) return 'text-orange-300';
  if (n >= 2.5) return 'text-orange-400';
  if (n >= 2.0) return 'text-amber-400';
  if (n >= 1.5) return 'text-yellow-400';
  return 'text-blue-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return '\u2191';
  if (trend === 'falling' || trend === 'down') return '\u2193';
  if (trend === 'stable' || trend === 'flat') return '\u2192';
  return '\u2192';
}

function trendColor(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return 'text-red-400';
  if (trend === 'falling' || trend === 'down') return 'text-green-400';
  return 'text-neutral-500';
}

// ── Section header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#080808] border-b border-border/20">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-orange-400">
        {title}
      </span>
    </div>
  );
}

// ── 1. Summary Bar ──

function SummaryBar({ d }: { d: any }) {
  const s = d?.summary;
  if (!s) return null;

  const items = [
    { label: 'US 10Y REAL YLD', value: fmtPct(s.us10yRealYield), color: realYieldColor(s.us10yRealYield) },
    { label: 'BREAKEVEN', value: fmtPct(s.breakeven), color: breakevenColor(s.breakeven) },
    { label: 'REAL YLD TREND', value: `${trendArrow(s.realYieldTrend)} ${s.realYieldTrend ?? '--'}`, color: trendColor(s.realYieldTrend) },
    { label: 'INFL OUTLOOK', value: s.inflationOutlook ?? '--', color: 'text-orange-400' },
    { label: 'TIPS-NOM SPREAD', value: fmtBps(s.tipsNominalSpread), color: 'text-white/80' },
    { label: 'GLOBAL LNKR 1M', value: fmtReturnPct(s.globalLinker1mReturn), color: returnColor(s.globalLinker1mReturn) },
  ];

  return (
    <div className="grid grid-cols-6 border-b border-border/20">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-2 py-1.5 ${i < items.length - 1 ? 'border-r border-border/20' : ''}`}
        >
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {item.label}
          </div>
          <div className={`text-[10px] font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── 2. Inflation Expectations ──

function InflationExpectationsSection({ d }: { d: any }) {
  const exp = d?.inflationExpectations;
  if (!exp) return null;

  const surveys: any[] = exp.surveys ?? [];
  const marketImplied: any[] = exp.marketImplied ?? [];
  const forwards: any[] = exp.forwards ?? [];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Inflation Expectations" />

      {/* Forward rates (5y5y) */}
      {forwards.length > 0 && (
        <>
          <div className="px-2 py-0.5 bg-[#050505] border-b border-border/10">
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">5Y5Y FORWARDS</span>
          </div>
          <div className="grid grid-cols-[72px_64px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Region</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
          </div>
          {forwards.map((row: any) => (
            <div
              key={row.region ?? row.name}
              className="grid grid-cols-[72px_64px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white">{row.region ?? row.name}</span>
              <span className={`text-[8px] text-right ${breakevenColor(row.rate)}`}>{fmtPct(row.rate)}</span>
              <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
                {fmtChange(row.change)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Survey-based */}
      {surveys.length > 0 && (
        <>
          <div className="px-2 py-0.5 bg-[#050505] border-b border-border/10">
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">SURVEYS</span>
          </div>
          <div className="grid grid-cols-[120px_56px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Source</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Value</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
          </div>
          {surveys.map((row: any) => (
            <div
              key={row.name ?? row.source}
              className="grid grid-cols-[120px_56px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white truncate">{row.name ?? row.source}</span>
              <span className={`text-[8px] text-right ${breakevenColor(row.value)}`}>{fmtPct(row.value)}</span>
              <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
                {fmtChange(row.change)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Market-implied */}
      {marketImplied.length > 0 && (
        <>
          <div className="px-2 py-0.5 bg-[#050505] border-b border-border/10">
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">MARKET-IMPLIED</span>
          </div>
          <div className="grid grid-cols-[64px_56px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
          </div>
          {marketImplied.map((row: any) => (
            <div
              key={row.tenor}
              className="grid grid-cols-[64px_56px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white">{row.tenor}</span>
              <span className={`text-[8px] text-right ${breakevenColor(row.rate)}`}>{fmtPct(row.rate)}</span>
              <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
                {fmtChange(row.change)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── 3. Seasonal Adjustment ──

function SeasonalAdjustmentSection({ d }: { d: any }) {
  const seasonal = d?.seasonalAdjustment;
  if (!seasonal) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Seasonal Adjustment" />
      <div className="grid grid-cols-4 gap-0 px-2 py-1.5 border-b border-border/10">
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">CPI INDEX</div>
          <div className="text-[9px] font-bold text-white">{fmtRate(seasonal.cpiIndex)}</div>
        </div>
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">NEXT RESET</div>
          <div className="text-[9px] font-bold text-orange-400">{seasonal.nextReset ?? '--'}</div>
        </div>
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">PROJ ACCRUAL</div>
          <div className="text-[9px] font-bold text-white">{fmtPct(seasonal.projectedAccrual)}</div>
        </div>
        <div>
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">SEASONAL</div>
          <div className={`text-[9px] font-bold ${seasonal.seasonalPattern === 'strong' ? 'text-red-400' : seasonal.seasonalPattern === 'weak' ? 'text-blue-400' : 'text-neutral-400'}`}>
            {seasonal.seasonalPattern ?? '--'}
          </div>
        </div>
      </div>

      {/* Monthly seasonality bars */}
      {seasonal.monthly && seasonal.monthly.length > 0 && (
        <div className="px-2 py-2">
          <div className="flex items-end gap-1 h-12">
            {seasonal.monthly.map((m: any) => {
              const max = Math.max(...seasonal.monthly.map((x: any) => Math.abs(x.factor ?? 0)));
              const h = max > 0 ? (Math.abs(m.factor ?? 0) / max) * 100 : 0;
              const isPositive = (m.factor ?? 0) >= 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '36px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        height: `${h}%`,
                        background: isPositive ? '#fb923c' : '#60a5fa',
                        opacity: 0.4,
                      }}
                    />
                  </div>
                  <div className="text-[6px] text-neutral-500 mt-0.5">{m.month}</div>
                  <div
                    className="text-[6px] font-bold"
                    style={{ color: isPositive ? '#fb923c' : '#60a5fa' }}
                  >
                    {(m.factor ?? 0) > 0 ? '+' : ''}{fmtRate(m.factor)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4a. Global Market ──

function GlobalMarketTable({ rows }: { rows: any[] | undefined }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Global Inflation-Linked Bond Market" />
      <div className="grid grid-cols-[56px_56px_52px_52px_44px_44px_40px_72px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Outstdg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Dur</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Infl Idx</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.country}
          className="grid grid-cols-[56px_56px_52px_52px_44px_44px_40px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-orange-400 truncate">{row.country}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtBn(row.outstanding)}</span>
          <span className={`text-[8px] font-bold text-right ${realYieldColor(row.realYield)}`}>
            {fmtPct(row.realYield)}
          </span>
          <span className={`text-[8px] font-bold text-right ${breakevenColor(row.breakeven)}`}>
            {fmtPct(row.breakeven)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1d)}`}>
            {fmtBps(row.change1d)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1w)}`}>
            {fmtBps(row.change1w)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.duration)}</span>
          <span className="text-[8px] text-neutral-300 text-right pr-1 truncate">{row.inflationIndex ?? '--'}</span>
        </div>
      ))}
    </div>
  );
}

// ── 4b. Real Yield Curve ──

function RealYieldCurveTable({ rows }: { rows: any[] | undefined }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Real Yield Curve" />
      <div className="grid grid-cols-[40px_52px_52px_52px_44px_44px_72px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Nominal</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">52W Range</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[40px_52px_52px_52px_44px_44px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className={`text-[8px] font-bold text-right ${realYieldColor(row.realYield)}`}>
            {fmtPct(row.realYield)}
          </span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.nominalYield)}</span>
          <span className={`text-[8px] font-bold text-right ${breakevenColor(row.breakeven)}`}>
            {fmtPct(row.breakeven)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1d)}`}>
            {fmtBps(row.change1d)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1w)}`}>
            {fmtBps(row.change1w)}
          </span>
          <span className="text-[7px] text-neutral-400 text-right pr-1">
            {row.low52w != null && row.high52w != null
              ? `${fmtRate(row.low52w)}-${fmtRate(row.high52w)}`
              : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4c. TIPS Detail ──

function TipsDetailTable({ rows }: { rows: any[] | undefined }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="TIPS Detail" />
      <div className="grid grid-cols-[64px_52px_36px_48px_48px_48px_48px_36px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">CUSIP</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Maturity</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Cpn</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Idx Ratio</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Dur</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.cusip}
          className="grid grid-cols-[64px_52px_36px_48px_48px_48px_48px_36px_40px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-orange-400/80 tracking-wide">{row.cusip}</span>
          <span className="text-[8px] text-neutral-300 text-right">{row.maturity ?? '--'}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.coupon)}</span>
          <span className={`text-[8px] font-bold text-right ${realYieldColor(row.realYield)}`}>
            {fmtPct(row.realYield)}
          </span>
          <span className={`text-[8px] font-bold text-right ${breakevenColor(row.breakeven)}`}>
            {fmtPct(row.breakeven)}
          </span>
          <span className="text-[8px] text-white text-right">{fmtPrice(row.price)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPrice(row.indexRatio)}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.duration)}</span>
          <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
            {fmtBps(row.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4d. ETF Trackers ──

function EtfTrackersTable({ rows }: { rows: any[] | undefined }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Inflation-Linked Bond ETF Trackers" />
      <div className="grid grid-cols-[48px_96px_56px_44px_48px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Ticker</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">AUM</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Yield</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1M Ret</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">YTD Ret</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Flow</span>
      </div>
      {rows.map((row: any) => (
        <div
          key={row.ticker}
          className="grid grid-cols-[48px_96px_56px_44px_48px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-orange-400">{row.ticker}</span>
          <span className="text-[8px] text-neutral-300 truncate">{row.name ?? '--'}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtBn(row.aum)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.yield)}</span>
          <span className={`text-[8px] font-bold text-right ${returnColor(row.return1m)}`}>
            {fmtReturnPct(row.return1m)}
          </span>
          <span className={`text-[8px] font-bold text-right ${returnColor(row.returnYtd)}`}>
            {fmtReturnPct(row.returnYtd)}
          </span>
          <span className={`text-[7px] font-bold text-right pr-1 ${returnColor(row.flow)}`}>
            {fmtBn(row.flow)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function InflationLinkedBondPanel() {
  const { data, isLoading, error } = useInflationLinkedBond();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono uppercase tracking-wider">
          Failed to load inflation-linked bond data
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* 1. Summary Bar */}
        <SummaryBar d={data} />

        {/* 2. Inflation Expectations */}
        <InflationExpectationsSection d={data} />

        {/* 3. Seasonal Adjustment */}
        <SeasonalAdjustmentSection d={data} />

        {/* 4a. Global Market */}
        <GlobalMarketTable rows={data.globalMarket} />

        {/* 4b. Real Yield Curve */}
        <RealYieldCurveTable rows={data.realYieldCurve} />

        {/* 4c. TIPS Detail */}
        <TipsDetailTable rows={data.tipsDetail} />

        {/* 4d. ETF Trackers */}
        <EtfTrackersTable rows={data.etfTrackers} />
      </div>
    </div>
  );
}
