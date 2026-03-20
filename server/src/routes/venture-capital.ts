import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

let cacheData: any = null;
let cacheTime = 0;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Static data ──

const STAGES = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Growth'];

const STAGE_BASE: { stage: string; baseDealCount: number; baseTotalValue: number; baseAvgDealSize: number; baseMedianValuation: number }[] = [
  { stage: 'Seed',      baseDealCount: 1850, baseTotalValue: 4.2,   baseAvgDealSize: 2.3,   baseMedianValuation: 12 },
  { stage: 'Series A',  baseDealCount: 980,  baseTotalValue: 14.8,  baseAvgDealSize: 15.1,  baseMedianValuation: 45 },
  { stage: 'Series B',  baseDealCount: 520,  baseTotalValue: 18.5,  baseAvgDealSize: 35.6,  baseMedianValuation: 150 },
  { stage: 'Series C',  baseDealCount: 285,  baseTotalValue: 19.2,  baseAvgDealSize: 67.4,  baseMedianValuation: 450 },
  { stage: 'Series D+', baseDealCount: 145,  baseTotalValue: 16.8,  baseAvgDealSize: 115.9, baseMedianValuation: 1200 },
  { stage: 'Growth',    baseDealCount: 92,   baseTotalValue: 22.5,  baseAvgDealSize: 244.6, baseMedianValuation: 3500 },
];

const SECTOR_BASE: { sector: string; baseDealCount: number; baseTotalFunding: number; baseAvgDealSize: number; baseYoY: number }[] = [
  { sector: 'AI/ML',             baseDealCount: 685,  baseTotalFunding: 28.5, baseAvgDealSize: 41.6, baseYoY: 72.3 },
  { sector: 'Fintech',           baseDealCount: 412,  baseTotalFunding: 15.8, baseAvgDealSize: 38.3, baseYoY: -8.5 },
  { sector: 'Healthtech',        baseDealCount: 378,  baseTotalFunding: 12.4, baseAvgDealSize: 32.8, baseYoY: 14.2 },
  { sector: 'Cybersecurity',     baseDealCount: 295,  baseTotalFunding: 11.2, baseAvgDealSize: 38.0, baseYoY: 22.8 },
  { sector: 'Climate/Cleantech', baseDealCount: 342,  baseTotalFunding: 14.6, baseAvgDealSize: 42.7, baseYoY: 35.1 },
  { sector: 'SaaS',              baseDealCount: 528,  baseTotalFunding: 16.2, baseAvgDealSize: 30.7, baseYoY: -12.4 },
  { sector: 'Biotech',           baseDealCount: 265,  baseTotalFunding: 13.8, baseAvgDealSize: 52.1, baseYoY: 5.6 },
  { sector: 'Crypto/Web3',       baseDealCount: 198,  baseTotalFunding: 6.2,  baseAvgDealSize: 31.3, baseYoY: -28.5 },
  { sector: 'Ecommerce',         baseDealCount: 245,  baseTotalFunding: 7.8,  baseAvgDealSize: 31.8, baseYoY: -5.2 },
  { sector: 'Spacetech',         baseDealCount: 82,   baseTotalFunding: 5.4,  baseAvgDealSize: 65.9, baseYoY: 45.8 },
];

