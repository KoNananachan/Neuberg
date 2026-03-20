import { useMemo } from 'react';
import { useCommoditySpread } from '../../api/hooks/use-commodity-spread';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommoditySpreadData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CalendarSpread = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProcessingSpread = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InterCommoditySpread = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TermStructurePoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeasonalPattern = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpreadTradeIdea = any;
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtSpread(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function structureColor(structure: string): { text: string; bg: string } {
  if (structure === 'contango') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  if (structure === 'backwardation') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  return { text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30' };
}

function signalColor(signal: string): { text: string; bg: string } {
  if (signal === 'bullish' || signal === 'buy') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (signal === 'bearish' || signal === 'sell') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30' };
}

function directionArrow(dir: string): string {
  if (dir === 'widening') return '\u2191';
  if (dir === 'narrowing') return '\u2193';
  return '\u2194';
}

function directionColor(dir: string): string {
  if (dir === 'widening') return 'text-red-400';
  if (dir === 'narrowing') return 'text-green-400';
  return 'text-amber-400';
}

function confidenceColor(confidence: string): string {
  if (confidence === 'high') return 'text-green-400';
  if (confidence === 'low') return 'text-red-400';
  return 'text-amber-400';
}

function zScoreBarColor(z: number): string {
  if (z >= 1.5) return '#ef4444';
  if (z >= 0.5) return '#f97316';
  if (z <= -1.5) return '#22c55e';
  if (z <= -0.5) return '#3b82f6';
  return '#f59e0b';
}

// ── Main Panel ──

export function CommoditySpreadPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCommoditySpread();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'panelCommoditySpread', 'Commodity Spread')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            <CalendarSpreadsSection spreads={data.calendarSpreads} />
            <ProcessingSpreadsSection spreads={data.processingSpreads} />
            <InterCommoditySpreadsSection spreads={data.interCommoditySpreads} />
            <TermStructureSection points={data.termStructure} />
            <SeasonalPatternsSection patterns={data.seasonalPatterns} />
            <TradeIdeasSection ideas={data.tradeIdeas} />
          </>
        )}
      </div>

      {/* Footer */}
      {data && (
        <div className="border-t border-border/30 bg-[#050505] px-3 py-1.5 shrink-0">
          <span className="text-[7px] font-mono text-neutral-700">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section 1: Calendar Spreads ──

function CalendarSpreadsSection({ spreads }: { spreads: CalendarSpread[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Calendar Spreads
        </span>
      </div>
      <div className="grid grid-cols-[100px_72px_72px_56px_56px_48px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Commodity</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Front</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Back</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Chg</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Struc</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Z</span>
      </div>
      {spreads.map((s) => (
        <CalendarSpreadRow key={s.commodity} spread={s} />
      ))}
    </div>
  );
}

function CalendarSpreadRow({ spread }: { spread: CalendarSpread }) {
  const struc = structureColor(spread.structure);
  return (
    <div className="grid grid-cols-[100px_72px_72px_56px_56px_48px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-white truncate">{spread.commodity}</span>
      <span className="text-[8px] font-mono text-white text-right">{fmtPrice(spread.frontPrice)}</span>
      <span className="text-[8px] font-mono text-white text-right">{fmtPrice(spread.backPrice)}</span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(spread.spreadValue)}`}>
        {fmtSpread(spread.spreadValue)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(spread.changePct)}`}>
        {fmtPct(spread.changePct)}
      </span>
      <div className="flex justify-center">
        <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${struc.text} ${struc.bg}`}>
          {spread.structure === 'backwardation' ? 'BWD' : spread.structure === 'contango' ? 'CTG' : 'FLAT'}
        </span>
      </div>
      <div className="flex items-center justify-end gap-1 pr-1">
        <ZScoreBar zScore={spread.zScore} />
        <span className="text-[7px] font-mono font-bold text-white w-6 text-right">
          {spread.zScore >= 0 ? '+' : ''}{spread.zScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ── Section 2: Processing Spreads (Crack / Crush / Spark) ──

function ProcessingSpreadsSection({ spreads }: { spreads: ProcessingSpread[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Crack / Crush / Spark Spreads
        </span>
      </div>
      {spreads.map((s) => (
        <ProcessingSpreadCard key={s.name} spread={s} />
      ))}
    </div>
  );
}

function ProcessingSpreadCard({ spread }: { spread: ProcessingSpread }) {
  const sig = signalColor(spread.signal);

  return (
    <div className="px-3 py-2 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold text-white">{spread.name}</span>
          <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
            {spread.signal.toUpperCase()}
          </span>
        </div>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{spread.type}</span>
      </div>

      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[12px] font-mono font-bold text-white">${fmtSpread(spread.currentValue)}</span>
        <span className={`text-[9px] font-mono font-bold ${changeColor(spread.changePct)}`}>
          {fmtPct(spread.changePct)}
        </span>
        <span className={`text-[8px] font-mono ${directionColor(spread.direction)}`}>
          {directionArrow(spread.direction)} {spread.direction.toUpperCase()}
        </span>
      </div>

      <div className="flex gap-4 mb-1">
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">20D AVG</span>
          <span className="text-[8px] font-mono text-white ml-1">${fmtSpread(spread.avg20d)}</span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">60D AVG</span>
          <span className="text-[8px] font-mono text-white ml-1">${fmtSpread(spread.avg60d)}</span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">PCTL</span>
          <span className="text-[8px] font-mono text-white ml-1">{spread.percentile}%</span>
        </div>
      </div>

      {spread.history.length >= 2 && (
        <SpreadSparkline history={spread.history} direction={spread.direction} />
      )}

      {spread.description && (
        <div className="mt-1">
          <span className="text-[7px] font-mono text-neutral-600 leading-tight">{spread.description}</span>
        </div>
      )}
    </div>
  );
}

// ── Section 3: Inter-Commodity Spreads ──

function InterCommoditySpreadsSection({ spreads }: { spreads: InterCommoditySpread[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Inter-Commodity Spreads
        </span>
      </div>
      <div className="grid grid-cols-[1fr_64px_56px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Current</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Chg%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">20D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">60D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">Z</span>
      </div>
      {spreads.map((s) => (
        <InterCommodityRow key={s.name} spread={s} />
      ))}
    </div>
  );
}

function InterCommodityRow({ spread }: { spread: InterCommoditySpread }) {
  return (
    <div className="grid grid-cols-[1fr_64px_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center">
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-mono font-bold text-white truncate">{spread.name}</span>
        {spread.spreadType === 'ratio' && (
          <span className="text-[6px] font-mono text-neutral-600 uppercase">RATIO</span>
        )}
      </div>
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {spread.spreadType === 'ratio' ? fmtRatio(spread.currentValue) : fmtSpread(spread.currentValue)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(spread.changePct)}`}>
        {fmtPct(spread.changePct)}
      </span>
      <span className="text-[8px] font-mono text-neutral-500 text-right">
        {spread.spreadType === 'ratio' ? fmtRatio(spread.avg20d) : fmtSpread(spread.avg20d)}
      </span>
      <span className="text-[8px] font-mono text-neutral-500 text-right">
        {spread.spreadType === 'ratio' ? fmtRatio(spread.avg60d) : fmtSpread(spread.avg60d)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right pr-1 ${
        spread.zScore >= 1.5 ? 'text-red-400' :
        spread.zScore <= -1.5 ? 'text-green-400' :
        'text-amber-400'
      }`}>
        {spread.zScore >= 0 ? '+' : ''}{spread.zScore.toFixed(1)}
      </span>
    </div>
  );
}

// ── Section 4: Term Structure ──

function TermStructureSection({ points }: { points: TermStructurePoint[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Term Structure
        </span>
      </div>
      <div className="px-3 py-2">
        <TermStructureChart points={points} />
        <div className="grid grid-cols-4 gap-px bg-border/10 mt-2">
          {points.slice(0, 8).map((p) => (
            <div key={p.contract} className="bg-black px-2 py-1">
              <div className="text-[7px] font-mono text-neutral-600 uppercase truncate">{p.contract}</div>
              <div className="text-[9px] font-mono font-bold text-white">{fmtPrice(p.price)}</div>
              <div className={`text-[7px] font-mono font-bold ${changeColor(p.changePct)}`}>
                {fmtPct(p.changePct)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TermStructureChart({ points }: { points: TermStructurePoint[] }) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const W = 200;
    const H = 50;
    const PAD_X = 4;
    const PAD_Y = 6;

    const values = points.map((p) => p.price);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 0.01;

    const scaleX = (i: number) => PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) => PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    const isContango = values.length >= 2 && values[values.length - 1] > values[0];

    return { linePath, fillPath, isContango, W, H };
  }, [points]);

  if (!chart) {
    return (
      <div className="h-12 flex items-center justify-center text-[7px] font-mono text-neutral-600">
        INSUFFICIENT DATA
      </div>
    );
  }

  const lineColor = chart.isContango ? '#f87171' : '#4ade80';
  const fillColor = chart.isContango ? 'rgba(248,113,113,0.06)' : 'rgba(74,222,128,0.06)';

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Forward Curve</span>
        <span className={`text-[7px] font-mono font-bold ${chart.isContango ? 'text-red-400' : 'text-green-400'}`}>
          {chart.isContango ? 'CONTANGO' : 'BACKWARDATION'}
        </span>
      </div>
      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ height: 44 }}>
        <path d={chart.fillPath} fill={fillColor} />
        <path d={chart.linePath} fill="none" stroke={lineColor} strokeWidth={1.2} />
        {points.map((p, i) => {
          const x = 4 + (i / (points.length - 1)) * 192;
          const values = points.map((pt) => pt.price);
          const minV = Math.min(...values);
          const maxV = Math.max(...values);
          const rangeV = maxV - minV || 0.01;
          const y = 6 + ((maxV - p.price) / rangeV) * 38;
          return <circle key={p.contract} cx={x} cy={y} r={1.5} fill={lineColor} />;
        })}
      </svg>
    </div>
  );
}

// ── Section 5: Seasonal Patterns ──

function SeasonalPatternsSection({ patterns }: { patterns: SeasonalPattern[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Seasonal Patterns
        </span>
      </div>
      {patterns.map((p) => (
        <div
          key={p.commodity}
          className="px-3 py-1.5 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-white">{p.commodity}</span>
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${
                signalColor(p.currentSignal).text
              } ${signalColor(p.currentSignal).bg}`}>
                {p.currentSignal.toUpperCase()}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-600">
              Win rate: <span className="text-white font-bold">{p.winRate}%</span>
            </span>
          </div>
          <div className="flex gap-3">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Avg Return</span>
              <span className={`text-[8px] font-mono font-bold ml-1 ${changeColor(p.avgReturn)}`}>
                {fmtPct(p.avgReturn)}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Period</span>
              <span className="text-[8px] font-mono text-white ml-1">{p.period}</span>
            </div>
          </div>
          <p className="text-[7px] font-mono text-neutral-600 leading-tight mt-0.5">{p.description}</p>
        </div>
      ))}
    </div>
  );
}

