import { useCommoditySeasonality } from '../../api/hooks/use-commodity-seasonality';
import { useT } from '../../i18n';

// ── Constants ──

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ──

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPct1(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

function returnColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function heatBg(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) {
    if (abs >= 5) return 'bg-green-500/40';
    if (abs >= 3) return 'bg-green-500/30';
    if (abs >= 1.5) return 'bg-green-500/20';
    if (abs > 0) return 'bg-green-500/10';
  }
  if (n < 0) {
    if (abs >= 5) return 'bg-red-500/40';
    if (abs >= 3) return 'bg-red-500/30';
    if (abs >= 1.5) return 'bg-red-500/20';
    if (abs > 0) return 'bg-red-500/10';
  }
  return '';
}

function heatText(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-600';
}

function biasColor(bias: string): string {
  const b = bias?.toLowerCase() ?? '';
  if (b === 'bullish' || b === 'long') return 'text-green-400';
  if (b === 'bearish' || b === 'short') return 'text-red-400';
  return 'text-neutral-400';
}

function biasBg(bias: string): string {
  const b = bias?.toLowerCase() ?? '';
  if (b === 'bullish' || b === 'long') return 'bg-green-500/10 border border-green-500/30';
  if (b === 'bearish' || b === 'short') return 'bg-red-500/10 border border-red-500/30';
  return 'bg-neutral-500/10 border border-neutral-500/30';
}

function curveColor(state: string): string {
  const s = state?.toLowerCase() ?? '';
  if (s === 'contango') return 'text-red-400';
  if (s === 'backwardation') return 'text-green-400';
  return 'text-neutral-400';
}

function curveBg(state: string): string {
  const s = state?.toLowerCase() ?? '';
  if (s === 'contango') return 'bg-red-500/10';
  if (s === 'backwardation') return 'bg-green-500/10';
  return 'bg-neutral-500/10';
}

// ── Main Panel ──

export function CommoditySeasonalityPanel() {
  const t = useT();
  const { data, isLoading, error } = useCommoditySeasonality();
  const d = data as any;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest animate-pulse">
          {t('loading')}
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-1.5 h-1.5 bg-yellow-400" />
        <span className="text-[9px] font-mono font-black text-yellow-400 uppercase tracking-tighter">
          {t('panelCommoditySeasonality')}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <SeasonalPatterns patterns={d.seasonalPatterns ?? d.commodities ?? []} />
        <CurrentVsSeasonal items={d.currentVsSeasonal ?? d.tracking ?? []} />
        <CurveSeasonality curves={d.curveSeasonality ?? []} />
        <TradingSignals signals={d.tradingSignals ?? d.opportunities ?? []} />
        <CalendarEffects events={d.calendarEffects ?? []} />
      </div>
    </div>
  );
}

// ── Section 1: Seasonal Patterns Heatmap ──

