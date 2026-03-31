import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const REITS = [
  { ticker: 'PLD', name: 'Prologis', type: 'Industrial', baseNAV: 135, baseFFO: 5.4, baseDiv: 3.2 },
  { ticker: 'AMT', name: 'American Tower', type: 'Cell Tower', baseNAV: 220, baseFFO: 10.2, baseDiv: 3.1 },
  { ticker: 'EQIX', name: 'Equinix', type: 'Data Center', baseNAV: 850, baseFFO: 34.0, baseDiv: 2.0 },
  { ticker: 'SPG', name: 'Simon Property', type: 'Retail', baseNAV: 145, baseFFO: 12.0, baseDiv: 5.5 },
  { ticker: 'O', name: 'Realty Income', type: 'Net Lease', baseNAV: 60, baseFFO: 4.0, baseDiv: 5.0 },
  { ticker: 'WELL', name: 'Welltower', type: 'Healthcare', baseNAV: 95, baseFFO: 3.8, baseDiv: 2.8 },
  { ticker: 'DLR', name: 'Digital Realty', type: 'Data Center', baseNAV: 145, baseFFO: 6.8, baseDiv: 3.4 },
  { ticker: 'PSA', name: 'Public Storage', type: 'Self Storage', baseNAV: 310, baseFFO: 16.5, baseDiv: 4.0 },
  { ticker: 'AVB', name: 'AvalonBay', type: 'Residential', baseNAV: 210, baseFFO: 10.5, baseDiv: 3.3 },
  { ticker: 'EQR', name: 'Equity Residential', type: 'Residential', baseNAV: 72, baseFFO: 3.8, baseDiv: 3.8 },
  { ticker: 'VTR', name: 'Ventas', type: 'Healthcare', baseNAV: 52, baseFFO: 3.1, baseDiv: 3.5 },
  { ticker: 'ARE', name: 'Alexandria RE', type: 'Life Science', baseNAV: 130, baseFFO: 8.5, baseDiv: 3.6 },
  { ticker: 'BXP', name: 'Boston Properties', type: 'Office', baseNAV: 75, baseFFO: 7.2, baseDiv: 5.8 },
  { ticker: 'HST', name: 'Host Hotels', type: 'Hotel', baseNAV: 20, baseFFO: 1.8, baseDiv: 3.0 },
  { ticker: 'INVH', name: 'Invitation Homes', type: 'Single Family', baseNAV: 36, baseFFO: 1.7, baseDiv: 2.9 },
  { ticker: 'SBAC', name: 'SBA Communications', type: 'Cell Tower', baseNAV: 250, baseFFO: 12.5, baseDiv: 1.8 },
  { ticker: 'WPC', name: 'W.P. Carey', type: 'Diversified', baseNAV: 62, baseFFO: 5.2, baseDiv: 5.6 },
  { ticker: 'ESS', name: 'Essex Property', type: 'Residential', baseNAV: 280, baseFFO: 15.0, baseDiv: 3.5 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-reit-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const reits = REITS.map(r => {
    const nav = Math.round(jitter(r.baseNAV, 0.04) * 100) / 100;
    const price = Math.round(nav * (0.82 + rng() * 0.3) * 100) / 100;
    const premDisc = Math.round((price / nav - 1) * 100 * 10) / 10;
    const ffoPerShare = Math.round(jitter(r.baseFFO, 0.06) * 100) / 100;
    const ffoYield = Math.round((ffoPerShare / price) * 100 * 100) / 100;
    const divYield = Math.round(jitter(r.baseDiv, 0.08) * 100) / 100;
    const payoutRatio = Math.round((divYield * price / ffoPerShare) * 100 * 10) / 10;
    const debtToEquity = Math.round((0.4 + rng() * 0.8) * 100) / 100;
    const occupancy = Math.round((85 + rng() * 13) * 10) / 10;
    const capRate = Math.round((3.5 + rng() * 4) * 100) / 100;
    const totalReturn1y = Math.round((rng() * 30 - 8) * 100) / 100;
    const marketCap = Math.round(price * (200 + rng() * 800) * 10) / 10;
    const spread10y = Math.round((divYield - 4.2 + (rng() - 0.5)) * 100) / 100;

    return {
      ticker: r.ticker, name: r.name, type: r.type,
      price, nav, premDisc, ffoPerShare, ffoYield, divYield,
      payoutRatio, debtToEquity, occupancy, capRate,
      totalReturn1y, marketCap, spread10y,
    };
  });

  const typeAverages = [...new Set(REITS.map(r => r.type))].map(type => {
    const typeReits = reits.filter(r => r.type === type);
    return {
      type, count: typeReits.length,
      avgPremDisc: Math.round(typeReits.reduce((a, r) => a + r.premDisc, 0) / typeReits.length * 10) / 10,
      avgFFOYield: Math.round(typeReits.reduce((a, r) => a + r.ffoYield, 0) / typeReits.length * 100) / 100,
      avgDivYield: Math.round(typeReits.reduce((a, r) => a + r.divYield, 0) / typeReits.length * 100) / 100,
      avgOccupancy: Math.round(typeReits.reduce((a, r) => a + r.occupancy, 0) / typeReits.length * 10) / 10,
      avgCapRate: Math.round(typeReits.reduce((a, r) => a + r.capRate, 0) / typeReits.length * 100) / 100,
      totalMarketCap: Math.round(typeReits.reduce((a, r) => a + r.marketCap, 0) * 10) / 10,
    };
  }).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  const summary = {
    totalReits: reits.length,
    totalMarketCap: Math.round(reits.reduce((a, r) => a + r.marketCap, 0) / 1000 * 10) / 10,
    avgDivYield: Math.round(reits.reduce((a, r) => a + r.divYield, 0) / reits.length * 100) / 100,
    avgPremDisc: Math.round(reits.reduce((a, r) => a + r.premDisc, 0) / reits.length * 10) / 10,
    avgFFOYield: Math.round(reits.reduce((a, r) => a + r.ffoYield, 0) / reits.length * 100) / 100,
    treasury10y: Math.round(jitter(4.2, 0.03) * 100) / 100,
  };

  return { reits, typeAverages, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[REITMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate REIT data' });
  }
});

export default router;
