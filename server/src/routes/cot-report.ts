import { Router } from 'express';

const router = Router();

// ── Types ──

interface ContractConfig {
  symbol: string;
  name: string;
  category: 'equity_index' | 'metal' | 'energy' | 'currency' | 'agriculture' | 'bond';
  // Base positioning biases (commercials tend to hedge, specs follow trend)
  commercialBias: number;   // negative = net short bias (hedgers selling)
  specBias: number;         // positive = net long bias (trend followers)
  oiBase: number;           // base open interest level
  volatility: number;       // position volatility factor (0-1)
}

interface CotEntry {
  symbol: string;
  name: string;
  category: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  commercialNetChange: number;
  specLong: number;
  specShort: number;
  specNet: number;
  specNetChange: number;
  smallLong: number;
  smallShort: number;
  smallNet: number;
  openInterest: number;
  oiChange: number;
  specNetPctOI: number;
  commercialNetPctOI: number;
  specNetPercentile: number;
  extremeSignal: string | null;
  specNetHistory: number[];
  reportDate: string;
}

interface CotResponse {
  entries: CotEntry[];
  timestamp: string;
  reportDate: string;
}

// ── Contract Configurations ──
// Biases reflect real-world positioning patterns:
// - Commercials (hedgers) are typically net short in equity futures and commodities they produce
// - Speculators (managed money) are typically trend-followers
// - Small traders are the residual

const CONTRACTS: ContractConfig[] = [
  { symbol: 'ES', name: 'S&P 500 E-mini',      category: 'equity_index', commercialBias: -0.15, specBias: 0.12,  oiBase: 2800000, volatility: 0.35 },
  { symbol: 'NQ', name: 'Nasdaq 100 E-mini',    category: 'equity_index', commercialBias: -0.18, specBias: 0.15,  oiBase: 580000,  volatility: 0.40 },
  { symbol: 'GC', name: 'Gold',                 category: 'metal',        commercialBias: -0.20, specBias: 0.18,  oiBase: 520000,  volatility: 0.30 },
  { symbol: 'SI', name: 'Silver',               category: 'metal',        commercialBias: -0.22, specBias: 0.16,  oiBase: 155000,  volatility: 0.45 },
  { symbol: 'HG', name: 'Copper',               category: 'metal',        commercialBias: -0.12, specBias: 0.08,  oiBase: 210000,  volatility: 0.35 },
  { symbol: 'CL', name: 'Crude Oil WTI',        category: 'energy',       commercialBias: -0.10, specBias: 0.08,  oiBase: 1850000, volatility: 0.40 },
  { symbol: 'NG', name: 'Natural Gas',          category: 'energy',       commercialBias: -0.08, specBias: 0.05,  oiBase: 1200000, volatility: 0.55 },
  { symbol: 'ZB', name: '30-Yr Treasury Bond',  category: 'bond',         commercialBias: -0.05, specBias: -0.08, oiBase: 1350000, volatility: 0.30 },
  { symbol: '6E', name: 'Euro FX',              category: 'currency',     commercialBias: 0.06,  specBias: -0.04, oiBase: 680000,  volatility: 0.25 },
  { symbol: '6J', name: 'Japanese Yen',         category: 'currency',     commercialBias: 0.10,  specBias: -0.12, oiBase: 230000,  volatility: 0.30 },
  { symbol: 'ZC', name: 'Corn',                 category: 'agriculture',  commercialBias: -0.14, specBias: 0.06,  oiBase: 1550000, volatility: 0.35 },
  { symbol: 'ZS', name: 'Soybeans',             category: 'agriculture',  commercialBias: -0.16, specBias: 0.10,  oiBase: 780000,  volatility: 0.35 },
];

// ── Cache ──

