import { useState } from 'react';
import { useAssetAllocation } from '../../api/hooks/use-asset-allocation';
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

// ── Local types (data from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AllocationData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetClassRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PerformanceRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TacticalTilt = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FrontierPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RebalanceSummary = any;

// ── Constants ──

const ACCENT = '#60a5fa'; // blue-400

type ModelProfile = 'conservative' | 'moderate' | 'growth' | 'aggressive';

const MODEL_TABS: { key: ModelProfile; label: string }[] = [
  { key: 'conservative', label: 'CONSERVATIVE' },
  { key: 'moderate', label: 'MODERATE' },
  { key: 'growth', label: 'GROWTH' },
  { key: 'aggressive', label: 'AGGRESSIVE' },
];

const CLASS_COLORS: Record<string, string> = {
  equity: '#3b82f6',
  fixed_income: '#22c55e',
  commodities: '#f59e0b',
  real_estate: '#a855f7',
  alternatives: '#ec4899',
  cash: '#6b7280',
};

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

function fmtPctPlain(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '--';
  return n.toFixed(decimals) + '%';
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals);
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return String(n) + 'd';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n != null && n >= 0 ? '+' : '') + (n ?? 0).toFixed(1) + 'bp';
}

function driftColor(drift: number | null | undefined): string {
  if (drift == null) return 'text-neutral-500';
  const abs = Math.abs(drift);
  if (abs >= 5) return 'text-red-400';
  if (abs >= 2) return 'text-amber-400';
  return 'text-emerald-400';
}

function signalText(drift: number | null | undefined): { text: string; color: string } {
  if (drift == null) return { text: '--', color: 'text-neutral-600' };
  if (drift > 2) return { text: 'SELL', color: 'text-red-400' };
  if (drift < -2) return { text: 'BUY', color: 'text-emerald-400' };
  return { text: 'HOLD', color: 'text-neutral-500' };
}

