import { useTradeSettlement } from '../../api/hooks/use-trade-settlement';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TradeSettlementData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PendingSettlement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FailedTrade = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CsdStatus = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CalendarDay = any;

// ── Constants ──

const GREEN = '#4ade80';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const CYAN = '#22d3ee';
const AMBER = '#f59e0b';

// ── Formatting helpers ──

function fmtValue(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'matched': return GREEN;
    case 'unmatched': return RED;
    case 'partial': return YELLOW;
    case 'pending': return CYAN;
    default: return 'rgba(255,255,255,0.3)';
  }
}

function statusBg(status: string): string {
  switch (status?.toLowerCase()) {
    case 'matched': return 'rgba(74,222,128,0.08)';
    case 'unmatched': return 'rgba(248,113,113,0.08)';
    case 'partial': return 'rgba(251,191,36,0.08)';
    case 'pending': return 'rgba(34,211,238,0.08)';
    default: return 'rgba(255,255,255,0.03)';
  }
}

function escalationColor(level: number): string {
  if (level >= 3) return RED;
  if (level >= 2) return AMBER;
  return YELLOW;
}

function csdColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'connected':
    case 'online': return GREEN;
    case 'degraded': return YELLOW;
    case 'disconnected':
    case 'offline': return RED;
    default: return 'rgba(255,255,255,0.3)';
  }
}

function agingColor(days: number): string {
  if (days >= 5) return RED;
  if (days >= 3) return AMBER;
  if (days >= 1) return YELLOW;
  return 'rgba(255,255,255,0.4)';
}

function gaugeColor(value: number): string {
  if (value >= 95) return GREEN;
  if (value >= 85) return CYAN;
  if (value >= 70) return YELLOW;
  return RED;
}

function failGaugeColor(value: number): string {
  if (value <= 1) return GREEN;
  if (value <= 3) return YELLOW;
  if (value <= 5) return AMBER;
  return RED;
}

// ── Main Panel ──

