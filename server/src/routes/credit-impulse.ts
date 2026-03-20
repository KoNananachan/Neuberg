import { Router } from 'express';

const router = Router();

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ── Seed Data ──

const COUNTRIES_IMPULSE = [
  { country: 'US', baseImpulse: 1.8, min: -2, max: 4 },
  { country: 'China', baseImpulse: 3.2, min: -1, max: 6 },
  { country: 'Eurozone', baseImpulse: 0.8, min: -1.5, max: 3 },
  { country: 'Japan', baseImpulse: 0.3, min: -1, max: 2 },
  { country: 'UK', baseImpulse: 1.0, min: -1.5, max: 3 },
  { country: 'Australia', baseImpulse: 1.4, min: -1, max: 3.5 },
] as const;

const LENDING_CATEGORIES = [
  { category: 'C&I Loans', baseTightening: 12, baseDemand: -5, baseDelinquency: 1.2 },
  { category: 'CRE', baseTightening: 28, baseDemand: -18, baseDelinquency: 2.1 },
  { category: 'Consumer', baseTightening: 8, baseDemand: 5, baseDelinquency: 2.8 },
  { category: 'Mortgage', baseTightening: 15, baseDemand: -10, baseDelinquency: 1.8 },
  { category: 'Auto', baseTightening: 18, baseDemand: -8, baseDelinquency: 3.2 },
  { category: 'Credit Card', baseTightening: 10, baseDemand: 12, baseDelinquency: 3.8 },
] as const;

const MONEY_SUPPLY_DATA = [
  { measure: 'M1', country: 'US', baseLevel: 18.2, baseYoY: 0.5 },
  { measure: 'M2', country: 'US', baseLevel: 21.0, baseYoY: 0.8 },
  { measure: 'M1', country: 'China', baseLevel: 68.5, baseYoY: 4.2 },
  { measure: 'M2', country: 'China', baseLevel: 42.3, baseYoY: 9.8 },
  { measure: 'M3', country: 'China', baseLevel: 48.1, baseYoY: 10.2 },
  { measure: 'M1', country: 'Eurozone', baseLevel: 9.8, baseYoY: -0.5 },
  { measure: 'M2', country: 'Eurozone', baseLevel: 15.2, baseYoY: 1.2 },
  { measure: 'M3', country: 'Eurozone', baseLevel: 16.4, baseYoY: 1.8 },
  { measure: 'M1', country: 'Japan', baseLevel: 10.1, baseYoY: 1.5 },
  { measure: 'M2', country: 'Japan', baseLevel: 12.3, baseYoY: 2.1 },
  { measure: 'M3', country: 'Japan', baseLevel: 15.8, baseYoY: 2.5 },
  { measure: 'M1', country: 'UK', baseLevel: 2.4, baseYoY: -1.2 },
  { measure: 'M2', country: 'UK', baseLevel: 3.1, baseYoY: 0.3 },
] as const;

const FCI_INDICES = [
  { index: 'Chicago Fed FCI', baseValue: -0.25, min: -0.8, max: 0.6, inverted: true },
  { index: 'Goldman Sachs FCI', baseValue: 99.8, min: 98.5, max: 101.5, inverted: false },
  { index: 'Bloomberg FCI', baseValue: 0.15, min: -0.5, max: 0.8, inverted: false },
] as const;

const CREDIT_GROWTH_SECTORS = [
  { sector: 'Corporate', country: 'US', baseGrowth: 3.2, baseLevel: 12.8 },
  { sector: 'Household', country: 'US', baseGrowth: 2.8, baseLevel: 17.5 },
  { sector: 'Government', country: 'US', baseGrowth: 6.5, baseLevel: 34.2 },
  { sector: 'Total Private', country: 'US', baseGrowth: 3.0, baseLevel: 30.3 },
  { sector: 'Corporate', country: 'China', baseGrowth: 8.5, baseLevel: 22.1 },
  { sector: 'Household', country: 'China', baseGrowth: 6.2, baseLevel: 11.4 },
  { sector: 'Total Private', country: 'China', baseGrowth: 7.8, baseLevel: 33.5 },
  { sector: 'Corporate', country: 'Eurozone', baseGrowth: 1.5, baseLevel: 11.2 },
  { sector: 'Household', country: 'Eurozone', baseGrowth: 1.8, baseLevel: 7.6 },
  { sector: 'Total Private', country: 'Eurozone', baseGrowth: 1.6, baseLevel: 18.8 },
] as const;

const SLOOS_LOAN_TYPES = [
  { loanType: 'Large & Medium C&I', baseTightening: 14, baseDemand: -8 },
  { loanType: 'Small C&I', baseTightening: 18, baseDemand: -12 },
  { loanType: 'CRE - Construction', baseTightening: 32, baseDemand: -22 },
  { loanType: 'CRE - Multifamily', baseTightening: 25, baseDemand: -15 },
  { loanType: 'Residential Mortgage - QM', baseTightening: 10, baseDemand: -5 },
  { loanType: 'Residential Mortgage - Non-QM', baseTightening: 22, baseDemand: -18 },
  { loanType: 'Auto Loans', baseTightening: 16, baseDemand: -6 },
  { loanType: 'Credit Card', baseTightening: 12, baseDemand: 8 },
  { loanType: 'Other Consumer', baseTightening: 14, baseDemand: -3 },
] as const;

