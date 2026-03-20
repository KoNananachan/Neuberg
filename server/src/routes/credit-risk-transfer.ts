import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface CRTDeal {
  issuer: string;
  series: string;
  tranche: string;
  notional: number;           // $M
  spread: number;             // bps over SOFR
  rating: string;
  attachmentPt: number;       // %
  detachmentPt: number;       // %
  expectedLoss: number;       // %
  issuanceDate: string;
}

interface MarketPricing {
  series: string;
  tranche: string;
  currentSpread: number;      // bps
  change1w: number;           // bps
  change1m: number;           // bps
  daysOld: number;
  cumulLoss: number;          // %
  factor: number;             // outstanding/original
}

interface DelinquencyMetric {
  vintage: number;
  seriousDelinq: number;      // %
  earlyDefault: number;       // %
  cumulLoss: number;          // %
  prepayRate: number;         // CPR %
  creditEnhancement: number;  // %
}

interface CRTSummary {
  totalIssuance: number;      // $B, YTD
  avgSpread: number;          // bps
  avgExpectedLoss: number;    // %
  activeSeries: number;
  delinquencyTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  timestamp: string;
}

interface CRTResponse {
  deals: CRTDeal[];
  marketPricing: MarketPricing[];
  delinquencyMetrics: DelinquencyMetric[];
  summary: CRTSummary;
}

// ── Cache ──

