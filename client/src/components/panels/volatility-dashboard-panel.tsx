import { useState } from 'react';
import { useVolatilityDashboard } from '../../api/hooks/use-volatility-dashboard';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Tab type ──

type TabKey = 'VIX' | 'TERM' | 'SKEW' | 'RVIV' | 'CROSS';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'VIX', label: 'VIX' },
  { key: 'TERM', label: 'TERM STRUCTURE' },
  { key: 'SKEW', label: 'SKEW' },
  { key: 'RVIV', label: 'REALIZED VS IMPLIED' },
  { key: 'CROSS', label: 'CROSS-ASSET' },
];

// ── Color / format helpers ──

function pctColor(pct: number): string {
  if (pct >= 80) return 'text-red-400';
  if (pct >= 60) return 'text-yellow-400';
  if (pct >= 40) return 'text-neutral-400';
  return 'text-emerald-400';
}

function pctBarColor(pct: number): string {
  if (pct >= 80) return 'bg-red-400';
  if (pct >= 60) return 'bg-yellow-400';
  if (pct >= 40) return 'bg-neutral-500';
  return 'bg-emerald-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function fmtChange(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function regimeBadge(regime: string): { text: string; cls: string } {
  const upper = regime.toUpperCase();
  switch (upper) {
    case 'LOW':
      return { text: 'LOW VOL', cls: 'text-emerald-400 bg-emerald-400/10' };
    case 'NORMAL':
      return { text: 'NORMAL', cls: 'text-neutral-400 bg-neutral-400/10' };
    case 'ELEVATED':
      return { text: 'ELEVATED', cls: 'text-yellow-400 bg-yellow-400/10' };
    case 'HIGH':
      return { text: 'HIGH VOL', cls: 'text-red-400 bg-red-400/10' };
    case 'CRISIS':
      return { text: 'CRISIS', cls: 'text-red-400 bg-red-400/20' };
    default:
      return { text: upper, cls: 'text-neutral-400 bg-neutral-400/10' };
  }
}

function signalBadge(signal: string): { text: string; cls: string } {
  const upper = signal.toUpperCase();
  switch (upper) {
    case 'STEEP':
      return { text: 'STEEP', cls: 'text-red-400 bg-red-400/10' };
    case 'FLAT':
      return { text: 'FLAT', cls: 'text-neutral-400 bg-neutral-400/10' };
    case 'INVERTED':
      return { text: 'INVERTED', cls: 'text-emerald-400 bg-emerald-400/10' };
    default:
      return { text: upper, cls: 'text-neutral-400 bg-neutral-400/10' };
  }
}

function richCheapBadge(label: string): { text: string; cls: string } {
  const upper = label.toUpperCase();
  switch (upper) {
    case 'RICH':
      return { text: 'RICH', cls: 'text-red-400 bg-red-400/10' };
    case 'CHEAP':
      return { text: 'CHEAP', cls: 'text-emerald-400 bg-emerald-400/10' };
    case 'FAIR':
      return { text: 'FAIR', cls: 'text-neutral-400 bg-neutral-400/10' };
    default:
      return { text: upper, cls: 'text-neutral-400 bg-neutral-400/10' };
  }
}

// ── Main Panel ──

export function VolatilityDashboardPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useVolatilityDashboard();
  const [activeTab, setActiveTab] = useState<TabKey>('VIX');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'vdTitle', 'Volatility Dashboard')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[7px] font-mono font-bold uppercase px-2 py-0.5 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-red-400 bg-red-400/15'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING VOL DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8">
            <div className="text-red-400/60 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono uppercase text-red-400 border border-red-400/30 px-2 py-0.5 hover:bg-red-400/[0.02] transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {data && activeTab === 'VIX' && <VixTab data={data} t={t} />}
        {data && activeTab === 'TERM' && <TermStructureTab data={data} t={t} />}
        {data && activeTab === 'SKEW' && <SkewTab data={data} t={t} />}
        {data && activeTab === 'RVIV' && <RealizedVsImpliedTab data={data} t={t} />}
        {data && activeTab === 'CROSS' && <CrossAssetTab data={data} t={t} />}

        {/* Vol Events */}
        {data && <VolEventsSection data={data} t={t} />}
      </div>
    </div>
  );
}

