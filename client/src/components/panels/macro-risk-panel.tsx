import { useMacroRisk } from '../../api/hooks/use-macro-risk';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Types ──

interface SubIndicator {
  name: string;
  value: number;
  trend: string;
  signal: string;
}

interface CompositeRisk {
  score: number;
  level: string;
  change1w: number;
  change1m: number;
}

interface RiskCategory {
  name: string;
  score: number;
  level: string;
  change1w: number;
  subIndicators: SubIndicator[];
}

interface Indicator {
  name: string;
  currentValue: number;
  unit: string;
  historicalAvg: number;
  zScore: number;
  percentile: number;
  signal: string;
}

interface RegionRisk {
  region: string;
  score: number;
  level: string;
  topRisk: string;
  change1w: number;
}

interface RiskSummary {
  compositeScore: number;
  highestRisk: string;
  lowestRisk: string;
  regionsElevated: number;
  indicatorsWarning: number;
}

interface MacroRiskData {
  compositeRisk: CompositeRisk;
  categories: RiskCategory[];
  indicators: Indicator[];
  regions: RegionRisk[];
  summary: RiskSummary;
}

// ── Color Helpers ──

function getLevelColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 85) return { text: 'text-red-600', bg: 'bg-red-600/15', border: 'border-red-600/30' };
  if (score >= 65) return { text: 'text-red-400', bg: 'bg-red-400/15', border: 'border-red-400/30' };
  if (score >= 45) return { text: 'text-orange-400', bg: 'bg-orange-400/15', border: 'border-orange-400/30' };
  if (score >= 25) return { text: 'text-yellow-400', bg: 'bg-yellow-400/15', border: 'border-yellow-400/30' };
  return { text: 'text-green-400', bg: 'bg-green-400/15', border: 'border-green-400/30' };
}

function getLevelLabel(score: number): string {
  if (score >= 85) return 'EXTREME';
  if (score >= 65) return 'HIGH';
  if (score >= 45) return 'ELEVATED';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function getLevelBarColor(score: number): string {
  if (score >= 85) return 'bg-red-600';
  if (score >= 65) return 'bg-red-400';
  if (score >= 45) return 'bg-orange-400';
  if (score >= 25) return 'bg-yellow-400';
  return 'bg-green-400';
}

function getSignalColor(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'warning') return 'text-red-400';
  if (s === 'favorable') return 'text-green-400';
  return 'text-neutral-500';
}

function getSignalBg(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'warning') return 'bg-red-400/10';
  if (s === 'favorable') return 'bg-green-400/10';
  return 'bg-neutral-500/10';
}

function getChangeColor(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function fmtChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-orange-400/30">
      <div className="w-1 h-1 shrink-0 bg-orange-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-orange-400">
        {title}
      </span>
    </div>
  );
}

// ── Composite Risk Display ──

