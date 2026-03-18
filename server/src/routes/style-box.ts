import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface StyleCell {
  style: string;
  label: string;
  etf: string;
  etfName: string;
  return1d: number;
  return1w: number;
  return1m: number;
  return3m: number;
  returnYtd: number;
  return1y: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  avgMarketCap: number;
  flow1m: number;
  relativeStrength: number;
  momentum: number;
  history: number[];
}

interface RotationSignal {
  from: string;
  to: string;
  strength: number;
  description: string;
}

interface StyleBoxResponse {
  cells: StyleCell[];
  rotation: RotationSignal[];
  bestStyle: string;
  worstStyle: string;
  valueVsGrowth: number;
  smallVsLarge: number;
  timestamp: string;
}

// ── Style Box Definitions ──

interface StyleConfig {
  style: string;
  label: string;
  etf: string;
  etfName: string;
  row: number; // 0=Large, 1=Mid, 2=Small
  col: number; // 0=Value, 1=Blend, 2=Growth
}

const STYLE_CONFIGS: StyleConfig[] = [
  { style: 'large-value', label: 'Large Value', etf: 'IVE', etfName: 'iShares S&P 500 Value', row: 0, col: 0 },
  { style: 'large-blend', label: 'Large Blend', etf: 'SPY', etfName: 'SPDR S&P 500', row: 0, col: 1 },
  { style: 'large-growth', label: 'Large Growth', etf: 'IVW', etfName: 'iShares S&P 500 Growth', row: 0, col: 2 },
  { style: 'mid-value', label: 'Mid Value', etf: 'IJJ', etfName: 'iShares S&P Mid-Cap 400 Value', row: 1, col: 0 },
  { style: 'mid-blend', label: 'Mid Blend', etf: 'MDY', etfName: 'SPDR S&P MidCap 400', row: 1, col: 1 },
  { style: 'mid-growth', label: 'Mid Growth', etf: 'IJK', etfName: 'iShares S&P Mid-Cap 400 Growth', row: 1, col: 2 },
  { style: 'small-value', label: 'Small Value', etf: 'IJS', etfName: 'iShares S&P Small-Cap 600 Value', row: 2, col: 0 },
  { style: 'small-blend', label: 'Small Blend', etf: 'IJR', etfName: 'iShares Core S&P Small-Cap', row: 2, col: 1 },
  { style: 'small-growth', label: 'Small Growth', etf: 'IJT', etfName: 'iShares S&P Small-Cap 600 Growth', row: 2, col: 2 },
];

const BENCHMARK = 'SPY';

// ── Fundamental estimates by style (typical P/E, P/B, Div Yield, Avg MCap $B) ──

const FUNDAMENTALS: Record<string, { pe: number; pb: number; divYield: number; avgMcap: number }> = {
  'large-value':  { pe: 16.5, pb: 2.4, divYield: 2.5, avgMcap: 180 },
  'large-blend':  { pe: 21.0, pb: 4.2, divYield: 1.4, avgMcap: 220 },
  'large-growth': { pe: 28.5, pb: 8.5, divYield: 0.6, avgMcap: 260 },
  'mid-value':    { pe: 14.0, pb: 1.8, divYield: 2.2, avgMcap: 8 },
  'mid-blend':    { pe: 16.5, pb: 2.5, divYield: 1.5, avgMcap: 9 },
  'mid-growth':   { pe: 22.0, pb: 5.0, divYield: 0.7, avgMcap: 10 },
  'small-value':  { pe: 12.0, pb: 1.4, divYield: 2.0, avgMcap: 2.5 },
  'small-blend':  { pe: 15.0, pb: 2.0, divYield: 1.4, avgMcap: 3.0 },
  'small-growth': { pe: 20.0, pb: 4.0, divYield: 0.5, avgMcap: 3.5 },
};

// ── Math Helpers ──

function dailyReturns(closes: number[]): number[] {
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  return rets;
}

function cumulativeReturn(closes: number[], days: number): number {
  if (closes.length < days + 1) return 0;
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  if (!past || past === 0) return 0;
  return ((current - past) / past) * 100;
}

function ytdReturn(closes: number[], dates: string[]): number {
  if (closes.length === 0 || dates.length === 0) return 0;
  // Find the first trading day of the current year
  const currentYear = new Date().getFullYear().toString();
  let ytdStart = -1;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] && dates[i].startsWith(currentYear)) {
      ytdStart = i;
      break;
    }
  }
  if (ytdStart < 0 || ytdStart >= closes.length) return 0;
  const startPrice = closes[ytdStart];
  const endPrice = closes[closes.length - 1];
  if (!startPrice || startPrice === 0) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

