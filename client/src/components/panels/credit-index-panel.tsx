import { useState } from 'react';
import { useCreditIndex } from '../../api/hooks/use-credit-index';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Tabs ──

type Tab = 'INDICES' | 'RATINGS' | 'SECTORS' | 'FLOWS';
const TABS: Tab[] = ['INDICES', 'RATINGS', 'SECTORS', 'FLOWS'];

// ── Formatting helpers ──

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtReturn(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtYield(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2) + '%';
}

function fmtDuration(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

function fmtFlow(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtSize(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(0) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toFixed(0);
}

// ── Color helpers ──

function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function returnColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function flowColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingGradientColor(rating: string): string {
  if (rating === 'AAA') return 'text-emerald-300';
  if (rating === 'AA') return 'text-emerald-400';
  if (rating === 'A') return 'text-teal-400';
  if (rating === 'BBB') return 'text-yellow-400';
  if (rating === 'BB') return 'text-orange-400';
  if (rating === 'B') return 'text-red-400';
  if (rating === 'CCC') return 'text-red-500';
  return 'text-neutral-400';
}

function ratingRowBg(rating: string): string {
  if (rating === 'AAA') return 'bg-emerald-400/[0.04]';
  if (rating === 'AA') return 'bg-emerald-400/[0.03]';
  if (rating === 'A') return 'bg-teal-400/[0.03]';
  if (rating === 'BBB') return 'bg-yellow-400/[0.02]';
  if (rating === 'BB') return 'bg-orange-400/[0.02]';
  if (rating === 'B') return 'bg-red-400/[0.02]';
  if (rating === 'CCC') return 'bg-red-500/[0.03]';
  return '';
}

function conditionColor(condition: string | null | undefined): string {
  if (!condition) return 'text-neutral-500';
  const c = condition.toLowerCase();
  if (c === 'tight' || c === 'bullish') return 'text-emerald-400';
  if (c === 'wide' || c === 'bearish') return 'text-red-400';
  if (c === 'neutral' || c === 'normal') return 'text-neutral-400';
  return 'text-yellow-400';
}

// ── Main Panel ──

export function CreditIndexPanel() {
  const t = useT();
  const { data, isLoading, isError, error, refetch } = useCreditIndex();
  const [activeTab, setActiveTab] = useState<Tab>('INDICES');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'cixCreditIndexMonitor', 'Credit Index Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border/20 bg-[#050505] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b border-emerald-400 bg-[rgba(52,211,153,0.12)]'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {isError && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'cixError', 'Error loading data')}: {(error as Error)?.message || 'Unknown error'}
          </div>
        )}

        {!data && !isLoading && !isError && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cixNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'INDICES' && <IndicesTab data={data} t={t} />}
        {data && activeTab === 'RATINGS' && <RatingsTab data={data} t={t} />}
        {data && activeTab === 'SECTORS' && <SectorsTab data={data} t={t} />}
        {data && activeTab === 'FLOWS' && <FlowsTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── INDICES Tab ──

function IndicesTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.indices;
  const conditions = data?.marketConditions;
  const maturityWall = data?.maturityWall;

  return (
    <>
      {/* Market Conditions Summary Bar */}
      {conditions && (
        <div className="border-b border-border/20 bg-[#050505]">
          <div className="grid grid-cols-5 divide-x divide-border/10">
            {[
              { label: 'IG OAS', value: fmtBps(conditions?.igOas), unit: 'bps' },
              { label: 'HY OAS', value: fmtBps(conditions?.hyOas), unit: 'bps' },
              { label: 'IG/HY Ratio', value: conditions?.igHyRatio?.toFixed(2) ?? '--', unit: 'x' },
              { label: 'Condition', value: conditions?.condition ?? '--', unit: '', color: conditionColor(conditions?.condition) },
              { label: 'Vol Index', value: conditions?.volIndex?.toFixed(1) ?? '--', unit: '' },
            ].map((item) => (
              <div key={item.label} className="px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {item.label}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-[10px] font-mono font-bold ${item.color ?? 'text-white'}`}>
                    {item.value}
                  </span>
                  {item.unit && (
                    <span className="text-[7px] font-mono text-neutral-600">{item.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Indices Table */}
      {indices?.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cixCreditIndices', 'Credit Indices')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'cixIndex', 'Index')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">OAS</th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixYield', 'Yield')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixDuration', 'Dur')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">1D</th>
                  <th className="text-right px-2 py-1 font-normal">1M</th>
                  <th className="text-right px-2 py-1 font-normal">YTD</th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixSpdChg1d', 'Spd 1D')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixSpdChg1m', 'Spd 1M')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {indices.map((r: any, i: number) => (
                  <tr
                    key={r?.name ?? i}
                    className="border-b border-neutral-900 hover:bg-emerald-400/[0.02]"
                  >
                    <td className="px-2 py-1 font-bold text-emerald-400 truncate max-w-[140px] sticky left-0 bg-black z-10">
                      {r?.name ?? '--'}
                    </td>
                    <td className="px-2 py-1 text-right text-white font-bold">
                      {fmtBps(r?.oas)}
                    </td>
                    <td className="px-2 py-1 text-right text-white">
                      {fmtYield(r?.yield)}
                    </td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {fmtDuration(r?.duration)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${returnColor(r?.return1d)}`}>
                      {fmtReturn(r?.return1d)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${returnColor(r?.return1m)}`}>
                      {fmtReturn(r?.return1m)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${returnColor(r?.returnYtd)}`}>
                      {fmtReturn(r?.returnYtd)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r?.spreadChange1d)}`}>
                      {fmtChange(r?.spreadChange1d)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r?.spreadChange1m)}`}>
                      {fmtChange(r?.spreadChange1m)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maturity Wall Table */}
      {maturityWall?.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'cixMaturityWall', 'Maturity Wall')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'cixYear', 'Year')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixIgAmount', 'IG Amt')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixHyAmount', 'HY Amt')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'cixTotal', 'Total')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'cixBar', '')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {maturityWall.map((r: any, i: number) => {
                  const total = (r?.igAmount ?? 0) + (r?.hyAmount ?? 0);
                  const maxTotal = Math.max(
                    ...maturityWall.map((m: any) => (m?.igAmount ?? 0) + (m?.hyAmount ?? 0)),
                    1
                  );
                  const barPct = (total / maxTotal) * 100;

                  return (
                    <tr
                      key={r?.year ?? i}
                      className="border-b border-neutral-900 hover:bg-emerald-400/[0.02]"
                    >
                      <td className="px-2 py-1 font-bold text-white sticky left-0 bg-black z-10">
                        {r?.year ?? '--'}
                      </td>
                      <td className="px-2 py-1 text-right text-emerald-400">
                        {fmtSize(r?.igAmount)}
                      </td>
                      <td className="px-2 py-1 text-right text-orange-400">
                        {fmtSize(r?.hyAmount)}
                      </td>
                      <td className="px-2 py-1 text-right text-white font-bold">
                        {fmtSize(total)}
                      </td>
                      <td className="px-2 py-1 w-24">
                        <div className="h-2 bg-neutral-900 relative">
                          <div
                            className="absolute top-0 left-0 h-full bg-emerald-400/40"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── RATINGS Tab ──

function RatingsTab({ data, t }: { data: any; t: TFn }) {
  const ratings = data?.ratings;

  if (!ratings?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cixNoRatingData', 'No rating data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cixRatingBreakdown', 'Rating Breakdown')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cixRating', 'Rating')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixWeight', 'Weight')}
              </th>
              <th className="text-right px-2 py-1 font-normal">OAS</th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixYield', 'Yield')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixReturn1m', '1M Ret')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixDefaultRate', 'Default')}
              </th>
              <th className="text-left px-2 py-1 font-normal">
                {tr(t, 'cixWeightBar', '')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r: any, i: number) => {
              const ratingStr = r?.rating ?? '';
              const maxWeight = Math.max(
                ...ratings.map((m: any) => m?.weight ?? 0),
                1
              );
              const weightPct = ((r?.weight ?? 0) / maxWeight) * 100;

              return (
                <tr
                  key={ratingStr || i}
                  className={`border-b border-neutral-900 hover:bg-emerald-400/[0.02] ${ratingRowBg(ratingStr)}`}
                >
                  <td className={`px-2 py-1 font-bold sticky left-0 bg-black z-10 ${ratingGradientColor(ratingStr)}`}>
                    {ratingStr || '--'}
                  </td>
                  <td className="px-2 py-1 text-right text-white">
                    {fmtPct(r?.weight)}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r?.oas)}
                  </td>
                  <td className="px-2 py-1 text-right text-white">
                    {fmtYield(r?.yield)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${returnColor(r?.return1m)}`}>
                    {fmtReturn(r?.return1m)}
                  </td>
                  <td className="px-2 py-1 text-right text-red-400">
                    {fmtPct(r?.defaultRate)}
                  </td>
                  <td className="px-2 py-1 w-20">
                    <div className="h-1.5 bg-neutral-900 relative">
                      <div
                        className={`absolute top-0 left-0 h-full ${
                          ratingStr === 'AAA' || ratingStr === 'AA' || ratingStr === 'A'
                            ? 'bg-emerald-400/50'
                            : ratingStr === 'BBB'
                            ? 'bg-yellow-400/50'
                            : 'bg-red-400/50'
                        }`}
                        style={{ width: `${weightPct}%` }}
                      />
                    </div>
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

function SectorsTab({ data, t }: { data: any; t: TFn }) {
  const sectors = data?.sectors;

  if (!sectors?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cixNoSectorData', 'No sector data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cixSectorSpreads', 'Sector Spreads')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cixSector', 'Sector')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixIgSpread', 'IG Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixHySpread', 'HY Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixChange1m', '1M Chg')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cixSignal', 'Signal')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((r: any, i: number) => {
              const isTightest = r?.isTightest === true;
              const isWidest = r?.isWidest === true;

              return (
                <tr
                  key={r?.sector ?? i}
                  className="border-b border-neutral-900 hover:bg-emerald-400/[0.02]"
                >
                  <td className="px-2 py-1 text-white font-bold truncate max-w-[120px] sticky left-0 bg-black z-10">
                    {r?.sector ?? '--'}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r?.igSpread)}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r?.hySpread)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r?.change1m)}`}>
                    {fmtChange(r?.change1m)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {isTightest && (
                      <span className="px-1 py-px text-[7px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                        TIGHT
                      </span>
                    )}
                    {isWidest && (
                      <span className="px-1 py-px text-[7px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/30">
                        WIDE
                      </span>
                    )}
                    {!isTightest && !isWidest && (
                      <span className="text-neutral-600">--</span>
                    )}
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

// ── FLOWS Tab ──

function FlowsTab({ data, t }: { data: any; t: TFn }) {
  const flows = data?.flows;

  if (!flows?.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cixNoFlowData', 'No flow data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cixFlowData', 'Credit Fund Flows')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'cixCategory', 'Category')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixFlow1w', '1W Flow')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixFlow1m', '1M Flow')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'cixTrend', 'Trend')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'cixYtdCumulative', 'YTD Cum')}
              </th>
            </tr>
          </thead>
          <tbody>
            {flows.map((r: any, i: number) => {
              const trend = r?.trend ?? '';
              const trendColor = trend === 'INFLOW'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                : trend === 'OUTFLOW'
                ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                : 'text-neutral-500 bg-neutral-800/30 border border-neutral-700/30';

              return (
                <tr
                  key={r?.category ?? i}
                  className="border-b border-neutral-900 hover:bg-emerald-400/[0.02]"
                >
                  <td className="px-2 py-1 text-white font-bold truncate max-w-[140px] sticky left-0 bg-black z-10">
                    {r?.category ?? '--'}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${flowColor(r?.flow1w)}`}>
                    {fmtFlow(r?.flow1w)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${flowColor(r?.flow1m)}`}>
                    {fmtFlow(r?.flow1m)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {trend ? (
                      <span className={`px-1 py-px text-[7px] font-bold uppercase ${trendColor}`}>
                        {trend}
                      </span>
                    ) : (
                      <span className="text-neutral-600">--</span>
                    )}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${flowColor(r?.ytdCumulative)}`}>
                    {fmtFlow(r?.ytdCumulative)}
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
