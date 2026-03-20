import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface UpcomingRebalance {
  indexName: string;
  rebalanceDate: string;
  announcementDate: string;
  type: 'quarterly' | 'annual' | 'special';
}

interface ProjectedChange {
  indexName: string;
  direction: 'addition' | 'deletion';
  company: string;
  ticker: string;
  marketCapB: number;
  reason: 'market cap' | 'float' | 'sector reclassification';
  probability: number;
}

interface EstimatedFlow {
  indexName: string;
  company: string;
  ticker: string;
  direction: 'buy' | 'sell';
  sharesToTrade: number;
  pctOfAdv: number;
  estimatedPriceImpactBps: number;
}

interface HistoricalImpact {
  indexName: string;
  direction: 'addition' | 'deletion';
  avgMoveAnnouncementPct: number;
  avgMoveEffectivePct: number;
  avgMovePreAnnouncementPct: number;
  avgMovePostEffectivePct: number;
  sampleSize: number;
}

interface PassiveOwnership {
  indexName: string;
  passivePct: number;
  change1y: number;
  totalAumB: number;
  numFundsTracking: number;
}

interface FloatChange {
  company: string;
  ticker: string;
  eventType: 'IPO lock-up expiration' | 'insider selling' | 'share buyback';
  eventDate: string;
  sharesAffected: number;
  pctOfFloat: number;
  affectedIndex: string;
}

interface SectorWeightShift {
  indexName: string;
  sector: string;
  currentWeightPct: number;
  projectedWeightPct: number;
  changeBps: number;
}

interface TrackingCost {
  indexName: string;
  rebalanceDate: string;
  estimatedSlippageBps: number;
  estimatedTurnoverPct: number;
  avgBidAskSpreadBps: number;
  estimatedTotalCostBps: number;
}

