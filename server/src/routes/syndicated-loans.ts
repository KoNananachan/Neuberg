import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const BORROWERS_PIPELINE = [
  { borrower: 'Medline Industries', sponsor: 'Blackstone', sector: 'Healthcare' },
  { borrower: 'Citrix Systems', sponsor: 'Vista Equity', sector: 'Technology' },
  { borrower: 'Zendesk', sponsor: 'Hellman & Friedman', sector: 'Technology' },
  { borrower: 'Qualtrics', sponsor: 'Silver Lake', sector: 'Software' },
  { borrower: 'Cotiviti', sponsor: 'Veritas Capital', sector: 'Healthcare IT' },
  { borrower: 'Athenahealth', sponsor: 'Bain Capital', sector: 'Healthcare IT' },
  { borrower: 'Finastra', sponsor: 'Vista Equity', sector: 'Fintech' },
  { borrower: 'Epicor Software', sponsor: 'Clayton Dubilier', sector: 'Software' },
  { borrower: 'Dun & Bradstreet', sponsor: 'Corporate', sector: 'Data & Analytics' },
  { borrower: 'Worldpay', sponsor: 'GTCR', sector: 'Payments' },
  { borrower: 'Intelsat', sponsor: 'Corporate', sector: 'Telecom' },
  { borrower: 'TransDigm Group', sponsor: 'Corporate', sector: 'Aerospace' },
];

const SECONDARY_LOANS = [
  { borrower: 'Medline Industries', baseBid: 98.50, baseSpread: 300, rating: 'B+', sector: 'Healthcare' },
  { borrower: 'Asurion', baseBid: 96.25, baseSpread: 375, rating: 'B', sector: 'Insurance' },
  { borrower: 'Caesars Entertainment', baseBid: 99.00, baseSpread: 275, rating: 'B+', sector: 'Gaming' },
  { borrower: 'TransDigm Group', baseBid: 99.50, baseSpread: 325, rating: 'BB-', sector: 'Aerospace' },
  { borrower: 'Bausch Health', baseBid: 91.50, baseSpread: 450, rating: 'B-', sector: 'Pharma' },
  { borrower: 'Citrix Systems', baseBid: 93.50, baseSpread: 400, rating: 'B', sector: 'Technology' },
  { borrower: 'Finastra', baseBid: 92.00, baseSpread: 425, rating: 'B', sector: 'Fintech' },
  { borrower: 'PetSmart', baseBid: 97.00, baseSpread: 375, rating: 'B', sector: 'Retail' },
  { borrower: 'Envision Healthcare', baseBid: 82.00, baseSpread: 600, rating: 'CCC+', sector: 'Healthcare' },
  { borrower: 'UKG (Kronos)', baseBid: 99.00, baseSpread: 300, rating: 'B+', sector: 'Technology' },
  { borrower: 'McAfee', baseBid: 97.50, baseSpread: 350, rating: 'B', sector: 'Cybersecurity' },
  { borrower: 'Carnival Corp', baseBid: 99.25, baseSpread: 300, rating: 'B+', sector: 'Leisure' },
];

