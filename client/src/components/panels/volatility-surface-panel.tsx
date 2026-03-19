import { useState, useMemo, useCallback } from 'react';
import { useVolatilitySurface } from '../../api/hooks/use-volatility-surface';
import { useT } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// ── Translation helper ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Constants ──

const UNDERLYINGS = ['SPX', 'NDX', 'RUT', 'VIX', 'AAPL', 'TSLA'] as const;
type Underlying = (typeof UNDERLYINGS)[number];

const VOL_INDICES = [
  'VIX', 'VIX9D', 'VIX3M', 'VIX6M', 'VXN', 'RVX', 'MOVE', 'SKEW', 'VVIX',
] as const;

// ── Color / format helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function fmtChange(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function ivHeatColor(iv: number, minIv: number, maxIv: number): string {
  if (maxIv <= minIv) return 'rgba(34,197,94,0.15)';
  const p = Math.min(1, Math.max(0, (iv - minIv) / (maxIv - minIv)));
  // green (low) -> yellow (mid) -> red (high)
  if (p < 0.5) {
    const t = p * 2;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 + (179 - 197) * t);
    const b = Math.round(94 + (8 - 94) * t);
    return `rgba(${r},${g},${b},${0.08 + p * 0.22})`;
  }
  const t = (p - 0.5) * 2;
  const r = Math.round(234 + (239 - 234) * t);
  const g = Math.round(179 + (68 - 179) * t);
  const b = Math.round(8 + (68 - 8) * t);
  return `rgba(${r},${g},${b},${0.19 + (p - 0.5) * 0.22})`;
}

function ivTextColor(iv: number, minIv: number, maxIv: number): string {
  if (maxIv <= minIv) return 'text-neutral-300';
  const p = Math.min(1, Math.max(0, (iv - minIv) / (maxIv - minIv)));
  if (p < 0.33) return 'text-emerald-400';
  if (p < 0.66) return 'text-yellow-400';
  return 'text-red-400';
}

function spreadColor(n: number): string {
  if (n > 2) return 'text-red-400';
  if (n > 0) return 'text-yellow-400';
  if (n < -2) return 'text-emerald-400';
  if (n < 0) return 'text-cyan-400';
  return 'text-neutral-400';
}

// ── Safe accessor helpers ──

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

function obj(v: unknown): Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, any>)
    : {};
}

// ── Main Panel ──

