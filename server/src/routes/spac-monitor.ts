import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface ActiveSPAC {
  ticker: string;
  name: string;
  trustValue: number;
  sharePrice: number;
  navPremiumDiscount: number;
  deadlineDate: string;
  sponsor: string;
  focusSector: string;
}

interface RecentIPO {
  ticker: string;
  size: number;
  trustValuePerShare: number;
  underwriter: string;
}

interface PendingDeal {
  spacTicker: string;
  targetCompany: string;
  dealValue: number;
  impliedEvRevenue: number;
  expectedCloseDate: string;
  redemptionDeadline: string;
}

interface CompletedDeal {
  formerSpac: string;
  target: string;
  closeDate: string;
  performanceSinceClose: number;
}

interface Liquidation {
  ticker: string;
  trustReturned: number;
  reason: string;
}

interface SponsorMetric {
  sponsor: string;
  spacCount: number;
  avgReturn: number;
  completionRate: number;
}

interface ArbitrageOpportunity {
  ticker: string;
  discountToTrust: number;
  annualizedReturn: number;
  yieldToMaturity: number;
}

interface MarketStats {
  totalActiveSPACs: number;
  trustCapitalSeekingDeals: number;
  avgTimeToDeal: number;
  completionRate: number;
  ytdIPOs: number;
  ytdDeSPACs: number;
}

