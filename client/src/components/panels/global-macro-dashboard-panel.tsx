import { Loader2 } from 'lucide-react';
import { useGlobalMacroDashboard } from '../../api/hooks/use-global-macro-dashboard';
import { useT, tr, TFn } from '../../i18n';

const ACCENT = '#38bdf8'; // sky-400

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBillions(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalBadge(signal: string | undefined): { text: string; bg: string } {
  if (!signal) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  const s = signal.toLowerCase();
  if (s.includes('expansion') || s.includes('positive') || s.includes('growth'))
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (s.includes('contraction') || s.includes('negative') || s.includes('recession'))
    return { text: 'text-red-400', bg: 'bg-red-500/10' };
  if (s.includes('turning') || s.includes('slow') || s.includes('warning'))
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10' };
}

function surplusDeficitBadge(val: string | undefined): { text: string; bg: string } {
  if (!val) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  const s = val.toLowerCase();
  if (s.includes('surplus')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (s.includes('deficit')) return { text: 'text-red-400', bg: 'bg-red-500/10' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10' };
}

function ratingBadge(rating: string | undefined): { text: string; bg: string } {
  if (!rating) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  if (rating.startsWith('AAA') || rating.startsWith('AA'))
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (rating.startsWith('A'))
    return { text: 'text-sky-400', bg: 'bg-sky-500/10' };
  if (rating.startsWith('BBB'))
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  if (rating.startsWith('BB') || rating.startsWith('B'))
    return { text: 'text-orange-400', bg: 'bg-orange-500/10' };
  return { text: 'text-red-400', bg: 'bg-red-500/10' };
}

function outlookBadge(outlook: string | undefined): { text: string; bg: string } {
  if (!outlook) return { text: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  const s = outlook.toLowerCase();
  if (s.includes('positive') || s.includes('stable'))
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (s.includes('negative') || s.includes('deteriorating'))
    return { text: 'text-red-400', bg: 'bg-red-500/10' };
  if (s.includes('watch') || s.includes('developing'))
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10' };
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15">
      <div className="w-1 h-1 shrink-0" style={{ backgroundColor: ACCENT }} />
      <span
        className="text-[7px] font-black font-mono uppercase tracking-widest"
        style={{ color: ACCENT }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary }: { summary: any }) {
  if (!summary) return null;

  const signalStyle = signalBadge(summary.leadingIndicatorSignal);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/20 bg-[#050505] overflow-x-auto no-scrollbar shrink-0 flex-wrap">
      {/* Global Growth Estimate */}
      {summary.globalGrowthEstimate != null && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Global</span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.globalGrowthEstimate)}`}>
            {fmtPct(summary.globalGrowthEstimate)}
          </span>
        </div>
      )}

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* US GDP Nowcast */}
      {summary.usGDPNowcast != null && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">US GDP</span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.usGDPNowcast)}`}>
            {fmtPct(summary.usGDPNowcast)}
          </span>
        </div>
      )}

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* Eurozone Growth */}
      {summary.eurozoneGrowth != null && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">EU</span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.eurozoneGrowth)}`}>
            {fmtPct(summary.eurozoneGrowth)}
          </span>
        </div>
      )}

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* China Growth */}
      {summary.chinaGrowth != null && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">CN</span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.chinaGrowth)}`}>
            {fmtPct(summary.chinaGrowth)}
          </span>
        </div>
      )}

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* Leading Indicator Signal Badge */}
      {summary.leadingIndicatorSignal && (
        <span className={`text-[7px] font-mono font-black uppercase px-1.5 py-0.5 ${signalStyle.text} ${signalStyle.bg}`}>
          {summary.leadingIndicatorSignal}
        </span>
      )}

      {/* Dominant Theme */}
      {summary.dominantTheme && (
        <>
          <div className="w-px h-3 bg-border/30 shrink-0" />
          <span className="text-[7px] font-mono font-bold text-sky-300 uppercase shrink-0 truncate max-w-[120px]">
            {summary.dominantTheme}
          </span>
        </>
      )}
    </div>
  );
}

