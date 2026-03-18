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

const ISSUERS = [
  { name: 'Rite Aid', sector: 'Retail', rating: 'D', basePrice: 12, coupon: 7.5, maturity: 2025, outstanding: 1800 },
  { name: 'Envision Healthcare', sector: 'Healthcare', rating: 'D', basePrice: 8, coupon: 8.75, maturity: 2026, outstanding: 3500 },
  { name: 'Mallinckrodt', sector: 'Pharma', rating: 'CCC-', basePrice: 22, coupon: 10.0, maturity: 2029, outstanding: 1200 },
  { name: 'Carvana', sector: 'Auto Retail', rating: 'CCC+', basePrice: 65, coupon: 5.625, maturity: 2027, outstanding: 5600 },
  { name: 'AMC Entertainment', sector: 'Media', rating: 'CCC', basePrice: 42, coupon: 7.5, maturity: 2029, outstanding: 2100 },
  { name: 'Bed Bath & Beyond', sector: 'Retail', rating: 'D', basePrice: 3, coupon: 6.75, maturity: 2024, outstanding: 850 },
  { name: 'WeWork', sector: 'Real Estate', rating: 'D', basePrice: 5, coupon: 7.875, maturity: 2025, outstanding: 2300 },
  { name: 'Spirit Airlines', sector: 'Airlines', rating: 'CC', basePrice: 28, coupon: 8.0, maturity: 2026, outstanding: 1100 },
  { name: 'Lumen Technologies', sector: 'Telecom', rating: 'CCC+', basePrice: 55, coupon: 5.125, maturity: 2026, outstanding: 4200 },
  { name: 'Community Health', sector: 'Healthcare', rating: 'CCC', basePrice: 38, coupon: 8.0, maturity: 2027, outstanding: 3800 },
  { name: 'Talen Energy', sector: 'Utilities', rating: 'CCC-', basePrice: 45, coupon: 6.625, maturity: 2028, outstanding: 1500 },
  { name: 'Diebold Nixdorf', sector: 'Technology', rating: 'D', basePrice: 15, coupon: 9.375, maturity: 2025, outstanding: 900 },
  { name: 'Hertz Global', sector: 'Auto Rental', rating: 'CCC+', basePrice: 58, coupon: 4.625, maturity: 2026, outstanding: 2800 },
  { name: 'Revlon', sector: 'Consumer', rating: 'D', basePrice: 6, coupon: 6.25, maturity: 2024, outstanding: 1700 },
  { name: 'Frontier Comm', sector: 'Telecom', rating: 'CCC', basePrice: 48, coupon: 5.875, maturity: 2029, outstanding: 3200 },
  { name: 'Cineworld Group', sector: 'Media', rating: 'CC', basePrice: 18, coupon: 8.5, maturity: 2028, outstanding: 2500 },
  { name: 'LifePoint Health', sector: 'Healthcare', rating: 'CCC+', basePrice: 62, coupon: 9.875, maturity: 2030, outstanding: 2200 },
  { name: 'Guitar Center', sector: 'Retail', rating: 'CCC-', basePrice: 35, coupon: 8.5, maturity: 2026, outstanding: 800 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-distressed-debt'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const issuers = ISSUERS.map(iss => {
    const price = Math.round(jitter(iss.basePrice, 0.15) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * price * 0.08 * 100) / 100;
    const change1w = Math.round((rng() - 0.48) * price * 0.15 * 100) / 100;
    const ytw = price < 20 ? Math.round((iss.coupon / price * 100 + 50 + rng() * 30) * 100) / 100 :
      Math.round((iss.coupon + (100 - price) / Math.max(1, iss.maturity - 2026)) * 100) / 100;
    const spread = Math.round(ytw * 100 - 430 + rng() * 200);
    const recoveryEst = Math.round((price * 0.8 + rng() * 20) * 10) / 10;
    const daysToMaturity = Math.round((iss.maturity - 2026) * 365 + rng() * 365);
    const chapter11 = iss.rating === 'D' && rng() > 0.3;
    const status = iss.rating === 'D' ? (chapter11 ? 'Chapter 11' : 'Defaulted') :
      price < 30 ? 'Deeply Distressed' : price < 60 ? 'Distressed' : 'Stressed';
    const bidAsk = Math.round((1 + rng() * (price < 20 ? 5 : 2)) * 100) / 100;
    const volume30d = Math.round(jitter(iss.outstanding * 0.05, 0.4));

    return {
      name: iss.name, sector: iss.sector, rating: iss.rating,
      coupon: iss.coupon, maturity: iss.maturity, outstanding: iss.outstanding,
      price, change1d, change1w, ytw, spread, recoveryEst,
      daysToMaturity, status, chapter11, bidAsk, volume30d,
    };
  });

  // Sector breakdown
  const sectors = [...new Set(ISSUERS.map(i => i.sector))].map(sector => {
    const si = issuers.filter(i => i.sector === sector);
    return {
      sector, count: si.length,
      avgPrice: Math.round(si.reduce((a, i) => a + i.price, 0) / si.length * 100) / 100,
      totalOutstanding: Math.round(si.reduce((a, i) => a + i.outstanding, 0)),
      defaulted: si.filter(i => i.rating === 'D').length,
    };
  }).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  // Rating distribution
  const ratingDist = ['D', 'CC', 'CCC-', 'CCC', 'CCC+'].map(r => ({
    rating: r,
    count: issuers.filter(i => i.rating === r).length,
    avgPrice: Math.round((issuers.filter(i => i.rating === r).reduce((a, i) => a + i.price, 0) / Math.max(1, issuers.filter(i => i.rating === r).length)) * 100) / 100,
  }));

  // Recovery analysis
  const recoveryBands = [
    { band: '0-20%', min: 0, max: 20 },
    { band: '20-40%', min: 20, max: 40 },
    { band: '40-60%', min: 40, max: 60 },
    { band: '60-80%', min: 60, max: 80 },
  ].map(b => ({
    band: b.band,
    count: issuers.filter(i => i.recoveryEst >= b.min && i.recoveryEst < b.max).length,
    totalFace: Math.round(issuers.filter(i => i.recoveryEst >= b.min && i.recoveryEst < b.max).reduce((a, i) => a + i.outstanding, 0)),
  }));

  const totalFaceValue = Math.round(issuers.reduce((a, i) => a + i.outstanding, 0) / 1000 * 10) / 10;
  const avgPrice = Math.round(issuers.reduce((a, i) => a + i.price, 0) / issuers.length * 100) / 100;
  const defaultedCount = issuers.filter(i => i.rating === 'D').length;
  const avgRecovery = Math.round(issuers.reduce((a, i) => a + i.recoveryEst, 0) / issuers.length * 10) / 10;

  const summary = { totalIssuers: issuers.length, totalFaceValue, avgPrice, defaultedCount, avgRecovery };

  return { issuers, sectors, ratingDist, recoveryBands, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DistressedDebt] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate distressed debt data' });
  }
});

export default router;
