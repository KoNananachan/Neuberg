import { useState, useMemo } from 'react';
import { useFinancialConditions } from '../../api/hooks/use-financial-conditions';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type RegionCode = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'GLOBAL';

type Regime = 'VERY LOOSE' | 'LOOSE' | 'NEUTRAL' | 'TIGHT' | 'VERY TIGHT';

interface SubComponent {
  name: string;
  zScore: number;
}

interface FciComponent {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  subComponents?: SubComponent[];
}

interface StressEvent {
  date: string;
  label: string;
  fci: number;
}

interface RegionData {
  fci: number;
  regime: Regime;
  change1d: number;
  change1w: number;
  change1m: number;
  percentile: number;
  components: FciComponent[];
  history30d: number[];
  policyImplications: string[];
  stressEvents: StressEvent[];
}

interface FinancialConditionsData {
  globalSummary: string;
  regions: Record<RegionCode, RegionData>;
  timestamp: string;
}

// ── Constants ──

const REGIONS: { code: RegionCode; label: string }[] = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'CN', label: 'CN' },
  { code: 'GLOBAL', label: 'GLOBAL' },
];

const DEFAULT_COMPONENTS: FciComponent[] = [
  { name: 'Interest Rates', value: 0, weight: 0.30, contribution: 0, subComponents: [{ name: 'Fed Funds Rate', zScore: 0 }, { name: '2Y Treasury', zScore: 0 }, { name: '10Y Treasury', zScore: 0 }] },
  { name: 'Credit', value: 0, weight: 0.25, contribution: 0, subComponents: [{ name: 'IG Spread', zScore: 0 }, { name: 'HY Spread', zScore: 0 }, { name: 'CDS Index', zScore: 0 }] },
  { name: 'Equity', value: 0, weight: 0.20, contribution: 0, subComponents: [{ name: 'S&P 500', zScore: 0 }, { name: 'VIX', zScore: 0 }, { name: 'Market Cap/GDP', zScore: 0 }] },
  { name: 'Currency', value: 0, weight: 0.15, contribution: 0, subComponents: [{ name: 'DXY Index', zScore: 0 }, { name: 'EUR/USD', zScore: 0 }, { name: 'Trade-Weighted USD', zScore: 0 }] },
  { name: 'Housing', value: 0, weight: 0.10, contribution: 0, subComponents: [{ name: 'Mortgage Rate', zScore: 0 }, { name: 'Housing Starts', zScore: 0 }, { name: 'Case-Shiller', zScore: 0 }] },
];

// ── Helpers ──

function getRegime(fci: number): Regime {
  if (fci <= -1.5) return 'VERY LOOSE';
  if (fci <= -0.5) return 'LOOSE';
  if (fci <= 0.5) return 'NEUTRAL';
  if (fci <= 1.5) return 'TIGHT';
  return 'VERY TIGHT';
}

function regimeColor(regime: Regime): { text: string; bg: string; fill: string } {
  switch (regime) {
    case 'VERY LOOSE': return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30', fill: '#4ade80' };
    case 'LOOSE': return { text: 'text-green-400/80', bg: 'bg-green-500/8 border border-green-500/20', fill: '#86efac' };
    case 'NEUTRAL': return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30', fill: '#a3a3a3' };
    case 'TIGHT': return { text: 'text-red-400/80', bg: 'bg-red-500/8 border border-red-500/20', fill: '#fca5a5' };
    case 'VERY TIGHT': return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', fill: '#f87171' };
  }
}

