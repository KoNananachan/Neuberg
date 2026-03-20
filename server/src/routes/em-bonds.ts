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

const EM_COUNTRIES = [
  { id: 'BR', name: 'Brazil', region: 'LatAm', baseSpread: 220, baseYield: 11.5, policyRate: 10.75, inflation: 4.5, rating: 'BB' },
  { id: 'MX', name: 'Mexico', region: 'LatAm', baseSpread: 160, baseYield: 9.8, policyRate: 11.0, inflation: 4.2, rating: 'BBB' },
  { id: 'CO', name: 'Colombia', region: 'LatAm', baseSpread: 250, baseYield: 10.2, policyRate: 12.25, inflation: 7.1, rating: 'BB+' },
  { id: 'CL', name: 'Chile', region: 'LatAm', baseSpread: 120, baseYield: 5.5, policyRate: 6.5, inflation: 3.8, rating: 'A' },
  { id: 'ZA', name: 'South Africa', region: 'Africa', baseSpread: 280, baseYield: 10.5, policyRate: 8.25, inflation: 5.6, rating: 'BB-' },
  { id: 'NG', name: 'Nigeria', region: 'Africa', baseSpread: 450, baseYield: 14.0, policyRate: 24.75, inflation: 28.0, rating: 'B-' },
  { id: 'TR', name: 'Turkey', region: 'EMEA', baseSpread: 350, baseYield: 26.0, policyRate: 45.0, inflation: 65.0, rating: 'B+' },
  { id: 'PL', name: 'Poland', region: 'CEE', baseSpread: 90, baseYield: 5.2, policyRate: 5.75, inflation: 3.5, rating: 'A-' },
  { id: 'HU', name: 'Hungary', region: 'CEE', baseSpread: 150, baseYield: 6.8, policyRate: 6.75, inflation: 4.0, rating: 'BBB' },
  { id: 'ID', name: 'Indonesia', region: 'Asia', baseSpread: 130, baseYield: 6.8, policyRate: 6.0, inflation: 2.8, rating: 'BBB' },
  { id: 'IN', name: 'India', region: 'Asia', baseSpread: 110, baseYield: 7.1, policyRate: 6.5, inflation: 5.0, rating: 'BBB-' },
  { id: 'CN', name: 'China', region: 'Asia', baseSpread: 70, baseYield: 2.5, policyRate: 3.45, inflation: 0.5, rating: 'A+' },
  { id: 'TH', name: 'Thailand', region: 'Asia', baseSpread: 80, baseYield: 2.8, policyRate: 2.5, inflation: 1.5, rating: 'BBB+' },
  { id: 'PH', name: 'Philippines', region: 'Asia', baseSpread: 120, baseYield: 6.2, policyRate: 6.5, inflation: 4.8, rating: 'BBB+' },
  { id: 'MY', name: 'Malaysia', region: 'Asia', baseSpread: 85, baseYield: 3.9, policyRate: 3.0, inflation: 2.0, rating: 'A-' },
];

const EM_INDICES = [
  { id: 'EMBI', name: 'JPM EMBI Global Diversified', baseSpread: 340, baseReturn: 1.5 },
  { id: 'CEMBI', name: 'JPM CEMBI Broad Diversified', baseSpread: 280, baseReturn: 2.0 },
  { id: 'GBI-EM', name: 'JPM GBI-EM Global Diversified', baseSpread: 0, baseReturn: -0.5 },
  { id: 'NEXGEM', name: 'JPM NEXGEM', baseSpread: 550, baseReturn: 3.0 },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-em-bonds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const countries = EM_COUNTRIES.map(c => {
    const hardCurrSpread = Math.round(jitter(c.baseSpread, 0.08));
    const hardCurrYield = Math.round((4.5 + hardCurrSpread / 100) * 100) / 100;
    const localYield10y = Math.round(jitter(c.baseYield, 0.06) * 100) / 100;
    const realYield = Math.round((localYield10y - c.inflation) * 100) / 100;
    const spreadChange1d = Math.round((rng() - 0.5) * 15);
    const spreadChange1w = Math.round((rng() - 0.48) * 30);
    const spreadChange1m = Math.round((rng() - 0.45) * 50);
    const cdsSpread5y = Math.round(jitter(c.baseSpread * 0.9, 0.1));
    const fxVol3m = Math.round((8 + rng() * 15) * 10) / 10;

    const yieldCurve = [1, 2, 3, 5, 7, 10, 15, 20, 30].map(tenor => ({
      tenor: `${tenor}Y`,
      yield: Math.round((localYield10y * (0.7 + tenor * 0.03) + (rng() - 0.5) * 0.5) * 100) / 100,
    }));

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        spread: Math.round(jitter(c.baseSpread, 0.1)),
        localYield: Math.round(jitter(c.baseYield, 0.05) * 100) / 100,
      };
    });

    return {
      id: c.id, name: c.name, region: c.region, rating: c.rating,
      policyRate: c.policyRate, inflation: c.inflation,
      hardCurrSpread, hardCurrYield, localYield10y, realYield,
      spreadChange1d, spreadChange1w, spreadChange1m,
      cdsSpread5y, fxVol3m, yieldCurve, history,
    };
  });

  const indices = EM_INDICES.map(idx => ({
    id: idx.id, name: idx.name,
    spread: Math.round(jitter(idx.baseSpread, 0.06)),
    spreadChange1d: Math.round((rng() - 0.5) * 8),
    spreadChange1w: Math.round((rng() - 0.48) * 20),
    ytdReturn: Math.round(jitter(idx.baseReturn, 0.5) * 100) / 100,
    mtdReturn: Math.round((rng() - 0.45) * 2 * 100) / 100,
  }));

  const regionAgg = [...new Set(EM_COUNTRIES.map(c => c.region))].map(region => {
    const regionCountries = countries.filter(c => c.region === region);
    return {
      region,
      avgSpread: Math.round(regionCountries.reduce((a, c) => a + c.hardCurrSpread, 0) / regionCountries.length),
      avgLocalYield: Math.round(regionCountries.reduce((a, c) => a + c.localYield10y, 0) / regionCountries.length * 100) / 100,
      avgRealYield: Math.round(regionCountries.reduce((a, c) => a + c.realYield, 0) / regionCountries.length * 100) / 100,
      count: regionCountries.length,
    };
  });

  return { countries, indices, regionAgg, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EMBonds] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate EM bonds data' });
  }
});

export default router;
