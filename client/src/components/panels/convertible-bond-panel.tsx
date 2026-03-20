import { useState } from 'react';
import { useConvertibleBond } from '../../api/hooks/use-convertible-bond';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtB(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function cheapnessColor(n: number): string {
  if (n >= 3) return 'text-green-400';
  if (n >= 1) return 'text-emerald-400';
  if (n >= -1) return 'text-yellow-400';
  if (n >= -3) return 'text-orange-400';
  return 'text-red-400';
}

function cheapnessBg(n: number): string {
  if (n >= 3) return 'bg-green-500/10 border-green-500/30';
  if (n >= 1) return 'bg-emerald-500/10 border-emerald-500/30';
  if (n >= -1) return 'bg-yellow-500/10 border-yellow-500/30';
  if (n >= -3) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function cheapnessLabel(n: number): string {
  if (n >= 3) return 'VERY CHEAP';
  if (n >= 1) return 'CHEAP';
  if (n >= -1) return 'FAIR';
  if (n >= -3) return 'RICH';
  return 'VERY RICH';
}

function pricingBadge(pricing: string): { text: string; cls: string } {
  const p = pricing?.toUpperCase() ?? '';
  if (p === 'TIGHT' || p === 'AGGRESSIVE')
    return { text: p, cls: 'bg-red-500/10 text-red-400 border border-red-500/30' };
  if (p === 'FAIR' || p === 'INLINE')
    return { text: p, cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' };
  if (p === 'WIDE' || p === 'ATTRACTIVE')
    return { text: p, cls: 'bg-green-500/10 text-green-400 border border-green-500/30' };
  return { text: pricing ?? '--', cls: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/30' };
}

// ── Gauge bar helpers ──

function gaugeWidth(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / (max - min)) * 100;
}

function gaugeColor(value: number, isNegativeBetter: boolean): string {
  if (isNegativeBetter) {
    if (value < -0.3) return '#4ade80';
    if (value < 0) return '#22c55e';
    if (value < 0.3) return '#eab308';
    return '#ef4444';
  }
  if (value > 0.5) return '#4ade80';
  if (value > 0.2) return '#22c55e';
  if (value > 0) return '#eab308';
  return '#ef4444';
}

// ── Tab type ──

type Tab = 'OVERVIEW' | 'BONDS' | 'GREEKS' | 'ISSUANCE';

// ── SVG Icon ──

function CBIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1" y="3" width="10" height="10" rx="1" fill="#e879f9" opacity="0.3" />
      <path d="M5 8L8 5L11 8L8 11Z" fill="#e879f9" opacity="0.7" />
      <circle cx="11" cy="5" r="3.5" fill="none" stroke="#e879f9" strokeWidth="1" opacity="0.9" />
      <path d="M10 4L12 4L12 6" stroke="#e879f9" strokeWidth="0.8" opacity="0.9" />
    </svg>
  );
}

// ── Main Panel ──

export function ConvertibleBondPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useConvertibleBond();
  const [tab, setTab] = useState<Tab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <CBIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'cbConvertibleBondMonitor', 'Convertible Bond Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['OVERVIEW', 'BONDS', 'GREEKS', 'ISSUANCE'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-fuchsia-400 text-fuchsia-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'OVERVIEW' && <OverviewTab data={data} t={t} />}
        {data && tab === 'BONDS' && <BondsTab data={data} t={t} />}
        {data && tab === 'GREEKS' && <GreeksTab data={data} t={t} />}
        {data && tab === 'ISSUANCE' && <IssuanceTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── Metric Card ──

function MetricCard({
  label,
  value,
  change,
  sub,
}: {
  label: string;
  value: string;
  change?: number;
  sub?: string;
}) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider leading-tight">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] font-mono font-bold text-white">{value}</span>
        {change != null && (
          <span className={`text-[8px] font-mono font-bold ${changeColor(change)}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}
          </span>
        )}
      </div>
      {sub && (
        <div className="text-[7px] font-mono text-neutral-600 mt-0.5 leading-tight">{sub}</div>
      )}
    </div>
  );
}

// ── OVERVIEW TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ data, t }: { data: any; t: TFn }) {
  const market = data?.market;
  const arb = data?.arbitrage;
  const sectors = data?.sectors;

  return (
    <div>
      {/* Market Overview */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbMarketOverview', 'Market Overview')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <MetricCard
            label={tr(t, 'cbOutstanding', 'Outstanding')}
            value={market?.outstanding != null ? fmtB(market.outstanding) : '--'}
          />
          <MetricCard
            label={tr(t, 'cbIssuanceYtd', 'Issuance YTD')}
            value={market?.issuanceYtd != null ? fmtB(market.issuanceYtd) : '--'}
          />
          <MetricCard
            label={tr(t, 'cbAvgPremium', 'Avg Premium')}
            value={market?.avgPremium != null ? fmtPct(market.avgPremium) : '--'}
          />
          <MetricCard
            label={tr(t, 'cbAvgDelta', 'Avg Delta')}
            value={market?.avgDelta != null ? market.avgDelta.toFixed(3) : '--'}
          />
          <MetricCard
            label={tr(t, 'cbAvgYtm', 'Avg YTM')}
            value={market?.avgYtm != null ? fmtPct(market.avgYtm) : '--'}
          />
          <MetricCard
            label={tr(t, 'cbAvgCoupon', 'Avg Coupon')}
            value={market?.avgCoupon != null ? fmtPct(market.avgCoupon) : '--'}
          />
        </div>
      </div>

      {/* Arbitrage Metrics */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbArbitrage', 'Arbitrage Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cbAvgCheapness', 'Avg Cheapness')}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-mono font-bold ${arb?.avgCheapness != null ? cheapnessColor(arb.avgCheapness) : 'text-neutral-500'}`}>
                {arb?.avgCheapness != null ? arb.avgCheapness.toFixed(2) : '--'}
              </span>
              {arb?.avgCheapness != null && (
                <span className={`px-1 py-0 text-[6px] font-mono font-bold uppercase border ${cheapnessBg(arb.avgCheapness)} ${cheapnessColor(arb.avgCheapness)}`}>
                  {cheapnessLabel(arb.avgCheapness)}
                </span>
              )}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cbCheapRich', 'Cheap / Rich Bonds')}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-green-400">
                {arb?.cheapBonds ?? '--'}
                <span className="text-[7px] text-neutral-600 ml-0.5">CHEAP</span>
              </span>
              <span className="text-[7px] text-neutral-600">/</span>
              <span className="text-[10px] font-mono font-bold text-red-400">
                {arb?.richBonds ?? '--'}
                <span className="text-[7px] text-neutral-600 ml-0.5">RICH</span>
              </span>
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cbImpliedVsRealized', 'Implied vs Realized Vol')}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-white">
                {arb?.impliedVol != null ? fmtVol(arb.impliedVol) : '--'}
              </span>
              <span className="text-[7px] text-neutral-600">vs</span>
              <span className="text-[10px] font-mono font-bold text-neutral-400">
                {arb?.realizedVol != null ? fmtVol(arb.realizedVol) : '--'}
              </span>
              {arb?.impliedVol != null && arb?.realizedVol != null && (
                <span className={`text-[8px] font-mono font-bold ${changeColor(arb.impliedVol - arb.realizedVol)}`}>
                  {arb.impliedVol - arb.realizedVol >= 0 ? '+' : ''}{(arb.impliedVol - arb.realizedVol).toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'cbHedgeCost', 'Hedge Cost')}
            </div>
            <div className="mt-0.5">
              <span className="text-[10px] font-mono font-bold text-white">
                {arb?.hedgeCost != null ? fmtBps(arb.hedgeCost) : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbSectorBreakdown', 'Sector Breakdown')}
          </span>
        </div>
        {sectors && sectors.length > 0 ? (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_60px_50px_50px_50px_55px] px-2 py-1 border-b border-border/20">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'cbSector', 'Sector')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbCount', 'Count')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbAvgPrem', 'Prem')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbAvgDlt', 'Delta')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbAvgYtmShort', 'YTM')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbWeight', 'Weight')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sectors.map((s: any, i: number) => (
              <div
                key={s?.name ?? i}
                className="grid grid-cols-[1fr_60px_50px_50px_50px_55px] px-2 py-1 border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-1 h-3 shrink-0"
                    style={{ backgroundColor: `rgba(232,121,249,${0.3 + (i * 0.07)})` }}
                  />
                  <span className="text-[9px] font-mono font-bold text-white truncate">
                    {s?.name ?? '--'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {s?.count ?? '--'}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {s?.avgPremium != null ? fmtPct(s.avgPremium) : '--'}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {s?.avgDelta != null ? s.avgDelta.toFixed(2) : '--'}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {s?.avgYtm != null ? fmtPct(s.avgYtm) : '--'}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <div className="w-8 h-[4px] bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${s?.weight != null ? Math.min(s.weight, 100) : 0}%`,
                        backgroundColor: '#e879f9',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-fuchsia-400">
                    {s?.weight != null ? fmtPct(s.weight) : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoSectors', 'No sector data')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BONDS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BondsTab({ data, t }: { data: any; t: TFn }) {
  const bonds = data?.bonds;

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbBondTable', 'Convertible Bond Universe')}
          </span>
        </div>
        {bonds && bonds.length > 0 ? (
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(90px,1.2fr)_45px_55px_60px_50px_45px_50px_45px_50px_55px_50px_60px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'cbIssuer', 'Issuer')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbCpn', 'CPN')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbMat', 'MAT')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbConvPx', 'CONV PX')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbPrem', 'PREM')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbDelta', 'DELTA')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbPrice', 'PRICE')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbYtmH', 'YTM')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbIvol', 'IVOL')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbSpread', 'SPREAD')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbParity', 'PARITY')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                {tr(t, 'cbCheapness', 'CHEAP')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {bonds.map((b: any, i: number) => (
              <div
                key={b?.issuer ?? i}
                className="grid grid-cols-[minmax(90px,1.2fr)_45px_55px_60px_50px_45px_50px_45px_50px_55px_50px_60px] px-2 py-1 border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
              >
                {/* Issuer */}
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold text-white truncate block">
                    {b?.issuer ?? '--'}
                  </span>
                </div>
                {/* Coupon */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.coupon != null ? fmtPct(b.coupon) : '--'}
                </span>
                {/* Maturity */}
                <span className="text-[8px] font-mono text-neutral-500 text-right">
                  {b?.maturity ?? '--'}
                </span>
                {/* Conversion Price */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.conversionPrice != null ? `$${fmtPrice(b.conversionPrice)}` : '--'}
                </span>
                {/* Premium */}
                <span className="text-[9px] font-mono text-fuchsia-400 text-right">
                  {b?.premium != null ? fmtPct(b.premium) : '--'}
                </span>
                {/* Delta */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.delta != null ? b.delta.toFixed(2) : '--'}
                </span>
                {/* Price */}
                <span className="text-[9px] font-mono font-bold text-white text-right">
                  {b?.price != null ? fmtPrice(b.price) : '--'}
                </span>
                {/* YTM */}
                <span className={`text-[9px] font-mono text-right ${b?.ytm != null && b.ytm > 0 ? 'text-green-400' : 'text-neutral-400'}`}>
                  {b?.ytm != null ? fmtPct(b.ytm) : '--'}
                </span>
                {/* Implied Vol */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.impliedVol != null ? fmtVol(b.impliedVol) : '--'}
                </span>
                {/* Credit Spread */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.creditSpread != null ? fmtBps(b.creditSpread) : '--'}
                </span>
                {/* Parity */}
                <span className="text-[9px] font-mono text-neutral-400 text-right">
                  {b?.parity != null ? fmtPrice(b.parity) : '--'}
                </span>
                {/* Cheapness */}
                <div className="flex justify-center">
                  {b?.cheapness != null ? (
                    <span
                      className={`px-1 py-0 text-[7px] font-mono font-bold uppercase border ${cheapnessBg(b.cheapness)} ${cheapnessColor(b.cheapness)}`}
                    >
                      {b.cheapness >= 0 ? '+' : ''}{b.cheapness.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[7px] font-mono text-neutral-600">--</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoBonds', 'No bond data available')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── GREEKS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GreeksTab({ data, t }: { data: any; t: TFn }) {
  const greeks = data?.greeks;

  const greekEntries = [
    {
      name: 'Delta',
      key: 'delta',
      value: greeks?.delta,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbDeltaDesc', 'Equity sensitivity'),
      negBetter: false,
    },
    {
      name: 'Gamma',
      key: 'gamma',
      value: greeks?.gamma,
      min: 0,
      max: 0.1,
      format: (v: number) => v.toFixed(4),
      desc: tr(t, 'cbGammaDesc', 'Delta rate of change'),
      negBetter: false,
    },
    {
      name: 'Vega',
      key: 'vega',
      value: greeks?.vega,
      min: 0,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbVegaDesc', 'Volatility sensitivity'),
      negBetter: false,
    },
    {
      name: 'Theta',
      key: 'theta',
      value: greeks?.theta,
      min: -0.5,
      max: 0,
      format: (v: number) => v.toFixed(4),
      desc: tr(t, 'cbThetaDesc', 'Time decay'),
      negBetter: true,
    },
    {
      name: 'Rho',
      key: 'rho',
      value: greeks?.rho,
      min: -1,
      max: 1,
      format: (v: number) => v.toFixed(3),
      desc: tr(t, 'cbRhoDesc', 'Interest rate sensitivity'),
      negBetter: false,
    },
  ];

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbGreeksSummary', 'Portfolio Greeks Summary')}
          </span>
        </div>

        {greeks ? (
          <div className="px-3 py-2 space-y-3">
            {greekEntries.map((g) => (
              <div key={g.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-mono font-black text-fuchsia-400 uppercase">
                      {g.name}
                    </span>
                    <span className="text-[7px] font-mono text-neutral-600">{g.desc}</span>
                  </div>
                  <span className="text-[11px] font-mono font-black text-white">
                    {g.value != null ? g.format(g.value) : '--'}
                  </span>
                </div>
                {/* Gauge bar */}
                <div className="relative h-[6px] bg-white/[0.04] w-full">
                  {g.value != null && (
                    <>
                      <div
                        className="absolute top-0 h-full transition-all"
                        style={{
                          width: `${gaugeWidth(g.value, g.min, g.max)}%`,
                          backgroundColor: gaugeColor(g.value, g.negBetter),
                          opacity: 0.7,
                        }}
                      />
                      {/* Marker */}
                      <div
                        className="absolute top-[-2px] w-[2px] h-[10px] bg-white"
                        style={{
                          left: `calc(${gaugeWidth(g.value, g.min, g.max)}% - 1px)`,
                        }}
                      />
                    </>
                  )}
                  {/* Scale labels */}
                  <div className="absolute -bottom-3 left-0 text-[6px] font-mono text-neutral-700">
                    {g.min}
                  </div>
                  <div className="absolute -bottom-3 right-0 text-[6px] font-mono text-neutral-700">
                    {g.max}
                  </div>
                </div>
                {/* Additional metrics row */}
                {greeks?.[`${g.key}Change`] != null && (
                  <div className="flex items-center gap-3 mt-2.5">
                    <span className="text-[7px] font-mono text-neutral-600 uppercase">1D CHG</span>
                    <span className={`text-[8px] font-mono font-bold ${changeColor(greeks[`${g.key}Change`])}`}>
                      {greeks[`${g.key}Change`] >= 0 ? '+' : ''}
                      {greeks[`${g.key}Change`].toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoGreeks', 'No greeks data available')}
          </div>
        )}
      </div>

      {/* Greeks Distribution */}
      {greeks?.distribution && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cbDeltaDistribution', 'Delta Distribution')}
            </span>
          </div>
          <div className="px-3 py-2">
            <div className="flex items-end gap-[2px] h-12">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {greeks.distribution.map((d: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full transition-all"
                    style={{
                      height: `${Math.max((d?.count ?? 0) * 4, 2)}px`,
                      backgroundColor: '#e879f9',
                      opacity: 0.3 + (i * 0.08),
                    }}
                  />
                  <span className="text-[6px] font-mono text-neutral-600 mt-0.5">
                    {d?.range ?? ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ISSUANCE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IssuanceTab({ data, t }: { data: any; t: TFn }) {
  const issuances = data?.recentIssuance;

  return (
    <div>
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cbRecentIssuance', 'Recent Issuance')}
          </span>
        </div>
        {issuances && issuances.length > 0 ? (
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(90px,1.2fr)_65px_50px_55px_60px_minmax(70px,1fr)_55px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'cbIssuer', 'Issuer')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbSize', 'SIZE')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbCpn', 'CPN')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbPremH', 'PREM')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right">
                {tr(t, 'cbMatH', 'MAT')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'cbUnderwriter', 'UNDERWRITER')}
              </span>
              <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
                {tr(t, 'cbPricing', 'PRICING')}
              </span>
            </div>
            {/* Rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {issuances.map((iss: any, i: number) => {
              const badge = pricingBadge(iss?.pricing);
              return (
                <div
                  key={iss?.issuer ?? i}
                  className="grid grid-cols-[minmax(90px,1.2fr)_65px_50px_55px_60px_minmax(70px,1fr)_55px] px-2 py-1.5 border-b border-border/10 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
                >
                  {/* Issuer */}
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-white truncate block">
                      {iss?.issuer ?? '--'}
                    </span>
                    {iss?.date && (
                      <span className="text-[7px] font-mono text-neutral-600">{iss.date}</span>
                    )}
                  </div>
                  {/* Size */}
                  <span className="text-[9px] font-mono font-bold text-white text-right">
                    {iss?.size != null ? fmtB(iss.size) : '--'}
                  </span>
                  {/* Coupon */}
                  <span className="text-[9px] font-mono text-neutral-400 text-right">
                    {iss?.coupon != null ? fmtPct(iss.coupon) : '--'}
                  </span>
                  {/* Premium */}
                  <span className="text-[9px] font-mono text-fuchsia-400 text-right">
                    {iss?.premium != null ? fmtPct(iss.premium) : '--'}
                  </span>
                  {/* Maturity */}
                  <span className="text-[8px] font-mono text-neutral-500 text-right">
                    {iss?.maturity ?? '--'}
                  </span>
                  {/* Underwriter */}
                  <span className="text-[8px] font-mono text-neutral-400 truncate">
                    {iss?.underwriter ?? '--'}
                  </span>
                  {/* Pricing Badge */}
                  <div className="flex justify-center">
                    <span
                      className={`px-1 py-0 text-[6px] font-mono font-bold uppercase tracking-wider ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoIssuance', 'No recent issuance data')}
          </div>
        )}
      </div>
    </div>
  );
}
