import { useState, useMemo } from 'react';
import { useEquityLending } from '../../api/hooks/use-equity-lending';
import { useT } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EquityLendingData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LentSecurity = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HardToBorrow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectorBreakdown = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeeTrend = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NewLoan = any;

type TFn = ReturnType<typeof useT>;
const tr = (_t: TFn, _key: string, fallback: string): string => {
  try { return (_t as (k: string) => string)(_key) || fallback; } catch { return fallback; }
};

const ACCENT = '#fb923c'; // orange-400

type Tab = 'most-lent' | 'htb' | 'sectors' | 'trends' | 'activity';

// ── Formatting helpers ──

function fmtVal(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(0)}bp`;
}

function fmtFee(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtRevenue(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ts; }
}

// ── Color helpers ──

function utilColor(pct: number | null | undefined): string {
  if (pct == null) return 'rgba(255,255,255,0.4)';
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f97316';
  if (pct >= 50) return '#fbbf24';
  return '#22c55e';
}

function feeColor(fee: number | null | undefined): string {
  if (fee == null) return 'text-white/40';
  if (fee >= 10) return 'text-red-400';
  if (fee >= 5) return 'text-orange-400';
  if (fee >= 1) return 'text-yellow-400';
  return 'text-white/50';
}

function squeezeRiskColor(risk: string | number | null | undefined): string {
  if (risk == null) return 'text-white/30';
  if (typeof risk === 'number') {
    if (risk >= 80) return 'text-red-400';
    if (risk >= 50) return 'text-orange-400';
    if (risk >= 30) return 'text-yellow-400';
    return 'text-white/40';
  }
  const r = String(risk).toUpperCase();
  if (r === 'HIGH' || r === 'EXTREME') return 'text-red-400';
  if (r === 'MEDIUM' || r === 'ELEVATED') return 'text-orange-400';
  return 'text-white/40';
}

// ── Text sparkline ──

function sparkline(values: number[] | null | undefined): string {
  if (!values || values.length === 0) return '';
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => blocks[Math.min(Math.floor(((v - min) / range) * 7), 7)]).join('');
}

export function EquityLendingPanel() {
  const t = useT();
  const { data, isLoading, error } = useEquityLending() as {
    data: EquityLendingData;
    isLoading: boolean;
    error: unknown;
  };
  const [tab, setTab] = useState<Tab>('most-lent');
  const [sortCol, setSortCol] = useState<string>('onLoanValue');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const items = data?.mostLent || data?.securities || [];
    if (!items.length) return [];
    const arr = [...items];
    arr.sort((a: LentSecurity, b: LentSecurity) => {
      const va = a?.[sortCol] ?? 0;
      const vb = b?.[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading equity lending data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load equity lending data
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'most-lent', label: 'MOST LENT' },
    { key: 'htb', label: 'HARD TO BORROW' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'trends', label: 'FEE TRENDS' },
    { key: 'activity', label: 'NEW LOANS' },
  ];

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  const summary = data?.summary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* ── Panel title ── */}
      <div className="px-3 py-1.5 border-b border-border/20 shrink-0">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'panelEquityLending', 'EQUITY LENDING — SLMS')}
        </span>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Total On-Loan</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtVal(summary?.totalOnLoan)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Utilization Rate</div>
          <div className="text-[11px] font-mono font-black" style={{ color: utilColor(summary?.utilizationRate) }}>
            {fmtPct(summary?.utilizationRate)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg GC Fee</div>
          <div className="text-[11px] font-mono font-black text-white/70">
            {fmtFee(summary?.avgGcFee)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg Special Fee</div>
          <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
            {fmtFee(summary?.avgSpecialFee)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Daily Revenue</div>
          <div className="text-[11px] font-mono font-black text-green-400">
            {fmtRevenue(summary?.dailyRevenue)}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? 'rgba(251,146,60,0.06)' : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── Most Lent table ── */}
        {tab === 'most-lent' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="onLoanValue" label="On-Loan" right />
                <SortHeader col="utilization" label="Util%" right />
                <SortHeader col="borrowCost" label="Borrow Cost" right />
                <th className="px-2 py-1 text-right font-bold whitespace-nowrap">Type</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s: LentSecurity, i: number) => (
                <tr
                  key={s?.ticker || i}
                  className="border-b border-border/5 hover:bg-orange-400/[0.02]"
                >
                  <td className="px-2 py-1">
                    <span className="font-bold" style={{ color: ACCENT }}>{s?.ticker}</span>
                    {s?.name && <span className="text-neutral/30 ml-1.5 text-[7px]">{s.name}</span>}
                  </td>
                  <td className="px-2 py-1 text-right text-white/70 font-bold">
                    {fmtVal(s?.onLoanValue)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-16 h-2 bg-white/5 overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(s?.utilization ?? 0, 100)}%`,
                            height: '100%',
                            background: utilColor(s?.utilization),
                            opacity: 0.5,
                          }}
                        />
                      </div>
                      <span style={{ color: utilColor(s?.utilization) }}>{fmtPct(s?.utilization)}</span>
                    </div>
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${feeColor(s?.borrowCost)}`}>
                    {fmtFee(s?.borrowCost)}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <span
                      className="text-[7px] font-bold px-1 py-0"
                      style={{
                        color: s?.isSpecial ? '#ef4444' : '#22c55e',
                        background: s?.isSpecial ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                      }}
                    >
                      {s?.isSpecial ? 'SPECIAL' : 'GC'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Hard to Borrow ── */}
        {tab === 'htb' && (
          <div className="p-3 space-y-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Hard-to-Borrow — Extreme Fees & Squeeze Risk
            </div>
            {(data?.hardToBorrow || []).length === 0 && (
              <div className="text-[9px] font-mono text-neutral/30 text-center py-6">No hard-to-borrow securities</div>
            )}
            {(data?.hardToBorrow || []).map((h: HardToBorrow, i: number) => (
              <div key={h?.ticker || i} className="border border-red-400/20 bg-red-400/[0.03] p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-red-400">{h?.ticker}</span>
                    {h?.name && <span className="text-[7px] font-mono text-neutral/30">{h.name}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono font-bold text-red-400">{fmtFee(h?.fee)}</span>
                    <span className={`text-[7px] font-mono font-bold uppercase ${squeezeRiskColor(h?.squeezeRisk)}`}>
                      {typeof h?.squeezeRisk === 'number' ? `SQUEEZE ${h.squeezeRisk}/100` : h?.squeezeRisk || '-'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[8px] font-mono">
                  <div>
                    <div className="text-neutral/40">Utilization</div>
                    <div style={{ color: utilColor(h?.utilization) }} className="font-bold">{fmtPct(h?.utilization)}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">On Loan</div>
                    <div className="text-white/70">{fmtVal(h?.onLoanValue)}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Days on HTB</div>
                    <div className="text-white/60">{h?.daysOnList ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-neutral/40">Fee 1D Chg</div>
                    <div className={h?.feeChange1d > 0 ? 'text-red-400' : h?.feeChange1d < 0 ? 'text-green-400' : 'text-white/40'}>
                      {h?.feeChange1d != null ? `${h.feeChange1d > 0 ? '+' : ''}${h.feeChange1d.toFixed(2)}%` : '-'}
                    </div>
                  </div>
                </div>
                {/* Squeeze risk bar */}
                {h?.squeezeRisk != null && typeof h.squeezeRisk === 'number' && (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-white/5 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(h.squeezeRisk, 100)}%`,
                          height: '100%',
                          background: h.squeezeRisk >= 80 ? '#ef4444' : h.squeezeRisk >= 50 ? '#f97316' : h.squeezeRisk >= 30 ? '#fbbf24' : '#22c55e',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Sector Breakdown ── */}
        {tab === 'sectors' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Sector Utilization & Avg Cost
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(data?.sectors || []).map((s: SectorBreakdown, i: number) => (
                <div key={s?.sector || i} className="border border-border/20 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono font-black" style={{ color: ACCENT }}>{s?.sector}</span>
                    <span className="text-[7px] font-mono text-neutral/40">{s?.count ?? '-'} names</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
                    <div>
                      <div className="text-neutral/40">Avg Util</div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-white/5 overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(s?.avgUtilization ?? 0, 100)}%`,
                              height: '100%',
                              background: utilColor(s?.avgUtilization),
                              opacity: 0.5,
                            }}
                          />
                        </div>
                        <span className="text-white/60 w-9 text-right">{fmtPct(s?.avgUtilization)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral/40">Avg Cost</div>
                      <div className={`font-bold ${feeColor(s?.avgCost)}`}>{fmtFee(s?.avgCost)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[8px] font-mono mt-1">
                    <div>
                      <div className="text-neutral/40">On Loan</div>
                      <div className="text-white/60">{fmtVal(s?.totalOnLoan)}</div>
                    </div>
                    <div>
                      <div className="text-neutral/40">HTB Count</div>
                      <div className={s?.htbCount > 0 ? 'text-red-400 font-bold' : 'text-white/40'}>{s?.htbCount ?? 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Fee Trends (text sparklines) ── */}
        {tab === 'trends' && (
          <div className="p-3 space-y-1">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Weekly Fee Evolution — Sparklines
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Ticker</th>
                  <th className="px-2 py-1 text-right font-bold">Current</th>
                  <th className="px-2 py-1 text-right font-bold">1W Chg</th>
                  <th className="px-2 py-1 text-left font-bold pl-4">Trend</th>
                  <th className="px-2 py-1 text-right font-bold">High</th>
                  <th className="px-2 py-1 text-right font-bold">Low</th>
                </tr>
              </thead>
              <tbody>
                {(data?.feeTrends || []).map((f: FeeTrend, i: number) => {
                  const values = f?.weeklyFees || f?.values || [];
                  const current = f?.currentFee ?? values[values.length - 1] ?? null;
                  const weekStart = values[0] ?? null;
                  const change1w = current != null && weekStart != null ? current - weekStart : null;
                  const high = values.length ? Math.max(...values) : null;
                  const low = values.length ? Math.min(...values) : null;
                  return (
                    <tr key={f?.ticker || i} className="border-b border-border/5 hover:bg-orange-400/[0.02]">
                      <td className="px-2 py-1">
                        <span className="font-bold" style={{ color: ACCENT }}>{f?.ticker}</span>
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${feeColor(current)}`}>
                        {fmtFee(current)}
                      </td>
                      <td className={`px-2 py-1 text-right ${change1w != null && change1w > 0 ? 'text-red-400' : change1w != null && change1w < 0 ? 'text-green-400' : 'text-white/40'}`}>
                        {change1w != null ? `${change1w > 0 ? '+' : ''}${change1w.toFixed(2)}%` : '-'}
                      </td>
                      <td className="px-2 py-1 pl-4 text-[10px] tracking-tight" style={{ color: ACCENT }}>
                        {sparkline(values)}
                      </td>
                      <td className="px-2 py-1 text-right text-white/40">{fmtFee(high)}</td>
                      <td className="px-2 py-1 text-right text-white/40">{fmtFee(low)}</td>
                    </tr>
                  );
                })}
                {(data?.feeTrends || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-neutral/30">No fee trend data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── New Loans / Activity feed ── */}
        {tab === 'activity' && (
          <div className="p-3 space-y-1">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Recent Loan Activity
            </div>
            {(data?.newLoans || data?.recentActivity || []).length === 0 && (
              <div className="text-[9px] font-mono text-neutral/30 text-center py-6">No recent activity</div>
            )}
            {(data?.newLoans || data?.recentActivity || []).map((loan: NewLoan, i: number) => (
              <div
                key={loan?.id || i}
                className="flex items-center gap-3 px-2 py-1.5 border-b border-border/5 hover:bg-orange-400/[0.02]"
              >
                <div className="text-[8px] font-mono text-neutral/30 w-14 shrink-0">
                  {fmtTime(loan?.timestamp || loan?.time)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold" style={{ color: ACCENT }}>{loan?.ticker}</span>
                  {loan?.quantity != null && (
                    <span className="text-white/40 ml-1.5">{loan.quantity.toLocaleString()} shs</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`font-bold ${feeColor(loan?.fee)}`}>{fmtFee(loan?.fee)}</span>
                </div>
                <div className="text-right shrink-0 w-12">
                  <span
                    className="text-[7px] font-bold px-1"
                    style={{
                      color: loan?.type === 'RETURN' || loan?.type === 'RECALL' ? '#22c55e' : ACCENT,
                      background: loan?.type === 'RETURN' || loan?.type === 'RECALL' ? 'rgba(34,197,94,0.08)' : 'rgba(251,146,60,0.08)',
                    }}
                  >
                    {loan?.type || 'NEW'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
