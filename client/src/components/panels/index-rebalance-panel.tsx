import { useIndexRebalance } from '../../api/hooks/use-index-rebalance';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtMktCap(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}T`;
  if (n >= 1) return `${n.toFixed(1)}B`;
  return `${(n * 1000).toFixed(0)}M`;
}

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtShares(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
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

function actionColor(action: string): string {
  const a = action.toUpperCase();
  if (a === 'ADD' || a === 'ADDITION') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (a === 'DELETE' || a === 'DELETION') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

// -- Interfaces --

interface UpcomingRebalance {
  index: string;
  date: string;
  type: string;
}

interface ProjectedChange {
  ticker: string;
  action: string;
  index: string;
  marketCap: number;
  reason: string;
}

interface EstimatedFlow {
  ticker: string;
  shares: number;
  pctAdv: number;
  priceImpactBps: number;
  direction: string;
}

interface HistoricalImpact {
  index: string;
  eventType: string;
  avgMoveAdd: number;
  avgMoveDel: number;
  sampleSize: number;
}

interface PassiveOwnership {
  index: string;
  passivePct: number;
  change1y: number;
  trend: number;
}

interface FloatChange {
  ticker: string;
  lockupExpiry: string;
  sharesUnlocked: number;
  pctFloat: number;
  impact: string;
}

interface SectorWeightShift {
  sector: string;
  currentWt: number;
  projectedWt: number;
  changeBps: number;
}

// -- Main Panel --

export function IndexRebalancePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useIndexRebalance();

  const upcoming = data?.upcomingRebalances as UpcomingRebalance[] | undefined;
  const projectedChanges = data?.projectedChanges as ProjectedChange[] | undefined;
  const estimatedFlows = data?.estimatedFlows as EstimatedFlow[] | undefined;
  const historicalImpact = data?.historicalImpact as HistoricalImpact[] | undefined;
  const passiveOwnership = data?.passiveOwnership as PassiveOwnership[] | undefined;
  const floatChanges = data?.floatChanges as FloatChange[] | undefined;
  const sectorShifts = data?.sectorWeightShifts as SectorWeightShift[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            {tr(t, 'panelIndexRebalance', 'Index Rebalance')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'idxRebalNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {upcoming && upcoming.length > 0 && (
              <UpcomingRebalancesSection rebalances={upcoming} t={t} />
            )}
            {projectedChanges && projectedChanges.length > 0 && (
              <ProjectedChangesSection changes={projectedChanges} t={t} />
            )}
            {estimatedFlows && estimatedFlows.length > 0 && (
              <EstimatedFlowsSection flows={estimatedFlows} t={t} />
            )}
            {historicalImpact && historicalImpact.length > 0 && (
              <HistoricalImpactSection impacts={historicalImpact} t={t} />
            )}
            {passiveOwnership && passiveOwnership.length > 0 && (
              <PassiveOwnershipSection ownership={passiveOwnership} t={t} />
            )}
            {floatChanges && floatChanges.length > 0 && (
              <FloatChangesSection changes={floatChanges} t={t} />
            )}
            {sectorShifts && sectorShifts.length > 0 && (
              <SectorWeightShiftsSection shifts={sectorShifts} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Upcoming Rebalances Section --

function UpcomingRebalancesSection({
  rebalances,
  t,
}: {
  rebalances: UpcomingRebalance[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxUpcoming', 'Upcoming Rebalances')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxIndex', 'Index')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxType', 'Type')}
        </span>
      </div>

      {/* Rows */}
      {rebalances.map((r, i) => (
        <div
          key={`${r.index}-${r.date}-${i}`}
          className="grid grid-cols-[1fr_80px_80px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {r.index}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {r.date}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 uppercase">
            {r.type}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Projected Changes Section --

function ProjectedChangesSection({
  changes,
  t,
}: {
  changes: ProjectedChange[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxProjectedChanges', 'Projected Changes')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_56px_72px_64px_1fr] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'idxAction', 'Action')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxIndex', 'Index')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxMktCap', 'Mkt Cap')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxReason', 'Reason')}
        </span>
      </div>

      {/* Rows */}
      {changes.map((c, i) => (
        <div
          key={`${c.ticker}-${c.action}-${i}`}
          className="grid grid-cols-[56px_56px_72px_64px_1fr] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {c.ticker}
          </span>
          <span className="text-center">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${actionColor(c.action)}`}
            >
              {c.action}
            </span>
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {c.index}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtMktCap(c.marketCap)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {c.reason}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Estimated Flows Section --

