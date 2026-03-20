import { useState, useMemo, useCallback } from 'react';
import {
  useVolatilityCone,
  type VolatilityConeResponse,
  type ConeAsset,
  type ConeWindow,
} from '../../api/hooks/use-volatility-cone';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Triangle } from 'lucide-react';

// ── Translation helper ──

// ── Colors ──

const SKY = '#38bdf8';

function pctColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-orange-400';
  if (pct >= 50) return 'text-yellow-400';
  if (pct >= 25) return 'text-emerald-400';
  return 'text-sky-400';
}

function pctDotFill(pct: number): string {
  if (pct >= 90) return '#f87171';
  if (pct >= 75) return '#fb923c';
  if (pct >= 50) return '#facc15';
  return '#34d399';
}

function regimeBadge(regime: ConeAsset['regime']): { cls: string } {
  switch (regime) {
    case 'Extreme':
      return { cls: 'bg-red-500/10 border-red-500/30 text-red-400' };
    case 'High':
      return { cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400' };
    case 'Elevated':
      return { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' };
    case 'Normal':
      return { cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    case 'Low':
      return { cls: 'bg-sky-500/10 border-sky-500/30 text-sky-400' };
  }
}

function heatBg(pct: number): string {
  if (pct >= 90) return 'bg-red-500/20';
  if (pct >= 75) return 'bg-orange-500/15';
  if (pct >= 60) return 'bg-yellow-500/10';
  if (pct >= 40) return 'bg-yellow-500/5';
  if (pct >= 25) return 'bg-emerald-500/5';
  if (pct >= 10) return 'bg-sky-500/5';
  return 'bg-sky-500/10';
}

function heatText(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-orange-400';
  if (pct >= 60) return 'text-yellow-400';
  if (pct >= 40) return 'text-neutral-400';
  if (pct >= 25) return 'text-emerald-400';
  return 'text-sky-400';
}

// ── Main Panel ──

export function VolatilityConePanel() {
  const t = useT();
  const [selectedTicker, setSelectedTicker] = useState('SPY');
  const [activeView, setActiveView] = useState<'cone' | 'matrix' | 'regime'>('cone');
  const { data: response, isLoading, refetch } = useVolatilityCone();

  const assets = response?.data ?? [];
  const selectedAsset = useMemo(
    () => assets.find((a) => a.ticker === selectedTicker) ?? assets[0] ?? null,
    [assets, selectedTicker],
  );

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Triangle className="w-4 h-4 text-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'volConeTitle', 'VOLATILITY CONE')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Asset selector */}
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-white/[0.04] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono text-white uppercase outline-none focus:border-sky-500/40 appearance-none cursor-pointer"
          >
            {(assets.length > 0
              ? assets.map((a) => a.ticker)
              : ['SPY', 'QQQ', 'IWM', 'DIA', 'EEM', 'TLT', 'GLD', 'USO', 'FXE', 'VIX', 'AAPL', 'TSLA']
            ).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Regime badge */}
          {selectedAsset && (
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${regimeBadge(selectedAsset.regime).cls}`}>
              {selectedAsset.regime}
            </span>
          )}

          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {(
          [
            ['cone', tr(t, 'volConeCone', 'CONE')],
            ['matrix', tr(t, 'volConeMatrix', 'MATRIX')],
            ['regime', tr(t, 'volConeRegime', 'REGIME')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveView(key as 'cone' | 'matrix' | 'regime')}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeView === key
                ? 'text-sky-400 border-b border-sky-400 bg-sky-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && assets.length === 0 && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && assets.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'volConeNoData', 'No data available')}
          </div>
        )}

        {assets.length > 0 && (
          <>
            {activeView === 'cone' && selectedAsset && <ConeView asset={selectedAsset} t={t} />}
            {activeView === 'matrix' && <MatrixView assets={assets} t={t} />}
            {activeView === 'regime' && <RegimeView assets={assets} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── CONE View ──

function ConeView({ asset, t }: { asset: ConeAsset; t: TFn }) {
  const chartData = useMemo(() => {
    const windows = asset.windows;
    if (windows.length === 0) return null;

    // Find global min/max across all windows for consistent scaling
    let gMin = Infinity;
    let gMax = -Infinity;
    for (const w of windows) {
      if (w.min < gMin) gMin = w.min;
      if (w.max > gMax) gMax = w.max;
    }
    // Add padding
    gMin = Math.max(0, gMin - 2);
    gMax = gMax + 2;

    return { windows, gMin, gMax, range: gMax - gMin };
  }, [asset]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'volConeNoWindows', 'No window data')}
      </div>
    );
  }

  const { windows, gMin, gMax, range } = chartData;

  // Scale a vol value to percentage position (0-100) for the bar
  const toPos = (v: number): number => ((v - gMin) / range) * 100;

  return (
    <div className="px-3 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'volConeChart', 'Realized Volatility Cone')} - {asset.ticker}
        </div>
        <div className="flex items-center gap-3 text-[6px] font-mono text-neutral-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1.5 bg-sky-400/15 border border-sky-400/20" />
            <span>P10-P90</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1.5 bg-sky-400/30 border border-sky-400/30" />
            <span>P25-P75</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Current</span>
          </div>
        </div>
      </div>

      {/* Scale axis */}
      <div className="relative h-4 mb-1 ml-[52px]">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = gMin + frac * range;
          return (
            <span
              key={frac}
              className="absolute text-[7px] font-mono text-neutral-600 -translate-x-1/2"
              style={{ left: `${frac * 100}%` }}
            >
              {val.toFixed(0)}%
            </span>
          );
        })}
      </div>

      {/* Cone rows */}
      {windows.map((w) => (
        <ConeRow key={w.period} window={w} toPos={toPos} />
      ))}

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-px mt-4 bg-border/10">
        <MetricCell
          label={tr(t, 'volConeIV', 'Implied Vol')}
          value={`${asset.impliedVol.toFixed(1)}%`}
          cls="text-white"
        />
        <MetricCell
          label={tr(t, 'volConeSpread', 'RV-IV Spread')}
          value={`${asset.rvIvSpread > 0 ? '+' : ''}${asset.rvIvSpread.toFixed(1)}%`}
          cls={asset.rvIvSpread < 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <MetricCell
          label={tr(t, 'volConeRegimeLabel', 'Regime')}
          value={asset.regime}
          cls={regimeBadge(asset.regime).cls.split(' ').find((c) => c.startsWith('text-')) ?? 'text-white'}
        />
      </div>
    </div>
  );
}

function ConeRow({ window: w, toPos }: { window: ConeWindow; toPos: (v: number) => number }) {
  const minPos = toPos(w.min);
  const maxPos = toPos(w.max);
  const p10Pos = toPos(w.p10);
  const p90Pos = toPos(w.p90);
  const p25Pos = toPos(w.p25);
  const p75Pos = toPos(w.p75);
  const medianPos = toPos(w.median);
  const currentPos = toPos(w.current);

  return (
    <div className="flex items-center gap-0 mb-1 hover:bg-sky-400/[0.02] transition-colors group">
      {/* Period label */}
      <div className="w-[52px] shrink-0 text-[9px] font-mono font-bold text-sky-400 pr-2 text-right">
        {w.period}
      </div>

      {/* Bar area */}
      <div className="flex-1 relative h-5">
        {/* Full range line (min to max) */}
        <div
          className="absolute top-1/2 h-px bg-neutral-700 -translate-y-1/2"
          style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
        />

        {/* Min/Max whiskers */}
        <div
          className="absolute top-[25%] h-[50%] w-px bg-neutral-600"
          style={{ left: `${minPos}%` }}
        />
        <div
          className="absolute top-[25%] h-[50%] w-px bg-neutral-600"
          style={{ left: `${maxPos}%` }}
        />

        {/* P10-P90 band */}
        <div
          className="absolute top-[20%] h-[60%] bg-sky-400/10 border-y border-sky-400/15"
          style={{ left: `${p10Pos}%`, width: `${p90Pos - p10Pos}%` }}
        />

        {/* P25-P75 band */}
        <div
          className="absolute top-[10%] h-[80%] bg-sky-400/20 border border-sky-400/25"
          style={{ left: `${p25Pos}%`, width: `${p75Pos - p25Pos}%` }}
        />

        {/* Median line */}
        <div
          className="absolute top-[5%] h-[90%] w-px bg-neutral-500"
          style={{ left: `${medianPos}%` }}
        />

        {/* Current dot */}
        <div
          className="absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-black shadow-sm"
          style={{ left: `${currentPos}%`, backgroundColor: pctDotFill(w.percentileRank) }}
        />
      </div>

      {/* Current value + percentile */}
      <div className="w-[72px] shrink-0 text-right pl-1.5">
        <span className={`text-[9px] font-mono font-bold ${pctColor(w.percentileRank)}`}>
          {w.current.toFixed(1)}%
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-1">
          P{w.percentileRank}
        </span>
      </div>
    </div>
  );
}

function MetricCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="bg-black px-2 py-1.5">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-black font-mono leading-none mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── MATRIX View ──

function MatrixView({ assets, t }: { assets: ConeAsset[]; t: TFn }) {
  const periods = ['5d', '10d', '20d', '30d', '60d', '90d', '120d', '252d'];

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/20 bg-[#030303]">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
          {tr(t, 'volConeMatrixTitle', 'Percentile Rank Matrix')}
          <span className="text-[7px] font-normal text-neutral-700 ml-2">
            {tr(t, 'volConeMatrixSub', 'Current vol percentile vs history')}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap bg-[#030303]"
        style={{ gridTemplateColumns: `56px repeat(${periods.length}, 1fr)` }}
      >
        <span>{tr(t, 'volConeAsset', 'Asset')}</span>
        {periods.map((p) => (
          <span key={p} className="text-center">{p}</span>
        ))}
      </div>

      {/* Rows */}
      {assets.map((asset, idx) => (
        <MatrixRow key={asset.ticker} asset={asset} periods={periods} idx={idx} />
      ))}
    </div>
  );
}

function MatrixRow({ asset, periods, idx }: { asset: ConeAsset; periods: string[]; idx: number }) {
  const windowMap = useMemo(() => {
    const m = new Map<string, ConeWindow>();
    for (const w of asset.windows) m.set(w.period, w);
    return m;
  }, [asset.windows]);

  return (
    <div
      className="grid px-2 py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap"
      style={{ gridTemplateColumns: `56px repeat(${periods.length}, 1fr)` }}
    >
      <div className="flex items-center gap-1">
        <span className="text-sky-400 font-bold">{asset.ticker}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          asset.regime === 'Extreme' ? 'bg-red-400' :
          asset.regime === 'High' ? 'bg-orange-400' :
          asset.regime === 'Elevated' ? 'bg-yellow-400' :
          asset.regime === 'Normal' ? 'bg-emerald-400' :
          'bg-sky-400'
        }`} />
      </div>
      {periods.map((p) => {
        const w = windowMap.get(p);
        if (!w) return <span key={p} className="text-center text-neutral-700">--</span>;
        return (
          <span
            key={p}
            className={`text-center font-bold px-0.5 ${heatBg(w.percentileRank)} ${heatText(w.percentileRank)}`}
            title={`${asset.ticker} ${p}: ${w.current.toFixed(1)}% vol (P${w.percentileRank})`}
          >
            {w.percentileRank}
          </span>
        );
      })}
    </div>
  );
}

// ── REGIME View ──

function RegimeView({ assets, t }: { assets: ConeAsset[]; t: TFn }) {
  // Group by regime
  const groups = useMemo(() => {
    const regimeOrder: ConeAsset['regime'][] = ['Extreme', 'High', 'Elevated', 'Normal', 'Low'];
    const grouped = new Map<string, ConeAsset[]>();
    for (const r of regimeOrder) grouped.set(r, []);
    for (const a of assets) {
      const list = grouped.get(a.regime);
      if (list) list.push(a);
    }
    return regimeOrder.map((r) => ({ regime: r, assets: grouped.get(r) ?? [] })).filter((g) => g.assets.length > 0);
  }, [assets]);

  // Counts for distribution bar
  const total = assets.length;
  const regimeCounts = useMemo(() => {
    const counts: Record<string, number> = { Low: 0, Normal: 0, Elevated: 0, High: 0, Extreme: 0 };
    for (const a of assets) counts[a.regime] = (counts[a.regime] || 0) + 1;
    return counts;
  }, [assets]);

  return (
    <div className="px-3 py-3">
      {/* Distribution bar */}
      <div className="mb-4">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">
          {tr(t, 'volConeDistribution', 'Regime Distribution')}
        </div>
        <div className="flex h-3 overflow-hidden">
          {(['Low', 'Normal', 'Elevated', 'High', 'Extreme'] as const).map((r) => {
            const count = regimeCounts[r] || 0;
            if (count === 0) return null;
            const width = (count / total) * 100;
            const colors: Record<string, string> = {
              Low: 'bg-sky-500/60',
              Normal: 'bg-emerald-500/60',
              Elevated: 'bg-yellow-500/60',
              High: 'bg-orange-500/60',
              Extreme: 'bg-red-500/60',
            };
            return (
              <div
                key={r}
                className={`${colors[r]} flex items-center justify-center text-[6px] font-mono font-bold text-white/80`}
                style={{ width: `${width}%` }}
                title={`${r}: ${count}`}
              >
                {count > 0 && width > 8 ? `${r} (${count})` : count}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-[6px] font-mono text-neutral-700">
          <span>Low</span>
          <span>Extreme</span>
        </div>
      </div>

      {/* Asset cards grouped by regime */}
      {groups.map(({ regime, assets: groupAssets }) => (
        <div key={regime} className="mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${regimeBadge(regime).cls}`}>
              {regime}
            </span>
            <span className="text-[7px] font-mono text-neutral-700">
              {groupAssets.length} asset{groupAssets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border/10">
            {groupAssets.map((a) => (
              <RegimeCard key={a.ticker} asset={a} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RegimeCard({ asset, t }: { asset: ConeAsset; t: TFn }) {
  // Get the 20d window for primary display
  const w20 = asset.windows.find((w) => w.period === '20d');
  const w5 = asset.windows.find((w) => w.period === '5d');

  return (
    <div className="bg-black px-2.5 py-2 hover:bg-sky-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-black text-sky-400">{asset.ticker}</span>
          <span className="text-[7px] font-mono text-neutral-600 truncate max-w-[120px]">{asset.name}</span>
        </div>
        <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${regimeBadge(asset.regime).cls}`}>
          {asset.regime}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* 20d RV */}
        <div>
          <div className="text-[6px] font-mono text-neutral-700 uppercase">20d RV</div>
          <div className={`text-[10px] font-mono font-bold ${pctColor(w20?.percentileRank ?? 50)}`}>
            {w20 ? `${w20.current.toFixed(1)}%` : '--'}
          </div>
          <div className="text-[6px] font-mono text-neutral-600">
            P{w20?.percentileRank ?? '--'}
          </div>
        </div>

        {/* 5d RV */}
        <div>
          <div className="text-[6px] font-mono text-neutral-700 uppercase">5d RV</div>
          <div className={`text-[10px] font-mono font-bold ${pctColor(w5?.percentileRank ?? 50)}`}>
            {w5 ? `${w5.current.toFixed(1)}%` : '--'}
          </div>
          <div className="text-[6px] font-mono text-neutral-600">
            P{w5?.percentileRank ?? '--'}
          </div>
        </div>

        {/* IV */}
        <div>
          <div className="text-[6px] font-mono text-neutral-700 uppercase">
            {tr(t, 'volConeIVShort', 'IV')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {asset.impliedVol.toFixed(1)}%
          </div>
        </div>

        {/* RV-IV Spread */}
        <div>
          <div className="text-[6px] font-mono text-neutral-700 uppercase">
            {tr(t, 'volConeSpreadShort', 'RV-IV')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${asset.rvIvSpread < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {asset.rvIvSpread > 0 ? '+' : ''}{asset.rvIvSpread.toFixed(1)}
          </div>
          <div className="text-[6px] font-mono text-neutral-600">
            {asset.rvIvSpread < -3 ? 'CHEAP' : asset.rvIvSpread > 3 ? 'RICH' : 'FAIR'}
          </div>
        </div>
      </div>

      {/* Mini percentile bar across all windows */}
      <div className="flex gap-0.5 mt-2">
        {asset.windows.map((w) => (
          <div
            key={w.period}
            className={`flex-1 h-1 ${heatBg(w.percentileRank)}`}
            title={`${w.period}: P${w.percentileRank}`}
            style={{
              opacity: 0.4 + (w.percentileRank / 100) * 0.6,
              backgroundColor: pctDotFill(w.percentileRank),
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-0.5 text-[5px] font-mono text-neutral-800">
        <span>5d</span>
        <span>252d</span>
      </div>
    </div>
  );
}
