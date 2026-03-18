import { useState, useMemo } from 'react';
import { useCurrencyStrength, type CurrencyStrength } from '../../api/hooks/use-currency-strength';
import { useT } from '../../i18n';
import { Activity, RefreshCw } from 'lucide-react';

type TabMode = 'strength' | 'matrix';

const FLAG_EMOJI: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  EUR: '\u{1F1EA}\u{1F1FA}',
  GBP: '\u{1F1EC}\u{1F1E7}',
  JPY: '\u{1F1EF}\u{1F1F5}',
  CHF: '\u{1F1E8}\u{1F1ED}',
  AUD: '\u{1F1E6}\u{1F1FA}',
  CAD: '\u{1F1E8}\u{1F1E6}',
  NZD: '\u{1F1F3}\u{1F1FF}',
};

// i18n keys may not exist yet — use fallback pattern
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

function strengthColor(value: number): string {
  if (value >= 80) return '#34d399'; // emerald
  if (value >= 60) return '#4ade80'; // green
  if (value >= 40) return '#facc15'; // yellow
  if (value >= 20) return '#fb923c'; // orange
  return '#f87171'; // red
}

function strengthGradient(value: number): string {
  // Create gradient stop color based on value
  if (value >= 70) return 'from-emerald-500/80 to-green-400/60';
  if (value >= 50) return 'from-yellow-500/70 to-green-400/50';
  if (value >= 30) return 'from-orange-500/70 to-yellow-400/50';
  return 'from-red-500/80 to-orange-400/50';
}

function heatColor(value: number): string {
  // value is a % change. Green for positive, red for negative
  const absVal = Math.min(Math.abs(value), 1.5);
  const intensity = Math.round((absVal / 1.5) * 255);
  if (value > 0) return `rgba(74, 222, 128, ${intensity / 255 * 0.8})`;
  if (value < 0) return `rgba(248, 113, 113, ${intensity / 255 * 0.8})`;
  return 'rgba(128, 128, 128, 0.1)';
}