const TOP_DEAL_TEMPLATES: { company: string; sector: string; stage: string; baseAmount: number; baseValuation: number; leadInvestor: string }[] = [
  { company: 'Anthropic',            sector: 'AI/ML',             stage: 'Series D+', baseAmount: 4000,  baseValuation: 60000, leadInvestor: 'Google / Spark Capital' },
  { company: 'Databricks',           sector: 'AI/ML',             stage: 'Growth',    baseAmount: 2500,  baseValuation: 55000, leadInvestor: 'a16z' },
  { company: 'Stripe',               sector: 'Fintech',           stage: 'Growth',    baseAmount: 1200,  baseValuation: 70000, leadInvestor: 'Sequoia Capital' },
  { company: 'Anduril Industries',   sector: 'Defense Tech',      stage: 'Series F',  baseAmount: 1500,  baseValuation: 14000, leadInvestor: 'Founders Fund' },
  { company: 'Wiz',                  sector: 'Cybersecurity',     stage: 'Series D',  baseAmount: 1000,  baseValuation: 12000, leadInvestor: 'Lightspeed Venture Partners' },
  { company: 'Celestial AI',         sector: 'AI/ML',             stage: 'Series C',  baseAmount: 575,   baseValuation: 4200,  leadInvestor: 'Koch Disruptive Technologies' },
  { company: 'Vercel',               sector: 'SaaS',              stage: 'Series D',  baseAmount: 250,   baseValuation: 3500,  leadInvestor: 'GV' },
  { company: 'Mistral AI',           sector: 'AI/ML',             stage: 'Series B',  baseAmount: 640,   baseValuation: 6000,  leadInvestor: 'a16z' },
  { company: 'Abridge',              sector: 'Healthtech',        stage: 'Series C',  baseAmount: 250,   baseValuation: 2500,  leadInvestor: 'Lightspeed Venture Partners' },
  { company: 'Electric Hydrogen',    sector: 'Climate/Cleantech', stage: 'Series C',  baseAmount: 380,   baseValuation: 2800,  leadInvestor: 'Fifth Wall' },
  { company: 'Groq',                 sector: 'AI/ML',             stage: 'Series D',  baseAmount: 640,   baseValuation: 2800,  leadInvestor: 'BlackRock' },
  { company: 'Harvey AI',            sector: 'AI/ML',             stage: 'Series C',  baseAmount: 200,   baseValuation: 1500,  leadInvestor: 'Sequoia Capital' },
  { company: 'Monzo',                sector: 'Fintech',           stage: 'Growth',    baseAmount: 430,   baseValuation: 5500,  leadInvestor: 'Silver Lake' },
  { company: 'Cohere',               sector: 'AI/ML',             stage: 'Series D',  baseAmount: 500,   baseValuation: 5500,  leadInvestor: 'PSP Investments' },
  { company: 'Devoted Health',       sector: 'Healthtech',        stage: 'Series E',  baseAmount: 340,   baseValuation: 3800,  leadInvestor: 'a16z' },
];

const UNICORN_TEMPLATES: { name: string; sector: string; baseValuation: number; lastRound: string; baseTotalRaised: number; status: string }[] = [
  { name: 'SpaceX',            sector: 'Spacetech',         baseValuation: 210,  lastRound: 'Series N',  baseTotalRaised: 9800,  status: 'private' },
  { name: 'Stripe',            sector: 'Fintech',           baseValuation: 70,   lastRound: 'Series I',  baseTotalRaised: 8700,  status: 'pre-IPO' },
  { name: 'Databricks',        sector: 'AI/ML',             baseValuation: 55,   lastRound: 'Series I',  baseTotalRaised: 4200,  status: 'pre-IPO' },
  { name: 'Canva',             sector: 'SaaS',              baseValuation: 39,   lastRound: 'Series F',  baseTotalRaised: 572,   status: 'pre-IPO' },
  { name: 'Revolut',           sector: 'Fintech',           baseValuation: 33,   lastRound: 'Series E',  baseTotalRaised: 1700,  status: 'pre-IPO' },
  { name: 'Shein',             sector: 'Ecommerce',         baseValuation: 66,   lastRound: 'Series F',  baseTotalRaised: 3500,  status: 'pre-IPO' },
  { name: 'Anthropic',         sector: 'AI/ML',             baseValuation: 60,   lastRound: 'Series D',  baseTotalRaised: 7100,  status: 'private' },
  { name: 'Wiz',               sector: 'Cybersecurity',     baseValuation: 12,   lastRound: 'Series D',  baseTotalRaised: 1900,  status: 'private' },
  { name: 'Rippling',          sector: 'SaaS',              baseValuation: 13.5, lastRound: 'Series E',  baseTotalRaised: 1200,  status: 'private' },
  { name: 'Anduril',           sector: 'Defense Tech',      baseValuation: 14,   lastRound: 'Series F',  baseTotalRaised: 3800,  status: 'private' },
  { name: 'Fanatics',          sector: 'Ecommerce',         baseValuation: 31,   lastRound: 'Series E',  baseTotalRaised: 4200,  status: 'private' },
  { name: 'Discord',           sector: 'SaaS',              baseValuation: 15,   lastRound: 'Series I',  baseTotalRaised: 995,   status: 'private' },
  { name: 'Notion',            sector: 'SaaS',              baseValuation: 10,   lastRound: 'Series C',  baseTotalRaised: 343,   status: 'private' },
  { name: 'Figma',             sector: 'SaaS',              baseValuation: 12.5, lastRound: 'Series E',  baseTotalRaised: 587,   status: 'private' },
  { name: 'Scale AI',          sector: 'AI/ML',             baseValuation: 14,   lastRound: 'Series F',  baseTotalRaised: 1000,  status: 'private' },
  { name: 'Impossible Foods',  sector: 'Climate/Cleantech', baseValuation: 7,    lastRound: 'Series H',  baseTotalRaised: 2100,  status: 'pre-IPO' },
];

