import { useState, useMemo, useCallback } from 'react';
import { Crosshair, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePivotPoints, type PivotPointsData } from '../../api/hooks/use-pivot-points';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';

type MethodKey = 'classic' | 'fibonacci' | 'camarilla' | 'woodie' | 'demark';

interface LevelRow {
  label: string;
  price: number;
  type: 'resistance' | 'support' | 'pivot';
  tier: number; // 1-4 for color intensity
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function getLevelsForMethod(methods: PivotPointsData['methods'], method: MethodKey): LevelRow[] {
  const levels: LevelRow[] = [];

  switch (method) {
    case 'classic': {
      const m = methods.classic;
      levels.push(
        { label: 'R3', price: m.r3, type: 'resistance', tier: 3 },
        { label: 'R2', price: m.r2, type: 'resistance', tier: 2 },
        { label: 'R1', price: m.r1, type: 'resistance', tier: 1 },
        { label: 'P', price: m.pivot, type: 'pivot', tier: 0 },
        { label: 'S1', price: m.s1, type: 'support', tier: 1 },
        { label: 'S2', price: m.s2, type: 'support', tier: 2 },
        { label: 'S3', price: m.s3, type: 'support', tier: 3 },
      );
      break;
    }
    case 'fibonacci': {
      const m = methods.fibonacci;
      levels.push(
        { label: 'R3', price: m.r3, type: 'resistance', tier: 3 },
        { label: 'R2', price: m.r2, type: 'resistance', tier: 2 },
        { label: 'R1', price: m.r1, type: 'resistance', tier: 1 },
        { label: 'P', price: m.pivot, type: 'pivot', tier: 0 },
        { label: 'S1', price: m.s1, type: 'support', tier: 1 },
        { label: 'S2', price: m.s2, type: 'support', tier: 2 },
        { label: 'S3', price: m.s3, type: 'support', tier: 3 },
      );
      break;
    }
    case 'camarilla': {
      const m = methods.camarilla;
      levels.push(
        { label: 'R4', price: m.r4, type: 'resistance', tier: 4 },
        { label: 'R3', price: m.r3, type: 'resistance', tier: 3 },
        { label: 'R2', price: m.r2, type: 'resistance', tier: 2 },
        { label: 'R1', price: m.r1, type: 'resistance', tier: 1 },
        { label: 'S1', price: m.s1, type: 'support', tier: 1 },
        { label: 'S2', price: m.s2, type: 'support', tier: 2 },
        { label: 'S3', price: m.s3, type: 'support', tier: 3 },
        { label: 'S4', price: m.s4, type: 'support', tier: 4 },
      );
      break;
    }
    case 'woodie': {
      const m = methods.woodie;
      levels.push(
        { label: 'R2', price: m.r2, type: 'resistance', tier: 2 },
        { label: 'R1', price: m.r1, type: 'resistance', tier: 1 },
        { label: 'P', price: m.pivot, type: 'pivot', tier: 0 },
        { label: 'S1', price: m.s1, type: 'support', tier: 1 },
        { label: 'S2', price: m.s2, type: 'support', tier: 2 },
      );
      break;
    }
    case 'demark': {
      const m = methods.demark;
      levels.push(
        { label: 'R1', price: m.r1, type: 'resistance', tier: 1 },
        { label: 'S1', price: m.s1, type: 'support', tier: 1 },
      );
      break;
    }
  }

  return levels;
}

function getLevelColor(type: string, tier: number): string {
  if (type === 'pivot') return 'text-white';
  if (type === 'resistance') {
    if (tier >= 4) return 'text-red-400';
    if (tier === 3) return 'text-red-400';
    if (tier === 2) return 'text-red-400/80';
    return 'text-red-400/60';
  }
  // support
  if (tier >= 4) return 'text-emerald-400';
  if (tier === 3) return 'text-emerald-400';
  if (tier === 2) return 'text-emerald-400/80';
  return 'text-emerald-400/60';
}

function getLevelBgColor(type: string, tier: number): string {
  if (type === 'pivot') return 'bg-white/5';
  if (type === 'resistance') {
    if (tier >= 3) return 'bg-red-500/10';
    if (tier === 2) return 'bg-red-500/7';
    return 'bg-red-500/4';
  }
  if (tier >= 3) return 'bg-emerald-500/10';
  if (tier === 2) return 'bg-emerald-500/7';
  return 'bg-emerald-500/4';
}

function getSvgColor(type: string, tier: number): string {
  if (type === 'pivot') return '#a5b4fc'; // indigo-300
  if (type === 'resistance') {
    if (tier >= 3) return '#f87171'; // red-400
    if (tier === 2) return '#fca5a5'; // red-300
    return '#fecaca'; // red-200
  }
  if (tier >= 3) return '#34d399'; // emerald-400
  if (tier === 2) return '#6ee7b7'; // emerald-300
  return '#a7f3d0'; // emerald-200
}

const METHOD_TABS: { key: MethodKey; labelKey: 'ppClassic' | 'ppFibonacci' | 'ppCamarilla' | 'ppWoodie' | 'ppDeMark' }[] = [
  { key: 'classic', labelKey: 'ppClassic' },
  { key: 'fibonacci', labelKey: 'ppFibonacci' },
  { key: 'camarilla', labelKey: 'ppCamarilla' },
  { key: 'woodie', labelKey: 'ppWoodie' },
  { key: 'demark', labelKey: 'ppDeMark' },
];

// ---- Visual Price Ladder (SVG) ----

function PriceLadder({ levels, currentPrice }: { levels: LevelRow[]; currentPrice: number }) {
  const allPrices = [...levels.map(l => l.price), currentPrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  if (priceRange === 0) return null;

  const padding = priceRange * 0.08;
  const displayMin = minPrice - padding;
  const displayMax = maxPrice + padding;
  const displayRange = displayMax - displayMin;

  const svgWidth = 320;
  const svgHeight = Math.max(180, levels.length * 28 + 40);
  const leftMargin = 48;
  const rightMargin = 80;
  const topMargin = 16;
  const bottomMargin = 16;
  const chartHeight = svgHeight - topMargin - bottomMargin;
  const lineStart = leftMargin;
  const lineEnd = svgWidth - rightMargin;

  function priceToY(price: number): number {
    return topMargin + chartHeight * (1 - (price - displayMin) / displayRange);
  }

  const currentY = priceToY(currentPrice);

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full max-h-[260px]"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="transparent" />

      {/* Level lines */}
      {levels.map((level, i) => {
        const y = priceToY(level.price);
        const color = getSvgColor(level.type, level.tier);
        const dashArray = level.type === 'pivot' ? 'none' : '4,3';
        return (
          <g key={i}>
            <line
              x1={lineStart}
              y1={y}
              x2={lineEnd}
              y2={y}
              stroke={color}
              strokeWidth={level.type === 'pivot' ? 1.5 : 1}
              strokeDasharray={dashArray}
              opacity={0.7}
            />
            <text
              x={lineStart - 4}
              y={y + 3}
              textAnchor="end"
              fill={color}
              fontSize="9"
              fontFamily="monospace"
              fontWeight={level.type === 'pivot' ? 'bold' : 'normal'}
            >
              {level.label}
            </text>
            <text
              x={lineEnd + 4}
              y={y + 3}
              textAnchor="start"
              fill={color}
              fontSize="8.5"
              fontFamily="monospace"
              opacity={0.9}
            >
              {formatPrice(level.price)}
            </text>
          </g>
        );
      })}

      {/* Current price marker */}
      <line
        x1={lineStart}
        y1={currentY}
        x2={lineEnd}
        y2={currentY}
        stroke="#818cf8"
        strokeWidth={2}
        opacity={0.9}
      />
      {/* Arrow marker */}
      <polygon
        points={`${lineStart - 2},${currentY - 5} ${lineStart + 6},${currentY} ${lineStart - 2},${currentY + 5}`}
        fill="#818cf8"
      />
      <text
        x={lineEnd + 4}
        y={currentY + 3}
        textAnchor="start"
        fill="#818cf8"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {formatPrice(currentPrice)}
      </text>
    </svg>
  );
}

// ---- All Methods Comparison Table ----

function ComparisonTable({ data, t }: { data: PivotPointsData; t: (k: any) => string }) {
  const rows = ['R3', 'R2', 'R1', 'P', 'S1', 'S2', 'S3'];
  const methods: { key: string; label: string }[] = [
    { key: 'classic', label: t('ppClassic') },
    { key: 'fibonacci', label: t('ppFibonacci') },
    { key: 'camarilla', label: t('ppCamarilla') },
    { key: 'woodie', label: t('ppWoodie') },
    { key: 'demark', label: t('ppDeMark') },
  ];

  function getValue(methodKey: string, row: string): number | null {
    const m = data.methods[methodKey as MethodKey];
    if (!m) return null;
    const keyMap: Record<string, string> = {
      'R3': 'r3', 'R2': 'r2', 'R1': 'r1', 'P': 'pivot', 'S1': 's1', 'S2': 's2', 'S3': 's3',
    };
    const k = keyMap[row];
    if (!k) return null;
    return (m as any)[k] ?? null;
  }

  function getRowColor(row: string): string {
    if (row === 'P') return 'text-white';
    if (row.startsWith('R')) return 'text-red-400/80';
    return 'text-emerald-400/80';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-1 px-1.5 text-neutral-500 font-normal">Level</th>
            {methods.map(m => (
              <th key={m.key} className="text-right py-1 px-1.5 text-neutral-500 font-normal whitespace-nowrap">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className={`py-0.5 px-1.5 font-semibold ${getRowColor(row)}`}>{row}</td>
              {methods.map(m => {
                const val = getValue(m.key, row);
                return (
                  <td key={m.key} className={`text-right py-0.5 px-1.5 ${val != null ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {val != null ? formatPrice(val) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Main Panel ----

export function PivotPointsPanel() {
  const t = useT();
  const symbol = useAppStore((s) => s.selectedSymbol);
  const { data, isLoading, isError } = usePivotPoints();
  const queryClient = useQueryClient();
  const [activeMethod, setActiveMethod] = useState<MethodKey>('classic');

  const handleRefresh = useCallback(() => {
    if (symbol) {
      queryClient.invalidateQueries({ queryKey: ['pivot-points', symbol] });
    }
  }, [symbol, queryClient]);

  const levels = useMemo(() => {
    if (!data) return [];
    return getLevelsForMethod(data.methods, activeMethod);
  }, [data, activeMethod]);

  // No symbol selected
  if (!symbol) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono font-semibold tracking-widest text-neutral-300 uppercase">
            {t('panelPivotPoints')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {t('ppNoSymbol')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono font-semibold tracking-widest text-neutral-300 uppercase">
            {t('panelPivotPoints')}
          </span>
          <span className="text-[10px] font-mono text-indigo-400">{symbol}</span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin rounded-sm" />
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest">{t('ppNoData')}</span>
        </div>
      )}

      {/* Content */}
      {data && !isLoading && (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {/* Current Price + Previous OHLC */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="text-lg font-mono font-bold text-white">{formatPrice(data.currentPrice)}</span>
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Current</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
              {t('ppPrevOHLC')}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'O', value: data.previousOpen },
                { label: 'H', value: data.previousHigh },
                { label: 'L', value: data.previousLow },
                { label: 'C', value: data.previousClose },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center py-1 rounded bg-white/[0.03]">
                  <span className="text-[8px] font-mono text-neutral-500">{label}</span>
                  <span className="text-[10px] font-mono text-neutral-300">{formatPrice(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Method Tabs */}
          <div className="flex border-b border-white/5 shrink-0 overflow-x-auto">
            {METHOD_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveMethod(tab.key)}
                className={`flex-1 min-w-0 px-2 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeMethod === tab.key
                    ? 'text-indigo-400 border-b border-indigo-400 bg-indigo-400/5'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* Levels Table */}
          <div className="px-2 py-1.5">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-neutral-500">
                  <th className="text-left py-0.5 px-1.5 font-normal">Level</th>
                  <th className="text-right py-0.5 px-1.5 font-normal">Price</th>
                  <th className="text-right py-0.5 px-1.5 font-normal">{t('ppDistance')}</th>
                  <th className="text-right py-0.5 px-1.5 font-normal">%</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level, idx) => {
                  const dist = level.price - data.currentPrice;
                  const distPct = (dist / data.currentPrice) * 100;
                  const isCurrentBetween =
                    idx < levels.length - 1 &&
                    ((data.currentPrice <= level.price && data.currentPrice >= levels[idx + 1].price) ||
                     (data.currentPrice >= level.price && data.currentPrice <= levels[idx + 1].price));

                  return (
                    <tr
                      key={level.label}
                      className={`border-b border-white/[0.03] ${getLevelBgColor(level.type, level.tier)} hover:bg-white/[0.04] transition-colors`}
                    >
                      <td className={`py-1 px-1.5 font-semibold ${getLevelColor(level.type, level.tier)}`}>
                        {level.label}
                        {level.type === 'pivot' && (
                          <span className="ml-1 text-neutral-500 font-normal">({t('ppPivot')})</span>
                        )}
                      </td>
                      <td className="text-right py-1 px-1.5 text-neutral-200">{formatPrice(level.price)}</td>
                      <td className={`text-right py-1 px-1.5 ${dist >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {dist >= 0 ? '+' : ''}{formatPrice(dist)}
                      </td>
                      <td className={`text-right py-1 px-1.5 ${distPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {distPct >= 0 ? '+' : ''}{distPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual Price Ladder */}
          <div className="px-3 py-2 border-t border-white/5">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-1">Price Ladder</div>
            <div className="bg-white/[0.02] rounded border border-white/5 p-1">
              <PriceLadder levels={levels} currentPrice={data.currentPrice} />
            </div>
          </div>

          {/* All Methods Comparison */}
          <div className="px-3 py-2 border-t border-white/5">
            <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">All Methods</div>
            <div className="bg-white/[0.02] rounded border border-white/5 p-1.5">
              <ComparisonTable data={data} t={t} />
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
