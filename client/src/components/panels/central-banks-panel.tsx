import { useMemo, useState } from 'react';
import {
  useCentralBanks,
  type CentralBankResponse,
  type CentralBank,
} from '../../api/hooks/use-central-banks';
import { useT, tr, TFn } from '../../i18n';
import { Landmark, RefreshCw } from 'lucide-react';

// ── Types ──

type View = 'table' | 'calendar' | 'expectations';

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

const BANK_COLORS: Record<string, string> = {
  FED: '#10b981',
  ECB: '#3b82f6',
  BOJ: '#ef4444',
  BOE: '#f59e0b',
  SNB: '#a855f7',
  RBA: '#06b6d4',
  BOC: '#f97316',
  RIKS: '#ec4899',
  RBNZ: '#14b8a6',
  PBOC: '#eab308',
};

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtBps(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}`;
}

function fmtDate(isoDate: string): string {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ── Badge helpers ──

function directionBadge(dir: string): { text: string; cls: string } {
  if (dir === 'HIKE') return { text: 'HIKE', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (dir === 'CUT') return { text: 'CUT', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: 'HOLD', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function biasBadge(bias: string): { text: string; cls: string } {
  if (bias === 'HAWKISH') return { text: 'HAWKISH', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (bias === 'DOVISH') return { text: 'DOVISH', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function globalBiasBadge(bias: string): { text: string; cls: string } {
  if (bias === 'EASING') return { text: 'EASING', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  if (bias === 'TIGHTENING') return { text: 'TIGHTENING', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

// ── Main Panel ──

export function CentralBanksPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCentralBanks();
  const [activeView, setActiveView] = useState<View>('table');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Landmark className="w-3 h-3 text-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-400">
            {tr(t, 'cbTitle', 'Central Bank Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${globalBiasBadge(data.globalBias).cls}`}>
                {globalBiasBadge(data.globalBias).text}
              </span>
              <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30">
                {data.nextMajorMeeting.bank} {data.nextMajorMeeting.daysAway}D
              </span>
            </>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View selector */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['table', 'calendar', 'expectations'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeView === v
                  ? 'text-green-400 border-b border-green-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v === 'table'
                ? tr(t, 'cbTable', 'Table')
                : v === 'calendar'
                  ? tr(t, 'cbCalendar', 'Calendar')
                  : tr(t, 'cbExpectations', 'Expectations')}
            </button>
          ))}
        </div>
        {data && (
          <div className="px-2 py-1 text-[7px] font-mono text-neutral-600">
            {tr(t, 'cbAvgRate', 'Avg Rate')}: {fmtRate(data.globalAvgRate)}%
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbNoData', 'No data available')}
          </div>
        )}

        {data && activeView === 'table' && <TableView data={data} t={t} />}
        {data && activeView === 'calendar' && <CalendarView data={data} t={t} />}
        {data && activeView === 'expectations' && <ExpectationsView data={data} t={t} />}
      </div>
    </div>
  );
}

// ── TABLE VIEW ──

