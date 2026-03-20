import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

// ── Types ──

interface CPRate {
  issuerType: string;
  overnight: number;
  oneWeek: number;
  twoWeek: number;
  oneMonth: number;
  twoMonth: number;
  threeMonth: number;
}

interface CPIssuance {
  issuer: string;
  amountMillions: number;
  maturityDays: number;
  rate: number;
  rating: string;
  date: string;
}

interface CPOutstanding {
  category: string;
  amountBillions: number;
  weekOverWeekChangeBillions: number;
}

interface CPSpread {
  tenor: string;
  currentBps: number;
  oneDayChangeBps: number;
  oneWeekChangeBps: number;
}

interface TopIssuer {
  name: string;
  outstandingBillions: number;
  avgRate: number;
  rating: string;
}

interface CommercialPaperResponse {
  timestamp: string;
  rates: CPRate[];
  issuance: CPIssuance[];
  outstanding: CPOutstanding[];
  spreads: CPSpread[];
  topIssuers: TopIssuer[];
}

// ── Cache ──

let cache: { data: CommercialPaperResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Data Generation ──

function generate(): CommercialPaperResponse {
  const rng = seededRandom('commercial-paper');

  // ── 1. CP Rates by Issuer Type ──

  const issuerTypes = [
    { type: 'AA Financial',      baseON: 4.80, slope: 0.08 },
    { type: 'A2/P2 Financial',   baseON: 5.15, slope: 0.10 },
    { type: 'AA Non-Financial',  baseON: 4.75, slope: 0.07 },
    { type: 'A2/P2 Non-Financial', baseON: 5.10, slope: 0.09 },
    { type: 'Asset-Backed',      baseON: 4.85, slope: 0.06 },
  ];

  const rates: CPRate[] = issuerTypes.map(it => {
    const on = round(jitter(rng, it.baseON, 0.15), 3);
    return {
      issuerType: it.type,
      overnight: on,
      oneWeek: round(on + it.slope * 1 + jitter(rng, 0, 0.03), 3),
      twoWeek: round(on + it.slope * 2 + jitter(rng, 0, 0.04), 3),
      oneMonth: round(on + it.slope * 3 + jitter(rng, 0, 0.05), 3),
      twoMonth: round(on + it.slope * 5 + jitter(rng, 0, 0.06), 3),
      threeMonth: round(on + it.slope * 7 + jitter(rng, 0, 0.08), 3),
    };
  });

  // ── 2. Recent CP Issuance ──

  const issuerPool = [
    { name: 'JPMorgan Chase',           rating: 'A-1+' },
    { name: 'Bank of America',          rating: 'A-1+' },
    { name: 'Citigroup',                rating: 'A-1' },
    { name: 'Goldman Sachs',            rating: 'A-1' },
    { name: 'Wells Fargo',              rating: 'A-1+' },
    { name: 'Morgan Stanley',           rating: 'A-1' },
    { name: 'Toyota Motor Credit',      rating: 'A-1+' },
    { name: 'General Electric Capital', rating: 'A-1' },
    { name: 'Apple Inc.',               rating: 'A-1+' },
    { name: 'Microsoft Corp.',          rating: 'A-1+' },
    { name: 'Johnson & Johnson',        rating: 'A-1+' },
    { name: 'Procter & Gamble',         rating: 'A-1+' },
    { name: 'UBS Group',                rating: 'A-1' },
    { name: 'Deutsche Bank AG',         rating: 'A-2' },
    { name: 'Barclays PLC',             rating: 'A-1' },
    { name: 'HSBC Holdings',            rating: 'A-1+' },
    { name: 'BNP Paribas',              rating: 'A-1' },
    { name: 'Credit Agricole',          rating: 'A-1' },
    { name: 'Rabobank',                 rating: 'A-1+' },
    { name: 'Caterpillar Financial',    rating: 'A-2' },
  ];

  const maturityOptions = [1, 7, 14, 30, 60, 90, 120, 180, 270];
  const today = new Date();

  const issuance: CPIssuance[] = [];
  for (let i = 0; i < 15; i++) {
    const issuerIdx = Math.floor(rng() * issuerPool.length);
    const issuer = issuerPool[issuerIdx];
    const maturityDays = maturityOptions[Math.floor(rng() * maturityOptions.length)];

    // Amount between $100M and $5B, clustered around $500M-$2B
    const amountMillions = round(100 + rng() * 4900, 0);

    // Rate depends on maturity - longer maturity = higher rate
    const baseRate = 4.60 + (maturityDays / 270) * 0.80;
    const rate = round(jitter(rng, baseRate, 0.20), 3);

    // Date within last 5 business days
    const daysAgo = Math.floor(rng() * 5);
    const issueDate = new Date(today);
    issueDate.setDate(issueDate.getDate() - daysAgo);

    issuance.push({
      issuer: issuer.name,
      amountMillions,
      maturityDays,
      rate,
      rating: issuer.rating,
      date: issueDate.toISOString().slice(0, 10),
    });
  }

  // Sort by date descending, then by amount descending
  issuance.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.amountMillions - a.amountMillions;
  });

  // ── 3. Outstanding CP by Category ──

  const outstandingCategories = [
    { category: 'Financial',     base: 380 },
    { category: 'Non-Financial', base: 280 },
    { category: 'Asset-Backed',  base: 350 },
    { category: 'Foreign',       base: 220 },
  ];

  const outstanding: CPOutstanding[] = outstandingCategories.map(c => {
    const amount = round(jitter(rng, c.base, 80), 1);
    const wowChange = round(jitter(rng, 0, 12), 1);
    return {
      category: c.category,
      amountBillions: amount,
      weekOverWeekChangeBillions: wowChange,
    };
  });

  // ── 4. CP-OIS Spreads ──

  const spreadTenors = [
    { tenor: '1M', baseBps: 15 },
    { tenor: '2M', baseBps: 22 },
    { tenor: '3M', baseBps: 30 },
  ];

  const spreads: CPSpread[] = spreadTenors.map(s => {
    const current = round(jitter(rng, s.baseBps, 12), 1);
    return {
      tenor: s.tenor,
      currentBps: current,
      oneDayChangeBps: round(jitter(rng, 0, 2.5), 1),
      oneWeekChangeBps: round(jitter(rng, 0, 5), 1),
    };
  });

  // ── 5. Top CP Issuers ──

  const topIssuerData = [
    { name: 'JPMorgan Chase',      base: 85,  rateBase: 4.82, rating: 'A-1+' },
    { name: 'Bank of America',     base: 72,  rateBase: 4.85, rating: 'A-1+' },
    { name: 'Citigroup',           base: 65,  rateBase: 4.92, rating: 'A-1' },
    { name: 'Toyota Motor Credit', base: 48,  rateBase: 4.78, rating: 'A-1+' },
    { name: 'Wells Fargo',         base: 55,  rateBase: 4.88, rating: 'A-1+' },
    { name: 'Goldman Sachs',       base: 42,  rateBase: 4.95, rating: 'A-1' },
    { name: 'Apple Inc.',          base: 38,  rateBase: 4.72, rating: 'A-1+' },
    { name: 'HSBC Holdings',       base: 35,  rateBase: 4.90, rating: 'A-1+' },
    { name: 'Microsoft Corp.',     base: 30,  rateBase: 4.70, rating: 'A-1+' },
    { name: 'BNP Paribas',         base: 28,  rateBase: 4.93, rating: 'A-1' },
  ];

  const topIssuers: TopIssuer[] = topIssuerData.map(t => ({
    name: t.name,
    outstandingBillions: round(jitter(rng, t.base, 10), 1),
    avgRate: round(jitter(rng, t.rateBase, 0.10), 3),
    rating: t.rating,
  }));

  // Sort by outstanding descending
  topIssuers.sort((a, b) => b.outstandingBillions - a.outstandingBillions);

  return {
    timestamp: new Date().toISOString(),
    rates,
    issuance,
    outstanding,
    spreads,
    topIssuers,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();

    cache = { data, expiresAt: now + CACHE_TTL };
    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CommercialPaper] Error:', message);

    // Stale fallback
    if (cache.data) {
      return res.json(cache.data);
    }

    return res.status(500).json({ error: 'Failed to generate commercial paper data' });
  }
});

export default router;
