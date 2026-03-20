import { Router } from 'express';

const router = Router();

// -- Seeded PRNG --

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Helpers --

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// -- Static Definitions --

interface IndexDef {
  name: string;
  ticker: string;
  region: string;
  series: number;
  maturity: string;
  coupon: number;
  baseSpread: number;
  constituents: number;
}

const INDEX_DEFS: IndexDef[] = [
  { name: 'CDX North America Investment Grade', ticker: 'CDX.NA.IG', region: 'North America', series: 42, maturity: '2029-06-20', coupon: 100, baseSpread: 52, constituents: 125 },
  { name: 'CDX North America High Yield', ticker: 'CDX.NA.HY', region: 'North America', series: 42, maturity: '2029-06-20', coupon: 500, baseSpread: 385, constituents: 100 },
  { name: 'iTraxx Europe Main', ticker: 'ITRAXX.EUR', region: 'Europe', series: 41, maturity: '2029-06-20', coupon: 100, baseSpread: 58, constituents: 125 },
  { name: 'iTraxx Europe Crossover', ticker: 'ITRAXX.XOVER', region: 'Europe', series: 41, maturity: '2029-06-20', coupon: 500, baseSpread: 310, constituents: 75 },
];

const TRANCHE_POINTS = ['0-3%', '3-7%', '7-15%', '15-30%', '30-100%'] as const;

interface TrancheBaseDef {
  label: string;
  attachment: number;
  detachment: number;
  igBaseSpread: number;
  hyBaseSpread: number;
  itraxxBaseSpread: number;
  xoverBaseSpread: number;
  isEquity: boolean;
}

const TRANCHE_BASE_DEFS: TrancheBaseDef[] = [
  { label: '0-3%', attachment: 0, detachment: 3, igBaseSpread: 0, hyBaseSpread: 0, itraxxBaseSpread: 0, xoverBaseSpread: 0, isEquity: true },
  { label: '3-7%', attachment: 3, detachment: 7, igBaseSpread: 175, hyBaseSpread: 680, itraxxBaseSpread: 165, xoverBaseSpread: 620, isEquity: false },
  { label: '7-15%', attachment: 7, detachment: 15, igBaseSpread: 38, hyBaseSpread: 245, itraxxBaseSpread: 34, xoverBaseSpread: 225, isEquity: false },
  { label: '15-30%', attachment: 15, detachment: 30, igBaseSpread: 12, hyBaseSpread: 85, itraxxBaseSpread: 10, xoverBaseSpread: 78, isEquity: false },
  { label: '30-100%', attachment: 30, detachment: 100, igBaseSpread: 4, hyBaseSpread: 28, itraxxBaseSpread: 3.5, xoverBaseSpread: 24, isEquity: false },
];

