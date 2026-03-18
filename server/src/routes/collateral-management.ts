import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface CollateralPoolEntry {
  type: string;
  totalAvailable: number;
  pledged: number;
  free: number;
  haircutPct: number;
}

interface MarginRequirement {
  product: string;
  initialMargin: number;
  variationMargin: number;
  currentExposure: number;
  threshold: number;
  excessDeficit: number;
}

interface HaircutScheduleEntry {
  collateralType: string;
  ratingAAA: number;
  ratingAA: number;
  ratingA: number;
  ratingBBB: number;
  ratingBelow: number;
}

interface ConcentrationLimit {
  dimension: string;
  name: string;
  limit: number;
  currentUtilization: number;
  utilizationPct: number;
  status: 'OK' | 'WARNING' | 'BREACH';
}

interface SubstitutionRequest {
  id: string;
  requestDate: string;
  counterparty: string;
  outCollateral: string;
  inCollateral: string;
  notional: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SETTLED';
}

interface TripartyBalance {
  agent: string;
  totalBalance: number;
  allocated: number;
  unallocated: number;
  utilizationPct: number;
  eligibleIssuers: number;
}

interface RegulatoryMetrics {
  umrCompliant: boolean;
  umrThreshold: number;
  umrCurrentAANA: number;
  simmInitialMargin: number;
  simmModelVersion: string;
  gridScheduleMargin: number;
  excessOverMinTransfer: number;
  minTransferAmount: number;
}

