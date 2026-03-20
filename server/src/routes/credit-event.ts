import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Seed Data ──

const EVENT_TYPES = ['Default', 'Restructuring', 'Failure-to-Pay', 'Bankruptcy', 'Obligation Acceleration', 'Repudiation/Moratorium', 'Distressed Exchange'] as const;
const RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D'] as const;
const SECTORS = ['Technology', 'Energy', 'Healthcare', 'Financials', 'Consumer', 'Industrial', 'Utilities', 'Real Estate'] as const;

const CREDIT_EVENT_ENTITIES = [
  { name: 'Lehman Brothers Holdings', ticker: 'LEHMQ', eventType: 0, baseRecovery: 8.6, baseNotional: 72000, hasCdsAuction: true, auctionFinalPrice: 8.625, sector: 'Financials' },
  { name: 'Enron Corp', ticker: 'ENRNQ', eventType: 3, baseRecovery: 12.4, baseNotional: 31800, hasCdsAuction: true, auctionFinalPrice: 12.375, sector: 'Energy' },
  { name: 'WorldCom Inc', ticker: 'WCOEQ', eventType: 3, baseRecovery: 35.7, baseNotional: 41000, hasCdsAuction: true, auctionFinalPrice: 35.625, sector: 'Technology' },
  { name: 'Meridian Energy Holdings', ticker: 'MEREH', eventType: 2, baseRecovery: 22.5, baseNotional: 4800, hasCdsAuction: true, auctionFinalPrice: 22.25, sector: 'Energy' },
  { name: 'Pinnacle Media Group', ticker: 'PNMG', eventType: 6, baseRecovery: 45.0, baseNotional: 2100, hasCdsAuction: false, auctionFinalPrice: null, sector: 'Consumer' },
  { name: 'Solaris Telecom Inc', ticker: 'SLRTQ', eventType: 0, baseRecovery: 6.5, baseNotional: 8900, hasCdsAuction: true, auctionFinalPrice: 6.375, sector: 'Technology' },
  { name: 'Evergreen Retail Corp', ticker: 'EVRGQ', eventType: 3, baseRecovery: 3.2, baseNotional: 1900, hasCdsAuction: true, auctionFinalPrice: 3.125, sector: 'Consumer' },
  { name: 'Atlas Shipping Co', ticker: 'ATLSQ', eventType: 2, baseRecovery: 28.5, baseNotional: 3600, hasCdsAuction: true, auctionFinalPrice: 28.75, sector: 'Industrial' },
  { name: 'Sterling Financial Group', ticker: 'STFGQ', eventType: 0, baseRecovery: 14.8, baseNotional: 12500, hasCdsAuction: true, auctionFinalPrice: 14.625, sector: 'Financials' },
  { name: 'Cascade Mining Corp', ticker: 'CSCMQ', eventType: 4, baseRecovery: 18.3, baseNotional: 2200, hasCdsAuction: false, auctionFinalPrice: null, sector: 'Energy' },
  { name: 'Vanguard Airlines LLC', ticker: 'VGALQ', eventType: 3, baseRecovery: 5.0, baseNotional: 6200, hasCdsAuction: true, auctionFinalPrice: 5.125, sector: 'Industrial' },
  { name: 'Pacific Realty Trust', ticker: 'PCRTQ', eventType: 6, baseRecovery: 52.0, baseNotional: 1750, hasCdsAuction: false, auctionFinalPrice: null, sector: 'Real Estate' },
  { name: 'Nordic Paper AB', ticker: 'NRDPQ', eventType: 1, baseRecovery: 38.0, baseNotional: 980, hasCdsAuction: true, auctionFinalPrice: 37.875, sector: 'Industrial' },
  { name: 'Cobalt Resources Inc', ticker: 'CBLTQ', eventType: 2, baseRecovery: 11.2, baseNotional: 3400, hasCdsAuction: true, auctionFinalPrice: 11.0, sector: 'Energy' },
  { name: 'Zenith Chemicals AG', ticker: 'ZNCHQ', eventType: 0, baseRecovery: 19.5, baseNotional: 2800, hasCdsAuction: true, auctionFinalPrice: 19.375, sector: 'Industrial' },
  { name: 'Trident Offshore Ltd', ticker: 'TRDOQ', eventType: 2, baseRecovery: 15.6, baseNotional: 5100, hasCdsAuction: true, auctionFinalPrice: 15.5, sector: 'Energy' },
  { name: 'Metro Construction Ltd', ticker: 'MTRCQ', eventType: 5, baseRecovery: 0, baseNotional: 7200, hasCdsAuction: false, auctionFinalPrice: null, sector: 'Industrial' },
  { name: 'Sapphire Leisure Corp', ticker: 'SPHLQ', eventType: 3, baseRecovery: 8.0, baseNotional: 1450, hasCdsAuction: true, auctionFinalPrice: 7.875, sector: 'Consumer' },
  { name: 'Apex Pharmaceuticals', ticker: 'APXPQ', eventType: 6, baseRecovery: 41.0, baseNotional: 2650, hasCdsAuction: false, auctionFinalPrice: null, sector: 'Healthcare' },
  { name: 'Falcon Logistics PLC', ticker: 'FLNLQ', eventType: 2, baseRecovery: 24.0, baseNotional: 1800, hasCdsAuction: true, auctionFinalPrice: 24.125, sector: 'Industrial' },
];

