import { Loader2 } from 'lucide-react';
import { useWeatherDerivatives } from '../../api/hooks/use-weather-derivatives';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (_t: TFn, _key: string, fallback: string): string => {
  try { return (_t as (k: string) => string)(_key) || fallback; } catch { return fallback; }
};

const ACCENT = '#2dd4bf'; // teal-400

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtLargeNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function statusBadge(status: string): { text: string; bg: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'active') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (s === 'quoted') return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (s === 'expired') return { text: 'text-zinc-500', bg: 'bg-zinc-500/15 border-zinc-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

export function WeatherDerivativesPanel() {
  const t = useT();
  const { data, isLoading, error } = useWeatherDerivatives();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load weather derivatives data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Market Summary Bar */}
      {data.marketSummary && (
        <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
          <SummaryItem label="Total Contracts" value={fmtLargeNum(data.marketSummary.totalContracts)} />
          <SummaryItem label="Total Volume" value={fmtLargeNum(data.marketSummary.totalVolume)} />
          <SummaryItem label="Total OI" value={fmtLargeNum(data.marketSummary.totalOpenInterest)} />
          <SummaryItem
            label="Avg HDD Premium"
            value={fmtNum(data.marketSummary.avgHddPremium)}
            color={ACCENT}
          />
          <SummaryItem
            label="Avg CDD Premium"
            value={fmtNum(data.marketSummary.avgCddPremium)}
            color={ACCENT}
          />
          <SummaryItem
            label="Mkt Change"
            value={`${data.marketSummary.marketChange >= 0 ? '+' : ''}${fmtPct(data.marketSummary.marketChange)}`}
            color={data.marketSummary.marketChange >= 0 ? '#4ade80' : '#f87171'}
          />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* HDD/CDD Contracts */}
        {data.hddCddContracts && data.hddCddContracts.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                HDD / CDD Contracts
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">City</th>
                  <th className="px-2 py-1.5 text-left font-bold">Type</th>
                  <th className="px-2 py-1.5 text-left font-bold">Month</th>
                  <th className="px-2 py-1.5 text-right font-bold">Strike</th>
                  <th className="px-2 py-1.5 text-right font-bold">Last</th>
                  <th className="px-2 py-1.5 text-right font-bold">Chg</th>
                  <th className="px-2 py-1.5 text-right font-bold">Chg%</th>
                  <th className="px-2 py-1.5 text-right font-bold">Volume</th>
                  <th className="px-2 py-1.5 text-right font-bold">OI</th>
                  <th className="px-2 py-1.5 text-right font-bold">Impl Temp</th>
                </tr>
              </thead>
              <tbody>
                {data.hddCddContracts.map((c: any, i: number) => (
                  <tr key={`${c.city}-${c.type}-${c.month}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.city}</td>
                    <td className="px-2 py-1.5 text-white/60">{c.type}</td>
                    <td className="px-2 py-1.5 text-white/60">{c.month}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(c.strike)}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(c.last)}</td>
                    <td className={`px-2 py-1.5 text-right ${changeColor(c.change)}`}>
                      {c.change >= 0 ? '+' : ''}{fmtNum(c.change)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.changePercent)}`}>
                      {c.changePercent >= 0 ? '+' : ''}{fmtPct(c.changePercent)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtLargeNum(c.volume)}</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{fmtLargeNum(c.openInterest)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(c.impliedTemp, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* City Pricing */}
        {data.cityPricing && data.cityPricing.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                City Pricing
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">City</th>
                  <th className="px-2 py-1.5 text-right font-bold">Curr Temp</th>
                  <th className="px-2 py-1.5 text-right font-bold">Normal</th>
                  <th className="px-2 py-1.5 text-right font-bold">Deviation</th>
                  <th className="px-2 py-1.5 text-right font-bold">HDD Prem</th>
                  <th className="px-2 py-1.5 text-right font-bold">CDD Prem</th>
                  <th className="px-2 py-1.5 text-right font-bold">Vol</th>
                  <th className="px-2 py-1.5 text-right font-bold">Corr</th>
                </tr>
              </thead>
              <tbody>
                {data.cityPricing.map((c: any, i: number) => (
                  <tr key={`${c.city}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{c.city}</td>
                    <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtNum(c.currentTemp, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(c.normalTemp, 1)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(c.deviation)}`}>
                      {c.deviation >= 0 ? '+' : ''}{fmtNum(c.deviation, 1)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(c.hddPremium)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(c.cddPremium)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtPct(c.volatility)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtNum(c.correlation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Seasonal Patterns */}
        {data.seasonalPatterns && data.seasonalPatterns.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Seasonal Patterns
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Month</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg HDD</th>
                  <th className="px-2 py-1.5 text-right font-bold">Avg CDD</th>
                  <th className="px-2 py-1.5 text-right font-bold">Max Dev</th>
                  <th className="px-2 py-1.5 text-right font-bold">Curr Dev</th>
                  <th className="px-2 py-1.5 text-right font-bold">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {data.seasonalPatterns.map((s: any, i: number) => (
                  <tr key={`${s.month}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
                    <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{s.month}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(s.avgHDD, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">{fmtNum(s.avgCDD, 1)}</td>
                    <td className="px-2 py-1.5 text-right text-white/50">{fmtNum(s.maxDeviation, 1)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${changeColor(s.currentDeviation)}`}>
                      {s.currentDeviation >= 0 ? '+' : ''}{fmtNum(s.currentDeviation, 1)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/60">{fmtPct(s.percentile, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hedging Strategies */}
        {data.hedgingStrategies && data.hedgingStrategies.length > 0 && (
          <div>
            <div className="px-3 py-1.5 border-b border-border/20">
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                Hedging Strategies
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Strategy</th>
                  <th className="px-2 py-1.5 text-right font-bold">Notional</th>
                  <th className="px-2 py-1.5 text-right font-bold">Premium</th>
                  <th className="px-2 py-1.5 text-right font-bold">Max Payout</th>
                  <th className="px-2 py-1.5 text-right font-bold">Breakeven</th>
                  <th className="px-2 py-1.5 text-right font-bold">Days Exp</th>
                  <th className="px-2 py-1.5 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.hedgingStrategies.map((h: any, i: number) => {
                  const badge = statusBadge(h.status);
                  return (
                    <tr key={`${h.strategy}-${i}`} className="border-b border-border/5 hover:bg-teal-400/[0.02]">
                      <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{h.strategy}</td>
                      <td className="px-2 py-1.5 text-right text-white/70">{fmtLargeNum(h.notional)}</td>
                      <td className="px-2 py-1.5 text-right text-white/70">{fmtLargeNum(h.premium)}</td>
                      <td className="px-2 py-1.5 text-right text-white/70">{fmtLargeNum(h.maxPayout)}</td>
                      <td className="px-2 py-1.5 text-right text-white/60">{fmtNum(h.breakeven)}</td>
                      <td className="px-2 py-1.5 text-right text-white/50">{h.daysToExpiry}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase border ${badge.text} ${badge.bg}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 min-w-0 px-2">
      <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">{label}</div>
      <div className="text-[11px] font-mono font-black truncate" style={{ color: color ?? 'rgba(255,255,255,0.8)' }}>
        {value}
      </div>
    </div>
  );
}
