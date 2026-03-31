import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: unknown; ts: number } | null = null;

interface CurveShape {
  commodity: string;
  spot: number;
  month1: number;
  month3: number;
  month6: number;
  month12: number;
  month24: number;
  structure: 'Contango' | 'Backwardation' | 'Flat';
  annualizedRoll: number;
  curveSlope: number;
}

interface RollYieldEntry {
  commodity: string;
  frontMonth: number;
  secondMonth: number;
  rollYieldMonthly: number;
  rollYieldAnnualized: number;
  rollCost: number;
  optimalRollWindow: number;
  calendarSpread: number;
}

interface BasisEntry {
  commodity: string;
  cashPrice: number;
  nearFutures: number;
  basis: number;
  basisPercent: number;
  historicalAvgBasis: number;
  zscore: number;
  convergenceDays: number;
}

interface InventoryCurveEntry {
  commodity: string;
  inventoryLevel: number;
  inventoryChange: number;
  daysOfSupply: number;
  curveSlope: number;
  correlation: number;
  signal: 'Tightening' | 'Loosening' | 'Neutral';
}

interface MarketSummary {
  avgContangoDepth: number;
  commoditiesInBackwardation: number;
  bestRollYield: string;
  worstRollYield: string;
  avgBasisZscore: number;
  dominantStructure: 'Contango' | 'Backwardation';
}

const COMMODITIES = [
  { name: 'WTI Crude', baseSpot: 78.0, slopeDir: -1, volatility: 0.04 },
  { name: 'Brent', baseSpot: 82.0, slopeDir: -1, volatility: 0.035 },
  { name: 'Natural Gas', baseSpot: 3.2, slopeDir: 1, volatility: 0.08 },
  { name: 'Gold', baseSpot: 2050, slopeDir: 1, volatility: 0.015 },
  { name: 'Silver', baseSpot: 24.5, slopeDir: 1, volatility: 0.03 },
  { name: 'Copper', baseSpot: 4.0, slopeDir: -1, volatility: 0.025 },
  { name: 'Corn', baseSpot: 4.85, slopeDir: 1, volatility: 0.04 },
  { name: 'Soybeans', baseSpot: 12.2, slopeDir: -1, volatility: 0.035 },
];

