import { useSwapExecution } from '../../api/hooks/use-swap-execution';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtVol(n: number): string {
  return n.toFixed(1);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtSpread(n: number): string {
  return n.toFixed(2);
}

function fmtSize(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

// -- Interfaces --

interface SefSummary {
  totalDailyVolume: number;
  sefMarketShare: number;
  avgSpread: number;
  clearingRate: number;
  topSef: string;
}

interface SefVolume {
  sefName: string;
  product: string;
  dailyVol: number;
  weeklyVol: number;
  mktShare: number;
  change1w: number;
  topProduct: string;
}

interface ProductBreakdown {
  product: string;
  dailyNotional: number;
  tradeCount: number;
  avgSize: number;
  sefPct: number;
  mandatoryClearing: boolean;
}

interface ExecutionMetric {
  metric: string;
  value: string;
  unit: string;
  change1m: number;
  trend: number;
}

// -- Main Panel --

export function SwapExecutionPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSwapExecution();

  const summary = data?.summary as SefSummary | undefined;
  const sefVolumes = data?.sefVolumes as SefVolume[] | undefined;
  const productBreakdown = data?.productBreakdown as ProductBreakdown[] | undefined;
  const executionAnalytics = data?.executionAnalytics as ExecutionMetric[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-cyan-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-cyan-400">
            {tr(t, 'sefTitle', 'SEF Analytics')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sefNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {sefVolumes && sefVolumes.length > 0 && (
              <SefVolumesSection volumes={sefVolumes} t={t} />
            )}
            {productBreakdown && productBreakdown.length > 0 && (
              <ProductBreakdownSection products={productBreakdown} t={t} />
            )}
            {executionAnalytics && executionAnalytics.length > 0 && (
              <ExecutionAnalyticsSection metrics={executionAnalytics} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Summary Bar --

function SummaryBar({
  summary,
  t,
}: {
  summary: SefSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-cyan-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sefDailyVol', 'Daily Vol ($B)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtVol(summary.totalDailyVolume)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sefMktShare', 'SEF Mkt Share')}
          </div>
          <div className="text-[10px] font-mono font-bold text-cyan-400">
            {fmtPct(summary.sefMarketShare)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sefAvgSpread', 'Avg Spread')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtSpread(summary.avgSpread)}bp
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sefClearingRate', 'Clearing Rate')}
          </div>
          <div className="text-[10px] font-mono font-bold text-cyan-400">
            {fmtPct(summary.clearingRate)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sefTopSef', 'Top SEF')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white truncate">
            {summary.topSef}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- SEF Volumes Section --

function SefVolumesSection({
  volumes,
  t,
}: {
  volumes: SefVolume[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sefVolumes', 'SEF Volumes')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_56px_56px_48px_48px_72px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sefName', 'SEF Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sefProduct', 'Product')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefDailyB', 'Daily $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefWeeklyB', 'Wkly $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefMktPct', 'Mkt %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sef1wChg', '1W Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'sefTopProd', 'Top Product')}
        </span>
      </div>

      {/* Rows */}
      {volumes.map((vol, i) => (
        <div
          key={`${vol.sefName}-${vol.product}-${i}`}
          className="grid grid-cols-[1fr_72px_56px_56px_48px_48px_72px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {vol.sefName}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {vol.product}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtVol(vol.dailyVol)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtVol(vol.weeklyVol)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(vol.mktShare)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(vol.change1w)}`}>
            {fmtChg(vol.change1w)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {vol.topProduct}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Product Breakdown Section --

function ProductBreakdownSection({
  products,
  t,
}: {
  products: ProductBreakdown[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sefProductBreakdown', 'Product Breakdown')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_48px_80px_64px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sefProdName', 'Product')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefNotional', 'Daily $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefTrades', 'Trades')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefAvgSz', 'Avg $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefSefPct', 'SEF %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'sefClearing', 'Clearing')}
        </span>
      </div>

      {/* Rows */}
      {products.map((prod) => (
        <div
          key={prod.product}
          className="grid grid-cols-[1fr_64px_56px_48px_80px_64px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-cyan-400 truncate">
            {prod.product}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtVol(prod.dailyNotional)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {prod.tradeCount.toLocaleString()}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSize(prod.avgSize)}
          </span>
          {/* SEF % bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-400"
                style={{ width: `${Math.min(prod.sefPct, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(prod.sefPct)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-right pr-2">
            {prod.mandatoryClearing ? (
              <span className="text-green-400 font-bold">YES</span>
            ) : (
              <span className="text-neutral-600">NO</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Execution Analytics Section --

function ExecutionAnalyticsSection({
  metrics,
  t,
}: {
  metrics: ExecutionMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sefExecAnalytics', 'Execution Analytics')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_48px_56px_32px] gap-0 px-2 py-0.5 border-b border-cyan-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sefMetric', 'Metric')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefValue', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sefUnit', 'Unit')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sef1mChg', '1M Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'sefTrend', 'Trend')}
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_72px_48px_56px_32px] gap-0 px-2 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {m.value}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {m.unit}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.change1m)}`}>
            {fmtChg(m.change1m)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(m.trend)}`}>
            {trendArrow(m.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}
