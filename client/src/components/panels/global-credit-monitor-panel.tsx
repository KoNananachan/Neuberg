import { useState } from 'react';
import { useGlobalCreditMonitor } from '../../api/hooks/use-global-credit-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Tab type --

type Tab = 'spreads' | 'defaults' | 'ratingActions' | 'stress' | 'regions';

const TABS: { key: Tab; label: string }[] = [
  { key: 'spreads', label: 'SPREADS' },
  { key: 'defaults', label: 'DEFAULTS' },
  { key: 'ratingActions', label: 'RATING ACTIONS' },
  { key: 'stress', label: 'STRESS' },
  { key: 'regions', label: 'REGIONS' },
];

// -- Formatting helpers --

function fmtBps(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(0);
}

function fmtChange(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(2) + '%';
}

function fmtRate(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(2) + '%';
}

function fmtRatio(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(2) + 'x';
}

function fmtDate(d: unknown): string {
  if (d == null) return '--';
  try {
    const date = new Date(String(d));
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return '--';
  }
}

// -- Color helpers --

// Wider spreads = red, tighter = green
function spreadChangeColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadLevelColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-400';
  if (n > 500) return 'text-red-400';
  if (n > 300) return 'text-red-400/80';
  if (n > 150) return 'text-orange-400';
  if (n > 80) return 'text-yellow-400';
  return 'text-green-400';
}

// Downgrades = red, upgrades = green
function ratingActionColor(action: unknown): string {
  const s = String(action).toLowerCase();
  if (s.includes('upgrade')) return 'text-green-400';
  if (s.includes('downgrade')) return 'text-red-400';
  if (s.includes('watch') && s.includes('neg')) return 'text-red-400/80';
  if (s.includes('watch') && s.includes('pos')) return 'text-green-400/80';
  if (s.includes('outlook') && s.includes('neg')) return 'text-orange-400';
  if (s.includes('outlook') && s.includes('pos')) return 'text-emerald-400';
  return 'text-neutral-400';
}

function defaultRateColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-400';
  if (n > 5) return 'text-red-400';
  if (n > 3) return 'text-orange-400';
  if (n > 1.5) return 'text-yellow-400';
  return 'text-green-400';
}

function stressColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-400';
  if (n >= 80) return 'text-red-400';
  if (n >= 60) return 'text-orange-400';
  if (n >= 40) return 'text-yellow-400';
  return 'text-green-400';
}

function ratingColor(rating: unknown): string {
  const s = String(rating);
  if (s.startsWith('AAA')) return 'text-green-400';
  if (s.startsWith('AA')) return 'text-emerald-400';
  if (s.startsWith('A')) return 'text-teal-400';
  if (s.startsWith('BBB')) return 'text-yellow-400';
  if (s.startsWith('BB')) return 'text-orange-400';
  if (s.startsWith('B') && !s.startsWith('BB')) return 'text-red-400';
  if (s.startsWith('CCC') || s.startsWith('CC') || s.startsWith('C') || s === 'D') return 'text-red-500';
  return 'text-neutral-400';
}

// -- Main Panel --

