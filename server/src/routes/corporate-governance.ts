import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface BoardComposition {
  boardSize: number;
  independentDirectors: number;
  avgTenureYears: number;
  avgAge: number;
  femalePct: number;
  minorityPct: number;
  auditChair: string;
  compensationChair: string;
  nominatingChair: string;
}

interface GovernanceScorecard {
  company: string;
  ticker: string;
  sector: string;
  overallScore: number;
  boardIndependencePct: number;
  boardDiversityPct: number;
  ceoDuality: boolean;
  poisonPill: boolean;
  staggeredBoard: boolean;
  shareholderRightsScore: number;
  board: BoardComposition;
}

interface ExecutiveCompensation {
  company: string;
  ticker: string;
  ceoName: string;
  baseSalary: number;
  bonus: number;
  stockAwards: number;
  optionAwards: number;
  otherComp: number;
  totalComp: number;
  payRatio: number;
}

interface GovernanceControversy {
  date: string;
  company: string;
  ticker: string;
  type: string;
  description: string;
  stockImpactPct: number;
}

interface AntiTakeoverProvision {
  provision: string;
  description: string;
  prevalencePct: number;
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
}

interface GovernanceTrend {
  year: number;
  avgBoardIndependencePct: number;
  femaleBoardRepresentationPct: number;
  avgCeoPayRatio: number;
  sayOnPayApprovalPct: number;
}

interface CorporateGovernanceResponse {
  scoreboard: GovernanceScorecard[];
  executiveCompensation: ExecutiveCompensation[];
  controversies: GovernanceControversy[];
  antiTakeoverProvisions: AntiTakeoverProvision[];
  governanceTrends: GovernanceTrend[];
  timestamp: string;
}

// ── Seed Data ──

interface CompanySeed {
  company: string;
  ticker: string;
  sector: string;
  baseScore: number;
  baseIndependencePct: number;
  baseDiversityPct: number;
  ceoDuality: boolean;
  poisonPill: boolean;
  staggeredBoard: boolean;
  baseShareholderRights: number;
  baseBoardSize: number;
  ceoName: string;
  baseBaseSalary: number;
  baseBonus: number;
  baseStockAwards: number;
  baseOptionAwards: number;
  baseOtherComp: number;
  basePayRatio: number;
}

