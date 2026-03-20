import { useState, useMemo } from 'react';
import {
  useVolSurface,
  type VolSurfaceData,
  type SurfacePoint,
} from '../../api/hooks/use-vol-surface';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// ── Translation helper ──

// ── Color helpers ──

function ivToHeatColor(iv: number, minIv: number, maxIv: number): string {
  if (maxIv <= minIv) return 'rgba(147,51,234,0.3)';
  const p = Math.min(1, Math.max(0, (iv - minIv) / (maxIv - minIv)));
  // Blue (low) -> purple (mid) -> red (high)
  if (p < 0.33) {
    const t = p / 0.33;
    const r = Math.round(59 + (147 - 59) * t);
    const g = Math.round(130 + (51 - 130) * t);
    const b = Math.round(246 + (234 - 246) * t);
    return `rgb(${r},${g},${b})`;
  }
  if (p < 0.66) {
    const t = (p - 0.33) / 0.33;
    const r = Math.round(147 + (234 - 147) * t);
    const g = Math.round(51 + (88 - 51) * t);
    const b = Math.round(234 + (74 - 234) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (p - 0.66) / 0.34;
  const r = Math.round(234 + (248 - 234) * t);
  const g = Math.round(88 + (113 - 88) * t);
  const b = Math.round(74 + (113 - 74) * t);
  return `rgb(${r},${g},${b})`;
}

function greekColor(v: number, isPositive: boolean): string {
  const abs = Math.abs(v);
  if (abs < 0.001) return 'text-neutral-500';
  if (isPositive) return v > 0 ? 'text-emerald-400' : 'text-red-400';
  return v > 0 ? 'text-red-400' : 'text-emerald-400';
}

// ── Expiry bar colors ──

const EXPIRY_COLORS: Record<string, string> = {
  '7d': '#f87171',
  '14d': '#fb923c',
  '30d': '#facc15',
  '60d': '#34d399',
  '90d': '#22d3ee',
  '180d': '#818cf8',
  '365d': '#e879f9',
};

// ── Constants ──

const UNDERLYINGS = ['SPY', 'QQQ', 'IWM', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];
const EXPIRIES = ['7d', '14d', '30d', '60d', '90d', '180d', '365d'];
const MONEYNESS_LABELS: Record<number, string> = {
  0.80: '80%', 0.85: '85%', 0.90: '90%', 0.95: '95%',
  1.00: 'ATM', 1.05: '105%', 1.10: '110%', 1.15: '115%', 1.20: '120%',
};

type ViewTab = 'surface' | 'smile' | 'greeks';

// ── Main Panel ──

export function VolSurfacePanel() {
  const t = useT();
  const [selectedTicker, setSelectedTicker] = useState('SPY');
  const [activeView, setActiveView] = useState<ViewTab>('surface');
  const { data: response, isLoading, refetch } = useVolSurface();

  const surfaceData = useMemo(() => {
    if (!response) return null;
    return response.surfaces.find((s) => s.ticker === selectedTicker) ?? response.surfaces[0] ?? null;
  }, [response, selectedTicker]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr(t, 'panelVolSurface', 'VOL SURFACE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
          >
            {UNDERLYINGS.map((u) => (
              <option key={u} value={u} className="bg-black text-white">
                {u}
              </option>
            ))}
          </select>
          {surfaceData && (
            <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-[8px] font-mono font-bold text-purple-400">
              ATM {(surfaceData.atmIv * 100).toFixed(1)}%
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      {surfaceData && <SummaryRow data={surfaceData} t={t} />}

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['surface', tr(t, 'volSurface', 'Surface')],
            ['smile', tr(t, 'volSmile', 'Smile')],
            ['greeks', tr(t, 'volGreeks', 'Greeks')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveView(key as ViewTab)}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeView === key
                ? 'text-purple-400 border-b border-purple-400 bg-purple-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !response && (
          <div className="text-center py-8 text-purple-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!response && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'volNoData', 'No volatility surface data available')}
          </div>
        )}

        {surfaceData && (
          <>
            {activeView === 'surface' && <SurfaceHeatmap data={surfaceData} t={t} />}
            {activeView === 'smile' && <SmileView data={surfaceData} t={t} />}
            {activeView === 'greeks' && <GreeksView data={surfaceData} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Row ──

function SummaryRow({ data, t }: { data: VolSurfaceData; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-2 flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'volSpot', 'Spot')}
          </div>
          <div className="text-[14px] font-black font-mono text-white leading-none">
            {data.ticker}{' '}
            <span className="text-purple-400">${data.spotPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-2 py-1 bg-purple-500/10 border border-purple-500/20">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">ATM IV</div>
          <div className="text-[11px] font-mono font-black text-purple-400">
            {(data.atmIv * 100).toFixed(1)}%
          </div>
        </div>

        <div className="px-2 py-1 bg-white/[0.02] border border-border/20">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'volSkew25d', '25d Skew')}
          </div>
          <div className={`text-[11px] font-mono font-black ${data.skew25d > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.skew25d > 0 ? '+' : ''}{(data.skew25d * 100).toFixed(2)}%
          </div>
        </div>

        <div className="px-2 py-1 bg-white/[0.02] border border-border/20">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'volButterfly', 'Butterfly')}
          </div>
          <div className="text-[11px] font-mono font-black text-yellow-400">
            {(data.butterfly25d * 100).toFixed(2)}%
          </div>
        </div>

        <div className="px-2 py-1 bg-white/[0.02] border border-border/20">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">RV/IV</div>
          <div className={`text-[11px] font-mono font-black ${data.rvIvRatio > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data.rvIvRatio.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Surface Heatmap ──

function SurfaceHeatmap({ data, t }: { data: VolSurfaceData; t: TFn }) {
  const { grid, allIvs } = useMemo(() => {
    // Build grid: rows = moneyness (strikes), cols = expiries
    const moneynessLevels = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];
    const pointMap = new Map<string, SurfacePoint>();
    for (const pt of data.surface) {
      pointMap.set(`${pt.expiry}-${pt.moneyness.toFixed(2)}`, pt);
    }

    const ivs: number[] = [];
    const g: (SurfacePoint | null)[][] = [];
    for (const m of moneynessLevels) {
      const row: (SurfacePoint | null)[] = [];
      for (const exp of EXPIRIES) {
        const key = `${exp}-${m.toFixed(2)}`;
        const pt = pointMap.get(key) ?? null;
        row.push(pt);
        if (pt) ivs.push(pt.iv);
      }
      g.push(row);
    }
    return { grid: g, allIvs: ivs };
  }, [data]);

  const minIv = allIvs.length > 0 ? Math.min(...allIvs) : 0;
  const maxIv = allIvs.length > 0 ? Math.max(...allIvs) : 1;
  const moneynessLevels = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'volIVSurface', 'Implied Volatility Surface')} - {data.ticker}
      </div>

      {/* Heatmap table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-left py-1 px-1.5 border-b border-border/20">
                {tr(t, 'volStrike', 'Strike')}
              </th>
              {EXPIRIES.map((exp) => (
                <th
                  key={exp}
                  className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-center py-1 px-1 border-b border-border/20"
                >
                  {exp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => {
              const moneyness = moneynessLevels[ri];
              const isAtm = moneyness === 1.00;
              return (
                <tr
                  key={ri}
                  className={`hover:bg-purple-400/[0.02] transition-colors ${isAtm ? 'bg-purple-500/[0.04]' : ''}`}
                >
                  <td className={`text-[9px] font-mono py-1 px-1.5 border-b border-border/10 ${isAtm ? 'font-black text-purple-400' : 'text-neutral-400'}`}>
                    {MONEYNESS_LABELS[moneyness] ?? `${(moneyness * 100).toFixed(0)}%`}
                    <span className="text-neutral-600 ml-1">
                      ${row[0]?.strike?.toFixed(0) ?? '--'}
                    </span>
                  </td>
                  {row.map((pt, ci) => {
                    if (!pt) {
                      return (
                        <td
                          key={ci}
                          className="text-[9px] font-mono text-center py-1 px-1 border-b border-border/10 text-neutral-600"
                        >
                          --
                        </td>
                      );
                    }
                    const bgColor = ivToHeatColor(pt.iv, minIv, maxIv);
                    return (
                      <td
                        key={ci}
                        className="text-[9px] font-mono font-bold text-center py-1 px-1 border-b border-border/10"
                        style={{
                          backgroundColor: bgColor.replace('rgb', 'rgba').replace(')', ',0.2)'),
                          color: bgColor,
                        }}
                        title={`IV: ${(pt.iv * 100).toFixed(2)}% | Delta: ${pt.delta.toFixed(3)} | Strike: $${pt.strike.toFixed(2)}`}
                      >
                        {(pt.iv * 100).toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-1 mt-2 justify-center">
        <span className="text-[7px] font-mono text-neutral-500">
          {(minIv * 100).toFixed(0)}%
        </span>
        <div
          className="w-24 h-2"
          style={{
            background: `linear-gradient(to right, ${ivToHeatColor(minIv, minIv, maxIv)}, ${ivToHeatColor((minIv + maxIv) / 2, minIv, maxIv)}, ${ivToHeatColor(maxIv, minIv, maxIv)})`,
          }}
        />
        <span className="text-[7px] font-mono text-neutral-500">
          {(maxIv * 100).toFixed(0)}%
        </span>
      </div>

      {/* Term structure table */}
      <div className="mt-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1">
          {tr(t, 'volTermStructure', 'Term Structure')}
        </div>
        <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] py-0.5 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
          <span>{tr(t, 'volExpiry', 'Expiry')}</span>
          <span className="text-right">ATM IV</span>
          <span className="text-right">{tr(t, 'volSkew', 'Skew')}</span>
          <span className="text-right">{tr(t, 'volBfly', 'Bfly')}</span>
        </div>
        {data.termStructure.map((ts, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] py-1 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono text-white">{ts.expiry}</span>
            <span className="text-[9px] font-mono font-bold text-purple-400 text-right">
              {(ts.atmIv * 100).toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono text-right ${ts.skew > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {ts.skew > 0 ? '+' : ''}{(ts.skew * 100).toFixed(2)}
            </span>
            <span className="text-[9px] font-mono text-yellow-400 text-right">
              {(ts.butterfly * 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Smile View ──

function SmileView({ data, t }: { data: VolSurfaceData; t: TFn }) {
  const smileData = useMemo(() => {
    // Group surface points by expiry
    const byExpiry = new Map<string, SurfacePoint[]>();
    for (const pt of data.surface) {
      if (!byExpiry.has(pt.expiry)) byExpiry.set(pt.expiry, []);
      byExpiry.get(pt.expiry)!.push(pt);
    }
    return byExpiry;
  }, [data]);

  // Find IV range across all points
  const allIvs = data.surface.map((p) => p.iv);
  const minIv = Math.min(...allIvs);
  const maxIv = Math.max(...allIvs);
  const ivRange = maxIv - minIv || 0.01;

  const moneynessLevels = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'volSmileDynamics', 'Volatility Smile Dynamics')} - {data.ticker}
      </div>

      {/* Bar chart per expiry */}
      {EXPIRIES.map((exp) => {
        const points = smileData.get(exp);
        if (!points || points.length === 0) return null;
        const color = EXPIRY_COLORS[exp] ?? '#a78bfa';
        const atmPt = points.find((p) => p.moneyness === 1.00);
        const atmIv = atmPt ? atmPt.iv : 0;

        return (
          <div key={exp} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2" style={{ backgroundColor: color }} />
                <span className="text-[8px] font-mono font-bold text-white uppercase">{exp}</span>
              </div>
              <span className="text-[8px] font-mono text-neutral-500">
                ATM: <span style={{ color }}>{(atmIv * 100).toFixed(1)}%</span>
              </span>
            </div>
            <div className="flex items-end gap-[2px] h-[40px]">
              {moneynessLevels.map((m) => {
                const pt = points.find((p) => Math.abs(p.moneyness - m) < 0.005);
                if (!pt) return <div key={m} className="flex-1" />;
                const barHeight = ((pt.iv - minIv) / ivRange) * 100;
                const isAtm = m === 1.00;
                return (
                  <div
                    key={m}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${MONEYNESS_LABELS[m] ?? m}: IV ${(pt.iv * 100).toFixed(2)}%`}
                  >
                    <div
                      className="w-full transition-all"
                      style={{
                        height: `${Math.max(barHeight, 3)}%`,
                        backgroundColor: isAtm ? color : `${color}88`,
                        border: isAtm ? `1px solid ${color}` : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-[2px]">
              {moneynessLevels.map((m) => (
                <div
                  key={m}
                  className={`flex-1 text-center text-[6px] font-mono ${m === 1.00 ? 'text-purple-400 font-bold' : 'text-neutral-600'}`}
                >
                  {m === 1.00 ? 'ATM' : `${(m * 100).toFixed(0)}%`}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Smile metrics */}
      <div className="mt-3 border-t border-border/20 pt-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1">
          {tr(t, 'volSmileMetrics', 'Smile Metrics')} (30d)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: tr(t, 'volSkewSlope', 'Skew Slope'),
              value: data.smileMetrics.skewSlope.toFixed(4),
              color: data.smileMetrics.skewSlope < 0 ? 'text-red-400' : 'text-emerald-400',
            },
            {
              label: tr(t, 'volConvexity', 'Convexity'),
              value: (data.smileMetrics.convexity * 100).toFixed(2) + '%',
              color: 'text-yellow-400',
            },
            {
              label: tr(t, 'volPutCallSkew', 'Put/Call Skew'),
              value: (data.smileMetrics.putCallSkew * 100).toFixed(2) + '%',
              color: data.smileMetrics.putCallSkew > 0 ? 'text-red-400' : 'text-emerald-400',
            },
            {
              label: tr(t, 'volWingSlope', 'Wing Slope'),
              value: (data.smileMetrics.wingSlope * 100).toFixed(2) + '%',
              color: 'text-purple-400',
            },
          ].map((m) => (
            <div key={m.label} className="px-2 py-1.5 bg-white/[0.02] border border-border/10">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {m.label}
              </div>
              <div className={`text-[11px] font-mono font-black ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Greeks View ──

function GreeksView({ data, t }: { data: VolSurfaceData; t: TFn }) {
  const [selectedGreek, setSelectedGreek] = useState<'delta' | 'gamma' | 'vega' | 'theta'>('delta');
  const moneynessLevels = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];

  const greekGrid = useMemo(() => {
    const pointMap = new Map<string, SurfacePoint>();
    for (const pt of data.surface) {
      pointMap.set(`${pt.expiry}-${pt.moneyness.toFixed(2)}`, pt);
    }

    const g: (SurfacePoint | null)[][] = [];
    for (const m of moneynessLevels) {
      const row: (SurfacePoint | null)[] = [];
      for (const exp of EXPIRIES) {
        const key = `${exp}-${m.toFixed(2)}`;
        row.push(pointMap.get(key) ?? null);
      }
      g.push(row);
    }
    return g;
  }, [data]);

  const getGreekValue = (pt: SurfacePoint): number => {
    switch (selectedGreek) {
      case 'delta': return pt.delta;
      case 'gamma': return pt.gamma;
      case 'vega': return pt.vega;
      case 'theta': return pt.theta;
    }
  };

  const formatGreek = (val: number): string => {
    switch (selectedGreek) {
      case 'delta': return val.toFixed(3);
      case 'gamma': return val.toFixed(4);
      case 'vega': return val.toFixed(3);
      case 'theta': return val.toFixed(3);
    }
  };

  const isPositiveGood = selectedGreek === 'delta' || selectedGreek === 'gamma' || selectedGreek === 'vega';

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'volGreeksAnalysis', 'Greeks Analysis')} - {data.ticker}
        </div>
        <div className="flex gap-1">
          {(['delta', 'gamma', 'vega', 'theta'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGreek(g)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase border transition-colors ${
                selectedGreek === g
                  ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                  : 'text-neutral-500 border-border/20 hover:border-border/40'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Greeks grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-left py-1 px-1.5 border-b border-border/20">
                {tr(t, 'volStrike', 'Strike')}
              </th>
              {EXPIRIES.map((exp) => (
                <th
                  key={exp}
                  className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider text-center py-1 px-1 border-b border-border/20"
                >
                  {exp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {greekGrid.map((row, ri) => {
              const moneyness = moneynessLevels[ri];
              const isAtm = moneyness === 1.00;
              return (
                <tr
                  key={ri}
                  className={`hover:bg-purple-400/[0.02] transition-colors ${isAtm ? 'bg-purple-500/[0.04]' : ''}`}
                >
                  <td className={`text-[9px] font-mono py-1 px-1.5 border-b border-border/10 ${isAtm ? 'font-black text-purple-400' : 'text-neutral-400'}`}>
                    {MONEYNESS_LABELS[moneyness] ?? `${(moneyness * 100).toFixed(0)}%`}
                    <span className="text-neutral-600 ml-1">
                      ${row[0]?.strike?.toFixed(0) ?? '--'}
                    </span>
                  </td>
                  {row.map((pt, ci) => {
                    if (!pt) {
                      return (
                        <td
                          key={ci}
                          className="text-[9px] font-mono text-center py-1 px-1 border-b border-border/10 text-neutral-600"
                        >
                          --
                        </td>
                      );
                    }
                    const val = getGreekValue(pt);
                    return (
                      <td
                        key={ci}
                        className={`text-[9px] font-mono font-bold text-center py-1 px-1 border-b border-border/10 ${greekColor(val, isPositiveGood)}`}
                        title={`${selectedGreek}: ${formatGreek(val)} | IV: ${(pt.iv * 100).toFixed(2)}%`}
                      >
                        {formatGreek(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* All Greeks summary for ATM 30d */}
      <div className="mt-3 border-t border-border/20 pt-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1">
          {tr(t, 'volAtm30dGreeks', 'ATM 30d Greeks Summary')}
        </div>
        {(() => {
          const atmPt = data.surface.find(
            (p) => p.expiry === '30d' && Math.abs(p.moneyness - 1.0) < 0.005,
          );
          if (!atmPt) {
            return (
              <div className="text-[9px] font-mono text-neutral-500">
                {tr(t, 'volNoAtmData', 'No ATM data')}
              </div>
            );
          }
          return (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Delta', value: atmPt.delta, fmt: atmPt.delta.toFixed(3), color: 'text-emerald-400' },
                { label: 'Gamma', value: atmPt.gamma, fmt: atmPt.gamma.toFixed(4), color: 'text-cyan-400' },
                { label: 'Vega', value: atmPt.vega, fmt: atmPt.vega.toFixed(3), color: 'text-purple-400' },
                { label: 'Theta', value: atmPt.theta, fmt: atmPt.theta.toFixed(3), color: 'text-red-400' },
              ].map((g) => (
                <div key={g.label} className="px-2 py-1.5 bg-white/[0.02] border border-border/10">
                  <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                    {g.label}
                  </div>
                  <div className={`text-[11px] font-mono font-black ${g.color}`}>
                    {g.fmt}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Greeks explanation */}
      <div className="mt-2 px-1">
        <div className="text-[7px] font-mono text-neutral-600 leading-relaxed">
          {selectedGreek === 'delta' && tr(t, 'volDeltaDesc', 'Delta: Rate of change of option price relative to underlying. Calls: 0 to 1, Puts: -1 to 0.')}
          {selectedGreek === 'gamma' && tr(t, 'volGammaDesc', 'Gamma: Rate of change of delta. Highest at ATM, decreases for OTM/ITM options.')}
          {selectedGreek === 'vega' && tr(t, 'volVegaDesc', 'Vega: Sensitivity to implied volatility changes. Higher for longer-dated and ATM options.')}
          {selectedGreek === 'theta' && tr(t, 'volThetaDesc', 'Theta: Time decay per day. Negative for long options, accelerates near expiry.')}
        </div>
      </div>
    </div>
  );
}
