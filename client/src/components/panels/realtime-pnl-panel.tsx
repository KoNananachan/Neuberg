import { useState, useMemo } from 'react';
import { useRealtimePnl } from '../../api/hooks/use-realtime-pnl';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#4ade80'; // green-400
type Tab = 'overview' | 'positions' | 'greeks' | 'assetClass' | 'intraday';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting Helpers ──

function fmtCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + '$' + abs.toFixed(2);
}

function fmtPct(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + fmtCurrency(n);
}

function pnlColor(n: number): string {
  if (n > 0) return '#4ade80'; // green-400
  if (n < 0) return '#f87171'; // red-400
  return '#a1a1aa'; // zinc-400
}

// ── Main Panel ──

export function RealtimePnlPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('overview');
  const { data, isLoading, error, refetch } = useRealtimePnl();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: tr(t, 'pnlOverview', 'OVERVIEW') },
    { key: 'positions', label: tr(t, 'pnlPositions', 'POSITIONS') },
    { key: 'greeks', label: tr(t, 'pnlGreeks', 'GREEKS') },
    { key: 'assetClass', label: tr(t, 'pnlAssetClass', 'ASSET CLASS') },
    { key: 'intraday', label: tr(t, 'pnlIntraday', 'INTRADAY') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'pnlTitle', 'Real-Time P&L Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-colors ${
              tab === key
                ? 'text-green-400 border-b border-green-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            LOADING P&L DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8">
            <div className="text-red-400 text-[9px] font-mono uppercase">FAILED TO LOAD</div>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1 text-[8px] font-mono font-bold uppercase text-green-400 border border-green-400/30 hover:bg-green-400/[0.05] transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {data && (
          <>
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'positions' && <PositionsTab data={data} />}
            {tab === 'greeks' && <GreeksTab data={data} />}
            {tab === 'assetClass' && <AssetClassTab data={data} />}
            {tab === 'intraday' && <IntradayTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ data }: { data: any }) {
  const t = useT();

  const totalPnl = data?.totalPnl ?? 0;
  const unrealizedPnl = data?.unrealizedPnl ?? 0;
  const realizedPnl = data?.realizedPnl ?? 0;
  const dayHigh = data?.dayHigh ?? 0;
  const dayLow = data?.dayLow ?? 0;
  const portfolioValue = data?.portfolioValue ?? 0;
  const cash = data?.cash ?? 0;
  const margin = data?.margin ?? 0;
  const buyingPower = data?.buyingPower ?? 0;
  const winners = data?.topWinners ?? [];
  const losers = data?.topLosers ?? [];

  return (
    <div className="px-2 py-2 space-y-3">
      {/* Large P&L Display */}
      <div className="border border-border/20 bg-[#050505]">
        <div className="px-3 py-1 border-b border-border/20">
          <span className="text-[7px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'pnlTotalPnl', 'TOTAL P&L')}
          </span>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="text-[22px] font-black tabular-nums" style={{ color: pnlColor(totalPnl) }}>
            {fmtPnl(totalPnl)}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {[
            { label: tr(t, 'pnlUnrealized', 'UNREALIZED'), value: unrealizedPnl },
            { label: tr(t, 'pnlRealized', 'REALIZED'), value: realizedPnl },
            { label: tr(t, 'pnlDayHigh', 'DAY HIGH'), value: dayHigh },
            { label: tr(t, 'pnlDayLow', 'DAY LOW'), value: dayLow },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#050505] px-2 py-1.5 flex flex-col items-center">
              <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
              <span className="text-[10px] font-mono font-black tabular-nums" style={{ color: pnlColor(value) }}>
                {fmtPnl(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-4 gap-px bg-border/10 border border-border/20">
        {[
          { label: tr(t, 'pnlPortfolioValue', 'PORTFOLIO VALUE'), value: fmtCurrency(portfolioValue), color: '#e4e4e7' },
          { label: tr(t, 'pnlCash', 'CASH'), value: fmtCurrency(cash), color: '#a1a1aa' },
          { label: tr(t, 'pnlMargin', 'MARGIN USED'), value: fmtCurrency(margin), color: '#fbbf24' },
          { label: tr(t, 'pnlBuyingPower', 'BUYING POWER'), value: fmtCurrency(buyingPower), color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#050505] px-2 py-2 flex flex-col items-center">
            <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
            <span className="text-[11px] font-mono font-black tabular-nums" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Winners & Losers Side by Side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Top Winners */}
        <div className="border border-border/20 bg-[#050505]">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] font-black uppercase tracking-wider text-green-400">
              {tr(t, 'pnlTopWinners', 'TOP WINNERS')}
            </span>
          </div>
          <div>
            {winners.length === 0 && (
              <div className="px-2 py-3 text-center text-neutral-600 text-[8px]">--</div>
            )}
            {winners.map((w: any, i: any) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 hover:bg-green-400/[0.02] border-b border-border/10 last:border-b-0"
              >
                <span className="text-[8px] font-bold text-neutral-200">{w.symbol}</span>
                <span className="text-[8px] font-bold tabular-nums text-green-400">{fmtPnl(w.pnl)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="border border-border/20 bg-[#050505]">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[7px] font-black uppercase tracking-wider text-red-400">
              {tr(t, 'pnlTopLosers', 'TOP LOSERS')}
            </span>
          </div>
          <div>
            {losers.length === 0 && (
              <div className="px-2 py-3 text-center text-neutral-600 text-[8px]">--</div>
            )}
            {losers.map((l: any, i: any) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 hover:bg-green-400/[0.02] border-b border-border/10 last:border-b-0"
              >
                <span className="text-[8px] font-bold text-neutral-200">{l.symbol}</span>
                <span className="text-[8px] font-bold tabular-nums text-red-400">{fmtPnl(l.pnl)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Positions Tab ──

function PositionsTab({ data }: { data: any }) {
  const t = useT();
  const positions = data?.positions ?? [];

  const sorted = useMemo(() => {
    return [...positions].sort((a: any, b: any) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl));
  }, [positions]);

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[60px_40px_40px_56px_56px_64px_64px_48px_56px_48px_44px] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'pnlSymbol', 'SYMBOL'),
          tr(t, 'pnlSide', 'SIDE'),
          tr(t, 'pnlQty', 'QTY'),
          tr(t, 'pnlAvgCost', 'AVG COST'),
          tr(t, 'pnlCurrent', 'CURRENT'),
          tr(t, 'pnlMV', 'MV'),
          tr(t, 'pnlUnrealPnl', 'UNRL P&L'),
          tr(t, 'pnlUnrealPct', 'UNRL %'),
          tr(t, 'pnlDailyPnl', 'DAILY P&L'),
          tr(t, 'pnlContrib', 'CONTRIB'),
          tr(t, 'pnlWeight', 'WEIGHT'),
        ].map((h: any, i: any) => (
          <span
            key={i}
            className={`text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sorted.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
          {tr(t, 'pnlNoPositions', 'NO POSITIONS')}
        </div>
      )}
      {sorted.map((pos: any, idx: any) => {
        const isLong = (pos.side ?? 'LONG').toUpperCase() === 'LONG';
        const unrealizedPnl = pos.unrealizedPnl ?? 0;
        const unrealizedPct = pos.unrealizedPct ?? 0;
        const dailyPnl = pos.dailyPnl ?? 0;
        const contribution = pos.contribution ?? 0;
        const weight = pos.weight ?? 0;

        return (
          <div
            key={idx}
            className="grid grid-cols-[60px_40px_40px_56px_56px_64px_64px_48px_56px_48px_44px] gap-0 px-1 py-1 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-bold text-neutral-200 truncate">{pos.symbol}</span>
            <span className={`text-right text-[7px] font-black uppercase ${isLong ? 'text-green-400' : 'text-red-400'}`}>
              {isLong ? 'LONG' : 'SHORT'}
            </span>
            <span className="text-right text-[8px] tabular-nums text-neutral-300">{pos.qty}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-400">{fmtCurrency(pos.avgCost ?? 0)}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-200">{fmtCurrency(pos.currentPrice ?? 0)}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-300">{fmtCurrency(pos.marketValue ?? 0)}</span>
            <span className="text-right text-[8px] font-bold tabular-nums" style={{ color: pnlColor(unrealizedPnl) }}>
              {fmtPnl(unrealizedPnl)}
            </span>
            <span className="text-right text-[8px] tabular-nums" style={{ color: pnlColor(unrealizedPct) }}>
              {fmtPct(unrealizedPct)}
            </span>
            <span className="text-right text-[8px] tabular-nums" style={{ color: pnlColor(dailyPnl) }}>
              {fmtPnl(dailyPnl)}
            </span>
            <span className="text-right text-[8px] tabular-nums text-neutral-400">{fmtPct(contribution)}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-500">{fmtPct(weight, 1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Greeks Tab ──

function GreeksTab({ data }: { data: any }) {
  const t = useT();
  const greeks = data?.greeksPnl ?? {};
  const deltaPnl = greeks.delta ?? 0;
  const gammaPnl = greeks.gamma ?? 0;
  const vegaPnl = greeks.vega ?? 0;
  const thetaPnl = greeks.theta ?? 0;
  const rhoPnl = greeks.rho ?? 0;
  const unexplained = greeks.unexplained ?? 0;
  const totalGreeks = greeks.total ?? (deltaPnl + gammaPnl + vegaPnl + thetaPnl + rhoPnl + unexplained);

  const items = [
    { label: tr(t, 'pnlDeltaPnl', 'DELTA P&L'), value: deltaPnl },
    { label: tr(t, 'pnlGammaPnl', 'GAMMA P&L'), value: gammaPnl },
    { label: tr(t, 'pnlVegaPnl', 'VEGA P&L'), value: vegaPnl },
    { label: tr(t, 'pnlThetaPnl', 'THETA P&L'), value: thetaPnl },
    { label: tr(t, 'pnlRhoPnl', 'RHO P&L'), value: rhoPnl },
    { label: tr(t, 'pnlUnexplained', 'UNEXPLAINED'), value: unexplained },
  ];

  const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1);

  return (
    <div className="px-2 py-2 space-y-3">
      {/* Attribution Cards */}
      <div className="grid grid-cols-3 gap-px bg-border/10 border border-border/20">
        {items.map(({ label, value }) => (
          <div key={label} className="bg-[#050505] px-3 py-2 flex flex-col items-center hover:bg-green-400/[0.02] transition-colors">
            <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider">{label}</span>
            <span className="text-[12px] font-mono font-black tabular-nums mt-0.5" style={{ color: pnlColor(value) }}>
              {fmtPnl(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border border-border/20 bg-[#050505] px-3 py-2 flex items-center justify-between">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-400">
          {tr(t, 'pnlTotalGreeks', 'TOTAL GREEKS P&L')}
        </span>
        <span className="text-[14px] font-black tabular-nums" style={{ color: pnlColor(totalGreeks) }}>
          {fmtPnl(totalGreeks)}
        </span>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="border border-border/20 bg-[#050505]">
        <div className="px-2 py-1 border-b border-border/20">
          <span className="text-[7px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'pnlRelContrib', 'RELATIVE CONTRIBUTION')}
          </span>
        </div>
        <div className="px-2 py-2 space-y-1.5">
          {items.map(({ label, value }) => {
            const barWidth = Math.abs(value) / maxAbs * 100;
            const isNeg = value < 0;

            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-500 w-[60px] text-right truncate">{label}</span>
                <div className="flex-1 h-[8px] bg-[#111] relative">
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
                  {/* Bar */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      backgroundColor: value >= 0 ? '#4ade80' : '#f87171',
                      opacity: 0.7,
                      width: `${barWidth / 2}%`,
                      ...(isNeg
                        ? { right: '50%' }
                        : { left: '50%' }),
                    }}
                  />
                </div>
                <span className="text-[7px] font-mono tabular-nums w-[52px] text-right" style={{ color: pnlColor(value) }}>
                  {fmtPnl(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Asset Class Tab ──

function AssetClassTab({ data }: { data: any }) {
  const t = useT();
  const classes = data?.assetClasses ?? [];

  const maxMv = useMemo(() => {
    return Math.max(...classes.map((c: any) => Math.abs(c.marketValue ?? 0)), 1);
  }, [classes]);

  return (
    <div className="px-1 py-1">
      {/* Header */}
      <div className="grid grid-cols-[72px_44px_64px_64px_64px_56px_1fr] gap-0 px-1 py-1 border-b border-border/20">
        {[
          tr(t, 'pnlClass', 'CLASS'),
          tr(t, 'pnlPosCount', 'POS'),
          tr(t, 'pnlMV', 'MV'),
          tr(t, 'pnlUnrealized', 'UNREALIZED'),
          tr(t, 'pnlRealized', 'REALIZED'),
          tr(t, 'pnlDailyPnl', 'DAILY P&L'),
          tr(t, 'pnlWeight', 'WEIGHT'),
        ].map((h: any, i: any) => (
          <span
            key={i}
            className={`text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider ${i > 0 && i < 6 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {classes.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
          {tr(t, 'pnlNoData', 'NO DATA')}
        </div>
      )}
      {classes.map((cls: any, idx: any) => {
        const mv = cls.marketValue ?? 0;
        const unrealized = cls.unrealizedPnl ?? 0;
        const realized = cls.realizedPnl ?? 0;
        const daily = cls.dailyPnl ?? 0;
        const weight = cls.weight ?? 0;
        const barWidth = Math.abs(mv) / maxMv * 100;

        return (
          <div
            key={idx}
            className="grid grid-cols-[72px_44px_64px_64px_64px_56px_1fr] gap-0 px-1 py-1.5 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="text-[8px] font-bold text-neutral-200 uppercase truncate">{cls.name ?? cls.assetClass}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-400">{cls.positionsCount ?? 0}</span>
            <span className="text-right text-[8px] tabular-nums text-neutral-300">{fmtCurrency(mv)}</span>
            <span className="text-right text-[8px] font-bold tabular-nums" style={{ color: pnlColor(unrealized) }}>
              {fmtPnl(unrealized)}
            </span>
            <span className="text-right text-[8px] tabular-nums" style={{ color: pnlColor(realized) }}>
              {fmtPnl(realized)}
            </span>
            <span className="text-right text-[8px] tabular-nums" style={{ color: pnlColor(daily) }}>
              {fmtPnl(daily)}
            </span>
            <div className="flex items-center gap-1 pl-2">
              <div className="flex-1 h-[6px] bg-[#111]">
                <div
                  className="h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: ACCENT,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span className="text-[7px] font-mono tabular-nums text-neutral-500 w-[28px] text-right">
                {fmtPct(weight, 1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Intraday Tab ──

function IntradayTab({ data }: { data: any }) {
  const t = useT();
  const intervals = data?.intradayPnl ?? [];

  const { maxPnl, minPnl } = useMemo(() => {
    let max = 0;
    let min = 0;
    intervals.forEach((iv: any) => {
      const cum = iv.cumulativePnl ?? 0;
      if (cum > max) max = cum;
      if (cum < min) min = cum;
    });
    return { maxPnl: max || 1, minPnl: min };
  }, [intervals]);

  const range = Math.max(Math.abs(maxPnl), Math.abs(minPnl), 1);
  const chartWidth = 40;

  function renderBar(value: number): string {
    const len = Math.round((Math.abs(value) / range) * chartWidth);
    if (value >= 0) {
      const pad = chartWidth;
      return ' '.repeat(pad) + '|' + '\u2588'.repeat(len);
    } else {
      const bars = '\u2588'.repeat(len);
      const pad = chartWidth - len;
      return ' '.repeat(pad) + bars + '|';
    }
  }

  return (
    <div className="px-2 py-2 space-y-2">
      {/* Header */}
      <div className="border border-border/20 bg-[#050505] px-2 py-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'pnlIntradayCurve', 'INTRADAY P&L CURVE (30MIN INTERVALS)')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#4ade80' }} />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {tr(t, 'pnlCumulative', 'CUMULATIVE P&L')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#60a5fa' }} />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {tr(t, 'pnlDelta', 'DELTA')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#fbbf24' }} />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {tr(t, 'pnlTrades', 'TRADES')}
          </span>
        </div>
      </div>

      {/* Text-based chart */}
      <div className="border border-border/20 bg-[#050505] overflow-x-auto">
        {/* Column headers */}
        <div className="grid grid-cols-[56px_1fr_64px_56px_40px] gap-0 px-2 py-1 border-b border-border/20">
          {[
            tr(t, 'pnlTime', 'TIME'),
            tr(t, 'pnlChart', 'CHART'),
            tr(t, 'pnlCumPnl', 'CUM P&L'),
            tr(t, 'pnlDelta', 'DELTA'),
            tr(t, 'pnlTrades', 'TRADES'),
          ].map((h: any, i: any) => (
            <span
              key={i}
              className={`text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider ${i >= 2 ? 'text-right' : ''}`}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Interval rows */}
        {intervals.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            {tr(t, 'pnlNoData', 'NO DATA')}
          </div>
        )}
        {intervals.map((iv: any, idx: any) => {
          const cumPnl = iv.cumulativePnl ?? 0;
          const delta = iv.delta ?? 0;
          const trades = iv.trades ?? 0;
          const time = iv.time ?? '';

          return (
            <div
              key={idx}
              className="grid grid-cols-[56px_1fr_64px_56px_40px] gap-0 px-2 py-0.5 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono text-neutral-400 tabular-nums">{time}</span>
              <div className="overflow-hidden">
                <pre className="text-[7px] font-mono leading-tight tabular-nums whitespace-pre" style={{ color: pnlColor(cumPnl) }}>
                  {renderBar(cumPnl)}
                </pre>
              </div>
              <span className="text-right text-[8px] font-mono font-bold tabular-nums" style={{ color: pnlColor(cumPnl) }}>
                {fmtPnl(cumPnl)}
              </span>
              <span className="text-right text-[8px] font-mono tabular-nums" style={{ color: pnlColor(delta) }}>
                {fmtPnl(delta)}
              </span>
              <span className="text-right text-[8px] font-mono tabular-nums text-amber-400">
                {trades > 0 ? trades : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      {intervals.length > 0 && (
        <div className="border border-border/20 bg-[#050505] px-2 py-1.5 flex items-center justify-between">
          <span className="text-[7px] font-black uppercase tracking-wider text-neutral-500">
            {tr(t, 'pnlSessionTotal', 'SESSION TOTAL')}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[7px] font-mono text-neutral-500 uppercase">
              {tr(t, 'pnlIntervals', 'INTERVALS')}: <span className="text-neutral-300">{intervals.length}</span>
            </span>
            <span className="text-[10px] font-black tabular-nums" style={{ color: pnlColor(intervals[intervals.length - 1]?.cumulativePnl ?? 0) }}>
              {fmtPnl(intervals[intervals.length - 1]?.cumulativePnl ?? 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
