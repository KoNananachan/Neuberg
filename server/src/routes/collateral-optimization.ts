import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CollateralInventoryEntry {
  assetType: string;
  currency: string;
  marketValue: number;
  haircutPct: number;
  collateralValue: number;
  eligibility: string[];
}

interface CollateralDemandEntry {
  counterparty: string;
  type: 'CCP' | 'Bilateral';
  initialMargin: number;
  variationMargin: number;
  totalRequired: number;
  totalPosted: number;
  excessDeficit: number;
}

interface OptimizationSuggestion {
  id: number;
  currentAsset: string;
  currentValue: number;
  suggestedReplacement: string;
  replacementValue: number;
  costSavingsBps: number;
  freedUpValue: number;
  rationale: string;
}

interface CollateralVelocity {
  avgReuseRate: number;
  avgTimesRehypothecated: number;
  settlementCycleEfficiency: number;
  totalRehypothecatedValue: number;
  avgSettlementDays: number;
}

interface MarginCallForecast {
  day: string;
  expectedCallAmount: number;
  confidenceLow: number;
  confidenceHigh: number;
  primaryDriver: string;
  probability: number;
}

interface CheapestToDeliverEntry {
  rank: number;
  security: string;
  cusip: string;
  yield: number;
  haircutPct: number;
  opportunityCost: number;
  fundingCost: number;
  netCost: number;
}

