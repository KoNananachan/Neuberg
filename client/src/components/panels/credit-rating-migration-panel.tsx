import { useCreditRatingMigration } from '../../api/hooks/use-credit-rating-migration';
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

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtRate(n: number): string {
  return n.toFixed(2);
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function migrationDirectionColor(direction: string): string {
  const d = direction.toUpperCase();
  if (d === 'UPGRADE') return 'text-green-400';
  if (d === 'DOWNGRADE') return 'text-red-400';
  return 'text-neutral-400';
}

function watchColor(direction: string): string {
  const d = direction.toUpperCase();
  if (d === 'POSITIVE') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (d === 'NEGATIVE') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (d === 'DEVELOPING') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

/** Heatmap cell color based on transition probability */
function heatmapColor(prob: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'bg-sky-400/20 text-sky-400 font-bold';
  if (prob >= 5.0) return 'bg-red-400/30 text-red-400';
  if (prob >= 2.0) return 'bg-red-400/15 text-red-300';
  if (prob >= 1.0) return 'bg-yellow-400/15 text-yellow-300';
  if (prob >= 0.1) return 'bg-neutral-800 text-neutral-400';
  if (prob > 0) return 'bg-neutral-900 text-neutral-600';
  return 'bg-black text-neutral-800';
}

function netMigrationColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- Interfaces --

interface MigrationSummary {
  totalActions: number;
  upgrades: number;
  downgrades: number;
  fallenAngels: number;
  risingStars: number;
  watchNegative: number;
}

interface TransitionRow {
  fromRating: string;
  probabilities: number[];
}

interface TransitionMatrix {
  ratings: string[];
  rows: TransitionRow[];
}

interface RatingAction {
  issuer: string;
  sector: string;
  fromRating: string;
  toRating: string;
  agency: string;
  direction: string;
  date: string;
}

interface FallenAngel {
  issuer: string;
  sector: string;
  fromRating: string;
  toRating: string;
  outstandingDebt: number;
  date: string;
}

interface RisingStar {
  issuer: string;
  sector: string;
  fromRating: string;
  toRating: string;
  outstandingDebt: number;
  date: string;
}

interface WatchItem {
  issuer: string;
  currentRating: string;
  agency: string;
  direction: string;
  reason: string;
}

interface SectorMigration {
  sector: string;
  upgrades: number;
  downgrades: number;
  netRatio: number;
  trend: number;
}

interface DefaultRate {
  rating: string;
  rate1y: number;
  rate3y: number;
  rate5y: number;
  change1y: number;
}

interface SpreadByRating {
  rating: string;
  currentSpread: number;
  change1w: number;
  change1m: number;
  percentile90d: number;
}

// -- Main Panel --

export function CreditRatingMigrationPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditRatingMigration();

  const summary = data?.summary as MigrationSummary | undefined;
  const transitionMatrix = data?.transitionMatrix as TransitionMatrix | undefined;
  const recentActions = data?.recentActions as RatingAction[] | undefined;
  const fallenAngels = data?.fallenAngels as FallenAngel[] | undefined;
  const risingStars = data?.risingStars as RisingStar[] | undefined;
  const watchList = data?.watchList as WatchItem[] | undefined;
  const sectorMigration = data?.sectorMigration as SectorMigration[] | undefined;
  const defaultRates = data?.defaultRates as DefaultRate[] | undefined;
  const spreadByRating = data?.spreadByRating as SpreadByRating[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {tr(t, 'panelCreditRatingMigration', 'Credit Rating Migration')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelCreditRatingMigrationNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {transitionMatrix && (
              <TransitionMatrixSection matrix={transitionMatrix} t={t} />
            )}
            {recentActions && recentActions.length > 0 && (
              <RecentActionsSection actions={recentActions} t={t} />
            )}
            {fallenAngels && fallenAngels.length > 0 && (
              <FallenAngelsSection angels={fallenAngels} t={t} />
            )}
            {risingStars && risingStars.length > 0 && (
              <RisingStarsSection stars={risingStars} t={t} />
            )}
            {watchList && watchList.length > 0 && (
              <WatchListSection items={watchList} t={t} />
            )}
            {sectorMigration && sectorMigration.length > 0 && (
              <SectorMigrationSection sectors={sectorMigration} t={t} />
            )}
            {defaultRates && defaultRates.length > 0 && (
              <DefaultRatesSection rates={defaultRates} t={t} />
            )}
            {spreadByRating && spreadByRating.length > 0 && (
              <SpreadByRatingSection spreads={spreadByRating} t={t} />
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
  summary: MigrationSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-sky-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationTotalActions', 'Total Actions')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.totalActions}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationUpgrades', 'Upgrades')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {summary.upgrades}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationDowngrades', 'Downgrades')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {summary.downgrades}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationFallenAngels', 'Fallen Angels')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {summary.fallenAngels}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationRisingStars', 'Rising Stars')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {summary.risingStars}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelCreditRatingMigrationWatchNeg', 'Watch Neg')}
          </div>
          <div className="text-[10px] font-mono font-bold text-yellow-400">
            {summary.watchNegative}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Transition Matrix Heatmap --

function TransitionMatrixSection({
  matrix,
  t,
}: {
  matrix: TransitionMatrix;
  t: ReturnType<typeof useT>;
}) {
  const { ratings, rows } = matrix;

  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationMatrix', 'Transition Matrix (%)')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Column headers: TO ratings */}
          <thead>
            <tr>
              <th className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-left px-1.5 py-1 bg-[#030303] sticky left-0 z-10">
                {tr(t, 'panelCreditRatingMigrationFrom', 'From \\ To')}
              </th>
              {ratings.map((r) => (
                <th
                  key={r}
                  className="text-[7px] font-mono text-sky-400 uppercase tracking-wider text-center px-1 py-1 bg-[#030303] min-w-[36px]"
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.fromRating} className="border-b border-sky-400/5">
                <td className="text-[8px] font-mono font-bold text-sky-400 px-1.5 py-[3px] bg-[#030303] sticky left-0 z-10">
                  {row.fromRating}
                </td>
                {row.probabilities.map((prob, colIdx) => (
                  <td
                    key={`${row.fromRating}-${ratings[colIdx]}`}
                    className={`text-[7px] font-mono text-center px-1 py-[3px] ${heatmapColor(prob, rowIdx === colIdx)}`}
                  >
                    {prob > 0 ? fmtPct(prob) : '\u2014'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Recent Rating Actions --

function RecentActionsSection({
  actions,
  t,
}: {
  actions: RatingAction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationRecentActions', 'Recent Rating Actions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_40px_40px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationFromRtg', 'From')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationToRtg', 'To')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationAgency', 'Agency')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationDirection', 'Dir')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationDate', 'Date')}
        </span>
      </div>

      {/* Rows */}
      {actions.map((action, i) => (
        <div
          key={`${action.issuer}-${i}`}
          className="grid grid-cols-[1fr_72px_40px_40px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {action.issuer}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {action.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-neutral-300 text-center">
            {action.fromRating}
          </span>
          <span className={`text-[8px] font-mono font-bold text-center ${migrationDirectionColor(action.direction)}`}>
            {action.toRating}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-center">
            {action.agency}
          </span>
          <span className={`text-[8px] font-mono font-bold text-center ${migrationDirectionColor(action.direction)}`}>
            {action.direction === 'UPGRADE' ? '\u25B2' : '\u25BC'} {action.direction.slice(0, 2)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {action.date}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Fallen Angels --

function FallenAngelsSection({
  angels,
  t,
}: {
  angels: FallenAngel[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationFallenAngelsTable', 'Fallen Angels')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_40px_40px_64px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationFromRtg', 'From')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationToRtg', 'To')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationDebt', 'Debt $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationDate', 'Date')}
        </span>
      </div>

      {/* Rows */}
      {angels.map((angel, i) => (
        <div
          key={`${angel.issuer}-${i}`}
          className="grid grid-cols-[1fr_72px_40px_40px_64px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {angel.issuer}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {angel.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-neutral-300 text-center">
            {angel.fromRating}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-center">
            {angel.toRating}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(angel.outstandingDebt)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {angel.date}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Rising Stars --

function RisingStarsSection({
  stars,
  t,
}: {
  stars: RisingStar[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationRisingStarsTable', 'Rising Stars')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_40px_40px_64px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationFromRtg', 'From')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationToRtg', 'To')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationDebt', 'Debt $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationDate', 'Date')}
        </span>
      </div>

      {/* Rows */}
      {stars.map((star, i) => (
        <div
          key={`${star.issuer}-${i}`}
          className="grid grid-cols-[1fr_72px_40px_40px_64px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-green-400 truncate">
            {star.issuer}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {star.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-neutral-300 text-center">
            {star.fromRating}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-center">
            {star.toRating}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(star.outstandingDebt)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {star.date}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Watch List --

function WatchListSection({
  items,
  t,
}: {
  items: WatchItem[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationWatchList', 'Watch List')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_64px_1fr] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationIssuer', 'Issuer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationAgency', 'Agency')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'panelCreditRatingMigrationDirection', 'Direction')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationReason', 'Reason')}
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.issuer}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_64px_1fr] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {item.issuer}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-center">
            {item.currentRating}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-center">
            {item.agency}
          </span>
          <div className="flex justify-center">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${watchColor(item.direction)}`}
            >
              {item.direction}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {item.reason}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Migration --

function SectorMigrationSection({
  sectors,
  t,
}: {
  sectors: SectorMigration[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationSectorMigration', 'Sector Migration')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_56px_80px_32px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationUp', 'Up')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationDown', 'Down')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationNetRatio', 'Net Ratio')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationBar', 'Up/Down')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationTrend', 'Trnd')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => (
        <div
          key={sector.sector}
          className="grid grid-cols-[1fr_48px_48px_56px_80px_32px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {sector.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {sector.upgrades}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {sector.downgrades}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${netMigrationColor(sector.netRatio)}`}>
            {fmtChg(sector.netRatio)}
          </span>
          {/* Dual bar: green left / red right from center */}
          <div className="flex items-center justify-end">
            <div className="w-16 h-1.5 bg-neutral-800 relative flex">
              <div className="absolute left-0 top-0 h-full flex w-full">
                <div
                  className="h-full bg-green-400/60"
                  style={{
                    width: `${Math.min((sector.upgrades / Math.max(sector.upgrades + sector.downgrades, 1)) * 100, 100)}%`,
                  }}
                />
                <div
                  className="h-full bg-red-400/60"
                  style={{
                    width: `${Math.min((sector.downgrades / Math.max(sector.upgrades + sector.downgrades, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${netMigrationColor(sector.trend)}`}>
            {sector.trend > 0 ? '\u25B2' : sector.trend < 0 ? '\u25BC' : '\u25C6'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Default Rates by Rating --

function DefaultRatesSection({
  rates,
  t,
}: {
  rates: DefaultRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationDefaultRates', 'Default Rates by Rating')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_56px_56px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration1Y', '1Y %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration3Y', '3Y %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration5Y', '5Y %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration1YChg', '\u03941Y')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationRisk', 'Risk')}
        </span>
      </div>

      {/* Rows */}
      {rates.map((rate) => {
        const riskLevel =
          rate.rate1y >= 5
            ? 'bg-red-400/20 text-red-400'
            : rate.rate1y >= 1
              ? 'bg-yellow-400/20 text-yellow-400'
              : rate.rate1y >= 0.1
                ? 'bg-neutral-800 text-neutral-400'
                : 'bg-green-400/10 text-green-400';
        return (
          <div
            key={rate.rating}
            className="grid grid-cols-[48px_56px_56px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-sky-400">
              {rate.rating}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtPct(rate.rate1y)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtPct(rate.rate3y)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtPct(rate.rate5y)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.change1y)}`}>
              {fmtChg(rate.change1y)}
            </span>
            <div className="flex justify-end pr-2">
              <div className={`w-12 h-1.5 ${riskLevel}`}>
                <div
                  className="h-full bg-current opacity-40"
                  style={{ width: `${Math.min(rate.rate1y * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Spread by Rating --

function SpreadByRatingSection({
  spreads,
  t,
}: {
  spreads: SpreadByRating[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelCreditRatingMigrationSpreadByRating', 'Spread by Rating')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_64px_48px_48px_48px_64px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelCreditRatingMigrationRating', 'Rating')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigrationSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration1WChg', '\u03941W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration1MChg', '\u03941M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelCreditRatingMigration90DPct', '90D %ile')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelCreditRatingMigrationRange', 'Range')}
        </span>
      </div>

      {/* Rows */}
      {spreads.map((s) => {
        const pctColor =
          s.percentile90d >= 90
            ? 'text-red-400'
            : s.percentile90d >= 75
              ? 'text-yellow-400'
              : s.percentile90d <= 10
                ? 'text-green-400'
                : 'text-neutral-400';
        const barColor =
          s.percentile90d >= 90
            ? 'bg-red-400'
            : s.percentile90d >= 75
              ? 'bg-yellow-400'
              : s.percentile90d <= 10
                ? 'bg-green-400'
                : 'bg-neutral-500';
        return (
          <div
            key={s.rating}
            className="grid grid-cols-[48px_64px_48px_48px_48px_64px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-sky-400">
              {s.rating}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtBps(s.currentSpread)}bp
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change1w)}`}>
              {fmtChg(s.change1w)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change1m)}`}>
              {fmtChg(s.change1m)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${pctColor}`}>
              {s.percentile90d}
            </span>
            <div className="flex items-center gap-1 justify-end pr-2">
              <div className="w-16 h-1.5 bg-neutral-800 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${barColor}`}
                  style={{ width: `${Math.min(s.percentile90d, 100)}%` }}
                />
                <div
                  className="absolute top-[-1px] w-[2px] h-[8px] bg-white"
                  style={{ left: `${Math.min(s.percentile90d, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
