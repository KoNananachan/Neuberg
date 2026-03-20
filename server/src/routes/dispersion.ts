import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── S&P 500 index + top 15 constituents ──

const INDEX_SYMBOL = '^GSPC';

const CONSTITUENTS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'GOOG', name: 'Alphabet' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'BRK-B', name: 'Berkshire' },
  { symbol: 'LLY', name: 'Eli Lilly' },
  { symbol: 'AVGO', name: 'Broadcom' },
  { symbol: 'JPM', name: 'JPMorgan' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'UNH', name: 'UnitedHealth' },
  { symbol: 'V', name: 'Visa' },
  { symbol: 'XOM', name: 'ExxonMobil' },
  { symbol: 'MA', name: 'Mastercard' },
];

const ALL_SYMBOLS = [INDEX_SYMBOL, ...CONSTITUENTS.map((c) => c.symbol)];

// ── Cache (5 min TTL) ──

let cache: { data: any; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 12 * 60 * 60_000;

// ── Math helpers ──

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((a, r) => a + (r - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;

  const xSlice = xs.slice(xs.length - n);
  const ySlice = ys.slice(ys.length - n);

  const xMean = mean(xSlice);
  const yMean = mean(ySlice);

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - xMean;
    const dy = ySlice[i] - yMean;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, num / denom));
}

function annualizedVol(returns: number[]): number {
  if (returns.length < 2) return 0;
  return stdDev(returns) * Math.sqrt(252) * 100;
}

function calcBeta(stockReturns: number[], indexReturns: number[]): number {
  const n = Math.min(stockReturns.length, indexReturns.length);
  if (n < 5) return 1;

  const sr = stockReturns.slice(stockReturns.length - n);
  const ir = indexReturns.slice(indexReturns.length - n);

  const sMean = mean(sr);
  const iMean = mean(ir);

  let cov = 0;
  let iVar = 0;
  for (let i = 0; i < n; i++) {
    const ds = sr[i] - sMean;
    const di = ir[i] - iMean;
    cov += ds * di;
    iVar += di * di;
  }

  if (iVar === 0) return 1;
  return cov / iVar;
}