interface CollateralOptimizationResponse {
  collateralInventory: CollateralInventoryEntry[];
  collateralDemand: CollateralDemandEntry[];
  optimizationSuggestions: OptimizationSuggestion[];
  collateralVelocity: CollateralVelocity;
  marginCallForecast: MarginCallForecast[];
  cheapestToDeliver: CheapestToDeliverEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: CollateralOptimizationResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Collateral inventory configuration ──

interface InventoryConfig {
  assetType: string;
  currency: string;
  baseMarketValue: number;
  baseHaircut: number;
  eligibility: string[];
  volatility: number;
}

const INVENTORY_CONFIGS: InventoryConfig[] = [
  { assetType: 'Cash', currency: 'USD', baseMarketValue: 8500, baseHaircut: 0.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.03 },
  { assetType: 'Cash', currency: 'EUR', baseMarketValue: 4200, baseHaircut: 0.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.04 },
  { assetType: 'Cash', currency: 'GBP', baseMarketValue: 2100, baseHaircut: 0.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.04 },
  { assetType: 'US Treasuries', currency: 'USD', baseMarketValue: 32500, baseHaircut: 2.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.05 },
  { assetType: 'German Bunds', currency: 'EUR', baseMarketValue: 12800, baseHaircut: 2.5, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.06 },
  { assetType: 'UK Gilts', currency: 'GBP', baseMarketValue: 7400, baseHaircut: 3.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.06 },
  { assetType: 'JGBs', currency: 'JPY', baseMarketValue: 5600, baseHaircut: 3.5, eligibility: ['CCP', 'Bilateral'], volatility: 0.05 },
  { assetType: 'Agency MBS', currency: 'USD', baseMarketValue: 18200, baseHaircut: 5.0, eligibility: ['CCP', 'Bilateral', 'Repo'], volatility: 0.08 },
  { assetType: 'IG Corporates', currency: 'USD', baseMarketValue: 9800, baseHaircut: 8.0, eligibility: ['Bilateral', 'Repo'], volatility: 0.10 },
  { assetType: 'Equities', currency: 'USD', baseMarketValue: 6200, baseHaircut: 15.0, eligibility: ['Bilateral'], volatility: 0.12 },
];

// ── Collateral demand configuration ──

interface DemandConfig {
  counterparty: string;
  type: 'CCP' | 'Bilateral';
  baseIM: number;
  baseVM: number;
  basePostedPct: number;
  volatility: number;
}

const DEMAND_CONFIGS: DemandConfig[] = [
  { counterparty: 'LCH SwapClear', type: 'CCP', baseIM: 12500, baseVM: 3200, basePostedPct: 1.02, volatility: 0.08 },
  { counterparty: 'CME Clearing', type: 'CCP', baseIM: 8400, baseVM: 2100, basePostedPct: 1.04, volatility: 0.07 },
  { counterparty: 'Eurex Clearing', type: 'CCP', baseIM: 5800, baseVM: 1500, basePostedPct: 1.01, volatility: 0.06 },
  { counterparty: 'Goldman Sachs', type: 'Bilateral', baseIM: 3200, baseVM: 850, basePostedPct: 0.98, volatility: 0.10 },
  { counterparty: 'JP Morgan', type: 'Bilateral', baseIM: 2800, baseVM: 720, basePostedPct: 1.03, volatility: 0.09 },
  { counterparty: 'Morgan Stanley', type: 'Bilateral', baseIM: 2400, baseVM: 610, basePostedPct: 0.96, volatility: 0.10 },
  { counterparty: 'Citadel Securities', type: 'Bilateral', baseIM: 1900, baseVM: 480, basePostedPct: 1.05, volatility: 0.11 },
  { counterparty: 'Barclays', type: 'Bilateral', baseIM: 1600, baseVM: 420, basePostedPct: 0.99, volatility: 0.09 },
];

// ── Optimization suggestion configuration ──

interface SuggestionConfig {
  currentAsset: string;
  suggestedReplacement: string;
  baseCurrentValue: number;
  baseSavingsBps: number;
  baseFreedUp: number;
  rationale: string;
  volatility: number;
}

const SUGGESTION_CONFIGS: SuggestionConfig[] = [
  { currentAsset: 'IG Corporate Bonds (A-rated)', suggestedReplacement: 'US Treasury 5Y Notes', baseCurrentValue: 2400, baseSavingsBps: 18.5, baseFreedUp: 168, rationale: 'Lower haircut frees margin; UST eligible at all CCPs', volatility: 0.12 },
  { currentAsset: 'Equities (S&P 500 basket)', suggestedReplacement: 'Agency MBS 5.5% TBA', baseCurrentValue: 1800, baseSavingsBps: 32.0, baseFreedUp: 252, rationale: 'Reduce 15% haircut to 5%; broader CCP eligibility', volatility: 0.15 },
  { currentAsset: 'EUR Cash at LCH', suggestedReplacement: 'German Bunds 2Y', baseCurrentValue: 1500, baseSavingsBps: 8.2, baseFreedUp: 0, rationale: 'Earn yield on collateral while maintaining CCP eligibility', volatility: 0.08 },
  { currentAsset: 'UK Gilts 30Y (long duration)', suggestedReplacement: 'UK Gilts 2Y', baseCurrentValue: 2100, baseSavingsBps: 12.4, baseFreedUp: 63, rationale: 'Shorter duration reduces haircut from 5% to 2%; less price vol', volatility: 0.10 },
  { currentAsset: 'JGBs at bilateral CSA', suggestedReplacement: 'USD Cash via FX swap', baseCurrentValue: 1200, baseSavingsBps: 22.8, baseFreedUp: 42, rationale: 'Eliminate cross-currency haircut add-on; cheaper funding', volatility: 0.14 },
];

// ── Cheapest-to-deliver configuration ──

interface CTDConfig {
  security: string;
  cusip: string;
  baseYield: number;
  baseHaircut: number;
  baseOpportunityCost: number;
  baseFundingCost: number;
  volatility: number;
}

const CTD_CONFIGS: CTDConfig[] = [
  { security: 'UST 4.25% 11/30/2025', cusip: '91282CJK7', baseYield: 4.28, baseHaircut: 1.5, baseOpportunityCost: 0.8, baseFundingCost: 5.35, volatility: 0.04 },
  { security: 'UST 4.50% 03/31/2026', cusip: '91282CKR0', baseYield: 4.42, baseHaircut: 1.8, baseOpportunityCost: 1.0, baseFundingCost: 5.35, volatility: 0.04 },
  { security: 'UST 4.00% 06/30/2026', cusip: '91282CLM0', baseYield: 4.15, baseHaircut: 2.0, baseOpportunityCost: 1.2, baseFundingCost: 5.35, volatility: 0.05 },
  { security: 'DBR 2.50% 08/15/2027', cusip: 'DE000BU2Z007', baseYield: 2.65, baseHaircut: 2.5, baseOpportunityCost: 1.5, baseFundingCost: 3.85, volatility: 0.05 },
  { security: 'UKT 4.00% 01/22/2027', cusip: 'GB00BNNGP551', baseYield: 4.18, baseHaircut: 2.8, baseOpportunityCost: 1.6, baseFundingCost: 5.20, volatility: 0.05 },
  { security: 'FNMA 5.50% TBA', cusip: '01F052', baseYield: 5.62, baseHaircut: 4.0, baseOpportunityCost: 2.2, baseFundingCost: 5.35, volatility: 0.06 },
  { security: 'FHLMC 6.00% TBA', cusip: '31F060', baseYield: 5.95, baseHaircut: 4.5, baseOpportunityCost: 2.5, baseFundingCost: 5.35, volatility: 0.06 },
  { security: 'Apple Inc 4.15% 2028', cusip: '037833EK6', baseYield: 4.45, baseHaircut: 6.0, baseOpportunityCost: 3.2, baseFundingCost: 5.35, volatility: 0.08 },
  { security: 'Microsoft 3.95% 2028', cusip: '594918CF2', baseYield: 4.22, baseHaircut: 6.0, baseOpportunityCost: 3.0, baseFundingCost: 5.35, volatility: 0.08 },
  { security: 'JPM 5.04% 2028', cusip: '46647PCY0', baseYield: 5.15, baseHaircut: 7.0, baseOpportunityCost: 3.8, baseFundingCost: 5.35, volatility: 0.09 },
];

// ── Margin call forecast drivers ──

const FORECAST_DRIVERS = [
  'Rate vol spike',
  'Equity drawdown',
  'Credit spread widening',
  'FX dislocation',
  'Portfolio rebalance',
];

// ── Data generation ──

function generateCollateralInventory(rng: () => number): CollateralInventoryEntry[] {
  return INVENTORY_CONFIGS.map((cfg) => {
    const mvJitter = (rng() - 0.5) * cfg.baseMarketValue * cfg.volatility * 2;
    const marketValue = Math.round(cfg.baseMarketValue + mvJitter);

    const haircutJitter = cfg.baseHaircut > 0 ? (rng() - 0.5) * cfg.baseHaircut * 0.10 : 0;
    const haircutPct = Math.round((cfg.baseHaircut + haircutJitter) * 100) / 100;

    const collateralValue = Math.round(marketValue * (1 - haircutPct / 100));

    return {
      assetType: cfg.assetType,
      currency: cfg.currency,
      marketValue,
      haircutPct,
      collateralValue,
      eligibility: cfg.eligibility,
    };
  });
}

function generateCollateralDemand(rng: () => number): CollateralDemandEntry[] {
  return DEMAND_CONFIGS.map((cfg) => {
    const imJitter = (rng() - 0.5) * cfg.baseIM * cfg.volatility * 2;
    const initialMargin = Math.round(cfg.baseIM + imJitter);

    const vmJitter = (rng() - 0.5) * cfg.baseVM * cfg.volatility * 2;
    const variationMargin = Math.round(cfg.baseVM + vmJitter);

    const totalRequired = initialMargin + variationMargin;

    const postedPctJitter = (rng() - 0.5) * 0.08;
    const postedPct = cfg.basePostedPct + postedPctJitter;
    const totalPosted = Math.round(totalRequired * postedPct);

    const excessDeficit = totalPosted - totalRequired;

    return {
      counterparty: cfg.counterparty,
      type: cfg.type,
      initialMargin,
      variationMargin,
      totalRequired,
      totalPosted,
      excessDeficit,
    };
  });
}

function generateOptimizationSuggestions(rng: () => number): OptimizationSuggestion[] {
  return SUGGESTION_CONFIGS.map((cfg, idx) => {
    const valJitter = (rng() - 0.5) * cfg.baseCurrentValue * cfg.volatility * 2;
    const currentValue = Math.round(cfg.baseCurrentValue + valJitter);

    const savingsJitter = (rng() - 0.5) * cfg.baseSavingsBps * cfg.volatility * 2;
    const costSavingsBps = Math.round((cfg.baseSavingsBps + savingsJitter) * 10) / 10;

    const freedJitter = (rng() - 0.5) * cfg.baseFreedUp * cfg.volatility * 2;
    const freedUpValue = Math.round(cfg.baseFreedUp + freedJitter);

    const replacementValue = currentValue - freedUpValue;

    return {
      id: idx + 1,
      currentAsset: cfg.currentAsset,
      currentValue,
      suggestedReplacement: cfg.suggestedReplacement,
      replacementValue: Math.max(0, replacementValue),
      costSavingsBps,
      freedUpValue: Math.max(0, freedUpValue),
      rationale: cfg.rationale,
    };
  });
}

function generateCollateralVelocity(rng: () => number): CollateralVelocity {
  const avgReuseRate = Math.round((2.8 + (rng() - 0.5) * 0.8) * 100) / 100;
  const avgTimesRehypothecated = Math.round((1.9 + (rng() - 0.5) * 0.6) * 10) / 10;
  const settlementCycleEfficiency = Math.round((92.5 + (rng() - 0.5) * 6.0) * 10) / 10;
  const totalRehypothecatedValue = Math.round(42500 + (rng() - 0.5) * 8000);
  const avgSettlementDays = Math.round((1.2 + (rng() - 0.5) * 0.4) * 10) / 10;

  return {
    avgReuseRate,
    avgTimesRehypothecated,
    settlementCycleEfficiency,
    totalRehypothecatedValue,
    avgSettlementDays,
  };
}

function generateMarginCallForecast(rng: () => number): MarginCallForecast[] {
  const today = new Date();
  const forecasts: MarginCallForecast[] = [];

  for (let i = 1; i <= 5; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const day = forecastDate.toISOString().slice(0, 10);

    // Expected call amount increases with uncertainty over time
    const baseCall = 1200 + i * 350;
    const callJitter = (rng() - 0.5) * baseCall * 0.25;
    const expectedCallAmount = Math.round(baseCall + callJitter);

    // Confidence interval widens with time horizon
    const spreadFactor = 1 + i * 0.15;
    const confidenceLow = Math.round(expectedCallAmount * (1 - 0.18 * spreadFactor));
    const confidenceHigh = Math.round(expectedCallAmount * (1 + 0.22 * spreadFactor));

    const driverIdx = Math.floor(rng() * FORECAST_DRIVERS.length);
    const primaryDriver = FORECAST_DRIVERS[driverIdx];

    // Probability of call decreases with larger amounts
    const baseProbability = 85 - i * 8;
    const probJitter = (rng() - 0.5) * 10;
    const probability = Math.round(Math.max(25, Math.min(95, baseProbability + probJitter)));

    forecasts.push({
      day,
      expectedCallAmount,
      confidenceLow,
      confidenceHigh,
      primaryDriver,
      probability,
    });
  }

  return forecasts;
}

function generateCheapestToDeliver(rng: () => number): CheapestToDeliverEntry[] {
  const entries = CTD_CONFIGS.map((cfg) => {
    const yieldJitter = (rng() - 0.5) * cfg.baseYield * cfg.volatility * 2;
    const yieldVal = Math.round((cfg.baseYield + yieldJitter) * 100) / 100;

    const haircutJitter = (rng() - 0.5) * cfg.baseHaircut * 0.10;
    const haircutPct = Math.round((cfg.baseHaircut + haircutJitter) * 100) / 100;

    const oppCostJitter = (rng() - 0.5) * cfg.baseOpportunityCost * 0.15;
    const opportunityCost = Math.round((cfg.baseOpportunityCost + oppCostJitter) * 100) / 100;

    const fundingJitter = (rng() - 0.5) * cfg.baseFundingCost * cfg.volatility * 2;
    const fundingCost = Math.round((cfg.baseFundingCost + fundingJitter) * 100) / 100;

    // Net cost = funding cost - yield + opportunity cost + haircut drag
    const netCost = Math.round((fundingCost - yieldVal + opportunityCost + haircutPct * 0.1) * 100) / 100;

    return {
      rank: 0,
      security: cfg.security,
      cusip: cfg.cusip,
      yield: yieldVal,
      haircutPct,
      opportunityCost,
      fundingCost,
      netCost,
    };
  });

  // Sort by net cost ascending and assign ranks
  entries.sort((a, b) => a.netCost - b.netCost);
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}

function generateCollateralOptimizationData(): CollateralOptimizationResponse {
  const rng = seededRandom('collateral-optimization');

  const collateralInventory = generateCollateralInventory(rng);
  const collateralDemand = generateCollateralDemand(rng);
  const optimizationSuggestions = generateOptimizationSuggestions(rng);
  const collateralVelocity = generateCollateralVelocity(rng);
  const marginCallForecast = generateMarginCallForecast(rng);
  const cheapestToDeliver = generateCheapestToDeliver(rng);

  return {
    collateralInventory,
    collateralDemand,
    optimizationSuggestions,
    collateralVelocity,
    marginCallForecast,
    cheapestToDeliver,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCollateralOptimizationData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CollateralOptimization] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate collateral optimization data' });
  }
});

export default router;
