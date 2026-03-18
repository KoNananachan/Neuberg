import { useState, useMemo } from 'react';
import { useEquityFactorMonitor } from '../../api/hooks/use-equity-factor-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#60a5fa'; // blue-400
const ACCENT_DIM = 'rgba(96,165,250,0.08)';

type Tab = 'performance' | 'spreads' | 'crowding' | 'correlation' | 'movers';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Color helpers ──

function getReturnColor(val: number): string {
  if (val > 0) return '#22c55e';
  if (val < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

function corrColor(v: number): string {
  if (v > 0) {
    const intensity = Math.min(v, 1);
    return `rgba(239,68,68,${0.1 + intensity * 0.6})`;
  }
  if (v < 0) {
    const intensity = Math.min(Math.abs(v), 1);
    return `rgba(59,130,246,${0.1 + intensity * 0.6})`;
  }
  return 'rgba(255,255,255,0.03)';
}

function corrTextColor(v: number): string {
  const abs = Math.abs(v);
  if (abs > 0.6) return '#ffffff';
  if (abs > 0.3) return '#d4d4d8';
  return '#71717a';
}

function getCrowdingSignalColor(signal: string): { bg: string; text: string } {
  switch (signal) {
    case 'CROWDED':
      return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    case 'NORMAL':
      return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
    case 'UNCROWDED':
      return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
    default:
      return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
  }
}

function getRegimeBadgeColor(regime: string): { bg: string; text: string } {
  const r = regime?.toLowerCase() ?? '';
  if (r.includes('risk-on') || r.includes('bull')) return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
  if (r.includes('risk-off') || r.includes('bear')) return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
  if (r.includes('transition') || r.includes('rotation')) return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
  return { bg: 'rgba(96,165,250,0.2)', text: '#60a5fa' };
}

// ── Main Panel ──

export function EquityFactorMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEquityFactorMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('performance');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'performance', label: 'PERFORMANCE' },
    { key: 'spreads', label: 'SPREADS' },
    { key: 'crowding', label: 'CROWDING' },
    { key: 'correlation', label: 'CORRELATION' },
    { key: 'movers', label: 'MOVERS' },
  ];

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div
          className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
          style={{ color: ACCENT }}
        >
          LOADING FACTOR DATA...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="text-[8px] font-mono uppercase px-2 py-1 border border-border/20 text-blue-400/60 hover:text-blue-400 hover:border-blue-400/30 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Regime Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="8" width="2" height="7" fill={ACCENT} opacity="0.5" />
            <rect x="4" y="5" width="2" height="10" fill={ACCENT} opacity="0.65" />
            <rect x="7" y="2" width="2" height="13" fill={ACCENT} opacity="0.8" />
            <rect x="10" y="6" width="2" height="9" fill={ACCENT} opacity="0.7" />
            <rect x="13" y="4" width="2" height="11" fill={ACCENT} />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'efmTitle', 'Equity Factor Monitor')}
          </span>
          {data.regime && (
            <span
              className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px]"
              style={{
                background: getRegimeBadgeColor(data.regime.current).bg,
                color: getRegimeBadgeColor(data.regime.current).text,
              }}
            >
              {data.regime.current}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Regime Info Bar */}
      {data.regime && (
        <div className="flex items-center gap-4 px-3 py-1 border-b border-border/20 bg-[#030303] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">DOMINANT</span>
            <span className="text-[8px] font-bold" style={{ color: '#22c55e' }}>
              {data.regime.dominantFactor}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">WORST</span>
            <span className="text-[8px] font-bold" style={{ color: '#ef4444' }}>
              {data.regime.worstFactor}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">AGE</span>
            <span className="text-[8px] font-bold text-neutral-400">
              {data.regime.ageDays}D
            </span>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === tab.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: activeTab === tab.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'performance' && <PerformanceTab data={data} />}
        {activeTab === 'spreads' && <SpreadsTab data={data} />}
        {activeTab === 'crowding' && <CrowdingTab data={data} />}
        {activeTab === 'correlation' && <CorrelationTab data={data} />}
        {activeTab === 'movers' && <MoversTab data={data} />}
      </div>
    </div>
  );
}

// ── 1. Performance Tab ──

