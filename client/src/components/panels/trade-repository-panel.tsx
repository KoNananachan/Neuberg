import { useMemo } from 'react';
import { useTradeRepository } from '../../api/hooks/use-trade-repository';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Local types (data shape placeholders) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TradeRepositoryData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecentTrade = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetClassBreakdown = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LargeTradeAlert = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComplianceMetrics = any;

// ── Formatting helpers ──

function fmtNotional(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

// ── Color helpers ──

function complianceColor(pct: number): string {
  if (pct >= 95) return 'text-emerald-400';
  if (pct >= 85) return 'text-yellow-400';
  if (pct >= 70) return 'text-orange-400';
  return 'text-red-400';
}

function complianceBg(pct: number): string {
  if (pct >= 95) return 'bg-emerald-400/10';
  if (pct >= 85) return 'bg-yellow-400/10';
  if (pct >= 70) return 'bg-orange-400/10';
  return 'bg-red-400/10';
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  rates: '#22d3ee',
  credit: '#f472b6',
  equity: '#34d399',
  fx: '#fbbf24',
  commodity: '#fb923c',
};

function getAssetClassColor(ac: string): string {
  return ASSET_CLASS_COLORS[ac?.toLowerCase()] ?? '#525252';
}

// ── Text sparkline ──

function textSparkline(values: number[]): string {
  if (!values || values.length === 0) return '';
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (blocks.length - 1));
      return blocks[idx];
    })
    .join('');
}

// ── Main Panel ──

