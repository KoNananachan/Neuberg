import { useMemo } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { usePortfolioAttribution } from '../../api/hooks/use-portfolio-attribution';
import { useT, tr, TFn } from '../../i18n';

// ── Constants ──

const ACCENT = '#38bdf8'; // sky-400
const GREEN = '#22c55e';
const RED = '#ef4444';

// ── Color / formatting helpers ──

function valColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
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
    <div className="px-2 py-1 bg-[#050505] border-b border-border/20 border-t border-t-sky-400/10">
      <span className="text-[7px] font-mono font-black uppercase tracking-widest text-sky-400/70">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PortfolioAttributionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = usePortfolioAttribution();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            {tr(t, 'portAttrTitle', 'Portfolio Attribution')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
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
            <KeyMetricsCards data={data} />
            <BrinsonAttribution data={data} />
            <FactorContributionChart data={data} />
            <PeriodReturnsTable data={data} />
            <TopBottomContributors data={data} />
            <RiskDecomposition data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Key Metrics Cards (Alpha, Tracking Error, Information Ratio) ──

function KeyMetricsCards({ data }: { data: any }) {
  const metrics = [
    {
      label: 'ALPHA',
      value: data?.alpha ?? data?.summary?.alpha ?? 0,
      fmt: fmtPct,
      colored: true,
    },
    {
      label: 'TRACKING ERROR',
      value: data?.trackingError ?? data?.summary?.trackingError ?? 0,
      fmt: fmtPct,
      colored: false,
    },
    {
      label: 'INFO RATIO',
      value: data?.infoRatio ?? data?.summary?.infoRatio ?? 0,
      fmt: fmtNum,
      colored: true,
    },
    {
      label: 'SHARPE',
      value: data?.sharpeRatio ?? data?.summary?.sharpeRatio ?? 0,
      fmt: fmtNum,
      colored: true,
    },
    {
      label: 'BETA',
      value: data?.beta ?? data?.summary?.beta ?? 0,
      fmt: fmtNum,
      colored: false,
    },
    {
      label: 'ACTIVE RET',
      value: data?.activeReturn ?? data?.summary?.activeReturn ?? 0,
      fmt: fmtPct,
      colored: true,
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border/10 border-b border-border/20">
      {metrics.map((m) => {
        const val = m.value;
        const display = m.fmt === fmtNum ? fmtNum(val) : fmtPct(val);
        const color = m.colored ? valColor(val) : '#a1a1aa';
        return (
          <div
            key={m.label}
            className="bg-[#050505] px-1.5 py-1.5 flex flex-col items-center"
          >
            <span className="text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </span>
            <span
              className="text-[10px] font-mono font-black tabular-nums"
              style={{ color }}
            >
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 2. Brinson Attribution by Sector ──

function BrinsonAttribution({ data }: { data: any }) {
  const sectors: any[] = data?.sectors ?? [];
  const maxAbsTotal = useMemo(
    () => Math.max(...sectors.map((s: any) => Math.abs(s.total ?? 0)), 1),
    [sectors],
  );

  return (
    <>
      <SectionHeader title="Brinson Attribution by Sector" />
      <div className="px-1">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_42px_42px_42px_42px_60px] gap-0 px-1 py-1 border-b border-border/20">
          {['SECTOR', 'ALLOC', 'SELECT', 'INTER', 'TOTAL', ''].map(
            (h, i) => (
              <span
                key={h + i}
                className={`text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 && i < 5 ? 'text-right' : ''}`}
              >
                {h}
              </span>
            ),
          )}
        </div>
        {/* Data rows */}
        {sectors.map((sec: any) => {
          const total = sec.total ?? 0;
          const barPct = (Math.abs(total) / maxAbsTotal) * 100;
          return (
            <div
              key={sec.sector}
              className="grid grid-cols-[1fr_42px_42px_42px_42px_60px] gap-0 px-1 py-[2px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[7px] font-mono font-bold text-neutral-300 truncate uppercase">
                {sec.sector}
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
                style={{ color: valColor(total) }}
              >
                {fmtBps(total)}
              </span>
              {/* Bar visualization */}
              <div className="flex items-center pl-1">
                <svg width="52" height="8" viewBox="0 0 52 8">
                  <rect x={0} y={0} width={52} height={8} fill="rgba(255,255,255,0.02)" rx={0} />
                  <line x1={26} y1={0} x2={26} y2={8} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  {total >= 0 ? (
                    <rect
                      x={26}
                      y={1}
                      width={Math.max((barPct / 100) * 26, 0.5)}
                      height={6}
                      fill={GREEN}
                      opacity={0.6}
                    />
                  ) : (
                    <rect
                      x={Math.max(26 - (barPct / 100) * 26, 0)}
                      y={1}
                      width={Math.max((barPct / 100) * 26, 0.5)}
                      height={6}
                      fill={RED}
                      opacity={0.6}
                    />
                  )}
                </svg>
              </div>
            </div>
          );
        })}
        {/* Totals row */}
        {sectors.length > 0 && <BrinsonTotals sectors={sectors} />}
      </div>
    </>
  );
}

function BrinsonTotals({ sectors }: { sectors: any[] }) {
  const totals = useMemo(
    () => ({
      alloc: sectors.reduce((s: number, sec: any) => s + (sec.allocEffect ?? 0), 0),
      select: sectors.reduce((s: number, sec: any) => s + (sec.selectionEffect ?? 0), 0),
      inter: sectors.reduce((s: number, sec: any) => s + (sec.interaction ?? 0), 0),
      total: sectors.reduce((s: number, sec: any) => s + (sec.total ?? 0), 0),
    }),
    [sectors],
  );

  return (
    <div className="grid grid-cols-[1fr_42px_42px_42px_42px_60px] gap-0 px-1 py-1.5 border-t border-sky-400/20 bg-sky-400/[0.02]">
      <span className="text-[7px] font-mono font-black text-sky-400 uppercase">TOTAL</span>
      <span
        className="text-[7px] font-mono font-black tabular-nums text-right"
        style={{ color: valColor(totals.alloc) }}
      >
        {fmtBps(totals.alloc)}
      </span>
      <span
        className="text-[7px] font-mono font-black tabular-nums text-right"
        style={{ color: valColor(totals.select) }}
      >
        {fmtBps(totals.select)}
      </span>
      <span
        className="text-[7px] font-mono font-black tabular-nums text-right"
        style={{ color: valColor(totals.inter) }}
      >
        {fmtBps(totals.inter)}
      </span>
      <span
        className="text-[7px] font-mono font-black tabular-nums text-right"
        style={{ color: valColor(totals.total) }}
      >
        {fmtBps(totals.total)}
      </span>
      <span />
    </div>
  );
}

// ── 3. Factor Contribution Chart (SVG Horizontal Bars) ──

function FactorContributionChart({ data }: { data: any }) {
  const factors: any[] = data?.factors ?? data?.factorContributions ?? [];
  const factorList = useMemo(() => {
    if (factors.length > 0) return factors;
    // Fallback: build from factorExposure object
    const fe = data?.factorExposure;
    if (!fe) return [];
    return Object.entries(fe).map(([k, v]) => ({
      factor: k.toUpperCase(),
      contribution: v as number,
    }));
  }, [factors, data?.factorExposure]);

  const maxAbs = useMemo(
    () => Math.max(...factorList.map((f: any) => Math.abs(f.contribution ?? 0)), 0.01),
    [factorList],
  );

  if (factorList.length === 0) return null;

  const BAR_H = 14;
  const LABEL_W = 70;
  const VALUE_W = 40;
  const CHART_W = 200;
  const SVG_W = LABEL_W + CHART_W + VALUE_W;
  const SVG_H = factorList.length * BAR_H + 4;
  const CENTER_X = LABEL_W + CHART_W / 2;

  return (
    <>
      <SectionHeader title="Factor Contributions" />
      <div className="px-2 py-1.5">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ maxHeight: factorList.length * 18 + 8 }}
        >
          {/* Center line */}
          <line
            x1={CENTER_X}
            y1={0}
            x2={CENTER_X}
            y2={SVG_H}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
          {factorList.map((f: any, i: number) => {
            const val = f.contribution ?? 0;
            const isPositive = val >= 0;
            const barWidth = (Math.abs(val) / maxAbs) * (CHART_W / 2);
            const y = i * BAR_H + 2;
            const barX = isPositive ? CENTER_X : CENTER_X - barWidth;
            const color = isPositive ? GREEN : RED;

            return (
              <g key={f.factor ?? i}>
                {/* Hover zone */}
                <rect
                  x={0}
                  y={y}
                  width={SVG_W}
                  height={BAR_H}
                  fill="transparent"
                  className="hover:fill-sky-400/[0.03]"
                />
                {/* Label */}
                <text
                  x={LABEL_W - 4}
                  y={y + BAR_H / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="#a1a1aa"
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {(f.factor ?? f.name ?? '').toUpperCase()}
                </text>
                {/* Bar */}
                <rect
                  x={barX}
                  y={y + 2}
                  width={Math.max(barWidth, 0.5)}
                  height={BAR_H - 4}
                  fill={color}
                  opacity={0.55}
                />
                {/* Value text */}
                <text
                  x={LABEL_W + CHART_W + 4}
                  y={y + BAR_H / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {fmtBps(val)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="text-[5.5px] font-mono text-neutral-700 uppercase mt-1">
          VALUES IN BPS
        </div>
      </div>
    </>
  );
}

// ── 4. Period Returns Table vs Benchmark ──

function PeriodReturnsTable({ data }: { data: any }) {
  const periods: any[] = data?.periods ?? data?.periodReturns ?? [];

  const defaultPeriods = useMemo(() => {
    if (periods.length > 0) return periods;
    // Fallback: build from top-level data
    const entries = [];
    const periodMap: Record<string, { port?: number; bench?: number }> = {};
    const labels = ['MTD', 'QTD', 'YTD', '1Y', '3Y', 'SI'];
    for (const label of labels) {
      const lk = label.toLowerCase().replace(/\s/g, '');
      const portKey = `portfolioReturn${label}` as string;
      const benchKey = `benchmarkReturn${label}` as string;
      periodMap[label] = {
        port: data?.[portKey] ?? data?.returns?.[lk]?.portfolio,
        bench: data?.[benchKey] ?? data?.returns?.[lk]?.benchmark,
      };
    }
    for (const label of labels) {
      const p = periodMap[label];
      if (p?.port !== undefined || p?.bench !== undefined) {
        entries.push({
          period: label,
          portfolioReturn: p?.port ?? 0,
          benchmarkReturn: p?.bench ?? 0,
          activeReturn: (p?.port ?? 0) - (p?.bench ?? 0),
        });
      }
    }
    // If still empty, use summary-level returns
    if (entries.length === 0 && data?.portfolioReturn !== undefined) {
      entries.push({
        period: 'TOTAL',
        portfolioReturn: data.portfolioReturn ?? 0,
        benchmarkReturn: data.benchmarkReturn ?? 0,
        activeReturn: data.activeReturn ?? 0,
      });
    }
    return entries;
  }, [periods, data]);

  if (defaultPeriods.length === 0) return null;

  return (
    <>
      <SectionHeader title="Period Returns vs Benchmark" />
      <div className="px-1 py-1">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-0 px-1 py-1 border-b border-border/20">
          {['PERIOD', 'PORTFOLIO', 'BENCHMARK', 'ACTIVE'].map((h, i) => (
            <span
              key={h}
              className={`text-[5.5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
            >
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {defaultPeriods.map((p: any) => {
          const active =
            p.activeReturn ?? (p.portfolioReturn ?? 0) - (p.benchmarkReturn ?? 0);
          return (
            <div
              key={p.period}
              className="grid grid-cols-[60px_1fr_1fr_1fr] gap-0 px-1 py-[3px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[7px] font-mono font-black text-sky-400/60 uppercase">
                {p.period}
              </span>
              <span
                className="text-[7px] font-mono font-bold tabular-nums text-right"
                style={{ color: valColor(p.portfolioReturn ?? 0) }}
              >
                {fmtPct(p.portfolioReturn ?? 0)}
              </span>
              <span className="text-[7px] font-mono tabular-nums text-right text-neutral-500">
                {fmtPct(p.benchmarkReturn ?? 0)}
              </span>
              <span
                className="text-[7px] font-mono font-black tabular-nums text-right"
                style={{ color: valColor(active) }}
              >
                {fmtPct(active)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── 5. Top / Bottom Contributors ──

function TopBottomContributors({ data }: { data: any }) {
  const topContributors: any[] = data?.topContributors ?? [];
  const bottomContributors: any[] = data?.bottomContributors ?? [];

  if (topContributors.length === 0 && bottomContributors.length === 0) return null;

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
          <ContributorList rows={topContributors} positive />
        </div>
        {/* Bottom contributors */}
        <div className="bg-black">
          <div className="px-2 py-1 border-b border-border/20">
            <span className="text-[6px] font-mono font-black uppercase tracking-widest text-red-500">
              BOTTOM CONTRIBUTORS
            </span>
          </div>
          <ContributorList rows={bottomContributors} positive={false} />
        </div>
      </div>
    </>
  );
}

function ContributorList({ rows, positive }: { rows: any[]; positive: boolean }) {
  const color = positive ? GREEN : RED;
  const maxAbsContrib = useMemo(
    () => Math.max(...rows.map((r: any) => Math.abs(r.contribution ?? 0)), 0.01),
    [rows],
  );

  return (
    <div className="px-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_32px_36px_40px] gap-0 px-1 py-[2px] border-b border-border/15">
        {['NAME', 'WT', 'RET', 'CONTRIB'].map((h, i) => (
          <span
            key={h}
            className={`text-[5px] font-mono text-neutral-600 uppercase tracking-wider ${i > 0 ? 'text-right' : ''}`}
          >
            {h}
          </span>
        ))}
      </div>
      {rows.map((r: any, idx: number) => {
        const contrib = r.contribution ?? 0;
        const barPct = (Math.abs(contrib) / maxAbsContrib) * 100;
        return (
          <div
            key={r.name ?? idx}
            className="grid grid-cols-[1fr_32px_36px_40px] gap-0 px-1 py-[2px] hover:bg-sky-400/[0.02] border-b border-border/10 items-center"
          >
            <div className="flex flex-col">
              <span className="text-[7px] font-mono font-bold text-neutral-200 uppercase truncate">
                {r.name}
              </span>
              {/* Mini bar */}
              <div className="w-full h-[2px] bg-white/[0.03] mt-0.5">
                <div
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    height: '100%',
                    background: color,
                    opacity: 0.4,
                  }}
                />
              </div>
            </div>
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
              {fmtBps(contrib)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 6. Risk Decomposition (Systematic vs Idiosyncratic, SVG Donut) ──

function RiskDecomposition({ data }: { data: any }) {
  const systematic =
    data?.riskDecomposition?.systematic ??
    data?.systematicRisk ??
    data?.risk?.systematic ??
    0;
  const idiosyncratic =
    data?.riskDecomposition?.idiosyncratic ??
    data?.idiosyncraticRisk ??
    data?.risk?.idiosyncratic ??
    0;
  const total = systematic + idiosyncratic || 1;
  const sysPct = (systematic / total) * 100;
  const idioPct = (idiosyncratic / total) * 100;

  // Donut chart parameters
  const SIZE = 80;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 28;
  const STROKE_W = 8;

  // SVG arc calculation
  const sysAngle = (sysPct / 100) * 360;
  const sysArc = describeArc(CX, CY, R, 0, sysAngle);
  const idioArc = describeArc(CX, CY, R, sysAngle, 360);

  // Risk breakdown items
  const riskItems = [
    {
      label: 'TOTAL RISK',
      value: data?.riskDecomposition?.totalRisk ?? data?.totalRisk ?? total,
      fmt: fmtPct,
      color: ACCENT,
    },
    {
      label: 'SYSTEMATIC',
      value: systematic,
      fmt: fmtPct,
      color: '#38bdf8',
      pct: sysPct,
    },
    {
      label: 'IDIOSYNCRATIC',
      value: idiosyncratic,
      fmt: fmtPct,
      color: '#f97316',
      pct: idioPct,
    },
    {
      label: 'R-SQUARED',
      value: data?.riskDecomposition?.rSquared ?? data?.rSquared ?? 0,
      fmt: fmtNum,
      color: '#a1a1aa',
    },
  ];

  return (
    <>
      <SectionHeader title="Risk Decomposition" />
      <div className="flex items-start gap-3 px-3 py-2">
        {/* SVG Donut */}
        <div className="shrink-0">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Background circle */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={STROKE_W}
            />
            {/* Systematic arc */}
            {sysPct > 0 && (
              <path
                d={sysArc}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={STROKE_W}
                strokeLinecap="butt"
              />
            )}
            {/* Idiosyncratic arc */}
            {idioPct > 0 && (
              <path
                d={idioArc}
                fill="none"
                stroke="#f97316"
                strokeWidth={STROKE_W}
                strokeLinecap="butt"
              />
            )}
            {/* Center text */}
            <text
              x={CX}
              y={CY - 3}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={ACCENT}
              fontSize={8}
              fontFamily="monospace"
              fontWeight="900"
            >
              {sysPct.toFixed(0)}%
            </text>
            <text
              x={CX}
              y={CY + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={5}
              fontFamily="monospace"
            >
              SYS
            </text>
          </svg>
        </div>

        {/* Risk metrics list */}
        <div className="flex-1 space-y-1">
          {riskItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-[2px] hover:bg-sky-400/[0.02]"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[6px] h-[6px]"
                  style={{ background: item.color, opacity: 0.7 }}
                />
                <span className="text-[6.5px] font-mono text-neutral-500 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <span
                className="text-[8px] font-mono font-bold tabular-nums"
                style={{ color: item.color }}
              >
                {item.fmt === fmtNum ? fmtNum(item.value) : fmtPct(item.value)}
                {item.pct !== undefined && (
                  <span className="text-[6px] text-neutral-600 ml-1">
                    ({item.pct.toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── SVG Arc Helper ──

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  // Handle full circle
  if (endAngle - startAngle >= 360) {
    const mid = startAngle + 180;
    return (
      describeArc(cx, cy, r, startAngle, mid) +
      ' ' +
      describeArc(cx, cy, r, mid, endAngle - 0.01)
    );
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
