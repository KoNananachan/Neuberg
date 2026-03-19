import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Deal Configuration ──

interface DealTemplate {
  dealPrefix: string;
  issuer: string;
  type: 'Auto ABS' | 'Student Loan ABS' | 'Credit Card ABS' | 'CLO' | 'CMBS' | 'RMBS Agency' | 'RMBS Non-Agency';
  baseSizeMM: number;
  benchmark: 'SOFR' | 'Treasury';
  leadManagers: string[];
  collateral: CollateralProfile;
}

interface CollateralProfile {
  avgFICO?: number;
  avgLTV?: number;
  avgDTI?: number;
  avgBalance?: number;
  occupancy?: number;
  dscr?: number;
}

interface TrancheTemplate {
  label: string;
  rating: string;
  pctOfDeal: number;
  baseSpreadBps: number;
  baseWAL: number;
}

const LEAD_BANKS = [
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Citi', 'BofA Securities',
  'Barclays', 'Wells Fargo', 'Deutsche Bank', 'RBC Capital Markets', 'Credit Suisse',
  'UBS', 'Jefferies',
];

const DEAL_TEMPLATES: DealTemplate[] = [
  // Auto ABS
  { dealPrefix: 'AMCAR', issuer: 'AmeriCredit (GM Financial)', type: 'Auto ABS', baseSizeMM: 1350, benchmark: 'Treasury', leadManagers: ['JP Morgan', 'BofA Securities'], collateral: { avgFICO: 580, avgBalance: 22500 } },
  { dealPrefix: 'FORDO', issuer: 'Ford Motor Credit', type: 'Auto ABS', baseSizeMM: 1500, benchmark: 'Treasury', leadManagers: ['Goldman Sachs', 'Citi'], collateral: { avgFICO: 735, avgBalance: 28400 } },
  { dealPrefix: 'ALLYA', issuer: 'Ally Financial', type: 'Auto ABS', baseSizeMM: 1200, benchmark: 'Treasury', leadManagers: ['Morgan Stanley', 'Barclays'], collateral: { avgFICO: 710, avgBalance: 25800 } },
  { dealPrefix: 'WOART', issuer: 'World Omni Auto Receivables', type: 'Auto ABS', baseSizeMM: 900, benchmark: 'Treasury', leadManagers: ['Wells Fargo', 'RBC Capital Markets'], collateral: { avgFICO: 750, avgBalance: 31200 } },
  { dealPrefix: 'CARMX', issuer: 'CarMax Auto Owner Trust', type: 'Auto ABS', baseSizeMM: 1100, benchmark: 'Treasury', leadManagers: ['JP Morgan', 'BofA Securities'], collateral: { avgFICO: 695, avgBalance: 24600 } },
  // Student Loan ABS
  { dealPrefix: 'NAVSL', issuer: 'Navient Student Loan Trust', type: 'Student Loan ABS', baseSizeMM: 800, benchmark: 'SOFR', leadManagers: ['Barclays', 'JP Morgan'], collateral: { avgFICO: 680, avgBalance: 35200 } },
  { dealPrefix: 'SLABS', issuer: 'SLM Private Education Loan', type: 'Student Loan ABS', baseSizeMM: 650, benchmark: 'SOFR', leadManagers: ['Goldman Sachs', 'Citi'], collateral: { avgFICO: 720, avgBalance: 28900 } },
  { dealPrefix: 'SOFI', issuer: 'SoFi Professional Loan Program', type: 'Student Loan ABS', baseSizeMM: 550, benchmark: 'SOFR', leadManagers: ['Morgan Stanley', 'Deutsche Bank'], collateral: { avgFICO: 770, avgBalance: 42500 } },
  // Credit Card ABS
  { dealPrefix: 'BACCT', issuer: 'BA Credit Card Trust', type: 'Credit Card ABS', baseSizeMM: 2000, benchmark: 'SOFR', leadManagers: ['BofA Securities', 'Goldman Sachs'], collateral: { avgFICO: 745, avgBalance: 5800 } },
  { dealPrefix: 'CCCIT', issuer: 'Citibank Credit Card Issuance', type: 'Credit Card ABS', baseSizeMM: 1750, benchmark: 'SOFR', leadManagers: ['Citi', 'JP Morgan'], collateral: { avgFICO: 730, avgBalance: 6200 } },
  { dealPrefix: 'CHAIT', issuer: 'Chase Issuance Trust', type: 'Credit Card ABS', baseSizeMM: 2200, benchmark: 'SOFR', leadManagers: ['JP Morgan', 'Morgan Stanley'], collateral: { avgFICO: 755, avgBalance: 5400 } },
  // CLO
  { dealPrefix: 'CARLYLE', issuer: 'Carlyle US CLO', type: 'CLO', baseSizeMM: 600, benchmark: 'SOFR', leadManagers: ['Morgan Stanley', 'JP Morgan'], collateral: {} },
  { dealPrefix: 'APLLO', issuer: 'Apollo Credit CLO', type: 'CLO', baseSizeMM: 550, benchmark: 'SOFR', leadManagers: ['Goldman Sachs', 'Barclays'], collateral: {} },
  { dealPrefix: 'ARES', issuer: 'Ares CLO', type: 'CLO', baseSizeMM: 500, benchmark: 'SOFR', leadManagers: ['Citi', 'Deutsche Bank'], collateral: {} },
  { dealPrefix: 'OAKHLL', issuer: 'Oak Hill CLO', type: 'CLO', baseSizeMM: 475, benchmark: 'SOFR', leadManagers: ['Wells Fargo', 'JP Morgan'], collateral: {} },
  // CMBS
  { dealPrefix: 'JPMCC', issuer: 'JP Morgan Chase Commercial Mortgage', type: 'CMBS', baseSizeMM: 1050, benchmark: 'Treasury', leadManagers: ['JP Morgan', 'Goldman Sachs'], collateral: { occupancy: 94.2, dscr: 1.85, avgLTV: 58 } },
  { dealPrefix: 'GSMS', issuer: 'GS Mortgage Securities', type: 'CMBS', baseSizeMM: 950, benchmark: 'Treasury', leadManagers: ['Goldman Sachs', 'Citi'], collateral: { occupancy: 93.5, dscr: 1.72, avgLTV: 61 } },
  { dealPrefix: 'MSBAM', issuer: 'Morgan Stanley Bank of America Merrill Lynch', type: 'CMBS', baseSizeMM: 1100, benchmark: 'Treasury', leadManagers: ['Morgan Stanley', 'BofA Securities'], collateral: { occupancy: 95.1, dscr: 1.90, avgLTV: 56 } },
  { dealPrefix: 'BMARK', issuer: 'Benchmark Mortgage Trust', type: 'CMBS', baseSizeMM: 880, benchmark: 'Treasury', leadManagers: ['Citi', 'Deutsche Bank', 'JP Morgan'], collateral: { occupancy: 92.8, dscr: 1.68, avgLTV: 63 } },
  // RMBS Agency
  { dealPrefix: 'STACR', issuer: 'Freddie Mac STACR', type: 'RMBS Agency', baseSizeMM: 1400, benchmark: 'SOFR', leadManagers: ['JP Morgan', 'Goldman Sachs', 'BofA Securities'], collateral: { avgFICO: 745, avgLTV: 78, avgDTI: 36 } },
  { dealPrefix: 'CAS', issuer: 'Fannie Mae Connecticut Avenue Securities', type: 'RMBS Agency', baseSizeMM: 1200, benchmark: 'SOFR', leadManagers: ['Morgan Stanley', 'Citi', 'Wells Fargo'], collateral: { avgFICO: 752, avgLTV: 76, avgDTI: 35 } },
  { dealPrefix: 'ACIS', issuer: 'Freddie Mac ACIS', type: 'RMBS Agency', baseSizeMM: 800, benchmark: 'SOFR', leadManagers: ['Barclays', 'Goldman Sachs'], collateral: { avgFICO: 740, avgLTV: 80, avgDTI: 37 } },
  // RMBS Non-Agency
  { dealPrefix: 'RCKT', issuer: 'Rocket Mortgage Trust', type: 'RMBS Non-Agency', baseSizeMM: 750, benchmark: 'Treasury', leadManagers: ['JP Morgan', 'Wells Fargo'], collateral: { avgFICO: 765, avgLTV: 70, avgDTI: 33 } },
  { dealPrefix: 'AGIN', issuer: 'Angel Oak Mortgage Trust', type: 'RMBS Non-Agency', baseSizeMM: 450, benchmark: 'Treasury', leadManagers: ['Morgan Stanley', 'Credit Suisse'], collateral: { avgFICO: 715, avgLTV: 73, avgDTI: 40 } },
  { dealPrefix: 'VERUS', issuer: 'Verus Securitization Trust', type: 'RMBS Non-Agency', baseSizeMM: 500, benchmark: 'Treasury', leadManagers: ['Citi', 'Barclays'], collateral: { avgFICO: 720, avgLTV: 72, avgDTI: 39 } },
];

