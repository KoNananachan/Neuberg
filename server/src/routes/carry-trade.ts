import { Router } from 'express';
import { getQuotes, getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface FxPairConfig {
  symbol: string;
  name: string;
  category: 'g10' | 'em';
  carryEstimate: number; // annualized carry % estimate
}

interface CarryPairData {
  name: string;
  symbol: string;
  category: 'g10' | 'em';
  spot: number;
  changePct: number;
  return20d: number;
  return60d: number;
  vol20d: number;
  carryEstimate: number;
  carryToVol: number;
  totalReturn20d: number;
  trend: 'favorable' | 'neutral' | 'adverse';
  risk: 'low' | 'moderate' | 'high';
  signal: 'attractive' | 'neutral' | 'dangerous';
  sparkline: number[];
}

interface YieldDifferential {
  pair: string;
  differential: number;
  direction: 'widening' | 'narrowing' | 'stable';
}

interface CarryTradeSummary {
  g10Carry: number;
  emCarry: number;
  yenStatus: string;
  environment: 'favorable' | 'neutral' | 'hostile';
  narrative: string;
}

interface CarryTradeResponse {
  timestamp: string;
  pairs: CarryPairData[];
  summary: CarryTradeSummary;
  yieldDifferentials: YieldDifferential[];
}

// ── FX Pair Configurations ──

const FX_PAIRS: FxPairConfig[] = [
  { symbol: 'USDJPY=X', name: 'USD/JPY', category: 'g10', carryEstimate: 4.5 },
  { symbol: 'AUDJPY=X', name: 'AUD/JPY', category: 'g10', carryEstimate: 4.0 },
  { symbol: 'NZDJPY=X', name: 'NZD/JPY', category: 'g10', carryEstimate: 4.2 },
  { symbol: 'EURJPY=X', name: 'EUR/JPY', category: 'g10', carryEstimate: 3.5 },
  { symbol: 'GBPJPY=X', name: 'GBP/JPY', category: 'g10', carryEstimate: 4.8 },
  { symbol: 'USDCHF=X', name: 'USD/CHF', category: 'g10', carryEstimate: 3.0 },
  { symbol: 'EURCHF=X', name: 'EUR/CHF', category: 'g10', carryEstimate: 2.5 },
  { symbol: 'USDBRL=X', name: 'USD/BRL', category: 'em', carryEstimate: 8.0 },
  { symbol: 'USDMXN=X', name: 'USD/MXN', category: 'em', carryEstimate: 6.5 },
  { symbol: 'USDZAR=X', name: 'USD/ZAR', category: 'em', carryEstimate: 5.5 },
];

const FX_SYMBOLS = FX_PAIRS.map((p) => p.symbol);
const YIELD_SYMBOLS = ['^TNX', '^TYX', '^IRX'];

// ── Cache ──

let cache: { data: CarryTradeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Helpers ──

function calcReturn(prices: number[], daysBack: number): number {
  if (prices.length < daysBack + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - daysBack];
  if (!past || past === 0) return 0;
  return ((current - past) / past) * 100;
}

function calcRealizedVol(prices: number[], window: number): number {
  if (prices.length < window + 1) return 0;
  const recent = prices.slice(-window - 1);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0) {
      returns.push(Math.log(recent[i] / recent[i - 1]));
    }
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  // Annualize: sqrt(252) * daily std dev * 100
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function calcVolOfVol(prices: number[]): number {
  // Rolling 5-day vol over last 20 days, then take std dev of those
  if (prices.length < 26) return 0;
  const vols: number[] = [];
  for (let i = 5; i <= 20; i++) {
    const slice = prices.slice(-(i + 6), -i);
    if (slice.length >= 5) {
      vols.push(calcRealizedVol(slice, 5));
    }
  }
  if (vols.length < 2) return 0;
  const mean = vols.reduce((s, v) => s + v, 0) / vols.length;
  const variance = vols.reduce((s, v) => s + (v - mean) ** 2, 0) / (vols.length - 1);
  return Math.sqrt(variance);
}

function determineTrend(return20d: number, return60d: number, isCarryPositive: boolean): 'favorable' | 'neutral' | 'adverse' {
  // For JPY crosses (long high-yielder vs JPY): rising pair = favorable
  // For EM pairs (USD vs EM): falling pair = EM carry favorable (EM currency strengthening)
  const shortTermDir = return20d > 0.5 ? 'up' : return20d < -0.5 ? 'down' : 'flat';
  const longTermDir = return60d > 1 ? 'up' : return60d < -1 ? 'down' : 'flat';

  if (isCarryPositive) {
    // For most carry trades, we want the pair to be stable or moving in the carry direction
    if (shortTermDir === 'up' && longTermDir === 'up') return 'favorable';
    if (shortTermDir === 'down' && longTermDir === 'down') return 'adverse';
    return 'neutral';
  }
  // Inverted carry — favorable when pair is declining
  if (shortTermDir === 'down' && longTermDir === 'down') return 'favorable';
  if (shortTermDir === 'up' && longTermDir === 'up') return 'adverse';
  return 'neutral';
}

function determineRisk(vol20d: number, volOfVol: number): 'low' | 'moderate' | 'high' {
  // High vol or high vol-of-vol = high risk of sudden reversal
  if (vol20d > 15 || volOfVol > 5) return 'high';
  if (vol20d > 10 || volOfVol > 3) return 'moderate';
  return 'low';
}

function determineSignal(
  carryToVol: number,
  trend: 'favorable' | 'neutral' | 'adverse',
  risk: 'low' | 'moderate' | 'high',
): 'attractive' | 'neutral' | 'dangerous' {
  let score = 0;

  // Carry-to-vol scoring
  if (carryToVol >= 0.5) score += 2;
  else if (carryToVol >= 0.3) score += 1;
  else if (carryToVol < 0.15) score -= 1;

  // Trend scoring
  if (trend === 'favorable') score += 1;
  else if (trend === 'adverse') score -= 2;

  // Risk scoring
  if (risk === 'low') score += 1;
  else if (risk === 'high') score -= 2;

  if (score >= 3) return 'attractive';
  if (score <= -1) return 'dangerous';
  return 'neutral';
}

function buildNarrative(
  g10Avg: number,
  emAvg: number,
  yenStatus: string,
  environment: 'favorable' | 'neutral' | 'hostile',
  yieldData: { us10y: number; us3m: number },
): string {
  const parts: string[] = [];

  if (environment === 'favorable') {
    parts.push('Carry trade environment is favorable.');
  } else if (environment === 'hostile') {
    parts.push('Carry trade environment is hostile - risk of unwind elevated.');
  } else {
    parts.push('Carry trade environment is mixed.');
  }

  parts.push(`G10 avg carry/vol: ${g10Avg.toFixed(2)}, EM avg carry/vol: ${emAvg.toFixed(2)}.`);

  if (yenStatus.includes('Weak')) {
    parts.push('JPY carry trades are well-supported by yen weakness.');
  } else if (yenStatus.includes('Strong')) {
    parts.push('JPY strengthening poses unwind risk for yen carry trades.');
  }

  if (yieldData.us10y > 4) {
    parts.push(`US 10Y at ${yieldData.us10y.toFixed(2)}% supports USD carry.`);
  }

  const spread = yieldData.us10y - yieldData.us3m;
  if (spread < 0) {
    parts.push('Inverted yield curve signals caution.');
  }

  return parts.join(' ');
}

// ── Route ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch quotes and history in parallel
    const [fxQuotes, yieldQuotes, ...histories] = await Promise.all([
      getQuotes(FX_SYMBOLS),
      getQuotes(YIELD_SYMBOLS),
      ...FX_SYMBOLS.map((s) => getHistory(s, { range: '3mo', interval: '1d' })),
    ]);

    // Build quote map
    const allQuotes = [...fxQuotes, ...yieldQuotes];
    const quoteMap = new Map(allQuotes.map((q: any) => [q.symbol, q]));

    // Build history map
    const historyMap: Record<string, number[]> = {};
    FX_SYMBOLS.forEach((sym, i) => {
      const hist = (histories[i] as any[]) || [];
      historyMap[sym] = hist
        .map((h: any) => h.close as number | null)
        .filter((c): c is number => c != null && c > 0);
    });

    // Yield data
    const us10y = (quoteMap.get('^TNX') as any)?.price ?? 0;
    const us30y = (quoteMap.get('^TYX') as any)?.price ?? 0;
    const us3m = (quoteMap.get('^IRX') as any)?.price ?? 0;

    // Process each FX pair
    const pairs: CarryPairData[] = FX_PAIRS.map((config) => {
      const q: any = quoteMap.get(config.symbol);
      const prices = historyMap[config.symbol] || [];

      const spot = q?.price ?? 0;
      const changePct = q?.changePercent ?? 0;

      const return20d = calcReturn(prices, 20);
      const return60d = calcReturn(prices, Math.min(60, prices.length - 1));
      const vol20d = calcRealizedVol(prices, 20);
      const volOfVol = calcVolOfVol(prices);

      // Carry estimate — adjust based on actual US yields when available
      let carryEstimate = config.carryEstimate;
      if (config.symbol.includes('JPY') && us10y > 0) {
        // US-Japan differential: use US 10Y minus Japan proxy (~0.5-1%)
        carryEstimate = Math.max(us10y - 0.8, 1);
      } else if (config.symbol.includes('CHF') && us10y > 0) {
        // US/EUR-Switzerland differential
        carryEstimate = Math.max(us10y - 1.5, 0.5);
      }

      const carryToVol = vol20d > 0 ? carryEstimate / vol20d : 0;

      // For JPY and CHF crosses: carry direction = pair going up (high yielder appreciates)
      // For EM pairs (USDBRL, USDMXN, USDZAR): carry direction = pair going down (EM currency strengthens vs USD)
      const isCarryPositive = config.category === 'g10';
      const trend = determineTrend(return20d, return60d, isCarryPositive);

      // Total return: carry (pro-rated to 20d) + FX return
      const carry20d = carryEstimate * (20 / 252);
      const totalReturn20d = carry20d + (isCarryPositive ? return20d : -return20d);

      const risk = determineRisk(vol20d, volOfVol);
      const signal = determineSignal(carryToVol, trend, risk);

      // Sparkline: last 20 closing prices normalized
      const sparkline = prices.length >= 20
        ? prices.slice(-20)
        : prices.slice(-Math.max(prices.length, 1));

      return {
        name: config.name,
        symbol: config.symbol,
        category: config.category,
        spot: Math.round(spot * 10000) / 10000,
        changePct: Math.round(changePct * 100) / 100,
        return20d: Math.round(return20d * 100) / 100,
        return60d: Math.round(return60d * 100) / 100,
        vol20d: Math.round(vol20d * 100) / 100,
        carryEstimate: Math.round(carryEstimate * 100) / 100,
        carryToVol: Math.round(carryToVol * 1000) / 1000,
        totalReturn20d: Math.round(totalReturn20d * 100) / 100,
        trend,
        risk,
        signal,
        sparkline,
      };
    });

    // Sort by carry-to-vol within each category
    pairs.sort((a, b) => {
      if (a.category !== b.category) return a.category === 'g10' ? -1 : 1;
      return b.carryToVol - a.carryToVol;
    });

    // Summary
    const g10Pairs = pairs.filter((p) => p.category === 'g10');
    const emPairs = pairs.filter((p) => p.category === 'em');

    const g10Carry = g10Pairs.length > 0
      ? g10Pairs.reduce((s, p) => s + p.carryToVol, 0) / g10Pairs.length
      : 0;
    const emCarry = emPairs.length > 0
      ? emPairs.reduce((s, p) => s + p.carryToVol, 0) / emPairs.length
      : 0;

    // JPY status based on JPY crosses
    const jpyPairs = pairs.filter((p) => p.symbol.includes('JPY'));
    const jpyAvgReturn = jpyPairs.length > 0
      ? jpyPairs.reduce((s, p) => s + p.return20d, 0) / jpyPairs.length
      : 0;
    let yenStatus: string;
    if (jpyAvgReturn > 1) {
      yenStatus = 'Weak JPY - Carry Supported';
    } else if (jpyAvgReturn < -1) {
      yenStatus = 'Strong JPY - Unwind Risk';
    } else {
      yenStatus = 'Stable JPY';
    }

    // Environment
    const attractiveCount = pairs.filter((p) => p.signal === 'attractive').length;
    const dangerousCount = pairs.filter((p) => p.signal === 'dangerous').length;
    let environment: 'favorable' | 'neutral' | 'hostile';
    if (attractiveCount >= 5 && dangerousCount <= 2) {
      environment = 'favorable';
    } else if (dangerousCount >= 4 || (g10Carry < 0.2 && emCarry < 0.3)) {
      environment = 'hostile';
    } else {
      environment = 'neutral';
    }

    const narrative = buildNarrative(g10Carry, emCarry, yenStatus, environment, {
      us10y,
      us3m,
    });

    // Yield differentials
    const yieldDifferentials: YieldDifferential[] = [
      {
        pair: 'US-Japan',
        differential: Math.round((us10y - 0.8) * 100) / 100,
        direction: us10y > 4 ? 'widening' : us10y < 3.5 ? 'narrowing' : 'stable',
      },
      {
        pair: 'US-Switzerland',
        differential: Math.round((us10y - 1.5) * 100) / 100,
        direction: us10y > 4 ? 'widening' : us10y < 3.5 ? 'narrowing' : 'stable',
      },
      {
        pair: 'US-Eurozone',
        differential: Math.round((us10y - 2.5) * 100) / 100,
        direction: us10y > 4.2 ? 'widening' : us10y < 3.8 ? 'narrowing' : 'stable',
      },
      {
        pair: 'US Short-Long',
        differential: Math.round((us10y - us3m) * 100) / 100,
        direction: us10y - us3m > 0.5 ? 'widening' : us10y - us3m < -0.3 ? 'narrowing' : 'stable',
      },
      {
        pair: 'US 10Y-30Y',
        differential: Math.round((us30y - us10y) * 100) / 100,
        direction: us30y - us10y > 0.3 ? 'widening' : us30y - us10y < 0 ? 'narrowing' : 'stable',
      },
    ];

    const result: CarryTradeResponse = {
      timestamp: new Date().toISOString(),
      pairs,
      summary: {
        g10Carry: Math.round(g10Carry * 1000) / 1000,
        emCarry: Math.round(emCarry * 1000) / 1000,
        yenStatus,
        environment,
        narrative,
      },
      yieldDifferentials,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[CarryTrade] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch carry trade data' });
  }
});

export default router;
