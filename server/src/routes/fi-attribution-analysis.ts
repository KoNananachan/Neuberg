import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Seeded PRNG --

// -- Types --

interface PortfolioSummary {
  totalReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  duration: number;
  modifiedDuration: number;
  convexity: number;
  yield: number;
  spread: number;
  numPositions: number;
}

interface SectorData {
  name: string;
  weight: number;
  return: number;
  benchmarkReturn: number;
  excessReturn: number;
  contribution: number;
  duration: number;
  spread: number;
  rating: string;
}

interface AttributionComponent {
  value: number;
  benchmark: number;
}

interface AttributionDecomposition {
  income: AttributionComponent;
  treasuryCurve: AttributionComponent;
  creditSpread: AttributionComponent;
  mortgageSpread: AttributionComponent;
  fxEffect: AttributionComponent;
  selection: AttributionComponent;
  residual: AttributionComponent;
}

interface BondContributor {
  isin: string;
  issuer: string;
  coupon: number;
  maturity: string;
  sector: string;
  contribution: number;
  totalReturn: number;
  weight: number;
}

interface AnalysisSummary {
  totalExcess: number;
  biggestContributor: string;
  biggestDetractor: string;
  durationBet: string;
  spreadDuration: number;
}

interface FIAttributionResponse {
  portfolio: PortfolioSummary;
  sectors: SectorData[];
  attribution: AttributionDecomposition;
  topContributors: BondContributor[];
  summary: AnalysisSummary;
  generatedAt: string;
}

// -- Static Definitions --

const SECTOR_DEFS = [
  { name: 'Government',    baseWeight: 28, baseDuration: 6.2, baseSpread: 0,   rating: 'AAA' },
  { name: 'IG Corporate',  baseWeight: 22, baseDuration: 5.8, baseSpread: 115, rating: 'A-' },
  { name: 'HY Corporate',  baseWeight: 10, baseDuration: 3.9, baseSpread: 385, rating: 'BB' },
  { name: 'MBS',           baseWeight: 15, baseDuration: 4.5, baseSpread: 55,  rating: 'AA+' },
  { name: 'ABS',           baseWeight: 6,  baseDuration: 2.3, baseSpread: 80,  rating: 'AA' },
  { name: 'CMBS',          baseWeight: 5,  baseDuration: 3.8, baseSpread: 125, rating: 'A' },
  { name: 'EM Debt',       baseWeight: 8,  baseDuration: 5.1, baseSpread: 290, rating: 'BBB-' },
  { name: 'Municipal',     baseWeight: 6,  baseDuration: 5.5, baseSpread: 45,  rating: 'AA' },
] as const;

const BOND_UNIVERSE = [
  // Positive contributors
  { isin: 'US912810TM53', issuer: 'US Treasury', coupon: 4.25, maturity: '2034-11-15', sector: 'Government' },
  { isin: 'US06051GLE16', issuer: 'Bank of America', coupon: 5.015, maturity: '2033-07-22', sector: 'IG Corporate' },
  { isin: 'US478160CD78', issuer: 'Johnson & Johnson', coupon: 4.90, maturity: '2033-06-01', sector: 'IG Corporate' },
  { isin: 'US31418EBN76', issuer: 'FNMA Pool', coupon: 5.50, maturity: '2053-01-01', sector: 'MBS' },
  { isin: 'XS2592659513', issuer: 'Republic of Indonesia', coupon: 5.65, maturity: '2033-04-11', sector: 'EM Debt' },
  // Negative contributors
  { isin: 'US172967PD98', issuer: 'Citigroup', coupon: 3.106, maturity: '2028-04-08', sector: 'IG Corporate' },
  { isin: 'US345370DA14', issuer: 'Ford Motor Credit', coupon: 7.35, maturity: '2030-11-04', sector: 'HY Corporate' },
  { isin: 'US3137FTAG26', issuer: 'FHLMC Pool', coupon: 3.00, maturity: '2052-03-01', sector: 'MBS' },
  { isin: 'XS1843437922', issuer: 'Republic of Turkey', coupon: 7.625, maturity: '2029-04-26', sector: 'EM Debt' },
  { isin: 'USU75000AB85', issuer: 'Teva Pharmaceutical', coupon: 6.75, maturity: '2028-03-01', sector: 'HY Corporate' },
] as const;

