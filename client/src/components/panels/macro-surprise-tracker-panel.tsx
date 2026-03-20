import { useState } from 'react';
import { useMacroSurpriseTracker } from '../../api/hooks/use-macro-surprise-tracker';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const ACCENT = '#a78bfa'; // violet-400
const ACCENT_DIM = 'rgba(167,139,250,0.08)';

type Tab = 'index' | 'releases' | 'categories' | 'upcoming' | 'trend';

// ── Color Helpers ──

function surpriseColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function surpriseColorHex(val: number): string {
  if (val > 0) return '#4ade80';
  if (val < 0) return '#f87171';
  return '#737373';
}

function directionBadge(dir: string): { text: string; cls: string } {
  switch (dir) {
    case 'improving': return { text: 'IMPROVING', cls: 'text-emerald-400 bg-emerald-500/10' };
    case 'deteriorating': return { text: 'DETERIORATING', cls: 'text-red-400 bg-red-500/10' };
    default: return { text: 'STABLE', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function importanceBadge(level: string): { text: string; cls: string } {
  switch (level?.toUpperCase()) {
    case 'HIGH': return { text: 'HIGH', cls: 'text-red-400 bg-red-500/15' };
    case 'MED': case 'MEDIUM': return { text: 'MED', cls: 'text-yellow-400 bg-yellow-500/15' };
    default: return { text: 'LOW', cls: 'text-neutral-500 bg-neutral-500/10' };
  }
}

function impactBadge(impact: string): { text: string; cls: string } {
  switch (impact?.toUpperCase()) {
    case 'HIGH': return { text: 'HIGH', cls: 'text-red-400 bg-red-500/12' };
    case 'MED': case 'MEDIUM': return { text: 'MED', cls: 'text-yellow-400 bg-yellow-500/12' };
    default: return { text: 'LOW', cls: 'text-neutral-500 bg-neutral-500/10' };
  }
}

function trendBadgeStyle(trend: string): { text: string; cls: string } {
  switch (trend) {
    case 'up': case 'improving': return { text: 'UP', cls: 'text-emerald-400 bg-emerald-500/10' };
    case 'down': case 'deteriorating': return { text: 'DOWN', cls: 'text-red-400 bg-red-500/10' };
    default: return { text: 'FLAT', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function fmtSigned(n: number, decimals = 1): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

// ── Percentile Bar (inline SVG) ──

function PercentileBar({ value }: { value: number }) {
  const W = 48;
  const H = 6;
  const fillW = Math.max((value / 100) * W, 1);
  const color = value >= 60 ? '#4ade80' : value <= 40 ? '#f87171' : '#a78bfa';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block align-middle">
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" />
      <rect x={0} y={0} width={fillW} height={H} fill={color} opacity={0.6} />
    </svg>
  );
}

// ── Sparkline chars for Trend tab ──

function textSparkline(values: number[]): string {
  if (!values || values.length === 0) return '------------';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chars = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values.map((v: any) => {
    const idx = Math.round(((v - min) / range) * (chars.length - 1));
    return chars[Math.max(0, Math.min(idx, chars.length - 1))];
  }).join('');
}

// ── Index Tab ──

function IndexTab({ data }: { data: any }) {
  const regions = data?.regions || data?.indices || [];
  if (regions.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No regional index data
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Regional Surprise Indices
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_64px_56px_42px_42px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Region</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Index</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Direction</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Percentile</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1W</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1M</span>
      </div>

      {/* Rows */}
      {regions.map((r: any) => {
        const dir = directionBadge(r.direction || r.trend || 'stable');
        const val = r.value ?? r.index ?? 0;

        return (
          <div
            key={r.name || r.region}
            className="grid grid-cols-[1fr_52px_64px_56px_42px_42px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {r.name || r.region}
            </span>

            <span className={`text-[9px] font-mono font-black text-right tabular-nums ${surpriseColor(val)}`}>
              {fmtSigned(val)}
            </span>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${dir.cls}`}>
                {dir.text}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              <PercentileBar value={r.percentile ?? 50} />
              <span className="text-[6px] font-mono text-neutral-500 tabular-nums">
                {r.percentile ?? 50}
              </span>
            </div>

            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${surpriseColor(r.weekChange ?? r.change1w ?? 0)}`}>
              {fmtSigned(r.weekChange ?? r.change1w ?? 0)}
            </span>

            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${surpriseColor(r.monthChange ?? r.change1m ?? 0)}`}>
              {fmtSigned(r.monthChange ?? r.change1m ?? 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Releases Tab ──

function ReleasesTab({ data }: { data: any }) {
  const releases = data?.releases || data?.recent || [];
  if (releases.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No recent releases
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Recent Economic Releases
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_24px_1fr_44px_44px_44px_32px_36px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Date</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">CC</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Indicator</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Actual</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Fcst</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Surp</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Sigma</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Impact</span>
      </div>

      {/* Rows */}
      {releases.map((r: any, i: any) => {
        const surprise = r.surprise ?? (r.actual != null && r.forecast != null ? r.actual - r.forecast : 0);
        const beat = surprise > 0;
        const imp = impactBadge(r.impact || 'low');

        return (
          <div
            key={`${r.date}-${r.indicator}-${i}`}
            className="grid grid-cols-[48px_24px_1fr_44px_44px_44px_32px_36px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono text-neutral-500 tabular-nums truncate">
              {r.date ? String(r.date).slice(5) : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400">
              {r.flag || r.country || '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-200 font-bold truncate">
              {r.indicator || r.name || '--'}
            </span>

            <span className="text-[8px] font-mono font-black text-white text-right tabular-nums">
              {r.actual != null ? r.actual : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-500 text-right tabular-nums">
              {r.forecast != null ? r.forecast : '--'}
            </span>

            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${beat ? 'text-emerald-400' : surprise < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
              {surprise !== 0 ? fmtSigned(surprise, 2) : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {r.sigma != null ? r.sigma.toFixed(1) : '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${imp.cls}`}>
                {imp.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Categories Tab ──

function CategoriesTab({ data }: { data: any }) {
  const categories = data?.categories || [];
  if (categories.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No category data
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1.5 px-1">
        Surprise by Category
      </div>

      <div className="grid grid-cols-2 gap-1">
        {categories.map((cat: any) => {
          const avgSurprise = cat.avgSurprise ?? cat.surprise ?? 0;
          const beatRate = cat.beatRate ?? cat.beatPct ?? 50;
          const trend = trendBadgeStyle(cat.trend || 'flat');

          return (
            <div
              key={cat.name || cat.category}
              className="border border-border/20 px-2 py-1.5 bg-black/40 hover:bg-violet-400/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-mono font-black text-neutral-300 uppercase tracking-tight truncate">
                  {cat.name || cat.category}
                </span>
                <span className={`text-[5px] font-mono font-black uppercase px-1 py-[0.5px] ${trend.cls}`}>
                  {trend.text}
                </span>
              </div>

              {/* Avg Surprise */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Avg Surprise</span>
                <span className={`text-[8px] font-mono font-bold tabular-nums ${surpriseColor(avgSurprise)}`}>
                  {fmtSigned(avgSurprise, 2)}
                </span>
              </div>

              {/* Beat Rate Bar */}
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-mono text-neutral-600 uppercase shrink-0">Beat</span>
                <div className="flex-1 h-[5px] bg-white/[0.04] relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${Math.min(beatRate, 100)}%`,
                      backgroundColor: beatRate >= 50 ? '#4ade80' : '#f87171',
                      opacity: 0.5,
                    }}
                  />
                </div>
                <span className={`text-[7px] font-mono font-bold tabular-nums shrink-0 ${beatRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {beatRate.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Upcoming Tab ──

function UpcomingTab({ data }: { data: any }) {
  const upcoming = data?.upcoming || [];
  if (upcoming.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No upcoming releases
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Upcoming Releases
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_36px_24px_1fr_44px_44px_40px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Date</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Time</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">CC</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Indicator</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Fcst</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Prev</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Imp</span>
      </div>

      {/* Rows */}
      {upcoming.map((r: any, i: any) => {
        const imp = importanceBadge(r.importance || r.impact || 'low');

        return (
          <div
            key={`${r.date}-${r.indicator}-${i}`}
            className="grid grid-cols-[48px_36px_24px_1fr_44px_44px_40px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono text-neutral-500 tabular-nums truncate">
              {r.date ? String(r.date).slice(5) : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400 tabular-nums">
              {r.time || '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400">
              {r.flag || r.country || '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-200 font-bold truncate">
              {r.indicator || r.name || '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {r.forecast != null ? r.forecast : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-500 text-right tabular-nums">
              {r.previous != null ? r.previous : '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${imp.cls}`}>
                {imp.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Trend Tab ──

function TrendTab({ data }: { data: any }) {
  const trends = data?.trends || data?.trendData || [];
  const trendRows: { label: string; values: number[]; current: number }[] = [];

  // Try to extract trend data from various possible shapes
  if (trends.length > 0) {
    trends.forEach((t: any) => {
      trendRows.push({
        label: t.label || t.region || t.name || '--',
        values: t.values || t.history || [],
        current: t.current ?? t.latest ?? (t.values ? t.values[t.values.length - 1] : 0) ?? 0,
      });
    });
  } else {
    // Fallback: try to build from indices/regions
    const regions = data?.regions || data?.indices || [];
    regions.forEach((r: any) => {
      if (r.history || r.trend_data || r.sparkline) {
        trendRows.push({
          label: r.name || r.region || '--',
          values: r.history || r.trend_data || r.sparkline || [],
          current: r.value ?? r.index ?? 0,
        });
      }
    });
  }

  if (trendRows.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No trend data available
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1.5 px-1">
        12-Month Surprise Index Trend
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_1fr_48px] gap-1 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Region</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Sparkline (12M)</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Current</span>
      </div>

      {/* Rows */}
      {trendRows.map((row: any, i: any) => (
        <div
          key={`${row.label}-${i}`}
          className="grid grid-cols-[48px_1fr_48px] gap-1 px-1 py-[4px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[7px] font-mono font-bold text-neutral-300 truncate uppercase">
            {row.label}
          </span>

          <div className="flex items-center justify-center">
            <span
              className="text-[10px] font-mono tracking-tight leading-none"
              style={{ color: surpriseColorHex(row.current) }}
            >
              {textSparkline(row.values)}
            </span>
          </div>

          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${surpriseColor(row.current)}`}>
            {fmtSigned(row.current)}
          </span>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-2 px-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] leading-none text-emerald-400">{'\u2588'}</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] leading-none text-red-400">{'\u2581'}</span>
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">12 Months</span>
          <svg width="24" height="4" viewBox="0 0 24 4" className="inline-block">
            <line x1="0" y1="2" x2="24" y2="2" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MacroSurpriseTrackerPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMacroSurpriseTracker();
  const [tab, setTab] = useState<Tab>('index');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'index', label: 'INDEX' },
    { key: 'releases', label: 'RELEASES' },
    { key: 'categories', label: 'CATEGORIES' },
    { key: 'upcoming', label: 'UPCOMING' },
    { key: 'trend', label: 'TREND' },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M1 12L4 6L7 9L10 3L14 1" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="3" r="1.5" fill={ACCENT} opacity="0.6" />
            <path d="M1 14h14" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'mstTitle', 'Macro Surprise Tracker')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-violet-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb: any) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
              <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest animate-pulse">
                Loading macro data...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && (error || (!data && !isLoading)) && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
                Failed to load
              </span>
              <button
                onClick={() => refetch()}
                className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-violet-400 border border-violet-400/30 hover:bg-violet-400/10 transition-colors"
              >
                {tr(t, 'retry', 'Retry')}
              </button>
            </div>
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {tab === 'index' && <IndexTab data={data} />}
            {tab === 'releases' && <ReleasesTab data={data} />}
            {tab === 'categories' && <CategoriesTab data={data} />}
            {tab === 'upcoming' && <UpcomingTab data={data} />}
            {tab === 'trend' && <TrendTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