const EXIT_TEMPLATES: { company: string; type: string; baseExitValue: number; baseReturnMultiple: number; sector: string }[] = [
  { company: 'Instacart',         type: 'IPO',  baseExitValue: 10200, baseReturnMultiple: 3.8,  sector: 'Ecommerce' },
  { company: 'Klaviyo',           type: 'IPO',  baseExitValue: 9200,  baseReturnMultiple: 12.5, sector: 'SaaS' },
  { company: 'Arm Holdings',      type: 'IPO',  baseExitValue: 65000, baseReturnMultiple: 6.2,  sector: 'Semiconductor' },
  { company: 'Hashicorp',         type: 'M&A',  baseExitValue: 6400,  baseReturnMultiple: 4.1,  sector: 'SaaS' },
  { company: 'Ansys',             type: 'M&A',  baseExitValue: 35000, baseReturnMultiple: 5.8,  sector: 'SaaS' },
  { company: 'Cvent',             type: 'M&A',  baseExitValue: 4600,  baseReturnMultiple: 2.8,  sector: 'SaaS' },
  { company: 'Rubrik',            type: 'IPO',  baseExitValue: 5600,  baseReturnMultiple: 8.4,  sector: 'Cybersecurity' },
  { company: 'Astera Labs',       type: 'IPO',  baseExitValue: 5900,  baseReturnMultiple: 15.2, sector: 'Semiconductor' },
  { company: 'Reddit',            type: 'IPO',  baseExitValue: 8600,  baseReturnMultiple: 3.2,  sector: 'Social Media' },
  { company: 'Ibotta',            type: 'IPO',  baseExitValue: 2400,  baseReturnMultiple: 7.5,  sector: 'Fintech' },
];

const VC_FIRMS: { firm: string; baseDeals: number; baseTotalDeployed: number; baseAvgCheck: number; topSector: string }[] = [
  { firm: 'a16z',              baseDeals: 42, baseTotalDeployed: 3.8,  baseAvgCheck: 90,  topSector: 'AI/ML' },
  { firm: 'Sequoia Capital',   baseDeals: 35, baseTotalDeployed: 3.2,  baseAvgCheck: 91,  topSector: 'AI/ML' },
  { firm: 'Accel',             baseDeals: 28, baseTotalDeployed: 2.1,  baseAvgCheck: 75,  topSector: 'SaaS' },
  { firm: 'Tiger Global',      baseDeals: 18, baseTotalDeployed: 1.8,  baseAvgCheck: 100, topSector: 'Fintech' },
  { firm: 'Softbank',          baseDeals: 22, baseTotalDeployed: 4.5,  baseAvgCheck: 205, topSector: 'AI/ML' },
  { firm: 'Lightspeed',        baseDeals: 32, baseTotalDeployed: 2.4,  baseAvgCheck: 75,  topSector: 'Cybersecurity' },
  { firm: 'GV',                baseDeals: 26, baseTotalDeployed: 1.5,  baseAvgCheck: 58,  topSector: 'Healthtech' },
  { firm: 'NEA',               baseDeals: 24, baseTotalDeployed: 1.9,  baseAvgCheck: 79,  topSector: 'Healthtech' },
  { firm: 'Kleiner Perkins',   baseDeals: 20, baseTotalDeployed: 1.2,  baseAvgCheck: 60,  topSector: 'Climate/Cleantech' },
  { firm: 'Founders Fund',     baseDeals: 15, baseTotalDeployed: 1.6,  baseAvgCheck: 107, topSector: 'Defense Tech' },
];