// ── Cache ──

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-impulse'));
  const jitter = (base: number, pct: number) =>
    base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  // ── 1. Credit Impulse ──

  const creditImpulse = COUNTRIES_IMPULSE.map((c) => {
    const impulse = roundTo(
      clamp(jitter(c.baseImpulse, 0.8), c.min, c.max),
      2
    );
    const priorQuarter = roundTo(
      clamp(jitter(c.baseImpulse, 0.6), c.min, c.max),
      2
    );
    const change = roundTo(impulse - priorQuarter, 2);
    let trend: 'expanding' | 'contracting' | 'neutral';
    if (change > 0.3) trend = 'expanding';
    else if (change < -0.3) trend = 'contracting';
    else trend = 'neutral';

    return {
      country: c.country,
      impulse,
      priorQuarter,
      change,
      trend,
    };
  });

  // ── 2. Bank Lending Survey ──

  const bankLendingSurvey = LENDING_CATEGORIES.map((cat) => {
    const tightening = roundTo(jitter(cat.baseTightening, 0.5), 1);
    const demand = roundTo(jitter(cat.baseDemand, 0.6), 1);
    const delinquencyRate = roundTo(
      Math.max(0, jitter(cat.baseDelinquency, 0.25)),
      2
    );
    const changeQoQ = roundTo((rng() - 0.45) * 8, 2);

    return {
      category: cat.category,
      tightening,
      demand,
      delinquencyRate,
      changeQoQ,
    };
  });

  // ── 3. Money Supply ──

  const moneySupply = MONEY_SUPPLY_DATA.map((ms) => {
    const level = roundTo(jitter(ms.baseLevel, 0.05), 2);
    const yoyGrowth = roundTo(
      ms.country === 'US'
        ? clamp(jitter(ms.baseYoY, 1.0), -1, 3)
        : jitter(ms.baseYoY, 0.4),
      2
    );
    const momGrowth = roundTo((rng() - 0.4) * 1.2, 2);

    return {
      measure: ms.measure,
      country: ms.country,
      level,
      yoyGrowth,
      momGrowth,
    };
  });

  // ── 4. Financial Conditions ──

  const financialConditions = FCI_INDICES.map((fci) => {
    const value = roundTo(
      clamp(jitter(fci.baseValue, 0.6), fci.min, fci.max),
      3
    );
    const change = roundTo((rng() - 0.48) * 0.15, 3);
    const percentile = roundTo(rng() * 100, 1);

    let signal: 'tight' | 'loose' | 'neutral';
    if (fci.inverted) {
      // Chicago Fed: negative = loose, positive = tight
      if (value < -0.3) signal = 'loose';
      else if (value > 0.2) signal = 'tight';
      else signal = 'neutral';
    } else {
      if (percentile > 65) signal = 'tight';
      else if (percentile < 35) signal = 'loose';
      else signal = 'neutral';
    }

    return {
      index: fci.index,
      value,
      change,
      signal,
      percentile,
    };
  });

  // ── 5. Credit Growth ──

  const creditGrowth = CREDIT_GROWTH_SECTORS.map((cg) => {
    const yoyGrowth = roundTo(jitter(cg.baseGrowth, 0.4), 2);
    const level = roundTo(jitter(cg.baseLevel, 0.06), 2);

    let trend: 'accelerating' | 'decelerating' | 'stable';
    const delta = yoyGrowth - cg.baseGrowth;
    if (delta > 0.5) trend = 'accelerating';
    else if (delta < -0.5) trend = 'decelerating';
    else trend = 'stable';

    return {
      sector: cg.sector,
      country: cg.country,
      yoyGrowth,
      level,
      trend,
    };
  });

  // ── 6. Senior Loan Officer Survey ──

  const seniorLoanOfficerSurvey = SLOOS_LOAN_TYPES.map((slo) => {
    const tighteningPct = roundTo(jitter(slo.baseTightening, 0.5), 1);
    const demandPct = roundTo(jitter(slo.baseDemand, 0.6), 1);
    const priorSurvey = roundTo(jitter(slo.baseTightening, 0.35), 1);
    const change = roundTo(tighteningPct - priorSurvey, 1);

    return {
      loanType: slo.loanType,
      tighteningPct,
      demandPct,
      priorSurvey,
      change,
    };
  });

  return {
    creditImpulse,
    bankLendingSurvey,
    moneySupply,
    financialConditions,
    creditGrowth,
    seniorLoanOfficerSurvey,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CreditImpulse] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit impulse data' });
  }
});

export default router;
