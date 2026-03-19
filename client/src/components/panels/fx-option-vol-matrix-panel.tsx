import { useState, useMemo } from 'react';
import { useFxOptionVolMatrix } from '../../api/hooks/use-fx-option-vol-matrix';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Constants --

const ACCENT = '#c084fc'; // purple-400

const DELTAS = ['10DP', '25DP', 'ATM', '25DC', '10DC'];
const TENORS = ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y', '2Y'];
const G10_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP'];

type Tab = 'matrix' | 'surface' | 'changes' | 'skew';

// -- Formatting helpers --

function fmtVol(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function fmtChange(v: unknown, decimals = 2): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}`;
}

function changeColor(v: number): string {
  if (v > 0) return 'text-red-400';
  if (v < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

// -- Heat-map color: blue(low) -> yellow(mid) -> red(high) --

function volHeatColor(vol: number, minVol: number, maxVol: number): string {
  if (maxVol <= minVol) return 'rgba(192,132,252,0.15)';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  // blue -> cyan -> yellow -> orange -> red
  if (p < 0.25) {
    const t = p / 0.25;
    const r = Math.round(59 + (34 - 59) * t);
    const g = Math.round(130 + (211 - 130) * t);
    const b = Math.round(246 + (238 - 246) * t);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.5) {
    const t = (p - 0.25) / 0.25;
    const r = Math.round(34 + (250 - 34) * t);
    const g = Math.round(211 + (204 - 211) * t);
    const b = Math.round(238 + (21 - 238) * t);
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    const r = Math.round(250 + (249 - 250) * t);
    const g = Math.round(204 + (115 - 204) * t);
    const b = Math.round(21 + (22 - 21) * t);
    return `rgba(${r},${g},${b},0.4)`;
  }
  const t = (p - 0.75) / 0.25;
  const r = Math.round(249 + (239 - 249) * t);
  const g = Math.round(115 + (68 - 115) * t);
  const b = Math.round(22 + (68 - 22) * t);
  return `rgba(${r},${g},${b},0.45)`;
}

function volTextColor(vol: number, minVol: number, maxVol: number): string {
  if (maxVol <= minVol) return 'rgba(255,255,255,0.8)';
  const p = Math.min(1, Math.max(0, (vol - minVol) / (maxVol - minVol)));
  if (p < 0.25) return '#93c5fd'; // blue-300
  if (p < 0.5) return '#fde68a'; // amber-200
  if (p < 0.75) return '#fdba74'; // orange-300
  return '#fca5a5'; // red-300
}

// -- Skew direction badge --

function skewBadge(dir: string): { label: string; cls: string } {
  const d = (dir || '').toLowerCase();
  if (d.includes('put') || d.includes('bearish'))
    return { label: 'PUT SKEW', cls: 'bg-red-500/15 text-red-400 border border-red-500/20' };
  if (d.includes('call') || d.includes('bullish'))
    return { label: 'CALL SKEW', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
  return { label: 'NEUTRAL', cls: 'bg-white/5 text-neutral-400 border border-white/10' };
}

// -- Percentile bar color --

function pctBarColor(pct: number): string {
  if (pct >= 75) return 'bg-red-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-emerald-500';
  return 'bg-blue-500';
}

// -- Compute min/max vol from a grid structure --

function computeVolRange(grid: any, rows: string[], cols: string[]): { minVol: number; maxVol: number } {
  let mn = Infinity;
  let mx = -Infinity;
  rows.forEach((row: string) => {
    const r = grid?.[row];
    if (!r) return;
    cols.forEach((col: string) => {
      const v = r[col];
      if (typeof v === 'number' && !isNaN(v)) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    });
  });
  return { minVol: mn === Infinity ? 5 : mn, maxVol: mx === -Infinity ? 25 : mx };
}

// -- Main Panel --

export function FxOptionVolMatrixPanel() {
  const t = useT();
  const { data: rawData, isLoading, error, refetch } = useFxOptionVolMatrix();
  const [tab, setTab] = useState<Tab>('matrix');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = rawData as any;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-purple-400/60 uppercase tracking-widest animate-pulse">
          {tr(t, 'fxovm.loading', 'LOADING FX OPTION VOL MATRIX...')}
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-purple-400 border border-purple-400/30 hover:bg-purple-400/10 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'matrix', label: 'MATRIX' },
    { key: 'surface', label: 'SURFACE' },
    { key: 'changes', label: 'CHANGES' },
    { key: 'skew', label: 'SKEW' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr(t, 'fxovm.title', 'FX Option Vol Matrix')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      <SummaryBar data={d} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === tb.key
                ? 'border-purple-400/40 text-purple-400 bg-purple-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'matrix' ? <MatrixTab data={d} /> : null}
        {tab === 'surface' ? <SurfaceTab data={d} /> : null}
        {tab === 'changes' ? <ChangesTab data={d} /> : null}
        {tab === 'skew' ? <SkewTab data={d} /> : null}
      </div>
    </div>
  );
}

// -- Summary Bar --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const s = data?.summary;
  if (!s) return null;

  const cells = [
    { label: 'FX VOL INDEX', value: fmtVol(s.fxVolIndex, 2), accent: true },
    { label: 'AVG ATM 1M', value: fmtVol(s.avgAtm1m, 2), accent: false },
    { label: 'MOST ACTIVE', value: String(s.mostActive || '-'), accent: true },
    { label: 'HIGHEST VOL', value: String(s.highestVol || '-'), accent: false },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-border/20 shrink-0">
      {cells.map((c) => (
        <div key={c.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
            {c.label}
          </div>
          <div
            className="text-[9px] font-mono font-bold text-white/80"
            style={c.accent ? { color: ACCENT } : undefined}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- MATRIX Tab: full vol matrix per currency pair --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatrixTab({ data }: { data: any }) {
  const matrix = data?.matrix;
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const pairs: string[] = data?.pairs || G10_PAIRS;

  const grid = useMemo(() => {
    if (!matrix) return null;
    return matrix[selectedPair] || matrix[Object.keys(matrix)[0]] || null;
  }, [matrix, selectedPair]);

  const { minVol, maxVol } = useMemo(() => {
    if (!grid) return { minVol: 5, maxVol: 25 };
    return computeVolRange(grid, TENORS, DELTAS);
  }, [grid]);

  return (
    <div className="p-2">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-1 mb-2">
        {pairs.map((pair: string) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              selectedPair === pair
                ? 'border-purple-400/40 text-purple-400 bg-purple-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Vol matrix grid */}
      {grid ? (
        <table className="w-full text-[9px] font-mono">
          <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1.5 text-left text-[7px] font-black">TENOR</th>
              {DELTAS.map((delta: string) => (
                <th key={delta} className="px-2 py-1.5 text-right text-[7px] font-black">
                  {delta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TENORS.map((tenor: string) => {
              const row = grid[tenor];
              return (
                <tr
                  key={tenor}
                  className="border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
                >
                  <td className="px-2 py-1.5 font-bold text-purple-400">{tenor}</td>
                  {DELTAS.map((delta: string) => {
                    const val = row?.[delta];
                    const isNum = typeof val === 'number' && !isNaN(val);
                    const bg = isNum ? volHeatColor(val, minVol, maxVol) : 'transparent';
                    const color = isNum ? volTextColor(val, minVol, maxVol) : undefined;
                    return (
                      <td
                        key={delta}
                        className="px-2 py-1.5 text-right font-bold"
                        style={{ backgroundColor: bg, color }}
                      >
                        {fmtVol(val, 2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No matrix data for {selectedPair}
        </div>
      )}

      {/* Heat-map legend */}
      <div className="flex items-center gap-2 mt-2 px-2">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Low Vol</span>
        <div className="flex h-2 flex-1 max-w-[120px]">
          <div className="flex-1" style={{ background: 'rgba(59,130,246,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(34,211,238,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(250,204,21,0.35)' }} />
          <div className="flex-1" style={{ background: 'rgba(249,115,22,0.4)' }} />
          <div className="flex-1" style={{ background: 'rgba(239,68,68,0.45)' }} />
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">High Vol</span>
      </div>
    </div>
  );
}

// -- SURFACE Tab: ATM term structure across pairs --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SurfaceTab({ data }: { data: any }) {
  const surface = data?.surface;
  if (!surface?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No surface data available
      </div>
    );
  }

  // Compute global min/max for heat coloring across the entire surface
  const { minVol, maxVol } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    surface.forEach((row: any) => {
      TENORS.forEach((tenor: string) => {
        const v = row?.vols?.[tenor];
        if (typeof v === 'number' && !isNaN(v)) {
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      });
    });
    return { minVol: mn === Infinity ? 5 : mn, maxVol: mx === -Infinity ? 25 : mx };
  }, [surface]);

  return (
    <div className="p-2">
      <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
        ATM Implied Volatility Term Structure
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
            {TENORS.map((tenor: string) => (
              <th key={tenor} className="px-1.5 py-1.5 text-right text-[7px] font-black">
                {tenor}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {surface.map((row: any) => (
            <tr
              key={String(row.pair)}
              className="border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5 font-bold text-purple-400">
                {String(row.pair)}
              </td>
              {TENORS.map((tenor: string) => {
                const val = row?.vols?.[tenor];
                const isNum = typeof val === 'number' && !isNaN(val);
                const bg = isNum ? volHeatColor(val, minVol, maxVol) : 'transparent';
                const color = isNum ? volTextColor(val, minVol, maxVol) : undefined;
                return (
                  <td
                    key={tenor}
                    className="px-1.5 py-1.5 text-right font-bold"
                    style={{ backgroundColor: bg, color }}
                  >
                    {fmtVol(val, 1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bar visualization for each pair */}
      <div className="mt-3 space-y-1">
        <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
          ATM 1M Vol Comparison
        </div>
        {surface.map((row: any) => {
          const vol1m = row?.vols?.['1M'];
          const pct = typeof vol1m === 'number' ? Math.min((vol1m / maxVol) * 100, 100) : 0;
          return (
            <div key={String(row.pair)} className="flex items-center gap-2">
              <span className="text-[8px] font-mono font-bold text-purple-400 w-14">
                {String(row.pair)}
              </span>
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full bg-purple-400/40"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-white/60 w-10 text-right">
                {fmtVol(vol1m, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- CHANGES Tab: 1D/1W/1M vol changes --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChangesTab({ data }: { data: any }) {
  const changes = data?.changes;
  if (!changes?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No changes data available
      </div>
    );
  }

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
        <tr>
          <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">ATM 1M</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1D CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1W CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">1M CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black">3M CHG</th>
          <th className="px-2 py-1.5 text-right text-[7px] font-black w-28">52W PCTL</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((row: any, idx: number) => {
          const pctl = row.percentile52w ?? 0;
          return (
            <tr
              key={`${String(row.pair)}-${idx}`}
              className="border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5 font-bold text-purple-400">
                {String(row.pair)}
              </td>
              <td className="px-2 py-1.5 text-right font-bold text-white/80">
                {fmtVol(row.atm1m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change1d ?? 0)}`}>
                {fmtChange(row.change1d, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change1w ?? 0)}`}>
                {fmtChange(row.change1w, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change1m ?? 0)}`}>
                {fmtChange(row.change1m, 2)}
              </td>
              <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.change3m ?? 0)}`}>
                {fmtChange(row.change3m, 2)}
              </td>
              <td className="px-2 py-1.5 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-14 h-2 bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full ${pctBarColor(pctl)}`}
                      style={{ width: `${Math.min(Math.max(pctl, 2), 100)}%`, opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[8px] text-neutral-500 w-7 text-right">
                    {String(pctl)}%
                  </span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// -- SKEW Tab: risk reversal and skew analysis --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SkewTab({ data }: { data: any }) {
  const skew = data?.skew;
  if (!skew?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No skew data available
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Risk reversal table */}
      <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-2">
        25-Delta Risk Reversal & Butterfly
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
          <tr>
            <th className="px-2 py-1.5 text-left text-[7px] font-black">PAIR</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">25D RR 1M</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">25D RR 3M</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">25D BF 1M</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">25D BF 3M</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">1D CHG</th>
            <th className="px-2 py-1.5 text-right text-[7px] font-black">DIRECTION</th>
          </tr>
        </thead>
        <tbody>
          {skew.map((row: any, idx: number) => {
            const badge = skewBadge(row.direction || '');
            return (
              <tr
                key={`${String(row.pair)}-${idx}`}
                className="border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1.5 font-bold text-purple-400">
                  {String(row.pair)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr25d1m ?? 0)}`}>
                  {fmtVol(row.rr25d1m, 2)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.rr25d3m ?? 0)}`}>
                  {fmtVol(row.rr25d3m, 2)}
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-white/70">
                  {fmtVol(row.bf25d1m, 2)}
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-white/70">
                  {fmtVol(row.bf25d3m, 2)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${changeColor(row.dailyChange ?? 0)}`}>
                  {fmtChange(row.dailyChange, 2)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Skew visual bars */}
      <div className="mt-3">
        <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
          25D Risk Reversal 1M (Visual)
        </div>
        <div className="space-y-1">
          {skew.map((row: any, idx: number) => {
            const rr = row.rr25d1m ?? 0;
            const absRr = Math.abs(rr);
            const maxRr = Math.max(
              ...skew.map((s: any) => Math.abs(s.rr25d1m ?? 0)),
              0.1,
            );
            const barWidth = (absRr / maxRr) * 50;
            const isNeg = rr < 0;

            return (
              <div
                key={`bar-${String(row.pair)}-${idx}`}
                className="flex items-center gap-2 hover:bg-purple-400/[0.02] px-2 py-0.5 transition-colors"
              >
                <span className="text-[8px] font-mono font-bold text-purple-400 w-14">
                  {String(row.pair)}
                </span>
                <div className="flex-1 flex items-center h-3">
                  {/* Center line */}
                  <div className="flex-1 flex justify-end">
                    {isNeg ? (
                      <div
                        className="h-2 bg-red-500/50"
                        style={{ width: `${barWidth}%` }}
                      />
                    ) : null}
                  </div>
                  <div className="w-px h-3 bg-neutral-600 shrink-0" />
                  <div className="flex-1">
                    {!isNeg ? (
                      <div
                        className="h-2 bg-emerald-500/50"
                        style={{ width: `${barWidth}%` }}
                      />
                    ) : null}
                  </div>
                </div>
                <span
                  className={`text-[8px] font-mono font-bold w-12 text-right ${changeColor(rr)}`}
                >
                  {fmtChange(rr, 2)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-2 mt-0.5">
            <span className="w-14" />
            <div className="flex-1 flex items-center text-[6px] font-mono text-neutral-600">
              <span className="flex-1 text-right pr-1">PUT SKEW</span>
              <span className="w-px" />
              <span className="flex-1 text-left pl-1">CALL SKEW</span>
            </div>
            <span className="w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
