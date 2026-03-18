import { usePortfolioAttribution } from '../../api/hooks/use-portfolio-attribution';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#a78bfa'; // violet-400

// ── Color / formatting helpers ──

function valColor(n: number): string {
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Section header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#050505] border-b border-border/20 border-t border-t-violet-400/10">
      <span className="text-[7px] font-mono font-black uppercase tracking-widest text-violet-400/70">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PortfolioAttributionPanel() {
  const t = useT();
  const { data, isLoading, error } = usePortfolioAttribution();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="8" width="3" height="7" fill={ACCENT} opacity="0.5" />
            <rect x="5" y="4" width="3" height="11" fill={ACCENT} opacity="0.7" />
            <rect x="9" y="1" width="3" height="14" fill={ACCENT} opacity="0.85" />
            <rect x="13" y="6" width="2" height="9" fill={ACCENT} opacity="0.6" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'pattrTitle', 'Portfolio Attribution')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <PerformanceSummary data={d} />
            <BrinsonAttribution data={d} />
            <FactorAttribution data={d} />
            <CurrencyAttribution data={d} />
            <TopContributorsDetractors data={d} />
            <RiskDecomposition data={d} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Performance Summary ──

function PerformanceSummary({ data }: { data: any }) {
  const summary = data.performanceSummary ?? {};
  const periods = summary.periods ?? ['MTD', 'QTD', 'YTD', '1Y'];

  const metrics = [
    { label: 'TOTAL RETURN', value: summary.totalReturn, fmt: fmtPct },
    { label: 'BENCHMARK RETURN', value: summary.benchmarkReturn, fmt: fmtPct },
    {
      label: 'ACTIVE RETURN (ALPHA)',
      value: summary.activeReturn,
      fmt: fmtPct,
      color: valColor(summary.activeReturn ?? 0),
    },
    { label: 'TRACKING ERROR', value: summary.trackingError, fmt: fmtPct, neutral: true },
    { label: 'INFORMATION RATIO', value: summary.informationRatio, fmt: fmtNum, neutral: true },
  ];

  return (
    <>
      <SectionHeader title="Performance Summary" />
      {/* Period display */}
      <div className="flex gap-px bg-border/10">
        {periods.map((p: string) => (
          <div key={p} className="flex-1 bg-[#050505] text-center py-1">
            <span className="text-[7px] font-mono font-black text-violet-400/60 uppercase tracking-wider">
              {p}
            </span>
          </div>
        ))}
      </div>
      {/* Metrics */}
      <div className="px-2 py-1">
        {metrics.map((m) => {
          const val = m.value ?? 0;
          const display = m.fmt === fmtNum ? fmtNum(val) : fmtPct(val);
          const color = m.color ?? (m.neutral ? '#a1a1aa' : valColor(val));
          return (
            <div
              key={m.label}
              className="flex items-center justify-between py-[2px] hover:bg-violet-400/[0.02]"
            >
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {m.label}
              </span>
              <span
                className="text-[8px] font-mono font-bold tabular-nums"
                style={{ color }}
              >
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── 2. Brinson Attribution ──

function BrinsonAttribution({ data }: { data: any }) {
  const sectors: any[] = data.brinsonAttribution?.sectors ?? [];
  const totals = data.brinsonAttribution?.totals ?? {};

  return (
    <>
      <SectionHeader title="Brinson Attribution" />
      <div className="px-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_42px_42px_42px_42px_42px_42px_42px] gap-0 px-1 py-1 border-b border-border/20">
          {['SECTOR', 'PF WT', 'BM WT', 'PF RET', 'BM RET', 'ALLOC', 'SELECT', 'INTER'].map(
            (h, i) => (
              <span
                key={h}
                className={`text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
              >
                {h}
              </span>
            ),
          )}
        </div>
        {/* Rows */}
        {sectors.map((sec: any) => (
          <div
            key={sec.sector}
            className="grid grid-cols-[1fr_42px_42px_42px_42px_42px_42px_42px] gap-0 px-1 py-[2px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-300 truncate uppercase">
              {sec.sector}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtPct(sec.portfolioWeight ?? 0, 1)}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
              {fmtPct(sec.benchmarkWeight ?? 0, 1)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.portfolioReturn ?? 0) }}
            >
              {fmtPct(sec.portfolioReturn ?? 0, 1)}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
              {fmtPct(sec.benchmarkReturn ?? 0, 1)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.allocationEffect ?? 0) }}
            >
              {fmtBps(sec.allocationEffect ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.selectionEffect ?? 0) }}
            >
              {fmtBps(sec.selectionEffect ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.interactionEffect ?? 0) }}
            >
              {fmtBps(sec.interactionEffect ?? 0)}
            </span>
          </div>
        ))}
        {/* Totals row */}
        <div className="grid grid-cols-[1fr_42px_42px_42px_42px_42px_42px_42px] gap-0 px-1 py-1 border-t border-violet-400/20 bg-violet-400/[0.02]">
          <span className="text-[7px] font-mono font-black text-violet-400 uppercase">TOTAL</span>
          <span className="text-[7px] font-mono font-bold tabular-nums text-right text-neutral-300">
            {fmtPct(totals.portfolioWeight ?? 0, 1)}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
            {fmtPct(totals.benchmarkWeight ?? 0, 1)}
          </span>
          <span className="text-[7px] font-mono text-right" />
          <span className="text-[7px] font-mono text-right" />
          <span
            className="text-[7px] font-mono font-black tabular-nums text-right"
            style={{ color: valColor(totals.allocationEffect ?? 0) }}
          >
            {fmtBps(totals.allocationEffect ?? 0)}
          </span>
          <span
            className="text-[7px] font-mono font-black tabular-nums text-right"
            style={{ color: valColor(totals.selectionEffect ?? 0) }}
          >
            {fmtBps(totals.selectionEffect ?? 0)}
          </span>
          <span
            className="text-[7px] font-mono font-black tabular-nums text-right"
            style={{ color: valColor(totals.interactionEffect ?? 0) }}
          >
            {fmtBps(totals.interactionEffect ?? 0)}
          </span>
        </div>
      </div>
    </>
  );
}

// ── 3. Factor Attribution ──

function FactorAttribution({ data }: { data: any }) {
  const factors: any[] = data.factorAttribution?.factors ?? [];

  return (
    <>
      <SectionHeader title="Factor Attribution" />
      <div className="px-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-1 py-1 border-b border-border/20">
          {['FACTOR', 'PORT EXP', 'ACT EXP', 'FACT RET', 'CONTRIB'].map((h, i) => (
            <span
              key={h}
              className={`text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
            >
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {factors.map((fac: any) => (
          <div
            key={fac.factor}
            className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-1 py-[2px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-300 uppercase">
              {fac.factor}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtNum(fac.portfolioExposure ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: ACCENT }}
            >
              {fmtNum(fac.activeExposure ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(fac.factorReturn ?? 0) }}
            >
              {fmtPct(fac.factorReturn ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(fac.contribution ?? 0) }}
            >
              {fmtBps(fac.contribution ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 4. Currency Attribution ──

function CurrencyAttribution({ data }: { data: any }) {
  const currencies: any[] = data.currencyAttribution?.currencies ?? [];

  return (
    <>
      <SectionHeader title="Currency Attribution" />
      <div className="px-1">
        {/* Header */}
        <div className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-0 px-1 py-1 border-b border-border/20">
          {['CCY', 'LOCAL RET', 'FX RET', 'HEDGE', 'CONTRIB'].map((h, i) => (
            <span
              key={h}
              className={`text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
            >
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {currencies.map((ccy: any) => (
          <div
            key={ccy.currency}
            className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-0 px-1 py-[2px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-300 uppercase">
              {ccy.currency}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(ccy.localReturn ?? 0) }}
            >
              {fmtPct(ccy.localReturn ?? 0, 1)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(ccy.fxReturn ?? 0) }}
            >
              {fmtPct(ccy.fxReturn ?? 0, 1)}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtPct(ccy.hedgeRatio ?? 0, 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(ccy.totalContribution ?? 0) }}
            >
              {fmtBps(ccy.totalContribution ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 5. Top Contributors / Detractors ──

function TopContributorsDetractors({ data }: { data: any }) {
  const contributors: any[] = data.topContributors ?? [];
  const detractors: any[] = data.topDetractors ?? [];

  return (
    <>
      <SectionHeader title="Top Contributors / Detractors" />
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Contributors */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[6px] font-mono font-black uppercase tracking-widest text-green-500">
              TOP CONTRIBUTORS
            </span>
          </div>
          <ContribTable rows={contributors} positive />
        </div>
        {/* Detractors */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[6px] font-mono font-black uppercase tracking-widest text-red-500">
              TOP DETRACTORS
            </span>
          </div>
          <ContribTable rows={detractors} positive={false} />
        </div>
      </div>
    </>
  );
}

function ContribTable({ rows, positive }: { rows: any[]; positive: boolean }) {
  const color = positive ? '#22c55e' : '#ef4444';

  return (
    <div className="px-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_32px_36px_36px] gap-0 px-1 py-[2px] border-b border-border/15">
        {['TICKER', 'WT', 'RET', 'BPS'].map((h, i) => (
          <span
            key={h}
            className={`text-[5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>
      {rows.map((r: any, idx: number) => (
        <div
          key={r.ticker ?? idx}
          className="grid grid-cols-[1fr_32px_36px_36px] gap-0 px-1 py-[2px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[7px] font-mono font-bold text-neutral-200 uppercase">
            {r.ticker}
          </span>
          <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
            {fmtPct(r.weight ?? 0, 1)}
          </span>
          <span
            className="text-[7px] font-mono font-bold tabular-nums text-right"
            style={{ color }}
          >
            {fmtPct(r.return ?? 0, 1)}
          </span>
          <span
            className="text-[7px] font-mono font-black tabular-nums text-right"
            style={{ color }}
          >
            {fmtBps(r.contributionBps ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 6. Risk Decomposition ──

function RiskDecomposition({ data }: { data: any }) {
  const risk = data.riskDecomposition ?? {};

  const rows = [
    { label: 'SYSTEMATIC RISK', value: risk.systematicRisk, fmt: fmtPct, neutral: false },
    { label: 'SPECIFIC RISK', value: risk.specificRisk, fmt: fmtPct, neutral: false },
    { label: 'TOTAL RISK', value: risk.totalRisk, fmt: fmtPct, neutral: true },
    { label: 'R-SQUARED', value: risk.rSquared, fmt: fmtNum, neutral: true },
    { label: 'BETA', value: risk.beta, fmt: fmtNum, neutral: true },
    { label: 'ACTIVE SHARE', value: risk.activeShare, fmt: fmtPct, neutral: false },
  ];

  return (
    <>
      <SectionHeader title="Risk Decomposition" />
      <div className="px-2 py-1">
        {rows.map((r) => {
          const val = r.value ?? 0;
          const display = r.fmt === fmtNum ? fmtNum(val) : fmtPct(val, 1);
          const color = r.neutral ? '#a1a1aa' : valColor(val);
          return (
            <div
              key={r.label}
              className="flex items-center justify-between py-[2px] hover:bg-violet-400/[0.02]"
            >
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {r.label}
              </span>
              <span
                className="text-[8px] font-mono font-bold tabular-nums"
                style={{ color }}
              >
                {display}
              </span>
            </div>
          );
        })}
        {/* Visual bar for systematic vs specific */}
        {risk.systematicRisk != null && risk.specificRisk != null && (
          <div className="mt-1 mb-1">
            <div className="flex h-[6px] w-full">
              <div
                className="h-full"
                style={{
                  width: `${((risk.systematicRisk / (risk.systematicRisk + risk.specificRisk)) * 100).toFixed(1)}%`,
                  background: ACCENT,
                  opacity: 0.7,
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${((risk.specificRisk / (risk.systematicRisk + risk.specificRisk)) * 100).toFixed(1)}%`,
                  background: '#71717a',
                  opacity: 0.4,
                }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[5px] font-mono uppercase" style={{ color: ACCENT }}>
                SYSTEMATIC
              </span>
              <span className="text-[5px] font-mono text-neutral-600 uppercase">SPECIFIC</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