// -- Cache --


let cache: { data: FIAttributionResponse; ts: number } | null = null;

// -- Generator --

function generate(): FIAttributionResponse {
  const rng = seededRandom('fi-attribution-analysis');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // -- Sectors --
  const rawWeights = SECTOR_DEFS.map(s => jitter(s.baseWeight, 0.15));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);

  const sectors: SectorData[] = SECTOR_DEFS.map((def, i) => {
    const weight = round2((rawWeights[i] / weightSum) * 100);
    // Modest monthly returns: Government ~0.2%, IG ~0.3%, HY ~0.5%, MBS ~0.2%, ABS ~0.25%, CMBS ~0.3%, EM ~0.4%, Muni ~0.2%
    const baseReturns = [0.20, 0.35, 0.55, 0.22, 0.28, 0.32, 0.45, 0.22];
    const sectorReturn = round3(jitter(baseReturns[i], 0.35));
    const benchReturn = round3(jitter(baseReturns[i] * 0.92, 0.30));
    const excessRet = round3(sectorReturn - benchReturn);
    const contribution = round2(weight * excessRet / 100 * 100); // in bps
    const duration = round2(jitter(def.baseDuration, 0.10));
    const spread = Math.round(jitter(def.baseSpread, 0.12));

    return {
      name: def.name,
      weight,
      return: sectorReturn,
      benchmarkReturn: benchReturn,
      excessReturn: excessRet,
      contribution,
      duration,
      spread,
      rating: def.rating,
    };
  });

  // -- Attribution Decomposition (in bps) --
  // Each component has a portfolio value and a benchmark value.
  // Total portfolio excess = sum of (value - benchmark) for all components.
  const incomeVal = round2(jitter(35, 0.15));
  const incomeBench = round2(jitter(32, 0.10));

  const treasuryCurveVal = round2(jitter(-8, 0.40));
  const treasuryCurveBench = round2(jitter(-10, 0.35));

  const creditSpreadVal = round2(jitter(12, 0.30));
  const creditSpreadBench = round2(jitter(8, 0.25));

  const mortgageSpreadVal = round2(jitter(3, 0.50));
  const mortgageSpreadBench = round2(jitter(2, 0.45));

  const fxVal = round2(jitter(-2, 0.60));
  const fxBench = round2(jitter(-1, 0.55));

  const selectionVal = round2(jitter(5, 0.35));
  const selectionBench = 0;

  // Calculate residual so that total excess = portfolio total - benchmark total
  const portTotal = incomeVal + treasuryCurveVal + creditSpreadVal + mortgageSpreadVal + fxVal + selectionVal;
  const benchTotal = incomeBench + treasuryCurveBench + creditSpreadBench + mortgageSpreadBench + fxBench + selectionBench;
  const targetExcessBps = round2(portTotal - benchTotal);
  // Residual is what makes total decomposition consistent
  const residualVal = round2(jitter(1, 0.80));
  const residualBench = round2(residualVal - (targetExcessBps - (portTotal + residualVal - benchTotal - residualVal)));

  // Recalculate for perfect consistency:
  // excess = sum(val) - sum(bench)
  // We want residual to absorb any rounding drift
  const sumValExResidual = incomeVal + treasuryCurveVal + creditSpreadVal + mortgageSpreadVal + fxVal + selectionVal;
  const sumBenchExResidual = incomeBench + treasuryCurveBench + creditSpreadBench + mortgageSpreadBench + fxBench + selectionBench;
  const actualResidualVal = round2(jitter(0.5, 0.90));
  const actualResidualBench = round2(actualResidualVal); // residual bench ~ same, so residual contribution ~ 0

  const totalPortBps = round2(sumValExResidual + actualResidualVal);
  const totalBenchBps = round2(sumBenchExResidual + actualResidualBench);
  const totalExcessBps = round2(totalPortBps - totalBenchBps);

  const attribution: AttributionDecomposition = {
    income:         { value: incomeVal, benchmark: incomeBench },
    treasuryCurve:  { value: treasuryCurveVal, benchmark: treasuryCurveBench },
    creditSpread:   { value: creditSpreadVal, benchmark: creditSpreadBench },
    mortgageSpread: { value: mortgageSpreadVal, benchmark: mortgageSpreadBench },
    fxEffect:       { value: fxVal, benchmark: fxBench },
    selection:      { value: selectionVal, benchmark: selectionBench },
    residual:       { value: actualResidualVal, benchmark: actualResidualBench },
  };

  // -- Portfolio Summary --
  const totalReturnPct = round3(totalPortBps / 100); // bps to %
  const benchReturnPct = round3(totalBenchBps / 100);
  const excessReturnPct = round3(totalExcessBps / 100);

  const portfolioDuration = round2(jitter(5.4, 0.08));
  const modifiedDuration = round2(portfolioDuration / (1 + jitter(0.045, 0.10)));
  const convexity = round2(jitter(0.45, 0.15));
  const portfolioYield = round3(jitter(4.85, 0.08));
  const portfolioSpread = Math.round(jitter(135, 0.12));

  const portfolio: PortfolioSummary = {
    totalReturn: totalReturnPct,
    benchmarkReturn: benchReturnPct,
    excessReturn: excessReturnPct,
    duration: portfolioDuration,
    modifiedDuration,
    convexity,
    yield: portfolioYield,
    spread: portfolioSpread,
    numPositions: Math.round(jitter(245, 0.10)),
  };

  // -- Top Contributors (5 positive, 5 negative) --
  const topContributors: BondContributor[] = BOND_UNIVERSE.map((bond, i) => {
    const isPositive = i < 5;
    const baseContrib = isPositive ? jitter(3 + (5 - i) * 1.5, 0.25) : jitter(-(3 + (i - 4) * 1.2), 0.25);
    const contrib = round2(baseContrib); // in bps
    const baseTotalReturn = isPositive ? jitter(0.8 + (5 - i) * 0.25, 0.20) : jitter(-(0.3 + (i - 4) * 0.2), 0.30);
    const totalReturn = round3(baseTotalReturn);
    const baseWeightVal = isPositive ? jitter(2.5 + (5 - i) * 0.6, 0.15) : jitter(1.5 + (i - 4) * 0.4, 0.15);
    const weight = round3(baseWeightVal);

    return {
      isin: bond.isin,
      issuer: bond.issuer,
      coupon: bond.coupon,
      maturity: bond.maturity,
      sector: bond.sector,
      contribution: contrib,
      totalReturn,
      weight,
    };
  });

  // Sort: top 5 positive (descending), then bottom 5 negative (ascending)
  const positive = topContributors.filter(b => b.contribution > 0).sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  const negative = topContributors.filter(b => b.contribution < 0).sort((a, b) => a.contribution - b.contribution).slice(0, 5);
  const sortedContributors = [...positive, ...negative];

  // -- Summary --
  const sectorsByExcess = [...sectors].sort((a, b) => b.excessReturn - a.excessReturn);
  const benchmarkDuration = round2(jitter(5.2, 0.08));
  const durationDiff = round2(portfolioDuration - benchmarkDuration);
  const durationBetLabel = durationDiff > 0 ? `Overweight +${durationDiff}yr` : `Underweight ${durationDiff}yr`;
  const spreadDuration = round2(jitter(4.1, 0.10));

  const summary: AnalysisSummary = {
    totalExcess: totalExcessBps,
    biggestContributor: sectorsByExcess[0].name,
    biggestDetractor: sectorsByExcess[sectorsByExcess.length - 1].name,
    durationBet: durationBetLabel,
    spreadDuration,
  };

  return {
    portfolio,
    sectors,
    attribution,
    topContributors: sortedContributors,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FIAttributionAnalysis] Error:', message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate FI attribution analysis data' });
  }
});

export default router;