let cache: { data: CRTResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Static Configuration ──

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

const GSE_ISSUERS = [
  'Fannie Mae', 'Fannie Mae', 'Fannie Mae',
  'Freddie Mac', 'Freddie Mac', 'Freddie Mac',
] as const;

const BANK_ISSUERS = [
  'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup',
] as const;

interface SeriesTemplate {
  issuerType: 'gse' | 'bank';
  prefix: string;
  programSuffix: string[];
}

const SERIES_TEMPLATES: SeriesTemplate[] = [
  { issuerType: 'gse', prefix: 'CAS', programSuffix: ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'] },
  { issuerType: 'gse', prefix: 'STACR', programSuffix: ['DNA1', 'DNA2', 'DNA3', 'HQA1', 'HQA2', 'HQA3'] },
  { issuerType: 'gse', prefix: 'ACIS', programSuffix: ['1', '2', '3', '4'] },
  { issuerType: 'bank', prefix: 'JPMMT CRT', programSuffix: ['1', '2'] },
  { issuerType: 'bank', prefix: 'BOAMS CRT', programSuffix: ['1', '2'] },
  { issuerType: 'bank', prefix: 'WFMBS CRT', programSuffix: ['1'] },
];

const TRANCHES = ['M1', 'M2', 'B1', 'B2'] as const;
const RATINGS = ['BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'NR'] as const;

// Tranche-specific attachment/detachment points (realistic CAS/STACR capital structure)
const TRANCHE_STRUCTURE: Record<string, { attachBase: number; detachBase: number; spreadBase: number; elBase: number }> = {
  'M1': { attachBase: 1.50, detachBase: 3.00, spreadBase: 165, elBase: 0.35 },
  'M2': { attachBase: 0.75, detachBase: 1.50, spreadBase: 275, elBase: 0.85 },
  'B1': { attachBase: 0.35, detachBase: 0.75, spreadBase: 450, elBase: 1.80 },
  'B2': { attachBase: 0.00, detachBase: 0.35, spreadBase: 750, elBase: 4.20 },
};

// ── Data Generation ──

function generateDeals(rng: () => number): CRTDeal[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const deals: CRTDeal[] = [];

  for (let i = 0; i < 10; i++) {
    const template = SERIES_TEMPLATES[i % SERIES_TEMPLATES.length];
    const suffix = pick(template.programSuffix, rng);

    // Determine year for the series: mostly current year, some prior year
    const yearOffset = rng() < 0.7 ? 0 : 1;
    const seriesYear = currentYear - yearOffset;

    const series = `${template.prefix} ${seriesYear}-${suffix}`;

    let issuer: string;
    if (template.issuerType === 'gse') {
      // CAS = Fannie Mae, STACR = Freddie Mac, ACIS = Freddie Mac (reinsurance)
      if (template.prefix === 'CAS') {
        issuer = 'Fannie Mae';
      } else {
        issuer = 'Freddie Mac';
      }
    } else {
      issuer = pick(BANK_ISSUERS, rng);
    }

    const tranche = TRANCHES[i % TRANCHES.length];
    const structure = TRANCHE_STRUCTURE[tranche];

    // Notional: GSE deals are larger ($200-800M), bank deals smaller ($50-250M)
    const notionalBase = template.issuerType === 'gse' ? rangef(200, 800, rng) : rangef(50, 250, rng);
    const notional = Math.round(notionalBase);

    // Spread over SOFR with jitter
    const spread = Math.round(structure.spreadBase + (rng() - 0.5) * 80);

    // Rating: M1 tends BB+/BB, M2 tends BB/BB-, B1 tends B+/B, B2 tends B-/NR
    let ratingPool: string[];
    switch (tranche) {
      case 'M1': ratingPool = ['BB+', 'BB', 'BB']; break;
      case 'M2': ratingPool = ['BB', 'BB-', 'BB-']; break;
      case 'B1': ratingPool = ['B+', 'B', 'B']; break;
      case 'B2': ratingPool = ['B-', 'B-', 'NR']; break;
      default: ratingPool = ['BB', 'B', 'NR'];
    }
    const rating = pick(ratingPool, rng);

    // Attachment/detachment points with jitter
    const attachmentPt = round(structure.attachBase + (rng() - 0.5) * 0.20, 2);
    const detachmentPt = round(structure.detachBase + (rng() - 0.5) * 0.30, 2);

    // Expected loss
    const expectedLoss = round(structure.elBase + (rng() - 0.5) * 0.40, 2);

    // Issuance date: within the last 6 months
    const daysAgo = Math.floor(rng() * 180);
    const issuanceDate = new Date(now);
    issuanceDate.setDate(issuanceDate.getDate() - daysAgo);

    deals.push({
      issuer,
      series,
      tranche,
      notional,
      spread,
      rating,
      attachmentPt: Math.max(0, attachmentPt),
      detachmentPt: Math.max(attachmentPt + 0.20, detachmentPt),
      expectedLoss: Math.max(0.01, expectedLoss),
      issuanceDate: issuanceDate.toISOString().slice(0, 10),
    });
  }

  // Sort by issuance date descending (most recent first)
  deals.sort((a, b) => b.issuanceDate.localeCompare(a.issuanceDate));
  return deals;
}

function generateMarketPricing(rng: () => number): MarketPricing[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  const benchmarkSeries = [
    { series: `CAS ${currentYear}-R01`, tranche: 'M1', spreadBase: 155, daysBase: 120 },
    { series: `CAS ${currentYear}-R02`, tranche: 'M2', spreadBase: 260, daysBase: 85 },
    { series: `STACR ${currentYear}-DNA1`, tranche: 'M1', spreadBase: 150, daysBase: 140 },
    { series: `STACR ${currentYear}-DNA1`, tranche: 'B1', spreadBase: 430, daysBase: 140 },
    { series: `STACR ${currentYear}-HQA1`, tranche: 'M1', spreadBase: 130, daysBase: 100 },
    { series: `CAS ${currentYear - 1}-R06`, tranche: 'M1', spreadBase: 140, daysBase: 280 },
    { series: `STACR ${currentYear - 1}-DNA3`, tranche: 'M2', spreadBase: 240, daysBase: 310 },
    { series: `CAS ${currentYear - 1}-R04`, tranche: 'B2', spreadBase: 720, daysBase: 400 },
  ];

  return benchmarkSeries.map((cfg) => {
    const currentSpread = Math.round(cfg.spreadBase + (rng() - 0.5) * 40);
    const change1w = Math.round((rng() - 0.5) * 16);
    const change1m = Math.round((rng() - 0.48) * 30); // slight tightening bias
    const daysOld = cfg.daysBase + Math.floor((rng() - 0.5) * 30);

    // Cumulative loss: older/riskier tranches have more realized loss
    const ageFactor = daysOld / 365;
    let cumulLossBase: number;
    if (cfg.tranche === 'B2') {
      cumulLossBase = rangef(0.02, 0.15, rng) * ageFactor;
    } else if (cfg.tranche === 'B1') {
      cumulLossBase = rangef(0.01, 0.08, rng) * ageFactor;
    } else if (cfg.tranche === 'M2') {
      cumulLossBase = rangef(0.005, 0.04, rng) * ageFactor;
    } else {
      cumulLossBase = rangef(0.001, 0.02, rng) * ageFactor;
    }
    const cumulLoss = round(cumulLossBase, 3);

    // Factor: how much of original notional is still outstanding
    // Newer deals have higher factor, older deals pay down
    const baseFactor = 1.0 - (daysOld / 365) * rangef(0.05, 0.15, rng);
    const factor = round(Math.max(0.60, Math.min(1.0, baseFactor)), 3);

    return {
      series: cfg.series,
      tranche: cfg.tranche,
      currentSpread,
      change1w,
      change1m,
      daysOld,
      cumulLoss,
      factor,
    };
  });
}

function generateDelinquencyMetrics(rng: () => number): DelinquencyMetric[] {
  // Vintages 2020-2025, each with realistic credit performance characteristics
  const vintageConfigs = [
    { vintage: 2020, delinqBase: 0.42, defaultBase: 0.18, lossBase: 0.12, cprBase: 28.5, ceBase: 4.80 },
    { vintage: 2021, delinqBase: 0.65, defaultBase: 0.28, lossBase: 0.22, cprBase: 22.0, ceBase: 4.50 },
    { vintage: 2022, delinqBase: 1.10, defaultBase: 0.45, lossBase: 0.35, cprBase: 8.5,  ceBase: 4.20 },
    { vintage: 2023, delinqBase: 0.85, defaultBase: 0.32, lossBase: 0.18, cprBase: 12.0, ceBase: 4.40 },
    { vintage: 2024, delinqBase: 0.55, defaultBase: 0.15, lossBase: 0.05, cprBase: 14.5, ceBase: 4.60 },
    { vintage: 2025, delinqBase: 0.25, defaultBase: 0.05, lossBase: 0.01, cprBase: 16.0, ceBase: 5.00 },
  ];

  return vintageConfigs.map((cfg) => {
    const seriousDelinq = round(cfg.delinqBase + (rng() - 0.5) * 0.30, 2);
    const earlyDefault = round(cfg.defaultBase + (rng() - 0.5) * 0.12, 2);
    const cumulLoss = round(cfg.lossBase + (rng() - 0.5) * 0.10, 2);
    const prepayRate = round(cfg.cprBase + (rng() - 0.5) * 6.0, 1);
    const creditEnhancement = round(cfg.ceBase + (rng() - 0.5) * 0.60, 2);

    return {
      vintage: cfg.vintage,
      seriousDelinq: Math.max(0.01, seriousDelinq),
      earlyDefault: Math.max(0.01, earlyDefault),
      cumulLoss: Math.max(0, cumulLoss),
      prepayRate: Math.max(2.0, prepayRate),
      creditEnhancement: Math.max(2.0, creditEnhancement),
    };
  });
}

function generateCRTData(): CRTResponse {
  const rng = seededRandom('credit-risk-transfer');

  const deals = generateDeals(rng);
  const marketPricing = generateMarketPricing(rng);
  const delinquencyMetrics = generateDelinquencyMetrics(rng);

  // Summary
  // Total YTD issuance: sum of deal notionals for current year, scaled to $B
  const currentYear = new Date().getFullYear();
  const ytdDeals = deals.filter(d => d.issuanceDate.startsWith(String(currentYear)));
  const ytdNotionalM = ytdDeals.reduce((s, d) => s + d.notional, 0);
  // Add a base to represent deals not shown in the 10-deal window
  const totalIssuance = round((ytdNotionalM + rangef(8000, 15000, rng)) / 1000, 1);

  const avgSpread = Math.round(deals.reduce((s, d) => s + d.spread, 0) / deals.length);
  const avgExpectedLoss = round(deals.reduce((s, d) => s + d.expectedLoss, 0) / deals.length, 2);

  // Active series: count of unique series with factor > 0.70
  const activeSeriesSet = new Set(marketPricing.filter(p => p.factor > 0.70).map(p => p.series));
  const activeSeries = activeSeriesSet.size + Math.floor(rangef(35, 65, rng));

  // Delinquency trend: based on recent vintage performance
  const recent = delinquencyMetrics.filter(m => m.vintage >= 2024);
  const older = delinquencyMetrics.filter(m => m.vintage >= 2022 && m.vintage < 2024);
  const recentAvgDelinq = recent.reduce((s, m) => s + m.seriousDelinq, 0) / (recent.length || 1);
  const olderAvgDelinq = older.reduce((s, m) => s + m.seriousDelinq, 0) / (older.length || 1);

  let delinquencyTrend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  if (recentAvgDelinq < olderAvgDelinq * 0.85) {
    delinquencyTrend = 'IMPROVING';
  } else if (recentAvgDelinq > olderAvgDelinq * 1.15) {
    delinquencyTrend = 'DETERIORATING';
  } else {
    delinquencyTrend = 'STABLE';
  }

  const summary: CRTSummary = {
    totalIssuance,
    avgSpread,
    avgExpectedLoss,
    activeSeries,
    delinquencyTrend,
    timestamp: new Date().toISOString(),
  };

  return { deals, marketPricing, delinquencyMetrics, summary };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCRTData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CreditRiskTransfer] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate credit risk transfer data' });
  }
});

export default router;
