import { useState, useMemo } from 'react';
import { useRateProbability } from '../../api/hooks/use-rate-probability';
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

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bank = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Meeting = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForwardRate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecentDecision = any;

// ── Constants ──

const BANKS: { code: string; label: string }[] = [
  { code: 'FED', label: 'FED' },
  { code: 'ECB', label: 'ECB' },
  { code: 'BOJ', label: 'BOJ' },
  { code: 'BOE', label: 'BOE' },
  { code: 'BOC', label: 'BOC' },
  { code: 'RBA', label: 'RBA' },
  { code: 'SNB', label: 'SNB' },
  { code: 'RBNZ', label: 'RBNZ' },
];

const RATE_SCENARIOS = ['-75', '-50', '-25', 'UNCH', '+25', '+50', '+75'];

// ── Format helpers ──

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.round(n)}bp`;
}

function fmtDate(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const yr = date.getFullYear().toString().slice(2);
  return `${m}/${day}/${yr}`;
}

function fmtDateShort(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}`;
}

function daysUntil(d: string): number {
  if (!d) return -1;
  const now = new Date();
  const target = new Date(d);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Color helpers ──

function probColor(scenario: string, prob: number): string {
  if (prob < 1) return '';
  const isCut = scenario.startsWith('-');
  const isHike = scenario.startsWith('+');

  if (isCut) {
    if (prob >= 60) return 'bg-green-500/30 text-green-300';
    if (prob >= 30) return 'bg-green-500/15 text-green-400';
    if (prob >= 10) return 'bg-green-500/5 text-green-400/70';
    return 'text-green-400/40';
  }
  if (isHike) {
    if (prob >= 60) return 'bg-red-500/30 text-red-300';
    if (prob >= 30) return 'bg-red-500/15 text-red-400';
    if (prob >= 10) return 'bg-red-500/5 text-red-400/70';
    return 'text-red-400/40';
  }
  // UNCH
  if (prob >= 60) return 'bg-yellow-500/20 text-yellow-300';
  if (prob >= 30) return 'bg-yellow-500/10 text-yellow-400';
  return 'text-yellow-400/50';
}

function hawkDoveColor(score: number): string {
  if (score >= 70) return 'text-red-400';
  if (score >= 55) return 'text-red-300';
  if (score >= 45) return 'text-yellow-400';
  if (score >= 30) return 'text-green-300';
  return 'text-green-400';
}

function hawkDoveLabel(score: number): string {
  if (score >= 70) return 'HAWKISH';
  if (score >= 55) return 'LEAN HAWK';
  if (score >= 45) return 'NEUTRAL';
  if (score >= 30) return 'LEAN DOVE';
  return 'DOVISH';
}

function hawkDoveBarColor(score: number): string {
  if (score >= 70) return 'bg-red-500';
  if (score >= 55) return 'bg-red-400/70';
  if (score >= 45) return 'bg-yellow-400/70';
  if (score >= 30) return 'bg-green-400/70';
  return 'bg-green-500';
}

function decisionColor(actual: string, expected: string): string {
  if (!actual || !expected) return 'text-neutral-400';
  if (actual === expected) return 'text-yellow-400';
  const a = parseFloat(actual);
  const e = parseFloat(expected);
  if (isNaN(a) || isNaN(e)) return 'text-neutral-400';
  if (a > e) return 'text-red-400';
  return 'text-green-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15 bg-[#030303]">
      <div className="w-1 h-1 shrink-0 bg-rose-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-rose-400">
        {title}
      </span>
    </div>
  );
}

// ── Bank Header Info ──

