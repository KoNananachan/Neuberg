import { useState } from 'react';
import { useMarketSurveillance } from '../../api/hooks/use-market-surveillance';
import { useT } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SurveillanceData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AlertItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnusualActivity = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CircuitBreaker = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CrossMarketPattern = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComplianceMetrics = any;

type Tab = 'alerts' | 'unusual' | 'breakers' | 'cross' | 'compliance';

function severityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30';
  }
}

function severityDot(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'bg-red-400';
    case 'high': return 'bg-orange-400';
    case 'medium': return 'bg-yellow-400';
    case 'low': return 'bg-blue-400';
    default: return 'bg-neutral-400';
  }
}

function statusBadge(status: string): { label: string; cls: string } {
  switch (status?.toLowerCase()) {
    case 'open': return { label: 'OPEN', cls: 'text-red-400 bg-red-400/10' };
    case 'investigating': return { label: 'INV', cls: 'text-yellow-400 bg-yellow-400/10' };
    case 'resolved': return { label: 'RSLV', cls: 'text-emerald-400 bg-emerald-400/10' };
    case 'dismissed': return { label: 'DISM', cls: 'text-neutral-500 bg-neutral-500/10' };
    default: return { label: status?.toUpperCase() ?? '—', cls: 'text-neutral-400 bg-neutral-400/10' };
  }
}

function typeBadge(type: string): string {
  switch (type?.toLowerCase()) {
    case 'insider': return 'text-purple-400 bg-purple-400/10';
    case 'spoofing': return 'text-red-400 bg-red-400/10';
    case 'wash': return 'text-orange-400 bg-orange-400/10';
    case 'front-running': return 'text-yellow-400 bg-yellow-400/10';
    case 'manipulation': return 'text-rose-400 bg-rose-400/10';
    case 'unusual_volume': return 'text-cyan-400 bg-cyan-400/10';
    case 'options_spike': return 'text-blue-400 bg-blue-400/10';
    default: return 'text-neutral-400 bg-neutral-400/10';
  }
}

function fmtNum(n: number | undefined | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtTime(ts: string | undefined | null): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return ts;
  }
}

// ── Alert Summary Bar ────────────────────────────────────────────────────────
function AlertSummary({ data }: { data: SurveillanceData }) {
  const summary = data?.alertSummary;
  return (
    <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Total</div>
        <div className="text-[11px] font-mono font-black text-red-400">{summary?.total ?? 0}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Critical</div>
        <div className="text-[11px] font-mono font-black text-red-400">{summary?.critical ?? 0}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">High</div>
        <div className="text-[11px] font-mono font-black text-orange-400">{summary?.high ?? 0}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Medium</div>
        <div className="text-[11px] font-mono font-black text-yellow-400">{summary?.medium ?? 0}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Open</div>
        <div className="text-[11px] font-mono font-black text-red-400">{summary?.open ?? 0}</div>
      </div>
      <div>
        <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Resolved</div>
        <div className="text-[11px] font-mono font-black text-emerald-400">{summary?.resolved ?? 0}</div>
      </div>
    </div>
  );
}

