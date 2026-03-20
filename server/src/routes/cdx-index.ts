import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

const CDX_INDICES = [
  { id: 'CDX.NA.IG', name: 'CDX NA Investment Grade', series: 43, tenor: '5Y', baseSpread: 52, members: 125, region: 'North America' },
  { id: 'CDX.NA.HY', name: 'CDX NA High Yield', series: 43, tenor: '5Y', baseSpread: 380, members: 100, region: 'North America' },
  { id: 'CDX.NA.IG.10Y', name: 'CDX NA IG 10Y', series: 43, tenor: '10Y', baseSpread: 75, members: 125, region: 'North America' },
  { id: 'CDX.EM', name: 'CDX Emerging Markets', series: 42, tenor: '5Y', baseSpread: 195, members: 20, region: 'Emerging Markets' },
  { id: 'ITRAXX.EUR.IG', name: 'iTraxx Europe IG', series: 42, tenor: '5Y', baseSpread: 58, members: 125, region: 'Europe' },
  { id: 'ITRAXX.EUR.XO', name: 'iTraxx Europe Crossover', series: 42, tenor: '5Y', baseSpread: 310, members: 50, region: 'Europe' },
  { id: 'ITRAXX.EUR.SNR', name: 'iTraxx Europe Senior Fin', series: 42, tenor: '5Y', baseSpread: 65, members: 30, region: 'Europe' },
  { id: 'ITRAXX.EUR.SUB', name: 'iTraxx Europe Sub Fin', series: 42, tenor: '5Y', baseSpread: 120, members: 30, region: 'Europe' },
  { id: 'ITRAXX.ASIA', name: 'iTraxx Asia ex-Japan IG', series: 42, tenor: '5Y', baseSpread: 85, members: 40, region: 'Asia' },
  { id: 'ITRAXX.JPN', name: 'iTraxx Japan IG', series: 42, tenor: '5Y', baseSpread: 48, members: 50, region: 'Asia' },
];

const TRANCHES = [
  { name: '0-3%', baseSpread: 500, attachment: 0, detachment: 3 },
  { name: '3-7%', baseSpread: 180, attachment: 3, detachment: 7 },
  { name: '7-10%', baseSpread: 45, attachment: 7, detachment: 10 },
  { name: '10-15%', baseSpread: 18, attachment: 10, detachment: 15 },
  { name: '15-30%', baseSpread: 8, attachment: 15, detachment: 30 },
  { name: '30-100%', baseSpread: 2, attachment: 30, detachment: 100 },
];

const TOP_MOVERS_NAMES = [
  { ticker: 'T', name: 'AT&T', sector: 'Telecom' },
  { ticker: 'F', name: 'Ford Motor', sector: 'Auto' },
  { ticker: 'GM', name: 'General Motors', sector: 'Auto' },
  { ticker: 'CCL', name: 'Carnival Corp', sector: 'Leisure' },
  { ticker: 'DAL', name: 'Delta Air Lines', sector: 'Airlines' },
  { ticker: 'BA', name: 'Boeing', sector: 'Aerospace' },
  { ticker: 'NFLX', name: 'Netflix', sector: 'Media' },
  { ticker: 'HCA', name: 'HCA Healthcare', sector: 'Healthcare' },
  { ticker: 'NUE', name: 'Nucor', sector: 'Materials' },
  { ticker: 'FCX', name: 'Freeport-McMoRan', sector: 'Mining' },
  { ticker: 'HAL', name: 'Halliburton', sector: 'Energy' },
  { ticker: 'AIG', name: 'AIG', sector: 'Insurance' },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-cdx-index'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const indices = CDX_INDICES.map(idx => {
    const spread = Math.round(jitter(idx.baseSpread, 0.08));
    const change1d = Math.round((rng() - 0.5) * idx.baseSpread * 0.04);
    const change1w = Math.round((rng() - 0.5) * idx.baseSpread * 0.08);
    const change1m = Math.round((rng() - 0.5) * idx.baseSpread * 0.12);
    const price = Math.round((100 - spread * 0.04) * 1000) / 1000;
    const impliedProb = Math.round(spread / 10000 * 5 * 100 * 100) / 100;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        spread: Math.round(jitter(idx.baseSpread, 0.06)),
      };
    });

    const tranches = idx.id.includes('IG') && !idx.id.includes('10Y') ? TRANCHES.map(tr => ({
      name: tr.name,
      attachment: tr.attachment,
      detachment: tr.detachment,
      spread: Math.round(jitter(tr.baseSpread, 0.1)),
      upfrontPct: tr.attachment === 0 ? Math.round((20 + rng() * 40) * 100) / 100 : 0,
      change1d: Math.round((rng() - 0.5) * tr.baseSpread * 0.05),
    })) : undefined;

    return {
      id: idx.id, name: idx.name, series: idx.series, tenor: idx.tenor,
      region: idx.region, members: idx.members,
      spread, price, change1d, change1w, change1m, impliedProb,
      history, tranches,
    };
  });

  const topMovers = TOP_MOVERS_NAMES.map(m => {
    const cdsSpread = Math.round(50 + rng() * 400);
    const change = Math.round((rng() - 0.5) * 40);
    return {
      ticker: m.ticker, name: m.name, sector: m.sector,
      cdsSpread, change1d: change,
      changePct: Math.round(change / cdsSpread * 100 * 10) / 10,
      rating: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'][Math.floor(rng() * 6)],
      impliedRating: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'][Math.floor(rng() * 6)],
    };
  }).sort((a, b) => Math.abs(b.change1d) - Math.abs(a.change1d));

  const basisTrades = [
    { index: 'CDX.NA.IG', indexSpread: indices[0].spread, intrinsicSpread: indices[0].spread + Math.round((rng() - 0.5) * 8), basis: 0 },
    { index: 'CDX.NA.HY', indexSpread: indices[1].spread, intrinsicSpread: indices[1].spread + Math.round((rng() - 0.5) * 20), basis: 0 },
    { index: 'ITRAXX.EUR.IG', indexSpread: indices[4].spread, intrinsicSpread: indices[4].spread + Math.round((rng() - 0.5) * 6), basis: 0 },
    { index: 'ITRAXX.EUR.XO', indexSpread: indices[5].spread, intrinsicSpread: indices[5].spread + Math.round((rng() - 0.5) * 15), basis: 0 },
  ];
  for (const bt of basisTrades) bt.basis = bt.indexSpread - bt.intrinsicSpread;

  return { indices, topMovers, basisTrades, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CDXIndex] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate CDX index data' });
  }
});

export default router;
