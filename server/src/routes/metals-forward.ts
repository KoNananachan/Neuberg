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

// LME base metals + precious metals
const METALS = [
  { name: 'Copper', unit: '$/t', baseSpot: 9250, bias: -1, avgOI: 32, stocksDays: 4.2, cancelledPct: 12 },
  { name: 'Aluminum', unit: '$/t', baseSpot: 2380, bias: 1, avgOI: 28, stocksDays: 18.5, cancelledPct: 8 },
  { name: 'Zinc', unit: '$/t', baseSpot: 2650, bias: 0.3, avgOI: 14, stocksDays: 7.8, cancelledPct: 15 },
  { name: 'Nickel', unit: '$/t', baseSpot: 16800, bias: 0.5, avgOI: 9, stocksDays: 5.1, cancelledPct: 22 },
  { name: 'Gold', unit: '$/oz', baseSpot: 2340, bias: 1.5, avgOI: 85, stocksDays: 0, cancelledPct: 0 },
  { name: 'Silver', unit: '$/oz', baseSpot: 29.5, bias: 0.8, avgOI: 18, stocksDays: 0, cancelledPct: 0 },
] as const;

const TENORS = ['Cash', '3M', '6M', '12M', '15M', '27M'] as const;
const TENOR_MONTHS = [0, 3, 6, 12, 15, 27] as const;

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-metals-forward'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // ── Curves ──
  const curves = METALS.map(m => {
    const spotPrice = round2(jitter(m.baseSpot, 0.04));
    const isPerOunce = m.unit === '$/oz';

    const tenors = TENORS.map((tenor, i) => {
      const monthsOut = TENOR_MONTHS[i];
      if (monthsOut === 0) {
        return {
          tenor,
          price: spotPrice,
          spreadToCash: 0,
          annualizedCarry: 0,
          change1d: round2((rng() - 0.5) * spotPrice * 0.012),
        };
      }
      // bias > 0 => contango, bias < 0 => backwardation
      const annualSpread = m.bias * spotPrice * 0.01;
      const spreadToCash = round2(annualSpread * (monthsOut / 12) + (rng() - 0.5) * spotPrice * 0.003);
      const price = round2(spotPrice + spreadToCash);
      const annualizedCarry = monthsOut > 0 ? round4((spreadToCash / spotPrice) * (12 / monthsOut) * 100) : 0;
      const change1d = round2((rng() - 0.5) * spotPrice * 0.01);
      return { tenor, price, spreadToCash, annualizedCarry, change1d };
    });

    return {
      metal: m.name,
      spotPrice,
      unit: m.unit,
      tenors,
    };
  });

  // ── Curve Analysis ──
  const curveAnalysis = curves.map(c => {
    const cashPrice = c.tenors[0].price;
    const threeM = c.tenors[1];
    const twelveM = c.tenors[3];

    const cashTo3m = cashPrice !== 0 ? round4((threeM.spreadToCash / cashPrice) * 100) : 0;
    const threeMonthTo12m = threeM.price !== 0 ? round4(((twelveM.price - threeM.price) / threeM.price) * 100) : 0;

    const totalMonths = 27;
    const backTenor = c.tenors[c.tenors.length - 1];
    const steepness = totalMonths > 0 ? round2((backTenor.spreadToCash / cashPrice) * 10000 / totalMonths) : 0; // bp/month

    let structure: 'Contango' | 'Backwardation' | 'Flat';
    if (Math.abs(cashTo3m) < 0.05) {
      structure = 'Flat';
    } else if (threeM.price > cashPrice) {
      structure = 'Contango';
    } else {
      structure = 'Backwardation';
    }

    const historicalPercentile = round2(rng() * 100);

    let signal: 'Carry Trade' | 'Physical Premium' | 'Neutral';
    if (structure === 'Contango' && Math.abs(cashTo3m) > 0.3) {
      signal = 'Carry Trade';
    } else if (structure === 'Backwardation' && Math.abs(cashTo3m) > 0.3) {
      signal = 'Physical Premium';
    } else {
      signal = 'Neutral';
    }

    return {
      metal: c.metal,
      structure,
      steepness,
      cashTo3mSpread: cashTo3m,
      threeMonthTo12mSpread: threeMonthTo12m,
      historicalPercentile,
      signal,
    };
  });

  // ── Summary ──
  const contangos = curveAnalysis.filter(a => a.structure === 'Contango');
  const backwardations = curveAnalysis.filter(a => a.structure === 'Backwardation');
  const carries = curves.flatMap(c => c.tenors.filter(t => t.tenor === '3M').map(t => t.annualizedCarry));
  const avgContango = carries.length > 0
    ? round4(carries.reduce((s, v) => s + v, 0) / carries.length)
    : 0;
  const avgCarry = round4(
    curves.reduce((s, c) => {
      const t12 = c.tenors.find(t => t.tenor === '12M');
      return s + (t12 ? t12.annualizedCarry : 0);
    }, 0) / curves.length,
  );

  const mostBackwardated = curveAnalysis.reduce((a, b) => a.cashTo3mSpread < b.cashTo3mSpread ? a : b);
  const mostContango = curveAnalysis.reduce((a, b) => a.cashTo3mSpread > b.cashTo3mSpread ? a : b);

  const totalOI = round2(
    METALS.reduce((s, m) => s + jitter(m.avgOI, 0.1), 0),
  );

  const summary = {
    avgContango,
    mostBackwardated: mostBackwardated.metal,
    mostContango: mostContango.metal,
    totalOI,
    avgCarry,
  };

  // ── Warehouse Impact ──
  const warehouseImpact = METALS.map(m => {
    const stocksDays = m.stocksDays > 0 ? round2(jitter(m.stocksDays, 0.15)) : 0;
    const cancelledWarrants = m.cancelledPct > 0 ? round2(jitter(m.cancelledPct, 0.2)) : 0;
    const stockChange1m = round2((rng() - 0.5) * 20);
    const priceImpact = round4((rng() - 0.5) * 1.2);
    return {
      metal: m.name,
      stocksDays,
      cancelledWarrants,
      stockChange1m,
      priceImpact,
    };
  });

  // ── Spread Trades ──
  const spreadCandidates = [
    { metal: 'Copper', spread: 'Cash-3M' },
    { metal: 'Copper', spread: '3M-12M' },
    { metal: 'Aluminum', spread: 'Cash-3M' },
    { metal: 'Aluminum', spread: '3M-12M' },
    { metal: 'Zinc', spread: 'Cash-3M' },
    { metal: 'Nickel', spread: 'Cash-3M' },
    { metal: 'Gold', spread: 'Cash-3M' },
    { metal: 'Gold', spread: '3M-12M' },
    { metal: 'Silver', spread: 'Cash-3M' },
  ];

  // Shuffle and pick top 4
  for (let i = spreadCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [spreadCandidates[i], spreadCandidates[j]] = [spreadCandidates[j], spreadCandidates[i]];
  }
  const topSpreads = spreadCandidates.slice(0, 4);

  const spreadTrades = topSpreads.map(sc => {
    const curve = curves.find(c => c.metal === sc.metal);
    let value = 0;
    let annualizedReturn = 0;

    if (curve) {
      const parts = sc.spread.split('-');
      const near = curve.tenors.find(t => t.tenor === parts[0]);
      const far = curve.tenors.find(t => t.tenor === parts[1]);
      if (near && far) {
        value = round2(near.price - far.price);
        const monthsSpan = (TENOR_MONTHS[TENORS.indexOf(far.tenor as typeof TENORS[number])] - TENOR_MONTHS[TENORS.indexOf(near.tenor as typeof TENORS[number])]);
        annualizedReturn = monthsSpan > 0 ? round4((value / near.price) * (12 / monthsSpan) * 100) : 0;
      }
    }

    const change1w = round2((rng() - 0.5) * Math.abs(value) * 0.3);
    const direction = value > 0 ? 'Short' : 'Long';

    return {
      metal: sc.metal,
      spread: sc.spread,
      value,
      change1w,
      annualizedReturn,
      direction,
    };
  });

  return {
    summary,
    curves,
    curveAnalysis,
    warehouseImpact,
    spreadTrades,
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
    console.error('[MetalsForward] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate metals forward curve data' });
  }
});

export default router;
