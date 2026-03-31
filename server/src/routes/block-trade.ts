import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

type BuyerSellerType = 'Hedge Fund' | 'Mutual Fund' | 'Private Equity' | 'Insider';
type TradeSide = 'BUY' | 'SELL';

interface BlockTrade {
  ticker: string;
  company: string;
  side: TradeSide;
  shares: number;
  valueMln: number;
  pctOfAdv: number;
  vwapDiscountPremium: number;
  broker: string;
  time: string;
  participantType: BuyerSellerType;
}

interface LargestBlock {
  ticker: string;
  company: string;
  side: TradeSide;
  shares: number;
  valueMln: number;
  pctOfAdv: number;
  broker: string;
  participantType: BuyerSellerType;
  date: string;
}

interface SectorActivity {
  sector: string;
  tradeCount: number;
  totalValueMln: number;
  avgDiscountBps: number;
}

interface CrossTrade {
  ticker: string;
  company: string;
  originMarket: string;
  destinationMarket: string;
  valueMln: number;
  type: 'ADR Placement' | 'Cross-Border Block' | 'Dual Listing';
  broker: string;
}

interface SecondaryOffering {
  ticker: string;
  company: string;
  sizeMln: number;
  discountPct: number;
  bookrunner: string;
  pricingDate: string;
  type: 'Follow-On' | 'Secondary' | 'Bought Deal' | 'Accelerated Bookbuild';
}

interface LockupExpiration {
  ticker: string;
  company: string;
  ipoDate: string;
  unlockDate: string;
  sharesUnlocking: number;
  pctOfFloat: number;
}

interface DarkPoolPrint {
  ticker: string;
  size: number;
  price: number;
  pctOfAdv: number;
  venue: string;
}

interface MarketImpact {
  ticker: string;
  side: TradeSide;
  valueMln: number;
  preTradePrice: number;
  blockPrice: number;
  price1hrAfter: number;
  price1dayAfter: number;
  recoveryPct: number;
}

interface BlockTradeSummary {
  totalBlockVolumeMln: number;
  avgDiscountBps: number;
  avgPctOfAdv: number;
  largestBlockMln: number;
  totalTradeCount: number;
  timestamp: string;
}

interface BlockTradeResponse {
  recentBlocks: BlockTrade[];
  largestBlocks: LargestBlock[];
  sectorActivity: SectorActivity[];
  crossTrades: CrossTrade[];
  secondaryOfferings: SecondaryOffering[];
  lockupExpirations: LockupExpiration[];
  darkPoolPrints: DarkPoolPrint[];
  marketImpact: MarketImpact[];
  summary: BlockTradeSummary;
}

// ── Cache ──

