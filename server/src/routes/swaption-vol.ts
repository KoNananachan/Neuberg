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

const EXPIRIES = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];
const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];

// Base ATM normal vol in bp (realistic USD swaption vols)
const BASE_VOLS: Record<string, Record<string, number>> = {
  '1M':  { '1Y': 85, '2Y': 82, '3Y': 80, '5Y': 78, '7Y': 76, '10Y': 74, '15Y': 72, '20Y': 70, '30Y': 68 },
  '3M':  { '1Y': 90, '2Y': 88, '3Y': 86, '5Y': 84, '7Y': 82, '10Y': 80, '15Y': 78, '20Y': 76, '30Y': 74 },
  '6M':  { '1Y': 95, '2Y': 92, '3Y': 90, '5Y': 87, '7Y': 85, '10Y': 83, '15Y': 81, '20Y': 79, '30Y': 77 },
  '1Y':  { '1Y': 100, '2Y': 97, '3Y': 94, '5Y': 90, '7Y': 88, '10Y': 86, '15Y': 84, '20Y': 82, '30Y': 80 },
  '2Y':  { '1Y': 105, '2Y': 101, '3Y': 97, '5Y': 93, '7Y': 90, '10Y': 88, '15Y': 86, '20Y': 84, '30Y': 82 },
  '3Y':  { '1Y': 108, '2Y': 104, '3Y': 100, '5Y': 96, '7Y': 93, '10Y': 90, '15Y': 88, '20Y': 86, '30Y': 84 },
  '5Y':  { '1Y': 112, '2Y': 108, '3Y': 104, '5Y': 100, '7Y': 96, '10Y': 93, '15Y': 90, '20Y': 88, '30Y': 86 },
  '7Y':  { '1Y': 115, '2Y': 110, '3Y': 106, '5Y': 102, '7Y': 98, '10Y': 95, '15Y': 92, '20Y': 90, '30Y': 88 },
  '10Y': { '1Y': 118, '2Y': 113, '3Y': 109, '5Y': 104, '7Y': 100, '10Y': 97, '15Y': 94, '20Y': 92, '30Y': 90 },
};

const CURRENCIES = [
  { id: 'USD', name: 'US Dollar', volMultiplier: 1.0 },
  { id: 'EUR', name: 'Euro', volMultiplier: 0.85 },
  { id: 'GBP', name: 'British Pound', volMultiplier: 0.95 },
  { id: 'JPY', name: 'Japanese Yen', volMultiplier: 0.55 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-swaption-vol'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const currencies = CURRENCIES.map(ccy => {
    const volGrid = EXPIRIES.map(expiry => {
      const row: Record<string, number> = { expiry } as any;
      TENORS.forEach(tenor => {
        const baseVol = (BASE_VOLS[expiry]?.[tenor] ?? 90) * ccy.volMultiplier;
        row[tenor] = Math.round(jitter(baseVol, 0.04) * 10) / 10;
      });
      return row;
    });

    // 1D changes for the vol grid
    const changeGrid = EXPIRIES.map(expiry => {
      const row: Record<string, number> = { expiry } as any;
      TENORS.forEach(tenor => {
        row[tenor] = Math.round((rng() - 0.5) * 3 * 10) / 10;
      });
      return row;
    });

    // Skew data (25d receiver - 25d payer) for key points
    const skewPoints = [
      { expiry: '1Y', tenor: '5Y' },
      { expiry: '1Y', tenor: '10Y' },
      { expiry: '5Y', tenor: '5Y' },
      { expiry: '5Y', tenor: '10Y' },
      { expiry: '10Y', tenor: '10Y' },
      { expiry: '10Y', tenor: '30Y' },
    ].map(pt => {
      const baseVol = (BASE_VOLS[pt.expiry]?.[pt.tenor] ?? 90) * ccy.volMultiplier;
      return {
        expiry: pt.expiry, tenor: pt.tenor,
        atm: Math.round(jitter(baseVol, 0.04) * 10) / 10,
        recv25d: Math.round(jitter(baseVol + 3, 0.05) * 10) / 10,
        pay25d: Math.round(jitter(baseVol - 2, 0.05) * 10) / 10,
        recv10d: Math.round(jitter(baseVol + 8, 0.06) * 10) / 10,
        pay10d: Math.round(jitter(baseVol - 5, 0.06) * 10) / 10,
      };
    });

    // Term structure for a given expiry
    const termStructure1y = TENORS.map(tenor => ({
      tenor,
      vol: Math.round(jitter((BASE_VOLS['1Y']?.[tenor] ?? 90) * ccy.volMultiplier, 0.04) * 10) / 10,
      change1d: Math.round((rng() - 0.5) * 2 * 10) / 10,
      change1w: Math.round((rng() - 0.48) * 5 * 10) / 10,
    }));

    return { currency: ccy.id, name: ccy.name, volGrid, changeGrid, skewPoints, termStructure1y };
  });

  // Key benchmarks
  const benchmarks = [
    { name: '1Y into 10Y ATM', expiry: '1Y', tenor: '10Y' },
    { name: '5Y into 5Y ATM', expiry: '5Y', tenor: '5Y' },
    { name: '10Y into 10Y ATM', expiry: '10Y', tenor: '10Y' },
    { name: '1Y into 30Y ATM', expiry: '1Y', tenor: '30Y' },
  ].map(b => {
    const vol = Math.round(jitter(BASE_VOLS[b.expiry]?.[b.tenor] ?? 90, 0.04) * 10) / 10;
    const change1d = Math.round((rng() - 0.5) * 3 * 10) / 10;
    const change1w = Math.round((rng() - 0.48) * 6 * 10) / 10;
    const change1m = Math.round((rng() - 0.45) * 10 * 10) / 10;
    return { ...b, vol, change1d, change1w, change1m };
  });

  const summary = {
    expiries: EXPIRIES,
    tenors: TENORS,
    avgVol: Math.round(currencies[0].volGrid.reduce((a, row) =>
      a + TENORS.reduce((b, t) => b + ((row as any)[t] ?? 0), 0), 0) / (EXPIRIES.length * TENORS.length) * 10) / 10,
  };

  return { currencies, benchmarks, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SwaptionVol] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate swaption vol data' });
  }
});

export default router;