function TableView({ data, t }: { data: CentralBankResponse; t: ReturnType<typeof useT> }) {
  const sorted = useMemo(
    () => [...data.banks].sort((a, b) => a.daysToMeeting - b.daysToMeeting),
    [data.banks],
  );

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[60px_44px_72px_52px_28px_40px_36px_36px_36px_44px_40px_56px_52px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbBank', 'Bank')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbRate', 'Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbLastChg', 'Last Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbNextMtg', 'Next Mtg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbDays', 'D')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbExpChg', 'Exp')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">P(H)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">P(C)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">P(O)</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbYrEnd', 'Yr-End')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbCuts', 'Cuts')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbInflation', 'Infl/Tgt')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">{tr(t, 'cbBias', 'Bias')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">{tr(t, 'cbHist', '20M')}</span>
      </div>

      {/* Rows */}
      {sorted.map((bank) => (
        <BankRow key={bank.code} bank={bank} />
      ))}

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'cbUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function BankRow({ bank }: { bank: CentralBank }) {
  const dir = directionBadge(bank.lastChangeDirection);
  const bias = biasBadge(bank.bias);
  const flag = CURRENCY_FLAGS[bank.currency] || '';

  return (
    <div className="grid grid-cols-[60px_44px_72px_52px_28px_40px_36px_36px_36px_44px_40px_56px_52px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center">
      {/* Bank code + flag */}
      <span className="text-[8px] font-mono font-bold text-white">
        {flag} {bank.code}
      </span>

      {/* Current rate */}
      <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(bank.currentRate)}</span>

      {/* Last change */}
      <div className="flex items-center justify-end gap-1">
        <span className="text-[7px] font-mono text-neutral-500">{fmtDate(bank.lastChangeDate)}</span>
        <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${dir.cls}`}>
          {dir.text}
        </span>
      </div>

      {/* Next meeting */}
      <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtDate(bank.nextMeetingDate)}</span>

      {/* Days to meeting */}
      <span className={`text-[8px] font-mono font-bold text-right ${bank.daysToMeeting <= 7 ? 'text-yellow-400' : bank.daysToMeeting <= 30 ? 'text-green-400' : 'text-neutral-400'}`}>
        {bank.daysToMeeting}
      </span>

      {/* Expected change */}
      <span className={`text-[8px] font-mono font-bold text-right ${
        bank.marketExpectedChange > 0 ? 'text-red-400' : bank.marketExpectedChange < 0 ? 'text-green-400' : 'text-neutral-500'
      }`}>
        {fmtBps(bank.marketExpectedChange)}bp
      </span>

      {/* P(Hike) */}
      <span className={`text-[8px] font-mono text-right ${bank.marketProbHike > 30 ? 'text-red-400 font-bold' : 'text-neutral-500'}`}>
        {fmtPct(bank.marketProbHike)}
      </span>

      {/* P(Cut) */}
      <span className={`text-[8px] font-mono text-right ${bank.marketProbCut > 30 ? 'text-green-400 font-bold' : 'text-neutral-500'}`}>
        {fmtPct(bank.marketProbCut)}
      </span>

      {/* P(Hold) */}
      <span className={`text-[8px] font-mono text-right ${bank.marketProbHold > 60 ? 'text-neutral-300 font-bold' : 'text-neutral-500'}`}>
        {fmtPct(bank.marketProbHold)}
      </span>

      {/* Year-end expected */}
      <span className="text-[8px] font-mono font-bold text-neutral-300 text-right">{fmtRate(bank.yearEndExpected)}</span>

      {/* Total cuts priced */}
      <span className={`text-[8px] font-mono font-bold text-right ${
        bank.totalCutsExpected > 0 ? 'text-green-400' : bank.totalCutsExpected < 0 ? 'text-red-400' : 'text-neutral-500'
      }`}>
        {fmtBps(bank.totalCutsExpected)}
      </span>

      {/* Inflation vs target */}
      <div className="flex items-center justify-end gap-0.5">
        <span className={`text-[7px] font-mono font-bold ${bank.currentInflation > bank.inflationTarget ? 'text-red-400' : 'text-green-400'}`}>
          {fmtPct(bank.currentInflation)}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">/</span>
        <span className="text-[7px] font-mono text-neutral-500">{fmtPct(bank.inflationTarget)}</span>
      </div>

      {/* Bias badge */}
      <div className="flex justify-center">
        <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${bias.cls}`}>
          {bias.text}
        </span>
      </div>

      {/* Rate history sparkline */}
      <div className="flex justify-end pr-1">
        <RateSparkline data={bank.rateHistory} />
      </div>
    </div>
  );
}

// ── Rate Sparkline ──

function RateSparkline({ data }: { data: number[] }) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const W = 44;
    const H = 14;
    const PAD = 1;

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rangeV = maxV - minV || 0.01;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    return { linePath, W, H };
  }, [data]);

  if (!path) return null;

  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const color = lastVal > firstVal ? '#ef4444' : lastVal < firstVal ? '#22c55e' : '#6b7280';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={44} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

// ── CALENDAR VIEW ──