function BankHeader({ bank }: { bank: Bank }) {
  if (!bank) return null;

  const days = daysUntil(bank?.nextMeeting);
  const score = bank?.hawkDoveScore ?? 50;

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {/* Current Rate */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
            Current Rate
          </div>
          <div className="text-[16px] font-mono font-black text-rose-400 tabular-nums leading-none">
            {bank?.currentRate != null ? fmtRate(bank.currentRate) : '--'}
          </div>
          {bank?.rateRange && (
            <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
              Range: {bank.rateRange}
            </div>
          )}
        </div>

        {/* Hawk/Dove Gauge */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
            Hawk/Dove
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono font-black tabular-nums ${hawkDoveColor(score)}`}>
              {score}
            </span>
            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${hawkDoveColor(score)}`}>
              {hawkDoveLabel(score)}
            </span>
          </div>
          {/* Gauge bar */}
          <div className="mt-1 h-1.5 bg-neutral-900 relative">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 opacity-20"
              style={{ width: '100%' }}
            />
            <div
              className={`absolute top-0 h-1.5 w-1 ${hawkDoveBarColor(score)}`}
              style={{ left: `${Math.min(100, Math.max(0, score))}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[6px] font-mono text-green-500/50">DOVE</span>
            <span className="text-[6px] font-mono text-red-500/50">HAWK</span>
          </div>
        </div>

        {/* Next Meeting Countdown */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-0.5">
            Next Meeting
          </div>
          {bank?.nextMeeting ? (
            <>
              <div className="text-[11px] font-mono font-black text-white tabular-nums leading-none">
                {days >= 0 ? `${days}d` : '--'}
              </div>
              <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
                {fmtDate(bank.nextMeeting)}
              </div>
            </>
          ) : (
            <div className="text-[11px] font-mono font-bold text-neutral-600">--</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Meeting Probability Table ──

function MeetingProbTable({ meetings }: { meetings: Meeting[] }) {
  if (!meetings || meetings.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Meeting Rate Probabilities (WIRP)" />

      {/* Column headers */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 px-2 py-1 border-b border-border/15 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
          Meeting
        </span>
        {RATE_SCENARIOS.map((s) => (
          <span
            key={s}
            className={`text-[7px] font-black font-mono uppercase tracking-wider text-center ${
              s.startsWith('-') ? 'text-green-500/50' : s.startsWith('+') ? 'text-red-500/50' : 'text-yellow-500/50'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Meeting rows */}
      {meetings.map((mtg: Meeting, i: number) => {
        const probs = mtg?.probabilities ?? {};
        return (
          <div
            key={mtg?.date ?? i}
            className={`grid grid-cols-[80px_repeat(7,1fr)] gap-0 px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex flex-col justify-center">
              <span className="text-[8px] font-mono font-bold text-white tabular-nums">
                {fmtDateShort(mtg?.date)}
              </span>
              {mtg?.label && (
                <span className="text-[6px] font-mono text-neutral-600 truncate">
                  {mtg.label}
                </span>
              )}
            </div>
            {RATE_SCENARIOS.map((scenario) => {
              const p = probs[scenario] ?? probs[scenario.replace('+', '')] ?? 0;
              return (
                <div
                  key={scenario}
                  className={`flex items-center justify-center text-[8px] font-mono font-bold tabular-nums ${probColor(scenario, p)}`}
                >
                  {p >= 0.5 ? fmtPct(p) : p > 0 ? '<1' : '--'}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Rate Path (text-based chart) ──

function RatePathSection({ meetings }: { meetings: Meeting[] }) {
  if (!meetings || meetings.length === 0) return null;

  const rates = meetings
    .filter((m: Meeting) => m?.impliedRate != null)
    .slice(0, 12);

  if (rates.length === 0) return null;

  const minRate = Math.min(...rates.map((m: Meeting) => m.impliedRate));
  const maxRate = Math.max(...rates.map((m: Meeting) => m.impliedRate));
  const range = maxRate - minRate || 0.25;
  const chartWidth = 32;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Expected Rate Path" />

      <div className="px-2 py-1">
        {rates.map((mtg: Meeting, i: number) => {
          const pct = (mtg.impliedRate - minRate) / range;
          const barLen = Math.max(1, Math.round(pct * chartWidth));
          const prevRate = i > 0 ? rates[i - 1].impliedRate : null;
          const diff = prevRate != null ? (mtg.impliedRate - prevRate) * 100 : null;

          return (
            <div
              key={mtg?.date ?? i}
              className={`flex items-center gap-1 py-0.5 hover:bg-rose-400/[0.02] ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[7px] font-mono text-neutral-500 w-12 shrink-0 tabular-nums">
                {fmtDateShort(mtg?.date)}
              </span>
              <span className="text-[8px] font-mono font-bold text-rose-400 w-12 shrink-0 text-right tabular-nums">
                {fmtRate(mtg.impliedRate)}
              </span>
              <div className="flex-1 flex items-center gap-0.5">
                <div
                  className="h-2 bg-rose-400/40"
                  style={{ width: `${(barLen / chartWidth) * 100}%`, minWidth: 2 }}
                />
                {diff != null && (
                  <span className={`text-[6px] font-mono font-bold tabular-nums ${
                    diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-neutral-600'
                  }`}>
                    {fmtBps(diff)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Forward Curves (OIS-implied) ──

function ForwardCurvesSection({ curves }: { curves: ForwardRate[] }) {
  if (!curves || curves.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="OIS-Implied Forward Rates" />

      {/* Column headers */}
      <div className="grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-1 border-b border-border/15 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
          Tenor
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Rate
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Chg 1D
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Chg 1W
        </span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-right text-neutral-600">
          Chg 1M
        </span>
      </div>

      {curves.map((fwd: ForwardRate, i: number) => (
        <div
          key={fwd?.tenor ?? i}
          className={`grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02] ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[8px] font-mono font-bold text-white">
            {fwd?.tenor ?? '--'}
          </span>
          <span className="text-[9px] font-mono font-black text-rose-400 text-right tabular-nums">
            {fwd?.rate != null ? fmtRate(fwd.rate) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
            (fwd?.change1d ?? 0) > 0 ? 'text-red-400' : (fwd?.change1d ?? 0) < 0 ? 'text-green-400' : 'text-neutral-600'
          }`}>
            {fwd?.change1d != null ? fmtBps(fwd.change1d) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
            (fwd?.change1w ?? 0) > 0 ? 'text-red-400' : (fwd?.change1w ?? 0) < 0 ? 'text-green-400' : 'text-neutral-600'
          }`}>
            {fwd?.change1w != null ? fmtBps(fwd.change1w) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
            (fwd?.change1m ?? 0) > 0 ? 'text-red-400' : (fwd?.change1m ?? 0) < 0 ? 'text-green-400' : 'text-neutral-600'
          }`}>
            {fwd?.change1m != null ? fmtBps(fwd.change1m) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Recent Decisions Ticker ──

function RecentDecisionsTicker({ decisions }: { decisions: RecentDecision[] }) {
  if (!decisions || decisions.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Recent Decisions" />

      {decisions.map((dec: RecentDecision, i: number) => (
        <div
          key={dec?.date ?? i}
          className={`flex items-center gap-2 px-2 py-1 border-b border-border/5 hover:bg-rose-400/[0.02] ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[7px] font-mono text-neutral-500 tabular-nums shrink-0">
            {fmtDate(dec?.date)}
          </span>
          <span className="text-[8px] font-mono font-black text-white shrink-0">
            {dec?.bank ?? '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold tabular-nums shrink-0 ${
            decisionColor(dec?.actual, dec?.expected)
          }`}>
            {dec?.actual ?? '--'}
          </span>
          <span className="text-[6px] font-mono text-neutral-600 shrink-0">vs</span>
          <span className="text-[8px] font-mono text-neutral-400 tabular-nums shrink-0">
            {dec?.expected ?? '--'}
          </span>
          {dec?.actual !== dec?.expected && (
            <span className={`text-[7px] font-mono font-bold uppercase tracking-wider shrink-0 ${
              decisionColor(dec?.actual, dec?.expected)
            }`}>
              {parseFloat(dec?.actual) > parseFloat(dec?.expected) ? 'HAWKISH SURPRISE' : 'DOVISH SURPRISE'}
            </span>
          )}
          {dec?.actual === dec?.expected && (
            <span className="text-[7px] font-mono text-yellow-400/50 uppercase tracking-wider shrink-0">
              AS EXPECTED
            </span>
          )}
          {dec?.marketReaction && (
            <span className="text-[7px] font-mono text-neutral-500 truncate ml-auto">
              {dec.marketReaction}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function RateProbabilityPanel() {
  const t = useT();
  const { data, isLoading, error } = useRateProbability();
  const d = data as Bank;

  const [selectedBank, setSelectedBank] = useState<string>('FED');

  const bankData = useMemo(() => {
    if (!d) return null;
    const banks = d?.banks ?? d?.centralBanks ?? [];
    return banks.find?.((b: Bank) => (b?.code ?? b?.name) === selectedBank) ?? banks?.[0] ?? null;
  }, [d, selectedBank]);

  const availableBanks = useMemo(() => {
    if (!d) return BANKS;
    const banks = d?.banks ?? d?.centralBanks ?? [];
    if (!banks?.length) return BANKS;
    return banks.map((b: Bank) => ({
      code: b?.code ?? b?.name ?? '',
      label: b?.code ?? b?.name ?? '',
    }));
  }, [d]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'panelRateProbability', 'Rate Probability (WIRP)')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div className={`w-1.5 h-1.5 ${isLoading ? 'bg-yellow-400 animate-pulse' : error ? 'bg-red-400' : 'bg-green-400'}`} />
        </div>
      </div>

      {/* Bank Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 bg-[#030303] overflow-x-auto no-scrollbar">
        {(availableBanks as { code: string; label: string }[]).map((bank) => (
          <button
            key={bank.code}
            onClick={() => setSelectedBank(bank.code)}
            className={`px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-colors shrink-0 ${
              selectedBank === bank.code
                ? 'text-rose-400 bg-rose-400/10 border-b border-rose-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {bank.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-rose-400 uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* Error */}
      {error && !d && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase">
            Failed to load
          </span>
        </div>
      )}

      {/* No data */}
      {!d && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            No data
          </span>
        </div>
      )}

      {/* Content */}
      {d && (
        <div className="flex-1 overflow-auto no-scrollbar">
          <BankHeader bank={bankData} />
          <MeetingProbTable meetings={bankData?.meetings ?? bankData?.meetingProbabilities ?? []} />
          <RatePathSection meetings={bankData?.meetings ?? bankData?.ratePath ?? []} />
          <ForwardCurvesSection curves={bankData?.forwardCurves ?? bankData?.oisCurves ?? d?.forwardCurves ?? []} />
          <RecentDecisionsTicker decisions={bankData?.recentDecisions ?? d?.recentDecisions ?? []} />

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
