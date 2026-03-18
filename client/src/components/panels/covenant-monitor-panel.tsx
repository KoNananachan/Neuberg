import { useState, useMemo } from 'react';
import {
  useCovenantMonitor,
  type CovenantMonitorData,
  type Issuer,
  type Covenant,
  type CovenantEvent,
  type CovenantStatus,
  type IssuerCategory,
  type DebtMetrics,
  type MaturityProfile,
  type CovenantSummary,
} from '../../api/hooks/use-covenant-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type ViewMode = 'OVERVIEW' | 'DETAIL' | 'EVENTS';
type CategoryFilter = 'ALL' | 'IG' | 'HY';

// ── Status colors ──

function statusColor(status: CovenantStatus): string {
  switch (status) {
    case 'Compliant': return 'text-green-400';
    case 'Warning': return 'text-yellow-400';
    case 'Breach': return 'text-red-400';
    case 'Waived': return 'text-blue-400';
  }
}

function statusBg(status: CovenantStatus): string {
  switch (status) {
    case 'Compliant': return 'bg-green-400/15 border-green-400/30';
    case 'Warning': return 'bg-yellow-400/15 border-yellow-400/30';
    case 'Breach': return 'bg-red-400/15 border-red-400/30';
    case 'Waived': return 'bg-blue-400/15 border-blue-400/30';
  }
}

function statusDot(status: CovenantStatus): string {
  switch (status) {
    case 'Compliant': return 'bg-green-400';
    case 'Warning': return 'bg-yellow-400';
    case 'Breach': return 'bg-red-400';
    case 'Waived': return 'bg-blue-400';
  }
}

// ── Event severity colors ──

function severityColor(severity: CovenantEvent['severity']): string {
  switch (severity) {
    case 'high': return 'text-red-400';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-neutral-500';
  }
}