function CalendarView({ data, t }: { data: CentralBankResponse; t: ReturnType<typeof useT> }) {
  const meetings = useMemo(() => {
    return [...data.banks]
      .sort((a, b) => new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime());
  }, [data.banks]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, CentralBank[]> = {};
    for (const bank of meetings) {
      const d = new Date(bank.nextMeetingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(bank);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [meetings]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function expectedAction(bank: CentralBank): { label: string; color: string } {
    if (bank.marketProbHike > bank.marketProbCut && bank.marketProbHike > bank.marketProbHold) {
      return { label: 'HIKE', color: '#ef4444' };
    }
    if (bank.marketProbCut > bank.marketProbHike && bank.marketProbCut > bank.marketProbHold) {
      return { label: 'CUT', color: '#22c55e' };
    }
    return { label: 'HOLD', color: '#6b7280' };
  }

  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-3">
        {tr(t, 'cbUpcoming', 'Upcoming Meeting Calendar')}
      </div>

      {grouped.map(([monthKey, banks]) => {
        const [year, month] = monthKey.split('-');
        const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;

        return (
          <div key={monthKey} className="mb-4">
            <div className="text-[8px] font-black font-mono uppercase tracking-wider text-green-400 mb-1 px-1">
              {monthLabel}
            </div>

            {/* Timeline */}
            <div className="relative ml-3 border-l border-green-400/20 pl-4">
              {banks.map((bank) => {
                const action = expectedAction(bank);
                const d = new Date(bank.nextMeetingDate);
                const dayStr = `${d.getDate()} ${monthNames[d.getMonth()]}`;
                const flag = CURRENCY_FLAGS[bank.currency] || '';

                return (
                  <div key={bank.code} className="relative mb-2 last:mb-0">
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[21px] top-[3px] w-[7px] h-[7px] border border-black"
                      style={{ backgroundColor: action.color }}
                    />

                    {/* Meeting card */}
                    <div className="flex items-center gap-2 hover:bg-green-400/[0.02] px-2 py-1 transition-colors">
                      <span className="text-[8px] font-mono text-neutral-400 w-[44px]">{dayStr}</span>
                      <span className="text-[9px] font-mono font-bold text-white">{flag} {bank.code}</span>
                      <span className="text-[7px] font-mono text-neutral-500">{bank.name}</span>
                      <span className="text-[8px] font-mono font-bold text-white ml-auto">{fmtRate(bank.currentRate)}%</span>
                      <span
                        className="px-1.5 py-0 text-[6px] font-black font-mono uppercase border"
                        style={{
                          color: action.color,
                          borderColor: `${action.color}40`,
                          backgroundColor: `${action.color}15`,
                        }}
                      >
                        {action.label} {fmtPct(
                          action.label === 'HIKE' ? bank.marketProbHike
                            : action.label === 'CUT' ? bank.marketProbCut
                              : bank.marketProbHold
                        )}%
                      </span>
                      <span className="text-[7px] font-mono text-neutral-600">{bank.daysToMeeting}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="mt-3 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'cbUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── EXPECTATIONS VIEW ──

function ExpectationsView({ data, t }: { data: CentralBankResponse; t: ReturnType<typeof useT> }) {
  const majorBanks = useMemo(
    () => data.banks.filter((b) => ['FED', 'ECB', 'BOE', 'BOJ'].includes(b.code)),
    [data.banks],
  );

  return (
    <div className="p-3 space-y-5">
      {/* Rate Path Chart */}
      <div>
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'cbRatePath', 'Rate Path - Current to Year-End Expected')}
        </div>
        <RatePathChart banks={majorBanks} />
      </div>

      {/* Probability Distribution */}
      <div>
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'cbProbDist', 'Next Meeting - Probability Distribution')}
        </div>
        <ProbabilityBars banks={data.banks} />
      </div>

      {/* Total Cuts/Hikes Priced */}
      <div>
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'cbTotalPriced', 'Total Cuts/Hikes Priced - Next 12 Months (bps)')}
        </div>
        <CutsHikesChart banks={data.banks} />
      </div>

      {/* Timestamp */}
      <div className="pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'cbUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ── Rate Path Chart (SVG) ──

function RatePathChart({ banks }: { banks: CentralBank[] }) {
  const W = 420;
  const H = 180;
  const PAD_L = 38;
  const PAD_R = 44;
  const PAD_T = 16;
  const PAD_B = 24;

  // Find rate range
  const allRates = banks.flatMap((b) => [b.currentRate, b.yearEndExpected]);
  const minRate = Math.min(...allRates) - 0.3;
  const maxRate = Math.max(...allRates) + 0.3;
  const rateRange = maxRate - minRate || 1;

  const scaleY = (rate: number) => PAD_T + ((maxRate - rate) / rateRange) * (H - PAD_T - PAD_B);
  const xStart = PAD_L + 20;
  const xEnd = W - PAD_R - 20;

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = rateRange > 4 ? 1 : rateRange > 2 ? 0.5 : 0.25;
  for (let r = Math.ceil(minRate / step) * step; r <= maxRate; r += step) {
    yTicks.push(Math.round(r * 100) / 100);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Grid */}
      {yTicks.map((r) => (
        <g key={r}>
          <line x1={PAD_L} y1={scaleY(r)} x2={W - PAD_R} y2={scaleY(r)} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
          <text x={PAD_L - 4} y={scaleY(r) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
            {r.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      <text x={xStart} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">Current</text>
      <text x={xEnd} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">Yr-End</text>

      {/* Bank paths */}
      {banks.map((bank) => {
        const y1 = scaleY(bank.currentRate);
        const y2 = scaleY(bank.yearEndExpected);
        const color = BANK_COLORS[bank.code] || '#22c55e';

        return (
          <g key={bank.code}>
            {/* Path line */}
            <line x1={xStart} y1={y1} x2={xEnd} y2={y2} stroke={color} strokeWidth={1.5} strokeDasharray="4,2" opacity={0.8} />

            {/* Current rate dot */}
            <circle cx={xStart} cy={y1} r={3} fill={color} stroke="black" strokeWidth={0.5} />

            {/* Year-end dot */}
            <circle cx={xEnd} cy={y2} r={3} fill={color} stroke="black" strokeWidth={0.5} />

            {/* Labels */}
            <text x={xStart - 6} y={y1 + 3} textAnchor="end" fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold">
              {bank.code} {fmtRate(bank.currentRate)}
            </text>
            <text x={xEnd + 4} y={y2 + 3} textAnchor="start" fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold">
              {fmtRate(bank.yearEndExpected)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Probability Bars ──

function ProbabilityBars({ banks }: { banks: CentralBank[] }) {
  const sorted = useMemo(
    () => [...banks].sort((a, b) => a.daysToMeeting - b.daysToMeeting),
    [banks],
  );

  return (
    <div className="space-y-1">
      {sorted.map((bank) => {
        const flag = CURRENCY_FLAGS[bank.currency] || '';
        return (
          <div key={bank.code} className="flex items-center gap-2 hover:bg-green-400/[0.02] px-1 py-[2px] transition-colors">
            <span className="text-[8px] font-mono font-bold text-white w-[52px]">{flag} {bank.code}</span>

            {/* Stacked probability bar */}
            <div className="flex-1 flex h-[10px] overflow-hidden bg-neutral-900">
              {/* Hike portion */}
              <div
                className="h-full"
                style={{ width: `${bank.marketProbHike}%`, backgroundColor: '#ef4444' }}
                title={`Hike: ${fmtPct(bank.marketProbHike)}%`}
              />
              {/* Hold portion */}
              <div
                className="h-full"
                style={{ width: `${bank.marketProbHold}%`, backgroundColor: '#4b5563' }}
                title={`Hold: ${fmtPct(bank.marketProbHold)}%`}
              />
              {/* Cut portion */}
              <div
                className="h-full"
                style={{ width: `${bank.marketProbCut}%`, backgroundColor: '#22c55e' }}
                title={`Cut: ${fmtPct(bank.marketProbCut)}%`}
              />
            </div>

            {/* Labels */}
            <div className="flex gap-2 w-[130px] shrink-0">
              <span className="text-[7px] font-mono text-red-400 w-[40px] text-right">H {fmtPct(bank.marketProbHike)}</span>
              <span className="text-[7px] font-mono text-neutral-400 w-[40px] text-right">O {fmtPct(bank.marketProbHold)}</span>
              <span className="text-[7px] font-mono text-green-400 w-[40px] text-right">C {fmtPct(bank.marketProbCut)}</span>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
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
    </div>
  );
}

// ── Cuts/Hikes Bar Chart ──

function CutsHikesChart({ banks }: { banks: CentralBank[] }) {
  const sorted = useMemo(
    () => [...banks].sort((a, b) => b.totalCutsExpected - a.totalCutsExpected),
    [banks],
  );

  const maxAbs = Math.max(...sorted.map((b) => Math.abs(b.totalCutsExpected)), 1);

  const W = 420;
  const H = sorted.length * 18 + 20;
  const PAD_L = 52;
  const PAD_R = 40;
  const BAR_H = 10;
  const ROW_H = 18;
  const centerX = PAD_L + (W - PAD_L - PAD_R) / 2;
  const halfWidth = (W - PAD_L - PAD_R) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Center line */}
      <line x1={centerX} y1={4} x2={centerX} y2={H - 16} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

      {/* Zero label */}
      <text x={centerX} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">0</text>

      {/* Negative (hikes) label */}
      <text x={PAD_L} y={H - 4} textAnchor="start" fill="rgba(239,68,68,0.5)" fontSize={7} fontFamily="monospace">Hikes</text>

      {/* Positive (cuts) label */}
      <text x={W - PAD_R} y={H - 4} textAnchor="end" fill="rgba(34,197,94,0.5)" fontSize={7} fontFamily="monospace">Cuts</text>

      {banks.length > 0 && sorted.map((bank, i) => {
        const y = 6 + i * ROW_H;
        const barW = (Math.abs(bank.totalCutsExpected) / maxAbs) * halfWidth;
        const flag = CURRENCY_FLAGS[bank.currency] || '';
        const isCut = bank.totalCutsExpected >= 0;
        const color = isCut ? '#22c55e' : '#ef4444';
        const barX = isCut ? centerX : centerX - barW;

        return (
          <g key={bank.code}>
            {/* Bank label */}
            <text x={PAD_L - 4} y={y + BAR_H - 1} textAnchor="end" fill="rgba(255,255,255,0.7)" fontSize={7} fontFamily="monospace" fontWeight="bold">
              {flag} {bank.code}
            </text>

            {/* Bar */}
            <rect x={barX} y={y} width={barW} height={BAR_H} fill={color} opacity={0.7} />

            {/* Value label */}
            <text
              x={isCut ? centerX + barW + 4 : centerX - barW - 4}
              y={y + BAR_H - 1}
              textAnchor={isCut ? 'start' : 'end'}
              fill={color}
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtBps(bank.totalCutsExpected)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
