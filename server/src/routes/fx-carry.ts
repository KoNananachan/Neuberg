import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Types ──

interface CarryPair {
  pair: string;
  spotRate: number;
  carry3M: number;
  carry12M: number;
  forwardPoints: number;
  impliedYieldDiff: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  ytdReturn: number;
}

interface CentralBankRate {
  country: string;
  bank: string;
  rate: number;
  lastChange: string;
  nextMeeting: string;
  marketImplied: number;
  direction: 'hawkish' | 'neutral' | 'dovish';
}

interface RiskMetrics {
  globalCarryIndex: number;
  carryMomentum: number;
  riskReversalAvg: number;
  impliedVolAvg: number;
  correlationWithSPX: number;
  correlationWithVIX: number;
}

interface FundingCurrency {
  currency: string;
  overnightRate: number;
  borrowingCost: number;
  avgCarryVsFunding: number;
}

interface PerformerEntry {
  pair: string;
  ytdReturn: number;
  carryReturn: number;
  fxReturn: number;
  sharpe: number;
}

interface FxCarrySummary {
  avgCarry3M: number;
  avgSharpe: number;
  totalReturn1M: number;
  fundingCost: number;
  bestCarry: string;
  worstCarry: string;
}

interface FxCarryResponse {
  carryPairs: CarryPair[];
  centralBankRates: CentralBankRate[];
  riskMetrics: RiskMetrics;
  fundingCurrencies: FundingCurrency[];
  topPerformers: PerformerEntry[];
  worstPerformers: PerformerEntry[];
  summary: FxCarrySummary;
  generatedAt: string;
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: FxCarryResponse; ts: number } | null = null;

// ── Static configs ──

interface PairConfig {
  pair: string;
  baseSpot: number;
  baseCarry3M: number;
  baseCarry12M: number;
  baseFwdPts: number;
  baseYieldDiff: number;
  baseVol: number;
  baseMaxDD: number;
  baseYtd: number;
}

const PAIR_CONFIGS: PairConfig[] = [
  { pair: 'AUD/JPY', baseSpot: 97.42, baseCarry3M: 4.25, baseCarry12M: 4.15, baseFwdPts: -412, baseYieldDiff: 4.15, baseVol: 10.8, baseMaxDD: 8.2, baseYtd: 5.8 },
  { pair: 'NZD/JPY', baseSpot: 89.65, baseCarry3M: 4.05, baseCarry12M: 3.90, baseFwdPts: -356, baseYieldDiff: 3.95, baseVol: 11.2, baseMaxDD: 9.1, baseYtd: 4.2 },
  { pair: 'MXN/JPY', baseSpot: 8.72, baseCarry3M: 9.25, baseCarry12M: 8.80, baseFwdPts: -785, baseYieldDiff: 9.15, baseVol: 14.5, baseMaxDD: 15.3, baseYtd: 11.4 },
  { pair: 'BRL/JPY', baseSpot: 27.35, baseCarry3M: 10.15, baseCarry12M: 9.60, baseFwdPts: -892, baseYieldDiff: 10.25, baseVol: 16.8, baseMaxDD: 18.7, baseYtd: 8.6 },
  { pair: 'USD/JPY', baseSpot: 151.28, baseCarry3M: 4.35, baseCarry12M: 4.20, baseFwdPts: -652, baseYieldDiff: 4.25, baseVol: 9.4, baseMaxDD: 7.5, baseYtd: 6.2 },
  { pair: 'EUR/JPY', baseSpot: 163.85, baseCarry3M: 3.45, baseCarry12M: 3.30, baseFwdPts: -528, baseYieldDiff: 3.40, baseVol: 9.8, baseMaxDD: 7.8, baseYtd: 3.5 },
  { pair: 'GBP/JPY', baseSpot: 191.42, baseCarry3M: 4.65, baseCarry12M: 4.50, baseFwdPts: -698, baseYieldDiff: 4.55, baseVol: 10.5, baseMaxDD: 8.9, baseYtd: 7.1 },
  { pair: 'TRY/JPY', baseSpot: 4.42, baseCarry3M: 38.50, baseCarry12M: 35.20, baseFwdPts: -3850, baseYieldDiff: 42.40, baseVol: 28.5, baseMaxDD: 42.1, baseYtd: -12.5 },
  { pair: 'ZAR/JPY', baseSpot: 8.15, baseCarry3M: 7.05, baseCarry12M: 6.80, baseFwdPts: -568, baseYieldDiff: 7.15, baseVol: 15.2, baseMaxDD: 16.4, baseYtd: 3.8 },
  { pair: 'NOK/JPY', baseSpot: 14.25, baseCarry3M: 3.85, baseCarry12M: 3.65, baseFwdPts: -382, baseYieldDiff: 3.80, baseVol: 11.8, baseMaxDD: 9.5, baseYtd: 2.1 },
  { pair: 'USD/TRY', baseSpot: 34.25, baseCarry3M: -38.10, baseCarry12M: -35.80, baseFwdPts: 12800, baseYieldDiff: -38.00, baseVol: 18.2, baseMaxDD: 25.6, baseYtd: -8.4 },
  { pair: 'USD/ZAR', baseSpot: 18.62, baseCarry3M: -2.85, baseCarry12M: -2.60, baseFwdPts: 1850, baseYieldDiff: -2.90, baseVol: 14.8, baseMaxDD: 12.5, baseYtd: 1.2 },
  { pair: 'USD/MXN', baseSpot: 17.18, baseCarry3M: -5.15, baseCarry12M: -4.80, baseFwdPts: 2420, baseYieldDiff: -5.00, baseVol: 12.5, baseMaxDD: 11.8, baseYtd: -2.8 },
  { pair: 'EUR/CHF', baseSpot: 0.9485, baseCarry3M: 2.15, baseCarry12M: 2.00, baseFwdPts: -198, baseYieldDiff: 2.10, baseVol: 5.8, baseMaxDD: 4.2, baseYtd: 1.5 },
  { pair: 'AUD/NZD', baseSpot: 1.0785, baseCarry3M: -0.35, baseCarry12M: -0.25, baseFwdPts: 38, baseYieldDiff: -0.30, baseVol: 6.2, baseMaxDD: 3.8, baseYtd: 0.4 },
];

