import { useMemo } from 'react';
import { useQuantFactor } from '../../api/hooks/use-quant-factor';

// ── Constants ──

const ACCENT = '#818cf8'; // indigo-400
const ACCENT_DIM = 'rgba(129,140,248,0.08)';

// ── Color Helpers ──

function retColor(v: number): string {
  if (v > 0) return '#22c55e';
  if (v < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, d = 2): string {
  return n.toFixed(d);
}

function heatmapColor(v: number): { bg: string; text: string } {
  const clamped = Math.max(-1, Math.min(1, v));
  const abs = Math.abs(clamped);
  if (clamped > 0) {
    return {
      bg: `rgba(34,197,94,${0.08 + abs * 0.45})`,
      text: abs > 0.5 ? '#ffffff' : '#4ade80',
    };
  }
  if (clamped < 0) {
    return {
      bg: `rgba(239,68,68,${0.08 + abs * 0.45})`,
      text: abs > 0.5 ? '#ffffff' : '#f87171',
    };
  }
  return { bg: 'rgba(255,255,255,0.03)', text: '#71717a' };
}

function signalBadge(signal: string): { bg: string; text: string } {
  switch (signal) {
    case 'OW':
      return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
    case 'UW':
      return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    case 'N':
    default:
      return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
  }
}

function regimeBadgeColor(regime: string): { bg: string; text: string } {
  const r = regime?.toLowerCase() ?? '';
  if (r.includes('risk-on') || r.includes('bull') || r.includes('expansion'))
    return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
  if (r.includes('risk-off') || r.includes('bear') || r.includes('contraction'))
    return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
  if (r.includes('transition') || r.includes('rotation'))
    return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
  return { bg: 'rgba(129,140,248,0.2)', text: '#818cf8' };
}

function crowdingColor(z: number): { bg: string; text: string } {
  if (z >= 2)
    return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
  if (z >= 1.5)
    return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
  return { bg: 'transparent', text: '#71717a' };
}

// ── Main Panel ──

export function QuantFactorPanel() {
  const { data, isLoading, error } = useQuantFactor();

  const summaryBar = useMemo(() => {
    if (!data) return null;
    return data.summary ?? null;
  }, [data]);

  const riskDecomp = useMemo(() => {
    if (!data) return null;
    return data.riskDecomposition ?? null;
  }, [data]);

  const factorReturns = useMemo(() => {
    if (!data?.factorReturns) return [];
    return data.factorReturns.slice(0, 10);
  }, [data]);

  const factorExposures = useMemo(() => {
    if (!data?.factorExposures) return [];
    return data.factorExposures.slice(0, 10);
  }, [data]);

  const factorTiming = useMemo(() => {
    if (!data?.factorTiming) return [];
    return data.factorTiming.slice(0, 10);
  }, [data]);

  const sectorLoadings = useMemo(() => {
    if (!data?.sectorFactorLoadings) return [];
    return data.sectorFactorLoadings.slice(0, 11);
  }, [data]);

  const topStocks = useMemo(() => {
    if (!data?.topFactorStocks) return null;
    return data.topFactorStocks;
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div
          className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
          style={{ color: ACCENT }}
        >
          Loading quant factor model...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          Failed to load quant factor data
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Summary Bar */}
      {summaryBar && (
        <div className="flex items-center gap-0 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
          <SummaryItem label="BEST 1M" value={summaryBar.bestFactor1M?.name} sub={fmtPct(summaryBar.bestFactor1M?.return ?? 0)} color="#22c55e" />
          <SummaryItem label="WORST 1M" value={summaryBar.worstFactor1M?.name} sub={fmtPct(summaryBar.worstFactor1M?.return ?? 0)} color="#ef4444" />
          <SummaryItem label="MOMENTUM" value={summaryBar.factorMomentum} color={ACCENT} />
          {summaryBar.crowdingAlert && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-r border-border/10">
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">CROWDING</span>
              <span className="text-[8px] font-mono font-black px-1 py-[1px]" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                {summaryBar.crowdingAlert}
              </span>
            </div>
          )}
          {summaryBar.regime && (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">REGIME</span>
              {(() => {
                const rc = regimeBadgeColor(summaryBar.regime);
                return (
                  <span
                    className="text-[8px] font-mono font-black uppercase px-1 py-[1px]"
                    style={{ background: rc.bg, color: rc.text }}
                  >
                    {summaryBar.regime}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Risk Decomposition Bar */}
      {riskDecomp && (
        <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-1 px-2 py-1">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">RISK DECOMP</span>
          </div>
          <RiskItem label="MKT BETA" value={riskDecomp.marketBeta} />
          <RiskItem label="FACTOR" value={riskDecomp.factorContribution} />
          <RiskItem label="SPECIFIC" value={riskDecomp.stockSpecific} />
          <RiskItem label="TOTAL" value={riskDecomp.totalRisk} accent />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* A. Factor Returns */}
        {factorReturns.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1.5 text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 border-b border-border/10">
              Factor Returns
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider">
                <tr className="border-b border-border/10">
                  <th className="px-2 py-1 text-left font-bold">Factor</th>
                  <th className="px-1.5 py-1 text-right font-bold">1D</th>
                  <th className="px-1.5 py-1 text-right font-bold">1W</th>
                  <th className="px-1.5 py-1 text-right font-bold">1M</th>
                  <th className="px-1.5 py-1 text-right font-bold">3M</th>
                  <th className="px-1.5 py-1 text-right font-bold">YTD</th>
                  <th className="px-1.5 py-1 text-right font-bold">1Y</th>
                  <th className="px-1.5 py-1 text-right font-bold">Sharpe</th>
                  <th className="px-1.5 py-1 text-right font-bold">Max DD</th>
                  <th className="px-1.5 py-1 text-right font-bold">Vol</th>
                </tr>
              </thead>
              <tbody>
                {factorReturns.map((f: any) => (
                  <tr key={f.factor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                    <td className="px-2 py-1">
                      <span className="font-bold" style={{ color: ACCENT }}>{f.factor}</span>
                    </td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.return1d) }}>{fmtPct(f.return1d)}</td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.return1w) }}>{fmtPct(f.return1w)}</td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.return1m) }}>{fmtPct(f.return1m)}</td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.return3m) }}>{fmtPct(f.return3m)}</td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.returnYtd) }}>{fmtPct(f.returnYtd)}</td>
                    <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.return1y) }}>{fmtPct(f.return1y)}</td>
                    <td className="px-1.5 py-1 text-right">
                      <span className={f.sharpe >= 1 ? 'text-green-400' : f.sharpe < 0 ? 'text-red-400' : 'text-neutral-500'}>
                        {fmtNum(f.sharpe)}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-right text-red-400/70">{fmtPct(-Math.abs(f.maxDrawdown))}</td>
                    <td className="px-1.5 py-1 text-right text-neutral-500">{fmtNum(f.volatility, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* B. Factor Exposure */}
        {factorExposures.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1.5 text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 border-b border-border/10">
              Factor Exposure
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider">
                <tr className="border-b border-border/10">
                  <th className="px-2 py-1 text-left font-bold">Factor</th>
                  <th className="px-1.5 py-1 text-right font-bold">Long</th>
                  <th className="px-1.5 py-1 text-right font-bold">Short</th>
                  <th className="px-1.5 py-1 text-right font-bold">Spread</th>
                  <th className="px-1.5 py-1 text-right font-bold">Crowding Z</th>
                  <th className="px-1.5 py-1 text-right font-bold">Val Spread</th>
                </tr>
              </thead>
              <tbody>
                {factorExposures.map((f: any) => {
                  const cz = crowdingColor(f.crowdingZScore);
                  return (
                    <tr key={f.factor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                      <td className="px-2 py-1">
                        <span className="font-bold" style={{ color: ACCENT }}>{f.factor}</span>
                      </td>
                      <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.longReturn) }}>{fmtPct(f.longReturn)}</td>
                      <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.shortReturn) }}>{fmtPct(f.shortReturn)}</td>
                      <td className="px-1.5 py-1 text-right" style={{ color: retColor(f.spread) }}>{fmtPct(f.spread)}</td>
                      <td className="px-1.5 py-1 text-right">
                        <span
                          className="px-1 py-[1px] text-[8px] font-bold"
                          style={{ background: cz.bg, color: cz.text }}
                        >
                          {f.crowdingZScore >= 0 ? '+' : ''}{fmtNum(f.crowdingZScore)}
                          {f.crowdingZScore >= 2 ? ' !' : ''}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right text-neutral-400">{fmtNum(f.valuationSpread)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* C. Factor Timing */}
        {factorTiming.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1.5 text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 border-b border-border/10">
              Factor Timing Signals
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider">
                <tr className="border-b border-border/10">
                  <th className="px-2 py-1 text-left font-bold">Factor</th>
                  <th className="px-1.5 py-1 text-center font-bold">Signal</th>
                  <th className="px-1.5 py-1 text-left font-bold w-24">Strength</th>
                  <th className="px-1.5 py-1 text-center font-bold">Regime</th>
                  <th className="px-1.5 py-1 text-right font-bold">Z-Score</th>
                </tr>
              </thead>
              <tbody>
                {factorTiming.map((f: any) => {
                  const sig = signalBadge(f.signal);
                  const reg = regimeBadgeColor(f.regime);
                  const strengthPct = Math.max(0, Math.min(100, f.strength));
                  return (
                    <tr key={f.factor} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                      <td className="px-2 py-1">
                        <span className="font-bold" style={{ color: ACCENT }}>{f.factor}</span>
                      </td>
                      <td className="px-1.5 py-1 text-center">
                        <span
                          className="text-[8px] font-mono font-black uppercase px-1.5 py-[1px]"
                          style={{ background: sig.bg, color: sig.text }}
                        >
                          {f.signal}
                        </span>
                      </td>
                      <td className="px-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-2 bg-white/5 overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${strengthPct}%`,
                                background: strengthPct > 70 ? '#22c55e' : strengthPct > 40 ? '#eab308' : '#ef4444',
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <span className="text-[7px] text-neutral-500 w-6 text-right">{strengthPct}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-1 text-center">
                        <span
                          className="text-[7px] font-mono font-black uppercase px-1 py-[1px]"
                          style={{ background: reg.bg, color: reg.text }}
                        >
                          {f.regime}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <span className={Math.abs(f.zScore) >= 2 ? 'text-red-400 font-bold' : Math.abs(f.zScore) >= 1 ? 'text-yellow-400' : 'text-neutral-500'}>
                          {f.zScore >= 0 ? '+' : ''}{fmtNum(f.zScore)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* D. Sector Factor Loading */}
        {sectorLoadings.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-2 py-1.5 text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 border-b border-border/10">
              Sector Factor Loadings
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider">
                <tr className="border-b border-border/10">
                  <th className="px-2 py-1 text-left font-bold">Sector</th>
                  <th className="px-1.5 py-1 text-center font-bold">Value</th>
                  <th className="px-1.5 py-1 text-center font-bold">Momentum</th>
                  <th className="px-1.5 py-1 text-center font-bold">Quality</th>
                  <th className="px-1.5 py-1 text-center font-bold">Size</th>
                  <th className="px-1.5 py-1 text-center font-bold">Vol</th>
                </tr>
              </thead>
              <tbody>
                {sectorLoadings.map((s: any) => (
                  <tr key={s.sector} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                    <td className="px-2 py-1 text-neutral-300">{s.sector}</td>
                    <HeatmapCell value={s.value} />
                    <HeatmapCell value={s.momentum} />
                    <HeatmapCell value={s.quality} />
                    <HeatmapCell value={s.size} />
                    <HeatmapCell value={s.volatility} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* E. Top Factor Stocks */}
        {topStocks && (
          <div>
            <div className="px-2 py-1.5 text-[7px] font-black font-mono uppercase tracking-widest text-neutral-500 border-b border-border/10">
              Top Factor Stocks
            </div>
            <div className="grid grid-cols-3 gap-0">
              <TopStockColumn title="VALUE" stocks={topStocks.value} />
              <TopStockColumn title="MOMENTUM" stocks={topStocks.momentum} />
              <TopStockColumn title="QUALITY" stocks={topStocks.quality} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-Components ──

function SummaryItem({ label, value, sub, color }: { label: string; value?: string; sub?: string; color?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-r border-border/10 shrink-0">
      <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{label}</span>
      <span className="text-[8px] font-mono font-black uppercase" style={{ color: color ?? '#a1a1aa' }}>
        {value}
      </span>
      {sub && (
        <span className="text-[7px] font-mono" style={{ color: color ?? '#71717a' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function RiskItem({ label, value, accent }: { label: string; value?: number; accent?: boolean }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-r border-border/10">
      <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{label}</span>
      <span
        className="text-[8px] font-mono font-black tabular-nums"
        style={{ color: accent ? ACCENT : '#d4d4d8' }}
      >
        {fmtNum(value, 1)}%
      </span>
    </div>
  );
}

function HeatmapCell({ value }: { value: number }) {
  const { bg, text } = heatmapColor(value);
  return (
    <td className="px-1.5 py-1 text-center">
      <span
        className="inline-block px-1.5 py-[1px] text-[8px] font-mono font-bold tabular-nums"
        style={{ background: bg, color: text }}
      >
        {value >= 0 ? '+' : ''}{fmtNum(value)}
      </span>
    </td>
  );
}

function TopStockColumn({ title, stocks }: { title: string; stocks?: any[] }) {
  if (!stocks || stocks.length === 0) return <div className="border-r border-border/10" />;
  return (
    <div className="border-r border-border/10 last:border-r-0">
      <div
        className="px-2 py-1 text-[7px] font-mono font-black uppercase tracking-wider border-b border-border/10"
        style={{ color: ACCENT, background: ACCENT_DIM }}
      >
        {title}
      </div>
      {stocks.slice(0, 5).map((s: any, i: number) => (
        <div
          key={s.ticker ?? i}
          className="flex items-center justify-between px-2 py-1 border-b border-border/5 hover:bg-indigo-400/[0.02]"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-neutral-500 w-3">{i + 1}</span>
            <span className="text-[9px] font-mono font-bold text-neutral-200">{s.ticker}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-neutral-400 tabular-nums">
              {fmtNum(s.factorScore)}
            </span>
            <span
              className="text-[8px] font-mono font-bold tabular-nums"
              style={{ color: retColor(s.return1m) }}
            >
              {fmtPct(s.return1m)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