// ── GDP Nowcasts Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GdpNowcastsTable({ items, t }: { items: any[]; t: ReturnType<typeof useT> }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'gmdGdpNowcasts', 'GDP Nowcasts')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Current%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Prior%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Revision</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Consensus%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Surprise</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Model</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => (
              <tr key={row.country ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.currentEstimate)}`}>
                  {fmtPct(row.currentEstimate)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 tabular-nums">
                  {fmtPct(row.priorEstimate)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.revision)}`}>
                  {fmtPct(row.revision)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 tabular-nums">
                  {fmtPct(row.consensusForecast)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.surprise)}`}>
                  {fmtPct(row.surprise)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400 truncate max-w-[80px]">{row.trackingModel ?? '-'}</td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-600 text-[7px]">{row.lastUpdated ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Leading Indicators Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeadingIndicatorsTable({ items, t }: { items: any[]; t: ReturnType<typeof useT> }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'gmdLeadingIndicators', 'Leading Indicators')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Indicator</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Current</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Prior</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Change</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Signal</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Momentum</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Pctl</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const sig = signalBadge(row.signal);
              return (
                <tr key={row.indicator ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold truncate max-w-[120px]">{row.indicator}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold tabular-nums">
                    {fmtNum(row.currentValue)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 tabular-nums">
                    {fmtNum(row.priorValue)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.change)}`}>
                    {fmtNum(row.change)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 ${sig.text} ${sig.bg}`}>
                      {row.signal ?? '-'}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 tabular-nums">
                    {row.momentum ?? '-'}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400 tabular-nums">
                    {row.percentile != null ? `${row.percentile}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Trade Balances Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TradeBalancesTable({ items, t }: { items: any[]; t: ReturnType<typeof useT> }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'gmdTradeBalances', 'Trade Balances')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Balance</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Exports</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Imports</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Change</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">YoY%</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Top Partner</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const sdBadge = surplusDeficitBadge(row.surplusDeficit);
              return (
                <tr key={row.country ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.tradeBalance)}`}>
                    {fmtBillions(row.tradeBalance)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                    {fmtBillions(row.exports)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                    {fmtBillions(row.imports)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.change)}`}>
                    {fmtBillions(row.change)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.yoyGrowth)}`}>
                    {fmtPct(row.yoyGrowth)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400 truncate max-w-[80px]">{row.topPartner ?? '-'}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 ${sdBadge.text} ${sdBadge.bg}`}>
                      {row.surplusDeficit ?? '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Fiscal Metrics Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FiscalMetricsTable({ items, t }: { items: any[]; t: ReturnType<typeof useT> }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'gmdFiscalMetrics', 'Fiscal Metrics')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Country</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Debt/GDP%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Budget%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Primary%</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Int Cost%</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Rating</th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">CDS</th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Outlook</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any, i: number) => {
              const rBadge = ratingBadge(row.debtRating);
              const oBadge = outlookBadge(row.outlook);
              return (
                <tr key={row.country ?? i} className="border-b border-border/10 hover:bg-sky-400/[0.02]">
                  <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">{row.country}</td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right tabular-nums ${
                    row.debtToGDP != null && row.debtToGDP > 100 ? 'text-red-400 font-bold' : 'text-neutral-300'
                  }`}>
                    {fmtNum(row.debtToGDP, 1)}%
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.budgetDeficit)}`}>
                    {fmtNum(row.budgetDeficit, 1)}%
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.primaryBalance)}`}>
                    {fmtNum(row.primaryBalance, 1)}%
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                    {fmtNum(row.interestCost, 1)}%
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 ${rBadge.text} ${rBadge.bg}`}>
                      {row.debtRating ?? '-'}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                    {fmtNum(row.cdsSpread, 0)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className={`text-[7px] font-black uppercase px-1 py-0.5 ${oBadge.text} ${oBadge.bg}`}>
                      {row.outlook ?? '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function GlobalMacroDashboardPanel() {
  const t = useT();
  const { data, isLoading, error } = useGlobalMacroDashboard();

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
          Failed to load global macro dashboard data
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Market Summary Bar */}
      <MarketSummaryBar summary={data.marketSummary} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* GDP Nowcasts */}
        <GdpNowcastsTable items={data.gdpNowcasts} t={t} />

        {/* Leading Indicators */}
        <LeadingIndicatorsTable items={data.leadingIndicators} t={t} />

        {/* Trade Balances */}
        <TradeBalancesTable items={data.tradeBalances} t={t} />

        {/* Fiscal Metrics */}
        <FiscalMetricsTable items={data.fiscalMetrics} t={t} />

        {/* Bottom padding */}
        <div className="h-2" />
      </div>
    </div>
  );
}