// ── Alert Feed ───────────────────────────────────────────────────────────────
function AlertFeed({ alerts }: { alerts: AlertItem[] | undefined }) {
  if (!alerts?.length) {
    return <div className="flex items-center justify-center py-6 text-[8px] font-mono text-neutral/30 uppercase tracking-wider">No recent alerts</div>;
  }
  return (
    <div className="space-y-0">
      {alerts.map((a: AlertItem, i: number) => {
        const st = statusBadge(a?.status);
        return (
          <div key={a?.id ?? i} className="flex items-start gap-2 px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
            <div className={`w-1.5 h-1.5 mt-1 shrink-0 ${severityDot(a?.severity)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-neutral/40">{fmtTime(a?.timestamp)}</span>
                {a?.ticker && <span className="text-[9px] font-mono font-bold text-red-400">{a.ticker}</span>}
                <span className={`px-1 py-0 text-[7px] font-mono font-bold uppercase ${typeBadge(a?.type)}`}>{a?.type?.replace(/_/g, ' ') ?? '—'}</span>
                <span className={`px-1 py-0 text-[7px] font-mono font-bold border ${severityColor(a?.severity)}`}>{a?.severity?.toUpperCase() ?? '—'}</span>
              </div>
              <div className="text-[8px] font-mono text-neutral/50 mt-0.5 truncate">{a?.description ?? '—'}</div>
            </div>
            <span className={`px-1 py-0.5 text-[7px] font-mono font-bold shrink-0 ${st.cls}`}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Unusual Activity Table ───────────────────────────────────────────────────
function UnusualActivityTable({ items }: { items: UnusualActivity[] | undefined }) {
  if (!items?.length) {
    return <div className="flex items-center justify-center py-6 text-[8px] font-mono text-neutral/30 uppercase tracking-wider">No unusual activity</div>;
  }
  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left font-bold">Ticker</th>
          <th className="px-2 py-1.5 text-right font-bold">Vol Multiple</th>
          <th className="px-2 py-1.5 text-right font-bold">Price Chg</th>
          <th className="px-2 py-1.5 text-right font-bold">Opt Spike</th>
          <th className="px-2 py-1.5 text-right font-bold">Avg Vol</th>
          <th className="px-2 py-1.5 text-right font-bold">Cur Vol</th>
          <th className="px-2 py-1.5 text-left font-bold">Flag</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: UnusualActivity, i: number) => {
          const volMultiple = item?.volumeMultiple ?? 0;
          const isHighVol = volMultiple > 3;
          return (
            <tr key={item?.ticker ?? i} className="border-b border-border/5 hover:bg-red-400/[0.02]">
              <td className="px-2 py-1.5 font-bold text-red-400">{item?.ticker ?? '—'}</td>
              <td className={`px-2 py-1.5 text-right font-bold ${isHighVol ? 'text-red-400 bg-red-400/10' : 'text-white/80'}`}>
                {volMultiple.toFixed(1)}x
              </td>
              <td className={`px-2 py-1.5 text-right ${(item?.priceChange ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtPct(item?.priceChange)}
              </td>
              <td className={`px-2 py-1.5 text-right ${(item?.optionsSpike ?? 0) > 2 ? 'text-yellow-400 font-bold' : 'text-white/50'}`}>
                {item?.optionsSpike != null ? item.optionsSpike.toFixed(1) + 'x' : '—'}
              </td>
              <td className="px-2 py-1.5 text-right text-white/40">{fmtNum(item?.avgVolume)}</td>
              <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(item?.currentVolume)}</td>
              <td className="px-2 py-1.5">
                {item?.flag && <span className="px-1 py-0 text-[7px] font-bold uppercase text-red-400 bg-red-400/10">{item.flag}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Circuit Breaker Gauges ───────────────────────────────────────────────────
function CircuitBreakerGauge({ breaker }: { breaker: CircuitBreaker }) {
  const pct = breaker?.distancePct ?? 0;
  const level = breaker?.level ?? 1;
  const thresholds = [7, 13, 20]; // L1, L2, L3 standard circuit breaker percentages
  const barColor = pct < 3 ? 'bg-red-400' : pct < 5 ? 'bg-orange-400' : 'bg-emerald-400';
  const textColor = pct < 3 ? 'text-red-400' : pct < 5 ? 'text-orange-400' : 'text-emerald-400';

  return (
    <div className="border border-border/20 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono font-bold text-red-400">{breaker?.index ?? '—'}</span>
        <span className={`text-[9px] font-mono font-bold ${textColor}`}>{pct.toFixed(2)}%</span>
      </div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[7px] font-mono text-neutral/40">LVL {level}</span>
        <span className="text-[7px] font-mono text-neutral/30">|</span>
        <span className="text-[7px] font-mono text-neutral/40">{breaker?.currentPrice ?? '—'}</span>
        <span className="text-[7px] font-mono text-neutral/30">|</span>
        <span className="text-[7px] font-mono text-neutral/40">Trig: {breaker?.triggerPrice ?? '—'}</span>
      </div>
      {/* Distance bar */}
      <div className="relative h-3 bg-white/5 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct / 20 * 100, 100)}%` }} />
        {/* Threshold markers */}
        {thresholds.map((th) => (
          <div key={th} className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${(th / 20) * 100}%` }}>
            <span className="absolute -top-2.5 -translate-x-1/2 text-[6px] font-mono text-neutral/30">L{thresholds.indexOf(th) + 1}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[6px] font-mono text-neutral/30">0%</span>
        <span className="text-[6px] font-mono text-neutral/30">-7%</span>
        <span className="text-[6px] font-mono text-neutral/30">-13%</span>
        <span className="text-[6px] font-mono text-neutral/30">-20%</span>
      </div>
    </div>
  );
}

function CircuitBreakers({ breakers }: { breakers: CircuitBreaker[] | undefined }) {
  if (!breakers?.length) {
    return <div className="flex items-center justify-center py-6 text-[8px] font-mono text-neutral/30 uppercase tracking-wider">No circuit breaker data</div>;
  }
  return (
    <div className="p-3 space-y-2">
      <div className="text-[8px] font-mono text-red-400/60 uppercase tracking-wider mb-2">Distance to Trigger</div>
      <div className="grid grid-cols-3 gap-2">
        {breakers.map((b: CircuitBreaker, i: number) => (
          <CircuitBreakerGauge key={b?.index ?? i} breaker={b} />
        ))}
      </div>
      <div className="text-[7px] font-mono text-neutral/25 mt-2">
        L1: 7% halt 15min | L2: 13% halt 15min | L3: 20% halt remainder
      </div>
    </div>
  );
}

// ── Cross-Market Patterns ────────────────────────────────────────────────────
function CrossMarketPatterns({ patterns }: { patterns: CrossMarketPattern[] | undefined }) {
  if (!patterns?.length) {
    return <div className="flex items-center justify-center py-6 text-[8px] font-mono text-neutral/30 uppercase tracking-wider">No cross-market patterns</div>;
  }
  return (
    <div className="p-3 space-y-2">
      <div className="text-[8px] font-mono text-red-400/60 uppercase tracking-wider mb-2">Cross-Market Alerts</div>
      {patterns.map((p: CrossMarketPattern, i: number) => (
        <div key={p?.id ?? i} className="border border-border/20 p-2 hover:bg-red-400/[0.02] transition-colors">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className={`px-1 py-0 text-[7px] font-mono font-bold uppercase border ${severityColor(p?.severity)}`}>
                {p?.severity?.toUpperCase() ?? '—'}
              </span>
              <span className="text-[9px] font-mono font-bold text-white/80">{p?.title ?? '—'}</span>
            </div>
            <span className="text-[7px] font-mono text-neutral/30">{fmtTime(p?.detectedAt)}</span>
          </div>
          <div className="text-[8px] font-mono text-neutral/50">{p?.description ?? '—'}</div>
          {p?.markets && (
            <div className="flex items-center gap-1 mt-1">
              {p.markets.map((m: string, j: number) => (
                <span key={j} className="px-1 py-0 text-[7px] font-mono text-red-400/60 bg-red-400/5">{m}</span>
              ))}
            </div>
          )}
          {p?.correlation != null && (
            <div className="text-[7px] font-mono text-neutral/30 mt-1">Correlation: {p.correlation.toFixed(3)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Compliance Metrics ───────────────────────────────────────────────────────
function ComplianceMetricsSection({ metrics }: { metrics: ComplianceMetrics | undefined }) {
  if (!metrics) {
    return <div className="flex items-center justify-center py-6 text-[8px] font-mono text-neutral/30 uppercase tracking-wider">No compliance data</div>;
  }
  return (
    <div className="p-3 space-y-3">
      <div className="text-[8px] font-mono text-red-400/60 uppercase tracking-wider mb-2">Monthly Compliance Summary</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Alerts Filed</div>
          <div className="text-[12px] font-mono font-black text-red-400">{metrics?.alertsFiled ?? 0}</div>
        </div>
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">SARs Submitted</div>
          <div className="text-[12px] font-mono font-black text-orange-400">{metrics?.sarsSubmitted ?? 0}</div>
        </div>
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Investigations</div>
          <div className="text-[12px] font-mono font-black text-yellow-400">{metrics?.investigations ?? 0}</div>
        </div>
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Resolution Rate</div>
          <div className="text-[12px] font-mono font-black text-emerald-400">{metrics?.resolutionRate ?? 0}%</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Avg Resolution</div>
          <div className="text-[10px] font-mono font-bold text-white/60">{metrics?.avgResolutionTime ?? '—'}</div>
        </div>
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">False Positive</div>
          <div className="text-[10px] font-mono font-bold text-white/60">{metrics?.falsePositiveRate ?? 0}%</div>
        </div>
        <div className="border border-border/20 p-2 text-center">
          <div className="text-[7px] font-mono text-neutral/40 uppercase">Escalations</div>
          <div className="text-[10px] font-mono font-bold text-white/60">{metrics?.escalations ?? 0}</div>
        </div>
      </div>
      {metrics?.topViolationTypes && (
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1.5">Top Violation Types</div>
          <div className="space-y-1">
            {metrics.topViolationTypes.map((v: { type: string; count: number; pct: number }, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-white/50 w-24 truncate">{v?.type ?? '—'}</span>
                <div className="flex-1 h-2.5 bg-white/5 overflow-hidden">
                  <div className="h-full bg-red-400/30" style={{ width: `${v?.pct ?? 0}%` }} />
                </div>
                <span className="text-[8px] font-mono text-white/40 w-8 text-right">{v?.count ?? 0}</span>
                <span className="text-[7px] font-mono text-neutral/30 w-8 text-right">{v?.pct ?? 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────
export function MarketSurveillancePanel() {
  const t = useT();
  const { data, isLoading, error } = useMarketSurveillance();
  const [tab, setTab] = useState<Tab>('alerts');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">Loading surveillance data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">Failed to load surveillance data</div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'alerts', label: 'ALERT FEED' },
    { key: 'unusual', label: 'UNUSUAL ACTIVITY' },
    { key: 'breakers', label: 'CIRCUIT BREAKERS' },
    { key: 'cross', label: 'CROSS-MKT' },
    { key: 'compliance', label: 'COMPLIANCE' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider">{t('panelMarketSurveillance')}</span>
        <div className="flex items-center gap-2">
          {data?.lastUpdated && (
            <span className="text-[7px] font-mono text-neutral/30">{fmtTime(data.lastUpdated)}</span>
          )}
          <span className="w-1.5 h-1.5 bg-red-400 animate-pulse" />
        </div>
      </div>

      {/* Alert summary bar */}
      <AlertSummary data={data} />

      {/* Tab navigation */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors ${
              tab === tb.key
                ? 'text-red-400 border-b border-red-400 bg-red-400/[0.04]'
                : 'text-white/35 border-b border-transparent hover:text-white/50'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'alerts' && <AlertFeed alerts={data?.alerts} />}
        {tab === 'unusual' && <UnusualActivityTable items={data?.unusualActivity} />}
        {tab === 'breakers' && <CircuitBreakers breakers={data?.circuitBreakers} />}
        {tab === 'cross' && <CrossMarketPatterns patterns={data?.crossMarketPatterns} />}
        {tab === 'compliance' && <ComplianceMetricsSection metrics={data?.complianceMetrics} />}
      </div>
    </div>
  );
}
