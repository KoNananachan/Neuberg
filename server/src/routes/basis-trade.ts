import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface TreasuryBasisEntry {
  futuresContract: string;
  tenor: string;
  cashPrice: number;
  futuresPrice: number;
  basis: number;          // in 32nds
  netBasis: number;       // in 32nds
  impliedRepoRate: number; // %
  carryAdjBasis: number;
  dv01: number;           // $
}

interface CTDAnalysisEntry {
  cusip: string;
  coupon: number;         // %
  maturityDate: string;
  conversionFactor: number;
  grossBasis: number;     // 32nds
  netBasis: number;       // 32nds
  impliedRepoRate: number; // %
  switchOption: number;   // bps
  isCTD: boolean;
}

interface BasisHistoryEntry {
  date: string;
  grossBasis: number;
  netBasis: number;
  impliedRepo: number;
  fundingCost: number;
  carry: number;
}

interface BasisTradeSummary {
  avg10yBasis: number;
  avgImpliedRepo: number;
  sofrRate: number;
  basisRichCheap: 'RICH' | 'FAIR' | 'CHEAP';
  leveragedBasisEstimate: number; // $B
  timestamp: string;
}

interface BasisTradeResponse {
  treasuryBasis: TreasuryBasisEntry[];
  ctdAnalysis: CTDAnalysisEntry[];
  basisHistory: BasisHistoryEntry[];
  summary: BasisTradeSummary;
}

// ── Cache ──

