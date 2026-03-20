import { useState } from 'react';
import { useCorrelationRisk } from '../../api/hooks/use-correlation-risk';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const VIOLET = '#a78bfa';
const VIOLET_DIM = 'rgba(167,139,250,0.12)';

const MATRIX_ASSETS = ['SPX', 'Bonds', 'Gold', 'USD', 'Oil', 'EM', 'HY', 'VIX'] as const;

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Energy', 'Cons. Disc.',
  'Cons. Staples', 'Industrials', 'Materials', 'Utilities', 'Real Estate', 'Comm. Svcs',
] as const;

type ViewTab = 'OVERVIEW' | 'MATRIX' | 'SECTORS' | 'TAIL';

// ── Color helpers ──

function heatmapBg(value: number): string {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    const t = v;
    return `rgba(239,68,68,${0.08 + t * 0.52})`;
  } else {
    const t = -v;
    return `rgba(59,130,246,${0.08 + t * 0.52})`;
  }
}

function heatmapText(value: number): string {
  const a = Math.abs(value);
  if (a > 0.7) return '#ffffff';
  if (a > 0.4) return '#d4d4d8';
  return '#a1a1aa';
}

function isExtreme(value: number): boolean {
  return Math.abs(value) > 0.8;
}

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function levelBadge(level: string): { text: string; bg: string; color: string } {
  switch (level) {
    case 'low':
      return { text: 'LOW', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'moderate':
      return { text: 'MODERATE', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
    case 'elevated':
      return { text: 'ELEVATED', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'high':
      return { text: 'HIGH', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    case 'extreme':
      return { text: 'EXTREME', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: level.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function regimeBadge(regime: string): { text: string; bg: string; color: string } {
  switch (regime) {
    case 'risk-on':
      return { text: 'RISK-ON', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'risk-off':
      return { text: 'RISK-OFF', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'transition':
      return { text: 'TRANSITION', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'crisis':
      return { text: 'CRISIS', bg: 'rgba(239,68,68,0.25)', color: '#ef4444' };
    default:
      return { text: regime.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function signalBadge(signal: string): { text: string; bg: string; color: string } {
  switch (signal) {
    case 'long':
      return { text: 'LONG', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'short':
      return { text: 'SHORT', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'neutral':
      return { text: 'NEUTRAL', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'elevated':
      return { text: 'ELEVATED', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'depressed':
      return { text: 'DEPRESSED', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' };
    case 'normal':
      return { text: 'NORMAL', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
    default:
      return { text: signal.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

// ── Main Panel ──

export function CorrelationRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCorrelationRisk();
  const [view, setView] = useState<ViewTab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <rect x="9" y="1" width="6" height="6" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <rect x="1" y="9" width="6" height="6" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <rect x="9" y="9" width="6" height="6" stroke={VIOLET} strokeWidth="1.2" fill="none" />
            <line x1="4" y1="7" x2="4" y2="9" stroke={VIOLET} strokeWidth="0.8" opacity="0.5" />
            <line x1="12" y1="7" x2="12" y2="9" stroke={VIOLET} strokeWidth="0.8" opacity="0.5" />
            <line x1="7" y1="4" x2="9" y2="4" stroke={VIOLET} strokeWidth="0.8" opacity="0.5" />
            <line x1="7" y1="12" x2="9" y2="12" stroke={VIOLET} strokeWidth="0.8" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: VIOLET }}>
            {tr(t, 'corrRiskTitle', 'Correlation Risk Monitor')}
          </span>
          {data?.summary && (() => {
            const badge = levelBadge(data.summary.overallLevel);
            return (
              <span
                className="text-[7px] font-black uppercase px-1.5 py-[1px] ml-1"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.text}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-1">
          {(['OVERVIEW', 'MATRIX', 'SECTORS', 'TAIL'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? VIOLET_DIM : 'transparent',
                color: view === v ? VIOLET : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-violet-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'corrRiskNoData', 'No data available')}
          </div>
        )}

        {data && view === 'OVERVIEW' && <OverviewView data={data} />}
        {data && view === 'MATRIX' && <MatrixView data={data} />}
        {data && view === 'SECTORS' && <SectorsView data={data} />}
        {data && view === 'TAIL' && <TailView data={data} />}
      </div>
    </div>
  );
}

// ── OVERVIEW View ──

function OverviewView({ data }: { data: any }) {
  const t = useT();
  const { summary, impliedCorrelation, regime, equityCorrelation } = data;

  return (
    <div className="text-[9px]">
      {/* Summary Bar */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/20">
        <SummaryCell
          label="Overall Level"
          value={summary?.overallLevel?.toUpperCase() ?? '---'}
          color={levelBadge(summary?.overallLevel ?? '').color}
          badge
        />
        <SummaryCell
          label="Impl vs Realized"
          value={summary?.impliedVsRealized != null ? `${changeSign(summary.impliedVsRealized)}${summary.impliedVsRealized.toFixed(2)}` : '---'}
          color={summary?.impliedVsRealized > 0 ? '#f87171' : '#34d399'}
        />
        <SummaryCell
          label="Diversification"
          value={summary?.diversificationBenefit != null ? `${summary.diversificationBenefit.toFixed(1)}%` : '---'}
          color={VIOLET}
        />
        <SummaryCell
          label="Risk Concentration"
          value={summary?.riskConcentration ?? '---'}
          color={summary?.riskConcentration === 'high' ? '#f87171' : summary?.riskConcentration === 'moderate' ? '#fbbf24' : '#34d399'}
        />
        <SummaryCell
          label="Key Corr Shift"
          value={summary?.keyCorrelationShift ?? '---'}
          color="#d4d4d8"
        />
      </div>

      {/* Implied Correlation Section */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'corrRiskImplied', 'Implied Correlation (CBOE)')}
        </div>
        <div className="grid grid-cols-5 gap-0 border border-border/10">
          <MetricCell label="Index Level" value={impliedCorrelation?.level?.toFixed(1) ?? '---'} color={VIOLET} />
          <MetricCell
            label="Change"
            value={impliedCorrelation?.change != null ? `${changeSign(impliedCorrelation.change)}${impliedCorrelation.change.toFixed(2)}` : '---'}
            color={impliedCorrelation?.change > 0 ? '#f87171' : '#34d399'}
          />
          <MetricCell
            label="Percentile"
            value={impliedCorrelation?.percentile != null ? `${impliedCorrelation.percentile}th` : '---'}
            color={impliedCorrelation?.percentile > 80 ? '#f87171' : impliedCorrelation?.percentile > 60 ? '#fbbf24' : VIOLET}
          />
          <MetricCell label="Hist Avg" value={impliedCorrelation?.historicalAvg?.toFixed(1) ?? '---'} color="#737373" />
          <div className="px-2 py-1.5 border-l border-border/10 flex flex-col justify-center">
            <div className="text-[6px] text-neutral-600 uppercase">Signal</div>
            {impliedCorrelation?.signal && (() => {
              const s = signalBadge(impliedCorrelation.signal);
              return (
                <span
                  className="text-[8px] font-black uppercase px-1 py-[1px] mt-0.5 inline-block w-fit"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.text}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Regime Analysis */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'corrRiskRegime', 'Regime Analysis')}
        </div>
        <div className="grid grid-cols-5 gap-0 border border-border/10">
          <div className="px-2 py-1.5 border-r border-border/10">
            <div className="text-[6px] text-neutral-600 uppercase">Current Regime</div>
            {regime?.current && (() => {
              const r = regimeBadge(regime.current);
              return (
                <span
                  className="text-[9px] font-black uppercase px-1 py-[1px] mt-0.5 inline-block"
                  style={{ background: r.bg, color: r.color }}
                >
                  {r.text}
                </span>
              );
            })()}
          </div>
          <MetricCell
            label="Stk-Bond Corr"
            value={regime?.stockBondCorrelation?.toFixed(3) ?? '---'}
            color={regime?.stockBondCorrelation > 0 ? '#f87171' : '#60a5fa'}
          />
          <MetricCell
            label="Breakdown Count"
            value={regime?.breakdownCount?.toString() ?? '---'}
            color={regime?.breakdownCount > 3 ? '#f87171' : '#a1a1aa'}
          />
          <MetricCell
            label="Regime Chg Prob"
            value={regime?.regimeChangeProbability != null ? `${(regime.regimeChangeProbability * 100).toFixed(0)}%` : '---'}
            color={regime?.regimeChangeProbability > 0.5 ? '#fbbf24' : '#a1a1aa'}
          />
          <MetricCell label="Duration" value={regime?.duration ?? '---'} color="#737373" />
        </div>
      </div>

      {/* Equity Correlation Metrics */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'corrRiskEquity', 'Equity Correlation Metrics')}
        </div>
        <div className="grid grid-cols-6 gap-0 border border-border/10">
          <MetricCell label="Avg Pairwise" value={equityCorrelation?.avgPairwise?.toFixed(3) ?? '---'} color={VIOLET} />
          <MetricCell label="Implied" value={equityCorrelation?.implied?.toFixed(3) ?? '---'} color={VIOLET} />
          <MetricCell
            label="Dispersion Idx"
            value={equityCorrelation?.dispersionIndex?.toFixed(2) ?? '---'}
            color={equityCorrelation?.dispersionIndex > 20 ? '#fb923c' : '#a78bfa'}
          />
          <MetricCell label="Sector Avg" value={equityCorrelation?.sectorAvg?.toFixed(3) ?? '---'} color="#a1a1aa" />
          <MetricCell label="Single Stock" value={equityCorrelation?.singleStockAvg?.toFixed(3) ?? '---'} color="#a1a1aa" />
          <MetricCell
            label="Skew"
            value={equityCorrelation?.skew?.toFixed(3) ?? '---'}
            color={equityCorrelation?.skew > 0 ? '#f87171' : '#60a5fa'}
          />
        </div>
      </div>

      {/* Dispersion Trades */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
          {tr(t, 'corrRiskDispersion', 'Dispersion Trades')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase">Underlying</span>
          <span className="text-[6px] text-neutral-600 uppercase text-right">Impl Corr</span>
          <span className="text-[6px] text-neutral-600 uppercase text-right">Real Corr</span>
          <span className="text-[6px] text-neutral-600 uppercase text-right">Spread</span>
          <span className="text-[6px] text-neutral-600 uppercase text-right pr-1">Signal</span>
        </div>

        {(data.dispersionTrades ?? []).map((trade: any, i: number) => {
          const s = signalBadge(trade.signal ?? 'neutral');
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{trade.underlying}</span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {trade.impliedCorr?.toFixed(3) ?? '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {trade.realizedCorr?.toFixed(3) ?? '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(trade.spread ?? 0)}`}>
                {trade.spread != null ? `${changeSign(trade.spread)}${trade.spread.toFixed(3)}` : '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MATRIX View: 8x8 Cross-Asset Correlation Heatmap ──

function MatrixView({ data }: { data: any }) {
  const t = useT();
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);

  const matrix: number[][] = data.crossAssetMatrix?.values ??
    MATRIX_ASSETS.map((_, i) =>
      MATRIX_ASSETS.map((_, j) => (i === j ? 1 : 0))
    );

  const n = MATRIX_ASSETS.length;
  const CELL = 28;
  const LABEL_W = 40;
  const LABEL_H = 42;
  const gridW = LABEL_W + n * CELL;
  const gridH = LABEL_H + n * CELL;

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">
        {tr(t, 'corrRiskMatrix', 'Cross-Asset Correlation Matrix (8x8)')}
      </div>

      <div className="overflow-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${gridW + 10} ${gridH + 22}`}
          className="w-full"
          style={{ maxHeight: 380, minWidth: 320 }}
        >
          {/* Column labels */}
          {MATRIX_ASSETS.map((name, j) => (
            <text
              key={`col-${j}`}
              x={LABEL_W + j * CELL + CELL / 2}
              y={LABEL_H - 4}
              textAnchor="middle"
              fill={VIOLET}
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-45, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 4})`}
            >
              {name}
            </text>
          ))}

          {/* Row labels */}
          {MATRIX_ASSETS.map((name, i) => (
            <text
              key={`row-${i}`}
              x={LABEL_W - 4}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill={VIOLET}
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name}
            </text>
          ))}

          {/* Cells */}
          {matrix.map((row: number[], i: number) =>
            row.map((val: number, j: number) => {
              const isDiag = i === j;
              const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
              const extreme = !isDiag && isExtreme(val);
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={LABEL_W + j * CELL}
                    y={LABEL_H + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={isDiag ? 'rgba(63,63,70,0.2)' : heatmapBg(val)}
                    stroke={isHovered ? '#fff' : extreme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                    strokeWidth={isHovered ? 1.5 : extreme ? 0.8 : 0.3}
                    onMouseEnter={() => setHoveredCell({ i, j })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{ cursor: isDiag ? 'default' : 'crosshair' }}
                  />
                  <text
                    x={LABEL_W + j * CELL + CELL / 2}
                    y={LABEL_H + i * CELL + CELL / 2 + 2.5}
                    textAnchor="middle"
                    fill={isDiag ? 'rgba(255,255,255,0.25)' : heatmapText(val)}
                    fontSize={6.5}
                    fontFamily="monospace"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {isDiag ? '1.00' : val.toFixed(2)}
                  </text>
                </g>
              );
            })
          )}

          {/* Hover tooltip */}
          {hoveredCell && hoveredCell.i !== hoveredCell.j && (() => {
            const { i, j } = hoveredCell;
            const val = matrix[i]?.[j] ?? 0;
            const tx = Math.min(LABEL_W + j * CELL + CELL / 2, gridW - 50);
            const ty = LABEL_H + i * CELL - 5;
            return (
              <g>
                <rect
                  x={tx - 48} y={ty - 10} width={96} height={14} rx={1}
                  fill="rgba(0,0,0,0.92)" stroke="rgba(167,139,250,0.5)" strokeWidth={0.5}
                />
                <text x={tx} y={ty - 1} textAnchor="middle" fill="#e4e4e7" fontSize={6} fontFamily="monospace">
                  {MATRIX_ASSETS[i]}/{MATRIX_ASSETS[j]}: {val.toFixed(3)}{isExtreme(val) ? ' EXTREME' : ''}
                </text>
              </g>
            );
          })()}

          {/* Color scale legend */}
          {[
            { val: -1.0, label: '-1.0' },
            { val: -0.5, label: '-0.5' },
            { val: 0, label: '0' },
            { val: 0.5, label: '+0.5' },
            { val: 1.0, label: '+1.0' },
          ].map((item, idx) => (
            <g key={`legend-${idx}`}>
              <rect
                x={LABEL_W + idx * 24}
                y={gridH + 4}
                width={18}
                height={5}
                fill={heatmapBg(item.val)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.3}
              />
              <text
                x={LABEL_W + idx * 24 + 9}
                y={gridH + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize={5}
                fontFamily="monospace"
              >
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Extreme correlation callout */}
      {(() => {
        const extremes: { a1: string; a2: string; val: number }[] = [];
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (matrix[i]?.[j] != null && isExtreme(matrix[i][j])) {
              extremes.push({ a1: MATRIX_ASSETS[i], a2: MATRIX_ASSETS[j], val: matrix[i][j] });
            }
          }
        }
        if (extremes.length === 0) return null;
        return (
          <div className="mt-2 px-1">
            <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">
              Extreme Correlations (&gt;0.8 or &lt;-0.8)
            </div>
            <div className="flex flex-wrap gap-1">
              {extremes.map((e, i) => (
                <span
                  key={i}
                  className="text-[7px] font-bold px-1.5 py-[2px]"
                  style={{
                    background: e.val > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                    color: e.val > 0 ? '#f87171' : '#60a5fa',
                  }}
                >
                  {e.a1}/{e.a2}: {e.val > 0 ? '+' : ''}{e.val.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── SECTORS View ──

function SectorsView({ data }: { data: any }) {
  const t = useT();
  const sectorData: any[] = data.sectorCorrelations ?? [];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'corrRiskSectors', 'Sector Correlations (11 GICS Sectors)')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px_44px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Sector</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">SPX</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Bonds</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Dollar</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Intra</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">1M Chg</span>
      </div>

      {/* Rows */}
      {sectorData.length > 0
        ? sectorData.map((sector: any, i: number) => (
            <SectorRow key={i} sector={sector} />
          ))
        : SECTORS.map((name) => (
            <SectorRow
              key={name}
              sector={{
                name,
                corrSPX: 0,
                corrBonds: 0,
                corrDollar: 0,
                avgIntraSector: 0,
                change1M: 0,
              }}
            />
          ))}
    </div>
  );
}

function SectorRow({ sector }: { sector: any }) {
  const corrCellStyle = (val: number) => ({
    background: heatmapBg(val),
    color: heatmapText(val),
  });

  return (
    <div className="grid grid-cols-[1fr_48px_48px_48px_48px_44px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center">
      <span className="text-[8px] font-bold text-neutral-300 truncate">
        {sector.name}
      </span>
      <span
        className="text-[8px] font-bold text-right tabular-nums px-1 py-[1px]"
        style={corrCellStyle(sector.corrSPX)}
      >
        {sector.corrSPX?.toFixed(2) ?? '---'}
      </span>
      <span
        className="text-[8px] font-bold text-right tabular-nums px-1 py-[1px]"
        style={corrCellStyle(sector.corrBonds)}
      >
        {sector.corrBonds?.toFixed(2) ?? '---'}
      </span>
      <span
        className="text-[8px] font-bold text-right tabular-nums px-1 py-[1px]"
        style={corrCellStyle(sector.corrDollar)}
      >
        {sector.corrDollar?.toFixed(2) ?? '---'}
      </span>
      <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
        {sector.avgIntraSector?.toFixed(2) ?? '---'}
      </span>
      <span className={`text-[8px] font-bold text-right tabular-nums pr-1 ${changeColor(sector.change1M ?? 0)}`}>
        {sector.change1M != null ? `${changeSign(sector.change1M)}${sector.change1M.toFixed(2)}` : '---'}
      </span>
    </div>
  );
}

// ── TAIL View: Tail Correlation + Dispersion Trades ──

function TailView({ data }: { data: any }) {
  const t = useT();
  const tail = data.tailCorrelation ?? {};

  const tailMetrics = [
    { label: 'Left Tail Corr', value: tail.leftTail, color: '#f87171' },
    { label: 'Right Tail Corr', value: tail.rightTail, color: '#34d399' },
    { label: 'Tail Spread', value: tail.spread, color: VIOLET },
    { label: 'Stress Test Corr', value: tail.stressTestCorr, color: '#fbbf24' },
    { label: 'Worst-Case Impact', value: tail.worstCaseImpact, suffix: '%', color: '#ef4444' },
  ];

  return (
    <div className="px-2 py-2 text-[9px]">
      {/* Tail Correlation Section */}
      <div className="border-b border-border/20 pb-2 mb-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'corrRiskTail', 'Tail Correlation Analysis')}
        </div>

        <div className="grid grid-cols-5 gap-0 border border-border/10">
          {tailMetrics.map((m) => (
            <div key={m.label} className="px-2 py-2 border-r border-border/10 last:border-r-0">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider mb-1">{m.label}</div>
              <div className="text-[14px] font-black tabular-nums" style={{ color: m.color }}>
                {m.value != null ? `${m.value.toFixed(3)}${m.suffix ?? ''}` : '---'}
              </div>
            </div>
          ))}
        </div>

        {/* Tail correlation visual bar */}
        {tail.leftTail != null && tail.rightTail != null && (
          <div className="mt-2 px-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[7px] text-neutral-500 uppercase w-16">Left Tail</span>
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                <div
                  className="h-full absolute left-0 top-0"
                  style={{ width: `${Math.abs(tail.leftTail) * 100}%`, background: 'rgba(248,113,113,0.6)' }}
                />
              </div>
              <span className="text-[8px] font-bold tabular-nums text-red-400 w-10 text-right">
                {tail.leftTail.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] text-neutral-500 uppercase w-16">Right Tail</span>
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                <div
                  className="h-full absolute left-0 top-0"
                  style={{ width: `${Math.abs(tail.rightTail) * 100}%`, background: 'rgba(52,211,153,0.6)' }}
                />
              </div>
              <span className="text-[8px] font-bold tabular-nums text-emerald-400 w-10 text-right">
                {tail.rightTail.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dispersion Trades (duplicate in TAIL for full detail) */}
      <div>
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'corrRiskDispTrades', 'Dispersion Trade Opportunities')}
        </div>

        <div className="grid grid-cols-[1fr_55px_55px_45px_45px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Underlying</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Impl Corr</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Real Corr</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Signal</span>
        </div>

        {(data.dispersionTrades ?? []).map((trade: any, i: number) => {
          const s = signalBadge(trade.signal ?? 'neutral');
          const spreadVal = trade.spread ?? (trade.impliedCorr != null && trade.realizedCorr != null
            ? trade.impliedCorr - trade.realizedCorr
            : null);
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_55px_55px_45px_45px] gap-0 px-1 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{trade.underlying}</span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {trade.impliedCorr?.toFixed(3) ?? '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {trade.realizedCorr?.toFixed(3) ?? '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(spreadVal ?? 0)}`}>
                {spreadVal != null ? `${changeSign(spreadVal)}${spreadVal.toFixed(3)}` : '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.text}
                </span>
              </div>
            </div>
          );
        })}

        {(!data.dispersionTrades || data.dispersionTrades.length === 0) && (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No dispersion trades available
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared Components ──

function SummaryCell({ label, value, color, badge }: { label: string; value: string; color: string; badge?: boolean }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      {badge ? (
        <span
          className="text-[9px] font-black uppercase px-1 py-[1px] mt-0.5 inline-block"
          style={{ background: `${color}20`, color }}
        >
          {value}
        </span>
      ) : (
        <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
          {value}
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