let cache: { data: CotResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 30 * 60_000; // 30 minutes

// ── Deterministic pseudo-random ──
// Uses a seeded approach based on symbol + week so data is consistent within a report period

function hashSeed(str: string, weekNum: number): number {
  let h = 0;
  const combined = `${str}-${weekNum}`;
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) - h + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Helpers ──

function getLatestReportDate(): string {
  // CFTC reports are released on Tuesdays for the previous Tuesday's data
  const now = new Date();
  const day = now.getUTCDay();
  // Find the most recent Tuesday
  const daysBack = day >= 2 ? day - 2 : day + 5;
  const tuesday = new Date(now);
  tuesday.setUTCDate(tuesday.getUTCDate() - daysBack);
  // If we're on Tuesday but before market close, use previous Tuesday
  if (daysBack === 0 && now.getUTCHours() < 20) {
    tuesday.setUTCDate(tuesday.getUTCDate() - 7);
  }
  return tuesday.toISOString().slice(0, 10);
}

function getWeekNumber(date: string): number {
  const d = new Date(date);
  const start = new Date(d.getUTCFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function generateEntry(config: ContractConfig, reportDate: string): CotEntry {
  const weekNum = getWeekNumber(reportDate);
  const rng = seededRandom(hashSeed(config.symbol, weekNum));

  const oi = Math.round(config.oiBase * (0.9 + rng() * 0.2));

  // Commercial positions: biased toward their hedging direction
  const commercialNetRatio = config.commercialBias + (rng() - 0.5) * config.volatility * 0.3;
  const commercialNet = Math.round(oi * commercialNetRatio);
  const commercialMidpoint = Math.round(oi * 0.35);
  const commercialLong = Math.max(0, commercialMidpoint + Math.round(commercialNet / 2));
  const commercialShort = Math.max(0, commercialMidpoint - Math.round(commercialNet / 2));

  // Speculator positions: biased toward trend-following direction
  const specNetRatio = config.specBias + (rng() - 0.5) * config.volatility * 0.35;
  const specNet = Math.round(oi * specNetRatio);
  const specMidpoint = Math.round(oi * 0.25);
  const specLong = Math.max(0, specMidpoint + Math.round(specNet / 2));
  const specShort = Math.max(0, specMidpoint - Math.round(specNet / 2));

  // Small traders: fill the remainder to balance
  const smallNet = -(commercialNet + specNet);
  const smallMidpoint = Math.round(oi * 0.10);
  const smallLong = Math.max(0, smallMidpoint + Math.round(smallNet / 2));
  const smallShort = Math.max(0, smallMidpoint - Math.round(smallNet / 2));

  // Week-over-week changes
  const prevRng = seededRandom(hashSeed(config.symbol, weekNum - 1));
  const prevCommercialNetRatio = config.commercialBias + (prevRng() - 0.5) * config.volatility * 0.3;
  const prevOi = Math.round(config.oiBase * (0.9 + prevRng() * 0.2));
  const prevCommercialNet = Math.round(prevOi * prevCommercialNetRatio);
  const prevSpecNetRatio = config.specBias + (prevRng() - 0.5) * config.volatility * 0.35;
  const prevSpecNet = Math.round(prevOi * prevSpecNetRatio);

  const commercialNetChange = commercialNet - prevCommercialNet;
  const specNetChange = specNet - prevSpecNet;
  const oiChange = oi - prevOi;

  // Derived metrics
  const specNetPctOI = oi > 0 ? Math.round((specNet / oi) * 10000) / 100 : 0;
  const commercialNetPctOI = oi > 0 ? Math.round((commercialNet / oi) * 10000) / 100 : 0;

  // 52-week percentile: simulate by generating 52 weeks of spec net and ranking
  const specNets52: number[] = [];
  for (let w = weekNum - 51; w <= weekNum; w++) {
    const wRng = seededRandom(hashSeed(config.symbol, w));
    const wOi = Math.round(config.oiBase * (0.9 + wRng() * 0.2));
    const wSpecNetRatio = config.specBias + (wRng() - 0.5) * config.volatility * 0.35;
    specNets52.push(Math.round(wOi * wSpecNetRatio));
  }
  const sortedNets = [...specNets52].sort((a, b) => a - b);
  const rank = sortedNets.indexOf(specNet);
  const specNetPercentile = Math.round((rank / Math.max(sortedNets.length - 1, 1)) * 100);

  // Extreme signal
  let extremeSignal: string | null = null;
  if (specNetPercentile >= 90) extremeSignal = 'EXTREME_LONG';
  else if (specNetPercentile <= 10) extremeSignal = 'EXTREME_SHORT';

  // Sparkline: last 12 weeks of spec net
  const specNetHistory: number[] = [];
  for (let w = weekNum - 11; w <= weekNum; w++) {
    const wRng = seededRandom(hashSeed(config.symbol, w));
    const wOi = Math.round(config.oiBase * (0.9 + wRng() * 0.2));
    const wSpecNetRatio = config.specBias + (wRng() - 0.5) * config.volatility * 0.35;
    specNetHistory.push(Math.round(wOi * wSpecNetRatio));
  }

  return {
    symbol: config.symbol,
    name: config.name,
    category: config.category,
    commercialLong,
    commercialShort,
    commercialNet,
    commercialNetChange,
    specLong,
    specShort,
    specNet,
    specNetChange,
    smallLong,
    smallShort,
    smallNet,
    openInterest: oi,
    oiChange,
    specNetPctOI,
    commercialNetPctOI,
    specNetPercentile,
    extremeSignal,
    specNetHistory,
    reportDate,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const reportDate = getLatestReportDate();
    const entries = CONTRACTS.map((c) => generateEntry(c, reportDate));

    const result: CotResponse = {
      entries,
      timestamp: new Date().toISOString(),
      reportDate,
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[CotReport] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate COT report data' });
  }
});

export default router;
