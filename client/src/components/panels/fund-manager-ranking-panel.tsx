import { useState, useMemo } from 'react';
import { useFundManagerRanking } from '../../api/hooks/use-fund-manager-ranking';
import { useT, tr, TFn } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FundManager = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RiskAdjustedEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrategyFlow = any;

// ── Constants ──

const FUCHSIA = '#e879f9'; // fuchsia-400
const STRATEGIES = [
  'All',
  'L/S Equity',
  'Macro',
  'Multi-Strat',
  'Quant',
  'Event-Driven',
  'FI',
  'EM',
  'Credit',
] as const;
type Strategy = (typeof STRATEGIES)[number];

type SortField =
  | 'rank'
  | 'name'
  | 'firm'
  | 'aum'
  | 'ytd'
  | 'ret1y'
  | 'ret3y'
  | 'ret5y'
  | 'sharpe'
  | 'maxDD'
  | 'alpha'
  | 'mgmtFee'
  | 'perfFee';

type RiskTab = 'sharpe' | 'sortino' | 'calmar';

// ── Formatting ──

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRatio(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtAUM(n: number | undefined | null): string {
  if (n == null) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtFeePct(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtFlowM(n: number | undefined | null): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  if (Math.abs(n) >= 1e3) return `${sign}${(n / 1e3).toFixed(1)}B`;
  return `${sign}${n.toFixed(0)}M`;
}

// ── Color helpers ──

function retColor(n: number | undefined | null): string {
  if (n == null) return 'rgba(255,255,255,0.2)';
  if (n > 0) return '#34d399';
  if (n < 0) return '#f87171';
  return 'rgba(255,255,255,0.3)';
}

function ddColor(n: number | undefined | null): string {
  if (n == null) return 'rgba(255,255,255,0.2)';
  if (n > -5) return '#34d399';
  if (n > -15) return '#fbbf24';
  return '#f87171';
}

// ── Flow Bar (SVG mini bar chart for strategy flows) ──

function FlowBars({ flows }: { flows: StrategyFlow[] | undefined | null }) {
  if (!flows?.length) return <span className="text-white/10">--</span>;

  const W = 120;
  const H = 28;
  const PADDING = 2;
  const barW = (W - PADDING * 2) / flows.length;
  const maxAbs = Math.max(...flows.map((f: StrategyFlow) => Math.abs(f?.value ?? 0)), 1);
  const midY = H / 2;
  const scale = (midY - PADDING) / maxAbs;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <line
        x1={PADDING}
        y1={midY}
        x2={W - PADDING}
        y2={midY}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={0.5}
      />
      {flows.map((f: StrategyFlow, i: number) => {
        const val = f?.value ?? 0;
        const barH = Math.abs(val) * scale;
        const x = PADDING + i * barW + barW * 0.15;
        const y = val >= 0 ? midY - barH : midY;
        const color = val >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW * 0.7}
              height={Math.max(barH, 0.5)}
              fill={color}
            />
            <text
              x={x + (barW * 0.7) / 2}
              y={H - 1}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize={4}
              fontFamily="monospace"
            >
              {f?.label ?? ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Persistence Bar (horizontal stacked bar) ──

function PersistenceBar({ pct }: { pct: number | undefined | null }) {
  const val = pct ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-white/[0.03] overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${Math.min(Math.max(val, 0), 100)}%`,
            backgroundColor: val >= 50 ? 'rgba(232,121,249,0.5)' : 'rgba(232,121,249,0.25)',
          }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold text-fuchsia-400 w-8 text-right">
        {val.toFixed(0)}%
      </span>
    </div>
  );
}

// ── Sort indicator ──

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) {
  if (field !== sortField) return null;
  return (
    <span className="text-fuchsia-400 ml-0.5">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  );
}

// ── Main Panel ──

export function FundManagerRankingPanel() {
  const t = useT();
  const { data, isLoading, error } = useFundManagerRanking();

  const [strategy, setStrategy] = useState<Strategy>('All');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [riskTab, setRiskTab] = useState<RiskTab>('sharpe');

  // ── Sorting ──

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' || field === 'firm' ? 'asc' : 'desc');
    }
  };

  // ── Filter + sort managers ──

  const managers: FundManager[] = useMemo(() => {
    const raw: FundManager[] = data?.managers ?? [];
    let filtered = raw;
    if (strategy !== 'All') {
      filtered = raw.filter((m: FundManager) => m?.strategy === strategy);
    }

    return [...filtered].sort((a: FundManager, b: FundManager) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a?.[sortField] ?? 0;
      const bv = b?.[sortField] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return dir * av.localeCompare(bv);
      }
      return dir * ((av as number) - (bv as number));
    });
  }, [data, strategy, sortField, sortDir]);

  // ── Risk-adjusted top 10 ──

  const riskRankings: RiskAdjustedEntry[] = useMemo(() => {
    if (riskTab === 'sharpe') return data?.riskAdjusted?.sharpeTop10 ?? [];
    if (riskTab === 'sortino') return data?.riskAdjusted?.sortinoTop10 ?? [];
    return data?.riskAdjusted?.calmarTop10 ?? [];
  }, [data, riskTab]);

  // ── Column header helper ──

  const ColHeader = ({
    field,
    label,
    className = '',
    align = 'right',
  }: {
    field: SortField;
    label: string;
    className?: string;
    align?: 'left' | 'right' | 'center';
  }) => (
    <button
      onClick={() => handleSort(field)}
      className={`uppercase tracking-wider hover:text-fuchsia-400 transition-colors ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {label}
      <SortIndicator field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
            <path
              d="M2 14V10l2-3 2 3V7l2-4 2 4v3l2-2 2 2v4"
              fill="none"
              stroke={FUCHSIA}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[9px] font-black uppercase tracking-tighter"
            style={{ color: FUCHSIA }}
          >
            {tr(t, 'panelFundManagerRanking', 'Fund Manager Rankings')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <span className="text-[7px] text-white/15">
            {managers.length} MGR{managers.length !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* ── Strategy Filter Tabs ── */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
              strategy === s
                ? 'bg-fuchsia-400/20 text-fuchsia-400'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-red-400/60 uppercase tracking-widest">
                {tr(t, 'error', 'Failed to load data')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* ── Main Ranking Table ── */}
            <div className="px-1">
              {/* Table header */}
              <div className="grid grid-cols-[28px_1fr_1fr_56px_48px_48px_48px_48px_42px_48px_44px_44px_44px] text-[7px] text-white/25 px-1 py-1 border-b border-border/20 sticky top-0 bg-black z-10 gap-0.5">
                <ColHeader field="rank" label="#" align="center" />
                <ColHeader field="name" label="NAME" align="left" />
                <ColHeader field="firm" label="FIRM" align="left" />
                <ColHeader field="aum" label="AUM" />
                <ColHeader field="ytd" label="YTD" />
                <ColHeader field="ret1y" label="1Y" />
                <ColHeader field="ret3y" label="3Y" />
                <ColHeader field="ret5y" label="5Y" />
                <ColHeader field="sharpe" label="SR" />
                <ColHeader field="maxDD" label="MAX DD" />
                <ColHeader field="alpha" label="ALPHA" />
                <ColHeader field="mgmtFee" label="MGT" />
                <ColHeader field="perfFee" label="PERF" />
              </div>

              {/* Table rows */}
              {managers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-[10px] text-white/30 uppercase tracking-widest">
                  No managers found
                </div>
              ) : (
                managers.map((m: FundManager, idx: number) => (
                  <div
                    key={m?.id ?? idx}
                    className="grid grid-cols-[28px_1fr_1fr_56px_48px_48px_48px_48px_42px_48px_44px_44px_44px] px-1 py-[3px] border-b border-border/20 hover:bg-fuchsia-400/[0.02] transition-colors items-center gap-0.5"
                  >
                    <span className="text-center text-white/40 font-bold">
                      {m?.rank ?? idx + 1}
                    </span>
                    <span className="text-white/80 font-bold truncate" title={m?.name}>
                      {m?.name ?? '--'}
                    </span>
                    <span className="text-white/40 truncate" title={m?.firm}>
                      {m?.firm ?? '--'}
                    </span>
                    <span className="text-right text-white/50">{fmtAUM(m?.aum)}</span>
                    <span className="text-right font-bold" style={{ color: retColor(m?.ytd) }}>
                      {fmtPct(m?.ytd)}
                    </span>
                    <span className="text-right" style={{ color: retColor(m?.ret1y) }}>
                      {fmtPct(m?.ret1y)}
                    </span>
                    <span className="text-right" style={{ color: retColor(m?.ret3y) }}>
                      {fmtPct(m?.ret3y)}
                    </span>
                    <span className="text-right" style={{ color: retColor(m?.ret5y) }}>
                      {fmtPct(m?.ret5y)}
                    </span>
                    <span className="text-right text-fuchsia-400/80">{fmtRatio(m?.sharpe)}</span>
                    <span className="text-right" style={{ color: ddColor(m?.maxDD) }}>
                      {fmtPct(m?.maxDD)}
                    </span>
                    <span className="text-right" style={{ color: retColor(m?.alpha) }}>
                      {fmtPct(m?.alpha)}
                    </span>
                    {/* Fee columns with hurdle/HWM flags */}
                    <span className="text-right text-white/40">
                      {fmtFeePct(m?.mgmtFee)}
                    </span>
                    <span className="text-right text-white/40">
                      {fmtFeePct(m?.perfFee)}
                      {m?.hurdle && (
                        <span className="text-[5px] text-fuchsia-400/60 ml-0.5" title="Hurdle Rate">
                          H
                        </span>
                      )}
                      {m?.hwm && (
                        <span className="text-[5px] text-fuchsia-400/60 ml-0.5" title="High-Water Mark">
                          W
                        </span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* ── Risk-Adjusted Rankings ── */}
            <div className="px-2 py-1.5 border-t border-border/20 mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] text-fuchsia-400/70 uppercase tracking-wider font-bold">
                  Risk-Adjusted Top 10
                </span>
                <div className="flex items-center gap-0">
                  {(['sharpe', 'sortino', 'calmar'] as RiskTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRiskTab(tab)}
                      className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider transition-colors ${
                        riskTab === tab
                          ? 'bg-fuchsia-400/20 text-fuchsia-400'
                          : 'text-white/25 hover:text-white/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[20px_1fr_1fr_48px_48px_48px] text-[6px] text-white/20 uppercase tracking-wider px-1 py-0.5 border-b border-border/20 gap-0.5">
                <span className="text-center">#</span>
                <span>NAME</span>
                <span>FIRM</span>
                <span className="text-right">
                  {riskTab === 'sharpe' ? 'SHARPE' : riskTab === 'sortino' ? 'SORTINO' : 'CALMAR'}
                </span>
                <span className="text-right">RET</span>
                <span className="text-right">VOL</span>
              </div>

              {riskRankings.length === 0 ? (
                <div className="py-3 text-center text-[8px] text-white/20 uppercase">
                  No data
                </div>
              ) : (
                riskRankings.map((e: RiskAdjustedEntry, i: number) => (
                  <div
                    key={e?.id ?? i}
                    className="grid grid-cols-[20px_1fr_1fr_48px_48px_48px] px-1 py-[2px] border-b border-border/20 hover:bg-fuchsia-400/[0.02] transition-colors items-center gap-0.5"
                  >
                    <span className="text-center text-white/30 text-[7px]">{i + 1}</span>
                    <span className="text-white/70 text-[8px] font-bold truncate">
                      {e?.name ?? '--'}
                    </span>
                    <span className="text-white/35 text-[8px] truncate">{e?.firm ?? '--'}</span>
                    <span className="text-right text-fuchsia-400 text-[8px] font-bold">
                      {fmtRatio(e?.ratio)}
                    </span>
                    <span
                      className="text-right text-[8px]"
                      style={{ color: retColor(e?.ret) }}
                    >
                      {fmtPct(e?.ret)}
                    </span>
                    <span className="text-right text-white/40 text-[8px]">
                      {fmtPct(e?.vol)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* ── Performance Persistence ── */}
            <div className="px-2 py-1.5 border-t border-border/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[7px] text-fuchsia-400/70 uppercase tracking-wider font-bold">
                  Performance Persistence
                </span>
                <span className="text-[6px] text-white/20 uppercase">
                  % Staying Top Quartile
                </span>
              </div>

              {/* Persistence bars by period */}
              {(data?.persistence ?? []).length === 0 ? (
                <div className="py-2 text-center text-[8px] text-white/20 uppercase">
                  No data
                </div>
              ) : (
                (data?.persistence ?? []).map(
                  (p: { period?: string; pct?: number }, i: number) => (
                    <div key={p?.period ?? i} className="flex items-center gap-2 py-[2px]">
                      <span className="text-[7px] text-white/30 w-8 shrink-0 uppercase">
                        {p?.period ?? '--'}
                      </span>
                      <div className="flex-1">
                        <PersistenceBar pct={p?.pct} />
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            {/* ── Strategy Flows ── */}
            <div className="px-2 py-1.5 border-t border-border/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[7px] text-fuchsia-400/70 uppercase tracking-wider font-bold">
                  Strategy Flows
                </span>
                <span className="text-[6px] text-white/20 uppercase">Last 6 Months</span>
              </div>

              {(data?.strategyFlows ?? []).length === 0 ? (
                <div className="py-2 text-center text-[8px] text-white/20 uppercase">
                  No data
                </div>
              ) : (
                (data?.strategyFlows ?? []).map(
                  (
                    sf: { strategy?: string; flows?: StrategyFlow[]; netFlow?: number },
                    i: number
                  ) => (
                    <div
                      key={sf?.strategy ?? i}
                      className="flex items-center gap-2 py-[2px] border-b border-border/20 last:border-b-0"
                    >
                      <span className="text-[7px] text-white/40 w-16 shrink-0 truncate uppercase">
                        {sf?.strategy ?? '--'}
                      </span>
                      <div className="flex-1">
                        <FlowBars flows={sf?.flows} />
                      </div>
                      <span
                        className="text-[8px] font-bold w-12 text-right shrink-0"
                        style={{ color: retColor(sf?.netFlow) }}
                      >
                        {fmtFlowM(sf?.netFlow)}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
