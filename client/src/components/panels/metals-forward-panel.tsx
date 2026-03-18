import { useState, useMemo } from 'react';
import { useMetalsForward } from '../../api/hooks/use-metals-forward';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#fb923c';

type TabKey = 'curves' | 'analysis' | 'warehouse' | 'spreads';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'curves', label: 'Curves' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'spreads', label: 'Spreads' },
];

type MetalKey = string;

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtDollar(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toFixed(decimals)}`;
}

function fmtBillions(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function structureBadge(structure: string): { text: string; bg: string } {
  const s = structure?.toLowerCase() ?? '';
  if (s.includes('contango')) return { text: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
  if (s.includes('backwardation')) return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function signalBadgeStyle(signal: string): { text: string; bg: string } {
  const s = signal?.toLowerCase() ?? '';
  if (s.includes('buy') || s.includes('long') || s.includes('bullish')) {
    return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  }
  if (s.includes('sell') || s.includes('short') || s.includes('bearish')) {
    return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  }
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
}

function directionBadge(direction: string): { text: string; bg: string; label: string } {
  const d = direction?.toLowerCase() ?? '';
  if (d.includes('long')) return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'LONG' };
  if (d.includes('short')) return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'SHORT' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30', label: direction?.toUpperCase() ?? '-' };
}

function correlationColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 0.5) return 'text-green-400';
  if (n >= 0.2) return 'text-yellow-400';
  if (n <= -0.5) return 'text-red-400';
  if (n <= -0.2) return 'text-orange-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function MetalsForwardPanel() {
  const { data, isLoading, refetch } = useMetalsForward();
  const [tab, setTab] = useState<TabKey>('curves');
  const [selectedMetal, setSelectedMetal] = useState<MetalKey>('');

  // Extract metal list from data
  const metals: string[] = useMemo(() => {
    if (!data) return [];
    if (data.metals && Array.isArray(data.metals)) return data.metals;
    if (data.curves && typeof data.curves === 'object') return Object.keys(data.curves);
    return [];
  }, [data]);

  // Auto-select first metal when data loads
  const activeMetal = useMemo(() => {
    if (selectedMetal && metals.includes(selectedMetal)) return selectedMetal;
    return metals[0] ?? '';
  }, [selectedMetal, metals]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            Metals Forward Curves
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t.key
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {data?.summary && <SummaryBar summary={data.summary} />}

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && tab === 'curves' && (
          <CurvesTab
            data={data}
            metals={metals}
            activeMetal={activeMetal}
            onSelectMetal={setSelectedMetal}
          />
        )}

        {data && tab === 'analysis' && (
          <AnalysisTab data={data} />
        )}

        {data && tab === 'warehouse' && (
          <WarehouseTab data={data} />
        )}

        {data && tab === 'spreads' && (
          <SpreadsTab data={data} />
        )}
      </div>
    </div>
  );
}

// ── Summary Bar (grid-cols-5) ──

function SummaryBar({ summary }: { summary: any }) {
  const items = [
    { label: 'Avg Contango', value: fmtPct(summary.avgContango), color: changeColor(summary.avgContango) },
    { label: 'Most Backwardated', value: summary.mostBackwardated ?? '-', color: 'text-red-400' },
    { label: 'Most Contango', value: summary.mostContango ?? '-', color: 'text-blue-400' },
    { label: 'Total OI', value: fmtBillions(summary.totalOI), color: 'text-white' },
    { label: 'Avg Carry', value: fmtPct(summary.avgCarry), color: changeColor(summary.avgCarry) },
  ];

  return (
    <div className="border-b border-border/20 shrink-0">
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {items.map((item) => (
          <div key={item.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${item.color} truncate`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Curves Tab ──

