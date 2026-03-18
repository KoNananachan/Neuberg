import { useMemo } from 'react';
import {
  useIntermarket,
  type IntermarketPair,
  type IntermarketData,
} from '../../api/hooks/use-intermarket';
import { useT } from '../../i18n';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Color helpers ──

function riskColor(level: string): { text: string; bg: string } {
  if (level === 'high') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (level === 'elevated') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
}

function corrColor(corr: number): string {
  if (corr > 0.6) return 'text-emerald-400';
  if (corr > 0.3) return 'text-emerald-400/60';
  if (corr > -0.3) return 'text-neutral/50';
  if (corr > -0.6) return 'text-red-400/60';
  return 'text-red-400';
}

function returnColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral/50';
}

function divScoreColor(score: number): string {
  if (score >= 5) return 'text-red-400';
  if (score >= 3) return 'text-yellow-400';
  if (score >= 2) return 'text-orange-400';
  return 'text-neutral/40';
}

// ── Main Panel ──

export function IntermarketPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useIntermarket();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'panelIntermarket', 'INTERMARKET DIVERGENCE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <RiskBadge level={data.summary.riskLevel} count={data.summary.divergenceCount} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {/* Dominant theme banner */}
            <DominantTheme theme={data.summary.dominantTheme} />

            {/* Divergent pairs first, then aligned */}
            {data.pairs.map((pair) => (
              <PairRow key={pair.name} pair={pair} t={t} />
            ))}

            {/* Timestamp */}
            <div className="px-3 py-1.5 text-[7px] font-mono text-neutral/25 text-right border-t border-border/10">
              {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Risk Badge ──

function RiskBadge({
  level,
  count,
  t,
}: {
  level: string;
  count: number;
  t: ReturnType<typeof useT>;
}) {
  const style = riskColor(level);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${style.text} ${style.bg} border`}>
      {count} {tr(t, 'imDivergences', 'DIV')} — {level.toUpperCase()}
    </span>
  );
}

// ── Dominant Theme Banner ──

function DominantTheme({ theme }: { theme: string }) {
  return (
    <div className="px-3 py-2 bg-cyan-500/[0.04] border-b border-cyan-500/10">
      <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-cyan-400/50">
        DOMINANT THEME
      </span>
      <p className="text-[9px] font-mono text-white/80 mt-0.5 leading-relaxed">
        {theme}
      </p>
    </div>
  );
}

// ── Pair Row ──

function PairRow({
  pair,
  t,
}: {
  pair: IntermarketPair;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div
      className={`border-b border-border/10 transition-colors hover:bg-cyan-400/[0.02] ${
        pair.divergent ? 'bg-red-500/[0.02]' : ''
      }`}
    >
      {/* Pair header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold text-white">{pair.name}</span>
          <span className={`text-[7px] font-mono px-1 py-px border ${
            pair.expectedRelation === 'inverse'
              ? 'text-red-400/60 border-red-500/20 bg-red-500/5'
              : 'text-emerald-400/60 border-emerald-500/20 bg-emerald-500/5'
          }`}>
            {pair.expectedRelation === 'inverse' ? 'INV' : 'POS'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pair.divergent && (
            <span className={`text-[7px] font-mono font-bold px-1 py-px bg-red-500/10 border border-red-500/30 text-red-400 uppercase`}>
              DIVERGENT
            </span>
          )}
          {pair.divergenceScore > 0 && (
            <span className={`text-[8px] font-mono font-bold ${divScoreColor(pair.divergenceScore)}`}>
              {pair.divergenceScore.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Price + return row */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 pb-1">
        {/* Symbol A */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[8px] font-mono font-bold text-cyan-300/80">{pair.symbolA}</span>
          <span className="text-[9px] font-mono text-white">{fmtPrice(pair.priceA)}</span>
          <span className={`text-[8px] font-mono ${returnColor(pair.changeA)}`}>
            {pair.changeA >= 0 ? '+' : ''}{pair.changeA.toFixed(2)}%
          </span>
        </div>

        {/* Correlation */}
        <div className="flex flex-col items-center">
          <span className="text-[6px] font-mono text-neutral/30 uppercase">ρ 20d</span>
          <span className={`text-[9px] font-mono font-bold ${corrColor(pair.correlation20d)}`}>
            {pair.correlation20d.toFixed(2)}
          </span>
        </div>

        {/* Symbol B */}
        <div className="flex items-baseline gap-1.5 justify-end">
          <span className={`text-[8px] font-mono ${returnColor(pair.changeB)}`}>
            {pair.changeB >= 0 ? '+' : ''}{pair.changeB.toFixed(2)}%
          </span>
          <span className="text-[9px] font-mono text-white">{fmtPrice(pair.priceB)}</span>
          <span className="text-[8px] font-mono font-bold text-cyan-300/80">{pair.symbolB}</span>
        </div>
      </div>

      {/* Sparklines + 5D returns */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 pb-1">
        <DualSparkline
          historyA={pair.historyA}
          historyB={pair.historyB}
          divergent={pair.divergent}
        />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[6px] font-mono text-neutral/30 uppercase">5D RET</span>
          <div className="flex gap-1.5">
            <span className={`text-[8px] font-mono font-bold ${returnColor(pair.returnA_5d)}`}>
              {pair.returnA_5d >= 0 ? '+' : ''}{pair.returnA_5d.toFixed(2)}%
            </span>
            <span className="text-[8px] font-mono text-neutral/20">vs</span>
            <span className={`text-[8px] font-mono font-bold ${returnColor(pair.returnB_5d)}`}>
              {pair.returnB_5d >= 0 ? '+' : ''}{pair.returnB_5d.toFixed(2)}%
            </span>
          </div>
        </div>
        <div />
      </div>

      {/* Signal text */}
      <div className="px-3 pb-2">
        <p className={`text-[8px] font-mono leading-relaxed ${
          pair.divergent ? 'text-yellow-400/70' : 'text-neutral/40'
        }`}>
          {pair.signal}
        </p>
      </div>
    </div>
  );
}

// ── Dual Sparkline SVG ──

function DualSparkline({
  historyA,
  historyB,
  divergent,
}: {
  historyA: number[];
  historyB: number[];
  divergent: boolean;
}) {
  const chart = useMemo(() => {
    if (historyA.length < 2 && historyB.length < 2) return null;

    const W = 140;
    const H = 32;
    const PAD = 2;

    const allVals = [...historyA, ...historyB].filter(v => v != null);
    if (allVals.length === 0) return null;

    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const rangeV = maxV - minV || 1;

    const buildPath = (data: number[]): string => {
      if (data.length < 2) return '';
      return data
        .map((v, i) => {
          const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
          const y = PAD + ((maxV - v) / rangeV) * (H - PAD * 2);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    };

    return {
      W,
      H,
      pathA: buildPath(historyA),
      pathB: buildPath(historyB),
    };
  }, [historyA, historyB]);

  if (!chart) {
    return (
      <div className="h-8 flex items-center justify-center text-[7px] font-mono text-neutral/20">
        NO DATA
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ height: 32 }}>
      {/* 100 baseline */}
      <line
        x1={2}
        y1={chart.H / 2}
        x2={chart.W - 2}
        y2={chart.H / 2}
        stroke="rgba(255,255,255,0.05)"
        strokeDasharray="2,3"
      />
      {/* Asset A line (cyan) */}
      {chart.pathA && (
        <path d={chart.pathA} fill="none" stroke="#22d3ee" strokeWidth={1.2} opacity={0.8} />
      )}
      {/* Asset B line (purple) */}
      {chart.pathB && (
        <path d={chart.pathB} fill="none" stroke="#a78bfa" strokeWidth={1.2} opacity={0.8} />
      )}
    </svg>
  );
}

// ── Formatting ──

function fmtPrice(n: number): string {
  if (n == null || n === 0) return '-';
  if (Math.abs(n) >= 10000) return n.toFixed(0);
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
