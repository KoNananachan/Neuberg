import { useSwapCurveMonitor } from '../../api/hooks/use-swap-curve-monitor';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 20) return 'text-red-400';
  if (n > 10) return 'text-yellow-400';
  if (n < -10) return 'text-blue-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function SwapCurveMonitorPanel() {
  const t = useT();
  const { data, isLoading, error } = useSwapCurveMonitor();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'scmTitle', 'Swap Curve Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.asOfDate && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {d.asOfDate}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <IrsCurveSection d={d} t={t} />
            <SwapSpreadsSection d={d} t={t} />
            <BasisSwapsSection d={d} t={t} />
            <ForwardRatesSection d={d} t={t} />
            <CurveMetricsSection d={d} t={t} />
            <MarketContextSection d={d} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: IRS Curve ──

function IrsCurveSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const rates = d?.irsCurve ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmIrsCurve', 'USD IRS Curve')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[52px_64px_48px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scmTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scm1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scm1W', '\u03941W')}
        </span>
      </div>

      {/* Rate rows */}
      {rates.map((r: any) => (
        <div
          key={r.tenor}
          className="grid grid-cols-[52px_64px_48px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {r.tenor}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(r.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1d)}`}>
            {fmtBps(r.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1w)}`}>
            {fmtBps(r.change1w)}
          </span>
        </div>
      ))}

      {rates.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 2: Swap Spreads ──

function SwapSpreadsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const spreads = d?.swapSpreads ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmSwapSpreads', 'Swap Spreads vs Treasury')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[52px_56px_56px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scmTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmSpread', 'Sprd bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmTsyYld', 'Tsy Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmChg', 'Chg')}
        </span>
      </div>

      {/* Spread rows */}
      {spreads.map((s: any) => (
        <div
          key={s.tenor}
          className="grid grid-cols-[52px_56px_56px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {s.tenor}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s.spread)}`}>
            {fmtSpread(s.spread)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(s.tsyYield)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change)}`}>
            {fmtBps(s.change)}
          </span>
        </div>
      ))}

      {spreads.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 3: Basis Swaps ──

function BasisSwapsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const basis = d?.basisSwaps ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmBasisSwaps', 'Basis Swaps')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scmInstrument', 'Instrument')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmBasis', 'Basis bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scm1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scm1W', '\u03941W')}
        </span>
      </div>

      {/* Basis rows */}
      {basis.map((b: any) => (
        <div
          key={b.name}
          className="grid grid-cols-[1fr_56px_48px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {b.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-blue-400 text-right">
            {fmtSpread(b.basis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b.change1d)}`}>
            {fmtBps(b.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b.change1w)}`}>
            {fmtBps(b.change1w)}
          </span>
        </div>
      ))}

      {basis.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 4: Forward Rates ──

function ForwardRatesSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const forwards = d?.forwardRates ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmForwardRates', 'Forward Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'scmForward', 'Forward')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmRate', 'Rate %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmImplied', 'Implied')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'scmChg', 'Chg')}
        </span>
      </div>

      {/* Forward rate rows */}
      {forwards.map((f: any) => (
        <div
          key={f.name}
          className="grid grid-cols-[1fr_64px_56px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {f.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(f.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.impliedMove)}`}>
            {fmtBps(f.impliedMove)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.change)}`}>
            {fmtBps(f.change)}
          </span>
        </div>
      ))}

      {forwards.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ── Section 5: Curve Metrics ──

function CurveMetricsSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const metrics = d?.curveMetrics;
  if (!metrics) return null;

  const rows = [
    { label: '2S10S SLOPE', value: metrics.slope2s10s, unit: 'bps' },
    { label: '2S5S SLOPE', value: metrics.slope2s5s, unit: 'bps' },
    { label: '5S30S SLOPE', value: metrics.slope5s30s, unit: 'bps' },
    { label: '2S5S10S BUTTERFLY', value: metrics.butterfly2s5s10s, unit: 'bps' },
    { label: '5S10S30S BUTTERFLY', value: metrics.butterfly5s10s30s, unit: 'bps' },
    { label: 'CONVEXITY', value: metrics.convexity, unit: '' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmCurveMetrics', 'Curve Metrics')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px">
        {rows.map((r) => (
          <div key={r.label} className="px-3 py-1.5 bg-black hover:bg-blue-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {r.label}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-[10px] font-mono font-bold ${changeColor(r.value)}`}>
                {fmtSpread(r.value)}
              </span>
              {r.unit && (
                <span className="text-[7px] font-mono text-neutral-600">
                  {r.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Curve shape indicator */}
      {metrics.curveShape && (
        <div className="px-3 py-1 border-t border-border/10">
          <div className="flex items-center justify-between">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              CURVE SHAPE
            </span>
            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 ${
              metrics.curveShape === 'INVERTED'
                ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                : metrics.curveShape === 'FLAT'
                  ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
                  : 'text-green-400 bg-green-500/10 border border-green-500/30'
            } uppercase`}>
              {metrics.curveShape}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section 6: Market Context ──

function MarketContextSection({ d, t }: { d: any; t: ReturnType<typeof useT> }) {
  const ctx = d?.marketContext;
  if (!ctx) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-blue-400">
          {tr(t, 'scmMarketContext', 'Market Context')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px">
        {/* Fed Funds */}
        <div className="px-3 py-1.5 bg-black hover:bg-blue-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            FED FUNDS RATE
          </div>
          <div className="text-[10px] font-mono font-bold text-white mt-0.5">
            {fmtPct(ctx.fedFundsRate)}%
          </div>
          {ctx.fedFundsTarget && (
            <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
              TARGET {ctx.fedFundsTarget}
            </div>
          )}
        </div>

        {/* Terminal Rate */}
        <div className="px-3 py-1.5 bg-black hover:bg-blue-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            TERMINAL RATE
          </div>
          <div className="text-[10px] font-mono font-bold text-blue-400 mt-0.5">
            {fmtPct(ctx.terminalRate)}%
          </div>
          {ctx.terminalDate && (
            <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
              {ctx.terminalDate}
            </div>
          )}
        </div>

        {/* Next FOMC */}
        <div className="px-3 py-1.5 bg-black hover:bg-blue-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            NEXT FOMC
          </div>
          <div className="text-[10px] font-mono font-bold text-white mt-0.5">
            {ctx.nextFomc ?? '--'}
          </div>
          {ctx.fomcProbHike != null && (
            <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
              HIKE {ctx.fomcProbHike}% / CUT {ctx.fomcProbCut ?? '--'}%
            </div>
          )}
        </div>

        {/* Cuts Priced */}
        <div className="px-3 py-1.5 bg-black hover:bg-blue-400/[0.02] transition-colors">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            CUTS PRICED (12M)
          </div>
          <div className={`text-[10px] font-mono font-bold mt-0.5 ${
            ctx.cutsPriced != null && ctx.cutsPriced > 0
              ? 'text-green-400'
              : ctx.cutsPriced != null && ctx.cutsPriced < 0
                ? 'text-red-400'
                : 'text-white'
          }`}>
            {ctx.cutsPriced != null ? `${ctx.cutsPriced > 0 ? '+' : ''}${ctx.cutsPriced}` : '--'}
          </div>
          {ctx.cutsPricedBps != null && (
            <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
              {fmtBps(ctx.cutsPricedBps)} BPS
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      {d?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'scmUpdated', 'Updated')}: {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
