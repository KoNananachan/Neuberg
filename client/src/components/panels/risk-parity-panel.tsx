import { useMemo } from 'react';
import {
  useRiskParity,
  type RiskParityData,
  type RiskParityAsset,
  type PortfolioStats,
  type RiskBudgetEntry,
} from '../../api/hooks/use-risk-parity';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#ec4899'; // pink-400

const CLASS_COLORS: Record<RiskParityAsset['class'], string> = {
  equity: '#3b82f6',     // blue
  bond: '#22c55e',       // green
  commodity: '#f59e0b',  // amber
  real_estate: '#a855f7', // purple
  cash: '#6b7280',       // gray
};

const CLASS_LABELS: Record<RiskParityAsset['class'], string> = {
  equity: 'EQ',
  bond: 'BD',
  commodity: 'CM',
  real_estate: 'RE',
  cash: 'CA',
};

// ── Helpers ──

function fmtPct(n: number, decimals: number = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

function betterHighlight(rpVal: number, ewVal: number, higherIsBetter: boolean): { rp: boolean; ew: boolean } {
  if (higherIsBetter) {
    return { rp: rpVal > ewVal, ew: ewVal > rpVal };
  }
  return { rp: rpVal < ewVal, ew: ewVal < rpVal };
}

function corrColor(v: number): string {
  if (v > 0) {
    const intensity = Math.min(v, 1);
    return `rgba(239,68,68,${0.08 + intensity * 0.55})`;
  }
  if (v < 0) {
    const intensity = Math.min(Math.abs(v), 1);
    return `rgba(59,130,246,${0.08 + intensity * 0.55})`;
  }
  return 'rgba(255,255,255,0.03)';
}

function corrTextColor(v: number): string {
  const abs = Math.abs(v);
  if (abs > 0.6) return '#ffffff';
  if (abs > 0.3) return '#d4d4d8';
  return '#71717a';
}

// ── Main Panel ──

export function RiskParityPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRiskParity();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke={ACCENT} strokeWidth="1.5" fill="none" opacity="0.6" />
            <line x1="8" y1="2" x2="8" y2="14" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
            <line x1="2" y1="8" x2="14" y2="8" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
            <circle cx="8" cy="8" r="3" stroke={ACCENT} strokeWidth="1" fill="none" opacity="0.4" />
            <circle cx="8" cy="8" r="1" fill={ACCENT} />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'riskParityTitle', 'Risk Parity Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'rpNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <PortfolioComparison data={data} />
            <RiskBudgetChart riskBudget={data.riskBudget} />
            <WeightComparison assets={data.assets} />
            <AssetTable assets={data.assets} />
            <CorrelationHeatmap data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Portfolio Comparison Cards ──

function PortfolioComparison({ data }: { data: RiskParityData }) {
  const t = useT();
  const { riskParity, equalWeight } = data.portfolio;

  const volBetter = betterHighlight(riskParity.vol, equalWeight.vol, false);
  const retBetter = betterHighlight(riskParity.expectedReturn, equalWeight.expectedReturn, true);
  const sharpeBetter = betterHighlight(riskParity.sharpe, equalWeight.sharpe, true);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'rpPortfolioComparison', 'Portfolio Comparison')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PortfolioCard
          title="RISK PARITY"
          stats={riskParity}
          isBetterVol={volBetter.rp}
          isBetterRet={retBetter.rp}
          isBetterSharpe={sharpeBetter.rp}
          accent={ACCENT}
        />
        <PortfolioCard
          title="EQUAL WEIGHT"
          stats={equalWeight}
          isBetterVol={volBetter.ew}
          isBetterRet={retBetter.ew}
          isBetterSharpe={sharpeBetter.ew}
          accent="#71717a"
        />
      </div>
    </div>
  );
}

function PortfolioCard({
  title,
  stats,
  isBetterVol,
  isBetterRet,
  isBetterSharpe,
  accent,
}: {
  title: string;
  stats: PortfolioStats;
  isBetterVol: boolean;
  isBetterRet: boolean;
  isBetterSharpe: boolean;
  accent: string;
}) {
  return (
    <div
      className="p-2 border border-border/20 bg-[#060606]"
      style={{ borderColor: `${accent}30` }}
    >
      <div className="text-[7px] font-black font-mono uppercase mb-1.5" style={{ color: accent }}>
        {title}
      </div>
      <div className="space-y-1">
        <MetricRow
          label="VOL"
          value={`${fmtNum(stats.vol)}%`}
          highlight={isBetterVol}
          highlightColor="#22c55e"
        />
        <MetricRow
          label="E(R)"
          value={fmtPct(stats.expectedReturn)}
          highlight={isBetterRet}
          highlightColor="#22c55e"
        />
        <MetricRow
          label="SHARPE"
          value={fmtNum(stats.sharpe)}
          highlight={isBetterSharpe}
          highlightColor="#22c55e"
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
  highlightColor,
}: {
  label: string;
  value: string;
  highlight: boolean;
  highlightColor: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[7px] font-mono text-neutral-600">{label}</span>
      <span
        className="text-[8px] font-mono font-bold"
        style={{ color: highlight ? highlightColor : '#a1a1aa' }}
      >
        {value}
        {highlight && (
          <span className="ml-0.5 text-[6px]" style={{ color: highlightColor }}>
            {'\u2713'}
          </span>
        )}
      </span>
    </div>
  );
}

