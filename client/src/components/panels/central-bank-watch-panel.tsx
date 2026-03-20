import { useState, useMemo } from 'react';
import { useCentralBankWatch } from '../../api/hooks/use-central-bank-watch';
import { useT, tr, TFn } from '../../i18n';
import { Landmark, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// ── Types ──

interface BankData {
  code: string;
  name: string;
  country: string;
  currency: string;
  currentRate: number;
  lastChangeDate: string;
  lastChangeBps: number;
  lastChangeDirection: string;
  nextMeetingDate: string;
  daysToMeeting: number;
  currentInflation: number;
  inflationTarget: number;
  balanceSheet: string;
  bias: string;
  forwardGuidance: string;
  marketProbHike: number;
  marketProbHold: number;
  marketProbCut: number;
  rateHistory: RateDecision[];
  meetingExpectations?: MeetingExpectation[];
}

interface RateDecision {
  date: string;
  rate: number;
  change: number;
  voteSplit: string;
}

interface MeetingExpectation {
  date: string;
  probHike: number;
  probHold: number;
  probCut: number;
}

interface CentralBankWatchData {
  banks: BankData[];
  timestamp: string;
}

type Tab = 'overview' | 'expectations' | 'guidance' | 'timeline';

// ── Formatting helpers ──

function fmtRate(n: number | undefined): string {
  return (n ?? 0).toFixed(2);
}

function fmtPct(n: number | undefined): string {
  return (n ?? 0).toFixed(1);
}

function fmtBps(n: number | undefined): string {
  const v = n ?? 0;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v}`;
}

function fmtDate(isoDate: string): string {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function fmtDateFull(isoDate: string): string {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Badge helpers ──

function directionArrow(dir: string): { arrow: string; cls: string } {
  if (dir === 'HIKE') return { arrow: '\u25B2', cls: 'text-red-400' };
  if (dir === 'CUT') return { arrow: '\u25BC', cls: 'text-green-400' };
  return { arrow: '\u25AC', cls: 'text-neutral-500' };
}

function biasBadge(bias: string): { text: string; cls: string } {
  const b = (bias || '').toUpperCase();
  if (b === 'HAWKISH') return { text: 'HAWKISH', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (b === 'DOVISH') return { text: 'DOVISH', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function toneBadge(bias: string): { text: string; cls: string } {
  const b = (bias || '').toUpperCase();
  if (b === 'HAWKISH') return { text: 'HAWKISH', cls: 'text-red-400 bg-red-500/10 border border-red-500/20' };
  if (b === 'DOVISH') return { text: 'DOVISH', cls: 'text-green-400 bg-green-500/10 border border-green-500/20' };
  return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/20' };
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '\u{1F1FA}\u{1F1F8}',
  EUR: '\u{1F1EA}\u{1F1FA}',
  JPY: '\u{1F1EF}\u{1F1F5}',
  GBP: '\u{1F1EC}\u{1F1E7}',
  CHF: '\u{1F1E8}\u{1F1ED}',
  AUD: '\u{1F1E6}\u{1F1FA}',
  CAD: '\u{1F1E8}\u{1F1E6}',
  SEK: '\u{1F1F8}\u{1F1EA}',
  NZD: '\u{1F1F3}\u{1F1FF}',
  CNY: '\u{1F1E8}\u{1F1F3}',
};

// ── Main Panel ──

export function CentralBankWatchPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useCentralBankWatch();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = rawData as CentralBankWatchData | undefined;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'panelCentralBankWatch', 'CENTRAL BANK WATCH')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['overview', 'expectations', 'guidance', 'timeline'] as Tab[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeTab === v
                  ? 'text-emerald-400 border-b border-emerald-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v === 'overview' ? 'Overview'
                : v === 'expectations' ? 'Expectations'
                  : v === 'guidance' ? 'Guidance'
                    : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING CENTRAL BANK DATA...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && activeTab === 'overview' && (
          <OverviewView
            data={data}
            selectedBank={selectedBank}
            onSelectBank={setSelectedBank}
          />
        )}
        {data && activeTab === 'expectations' && <ExpectationsView data={data} />}
        {data && activeTab === 'guidance' && <GuidanceView data={data} />}
        {data && activeTab === 'timeline' && <TimelineView data={data} />}
      </div>
    </div>
  );
}

// ── OVERVIEW VIEW ──

function OverviewView({
  data,
  selectedBank,
  onSelectBank,
}: {
  data: CentralBankWatchData;
  selectedBank: string | null;
  onSelectBank: (code: string | null) => void;
}) {
  const sortedByRate = useMemo(
    () => [...(data.banks || [])].sort((a, b) => b.currentRate - a.currentRate),
    [data.banks],
  );

  const maxRate = useMemo(
    () => Math.max(...sortedByRate.map((b) => b.currentRate), 0.01),
    [sortedByRate],
  );

  const selected = useMemo(
    () => (selectedBank ? data.banks?.find((b) => b.code === selectedBank) : null),
    [data.banks, selectedBank],
  );

  return (
    <div>
      {/* Rate Heatmap */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-[#030303]">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1.5 px-1">
          Rate Heatmap
        </div>
        <div className="flex flex-wrap gap-1 px-1">
          {sortedByRate.map((bank) => {
            const dir = directionArrow(bank.lastChangeDirection);
            const bias = biasBadge(bank.bias);
            const intensity = Math.min(bank.currentRate / maxRate, 1);
            return (
              <button
                key={bank.code}
                onClick={() => onSelectBank(selectedBank === bank.code ? null : bank.code)}
                className={`flex items-center gap-1 px-1.5 py-0.5 border transition-colors ${
                  selectedBank === bank.code
                    ? 'border-emerald-400/50 bg-emerald-400/10'
                    : 'border-border/20 hover:border-border/40'
                }`}
                style={{
                  backgroundColor: selectedBank === bank.code
                    ? undefined
                    : `rgba(16, 185, 129, ${0.02 + intensity * 0.08})`,
                }}
              >
                <span className="text-[8px] font-mono font-bold text-white">{bank.code}</span>
                <span className="text-[8px] font-mono font-bold text-emerald-400">
                  {fmtRate(bank.currentRate)}%
                </span>
                <span className={`text-[7px] ${dir.cls}`}>{dir.arrow}</span>
                <span className={`px-0.5 py-0 text-[6px] font-black font-mono uppercase ${bias.cls}`}>
                  {bias.text.slice(0, 3)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div>
        <div className="grid grid-cols-[56px_48px_48px_64px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Bank</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Rate</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Last</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Next Mtg</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Infl/Tgt</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Bal Sheet</span>
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-center">Bias</span>
        </div>

        {sortedByRate.map((bank) => {
          const dir = directionArrow(bank.lastChangeDirection);
          const bias = biasBadge(bank.bias);
          const flag = CURRENCY_FLAGS[bank.currency] || '';
          return (
            <button
              key={bank.code}
              onClick={() => onSelectBank(selectedBank === bank.code ? null : bank.code)}
              className={`w-full grid grid-cols-[56px_48px_48px_64px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center text-left ${
                selectedBank === bank.code ? 'bg-emerald-400/[0.04]' : ''
              }`}
            >
              <span className="text-[8px] font-mono font-bold text-white truncate">
                {flag} {bank.code}
              </span>
              <span className="text-[8px] font-mono font-bold text-emerald-400 text-right">
                {fmtRate(bank.currentRate)}%
              </span>
              <div className="flex items-center justify-end gap-0.5">
                <span className={`text-[7px] ${dir.cls}`}>{dir.arrow}</span>
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtBps(bank.lastChangeBps)}bp
                </span>
              </div>
              <span className="text-[7px] font-mono text-neutral-400 text-right">
                {fmtDate(bank.nextMeetingDate)}
                <span className={`ml-0.5 ${bank.daysToMeeting <= 7 ? 'text-yellow-400' : 'text-neutral-600'}`}>
                  ({bank.daysToMeeting}d)
                </span>
              </span>
              <div className="flex items-center justify-end gap-0.5">
                <span className={`text-[7px] font-mono font-bold ${
                  bank.currentInflation > bank.inflationTarget ? 'text-red-400' : 'text-green-400'
                }`}>
                  {fmtPct(bank.currentInflation)}
                </span>
                <span className="text-[6px] font-mono text-neutral-600">/</span>
                <span className="text-[7px] font-mono text-neutral-500">
                  {fmtPct(bank.inflationTarget)}
                </span>
              </div>
              <span className="text-[7px] font-mono text-neutral-400 text-right truncate">
                {bank.balanceSheet || '--'}
              </span>
              <div className="flex justify-center">
                <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${bias.cls}`}>
                  {bias.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rate History (expandable for selected bank) */}
      {selected && (
        <RateHistorySection bank={selected} onClose={() => onSelectBank(null)} />
      )}

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Rate History Section ──

function RateHistorySection({ bank, onClose }: { bank: BankData; onClose: () => void }) {
  const history = (bank.rateHistory || []).slice(0, 8);

  return (
    <div className="border-t border-emerald-400/20 bg-[#030303]">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-emerald-400">
          {bank.code} Rate History
        </span>
        <button
          onClick={onClose}
          className="text-[7px] font-mono text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          CLOSE
        </button>
      </div>

      <div className="grid grid-cols-[72px_56px_48px_1fr] gap-0 px-3 py-0.5 border-b border-border/10">
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Date</span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right">Change</span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-right pr-1">Vote Split</span>
      </div>

      {history.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600">No history available</div>
      )}

      {history.map((decision, i) => (
        <div
          key={`${decision.date}-${i}`}
          className="grid grid-cols-[72px_56px_48px_1fr] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[7px] font-mono text-neutral-400">{fmtDateFull(decision.date)}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(decision.rate)}%
          </span>
          <span className={`text-[7px] font-mono font-bold text-right ${
            decision.change > 0 ? 'text-red-400' : decision.change < 0 ? 'text-green-400' : 'text-neutral-500'
          }`}>
            {fmtBps(decision.change)}bp
          </span>
          <span className="text-[7px] font-mono text-neutral-500 text-right pr-1">
            {decision.voteSplit || '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── EXPECTATIONS VIEW ──

function ExpectationsView({ data }: { data: CentralBankWatchData }) {
  const majorBanks = useMemo(
    () => (data.banks || []).filter((b) => ['FED', 'ECB', 'BOE'].includes(b.code)),
    [data.banks],
  );

  return (
    <div className="p-2">
      <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2 px-1">
        Market Expectations - Next 3 Meetings
      </div>

      {majorBanks.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          No expectation data available
        </div>
      )}

      {majorBanks.map((bank) => {
        const meetings = (bank.meetingExpectations || []).slice(0, 3);
        const flag = CURRENCY_FLAGS[bank.currency] || '';

        // If no meetingExpectations, fallback to single next meeting probs
        const displayMeetings = meetings.length > 0
          ? meetings
          : [{
              date: bank.nextMeetingDate,
              probHike: bank.marketProbHike,
              probHold: bank.marketProbHold,
              probCut: bank.marketProbCut,
            }];

        return (
          <div key={bank.code} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-[9px] font-mono font-bold text-white">
                {flag} {bank.code}
              </span>
              <span className="text-[7px] font-mono text-neutral-500">{bank.name}</span>
              <span className="text-[8px] font-mono font-bold text-emerald-400 ml-auto">
                {fmtRate(bank.currentRate)}%
              </span>
            </div>

            {displayMeetings.map((mtg, i) => (
              <div
                key={`${bank.code}-${i}`}
                className="flex items-center gap-2 px-1 py-[3px] hover:bg-emerald-400/[0.02] transition-colors"
              >
                <span className="text-[7px] font-mono text-neutral-500 w-[56px] shrink-0">
                  {fmtDate(mtg.date)}
                </span>

                {/* Probability bars */}
                <div className="flex-1 flex h-[8px] overflow-hidden bg-neutral-900">
                  <div
                    className="h-full"
                    style={{ width: `${mtg.probHike}%`, backgroundColor: '#ef4444' }}
                    title={`Hike: ${fmtPct(mtg.probHike)}%`}
                  />
                  <div
                    className="h-full"
                    style={{ width: `${mtg.probHold}%`, backgroundColor: '#4b5563' }}
                    title={`Hold: ${fmtPct(mtg.probHold)}%`}
                  />
                  <div
                    className="h-full"
                    style={{ width: `${mtg.probCut}%`, backgroundColor: '#22c55e' }}
                    title={`Cut: ${fmtPct(mtg.probCut)}%`}
                  />
                </div>

                {/* Labels */}
                <div className="flex gap-1.5 shrink-0">
                  <span className="text-[6px] font-mono text-red-400 w-[32px] text-right">
                    H {fmtPct(mtg.probHike)}
                  </span>
                  <span className="text-[6px] font-mono text-neutral-400 w-[32px] text-right">
                    O {fmtPct(mtg.probHold)}
                  </span>
                  <span className="text-[6px] font-mono text-green-400 w-[32px] text-right">
                    C {fmtPct(mtg.probCut)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1 border-t border-border/10 pt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-[7px] font-mono text-neutral-500">Hike</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#4b5563' }} />
          <span className="text-[7px] font-mono text-neutral-500">Hold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-[7px] font-mono text-neutral-500">Cut</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── GUIDANCE VIEW ──

function GuidanceView({ data }: { data: CentralBankWatchData }) {
  const banks = data.banks || [];

  return (
    <div>
      <div className="px-3 py-1.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Forward Guidance Summary
        </span>
      </div>

      <div className="grid grid-cols-[56px_56px_1fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Bank</span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider text-center">Tone</span>
        <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Key Phrase</span>
      </div>

      {banks.length === 0 && (
        <div className="px-3 py-4 text-center text-[8px] font-mono text-neutral-600">
          No guidance data available
        </div>
      )}

      {banks.map((bank) => {
        const tone = toneBadge(bank.bias);
        const flag = CURRENCY_FLAGS[bank.currency] || '';
        return (
          <div
            key={bank.code}
            className="grid grid-cols-[56px_56px_1fr] gap-0 px-3 py-[4px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">
              {flag} {bank.code}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${tone.cls}`}>
                {tone.text}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-400 truncate">
              {bank.forwardGuidance || 'No recent guidance'}
            </span>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── TIMELINE VIEW ──

function TimelineView({ data }: { data: CentralBankWatchData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const meetings = useMemo(() => {
    return [...(data.banks || [])]
      .sort((a, b) => new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime());
  }, [data.banks]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, BankData[]> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const bank of meetings) {
      const d = new Date(bank.nextMeetingDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(bank);
    }
    return Object.entries(groups);
  }, [meetings]);

  function expectedAction(bank: BankData): { label: string; color: string } {
    if (bank.marketProbHike > bank.marketProbCut && bank.marketProbHike > bank.marketProbHold) {
      return { label: 'HIKE', color: '#ef4444' };
    }
    if (bank.marketProbCut > bank.marketProbHike && bank.marketProbCut > bank.marketProbHold) {
      return { label: 'CUT', color: '#22c55e' };
    }
    return { label: 'HOLD', color: '#6b7280' };
  }

  return (
    <div className="p-2">
      <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2 px-1">
        Upcoming Policy Meetings
      </div>

      {grouped.map(([monthKey, banks]) => (
        <div key={monthKey} className="mb-3">
          <div className="text-[8px] font-black font-mono uppercase tracking-wider text-emerald-400 mb-1 px-1">
            {monthKey}
          </div>

          <div className="relative ml-3 border-l border-emerald-400/20 pl-4">
            {banks.map((bank) => {
              const action = expectedAction(bank);
              const flag = CURRENCY_FLAGS[bank.currency] || '';
              const isExpanded = expanded === bank.code;
              const history = (bank.rateHistory || []).slice(0, 8);

              return (
                <div key={bank.code} className="relative mb-2 last:mb-0">
                  {/* Timeline dot */}
                  <div
                    className="absolute -left-[21px] top-[4px] w-[7px] h-[7px] border border-black"
                    style={{ backgroundColor: action.color }}
                  />

                  {/* Meeting row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : bank.code)}
                    className="w-full flex items-center gap-2 hover:bg-emerald-400/[0.02] px-2 py-1 transition-colors text-left"
                  >
                    <span className="text-[7px] font-mono text-neutral-400 w-[40px] shrink-0">
                      {fmtDate(bank.nextMeetingDate)}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-white">
                      {flag} {bank.code}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-emerald-400 ml-auto">
                      {fmtRate(bank.currentRate)}%
                    </span>
                    <span
                      className="px-1 py-0 text-[6px] font-black font-mono uppercase border"
                      style={{
                        color: action.color,
                        borderColor: `${action.color}40`,
                        backgroundColor: `${action.color}15`,
                      }}
                    >
                      {action.label}
                    </span>
                    <span className="text-[7px] font-mono text-neutral-600">
                      {bank.daysToMeeting}d
                    </span>
                    {history.length > 0 && (
                      isExpanded
                        ? <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
                        : <ChevronRight className="w-2.5 h-2.5 text-neutral-600" />
                    )}
                  </button>

                  {/* Expanded rate history */}
                  {isExpanded && history.length > 0 && (
                    <div className="ml-[48px] mt-0.5 mb-1 border-l border-border/10 pl-2">
                      {history.map((decision, i) => (
                        <div
                          key={`${decision.date}-${i}`}
                          className="flex items-center gap-2 py-[2px] text-[7px] font-mono"
                        >
                          <span className="text-neutral-500 w-[56px]">{fmtDateFull(decision.date)}</span>
                          <span className="text-white font-bold">{fmtRate(decision.rate)}%</span>
                          <span className={`font-bold ${
                            decision.change > 0 ? 'text-red-400'
                              : decision.change < 0 ? 'text-green-400'
                                : 'text-neutral-500'
                          }`}>
                            {fmtBps(decision.change)}bp
                          </span>
                          <span className="text-neutral-600">{decision.voteSplit || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