function EstimatedFlowsSection({
  flows,
  t,
}: {
  flows: EstimatedFlow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxEstimatedFlows', 'Estimated Flows')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_64px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxShares', 'Shares')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxPctAdv', '% ADV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxPriceImpact', 'Impact (bps)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxDirection', 'Dir')}
        </span>
      </div>

      {/* Rows */}
      {flows.map((f, i) => (
        <div
          key={`${f.ticker}-${i}`}
          className="grid grid-cols-[56px_64px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {f.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(f.shares)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(f.pctAdv)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.priceImpactBps)}`}>
            {fmtBps(f.priceImpactBps)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${f.direction.toUpperCase() === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
            {f.direction.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Historical Impact Section --

function HistoricalImpactSection({
  impacts,
  t,
}: {
  impacts: HistoricalImpact[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxHistoricalImpact', 'Historical Impact')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_64px_64px_48px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxIndex', 'Index')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxEventType', 'Event')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxAvgAdd', 'Avg Add %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxAvgDel', 'Avg Del %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxSample', 'N')}
        </span>
      </div>

      {/* Rows */}
      {impacts.map((imp, i) => (
        <div
          key={`${imp.index}-${imp.eventType}-${i}`}
          className="grid grid-cols-[1fr_72px_64px_64px_48px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {imp.index}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {imp.eventType}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(imp.avgMoveAdd)}`}>
            {fmtChg(imp.avgMoveAdd)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(imp.avgMoveDel)}`}>
            {fmtChg(imp.avgMoveDel)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {imp.sampleSize}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Passive Ownership Section --

function PassiveOwnershipSection({
  ownership,
  t,
}: {
  ownership: PassiveOwnership[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxPassiveOwnership', 'Passive Ownership Trends')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_80px_56px_32px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxIndex', 'Index')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxPassivePct', 'Passive %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxPassiveBar', 'Distribution')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idx1yChg', '1Y Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxTrend', 'Trend')}
        </span>
      </div>

      {/* Rows */}
      {ownership.map((o, i) => (
        <div
          key={`${o.index}-${i}`}
          className="grid grid-cols-[1fr_64px_80px_56px_32px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {o.index}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(o.passivePct)}%
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-16 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-amber-400"
                style={{ width: `${Math.min(o.passivePct, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(o.change1y)}`}>
            {fmtChg(o.change1y)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(o.trend)}`}>
            {trendArrow(o.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Float Changes Section --

function FloatChangesSection({
  changes,
  t,
}: {
  changes: FloatChange[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-amber-400/30">
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxFloatChanges', 'Float Changes (Lock-up Expirations)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_72px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxLockupExpiry', 'Expiry')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxSharesUnlocked', 'Unlocked')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxPctFloat', '% Float')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxImpact', 'Impact')}
        </span>
      </div>

      {/* Rows */}
      {changes.map((c, i) => (
        <div
          key={`${c.ticker}-${c.lockupExpiry}-${i}`}
          className="grid grid-cols-[56px_72px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-amber-400 truncate">
            {c.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {c.lockupExpiry}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtShares(c.sharesUnlocked)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(c.pctFloat)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${c.impact.toUpperCase() === 'HIGH' ? 'text-red-400' : c.impact.toUpperCase() === 'MODERATE' ? 'text-yellow-400' : 'text-neutral-500'}`}>
            {c.impact.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Weight Shifts Section --

function SectorWeightShiftsSection({
  shifts,
  t,
}: {
  shifts: SectorWeightShift[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-amber-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'idxSectorShifts', 'Sector Weight Shifts')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-amber-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'idxSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxCurrent', 'Current')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxProjected', 'Proj.')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'idxChgBps', 'Chg (bps)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'idxShift', 'Shift')}
        </span>
      </div>

      {/* Rows */}
      {shifts.map((s, i) => (
        <div
          key={`${s.sector}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-amber-400/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {s.sector}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(s.currentWt)}%
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(s.projectedWt)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.changeBps)}`}>
            {fmtBps(s.changeBps)}
          </span>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 ${s.changeBps >= 0 ? 'left-1/2' : ''} h-full ${s.changeBps >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                style={{
                  width: `${Math.min(Math.abs(s.changeBps) / 2, 50)}%`,
                  ...(s.changeBps < 0 ? { right: '50%' } : {}),
                }}
              />
              <div className="absolute top-0 left-1/2 w-[1px] h-full bg-neutral-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