function pctColor(v: number | null | undefined): string {
  if (v == null) return 'text-neutral-500';
  return v >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function convictionBadge(level: string | null | undefined): { bg: string; text: string } {
  switch (level) {
    case 'high':
      return { bg: 'bg-blue-400/20 text-blue-300', text: 'HIGH' };
    case 'medium':
      return { bg: 'bg-amber-400/15 text-amber-400', text: 'MED' };
    case 'low':
      return { bg: 'bg-neutral-400/10 text-neutral-500', text: 'LOW' };
    default:
      return { bg: 'bg-neutral-400/10 text-neutral-600', text: '--' };
  }
}

// ── Main Panel ──

export function AssetAllocationPanel() {
  const t = useT();
  const { data, isLoading, error } = useAssetAllocation();
  const [activeModel, setActiveModel] = useState<ModelProfile>('moderate');

  const modelData: AllocationData = data?.models?.[activeModel];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="4" height="10" fill={ACCENT} opacity="0.7" />
            <rect x="6" y="5" width="4" height="8" fill={ACCENT} opacity="0.5" />
            <rect x="11" y="1" width="4" height="12" fill={ACCENT} opacity="0.3" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'panelAssetAllocation', 'Asset Allocation')}
          </span>
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          PORT/ALLC
        </span>
      </div>

      {/* Model Portfolio Tabs */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#050505]">
        {MODEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveModel(tab.key)}
            className={`flex-1 px-2 py-1.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeModel === tab.key
                ? 'border-blue-400 text-blue-400 bg-blue-400/[0.05]'
                : 'border-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/[0.01]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ color: ACCENT }} />
            <span className="ml-2 text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400/60 text-[9px] font-mono uppercase tracking-widest">
            {tr(t, 'error', 'Error loading data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase tracking-widest">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <AllocationChart modelData={modelData} />
            <DriftTable modelData={modelData} />
            <ReturnsSection modelData={modelData} />
            <TacticalTilts modelData={modelData} />
            <EfficientFrontier data={data} activeModel={activeModel} />
            <RebalancingSummary modelData={modelData} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Allocation Chart (Horizontal Stacked Bars) ──

function AllocationChart({ modelData }: { modelData: AllocationData }) {
  const t = useT();
  const allocations: AssetClassRow[] = modelData?.allocations ?? [];

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'aaAllocationChart', 'Allocation — Current vs Target')}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
        {allocations.map((a: AssetClassRow) => (
          <div key={a?.name} className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: CLASS_COLORS[a?.classKey] ?? '#6b7280' }}
            />
            <span className="text-[7px] font-mono text-neutral-500 uppercase">{a?.name ?? '--'}</span>
          </div>
        ))}
      </div>

      {/* Current bar */}
      <div className="mb-1">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">CURRENT</div>
        <div className="flex h-4 w-full bg-white/[0.02] overflow-hidden">
          {allocations.map((a: AssetClassRow) => {
            const w = a?.currentWeight ?? 0;
            if (w <= 0) return null;
            return (
              <div
                key={a?.name + '-current'}
                className="h-full relative group"
                style={{
                  width: `${w}%`,
                  backgroundColor: CLASS_COLORS[a?.classKey] ?? '#6b7280',
                  opacity: 0.85,
                }}
              >
                {w >= 6 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white/80">
                    {fmtPctPlain(w, 0)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Target bar */}
      <div>
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-0.5">TARGET</div>
        <div className="flex h-4 w-full bg-white/[0.02] overflow-hidden">
          {allocations.map((a: AssetClassRow) => {
            const w = a?.targetWeight ?? 0;
            if (w <= 0) return null;
            return (
              <div
                key={a?.name + '-target'}
                className="h-full relative"
                style={{
                  width: `${w}%`,
                  backgroundColor: CLASS_COLORS[a?.classKey] ?? '#6b7280',
                  opacity: 0.45,
                }}
              >
                {w >= 6 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white/50">
                    {fmtPctPlain(w, 0)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 2. Drift Table ──

function DriftTable({ modelData }: { modelData: AllocationData }) {
  const t = useT();
  const allocations: AssetClassRow[] = modelData?.allocations ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'aaDriftAnalysis', 'Drift Analysis')}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">ASSET CLASS</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">CURRENT</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">TARGET</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">DRIFT</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">SIGNAL</span>
      </div>

      {/* Rows */}
      {allocations.map((a: AssetClassRow) => {
        const drift = (a?.currentWeight ?? 0) - (a?.targetWeight ?? 0);
        const signal = signalText(drift);
        return (
          <div
            key={a?.name}
            className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-1.5 h-1.5 shrink-0"
                style={{ backgroundColor: CLASS_COLORS[a?.classKey] ?? '#6b7280' }}
              />
              <span className="text-[9px] font-mono font-bold text-white truncate">
                {a?.name ?? '--'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtPctPlain(a?.currentWeight)}
            </span>
            <span className="text-[9px] font-mono text-neutral-500 text-right">
              {fmtPctPlain(a?.targetWeight)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${driftColor(drift)}`}>
              {fmtPct(drift, 1)}
            </span>
            <span className={`text-[8px] font-mono font-black text-right ${signal.color}`}>
              {signal.text}
            </span>
          </div>
        );
      })}

      {allocations.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
          {tr(t, 'noData', 'No data available')}
        </div>
      )}
    </div>
  );
}

// ── 3. Returns Section (Performance Grid) ──

function ReturnsSection({ modelData }: { modelData: AllocationData }) {
  const t = useT();
  const performance: PerformanceRow[] = modelData?.performance ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'aaPerformance', 'Performance')}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">ASSET CLASS</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">1Y</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">3Y</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">5Y</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-right">SHARPE</span>
      </div>

      {/* Rows */}
      {performance.map((row: PerformanceRow) => (
        <div
          key={row?.name}
          className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {row?.name ?? '--'}
          </span>
          <span className={`text-[9px] font-mono text-right ${pctColor(row?.ytd)}`}>
            {fmtPct(row?.ytd)}
          </span>
          <span className={`text-[9px] font-mono text-right ${pctColor(row?.oneYear)}`}>
            {fmtPct(row?.oneYear)}
          </span>
          <span className={`text-[9px] font-mono text-right ${pctColor(row?.threeYear)}`}>
            {fmtPct(row?.threeYear)}
          </span>
          <span className={`text-[9px] font-mono text-right ${pctColor(row?.fiveYear)}`}>
            {fmtPct(row?.fiveYear)}
          </span>
          <span className="text-[9px] font-mono font-bold text-blue-400/80 text-right">
            {fmtNum(row?.sharpe)}
          </span>
        </div>
      ))}

      {/* Portfolio total row */}
      {modelData?.portfolioReturn && (
        <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 bg-blue-400/[0.03] items-center">
          <span className="text-[9px] font-mono font-black text-blue-400 uppercase">PORTFOLIO</span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(modelData.portfolioReturn?.ytd)}`}>
            {fmtPct(modelData.portfolioReturn?.ytd)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(modelData.portfolioReturn?.oneYear)}`}>
            {fmtPct(modelData.portfolioReturn?.oneYear)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(modelData.portfolioReturn?.threeYear)}`}>
            {fmtPct(modelData.portfolioReturn?.threeYear)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(modelData.portfolioReturn?.fiveYear)}`}>
            {fmtPct(modelData.portfolioReturn?.fiveYear)}
          </span>
          <span className="text-[9px] font-mono font-black text-blue-400 text-right">
            {fmtNum(modelData.portfolioReturn?.sharpe)}
          </span>
        </div>
      )}

      {performance.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
          {tr(t, 'noData', 'No data available')}
        </div>
      )}
    </div>
  );
}