function normalizeSparkline(values: number[], targetLen: number): number[] {
  if (values.length === 0) return Array(targetLen).fill(0);
  if (values.length <= targetLen) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((v) => (v - min) / range);
  }
  // Downsample
  const step = values.length / targetLen;
  const result: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    result.push(values[Math.floor(i * step)]);
  }
  const min = Math.min(...result);
  const max = Math.max(...result);
  const range = max - min || 1;
  return result.map((v) => (v - min) / range);
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch 60 days of daily history for all symbols in parallel
    const historyPromises = ALL_SYMBOLS.map((sym) =>
      getHistory(sym, { range: '3mo', interval: '1d' }),
    );
    const quotesPromise = getQuotes(CONSTITUENTS.map((c) => c.symbol));

    const [histories, quotes] = await Promise.all([
      Promise.all(historyPromises),
      quotesPromise,
    ]);

    // Extract close prices, trim to aligned length
    const closesMap: Record<string, number[]> = {};
    for (let i = 0; i < ALL_SYMBOLS.length; i++) {
      const hist = histories[i] || [];
      closesMap[ALL_SYMBOLS[i]] = hist
        .map((h: any) => h.close as number | null)
        .filter((c): c is number => c != null && c > 0);
    }

    // Align all series to the shortest length
    const minLen = Math.min(
      ...Object.values(closesMap).map((c) => c.length).filter((l) => l > 0),
      60,
    );
    if (minLen < 10) {
      res.status(502).json({ error: 'Insufficient market data' });
      return;
    }

    // Trim all to last minLen entries
    for (const sym of ALL_SYMBOLS) {
      const arr = closesMap[sym];
      if (arr.length > minLen) {
        closesMap[sym] = arr.slice(arr.length - minLen);
      }
    }

    // Calculate returns
    const returnsMap: Record<string, number[]> = {};
    for (const sym of ALL_SYMBOLS) {
      returnsMap[sym] = dailyReturns(closesMap[sym]);
    }

    const indexReturns = returnsMap[INDEX_SYMBOL];
    const constituentSymbols = CONSTITUENTS.map((c) => c.symbol);

    // ── 1. Realized Correlation (20d and 60d windows) ──
    const window20 = Math.min(20, indexReturns.length);
    const window60 = Math.min(indexReturns.length, 59); // returns are 1 shorter than closes

    function avgPairwiseCorrelation(windowSize: number): number {
      const correlations: number[] = [];
      for (let i = 0; i < constituentSymbols.length; i++) {
        for (let j = i + 1; j < constituentSymbols.length; j++) {
          const ri = returnsMap[constituentSymbols[i]].slice(-windowSize);
          const rj = returnsMap[constituentSymbols[j]].slice(-windowSize);
          correlations.push(pearsonCorrelation(ri, rj));
        }
      }
      return mean(correlations);
    }

    const avgCorrelation20d = Math.round(avgPairwiseCorrelation(window20) * 1000) / 1000;
    const avgCorrelation60d = Math.round(avgPairwiseCorrelation(window60) * 1000) / 1000;

    // ── 2. Index Dispersion ──
    // Standard deviation of constituent returns over the 20-day window
    const recentConstituentReturns = constituentSymbols.map((sym) => {
      const ret = returnsMap[sym].slice(-window20);
      return mean(ret);
    });
    // (dispersion captured via dispersion ratio below)

    // ── 3. Dispersion Ratio: sum of individual stock vols / index vol ──
    const indexVol20d = annualizedVol(indexReturns.slice(-window20));
    const stockVols20d = constituentSymbols.map((sym) =>
      annualizedVol(returnsMap[sym].slice(-window20)),
    );
    const avgStockVol20d = mean(stockVols20d);
    const dispersionRatio = indexVol20d > 0
      ? Math.round((avgStockVol20d / indexVol20d) * 1000) / 1000
      : 1;

    // ── 4. Concentration Risk: top 5 by variance contribution ──
    const stockVariances = constituentSymbols.map((sym) => {
      const vol = annualizedVol(returnsMap[sym].slice(-window20));
      return vol * vol;
    });
    const totalVariance = stockVariances.reduce((a, b) => a + b, 0);
    const sortedVariances = [...stockVariances].sort((a, b) => b - a);
    const top5Variance = sortedVariances.slice(0, 5).reduce((a, b) => a + b, 0);
    const concentrationPct = totalVariance > 0
      ? Math.round((top5Variance / totalVariance) * 1000) / 1000
      : 0;

    // ── 5. Correlation Matrix (15x15, 20-day rolling) ──
    const corrMatrix: number[][] = [];
    for (let i = 0; i < constituentSymbols.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < constituentSymbols.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const ri = returnsMap[constituentSymbols[i]].slice(-window20);
          const rj = returnsMap[constituentSymbols[j]].slice(-window20);
          row.push(Math.round(pearsonCorrelation(ri, rj) * 1000) / 1000);
        }
      }
      corrMatrix.push(row);
    }

    // ── 6. Individual stock metrics ──
    const quoteMap: Record<string, any> = {};
    for (const q of quotes as any[]) {
      quoteMap[q.symbol] = q;
    }

    const stocks = CONSTITUENTS.map((c) => {
      const q = quoteMap[c.symbol];
      const stockReturns = returnsMap[c.symbol];
      const closes = closesMap[c.symbol];

      const beta = Math.round(calcBeta(stockReturns.slice(-window20), indexReturns.slice(-window20)) * 100) / 100;
      const realizedVol = Math.round(annualizedVol(stockReturns.slice(-window20)) * 100) / 100;
      const corrToIndex = Math.round(
        pearsonCorrelation(stockReturns.slice(-window20), indexReturns.slice(-window20)) * 1000,
      ) / 1000;

      // Tracking error: std dev of (stock returns - index returns) annualized
      const diffReturns = stockReturns.slice(-window20).map((r, i) => {
        const ir = indexReturns.slice(-window20);
        return r - (ir[i] ?? 0);
      });
      const trackingError = Math.round(annualizedVol(diffReturns) * 100) / 100;

      // 5-day return
      const last5Closes = closes.slice(-6);
      const returns5d = last5Closes.length >= 2
        ? Math.round(((last5Closes[last5Closes.length - 1] / last5Closes[0]) - 1) * 10000) / 100
        : 0;

      // Sparkline (last 20 closes normalized)
      const sparkline = normalizeSparkline(closes.slice(-20), 20);

      return {
        symbol: c.symbol,
        name: c.name,
        price: q?.price ?? closes[closes.length - 1] ?? 0,
        changePct: q?.changePercent ?? 0,
        beta,
        realizedVol,
        corrToIndex,
        trackingError,
        returns5d,
        sparkline,
      };
    });

    // Sort by correlation to index descending
    stocks.sort((a, b) => b.corrToIndex - a.corrToIndex);

    // ── 7. History: 40 days of rolling metrics ──
    const historyLen = Math.min(40, indexReturns.length - window20);
    const history: Array<{ date: string; avgCorrelation: number; dispersionRatio: number }> = [];

    for (let d = 0; d < historyLen; d++) {
      const endIdx = indexReturns.length - historyLen + d + 1;
      const startIdx = endIdx - window20;
      if (startIdx < 0) continue;

      // Average pairwise correlation for this window
      const correlations: number[] = [];
      for (let i = 0; i < constituentSymbols.length; i++) {
        for (let j = i + 1; j < constituentSymbols.length; j++) {
          const ri = returnsMap[constituentSymbols[i]].slice(startIdx, endIdx);
          const rj = returnsMap[constituentSymbols[j]].slice(startIdx, endIdx);
          correlations.push(pearsonCorrelation(ri, rj));
        }
      }
      const avgCorr = mean(correlations);

      // Dispersion ratio for this window
      const idxVol = annualizedVol(indexReturns.slice(startIdx, endIdx));
      const sVols = constituentSymbols.map((sym) =>
        annualizedVol(returnsMap[sym].slice(startIdx, endIdx)),
      );
      const avgSVol = mean(sVols);
      const dr = idxVol > 0 ? avgSVol / idxVol : 1;

      // Use close date from history data
      const indexHist = histories[0] || [];
      const dateEntry = indexHist[indexHist.length - historyLen + d];
      const dateStr = dateEntry?.date ?? new Date().toISOString().slice(0, 10);

      history.push({
        date: typeof dateStr === 'string' ? dateStr : new Date(dateStr * 1000).toISOString().slice(0, 10),
        avgCorrelation: Math.round(avgCorr * 1000) / 1000,
        dispersionRatio: Math.round(dr * 1000) / 1000,
      });
    }

    // ── Regime level ──
    let level: 'high_corr' | 'normal' | 'high_dispersion' = 'normal';
    if (avgCorrelation20d > 0.6) level = 'high_corr';
    else if (dispersionRatio > 1.5) level = 'high_dispersion';

    const payload = {
      timestamp: new Date().toISOString(),
      avgCorrelation20d,
      avgCorrelation60d,
      dispersionRatio,
      indexVol20d: Math.round(indexVol20d * 100) / 100,
      avgStockVol20d: Math.round(avgStockVol20d * 100) / 100,
      concentrationPct: Math.round(concentrationPct * 100),
      level,
      stocks,
      correlationMatrix: {
        symbols: constituentSymbols,
        values: corrMatrix,
      },
      history,
    };

    cache = { data: payload, expiresAt: now + CACHE_TTL };
    res.json(payload);
  } catch (err: any) {
    console.error('[Dispersion] Error computing dispersion data:', err?.message || err);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to compute dispersion data' });
  }
});

export default router;