function SeasonalPatterns({ patterns }: { patterns: any[] }) {
  if (!patterns?.length) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="SEASONAL PATTERNS" subtitle="AVG MONTHLY RETURNS (%)" />
      <div className="overflow-x-auto">
        {/* Column header */}
        <div className="grid grid-cols-[100px_repeat(12,minmax(42px,1fr))] gap-0 px-2 py-1 border-b border-border/20">
          <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
            Commodity
          </span>
          {MONTHS.map((m) => (
            <span key={m} className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right pr-1">
              {m}
            </span>
          ))}
        </div>

        {/* Rows */}
        {patterns.map((row: any, i: number) => {
          const name = row.name ?? row.commodity ?? `C${i}`;
          const returns: number[] = row.monthlyReturns
            ? row.monthlyReturns.map((mr: any) => mr.avgReturn ?? mr.return ?? mr ?? 0)
            : row.returns ?? [];

          return (
            <div
              key={name}
              className="grid grid-cols-[100px_repeat(12,minmax(42px,1fr))] gap-0 px-2 py-0.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
                {name}
              </span>
              {MONTHS.map((m, mi) => {
                const raw = returns[mi] as any;
                const val: number = typeof raw === 'number'
                  ? raw
                  : (typeof raw === 'object' && raw != null ? (raw.avgReturn ?? 0) : 0);
                return (
                  <span
                    key={m}
                    className={`text-[7px] font-mono font-bold text-right pr-1 py-0.5 ${heatText(val)} ${heatBg(val)}`}
                  >
                    {val === 0 ? '0.0' : fmtPct1(val).replace('%', '')}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 2: Current vs Seasonal ──

function CurrentVsSeasonal({ items }: { items: any[] }) {
  if (!items?.length) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="CURRENT VS SEASONAL" subtitle="YTD PERFORMANCE" />

      {/* Column header */}
      <div className="grid grid-cols-[1fr_70px_70px_70px_70px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">Commodity</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Seasonal</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Deviation</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Pctile</span>
      </div>

      {/* Rows */}
      {items.map((item: any, i: number) => {
        const name = item.commodity ?? item.name ?? `C${i}`;
        const ytd = item.ytdReturn ?? item.ytd ?? 0;
        const seasonal = item.seasonalExpected ?? item.seasonalAvg ?? item.seasonal ?? 0;
        const deviation = item.deviation ?? (ytd - seasonal);
        const pctile = item.percentileRank ?? item.percentile ?? item.pctile ?? null;

        return (
          <div
            key={name}
            className="grid grid-cols-[1fr_70px_70px_70px_70px] gap-0 px-2 py-1 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">{name}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${returnColor(ytd)}`}>
              {fmtPct(ytd)}
            </span>
            <span className={`text-[8px] font-mono text-right ${returnColor(seasonal)}`}>
              {fmtPct(seasonal)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${returnColor(deviation)}`}>
              {fmtPct(deviation)}
            </span>
            <span className="text-[8px] font-mono text-right text-neutral-300">
              {pctile != null ? `${typeof pctile === 'number' ? pctile.toFixed(0) : pctile}%` : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 3: Curve Seasonality ──

function CurveSeasonality({ curves }: { curves: any[] }) {
  if (!curves?.length) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="CURVE SEASONALITY" subtitle="CONTANGO / BACKWARDATION" />

      {/* Column header */}
      <div className="grid grid-cols-[1fr_repeat(12,minmax(36px,1fr))] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">Commodity</span>
        {MONTHS.map((m) => (
          <span key={m} className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right pr-1">
            {m}
          </span>
        ))}
      </div>

      {/* Rows */}
      {curves.map((row: any, i: number) => {
        const name = row.commodity ?? row.name ?? `C${i}`;
        const monthly: any[] = row.monthly ?? row.months ?? [];

        return (
          <div
            key={name}
            className="grid grid-cols-[1fr_repeat(12,minmax(36px,1fr))] gap-0 px-2 py-0.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">{name}</span>
            {MONTHS.map((m, mi) => {
              const cell = monthly[mi];
              const state = typeof cell === 'string' ? cell : (cell?.state ?? cell?.type ?? '--');
              const spread = typeof cell === 'object' ? (cell?.spread ?? null) : null;

              return (
                <span
                  key={m}
                  className={`text-[6px] font-mono font-bold text-right pr-1 py-0.5 ${curveColor(state)} ${curveBg(state)}`}
                  title={state}
                >
                  {spread != null ? (typeof spread === 'number' ? spread.toFixed(2) : spread) : state?.slice(0, 3)?.toUpperCase() ?? '--'}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Section 4: Trading Signals ──

function TradingSignals({ signals }: { signals: any[] }) {
  if (!signals?.length) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="TRADING SIGNALS" subtitle="SEASONAL BIAS NEXT 30/60/90D" />

      {/* Column header */}
      <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">Commodity</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-center">Bias</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Period</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Win%</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Avg Ret</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Hist N</span>
      </div>

      {/* Rows */}
      {signals.map((s: any, i: number) => {
        const name = s.commodity ?? s.name ?? `S${i}`;
        const bias = s.bias ?? s.direction ?? s.signal ?? 'Neutral';
        const period = s.period ?? s.days ?? '--';
        const winRate = s.winRate ?? s.historicalWinRate ?? null;
        const avgReturn = s.avgReturn ?? s.expectedReturn ?? null;
        const histN = s.sampleSize ?? s.historicalN ?? s.n ?? null;

        return (
          <div
            key={`${name}-${i}`}
            className="grid grid-cols-[1fr_60px_60px_60px_60px_60px] gap-0 px-2 py-1 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">{name}</span>
            <span className="text-center">
              <span className={`text-[6px] font-mono font-bold px-1.5 py-px uppercase ${biasColor(bias)} ${biasBg(bias)}`}>
                {bias}
              </span>
            </span>
            <span className="text-[8px] font-mono text-right text-neutral-300">
              {typeof period === 'number' ? `${period}D` : period}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${winRate != null && winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate != null ? `${typeof winRate === 'number' ? winRate.toFixed(1) : winRate}%` : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${returnColor(avgReturn ?? 0)}`}>
              {avgReturn != null ? fmtPct(avgReturn) : '--'}
            </span>
            <span className="text-[8px] font-mono text-right text-neutral-500">
              {histN != null ? histN : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 5: Calendar Effects ──

function CalendarEffects({ events }: { events: any[] }) {
  if (!events?.length) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="CALENDAR EFFECTS" subtitle="NOTABLE SEASONAL EVENTS" />

      {/* Column header */}
      <div className="grid grid-cols-[1fr_1fr_90px_70px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">Event</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">Commodities</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Timing</span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider text-right">Impact</span>
      </div>

      {/* Rows */}
      {events.map((e: any, i: number) => {
        const name = e.event ?? e.name ?? `Event ${i + 1}`;
        const commodities = e.commodities ?? e.affected ?? [];
        const timing = e.timing ?? e.period ?? e.date ?? '--';
        const impact = e.impact ?? e.direction ?? e.effect ?? '--';
        const commodityStr = Array.isArray(commodities) ? commodities.join(', ') : String(commodities);

        return (
          <div
            key={`${name}-${i}`}
            className="grid grid-cols-[1fr_1fr_90px_70px] gap-0 px-2 py-1 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">{name}</span>
            <span className="text-[7px] font-mono text-neutral-300 truncate">{commodityStr}</span>
            <span className="text-[7px] font-mono text-right text-neutral-400">{timing}</span>
            <span className={`text-[7px] font-mono font-bold text-right ${biasColor(String(impact))}`}>
              {String(impact).toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared Components ──

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/20 bg-black">
      <span className="text-[8px] font-mono font-black text-white uppercase tracking-wider">{title}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{subtitle}</span>
    </div>
  );
}
