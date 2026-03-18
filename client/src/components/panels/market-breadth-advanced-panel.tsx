import { useState } from 'react';
import { useMarketBreadthAdvanced } from '../../api/hooks/use-market-breadth-advanced';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

type TabKey = 'adLine' | 'highsLows' | 'mcclellan' | 'aboveMa' | 'sectors';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'adLine', label: 'A/D LINE' },
  { key: 'highsLows', label: 'HIGHS/LOWS' },
  { key: 'mcclellan', label: 'MCCLELLAN' },
  { key: 'aboveMa', label: '% ABOVE MA' },
  { key: 'sectors', label: 'SECTORS' },
];

// ── Helpers ──

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function signalBadgeColor(signal: string): string {
  const s = signal.toUpperCase();
  if (s === 'BULLISH' || s === 'STRONG BULLISH') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (s === 'BEARISH' || s === 'STRONG BEARISH') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (s === 'OVERBOUGHT') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (s === 'OVERSOLD') return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
}

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function SignalBadge({ signal }: { signal: string }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${signalBadgeColor(signal)}`}>
      {signal}
    </span>
  );
}

// ── Summary Header ──

function SummaryHeader({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-[#030303]">
      <div className="flex items-center gap-2">
        <SignalBadge signal={summary.overallSignal || 'NEUTRAL'} />
        <div className="flex items-center gap-1.5 text-[8px] font-mono">
          <span className="text-emerald-400">{summary.bullishCount || 0} BULL</span>
          <span className="text-neutral-600">|</span>
          <span className="text-red-400">{summary.bearishCount || 0} BEAR</span>
        </div>
      </div>
      <span className="text-[8px] font-mono text-neutral-500 max-w-[50%] truncate">
        {summary.message || ''}
      </span>
    </div>
  );
}

// ── Tab: A/D Line ──

function ADLineTab({ data }: { data: any }) {
  const ad = data?.adLine;
  if (!ad) return <NoData />;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        <StatCell label="ADVANCES" value={String(ad.advances ?? 0)} color="text-emerald-400" />
        <StatCell label="DECLINES" value={String(ad.declines ?? 0)} color="text-red-400" />
        <StatCell label="UNCHANGED" value={String(ad.unchanged ?? 0)} color="text-neutral-500" />
        <StatCell label="A/D RATIO" value={fmt(ad.adRatio ?? 0)} color={ad.adRatio >= 1 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCell label="NET ADV" value={`${(ad.netAdvances ?? 0) >= 0 ? '+' : ''}${ad.netAdvances ?? 0}`} color={changeColor(ad.netAdvances ?? 0)} />
        <StatCell label="SIGNAL" badge={ad.signal} />
      </div>

      {/* AD Line value */}
      <div className="border border-border/20 p-3 bg-[#020202]">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">A/D LINE VALUE</div>
        <div className="text-2xl font-black font-mono text-sky-400">{fmt(ad.value ?? 0, 0)}</div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">5D MA</span>
            <span className="text-[9px] font-mono text-neutral-300">{fmt(ad.ma5d ?? 0, 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">20D MA</span>
            <span className="text-[9px] font-mono text-neutral-300">{fmt(ad.ma20d ?? 0, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Highs/Lows ──

function HighsLowsTab({ data }: { data: any }) {
  const hl = data?.highsLows;
  if (!hl) return <NoData />;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Counts */}
      <div className="flex items-stretch gap-px">
        <div className="flex-1 bg-[#020202] border border-border/20 p-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">NEW 52W HIGHS</span>
          <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">{hl.newHighs ?? 0}</span>
        </div>
        <div className="flex-1 bg-[#020202] border border-border/20 p-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">NEW 52W LOWS</span>
          <span className="text-xl font-black font-mono text-red-400 mt-0.5">{hl.newLows ?? 0}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <StatCell label="H/L RATIO" value={fmt(hl.ratio ?? 0)} color={hl.ratio >= 1 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCell label="DIFFERENTIAL" value={`${(hl.differential ?? 0) >= 0 ? '+' : ''}${hl.differential ?? 0}`} color={changeColor(hl.differential ?? 0)} />
        <StatCell label="10D MA" value={fmt(hl.ma10d ?? 0)} color="text-neutral-300" />
        <StatCell label="% OF TOTAL" value={`${fmt(hl.percentage ?? 0, 1)}%`} color="text-neutral-300" />
      </div>

      {/* Signal */}
      <div className="flex items-center justify-center pt-1">
        <SignalBadge signal={hl.signal || 'NEUTRAL'} />
      </div>
    </div>
  );
}

// ── Tab: McClellan ──

function McClellanTab({ data }: { data: any }) {
  const mc = data?.mcclellan;
  if (!mc) return <NoData />;

  const oscColor = (mc.oscillator ?? 0) > 0 ? 'text-emerald-400' : (mc.oscillator ?? 0) < 0 ? 'text-red-400' : 'text-neutral-400';

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Oscillator display */}
      <div className="border border-border/20 bg-[#020202] p-4 flex flex-col items-center">
        <div className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-1">MCCLELLAN OSCILLATOR</div>
        <div className={`text-3xl font-black font-mono ${oscColor}`}>
          {(mc.oscillator ?? 0) > 0 ? '+' : ''}{fmt(mc.oscillator ?? 0, 1)}
        </div>
        <div className="mt-2">
          <SignalBadge signal={mc.signal || 'NEUTRAL'} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <StatCell label="SUMMATION IDX" value={fmt(mc.summationIndex ?? 0, 0)} color="text-neutral-300" />
        <StatCell label="ZERO CROSSINGS" value={String(mc.zeroCrossings ?? 0)} color="text-sky-400" />
      </div>

      <div className="border border-border/20 bg-[#020202] px-3 py-2 flex items-center justify-between">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TREND DIRECTION</span>
        <span className={`text-[9px] font-black font-mono uppercase ${
          mc.trendDirection === 'UP' ? 'text-emerald-400' : mc.trendDirection === 'DOWN' ? 'text-red-400' : 'text-neutral-400'
        }`}>
          {mc.trendDirection || 'FLAT'}
        </span>
      </div>
    </div>
  );
}

// ── Tab: % Above MA ──

function AboveMaTab({ data }: { data: any }) {
  const maData = data?.aboveMa;
  if (!maData || !Array.isArray(maData)) return <NoData />;

  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-1 pb-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">PERIOD</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">% ABOVE</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">CHG</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">LEVEL</span>
      </div>
      {maData.map((row: any, i: number) => {
        const pct = row.percentAbove ?? 0;
        const chg = row.change ?? 0;
        const barColor = pct >= 70 ? 'bg-emerald-500/60' : pct >= 50 ? 'bg-sky-400/50' : pct >= 30 ? 'bg-amber-500/50' : 'bg-red-500/50';

        return (
          <div key={i} className="hover:bg-sky-400/[0.02] transition-colors">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-1 py-1">
              <span className="text-[9px] font-mono font-bold text-neutral-300">{row.period ?? '--'}D MA</span>
              <span className="text-[9px] font-mono font-bold text-sky-400 text-right">{fmt(pct, 1)}%</span>
              <span className={`text-[9px] font-mono text-right ${changeColor(chg)}`}>
                {chg >= 0 ? '+' : ''}{fmt(chg, 1)}
              </span>
              <div className="text-right">
                {row.extremeLevel ? (
                  <span className={`inline-block px-1 py-0.5 text-[7px] font-black font-mono uppercase border ${
                    row.extremeLevel === 'OVERBOUGHT' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    row.extremeLevel === 'OVERSOLD' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                    'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                  }`}>{row.extremeLevel}</span>
                ) : (
                  <span className="text-[7px] font-mono text-neutral-600">NORMAL</span>
                )}
              </div>
            </div>
            {/* Percentile bar */}
            <div className="mx-1 mb-1 h-1 bg-white/[0.03] overflow-hidden">
              <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Sectors ──