// ── 2. Risk Budget Chart (Stacked Horizontal Bars) ──

function RiskBudgetChart({ riskBudget }: { riskBudget: RiskBudgetEntry[] }) {
  const t = useT();

  // Match risk budget entries to asset configs for color
  const coloredBudget = useMemo(() => {
    const assetClasses: Record<string, RiskParityAsset['class']> = {
      'US Equities': 'equity',
      'Intl Developed': 'equity',
      'Emerging Mkts': 'equity',
      'Long-Term Bonds': 'bond',
      'Interm Bonds': 'bond',
      'Aggregate Bond': 'bond',
      'TIPS': 'bond',
      'Commodities': 'commodity',
      'Gold': 'commodity',
      'Real Estate': 'real_estate',
      'Cash Proxy': 'cash',
    };
    return riskBudget.map((rb) => ({
      ...rb,
      color: CLASS_COLORS[assetClasses[rb.name] || 'cash'],
    }));
  }, [riskBudget]);

  const W = 340;
  const BAR_H = 14;
  const PAD_LEFT = 75;
  const PAD_RIGHT = 10;
  const barW = W - PAD_LEFT - PAD_RIGHT;
  const H = 2 * BAR_H + 30;

  const bars = [
    { label: 'EQUAL WEIGHT', key: 'equalWeightRisk' as const },
    { label: 'RISK PARITY', key: 'riskParityRisk' as const },
  ];

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'rpRiskBudget', 'Risk Budget')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 80 }}>
        {bars.map((bar, bi) => {
          let cumX = PAD_LEFT;
          const y = bi * (BAR_H + 6) + 4;

          return (
            <g key={bar.key}>
              {/* Label */}
              <text
                x={PAD_LEFT - 4}
                y={y + BAR_H / 2 + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {bar.label}
              </text>

              {/* Stacked segments */}
              {coloredBudget.map((rb) => {
                const val = rb[bar.key];
                const segW = Math.max(0, (val / 100) * barW);
                const x = cumX;
                cumX += segW;
                if (segW < 0.5) return null;

                return (
                  <g key={rb.name}>
                    <rect
                      x={x}
                      y={y}
                      width={segW}
                      height={BAR_H}
                      fill={rb.color}
                      opacity={0.7}
                    />
                    {segW > 16 && (
                      <text
                        x={x + segW / 2}
                        y={y + BAR_H / 2 + 3}
                        textAnchor="middle"
                        fill="#000"
                        fontSize={5}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {val.toFixed(0)}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Border */}
              <rect
                x={PAD_LEFT}
                y={y}
                width={barW}
                height={BAR_H}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.5}
              />
            </g>
          );
        })}

        {/* Legend */}
        {(() => {
          const legendY = 2 * (BAR_H + 6) + 10;
          const uniqueClasses = Array.from(new Set(coloredBudget.map((rb) => {
            const classMap: Record<string, RiskParityAsset['class']> = {
              'US Equities': 'equity', 'Intl Developed': 'equity', 'Emerging Mkts': 'equity',
              'Long-Term Bonds': 'bond', 'Interm Bonds': 'bond', 'Aggregate Bond': 'bond', 'TIPS': 'bond',
              'Commodities': 'commodity', 'Gold': 'commodity',
              'Real Estate': 'real_estate', 'Cash Proxy': 'cash',
            };
            return classMap[rb.name] || 'cash';
          })));
          let legendX = PAD_LEFT;

          return uniqueClasses.map((cls) => {
            const x = legendX;
            legendX += 50;
            return (
              <g key={cls}>
                <rect x={x} y={legendY} width={6} height={6} fill={CLASS_COLORS[cls]} opacity={0.7} />
                <text
                  x={x + 9}
                  y={legendY + 5}
                  fill="rgba(255,255,255,0.4)"
                  fontSize={5.5}
                  fontFamily="monospace"
                >
                  {cls.replace('_', ' ').toUpperCase()}
                </text>
              </g>
            );
          });
        })()}
      </svg>
    </div>
  );
}

// ── 3. Weight Comparison (Grouped Bar Chart) ──

function WeightComparison({ assets }: { assets: RiskParityAsset[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...assets].sort((a, b) => b.riskParityWeight - a.riskParityWeight),
    [assets],
  );

  const maxWeight = useMemo(
    () => Math.max(...sorted.map((a) => Math.max(a.riskParityWeight, a.equalWeight)), 1),
    [sorted],
  );

  const W = 340;
  const ROW_H = 16;
  const PAD_LEFT = 68;
  const PAD_RIGHT = 50;
  const barMaxW = W - PAD_LEFT - PAD_RIGHT;
  const H = sorted.length * ROW_H + 14;
  const BAR_H = 5;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'rpWeightComparison', 'Weight Comparison')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {sorted.map((asset, i) => {
          const y = i * ROW_H + 4;
          const rpBarW = (asset.riskParityWeight / maxWeight) * barMaxW;
          const ewBarW = (asset.equalWeight / maxWeight) * barMaxW;
          const classColor = CLASS_COLORS[asset.class];

          return (
            <g key={asset.symbol}>
              {/* Asset name */}
              <text
                x={PAD_LEFT - 4}
                y={y + ROW_H / 2 + 1}
                textAnchor="end"
                fill="rgba(255,255,255,0.5)"
                fontSize={6}
                fontFamily="monospace"
              >
                {asset.symbol}
              </text>

              {/* Risk parity bar */}
              <rect
                x={PAD_LEFT}
                y={y + 1}
                width={rpBarW}
                height={BAR_H}
                fill={ACCENT}
                opacity={0.7}
              />

              {/* Equal weight bar */}
              <rect
                x={PAD_LEFT}
                y={y + BAR_H + 2}
                width={ewBarW}
                height={BAR_H}
                fill="rgba(113,113,122,0.5)"
              />

              {/* Asset class dot */}
              <circle
                cx={PAD_LEFT - 10}
                cy={y + ROW_H / 2}
                r={2}
                fill={classColor}
                opacity={0.7}
              />

              {/* Weight labels */}
              <text
                x={PAD_LEFT + rpBarW + 3}
                y={y + BAR_H}
                fill={ACCENT}
                fontSize={5.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {asset.riskParityWeight.toFixed(1)}%
              </text>
              <text
                x={PAD_LEFT + ewBarW + 3}
                y={y + BAR_H * 2 + 2}
                fill="rgba(161,161,170,0.7)"
                fontSize={5.5}
                fontFamily="monospace"
              >
                {asset.equalWeight.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <rect x={PAD_LEFT} y={H - 8} width={6} height={4} fill={ACCENT} opacity={0.7} />
        <text x={PAD_LEFT + 9} y={H - 5} fill="rgba(255,255,255,0.4)" fontSize={5.5} fontFamily="monospace">
          RP WEIGHT
        </text>
        <rect x={PAD_LEFT + 70} y={H - 8} width={6} height={4} fill="rgba(113,113,122,0.5)" />
        <text x={PAD_LEFT + 79} y={H - 5} fill="rgba(255,255,255,0.4)" fontSize={5.5} fontFamily="monospace">
          EQ WEIGHT
        </text>
      </svg>
    </div>
  );
}

// ── 4. Asset Table ──

function AssetTable({ assets }: { assets: RiskParityAsset[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...assets].sort((a, b) => b.riskParityWeight - a.riskParityWeight),
    [assets],
  );

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'rpAssetDetails', 'Asset Details')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_50px_42px_40px_36px_40px_40px_40px] gap-0.5 mb-1">
        {['ASSET', 'PRICE', 'CHG%', '20D VOL', 'SHARPE', 'RP WT', 'EW WT', ''].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sorted.map((asset) => (
        <AssetRow key={asset.symbol} asset={asset} />
      ))}
    </div>
  );
}

function AssetRow({ asset }: { asset: RiskParityAsset }) {
  const classColor = CLASS_COLORS[asset.class];
  const changeColor = asset.changePct > 0 ? '#22c55e' : asset.changePct < 0 ? '#ef4444' : '#71717a';

  return (
    <div className="grid grid-cols-[1fr_50px_42px_40px_36px_40px_40px_40px] gap-0.5 py-0.5 border-t border-border/10 items-center">
      {/* Name + class badge */}
      <div className="flex items-center gap-1 min-w-0">
        <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: classColor, opacity: 0.7 }} />
        <span className="text-[7px] font-mono font-bold text-neutral-300 truncate">{asset.symbol}</span>
        <span
          className="text-[5px] font-mono font-bold px-0.5"
          style={{ color: classColor, background: `${classColor}15` }}
        >
          {CLASS_LABELS[asset.class]}
        </span>
      </div>

      {/* Price */}
      <span className="text-[7px] font-mono text-white">
        {asset.price >= 100 ? asset.price.toFixed(1) : asset.price.toFixed(2)}
      </span>

      {/* Change % */}
      <span className="text-[7px] font-mono font-bold" style={{ color: changeColor }}>
        {fmtPct(asset.changePct, 1)}
      </span>

      {/* 20d Vol */}
      <span className="text-[7px] font-mono text-neutral-400">
        {asset.vol20d.toFixed(1)}%
      </span>

      {/* Sharpe */}
      <span
        className="text-[7px] font-mono font-bold"
        style={{ color: asset.sharpe > 0.5 ? '#22c55e' : asset.sharpe < -0.5 ? '#ef4444' : '#71717a' }}
      >
        {fmtNum(asset.sharpe, 1)}
      </span>

      {/* RP Weight */}
      <span className="text-[7px] font-mono font-bold" style={{ color: ACCENT }}>
        {asset.riskParityWeight.toFixed(1)}%
      </span>

      {/* EW Weight */}
      <span className="text-[7px] font-mono text-neutral-500">
        {asset.equalWeight.toFixed(1)}%
      </span>

      {/* Sparkline */}
      <MiniSparkline values={asset.sparkline} color={classColor} />
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const W = 36;
  const H = 10;
  const PAD = 1;

  if (values.length < 2) return null;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - v) * (H - PAD * 2),
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 10 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={0.8} opacity={0.7} />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.2}
        fill={color}
      />
    </svg>
  );
}

