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

// -- Seed Data --

const COUNTERPARTIES = [
  { name: 'JPMorgan Chase', baseExposure: 2450, basePFE95: 3100, basePFE99: 3850, baseCVA: 485, baseDVA: 210, baseCollateral: 1820, baseRating: 'AA-' as const, baseOutlook: 'stable' as const },
  { name: 'Goldman Sachs', baseExposure: 1980, basePFE95: 2520, basePFE99: 3150, baseCVA: 412, baseDVA: 175, baseCollateral: 1490, baseRating: 'A+' as const, baseOutlook: 'stable' as const },
  { name: 'Citigroup', baseExposure: 2120, basePFE95: 2680, basePFE99: 3340, baseCVA: 520, baseDVA: 195, baseCollateral: 1580, baseRating: 'A+' as const, baseOutlook: 'stable' as const },
  { name: 'Bank of America', baseExposure: 2280, basePFE95: 2890, basePFE99: 3600, baseCVA: 445, baseDVA: 205, baseCollateral: 1710, baseRating: 'AA-' as const, baseOutlook: 'positive' as const },
  { name: 'Morgan Stanley', baseExposure: 1750, basePFE95: 2230, basePFE99: 2780, baseCVA: 365, baseDVA: 155, baseCollateral: 1310, baseRating: 'A+' as const, baseOutlook: 'stable' as const },
  { name: 'Barclays', baseExposure: 1420, basePFE95: 1810, basePFE99: 2260, baseCVA: 380, baseDVA: 130, baseCollateral: 1050, baseRating: 'A' as const, baseOutlook: 'stable' as const },
  { name: 'Deutsche Bank', baseExposure: 1180, basePFE95: 1520, basePFE99: 1920, baseCVA: 425, baseDVA: 115, baseCollateral: 860, baseRating: 'A-' as const, baseOutlook: 'negative' as const },
  { name: 'UBS', baseExposure: 1560, basePFE95: 1980, basePFE99: 2470, baseCVA: 310, baseDVA: 145, baseCollateral: 1180, baseRating: 'A+' as const, baseOutlook: 'stable' as const },
  { name: 'HSBC', baseExposure: 1850, basePFE95: 2340, basePFE99: 2920, baseCVA: 395, baseDVA: 170, baseCollateral: 1390, baseRating: 'AA-' as const, baseOutlook: 'stable' as const },
  { name: 'BNP Paribas', baseExposure: 1340, basePFE95: 1710, basePFE99: 2140, baseCVA: 355, baseDVA: 125, baseCollateral: 990, baseRating: 'A+' as const, baseOutlook: 'stable' as const },
  { name: 'Societe Generale', baseExposure: 980, basePFE95: 1260, basePFE99: 1580, baseCVA: 340, baseDVA: 95, baseCollateral: 710, baseRating: 'A' as const, baseOutlook: 'negative' as const },
  { name: 'Credit Suisse', baseExposure: 720, basePFE95: 940, basePFE99: 1190, baseCVA: 480, baseDVA: 72, baseCollateral: 510, baseRating: 'BBB+' as const, baseOutlook: 'negative' as const },
] as const;

const PRODUCTS = [
  { product: 'Interest Rate Swaps', baseGross: 8200, baseNettingPct: 0.72, baseCollateralPct: 0.45 },
  { product: 'Credit Default Swaps', baseGross: 3400, baseNettingPct: 0.65, baseCollateralPct: 0.38 },
  { product: 'FX Forwards', baseGross: 5100, baseNettingPct: 0.58, baseCollateralPct: 0.32 },
  { product: 'Equity Swaps', baseGross: 2600, baseNettingPct: 0.52, baseCollateralPct: 0.42 },
  { product: 'Repo', baseGross: 4800, baseNettingPct: 0.68, baseCollateralPct: 0.55 },
] as const;

const WWR_POSITIONS = [
  { counterparty: 'Deutsche Bank', product: 'CDS on European Financials', baseExposure: 245, baseCorrelation: 0.72, baseCharge: 38, mitigant: 'CSA' as const },
  { counterparty: 'Credit Suisse', product: 'Total Return Swap - CS Bond Index', baseExposure: 180, baseCorrelation: 0.85, baseCharge: 52, mitigant: 'none' as const },
  { counterparty: 'Barclays', product: 'CDS on UK Sovereign', baseExposure: 195, baseCorrelation: 0.58, baseCharge: 24, mitigant: 'CCP' as const },
  { counterparty: 'Societe Generale', product: 'Equity Swap - Euro Stoxx Banks', baseExposure: 160, baseCorrelation: 0.68, baseCharge: 31, mitigant: 'CSA' as const },
  { counterparty: 'Goldman Sachs', product: 'Variance Swap - Financial Sector Vol', baseExposure: 210, baseCorrelation: 0.45, baseCharge: 18, mitigant: 'CCP' as const },
] as const;