// ── 4. Tactical Tilts ──

function TacticalTilts({ modelData }: { modelData: AllocationData }) {
  const t = useT();
  const tilts: TacticalTilt[] = modelData?.tacticalTilts ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'aaTacticalTilts', 'Tactical Tilts')}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.5fr_1fr_0.5fr_1.2fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">ASSET</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-center">TILT</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-center">INDICATOR</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider text-center">CONV</span>
        <span className="text-[7px] font-black font-mono text-neutral-500 uppercase tracking-wider">RATIONALE</span>
      </div>

      {/* Rows */}
      {tilts.map((tilt: TacticalTilt, idx: number) => {
        const badge = convictionBadge(tilt?.conviction);
        const isOver = (tilt?.tiltBps ?? 0) > 0;
        return (
          <div
            key={tilt?.asset ?? idx}
            className="grid grid-cols-[1.4fr_0.5fr_1fr_0.5fr_1.2fr] px-3 py-1 border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">
              {tilt?.asset ?? '--'}
            </span>
            <div className="flex items-center justify-center">
              <span className={`text-[8px] font-mono font-black ${isOver ? 'text-emerald-400' : 'text-red-400'}`}>
                {isOver ? 'OW' : 'UW'}
              </span>
              <span className="text-[7px] font-mono text-neutral-500 ml-0.5">
                {fmtBps(tilt?.tiltBps)}
              </span>
            </div>
            <div className="flex items-center justify-center gap-0.5">
              <TiltBar value={tilt?.tiltBps} />
            </div>
            <div className="flex justify-center">
              <span className={`text-[7px] font-mono font-bold px-1 py-0.5 ${badge.bg}`}>
                {badge.text}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-500 truncate">
              {tilt?.rationale ?? '--'}
            </span>
          </div>
        );
      })}

      {tilts.length === 0 && (
        <div className="px-3 py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
          {tr(t, 'noTilts', 'No tactical tilts')}
        </div>
      )}
    </div>
  );
}

function TiltBar({ value }: { value: number | null | undefined }) {
  const v = value ?? 0;
  const maxBps = 200;
  const pct = Math.min(Math.abs(v) / maxBps, 1) * 50;
  const isPositive = v >= 0;

  return (
    <div className="w-full h-2 bg-white/[0.03] relative flex items-center">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
      {isPositive ? (
        <div
          className="absolute h-full bg-emerald-400/40"
          style={{ left: '50%', width: `${pct}%` }}
        />
      ) : (
        <div
          className="absolute h-full bg-red-400/40"
          style={{ right: '50%', width: `${pct}%` }}
        />
      )}
    </div>
  );
}

// ── 5. Efficient Frontier (Text-based Scatter Plot) ──

