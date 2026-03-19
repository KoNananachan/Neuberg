import { useState } from 'react';
import { useSmartBeta } from '../../api/hooks/use-smart-beta';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Constants --

const CYAN = '#22d3ee';
const CYAN_DIM = 'rgba(34,211,238,0.12)';

type ViewTab = 'STRATEGIES' | 'FACTORS' | 'FLOWS' | 'REGIME';

// -- Color helpers --

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function crowdingBadge(level: string): { text: string; bg: string; color: string } {
  switch (level) {
    case 'low':
      return { text: 'LOW', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'moderate':
      return { text: 'MODERATE', bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' };
    case 'elevated':
      return { text: 'ELEVATED', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'high':
      return { text: 'HIGH', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    case 'extreme':
      return { text: 'EXTREME', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { text: level.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function signalBadge(signal: string): { text: string; bg: string; color: string } {
  switch (signal) {
    case 'strong-buy':
      return { text: 'STRONG BUY', bg: 'rgba(52,211,153,0.2)', color: '#34d399' };
    case 'buy':
      return { text: 'BUY', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'hold':
      return { text: 'HOLD', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    case 'sell':
      return { text: 'SELL', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'strong-sell':
      return { text: 'STRONG SELL', bg: 'rgba(248,113,113,0.2)', color: '#f87171' };
    case 'overweight':
      return { text: 'OVERWEIGHT', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'underweight':
      return { text: 'UNDERWEIGHT', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'neutral':
      return { text: 'NEUTRAL', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    default:
      return { text: signal.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function regimeBadge(regime: string): { text: string; bg: string; color: string } {
  switch (regime) {
    case 'risk-on':
      return { text: 'RISK-ON', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'risk-off':
      return { text: 'RISK-OFF', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'low-vol':
      return { text: 'LOW VOL', bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' };
    case 'high-vol':
      return { text: 'HIGH VOL', bg: 'rgba(251,146,60,0.15)', color: '#fb923c' };
    case 'transition':
      return { text: 'TRANSITION', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'crisis':
      return { text: 'CRISIS', bg: 'rgba(239,68,68,0.25)', color: '#ef4444' };
    default:
      return { text: regime.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function momentumBadge(momentum: string): { text: string; bg: string; color: string } {
  switch (momentum) {
    case 'accelerating':
      return { text: 'ACCELERATING', bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'decelerating':
      return { text: 'DECELERATING', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
    case 'reversing':
      return { text: 'REVERSING', bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    case 'stable':
      return { text: 'STABLE', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
    default:
      return { text: momentum.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

// -- Main Panel --

export function SmartBetaPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSmartBeta();
  const [view, setView] = useState<ViewTab>('STRATEGIES');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M2 14 L5 4 L8 10 L11 2 L14 8" stroke={CYAN} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
            <circle cx="5" cy="4" r="1.2" fill={CYAN} opacity="0.7" />
            <circle cx="8" cy="10" r="1.2" fill={CYAN} opacity="0.7" />
            <circle cx="11" cy="2" r="1.2" fill={CYAN} opacity="0.7" />
            <circle cx="14" cy="8" r="1.2" fill={CYAN} opacity="0.7" />
            <line x1="1" y1="14" x2="15" y2="14" stroke={CYAN} strokeWidth="0.5" opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: CYAN }}>
            {tr(t, 'smartBetaTitle', 'Smart Beta Analytics')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['STRATEGIES', 'FACTORS', 'FLOWS', 'REGIME'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? CYAN_DIM : 'transparent',
                color: view === v ? CYAN : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'smartBetaNoData', 'No data available')}
          </div>
        )}

        {data && view === 'STRATEGIES' && <StrategiesView data={data} />}
        {data && view === 'FACTORS' && <FactorsView data={data} />}
        {data && view === 'FLOWS' && <FlowsView data={data} />}
        {data && view === 'REGIME' && <RegimeView data={data} />}
      </div>
    </div>
  );
}

// -- STRATEGIES View --

function StrategiesView({ data }: { data: any }) {
  const t = useT();
  const strategies: any[] = data?.strategies ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaStrategies', 'Smart Beta Strategies (10)')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_40px_40px_40px_40px_36px_36px_36px_36px_40px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Strategy / Ticker</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">AUM ($B)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">3M</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">YTD</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">vs BM</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">TE</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">IR</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">SR</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">MDD</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Fct Ld</span>
        </div>

        {/* Rows */}
        {strategies.map((s: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_52px_40px_40px_40px_40px_36px_36px_36px_36px_40px] gap-0 px-1 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
          >
            <div className="truncate">
              <span className="text-[8px] font-bold text-neutral-300">{s?.name ?? '---'}</span>
              {s?.ticker && (
                <span className="text-[7px] text-neutral-600 ml-1">{s.ticker}</span>
              )}
            </div>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {s?.aum != null ? s.aum.toFixed(1) : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.return1M ?? 0)}`}>
              {s?.return1M != null ? `${changeSign(s.return1M)}${s.return1M.toFixed(1)}%` : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.return3M ?? 0)}`}>
              {s?.return3M != null ? `${changeSign(s.return3M)}${s.return3M.toFixed(1)}%` : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.returnYTD ?? 0)}`}>
              {s?.returnYTD != null ? `${changeSign(s.returnYTD)}${s.returnYTD.toFixed(1)}%` : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.vsBenchmark ?? 0)}`}>
              {s?.vsBenchmark != null ? `${changeSign(s.vsBenchmark)}${s.vsBenchmark.toFixed(1)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
              {s?.trackingError != null ? s.trackingError.toFixed(1) : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.infoRatio ?? 0)}`}>
              {s?.infoRatio != null ? s.infoRatio.toFixed(2) : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(s?.sharpe ?? 0)}`}>
              {s?.sharpe != null ? s.sharpe.toFixed(2) : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-red-400">
              {s?.maxDrawdown != null ? `${s.maxDrawdown.toFixed(1)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums pr-1" style={{ color: CYAN }}>
              {s?.factorLoading != null ? s.factorLoading.toFixed(2) : '---'}
            </span>
          </div>
        ))}

        {strategies.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No strategy data available
          </div>
        )}
      </div>
    </div>
  );
}

// -- FACTORS View --

function FactorsView({ data }: { data: any }) {
  const t = useT();
  const factors: any[] = data?.factorExposures ?? [];
  const attribution = data?.performanceAttribution;

  return (
    <div className="text-[9px]">
      {/* Factor Exposures Table */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaFactors', 'Factor Exposures')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_60px_60px_44px_56px_56px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Factor</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Current Prem</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Hist Avg</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Z-Score</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Crowding</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Signal</span>
        </div>

        {/* Rows */}
        {factors.map((f: any, i: number) => {
          const crowd = crowdingBadge(f?.crowding ?? 'moderate');
          const sig = signalBadge(f?.signal ?? 'neutral');
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_60px_60px_44px_56px_56px] gap-0 px-1 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{f?.name ?? '---'}</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(f?.currentPremium ?? 0)}`}>
                {f?.currentPremium != null ? `${changeSign(f.currentPremium)}${f.currentPremium.toFixed(2)}%` : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
                {f?.historicalAvg != null ? `${f.historicalAvg.toFixed(2)}%` : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${Math.abs(f?.zScore ?? 0) > 2 ? 'text-red-400' : Math.abs(f?.zScore ?? 0) > 1 ? 'text-yellow-400' : 'text-neutral-300'}`}>
                {f?.zScore != null ? `${changeSign(f.zScore)}${f.zScore.toFixed(2)}` : '---'}
              </span>
              <div className="flex justify-end">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: crowd.bg, color: crowd.color }}
                >
                  {crowd.text}
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
        })}

        {factors.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] uppercase">
            No factor data available
          </div>
        )}
      </div>

      {/* Performance Attribution */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaAttribution', 'Performance Attribution')}
        </div>

        <div className="grid grid-cols-6 gap-0 border border-border/10">
          <MetricCell
            label="Alpha"
            value={attribution?.alpha != null ? `${changeSign(attribution.alpha)}${attribution.alpha.toFixed(2)}%` : '---'}
            color={attribution?.alpha > 0 ? '#34d399' : attribution?.alpha < 0 ? '#f87171' : '#71717a'}
          />
          <MetricCell
            label="Beta Contrib"
            value={attribution?.betaContribution != null ? `${changeSign(attribution.betaContribution)}${attribution.betaContribution.toFixed(2)}%` : '---'}
            color={CYAN}
          />
          <MetricCell
            label="Factor Contrib"
            value={attribution?.factorContribution != null ? `${changeSign(attribution.factorContribution)}${attribution.factorContribution.toFixed(2)}%` : '---'}
            color={CYAN}
          />
          <MetricCell
            label="Residual"
            value={attribution?.residual != null ? `${changeSign(attribution.residual)}${attribution.residual.toFixed(2)}%` : '---'}
            color="#a1a1aa"
          />
          <MetricCell
            label="R-Squared"
            value={attribution?.rSquared != null ? attribution.rSquared.toFixed(3) : '---'}
            color={CYAN}
          />
          <MetricCell
            label="Active Share"
            value={attribution?.activeShare != null ? `${attribution.activeShare.toFixed(1)}%` : '---'}
            color={attribution?.activeShare > 50 ? '#fbbf24' : CYAN}
          />
        </div>
      </div>
    </div>
  );
}

// -- FLOWS View --

function FlowsView({ data }: { data: any }) {
  const t = useT();
  const flows: any[] = data?.flows ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaFlows', 'Smart Beta Fund Flows')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_60px_60px_64px_56px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Category</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1M Flows ($M)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">3M Flows ($M)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Momentum</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Total AUM ($B)</span>
        </div>

        {/* Rows */}
        {flows.map((f: any, i: number) => {
          const mom = momentumBadge(f?.momentum ?? 'stable');
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_60px_60px_64px_56px] gap-0 px-1 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold text-neutral-300 truncate">{f?.category ?? '---'}</span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(f?.flows1M ?? 0)}`}>
                {f?.flows1M != null ? `${changeSign(f.flows1M)}${f.flows1M.toFixed(0)}` : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(f?.flows3M ?? 0)}`}>
                {f?.flows3M != null ? `${changeSign(f.flows3M)}${f.flows3M.toFixed(0)}` : '---'}
              </span>
              <div className="flex justify-end">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: mom.bg, color: mom.color }}
                >
                  {mom.text}
                </span>
              </div>
              <span className="text-[8px] font-bold text-right tabular-nums pr-1 text-neutral-300">
                {f?.totalAUM != null ? f.totalAUM.toFixed(1) : '---'}
              </span>
            </div>
          );
        })}

        {flows.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No flow data available
          </div>
        )}
      </div>
    </div>
  );
}

// -- REGIME View --

function RegimeView({ data }: { data: any }) {
  const t = useT();
  const regime = data?.regime;
  const rebalanceCalendar: any[] = data?.rebalanceCalendar ?? [];

  return (
    <div className="text-[9px]">
      {/* Market Regime Card */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaRegime', 'Market Regime Analysis')}
        </div>

        <div className="grid grid-cols-5 gap-0 border border-border/10">
          <div className="px-2 py-2 border-r border-border/10">
            <div className="text-[6px] text-neutral-600 uppercase tracking-wider mb-1">Current Regime</div>
            {regime?.current ? (() => {
              const r = regimeBadge(regime.current);
              return (
                <span
                  className="text-[9px] font-black uppercase px-1 py-[1px] mt-0.5 inline-block"
                  style={{ background: r.bg, color: r.color }}
                >
                  {r.text}
                </span>
              );
            })() : (
              <span className="text-[11px] font-black tabular-nums mt-0.5 text-neutral-500">---</span>
            )}
          </div>
          <MetricCell
            label="Confidence"
            value={regime?.confidence != null ? `${(regime.confidence * 100).toFixed(0)}%` : '---'}
            color={regime?.confidence > 0.7 ? '#34d399' : regime?.confidence > 0.4 ? '#fbbf24' : '#f87171'}
          />
          <MetricCell
            label="Best Factor"
            value={regime?.bestFactor ?? '---'}
            color="#34d399"
          />
          <MetricCell
            label="Worst Factor"
            value={regime?.worstFactor ?? '---'}
            color="#f87171"
          />
          <MetricCell
            label="Duration"
            value={regime?.duration ?? '---'}
            color="#737373"
          />
        </div>
      </div>

      {/* Rebalance Calendar */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'smartBetaRebalance', 'Rebalance Calendar')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_60px_56px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Date</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Strategy</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Est. Turnover</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Impact</span>
        </div>

        {/* Rows */}
        {rebalanceCalendar.map((r: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[80px_1fr_60px_56px] gap-0 px-1 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
          >
            <span className="text-[8px] font-bold tabular-nums" style={{ color: CYAN }}>
              {r?.date ?? '---'}
            </span>
            <span className="text-[8px] font-bold text-neutral-300 truncate">
              {r?.strategy ?? '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
              {r?.estimatedTurnover != null ? `${r.estimatedTurnover.toFixed(1)}%` : '---'}
            </span>
            <div className="flex justify-end pr-1">
              {r?.impact ? (() => {
                const impactColors: Record<string, { bg: string; color: string }> = {
                  low: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
                  moderate: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
                  high: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
                };
                const c = impactColors[r.impact] ?? { bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
                return (
                  <span
                    className="text-[7px] font-black uppercase px-1 py-[1px]"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {r.impact.toUpperCase()}
                  </span>
                );
              })() : (
                <span className="text-[8px] text-neutral-600">---</span>
              )}
            </div>
          </div>
        ))}

        {rebalanceCalendar.length === 0 && (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No upcoming rebalance events
          </div>
        )}
      </div>
    </div>
  );
}

// -- Shared Components --

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
