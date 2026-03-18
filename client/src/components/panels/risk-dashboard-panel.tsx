import { useState } from 'react';
import { useRiskDashboard } from '../../api/hooks/use-risk-dashboard';
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

// ── Types ──

interface VaRMetric {
  confidence: string;
  horizon: string;
  amount: number;
  pctOfNav: number;
  change1d: number;
}

interface ComponentVaR {
  assetClass: string;
  standaloneVaR: number;
  componentVaR: number;
  pctContribution: number;
  marginalVaR: number;
  correlation: number;
}

interface DiversificationBenefit {
  undiversifiedVaR: number;
  diversifiedVaR: number;
  benefitAmount: number;
  benefitPct: number;
}

interface ESMetric {
  confidence: string;
  horizon: string;
  amount: number;
  pctOfNav: number;
  ratio: number;
}

interface HistoricalScenario {
  name: string;
  date: string;
  portfolioLoss: number;
  pctOfNav: number;
  recoveryDays: number;
}

interface LimitItem {
  name: string;
  limit: number;
  current: number;
  utilization: number;
  breached: boolean;
  trend: string;
}

interface PnlSource {
  source: string;
  daily: number;
  wtd: number;
  mtd: number;
  ytd: number;
}

interface PnlSummary {
  totalDaily: number;
  totalMtd: number;
  totalYtd: number;
}

interface RiskDashboardData {
  varMetrics: VaRMetric[];
  componentVaR: ComponentVaR[];
  diversification: DiversificationBenefit;
  esMetrics: ESMetric[];
  worstScenarios: HistoricalScenario[];
  limits: LimitItem[];
  pnlAttribution: PnlSource[];
  pnlSummary: PnlSummary;
  timestamp: string;
}

// ── Tab type ──

type TabKey = 'VAR' | 'ES' | 'LIMITS' | 'PNL';

const TABS: { key: TabKey; label: string; fallback: string }[] = [
  { key: 'VAR', label: 'rdTabVar', fallback: 'VaR Summary' },
  { key: 'ES', label: 'rdTabEs', fallback: 'Expected Shortfall' },
  { key: 'LIMITS', label: 'rdTabLimits', fallback: 'Limits' },
  { key: 'PNL', label: 'rdTabPnl', fallback: 'P&L Attribution' },
];

// ── Formatting helpers ──

function fmtAmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtPct(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

// ── Color helpers ──

function pnlColor(n: number): string {
  if (n > 0) return '#4ade80';
  if (n < 0) return '#f87171';
  return '#71717a';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function utilColor(pct: number): string {
  if (pct >= 80) return '#f87171';
  if (pct >= 60) return '#fbbf24';
  return '#4ade80';
}

function utilTextColor(pct: number): string {
  if (pct >= 80) return 'text-red-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-emerald-400';
}

// ── Main Panel ──

export function RiskDashboardPanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useRiskDashboard();
  const data = rawData as RiskDashboardData | undefined;

  const [activeTab, setActiveTab] = useState<TabKey>('VAR');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'rdTitle', 'Risk Dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 text-red-400 bg-red-400/10">
              VaR {fmtAmt(data.varMetrics?.[0]?.amount ?? 0)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[7px] font-mono font-bold uppercase px-2 py-0.5 transition-colors ${
              activeTab === tab.key
                ? 'text-red-400 bg-red-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tr(t, tab.label, tab.fallback)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400/60 text-[9px] font-mono uppercase">
            {tr(t, 'rdError', 'Failed to load risk data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'rdNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'VAR' && (
          <VaRSection data={data} t={t} />
        )}

        {data && activeTab === 'ES' && (
          <ESSection data={data} t={t} />
        )}

        {data && activeTab === 'LIMITS' && (
          <LimitsSection data={data} t={t} />
        )}

        {data && activeTab === 'PNL' && (
          <PnLSection data={data} t={t} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1.5 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'rdLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: VaR Summary ──

function VaRSection({ data, t }: { data: RiskDashboardData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Headline VaR metrics */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rdVarHeadline', 'Value-at-Risk')}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(data.varMetrics ?? []).map((m) => (
            <div
              key={`${m.confidence}-${m.horizon}`}
              className="px-1.5 py-1.5 border border-border/20 hover:bg-red-400/[0.02] transition-colors"
            >
              <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.confidence} / {m.horizon}
              </div>
              <div className="text-[11px] font-mono font-black text-white tabular-nums mt-0.5">
                {fmtAmt(m.amount)}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
                  {fmtPct(m.pctOfNav)} NAV
                </span>
                <span className={`text-[7px] font-mono font-bold tabular-nums ${changeColor(m.change1d)}`}>
                  {fmtBps(m.change1d)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Component VaR by asset class */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rdComponentVar', 'Component VaR by Asset Class')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_44px_48px_44px] gap-0.5 px-1 mb-0.5">
          {['Asset Class', 'Standalone', 'Component', 'Pct', 'Marginal', 'Correl'].map((h) => (
            <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {(data.componentVaR ?? []).map((row) => (
          <div
            key={row.assetClass}
            className="grid grid-cols-[1fr_52px_52px_44px_48px_44px] gap-0.5 px-1 py-[3px] hover:bg-red-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-red-400 truncate">{row.assetClass}</span>
            <span className="text-white tabular-nums">{fmtAmt(row.standaloneVaR)}</span>
            <span className="text-white tabular-nums font-bold">{fmtAmt(row.componentVaR)}</span>
            <span className="text-neutral-400 tabular-nums">{row.pctContribution.toFixed(1)}%</span>
            <span className="text-neutral-300 tabular-nums">{fmtAmt(row.marginalVaR)}</span>
            <span className="text-neutral-400 tabular-nums">{row.correlation.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Diversification benefit */}
      {data.diversification && (
        <div className="px-2 py-2 border-b border-border/20">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
            {tr(t, 'rdDiversification', 'Diversification Benefit')}
          </div>
          <div className="flex items-center gap-0 border border-border/20">
            <DivCell
              label="Undiversified VaR"
              value={fmtAmt(data.diversification.undiversifiedVaR)}
              color="text-neutral-300"
            />
            <DivCell
              label="Diversified VaR"
              value={fmtAmt(data.diversification.diversifiedVaR)}
              color="text-white"
              bold
            />
            <DivCell
              label="Benefit"
              value={fmtAmt(data.diversification.benefitAmount)}
              color="text-emerald-400"
            />
            <DivCell
              label="Benefit %"
              value={`${data.diversification.benefitPct.toFixed(1)}%`}
              color="text-emerald-400"
              bold
              last
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DivCell({
  label,
  value,
  color,
  bold,
  last,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex-1 px-2 py-1.5 ${last ? '' : 'border-r border-border/10'}`}>
      <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${color} ${bold ? 'font-black' : 'font-bold'}`}>
        {value}
      </div>
    </div>
  );
}

// ── Tab 2: Expected Shortfall ──

function ESSection({ data, t }: { data: RiskDashboardData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* ES metrics */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rdEsMetrics', 'Expected Shortfall (CVaR)')}
        </div>

        <div className="grid grid-cols-4 gap-1">
          {(data.esMetrics ?? []).map((m) => (
            <div
              key={`${m.confidence}-${m.horizon}`}
              className="px-1.5 py-1.5 border border-border/20 hover:bg-red-400/[0.02] transition-colors"
            >
              <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
                ES {m.confidence} / {m.horizon}
              </div>
              <div className="text-[11px] font-mono font-black text-white tabular-nums mt-0.5">
                {fmtAmt(m.amount)}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
                  {fmtPct(m.pctOfNav)} NAV
                </span>
                <span className="text-[7px] font-mono text-neutral-400 tabular-nums">
                  ES/VaR: {m.ratio.toFixed(2)}x
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Worst historical scenarios */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rdWorstScenarios', 'Worst Historical Scenarios')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_60px_56px_50px_56px] gap-0.5 px-1 mb-0.5">
          {['Scenario', 'Date', 'Loss', '% NAV', 'Recovery'].map((h) => (
            <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {(data.worstScenarios ?? []).map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_60px_56px_50px_56px] gap-0.5 px-1 py-[3px] hover:bg-red-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate">{s.name}</span>
            <span className="text-neutral-500 tabular-nums">{s.date}</span>
            <span className="text-red-400 font-bold tabular-nums">{fmtAmt(s.portfolioLoss)}</span>
            <span className="text-red-400 tabular-nums">{fmtPct(s.pctOfNav)}</span>
            <span className="text-neutral-400 tabular-nums">{s.recoveryDays}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 3: Limit Utilization ──

function LimitsSection({ data, t }: { data: RiskDashboardData; t: ReturnType<typeof useT> }) {
  const breachedCount = (data.limits ?? []).filter((l) => l.breached).length;

  return (
    <div className="px-2 py-2">
      {/* Breach summary */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'rdLimitUtil', 'Limit Utilization')}
        </div>
        {breachedCount > 0 && (
          <span className="text-[8px] font-black font-mono uppercase px-1.5 py-0.5 text-red-400 bg-red-400/15 animate-pulse">
            {breachedCount} BREACH{breachedCount > 1 ? 'ES' : ''}
          </span>
        )}
      </div>

      {/* Limit rows */}
      {(data.limits ?? []).map((lim) => (
        <LimitRow key={lim.name} item={lim} />
      ))}
    </div>
  );
}

function LimitRow({ item }: { item: LimitItem }) {
  const color = utilColor(item.utilization);
  const tColor = utilTextColor(item.utilization);

  return (
    <div
      className={`px-1.5 py-1.5 mb-1 border hover:bg-red-400/[0.02] transition-colors ${
        item.breached ? 'border-red-400/40 bg-red-400/[0.04]' : 'border-border/20'
      }`}
    >
      {/* Top line: name + utilization */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {item.breached && (
            <div className="w-1.5 h-1.5 bg-red-400 animate-pulse" />
          )}
          <span className="text-[8px] font-mono font-bold text-neutral-200">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500">
            {fmtAmt(item.current)} / {fmtAmt(item.limit)}
          </span>
          <span className={`text-[8px] font-mono font-black tabular-nums ${tColor}`}>
            {item.utilization.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full transition-all"
          style={{
            width: `${Math.min(item.utilization, 100)}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
        {/* Threshold markers */}
        <div
          className="absolute top-0 h-full w-px bg-yellow-400/40"
          style={{ left: '60%' }}
        />
        <div
          className="absolute top-0 h-full w-px bg-red-400/40"
          style={{ left: '80%' }}
        />
        {/* Overflow indicator */}
        {item.utilization > 100 && (
          <div
            className="absolute top-0 right-0 h-full bg-red-400"
            style={{
              width: `${Math.min((item.utilization - 100) / 100 * 100, 20)}%`,
              opacity: 0.9,
            }}
          />
        )}
      </div>

      {/* Bottom: trend */}
      <div className="flex items-center justify-between mt-0.5">
        <TrendBadge trend={item.trend} />
        {item.breached && (
          <span className="text-[6px] font-mono font-bold text-red-400 uppercase">
            LIMIT BREACHED
          </span>
        )}
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const lower = (trend || '').toLowerCase();
  let text = 'text-neutral-500';
  let bg = 'bg-neutral-500/10';
  let arrow = '-';

  if (lower === 'rising' || lower === 'increasing') {
    text = 'text-red-400';
    bg = 'bg-red-400/10';
    arrow = '\u2191';
  } else if (lower === 'falling' || lower === 'decreasing') {
    text = 'text-emerald-400';
    bg = 'bg-emerald-400/10';
    arrow = '\u2193';
  } else if (lower === 'stable') {
    arrow = '\u2192';
  }

  return (
    <span className={`text-[6px] font-mono font-bold uppercase px-1 py-0.5 ${text} ${bg}`}>
      {arrow} {trend}
    </span>
  );
}

// ── Tab 4: P&L Attribution ──

function PnLSection({ data, t }: { data: RiskDashboardData; t: ReturnType<typeof useT> }) {
  const summary = data.pnlSummary;

  return (
    <div>
      {/* P&L summary strip */}
      {summary && (
        <div className="flex items-center gap-0 border-b border-border/20 shrink-0 bg-[#050505]">
          <PnlSummaryCell label="Daily P&L" value={summary.totalDaily} />
          <PnlSummaryCell label="MTD P&L" value={summary.totalMtd} />
          <PnlSummaryCell label="YTD P&L" value={summary.totalYtd} last />
        </div>
      )}

      {/* Attribution table */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rdPnlAttribution', 'P&L Attribution by Source')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_48px_52px_52px] gap-0.5 px-1 mb-0.5">
          {['Source', 'Daily', 'WTD', 'MTD', 'YTD'].map((h) => (
            <span key={h} className={`text-[6px] font-mono font-bold text-neutral-600 uppercase ${h !== 'Source' ? 'text-right' : ''}`}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {(data.pnlAttribution ?? []).map((row) => (
          <div
            key={row.source}
            className="grid grid-cols-[1fr_52px_48px_52px_52px] gap-0.5 px-1 py-[3px] hover:bg-red-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate uppercase">{row.source}</span>
            <span
              className="text-right tabular-nums font-bold"
              style={{ color: pnlColor(row.daily) }}
            >
              {fmtAmt(row.daily)}
            </span>
            <span
              className="text-right tabular-nums"
              style={{ color: pnlColor(row.wtd) }}
            >
              {fmtAmt(row.wtd)}
            </span>
            <span
              className="text-right tabular-nums"
              style={{ color: pnlColor(row.mtd) }}
            >
              {fmtAmt(row.mtd)}
            </span>
            <span
              className="text-right tabular-nums font-bold"
              style={{ color: pnlColor(row.ytd) }}
            >
              {fmtAmt(row.ytd)}
            </span>
          </div>
        ))}

        {/* Total row */}
        {summary && (
          <div className="grid grid-cols-[1fr_52px_48px_52px_52px] gap-0.5 px-1 py-1 border-t border-border/30 mt-0.5">
            <span className="text-[8px] font-mono font-black text-neutral-400 uppercase">Total</span>
            <span
              className="text-[9px] font-mono font-black tabular-nums text-right"
              style={{ color: pnlColor(summary.totalDaily) }}
            >
              {fmtAmt(summary.totalDaily)}
            </span>
            <span className="text-right text-neutral-600 text-[8px] font-mono">--</span>
            <span
              className="text-[9px] font-mono font-black tabular-nums text-right"
              style={{ color: pnlColor(summary.totalMtd) }}
            >
              {fmtAmt(summary.totalMtd)}
            </span>
            <span
              className="text-[9px] font-mono font-black tabular-nums text-right"
              style={{ color: pnlColor(summary.totalYtd) }}
            >
              {fmtAmt(summary.totalYtd)}
            </span>
          </div>
        )}
      </div>

      {/* Daily P&L visual bar chart */}
      {(data.pnlAttribution ?? []).length > 0 && (
        <div className="px-2 py-2 border-t border-border/20">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
            {tr(t, 'rdPnlBreakdown', 'Daily P&L Breakdown')}
          </div>
          <PnlBarChart sources={data.pnlAttribution} />
        </div>
      )}
    </div>
  );
}

function PnlSummaryCell({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div className={`flex-1 px-2 py-1.5 ${last ? '' : 'border-r border-border/10'}`}>
      <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div
        className="text-[10px] font-mono font-black tabular-nums"
        style={{ color: pnlColor(value) }}
      >
        {fmtAmt(value)}
      </div>
    </div>
  );
}

function PnlBarChart({ sources }: { sources: PnlSource[] }) {
  const maxAbs = Math.max(...sources.map((s) => Math.abs(s.daily)), 1);

  return (
    <div className="space-y-1">
      {sources.map((s) => {
        const pct = (s.daily / maxAbs) * 50;
        const isPositive = s.daily >= 0;
        const barColor = isPositive ? '#4ade80' : '#f87171';

        return (
          <div key={s.source} className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-neutral-500 w-12 text-right uppercase truncate">
              {s.source}
            </span>
            <div className="flex-1 h-2 relative bg-neutral-900/50">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-700" />
              {/* Bar */}
              <div
                className="absolute top-0 h-full"
                style={{
                  left: isPositive ? '50%' : `${50 - Math.abs(pct)}%`,
                  width: `${Math.abs(pct)}%`,
                  backgroundColor: barColor,
                  opacity: 0.6,
                }}
              />
            </div>
            <span
              className="text-[7px] font-mono font-bold tabular-nums w-12"
              style={{ color: barColor }}
            >
              {fmtAmt(s.daily)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
