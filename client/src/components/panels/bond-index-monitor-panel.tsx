import { useState } from 'react';
import { useBondIndexMonitor } from '../../api/hooks/use-bond-index-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Tab type --

type Tab = 'indices' | 'sector' | 'rating' | 'maturity' | 'performance';

const TABS: { key: Tab; label: string }[] = [
  { key: 'indices', label: 'INDICES' },
  { key: 'sector', label: 'SECTOR' },
  { key: 'rating', label: 'RATING' },
  { key: 'maturity', label: 'MATURITY' },
  { key: 'performance', label: 'PERFORMANCE' },
];

// -- Formatting helpers --

function fmtNum(n: unknown, decimals = 2): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(decimals);
}

function fmtBps(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(0);
}

function fmtChange(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtChangeBps(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

function fmtPct(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(2) + '%';
}

function fmtPctChange(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtYield(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(3) + '%';
}

function fmtDuration(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(2);
}

function fmtWeight(n: unknown): string {
  if (n == null || typeof n !== 'number') return '--';
  return n.toFixed(1) + '%';
}

// -- Color helpers --

// Positive total return = green, negative = red
function returnColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// Spread change: wider = red, tighter = green
function spreadChangeColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// Yield change: higher = red (prices down), lower = green (prices up)
function yieldChangeColor(n: unknown): string {
  if (n == null || typeof n !== 'number') return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// -- Main Panel --

export function BondIndexMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useBondIndexMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('indices');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-blue-400">
            {tr(t, 'bimTitle', 'Bond Index Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-blue-400 transition-colors"
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
                ? 'text-blue-400 border-blue-400 bg-blue-400/[0.04]'
                : 'text-neutral-600 border-transparent hover:text-neutral-400 hover:bg-blue-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d ? (
          <div className="text-center py-8 text-blue-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        ) : error && !d ? (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'bimError', 'Failed to load bond index data')}
          </div>
        ) : d ? (
          <>
            {activeTab === 'indices' ? (
              <IndicesTab indices={d.indices} t={t} />
            ) : activeTab === 'sector' ? (
              <SectorTab sectors={d.sectorBreakdown} t={t} />
            ) : activeTab === 'rating' ? (
              <RatingTab ratings={d.ratingBreakdown} t={t} />
            ) : activeTab === 'maturity' ? (
              <MaturityTab maturities={d.maturityBreakdown} t={t} />
            ) : (
              <PerformanceTab performance={d.performance} t={t} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// -- Section header helper --

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 border-b border-border/10">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </span>
    </div>
  );
}

// -- Table header cell helper --

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={`px-1.5 py-1 text-${align} text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap`}>
      {children}
    </th>
  );
}

// -- Tab 1: Indices --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndicesTab({ indices, t }: { indices: any; t: TFn }) {
  if (!indices || !Array.isArray(indices) || indices.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
        {tr(t, 'bimNoIndices', 'No index data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label={tr(t, 'bimBondIndices', 'Bond Indices')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th>Index</Th>
              <Th align="right">Level</Th>
              <Th align="right">Chg</Th>
              <Th align="right">Yield</Th>
              <Th align="right">Yld Chg</Th>
              <Th align="right">OAS</Th>
              <Th align="right">OAS Chg</Th>
              <Th align="right">Dur</Th>
              <Th align="right">MTD</Th>
              <Th align="right">YTD</Th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {indices.map((row: any, i: number) => (
              <tr
                key={String(row.name || row.index || i)}
                className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold truncate max-w-[140px]">
                  {String(row.name || row.index || '--')}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {fmtNum(row.level)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${returnColor(row.change)}`}>
                  {fmtChange(row.change)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtYield(row.yield)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${yieldChangeColor(row.yieldChange)}`}>
                  {fmtChangeBps(row.yieldChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtBps(row.oas)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadChangeColor(row.oasChange)}`}>
                  {fmtChangeBps(row.oasChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtDuration(row.duration)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.mtdReturn)}`}>
                  {fmtPctChange(row.mtdReturn)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.ytdReturn)}`}>
                  {fmtPctChange(row.ytdReturn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Tab 2: Sector Breakdown --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorTab({ sectors, t }: { sectors: any; t: TFn }) {
  if (!sectors || !Array.isArray(sectors) || sectors.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
        {tr(t, 'bimNoSector', 'No sector data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label={tr(t, 'bimSectorBreakdown', 'Sector Breakdown')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th>Sector</Th>
              <Th align="right">Weight</Th>
              <Th align="right">OAS</Th>
              <Th align="right">OAS Chg</Th>
              <Th align="right">Yield</Th>
              <Th align="right">Dur</Th>
              <Th align="right">MTD</Th>
              <Th align="right">YTD</Th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sectors.map((row: any, i: number) => (
              <tr
                key={String(row.sector || row.name || i)}
                className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold truncate max-w-[130px]">
                  {String(row.sector || row.name || '--')}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-blue-400 font-bold">
                  {fmtWeight(row.weight)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtBps(row.oas)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.oasChange)}`}>
                  {fmtChangeBps(row.oasChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtYield(row.yield)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtDuration(row.duration)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.mtdReturn)}`}>
                  {fmtPctChange(row.mtdReturn)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.ytdReturn)}`}>
                  {fmtPctChange(row.ytdReturn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sector spread bar visualization */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
          {tr(t, 'bimSpreadDistribution', 'Spread Distribution (OAS)')}
        </div>
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {sectors.slice(0, 8).map((row: any, i: number) => {
            const oas = typeof row.oas === 'number' ? row.oas : 0;
            const maxOas = Math.max(...sectors.map((s: any) => (typeof s.oas === 'number' ? s.oas : 0)), 1);
            const pct = (oas / maxOas) * 100;
            return (
              <div key={String(row.sector || row.name || i)} className="flex items-center gap-2">
                <div className="w-16 text-[7px] font-mono text-neutral-500 truncate">
                  {String(row.sector || row.name || '--')}
                </div>
                <div className="flex-1 h-2 bg-neutral-900 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-400/30"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="w-10 text-right text-[7px] font-mono text-neutral-400">
                  {fmtBps(row.oas)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -- Tab 3: Rating Breakdown --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RatingTab({ ratings, t }: { ratings: any; t: TFn }) {
  if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
        {tr(t, 'bimNoRating', 'No rating data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label={tr(t, 'bimRatingBreakdown', 'Rating Breakdown')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th>Rating</Th>
              <Th align="right">Weight</Th>
              <Th align="right">OAS</Th>
              <Th align="right">OAS Chg</Th>
              <Th align="right">Yield</Th>
              <Th align="right">Dur</Th>
              <Th align="right">MTD</Th>
              <Th align="right">YTD</Th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {ratings.map((row: any, i: number) => (
              <tr
                key={String(row.rating || row.name || i)}
                className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap font-bold">
                  <span className={ratingColor(row.rating || row.name)}>
                    {String(row.rating || row.name || '--')}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-blue-400 font-bold">
                  {fmtWeight(row.weight)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtBps(row.oas)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${spreadChangeColor(row.oasChange)}`}>
                  {fmtChangeBps(row.oasChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtYield(row.yield)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtDuration(row.duration)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.mtdReturn)}`}>
                  {fmtPctChange(row.mtdReturn)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.ytdReturn)}`}>
                  {fmtPctChange(row.ytdReturn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rating weight distribution */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
          {tr(t, 'bimRatingWeight', 'Weight by Rating')}
        </div>
        <div className="flex gap-px h-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {ratings.map((row: any, i: number) => {
            const w = typeof row.weight === 'number' ? row.weight : 0;
            return w > 0 ? (
              <div
                key={String(row.rating || row.name || i)}
                className="relative group bg-blue-400/20 hover:bg-blue-400/30 transition-colors"
                style={{ width: `${w}%` }}
                title={`${String(row.rating || row.name || '--')}: ${fmtWeight(row.weight)}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {w > 8 ? (
                    <span className="text-[6px] font-mono text-blue-400 font-bold">
                      {String(row.rating || row.name || '')}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

// Rating color helper
function ratingColor(rating: unknown): string {
  const s = String(rating);
  if (s.startsWith('AAA')) return 'text-green-400';
  if (s.startsWith('AA')) return 'text-emerald-400';
  if (s.startsWith('A') && !s.startsWith('AA')) return 'text-teal-400';
  if (s.startsWith('BBB')) return 'text-yellow-400';
  if (s.startsWith('BB')) return 'text-orange-400';
  if (s.startsWith('B') && !s.startsWith('BB')) return 'text-red-400';
  if (s.startsWith('CCC') || s.startsWith('CC') || s.startsWith('C') || s === 'D') return 'text-red-500';
  return 'text-neutral-400';
}

// -- Tab 4: Maturity Breakdown --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MaturityTab({ maturities, t }: { maturities: any; t: TFn }) {
  if (!maturities || !Array.isArray(maturities) || maturities.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
        {tr(t, 'bimNoMaturity', 'No maturity data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label={tr(t, 'bimMaturityBreakdown', 'Maturity Breakdown')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th>Bucket</Th>
              <Th align="right">Weight</Th>
              <Th align="right">Yield</Th>
              <Th align="right">Yld Chg</Th>
              <Th align="right">OAS</Th>
              <Th align="right">OAS Chg</Th>
              <Th align="right">Dur</Th>
              <Th align="right">Convex</Th>
              <Th align="right">MTD</Th>
              <Th align="right">YTD</Th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {maturities.map((row: any, i: number) => (
              <tr
                key={String(row.bucket || row.maturity || row.name || i)}
                className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                  {String(row.bucket || row.maturity || row.name || '--')}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-blue-400 font-bold">
                  {fmtWeight(row.weight)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtYield(row.yield)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${yieldChangeColor(row.yieldChange)}`}>
                  {fmtChangeBps(row.yieldChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtBps(row.oas)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${spreadChangeColor(row.oasChange)}`}>
                  {fmtChangeBps(row.oasChange)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtDuration(row.duration)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {fmtNum(row.convexity, 2)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.mtdReturn)}`}>
                  {fmtPctChange(row.mtdReturn)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.ytdReturn)}`}>
                  {fmtPctChange(row.ytdReturn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Maturity curve mini visualization */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
          {tr(t, 'bimYieldByMaturity', 'Yield by Maturity Bucket')}
        </div>
        <div className="flex items-end gap-px h-12">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {maturities.map((row: any, i: number) => {
            const y = typeof row.yield === 'number' ? row.yield : 0;
            const maxY = Math.max(...maturities.map((m: any) => (typeof m.yield === 'number' ? m.yield : 0)), 0.01);
            const pct = (y / maxY) * 100;
            return (
              <div
                key={String(row.bucket || row.maturity || row.name || i)}
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div className="text-[6px] font-mono text-blue-400">{fmtPct(row.yield)}</div>
                <div className="w-full bg-neutral-900 relative" style={{ height: '32px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-blue-400/30"
                    style={{ height: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="text-[5px] font-mono text-neutral-600 truncate w-full text-center">
                  {String(row.bucket || row.maturity || row.name || '--')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -- Tab 5: Performance --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PerformanceTab({ performance, t }: { performance: any; t: TFn }) {
  if (!performance || !Array.isArray(performance) || performance.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-600 text-[9px] font-mono uppercase">
        {tr(t, 'bimNoPerformance', 'No performance data available')}
      </div>
    );
  }

  return (
    <div className="border-b border-border/20">
      <SectionHeader label={tr(t, 'bimPerformance', 'Index Performance')} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <Th>Index</Th>
              <Th align="right">1D</Th>
              <Th align="right">1W</Th>
              <Th align="right">MTD</Th>
              <Th align="right">QTD</Th>
              <Th align="right">YTD</Th>
              <Th align="right">1Y</Th>
              <Th align="right">3Y Ann</Th>
              <Th align="right">5Y Ann</Th>
              <Th align="right">Sharpe</Th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {performance.map((row: any, i: number) => (
              <tr
                key={String(row.name || row.index || i)}
                className="border-b border-border/10 hover:bg-blue-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold truncate max-w-[140px]">
                  {String(row.name || row.index || '--')}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${returnColor(row.return1d)}`}>
                  {fmtPctChange(row.return1d)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.return1w)}`}>
                  {fmtPctChange(row.return1w)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.returnMtd)}`}>
                  {fmtPctChange(row.returnMtd)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.returnQtd)}`}>
                  {fmtPctChange(row.returnQtd)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${returnColor(row.returnYtd)}`}>
                  {fmtPctChange(row.returnYtd)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.return1y)}`}>
                  {fmtPctChange(row.return1y)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.return3y)}`}>
                  {fmtPctChange(row.return3y)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right ${returnColor(row.return5y)}`}>
                  {fmtPctChange(row.return5y)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtNum(row.sharpe, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance heatmap mini */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          {tr(t, 'bimReturnHeatmap', 'YTD Return Heatmap')}
        </div>
        <div className="grid grid-cols-4 gap-px">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {performance.slice(0, 12).map((row: any, i: number) => {
            const ytd = typeof row.returnYtd === 'number' ? row.returnYtd : 0;
            const bgIntensity = Math.min(Math.abs(ytd) * 4, 30);
            const bgColor = ytd >= 0
              ? `rgba(74, 222, 128, ${bgIntensity / 100})`
              : `rgba(248, 113, 113, ${bgIntensity / 100})`;
            return (
              <div
                key={String(row.name || row.index || i)}
                className="px-1.5 py-1 border border-border/10"
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-[6px] font-mono text-neutral-500 truncate">
                  {String(row.name || row.index || '--')}
                </div>
                <div className={`text-[8px] font-mono font-bold ${returnColor(row.returnYtd)}`}>
                  {fmtPctChange(row.returnYtd)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
