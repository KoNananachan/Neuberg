import { useState } from 'react';
import { useDividendSwap } from '../../api/hooks/use-dividend-swap';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const LIME = '#a3e635';
const LIME_DIM = 'rgba(163,230,53,0.12)';

type Tab = 'INDEX' | 'STOCKS' | 'SECTORS' | 'SPECIALS';

// ── Color helpers ──

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeBg(val: number): string {
  if (val > 0) return 'rgba(52,211,153,0.12)';
  if (val < 0) return 'rgba(248,113,113,0.12)';
  return 'rgba(163,163,163,0.08)';
}

function sustainabilityBadge(level: string): { bg: string; color: string } {
  switch (level) {
    case 'HIGH':
      return { bg: 'rgba(52,211,153,0.15)', color: '#34d399' };
    case 'MEDIUM':
      return { bg: 'rgba(250,204,21,0.15)', color: '#facc15' };
    case 'LOW':
      return { bg: 'rgba(248,113,113,0.15)', color: '#f87171' };
    default:
      return { bg: LIME_DIM, color: LIME };
  }
}

function typeBadgeStyle(type: string): { bg: string; color: string } {
  switch (type) {
    case 'REGULAR':
      return { bg: 'rgba(163,230,53,0.12)', color: LIME };
    case 'SPECIAL':
      return { bg: 'rgba(250,204,21,0.15)', color: '#facc15' };
    case 'EXTRA':
      return { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' };
    default:
      return { bg: 'rgba(163,163,163,0.10)', color: '#a3a3a3' };
  }
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtPts(n: number): string {
  return n.toFixed(2);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtDollar(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Main Panel ──

export function DividendSwapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useDividendSwap();
  const [activeTab, setActiveTab] = useState<Tab>('INDEX');

  const tabs: Tab[] = ['INDEX', 'STOCKS', 'SECTORS', 'SPECIALS'];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: LIME }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter" style={{ color: LIME }}>
            {tr(t, 'divSwapTitle', 'Dividend Swap Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 bg-[#050505] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-lime-400 border-b border-lime-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-lime-500/30 border-t-lime-500 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'divSwapNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'INDEX' && <IndexTab data={data} t={t} />}
        {data && activeTab === 'STOCKS' && <StocksTab data={data} t={t} />}
        {data && activeTab === 'SECTORS' && <SectorsTab data={data} t={t} />}
        {data && activeTab === 'SPECIALS' && <SpecialsTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── INDEX Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndexTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.indexDividends ?? [];
  const termStructure = data?.termStructure ?? [];
  const marketMetrics = data?.marketMetrics;

  return (
    <div>
      {/* Index Dividends Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'divSwapIndexDividends', 'Index Dividend Swaps')}
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/10">
              {['Index', 'Curr Yr (pts)', 'Next Yr (pts)', '1D Chg', '1M Chg', 'Impl Growth', 'Div Yield'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {indices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-[8px] font-mono text-neutral-600">
                  {tr(t, 'divSwapNoIndices', 'No index data')}
                </td>
              </tr>
            )}
            {indices.map((idx: Record<string, unknown>, i: number) => (
              <tr
                key={i}
                className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1">
                  <span className="text-[9px] font-mono font-bold text-white">
                    {(idx?.name as string) ?? '—'}
                  </span>
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">
                  {idx?.currentYearPts != null ? fmtPts(idx.currentYearPts as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">
                  {idx?.nextYearPts != null ? fmtPts(idx.nextYearPts as number) : '—'}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(idx?.change1d as number ?? 0)}`}>
                  {idx?.change1d != null ? fmtChange(idx.change1d as number) : '—'}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(idx?.change1m as number ?? 0)}`}>
                  {idx?.change1m != null ? fmtChange(idx.change1m as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">
                  {idx?.impliedGrowth != null ? fmtPct(idx.impliedGrowth as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono" style={{ color: LIME }}>
                  {idx?.divYield != null ? `${(idx.divYield as number).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Term Structure Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'divSwapTermStructure', 'Dividend Term Structure')}
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/10">
              {['Year', 'SPX Div', 'SX5E Div', 'Growth', 'Discount'].map((h) => (
                <th
                  key={h}
                  className="px-2 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {termStructure.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-[8px] font-mono text-neutral-600">
                  {tr(t, 'divSwapNoTerm', 'No term structure data')}
                </td>
              </tr>
            )}
            {termStructure.map((row: Record<string, unknown>, i: number) => (
              <tr
                key={i}
                className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">
                  {(row?.year as string) ?? '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">
                  {row?.spxDiv != null ? fmtPts(row.spxDiv as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">
                  {row?.sx5eDiv != null ? fmtPts(row.sx5eDiv as number) : '—'}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(row?.growth as number ?? 0)}`}>
                  {row?.growth != null ? fmtPct(row.growth as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                  {row?.discount != null ? fmtPct(row.discount as number) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Market Metrics Summary */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'divSwapMarketMetrics', 'Market Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MetricCell
            label={tr(t, 'divSwapAvgYield', 'Avg Div Yield')}
            value={marketMetrics?.avgDivYield != null ? `${(marketMetrics.avgDivYield as number).toFixed(2)}%` : '—'}
            color={LIME}
          />
          <MetricCell
            label={tr(t, 'divSwapImplGrowth', 'Impl Growth')}
            value={marketMetrics?.impliedGrowth != null ? fmtPct(marketMetrics.impliedGrowth as number) : '—'}
            color={marketMetrics?.impliedGrowth > 0 ? '#34d399' : '#f87171'}
          />
          <MetricCell
            label={tr(t, 'divSwapFwdYield', 'Fwd Yield')}
            value={marketMetrics?.fwdYield != null ? `${(marketMetrics.fwdYield as number).toFixed(2)}%` : '—'}
            color={LIME}
          />
          <MetricCell
            label={tr(t, 'divSwapSwapSpread', 'Swap Spread')}
            value={marketMetrics?.swapSpread != null ? `${(marketMetrics.swapSpread as number).toFixed(1)} bps` : '—'}
            color="#a3a3a3"
          />
        </div>
      </div>
    </div>
  );
}

// ── STOCKS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StocksTab({ data, t }: { data: any; t: TFn }) {
  const stocks = data?.stockDividends ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'divSwapStockDividends', 'Single Stock Dividends')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border/10">
              {['Ticker', 'Annual Div', 'Yield', 'Payout', '5Y Growth', 'Ex-Div', 'Next Pmt', 'Rating'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-[8px] font-mono text-neutral-600">
                  {tr(t, 'divSwapNoStocks', 'No stock dividend data')}
                </td>
              </tr>
            )}
            {stocks.map((s: Record<string, unknown>, i: number) => {
              const badge = sustainabilityBadge((s?.sustainability as string) ?? 'MEDIUM');
              return (
                <tr
                  key={i}
                  className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
                >
                  <td className="px-2 py-1">
                    <span className="text-[9px] font-mono font-bold text-white">
                      {(s?.ticker as string) ?? '—'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-[9px] font-mono text-white">
                    {s?.annualDiv != null ? fmtDollar(s.annualDiv as number) : '—'}
                  </td>
                  <td className="px-2 py-1 text-[9px] font-mono" style={{ color: LIME }}>
                    {s?.yield != null ? `${(s.yield as number).toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                    {s?.payoutRatio != null ? `${(s.payoutRatio as number).toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(s?.growth5y as number ?? 0)}`}>
                    {s?.growth5y != null ? fmtPct(s.growth5y as number) : '—'}
                  </td>
                  <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                    {s?.exDivDate != null ? fmtDate(s.exDivDate as string) : '—'}
                  </td>
                  <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                    {s?.nextPayment != null ? fmtDate(s.nextPayment as string) : '—'}
                  </td>
                  <td className="px-2 py-1">
                    <span
                      className="px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {(s?.sustainability as string) ?? '—'}
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

// ── SECTORS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsTab({ data, t }: { data: any; t: TFn }) {
  const sectors = data?.sectorYields ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'divSwapSectorYields', 'Sector Dividend Yields')}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/10">
            {['Sector', 'Avg Yield', 'Avg Payout', 'Avg Growth', 'YoY Change'].map((h) => (
              <th
                key={h}
                className="px-2 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-[8px] font-mono text-neutral-600">
                {tr(t, 'divSwapNoSectors', 'No sector data')}
              </td>
            </tr>
          )}
          {sectors.map((sec: Record<string, unknown>, i: number) => (
            <tr
              key={i}
              className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1">
                <span className="text-[9px] font-mono font-bold text-white">
                  {(sec?.name as string) ?? '—'}
                </span>
              </td>
              <td className="px-2 py-1 text-[9px] font-mono" style={{ color: LIME }}>
                {sec?.avgYield != null ? `${(sec.avgYield as number).toFixed(2)}%` : '—'}
              </td>
              <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                {sec?.avgPayout != null ? `${(sec.avgPayout as number).toFixed(1)}%` : '—'}
              </td>
              <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(sec?.avgGrowth as number ?? 0)}`}>
                {sec?.avgGrowth != null ? fmtPct(sec.avgGrowth as number) : '—'}
              </td>
              <td className="px-2 py-1">
                <span
                  className={`text-[9px] font-mono font-bold ${changeColor(sec?.yoyChange as number ?? 0)}`}
                >
                  {sec?.yoyChange != null ? fmtPct(sec.yoyChange as number) : '—'}
                </span>
                {sec?.yoyChange != null && (
                  <div
                    className="mt-0.5 h-1 w-full max-w-[60px]"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(Math.abs(sec.yoyChange as number) * 5, 100)}%`,
                        background: changeBg(sec.yoyChange as number),
                      }}
                    />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── SPECIALS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpecialsTab({ data, t }: { data: any; t: TFn }) {
  const specials = data?.specialDividends ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'divSwapSpecials', 'Special Dividends Feed')}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/10">
            {['Company', 'Amount', 'Ex-Date', 'Type', 'Index Impact'].map((h) => (
              <th
                key={h}
                className="px-2 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specials.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-[8px] font-mono text-neutral-600">
                {tr(t, 'divSwapNoSpecials', 'No special dividends')}
              </td>
            </tr>
          )}
          {specials.map((sp: Record<string, unknown>, i: number) => {
            const badge = typeBadgeStyle((sp?.type as string) ?? 'SPECIAL');
            return (
              <tr
                key={i}
                className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1">
                  <div className="text-[9px] font-mono font-bold text-white">
                    {(sp?.company as string) ?? '—'}
                  </div>
                  {sp?.ticker ? (
                    <div className="text-[7px] font-mono text-neutral-600">
                      {String(sp.ticker)}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono font-bold" style={{ color: LIME }}>
                  {sp?.amount != null ? fmtDollar(sp.amount as number) : '—'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">
                  {sp?.exDate != null ? fmtDate(sp.exDate as string) : '—'}
                </td>
                <td className="px-2 py-1">
                  <span
                    className="px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {(sp?.type as string) ?? '—'}
                  </span>
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono font-bold ${changeColor(sp?.indexImpact as number ?? 0)}`}>
                  {sp?.indexImpact != null ? `${fmtChange(sp.indexImpact as number)} pts` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared Components ──

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-[10px] font-mono font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