function PerformanceTab({ data }: { data: any }) {
  const t = useT();

  const [sortCol, setSortCol] = useState<string>('daily');
  const [sortAsc, setSortAsc] = useState(false);

  const factors = useMemo(() => {
    if (!data?.factors) return [];
    const arr = [...data.factors];
    arr.sort((a: any, b: any) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'efmPerfHeader', 'Factor Performance Summary')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <SortHeader col="name" label="Factor" />
            <SortHeader col="daily" label="Daily" right />
            <SortHeader col="mtd" label="MTD" right />
            <SortHeader col="ytd" label="YTD" right />
            <SortHeader col="sharpe" label="Sharpe" right />
            <SortHeader col="maxDD" label="Max DD" right />
            <th className="px-2 py-1.5 text-center font-bold">Z-Score</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((factor: any) => (
            <tr
              key={factor.name}
              className="border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{factor.name}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(factor.daily) }}>
                  {fmtPct(factor.daily)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(factor.mtd) }}>
                  {fmtPct(factor.mtd)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(factor.ytd) }}>
                  {fmtPct(factor.ytd)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span
                  className="font-bold"
                  style={{ color: factor.sharpe >= 1 ? '#22c55e' : factor.sharpe < 0 ? '#ef4444' : '#71717a' }}
                >
                  {fmtNum(factor.sharpe)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold text-red-400/80">
                  {fmtPct(factor.maxDD)}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <div className="flex justify-center">
                  <ZScoreBar value={factor.zScore} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Z-Score Bar ──

function ZScoreBar({ value }: { value: number }) {
  const W = 40;
  const H = 10;
  const CENTER = W / 2;
  const maxZ = 3;
  const clampedZ = Math.max(-maxZ, Math.min(maxZ, value));
  const barWidth = (Math.abs(clampedZ) / maxZ) * (W / 2 - 2);
  const isPositive = clampedZ >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
      <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
      <rect x={barX} y={1} width={Math.max(barWidth, 0.5)} height={H - 2} fill={color} opacity={0.7} />
      <text
        x={isPositive ? barX + barWidth + 1.5 : barX - 1.5}
        y={H / 2 + 0.5}
        textAnchor={isPositive ? 'start' : 'end'}
        dominantBaseline="middle"
        fill={color}
        fontSize={5.5}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </text>
    </svg>
  );
}

// ── 2. Spreads Tab ──

function SpreadsTab({ data }: { data: any }) {
  const t = useT();

  const spreads = data?.spreads ?? [];

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'efmSpreadsHeader', 'Long/Short Factor Spreads')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Factor</th>
            <th className="px-2 py-1.5 text-right font-bold">Long Leg</th>
            <th className="px-2 py-1.5 text-right font-bold">Short Leg</th>
            <th className="px-2 py-1.5 text-right font-bold">Spread</th>
            <th className="px-2 py-1.5 text-right font-bold">Vol</th>
            <th className="px-2 py-1.5 text-right font-bold">IR</th>
          </tr>
        </thead>
        <tbody>
          {spreads.map((s: any) => (
            <tr
              key={s.factor}
              className="border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <span className="font-bold" style={{ color: ACCENT }}>{s.factor}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(s.longReturn) }}>
                  {fmtPct(s.longReturn)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(s.shortReturn) }}>
                  {fmtPct(s.shortReturn)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className="font-bold" style={{ color: getReturnColor(s.spreadReturn) }}>
                  {fmtPct(s.spreadReturn)}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-neutral-400">
                {fmtNum(s.vol, 1)}%
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span
                  className="font-bold"
                  style={{ color: s.informationRatio >= 0.5 ? '#22c55e' : s.informationRatio < 0 ? '#ef4444' : '#71717a' }}
                >
                  {fmtNum(s.informationRatio)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 3. Crowding Tab ──

function CrowdingTab({ data }: { data: any }) {
  const t = useT();

  const crowding = data?.crowding ?? [];

  return (
    <div className="px-3 py-2">
      <div className="mb-2">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'efmCrowdingHeader', 'Factor Crowding Scores')}
        </span>
      </div>
      <div className="space-y-1.5">
        {crowding.map((c: any) => {
          const signalColor = getCrowdingSignalColor(c.signal);
          return (
            <div
              key={c.factor}
              className="flex items-center gap-2 py-1 px-1 hover:bg-blue-400/[0.02] transition-colors border-b border-border/20"
            >
              {/* Factor name */}
              <span className="text-[8px] font-bold w-20 shrink-0" style={{ color: ACCENT }}>
                {c.factor}
              </span>

              {/* Bar */}
              <div className="flex-1 h-3 bg-white/[0.03] relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(100, Math.max(0, c.score))}%`,
                    background: signalColor.text,
                    opacity: 0.5,
                  }}
                />
                {/* Threshold markers */}
                <div
                  className="absolute inset-y-0 w-px bg-white/10"
                  style={{ left: '33%' }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-white/10"
                  style={{ left: '66%' }}
                />
              </div>

              {/* Score */}
              <span className="text-[8px] font-bold tabular-nums text-neutral-300 w-8 text-right">
                {Math.round(c.score)}
              </span>

              {/* Signal badge */}
              <span
                className="text-[6px] font-black uppercase px-1.5 py-[1px] w-[60px] text-center"
                style={{ background: signalColor.bg, color: signalColor.text }}
              >
                {c.signal}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/20">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ background: 'rgba(34,197,94,0.5)' }} />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Uncrowded (0-33)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ background: 'rgba(234,179,8,0.5)' }} />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Normal (34-66)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ background: 'rgba(239,68,68,0.5)' }} />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Crowded (67-100)</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. Correlation Tab ──

function CorrelationTab({ data }: { data: any }) {
  const t = useT();

  const matrix = data?.correlationMatrix;
  if (!matrix || !matrix.names || !matrix.values) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        No correlation data
      </div>
    );
  }

  const { names, values } = matrix;
  const n = names.length;

  const shortLabels = useMemo(() => {
    const labelMap: Record<string, string> = {
      'Value': 'VAL',
      'Momentum': 'MOM',
      'Quality': 'QUAL',
      'Size': 'SIZE',
      'Low Volatility': 'LVOL',
      'Growth': 'GRTH',
      'Dividend Yield': 'DIVY',
    };
    return names.map((name: any) => labelMap[name] || name.slice(0, 4).toUpperCase());
  }, [names]);

  const CELL = 32;
  const LABEL_W = 42;
  const LABEL_H = 42;
  const W = LABEL_W + n * CELL;
  const H = LABEL_H + n * CELL;

  return (
    <div className="px-3 py-2">
      <div className="mb-2">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'efmCorrHeader', '7x7 Factor Correlation Matrix')}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
        {/* Top labels */}
        {shortLabels.map((label: any, i: any) => (
          <text
            key={`top-${i}`}
            x={LABEL_W + i * CELL + CELL / 2}
            y={LABEL_H - 6}
            textAnchor="middle"
            fill="#71717a"
            fontSize={6.5}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {label}
          </text>
        ))}

        {/* Left labels */}
        {shortLabels.map((label: any, i: any) => (
          <text
            key={`left-${i}`}
            x={LABEL_W - 4}
            y={LABEL_H + i * CELL + CELL / 2 + 1}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#71717a"
            fontSize={6.5}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {values.map((row: any, i: any) =>
          row.map((val: any, j: any) => {
            const x = LABEL_W + j * CELL;
            const y = LABEL_H + i * CELL;
            const isDiagonal = i === j;
            const bg = isDiagonal ? 'rgba(63,63,70,0.3)' : corrColor(val);
            const textFill = isDiagonal ? '#a1a1aa' : corrTextColor(val);

            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  fill={bg}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth={0.5}
                />
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textFill}
                  fontSize={6.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isDiagonal ? '1.00' : val.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(59,130,246,0.5)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(255,255,255,0.05)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Zero</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(239,68,68,0.5)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Positive</span>
        </div>
      </div>
    </div>
  );
}

// ── 5. Movers Tab ──

function MoversTab({ data }: { data: any }) {
  const t = useT();

  const longMovers = data?.movers?.long ?? [];
  const shortMovers = data?.movers?.short ?? [];

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Long Side */}
        <div>
          <div className="mb-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
              {tr(t, 'efmLongSide', 'Top Long-Side Movers')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
              <tr>
                <th className="px-1.5 py-1 text-left font-bold">Ticker</th>
                <th className="px-1.5 py-1 text-right font-bold">Score</th>
                <th className="px-1.5 py-1 text-right font-bold">Return</th>
              </tr>
            </thead>
            <tbody>
              {longMovers.map((m: any) => (
                <tr
                  key={m.ticker}
                  className="border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1">
                    <span className="font-bold" style={{ color: ACCENT }}>{m.ticker}</span>
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums text-neutral-300">
                    {fmtNum(m.factorScore)}
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums">
                    <span className="font-bold" style={{ color: getReturnColor(m.dailyReturn) }}>
                      {fmtPct(m.dailyReturn)}
                    </span>
                  </td>
                </tr>
              ))}
              {longMovers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-1.5 py-3 text-center text-neutral-600 uppercase">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Short Side */}
        <div>
          <div className="mb-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
              {tr(t, 'efmShortSide', 'Top Short-Side Movers')}
            </span>
          </div>
          <table className="w-full text-[9px] font-mono">
            <thead className="text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-border/20">
              <tr>
                <th className="px-1.5 py-1 text-left font-bold">Ticker</th>
                <th className="px-1.5 py-1 text-right font-bold">Score</th>
                <th className="px-1.5 py-1 text-right font-bold">Return</th>
              </tr>
            </thead>
            <tbody>
              {shortMovers.map((m: any) => (
                <tr
                  key={m.ticker}
                  className="border-b border-border/20 hover:bg-blue-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1">
                    <span className="font-bold text-red-400">{m.ticker}</span>
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums text-neutral-300">
                    {fmtNum(m.factorScore)}
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums">
                    <span className="font-bold" style={{ color: getReturnColor(m.dailyReturn) }}>
                      {fmtPct(m.dailyReturn)}
                    </span>
                  </td>
                </tr>
              ))}
              {shortMovers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-1.5 py-3 text-center text-neutral-600 uppercase">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
