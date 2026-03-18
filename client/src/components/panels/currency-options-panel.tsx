import { useState, useMemo } from 'react';
import { useCurrencyOptions } from '../../api/hooks/use-currency-options';
import { useT } from '../../i18n';

const ACCENT = '#818cf8'; // indigo-400
const ACCENT_DIM = 'rgba(129,140,248,0.08)';

type Tab = 'volSurface' | 'riskReversal' | 'butterfly' | 'termStructure' | 'ranking' | 'events';

// ── Color helpers ──

function volHeatColor(vol: number, min: number, max: number): string {
  const range = max - min || 1;
  const ratio = Math.max(0, Math.min(1, (vol - min) / range));
  if (ratio < 0.25) return '#22c55e';
  if (ratio < 0.5) return '#a3e635';
  if (ratio < 0.75) return '#f59e0b';
  return '#ef4444';
}

function volHeatBg(vol: number, min: number, max: number): string {
  const range = max - min || 1;
  const ratio = Math.max(0, Math.min(1, (vol - min) / range));
  if (ratio < 0.25) return 'rgba(34,197,94,0.12)';
  if (ratio < 0.5) return 'rgba(163,230,53,0.10)';
  if (ratio < 0.75) return 'rgba(245,158,11,0.10)';
  return 'rgba(239,68,68,0.12)';
}

function regimeBadge(regime: string): { bg: string; text: string } {
  switch (regime?.toLowerCase()) {
    case 'low': return { bg: 'bg-green-500/15', text: 'text-green-400' };
    case 'normal': return { bg: 'bg-blue-500/15', text: 'text-blue-400' };
    case 'elevated': return { bg: 'bg-yellow-500/15', text: 'text-yellow-400' };
    case 'high': return { bg: 'bg-red-500/15', text: 'text-red-400' };
    default: return { bg: 'bg-neutral-500/15', text: 'text-neutral/50' };
  }
}

