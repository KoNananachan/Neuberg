import { useCdsIndexMonitor } from '../../api/hooks/use-cds-index-monitor';
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

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtNotional(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Color helpers ──

/** For CDS spreads: wider = red (worse credit), tighter = green (better credit) */
function spreadChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function eventTypeColor(eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes('default') || lower.includes('bankruptcy')) return 'text-red-400';
  if (lower.includes('restructuring')) return 'text-yellow-400';
  if (lower.includes('succession')) return 'text-blue-400';
  return 'text-neutral-400';
}

// ── Interfaces for data shapes ──

interface CdsIndex {
  name: string;
  ticker: string;
  region: string;
  spread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  series: number;
  maturity: string;
  coupon: number;
  impliedDefault: number;
  recovery: number;
  volume: number;
  openInterest: number;
}

interface CdsTranche {
  attachment: number;
  detachment: number;
  spread: number;
  correlation: number;
  delta: number;
}

interface CreditEvent {
  entity: string;
  date: string;
  eventType: string;
  sector: string;
  recoveryRate: number;
  notionalAffected: number;
}

interface CdsIndexSummary {
  igSpread: number;
  hySpread: number;
  emSpread: number;
  igChange1w: number;
  hyChange1w: number;
  avgImpliedDefault: number;
}

// ── Main Panel ──

export function CdsIndexMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCdsIndexMonitor();

  const indices = data?.indices as CdsIndex[] | undefined;
  const tranches = data?.tranches as CdsTranche[] | undefined;
  const recentEvents = data?.recentEvents as CreditEvent[] | undefined;
  const summary = data?.summary as CdsIndexSummary | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-rose-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
            {tr(t, 'cdsIndexMonitor', 'CDS Index Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cdsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {indices && indices.length > 0 && <IndicesTable indices={indices} t={t} />}
            {tranches && tranches.length > 0 && <TrancheTable tranches={tranches} t={t} />}
            {recentEvents && recentEvents.length > 0 && <CreditEventsTable events={recentEvents} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: CdsIndexSummary;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'cdsIgSpread', 'IG Spread'),
      value: fmtBps(summary.igSpread),
      unit: 'bps',
      change: summary.igChange1w,
      changeLabel: '1W',
    },
    {
      label: tr(t, 'cdsHySpread', 'HY Spread'),
      value: fmtBps(summary.hySpread),
      unit: 'bps',
      change: summary.hyChange1w,
      changeLabel: '1W',
    },
    {
      label: tr(t, 'cdsEmSpread', 'EM Spread'),
      value: fmtBps(summary.emSpread),
      unit: 'bps',
      change: null,
      changeLabel: '',
    },
    {
      label: tr(t, 'cdsAvgImpliedDefault', 'Avg Implied Def'),
      value: fmtPct(summary.avgImpliedDefault),
      unit: '',
      change: null,
      changeLabel: '',
    },
  ];

  return (
    <div className="border-b border-rose-400/30 bg-[#050505]">
      <div className="grid grid-cols-4 divide-x divide-rose-400/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-mono font-bold text-white">
                {m.value}
              </span>
              {m.unit && (
                <span className="text-[7px] font-mono text-neutral-600">{m.unit}</span>
              )}
              {m.change !== null && (
                <span className={`text-[8px] font-mono font-bold ${spreadChangeColor(m.change)}`}>
                  {fmtChange(m.change)} {m.changeLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 1: CDS Indices Table ──

function IndicesTable({
  indices,
  t,
}: {
  indices: CdsIndex[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-rose-400/30">
      <div className="px-3 py-1 border-b border-rose-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cdsCdsIndices', 'CDS Indices')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-rose-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsName', 'Name')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsTicker', 'Ticker')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsRegion', 'Region')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsSpread', 'Spread')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cds1d', '1D')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cds1w', '1W')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cds1m', '1M')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsImpliedDef', 'Impl Def')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsVolume', 'Volume')}</th>
            </tr>
          </thead>
          <tbody>
            {indices.map((idx) => (
              <tr
                key={`${idx.ticker}-${idx.series}`}
                className="border-b border-neutral-900 hover:bg-rose-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[120px]">
                  {idx.name}
                </td>
                <td className="px-2 py-1 text-rose-400">{idx.ticker}</td>
                <td className="px-2 py-1 text-neutral-500">{idx.region}</td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(idx.spread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(idx.change1d)}`}>
                  {fmtChange(idx.change1d)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(idx.change1w)}`}>
                  {fmtChange(idx.change1w)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(idx.change1m)}`}>
                  {fmtChange(idx.change1m)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtPct(idx.impliedDefault)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-500">
                  {fmtVolume(idx.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 2: CDX Tranche Breakdown ──

function TrancheTable({
  tranches,
  t,
}: {
  tranches: CdsTranche[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-rose-400/30">
      <div className="px-3 py-1 border-b border-rose-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cdsCdxTrancheBreakdown', 'CDX Tranche Breakdown')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-rose-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsAttachment', 'Attach')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsDetachment', 'Detach')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'cdsTranche', 'Tranche')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsSpread', 'Spread')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsCorrelation', 'Correl')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsDelta', 'Delta')}</th>
            </tr>
          </thead>
          <tbody>
            {tranches.map((tr_) => {
              const trancheLabel = `${fmtPct(tr_.attachment)}-${fmtPct(tr_.detachment)}`;
              return (
                <tr
                  key={trancheLabel}
                  className="border-b border-neutral-900 hover:bg-rose-400/[0.02]"
                >
                  <td className="px-2 py-1 text-white">{fmtPct(tr_.attachment)}</td>
                  <td className="px-2 py-1 text-white">{fmtPct(tr_.detachment)}</td>
                  <td className="px-2 py-1 text-center">
                    <span className="text-rose-400 font-bold">{trancheLabel}</span>
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(tr_.spread)} <span className="text-neutral-600">bps</span>
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtPct(tr_.correlation)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {tr_.delta.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Recent Credit Events ──

function CreditEventsTable({
  events,
  t,
}: {
  events: CreditEvent[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-rose-400/30">
      <div className="px-3 py-1 border-b border-rose-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cdsRecentCreditEvents', 'Recent Credit Events')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-rose-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsEntity', 'Entity')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsEventType', 'Type')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsDate', 'Date')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'cdsSector', 'Sector')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsRecoveryRate', 'Recovery')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'cdsNotional', 'Notional')}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt, i) => (
              <tr
                key={`${evt.entity}-${evt.date}-${i}`}
                className="border-b border-neutral-900 hover:bg-rose-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[140px]">
                  {evt.entity}
                </td>
                <td className={`px-2 py-1 font-bold ${eventTypeColor(evt.eventType)}`}>
                  {evt.eventType}
                </td>
                <td className="px-2 py-1 text-neutral-500">{evt.date}</td>
                <td className="px-2 py-1 text-neutral-500">{evt.sector}</td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtPct(evt.recoveryRate)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtNotional(evt.notionalAffected)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
