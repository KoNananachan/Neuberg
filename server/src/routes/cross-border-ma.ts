import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

type Sector = 'Technology' | 'Pharma' | 'Energy' | 'Financial' | 'Industrial' | 'Consumer';
type DealType = 'CASH' | 'STOCK' | 'MIXED';
type DealStatus = 'ANNOUNCED' | 'REGULATORY_REVIEW' | 'ANTITRUST' | 'CFIUS' | 'APPROVED' | 'CLOSING';
type RegulatoryRisk = 'LOW' | 'MEDIUM' | 'HIGH';
type Region = 'US' | 'Europe' | 'Asia' | 'EM';
type RegulatoryOutcome = 'PENDING' | 'APPROVED' | 'CONDITIONS' | 'BLOCKED';
type Jurisdiction = 'US-CFIUS' | 'EU-DG COMP' | 'UK-CMA' | 'China-SAMR' | 'Japan-JFTC' | 'Australia-ACCC';

interface ActiveDeal {
  acquirer: string;
  acquirerCountry: string;
  target: string;
  targetCountry: string;
  sector: Sector;
  dealValue: number;
  premium: number;
  dealType: DealType;
  status: DealStatus;
  announcedDate: string;
  expectedClose: string;
  regulatoryRisk: RegulatoryRisk;
}

interface RegionalFlow {
  from: Region;
  to: Region;
  dealCount: number;
  totalValue: number;
  avgPremium: number;
  topSector: Sector;
  yoyChange: number;
}

interface RegulatoryTracker {
  deal: string;
  jurisdiction: Jurisdiction;
  filingDate: string;
  expectedDecision: string;
  outcome: RegulatoryOutcome;
  keyIssue: string;
}

interface Summary {
  totalDeals: number;
  totalValue: number;
  avgPremium: number;
  topCorridor: string;
  blockedDeals: number;
  timestamp: string;
}

interface CrossBorderMaResponse {
  activeDeals: ActiveDeal[];
  regionalFlow: RegionalFlow[];
  regulatoryTracker: RegulatoryTracker[];
  summary: Summary;
}

// ── Deal definitions ──

interface DealDef {
  acquirer: string;
  acquirerCountry: string;
  target: string;
  targetCountry: string;
  sector: Sector;
  baseDealValue: number;
  basePremium: number;
}

const DEAL_DEFS: DealDef[] = [
  { acquirer: 'SAP SE', acquirerCountry: 'Germany', target: 'Informatica Inc.', targetCountry: 'United States', sector: 'Technology', baseDealValue: 11.4, basePremium: 30 },
  { acquirer: 'Novo Holdings A/S', acquirerCountry: 'Denmark', target: 'Catalent Inc.', targetCountry: 'United States', sector: 'Pharma', baseDealValue: 16.5, basePremium: 22 },
  { acquirer: 'Brookfield Asset Management', acquirerCountry: 'Canada', target: 'Origin Energy Ltd.', targetCountry: 'Australia', sector: 'Energy', baseDealValue: 10.2, basePremium: 19 },
  { acquirer: 'MUFG Bank', acquirerCountry: 'Japan', target: 'Sabadell Asset Management', targetCountry: 'Spain', sector: 'Financial', baseDealValue: 5.8, basePremium: 24 },
  { acquirer: 'Schneider Electric SE', acquirerCountry: 'France', target: 'Bentley Systems Inc.', targetCountry: 'United States', sector: 'Industrial', baseDealValue: 15.3, basePremium: 35 },
  { acquirer: 'Unilever PLC', acquirerCountry: 'United Kingdom', target: 'Natura & Co.', targetCountry: 'Brazil', sector: 'Consumer', baseDealValue: 7.9, basePremium: 28 },
  { acquirer: 'Samsung Electronics', acquirerCountry: 'South Korea', target: 'NXP Semiconductors NV', targetCountry: 'Netherlands', sector: 'Technology', baseDealValue: 42.6, basePremium: 38 },
  { acquirer: 'Roche Holding AG', acquirerCountry: 'Switzerland', target: 'Alnylam Pharmaceuticals', targetCountry: 'United States', sector: 'Pharma', baseDealValue: 28.7, basePremium: 41 },
  { acquirer: 'TotalEnergies SE', acquirerCountry: 'France', target: 'SunPower Corp.', targetCountry: 'United States', sector: 'Energy', baseDealValue: 3.2, basePremium: 45 },
  { acquirer: 'HSBC Holdings PLC', acquirerCountry: 'United Kingdom', target: 'Bandhan Bank Ltd.', targetCountry: 'India', sector: 'Financial', baseDealValue: 6.1, basePremium: 18 },
  { acquirer: 'Siemens AG', acquirerCountry: 'Germany', target: 'Altair Engineering Inc.', targetCountry: 'United States', sector: 'Industrial', baseDealValue: 13.8, basePremium: 32 },
  { acquirer: 'Diageo PLC', acquirerCountry: 'United Kingdom', target: 'Brown-Forman Corp.', targetCountry: 'United States', sector: 'Consumer', baseDealValue: 22.4, basePremium: 26 },
  { acquirer: 'TSMC', acquirerCountry: 'Taiwan', target: 'GlobalFoundries Inc.', targetCountry: 'United States', sector: 'Technology', baseDealValue: 36.5, basePremium: 34 },
  { acquirer: 'AstraZeneca PLC', acquirerCountry: 'United Kingdom', target: 'Argenx SE', targetCountry: 'Netherlands', sector: 'Pharma', baseDealValue: 19.4, basePremium: 29 },
  { acquirer: 'Mitsubishi Corp.', acquirerCountry: 'Japan', target: 'Woodside Energy Group', targetCountry: 'Australia', sector: 'Energy', baseDealValue: 24.1, basePremium: 15 },
  { acquirer: 'BNP Paribas SA', acquirerCountry: 'France', target: 'Macquarie Group Ltd.', targetCountry: 'Australia', sector: 'Financial', baseDealValue: 31.2, basePremium: 20 },
];

