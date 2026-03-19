import { useState, useMemo } from 'react';
import { useEquityPairsTrading } from '../../api/hooks/use-equity-pairs-trading';
import { useT } from '../../i18n';
import { RefreshCw, GitCompareArrows, TrendingUp, ShieldAlert, BarChart3, Layers } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#a78bfa';
const ACCENT_DIM = 'rgba(167,139,250,0.08)';

type Tab = 'pairs' | 'spread' | 'sectors' | 'risk' | 'pnl';

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ── Color helpers ──

function signalStyle(signal: string): { text: string; bg: string } {
  const s = signal.toUpperCase();
  if (s === 'BUY') return { text: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
  if (s === 'SELL') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function corrColor(val: number): string {
  if (val >= 0.8) return 'text-emerald-400';
  if (val >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

function zScoreColor(val: number): string {
  const abs = Math.abs(val);
  if (abs > 2) return val > 0 ? 'text-red-400' : 'text-emerald-400';
  if (abs > 1) return val > 0 ? 'text-orange-400' : 'text-blue-400';
  return 'text-neutral-400';
}

function pnlColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Spread Chart with Bollinger Bands (SVG) ──

function SpreadChart({ pair }: { pair: any }) {
  const spreadSeries: number[] = pair.spreadHistory ?? [];
  if (spreadSeries.length < 5) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        Insufficient data for chart
      </div>
    );
  }

  const padding = { top: 20, right: 14, bottom: 28, left: 52 };
  const viewWidth = 600;
  const viewHeight = 200;
  const chartW = viewWidth - padding.left - padding.right;
  const chartH = viewHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    const n = spreadSeries.length;
    // Compute 20-period SMA and std for Bollinger
    const period = Math.min(20, Math.floor(n / 2));
    const sma: number[] = [];
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < n; i++) {
      if (i < period - 1) {
        sma.push(NaN);
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      const slice = spreadSeries.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      sma.push(mean);
      upper.push(mean + 2 * std);
      lower.push(mean - 2 * std);
    }

    const allVals = [...spreadSeries, ...upper.filter(v => !isNaN(v)), ...lower.filter(v => !isNaN(v))];
    const yMin = Math.min(...allVals);
    const yMax = Math.max(...allVals);
    const yPad = (yMax - yMin) * 0.08 || 0.5;

    return { sma, upper, lower, yMin: yMin - yPad, yMax: yMax + yPad };
  }, [spreadSeries]);

  const { sma, upper, lower, yMin, yMax } = chartData;

  const scaleX = (i: number) => padding.left + (i / (spreadSeries.length - 1)) * chartW;
  const scaleY = (val: number) => padding.top + ((yMax - val) / (yMax - yMin)) * chartH;

  // Build paths
  const spreadPath = spreadSeries
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  const smaPath = sma
    .map((v, i) => {
      if (isNaN(v)) return '';
      const prevValid = i > 0 && !isNaN(sma[i - 1]);
      return `${prevValid ? 'L' : 'M'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  // Bollinger band fill area
  const validStart = sma.findIndex(v => !isNaN(v));
  let bandPath = '';
  if (validStart >= 0) {
    const upperPoints: string[] = [];
    const lowerPoints: string[] = [];
    for (let i = validStart; i < spreadSeries.length; i++) {
      if (!isNaN(upper[i]) && !isNaN(lower[i])) {
        upperPoints.push(`${scaleX(i).toFixed(1)},${scaleY(upper[i]).toFixed(1)}`);
        lowerPoints.push(`${scaleX(i).toFixed(1)},${scaleY(lower[i]).toFixed(1)}`);
      }
    }
    if (upperPoints.length > 1) {
      bandPath = `M${upperPoints.join(' L')} L${lowerPoints.reverse().join(' L')} Z`;
    }
  }

  // Grid lines (5 horizontal)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = yMin + ((yMax - yMin) * i) / 4;
    return { y: scaleY(val), label: fmtNum(val) };
  });

  // X labels
  const xLabelCount = 6;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.floor((i / (xLabelCount - 1)) * (spreadSeries.length - 1));
    return { x: scaleX(idx), label: String(idx) };
  });

  const lastIdx = spreadSeries.length - 1;
  const lastVal = spreadSeries[lastIdx];
  const lastX = scaleX(lastIdx);
  const lastY = scaleY(lastVal);

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={viewWidth - padding.right}
            y2={g.y}
            stroke="rgba(161,161,170,0.12)"
            strokeWidth="0.5"
          />
          <text
            x={padding.left - 6}
            y={g.y + 3}
            textAnchor="end"
            fill="#52525b"
            fontSize="7"
            fontFamily="monospace"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={xl.x}
          y={viewHeight - 6}
          textAnchor="middle"
          fill="#52525b"
          fontSize="7"
          fontFamily="monospace"
        >
          {xl.label}
        </text>
      ))}

      {/* Bollinger band fill */}
      {bandPath && (
        <path d={bandPath} fill="rgba(167,139,250,0.06)" stroke="none" />
      )}

      {/* Upper band */}
      {upper.map((v, i) => {
        if (isNaN(v) || i === 0 || isNaN(upper[i - 1])) return null;
        return (
          <line
            key={`u${i}`}
            x1={scaleX(i - 1)}
            y1={scaleY(upper[i - 1])}
            x2={scaleX(i)}
            y2={scaleY(v)}
            stroke="rgba(167,139,250,0.3)"
            strokeWidth="0.7"
            strokeDasharray="3 2"
          />
        );
      })}

      {/* Lower band */}
      {lower.map((v, i) => {
        if (isNaN(v) || i === 0 || isNaN(lower[i - 1])) return null;
        return (
          <line
            key={`l${i}`}
            x1={scaleX(i - 1)}
            y1={scaleY(lower[i - 1])}
            x2={scaleX(i)}
            y2={scaleY(v)}
            stroke="rgba(167,139,250,0.3)"
            strokeWidth="0.7"
            strokeDasharray="3 2"
          />
        );
      })}

      {/* SMA line */}
      {smaPath && (
        <path d={smaPath} fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
      )}

      {/* Spread line */}
      <path d={spreadPath} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Current point */}
      <circle cx={lastX} cy={lastY} r={3} fill={ACCENT} stroke="#000" strokeWidth="1" />
      <text
        x={lastX - 6}
        y={lastY - 8}
        textAnchor="end"
        fill="#ffffff"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {fmtNum(lastVal)}
      </text>

      {/* Labels */}
      <text x={viewWidth - padding.right} y={padding.top - 6} textAnchor="end" fill="#52525b" fontSize="7" fontFamily="monospace">
        BB(20,2)
      </text>
    </svg>
  );
}

// ── Sector Pairs Breakdown Chart (SVG horizontal bar) ──

function SectorChart({ sectors }: { sectors: any[] }) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
        No sector data
      </div>
    );
  }

  const padding = { top: 8, right: 16, bottom: 8, left: 80 };
  const barHeight = 16;
  const barGap = 4;
  const viewWidth = 400;
  const viewHeight = padding.top + padding.bottom + sectors.length * (barHeight + barGap);

  const maxCount = Math.max(...sectors.map(s => s.pairCount ?? 0), 1);

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {sectors.map((sector, i) => {
        const y = padding.top + i * (barHeight + barGap);
        const barW = ((sector.pairCount ?? 0) / maxCount) * (viewWidth - padding.left - padding.right);
        const avgCorr = sector.avgCorrelation ?? 0;
        const opacity = 0.3 + avgCorr * 0.5;

        return (
          <g key={sector.sector ?? i}>
            {/* Sector label */}
            <text
              x={padding.left - 6}
              y={y + barHeight / 2 + 3}
              textAnchor="end"
              fill="#a1a1aa"
              fontSize="8"
              fontFamily="monospace"
            >
              {(sector.sector ?? 'Unknown').toUpperCase()}
            </text>

            {/* Bar */}
            <rect
              x={padding.left}
              y={y}
              width={Math.max(barW, 2)}
              height={barHeight}
              fill={ACCENT}
              opacity={opacity}
            />

            {/* Count label */}
            <text
              x={padding.left + Math.max(barW, 2) + 4}
              y={y + barHeight / 2 + 3}
              fill="#d4d4d8"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {sector.pairCount ?? 0} ({fmtNum(avgCorr, 2)})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── P&L Equity Curve (SVG) ──

function PnlChart({ pnlHistory }: { pnlHistory: any[] }) {
  if (!pnlHistory || pnlHistory.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-600 text-[8px] font-mono uppercase">
        Insufficient P&L data
      </div>
    );
  }

  const padding = { top: 16, right: 14, bottom: 28, left: 52 };
  const viewWidth = 600;
  const viewHeight = 180;
  const chartW = viewWidth - padding.left - padding.right;
  const chartH = viewHeight - padding.top - padding.bottom;

  const values = pnlHistory.map((p: any) => p.cumPnl ?? p.value ?? 0);
  const timestamps = pnlHistory.map((p: any) => p.timestamp ?? 0);

  const yMin = Math.min(...values, 0);
  const yMax = Math.max(...values, 0);
  const yPad = (yMax - yMin) * 0.1 || 1;
  const adjYMin = yMin - yPad;
  const adjYMax = yMax + yPad;

  const scaleX = (i: number) => padding.left + (i / (values.length - 1)) * chartW;
  const scaleY = (val: number) => padding.top + ((adjYMax - val) / (adjYMax - adjYMin)) * chartH;

  // Zero line
  const zeroY = scaleY(0);

  // Build path
  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    .join(' ');

  // Fill area: above zero = green, below zero = red (simplified: single fill with gradient)
  const fillPath = `${linePath} L${scaleX(values.length - 1).toFixed(1)},${scaleY(0).toFixed(1)} L${scaleX(0).toFixed(1)},${scaleY(0).toFixed(1)} Z`;

  const lastVal = values[values.length - 1];
  const fillColor = lastVal >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)';
  const strokeColor = lastVal >= 0 ? '#34d399' : '#ef4444';

  // X labels
  const xLabelCount = 5;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const idx = Math.floor((i / (xLabelCount - 1)) * (pnlHistory.length - 1));
    const ts = timestamps[idx];
    return { x: scaleX(idx), label: ts ? fmtDate(ts) : String(idx) };
  });

  // Y grid
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = adjYMin + ((adjYMax - adjYMin) * i) / gridCount;
    return { y: scaleY(val), label: fmtCurrency(val) };
  });

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={viewWidth - padding.right}
            y2={g.y}
            stroke="rgba(161,161,170,0.1)"
            strokeWidth="0.5"
          />
          <text x={padding.left - 6} y={g.y + 3} textAnchor="end" fill="#52525b" fontSize="7" fontFamily="monospace">
            {g.label}
          </text>
        </g>
      ))}

      {/* Zero line */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={viewWidth - padding.right}
        y2={zeroY}
        stroke="rgba(161,161,170,0.3)"
        strokeWidth="0.7"
        strokeDasharray="4 2"
      />

      {/* X labels */}
      {xLabels.map((xl, i) => (
        <text key={i} x={xl.x} y={viewHeight - 6} textAnchor="middle" fill="#52525b" fontSize="7" fontFamily="monospace">
          {xl.label}
        </text>
      ))}

      {/* Fill area */}
      <path d={fillPath} fill={fillColor} stroke="none" />

      {/* Line */}
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Current dot */}
      <circle
        cx={scaleX(values.length - 1)}
        cy={scaleY(lastVal)}
        r={3}
        fill={strokeColor}
        stroke="#000"
        strokeWidth="1"
      />
      <text
        x={scaleX(values.length - 1) - 6}
        y={scaleY(lastVal) - 8}
        textAnchor="end"
        fill="#ffffff"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {fmtCurrency(lastVal)}
      </text>
    </svg>
  );
}

// ── Main Panel ──

export function EquityPairsTradingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEquityPairsTrading();
  const [activeTab, setActiveTab] = useState<Tab>('pairs');
  const [selectedPairIdx, setSelectedPairIdx] = useState<number>(0);

  const TABS: { key: Tab; label: string; icon: typeof GitCompareArrows }[] = [
    { key: 'pairs', label: tr(t, 'eptPairs', 'Pairs'), icon: GitCompareArrows },
    { key: 'spread', label: tr(t, 'eptSpread', 'Spread'), icon: TrendingUp },
    { key: 'sectors', label: tr(t, 'eptSectors', 'Sectors'), icon: Layers },
    { key: 'risk', label: tr(t, 'eptRisk', 'Risk'), icon: ShieldAlert },
    { key: 'pnl', label: tr(t, 'eptPnl', 'P&L'), icon: BarChart3 },
  ];

  const pairs = data?.pairs ?? [];
  const selectedPair = pairs[selectedPairIdx] ?? null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'eptTitle', 'Equity Pairs Trading')}
          </span>
          {data && (
            <span
              className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider"
              style={{ color: ACCENT, background: ACCENT_DIM }}
            >
              {pairs.length} {tr(t, 'eptActivePairs', 'Pairs')}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Bar */}
      {data && <SummaryBar data={data} />}

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-0 px-3 py-1 border-b border-border/20 bg-[#030303]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
                activeTab === tab.key
                  ? 'text-violet-400 bg-violet-400/8'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'eptNoData', 'No pairs trading data available')}
          </div>
        )}

        {data && activeTab === 'pairs' && (
          <PairsTab
            pairs={pairs}
            selectedIdx={selectedPairIdx}
            onSelect={(idx) => {
              setSelectedPairIdx(idx);
              setActiveTab('spread');
            }}
          />
        )}
        {data && activeTab === 'spread' && (
          <SpreadTab pair={selectedPair} pairs={pairs} selectedIdx={selectedPairIdx} onSelect={setSelectedPairIdx} />
        )}
        {data && activeTab === 'sectors' && <SectorsTab data={data} />}
        {data && activeTab === 'risk' && <RiskTab data={data} />}
        {data && activeTab === 'pnl' && <PnlTab data={data} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: any }) {
  const t = useT();
  const summary = data.summary ?? {};

  const metrics = [
    {
      label: tr(t, 'eptTotalPairs', 'Active Pairs'),
      value: String(data.pairs?.length ?? 0),
      color: '',
      useAccent: true,
    },
    {
      label: tr(t, 'eptAvgCorr', 'Avg Correlation'),
      value: summary.avgCorrelation != null ? fmtNum(summary.avgCorrelation, 3) : '--',
      color: corrColor(summary.avgCorrelation ?? 0),
    },
    {
      label: tr(t, 'eptOpenSignals', 'Open Signals'),
      value: String(summary.openSignals ?? 0),
      color: 'text-violet-400',
    },
    {
      label: tr(t, 'eptDayPnl', 'Day P&L'),
      value: summary.dayPnl != null ? fmtCurrency(summary.dayPnl) : '--',
      color: pnlColor(summary.dayPnl ?? 0),
    },
    {
      label: tr(t, 'eptWinRate', 'Win Rate'),
      value: summary.winRate != null ? `${fmtNum(summary.winRate, 1)}%` : '--',
      color: (summary.winRate ?? 0) >= 50 ? 'text-emerald-400' : 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 shrink-0">
      {metrics.map((m) => (
        <div key={m.label} className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {m.label}
          </div>
          <div
            className={`text-[9px] font-mono font-bold truncate ${m.useAccent ? '' : m.color}`}
            style={m.useAccent ? { color: ACCENT } : undefined}
          >
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pairs Tab ──

function PairsTab({ pairs, selectedIdx, onSelect }: { pairs: any[]; selectedIdx: number; onSelect: (i: number) => void }) {
  const t = useT();

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_1fr_55px_55px_55px_50px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] shrink-0">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eptStockA', 'Stock A')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eptStockB', 'Stock B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptCorrelation', 'Corr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptZScore', 'Z-Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptSpreadVal', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'eptSignal', 'Signal')}
        </span>
      </div>

      {/* Rows */}
      {pairs.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'eptNoPairs', 'No pairs detected')}
        </div>
      )}
      {pairs.map((pair: any, i: number) => {
        const sig = signalStyle(pair.signal ?? 'NEUTRAL');
        const isSelected = i === selectedIdx;

        return (
          <div
            key={`${pair.stockA}-${pair.stockB}-${i}`}
            onClick={() => onSelect(i)}
            className={`grid grid-cols-[1fr_1fr_55px_55px_55px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center cursor-pointer ${
              isSelected ? 'bg-violet-400/5 border-l-2 border-l-violet-400' : ''
            }`}
          >
            {/* Stock A */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {pair.stockA ?? '--'}
              </span>
              {pair.sectorA && (
                <span className="text-[6px] font-mono text-neutral-600 truncate">
                  {pair.sectorA}
                </span>
              )}
            </div>

            {/* Stock B */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {pair.stockB ?? '--'}
              </span>
              {pair.sectorB && (
                <span className="text-[6px] font-mono text-neutral-600 truncate">
                  {pair.sectorB}
                </span>
              )}
            </div>

            {/* Correlation */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${corrColor(pair.correlation ?? 0)}`}>
              {pair.correlation != null ? fmtNum(pair.correlation, 3) : '--'}
            </span>

            {/* Z-Score */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${zScoreColor(pair.zScore ?? 0)}`}>
              {pair.zScore != null ? fmtNum(pair.zScore, 2) : '--'}
            </span>

            {/* Spread */}
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {pair.spread != null ? fmtNum(pair.spread) : '--'}
            </span>

            {/* Signal badge */}
            <div className="flex justify-center">
              <span
                className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}
              >
                {(pair.signal ?? 'NEUTRAL').toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── Spread Tab ──

function SpreadTab({ pair, pairs, selectedIdx, onSelect }: { pair: any; pairs: any[]; selectedIdx: number; onSelect: (i: number) => void }) {
  const t = useT();

  return (
    <div className="p-2 space-y-2">
      {/* Pair selector */}
      {pairs.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          {pairs.map((p: any, i: number) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-black uppercase transition-all ${
                i === selectedIdx
                  ? 'text-violet-400 bg-violet-400/10 border border-violet-400/30'
                  : 'text-neutral-500 hover:text-white border border-border/10'
              }`}
            >
              {p.stockA}/{p.stockB}
            </button>
          ))}
        </div>
      )}

      {pair ? (
        <>
          {/* Selected pair info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-white">
                {pair.stockA} / {pair.stockB}
              </span>
              {(() => {
                const sig = signalStyle(pair.signal ?? 'NEUTRAL');
                return (
                  <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                    {(pair.signal ?? 'NEUTRAL').toUpperCase()}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-3 text-[7px] font-mono text-neutral-500">
              <span>CORR: <span className={corrColor(pair.correlation ?? 0)}>{fmtNum(pair.correlation ?? 0, 3)}</span></span>
              <span>Z: <span className={zScoreColor(pair.zScore ?? 0)}>{fmtNum(pair.zScore ?? 0, 2)}</span></span>
            </div>
          </div>

          {/* Spread chart with Bollinger bands */}
          <div>
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider px-1 mb-0.5">
              {tr(t, 'eptSpreadChart', 'Spread with Bollinger Bands')}
            </div>
            <div style={{ minHeight: 140 }}>
              <SpreadChart pair={pair} />
            </div>
          </div>

          {/* Pair statistics */}
          <div className="grid grid-cols-4 gap-px bg-border/10">
            {[
              { label: 'Half-Life', value: pair.halfLife != null ? `${fmtNum(pair.halfLife, 1)}d` : '--' },
              { label: 'Hedge Ratio', value: pair.hedgeRatio != null ? fmtNum(pair.hedgeRatio, 3) : '--' },
              { label: 'Mean Spread', value: pair.meanSpread != null ? fmtNum(pair.meanSpread) : '--' },
              { label: 'Spread Std', value: pair.spreadStd != null ? fmtNum(pair.spreadStd, 3) : '--' },
            ].map((stat) => (
              <div key={stat.label} className="bg-black px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{stat.label}</div>
                <div className="text-[9px] font-mono font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'eptSelectPair', 'Select a pair to view spread')}
        </div>
      )}
    </div>
  );
}

// ── Sectors Tab ──

function SectorsTab({ data }: { data: any }) {
  const t = useT();
  const sectors = data.sectors ?? [];

  return (
    <div className="p-2 space-y-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 px-1">
        {tr(t, 'eptSectorBreakdown', 'Sector Pairs Breakdown')}
      </div>

      {/* Sector bar chart */}
      <div style={{ minHeight: 80 }}>
        <SectorChart sectors={sectors} />
      </div>

      {/* Sector table */}
      <div className="grid grid-cols-[1fr_50px_55px_55px_50px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'eptSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptPairCount', 'Pairs')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptAvgCorrelation', 'Avg Corr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'eptAvgZScore', 'Avg Z')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'eptSignals', 'Signals')}
        </span>
      </div>
      {sectors.map((sector: any, i: number) => (
        <div
          key={sector.sector ?? i}
          className="grid grid-cols-[1fr_50px_55px_55px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
            {(sector.sector ?? 'Unknown').toUpperCase()}
          </span>
          <span className="text-[8px] font-mono text-white text-right tabular-nums">
            {sector.pairCount ?? 0}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${corrColor(sector.avgCorrelation ?? 0)}`}>
            {sector.avgCorrelation != null ? fmtNum(sector.avgCorrelation, 3) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${zScoreColor(sector.avgZScore ?? 0)}`}>
            {sector.avgZScore != null ? fmtNum(sector.avgZScore, 2) : '--'}
          </span>
          <span className="text-[8px] font-mono text-violet-400 text-center tabular-nums">
            {sector.activeSignals ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Risk Tab ──

function RiskTab({ data }: { data: any }) {
  const t = useT();
  const risk = data.riskMetrics ?? {};

  const cards = [
    {
      label: tr(t, 'eptSharpe', 'Sharpe Ratio'),
      value: risk.sharpe != null ? fmtNum(risk.sharpe, 2) : '--',
      detail: risk.sharpe != null ? (risk.sharpe >= 1.5 ? 'Excellent' : risk.sharpe >= 1 ? 'Good' : 'Below target') : '',
      color: (risk.sharpe ?? 0) >= 1.5 ? 'text-emerald-400' : (risk.sharpe ?? 0) >= 1 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'eptWinRate', 'Win Rate'),
      value: risk.winRate != null ? `${fmtNum(risk.winRate, 1)}%` : '--',
      detail: risk.totalTrades != null ? `${risk.totalTrades} total trades` : '',
      color: (risk.winRate ?? 0) >= 55 ? 'text-emerald-400' : (risk.winRate ?? 0) >= 45 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'eptMaxDrawdown', 'Max Drawdown'),
      value: risk.maxDrawdown != null ? fmtPct(-Math.abs(risk.maxDrawdown)) : '--',
      detail: risk.drawdownDuration != null ? `${risk.drawdownDuration}d duration` : '',
      color: 'text-red-400',
    },
    {
      label: tr(t, 'eptSortino', 'Sortino Ratio'),
      value: risk.sortino != null ? fmtNum(risk.sortino, 2) : '--',
      detail: 'Downside risk adjusted',
      color: (risk.sortino ?? 0) >= 2 ? 'text-emerald-400' : (risk.sortino ?? 0) >= 1 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'eptAvgHolding', 'Avg Hold Period'),
      value: risk.avgHoldingDays != null ? `${fmtNum(risk.avgHoldingDays, 1)}d` : '--',
      detail: 'Mean reversion window',
      color: 'text-white',
    },
    {
      label: tr(t, 'eptProfitFactor', 'Profit Factor'),
      value: risk.profitFactor != null ? fmtNum(risk.profitFactor, 2) : '--',
      detail: 'Gross profit / loss',
      color: (risk.profitFactor ?? 0) >= 1.5 ? 'text-emerald-400' : (risk.profitFactor ?? 0) >= 1 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'eptAvgWin', 'Avg Win'),
      value: risk.avgWin != null ? fmtCurrency(risk.avgWin) : '--',
      detail: 'Per trade average',
      color: 'text-emerald-400',
    },
    {
      label: tr(t, 'eptAvgLoss', 'Avg Loss'),
      value: risk.avgLoss != null ? fmtCurrency(-Math.abs(risk.avgLoss)) : '--',
      detail: 'Per trade average',
      color: 'text-red-400',
    },
  ];

  // Risk gauge SVG
  const sharpe = risk.sharpe ?? 0;
  const gaugeAngle = Math.min(Math.max(sharpe / 3, 0), 1) * 180;

  return (
    <div className="p-2 space-y-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 px-1">
        {tr(t, 'eptRiskMetrics', 'Risk Metrics')}
      </div>

      {/* Sharpe Gauge */}
      <div className="flex justify-center py-2">
        <svg viewBox="0 0 200 110" className="w-40 h-auto">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(161,161,170,0.1)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Colored segments */}
          <path
            d="M 20 100 A 80 80 0 0 1 66.7 33.4"
            fill="none"
            stroke="rgba(239,68,68,0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 66.7 33.4 A 80 80 0 0 1 133.3 33.4"
            fill="none"
            stroke="rgba(234,179,8,0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 133.3 33.4 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(52,211,153,0.3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos(Math.PI - (gaugeAngle * Math.PI) / 180)}
            y2={100 - 60 * Math.sin(Math.PI - (gaugeAngle * Math.PI) / 180)}
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill={ACCENT} />
          {/* Value */}
          <text x="100" y="92" textAnchor="middle" fill="#ffffff" fontSize="14" fontFamily="monospace" fontWeight="bold">
            {fmtNum(sharpe, 2)}
          </text>
          <text x="100" y="106" textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="monospace">
            SHARPE
          </text>
        </svg>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {cards.map((card) => (
          <div key={card.label} className="bg-black px-2 py-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className={`text-[10px] font-mono font-bold truncate ${card.color}`}>
              {card.value}
            </div>
            {card.detail && (
              <div className="text-[6px] font-mono text-neutral-600 mt-0.5">{card.detail}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── P&L Tab ──

function PnlTab({ data }: { data: any }) {
  const t = useT();
  const pnl = data.pnlSummary ?? {};
  const pnlHistory = data.pnlHistory ?? [];

  const summaryCards = [
    {
      label: tr(t, 'eptTotalPnl', 'Total P&L'),
      value: pnl.totalPnl != null ? fmtCurrency(pnl.totalPnl) : '--',
      color: pnlColor(pnl.totalPnl ?? 0),
    },
    {
      label: tr(t, 'eptDayPnl', 'Today P&L'),
      value: pnl.dayPnl != null ? fmtCurrency(pnl.dayPnl) : '--',
      color: pnlColor(pnl.dayPnl ?? 0),
    },
    {
      label: tr(t, 'eptWeekPnl', 'Week P&L'),
      value: pnl.weekPnl != null ? fmtCurrency(pnl.weekPnl) : '--',
      color: pnlColor(pnl.weekPnl ?? 0),
    },
    {
      label: tr(t, 'eptMonthPnl', 'Month P&L'),
      value: pnl.monthPnl != null ? fmtCurrency(pnl.monthPnl) : '--',
      color: pnlColor(pnl.monthPnl ?? 0),
    },
    {
      label: tr(t, 'eptRealizedPnl', 'Realized'),
      value: pnl.realizedPnl != null ? fmtCurrency(pnl.realizedPnl) : '--',
      color: pnlColor(pnl.realizedPnl ?? 0),
    },
    {
      label: tr(t, 'eptUnrealizedPnl', 'Unrealized'),
      value: pnl.unrealizedPnl != null ? fmtCurrency(pnl.unrealizedPnl) : '--',
      color: pnlColor(pnl.unrealizedPnl ?? 0),
    },
  ];

  // Recent trades
  const recentTrades = data.recentTrades ?? [];

  return (
    <div className="p-2 space-y-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 px-1">
        {tr(t, 'eptPnlSummary', 'P&L Summary')}
      </div>

      {/* P&L cards */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-black px-2 py-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">
              {card.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      {pnlHistory.length >= 2 && (
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider px-1 mb-0.5">
            {tr(t, 'eptEquityCurve', 'Equity Curve')}
          </div>
          <div style={{ minHeight: 120 }}>
            <PnlChart pnlHistory={pnlHistory} />
          </div>
        </div>
      )}

      {/* Recent trades */}
      {recentTrades.length > 0 && (
        <>
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 px-1 pt-1">
            {tr(t, 'eptRecentTrades', 'Recent Trades')}
          </div>
          <div className="grid grid-cols-[1fr_1fr_40px_50px_50px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Pair</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Side</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Entry</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">P&L</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Status</span>
          </div>
          {recentTrades.map((trade: any, i: number) => {
            const sig = signalStyle(trade.side ?? 'NEUTRAL');
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_40px_50px_50px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-mono font-bold truncate" style={{ color: ACCENT }}>
                  {trade.stockA}/{trade.stockB}
                </span>
                <div className="flex justify-center">
                  <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                    {(trade.side ?? '--').toUpperCase()}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
                  {trade.entrySpread != null ? fmtNum(trade.entrySpread) : '--'}
                </span>
                <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${pnlColor(trade.pnl ?? 0)}`}>
                  {trade.pnl != null ? fmtCurrency(trade.pnl) : '--'}
                </span>
                <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums pr-1">
                  {trade.status ?? '--'}
                </span>
              </div>
            );
          })}
        </>
      )}

      {/* Timestamp */}
      <div className="pt-1 border-t border-border/10 px-1">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'eptLastUpdate', 'Last update')}:{' '}
          {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--'}
        </span>
      </div>
    </div>
  );
}