export function TradeRepositoryPanel() {
  const t = useT();
  const { data, isLoading, error } = useTradeRepository();

  const repo = data as TradeRepositoryData | undefined;

  const summary = useMemo(() => {
    if (!repo) return null;
    return {
      totalTrades: repo?.summary?.totalTrades ?? 0,
      totalNotional: repo?.summary?.totalNotional ?? 0,
      clearedPct: repo?.summary?.clearedPct ?? 0,
      sefPct: repo?.summary?.sefPct ?? 0,
    };
  }, [repo]);

  const assetBreakdown = (repo?.assetClassBreakdown ?? []) as AssetClassBreakdown[];
  const recentTrades = (repo?.recentTrades ?? []) as RecentTrade[];
  const largeTradeAlerts = (repo?.largeTradeAlerts ?? []) as LargeTradeAlert[];
  const compliance = repo?.compliance as ComplianceMetrics | undefined;
  const clearingTrend = (repo?.clearingRateTrend ?? []) as number[];

  const maxNotional = useMemo(() => {
    if (!assetBreakdown || assetBreakdown.length === 0) return 1;
    return Math.max(...assetBreakdown.map((a: AssetClassBreakdown) => a?.notional ?? 0), 1);
  }, [assetBreakdown]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-cyan-400">
            {tr(t, 'panelTradeRepository', 'SDR Trade Repository')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            DTCC SDR
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {/* Error */}
        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'tradeRepoError', 'Failed to load trade data')}
          </div>
        )}

        {/* No data */}
        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'tradeRepoNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Volume Summary Cards */}
            {summary && <VolumeSummary summary={summary} />}

            {/* Asset Class Breakdown */}
            {assetBreakdown.length > 0 && (
              <AssetClassChart
                breakdown={assetBreakdown}
                maxNotional={maxNotional}
                t={t}
              />
            )}

            {/* Large Trade Alerts */}
            {largeTradeAlerts.length > 0 && (
              <LargeTradeAlerts alerts={largeTradeAlerts} t={t} />
            )}

            {/* Recent Trades Table */}
            {recentTrades.length > 0 && (
              <RecentTradesTable trades={recentTrades} t={t} />
            )}

            {/* Clearing Rate Trends */}
            {clearingTrend.length > 0 && (
              <ClearingRateTrends trend={clearingTrend} t={t} />
            )}

            {/* Compliance Metrics */}
            {compliance && <ComplianceSection compliance={compliance} t={t} />}

            {/* Timestamp */}
            {repo?.generatedAt && (
              <div className="px-3 py-1 border-t border-border/10">
                <span className="text-[7px] font-mono text-neutral-700">
                  {tr(t, 'tradeRepoLastUpdate', 'Last update')}: {new Date(repo.generatedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Volume Summary Cards ──

function VolumeSummary({ summary }: {
  summary: { totalTrades: number; totalNotional: number; clearedPct: number; sefPct: number };
}) {
  const cards = [
    { label: 'TOTAL TRADES', value: fmtCount(summary.totalTrades), accent: false },
    { label: 'TOTAL NOTIONAL', value: fmtNotional(summary.totalNotional), accent: false },
    { label: 'CLEARED', value: fmtPct(summary.clearedPct), accent: summary.clearedPct >= 80 },
    { label: 'SEF EXECUTED', value: fmtPct(summary.sefPct), accent: summary.sefPct >= 70 },
  ];

  return (
    <div className="border-b border-cyan-400/30 bg-[#050505]">
      <div className="grid grid-cols-4 divide-x divide-cyan-400/10">
        {cards.map((c) => (
          <div key={c.label} className="px-3 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {c.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white">
              {c.value}
              {c.accent && (
                <span className="ml-1 text-[7px] text-cyan-400">
                  {'\u2713'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Asset Class Breakdown Bar Chart ──

function AssetClassChart({
  breakdown,
  maxNotional,
  t,
}: {
  breakdown: AssetClassBreakdown[];
  maxNotional: number;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'tradeRepoAssetBreakdown', 'Notional by Asset Class')}
      </div>
      <div className="space-y-1">
        {breakdown.map((item: AssetClassBreakdown) => {
          const pct = maxNotional > 0 ? ((item?.notional ?? 0) / maxNotional) * 100 : 0;
          const color = getAssetClassColor(item?.assetClass);
          return (
            <div key={item?.assetClass ?? 'unknown'} className="flex items-center gap-2">
              <span className="text-[7px] font-mono font-bold uppercase w-16 text-right shrink-0" style={{ color }}>
                {item?.assetClass ?? '?'}
              </span>
              <div className="flex-1 h-3 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.5 }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-white w-16 text-right shrink-0">
                {fmtNotional(item?.notional ?? 0)}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 w-10 text-right shrink-0">
                {fmtPct(item?.pct ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Large Trade Alerts ──

function LargeTradeAlerts({ alerts, t }: { alerts: LargeTradeAlert[]; t: TFn }) {
  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'tradeRepoBlockTrades', 'Block Trade Alerts')}
      </div>
      <div className="space-y-1">
        {alerts.map((alert: LargeTradeAlert, idx: number) => (
          <div
            key={alert?.uti ?? idx}
            className="px-2 py-1.5 border border-cyan-400/30 bg-cyan-400/[0.03]"
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-bold font-mono px-1 py-0.5 text-cyan-400 bg-cyan-400/10 uppercase">
                  BLOCK
                </span>
                <span className="text-[9px] font-mono font-bold text-white">
                  {alert?.product ?? '---'}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-cyan-400">
                {fmtNotional(alert?.notional ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[7px] font-mono text-neutral-500">
              <span>TENOR: {alert?.tenor ?? '---'}</span>
              <span>VENUE: {alert?.executionVenue ?? '---'}</span>
              <span>CLR: {alert?.clearingVenue ?? '---'}</span>
              {alert?.timestamp && (
                <span className="text-neutral-700">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Trades Table ──

function RecentTradesTable({ trades, t }: { trades: RecentTrade[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'tradeRepoRecentTrades', 'Recent Trades')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal">UTI</th>
              <th className="text-left px-2 py-1 font-normal">PRODUCT</th>
              <th className="text-right px-2 py-1 font-normal">NOTIONAL</th>
              <th className="text-left px-2 py-1 font-normal">CLEARING</th>
              <th className="text-left px-2 py-1 font-normal">EXEC VENUE</th>
              <th className="text-left px-2 py-1 font-normal">TENOR</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade: RecentTrade, idx: number) => (
              <tr
                key={trade?.uti ?? idx}
                className="border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-neutral-500 truncate max-w-[100px]" title={trade?.uti}>
                  {trade?.uti ? `${String(trade.uti).slice(0, 8)}...` : '---'}
                </td>
                <td className="px-2 py-1 text-white font-bold whitespace-nowrap">
                  {trade?.product ?? '---'}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold whitespace-nowrap">
                  {fmtNotional(trade?.notional ?? 0)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  <span className={`text-[7px] font-bold px-1 py-0.5 ${
                    trade?.cleared
                      ? 'text-emerald-400 bg-emerald-400/10'
                      : 'text-neutral-500 bg-neutral-500/10'
                  }`}>
                    {trade?.clearingVenue ?? (trade?.cleared ? 'CLR' : 'UNCLR')}
                  </span>
                </td>
                <td className="px-2 py-1 text-neutral-400 whitespace-nowrap">
                  {trade?.executionVenue ?? '---'}
                </td>
                <td className="px-2 py-1 text-neutral-400 whitespace-nowrap">
                  {trade?.tenor ?? '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Clearing Rate Trends (Text Sparkline) ──

function ClearingRateTrends({ trend, t }: { trend: number[]; t: TFn }) {
  const sparkline = textSparkline(trend);
  const latest = trend[trend.length - 1] ?? 0;
  const oldest = trend[0] ?? 0;
  const delta = latest - oldest;
  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
        {tr(t, 'tradeRepoClearingTrend', 'Clearing Rate Trend (30d)')}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-cyan-400 tracking-tight leading-none">
          {sparkline}
        </span>
        <span className="text-[9px] font-mono font-bold text-white">
          {fmtPct(latest)}
        </span>
        <span className={`text-[8px] font-mono font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {deltaSign}{delta.toFixed(1)}pp
        </span>
      </div>
    </div>
  );
}

// ── Compliance Metrics ──

function ComplianceSection({ compliance, t }: { compliance: ComplianceMetrics; t: TFn }) {
  const metrics = [
    {
      label: tr(t, 'tradeRepoTimeliness', 'Timeliness'),
      value: compliance?.timelinessPct ?? 0,
      desc: tr(t, 'tradeRepoTimelinessDesc', 'Reported within T+15min'),
    },
    {
      label: tr(t, 'tradeRepoAmendmentRate', 'Amendment Rate'),
      value: 100 - (compliance?.amendmentRatePct ?? 0),
      rawValue: compliance?.amendmentRatePct ?? 0,
      invert: true,
      desc: tr(t, 'tradeRepoAmendmentDesc', 'Lower is better'),
    },
    {
      label: tr(t, 'tradeRepoRejectionRate', 'Rejection Rate'),
      value: 100 - (compliance?.rejectionRatePct ?? 0),
      rawValue: compliance?.rejectionRatePct ?? 0,
      invert: true,
      desc: tr(t, 'tradeRepoRejectionDesc', 'Lower is better'),
    },
  ];

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'tradeRepoCompliance', 'Compliance Metrics')}
      </div>
      <div className="space-y-1.5">
        {metrics.map((m) => {
          const displayValue = m.invert ? (m.rawValue ?? 0) : m.value;
          const barValue = m.value;
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono font-bold text-neutral-300">
                    {m.label}
                  </span>
                  <span className="text-[6px] font-mono text-neutral-700">
                    {m.desc}
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold ${m.invert ? complianceColor(barValue) : complianceColor(m.value)}`}>
                  {m.invert ? fmtPct(displayValue) : fmtPct(m.value)}
                </span>
              </div>
              <div className="h-1.5 bg-neutral-900 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${m.invert ? complianceBg(barValue) : complianceBg(m.value)}`}
                  style={{
                    width: `${Math.min(barValue, 100)}%`,
                    backgroundColor: barValue >= 95 ? '#34d399'
                      : barValue >= 85 ? '#fbbf24'
                      : barValue >= 70 ? '#fb923c'
                      : '#f87171',
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
