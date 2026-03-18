import { useVolatilitySkew } from '../../api/hooks/use-volatility-skew';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Format helpers ──

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtVol(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

// ── Main Panel ──

export function VolatilitySkewPanel() {
  const t = useT();
  const { data, isLoading } = useVolatilitySkew();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 bg-rose-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-rose-400">
          {tr(t, 'volSkewPanelTitle', 'VOLATILITY SKEW')}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {data && (
          <>
            {/* Section 1: Skew Metrics */}
            <SkewMetricsSection data={data} t={t} />

            {/* Section 2: Term Structure */}
            <TermStructureSection data={data} t={t} />

            {/* Section 3: Risk Reversal */}
            <RiskReversalSection data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Skew Metrics ──

function SkewMetricsSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.skewMetrics ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'volSkewMetrics', 'SKEW METRICS')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_52px_52px_48px_44px_48px] px-3 py-1 border-b border-border/20">
        {['TICKER', '25D SKEW', '10D SKEW', 'ATM VOL', 'SLOPE', 'BFLY'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: any, idx: number) => (
        <div
          key={row?.ticker ?? idx}
          className="grid grid-cols-[1fr_52px_52px_48px_44px_48px] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-rose-400">
            {row?.ticker ?? '--'}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-white">
            {fmtNum(row?.skew25d)}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-white">
            {fmtNum(row?.skew10d)}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-white">
            {fmtVol(row?.atmVol)}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-neutral-400">
            {fmtNum(row?.slope, 3)}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-neutral-400">
            {fmtNum(row?.butterfly, 2)}
          </span>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
          NO SKEW DATA
        </div>
      )}
    </div>
  );
}

// ── Section 2: Term Structure ──

function TermStructureSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.termStructure ?? [];
  const tenors = data?.tenors ?? ['1W', '2W', '1M', '2M', '3M', '6M', '1Y'];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'volSkewTermStructure', 'TERM STRUCTURE')}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid px-3 py-1 border-b border-border/20"
        style={{ gridTemplateColumns: `1fr ${tenors.map(() => '44px').join(' ')}` }}
      >
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TICKER
        </span>
        {tenors.map((tenor: string) => (
          <span
            key={tenor}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-right"
          >
            {tenor}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: any, idx: number) => (
        <div
          key={row?.ticker ?? idx}
          className="grid px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
          style={{ gridTemplateColumns: `1fr ${tenors.map(() => '44px').join(' ')}` }}
        >
          <span className="text-[9px] font-mono font-bold text-rose-400">
            {row?.ticker ?? '--'}
          </span>
          {tenors.map((tenor: string) => {
            const vol = row?.vols?.[tenor] ?? row?.[tenor];
            return (
              <span
                key={tenor}
                className="text-[9px] font-mono tabular-nums text-white text-right"
              >
                {vol != null ? `${Number(vol).toFixed(1)}` : '--'}
              </span>
            );
          })}
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
          NO TERM STRUCTURE DATA
        </div>
      )}
    </div>
  );
}

// ── Section 3: Risk Reversal ──

function RiskReversalSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.riskReversal ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'volSkewRiskReversal', 'RISK REVERSAL')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px] px-3 py-1 border-b border-border/20">
        {['TICKER', '25D RR 1M', '25D RR 3M', '10D RR 1M', '10D RR 3M'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: any, idx: number) => (
        <div
          key={row?.ticker ?? idx}
          className="grid grid-cols-[1fr_56px_56px_56px_56px] px-3 py-1.5 border-b border-border/20 hover:bg-rose-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-rose-400">
            {row?.ticker ?? '--'}
          </span>
          <span className={`text-[9px] font-mono tabular-nums ${rrColor(row?.rr25d1m)}`}>
            {fmtNum(row?.rr25d1m)}
          </span>
          <span className={`text-[9px] font-mono tabular-nums ${rrColor(row?.rr25d3m)}`}>
            {fmtNum(row?.rr25d3m)}
          </span>
          <span className={`text-[9px] font-mono tabular-nums ${rrColor(row?.rr10d1m)}`}>
            {fmtNum(row?.rr10d1m)}
          </span>
          <span className={`text-[9px] font-mono tabular-nums ${rrColor(row?.rr10d3m)}`}>
            {fmtNum(row?.rr10d3m)}
          </span>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
          NO RISK REVERSAL DATA
        </div>
      )}
    </div>
  );
}

// ── Color helper for risk reversals ──

function rrColor(v: number | undefined | null): string {
  if (v == null) return 'text-neutral-500';
  if (v < 0) return 'text-red-400';
  if (v > 0) return 'text-emerald-400';
  return 'text-neutral-400';
}
