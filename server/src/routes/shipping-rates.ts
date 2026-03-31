import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const DRY_BULK_VESSELS = [
  { type: 'Capesize', route: 'Brazil-China', baseRate: 22000, baseTcAvg4: 21500 },
  { type: 'Panamax', route: 'Continent-FE', baseRate: 14500, baseTcAvg4: 14200 },
  { type: 'Supramax', route: 'Indo-China', baseRate: 12800, baseTcAvg4: 12500 },
  { type: 'Handysize', route: 'NOPAC-Japan', baseRate: 9500, baseTcAvg4: 9200 },
  { type: 'VLOC', route: 'W.Australia-China', baseRate: 28000, baseTcAvg4: 27200 },
  { type: 'Kamsarmax', route: 'USG-Continent', baseRate: 15200, baseTcAvg4: 14900 },
];

const TANKER_ROUTES = [
  { route: 'MEG-China VLCC', type: 'VLCC', baseWs: 62, baseTce: 38000 },
  { route: 'WAF-USG Suezmax', type: 'Suezmax', baseWs: 85, baseTce: 32000 },
  { route: 'N.Sea-UKC Aframax', type: 'Aframax', baseWs: 115, baseTce: 28500 },
  { route: 'MEG-Japan MR', type: 'MR', baseWs: 175, baseTce: 22000 },
  { route: 'USG-Continent LR2', type: 'LR2', baseWs: 130, baseTce: 30500 },
  { route: 'Baltic-UKC Handymax', type: 'Handymax', baseWs: 155, baseTce: 18500 },
];

const CONTAINER_ROUTE_DATA = [
  { route: 'Shanghai-Rotterdam', baseTeu20: 2800, baseTeu40: 4900, carrier: 'Maersk/MSC' },
  { route: 'Shanghai-LA', baseTeu20: 2400, baseTeu40: 4200, carrier: 'COSCO/Evergreen' },
  { route: 'Shanghai-NY', baseTeu20: 3200, baseTeu40: 5600, carrier: 'Hapag-Lloyd/ONE' },
  { route: 'Ningbo-Santos', baseTeu20: 3600, baseTeu40: 6200, carrier: 'MSC/ZIM' },
  { route: 'Busan-Rotterdam', baseTeu20: 2200, baseTeu40: 3800, carrier: 'HMM/Maersk' },
  { route: 'Shanghai-Dubai', baseTeu20: 1600, baseTeu40: 2800, carrier: 'OOCL/CMA CGM' },
];

const PORT_DATA = [
  { port: 'Shanghai', country: 'China', baseVessels: 42, baseWait: 2.1, category: 'container' as const },
  { port: 'Singapore', country: 'Singapore', baseVessels: 55, baseWait: 1.8, category: 'container' as const },
  { port: 'Rotterdam', country: 'Netherlands', baseVessels: 28, baseWait: 1.5, category: 'container' as const },
  { port: 'Fujairah', country: 'UAE', baseVessels: 38, baseWait: 3.2, category: 'tanker' as const },
  { port: 'Tubarao', country: 'Brazil', baseVessels: 22, baseWait: 4.5, category: 'bulk' as const },
  { port: 'Port Hedland', country: 'Australia', baseVessels: 30, baseWait: 3.8, category: 'bulk' as const },
  { port: 'Houston', country: 'USA', baseVessels: 35, baseWait: 2.6, category: 'tanker' as const },
  { port: 'Busan', country: 'South Korea', baseVessels: 25, baseWait: 1.4, category: 'container' as const },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-shipping-rates'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Summary indices
  const bdiIndex = Math.round(jitter(1750, 0.15));
  const bdtiIndex = Math.round(jitter(950, 0.14));
  const bctiIndex = Math.round(jitter(680, 0.13));
  const change1d = Math.round((rng() - 0.5) * 80);
  const avgFreightCost = Math.round(jitter(16500, 0.12));

  const summary = { bdiIndex, bdtiIndex, bctiIndex, change1d, avgFreightCost };

  // Dry bulk vessel rates
  const dryBulk = DRY_BULK_VESSELS.map(v => {
    const rate = Math.round(jitter(v.baseRate, 0.15));
    const change1dPct = Math.round((rng() - 0.5) * 8 * 100) / 100;
    const change1wPct = Math.round((rng() - 0.48) * 14 * 100) / 100;
    const tcAvg4 = Math.round(jitter(v.baseTcAvg4, 0.12));
    return { type: v.type, route: v.route, rate, change1d: change1dPct, change1w: change1wPct, tcAvg4 };
  });

  // Tanker routes
  const tanker = TANKER_ROUTES.map(t => {
    const worldscale = Math.round(jitter(t.baseWs, 0.14) * 10) / 10;
    const tceRate = Math.round(jitter(t.baseTce, 0.16));
    const change1dPct = Math.round((rng() - 0.5) * 6 * 100) / 100;
    const change1wPct = Math.round((rng() - 0.48) * 12 * 100) / 100;
    return { route: t.route, type: t.type, worldscale, tceRate, change1d: change1dPct, change1w: change1wPct };
  });

  // Container rates
  const containerRates = CONTAINER_ROUTE_DATA.map(c => {
    const teu20ft = Math.round(jitter(c.baseTeu20, 0.18));
    const teu40ft = Math.round(jitter(c.baseTeu40, 0.18));
    const change1wPct = Math.round((rng() - 0.48) * 10 * 100) / 100;
    const change1mPct = Math.round((rng() - 0.45) * 20 * 100) / 100;
    return { route: c.route, teu20ft, teu40ft, change1w: change1wPct, change1m: change1mPct, carrier: c.carrier };
  });

  // Port congestion
  const portCongestion = PORT_DATA.map(p => {
    const vessels = Math.round(jitter(p.baseVessels, 0.25));
    const avgWaitDays = Math.round(jitter(p.baseWait, 0.3) * 10) / 10;
    const change1wPct = Math.round((rng() - 0.48) * 15 * 100) / 100;
    return { port: p.port, country: p.country, vessels, avgWaitDays, change1w: change1wPct, category: p.category };
  });

  return { summary, dryBulk, tanker, containerRates, portCongestion, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ShippingRates] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate shipping rates data' });
  }
});

export default router;
