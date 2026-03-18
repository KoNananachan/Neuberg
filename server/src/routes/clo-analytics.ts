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

const CLO_DEALS = [
  { id: 'ARES-CLO-2024-1', manager: 'Ares Management', vintage: 2024, size: 500, baseWAL: 5.2 },
  { id: 'BAIN-CLO-2024-2', manager: 'Bain Capital Credit', vintage: 2024, size: 450, baseWAL: 5.0 },
  { id: 'CARL-CLO-2023-3', manager: 'Carlyle Group', vintage: 2023, size: 520, baseWAL: 4.5 },
  { id: 'APOL-CLO-2024-1', manager: 'Apollo Global', vintage: 2024, size: 600, baseWAL: 5.4 },
  { id: 'BLKR-CLO-2023-2', manager: 'Blackrock', vintage: 2023, size: 480, baseWAL: 4.2 },
  { id: 'GSAM-CLO-2024-1', manager: 'Goldman Sachs AM', vintage: 2024, size: 550, baseWAL: 5.1 },
  { id: 'PGIM-CLO-2023-4', manager: 'PGIM', vintage: 2023, size: 400, baseWAL: 4.0 },
  { id: 'OAK-CLO-2024-2', manager: 'Oaktree Capital', vintage: 2024, size: 420, baseWAL: 5.3 },
  { id: 'CSFB-CLO-2023-1', manager: 'Credit Suisse AM', vintage: 2023, size: 380, baseWAL: 3.8 },
  { id: 'KKR-CLO-2024-3', manager: 'KKR Credit', vintage: 2024, size: 650, baseWAL: 5.5 },
];

const TRANCHE_TEMPLATE = [
  { name: 'AAA', rating: 'AAA', pctOfDeal: 62, baseSpread: 130, subordination: 38 },
  { name: 'AA', rating: 'AA', pctOfDeal: 12, baseSpread: 185, subordination: 26 },
  { name: 'A', rating: 'A', pctOfDeal: 7, baseSpread: 240, subordination: 19 },
  { name: 'BBB', rating: 'BBB', pctOfDeal: 5, baseSpread: 350, subordination: 14 },
  { name: 'BB', rating: 'BB', pctOfDeal: 4, baseSpread: 600, subordination: 10 },
  { name: 'Equity', rating: 'NR', pctOfDeal: 10, baseSpread: 0, subordination: 0 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-clo-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const deals = CLO_DEALS.map(deal => {
    const wal = Math.round(jitter(deal.baseWAL, 0.08) * 100) / 100;
    const collateralBalance = Math.round(jitter(deal.size, 0.03) * 1e6);
    const numLoans = 150 + Math.floor(rng() * 100);
    const warf = Math.round(2600 + rng() * 400);
    const diversityScore = Math.round(50 + rng() * 30);
    const cccBucket = Math.round((3 + rng() * 8) * 10) / 10;
    const defaultRate = Math.round((0.5 + rng() * 2.5) * 100) / 100;
    const recoveryRate = Math.round((55 + rng() * 20) * 100) / 100;
    const ocRatioAAA = Math.round((125 + rng() * 15) * 100) / 100;
    const ocRatioAA = Math.round((115 + rng() * 10) * 100) / 100;
    const icRatio = Math.round((130 + rng() * 30) * 100) / 100;
    const reinvestEndDate = new Date();
    reinvestEndDate.setFullYear(reinvestEndDate.getFullYear() + Math.floor(1 + rng() * 3));

    const tranches = TRANCHE_TEMPLATE.map(t => {
      const spread = t.name === 'Equity' ? 0 : Math.round(jitter(t.baseSpread, 0.1));
      const notional = Math.round(collateralBalance * t.pctOfDeal / 100);
      const price = t.name === 'Equity'
        ? Math.round((70 + rng() * 25) * 100) / 100
        : Math.round((97 + rng() * 5) * 1000) / 1000;
      const yieldVal = t.name === 'Equity'
        ? Math.round((12 + rng() * 8) * 100) / 100
        : Math.round((5.3 + spread / 10000 * 100) * 1000) / 1000;

      return {
        name: t.name, rating: t.rating, pctOfDeal: t.pctOfDeal,
        notional, spread, price, yield: yieldVal,
        subordination: t.subordination,
        wal: t.name === 'Equity' ? 0 : Math.round(wal * (0.7 + rng() * 0.6) * 100) / 100,
      };
    });

    const cashflowHistory = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i) * 3);
      return {
        date: d.toISOString().slice(0, 7),
        interest: Math.round(jitter(collateralBalance * 0.015, 0.05)),
        principal: Math.round(jitter(collateralBalance * 0.02, 0.15)),
        defaults: Math.round(jitter(collateralBalance * 0.003, 0.3)),
        recoveries: Math.round(jitter(collateralBalance * 0.002, 0.3)),
      };
    });

    return {
      id: deal.id, manager: deal.manager, vintage: deal.vintage,
      collateralBalance, numLoans, wal,
      tests: { warf, diversityScore, cccBucket, defaultRate, recoveryRate, ocRatioAAA, ocRatioAA, icRatio },
      reinvestEndDate: reinvestEndDate.toISOString().slice(0, 10),
      tranches, cashflowHistory,
    };
  });

  const marketOverview = {
    totalIssuance: Math.round(jitter(180, 0.05) * 10) / 10,
    avgAAASpread: Math.round(deals.reduce((a, d) => a + (d.tranches[0].spread), 0) / deals.length),
    avgEquityYield: Math.round(deals.reduce((a, d) => a + (d.tranches[5].yield), 0) / deals.length * 100) / 100,
    avgWAL: Math.round(deals.reduce((a, d) => a + d.wal, 0) / deals.length * 100) / 100,
    avgDefaultRate: Math.round(deals.reduce((a, d) => a + d.tests.defaultRate, 0) / deals.length * 100) / 100,
    avgRecovery: Math.round(deals.reduce((a, d) => a + d.tests.recoveryRate, 0) / deals.length * 100) / 100,
  };

  return { deals, marketOverview, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CLOAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate CLO analytics data' });
  }
});

export default router;