// ── Section 6: Spread Trade Ideas ──

function TradeIdeasSection({ ideas }: { ideas: SpreadTradeIdea[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Spread Trade Ideas
        </span>
      </div>
      {ideas.map((idea, i) => (
        <TradeIdeaCard key={`${idea.name}-${i}`} idea={idea} />
      ))}
    </div>
  );
}

function TradeIdeaCard({ idea }: { idea: SpreadTradeIdea }) {
  const sig = signalColor(idea.direction);
  const conf = confidenceColor(idea.confidence);

  return (
    <div className="px-3 py-2 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold text-white">{idea.name}</span>
          <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
            {idea.direction.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">CONF</span>
          <span className={`text-[7px] font-mono font-bold uppercase ${conf}`}>
            {idea.confidence}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-1">
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Entry</span>
          <span className="text-[8px] font-mono text-white ml-1">{fmtSpread(idea.entry)}</span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Target</span>
          <span className="text-[8px] font-mono text-green-400 ml-1">{fmtSpread(idea.target)}</span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Stop</span>
          <span className="text-[8px] font-mono text-red-400 ml-1">{fmtSpread(idea.stop)}</span>
        </div>
        <div>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">R:R</span>
          <span className="text-[8px] font-mono text-amber-400 font-bold ml-1">{idea.riskReward.toFixed(1)}</span>
        </div>
      </div>

      <p className="text-[7px] font-mono text-neutral-600 leading-tight">{idea.rationale}</p>
    </div>
  );
}

// ── Shared: Z-Score Bar (inline mini version) ──

function ZScoreBar({ zScore }: { zScore: number }) {
  const clamped = Math.max(-3, Math.min(3, zScore));
  const center = 50;
  const offset = (clamped / 3) * 50;
  const left = offset >= 0 ? center : center + offset;
  const width = Math.abs(offset);
  const color = zScoreBarColor(zScore);

  return (
    <svg viewBox="0 0 60 6" className="w-8" style={{ height: 6 }}>
      <rect x="0" y="0" width="60" height="6" fill="rgba(255,255,255,0.03)" />
      <line x1="30" y1="0" x2="30" y2="6" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect
        x={(left / 100) * 60}
        y="0.5"
        width={(width / 100) * 60}
        height="5"
        fill={color}
        opacity="0.7"
      />
    </svg>
  );
}

// ── Shared: Spread Sparkline ──

function SpreadSparkline({
  history,
  direction,
}: {
  history: number[];
  direction: string;
}) {
  const W = 200;
  const H = 36;
  const PAD_X = 2;
  const PAD_Y = 4;

  const path = useMemo(() => {
    if (history.length < 2) return null;

    const minV = Math.min(...history);
    const maxV = Math.max(...history);
    const rangeV = maxV - minV || 0.0001;

    const scaleX = (i: number) =>
      PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = history
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(history.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    return {
      linePath,
      fillPath,
      lastX: scaleX(history.length - 1),
      lastY: scaleY(history[history.length - 1]),
    };
  }, [history]);

  const lineColor =
    direction === 'narrowing' ? '#4ade80' :
    direction === 'widening' ? '#f87171' :
    '#fbbf24';

  const fillColor =
    direction === 'narrowing' ? 'rgba(74,222,128,0.06)' :
    direction === 'widening' ? 'rgba(248,113,113,0.06)' :
    'rgba(251,191,36,0.06)';

  if (!path) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 32 }}>
      <path d={path.fillPath} fill={fillColor} />
      <path d={path.linePath} fill="none" stroke={lineColor} strokeWidth={1.2} />
      <circle cx={path.lastX} cy={path.lastY} r={1.5} fill={lineColor} />
    </svg>
  );
}