interface IndexRebalanceResponse {
  upcomingRebalances: UpcomingRebalance[];
  projectedChanges: ProjectedChange[];
  estimatedFlows: EstimatedFlow[];
  historicalImpact: HistoricalImpact[];
  passiveOwnership: PassiveOwnership[];
  floatChanges: FloatChange[];
  sectorWeightShifts: SectorWeightShift[];
  trackingCost: TrackingCost[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: IndexRebalanceResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Index configuration ──

interface IndexConfig {
  name: string;
  rebalanceMonths: number[]; // months with scheduled rebalances (0-indexed)
  type: 'quarterly' | 'annual';
  basePassivePct: number;
  totalAumB: number;
  numFundsTracking: number;
}

const INDEX_CONFIGS: IndexConfig[] = [
  { name: 'S&P 500', rebalanceMonths: [2, 5, 8, 11], type: 'quarterly', basePassivePct: 22.5, totalAumB: 7850, numFundsTracking: 1245 },
  { name: 'Russell 2000', rebalanceMonths: [5], type: 'annual', basePassivePct: 14.2, totalAumB: 420, numFundsTracking: 385 },
  { name: 'MSCI World', rebalanceMonths: [1, 4, 7, 10], type: 'quarterly', basePassivePct: 8.7, totalAumB: 3200, numFundsTracking: 892 },
  { name: 'FTSE 100', rebalanceMonths: [2, 5, 8, 11], type: 'quarterly', basePassivePct: 16.8, totalAumB: 185, numFundsTracking: 312 },
  { name: 'Nasdaq 100', rebalanceMonths: [2, 5, 8, 11], type: 'quarterly', basePassivePct: 19.3, totalAumB: 520, numFundsTracking: 478 },
];

// ── Company pools for projected changes ──

interface CompanyConfig {
  company: string;
  ticker: string;
  marketCapB: number;
  sector: string;
  avgDailyVolume: number; // in millions of shares
}

const ADDITION_CANDIDATES: CompanyConfig[] = [
  { company: 'Reddit Inc', ticker: 'RDDT', marketCapB: 28.5, sector: 'Communication Services', avgDailyVolume: 8.2 },
  { company: 'Arm Holdings', ticker: 'ARM', marketCapB: 142.0, sector: 'Technology', avgDailyVolume: 5.1 },
  { company: 'Birkenstock Holding', ticker: 'BIRK', marketCapB: 11.2, sector: 'Consumer Discretionary', avgDailyVolume: 2.8 },
  { company: 'Instacart (Maplebear)', ticker: 'CART', marketCapB: 10.8, sector: 'Technology', avgDailyVolume: 3.4 },
  { company: 'Astera Labs', ticker: 'ALAB', marketCapB: 18.6, sector: 'Technology', avgDailyVolume: 4.5 },
  { company: 'Ibotta Inc', ticker: 'IBTA', marketCapB: 3.2, sector: 'Technology', avgDailyVolume: 1.1 },
  { company: 'Viking Holdings', ticker: 'VIK', marketCapB: 15.4, sector: 'Consumer Discretionary', avgDailyVolume: 3.9 },
  { company: 'Rubrik Inc', ticker: 'RBRK', marketCapB: 8.7, sector: 'Technology', avgDailyVolume: 2.6 },
  { company: 'Tempus AI', ticker: 'TEM', marketCapB: 12.3, sector: 'Health Care', avgDailyVolume: 6.2 },
  { company: 'Cava Group', ticker: 'CAVA', marketCapB: 14.1, sector: 'Consumer Discretionary', avgDailyVolume: 3.0 },
];

const DELETION_CANDIDATES: CompanyConfig[] = [
  { company: 'Whirlpool Corp', ticker: 'WHR', marketCapB: 5.1, sector: 'Consumer Discretionary', avgDailyVolume: 1.2 },
  { company: 'Zions Bancorporation', ticker: 'ZION', marketCapB: 6.8, sector: 'Financials', avgDailyVolume: 2.1 },
  { company: 'Comerica Inc', ticker: 'CMA', marketCapB: 7.2, sector: 'Financials', avgDailyVolume: 1.8 },
  { company: 'Mohawk Industries', ticker: 'MHK', marketCapB: 7.5, sector: 'Consumer Discretionary', avgDailyVolume: 0.9 },
  { company: 'Lincoln National', ticker: 'LNC', marketCapB: 4.9, sector: 'Financials', avgDailyVolume: 1.5 },
  { company: 'Paramount Global', ticker: 'PARA', marketCapB: 6.3, sector: 'Communication Services', avgDailyVolume: 8.5 },
  { company: 'VF Corporation', ticker: 'VFC', marketCapB: 5.6, sector: 'Consumer Discretionary', avgDailyVolume: 4.2 },
  { company: 'Dish Network', ticker: 'DISH', marketCapB: 3.8, sector: 'Communication Services', avgDailyVolume: 5.7 },
  { company: 'Organon & Co', ticker: 'OGN', marketCapB: 4.4, sector: 'Health Care', avgDailyVolume: 2.3 },
  { company: 'Newell Brands', ticker: 'NWL', marketCapB: 3.1, sector: 'Consumer Discretionary', avgDailyVolume: 3.6 },
];

// ── Float change configuration ──

interface FloatChangeConfig {
  company: string;
  ticker: string;
  eventType: 'IPO lock-up expiration' | 'insider selling' | 'share buyback';
  basePctOfFloat: number;
  baseSharesM: number;
  affectedIndex: string;
}

const FLOAT_CHANGE_CONFIGS: FloatChangeConfig[] = [
  { company: 'Reddit Inc', ticker: 'RDDT', eventType: 'IPO lock-up expiration', basePctOfFloat: 15.2, baseSharesM: 42, affectedIndex: 'S&P 500' },
  { company: 'Arm Holdings', ticker: 'ARM', eventType: 'insider selling', basePctOfFloat: 3.8, baseSharesM: 38, affectedIndex: 'Nasdaq 100' },
  { company: 'Apple Inc', ticker: 'AAPL', eventType: 'share buyback', basePctOfFloat: 1.2, baseSharesM: 185, affectedIndex: 'S&P 500' },
  { company: 'Alphabet Inc', ticker: 'GOOGL', eventType: 'share buyback', basePctOfFloat: 0.9, baseSharesM: 110, affectedIndex: 'S&P 500' },
  { company: 'Birkenstock Holding', ticker: 'BIRK', eventType: 'IPO lock-up expiration', basePctOfFloat: 22.5, baseSharesM: 28, affectedIndex: 'FTSE 100' },
  { company: 'Instacart (Maplebear)', ticker: 'CART', eventType: 'IPO lock-up expiration', basePctOfFloat: 18.7, baseSharesM: 35, affectedIndex: 'Nasdaq 100' },
  { company: 'Astera Labs', ticker: 'ALAB', eventType: 'IPO lock-up expiration', basePctOfFloat: 25.1, baseSharesM: 18, affectedIndex: 'Russell 2000' },
  { company: 'Microsoft Corp', ticker: 'MSFT', eventType: 'share buyback', basePctOfFloat: 0.7, baseSharesM: 52, affectedIndex: 'S&P 500' },
  { company: 'Shell PLC', ticker: 'SHEL', eventType: 'share buyback', basePctOfFloat: 2.1, baseSharesM: 95, affectedIndex: 'FTSE 100' },
  { company: 'Viking Holdings', ticker: 'VIK', eventType: 'IPO lock-up expiration', basePctOfFloat: 20.3, baseSharesM: 31, affectedIndex: 'MSCI World' },
];

// ── Sector configuration ──

interface SectorConfig {
  sector: string;
  baseWeights: Record<string, number>; // index name -> weight %
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseWeights: { 'S&P 500': 31.2, 'Russell 2000': 14.8, 'MSCI World': 23.5, 'FTSE 100': 1.2, 'Nasdaq 100': 58.4 } },
  { sector: 'Health Care', baseWeights: { 'S&P 500': 12.1, 'Russell 2000': 15.2, 'MSCI World': 11.8, 'FTSE 100': 10.5, 'Nasdaq 100': 7.2 } },
  { sector: 'Financials', baseWeights: { 'S&P 500': 13.4, 'Russell 2000': 16.5, 'MSCI World': 15.2, 'FTSE 100': 21.8, 'Nasdaq 100': 1.8 } },
  { sector: 'Consumer Discretionary', baseWeights: { 'S&P 500': 10.8, 'Russell 2000': 10.2, 'MSCI World': 10.5, 'FTSE 100': 12.3, 'Nasdaq 100': 14.6 } },
  { sector: 'Communication Services', baseWeights: { 'S&P 500': 8.9, 'Russell 2000': 2.8, 'MSCI World': 7.6, 'FTSE 100': 3.5, 'Nasdaq 100': 15.2 } },
  { sector: 'Industrials', baseWeights: { 'S&P 500': 8.7, 'Russell 2000': 15.4, 'MSCI World': 10.2, 'FTSE 100': 12.8, 'Nasdaq 100': 4.5 } },
  { sector: 'Energy', baseWeights: { 'S&P 500': 3.8, 'Russell 2000': 5.1, 'MSCI World': 4.5, 'FTSE 100': 13.2, 'Nasdaq 100': 0.5 } },
  { sector: 'Utilities', baseWeights: { 'S&P 500': 2.5, 'Russell 2000': 3.2, 'MSCI World': 2.8, 'FTSE 100': 3.8, 'Nasdaq 100': 1.2 } },
  { sector: 'Materials', baseWeights: { 'S&P 500': 2.4, 'Russell 2000': 4.5, 'MSCI World': 4.0, 'FTSE 100': 8.2, 'Nasdaq 100': 0.0 } },
  { sector: 'Real Estate', baseWeights: { 'S&P 500': 2.3, 'Russell 2000': 6.8, 'MSCI World': 2.5, 'FTSE 100': 1.2, 'Nasdaq 100': 0.0 } },
  { sector: 'Consumer Staples', baseWeights: { 'S&P 500': 5.9, 'Russell 2000': 3.5, 'MSCI World': 6.4, 'FTSE 100': 14.5, 'Nasdaq 100': 4.6 } },
];

// ── Helper: generate a future date string ──

function futureDate(rng: () => number, minDays: number, maxDays: number): string {
  const now = new Date();
  const days = Math.floor(minDays + rng() * (maxDays - minDays));
  const d = new Date(now.getTime() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

// ── Data generation ──

function generateUpcomingRebalances(rng: () => number): UpcomingRebalance[] {
  const results: UpcomingRebalance[] = [];

  for (const cfg of INDEX_CONFIGS) {
    const rebalanceDate = futureDate(rng, 7, 90);
    const annDaysOffset = Math.floor(14 + rng() * 21); // 14-35 days before rebalance
    const annDate = new Date(new Date(rebalanceDate).getTime() - annDaysOffset * 86400000);
    const announcementDate = annDate.toISOString().slice(0, 10);

    // Main scheduled rebalance
    results.push({
      indexName: cfg.name,
      rebalanceDate,
      announcementDate,
      type: cfg.type,
    });

    // Chance of a special rebalance
    if (rng() > 0.7) {
      results.push({
        indexName: cfg.name,
        rebalanceDate: futureDate(rng, 3, 30),
        announcementDate: futureDate(rng, 1, 10),
        type: 'special',
      });
    }
  }

  return results;
}

function generateProjectedChanges(rng: () => number): ProjectedChange[] {
  const results: ProjectedChange[] = [];
  const reasons: Array<'market cap' | 'float' | 'sector reclassification'> = ['market cap', 'float', 'sector reclassification'];

  for (const cfg of INDEX_CONFIGS) {
    // 2-4 additions per index
    const addCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < addCount && i < ADDITION_CANDIDATES.length; i++) {
      const idx = Math.floor(rng() * ADDITION_CANDIDATES.length);
      const c = ADDITION_CANDIDATES[idx];
      const mcapJitter = (rng() - 0.5) * c.marketCapB * 0.15;
      results.push({
        indexName: cfg.name,
        direction: 'addition',
        company: c.company,
        ticker: c.ticker,
        marketCapB: Math.round((c.marketCapB + mcapJitter) * 10) / 10,
        reason: reasons[Math.floor(rng() * reasons.length)],
        probability: Math.round((55 + rng() * 40) * 10) / 10,
      });
    }

    // 2-4 deletions per index
    const delCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < delCount && i < DELETION_CANDIDATES.length; i++) {
      const idx = Math.floor(rng() * DELETION_CANDIDATES.length);
      const c = DELETION_CANDIDATES[idx];
      const mcapJitter = (rng() - 0.5) * c.marketCapB * 0.15;
      results.push({
        indexName: cfg.name,
        direction: 'deletion',
        company: c.company,
        ticker: c.ticker,
        marketCapB: Math.round((c.marketCapB + mcapJitter) * 10) / 10,
        reason: reasons[Math.floor(rng() * reasons.length)],
        probability: Math.round((50 + rng() * 45) * 10) / 10,
      });
    }
  }

  return results;
}

function generateEstimatedFlows(rng: () => number, projectedChanges: ProjectedChange[]): EstimatedFlow[] {
  const results: EstimatedFlow[] = [];

  // Map ticker to avg daily volume from candidate pools
  const advMap = new Map<string, number>();
  for (const c of [...ADDITION_CANDIDATES, ...DELETION_CANDIDATES]) {
    advMap.set(c.ticker, c.avgDailyVolume);
  }

  for (const change of projectedChanges) {
    const adv = advMap.get(change.ticker) || (2 + rng() * 5);
    const advShares = adv * 1_000_000;

    // Passive funds need to buy/sell proportional to index weight
    const baseSharesPct = 5 + rng() * 25; // 5-30% of ADV
    const sharesToTrade = Math.round(advShares * (baseSharesPct / 100));
    const pctOfAdv = Math.round(baseSharesPct * 10) / 10;

    // Price impact: higher for less liquid names
    const liquidityFactor = Math.max(0.5, 1 / (adv / 3));
    const baseBps = 15 + rng() * 80;
    const estimatedPriceImpactBps = Math.round(baseBps * liquidityFactor * 10) / 10;

    results.push({
      indexName: change.indexName,
      company: change.company,
      ticker: change.ticker,
      direction: change.direction === 'addition' ? 'buy' : 'sell',
      sharesToTrade,
      pctOfAdv,
      estimatedPriceImpactBps,
    });
  }

  return results;
}

function generateHistoricalImpact(rng: () => number): HistoricalImpact[] {
  const results: HistoricalImpact[] = [];

  for (const cfg of INDEX_CONFIGS) {
    // Additions historically go up
    results.push({
      indexName: cfg.name,
      direction: 'addition',
      avgMoveAnnouncementPct: Math.round((3.5 + rng() * 4.0) * 100) / 100,
      avgMoveEffectivePct: Math.round((1.2 + rng() * 2.5) * 100) / 100,
      avgMovePreAnnouncementPct: Math.round((0.5 + rng() * 2.0) * 100) / 100,
      avgMovePostEffectivePct: Math.round((-0.8 + rng() * 1.5) * 100) / 100,
      sampleSize: 20 + Math.floor(rng() * 80),
    });

    // Deletions historically go down
    results.push({
      indexName: cfg.name,
      direction: 'deletion',
      avgMoveAnnouncementPct: Math.round((-4.2 + rng() * 3.0) * 100) / 100,
      avgMoveEffectivePct: Math.round((-2.1 + rng() * 2.0) * 100) / 100,
      avgMovePreAnnouncementPct: Math.round((-1.5 + rng() * 1.5) * 100) / 100,
      avgMovePostEffectivePct: Math.round((0.3 + rng() * 2.5) * 100) / 100,
      sampleSize: 20 + Math.floor(rng() * 80),
    });
  }

  return results;
}

function generatePassiveOwnership(rng: () => number): PassiveOwnership[] {
  return INDEX_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * 3;
    const passivePct = Math.round((cfg.basePassivePct + jitter) * 10) / 10;
    const change1y = Math.round((0.5 + rng() * 2.0) * 10) / 10; // passive share generally increasing
    const aumJitter = (rng() - 0.5) * cfg.totalAumB * 0.1;
    const totalAumB = Math.round((cfg.totalAumB + aumJitter) * 10) / 10;
    const fundsJitter = Math.floor((rng() - 0.5) * cfg.numFundsTracking * 0.08);
    const numFundsTracking = cfg.numFundsTracking + fundsJitter;

    return {
      indexName: cfg.name,
      passivePct,
      change1y,
      totalAumB,
      numFundsTracking,
    };
  });
}

