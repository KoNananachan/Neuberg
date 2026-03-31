import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];
const STRIKES_CAP = [4.00, 4.50, 5.00, 5.25, 5.50, 6.00, 6.50, 7.00];
const STRIKES_FLOOR = [2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.25];

// Base premium in bp per notional (realistic USD SOFR cap/floor prices)
const BASE_CAP_PREMIUMS: Record<string, Record<string, number>> = {
  '1Y':  { '4.00': 145, '4.50': 98, '5.00': 55, '5.25': 38, '5.50': 24, '6.00': 8, '6.50': 3, '7.00': 1 },
  '2Y':  { '4.00': 280, '4.50': 210, '5.00': 145, '5.25': 115, '5.50': 88, '6.00': 45, '6.50': 22, '7.00': 10 },
  '3Y':  { '4.00': 400, '4.50': 315, '5.00': 235, '5.25': 195, '5.50': 160, '6.00': 95, '6.50': 55, '7.00': 30 },
  '5Y':  { '4.00': 600, '4.50': 495, '5.00': 395, '5.25': 345, '5.50': 298, '6.00': 205, '6.50': 140, '7.00': 90 },
  '7Y':  { '4.00': 760, '4.50': 650, '5.00': 540, '5.25': 485, '5.50': 432, '6.00': 325, '6.50': 240, '7.00': 175 },
  '10Y': { '4.00': 920, '4.50': 805, '5.00': 695, '5.25': 640, '5.50': 585, '6.00': 475, '6.50': 375, '7.00': 290 },
};

const BASE_FLOOR_PREMIUMS: Record<string, Record<string, number>> = {
  '1Y':  { '2.00': 0, '2.50': 0, '3.00': 1, '3.50': 3, '4.00': 10, '4.50': 28, '5.00': 62, '5.25': 85 },
  '2Y':  { '2.00': 1, '2.50': 3, '3.00': 8, '3.50': 20, '4.00': 45, '4.50': 88, '5.00': 150, '5.25': 185 },
  '3Y':  { '2.00': 5, '2.50': 12, '3.00': 28, '3.50': 55, '4.00': 100, '4.50': 165, '5.00': 250, '5.25': 298 },
  '5Y':  { '2.00': 25, '2.50': 48, '3.00': 85, '3.50': 140, '4.00': 215, '4.50': 310, '5.00': 425, '5.25': 488 },
  '7Y':  { '2.00': 55, '2.50': 95, '3.00': 155, '3.50': 235, '4.00': 335, '4.50': 450, '5.00': 580, '5.25': 650 },
  '10Y': { '2.00': 100, '2.50': 160, '3.00': 245, '3.50': 350, '4.00': 470, '4.50': 600, '5.00': 745, '5.25': 820 },
};

const CURRENCIES = [
  { id: 'USD', name: 'US Dollar (SOFR)', baseRate: 5.33, multiplier: 1.0 },
  { id: 'EUR', name: 'Euro (EURIBOR)', baseRate: 3.90, multiplier: 0.7 },
  { id: 'GBP', name: 'Sterling (SONIA)', baseRate: 5.20, multiplier: 0.95 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-rate-caps-floors'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const currencies = CURRENCIES.map(ccy => {
    const capGrid = TENORS.map(tenor => {
      const row: Record<string, any> = { tenor };
      STRIKES_CAP.forEach(strike => {
        const key = strike.toFixed(2);
        const base = (BASE_CAP_PREMIUMS[tenor]?.[key] ?? 100) * ccy.multiplier;
        const premium = Math.round(jitter(base, 0.06));
        const vol = Math.round(jitter(75 + (7 - strike) * 8, 0.05) * 10) / 10;
        row[key] = { premium, vol };
      });
      return row;
    });

    const floorGrid = TENORS.map(tenor => {
      const row: Record<string, any> = { tenor };
      STRIKES_FLOOR.forEach(strike => {
        const key = strike.toFixed(2);
        const base = (BASE_FLOOR_PREMIUMS[tenor]?.[key] ?? 50) * ccy.multiplier;
        const premium = Math.round(jitter(base, 0.06));
        const vol = Math.round(jitter(65 + strike * 5, 0.05) * 10) / 10;
        row[key] = { premium, vol };
      });
      return row;
    });

    // Collar pricing (buy cap, sell floor)
    const collars = [
      { capStrike: 5.50, floorStrike: 4.00 },
      { capStrike: 6.00, floorStrike: 3.50 },
      { capStrike: 5.25, floorStrike: 4.50 },
    ].map(c => {
      return TENORS.map(tenor => {
        const capKey = c.capStrike.toFixed(2);
        const floorKey = c.floorStrike.toFixed(2);
        const capPrem = (BASE_CAP_PREMIUMS[tenor]?.[capKey] ?? 100) * ccy.multiplier;
        const floorPrem = (BASE_FLOOR_PREMIUMS[tenor]?.[floorKey] ?? 50) * ccy.multiplier;
        const netPremium = Math.round(jitter(capPrem - floorPrem, 0.08));
        return {
          tenor, capStrike: c.capStrike, floorStrike: c.floorStrike,
          capPremium: Math.round(jitter(capPrem, 0.06)),
          floorPremium: Math.round(jitter(floorPrem, 0.06)),
          netPremium,
        };
      });
    });

    // Forward rate curve implied from caps
    const forwardRates = TENORS.map(tenor => ({
      tenor,
      spot: Math.round(jitter(ccy.baseRate, 0.005) * 1000) / 1000,
      forward1y: Math.round(jitter(ccy.baseRate - 0.3, 0.01) * 1000) / 1000,
      forward2y: Math.round(jitter(ccy.baseRate - 0.8, 0.015) * 1000) / 1000,
      atmCapVol: Math.round(jitter(80, 0.06) * 10) / 10,
    }));

    return {
      currency: ccy.id, name: ccy.name, baseRate: ccy.baseRate,
      capGrid, floorGrid, collars, forwardRates,
    };
  });

  const summary = {
    tenors: TENORS,
    capStrikes: STRIKES_CAP,
    floorStrikes: STRIKES_FLOOR,
    sofrRate: Math.round(jitter(5.33, 0.003) * 1000) / 1000,
  };

  return { currencies, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RateCapsFloors] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate rate caps/floors data' });
  }
});

export default router;
