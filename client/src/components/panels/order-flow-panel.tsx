import { useState, useMemo } from 'react';
import { useOrderFlow, type ProfileBin, type DeltaPoint } from '../../api/hooks/use-order-flow';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type RangeOption = '1d' | '5d' | '1mo';

const RANGE_OPTIONS: { key: RangeOption; label: string; interval: string }[] = [
  { key: '1d', label: '1D', interval: '5m' },
  { key: '5d', label: '5D', interval: '15m' },
  { key: '1mo', label: '1M', interval: '1h' },
];

// ── Number formatting ──

function fmtVol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtVolSigned(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return prefix + fmtVol(n);
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// ── Color constants ──

const BUY_COLOR = '#38bdf8';   // sky-400
const SELL_COLOR = '#f87171';   // red-400
const POC_COLOR = '#fbbf24';    // amber-400
const VA_COLOR = 'rgba(56,189,248,0.08)';
const DELTA_POS = '#38bdf8';
const DELTA_NEG = '#f87171';

// ── Volume Profile SVG ──

function VolumeProfileChart({
  profile,
  poc,
  valueArea,
  currentPrice,
}: {
  profile: ProfileBin[];
  poc: number;
  valueArea: { high: number; low: number };
  currentPrice: number;
}) {
  const maxVol = useMemo(() => Math.max(...profile.map(b => b.totalVol), 1), [profile]);
  const minP = useMemo(() => Math.min(...profile.map(b => b.priceLevel)), [profile]);
  const maxP = useMemo(() => Math.max(...profile.map(b => b.priceLevel)), [profile]);
  const priceRange = maxP - minP || 1;

  const W = 380;
  const H = 320;
  const LABEL_W = 52;
  const BAR_AREA_W = W - LABEL_W - 8;
  const TOP_PAD = 8;
  const BOT_PAD = 4;
  const CHART_H = H - TOP_PAD - BOT_PAD;

  function priceToY(price: number): number {
    return TOP_PAD + (1 - (price - minP) / priceRange) * CHART_H;
  }

  const barH = Math.max(CHART_H / profile.length - 1, 2);

  // Value area band
  const vaTopY = priceToY(valueArea.high);
  const vaBotY = priceToY(valueArea.low);

  // POC line
  const pocY = priceToY(poc);

  // Current price line
  const curY = currentPrice > 0 ? priceToY(Math.max(minP, Math.min(maxP, currentPrice))) : null;

  // Imbalance detection (>2:1 or <1:2)
  const imbalanceThreshold = 0.33; // |imbalance| > 0.33 means >2:1 ratio

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
      {/* Value area shading */}
      <rect
        x={LABEL_W}
        y={vaTopY}
        width={BAR_AREA_W}
        height={Math.max(vaBotY - vaTopY, 1)}
        fill={VA_COLOR}
      />

      {/* VA labels */}
      <text x={LABEL_W - 2} y={vaTopY - 2} textAnchor="end" fill="rgba(56,189,248,0.4)" fontSize={6} fontFamily="monospace">
        VAH
      </text>
      <text x={LABEL_W - 2} y={vaBotY + 8} textAnchor="end" fill="rgba(56,189,248,0.4)" fontSize={6} fontFamily="monospace">
        VAL
      </text>

      {/* VA boundary lines */}
      <line x1={LABEL_W} y1={vaTopY} x2={W} y2={vaTopY} stroke="rgba(56,189,248,0.15)" strokeWidth={0.5} strokeDasharray="3,3" />
      <line x1={LABEL_W} y1={vaBotY} x2={W} y2={vaBotY} stroke="rgba(56,189,248,0.15)" strokeWidth={0.5} strokeDasharray="3,3" />

      {/* Volume bars */}
      {profile.map((bin, i) => {
        const y = priceToY(bin.priceLevel) - barH / 2;
        const totalW = (bin.totalVol / maxVol) * BAR_AREA_W;
        const buyW = bin.totalVol > 0 ? (bin.buyVol / bin.totalVol) * totalW : 0;
        const sellW = totalW - buyW;
        const isPoc = Math.abs(bin.priceLevel - poc) < (priceRange / profile.length);
        const isImbalance = Math.abs(bin.imbalance) > imbalanceThreshold;

        return (
          <g key={i}>
            {/* Imbalance highlight */}
            {isImbalance && (
              <rect
                x={LABEL_W}
                y={y - 1}
                width={BAR_AREA_W}
                height={barH + 2}
                fill={bin.imbalance > 0 ? 'rgba(56,189,248,0.04)' : 'rgba(248,113,113,0.04)'}
              />
            )}

            {/* Buy volume (left portion) */}
            <rect
              x={LABEL_W}
              y={y}
              width={Math.max(buyW, 0)}
              height={barH}
              fill={BUY_COLOR}
              opacity={isPoc ? 0.9 : 0.6}
            />

            {/* Sell volume (right portion) */}
            <rect
              x={LABEL_W + buyW}
              y={y}
              width={Math.max(sellW, 0)}
              height={barH}
              fill={SELL_COLOR}
              opacity={isPoc ? 0.9 : 0.5}
            />

            {/* Price label (every 3rd bin or POC) */}
            {(i % 3 === 0 || isPoc) && (
              <text
                x={LABEL_W - 4}
                y={y + barH / 2 + 3}
                textAnchor="end"
                fill={isPoc ? POC_COLOR : 'rgba(255,255,255,0.35)'}
                fontSize={isPoc ? 7.5 : 7}
                fontFamily="monospace"
                fontWeight={isPoc ? 'bold' : 'normal'}
              >
                {fmtPrice(bin.priceLevel)}
              </text>
            )}

            {/* Imbalance indicator dot */}
            {isImbalance && (
              <circle
                cx={LABEL_W + totalW + 6}
                cy={y + barH / 2}
                r={2}
                fill={bin.imbalance > 0 ? BUY_COLOR : SELL_COLOR}
                opacity={0.8}
              />
            )}
          </g>
        );
      })}

      {/* POC line */}
      <line
        x1={LABEL_W}
        y1={pocY}
        x2={W}
        y2={pocY}
        stroke={POC_COLOR}
        strokeWidth={1}
        strokeDasharray="4,2"
      />
      <text x={W - 2} y={pocY - 3} textAnchor="end" fill={POC_COLOR} fontSize={7} fontFamily="monospace" fontWeight="bold">
        POC {fmtPrice(poc)}
      </text>

      {/* Current price line */}
      {curY !== null && (
        <>
          <line
            x1={LABEL_W}
            y1={curY}
            x2={W}
            y2={curY}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={0.8}
          />
          <rect x={W - 50} y={curY - 7} width={48} height={14} fill="rgba(255,255,255,0.1)" />
          <text x={W - 4} y={curY + 3} textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize={7.5} fontFamily="monospace" fontWeight="bold">
            {fmtPrice(currentPrice)}
          </text>
        </>
      )}
    </svg>
  );
}

