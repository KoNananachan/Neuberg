import { useState, useMemo, useCallback } from 'react';
import {
  useHedgeFundMonitor,
  type StrategyReturn,
  type AumFlow,
  type CrowdedTrade,
  type LeverageRisk,
} from '../../api/hooks/use-hedge-fund-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n helper with fallback ──

// ── Constants ──

const AMBER = '#fbbf24';
const GREEN = '#34d399';
const RED = '#f87171';

type Tab = 'returns' | 'flows' | 'crowded' | 'risk';
type StrategySortKey = 'strategy' | 'mtd' | 'ytd' | 'threeYearAnn' | 'volatility' | 'sharpe' | 'maxDrawdown' | 'beta';
type SortDir = 'asc' | 'desc';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, d: number = 2): string {
  return n.toFixed(d);
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtCompactSigned(n: number): string {
  const prefix = n > 0 ? '+$' : n < 0 ? '-$' : '$';
  return prefix + fmtCompact(Math.abs(n));
}

function returnColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function sharpeColor(n: number): string {
  if (n >= 1.5) return GREEN;
  if (n >= 0.5) return AMBER;
  if (n >= 0) return 'rgba(255,255,255,0.5)';
  return RED;
}

function impactBadge(impact: 'high' | 'medium' | 'low'): { text: string; color: string; bg: string } {
  switch (impact) {
    case 'high': return { text: 'HIGH', color: RED, bg: 'rgba(248,113,113,0.15)' };
    case 'medium': return { text: 'MED', color: AMBER, bg: 'rgba(251,191,36,0.12)' };
    case 'low': return { text: 'LOW', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

// ── Strategy Returns Section ──

function StrategyReturnsSection({ strategies }: { strategies: StrategyReturn[] }) {
  const t = useT();
  const [sortKey, setSortKey] = useState<StrategySortKey>('sharpe');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: StrategySortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const sorted = useMemo(() => {
    return [...strategies].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (sortKey) {
        case 'strategy':
          return sortDir === 'asc'
            ? a.strategy.localeCompare(b.strategy)
            : b.strategy.localeCompare(a.strategy);
        case 'mtd': va = a.mtd; vb = b.mtd; break;
        case 'ytd': va = a.ytd; vb = b.ytd; break;
        case 'threeYearAnn': va = a.threeYearAnn; vb = b.threeYearAnn; break;
        case 'volatility': va = a.volatility; vb = b.volatility; break;
        case 'sharpe': va = a.sharpe; vb = b.sharpe; break;
        case 'maxDrawdown': va = a.maxDrawdown; vb = b.maxDrawdown; break;
        case 'beta': va = a.beta; vb = b.beta; break;
        default: va = 0; vb = 0;
      }
      return sortDir === 'asc'
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
  }, [strategies, sortKey, sortDir]);

  const SortHeader = ({ k, label, className = '' }: { k: StrategySortKey; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-[7px] font-mono uppercase tracking-wider transition-colors ${
        sortKey === k ? 'text-amber-400' : 'text-white/30 hover:text-white/50'
      } ${className}`}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '\u25BE' : '\u25B4') : ''}
    </button>
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'hfmStrategyReturns', 'Strategy Returns')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_42px_42px_42px_34px_34px_40px_30px] gap-0 px-2 py-1 border-b border-border/10 bg-black/40">
        <SortHeader k="strategy" label="Strategy" />
        <SortHeader k="mtd" label="MTD" className="text-right" />
        <SortHeader k="ytd" label="YTD" className="text-right" />
        <SortHeader k="threeYearAnn" label="3YR" className="text-right" />
        <SortHeader k="volatility" label="Vol" className="text-right" />
        <SortHeader k="sharpe" label="SR" className="text-right" />
        <SortHeader k="maxDrawdown" label="MaxDD" className="text-right" />
        <SortHeader k="beta" label="Beta" className="text-right" />
      </div>

      {/* Rows */}
      {sorted.map((s) => (
        <div
          key={s.strategy}
          className="grid grid-cols-[1fr_42px_42px_42px_34px_34px_40px_30px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-mono font-bold text-white/80 truncate">{s.strategy}</span>
            <span className="text-[6px] font-mono text-white/25 truncate">{s.category}</span>
          </div>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: returnColor(s.mtd) }}>
            {fmtPct(s.mtd)}
          </span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: returnColor(s.ytd) }}>
            {fmtPct(s.ytd)}
          </span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: returnColor(s.threeYearAnn) }}>
            {fmtPct(s.threeYearAnn)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-white/40">
            {fmtNum(s.volatility, 1)}
          </span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: sharpeColor(s.sharpe) }}>
            {fmtNum(s.sharpe)}
          </span>
          <span className="text-[8px] font-mono font-bold text-right tabular-nums text-red-400/80">
            {fmtPct(s.maxDrawdown)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-white/50">
            {fmtNum(s.beta)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── AUM Flows Section ──

function AumFlowsSection({ flows }: { flows: AumFlow[] }) {
  const t = useT();

  const maxAbsFlow = useMemo(
    () => Math.max(...flows.map(f => Math.max(Math.abs(f.inflows), Math.abs(f.outflows))), 1),
    [flows],
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'hfmAumFlows', 'AUM & Flows')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_60px_54px_54px_54px_40px_1fr] gap-0 px-2 py-1 border-b border-border/10 bg-black/40">
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Month</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">AUM</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">Net</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">In</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">Out</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">Redm%</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right pr-1">Flow</span>
      </div>

      {/* Rows */}
      {flows.map((f) => {
        const inflowPct = (f.inflows / maxAbsFlow) * 100;
        const outflowPct = (Math.abs(f.outflows) / maxAbsFlow) * 100;
        return (
          <div
            key={f.month}
            className="grid grid-cols-[48px_60px_54px_54px_54px_40px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono text-white/50">{f.month}</span>
            <span className="text-[8px] font-mono text-right text-white/60 tabular-nums">${fmtCompact(f.totalAum)}</span>
            <span className="text-[8px] font-mono font-bold text-right tabular-nums" style={{ color: returnColor(f.netFlow) }}>
              {fmtCompactSigned(f.netFlow)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums" style={{ color: GREEN }}>
              +${fmtCompact(f.inflows)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums" style={{ color: RED }}>
              -${fmtCompact(Math.abs(f.outflows))}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-white/40">
              {fmtNum(f.redemptionRate, 1)}%
            </span>
            {/* Dual bar */}
            <div className="flex items-center gap-0 h-3 px-1">
              <div className="flex-1 flex justify-end">
                <div
                  className="h-2"
                  style={{ width: `${inflowPct}%`, backgroundColor: 'rgba(52,211,153,0.5)', minWidth: inflowPct > 0 ? 1 : 0 }}
                />
              </div>
              <div className="w-px h-3 bg-white/10 mx-0.5" />
              <div className="flex-1">
                <div
                  className="h-2"
                  style={{ width: `${outflowPct}%`, backgroundColor: 'rgba(248,113,113,0.5)', minWidth: outflowPct > 0 ? 1 : 0 }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Crowded Trades Section ──

function CrowdedTradesSection({ trades }: { trades: CrowdedTrade[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...trades].sort((a, b) => b.crowdingScore - a.crowdingScore),
    [trades],
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'hfmCrowdedTrades', 'Crowded Trades')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[44px_1fr_38px_36px_32px_36px_36px] gap-0 px-2 py-1 border-b border-border/10 bg-black/40">
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Sym</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">Score</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-center">Dir</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">#HF</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-right">%AUM</span>
        <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider text-center">Imp</span>
      </div>

      {/* Rows */}
      {sorted.map((trade) => {
        const badge = impactBadge(trade.potentialImpact);
        const scoreBarWidth = Math.min(trade.crowdingScore, 100);
        const dirColor = trade.direction === 'long' ? GREEN : RED;
        return (
          <div
            key={trade.symbol}
            className="grid grid-cols-[44px_1fr_38px_36px_32px_36px_36px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-black text-amber-400">{trade.symbol}</span>
            <span className="text-[8px] font-mono text-white/40 truncate pr-1">{trade.name}</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[8px] font-mono font-bold text-white/80 tabular-nums">{trade.crowdingScore}</span>
              <div className="w-full h-1 bg-white/[0.04]">
                <div className="h-full" style={{ width: `${scoreBarWidth}%`, backgroundColor: AMBER, opacity: 0.6 }} />
              </div>
            </div>
            <span className="text-[7px] font-mono font-black text-center uppercase" style={{ color: dirColor }}>
              {trade.direction === 'long' ? 'LNG' : 'SHT'}
            </span>
            <span className="text-[8px] font-mono text-right text-white/50 tabular-nums">{trade.holdersCount}</span>
            <span className="text-[8px] font-mono text-right text-white/50 tabular-nums">{fmtNum(trade.pctOfAum, 1)}%</span>
            <div className="flex justify-center">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-[1px]"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Leverage & Risk Section ──

function LeverageRiskSection({ risk }: { risk: LeverageRisk }) {
  const t = useT();

  const metrics: { label: string; value: string; color?: string; bar?: number }[] = [
    {
      label: 'Gross Exposure',
      value: fmtPct(risk.grossExposure),
      color: risk.grossExposure > 200 ? RED : risk.grossExposure > 150 ? AMBER : 'rgba(255,255,255,0.7)',
      bar: Math.min(risk.grossExposure / 300 * 100, 100),
    },
    {
      label: 'Net Exposure',
      value: fmtPct(risk.netExposure),
      color: returnColor(risk.netExposure),
      bar: Math.min(Math.abs(risk.netExposure) / 150 * 100, 100),
    },
    {
      label: 'Leverage Ratio',
      value: fmtNum(risk.leverageRatio, 1) + 'x',
      color: risk.leverageRatio > 3 ? RED : risk.leverageRatio > 2 ? AMBER : GREEN,
      bar: Math.min(risk.leverageRatio / 5 * 100, 100),
    },
    {
      label: 'VaR (95%)',
      value: fmtPct(risk.var95),
      color: risk.var95 < -3 ? RED : risk.var95 < -1.5 ? AMBER : 'rgba(255,255,255,0.7)',
      bar: Math.min(Math.abs(risk.var95) / 8 * 100, 100),
    },
    {
      label: 'VaR (99%)',
      value: fmtPct(risk.var99),
      color: risk.var99 < -5 ? RED : risk.var99 < -3 ? AMBER : 'rgba(255,255,255,0.7)',
      bar: Math.min(Math.abs(risk.var99) / 12 * 100, 100),
    },
    {
      label: 'Liquidity (Days)',
      value: fmtNum(risk.liquidityDays, 0) + 'd',
      color: risk.liquidityDays > 30 ? RED : risk.liquidityDays > 15 ? AMBER : GREEN,
      bar: Math.min(risk.liquidityDays / 60 * 100, 100),
    },
    {
      label: 'Margin Util.',
      value: fmtPct(risk.marginUtilization),
      color: risk.marginUtilization > 80 ? RED : risk.marginUtilization > 60 ? AMBER : GREEN,
      bar: Math.min(risk.marginUtilization, 100),
    },
    {
      label: 'Top 10 Conc.',
      value: fmtPct(risk.concentrationTop10),
      color: risk.concentrationTop10 > 60 ? RED : risk.concentrationTop10 > 40 ? AMBER : 'rgba(255,255,255,0.7)',
      bar: Math.min(risk.concentrationTop10, 100),
    },
  ];

  return (
    <div>
      {/* Section header */}
      <div className="px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500">
          {tr(t, 'hfmLeverageRisk', 'Leverage & Risk')}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-0">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-col gap-1 px-2 py-1.5 border-b border-r border-border/5 hover:bg-amber-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider">{m.label}</span>
              <span className="text-[9px] font-mono font-black tabular-nums" style={{ color: m.color }}>
                {m.value}
              </span>
            </div>
            {m.bar != null && (
              <div className="w-full h-1 bg-white/[0.04]">
                <div
                  className="h-full transition-all"
                  style={{ width: `${m.bar}%`, backgroundColor: m.color, opacity: 0.5 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function HedgeFundMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useHedgeFundMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('returns');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'returns', label: tr(t, 'hfmReturns', 'Returns') },
    { key: 'flows', label: tr(t, 'hfmFlows', 'Flows') },
    { key: 'crowded', label: tr(t, 'hfmCrowded', 'Crowded') },
    { key: 'risk', label: tr(t, 'hfmRisk', 'Risk') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 13V7l2-3 2 3v-3l2-2 2 2v3l2-4 2 4v6" stroke={AMBER} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="1" y1="14" x2="15" y2="14" stroke={AMBER} strokeWidth="0.8" opacity="0.4" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: AMBER }}
          >
            {tr(t, 'hfmTitle', 'Hedge Fund Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-white/30 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border/20 shrink-0 bg-[#050505]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-1 text-[8px] font-mono font-black uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-amber-400 border-amber-400 bg-amber-400/[0.04]'
                : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/[0.01]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
              {tr(t, 'hfmLoadFailed', 'Failed to load hedge fund data')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[9px] font-mono text-amber-400 hover:text-white border border-amber-400/30 px-2 py-0.5 transition-colors"
            >
              {tr(t, 'retry', 'Retry')}
            </button>
          </div>
        ) : data ? (
          <>
            {activeTab === 'returns' && <StrategyReturnsSection strategies={data.strategyReturns} />}
            {activeTab === 'flows' && <AumFlowsSection flows={data.aumFlows} />}
            {activeTab === 'crowded' && <CrowdedTradesSection trades={data.crowdedTrades} />}
            {activeTab === 'risk' && <LeverageRiskSection risk={data.leverageRisk} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'hfmNoData', 'No data available')}
          </div>
        )}
      </div>

      {/* Status bar */}
      {data && (
        <div className="flex items-center gap-3 px-3 py-1 border-t border-border/10 text-[7px] font-mono text-white/20 bg-[#050505] shrink-0">
          <span>{data.strategyReturns.length} strategies</span>
          <span>{data.crowdedTrades.length} crowded</span>
          <span>Lev: {fmtNum(data.leverageRisk.leverageRatio, 1)}x</span>
          <span className="ml-auto">
            {tr(t, 'hfmUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