export function TradeSettlementPanel() {
  const t = useT();
  const { data, isLoading, error } = useTradeSettlement() as {
    data: TradeSettlementData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 animate-spin" />
          <span className="text-[9px] font-mono text-green-400/40 uppercase tracking-widest">
            {tr(t, 'loading', 'LOADING...')}
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          {tr(t, 'tsError', 'FAILED TO LOAD SETTLEMENT DATA')}
        </span>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
          {tr(t, 'tsNoData', 'NO DATA AVAILABLE')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-black p-1 text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/20 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-green-400">
            {tr(t, 'panelTradeSettlement', 'Trade Settlement')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[6px] text-white/20">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <SummaryStats data={data} t={t} />

      {/* ── Efficiency Metrics ── */}
      <EfficiencyGauges data={data} t={t} />

      {/* ── CSD Status ── */}
      <CsdStatusBar csds={data?.csds} t={t} />

      {/* ── Pending Settlements Table ── */}
      <PendingSettlementsTable settlements={data?.pendingSettlements} t={t} />

      {/* ── Failed Trades ── */}
      <FailedTradesSection trades={data?.failedTrades} t={t} />

      {/* ── Settlement Calendar ── */}
      <SettlementCalendar calendar={data?.calendar} t={t} />
    </div>
  );
}

// ── Summary Stats Section ──

function SummaryStats({ data, t }: { data: TradeSettlementData; t: ReturnType<typeof useT> }) {
  const stats = [
    {
      label: tr(t, 'tsTotalPending', 'TOTAL PENDING'),
      value: data?.summary?.totalPending ?? 0,
      notional: data?.summary?.totalPendingNotional ?? 0,
      color: CYAN,
    },
    {
      label: tr(t, 'tsSettledToday', 'SETTLED TODAY'),
      value: data?.summary?.settledToday ?? 0,
      notional: data?.summary?.settledTodayNotional ?? 0,
      color: GREEN,
    },
    {
      label: tr(t, 'tsFailed', 'FAILED'),
      value: data?.summary?.failed ?? 0,
      notional: data?.summary?.failedNotional ?? 0,
      color: RED,
    },
    {
      label: tr(t, 'tsOnHold', 'ON HOLD'),
      value: data?.summary?.onHold ?? 0,
      notional: data?.summary?.onHoldNotional ?? 0,
      color: AMBER,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-green-400/[0.06] mb-1">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-black px-2 py-1.5">
          <div className="text-[6px] text-white/20 uppercase tracking-wider">{stat.label}</div>
          <div className="text-[11px] font-black" style={{ color: stat.color }}>
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </div>
          <div className="text-[6px] text-white/25">
            ${fmtValue(stat.notional)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Efficiency Gauges ──

function EfficiencyGauges({ data, t }: { data: TradeSettlementData; t: ReturnType<typeof useT> }) {
  const metrics = [
    {
      label: tr(t, 'tsStpRate', 'STP RATE'),
      value: data?.efficiency?.stpRate ?? 0,
      colorFn: gaugeColor,
    },
    {
      label: tr(t, 'tsSettlementRate', 'SETTLEMENT RATE'),
      value: data?.efficiency?.settlementRate ?? 0,
      colorFn: gaugeColor,
    },
    {
      label: tr(t, 'tsFailRate', 'FAIL RATE'),
      value: data?.efficiency?.failRate ?? 0,
      colorFn: failGaugeColor,
    },
    {
      label: tr(t, 'tsNettingEfficiency', 'NETTING EFF'),
      value: data?.efficiency?.nettingEfficiency ?? 0,
      colorFn: gaugeColor,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-border/10 mb-1">
      {metrics.map((metric) => {
        const color = metric.colorFn(metric.value);
        const barWidth = metric.label === tr(t, 'tsFailRate', 'FAIL RATE')
          ? Math.min(metric.value * 10, 100)
          : Math.min(metric.value, 100);
        return (
          <div key={metric.label} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider mb-0.5">
              {metric.label}
            </div>
            <div className="text-[11px] font-black" style={{ color }}>
              {fmtPct(metric.value)}
            </div>
            <div className="h-1 bg-white/[0.03] mt-0.5">
              <div
                className="h-full transition-all"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: color,
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CSD Status Bar ──

function CsdStatusBar({ csds, t }: { csds: CsdStatus[] | undefined; t: ReturnType<typeof useT> }) {
  const defaultCsds = [
    { name: 'DTCC', status: 'unknown' },
    { name: 'EUROCLEAR', status: 'unknown' },
    { name: 'CLEARSTREAM', status: 'unknown' },
    { name: 'LCH', status: 'unknown' },
    { name: 'CME', status: 'unknown' },
  ];

  const entries = csds?.length ? csds : defaultCsds;

  return (
    <div className="mb-1">
      <div className="px-1 py-0.5 border-b border-border/20">
        <span className="text-[7px] text-green-400/60 uppercase tracking-wider font-bold">
          {tr(t, 'tsCsdStatus', 'CSD CONNECTIVITY')}
        </span>
      </div>
      <div className="flex items-center gap-px">
        {entries.map((csd: CsdStatus) => {
          const color = csdColor(csd?.status);
          return (
            <div
              key={csd?.name}
              className="flex-1 bg-black px-1.5 py-1 text-center hover:bg-green-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <div
                  className="w-1.5 h-1.5"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[7px] font-bold text-white/50 uppercase">
                  {csd?.name}
                </span>
              </div>
              <div className="text-[6px] uppercase" style={{ color }}>
                {csd?.status || 'N/A'}
              </div>
              {csd?.latency != null && (
                <div className="text-[5px] text-white/15 mt-0.5">
                  {csd.latency}ms
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Pending Settlements Table ──

function PendingSettlementsTable({
  settlements,
  t,
}: {
  settlements: PendingSettlement[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!settlements?.length) return null;

  return (
    <div className="mb-1">
      <div className="px-1 py-0.5 border-b border-border/20">
        <span className="text-[7px] text-green-400/60 uppercase tracking-wider font-bold">
          {tr(t, 'tsPendingSettlements', 'PENDING SETTLEMENTS')}
        </span>
        <span className="ml-2 text-[6px] text-white/20">{settlements.length}</span>
      </div>

      {/* Header */}
      <div className="flex items-center px-1 py-0.5 border-b border-border/20 text-[6px] text-white/20 uppercase tracking-wider">
        <span className="w-[52px] shrink-0">TRADE ID</span>
        <span className="w-[64px] shrink-0">COUNTERPARTY</span>
        <span className="w-[40px] shrink-0">CLASS</span>
        <span className="w-[52px] shrink-0 text-right">NOTIONAL</span>
        <span className="w-[56px] shrink-0 text-center">STATUS</span>
        <span className="flex-1 text-right">AGING</span>
      </div>

      {/* Rows */}
      <div className="max-h-[180px] overflow-y-auto no-scrollbar">
        {settlements.map((s: PendingSettlement, i: number) => {
          const sColor = statusColor(s?.status);
          const sBg = statusBg(s?.status);
          const aColor = agingColor(s?.agingDays ?? 0);
          return (
            <div
              key={s?.tradeId ?? i}
              className="flex items-center px-1 py-[2px] border-b border-white/[0.02] hover:bg-green-400/[0.02] transition-colors"
            >
              <span className="w-[52px] shrink-0 text-[7px] font-bold text-green-400/70 truncate">
                {s?.tradeId ?? '-'}
              </span>
              <span className="w-[64px] shrink-0 text-[7px] text-white/40 truncate">
                {s?.counterparty ?? '-'}
              </span>
              <span className="w-[40px] shrink-0 text-[7px] text-white/30 uppercase">
                {s?.assetClass ?? '-'}
              </span>
              <span className="w-[52px] shrink-0 text-right text-[7px] text-white/50">
                ${fmtValue(s?.notional ?? 0)}
              </span>
              <span className="w-[56px] shrink-0 flex justify-center">
                <span
                  className="text-[6px] font-black uppercase px-1 py-px"
                  style={{ color: sColor, backgroundColor: sBg }}
                >
                  {s?.status ?? '-'}
                </span>
              </span>
              <span
                className="flex-1 text-right text-[7px] font-bold"
                style={{ color: aColor }}
              >
                {s?.agingDays != null ? `T+${s.agingDays}` : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Failed Trades Section ──

function FailedTradesSection({
  trades,
  t,
}: {
  trades: FailedTrade[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!trades?.length) return null;

  return (
    <div className="mb-1">
      <div className="px-1 py-0.5 border-b border-red-400/20 bg-red-400/[0.02]">
        <span className="text-[7px] text-red-400/80 uppercase tracking-wider font-bold">
          {tr(t, 'tsFailedTrades', 'FAILED TRADES')}
        </span>
        <span className="ml-2 text-[6px] text-red-400/40">{trades.length}</span>
      </div>

      {/* Header */}
      <div className="flex items-center px-1 py-0.5 border-b border-red-400/10 text-[6px] text-white/20 uppercase tracking-wider bg-red-400/[0.01]">
        <span className="w-[52px] shrink-0">TRADE ID</span>
        <span className="w-[88px] shrink-0">REASON</span>
        <span className="w-[52px] shrink-0 text-right">PENALTY</span>
        <span className="flex-1 text-right">ESCALATION</span>
      </div>

      {/* Rows */}
      {trades.map((trade: FailedTrade, i: number) => {
        const escColor = escalationColor(trade?.escalationLevel ?? 0);
        return (
          <div
            key={trade?.tradeId ?? i}
            className="flex items-center px-1 py-[2px] border-b border-red-400/[0.04] bg-red-400/[0.01] hover:bg-red-400/[0.03] transition-colors"
          >
            <span className="w-[52px] shrink-0 text-[7px] font-bold text-red-400/70 truncate">
              {trade?.tradeId ?? '-'}
            </span>
            <span className="w-[88px] shrink-0 text-[7px] text-white/40 truncate">
              {trade?.reason ?? '-'}
            </span>
            <span className="w-[52px] shrink-0 text-right text-[7px] text-red-400/60">
              {trade?.penaltyCost != null ? `$${fmtValue(trade.penaltyCost)}` : '-'}
            </span>
            <span className="flex-1 flex items-center justify-end gap-1">
              {trade?.escalationLevel != null && (
                <>
                  {Array.from({ length: Math.min(trade.escalationLevel, 5) }).map((_, ei) => (
                    <div
                      key={ei}
                      className="w-1 h-2.5"
                      style={{
                        backgroundColor: escColor,
                        opacity: 0.4 + ei * 0.15,
                      }}
                    />
                  ))}
                  <span className="text-[6px] font-bold ml-0.5" style={{ color: escColor }}>
                    L{trade.escalationLevel}
                  </span>
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Settlement Calendar (5-day forward view) ──

function SettlementCalendar({
  calendar,
  t,
}: {
  calendar: CalendarDay[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!calendar?.length) return null;

  const maxVolume = Math.max(...calendar.map((d: CalendarDay) => d?.volume ?? 0), 1);

  return (
    <div>
      <div className="px-1 py-0.5 border-b border-border/20">
        <span className="text-[7px] text-green-400/60 uppercase tracking-wider font-bold">
          {tr(t, 'tsCalendar', 'SETTLEMENT CALENDAR — 5 DAY FORWARD')}
        </span>
      </div>
      <div className="flex items-end gap-px px-1 py-2">
        {calendar.slice(0, 5).map((day: CalendarDay, i: number) => {
          const volume = day?.volume ?? 0;
          const barHeight = maxVolume > 0 ? (volume / maxVolume) * 48 : 0;
          const dayLabel = day?.date
            ? new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
            : `D+${i + 1}`;
          const isHighVolume = volume > maxVolume * 0.8;
          return (
            <div
              key={day?.date ?? i}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              <span className="text-[6px] font-bold text-white/30">
                {fmtValue(volume)}
              </span>
              <div
                className="w-full transition-all"
                style={{
                  height: `${Math.max(barHeight, 2)}px`,
                  backgroundColor: isHighVolume ? GREEN : 'rgba(74,222,128,0.3)',
                  opacity: isHighVolume ? 0.7 : 0.4,
                }}
              />
              <span className="text-[5px] text-white/20 uppercase">
                {dayLabel}
              </span>
              {day?.notional != null && (
                <span className="text-[5px] text-white/15">
                  ${fmtValue(day.notional)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