// ── Corridor definitions for regional flow ──

interface CorridorDef {
  from: Region;
  to: Region;
  baseDealCount: number;
  baseTotalValue: number;
  baseAvgPremium: number;
  topSector: Sector;
  baseYoyChange: number;
}

const CORRIDOR_DEFS: CorridorDef[] = [
  { from: 'Europe', to: 'US', baseDealCount: 47, baseTotalValue: 186.4, baseAvgPremium: 31.2, topSector: 'Technology', baseYoyChange: 12.5 },
  { from: 'Asia', to: 'US', baseDealCount: 28, baseTotalValue: 124.8, baseAvgPremium: 34.6, topSector: 'Technology', baseYoyChange: -8.3 },
  { from: 'US', to: 'Europe', baseDealCount: 38, baseTotalValue: 142.1, baseAvgPremium: 27.8, topSector: 'Pharma', baseYoyChange: 5.7 },
  { from: 'Asia', to: 'Europe', baseDealCount: 19, baseTotalValue: 67.3, baseAvgPremium: 22.4, topSector: 'Financial', baseYoyChange: 18.9 },
  { from: 'US', to: 'Asia', baseDealCount: 22, baseTotalValue: 78.6, baseAvgPremium: 25.1, topSector: 'Consumer', baseYoyChange: -3.2 },
  { from: 'Europe', to: 'Asia', baseDealCount: 15, baseTotalValue: 52.7, baseAvgPremium: 23.5, topSector: 'Industrial', baseYoyChange: 9.1 },
  { from: 'EM', to: 'US', baseDealCount: 11, baseTotalValue: 34.2, baseAvgPremium: 29.8, topSector: 'Energy', baseYoyChange: -14.6 },
  { from: 'US', to: 'EM', baseDealCount: 16, baseTotalValue: 45.9, baseAvgPremium: 21.3, topSector: 'Financial', baseYoyChange: 22.4 },
];

// ── Regulatory review definitions ──

interface RegulatoryDef {
  acquirer: string;
  target: string;
  jurisdiction: Jurisdiction;
  baseKeyIssue: string;
}