const QUARTERLY_BASE: { quarter: string; baseFunding: number }[] = [
  { quarter: 'Q2 2024', baseFunding: 78.5 },
  { quarter: 'Q3 2024', baseFunding: 82.3 },
  { quarter: 'Q4 2024', baseFunding: 91.2 },
  { quarter: 'Q1 2025', baseFunding: 88.6 },
  { quarter: 'Q2 2025', baseFunding: 95.4 },
  { quarter: 'Q3 2025', baseFunding: 102.8 },
  { quarter: 'Q4 2025', baseFunding: 108.5 },
  { quarter: 'Q1 2026', baseFunding: 112.3 },
];

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('venture-capital-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Generate a recent date within last 90 days
  const recentDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(rng() * 90));
    return d.toISOString().slice(0, 10);
  };

  // Generate a recent date for unicorn last round (within last 12 months)
  const lastRoundDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(rng() * 365));
    return d.toISOString().slice(0, 10);
  };

  // 1. Deals by Stage
  const dealsByStage = STAGE_BASE.map(s => ({
    stage: s.stage,
    dealCount: Math.round(jitter(s.baseDealCount, 0.12)),
    totalValue: round1(jitter(s.baseTotalValue, 0.10)),
    avgDealSize: round1(jitter(s.baseAvgDealSize, 0.10)),
    medianValuation: Math.round(jitter(s.baseMedianValuation, 0.12)),
  }));

  // 2. Funding Overview
  const totalDeals = dealsByStage.reduce((sum, s) => sum + s.dealCount, 0);
  const totalValue = round1(dealsByStage.reduce((sum, s) => sum + s.totalValue, 0));
  const averageDealSize = round1((totalValue * 1000) / totalDeals);
  const medianPreMoneyValuation = Math.round(jitter(85, 0.10));
  const qoqChange = round1(jitter(8.5, 0.40));

  const fundingOverview = {
    totalDeals,
    totalValue,
    averageDealSize,
    medianPreMoneyValuation,
    qoqChange,
  };

  // 3. Top Deals
  const topDeals = TOP_DEAL_TEMPLATES.map(d => ({
    company: d.company,
    sector: d.sector,
    stage: d.stage,
    amount: Math.round(jitter(d.baseAmount, 0.08)),
    valuation: Math.round(jitter(d.baseValuation, 0.08)),
    leadInvestor: d.leadInvestor,
    date: recentDate(),
  }));

  // 4. Sector Breakdown
  const sectorBreakdown = SECTOR_BASE.map(s => ({
    sector: s.sector,
    dealCount: Math.round(jitter(s.baseDealCount, 0.10)),
    totalFunding: round1(jitter(s.baseTotalFunding, 0.10)),
    avgDealSize: round1(jitter(s.baseAvgDealSize, 0.10)),
    yoyChange: round1(jitter(s.baseYoY, 0.15)),
  }));

  // 5. Unicorn Tracker
  const unicornTracker = UNICORN_TEMPLATES.map(u => ({
    name: u.name,
    sector: u.sector,
    valuation: round1(jitter(u.baseValuation, 0.08)),
    lastRound: u.lastRound,
    lastRoundDate: lastRoundDate(),
    totalRaised: Math.round(jitter(u.baseTotalRaised, 0.06)),
    status: u.status,
  }));

  // 6. Exits
  const exits = EXIT_TEMPLATES.map(e => ({
    company: e.company,
    type: e.type,
    exitValue: Math.round(jitter(e.baseExitValue, 0.10)),
    returnMultiple: round1(jitter(e.baseReturnMultiple, 0.12)),
    sector: e.sector,
    date: recentDate(),
  }));

  // 7. VC Firm Activity
  const vcFirmActivity = VC_FIRMS.map(f => ({
    firm: f.firm,
    dealsThisQuarter: Math.round(jitter(f.baseDeals, 0.15)),
    totalDeployed: round1(jitter(f.baseTotalDeployed, 0.10)),
    avgCheckSize: Math.round(jitter(f.baseAvgCheck, 0.12)),
    topSector: f.topSector,
  }));

  // 8. Quarterly Trend
  const quarterlyTrend = QUARTERLY_BASE.map(q => ({
    quarter: q.quarter,
    totalFunding: round1(jitter(q.baseFunding, 0.06)),
  }));

  return {
    fundingOverview,
    dealsByStage,
    topDeals,
    sectorBreakdown,
    unicornTracker,
    exits,
    vcFirmActivity,
    quarterlyTrend,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

let staleData: any = null;

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < TTL) return res.json(cacheData);
    const data = generate();
    staleData = cacheData ?? staleData;
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: any) {
    console.error('[VentureCapital] Error:', err?.message);
    if (staleData) return res.json(staleData);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate venture capital data' });
  }
});

export default router;