export function CurrencyOptionsPanel() {
  const { data, isLoading, error } = useCurrencyOptions();
  const d = data as any;
  const t = useT();
  const [tab, setTab] = useState<Tab>('volSurface');
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  const pairs: any[] = useMemo(() => d?.pairs ?? [], [d]);
  const activePair = useMemo(() => {
    if (!pairs.length) return null;
    return pairs.find((p: any) => p.id === selectedPair) ?? pairs[0];
  }, [pairs, selectedPair]);

  if (isLoading) return (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">{t('loading')}</div>
    </div>
  );

  if (error || !d) return (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="text-[9px] font-mono text-bearish/60 uppercase tracking-widest">FAILED TO LOAD</div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'volSurface', label: 'VOL SURFACE' },
    { key: 'riskReversal', label: 'RISK REVERSAL' },
    { key: 'butterfly', label: 'BUTTERFLY' },
    { key: 'termStructure', label: 'ATM TERM' },
    { key: 'ranking', label: 'VOL RANK' },
    { key: 'events', label: 'EVENTS' },
  ];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="px-2.5 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: tab === tb.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tb.label}
          </button>
        ))}
        <div className="flex-1" />
        {d.summary && (
          <div className="px-3 text-[8px] font-mono text-neutral/25">
            G10 Avg: {d.summary.avgG10Vol}% | EM Avg: {d.summary.avgEMVol}%
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* ────────────────── VOL SURFACE ────────────────── */}
        {tab === 'volSurface' && (() => {
          const allVols: number[] = [];
          pairs.forEach((p: any) => {
            p.volSurface?.forEach((row: any) => {
              Object.values(row.deltas ?? {}).forEach((v: any) => {
                if (typeof v === 'number') allVols.push(v);
              });
              if (typeof row.atmVol === 'number') allVols.push(row.atmVol);
            });
          });
          const globalMin = allVols.length ? Math.min(...allVols) : 0;
          const globalMax = allVols.length ? Math.max(...allVols) : 30;

          return (
            <div className="p-2 space-y-3">
              {/* Pair selector pills */}
              <div className="flex items-center gap-1 flex-wrap">
                {pairs.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPair(p.id)}
                    className="px-2 py-1 text-[8px] font-mono font-bold uppercase transition-colors"
                    style={{
                      color: (activePair?.id === p.id) ? ACCENT : 'rgba(255,255,255,0.3)',
                      background: (activePair?.id === p.id) ? ACCENT_DIM : 'transparent',
                    }}
                  >
                    {p.id}
                  </button>
                ))}
              </div>

              {activePair && (
                <>
                  <div className="text-[8px] font-mono text-neutral/40 uppercase">
                    Vol Surface — {activePair.id} {activePair.name ? `(${activePair.name})` : ''} | Spot: {activePair.spot}
                  </div>

                  {/* Heat-mapped grid: tenors x deltas */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[8px] font-mono">
                      <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                        <tr>
                          <th className="px-1.5 py-1 text-left">Tenor</th>
                          <th className="px-1.5 py-1 text-right">10P</th>
                          <th className="px-1.5 py-1 text-right">25P</th>
                          <th className="px-1.5 py-1 text-right font-black">ATM</th>
                          <th className="px-1.5 py-1 text-right">25C</th>
                          <th className="px-1.5 py-1 text-right">10C</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePair.volSurface?.map((row: any) => {
                          const deltas = row.deltas ?? {};
                          const cells = [deltas['10P'], deltas['25P'], row.atmVol, deltas['25C'], deltas['10C']];
                          return (
                            <tr key={row.tenor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                              <td className="px-1.5 py-1 font-bold" style={{ color: ACCENT }}>{row.tenor}</td>
                              {cells.map((v: any, ci: number) => (
                                <td
                                  key={ci}
                                  className="px-1.5 py-1 text-right"
                                  style={{
                                    color: typeof v === 'number' ? volHeatColor(v, globalMin, globalMax) : 'rgba(255,255,255,0.25)',
                                    background: typeof v === 'number' ? volHeatBg(v, globalMin, globalMax) : 'transparent',
                                    fontWeight: ci === 2 ? 700 : 400,
                                  }}
                                >
                                  {typeof v === 'number' ? `${v.toFixed(2)}` : '-'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mini color legend */}
                  <div className="flex items-center gap-2 text-[7px] font-mono text-neutral/30">
                    <span>Low</span>
                    <div className="flex h-2 flex-1 max-w-[120px]">
                      <div className="flex-1" style={{ background: '#22c55e' }} />
                      <div className="flex-1" style={{ background: '#a3e635' }} />
                      <div className="flex-1" style={{ background: '#f59e0b' }} />
                      <div className="flex-1" style={{ background: '#ef4444' }} />
                    </div>
                    <span>High</span>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ────────────────── RISK REVERSALS ────────────────── */}
        {tab === 'riskReversal' && (
          <div className="p-2 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">25D / 10D Risk Reversals by Tenor</div>
            {pairs.map((p: any) => (
              <div key={p.id} className="border border-border/10 p-2">
                <div className="text-[9px] font-mono font-black mb-1.5" style={{ color: ACCENT }}>{p.id}</div>
                <table className="w-full text-[8px] font-mono">
                  <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                    <tr>
                      <th className="px-1.5 py-1 text-left">Tenor</th>
                      <th className="px-1.5 py-1 text-right">25D RR</th>
                      <th className="px-1.5 py-1 text-right">10D RR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(p.volSurface ?? p.volMatrix)?.map((row: any) => {
                      const rr25 = row.rr25 ?? (row.deltas?.['25C'] != null && row.deltas?.['25P'] != null ? +(row.deltas['25C'] - row.deltas['25P']).toFixed(2) : null);
                      const rr10 = row.rr10 ?? (row.deltas?.['10C'] != null && row.deltas?.['10P'] != null ? +(row.deltas['10C'] - row.deltas['10P']).toFixed(2) : null);
                      return (
                        <tr key={row.tenor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                          <td className="px-1.5 py-1 text-white/50">{row.tenor}</td>
                          <td className={`px-1.5 py-1 text-right font-bold ${rr25 != null ? (rr25 >= 0 ? 'text-bullish' : 'text-bearish') : 'text-neutral/25'}`}>
                            {rr25 != null ? `${rr25 >= 0 ? '+' : ''}${rr25.toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-1.5 py-1 text-right font-bold ${rr10 != null ? (rr10 >= 0 ? 'text-bullish' : 'text-bearish') : 'text-neutral/25'}`}>
                            {rr10 != null ? `${rr10 >= 0 ? '+' : ''}${rr10.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ────────────────── BUTTERFLY SPREADS ────────────────── */}
        {tab === 'butterfly' && (
          <div className="p-2 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">25D / 10D Butterfly (Smile Curvature)</div>
            {pairs.map((p: any) => {
              const rows = p.volSurface ?? p.volMatrix ?? [];
              const maxBf = Math.max(1, ...rows.map((r: any) => Math.abs(r.bf25 ?? 0)));
              return (
                <div key={p.id} className="border border-border/10 p-2">
                  <div className="text-[9px] font-mono font-black mb-1.5" style={{ color: ACCENT }}>{p.id}</div>
                  <table className="w-full text-[8px] font-mono">
                    <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                      <tr>
                        <th className="px-1.5 py-1 text-left">Tenor</th>
                        <th className="px-1.5 py-1 text-right">25D BF</th>
                        <th className="px-1.5 py-1 text-right">10D BF</th>
                        <th className="px-1.5 py-1 text-left w-24">25D BF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any) => {
                        const bf25 = row.bf25 ?? (row.deltas?.['25C'] != null && row.deltas?.['25P'] != null && row.atmVol != null
                          ? +((row.deltas['25C'] + row.deltas['25P']) / 2 - row.atmVol).toFixed(2) : null);
                        const bf10 = row.bf10 ?? (row.deltas?.['10C'] != null && row.deltas?.['10P'] != null && row.atmVol != null
                          ? +((row.deltas['10C'] + row.deltas['10P']) / 2 - row.atmVol).toFixed(2) : null);
                        const barW = bf25 != null ? Math.max(4, (Math.abs(bf25) / maxBf) * 100) : 0;
                        return (
                          <tr key={row.tenor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                            <td className="px-1.5 py-1 text-white/50">{row.tenor}</td>
                            <td className="px-1.5 py-1 text-right text-white/70 font-bold">
                              {bf25 != null ? bf25.toFixed(2) : '-'}
                            </td>
                            <td className="px-1.5 py-1 text-right text-white/50">
                              {bf10 != null ? bf10.toFixed(2) : '-'}
                            </td>
                            <td className="px-1.5 py-1">
                              {bf25 != null && (
                                <div className="h-2 relative">
                                  <div
                                    className="absolute top-0 left-0 h-full"
                                    style={{ width: `${barW}%`, background: ACCENT, opacity: 0.45 }}
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ────────────────── ATM TERM STRUCTURE ────────────────── */}
        {tab === 'termStructure' && (
          <div className="p-2 space-y-3">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-1">ATM Implied Vol by Tenor</div>
            {pairs.map((p: any) => {
              const rows = p.volSurface ?? p.volMatrix ?? [];
              const atmVals = rows.map((r: any) => r.atmVol).filter((v: any) => typeof v === 'number');
              const maxAtm = Math.max(1, ...atmVals);
              const minAtm = Math.min(0, ...atmVals);
              return (
                <div key={p.id} className="border border-border/10 p-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono font-black" style={{ color: ACCENT }}>{p.id}</span>
                    <span className="text-[7px] font-mono text-neutral/30">Spot: {p.spot}</span>
                  </div>
                  <table className="w-full text-[8px] font-mono">
                    <thead className="text-neutral/50 uppercase tracking-wider border-b border-border/10">
                      <tr>
                        <th className="px-1.5 py-1 text-left">Tenor</th>
                        <th className="px-1.5 py-1 text-right">ATM Vol</th>
                        <th className="px-1.5 py-1 text-right">1D Chg</th>
                        <th className="px-1.5 py-1 text-right">1W Chg</th>
                        <th className="px-1.5 py-1 text-left w-20">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any) => {
                        const atm = row.atmVol;
                        const chg1d = row.change1d ?? row.atmChange1d;
                        const chg1w = row.change1w ?? row.atmChange1w;
                        const barW = typeof atm === 'number' ? Math.max(5, ((atm - minAtm) / (maxAtm - minAtm || 1)) * 100) : 0;
                        return (
                          <tr key={row.tenor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                            <td className="px-1.5 py-1 font-bold" style={{ color: ACCENT }}>{row.tenor}</td>
                            <td className="px-1.5 py-1 text-right text-white/80 font-bold">
                              {typeof atm === 'number' ? atm.toFixed(2) : '-'}
                            </td>
                            <td className={`px-1.5 py-1 text-right ${chg1d != null ? (chg1d >= 0 ? 'text-bearish' : 'text-bullish') : 'text-neutral/25'}`}>
                              {chg1d != null ? `${chg1d >= 0 ? '+' : ''}${chg1d.toFixed(2)}` : '-'}
                            </td>
                            <td className={`px-1.5 py-1 text-right ${chg1w != null ? (chg1w >= 0 ? 'text-bearish' : 'text-bullish') : 'text-neutral/25'}`}>
                              {chg1w != null ? `${chg1w >= 0 ? '+' : ''}${chg1w.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-1.5 py-1">
                              <div className="h-2 relative">
                                <div
                                  className="absolute top-0 left-0 h-full"
                                  style={{ width: `${barW}%`, background: ACCENT, opacity: 0.4 }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ────────────────── VOL RANKING ────────────────── */}
        {tab === 'ranking' && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">All Pairs Ranked by 1M ATM Vol</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-1.5 py-1 text-left">#</th>
                  <th className="px-1.5 py-1 text-left">Pair</th>
                  <th className="px-1.5 py-1 text-right">1M ATM</th>
                  <th className="px-1.5 py-1 text-right">Pctile</th>
                  <th className="px-1.5 py-1 text-left">Regime</th>
                  <th className="px-1.5 py-1 text-left w-20">Pctile</th>
                </tr>
              </thead>
              <tbody>
                {(d.volRanking ?? [...pairs].sort((a: any, b: any) => (b.atm1m ?? b.atmVol1m ?? 0) - (a.atm1m ?? a.atmVol1m ?? 0)))
                  .map((r: any, idx: number) => {
                    const atm = r.atm1m ?? r.atmVol1m ?? r.vol1m;
                    const pctile = r.percentile ?? r.pctile;
                    const regime = r.regime ?? 'normal';
                    const badge = regimeBadge(regime);
                    const barW = pctile != null ? Math.max(3, pctile) : 0;
                    return (
                      <tr key={r.id ?? r.pair ?? idx} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                        <td className="px-1.5 py-1 text-neutral/30">{idx + 1}</td>
                        <td className="px-1.5 py-1 font-bold" style={{ color: ACCENT }}>{r.id ?? r.pair}</td>
                        <td className="px-1.5 py-1 text-right text-white/80 font-bold">
                          {typeof atm === 'number' ? atm.toFixed(2) : '-'}
                        </td>
                        <td className="px-1.5 py-1 text-right text-white/60">
                          {pctile != null ? `${pctile}%` : '-'}
                        </td>
                        <td className="px-1.5 py-1">
                          <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 ${badge.bg} ${badge.text}`}>
                            {regime}
                          </span>
                        </td>
                        <td className="px-1.5 py-1">
                          <div className="h-2 relative bg-white/[0.03]">
                            <div
                              className="absolute top-0 left-0 h-full"
                              style={{
                                width: `${barW}%`,
                                background: pctile != null && pctile > 80 ? '#ef4444' : pctile != null && pctile > 60 ? '#f59e0b' : ACCENT,
                                opacity: 0.5,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* ────────────────── EVENT CALENDAR ────────────────── */}
        {tab === 'events' && (
          <div className="p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase mb-2">Upcoming Events with Expected Vol Impact</div>
            <table className="w-full text-[8px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-1.5 py-1 text-left">Date</th>
                  <th className="px-1.5 py-1 text-left">Event</th>
                  <th className="px-1.5 py-1 text-left">Pairs</th>
                  <th className="px-1.5 py-1 text-right">Impact</th>
                  <th className="px-1.5 py-1 text-right">Exp Move</th>
                </tr>
              </thead>
              <tbody>
                {(d.events ?? d.eventCalendar ?? []).map((ev: any, idx: number) => {
                  const impactColor = (ev.impact ?? '').toLowerCase() === 'high'
                    ? 'text-red-400' : (ev.impact ?? '').toLowerCase() === 'medium'
                    ? 'text-yellow-400' : 'text-green-400';
                  return (
                    <tr key={idx} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                      <td className="px-1.5 py-1 text-white/50 whitespace-nowrap">{ev.date}</td>
                      <td className="px-1.5 py-1 text-white/80">{ev.event ?? ev.name}</td>
                      <td className="px-1.5 py-1">
                        <div className="flex gap-1 flex-wrap">
                          {(ev.pairs ?? ev.affectedPairs ?? [ev.pair]).filter(Boolean).map((pair: string, pi: number) => (
                            <span key={pi} className="text-[7px] font-bold px-1 py-0" style={{ color: ACCENT, background: ACCENT_DIM }}>{pair}</span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-1.5 py-1 text-right font-bold uppercase ${impactColor}`}>{ev.impact ?? '-'}</td>
                      <td className="px-1.5 py-1 text-right text-white/60">{ev.expectedMove ?? ev.expMove ?? '-'}</td>
                    </tr>
                  );
                })}
                {!(d.events ?? d.eventCalendar ?? []).length && (
                  <tr>
                    <td colSpan={5} className="px-1.5 py-4 text-center text-neutral/25">No upcoming events</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
