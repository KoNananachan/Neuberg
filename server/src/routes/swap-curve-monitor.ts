import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface IRSCurvePoint {
  tenor: string;
  rate: number;
  change1d: number;
  change1w: number;
}

interface SwapSpreadPoint {
  tenor: string;
  spread: number;
  change1d: number;
  change1w: number;
}

interface BasisSwapEntry {
  name: string;
  tenors: { tenor: string; spread: number }[];
}

interface ForwardRate {
  label: string;
  rate: number;
  change1d: number;
  impliedMove: number;
}

interface CurveMetrics {
  name: string;
  value: number;
  change1d: number;
}

interface MarketContext {
  fedFundsRate: number;
  nextFOMCDate: string;
  terminalRate: number;
  cutsHikesPriced: number;
}

interface SwapCurveMonitorResponse {
  irsCurve: IRSCurvePoint[];
  swapSpreads: SwapSpreadPoint[];
  basisSwaps: BasisSwapEntry[];
  forwardRates: ForwardRate[];
  curveMetrics: CurveMetrics[];
  marketContext: MarketContext;
  generatedAt: string;
}
let cacheData: SwapCurveMonitorResponse | null = null;
let cacheTime = 0;

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Data generation ──

function generate(): SwapCurveMonitorResponse {
  const seed = hashSeed('swap-curve-monitor-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  // ── 1. IRS Curve ──
  // USD IRS rates at standard tenors; short end ~4.9%, belly ~4.1%, long end ~3.9%
  const irsTenors = ['1Y', '2Y', '3Y', '4Y', '5Y', '7Y', '10Y', '15Y', '20Y', '25Y', '30Y'] as const;
  const irsBaseRates: Record<string, number> = {
    '1Y': 4.90, '2Y': 4.50, '3Y': 4.30, '4Y': 4.20, '5Y': 4.10,
    '7Y': 4.05, '10Y': 4.00, '15Y': 3.97, '20Y': 3.95, '25Y': 3.92, '30Y': 3.90,
  };

  const irsCurve: IRSCurvePoint[] = irsTenors.map((tenor) => {
    const base = irsBaseRates[tenor];
    const rate = roundTo(base + (rng() - 0.5) * 0.12, 4);
    const change1d = roundTo((rng() - 0.5) * 6, 1);
    const change1w = roundTo((rng() - 0.5) * 14, 1);
    return { tenor, rate, change1d, change1w };
  });

  // Build a lookup for IRS rates
  const irsMap: Record<string, number> = {};
  for (const pt of irsCurve) irsMap[pt.tenor] = pt.rate;

  // ── 2. Swap Spreads (swap rate vs treasury, in bps) ──
  const spreadTenors = ['2Y', '3Y', '5Y', '7Y', '10Y', '30Y'] as const;
  const spreadBases: Record<string, number> = {
    '2Y': 10, '3Y': 5, '5Y': 0, '7Y': -5, '10Y': -10, '30Y': -40,
  };

  const swapSpreads: SwapSpreadPoint[] = spreadTenors.map((tenor) => {
    const base = spreadBases[tenor];
    const spread = roundTo(base + (rng() - 0.5) * 10, 1);
    const change1d = roundTo((rng() - 0.5) * 3, 1);
    const change1w = roundTo((rng() - 0.5) * 8, 1);
    return { tenor, spread, change1d, change1w };
  });

  // ── 3. Basis Swaps ──
  const basisTenors = ['1Y', '3Y', '5Y', '10Y'] as const;

  const basisSwaps: BasisSwapEntry[] = [
    {
      name: 'SOFR vs Fed Funds',
      tenors: basisTenors.map((tenor) => ({
        tenor,
        spread: roundTo(1.5 + (rng() - 0.5) * 2, 2),
      })),
    },
    {
      name: '3M vs 6M SOFR',
      tenors: basisTenors.map((tenor) => ({
        tenor,
        spread: roundTo(3 + (rng() - 0.5) * 4, 2),
      })),
    },
    {
      name: 'EUR/USD XCCY Basis',
      tenors: basisTenors.map((tenor) => ({
        tenor,
        spread: roundTo(-15 + (rng() - 0.5) * 12, 2),
      })),
    },
    {
      name: 'JPY/USD XCCY Basis',
      tenors: basisTenors.map((tenor) => ({
        tenor,
        spread: roundTo(-45 + (rng() - 0.5) * 20, 2),
      })),
    },
    {
      name: 'GBP/USD XCCY Basis',
      tenors: basisTenors.map((tenor) => ({
        tenor,
        spread: roundTo(-8 + (rng() - 0.5) * 8, 2),
      })),
    },
  ];

  // ── 4. Forward Rates ──
  const forwardConfigs: { label: string; baseRate: number }[] = [
    { label: '1Y1Y', baseRate: 4.10 },
    { label: '2Y1Y', baseRate: 3.85 },
    { label: '3Y1Y', baseRate: 3.75 },
    { label: '5Y5Y', baseRate: 3.90 },
    { label: '1Y5Y', baseRate: 3.95 },
    { label: '5Y10Y', baseRate: 4.00 },
  ];

  const forwardRates: ForwardRate[] = forwardConfigs.map(({ label, baseRate }) => {
    const rate = roundTo(baseRate + (rng() - 0.5) * 0.20, 4);
    const change1d = roundTo((rng() - 0.5) * 0.06, 4);
    const impliedMove = roundTo((rng() - 0.5) * 0.10, 4);
    return { label, rate, change1d, impliedMove };
  });

  // ── 5. Curve Metrics ──
  // Slopes and butterfly calculated from the IRS curve
  const r2 = irsMap['2Y'] ?? 4.50;
  const r5 = irsMap['5Y'] ?? 4.10;
  const r10 = irsMap['10Y'] ?? 4.00;
  const r30 = irsMap['30Y'] ?? 3.90;

  const twosTens = roundTo((r10 - r2) * 100, 1);
  const twosFives = roundTo((r5 - r2) * 100, 1);
  const fivesThirties = roundTo((r30 - r5) * 100, 1);
  const butterfly2s5s10s = roundTo((2 * r5 - r2 - r10) * 100, 1);

  // Convexity adjustment estimates (small positive for long end)
  const convexAdj10Y = roundTo(2 + rng() * 3, 1);
  const convexAdj30Y = roundTo(8 + rng() * 6, 1);

  const curveMetrics: CurveMetrics[] = [
    { name: '2s10s Slope', value: twosTens, change1d: roundTo((rng() - 0.5) * 4, 1) },
    { name: '2s5s Slope', value: twosFives, change1d: roundTo((rng() - 0.5) * 3, 1) },
    { name: '5s30s Slope', value: fivesThirties, change1d: roundTo((rng() - 0.5) * 4, 1) },
    { name: '2s5s10s Butterfly', value: butterfly2s5s10s, change1d: roundTo((rng() - 0.5) * 3, 1) },
    { name: '10Y Convexity Adj', value: convexAdj10Y, change1d: roundTo((rng() - 0.5) * 1, 1) },
    { name: '30Y Convexity Adj', value: convexAdj30Y, change1d: roundTo((rng() - 0.5) * 2, 1) },
  ];

  // ── 6. Market Context ──
  const fedFundsRate = roundTo(5.25 + (rng() - 0.5) * 0.50, 2);

  // Next FOMC: pick a plausible upcoming date based on seed
  const fomcDates = [
    '2026-01-29', '2026-03-19', '2026-05-07', '2026-06-18',
    '2026-07-29', '2026-09-17', '2026-11-05', '2026-12-17',
  ];
  const today = new Date().toISOString().slice(0, 10);
  const nextFOMCDate = fomcDates.find((d) => d > today) ?? fomcDates[0];

  const terminalRate = roundTo(fedFundsRate - 0.50 - rng() * 1.0, 2);
  const cutsHikesPriced = roundTo((fedFundsRate - terminalRate) / 0.25, 1);

  const marketContext: MarketContext = {
    fedFundsRate,
    nextFOMCDate,
    terminalRate,
    cutsHikesPriced,
  };

  return {
    irsCurve,
    swapSpreads,
    basisSwaps,
    forwardRates,
    curveMetrics,
    marketContext,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[SwapCurveMonitor] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate swap curve monitor data' });
  }
});

export default router;
