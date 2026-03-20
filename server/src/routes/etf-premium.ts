import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// --- deterministic seed helpers (daily) ---

// --- ETF definitions ---

interface ETFDef {
  ticker: string;
  name: string;
  category: 'Equity' | 'Fixed Income' | 'Commodity' | 'International' | 'Thematic' | 'Crypto';
  baseNav: number;
  baseVolume: number;       // daily volume in thousands
  aum: number;              // AUM in billions
  expenseRatio: number;     // in %
  spreadBps: number;        // base bid-ask spread in basis points
  premiumVolatility: number; // how wide premium/discount can swing (std dev in %)
  trackingErrorBase: number; // annualized tracking error base in %
}

const ETF_DEFS: ETFDef[] = [
  // Equity
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF Trust',                    category: 'Equity',       baseNav: 582.45, baseVolume: 72000,  aum: 523.0,  expenseRatio: 0.0945, spreadBps: 0.3,  premiumVolatility: 0.02, trackingErrorBase: 0.02 },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',                         category: 'Equity',       baseNav: 498.30, baseVolume: 48000,  aum: 265.0,  expenseRatio: 0.20,   spreadBps: 0.4,  premiumVolatility: 0.03, trackingErrorBase: 0.03 },
  { ticker: 'IWM',  name: 'iShares Russell 2000 ETF',                  category: 'Equity',       baseNav: 224.15, baseVolume: 28000,  aum: 72.5,   expenseRatio: 0.19,   spreadBps: 0.6,  premiumVolatility: 0.05, trackingErrorBase: 0.04 },
  { ticker: 'XLF',  name: 'Financial Select Sector SPDR Fund',         category: 'Equity',       baseNav: 45.82,  baseVolume: 35000,  aum: 42.3,   expenseRatio: 0.09,   spreadBps: 0.5,  premiumVolatility: 0.03, trackingErrorBase: 0.03 },
  { ticker: 'XLE',  name: 'Energy Select Sector SPDR Fund',            category: 'Equity',       baseNav: 88.60,  baseVolume: 18000,  aum: 38.1,   expenseRatio: 0.09,   spreadBps: 0.5,  premiumVolatility: 0.04, trackingErrorBase: 0.03 },
  { ticker: 'XLK',  name: 'Technology Select Sector SPDR Fund',        category: 'Equity',       baseNav: 218.75, baseVolume: 12000,  aum: 68.2,   expenseRatio: 0.09,   spreadBps: 0.4,  premiumVolatility: 0.03, trackingErrorBase: 0.02 },
  { ticker: 'VNQ',  name: 'Vanguard Real Estate ETF',                  category: 'Equity',       baseNav: 86.40,  baseVolume: 5200,   aum: 33.8,   expenseRatio: 0.12,   spreadBps: 0.8,  premiumVolatility: 0.06, trackingErrorBase: 0.05 },
  // Fixed Income
  { ticker: 'AGG',  name: 'iShares Core U.S. Aggregate Bond ETF',      category: 'Fixed Income', baseNav: 98.52,  baseVolume: 8500,   aum: 112.0,  expenseRatio: 0.03,   spreadBps: 0.8,  premiumVolatility: 0.04, trackingErrorBase: 0.04 },
  { ticker: 'TLT',  name: 'iShares 20+ Year Treasury Bond ETF',        category: 'Fixed Income', baseNav: 92.18,  baseVolume: 22000,  aum: 50.2,   expenseRatio: 0.15,   spreadBps: 0.5,  premiumVolatility: 0.05, trackingErrorBase: 0.05 },
  { ticker: 'HYG',  name: 'iShares iBoxx $ High Yield Corporate Bond ETF', category: 'Fixed Income', baseNav: 77.35, baseVolume: 12000, aum: 18.0,  expenseRatio: 0.49,   spreadBps: 2.0,  premiumVolatility: 0.10, trackingErrorBase: 0.12 },
  { ticker: 'LQD',  name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', category: 'Fixed Income', baseNav: 108.90, baseVolume: 7800, aum: 36.0, expenseRatio: 0.14, spreadBps: 1.2, premiumVolatility: 0.06, trackingErrorBase: 0.06 },
  { ticker: 'TIP',  name: 'iShares TIPS Bond ETF',                     category: 'Fixed Income', baseNav: 107.65, baseVolume: 4200,   aum: 19.5,   expenseRatio: 0.19,   spreadBps: 1.0,  premiumVolatility: 0.05, trackingErrorBase: 0.04 },
  { ticker: 'MUB',  name: 'iShares National Muni Bond ETF',            category: 'Fixed Income', baseNav: 107.20, baseVolume: 3800,   aum: 38.5,   expenseRatio: 0.07,   spreadBps: 1.5,  premiumVolatility: 0.08, trackingErrorBase: 0.06 },
  // Commodity
  { ticker: 'GLD',  name: 'SPDR Gold Shares',                          category: 'Commodity',    baseNav: 238.50, baseVolume: 7500,   aum: 64.0,   expenseRatio: 0.40,   spreadBps: 0.6,  premiumVolatility: 0.04, trackingErrorBase: 0.03 },
  { ticker: 'SLV',  name: 'iShares Silver Trust',                      category: 'Commodity',    baseNav: 28.90,  baseVolume: 16000,  aum: 11.0,   expenseRatio: 0.50,   spreadBps: 1.5,  premiumVolatility: 0.10, trackingErrorBase: 0.08 },
  { ticker: 'USO',  name: 'United States Oil Fund LP',                 category: 'Commodity',    baseNav: 72.15,  baseVolume: 4500,   aum: 2.8,    expenseRatio: 0.60,   spreadBps: 3.0,  premiumVolatility: 0.20, trackingErrorBase: 0.35 },
  // International
  { ticker: 'EFA',  name: 'iShares MSCI EAFE ETF',                     category: 'International', baseNav: 82.40, baseVolume: 14000,  aum: 55.3,   expenseRatio: 0.32,   spreadBps: 0.8,  premiumVolatility: 0.08, trackingErrorBase: 0.06 },
  { ticker: 'EEM',  name: 'iShares MSCI Emerging Markets ETF',         category: 'International', baseNav: 43.25, baseVolume: 32000,  aum: 22.0,   expenseRatio: 0.68,   spreadBps: 1.5,  premiumVolatility: 0.15, trackingErrorBase: 0.10 },
  { ticker: 'VWO',  name: 'Vanguard FTSE Emerging Markets ETF',        category: 'International', baseNav: 44.80, baseVolume: 10000,  aum: 82.5,   expenseRatio: 0.08,   spreadBps: 1.2,  premiumVolatility: 0.12, trackingErrorBase: 0.08 },
  { ticker: 'EMLC', name: 'VanEck J.P. Morgan EM Local Currency Bond ETF', category: 'International', baseNav: 26.15, baseVolume: 2200, aum: 3.2,  expenseRatio: 0.30,   spreadBps: 4.0,  premiumVolatility: 0.25, trackingErrorBase: 0.18 },
  { ticker: 'KWEB', name: 'KraneShares CSI China Internet ETF',        category: 'International', baseNav: 28.70, baseVolume: 11000,  aum: 5.8,    expenseRatio: 0.69,   spreadBps: 3.5,  premiumVolatility: 0.30, trackingErrorBase: 0.22 },
  // Thematic
  { ticker: 'ARKK', name: 'ARK Innovation ETF',                        category: 'Thematic',     baseNav: 52.30,  baseVolume: 18000,  aum: 6.8,    expenseRatio: 0.75,   spreadBps: 3.0,  premiumVolatility: 0.25, trackingErrorBase: 0.15 },
  { ticker: 'JEPI', name: 'JPMorgan Equity Premium Income ETF',        category: 'Thematic',     baseNav: 57.85,  baseVolume: 4200,   aum: 33.5,   expenseRatio: 0.35,   spreadBps: 1.0,  premiumVolatility: 0.06, trackingErrorBase: 0.08 },
  // Crypto
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust ETF',                 category: 'Crypto',       baseNav: 55.20,  baseVolume: 42000,  aum: 52.0,   expenseRatio: 0.25,   spreadBps: 2.5,  premiumVolatility: 0.35, trackingErrorBase: 0.20 },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF',            category: 'Crypto',       baseNav: 24.80,  baseVolume: 8500,   aum: 2.1,    expenseRatio: 0.95,   spreadBps: 5.0,  premiumVolatility: 0.50, trackingErrorBase: 0.45 },
];

