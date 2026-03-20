import { useMemo } from 'react';
import { useCurveTrade } from '../../api/hooks/use-curve-trade';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtDv01(n: number): string {
  return `$${n.toLocaleString()}`;
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

// ── Color helpers ──

function pnlColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalBadge(signal: string): string {
  const s = signal.toUpperCase();
  if (s === 'BUY') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'SELL') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
}

function typeBadge(type: string): string {
  const t = type.toUpperCase();
  if (t === 'STEEPENER') return 'bg-violet-400/20 text-violet-400 border-violet-400/30';
  if (t === 'FLATTENER') return 'bg-sky-400/20 text-sky-400 border-sky-400/30';
  if (t === 'BUTTERFLY') return 'bg-amber-400/20 text-amber-400 border-amber-400/30';
  if (t === 'BARBELL') return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function carryColor(n: number): string {
  if (n > 3) return 'text-green-400';
  if (n > 0) return 'text-neutral-300';
  if (n < -3) return 'text-red-400';
  return 'text-yellow-400';
}

function spreadChangeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Interfaces ──

interface CurveTradeSummary {
  best2s10s: number;
  best5s30s: number;
  butterflySpread: number;
  avgCarry: number;
  topSignal: string;
  timestamp: string;
}

interface ActiveStrategy {
  name: string;
  type: string;
  currentSpread: number;
  entryLevel: number;
  target: number;
  pnlBps: number;
  dv01: number;
  carryRolldown: number;
  signal: string;
}

interface CarryAnalysisEntry {
  tenor: string;
  yield: number;
  rolldown3m: number;
  rolldown6m: number;
  carry3m: number;
  carry6m: number;
  totalReturn3m: number;
}

interface SpreadHistoryEntry {
  spreadName: string;
  date: string;
  value: number;
}

// ── Main Panel ──

export function CurveTradePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCurveTrade();

  const summary = data?.summary as CurveTradeSummary | undefined;
  const activeStrategies = data?.activeStrategies as ActiveStrategy[] | undefined;
  const carryAnalysis = data?.carryAnalysis as CarryAnalysisEntry[] | undefined;
  const spreadHistory = data?.spreadHistory as SpreadHistoryEntry[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'curveTradeTitle', 'Curve Trade Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'curveTradeNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {activeStrategies && activeStrategies.length > 0 && (
              <ActiveStrategiesSection strategies={activeStrategies} t={t} />
            )}
            {carryAnalysis && carryAnalysis.length > 0 && (
              <CarryAnalysisSection analysis={carryAnalysis} t={t} />
            )}
            {spreadHistory && spreadHistory.length > 0 && (
              <SpreadHistorySection history={spreadHistory} t={t} />
            )}
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
  summary: CurveTradeSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-violet-400/10">
        {/* 2s10s Spread */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'curveTrade2s10s', '2s10s Spread')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${spreadChangeColor(summary.best2s10s)}`}>
            {fmtBps(summary.best2s10s)}<span className="text-[7px] text-neutral-600">bp</span>
          </div>
        </div>

        {/* 5s30s Spread */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'curveTrade5s30s', '5s30s Spread')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${spreadChangeColor(summary.best5s30s)}`}>
            {fmtBps(summary.best5s30s)}<span className="text-[7px] text-neutral-600">bp</span>
          </div>
        </div>

        {/* Butterfly */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'curveTradeButterfly', 'Butterfly')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${spreadChangeColor(summary.butterflySpread)}`}>
            {fmtBps(summary.butterflySpread)}<span className="text-[7px] text-neutral-600">bp</span>
          </div>
        </div>

        {/* Avg Carry */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'curveTradeAvgCarry', 'Avg Carry')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${carryColor(summary.avgCarry)}`}>
            {fmtBps(summary.avgCarry)}<span className="text-[7px] text-neutral-600">bp/m</span>
          </div>
        </div>

        {/* Top Signal */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'curveTradeTopSignal', 'Top Signal')}
          </div>
          <div className="text-[10px] font-mono font-bold text-violet-400 truncate">
            {summary.topSignal}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Active Strategies Section ──

