import { useState, useMemo } from 'react';
import { useEquityShortInterest } from '../../api/hooks/use-equity-short-interest';

const ACCENT = '#fb923c'; // orange-400
const ACCENT_DIM = 'rgba(251,146,60,0.06)';

type Tab = 'rankings' | 'squeeze' | 'sectors' | 'fees' | 'changes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any;

// -- Formatting helpers --

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtFee(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtDays(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}d`;
}

// -- Color helpers --

function siColor(pct: number | null | undefined): string {
  if (pct == null) return 'rgba(255,255,255,0.4)';
  if (pct >= 30) return '#ef4444';
  if (pct >= 20) return '#f97316';
  if (pct >= 10) return '#fbbf24';
  if (pct >= 5) return 'rgba(255,255,255,0.6)';
  return '#22c55e';
}

function siTextClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-white/40';
  if (pct >= 30) return 'text-red-400';
  if (pct >= 20) return 'text-orange-400';
  if (pct >= 10) return 'text-yellow-400';
  if (pct >= 5) return 'text-white/60';
  return 'text-green-400';
}

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

function squeezeColor(score: number | null | undefined): string {
  if (score == null) return 'rgba(255,255,255,0.3)';
  if (score >= 80) return '#ef4444';
  if (score >= 70) return '#f97316';
  if (score >= 50) return '#fbbf24';
  return '#22c55e';
}

function squeezeTextClass(score: number | null | undefined): string {
  if (score == null) return 'text-white/30';
  if (score >= 80) return 'text-red-400 font-black';
  if (score >= 70) return 'text-red-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-white/50';
}

function changeColor(val: number | null | undefined): string {
  if (val == null) return 'text-white/40';
  if (val > 0) return 'text-red-400';
  if (val < 0) return 'text-green-400';
  return 'text-white/40';
}

function feeTierColor(tier: string | null | undefined): string {
  if (!tier) return '#22c55e';
  const t = tier.toUpperCase();
  if (t === 'SPECIAL') return '#ef4444';
  if (t === 'HARD') return '#f97316';
  if (t === 'MEDIUM') return '#fbbf24';
  return '#22c55e';
}

export function EquityShortInterestPanel() {
  const { data, isLoading } = useEquityShortInterest() as {
    data: D;
    isLoading: boolean;
    refetch: () => void;
  };
  const [tab, setTab] = useState<Tab>('rankings');
  const [sortCol, setSortCol] = useState<string>('shortInterestPct');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const sortedRankings = useMemo(() => {
    const items = data?.rankings || data?.stocks || [];
    if (!items.length) return [];
    const arr = [...items];
    arr.sort((a: D, b: D) => {
      const va = a?.[sortCol] ?? 0;
      const vb = b?.[sortCol] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          No data available
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'rankings', label: 'RANKINGS' },
    { key: 'squeeze', label: 'SQUEEZE' },
    { key: 'sectors', label: 'SECTORS' },
    { key: 'fees', label: 'FEES' },
    { key: 'changes', label: 'CHANGES' },
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
      {/* -- Panel title -- */}
      <div className="px-3 py-1.5 border-b border-border/20 shrink-0">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
          EQUITY SHORT INTEREST — SI ANALYTICS
        </span>
      </div>

      {/* -- Summary cards -- */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Most Shorted</div>
            <div className="text-[11px] font-mono font-black text-red-400">
              {summary?.topSymbol || '-'}
              {summary?.topSiPct != null && (
                <span className="text-[8px] ml-1 text-red-400/70">{fmtPct(summary.topSiPct)}</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Avg SI%</div>
            <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
              {fmtPct(summary?.avgShortInterest)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Squeeze Alerts</div>
            <div className="text-[11px] font-mono font-black text-red-400">
              {summary?.squeezeAlerts ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Hard to Borrow</div>
            <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
              {summary?.hardToBorrowCount ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Total Names</div>
            <div className="text-[11px] font-mono font-black text-white/70">
              {summary?.totalCount ?? (data?.rankings || data?.stocks || []).length}
            </div>
          </div>
        </div>
      )}

      {/* -- Tab bar -- */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
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

      {/* -- Tab content -- */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* == RANKINGS tab == */}
        {tab === 'rankings' && (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
              <tr>
                <SortHeader col="ticker" label="Ticker" />
                <SortHeader col="shortInterestPct" label="SI%" right />
                <SortHeader col="daysToCover" label="DTC" right />
                <SortHeader col="utilization" label="Util%" right />
                <SortHeader col="feeRate" label="Fee" right />
                <SortHeader col="sharesShort" label="Shrs Short" right />
                <th className="px-2 py-1 text-right font-bold whitespace-nowrap">Avail</th>
              </tr>
            </thead>
            <tbody>
              {sortedRankings.map((s: D, i: number) => {
                const si = s?.shortInterestPct ?? s?.siPct ?? 0;
                const barWidth = Math.min((si / 50) * 100, 100);
                return (
                  <tr
                    key={s?.ticker || s?.symbol || i}
                    className={`border-b border-border/5 hover:bg-orange-400/[0.02] ${
                      s?.availability === 'Special' || s?.hardToBorrow ? 'bg-red-400/[0.03]' : ''
                    }`}
                  >
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: si >= 20 ? '#ef4444' : ACCENT }}>
                          {s?.ticker || s?.symbol}
                        </span>
                        {(s?.hardToBorrow || s?.availability === 'Special') && (
                          <span className="text-[6px] font-bold px-1 py-px bg-red-400/15 text-red-400 uppercase">
                            HTB
                          </span>
                        )}
                      </div>
                      {s?.name && <div className="text-[7px] text-neutral/30 truncate max-w-[100px]">{s.name}</div>}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-bold tabular-nums ${siTextClass(si)}`}>
                          {fmtPct(si)}
                        </span>
                        <div className="w-12 h-1 bg-white/5 overflow-hidden">
                          <div
                            style={{ width: `${barWidth}%`, height: '100%', background: siColor(si), opacity: 0.5 }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right text-white/60 tabular-nums">
                      {fmtDays(s?.daysToCover)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums" style={{ color: utilColor(s?.utilization) }}>
                      {fmtPct(s?.utilization)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold tabular-nums ${feeColor(s?.feeRate ?? s?.borrowRate)}`}>
                      {fmtFee(s?.feeRate ?? s?.borrowRate)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/50 tabular-nums">
                      {fmtNum(s?.sharesShort)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <span
                        className="text-[7px] font-bold px-1 py-px"
                        style={{
                          color: feeTierColor(s?.availability ?? s?.borrowTier),
                          background: `${feeTierColor(s?.availability ?? s?.borrowTier)}12`,
                        }}
                      >
                        {s?.availability || s?.borrowTier || 'Easy'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedRankings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-neutral/30">No ranking data available</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* == SQUEEZE tab == */}
        {tab === 'squeeze' && (
          <div className="p-3 space-y-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Squeeze Score Rankings — High SI + High Utilization + Rising Cost to Borrow
            </div>
            {(data?.squeezeRankings || data?.squeezeCandidates || []).length === 0 && (
              <div className="text-[9px] font-mono text-neutral/30 text-center py-6">No squeeze candidates detected</div>
            )}
            {(data?.squeezeRankings || data?.squeezeCandidates || []).map((s: D, i: number) => {
              const score = s?.squeezeScore ?? 0;
              return (
                <div
                  key={s?.ticker || s?.symbol || i}
                  className={`border p-2.5 ${
                    score >= 70 ? 'border-red-400/30 bg-red-400/[0.04]' : 'border-border/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-black ${score >= 70 ? 'text-red-400' : 'text-orange-400'}`}
                      >
                        {s?.ticker || s?.symbol}
                      </span>
                      {s?.name && <span className="text-[7px] font-mono text-neutral/30">{s.name}</span>}
                      {score >= 80 && (
                        <span className="text-[6px] font-bold px-1 py-px bg-red-400/20 text-red-400 uppercase animate-pulse">
                          ALERT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[12px] font-mono font-black tabular-nums ${squeezeTextClass(score)}`}>
                        {score}/100
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-[8px] font-mono">
                    <div>
                      <div className="text-neutral/40 uppercase">SI%</div>
                      <div className={`font-bold ${siTextClass(s?.shortInterestPct ?? s?.siPct)}`}>
                        {fmtPct(s?.shortInterestPct ?? s?.siPct)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral/40 uppercase">Util</div>
                      <div style={{ color: utilColor(s?.utilization) }} className="font-bold">
                        {fmtPct(s?.utilization)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral/40 uppercase">Fee Rate</div>
                      <div className={`font-bold ${feeColor(s?.feeRate ?? s?.borrowRate)}`}>
                        {fmtFee(s?.feeRate ?? s?.borrowRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral/40 uppercase">DTC</div>
                      <div className="text-white/60">{fmtDays(s?.daysToCover)}</div>
                    </div>
                    <div>
                      <div className="text-neutral/40 uppercase">Fee Chg</div>
                      <div className={changeColor(s?.feeChange)}>
                        {s?.feeChange != null ? `${s.feeChange > 0 ? '+' : ''}${s.feeChange.toFixed(2)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Squeeze score bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-white/5 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(score, 100)}%`,
                          height: '100%',
                          background: squeezeColor(score),
                          opacity: score >= 70 ? 0.8 : 0.5,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* == SECTORS tab == */}
        {tab === 'sectors' && (
          <div className="p-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
              Sector-Level Short Interest Aggregation
            </div>
            {(data?.sectors || []).length === 0 && (
              <div className="text-[9px] font-mono text-neutral/30 text-center py-6">No sector data available</div>
            )}
            <div className="space-y-2">
              {(data?.sectors || []).map((s: D, i: number) => {
                const avgSi = s?.avgShortInterest ?? s?.avgSiPct ?? 0;
                return (
                  <div key={s?.sector || i} className="border border-border/20 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-black" style={{ color: ACCENT }}>
                        {s?.sector}
                      </span>
                      <div className="flex items-center gap-3 text-[8px] font-mono">
                        <span className="text-neutral/40">{s?.count ?? s?.numStocks ?? '-'} names</span>
                        {(s?.htbCount ?? 0) > 0 && (
                          <span className="text-red-400 font-bold">{s.htbCount} HTB</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[8px] font-mono">
                      <div>
                        <div className="text-neutral/40 uppercase">Avg SI%</div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1.5 bg-white/5 overflow-hidden">
                            <div
                              style={{
                                width: `${Math.min((avgSi / 30) * 100, 100)}%`,
                                height: '100%',
                                background: siColor(avgSi),
                                opacity: 0.5,
                              }}
                            />
                          </div>
                          <span className={`w-9 text-right font-bold ${siTextClass(avgSi)}`}>
                            {fmtPct(avgSi)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral/40 uppercase">Avg Util</div>
                        <div style={{ color: utilColor(s?.avgUtilization) }} className="font-bold">
                          {fmtPct(s?.avgUtilization)}
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral/40 uppercase">Avg Fee</div>
                        <div className={`font-bold ${feeColor(s?.avgFeeRate ?? s?.avgBorrowRate)}`}>
                          {fmtFee(s?.avgFeeRate ?? s?.avgBorrowRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral/40 uppercase">Total Short</div>
                        <div className="text-white/60">{fmtNum(s?.totalSharesShort)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* == FEES tab == */}
        {tab === 'fees' && (
          <div className="p-3 space-y-4">
            {/* Cost tiers overview */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
                Cost to Borrow — Fee Rate Categories
              </div>
              {(data?.feeTiers || data?.costTiers || []).length === 0 && (
                <div className="text-[9px] font-mono text-neutral/30 text-center py-4">No fee tier data</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(data?.feeTiers || data?.costTiers || []).map((t: D, i: number) => {
                  const tier = t?.tier || t?.category || 'Easy';
                  const color = feeTierColor(tier);
                  return (
                    <div key={tier || i} className="border border-border/20 p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-black" style={{ color }}>
                          {tier}
                        </span>
                        <span className="text-[7px] font-mono text-neutral/40">{t?.rateRange || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[8px] font-mono">
                        <div>
                          <div className="text-neutral/40 uppercase">Securities</div>
                          <div className="text-[12px] font-bold text-white/80">{t?.count ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-neutral/40 uppercase">Avg Fee</div>
                          <div className="text-[12px] font-bold" style={{ color }}>{fmtFee(t?.avgFee ?? t?.avgRate)}</div>
                        </div>
                      </div>
                      {t?.count != null && (
                        <div className="mt-1.5 h-1.5 bg-white/5 overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min((t.count / Math.max((data?.feeTiers || data?.costTiers || []).reduce((sum: number, x: D) => sum + (x?.count ?? 0), 0), 1)) * 100, 100)}%`,
                              height: '100%',
                              background: color,
                              opacity: 0.4,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top fee names */}
            {(data?.topFees || data?.expensiveNames || []).length > 0 && (
              <div>
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
                  Highest Borrow Fees — Special Names
                </div>
                <table className="w-full text-[9px] font-mono">
                  <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/20">
                    <tr>
                      <th className="px-2 py-1 text-left font-bold">Ticker</th>
                      <th className="px-2 py-1 text-right font-bold">Fee Rate</th>
                      <th className="px-2 py-1 text-right font-bold">SI%</th>
                      <th className="px-2 py-1 text-right font-bold">Util%</th>
                      <th className="px-2 py-1 text-right font-bold">1W Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topFees || data?.expensiveNames || []).map((f: D, i: number) => (
                      <tr
                        key={f?.ticker || f?.symbol || i}
                        className="border-b border-border/5 hover:bg-orange-400/[0.02]"
                      >
                        <td className="px-2 py-1">
                          <span className="font-bold text-red-400">{f?.ticker || f?.symbol}</span>
                          {(f?.hardToBorrow || f?.isSpecial) && (
                            <span className="text-[6px] font-bold ml-1.5 px-1 py-px bg-red-400/15 text-red-400 uppercase">
                              HTB
                            </span>
                          )}
                        </td>
                        <td className={`px-2 py-1 text-right font-bold ${feeColor(f?.feeRate ?? f?.borrowRate)}`}>
                          {fmtFee(f?.feeRate ?? f?.borrowRate)}
                        </td>
                        <td className={`px-2 py-1 text-right ${siTextClass(f?.shortInterestPct ?? f?.siPct)}`}>
                          {fmtPct(f?.shortInterestPct ?? f?.siPct)}
                        </td>
                        <td className="px-2 py-1 text-right" style={{ color: utilColor(f?.utilization) }}>
                          {fmtPct(f?.utilization)}
                        </td>
                        <td className={`px-2 py-1 text-right ${changeColor(f?.feeChange1w ?? f?.weeklyChange)}`}>
                          {f?.feeChange1w != null
                            ? `${f.feeChange1w > 0 ? '+' : ''}${f.feeChange1w.toFixed(2)}%`
                            : f?.weeklyChange != null
                              ? `${f.weeklyChange > 0 ? '+' : ''}${f.weeklyChange.toFixed(2)}%`
                              : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* == CHANGES tab == */}
        {tab === 'changes' && (
          <div className="p-3 space-y-4">
            {/* Biggest increases */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
                2-Week SI Change — Biggest Increases
              </div>
              {(data?.increases || data?.biggestIncreases || []).length === 0 && (
                <div className="text-[9px] font-mono text-neutral/30 text-center py-4">No increase data</div>
              )}
              <table className="w-full text-[9px] font-mono">
                <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/20">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold">Ticker</th>
                    <th className="px-2 py-1 text-right font-bold">Current SI%</th>
                    <th className="px-2 py-1 text-right font-bold">Prior SI%</th>
                    <th className="px-2 py-1 text-right font-bold">Change</th>
                    <th className="px-2 py-1 text-right font-bold">Chg%</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.increases || data?.biggestIncreases || []).map((s: D, i: number) => {
                    const chg = s?.change ?? s?.siChange ?? 0;
                    const chgPct = s?.changePct ?? s?.siChangePct ?? null;
                    return (
                      <tr key={s?.ticker || s?.symbol || i} className="border-b border-border/5 hover:bg-red-400/[0.02]">
                        <td className="px-2 py-1">
                          <span className="font-bold text-red-400">{s?.ticker || s?.symbol}</span>
                          {s?.name && <span className="text-neutral/30 text-[7px] ml-1.5">{s.name}</span>}
                        </td>
                        <td className={`px-2 py-1 text-right font-bold ${siTextClass(s?.currentSiPct ?? s?.shortInterestPct)}`}>
                          {fmtPct(s?.currentSiPct ?? s?.shortInterestPct)}
                        </td>
                        <td className="px-2 py-1 text-right text-white/40">
                          {fmtPct(s?.priorSiPct ?? s?.previousSiPct)}
                        </td>
                        <td className="px-2 py-1 text-right text-red-400 font-bold">
                          {chg > 0 ? '+' : ''}{fmtPct(chg)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {chgPct != null ? (
                            <span className="text-red-400">
                              {chgPct > 0 ? '+' : ''}{chgPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Biggest decreases */}
            <div>
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">
                2-Week SI Change — Biggest Decreases
              </div>
              {(data?.decreases || data?.biggestDecreases || []).length === 0 && (
                <div className="text-[9px] font-mono text-neutral/30 text-center py-4">No decrease data</div>
              )}
              <table className="w-full text-[9px] font-mono">
                <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/20">
                  <tr>
                    <th className="px-2 py-1 text-left font-bold">Ticker</th>
                    <th className="px-2 py-1 text-right font-bold">Current SI%</th>
                    <th className="px-2 py-1 text-right font-bold">Prior SI%</th>
                    <th className="px-2 py-1 text-right font-bold">Change</th>
                    <th className="px-2 py-1 text-right font-bold">Chg%</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.decreases || data?.biggestDecreases || []).map((s: D, i: number) => {
                    const chg = s?.change ?? s?.siChange ?? 0;
                    const chgPct = s?.changePct ?? s?.siChangePct ?? null;
                    return (
                      <tr key={s?.ticker || s?.symbol || i} className="border-b border-border/5 hover:bg-green-400/[0.02]">
                        <td className="px-2 py-1">
                          <span className="font-bold text-green-400">{s?.ticker || s?.symbol}</span>
                          {s?.name && <span className="text-neutral/30 text-[7px] ml-1.5">{s.name}</span>}
                        </td>
                        <td className={`px-2 py-1 text-right font-bold ${siTextClass(s?.currentSiPct ?? s?.shortInterestPct)}`}>
                          {fmtPct(s?.currentSiPct ?? s?.shortInterestPct)}
                        </td>
                        <td className="px-2 py-1 text-right text-white/40">
                          {fmtPct(s?.priorSiPct ?? s?.previousSiPct)}
                        </td>
                        <td className="px-2 py-1 text-right text-green-400 font-bold">
                          {chg > 0 ? '+' : ''}{fmtPct(chg)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {chgPct != null ? (
                            <span className="text-green-400">
                              {chgPct > 0 ? '+' : ''}{chgPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
