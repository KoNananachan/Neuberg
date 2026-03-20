import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useEarningsEstimates, type EarningsHistoryEntry, type EstimatePeriod, type RevisionPeriod } from '../../api/hooks/use-earnings-estimates';
import { BarChart3, RefreshCw, Search } from 'lucide-react';
import { useT, tr, TFn } from '../../i18n';

type TabKey = 'estimates' | 'history' | 'revisions';

function formatLargeNumber(n: number | null): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatEps(n: number | null): string {
  if (n == null) return '-';
  return n.toFixed(2);
}

function formatPct(n: number | null): string {
  if (n == null) return '-';
  const val = n * 100;
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function pctColor(n: number | null): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function surpriseColor(n: number | null): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

// ── EPS Overview Card ──
function EpsOverviewCard({ eps, pe }: {
  eps: { ttm: number | null; forward: number | null };
  pe: { trailing: number | null; forward: number | null };
}) {
  return (
    <div className="grid grid-cols-2 gap-px bg-white/[0.04] border border-white/[0.06] rounded">
      {[
        { label: 'EPS (TTM)', value: formatEps(eps.ttm), color: 'text-blue-400' },
        { label: 'EPS (FWD)', value: formatEps(eps.forward), color: 'text-blue-300' },
        { label: 'P/E (TTM)', value: pe.trailing != null ? pe.trailing.toFixed(1) : '-', color: 'text-neutral/70' },
        { label: 'P/E (FWD)', value: pe.forward != null ? pe.forward.toFixed(1) : '-', color: 'text-neutral/70' },
      ].map((item) => (
        <div key={item.label} className="px-2 py-1.5 bg-black/40">
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">{item.label}</div>
          <div className={`text-[12px] font-mono font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Consensus Estimates Table ──
function ConsensusTable({ estimates }: {
  estimates: {
    currentQuarter: EstimatePeriod | null;
    nextQuarter: EstimatePeriod | null;
    currentYear: EstimatePeriod | null;
    nextYear: EstimatePeriod | null;
  };
}) {
  const rows: { label: string; data: EstimatePeriod | null }[] = [
    { label: 'Current Qtr', data: estimates.currentQuarter },
    { label: 'Next Qtr', data: estimates.nextQuarter },
    { label: 'Current Year', data: estimates.currentYear },
    { label: 'Next Year', data: estimates.nextYear },
  ];

  return (
    <div className="border border-white/[0.06] rounded overflow-hidden">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Period</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Avg</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Low</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">High</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium"># Analysts</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Growth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="px-2 py-1 text-neutral/70 font-medium">{row.label}</td>
              <td className="text-right px-2 py-1 text-white font-bold">{formatEps(row.data?.avg ?? null)}</td>
              <td className="text-right px-2 py-1 text-neutral/50">{formatEps(row.data?.low ?? null)}</td>
              <td className="text-right px-2 py-1 text-neutral/50">{formatEps(row.data?.high ?? null)}</td>
              <td className="text-right px-2 py-1 text-neutral/50">{row.data?.numAnalysts ?? '-'}</td>
              <td className={`text-right px-2 py-1 font-bold ${pctColor(row.data?.growth ?? null)}`}>
                {formatPct(row.data?.growth ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Earnings Surprise SVG Bar Chart ──
function EarningsSurpriseChart({ history }: { history: EarningsHistoryEntry[] }) {
  const data = useMemo(() => [...history].reverse().slice(-8), [history]);

  if (data.length === 0) {
    return <div className="text-center text-neutral/30 text-[9px] font-mono py-4 uppercase">No history data</div>;
  }

  // Calculate scale
  const allValues = data.flatMap(d => [d.epsEstimate, d.epsActual].filter((v): v is number => v != null));
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const chartW = 100;
  const chartH = 60;
  const padding = { top: 12, bottom: 14, left: 2, right: 2 };
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;

  const barGroupWidth = innerW / data.length;
  const barWidth = barGroupWidth * 0.3;
  const gap = barGroupWidth * 0.05;

  const yScale = (val: number) => {
    return padding.top + innerH - ((val - minVal) / range) * innerH;
  };

  const zeroY = yScale(0);

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ maxHeight: '140px' }}
    >
      {/* Zero line */}
      {minVal < 0 && (
        <line x1={padding.left} x2={chartW - padding.right} y1={zeroY} y2={zeroY}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="1,1" />
      )}

      {data.map((d, i) => {
        const x = padding.left + i * barGroupWidth + barGroupWidth * 0.15;
        const est = d.epsEstimate;
        const act = d.epsActual;
        const beat = act != null && est != null && act >= est;

        return (
          <g key={i}>
            {/* Estimate bar (gray) */}
            {est != null && (
              <rect
                x={x}
                y={est >= 0 ? yScale(est) : zeroY}
                width={barWidth}
                height={Math.abs(yScale(est) - zeroY) || 0.5}
                fill="rgba(148,163,184,0.4)"
                rx="0.5"
              />
            )}
            {/* Actual bar (green/red) */}
            {act != null && (
              <rect
                x={x + barWidth + gap}
                y={act >= 0 ? yScale(act) : zeroY}
                width={barWidth}
                height={Math.abs(yScale(act) - zeroY) || 0.5}
                fill={beat ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)'}
                rx="0.5"
              />
            )}
            {/* Surprise % label */}
            {d.surprisePct != null && (
              <text
                x={x + barWidth + gap / 2}
                y={padding.top - 2}
                textAnchor="middle"
                fill={d.surprisePct >= 0 ? '#4ade80' : '#f87171'}
                fontSize="2.8"
                fontFamily="monospace"
              >
                {d.surprisePct >= 0 ? '+' : ''}{d.surprisePct.toFixed(1)}%
              </text>
            )}
            {/* Quarter label */}
            <text
              x={x + barWidth}
              y={chartH - 2}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="2.8"
              fontFamily="monospace"
            >
              {d.quarter}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={chartW - 22} y={1} width={3} height={2} fill="rgba(148,163,184,0.4)" rx="0.3" />
      <text x={chartW - 18} y={2.8} fill="rgba(255,255,255,0.3)" fontSize="2.5" fontFamily="monospace">Est</text>
      <rect x={chartW - 11} y={1} width={3} height={2} fill="rgba(74,222,128,0.7)" rx="0.3" />
      <text x={chartW - 7} y={2.8} fill="rgba(255,255,255,0.3)" fontSize="2.5" fontFamily="monospace">Act</text>
    </svg>
  );
}

// ── History Table ──
function HistoryTable({ history }: { history: EarningsHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="border border-white/[0.06] rounded overflow-hidden">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Quarter</th>
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Estimate</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Actual</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise%</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => {
            const beat = h.epsActual != null && h.epsEstimate != null && h.epsActual >= h.epsEstimate;
            const color = h.surprise != null ? (beat ? 'text-green-400' : 'text-red-400') : 'text-neutral/50';
            return (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-neutral/70 font-medium">{h.quarter}</td>
                <td className="px-2 py-1 text-neutral/50">{h.date}</td>
                <td className="text-right px-2 py-1 text-neutral/60">{formatEps(h.epsEstimate)}</td>
                <td className={`text-right px-2 py-1 font-bold ${color}`}>{formatEps(h.epsActual)}</td>
                <td className={`text-right px-2 py-1 ${color}`}>
                  {h.surprise != null ? `${h.surprise >= 0 ? '+' : ''}${h.surprise.toFixed(2)}` : '-'}
                </td>
                <td className={`text-right px-2 py-1 font-bold ${color}`}>
                  {h.surprisePct != null ? `${h.surprisePct >= 0 ? '+' : ''}${h.surprisePct.toFixed(1)}%` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Revisions Tab ──
function RevisionsTab({ revisions }: {
  revisions: {
    currentQuarter: RevisionPeriod | null;
    nextQuarter: RevisionPeriod | null;
    currentYear: RevisionPeriod | null;
    nextYear: RevisionPeriod | null;
  };
}) {
  const rows: { label: string; data: RevisionPeriod | null }[] = [
    { label: 'Current Qtr', data: revisions.currentQuarter },
    { label: 'Next Qtr', data: revisions.nextQuarter },
    { label: 'Current Year', data: revisions.currentYear },
    { label: 'Next Year', data: revisions.nextYear },
  ];

  const hasAnyData = rows.some(r => r.data != null);
  if (!hasAnyData) {
    return <div className="text-center text-neutral/30 text-[9px] font-mono py-8 uppercase">No revision data available</div>;
  }

  function arrow(current: number | null, prev: number | null): string {
    if (current == null || prev == null) return '';
    if (current > prev) return ' \u25B2';
    if (current < prev) return ' \u25BC';
    return ' \u2500';
  }

  function arrowColor(current: number | null, prev: number | null): string {
    if (current == null || prev == null) return 'text-neutral/40';
    if (current > prev) return 'text-green-400';
    if (current < prev) return 'text-red-400';
    return 'text-neutral/40';
  }

  return (
    <div className="border border-white/[0.06] rounded overflow-hidden">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-white/[0.06]">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Period</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Current</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">30d Ago</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">60d Ago</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">90d Ago</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="px-2 py-1 text-neutral/70 font-medium">{row.label}</td>
              <td className="text-right px-2 py-1 text-white font-bold">{formatEps(row.data?.current ?? null)}</td>
              <td className={`text-right px-2 py-1 ${arrowColor(row.data?.current ?? null, row.data?.thirtyDaysAgo ?? null)}`}>
                {formatEps(row.data?.thirtyDaysAgo ?? null)}{arrow(row.data?.current ?? null, row.data?.thirtyDaysAgo ?? null)}
              </td>
              <td className={`text-right px-2 py-1 ${arrowColor(row.data?.current ?? null, row.data?.sixtyDaysAgo ?? null)}`}>
                {formatEps(row.data?.sixtyDaysAgo ?? null)}{arrow(row.data?.current ?? null, row.data?.sixtyDaysAgo ?? null)}
              </td>
              <td className={`text-right px-2 py-1 ${arrowColor(row.data?.current ?? null, row.data?.ninetyDaysAgo ?? null)}`}>
                {formatEps(row.data?.ninetyDaysAgo ?? null)}{arrow(row.data?.current ?? null, row.data?.ninetyDaysAgo ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──
export function EarningsEstimatesPanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [activeTab, setActiveTab] = useState<TabKey>('estimates');

  const { data, isLoading, refetch, dataUpdatedAt } = useEarningsEstimates(symbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.toUpperCase().trim();
    if (val && val !== symbol) {
      setSymbol(val);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    if (!data) return { beatRate: null, avgSurprise: null, countdown: null };

    const history = data.earningsHistory.filter(h => h.epsActual != null && h.epsEstimate != null);
    const beats = history.filter(h => (h.epsActual ?? 0) >= (h.epsEstimate ?? 0));
    const beatRate = history.length > 0 ? (beats.length / history.length) * 100 : null;

    const withSurprise = data.earningsHistory.filter(h => h.surprisePct != null);
    const avgSurprise = withSurprise.length > 0
      ? withSurprise.reduce((s, h) => s + (h.surprisePct ?? 0), 0) / withSurprise.length
      : null;

    const countdown = daysUntil(data.nextEarningsDate);

    return { beatRate, avgSurprise, countdown };
  }, [data]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'estimates', label: tr(t, 'eeEstimates', 'Estimates') },
    { key: 'history', label: tr(t, 'eeHistory', 'History') },
    { key: 'revisions', label: tr(t, 'eeRevisions', 'Revisions') },
  ];

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <BarChart3 size={12} className="text-blue-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {tr(t, 'panelEarningsEstimates', 'EARNINGS ESTIMATES')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[9px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-blue-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Symbol Input */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.04]">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <Search size={10} className="text-neutral/40" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="SYMBOL"
            className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-0.5 text-[10px] font-mono text-white w-20 outline-none focus:border-blue-400/50 uppercase"
          />
          <button
            type="submit"
            className="px-2 py-0.5 text-[9px] font-mono uppercase bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
          >
            Go
          </button>
        </form>
        {data && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-mono text-neutral/60 truncate max-w-[120px]">{data.companyName}</span>
            <span className="text-[11px] font-mono font-bold text-white">${data.currentPrice.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-white/[0.04]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-3 py-2">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 animate-spin rounded-full" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {tr(t, 'eeNoData', 'No data available')}
          </div>
        ) : (
          <>
            {activeTab === 'estimates' && (
              <div className="flex flex-col gap-3">
                {/* EPS Overview */}
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">EPS Overview</div>
                  <EpsOverviewCard eps={data.eps} pe={data.pe} />
                </div>

                {/* Consensus Estimates */}
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Consensus Estimates</div>
                  <ConsensusTable estimates={data.estimates} />
                </div>

                {/* Revenue */}
                <div className="grid grid-cols-2 gap-px bg-white/[0.04] border border-white/[0.06] rounded">
                  <div className="px-2 py-1.5 bg-black/40">
                    <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">Revenue (TTM)</div>
                    <div className="text-[11px] font-mono font-bold text-blue-400">{formatLargeNumber(data.revenue.ttm)}</div>
                  </div>
                  <div className="px-2 py-1.5 bg-black/40">
                    <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">Revenue Growth</div>
                    <div className={`text-[11px] font-mono font-bold ${pctColor(data.revenue.growth)}`}>
                      {formatPct(data.revenue.growth)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex flex-col gap-3">
                {/* Surprise Chart */}
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Earnings Surprise</div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded p-2">
                    <EarningsSurpriseChart history={data.earningsHistory} />
                  </div>
                </div>

                {/* History Table */}
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Earnings History</div>
                  <HistoryTable history={data.earningsHistory} />
                </div>
              </div>
            )}

            {activeTab === 'revisions' && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">Estimate Revisions (EPS Trend)</div>
                  <RevisionsTab revisions={data.revisions} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Key Stats Summary Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-white/[0.04] text-[9px] font-mono text-neutral/30">
        <div className="flex items-center gap-3">
          {data?.nextEarningsDate && (
            <span>
              Next: <span className="text-blue-400/70">{data.nextEarningsDate}</span>
              {stats.countdown != null && stats.countdown >= 0 && (
                <span className="text-neutral/40"> ({stats.countdown}d)</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {stats.beatRate != null && (
            <span>
              Beat Rate: <span className={stats.beatRate >= 50 ? 'text-green-400/70' : 'text-red-400/70'}>
                {stats.beatRate.toFixed(0)}%
              </span>
            </span>
          )}
          {stats.avgSurprise != null && (
            <span>
              Avg Surprise: <span className={surpriseColor(stats.avgSurprise)}>
                {stats.avgSurprise >= 0 ? '+' : ''}{stats.avgSurprise.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