// Single-name basis reference entities
const SINGLE_NAME_ENTITIES = [
  { name: 'Ford Motor Co', ticker: 'F', sector: 'Automotive', baseCDS: 165, indexWeight: 0.80 },
  { name: 'General Electric', ticker: 'GE', sector: 'Industrials', baseCDS: 42, indexWeight: 0.80 },
  { name: 'AT&T Inc', ticker: 'T', sector: 'Telecommunications', baseCDS: 68, indexWeight: 0.80 },
  { name: 'JPMorgan Chase', ticker: 'JPM', sector: 'Financials', baseCDS: 48, indexWeight: 0.80 },
  { name: 'Goldman Sachs', ticker: 'GS', sector: 'Financials', baseCDS: 58, indexWeight: 0.80 },
  { name: 'Verizon Communications', ticker: 'VZ', sector: 'Telecommunications', baseCDS: 55, indexWeight: 0.80 },
  { name: 'Boeing Co', ticker: 'BA', sector: 'Aerospace', baseCDS: 142, indexWeight: 0.80 },
  { name: 'Morgan Stanley', ticker: 'MS', sector: 'Financials', baseCDS: 52, indexWeight: 0.80 },
  { name: 'Pfizer Inc', ticker: 'PFE', sector: 'Healthcare', baseCDS: 35, indexWeight: 0.80 },
  { name: 'Kraft Heinz Co', ticker: 'KHC', sector: 'Consumer', baseCDS: 112, indexWeight: 0.80 },
  { name: 'Occidental Petroleum', ticker: 'OXY', sector: 'Energy', baseCDS: 95, indexWeight: 0.80 },
  { name: 'Caterpillar Inc', ticker: 'CAT', sector: 'Industrials', baseCDS: 38, indexWeight: 0.80 },
  { name: 'Dow Inc', ticker: 'DOW', sector: 'Materials', baseCDS: 72, indexWeight: 0.80 },
  { name: 'CVS Health', ticker: 'CVS', sector: 'Healthcare', baseCDS: 78, indexWeight: 0.80 },
  { name: 'Walt Disney Co', ticker: 'DIS', sector: 'Media', baseCDS: 45, indexWeight: 0.80 },
] as const;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-index-tranches'));

  // ── 1. Index Overview ──

  const indexOverview = INDEX_DEFS.map((def) => {
    const spread = round(jitter(def.baseSpread, 0.08, rng), 2);
    const dailyChange = round((rng() - 0.5) * def.baseSpread * 0.04, 2);
    const weeklyChange = round((rng() - 0.5) * def.baseSpread * 0.08, 2);
    const monthlyChange = round((rng() - 0.5) * def.baseSpread * 0.15, 2);
    const dv01 = round(rangef(3800, 4600, rng), 0);
    const notionalOutstanding = round(rangef(80, 220, rng), 1);

    return {
      name: def.name,
      ticker: def.ticker,
      region: def.region,
      series: def.series,
      maturity: def.maturity,
      coupon: def.coupon,
      constituents: def.constituents,
      spread,
      dailyChange,
      weeklyChange,
      monthlyChange,
      spreadUnit: 'bps',
      dv01,
      dv01Unit: 'USD per 10M notional',
      notionalOutstanding,
      notionalOutstandingUnit: 'B USD',
    };
  });

  // ── 2. Tranche Spreads ──

  const trancheSpreads = INDEX_DEFS.map((indexDef) => {
    const tranches = TRANCHE_BASE_DEFS.map((trDef) => {
      let baseSpread: number;
      switch (indexDef.ticker) {
        case 'CDX.NA.IG': baseSpread = trDef.igBaseSpread; break;
        case 'CDX.NA.HY': baseSpread = trDef.hyBaseSpread; break;
        case 'ITRAXX.EUR': baseSpread = trDef.itraxxBaseSpread; break;
        case 'ITRAXX.XOVER': baseSpread = trDef.xoverBaseSpread; break;
        default: baseSpread = trDef.igBaseSpread;
      }

      if (trDef.isEquity) {
        // Equity tranche quoted as upfront percentage + running 500 bps
        const upfrontPct = round(rangef(18, 45, rng), 2);
        const dailyChange = round((rng() - 0.5) * 2.5, 2);
        return {
          label: trDef.label,
          attachment: trDef.attachment,
          detachment: trDef.detachment,
          quotingConvention: 'upfront',
          upfrontPct,
          runningSpread: 500,
          dailyChange,
          spreadUnit: 'bps / % upfront',
        };
      }

      const spread = round(jitter(baseSpread, 0.10, rng), 2);
      const dailyChange = round((rng() - 0.5) * baseSpread * 0.05, 2);

      return {
        label: trDef.label,
        attachment: trDef.attachment,
        detachment: trDef.detachment,
        quotingConvention: 'running',
        spread,
        upfrontPct: 0,
        runningSpread: spread,
        dailyChange,
        spreadUnit: 'bps',
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      tranches,
    };
  });

  // ── 3. Base Correlation Curve ──

  const baseCorrelationCurve = INDEX_DEFS.map((indexDef) => {
    const baseCorrelations = [
      { detachment: 3, baseCorr: indexDef.ticker.includes('HY') ? 18 : 22 },
      { detachment: 7, baseCorr: indexDef.ticker.includes('HY') ? 28 : 34 },
      { detachment: 15, baseCorr: indexDef.ticker.includes('HY') ? 42 : 50 },
      { detachment: 30, baseCorr: indexDef.ticker.includes('HY') ? 58 : 68 },
      { detachment: 100, baseCorr: indexDef.ticker.includes('HY') ? 72 : 82 },
    ];

    const points = baseCorrelations.map((pt) => {
      const correlation = round(jitter(pt.baseCorr, 0.05, rng), 2);
      const dailyChange = round((rng() - 0.5) * 0.8, 2);
      return {
        detachmentPct: pt.detachment,
        correlation,
        dailyChange,
        unit: '%',
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      points,
    };
  });

  // ── 4. Implied Correlation Skew ──

  const impliedCorrelationSkew = INDEX_DEFS.map((indexDef) => {
    const skewPoints = TRANCHE_BASE_DEFS.map((trDef) => {
      const baseImpliedCorr = trDef.isEquity
        ? rangef(15, 25, rng)
        : rangef(20 + trDef.attachment * 1.5, 35 + trDef.attachment * 1.2, rng);
      const impliedCorrelation = round(baseImpliedCorr, 2);
      const compoundCorrelation = round(impliedCorrelation * rangef(0.85, 1.05, rng), 2);
      const skewVsATM = round(impliedCorrelation - rangef(28, 35, rng), 2);

      return {
        tranche: trDef.label,
        attachment: trDef.attachment,
        detachment: trDef.detachment,
        impliedCorrelation,
        compoundCorrelation,
        skewVsATM,
        unit: '%',
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      skewPoints,
    };
  });

  // ── 5. Tranche Delta and Leverage ──

  const trancheDeltaLeverage = INDEX_DEFS.map((indexDef) => {
    const metrics = TRANCHE_BASE_DEFS.map((trDef) => {
      // Equity tranches have highest delta and leverage
      let baseDelta: number;
      let baseLeverage: number;
      if (trDef.isEquity) {
        baseDelta = rangef(14, 18, rng);
        baseLeverage = rangef(28, 38, rng);
      } else if (trDef.attachment === 3) {
        baseDelta = rangef(7, 10, rng);
        baseLeverage = rangef(10, 16, rng);
      } else if (trDef.attachment === 7) {
        baseDelta = rangef(3, 5, rng);
        baseLeverage = rangef(4, 7, rng);
      } else if (trDef.attachment === 15) {
        baseDelta = rangef(0.8, 1.8, rng);
        baseLeverage = rangef(1.5, 3, rng);
      } else {
        baseDelta = rangef(0.1, 0.5, rng);
        baseLeverage = rangef(0.3, 0.8, rng);
      }

      const delta = round(baseDelta, 3);
      const leverage = round(baseLeverage, 2);
      const gamma = round(delta * rangef(0.02, 0.08, rng), 4);
      const theta = round(rangef(-0.5, -0.01, rng), 4);
      const cs01 = round(rangef(200, 12000, rng) * (trDef.isEquity ? 5 : (1 + trDef.attachment / 10)), 0);

      return {
        tranche: trDef.label,
        attachment: trDef.attachment,
        detachment: trDef.detachment,
        delta,
        leverage,
        gamma,
        theta,
        cs01,
        cs01Unit: 'USD per bp per 10M notional',
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      metrics,
    };
  });

  // ── 6. Expected Loss by Tranche ──

  const expectedLossByTranche = INDEX_DEFS.map((indexDef) => {
    const isHY = indexDef.ticker.includes('HY') || indexDef.ticker.includes('XOVER');
    const trancheLoss = TRANCHE_BASE_DEFS.map((trDef) => {
      let baseEL: number;
      if (trDef.isEquity) {
        baseEL = isHY ? rangef(35, 55, rng) : rangef(18, 30, rng);
      } else if (trDef.attachment === 3) {
        baseEL = isHY ? rangef(8, 18, rng) : rangef(2, 6, rng);
      } else if (trDef.attachment === 7) {
        baseEL = isHY ? rangef(1.5, 5, rng) : rangef(0.2, 1.2, rng);
      } else if (trDef.attachment === 15) {
        baseEL = isHY ? rangef(0.2, 1.2, rng) : rangef(0.01, 0.15, rng);
      } else {
        baseEL = isHY ? rangef(0.01, 0.1, rng) : rangef(0, 0.02, rng);
      }

      const expectedLoss = round(baseEL, 4);
      const stressedEL = round(expectedLoss * rangef(2.0, 4.5, rng), 4);
      const protectionValue = round(rangef(0.5, 15, rng) * (trDef.isEquity ? 3 : 1), 2);

      return {
        tranche: trDef.label,
        attachment: trDef.attachment,
        detachment: trDef.detachment,
        expectedLoss,
        stressedEL,
        expectedLossUnit: '%',
        protectionValue,
        protectionValueUnit: 'pts',
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      trancheLoss,
    };
  });

  // ── 7. Roll Analysis (On-the-Run vs Off-the-Run) ──

  const rollAnalysis = INDEX_DEFS.map((indexDef) => {
    const onTheRunSeries = indexDef.series;
    const offTheRunSeries = indexDef.series - 1;
    const onTheRunSpread = round(jitter(indexDef.baseSpread, 0.06, rng), 2);
    const offTheRunSpread = round(onTheRunSpread + rangef(-3, 5, rng), 2);
    const rollSpread = round(onTheRunSpread - offTheRunSpread, 2);
    const rollDirection = rollSpread > 0 ? 'Positive' : rollSpread < 0 ? 'Negative' : 'Flat';
    const onTheRunLiquidity = round(rangef(8, 25, rng), 1);
    const offTheRunLiquidity = round(onTheRunLiquidity * rangef(0.3, 0.6, rng), 1);
    const onTheRunBidAsk = round(rangef(0.25, 1.5, rng), 2);
    const offTheRunBidAsk = round(onTheRunBidAsk * rangef(1.5, 3.0, rng), 2);
    const rollDate = `${new Date().getFullYear()}-${rng() > 0.5 ? '09' : '03'}-20`;
    const daysToRoll = Math.floor(rangef(15, 120, rng));

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      onTheRun: {
        series: onTheRunSeries,
        spread: onTheRunSpread,
        dailyVolume: onTheRunLiquidity,
        dailyVolumeUnit: 'B USD',
        bidAskSpread: onTheRunBidAsk,
        bidAskUnit: 'bps',
      },
      offTheRun: {
        series: offTheRunSeries,
        spread: offTheRunSpread,
        dailyVolume: offTheRunLiquidity,
        dailyVolumeUnit: 'B USD',
        bidAskSpread: offTheRunBidAsk,
        bidAskUnit: 'bps',
      },
      rollSpread,
      rollDirection,
      rollDate,
      daysToRoll,
      spreadUnit: 'bps',
    };
  });

  // ── 8. Single-Name vs Index Basis ──

  const singleNameBasis = SINGLE_NAME_ENTITIES.map((entity) => {
    const singleNameSpread = round(jitter(entity.baseCDS, 0.12, rng), 2);
    // Implied spread from index contribution
    const indexImpliedSpread = round(singleNameSpread + rangef(-15, 15, rng), 2);
    const basis = round(singleNameSpread - indexImpliedSpread, 2);
    const basisDirection = basis > 0 ? 'Positive (CDS wider)' : 'Negative (Index wider)';
    const zScore = round((rng() - 0.5) * 4, 2);
    const percentile30d = round(rangef(5, 95, rng), 0);
    const dailyChange = round((rng() - 0.5) * 6, 2);

    return {
      entity: entity.name,
      ticker: entity.ticker,
      sector: entity.sector,
      singleNameSpread,
      indexImpliedSpread,
      basis,
      basisDirection,
      zScore,
      percentile30d,
      dailyChange,
      spreadUnit: 'bps',
    };
  });

  // ── 9. Historical Tranche Spread Series (30 days) ──

  const historicalTrancheSpreads = INDEX_DEFS.map((indexDef) => {
    const series = TRANCHE_BASE_DEFS.map((trDef) => {
      let baseVal: number;
      switch (indexDef.ticker) {
        case 'CDX.NA.IG': baseVal = trDef.isEquity ? 32 : trDef.igBaseSpread; break;
        case 'CDX.NA.HY': baseVal = trDef.isEquity ? 42 : trDef.hyBaseSpread; break;
        case 'ITRAXX.EUR': baseVal = trDef.isEquity ? 30 : trDef.itraxxBaseSpread; break;
        case 'ITRAXX.XOVER': baseVal = trDef.isEquity ? 38 : trDef.xoverBaseSpread; break;
        default: baseVal = trDef.igBaseSpread;
      }

      const today = new Date();
      let running = baseVal;
      const dataPoints: { date: string; value: number }[] = [];

      for (let d = 29; d >= 0; d--) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - d);
        const dateStr = dt.toISOString().slice(0, 10);
        // Random walk
        running = running + (rng() - 0.5) * baseVal * 0.03;
        if (running < 0) running = Math.abs(running) + 0.5;
        dataPoints.push({
          date: dateStr,
          value: round(running, 2),
        });
      }

      return {
        tranche: trDef.label,
        isEquity: trDef.isEquity,
        valueUnit: trDef.isEquity ? '% upfront' : 'bps',
        dataPoints,
      };
    });

    return {
      indexTicker: indexDef.ticker,
      indexName: indexDef.name,
      series,
    };
  });

  return {
    indexOverview,
    trancheSpreads,
    baseCorrelationCurve,
    impliedCorrelationSkew,
    trancheDeltaLeverage,
    expectedLossByTranche,
    rollAnalysis,
    singleNameBasis,
    historicalTrancheSpreads,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CreditIndexTranches] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate credit index tranches data' });
  }
});

export default router;