let cache: { data: BasisTradeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Contract configuration ──

interface FuturesContractConfig {
  contract: string;
  tenor: string;
  baseCashPrice: number;
  baseFuturesPrice: number;
  baseDV01: number;
}

const FUTURES_CONTRACTS: FuturesContractConfig[] = [
  { contract: 'TUH6', tenor: '2Y',  baseCashPrice: 103.1875, baseFuturesPrice: 103.0625, baseDV01: 38.50 },
  { contract: 'TUM6', tenor: '2Y',  baseCashPrice: 103.2500, baseFuturesPrice: 103.1250, baseDV01: 38.80 },
  { contract: 'FVH6', tenor: '5Y',  baseCashPrice: 107.5625, baseFuturesPrice: 107.3750, baseDV01: 46.20 },
  { contract: 'FVM6', tenor: '5Y',  baseCashPrice: 107.6250, baseFuturesPrice: 107.4375, baseDV01: 46.50 },
  { contract: 'TYH6', tenor: '10Y', baseCashPrice: 112.2500, baseFuturesPrice: 111.8750, baseDV01: 68.40 },
  { contract: 'TYM6', tenor: '10Y', baseCashPrice: 112.3125, baseFuturesPrice: 111.9375, baseDV01: 68.70 },
  { contract: 'USH6', tenor: '20Y', baseCashPrice: 121.5000, baseFuturesPrice: 120.7500, baseDV01: 128.50 },
  { contract: 'WNH6', tenor: '30Y', baseCashPrice: 118.8750, baseFuturesPrice: 117.6875, baseDV01: 178.20 },
];

// ── CTD bond configuration ──

interface CTDBondConfig {
  cusip: string;
  coupon: number;
  maturityDate: string;
  baseConversionFactor: number;
  baseGrossBasis: number;
  tenor: string;
}

const CTD_BONDS: CTDBondConfig[] = [
  { cusip: '91282CKL5', coupon: 4.250, maturityDate: '2026-12-31', baseConversionFactor: 0.9412, baseGrossBasis: 2.8,  tenor: '2Y' },
  { cusip: '91282CKP6', coupon: 4.125, maturityDate: '2027-01-31', baseConversionFactor: 0.9356, baseGrossBasis: 3.1,  tenor: '2Y' },
  { cusip: '91282CJN3', coupon: 4.375, maturityDate: '2030-08-15', baseConversionFactor: 0.9285, baseGrossBasis: 5.4,  tenor: '5Y' },
  { cusip: '91282CJR4', coupon: 4.500, maturityDate: '2030-11-15', baseConversionFactor: 0.9318, baseGrossBasis: 4.9,  tenor: '5Y' },
  { cusip: '91282CHZ7', coupon: 4.000, maturityDate: '2034-02-15', baseConversionFactor: 0.8847, baseGrossBasis: 8.2,  tenor: '10Y' },
  { cusip: '91282CJB9', coupon: 4.250, maturityDate: '2034-08-15', baseConversionFactor: 0.8921, baseGrossBasis: 7.6,  tenor: '10Y' },
  { cusip: '912810TW8', coupon: 4.750, maturityDate: '2044-02-15', baseConversionFactor: 0.8654, baseGrossBasis: 12.5, tenor: '20Y' },
  { cusip: '912810TX6', coupon: 4.625, maturityDate: '2044-05-15', baseConversionFactor: 0.8598, baseGrossBasis: 13.8, tenor: '20Y' },
  { cusip: '912810TN8', coupon: 4.500, maturityDate: '2054-05-15', baseConversionFactor: 0.8312, baseGrossBasis: 18.4, tenor: '30Y' },
  { cusip: '912810TP3', coupon: 4.375, maturityDate: '2054-08-15', baseConversionFactor: 0.8256, baseGrossBasis: 19.1, tenor: '30Y' },
];

// ── Data generation ──

function generateTreasuryBasis(rng: () => number): TreasuryBasisEntry[] {
  return FUTURES_CONTRACTS.map((cfg) => {
    const cashJitter = (rng() - 0.5) * 0.5;   // +/- 0.25 points
    const futJitter = (rng() - 0.5) * 0.5;

    const cashPrice = Math.round((cfg.baseCashPrice + cashJitter) * 10000) / 10000;
    const futuresPrice = Math.round((cfg.baseFuturesPrice + futJitter) * 10000) / 10000;

    // Basis = (cash - futures) * 32, expressed in 32nds
    const rawBasis = (cashPrice - futuresPrice) * 32;
    const basis = Math.round(rawBasis * 100) / 100;

    // Net basis: gross basis minus carry, typically tighter
    const carryOffset = (rng() * 1.5 + 0.5); // carry component: 0.5 to 2.0 32nds
    const netBasis = Math.round((basis - carryOffset) * 100) / 100;

    // Implied repo rate: derived from basis, typically near SOFR (4.30% area)
    const baseImpliedRepo = 4.30 + (rng() - 0.5) * 0.40;
    const impliedRepoRate = Math.round(baseImpliedRepo * 1000) / 1000;

    // Carry-adjusted basis: net basis adjusted for financing
    const carryAdjBasis = Math.round((netBasis + (rng() - 0.5) * 0.6) * 100) / 100;

    // DV01 with small jitter
    const dv01 = Math.round((cfg.baseDV01 + (rng() - 0.5) * 3) * 100) / 100;

    return {
      futuresContract: cfg.contract,
      tenor: cfg.tenor,
      cashPrice,
      futuresPrice,
      basis,
      netBasis,
      impliedRepoRate,
      carryAdjBasis,
      dv01,
    };
  });
}

function generateCTDAnalysis(rng: () => number): CTDAnalysisEntry[] {
  // Track which tenor already has a CTD assigned
  const ctdAssigned = new Set<string>();

  return CTD_BONDS.map((cfg) => {
    const cfJitter = (rng() - 0.5) * 0.005;
    const conversionFactor = Math.round((cfg.baseConversionFactor + cfJitter) * 10000) / 10000;

    const grossBasisJitter = (rng() - 0.5) * 2.0;
    const grossBasis = Math.round((cfg.baseGrossBasis + grossBasisJitter) * 100) / 100;

    // Net basis: gross minus carry component
    const carryComponent = rng() * 2.5 + 1.0;
    const netBasis = Math.round((grossBasis - carryComponent) * 100) / 100;

    // Implied repo: CTD has highest implied repo rate in its basket
    const baseRepo = 4.25 + (rng() - 0.5) * 0.50;
    const impliedRepoRate = Math.round(baseRepo * 1000) / 1000;

    // Switch option value: premium for optionality between deliverables
    const switchOption = Math.round((rng() * 5 + 0.5) * 10) / 10;

    // First bond per tenor with lowest net basis is CTD
    let isCTD = false;
    if (!ctdAssigned.has(cfg.tenor)) {
      isCTD = true;
      ctdAssigned.add(cfg.tenor);
    }

    return {
      cusip: cfg.cusip,
      coupon: cfg.coupon,
      maturityDate: cfg.maturityDate,
      conversionFactor,
      grossBasis: grossBasis,
      netBasis,
      impliedRepoRate,
      switchOption,
      isCTD,
    };
  });
}

function generateBasisHistory(rng: () => number): BasisHistoryEntry[] {
  const entries: BasisHistoryEntry[] = [];
  const today = new Date();
  const baseGross = 7.8;  // 10Y gross basis starting level in 32nds
  const baseRepo = 4.32;
  const baseFunding = 4.30; // SOFR-ish

  for (let i = 7; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7); // weekly data points
    const dateStr = d.toISOString().slice(0, 10);

    const grossDrift = (rng() - 0.5) * 1.5;
    const grossBasis = Math.round((baseGross + grossDrift + i * 0.08) * 100) / 100;

    const carryComp = rng() * 1.8 + 1.0;
    const netBasis = Math.round((grossBasis - carryComp) * 100) / 100;

    const repoJitter = (rng() - 0.5) * 0.15;
    const impliedRepo = Math.round((baseRepo + repoJitter) * 1000) / 1000;

    const fundingJitter = (rng() - 0.5) * 0.08;
    const fundingCost = Math.round((baseFunding + fundingJitter) * 1000) / 1000;

    // Carry = implied repo - funding cost, annualized
    const carry = Math.round((impliedRepo - fundingCost) * 1000) / 1000;

    entries.push({ date: dateStr, grossBasis, netBasis, impliedRepo, fundingCost, carry });
  }

  return entries;
}