// ── 5. Correlation Heatmap ──

function CorrelationHeatmap({ data }: { data: RiskParityData }) {
  const t = useT();
  const { symbols, values } = data.correlationMatrix;
  const N = symbols.length;

  const CELL = 22;
  const LABEL_W = 32;
  const LABEL_H = 32;
  const W = LABEL_W + N * CELL;
  const H = LABEL_H + N * CELL;

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr(t, 'rpCorrelation', 'Asset Correlation (60d)')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
        {/* Column labels (top, rotated) */}
        {symbols.map((sym, j) => (
          <text
            key={`col-${j}`}
            x={LABEL_W + j * CELL + CELL / 2}
            y={LABEL_H - 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.4)"
            fontSize={5}
            fontFamily="monospace"
            transform={`rotate(-45, ${LABEL_W + j * CELL + CELL / 2}, ${LABEL_H - 3})`}
          >
            {sym}
          </text>
        ))}

        {/* Rows */}
        {values.map((row, i) => (
          <g key={`row-${i}`}>
            {/* Row label */}
            <text
              x={LABEL_W - 3}
              y={LABEL_H + i * CELL + CELL / 2 + 2}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize={5}
              fontFamily="monospace"
            >
              {symbols[i]}
            </text>

            {/* Cells */}
            {row.map((val, j) => {
              const x = LABEL_W + j * CELL;
              const y = LABEL_H + i * CELL;

              return (
                <g key={`cell-${i}-${j}`}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL}
                    height={CELL}
                    fill={corrColor(val)}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={x + CELL / 2}
                    y={y + CELL / 2 + 2}
                    textAnchor="middle"
                    fill={corrTextColor(val)}
                    fontSize={i === j ? 4.5 : 5}
                    fontFamily="monospace"
                    fontWeight={Math.abs(val) > 0.5 ? 'bold' : 'normal'}
                  >
                    {i === j ? '1.0' : val.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}

        {/* Color legend */}
        <text
          x={LABEL_W}
          y={H + 12}
          fill="rgba(255,255,255,0.3)"
          fontSize={5}
          fontFamily="monospace"
        >
          {'NEG '}
        </text>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((v, i) => (
          <rect
            key={`legend-${v}`}
            x={LABEL_W + 22 + i * 14}
            y={H + 6}
            width={12}
            height={6}
            fill={corrColor(v)}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={0.3}
          />
        ))}
        <text
          x={LABEL_W + 22 + 5 * 14 + 2}
          y={H + 12}
          fill="rgba(255,255,255,0.3)"
          fontSize={5}
          fontFamily="monospace"
        >
          {' POS'}
        </text>
      </svg>
    </div>
  );
}