const AUCTION_CALENDAR_ENTITIES = [
  { entity: 'Continental Auto Parts', ticker: 'CTAPQ', sector: 'Industrial' },
  { entity: 'Horizon Healthcare Inc', ticker: 'HRHCQ', sector: 'Healthcare' },
  { entity: 'Riptide Energy Corp', ticker: 'RPENQ', sector: 'Energy' },
  { entity: 'Summit Retail Holdings', ticker: 'SMRHQ', sector: 'Consumer' },
  { entity: 'Granite Financial Services', ticker: 'GRFSQ', sector: 'Financials' },
  { entity: 'Polaris Tech Systems', ticker: 'PLTSQ', sector: 'Technology' },
  { entity: 'Ironwood Paper & Packaging', ticker: 'IRWPQ', sector: 'Industrial' },
  { entity: 'Crestview Media Inc', ticker: 'CVMIQ', sector: 'Consumer' },
];

const WATCHLIST_ISSUERS = [
  { name: 'Obsidian Energy Partners', ticker: 'OBEP', sector: 'Energy', baseCdsSpread: 820, basePd1y: 8.5, basePd5y: 32.0, baseDtd: 1.8, rating: 'B-', reason: 'Liquidity shortfall; revolving credit facility expiring Q2' },
  { name: 'Titanium Healthcare Group', ticker: 'THGR', sector: 'Healthcare', baseCdsSpread: 1150, basePd1y: 14.2, basePd5y: 48.5, baseDtd: 1.2, rating: 'CCC+', reason: 'Missed interest coverage covenant; bank waiver pending' },
  { name: 'Vertex Consumer Brands', ticker: 'VCBR', sector: 'Consumer', baseCdsSpread: 680, basePd1y: 5.8, basePd5y: 24.0, baseDtd: 2.3, rating: 'B', reason: 'Revenue decline 3 consecutive quarters; margin compression' },
  { name: 'Keystone Financial Corp', ticker: 'KYFC', sector: 'Financials', baseCdsSpread: 950, basePd1y: 11.0, basePd5y: 38.0, baseDtd: 1.5, rating: 'CCC+', reason: 'Deposit flight; unrealized bond losses exceeding Tier 1 capital' },
  { name: 'Quantum Chip Technologies', ticker: 'QCHP', sector: 'Technology', baseCdsSpread: 540, basePd1y: 4.2, basePd5y: 18.5, baseDtd: 2.8, rating: 'B+', reason: 'Key customer contract loss; debt/EBITDA above 7x' },
  { name: 'Redwood Timber Industries', ticker: 'RWTI', sector: 'Industrial', baseCdsSpread: 1320, basePd1y: 18.5, basePd5y: 55.0, baseDtd: 0.9, rating: 'CCC', reason: 'Debt exchange offer circulating; bondholder committee formed' },
  { name: 'Clearwater Utilities Inc', ticker: 'CWUI', sector: 'Utilities', baseCdsSpread: 480, basePd1y: 3.5, basePd5y: 15.0, baseDtd: 3.1, rating: 'BB-', reason: 'Regulatory rate case denial; capex obligations exceed cash flow' },
  { name: 'Ironclad Real Estate Trust', ticker: 'ICRE', sector: 'Real Estate', baseCdsSpread: 890, basePd1y: 9.8, basePd5y: 35.0, baseDtd: 1.6, rating: 'B-', reason: 'Occupancy below 70%; $1.2B maturity wall in 12 months' },
  { name: 'Nexus Petroleum Ltd', ticker: 'NXPL', sector: 'Energy', baseCdsSpread: 1480, basePd1y: 22.0, basePd5y: 62.0, baseDtd: 0.7, rating: 'CCC-', reason: 'Oil hedges expiring; break-even above current spot price' },
  { name: 'Crimson Airlines Group', ticker: 'CRAG', sector: 'Industrial', baseCdsSpread: 760, basePd1y: 7.2, basePd5y: 28.0, baseDtd: 2.0, rating: 'B', reason: 'Fuel cost surge; load factor declining; covenant breach risk' },
  { name: 'Beacon Pharmaceuticals', ticker: 'BCPH', sector: 'Healthcare', baseCdsSpread: 620, basePd1y: 5.0, basePd5y: 21.0, baseDtd: 2.5, rating: 'B+', reason: 'FDA rejection of lead drug; pipeline concentrated' },
  { name: 'Cobblestone Financial', ticker: 'CBSF', sector: 'Financials', baseCdsSpread: 1050, basePd1y: 13.0, basePd5y: 42.0, baseDtd: 1.3, rating: 'CCC+', reason: 'CRE exposure 40% of book; rising delinquencies' },
  { name: 'Westfield Consumer Corp', ticker: 'WFCC', sector: 'Consumer', baseCdsSpread: 920, basePd1y: 10.5, basePd5y: 37.0, baseDtd: 1.4, rating: 'CCC+', reason: 'Store closures accelerating; negative same-store sales 8 quarters' },
  { name: 'Aurora Tech Holdings', ticker: 'ARTH', sector: 'Technology', baseCdsSpread: 1200, basePd1y: 16.0, basePd5y: 50.0, baseDtd: 1.0, rating: 'CCC', reason: 'Cash burn rate unsustainable; convertible maturity in 6 months' },
  { name: 'Pinnacle Gas & Power', ticker: 'PNGP', sector: 'Utilities', baseCdsSpread: 710, basePd1y: 6.5, basePd5y: 26.0, baseDtd: 2.1, rating: 'B', reason: 'Counterparty default on long-term supply contract' },
];