function generateBasisTradeData(): BasisTradeResponse {
  const rng = seededRandom('basis-trade');

  const treasuryBasis = generateTreasuryBasis(rng);
  const ctdAnalysis = generateCTDAnalysis(rng);
  const basisHistory = generateBasisHistory(rng);

  // Summary
  const tenY = treasuryBasis.filter((e) => e.tenor === '10Y');
  const avg10yBasis = tenY.length > 0
    ? Math.round((tenY.reduce((s, e) => s + e.basis, 0) / tenY.length) * 100) / 100
    : 0;

  const allImpliedRepo = treasuryBasis.map((e) => e.impliedRepoRate);
  const avgImpliedRepo = Math.round(
    (allImpliedRepo.reduce((s, r) => s + r, 0) / allImpliedRepo.length) * 1000
  ) / 1000;

  // SOFR reference rate
  const sofrRate = Math.round((4.30 + (rng() - 0.5) * 0.06) * 1000) / 1000;

  // Rich/Cheap determination based on avg implied repo vs SOFR
  const spread = avgImpliedRepo - sofrRate;
  let basisRichCheap: 'RICH' | 'FAIR' | 'CHEAP';
  if (spread > 0.05) {
    basisRichCheap = 'CHEAP'; // implied repo above SOFR = basis is cheap
  } else if (spread < -0.05) {
    basisRichCheap = 'RICH';  // implied repo below SOFR = basis is rich
  } else {
    basisRichCheap = 'FAIR';
  }

  // Leveraged basis trade estimate: hedge fund positioning in $B
  const leveragedBasisEstimate = Math.round((780 + (rng() - 0.5) * 120) * 10) / 10;

  const summary: BasisTradeSummary = {
    avg10yBasis,
    avgImpliedRepo,
    sofrRate,
    basisRichCheap,
    leveragedBasisEstimate,
    timestamp: new Date().toISOString(),
  };

  return { treasuryBasis, ctdAnalysis, basisHistory, summary };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateBasisTradeData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BasisTrade] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate basis trade monitor data' });
  }
});

export default router;
