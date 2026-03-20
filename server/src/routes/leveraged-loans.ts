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

const LOANS = [
  { issuer: 'Medline Industries', sector: 'Healthcare', rating: 'B+', spread: 300, basePrice: 98.5, size: 5800 },
  { issuer: 'Asurion', sector: 'Insurance', rating: 'B', spread: 375, basePrice: 96.2, size: 4200 },
  { issuer: 'Caesars Entertainment', sector: 'Gaming', rating: 'B+', spread: 275, basePrice: 99.0, size: 3800 },
  { issuer: 'TransDigm Group', sector: 'Aerospace', rating: 'B+', spread: 325, basePrice: 99.5, size: 6500 },
  { issuer: 'Bausch Health', sector: 'Pharma', rating: 'B', spread: 450, basePrice: 91.5, size: 3200 },
  { issuer: 'Citrix Systems', sector: 'Technology', rating: 'B-', spread: 400, basePrice: 93.5, size: 4100 },
  { issuer: 'Finastra', sector: 'Fintech', rating: 'B', spread: 425, basePrice: 92.0, size: 2800 },
  { issuer: 'Epicor Software', sector: 'Technology', rating: 'B', spread: 350, basePrice: 97.5, size: 2500 },
  { issuer: 'Envision Healthcare', sector: 'Healthcare', rating: 'CCC+', spread: 600, basePrice: 78.0, size: 3500 },
  { issuer: 'PetSmart', sector: 'Retail', rating: 'B', spread: 375, basePrice: 97.0, size: 4800 },
  { issuer: 'Intelsat', sector: 'Telecom', rating: 'B+', spread: 325, basePrice: 98.0, size: 3000 },
  { issuer: 'Dun & Bradstreet', sector: 'Data', rating: 'B', spread: 350, basePrice: 98.5, size: 2900 },
  { issuer: 'UKG (Kronos)', sector: 'Technology', rating: 'B+', spread: 300, basePrice: 99.0, size: 5200 },
  { issuer: 'McAfee', sector: 'Cybersecurity', rating: 'B', spread: 350, basePrice: 97.5, size: 3400 },
  { issuer: 'Weber-Stephen', sector: 'Consumer', rating: 'B-', spread: 425, basePrice: 90.5, size: 1800 },
  { issuer: 'Carnival Corp', sector: 'Leisure', rating: 'B+', spread: 300, basePrice: 99.5, size: 5500 },
  { issuer: 'Avolon Holdings', sector: 'Aviation', rating: 'BB-', spread: 250, basePrice: 99.8, size: 4000 },
  { issuer: 'Athenahealth', sector: 'Healthcare IT', rating: 'B', spread: 350, basePrice: 97.0, size: 3100 },
];

const INDICES = [
  { id: 'LSTA100', name: 'Morningstar/LSTA US LL 100', baseLevel: 97.5, baseSpread: 345 },
  { id: 'LSTA-BB', name: 'LSTA BB-Rated', baseLevel: 99.2, baseSpread: 235 },
  { id: 'LSTA-B', name: 'LSTA B-Rated', baseLevel: 96.8, baseSpread: 385 },
  { id: 'ELLI', name: 'European Leveraged Loan Index', baseLevel: 97.0, baseSpread: 375 },
  { id: 'CS-LLI', name: 'CS Leveraged Loan Index', baseLevel: 97.2, baseSpread: 350 },
];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-leveraged-loans'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const loans = LOANS.map(l => {
    const price = Math.round(jitter(l.basePrice, 0.015) * 100) / 100;
    const spread = Math.round(jitter(l.spread, 0.08));
    const change1d = Math.round((rng() - 0.5) * 0.6 * 100) / 100;
    const change1w = Math.round((rng() - 0.48) * 1.2 * 100) / 100;
    const yield_ = Math.round((5.33 + spread / 100) * 100) / 100;
    const distressed = price < 85;
    const recoveryRate = Math.round((60 + rng() * 25) * 10) / 10;
    const maturity = 2026 + Math.floor(rng() * 5);
    const cloHolding = Math.round(40 + rng() * 35);
    const bidAskSpread = Math.round((0.1 + rng() * 0.6) * 100) / 100;

    return {
      issuer: l.issuer, sector: l.sector, rating: l.rating,
      price, spread, change1d, change1w, yield: yield_,
      size: l.size, distressed, recoveryRate, maturity,
      cloHolding, bidAskSpread,
    };
  });

  const indices = INDICES.map(idx => {
    const level = Math.round(jitter(idx.baseLevel, 0.005) * 100) / 100;
    const spread = Math.round(jitter(idx.baseSpread, 0.03));
    const change1d = Math.round((rng() - 0.5) * 0.3 * 100) / 100;
    const mtdReturn = Math.round((rng() - 0.4) * 1.5 * 100) / 100;
    const ytdReturn = Math.round((rng() - 0.3) * 4 * 100) / 100;
    return { id: idx.id, name: idx.name, level, spread, change1d, mtdReturn, ytdReturn };
  });

  // New issue pipeline
  const pipeline = Array.from({ length: 8 }, () => {
    const sectors = ['Technology', 'Healthcare', 'Consumer', 'Industrial', 'Telecom', 'Energy', 'Financial'];
    const ratings = ['BB-', 'B+', 'B', 'B-', 'CCC+'];
    const types = ['Term Loan B', 'Term Loan B-2', 'First Lien', 'Second Lien', 'Delayed Draw'];
    return {
      issuer: `${['Atlas', 'Vertex', 'Catalyst', 'Summit', 'Nexus', 'Pinnacle', 'Zenith', 'Meridian'][Math.floor(rng() * 8)]} ${sectors[Math.floor(rng() * sectors.length)]}`,
      type: types[Math.floor(rng() * types.length)],
      rating: ratings[Math.floor(rng() * ratings.length)],
      size: Math.round(500 + rng() * 4500),
      spread: Math.round(275 + rng() * 250),
      status: rng() > 0.5 ? 'Pricing' : rng() > 0.3 ? 'In Market' : 'Launched',
    };
  });

  // Sector breakdown
  const sectors = [...new Set(LOANS.map(l => l.sector))].map(sector => {
    const sl = loans.filter(l => l.sector === sector);
    return {
      sector, count: sl.length,
      avgPrice: Math.round(sl.reduce((a, l) => a + l.price, 0) / sl.length * 100) / 100,
      avgSpread: Math.round(sl.reduce((a, l) => a + l.spread, 0) / sl.length),
      totalSize: Math.round(sl.reduce((a, l) => a + l.size, 0)),
    };
  }).sort((a, b) => b.totalSize - a.totalSize);

  const totalOutstanding = Math.round(loans.reduce((a, l) => a + l.size, 0) / 1000 * 10) / 10;
  const avgPrice = Math.round(loans.reduce((a, l) => a + l.price, 0) / loans.length * 100) / 100;
  const avgSpread = Math.round(loans.reduce((a, l) => a + l.spread, 0) / loans.length);
  const distressedCount = loans.filter(l => l.distressed).length;
  const defaultRate = Math.round(jitter(1.8, 0.2) * 100) / 100;

  const summary = { totalLoans: loans.length, totalOutstanding, avgPrice, avgSpread, distressedCount, defaultRate };

  return { loans, indices, pipeline, sectors, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LeveragedLoans] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate leveraged loan data' });
  }
});

export default router;
