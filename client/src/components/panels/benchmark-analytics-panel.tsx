import { useBenchmarkAnalytics } from '../../api/hooks/use-benchmark-analytics';
import { useT } from '../../i18n';

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function pctColor(v: number): string {
  return v >= 0 ? 'text-green-500' : 'text-red-500';
}

// ── Main Panel ───────────────────────────────────────────────────────

export function BenchmarkAnalyticsPanel() {
  const t = useT();
  const { data, isLoading } = useBenchmarkAnalytics();

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <Header />

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Benchmark Comparison Table */}
        <BenchmarkComparisonSection data={data} />

        {/* Attribution Analysis */}
        <AttributionSection data={data} />

        {/* Risk Decomposition */}
        <RiskDecompositionSection data={data} />
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/20 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral/20 uppercase tracking-wider">
          BENCHMARK ANALYTICS
        </span>
        <span className="text-[7px] font-mono text-neutral/20">
          {data?.benchmarks?.length ?? 0} indices
        </span>
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────

function Header() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
      <div className="w-0.5 h-3 bg-violet-400" />
      <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
        BENCHMARK ANALYTICS
      </span>
    </div>
  );
}

// ── Section: Benchmark Comparison ────────────────────────────────────

function BenchmarkComparisonSection({ data }: { data: ReturnType<typeof useBenchmarkAnalytics>['data'] }) {
  const benchmarks = data?.benchmarks ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
          BENCHMARK COMPARISON
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.55fr_0.55fr_0.55fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">INDEX</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1M</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1Y</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">TE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">IR</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">SHARPE</span>
      </div>

      {benchmarks.map((b: any) => (
        <div
          key={b.index}
          className="grid grid-cols-[1.4fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.55fr_0.55fr_0.55fr] px-3 py-1 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-white truncate">{b.index}</div>
          </div>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(b.daily)}`}>
            {fmtPct(b.daily)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(b.weekly)}`}>
            {fmtPct(b.weekly)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(b.monthly)}`}>
            {fmtPct(b.monthly)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(b.ytd)}`}>
            {fmtPct(b.ytd)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(b.yearly)}`}>
            {fmtPct(b.yearly)}
          </span>
          <span className="text-[9px] font-mono font-bold text-right text-neutral/50">
            {fmt(b.trackingError)}%
          </span>
          <span className="text-[9px] font-mono font-bold text-right text-neutral/50">
            {fmt(b.infoRatio)}
          </span>
          <span className="text-[9px] font-mono font-bold text-right text-violet-400/80">
            {fmt(b.sharpe)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Attribution Analysis ────────────────────────────────────

function AttributionSection({ data }: { data: ReturnType<typeof useBenchmarkAnalytics>['data'] }) {
  const attribution = data?.attribution;

  const rows = [
    { label: 'ALLOCATION', value: attribution?.allocation },
    { label: 'SELECTION', value: attribution?.selection },
    { label: 'INTERACTION', value: attribution?.interaction },
    { label: 'CURRENCY', value: attribution?.currency },
    { label: 'TOTAL', value: attribution?.total, isTotal: true },
  ];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
          ATTRIBUTION ANALYSIS
        </span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between px-3 py-1.5 border-b hover:bg-violet-400/[0.02] transition-colors ${
            row.isTotal ? 'border-violet-400/20 bg-violet-400/[0.03]' : 'border-border/10'
          }`}
        >
          <span
            className={`text-[9px] font-mono uppercase tracking-wider ${
              row.isTotal ? 'font-black text-violet-400' : 'font-bold text-neutral/50'
            }`}
          >
            {row.label}
          </span>
          <span
            className={`text-[9px] font-mono tabular-nums ${
              row.isTotal
                ? 'font-black text-violet-400'
                : `font-bold ${row.value != null ? pctColor(row.value) : 'text-neutral/30'}`
            }`}
          >
            {row.value != null ? fmtPct(row.value) : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Risk Decomposition ──────────────────────────────────────

function RiskDecompositionSection({ data }: { data: ReturnType<typeof useBenchmarkAnalytics>['data'] }) {
  const risk = data?.riskDecomposition;

  const rows = [
    { label: 'SYSTEMATIC', value: risk?.systematic, suffix: '%' },
    { label: 'SPECIFIC', value: risk?.specific, suffix: '%' },
    { label: 'TOTAL', value: risk?.total, suffix: '%', isTotal: true },
    { label: 'BETA', value: risk?.beta, suffix: '' },
    { label: 'R-SQUARED', value: risk?.rSquared, suffix: '' },
  ];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20 bg-[#050505]">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
          RISK DECOMPOSITION
        </span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between px-3 py-1.5 border-b hover:bg-violet-400/[0.02] transition-colors ${
            row.isTotal ? 'border-violet-400/20 bg-violet-400/[0.03]' : 'border-border/10'
          }`}
        >
          <span
            className={`text-[9px] font-mono uppercase tracking-wider ${
              row.isTotal ? 'font-black text-violet-400' : 'font-bold text-neutral/50'
            }`}
          >
            {row.label}
          </span>
          <span
            className={`text-[9px] font-mono font-bold tabular-nums ${
              row.isTotal ? 'font-black text-violet-400' : 'text-white'
            }`}
          >
            {row.value != null ? `${fmt(row.value)}${row.suffix}` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}
