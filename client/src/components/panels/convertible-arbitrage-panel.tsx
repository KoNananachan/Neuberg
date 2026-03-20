import { useState } from 'react';
import { useConvertibleArbitrage } from '../../api/hooks/use-convertible-arbitrage';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.08)';

type Tab = 'universe' | 'opportunities' | 'greeks' | 'volAnalysis' | 'summary';

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNotional(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtBp(n: number): string {
  return n.toFixed(0);
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Color helpers ──

function premiumColor(val: number): string {
  if (val > 5) return 'text-red-400';
  if (val < -5) return 'text-green-400';
  return 'text-neutral-400';
}

function volSpreadColor(spread: number): string {
  if (spread >= 5) return 'text-emerald-400';
  if (spread >= 2) return 'text-green-400';
  if (spread <= -5) return 'text-red-300';
  if (spread <= -2) return 'text-red-400';
  return 'text-neutral-400';
}

function cheapRichBadge(label: string): { text: string; bg: string } {
  const l = label.toLowerCase();
  if (l === 'cheap') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (l === 'rich') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function ratingBadge(rating: string): { text: string; bg: string } {
  const r = rating.toUpperCase();
  if (r.startsWith('AA')) return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (r.startsWith('A')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' };
  if (r.startsWith('BBB')) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (r.startsWith('BB')) return { text: 'text-orange-400', bg: 'bg-orange-500/10 border border-orange-500/30' };
  if (r.startsWith('B')) return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function strategyBadge(strategy: string): { text: string; bg: string } {
  const s = strategy.toLowerCase();
  if (s === 'gamma scalping' || s === 'gamma') return { text: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/30' };
  if (s === 'delta neutral' || s === 'delta hedge') return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
  if (s === 'credit arb' || s === 'credit') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (s === 'vol arb' || s === 'volatility') return { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border border-fuchsia-500/30' };
  if (s === 'busted convert' || s === 'busted') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  if (s === 'equity sensitive' || s === 'equity') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function convictionBadge(conviction: string): { text: string; bg: string } {
  const c = conviction.toLowerCase();
  if (c === 'high') return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' };
  if (c === 'medium' || c === 'med') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (c === 'low') return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

function greekColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function ConvertibleArbitragePanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useConvertibleArbitrage();
  const [activeTab, setActiveTab] = useState<Tab>('universe');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'universe', label: 'Universe' },
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'greeks', label: 'Greeks' },
    { key: 'volAnalysis', label: 'Vol Analysis' },
    { key: 'summary', label: 'Summary' },
  ];

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
          Loading convertible data...
        </span>
      </div>
    );
  }

  if (error || (!data && !isLoading)) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load convertible arbitrage data
        </span>
        <button
          onClick={() => refetch()}
          className="mt-1 px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider text-purple-400 border border-purple-400/30 hover:bg-purple-400/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'convArbTitle', 'Convertible Arbitrage')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider"
              style={{ color: ACCENT, background: ACCENT_DIM }}
            >
              {data.universe?.length ?? 0} Bonds
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-0 px-3 py-1 border-b border-border/20 bg-[#030303]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'text-purple-400 bg-purple-400/[0.08]'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {data && activeTab === 'universe' && <UniverseTab data={data} />}
        {data && activeTab === 'opportunities' && <OpportunitiesTab data={data} />}
        {data && activeTab === 'greeks' && <GreeksTab data={data} />}
        {data && activeTab === 'volAnalysis' && <VolAnalysisTab data={data} />}
        {data && activeTab === 'summary' && <SummaryTab data={data} />}
      </div>
    </div>
  );
}

// ── 1. Universe Tab ──

function UniverseTab({ data }: { data: any }) {
  const t = useT();
  const universe = data.universe ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_50px_38px_52px_52px_50px_50px_42px_42px_45px_50px_45px_38px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] shrink-0">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'convArbIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'convArbTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbCoupon', 'Cpn')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbMaturity', 'Mty')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbConvPx', 'Conv Px')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbParity', 'Parity')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbMktPx', 'Mkt Px')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbDelta', 'Delta')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbGamma', 'Gamma')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbIV', 'IV')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbSpread', 'Sprd')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbPremium', 'Prem%')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">
          {tr(t, 'convArbRating', 'Rtg')}
        </span>
      </div>

      {/* Rows */}
      {universe.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No convertible bonds found
        </div>
      )}
      {universe.map((bond: any, i: any) => {
        const badge = ratingBadge(bond.rating ?? '');
        return (
          <div
            key={`${bond.issuer}-${i}`}
            className="grid grid-cols-[1fr_50px_38px_52px_52px_50px_50px_42px_42px_45px_50px_45px_38px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            {/* Issuer */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {bond.issuer ?? '--'}
            </span>

            {/* Ticker */}
            <span className="text-[7px] font-mono text-neutral-500 text-center truncate">
              {bond.ticker ?? '--'}
            </span>

            {/* Coupon */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bond.coupon != null ? `${fmtNum(bond.coupon, 2)}` : '--'}
            </span>

            {/* Maturity */}
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
              {bond.maturity ?? '--'}
            </span>

            {/* Conversion Price */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bond.conversionPrice != null ? fmtPrice(bond.conversionPrice) : '--'}
            </span>

            {/* Parity */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bond.parity != null ? fmtPrice(bond.parity) : '--'}
            </span>

            {/* Market Price */}
            <span className="text-[8px] font-mono text-white font-bold text-right tabular-nums">
              {bond.marketPrice != null ? fmtPrice(bond.marketPrice) : '--'}
            </span>

            {/* Delta */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bond.delta != null ? bond.delta.toFixed(3) : '--'}
            </span>

            {/* Gamma */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {bond.gamma != null ? bond.gamma.toFixed(4) : '--'}
            </span>

            {/* Implied Vol */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {bond.impliedVol != null ? `${fmtNum(bond.impliedVol, 1)}%` : '--'}
            </span>

            {/* Credit Spread */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {bond.creditSpread != null ? `${fmtBp(bond.creditSpread)}bp` : '--'}
            </span>

            {/* Premium % */}
            <span
              className={`text-[8px] font-mono font-bold text-right tabular-nums ${premiumColor(bond.premium ?? 0)}`}
            >
              {bond.premium != null ? fmtPct(bond.premium) : '--'}
            </span>

            {/* Rating Badge */}
            <div className="flex justify-center pr-1">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}
              >
                {bond.rating ?? '--'}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── 2. Opportunities Tab ──

function OpportunitiesTab({ data }: { data: any }) {
  const t = useT();
  const opportunities = data.opportunities ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_75px_55px_45px_42px_42px_55px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] shrink-0">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'convArbIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'convArbStrategy', 'Strategy')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbExpReturn', 'Exp Ret')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbSharpe', 'Sharpe')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbDelta', 'Delta')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbVega', 'Vega')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">
          {tr(t, 'convArbConviction', 'Conviction')}
        </span>
      </div>

      {/* Rows */}
      {opportunities.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No opportunities found
        </div>
      )}
      {opportunities.map((opp: any, i: any) => {
        const strat = strategyBadge(opp.strategy ?? '');
        const conv = convictionBadge(opp.conviction ?? '');
        return (
          <div
            key={`${opp.issuer}-${i}`}
            className="grid grid-cols-[1fr_75px_55px_45px_42px_42px_55px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            {/* Issuer */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {opp.issuer ?? '--'}
            </span>

            {/* Strategy Badge */}
            <div className="flex justify-center">
              <span
                className={`px-1.5 py-px text-[6px] font-mono font-black uppercase border ${strat.text} ${strat.bg}`}
              >
                {opp.strategy ?? '--'}
              </span>
            </div>

            {/* Expected Return */}
            <span
              className={`text-[8px] font-mono font-bold text-right tabular-nums ${
                (opp.expectedReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {opp.expectedReturn != null ? fmtPct(opp.expectedReturn) : '--'}
            </span>

            {/* Sharpe */}
            <span
              className={`text-[8px] font-mono text-right tabular-nums ${
                (opp.sharpe ?? 0) >= 1.5 ? 'text-emerald-400' : (opp.sharpe ?? 0) >= 1 ? 'text-neutral-300' : 'text-neutral-500'
              }`}
            >
              {opp.sharpe != null ? fmtNum(opp.sharpe, 2) : '--'}
            </span>

            {/* Delta */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {opp.delta != null ? opp.delta.toFixed(3) : '--'}
            </span>

            {/* Vega */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {opp.vega != null ? opp.vega.toFixed(3) : '--'}
            </span>

            {/* Conviction Badge */}
            <div className="flex justify-center pr-1">
              <span
                className={`px-1.5 py-px text-[6px] font-mono font-black uppercase border ${conv.text} ${conv.bg}`}
              >
                {opp.conviction ?? '--'}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── 3. Greeks Tab ──

function GreeksTab({ data }: { data: any }) {
  const t = useT();
  const greeks = data.greeks ?? {};

  const cards = [
    {
      label: 'Delta',
      value: greeks.delta,
      fmt: (n: number) => n.toFixed(4),
      desc: 'Portfolio equity sensitivity',
    },
    {
      label: 'Gamma',
      value: greeks.gamma,
      fmt: (n: number) => n.toFixed(4),
      desc: 'Delta rate of change',
    },
    {
      label: 'Vega',
      value: greeks.vega,
      fmt: (n: number) => fmtNotional(n),
      desc: 'Vol sensitivity ($)',
    },
    {
      label: 'Theta',
      value: greeks.theta,
      fmt: (n: number) => fmtNotional(n),
      desc: 'Daily time decay ($)',
    },
    {
      label: 'Rho',
      value: greeks.rho,
      fmt: (n: number) => fmtNotional(n),
      desc: 'Rate sensitivity ($)',
    },
    {
      label: 'Credit DV01',
      value: greeks.creditDV01,
      fmt: (n: number) => fmtNotional(n),
      desc: 'Credit spread sens ($)',
    },
  ];

  return (
    <div className="p-2">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-2 px-1">
        {tr(t, 'convArbPortfolioGreeks', 'Portfolio Greeks Summary')}
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {cards.map((card: any) => {
          const val = card.value;
          const color = val != null ? greekColor(val) : 'text-neutral-500';
          return (
            <div key={card.label} className="bg-black px-3 py-3">
              <div className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider mb-1">
                {card.label}
              </div>
              <div className={`text-[14px] font-mono font-bold tabular-nums ${color}`}>
                {val != null ? card.fmt(val) : '--'}
              </div>
              <div className="text-[7px] font-mono text-neutral-600 mt-1">{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Per-position Greeks breakdown */}
      {data.greeksBreakdown?.length > 0 && (
        <div className="mt-3">
          <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
            Position Breakdown
          </div>
          <div className="grid grid-cols-[1fr_50px_50px_50px_50px_50px_55px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Name</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Delta</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Gamma</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Vega</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Theta</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Rho</span>
            <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Cr DV01</span>
          </div>
          {data.greeksBreakdown.map((row: any, i: any) => (
            <div
              key={`${row.name}-${i}`}
              className="grid grid-cols-[1fr_50px_50px_50px_50px_50px_55px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
                {row.name ?? '--'}
              </span>
              <span className={`text-[8px] font-mono text-right tabular-nums ${greekColor(row.delta ?? 0)}`}>
                {row.delta != null ? row.delta.toFixed(4) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
                {row.gamma != null ? row.gamma.toFixed(4) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
                {row.vega != null ? fmtNotional(row.vega) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${(row.theta ?? 0) < 0 ? 'text-red-400' : 'text-neutral-300'}`}>
                {row.theta != null ? fmtNotional(row.theta) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
                {row.rho != null ? fmtNotional(row.rho) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums pr-1">
                {row.creditDV01 != null ? fmtNotional(row.creditDV01) : '--'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 4. Vol Analysis Tab ──

function VolAnalysisTab({ data }: { data: any }) {
  const t = useT();
  const volData = data.volAnalysis ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_45px_45px_45px_50px_60px_50px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303] shrink-0">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'convArbIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbIV', 'IV')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbRV30', 'RV 30d')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbRV60', 'RV 60d')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'convArbVolSprd', 'Vol Sprd')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'convArbPctile', 'Percentile')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">
          {tr(t, 'convArbSignal', 'Signal')}
        </span>
      </div>

      {/* Rows */}
      {volData.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No volatility data available
        </div>
      )}
      {volData.map((row: any, i: any) => {
        const spread = (row.impliedVol ?? 0) - (row.realized30d ?? 0);
        const badge = cheapRichBadge(row.signal ?? '');
        const pctile = row.percentile ?? 0;

        return (
          <div
            key={`${row.issuer}-${i}`}
            className="grid grid-cols-[1fr_45px_45px_45px_50px_60px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            {/* Issuer */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {row.issuer ?? '--'}
            </span>

            {/* Implied Vol */}
            <span className="text-[8px] font-mono text-white text-right tabular-nums">
              {row.impliedVol != null ? `${fmtNum(row.impliedVol, 1)}%` : '--'}
            </span>

            {/* Realized 30d */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {row.realized30d != null ? `${fmtNum(row.realized30d, 1)}%` : '--'}
            </span>

            {/* Realized 60d */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {row.realized60d != null ? `${fmtNum(row.realized60d, 1)}%` : '--'}
            </span>

            {/* Vol Spread (colored) */}
            <span
              className={`text-[8px] font-mono font-bold text-right tabular-nums ${volSpreadColor(row.volSpread ?? spread)}`}
            >
              {row.volSpread != null ? fmtPct(row.volSpread) : fmtPct(spread)}
            </span>

            {/* Percentile Bar */}
            <div className="flex items-center gap-1 px-1">
              <div className="flex-1 h-[4px] bg-neutral-800 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, pctile))}%`,
                    backgroundColor: pctile >= 80 ? '#f87171' : pctile >= 60 ? '#fbbf24' : pctile >= 40 ? '#a3a3a3' : '#4ade80',
                  }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-500 tabular-nums w-[20px] text-right">
                {pctile}
              </span>
            </div>

            {/* Rich/Cheap Badge */}
            <div className="flex justify-center pr-1">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}
              >
                {row.signal ?? '--'}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── 5. Summary Tab ──

function SummaryTab({ data }: { data: any }) {
  const t = useT();
  const summary = data.summary ?? {};

  const cards = [
    {
      label: 'Universe Size',
      value: summary.universeSize != null ? String(summary.universeSize) : String(data.universe?.length ?? 0),
      detail: 'Total convertible bonds tracked',
      useAccent: true,
    },
    {
      label: 'Avg Premium',
      value: summary.avgPremium != null ? fmtPct(summary.avgPremium) : '--',
      detail: 'Average conversion premium',
      color: premiumColor(summary.avgPremium ?? 0),
    },
    {
      label: 'Avg Delta',
      value: summary.avgDelta != null ? summary.avgDelta.toFixed(3) : '--',
      detail: 'Average equity delta',
      color: 'text-white',
    },
    {
      label: 'Avg Credit Spread',
      value: summary.avgCreditSpread != null ? `${fmtBp(summary.avgCreditSpread)} bp` : '--',
      detail: 'Average OAS across universe',
      color: 'text-neutral-300',
    },
    {
      label: 'New Issuance',
      value: summary.newIssuance != null ? `$${fmtNotional(summary.newIssuance)}` : '--',
      detail: 'Recent new issue volume',
      useAccent: true,
    },
    {
      label: 'Total Market Cap',
      value: summary.totalMarketCap != null ? `$${fmtNotional(summary.totalMarketCap)}` : '--',
      detail: 'Universe market capitalization',
      color: 'text-white',
    },
  ];

  return (
    <div className="p-2">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-2 px-1">
        {tr(t, 'convArbOverview', 'Market Overview')}
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {cards.map((card: any) => (
          <div key={card.label} className="bg-black px-3 py-3">
            <div className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div
              className={`text-[12px] font-mono font-bold truncate ${card.useAccent ? '' : (card.color ?? 'text-white')}`}
              style={card.useAccent ? { color: ACCENT } : undefined}
            >
              {card.value}
            </div>
            <div className="text-[7px] font-mono text-neutral-600 mt-1">{card.detail}</div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10 px-1">
        <span className="text-[7px] font-mono text-neutral-700">
          Last update:{' '}
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--'}
        </span>
      </div>
    </div>
  );
}
