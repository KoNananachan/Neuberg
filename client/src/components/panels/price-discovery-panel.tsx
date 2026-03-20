import { useState, useMemo } from 'react';
import { usePriceDiscovery } from '../../api/hooks/use-price-discovery';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PriceDiscoveryData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VenueEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuoteQualityEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PINEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IntradayBucket = any;

// ── Constants ──

const SKY = '#38bdf8';
const SKY_DIM = 'rgba(56,189,248,0.6)';
const GREEN = '#34d399';
const YELLOW = '#facc15';
const RED = '#f87171';
const ORANGE = '#fb923c';
const WHITE_DIM = 'rgba(255,255,255,0.35)';
const WHITE_FAINT = 'rgba(255,255,255,0.2)';

const SECURITIES = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'META'];

// ── Formatting helpers ──

function fmtPct(n: number | undefined): string {
  if (n == null) return '—';
  return n.toFixed(2) + '%';
}

function fmtBps(n: number | undefined): string {
  if (n == null) return '—';
  return n.toFixed(2) + ' bps';
}

function fmtMs(n: number | undefined): string {
  if (n == null) return '—';
  return n.toFixed(1) + 'ms';
}

function fmtNum(n: number | undefined, decimals = 2): string {
  if (n == null) return '—';
  return n.toFixed(decimals);
}

function compactNumber(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Color helpers ──

function vpinColor(level: number): string {
  if (level >= 0.8) return RED;
  if (level >= 0.6) return ORANGE;
  if (level >= 0.4) return YELLOW;
  return GREEN;
}

function pinColor(pin: number): string {
  if (pin >= 0.4) return RED;
  if (pin >= 0.25) return ORANGE;
  if (pin >= 0.15) return YELLOW;
  return GREEN;
}

function spreadColor(bps: number): string {
  if (bps >= 10) return RED;
  if (bps >= 5) return ORANGE;
  if (bps >= 2) return YELLOW;
  return GREEN;
}

// ── VPIN Gauge (SVG arc) ──

function VPINGauge({ current, average, percentile }: { current: number; average: number; percentile: number }) {
  const W = 140;
  const H = 80;
  const CX = W / 2;
  const CY = 68;
  const R = 52;

  // Arc from -PI to 0 (semicircle)
  const startAngle = Math.PI;
  const endAngle = 0;
  const valueAngle = startAngle - (current * Math.PI);

  function polarToCart(angle: number, r: number) {
    return {
      x: CX + r * Math.cos(angle),
      y: CY - r * Math.sin(angle),
    };
  }

  // Background arc path
  const bgStart = polarToCart(startAngle, R);
  const bgEnd = polarToCart(endAngle, R);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Value arc path
  const valEnd = polarToCart(valueAngle, R);
  const largeArc = current > 0.5 ? 1 : 0;
  const valPath = `M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`;

  const needleTip = polarToCart(valueAngle, R - 6);
  const color = vpinColor(current);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {/* Background arc */}
      <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} strokeLinecap="butt" />

      {/* Value arc */}
      <path d={valPath} fill="none" stroke={color} strokeWidth={8} strokeLinecap="butt" strokeOpacity={0.7} />

      {/* Needle */}
      <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="white" strokeWidth={1} strokeOpacity={0.6} />
      <circle cx={CX} cy={CY} r={2} fill="white" fillOpacity={0.4} />

      {/* Value text */}
      <text x={CX} y={CY - 18} textAnchor="middle" fill={color} fontSize={14} fontFamily="monospace" fontWeight="bold">
        {(current * 100).toFixed(1)}%
      </text>

      {/* Labels */}
      <text x={8} y={CY + 2} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">0%</text>
      <text x={W - 16} y={CY + 2} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">100%</text>

      {/* Stats below */}
      <text x={CX - 28} y={CY - 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={5.5} fontFamily="monospace">
        AVG {(average * 100).toFixed(1)}%
      </text>
      <text x={CX + 28} y={CY - 4} textAnchor="start" fill="rgba(255,255,255,0.25)" fontSize={5.5} fontFamily="monospace">
        P{percentile.toFixed(0)}
      </text>
    </svg>
  );
}