interface CBConfig {
  country: string;
  bank: string;
  baseRate: number;
  lastChange: string;
  nextMeeting: string;
  direction: 'hawkish' | 'neutral' | 'dovish';
}

const CB_CONFIGS: CBConfig[] = [
  { country: 'United States', bank: 'Federal Reserve', baseRate: 4.375, lastChange: '2025-12-18', nextMeeting: '2026-03-25', direction: 'neutral' },
  { country: 'Eurozone', bank: 'ECB', baseRate: 2.65, lastChange: '2026-01-30', nextMeeting: '2026-04-17', direction: 'dovish' },
  { country: 'Japan', bank: 'BOJ', baseRate: 0.50, lastChange: '2025-12-19', nextMeeting: '2026-04-25', direction: 'hawkish' },
  { country: 'United Kingdom', bank: 'BOE', baseRate: 4.50, lastChange: '2025-11-07', nextMeeting: '2026-03-20', direction: 'neutral' },
  { country: 'Australia', bank: 'RBA', baseRate: 4.10, lastChange: '2026-02-18', nextMeeting: '2026-04-01', direction: 'dovish' },
  { country: 'New Zealand', bank: 'RBNZ', baseRate: 3.75, lastChange: '2026-02-19', nextMeeting: '2026-04-09', direction: 'dovish' },
  { country: 'Mexico', bank: 'Banxico', baseRate: 9.50, lastChange: '2026-02-06', nextMeeting: '2026-03-27', direction: 'dovish' },
  { country: 'Turkey', bank: 'CBRT', baseRate: 42.50, lastChange: '2026-01-23', nextMeeting: '2026-04-17', direction: 'hawkish' },
  { country: 'South Africa', bank: 'SARB', baseRate: 7.50, lastChange: '2026-01-30', nextMeeting: '2026-03-27', direction: 'neutral' },
  { country: 'Norway', bank: 'Norges Bank', baseRate: 4.25, lastChange: '2025-12-19', nextMeeting: '2026-03-27', direction: 'neutral' },
  { country: 'Switzerland', bank: 'SNB', baseRate: 1.25, lastChange: '2025-12-12', nextMeeting: '2026-03-20', direction: 'dovish' },
  { country: 'Canada', bank: 'BOC', baseRate: 3.00, lastChange: '2026-01-29', nextMeeting: '2026-04-16', direction: 'dovish' },
];

interface FundingConfig {
  currency: string;
  baseOvernight: number;
  baseBorrowing: number;
  baseAvgCarry: number;
}

const FUNDING_CONFIGS: FundingConfig[] = [
  { currency: 'JPY', baseOvernight: 0.08, baseBorrowing: 0.35, baseAvgCarry: 5.85 },
  { currency: 'CHF', baseOvernight: 1.20, baseBorrowing: 1.55, baseAvgCarry: 3.10 },
  { currency: 'EUR', baseOvernight: 2.65, baseBorrowing: 2.95, baseAvgCarry: 1.45 },
  { currency: 'CNH', baseOvernight: 1.85, baseBorrowing: 2.45, baseAvgCarry: 2.65 },
];

// ── Data generation ──

