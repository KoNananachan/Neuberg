import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


let cacheData: unknown = null;
let cacheTime = 0;

// ── Commodity definitions ──

interface CommodityDef {
  symbol: string;
  name: string;
  sector: 'energy' | 'metals' | 'agriculture';
  unit: string;
  spotLow: number;
  spotHigh: number;
  /** Annualized slope direction: positive = contango, negative = backwardation */
  slopeAnnual: number;
  volatility: number;
  /** Estimated annual storage cost as % of spot */
  storageCostPct: number;
  seasonalAmplitude: number;
  seasonalPeakMonth: number; // 0-11
}

const COMMODITIES: CommodityDef[] = [
  {
    symbol: 'WTI',
    name: 'WTI Crude Oil',
    sector: 'energy',
    unit: '$/bbl',
    spotLow: 68,
    spotHigh: 82,
    slopeAnnual: -1.8,
    volatility: 0.03,
    storageCostPct: 0.06,
    seasonalAmplitude: 0.04,
    seasonalPeakMonth: 6, // July
  },
  {
    symbol: 'BRN',
    name: 'Brent Crude Oil',
    sector: 'energy',
    unit: '$/bbl',
    spotLow: 72,
    spotHigh: 86,
    slopeAnnual: -1.5,
    volatility: 0.028,
    storageCostPct: 0.055,
    seasonalAmplitude: 0.035,
    seasonalPeakMonth: 6,
  },
  {
    symbol: 'NG',
    name: 'Natural Gas',
    sector: 'energy',
    unit: '$/MMBtu',
    spotLow: 2.2,
    spotHigh: 4.0,
    slopeAnnual: 0.35,
    volatility: 0.07,
    storageCostPct: 0.12,
    seasonalAmplitude: 0.18,
    seasonalPeakMonth: 0, // January
  },
  {
    symbol: 'GC',
    name: 'Gold',
    sector: 'metals',
    unit: '$/oz',
    spotLow: 1980,
    spotHigh: 2150,
    slopeAnnual: 12,
    volatility: 0.01,
    storageCostPct: 0.004,
    seasonalAmplitude: 0.015,
    seasonalPeakMonth: 8, // September
  },
  {
    symbol: 'SI',
    name: 'Silver',
    sector: 'metals',
    unit: '$/oz',
    spotLow: 22,
    spotHigh: 28,
    slopeAnnual: 0.15,
    volatility: 0.025,
    storageCostPct: 0.006,
    seasonalAmplitude: 0.025,
    seasonalPeakMonth: 1, // February
  },
  {
    symbol: 'HG',
    name: 'Copper',
    sector: 'metals',
    unit: '$/lb',
    spotLow: 3.7,
    spotHigh: 4.6,
    slopeAnnual: -0.04,
    volatility: 0.03,
    storageCostPct: 0.008,
    seasonalAmplitude: 0.03,
    seasonalPeakMonth: 3, // April
  },
  {
    symbol: 'ZC',
    name: 'Corn',
    sector: 'agriculture',
    unit: '$/bu',
    spotLow: 4.1,
    spotHigh: 5.3,
    slopeAnnual: 0.12,
    volatility: 0.04,
    storageCostPct: 0.07,
    seasonalAmplitude: 0.08,
    seasonalPeakMonth: 5, // June
  },
  {
    symbol: 'ZS',
    name: 'Soybeans',
    sector: 'agriculture',
    unit: '$/bu',
    spotLow: 11.0,
    spotHigh: 14.0,
    slopeAnnual: -0.2,
    volatility: 0.035,
    storageCostPct: 0.06,
    seasonalAmplitude: 0.06,
    seasonalPeakMonth: 6, // July
  },
  {
    symbol: 'ZW',
    name: 'Wheat',
    sector: 'agriculture',
    unit: '$/bu',
    spotLow: 5.2,
    spotHigh: 7.2,
    slopeAnnual: 0.15,
    volatility: 0.045,
    storageCostPct: 0.065,
    seasonalAmplitude: 0.07,
    seasonalPeakMonth: 4, // May
  },
];

// ── Tenor definitions (months) ──

const TENORS = [
  { label: 'Spot', months: 0 },
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '3Y', months: 36 },
];

