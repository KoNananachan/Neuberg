import { useCreditDefaultIndex } from '../../api/hooks/use-credit-default-index';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtSpread(n: number): string {
  return n.toFixed(1);
}

function fmtBps(n: number): string {
  return n.toFixed(2);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtVol(n: number): string {
  return n.toFixed(1);
}

// ── Color helpers ──

/** For CDS: widening (positive) = red, tightening (negative) = green */
function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function basisColor(n: number): string {
  if (n < -20) return 'text-red-400';
  if (n < 0) return 'text-yellow-400';
  if (n > 20) return 'text-green-400';
  return 'text-neutral-400';
}

function eventSeverityColor(severity: string): string {
  const s = severity.toUpperCase();
  if (s === 'HIGH' || s === 'CRITICAL') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'MEDIUM' || s === 'MODERATE') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

// ── Interfaces ──

interface IndexSummary {
  cdxIgSpread: number;
  cdxIgChange: number;
  cdxHySpread: number;
  cdxHyChange: number;
  itraxxEuropeSpread: number;
  itraxxEuropeChange: number;
  itraxxXoverSpread: number;
  itraxxXoverChange: number;
}

interface MajorIndex {
  name: string;
  series: string;
  spread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  volume: number;
  openInterest: number;
}

interface RollCalendarEntry {
  index: string;
  currentSeries: string;
  newSeries: string;
  rollDate: string;
  daysToRoll: number;
  rollSpread: number;
}

interface CdsBondBasis {
  name: string;
  rating: string;
  cdsSpread: number;
  bondSpread: number;
  basis: number;
  change1w: number;
  signal: string;
}

interface SingleNameMover {
  entity: string;
  ticker: string;
  spread: number;
  change: number;
  changePct: number;
  direction: string;
}

interface TrancheQuote {
  index: string;
  tranche: string;
  attachment: string;
  spread: number;
  change1d: number;
  correlationImplied: number;
}

interface CreditEvent {
  entity: string;
  eventType: string;
  date: string;
  severity: string;
  recoveryRate: number | null;
  details: string;
}

interface VolumeEntry {
  index: string;
  dailyNotional: number;
  weeklyNotional: number;
  tradeCount: number;
  avgSize: number;
  change1w: number;
}

// ── Main Panel ──

export function CreditDefaultIndexPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditDefaultIndex();

  const summary = data?.summary as IndexSummary | undefined;
  const majorIndices = data?.majorIndices as MajorIndex[] | undefined;
  const rollCalendar = data?.rollCalendar as RollCalendarEntry[] | undefined;
  const cdsBondBasis = data?.cdsBondBasis as CdsBondBasis[] | undefined;
  const singleNameMovers = data?.singleNameMovers as SingleNameMover[] | undefined;
  const trancheTrading = data?.trancheTrading as TrancheQuote[] | undefined;
  const creditEvents = data?.creditEvents as CreditEvent[] | undefined;
  const tradingVolumes = data?.tradingVolumes as VolumeEntry[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-purple-400">
            {tr(t, 'panelCreditDefaultIndex', 'Credit Default Index')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-purple-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} />}
            {majorIndices && majorIndices.length > 0 && (
              <MajorIndicesSection indices={majorIndices} />
            )}
            {rollCalendar && rollCalendar.length > 0 && (
              <RollCalendarSection entries={rollCalendar} />
            )}
            {cdsBondBasis && cdsBondBasis.length > 0 && (
              <CdsBondBasisSection entries={cdsBondBasis} />
            )}
            {singleNameMovers && singleNameMovers.length > 0 && (
              <SingleNameMoversSection movers={singleNameMovers} />
            )}
            {trancheTrading && trancheTrading.length > 0 && (
              <TrancheSection quotes={trancheTrading} />
            )}
            {creditEvents && creditEvents.length > 0 && (
              <CreditEventsSection events={creditEvents} />
            )}
            {tradingVolumes && tradingVolumes.length > 0 && (
              <TradingVolumesSection volumes={tradingVolumes} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: IndexSummary }) {
  return (
    <div className="border-b border-purple-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-purple-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            CDX IG
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[10px] font-mono font-bold text-white">
              {fmtSpread(summary.cdxIgSpread)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(summary.cdxIgChange)}`}>
              {fmtChg(summary.cdxIgChange)}
            </span>
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            CDX HY
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[10px] font-mono font-bold text-white">
              {fmtSpread(summary.cdxHySpread)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(summary.cdxHyChange)}`}>
              {fmtChg(summary.cdxHyChange)}
            </span>
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            iTraxx Europe
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[10px] font-mono font-bold text-white">
              {fmtSpread(summary.itraxxEuropeSpread)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(summary.itraxxEuropeChange)}`}>
              {fmtChg(summary.itraxxEuropeChange)}
            </span>
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            iTraxx Xover
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[10px] font-mono font-bold text-purple-400">
              {fmtSpread(summary.itraxxXoverSpread)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${changeColor(summary.itraxxXoverChange)}`}>
              {fmtChg(summary.itraxxXoverChange)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Major Indices Section ──

function MajorIndicesSection({ indices }: { indices: MajorIndex[] }) {
  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Major Indices
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_48px_48px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Index</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Series</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Vol $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">OI $M</span>
      </div>

      {/* Rows */}
      {indices.map((idx, i) => (
        <div
          key={`${idx.name}-${idx.series}-${i}`}
          className="grid grid-cols-[1fr_48px_56px_48px_48px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{idx.name}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{idx.series}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{fmtSpread(idx.spread)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(idx.change1d)}`}>
            {fmtChg(idx.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(idx.change1w)}`}>
            {fmtChg(idx.change1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(idx.change1m)}`}>
            {fmtChg(idx.change1m)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtVol(idx.volume)}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">{fmtVol(idx.openInterest)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Roll Calendar Section ──

function RollCalendarSection({ entries }: { entries: RollCalendarEntry[] }) {
  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Roll Calendar
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px_48px_56px] gap-0 px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Index</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Current</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">New</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Roll Date</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Days</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Roll Sprd</span>
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div
          key={`${entry.index}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_64px_48px_56px] gap-0 px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{entry.index}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{entry.currentSeries}</span>
          <span className="text-[8px] font-mono text-white font-bold text-right">{entry.newSeries}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{entry.rollDate}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${entry.daysToRoll <= 7 ? 'text-yellow-400' : 'text-neutral-400'}`}>
            {entry.daysToRoll}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(entry.rollSpread)}`}>
            {fmtChg(entry.rollSpread)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CDS-Bond Basis Section ──

function CdsBondBasisSection({ entries }: { entries: CdsBondBasis[] }) {
  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CDS-Bond Basis
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_40px_56px_56px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Rtg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CDS</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Bond</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Basis</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Signal</span>
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div
          key={`${entry.name}-${i}`}
          className="grid grid-cols-[1fr_40px_56px_56px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{entry.name}</span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">{entry.rating}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{fmtSpread(entry.cdsSpread)}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtSpread(entry.bondSpread)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(entry.basis)}`}>
            {fmtChg(entry.basis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(entry.change1w)}`}>
            {fmtChg(entry.change1w)}
          </span>
          <span className="text-[8px] font-mono text-right pr-2">
            {entry.signal ? (
              <span className={`px-1 py-0.5 text-[7px] font-bold ${
                entry.signal === 'NEGATIVE' ? 'text-red-400 bg-red-400/10' :
                entry.signal === 'POSITIVE' ? 'text-green-400 bg-green-400/10' :
                'text-neutral-400 bg-neutral-400/10'
              }`}>
                {entry.signal}
              </span>
            ) : (
              <span className="text-neutral-600">--</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Single Name Movers Section ──

function SingleNameMoversSection({ movers }: { movers: SingleNameMover[] }) {
  const tighteners = movers.filter((m) => m.direction === 'TIGHTER' || m.change < 0);
  const wideners = movers.filter((m) => m.direction === 'WIDER' || m.change > 0);

  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Single Name Movers
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-purple-400/10">
        {/* Tighteners */}
        <div>
          <div className="px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-green-400 uppercase tracking-wider">
              Tightest
            </span>
          </div>
          {tighteners.map((m, i) => (
            <div
              key={`tight-${m.ticker}-${i}`}
              className="flex items-center justify-between px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors"
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{m.ticker}</span>
                <span className="text-[7px] font-mono text-neutral-600 truncate">{m.entity}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-mono text-white font-bold">{fmtSpread(m.spread)}</span>
                <span className="text-[8px] font-mono font-bold text-green-400">
                  {fmtChg(m.change)}
                </span>
              </div>
            </div>
          ))}
          {tighteners.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center">--</div>
          )}
        </div>

        {/* Wideners */}
        <div>
          <div className="px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
            <span className="text-[7px] font-mono font-bold text-red-400 uppercase tracking-wider">
              Widest
            </span>
          </div>
          {wideners.map((m, i) => (
            <div
              key={`wide-${m.ticker}-${i}`}
              className="flex items-center justify-between px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors"
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{m.ticker}</span>
                <span className="text-[7px] font-mono text-neutral-600 truncate">{m.entity}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-mono text-white font-bold">{fmtSpread(m.spread)}</span>
                <span className="text-[8px] font-mono font-bold text-red-400">
                  {fmtChg(m.change)}
                </span>
              </div>
            </div>
          ))}
          {wideners.length === 0 && (
            <div className="px-2 py-2 text-[7px] font-mono text-neutral-600 text-center">--</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tranche Trading Section ──

function TrancheSection({ quotes }: { quotes: TrancheQuote[] }) {
  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Tranche Trading
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_48px_56px] gap-0 px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Index</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Tranche</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Attach</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Impl Corr</span>
      </div>

      {/* Rows */}
      {quotes.map((q, i) => (
        <div
          key={`${q.index}-${q.tranche}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_56px_48px_56px] gap-0 px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{q.index}</span>
          <span className="text-[8px] font-mono text-white font-bold text-right">{q.tranche}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{q.attachment}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{fmtBps(q.spread)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(q.change1d)}`}>
            {fmtChg(q.change1d)}
          </span>
          <span className="text-[8px] font-mono text-purple-400 text-right pr-2">
            {fmtPct(q.correlationImplied)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Credit Events Section ──

function CreditEventsSection({ events }: { events: CreditEvent[] }) {
  return (
    <div className="border-b border-purple-400/30">
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Credit Events
        </span>
      </div>

      {events.map((evt, i) => (
        <div
          key={`${evt.entity}-${i}`}
          className="px-2 py-[4px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-white">{evt.entity}</span>
              <span className={`inline-block px-1 py-0 text-[7px] font-mono font-bold uppercase tracking-wider border ${eventSeverityColor(evt.severity)}`}>
                {evt.severity}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-500">{evt.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-purple-400 uppercase">{evt.eventType}</span>
            {evt.recoveryRate !== null && (
              <span className="text-[7px] font-mono text-neutral-400">
                Recovery: {fmtPct(evt.recoveryRate)}%
              </span>
            )}
          </div>
          <div className="text-[7px] font-mono text-neutral-600 truncate mt-0.5">{evt.details}</div>
        </div>
      ))}
    </div>
  );
}

// ── Trading Volumes Section ──

function TradingVolumesSection({ volumes }: { volumes: VolumeEntry[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-purple-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Trading Volumes
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-purple-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Index</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Daily $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Wkly $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Trades</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">{'\u0394'}1W</span>
      </div>

      {/* Rows */}
      {volumes.map((vol, i) => (
        <div
          key={`${vol.index}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-purple-400/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-purple-400 truncate">{vol.index}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{fmtVol(vol.dailyNotional)}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtVol(vol.weeklyNotional)}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{vol.tradeCount.toLocaleString()}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtVol(vol.avgSize)}</span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(vol.change1w)}`}>
            {fmtChg(vol.change1w)}% {trendArrow(vol.change1w)}
          </span>
        </div>
      ))}
    </div>
  );
}