// ── Metric Card ──

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-2 py-1.5 border border-border/20 bg-white/[0.01]">
      <span className="text-[5px] uppercase tracking-wider" style={{ color: WHITE_FAINT }}>{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-[6px]" style={{ color: WHITE_DIM }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Intraday Spread/Volume Bars ──

function IntradayChart({ buckets }: { buckets: IntradayBucket[] }) {
  if (!buckets || buckets.length === 0) return null;

  const W = 360;
  const H = 70;
  const PAD_L = 30;
  const PAD_R = 6;
  const PAD_T = 6;
  const PAD_B = 14;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;

  const maxSpread = Math.max(...buckets.map((b: IntradayBucket) => b?.spread ?? 0), 0.01);
  const maxVol = Math.max(...buckets.map((b: IntradayBucket) => b?.volume ?? 0), 1);

  const barW = CHART_W / buckets.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
      {/* Volume bars */}
      {buckets.map((b: IntradayBucket, i: number) => {
        const x = PAD_L + i * (CHART_W / buckets.length);
        const volH = ((b?.volume ?? 0) / maxVol) * CHART_H;
        const y = PAD_T + CHART_H - volH;
        return (
          <rect
            key={`vol-${i}`}
            x={x}
            y={y}
            width={Math.max(barW, 1)}
            height={volH}
            fill={SKY}
            fillOpacity={0.15}
          />
        );
      })}

      {/* Spread line */}
      {buckets.length > 1 && (
        <path
          d={buckets.map((b: IntradayBucket, i: number) => {
            const x = PAD_L + i * (CHART_W / buckets.length) + barW / 2;
            const y = PAD_T + CHART_H - ((b?.spread ?? 0) / maxSpread) * CHART_H;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke={YELLOW}
          strokeWidth={1}
          strokeOpacity={0.7}
        />
      )}

      {/* Y-axis labels */}
      <text x={PAD_L - 3} y={PAD_T + 4} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize={4.5} fontFamily="monospace">
        {maxSpread.toFixed(1)}
      </text>
      <text x={PAD_L - 3} y={PAD_T + CHART_H} textAnchor="end" fill="rgba(255,255,255,0.15)" fontSize={4.5} fontFamily="monospace">
        0
      </text>

      {/* Time labels */}
      {buckets.length > 0 && [0, Math.floor(buckets.length / 2), buckets.length - 1].map(idx => {
        const b = buckets[idx];
        const x = PAD_L + idx * (CHART_W / buckets.length) + barW / 2;
        return (
          <text key={idx} x={x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={4.5} fontFamily="monospace">
            {b?.time ?? ''}
          </text>
        );
      })}

      {/* Legend */}
      <rect x={PAD_L} y={1} width={6} height={2} fill={YELLOW} fillOpacity={0.7} />
      <text x={PAD_L + 8} y={3.5} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">SPREAD</text>
      <rect x={PAD_L + 42} y={1} width={6} height={2} fill={SKY} fillOpacity={0.3} />
      <text x={PAD_L + 50} y={3.5} fill="rgba(255,255,255,0.25)" fontSize={4} fontFamily="monospace">VOLUME</text>
    </svg>
  );
}

// ── Main Panel ──

export function PriceDiscoveryPanel() {
  const t = useT();
  const [selectedSymbol, setSelectedSymbol] = useState('SPY');
  const { data, isLoading, error } = usePriceDiscovery() as {
    data: PriceDiscoveryData;
    isLoading: boolean;
    error: unknown;
  };

  const microstructure = data?.microstructure;
  const venues = data?.venues as VenueEntry[] | undefined;
  const vpin = data?.vpin;
  const quoteQuality = data?.quoteQuality as QuoteQualityEntry[] | undefined;
  const pinEstimates = data?.pinEstimates as PINEntry[] | undefined;
  const intradayBuckets = data?.intradayPattern as IntradayBucket[] | undefined;

  // Sort venues by market share descending
  const sortedVenues = useMemo(() => {
    if (!venues) return [];
    return [...venues].sort((a: VenueEntry, b: VenueEntry) => (b?.marketShare ?? 0) - (a?.marketShare ?? 0));
  }, [venues]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 12 L5 6 L8 9 L11 3 L14 7" fill="none" stroke={SKY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="5" cy="6" r="1.2" fill={SKY} />
            <circle cx="11" cy="3" r="1.2" fill={SKY} />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter text-sky-400">
            {tr(t, 'panelPriceDiscovery', 'Price Discovery')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data?.timestamp && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className={`text-[6px] ${isLoading ? 'text-sky-400' : 'text-white/20'}`}>
            {isLoading ? 'LOADING' : ''}
          </span>
        </div>
      </div>

      {/* Security selector tabs */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 shrink-0 gap-0.5 overflow-x-auto">
        {SECURITIES.map(sym => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider transition-colors shrink-0 ${
              selectedSymbol === sym
                ? 'text-sky-400 bg-sky-500/10'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-[10px] text-red-400/60 uppercase">
            {tr(t, 'pdError', 'Failed to load data')}
          </div>
        ) : data ? (
          <div className="flex flex-col">
            {/* ── Microstructure Metrics ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  MICROSTRUCTURE METRICS
                </span>
              </div>
              <div className="grid grid-cols-4 gap-px px-2 pb-2">
                <MetricCard
                  label="BID-ASK SPREAD"
                  value={fmtBps(microstructure?.bidAskSpread)}
                  color={spreadColor(microstructure?.bidAskSpread ?? 0)}
                />
                <MetricCard
                  label="MARKET DEPTH"
                  value={compactNumber(microstructure?.depth)}
                  color={SKY}
                />
                <MetricCard
                  label="PRICE IMPACT"
                  value={fmtBps(microstructure?.priceImpact)}
                  color={microstructure?.priceImpact > 5 ? RED : microstructure?.priceImpact > 2 ? YELLOW : GREEN}
                />
                <MetricCard
                  label="EFFECTIVE SPREAD"
                  value={fmtBps(microstructure?.effectiveSpread)}
                  color={spreadColor(microstructure?.effectiveSpread ?? 0)}
                />
              </div>
            </div>

            {/* ── Venue Analysis Table ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  VENUE ANALYSIS
                </span>
              </div>
              <div className="px-1">
                {/* Header */}
                <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase tracking-wider gap-1">
                  <span className="w-[60px] shrink-0">VENUE</span>
                  <span className="w-[40px] text-right shrink-0">MKT SHARE</span>
                  <span className="w-[40px] text-right shrink-0">FILL RATE</span>
                  <span className="w-[40px] text-right shrink-0">EXEC TIME</span>
                  <span className="w-[40px] text-right shrink-0">INFO SHARE</span>
                </div>
                {/* Rows */}
                {sortedVenues.map((v: VenueEntry, i: number) => (
                  <div
                    key={v?.name ?? i}
                    className="flex items-center py-0.5 px-1 border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors gap-1"
                  >
                    <span className="w-[60px] text-[7px] font-bold text-white/60 truncate shrink-0">
                      {v?.name ?? '—'}
                    </span>
                    <span className="w-[40px] text-[7px] text-right font-bold shrink-0" style={{ color: SKY }}>
                      {fmtPct(v?.marketShare)}
                    </span>
                    <span
                      className="w-[40px] text-[7px] text-right font-bold shrink-0"
                      style={{ color: (v?.fillRate ?? 0) >= 90 ? GREEN : (v?.fillRate ?? 0) >= 70 ? YELLOW : RED }}
                    >
                      {fmtPct(v?.fillRate)}
                    </span>
                    <span
                      className="w-[40px] text-[7px] text-right shrink-0"
                      style={{ color: (v?.execTime ?? 0) <= 5 ? GREEN : (v?.execTime ?? 0) <= 20 ? YELLOW : RED }}
                    >
                      {fmtMs(v?.execTime)}
                    </span>
                    <span className="w-[40px] text-[7px] text-right font-bold shrink-0" style={{ color: WHITE_DIM }}>
                      {fmtPct(v?.infoShare)}
                    </span>
                  </div>
                ))}
                {sortedVenues.length === 0 && (
                  <div className="py-2 text-center text-[7px] text-white/20">No venue data</div>
                )}
              </div>
            </div>

            {/* ── Order Flow Toxicity (VPIN) ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  ORDER FLOW TOXICITY — VPIN
                </span>
              </div>
              <div className="flex items-center justify-center py-1">
                {vpin ? (
                  <VPINGauge
                    current={vpin?.current ?? 0}
                    average={vpin?.average ?? 0}
                    percentile={vpin?.percentile ?? 50}
                  />
                ) : (
                  <span className="text-[7px] text-white/20 py-4">No VPIN data</span>
                )}
              </div>
              {vpin && (
                <div className="flex items-center justify-center gap-4 px-2 pb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[5px] text-white/20 uppercase">CURRENT</span>
                    <span className="text-[8px] font-bold" style={{ color: vpinColor(vpin?.current ?? 0) }}>
                      {((vpin?.current ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[5px] text-white/20 uppercase">AVG</span>
                    <span className="text-[8px] font-bold text-white/40">
                      {((vpin?.average ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[5px] text-white/20 uppercase">PERCENTILE</span>
                    <span className="text-[8px] font-bold" style={{ color: (vpin?.percentile ?? 0) >= 90 ? RED : (vpin?.percentile ?? 0) >= 75 ? ORANGE : WHITE_DIM }}>
                      P{(vpin?.percentile ?? 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Quote Quality ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  QUOTE QUALITY — VENUE COMPARISON
                </span>
              </div>
              <div className="px-1">
                {/* Header */}
                <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase tracking-wider gap-1">
                  <span className="w-[60px] shrink-0">VENUE</span>
                  <span className="w-[50px] text-right shrink-0">QT RATIO</span>
                  <span className="w-[50px] text-right shrink-0">NBBO TIME</span>
                  <span className="w-[50px] text-right shrink-0">QUOTE LIFE</span>
                </div>
                {quoteQuality?.map((q: QuoteQualityEntry, i: number) => (
                  <div
                    key={q?.venue ?? i}
                    className="flex items-center py-0.5 px-1 border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors gap-1"
                  >
                    <span className="w-[60px] text-[7px] font-bold text-white/60 truncate shrink-0">
                      {q?.venue ?? '—'}
                    </span>
                    <span
                      className="w-[50px] text-[7px] text-right font-bold shrink-0"
                      style={{ color: (q?.quoteToTradeRatio ?? 0) > 20 ? RED : (q?.quoteToTradeRatio ?? 0) > 10 ? YELLOW : GREEN }}
                    >
                      {fmtNum(q?.quoteToTradeRatio, 1)}:1
                    </span>
                    <span
                      className="w-[50px] text-[7px] text-right shrink-0"
                      style={{ color: (q?.nbboTimePct ?? 0) >= 80 ? GREEN : (q?.nbboTimePct ?? 0) >= 50 ? YELLOW : RED }}
                    >
                      {fmtPct(q?.nbboTimePct)}
                    </span>
                    <span className="w-[50px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                      {fmtMs(q?.avgQuoteLife)}
                    </span>
                  </div>
                ))}
                {(!quoteQuality || quoteQuality.length === 0) && (
                  <div className="py-2 text-center text-[7px] text-white/20">No quote quality data</div>
                )}
              </div>
            </div>

            {/* ── PIN Estimates ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  PIN ESTIMATES — INFORMATION ASYMMETRY
                </span>
              </div>
              <div className="px-1">
                {/* Header */}
                <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase tracking-wider gap-1">
                  <span className="w-[40px] shrink-0">SYMBOL</span>
                  <span className="w-[36px] text-right shrink-0">PIN</span>
                  <span className="w-[36px] text-right shrink-0">ALPHA</span>
                  <span className="w-[36px] text-right shrink-0">DELTA</span>
                  <span className="w-[36px] text-right shrink-0">MU</span>
                  <span className="w-[36px] text-right shrink-0">EPSILON</span>
                  <span className="flex-1 text-center shrink-0">LEVEL</span>
                </div>
                {pinEstimates?.map((p: PINEntry, i: number) => {
                  const pin = p?.pin ?? 0;
                  const levelLabel = pin >= 0.4 ? 'HIGH' : pin >= 0.25 ? 'ELEVATED' : pin >= 0.15 ? 'MODERATE' : 'LOW';
                  return (
                    <div
                      key={p?.symbol ?? i}
                      className="flex items-center py-0.5 px-1 border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors gap-1"
                    >
                      <span className="w-[40px] text-[7px] font-bold text-white/70 shrink-0">
                        {p?.symbol ?? '—'}
                      </span>
                      <span className="w-[36px] text-[7px] text-right font-bold shrink-0" style={{ color: pinColor(pin) }}>
                        {fmtNum(pin, 3)}
                      </span>
                      <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                        {fmtNum(p?.alpha, 3)}
                      </span>
                      <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                        {fmtNum(p?.delta, 3)}
                      </span>
                      <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                        {fmtNum(p?.mu, 1)}
                      </span>
                      <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                        {fmtNum(p?.epsilon, 1)}
                      </span>
                      <span className="flex-1 text-center shrink-0">
                        <span
                          className="text-[5px] font-black uppercase px-1 py-0.5 inline-block"
                          style={{
                            color: pinColor(pin),
                            backgroundColor: pin >= 0.4 ? 'rgba(248,113,113,0.15)' : pin >= 0.25 ? 'rgba(251,146,60,0.12)' : pin >= 0.15 ? 'rgba(250,204,21,0.1)' : 'rgba(52,211,153,0.1)',
                          }}
                        >
                          {levelLabel}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {(!pinEstimates || pinEstimates.length === 0) && (
                  <div className="py-2 text-center text-[7px] text-white/20">No PIN data</div>
                )}
              </div>
            </div>

            {/* ── Intraday Pattern ── */}
            <div className="border-b border-border/20">
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[6px] uppercase tracking-wider text-sky-400/60">
                  INTRADAY PATTERN — HALF-HOUR BUCKETS
                </span>
              </div>
              <div className="px-2 pb-1">
                {intradayBuckets && intradayBuckets.length > 0 ? (
                  <IntradayChart buckets={intradayBuckets} />
                ) : (
                  <div className="py-3 text-center text-[7px] text-white/20">No intraday data</div>
                )}
              </div>
              {/* Intraday data table */}
              {intradayBuckets && intradayBuckets.length > 0 && (
                <div className="px-1 pb-1">
                  <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] text-white/20 uppercase tracking-wider gap-1">
                    <span className="w-[44px] shrink-0">TIME</span>
                    <span className="w-[36px] text-right shrink-0">SPREAD</span>
                    <span className="w-[44px] text-right shrink-0">VOLUME</span>
                    <span className="w-[36px] text-right shrink-0">VOL %</span>
                    <span className="flex-1 shrink-0 text-right">TRADES</span>
                  </div>
                  {intradayBuckets.map((b: IntradayBucket, i: number) => {
                    const totalVol = intradayBuckets.reduce((s: number, x: IntradayBucket) => s + (x?.volume ?? 0), 0) || 1;
                    const volPct = ((b?.volume ?? 0) / totalVol) * 100;
                    return (
                      <div
                        key={b?.time ?? i}
                        className="flex items-center py-0.5 px-1 border-b border-white/[0.02] hover:bg-sky-400/[0.02] transition-colors gap-1"
                      >
                        <span className="w-[44px] text-[7px] font-bold text-white/50 shrink-0">
                          {b?.time ?? '—'}
                        </span>
                        <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: spreadColor(b?.spread ?? 0) }}>
                          {fmtBps(b?.spread)}
                        </span>
                        <span className="w-[44px] text-[7px] text-right shrink-0" style={{ color: SKY_DIM }}>
                          {compactNumber(b?.volume)}
                        </span>
                        <span className="w-[36px] text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                          {volPct.toFixed(1)}%
                        </span>
                        <span className="flex-1 text-[7px] text-right shrink-0" style={{ color: WHITE_DIM }}>
                          {compactNumber(b?.trades)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'pdNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