function SectorsTab({ data }: { data: any }) {
  const sectors = data?.sectors;
  if (!sectors || !Array.isArray(sectors)) return <NoData />;

  return (
    <div className="flex flex-col gap-0 p-1.5">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,1fr))_minmax(0,0.7fr)] gap-x-1 items-center px-1.5 pb-1 border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">SECTOR</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">ADV</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">DEC</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-right">A/D</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-center">&gt;50D</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-center">&gt;200D</span>
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600 text-center">THRST</span>
      </div>

      {/* Rows */}
      {sectors.map((s: any, i: number) => {
        const adRatio = s.adRatio ?? 0;
        const above50 = s.pctAbove50d ?? 0;
        const above200 = s.pctAbove200d ?? 0;

        return (
          <div key={i} className="grid grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,1fr))_minmax(0,0.7fr)] gap-x-1 items-center px-1.5 py-1 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors">
            <span className="text-[8px] font-mono font-bold text-neutral-300 truncate">{s.name ?? '--'}</span>
            <span className="text-[8px] font-mono text-emerald-400 text-right">{s.advances ?? 0}</span>
            <span className="text-[8px] font-mono text-red-400 text-right">{s.declines ?? 0}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${adRatio >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmt(adRatio, 2)}
            </span>
            {/* % above 50d bar */}
            <div className="flex items-center gap-0.5">
              <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden">
                <div className="h-full bg-sky-400/50 transition-all" style={{ width: `${Math.min(above50, 100)}%` }} />
              </div>
              <span className="text-[7px] font-mono text-neutral-500 w-6 text-right shrink-0">{Math.round(above50)}</span>
            </div>
            {/* % above 200d bar */}
            <div className="flex items-center gap-0.5">
              <div className="flex-1 h-1.5 bg-white/[0.03] overflow-hidden">
                <div className="h-full bg-sky-400/30 transition-all" style={{ width: `${Math.min(above200, 100)}%` }} />
              </div>
              <span className="text-[7px] font-mono text-neutral-500 w-6 text-right shrink-0">{Math.round(above200)}</span>
            </div>
            {/* Breadth thrust */}
            <div className="flex items-center justify-center">
              <span className={`text-[7px] font-black font-mono ${
                (s.breadthThrust ?? 0) > 0 ? 'text-emerald-400' : (s.breadthThrust ?? 0) < 0 ? 'text-red-400' : 'text-neutral-600'
              }`}>
                {(s.breadthThrust ?? 0) > 0 ? '+' : ''}{fmt(s.breadthThrust ?? 0, 1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared Components ──

function StatCell({ label, value, color, badge }: { label: string; value?: string; color?: string; badge?: string }) {
  return (
    <div className="bg-[#020202] px-2 py-1.5 flex flex-col items-center">
      <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-600">{label}</span>
      {badge ? (
        <div className="mt-0.5"><SignalBadge signal={badge} /></div>
      ) : (
        <span className={`text-[10px] font-black font-mono ${color || 'text-neutral-300'}`}>{value ?? '--'}</span>
      )}
    </div>
  );
}

function NoData() {
  return (
    <div className="flex items-center justify-center h-32 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
      NO DATA
    </div>
  );
}

// ── Main Panel ──

export function MarketBreadthAdvancedPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMarketBreadthAdvanced();
  const [activeTab, setActiveTab] = useState<TabKey>('adLine');

  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <PanelHeader isLoading={isLoading} refetch={refetch} t={t} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              LOADING BREADTH DATA...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        <PanelHeader isLoading={isLoading} refetch={refetch} t={t} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
              FAILED TO LOAD
            </span>
            <button
              onClick={() => refetch()}
              className="px-2 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-sky-400 border border-sky-400/30 hover:bg-sky-400/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      <PanelHeader isLoading={isLoading} refetch={refetch} t={t} />

      {/* Summary header */}
      {data && <SummaryHeader data={data} />}

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 bg-[#030303] shrink-0">
        {TABS.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-1 py-1.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-sky-400 border-b border-sky-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'adLine' && <ADLineTab data={data} />}
        {activeTab === 'highsLows' && <HighsLowsTab data={data} />}
        {activeTab === 'mcclellan' && <McClellanTab data={data} />}
        {activeTab === 'aboveMa' && <AboveMaTab data={data} />}
        {activeTab === 'sectors' && <SectorsTab data={data} />}
      </div>
    </div>
  );
}

// ── Panel Header ──

function PanelHeader({ isLoading, refetch, t }: { isLoading: boolean; refetch: () => void; t: ReturnType<typeof useT> }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-sky-400" viewBox="0 0 16 16" fill="none">
          <path d="M1 12L4 6L7 9L10 3L15 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 14H15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M4 14V11M7 14V9.5M10 14V7M13 14V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
        </svg>
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
          ADV MARKET BREADTH
        </span>
      </div>
      <button
        onClick={() => refetch()}
        className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
