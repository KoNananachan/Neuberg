import { useState } from 'react';
import { useHedgeFundReplication } from '../../api/hooks/use-hedge-fund-replication';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#2dd4bf'; // teal-400
const ACCENT_DIM = 'rgba(45,212,191,0.12)';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtAum(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  if (n >= 1) return `$${n.toFixed(1)}B`;
  return `$${(n * 1000).toFixed(0)}M`;
}

// ── Color helpers ──

function returnColor(n: number): string {
  if (n > 0) return '#2dd4bf';
  if (n < 0) return '#f87171';
  return '#525252';
}

function returnClass(n: number): string {
  if (n > 0) return 'text-teal-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function corrColor(n: number): string {
  if (n >= 0.95) return 'text-teal-300';
  if (n >= 0.85) return 'text-teal-400';
  if (n >= 0.70) return 'text-yellow-400';
  return 'text-red-400';
}

function significanceBadge(sig: string): { label: string; color: string; bg: string } {
  switch (sig) {
    case 'high':
      return { label: 'HIGH', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    case 'medium':
      return { label: 'MED', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'low':
      return { label: 'LOW', color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
    default:
      return { label: sig.toUpperCase(), color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

function crowdingBadge(level: string): { label: string; color: string; bg: string } {
  switch (level) {
    case 'extreme':
      return { label: 'EXTREME', color: 'text-red-400', bg: 'bg-red-400/10' };
    case 'high':
      return { label: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-400/10' };
    case 'moderate':
      return { label: 'MOD', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'low':
      return { label: 'LOW', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    default:
      return { label: level.toUpperCase(), color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

function unwindBadge(risk: string): { label: string; color: string; bg: string } {
  switch (risk) {
    case 'high':
      return { label: 'HIGH', color: 'text-red-400', bg: 'bg-red-400/10' };
    case 'medium':
      return { label: 'MED', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'low':
      return { label: 'LOW', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    default:
      return { label: risk.toUpperCase(), color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

function liquidityBadge(adv: string): { label: string; color: string; bg: string } {
  switch (adv) {
    case 'high':
      return { label: 'HIGH LIQ', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    case 'medium':
      return { label: 'MED LIQ', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    case 'low':
      return { label: 'LOW LIQ', color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
    default:
      return { label: adv.toUpperCase(), color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  }
}

// ── Types ──

type ViewTab = 'STRATEGIES' | 'FACTORS' | 'ETFS' | 'ALPHA';

// ── Main Panel ──

export function HedgeFundReplicationPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useHedgeFundReplication();
  const [activeView, setActiveView] = useState<ViewTab>('STRATEGIES');

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'STRATEGIES', label: tr(t, 'hfrStrategies', 'STRATEGIES') },
    { key: 'FACTORS', label: tr(t, 'hfrFactors', 'FACTORS') },
    { key: 'ETFS', label: tr(t, 'hfrEtfs', 'ETFS') },
    { key: 'ALPHA', label: tr(t, 'hfrAlpha', 'ALPHA') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="6" height="10" rx="0.5" stroke={ACCENT} strokeWidth="0.8" fill="none" />
            <rect x="9" y="3" width="6" height="10" rx="0.5" stroke={ACCENT} strokeWidth="0.8" fill="none" />
            <path d="M7 6 L9 6" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="0.8 0.4" />
            <path d="M7 8 L9 8" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="0.8 0.4" />
            <path d="M7 10 L9 10" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="0.8 0.4" />
            <line x1="2.5" y1="5" x2="5.5" y2="5" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
            <line x1="2.5" y1="7" x2="5.5" y2="7" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
            <line x1="2.5" y1="9" x2="5.5" y2="9" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
            <line x1="10.5" y1="5" x2="13.5" y2="5" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
            <line x1="10.5" y1="7" x2="13.5" y2="7" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
            <line x1="10.5" y1="9" x2="13.5" y2="9" stroke={ACCENT} strokeWidth="0.5" opacity="0.6" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'hfrTitle', 'HF Replication')}
          </span>
        </div>

        {/* View tabs + refresh */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeView === tab.key
                  ? 'text-teal-400 border border-teal-400/30'
                  : 'text-neutral-500 hover:text-neutral-400 border border-transparent'
              }`}
              style={activeView === tab.key ? { background: ACCENT_DIM } : undefined}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors ml-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'hfrNoData', 'No replication data available')}
          </div>
        )}

        {data && activeView === 'STRATEGIES' && <StrategiesTab data={data} t={t} />}
        {data && activeView === 'FACTORS' && <FactorsTab data={data} t={t} />}
        {data && activeView === 'ETFS' && <EtfsTab data={data} t={t} />}
        {data && activeView === 'ALPHA' && <AlphaTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── STRATEGIES TAB ──

function StrategiesTab({ data, t }: { data: any; t: TFn }) {
  const strategies = data?.strategies ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
        <div className="w-1 h-1" style={{ background: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'hfrStrategyReplication', 'Strategy Replication Analysis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_52px_44px_44px_44px_56px_36px_48px] gap-0 px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Strategy</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">HFRI</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Replica</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">TE</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Corr</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Save</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Liq</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SR</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">ETF</span>
      </div>

      {/* Rows */}
      {strategies.map((s: any, i: number) => {
        const liq = liquidityBadge(s?.liquidityAdvantage ?? 'low');
        return (
          <div
            key={s?.name ?? i}
            className="grid grid-cols-[1fr_52px_52px_44px_44px_44px_56px_36px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            {/* Strategy name */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {s?.name ?? '—'}
            </span>

            {/* HFRI return */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(s?.hfriReturn ?? 0)}`}>
              {fmtPct(s?.hfriReturn ?? 0)}
            </span>

            {/* Replica return */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(s?.replicaReturn ?? 0)}`}>
              {fmtPct(s?.replicaReturn ?? 0)}
            </span>

            {/* Tracking error */}
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtPct(s?.trackingError ?? 0)}
            </span>

            {/* Correlation */}
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${corrColor(s?.correlation ?? 0)}`}>
              {fmtNum(s?.correlation ?? 0, 3)}
            </span>

            {/* Cost saving bps */}
            <span className="text-[8px] font-mono font-bold text-right tabular-nums text-teal-400">
              {fmtBps(s?.costSavingBps ?? 0)}
            </span>

            {/* Liquidity advantage badge */}
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${liq.color} ${liq.bg}`}>
                {liq.label}
              </span>
            </div>

            {/* Sharpe */}
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: (s?.sharpe ?? 0) >= 0 ? ACCENT : '#f87171' }}
            >
              {fmtNum(s?.sharpe ?? 0)}
            </span>

            {/* Replica ETF ticker */}
            <span className="text-[8px] font-mono font-bold text-right text-white truncate">
              {s?.replicaEtf ?? '—'}
            </span>
          </div>
        );
      })}

      {strategies.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'hfrNoStrategies', 'No strategy data')}
        </div>
      )}
    </div>
  );
}

// ── FACTORS TAB ──

function FactorsTab({ data, t }: { data: any; t: TFn }) {
  const factors = data?.factorDecomposition ?? [];
  const performance = data?.performanceComparison;

  return (
    <div>
      {/* Factor Decomposition */}
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
        <div className="w-1 h-1" style={{ background: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'hfrFactorDecomp', 'Factor Decomposition')}
        </span>
      </div>

      {/* Factor table header */}
      <div className="grid grid-cols-[1fr_52px_44px_56px_50px] gap-0 px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Factor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Loading</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">T-Stat</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Contrib</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Sig</span>
      </div>

      {/* Factor rows */}
      {factors.map((f: any, i: number) => {
        const sig = significanceBadge(f?.significance ?? 'low');
        return (
          <div
            key={f?.factor ?? i}
            className="grid grid-cols-[1fr_52px_44px_56px_50px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {f?.factor ?? '—'}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: (f?.loading ?? 0) >= 0 ? ACCENT : '#f87171' }}
            >
              {fmtNum(f?.loading ?? 0, 3)}
            </span>
            <span
              className="text-[8px] font-mono text-right tabular-nums"
              style={{ color: Math.abs(f?.tStat ?? 0) >= 2 ? '#fff' : '#525252' }}
            >
              {fmtNum(f?.tStat ?? 0)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(f?.contribution ?? 0)}`}>
              {fmtPct(f?.contribution ?? 0)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.color} ${sig.bg}`}>
                {sig.label}
              </span>
            </div>
          </div>
        );
      })}

      {factors.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'hfrNoFactors', 'No factor data')}
        </div>
      )}

      {/* Performance Comparison Section */}
      {performance && (
        <>
          <div className="px-3 py-1 border-b border-border/20 border-t border-border/10 flex items-center gap-2 mt-0">
            <div className="w-1 h-1" style={{ background: ACCENT }} />
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'hfrPerfComparison', 'Performance Comparison')}
            </span>
          </div>

          {/* Comparison grid */}
          <div className="grid grid-cols-4 gap-px bg-border/10">
            {(performance?.benchmarks ?? []).map((b: any, i: number) => (
              <div key={b?.name ?? i} className="bg-black px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                  {b?.name ?? '—'}
                </div>
                <div
                  className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                  style={{ color: returnColor(b?.returnYtd ?? 0) }}
                >
                  {fmtPct(b?.returnYtd ?? 0)}
                </div>
                <div className="text-[7px] font-mono text-neutral-600 tabular-nums">
                  YTD
                </div>
              </div>
            ))}
          </div>

          {/* Tracking metrics */}
          <div className="grid grid-cols-3 gap-px bg-border/10 border-t border-border/20">
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrTrackErr', 'Tracking Error')}
              </div>
              <div className="text-[9px] font-mono font-bold text-white tabular-nums mt-0.5">
                {fmtPct(performance?.trackingError ?? 0)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                R²
              </div>
              <div
                className="text-[9px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: (performance?.rSquared ?? 0) >= 0.85 ? ACCENT : '#facc15' }}
              >
                {fmtNum(performance?.rSquared ?? 0, 3)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrInfoRatio', 'Info Ratio')}
              </div>
              <div
                className="text-[9px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: (performance?.informationRatio ?? 0) >= 0 ? ACCENT : '#f87171' }}
              >
                {fmtNum(performance?.informationRatio ?? 0, 3)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ETFS TAB ──

function EtfsTab({ data, t }: { data: any; t: TFn }) {
  const etfs = data?.liquidAlternativeEtfs ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
        <div className="w-1 h-1" style={{ background: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'hfrLiquidAlts', 'Liquid Alternative ETFs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[44px_1fr_52px_44px_44px_48px_44px_64px] gap-0 px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Ticker</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">AUM</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">ER</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Strategy</span>
      </div>

      {/* ETF rows */}
      {etfs.map((etf: any, i: number) => (
        <div
          key={etf?.ticker ?? i}
          className="grid grid-cols-[44px_1fr_52px_44px_44px_48px_44px_64px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          {/* Ticker */}
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {etf?.ticker ?? '—'}
          </span>

          {/* Name */}
          <span className="text-[8px] font-mono text-neutral-300 truncate pr-1">
            {etf?.name ?? '—'}
          </span>

          {/* AUM */}
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
            {fmtAum(etf?.aum ?? 0)}
          </span>

          {/* 1M return */}
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(etf?.return1m ?? 0)}`}>
            {fmtPct(etf?.return1m ?? 0)}
          </span>

          {/* 3M return */}
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(etf?.return3m ?? 0)}`}>
            {fmtPct(etf?.return3m ?? 0)}
          </span>

          {/* YTD return */}
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${returnClass(etf?.returnYtd ?? 0)}`}>
            {fmtPct(etf?.returnYtd ?? 0)}
          </span>

          {/* Expense ratio */}
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
            {fmtPct(etf?.expenseRatio ?? 0)}
          </span>

          {/* Strategy type */}
          <span className="text-[7px] font-mono text-neutral-500 text-right uppercase truncate">
            {etf?.strategyType ?? '—'}
          </span>
        </div>
      ))}

      {etfs.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'hfrNoEtfs', 'No ETF data')}
        </div>
      )}
    </div>
  );
}

// ── ALPHA TAB ──

function AlphaTab({ data, t }: { data: any; t: TFn }) {
  const crowding = data?.crowdingAnalysis ?? [];
  const alphaDecay = data?.alphaDecay;

  return (
    <div>
      {/* Crowding Analysis */}
      <div className="px-3 py-1 border-b border-border/20 flex items-center gap-2">
        <div className="w-1 h-1" style={{ background: ACCENT }} />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'hfrCrowding', 'Crowding Analysis')}
        </span>
      </div>

      {/* Crowding table header */}
      <div className="grid grid-cols-[1fr_56px_64px_56px] gap-0 px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Position</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Crowd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Est Exposure</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Unwind</span>
      </div>

      {/* Crowding rows */}
      {crowding.map((c: any, i: number) => {
        const crowd = crowdingBadge(c?.crowdingLevel ?? 'low');
        const unwind = unwindBadge(c?.riskOfUnwind ?? 'low');
        return (
          <div
            key={c?.position ?? i}
            className="grid grid-cols-[1fr_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {c?.position ?? '—'}
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${crowd.color} ${crowd.bg}`}>
                {crowd.label}
              </span>
            </div>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums text-white">
              {fmtPct(c?.estimatedExposure ?? 0)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${unwind.color} ${unwind.bg}`}>
                {unwind.label}
              </span>
            </div>
          </div>
        );
      })}

      {crowding.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'hfrNoCrowding', 'No crowding data')}
        </div>
      )}

      {/* Alpha Decay Section */}
      {alphaDecay && (
        <>
          <div className="px-3 py-1 border-b border-border/20 border-t border-border/10 flex items-center gap-2 mt-0">
            <div className="w-1 h-1" style={{ background: ACCENT }} />
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'hfrAlphaDecay', 'Alpha Decay & Fee Analysis')}
            </span>
          </div>

          {/* Alpha decay metrics */}
          <div className="grid grid-cols-2 gap-px bg-border/10">
            {/* 3Y Avg Alpha */}
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrAvgAlpha3y', 'Avg Alpha (3Y)')}
              </div>
              <div
                className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: returnColor(alphaDecay?.avgAlpha3y ?? 0) }}
              >
                {fmtPct(alphaDecay?.avgAlpha3y ?? 0)}
              </div>
            </div>

            {/* 5Y Avg Alpha */}
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrAvgAlpha5y', 'Avg Alpha (5Y)')}
              </div>
              <div
                className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: returnColor(alphaDecay?.avgAlpha5y ?? 0) }}
              >
                {fmtPct(alphaDecay?.avgAlpha5y ?? 0)}
              </div>
            </div>

            {/* Fee-Adjusted Alpha */}
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrFeeAdjAlpha', 'Fee-Adj Alpha')}
              </div>
              <div
                className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: returnColor(alphaDecay?.feeAdjustedAlpha ?? 0) }}
              >
                {fmtPct(alphaDecay?.feeAdjustedAlpha ?? 0)}
              </div>
            </div>

            {/* % Underperforming S&P 500 */}
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrUnderperf', '% Underperf S&P')}
              </div>
              <div
                className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                style={{ color: (alphaDecay?.pctUnderperformingSP500 ?? 0) > 50 ? '#f87171' : ACCENT }}
              >
                {fmtNum(alphaDecay?.pctUnderperformingSP500 ?? 0, 1)}%
              </div>
            </div>
          </div>

          {/* Average Total Fees */}
          <div className="px-3 py-2 border-t border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'hfrAvgFees', 'Avg Total Fees (Mgmt + Perf)')}
              </span>
              <span className="text-[9px] font-mono font-bold text-white tabular-nums">
                {fmtPct(alphaDecay?.avgTotalFees ?? 0)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
