import { Loader2 } from 'lucide-react';
import { useFreightDerivatives } from '../../api/hooks/use-freight-derivatives';
import { useT } from '../../i18n';

const ACCENT = '#38bdf8'; // sky-400

function fmtRate(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtVol(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString();
}

function rateSuffix(segment: string | undefined): string {
  if (!segment) return '';
  const s = segment.toLowerCase();
  if (s.includes('tanker') || s.includes('dirty') || s.includes('clean')) return ' WS';
  return ' $/day';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-white/40';
  if (n > 0) return 'text-bullish';
  if (n < 0) return 'text-bearish';
  return 'text-white/40';
}

function sentimentColor(sentiment: string | undefined): string {
  if (!sentiment) return 'text-white/40';
  const s = sentiment.toLowerCase();
  if (s.includes('bull') || s.includes('strong')) return 'text-bullish';
  if (s.includes('bear') || s.includes('weak')) return 'text-bearish';
  return 'text-yellow-400';
}

function seasonalColor(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'text-white/40';
  if (val > 100) return 'text-bullish';
  if (val < 100) return 'text-bearish';
  return 'text-white/40';
}

export function FreightDerivativesPanel() {
  const { data, isLoading, error } = useFreightDerivatives();
  const _t = useT();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load freight derivatives data
        </div>
      </div>
    );
  }

  const summary = data.marketSummary;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">BDI</div>
            <div className="text-[11px] font-mono font-black" style={{ color: ACCENT }}>
              {fmtVol(summary.bdiLevel)}
            </div>
            <div className={`text-[8px] font-mono ${changeColor(summary.bdiChange)}`}>
              {summary.bdiChange >= 0 ? '+' : ''}{fmtRate(summary.bdiChange)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">BDTI</div>
            <div className="text-[11px] font-mono font-black text-white/80">
              {fmtVol(summary.bdtiLevel)}
            </div>
            <div className={`text-[8px] font-mono ${changeColor(summary.bdtiChange)}`}>
              {summary.bdtiChange >= 0 ? '+' : ''}{fmtRate(summary.bdtiChange)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Most Active</div>
            <div className="text-[10px] font-mono font-bold text-white/70 truncate">
              {summary.mostActiveRoute ?? '-'}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">FFA Volume</div>
            <div className="text-[11px] font-mono font-black text-white/60">
              {fmtVol(summary.totalFFAVolume)}
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Sentiment</div>
            <div className={`text-[11px] font-mono font-black uppercase ${sentimentColor(summary.marketSentiment)}`}>
              {summary.marketSentiment ?? '-'}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* FFA Contracts */}
        {data.ffaContracts && data.ffaContracts.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                FFA Contracts
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Route</th>
                  <th className="px-2 py-1.5 text-left font-bold">Segment</th>
                  <th className="px-2 py-1.5 text-right font-bold">Current</th>
                  <th className="px-2 py-1.5 text-right font-bold">Cal1</th>
                  <th className="px-2 py-1.5 text-right font-bold">Cal2</th>
                  <th className="px-2 py-1.5 text-right font-bold">Cal3</th>
                  <th className="px-2 py-1.5 text-right font-bold">Cal4</th>
                  <th className="px-2 py-1.5 text-right font-bold">Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">Chg%</th>
                  <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                </tr>
              </thead>
              <tbody>
                {data.ffaContracts.map((c: any, i: number) => {
                  const suffix = rateSuffix(c.segment);
                  return (
                    <tr key={c.route ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.route}</td>
                      <td className="px-2 py-1.5 text-white/40">{c.segment ?? '-'}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                        {fmtRate(c.currentRate)}{suffix}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(c.cal1)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(c.cal2)}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtRate(c.cal3)}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtRate(c.cal4)}</td>
                      <td className={`px-2 py-1.5 text-right ${changeColor(c.change)}`}>
                        {c.change != null ? (c.change >= 0 ? '+' : '') + fmtRate(c.change) : '-'}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.changePercent)}`}>
                        {fmtPct(c.changePercent)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtVol(c.volume)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Route Pricing */}
        {data.routePricing && data.routePricing.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                Route Pricing
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Route</th>
                  <th className="px-2 py-1.5 text-left font-bold">Description</th>
                  <th className="px-2 py-1.5 text-left font-bold">Vessel</th>
                  <th className="px-2 py-1.5 text-right font-bold">Spot</th>
                  <th className="px-2 py-1.5 text-right font-bold">1M</th>
                  <th className="px-2 py-1.5 text-right font-bold">3M</th>
                  <th className="px-2 py-1.5 text-right font-bold">6M</th>
                  <th className="px-2 py-1.5 text-right font-bold">12M</th>
                  <th className="px-2 py-1.5 text-center font-bold">Contango</th>
                  <th className="px-2 py-1.5 text-right font-bold">Basis</th>
                </tr>
              </thead>
              <tbody>
                {data.routePricing.map((r: any, i: number) => {
                  const suffix = rateSuffix(r.vessel);
                  return (
                    <tr key={r.route ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{r.route}</td>
                      <td className="px-2 py-1.5 text-white/40 truncate max-w-[120px]">{r.description ?? '-'}</td>
                      <td className="px-2 py-1.5 text-white/50">{r.vessel ?? '-'}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                        {fmtRate(r.spotRate, 2)}{suffix}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(r.ffa1m, 2)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(r.ffa3m, 2)}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtRate(r.ffa6m, 2)}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtRate(r.ffa12m, 2)}</td>
                      <td className="px-2 py-1.5 text-center">
                        {r.contango ? (
                          <span className="text-[7px] font-mono font-bold px-1.5 py-px uppercase border border-sky-400/30 bg-sky-500/15 text-sky-400">
                            YES
                          </span>
                        ) : (
                          <span className="text-[7px] font-mono font-bold px-1.5 py-px uppercase border border-red-400/30 bg-red-500/15 text-red-400">
                            NO
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/50">{fmtRate(r.basisSpread, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Volatility Data */}
        {data.volatilityData && data.volatilityData.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                Volatility Data
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Underlying</th>
                  <th className="px-2 py-1.5 text-right font-bold">ATM 30D</th>
                  <th className="px-2 py-1.5 text-right font-bold">ATM 90D</th>
                  <th className="px-2 py-1.5 text-right font-bold">25D Skew</th>
                  <th className="px-2 py-1.5 text-right font-bold">Risk Rev</th>
                  <th className="px-2 py-1.5 text-right font-bold">Call OI</th>
                  <th className="px-2 py-1.5 text-right font-bold">Put OI</th>
                  <th className="px-2 py-1.5 text-right font-bold">P/C Ratio</th>
                  <th className="px-2 py-1.5 text-right font-bold">HV 30D</th>
                </tr>
              </thead>
              <tbody>
                {data.volatilityData.map((v: any, i: number) => (
                  <tr key={v.underlying ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{v.underlying}</td>
                    <td className="px-2 py-1.5 text-right text-white/80">{fmtRate(v.atm30d)}%</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(v.atm90d)}%</td>
                    <td className={`px-2 py-1.5 text-right ${changeColor(v.skew25d)}`}>
                      {fmtRate(v.skew25d, 2)}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${changeColor(v.riskReversal)}`}>
                      {fmtRate(v.riskReversal, 2)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtVol(v.callOI)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtVol(v.putOI)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70 font-bold">{fmtRate(v.putCallRatio, 2)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtRate(v.historicalVol30d)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Seasonal Indices */}
        {data.seasonalIndices && data.seasonalIndices.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
                Seasonal Indices
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral/50 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Month</th>
                  <th className="px-2 py-1.5 text-right font-bold">Capesize</th>
                  <th className="px-2 py-1.5 text-right font-bold">Panamax</th>
                  <th className="px-2 py-1.5 text-right font-bold">Tanker</th>
                  <th className="px-2 py-1.5 text-right font-bold">Container</th>
                </tr>
              </thead>
              <tbody>
                {data.seasonalIndices.map((s: any, i: number) => (
                  <tr key={s.month ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.month}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${seasonalColor(s.capesizeIndex)}`}>
                      {fmtRate(s.capesizeIndex)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${seasonalColor(s.panamaxIndex)}`}>
                      {fmtRate(s.panamaxIndex)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${seasonalColor(s.tankerIndex)}`}>
                      {fmtRate(s.tankerIndex)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${seasonalColor(s.containerIndex)}`}>
                      {fmtRate(s.containerIndex)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
