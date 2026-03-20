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
  { name: 'NYC GO', state: 'NY', baseYield: 3.35, rating: 'AA' as const, type: 'GO' as const },
  { name: 'CA State', state: 'CA', baseYield: 3.25, rating: 'AA-' as const, type: 'GO' as const },
  { name: 'TX Water', state: 'TX', baseYield: 3.05, rating: 'AAA' as const, type: 'Revenue' as const },
  { name: 'IL Tollway', state: 'IL', baseYield: 3.85, rating: 'A+' as const, type: 'Revenue' as const },
  { name: 'MA Bay Transit', state: 'MA', baseYield: 3.15, rating: 'AA+' as const, type: 'Revenue' as const },
  { name: 'FL Turnpike', state: 'FL', baseYield: 2.95, rating: 'AAA' as const, type: 'Revenue' as const },
  { name: 'PA Turnpike', state: 'PA', baseYield: 3.45, rating: 'AA-' as const, type: 'Revenue' as const },
  { name: 'OH State', state: 'OH', baseYield: 3.10, rating: 'AA' as const, type: 'GO' as const },
  { name: 'NJ Transit', state: 'NJ', baseYield: 3.55, rating: 'A+' as const, type: 'Revenue' as const },
  { name: 'WA State', state: 'WA', baseYield: 2.90, rating: 'AA+' as const, type: 'GO' as const },
];

const VRDO_NAMES = [
  'SIFMA Index', '7-Day AA', '7-Day A', '30-Day AA',
  'Tax-Exempt CP AA', 'Weekly Reset AAA', 'Daily Reset AA', 'Put Bond AA',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-muni-bond-auction'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Recent Auctions (10 items)
  const recentAuctions = ISSUERS.map((issuer) => {
    const daysAgo = Math.floor(rng() * 14);
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() - daysAgo);
    const maturityYears = 5 + Math.floor(rng() * 25);
    const matDate = new Date();
    matDate.setFullYear(matDate.getFullYear() + maturityYears);
    const coupon = Math.round(jitter(issuer.baseYield - 0.2, 0.12) * 100) / 100;
    const yld = Math.round(jitter(issuer.baseYield, 0.08) * 1000) / 1000;
    const bidTocover = Math.round((1.8 + rng() * 2.2) * 100) / 100;
    const spread = Math.round((yld - 2.5) * 100 + rng() * 25);
    const amount = Math.round(jitter(250, 0.6));
    const allottedAt = Math.round(jitter(yld, 0.02) * 1000) / 1000;

    return {
      issuer: issuer.name,
      amount,
      coupon,
      yield: yld,
      bidTocover,
      spread,
      rating: issuer.rating,
      maturity: matDate.toISOString().slice(0, 10),
      type: issuer.type,
      allottedAt,
    };
  });

  recentAuctions.sort((a, b) => b.amount - a.amount);

  // 2. VRDO Rates (8 items)
  const baseSofr = 4.55;
  const vrdoRates = VRDO_NAMES.map((name) => {
    const isIndex = name === 'SIFMA Index';
    const baseRate = isIndex ? 3.15 : 2.5 + rng() * 1.5;
    const rate = Math.round(jitter(baseRate, 0.06) * 1000) / 1000;
    const priorWeek = Math.round(jitter(baseRate, 0.08) * 1000) / 1000;
    const change = Math.round((rate - priorWeek) * 1000) / 1000;
    const weeklyAvg = Math.round(jitter(baseRate, 0.04) * 1000) / 1000;
    const monthlyAvg = Math.round(jitter(baseRate, 0.03) * 1000) / 1000;
    const ratio = Math.round((rate / baseSofr) * 100) / 100;

    return { name, rate, priorWeek, change, weeklyAvg, monthlyAvg, ratio };
  });

  // 3. Failed Auctions (5 items)
  const failureTypes = ['Failed', 'Near-Fail', 'Repriced', 'Failed', 'Near-Fail'] as const;
  const failedIssuers = [
    { name: 'PR Highway Auth', baseYield: 5.8 },
    { name: 'Detroit Water', baseYield: 5.2 },
    { name: 'IL Finance Auth', baseYield: 4.8 },
    { name: 'Atlantic City GO', baseYield: 5.5 },
    { name: 'Hartford CT GO', baseYield: 4.6 },
  ];

  const failedAuctions = failedIssuers.map((fi, idx) => {
    const daysAgo = 1 + Math.floor(rng() * 30);
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() - daysAgo);
    const originalYield = Math.round(jitter(fi.baseYield, 0.08) * 1000) / 1000;
    const resetYield = Math.round(jitter(fi.baseYield + 0.5 + rng() * 1.5, 0.05) * 1000) / 1000;
    const maxRate = Math.round((fi.baseYield + 3 + rng() * 2) * 100) / 100;
    const amount = Math.round(jitter(120, 0.5));
    const penalty = Math.round(rng() * 50 + 10);

    return {
      issuer: fi.name,
      amount,
      scheduledDate: scheduledDate.toISOString().slice(0, 10),
      failureType: failureTypes[idx],
      originalYield,
      resetYield,
      maxRate,
      penalty,
    };
  });

  // 4. Rate Trends (12 months, Jan 2024 - Dec 2024)
  const rateTrends = MONTHS.map((month, idx) => {
    const seasonalFactor = 1 + 0.08 * Math.sin((idx - 3) * Math.PI / 6);
    const aaa10y = Math.round(jitter(2.85 * seasonalFactor, 0.04) * 1000) / 1000;
    const aa10y = Math.round(jitter(3.15 * seasonalFactor, 0.04) * 1000) / 1000;
    const a10y = Math.round(jitter(3.55 * seasonalFactor, 0.04) * 1000) / 1000;
    const muniTreasuryRatio = Math.round(jitter(72, 0.06));
    const newIssuance = Math.round(jitter(35 * seasonalFactor, 0.15) * 10) / 10;
    const netFlows = Math.round((rng() - 0.35) * 8 * 10) / 10;

    return {
      month: `${month} 2024`,
      aaa10y,
      aa10y,
      a10y,
      muniTreasuryRatio,
      newIssuance,
      netFlows,
    };
  });

  // 5. Market Summary
  const sifmaEntry = vrdoRates.find(v => v.name === 'SIFMA Index')!;
  const avgBtc = Math.round(recentAuctions.reduce((s, a) => s + a.bidTocover, 0) / recentAuctions.length * 100) / 100;
  const totalPending = Math.round(jitter(12.5, 0.15) * 10) / 10;
  const failRate = Math.round(jitter(1.8, 0.3) * 100) / 100;
  const states = ISSUERS.map(i => i.state);
  const mostActiveState = states[Math.floor(rng() * states.length)];
  const yieldCurveSlope = Math.round(jitter(1.25, 0.12) * 100) / 100;

  const marketSummary = {
    sifmaRate: sifmaEntry.rate,
    weeklyChange: sifmaEntry.change,
    totalPending,
    avgBidToCover: avgBtc,
    failRate,
    mostActiveState,
    yieldCurveSlope,
  };

  return {
    recentAuctions,
    vrdoRates,
    failedAuctions,
    rateTrends,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MuniBondAuction] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate muni bond auction data' });
  }
});

export default router;
