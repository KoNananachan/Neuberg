import { useState, useMemo } from 'react';
import { useRecessionProbability } from '../../api/hooks/use-recession-probability';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EconomyData = any;

// ── Constants ──

const ECONOMIES: { code: string; label: string }[] = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'CN', label: 'CN' },
  { code: 'GLOBAL', label: 'GLOBAL' },
];

// ── Format helpers ──

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}pp`;
}

function fmtVal(v: number | string | null | undefined, suffix?: string): string {
  if (v == null) return '--';
  if (typeof v === 'string') return v;
  return `${v.toFixed(2)}${suffix ?? ''}`;
}

// ── Color helpers ──

function probColor(p: number | null | undefined): string {
  if (p == null) return 'text-neutral-600';
  if (p > 60) return 'text-red-400';
  if (p > 40) return 'text-orange-400';
  if (p > 20) return 'text-yellow-400';
  return 'text-green-400';
}

function probBgColor(p: number | null | undefined): string {
  if (p == null) return 'bg-neutral-800';
  if (p > 60) return 'bg-red-400';
  if (p > 40) return 'bg-orange-400';
  if (p > 20) return 'bg-yellow-400';
  return 'bg-green-400';
}

function riskLevelBadge(level: string | null | undefined): { label: string; color: string } {
  const l = (level ?? '').toUpperCase();
  if (l === 'HIGH') return { label: 'HIGH', color: 'text-red-400 bg-red-400/10 border-red-400/30' };
  if (l === 'ELEVATED') return { label: 'ELEVATED', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  if (l === 'MODERATE') return { label: 'MODERATE', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  return { label: 'LOW', color: 'text-green-400 bg-green-400/10 border-green-400/30' };
}

function signalDot(signal: string | null | undefined): string {
  const s = (signal ?? '').toUpperCase();
  if (s === 'RECESSION' || s === 'RED' || s === 'NEGATIVE' || s === 'WARNING') return 'bg-red-400';
  if (s === 'CAUTION' || s === 'YELLOW' || s === 'NEUTRAL' || s === 'MIXED') return 'bg-yellow-400';
  return 'bg-green-400';
}

function signalTextColor(signal: string | null | undefined): string {
  const s = (signal ?? '').toUpperCase();
  if (s === 'RECESSION' || s === 'RED' || s === 'NEGATIVE' || s === 'WARNING') return 'text-red-400';
  if (s === 'CAUTION' || s === 'YELLOW' || s === 'NEUTRAL' || s === 'MIXED') return 'text-yellow-400';
  return 'text-green-400';
}

function trendArrow(change: number | null | undefined): string {
  if (change == null) return '';
  if (change > 2) return '\u25B2';
  if (change > 0) return '\u25B3';
  if (change < -2) return '\u25BC';
  if (change < 0) return '\u25BD';
  return '\u25C6';
}

function trendColor(change: number | null | undefined): string {
  if (change == null) return 'text-neutral-600';
  if (change > 0) return 'text-red-400';
  if (change < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15 bg-[#030303]">
      <div className="w-1 h-1 shrink-0 bg-red-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-red-400">
        {title}
      </span>
    </div>
  );
}

// ── Probability Gauge ──

function ProbabilityGauge({
  label,
  probability,
  change,
  riskLevel,
}: {
  label: string;
  probability: number | null | undefined;
  change: number | null | undefined;
  riskLevel: string | null | undefined;
}) {
  const badge = riskLevelBadge(riskLevel);
  const pct = probability ?? 0;

  return (
    <div className="bg-black px-3 py-2 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[18px] font-mono font-black tabular-nums leading-none ${probColor(probability)}`}>
          {fmtPct(probability)}
        </span>
        {change != null && (
          <span className={`text-[8px] font-mono font-bold tabular-nums ${trendColor(change)}`}>
            {trendArrow(change)} {fmtChange(change)}
          </span>
        )}
      </div>
      {/* Gauge bar */}
      <div className="mt-1.5 h-1.5 bg-neutral-900 relative">
        <div
          className={`absolute inset-y-0 left-0 ${probBgColor(probability)} opacity-40`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
        <div
          className={`absolute top-0 h-1.5 w-0.5 ${probBgColor(probability)}`}
          style={{ left: `${Math.min(100, Math.max(0, pct))}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[6px] font-mono text-green-400/50">0%</span>
        <span className={`text-[6px] font-mono font-bold uppercase tracking-wider px-1 py-px border ${badge.color}`}>
          {badge.label}
        </span>
        <span className="text-[6px] font-mono text-red-400/50">100%</span>
      </div>
    </div>
  );
}

// ── Probability Gauges Section ──

function ProbabilityGaugesSection({ economy }: { economy: EconomyData }) {
  const horizons = economy?.horizons ?? economy?.probabilities ?? {};
  const h3m = horizons?.['3m'] ?? horizons?.threeMonth ?? null;
  const h6m = horizons?.['6m'] ?? horizons?.sixMonth ?? null;
  const h12m = horizons?.['12m'] ?? horizons?.twelveMonth ?? null;

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-3 gap-px bg-border/10">
        <ProbabilityGauge
          label="3-Month Horizon"
          probability={h3m?.probability ?? h3m?.value ?? h3m}
          change={h3m?.change ?? h3m?.monthOverMonth ?? null}
          riskLevel={h3m?.riskLevel ?? h3m?.level ?? null}
        />
        <ProbabilityGauge
          label="6-Month Horizon"
          probability={h6m?.probability ?? h6m?.value ?? h6m}
          change={h6m?.change ?? h6m?.monthOverMonth ?? null}
          riskLevel={h6m?.riskLevel ?? h6m?.level ?? null}
        />
        <ProbabilityGauge
          label="12-Month Horizon"
          probability={h12m?.probability ?? h12m?.value ?? h12m}
          change={h12m?.change ?? h12m?.monthOverMonth ?? null}
          riskLevel={h12m?.riskLevel ?? h12m?.level ?? null}
        />
      </div>
    </div>
  );
}

// ── Model Breakdown Table ──

function ModelBreakdownSection({ models }: { models: EconomyData[] }) {
  if (!models || models.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Model Breakdown" />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_100px_60px] gap-0 px-2 py-1 border-b border-border/15 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
          Model
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Probability
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-center text-neutral-600">
          Signal
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Weight
        </span>
      </div>

      {models.map((model: EconomyData, i: number) => {
        const sig = model?.signal ?? model?.status ?? '';
        return (
          <div
            key={model?.name ?? model?.model ?? i}
            className={`grid grid-cols-[1fr_80px_100px_60px] gap-0 px-2 py-1 border-b border-border/5 hover:bg-red-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {model?.name ?? model?.model ?? '--'}
            </span>
            <span className={`text-[9px] font-mono font-black text-right tabular-nums ${probColor(model?.probability ?? model?.value)}`}>
              {fmtPct(model?.probability ?? model?.value)}
            </span>
            <div className="flex items-center justify-center gap-1">
              <div className={`w-1.5 h-1.5 shrink-0 ${signalDot(sig)}`} />
              <span className={`text-[7px] font-mono font-bold uppercase tracking-wider ${signalTextColor(sig)}`}>
                {sig || '--'}
              </span>
            </div>
            <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
              {model?.weight != null ? `${(model.weight * 100).toFixed(0)}%` : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Leading Indicators Section ──

function LeadingIndicatorsSection({ indicators }: { indicators: EconomyData[] }) {
  if (!indicators || indicators.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Leading Indicators" />

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0 px-2 py-1 border-b border-border/15 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
          Indicator
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Value
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Threshold
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-center text-neutral-600">
          Signal
        </span>
      </div>

      {indicators.map((ind: EconomyData, i: number) => {
        const val = ind?.value ?? ind?.current;
        const threshold = ind?.threshold ?? ind?.limit;
        const sig = ind?.signal ?? ind?.status ?? '';
        const numVal = typeof val === 'number' ? val : parseFloat(val);
        const numThreshold = typeof threshold === 'number' ? threshold : parseFloat(threshold);
        const hasBar = !isNaN(numVal) && !isNaN(numThreshold) && numThreshold !== 0;
        const barPct = hasBar ? Math.min(100, Math.max(0, (Math.abs(numVal) / Math.abs(numThreshold)) * 100)) : 0;

        return (
          <div
            key={ind?.name ?? ind?.indicator ?? i}
            className={`px-2 py-1 border-b border-border/5 hover:bg-red-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="grid grid-cols-[1fr_80px_80px_80px] gap-0">
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {ind?.name ?? ind?.indicator ?? '--'}
              </span>
              <span className={`text-[9px] font-mono font-black text-right tabular-nums ${signalTextColor(sig)}`}>
                {fmtVal(val)}
              </span>
              <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
                {fmtVal(threshold)}
              </span>
              <div className="flex items-center justify-center gap-1">
                <div className={`w-1.5 h-1.5 shrink-0 ${signalDot(sig)}`} />
                <span className={`text-[7px] font-mono font-bold uppercase tracking-wider ${signalTextColor(sig)}`}>
                  {sig || '--'}
                </span>
              </div>
            </div>
            {/* Threshold comparison bar */}
            {hasBar && (
              <div className="mt-1 h-1 bg-neutral-900 relative">
                <div
                  className={`absolute inset-y-0 left-0 opacity-40 ${signalDot(sig)}`}
                  style={{ width: `${barPct}%` }}
                />
                {/* Threshold marker */}
                <div
                  className="absolute top-0 h-1 w-px bg-neutral-400"
                  style={{ left: '100%', transform: 'translateX(-1px)' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Yield Curve Monitor ──

function YieldCurveMonitor({ yieldCurve }: { yieldCurve: EconomyData }) {
  if (!yieldCurve) return null;

  const spread10y2y = yieldCurve?.['10y2y'] ?? yieldCurve?.spread10y2y ?? null;
  const spread10y3m = yieldCurve?.['10y3m'] ?? yieldCurve?.spread10y3m ?? null;

  if (!spread10y2y && !spread10y3m) return null;

  const renderSpread = (label: string, spread: EconomyData) => {
    if (!spread) return null;
    const value = spread?.value ?? spread?.spread ?? spread;
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    const isInverted = !isNaN(numValue) && numValue < 0;
    const monthsInverted = spread?.monthsInverted ?? spread?.inversionMonths ?? null;

    return (
      <div className="bg-black px-3 py-2 border-r border-border/10 last:border-r-0">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-[14px] font-mono font-black tabular-nums leading-none ${
            isInverted ? 'text-red-400' : 'text-green-400'
          }`}>
            {!isNaN(numValue) ? `${numValue > 0 ? '+' : ''}${numValue.toFixed(0)}bp` : '--'}
          </span>
          {isInverted && (
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-1 py-px border border-red-400/30">
              INVERTED
            </span>
          )}
          {!isInverted && !isNaN(numValue) && (
            <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-1 py-px border border-green-400/30">
              NORMAL
            </span>
          )}
        </div>
        {isInverted && monthsInverted != null && (
          <div className="text-[7px] font-mono text-red-400/70 mt-1">
            Inverted for {monthsInverted} month{monthsInverted !== 1 ? 's' : ''}
          </div>
        )}
        {/* Spread bar visualization */}
        {!isNaN(numValue) && (
          <div className="mt-1.5 h-1 bg-neutral-900 relative">
            <div className="absolute top-0 h-1 w-px bg-neutral-500" style={{ left: '50%' }} />
            <div
              className={`absolute top-0 h-1 ${isInverted ? 'bg-red-400/50' : 'bg-green-400/50'}`}
              style={{
                left: isInverted ? `${50 + (numValue / 4)}%` : '50%',
                width: `${Math.min(50, Math.abs(numValue / 4))}%`,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Yield Curve Monitor" />

      <div className="grid grid-cols-2 gap-px bg-border/10">
        {renderSpread('10Y-2Y Spread', spread10y2y)}
        {renderSpread('10Y-3M Spread', spread10y3m)}
      </div>

      {/* Historical accuracy note */}
      <div className="px-2 py-1.5 bg-[#030303] border-t border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Note: Yield curve inversion has preceded every US recession since 1970 with a 12-18 month lead time. False positive rate ~33%.
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function RecessionProbabilityPanel() {
  const { data, isLoading } = useRecessionProbability();
  const d = data as EconomyData;

  const [selectedEconomy, setSelectedEconomy] = useState<string>('US');

  const economyData = useMemo(() => {
    if (!d) return null;
    const economies = d?.economies ?? d?.regions ?? d?.data ?? [];
    if (Array.isArray(economies)) {
      return economies.find?.((e: EconomyData) =>
        (e?.code ?? e?.region ?? e?.name ?? '').toUpperCase() === selectedEconomy
      ) ?? economies?.[0] ?? null;
    }
    // If it's an object keyed by economy code
    return economies?.[selectedEconomy] ?? economies?.[selectedEconomy.toLowerCase()] ?? null;
  }, [d, selectedEconomy]);

  const globalRiskLevel = useMemo(() => {
    if (!d) return null;
    return d?.globalRiskLevel ?? d?.riskLevel ?? d?.overallRisk ?? null;
  }, [d]);

  const globalBadge = riskLevelBadge(globalRiskLevel);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            Recession Probability
          </span>
        </div>
        <div className="flex items-center gap-2">
          {globalRiskLevel && (
            <span className={`text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-px border ${globalBadge.color}`}>
              {globalBadge.label}
            </span>
          )}
          <div className={`w-1.5 h-1.5 ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
        </div>
      </div>

      {/* Economy Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 bg-[#030303] overflow-x-auto no-scrollbar">
        {ECONOMIES.map((econ) => (
          <button
            key={econ.code}
            onClick={() => setSelectedEconomy(econ.code)}
            className={`px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-colors shrink-0 ${
              selectedEconomy === econ.code
                ? 'text-red-400 bg-red-400/10 border-b border-red-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {econ.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase animate-pulse">
            Loading...
          </span>
        </div>
      )}

      {/* No data */}
      {!d && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            No data available
          </span>
        </div>
      )}

      {/* Content */}
      {d && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Probability Gauges */}
          <ProbabilityGaugesSection economy={economyData} />

          {/* Model Breakdown */}
          <ModelBreakdownSection
            models={economyData?.models ?? economyData?.modelBreakdown ?? []}
          />

          {/* Leading Indicators */}
          <LeadingIndicatorsSection
            indicators={economyData?.indicators ?? economyData?.leadingIndicators ?? []}
          />

          {/* Yield Curve Monitor */}
          <YieldCurveMonitor
            yieldCurve={economyData?.yieldCurve ?? economyData?.yieldCurveMonitor ?? d?.yieldCurve ?? null}
          />

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