export function GlobalCreditMonitorPanel() {
  const t = useT();
  const { data, isLoading, isError, error, refetch } = useGlobalCreditMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('spreads');
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'gcmTitle', 'Global Credit Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 bg-[#050505] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-yellow-400 border-yellow-400 bg-yellow-400/[0.04]'
                : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-yellow-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d ? (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        ) : isError && !d ? (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'gcmError', 'Error loading data')}: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : !d ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'gcmNoData', 'No data available')}
          </div>
        ) : (
          <>
            {activeTab === 'spreads' ? <SpreadsTab data={d} t={t} /> : null}
            {activeTab === 'defaults' ? <DefaultsTab data={d} t={t} /> : null}
            {activeTab === 'ratingActions' ? <RatingActionsTab data={d} t={t} /> : null}
            {activeTab === 'stress' ? <StressTab data={d} t={t} /> : null}
            {activeTab === 'regions' ? <RegionsTab data={d} t={t} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

// -- Spreads Tab --

function SpreadsTab({ data, t }: { data: any; t: TFn }) {
  const spreads = data.spreads;
  if (!spreads) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'gcmNoSpreads', 'No spread data available')}
      </div>
    );
  }

  const summary = spreads.summary;
  const indices = spreads.indices ?? [];
  const sectors = spreads.sectors ?? [];
  const curves = spreads.curves ?? [];

  return (
    <>
      {/* Summary bar */}
      {summary ? (
        <div className="border-b border-border/20 bg-[#050505]">
          <div className="grid grid-cols-6 divide-x divide-border/10">
            {[
              { label: 'IG AVG', value: fmtBps(summary.igAvg), unit: 'bps', chg: summary.igAvgChg },
              { label: 'HY AVG', value: fmtBps(summary.hyAvg), unit: 'bps', chg: summary.hyAvgChg },
              { label: 'EM AVG', value: fmtBps(summary.emAvg), unit: 'bps', chg: summary.emAvgChg },
              { label: 'IG/HY RATIO', value: fmtRatio(summary.igHyRatio), unit: '', chg: null },
              { label: 'CDX IG', value: fmtBps(summary.cdxIg), unit: 'bps', chg: summary.cdxIgChg },
              { label: 'CDX HY', value: fmtBps(summary.cdxHy), unit: 'bps', chg: summary.cdxHyChg },
            ].map((item) => (
              <div key={item.label} className="px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {item.label}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[10px] font-mono font-bold text-white">
                    {item.value}
                  </span>
                  {item.unit ? (
                    <span className="text-[7px] font-mono text-neutral-600">{item.unit}</span>
                  ) : null}
                </div>
                {item.chg != null ? (
                  <div className={`text-[7px] font-mono font-bold ${spreadChangeColor(item.chg)}`}>
                    {fmtChange(item.chg)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Index spreads table */}
      {indices.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmCreditIndices', 'Credit Indices')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmIndex', 'Index')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmSpread', 'Spread')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">1D</th>
                  <th className="text-right px-2 py-1 font-normal">1W</th>
                  <th className="text-right px-2 py-1 font-normal">1M</th>
                  <th className="text-right px-2 py-1 font-normal">YTD</th>
                  <th className="text-right px-2 py-1 font-normal">52W HI</th>
                  <th className="text-right px-2 py-1 font-normal">52W LO</th>
                </tr>
              </thead>
              <tbody>
                {indices.map((r: any, i: number) => (
                  <tr
                    key={String(r.name ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-yellow-400 font-bold truncate max-w-[160px] sticky left-0 bg-black z-10">
                      {String(r.name ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadLevelColor(r.spread)}`}>
                      {fmtBps(r.spread)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1d)}`}>
                      {fmtChange(r.change1d)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1w)}`}>
                      {fmtChange(r.change1w)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change1m)}`}>
                      {fmtChange(r.change1m)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.changeYtd)}`}>
                      {fmtChange(r.changeYtd)}
                    </td>
                    <td className="px-2 py-1 text-right text-red-400/60">
                      {fmtBps(r.high52w)}
                    </td>
                    <td className="px-2 py-1 text-right text-green-400/60">
                      {fmtBps(r.low52w)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Sector spreads table */}
      {sectors.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmSectorSpreads', 'Sector Spreads')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmSector', 'Sector')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">IG</th>
                  <th className="text-right px-2 py-1 font-normal">HY</th>
                  <th className="text-right px-2 py-1 font-normal">IG CHG</th>
                  <th className="text-right px-2 py-1 font-normal">HY CHG</th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmZScore', 'Z-Score')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((r: any, i: number) => (
                  <tr
                    key={String(r.sector ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-white font-bold truncate max-w-[120px] sticky left-0 bg-black z-10">
                      {String(r.sector ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadLevelColor(r.igSpread)}`}>
                      {fmtBps(r.igSpread)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadLevelColor(r.hySpread)}`}>
                      {fmtBps(r.hySpread)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.igChange)}`}>
                      {fmtChange(r.igChange)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.hyChange)}`}>
                      {fmtChange(r.hyChange)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.zScore)}`}>
                      {r.zScore != null ? (r.zScore as number).toFixed(2) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Spread curves */}
      {curves.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmSpreadCurves', 'Spread Curves')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmCategory', 'Category')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">1Y</th>
                  <th className="text-right px-2 py-1 font-normal">3Y</th>
                  <th className="text-right px-2 py-1 font-normal">5Y</th>
                  <th className="text-right px-2 py-1 font-normal">7Y</th>
                  <th className="text-right px-2 py-1 font-normal">10Y</th>
                  <th className="text-right px-2 py-1 font-normal">30Y</th>
                </tr>
              </thead>
              <tbody>
                {curves.map((r: any, i: number) => (
                  <tr
                    key={String(r.category ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-yellow-400 font-bold sticky left-0 bg-black z-10">
                      {String(r.category ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y1)}`}>{fmtBps(r.y1)}</td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y3)}`}>{fmtBps(r.y3)}</td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y5)}`}>{fmtBps(r.y5)}</td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y7)}`}>{fmtBps(r.y7)}</td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y10)}`}>{fmtBps(r.y10)}</td>
                    <td className={`px-2 py-1 text-right ${spreadLevelColor(r.y30)}`}>{fmtBps(r.y30)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}

// -- Defaults Tab --

function DefaultsTab({ data, t }: { data: any; t: TFn }) {
  const defaults = data.defaultRates;
  if (!defaults) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'gcmNoDefaults', 'No default rate data available')}
      </div>
    );
  }

  const summary = defaults.summary;
  const rates = defaults.rates ?? [];
  const recentDefaults = defaults.recentDefaults ?? [];
  const recoveryRates = defaults.recoveryRates ?? [];

  return (
    <>
      {/* Default rate summary */}
      {summary ? (
        <div className="border-b border-border/20 bg-[#050505]">
          <div className="grid grid-cols-5 divide-x divide-border/10">
            {[
              { label: 'HY DEFAULT RATE', value: fmtRate(summary.hyDefaultRate), color: defaultRateColor(summary.hyDefaultRate) },
              { label: 'IG DEFAULT RATE', value: fmtRate(summary.igDefaultRate), color: defaultRateColor(summary.igDefaultRate) },
              { label: 'LOAN DEFAULT RATE', value: fmtRate(summary.loanDefaultRate), color: defaultRateColor(summary.loanDefaultRate) },
              { label: 'TRAILING 12M', value: String(summary.trailing12mCount ?? '--'), color: 'text-white' },
              { label: 'AVG RECOVERY', value: fmtPct(summary.avgRecovery), color: 'text-white' },
            ].map((item) => (
              <div key={item.label} className="px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {item.label}
                </div>
                <span className={`text-[10px] font-mono font-bold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Default rates by rating */}
      {rates.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmDefaultRatesByRating', 'Default Rates by Rating')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmRating', 'Rating')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">1Y</th>
                  <th className="text-right px-2 py-1 font-normal">3Y</th>
                  <th className="text-right px-2 py-1 font-normal">5Y</th>
                  <th className="text-right px-2 py-1 font-normal">10Y</th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmHistAvg', 'Hist Avg')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmVsCurrent', 'vs Current')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r: any, i: number) => (
                  <tr
                    key={String(r.rating ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className={`px-2 py-1 font-bold sticky left-0 bg-black z-10 ${ratingColor(r.rating)}`}>
                      {String(r.rating ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right ${defaultRateColor(r.rate1y)}`}>{fmtRate(r.rate1y)}</td>
                    <td className={`px-2 py-1 text-right ${defaultRateColor(r.rate3y)}`}>{fmtRate(r.rate3y)}</td>
                    <td className={`px-2 py-1 text-right ${defaultRateColor(r.rate5y)}`}>{fmtRate(r.rate5y)}</td>
                    <td className={`px-2 py-1 text-right ${defaultRateColor(r.rate10y)}`}>{fmtRate(r.rate10y)}</td>
                    <td className="px-2 py-1 text-right text-neutral-400">{fmtRate(r.histAvg)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.vsCurrent)}`}>
                      {fmtChange(r.vsCurrent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Recent defaults */}
      {recentDefaults.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmRecentDefaults', 'Recent Defaults')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmIssuer', 'Issuer')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmDate', 'Date')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmDebtAmt', 'Debt ($M)')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmSector', 'Sector')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmType', 'Type')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmRecovery', 'Recovery')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentDefaults.map((r: any, i: number) => (
                  <tr
                    key={String(r.issuer ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-red-400 font-bold truncate max-w-[140px] sticky left-0 bg-black z-10">
                      {String(r.issuer ?? '--')}
                    </td>
                    <td className="px-2 py-1 text-neutral-400">{fmtDate(r.date)}</td>
                    <td className="px-2 py-1 text-right text-white font-bold">
                      {r.debtAmount != null ? String(r.debtAmount) : '--'}
                    </td>
                    <td className="px-2 py-1 text-neutral-400 truncate max-w-[100px]">
                      {String(r.sector ?? '--')}
                    </td>
                    <td className="px-2 py-1 text-neutral-400">
                      {String(r.type ?? '--')}
                    </td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {fmtPct(r.recovery)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Recovery rates by seniority */}
      {recoveryRates.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmRecoveryBySeniority', 'Recovery Rates by Seniority')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmSeniority', 'Seniority')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmAvgRecovery', 'Avg Recovery')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmMedian', 'Median')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmMin', 'Min')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmMax', 'Max')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recoveryRates.map((r: any, i: number) => (
                  <tr
                    key={String(r.seniority ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-white font-bold sticky left-0 bg-black z-10">
                      {String(r.seniority ?? '--')}
                    </td>
                    <td className="px-2 py-1 text-right text-yellow-400 font-bold">{fmtPct(r.avg)}</td>
                    <td className="px-2 py-1 text-right text-neutral-400">{fmtPct(r.median)}</td>
                    <td className="px-2 py-1 text-right text-red-400/60">{fmtPct(r.min)}</td>
                    <td className="px-2 py-1 text-right text-green-400/60">{fmtPct(r.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}

// -- Rating Actions Tab --

function RatingActionsTab({ data, t }: { data: any; t: TFn }) {
  const ratingActions = data.ratingActions;
  if (!ratingActions) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'gcmNoRatingActions', 'No rating action data available')}
      </div>
    );
  }

  const summary = ratingActions.summary;
  const actions = ratingActions.actions ?? [];
  const migration = ratingActions.migration ?? [];

  return (
    <>
      {/* Rating actions summary */}
      {summary ? (
        <div className="border-b border-border/20 bg-[#050505]">
          <div className="grid grid-cols-6 divide-x divide-border/10">
            {[
              { label: 'UPGRADES', value: String(summary.upgrades ?? '--'), color: 'text-green-400' },
              { label: 'DOWNGRADES', value: String(summary.downgrades ?? '--'), color: 'text-red-400' },
              { label: 'UP/DOWN RATIO', value: fmtRatio(summary.upDownRatio), color: summary.upDownRatio > 1 ? 'text-green-400' : 'text-red-400' },
              { label: 'WATCH NEG', value: String(summary.watchNeg ?? '--'), color: 'text-orange-400' },
              { label: 'WATCH POS', value: String(summary.watchPos ?? '--'), color: 'text-emerald-400' },
              { label: 'OUTLOOK NEG', value: String(summary.outlookNeg ?? '--'), color: 'text-orange-400/80' },
            ].map((item) => (
              <div key={item.label} className="px-2 py-1.5">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                  {item.label}
                </div>
                <span className={`text-[10px] font-mono font-bold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recent rating actions */}
      {actions.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmRecentActions', 'Recent Rating Actions')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmIssuer', 'Issuer')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmAgency', 'Agency')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmAction', 'Action')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmFrom', 'From')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmTo', 'To')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmDate', 'Date')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmSector', 'Sector')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {actions.map((r: any, i: number) => {
                  const actionStr = String(r.action ?? '--');
                  const actionColor = ratingActionColor(r.action);
                  const isDowngrade = actionStr.toLowerCase().includes('downgrade');
                  const isUpgrade = actionStr.toLowerCase().includes('upgrade');
                  const actionBg = isDowngrade
                    ? 'bg-red-500/10 border border-red-500/30'
                    : isUpgrade
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-neutral-500/10 border border-neutral-500/30';

                  return (
                    <tr
                      key={String(r.issuer ?? '') + String(i)}
                      className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                    >
                      <td className="px-2 py-1 text-white font-bold truncate max-w-[140px] sticky left-0 bg-black z-10">
                        {String(r.issuer ?? '--')}
                      </td>
                      <td className="px-2 py-1 text-neutral-400">
                        {String(r.agency ?? '--')}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`px-1 py-px text-[7px] font-bold uppercase ${actionColor} ${actionBg}`}>
                          {actionStr}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[8px] font-bold ${ratingColor(r.from)}`}>
                          {String(r.from ?? '--')}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[8px] font-bold ${ratingColor(r.to)}`}>
                          {String(r.to ?? '--')}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-neutral-400">{fmtDate(r.date)}</td>
                      <td className="px-2 py-1 text-neutral-400 truncate max-w-[100px]">
                        {String(r.sector ?? '--')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Rating migration matrix */}
      {migration.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmRatingMigration', 'Rating Migration (12M Transition %)')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmFrom', 'From')}
                  </th>
                  {migration.map((r: any) => (
                    <th key={String(r.from ?? '')} className="text-right px-2 py-1 font-normal">
                      {String(r.from ?? '--')}
                    </th>
                  ))}
                  <th className="text-right px-2 py-1 font-normal">D</th>
                </tr>
              </thead>
              <tbody>
                {migration.map((r: any, i: number) => (
                  <tr
                    key={String(r.from ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className={`px-2 py-1 font-bold sticky left-0 bg-black z-10 ${ratingColor(r.from)}`}>
                      {String(r.from ?? '--')}
                    </td>
                    {(r.transitions ?? []).map((val: any, j: number) => {
                      const n = typeof val === 'number' ? val : null;
                      const isDiagonal = i === j;
                      const cellColor = isDiagonal
                        ? 'text-yellow-400 font-bold'
                        : n != null && n > 0
                          ? j > i
                            ? 'text-red-400/80'
                            : 'text-green-400/80'
                          : 'text-neutral-600';
                      return (
                        <td key={j} className={`px-2 py-1 text-right ${cellColor}`}>
                          {n != null ? n.toFixed(1) : '--'}
                        </td>
                      );
                    })}
                    <td className={`px-2 py-1 text-right ${defaultRateColor(r.defaultProb)}`}>
                      {r.defaultProb != null ? (r.defaultProb as number).toFixed(2) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}

// -- Stress Tab --

function StressTab({ data, t }: { data: any; t: TFn }) {
  const stress = data.stressIndicators;
  if (!stress) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'gcmNoStress', 'No stress indicator data available')}
      </div>
    );
  }

  const composite = stress.composite;
  const indicators = stress.indicators ?? [];
  const thresholds = stress.thresholds ?? [];
  const history = stress.history ?? [];

  return (
    <>
      {/* Composite stress gauge */}
      {composite != null ? (
        <div className="border-b border-border/20 bg-[#050505] px-3 py-2">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'gcmCompositeStress', 'Composite Stress Index')}
              </div>
              <div className={`text-[18px] font-mono font-black ${stressColor(composite.value)}`}>
                {typeof composite.value === 'number' ? composite.value.toFixed(1) : String(composite.value ?? '--')}
              </div>
              <div className={`text-[8px] font-mono font-bold ${spreadChangeColor(composite.change)}`}>
                {fmtChange(composite.change)} vs prev
              </div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-neutral-900 relative">
                {/* Gradient bar */}
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-green-400/30" />
                  <div className="flex-1 bg-yellow-400/30" />
                  <div className="flex-1 bg-orange-400/30" />
                  <div className="flex-1 bg-red-400/30" />
                </div>
                {/* Position marker */}
                {typeof composite.value === 'number' ? (
                  <div
                    className="absolute top-0 w-0.5 h-full bg-white"
                    style={{ left: `${Math.max(0, Math.min(100, composite.value))}%` }}
                  />
                ) : null}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[6px] font-mono text-green-400">LOW</span>
                <span className="text-[6px] font-mono text-yellow-400">MODERATE</span>
                <span className="text-[6px] font-mono text-orange-400">ELEVATED</span>
                <span className="text-[6px] font-mono text-red-400">CRITICAL</span>
              </div>
            </div>
            {composite.level ? (
              <div className={`px-2 py-1 text-[8px] font-mono font-bold uppercase ${stressColor(composite.value)} bg-neutral-900 border border-border/20`}>
                {String(composite.level)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Individual stress indicators */}
      {indicators.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmStressIndicators', 'Stress Indicators')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmIndicator', 'Indicator')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmValue', 'Value')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmChange', 'Chg')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmPercentile', 'Pctile')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmSignal', 'Signal')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmLevel', 'Level')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((r: any, i: number) => {
                  const levelStr = String(r.level ?? '').toUpperCase();
                  const levelColor = levelStr === 'CRITICAL' || levelStr === 'HIGH'
                    ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                    : levelStr === 'ELEVATED' || levelStr === 'MEDIUM'
                      ? 'text-orange-400 bg-orange-500/10 border border-orange-500/30'
                      : levelStr === 'MODERATE'
                        ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
                        : 'text-green-400 bg-green-500/10 border border-green-500/30';

                  return (
                    <tr
                      key={String(r.name ?? i)}
                      className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                    >
                      <td className="px-2 py-1 text-white font-bold sticky left-0 bg-black z-10">
                        {String(r.name ?? '--')}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${stressColor(r.value)}`}>
                        {typeof r.value === 'number' ? r.value.toFixed(1) : String(r.value ?? '--')}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change)}`}>
                        {fmtChange(r.change)}
                      </td>
                      <td className={`px-2 py-1 text-right ${stressColor(r.percentile)}`}>
                        {typeof r.percentile === 'number' ? r.percentile.toFixed(0) + '%' : '--'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {r.signal ? (
                          <span className={`text-[7px] font-bold uppercase ${
                            String(r.signal).toLowerCase() === 'risk off' ? 'text-red-400' :
                            String(r.signal).toLowerCase() === 'risk on' ? 'text-green-400' :
                            'text-neutral-400'
                          }`}>
                            {String(r.signal)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`px-1 py-px text-[7px] font-bold uppercase ${levelColor}`}>
                          {levelStr || '--'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Threshold alerts */}
      {thresholds.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmThresholdAlerts', 'Threshold Alerts')}
            </span>
          </div>
          <div className="divide-y divide-neutral-900">
            {thresholds.map((r: any, i: number) => {
              const breached = r.breached === true;
              return (
                <div
                  key={String(r.name ?? i)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-yellow-400/[0.02]"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-1 ${breached ? 'bg-red-400 animate-pulse' : 'bg-neutral-700'}`} />
                    <span className={`text-[9px] font-mono font-bold ${breached ? 'text-red-400' : 'text-neutral-400'}`}>
                      {String(r.name ?? '--')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono text-neutral-600">
                      THRESHOLD: {typeof r.threshold === 'number' ? r.threshold.toFixed(1) : String(r.threshold ?? '--')}
                    </span>
                    <span className={`text-[8px] font-mono font-bold ${breached ? 'text-red-400' : 'text-neutral-400'}`}>
                      CURRENT: {typeof r.current === 'number' ? r.current.toFixed(1) : String(r.current ?? '--')}
                    </span>
                    {breached ? (
                      <span className="px-1 py-px text-[7px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/30">
                        BREACHED
                      </span>
                    ) : (
                      <span className="px-1 py-px text-[7px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/30">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Historical stress comparison */}
      {history.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmHistoricalComparison', 'Historical Stress Comparison')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmEvent', 'Event')}
                  </th>
                  <th className="text-left px-2 py-1 font-normal">
                    {tr(t, 'gcmPeriod', 'Period')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmPeakStress', 'Peak')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmIgWide', 'IG Wide')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmHyWide', 'HY Wide')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((r: any, i: number) => (
                  <tr
                    key={String(r.event ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-yellow-400 font-bold truncate max-w-[160px] sticky left-0 bg-black z-10">
                      {String(r.event ?? '--')}
                    </td>
                    <td className="px-2 py-1 text-neutral-400">
                      {String(r.period ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${stressColor(r.peakStress)}`}>
                      {typeof r.peakStress === 'number' ? r.peakStress.toFixed(0) : '--'}
                    </td>
                    <td className="px-2 py-1 text-right text-red-400/60">
                      {fmtBps(r.igWidest)}
                    </td>
                    <td className="px-2 py-1 text-right text-red-400/60">
                      {fmtBps(r.hyWidest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}

// -- Regions Tab --

function RegionsTab({ data, t }: { data: any; t: TFn }) {
  const regions = data.regionComparison;
  if (!regions) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'gcmNoRegions', 'No regional data available')}
      </div>
    );
  }

  const overview = regions.overview ?? [];
  const crossBorder = regions.crossBorder ?? [];
  const convergence = regions.convergence ?? [];

  return (
    <>
      {/* Regional overview */}
      {overview.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmRegionalOverview', 'Regional Overview')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmRegion', 'Region')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">IG</th>
                  <th className="text-right px-2 py-1 font-normal">IG CHG</th>
                  <th className="text-right px-2 py-1 font-normal">HY</th>
                  <th className="text-right px-2 py-1 font-normal">HY CHG</th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmDefaultRate', 'Def Rate')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmIssuance', 'Issuance')}
                  </th>
                  <th className="text-center px-2 py-1 font-normal">
                    {tr(t, 'gcmTrend', 'Trend')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.map((r: any, i: number) => {
                  const trendStr = String(r.trend ?? '').toUpperCase();
                  const trendColor = trendStr === 'WIDENING'
                    ? 'text-red-400'
                    : trendStr === 'TIGHTENING'
                      ? 'text-green-400'
                      : 'text-neutral-400';

                  return (
                    <tr
                      key={String(r.region ?? i)}
                      className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                    >
                      <td className="px-2 py-1 text-yellow-400 font-bold sticky left-0 bg-black z-10">
                        {String(r.region ?? '--')}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${spreadLevelColor(r.igSpread)}`}>
                        {fmtBps(r.igSpread)}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.igChange)}`}>
                        {fmtChange(r.igChange)}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${spreadLevelColor(r.hySpread)}`}>
                        {fmtBps(r.hySpread)}
                      </td>
                      <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.hyChange)}`}>
                        {fmtChange(r.hyChange)}
                      </td>
                      <td className={`px-2 py-1 text-right ${defaultRateColor(r.defaultRate)}`}>
                        {fmtRate(r.defaultRate)}
                      </td>
                      <td className="px-2 py-1 text-right text-neutral-400">
                        {r.issuance != null ? String(r.issuance) : '--'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`text-[7px] font-bold uppercase ${trendColor}`}>
                          {trendStr || '--'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Cross-border spreads */}
      {crossBorder.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmCrossBorder', 'Cross-Border Spread Differentials')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="text-neutral-600 uppercase tracking-wider border-b border-border/10">
                  <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                    {tr(t, 'gcmPair', 'Pair')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmDiff', 'Diff (bps)')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmChange', 'Chg')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmZScore', 'Z-Score')}
                  </th>
                  <th className="text-right px-2 py-1 font-normal">
                    {tr(t, 'gcmAvg6m', '6M Avg')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {crossBorder.map((r: any, i: number) => (
                  <tr
                    key={String(r.pair ?? i)}
                    className="border-b border-neutral-900 hover:bg-yellow-400/[0.02]"
                  >
                    <td className="px-2 py-1 text-white font-bold sticky left-0 bg-black z-10">
                      {String(r.pair ?? '--')}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.diff)}`}>
                      {fmtChange(r.diff)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.change)}`}>
                      {fmtChange(r.change)}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(r.zScore)}`}>
                      {typeof r.zScore === 'number' ? r.zScore.toFixed(2) : '--'}
                    </td>
                    <td className="px-2 py-1 text-right text-neutral-400">
                      {fmtBps(r.avg6m)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Convergence / divergence */}
      {convergence.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'gcmConvergence', 'Regional Convergence / Divergence')}
            </span>
          </div>
          <div className="divide-y divide-neutral-900">
            {convergence.map((r: any, i: number) => {
              const isConverging = String(r.direction ?? '').toLowerCase().includes('converg');
              return (
                <div
                  key={String(r.metric ?? i)}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-yellow-400/[0.02]"
                >
                  <span className="text-[9px] font-mono text-white font-bold">
                    {String(r.metric ?? '--')}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono text-neutral-500">
                      {typeof r.dispersion === 'number' ? r.dispersion.toFixed(1) + ' bps' : '--'}
                    </span>
                    <span className={`px-1 py-px text-[7px] font-bold uppercase ${
                      isConverging
                        ? 'text-green-400 bg-green-500/10 border border-green-500/30'
                        : 'text-red-400 bg-red-500/10 border border-red-500/30'
                    }`}>
                      {String(r.direction ?? '--')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
