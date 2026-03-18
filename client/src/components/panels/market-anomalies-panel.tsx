import { useMemo } from 'react';
import { useMarketAnomalies, type Anomaly, type AnomalyFinding } from '../../api/hooks/use-market-anomalies';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──
function makeTr(t: ReturnType<typeof useT>) {
  return (key: string, fallback: string): string => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

// ── Color helpers ──

function strengthColor(s: AnomalyFinding['strength']): string {
  switch (s) {
    case 'strong': return '#f59e0b';
    case 'moderate': return '#d97706';
    case 'weak': return '#92400e';
    case 'none': return '#525252';
  }
}

function strengthLabel(s: AnomalyFinding['strength']): string {
  switch (s) {
    case 'strong': return 'STRONG';
    case 'moderate': return 'MOD';
    case 'weak': return 'WEAK';
    case 'none': return 'N/S';
  }
}

function categoryBadge(cat: Anomaly['category']): { label: string; color: string } {
  switch (cat) {
    case 'calendar': return { label: 'CAL', color: 'text-blue-400 bg-blue-400/10' };
    case 'time': return { label: 'TIME', color: 'text-purple-400 bg-purple-400/10' };
    case 'structural': return { label: 'STRUCT', color: 'text-cyan-400 bg-cyan-400/10' };
  }
}

// ── SVG Bar Chart ──

function FindingsChart({ findings }: { findings: AnomalyFinding[] }) {
  const count = findings.length;
  if (count === 0) return null;

  const W = 320;
  const H = count <= 5 ? 90 : 110;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxAbs = Math.max(...findings.map((f) => Math.abs(f.avgReturn)), 0.001);
  const barW = chartW / count;
  const zeroY = PAD_T + (maxAbs / (maxAbs * 2)) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: count <= 5 ? 100 : 120 }}>
      {/* Zero line */}
      <line
        x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY}
        stroke="rgba(255,255,255,0.12)" strokeWidth={0.5}
      />

      {findings.map((f, i) => {
        const x = PAD_L + i * barW;
        const barHeight = Math.abs(f.avgReturn) / (maxAbs * 2) * chartH;
        const y = f.avgReturn >= 0 ? zeroY - barHeight : zeroY;
        const fillColor = f.avgReturn >= 0 ? 'rgba(52,211,153,0.55)' : 'rgba(248,113,113,0.55)';
        const textColor = f.avgReturn >= 0 ? '#34d399' : '#f87171';

        // Truncate label to fit
        const displayLabel = f.label.length > 5 ? f.label.slice(0, 3) : f.label;

        return (
          <g key={f.label}>
            <rect
              x={x + 2}
              y={y}
              width={Math.max(barW - 4, 2)}
              height={Math.max(barHeight, 1)}
              fill={fillColor}
            />
            {/* Value label */}
            <text
              x={x + barW / 2}
              y={f.avgReturn >= 0 ? Math.max(y - 2, PAD_T + 6) : Math.min(y + barHeight + 7, H - PAD_B - 2)}
              textAnchor="middle"
              fill={textColor}
              fontSize={count <= 5 ? 6 : 5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {f.avgReturn >= 0 ? '+' : ''}{f.avgReturn.toFixed(3)}%
            </text>
            {/* Label */}
            <text
              x={x + barW / 2}
              y={H - PAD_B + 9}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={count <= 5 ? 7 : 5}
              fontFamily="monospace"
            >
              {count > 5 ? displayLabel : f.label}
            </text>
            {/* Win rate */}
            <text
              x={x + barW / 2}
              y={H - PAD_B + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={count <= 5 ? 5.5 : 4.5}
              fontFamily="monospace"
            >
              {f.winRate.toFixed(0)}%W
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Anomaly Card ──

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const badge = categoryBadge(anomaly.category);

  return (
    <div className="border-b border-white/[0.04] px-3 py-2">
      {/* Card header */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] font-mono font-black text-white uppercase tracking-tight">
          {anomaly.name}
        </span>
        <span className={`text-[7px] font-mono font-bold px-1 py-px ${badge.color}`}>
          {badge.label}
        </span>
        {anomaly.currentlyActive && (
          <span className="text-[7px] font-mono font-bold px-1 py-px text-amber-400 bg-amber-400/10 animate-pulse">
            ACTIVE
          </span>
        )}
      </div>

      {/* Description */}
      <div className="text-[8px] font-mono text-white/30 leading-tight mb-1.5">
        {anomaly.description}
      </div>

      {/* Bar chart */}
      <FindingsChart findings={anomaly.findings} />

      {/* Findings detail table */}
      <div className="mt-1">
        <div className="grid grid-cols-[1fr_55px_45px_35px_40px] gap-0 text-[6.5px] font-mono text-white/25 uppercase tracking-wider border-b border-white/[0.04] pb-0.5 mb-0.5">
          <span>Label</span>
          <span className="text-right">Avg Ret</span>
          <span className="text-right">Win%</span>
          <span className="text-right">N</span>
          <span className="text-right">Sig</span>
        </div>
        {anomaly.findings.map((f) => (
          <div
            key={f.label}
            className="grid grid-cols-[1fr_55px_45px_35px_40px] gap-0 py-px"
          >
            <span className="text-[8px] font-mono text-white/60 truncate">{f.label}</span>
            <span className={`text-[8px] font-mono text-right font-bold ${f.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {f.avgReturn >= 0 ? '+' : ''}{f.avgReturn.toFixed(3)}%
            </span>
            <span className={`text-[8px] font-mono text-right ${f.winRate >= 50 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
              {f.winRate.toFixed(0)}%
            </span>
            <span className="text-[8px] font-mono text-right text-white/30">
              {f.sampleSize}
            </span>
            <span
              className="text-[7px] font-mono text-right font-bold"
              style={{ color: strengthColor(f.strength) }}
            >
              {strengthLabel(f.strength)}
            </span>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-1.5 text-[8px] font-mono text-amber-400/70 leading-tight">
        {anomaly.insight}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MarketAnomaliesPanel() {
  const t = useT();
  const tr = makeTr(t);

  const { data, isLoading, refetch } = useMarketAnomalies();

  const activeCount = useMemo(() => data?.activeNow.length ?? 0, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-500" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-500">
            {tr('panelMarketAnomalies', 'Market Anomalies')}
          </span>
          {activeCount > 0 && (
            <span className="text-[8px] font-mono font-bold px-1.5 py-px bg-amber-500/15 text-amber-400">
              {activeCount} {tr('active', 'ACTIVE')}
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1 text-white/20 hover:text-amber-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Analyzing anomalies...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-white/20 text-[9px] font-mono uppercase">
            {tr('marketAnomaliesNoData', 'No anomaly data available')}
          </div>
        )}

        {data && (
          <>
            {/* Active anomalies banner */}
            {data.activeNow.length > 0 && (
              <div className="px-3 py-2 border-b border-amber-500/20 bg-amber-500/[0.04]">
                <div className="text-[7px] font-mono font-bold text-amber-500/60 uppercase tracking-widest mb-1">
                  {tr('activeNow', 'Active Now')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.activeNow.map((name) => (
                    <span
                      key={name}
                      className="text-[8px] font-mono font-bold px-1.5 py-0.5 text-amber-400 bg-amber-400/10 border border-amber-400/20"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <div className="text-[8px] font-mono text-white/30 leading-tight">
                {data.summary}
              </div>
            </div>

            {/* Anomaly cards */}
            {data.anomalies.map((anomaly) => (
              <AnomalyCard key={anomaly.name} anomaly={anomaly} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
