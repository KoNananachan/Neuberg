import { Router } from 'express';
import { ensureCrumb } from '../services/stocks/yahoo-finance.js';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const YAHOO_API = 'https://query1.finance.yahoo.com';
const YAHOO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const VALID_RANGES = ['3mo', '6mo', '1y', '2y'] as const;
type Range = typeof VALID_RANGES[number];

interface RatioPoint {
  timestamp: number;
  ratio: number;
}

interface SpreadPoint {
  timestamp: number;
  spread: number;
}

interface PairsStats {
  currentRatio: number;
  meanRatio: number;
  stdRatio: number;
  zScore: number;
  correlation: number;
  cointegration: number;
  minRatio: number;
  maxRatio: number;
  percentile: number;
}

interface PairsData {
  symbolA: string;
  symbolB: string;
  nameA: string;
  nameB: string;
  currentPriceA: number;
  currentPriceB: number;
  ratioSeries: RatioPoint[];
  spreadSeries: SpreadPoint[];
  stats: PairsStats;
}

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: PairsData; ts: number }>();
const CACHE_TTL = 60 * 60_000;

const router = Router();

// GET /api/pairs - pairs trading analysis
router.get('/', async (req, res) => {
  try {
    const symbolA = ((req.query.symbolA as string) || '').trim().toUpperCase();
    const symbolB = ((req.query.symbolB as string) || '').trim().toUpperCase();
    const range = ((req.query.range as string) || '1y') as Range;

    if (!symbolA || !symbolB) {
      res.status(400).json({ error: 'Both symbolA and symbolB are required' });
      return;
    }
    if (symbolA === symbolB) {
      res.status(400).json({ error: 'Symbols must be different' });
      return;
    }
    if (!VALID_RANGES.includes(range)) {
      res.status(400).json({ error: `Invalid range. Use one of: ${VALID_RANGES.join(', ')}` });
      return;
    }

    const cacheKey = `pairs:${symbolA}:${symbolB}:${range}`;
    const entry = cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      res.json(entry.data);
      return;
    }

    // Fetch chart data and quotes in parallel
    const [chartA, chartB, quotes] = await Promise.all([
      fetchChartData(symbolA, range),
      fetchChartData(symbolB, range),
      getQuotes([symbolA, symbolB]).catch(() => []),
    ]);

    if (!chartA || !chartB) {
      res.status(404).json({ error: 'Failed to fetch price data for one or both symbols' });
      return;
    }

    // Align timestamps: build a map from timestamp -> close for each
    const mapA = new Map<number, number>();
    const mapB = new Map<number, number>();
    for (const p of chartA.points) mapA.set(p.timestamp, p.close);
    for (const p of chartB.points) mapB.set(p.timestamp, p.close);

    // Find common timestamps
    const commonTs: number[] = [];
    for (const ts of mapA.keys()) {
      if (mapB.has(ts)) commonTs.push(ts);
    }
    commonTs.sort((a, b) => a - b);

    if (commonTs.length < 10) {
      res.status(400).json({ error: 'Insufficient overlapping data points' });
      return;
    }

    // Build ratio series
    const ratioSeries: RatioPoint[] = [];
    const ratios: number[] = [];
    for (const ts of commonTs) {
      const priceA = mapA.get(ts)!;
      const priceB = mapB.get(ts)!;
      if (priceB === 0) continue;
      const ratio = priceA / priceB;
      ratios.push(ratio);
      ratioSeries.push({ timestamp: ts, ratio });
    }

    if (ratios.length < 10) {
      res.status(400).json({ error: 'Insufficient valid data points' });
      return;
    }

    // Calculate statistics
    const meanRatio = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    const variance = ratios.reduce((s, v) => s + (v - meanRatio) ** 2, 0) / ratios.length;
    const stdRatio = Math.sqrt(variance);
    const currentRatio = ratios[ratios.length - 1];
    const zScore = stdRatio > 0 ? (currentRatio - meanRatio) / stdRatio : 0;
    const minRatio = Math.min(...ratios);
    const maxRatio = Math.max(...ratios);

    // Percentile: what fraction of historical ratios are below current
    const belowCount = ratios.filter(r => r < currentRatio).length;
    const percentile = (belowCount / ratios.length) * 100;

    // Build spread (z-score) series
    const spreadSeries: SpreadPoint[] = ratioSeries.map(p => ({
      timestamp: p.timestamp,
      spread: stdRatio > 0 ? (p.ratio - meanRatio) / stdRatio : 0,
    }));

    // Calculate Pearson correlation of daily returns
    const returnsA: number[] = [];
    const returnsB: number[] = [];
    for (let i = 1; i < commonTs.length; i++) {
      const prevA = mapA.get(commonTs[i - 1])!;
      const currA = mapA.get(commonTs[i])!;
      const prevB = mapB.get(commonTs[i - 1])!;
      const currB = mapB.get(commonTs[i])!;
      if (prevA > 0 && prevB > 0) {
        returnsA.push((currA - prevA) / prevA);
        returnsB.push((currB - prevB) / prevB);
      }
    }

    const correlation = pearsonCorrelation(returnsA, returnsB);

    // Simple cointegration measure: 1 - abs(normalized slope of ratio)
    // Slope via least squares on ratio series
    const n = ratios.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += ratios[i];
      sumXY += i * ratios[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    // Normalize slope relative to mean ratio over the period
    const normalizedSlope = Math.abs(slope * n / meanRatio);
    const cointegration = Math.max(0, Math.min(1, 1 - normalizedSlope));

    // Get names and prices from quotes
    const quoteA = quotes.find(q => q.symbol === symbolA);
    const quoteB = quotes.find(q => q.symbol === symbolB);

    const payload: PairsData = {
      symbolA,
      symbolB,
      nameA: quoteA?.name || chartA.name || symbolA,
      nameB: quoteB?.name || chartB.name || symbolB,
      currentPriceA: quoteA?.price ?? chartA.lastPrice,
      currentPriceB: quoteB?.price ?? chartB.lastPrice,
      ratioSeries,
      spreadSeries,
      stats: {
        currentRatio,
        meanRatio,
        stdRatio,
        zScore,
        correlation,
        cointegration,
        minRatio,
        maxRatio,
        percentile,
      },
    };

    cache.set(cacheKey, { data: payload, ts: Date.now() });
    res.json(payload);
  } catch (err) {
    console.error('[Pairs] Error computing pairs analysis:', err);
    res.status(500).json({ error: 'Failed to compute pairs analysis' });
  }
});

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;

  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return cov / denom;
}

interface ChartResult {
  name: string;
  lastPrice: number;
  points: Array<{ timestamp: number; close: number }>;
}

async function fetchChartData(symbol: string, range: string): Promise<ChartResult | null> {
  try {
    const auth = await ensureCrumb();
    const crumbParam = auth ? `&crumb=${encodeURIComponent(auth.crumb)}` : '';
    const cookieHeader = auth ? auth.cookie : '';

    const url = `${YAHOO_API}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d${crumbParam}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': YAHOO_UA,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    if (timestamps.length === 0 || closes.length === 0) return null;

    const points: Array<{ timestamp: number; close: number }> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close !== null && close !== undefined && close > 0) {
        points.push({ timestamp: timestamps[i], close });
      }
    }

    if (points.length === 0) return null;

    const lastPrice = meta.regularMarketPrice ?? points[points.length - 1].close;

    return {
      name: meta.shortName || meta.longName || symbol,
      lastPrice,
      points,
    };
  } catch (err) {
    console.error(`[Pairs] Error fetching chart for ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export default router;