function ActiveStrategiesSection({
  strategies,
  t,
}: {
  strategies: ActiveStrategy[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'curveTradeActiveStrategies', 'Active Strategies')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-violet-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'curveTradeName', 'Name')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'curveTradeType', 'Type')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradeCurrent', 'Current')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradeEntry', 'Entry')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradeTarget', 'Target')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradePnl', 'P&L')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradeDv01', 'DV01')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'curveTradeCarry', 'Carry')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'curveTradeSignal', 'Signal')}</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s, i) => (
              <tr
                key={`${s.name}-${i}`}
                className="border-b border-neutral-900 hover:bg-violet-400/[0.02]"
              >
                <td className="px-2 py-1 text-violet-400 font-bold">{s.name}</td>
                <td className="px-2 py-1 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${typeBadge(s.type)}`}
                  >
                    {s.type}
                  </span>
                </td>
                <td className="px-2 py-1 text-right text-white font-bold">
                  {fmtBps(s.currentSpread)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-400">
                  {fmtBps(s.entryLevel)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-300">
                  {fmtBps(s.target)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${pnlColor(s.pnlBps)}`}>
                  {fmtPnl(s.pnlBps)}
                </td>
                <td className="px-2 py-1 text-right text-neutral-300">
                  {fmtDv01(s.dv01)}
                </td>
                <td className={`px-2 py-1 text-right font-bold ${carryColor(s.carryRolldown)}`}>
                  {fmtBps(s.carryRolldown)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${signalBadge(s.signal)}`}
                  >
                    {s.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Carry Analysis Section ──

function CarryAnalysisSection({
  analysis,
  t,
}: {
  analysis: CarryAnalysisEntry[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'curveTradeCarryAnalysis', 'Carry Analysis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_52px_52px_52px_52px_52px_56px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'curveTradeTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeRoll3m', 'Roll 3M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeRoll6m', 'Roll 6M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeCarry3m', 'Carry 3M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeCarry6m', 'Carry 6M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'curveTradeTotalRet', 'Tot Ret 3M')}
        </span>
      </div>

      {/* Rows */}
      {analysis.map((a) => (
        <div
          key={a.tenor}
          className="grid grid-cols-[40px_52px_52px_52px_52px_52px_56px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{a.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(a.yield)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${carryColor(a.rolldown3m)}`}>
            {fmtBps(a.rolldown3m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${carryColor(a.rolldown6m)}`}>
            {fmtBps(a.rolldown6m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${pnlColor(a.carry3m)}`}>
            {fmtBps(a.carry3m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${pnlColor(a.carry6m)}`}>
            {fmtBps(a.carry6m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${pnlColor(a.totalReturn3m)}`}>
            {fmtBps(a.totalReturn3m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Spread History Section ──

function SpreadHistorySection({
  history,
  t,
}: {
  history: SpreadHistoryEntry[];
  t: ReturnType<typeof useT>;
}) {
  // Group by spreadName, then pivot: each row is a date, columns are spreads
  const { dates, spreadNames, matrix } = useMemo(() => {
    const byName = new Map<string, Map<string, number>>();
    const dateSet = new Set<string>();

    for (const h of history) {
      dateSet.add(h.date);
      if (!byName.has(h.spreadName)) byName.set(h.spreadName, new Map());
      byName.get(h.spreadName)!.set(h.date, h.value);
    }

    const sortedDates = [...dateSet].sort().reverse(); // newest first
    const names = [...byName.keys()];

    const m: Map<string, Map<string, number>> = byName;
    return { dates: sortedDates, spreadNames: names, matrix: m };
  }, [history]);

  return (
    <div>
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'curveTradeSpreadHistory', 'Spread History (Weekly)')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-violet-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'curveTradeDate', 'Date')}</th>
              {spreadNames.map((name) => (
                <th key={name} className="text-right px-2 py-1 font-normal whitespace-nowrap">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => (
              <tr
                key={date}
                className="border-b border-neutral-900 hover:bg-violet-400/[0.02]"
              >
                <td className="px-2 py-1 text-neutral-400">{date}</td>
                {spreadNames.map((name) => {
                  const val = matrix.get(name)?.get(date);
                  return (
                    <td
                      key={`${date}-${name}`}
                      className={`px-2 py-1 text-right font-bold ${val !== undefined ? spreadChangeColor(val) : 'text-neutral-700'}`}
                    >
                      {val !== undefined ? fmtBps(val) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
