import { useCreditRiskTransfer } from '../../api/hooks/use-credit-risk-transfer';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtDollarB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(1)}B`;
}

function fmtDollarM(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `$${n.toFixed(0)}M`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(0)}`;
}

function fmtBpsChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtFactor(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(4);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadColor(bps: number | null | undefined): string {
  if (bps == null) return 'text-neutral-500';
  if (bps <= 100) return 'text-green-400';
  if (bps <= 300) return 'text-cyan-400';
  if (bps <= 600) return 'text-amber-400';
  return 'text-red-400';
}

function delinquencyColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 8) return 'text-red-400';
  if (n >= 4) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function lossColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 5) return 'text-red-400';
  if (n >= 2) return 'text-orange-400';
  if (n >= 0.5) return 'text-yellow-400';
  return 'text-green-400';
}

function trendBadge(trend: string | null | undefined): { text: string; style: string } {
  if (!trend) return { text: 'N/A', style: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' };
  const t = trend.toUpperCase();
  if (t === 'IMPROVING' || t === 'DOWN')
    return { text: t, style: 'bg-green-400/20 text-green-400 border-green-400/30' };
  if (t === 'WORSENING' || t === 'UP')
    return { text: t, style: 'bg-red-400/20 text-red-400 border-red-400/30' };
  if (t === 'STABLE')
    return { text: t, style: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' };
  return { text: t, style: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' };
}

// ── Interfaces ──

interface CrtSummary {
  totalIssuanceYTD: number;
  avgSpread: number;
  avgExpectedLoss: number;
  activeSeries: number;
  delinquencyTrend: string;
}

interface CrtDeal {
  issuer: string;
  series: string;
  tranche: string;
  notional: number;
  spread: number;
  rating: string;
  attachPoint: number;
  detachPoint: number;
  expectedLoss: number;
  date: string;
}

interface MarketPricing {
  series: string;
  tranche: string;
  currentSpread: number;
  change1W: number;
  change1M: number;
  cumulLoss: number;
  factor: number;
}

interface DelinquencyMetric {
  vintage: string;
  seriousDelinq: number;
  earlyDefault: number;
  cumulLoss: number;
  prepayRate: number;
  creditEnhancement: number;
}

// ── Main Panel ──

export function CreditRiskTransferPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = useCreditRiskTransfer() as { data: any; isLoading: boolean; error: any; refetch: () => void };

  const summary = data?.summary as CrtSummary | undefined;
  const deals = data?.deals as CrtDeal[] | undefined;
  const pricing = data?.pricing as MarketPricing[] | undefined;
  const delinquency = data?.delinquency as DelinquencyMetric[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-pink-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-pink-400">
            {tr(t, 'crtTitle', 'Credit Risk Transfer Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'crtError', 'Failed to load data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'crtNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {deals && deals.length > 0 && <DealsSection deals={deals} t={t} />}
            {pricing && pricing.length > 0 && <PricingSection pricing={pricing} t={t} />}
            {delinquency && delinquency.length > 0 && <DelinquencySection delinquency={delinquency} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary, t }: { summary: CrtSummary; t: TFn }) {
  const badge = trendBadge(summary.delinquencyTrend);

  return (
    <div className="border-b border-pink-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-pink-400/10">
        {/* Total Issuance YTD */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'crtIssuanceYTD', 'Issuance YTD')}
          </div>
          <div className="text-[10px] font-mono font-bold text-pink-400">
            {fmtDollarB(summary.totalIssuanceYTD)}
          </div>
        </div>

        {/* Avg Spread */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'crtAvgSpread', 'Avg Spread')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${spreadColor(summary.avgSpread)}`}>
            {fmtBps(summary.avgSpread)}<span className="text-[7px] text-neutral-600"> bp</span>
          </div>
        </div>

        {/* Avg Expected Loss */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'crtAvgEL', 'Avg Exp Loss')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${lossColor(summary.avgExpectedLoss)}`}>
            {fmtPct(summary.avgExpectedLoss)}
          </div>
        </div>

        {/* Active Series */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'crtActiveSeries', 'Active Series')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.activeSeries}
          </div>
        </div>

        {/* Delinquency Trend */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'crtDelinqTrend', 'Delinq Trend')}
          </div>
          <div className="mt-0.5">
            <span className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${badge.style}`}>
              {badge.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CRT Deals Section ──

function DealsSection({ deals, t }: { deals: CrtDeal[]; t: TFn }) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'crtDeals', 'CRT Deals')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-pink-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtIssuer', 'Issuer')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtSeries', 'Series')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtTranche', 'Tranche')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtNotional', 'Notional')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtSpread', 'Sprd (bp)')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'crtRating', 'Rating')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtAttachDetach', 'Att/Det %')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtExpLoss', 'Exp Loss')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtDate', 'Date')}</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d, i) => (
              <tr
                key={`${d.series}-${d.tranche}-${i}`}
                className="border-b border-neutral-900 hover:bg-pink-400/[0.02]"
              >
                <td className="px-2 py-1 text-pink-400 font-bold">{d.issuer}</td>
                <td className="px-2 py-1 text-white font-bold">{d.series}</td>
                <td className="px-2 py-1">
                  <span className="text-[7px] font-bold px-1 py-0 bg-white/[0.05] border border-border/20 text-white/60 uppercase">
                    {d.tranche}
                  </span>
                </td>
                <td className="px-2 py-1 text-right text-white/80 font-bold">{fmtDollarM(d.notional)}</td>
                <td className={`px-2 py-1 text-right font-bold ${spreadColor(d.spread)}`}>{fmtBps(d.spread)}</td>
                <td className="px-2 py-1 text-center text-neutral-300">{d.rating}</td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtPct(d.attachPoint, 1)}/{fmtPct(d.detachPoint, 1)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${lossColor(d.expectedLoss)}`}>
                  {fmtPct(d.expectedLoss)}
                </td>
                <td className="px-2 py-1 text-neutral-400">{d.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Market Pricing Section ──

function PricingSection({ pricing, t }: { pricing: MarketPricing[]; t: TFn }) {
  return (
    <div className="border-b border-pink-400/30">
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'crtMarketPricing', 'Market Pricing')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-pink-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtPrcSeries', 'Series')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtPrcTranche', 'Tranche')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrcCurSpread', 'Cur Sprd')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrc1WChg', '1W Chg')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrc1MChg', '1M Chg')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrcCumulLoss', 'Cumul Loss')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrcFactor', 'Factor')}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((p, i) => (
              <tr
                key={`${p.series}-${p.tranche}-${i}`}
                className="border-b border-neutral-900 hover:bg-pink-400/[0.02]"
              >
                <td className="px-2 py-1 text-pink-400 font-bold">{p.series}</td>
                <td className="px-2 py-1">
                  <span className="text-[7px] font-bold px-1 py-0 bg-white/[0.05] border border-border/20 text-white/60 uppercase">
                    {p.tranche}
                  </span>
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadColor(p.currentSpread)}`}>
                  {fmtBps(p.currentSpread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${changeColor(p.change1W)}`}>
                  {fmtBpsChange(p.change1W)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${changeColor(p.change1M)}`}>
                  {fmtBpsChange(p.change1M)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${lossColor(p.cumulLoss)}`}>
                  {fmtPct(p.cumulLoss)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtFactor(p.factor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Delinquency Metrics Section ──

function DelinquencySection({ delinquency, t }: { delinquency: DelinquencyMetric[]; t: TFn }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-pink-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'crtDelinquencyMetrics', 'Delinquency Metrics')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-pink-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'crtVintage', 'Vintage')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtSeriousDelinq', 'Serious Delinq')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtEarlyDefault', 'Early Default')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtCumulLoss', 'Cumul Loss')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtPrepayRate', 'Prepay Rate')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'crtCreditEnhance', 'Credit Enh')}</th>
            </tr>
          </thead>
          <tbody>
            {delinquency.map((d, i) => (
              <tr
                key={`${d.vintage}-${i}`}
                className="border-b border-neutral-900 hover:bg-pink-400/[0.02]"
              >
                <td className="px-2 py-1 text-pink-400 font-bold">{d.vintage}</td>
                <td className={`px-2 py-1 text-right font-bold ${delinquencyColor(d.seriousDelinq)}`}>
                  {fmtPct(d.seriousDelinq)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${delinquencyColor(d.earlyDefault)}`}>
                  {fmtPct(d.earlyDefault)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${lossColor(d.cumulLoss)}`}>
                  {fmtPct(d.cumulLoss)}
                </td>
                <td className="px-2 py-1 text-right text-white/80 font-bold">
                  {fmtPct(d.prepayRate)}
                </td>
                <td className="px-2 py-1 text-right text-cyan-400 font-bold">
                  {fmtPct(d.creditEnhancement)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