function generate(): FxCarryResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-carry'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const signedJitter = (range: number) => (rng() - 0.5) * 2 * range;

  // ── Carry Pairs ──
  const carryPairs: CarryPair[] = PAIR_CONFIGS.map(cfg => {
    const spotRate = Math.round(jitter(cfg.baseSpot, 0.015) * 10000) / 10000;
    const carry3M = Math.round(jitter(cfg.baseCarry3M, 0.08) * 100) / 100;
    const carry12M = Math.round(jitter(cfg.baseCarry12M, 0.08) * 100) / 100;
    const forwardPoints = Math.round(jitter(cfg.baseFwdPts, 0.10));
    const impliedYieldDiff = Math.round(jitter(cfg.baseYieldDiff, 0.06) * 100) / 100;
    const volatility = Math.round(jitter(cfg.baseVol, 0.10) * 100) / 100;
    const maxDrawdown = Math.round(jitter(cfg.baseMaxDD, 0.12) * 100) / 100;
    const ytdReturn = Math.round((cfg.baseYtd + signedJitter(2.5)) * 100) / 100;

    // Sharpe = carry / vol, with some noise
    const rawSharpe = volatility > 0 ? carry3M / volatility : 0;
    const sharpeRatio = Math.round((rawSharpe + signedJitter(0.15)) * 100) / 100;

    return {
      pair: cfg.pair,
      spotRate,
      carry3M,
      carry12M,
      forwardPoints,
      impliedYieldDiff,
      sharpeRatio,
      maxDrawdown,
      volatility,
      ytdReturn,
    };
  });

  // ── Central Bank Rates ──
  const centralBankRates: CentralBankRate[] = CB_CONFIGS.map(cfg => {
    const rate = Math.round(jitter(cfg.baseRate, 0.02) * 100) / 100;
    // Market implied: slight deviation from current rate in the direction's bias
    const dirBias = cfg.direction === 'hawkish' ? 0.25 : cfg.direction === 'dovish' ? -0.25 : 0;
    const marketImplied = Math.round((rate + dirBias + signedJitter(0.15)) * 100) / 100;

    return {
      country: cfg.country,
      bank: cfg.bank,
      rate,
      lastChange: cfg.lastChange,
      nextMeeting: cfg.nextMeeting,
      marketImplied,
      direction: cfg.direction,
    };
  });

  // ── Risk Metrics ──
  const riskMetrics: RiskMetrics = {
    globalCarryIndex: Math.round(jitter(105.8, 0.04) * 100) / 100,
    carryMomentum: Math.round((2.4 + signedJitter(3.5)) * 100) / 100,
    riskReversalAvg: Math.round((-0.85 + signedJitter(0.6)) * 100) / 100,
    impliedVolAvg: Math.round(jitter(9.2, 0.10) * 100) / 100,
    correlationWithSPX: Math.round((0.38 + signedJitter(0.15)) * 100) / 100,
    correlationWithVIX: Math.round((-0.52 + signedJitter(0.12)) * 100) / 100,
  };

  // ── Funding Currencies ──
  const fundingCurrencies: FundingCurrency[] = FUNDING_CONFIGS.map(cfg => ({
    currency: cfg.currency,
    overnightRate: Math.round(jitter(cfg.baseOvernight, 0.05) * 100) / 100,
    borrowingCost: Math.round(jitter(cfg.baseBorrowing, 0.05) * 100) / 100,
    avgCarryVsFunding: Math.round(jitter(cfg.baseAvgCarry, 0.08) * 100) / 100,
  }));

  // ── Top & Worst Performers ──
  // Build a scored list from carryPairs, sorted by ytdReturn
  const sortedByYtd = [...carryPairs].sort((a, b) => b.ytdReturn - a.ytdReturn);

  const toPerformerEntry = (cp: CarryPair): PerformerEntry => {
    // Split ytdReturn into carry component and FX component
    const carryReturn = Math.round((cp.carry12M * (rng() * 0.3 + 0.6)) * 100) / 100;
    const fxReturn = Math.round((cp.ytdReturn - carryReturn) * 100) / 100;
    return {
      pair: cp.pair,
      ytdReturn: cp.ytdReturn,
      carryReturn,
      fxReturn,
      sharpe: cp.sharpeRatio,
    };
  };

  const topPerformers: PerformerEntry[] = sortedByYtd.slice(0, 5).map(toPerformerEntry);
  const worstPerformers: PerformerEntry[] = sortedByYtd.slice(-5).reverse().map(toPerformerEntry);

  // ── Summary ──
  const avgCarry3M = Math.round((carryPairs.reduce((s, p) => s + p.carry3M, 0) / carryPairs.length) * 100) / 100;
  const avgSharpe = Math.round((carryPairs.reduce((s, p) => s + p.sharpeRatio, 0) / carryPairs.length) * 100) / 100;
  const totalReturn1M = Math.round((1.2 + signedJitter(2.0)) * 100) / 100;
  const fundingCost = Math.round(jitter(0.42, 0.10) * 100) / 100;

  const bestCarryPair = carryPairs.reduce((best, p) => p.carry3M > best.carry3M ? p : best, carryPairs[0]);
  const worstCarryPair = carryPairs.reduce((worst, p) => p.carry3M < worst.carry3M ? p : worst, carryPairs[0]);

  const summary: FxCarrySummary = {
    avgCarry3M,
    avgSharpe,
    totalReturn1M,
    fundingCost,
    bestCarry: bestCarryPair.pair,
    worstCarry: worstCarryPair.pair,
  };

  return {
    carryPairs,
    centralBankRates,
    riskMetrics,
    fundingCurrencies,
    topPerformers,
    worstPerformers,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FxCarry] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX carry trade data' });
  }
});

export default router;
