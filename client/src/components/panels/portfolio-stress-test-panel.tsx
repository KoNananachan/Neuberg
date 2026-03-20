import { useState, useMemo } from 'react';
import { usePortfolioStressTest } from '../../api/hooks/use-portfolio-stress-test';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Loader2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

type Tab = 'scenarios' | 'factors' | 'concentration' | 'liquidity' | 'drawdowns';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'scenarios', label: 'SCENARIOS' },
  { key: 'factors', label: 'FACTOR SHOCKS' },
  { key: 'concentration', label: 'CONCENTRATION' },
  { key: 'liquidity', label: 'LIQUIDITY' },
  { key: 'drawdowns', label: 'DRAWDOWNS' },
];

// ── i18n fallback helper ─────────────────────────────────────────────

// ── Color / formatting helpers ───────────────────────────────────────

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '+' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(n / 1_000).toFixed(1)}K`;
  return `${sign}$${n.toFixed(0)}`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function impactColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n < 0) return 'text-red-400';
  if (n > 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function impactBg(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 0) return 'bg-red-400/[0.04]';
  if (n > 0) return 'bg-emerald-400/[0.04]';
  return '';
}

// ── Main Panel ───────────────────────────────────────────────────────

export function PortfolioStressTestPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = usePortfolioStressTest();
  const [activeTab, setActiveTab] = useState<Tab>('scenarios');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 14 L5 6 L8 10 L11 3 L14 8" stroke="#fb7185" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M2 14 L14 14" stroke="#fb7185" strokeWidth="0.5" opacity="0.3" />
            <circle cx="5" cy="6" r="1.2" fill="#fb7185" opacity="0.7" />
            <circle cx="11" cy="3" r="1.2" fill="#fb7185" opacity="0.7" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'stressTestTitle', 'Portfolio Stress Test')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-black/60 shrink-0">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border transition-colors ${
              activeTab === key
                ? 'border-rose-400/40 text-rose-400 bg-rose-400/10'
                : 'border-border/20 text-neutral/30 hover:text-neutral/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              LOADING STRESS TEST...
            </span>
          </div>
        </div>
      ) : error && !data ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
            FAILED TO LOAD
          </span>
          <button
            onClick={() => refetch()}
            className="text-[9px] font-mono text-rose-400 hover:text-white border border-rose-400/30 px-2 py-0.5 transition-colors"
          >
            {tr(t, 'retry', 'RETRY')}
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'scenarios' && <ScenariosSection data={data} />}
          {activeTab === 'factors' && <FactorShocksSection data={data} />}
          {activeTab === 'concentration' && <ConcentrationSection data={data} />}
          {activeTab === 'liquidity' && <LiquiditySection data={data} />}
          {activeTab === 'drawdowns' && <DrawdownsSection data={data} />}
        </>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">
          STRESS TEST
        </span>
        <span className="text-[7px] font-mono text-neutral/20">
          {data?.updatedAt
            ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
    </div>
  );
}

// ── 1. Scenarios Section ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScenariosSection({ data }: { data: any }) {
  const scenarios = data?.scenarios ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = useMemo(() => {
    return [...scenarios].sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => (a.portfolioImpactPct ?? 0) - (b.portfolioImpactPct ?? 0)
    );
  }, [scenarios]);

  if (!sorted.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        No scenario data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.5fr_0.6fr_0.7fr_0.8fr_0.8fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">SCENARIO</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-center">TYPE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">IMPACT %</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">IMPACT $</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">WORST</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">BEST</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">PROB</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {sorted.map((s: any, i: number) => {
        const isHist = (s.type || '').toLowerCase() === 'historical';
        return (
          <div
            key={s.name || i}
            className={`grid grid-cols-[1.4fr_0.5fr_0.6fr_0.7fr_0.8fr_0.8fr_0.5fr] px-3 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors items-center ${
              impactBg(s.portfolioImpactPct)
            } ${isHist ? 'border-l-2 border-l-rose-400/20' : ''}`}
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{s.name}</div>
              {s.description && (
                <div className="text-[7px] font-mono text-neutral/30 truncate">{s.description}</div>
              )}
            </div>
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 ${
                  isHist
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-cyan-400 bg-cyan-400/10'
                }`}
              >
                {isHist ? 'HIST' : 'HYPO'}
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold text-right ${impactColor(s.portfolioImpactPct)}`}>
              {fmtPct(s.portfolioImpactPct)}
            </span>
            <span className={`text-[9px] font-mono text-right ${impactColor(s.portfolioImpactDollar)}`}>
              {fmtDollar(s.portfolioImpactDollar)}
            </span>
            <div className="text-right min-w-0">
              <div className="text-[8px] font-mono text-red-400 truncate">{s.worstAsset || '-'}</div>
              <div className="text-[7px] font-mono text-red-400/60">{fmtPct(s.worstAssetImpact)}</div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[8px] font-mono text-emerald-400 truncate">{s.bestAsset || '-'}</div>
              <div className="text-[7px] font-mono text-emerald-400/60">{fmtPct(s.bestAssetImpact)}</div>
            </div>
            <span className="text-[8px] font-mono text-neutral/40 text-right">
              {s.probability != null ? `${(s.probability * 100).toFixed(0)}%` : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 2. Factor Shocks Section ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FactorShocksSection({ data }: { data: any }) {
  const factors = data?.factorShocks ?? [];

  if (!factors.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        No factor data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">FACTOR</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">CURRENT</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">SHOCKED</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">SHOCK</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">DELTA</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">P&L</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {factors.map((f: any, i: number) => (
        <div
          key={f.factor || i}
          className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-white truncate">{f.factor}</div>
            {f.category && (
              <div className="text-[7px] font-mono text-neutral/30 truncate">{f.category}</div>
            )}
          </div>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {fmtNum(f.currentValue)}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {fmtNum(f.shockedValue)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${impactColor(f.shockSize)}`}>
            {fmtPct(f.shockSize)}
          </span>
          <span className="text-[9px] font-mono text-rose-400/80 text-right">
            {fmtNum(f.delta, 3)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${impactColor(f.pnlImpact)}`}>
            {fmtDollar(f.pnlImpact)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Concentration Section ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ConcentrationSection({ data }: { data: any }) {
  const holdings = data?.concentration ?? [];

  if (!holdings.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        No concentration data
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxWeight = Math.max(...holdings.map((h: any) => Math.abs(h.weight ?? 0)), 1);

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">HOLDING</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">WEIGHT</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">VAR CONTRIB</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">MARG VAR</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">BETA</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {holdings.map((h: any, i: number) => {
        const weightPct = maxWeight > 0 ? (Math.abs(h.weight ?? 0) / maxWeight) * 100 : 0;
        return (
          <div
            key={h.name || i}
            className="grid grid-cols-[1.2fr_1.4fr_0.6fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{h.name}</div>
              {h.ticker && (
                <div className="text-[7px] font-mono text-neutral/30 truncate">{h.ticker}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-white/[0.04] relative">
                <div
                  className="absolute top-0 left-0 h-full bg-rose-400/50"
                  style={{ width: `${Math.min(weightPct, 100)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-neutral-300 w-[32px] text-right shrink-0">
                {fmtPct(h.weight, 1)}
              </span>
            </div>
            <span className={`text-[9px] font-mono text-right ${impactColor(h.varContribution)}`}>
              {fmtPct(h.varContribution)}
            </span>
            <span className="text-[9px] font-mono text-rose-400/70 text-right">
              {fmtNum(h.marginalVar, 3)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtNum(h.beta)}
            </span>
          </div>
        );
      })}

      {/* Summary bar */}
      {data?.concentrationSummary && (
        <div className="px-3 py-2 border-t border-border/20 bg-[#060606]">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">TOP 5 WEIGHT</div>
              <div className="text-[9px] font-mono font-bold text-rose-400">
                {fmtPct(data.concentrationSummary.top5Weight)}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">TOP 10 WEIGHT</div>
              <div className="text-[9px] font-mono font-bold text-rose-400/80">
                {fmtPct(data.concentrationSummary.top10Weight)}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">HHI</div>
              <div className="text-[9px] font-mono font-bold text-neutral-300">
                {fmtNum(data.concentrationSummary.hhi, 0)}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">EFF. NAMES</div>
              <div className="text-[9px] font-mono font-bold text-neutral-300">
                {fmtNum(data.concentrationSummary.effectiveNames, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. Liquidity Section ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LiquiditySection({ data }: { data: any }) {
  const buckets = data?.liquidityBuckets ?? [];
  const details = data?.liquidityDetails ?? [];

  if (!buckets.length && !details.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        No liquidity data
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPct = buckets.reduce((sum: number, b: any) => sum + (b.portfolioPct ?? 0), 0);

  const bucketColors = [
    'bg-emerald-400',
    'bg-cyan-400',
    'bg-amber-400',
    'bg-orange-400',
    'bg-red-400',
    'bg-rose-400',
  ];

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Stacked horizontal bar */}
      {buckets.length > 0 && (
        <div className="px-3 py-2 border-b border-border/20">
          <div className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider mb-2">
            DAYS TO LIQUIDATE
          </div>
          <div className="h-4 flex w-full bg-white/[0.03]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {buckets.map((b: any, i: number) => {
              const widthPct = totalPct > 0 ? ((b.portfolioPct ?? 0) / totalPct) * 100 : 0;
              if (widthPct <= 0) return null;
              return (
                <div
                  key={b.bucket || i}
                  className={`h-full ${bucketColors[i % bucketColors.length]} opacity-60 relative group`}
                  style={{ width: `${widthPct}%` }}
                  title={`${b.bucket}: ${fmtPct(b.portfolioPct)}`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {buckets.map((b: any, i: number) => (
              <div key={b.bucket || i} className="flex items-center gap-1">
                <div className={`w-2 h-2 ${bucketColors[i % bucketColors.length]} opacity-60`} />
                <span className="text-[7px] font-mono text-neutral/40">{b.bucket}</span>
                <span className="text-[7px] font-mono text-neutral-300">{fmtPct(b.portfolioPct, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liquidity details table */}
      {details.length > 0 && (
        <>
          <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">ASSET</span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">WEIGHT</span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">AVG VOLUME</span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">DAYS LIQ</span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">COST BPS</span>
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {details.map((d: any, i: number) => (
            <div
              key={d.name || i}
              className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors items-center"
            >
              <div className="min-w-0">
                <div className="text-[9px] font-mono font-bold text-white truncate">{d.name}</div>
              </div>
              <span className="text-[9px] font-mono text-neutral-300 text-right">
                {fmtPct(d.weight, 1)}
              </span>
              <span className="text-[9px] font-mono text-neutral-300 text-right">
                {fmtDollar(d.avgDailyVolume)}
              </span>
              <span className={`text-[9px] font-mono font-bold text-right ${
                (d.daysToLiquidate ?? 0) > 5 ? 'text-red-400' : (d.daysToLiquidate ?? 0) > 2 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {fmtNum(d.daysToLiquidate, 1)}
              </span>
              <span className="text-[9px] font-mono text-neutral/40 text-right">
                {d.costBps != null ? `${d.costBps.toFixed(0)}` : '-'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── 5. Drawdowns Section ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DrawdownsSection({ data }: { data: any }) {
  const drawdowns = data?.drawdowns ?? [];

  if (!drawdowns.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        No drawdown data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">EPISODE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">DATES</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">MAX DD</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">RECOVERY</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">SIM IMPACT</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">SIM P&L</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {drawdowns.map((d: any, i: number) => {
        const ddPct = Math.abs(d.maxDrawdown ?? 0);
        const barWidth = Math.min((ddPct / 60) * 100, 100);

        return (
          <div
            key={d.name || i}
            className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-rose-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{d.name}</div>
              {/* Drawdown bar */}
              <div className="h-1 bg-white/[0.03] mt-0.5 w-full">
                <div
                  className="h-full bg-red-400/50"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[8px] font-mono text-neutral/40 truncate">{d.startDate || '-'}</div>
              <div className="text-[7px] font-mono text-neutral/30 truncate">{d.endDate || '-'}</div>
            </div>
            <span className="text-[9px] font-mono font-bold text-red-400 text-right">
              {fmtPct(d.maxDrawdown)}
            </span>
            <span className={`text-[9px] font-mono text-right ${
              (d.recoveryDays ?? 0) > 180 ? 'text-red-400' : (d.recoveryDays ?? 0) > 60 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {d.recoveryDays != null ? `${d.recoveryDays}d` : '-'}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${impactColor(d.simulatedImpactPct)}`}>
              {fmtPct(d.simulatedImpactPct)}
            </span>
            <span className={`text-[9px] font-mono text-right ${impactColor(d.simulatedPnl)}`}>
              {fmtDollar(d.simulatedPnl)}
            </span>
          </div>
        );
      })}

      {/* Summary */}
      {data?.drawdownSummary && (
        <div className="px-3 py-2 border-t border-border/20 bg-[#060606]">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">AVG RECOVERY</div>
              <div className="text-[9px] font-mono font-bold text-neutral-300">
                {data.drawdownSummary.avgRecoveryDays != null
                  ? `${data.drawdownSummary.avgRecoveryDays}d`
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">WORST CASE</div>
              <div className="text-[9px] font-mono font-bold text-red-400">
                {fmtPct(data.drawdownSummary.worstCaseImpact)}
              </div>
            </div>
            <div>
              <div className="text-[6px] font-mono text-neutral/40 uppercase tracking-wider">AVG IMPACT</div>
              <div className="text-[9px] font-mono font-bold text-rose-400/80">
                {fmtPct(data.drawdownSummary.avgImpact)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