// ── Tab 1: VIX ──

function VixTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const vix = data.vix ?? {};
  const spot = vix.spot ?? 0;
  const dailyChange = vix.dailyChange ?? 0;
  const dailyChangePct = vix.dailyChangePct ?? 0;
  const weeklyChange = vix.weeklyChange ?? 0;
  const weeklyChangePct = vix.weeklyChangePct ?? 0;
  const percentile = vix.percentile ?? 0;
  const regime = vix.regime ?? 'NORMAL';
  const levels = vix.levels ?? {};
  const m1 = levels['1M'] ?? levels.m1 ?? 0;
  const m3 = levels['3M'] ?? levels.m3 ?? 0;
  const m6 = levels['6M'] ?? levels.m6 ?? 0;
  const y1 = levels['1Y'] ?? levels.y1 ?? 0;
  const badge = regimeBadge(regime);

  return (
    <div>
      {/* Large VIX Spot Display */}
      <div className="px-3 py-3 border-b border-border/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
              CBOE VIX INDEX
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[32px] font-black font-mono text-white leading-none tabular-nums">
                {spot.toFixed(2)}
              </span>
              <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${badge.cls}`}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>

        {/* Daily / Weekly Change */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="border border-border/20 px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors">
            <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
              DAILY CHG
            </div>
            <div className={`text-[11px] font-mono font-black tabular-nums mt-0.5 ${changeColor(dailyChange)}`}>
              {fmtChange(dailyChange)} ({fmtChange(dailyChangePct)}%)
            </div>
          </div>
          <div className="border border-border/20 px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors">
            <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
              WEEKLY CHG
            </div>
            <div className={`text-[11px] font-mono font-black tabular-nums mt-0.5 ${changeColor(weeklyChange)}`}>
              {fmtChange(weeklyChange)} ({fmtChange(weeklyChangePct)}%)
            </div>
          </div>
        </div>

        {/* Percentile Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
              252D PERCENTILE
            </span>
            <span className={`text-[9px] font-mono font-black tabular-nums ${pctColor(percentile)}`}>
              {percentile}%
            </span>
          </div>
          <div className="h-2 bg-white/[0.03] overflow-hidden">
            <div
              className={`h-full transition-all ${pctBarColor(percentile)}`}
              style={{ width: `${Math.min(percentile, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIX Term Levels */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
          VIX FUTURES LEVELS
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: '1M', value: m1 },
            { label: '3M', value: m3 },
            { label: '6M', value: m6 },
            { label: '1Y', value: y1 },
          ].map((item: any) => (
            <div
              key={item.label}
              className="border border-border/20 px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors"
            >
              <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {item.label}
              </div>
              <div className="text-[11px] font-mono font-black text-white tabular-nums mt-0.5">
                {item.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Term Structure ──

function TermStructureTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const termStructure = data.termStructure ?? {};
  const points = termStructure.points ?? [];
  const shape = termStructure.shape ?? 'CONTANGO';

  return (
    <div>
      {/* Shape indicator */}
      <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TERM STRUCTURE
        </div>
        <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${
          shape === 'CONTANGO' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {shape}
        </span>
      </div>

      {/* Tenor points table */}
      <div className="border-b border-border/20">
        <div className="grid grid-cols-[1fr_60px_52px_60px] px-3 py-1 border-b border-border/10">
          {['TENOR', 'IV', 'CHG', 'SPREAD'].map((h: any) => (
            <span key={h} className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {h}
            </span>
          ))}
        </div>
        {points.map((pt: any, idx: any) => {
          const isContango = idx < points.length - 1 && (points[idx + 1]?.impliedVol ?? 0) > (pt.impliedVol ?? 0);
          return (
            <div
              key={pt.tenor ?? idx}
              className="grid grid-cols-[1fr_60px_52px_60px] px-3 py-1 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white">
                {pt.tenor ?? '-'}
              </span>
              <span className="text-[9px] font-mono tabular-nums text-white">
                {(pt.impliedVol ?? 0).toFixed(2)}
              </span>
              <span className={`text-[9px] font-mono font-bold tabular-nums ${changeColor(pt.change ?? 0)}`}>
                {fmtChange(pt.change ?? 0)}
              </span>
              <span className="text-[9px] font-mono tabular-nums">
                {isContango ? (
                  <span className="text-emerald-400">CONTANGO</span>
                ) : (
                  <span className="text-red-400">BACKWDN</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Text-based curve visualization */}
      {points.length > 1 && (
        <div className="px-3 py-2 border-b border-border/20">
          <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
            CURVE SHAPE
          </div>
          <CurveVisualization points={points} />
        </div>
      )}
    </div>
  );
}

function CurveVisualization({ points }: { points: any[] }) {
  const values = points.map((p: any) => p.impliedVol ?? 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const barMax = 40;

  return (
    <div className="space-y-0.5">
      {points.map((pt: any, idx: any) => {
        const normalized = ((pt.impliedVol ?? 0) - minVal) / range;
        const barWidth = Math.max(Math.round(normalized * barMax), 1);
        const bar = '\u2588'.repeat(barWidth);
        return (
          <div key={pt.tenor ?? idx} className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral-500 w-8 text-right shrink-0">
              {pt.tenor ?? '-'}
            </span>
            <span className="text-[8px] font-mono text-red-400 leading-none">
              {bar}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 tabular-nums">
              {(pt.impliedVol ?? 0).toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 3: Skew ──

function SkewTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const skewData = data.skew ?? [];

  return (
    <div>
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          VOLATILITY SKEW
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_44px_44px_56px] px-3 py-1 border-b border-border/10">
        {['ASSET', '25D SKEW', '10D SKEW', 'CHG', 'PCTL', 'SIGNAL'].map((h: any) => (
          <span key={h} className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {skewData.map((row: any) => {
        const sig = signalBadge(row.signal ?? 'FLAT');
        return (
          <div
            key={row.asset ?? row.symbol}
            className="grid grid-cols-[1fr_52px_52px_44px_44px_56px] px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">
              {row.asset ?? row.symbol ?? '-'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-white">
              {(row.skew25d ?? 0).toFixed(2)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-white">
              {(row.skew10d ?? 0).toFixed(2)}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums ${changeColor(row.change ?? 0)}`}>
              {fmtChange(row.change ?? 0, 1)}
            </span>
            <span className={`text-[9px] font-mono font-bold tabular-nums ${pctColor(row.percentile ?? 0)}`}>
              {row.percentile ?? 0}%
            </span>
            <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 ${sig.cls}`}>
              {sig.text}
            </span>
          </div>
        );
      })}

      {skewData.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO SKEW DATA
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Realized vs Implied ──

function RealizedVsImpliedTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rviv = data.realizedVsImplied ?? [];

  return (
    <div>
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          REALIZED VS IMPLIED VOLATILITY
        </div>
      </div>

      {rviv.map((item: any) => {
        const iv = item.impliedVol ?? 0;
        const rv = item.realizedVol ?? 0;
        const vrp = item.volRiskPremium ?? (iv - rv);
        const vrpPctl = item.vrpPercentile ?? 0;
        const badge = richCheapBadge(item.badge ?? (vrp > 0 ? 'RICH' : 'CHEAP'));
        const maxVol = Math.max(iv, rv, 1);

        return (
          <div
            key={item.asset ?? item.symbol}
            className="px-3 py-2 border-b border-border/20 hover:bg-red-400/[0.02] transition-colors"
          >
            {/* Asset name + badge */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold text-white">
                {item.asset ?? item.symbol ?? '-'}
              </span>
              <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${badge.cls}`}>
                {badge.text}
              </span>
            </div>

            {/* IV bar */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[7px] font-mono text-neutral-500 w-8 text-right shrink-0">IV</span>
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${Math.max((iv / maxVol) * 100, 2)}%`, opacity: 0.7 }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-white w-10 text-right shrink-0 tabular-nums">
                {iv.toFixed(1)}
              </span>
            </div>

            {/* RV bar */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[7px] font-mono text-neutral-500 w-8 text-right shrink-0">RV</span>
              <div className="flex-1 h-2 bg-white/[0.03] overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: `${Math.max((rv / maxVol) * 100, 2)}%`, opacity: 0.7 }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-white w-10 text-right shrink-0 tabular-nums">
                {rv.toFixed(1)}
              </span>
            </div>

            {/* VRP + percentile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral-500">VRP:</span>
                <span className={`text-[9px] font-mono font-bold tabular-nums ${changeColor(vrp)}`}>
                  {fmtChange(vrp, 1)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-mono text-neutral-500">PCTL:</span>
                <div className="w-16 h-1.5 bg-white/[0.03] overflow-hidden">
                  <div
                    className={`h-full transition-all ${pctBarColor(vrpPctl)}`}
                    style={{ width: `${Math.min(vrpPctl, 100)}%` }}
                  />
                </div>
                <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(vrpPctl)}`}>
                  {vrpPctl}%
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {rviv.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO RV/IV DATA
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Cross-Asset ──

function CrossAssetTab({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const crossAsset = data.crossAsset ?? [];

  return (
    <div>
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CROSS-ASSET VOLATILITY
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_80px_48px_48px] px-3 py-1 border-b border-border/10">
        {['ASSET', 'VOL', '30D MA', 'PERCENTILE', 'REGIME', 'VIX COR'].map((h: any) => (
          <span key={h} className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {crossAsset.map((row: any) => {
        const vol = row.currentVol ?? 0;
        const ma30 = row.ma30d ?? 0;
        const percentile = row.percentile ?? 0;
        const regime = regimeBadge(row.regime ?? 'NORMAL');
        const vixCorr = row.vixCorrelation ?? 0;

        return (
          <div
            key={row.asset ?? row.symbol}
            className="grid grid-cols-[1fr_48px_48px_80px_48px_48px] px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white">
              {row.asset ?? row.symbol ?? '-'}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-white">
              {vol.toFixed(1)}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-neutral-400">
              {ma30.toFixed(1)}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden">
                <div
                  className={`h-full transition-all ${pctBarColor(percentile)}`}
                  style={{ width: `${Math.min(percentile, 100)}%` }}
                />
              </div>
              <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(percentile)}`}>
                {percentile}%
              </span>
            </div>
            <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 ${regime.cls}`}>
              {regime.text}
            </span>
            <span className={`text-[9px] font-mono tabular-nums ${vixCorr >= 0.5 ? 'text-red-400' : vixCorr >= 0.2 ? 'text-yellow-400' : 'text-neutral-400'}`}>
              {vixCorr.toFixed(2)}
            </span>
          </div>
        );
      })}

      {crossAsset.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          NO CROSS-ASSET DATA
        </div>
      )}
    </div>
  );
}

// ── Vol Events Section ──

function VolEventsSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const events = data.volEvents ?? [];
  if (events.length === 0) return null;

  return (
    <div className="border-t border-border/20">
      <div className="px-3 py-2 border-b border-border/10">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          UPCOMING VOL CATALYSTS
        </div>
      </div>
      {events.map((evt: any, idx: any) => (
        <div
          key={evt.name ?? idx}
          className="flex items-center justify-between px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className={`w-1 h-1 ${
              (evt.impact ?? '').toUpperCase() === 'HIGH' ? 'bg-red-400' :
              (evt.impact ?? '').toUpperCase() === 'MEDIUM' ? 'bg-yellow-400' :
              'bg-neutral-500'
            }`} />
            <span className="text-[9px] font-mono text-white">
              {evt.name ?? evt.event ?? '-'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral-500">
              {evt.date ?? '-'}
            </span>
            <span className={`text-[7px] font-black font-mono uppercase px-1 py-0.5 ${
              (evt.impact ?? '').toUpperCase() === 'HIGH' ? 'text-red-400 bg-red-400/10' :
              (evt.impact ?? '').toUpperCase() === 'MEDIUM' ? 'text-yellow-400 bg-yellow-400/10' :
              'text-neutral-400 bg-neutral-400/10'
            }`}>
              {(evt.impact ?? 'LOW').toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
