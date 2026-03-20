import { useState } from 'react';
import { useFactorRotation } from '../../api/hooks/use-factor-rotation';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const AMBER = '#fbbf24';
const AMBER_DIM = 'rgba(251,191,36,0.12)';

type ViewTab = 'MOMENTUM' | 'SIGNALS' | 'MACRO' | 'BACKTEST';

// ── Color helpers ──

function returnColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function returnSign(val: number): string {
  return val > 0 ? '+' : '';
}

function momentumBadge(momentum: string): { text: string; bg: string; color: string } {
  switch (momentum) {
    case 'strong':
      return { text: 'STRONG', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'positive':
      return { text: 'POSITIVE', bg: 'rgba(52,211,153,0.10)', color: '#6ee7b7' };
    case 'neutral':
      return { text: 'NEUTRAL', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'negative':
      return { text: 'NEGATIVE', bg: 'rgba(248,113,113,0.10)', color: '#fca5a5' };
    case 'weak':
      return { text: 'WEAK', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: momentum?.toUpperCase() ?? '---', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function strengthBadge(strength: string): { text: string; bg: string; color: string } {
  switch (strength) {
    case 'strong':
      return { text: 'STRONG', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'moderate':
      return { text: 'MODERATE', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'weak':
      return { text: 'WEAK', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: strength?.toUpperCase() ?? '---', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function cheapBadge(cheap: string): { text: string; bg: string; color: string } {
  switch (cheap) {
    case 'cheap':
      return { text: 'CHEAP', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'fair':
      return { text: 'FAIR', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'rich':
      return { text: 'RICH', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: cheap?.toUpperCase() ?? '---', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function signalBadge(signal: string): { text: string; bg: string; color: string } {
  switch (signal) {
    case 'buy':
      return { text: 'BUY', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'sell':
      return { text: 'SELL', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'hold':
      return { text: 'HOLD', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'overweight':
      return { text: 'OVERWEIGHT', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'underweight':
      return { text: 'UNDERWEIGHT', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: signal?.toUpperCase() ?? '---', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function phaseBadge(phase: string): { text: string; bg: string; color: string } {
  switch (phase) {
    case 'expansion':
      return { text: 'EXPANSION', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'peak':
      return { text: 'PEAK', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'contraction':
      return { text: 'CONTRACTION', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'trough':
      return { text: 'TROUGH', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' };
    case 'recovery':
      return { text: 'RECOVERY', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
    default:
      return { text: phase?.toUpperCase() ?? '---', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function corrColor(val: number): string {
  if (val >= 0.7) return '#34d399';
  if (val >= 0.4) return '#fbbf24';
  if (val >= 0) return '#a1a1aa';
  if (val >= -0.4) return '#a1a1aa';
  if (val >= -0.7) return '#fb923c';
  return '#f87171';
}

function outperfColor(val: number): string {
  if (val > 3) return '#34d399';
  if (val > 0) return '#6ee7b7';
  if (val === 0) return '#71717a';
  if (val > -3) return '#fca5a5';
  return '#f87171';
}

// ── Main Panel ──

export function FactorRotationPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFactorRotation();
  const [view, setView] = useState<ViewTab>('MOMENTUM');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke={AMBER} strokeWidth="1.2" fill="none" />
            <path d="M8 2 L8 8 L13 8" stroke={AMBER} strokeWidth="1" fill="none" />
            <circle cx="8" cy="8" r="1.5" fill={AMBER} opacity="0.6" />
            <path d="M3 11 L6 6 L10 9 L14 3" stroke={AMBER} strokeWidth="0.8" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: AMBER }}>
            {tr(t, 'factorRotationTitle', 'Factor Rotation Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['MOMENTUM', 'SIGNALS', 'MACRO', 'BACKTEST'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? AMBER_DIM : 'transparent',
                color: view === v ? AMBER : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-amber-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'factorRotationNoData', 'No data available')}
          </div>
        )}

        {data && view === 'MOMENTUM' && <MomentumView data={data} />}
        {data && view === 'SIGNALS' && <SignalsView data={data} />}
        {data && view === 'MACRO' && <MacroView data={data} />}
        {data && view === 'BACKTEST' && <BacktestView data={data} />}
      </div>
    </div>
  );
}

// ── MOMENTUM View ──

function MomentumView({ data }: { data: any }) {
  const t = useT();
  const factors: any[] = data?.factorMomentum ?? [];
  const cyclical = data?.cyclicalPosition;

  return (
    <div className="text-[9px]">
      {/* Factor Momentum Table */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'factorMomentum', 'Factor Momentum')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_44px_44px_44px_44px_56px_32px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Factor</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">3M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">6M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">12M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Momentum</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Rank</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Pctl</span>
        </div>

        {/* Rows */}
        {factors.length > 0 ? (
          factors.map((f: any, i: number) => {
            const m = momentumBadge(f.momentum ?? 'neutral');
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_44px_44px_44px_44px_56px_32px_44px] gap-0 px-1 py-[3px] hover:bg-amber-400/[0.02] border-b border-border/10 items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate">{f.name ?? '---'}</span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(f.return1M ?? 0)}`}>
                  {f.return1M != null ? `${returnSign(f.return1M)}${f.return1M.toFixed(1)}%` : '---'}
                </span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(f.return3M ?? 0)}`}>
                  {f.return3M != null ? `${returnSign(f.return3M)}${f.return3M.toFixed(1)}%` : '---'}
                </span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(f.return6M ?? 0)}`}>
                  {f.return6M != null ? `${returnSign(f.return6M)}${f.return6M.toFixed(1)}%` : '---'}
                </span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(f.return12M ?? 0)}`}>
                  {f.return12M != null ? `${returnSign(f.return12M)}${f.return12M.toFixed(1)}%` : '---'}
                </span>
                <div className="flex justify-end">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: m.bg, color: m.color }}
                  >
                    {m.text}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
                  {f.rank ?? '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums pr-1" style={{ color: AMBER }}>
                  {f.percentile != null ? `${f.percentile}th` : '---'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No factor momentum data available
          </div>
        )}
      </div>

      {/* Cyclical Position Card */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'cyclicalPosition', 'Cyclical Position')}
        </div>

        <div className="border border-border/10">
          <div className="grid grid-cols-4 gap-0">
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Phase</div>
              {cyclical?.phase && (() => {
                const p = phaseBadge(cyclical.phase);
                return (
                  <span
                    className="text-[9px] font-black uppercase px-1 py-[1px] mt-0.5 inline-block"
                    style={{ background: p.bg, color: p.color }}
                  >
                    {p.text}
                  </span>
                );
              })()}
              {!cyclical?.phase && <div className="text-[11px] font-black text-neutral-500 mt-0.5">---</div>}
            </div>
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Confidence</div>
              <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color: AMBER }}>
                {cyclical?.confidence != null ? `${cyclical.confidence}%` : '---'}
              </div>
            </div>
            <div className="px-2 py-1.5 border-r border-border/10">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Favored Factors</div>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {(cyclical?.favoredFactors ?? []).length > 0 ? (
                  (cyclical.favoredFactors as string[]).map((f: string, i: number) => (
                    <span
                      key={i}
                      className="text-[7px] font-bold px-1 py-[1px]"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-[8px] text-neutral-500">---</span>
                )}
              </div>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Avoid Factors</div>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {(cyclical?.avoidFactors ?? []).length > 0 ? (
                  (cyclical.avoidFactors as string[]).map((f: string, i: number) => (
                    <span
                      key={i}
                      className="text-[7px] font-bold px-1 py-[1px]"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-[8px] text-neutral-500">---</span>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-border/10 px-2 py-1.5">
            <div className="text-[6px] text-neutral-600 uppercase tracking-wider">Months in Phase</div>
            <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color: '#a1a1aa' }}>
              {cyclical?.monthsInPhase != null ? `${cyclical.monthsInPhase}M` : '---'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SIGNALS View ──

function SignalsView({ data }: { data: any }) {
  const t = useT();
  const rotationSignals: any[] = data?.rotationSignals ?? [];
  const factorValuations: any[] = data?.factorValuations ?? [];

  return (
    <div className="text-[9px]">
      {/* Rotation Signals Table */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'rotationSignals', 'Rotation Signals')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[56px_8px_56px_52px_1fr_48px_52px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">From</span>
          <span />
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">To</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Strength</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider pl-2">Catalyst</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Exp Alpha</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Horizon</span>
        </div>

        {/* Rows */}
        {rotationSignals.length > 0 ? (
          rotationSignals.map((s: any, i: number) => {
            const str = strengthBadge(s.strength ?? 'moderate');
            return (
              <div
                key={i}
                className="grid grid-cols-[56px_8px_56px_52px_1fr_48px_52px] gap-0 px-1 py-[3px] hover:bg-amber-400/[0.02] border-b border-border/10 items-center"
              >
                <span className="text-[8px] font-bold text-red-400 truncate">{s.fromFactor ?? '---'}</span>
                <span className="text-[8px] text-neutral-600 text-center">&rarr;</span>
                <span className="text-[8px] font-bold text-emerald-400 truncate">{s.toFactor ?? '---'}</span>
                <div className="flex justify-end">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: str.bg, color: str.color }}
                  >
                    {str.text}
                  </span>
                </div>
                <span className="text-[8px] text-neutral-400 truncate pl-2">{s.catalyst ?? '---'}</span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(s.expectedAlpha ?? 0)}`}>
                  {s.expectedAlpha != null ? `${returnSign(s.expectedAlpha)}${s.expectedAlpha.toFixed(1)}%` : '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400 pr-1">
                  {s.timeHorizon ?? '---'}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No rotation signals available
          </div>
        )}
      </div>

      {/* Factor Valuations Table */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'factorValuations', 'Factor Valuations')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_44px_52px_52px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Factor</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Spread (Z)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Pctl</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Valuation</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Signal</span>
        </div>

        {/* Rows */}
        {factorValuations.length > 0 ? (
          factorValuations.map((v: any, i: number) => {
            const ch = cheapBadge(v.cheap ?? 'fair');
            const sig = signalBadge(v.signal ?? 'hold');
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_56px_44px_52px_52px] gap-0 px-1 py-[3px] hover:bg-amber-400/[0.02] border-b border-border/10 items-center"
              >
                <span className="text-[8px] font-bold text-neutral-300 truncate">{v.factor ?? '---'}</span>
                <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(v.spreadZScore ?? 0)}`}>
                  {v.spreadZScore != null ? `${returnSign(v.spreadZScore)}${v.spreadZScore.toFixed(2)}` : '---'}
                </span>
                <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: AMBER }}>
                  {v.percentile != null ? `${v.percentile}th` : '---'}
                </span>
                <div className="flex justify-end">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: ch.bg, color: ch.color }}
                  >
                    {ch.text}
                  </span>
                </div>
                <div className="flex justify-end pr-1">
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: sig.bg, color: sig.color }}
                  >
                    {sig.text}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No factor valuation data available
          </div>
        )}
      </div>
    </div>
  );
}

// ── MACRO View ──

function MacroView({ data }: { data: any }) {
  const t = useT();
  const macroLinks: any[] = data?.macroFactorLinks ?? [];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'macroFactorLinks', 'Macro-Factor Linkages')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_48px_1fr_48px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Macro Indicator</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Current</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1M Chg</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider pl-2">Favored Factor</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Corr</span>
      </div>

      {/* Rows */}
      {macroLinks.length > 0 ? (
        macroLinks.map((m: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_56px_48px_1fr_48px] gap-0 px-1 py-[3px] hover:bg-amber-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate">{m.indicator ?? '---'}</span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {m.currentValue != null ? m.currentValue.toFixed(1) : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(m.change1M ?? 0)}`}>
              {m.change1M != null ? `${returnSign(m.change1M)}${m.change1M.toFixed(1)}` : '---'}
            </span>
            <span className="text-[8px] font-bold truncate pl-2" style={{ color: AMBER }}>
              {m.favoredFactor ?? '---'}
            </span>
            <span
              className="text-[8px] font-bold text-right tabular-nums pr-1"
              style={{ color: corrColor(m.correlation ?? 0) }}
            >
              {m.correlation != null ? `${m.correlation > 0 ? '+' : ''}${m.correlation.toFixed(2)}` : '---'}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
          No macro-factor link data available
        </div>
      )}
    </div>
  );
}

// ── BACKTEST View ──

function BacktestView({ data }: { data: any }) {
  const t = useT();
  const results: any[] = data?.backtestResults ?? [];

  return (
    <div className="px-2 py-2 text-[9px]">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'backtestResults', 'Backtest Results')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_44px_52px_48px_52px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Strategy</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Ann Ret</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Sharpe</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Max DD</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Turnover</span>
        <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Outperf</span>
      </div>

      {/* Rows */}
      {results.length > 0 ? (
        results.map((r: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_48px_44px_52px_48px_52px] gap-0 px-1 py-[3px] hover:bg-amber-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold text-neutral-300 truncate">{r.strategy ?? '---'}</span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${returnColor(r.annualizedReturn ?? 0)}`}>
              {r.annualizedReturn != null ? `${returnSign(r.annualizedReturn)}${r.annualizedReturn.toFixed(1)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: AMBER }}>
              {r.sharpe != null ? r.sharpe.toFixed(2) : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-red-400">
              {r.maxDrawdown != null ? `${r.maxDrawdown.toFixed(1)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
              {r.turnover != null ? `${r.turnover.toFixed(0)}%` : '---'}
            </span>
            <span
              className="text-[8px] font-bold text-right tabular-nums pr-1"
              style={{ color: outperfColor(r.outperformance ?? 0) }}
            >
              {r.outperformance != null ? `${returnSign(r.outperformance)}${r.outperformance.toFixed(1)}%` : '---'}
            </span>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
          No backtest results available
        </div>
      )}
    </div>
  );
}