const REGULATORY_DEFS: RegulatoryDef[] = [
  { acquirer: 'Samsung Electronics', target: 'NXP Semiconductors NV', jurisdiction: 'US-CFIUS', baseKeyIssue: 'National security concerns over semiconductor supply chain' },
  { acquirer: 'SAP SE', target: 'Informatica Inc.', jurisdiction: 'EU-DG COMP', baseKeyIssue: 'Market dominance in enterprise data management software' },
  { acquirer: 'Roche Holding AG', target: 'Alnylam Pharmaceuticals', jurisdiction: 'UK-CMA', baseKeyIssue: 'Reduced competition in RNA interference therapeutics' },
  { acquirer: 'TSMC', target: 'GlobalFoundries Inc.', jurisdiction: 'China-SAMR', baseKeyIssue: 'Chip fabrication market concentration and export controls' },
  { acquirer: 'Mitsubishi Corp.', target: 'Woodside Energy Group', jurisdiction: 'Japan-JFTC', baseKeyIssue: 'LNG supply market consolidation in Asia-Pacific' },
  { acquirer: 'Brookfield Asset Management', target: 'Origin Energy Ltd.', jurisdiction: 'Australia-ACCC', baseKeyIssue: 'Energy market competition and retail electricity pricing' },
  { acquirer: 'Schneider Electric SE', target: 'Bentley Systems Inc.', jurisdiction: 'US-CFIUS', baseKeyIssue: 'Critical infrastructure software foreign ownership' },
  { acquirer: 'BNP Paribas SA', target: 'Macquarie Group Ltd.', jurisdiction: 'EU-DG COMP', baseKeyIssue: 'Systemic risk in European financial services consolidation' },
];

const SECTORS: Sector[] = ['Technology', 'Pharma', 'Energy', 'Financial', 'Industrial', 'Consumer'];
const DEAL_TYPES: DealType[] = ['CASH', 'STOCK', 'MIXED'];
const DEAL_STATUSES: DealStatus[] = ['ANNOUNCED', 'REGULATORY_REVIEW', 'ANTITRUST', 'CFIUS', 'APPROVED', 'CLOSING'];
const REG_RISKS: RegulatoryRisk[] = ['LOW', 'MEDIUM', 'HIGH'];
const REG_OUTCOMES: RegulatoryOutcome[] = ['PENDING', 'APPROVED', 'CONDITIONS', 'BLOCKED'];

// ── Helpers ──

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Generation logic ──

function generateActiveDeals(rng: () => number): ActiveDeal[] {
  const today = new Date();
  const deals: ActiveDeal[] = [];

  // Shuffle and pick 12 from the pool
  const shuffled = [...DEAL_DEFS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 12);

  for (const def of selected) {
    const dealType = pick(DEAL_TYPES, rng);
    const status = pick(DEAL_STATUSES, rng);

    // Deal value: base +/- 8%
    const dealValue = round1(def.baseDealValue * (0.92 + rng() * 0.16));

    // Premium: base +/- 5pp
    const premium = round1(def.basePremium + (rng() - 0.5) * 10);

    // Announced date: 10-180 days ago
    const daysAgo = 10 + Math.floor(rng() * 170);
    const announcedObj = new Date(today);
    announcedObj.setDate(announcedObj.getDate() - daysAgo);
    const announcedDate = formatDate(announcedObj);

    // Expected close: 2-14 months from now
    const monthsOut = 2 + Math.floor(rng() * 13);
    const closeObj = new Date(today);
    closeObj.setMonth(closeObj.getMonth() + monthsOut);
    const expectedClose = formatDate(closeObj);

    // Regulatory risk weighted by status
    let regulatoryRisk: RegulatoryRisk;
    if (status === 'CFIUS' || status === 'ANTITRUST') {
      regulatoryRisk = rng() < 0.6 ? 'HIGH' : 'MEDIUM';
    } else if (status === 'REGULATORY_REVIEW') {
      regulatoryRisk = rng() < 0.4 ? 'HIGH' : rng() < 0.7 ? 'MEDIUM' : 'LOW';
    } else if (status === 'APPROVED' || status === 'CLOSING') {
      regulatoryRisk = rng() < 0.7 ? 'LOW' : 'MEDIUM';
    } else {
      regulatoryRisk = pick(REG_RISKS, rng);
    }

    deals.push({
      acquirer: def.acquirer,
      acquirerCountry: def.acquirerCountry,
      target: def.target,
      targetCountry: def.targetCountry,
      sector: def.sector,
      dealValue,
      premium,
      dealType,
      status,
      announcedDate,
      expectedClose,
      regulatoryRisk,
    });
  }

  // Sort by deal value descending
  deals.sort((a, b) => b.dealValue - a.dealValue);
  return deals;
}

