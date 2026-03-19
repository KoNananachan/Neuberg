import { useMemo } from 'react';
import { useElectricityMarket } from '../../api/hooks/use-electricity-market';
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

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtGw(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}TW`;
  return `${n.toFixed(1)}GW`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function reserveMarginColor(pct: number): string {
  if (pct >= 15) return 'text-green-400';
  if (pct >= 5) return 'text-yellow-400';
  return 'text-red-400';
}

function reserveMarginBg(pct: number): string {
  if (pct >= 15) return 'bg-green-500/10';
  if (pct >= 5) return 'bg-yellow-500/10';
  return 'bg-red-500/10';
}

// ── Generation mix colors ──

const GEN_COLORS: Record<string, string> = {
  nuclear: '#a78bfa',
  gas: '#f97316',
  coal: '#78716c',
  wind: '#22d3ee',
  solar: '#facc15',
  hydro: '#3b82f6',
};

const GEN_LABELS: Record<string, string> = {
  nuclear: 'Nuclear',
  gas: 'Gas',
  coal: 'Coal',
  wind: 'Wind',
  solar: 'Solar',
  hydro: 'Hydro',
};

// ── Types for mock-safe rendering ──

interface SpotPrice {
  market: string;
  price: number;
  change: number;
  changePct: number;
  dayAhead: number;
  peak: number;
  offPeak: number;
}

interface GenerationMix {
  market: string;
  nuclear: number;
  gas: number;
  coal: number;
  wind: number;
  solar: number;
  hydro: number;
}

interface GridLoad {
  market: string;
  currentLoad: number;
  peakLoad: number;
  reserveMargin: number;
  status: string;
}

interface CarbonPrice {
  name: string;
  price: number;
  change: number;
  changePct: number;
  ytdReturn: number;
}

interface ForwardCurve {
  market: string;
  points: { month: string; price: number }[];
}

interface RenewableOutput {
  source: string;
  outputGw: number;
  curtailmentPct: number;
  capacityFactor: number;
}

// ── Main Panel ──

export function ElectricityMarketPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error, refetch } = useElectricityMarket() as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'panelElectricityMarket', 'ELECTRICITY MARKET')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING ELECTRICITY DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD ELECTRICITY DATA
          </div>
        )}

        {data && (
          <>
            {data.spotPrices && <SpotPricesTable prices={data.spotPrices} t={t} />}
            {data.generationMix && <GenerationMixSection mix={data.generationMix} t={t} />}
            {data.gridLoad && <GridLoadSection loads={data.gridLoad} t={t} />}
            {data.carbonPrices && <CarbonPricesSection prices={data.carbonPrices} t={t} />}
            {data.forwardCurves && <ForwardCurvesSection curves={data.forwardCurves} t={t} />}
            {data.renewableOutput && <RenewableOutputSection output={data.renewableOutput} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Spot Prices Table ──

function SpotPricesTable({
  prices,
  t,
}: {
  prices: SpotPrice[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecSpotPrices', 'Spot Prices')}
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Market</span>
        <span className="text-right">$/MWh</span>
        <span className="text-right">Chg</span>
        <span className="text-right">Day-Ahead</span>
        <span className="text-right">Peak</span>
        <span className="text-right">Off-Peak</span>
      </div>
      {prices.map((p: SpotPrice) => (
        <div
          key={p.market}
          className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{p.market}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtPrice(p.price)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(p.changePct)}`}>
            {fmtPct(p.changePct)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPrice(p.dayAhead)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPrice(p.peak)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtPrice(p.offPeak)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Section 2: Generation Mix ──

function GenerationMixSection({
  mix,
  t,
}: {
  mix: GenerationMix[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center justify-between">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecGenerationMix', 'Generation Mix')}
        </span>
        <div className="flex items-center gap-2">
          {Object.entries(GEN_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5" style={{ backgroundColor: color }} />
              <span className="text-[6px] font-mono text-neutral-600 uppercase">{GEN_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>
      {mix.map((m: GenerationMix) => {
        const total = m.nuclear + m.gas + m.coal + m.wind + m.solar + m.hydro;
        const sources = [
          { key: 'nuclear', value: m.nuclear },
          { key: 'gas', value: m.gas },
          { key: 'coal', value: m.coal },
          { key: 'wind', value: m.wind },
          { key: 'solar', value: m.solar },
          { key: 'hydro', value: m.hydro },
        ];

        return (
          <div key={m.market} className="px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-bold text-white">{m.market}</span>
              <span className="text-[7px] font-mono text-neutral-600">{total.toFixed(0)}%</span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden">
              {sources.map((s) => {
                const pct = total > 0 ? (s.value / total) * 100 : 0;
                if (pct < 0.5) return null;
                return (
                  <div
                    key={s.key}
                    className="h-full relative group"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: GEN_COLORS[s.key],
                      opacity: 0.85,
                    }}
                    title={`${GEN_LABELS[s.key]}: ${s.value.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {sources.filter((s) => s.value > 0).map((s) => (
                <span key={s.key} className="text-[6px] font-mono text-neutral-600">
                  <span style={{ color: GEN_COLORS[s.key] }}>{GEN_LABELS[s.key]}</span>{' '}
                  {s.value.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 3: Grid Load ──

function GridLoadSection({
  loads,
  t,
}: {
  loads: GridLoad[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecGridLoad', 'Grid Load')}
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Market</span>
        <span className="text-right">Current</span>
        <span className="text-right">Peak</span>
        <span className="text-right">Reserve %</span>
        <span className="text-right">Status</span>
      </div>
      {loads.map((l: GridLoad) => (
        <div
          key={l.market}
          className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{l.market}</span>
          <span className="text-[9px] font-mono text-white text-right">{fmtGw(l.currentLoad)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtGw(l.peakLoad)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${reserveMarginColor(l.reserveMargin)}`}>
            {l.reserveMargin.toFixed(1)}%
          </span>
          <div className="flex justify-end items-center">
            <StatusBadge status={l.status} reserveMargin={l.reserveMargin} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status, reserveMargin }: { status: string; reserveMargin: number }) {
  const bgClass = reserveMarginBg(reserveMargin);
  const textClass = reserveMarginColor(reserveMargin);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${textClass} ${bgClass} border border-current/20`}>
      {status}
    </span>
  );
}

// ── Section 4: Carbon Prices ──

function CarbonPricesSection({
  prices,
  t,
}: {
  prices: CarbonPrice[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecCarbonPrices', 'Carbon Prices')}
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Program</span>
        <span className="text-right">Price</span>
        <span className="text-right">Chg</span>
        <span className="text-right">YTD</span>
      </div>
      {prices.map((c: CarbonPrice) => (
        <div
          key={c.name}
          className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{c.name}</span>
          <span className="text-[9px] font-mono text-white text-right">${fmtPrice(c.price)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(c.changePct)}`}>
            {fmtPct(c.changePct)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(c.ytdReturn)}`}>
            {fmtPct(c.ytdReturn)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 5: Forward Curves (Mini SVG Charts) ──

function ForwardCurvesSection({
  curves,
  t,
}: {
  curves: ForwardCurve[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecForwardCurves', 'Forward Curves (6M)')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {curves.map((c: ForwardCurve) => (
          <ForwardCurveChart key={c.market} curve={c} />
        ))}
      </div>
    </div>
  );
}

function ForwardCurveChart({ curve }: { curve: ForwardCurve }) {
  const W = 160;
  const H = 60;
  const PAD_X = 4;
  const PAD_Y = 10;

  const chartData = useMemo(() => {
    if (!curve.points || curve.points.length < 2) return null;

    const values = curve.points.map((p) => p.price);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) =>
      PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(values.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const trending = lastVal >= firstVal ? 'up' : 'down';

    return {
      linePath,
      fillPath,
      lastX: scaleX(values.length - 1),
      lastY: scaleY(lastVal),
      firstVal,
      lastVal,
      trending,
    };
  }, [curve.points]);

  const lineColor = chartData?.trending === 'up' ? '#facc15' : '#f87171';
  const fillColor = chartData?.trending === 'up'
    ? 'rgba(250,204,21,0.08)'
    : 'rgba(248,113,113,0.08)';

  return (
    <div className="bg-black px-2 py-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono font-bold text-white">{curve.market}</span>
        {chartData && (
          <span className={`text-[7px] font-mono font-bold ${chartData.trending === 'up' ? 'text-yellow-400' : 'text-red-400'}`}>
            {chartData.lastVal.toFixed(1)}
          </span>
        )}
      </div>

      {chartData ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
          <path d={chartData.fillPath} fill={fillColor} />
          <path d={chartData.linePath} fill="none" stroke={lineColor} strokeWidth={1.5} />
          <circle cx={chartData.lastX} cy={chartData.lastY} r={2} fill={lineColor} />
        </svg>
      ) : (
        <div className="h-12 flex items-center justify-center text-[7px] font-mono text-neutral-600">
          NO DATA
        </div>
      )}

      {chartData && curve.points.length > 0 && (
        <div className="flex justify-between text-[6px] font-mono text-neutral-600 mt-0.5">
          <span>{curve.points[0].month}</span>
          <span>{curve.points[curve.points.length - 1].month}</span>
        </div>
      )}
    </div>
  );
}

// ── Section 6: Renewable Output ──

function RenewableOutputSection({
  output,
  t,
}: {
  output: RenewableOutput[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'elecRenewableOutput', 'Renewable Output')}
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Source</span>
        <span className="text-right">Output</span>
        <span className="text-right">Curtailment</span>
        <span className="text-right">Cap Factor</span>
      </div>
      {output.map((r: RenewableOutput) => {
        const curtColor = r.curtailmentPct > 10 ? 'text-red-400' : r.curtailmentPct > 5 ? 'text-yellow-400' : 'text-green-400';
        const cfColor = r.capacityFactor > 40 ? 'text-green-400' : r.capacityFactor > 20 ? 'text-yellow-400' : 'text-neutral-400';

        return (
          <div
            key={r.source}
            className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">{r.source}</span>
            <span className="text-[9px] font-mono text-white text-right">{fmtGw(r.outputGw)}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${curtColor}`}>
              {r.curtailmentPct.toFixed(1)}%
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${cfColor}`}>
              {r.capacityFactor.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