function CompositeRiskDisplay({ risk }: { risk: CompositeRisk }) {
  const t = useT();
  const color = getLevelColor(risk.score);
  const label = getLevelLabel(risk.score);

  return (
    <div className="px-3 py-3 border-b border-orange-400/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-widest">
          {tr(t, 'mrComposite', 'Composite Risk Score')}
        </span>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 ${color.bg} border ${color.border}`}>
          <div className={`w-1 h-1 shrink-0 animate-pulse ${color.text.replace('text-', 'bg-')}`} />
          <span className={`text-[7px] font-mono font-black uppercase tracking-wider ${color.text}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Large score display */}
      <div className="flex items-end gap-3 mb-2">
        <span className={`text-[32px] font-mono font-black leading-none tabular-nums ${color.text}`}>
          {risk.score.toFixed(1)}
        </span>
        <div className="flex flex-col gap-0.5 pb-1">
          <span className={`text-[8px] font-mono font-bold tabular-nums ${getChangeColor(risk.change1w)}`}>
            {fmtChange(risk.change1w)} {tr(t, 'mrWeek', '1W')}
          </span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${getChangeColor(risk.change1m)}`}>
            {fmtChange(risk.change1m)} {tr(t, 'mrMonth', '1M')}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="relative h-1.5 bg-white/5 w-full">
        <div
          className={`absolute inset-y-0 left-0 ${getLevelBarColor(risk.score)}`}
          style={{ width: `${Math.min(risk.score, 100)}%` }}
        />
        {/* Zone markers */}
        {[25, 45, 65, 85].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[6px] font-mono text-green-600">0</span>
        <span className="text-[6px] font-mono text-yellow-600">25</span>
        <span className="text-[6px] font-mono text-orange-600">45</span>
        <span className="text-[6px] font-mono text-red-500">65</span>
        <span className="text-[6px] font-mono text-red-700">85</span>
        <span className="text-[6px] font-mono text-red-800">100</span>
      </div>
    </div>
  );
}

// ── Risk Categories (Horizontal Bars) ──

function RiskCategories({ categories }: { categories: RiskCategory[] }) {
  const t = useT();

  return (
    <div className="px-2 py-1.5">
      {categories.map((cat) => {
        const color = getLevelColor(cat.score);
        return (
          <div key={cat.name} className="py-1 hover:bg-orange-400/[0.02]">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-mono font-bold text-white uppercase tracking-tight truncate">
                {cat.name}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-mono font-bold tabular-nums ${getChangeColor(cat.change1w)}`}>
                  {fmtChange(cat.change1w)}
                </span>
                <span className={`text-[7px] font-mono font-black px-1 py-0.5 ${color.bg} ${color.text} uppercase`}>
                  {cat.level}
                </span>
                <span className={`text-[9px] font-mono font-black tabular-nums ${color.text}`}>
                  {cat.score.toFixed(0)}
                </span>
              </div>
            </div>
            {/* Bar */}
            <div className="relative h-1 bg-white/5 w-full">
              <div
                className={`absolute inset-y-0 left-0 ${getLevelBarColor(cat.score)} opacity-80`}
                style={{ width: `${Math.min(cat.score, 100)}%` }}
              />
            </div>
            {/* Sub-indicators */}
            {cat.subIndicators && cat.subIndicators.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                {cat.subIndicators.map((sub) => (
                  <div key={sub.name} className="flex items-center gap-1">
                    <span className="text-[6px] font-mono text-neutral-600 uppercase">{sub.name}</span>
                    <span className={`text-[6px] font-mono font-bold ${getSignalColor(sub.signal)}`}>
                      {sub.trend === 'up' ? '\u25B2' : sub.trend === 'down' ? '\u25BC' : '\u25C6'}
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

// ── Regional Risks (Compact Grid) ──

function RegionalRisks({ regions }: { regions: RegionRisk[] }) {
  return (
    <div className="px-2 py-1.5">
      <div className="grid grid-cols-1 gap-1">
        {regions.map((region) => {
          const color = getLevelColor(region.score);
          return (
            <div
              key={region.region}
              className={`flex items-center justify-between px-2 py-1 border border-white/5 hover:bg-orange-400/[0.02] ${color.bg}`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-mono font-bold text-white uppercase tracking-tight truncate">
                  {region.region}
                </span>
                <span className="text-[6px] font-mono text-neutral-500 truncate">
                  {region.topRisk}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[7px] font-mono font-bold tabular-nums ${getChangeColor(region.change1w)}`}>
                  {fmtChange(region.change1w)}
                </span>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-mono font-black tabular-nums ${color.text}`}>
                    {region.score.toFixed(0)}
                  </span>
                  <span className={`text-[6px] font-mono font-black uppercase ${color.text}`}>
                    {region.level}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Key Indicators Table ──

function KeyIndicators({ indicators }: { indicators: Indicator[] }) {
  const t = useT();

  return (
    <div className="px-0">
      {/* Table header */}
      <div className="flex items-center px-2 py-1 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider flex-1 min-w-0">
          {tr(t, 'mrIndicator', 'Indicator')}
        </span>
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider w-[50px] text-right">
          {tr(t, 'mrValue', 'Value')}
        </span>
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider w-[40px] text-right">
          {tr(t, 'mrAvg', 'Avg')}
        </span>
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider w-[35px] text-right">
          {tr(t, 'mrZScore', 'Z')}
        </span>
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider w-[32px] text-right">
          {tr(t, 'mrPctl', 'Pctl')}
        </span>
        <span className="text-[6px] font-mono font-black text-neutral-600 uppercase tracking-wider w-[45px] text-right">
          {tr(t, 'mrSignal', 'Signal')}
        </span>
      </div>

      {/* Rows */}
      {indicators.map((ind) => {
        const zColor = ind.zScore > 1.5 ? 'text-red-400' : ind.zScore < -1.5 ? 'text-green-400' : 'text-neutral-400';
        const pctlColor = ind.percentile > 80 ? 'text-red-400' : ind.percentile < 20 ? 'text-green-400' : 'text-neutral-400';

        return (
          <div
            key={ind.name}
            className="flex items-center px-2 py-0.5 border-b border-white/[0.03] hover:bg-orange-400/[0.02]"
          >
            <span className="text-[7px] font-mono font-bold text-white flex-1 min-w-0 truncate">
              {ind.name}
            </span>
            <span className="text-[7px] font-mono font-bold text-white tabular-nums w-[50px] text-right">
              {ind.currentValue.toFixed(1)}{ind.unit ? ` ${ind.unit}` : ''}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 tabular-nums w-[40px] text-right">
              {ind.historicalAvg.toFixed(1)}
            </span>
            <span className={`text-[7px] font-mono font-bold tabular-nums w-[35px] text-right ${zColor}`}>
              {ind.zScore > 0 ? '+' : ''}{ind.zScore.toFixed(2)}
            </span>
            <span className={`text-[7px] font-mono font-bold tabular-nums w-[32px] text-right ${pctlColor}`}>
              {ind.percentile.toFixed(0)}
            </span>
            <span className={`text-[7px] font-mono font-black uppercase w-[45px] text-right px-1 ${getSignalColor(ind.signal)} ${getSignalBg(ind.signal)}`}>
              {ind.signal}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Summary Footer ──

function RiskSummaryFooter({ summary }: { summary: RiskSummary }) {
  const t = useT();
  const color = getLevelColor(summary.compositeScore);

  return (
    <div className="px-2 py-1.5 border-t border-orange-400/20 bg-white/[0.01]">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mrHighest', 'Highest Risk')}
          </span>
          <span className="text-[7px] font-mono font-bold text-red-400 truncate ml-1">
            {summary.highestRisk}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mrLowest', 'Lowest Risk')}
          </span>
          <span className="text-[7px] font-mono font-bold text-green-400 truncate ml-1">
            {summary.lowestRisk}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mrRegionsElev', 'Regions Elevated')}
          </span>
          <span className={`text-[8px] font-mono font-black tabular-nums ${summary.regionsElevated > 2 ? 'text-red-400' : 'text-yellow-400'}`}>
            {summary.regionsElevated}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mrWarnings', 'Indicators Warning')}
          </span>
          <span className={`text-[8px] font-mono font-black tabular-nums ${summary.indicatorsWarning > 4 ? 'text-red-400' : 'text-yellow-400'}`}>
            {summary.indicatorsWarning}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MacroRiskPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMacroRisk();

  const riskData = data as MacroRiskData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-orange-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <path d="M7 1 L13 13 L1 13 Z" fill="none" stroke="#fb923c" strokeWidth="1.5" />
            <line x1="7" y1="5" x2="7" y2="9" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="11" r="0.8" fill="#fb923c" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-orange-400">
            {tr(t, 'mrTitle', 'Macro Risk Indicators')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {riskData?.compositeRisk && (
            <span className={`text-[8px] font-mono font-black tabular-nums ${getLevelColor(riskData.compositeRisk.score).text}`}>
              {riskData.compositeRisk.score.toFixed(1)}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-orange-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !riskData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-orange-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!riskData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {riskData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Composite Risk Score */}
          {riskData.compositeRisk && (
            <CompositeRiskDisplay risk={riskData.compositeRisk} />
          )}

          {/* Risk Categories */}
          {riskData.categories && riskData.categories.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'mrCategories', 'Risk Categories')} />
              <RiskCategories categories={riskData.categories} />
            </>
          )}

          {/* Regional Risks */}
          {riskData.regions && riskData.regions.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'mrRegions', 'Regional Risks')} />
              <RegionalRisks regions={riskData.regions} />
            </>
          )}

          {/* Key Indicators */}
          {riskData.indicators && riskData.indicators.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'mrIndicators', 'Key Indicators')} />
              <KeyIndicators indicators={riskData.indicators} />
            </>
          )}

          {/* Summary */}
          {riskData.summary && (
            <RiskSummaryFooter summary={riskData.summary} />
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