const COMPANY_SEEDS: CompanySeed[] = [
  { company: 'Apple Inc', ticker: 'AAPL', sector: 'Technology', baseScore: 82, baseIndependencePct: 87.5, baseDiversityPct: 50.0, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 85, baseBoardSize: 8, ceoName: 'Tim Cook', baseBaseSalary: 3_000_000, baseBonus: 12_000_000, baseStockAwards: 75_000_000, baseOptionAwards: 0, baseOtherComp: 1_400_000, basePayRatio: 1447 },
  { company: 'Microsoft Corp', ticker: 'MSFT', sector: 'Technology', baseScore: 88, baseIndependencePct: 91.7, baseDiversityPct: 41.7, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 90, baseBoardSize: 12, ceoName: 'Satya Nadella', baseBaseSalary: 2_500_000, baseBonus: 10_700_000, baseStockAwards: 39_300_000, baseOptionAwards: 0, baseOtherComp: 170_000, basePayRatio: 289 },
  { company: 'Alphabet Inc', ticker: 'GOOGL', sector: 'Technology', baseScore: 58, baseIndependencePct: 72.7, baseDiversityPct: 36.4, ceoDuality: true, poisonPill: false, staggeredBoard: false, baseShareholderRights: 45, baseBoardSize: 11, ceoName: 'Sundar Pichai', baseBaseSalary: 2_000_000, baseBonus: 0, baseStockAwards: 218_000_000, baseOptionAwards: 0, baseOtherComp: 5_900_000, basePayRatio: 808 },
  { company: 'Amazon.com Inc', ticker: 'AMZN', sector: 'Consumer Discretionary', baseScore: 64, baseIndependencePct: 80.0, baseDiversityPct: 40.0, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 55, baseBoardSize: 10, ceoName: 'Andy Jassy', baseBaseSalary: 317_000, baseBonus: 0, baseStockAwards: 212_700_000, baseOptionAwards: 0, baseOtherComp: 1_600_000, basePayRatio: 6474 },
  { company: 'Meta Platforms Inc', ticker: 'META', sector: 'Technology', baseScore: 42, baseIndependencePct: 77.8, baseDiversityPct: 33.3, ceoDuality: true, poisonPill: false, staggeredBoard: true, baseShareholderRights: 30, baseBoardSize: 9, ceoName: 'Mark Zuckerberg', baseBaseSalary: 1, baseBonus: 0, baseStockAwards: 24_400_000, baseOptionAwards: 0, baseOtherComp: 27_100_000, basePayRatio: 201 },
  { company: 'JPMorgan Chase & Co', ticker: 'JPM', sector: 'Financials', baseScore: 78, baseIndependencePct: 90.9, baseDiversityPct: 45.5, ceoDuality: true, poisonPill: false, staggeredBoard: false, baseShareholderRights: 72, baseBoardSize: 11, ceoName: 'Jamie Dimon', baseBaseSalary: 1_500_000, baseBonus: 5_500_000, baseStockAwards: 28_000_000, baseOptionAwards: 0, baseOtherComp: 620_000, basePayRatio: 399 },
  { company: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare', baseScore: 85, baseIndependencePct: 92.3, baseDiversityPct: 46.2, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 88, baseBoardSize: 13, ceoName: 'Joaquin Duato', baseBaseSalary: 1_600_000, baseBonus: 3_600_000, baseStockAwards: 15_800_000, baseOptionAwards: 2_300_000, baseOtherComp: 340_000, basePayRatio: 256 },
  { company: 'Berkshire Hathaway', ticker: 'BRK.B', sector: 'Financials', baseScore: 35, baseIndependencePct: 71.4, baseDiversityPct: 21.4, ceoDuality: true, poisonPill: false, staggeredBoard: true, baseShareholderRights: 25, baseBoardSize: 14, ceoName: 'Warren Buffett', baseBaseSalary: 100_000, baseBonus: 0, baseStockAwards: 0, baseOptionAwards: 0, baseOtherComp: 300_000, basePayRatio: 4 },
  { company: 'NVIDIA Corp', ticker: 'NVDA', sector: 'Technology', baseScore: 76, baseIndependencePct: 84.6, baseDiversityPct: 38.5, ceoDuality: true, poisonPill: false, staggeredBoard: false, baseShareholderRights: 68, baseBoardSize: 13, ceoName: 'Jensen Huang', baseBaseSalary: 996_000, baseBonus: 3_800_000, baseStockAwards: 28_700_000, baseOptionAwards: 0, baseOtherComp: 690_000, basePayRatio: 234 },
  { company: 'UnitedHealth Group', ticker: 'UNH', sector: 'Healthcare', baseScore: 80, baseIndependencePct: 91.7, baseDiversityPct: 41.7, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 82, baseBoardSize: 12, ceoName: 'Andrew Witty', baseBaseSalary: 1_500_000, baseBonus: 5_200_000, baseStockAwards: 16_900_000, baseOptionAwards: 0, baseOtherComp: 360_000, basePayRatio: 332 },
  { company: 'ExxonMobil Corp', ticker: 'XOM', sector: 'Energy', baseScore: 72, baseIndependencePct: 90.0, baseDiversityPct: 30.0, ceoDuality: true, poisonPill: false, staggeredBoard: false, baseShareholderRights: 65, baseBoardSize: 10, ceoName: 'Darren Woods', baseBaseSalary: 1_920_000, baseBonus: 4_100_000, baseStockAwards: 22_500_000, baseOptionAwards: 6_100_000, baseOtherComp: 780_000, basePayRatio: 198 },
  { company: 'Visa Inc', ticker: 'V', sector: 'Financials', baseScore: 83, baseIndependencePct: 90.9, baseDiversityPct: 45.5, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 84, baseBoardSize: 11, ceoName: 'Ryan McInerney', baseBaseSalary: 1_250_000, baseBonus: 3_400_000, baseStockAwards: 16_200_000, baseOptionAwards: 0, baseOtherComp: 210_000, basePayRatio: 192 },
  { company: 'Procter & Gamble Co', ticker: 'PG', sector: 'Consumer Staples', baseScore: 86, baseIndependencePct: 91.7, baseDiversityPct: 50.0, ceoDuality: true, poisonPill: false, staggeredBoard: false, baseShareholderRights: 78, baseBoardSize: 12, ceoName: 'Jon Moeller', baseBaseSalary: 1_700_000, baseBonus: 4_500_000, baseStockAwards: 12_800_000, baseOptionAwards: 3_200_000, baseOtherComp: 480_000, basePayRatio: 284 },
  { company: 'Tesla Inc', ticker: 'TSLA', sector: 'Consumer Discretionary', baseScore: 30, baseIndependencePct: 62.5, baseDiversityPct: 25.0, ceoDuality: false, poisonPill: false, staggeredBoard: true, baseShareholderRights: 20, baseBoardSize: 8, ceoName: 'Elon Musk', baseBaseSalary: 0, baseBonus: 0, baseStockAwards: 0, baseOptionAwards: 0, baseOtherComp: 2_400_000, basePayRatio: 1 },
  { company: 'Walmart Inc', ticker: 'WMT', sector: 'Consumer Staples', baseScore: 74, baseIndependencePct: 85.7, baseDiversityPct: 42.9, ceoDuality: false, poisonPill: false, staggeredBoard: false, baseShareholderRights: 70, baseBoardSize: 14, ceoName: 'Doug McMillon', baseBaseSalary: 1_300_000, baseBonus: 7_200_000, baseStockAwards: 14_600_000, baseOptionAwards: 0, baseOtherComp: 1_200_000, basePayRatio: 933 },
];

// ── Board member name pools ──

const BOARD_CHAIR_NAMES = [
  'Patricia Chen', 'Robert Williams', 'Sarah Thompson', 'Michael O\'Brien',
  'Jennifer Martinez', 'David Kumar', 'Emily Jackson', 'James Anderson',
  'Karen Mitchell', 'Thomas Wright', 'Linda Park', 'Steven Goldberg',
  'Margaret Collins', 'Richard Patel', 'Susan Rodriguez', 'Charles Kim',
  'Barbara Lee', 'William Foster', 'Nancy Green', 'Daniel Murphy',
];

// ── Controversy templates ──

interface ControversySeed {
  daysAgo: number;
  company: string;
  ticker: string;
  type: string;
  description: string;
  baseImpactPct: number;
}

const CONTROVERSY_SEEDS: ControversySeed[] = [
  { daysAgo: 5, company: 'Tesla Inc', ticker: 'TSLA', type: 'PROXY_FIGHT', description: 'Institutional investors challenge board independence; ISS recommends withhold votes on three directors', baseImpactPct: -2.8 },
  { daysAgo: 12, company: 'Meta Platforms Inc', ticker: 'META', type: 'SHAREHOLDER_PROPOSAL', description: 'Shareholder proposal to separate Chair/CEO roles receives 42% support, highest ever for Meta', baseImpactPct: -0.6 },
  { daysAgo: 18, company: 'ExxonMobil Corp', ticker: 'XOM', type: 'SHAREHOLDER_PROPOSAL', description: 'Climate-related disclosure proposal passes with 62% vote; board pledges enhanced ESG reporting', baseImpactPct: 0.4 },
  { daysAgo: 25, company: 'Alphabet Inc', ticker: 'GOOGL', type: 'SEC_INVESTIGATION', description: 'SEC opens inquiry into related-party transactions involving board member private investments', baseImpactPct: -3.2 },
  { daysAgo: 32, company: 'JPMorgan Chase & Co', ticker: 'JPM', type: 'BOARD_SHAKE_UP', description: 'Three long-tenured directors announce retirement; board adds two tech and one cybersecurity expert', baseImpactPct: 1.2 },
  { daysAgo: 41, company: 'Amazon.com Inc', ticker: 'AMZN', type: 'RESTATEMENT', description: 'Restated Q3 earnings due to lease accounting reclassification; immaterial dollar impact', baseImpactPct: -1.5 },
  { daysAgo: 55, company: 'Berkshire Hathaway', ticker: 'BRK.B', type: 'PROXY_FIGHT', description: 'Activist group calls for succession plan disclosure and independent chairman after Buffett', baseImpactPct: -0.3 },
  { daysAgo: 68, company: 'NVIDIA Corp', ticker: 'NVDA', type: 'SEC_INVESTIGATION', description: 'SEC reviews executive stock sale timing relative to AI chip demand announcements', baseImpactPct: -4.1 },
  { daysAgo: 80, company: 'Procter & Gamble Co', ticker: 'PG', type: 'SHAREHOLDER_PROPOSAL', description: 'Proposal to require independent board chair fails with 38% support but gains momentum', baseImpactPct: -0.2 },
  { daysAgo: 95, company: 'Walmart Inc', ticker: 'WMT', type: 'BOARD_SHAKE_UP', description: 'Walton family reduces board representation from 3 to 2 seats; adds independent supply-chain expert', baseImpactPct: 0.8 },
];

// ── Anti-takeover provision seeds ──

interface ProvisionSeed {
  provision: string;
  description: string;
  basePrevalencePct: number;
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
}

const PROVISION_SEEDS: ProvisionSeed[] = [
  { provision: 'Classified Board', description: 'Directors divided into classes serving staggered multi-year terms, making hostile takeovers more difficult', basePrevalencePct: 32.4, trendDirection: 'DECREASING' },
  { provision: 'Supermajority Voting', description: 'Requires more than simple majority (typically 67-80%) to approve mergers or charter amendments', basePrevalencePct: 48.7, trendDirection: 'DECREASING' },
  { provision: 'Dual-Class Shares', description: 'Multiple share classes with unequal voting rights, concentrating control with founders or insiders', basePrevalencePct: 7.2, trendDirection: 'INCREASING' },
  { provision: 'Golden Parachutes', description: 'Lucrative compensation packages triggered upon change of control, raising acquisition costs', basePrevalencePct: 82.1, trendDirection: 'STABLE' },
  { provision: 'Poison Pill (Rights Plan)', description: 'Shareholder rights plan that dilutes hostile acquirer stake when ownership threshold is breached', basePrevalencePct: 4.8, trendDirection: 'DECREASING' },
  { provision: 'Blank Check Preferred Stock', description: 'Board authorized to issue preferred stock with terms set at discretion, usable as takeover defense', basePrevalencePct: 88.5, trendDirection: 'STABLE' },
  { provision: 'No-Action Clause', description: 'Restricts shareholders from calling special meetings or acting by written consent', basePrevalencePct: 42.3, trendDirection: 'DECREASING' },
  { provision: 'Fair Price Provision', description: 'Requires acquirer to pay all shareholders the same price, preventing two-tiered coercive bids', basePrevalencePct: 15.6, trendDirection: 'STABLE' },
];

// ── Governance trend base data (5-year) ──

interface TrendSeed {
  year: number;
  baseIndependence: number;
  baseFemaleRep: number;
  baseCeoPayRatio: number;
  baseSayOnPay: number;
}

const TREND_SEEDS: TrendSeed[] = [
  { year: 2021, baseIndependence: 78.2, baseFemaleRep: 28.4, baseCeoPayRatio: 324, baseSayOnPay: 90.2 },
  { year: 2022, baseIndependence: 80.1, baseFemaleRep: 30.8, baseCeoPayRatio: 351, baseSayOnPay: 89.5 },
  { year: 2023, baseIndependence: 82.4, baseFemaleRep: 32.5, baseCeoPayRatio: 368, baseSayOnPay: 88.8 },
  { year: 2024, baseIndependence: 84.0, baseFemaleRep: 34.1, baseCeoPayRatio: 385, baseSayOnPay: 88.1 },
  { year: 2025, baseIndependence: 85.3, baseFemaleRep: 35.6, baseCeoPayRatio: 402, baseSayOnPay: 87.6 },
];

// ── Data generation ──

function generateScoreboard(rng: () => number): GovernanceScorecard[] {
  return COMPANY_SEEDS.map((seed) => {
    const scoreJitter = Math.floor((rng() - 0.5) * 8);
    const overallScore = Math.max(0, Math.min(100, seed.baseScore + scoreJitter));

    const indJitter = (rng() - 0.5) * 4;
    const boardIndependencePct = Math.round(Math.max(50, Math.min(100, seed.baseIndependencePct + indJitter)) * 10) / 10;

    const divJitter = (rng() - 0.5) * 6;
    const boardDiversityPct = Math.round(Math.max(10, Math.min(60, seed.baseDiversityPct + divJitter)) * 10) / 10;

    const srJitter = Math.floor((rng() - 0.5) * 10);
    const shareholderRightsScore = Math.max(0, Math.min(100, seed.baseShareholderRights + srJitter));

    // Board composition
    const boardSizeJitter = rng() > 0.8 ? 1 : rng() < 0.2 ? -1 : 0;
    const boardSize = Math.max(7, seed.baseBoardSize + boardSizeJitter);
    const independentDirectors = Math.round(boardSize * boardIndependencePct / 100);

    const tenureJitter = (rng() - 0.5) * 3;
    const avgTenureYears = Math.round(Math.max(2, 7.5 + tenureJitter) * 10) / 10;

    const ageJitter = (rng() - 0.5) * 4;
    const avgAge = Math.round(Math.max(50, 62 + ageJitter) * 10) / 10;

    const femalePct = boardDiversityPct;
    const minorityJitter = (rng() - 0.5) * 8;
    const minorityPct = Math.round(Math.max(5, 22 + minorityJitter) * 10) / 10;

    // Committee chairs — pick deterministically from pool
    const chairIdx1 = Math.floor(rng() * BOARD_CHAIR_NAMES.length);
    const chairIdx2 = Math.floor(rng() * BOARD_CHAIR_NAMES.length);
    const chairIdx3 = Math.floor(rng() * BOARD_CHAIR_NAMES.length);

    const board: BoardComposition = {
      boardSize,
      independentDirectors,
      avgTenureYears,
      avgAge,
      femalePct,
      minorityPct,
      auditChair: BOARD_CHAIR_NAMES[chairIdx1],
      compensationChair: BOARD_CHAIR_NAMES[chairIdx2],
      nominatingChair: BOARD_CHAIR_NAMES[chairIdx3],
    };

    return {
      company: seed.company,
      ticker: seed.ticker,
      sector: seed.sector,
      overallScore,
      boardIndependencePct,
      boardDiversityPct,
      ceoDuality: seed.ceoDuality,
      poisonPill: seed.poisonPill,
      staggeredBoard: seed.staggeredBoard,
      shareholderRightsScore,
      board,
    };
  });
}

function generateExecutiveCompensation(rng: () => number): ExecutiveCompensation[] {
  // Sort by total comp descending and return top 5
  const allComp = COMPANY_SEEDS.map((seed) => {
    const salaryJitter = (rng() - 0.5) * seed.baseBaseSalary * 0.06;
    const baseSalary = Math.round(seed.baseBaseSalary + salaryJitter);

    const bonusJitter = (rng() - 0.5) * Math.max(seed.baseBonus, 1) * 0.12;
    const bonus = Math.max(0, Math.round(seed.baseBonus + bonusJitter));

    const stockJitter = (rng() - 0.5) * Math.max(seed.baseStockAwards, 1) * 0.10;
    const stockAwards = Math.max(0, Math.round(seed.baseStockAwards + stockJitter));

    const optionJitter = (rng() - 0.5) * Math.max(seed.baseOptionAwards, 1) * 0.10;
    const optionAwards = Math.max(0, Math.round(seed.baseOptionAwards + optionJitter));

    const otherJitter = (rng() - 0.5) * Math.max(seed.baseOtherComp, 1) * 0.15;
    const otherComp = Math.max(0, Math.round(seed.baseOtherComp + otherJitter));

    const totalComp = baseSalary + bonus + stockAwards + optionAwards + otherComp;

    const ratioJitter = Math.floor((rng() - 0.5) * seed.basePayRatio * 0.08);
    const payRatio = Math.max(1, seed.basePayRatio + ratioJitter);

    return {
      company: seed.company,
      ticker: seed.ticker,
      ceoName: seed.ceoName,
      baseSalary,
      bonus,
      stockAwards,
      optionAwards,
      otherComp,
      totalComp,
      payRatio,
    };
  });

  return allComp.sort((a, b) => b.totalComp - a.totalComp).slice(0, 5);
}

function generateControversies(rng: () => number): GovernanceControversy[] {
  const today = new Date();

  return CONTROVERSY_SEEDS.map((seed) => {
    const dayJitter = Math.floor((rng() - 0.5) * 4);
    const adjustedDays = Math.max(1, seed.daysAgo + dayJitter);

    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() - adjustedDays);
    const date = eventDate.toISOString().slice(0, 10);

    const impactJitter = (rng() - 0.5) * 1.5;
    const stockImpactPct = Math.round((seed.baseImpactPct + impactJitter) * 10) / 10;

    return {
      date,
      company: seed.company,
      ticker: seed.ticker,
      type: seed.type,
      description: seed.description,
      stockImpactPct,
    };
  });
}

