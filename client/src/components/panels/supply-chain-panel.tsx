import { useState } from 'react';
import {
  useSupplyChain,
  type SupplyChainIndicator,
  type SupplyChainSector,
} from '../../api/hooks/use-supply-chain';
import { useT, tr, TFn } from '../../i18n';
import { Container, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const ORANGE = '#f97316';
const GREEN = '#34d399';
const RED = '#f87171';
const YELLOW = '#fbbf24';
const AMBER = '#f59e0b';

type ViewTab = 'INDICATORS' | 'SECTORS' | 'HEATMAP';
type CategoryFilter = 'ALL' | 'COMPOSITE' | 'SHIPPING' | 'MANUFACTURING' | 'INVENTORY' | 'FREIGHT';

const CATEGORIES: CategoryFilter[] = ['ALL', 'COMPOSITE', 'SHIPPING', 'MANUFACTURING', 'INVENTORY', 'FREIGHT'];

// ── Formatting helpers ──

function fmtValue(value: number, unit: string): string {
  if (unit === 'ratio') return value.toFixed(2);
  if (unit === '$/kg') return '$' + value.toFixed(2);
  if (unit === '$/day' || unit === '$/TEU') {
    if (value >= 10000) return '$' + (value / 1000).toFixed(1) + 'K';
    return '$' + Math.round(value).toLocaleString();
  }
  if (unit === 'index') return value.toFixed(2);
  if (unit === 'days' || unit === 'weeks') return value.toFixed(1);
  return value.toFixed(2);
}

function fmtChange(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function fmtZ(z: number): string {
  return (z >= 0 ? '+' : '') + z.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  // For supply chain: positive change = worsening (red), negative = improving (green)
  if (n > 1) return RED;
  if (n < -1) return GREEN;
  return 'rgba(255,255,255,0.4)';
}

function zScoreColor(z: number): string {
  if (z > 2) return '#dc2626';    // deep red - highly stressed
  if (z > 1) return RED;
  if (z > 0.5) return AMBER;
  if (z < -1) return GREEN;
  if (z < -0.5) return '#6ee7b7';
  return 'rgba(255,255,255,0.4)';
}

function percentileColor(p: number): string {
  if (p > 85) return '#dc2626';
  if (p > 70) return RED;
  if (p > 55) return AMBER;
  if (p > 40) return YELLOW;
  if (p > 25) return '#a3e635';
  return GREEN;
}

function signalStyle(signal: string | null): { color: string; bg: string } {
  switch (signal) {
    case 'STRESS': return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
    case 'BOTTLENECK': return { color: AMBER, bg: 'rgba(245,158,11,0.12)' };
    case 'EASING': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'NORMAL': return { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.03)' };
    default: return { color: 'rgba(255,255,255,0.2)', bg: 'transparent' };
  }
}

function directionIcon(direction: string) {
  switch (direction) {
    case 'improving': return <ArrowDown className="w-2.5 h-2.5" style={{ color: GREEN }} />;
    case 'worsening': return <ArrowUp className="w-2.5 h-2.5" style={{ color: RED }} />;
    default: return <Minus className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.3)' }} />;
  }
}

function compositeGaugeColor(index: number): string {
  if (index > 70) return '#dc2626';
  if (index > 55) return RED;
  if (index > 40) return AMBER;
  if (index > 25) return YELLOW;
  return GREEN;
}

function trendColor(trend: string): string {
  if (trend === 'improving') return GREEN;
  if (trend === 'worsening') return RED;
  return 'rgba(255,255,255,0.4)';
}

function pressureGaugeColor(score: number): string {
  if (score > 70) return '#dc2626';
  if (score > 55) return RED;
  if (score > 40) return AMBER;
  if (score > 25) return YELLOW;
  return GREEN;
}

// ── Mini sparkline (24 months) ──

function Sparkline({ data, width = 60, height = 14 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  // Last value position for dot
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 2) - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={ORANGE}
        strokeWidth={0.8}
        strokeOpacity={0.6}
      />
      <circle cx={lastX} cy={lastY} r={1.2} fill={ORANGE} fillOpacity={0.9} />
    </svg>
  );
}

