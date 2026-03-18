import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useChart, type Candle } from '../../api/hooks/use-chart';
import { useT } from '../../i18n';
import { Search } from 'lucide-react';

// ─── Technical indicator calculation functions (pure TypeScript) ───

function calcSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(sum / period);
    }
  }
  return result;
}

function calcEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[j];
      result.push(sum / period);
    } else {
      const prev = result[i - 1];
      if (prev == null) {
        result.push(null);
      } else {
        result.push((data[i] - prev) * multiplier + prev);
      }
    }
  }
  return result;
}

function calcRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (data.length < period + 1) return data.map(() => null);

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const change = data[i] - data[i - 1];
      const gain = change >= 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function calcMACD(
  data: number[],
  fast: number,
  slow: number,
  signal: number,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);
  const macdLine: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i];
    return f != null && s != null ? f - s : null;
  });
  const macdNonNull = macdLine.filter((v): v is number => v != null);
  const signalLine = calcEMA(macdNonNull, signal);
  // Align signal line with macd line
  const signalAligned: (number | null)[] = [];
  let idx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      signalAligned.push(signalLine[idx] ?? null);
      idx++;
    } else {
      signalAligned.push(null);
    }
  }
  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signalAligned[i];
    return m != null && s != null ? m - s : null;
  });
  return { macd: macdLine, signal: signalAligned, histogram };
}

function calcBollinger(
  data: number[],
  period: number,
  stdDev: number,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calcSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const m = middle[i];
    if (m == null || i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += (data[j] - m) ** 2;
      }
      const sd = Math.sqrt(variance / period);
      upper.push(m + stdDev * sd);
      lower.push(m - stdDev * sd);
    }
  }
  return { upper, middle, lower };
}

// ─── Formatting helpers ───

function formatPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

function formatVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function formatDate(ts: number, range: string): string {
  const d = new Date(ts * 1000);
  if (range === '1d') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (range === '5d') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAxisDate(ts: number, range: string): string {
  const d = new Date(ts * 1000);
  if (range === '1d' || range === '5d') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (range === '1mo' || range === '3mo') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── Range → interval mapping ───

const RANGE_INTERVAL: Record<string, string> = {
  '1d': '5m',
  '5d': '15m',
  '1mo': '1h',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1d',
  '2y': '1wk',
  '5y': '1wk',
};

// ─── Types ───

type ChartType = 'candle' | 'line';
type IndicatorKey = 'sma20' | 'sma50' | 'sma200' | 'ema20' | 'ema50' | 'ema200' | 'rsi' | 'macd' | 'bollinger' | 'volume';

interface Indicators {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  rsi: boolean;
  macd: boolean;
  bollinger: boolean;
  volume: boolean;
}

const DEFAULT_INDICATORS: Indicators = {
  sma20: true,
  sma50: true,
  sma200: false,
  ema20: false,
  ema50: false,
  ema200: false,
  rsi: false,
  macd: false,
  bollinger: false,
  volume: true,
};

const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  sma20: 'SMA 20',
  sma50: 'SMA 50',
  sma200: 'SMA 200',
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  ema200: 'EMA 200',
  rsi: 'RSI (14)',
  macd: 'MACD',
  bollinger: 'Bollinger',
  volume: 'Volume',
};

const RANGE_LABELS = ['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
const RANGE_VALUES = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'];

// ─── Main component ───

export function TechnicalChartPanel() {
  const t = useT();
  const tr = (key: string, fallback: string) => {
    try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
  };

  const [symbol, setSymbol] = useState('AAPL');
  const [inputValue, setInputValue] = useState('AAPL');
  const [range, setRange] = useState('6mo');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<Indicators>(DEFAULT_INDICATORS);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const indicatorMenuRef = useRef<HTMLDivElement>(null);

  const interval = RANGE_INTERVAL[range] || '1d';
  const { data, isLoading, error } = useChart(symbol, range, interval);
  const candles = data?.candles ?? [];

  // Close indicator menu on outside click
  useEffect(() => {
    if (!showIndicatorMenu) return;
    const handler = (e: MouseEvent) => {
      if (indicatorMenuRef.current && !indicatorMenuRef.current.contains(e.target as Node)) {
        setShowIndicatorMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIndicatorMenu]);

  const handleSymbolSubmit = useCallback(() => {
    const trimmed = inputValue.trim().toUpperCase();
    if (trimmed && trimmed !== symbol) {
      setSymbol(trimmed);
    }
  }, [inputValue, symbol]);

  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Compute sub-chart heights
  const hasRSI = indicators.rsi;
  const hasMACD = indicators.macd;
  const hasVolume = indicators.volume;

  const subChartCount = (hasVolume ? 1 : 0) + (hasRSI ? 1 : 0) + (hasMACD ? 1 : 0);
  // Price chart gets remaining space
  const priceHeightPct = subChartCount === 0 ? 100 : subChartCount === 1 ? 72 : subChartCount === 2 ? 58 : 50;
  const volHeightPct = hasVolume ? (subChartCount === 1 ? 28 : subChartCount === 2 ? 18 : 15) : 0;
  const rsiHeightPct = hasRSI ? (subChartCount === 1 ? 28 : subChartCount === 2 ? 18 : 15) : 0;
  const macdHeightPct = hasMACD ? (subChartCount === 1 ? 28 : subChartCount === 2 ? 18 : 15) : 0;

  // Pre-compute indicator data
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);

  const indicatorData = useMemo(() => {
    const d: {
      sma20: (number | null)[];
      sma50: (number | null)[];
      sma200: (number | null)[];
      ema20: (number | null)[];
      ema50: (number | null)[];
      ema200: (number | null)[];
      rsi: (number | null)[];
      macd: { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
      bollinger: { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] };
    } = {
      sma20: [],
      sma50: [],
      sma200: [],
      ema20: [],
      ema50: [],
      ema200: [],
      rsi: [],
      macd: { macd: [], signal: [], histogram: [] },
      bollinger: { upper: [], middle: [], lower: [] },
    };
    if (closes.length === 0) return d;
    if (indicators.sma20) d.sma20 = calcSMA(closes, 20);
    if (indicators.sma50) d.sma50 = calcSMA(closes, 50);
    if (indicators.sma200) d.sma200 = calcSMA(closes, 200);
    if (indicators.ema20) d.ema20 = calcEMA(closes, 20);
    if (indicators.ema50) d.ema50 = calcEMA(closes, 50);
    if (indicators.ema200) d.ema200 = calcEMA(closes, 200);
    if (indicators.rsi) d.rsi = calcRSI(closes, 14);
    if (indicators.macd) d.macd = calcMACD(closes, 12, 26, 9);
    if (indicators.bollinger) d.bollinger = calcBollinger(closes, 20, 2);
    return d;
  }, [closes, indicators]);

  // Last candle stats
  const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;
  const change = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const changePct = prevCandle && prevCandle.close !== 0 ? (change / prevCandle.close) * 100 : 0;

  // Hover candle
  const hoverCandle = hoverIndex != null && hoverIndex >= 0 && hoverIndex < candles.length ? candles[hoverIndex] : null;

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden select-none" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}>
      {/* Top control bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5 shrink-0 flex-wrap">
        {/* Symbol input */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5">
          <Search className="w-3 h-3 text-amber-400/60" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSymbolSubmit()}
            onBlur={handleSymbolSubmit}
            className="bg-transparent text-amber-400 text-[10px] font-bold w-16 outline-none placeholder:text-white/20 uppercase tracking-wider"
            placeholder="SYMBOL"
          />
        </div>

        {/* Range buttons */}
        <div className="flex items-center gap-0.5">
          {RANGE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setRange(RANGE_VALUES[i])}
              className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider transition-colors ${
                range === RANGE_VALUES[i]
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                  : 'text-white/40 hover:text-white/70 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={() => setChartType('candle')}
            className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider transition-colors ${
              chartType === 'candle'
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            {tr('chartCandle', 'CANDLE')}
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider transition-colors ${
              chartType === 'line'
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            {tr('chartLine', 'LINE')}
          </button>
        </div>

        {/* Indicators dropdown */}
        <div className="relative ml-1" ref={indicatorMenuRef}>
          <button
            onClick={() => setShowIndicatorMenu((v) => !v)}
            className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider transition-colors border ${
              showIndicatorMenu
                ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                : 'text-white/40 hover:text-white/70 border-white/10'
            }`}
          >
            {tr('chartIndicators', 'INDICATORS')}
          </button>
          {showIndicatorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-white/10 shadow-2xl z-50 min-w-[140px]">
              {(Object.keys(INDICATOR_LABELS) as IndicatorKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleIndicator(key)}
                  className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-white/5 transition-colors"
                >
                  <span
                    className={`w-2.5 h-2.5 border flex items-center justify-center text-[7px] ${
                      indicators[key] ? 'bg-amber-400/30 border-amber-400 text-amber-400' : 'border-white/20'
                    }`}
                  >
                    {indicators[key] ? '\u2713' : ''}
                  </span>
                  <span className={`text-[9px] font-mono ${indicators[key] ? 'text-white' : 'text-white/40'}`}>
                    {INDICATOR_LABELS[key]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats bar (right side) */}
        <div className="ml-auto flex items-center gap-3 text-[9px] font-mono">
          {lastCandle && (
            <>
              <span className="text-amber-400 font-bold">{symbol}</span>
              <span className="text-white font-bold">{formatPrice(lastCandle.close)}</span>
              <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {change >= 0 ? '+' : ''}{formatPrice(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
              <span className="text-white/30">H:{formatPrice(lastCandle.high)}</span>
              <span className="text-white/30">L:{formatPrice(lastCandle.low)}</span>
              <span className="text-white/30">V:{formatVol(lastCandle.volume)}</span>
            </>
          )}
        </div>
      </div>

      {/* Hover OHLCV overlay */}
      {hoverCandle && (
        <div className="absolute top-8 left-2 z-30 flex items-center gap-3 text-[9px] font-mono bg-black/80 px-2 py-0.5 border border-white/5">
          <span className="text-white/50">{formatDate(hoverCandle.timestamp, range)}</span>
          <span className="text-white/70">O:<span className="text-white">{formatPrice(hoverCandle.open)}</span></span>
          <span className="text-white/70">H:<span className="text-white">{formatPrice(hoverCandle.high)}</span></span>
          <span className="text-white/70">L:<span className="text-white">{formatPrice(hoverCandle.low)}</span></span>
          <span className="text-white/70">C:<span className={hoverCandle.close >= hoverCandle.open ? 'text-emerald-400' : 'text-red-400'}>{formatPrice(hoverCandle.close)}</span></span>
          <span className="text-white/70">V:<span className="text-white">{formatVol(hoverCandle.volume)}</span></span>
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 text-red-400 text-[10px] font-mono">
            {tr('chartError', 'Failed to load chart data')}
          </div>
        )}
        {!isLoading && !error && candles.length > 0 && (
          <ChartSVG
            candles={candles}
            chartType={chartType}
            range={range}
            indicators={indicators}
            indicatorData={indicatorData}
            priceHeightPct={priceHeightPct}
            volHeightPct={volHeightPct}
            rsiHeightPct={rsiHeightPct}
            macdHeightPct={macdHeightPct}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
          />
        )}
        {!isLoading && !error && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-[10px] font-mono uppercase tracking-widest">
            {tr('chartNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SVG Chart component ───

interface ChartSVGProps {
  candles: Candle[];
  chartType: ChartType;
  range: string;
  indicators: Indicators;
  indicatorData: {
    sma20: (number | null)[];
    sma50: (number | null)[];
    sma200: (number | null)[];
    ema20: (number | null)[];
    ema50: (number | null)[];
    ema200: (number | null)[];
    rsi: (number | null)[];
    macd: { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
    bollinger: { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] };
  };
  priceHeightPct: number;
  volHeightPct: number;
  rsiHeightPct: number;
  macdHeightPct: number;
  hoverIndex: number | null;
  setHoverIndex: (i: number | null) => void;
}

function ChartSVG({
  candles,
  chartType,
  range,
  indicators,
  indicatorData,
  priceHeightPct,
  volHeightPct,
  rsiHeightPct,
  macdHeightPct,
  hoverIndex,
  setHoverIndex,
}: ChartSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = dims;
  const LEFT = 4;
  const RIGHT = 60;
  const TOP = 4;
  const BOTTOM = 16;
  const GAP = 2; // gap between sub-charts
  const chartW = W - LEFT - RIGHT;
  const totalH = H - TOP - BOTTOM;

  // Section heights
  const priceH = (totalH * priceHeightPct) / 100;
  const volH = (totalH * volHeightPct) / 100;
  const rsiH = (totalH * rsiHeightPct) / 100;
  const macdH = (totalH * macdHeightPct) / 100;

  // Y offsets for each section
  const priceY0 = TOP;
  const volY0 = priceY0 + priceH + (volHeightPct > 0 ? GAP : 0);
  const rsiY0 = volY0 + volH + (rsiHeightPct > 0 ? GAP : 0);
  const macdY0 = rsiY0 + rsiH + (macdHeightPct > 0 ? GAP : 0);

  const n = candles.length;
  const candleStep = n > 0 ? chartW / n : 1;
  const candleW = Math.max(1, candleStep * 0.7);

  function indexToX(i: number): number {
    return LEFT + (i + 0.5) * candleStep;
  }

  // Price range (include Bollinger if active)
  const priceRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    if (indicators.bollinger && indicatorData.bollinger.upper.length > 0) {
      for (const v of indicatorData.bollinger.upper) if (v != null && v > max) max = v;
      for (const v of indicatorData.bollinger.lower) if (v != null && v < min) min = v;
    }
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }, [candles, indicators.bollinger, indicatorData.bollinger]);

  function priceToY(price: number): number {
    const pct = (price - priceRange.min) / (priceRange.max - priceRange.min);
    return priceY0 + priceH * (1 - pct);
  }

  // Volume range
  const volRange = useMemo(() => {
    let max = 0;
    for (const c of candles) if (c.volume > max) max = c.volume;
    return { min: 0, max: max || 1 };
  }, [candles]);

  function volToY(vol: number): number {
    const pct = vol / volRange.max;
    return volY0 + volH * (1 - pct);
  }

  // RSI range (0-100)
  function rsiToY(val: number): number {
    const pct = val / 100;
    return rsiY0 + rsiH * (1 - pct);
  }

  // MACD range
  const macdRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const v of indicatorData.macd.macd) if (v != null) { if (v < min) min = v; if (v > max) max = v; }
    for (const v of indicatorData.macd.signal) if (v != null) { if (v < min) min = v; if (v > max) max = v; }
    for (const v of indicatorData.macd.histogram) if (v != null) { if (v < min) min = v; if (v > max) max = v; }
    if (min === Infinity) { min = -1; max = 1; }
    const pad = (max - min) * 0.1 || 0.1;
    return { min: min - pad, max: max + pad };
  }, [indicatorData.macd]);

  function macdToY(val: number): number {
    const pct = (val - macdRange.min) / (macdRange.max - macdRange.min);
    return macdY0 + macdH * (1 - pct);
  }

  // Build overlay line path
  function buildLinePath(data: (number | null)[], toY: (v: number) => number): string {
    let d = '';
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v == null) continue;
      const x = indexToX(i);
      const y = toY(v);
      d += d === '' ? `M${x},${y}` : `L${x},${y}`;
    }
    return d;
  }

  // X-axis labels (show ~8)
  const xLabels = useMemo(() => {
    if (n === 0) return [];
    const count = Math.max(2, Math.min(8, Math.floor(chartW / 80)));
    const step = Math.max(1, Math.floor(n / count));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < n; i += step) {
      labels.push({ x: indexToX(i), label: formatAxisDate(candles[i].timestamp, range) });
    }
    return labels;
  }, [n, chartW, candles, range]);

  // Y-axis price labels (~5)
  const yPriceLabels = useMemo(() => {
    const count = Math.max(2, Math.min(6, Math.floor(priceH / 40)));
    const labels: { y: number; label: string }[] = [];
    const step = (priceRange.max - priceRange.min) / count;
    for (let i = 0; i <= count; i++) {
      const price = priceRange.min + step * i;
      labels.push({ y: priceToY(price), label: formatPrice(price) });
    }
    return labels;
  }, [priceRange, priceH]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left - LEFT;
      if (mx < 0 || mx > chartW) { setHoverIndex(null); return; }
      const idx = Math.floor(mx / candleStep);
      setHoverIndex(Math.min(Math.max(0, idx), n - 1));
    },
    [candleStep, chartW, n, setHoverIndex],
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), [setHoverIndex]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      >
        {/* Grid lines (subtle) */}
        {yPriceLabels.map((l, i) => (
          <line key={`grid-h-${i}`} x1={LEFT} y1={l.y} x2={W - RIGHT} y2={l.y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        ))}
        {xLabels.map((l, i) => (
          <line key={`grid-v-${i}`} x1={l.x} y1={TOP} x2={l.x} y2={H - BOTTOM} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
        ))}

        {/* Section dividers */}
        {volHeightPct > 0 && (
          <line x1={LEFT} y1={volY0 - 1} x2={W - RIGHT} y2={volY0 - 1} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        )}
        {rsiHeightPct > 0 && (
          <line x1={LEFT} y1={rsiY0 - 1} x2={W - RIGHT} y2={rsiY0 - 1} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        )}
        {macdHeightPct > 0 && (
          <line x1={LEFT} y1={macdY0 - 1} x2={W - RIGHT} y2={macdY0 - 1} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        )}

        {/* Bollinger Bands */}
        {indicators.bollinger && indicatorData.bollinger.upper.length > 0 && (() => {
          const upper = indicatorData.bollinger.upper;
          const lower = indicatorData.bollinger.lower;
          // Build fill polygon
          let fillPath = '';
          const upperPoints: string[] = [];
          const lowerPoints: string[] = [];
          for (let i = 0; i < upper.length; i++) {
            if (upper[i] != null && lower[i] != null) {
              const x = indexToX(i);
              upperPoints.push(`${x},${priceToY(upper[i]!)}`);
              lowerPoints.unshift(`${x},${priceToY(lower[i]!)}`);
            }
          }
          if (upperPoints.length > 1) {
            fillPath = `M${upperPoints.join('L')}L${lowerPoints.join('L')}Z`;
          }
          return (
            <>
              {fillPath && <path d={fillPath} fill="rgba(251,191,36,0.06)" />}
              <path d={buildLinePath(upper, priceToY)} fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth={0.7} />
              <path d={buildLinePath(indicatorData.bollinger.middle, priceToY)} fill="none" stroke="rgba(251,191,36,0.2)" strokeWidth={0.5} strokeDasharray="3,3" />
              <path d={buildLinePath(lower, priceToY)} fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth={0.7} />
            </>
          );
        })()}

        {/* Price chart */}
        {chartType === 'candle' ? (
          candles.map((c, i) => {
            const x = indexToX(i);
            const isUp = c.close >= c.open;
            const color = isUp ? '#22c55e' : '#ef4444';
            const bodyTop = priceToY(Math.max(c.open, c.close));
            const bodyBot = priceToY(Math.min(c.open, c.close));
            const bodyH = Math.max(0.5, bodyBot - bodyTop);
            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={priceToY(c.high)}
                  x2={x}
                  y2={priceToY(c.low)}
                  stroke={color}
                  strokeWidth={0.8}
                />
                {/* Body */}
                <rect
                  x={x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  fill={color}
                />
              </g>
            );
          })
        ) : (
          (() => {
            // Line chart with gradient fill
            const points = candles.map((c, i) => `${indexToX(i)},${priceToY(c.close)}`);
            const linePath = `M${points.join('L')}`;
            const firstX = indexToX(0);
            const lastX = indexToX(candles.length - 1);
            const fillPath = `${linePath}L${lastX},${priceY0 + priceH}L${firstX},${priceY0 + priceH}Z`;
            return (
              <>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#lineGradient)" />
                <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
              </>
            );
          })()
        )}

        {/* SMA overlays */}
        {indicators.sma20 && (
          <path d={buildLinePath(indicatorData.sma20, priceToY)} fill="none" stroke="#facc15" strokeWidth={1} opacity={0.8} />
        )}
        {indicators.sma50 && (
          <path d={buildLinePath(indicatorData.sma50, priceToY)} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.8} />
        )}
        {indicators.sma200 && (
          <path d={buildLinePath(indicatorData.sma200, priceToY)} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.8} />
        )}

        {/* EMA overlays (dashed) */}
        {indicators.ema20 && (
          <path d={buildLinePath(indicatorData.ema20, priceToY)} fill="none" stroke="#facc15" strokeWidth={1} strokeDasharray="4,2" opacity={0.8} />
        )}
        {indicators.ema50 && (
          <path d={buildLinePath(indicatorData.ema50, priceToY)} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4,2" opacity={0.8} />
        )}
        {indicators.ema200 && (
          <path d={buildLinePath(indicatorData.ema200, priceToY)} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="4,2" opacity={0.8} />
        )}

        {/* Volume bars */}
        {indicators.volume && candles.map((c, i) => {
          const x = indexToX(i);
          const isUp = c.close >= c.open;
          const color = isUp ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
          const barTop = volToY(c.volume);
          const barH = volY0 + volH - barTop;
          return (
            <rect
              key={`vol-${i}`}
              x={x - candleW / 2}
              y={barTop}
              width={candleW}
              height={Math.max(0, barH)}
              fill={color}
            />
          );
        })}

        {/* Volume Y-axis labels */}
        {indicators.volume && (
          <>
            <text x={W - RIGHT + 4} y={volY0 + 8} fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
              {formatVol(volRange.max)}
            </text>
            <text x={W - RIGHT + 4} y={volY0 + volH} fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace">
              0
            </text>
          </>
        )}

        {/* RSI chart */}
        {indicators.rsi && rsiHeightPct > 0 && (
          <>
            {/* Overbought/oversold zones */}
            <rect x={LEFT} y={rsiToY(70)} width={chartW} height={rsiToY(30) - rsiToY(70)} fill="rgba(255,255,255,0.02)" />
            <line x1={LEFT} y1={rsiToY(70)} x2={W - RIGHT} y2={rsiToY(70)} stroke="rgba(239,68,68,0.3)" strokeWidth={0.5} strokeDasharray="4,3" />
            <line x1={LEFT} y1={rsiToY(30)} x2={W - RIGHT} y2={rsiToY(30)} stroke="rgba(34,197,94,0.3)" strokeWidth={0.5} strokeDasharray="4,3" />
            <line x1={LEFT} y1={rsiToY(50)} x2={W - RIGHT} y2={rsiToY(50)} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
            <path d={buildLinePath(indicatorData.rsi, rsiToY)} fill="none" stroke="#a855f7" strokeWidth={1} />
            {/* Labels */}
            <text x={W - RIGHT + 4} y={rsiToY(70) + 3} fill="rgba(239,68,68,0.5)" fontSize={7} fontFamily="monospace">70</text>
            <text x={W - RIGHT + 4} y={rsiToY(30) + 3} fill="rgba(34,197,94,0.5)" fontSize={7} fontFamily="monospace">30</text>
            <text x={LEFT + 2} y={rsiY0 + 8} fill="rgba(168,85,247,0.6)" fontSize={7} fontFamily="monospace">RSI</text>
          </>
        )}

        {/* MACD chart */}
        {indicators.macd && macdHeightPct > 0 && (
          <>
            {/* Zero line */}
            <line x1={LEFT} y1={macdToY(0)} x2={W - RIGHT} y2={macdToY(0)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
            {/* Histogram */}
            {indicatorData.macd.histogram.map((v, i) => {
              if (v == null) return null;
              const x = indexToX(i);
              const y0 = macdToY(0);
              const y1 = macdToY(v);
              const color = v >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
              return (
                <rect
                  key={`macd-h-${i}`}
                  x={x - candleW / 2}
                  y={Math.min(y0, y1)}
                  width={candleW}
                  height={Math.abs(y1 - y0) || 0.5}
                  fill={color}
                />
              );
            })}
            {/* MACD line */}
            <path d={buildLinePath(indicatorData.macd.macd, macdToY)} fill="none" stroke="#3b82f6" strokeWidth={1} />
            {/* Signal line */}
            <path d={buildLinePath(indicatorData.macd.signal, macdToY)} fill="none" stroke="#f97316" strokeWidth={1} />
            <text x={LEFT + 2} y={macdY0 + 8} fill="rgba(59,130,246,0.6)" fontSize={7} fontFamily="monospace">MACD</text>
          </>
        )}

        {/* Y-axis price labels */}
        {yPriceLabels.map((l, i) => (
          <text
            key={`yp-${i}`}
            x={W - RIGHT + 4}
            y={l.y + 3}
            fill="rgba(255,255,255,0.3)"
            fontSize={8}
            fontFamily="monospace"
          >
            {l.label}
          </text>
        ))}

        {/* X-axis date labels */}
        {xLabels.map((l, i) => (
          <text
            key={`xl-${i}`}
            x={l.x}
            y={H - 2}
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
            textAnchor="middle"
          >
            {l.label}
          </text>
        ))}

        {/* Crosshair */}
        {hoverIndex != null && hoverIndex >= 0 && hoverIndex < candles.length && (
          <>
            {/* Vertical line */}
            <line
              x1={indexToX(hoverIndex)}
              y1={TOP}
              x2={indexToX(hoverIndex)}
              y2={H - BOTTOM}
              stroke="rgba(251,191,36,0.3)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
            {/* Horizontal line at close price */}
            <line
              x1={LEFT}
              y1={priceToY(candles[hoverIndex].close)}
              x2={W - RIGHT}
              y2={priceToY(candles[hoverIndex].close)}
              stroke="rgba(251,191,36,0.3)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
            {/* Price label on Y axis */}
            <rect
              x={W - RIGHT}
              y={priceToY(candles[hoverIndex].close) - 6}
              width={RIGHT}
              height={12}
              fill="rgba(251,191,36,0.9)"
            />
            <text
              x={W - RIGHT + 4}
              y={priceToY(candles[hoverIndex].close) + 3}
              fill="black"
              fontSize={8}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {formatPrice(candles[hoverIndex].close)}
            </text>
          </>
        )}

        {/* Indicator legend (top-left of price chart) */}
        {(() => {
          const legends: { label: string; color: string; dashed?: boolean }[] = [];
          if (indicators.sma20) legends.push({ label: 'SMA20', color: '#facc15' });
          if (indicators.sma50) legends.push({ label: 'SMA50', color: '#3b82f6' });
          if (indicators.sma200) legends.push({ label: 'SMA200', color: '#ef4444' });
          if (indicators.ema20) legends.push({ label: 'EMA20', color: '#facc15', dashed: true });
          if (indicators.ema50) legends.push({ label: 'EMA50', color: '#3b82f6', dashed: true });
          if (indicators.ema200) legends.push({ label: 'EMA200', color: '#ef4444', dashed: true });
          if (indicators.bollinger) legends.push({ label: 'BB(20,2)', color: '#fbbf24' });
          return legends.map((l, i) => (
            <g key={`legend-${i}`}>
              <line
                x1={LEFT + 4 + i * 60}
                y1={priceY0 + 10}
                x2={LEFT + 18 + i * 60}
                y2={priceY0 + 10}
                stroke={l.color}
                strokeWidth={1.5}
                strokeDasharray={l.dashed ? '4,2' : undefined}
              />
              <text
                x={LEFT + 21 + i * 60}
                y={priceY0 + 13}
                fill={l.color}
                fontSize={7}
                fontFamily="monospace"
                opacity={0.8}
              >
                {l.label}
              </text>
            </g>
          ));
        })()}
      </svg>
    </div>
  );
}
