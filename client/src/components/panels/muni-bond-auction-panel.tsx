import { Loader2 } from 'lucide-react';
import { useMuniBondAuction } from '../../api/hooks/use-muni-bond-auction';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#818cf8'; // indigo-400

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}M`;
}

function fmtBillions(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingBadge(rating: string | null | undefined): { text: string; bg: string } {
  if (!rating) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const r = rating.toUpperCase();
  if (r === 'AAA' || r === 'AA+') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (r === 'AA' || r === 'AA-') return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (r === 'A+') return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function failureTypeBadge(type: string | null | undefined): { text: string; bg: string } {
  if (!type) return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
  const t = type.toLowerCase();
  if (t === 'failed') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  if (t === 'near-fail') return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  if (t === 'repriced') return { text: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

// ── Main Panel ──

export function MuniBondAuctionPanel() {
  const t = useT();
  const { data, isLoading, error } = useMuniBondAuction();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load municipal bond auction data')}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Market Summary Bar */}
        {data.marketSummary && (
          <div className="flex items-center gap-0 border-b border-border/20 px-3 py-2 shrink-0">
            <SummaryItem label="SIFMA Rate" value={fmtPct(data.marketSummary.sifmaRate)} color={ACCENT} />
            <SummaryItem label="Weekly Chg" value={fmtBps(data.marketSummary.weeklyChange)} valueColor={changeColor(data.marketSummary.weeklyChange)} />
            <SummaryItem label="Total Pending" value={fmtBillions(data.marketSummary.totalPending)} />
            <SummaryItem label="Avg Bid/Cover" value={fmtNum(data.marketSummary.avgBidToCover)}  color={ACCENT} />
            <SummaryItem label="Fail Rate" value={fmtPct(data.marketSummary.failRate)} />
            <SummaryItem label="Most Active" value={data.marketSummary.mostActiveState ?? '-'} />
          </div>
        )}

        {/* Recent Auctions Table */}
        {data.recentAuctions && data.recentAuctions.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'mba.recentAuctions', 'Recent Auctions')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Issuer</th>
                  <th className="px-2 py-1 text-right font-bold">Amt ($M)</th>
                  <th className="px-2 py-1 text-right font-bold">Coupon</th>
                  <th className="px-2 py-1 text-right font-bold">Yield</th>
                  <th className="px-2 py-1 text-right font-bold">Bid/Cover</th>
                  <th className="px-2 py-1 text-right font-bold">Spread</th>
                  <th className="px-2 py-1 text-center font-bold">Rating</th>
                  <th className="px-2 py-1 text-right font-bold">Maturity</th>
                  <th className="px-2 py-1 text-right font-bold">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAuctions.map((a: any, i: number) => {
                  const rb = ratingBadge(a.rating);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                      <td className="px-2 py-1 text-left">
                        <span className="font-bold text-white truncate">{a.issuer}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtMoney(a.amount)}</td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtPct(a.coupon)}</td>
                      <td className="px-2 py-1 text-right" style={{ color: ACCENT }}>{fmtPct(a.yield)}</td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtNum(a.bidToCover)}</td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtBps(a.spread)}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${rb.text} ${rb.bg}`}>
                          {a.rating ?? '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right text-white/50">{a.maturity ?? '-'}</td>
                      <td className="px-2 py-1 text-right text-white/40">{a.type ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VRDO Rates Table */}
        {data.vrdoRates && data.vrdoRates.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'mba.vrdoRates', 'VRDO Rates')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Name</th>
                  <th className="px-2 py-1 text-right font-bold">Rate</th>
                  <th className="px-2 py-1 text-right font-bold">Prior Wk</th>
                  <th className="px-2 py-1 text-right font-bold">Change</th>
                  <th className="px-2 py-1 text-right font-bold">Wkly Avg</th>
                  <th className="px-2 py-1 text-right font-bold">Mthly Avg</th>
                  <th className="px-2 py-1 text-right font-bold">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {data.vrdoRates.map((v: any, i: number) => (
                  <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                    <td className="px-2 py-1 text-left font-bold text-white">{v.name}</td>
                    <td className="px-2 py-1 text-right" style={{ color: ACCENT }}>{fmtPct(v.rate)}</td>
                    <td className="px-2 py-1 text-right text-white/60">{fmtPct(v.priorWeek)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${changeColor(v.change)}`}>
                      {fmtBps(v.change)}
                    </td>
                    <td className="px-2 py-1 text-right text-white/50">{fmtPct(v.weeklyAvg)}</td>
                    <td className="px-2 py-1 text-right text-white/50">{fmtPct(v.monthlyAvg)}</td>
                    <td className="px-2 py-1 text-right text-white/60">{fmtNum(v.ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Failed Auctions Table */}
        {data.failedAuctions && data.failedAuctions.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'mba.failedAuctions', 'Failed Auctions')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Issuer</th>
                  <th className="px-2 py-1 text-right font-bold">Amount</th>
                  <th className="px-2 py-1 text-right font-bold">Sched Date</th>
                  <th className="px-2 py-1 text-center font-bold">Failure Type</th>
                  <th className="px-2 py-1 text-right font-bold">Orig Yield</th>
                  <th className="px-2 py-1 text-right font-bold">Reset Yield</th>
                  <th className="px-2 py-1 text-right font-bold">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {data.failedAuctions.map((f: any, i: number) => {
                  const fb = failureTypeBadge(f.failureType);
                  return (
                    <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                      <td className="px-2 py-1 text-left font-bold text-white">{f.issuer}</td>
                      <td className="px-2 py-1 text-right text-white/80">{fmtMoney(f.amount)}</td>
                      <td className="px-2 py-1 text-right text-white/50">{f.scheduledDate ?? '-'}</td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold px-1 py-px border ${fb.text} ${fb.bg}`}>
                          {f.failureType ?? '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right text-white/60">{fmtPct(f.originalYield)}</td>
                      <td className="px-2 py-1 text-right text-red-400 font-bold">{fmtPct(f.resetYield)}</td>
                      <td className="px-2 py-1 text-right text-red-400">{fmtPct(f.penalty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rate Trends Table */}
        {data.rateTrends && data.rateTrends.length > 0 && (
          <div className="border-b border-border/20">
            <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
              <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
                {tr(t, 'mba.rateTrends', 'Rate Trends')}
              </span>
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/10">
                <tr>
                  <th className="px-2 py-1 text-left font-bold">Month</th>
                  <th className="px-2 py-1 text-right font-bold">AAA 10Y</th>
                  <th className="px-2 py-1 text-right font-bold">AA 10Y</th>
                  <th className="px-2 py-1 text-right font-bold">A 10Y</th>
                  <th className="px-2 py-1 text-right font-bold">Muni/Tsy</th>
                  <th className="px-2 py-1 text-right font-bold">New Issue ($B)</th>
                  <th className="px-2 py-1 text-right font-bold">Net Flows ($B)</th>
                </tr>
              </thead>
              <tbody>
                {data.rateTrends.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/5 hover:bg-indigo-400/[0.02]">
                    <td className="px-2 py-1 text-left font-bold text-white">{r.month}</td>
                    <td className="px-2 py-1 text-right" style={{ color: ACCENT }}>{fmtPct(r.aaa10y)}</td>
                    <td className="px-2 py-1 text-right text-white/70">{fmtPct(r.aa10y)}</td>
                    <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.a10y)}</td>
                    <td className="px-2 py-1 text-right text-white/60">{fmtPct(r.muniTreasuryRatio)}</td>
                    <td className="px-2 py-1 text-right text-white/70">{fmtBillions(r.newIssuance)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${changeColor(r.netFlows)}`}>
                      {fmtBillions(r.netFlows)}
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

// ── Summary Item ──

function SummaryItem({
  label,
  value,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  color?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex-1 min-w-0 px-2 border-r border-border/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
        {label}
      </div>
      <div
        className={`text-[10px] font-mono font-bold truncate ${valueColor ?? ''}`}
        style={!valueColor && color ? { color } : !valueColor ? { color: 'white' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