// ── Helpers ──

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function dateSeed(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── Generator ──

function generateCurve(
  commodity: CommodityDef,
  rng: () => number,
  currentMonth: number,
): {
  spotPrice: number;
  forwardPrices: { tenor: string; months: number; price: number }[];
} {
  const spotPrice = round(
    commodity.spotLow + rng() * (commodity.spotHigh - commodity.spotLow),
  );

  const forwardPrices = TENORS.map((t) => {
    if (t.months === 0) {
      return { tenor: t.label, months: 0, price: spotPrice };
    }

    const years = t.months / 12;

    // Base slope component
    const slopeComponent = commodity.slopeAnnual * years;

    // Seasonal component: sinusoidal based on commodity peak month
    const futureMonth = (currentMonth + t.months) % 12;
    const currentPhase =
      ((currentMonth - commodity.seasonalPeakMonth) / 12) * 2 * Math.PI;
    const futurePhase =
      ((futureMonth - commodity.seasonalPeakMonth) / 12) * 2 * Math.PI;
    const seasonalComponent =
      (Math.cos(futurePhase) - Math.cos(currentPhase)) *
      commodity.seasonalAmplitude *
      spotPrice;

    // Random noise scaled by volatility and time
    const noise =
      (rng() - 0.5) * 2 * commodity.volatility * spotPrice * Math.sqrt(years);

    const price = round(spotPrice + slopeComponent + seasonalComponent + noise);

    return { tenor: t.label, months: t.months, price: Math.max(price, round(spotPrice * 0.5)) };
  });

  return { spotPrice, forwardPrices };
}

function generate() {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(today + '-commodities-forward-curve'));

  const now = new Date();
  const currentMonth = now.getMonth();

  const curves = COMMODITIES.map((commodity) => {
    const { spotPrice, forwardPrices } = generateCurve(commodity, rng, currentMonth);

    const frontMonthPrice = forwardPrices[1].price; // 1M
    const backMonthPrice = forwardPrices[forwardPrices.length - 1].price; // 3Y

    // Contango / backwardation
    const spreadPct = (backMonthPrice - spotPrice) / spotPrice;
    let curveShape: 'contango' | 'backwardation' | 'flat';
    let magnitude: number;

    if (Math.abs(spreadPct) < 0.005) {
      curveShape = 'flat';
      magnitude = 0;
    } else if (spreadPct > 0) {
      curveShape = 'contango';
      magnitude = round(spreadPct * 100, 2);
    } else {
      curveShape = 'backwardation';
      magnitude = round(Math.abs(spreadPct) * 100, 2);
    }

    // Roll yield: annualized return from rolling front-month to spot
    const rollYield = round(
      ((spotPrice - frontMonthPrice) / frontMonthPrice) * 12 * 100,
      2,
    );

    // Basis: spot vs front-month
    const basis = round(spotPrice - frontMonthPrice, 4);
    const basisPct = round(((spotPrice - frontMonthPrice) / spotPrice) * 100, 2);

    // Storage cost estimate (annual, in currency units)
    const storageCostAnnual = round(spotPrice * commodity.storageCostPct, 2);
    const storageCostMonthly = round(storageCostAnnual / 12, 4);

    // Historical curve shape comparison
    // 1 week ago
    const rng1w = mulberry32(
      hashSeed(dateSeed(7) + '-commodities-forward-curve-' + commodity.symbol),
    );
    const hist1w = generateCurve(commodity, rng1w, currentMonth);
    const spread1w =
      (hist1w.forwardPrices[hist1w.forwardPrices.length - 1].price -
        hist1w.spotPrice) /
      hist1w.spotPrice;
    const shape1w: 'contango' | 'backwardation' | 'flat' =
      Math.abs(spread1w) < 0.005
        ? 'flat'
        : spread1w > 0
          ? 'contango'
          : 'backwardation';

    // 1 month ago
    const rng1m = mulberry32(
      hashSeed(dateSeed(30) + '-commodities-forward-curve-' + commodity.symbol),
    );
    const hist1m = generateCurve(commodity, rng1m, (currentMonth + 11) % 12);
    const spread1m =
      (hist1m.forwardPrices[hist1m.forwardPrices.length - 1].price -
        hist1m.spotPrice) /
      hist1m.spotPrice;
    const shape1m: 'contango' | 'backwardation' | 'flat' =
      Math.abs(spread1m) < 0.005
        ? 'flat'
        : spread1m > 0
          ? 'contango'
          : 'backwardation';

    // Seasonal pattern info
    const peakMonthName = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][commodity.seasonalPeakMonth];
    const troughMonthIdx = (commodity.seasonalPeakMonth + 6) % 12;
    const troughMonthName = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][troughMonthIdx];
    const monthsFromPeak = Math.min(
      Math.abs(currentMonth - commodity.seasonalPeakMonth),
      12 - Math.abs(currentMonth - commodity.seasonalPeakMonth),
    );
    const seasonalPosition =
      monthsFromPeak <= 2
        ? 'near-peak'
        : monthsFromPeak >= 4
          ? 'near-trough'
          : 'mid-cycle';

    return {
      symbol: commodity.symbol,
      name: commodity.name,
      sector: commodity.sector,
      unit: commodity.unit,
      spotPrice,
      forwardPrices,
      curveShape,
      magnitude,
      rollYield,
      basis: {
        value: basis,
        pct: basisPct,
        description:
          basis > 0
            ? 'Spot premium (backwardation signal)'
            : basis < 0
              ? 'Spot discount (contango signal)'
              : 'Flat basis',
      },
      storageCost: {
        annualPct: round(commodity.storageCostPct * 100, 2),
        annualPerUnit: storageCostAnnual,
        monthlyPerUnit: storageCostMonthly,
        unit: commodity.unit,
      },
      historicalShape: {
        current: curveShape,
        oneWeekAgo: shape1w,
        oneMonthAgo: shape1m,
        spotChange1w: round(spotPrice - hist1w.spotPrice, 2),
        spotChange1m: round(spotPrice - hist1m.spotPrice, 2),
        spotChangePct1w: round(
          ((spotPrice - hist1w.spotPrice) / hist1w.spotPrice) * 100,
          2,
        ),
        spotChangePct1m: round(
          ((spotPrice - hist1m.spotPrice) / hist1m.spotPrice) * 100,
          2,
        ),
      },
      seasonal: {
        peakMonth: peakMonthName,
        troughMonth: troughMonthName,
        amplitude: round(commodity.seasonalAmplitude * 100, 1),
        currentPosition: seasonalPosition,
      },
    };
  });

  // Summary statistics
  const contangoCount = curves.filter((c) => c.curveShape === 'contango').length;
  const backwardationCount = curves.filter(
    (c) => c.curveShape === 'backwardation',
  ).length;
  const flatCount = curves.filter((c) => c.curveShape === 'flat').length;

  const avgRollYield = round(
    curves.reduce((sum, c) => sum + c.rollYield, 0) / curves.length,
    2,
  );

  const sectorSummary = {
    energy: {
      commodities: curves
        .filter((c) => c.sector === 'energy')
        .map((c) => c.symbol),
      avgRollYield: round(
        curves
          .filter((c) => c.sector === 'energy')
          .reduce((sum, c) => sum + c.rollYield, 0) /
          curves.filter((c) => c.sector === 'energy').length,
        2,
      ),
      predominantShape:
        curves.filter(
          (c) => c.sector === 'energy' && c.curveShape === 'backwardation',
        ).length >
        curves.filter(
          (c) => c.sector === 'energy' && c.curveShape === 'contango',
        ).length
          ? 'backwardation'
          : 'contango',
    },
    metals: {
      commodities: curves
        .filter((c) => c.sector === 'metals')
        .map((c) => c.symbol),
      avgRollYield: round(
        curves
          .filter((c) => c.sector === 'metals')
          .reduce((sum, c) => sum + c.rollYield, 0) /
          curves.filter((c) => c.sector === 'metals').length,
        2,
      ),
      predominantShape:
        curves.filter(
          (c) => c.sector === 'metals' && c.curveShape === 'backwardation',
        ).length >
        curves.filter(
          (c) => c.sector === 'metals' && c.curveShape === 'contango',
        ).length
          ? 'backwardation'
          : 'contango',
    },
    agriculture: {
      commodities: curves
        .filter((c) => c.sector === 'agriculture')
        .map((c) => c.symbol),
      avgRollYield: round(
        curves
          .filter((c) => c.sector === 'agriculture')
          .reduce((sum, c) => sum + c.rollYield, 0) /
          curves.filter((c) => c.sector === 'agriculture').length,
        2,
      ),
      predominantShape:
        curves.filter(
          (c) =>
            c.sector === 'agriculture' && c.curveShape === 'backwardation',
        ).length >
        curves.filter(
          (c) => c.sector === 'agriculture' && c.curveShape === 'contango',
        ).length
          ? 'backwardation'
          : 'contango',
    },
  };

  return {
    curves,
    summary: {
      totalCommodities: curves.length,
      contango: contangoCount,
      backwardation: backwardationCount,
      flat: flatCount,
      avgRollYield,
      sectorSummary,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CommoditiesForwardCurve] Error:', message);
    if (cacheData) return res.json(cacheData);
    res.status(502).json({ error: 'Failed to generate commodities forward curve data' });
  }
});

export default router;