const DISPUTE_REASONS = [
  'Valuation methodology disagreement',
  'Collateral eligibility dispute',
  'Netting set calculation difference',
  'Threshold/MTA interpretation',
  'FX rate discrepancy on cross-currency collateral',
  'Trade population mismatch',
  'Haircut methodology difference',
] as const;

const DISPUTE_COUNTERPARTIES = [
  'Deutsche Bank', 'Credit Suisse', 'Societe Generale', 'Barclays',
  'BNP Paribas', 'Goldman Sachs', 'Morgan Stanley',
] as const;

const RATINGS = ['AA-', 'A+', 'A', 'A-', 'BBB+'] as const;
const OUTLOOKS = ['stable', 'negative', 'positive'] as const;

// -- Cache --

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-counterparty-exposure'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Top Exposures (12 counterparties) --

  const topExposures = COUNTERPARTIES.map(cp => {
    const currentExposure = roundTo(jitter(cp.baseExposure, 0.08), 1);
    const PFE_95 = roundTo(jitter(cp.basePFE95, 0.07), 1);
    const PFE_99 = roundTo(jitter(cp.basePFE99, 0.07), 1);
    const CVA = roundTo(jitter(cp.baseCVA, 0.12), 1);
    const DVA = roundTo(jitter(cp.baseDVA, 0.12), 1);
    const collateralHeld = roundTo(jitter(cp.baseCollateral, 0.08), 1);
    const netExposure = roundTo(currentExposure - collateralHeld, 1);

    // Slight chance of rating/outlook shift
    const ratingRoll = rng();
    let creditRating: typeof RATINGS[number];
    if (ratingRoll < 0.1) creditRating = pick(RATINGS);
    else creditRating = cp.baseRating;

    const outlookRoll = rng();
    let ratingOutlook: typeof OUTLOOKS[number];
    if (outlookRoll < 0.12) ratingOutlook = pick(OUTLOOKS);
    else ratingOutlook = cp.baseOutlook;

    return {
      counterparty: cp.name,
      currentExposure,
      PFE_95,
      PFE_99,
      CVA,
      DVA,
      collateralHeld,
      netExposure,
      creditRating,
      ratingOutlook,
    };
  });

  // -- 2. Exposure by Product (5 products) --

  const exposureByProduct = (() => {
    const products = PRODUCTS.map(p => {
      const grossExposure = roundTo(jitter(p.baseGross, 0.08), 1);
      const nettingBenefit = roundTo(grossExposure * jitter(p.baseNettingPct, 0.06), 1);
      const afterNetting = grossExposure - nettingBenefit;
      const collateralBenefit = roundTo(afterNetting * jitter(p.baseCollateralPct, 0.08), 1);
      const netExposure = roundTo(afterNetting - collateralBenefit, 1);

      return {
        product: p.product,
        grossExposure,
        nettingBenefit,
        collateralBenefit,
        netExposure,
        pctOfTotal: 0,
      };
    });

    const totalNet = products.reduce((s, p) => s + p.netExposure, 0);
    products.forEach(p => {
      p.pctOfTotal = roundTo((p.netExposure / totalNet) * 100, 1);
    });

    return products;
  })();

  // -- 3. Wrong-Way Risk (5 positions) --

  const wrongWayRisk = WWR_POSITIONS.map(pos => {
    const exposure = roundTo(jitter(pos.baseExposure, 0.1), 1);
    const correlation = roundTo(Math.min(0.95, Math.max(0.2, jitter(pos.baseCorrelation, 0.08))), 2);
    const wrongWayRiskCharge = roundTo(jitter(pos.baseCharge, 0.12), 1);

    return {
      counterparty: pos.counterparty,
      product: pos.product,
      exposure,
      correlation,
      wrongWayRiskCharge,
      mitigant: pos.mitigant,
    };
  });

  // -- 4. Margin Call Summary --

  const pendingCalls = Math.round(jitter(14, 0.25));
  const totalCallAmount = roundTo(jitter(385, 0.15), 1);
  const receivedToday = roundTo(totalCallAmount * jitter(0.62, 0.1), 1);
  const disputedAmount = roundTo(jitter(48, 0.2), 1);
  const avgResponseTime = roundTo(jitter(4.2, 0.15), 1);

  // Generate 3 top disputes
  const usedCounterparties = new Set<string>();
  const topDisputes: { counterparty: string; amount: number; reason: string }[] = [];
  while (topDisputes.length < 3) {
    const cp = pick(DISPUTE_COUNTERPARTIES);
    if (usedCounterparties.has(cp)) continue;
    usedCounterparties.add(cp);
    topDisputes.push({
      counterparty: cp,
      amount: roundTo(jitter(15, 0.4), 1),
      reason: pick(DISPUTE_REASONS),
    });
  }

  const marginCallSummary = {
    pendingCalls,
    totalCallAmount,
    receivedToday,
    disputedAmount,
    avgResponseTime,
    topDisputes,
  };

  return {
    topExposures,
    exposureByProduct,
    wrongWayRisk,
    marginCallSummary,
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
    console.error('[CounterpartyExposure] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate counterparty exposure data' });
  }
});

export default router;
