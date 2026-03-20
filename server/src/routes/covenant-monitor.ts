import { Router } from 'express';

const router = Router();

// ── Types ──

type CovenantStatus = 'Compliant' | 'Warning' | 'Breach' | 'Waived';
type IssuerCategory = 'IG' | 'HY';

interface Covenant {
  name: string;
  threshold: number;
  currentValue: number;
  headroom: number;
  status: CovenantStatus;
  lastTestDate: string;
}

interface DebtMetrics {
  totalDebt: number;
  ebitda: number;
  leverage: number;
  interestCoverage: number;
  freeCashFlow: number;
  netDebt: number;
}

interface MaturityProfile {
  year: number;
  amount: number;
}

interface CovenantEvent {
  date: string;
  issuer: string;
  ticker: string;
  type: 'BREACH' | 'WAIVER' | 'AMENDMENT' | 'TEST' | 'DOWNGRADE' | 'UPGRADE' | 'MATURITY' | 'REFINANCE';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface Issuer {
  name: string;
  ticker: string;
  rating: string;
  sector: string;
  category: IssuerCategory;
  covenants: Covenant[];
  overallStatus: CovenantStatus;
  debtMetrics: DebtMetrics;
  maturityProfile: MaturityProfile[];
  recentEvents: CovenantEvent[];
}

interface CovenantSummary {
  totalIssuers: number;
  compliant: number;
  warning: number;
  breach: number;
  avgLeverage: number;
  avgCoverage: number;
}

interface CovenantMonitorResponse {
  issuers: Issuer[];
  summary: CovenantSummary;
  generatedAt: string;
}

// ── Seeded PRNG ──

function createPRNG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Issuer Seeds ──

interface IssuerSeed {
  name: string;
  ticker: string;
  rating: string;
  sector: string;
  category: IssuerCategory;
  baseDebt: number;
  baseEbitda: number;
  baseLeverage: number;
  baseCoverage: number;
  baseFcf: number;
}

const ISSUER_SEEDS: IssuerSeed[] = [
  // Investment Grade
  { name: 'Apple Inc.', ticker: 'AAPL', rating: 'AA+', sector: 'Technology', category: 'IG', baseDebt: 111000, baseEbitda: 130000, baseLeverage: 0.85, baseCoverage: 28.5, baseFcf: 110000 },
  { name: 'Microsoft Corp.', ticker: 'MSFT', rating: 'AAA', sector: 'Technology', category: 'IG', baseDebt: 60000, baseEbitda: 105000, baseLeverage: 0.57, baseCoverage: 35.0, baseFcf: 63000 },
  { name: 'Johnson & Johnson', ticker: 'JNJ', rating: 'AAA', sector: 'Healthcare', category: 'IG', baseDebt: 32000, baseEbitda: 28000, baseLeverage: 1.14, baseCoverage: 18.0, baseFcf: 17000 },
  { name: 'Procter & Gamble', ticker: 'PG', rating: 'AA-', sector: 'Consumer Staples', category: 'IG', baseDebt: 33000, baseEbitda: 22000, baseLeverage: 1.50, baseCoverage: 15.5, baseFcf: 14000 },
  { name: 'Coca-Cola Co.', ticker: 'KO', rating: 'A+', sector: 'Consumer Staples', category: 'IG', baseDebt: 40000, baseEbitda: 15000, baseLeverage: 2.67, baseCoverage: 10.2, baseFcf: 9500 },
  { name: 'JPMorgan Chase', ticker: 'JPM', rating: 'A+', sector: 'Financials', category: 'IG', baseDebt: 380000, baseEbitda: 65000, baseLeverage: 5.85, baseCoverage: 4.5, baseFcf: 32000 },

  // High Yield
  { name: 'Ford Motor Co.', ticker: 'F', rating: 'BB+', sector: 'Automotive', category: 'HY', baseDebt: 140000, baseEbitda: 18000, baseLeverage: 7.78, baseCoverage: 2.8, baseFcf: 4500 },
  { name: 'T-Mobile US', ticker: 'TMUS', rating: 'BB+', sector: 'Telecom', category: 'HY', baseDebt: 72000, baseEbitda: 28000, baseLeverage: 2.57, baseCoverage: 6.5, baseFcf: 13500 },
  { name: 'Netflix Inc.', ticker: 'NFLX', rating: 'BB+', sector: 'Media', category: 'HY', baseDebt: 14000, baseEbitda: 8000, baseLeverage: 1.75, baseCoverage: 8.2, baseFcf: 6500 },
  { name: 'Carnival Corp.', ticker: 'CCL', rating: 'B+', sector: 'Leisure', category: 'HY', baseDebt: 31000, baseEbitda: 5800, baseLeverage: 5.34, baseCoverage: 2.2, baseFcf: 1200 },
  { name: 'AMC Entertainment', ticker: 'AMC', rating: 'CCC+', sector: 'Media', category: 'HY', baseDebt: 4800, baseEbitda: 450, baseLeverage: 10.67, baseCoverage: 0.8, baseFcf: -200 },
  { name: 'Carvana Co.', ticker: 'CVNA', rating: 'CCC', sector: 'Retail', category: 'HY', baseDebt: 6200, baseEbitda: 380, baseLeverage: 16.32, baseCoverage: 0.5, baseFcf: -350 },
  { name: 'WeWork Inc.', ticker: 'WE', rating: 'CCC-', sector: 'Real Estate', category: 'HY', baseDebt: 18000, baseEbitda: -200, baseLeverage: -90.0, baseCoverage: -0.3, baseFcf: -1800 },
  { name: 'Spirit Airlines', ticker: 'SAVE', rating: 'CCC', sector: 'Airlines', category: 'HY', baseDebt: 3400, baseEbitda: 150, baseLeverage: 22.67, baseCoverage: 0.4, baseFcf: -500 },
  { name: 'Hertz Global', ticker: 'HTZ', rating: 'B', sector: 'Rental', category: 'HY', baseDebt: 18500, baseEbitda: 2200, baseLeverage: 8.41, baseCoverage: 1.5, baseFcf: 300 },
  { name: 'Peloton Interactive', ticker: 'PTON', rating: 'CCC+', sector: 'Consumer', category: 'HY', baseDebt: 2500, baseEbitda: 120, baseLeverage: 20.83, baseCoverage: 0.6, baseFcf: -400 },
  { name: 'Bed Bath & Beyond', ticker: 'BBBY', rating: 'D', sector: 'Retail', category: 'HY', baseDebt: 5200, baseEbitda: -80, baseLeverage: -65.0, baseCoverage: -0.2, baseFcf: -900 },
  { name: 'GameStop Corp.', ticker: 'GME', rating: 'B-', sector: 'Retail', category: 'HY', baseDebt: 450, baseEbitda: 180, baseLeverage: 2.50, baseCoverage: 3.5, baseFcf: 50 },
];

// ── Covenant Definitions ──

interface CovenantTemplate {
  name: string;
  threshold: number;
  isMaximum: boolean; // true = must stay below threshold, false = must stay above
}

function getCovenantTemplates(category: IssuerCategory, baseLeverage: number): CovenantTemplate[] {
  if (category === 'IG') {
    return [
      { name: 'Max Leverage Ratio', threshold: Math.max(3.5, baseLeverage * 1.6), isMaximum: true },
      { name: 'Min Interest Coverage', threshold: Math.max(3.0, baseLeverage > 3 ? 2.5 : 4.0), isMaximum: false },
      { name: 'Max Secured Debt/Assets', threshold: 0.40, isMaximum: true },
      { name: 'Min Tangible Net Worth', threshold: 0.30, isMaximum: false },
    ];
  }
  return [
    { name: 'Max Leverage Ratio', threshold: Math.max(5.0, baseLeverage * 1.25), isMaximum: true },
    { name: 'Min Interest Coverage', threshold: Math.max(1.5, baseLeverage > 10 ? 1.0 : 2.0), isMaximum: false },
    { name: 'Max Senior Secured Leverage', threshold: Math.max(4.0, baseLeverage * 0.85), isMaximum: true },
    { name: 'Min Fixed Charge Coverage', threshold: 1.10, isMaximum: false },
    { name: 'Max Capex (% Revenue)', threshold: 0.15, isMaximum: true },
    { name: 'Min Liquidity ($M)', threshold: 500, isMaximum: false },
  ];
}

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ── Event Types ──

const EVENT_TYPES: CovenantEvent['type'][] = ['BREACH', 'WAIVER', 'AMENDMENT', 'TEST', 'DOWNGRADE', 'UPGRADE', 'MATURITY', 'REFINANCE'];

const EVENT_TEMPLATES: Record<CovenantEvent['type'], string[]> = {
  BREACH: [
    '{issuer} breached maximum leverage covenant ({value}x vs {threshold}x limit)',
    '{issuer} failed minimum interest coverage test ({value}x vs {threshold}x required)',
    '{issuer} exceeded secured debt threshold',
  ],
  WAIVER: [
    '{issuer} obtained temporary covenant waiver through Q{q} {year}',
    'Lenders granted {issuer} 90-day covenant relief on leverage test',
    '{issuer} received amendment and waiver from 2/3 of lenders',
  ],
  AMENDMENT: [
    '{issuer} amended credit agreement to raise leverage ceiling to {value}x',
    '{issuer} renegotiated terms; coverage floor lowered to {value}x',
    '{issuer} completed credit facility amendment with improved pricing',
  ],
  TEST: [
    '{issuer} passed quarterly covenant compliance test',
    '{issuer} reported covenant metrics within required thresholds',
    '{issuer} filed compliance certificate confirming adherence',
  ],
  DOWNGRADE: [
    '{issuer} downgraded to {rating} by S&P; outlook negative',
    "Moody's lowered {issuer} rating to {rating}; covenant pressure cited",
    'Fitch downgraded {issuer} citing deteriorating coverage ratios',
  ],
  UPGRADE: [
    '{issuer} upgraded to {rating}; improved deleveraging trajectory',
    "Moody's raised {issuer} outlook to positive on improved cash flows",
    '{issuer} rating affirmed with positive outlook by S&P',
  ],
  MATURITY: [
    '{issuer} faces ${amount}M maturity wall in {year}',
    '{issuer} term loan B due {year}; refinancing discussions underway',
    '{issuer} revolver expiration approaching; seeking extension',
  ],
  REFINANCE: [
    '{issuer} completed ${amount}M refinancing at {rate}%',
    '{issuer} extended maturity profile through {year} issuance',
    '{issuer} priced new senior secured notes at {rate}%',
  ],
};

function generateEvent(rand: () => number, seed: IssuerSeed, daysAgo: number): CovenantEvent {
  const typeIdx = Math.floor(rand() * EVENT_TYPES.length);
  let type = EVENT_TYPES[typeIdx];

  // Bias certain issuers toward certain event types
  if (seed.baseCoverage < 1.0 && rand() < 0.5) type = rand() < 0.5 ? 'BREACH' : 'WAIVER';
  if (seed.baseCoverage > 10 && type === 'BREACH') type = 'TEST';
  if (seed.rating === 'D') type = rand() < 0.5 ? 'BREACH' : 'DOWNGRADE';

  const templates = EVENT_TEMPLATES[type];
  let desc = templates[Math.floor(rand() * templates.length)];

  desc = desc.replace('{issuer}', seed.name);
  desc = desc.replace('{ticker}', seed.ticker);
  desc = desc.replace('{rating}', seed.rating);
  desc = desc.replace('{value}', roundTo(seed.baseLeverage * (0.9 + rand() * 0.3), 1).toString());
  desc = desc.replace('{threshold}', roundTo(seed.baseLeverage * 1.3, 1).toString());
  desc = desc.replace('{q}', (Math.floor(rand() * 4) + 1).toString());
  desc = desc.replace('{year}', (2025 + Math.floor(rand() * 3)).toString());
  desc = desc.replace('{amount}', Math.floor(seed.baseDebt * (0.05 + rand() * 0.15)).toString());
  desc = desc.replace('{rate}', roundTo(4.5 + rand() * 5, 2).toString());

  const severity: CovenantEvent['severity'] =
    type === 'BREACH' || type === 'DOWNGRADE' ? 'high' :
    type === 'WAIVER' || type === 'AMENDMENT' || type === 'MATURITY' ? 'medium' : 'low';

  return {
    date: formatDateOffset(daysAgo),
    issuer: seed.name,
    ticker: seed.ticker,
    type,
    description: desc,
    severity,
  };
}

// ── Build Issuer ──

function buildIssuer(seed: IssuerSeed, rand: () => number): Issuer {
  // Perturb base metrics slightly
  const debtMult = 0.92 + rand() * 0.16;
  const ebitdaMult = 0.90 + rand() * 0.20;
  const totalDebt = roundTo(seed.baseDebt * debtMult, 0);
  const ebitda = roundTo(seed.baseEbitda * ebitdaMult, 0);
  const leverage = ebitda > 0 ? roundTo(totalDebt / ebitda, 2) : roundTo(seed.baseLeverage * (0.9 + rand() * 0.2), 2);
  const coverageMult = 0.85 + rand() * 0.30;
  const interestCoverage = roundTo(seed.baseCoverage * coverageMult, 1);
  const fcfMult = 0.80 + rand() * 0.40;
  const freeCashFlow = roundTo(seed.baseFcf * fcfMult, 0);
  const cashRatio = 0.05 + rand() * 0.15;
  const netDebt = roundTo(totalDebt * (1 - cashRatio), 0);

  const debtMetrics: DebtMetrics = {
    totalDebt,
    ebitda,
    leverage,
    interestCoverage,
    freeCashFlow,
    netDebt,
  };

  // Generate covenants
  const templates = getCovenantTemplates(seed.category, Math.abs(seed.baseLeverage));
  const covenants: Covenant[] = templates.map((tpl) => {
    let currentValue: number;
    let headroom: number;
    let status: CovenantStatus;

    if (tpl.name.includes('Leverage') || tpl.name.includes('Secured')) {
      // Leverage-type: current value should be around actual leverage
      if (tpl.name === 'Max Leverage Ratio') {
        currentValue = Math.abs(leverage);
      } else if (tpl.name === 'Max Senior Secured Leverage') {
        currentValue = roundTo(Math.abs(leverage) * (0.55 + rand() * 0.25), 2);
      } else {
        currentValue = roundTo(rand() * 0.35 + 0.10, 2);
      }
      headroom = tpl.threshold > 0 ? roundTo(((tpl.threshold - currentValue) / tpl.threshold) * 100, 1) : 0;
    } else if (tpl.name.includes('Coverage') || tpl.name.includes('Fixed Charge')) {
      currentValue = tpl.name.includes('Interest') ? interestCoverage : roundTo(interestCoverage * (0.7 + rand() * 0.4), 1);
      headroom = tpl.threshold > 0 ? roundTo(((currentValue - tpl.threshold) / tpl.threshold) * 100, 1) : 0;
    } else if (tpl.name.includes('Capex')) {
      currentValue = roundTo(0.04 + rand() * 0.12, 2);
      headroom = tpl.threshold > 0 ? roundTo(((tpl.threshold - currentValue) / tpl.threshold) * 100, 1) : 0;
    } else if (tpl.name.includes('Liquidity')) {
      currentValue = roundTo(200 + rand() * 1200, 0);
      headroom = tpl.threshold > 0 ? roundTo(((currentValue - tpl.threshold) / tpl.threshold) * 100, 1) : 0;
    } else if (tpl.name.includes('Net Worth')) {
      currentValue = roundTo(0.20 + rand() * 0.30, 2);
      headroom = tpl.threshold > 0 ? roundTo(((currentValue - tpl.threshold) / tpl.threshold) * 100, 1) : 0;
    } else {
      currentValue = roundTo(tpl.threshold * (0.5 + rand() * 0.8), 2);
      headroom = 10;
    }

    // Determine status based on headroom and issuer distress level
    if (seed.baseCoverage < 0 || seed.rating === 'D') {
      // Severely distressed
      if (rand() < 0.6) {
        status = 'Breach';
        headroom = roundTo(-5 - rand() * 30, 1);
      } else if (rand() < 0.5) {
        status = 'Waived';
        headroom = roundTo(-2 - rand() * 15, 1);
      } else {
        status = 'Warning';
        headroom = roundTo(1 + rand() * 5, 1);
      }
    } else if (seed.baseCoverage < 1.5) {
      // Distressed
      if (rand() < 0.35) {
        status = 'Breach';
        headroom = roundTo(-3 - rand() * 20, 1);
      } else if (rand() < 0.35) {
        status = 'Warning';
        headroom = roundTo(2 + rand() * 8, 1);
      } else if (rand() < 0.2) {
        status = 'Waived';
        headroom = roundTo(-1 - rand() * 10, 1);
      } else {
        status = 'Compliant';
        headroom = roundTo(10 + rand() * 20, 1);
      }
    } else if (seed.baseCoverage < 5) {
      // Moderate risk
      if (rand() < 0.1) {
        status = 'Warning';
        headroom = roundTo(3 + rand() * 7, 1);
      } else {
        status = 'Compliant';
        headroom = roundTo(15 + rand() * 35, 1);
      }
    } else {
      // Safe
      status = 'Compliant';
      headroom = roundTo(30 + rand() * 50, 1);
    }

    const testDaysAgo = Math.floor(rand() * 90);

    return {
      name: tpl.name,
      threshold: roundTo(tpl.threshold, 2),
      currentValue: roundTo(currentValue, 2),
      headroom,
      status,
      lastTestDate: formatDateOffset(testDaysAgo),
    };
  });

  // Overall status: worst covenant status
  const statusPriority: Record<CovenantStatus, number> = { Breach: 3, Warning: 2, Waived: 1, Compliant: 0 };
  let worstStatus: CovenantStatus = 'Compliant';
  for (const c of covenants) {
    if (statusPriority[c.status] > statusPriority[worstStatus]) {
      worstStatus = c.status;
    }
  }

  // Maturity profile (5 years)
  const currentYear = new Date().getFullYear();
  const maturityProfile: MaturityProfile[] = [];
  let remainingDebt = totalDebt;
  for (let i = 0; i < 5; i++) {
    const yearPct = seed.category === 'HY'
      ? (i === 0 ? 0.05 + rand() * 0.10 : 0.08 + rand() * 0.20)
      : (i === 0 ? 0.03 + rand() * 0.07 : 0.05 + rand() * 0.15);
    const amount = roundTo(totalDebt * yearPct, 0);
    remainingDebt -= amount;
    maturityProfile.push({ year: currentYear + 1 + i, amount });
  }

  // Recent events (2-5 per issuer)
  const eventCount = 2 + Math.floor(rand() * 4);
  const recentEvents: CovenantEvent[] = [];
  for (let i = 0; i < eventCount; i++) {
    const daysAgo = Math.floor(rand() * 180);
    recentEvents.push(generateEvent(rand, seed, daysAgo));
  }
  recentEvents.sort((a, b) => b.date.localeCompare(a.date));

  return {
    name: seed.name,
    ticker: seed.ticker,
    rating: seed.rating,
    sector: seed.sector,
    category: seed.category,
    covenants,
    overallStatus: worstStatus,
    debtMetrics,
    maturityProfile,
    recentEvents,
  };
}

// ── Build Response ──

function buildResponse(): CovenantMonitorResponse {
  // Use date-based seed for daily deterministic data
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rand = createPRNG(daySeed);

  const issuers = ISSUER_SEEDS.map((seed) => buildIssuer(seed, rand));

  // Summary
  let compliant = 0;
  let warning = 0;
  let breach = 0;
  let totalLeverage = 0;
  let totalCoverage = 0;
  let leverageCount = 0;
  let coverageCount = 0;

  for (const issuer of issuers) {
    switch (issuer.overallStatus) {
      case 'Compliant': compliant++; break;
      case 'Warning': warning++; break;
      case 'Breach': breach++; break;
      // Waived counts toward warning in summary
      case 'Waived': warning++; break;
    }
    if (issuer.debtMetrics.leverage > 0) {
      totalLeverage += issuer.debtMetrics.leverage;
      leverageCount++;
    }
    if (issuer.debtMetrics.interestCoverage > 0) {
      totalCoverage += issuer.debtMetrics.interestCoverage;
      coverageCount++;
    }
  }

  const summary: CovenantSummary = {
    totalIssuers: issuers.length,
    compliant,
    warning,
    breach,
    avgLeverage: leverageCount > 0 ? roundTo(totalLeverage / leverageCount, 2) : 0,
    avgCoverage: coverageCount > 0 ? roundTo(totalCoverage / coverageCount, 1) : 0,
  };

  return {
    issuers,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache ──

let cache: { data: CovenantMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 12 * 60 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = buildResponse();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CovenantMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate covenant monitor data' });
  }
});

export default router;
