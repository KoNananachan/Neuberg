import { useState } from 'react';
import { useMacroRegimeMonitor } from '../../api/hooks/use-macro-regime-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ACCENT = '#e879f9'; // fuchsia-400
const ACCENT_DIM = 'rgba(232,121,249,0.08)';

type Tab = 'regime' | 'indicators' | 'policy' | 'history' | 'allocation';

// ── Color/Badge Helpers ──

function signalBadge(signal: string): { text: string; cls: string } {
  switch (signal?.toUpperCase()) {
    case 'EXPANSION': return { text: 'EXPANSION', cls: 'text-emerald-400 bg-emerald-500/10' };
    case 'CONTRACTION': return { text: 'CONTRACTION', cls: 'text-red-400 bg-red-500/10' };
    default: return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function cycleBadge(phase: string): { text: string; cls: string } {
  switch (phase?.toUpperCase()) {
    case 'HIKING': return { text: 'HIKING', cls: 'text-red-400 bg-red-500/10' };
    case 'HOLDING': return { text: 'HOLDING', cls: 'text-yellow-400 bg-yellow-500/10' };
    case 'CUTTING': return { text: 'CUTTING', cls: 'text-emerald-400 bg-emerald-500/10' };
    default: return { text: phase?.toUpperCase() || 'N/A', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function regimeBadge(regime: string): { text: string; cls: string } {
  switch (regime?.toUpperCase()) {
    case 'GOLDILOCKS': return { text: 'GOLDILOCKS', cls: 'text-emerald-400 bg-emerald-500/15' };
    case 'REFLATION': return { text: 'REFLATION', cls: 'text-yellow-400 bg-yellow-500/15' };
    case 'STAGFLATION': return { text: 'STAGFLATION', cls: 'text-red-400 bg-red-500/15' };
    case 'DEFLATION': return { text: 'DEFLATION', cls: 'text-sky-400 bg-sky-500/15' };
    default: return { text: regime?.toUpperCase() || 'UNKNOWN', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function allocationBadge(signal: string): { text: string; cls: string } {
  switch (signal?.toUpperCase()) {
    case 'OW': case 'OVERWEIGHT': return { text: 'OW', cls: 'text-emerald-400 bg-emerald-500/10' };
    case 'UW': case 'UNDERWEIGHT': return { text: 'UW', cls: 'text-red-400 bg-red-500/10' };
    default: return { text: 'N', cls: 'text-neutral-400 bg-neutral-500/10' };
  }
}

function directionArrow(dir: string): string {
  switch (dir?.toLowerCase()) {
    case 'up': case 'rising': case 'improving': return '\u25B2';
    case 'down': case 'falling': case 'deteriorating': return '\u25BC';
    default: return '\u25B6';
  }
}

function directionColor(dir: string): string {
  switch (dir?.toLowerCase()) {
    case 'up': case 'rising': case 'improving': return 'text-emerald-400';
    case 'down': case 'falling': case 'deteriorating': return 'text-red-400';
    default: return 'text-neutral-500';
  }
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtSigned(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

// ── Bar Components ──

function ConvictionBar({ value }: { value: number }) {
  const W = 48;
  const H = 6;
  const clamped = Math.max(0, Math.min(value, 100));
  const fillW = Math.max((clamped / 100) * W, 1);
  const color = clamped >= 60 ? '#4ade80' : clamped <= 30 ? '#f87171' : ACCENT;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block align-middle">
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" />
      <rect x={0} y={0} width={fillW} height={H} fill={color} opacity={0.6} />
    </svg>
  );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const W = 40;
  const H = 5;
  const clamped = Math.max(0, Math.min(value, max));
  const fillW = Math.max((clamped / max) * W, 1);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block align-middle">
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" />
      <rect x={0} y={0} width={fillW} height={H} fill={color || ACCENT} opacity={0.55} />
    </svg>
  );
}

function DovishHawkishBar({ score }: { score: number }) {
  // score: -100 (very dovish) to +100 (very hawkish), 0 = neutral
  const W = 52;
  const H = 5;
  const mid = W / 2;
  const normalized = Math.max(-100, Math.min(score, 100));
  const barW = Math.abs(normalized / 100) * mid;
  const x = normalized >= 0 ? mid : mid - barW;
  const color = normalized >= 0 ? '#f87171' : '#4ade80'; // hawkish=red, dovish=green

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block align-middle">
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" />
      <line x1={mid} y1={0} x2={mid} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x={x} y={0} width={barW} height={H} fill={color} opacity={0.55} />
    </svg>
  );
}

// ── Regime Tab ──

function RegimeTab({ data }: { data: any }) {
  const regime = data?.regime || data?.currentRegime || {};
  const currentRegime = (regime.current || regime.name || 'UNKNOWN').toUpperCase();
  const momentum = regime.momentum ?? regime.momentumScores ?? {};
  const confidence = regime.confidence ?? 0;
  const age = regime.age ?? regime.duration ?? '-';

  const quadrants = [
    { key: 'GOLDILOCKS', label: 'GOLDILOCKS', sub: 'Growth Up / Inflation Down', cls: 'border-emerald-500/30', activeCls: 'bg-emerald-500/10 border-emerald-400/60', textCls: 'text-emerald-400' },
    { key: 'REFLATION', label: 'REFLATION', sub: 'Growth Up / Inflation Up', cls: 'border-yellow-500/30', activeCls: 'bg-yellow-500/10 border-yellow-400/60', textCls: 'text-yellow-400' },
    { key: 'DEFLATION', label: 'DEFLATION', sub: 'Growth Down / Inflation Down', cls: 'border-sky-500/30', activeCls: 'bg-sky-500/10 border-sky-400/60', textCls: 'text-sky-400' },
    { key: 'STAGFLATION', label: 'STAGFLATION', sub: 'Growth Down / Inflation Up', cls: 'border-red-500/30', activeCls: 'bg-red-500/10 border-red-400/60', textCls: 'text-red-400' },
  ];

  return (
    <div className="px-2 py-1.5">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1.5 px-1">
        Regime Quadrant
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-1 mb-3">
        {quadrants.map((q: any) => {
          const active = currentRegime === q.key;
          return (
            <div
              key={q.key}
              className={`border px-3 py-2.5 transition-colors ${active ? q.activeCls : q.cls + ' bg-black/40'}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {active && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ACCENT }} />}
                <span className={`text-[8px] font-mono font-black uppercase tracking-tight ${active ? q.textCls : 'text-neutral-600'}`}>
                  {q.label}
                </span>
              </div>
              <span className={`text-[6px] font-mono uppercase ${active ? 'text-neutral-400' : 'text-neutral-700'}`}>
                {q.sub}
              </span>
            </div>
          );
        })}
      </div>

      {/* Axis Labels */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-[2px]" style={{ backgroundColor: '#4ade80' }} />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Growth Axis</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-[2px]" style={{ backgroundColor: '#f87171' }} />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Inflation Axis</span>
        </div>
      </div>

      {/* Momentum Scores */}
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Momentum Scores
      </div>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {[
          { label: 'Growth Momentum', value: momentum.growth ?? momentum.growthMomentum ?? 0 },
          { label: 'Inflation Momentum', value: momentum.inflation ?? momentum.inflationMomentum ?? 0 },
          { label: 'Employment', value: momentum.employment ?? 0 },
          { label: 'Financial Conditions', value: momentum.financialConditions ?? momentum.financial ?? 0 },
        ].map((m: any) => (
          <div key={m.label} className="border border-border/20 px-2 py-1.5 bg-black/40">
            <span className="text-[6px] font-mono text-neutral-600 uppercase block mb-0.5">{m.label}</span>
            <div className="flex items-center gap-1.5">
              <ScoreBar value={Math.abs(m.value)} color={m.value >= 0 ? '#4ade80' : '#f87171'} />
              <span className={`text-[8px] font-mono font-black tabular-nums ${m.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtSigned(m.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence & Age */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Confidence</span>
          <ConvictionBar value={confidence} />
          <span className="text-[7px] font-mono font-bold tabular-nums text-neutral-300">{fmtNum(confidence, 0)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Regime Age</span>
          <span className="text-[7px] font-mono font-bold tabular-nums text-neutral-300">{age}</span>
        </div>
      </div>
    </div>
  );
}

// ── Indicators Tab ──

function IndicatorsTab({ data }: { data: any }) {
  const indicators = data?.indicators || data?.leadingIndicators || [];
  if (indicators.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No indicator data
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Leading Indicators
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_44px_24px_56px_32px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Name</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Current</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Previous</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Dir</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Wt</span>
      </div>

      {/* Rows */}
      {indicators.map((ind: any, i: any) => {
        const sig = signalBadge(ind.signal || ind.status || 'NEUTRAL');
        const dir = ind.direction || ind.trend || 'flat';

        return (
          <div
            key={ind.name || `ind-${i}`}
            className="grid grid-cols-[1fr_44px_44px_24px_56px_32px] gap-0 px-1 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-200 truncate">
              {ind.name || ind.indicator || '--'}
            </span>

            <span className="text-[8px] font-mono font-black text-white text-right tabular-nums">
              {ind.current != null ? fmtNum(ind.current) : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-500 text-right tabular-nums">
              {ind.previous != null ? fmtNum(ind.previous) : '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[8px] font-mono ${directionColor(dir)}`}>
                {directionArrow(dir)}
              </span>
            </div>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${sig.cls}`}>
                {sig.text}
              </span>
            </div>

            <span className="text-[7px] font-mono text-neutral-500 text-right tabular-nums">
              {ind.weight != null ? fmtNum(ind.weight, 1) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Policy Tab ──

function PolicyTab({ data }: { data: any }) {
  const banks = data?.policy || data?.centralBanks || [];
  if (banks.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No policy data
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Central Bank Policy
      </div>

      {/* Header */}
      <div className="grid grid-cols-[56px_40px_40px_52px_44px_52px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Bank</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Rate</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Next</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Cycle</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Mkt</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Dove/Hawk</span>
      </div>

      {/* Rows */}
      {banks.map((b: any, i: any) => {
        const cycle = cycleBadge(b.cyclePhase || b.phase || b.cycle || 'N/A');
        const score = b.dovishHawkishScore ?? b.hawkishScore ?? b.score ?? 0;

        return (
          <div
            key={b.bank || b.name || `bank-${i}`}
            className="grid grid-cols-[56px_40px_40px_52px_44px_52px] gap-0 px-1 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-200 truncate">
              {b.bank || b.name || '--'}
            </span>

            <span className="text-[8px] font-mono font-black text-white text-right tabular-nums">
              {b.currentRate != null ? fmtNum(b.currentRate) + '%' : b.rate != null ? fmtNum(b.rate) + '%' : '--'}
            </span>

            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {b.nextExpected != null ? fmtNum(b.nextExpected) + '%' : b.expected != null ? fmtNum(b.expected) + '%' : '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${cycle.cls}`}>
                {cycle.text}
              </span>
            </div>

            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {b.marketPricing != null ? fmtNum(b.marketPricing) + '%' : b.pricing != null ? fmtNum(b.pricing) + '%' : '--'}
            </span>

            <div className="flex items-center justify-center gap-1">
              <DovishHawkishBar score={score} />
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-[3px] bg-emerald-400 opacity-55" />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Dovish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-[3px] bg-red-400 opacity-55" />
          <span className="text-[6px] font-mono text-neutral-600 uppercase">Hawkish</span>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ──

function HistoryTab({ data }: { data: any }) {
  const history = data?.history || data?.regimeHistory || [];
  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
        No history data
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Regime History
      </div>

      {/* Header */}
      <div className="grid grid-cols-[44px_64px_40px_40px_1fr_1fr] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Quarter</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Regime</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Growth</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Infl</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Best Asset</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Worst Asset</span>
      </div>

      {/* Rows */}
      {history.map((h: any, i: any) => {
        const rb = regimeBadge(h.regime || h.name || '');

        return (
          <div
            key={h.quarter || `hist-${i}`}
            className="grid grid-cols-[44px_64px_40px_40px_1fr_1fr] gap-0 px-1 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[7px] font-mono font-bold text-neutral-300 tabular-nums">
              {h.quarter || h.period || '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[5.5px] font-mono font-black uppercase px-1.5 py-[0.5px] ${rb.cls}`}>
                {rb.text}
              </span>
            </div>

            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${(h.growthScore ?? h.growth ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtSigned(h.growthScore ?? h.growth ?? null)}
            </span>

            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${(h.inflationScore ?? h.inflation ?? 0) >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {fmtSigned(h.inflationScore ?? h.inflation ?? null)}
            </span>

            <span className="text-[6px] font-mono text-emerald-400 truncate">
              {h.bestAsset || h.bestAssetClass || '--'}
            </span>

            <span className="text-[6px] font-mono text-red-400 truncate">
              {h.worstAsset || h.worstAssetClass || '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Allocation Tab ──

function AllocationTab({ data }: { data: any }) {
  const allocations = data?.allocation || data?.assetAllocation || [];
  const recessionProb = data?.recessionProbability ?? data?.recession?.probability ?? null;

  return (
    <div className="px-2 py-1.5">
      {/* Recession Probability */}
      {recessionProb != null && (
        <div className="border border-border/20 px-3 py-2 mb-2 bg-black/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-500">
              Recession Probability
            </span>
            <span className={`text-[10px] font-mono font-black tabular-nums ${recessionProb >= 50 ? 'text-red-400' : recessionProb >= 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {fmtNum(recessionProb, 0)}%
            </span>
          </div>
          <div className="w-full h-[6px] bg-white/[0.04] relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full transition-all"
              style={{
                width: `${Math.min(recessionProb, 100)}%`,
                backgroundColor: recessionProb >= 50 ? '#f87171' : recessionProb >= 30 ? '#facc15' : '#4ade80',
                opacity: 0.6,
              }}
            />
            {/* Threshold markers */}
            <div className="absolute top-0 h-full w-[1px] bg-white/10" style={{ left: '30%' }} />
            <div className="absolute top-0 h-full w-[1px] bg-white/10" style={{ left: '50%' }} />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[5px] font-mono text-neutral-700 uppercase">0%</span>
            <span className="text-[5px] font-mono text-neutral-700 uppercase">Low &lt;30</span>
            <span className="text-[5px] font-mono text-neutral-700 uppercase">Elevated 30-50</span>
            <span className="text-[5px] font-mono text-neutral-700 uppercase">High &gt;50</span>
            <span className="text-[5px] font-mono text-neutral-700 uppercase">100%</span>
          </div>
        </div>
      )}

      {/* Asset Allocation Signals */}
      <div className="text-[7px] font-black uppercase tracking-wider text-neutral-500 mb-1 px-1">
        Asset Allocation Signals
      </div>

      {allocations.length === 0 ? (
        <div className="text-center py-4 text-neutral-500 text-[9px] font-mono uppercase">
          No allocation data
        </div>
      ) : (
        <div className="space-y-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_36px_48px_36px] gap-0 px-1 mb-0.5">
            <span className="text-[6px] font-mono text-neutral-600 uppercase">Asset Class</span>
            <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
            <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Conviction</span>
            <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Score</span>
          </div>

          {allocations.map((a: any, i: any) => {
            const sig = allocationBadge(a.signal || a.recommendation || 'N');
            const conviction = a.conviction ?? a.confidence ?? 50;

            return (
              <div
                key={a.assetClass || a.name || `alloc-${i}`}
                className="grid grid-cols-[1fr_36px_48px_36px] gap-0 px-1 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
              >
                <span className="text-[7px] font-mono font-bold text-neutral-200 truncate">
                  {a.assetClass || a.name || '--'}
                </span>

                <div className="flex justify-center">
                  <span className={`text-[6px] font-mono font-black uppercase px-1.5 py-[0.5px] ${sig.cls}`}>
                    {sig.text}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1">
                  <ConvictionBar value={conviction} />
                </div>

                <span className="text-[7px] font-mono font-bold text-neutral-300 text-right tabular-nums">
                  {a.score != null ? fmtNum(a.score, 0) : conviction}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function MacroRegimeMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMacroRegimeMonitor();
  const [tab, setTab] = useState<Tab>('regime');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'regime', label: 'REGIME' },
    { key: 'indicators', label: 'INDICATORS' },
    { key: 'policy', label: 'POLICY' },
    { key: 'history', label: 'HISTORY' },
    { key: 'allocation', label: 'ALLOCATION' },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" stroke={ACCENT} strokeWidth="0.8" fill="none" opacity="0.5" />
            <rect x="9" y="1" width="6" height="6" stroke={ACCENT} strokeWidth="0.8" fill="none" opacity="0.3" />
            <rect x="1" y="9" width="6" height="6" stroke={ACCENT} strokeWidth="0.8" fill="none" opacity="0.3" />
            <rect x="9" y="9" width="6" height="6" stroke={ACCENT} strokeWidth="0.8" fill="none" opacity="0.5" />
            <circle cx="4" cy="4" r="1.5" fill={ACCENT} opacity="0.8" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'mrmTitle', 'Macro Regime Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map((tb: any) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading */}
        {isLoading && !data && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin" />
              <span className="text-[9px] font-mono text-fuchsia-400 uppercase tracking-widest animate-pulse">
                Loading regime data...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && (error || (!data && !isLoading)) && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
                Failed to load
              </span>
              <button
                onClick={() => refetch()}
                className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-fuchsia-400 border border-fuchsia-400/30 hover:bg-fuchsia-400/10 transition-colors"
              >
                {tr(t, 'retry', 'Retry')}
              </button>
            </div>
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {tab === 'regime' && <RegimeTab data={data} />}
            {tab === 'indicators' && <IndicatorsTab data={data} />}
            {tab === 'policy' && <PolicyTab data={data} />}
            {tab === 'history' && <HistoryTab data={data} />}
            {tab === 'allocation' && <AllocationTab data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
