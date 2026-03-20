import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const COMMODITIES = [
  { id: 'CL', name: 'WTI Crude Oil', unit: '$/bbl', basePrice: 78.5, curveSlope: -0.3 },
  { id: 'CO', name: 'Brent Crude', unit: '$/bbl', basePrice: 82.0, curveSlope: -0.25 },
  { id: 'NG', name: 'Natural Gas', unit: '$/MMBtu', basePrice: 2.8, curveSlope: 0.15 },
  { id: 'GC', name: 'Gold', unit: '$/oz', basePrice: 2350, curveSlope: 0.8 },
  { id: 'SI', name: 'Silver', unit: '$/oz', basePrice: 28.5, curveSlope: 0.12 },
  { id: 'HG', name: 'Copper', unit: '$/lb', basePrice: 4.25, curveSlope: -0.02 },
  { id: 'W', name: 'Wheat', unit: '¢/bu', basePrice: 580, curveSlope: 2.5 },
  { id: 'C', name: 'Corn', unit: '¢/bu', basePrice: 435, curveSlope: 1.8 },
  { id: 'S', name: 'Soybeans', unit: '¢/bu', basePrice: 1180, curveSlope: -3.0 },
  { id: 'CT', name: 'Cotton', unit: '¢/lb', basePrice: 82, curveSlope: 0.3 },
  { id: 'KC', name: 'Coffee', unit: '¢/lb', basePrice: 185, curveSlope: -1.5 },
  { id: 'SB', name: 'Sugar', unit: '¢/lb', basePrice: 22.5, curveSlope: 0.08 },
];

const MONTHS = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-curves'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const commodities = COMMODITIES.map(c => {
    const spotPrice = Math.round(jitter(c.basePrice, 0.05) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * c.basePrice * 0.02 * 100) / 100;
    const change1dPct = Math.round((change1d / spotPrice) * 100 * 100) / 100;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const curve = Array.from({ length: 12 }, (_, i) => {
      const contractMonth = (currentMonth + i + 1) % 12;
      const contractYear = currentYear + Math.floor((currentMonth + i + 1) / 12);
      const monthsOut = i + 1;
      const price = Math.round((spotPrice + c.curveSlope * monthsOut + (rng() - 0.5) * c.basePrice * 0.02) * 100) / 100;
      const volume = Math.round(jitter(50000 / (1 + i * 0.3), 0.2));
      const openInterest = Math.round(jitter(200000 / (1 + i * 0.2), 0.15));
      return {
        contract: `${MONTHS[contractMonth]}${String(contractYear).slice(-2)}`,
        month: `${MONTH_NAMES[contractMonth]} ${contractYear}`,
        price, volume, openInterest, monthsOut,
      };
    });

    const front = curve[0]?.price ?? spotPrice;
    const back = curve[curve.length - 1]?.price ?? spotPrice;
    const structure = front > back ? 'Backwardation' : 'Contango';
    const spreadFrontBack = Math.round((front - back) * 100) / 100;
    const spread12 = curve.length >= 2 ? Math.round((curve[0].price - curve[1].price) * 100) / 100 : 0;
    const annualizedRoll = curve.length >= 2 ? Math.round(((curve[0].price - curve[1].price) / curve[0].price * 12) * 100 * 100) / 100 : 0;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        front: Math.round(jitter(c.basePrice, 0.04) * 100) / 100,
        m2: Math.round(jitter(c.basePrice + c.curveSlope, 0.04) * 100) / 100,
        spread: Math.round((rng() - 0.5) * Math.abs(c.curveSlope) * 4 * 100) / 100,
      };
    });

    return {
      id: c.id, name: c.name, unit: c.unit,
      spotPrice, change1d, change1dPct, curve,
      structure, spreadFrontBack, spread12, annualizedRoll, history,
    };
  });

  const structureSummary = {
    contango: commodities.filter(c => c.structure === 'Contango').length,
    backwardation: commodities.filter(c => c.structure === 'Backwardation').length,
    steepest: commodities.reduce((a, b) => Math.abs(a.annualizedRoll) > Math.abs(b.annualizedRoll) ? a : b),
  };

  return { commodities, structureSummary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CommodityCurves] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity curve data' });
  }
});

export default router;