interface CollateralOptimizationEntry {
  strategy: string;
  description: string;
  currentCost: number;
  optimizedCost: number;
  savingsBps: number;
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CollateralManagementResponse {
  collateralPool: CollateralPoolEntry[];
  marginRequirements: MarginRequirement[];
  haircutSchedule: HaircutScheduleEntry[];
  concentrationLimits: ConcentrationLimit[];
  substitutionRequests: SubstitutionRequest[];
  tripartyBalances: TripartyBalance[];
  regulatoryMetrics: RegulatoryMetrics;
  collateralOptimization: CollateralOptimizationEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: CollateralManagementResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Collateral pool configuration ──

interface CollateralPoolConfig {
  type: string;
  baseTotal: number;
  basePledgedPct: number;
  baseHaircut: number;
  volatility: number;
}

const POOL_CONFIGS: CollateralPoolConfig[] = [
  { type: 'US Treasuries', baseTotal: 42500, basePledgedPct: 0.68, baseHaircut: 2.0, volatility: 0.05 },
  { type: 'Agency MBS', baseTotal: 18200, basePledgedPct: 0.72, baseHaircut: 5.0, volatility: 0.08 },
  { type: 'Investment-Grade Corporate', baseTotal: 12800, basePledgedPct: 0.55, baseHaircut: 8.0, volatility: 0.10 },
  { type: 'Equities', baseTotal: 8600, basePledgedPct: 0.45, baseHaircut: 15.0, volatility: 0.12 },
  { type: 'Gold', baseTotal: 3400, basePledgedPct: 0.60, baseHaircut: 10.0, volatility: 0.06 },
];

// ── Margin requirement configuration ──

interface MarginConfig {
  product: string;
  baseIM: number;
  baseVM: number;
  baseExposure: number;
  baseThreshold: number;
  volatility: number;
}

const MARGIN_CONFIGS: MarginConfig[] = [
  { product: 'IRS', baseIM: 4250, baseVM: 1820, baseExposure: 5400, baseThreshold: 6500, volatility: 0.08 },
  { product: 'CDS', baseIM: 2800, baseVM: 950, baseExposure: 3200, baseThreshold: 4000, volatility: 0.10 },
  { product: 'Futures', baseIM: 1950, baseVM: 620, baseExposure: 2100, baseThreshold: 2800, volatility: 0.06 },
  { product: 'Options', baseIM: 1600, baseVM: 480, baseExposure: 1850, baseThreshold: 2200, volatility: 0.12 },
  { product: 'Repo', baseIM: 850, baseVM: 180, baseExposure: 920, baseThreshold: 1200, volatility: 0.05 },
];

// ── Haircut schedule configuration ──

interface HaircutConfig {
  collateralType: string;
  baseAAA: number;
  baseAA: number;
  baseA: number;
  baseBBB: number;
  baseBelow: number;
}

const HAIRCUT_CONFIGS: HaircutConfig[] = [
  { collateralType: 'Sovereign Bonds', baseAAA: 1.0, baseAA: 2.0, baseA: 4.0, baseBBB: 8.0, baseBelow: 15.0 },
  { collateralType: 'Agency Bonds', baseAAA: 2.0, baseAA: 3.0, baseA: 5.0, baseBBB: 10.0, baseBelow: 18.0 },
  { collateralType: 'Corporate Bonds', baseAAA: 3.0, baseAA: 5.0, baseA: 8.0, baseBBB: 12.0, baseBelow: 25.0 },
  { collateralType: 'Covered Bonds', baseAAA: 2.5, baseAA: 4.0, baseA: 6.0, baseBBB: 10.0, baseBelow: 20.0 },
  { collateralType: 'Equities (Main Index)', baseAAA: 15.0, baseAA: 15.0, baseA: 18.0, baseBBB: 22.0, baseBelow: 35.0 },
  { collateralType: 'Gold', baseAAA: 10.0, baseAA: 10.0, baseA: 10.0, baseBBB: 12.0, baseBelow: 15.0 },
];

// ── Concentration limit configuration ──

interface ConcentrationConfig {
  dimension: string;
  name: string;
  baseLimit: number;
  baseUtilization: number;
  volatility: number;
}

const CONCENTRATION_CONFIGS: ConcentrationConfig[] = [
  { dimension: 'Issuer', name: 'US Treasury', baseLimit: 35.0, baseUtilization: 28.5, volatility: 3.0 },
  { dimension: 'Issuer', name: 'FNMA', baseLimit: 10.0, baseUtilization: 7.2, volatility: 1.5 },
  { dimension: 'Issuer', name: 'FHLMC', baseLimit: 10.0, baseUtilization: 6.8, volatility: 1.5 },
  { dimension: 'Issuer', name: 'JPMorgan Chase', baseLimit: 5.0, baseUtilization: 3.9, volatility: 0.8 },
  { dimension: 'Sector', name: 'Financials', baseLimit: 20.0, baseUtilization: 14.5, volatility: 2.0 },
  { dimension: 'Sector', name: 'Technology', baseLimit: 15.0, baseUtilization: 8.3, volatility: 2.0 },
  { dimension: 'Sector', name: 'Energy', baseLimit: 10.0, baseUtilization: 5.1, volatility: 1.5 },
  { dimension: 'Country', name: 'United States', baseLimit: 60.0, baseUtilization: 52.4, volatility: 3.0 },
  { dimension: 'Country', name: 'United Kingdom', baseLimit: 15.0, baseUtilization: 8.7, volatility: 1.5 },
  { dimension: 'Country', name: 'Germany', baseLimit: 15.0, baseUtilization: 7.2, volatility: 1.5 },
];

// ── Substitution request configuration ──

interface SubstitutionConfig {
  counterparty: string;
  outCollateral: string;
  inCollateral: string;
  baseNotional: number;
  statusWeights: [number, number, number, number]; // PENDING, APPROVED, REJECTED, SETTLED
}

const SUBSTITUTION_CONFIGS: SubstitutionConfig[] = [
  { counterparty: 'Goldman Sachs', outCollateral: 'UST 10Y', inCollateral: 'Agency MBS 5.5', baseNotional: 250, statusWeights: [0.4, 0.3, 0.1, 0.2] },
  { counterparty: 'Morgan Stanley', outCollateral: 'IG Corp Bond', inCollateral: 'UST 5Y', baseNotional: 180, statusWeights: [0.3, 0.25, 0.15, 0.3] },
  { counterparty: 'Citadel', outCollateral: 'Equities (SPY)', inCollateral: 'UST 2Y', baseNotional: 320, statusWeights: [0.5, 0.2, 0.1, 0.2] },
  { counterparty: 'JP Morgan', outCollateral: 'Gold', inCollateral: 'Agency MBS 6.0', baseNotional: 150, statusWeights: [0.35, 0.3, 0.15, 0.2] },
  { counterparty: 'Barclays', outCollateral: 'Agency MBS 5.0', inCollateral: 'UST 30Y', baseNotional: 210, statusWeights: [0.45, 0.25, 0.1, 0.2] },
  { counterparty: 'Deutsche Bank', outCollateral: 'IG Corp Bond', inCollateral: 'UST 7Y', baseNotional: 195, statusWeights: [0.3, 0.35, 0.15, 0.2] },
];

// ── Triparty agent configuration ──

interface TripartyConfig {
  agent: string;
  baseBalance: number;
  baseAllocatedPct: number;
  baseEligibleIssuers: number;
  volatility: number;
}

const TRIPARTY_CONFIGS: TripartyConfig[] = [
  { agent: 'BNY Mellon', baseBalance: 28500, baseAllocatedPct: 0.82, baseEligibleIssuers: 1450, volatility: 0.05 },
  { agent: 'JP Morgan', baseBalance: 22800, baseAllocatedPct: 0.78, baseEligibleIssuers: 1280, volatility: 0.06 },
  { agent: 'Euroclear', baseBalance: 18400, baseAllocatedPct: 0.75, baseEligibleIssuers: 2100, volatility: 0.04 },
];

// ── Optimization strategy configuration ──

interface OptimizationConfig {
  strategy: string;
  description: string;
  baseCurrent: number;
  baseOptimized: number;
  volatility: number;
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
}

const OPTIMIZATION_CONFIGS: OptimizationConfig[] = [
  { strategy: 'Cheapest-to-Deliver', description: 'Replace high-haircut collateral with lower-haircut UST', baseCurrent: 42.5, baseOptimized: 28.3, volatility: 3.0, feasibility: 'HIGH' },
  { strategy: 'Collateral Upgrade Trade', description: 'Swap IG corporate for UST via repo to reduce haircut drag', baseCurrent: 38.2, baseOptimized: 22.1, volatility: 4.0, feasibility: 'HIGH' },
  { strategy: 'Collateral Downgrade Trade', description: 'Lend UST and receive equities plus fee income', baseCurrent: 15.8, baseOptimized: 11.2, volatility: 2.0, feasibility: 'MEDIUM' },
  { strategy: 'Netting Optimization', description: 'Consolidate bilateral CSAs to reduce gross margin', baseCurrent: 56.4, baseOptimized: 41.8, volatility: 5.0, feasibility: 'MEDIUM' },
  { strategy: 'CCP Migration', description: 'Move eligible bilateral trades to CCP for margin offset', baseCurrent: 24.6, baseOptimized: 16.9, volatility: 3.5, feasibility: 'HIGH' },
  { strategy: 'Cross-Currency Optimization', description: 'Substitute EUR-denominated collateral with USD equiv via FX swap', baseCurrent: 18.9, baseOptimized: 14.5, volatility: 2.5, feasibility: 'LOW' },
];

// ── Data generation ──

function generateCollateralPool(rng: () => number): CollateralPoolEntry[] {
  return POOL_CONFIGS.map((cfg) => {
    const totalJitter = (rng() - 0.5) * cfg.baseTotal * cfg.volatility * 2;
    const totalAvailable = Math.round(cfg.baseTotal + totalJitter);

    const pledgedPctJitter = (rng() - 0.5) * 0.10;
    const pledgedPct = Math.max(0.30, Math.min(0.90, cfg.basePledgedPct + pledgedPctJitter));
    const pledged = Math.round(totalAvailable * pledgedPct);
    const free = totalAvailable - pledged;

    const haircutJitter = (rng() - 0.5) * cfg.baseHaircut * 0.15;
    const haircutPct = Math.round((cfg.baseHaircut + haircutJitter) * 100) / 100;

    return {
      type: cfg.type,
      totalAvailable,
      pledged,
      free,
      haircutPct,
    };
  });
}

function generateMarginRequirements(rng: () => number): MarginRequirement[] {
  return MARGIN_CONFIGS.map((cfg) => {
    const imJitter = (rng() - 0.5) * cfg.baseIM * cfg.volatility * 2;
    const initialMargin = Math.round(cfg.baseIM + imJitter);

    const vmJitter = (rng() - 0.5) * cfg.baseVM * cfg.volatility * 2;
    const variationMargin = Math.round(cfg.baseVM + vmJitter);

    const expJitter = (rng() - 0.5) * cfg.baseExposure * cfg.volatility * 2;
    const currentExposure = Math.round(cfg.baseExposure + expJitter);

    const threshJitter = (rng() - 0.5) * cfg.baseThreshold * 0.05;
    const threshold = Math.round(cfg.baseThreshold + threshJitter);

    const excessDeficit = threshold - currentExposure;

    return {
      product: cfg.product,
      initialMargin,
      variationMargin,
      currentExposure,
      threshold,
      excessDeficit,
    };
  });
}

function generateHaircutSchedule(rng: () => number): HaircutScheduleEntry[] {
  return HAIRCUT_CONFIGS.map((cfg) => {
    const jitter = () => (rng() - 0.5) * 0.6;
    return {
      collateralType: cfg.collateralType,
      ratingAAA: Math.round((cfg.baseAAA + jitter()) * 100) / 100,
      ratingAA: Math.round((cfg.baseAA + jitter()) * 100) / 100,
      ratingA: Math.round((cfg.baseA + jitter()) * 100) / 100,
      ratingBBB: Math.round((cfg.baseBBB + jitter()) * 100) / 100,
      ratingBelow: Math.round((cfg.baseBelow + jitter()) * 100) / 100,
    };
  });
}

function generateConcentrationLimits(rng: () => number): ConcentrationLimit[] {
  return CONCENTRATION_CONFIGS.map((cfg) => {
    const utilJitter = (rng() - 0.5) * cfg.volatility * 2;
    const currentUtilization = Math.round((cfg.baseUtilization + utilJitter) * 10) / 10;
    const utilizationPct = Math.round((currentUtilization / cfg.baseLimit) * 1000) / 10;

    let status: 'OK' | 'WARNING' | 'BREACH';
    if (utilizationPct >= 100) {
      status = 'BREACH';
    } else if (utilizationPct >= 85) {
      status = 'WARNING';
    } else {
      status = 'OK';
    }

    return {
      dimension: cfg.dimension,
      name: cfg.name,
      limit: cfg.baseLimit,
      currentUtilization,
      utilizationPct,
      status,
    };
  });
}

function generateSubstitutionRequests(rng: () => number): SubstitutionRequest[] {
  const today = new Date();
  return SUBSTITUTION_CONFIGS.map((cfg, idx) => {
    const daysAgo = Math.floor(rng() * 5);
    const requestDate = new Date(today);
    requestDate.setDate(requestDate.getDate() - daysAgo);

    const notionalJitter = (rng() - 0.5) * cfg.baseNotional * 0.20;
    const notional = Math.round(cfg.baseNotional + notionalJitter);

    // Determine status from weighted random
    const roll = rng();
    const [pPending, pApproved, pRejected] = cfg.statusWeights;
    let status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SETTLED';
    if (roll < pPending) {
      status = 'PENDING';
    } else if (roll < pPending + pApproved) {
      status = 'APPROVED';
    } else if (roll < pPending + pApproved + pRejected) {
      status = 'REJECTED';
    } else {
      status = 'SETTLED';
    }

    return {
      id: `SUB-${String(idx + 1).padStart(4, '0')}`,
      requestDate: requestDate.toISOString().slice(0, 10),
      counterparty: cfg.counterparty,
      outCollateral: cfg.outCollateral,
      inCollateral: cfg.inCollateral,
      notional,
      status,
    };
  });
}

function generateTripartyBalances(rng: () => number): TripartyBalance[] {
  return TRIPARTY_CONFIGS.map((cfg) => {
    const balJitter = (rng() - 0.5) * cfg.baseBalance * cfg.volatility * 2;
    const totalBalance = Math.round(cfg.baseBalance + balJitter);

    const allocPctJitter = (rng() - 0.5) * 0.08;
    const allocPct = Math.max(0.60, Math.min(0.95, cfg.baseAllocatedPct + allocPctJitter));
    const allocated = Math.round(totalBalance * allocPct);
    const unallocated = totalBalance - allocated;

    const utilizationPct = Math.round(allocPct * 1000) / 10;

    const issuerJitter = Math.floor((rng() - 0.5) * cfg.baseEligibleIssuers * 0.08);
    const eligibleIssuers = cfg.baseEligibleIssuers + issuerJitter;

    return {
      agent: cfg.agent,
      totalBalance,
      allocated,
      unallocated,
      utilizationPct,
      eligibleIssuers,
    };
  });
}

function generateRegulatoryMetrics(rng: () => number): RegulatoryMetrics {
  // UMR: Uncleared Margin Rules - AANA threshold is EUR 8B
  const umrThreshold = 8000; // $M equivalent
  const aanaJitter = (rng() - 0.5) * 3000;
  const umrCurrentAANA = Math.round(12500 + aanaJitter); // Above threshold = in scope
  const umrCompliant = true; // Most large firms are compliant by now

  // ISDA SIMM calculations
  const simmBase = 4850;
  const simmJitter = (rng() - 0.5) * simmBase * 0.10;
  const simmInitialMargin = Math.round(simmBase + simmJitter);

  // Grid/schedule margin for comparison
  const gridBase = 6200;
  const gridJitter = (rng() - 0.5) * gridBase * 0.08;
  const gridScheduleMargin = Math.round(gridBase + gridJitter);

  // Minimum transfer amount and excess
  const minTransferAmount = 500; // $K
  const excessBase = 850;
  const excessJitter = (rng() - 0.5) * 400;
  const excessOverMinTransfer = Math.round(excessBase + excessJitter);

  return {
    umrCompliant,
    umrThreshold,
    umrCurrentAANA,
    simmInitialMargin,
    simmModelVersion: 'ISDA SIMM v2.6',
    gridScheduleMargin,
    excessOverMinTransfer,
    minTransferAmount,
  };
}

function generateCollateralOptimization(rng: () => number): CollateralOptimizationEntry[] {
  return OPTIMIZATION_CONFIGS.map((cfg) => {
    const currentJitter = (rng() - 0.5) * cfg.volatility * 2;
    const currentCost = Math.round((cfg.baseCurrent + currentJitter) * 10) / 10;

    const optimizedJitter = (rng() - 0.5) * cfg.volatility * 1.5;
    const optimizedCost = Math.round((cfg.baseOptimized + optimizedJitter) * 10) / 10;

    const savingsBps = Math.round((currentCost - optimizedCost) * 10) / 10;

    return {
      strategy: cfg.strategy,
      description: cfg.description,
      currentCost,
      optimizedCost,
      savingsBps,
      feasibility: cfg.feasibility,
    };
  });
}

function generateCollateralManagementData(): CollateralManagementResponse {
  const rng = seededRandom('collateral-management');

  const collateralPool = generateCollateralPool(rng);
  const marginRequirements = generateMarginRequirements(rng);
  const haircutSchedule = generateHaircutSchedule(rng);
  const concentrationLimits = generateConcentrationLimits(rng);
  const substitutionRequests = generateSubstitutionRequests(rng);
  const tripartyBalances = generateTripartyBalances(rng);
  const regulatoryMetrics = generateRegulatoryMetrics(rng);
  const collateralOptimization = generateCollateralOptimization(rng);

  return {
    collateralPool,
    marginRequirements,
    haircutSchedule,
    concentrationLimits,
    substitutionRequests,
    tripartyBalances,
    regulatoryMetrics,
    collateralOptimization,
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

    const data = generateCollateralManagementData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CollateralManagement] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate collateral management data' });
  }
});

export default router;
