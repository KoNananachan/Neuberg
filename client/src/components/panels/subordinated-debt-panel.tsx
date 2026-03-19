import { useState } from 'react';
import { useSubordinatedDebt } from '../../api/hooks/use-subordinated-debt';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Constants --

const ROSE = '#fb7185';
const ROSE_DIM = 'rgba(251,113,133,0.12)';

type ViewTab = 'OVERVIEW' | 'ISSUERS' | 'RISK' | 'CURVE';

// -- Color helpers --

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function signalBadge(signal: string): { text: string; bg: string; color: string } {
  switch (signal) {
    case 'buy':
      return { text: 'BUY', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'sell':
      return { text: 'SELL', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'hold':
      return { text: 'HOLD', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'overweight':
      return { text: 'OW', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'underweight':
      return { text: 'UW', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'neutral':
      return { text: 'NEUTRAL', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    default:
      return { text: signal.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function riskLevelColor(level: string): string {
  switch (level) {
    case 'low': return '#34d399';
    case 'moderate': return '#fbbf24';
    case 'elevated': return '#fb923c';
    case 'high': return '#f87171';
    case 'critical': return '#ef4444';
    default: return '#71717a';
  }
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AA')) return '#34d399';
  if (rating.startsWith('A')) return '#a78bfa';
  if (rating.startsWith('BBB')) return '#fbbf24';
  if (rating.startsWith('BB')) return '#fb923c';
  return '#f87171';
}

// -- Main Panel --

export function SubordinatedDebtPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSubordinatedDebt();
  const [view, setView] = useState<ViewTab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="5" width="14" height="3" stroke={ROSE} strokeWidth="1.2" fill="none" />
            <rect x="1" y="9" width="14" height="3" stroke={ROSE} strokeWidth="1.2" fill="none" />
            <line x1="4" y1="5" x2="4" y2="2" stroke={ROSE} strokeWidth="0.8" opacity="0.5" />
            <line x1="8" y1="5" x2="8" y2="2" stroke={ROSE} strokeWidth="0.8" opacity="0.5" />
            <line x1="12" y1="5" x2="12" y2="2" stroke={ROSE} strokeWidth="0.8" opacity="0.5" />
            <line x1="4" y1="12" x2="4" y2="15" stroke={ROSE} strokeWidth="0.8" opacity="0.4" />
            <line x1="12" y1="12" x2="12" y2="15" stroke={ROSE} strokeWidth="0.8" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ROSE }}>
            {tr(t, 'subDebtTitle', 'Subordinated Debt Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['OVERVIEW', 'ISSUERS', 'RISK', 'CURVE'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? ROSE_DIM : 'transparent',
                color: view === v ? ROSE : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-rose-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'subDebtNoData', 'No data available')}
          </div>
        )}

        {data && view === 'OVERVIEW' && <OverviewView data={data} />}
        {data && view === 'ISSUERS' && <IssuersView data={data} />}
        {data && view === 'RISK' && <RiskView data={data} />}
        {data && view === 'CURVE' && <CurveView data={data} />}
      </div>
    </div>
  );
}

// -- OVERVIEW View --

function OverviewView({ data }: { data: any }) {
  const t = useT();
  const { summary, tierBreakdown, recentEvents } = data;

  return (
    <div className="text-[9px]">
      {/* Market Overview Summary Bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/20">
        <SummaryCell
          label="Total Outstanding"
          value={summary?.totalOutstanding != null ? `$${summary.totalOutstanding}B` : '---'}
          color={ROSE}
        />
        <SummaryCell
          label="Issuance YTD"
          value={summary?.issuanceYTD != null ? `$${summary.issuanceYTD}B` : '---'}
          color="#d4d4d8"
        />
        <SummaryCell
          label="Avg Spread"
          value={summary?.avgSpread != null ? `${summary.avgSpread}bp` : '---'}
          color={summary?.avgSpread > 300 ? '#f87171' : summary?.avgSpread > 200 ? '#fbbf24' : '#34d399'}
        />
        <SummaryCell
          label="Avg Yield"
          value={summary?.avgYield != null ? `${summary.avgYield.toFixed(2)}%` : '---'}
          color={ROSE}
        />
        <SummaryCell
          label="Maturity Wall"
          value={summary?.maturityWall ?? '---'}
          color="#a1a1aa"
        />
      </div>

      {/* Tier Breakdown Table */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'subDebtTierBreakdown', 'Tier Breakdown')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_55px_50px_50px_55px_55px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Tier</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Outstanding</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Yield</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Ext. Risk</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Call Prob</span>
        </div>

        {/* Rows */}
        {(tierBreakdown ?? [
          { tier: 'AT1', outstanding: null, spread: null, yield: null, extensionRisk: null, callProbability: null },
          { tier: 'Tier 2', outstanding: null, spread: null, yield: null, extensionRisk: null, callProbability: null },
          { tier: 'Legacy T1', outstanding: null, spread: null, yield: null, extensionRisk: null, callProbability: null },
          { tier: 'Sr Non-Pref', outstanding: null, spread: null, yield: null, extensionRisk: null, callProbability: null },
        ]).map((row: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_55px_50px_50px_55px_55px] gap-0 px-1 py-[3px] hover:bg-rose-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate">{row.tier}</span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {row.outstanding != null ? `$${row.outstanding}B` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: ROSE }}>
              {row.spread != null ? `${row.spread}bp` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {row.yield != null ? `${row.yield.toFixed(2)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: riskLevelColor(row.extensionRisk ?? '') }}>
              {row.extensionRisk?.toUpperCase() ?? '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums pr-1" style={{
              color: row.callProbability != null
                ? (row.callProbability > 80 ? '#34d399' : row.callProbability > 50 ? '#fbbf24' : '#f87171')
                : '#71717a',
            }}>
              {row.callProbability != null ? `${row.callProbability}%` : '---'}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'subDebtRecentEvents', 'Recent Events')}
        </div>

        {(recentEvents ?? []).length > 0
          ? (recentEvents ?? []).map((event: any, i: number) => (
              <div
                key={i}
                className="flex items-start gap-2 px-1 py-[3px] hover:bg-rose-400/[0.02] border-b border-border/10"
              >
                <span className="text-[7px] text-neutral-600 tabular-nums shrink-0 mt-[1px]">
                  {event.date ?? '---'}
                </span>
                <span className="text-[8px] text-neutral-300 leading-tight">
                  {event.description ?? '---'}
                </span>
                {event.impact && (
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px] shrink-0"
                    style={{
                      background: event.impact === 'positive'
                        ? 'rgba(52,211,153,0.15)' : event.impact === 'negative'
                        ? 'rgba(248,113,113,0.15)' : 'rgba(113,113,122,0.15)',
                      color: event.impact === 'positive'
                        ? '#34d399' : event.impact === 'negative'
                        ? '#f87171' : '#71717a',
                    }}
                  >
                    {event.impact.toUpperCase()}
                  </span>
                )}
              </div>
            ))
          : (
              <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
                No recent events
              </div>
            )}
      </div>
    </div>
  );
}

// -- ISSUERS View --

function IssuersView({ data }: { data: any }) {
  const t = useT();
  const issuers: any[] = data.issuers ?? [];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'subDebtIssuers', 'Bank Issuers')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_40px_48px_40px_42px_38px_42px_42px_52px_36px_40px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Ticker</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Tier</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Cpn</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Sprd</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">YTC</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Call Dt</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Rtg</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Sig</span>
      </div>

      {/* Rows */}
      {issuers.length > 0
        ? issuers.map((issuer: any, i: number) => {
            const sig = signalBadge(issuer.signal ?? 'neutral');
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_40px_48px_40px_42px_38px_42px_42px_52px_36px_40px] gap-0 px-1 py-[3px] hover:bg-rose-400/[0.02] border-b border-border/10 items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate">
                  {issuer.name ?? '---'}
                </span>
                <span className="text-[7px] font-bold text-right tabular-nums" style={{ color: ROSE }}>
                  {issuer.ticker ?? '---'}
                </span>
                <span className="text-[7px] font-bold text-right tabular-nums text-neutral-400">
                  {issuer.tier ?? '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                  {issuer.coupon != null ? `${issuer.coupon.toFixed(2)}` : '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: ROSE }}>
                  {issuer.spread != null ? `${issuer.spread}` : '---'}
                </span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(issuer.spreadChange ?? 0)}`}>
                  {issuer.spreadChange != null ? `${changeSign(issuer.spreadChange)}${issuer.spreadChange}` : '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                  {issuer.price != null ? issuer.price.toFixed(2) : '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                  {issuer.yieldToCall != null ? `${issuer.yieldToCall.toFixed(2)}%` : '---'}
                </span>
                <span className="text-[7px] font-bold text-right tabular-nums text-neutral-400">
                  {issuer.callDate ?? '---'}
                </span>
                <span className="text-[7px] font-bold text-right tabular-nums" style={{ color: ratingColor(issuer.rating ?? '') }}>
                  {issuer.rating ?? '---'}
                </span>
                <div className="flex justify-end pr-1">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: sig.bg, color: sig.color }}
                  >
                    {sig.text}
                  </span>
                </div>
              </div>
            );
          })
        : (
            <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
              No issuer data available
            </div>
          )}
    </div>
  );
}

// -- RISK View --

function RiskView({ data }: { data: any }) {
  const t = useT();
  const risk = data.riskMetrics ?? {};

  const metrics = [
    { label: 'AT1 Conversion Risk', key: 'at1ConversionRisk', value: risk.at1ConversionRisk, suffix: '%' },
    { label: 'Writedown Probability', key: 'writedownProbability', value: risk.writedownProbability, suffix: '%' },
    { label: 'MDA Buffer', key: 'mdaBuffer', value: risk.mdaBuffer, suffix: 'bp' },
    { label: 'Coupon Cancel Risk', key: 'couponCancellationRisk', value: risk.couponCancellationRisk, suffix: '%' },
    { label: 'Reg Capital Ratio', key: 'regulatoryCapitalRatio', value: risk.regulatoryCapitalRatio, suffix: '%' },
    { label: 'CET1 Buffer', key: 'cet1Buffer', value: risk.cet1Buffer, suffix: 'bp' },
  ];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
        {tr(t, 'subDebtRiskMetrics', 'Risk Metrics')}
      </div>

      {/* Risk Metric Cards */}
      <div className="grid grid-cols-3 gap-0 border border-border/10 mb-3">
        {metrics.map((m) => {
          const val = m.value;
          const barColor = val != null
            ? (val > 75 ? '#ef4444' : val > 50 ? '#fb923c' : val > 25 ? '#fbbf24' : '#34d399')
            : '#3f3f46';
          const barWidth = val != null ? Math.min(100, Math.max(0, val)) : 0;

          return (
            <div key={m.key} className="px-2 py-2 border-r border-b border-border/10 last:border-r-0">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider mb-1">{m.label}</div>
              <div className="text-[14px] font-black tabular-nums" style={{ color: barColor }}>
                {val != null ? `${val.toFixed(1)}${m.suffix}` : '---'}
              </div>
              {/* Risk gauge bar */}
              <div className="mt-1.5 h-[4px] bg-neutral-900 relative w-full">
                <div
                  className="h-full absolute left-0 top-0 transition-all"
                  style={{ width: `${barWidth}%`, background: barColor, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Risk Indicators */}
      <div className="border-b border-border/20 pb-2 mb-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'subDebtRiskGauges', 'Risk Gauges')}
        </div>

        {(data.riskGauges ?? []).length > 0
          ? (data.riskGauges ?? []).map((gauge: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-1 py-[3px] hover:bg-rose-400/[0.02]">
                <span className="text-[7px] text-neutral-500 uppercase w-24 shrink-0">{gauge.name ?? '---'}</span>
                <div className="flex-1 h-[6px] bg-neutral-900 relative">
                  <div
                    className="h-full absolute left-0 top-0"
                    style={{
                      width: `${Math.min(100, Math.max(0, gauge.value ?? 0))}%`,
                      background: riskLevelColor(gauge.level ?? ''),
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold tabular-nums w-12 text-right" style={{ color: riskLevelColor(gauge.level ?? '') }}>
                  {gauge.value != null ? gauge.value.toFixed(1) : '---'}
                </span>
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px] w-16 text-center shrink-0"
                  style={{
                    background: `${riskLevelColor(gauge.level ?? '')}20`,
                    color: riskLevelColor(gauge.level ?? ''),
                  }}
                >
                  {gauge.level?.toUpperCase() ?? '---'}
                </span>
              </div>
            ))
          : (
              <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
                No risk gauge data available
              </div>
            )}
      </div>

      {/* Systemic Risk Summary */}
      {data.systemicRisk && (
        <div className="px-1">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
            {tr(t, 'subDebtSystemic', 'Systemic Risk Assessment')}
          </div>
          <div className="grid grid-cols-4 gap-0 border border-border/10">
            <MetricCell label="Contagion Risk" value={data.systemicRisk?.contagionRisk?.toUpperCase() ?? '---'} color={riskLevelColor(data.systemicRisk?.contagionRisk ?? '')} />
            <MetricCell label="Bail-in Prob" value={data.systemicRisk?.bailInProbability != null ? `${data.systemicRisk.bailInProbability.toFixed(1)}%` : '---'} color={data.systemicRisk?.bailInProbability > 20 ? '#f87171' : '#34d399'} />
            <MetricCell label="Recovery Rate" value={data.systemicRisk?.recoveryRate != null ? `${data.systemicRisk.recoveryRate.toFixed(1)}%` : '---'} color={ROSE} />
            <MetricCell label="Stress Scenario" value={data.systemicRisk?.stressScenario ?? '---'} color="#a1a1aa" />
          </div>
        </div>
      )}
    </div>
  );
}

// -- CURVE View --

function CurveView({ data }: { data: any }) {
  const t = useT();
  const curveData: any[] = data.spreadCurve ?? [];

  const MATURITY_BUCKETS = ['2Y', '3Y', '5Y', '7Y', '10Y'];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'subDebtSpreadCurve', 'Spread Curve Analysis')}
      </div>

      {/* Spread Curve Table */}
      <div className="mb-3">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Maturity</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">AT1 Spread</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Tier 2 Spread</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Senior Spread</span>
        </div>

        {/* Rows */}
        {(curveData.length > 0 ? curveData : MATURITY_BUCKETS.map((m) => ({
          maturity: m, at1Spread: null, tier2Spread: null, seniorSpread: null,
        }))).map((row: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[60px_1fr_1fr_1fr] gap-0 px-1 py-[3px] hover:bg-rose-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold" style={{ color: ROSE }}>
              {row.maturity ?? '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {row.at1Spread != null ? `${row.at1Spread}bp` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {row.tier2Spread != null ? `${row.tier2Spread}bp` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300 pr-1">
              {row.seniorSpread != null ? `${row.seniorSpread}bp` : '---'}
            </span>
          </div>
        ))}
      </div>

      {/* Visual Spread Comparison */}
      <div className="border-t border-border/20 pt-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
          {tr(t, 'subDebtSpreadComparison', 'Spread Comparison (Visual)')}
        </div>

        {(curveData.length > 0 ? curveData : MATURITY_BUCKETS.map((m) => ({
          maturity: m, at1Spread: null, tier2Spread: null, seniorSpread: null,
        }))).map((row: any, i: number) => {
          const maxSpread = Math.max(
            row.at1Spread ?? 0,
            row.tier2Spread ?? 0,
            row.seniorSpread ?? 0,
            1,
          );
          const scale = (val: number | null) => val != null ? Math.min(100, (val / (maxSpread * 1.2)) * 100) : 0;

          return (
            <div key={i} className="px-1 py-[4px] hover:bg-rose-400/[0.02]">
              <div className="flex items-center gap-2 mb-[2px]">
                <span className="text-[7px] font-bold w-8 shrink-0" style={{ color: ROSE }}>
                  {row.maturity ?? '---'}
                </span>
                <div className="flex-1 flex flex-col gap-[2px]">
                  {/* AT1 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-neutral-600 w-8 shrink-0">AT1</span>
                    <div className="flex-1 h-[4px] bg-neutral-900 relative">
                      <div
                        className="h-full absolute left-0 top-0"
                        style={{ width: `${scale(row.at1Spread)}%`, background: '#fb7185', opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[7px] font-bold tabular-nums text-neutral-400 w-10 text-right">
                      {row.at1Spread != null ? `${row.at1Spread}` : '---'}
                    </span>
                  </div>
                  {/* Tier 2 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-neutral-600 w-8 shrink-0">T2</span>
                    <div className="flex-1 h-[4px] bg-neutral-900 relative">
                      <div
                        className="h-full absolute left-0 top-0"
                        style={{ width: `${scale(row.tier2Spread)}%`, background: '#a78bfa', opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[7px] font-bold tabular-nums text-neutral-400 w-10 text-right">
                      {row.tier2Spread != null ? `${row.tier2Spread}` : '---'}
                    </span>
                  </div>
                  {/* Senior */}
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-neutral-600 w-8 shrink-0">Sr</span>
                    <div className="flex-1 h-[4px] bg-neutral-900 relative">
                      <div
                        className="h-full absolute left-0 top-0"
                        style={{ width: `${scale(row.seniorSpread)}%`, background: '#60a5fa', opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-[7px] font-bold tabular-nums text-neutral-400 w-10 text-right">
                      {row.seniorSpread != null ? `${row.seniorSpread}` : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-3 px-1 mt-2 pt-1 border-t border-border/10">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ background: '#fb7185', opacity: 0.7 }} />
            <span className="text-[6px] text-neutral-500 uppercase">AT1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ background: '#a78bfa', opacity: 0.7 }} />
            <span className="text-[6px] text-neutral-500 uppercase">Tier 2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ background: '#60a5fa', opacity: 0.7 }} />
            <span className="text-[6px] text-neutral-500 uppercase">Senior</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Shared Components --

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