export function VolatilitySurfacePanel() {
  const tr = useTr();
  const { data, isLoading, error, refetch } = useVolatilitySurface();
  const [selectedUnderlying, setSelectedUnderlying] = useState<Underlying>('SPX');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr('volSurfTitle', 'Volatility Surface')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedUnderlying}
            onChange={(e) => setSelectedUnderlying(e.target.value as Underlying)}
            className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
          >
            {UNDERLYINGS.map((u) => (
              <option key={u} value={u} className="bg-black text-white">
                {u}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-purple-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING VOLATILITY SURFACE...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8">
            <div className="text-red-400/60 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD VOL SURFACE
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono uppercase text-purple-400 border border-purple-400/30 px-2 py-0.5 hover:bg-purple-400/[0.02] transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {data && (
          <>
            <VolIndicesBar data={data} tr={tr} />
            <SummaryMetrics data={data} selectedUnderlying={selectedUnderlying} tr={tr} />
            <SurfaceGrid data={data} selectedUnderlying={selectedUnderlying} tr={tr} />
            <SkewTable data={data} selectedUnderlying={selectedUnderlying} tr={tr} />
            <TermStructureTable data={data} selectedUnderlying={selectedUnderlying} tr={tr} />
            <GreeksSnapshot data={data} selectedUnderlying={selectedUnderlying} tr={tr} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Volatility Indices Bar ──

function VolIndicesBar({
  data,
  tr,
}: {
  data: any;
  tr: (key: string, fallback: string) => string;
}) {
  const indices = obj(data.volIndices ?? data.volatilityIndices);

  return (
    <div className="border-b border-border/20 bg-[#050505]">
      <div className="flex items-center gap-0 px-1 py-1 overflow-x-auto no-scrollbar">
        {VOL_INDICES.map((idx) => {
          const item = obj(indices[idx] ?? indices[idx.toLowerCase()]);
          const level = num(item.level ?? item.value ?? item.last);
          const change = num(item.change ?? item.dailyChange);
          return (
            <div
              key={idx}
              className="flex-shrink-0 px-2 py-0.5 border-r border-border/10 last:border-r-0"
            >
              <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                {idx}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[9px] font-mono font-black text-white tabular-nums">
                  {level > 0 ? level.toFixed(2) : '--'}
                </span>
                {level > 0 && (
                  <span
                    className={`text-[7px] font-mono font-bold tabular-nums ${changeColor(change)}`}
                  >
                    {fmtChange(change)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 2: Summary Metrics ──

function SummaryMetrics({
  data,
  selectedUnderlying,
  tr,
}: {
  data: any;
  selectedUnderlying: Underlying;
  tr: (key: string, fallback: string) => string;
}) {
  const summary =
    obj(data.summary ?? data.summaryMetrics) ??
    obj(
      arr(data.underlyings ?? data.surfaces).find(
        (u: any) => (u.symbol ?? u.ticker ?? u.underlying) === selectedUnderlying,
      )?.summary,
    );

  const avgIv = num(summary.avgIv ?? summary.spxAvgIv ?? summary.atmIv);
  const ivRank = num(summary.ivRank ?? summary.rank);
  const hvIvSpread = num(summary.hvIvSpread ?? summary.spread);
  const putCallSkew = num(summary.putCallSkew ?? summary.pcSkew);
  const termSlope = num(summary.termStructureSlope ?? summary.termSlope);

  const metrics = [
    {
      label: `${selectedUnderlying} AVG IV`,
      value: fmtPct(avgIv),
      color: 'text-purple-400',
    },
    {
      label: 'IV RANK',
      value: fmtPct(ivRank),
      color:
        ivRank > 70 ? 'text-red-400' : ivRank > 30 ? 'text-yellow-400' : 'text-emerald-400',
    },
    {
      label: 'HV-IV SPREAD',
      value: fmtChange(hvIvSpread, 1),
      color: spreadColor(hvIvSpread),
    },
    {
      label: 'PUT/CALL SKEW',
      value: fmtPct(putCallSkew),
      color: putCallSkew > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'TERM SLOPE',
      value: fmtChange(termSlope, 2),
      color: termSlope > 0 ? 'text-emerald-400' : 'text-red-400',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="flex items-center gap-0 px-1 py-1 overflow-x-auto no-scrollbar">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex-shrink-0 px-2 py-0.5 border-r border-border/10 last:border-r-0"
          >
            <div className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              {m.label}
            </div>
            <div className={`text-[10px] font-mono font-black tabular-nums ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3: Volatility Surface Grid ──

function SurfaceGrid({
  data,
  selectedUnderlying,
  tr,
}: {
  data: any;
  selectedUnderlying: Underlying;
  tr: (key: string, fallback: string) => string;
}) {
  const underlyingData = useMemo(() => {
    const surfaces = arr(data.underlyings ?? data.surfaces ?? data.surfaceGrid);
    return (
      surfaces.find(
        (u: any) => (u.symbol ?? u.ticker ?? u.underlying) === selectedUnderlying,
      ) ?? surfaces[0] ?? {}
    );
  }, [data, selectedUnderlying]);

  const { strikes, expirations, grid, minIv, maxIv } = useMemo(() => {
    const raw = obj(underlyingData);
    const gridData = arr(raw.grid ?? raw.surface ?? raw.data);
    const strikeList = arr(raw.strikes ?? raw.strikeList);
    const expList = arr(raw.expirations ?? raw.expiries ?? raw.tenors);

    // If grid is a flat array of objects, build a 2D matrix
    if (gridData.length > 0 && typeof gridData[0] === 'object' && !Array.isArray(gridData[0])) {
      const strikeSet = new Set<number>();
      const expSet = new Set<string>();
      const pointMap = new Map<string, number>();
      let min = Infinity;
      let max = -Infinity;

      for (const pt of gridData) {
        const strike = num(pt.strike ?? pt.moneyness);
        const exp = String(pt.expiration ?? pt.expiry ?? pt.tenor ?? '');
        const iv = num(pt.iv ?? pt.impliedVol ?? pt.volatility);
        if (strike && exp && iv > 0) {
          strikeSet.add(strike);
          expSet.add(exp);
          pointMap.set(`${strike}-${exp}`, iv);
          if (iv < min) min = iv;
          if (iv > max) max = iv;
        }
      }

      const sortedStrikes = Array.from(strikeSet).sort((a, b) => a - b);
      const sortedExps = Array.from(expSet).sort();

      const matrix: (number | null)[][] = sortedStrikes.map((s) =>
        sortedExps.map((e) => pointMap.get(`${s}-${e}`) ?? null),
      );

      return {
        strikes: sortedStrikes,
        expirations: sortedExps,
        grid: matrix,
        minIv: min === Infinity ? 0 : min,
        maxIv: max === -Infinity ? 100 : max,
      };
    }

    // If grid is already a 2D array
    if (gridData.length > 0 && Array.isArray(gridData[0])) {
      let min = Infinity;
      let max = -Infinity;
      for (const row of gridData) {
        for (const cell of row) {
          const v = num(cell);
          if (v > 0) {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      }
      return {
        strikes: strikeList.length > 0 ? strikeList : gridData.map((_: any, i: number) => i),
        expirations: expList.length > 0 ? expList : (gridData[0] ?? []).map((_: any, i: number) => `T${i + 1}`),
        grid: gridData as (number | null)[][],
        minIv: min === Infinity ? 0 : min,
        maxIv: max === -Infinity ? 100 : max,
      };
    }

    return { strikes: [], expirations: [], grid: [], minIv: 0, maxIv: 100 };
  }, [underlyingData]);

  if (strikes.length === 0 || expirations.length === 0) {
    return (
      <div className="px-3 py-3 border-b border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
          {tr('volSurfGrid', 'Volatility Surface Grid')} - {selectedUnderlying}
        </div>
        <div className="text-center py-4 text-neutral-600 text-[9px] font-mono uppercase">
          NO SURFACE DATA FOR {selectedUnderlying}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
        {tr('volSurfGrid', 'IV Surface')} - {selectedUnderlying}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-left py-0.5 px-1 border-b border-border/20 sticky left-0 bg-black z-10">
                STRIKE
              </th>
              {expirations.map((exp: any) => (
                <th
                  key={exp}
                  className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-center py-0.5 px-1 border-b border-border/20 whitespace-nowrap"
                >
                  {String(exp)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row: (number | null)[], ri: number) => (
              <tr key={ri} className="hover:bg-purple-400/[0.02] transition-colors">
                <td className="text-[9px] font-mono font-bold text-neutral-400 py-0.5 px-1 border-b border-border/10 sticky left-0 bg-black z-10 tabular-nums">
                  {typeof strikes[ri] === 'number'
                    ? (strikes[ri] as number).toFixed(0)
                    : strikes[ri]}
                </td>
                {row.map((iv: number | null, ci: number) => {
                  if (iv === null || iv === 0) {
                    return (
                      <td
                        key={ci}
                        className="text-[9px] font-mono text-center py-0.5 px-1 border-b border-border/10 text-neutral-700"
                      >
                        --
                      </td>
                    );
                  }
                  return (
                    <td
                      key={ci}
                      className="text-[9px] font-mono font-bold text-center py-0.5 px-1 border-b border-border/10 tabular-nums"
                      style={{ backgroundColor: ivHeatColor(iv, minIv, maxIv) }}
                      title={`IV: ${fmtPct(iv)} | Strike: ${strikes[ri]} | Exp: ${expirations[ci]}`}
                    >
                      <span className={ivTextColor(iv, minIv, maxIv)}>{iv.toFixed(1)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-1 mt-1.5 justify-center">
        <span className="text-[7px] font-mono text-emerald-400">
          {fmtPct(minIv)}
        </span>
        <div
          className="w-20 h-1.5"
          style={{
            background: `linear-gradient(to right, ${ivHeatColor(minIv, minIv, maxIv)}, ${ivHeatColor((minIv + maxIv) / 2, minIv, maxIv)}, ${ivHeatColor(maxIv, minIv, maxIv)})`,
          }}
        />
        <span className="text-[7px] font-mono text-red-400">
          {fmtPct(maxIv)}
        </span>
      </div>
    </div>
  );
}

// ── Section 4: Skew Table ──

function SkewTable({
  data,
  selectedUnderlying,
  tr,
}: {
  data: any;
  selectedUnderlying: Underlying;
  tr: (key: string, fallback: string) => string;
}) {
  const skewData = useMemo(() => {
    const surfaces = arr(data.underlyings ?? data.surfaces ?? data.skew);
    const und =
      surfaces.find(
        (u: any) => (u.symbol ?? u.ticker ?? u.underlying) === selectedUnderlying,
      ) ?? surfaces[0];
    return arr(und?.skew ?? und?.skewData ?? data.skew ?? data.skewData);
  }, [data, selectedUnderlying]);

  if (skewData.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('volSkewAnalysis', 'Skew Analysis')} - {selectedUnderlying}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_52px] px-3 py-0.5 border-b border-border/10">
        {['TENOR', '25D SKEW', '10D SKEW', 'BFLY', 'RR'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {skewData.map((row: any, idx: number) => {
        const tenor = row.tenor ?? row.expiry ?? row.expiration ?? '-';
        const skew25d = num(row.skew25d ?? row['25dSkew'] ?? row.skew25);
        const skew10d = num(row.skew10d ?? row['10dSkew'] ?? row.skew10);
        const butterfly = num(row.butterfly ?? row.bfly ?? row.butterfly25d);
        const rr = num(row.riskReversal ?? row.rr ?? row.reversal);

        return (
          <div
            key={tenor + idx}
            className="grid grid-cols-[1fr_52px_52px_52px_52px] px-3 py-1 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">{tenor}</span>
            <span
              className={`text-[9px] font-mono tabular-nums ${skew25d > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {fmtPct(skew25d)}
            </span>
            <span
              className={`text-[9px] font-mono tabular-nums ${skew10d > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {fmtPct(skew10d)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-yellow-400">
              {fmtPct(butterfly)}
            </span>
            <span
              className={`text-[9px] font-mono tabular-nums ${rr > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {fmtChange(rr, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 5: Term Structure Table ──

function TermStructureTable({
  data,
  selectedUnderlying,
  tr,
}: {
  data: any;
  selectedUnderlying: Underlying;
  tr: (key: string, fallback: string) => string;
}) {
  const termData = useMemo(() => {
    const surfaces = arr(data.underlyings ?? data.surfaces ?? data.termStructure);
    const und =
      surfaces.find(
        (u: any) => (u.symbol ?? u.ticker ?? u.underlying) === selectedUnderlying,
      ) ?? surfaces[0];
    return arr(
      und?.termStructure ?? und?.termData ?? data.termStructure ?? data.termData,
    );
  }, [data, selectedUnderlying]);

  if (termData.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('volTermStruct', 'Term Structure')} - {selectedUnderlying}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] px-3 py-0.5 border-b border-border/10">
        {['TENOR', 'ATM IV', '25D PUT', '25D CALL', '10D PUT', '10D CALL'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {termData.map((row: any, idx: number) => {
        const tenor = row.tenor ?? row.expiry ?? '-';
        const atmIv = num(row.atmIv ?? row.atm ?? row.atmVol);
        const put25 = num(row.put25d ?? row['25dPut'] ?? row.put25);
        const call25 = num(row.call25d ?? row['25dCall'] ?? row.call25);
        const put10 = num(row.put10d ?? row['10dPut'] ?? row.put10);
        const call10 = num(row.call10d ?? row['10dCall'] ?? row.call10);

        return (
          <div
            key={tenor + idx}
            className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] px-3 py-1 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">{tenor}</span>
            <span className="text-[9px] font-mono font-bold tabular-nums text-purple-400">
              {fmtPct(atmIv)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-red-400">
              {put25 > 0 ? fmtPct(put25) : '--'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-emerald-400">
              {call25 > 0 ? fmtPct(call25) : '--'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-red-400/70">
              {put10 > 0 ? fmtPct(put10) : '--'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-emerald-400/70">
              {call10 > 0 ? fmtPct(call10) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 6: Greeks Snapshot ──

function GreeksSnapshot({
  data,
  selectedUnderlying,
  tr,
}: {
  data: any;
  selectedUnderlying: Underlying;
  tr: (key: string, fallback: string) => string;
}) {
  const greeksData = useMemo(() => {
    const surfaces = arr(data.underlyings ?? data.surfaces ?? data.greeks);
    const und =
      surfaces.find(
        (u: any) => (u.symbol ?? u.ticker ?? u.underlying) === selectedUnderlying,
      ) ?? surfaces[0];
    return arr(und?.greeks ?? und?.greeksSnapshot ?? data.greeks ?? data.greeksSnapshot);
  }, [data, selectedUnderlying]);

  if (greeksData.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr('volGreeks', 'Greeks Snapshot')} - {selectedUnderlying}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px] px-3 py-0.5 border-b border-border/10">
        {['STRIKE', 'DELTA', 'GAMMA', 'VEGA', 'THETA'].map((h) => (
          <span
            key={h}
            className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {greeksData.map((row: any, idx: number) => {
        const strike =
          row.strike ?? row.moneyness ?? row.label ?? '-';
        const delta = num(row.delta);
        const gamma = num(row.gamma);
        const vega = num(row.vega);
        const theta = num(row.theta);

        return (
          <div
            key={String(strike) + idx}
            className="grid grid-cols-[1fr_48px_48px_48px_48px] px-3 py-1 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white tabular-nums">
              {typeof strike === 'number' ? strike.toFixed(0) : strike}
            </span>
            <span
              className={`text-[9px] font-mono tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {delta.toFixed(3)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-cyan-400">
              {gamma.toFixed(4)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-purple-400">
              {vega.toFixed(3)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-red-400">
              {theta.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
