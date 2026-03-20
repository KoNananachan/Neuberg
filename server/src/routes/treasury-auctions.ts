import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const COUNTRIES = [
  { id: 'US', name: 'United States', currency: 'USD', tenors: ['4W', '8W', '13W', '26W', '52W', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'] },
  { id: 'DE', name: 'Germany', currency: 'EUR', tenors: ['6M', '2Y', '5Y', '10Y', '30Y'] },
  { id: 'UK', name: 'United Kingdom', currency: 'GBP', tenors: ['1M', '3M', '6M', '5Y', '10Y', '30Y'] },
  { id: 'JP', name: 'Japan', currency: 'JPY', tenors: ['3M', '6M', '2Y', '5Y', '10Y', '20Y', '30Y', '40Y'] },
  { id: 'FR', name: 'France', currency: 'EUR', tenors: ['3M', '6M', '2Y', '5Y', '10Y', '30Y', '50Y'] },
  { id: 'IT', name: 'Italy', currency: 'EUR', tenors: ['6M', '3Y', '5Y', '7Y', '10Y', '15Y', '30Y'] },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-treasury-auctions'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const recentAuctions: any[] = [];
  const upcomingAuctions: any[] = [];

  for (const country of COUNTRIES) {
    const numRecent = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < numRecent; i++) {
      const tenor = country.tenors[Math.floor(rng() * country.tenors.length)];
      const daysAgo = Math.floor(rng() * 14);
      const auctionDate = new Date();
      auctionDate.setDate(auctionDate.getDate() - daysAgo);
      const highYield = Math.round((0.5 + rng() * 5) * 1000) / 1000;
      const bidTocover = Math.round((1.8 + rng() * 2) * 100) / 100;
      const tailBps = Math.round((rng() - 0.4) * 3 * 10) / 10;
      const allotmentPct = Math.round((15 + rng() * 50) * 10) / 10;
      const size = Math.round(jitter(country.id === 'US' ? 40000 : country.id === 'JP' ? 2500000 : 8000, 0.2));
      const indirectPct = Math.round((55 + rng() * 25) * 10) / 10;
      const directPct = Math.round((10 + rng() * 15) * 10) / 10;
      const primaryDealerPct = Math.round((100 - indirectPct - directPct) * 10) / 10;
      const whenIssuedYield = Math.round((highYield + (rng() - 0.5) * 0.03) * 1000) / 1000;

      recentAuctions.push({
        country: country.id, countryName: country.name, currency: country.currency,
        tenor, date: auctionDate.toISOString().slice(0, 10),
        size, highYield, bidTocover, tailBps, allotmentPct, whenIssuedYield,
        breakdown: { indirect: indirectPct, direct: directPct, primaryDealer: primaryDealerPct },
        status: 'Settled',
      });
    }

    const numUpcoming = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < numUpcoming; i++) {
      const tenor = country.tenors[Math.floor(rng() * country.tenors.length)];
      const daysAhead = 1 + Math.floor(rng() * 10);
      const auctionDate = new Date();
      auctionDate.setDate(auctionDate.getDate() + daysAhead);
      const expectedSize = Math.round(jitter(country.id === 'US' ? 42000 : country.id === 'JP' ? 2600000 : 8500, 0.15));
      const whenIssuedYield = Math.round((0.5 + rng() * 5) * 1000) / 1000;

      upcomingAuctions.push({
        country: country.id, countryName: country.name, currency: country.currency,
        tenor, date: auctionDate.toISOString().slice(0, 10),
        expectedSize, whenIssuedYield,
        status: 'Scheduled',
      });
    }
  }

  recentAuctions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  upcomingAuctions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const countryStats = COUNTRIES.map(c => {
    const cAuctions = recentAuctions.filter(a => a.country === c.id);
    return {
      country: c.id, name: c.name,
      avgBidToCover: cAuctions.length ? Math.round(cAuctions.reduce((a, b) => a + b.bidTocover, 0) / cAuctions.length * 100) / 100 : 0,
      avgTail: cAuctions.length ? Math.round(cAuctions.reduce((a, b) => a + b.tailBps, 0) / cAuctions.length * 10) / 10 : 0,
      recentCount: cAuctions.length,
      upcomingCount: upcomingAuctions.filter(a => a.country === c.id).length,
      totalIssuance: cAuctions.reduce((a, b) => a + b.size, 0),
    };
  });

  return { recentAuctions, upcomingAuctions, countryStats, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TreasuryAuctions] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate treasury auction data' });
  }
});

export default router;