// --- Cache ---


let cache: { data: unknown; ts: number } | null = null;

// --- Generator ---

interface ETFRecord {
  ticker: string;
  name: string;
  category: string;
  nav: number;
  marketPrice: number;
  premiumDiscount: number;
  premiumDiscount30dAvg: number;
  volume: number;
  aum: number;
  expenseRatio: number;
  bid: number;
  ask: number;
  spread: number;
  zScore: number;
  trackingError: number;
}

interface SummaryRecord {
  avgPremium: number;
  avgDiscount: number;
  widestPremium: { ticker: string; value: number };
  widestDiscount: { ticker: string; value: number };
  avgSpread: number;
  totalAum: number;
}

interface ETFPremiumData {
  etfs: ETFRecord[];
  summary: SummaryRecord;
  timestamp: string;
}

function generate(): ETFPremiumData {
  const rng = seededRandom('etf-premium-monitor');
  const round = (v: number, d: number = 4) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const etfs: ETFRecord[] = ETF_DEFS.map(def => {
    // NAV with small daily jitter (+/- 0.5%)
    const nav = round2(def.baseNav * (1 + (rng() - 0.5) * 0.01));

    // Premium/discount: normally distributed, scaled by premiumVolatility
    // Using Box-Muller transform approximation
    const u1 = rng();
    const u2 = rng();
    const normalRandom = Math.sqrt(-2.0 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2.0 * Math.PI * u2);
    const premiumDiscount = round(normalRandom * def.premiumVolatility, 4);

    // Market price derived from NAV and premium/discount
    const marketPrice = round2(nav * (1 + premiumDiscount / 100));

    // 30-day average premium/discount (closer to zero, mean-reverting)
    const avg30d = round(premiumDiscount * 0.3 + (rng() - 0.5) * def.premiumVolatility * 0.4, 4);

    // Volume with jitter (+/- 30%)
    const volume = Math.round(def.baseVolume * 1000 * (1 + (rng() - 0.5) * 0.6));

    // AUM with small jitter
    const aum = round2(def.aum * (1 + (rng() - 0.5) * 0.04));

    // Bid-ask spread
    const spreadPct = round(def.spreadBps / 100 * (0.8 + rng() * 0.4), 4);
    const halfSpread = nav * spreadPct / 200;
    const bid = round2(marketPrice - halfSpread);
    const ask = round2(marketPrice + halfSpread);

    // z-score: premium relative to its historical volatility
    const historicalStdDev = def.premiumVolatility * (0.8 + rng() * 0.4);
    const zScore = round2(historicalStdDev > 0 ? premiumDiscount / historicalStdDev : 0);

    // Tracking error with jitter
    const trackingError = round(def.trackingErrorBase * (0.7 + rng() * 0.6), 4);

    return {
      ticker: def.ticker,
      name: def.name,
      category: def.category,
      nav,
      marketPrice,
      premiumDiscount: round2(premiumDiscount),
      premiumDiscount30dAvg: round2(avg30d),
      volume,
      aum,
      expenseRatio: def.expenseRatio,
      bid,
      ask,
      spread: round(spreadPct, 4),
      zScore,
      trackingError: round2(trackingError),
    };
  });

  // --- Summary ---
  const premiums = etfs.filter(e => e.premiumDiscount > 0);
  const discounts = etfs.filter(e => e.premiumDiscount < 0);

  const avgPremium = premiums.length > 0
    ? round2(premiums.reduce((s, e) => s + e.premiumDiscount, 0) / premiums.length)
    : 0;
  const avgDiscount = discounts.length > 0
    ? round2(discounts.reduce((s, e) => s + e.premiumDiscount, 0) / discounts.length)
    : 0;

  const widestPremiumETF = etfs.reduce((max, e) => e.premiumDiscount > max.premiumDiscount ? e : max, etfs[0]);
  const widestDiscountETF = etfs.reduce((min, e) => e.premiumDiscount < min.premiumDiscount ? e : min, etfs[0]);

  const avgSpread = round(etfs.reduce((s, e) => s + e.spread, 0) / etfs.length, 4);
  const totalAum = round2(etfs.reduce((s, e) => s + e.aum, 0));

  const summary: SummaryRecord = {
    avgPremium,
    avgDiscount,
    widestPremium: { ticker: widestPremiumETF.ticker, value: widestPremiumETF.premiumDiscount },
    widestDiscount: { ticker: widestDiscountETF.ticker, value: widestDiscountETF.premiumDiscount },
    avgSpread,
    totalAum,
  };

  return {
    etfs,
    summary,
    timestamp: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ETFPremium] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate ETF premium/discount data' });
  }
});

export default router;