let cache: { data: BlockTradeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Configuration ──

interface RecentBlockConfig {
  ticker: string;
  company: string;
  baseShares: number;
  baseValueMln: number;
  baseAdvPct: number;
}

const RECENT_BLOCK_CONFIGS: RecentBlockConfig[] = [
  { ticker: 'NVDA', company: 'NVIDIA Corp', baseShares: 2800000, baseValueMln: 312.5, baseAdvPct: 4.2 },
  { ticker: 'META', company: 'Meta Platforms Inc', baseShares: 1200000, baseValueMln: 625.0, baseAdvPct: 6.8 },
  { ticker: 'TSLA', company: 'Tesla Inc', baseShares: 3500000, baseValueMln: 875.0, baseAdvPct: 3.1 },
  { ticker: 'AMZN', company: 'Amazon.com Inc', baseShares: 1800000, baseValueMln: 340.0, baseAdvPct: 2.5 },
  { ticker: 'AAPL', company: 'Apple Inc', baseShares: 2200000, baseValueMln: 480.0, baseAdvPct: 1.9 },
  { ticker: 'MSFT', company: 'Microsoft Corp', baseShares: 900000, baseValueMln: 395.0, baseAdvPct: 2.1 },
  { ticker: 'JPM', company: 'JPMorgan Chase & Co', baseShares: 1600000, baseValueMln: 350.0, baseAdvPct: 5.5 },
  { ticker: 'GOOGL', company: 'Alphabet Inc', baseShares: 1100000, baseValueMln: 190.0, baseAdvPct: 3.8 },
  { ticker: 'UNH', company: 'UnitedHealth Group Inc', baseShares: 450000, baseValueMln: 265.0, baseAdvPct: 7.2 },
  { ticker: 'V', company: 'Visa Inc', baseShares: 700000, baseValueMln: 210.0, baseAdvPct: 4.5 },
  { ticker: 'BAC', company: 'Bank of America Corp', baseShares: 4200000, baseValueMln: 180.0, baseAdvPct: 3.2 },
  { ticker: 'HD', company: 'Home Depot Inc', baseShares: 520000, baseValueMln: 205.0, baseAdvPct: 5.8 },
  { ticker: 'PFE', company: 'Pfizer Inc', baseShares: 3800000, baseValueMln: 105.0, baseAdvPct: 4.1 },
  { ticker: 'XOM', company: 'Exxon Mobil Corp', baseShares: 1500000, baseValueMln: 175.0, baseAdvPct: 2.8 },
  { ticker: 'LLY', company: 'Eli Lilly and Co', baseShares: 320000, baseValueMln: 285.0, baseAdvPct: 6.1 },
];

const SIDES: TradeSide[] = ['BUY', 'SELL'];
const PARTICIPANT_TYPES: BuyerSellerType[] = ['Hedge Fund', 'Mutual Fund', 'Private Equity', 'Insider'];
const BROKERS = [
  'Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'Citigroup',
  'Barclays', 'Bank of America', 'UBS', 'Credit Suisse',
  'Deutsche Bank', 'Jefferies', 'Cantor Fitzgerald', 'Cowen',
];

const SECTORS = [
  { sector: 'Technology', baseCount: 28, baseValueMln: 4200, baseDiscountBps: 35 },
  { sector: 'Healthcare', baseCount: 18, baseValueMln: 2800, baseDiscountBps: 45 },
  { sector: 'Financials', baseCount: 22, baseValueMln: 3100, baseDiscountBps: 30 },
  { sector: 'Consumer Discretionary', baseCount: 15, baseValueMln: 1900, baseDiscountBps: 40 },
  { sector: 'Energy', baseCount: 12, baseValueMln: 1650, baseDiscountBps: 25 },
  { sector: 'Industrials', baseCount: 14, baseValueMln: 1450, baseDiscountBps: 38 },
  { sector: 'Communication Services', baseCount: 10, baseValueMln: 1800, baseDiscountBps: 32 },
  { sector: 'Materials', baseCount: 8, baseValueMln: 680, baseDiscountBps: 42 },
  { sector: 'Real Estate', baseCount: 6, baseValueMln: 520, baseDiscountBps: 50 },
  { sector: 'Utilities', baseCount: 5, baseValueMln: 380, baseDiscountBps: 28 },
];

interface CrossTradeConfig {
  ticker: string;
  company: string;
  originMarket: string;
  destinationMarket: string;
  baseValueMln: number;
  type: 'ADR Placement' | 'Cross-Border Block' | 'Dual Listing';
}

const CROSS_TRADE_CONFIGS: CrossTradeConfig[] = [
  { ticker: 'BABA', company: 'Alibaba Group Holding', originMarket: 'Hong Kong', destinationMarket: 'NYSE', baseValueMln: 420.0, type: 'ADR Placement' },
  { ticker: 'TSM', company: 'Taiwan Semiconductor', originMarket: 'TWSE', destinationMarket: 'NYSE', baseValueMln: 680.0, type: 'ADR Placement' },
  { ticker: 'SHEL', company: 'Shell PLC', originMarket: 'LSE', destinationMarket: 'NYSE', baseValueMln: 310.0, type: 'Dual Listing' },
  { ticker: 'NVO', company: 'Novo Nordisk A/S', originMarket: 'Copenhagen', destinationMarket: 'NYSE', baseValueMln: 550.0, type: 'ADR Placement' },
  { ticker: 'SAP', company: 'SAP SE', originMarket: 'XETRA', destinationMarket: 'NYSE', baseValueMln: 275.0, type: 'Cross-Border Block' },
  { ticker: 'TM', company: 'Toyota Motor Corp', originMarket: 'TSE', destinationMarket: 'NYSE', baseValueMln: 195.0, type: 'ADR Placement' },
  { ticker: 'ASML', company: 'ASML Holding NV', originMarket: 'Euronext', destinationMarket: 'NASDAQ', baseValueMln: 485.0, type: 'Dual Listing' },
  { ticker: 'UL', company: 'Unilever PLC', originMarket: 'LSE', destinationMarket: 'NYSE', baseValueMln: 160.0, type: 'Cross-Border Block' },
];

interface SecondaryOfferingConfig {
  ticker: string;
  company: string;
  baseSizeMln: number;
  baseDiscountPct: number;
  bookrunner: string;
  type: 'Follow-On' | 'Secondary' | 'Bought Deal' | 'Accelerated Bookbuild';
}

const SECONDARY_OFFERING_CONFIGS: SecondaryOfferingConfig[] = [
  { ticker: 'PLTR', company: 'Palantir Technologies', baseSizeMln: 1200, baseDiscountPct: 3.5, bookrunner: 'Goldman Sachs', type: 'Follow-On' },
  { ticker: 'COIN', company: 'Coinbase Global Inc', baseSizeMln: 850, baseDiscountPct: 4.2, bookrunner: 'Morgan Stanley', type: 'Secondary' },
  { ticker: 'RBLX', company: 'Roblox Corp', baseSizeMln: 650, baseDiscountPct: 3.8, bookrunner: 'J.P. Morgan', type: 'Accelerated Bookbuild' },
  { ticker: 'SNOW', company: 'Snowflake Inc', baseSizeMln: 980, baseDiscountPct: 2.9, bookrunner: 'Goldman Sachs', type: 'Bought Deal' },
  { ticker: 'DKNG', company: 'DraftKings Inc', baseSizeMln: 520, baseDiscountPct: 4.5, bookrunner: 'Citigroup', type: 'Follow-On' },
  { ticker: 'NET', company: 'Cloudflare Inc', baseSizeMln: 740, baseDiscountPct: 3.1, bookrunner: 'Barclays', type: 'Accelerated Bookbuild' },
  { ticker: 'CRWD', company: 'CrowdStrike Holdings', baseSizeMln: 1100, baseDiscountPct: 2.5, bookrunner: 'Morgan Stanley', type: 'Bought Deal' },
];

interface LockupConfig {
  ticker: string;
  company: string;
  ipoDate: string;
  daysToUnlock: number;
  baseSharesUnlocking: number;
  basePctOfFloat: number;
}

const LOCKUP_CONFIGS: LockupConfig[] = [
  { ticker: 'ARM', company: 'Arm Holdings PLC', ipoDate: '2023-09-14', daysToUnlock: 5, baseSharesUnlocking: 75600000, basePctOfFloat: 18.5 },
  { ticker: 'BIRK', company: 'Birkenstock Holding', ipoDate: '2023-10-11', daysToUnlock: 12, baseSharesUnlocking: 42000000, basePctOfFloat: 22.3 },
  { ticker: 'CART', company: 'Instacart (Maplebear)', ipoDate: '2023-09-19', daysToUnlock: 3, baseSharesUnlocking: 58900000, basePctOfFloat: 25.1 },
  { ticker: 'KNTE', company: 'Kinnate Biopharma', ipoDate: '2024-02-08', daysToUnlock: 21, baseSharesUnlocking: 18500000, basePctOfFloat: 31.2 },
  { ticker: 'VKT', company: 'Viking Therapeutics', ipoDate: '2024-01-15', daysToUnlock: 8, baseSharesUnlocking: 32100000, basePctOfFloat: 15.7 },
  { ticker: 'RDDT', company: 'Reddit Inc', ipoDate: '2024-03-21', daysToUnlock: 15, baseSharesUnlocking: 48200000, basePctOfFloat: 28.4 },
  { ticker: 'ALAB', company: 'Astera Labs Inc', ipoDate: '2024-03-20', daysToUnlock: 30, baseSharesUnlocking: 22700000, basePctOfFloat: 19.8 },
  { ticker: 'IBKR', company: 'Interactive Brokers', ipoDate: '2024-04-02', daysToUnlock: 45, baseSharesUnlocking: 15400000, basePctOfFloat: 12.1 },
];

interface DarkPoolConfig {
  ticker: string;
  baseSize: number;
  basePrice: number;
  baseAdvPct: number;
  venue: string;
}

const DARK_POOL_CONFIGS: DarkPoolConfig[] = [
  { ticker: 'NVDA', baseSize: 1850000, basePrice: 128.45, baseAdvPct: 2.8, venue: 'Crossfinder' },
  { ticker: 'TSLA', baseSize: 2400000, basePrice: 248.30, baseAdvPct: 1.9, venue: 'Sigma X' },
  { ticker: 'AAPL', baseSize: 1600000, basePrice: 218.75, baseAdvPct: 1.2, venue: 'POSIT' },
  { ticker: 'META', baseSize: 920000, basePrice: 515.60, baseAdvPct: 3.5, venue: 'MS Pool' },
  { ticker: 'AMD', baseSize: 3100000, basePrice: 178.20, baseAdvPct: 4.1, venue: 'Level ATS' },
  { ticker: 'AMZN', baseSize: 1250000, basePrice: 192.40, baseAdvPct: 1.6, venue: 'Crossfinder' },
  { ticker: 'GOOGL', baseSize: 780000, basePrice: 175.90, baseAdvPct: 2.2, venue: 'Sigma X' },
  { ticker: 'JPM', baseSize: 1450000, basePrice: 215.30, baseAdvPct: 3.8, venue: 'Instinet' },
  { ticker: 'BAC', baseSize: 5200000, basePrice: 42.80, baseAdvPct: 2.5, venue: 'POSIT' },
  { ticker: 'MSFT', baseSize: 680000, basePrice: 435.10, baseAdvPct: 1.8, venue: 'UBS ATS' },
  { ticker: 'XOM', baseSize: 1900000, basePrice: 118.60, baseAdvPct: 2.1, venue: 'Level ATS' },
  { ticker: 'LLY', baseSize: 280000, basePrice: 885.40, baseAdvPct: 4.6, venue: 'MS Pool' },
];

interface MarketImpactConfig {
  ticker: string;
  basePrePrice: number;
  baseValueMln: number;
  baseDiscountPct: number;
  baseRecoveryPct: number;
}

const MARKET_IMPACT_CONFIGS: MarketImpactConfig[] = [
  { ticker: 'NVDA', basePrePrice: 130.20, baseValueMln: 315.0, baseDiscountPct: 1.8, baseRecoveryPct: 72.0 },
  { ticker: 'META', basePrePrice: 520.50, baseValueMln: 630.0, baseDiscountPct: 2.1, baseRecoveryPct: 65.0 },
  { ticker: 'TSLA', basePrePrice: 252.80, baseValueMln: 880.0, baseDiscountPct: 2.5, baseRecoveryPct: 58.0 },
  { ticker: 'AMZN', basePrePrice: 195.40, baseValueMln: 345.0, baseDiscountPct: 1.5, baseRecoveryPct: 78.0 },
  { ticker: 'AAPL', basePrePrice: 220.10, baseValueMln: 485.0, baseDiscountPct: 1.2, baseRecoveryPct: 85.0 },
  { ticker: 'JPM', basePrePrice: 218.60, baseValueMln: 355.0, baseDiscountPct: 1.6, baseRecoveryPct: 80.0 },
  { ticker: 'UNH', basePrePrice: 585.30, baseValueMln: 270.0, baseDiscountPct: 2.8, baseRecoveryPct: 55.0 },
  { ticker: 'LLY', basePrePrice: 890.70, baseValueMln: 290.0, baseDiscountPct: 2.3, baseRecoveryPct: 62.0 },
  { ticker: 'BAC', basePrePrice: 43.50, baseValueMln: 185.0, baseDiscountPct: 1.4, baseRecoveryPct: 82.0 },
  { ticker: 'XOM', basePrePrice: 120.30, baseValueMln: 180.0, baseDiscountPct: 1.1, baseRecoveryPct: 88.0 },
];

// ── Helpers ──

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateTimeToday(rng: () => number): string {
  const hour = 9 + Math.floor(rng() * 8); // 09:00 - 16:59
  const minute = Math.floor(rng() * 60);
  const second = Math.floor(rng() * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function generateDateOffset(rng: () => number, maxDays: number): string {
  const now = new Date();
  const offset = Math.floor(rng() * maxDays);
  const d = new Date(now.getTime() + offset * 86400000);
  return d.toISOString().slice(0, 10);
}

function generatePastDate(rng: () => number, maxDaysAgo: number): string {
  const now = new Date();
  const offset = Math.floor(rng() * maxDaysAgo);
  const d = new Date(now.getTime() - offset * 86400000);
  return d.toISOString().slice(0, 10);
}

// ── Data generation ──

function generateRecentBlocks(rng: () => number): BlockTrade[] {
  return RECENT_BLOCK_CONFIGS.map((cfg) => {
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseShares * 0.25);
    const shares = cfg.baseShares + sharesJitter;

    const valueJitter = (rng() - 0.5) * cfg.baseValueMln * 0.2;
    const valueMln = Math.round((cfg.baseValueMln + valueJitter) * 10) / 10;

    const advJitter = (rng() - 0.5) * cfg.baseAdvPct * 0.3;
    const pctOfAdv = Math.round((cfg.baseAdvPct + advJitter) * 10) / 10;

    // Discount (negative) or premium (positive) to VWAP in bps
    const vwapDiscountPremium = Math.round((rng() - 0.6) * 120) ; // slight bias toward discount

    const side = pick(rng, SIDES);
    const participantType = pick(rng, PARTICIPANT_TYPES);
    const broker = pick(rng, BROKERS);
    const time = generateTimeToday(rng);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      side,
      shares,
      valueMln,
      pctOfAdv,
      vwapDiscountPremium,
      broker,
      time,
      participantType,
    };
  });
}

function generateLargestBlocks(rng: () => number): LargestBlock[] {
  // Pick top configs by base value and add variation
  const sorted = [...RECENT_BLOCK_CONFIGS].sort((a, b) => b.baseValueMln - a.baseValueMln);
  const top = sorted.slice(0, 8);

  return top.map((cfg) => {
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseShares * 0.3);
    const shares = cfg.baseShares + sharesJitter;

    // Largest blocks are bigger than average
    const valueMultiplier = 1.2 + rng() * 0.6;
    const valueMln = Math.round(cfg.baseValueMln * valueMultiplier * 10) / 10;

    const advJitter = (rng() - 0.5) * cfg.baseAdvPct * 0.4;
    const pctOfAdv = Math.round((cfg.baseAdvPct + advJitter + 2.0) * 10) / 10;

    const side = pick(rng, SIDES);
    const participantType = pick(rng, PARTICIPANT_TYPES);
    const broker = pick(rng, BROKERS);
    const date = generatePastDate(rng, 5);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      side,
      shares,
      valueMln,
      pctOfAdv,
      broker,
      participantType,
      date,
    };
  });
}

