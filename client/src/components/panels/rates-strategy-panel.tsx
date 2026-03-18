import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRatesStrategy } from '../../api/hooks/use-rates-strategy';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtYield(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtZscore(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRatio(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2);
}

// -- Color helpers --

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function zscoreColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (Math.abs(n) >= 2) return n > 0 ? 'text-red-400' : 'text-green-400';
  if (Math.abs(n) >= 1) return n > 0 ? 'text-red-400/70' : 'text-green-400/70';
  return 'text-neutral-400';
}

function richCheapColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function signalBadgeStyle(signal: string | null | undefined): { text: string; bg: string } {
  const s = (signal ?? '').toUpperCase();
  if (s === 'RICH') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s === 'CHEAP') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function typeBadgeStyle(type: string | null | undefined): { text: string; bg: string } {
  const s = (type ?? '').toUpperCase();
  if (s === 'FLAT') return { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
  if (s === 'STEEP') return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
  if (s === 'FLY') return { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
  if (s === 'BOX') return { text: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function convictionBadgeStyle(conv: string | null | undefined): { text: string; bg: string } {
  const c = (conv ?? '').toUpperCase();
  if (c === 'HIGH') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (c === 'MEDIUM' || c === 'MED') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function stanceBadgeStyle(stance: string | null | undefined): { text: string; bg: string } {
  const s = (stance ?? '').toUpperCase();
  if (s === 'LONG' || s === 'OVERWEIGHT') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'SHORT' || s === 'UNDERWEIGHT') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
}

// -- Tabs --

const TABS = ['CURVE TRADES', 'CARRY', 'RICH/CHEAP', 'FORWARDS', 'IDEAS'] as const;
type Tab = (typeof TABS)[number];

// -- Main Panel --

export function RatesStrategyPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useRatesStrategy();
  const [activeTab, setActiveTab] = useState<Tab>('CURVE TRADES');

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest animate-pulse">
          LOADING RATES DATA...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          FAILED TO LOAD
        </span>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 text-[8px] font-mono font-bold uppercase text-indigo-400 border border-indigo-400/30 hover:bg-indigo-400/[0.06] transition-colors"
        >
          {tr(t, 'rsRetry', 'Retry')}
        </button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = data ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curveTrades: any[] = d.curveTrades ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carryAnalysis: any[] = d.carryAnalysis ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const richCheap: any[] = d.richCheap ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forwards: any[] = d.forwards ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ideas: any[] = d.ideas ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const durationPositioning: any = d.durationPositioning ?? {};

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'rsTitle', 'Rates Strategy')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Duration Positioning Header */}
      <DurationPositioningBar positioning={durationPositioning} t={t} />

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {TABS.map((tab: any) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-indigo-400 border-b border-indigo-400 bg-indigo-400/[0.04]'
                : 'text-neutral-600 hover:text-neutral-400 hover:bg-indigo-400/[0.02]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'CURVE TRADES' && <CurveTradesTab rows={curveTrades} t={t} />}
        {activeTab === 'CARRY' && <CarryTab rows={carryAnalysis} t={t} />}
        {activeTab === 'RICH/CHEAP' && <RichCheapTab rows={richCheap} t={t} />}
        {activeTab === 'FORWARDS' && <ForwardsTab rows={forwards} t={t} />}
        {activeTab === 'IDEAS' && <IdeasTab rows={ideas} t={t} />}
      </div>
    </div>
  );
}

// -- Duration Positioning Bar --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DurationPositioningBar({ positioning, t }: { positioning: any; t: ReturnType<typeof useT> }) {
  const stance = stanceBadgeStyle(positioning.stance);
  const durationBet = positioning.targetDuration != null && positioning.benchmarkDuration != null
    ? (positioning.targetDuration - positioning.benchmarkDuration).toFixed(2)
    : null;

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">
          {tr(t, 'rsDurationStance', 'Duration Stance')}
        </span>
        <span className={`px-1.5 py-px text-[7px] font-mono font-black uppercase border ${stance.text} ${stance.bg}`}>
          {positioning.stance ?? 'NEUTRAL'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'rsTarget', 'Target')}{' '}
          </span>
          <span className="text-[9px] font-mono font-bold text-white">
            {positioning.targetDuration != null ? positioning.targetDuration.toFixed(2) : '-'}
          </span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'rsBenchmark', 'Benchmark')}{' '}
          </span>
          <span className="text-[9px] font-mono text-neutral-400">
            {positioning.benchmarkDuration != null ? positioning.benchmarkDuration.toFixed(2) : '-'}
          </span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'rsBet', 'Bet')}{' '}
          </span>
          <span className={`text-[9px] font-mono font-bold ${durationBet != null ? changeColor(parseFloat(durationBet)) : 'text-neutral-500'}`}>
            {durationBet != null ? `${parseFloat(durationBet) >= 0 ? '+' : ''}${durationBet}yr` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

// -- Tab 1: Curve Trades --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurveTradesTab({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'rsNoCurveTrades', 'No curve trades available')} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_56px_44px_44px_44px_44px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rsName', 'Name')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'rsType', 'Type')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rs1d', '1D')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rs1w', '1W')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsCarry', 'Carry')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsRoll', 'Roll')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsTotalCarry', 'Total')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsZscore', 'Z')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: any, i: number) => {
        const badge = typeBadgeStyle(row.type);
        return (
          <div
            key={row.name ?? i}
            className="grid grid-cols-[1fr_48px_56px_44px_44px_44px_44px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{row.name ?? '-'}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${badge.text} ${badge.bg}`}>
                {row.type ?? '-'}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-white text-right">{fmtBps(row.currentSpread)}</span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.change1d)}`}>{fmtBps(row.change1d)}</span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.change1w)}`}>{fmtBps(row.change1w)}</span>
            <span className="text-[9px] font-mono text-green-400/80 text-right">{fmtBps(row.carry)}</span>
            <span className="text-[9px] font-mono text-green-400/80 text-right">{fmtBps(row.rolldown)}</span>
            <span className="text-[9px] font-mono font-bold text-green-400 text-right">{fmtBps(row.totalCarry)}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${zscoreColor(row.zscore)}`}>
              {fmtZscore(row.zscore)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- Tab 2: Carry --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CarryTab({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'rsNoCarry', 'No carry data available')} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[56px_60px_60px_52px_52px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsYield', 'Yield')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rs3mFwd', '3M Fwd')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsRolldown', 'Roll')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsCarry', 'Carry')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsTotalReturn', 'Total Rtn')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsBreakeven', 'B/E')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: any, i: number) => (
        <div
          key={row.tenor ?? i}
          className="grid grid-cols-[56px_60px_60px_52px_52px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtYield(row.currentYield)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.forward3m)}</span>
          <span className="text-[9px] font-mono text-green-400/80 text-right">{fmtBps(row.rolldown)}</span>
          <span className="text-[9px] font-mono text-green-400/80 text-right">{fmtBps(row.carry)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.totalReturn)}`}>
            {fmtBps(row.totalReturn)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtBps(row.breakeven)}</span>
        </div>
      ))}
    </div>
  );
}