const DEFAULT_RATE_CONFIGS: { sector: string; igRate1y: number; igRate5y: number; hyRate1y: number; hyRate5y: number }[] = [
  { sector: 'Technology', igRate1y: 0.04, igRate5y: 0.28, hyRate1y: 1.85, hyRate5y: 12.40 },
  { sector: 'Energy', igRate1y: 0.08, igRate5y: 0.52, hyRate1y: 3.20, hyRate5y: 18.60 },
  { sector: 'Healthcare', igRate1y: 0.03, igRate5y: 0.22, hyRate1y: 2.10, hyRate5y: 13.80 },
  { sector: 'Financials', igRate1y: 0.06, igRate5y: 0.38, hyRate1y: 2.45, hyRate5y: 15.20 },
  { sector: 'Consumer', igRate1y: 0.05, igRate5y: 0.35, hyRate1y: 2.80, hyRate5y: 16.50 },
  { sector: 'Industrial', igRate1y: 0.05, igRate5y: 0.32, hyRate1y: 2.30, hyRate5y: 14.20 },
  { sector: 'Utilities', igRate1y: 0.02, igRate5y: 0.15, hyRate1y: 1.40, hyRate5y: 9.80 },
  { sector: 'Real Estate', igRate1y: 0.07, igRate5y: 0.45, hyRate1y: 3.50, hyRate5y: 19.80 },
];

const RECOVERY_SENIORITY_CONFIGS = [
  { seniority: 'Senior Secured', baseRate: 52.0, stdDev: 18.0, sampleSize: 420 },
  { seniority: 'Senior Unsecured', baseRate: 37.0, stdDev: 22.0, sampleSize: 1250 },
  { seniority: 'Subordinated', baseRate: 18.5, stdDev: 16.0, sampleSize: 380 },
];