function eventTypeBadge(type: CovenantEvent['type']): { text: string; color: string } {
  switch (type) {
    case 'BREACH': return { text: 'BREACH', color: 'text-red-400 bg-red-400/15' };
    case 'WAIVER': return { text: 'WAIVER', color: 'text-blue-400 bg-blue-400/15' };
    case 'AMENDMENT': return { text: 'AMEND', color: 'text-purple-400 bg-purple-400/15' };
    case 'TEST': return { text: 'TEST', color: 'text-green-400 bg-green-400/15' };
    case 'DOWNGRADE': return { text: 'DNGRD', color: 'text-red-400 bg-red-400/15' };
    case 'UPGRADE': return { text: 'UPGRD', color: 'text-green-400 bg-green-400/15' };
    case 'MATURITY': return { text: 'MATUR', color: 'text-orange-400 bg-orange-400/15' };
    case 'REFINANCE': return { text: 'REFI', color: 'text-cyan-400 bg-cyan-400/15' };
  }
}

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function fmtLargeNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}T`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function headroomColor(headroom: number): string {
  if (headroom < 0) return 'text-red-400';
  if (headroom < 10) return 'text-yellow-400';
  if (headroom < 25) return 'text-neutral-300';
  return 'text-green-400';
}

function leverageColor(leverage: number): string {
  if (leverage < 0) return 'text-red-400';
  if (leverage > 8) return 'text-red-400';
  if (leverage > 5) return 'text-orange-400';
  if (leverage > 3) return 'text-yellow-400';
  return 'text-green-400';
}

function coverageColor(coverage: number): string {
  if (coverage < 0) return 'text-red-400';
  if (coverage < 1.5) return 'text-red-400';
  if (coverage < 3) return 'text-yellow-400';
  if (coverage < 6) return 'text-neutral-300';
  return 'text-green-400';
}

// ── Main Panel ──

export function CovenantMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCovenantMonitor();

  const [view, setView] = useState<ViewMode>('OVERVIEW');
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const filteredIssuers = useMemo(() => {
    if (!data) return [];
    if (filter === 'ALL') return data.issuers;
    return data.issuers.filter((i) => i.category === filter);
  }, [data, filter]);

  const breachCount = useMemo(() => {
    if (!data) return 0;
    return data.issuers.filter((i) => i.overallStatus === 'Breach').length;
  }, [data]);

  const selectedIssuer = useMemo(() => {
    if (!data || !selectedTicker) return null;
    return data.issuers.find((i) => i.ticker === selectedTicker) ?? null;
  }, [data, selectedTicker]);

  // Auto-select first issuer when switching to DETAIL view
  const handleViewChange = (v: ViewMode) => {
    setView(v);
    if (v === 'DETAIL' && !selectedTicker && data && data.issuers.length > 0) {
      setSelectedTicker(data.issuers[0].ticker);
    }
  };

  const handleIssuerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setView('DETAIL');
  };

  // Overall health indicator
  const healthIndicator = useMemo(() => {
    if (!data) return { color: 'bg-neutral-500', label: 'N/A' };
    const pct = data.summary.compliant / data.summary.totalIssuers;
    if (pct >= 0.8) return { color: 'bg-green-400', label: 'HEALTHY' };
    if (pct >= 0.6) return { color: 'bg-yellow-400', label: 'CAUTION' };
    return { color: 'bg-red-400', label: 'STRESS' };
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'covMonTitle', 'Covenant Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Health indicator */}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 ${healthIndicator.color} animate-pulse`} />
            <span className={`text-[7px] font-mono font-bold ${
              healthIndicator.label === 'HEALTHY' ? 'text-green-400' :
              healthIndicator.label === 'CAUTION' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {healthIndicator.label}
            </span>
          </div>

          {/* Breach count badge */}
          {breachCount > 0 && (
            <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-red-400 bg-red-400/15 border border-red-400/30">
              {breachCount} {breachCount === 1 ? 'BREACH' : 'BREACHES'}
            </span>
          )}

          {/* View tabs */}
          <div className="flex items-center gap-0.5">
            {(['OVERVIEW', 'DETAIL', 'EVENTS'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                  view === v
                    ? 'text-red-400 bg-red-400/15'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-red-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'covMonNoData', 'No data available')}
          </div>
        )}

        {data && view === 'OVERVIEW' && (
          <OverviewView
            data={data}
            issuers={filteredIssuers}
            filter={filter}
            onFilterChange={setFilter}
            onIssuerClick={handleIssuerClick}
            t={t}
          />
        )}

        {data && view === 'DETAIL' && (
          <DetailView
            issuers={data.issuers}
            selected={selectedIssuer}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            t={t}
          />
        )}

        {data && view === 'EVENTS' && (
          <EventsView issuers={data.issuers} t={t} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'covMonLastUpdate', 'Generated')}: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// OVERVIEW VIEW
// ══════════════════════════════════════════════════════════════════════

function OverviewView({
  data,
  issuers,
  filter,
  onFilterChange,
  onIssuerClick,
  t,
}: {
  data: CovenantMonitorData;
  issuers: Issuer[];
  filter: CategoryFilter;
  onFilterChange: (f: CategoryFilter) => void;
  onIssuerClick: (ticker: string) => void;
  t: TFn;
}) {
  return (
    <div>
      {/* Summary stats bar */}
      <SummaryBar summary={data.summary} t={t} />

      {/* Filter bar */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-[#050505]">
        {(['ALL', 'IG', 'HY'] as CategoryFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
              filter === f
                ? 'text-red-400 bg-red-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-[7px] font-mono text-neutral-700 ml-2">
          {issuers.length} {tr(t, 'covMonIssuers', 'issuers')}
        </span>
      </div>

      {/* Issuers grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonIssuer', 'Issuer')}
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonRating', 'Rating')}
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonStatus', 'Status')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonLeverage', 'Leverage')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonCoverage', 'Int Cov')}
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonHeadroom', 'Min Headroom')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonDebt', 'Total Debt')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'covMonFCF', 'FCF')}
              </th>
            </tr>
          </thead>
          <tbody>
            {issuers.map((issuer) => (
              <IssuerRow key={issuer.ticker} issuer={issuer} onClick={() => onIssuerClick(issuer.ticker)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryBar({ summary, t }: { summary: CovenantSummary; t: TFn }) {
  return (
    <div className="grid grid-cols-6 gap-px bg-border/10 border-b border-border/20">
      <SummaryCell label={tr(t, 'covMonTotal', 'Total')} value={summary.totalIssuers.toString()} color="text-white" />
      <SummaryCell label={tr(t, 'covMonCompliant', 'Compliant')} value={summary.compliant.toString()} color="text-green-400" />
      <SummaryCell label={tr(t, 'covMonWarning', 'Warning')} value={summary.warning.toString()} color="text-yellow-400" />
      <SummaryCell label={tr(t, 'covMonBreach', 'Breach')} value={summary.breach.toString()} color="text-red-400" />
      <SummaryCell label={tr(t, 'covMonAvgLev', 'Avg Lev')} value={`${fmtNum(summary.avgLeverage, 2)}x`} color={leverageColor(summary.avgLeverage)} />
      <SummaryCell label={tr(t, 'covMonAvgCov', 'Avg Cov')} value={`${fmtNum(summary.avgCoverage, 1)}x`} color={coverageColor(summary.avgCoverage)} />
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function IssuerRow({ issuer, onClick }: { issuer: Issuer; onClick: () => void }) {
  // Find minimum headroom across covenants
  const minHeadroom = Math.min(...issuer.covenants.map((c) => c.headroom));
  const headroomBarWidth = Math.max(0, Math.min(100, minHeadroom));

  return (
    <tr
      className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Issuer */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className={`w-1 h-1 ${statusDot(issuer.overallStatus)}`} />
          <span className="text-white font-bold">{issuer.ticker}</span>
          <span className="text-[7px] text-neutral-600">{issuer.name}</span>
          <span className={`text-[6px] font-bold px-0.5 ${
            issuer.category === 'IG' ? 'text-blue-400 bg-blue-400/10' : 'text-orange-400 bg-orange-400/10'
          }`}>
            {issuer.category}
          </span>
        </div>
      </td>

      {/* Rating */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`font-bold ${getRatingColor(issuer.rating)}`}>{issuer.rating}</span>
      </td>

      {/* Status */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className={`text-[7px] font-bold px-1 py-0.5 border ${statusColor(issuer.overallStatus)} ${statusBg(issuer.overallStatus)}`}>
          {issuer.overallStatus.toUpperCase()}
        </span>
      </td>

      {/* Leverage */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${leverageColor(issuer.debtMetrics.leverage)}`}>
        {fmtNum(issuer.debtMetrics.leverage, 2)}x
      </td>

      {/* Interest Coverage */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${coverageColor(issuer.debtMetrics.interestCoverage)}`}>
        {fmtNum(issuer.debtMetrics.interestCoverage, 1)}x
      </td>

      {/* Headroom bar */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 bg-neutral-900 relative">
            <div
              className={`absolute top-0 left-0 h-full ${
                minHeadroom < 0 ? 'bg-red-400/50' :
                minHeadroom < 10 ? 'bg-yellow-400/40' :
                minHeadroom < 25 ? 'bg-neutral-400/30' : 'bg-green-400/40'
              }`}
              style={{ width: `${headroomBarWidth}%` }}
            />
          </div>
          <span className={`text-[8px] font-mono font-bold w-8 text-right ${headroomColor(minHeadroom)}`}>
            {fmtPct(minHeadroom)}
          </span>
        </div>
      </td>

      {/* Total Debt */}
      <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
        ${fmtLargeNum(issuer.debtMetrics.totalDebt)}
      </td>

      {/* FCF */}
      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${
        issuer.debtMetrics.freeCashFlow >= 0 ? 'text-green-400' : 'text-red-400'
      }`}>
        ${fmtLargeNum(issuer.debtMetrics.freeCashFlow)}
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DETAIL VIEW
// ══════════════════════════════════════════════════════════════════════