// -- Tab 3: Rich/Cheap --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RichCheapTab({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'rsNoRichCheap', 'No rich/cheap data available')} />;
  }

  const maxAbsZ = Math.max(...rows.map((r: any) => Math.abs(r.zscore ?? 0)), 0.01);

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[56px_60px_60px_56px_1fr_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsCurrent', 'Current')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsFitted', 'Fitted')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsRCBps', 'R/C (bp)')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'rsZscore', 'Z-Score')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'rsSignal', 'Signal')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: any, i: number) => {
        const signal = signalBadgeStyle(row.signal);
        const rcVal = row.richCheap ?? 0;
        const zVal = row.zscore ?? 0;
        const barPct = maxAbsZ > 0 ? (Math.abs(zVal) / maxAbsZ) * 100 : 0;
        const barIsNeg = zVal < 0;

        return (
          <div
            key={row.tenor ?? i}
            className="grid grid-cols-[56px_60px_60px_56px_1fr_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
            <span className="text-[9px] font-mono text-white text-right">{fmtYield(row.currentYield)}</span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.fittedYield)}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${richCheapColor(rcVal)}`}>
              {fmtBps(rcVal)}
            </span>
            {/* Z-score bar */}
            <div className="flex items-center gap-1 px-1">
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                <div className="absolute top-0 left-1/2 w-px h-full bg-neutral-700" />
                <div
                  className={`absolute top-0 h-full ${barIsNeg ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                  style={{
                    width: `${Math.min(barPct, 100) / 2}%`,
                    ...(barIsNeg
                      ? { right: '50%' }
                      : { left: '50%' }),
                  }}
                />
              </div>
              <span className={`text-[8px] font-mono font-bold w-8 text-right ${zscoreColor(zVal)}`}>
                {fmtZscore(zVal)}
              </span>
            </div>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${signal.text} ${signal.bg}`}>
                {row.signal ?? 'FAIR'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Tab 4: Forwards --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForwardsTab({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'rsNoForwards', 'No forward rate data available')} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[64px_60px_48px_60px_48px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'rsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsSpot', 'Spot')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsSpotChg', 'Chg')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsForward', 'Forward')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsFwdChg', 'Fwd Chg')}
        </span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'rsImpliedHikes', 'Impl Hikes')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: any, i: number) => (
        <div
          key={row.tenor ?? i}
          className="grid grid-cols-[64px_60px_48px_60px_48px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtYield(row.spotRate)}</span>
          <span className={`text-[9px] font-mono text-right ${changeColor(row.spotChange)}`}>
            {fmtBps(row.spotChange)}
          </span>
          <span className="text-[9px] font-mono text-indigo-400 text-right">{fmtYield(row.forwardRate)}</span>
          <span className={`text-[9px] font-mono text-right ${changeColor(row.forwardChange)}`}>
            {fmtBps(row.forwardChange)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.impliedHikes)}`}>
            {fmtRatio(row.impliedHikes)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Tab 5: Ideas --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IdeasTab({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'rsNoIdeas', 'No trade ideas available')} />;
  }

  return (
    <div className="p-2 space-y-2">
      {rows.map((idea: any, i: number) => {
        const conv = convictionBadgeStyle(idea.conviction);
        return (
          <div
            key={idea.strategy ?? i}
            className="border border-border/20 bg-[#030303] hover:bg-indigo-400/[0.02] transition-colors"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/20">
              <span className="text-[9px] font-mono font-bold text-white uppercase">{idea.strategy ?? '-'}</span>
              <span className={`px-1.5 py-px text-[6px] font-mono font-black uppercase border ${conv.text} ${conv.bg}`}>
                {idea.conviction ?? '-'}
              </span>
            </div>

            {/* Rationale */}
            <div className="px-2.5 py-1.5 border-b border-border/20">
              <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'rsRationale', 'Rationale')}
              </span>
              <p className="text-[8px] font-mono text-neutral-400 leading-relaxed mt-0.5">
                {idea.rationale ?? '-'}
              </p>
            </div>

            {/* Levels */}
            <div className="grid grid-cols-4 gap-0 border-b border-border/20">
              <div className="px-2.5 py-1.5 border-r border-border/20">
                <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
                  {tr(t, 'rsEntry', 'Entry')}
                </span>
                <div className="text-[9px] font-mono font-bold text-white mt-0.5">
                  {idea.entry ?? '-'}
                </div>
              </div>
              <div className="px-2.5 py-1.5 border-r border-border/20">
                <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
                  {tr(t, 'rsTarget', 'Target')}
                </span>
                <div className="text-[9px] font-mono font-bold text-green-400 mt-0.5">
                  {idea.target ?? '-'}
                </div>
              </div>
              <div className="px-2.5 py-1.5 border-r border-border/20">
                <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
                  {tr(t, 'rsStop', 'Stop')}
                </span>
                <div className="text-[9px] font-mono font-bold text-red-400 mt-0.5">
                  {idea.stop ?? '-'}
                </div>
              </div>
              <div className="px-2.5 py-1.5">
                <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">
                  {tr(t, 'rsRiskReward', 'Risk/Reward')}
                </span>
                <div className="text-[9px] font-mono font-bold text-indigo-400 mt-0.5">
                  {fmtRatio(idea.riskReward)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Empty State --

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">{label}</span>
    </div>
  );
}
