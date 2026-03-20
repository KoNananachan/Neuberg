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

interface SecurityLendingEntry {
  ticker: string;
  name: string;
  sector: string;
  borrowRate: number;
  utilization: number;
  daysToCover: number;
  shortInterestRatio: number;
  availability: 'Easy' | 'Medium' | 'Hard' | 'Special';
  lendableQuantity: number;
  onLoanQuantity: number;
  borrowRateChange1d: number;
  recallRisk: 'Low' | 'Medium' | 'High';
}

const SECURITIES = [
  { ticker: 'GME', name: 'GameStop Corp', sector: 'Consumer Discretionary', baseBps: 1800, baseUtil: 92 },
  { ticker: 'AMC', name: 'AMC Entertainment', sector: 'Communication Services', baseBps: 1200, baseUtil: 88 },
  { ticker: 'CVNA', name: 'Carvana Co', sector: 'Consumer Discretionary', baseBps: 900, baseUtil: 82 },
  { ticker: 'MARA', name: 'Marathon Digital', sector: 'Technology', baseBps: 350, baseUtil: 70 },
  { ticker: 'RIVN', name: 'Rivian Automotive', sector: 'Consumer Discretionary', baseBps: 120, baseUtil: 55 },
  { ticker: 'LCID', name: 'Lucid Group', sector: 'Consumer Discretionary', baseBps: 150, baseUtil: 58 },
  { ticker: 'BYND', name: 'Beyond Meat', sector: 'Consumer Staples', baseBps: 800, baseUtil: 78 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', sector: 'Consumer Discretionary', baseBps: 2200, baseUtil: 95 },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', baseBps: 25, baseUtil: 22 },
  { ticker: 'SOFI', name: 'SoFi Technologies', sector: 'Financials', baseBps: 40, baseUtil: 30 },
  { ticker: 'UPST', name: 'Upstart Holdings', sector: 'Financials', baseBps: 500, baseUtil: 72 },
  { ticker: 'AFRM', name: 'Affirm Holdings', sector: 'Financials', baseBps: 180, baseUtil: 52 },
  { ticker: 'HOOD', name: 'Robinhood Markets', sector: 'Financials', baseBps: 60, baseUtil: 35 },
  { ticker: 'COIN', name: 'Coinbase Global', sector: 'Financials', baseBps: 30, baseUtil: 25 },
  { ticker: 'SNAP', name: 'Snap Inc', sector: 'Communication Services', baseBps: 45, baseUtil: 28 },
  { ticker: 'DASH', name: 'DoorDash Inc', sector: 'Technology', baseBps: 35, baseUtil: 20 },
  { ticker: 'RBLX', name: 'Roblox Corp', sector: 'Communication Services', baseBps: 50, baseUtil: 32 },
  { ticker: 'U', name: 'Unity Software', sector: 'Technology', baseBps: 280, baseUtil: 62 },
  { ticker: 'DKNG', name: 'DraftKings Inc', sector: 'Consumer Discretionary', baseBps: 20, baseUtil: 18 },
  { ticker: 'PENN', name: 'Penn Entertainment', sector: 'Consumer Discretionary', baseBps: 70, baseUtil: 38 },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function classifyAvailability(bps: number): 'Easy' | 'Medium' | 'Hard' | 'Special' {
  if (bps < 50) return 'Easy';
  if (bps < 200) return 'Medium';
  if (bps < 1000) return 'Hard';
  return 'Special';
}

function classifyRecallRisk(util: number, bps: number): 'Low' | 'Medium' | 'High' {
  if (util > 85 || bps > 1000) return 'High';
  if (util > 50 || bps > 200) return 'Medium';
  return 'Low';
}

function classifyTier(bps: number): string {
  if (bps < 50) return 'General Collateral';
  if (bps < 200) return 'Warm';
  if (bps < 1000) return 'Hard';
  return 'Special';
}

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('securities-lending-' + day));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  // Generate per-security data
  const securities: SecurityLendingEntry[] = SECURITIES.map(s => {
    const borrowRate = Math.round(jitter(s.baseBps, 0.15));
    const utilization = Math.min(99.9, Math.max(1, jitter(s.baseUtil, 0.08)));
    const lendableQuantity = Math.round(jitter(5_000_000, 0.4));
    const onLoanQuantity = Math.round(lendableQuantity * (utilization / 100));
    const daysToCover = Math.round((1 + rng() * 8) * 10) / 10;
    const shortInterestRatio = Math.round((rng() * 30 + 2) * 100) / 100;
    const borrowRateChange1d = Math.round((rng() - 0.45) * borrowRate * 0.1);

    return {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      borrowRate,
      utilization: Math.round(utilization * 10) / 10,
      daysToCover,
      shortInterestRatio,
      availability: classifyAvailability(borrowRate),
      lendableQuantity,
      onLoanQuantity,
      borrowRateChange1d,
      recallRisk: classifyRecallRisk(utilization, borrowRate),
    };
  });

  // Hard-to-borrow list: top 10 by borrow rate
  const hardToBorrow = [...securities]
    .sort((a, b) => b.borrowRate - a.borrowRate)
    .slice(0, 10)
    .map(s => ({
      ticker: s.ticker,
      borrowRate: s.borrowRate,
      utilization: s.utilization,
      squeezeScore: Math.round(Math.min(100, (s.borrowRate / 25) + s.utilization * 0.4 + rng() * 10)),
      daysOnList: Math.round(1 + rng() * 60),
    }));

  // Sector breakdown
  const sectorMap = new Map<string, SecurityLendingEntry[]>();
  for (const s of securities) {
    const arr = sectorMap.get(s.sector) || [];
    arr.push(s);
    sectorMap.set(s.sector, arr);
  }
  const sectorBreakdown = [...sectorMap.entries()].map(([sector, items]) => ({
    sector,
    avgBorrowRate: Math.round(items.reduce((a, c) => a + c.borrowRate, 0) / items.length),
    avgUtilization: Math.round(items.reduce((a, c) => a + c.utilization, 0) / items.length * 10) / 10,
    totalOnLoanValue: items.reduce((a, c) => a + c.onLoanQuantity, 0),
    hardToBorrowCount: items.filter(c => c.availability === 'Hard' || c.availability === 'Special').length,
  }));

  // Cost tiers
  const tierNames = ['General Collateral', 'Warm', 'Hard', 'Special'];
  const tierRanges: Record<string, string> = {
    'General Collateral': '1-49 bps',
    'Warm': '50-199 bps',
    'Hard': '200-999 bps',
    'Special': '1000+ bps',
  };
  const costTiers = tierNames.map(tier => {
    const items = securities.filter(s => classifyTier(s.borrowRate) === tier);
    return {
      tier,
      borrowRateRange: tierRanges[tier],
      count: items.length,
      totalValue: items.reduce((a, c) => a + c.onLoanQuantity, 0),
    };
  });

  // Summary
  const totalLendableValue = securities.reduce((a, c) => a + c.lendableQuantity, 0);
  const totalOnLoan = securities.reduce((a, c) => a + c.onLoanQuantity, 0);
  const avgBorrowCost = Math.round(securities.reduce((a, c) => a + c.borrowRate, 0) / securities.length);
  const avgUtilization = Math.round(securities.reduce((a, c) => a + c.utilization, 0) / securities.length * 10) / 10;
  const hardToBorrowCount = securities.filter(s => s.availability === 'Hard' || s.availability === 'Special').length;
  const totalShortInterest = Math.round(securities.reduce((a, c) => a + c.shortInterestRatio, 0) * 100) / 100;

  const summary = {
    totalLendableValue,
    totalOnLoan,
    avgBorrowCost,
    avgUtilization,
    hardToBorrowCount,
    totalShortInterest,
  };

  return {
    summary,
    securities,
    hardToBorrow,
    sectorBreakdown,
    costTiers,
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
    console.error('[SecuritiesLending] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate securities lending data' });
  }
});

export default router;
