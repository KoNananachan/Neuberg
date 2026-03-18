import { useState } from 'react';
import { useConvertibleArb } from '../../api/hooks/use-convertible-arb';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#a78bfa';
const ACCENT_DIM = 'rgba(167,139,250,0.08)';

type Tab = 'positions' | 'greeks' | 'trades' | 'summary';

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

// ── Color helpers ──

function premiumColor(val: number): string {
  if (val > 5) return 'text-red-400';
  if (val < -5) return 'text-green-400';
  return 'text-neutral-400';
}

function cheapRichColor(label: string): string {
  if (label === 'cheap' || label === 'Cheap') return 'text-green-400';
  if (label === 'rich' || label === 'Rich') return 'text-red-400';
  return 'text-neutral-500';
}

function cheapRichBg(label: string): string {
  if (label === 'cheap' || label === 'Cheap') return 'bg-green-500/10 border-green-500/30';
  if (label === 'rich' || label === 'Rich') return 'bg-red-500/10 border-red-500/30';
  return 'bg-neutral-500/10 border-neutral-500/30';
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

function sideColor(side: string): { text: string; bg: string } {
  const s = side.toLowerCase();
  if (s === 'buy') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'sell') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

// ── Main Panel ──

export function ConvertibleArbPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useConvertibleArb();
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'positions', label: tr(t, 'caPositions', 'Positions') },
    { key: 'greeks', label: tr(t, 'caGreeks', 'Greeks') },
    { key: 'trades', label: tr(t, 'caTrades', 'Trades') },
    { key: 'summary', label: tr(t, 'caSummary', 'Summary') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'caTitle', 'Convertible Arb Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider"
              style={{ color: ACCENT, background: ACCENT_DIM }}
            >
              {data.positions?.length ?? 0} {tr(t, 'caActive', 'Active')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {data && <SummaryBar data={data} />}

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-0 px-3 py-1 border-b border-border/30 bg-[#030303]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'text-[#a78bfa] bg-[rgba(167,139,250,0.08)]'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'caNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'positions' && <PositionsTab data={data} />}
        {data && activeTab === 'greeks' && <GreeksTab data={data} />}
        {data && activeTab === 'trades' && <TradesTab data={data} />}
        {data && activeTab === 'summary' && <SummaryTab data={data} />}
      </div>
    </div>
  );
}

// ── Summary Bar (top, grid-cols-5) ──

function SummaryBar({ data }: { data: any }) {
  const t = useT();
  const summary = data.summary ?? {};

  const metrics = [
    {
      label: tr(t, 'caTotalNotional', 'Total Notional'),
      value: summary.totalNotional != null ? `$${fmtNotional(summary.totalNotional)}` : '--',
      color: 'text-white',
    },
    {
      label: tr(t, 'caAvgPremium', 'Avg Premium'),
      value: summary.avgPremium != null ? fmtPct(summary.avgPremium) : '--',
      color: premiumColor(summary.avgPremium ?? 0),
    },
    {
      label: tr(t, 'caAvgDelta', 'Avg Delta'),
      value: summary.avgDelta != null ? summary.avgDelta.toFixed(3) : '--',
      color: 'text-white',
    },
    {
      label: tr(t, 'caMostActive', 'Most Active'),
      value: summary.mostActive ?? '--',
      color: `text-[${ACCENT}]`,
      useAccent: true,
    },
    {
      label: tr(t, 'caAvgCheapRich', 'Avg Cheap/Rich'),
      value: summary.avgCheapRich ?? '--',
      color: cheapRichColor(summary.avgCheapRich ?? ''),
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 shrink-0">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {m.label}
          </div>
          <div
            className={`text-[9px] font-mono font-bold truncate ${m.useAccent ? '' : m.color}`}
            style={m.useAccent ? { color: ACCENT } : undefined}
          >
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Positions Tab ──

function PositionsTab({ data }: { data: any }) {
  const t = useT();
  const positions = data.positions ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_40px_50px_55px_50px_45px_55px_45px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] shrink-0">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'caIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'caRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caBondPx', 'Bond Px')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caTheoretical', 'Theo')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caPremium', 'Prem %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caDelta', 'Delta')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'caCheapRich', 'C/R')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'caSpread', 'Sprd')}
        </span>
      </div>

      {/* Rows */}
      {positions.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'caNoPositions', 'No positions')}
        </div>
      )}
      {positions.map((pos: any, i: number) => {
        const badge = ratingBadge(pos.rating ?? '');
        const crColor = cheapRichColor(pos.cheapRich ?? '');
        const crBg = cheapRichBg(pos.cheapRich ?? '');

        return (
          <div
            key={`${pos.issuer}-${i}`}
            className="grid grid-cols-[1fr_40px_50px_55px_50px_45px_55px_45px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Issuer */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
                {pos.issuer}
              </span>
              {pos.ticker && (
                <span className="text-[6px] font-mono text-neutral-600 truncate">
                  {pos.ticker}
                </span>
              )}
            </div>

            {/* Rating badge */}
            <div className="flex justify-center">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase ${badge.text} ${badge.bg}`}
              >
                {pos.rating ?? '--'}
              </span>
            </div>

            {/* Bond Price */}
            <span className="text-[8px] font-mono text-white text-right tabular-nums">
              {pos.bondPrice != null ? fmtPrice(pos.bondPrice) : '--'}
            </span>

            {/* Theoretical */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {pos.theoretical != null ? fmtPrice(pos.theoretical) : '--'}
            </span>

            {/* Premium % */}
            <span
              className={`text-[8px] font-mono font-bold text-right tabular-nums ${premiumColor(pos.premium ?? 0)}`}
            >
              {pos.premium != null ? fmtPct(pos.premium) : '--'}
            </span>

            {/* Delta */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {pos.delta != null ? pos.delta.toFixed(3) : '--'}
            </span>

            {/* Cheap/Rich */}
            <div className="flex justify-center">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${crColor} ${crBg}`}
              >
                {pos.cheapRich ?? '--'}
              </span>
            </div>

            {/* Spread (bp) */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums pr-1">
              {pos.spread != null ? fmtBp(pos.spread) : '--'}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Greeks Tab ──

function GreeksTab({ data }: { data: any }) {
  const t = useT();
  const greeks = data.greeks ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_50px_50px_50px_50px_50px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] shrink-0">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'caName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caDelta', 'Delta')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caGamma', 'Gamma')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caVega', 'Vega')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caTheta', 'Theta')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'caRho', 'Rho')}
        </span>
      </div>

      {/* Rows */}
      {greeks.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'caNoGreeks', 'No greeks data')}
        </div>
      )}
      {greeks.map((g: any, i: number) => (
        <div
          key={`${g.name}-${i}`}
          className="grid grid-cols-[1fr_50px_50px_50px_50px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
        >
          {/* Name */}
          <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {g.name}
          </span>

          {/* Delta */}
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {g.delta != null ? g.delta.toFixed(4) : '--'}
          </span>

          {/* Gamma */}
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {g.gamma != null ? g.gamma.toFixed(4) : '--'}
          </span>

          {/* Vega */}
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {g.vega != null ? g.vega.toFixed(4) : '--'}
          </span>

          {/* Theta (bearish/negative) */}
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${(g.theta ?? 0) < 0 ? 'text-red-400' : 'text-neutral-300'}`}>
            {g.theta != null ? g.theta.toFixed(4) : '--'}
          </span>

          {/* Rho */}
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums pr-1">
            {g.rho != null ? g.rho.toFixed(4) : '--'}
          </span>
        </div>
      ))}
    </>
  );
}

// ── Trades Tab ──

function TradesTab({ data }: { data: any }) {
  const t = useT();
  const trades = data.trades ?? [];

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_40px_55px_50px_45px_50px_50px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] shrink-0">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'caIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'caSide', 'Side')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caNotional', 'Notional')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'caPremium', 'Prem')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'caTime', 'Time')}
        </span>
      </div>

      {/* Rows */}
      {trades.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'caNoTrades', 'No recent trades')}
        </div>
      )}
      {trades.map((trade: any, i: number) => {
        const side = sideColor(trade.side ?? '');
        return (
          <div
            key={`${trade.issuer}-${trade.time}-${i}`}
            className="grid grid-cols-[1fr_40px_55px_50px_45px_50px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
          >
            {/* Issuer */}
            <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
              {trade.issuer}
            </span>

            {/* Side badge */}
            <div className="flex justify-center">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${side.text} ${side.bg}`}
              >
                {trade.side ?? '--'}
              </span>
            </div>

            {/* Notional ($M) */}
            <span className="text-[8px] font-mono text-white text-right tabular-nums">
              {trade.notional != null ? `$${fmtNotional(trade.notional)}` : '--'}
            </span>

            {/* Price */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {trade.price != null ? fmtPrice(trade.price) : '--'}
            </span>

            {/* Yield */}
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {trade.yield != null ? `${trade.yield.toFixed(2)}%` : '--'}
            </span>

            {/* Premium */}
            <span
              className={`text-[8px] font-mono font-bold text-right tabular-nums ${premiumColor(trade.premium ?? 0)}`}
            >
              {trade.premium != null ? fmtPct(trade.premium) : '--'}
            </span>

            {/* Time */}
            <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums pr-1">
              {trade.time ?? '--'}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Summary Tab ──

function SummaryTab({ data }: { data: any }) {
  const t = useT();
  const summary = data.summary ?? {};

  const cards = [
    {
      label: tr(t, 'caTotalNotional', 'Total Notional'),
      value: summary.totalNotional != null ? `$${fmtNotional(summary.totalNotional)}` : '--',
      detail: tr(t, 'caAcrossPositions', 'Across all positions'),
      color: 'text-white',
    },
    {
      label: tr(t, 'caAvgPremium', 'Avg Premium'),
      value: summary.avgPremium != null ? fmtPct(summary.avgPremium) : '--',
      detail: summary.avgPremium != null
        ? (summary.avgPremium > 0 ? tr(t, 'caAboveTheo', 'Above theoretical') : tr(t, 'caBelowTheo', 'Below theoretical'))
        : '',
      color: premiumColor(summary.avgPremium ?? 0),
    },
    {
      label: tr(t, 'caAvgDelta', 'Avg Delta'),
      value: summary.avgDelta != null ? summary.avgDelta.toFixed(3) : '--',
      detail: tr(t, 'caPortfolioSens', 'Portfolio equity sensitivity'),
      color: 'text-white',
    },
    {
      label: tr(t, 'caPositionCount', 'Position Count'),
      value: String(data.positions?.length ?? 0),
      detail: tr(t, 'caActiveConv', 'Active convertibles'),
      color: 'text-white',
      useAccent: true,
    },
    {
      label: tr(t, 'caMostActive', 'Most Active'),
      value: summary.mostActive ?? '--',
      detail: tr(t, 'caHighestVolume', 'Highest volume today'),
      color: '',
      useAccent: true,
    },
    {
      label: tr(t, 'caAvgCheapRich', 'Avg Cheap/Rich'),
      value: summary.avgCheapRich ?? '--',
      detail: tr(t, 'caRelativeValue', 'Relative value signal'),
      color: cheapRichColor(summary.avgCheapRich ?? ''),
    },
    {
      label: tr(t, 'caAvgSpread', 'Avg Spread'),
      value: summary.avgSpread != null ? `${fmtBp(summary.avgSpread)} bp` : '--',
      detail: tr(t, 'caCreditSpread', 'Credit spread over benchmark'),
      color: 'text-neutral-300',
    },
    {
      label: tr(t, 'caTotalTrades', 'Total Trades'),
      value: String(data.trades?.length ?? 0),
      detail: tr(t, 'caRecentActivity', 'Recent trading activity'),
      color: 'text-white',
    },
  ];

  return (
    <div className="p-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
        {tr(t, 'caOverview', 'Convertible Arb Overview')}
      </div>
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {cards.map((card) => (
          <div key={card.label} className="bg-black px-2 py-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div
              className={`text-[10px] font-mono font-bold truncate ${card.useAccent ? '' : card.color}`}
              style={card.useAccent ? { color: ACCENT } : undefined}
            >
              {card.value}
            </div>
            <div className="text-[7px] font-mono text-neutral-600 mt-0.5">{card.detail}</div>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10 px-1">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'caLastUpdate', 'Last update')}:{' '}
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--'}
        </span>
      </div>
    </div>
  );
}
