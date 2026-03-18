import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import {
  useEarningsSurprise,
  type EarningsSurpriseHistoryEntry,
  type EarningsSurpriseStats,
  type DriftPoint,
} from '../../api/hooks/use-earnings-surprise';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useT } from '../../i18n';

// ── i18n helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as any)(key) || fallback; } catch { return fallback; }
};

// ── Formatting helpers ──

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtEps(n: number | null): string {
  if (n == null) return '-';
  return n.toFixed(2);
}

function pctColor(n: number | null): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

// ── Surprise Bar Chart (SVG) ──

function SurpriseBarChart({ history }: { history: EarningsSurpriseHistoryEntry[] }) {
  const data = useMemo(() => [...history].reverse().slice(-12), [history]);

  if (data.length === 0) {
    return (
      <div className="text-center text-neutral/30 text-[9px] font-mono py-6 uppercase tracking-wider">
        No earnings history
      </div>
    );
  }

  const surprises = data.map(d => d.surprisePct).filter((v): v is number => v != null);
  if (surprises.length === 0) return null;

  const maxSurprise = Math.max(...surprises.map(Math.abs), 1);

  const chartW = 320;
  const chartH = 140;
  const pad = { top: 20, bottom: 28, left: 8, right: 8 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;
  const barGroupW = innerW / data.length;
  const barW = Math.min(barGroupW * 0.55, 20);
  const zeroY = pad.top + innerH / 2;

  // EPS scale for overlay lines
  const allEps = data.flatMap(d => [d.epsEstimate, d.epsActual].filter((v): v is number => v != null));
  const epsMax = allEps.length > 0 ? Math.max(...allEps) : 1;
  const epsMin = allEps.length > 0 ? Math.min(...allEps) : 0;
  const epsRange = epsMax - epsMin || 1;

  const epsY = (val: number): number => {
    return pad.top + innerH - ((val - epsMin) / epsRange) * innerH;
  };

  // Build EPS line points
  const estimatePts: string[] = [];
  const actualPts: string[] = [];
  data.forEach((d, i) => {
    const x = pad.left + i * barGroupW + barGroupW / 2;
    if (d.epsEstimate != null) estimatePts.push(`${x},${epsY(d.epsEstimate)}`);
    if (d.epsActual != null) actualPts.push(`${x},${epsY(d.epsActual)}`);
  });

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Zero line */}
      <line
        x1={pad.left} x2={chartW - pad.right}
        y1={zeroY} y2={zeroY}
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"
      />

      {/* Surprise bars */}
      {data.map((d, i) => {
        if (d.surprisePct == null) return null;
        const x = pad.left + i * barGroupW + (barGroupW - barW) / 2;
        const barH = (Math.abs(d.surprisePct) / maxSurprise) * (innerH / 2);
        const y = d.surprisePct >= 0 ? zeroY - barH : zeroY;
        const fill = d.beat
          ? 'rgba(74,222,128,0.6)'
          : 'rgba(248,113,113,0.6)';

        return (
          <g key={`bar-${i}`}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} fill={fill} />
            {/* Surprise % label */}
            <text
              x={x + barW / 2}
              y={d.surprisePct >= 0 ? y - 3 : y + barH + 8}
              textAnchor="middle"
              fill={d.beat ? '#4ade80' : '#f87171'}
              fontSize="7"
              fontFamily="monospace"
            >
              {fmtPct(d.surprisePct)}
            </text>
          </g>
        );
      })}

      {/* EPS estimate line (dashed) */}
      {estimatePts.length > 1 && (
        <polyline
          points={estimatePts.join(' ')}
          fill="none"
          stroke="rgba(148,163,184,0.4)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
      )}

      {/* EPS actual line (solid) */}
      {actualPts.length > 1 && (
        <polyline
          points={actualPts.join(' ')}
          fill="none"
          stroke="rgba(250,204,21,0.7)"
          strokeWidth="1.2"
        />
      )}

      {/* EPS actual dots */}
      {data.map((d, i) => {
        if (d.epsActual == null) return null;
        const x = pad.left + i * barGroupW + barGroupW / 2;
        return (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={epsY(d.epsActual)}
            r="2"
            fill={d.beat ? '#4ade80' : '#f87171'}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Quarter labels */}
      {data.map((d, i) => {
        const x = pad.left + i * barGroupW + barGroupW / 2;
        return (
          <text
            key={`lbl-${i}`}
            x={x}
            y={chartH - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="6.5"
            fontFamily="monospace"
          >
            {d.quarter.replace(/\s\d{4}$/, `'${d.date.slice(2, 4)}`)}
          </text>
        );
      })}

      {/* Legend */}
      <rect x={pad.left} y={2} width={8} height={4} fill="rgba(74,222,128,0.6)" />
      <text x={pad.left + 10} y={6} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">Beat</text>
      <rect x={pad.left + 35} y={2} width={8} height={4} fill="rgba(248,113,113,0.6)" />
      <text x={pad.left + 45} y={6} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">Miss</text>
      <line x1={pad.left + 72} y1={4} x2={pad.left + 84} y2={4} stroke="rgba(148,163,184,0.4)" strokeWidth="1" strokeDasharray="3,2" />
      <text x={pad.left + 86} y={6} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">Est</text>
      <line x1={pad.left + 100} y1={4} x2={pad.left + 112} y2={4} stroke="rgba(250,204,21,0.7)" strokeWidth="1.2" />
      <text x={pad.left + 114} y={6} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">Actual</text>
    </svg>
  );
}

// ── Post-Earnings Drift Chart (SVG) ──

function DriftChart({ driftCurve }: { driftCurve: DriftPoint[] }) {
  const hasBeats = driftCurve.some(p => p.beatAvg != null);
  const hasMisses = driftCurve.some(p => p.missAvg != null);

  if (!hasBeats && !hasMisses) {
    return (
      <div className="text-center text-neutral/30 text-[9px] font-mono py-6 uppercase tracking-wider">
        Insufficient data for drift analysis
      </div>
    );
  }

  const chartW = 320;
  const chartH = 130;
  const pad = { top: 14, bottom: 22, left: 32, right: 12 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  // Scale
  const allVals = driftCurve.flatMap(p => [p.beatAvg, p.missAvg].filter((v): v is number => v != null));
  const yMax = allVals.length > 0 ? Math.max(...allVals, 0) : 5;
  const yMin = allVals.length > 0 ? Math.min(...allVals, 0) : -5;
  const yRange = yMax - yMin || 1;

  const xScale = (day: number): number => {
    return pad.left + ((day + 5) / 25) * innerW;
  };
  const yScale = (val: number): number => {
    return pad.top + innerH - ((val - yMin) / yRange) * innerH;
  };

  const zeroY = yScale(0);

  // Build polyline points
  const beatPts = driftCurve
    .filter(p => p.beatAvg != null)
    .map(p => `${xScale(p.day)},${yScale(p.beatAvg!)}`)
    .join(' ');

  const missPts = driftCurve
    .filter(p => p.missAvg != null)
    .map(p => `${xScale(p.day)},${yScale(p.missAvg!)}`)
    .join(' ');

  // Shaded area for beats
  const beatFill = driftCurve.filter(p => p.beatAvg != null);
  const beatFillPath = beatFill.length > 1
    ? `M${xScale(beatFill[0].day)},${zeroY} ` +
      beatFill.map(p => `L${xScale(p.day)},${yScale(p.beatAvg!)}`).join(' ') +
      ` L${xScale(beatFill[beatFill.length - 1].day)},${zeroY} Z`
    : '';

  const missFill = driftCurve.filter(p => p.missAvg != null);
  const missFillPath = missFill.length > 1
    ? `M${xScale(missFill[0].day)},${zeroY} ` +
      missFill.map(p => `L${xScale(p.day)},${yScale(p.missAvg!)}`).join(' ') +
      ` L${xScale(missFill[missFill.length - 1].day)},${zeroY} Z`
    : '';

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = yRange / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMin + step * i);
  }

  // X-axis ticks
  const xTicks = [-5, 0, 5, 10, 15, 20];

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {yTicks.map((v, i) => (
        <g key={`yt-${i}`}>
          <line
            x1={pad.left} x2={chartW - pad.right}
            y1={yScale(v)} y2={yScale(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
          />
          <text
            x={pad.left - 3}
            y={yScale(v) + 2.5}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize="6"
            fontFamily="monospace"
          >
            {v.toFixed(1)}%
          </text>
        </g>
      ))}

      {/* Zero line */}
      <line
        x1={pad.left} x2={chartW - pad.right}
        y1={zeroY} y2={zeroY}
        stroke="rgba(255,255,255,0.2)" strokeWidth="0.7"
      />

      {/* Earnings day marker */}
      <line
        x1={xScale(0)} x2={xScale(0)}
        y1={pad.top} y2={pad.top + innerH}
        stroke="rgba(250,204,21,0.3)" strokeWidth="0.7" strokeDasharray="3,2"
      />
      <text
        x={xScale(0)} y={pad.top - 3}
        textAnchor="middle"
        fill="rgba(250,204,21,0.5)"
        fontSize="6"
        fontFamily="monospace"
      >
        EARNINGS
      </text>

      {/* Shaded areas */}
      {beatFillPath && (
        <path d={beatFillPath} fill="rgba(74,222,128,0.06)" />
      )}
      {missFillPath && (
        <path d={missFillPath} fill="rgba(248,113,113,0.06)" />
      )}

      {/* Beat line */}
      {beatPts && (
        <polyline
          points={beatPts}
          fill="none"
          stroke="rgba(74,222,128,0.8)"
          strokeWidth="1.5"
        />
      )}

      {/* Miss line */}
      {missPts && (
        <polyline
          points={missPts}
          fill="none"
          stroke="rgba(248,113,113,0.8)"
          strokeWidth="1.5"
        />
      )}

      {/* X-axis ticks */}
      {xTicks.map(d => (
        <text
          key={`xt-${d}`}
          x={xScale(d)}
          y={chartH - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.25)"
          fontSize="6"
          fontFamily="monospace"
        >
          {d === 0 ? 'D0' : d > 0 ? `+${d}` : `${d}`}
        </text>
      ))}

      {/* Legend */}
      <line x1={chartW - 100} y1={pad.top + 3} x2={chartW - 88} y2={pad.top + 3} stroke="rgba(74,222,128,0.8)" strokeWidth="1.5" />
      <text x={chartW - 85} y={pad.top + 5.5} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">After Beat</text>
      <line x1={chartW - 100} y1={pad.top + 13} x2={chartW - 88} y2={pad.top + 13} stroke="rgba(248,113,113,0.8)" strokeWidth="1.5" />
      <text x={chartW - 85} y={pad.top + 15.5} fill="rgba(255,255,255,0.35)" fontSize="6" fontFamily="monospace">After Miss</text>
    </svg>
  );
}

// ── Stats Cards ──

function StatsGrid({ stats }: { stats: EarningsSurpriseStats }) {
  const cards: Array<{ label: string; value: string; color: string }> = [
    {
      label: 'BEAT RATE',
      value: stats.beatRate != null ? `${stats.beatRate.toFixed(0)}%` : '-',
      color: stats.beatRate != null && stats.beatRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'AVG SURPRISE',
      value: stats.avgSurprise != null ? fmtPct(stats.avgSurprise) : '-',
      color: pctColor(stats.avgSurprise),
    },
    {
      label: 'BEAT STREAK',
      value: `${stats.beatStreak}`,
      color: stats.beatStreak > 0 ? 'text-yellow-400' : 'text-neutral/50',
    },
    {
      label: 'AVG DAY 1 (BEAT)',
      value: stats.avgBeatDayReturn != null ? fmtPct(stats.avgBeatDayReturn) : '-',
      color: pctColor(stats.avgBeatDayReturn),
    },
    {
      label: 'AVG DAY 1 (MISS)',
      value: stats.avgMissDayReturn != null ? fmtPct(stats.avgMissDayReturn) : '-',
      color: pctColor(stats.avgMissDayReturn),
    },
    {
      label: '20-DAY DRIFT',
      value: stats.avgDrift20d != null ? fmtPct(stats.avgDrift20d) : '-',
      color: pctColor(stats.avgDrift20d),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-px bg-border/10">
      {cards.map(c => (
        <div key={c.label} className="bg-black px-2 py-1.5">
          <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">{c.label}</div>
          <div className={`text-[11px] font-mono font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── History Table ──

function HistoryTable({ history }: { history: EarningsSurpriseHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="border border-border/20 overflow-hidden">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Qtr</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Est</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Actual</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Day 1</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Day 5</th>
            <th className="text-right px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Day 20</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => {
            const rowBg = h.beat
              ? 'bg-green-500/[0.03] hover:bg-green-500/[0.06]'
              : 'bg-red-500/[0.03] hover:bg-red-500/[0.06]';
            const color = h.beat ? 'text-green-400' : 'text-red-400';

            return (
              <tr key={i} className={`border-b border-border/10 ${rowBg}`}>
                <td className="px-2 py-1 text-neutral/60">{h.date}</td>
                <td className="px-2 py-1 text-neutral/70 font-medium">{h.quarter.replace(/\s\d{4}$/, `'${h.date.slice(2, 4)}`)}</td>
                <td className="text-right px-2 py-1 text-neutral/50">{fmtEps(h.epsEstimate)}</td>
                <td className={`text-right px-2 py-1 font-bold ${color}`}>{fmtEps(h.epsActual)}</td>
                <td className={`text-right px-2 py-1 font-bold ${color}`}>{fmtPct(h.surprisePct)}</td>
                <td className={`text-right px-2 py-1 ${pctColor(h.dayReturn)}`}>{fmtPct(h.dayReturn)}</td>
                <td className={`text-right px-2 py-1 ${pctColor(h.fiveDayReturn)}`}>{fmtPct(h.fiveDayReturn)}</td>
                <td className={`text-right px-2 py-1 ${pctColor(h.twentyDayReturn)}`}>{fmtPct(h.twentyDayReturn)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Badge helpers ──

function BeatRateBadge({ rate }: { rate: number | null }) {
  if (rate == null) return null;
  const good = rate >= 50;
  return (
    <span className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border ${
      good
        ? 'text-green-400 bg-green-500/10 border-green-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30'
    }`}>
      {rate.toFixed(0)}% Beat
    </span>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border text-yellow-400 bg-yellow-500/10 border-yellow-500/30">
      {streak}x Streak
    </span>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'flat' | null }) {
  if (!trend) return null;
  const cfg = {
    up: { text: 'EPS Trend Up', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
    down: { text: 'EPS Trend Down', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
    flat: { text: 'EPS Flat', cls: 'text-neutral/50 bg-white/5 border-border/30' },
  }[trend];
  return (
    <span className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
}

// ── Main Panel ──

export function EarningsSurprisePanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');

  const { data, isLoading, refetch, dataUpdatedAt } = useEarningsSurprise(symbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.toUpperCase().trim();
    if (val && val !== symbol) {
      setSymbol(val);
    }
  };

  const countdown = useMemo(() => {
    if (!data?.stats.nextEarningsDate) return null;
    return daysUntil(data.stats.nextEarningsDate);
  }, [data?.stats.nextEarningsDate]);

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-yellow-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {tr(t, 'panelEarningsSurprise', 'EARNINGS SURPRISE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-yellow-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Symbol input + badges ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 shrink-0">
          <Search size={10} className="text-neutral/40" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder="SYMBOL"
            className="bg-white/[0.04] border border-border/30 px-2 py-0.5 text-[10px] font-mono text-white w-20 outline-none focus:border-yellow-400/50 uppercase"
          />
          <button
            type="submit"
            className="px-2 py-0.5 text-[9px] font-mono uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
          >
            Go
          </button>
        </form>
        {data && (
          <div className="flex items-center gap-1.5 ml-auto flex-wrap justify-end">
            <BeatRateBadge rate={data.stats.beatRate} />
            <StreakBadge streak={data.stats.beatStreak} />
            <TrendBadge trend={data.stats.epsTrend} />
            {data.stats.nextEarningsDate && (
              <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider border text-yellow-400 bg-yellow-500/10 border-yellow-500/30">
                {tr(t, 'esNext', 'Next')}: {data.stats.nextEarningsDate}
                {countdown != null && countdown >= 0 && (
                  <span className="text-neutral/40"> ({countdown}d)</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0 px-3 py-2">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {tr(t, 'esNoData', 'No data available')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Company name */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral/60 truncate max-w-[200px]">{data.name}</span>
              <span className="text-[10px] font-mono text-yellow-400 font-bold">{data.symbol}</span>
            </div>

            {/* Surprise Chart */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
                {tr(t, 'esSurpriseHistory', 'EARNINGS SURPRISE HISTORY')}
              </div>
              <div className="bg-black border border-border/20 p-2">
                <SurpriseBarChart history={data.history} />
              </div>
            </div>

            {/* Post-Earnings Drift */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
                {tr(t, 'esDriftAnalysis', 'POST-EARNINGS DRIFT (AVG)')}
              </div>
              <div className="bg-black border border-border/20 p-2">
                <DriftChart driftCurve={data.driftCurve} />
              </div>
            </div>

            {/* Stats Cards */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
                {tr(t, 'esKeyStats', 'KEY STATISTICS')}
              </div>
              <div className="border border-border/20 overflow-hidden">
                <StatsGrid stats={data.stats} />
              </div>
            </div>

            {/* Earnings History Table */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
                {tr(t, 'esHistoryTable', 'EARNINGS HISTORY')}
              </div>
              <HistoryTable history={data.history} />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/20 text-[8px] font-mono text-neutral/30">
        <span>
          {data?.history.length ?? 0} {tr(t, 'esQuarters', 'quarters')}
        </span>
        <span>
          {data?.stats.epsTrend === 'up' && 'EPS trending higher'}
          {data?.stats.epsTrend === 'down' && 'EPS trending lower'}
          {data?.stats.epsTrend === 'flat' && 'EPS flat'}
        </span>
      </div>
    </GlassCard>
  );
}