function DetailView({
  issuers,
  selected,
  selectedTicker,
  onSelect,
  t,
}: {
  issuers: Issuer[];
  selected: Issuer | null;
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  t: TFn;
}) {
  return (
    <div>
      {/* Issuer selector */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-[#050505] flex-wrap">
        {issuers.map((iss) => (
          <button
            key={iss.ticker}
            onClick={() => onSelect(iss.ticker)}
            className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors flex items-center gap-0.5 ${
              selectedTicker === iss.ticker
                ? 'text-red-400 bg-red-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            <div className={`w-1 h-1 ${statusDot(iss.overallStatus)}`} />
            {iss.ticker}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="px-3 py-2 space-y-3">
          {/* Issuer header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-black text-white">{selected.name}</span>
              <span className={`text-[8px] font-bold ${getRatingColor(selected.rating)}`}>{selected.rating}</span>
              <span className={`text-[7px] font-bold px-1 py-0.5 border ${statusColor(selected.overallStatus)} ${statusBg(selected.overallStatus)}`}>
                {selected.overallStatus.toUpperCase()}
              </span>
              <span className={`text-[6px] font-bold px-0.5 ${
                selected.category === 'IG' ? 'text-blue-400 bg-blue-400/10' : 'text-orange-400 bg-orange-400/10'
              }`}>
                {selected.category}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-600">{selected.sector}</span>
          </div>

          {/* Covenant table */}
          <CovenantTable covenants={selected.covenants} t={t} />

          {/* Debt metrics */}
          <DebtMetricsCards metrics={selected.debtMetrics} t={t} />

          {/* Maturity bars */}
          <MaturityBars profile={selected.maturityProfile} t={t} />

          {/* Recent events for this issuer */}
          {selected.recentEvents.length > 0 && (
            <div>
              <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
                {tr(t, 'covMonRecentEvents', 'Recent Events')}
              </div>
              <div className="space-y-0.5">
                {selected.recentEvents.slice(0, 5).map((evt, idx) => (
                  <EventRow key={idx} event={evt} showIssuer={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'covMonSelectIssuer', 'Select an issuer above')}
        </div>
      )}
    </div>
  );
}

function CovenantTable({ covenants, t }: { covenants: Covenant[]; t: TFn }) {
  return (
    <div>
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
        {tr(t, 'covMonCovenants', 'Covenant Tests')}
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="border-b border-border/20">
            <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonCovName', 'Covenant')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonThreshold', 'Threshold')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonCurrent', 'Current')}
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonHeadroomCol', 'Headroom')}
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonStatusCol', 'Status')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500">
              {tr(t, 'covMonLastTest', 'Last Test')}
            </th>
          </tr>
        </thead>
        <tbody>
          {covenants.map((cov, idx) => (
            <tr key={idx} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
              <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">{cov.name}</td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">{fmtNum(cov.threshold, 2)}</td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${headroomColor(cov.headroom)}`}>
                {fmtNum(cov.currentValue, 2)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-neutral-900 relative">
                    <div
                      className={`absolute top-0 left-0 h-full ${
                        cov.headroom < 0 ? 'bg-red-400/50' :
                        cov.headroom < 10 ? 'bg-yellow-400/40' : 'bg-green-400/40'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, cov.headroom))}%` }}
                    />
                  </div>
                  <span className={`text-[8px] font-bold ${headroomColor(cov.headroom)}`}>
                    {fmtPct(cov.headroom)}
                  </span>
                </div>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap">
                <span className={`text-[7px] font-bold px-1 py-0.5 border ${statusColor(cov.status)} ${statusBg(cov.status)}`}>
                  {cov.status.toUpperCase()}
                </span>
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-600">{cov.lastTestDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DebtMetricsCards({ metrics, t }: { metrics: DebtMetrics; t: TFn }) {
  const cards = [
    { label: tr(t, 'covMonTotalDebt', 'Total Debt'), value: `$${fmtLargeNum(metrics.totalDebt)}`, color: 'text-white' },
    { label: tr(t, 'covMonNetDebt', 'Net Debt'), value: `$${fmtLargeNum(metrics.netDebt)}`, color: 'text-neutral-300' },
    { label: tr(t, 'covMonEBITDA', 'EBITDA'), value: `$${fmtLargeNum(metrics.ebitda)}`, color: metrics.ebitda >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: tr(t, 'covMonLeverageMetric', 'Leverage'), value: `${fmtNum(metrics.leverage, 2)}x`, color: leverageColor(metrics.leverage) },
    { label: tr(t, 'covMonIntCovMetric', 'Int. Coverage'), value: `${fmtNum(metrics.interestCoverage, 1)}x`, color: coverageColor(metrics.interestCoverage) },
    { label: tr(t, 'covMonFCFMetric', 'Free Cash Flow'), value: `$${fmtLargeNum(metrics.freeCashFlow)}`, color: metrics.freeCashFlow >= 0 ? 'text-green-400' : 'text-red-400' },
  ];

  return (
    <div>
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
        {tr(t, 'covMonDebtMetrics', 'Debt Metrics')}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
        {cards.map((card) => (
          <div key={card.label} className="p-1.5 border border-border/20 bg-[#060606]">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{card.label}</div>
            <div className={`text-[10px] font-mono font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaturityBars({ profile, t }: { profile: MaturityProfile[]; t: TFn }) {
  const maxAmount = useMemo(() => Math.max(...profile.map((p) => p.amount), 1), [profile]);

  return (
    <div>
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
        {tr(t, 'covMonMaturityProfile', 'Maturity Profile')}
      </div>
      <div className="flex items-end gap-1 h-16">
        {profile.map((p) => {
          const pct = (p.amount / maxAmount) * 100;
          return (
            <div key={p.year} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={`text-[7px] font-mono font-bold ${
                pct > 70 ? 'text-red-400' : pct > 40 ? 'text-yellow-400' : 'text-neutral-400'
              }`}>
                ${fmtLargeNum(p.amount)}
              </span>
              <div className="w-full relative" style={{ height: 40 }}>
                <div
                  className={`absolute bottom-0 w-full ${
                    pct > 70 ? 'bg-red-400/40' : pct > 40 ? 'bg-yellow-400/30' : 'bg-neutral-500/25'
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-600">{p.year}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// EVENTS VIEW
// ══════════════════════════════════════════════════════════════════════

function EventsView({ issuers, t }: { issuers: Issuer[]; t: TFn }) {
  // Collect all events from all issuers and sort chronologically
  const allEvents = useMemo(() => {
    const events: CovenantEvent[] = [];
    for (const issuer of issuers) {
      for (const evt of issuer.recentEvents) {
        events.push(evt);
      }
    }
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [issuers]);

  // Group by date
  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: CovenantEvent[] }[] = [];
    let currentDate = '';
    let currentGroup: CovenantEvent[] = [];

    for (const evt of allEvents) {
      if (evt.date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, events: currentGroup });
        }
        currentDate = evt.date;
        currentGroup = [evt];
      } else {
        currentGroup.push(evt);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, events: currentGroup });
    }

    return groups;
  }, [allEvents]);

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'covMonEventFeed', 'Covenant Event Feed')}
        <span className="text-neutral-700 ml-2">{allEvents.length} events</span>
      </div>

      <div className="space-y-2">
        {groupedEvents.map((group) => (
          <div key={group.date}>
            <div className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider mb-0.5 sticky top-0 bg-black py-0.5">
              {group.date}
            </div>
            <div className="space-y-0.5">
              {group.events.map((evt, idx) => (
                <EventRow key={`${group.date}-${idx}`} event={evt} showIssuer />
              ))}
            </div>
          </div>
        ))}
      </div>

      {allEvents.length === 0 && (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'covMonNoEvents', 'No recent events')}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, showIssuer }: { event: CovenantEvent; showIssuer: boolean }) {
  const badge = eventTypeBadge(event.type);

  return (
    <div className="flex items-start gap-2 px-1 py-1 hover:bg-red-400/[0.02] transition-colors">
      {/* Severity dot */}
      <div className={`w-1 h-1 mt-1 shrink-0 ${
        event.severity === 'high' ? 'bg-red-400' :
        event.severity === 'medium' ? 'bg-yellow-400' : 'bg-neutral-600'
      }`} />

      {/* Type badge */}
      <span className={`text-[7px] font-bold px-1 py-0.5 shrink-0 ${badge.color}`}>
        {badge.text}
      </span>

      {/* Issuer ticker */}
      {showIssuer && (
        <span className="text-[8px] font-mono font-bold text-white shrink-0 w-8">
          {event.ticker}
        </span>
      )}

      {/* Description */}
      <span className="text-[8px] font-mono text-neutral-400 leading-tight">
        {event.description}
      </span>
    </div>
  );
}

// ── Rating color helper ──

function getRatingColor(rating: string): string {
  if (rating === 'AAA') return 'text-emerald-300';
  if (rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-blue-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating === 'D') return 'text-neutral-500';
  return 'text-red-400';
}