function CurvesTab({
  data,
  metals,
  activeMetal,
  onSelectMetal,
}: {
  data: any;
  metals: string[];
  activeMetal: string;
  onSelectMetal: (m: string) => void;
}) {
  const curveData = useMemo(() => {
    if (!data?.curves) return [];
    const curve = data.curves[activeMetal];
    if (Array.isArray(curve)) return curve;
    if (curve?.tenors && Array.isArray(curve.tenors)) return curve.tenors;
    return [];
  }, [data, activeMetal]);

  return (
    <>
      {/* Metal selector buttons */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0">
        {metals.map((m) => (
          <button
            key={m}
            onClick={() => onSelectMetal(m)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border transition-colors ${
              activeMetal === m
                ? 'border-orange-400/50 text-orange-400 bg-orange-500/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Simple bar chart for curve shape */}
      {curveData.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-b border-border/20">
          <CurveBarChart points={curveData} />
        </div>
      )}

      {/* Curve table */}
      {curveData.length > 0 ? (
        <div>
          <div className="grid grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider">
            <span>Tenor</span>
            <span className="text-right">Price</span>
            <span className="text-right">Spread to Cash</span>
            <span className="text-right">Ann. Carry</span>
            <span className="text-right">1D Chg</span>
          </div>

          {curveData.map((pt: any, i: number) => (
            <div
              key={pt.tenor ?? pt.month ?? i}
              className={`grid grid-cols-[1fr_0.8fr_0.9fr_0.9fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-white/[0.02] ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[9px] font-mono font-bold text-orange-400">
                {pt.tenor ?? pt.month ?? '-'}
              </span>
              <span className="text-[9px] font-mono font-bold text-white text-right">
                {fmtNum(pt.price)}
              </span>
              <span className={`text-[9px] font-mono text-right ${changeColor(pt.spreadToCash)}`}>
                {fmtDollar(pt.spreadToCash)}
              </span>
              <span className={`text-[9px] font-mono font-bold text-right ${changeColor(pt.annualizedCarry)}`}>
                {fmtPct(pt.annualizedCarry)}
              </span>
              <span className={`text-[9px] font-mono text-right ${changeColor(pt.change1d)}`}>
                {fmtPct(pt.change1d)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No curve data for {activeMetal}
        </div>
      )}
    </>
  );
}

// ── Curve Bar Chart (simple SVG) ──

function CurveBarChart({ points }: { points: any[] }) {
  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const W = 400;
    const H = 80;
    const PAD_L = 4;
    const PAD_R = 4;
    const PAD_T = 8;
    const PAD_B = 18;

    const prices = points.map((p: any) => p.price ?? 0).filter((v: number) => v > 0);
    if (prices.length === 0) return null;

    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const barW = Math.min(chartW / points.length - 2, 24);

    const bars = points.map((pt: any, i: number) => {
      const price = pt.price ?? 0;
      const barHeight = price > 0 ? ((price - minP) / range) * chartH * 0.85 + chartH * 0.15 : 0;
      const x = PAD_L + (i + 0.5) * (chartW / points.length) - barW / 2;
      const y = PAD_T + chartH - barHeight;
      return { x, y, w: barW, h: barHeight, label: pt.tenor ?? pt.month ?? '', price };
    });

    return { W, H, PAD_T, PAD_B, bars };
  }, [points]);

  if (!chart) return null;

  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 90 }}>
      {chart.bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={Math.max(bar.h, 1)}
            fill="rgba(251,146,60,0.5)"
          />
          <text
            x={bar.x + bar.w / 2}
            y={chart.H - chart.PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={5.5}
            fontFamily="monospace"
          >
            {bar.label.length > 5 ? bar.label.slice(0, 5) : bar.label}
          </text>
          <text
            x={bar.x + bar.w / 2}
            y={bar.y - 2}
            textAnchor="middle"
            fill="rgba(251,146,60,0.7)"
            fontSize={6}
            fontFamily="monospace"
          >
            {bar.price > 0 ? bar.price.toFixed(0) : ''}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Analysis Tab ──

function AnalysisTab({ data }: { data: any }) {
  const analysisData: any[] = useMemo(() => {
    if (Array.isArray(data.analysis)) return data.analysis;
    if (data.curves && typeof data.curves === 'object') {
      return Object.entries(data.curves).map(([metal, curve]: [string, any]) => ({
        metal,
        structure: curve?.structure ?? '-',
        steepness: curve?.steepness ?? null,
        cashTo3m: curve?.cashTo3m ?? null,
        threeMTo12m: curve?.threeMTo12m ?? null,
        percentile: curve?.percentile ?? null,
        signal: curve?.signal ?? '-',
      }));
    }
    return [];
  }, [data]);

  const maxPercentile = useMemo(() => {
    return Math.max(...analysisData.map((d) => d.percentile ?? 0), 1);
  }, [analysisData]);

  return (
    <div>
      <div className="grid grid-cols-[1fr_0.9fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider">
        <span>Metal</span>
        <span>Structure</span>
        <span className="text-right">Steepness</span>
        <span className="text-right">Cash-3M</span>
        <span className="text-right">3M-12M</span>
        <span className="text-center">Percentile</span>
        <span className="text-center">Signal</span>
      </div>

      {analysisData.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No analysis data
        </div>
      )}

      {analysisData.map((row, i) => {
        const struct = structureBadge(row.structure);
        const sig = signalBadgeStyle(row.signal);
        const pctWidth = row.percentile != null ? (row.percentile / maxPercentile) * 100 : 0;

        return (
          <div
            key={row.metal ?? i}
            className={`grid grid-cols-[1fr_0.9fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-white/[0.02] items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-orange-400">
              {row.metal}
            </span>
            <div>
              <span className={`text-[7px] font-mono font-bold px-1 py-px uppercase border ${struct.text} ${struct.bg}`}>
                {row.structure}
              </span>
            </div>
            <span className="text-[9px] font-mono text-white text-right">
              {row.steepness != null ? `${fmtNum(row.steepness, 1)} bp/m` : '-'}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.cashTo3m)}`}>
              {fmtPct(row.cashTo3m)}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.threeMTo12m)}`}>
              {fmtPct(row.threeMTo12m)}
            </span>
            <div className="flex items-center gap-1 justify-center">
              <div className="w-10 h-[4px] bg-neutral-800 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-orange-400/60"
                  style={{ width: `${Math.min(pctWidth, 100)}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-400">
                {row.percentile != null ? `${Math.round(row.percentile)}%` : '-'}
              </span>
            </div>
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black px-1 py-px uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Warehouse Tab ──

function WarehouseTab({ data }: { data: any }) {
  const warehouseData: any[] = useMemo(() => {
    if (Array.isArray(data.warehouse)) return data.warehouse;
    return [];
  }, [data]);

  return (
    <div>
      <div className="grid grid-cols-[1fr_0.8fr_0.9fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider">
        <span>Metal</span>
        <span className="text-right">Stocks (days)</span>
        <span className="text-right">Cancelled Wrts</span>
        <span className="text-right">Stock Chg 1M</span>
        <span className="text-right">Price Impact</span>
      </div>

      {warehouseData.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No warehouse data
        </div>
      )}

      {warehouseData.map((row, i) => (
        <div
          key={row.metal ?? i}
          className={`grid grid-cols-[1fr_0.8fr_0.9fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-white/[0.02] items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-orange-400">
            {row.metal}
          </span>
          <span className="text-[9px] font-mono text-white text-right">
            {row.stockDays != null ? `${fmtNum(row.stockDays, 0)}d` : '-'}
          </span>
          <span className={`text-[9px] font-mono text-right ${
            row.cancelledWarrants != null && row.cancelledWarrants > 30
              ? 'text-red-400'
              : row.cancelledWarrants != null && row.cancelledWarrants > 15
                ? 'text-yellow-400'
                : 'text-neutral-400'
          }`}>
            {row.cancelledWarrants != null ? `${fmtNum(row.cancelledWarrants, 1)}%` : '-'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.stockChange1m)}`}>
            {fmtPct(row.stockChange1m)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${correlationColor(row.priceImpact)}`}>
            {row.priceImpact != null ? fmtNum(row.priceImpact, 3) : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Spreads Tab ──

function SpreadsTab({ data }: { data: any }) {
  const spreadsData: any[] = useMemo(() => {
    if (Array.isArray(data.spreads)) return data.spreads;
    return [];
  }, [data]);

  return (
    <div>
      <div className="grid grid-cols-[0.9fr_0.9fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider">
        <span>Metal</span>
        <span>Spread</span>
        <span className="text-right">Value</span>
        <span className="text-right">1W Chg</span>
        <span className="text-right">Ann. Return</span>
        <span className="text-center">Direction</span>
      </div>

      {spreadsData.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No spread data
        </div>
      )}

      {spreadsData.map((row, i) => {
        const dir = directionBadge(row.direction);
        return (
          <div
            key={`${row.metal}-${row.spread}-${i}`}
            className={`grid grid-cols-[0.9fr_0.9fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-white/[0.02] items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-orange-400">
              {row.metal}
            </span>
            <span className="text-[8px] font-mono text-neutral-400">
              {row.spread ?? '-'}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right">
              {fmtDollar(row.value)}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.change1w)}`}>
              {fmtDollar(row.change1w)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.annualReturn)}`}>
              {fmtPct(row.annualReturn)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black px-1 py-px uppercase border ${dir.text} ${dir.bg}`}>
                {dir.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