export function CurrencyStrengthPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCurrencyStrength();
  const [tab, setTab] = useState<TabMode>('strength');

  const metrics = useMemo(() => {
    if (!data?.currencies?.length) return null;

    const sorted = [...data.currencies].sort((a, b) => b.strength - a.strength);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    // Find most volatile pair
    let maxVol = 0;
    let volPair = '';
    for (const c of data.currencies) {
      for (const [other, change] of Object.entries(c.pairs)) {
        const absChange = Math.abs(change);
        if (absChange > maxVol) {
          maxVol = absChange;
          volPair = `${c.code}/${other}`;
        }
      }
    }

    return { strongest, weakest, volPair, maxVol };
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'csMeterTitle', 'CURRENCY STRENGTH')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-violet-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Key Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-3 gap-px px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0">
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'csStrongest', 'Strongest')}
            </div>
            <div className="text-[10px] font-mono font-black text-emerald-400">
              {FLAG_EMOJI[metrics.strongest.code]} {metrics.strongest.code}
              <span className="text-[8px] text-emerald-400/60 ml-1">{metrics.strongest.strength.toFixed(1)}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'csWeakest', 'Weakest')}
            </div>
            <div className="text-[10px] font-mono font-black text-red-400">
              {FLAG_EMOJI[metrics.weakest.code]} {metrics.weakest.code}
              <span className="text-[8px] text-red-400/60 ml-1">{metrics.weakest.strength.toFixed(1)}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
              {tr(t, 'csMostVolatile', 'Most Volatile')}
            </div>
            <div className="text-[10px] font-mono font-black text-yellow-400">
              {metrics.volPair}
              <span className="text-[8px] text-yellow-400/60 ml-1">{metrics.maxVol.toFixed(3)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-black/60 shrink-0">
        {(['strength', 'matrix'] as TabMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === mode
                ? 'border-violet-400/40 text-violet-400 bg-violet-400/10'
                : 'border-border/20 text-neutral/30 hover:text-neutral/60'
            }`}
          >
            {mode === 'strength' ? tr(t, 'csStrength', 'Strength') : tr(t, 'csMatrix', 'Matrix')}
          </button>
        ))}
        {data?.updatedAt && (
          <span className="ml-auto text-[7px] font-mono text-neutral/25">
            {new Date(data.updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'csNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'strength' && <StrengthBars currencies={data.currencies} />}
        {data && tab === 'matrix' && <StrengthMatrix currencies={data.currencies} />}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral/25">
          {data ? `${data.currencies.length} currencies` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral/25">
          28 {tr(t, 'csPairs', 'pairs')}
        </span>
      </div>
    </div>
  );
}

// ── Strength Bars View ──

function StrengthBars({ currencies }: { currencies: CurrencyStrength[] }) {
  const sorted = useMemo(
    () => [...currencies].sort((a, b) => b.strength - a.strength),
    [currencies],
  );

  return (
    <div className="px-3 py-1.5 space-y-1">
      {sorted.map((c) => (
        <div key={c.code} className="flex items-center gap-2 group">
          {/* Rank */}
          <span className="text-[8px] font-mono font-black text-neutral/30 w-3 text-right shrink-0">
            {c.rank}
          </span>

          {/* Flag + Code */}
          <span className="text-[10px] shrink-0 w-5 text-center">{FLAG_EMOJI[c.code]}</span>
          <span className="text-[10px] font-mono font-black text-white w-7 shrink-0">
            {c.code}
          </span>

          {/* Bar */}
          <div className="flex-1 h-4 bg-white/[0.03] relative overflow-hidden border border-white/[0.04]">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${strengthGradient(c.strength)} transition-all duration-700`}
              style={{ width: `${c.strength}%` }}
            />
            {/* SVG tick marks at 25, 50, 75 */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <line x1="25%" y1="0" x2="25%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1="75%" y1="0" x2="75%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </svg>
          </div>

          {/* Value */}
          <span
            className="text-[9px] font-mono font-black w-9 text-right shrink-0"
            style={{ color: strengthColor(c.strength) }}
          >
            {c.strength.toFixed(1)}
          </span>

          {/* Change */}
          <span
            className={`text-[8px] font-mono w-10 text-right shrink-0 ${
              c.change >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'
            }`}
          >
            {c.change >= 0 ? '+' : ''}{c.change.toFixed(3)}%
          </span>
        </div>
      ))}

      {/* Legend */}
      <div className="pt-2 flex items-center justify-center gap-4">
        <LegendDot color="text-red-400" label="Weak (0)" />
        <LegendDot color="text-yellow-400" label="Neutral (50)" />
        <LegendDot color="text-emerald-400" label="Strong (100)" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${color} bg-current`} />
      <span className="text-[7px] font-mono text-neutral/30">{label}</span>
    </div>
  );
}

// ── Matrix View ──

function StrengthMatrix({ currencies }: { currencies: CurrencyStrength[] }) {
  // Sort by strength descending for matrix layout
  const sorted = useMemo(
    () => [...currencies].sort((a, b) => b.strength - a.strength),
    [currencies],
  );

  const codes = sorted.map((c) => c.code);
  const currMap = useMemo(
    () => new Map(sorted.map((c) => [c.code, c])),
    [sorted],
  );

  const cellSize = 36; // px
  const headerSize = 32; // px for row/col headers
  const totalWidth = headerSize + codes.length * cellSize;
  const totalHeight = headerSize + codes.length * cellSize;

  return (
    <div className="px-2 py-2 overflow-auto no-scrollbar">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="mx-auto"
        style={{ maxWidth: '100%' }}
      >
        {/* Column headers */}
        {codes.map((code, i) => (
          <g key={`ch-${code}`}>
            <text
              x={headerSize + i * cellSize + cellSize / 2}
              y={headerSize - 6}
              textAnchor="middle"
              className="fill-neutral/50"
              style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 900 }}
            >
              {code}
            </text>
          </g>
        ))}

        {/* Row headers + cells */}
        {codes.map((rowCode, ri) => (
          <g key={`row-${rowCode}`}>
            {/* Row header */}
            <text
              x={headerSize - 4}
              y={headerSize + ri * cellSize + cellSize / 2 + 3}
              textAnchor="end"
              className="fill-neutral/50"
              style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 900 }}
            >
              {rowCode}
            </text>

            {/* Cells */}
            {codes.map((colCode, ci) => {
              const isIdentity = rowCode === colCode;
              const curr = currMap.get(rowCode);
              const pairChange = curr?.pairs[colCode] ?? 0;

              const x = headerSize + ci * cellSize;
              const y = headerSize + ri * cellSize;

              return (
                <g key={`${rowCode}-${colCode}`}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill={isIdentity ? 'rgba(139,92,246,0.15)' : heatColor(pairChange)}
                    rx={2}
                  />
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 3}
                    textAnchor="middle"
                    style={{
                      fontSize: isIdentity ? '7px' : '8px',
                      fontFamily: 'monospace',
                      fontWeight: isIdentity ? 400 : 700,
                      fill: isIdentity
                        ? 'rgba(139,92,246,0.5)'
                        : pairChange > 0
                          ? 'rgba(74,222,128,0.9)'
                          : pairChange < 0
                            ? 'rgba(248,113,113,0.9)'
                            : 'rgba(128,128,128,0.4)',
                    }}
                  >
                    {isIdentity ? '---' : `${pairChange >= 0 ? '+' : ''}${pairChange.toFixed(2)}`}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Grid lines */}
        {codes.map((_, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={headerSize}
              y1={headerSize + i * cellSize}
              x2={totalWidth}
              y2={headerSize + i * cellSize}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={1}
            />
            <line
              x1={headerSize + i * cellSize}
              y1={headerSize}
              x2={headerSize + i * cellSize}
              y2={totalHeight}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={1}
            />
          </g>
        ))}
      </svg>

      {/* Matrix legend */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(248,113,113,0.6)' }} />
          <span className="text-[7px] font-mono text-neutral/30">Row weaker</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(128,128,128,0.2)' }} />
          <span className="text-[7px] font-mono text-neutral/30">Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(74,222,128,0.6)' }} />
          <span className="text-[7px] font-mono text-neutral/30">Row stronger</span>
        </div>
      </div>
    </div>
  );
}