// ── Z-Score Bar (centered at 0) ──

function ZScoreBar({ z }: { z: number }) {
  const maxZ = 3;
  const clampedZ = Math.max(-maxZ, Math.min(maxZ, z));
  const pct = Math.abs(clampedZ) / maxZ * 50;
  const color = zScoreColor(z);

  return (
    <div className="w-full h-2 bg-white/[0.03] relative overflow-hidden">
      {/* Center line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/[0.08]" />
      {/* Bar */}
      <div
        className="absolute top-0 h-full"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          opacity: 0.6,
          left: clampedZ >= 0 ? '50%' : undefined,
          right: clampedZ < 0 ? '50%' : undefined,
        }}
      />
    </div>
  );
}

// ── Percentile Bar ──

function PercentileBar({ pct }: { pct: number }) {
  const color = percentileColor(pct);
  return (
    <div className="w-full h-2 bg-white/[0.03] relative overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.55 }}
      />
    </div>
  );
}

// ── Indicators Tab ──

function IndicatorsView({ indicators }: { indicators: SupplyChainIndicator[] }) {
  const [filter, setFilter] = useState<CategoryFilter>('ALL');

  const filtered = filter === 'ALL'
    ? indicators
    : indicators.filter(i => i.category.toUpperCase() === filter);

  return (
    <div>
      {/* Category filter */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-white/[0.06]">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-1.5 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider transition-colors"
            style={{
              color: filter === cat ? ORANGE : 'rgba(255,255,255,0.3)',
              backgroundColor: filter === cat ? 'rgba(249,115,22,0.1)' : 'transparent',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[100px] shrink-0">Name</span>
        <span className="w-[52px] text-right shrink-0">Value</span>
        <span className="w-[34px] text-right shrink-0">&Delta;1M</span>
        <span className="w-[34px] text-right shrink-0">&Delta;3M</span>
        <span className="w-[34px] text-right shrink-0">&Delta;YTD</span>
        <span className="w-[40px] shrink-0 text-center">Z-Score</span>
        <span className="w-[40px] shrink-0 text-center">Pctile</span>
        <span className="w-[14px] shrink-0 text-center">Dir</span>
        <span className="w-[44px] shrink-0 text-center">Signal</span>
        <span className="w-[60px] shrink-0 text-right">24M</span>
      </div>

      {/* Table rows */}
      {filtered.map(ind => {
        const sig = signalStyle(ind.signal);
        return (
          <div
            key={ind.name}
            className="flex items-center px-2 py-[3px] border-b border-white/[0.02] gap-1 hover:bg-orange-400/[0.02] transition-colors"
          >
            <div className="w-[100px] shrink-0">
              <span className="text-[7px] font-mono font-bold text-white/60 truncate block">{ind.name}</span>
              <span className="text-[5px] font-mono text-white/15 uppercase">{ind.category}</span>
            </div>
            <span className="w-[52px] text-right text-[7px] font-mono font-bold text-white/70 shrink-0">
              {fmtValue(ind.value, ind.unit)}
              <span className="text-[4px] text-white/20 ml-0.5">{ind.unit === 'index' ? '' : ind.unit}</span>
            </span>
            <span className="w-[34px] text-right text-[7px] font-mono font-bold shrink-0" style={{ color: changeColor(ind.change1m) }}>
              {fmtChange(ind.change1m)}
            </span>
            <span className="w-[34px] text-right text-[7px] font-mono font-bold shrink-0" style={{ color: changeColor(ind.change3m) }}>
              {fmtChange(ind.change3m)}
            </span>
            <span className="w-[34px] text-right text-[7px] font-mono font-bold shrink-0" style={{ color: changeColor(ind.changeYtd) }}>
              {fmtChange(ind.changeYtd)}
            </span>
            <div className="w-[40px] shrink-0 flex flex-col items-center gap-0.5">
              <span className="text-[6px] font-mono font-bold" style={{ color: zScoreColor(ind.zScore) }}>
                {fmtZ(ind.zScore)}
              </span>
              <ZScoreBar z={ind.zScore} />
            </div>
            <div className="w-[40px] shrink-0 flex flex-col items-center gap-0.5">
              <span className="text-[6px] font-mono font-bold" style={{ color: percentileColor(ind.percentile) }}>
                {ind.percentile}
              </span>
              <PercentileBar pct={ind.percentile} />
            </div>
            <div className="w-[14px] shrink-0 flex justify-center">
              {directionIcon(ind.direction)}
            </div>
            <div className="w-[44px] shrink-0 flex justify-center">
              {ind.signal && (
                <span
                  className="text-[5px] font-mono font-black uppercase px-1 py-0"
                  style={{ color: sig.color, backgroundColor: sig.bg }}
                >
                  {ind.signal}
                </span>
              )}
            </div>
            <div className="w-[60px] shrink-0 flex justify-end">
              <Sparkline data={ind.history} width={56} height={12} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sector Card ──

function SectorCard({ sector }: { sector: SupplyChainSector }) {
  const gaugeColor = pressureGaugeColor(sector.pressureScore);
  const trend = trendColor(sector.trend);
  const ltBarWidth = Math.min((sector.leadTimeVsNormal / 2.5) * 100, 100);
  const ltColor = sector.leadTimeVsNormal > 1.5 ? RED : sector.leadTimeVsNormal > 1.15 ? AMBER : GREEN;

  return (
    <div className="px-2 py-1.5 border-b border-white/[0.04] hover:bg-orange-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-black text-white/70 uppercase">{sector.sector}</span>
          <span
            className="text-[5px] font-mono font-black uppercase px-1 py-0"
            style={{ color: trend, backgroundColor: sector.trend === 'worsening' ? 'rgba(248,113,113,0.1)' : sector.trend === 'improving' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)' }}
          >
            {sector.trend === 'improving' ? '\u2193 IMPROVING' : sector.trend === 'worsening' ? '\u2191 WORSENING' : '- STABLE'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[6px] font-mono text-white/20">PRESSURE</span>
          <span className="text-[9px] font-mono font-black" style={{ color: gaugeColor }}>
            {sector.pressureScore}
          </span>
        </div>
      </div>

      {/* Pressure gauge bar */}
      <div className="w-full h-1.5 bg-white/[0.03] mb-1 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${sector.pressureScore}%`, backgroundColor: gaugeColor, opacity: 0.5 }}
        />
      </div>

      {/* Key issue */}
      <p className="text-[6px] font-mono text-white/30 leading-relaxed mb-1">{sector.keyIssue}</p>

      {/* Lead time */}
      <div className="flex items-center gap-1.5">
        <span className="text-[5px] font-mono text-white/20 uppercase">Lead Time</span>
        <span className="text-[7px] font-mono font-bold text-white/50">{sector.leadTime}w</span>
        <div className="flex-1 h-1 bg-white/[0.03] relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full"
            style={{ width: `${ltBarWidth}%`, backgroundColor: ltColor, opacity: 0.45 }}
          />
          {/* Normal marker */}
          <div
            className="absolute top-0 h-full w-px bg-white/20"
            style={{ left: `${(1 / 2.5) * 100}%` }}
          />
        </div>
        <span className="text-[6px] font-mono font-bold" style={{ color: ltColor }}>
          {sector.leadTimeVsNormal.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}

// ── Sectors Tab ──

function SectorsView({ sectors }: { sectors: SupplyChainSector[] }) {
  const sorted = [...sectors].sort((a, b) => b.pressureScore - a.pressureScore);

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-white/[0.06]">
        <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Sector Pressure Ranking</span>
        <span className="text-[5px] font-mono text-white/15">sorted by pressure score</span>
      </div>
      {sorted.map(sector => (
        <SectorCard key={sector.sector} sector={sector} />
      ))}
    </div>
  );
}

// ── Heatmap Tab ──

function HeatmapView({ indicators }: { indicators: SupplyChainIndicator[] }) {
  // Use the last 12 data points from each indicator's 24-month history
  const months = 12;
  const monthLabels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleString('en', { month: 'short' }).toUpperCase());
  }

  // Compute z-scores for heatmap cells
  function cellColor(value: number, mean: number, stdDev: number): string {
    const z = stdDev > 0 ? (value - mean) / stdDev : 0;
    if (z > 2) return 'rgba(220,38,38,0.7)';
    if (z > 1.5) return 'rgba(248,113,113,0.55)';
    if (z > 1) return 'rgba(245,158,11,0.5)';
    if (z > 0.5) return 'rgba(251,191,36,0.4)';
    if (z > -0.5) return 'rgba(255,255,255,0.06)';
    if (z > -1) return 'rgba(163,230,53,0.3)';
    return 'rgba(52,211,153,0.4)';
  }

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">Supply Chain Heatmap</span>
        <div className="flex items-center gap-1 text-[5px] font-mono">
          <span style={{ color: GREEN }}>EASING</span>
          <div className="flex gap-px">
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(52,211,153,0.4)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(163,230,53,0.3)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(251,191,36,0.4)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(245,158,11,0.5)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(248,113,113,0.55)' }} />
            <div className="w-2 h-1.5" style={{ backgroundColor: 'rgba(220,38,38,0.7)' }} />
          </div>
          <span style={{ color: RED }}>STRESS</span>
        </div>
      </div>

      {/* Month header row */}
      <div className="flex items-center gap-0">
        <div className="w-[100px] shrink-0" />
        {monthLabels.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[4px] font-mono text-white/15">
            {label}
          </div>
        ))}
      </div>

      {/* Indicator rows */}
      {indicators.map(ind => {
        const historySlice = ind.history.slice(-months);
        const mean = historySlice.reduce((s, v) => s + v, 0) / historySlice.length;
        const stdDev = Math.sqrt(historySlice.reduce((s, v) => s + (v - mean) ** 2, 0) / historySlice.length) || 1;

        return (
          <div key={ind.name} className="flex items-center gap-0 py-px">
            <div className="w-[100px] shrink-0 pr-1">
              <span className="text-[6px] font-mono text-white/40 truncate block">{ind.name}</span>
            </div>
            {historySlice.map((val, i) => (
              <div
                key={i}
                className="flex-1 h-3 mx-px"
                style={{ backgroundColor: cellColor(val, mean, stdDev) }}
                title={`${ind.name}: ${val.toFixed(2)} (${monthLabels[i]})`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function SupplyChainPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSupplyChain();
  const [view, setView] = useState<ViewTab>('INDICATORS');

  const compositeColor = data ? compositeGaugeColor(data.compositeIndex) : ORANGE;
  const dirText = data?.compositeDirection === 'improving' ? 'IMPROVING' : data?.compositeDirection === 'worsening' ? 'WORSENING' : 'STABLE';
  const dirColor = data?.compositeDirection === 'improving' ? GREEN : data?.compositeDirection === 'worsening' ? RED : 'rgba(255,255,255,0.4)';

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Container className="w-4 h-4" style={{ color: ORANGE }} strokeWidth={1.5} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ORANGE }}>
            {tr(t, 'scTitle', 'Supply Chain Monitor')}
          </span>
          {data && (
            <span
              className="text-[7px] font-black px-1.5 py-0.5"
              style={{ color: compositeColor, backgroundColor: `${compositeColor}15` }}
            >
              {data.compositeIndex}
            </span>
          )}
          {data && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{ color: dirColor, backgroundColor: `${dirColor}15` }}
            >
              {dirText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {data && (
            <span className="text-[6px] text-white/15">
              z={data.compositeZScore >= 0 ? '+' : ''}{data.compositeZScore.toFixed(2)}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center px-2 py-0.5 border-b border-white/[0.06] shrink-0 gap-0.5">
        {(['INDICATORS', 'SECTORS', 'HEATMAP'] as ViewTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className="px-2 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider transition-colors"
            style={{
              color: view === tab ? ORANGE : 'rgba(255,255,255,0.3)',
              backgroundColor: view === tab ? 'rgba(249,115,22,0.1)' : 'transparent',
              borderBottom: view === tab ? `1px solid ${ORANGE}` : '1px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {view === 'INDICATORS' && <IndicatorsView indicators={data.indicators} />}
            {view === 'SECTORS' && <SectorsView sectors={data.sectors} />}
            {view === 'HEATMAP' && <HeatmapView indicators={data.indicators} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'scNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