// Base tranche structures by product type
const TRANCHE_STRUCTURES: Record<string, TrancheTemplate[]> = {
  'Auto ABS': [
    { label: 'A-1', rating: 'AAA', pctOfDeal: 0.35, baseSpreadBps: 20, baseWAL: 0.5 },
    { label: 'A-2', rating: 'AAA', pctOfDeal: 0.30, baseSpreadBps: 42, baseWAL: 1.8 },
    { label: 'A-3', rating: 'AAA', pctOfDeal: 0.18, baseSpreadBps: 55, baseWAL: 3.2 },
    { label: 'B', rating: 'AA', pctOfDeal: 0.08, baseSpreadBps: 80, baseWAL: 4.1 },
    { label: 'C', rating: 'A', pctOfDeal: 0.05, baseSpreadBps: 115, baseWAL: 4.5 },
    { label: 'D', rating: 'BBB', pctOfDeal: 0.03, baseSpreadBps: 175, baseWAL: 4.8 },
    { label: 'E', rating: 'BB', pctOfDeal: 0.01, baseSpreadBps: 310, baseWAL: 5.0 },
  ],
  'Student Loan ABS': [
    { label: 'A-1', rating: 'AAA', pctOfDeal: 0.40, baseSpreadBps: 55, baseWAL: 2.5 },
    { label: 'A-2', rating: 'AAA', pctOfDeal: 0.25, baseSpreadBps: 72, baseWAL: 5.0 },
    { label: 'B', rating: 'AA', pctOfDeal: 0.15, baseSpreadBps: 105, baseWAL: 6.5 },
    { label: 'C', rating: 'A', pctOfDeal: 0.10, baseSpreadBps: 155, baseWAL: 7.8 },
    { label: 'D', rating: 'BBB', pctOfDeal: 0.07, baseSpreadBps: 235, baseWAL: 9.0 },
    { label: 'E', rating: 'BB', pctOfDeal: 0.03, baseSpreadBps: 420, baseWAL: 10.2 },
  ],
  'Credit Card ABS': [
    { label: 'A', rating: 'AAA', pctOfDeal: 0.82, baseSpreadBps: 35, baseWAL: 3.0 },
    { label: 'B', rating: 'AA', pctOfDeal: 0.08, baseSpreadBps: 58, baseWAL: 3.0 },
    { label: 'C', rating: 'A', pctOfDeal: 0.05, baseSpreadBps: 90, baseWAL: 3.0 },
    { label: 'D', rating: 'BBB', pctOfDeal: 0.03, baseSpreadBps: 145, baseWAL: 3.0 },
    { label: 'E', rating: 'BB', pctOfDeal: 0.02, baseSpreadBps: 260, baseWAL: 3.0 },
  ],
  'CLO': [
    { label: 'A-1', rating: 'AAA', pctOfDeal: 0.62, baseSpreadBps: 140, baseWAL: 4.8 },
    { label: 'A-2', rating: 'AA', pctOfDeal: 0.12, baseSpreadBps: 200, baseWAL: 6.2 },
    { label: 'B', rating: 'A', pctOfDeal: 0.08, baseSpreadBps: 275, baseWAL: 7.5 },
    { label: 'C', rating: 'BBB', pctOfDeal: 0.06, baseSpreadBps: 440, baseWAL: 8.8 },
    { label: 'D', rating: 'BB', pctOfDeal: 0.04, baseSpreadBps: 790, baseWAL: 9.5 },
  ],
  'CMBS': [
    { label: 'A-1', rating: 'AAA', pctOfDeal: 0.30, baseSpreadBps: 68, baseWAL: 3.2 },
    { label: 'A-2', rating: 'AAA', pctOfDeal: 0.25, baseSpreadBps: 92, baseWAL: 7.5 },
    { label: 'A-SB', rating: 'AAA', pctOfDeal: 0.08, baseSpreadBps: 78, baseWAL: 4.8 },
    { label: 'B', rating: 'AA-', pctOfDeal: 0.10, baseSpreadBps: 130, baseWAL: 9.8 },
    { label: 'C', rating: 'A-', pctOfDeal: 0.08, baseSpreadBps: 185, baseWAL: 9.9 },
    { label: 'D', rating: 'BBB-', pctOfDeal: 0.06, baseSpreadBps: 310, baseWAL: 9.9 },
    { label: 'E', rating: 'BB-', pctOfDeal: 0.04, baseSpreadBps: 550, baseWAL: 9.9 },
  ],
  'RMBS Agency': [
    { label: 'M-1', rating: 'BBB+', pctOfDeal: 0.35, baseSpreadBps: 160, baseWAL: 4.2 },
    { label: 'M-2', rating: 'BBB-', pctOfDeal: 0.25, baseSpreadBps: 240, baseWAL: 4.2 },
    { label: 'B-1', rating: 'BB+', pctOfDeal: 0.20, baseSpreadBps: 425, baseWAL: 4.2 },
    { label: 'B-2', rating: 'BB-', pctOfDeal: 0.15, baseSpreadBps: 750, baseWAL: 4.2 },
  ],
  'RMBS Non-Agency': [
    { label: 'A-1', rating: 'AAA', pctOfDeal: 0.55, baseSpreadBps: 85, baseWAL: 3.8 },
    { label: 'A-2', rating: 'AAA', pctOfDeal: 0.15, baseSpreadBps: 105, baseWAL: 5.2 },
    { label: 'B', rating: 'AA', pctOfDeal: 0.10, baseSpreadBps: 150, baseWAL: 6.5 },
    { label: 'C', rating: 'A', pctOfDeal: 0.08, baseSpreadBps: 210, baseWAL: 7.2 },
    { label: 'D', rating: 'BBB', pctOfDeal: 0.06, baseSpreadBps: 325, baseWAL: 8.0 },
    { label: 'E', rating: 'BB', pctOfDeal: 0.04, baseSpreadBps: 525, baseWAL: 8.5 },
  ],
};

