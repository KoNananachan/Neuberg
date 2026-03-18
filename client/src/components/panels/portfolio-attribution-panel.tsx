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

const ACCENT = '#22d3ee'; // cyan-400

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
    <div className="px-2 py-1 bg-[#050505] border-b border-border/20 border-t border-t-cyan-400/10">
      <span className="text-[7px] font-mono font-black uppercase tracking-widest text-cyan-400/70">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PortfolioAttributionPanel() {
  const t = useT();
  const { data, isLoading } = usePortfolioAttribution();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header with accent bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3.5" style={{ background: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-wider"
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

        {data && (
          <>
            <BrinsonAttribution data={data} />
            <PerformanceSummary data={data} />
            <TopBottomContributors data={data} />
            <FactorExposure data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Brinson Attribution by Sector ──

function BrinsonAttribution({ data }: { data: any }) {
  const sectors: any[] = data?.sectors ?? [];

  return (
    <>
      <SectionHeader title="Brinson Attribution by Sector" />
      <div className="px-1">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_44px] gap-0 px-1 py-1 border-b border-border/20">
          {['SECTOR', 'PORT WT', 'BENCH WT', 'ALLOC', 'SELECT', 'INTER', 'TOTAL'].map(
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
        {/* Data rows */}
        {sectors.map((sec: any) => (
          <div
            key={sec.sector}
            className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_44px] gap-0 px-1 py-[2px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-300 truncate uppercase">
              {sec.sector}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-400">
              {fmtPct(sec.portWeight ?? 0, 1)}
            </span>
            <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
              {fmtPct(sec.benchWeight ?? 0, 1)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.allocEffect ?? 0) }}
            >
              {fmtBps(sec.allocEffect ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.selectionEffect ?? 0) }}
            >
              {fmtBps(sec.selectionEffect ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold tabular-nums text-right"
              style={{ color: valColor(sec.interaction ?? 0) }}
            >
              {fmtBps(sec.interaction ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-black tabular-nums text-right"
              style={{ color: valColor(sec.total ?? 0) }}
            >
              {fmtBps(sec.total ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── 2. Performance Summary ──

function PerformanceSummary({ data }: { data: any }) {
  const metrics = [
    { label: 'PORTFOLIO RETURN', value: data?.portfolioReturn, fmt: fmtPct },
    { label: 'BENCHMARK RETURN', value: data?.benchmarkReturn, fmt: fmtPct },
    {
      label: 'ACTIVE RETURN',
      value: data?.activeReturn,
      fmt: fmtPct,
      color: valColor(data?.activeReturn ?? 0),
    },
    { label: 'TRACKING ERROR', value: data?.trackingError, fmt: fmtPct, neutral: true },
    { label: 'INFORMATION RATIO', value: data?.infoRatio, fmt: fmtNum, neutral: true },
  ];

  return (
    <>
      <SectionHeader title="Performance Summary" />
      <div className="px-2 py-1">
        {metrics.map((m) => {
          const val = m.value ?? 0;
          const display = m.fmt === fmtNum ? fmtNum(val) : fmtPct(val);
          const color = m.color ?? (m.neutral ? '#a1a1aa' : valColor(val));
          return (
            <div
              key={m.label}
              className="flex items-center justify-between py-[2px] hover:bg-cyan-400/[0.02]"
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

// ── 3. Top / Bottom Contributors ──

function TopBottomContributors({ data }: { data: any }) {
  const topContributors: any[] = data?.topContributors ?? [];
  const bottomContributors: any[] = data?.bottomContributors ?? [];

  return (
    <>
      <SectionHeader title="Top / Bottom Contributors" />
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* Top contributors */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[6px] font-mono font-black uppercase tracking-widest text-green-500">
              TOP CONTRIBUTORS
            </span>
          </div>
          <ContributorTable rows={topContributors} positive />
        </div>
        {/* Bottom contributors */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[6px] font-mono font-black uppercase tracking-widest text-red-500">
              BOTTOM CONTRIBUTORS
            </span>
          </div>
          <ContributorTable rows={bottomContributors} positive={false} />
        </div>
      </div>
    </>
  );
}

function ContributorTable({ rows, positive }: { rows: any[]; positive: boolean }) {
  const color = positive ? '#22c55e' : '#ef4444';

  return (
    <div className="px-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_32px_36px_36px] gap-0 px-1 py-[2px] border-b border-border/15">
        {['NAME', 'WT', 'RET', 'CONTRIB'].map((h, i) => (
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
          key={r.name ?? idx}
          className="grid grid-cols-[1fr_32px_36px_36px] gap-0 px-1 py-[2px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[7px] font-mono font-bold text-neutral-200 uppercase truncate">
            {r.name}
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
            {fmtBps(r.contribution ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4. Factor Exposure ──

function FactorExposure({ data }: { data: any }) {
  const factors = [
    { label: 'BETA', value: data?.factorExposure?.beta },
    { label: 'SIZE', value: data?.factorExposure?.size },
    { label: 'VALUE', value: data?.factorExposure?.value },
    { label: 'MOMENTUM', value: data?.factorExposure?.momentum },
    { label: 'QUALITY', value: data?.factorExposure?.quality },
    { label: 'LOW VOL', value: data?.factorExposure?.lowVol },
  ];

  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.value ?? 0)), 0.01);

  return (
    <>
      <SectionHeader title="Factor Exposure" />
      <div className="px-2 py-1">
        {factors.map((f) => {
          const val = f.value ?? 0;
          const barPct = (Math.abs(val) / maxAbs) * 100;
          const isPositive = val >= 0;

          return (
            <div
              key={f.label}
              className="flex items-center gap-2 py-[3px] hover:bg-cyan-400/[0.02]"
            >
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider w-[52px] shrink-0">
                {f.label}
              </span>
              {/* Bar visualization */}
              <div className="flex-1 flex items-center">
                <div className="relative w-full h-[6px] bg-white/[0.03]">
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 w-px h-full bg-white/10" />
                  {/* Value bar */}
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: isPositive ? '50%' : `${50 - barPct / 2}%`,
                      width: `${barPct / 2}%`,
                      background: isPositive ? ACCENT : '#f97316',
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
              <span
                className="text-[8px] font-mono font-bold tabular-nums w-[36px] text-right shrink-0"
                style={{ color: isPositive ? ACCENT : '#f97316' }}
              >
                {val > 0 ? '+' : ''}{fmtNum(val)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
