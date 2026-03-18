import { useSectorCreditSpread } from '../../api/hooks/use-sector-credit-spread';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Interfaces ──

interface SectorRow {
  name: string;
  igSpread: number;
  hySpread: number;
  igChange1w: number;
  igChange1m: number;
  hyChange1w: number;
  hyChange1m: number;
  igPercentile: number;
  hyPercentile: number;
  igZScore: number;
  hyZScore: number;
  igWeight: number;
  hyWeight: number;
  igRating: string;
  hyRating: string;
  igDuration: number;
  hyDuration: number;
  numIssuers: number;
  numIssuersHy: number;
}

interface IgVsHyRow {
  sector: string;
  igSpread: number;
  hySpread: number;
  differential: number;
  historicalAvg: number;
  richCheap: string;
}

interface SectorSummary {
  broadIgSpread: number;
  broadHySpread: number;
  tightestSector: string;
  widestSector: string;
  tightestSectorHy: string;
  widestSectorHy: string;
  avgPercentileIg: number;
  avgPercentileHy: number;
}

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}`;
}

function fmtZScore(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

/** Spread widening (positive change) = red, tightening (negative) = green */
function spreadChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

/** Percentile: >80 = red (wide vs history), <20 = green (tight vs history) */
function percentileColor(n: number): string {
  if (n > 80) return 'text-red-400';
  if (n < 20) return 'text-green-400';
  return 'text-neutral-400';
}

/** Z-Score color coding */
function zScoreColor(n: number): string {
  if (n > 1.5) return 'text-red-400';
  if (n > 0.5) return 'text-orange-400';
  if (n < -1.5) return 'text-green-400';
  if (n < -0.5) return 'text-emerald-400';
  return 'text-neutral-400';
}

/** Rich/Cheap badge styling */
function richCheapStyle(value: string): { text: string; bg: string } {
  const lower = value.toLowerCase();
  if (lower === 'rich') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (lower === 'cheap') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

// ── Main Panel ──

export function SectorCreditSpreadPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSectorCreditSpread();

  const sectors = data?.sectors as SectorRow[] | undefined;
  const igVsHy = data?.igVsHy as IgVsHyRow[] | undefined;
  const summary = data?.summary as SectorSummary | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-red-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {tr(t, 'scsSectorCreditSpreadMonitor', 'Sector Credit Spread Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'scsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {sectors && sectors.length > 0 && <SectorTable sectors={sectors} t={t} />}
            {igVsHy && igVsHy.length > 0 && <IgVsHyTable rows={igVsHy} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: SectorSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30 bg-[#050505]">
      <div className="grid grid-cols-4 divide-x divide-red-400/10">
        <div className="px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsBroadIg', 'Broad IG Spread')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-mono font-bold text-white">
              {fmtBps(summary.broadIgSpread)}
            </span>
            <span className="text-[7px] font-mono text-neutral-600">bps</span>
          </div>
        </div>
        <div className="px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsBroadHy', 'Broad HY Spread')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-mono font-bold text-white">
              {fmtBps(summary.broadHySpread)}
            </span>
            <span className="text-[7px] font-mono text-neutral-600">bps</span>
          </div>
        </div>
        <div className="px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsTightestIg', 'Tightest IG')}
          </div>
          <div className="text-[9px] font-mono font-bold text-green-400 truncate">
            {summary.tightestSector}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mt-0.5">
            {tr(t, 'scsTightestHy', 'Tightest HY')}
          </div>
          <div className="text-[9px] font-mono font-bold text-green-400 truncate">
            {summary.tightestSectorHy}
          </div>
        </div>
        <div className="px-3 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsWidestIg', 'Widest IG')}
          </div>
          <div className="text-[9px] font-mono font-bold text-red-400 truncate">
            {summary.widestSector}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mt-0.5">
            {tr(t, 'scsWidestHy', 'Widest HY')}
          </div>
          <div className="text-[9px] font-mono font-bold text-red-400 truncate">
            {summary.widestSectorHy}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-red-400/10 border-t border-red-400/10">
        <div className="px-3 py-1 flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsAvgPctileIg', 'Avg IG %ile')}
          </span>
          <span className={`text-[9px] font-mono font-bold ${percentileColor(summary.avgPercentileIg)}`}>
            {fmtPct(summary.avgPercentileIg)}
          </span>
        </div>
        <div className="px-3 py-1 flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'scsAvgPctileHy', 'Avg HY %ile')}
          </span>
          <span className={`text-[9px] font-mono font-bold ${percentileColor(summary.avgPercentileHy)}`}>
            {fmtPct(summary.avgPercentileHy)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Sector Table ──

function SectorTable({
  sectors,
  t,
}: {
  sectors: SectorRow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsSectorSpreads', 'Sector Spreads')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-red-400/10">
              <th className="text-left px-2 py-1 font-normal sticky left-0 bg-black z-10">
                {tr(t, 'scsSector', 'Sector')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgSpread', 'IG Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgChg1w', 'IG 1W')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgChg1m', 'IG 1M')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgPctile', 'IG %ile')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgZScore', 'IG Z')}
              </th>
              <th className="text-right px-2 py-1 font-normal border-l border-red-400/10">
                {tr(t, 'scsHySpread', 'HY Spd')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHyChg1w', 'HY 1W')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHyChg1m', 'HY 1M')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHyPctile', 'HY %ile')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHyZScore', 'HY Z')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr
                key={s.name}
                className="border-b border-neutral-900 hover:bg-red-400/[0.02]"
              >
                <td className="px-2 py-1 text-white font-bold truncate max-w-[120px] sticky left-0 bg-black">
                  {s.name}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(s.igSpread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(s.igChange1w)}`}>
                  {fmtChange(s.igChange1w)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(s.igChange1m)}`}>
                  {fmtChange(s.igChange1m)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${percentileColor(s.igPercentile)}`}>
                  {fmtPct(s.igPercentile)}
                </td>
                <td className={`px-2 py-1 text-right ${zScoreColor(s.igZScore)}`}>
                  {fmtZScore(s.igZScore)}
                </td>
                <td className="px-2 py-1 text-right text-white font-bold border-l border-red-400/10">
                  {fmtBps(s.hySpread)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(s.hyChange1w)}`}>
                  {fmtChange(s.hyChange1w)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(s.hyChange1m)}`}>
                  {fmtChange(s.hyChange1m)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${percentileColor(s.hyPercentile)}`}>
                  {fmtPct(s.hyPercentile)}
                </td>
                <td className={`px-2 py-1 text-right ${zScoreColor(s.hyZScore)}`}>
                  {fmtZScore(s.hyZScore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── IG vs HY Differential Table ──

function IgVsHyTable({
  rows,
  t,
}: {
  rows: IgVsHyRow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-red-400/30">
      <div className="px-3 py-1 border-b border-red-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'scsIgVsHy', 'IG vs HY Differential')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-red-400/10">
              <th className="text-left px-2 py-1 font-normal">
                {tr(t, 'scsSector', 'Sector')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsIgSpreadShort', 'IG')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHySpreadShort', 'HY')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsDifferential', 'Diff')}
              </th>
              <th className="text-right px-2 py-1 font-normal">
                {tr(t, 'scsHistAvg', 'Hist Avg')}
              </th>
              <th className="text-center px-2 py-1 font-normal">
                {tr(t, 'scsRichCheap', 'Rich/Cheap')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rcStyle = richCheapStyle(r.richCheap);
              return (
                <tr
                  key={r.sector}
                  className="border-b border-neutral-900 hover:bg-red-400/[0.02]"
                >
                  <td className="px-2 py-1 text-white font-bold truncate max-w-[120px]">
                    {r.sector}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtBps(r.igSpread)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtBps(r.hySpread)}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBps(r.differential)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-500">
                    {fmtBps(r.historicalAvg)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`px-1.5 py-px text-[7px] font-bold uppercase ${rcStyle.text} ${rcStyle.bg}`}>
                      {r.richCheap}
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