// ── Cumulative Delta Chart SVG ──

function CumulativeDeltaChart({ data }: { data: DeltaPoint[] }) {
  const H = 120;
  const W = 380;
  const PAD_L = 52;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 16;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;

  const filtered = useMemo(() => {
    // Downsample if too many points
    if (data.length <= 80) return data;
    const step = Math.ceil(data.length / 80);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  const deltaMin = useMemo(() => Math.min(...filtered.map(d => d.delta)), [filtered]);
  const deltaMax = useMemo(() => Math.max(...filtered.map(d => d.delta)), [filtered]);
  const deltaRange = deltaMax - deltaMin || 1;

  const priceMin = useMemo(() => Math.min(...filtered.map(d => d.price)), [filtered]);
  const priceMax = useMemo(() => Math.max(...filtered.map(d => d.price)), [filtered]);
  const priceRange = priceMax - priceMin || 1;

  if (filtered.length < 2) return null;

  function xPos(i: number): number {
    return PAD_L + (i / (filtered.length - 1)) * CHART_W;
  }

  function deltaY(val: number): number {
    return PAD_T + (1 - (val - deltaMin) / deltaRange) * CHART_H;
  }

  function priceY(val: number): number {
    return PAD_T + (1 - (val - priceMin) / priceRange) * CHART_H;
  }

  // Delta line path
  const deltaPath = filtered
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${deltaY(d.delta).toFixed(1)}`)
    .join(' ');

  // Delta fill (area under/above zero line)
  const zeroY = deltaY(0);
  const deltaFillPath = `M ${xPos(0).toFixed(1)} ${zeroY.toFixed(1)} ` +
    filtered.map((d, i) => `L ${xPos(i).toFixed(1)} ${deltaY(d.delta).toFixed(1)}`).join(' ') +
    ` L ${xPos(filtered.length - 1).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  // Price line path
  const pricePath = filtered
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${priceY(d.price).toFixed(1)}`)
    .join(' ');

  // Determine overall delta direction for coloring
  const finalDelta = filtered[filtered.length - 1].delta;
  const deltaColor = finalDelta >= 0 ? DELTA_POS : DELTA_NEG;
  const deltaFillColor = finalDelta >= 0 ? 'rgba(56,189,248,0.08)' : 'rgba(248,113,113,0.08)';

  // Zero line
  const showZeroLine = deltaMin < 0 && deltaMax > 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Zero line */}
      {showZeroLine && (
        <line
          x1={PAD_L}
          y1={zeroY}
          x2={W - PAD_R}
          y2={zeroY}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      )}

      {/* Delta area fill */}
      <path d={deltaFillPath} fill={deltaFillColor} />

      {/* Price line (secondary) */}
      <path d={pricePath} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />

      {/* Delta line (primary) */}
      <path d={deltaPath} fill="none" stroke={deltaColor} strokeWidth={1.2} />

      {/* Y-axis labels (delta) */}
      <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">
        {fmtVol(deltaMax)}
      </text>
      <text x={PAD_L - 4} y={H - PAD_B + 2} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">
        {fmtVol(deltaMin)}
      </text>
      {showZeroLine && (
        <text x={PAD_L - 4} y={zeroY + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
          0
        </text>
      )}

      {/* End value indicator */}
      <circle
        cx={xPos(filtered.length - 1)}
        cy={deltaY(filtered[filtered.length - 1].delta)}
        r={2.5}
        fill={deltaColor}
      />

      {/* Legend */}
      <rect x={PAD_L + 4} y={2} width={4} height={4} fill={deltaColor} />
      <text x={PAD_L + 11} y={6} fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace">
        DELTA
      </text>
      <rect x={PAD_L + 48} y={2} width={4} height={4} fill="rgba(255,255,255,0.15)" />
      <text x={PAD_L + 55} y={6} fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace">
        PRICE
      </text>

      {/* Time axis labels */}
      {filtered.length > 4 && [0, Math.floor(filtered.length / 2), filtered.length - 1].map(idx => {
        const d = filtered[idx];
        const date = new Date(d.time);
        const label = date.getHours !== undefined
          ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
          : '';
        return (
          <text
            key={idx}
            x={xPos(idx)}
            y={H - 2}
            textAnchor={idx === 0 ? 'start' : idx === filtered.length - 1 ? 'end' : 'middle'}
            fill="rgba(255,255,255,0.2)"
            fontSize={6}
            fontFamily="monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Buy/Sell Progress Bar ──

function BuySellBar({ buyPct }: { buyPct: number }) {
  const sellPct = 100 - buyPct;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-mono font-bold" style={{ color: BUY_COLOR }}>
          BUY {buyPct.toFixed(1)}%
        </span>
        <span className="text-[7px] font-mono font-bold" style={{ color: SELL_COLOR }}>
          SELL {sellPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden">
        <div style={{ width: `${buyPct}%`, backgroundColor: BUY_COLOR }} className="h-full opacity-70 transition-all" />
        <div style={{ width: `${sellPct}%`, backgroundColor: SELL_COLOR }} className="h-full opacity-60 transition-all" />
      </div>
    </div>
  );
}

// ── Imbalance Zones List ──

function ImbalanceZones({ profile }: { profile: ProfileBin[] }) {
  const t = useT();
  const zones = useMemo(() => {
    return profile
      .filter(b => Math.abs(b.imbalance) > 0.33 && b.totalVol > 0)
      .sort((a, b) => Math.abs(b.imbalance) - Math.abs(a.imbalance))
      .slice(0, 6);
  }, [profile]);

  if (zones.length === 0) return null;

  return (
    <div className="px-3 py-1.5 border-t border-border/20">
      <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
        {tr(t, 'ofImbalanceZones', 'Imbalance Zones')}
      </span>
      <div className="mt-1 flex flex-col gap-0.5">
        {zones.map((z, i) => {
          const isBuyDom = z.imbalance > 0;
          const ratio = z.totalVol > 0
            ? (isBuyDom
                ? (z.buyVol / Math.max(z.sellVol, 1))
                : (z.sellVol / Math.max(z.buyVol, 1)))
            : 1;
          return (
            <div key={i} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-neutral/60">
                  {fmtPrice(z.priceLevel)}
                </span>
                <span
                  className="text-[7px] font-mono font-black px-1 py-0.5"
                  style={{
                    color: isBuyDom ? BUY_COLOR : SELL_COLOR,
                    backgroundColor: isBuyDom ? 'rgba(56,189,248,0.1)' : 'rgba(248,113,113,0.1)',
                  }}
                >
                  {isBuyDom ? 'BUY DOM' : 'SELL DOM'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-neutral/30">
                  {ratio.toFixed(1)}:1
                </span>
                <span className="text-[8px] font-mono font-bold text-neutral/50">
                  {fmtVol(z.totalVol)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryFooter({
  summary,
  poc,
  valueArea,
}: {
  summary: {
    totalBuyVol: number;
    totalSellVol: number;
    netDelta: number;
    vwap: number;
    buyPct: number;
  };
  poc: number;
  valueArea: { high: number; low: number };
}) {
  const t = useT();
  const deltaColor = summary.netDelta >= 0 ? BUY_COLOR : SELL_COLOR;

  return (
    <div className="border-t border-border/20 px-3 py-2 flex flex-col gap-1.5">
      {/* Buy/Sell progress */}
      <BuySellBar buyPct={summary.buyPct} />

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mt-1">
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-neutral/30 uppercase tracking-wider">
            {tr(t, 'ofNetDelta', 'Net Delta')}
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: deltaColor }}>
            {fmtVolSigned(summary.netDelta)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-neutral/30 uppercase tracking-wider">
            {tr(t, 'ofVwap', 'VWAP')}
          </span>
          <span className="text-[9px] font-mono font-bold text-sky-400">
            {fmtPrice(summary.vwap)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-neutral/30 uppercase tracking-wider">
            {tr(t, 'ofPoc', 'POC')}
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: POC_COLOR }}>
            {fmtPrice(poc)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-neutral/30 uppercase tracking-wider">
            {tr(t, 'ofValueArea', 'Value Area')}
          </span>
          <span className="text-[9px] font-mono font-bold text-neutral/50">
            {fmtPrice(valueArea.low)}-{fmtPrice(valueArea.high)}
          </span>
        </div>
      </div>

      {/* Total volumes */}
      <div className="flex items-center gap-3 mt-0.5">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: BUY_COLOR }} />
          <span className="text-[7px] font-mono text-neutral/30">BUY VOL</span>
          <span className="text-[8px] font-mono font-bold" style={{ color: BUY_COLOR }}>
            {fmtVol(summary.totalBuyVol)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: SELL_COLOR }} />
          <span className="text-[7px] font-mono text-neutral/30">SELL VOL</span>
          <span className="text-[8px] font-mono font-bold" style={{ color: SELL_COLOR }}>
            {fmtVol(summary.totalSellVol)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function OrderFlowPanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [range, setRange] = useState<RangeOption>('1d');

  const currentInterval = RANGE_OPTIONS.find(r => r.key === range)?.interval ?? '5m';
  const { data, isLoading, refetch } = useOrderFlow(symbol, range, currentInterval);

  function handleSymbolSubmit() {
    const cleaned = inputValue.trim().toUpperCase();
    if (cleaned && cleaned !== symbol) {
      setSymbol(cleaned);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSymbolSubmit();
    }
  }

  const deltaColor = data && data.summary.netDelta >= 0 ? BUY_COLOR : SELL_COLOR;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="8" width="3" height="6" fill="#38bdf8" opacity="0.7" />
            <rect x="6" y="4" width="3" height="10" fill="#38bdf8" opacity="0.9" />
            <rect x="10" y="6" width="3" height="8" fill="#f87171" opacity="0.7" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'ofTitle', 'Order Flow')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Symbol input */}
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onBlur={handleSymbolSubmit}
            className="w-16 bg-white/[0.03] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-neutral/80 outline-none focus:border-sky-500/40 uppercase"
            spellCheck={false}
          />
          {/* Refresh */}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-sky-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Range selector + badges */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`px-2 py-0.5 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
                range === opt.key
                  ? 'text-sky-400 bg-sky-500/10'
                  : 'text-neutral/30 hover:text-neutral/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {data && (
          <div className="flex items-center gap-2">
            {/* VWAP badge */}
            <span className="text-[7px] font-mono text-neutral/30">VWAP</span>
            <span className="text-[8px] font-mono font-bold text-sky-400">
              {fmtPrice(data.summary.vwap)}
            </span>
            {/* Net Delta badge */}
            <span className="text-[7px] font-mono text-neutral/30">DELTA</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: deltaColor }}>
              {fmtVolSigned(data.summary.netDelta)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <div className="flex flex-col">
            {/* Volume Profile Chart */}
            <div className="px-2 pt-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
                  {tr(t, 'ofVolumeProfile', 'Volume Profile')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-1.5" style={{ backgroundColor: BUY_COLOR, opacity: 0.6 }} />
                    <span className="text-[6px] font-mono text-neutral/25">BUY</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-1.5" style={{ backgroundColor: SELL_COLOR, opacity: 0.5 }} />
                    <span className="text-[6px] font-mono text-neutral/25">SELL</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-0.5" style={{ backgroundColor: POC_COLOR }} />
                    <span className="text-[6px] font-mono text-neutral/25">POC</span>
                  </div>
                </div>
              </div>
              <VolumeProfileChart
                profile={data.profile}
                poc={data.poc}
                valueArea={data.valueArea}
                currentPrice={data.currentPrice}
              />
            </div>

            {/* Cumulative Delta Chart */}
            {data.cumulativeDelta.length > 1 && (
              <div className="px-2 pt-1">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
                    {tr(t, 'ofCumDelta', 'Cumulative Delta')}
                  </span>
                  <span className="text-[7px] font-mono text-neutral/25">
                    {tr(t, 'ofDeltaHint', 'Rising = buying pressure')}
                  </span>
                </div>
                <CumulativeDeltaChart data={data.cumulativeDelta} />
              </div>
            )}

            {/* Imbalance Zones */}
            <ImbalanceZones profile={data.profile} />

            {/* Summary Footer */}
            <SummaryFooter
              summary={data.summary}
              poc={data.poc}
              valueArea={data.valueArea}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] font-mono text-neutral/40 uppercase">
            {tr(t, 'ofNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
