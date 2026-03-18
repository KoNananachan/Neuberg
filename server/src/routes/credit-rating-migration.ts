import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type Agency = 'S&P' | 'Moodys' | 'Fitch';
type ActionType = 'upgrade' | 'downgrade' | 'outlook change' | 'watch';
type WatchDirection = 'positive' | 'negative' | 'developing';

interface TransitionMatrix {
  agency: Agency;
  ratings: string[];
  matrix: number[][];
}

interface RatingAction {
  issuer: string;
  ticker: string;
  agency: Agency;
  actionType: ActionType;
  fromRating: string;
  toRating: string;
  date: string;
  sector: string;
}

interface FallenAngel {
  issuer: string;
  fromRating: string;
  toRating: string;
  date: string;
  outstandingDebt: number;
  spreadImpact: number;
}

interface RisingStar {
  issuer: string;
  fromRating: string;
  toRating: string;
  date: string;
  outstandingDebt: number;
}

interface WatchListEntry {
  issuer: string;
  currentRating: string;
  direction: WatchDirection;
  agency: Agency;
  datePlaced: string;
  reason: string;
}

interface SectorMigration {
  sector: string;
  upgrades: number;
  downgrades: number;
  netRatio: number;
  trend: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
}

interface DefaultRate {
  initialRating: string;
  year1: number;
  year3: number;
  year5: number;
  year10: number;
}

interface SpreadByRating {
  rating: string;
  currentSpread: number;
  historicalMedian: number;
  historicalPercentile: number;
  change1w: number;
  change1m: number;
}