const INVENTORY_COMMODITIES = [
  { name: 'WTI Crude', baseInventory: 440, baseDays: 28, baseSlope: -0.35 },
  { name: 'Natural Gas', baseInventory: 3200, baseDays: 42, baseSlope: 0.18 },
  { name: 'Copper', baseInventory: 285, baseDays: 18, baseSlope: -0.12 },
  { name: 'Corn', baseInventory: 1520, baseDays: 35, baseSlope: 0.22 },
  { name: 'Aluminum', baseInventory: 520, baseDays: 22, baseSlope: -0.08 },
  { name: 'Gold', baseInventory: 78, baseDays: 120, baseSlope: 0.05 },
];

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-curve-analytics'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

  // 1. Curve Shapes
  const curveShapes: CurveShape[] = COMMODITIES.map(c => {
    const spot = round(jitter(c.baseSpot, c.volatility), 2);
    const slopeMag = Math.abs(c.baseSpot) * (0.002 + rng() * 0.006) * c.slopeDir;

    const month1 = round(spot + slopeMag * 1 + (rng() - 0.5) * c.baseSpot * 0.003, 2);
    const month3 = round(spot + slopeMag * 3 + (rng() - 0.5) * c.baseSpot * 0.005, 2);
    const month6 = round(spot + slopeMag * 6 + (rng() - 0.5) * c.baseSpot * 0.008, 2);
    const month12 = round(spot + slopeMag * 12 + (rng() - 0.5) * c.baseSpot * 0.012, 2);
    const month24 = round(spot + slopeMag * 24 + (rng() - 0.5) * c.baseSpot * 0.018, 2);

    const diff = month12 - spot;
    const structure: 'Contango' | 'Backwardation' | 'Flat' =
      Math.abs(diff / spot) < 0.005 ? 'Flat' : diff > 0 ? 'Contango' : 'Backwardation';

    const annualizedRoll = round(((spot - month1) / spot) * 12 * 100, 2);
    const curveSlope = round((month12 - spot) / spot * 100, 2);

    return { commodity: c.name, spot, month1, month3, month6, month12, month24, structure, annualizedRoll, curveSlope };
  });

  // 2. Roll Yield
  const rollYield: RollYieldEntry[] = COMMODITIES.map((c, i) => {
    const cs = curveShapes[i];
    const frontMonth = cs.month1;
    const secondMonth = cs.month3;
    const rollYieldMonthly = round(((frontMonth - secondMonth) / frontMonth) * 100, 4);
    const rollYieldAnnualized = round(rollYieldMonthly * 6, 2);
    const rollCost = round(Math.abs(frontMonth - secondMonth), 4);
    const optimalRollWindow = Math.floor(3 + rng() * 7);
    const calendarSpread = round(frontMonth - secondMonth, 4);

    return { commodity: c.name, frontMonth, secondMonth, rollYieldMonthly, rollYieldAnnualized, rollCost, optimalRollWindow, calendarSpread };
  });

  // 3. Basis Analysis
  const basisAnalysis: BasisEntry[] = COMMODITIES.map((c, i) => {
    const cs = curveShapes[i];
    const cashPrice = round(cs.spot * (1 + (rng() - 0.5) * 0.008), 2);
    const nearFutures = cs.month1;
    const basis = round(cashPrice - nearFutures, 4);
    const basisPercent = round((basis / cashPrice) * 100, 4);
    const historicalAvgBasis = round((rng() - 0.5) * c.baseSpot * 0.01, 4);
    const stdDev = Math.abs(c.baseSpot * 0.005) || 0.01;
    const zscore = round((basis - historicalAvgBasis) / stdDev, 2);
    const convergenceDays = Math.floor(15 + rng() * 30);

    return { commodity: c.name, cashPrice, nearFutures, basis, basisPercent, historicalAvgBasis, zscore, convergenceDays };
  });

  // 4. Inventory Curve Correlation
  const inventoryCurveCorrelation: InventoryCurveEntry[] = INVENTORY_COMMODITIES.map(ic => {
    const inventoryLevel = round(jitter(ic.baseInventory, 0.08), 1);
    const inventoryChange = round((rng() - 0.5) * ic.baseInventory * 0.04, 1);
    const daysOfSupply = round(jitter(ic.baseDays, 0.1), 1);
    const curveSlope = round(jitter(ic.baseSlope, 0.3), 4);
    const correlation = round(-0.4 - rng() * 0.45, 2);
    const signal: 'Tightening' | 'Loosening' | 'Neutral' =
      inventoryChange < -ic.baseInventory * 0.01 ? 'Tightening'
        : inventoryChange > ic.baseInventory * 0.01 ? 'Loosening'
          : 'Neutral';

    return { commodity: ic.name, inventoryLevel, inventoryChange, daysOfSupply, curveSlope, correlation, signal };
  });

  // 5. Market Summary
  const backwardationCount = curveShapes.filter(c => c.structure === 'Backwardation').length;
  const contangoCount = curveShapes.filter(c => c.structure === 'Contango').length;

  const contangoDepths = curveShapes
    .filter(c => c.structure === 'Contango')
    .map(c => c.curveSlope);
  const avgContangoDepth = contangoDepths.length > 0
    ? round(contangoDepths.reduce((a, b) => a + b, 0) / contangoDepths.length, 2)
    : 0;

  const sortedRoll = [...rollYield].sort((a, b) => b.rollYieldAnnualized - a.rollYieldAnnualized);
  const bestRollYield = sortedRoll[0]?.commodity ?? 'N/A';
  const worstRollYield = sortedRoll[sortedRoll.length - 1]?.commodity ?? 'N/A';

  const avgBasisZscore = round(
    basisAnalysis.reduce((s, b) => s + b.zscore, 0) / basisAnalysis.length,
    2,
  );

  const dominantStructure: 'Contango' | 'Backwardation' =
    contangoCount >= backwardationCount ? 'Contango' : 'Backwardation';

  const marketSummary: MarketSummary = {
    avgContangoDepth,
    commoditiesInBackwardation: backwardationCount,
    bestRollYield,
    worstRollYield,
    avgBasisZscore,
    dominantStructure,
  };

  return {
    curveShapes,
    rollYield,
    basisAnalysis,
    inventoryCurveCorrelation,
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
    console.error('[CommodityCurveAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity curve analytics data' });
  }
});

export default router;
