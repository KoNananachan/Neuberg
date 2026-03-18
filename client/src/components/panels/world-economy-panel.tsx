import { useState, useMemo } from 'react';
import { useT } from '../../i18n';
import { Globe, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

// --- Translation helper with fallback ---

function useTr() {
  const t = useT();
  return (key: string, fallback: string) => {
    try { return (t as any)(key) || fallback; } catch { return fallback; }
  };
}

// --- Static reference data (curated, March 2026) ---

const LAST_UPDATED = '2026-03-18';

interface EconomyData {
  id: string;
  flag: string;
  name: string;
  gdp: number;       // trillions USD
  growth: number;     // % YoY
  inflation: number;  // % CPI
  unemployment: number; // %
  rate: number;       // central bank rate %
  debtGdp: number;    // debt-to-GDP %
  exports: number;    // billions USD
  imports: number;    // billions USD
}

const ECONOMIES: EconomyData[] = [
  { id: 'us', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', gdp: 28.8, growth: 2.3, inflation: 2.8, unemployment: 4.1, rate: 4.50, debtGdp: 123, exports: 2090, imports: 3280 },
  { id: 'cn', flag: '\u{1F1E8}\u{1F1F3}', name: 'China', gdp: 18.5, growth: 5.0, inflation: 0.5, unemployment: 5.2, rate: 3.10, debtGdp: 84, exports: 3380, imports: 2560 },
  { id: 'jp', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', gdp: 4.4, growth: 1.2, inflation: 2.8, unemployment: 2.4, rate: 0.50, debtGdp: 255, exports: 780, imports: 850 },
  { id: 'de', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', gdp: 4.5, growth: 0.3, inflation: 2.2, unemployment: 6.0, rate: 2.65, debtGdp: 64, exports: 1660, imports: 1410 },
  { id: 'gb', flag: '\u{1F1EC}\u{1F1E7}', name: 'UK', gdp: 3.5, growth: 0.9, inflation: 3.0, unemployment: 4.0, rate: 4.50, debtGdp: 101, exports: 510, imports: 760 },
  { id: 'fr', flag: '\u{1F1EB}\u{1F1F7}', name: 'France', gdp: 3.1, growth: 0.7, inflation: 2.1, unemployment: 7.3, rate: 2.65, debtGdp: 112, exports: 620, imports: 730 },
  { id: 'in', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', gdp: 3.9, growth: 6.5, inflation: 4.5, unemployment: 7.8, rate: 6.50, debtGdp: 83, exports: 450, imports: 710 },
  { id: 'br', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', gdp: 2.2, growth: 2.0, inflation: 4.8, unemployment: 7.6, rate: 13.25, debtGdp: 76, exports: 340, imports: 260 },
  { id: 'kr', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', gdp: 1.7, growth: 2.0, inflation: 2.4, unemployment: 2.8, rate: 2.75, debtGdp: 54, exports: 680, imports: 640 },
  { id: 'au', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', gdp: 1.8, growth: 1.5, inflation: 3.6, unemployment: 4.1, rate: 4.10, debtGdp: 52, exports: 360, imports: 290 },
  { id: 'ca', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', gdp: 2.1, growth: 1.0, inflation: 2.6, unemployment: 6.6, rate: 2.75, debtGdp: 107, exports: 0, imports: 0 },
  { id: 'ru', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia', gdp: 2.0, growth: 3.6, inflation: 7.4, unemployment: 2.4, rate: 21.00, debtGdp: 22, exports: 0, imports: 0 },
];

// Economies with trade data (top 10)
const TRADE_ECONOMIES = ECONOMIES.filter(e => e.exports > 0 && e.imports > 0);

// Global summary
const GLOBAL = {
  gdp: 105,
  growth: 3.2,
  inflation: 4.1,
  trade: 32,
};

// --- Metric definitions ---

type MetricKey = 'gdp' | 'growth' | 'inflation' | 'unemployment' | 'rate' | 'debtGdp';

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: 'gdp', label: 'GDP ($T)', unit: 'T', format: (v) => `$${v.toFixed(1)}T` },
  { key: 'growth', label: 'Growth', unit: '%', format: (v) => `${v.toFixed(1)}%` },
  { key: 'inflation', label: 'Inflation', unit: '%', format: (v) => `${v.toFixed(1)}%` },
  { key: 'unemployment', label: 'Unemployment', unit: '%', format: (v) => `${v.toFixed(1)}%` },
  { key: 'rate', label: 'Interest Rate', unit: '%', format: (v) => `${v.toFixed(2)}%` },
  { key: 'debtGdp', label: 'Debt/GDP', unit: '%', format: (v) => `${v.toFixed(0)}%` },
];

// --- Color helpers ---

function growthColor(v: number): string {
  if (v > 2) return 'text-emerald-400';
  if (v >= 0) return 'text-amber-400';
  return 'text-red-400';
}

function inflationColor(v: number): string {
  if (v < 2) return 'text-emerald-400';
  if (v <= 4) return 'text-amber-400';
  return 'text-red-400';
}

function tradeBalanceColor(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-neutral/50';
}

// SVG bar colors per economy
const ECONOMY_COLORS: Record<string, string> = {
  us: '#38bdf8', cn: '#ef4444', jp: '#f87171', de: '#facc15',
  gb: '#a78bfa', fr: '#60a5fa', in: '#fb923c', br: '#34d399',
  kr: '#f472b6', au: '#22d3ee', ca: '#e879f9', ru: '#94a3b8',
};

// --- Main Component ---

type Tab = 'overview' | 'comparison' | 'trade';
type SortDir = 'asc' | 'desc';

export function WorldEconomyPanel() {
  const tr = useTr();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: tr('weTabOverview', 'Overview') },
    { key: 'comparison', label: tr('weTabComparison', 'Comparison') },
    { key: 'trade', label: tr('weTabTrade', 'Trade') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr('wePanelTitle', 'WORLD ECONOMY OVERVIEW')}
          </span>
          <span className="text-[7px] font-mono text-neutral/25 ml-1">ECOW</span>
        </div>
        <span className="text-[7px] font-mono text-neutral/30">
          {tr('weLastUpdated', 'UPDATED')}: {LAST_UPDATED}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_.key
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t_.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'comparison' && <ComparisonTab />}
        {tab === 'trade' && <TradeTab />}
      </div>
    </div>
  );
}

// === OVERVIEW TAB ===

function OverviewTab() {
  const tr = useTr();
  const [sortCol, setSortCol] = useState<MetricKey | 'name'>('gdp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const arr = [...ECONOMIES];
    arr.sort((a, b) => {
      if (sortCol === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const va = a[sortCol];
      const vb = b[sortCol];
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [sortCol, sortDir]);

  function handleSort(col: MetricKey | 'name') {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  const SortIcon = ({ col }: { col: MetricKey | 'name' }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-2 h-2 opacity-30 ml-0.5 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-2.5 h-2.5 text-sky-400 ml-0.5 inline" />
      : <ChevronDown className="w-2.5 h-2.5 text-sky-400 ml-0.5 inline" />;
  };

  return (
    <div>
      {/* Global Summary Stats */}
      <div className="grid grid-cols-4 gap-px bg-border/10 border-b border-border/20">
        {[
          { label: tr('weWorldGdp', 'WORLD GDP'), value: `$${GLOBAL.gdp}T`, color: 'text-sky-400' },
          { label: tr('weGlobalGrowth', 'GLOBAL GROWTH'), value: `${GLOBAL.growth}%`, color: 'text-emerald-400' },
          { label: tr('weGlobalInflation', 'GLOBAL INFLATION'), value: `${GLOBAL.inflation}%`, color: 'text-amber-400' },
          { label: tr('weGlobalTrade', 'GLOBAL TRADE'), value: `$${GLOBAL.trade}T`, color: 'text-sky-400' },
        ].map((s) => (
          <div key={s.label} className="bg-black px-3 py-2">
            <div className="text-[7px] font-mono font-bold text-neutral/35 uppercase tracking-wider">{s.label}</div>
            <div className={`text-[14px] font-mono font-black ${s.color} mt-0.5`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Economy Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="border-b border-border/30 bg-white/[0.02]">
              <th
                className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-neutral/70"
                onClick={() => handleSort('name')}
              >
                {tr('weColEconomy', 'ECONOMY')}<SortIcon col="name" />
              </th>
              {METRICS.map((m) => (
                <th
                  key={m.key}
                  className="text-right py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-neutral/70"
                  onClick={() => handleSort(m.key)}
                >
                  {m.label}<SortIcon col={m.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((eco, i) => (
              <tr
                key={eco.id}
                className={`border-b border-border/10 hover:bg-white/[0.03] transition-colors ${
                  i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                }`}
              >
                <td className="py-1.5 px-2 whitespace-nowrap">
                  <span className="mr-1.5">{eco.flag}</span>
                  <span className="text-white font-bold text-[9px]">{eco.name}</span>
                </td>
                <td className="text-right py-1.5 px-2 text-white font-bold">${eco.gdp.toFixed(1)}T</td>
                <td className={`text-right py-1.5 px-2 font-bold ${growthColor(eco.growth)}`}>{eco.growth.toFixed(1)}%</td>
                <td className={`text-right py-1.5 px-2 font-bold ${inflationColor(eco.inflation)}`}>{eco.inflation.toFixed(1)}%</td>
                <td className="text-right py-1.5 px-2 text-neutral/70">{eco.unemployment.toFixed(1)}%</td>
                <td className="text-right py-1.5 px-2 text-sky-400/80">{eco.rate.toFixed(2)}%</td>
                <td className="text-right py-1.5 px-2 text-neutral/60">{eco.debtGdp}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/20">
        <p className="text-[7px] font-mono text-neutral/25 leading-relaxed">
          {tr('weDisclaimer', 'Data is curated from IMF, World Bank, and central bank sources. Reference data as of Q1 2026. Not real-time.')}
        </p>
      </div>
    </div>
  );
}

// === COMPARISON TAB ===

function ComparisonTab() {
  const tr = useTr();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('gdp');

  const metric = METRICS.find(m => m.key === selectedMetric)!;

  const sorted = useMemo(() => {
    return [...ECONOMIES].sort((a, b) => b[selectedMetric] - a[selectedMetric]);
  }, [selectedMetric]);

  const maxVal = useMemo(() => Math.max(...sorted.map(e => e[selectedMetric])), [sorted, selectedMetric]);

  // SVG dimensions
  const barHeight = 24;
  const gap = 4;
  const labelWidth = 120;
  const valueWidth = 60;
  const chartWidth = 500;
  const barAreaWidth = chartWidth - labelWidth - valueWidth;
  const svgHeight = sorted.length * (barHeight + gap) + gap;

  return (
    <div>
      {/* Metric selector */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/20 bg-white/[0.01]">
        <span className="text-[7px] font-mono font-bold text-neutral/40 uppercase tracking-wider">
          {tr('weCompareMetric', 'METRIC')}:
        </span>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
          className="bg-black border border-border/30 text-[9px] font-mono text-sky-400 px-2 py-1 rounded outline-none focus:border-sky-400/50"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* SVG Bar Chart */}
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: 420 }}>
          {sorted.map((eco, i) => {
            const y = gap + i * (barHeight + gap);
            const val = eco[selectedMetric];
            const barW = maxVal > 0 ? (val / maxVal) * barAreaWidth : 0;
            const color = ECONOMY_COLORS[eco.id] || '#38bdf8';

            return (
              <g key={eco.id}>
                {/* Flag + Name label */}
                <text
                  x={labelWidth - 6}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.55)"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {eco.flag} {eco.name}
                </text>

                {/* Bar background */}
                <rect
                  x={labelWidth}
                  y={y + 3}
                  width={barAreaWidth}
                  height={barHeight - 6}
                  rx={2}
                  fill="rgba(255,255,255,0.03)"
                />

                {/* Bar fill */}
                <rect
                  x={labelWidth}
                  y={y + 3}
                  width={barW}
                  height={barHeight - 6}
                  rx={2}
                  fill={color}
                  opacity={0.75}
                />

                {/* Value */}
                <text
                  x={labelWidth + barAreaWidth + 6}
                  y={y + barHeight / 2 + 4}
                  textAnchor="start"
                  fill={color}
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {metric.format(val)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 px-3 py-2 border-t border-border/20">
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{tr('weCompHighest', 'HIGHEST')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {sorted[0]?.flag} {sorted[0]?.name} {metric.format(sorted[0]?.[selectedMetric] ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{tr('weCompLowest', 'LOWEST')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {sorted[sorted.length - 1]?.flag} {sorted[sorted.length - 1]?.name} {metric.format(sorted[sorted.length - 1]?.[selectedMetric] ?? 0)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{tr('weCompAvg', 'AVERAGE')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {metric.format(ECONOMIES.reduce((s, e) => s + e[selectedMetric], 0) / ECONOMIES.length)}
          </div>
        </div>
      </div>
    </div>
  );
}

// === TRADE TAB ===

function TradeTab() {
  const tr = useTr();

  const tradeData = useMemo(() => {
    return [...TRADE_ECONOMIES]
      .map(e => ({ ...e, balance: e.exports - e.imports, totalTrade: e.exports + e.imports }))
      .sort((a, b) => b.totalTrade - a.totalTrade);
  }, []);

  const maxTrade = useMemo(() => Math.max(...tradeData.map(e => Math.max(e.exports, e.imports))), [tradeData]);

  // SVG dual-bar chart dimensions
  const barHeight = 28;
  const gap = 6;
  const labelWidth = 90;
  const chartWidth = 500;
  const barAreaWidth = chartWidth - labelWidth;
  const svgHeight = tradeData.length * (barHeight + gap) + gap + 20; // +20 for legend

  return (
    <div>
      {/* Trade Summary */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-border/20 bg-white/[0.01]">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-sky-400/60">
          {tr('weTradeTitle', 'TRADE BALANCE OVERVIEW')}
        </span>
        <span className="text-[7px] font-mono text-neutral/30">
          {tr('weTradeTotalVol', 'TOP 10 BY VOLUME')}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-emerald-500/70" />
          <span className="text-[7px] font-mono text-neutral/40 uppercase">{tr('weTradeExports', 'Exports')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-red-500/70" />
          <span className="text-[7px] font-mono text-neutral/40 uppercase">{tr('weTradeImports', 'Imports')}</span>
        </div>
      </div>

      {/* Dual-bar chart */}
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: 440 }}>
          {tradeData.map((eco, i) => {
            const y = gap + i * (barHeight + gap);
            const exportW = maxTrade > 0 ? (eco.exports / maxTrade) * (barAreaWidth * 0.7) : 0;
            const importW = maxTrade > 0 ? (eco.imports / maxTrade) * (barAreaWidth * 0.7) : 0;
            const halfBar = (barHeight - 6) / 2;

            return (
              <g key={eco.id}>
                {/* Label */}
                <text
                  x={labelWidth - 6}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.55)"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {eco.flag} {eco.name}
                </text>

                {/* Export bar (top half) */}
                <rect
                  x={labelWidth}
                  y={y + 2}
                  width={exportW}
                  height={halfBar}
                  rx={1.5}
                  fill="#34d399"
                  opacity={0.7}
                />
                <text
                  x={labelWidth + exportW + 4}
                  y={y + 2 + halfBar / 2 + 3}
                  fill="#34d399"
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ${eco.exports.toLocaleString()}B
                </text>

                {/* Import bar (bottom half) */}
                <rect
                  x={labelWidth}
                  y={y + 2 + halfBar + 2}
                  width={importW}
                  height={halfBar}
                  rx={1.5}
                  fill="#ef4444"
                  opacity={0.6}
                />
                <text
                  x={labelWidth + importW + 4}
                  y={y + 2 + halfBar + 2 + halfBar / 2 + 3}
                  fill="#ef4444"
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ${eco.imports.toLocaleString()}B
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Trade balance table */}
      <div className="border-t border-border/20">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="border-b border-border/30 bg-white/[0.02]">
              <th className="text-left py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider">{tr('weTradeEconomy', 'ECONOMY')}</th>
              <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider">{tr('weTradeExp', 'EXPORTS')}</th>
              <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider">{tr('weTradeImp', 'IMPORTS')}</th>
              <th className="text-right py-1.5 px-2 text-[7px] font-black text-neutral/40 uppercase tracking-wider">{tr('weTradeBal', 'BALANCE')}</th>
            </tr>
          </thead>
          <tbody>
            {tradeData.map((eco, i) => (
              <tr
                key={eco.id}
                className={`border-b border-border/10 hover:bg-white/[0.03] transition-colors ${
                  i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                }`}
              >
                <td className="py-1.5 px-2 whitespace-nowrap">
                  <span className="mr-1.5">{eco.flag}</span>
                  <span className="text-white font-bold text-[9px]">{eco.name}</span>
                </td>
                <td className="text-right py-1.5 px-2 text-emerald-400/80">${eco.exports.toLocaleString()}B</td>
                <td className="text-right py-1.5 px-2 text-red-400/80">${eco.imports.toLocaleString()}B</td>
                <td className={`text-right py-1.5 px-2 font-bold ${tradeBalanceColor(eco.balance)}`}>
                  {eco.balance > 0 ? '+' : ''}{eco.balance.toLocaleString()}B
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trade summary */}
      <div className="flex gap-6 px-3 py-2 border-t border-border/20">
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{tr('weTradeLargestSurplus', 'LARGEST SURPLUS')}</div>
          <div className="text-[10px] font-mono font-bold text-emerald-400">
            {(() => {
              const top = [...tradeData].sort((a, b) => b.balance - a.balance)[0];
              return `${top?.flag} ${top?.name} +$${top?.balance.toLocaleString()}B`;
            })()}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{tr('weTradeLargestDeficit', 'LARGEST DEFICIT')}</div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {(() => {
              const bot = [...tradeData].sort((a, b) => a.balance - b.balance)[0];
              return `${bot?.flag} ${bot?.name} $${bot?.balance.toLocaleString()}B`;
            })()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/20">
        <p className="text-[7px] font-mono text-neutral/25 leading-relaxed">
          {tr('weTradeDisclaimer', 'Trade data curated from WTO and national statistics. Goods trade only, services excluded. Reference data as of 2025.')}
        </p>
      </div>
    </div>
  );
}