interface CreditRatingMigrationResponse {
  transitionMatrices: TransitionMatrix[];
  recentActions: RatingAction[];
  fallenAngels: FallenAngel[];
  risingStars: RisingStar[];
  watchList: WatchListEntry[];
  sectorMigration: SectorMigration[];
  defaultRates: DefaultRate[];
  spreadByRating: SpreadByRating[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: CreditRatingMigrationResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Transition matrix base probabilities (S&P scale) ──

const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'] as const;

// Base 1-year transition probabilities (rows = from, cols = to), approximate S&P historical
const BASE_TRANSITION_SP: number[][] = [
  /* AAA */ [90.81, 8.33, 0.68, 0.06, 0.12, 0.00, 0.00, 0.00],
  /* AA  */ [0.70, 90.65, 7.79, 0.64, 0.06, 0.14, 0.02, 0.00],
  /* A   */ [0.09, 2.27, 91.05, 5.52, 0.74, 0.26, 0.01, 0.06],
  /* BBB */ [0.02, 0.33, 5.95, 86.93, 5.30, 1.17, 0.12, 0.18],
  /* BB  */ [0.03, 0.14, 0.67, 7.73, 80.53, 8.84, 1.00, 1.06],
  /* B   */ [0.00, 0.11, 0.24, 0.43, 6.48, 83.46, 4.07, 5.21],
  /* CCC */ [0.22, 0.00, 0.22, 1.30, 2.38, 11.24, 64.86, 19.78],
  /* D   */ [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 100.00],
];

// ── Recent actions configuration ──

interface ActionConfig {
  issuer: string;
  ticker: string;
  sector: string;
  baseFromIdx: number;
  baseToIdx: number;
  actionType: ActionType;
}

const ACTION_CONFIGS: ActionConfig[] = [
  { issuer: 'Ford Motor Company', ticker: 'F', sector: 'Automotive', baseFromIdx: 4, baseToIdx: 3, actionType: 'upgrade' },
  { issuer: 'Boeing Company', ticker: 'BA', sector: 'Aerospace & Defense', baseFromIdx: 3, baseToIdx: 4, actionType: 'downgrade' },
  { issuer: 'AT&T Inc', ticker: 'T', sector: 'Telecommunications', baseFromIdx: 3, baseToIdx: 3, actionType: 'outlook change' },
  { issuer: 'Occidental Petroleum', ticker: 'OXY', sector: 'Energy', baseFromIdx: 4, baseToIdx: 4, actionType: 'watch' },
  { issuer: 'Delta Air Lines', ticker: 'DAL', sector: 'Airlines', baseFromIdx: 3, baseToIdx: 3, actionType: 'outlook change' },
  { issuer: 'Kraft Heinz Company', ticker: 'KHC', sector: 'Consumer Staples', baseFromIdx: 3, baseToIdx: 4, actionType: 'downgrade' },
  { issuer: 'Carnival Corporation', ticker: 'CCL', sector: 'Leisure', baseFromIdx: 5, baseToIdx: 4, actionType: 'upgrade' },
  { issuer: 'General Motors', ticker: 'GM', sector: 'Automotive', baseFromIdx: 3, baseToIdx: 3, actionType: 'outlook change' },
  { issuer: 'Paramount Global', ticker: 'PARA', sector: 'Media & Entertainment', baseFromIdx: 4, baseToIdx: 5, actionType: 'downgrade' },
  { issuer: 'Royal Caribbean Cruises', ticker: 'RCL', sector: 'Leisure', baseFromIdx: 4, baseToIdx: 3, actionType: 'upgrade' },
  { issuer: 'Freeport-McMoRan', ticker: 'FCX', sector: 'Mining', baseFromIdx: 3, baseToIdx: 3, actionType: 'watch' },
  { issuer: 'Walgreens Boots Alliance', ticker: 'WBA', sector: 'Healthcare', baseFromIdx: 4, baseToIdx: 5, actionType: 'downgrade' },
  { issuer: 'Spirit Airlines', ticker: 'SAVE', sector: 'Airlines', baseFromIdx: 6, baseToIdx: 7, actionType: 'downgrade' },
  { issuer: 'Netflix Inc', ticker: 'NFLX', sector: 'Technology', baseFromIdx: 3, baseToIdx: 2, actionType: 'upgrade' },
  { issuer: 'Telecom Italia', ticker: 'TIT', sector: 'Telecommunications', baseFromIdx: 4, baseToIdx: 4, actionType: 'outlook change' },
];

// ── Fallen angels configuration ──

interface FallenAngelConfig {
  issuer: string;
  fromRating: string;
  toRating: string;
  baseDebt: number;
  baseSpreadImpact: number;
}

const FALLEN_ANGEL_CONFIGS: FallenAngelConfig[] = [
  { issuer: 'Walgreens Boots Alliance', fromRating: 'BBB-', toRating: 'BB+', baseDebt: 8.2, baseSpreadImpact: 145 },
  { issuer: 'Paramount Global', fromRating: 'BBB-', toRating: 'BB+', baseDebt: 14.6, baseSpreadImpact: 162 },
  { issuer: 'Advance Auto Parts', fromRating: 'BBB-', toRating: 'BB+', baseDebt: 3.8, baseSpreadImpact: 128 },
  { issuer: 'Whirlpool Corporation', fromRating: 'BBB-', toRating: 'BB+', baseDebt: 5.1, baseSpreadImpact: 110 },
  { issuer: 'Eurozone Telecom SA', fromRating: 'BBB-', toRating: 'BB', baseDebt: 12.3, baseSpreadImpact: 185 },
  { issuer: 'Global Mining Corp', fromRating: 'BBB-', toRating: 'BB+', baseDebt: 6.7, baseSpreadImpact: 137 },
];

// ── Rising stars configuration ──

interface RisingStarConfig {
  issuer: string;
  fromRating: string;
  toRating: string;
  baseDebt: number;
}

const RISING_STAR_CONFIGS: RisingStarConfig[] = [
  { issuer: 'Ford Motor Company', fromRating: 'BB+', toRating: 'BBB-', baseDebt: 45.2 },
  { issuer: 'Royal Caribbean Cruises', fromRating: 'BB+', toRating: 'BBB-', baseDebt: 20.8 },
  { issuer: 'Carnival Corporation', fromRating: 'BB', toRating: 'BBB-', baseDebt: 31.5 },
  { issuer: 'FirstEnergy Corp', fromRating: 'BB+', toRating: 'BBB-', baseDebt: 17.3 },
  { issuer: 'Kraft Heinz Company', fromRating: 'BB+', toRating: 'BBB-', baseDebt: 22.1 },
];

// ── Watch list configuration ──

interface WatchConfig {
  issuer: string;
  currentRating: string;
  direction: WatchDirection;
  reason: string;
}

const WATCH_CONFIGS: WatchConfig[] = [
  { issuer: 'Boeing Company', currentRating: 'BBB-', direction: 'negative', reason: 'Production delays and quality concerns' },
  { issuer: 'Occidental Petroleum', currentRating: 'BB+', direction: 'positive', reason: 'Debt reduction from asset sales' },
  { issuer: 'Freeport-McMoRan', currentRating: 'BBB', direction: 'negative', reason: 'Copper price volatility and capex uncertainty' },
  { issuer: 'Telecom Italia', currentRating: 'BB+', direction: 'positive', reason: 'Network separation and deleveraging plan' },
  { issuer: 'Spirit Airlines', currentRating: 'CCC', direction: 'negative', reason: 'Liquidity concerns and competitive pressure' },
  { issuer: 'Lumen Technologies', currentRating: 'B-', direction: 'negative', reason: 'Revenue decline and high leverage' },
  { issuer: 'General Motors', currentRating: 'BBB', direction: 'developing', reason: 'EV transition costs and market share shifts' },
  { issuer: 'VF Corporation', currentRating: 'BBB-', direction: 'negative', reason: 'Weak consumer demand and leverage' },
  { issuer: 'Peloton Interactive', currentRating: 'B', direction: 'negative', reason: 'Declining subscribers and cash burn' },
  { issuer: 'Rolls-Royce Holdings', currentRating: 'BB+', direction: 'positive', reason: 'Improved aftermarket revenue and cost cuts' },
];

// ── Sector migration configuration ──

interface SectorConfig {
  sector: string;
  baseUpgrades: number;
  baseDowngrades: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Financials', baseUpgrades: 42, baseDowngrades: 28 },
  { sector: 'Technology', baseUpgrades: 38, baseDowngrades: 15 },
  { sector: 'Energy', baseUpgrades: 35, baseDowngrades: 31 },
  { sector: 'Healthcare', baseUpgrades: 25, baseDowngrades: 22 },
  { sector: 'Consumer Discretionary', baseUpgrades: 18, baseDowngrades: 32 },
  { sector: 'Industrials', baseUpgrades: 30, baseDowngrades: 26 },
  { sector: 'Telecommunications', baseUpgrades: 12, baseDowngrades: 20 },
  { sector: 'Utilities', baseUpgrades: 22, baseDowngrades: 14 },
  { sector: 'Real Estate', baseUpgrades: 10, baseDowngrades: 25 },
  { sector: 'Materials', baseUpgrades: 16, baseDowngrades: 18 },
  { sector: 'Consumer Staples', baseUpgrades: 20, baseDowngrades: 16 },
];

// ── Default rates base data (cumulative %, S&P historical averages) ──

interface DefaultRateConfig {
  initialRating: string;
  year1: number;
  year3: number;
  year5: number;
  year10: number;
}

const DEFAULT_RATE_CONFIGS: DefaultRateConfig[] = [
  { initialRating: 'AAA', year1: 0.00, year3: 0.03, year5: 0.10, year10: 0.35 },
  { initialRating: 'AA', year1: 0.02, year3: 0.08, year5: 0.19, year10: 0.55 },
  { initialRating: 'A', year1: 0.06, year3: 0.21, year5: 0.43, year10: 1.15 },
  { initialRating: 'BBB', year1: 0.18, year3: 0.72, year5: 1.35, year10: 3.20 },
  { initialRating: 'BB', year1: 1.06, year3: 4.85, year5: 8.62, year10: 15.40 },
  { initialRating: 'B', year1: 5.21, year3: 14.30, year5: 21.15, year10: 30.85 },
  { initialRating: 'CCC', year1: 19.78, year3: 35.50, year5: 42.60, year10: 50.20 },
];

// ── Spread by rating base data ──

interface SpreadConfig {
  rating: string;
  baseSpread: number;
  historicalMedian: number;
  volatility: number;
}

const SPREAD_CONFIGS: SpreadConfig[] = [
  { rating: 'AAA', baseSpread: 48, historicalMedian: 55, volatility: 8 },
  { rating: 'AA', baseSpread: 62, historicalMedian: 70, volatility: 10 },
  { rating: 'A', baseSpread: 88, historicalMedian: 95, volatility: 14 },
  { rating: 'BBB', baseSpread: 138, historicalMedian: 150, volatility: 22 },
  { rating: 'BB', baseSpread: 245, historicalMedian: 280, volatility: 40 },
  { rating: 'B', baseSpread: 420, historicalMedian: 450, volatility: 65 },
  { rating: 'CCC', baseSpread: 850, historicalMedian: 900, volatility: 150 },
];

// ── Data generation ──

function generateTransitionMatrices(rng: () => number): TransitionMatrix[] {
  const agencies: Agency[] = ['S&P', 'Moodys', 'Fitch'];
  const ratings = [...RATINGS];

  return agencies.map((agency) => {
    const matrix = BASE_TRANSITION_SP.map((row) => {
      const jittered = row.map((val) => {
        if (val === 0) return 0;
        if (val === 100) return 100;
        const jitter = (rng() - 0.5) * Math.min(val * 0.08, 1.5);
        return Math.max(0, val + jitter);
      });

      // Normalize row to sum to 100
      const sum = jittered.reduce((a, b) => a + b, 0);
      const normalized = jittered.map((v) => Math.round((v / sum) * 10000) / 100);

      // Fix rounding to ensure exact 100
      const normalizedSum = normalized.reduce((a, b) => a + b, 0);
      const diff = Math.round((100 - normalizedSum) * 100) / 100;
      const maxIdx = normalized.indexOf(Math.max(...normalized));
      normalized[maxIdx] = Math.round((normalized[maxIdx] + diff) * 100) / 100;

      return normalized;
    });

    return { agency, ratings, matrix };
  });
}

function generateRecentActions(rng: () => number): RatingAction[] {
  const agencies: Agency[] = ['S&P', 'Moodys', 'Fitch'];
  const ratings = [...RATINGS];

  return ACTION_CONFIGS.map((cfg) => {
    const agencyIdx = Math.floor(rng() * agencies.length);
    const agency = agencies[agencyIdx];

    // For outlook change/watch, fromRating and toRating are the same
    let fromIdx = cfg.baseFromIdx;
    let toIdx = cfg.baseToIdx;

    // Minor index jitter for variety
    if (cfg.actionType === 'upgrade' || cfg.actionType === 'downgrade') {
      const jitter = Math.floor(rng() * 2);
      fromIdx = Math.max(0, Math.min(ratings.length - 1, fromIdx + (rng() > 0.7 ? jitter : 0)));
      toIdx = Math.max(0, Math.min(ratings.length - 1, toIdx + (rng() > 0.7 ? jitter : 0)));
    }

    // Generate a date within the last 30 days
    const daysAgo = Math.floor(rng() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      ticker: cfg.ticker,
      agency,
      actionType: cfg.actionType,
      fromRating: ratings[fromIdx],
      toRating: ratings[toIdx],
      date: dateStr,
      sector: cfg.sector,
    };
  });
}

function generateFallenAngels(rng: () => number): FallenAngel[] {
  return FALLEN_ANGEL_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseDebt * 0.1;
    const outstandingDebt = Math.round((cfg.baseDebt + debtJitter) * 10) / 10;

    const spreadJitter = (rng() - 0.5) * cfg.baseSpreadImpact * 0.15;
    const spreadImpact = Math.round(cfg.baseSpreadImpact + spreadJitter);

    const daysAgo = Math.floor(rng() * 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      fromRating: cfg.fromRating,
      toRating: cfg.toRating,
      date: dateStr,
      outstandingDebt,
      spreadImpact,
    };
  });
}