function fmtFci(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

function changeColor(n: number): string {
  // For FCI, positive change = tightening = red, negative = loosening = green
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function contributionColor(n: number): string {
  // Positive contribution = tightening = red, negative = loosening = green
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function contributionBarColor(n: number): string {
  return n >= 0 ? '#f87171' : '#4ade80';
}

function zScoreColor(z: number): string {
  if (z > 1.5) return 'text-red-400';
  if (z > 0.5) return 'text-red-400/70';
  if (z < -1.5) return 'text-green-400';
  if (z < -0.5) return 'text-green-400/70';
  return 'text-neutral-500';
}

function sparklineChar(val: number, min: number, max: number): string {
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const range = max - min || 1;
  const idx = Math.min(Math.floor(((val - min) / range) * blocks.length), blocks.length - 1);
  return blocks[Math.max(0, idx)] ?? blocks[0];
}

// ── Safely extract typed data ──

function parseData(raw: unknown): FinancialConditionsData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (!d['regions'] || typeof d['regions'] !== 'object') return null;
  return raw as FinancialConditionsData;
}

function getRegionData(data: FinancialConditionsData, region: RegionCode): RegionData {
  const r = data.regions?.[region];
  if (r) return r;
  // Fallback empty region
  return {
    fci: 0,
    regime: 'NEUTRAL',
    change1d: 0,
    change1w: 0,
    change1m: 0,
    percentile: 50,
    components: DEFAULT_COMPONENTS,
    history30d: [],
    policyImplications: [],
    stressEvents: [],
  };
}

// ── Main Panel ──

export function FinancialConditionsPanel() {
  const { data: rawData, isLoading, refetch } = useFinancialConditions();
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('US');
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  const data = useMemo(() => parseData(rawData), [rawData]);
  const regionData = useMemo(() => data ? getRegionData(data, selectedRegion) : null, [data, selectedRegion]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            Financial Conditions Index
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {data.globalSummary ?? ''}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {REGIONS.map((r) => (
          <button
            key={r.code}
            onClick={() => setSelectedRegion(r.code)}
            className={`flex-1 py-1 text-[8px] font-black font-mono uppercase tracking-wider text-center transition-colors ${
              selectedRegion === r.code
                ? 'text-cyan-400 bg-cyan-400/[0.06] border-b border-cyan-400'
                : 'text-neutral-600 hover:text-neutral-400 hover:bg-cyan-400/[0.02]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && regionData && (
          <>
            <FciDisplay region={selectedRegion} regionData={regionData} />
            <ComponentBreakdown
              components={regionData.components ?? DEFAULT_COMPONENTS}
              expandedComponent={expandedComponent}
              onToggle={(name) => setExpandedComponent(expandedComponent === name ? null : name)}
            />
            <HistorySparkline history={regionData.history30d ?? []} fci={regionData.fci} />
            <PolicyImplications implications={regionData.policyImplications ?? []} />
            <StressTimeline events={regionData.stressEvents ?? []} />
            {data.timestamp && (
              <div className="px-3 py-1 border-t border-border/10">
                <span className="text-[7px] font-mono text-neutral-700">
                  Last update: {new Date(data.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Main FCI Display ──

function FciDisplay({ region, regionData }: { region: RegionCode; regionData: RegionData }) {
  const regime = regionData.regime ?? getRegime(regionData.fci);
  const rc = regimeColor(regime);
  const pct = Math.max(0, Math.min(100, regionData.percentile ?? 50));

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="flex items-start justify-between">
        {/* FCI Value */}
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">
            {region} FCI
          </span>
          <span className={`text-[22px] font-black font-mono tabular-nums leading-none ${rc.text}`}>
            {fmtFci(regionData.fci)}
          </span>
          <span className={`mt-1 px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider inline-block w-fit ${rc.bg}`}>
            {regime}
          </span>
        </div>

        {/* Changes */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">1D</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(regionData.change1d)}`}>
              {fmtChange(regionData.change1d)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">1W</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(regionData.change1w)}`}>
              {fmtChange(regionData.change1w)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">1M</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(regionData.change1m)}`}>
              {fmtChange(regionData.change1m)}
            </span>
          </div>
        </div>
      </div>

      {/* Percentile Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Historical Percentile
          </span>
          <span className="text-[8px] font-mono font-bold text-cyan-400 tabular-nums">
            {pct.toFixed(0)}th
          </span>
        </div>
        <div className="h-1.5 bg-neutral-900 relative">
          {/* Gradient zones */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-green-500/20" />
            <div className="flex-1 bg-green-500/10" />
            <div className="flex-1 bg-neutral-500/10" />
            <div className="flex-1 bg-red-500/10" />
            <div className="flex-1 bg-red-500/20" />
          </div>
          {/* Pointer */}
          <div
            className="absolute top-0 h-full w-0.5 bg-cyan-400"
            style={{ left: `${pct}%` }}
          />
          {/* Fill */}
          <div
            className="absolute top-0 h-full bg-cyan-400/20"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[6px] font-mono text-green-400/50">LOOSE</span>
          <span className="text-[6px] font-mono text-red-400/50">TIGHT</span>
        </div>
      </div>
    </div>
  );
}

// ── 2. Component Breakdown ──

function ComponentBreakdown({
  components,
  expandedComponent,
  onToggle,
}: {
  components: FciComponent[];
  expandedComponent: string | null;
  onToggle: (name: string) => void;
}) {
  const maxContrib = useMemo(() => {
    const vals = components.map((c) => Math.abs(c.contribution));
    return Math.max(...vals, 0.01);
  }, [components]);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Component Breakdown
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_50px_36px_50px_80px] gap-0 px-3 py-0.5 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Component</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Value</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Wt</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Contrib</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Impact</span>
      </div>

      {components.map((comp) => {
        const isExpanded = expandedComponent === comp.name;
        return (
          <div key={comp.name}>
            {/* Component Row */}
            <button
              onClick={() => onToggle(comp.name)}
              className="w-full grid grid-cols-[1fr_50px_36px_50px_80px] gap-0 px-3 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center text-left"
            >
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-neutral-600">
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
                <span className="text-[8px] font-mono font-bold text-neutral-200">
                  {comp.name}
                </span>
              </div>
              <span className="text-[8px] font-mono font-bold text-neutral-300 text-right tabular-nums">
                {comp.value?.toFixed(2) ?? '0.00'}
              </span>
              <span className="text-[7px] font-mono text-neutral-500 text-right tabular-nums">
                {((comp.weight ?? 0) * 100).toFixed(0)}%
              </span>
              <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${contributionColor(comp.contribution)}`}>
                {fmtChange(comp.contribution)}
              </span>
              {/* Contribution Bar */}
              <div className="flex items-center justify-end">
                <ContributionBar value={comp.contribution} max={maxContrib} />
              </div>
            </button>

            {/* Sub-components (expanded) */}
            {isExpanded && comp.subComponents && comp.subComponents.length > 0 && (
              <div className="bg-[#030303]">
                {comp.subComponents.map((sub) => (
                  <div
                    key={sub.name}
                    className="grid grid-cols-[1fr_60px] gap-0 px-3 pl-8 py-[2px] border-b border-border/5 hover:bg-cyan-400/[0.02]"
                  >
                    <span className="text-[7px] font-mono text-neutral-500">{sub.name}</span>
                    <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${zScoreColor(sub.zScore)}`}>
                      z: {sub.zScore >= 0 ? '+' : ''}{sub.zScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContributionBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  const color = contributionBarColor(value);
  const isPositive = value >= 0;

  return (
    <div className="w-[70px] h-[6px] bg-neutral-900 relative flex items-center">
      {/* Center line */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-neutral-700" />
      {isPositive ? (
        <div
          className="absolute h-full"
          style={{
            left: '50%',
            width: `${pct / 2}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      ) : (
        <div
          className="absolute h-full"
          style={{
            right: '50%',
            width: `${pct / 2}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}

// ── 3. History Sparkline (30 days) ──

function HistorySparkline({ history, fci }: { history: number[]; fci: number }) {
  const display = useMemo(() => {
    if (!history || history.length === 0) return null;
    const vals = history.slice(-30);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const chars = vals.map((v) => sparklineChar(v, min, max));
    return { chars, min, max, vals };
  }, [history]);

  if (!display) {
    return (
      <div className="px-3 py-2 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          30-Day History
        </span>
        <div className="text-[7px] font-mono text-neutral-700 mt-1">No history available</div>
      </div>
    );
  }

  // Build ASCII bar grid as an alternative visualization
  const barRows = useMemo(() => {
    const W = 30;
    const H = 6;
    const vals = display.vals;
    const min = display.min;
    const max = display.max;
    const range = max - min || 1;

    const grid: string[][] = [];
    for (let row = 0; row < H; row++) {
      const rowArr: string[] = [];
      for (let col = 0; col < Math.min(vals.length, W); col++) {
        const normalized = ((vals[col] - min) / range) * H;
        const threshold = H - row;
        if (normalized >= threshold) {
          // Color based on value: above zero = red (tight), below = green (loose)
          rowArr.push(vals[col] >= 0 ? 'T' : 'L');
        } else {
          rowArr.push(' ');
        }
      }
      grid.push(rowArr);
    }
    return grid;
  }, [display]);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          30-Day History
        </span>
        <span className="text-[7px] font-mono text-neutral-600 tabular-nums">
          Range: {display.min.toFixed(2)} / {display.max.toFixed(2)}
        </span>
      </div>

      {/* Text sparkline */}
      <div className="font-mono text-[10px] leading-none tracking-tighter text-cyan-400/80 mb-1">
        {display.chars.join('')}
      </div>

      {/* ASCII bar grid */}
      <div className="font-mono text-[7px] leading-[7px]">
        {barRows.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell, ci) => (
              <span
                key={ci}
                className={`w-[6px] text-center ${
                  cell === 'T'
                    ? 'text-red-400/60'
                    : cell === 'L'
                      ? 'text-green-400/60'
                      : 'text-neutral-900'
                }`}
              >
                {cell === ' ' ? '\u00B7' : '\u2588'}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Axis labels */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[6px] font-mono text-neutral-700">-30D</span>
        <span className={`text-[7px] font-mono font-bold tabular-nums ${fci >= 0 ? 'text-red-400' : 'text-green-400'}`}>
          NOW {fmtFci(fci)}
        </span>
        <span className="text-[6px] font-mono text-neutral-700">TODAY</span>
      </div>
    </div>
  );
}

// ── 4. Policy Implications ──

function PolicyImplications({ implications }: { implications: string[] }) {
  if (!implications || implications.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">
        Policy Implications
      </div>
      <div className="flex flex-col gap-1">
        {implications.map((text, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="w-1 h-1 bg-cyan-400/40 mt-[3px] shrink-0" />
            <span className="text-[7.5px] font-mono text-neutral-400 leading-tight">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. Stress Events Timeline ──

function StressTimeline({ events }: { events: StressEvent[] }) {
  if (!events || events.length === 0) return null;

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  const maxFci = useMemo(() => Math.max(...sortedEvents.map((e) => Math.abs(e.fci)), 1), [sortedEvents]);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
        Stress Events
      </div>
      <div className="flex flex-col gap-0.5">
        {sortedEvents.map((evt, i) => {
          const barWidth = Math.min((Math.abs(evt.fci) / maxFci) * 100, 100);
          const isTight = evt.fci > 0;
          return (
            <div key={i} className="flex items-center gap-2 hover:bg-cyan-400/[0.02] px-1 py-[2px]">
              <span className="text-[6px] font-mono text-neutral-600 w-[42px] shrink-0 tabular-nums">
                {evt.date?.slice(0, 7) ?? ''}
              </span>
              <div className="flex-1 h-[5px] bg-neutral-900 relative">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: isTight ? '#f87171' : '#4ade80',
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className={`text-[7px] font-mono font-bold w-[32px] text-right tabular-nums shrink-0 ${isTight ? 'text-red-400' : 'text-green-400'}`}>
                {fmtFci(evt.fci)}
              </span>
              <span className="text-[6px] font-mono text-neutral-500 truncate max-w-[100px]">
                {evt.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