const RECOVERY_SECTOR_CONFIGS = [
  { sector: 'Technology', baseRate: 42.0, sampleSize: 95 },
  { sector: 'Energy', baseRate: 33.8, sampleSize: 198 },
  { sector: 'Healthcare', baseRate: 36.7, sampleSize: 112 },
  { sector: 'Financials', baseRate: 38.5, sampleSize: 285 },
  { sector: 'Consumer', baseRate: 30.5, sampleSize: 245 },
  { sector: 'Industrial', baseRate: 39.2, sampleSize: 310 },
  { sector: 'Utilities', baseRate: 58.3, sampleSize: 62 },
  { sector: 'Real Estate', baseRate: 42.8, sampleSize: 78 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const rng = seededRandom('credit-event');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── 1. Recent Credit Events (20) ──
  const shuffledEvents = [...CREDIT_EVENT_ENTITIES].sort(() => rng() - 0.5);
  const recentCreditEvents = shuffledEvents.slice(0, 20).map((ent, i) => {
    const daysAgo = 1 + Math.floor(rng() * 90);
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - daysAgo);

    const recoveryRate = ent.baseRecovery > 0
      ? roundTo(Math.max(0.5, jitter(ent.baseRecovery, 0.12)), 2)
      : 0;
    const notionalAffected = roundTo(jitter(ent.baseNotional, 0.1), 0);

    const cdsAuction = ent.hasCdsAuction ? {
      auctionDate: new Date(eventDate.getTime() + (5 + Math.floor(rng() * 15)) * 86400000).toISOString().slice(0, 10),
      finalPrice: ent.auctionFinalPrice !== null ? roundTo(jitter(ent.auctionFinalPrice, 0.05), 3) : null,
      initialMidpoint: ent.auctionFinalPrice !== null ? roundTo(jitter(ent.auctionFinalPrice * (1 + (rng() - 0.4) * 0.15), 0.03), 3) : null,
      participatingDealers: 8 + Math.floor(rng() * 6),
      openInterest: roundTo(jitter(ent.baseNotional * 0.6, 0.2), 0),
    } : null;

    return {
      company: ent.name,
      ticker: ent.ticker,
      eventType: EVENT_TYPES[ent.eventType],
      date: eventDate.toISOString().slice(0, 10),
      recoveryRateEstimate: recoveryRate,
      notionalAffectedMM: notionalAffected,
      sector: ent.sector,
      cdsAuction,
    };
  });
  recentCreditEvents.sort((a, b) => b.date.localeCompare(a.date));

  // ── 2. Upcoming CDS Auction Calendar (5-8) ──
  const auctionCount = 5 + Math.floor(rng() * 4);
  const shuffledAuctions = [...AUCTION_CALENDAR_ENTITIES].sort(() => rng() - 0.5);
  const upcomingAuctions = shuffledAuctions.slice(0, auctionCount).map(ent => {
    const daysAhead = 2 + Math.floor(rng() * 28);
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() + daysAhead);

    const triggerEvent = EVENT_TYPES[Math.floor(rng() * 4)]; // first 4 types most common for auction
    const listStatus: 'Initial List' | 'Final List' = rng() > 0.4 ? 'Final List' : 'Initial List';
    const estimatedNotional = roundTo(800 + rng() * 8000, 0);

    return {
      entity: ent.entity,
      ticker: ent.ticker,
      sector: ent.sector,
      auctionDate: auctionDate.toISOString().slice(0, 10),
      triggerEvent,
      listStatus,
      estimatedNotionalMM: estimatedNotional,
      protocol: rng() > 0.2 ? 'ISDA 2014' : 'ISDA 2003',
    };
  });
  upcomingAuctions.sort((a, b) => a.auctionDate.localeCompare(b.auctionDate));

  // ── 3. Credit Event Watchlist (15 issuers) ──
  const watchlist = WATCHLIST_ISSUERS.map(iss => {
    const cdsSpread = roundTo(jitter(iss.baseCdsSpread, 0.08), 0);
    const pd1y = roundTo(Math.max(0.1, jitter(iss.basePd1y, 0.1)), 1);
    const pd5y = roundTo(Math.max(0.5, jitter(iss.basePd5y, 0.08)), 1);
    const dtd = roundTo(Math.max(0.2, jitter(iss.baseDtd, 0.12)), 2);

    return {
      name: iss.name,
      ticker: iss.ticker,
      sector: iss.sector,
      cdsSpread,
      probabilityOfDefault: { oneYear: pd1y, fiveYear: pd5y },
      distanceToDefault: dtd,
      rating: iss.rating,
      watchReason: iss.reason,
    };
  });
  watchlist.sort((a, b) => b.cdsSpread - a.cdsSpread);

  // ── 4. Historical Default Rates by Sector ──
  const historicalDefaultRates = DEFAULT_RATE_CONFIGS.map(cfg => ({
    sector: cfg.sector,
    investmentGrade: {
      oneYearRate: roundTo(Math.max(0, jitter(cfg.igRate1y, 0.15)), 2),
      fiveYearCumulative: roundTo(Math.max(0, jitter(cfg.igRate5y, 0.12)), 2),
    },
    highYield: {
      oneYearRate: roundTo(Math.max(0.1, jitter(cfg.hyRate1y, 0.1)), 2),
      fiveYearCumulative: roundTo(Math.max(1, jitter(cfg.hyRate5y, 0.1)), 2),
    },
  }));

  // ── 5. Recovery Rate Statistics ──
  const recoveryBySeniority = RECOVERY_SENIORITY_CONFIGS.map(cfg => ({
    seniority: cfg.seniority,
    meanRecovery: roundTo(jitter(cfg.baseRate, 0.06), 1),
    medianRecovery: roundTo(jitter(cfg.baseRate * 0.95, 0.06), 1),
    stdDev: roundTo(jitter(cfg.stdDev, 0.08), 1),
    sampleSize: cfg.sampleSize + Math.floor((rng() - 0.5) * 40),
    min: roundTo(Math.max(0.5, cfg.baseRate - cfg.stdDev * 1.8 + rng() * 5), 1),
    max: roundTo(Math.min(98, cfg.baseRate + cfg.stdDev * 1.5 + rng() * 8), 1),
  }));

  const recoveryBySector = RECOVERY_SECTOR_CONFIGS.map(cfg => ({
    sector: cfg.sector,
    meanRecovery: roundTo(jitter(cfg.baseRate, 0.06), 1),
    medianRecovery: roundTo(jitter(cfg.baseRate * 0.93, 0.07), 1),
    sampleSize: cfg.sampleSize + Math.floor((rng() - 0.5) * 30),
  }));

  const recoveryRateStatistics = { bySeniority: recoveryBySeniority, bySector: recoveryBySector };

  // ── 6. Distressed Ratio ──
  const baseDistressedRatio = 4.8;
  const baseDistressedCount = 85;
  const currentRatio = roundTo(jitter(baseDistressedRatio, 0.1), 1);
  const currentCount = Math.round(jitter(baseDistressedCount, 0.08));

  const monthlyTrend: { month: string; ratio: number; count: number }[] = [];
  const today = new Date();
  for (let m = 11; m >= 0; m--) {
    const trendDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const monthStr = trendDate.toISOString().slice(0, 7);
    const monthOffset = (rng() - 0.5) * 1.5;
    const trendRatio = roundTo(Math.max(1.5, baseDistressedRatio - (11 - m) * 0.08 + monthOffset), 1);
    const trendCount = Math.round(Math.max(20, baseDistressedCount - (11 - m) * 2 + (rng() - 0.5) * 15));
    monthlyTrend.push({ month: monthStr, ratio: trendRatio, count: trendCount });
  }

  const distressedRatio = {
    currentRatio,
    currentCount,
    spreadThreshold: 1000,
    unit: 'bp',
    twelveMonthTrend: monthlyTrend,
  };

  return {
    recentCreditEvents,
    upcomingAuctions,
    watchlist,
    historicalDefaultRates,
    recoveryRateStatistics,
    distressedRatio,
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
    console.error('[CreditEvent] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit event data' });
  }
});

export default router;