function generateRegionalFlow(rng: () => number): RegionalFlow[] {
  const flows: RegionalFlow[] = [];

  for (const def of CORRIDOR_DEFS) {
    // Jitter deal count +/- 15%
    const dealCount = Math.max(1, Math.round(def.baseDealCount * (0.85 + rng() * 0.30)));

    // Jitter total value +/- 12%
    const totalValue = round1(def.baseTotalValue * (0.88 + rng() * 0.24));

    // Jitter avg premium +/- 3pp
    const avgPremium = round1(def.baseAvgPremium + (rng() - 0.5) * 6);

    // Jitter yoy change +/- 8pp
    const yoyChange = round1(def.baseYoyChange + (rng() - 0.5) * 16);

    // Occasionally shift top sector
    const topSector = rng() < 0.75 ? def.topSector : pick(SECTORS, rng);

    flows.push({
      from: def.from,
      to: def.to,
      dealCount,
      totalValue,
      avgPremium,
      topSector,
      yoyChange,
    });
  }

  // Sort by total value descending
  flows.sort((a, b) => b.totalValue - a.totalValue);
  return flows;
}

function generateRegulatoryTracker(rng: () => number): RegulatoryTracker[] {
  const today = new Date();
  const trackers: RegulatoryTracker[] = [];

  // Shuffle and pick 6
  const shuffled = [...REGULATORY_DEFS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 6);

  for (const def of selected) {
    const deal = `${def.acquirer}\u2192${def.target}`;

    // Filing date: 20-120 days ago
    const filingDaysAgo = 20 + Math.floor(rng() * 100);
    const filingObj = new Date(today);
    filingObj.setDate(filingObj.getDate() - filingDaysAgo);
    const filingDate = formatDate(filingObj);

    // Expected decision: 1-8 months from now
    const decisionMonths = 1 + Math.floor(rng() * 8);
    const decisionObj = new Date(today);
    decisionObj.setMonth(decisionObj.getMonth() + decisionMonths);
    const expectedDecision = formatDate(decisionObj);

    // Weighted outcome: mostly PENDING
    let outcome: RegulatoryOutcome;
    const r = rng();
    if (r < 0.45) {
      outcome = 'PENDING';
    } else if (r < 0.70) {
      outcome = 'CONDITIONS';
    } else if (r < 0.90) {
      outcome = 'APPROVED';
    } else {
      outcome = 'BLOCKED';
    }

    trackers.push({
      deal,
      jurisdiction: def.jurisdiction,
      filingDate,
      expectedDecision,
      outcome,
      keyIssue: def.baseKeyIssue,
    });
  }

  return trackers;
}

function generateSummary(
  activeDeals: ActiveDeal[],
  regionalFlow: RegionalFlow[],
  regulatoryTracker: RegulatoryTracker[]
): Summary {
  const totalDeals = activeDeals.length;
  const totalValue = round1(activeDeals.reduce((sum, d) => sum + d.dealValue, 0));
  const avgPremium = round1(activeDeals.reduce((sum, d) => sum + d.premium, 0) / totalDeals);

  // Top corridor by total value
  const topFlow = regionalFlow[0];
  const topCorridor = topFlow ? `${topFlow.from}\u2192${topFlow.to}` : 'N/A';

  // Blocked deals from regulatory tracker
  const blockedDeals = regulatoryTracker.filter(r => r.outcome === 'BLOCKED').length;

  return {
    totalDeals,
    totalValue,
    avgPremium,
    topCorridor,
    blockedDeals,
    timestamp: new Date().toISOString(),
  };
}

function buildCrossBorderMaData(): CrossBorderMaResponse {
  const rng = seededRandom('cross-border-ma');

  const activeDeals = generateActiveDeals(rng);
  const regionalFlow = generateRegionalFlow(rng);
  const regulatoryTracker = generateRegulatoryTracker(rng);
  const summary = generateSummary(activeDeals, regionalFlow, regulatoryTracker);

  return { activeDeals, regionalFlow, regulatoryTracker, summary };
}

// ── Cache ──

let cachedData: { data: CrossBorderMaResponse; ts: number } | null = null;
let staleData: CrossBorderMaResponse | null = null;
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildCrossBorderMaData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[CrossBorderMA] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate cross-border M&A data' });
  }
});

export default router;