// ── Helpers ──

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round0(v: number): number { return Math.round(v); }
function round1(v: number): number { return Math.round(v * 10) / 10; }
function round2(v: number): number { return Math.round(v * 100) / 100; }

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pickLeadManagers(base: string[], rng: () => number): string[] {
  // Start with base managers, possibly swap or add one
  const result = [...base];
  if (rng() < 0.3) {
    const extra = LEAD_BANKS.filter(b => !result.includes(b));
    if (extra.length > 0) result.push(pick(extra, rng));
  }
  return result;
}

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('securitization-pipeline-' + day));

  const statuses: ('announced' | 'pricing' | 'priced' | 'settled')[] = ['announced', 'pricing', 'priced', 'settled'];

  // Year suffix for deal names
  const year = new Date().getFullYear();

  // Generate 25 deals from templates
  const shuffled = [...DEAL_TEMPLATES].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 25);

  const deals = selected.map((tmpl, idx) => {
    const seriesNum = Math.floor(rng() * 4) + 1;
    const suffixParts: string[] = [];

    // Build a realistic deal name suffix
    if (tmpl.type === 'CMBS') {
      // CMBS uses letter suffixes: C35, C36, etc.
      const letterNum = 30 + Math.floor(rng() * 10);
      suffixParts.push(`C${letterNum}`);
    } else if (tmpl.type === 'RMBS Agency') {
      // Agency CRT uses descriptive: DNA3, HQA2, etc.
      const crtSuffixes = ['DNA', 'HQA', 'SPI'];
      suffixParts.push(`${pick(crtSuffixes, rng)}${seriesNum}`);
    } else {
      suffixParts.push(`${seriesNum}`);
    }

    const dealName = `${tmpl.dealPrefix} ${year}-${suffixParts[0]}`;

    // Status distribution: more announced/pricing than settled
    const statusWeights = [0.30, 0.25, 0.30, 0.15]; // announced, pricing, priced, settled
    let statusRoll = rng();
    let statusIdx = 0;
    let cumulative = 0;
    for (let i = 0; i < statusWeights.length; i++) {
      cumulative += statusWeights[i];
      if (statusRoll < cumulative) { statusIdx = i; break; }
    }
    const status = statuses[statusIdx];

    // Deal size with jitter
    const sizeMM = round0(jitter(tmpl.baseSizeMM, 0.15, rng));

    // Pricing and settlement dates based on status
    let pricingDate: string | null = null;
    let settlementDate: string | null = null;
    const daysFromNow = Math.floor(rng() * 21) - 7; // -7 to +14 days

    if (status === 'announced') {
      pricingDate = dateOffset(3 + Math.floor(rng() * 10));
      settlementDate = null;
    } else if (status === 'pricing') {
      pricingDate = dateOffset(Math.floor(rng() * 3));
      settlementDate = dateOffset(3 + Math.floor(rng() * 5));
    } else if (status === 'priced') {
      pricingDate = dateOffset(-Math.floor(rng() * 5));
      settlementDate = dateOffset(1 + Math.floor(rng() * 5));
    } else {
      pricingDate = dateOffset(-5 - Math.floor(rng() * 10));
      settlementDate = dateOffset(-Math.floor(rng() * 3));
    }

    // Generate tranche structure
    const trancheTemplates = TRANCHE_STRUCTURES[tmpl.type] || TRANCHE_STRUCTURES['RMBS Non-Agency'];
    const tranches = trancheTemplates.map(tt => {
      const trancheSize = round0(sizeMM * tt.pctOfDeal);
      const spreadBps = round0(jitter(tt.baseSpreadBps, 0.08, rng));
      const wal = round1(jitter(tt.baseWAL, 0.05, rng));

      return {
        label: tt.label,
        rating: tt.rating,
        sizeMM: trancheSize,
        spreadBps,
        benchmark: tmpl.benchmark,
        wal,
      };
    });

    // Collateral metrics with jitter
    const collateral: Record<string, number> = {};
    if (tmpl.collateral.avgFICO) collateral.avgFICO = round0(jitter(tmpl.collateral.avgFICO, 0.02, rng));
    if (tmpl.collateral.avgLTV) collateral.avgLTV = round1(jitter(tmpl.collateral.avgLTV, 0.04, rng));
    if (tmpl.collateral.avgDTI) collateral.avgDTI = round1(jitter(tmpl.collateral.avgDTI, 0.05, rng));
    if (tmpl.collateral.avgBalance) collateral.avgBalance = round0(jitter(tmpl.collateral.avgBalance, 0.06, rng));
    if (tmpl.collateral.occupancy) collateral.occupancyPct = round1(jitter(tmpl.collateral.occupancy, 0.02, rng));
    if (tmpl.collateral.dscr) collateral.dscr = round2(jitter(tmpl.collateral.dscr, 0.05, rng));

    return {
      dealName,
      issuer: tmpl.issuer,
      type: tmpl.type,
      sizeMM,
      status,
      pricingDate,
      settlementDate,
      benchmark: tmpl.benchmark,
      leadManagers: pickLeadManagers(tmpl.leadManagers, rng),
      tranches,
      collateral,
    };
  });

  // ── Pipeline Summary ──

  const typeGroups: Record<string, typeof deals> = {};
  for (const d of deals) {
    if (!typeGroups[d.type]) typeGroups[d.type] = [];
    typeGroups[d.type].push(d);
  }

  const volumeByType = Object.entries(typeGroups).map(([type, group]) => {
    const totalVolume = group.reduce((sum, d) => sum + d.sizeMM, 0);
    const dealCount = group.length;
    return { type, totalVolumeMM: totalVolume, dealCount };
  }).sort((a, b) => b.totalVolumeMM - a.totalVolumeMM);

  // This week vs last week issuance (simulated)
  const totalPipelineVolume = deals.reduce((sum, d) => sum + d.sizeMM, 0);
  const thisWeekVolumeMM = round0(jitter(totalPipelineVolume * 0.35, 0.10, rng));
  const lastWeekVolumeMM = round0(jitter(totalPipelineVolume * 0.30, 0.12, rng));
  const weekOverWeekChangePct = round1(((thisWeekVolumeMM - lastWeekVolumeMM) / lastWeekVolumeMM) * 100);

  // YTD issuance by broad category
  const ytdIssuance = [
    { category: 'Auto ABS', ytdVolumeBN: round1(jitter(85.2, 0.06, rng)), priorYearYtdBN: round1(jitter(78.5, 0.04, rng)) },
    { category: 'Student Loan ABS', ytdVolumeBN: round1(jitter(18.4, 0.08, rng)), priorYearYtdBN: round1(jitter(16.2, 0.04, rng)) },
    { category: 'Credit Card ABS', ytdVolumeBN: round1(jitter(42.8, 0.06, rng)), priorYearYtdBN: round1(jitter(39.1, 0.04, rng)) },
    { category: 'CLO', ytdVolumeBN: round1(jitter(92.5, 0.07, rng)), priorYearYtdBN: round1(jitter(81.3, 0.04, rng)) },
    { category: 'CMBS', ytdVolumeBN: round1(jitter(38.6, 0.08, rng)), priorYearYtdBN: round1(jitter(42.1, 0.04, rng)) },
    { category: 'RMBS', ytdVolumeBN: round1(jitter(55.3, 0.07, rng)), priorYearYtdBN: round1(jitter(48.9, 0.04, rng)) },
  ].map(entry => ({
    ...entry,
    yoyChangePct: round1(((entry.ytdVolumeBN - entry.priorYearYtdBN) / entry.priorYearYtdBN) * 100),
  }));

  const summary = {
    totalPipelineVolumeMM: totalPipelineVolume,
    totalDealCount: deals.length,
    volumeByType,
    thisWeekVolumeMM,
    lastWeekVolumeMM,
    weekOverWeekChangePct,
    ytdIssuance,
  };

  // ── Spread Trends ──

  interface SpreadTrendSector {
    sector: string;
    tranche: string;
    currentBps: number;
    oneMonthAgoBps: number;
    threeMonthsAgoBps: number;
    changeVs1M: number;
    changeVs3M: number;
  }

  const spreadSectors = [
    { sector: 'Auto ABS', tranche: 'AAA (A-2)', baseCurrent: 42 },
    { sector: 'Auto ABS', tranche: 'BBB', baseCurrent: 175 },
    { sector: 'Student Loan ABS', tranche: 'AAA', baseCurrent: 62 },
    { sector: 'Credit Card ABS', tranche: 'AAA', baseCurrent: 35 },
    { sector: 'Credit Card ABS', tranche: 'BBB', baseCurrent: 145 },
    { sector: 'CLO', tranche: 'AAA', baseCurrent: 140 },
    { sector: 'CLO', tranche: 'BBB', baseCurrent: 440 },
    { sector: 'CLO', tranche: 'BB', baseCurrent: 790 },
    { sector: 'CMBS Conduit', tranche: 'AAA (A-2)', baseCurrent: 92 },
    { sector: 'CMBS Conduit', tranche: 'BBB-', baseCurrent: 310 },
    { sector: 'RMBS Non-Agency', tranche: 'AAA', baseCurrent: 90 },
    { sector: 'RMBS Non-Agency', tranche: 'BBB', baseCurrent: 325 },
    { sector: 'RMBS Agency CRT', tranche: 'M-1 (BBB+)', baseCurrent: 160 },
    { sector: 'RMBS Agency CRT', tranche: 'B-1 (BB+)', baseCurrent: 425 },
  ];

  const spreadTrends: SpreadTrendSector[] = spreadSectors.map(ss => {
    const currentBps = round0(jitter(ss.baseCurrent, 0.06, rng));
    // Spreads generally tightened over recent months
    const drift1M = round0((rng() - 0.4) * ss.baseCurrent * 0.08);
    const drift3M = round0((rng() - 0.35) * ss.baseCurrent * 0.15);
    const oneMonthAgoBps = currentBps + drift1M;
    const threeMonthsAgoBps = currentBps + drift3M;

    return {
      sector: ss.sector,
      tranche: ss.tranche,
      currentBps,
      oneMonthAgoBps,
      threeMonthsAgoBps,
      changeVs1M: currentBps - oneMonthAgoBps,
      changeVs3M: currentBps - threeMonthsAgoBps,
    };
  });

  // ── Calendar: deals expected to price this week ──

  const thisWeekDeals = deals.filter(d =>
    d.status === 'announced' || d.status === 'pricing'
  );
  // Pick up to 8 deals for the weekly calendar
  const calendarDeals = thisWeekDeals.slice(0, 8).map(d => ({
    dealName: d.dealName,
    issuer: d.issuer,
    type: d.type,
    sizeMM: d.sizeMM,
    expectedPricingDate: d.pricingDate,
    status: d.status,
    leadManagers: d.leadManagers,
    benchmark: d.benchmark,
    aaaGuidanceBps: d.tranches.length > 0
      ? `${d.tranches[0].spreadBps - 3}–${d.tranches[0].spreadBps + 5}`
      : null,
  }));

  return {
    deals,
    summary,
    spreadTrends,
    calendar: calendarDeals,
    timestamp: new Date().toISOString(),
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
    console.error('[SecuritizationPipeline] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate securitization pipeline data' });
  }
});

export default router;