function generateSectorActivity(rng: () => number): SectorActivity[] {
  return SECTORS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * cfg.baseCount * 0.25);
    const tradeCount = Math.max(1, cfg.baseCount + countJitter);

    const valueJitter = (rng() - 0.5) * cfg.baseValueMln * 0.2;
    const totalValueMln = Math.round((cfg.baseValueMln + valueJitter) * 10) / 10;

    const discountJitter = (rng() - 0.5) * cfg.baseDiscountBps * 0.3;
    const avgDiscountBps = Math.round((cfg.baseDiscountBps + discountJitter) * 10) / 10;

    return {
      sector: cfg.sector,
      tradeCount,
      totalValueMln,
      avgDiscountBps,
    };
  });
}

function generateCrossTrades(rng: () => number): CrossTrade[] {
  return CROSS_TRADE_CONFIGS.map((cfg) => {
    const valueJitter = (rng() - 0.5) * cfg.baseValueMln * 0.2;
    const valueMln = Math.round((cfg.baseValueMln + valueJitter) * 10) / 10;

    const broker = pick(rng, BROKERS);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      originMarket: cfg.originMarket,
      destinationMarket: cfg.destinationMarket,
      valueMln,
      type: cfg.type,
      broker,
    };
  });
}

function generateSecondaryOfferings(rng: () => number): SecondaryOffering[] {
  return SECONDARY_OFFERING_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * cfg.baseSizeMln * 0.15;
    const sizeMln = Math.round((cfg.baseSizeMln + sizeJitter) * 10) / 10;

    const discountJitter = (rng() - 0.5) * cfg.baseDiscountPct * 0.25;
    const discountPct = Math.round((cfg.baseDiscountPct + discountJitter) * 100) / 100;

    const pricingDate = generatePastDate(rng, 10);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      sizeMln,
      discountPct,
      bookrunner: cfg.bookrunner,
      pricingDate,
      type: cfg.type,
    };
  });
}

