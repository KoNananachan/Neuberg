import { useState, useMemo } from 'react';
import {
  useTermStructure,
  type TermStructureData,
  type CurveData,
  type CurveSpread,
} from '../../api/hooks/use-term-structure';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

type ViewMode = 'CURVES' | 'TABLE' | 'SPREADS';

const CURVE_COLORS: Record<string, string> = {
  UST: '#a3e635',   // lime-400
  BUND: '#38bdf8',  // sky-400
  GILT: '#f59e0b',  // amber-500
  JGB: '#f87171',   // red-400
  CGB: '#2dd4bf',   // teal-400
  ACGB: '#a78bfa',  // violet-400
  OAT: '#fb923c',   // orange-400
  BTP: '#f472b6',   // pink-400
};

const ALL_CURVE_IDS = ['UST', 'BUND', 'GILT', 'JGB', 'CGB', 'ACGB', 'OAT', 'BTP'] as const;

// ── Formatting helpers ──

function fmtYield(n: number): string {
  return n.toFixed(3);
}

function fmtChange(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}`;
}

function changeColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// Yield change: rising = red (rates up), falling = green
function yieldChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function TermStructurePanel() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('CURVES');
  const [selectedCurves, setSelectedCurves] = useState<Set<string>>(
    new Set(['UST', 'BUND', 'GILT', 'JGB']),
  );
  const { data, isLoading, refetch } = useTermStructure();

  const toggleCurve = (id: string) => {
    setSelectedCurves((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'panelTermStructure', 'TERM STRUCTURE MONITOR')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500">
            {data ? `${data.curves.length} CURVES` : ''}
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Curve selector */}
      <div className="flex items-center gap-1 px-3 py-1 bg-[#030303] border-b border-border/30 shrink-0 overflow-x-auto no-scrollbar">
        {ALL_CURVE_IDS.map((id) => {
          const active = selectedCurves.has(id);
          const color = CURVE_COLORS[id] ?? '#a3e635';
          return (
            <button
              key={id}
              onClick={() => toggleCurve(id)}
              className={`flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase transition-colors border ${
                active
                  ? 'border-lime-400/40 bg-lime-400/[0.06]'
                  : 'border-border/20 bg-transparent text-neutral-600 hover:text-neutral-400'
              }`}
            >
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{
                  backgroundColor: active ? color : 'transparent',
                  border: active ? 'none' : `1px solid ${color}`,
                }}
              />
              <span style={{ color: active ? color : undefined }}>{id}</span>
            </button>
          );
        })}
      </div>

      {/* View tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['CURVES', 'TABLE', 'SPREADS'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              view === v
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {v === 'CURVES'
              ? tr(t, 'termStructureCurves', 'Curves')
              : v === 'TABLE'
                ? tr(t, 'termStructureTable', 'Table')
                : tr(t, 'termStructureSpreads', 'Spreads')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {data && view === 'CURVES' && (
          <CurvesView data={data} selectedCurves={selectedCurves} />
        )}
        {data && view === 'TABLE' && (
          <TableView data={data} />
        )}
        {data && view === 'SPREADS' && (
          <SpreadsView data={data} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// CURVES View: Side-by-side horizontal bar comparison
// ────────────────────────────────────────────────────

function CurvesView({
  data,
  selectedCurves,
}: {
  data: TermStructureData;
  selectedCurves: Set<string>;
}) {
  const t = useT();
  const activeCurves = useMemo(
    () => data.curves.filter((c) => selectedCurves.has(c.id)),
    [data.curves, selectedCurves],
  );

  const tenors = useMemo(() => {
    if (activeCurves.length === 0) return [];
    return activeCurves[0].tenors.map((tp) => tp.tenor);
  }, [activeCurves]);

  // Find global min/max yields for bar scaling
  const { minYield, maxYield } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    for (const curve of activeCurves) {
      for (const tp of curve.tenors) {
        if (tp.yield < mn) mn = tp.yield;
        if (tp.yield > mx) mx = tp.yield;
      }
    }
    if (mn === Infinity) return { minYield: 0, maxYield: 5 };
    // Add some padding
    const pad = (mx - mn) * 0.1 || 0.5;
    return { minYield: Math.max(0, mn - pad), maxYield: mx + pad };
  }, [activeCurves]);

  if (activeCurves.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'termSelectCurves', 'Select curves above to compare')}
      </div>
    );
  }

  const range = maxYield - minYield || 1;

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20">
        {activeCurves.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <span
              className="w-2 h-[2px]"
              style={{ backgroundColor: CURVE_COLORS[c.id] ?? '#a3e635' }}
            />
            <span className="text-[7px] font-mono text-neutral-400">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Tenor rows with horizontal bars */}
      <div>
        {/* Scale header */}
        <div className="flex items-center px-3 py-1 border-b border-border/20">
          <div className="w-10 shrink-0" />
          <div className="flex-1 flex justify-between text-[6px] font-mono text-neutral-600">
            <span>{minYield.toFixed(1)}%</span>
            <span>{((minYield + maxYield) / 2).toFixed(1)}%</span>
            <span>{maxYield.toFixed(1)}%</span>
          </div>
        </div>

        {tenors.map((tenor, tIdx) => (
          <div
            key={tenor}
            className={`px-3 py-1 border-b border-border/10 hover:bg-lime-400/[0.02] ${
              tIdx % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[9px] font-mono font-bold text-white">
                {tenor}
              </span>
              <div className="flex-1">
                {activeCurves.map((curve) => {
                  const tp = curve.tenors.find((x) => x.tenor === tenor);
                  if (!tp) return null;
                  const pct = ((tp.yield - minYield) / range) * 100;
                  const color = CURVE_COLORS[curve.id] ?? '#a3e635';
                  return (
                    <div key={curve.id} className="flex items-center gap-1.5 mb-[2px] last:mb-0">
                      <span
                        className="text-[6px] font-mono w-7 shrink-0"
                        style={{ color }}
                      >
                        {curve.id}
                      </span>
                      <div className="flex-1 h-[5px] bg-white/[0.03] relative">
                        <div
                          className="h-full absolute left-0 top-0"
                          style={{
                            width: `${Math.max(1, pct)}%`,
                            backgroundColor: color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-white w-12 text-right shrink-0">
                        {fmtYield(tp.yield)}%
                      </span>
                      <span
                        className={`text-[7px] font-mono w-10 text-right shrink-0 ${yieldChangeColor(tp.change1d)}`}
                      >
                        {fmtChange(tp.change1d)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// TABLE View: Full matrix of all curves x all tenors
// ────────────────────────────────────────────────────

function TableView({ data }: { data: TermStructureData }) {
  const t = useT();
  const [sortTenor, setSortTenor] = useState<string | null>(null);

  const tenors = useMemo(() => {
    if (data.curves.length === 0) return [];
    return data.curves[0].tenors.map((tp) => tp.tenor);
  }, [data.curves]);

  const sortedCurves = useMemo(() => {
    if (!sortTenor) return data.curves;
    return [...data.curves].sort((a, b) => {
      const yA = a.tenors.find((tp) => tp.tenor === sortTenor)?.yield ?? 0;
      const yB = b.tenors.find((tp) => tp.tenor === sortTenor)?.yield ?? 0;
      return yB - yA;
    });
  }, [data.curves, sortTenor]);

  return (
    <div>
      {/* Matrix header row */}
      <div className="flex border-b border-border/20 bg-[#030303] sticky top-0 z-10">
        <div className="w-20 shrink-0 px-2 py-1.5 text-[7px] font-black font-mono text-neutral-500 uppercase">
          {tr(t, 'termCurve', 'Curve')}
        </div>
        {tenors.map((tenor) => (
          <button
            key={tenor}
            onClick={() => setSortTenor(sortTenor === tenor ? null : tenor)}
            className={`flex-1 min-w-[50px] px-1 py-1.5 text-[7px] font-black font-mono uppercase text-right transition-colors ${
              sortTenor === tenor
                ? 'text-lime-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tenor}
          </button>
        ))}
      </div>

      {/* Curve rows */}
      {sortedCurves.map((curve, idx) => {
        const color = CURVE_COLORS[curve.id] ?? '#a3e635';
        return (
          <div
            key={curve.id}
            className={`flex border-b border-border/10 hover:bg-lime-400/[0.02] ${
              idx % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="w-20 shrink-0 px-2 py-1.5 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: color }}
              />
              <div>
                <div className="text-[8px] font-mono font-bold text-white">{curve.id}</div>
                <div className="text-[6px] font-mono text-neutral-600">{curve.currency}</div>
              </div>
            </div>
            {tenors.map((tenor) => {
              const tp = curve.tenors.find((x) => x.tenor === tenor);
              if (!tp) return <div key={tenor} className="flex-1 min-w-[50px]" />;
              return (
                <div
                  key={tenor}
                  className="flex-1 min-w-[50px] px-1 py-1.5 text-right"
                >
                  <div className="text-[8px] font-mono font-bold text-white">
                    {fmtYield(tp.yield)}
                  </div>
                  <div className={`text-[6px] font-mono ${yieldChangeColor(tp.change1d)}`}>
                    {fmtChange(tp.change1d)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="px-3 py-1.5 text-[7px] font-mono text-neutral-600 text-right">
        {tr(t, 'termUpdated', 'Updated')}: {new Date(data.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// SPREADS View: Term spreads + cross-country spreads
// ────────────────────────────────────────────────────

function SpreadsView({ data }: { data: TermStructureData }) {
  const t = useT();

  const termSpreads = useMemo(
    () => data.spreads.filter((s) => s.type === 'term'),
    [data.spreads],
  );
  const crossSpreads = useMemo(
    () => data.spreads.filter((s) => s.type === 'cross'),
    [data.spreads],
  );

  return (
    <div>
      {/* Term Spreads Section */}
      <div className="px-3 py-1.5 bg-[#030303] border-b border-border/30">
        <div className="text-[7px] font-black font-mono text-lime-400 uppercase tracking-widest">
          {tr(t, 'termSpreadsSection', '10Y-2Y TERM SPREADS')}
        </div>
      </div>

      <div>
        {/* Header */}
        <div className="flex items-center px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase">
          <span className="w-28 shrink-0">Curve</span>
          <span className="w-16 text-right">Spread</span>
          <span className="w-14 text-right">1D Chg</span>
          <span className="flex-1 text-right">Signal</span>
        </div>

        {termSpreads.map((spread, idx) => {
          const curveId = spread.label.split(' ')[0];
          const color = CURVE_COLORS[curveId] ?? '#a3e635';
          const isInverted = spread.value < 0;
          const isFlat = Math.abs(spread.value) < 10;

          return (
            <div
              key={spread.label}
              className={`flex items-center px-3 py-1.5 border-b border-border/10 hover:bg-lime-400/[0.02] ${
                idx % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <div className="w-28 shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[8px] font-mono font-bold text-white">{spread.label}</span>
              </div>
              <div className="w-16 text-right">
                <span
                  className={`text-[10px] font-mono font-black ${
                    isInverted ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {fmtBps(spread.value)}bp
                </span>
              </div>
              <div className="w-14 text-right">
                <span className={`text-[8px] font-mono ${changeColor(spread.change1d)}`}>
                  {fmtBps(spread.change1d)}
                </span>
              </div>
              <div className="flex-1 text-right">
                {isInverted && (
                  <span className="text-[7px] font-mono font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5">
                    INVERTED
                  </span>
                )}
                {!isInverted && isFlat && (
                  <span className="text-[7px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5">
                    FLAT
                  </span>
                )}
                {!isInverted && !isFlat && (
                  <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5">
                    NORMAL
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Country Spreads Section */}
      <div className="px-3 py-1.5 bg-[#030303] border-b border-border/30 mt-0">
        <div className="text-[7px] font-black font-mono text-lime-400 uppercase tracking-widest">
          {tr(t, 'crossSpreadsSection', 'CROSS-COUNTRY SPREADS (10Y)')}
        </div>
      </div>

      <div>
        {/* Header */}
        <div className="flex items-center px-3 py-1 border-b border-border/20 text-[7px] font-black font-mono text-neutral-500 uppercase">
          <span className="w-40 shrink-0">Pair</span>
          <span className="w-16 text-right">Spread</span>
          <span className="w-14 text-right">1D Chg</span>
          <span className="flex-1 text-right">Direction</span>
        </div>

        {crossSpreads.map((spread, idx) => {
          const isWidening = spread.change1d > 0;
          const isTightening = spread.change1d < 0;

          return (
            <div
              key={spread.label}
              className={`flex items-center px-3 py-1.5 border-b border-border/10 hover:bg-lime-400/[0.02] ${
                idx % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <div className="w-40 shrink-0">
                <div className="text-[8px] font-mono font-bold text-white">{spread.label}</div>
                {spread.curveA && spread.curveB && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="w-1 h-1"
                      style={{ backgroundColor: CURVE_COLORS[spread.curveA] ?? '#a3e635' }}
                    />
                    <span className="text-[6px] font-mono text-neutral-600">
                      {spread.curveA} vs {spread.curveB}
                    </span>
                  </div>
                )}
              </div>
              <div className="w-16 text-right">
                <span className="text-[10px] font-mono font-black text-lime-300">
                  {fmtBps(spread.value)}bp
                </span>
              </div>
              <div className="w-14 text-right">
                <span className={`text-[8px] font-mono ${changeColor(spread.change1d)}`}>
                  {fmtBps(spread.change1d)}
                </span>
              </div>
              <div className="flex-1 text-right">
                {isWidening && (
                  <span className="text-[7px] font-mono text-red-400">
                    WIDENING
                  </span>
                )}
                {isTightening && (
                  <span className="text-[7px] font-mono text-emerald-400">
                    TIGHTENING
                  </span>
                )}
                {!isWidening && !isTightening && (
                  <span className="text-[7px] font-mono text-neutral-600">
                    UNCHANGED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1.5 text-[7px] font-mono text-neutral-600 text-right border-t border-border/20">
        {tr(t, 'termUpdated', 'Updated')}: {new Date(data.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