function EfficientFrontier({ data, activeModel }: { data: AllocationData; activeModel: ModelProfile }) {
  const t = useT();
  const frontier: FrontierPoint[] = data?.efficientFrontier ?? [];
  const currentPortfolio = data?.models?.[activeModel]?.frontierPosition;

  if (!frontier.length) {
    return (
      <div className="border-b border-border/20 px-3 py-3 text-center text-[8px] font-mono text-neutral-600 uppercase">
        {tr(t, 'noFrontierData', 'No frontier data')}
      </div>
    );
  }

  // Compute bounds
  const risks = frontier.map((p: FrontierPoint) => p?.risk ?? 0);
  const returns = frontier.map((p: FrontierPoint) => p?.expectedReturn ?? 0);
  const minRisk = Math.min(...risks);
  const maxRisk = Math.max(...risks);
  const minRet = Math.min(...returns);
  const maxRet = Math.max(...returns);
  const riskRange = maxRisk - minRisk || 1;
  const retRange = maxRet - minRet || 1;

  // Text-based scatter: 60 cols x 16 rows
  const cols = 60;
  const rows = 16;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '));

  // Draw axes
  for (let c = 0; c < cols; c++) grid[rows - 1][c] = '\u2500';
  for (let r = 0; r < rows; r++) grid[r][0] = '\u2502';
  grid[rows - 1][0] = '\u2514';

  // Plot frontier points
  frontier.forEach((p: FrontierPoint) => {
    const x = Math.round(((p?.risk ?? 0) - minRisk) / riskRange * (cols - 3)) + 2;
    const y = rows - 2 - Math.round(((p?.expectedReturn ?? 0) - minRet) / retRange * (rows - 3));
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      grid[y][x] = '\u00b7';
    }
  });

  // Plot current portfolio position
  if (currentPortfolio) {
    const px = Math.round(((currentPortfolio?.risk ?? 0) - minRisk) / riskRange * (cols - 3)) + 2;
    const py = rows - 2 - Math.round(((currentPortfolio?.expectedReturn ?? 0) - minRet) / retRange * (rows - 3));
    if (px >= 0 && px < cols && py >= 0 && py < rows) {
      grid[py][px] = '\u2588';
    }
  }

  const text = grid.map((row) => row.join('')).join('\n');

  return (
    <div className="border-b border-border/20 px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'aaEfficientFrontier', 'Efficient Frontier')}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral-600">{'\u00b7'}</span>
            <span className="text-[7px] font-mono text-neutral-600">FRONTIER</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-blue-400">{'\u2588'}</span>
            <span className="text-[7px] font-mono text-neutral-600">PORTFOLIO</span>
          </div>
        </div>
      </div>

      <div className="bg-[#060606] border border-border/10 p-2 overflow-x-auto">
        <div className="flex items-start gap-1">
          <div className="flex flex-col justify-between h-[128px] pr-0.5 shrink-0">
            <span className="text-[6px] font-mono text-neutral-600">{fmtPctPlain(maxRet)}</span>
            <span className="text-[6px] font-mono text-neutral-700 -rotate-90 origin-center">E(R)</span>
            <span className="text-[6px] font-mono text-neutral-600">{fmtPctPlain(minRet)}</span>
          </div>
          <pre className="text-[7px] font-mono text-blue-400/60 leading-[8px] select-none whitespace-pre">
            {text}
          </pre>
        </div>
        <div className="flex justify-between mt-0.5 ml-6">
          <span className="text-[6px] font-mono text-neutral-600">{fmtPctPlain(minRisk)}</span>
          <span className="text-[6px] font-mono text-neutral-700 uppercase">Risk (Vol)</span>
          <span className="text-[6px] font-mono text-neutral-600">{fmtPctPlain(maxRisk)}</span>
        </div>
      </div>
    </div>
  );
}

// ── 6. Rebalancing Summary ──

function RebalancingSummary({ modelData }: { modelData: AllocationData }) {
  const t = useT();
  const rebalance: RebalanceSummary = modelData?.rebalance;

  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 mb-2">
        {tr(t, 'aaRebalancing', 'Rebalancing')}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="DAYS SINCE"
          value={fmtDays(rebalance?.daysSinceRebalance)}
          accent={rebalance?.daysSinceRebalance != null && rebalance.daysSinceRebalance > 90}
        />
        <StatCard
          label="EST. COST"
          value={fmtBps(rebalance?.estimatedCostBps)}
          accent={false}
        />
        <StatCard
          label="TURNOVER"
          value={fmtPctPlain(rebalance?.turnoverPct)}
          accent={false}
        />
      </div>

      {/* Detail rows */}
      <div className="mt-2 space-y-0.5">
        <DetailRow label="LAST REBALANCE" value={rebalance?.lastRebalanceDate ?? '--'} />
        <DetailRow label="NEXT SCHEDULED" value={rebalance?.nextScheduledDate ?? '--'} />
        <DetailRow label="THRESHOLD" value={rebalance?.thresholdPct != null ? fmtPctPlain(rebalance.thresholdPct) + ' drift' : '--'} />
        <DetailRow label="METHOD" value={rebalance?.method ?? '--'} />
        <DetailRow
          label="TAX IMPACT"
          value={rebalance?.taxImpactBps != null ? fmtBps(rebalance.taxImpactBps) : '--'}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: boolean }) {
  return (
    <div className={`p-2 border border-border/20 bg-[#060606] ${accent ? 'border-amber-400/30' : ''}`}>
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-[11px] font-mono font-black ${accent ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 hover:bg-blue-400/[0.02] transition-colors px-1">
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
      <span className="text-[8px] font-mono text-neutral-400">{value}</span>
    </div>
  );
}