interface SPACMonitorResponse {
  activeSPACs: ActiveSPAC[];
  recentIPOs: RecentIPO[];
  pendingDeals: PendingDeal[];
  completedDeals: CompletedDeal[];
  liquidations: Liquidation[];
  sponsorMetrics: SponsorMetric[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  marketStats: MarketStats;
  timestamp: string;
}

// ── Cache ──

let cache: { data: SPACMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Active SPAC configuration ──

interface ActiveSPACConfig {
  ticker: string;
  name: string;
  baseTrustValue: number;
  baseSharePrice: number;
  deadlineDate: string;
  sponsor: string;
  focusSector: string;
}

const ACTIVE_SPAC_CONFIGS: ActiveSPACConfig[] = [
  { ticker: 'GSQD', name: 'G Squared Ascend II', baseTrustValue: 345.0, baseSharePrice: 10.18, deadlineDate: '2026-09-15', sponsor: 'G Squared', focusSector: 'Technology' },
  { ticker: 'IVCP', name: 'Swvl Holdings', baseTrustValue: 287.5, baseSharePrice: 10.05, deadlineDate: '2026-07-20', sponsor: 'Churchill Capital', focusSector: 'Industrials' },
  { ticker: 'FPAC', name: 'Far Peak Acquisition', baseTrustValue: 230.0, baseSharePrice: 10.12, deadlineDate: '2026-11-30', sponsor: 'Far Peak Financial', focusSector: 'Financial Services' },
  { ticker: 'AEAC', name: 'Athena Technology Acquisition II', baseTrustValue: 200.0, baseSharePrice: 10.22, deadlineDate: '2026-06-10', sponsor: 'Athena Technology', focusSector: 'Technology' },
  { ticker: 'BWAQ', name: 'Blue World Acquisition', baseTrustValue: 175.0, baseSharePrice: 9.95, deadlineDate: '2026-08-25', sponsor: 'Blue World Partners', focusSector: 'Consumer' },
  { ticker: 'CSLM', name: 'Consilium Acquisition I', baseTrustValue: 310.0, baseSharePrice: 10.08, deadlineDate: '2027-01-15', sponsor: 'Consilium Capital', focusSector: 'Healthcare' },
  { ticker: 'DNAA', name: 'Social Capital Hedosophia VI', baseTrustValue: 500.0, baseSharePrice: 10.30, deadlineDate: '2026-12-01', sponsor: 'Social Capital', focusSector: 'Technology' },
  { ticker: 'ETAC', name: 'E.Merge Technology Acquisition', baseTrustValue: 250.0, baseSharePrice: 10.15, deadlineDate: '2026-10-18', sponsor: 'E.Merge Capital', focusSector: 'Technology' },
  { ticker: 'HZON', name: 'Horizon Acquisition II', baseTrustValue: 400.0, baseSharePrice: 10.10, deadlineDate: '2026-08-01', sponsor: 'Horizon Partners', focusSector: 'Media & Entertainment' },
  { ticker: 'JWSM', name: 'Jaws Mustang Acquisition', baseTrustValue: 600.0, baseSharePrice: 10.25, deadlineDate: '2027-02-28', sponsor: 'Jaws Capital', focusSector: 'Technology' },
  { ticker: 'KVSA', name: 'Khosla Ventures Acquisition II', baseTrustValue: 350.0, baseSharePrice: 10.20, deadlineDate: '2026-09-30', sponsor: 'Khosla Ventures', focusSector: 'CleanTech' },
  { ticker: 'LNFA', name: 'L&F Acquisition Corp', baseTrustValue: 225.0, baseSharePrice: 9.98, deadlineDate: '2026-07-01', sponsor: 'L&F Capital', focusSector: 'Financial Services' },
];

// ── Recent IPO configuration ──

interface RecentIPOConfig {
  ticker: string;
  baseSize: number;
  baseTrustValuePerShare: number;
  underwriter: string;
}

const RECENT_IPO_CONFIGS: RecentIPOConfig[] = [
  { ticker: 'NXTA', baseSize: 250.0, baseTrustValuePerShare: 10.00, underwriter: 'Goldman Sachs' },
  { ticker: 'PRMR', baseSize: 200.0, baseTrustValuePerShare: 10.00, underwriter: 'Citigroup' },
  { ticker: 'QFIN', baseSize: 300.0, baseTrustValuePerShare: 10.00, underwriter: 'J.P. Morgan' },
  { ticker: 'RVLT', baseSize: 175.0, baseTrustValuePerShare: 10.00, underwriter: 'Credit Suisse' },
  { ticker: 'SPKL', baseSize: 350.0, baseTrustValuePerShare: 10.00, underwriter: 'Barclays' },
  { ticker: 'TRVN', baseSize: 150.0, baseTrustValuePerShare: 10.00, underwriter: 'Deutsche Bank' },
];

// ── Pending deal configuration ──

interface PendingDealConfig {
  spacTicker: string;
  targetCompany: string;
  baseDealValue: number;
  baseImpliedEvRevenue: number;
  expectedCloseDate: string;
  redemptionDeadline: string;
}

const PENDING_DEAL_CONFIGS: PendingDealConfig[] = [
  { spacTicker: 'GSQD', targetCompany: 'NovaTech Systems', baseDealValue: 2800.0, baseImpliedEvRevenue: 12.5, expectedCloseDate: '2026-06-30', redemptionDeadline: '2026-06-15' },
  { spacTicker: 'HZON', targetCompany: 'StreamVault Media', baseDealValue: 3200.0, baseImpliedEvRevenue: 8.7, expectedCloseDate: '2026-07-15', redemptionDeadline: '2026-07-01' },
  { spacTicker: 'DNAA', targetCompany: 'Cyberion Security', baseDealValue: 4500.0, baseImpliedEvRevenue: 15.2, expectedCloseDate: '2026-08-20', redemptionDeadline: '2026-08-05' },
  { spacTicker: 'KVSA', targetCompany: 'GreenFlux Energy', baseDealValue: 1800.0, baseImpliedEvRevenue: 6.3, expectedCloseDate: '2026-09-10', redemptionDeadline: '2026-08-25' },
  { spacTicker: 'ETAC', targetCompany: 'QuantumLeap AI', baseDealValue: 2100.0, baseImpliedEvRevenue: 18.4, expectedCloseDate: '2026-07-28', redemptionDeadline: '2026-07-14' },
  { spacTicker: 'CSLM', targetCompany: 'BioGenesis Therapeutics', baseDealValue: 1500.0, baseImpliedEvRevenue: 22.0, expectedCloseDate: '2026-10-05', redemptionDeadline: '2026-09-20' },
];

// ── Completed deal configuration ──

interface CompletedDealConfig {
  formerSpac: string;
  target: string;
  closeDate: string;
  basePerformance: number;
  performanceVolatility: number;
}

const COMPLETED_DEAL_CONFIGS: CompletedDealConfig[] = [
  { formerSpac: 'AJAX-I', target: 'Cazoo Group', closeDate: '2025-11-15', basePerformance: -32.5, performanceVolatility: 10 },
  { formerSpac: 'CCIV', target: 'Lucid Motors', closeDate: '2025-10-28', basePerformance: -18.7, performanceVolatility: 15 },
  { formerSpac: 'DKNG', target: 'DraftKings', closeDate: '2025-12-05', basePerformance: 45.2, performanceVolatility: 12 },
  { formerSpac: 'IPOF', target: 'Waystar Health', closeDate: '2026-01-10', basePerformance: 8.3, performanceVolatility: 8 },
  { formerSpac: 'MPLN', target: 'MultiPlan Corp', closeDate: '2025-09-20', basePerformance: -55.1, performanceVolatility: 10 },
  { formerSpac: 'PSTH', target: 'Paysafe Limited', closeDate: '2026-02-14', basePerformance: -12.4, performanceVolatility: 9 },
  { formerSpac: 'RBAC', target: 'SeatGeek Inc', closeDate: '2025-11-30', basePerformance: 22.8, performanceVolatility: 11 },
  { formerSpac: 'STPK', target: 'Stem Inc', closeDate: '2026-01-25', basePerformance: -28.9, performanceVolatility: 14 },
];

// ── Liquidation configuration ──

interface LiquidationConfig {
  ticker: string;
  baseTrustReturned: number;
  reason: string;
}

const LIQUIDATION_CONFIGS: LiquidationConfig[] = [
  { ticker: 'BREZ', baseTrustReturned: 115.0, reason: 'Failed to find target within deadline' },
  { ticker: 'CFVI', baseTrustReturned: 230.0, reason: 'Shareholder vote rejected proposed merger' },
  { ticker: 'DWAC', baseTrustReturned: 287.5, reason: 'Regulatory obstacles prevented closing' },
  { ticker: 'GNPX', baseTrustReturned: 92.0, reason: 'Extended twice, no viable target identified' },
  { ticker: 'HUGS', baseTrustReturned: 175.0, reason: 'Target withdrew from negotiations' },
];

// ── Sponsor metrics configuration ──

interface SponsorMetricConfig {
  sponsor: string;
  baseSpacCount: number;
  baseAvgReturn: number;
  baseCompletionRate: number;
}

const SPONSOR_METRIC_CONFIGS: SponsorMetricConfig[] = [
  { sponsor: 'Social Capital (Chamath)', baseSpacCount: 8, baseAvgReturn: -5.2, baseCompletionRate: 75.0 },
  { sponsor: 'Jaws Capital (Thiel)', baseSpacCount: 6, baseAvgReturn: 12.8, baseCompletionRate: 83.3 },
  { sponsor: 'Churchill Capital', baseSpacCount: 7, baseAvgReturn: -8.4, baseCompletionRate: 71.4 },
  { sponsor: 'Gores Holdings', baseSpacCount: 9, baseAvgReturn: 3.1, baseCompletionRate: 88.9 },
  { sponsor: 'Ajax Financial', baseSpacCount: 4, baseAvgReturn: -15.6, baseCompletionRate: 50.0 },
  { sponsor: 'Replay Acquisition', baseSpacCount: 3, baseAvgReturn: 18.5, baseCompletionRate: 100.0 },
  { sponsor: 'Dragoneer Growth', baseSpacCount: 5, baseAvgReturn: 7.3, baseCompletionRate: 80.0 },
  { sponsor: 'Khosla Ventures', baseSpacCount: 4, baseAvgReturn: 22.1, baseCompletionRate: 75.0 },
  { sponsor: 'Foley Trasimene', baseSpacCount: 6, baseAvgReturn: -2.9, baseCompletionRate: 66.7 },
  { sponsor: 'G Squared', baseSpacCount: 3, baseAvgReturn: 9.7, baseCompletionRate: 66.7 },
];

// ── Arbitrage opportunity configuration ──

interface ArbitrageConfig {
  ticker: string;
  baseDiscount: number;
  baseAnnualizedReturn: number;
  baseYieldToMaturity: number;
}

const ARBITRAGE_CONFIGS: ArbitrageConfig[] = [
  { ticker: 'BWAQ', baseDiscount: -0.52, baseAnnualizedReturn: 4.8, baseYieldToMaturity: 2.1 },
  { ticker: 'LNFA', baseDiscount: -0.21, baseAnnualizedReturn: 3.2, baseYieldToMaturity: 0.9 },
  { ticker: 'IVCP', baseDiscount: -0.05, baseAnnualizedReturn: 1.8, baseYieldToMaturity: 0.4 },
  { ticker: 'FPAC', baseDiscount: 0.12, baseAnnualizedReturn: -0.5, baseYieldToMaturity: -0.2 },
  { ticker: 'AEAC', baseDiscount: 0.22, baseAnnualizedReturn: -1.2, baseYieldToMaturity: -0.3 },
  { ticker: 'ETAC', baseDiscount: 0.15, baseAnnualizedReturn: -0.8, baseYieldToMaturity: -0.1 },
  { ticker: 'GSQD', baseDiscount: 0.18, baseAnnualizedReturn: -0.9, baseYieldToMaturity: -0.2 },
  { ticker: 'HZON', baseDiscount: 0.10, baseAnnualizedReturn: -0.4, baseYieldToMaturity: -0.1 },
];

// ── Data generation ──

function generateActiveSPACs(rng: () => number): ActiveSPAC[] {
  return ACTIVE_SPAC_CONFIGS.map((cfg) => {
    const trustJitter = (rng() - 0.5) * cfg.baseTrustValue * 0.05;
    const trustValue = Math.round((cfg.baseTrustValue + trustJitter) * 10) / 10;

    const priceJitter = (rng() - 0.5) * 0.40;
    const sharePrice = Math.round((cfg.baseSharePrice + priceJitter) * 100) / 100;

    const nav = 10.00 + (rng() - 0.5) * 0.10; // NAV around $10
    const navPremiumDiscount = Math.round(((sharePrice - nav) / nav) * 10000) / 100;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      trustValue,
      sharePrice,
      navPremiumDiscount,
      deadlineDate: cfg.deadlineDate,
      sponsor: cfg.sponsor,
      focusSector: cfg.focusSector,
    };
  });
}

function generateRecentIPOs(rng: () => number): RecentIPO[] {
  return RECENT_IPO_CONFIGS.map((cfg) => {
    const sizeJitter = (rng() - 0.5) * cfg.baseSize * 0.10;
    const size = Math.round((cfg.baseSize + sizeJitter) * 10) / 10;

    const trustJitter = (rng() - 0.5) * 0.06;
    const trustValuePerShare = Math.round((cfg.baseTrustValuePerShare + trustJitter) * 100) / 100;

    return {
      ticker: cfg.ticker,
      size,
      trustValuePerShare,
      underwriter: cfg.underwriter,
    };
  });
}

function generatePendingDeals(rng: () => number): PendingDeal[] {
  return PENDING_DEAL_CONFIGS.map((cfg) => {
    const dealJitter = (rng() - 0.5) * cfg.baseDealValue * 0.08;
    const dealValue = Math.round((cfg.baseDealValue + dealJitter) * 10) / 10;

    const evJitter = (rng() - 0.5) * cfg.baseImpliedEvRevenue * 0.15;
    const impliedEvRevenue = Math.round((cfg.baseImpliedEvRevenue + evJitter) * 10) / 10;

    return {
      spacTicker: cfg.spacTicker,
      targetCompany: cfg.targetCompany,
      dealValue,
      impliedEvRevenue,
      expectedCloseDate: cfg.expectedCloseDate,
      redemptionDeadline: cfg.redemptionDeadline,
    };
  });
}

function generateCompletedDeals(rng: () => number): CompletedDeal[] {
  return COMPLETED_DEAL_CONFIGS.map((cfg) => {
    const perfJitter = (rng() - 0.5) * cfg.performanceVolatility * 2;
    const performanceSinceClose = Math.round((cfg.basePerformance + perfJitter) * 10) / 10;

    return {
      formerSpac: cfg.formerSpac,
      target: cfg.target,
      closeDate: cfg.closeDate,
      performanceSinceClose,
    };
  });
}

function generateLiquidations(rng: () => number): Liquidation[] {
  return LIQUIDATION_CONFIGS.map((cfg) => {
    const trustJitter = (rng() - 0.5) * cfg.baseTrustReturned * 0.04;
    const trustReturned = Math.round((cfg.baseTrustReturned + trustJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      trustReturned,
      reason: cfg.reason,
    };
  });
}

function generateSponsorMetrics(rng: () => number): SponsorMetric[] {
  return SPONSOR_METRIC_CONFIGS.map((cfg) => {
    const countJitter = Math.floor((rng() - 0.5) * 2);
    const spacCount = Math.max(1, cfg.baseSpacCount + countJitter);

    const returnJitter = (rng() - 0.5) * 6;
    const avgReturn = Math.round((cfg.baseAvgReturn + returnJitter) * 10) / 10;

    const rateJitter = (rng() - 0.5) * 10;
    const completionRate = Math.round(Math.max(0, Math.min(100, cfg.baseCompletionRate + rateJitter)) * 10) / 10;

    return {
      sponsor: cfg.sponsor,
      spacCount,
      avgReturn,
      completionRate,
    };
  });
}

function generateArbitrageOpportunities(rng: () => number): ArbitrageOpportunity[] {
  return ARBITRAGE_CONFIGS.map((cfg) => {
    const discountJitter = (rng() - 0.5) * 0.20;
    const discountToTrust = Math.round((cfg.baseDiscount + discountJitter) * 100) / 100;

    const annReturnJitter = (rng() - 0.5) * 1.5;
    const annualizedReturn = Math.round((cfg.baseAnnualizedReturn + annReturnJitter) * 10) / 10;

    const ytmJitter = (rng() - 0.5) * 0.8;
    const yieldToMaturity = Math.round((cfg.baseYieldToMaturity + ytmJitter) * 10) / 10;

    return {
      ticker: cfg.ticker,
      discountToTrust,
      annualizedReturn,
      yieldToMaturity,
    };
  });
}

function generateMarketStats(
  rng: () => number,
  activeSPACs: ActiveSPAC[],
  completedDeals: CompletedDeal[],
  recentIPOs: RecentIPO[],
): MarketStats {
  const totalActiveSPACs = activeSPACs.length + Math.floor(rng() * 280) + 320; // ~320-600 total market

  const totalTrust = activeSPACs.reduce((sum, s) => sum + s.trustValue, 0);
  const trustCapitalSeekingDeals = Math.round((totalTrust * (totalActiveSPACs / activeSPACs.length)) * 10) / 10;

  const avgTimeToDeal = Math.round((14 + rng() * 10) * 10) / 10; // 14-24 months

  const baseCompletionRate = 55 + rng() * 20; // 55-75%
  const completionRate = Math.round(baseCompletionRate * 10) / 10;

  const ytdIPOs = recentIPOs.length + Math.floor(rng() * 40) + 20; // ~20-60
  const ytdDeSPACs = completedDeals.length + Math.floor(rng() * 30) + 15; // ~15-45

  return {
    totalActiveSPACs,
    trustCapitalSeekingDeals,
    avgTimeToDeal,
    completionRate,
    ytdIPOs,
    ytdDeSPACs,
  };
}

function generateSPACMonitorData(): SPACMonitorResponse {
  const rng = seededRandom('spac-monitor');

  const activeSPACs = generateActiveSPACs(rng);
  const recentIPOs = generateRecentIPOs(rng);
  const pendingDeals = generatePendingDeals(rng);
  const completedDeals = generateCompletedDeals(rng);
  const liquidations = generateLiquidations(rng);
  const sponsorMetrics = generateSponsorMetrics(rng);
  const arbitrageOpportunities = generateArbitrageOpportunities(rng);
  const marketStats = generateMarketStats(rng, activeSPACs, completedDeals, recentIPOs);

  return {
    activeSPACs,
    recentIPOs,
    pendingDeals,
    completedDeals,
    liquidations,
    sponsorMetrics,
    arbitrageOpportunities,
    marketStats,
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

    const data = generateSPACMonitorData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SPACMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate SPAC monitor data' });
  }
});

export default router;
