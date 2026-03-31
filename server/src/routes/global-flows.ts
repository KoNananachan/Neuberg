import { Router } from 'express';

import { mulberry32, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── In-memory cache (5 min TTL) with stale fallback ──

interface CacheEntry { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>();

let staleData: unknown = null;

function cached<T>(key: string, fn: () => T): T {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  const data = fn();
  cache.set(key, { data, ts: Date.now() });
  staleData = data;
  return data;
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ── Types ──

interface RegionalFlow {
  name: string;
  category: 'equity' | 'fixed-income' | 'commodity' | 'alternative' | 'cash';
  region: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  flow3m: number;
  flowYtd: number;
  aum: number;
  flowPctAum: number;
}

interface TopETF {
  ticker: string;
  name: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  aum: number;
  flowStreak: number;
}

interface SentimentIndicators {
  equityFlowMomentum: number;
  bondFlowMomentum: number;
  riskOnOffScore: number;
  cashAllocation: number;
  contraindicatorSignal: 'bullish' | 'bearish' | 'neutral';
}

interface GlobalFlowsResponse {
  regional: RegionalFlow[];
  topETFs: TopETF[];
  sentiment: SentimentIndicators;
  generatedAt: string;
}

// ── Regional flow definitions ──

interface RegionalDef {
  name: string;
  category: 'equity' | 'fixed-income' | 'commodity' | 'alternative' | 'cash';
  region: string;
  baseAum: number;       // billions
  flowScale: number;     // max daily flow magnitude in billions
}

const REGIONAL_DEFS: RegionalDef[] = [
  // Equity
  { name: 'US Equity',              category: 'equity',       region: 'US',           baseAum: 5800,  flowScale: 12 },
  { name: 'Europe Equity',          category: 'equity',       region: 'Europe',       baseAum: 1400,  flowScale: 4 },
  { name: 'Japan Equity',           category: 'equity',       region: 'Japan',        baseAum: 680,   flowScale: 2.5 },
  { name: 'EM Equity',              category: 'equity',       region: 'EM',           baseAum: 520,   flowScale: 2 },
  { name: 'China Equity',           category: 'equity',       region: 'China',        baseAum: 380,   flowScale: 3 },
  { name: 'India Equity',           category: 'equity',       region: 'India',        baseAum: 210,   flowScale: 1.5 },
  { name: 'Latin America Equity',   category: 'equity',       region: 'LatAm',        baseAum: 95,    flowScale: 0.8 },
  // Fixed Income
  { name: 'US Bond',                category: 'fixed-income', region: 'US',           baseAum: 3200,  flowScale: 8 },
  { name: 'EM Bond',                category: 'fixed-income', region: 'EM',           baseAum: 320,   flowScale: 1.5 },
  { name: 'High Yield',             category: 'fixed-income', region: 'Global',       baseAum: 410,   flowScale: 2 },
  { name: 'Investment Grade',       category: 'fixed-income', region: 'Global',       baseAum: 1600,  flowScale: 5 },
  { name: 'Treasury',               category: 'fixed-income', region: 'US',           baseAum: 2400,  flowScale: 7 },
  { name: 'TIPS',                   category: 'fixed-income', region: 'US',           baseAum: 280,   flowScale: 1.2 },
  // Commodity
  { name: 'Gold',                   category: 'commodity',    region: 'Global',       baseAum: 230,   flowScale: 1.5 },
  { name: 'Commodities',            category: 'commodity',    region: 'Global',       baseAum: 160,   flowScale: 0.8 },
  // Alternative
  { name: 'Real Estate',            category: 'alternative',  region: 'Global',       baseAum: 310,   flowScale: 1.2 },
  { name: 'Crypto',                 category: 'alternative',  region: 'Global',       baseAum: 85,    flowScale: 2 },
  // Cash
  { name: 'Money Market',           category: 'cash',         region: 'Global',       baseAum: 6200,  flowScale: 15 },
  { name: 'Cash',                   category: 'cash',         region: 'Global',       baseAum: 1800,  flowScale: 6 },
  { name: 'Multi-Asset',            category: 'cash',         region: 'Global',       baseAum: 450,   flowScale: 2 },
];

// ── Top ETF definitions ──

interface ETFDef {
  ticker: string;
  name: string;
  baseAum: number;     // billions
  flowScale: number;   // max daily flow magnitude in billions
}

const ETF_DEFS: ETFDef[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500',              baseAum: 520,  flowScale: 8 },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',          baseAum: 290,  flowScale: 5 },
  { ticker: 'IVV',  name: 'iShares Core S&P 500',       baseAum: 480,  flowScale: 6 },
  { ticker: 'VTI',  name: 'Vanguard Total Market',      baseAum: 410,  flowScale: 4 },
  { ticker: 'VOO',  name: 'Vanguard S&P 500',           baseAum: 470,  flowScale: 5 },
  { ticker: 'AGG',  name: 'iShares Core US Agg Bond',   baseAum: 110,  flowScale: 2 },
  { ticker: 'BND',  name: 'Vanguard Total Bond',        baseAum: 105,  flowScale: 1.8 },
  { ticker: 'GLD',  name: 'SPDR Gold Shares',           baseAum: 65,   flowScale: 1.5 },
  { ticker: 'EEM',  name: 'iShares MSCI EM',            baseAum: 28,   flowScale: 0.8 },
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury',  baseAum: 52,   flowScale: 1.5 },
  { ticker: 'HYG',  name: 'iShares iBoxx $ HY Corp',    baseAum: 18,   flowScale: 0.6 },
  { ticker: 'XLF',  name: 'Financial Select SPDR',      baseAum: 42,   flowScale: 1.2 },
  { ticker: 'XLK',  name: 'Technology Select SPDR',     baseAum: 55,   flowScale: 1.8 },
  { ticker: 'IEMG', name: 'iShares Core MSCI EM',       baseAum: 80,   flowScale: 1.0 },
  { ticker: 'VWO',  name: 'Vanguard FTSE EM',           baseAum: 72,   flowScale: 0.9 },
];

// ── Data generation helpers ──

function generateFlow(rng: () => number, scale: number): number {
  // Gaussian-ish via sum of uniforms
  const u = rng() + rng() + rng();
  const normal = (u / 3 - 0.5) * 2;
  return Math.round(normal * scale * 100) / 100;
}

function generateRegionalFlows(rng: () => number): RegionalFlow[] {
  return REGIONAL_DEFS.map(def => {
    const flow1d = generateFlow(rng, def.flowScale);
    const flow1w = generateFlow(rng, def.flowScale * 3.5);
    const flow1m = generateFlow(rng, def.flowScale * 8);
    const flow3m = generateFlow(rng, def.flowScale * 15);
    const flowYtd = generateFlow(rng, def.flowScale * 25);
    // AUM with small jitter
    const aumJitter = 1 + (rng() - 0.5) * 0.06;
    const aum = Math.round(def.baseAum * aumJitter * 100) / 100;
    const flowPctAum = aum > 0 ? Math.round((flow1m / aum) * 10000) / 100 : 0;

    return {
      name: def.name,
      category: def.category,
      region: def.region,
      flow1d,
      flow1w,
      flow1m,
      flow3m,
      flowYtd,
      aum,
      flowPctAum,
    };
  });
}

function generateTopETFs(rng: () => number): TopETF[] {
  return ETF_DEFS.map(def => {
    const flow1d = generateFlow(rng, def.flowScale);
    const flow1w = generateFlow(rng, def.flowScale * 3);
    const flow1m = generateFlow(rng, def.flowScale * 7);
    const aumJitter = 1 + (rng() - 0.5) * 0.04;
    const aum = Math.round(def.baseAum * aumJitter * 100) / 100;
    // Streak: consecutive days of same-direction flow (-7 to +7)
    const streakMag = Math.floor(rng() * 7) + 1;
    const flowStreak = flow1d >= 0 ? streakMag : -streakMag;

    return {
      ticker: def.ticker,
      name: def.name,
      flow1d,
      flow1w,
      flow1m,
      aum,
      flowStreak,
    };
  });
}

function generateSentiment(regional: RegionalFlow[], rng: () => number): SentimentIndicators {
  // Equity flow momentum: sum of equity 1w flows / sum of equity AUM * 10000 (bps)
  const equityItems = regional.filter(r => r.category === 'equity');
  const bondItems = regional.filter(r => r.category === 'fixed-income');

  const eqFlowSum = equityItems.reduce((s, r) => s + r.flow1w, 0);
  const eqAumSum = equityItems.reduce((s, r) => s + r.aum, 0);
  const equityFlowMomentum = eqAumSum > 0
    ? Math.round((eqFlowSum / eqAumSum) * 10000 * 100) / 100
    : 0;

  const bdFlowSum = bondItems.reduce((s, r) => s + r.flow1w, 0);
  const bdAumSum = bondItems.reduce((s, r) => s + r.aum, 0);
  const bondFlowMomentum = bdAumSum > 0
    ? Math.round((bdFlowSum / bdAumSum) * 10000 * 100) / 100
    : 0;

  // Risk-on/off: -100 to 100 based on equity vs bond & cash flows
  const cashItems = regional.filter(r => r.category === 'cash');
  const cashFlowSum = cashItems.reduce((s, r) => s + r.flow1w, 0);
  const riskRaw = eqFlowSum - bdFlowSum - cashFlowSum * 0.5;
  const maxMag = Math.max(Math.abs(eqFlowSum), Math.abs(bdFlowSum), Math.abs(cashFlowSum), 1);
  const riskOnOffScore = Math.round(Math.max(-100, Math.min(100, (riskRaw / maxMag) * 80)));

  // Cash allocation: money market AUM / total AUM
  const totalAum = regional.reduce((s, r) => s + r.aum, 0);
  const mmAum = regional.find(r => r.name === 'Money Market')?.aum ?? 0;
  const cashAllocation = totalAum > 0 ? Math.round((mmAum / totalAum) * 10000) / 100 : 0;

  // Contrarian signal: if cash allocation is very high -> bullish (money on sidelines)
  // if cash allocation is very low -> bearish (fully invested)
  let contraindicatorSignal: 'bullish' | 'bearish' | 'neutral';
  if (cashAllocation > 30) {
    contraindicatorSignal = 'bullish';
  } else if (cashAllocation < 20) {
    contraindicatorSignal = 'bearish';
  } else {
    // Add some RNG-based variation
    const r = rng();
    contraindicatorSignal = r < 0.35 ? 'bullish' : r < 0.7 ? 'neutral' : 'bearish';
  }

  return {
    equityFlowMomentum,
    bondFlowMomentum,
    riskOnOffScore,
    cashAllocation,
    contraindicatorSignal,
  };
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const result = cached<GlobalFlowsResponse>('global-flows', () => {
      const seed = dateSeed();
      const rng = mulberry32(seed);

      const regional = generateRegionalFlows(rng);
      const topETFs = generateTopETFs(rng);
      const sentiment = generateSentiment(regional, rng);

      return {
        regional,
        topETFs,
        sentiment,
        generatedAt: new Date().toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[GlobalFlows] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (staleData) {
      return res.json(staleData);
    }
    res.status(500).json({ error: 'Failed to generate global flow data' });
  }
});

export default router;