function generateLockupExpirations(rng: () => number): LockupExpiration[] {
  return LOCKUP_CONFIGS.map((cfg) => {
    const sharesJitter = Math.floor((rng() - 0.5) * cfg.baseSharesUnlocking * 0.1);
    const sharesUnlocking = cfg.baseSharesUnlocking + sharesJitter;

    const pctJitter = (rng() - 0.5) * cfg.basePctOfFloat * 0.15;
    const pctOfFloat = Math.round((cfg.basePctOfFloat + pctJitter) * 10) / 10;

    const unlockDate = generateDateOffset(rng, cfg.daysToUnlock);

    return {
      ticker: cfg.ticker,
      company: cfg.company,
      ipoDate: cfg.ipoDate,
      unlockDate,
      sharesUnlocking,
      pctOfFloat,
    };
  });
}

function generateDarkPoolPrints(rng: () => number): DarkPoolPrint[] {
  return DARK_POOL_CONFIGS.map((cfg) => {
    const sizeJitter = Math.floor((rng() - 0.5) * cfg.baseSize * 0.25);
    const size = cfg.baseSize + sizeJitter;

    const priceJitter = (rng() - 0.5) * cfg.basePrice * 0.03;
    const price = Math.round((cfg.basePrice + priceJitter) * 100) / 100;

    const advJitter = (rng() - 0.5) * cfg.baseAdvPct * 0.3;
    const pctOfAdv = Math.round((cfg.baseAdvPct + advJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      size,
      price,
      pctOfAdv,
      venue: cfg.venue,
    };
  });
}

function generateMarketImpact(rng: () => number): MarketImpact[] {
  return MARKET_IMPACT_CONFIGS.map((cfg) => {
    const side: TradeSide = rng() > 0.5 ? 'SELL' : 'BUY';

    const preJitter = (rng() - 0.5) * cfg.basePrePrice * 0.02;
    const preTradePrice = Math.round((cfg.basePrePrice + preJitter) * 100) / 100;

    const valueJitter = (rng() - 0.5) * cfg.baseValueMln * 0.2;
    const valueMln = Math.round((cfg.baseValueMln + valueJitter) * 10) / 10;

    const discountJitter = (rng() - 0.5) * cfg.baseDiscountPct * 0.3;
    const discountPct = (cfg.baseDiscountPct + discountJitter) / 100;

    // Block price reflects discount for sells, premium for buys
    const direction = side === 'SELL' ? -1 : 1;
    const blockPrice = Math.round(preTradePrice * (1 + direction * discountPct) * 100) / 100;

    // 1hr after: partial recovery toward pre-trade
    const recoveryJitter = (rng() - 0.5) * cfg.baseRecoveryPct * 0.2;
    const recoveryPct = Math.round(Math.max(0, Math.min(100, cfg.baseRecoveryPct + recoveryJitter)) * 10) / 10;

    const priceDiff = preTradePrice - blockPrice;
    const recovery1hr = priceDiff * (recoveryPct / 100) * 0.6;
    const price1hrAfter = Math.round((blockPrice + recovery1hr) * 100) / 100;

    const recovery1day = priceDiff * (recoveryPct / 100);
    const price1dayAfter = Math.round((blockPrice + recovery1day) * 100) / 100;

    return {
      ticker: cfg.ticker,
      side,
      valueMln,
      preTradePrice,
      blockPrice,
      price1hrAfter,
      price1dayAfter,
      recoveryPct,
    };
  });
}

function generateBlockTradeData(): BlockTradeResponse {
  const rng = seededRandom('block-trade');

  const recentBlocks = generateRecentBlocks(rng);
  const largestBlocks = generateLargestBlocks(rng);
  const sectorActivity = generateSectorActivity(rng);
  const crossTrades = generateCrossTrades(rng);
  const secondaryOfferings = generateSecondaryOfferings(rng);
  const lockupExpirations = generateLockupExpirations(rng);
  const darkPoolPrints = generateDarkPoolPrints(rng);
  const marketImpact = generateMarketImpact(rng);

  // Summary
  const totalBlockVolumeMln = Math.round(
    recentBlocks.reduce((sum, b) => sum + b.valueMln, 0) * 10
  ) / 10;

  const avgDiscountBps = recentBlocks.length > 0
    ? Math.round(
        (recentBlocks.reduce((sum, b) => sum + b.vwapDiscountPremium, 0) / recentBlocks.length) * 10
      ) / 10
    : 0;

  const avgPctOfAdv = recentBlocks.length > 0
    ? Math.round(
        (recentBlocks.reduce((sum, b) => sum + b.pctOfAdv, 0) / recentBlocks.length) * 10
      ) / 10
    : 0;

  const largestBlockMln = largestBlocks.length > 0
    ? Math.max(...largestBlocks.map((b) => b.valueMln))
    : 0;

  const totalTradeCount = sectorActivity.reduce((sum, s) => sum + s.tradeCount, 0);

  const summary: BlockTradeSummary = {
    totalBlockVolumeMln,
    avgDiscountBps,
    avgPctOfAdv,
    largestBlockMln,
    totalTradeCount,
    timestamp: new Date().toISOString(),
  };

  return {
    recentBlocks,
    largestBlocks,
    sectorActivity,
    crossTrades,
    secondaryOfferings,
    lockupExpirations,
    darkPoolPrints,
    marketImpact,
    summary,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateBlockTradeData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BlockTrade] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate block trade data' });
  }
});

export default router;