function generateRisingStars(rng: () => number): RisingStar[] {
  return RISING_STAR_CONFIGS.map((cfg) => {
    const debtJitter = (rng() - 0.5) * cfg.baseDebt * 0.1;
    const outstandingDebt = Math.round((cfg.baseDebt + debtJitter) * 10) / 10;

    const daysAgo = Math.floor(rng() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      fromRating: cfg.fromRating,
      toRating: cfg.toRating,
      date: dateStr,
      outstandingDebt,
    };
  });
}

function generateWatchList(rng: () => number): WatchListEntry[] {
  const agencies: Agency[] = ['S&P', 'Moodys', 'Fitch'];

  return WATCH_CONFIGS.map((cfg) => {
    const agencyIdx = Math.floor(rng() * agencies.length);
    const agency = agencies[agencyIdx];

    const daysAgo = Math.floor(rng() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const datePlaced = date.toISOString().slice(0, 10);

    return {
      issuer: cfg.issuer,
      currentRating: cfg.currentRating,
      direction: cfg.direction,
      agency,
      datePlaced,
      reason: cfg.reason,
    };
  });
}

function generateSectorMigration(rng: () => number): SectorMigration[] {
  return SECTOR_CONFIGS.map((cfg) => {
    const upJitter = Math.floor((rng() - 0.5) * cfg.baseUpgrades * 0.25);
    const downJitter = Math.floor((rng() - 0.5) * cfg.baseDowngrades * 0.25);

    const upgrades = Math.max(0, cfg.baseUpgrades + upJitter);
    const downgrades = Math.max(1, cfg.baseDowngrades + downJitter);

    const netRatio = Math.round((upgrades / downgrades) * 100) / 100;

    let trend: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
    if (netRatio > 1.2) {
      trend = 'IMPROVING';
    } else if (netRatio < 0.8) {
      trend = 'DETERIORATING';
    } else {
      trend = 'STABLE';
    }

    return {
      sector: cfg.sector,
      upgrades,
      downgrades,
      netRatio,
      trend,
    };
  });
}

function generateDefaultRates(rng: () => number): DefaultRate[] {
  return DEFAULT_RATE_CONFIGS.map((cfg) => {
    const jitter1 = (rng() - 0.5) * cfg.year1 * 0.1;
    const jitter3 = (rng() - 0.5) * cfg.year3 * 0.1;
    const jitter5 = (rng() - 0.5) * cfg.year5 * 0.1;
    const jitter10 = (rng() - 0.5) * cfg.year10 * 0.1;

    return {
      initialRating: cfg.initialRating,
      year1: Math.round(Math.max(0, cfg.year1 + jitter1) * 100) / 100,
      year3: Math.round(Math.max(0, cfg.year3 + jitter3) * 100) / 100,
      year5: Math.round(Math.max(0, cfg.year5 + jitter5) * 100) / 100,
      year10: Math.round(Math.max(0, cfg.year10 + jitter10) * 100) / 100,
    };
  });
}

function generateSpreadByRating(rng: () => number): SpreadByRating[] {
  return SPREAD_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * cfg.volatility * 2;
    const currentSpread = Math.round(cfg.baseSpread + spreadJitter);

    // Historical percentile: where current spread falls vs historical range
    const rawPercentile = ((cfg.historicalMedian - currentSpread) / cfg.historicalMedian) * 50 + 50;
    const historicalPercentile = Math.round(Math.max(1, Math.min(99, rawPercentile + (rng() - 0.5) * 20)));

    const change1w = Math.round((rng() - 0.5) * cfg.volatility * 0.5);
    const change1m = Math.round((rng() - 0.5) * cfg.volatility * 1.5);

    return {
      rating: cfg.rating,
      currentSpread,
      historicalMedian: cfg.historicalMedian,
      historicalPercentile,
      change1w,
      change1m,
    };
  });
}

function generateCreditRatingMigrationData(): CreditRatingMigrationResponse {
  const rng = seededRandom('credit-rating-migration');

  const transitionMatrices = generateTransitionMatrices(rng);
  const recentActions = generateRecentActions(rng);
  const fallenAngels = generateFallenAngels(rng);
  const risingStars = generateRisingStars(rng);
  const watchList = generateWatchList(rng);
  const sectorMigration = generateSectorMigration(rng);
  const defaultRates = generateDefaultRates(rng);
  const spreadByRating = generateSpreadByRating(rng);

  return {
    transitionMatrices,
    recentActions,
    fallenAngels,
    risingStars,
    watchList,
    sectorMigration,
    defaultRates,
    spreadByRating,
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

    const data = generateCreditRatingMigrationData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CreditRatingMigration] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate credit rating migration data' });
  }
});

export default router;
