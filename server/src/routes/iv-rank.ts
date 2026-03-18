import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface IvRankEntry {
  symbol: string;
  name: string;
  sector: string;
  currentIv: number;
  ivRank: number;
  ivPercentile: number;
  iv52High: number;
  iv52Low: number;
  hvCurrent: number;
  ivHvSpread: number;
  ivChange1d: number;
  ivChange5d: number;
  skew: number;
  termStructure: string;
  signal: string | null;
  ivHistory: number[];
  putCallRatio: number;
}

interface IvRankResponse {
  entries: IvRankEntry[];
  marketIv: number;
  marketIvChange: number;
  timestamp: string;
}

// ── Universe ──

const UNIVERSE: Array<{ symbol: string; name: string; sector: string }> = [
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'Index' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'Index' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', sector: 'Index' },
  { symbol: 'DIA', name: 'Dow Jones ETF', sector: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Consumer' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Consumer' },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Consumer' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corp', sector: 'Energy' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare' },
  { symbol: 'GLD', name: 'SPDR Gold Trust', sector: 'Commodities' },
  { symbol: 'SLV', name: 'iShares Silver Trust', sector: 'Commodities' },
  { symbol: 'USO', name: 'US Oil Fund', sector: 'Commodities' },
];

// ── Helpers ──

function calcHistoricalVol(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
  const slice = closes.slice(closes.length - window - 1);
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) {
      returns.push(Math.log(slice[i] / slice[i - 1]));
    }
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function calcIvRank(current: number, high: number, low: number): number {
  if (high <= low) return 50;
  return Math.round(((current - low) / (high - low)) * 100);
}

function calcIvPercentile(ivSeries: number[], current: number): number {
  if (ivSeries.length === 0) return 50;
  const below = ivSeries.filter((v) => v < current).length;
  return Math.round((below / ivSeries.length) * 100);
}

function deriveSignal(ivRank: number, ivChange5d: number): string | null {
  if (ivChange5d < -0.05) return 'IV_CRUSH';
  if (ivChange5d > 0.05) return 'IV_EXPANSION';
  if (ivRank < 10) return 'CHEAP_VOL';
  if (ivRank > 90) return 'RICH_VOL';
  return null;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Estimate IV from historical data ──
// Since we cannot fetch live options IV without rate-limit concerns,
// we estimate IV from the stock's recent realized vol and typical IV/HV ratio.

function estimateIvSeries(closes: number[], window: number, points: number): number[] {
  const series: number[] = [];
  const startIdx = Math.max(window + 1, closes.length - points);
  for (let i = startIdx; i <= closes.length; i++) {
    const slice = closes.slice(Math.max(0, i - window - 1), i);
    const hv = calcHistoricalVol(slice, window);
    // IV typically trades at a premium to HV (risk premium)
    // Use a factor of 1.1-1.3 depending on recent vol dynamics
    const premium = 1.15 + (hv > 0.3 ? 0.1 : 0);
    series.push(hv * premium);
  }
  return series;
}

// ── Cache ──

let cache: { data: IvRankResponse; expiresAt: number } = { data: null as unknown as IvRankResponse, expiresAt: 0 };
const CACHE_TTL = 300_000; // 5 minutes

// GET /api/iv-rank
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch VIX data
    const vixQuotes = await getQuotes(['^VIX']);
    const vixQuote = vixQuotes.find((q: { symbol: string }) => q.symbol === '^VIX');
    const marketIv = vixQuote?.price ?? 0;
    const marketIvChange = vixQuote?.change ?? 0;

    // Fetch history for all symbols (1 year for 52-week stats)
    const symbols = UNIVERSE.map((u) => u.symbol);
    const historyResults = await Promise.allSettled(
      symbols.map((s) => getHistory(s, { range: '1y', interval: '1d' })),
    );

    const entries: IvRankEntry[] = [];

    for (let i = 0; i < UNIVERSE.length; i++) {
      const { symbol, name, sector } = UNIVERSE[i];
      const histResult = historyResults[i];

      if (histResult.status === 'rejected') continue;

      const history = histResult.value;
      const closes = history
        .map((h: { close?: number | null }) => h.close)
        .filter((c: number | null | undefined): c is number => c != null && c > 0);

      if (closes.length < 30) continue;

      // Current 30-day HV
      const hvCurrent = calcHistoricalVol(closes, 30);

      // Estimate IV series from HV with premium
      const ivSeries = estimateIvSeries(closes, 30, Math.min(252, closes.length - 31));
      if (ivSeries.length === 0) continue;

      const currentIv = ivSeries[ivSeries.length - 1];
      const iv52High = Math.max(...ivSeries);
      const iv52Low = Math.min(...ivSeries);

      const ivRank = calcIvRank(currentIv, iv52High, iv52Low);
      const ivPercentile = calcIvPercentile(ivSeries, currentIv);

      // IV changes
      const ivChange1d = ivSeries.length >= 2
        ? currentIv - ivSeries[ivSeries.length - 2]
        : 0;
      const ivChange5d = ivSeries.length >= 6
        ? currentIv - ivSeries[ivSeries.length - 6]
        : 0;

      // Skew estimate: use ratio of downside vol to upside vol
      const returns: number[] = [];
      for (let j = 1; j < closes.length; j++) {
        if (closes[j - 1] > 0 && closes[j] > 0) {
          returns.push(Math.log(closes[j] / closes[j - 1]));
        }
      }
      const downReturns = returns.filter((r) => r < 0);
      const upReturns = returns.filter((r) => r > 0);
      const downVol = downReturns.length > 1
        ? Math.sqrt(downReturns.reduce((a, r) => a + r * r, 0) / downReturns.length)
        : 0;
      const upVol = upReturns.length > 1
        ? Math.sqrt(upReturns.reduce((a, r) => a + r * r, 0) / upReturns.length)
        : 0;
      const skew = upVol > 0 ? round2(downVol / upVol) : 1.0;

      // Term structure: compare short-term vs long-term HV as proxy
      const hv10 = calcHistoricalVol(closes, 10);
      const hv60 = calcHistoricalVol(closes, 60);
      let termStructure: string;
      if (hv60 > 0 && Math.abs(hv10 - hv60) / hv60 < 0.05) {
        termStructure = 'flat';
      } else if (hv10 < hv60) {
        termStructure = 'contango';
      } else {
        termStructure = 'backwardation';
      }

      // Put/Call ratio estimate from skew
      const putCallRatio = round2(0.7 + skew * 0.3);

      // IV history: last 20 data points
      const ivHistory = ivSeries.slice(-20).map((v) => round4(v));

      const signal = deriveSignal(ivRank, ivChange5d);

      entries.push({
        symbol,
        name,
        sector,
        currentIv: round4(currentIv),
        ivRank,
        ivPercentile,
        iv52High: round4(iv52High),
        iv52Low: round4(iv52Low),
        hvCurrent: round4(hvCurrent),
        ivHvSpread: round4(currentIv - hvCurrent),
        ivChange1d: round4(ivChange1d),
        ivChange5d: round4(ivChange5d),
        skew,
        termStructure,
        signal,
        ivHistory,
        putCallRatio,
      });
    }

    // Sort by IV rank descending by default
    entries.sort((a, b) => b.ivRank - a.ivRank);

    const response: IvRankResponse = {
      entries,
      marketIv: round2(marketIv),
      marketIvChange: round2(marketIvChange),
      timestamp: new Date().toISOString(),
    };

    cache = { data: response, expiresAt: now + CACHE_TTL };
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IvRank] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch IV rank data' });
  }
});

export default router;