function generateFloatChanges(rng: () => number): FloatChange[] {
  return FLOAT_CHANGE_CONFIGS.map((cfg) => {
    const pctJitter = (rng() - 0.5) * cfg.basePctOfFloat * 0.2;
    const pctOfFloat = Math.round((cfg.basePctOfFloat + pctJitter) * 10) / 10;
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseSharesM * 0.15);
    const sharesAffected = (cfg.baseSharesM + sharesJitter) * 1_000_000;
    const eventDate = futureDate(rng, 5, 120);

    return {
      company: cfg.company,
      ticker: cfg.ticker,
      eventType: cfg.eventType,
      eventDate,
      sharesAffected,
      pctOfFloat,
      affectedIndex: cfg.affectedIndex,
    };
  });
}

function generateSectorWeightShifts(rng: () => number): SectorWeightShift[] {
  const results: SectorWeightShift[] = [];

  for (const sector of SECTOR_CONFIGS) {
    for (const idx of INDEX_CONFIGS) {
      const currentWeight = sector.baseWeights[idx.name];
      if (currentWeight === undefined || currentWeight === 0) continue;

      const shiftBps = Math.round((rng() - 0.5) * 60); // -30 to +30 bps
      const projectedWeightPct = Math.round((currentWeight + shiftBps / 100) * 100) / 100;

      results.push({
        indexName: idx.name,
        sector: sector.sector,
        currentWeightPct: currentWeight,
        projectedWeightPct,
        changeBps: shiftBps,
      });
    }
  }

  return results;
}