function momentumScore(closes: number[]): number {
  // Momentum score 0-100 based on price position relative to range
  if (closes.length < 20) return 50;
  const recent = closes.slice(-60);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min;
  if (range === 0) return 50;
  const current = recent[recent.length - 1];
  return Math.round(((current - min) / range) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Cache ──

let cache: { data: StyleBoxResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── Route ──

// GET /api/style-box
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Collect all unique ETF symbols
    const allSymbols = Array.from(new Set([
      ...STYLE_CONFIGS.map((c) => c.etf),
      BENCHMARK,
    ]));

    // Fetch 1 year of daily history for all symbols
    const histories = await Promise.all(
      allSymbols.map((s) => getHistory(s, { range: '1y', interval: '1d' })),
    );

    // Build closes and dates maps
    const closesMap = new Map<string, number[]>();
    const datesMap = new Map<string, string[]>();
    for (let i = 0; i < allSymbols.length; i++) {
      const closes: number[] = [];
      const dates: string[] = [];
      for (const bar of histories[i]) {
        if (bar.close != null && bar.close > 0) {
          closes.push(bar.close);
          dates.push(typeof bar.date === 'string' ? bar.date : '');
        }
      }
      closesMap.set(allSymbols[i], closes);
      datesMap.set(allSymbols[i], dates);
    }

    // Fetch current quotes for flow estimation
    const quotes = await getQuotes(allSymbols);
    const quoteMap = new Map<string, { volume: number | null; avgVolume: number | null; price: number }>();
    for (const q of quotes) {
      const qAny = q as Record<string, unknown>;
      quoteMap.set(q.symbol, {
        volume: q.volume ?? null,
        avgVolume: (qAny.avgVolume as number | null) ?? null,
        price: q.price,
      });
    }

    const spyCloses = closesMap.get(BENCHMARK) ?? [];
    const spyDates = datesMap.get(BENCHMARK) ?? [];
    const spyYtd = ytdReturn(spyCloses, spyDates);

    // Calculate each style cell
    const cells: StyleCell[] = [];

    for (const config of STYLE_CONFIGS) {
      const closes = closesMap.get(config.etf) ?? [];
      const dates = datesMap.get(config.etf) ?? [];
      const fund = FUNDAMENTALS[config.style];

      if (closes.length < 20) {
        // Not enough data, provide defaults
        cells.push({
          style: config.style,
          label: config.label,
          etf: config.etf,
          etfName: config.etfName,
          return1d: 0,
          return1w: 0,
          return1m: 0,
          return3m: 0,
          returnYtd: 0,
          return1y: 0,
          peRatio: fund?.pe ?? 0,
          pbRatio: fund?.pb ?? 0,
          dividendYield: fund?.divYield ?? 0,
          avgMarketCap: fund?.avgMcap ?? 0,
          flow1m: 0,
          relativeStrength: 0,
          momentum: 50,
          history: [],
        });
        continue;
      }

      const ret1d = round2(cumulativeReturn(closes, 1));
      const ret1w = round2(cumulativeReturn(closes, 5));
      const ret1m = round2(cumulativeReturn(closes, 21));
      const ret3m = round2(cumulativeReturn(closes, 63));
      const retYtd = round2(ytdReturn(closes, dates));
      const ret1y = round2(cumulativeReturn(closes, 252));

      // Relative strength vs SPY (YTD spread)
      const relStr = round2(retYtd - spyYtd);

      // Momentum score
      const mom = momentumScore(closes);

      // Estimate 1-month flow from volume vs average
      const quote = quoteMap.get(config.etf);
      let flow1m = 0;
      if (quote && quote.avgVolume && quote.avgVolume > 0 && quote.volume != null) {
        // Rough estimate: (volume - avg) * price * 21 trading days / 1e6
        const volDelta = (quote.volume - quote.avgVolume) / quote.avgVolume;
        flow1m = round2(volDelta * quote.avgVolume * quote.price * 21 / 1e6);
      }

      // Mini history: last 20 data points cumulative indexed to 100
      const recentCloses = closes.slice(-20);
      const history: number[] = [];
      if (recentCloses.length > 0) {
        const base = recentCloses[0];
        for (const c of recentCloses) {
          history.push(round2((c / base) * 100));
        }
      }

      cells.push({
        style: config.style,
        label: config.label,
        etf: config.etf,
        etfName: config.etfName,
        return1d: ret1d,
        return1w: ret1w,
        return1m: ret1m,
        return3m: ret3m,
        returnYtd: retYtd,
        return1y: ret1y,
        peRatio: fund?.pe ?? 0,
        pbRatio: fund?.pb ?? 0,
        dividendYield: fund?.divYield ?? 0,
        avgMarketCap: fund?.avgMcap ?? 0,
        flow1m,
        relativeStrength: relStr,
        momentum: mom,
        history,
      });
    }

    // Best and worst style by YTD return
    const sorted = [...cells].sort((a, b) => b.returnYtd - a.returnYtd);
    const bestStyle = sorted[0]?.style ?? '';
    const worstStyle = sorted[sorted.length - 1]?.style ?? '';

    // Value vs Growth spread (average value YTD - average growth YTD)
    const valueCells = cells.filter((c) => c.style.endsWith('-value'));
    const growthCells = cells.filter((c) => c.style.endsWith('-growth'));
    const avgValueYtd = valueCells.length > 0
      ? valueCells.reduce((s, c) => s + c.returnYtd, 0) / valueCells.length
      : 0;
    const avgGrowthYtd = growthCells.length > 0
      ? growthCells.reduce((s, c) => s + c.returnYtd, 0) / growthCells.length
      : 0;
    const valueVsGrowth = round2(avgValueYtd - avgGrowthYtd);

    // Small vs Large spread
    const smallCells = cells.filter((c) => c.style.startsWith('small-'));
    const largeCells = cells.filter((c) => c.style.startsWith('large-'));
    const avgSmallYtd = smallCells.length > 0
      ? smallCells.reduce((s, c) => s + c.returnYtd, 0) / smallCells.length
      : 0;
    const avgLargeYtd = largeCells.length > 0
      ? largeCells.reduce((s, c) => s + c.returnYtd, 0) / largeCells.length
      : 0;
    const smallVsLarge = round2(avgSmallYtd - avgLargeYtd);

    // Detect rotation signals
    const rotation = detectRotation(cells, valueVsGrowth, smallVsLarge);

    const data: StyleBoxResponse = {
      cells,
      rotation,
      bestStyle,
      worstStyle,
      valueVsGrowth,
      smallVsLarge,
      timestamp: new Date().toISOString(),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[StyleBox] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch style box data' });
  }
});

// ── Rotation Detection ──

function detectRotation(
  cells: StyleCell[],
  valueVsGrowth: number,
  smallVsLarge: number,
): RotationSignal[] {
  const signals: RotationSignal[] = [];

  // Find best and worst performers across different time frames
  const by1m = [...cells].sort((a, b) => b.return1m - a.return1m);
  const by3m = [...cells].sort((a, b) => b.return3m - a.return3m);

  // Value vs Growth rotation
  if (Math.abs(valueVsGrowth) > 1) {
    const isValueLeading = valueVsGrowth > 0;
    signals.push({
      from: isValueLeading ? 'large-growth' : 'large-value',
      to: isValueLeading ? 'large-value' : 'large-growth',
      strength: Math.min(Math.abs(valueVsGrowth) * 10, 100),
      description: isValueLeading
        ? 'Rotation from growth to value accelerating'
        : 'Rotation from value to growth accelerating',
    });
  }

  // Small vs Large rotation
  if (Math.abs(smallVsLarge) > 1) {
    const isSmallLeading = smallVsLarge > 0;
    signals.push({
      from: isSmallLeading ? 'large-blend' : 'small-blend',
      to: isSmallLeading ? 'small-blend' : 'large-blend',
      strength: Math.min(Math.abs(smallVsLarge) * 10, 100),
      description: isSmallLeading
        ? 'Capital rotating from large-cap to small-cap'
        : 'Capital rotating from small-cap to large-cap',
    });
  }

  // Momentum-based rotation: biggest 1-month gainer vs loser
  if (by1m.length >= 2) {
    const best = by1m[0];
    const worst = by1m[by1m.length - 1];
    const spread = best.return1m - worst.return1m;
    if (spread > 2) {
      signals.push({
        from: worst.style,
        to: best.style,
        strength: Math.min(spread * 8, 100),
        description: `${best.label} outperforming ${worst.label} by ${spread.toFixed(1)}% over 1 month`,
      });
    }
  }

  // 3-month trend continuation
  if (by3m.length >= 2) {
    const best3m = by3m[0];
    const worst3m = by3m[by3m.length - 1];
    const spread3m = best3m.return3m - worst3m.return3m;
    if (spread3m > 4) {
      signals.push({
        from: worst3m.style,
        to: best3m.style,
        strength: Math.min(spread3m * 5, 100),
        description: `Persistent rotation: ${best3m.label} leading ${worst3m.label} by ${spread3m.toFixed(1)}% over 3 months`,
      });
    }
  }

  return signals.sort((a, b) => b.strength - a.strength).slice(0, 5);
}

export default router;