function generateAntiTakeoverProvisions(rng: () => number): AntiTakeoverProvision[] {
  return PROVISION_SEEDS.map((seed) => {
    const prevJitter = (rng() - 0.5) * 4;
    const prevalencePct = Math.round(Math.max(1, Math.min(99, seed.basePrevalencePct + prevJitter)) * 10) / 10;

    return {
      provision: seed.provision,
      description: seed.description,
      prevalencePct,
      trendDirection: seed.trendDirection,
    };
  });
}

function generateGovernanceTrends(rng: () => number): GovernanceTrend[] {
  return TREND_SEEDS.map((seed) => {
    const indJitter = (rng() - 0.5) * 1.5;
    const avgBoardIndependencePct = Math.round((seed.baseIndependence + indJitter) * 10) / 10;

    const femJitter = (rng() - 0.5) * 1.2;
    const femaleBoardRepresentationPct = Math.round((seed.baseFemaleRep + femJitter) * 10) / 10;

    const payJitter = Math.floor((rng() - 0.5) * 20);
    const avgCeoPayRatio = seed.baseCeoPayRatio + payJitter;

    const sopJitter = (rng() - 0.5) * 1.0;
    const sayOnPayApprovalPct = Math.round(Math.max(80, Math.min(99, seed.baseSayOnPay + sopJitter)) * 10) / 10;

    return {
      year: seed.year,
      avgBoardIndependencePct,
      femaleBoardRepresentationPct,
      avgCeoPayRatio,
      sayOnPayApprovalPct,
    };
  });
}

function generateCorporateGovernanceData(): CorporateGovernanceResponse {
  const rng = seededRandom('corporate-governance');

  const scoreboard = generateScoreboard(rng);
  const executiveCompensation = generateExecutiveCompensation(rng);
  const controversies = generateControversies(rng);
  const antiTakeoverProvisions = generateAntiTakeoverProvisions(rng);
  const governanceTrends = generateGovernanceTrends(rng);

  return {
    scoreboard,
    executiveCompensation,
    controversies,
    antiTakeoverProvisions,
    governanceTrends,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache ──

let cache: { data: CorporateGovernanceResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateCorporateGovernanceData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CorporateGovernance] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate corporate governance data' });
  }
});

export default router;
