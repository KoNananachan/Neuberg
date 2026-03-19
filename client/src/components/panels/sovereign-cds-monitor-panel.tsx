import { useState, useMemo } from 'react';
import { useSovereignCdsMonitor } from '../../api/hooks/use-sovereign-cds-monitor';
import { useT } from '../../i18n';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Globe, BarChart3, Activity } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const REGIONS = ['ALL', 'G10', 'EUROPE', 'ASIA', 'LATAM', 'MENA', 'AFRICA'] as const;
type Region = (typeof REGIONS)[number];

const CHART_COLORS = [
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#facc15', // yellow-400
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
];

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPd(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Color helpers ──

function spreadColor(spread: number): string {
  if (spread > 500) return 'text-red-400';
  if (spread > 300) return 'text-red-400/80';
  if (spread > 150) return 'text-orange-400';
  if (spread > 80) return 'text-yellow-400';
  if (spread > 40) return 'text-emerald-400/80';
  return 'text-emerald-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function changeBg(n: number): string {
  if (n > 0) return 'bg-red-400';
  if (n < 0) return 'bg-emerald-400';
  return 'bg-neutral-600';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-green-400/80';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('B')) return 'text-red-400/80';
  return 'text-red-400';
}

function heatmapColor(change: number): string {
  if (change > 20) return 'bg-red-500/80';
  if (change > 10) return 'bg-red-400/60';
  if (change > 5) return 'bg-red-400/30';
  if (change > 1) return 'bg-red-400/15';
  if (change > -1) return 'bg-neutral-700/30';
  if (change > -5) return 'bg-emerald-400/15';
  if (change > -10) return 'bg-emerald-400/30';
  if (change > -20) return 'bg-emerald-400/60';
  return 'bg-emerald-500/80';
}

function heatmapTextColor(change: number): string {
  if (Math.abs(change) > 10) return 'text-white';
  if (change > 1) return 'text-red-300';
  if (change < -1) return 'text-emerald-300';
  return 'text-neutral-400';
}

// ── Alert badge helper ──

function alertBadge(change: number): { label: string; cls: string } | null {
  if (change > 15) return { label: 'WIDENING', cls: 'text-red-400 bg-red-400/15' };
  if (change < -15) return { label: 'TIGHTENING', cls: 'text-emerald-400 bg-emerald-400/15' };
  return null;
}

// ── Main Panel ──

export function SovereignCdsMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignCdsMonitor();
  const d = data as any;
  const [activeRegion, setActiveRegion] = useState<Region>('ALL');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'sovereignCdsMonitorTitle', 'Sovereign CDS Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex items-center gap-0 px-1 py-1 bg-[#050505] border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {REGIONS.map((region) => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeRegion === region
                ? 'text-red-400 bg-red-400/10'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !d && (
          <div className="text-center py-8 text-red-500 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <SpreadTable spreads={d.spreads} region={activeRegion} />
            <HistoricalSpreadChart history={d.historicalSpreads} />
            <SpreadHeatmap heatmap={d.heatmap} region={activeRegion} />
            <BasisVsCashTable basis={d.basisVsCash} region={activeRegion} />
            <AlertsSection alerts={d.alerts} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Sovereign CDS Spread Table ──

function SpreadTable({ spreads, region }: { spreads: any[]; region: Region }) {
  const filtered = useMemo(() => {
    const items = Array.isArray(spreads) ? spreads : [];
    if (region === 'ALL') return items;
    return items.filter(
      (s: any) => (s.region ?? '').toUpperCase() === region
    );
  }, [spreads, region]);

  if (filtered.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <Globe className="w-3 h-3 text-neutral-600" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          SOVEREIGN CDS SPREADS
        </span>
        <span className="text-[7px] font-mono text-neutral-700 ml-auto">
          {filtered.length} ENTITIES
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                COUNTRY
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                RATING
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                5Y SPREAD
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                10Y SPREAD
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                1D CHG
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                IMPLIED PD
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                SIGNAL
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry: any, idx: number) => {
              const badge = alertBadge(entry.change1d ?? 0);
              return (
                <tr
                  key={entry.country || idx}
                  className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap uppercase">
                    {entry.country ?? ''}
                  </td>
                  <td className={`px-1.5 py-1 font-bold whitespace-nowrap ${ratingColor(entry.rating ?? '')}`}>
                    {entry.rating ?? '\u2014'}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${spreadColor(entry.spread5y ?? 0)}`}>
                    {fmtBps(entry.spread5y ?? 0)}
                  </td>
                  <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(entry.spread10y ?? 0)}`}>
                    {entry.spread10y != null ? fmtBps(entry.spread10y) : '\u2014'}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${changeColor(entry.change1d ?? 0)}`}>
                    {fmtChg(entry.change1d ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 text-right text-neutral-300 whitespace-nowrap">
                    {fmtPd(entry.impliedPd ?? 0)}
                  </td>
                  <td className="px-1.5 py-1 text-right whitespace-nowrap">
                    {badge ? (
                      <span className={`text-[7px] font-black font-mono px-1 py-0.5 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : (
                      <span className="text-[7px] text-neutral-700">\u2014</span>
                    )}
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

// ── Section 2: Historical Spread Chart (SVG multi-line for top 5) ──

function HistoricalSpreadChart({ history }: { history: any }) {
  const series = useMemo(() => {
    if (!history || !Array.isArray(history.series)) return [];
    return history.series.slice(0, 5);
  }, [history]);

  const dates: string[] = useMemo(() => {
    if (!history || !Array.isArray(history.dates)) return [];
    return history.dates;
  }, [history]);

  if (series.length === 0 || dates.length === 0) return null;

  const W = 600;
  const H = 160;
  const PL = 40;
  const PR = 10;
  const PT = 20;
  const PB = 22;
  const cw = W - PL - PR;
  const ch = H - PT - PB;

  // Compute global min/max
  let gMin = Infinity;
  let gMax = -Infinity;
  for (const s of series) {
    const vals: number[] = Array.isArray(s.values) ? s.values : [];
    for (const v of vals) {
      if (v < gMin) gMin = v;
      if (v > gMax) gMax = v;
    }
  }
  if (!isFinite(gMin)) gMin = 0;
  if (!isFinite(gMax)) gMax = 100;
  const range = gMax - gMin || 1;
  const pad = range * 0.1;
  const yMin = Math.max(0, gMin - pad);
  const yMax = gMax + pad;
  const yRange = yMax - yMin || 1;

  const xStep = dates.length > 1 ? cw / (dates.length - 1) : 0;
  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ch - ((v - yMin) / yRange) * ch;

  // Y-axis ticks
  const yTicks: number[] = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(yMin + (yRange / tickCount) * i);
  }

  // X-axis labels (show ~5)
  const xLabelStep = Math.max(1, Math.floor(dates.length / 5));

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <Activity className="w-3 h-3 text-neutral-600" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          HISTORICAL SPREADS — TOP 5
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1">
        {series.map((s: any, i: number) => (
          <div key={s.country || i} className="flex items-center gap-1">
            <div
              className="w-2 h-[2px]"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-[7px] font-mono font-bold text-neutral-400 uppercase">
              {s.country ?? ''}
            </span>
          </div>
        ))}
      </div>

      <div className="px-2 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PL}
                y1={toY(tick)}
                x2={W - PR}
                y2={toY(tick)}
                stroke="#ffffff08"
                strokeWidth={0.5}
              />
              <text
                x={PL - 4}
                y={toY(tick) + 3}
                textAnchor="end"
                className="fill-neutral-600"
                fontSize={7}
                fontFamily="monospace"
              >
                {tick.toFixed(0)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {dates.map((date: string, i: number) => {
            if (i % xLabelStep !== 0 && i !== dates.length - 1) return null;
            return (
              <text
                key={i}
                x={toX(i)}
                y={H - 4}
                textAnchor="middle"
                className="fill-neutral-600"
                fontSize={6}
                fontFamily="monospace"
              >
                {date}
              </text>
            );
          })}

          {/* Lines */}
          {series.map((s: any, si: number) => {
            const vals: number[] = Array.isArray(s.values) ? s.values : [];
            if (vals.length < 2) return null;
            const pathData = vals
              .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={s.country || si}
                d={pathData}
                fill="none"
                stroke={CHART_COLORS[si % CHART_COLORS.length]}
                strokeWidth={1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {/* End dots */}
          {series.map((s: any, si: number) => {
            const vals: number[] = Array.isArray(s.values) ? s.values : [];
            if (vals.length === 0) return null;
            const lastIdx = vals.length - 1;
            return (
              <circle
                key={`dot-${s.country || si}`}
                cx={toX(lastIdx)}
                cy={toY(vals[lastIdx])}
                r={2}
                fill={CHART_COLORS[si % CHART_COLORS.length]}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Section 3: Spread Change Heatmap ──

function SpreadHeatmap({ heatmap, region }: { heatmap: any[]; region: Region }) {
  const filtered = useMemo(() => {
    const items = Array.isArray(heatmap) ? heatmap : [];
    if (region === 'ALL') return items;
    return items.filter((h: any) => (h.region ?? '').toUpperCase() === region);
  }, [heatmap, region]);

  if (filtered.length === 0) return null;

  const periods = ['1D', '1W', '1M', '3M'];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <BarChart3 className="w-3 h-3 text-neutral-600" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          SPREAD CHANGE HEATMAP (BPS)
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                COUNTRY
              </th>
              {periods.map((p) => (
                <th
                  key={p}
                  className="px-1.5 py-1 text-center text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, idx: number) => (
              <tr
                key={row.country || idx}
                className="border-b border-border/10"
              >
                <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap uppercase">
                  {row.country ?? ''}
                </td>
                {periods.map((p) => {
                  const key = `change${p.toLowerCase()}` as string;
                  const val = row[key] ?? row[`chg${p}`] ?? null;
                  const v = typeof val === 'number' ? val : 0;
                  return (
                    <td
                      key={p}
                      className={`px-1.5 py-1 text-center whitespace-nowrap ${heatmapColor(v)} ${heatmapTextColor(v)}`}
                    >
                      {val != null ? fmtChg(v) : '\u2014'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mini heatmap legend */}
      <div className="flex items-center justify-center gap-1 px-3 py-1 border-t border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase mr-1">TIGHT</span>
        <div className="w-3 h-1.5 bg-emerald-500/80" />
        <div className="w-3 h-1.5 bg-emerald-400/30" />
        <div className="w-3 h-1.5 bg-neutral-700/30" />
        <div className="w-3 h-1.5 bg-red-400/30" />
        <div className="w-3 h-1.5 bg-red-500/80" />
        <span className="text-[6px] font-mono text-neutral-600 uppercase ml-1">WIDE</span>
      </div>
    </div>
  );
}

// ── Section 4: Basis vs Cash Bonds Table ──

function BasisVsCashTable({ basis, region }: { basis: any[]; region: Region }) {
  const filtered = useMemo(() => {
    const items = Array.isArray(basis) ? basis : [];
    if (region === 'ALL') return items;
    return items.filter((b: any) => (b.region ?? '').toUpperCase() === region);
  }, [basis, region]);

  if (filtered.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <TrendingUp className="w-3 h-3 text-neutral-600" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CDS-BOND BASIS
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                COUNTRY
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                CDS 5Y
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                BOND SPREAD
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                BASIS
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                BASIS CHG
              </th>
              <th className="px-1.5 py-1 text-center text-[7px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                SIGNAL
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row: any, idx: number) => {
              const basisVal = row.basis ?? 0;
              const basisChg = row.basisChange ?? 0;
              return (
                <tr
                  key={row.country || idx}
                  className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 text-white font-bold whitespace-nowrap uppercase">
                    {row.country ?? ''}
                  </td>
                  <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(row.cds5y ?? 0)}`}>
                    {row.cds5y != null ? fmtBps(row.cds5y) : '\u2014'}
                  </td>
                  <td className={`px-1.5 py-1 text-right whitespace-nowrap ${spreadColor(row.bondSpread ?? 0)}`}>
                    {row.bondSpread != null ? fmtBps(row.bondSpread) : '\u2014'}
                  </td>
                  <td className={`px-1.5 py-1 text-right font-bold whitespace-nowrap ${basisVal > 0 ? 'text-red-400' : basisVal < 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {fmtChg(basisVal)}
                  </td>
                  <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(basisChg)}`}>
                    {fmtChg(basisChg)}
                  </td>
                  <td className="px-1.5 py-1 text-center whitespace-nowrap">
                    {basisVal > 30 ? (
                      <span className="text-[7px] font-black font-mono text-red-400 bg-red-400/15 px-1 py-0.5">
                        NEGATIVE BASIS
                      </span>
                    ) : basisVal < -30 ? (
                      <span className="text-[7px] font-black font-mono text-emerald-400 bg-emerald-400/15 px-1 py-0.5">
                        POSITIVE BASIS
                      </span>
                    ) : (
                      <span className="text-[7px] text-neutral-700">\u2014</span>
                    )}
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

// ── Section 5: Alerts ──

function AlertsSection({ alerts }: { alerts: any[] }) {
  const items = Array.isArray(alerts) ? alerts : [];
  if (items.length === 0) return null;

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-red-400/60" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          ACTIVE ALERTS
        </span>
        <span className="text-[7px] font-mono text-red-400/60 ml-auto">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-border/10">
        {items.map((alert: any, idx: number) => {
          const severity = (alert.severity ?? '').toLowerCase();
          const isHigh = severity === 'high' || severity === 'critical';
          const isMed = severity === 'medium';
          const sevColor = isHigh
            ? 'text-red-400 bg-red-400/10'
            : isMed
              ? 'text-yellow-400 bg-yellow-400/10'
              : 'text-neutral-400 bg-neutral-400/10';

          const direction = (alert.direction ?? '').toLowerCase();
          const DirIcon = direction === 'widening' ? TrendingUp : TrendingDown;

          return (
            <div
              key={idx}
              className="px-3 py-1.5 hover:bg-red-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <DirIcon className={`w-3 h-3 ${direction === 'widening' ? 'text-red-400' : 'text-emerald-400'}`} />
                  <span className="text-[8px] font-mono font-bold text-white uppercase">
                    {alert.country ?? ''}
                  </span>
                  <span className={`text-[7px] font-black font-mono px-1 py-0.5 ${sevColor}`}>
                    {alert.severity ?? 'LOW'}
                  </span>
                  {alert.change != null && (
                    <span className={`text-[8px] font-mono font-bold ${changeColor(alert.change)}`}>
                      {fmtChg(alert.change)} BPS
                    </span>
                  )}
                </div>
                <span className="text-[7px] font-mono text-neutral-600">
                  {alert.time ?? ''}
                </span>
              </div>
              {alert.description && (
                <div className="text-[8px] font-mono text-neutral-500 leading-tight ml-5">
                  {alert.description}
                </div>
              )}
              {alert.spread != null && (
                <div className="flex items-center gap-3 mt-0.5 ml-5">
                  <span className="text-[7px] font-mono text-neutral-600">
                    SPREAD {fmtBps(alert.spread)} BPS
                  </span>
                  {alert.impliedPd != null && (
                    <span className="text-[7px] font-mono text-neutral-600">
                      PD {fmtPd(alert.impliedPd)}
                    </span>
                  )}
                  {/* Mini bar for severity */}
                  <div className="flex items-center gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1 h-2 ${
                          level <= (isHigh ? 5 : isMed ? 3 : 1)
                            ? changeBg(alert.change ?? 1)
                            : 'bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