function generateTrackingCost(rng: () => number, upcomingRebalances: UpcomingRebalance[]): TrackingCost[] {
  return upcomingRebalances.map((rb) => {
    const estimatedTurnoverPct = Math.round((1.5 + rng() * 6.0) * 100) / 100;
    const avgBidAskSpreadBps = Math.round((2.0 + rng() * 8.0) * 10) / 10;
    const estimatedSlippageBps = Math.round((3.0 + rng() * 12.0) * 10) / 10;
    const estimatedTotalCostBps = Math.round((estimatedSlippageBps + avgBidAskSpreadBps * 0.5) * 10) / 10;

    return {
      indexName: rb.indexName,
      rebalanceDate: rb.rebalanceDate,
      estimatedSlippageBps,
      estimatedTurnoverPct,
      avgBidAskSpreadBps,
      estimatedTotalCostBps,
    };
  });
}

function generateIndexRebalanceData(): IndexRebalanceResponse {
  const rng = seededRandom('index-rebalance');

  const upcomingRebalances = generateUpcomingRebalances(rng);
  const projectedChanges = generateProjectedChanges(rng);
  const estimatedFlows = generateEstimatedFlows(rng, projectedChanges);
  const historicalImpact = generateHistoricalImpact(rng);
  const passiveOwnership = generatePassiveOwnership(rng);
  const floatChanges = generateFloatChanges(rng);
  const sectorWeightShifts = generateSectorWeightShifts(rng);
  const trackingCost = generateTrackingCost(rng, upcomingRebalances);

  return {
    upcomingRebalances,
    projectedChanges,
    estimatedFlows,
    historicalImpact,
    passiveOwnership,
    floatChanges,
    sectorWeightShifts,
    trackingCost,
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

    const data = generateIndexRebalanceData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[IndexRebalance] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate index rebalance data' });
  }
});

export default router;