const SECTORS = [
  { sector: 'Technology', baseVolume: 62, baseSpread: 365, baseLeverage: 5.8, baseDealCount: 42, baseDefault: 1.2 },
  { sector: 'Healthcare', baseVolume: 54, baseSpread: 385, baseLeverage: 5.5, baseDealCount: 38, baseDefault: 1.5 },
  { sector: 'Software', baseVolume: 48, baseSpread: 375, baseLeverage: 6.2, baseDealCount: 35, baseDefault: 0.9 },
  { sector: 'Industrials', baseVolume: 35, baseSpread: 340, baseLeverage: 4.8, baseDealCount: 28, baseDefault: 1.8 },
  { sector: 'Consumer', baseVolume: 30, baseSpread: 395, baseLeverage: 5.3, baseDealCount: 24, baseDefault: 2.5 },
  { sector: 'Telecom & Media', baseVolume: 28, baseSpread: 355, baseLeverage: 5.0, baseDealCount: 20, baseDefault: 2.0 },
  { sector: 'Energy', baseVolume: 22, baseSpread: 410, baseLeverage: 4.5, baseDealCount: 16, baseDefault: 3.2 },
  { sector: 'Financial Services', baseVolume: 18, baseSpread: 330, baseLeverage: 4.2, baseDealCount: 14, baseDefault: 0.8 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-syndicated-loans'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Summary
  const summary = {
    newDealVolYTD: Math.round(jitter(320, 0.08) * 10) / 10,
    avgSpread: Math.round(jitter(385, 0.06)),
    avgBid: Math.round(jitter(97.2, 0.01) * 100) / 100,
    leveragedVolYTD: Math.round(jitter(210, 0.08) * 10) / 10,
    defaultRate: Math.round(jitter(1.8, 0.15) * 100) / 100,
  };

  // Pipeline (10 new deals)
  const facilities = ['Term Loan B', 'Term Loan B', 'Revolver', 'Delayed Draw', 'Term Loan B', 'Term Loan B'];
  const statuses = ['Launched', 'Committed', 'Flexed', 'Closed'];
  const ratings = ['B', 'B+', 'BB-', 'BB', 'B', 'B+'];

  const shuffled = [...BORROWERS_PIPELINE].sort(() => rng() - 0.5);
  const pipeline = shuffled.slice(0, 10).map(b => {
    const spread = Math.round(350 + rng() * 100);
    const size = Math.round(500 + rng() * 4500);
    const tenor = Math.round((5 + rng() * 3) * 10) / 10;
    const leverage = Math.round((4.0 + rng() * 3.0) * 10) / 10;
    const facility = facilities[Math.floor(rng() * facilities.length)];
    const status = statuses[Math.floor(rng() * statuses.length)];
    const rating = ratings[Math.floor(rng() * ratings.length)];
    return {
      borrower: b.borrower,
      sponsor: b.sponsor,
      facility,
      size,
      spread,
      tenor,
      leverage,
      sector: b.sector,
      status,
      rating,
    };
  });

  // Secondary Trading (12 actively traded loans)
  const secondaryTrading = SECONDARY_LOANS.map(l => {
    const bid = Math.round(jitter(l.baseBid, 0.015) * 100) / 100;
    const bidAskSpread = Math.round((0.125 + rng() * 0.5) * 1000) / 1000;
    const ask = Math.round((bid + bidAskSpread) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * 0.6 * 100) / 100;
    const change1w = Math.round((rng() - 0.48) * 1.2 * 100) / 100;
    const spread = Math.round(jitter(l.baseSpread, 0.08));
    return {
      borrower: l.borrower,
      bid,
      ask,
      bidAskSpread: Math.round((ask - bid) * 1000) / 1000,
      change1d,
      change1w,
      spread,
      rating: l.rating,
      sector: l.sector,
    };
  });

  // Leverage Stats by rating (4 categories)
  const leverageStats = [
    { rating: 'BB', baseAvgLeverage: 4.2, baseAvgSpread: 275, baseAvgBid: 99.3, baseAvgRecovery: 72, baseCount: 85 },
    { rating: 'B+', baseAvgLeverage: 5.0, baseAvgSpread: 340, baseAvgBid: 98.0, baseAvgRecovery: 65, baseCount: 120 },
    { rating: 'B', baseAvgLeverage: 5.8, baseAvgSpread: 400, baseAvgBid: 96.0, baseAvgRecovery: 58, baseCount: 145 },
    { rating: 'CCC', baseAvgLeverage: 6.8, baseAvgSpread: 550, baseAvgBid: 88.5, baseAvgRecovery: 42, baseCount: 35 },
  ].map(ls => ({
    rating: ls.rating,
    avgLeverage: Math.round(jitter(ls.baseAvgLeverage, 0.06) * 10) / 10,
    avgSpread: Math.round(jitter(ls.baseAvgSpread, 0.05)),
    avgBid: Math.round(jitter(ls.baseAvgBid, 0.01) * 100) / 100,
    avgRecovery: Math.round(jitter(ls.baseAvgRecovery, 0.05) * 10) / 10,
    count: Math.round(jitter(ls.baseCount, 0.1)),
  }));

  // Sector Breakdown (8 sectors)
  const sectorBreakdown = SECTORS.map(s => ({
    sector: s.sector,
    volumeYTD: Math.round(jitter(s.baseVolume, 0.1) * 10) / 10,
    avgSpread: Math.round(jitter(s.baseSpread, 0.06)),
    avgLeverage: Math.round(jitter(s.baseLeverage, 0.06) * 10) / 10,
    dealCount: Math.round(jitter(s.baseDealCount, 0.1)),
    defaultRate: Math.round(jitter(s.baseDefault, 0.15) * 100) / 100,
  }));

  return { summary, pipeline, secondaryTrading, leverageStats, sectorBreakdown, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[SyndicatedLoans] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate syndicated loan data' });
  }
});

export default router;
