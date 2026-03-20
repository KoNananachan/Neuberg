import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface UpcomingMeeting {
  company: string;
  date: string;
  type: 'Annual' | 'Special';
  keyProposals: string[];
  managementRecommendation: 'FOR' | 'AGAINST' | 'NONE';
  issRecommendation: 'FOR' | 'AGAINST' | 'WITHHOLD';
  glassLewisRecommendation: 'FOR' | 'AGAINST' | 'WITHHOLD';
}

interface HotContest {
  company: string;
  activist: string;
  stakePct: number;
  demands: string[];
  boardResponse: 'Engaged' | 'Rejected' | 'Settlement Talks' | 'Proxy Fight';
}

interface VotingResult {
  company: string;
  proposal: string;
  forVotesPct: number;
  againstVotesPct: number;
  abstainPct: number;
  outcome: 'Passed' | 'Failed';
}

interface ESGProposal {
  company: string;
  topic: string;
  sponsor: string;
  currentSupportPct: number;
  priorYearSupportPct: number;
  yoyChange: number;
}

interface SayOnPay {
  company: string;
  ceoPay: number;
  approvalRate: number;
  issRecommendation: 'FOR' | 'AGAINST';
  glassLewisRecommendation: 'FOR' | 'AGAINST';
}

interface BoardMetrics {
  company: string;
  independencePct: number;
  diversityPct: number;
  avgTenure: number;
  avgAge: number;
  overboardedDirectors: number;
  boardSize: number;
}

interface CompensationTrend {
  sector: string;
  baseSalary: number;
  bonus: number;
  equityAward: number;
  totalComp: number;
  payRatio: number;
}

interface GovernanceScore {
  company: string;
  overallScore: number;
  boardScore: number;
  shareholderRightsScore: number;
  compensationScore: number;
  auditScore: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface ProxyVotingResponse {
  upcomingMeetings: UpcomingMeeting[];
  hotContests: HotContest[];
  votingResults: VotingResult[];
  esgProposals: ESGProposal[];
  sayOnPay: SayOnPay[];
  boardMetrics: BoardMetrics[];
  compensationTrends: CompensationTrend[];
  governanceScores: GovernanceScore[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: ProxyVotingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Upcoming meetings configuration ──

interface MeetingConfig {
  company: string;
  daysFromNow: number;
  type: 'Annual' | 'Special';
  keyProposals: string[];
  mgmtRec: 'FOR' | 'AGAINST' | 'NONE';
}

const MEETING_CONFIGS: MeetingConfig[] = [
  { company: 'Apple Inc.', daysFromNow: 12, type: 'Annual', keyProposals: ['Board Election', 'Executive Compensation', 'Auditor Ratification'], mgmtRec: 'FOR' },
  { company: 'ExxonMobil Corp.', daysFromNow: 18, type: 'Annual', keyProposals: ['Climate Transition Plan', 'Board Election', 'Lobbying Disclosure'], mgmtRec: 'AGAINST' },
  { company: 'JPMorgan Chase', daysFromNow: 25, type: 'Annual', keyProposals: ['Say-on-Pay', 'Board Election', 'Shareholder Right to Act by Written Consent'], mgmtRec: 'FOR' },
  { company: 'Tesla Inc.', daysFromNow: 8, type: 'Special', keyProposals: ['CEO Compensation Package', 'Reincorporation to Texas'], mgmtRec: 'FOR' },
  { company: 'Microsoft Corp.', daysFromNow: 32, type: 'Annual', keyProposals: ['Board Election', 'AI Ethics Report', 'Tax Transparency'], mgmtRec: 'FOR' },
  { company: 'Amazon.com Inc.', daysFromNow: 20, type: 'Annual', keyProposals: ['Worker Safety Audit', 'Board Election', 'Executive Compensation'], mgmtRec: 'AGAINST' },
  { company: 'Chevron Corp.', daysFromNow: 15, type: 'Annual', keyProposals: ['GHG Emission Targets', 'Board Election', 'Auditor Ratification'], mgmtRec: 'FOR' },
  { company: 'Walt Disney Co.', daysFromNow: 28, type: 'Annual', keyProposals: ['Board Election', 'Say-on-Pay', 'Political Spending Disclosure'], mgmtRec: 'FOR' },
];

// ── Hot contests configuration ──

interface ContestConfig {
  company: string;
  activist: string;
  baseStakePct: number;
  demands: string[];
  response: 'Engaged' | 'Rejected' | 'Settlement Talks' | 'Proxy Fight';
}

const CONTEST_CONFIGS: ContestConfig[] = [
  { company: 'Salesforce Inc.', activist: 'Elliott Investment Management', baseStakePct: 4.2, demands: ['Increase margins to 30%', 'Reduce M&A spending', 'Add 3 independent directors'], response: 'Settlement Talks' },
  { company: 'Norfolk Southern', activist: 'Ancora Holdings', baseStakePct: 3.8, demands: ['Replace CEO', 'Improve operating ratio', 'Strategic review of non-core assets'], response: 'Proxy Fight' },
  { company: 'Crown Holdings', activist: 'Carl Icahn', baseStakePct: 5.1, demands: ['Board seats for 2 nominees', 'Cost restructuring program'], response: 'Rejected' },
  { company: 'Kohl\'s Corp.', activist: 'Macellum Advisors', baseStakePct: 5.5, demands: ['Explore strategic alternatives', 'Add 4 new directors', 'Review capital allocation'], response: 'Proxy Fight' },
  { company: 'Illumina Inc.', activist: 'Starboard Value', baseStakePct: 2.9, demands: ['Divest GRAIL', 'Replace board chairman', 'Operational efficiency review'], response: 'Engaged' },
  { company: 'Match Group', activist: 'Trian Fund Management', baseStakePct: 4.7, demands: ['Accelerate Tinder turnaround', 'Margin improvement plan', 'Board refreshment'], response: 'Settlement Talks' },
];

// ── Voting results configuration ──

interface VotingResultConfig {
  company: string;
  proposal: string;
  baseForPct: number;
}

const VOTING_RESULT_CONFIGS: VotingResultConfig[] = [
  { company: 'Alphabet Inc.', proposal: 'Shareholder proposal on lobbying disclosure', baseForPct: 42.5 },
  { company: 'Meta Platforms', proposal: 'Eliminate dual-class share structure', baseForPct: 28.3 },
  { company: 'Johnson & Johnson', proposal: 'Board election - Lead independent director', baseForPct: 91.2 },
  { company: 'Pfizer Inc.', proposal: 'Say-on-Pay advisory vote', baseForPct: 72.8 },
  { company: 'Bank of America', proposal: 'Racial equity audit', baseForPct: 35.6 },
  { company: 'Procter & Gamble', proposal: 'Report on deforestation risks', baseForPct: 48.1 },
  { company: 'UnitedHealth Group', proposal: 'Auditor ratification (Deloitte)', baseForPct: 96.4 },
  { company: 'Visa Inc.', proposal: 'Amend proxy access threshold from 3% to 1%', baseForPct: 31.7 },
  { company: 'Coca-Cola Co.', proposal: 'Executive severance policy amendment', baseForPct: 55.2 },
  { company: 'Intel Corp.', proposal: 'Independent board chair requirement', baseForPct: 38.9 },
];

// ── ESG proposals configuration ──

interface ESGProposalConfig {
  company: string;
  topic: string;
  sponsor: string;
  baseSupportPct: number;
  priorYearSupportPct: number;
}

const ESG_PROPOSAL_CONFIGS: ESGProposalConfig[] = [
  { company: 'ExxonMobil Corp.', topic: 'Set Scope 3 GHG reduction targets', sponsor: 'Follow This', baseSupportPct: 36.2, priorYearSupportPct: 27.1 },
  { company: 'Amazon.com Inc.', topic: 'Report on packaging waste reduction', sponsor: 'As You Sow', baseSupportPct: 44.8, priorYearSupportPct: 38.5 },
  { company: 'JPMorgan Chase', topic: 'Adopt fossil fuel financing phase-out policy', sponsor: 'Sierra Club Foundation', baseSupportPct: 31.5, priorYearSupportPct: 28.9 },
  { company: 'McDonald\'s Corp.', topic: 'Report on antibiotic use in supply chain', sponsor: 'Investor Alliance', baseSupportPct: 29.7, priorYearSupportPct: 22.4 },
  { company: 'Apple Inc.', topic: 'Report on forced labor in supply chain', sponsor: 'National Legal and Policy Center', baseSupportPct: 33.1, priorYearSupportPct: 30.8 },
  { company: 'Berkshire Hathaway', topic: 'Annual sustainability report', sponsor: 'CalPERS', baseSupportPct: 26.4, priorYearSupportPct: 24.1 },
  { company: 'Chevron Corp.', topic: 'Report on methane emissions measurement', sponsor: 'Arjuna Capital', baseSupportPct: 52.3, priorYearSupportPct: 47.8 },
  { company: 'Wells Fargo', topic: 'Report on racial equity in lending', sponsor: 'SOC Investment Group', baseSupportPct: 41.6, priorYearSupportPct: 35.2 },
];

// ── Say-on-Pay configuration ──

interface SayOnPayConfig {
  company: string;
  baseCeoPay: number;
  baseApprovalRate: number;
}

const SAY_ON_PAY_CONFIGS: SayOnPayConfig[] = [
  { company: 'Apple Inc.', baseCeoPay: 63.2, baseApprovalRate: 64.2 },
  { company: 'JPMorgan Chase', baseCeoPay: 34.5, baseApprovalRate: 82.5 },
  { company: 'Tesla Inc.', baseCeoPay: 56.0, baseApprovalRate: 45.8 },
  { company: 'Goldman Sachs', baseCeoPay: 31.0, baseApprovalRate: 78.3 },
  { company: 'Microsoft Corp.', baseCeoPay: 48.5, baseApprovalRate: 88.1 },
  { company: 'Netflix Inc.', baseCeoPay: 51.2, baseApprovalRate: 58.7 },
  { company: 'Alphabet Inc.', baseCeoPay: 2.0, baseApprovalRate: 95.2 },
  { company: 'Intel Corp.', baseCeoPay: 26.3, baseApprovalRate: 51.4 },
  { company: 'Citigroup Inc.', baseCeoPay: 24.5, baseApprovalRate: 72.9 },
  { company: 'Nike Inc.', baseCeoPay: 32.8, baseApprovalRate: 69.4 },
];

// ── Board metrics configuration ──

interface BoardMetricsConfig {
  company: string;
  baseIndependencePct: number;
  baseDiversityPct: number;
  baseAvgTenure: number;
  baseAvgAge: number;
  baseOverboarded: number;
  boardSize: number;
}

const BOARD_METRICS_CONFIGS: BoardMetricsConfig[] = [
  { company: 'Apple Inc.', baseIndependencePct: 87.5, baseDiversityPct: 50.0, baseAvgTenure: 7.2, baseAvgAge: 61.4, baseOverboarded: 1, boardSize: 8 },
  { company: 'JPMorgan Chase', baseIndependencePct: 91.7, baseDiversityPct: 41.7, baseAvgTenure: 8.5, baseAvgAge: 63.1, baseOverboarded: 2, boardSize: 12 },
  { company: 'Microsoft Corp.', baseIndependencePct: 91.7, baseDiversityPct: 50.0, baseAvgTenure: 6.8, baseAvgAge: 59.8, baseOverboarded: 0, boardSize: 12 },
  { company: 'ExxonMobil Corp.', baseIndependencePct: 83.3, baseDiversityPct: 33.3, baseAvgTenure: 9.1, baseAvgAge: 64.7, baseOverboarded: 3, boardSize: 12 },
  { company: 'Amazon.com Inc.', baseIndependencePct: 80.0, baseDiversityPct: 40.0, baseAvgTenure: 5.4, baseAvgAge: 57.2, baseOverboarded: 1, boardSize: 10 },
  { company: 'Goldman Sachs', baseIndependencePct: 90.9, baseDiversityPct: 36.4, baseAvgTenure: 7.8, baseAvgAge: 62.5, baseOverboarded: 2, boardSize: 11 },
  { company: 'Tesla Inc.', baseIndependencePct: 71.4, baseDiversityPct: 28.6, baseAvgTenure: 6.1, baseAvgAge: 55.3, baseOverboarded: 2, boardSize: 7 },
  { company: 'Alphabet Inc.', baseIndependencePct: 81.8, baseDiversityPct: 36.4, baseAvgTenure: 8.3, baseAvgAge: 60.9, baseOverboarded: 1, boardSize: 11 },
];

// ── Compensation trends configuration ──

interface CompTrendConfig {
  sector: string;
  baseSalary: number;
  baseBonus: number;
  baseEquity: number;
  basePayRatio: number;
}

const COMP_TREND_CONFIGS: CompTrendConfig[] = [
  { sector: 'Technology', baseSalary: 1.35, baseBonus: 4.80, baseEquity: 22.50, basePayRatio: 256 },
  { sector: 'Financial Services', baseSalary: 1.50, baseBonus: 8.20, baseEquity: 18.30, basePayRatio: 312 },
  { sector: 'Healthcare', baseSalary: 1.40, baseBonus: 3.50, baseEquity: 14.80, basePayRatio: 198 },
  { sector: 'Energy', baseSalary: 1.55, baseBonus: 5.10, baseEquity: 12.60, basePayRatio: 175 },
  { sector: 'Consumer Discretionary', baseSalary: 1.30, baseBonus: 3.80, baseEquity: 11.20, basePayRatio: 204 },
  { sector: 'Industrials', baseSalary: 1.25, baseBonus: 3.20, baseEquity: 10.50, basePayRatio: 168 },
  { sector: 'Real Estate', baseSalary: 1.10, baseBonus: 2.80, baseEquity: 8.40, basePayRatio: 142 },
  { sector: 'Utilities', baseSalary: 1.20, baseBonus: 2.40, baseEquity: 7.80, basePayRatio: 118 },
];

// ── Governance scores configuration ──

interface GovScoreConfig {
  company: string;
  baseOverall: number;
  baseBoard: number;
  baseShareholder: number;
  baseCompensation: number;
  baseAudit: number;
}

const GOV_SCORE_CONFIGS: GovScoreConfig[] = [
  { company: 'Microsoft Corp.', baseOverall: 88, baseBoard: 92, baseShareholder: 85, baseCompensation: 84, baseAudit: 91 },
  { company: 'Apple Inc.', baseOverall: 82, baseBoard: 88, baseShareholder: 78, baseCompensation: 74, baseAudit: 89 },
  { company: 'JPMorgan Chase', baseOverall: 85, baseBoard: 90, baseShareholder: 82, baseCompensation: 80, baseAudit: 88 },
  { company: 'Alphabet Inc.', baseOverall: 62, baseBoard: 72, baseShareholder: 45, baseCompensation: 68, baseAudit: 82 },
  { company: 'Amazon.com Inc.', baseOverall: 68, baseBoard: 75, baseShareholder: 58, baseCompensation: 65, baseAudit: 80 },
  { company: 'Tesla Inc.', baseOverall: 48, baseBoard: 55, baseShareholder: 38, baseCompensation: 35, baseAudit: 72 },
  { company: 'ExxonMobil Corp.', baseOverall: 72, baseBoard: 80, baseShareholder: 70, baseCompensation: 62, baseAudit: 85 },
  { company: 'Goldman Sachs', baseOverall: 80, baseBoard: 86, baseShareholder: 76, baseCompensation: 75, baseAudit: 87 },
  { company: 'Meta Platforms', baseOverall: 55, baseBoard: 65, baseShareholder: 40, baseCompensation: 58, baseAudit: 78 },
  { company: 'Berkshire Hathaway', baseOverall: 58, baseBoard: 68, baseShareholder: 52, baseCompensation: 48, baseAudit: 75 },
];

// ── Data generation ──

function generateUpcomingMeetings(rng: () => number): UpcomingMeeting[] {
  const issOptions: ('FOR' | 'AGAINST' | 'WITHHOLD')[] = ['FOR', 'AGAINST', 'WITHHOLD'];
  const glOptions: ('FOR' | 'AGAINST' | 'WITHHOLD')[] = ['FOR', 'AGAINST', 'WITHHOLD'];

  const now = new Date();

  return MEETING_CONFIGS.map((cfg) => {
    const dayJitter = Math.floor((rng() - 0.5) * 6);
    const meetingDate = new Date(now);
    meetingDate.setDate(meetingDate.getDate() + cfg.daysFromNow + dayJitter);

    const issIdx = cfg.mgmtRec === 'FOR' ? (rng() > 0.3 ? 0 : 1) : (rng() > 0.5 ? 1 : 0);
    const glIdx = cfg.mgmtRec === 'FOR' ? (rng() > 0.25 ? 0 : Math.floor(rng() * 3)) : (rng() > 0.4 ? 1 : Math.floor(rng() * 3));

    return {
      company: cfg.company,
      date: meetingDate.toISOString().slice(0, 10),
      type: cfg.type,
      keyProposals: cfg.keyProposals,
      managementRecommendation: cfg.mgmtRec,
      issRecommendation: issOptions[issIdx],
      glassLewisRecommendation: glOptions[Math.min(glIdx, 2)],
    };
  });
}

function generateHotContests(rng: () => number): HotContest[] {
  return CONTEST_CONFIGS.map((cfg) => {
    const stakeJitter = (rng() - 0.5) * 1.5;
    const stakePct = Math.round((cfg.baseStakePct + stakeJitter) * 10) / 10;

    return {
      company: cfg.company,
      activist: cfg.activist,
      stakePct: Math.max(1.0, stakePct),
      demands: cfg.demands,
      boardResponse: cfg.response,
    };
  });
}

function generateVotingResults(rng: () => number): VotingResult[] {
  return VOTING_RESULT_CONFIGS.map((cfg) => {
    const forJitter = (rng() - 0.5) * 8;
    const rawFor = cfg.baseForPct + forJitter;
    const abstainPct = Math.round((1.5 + rng() * 4.5) * 10) / 10;
    const forVotesPct = Math.round(Math.max(5, Math.min(99, rawFor)) * 10) / 10;
    const againstVotesPct = Math.round((100 - forVotesPct - abstainPct) * 10) / 10;

    const outcome: 'Passed' | 'Failed' = forVotesPct > 50 ? 'Passed' : 'Failed';

    return {
      company: cfg.company,
      proposal: cfg.proposal,
      forVotesPct,
      againstVotesPct: Math.max(0, againstVotesPct),
      abstainPct,
      outcome,
    };
  });
}

function generateESGProposals(rng: () => number): ESGProposal[] {
  return ESG_PROPOSAL_CONFIGS.map((cfg) => {
    const supportJitter = (rng() - 0.5) * 6;
    const currentSupportPct = Math.round((cfg.baseSupportPct + supportJitter) * 10) / 10;
    const priorYearSupportPct = Math.round(cfg.priorYearSupportPct * 10) / 10;
    const yoyChange = Math.round((currentSupportPct - priorYearSupportPct) * 10) / 10;

    return {
      company: cfg.company,
      topic: cfg.topic,
      sponsor: cfg.sponsor,
      currentSupportPct,
      priorYearSupportPct,
      yoyChange,
    };
  });
}

function generateSayOnPay(rng: () => number): SayOnPay[] {
  return SAY_ON_PAY_CONFIGS.map((cfg) => {
    const payJitter = (rng() - 0.5) * cfg.baseCeoPay * 0.12;
    const ceoPay = Math.round((cfg.baseCeoPay + payJitter) * 10) / 10;

    const approvalJitter = (rng() - 0.5) * 8;
    const approvalRate = Math.round(Math.max(20, Math.min(99, cfg.baseApprovalRate + approvalJitter)) * 10) / 10;

    const issRec: 'FOR' | 'AGAINST' = approvalRate > 60 ? (rng() > 0.15 ? 'FOR' : 'AGAINST') : (rng() > 0.6 ? 'FOR' : 'AGAINST');
    const glRec: 'FOR' | 'AGAINST' = approvalRate > 55 ? (rng() > 0.2 ? 'FOR' : 'AGAINST') : (rng() > 0.5 ? 'FOR' : 'AGAINST');

    return {
      company: cfg.company,
      ceoPay,
      approvalRate,
      issRecommendation: issRec,
      glassLewisRecommendation: glRec,
    };
  });
}

function generateBoardMetrics(rng: () => number): BoardMetrics[] {
  return BOARD_METRICS_CONFIGS.map((cfg) => {
    const indJitter = (rng() - 0.5) * 6;
    const independencePct = Math.round(Math.max(50, Math.min(100, cfg.baseIndependencePct + indJitter)) * 10) / 10;

    const divJitter = (rng() - 0.5) * 8;
    const diversityPct = Math.round(Math.max(10, Math.min(70, cfg.baseDiversityPct + divJitter)) * 10) / 10;

    const tenureJitter = (rng() - 0.5) * 2;
    const avgTenure = Math.round((cfg.baseAvgTenure + tenureJitter) * 10) / 10;

    const ageJitter = (rng() - 0.5) * 3;
    const avgAge = Math.round((cfg.baseAvgAge + ageJitter) * 10) / 10;

    const overboardedJitter = Math.floor(rng() * 2);
    const overboardedDirectors = Math.max(0, cfg.baseOverboarded + (rng() > 0.5 ? overboardedJitter : -overboardedJitter));

    return {
      company: cfg.company,
      independencePct,
      diversityPct,
      avgTenure,
      avgAge,
      overboardedDirectors,
      boardSize: cfg.boardSize,
    };
  });
}

function generateCompensationTrends(rng: () => number): CompensationTrend[] {
  return COMP_TREND_CONFIGS.map((cfg) => {
    const salaryJitter = (rng() - 0.5) * 0.2;
    const baseSalary = Math.round((cfg.baseSalary + salaryJitter) * 100) / 100;

    const bonusJitter = (rng() - 0.5) * cfg.baseBonus * 0.15;
    const bonus = Math.round((cfg.baseBonus + bonusJitter) * 100) / 100;

    const equityJitter = (rng() - 0.5) * cfg.baseEquity * 0.12;
    const equityAward = Math.round((cfg.baseEquity + equityJitter) * 100) / 100;

    const totalComp = Math.round((baseSalary + bonus + equityAward) * 100) / 100;

    const ratioJitter = Math.floor((rng() - 0.5) * cfg.basePayRatio * 0.15);
    const payRatio = Math.max(50, cfg.basePayRatio + ratioJitter);

    return {
      sector: cfg.sector,
      baseSalary,
      bonus,
      equityAward,
      totalComp,
      payRatio,
    };
  });
}

function generateGovernanceScores(rng: () => number): GovernanceScore[] {
  return GOV_SCORE_CONFIGS.map((cfg) => {
    const jitter = () => Math.floor((rng() - 0.5) * 8);

    const overallScore = Math.max(10, Math.min(100, cfg.baseOverall + jitter()));
    const boardScore = Math.max(10, Math.min(100, cfg.baseBoard + jitter()));
    const shareholderRightsScore = Math.max(10, Math.min(100, cfg.baseShareholder + jitter()));
    const compensationScore = Math.max(10, Math.min(100, cfg.baseCompensation + jitter()));
    const auditScore = Math.max(10, Math.min(100, cfg.baseAudit + jitter()));

    let rating: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 85) rating = 'A';
    else if (overallScore >= 70) rating = 'B';
    else if (overallScore >= 55) rating = 'C';
    else if (overallScore >= 40) rating = 'D';
    else rating = 'F';

    return {
      company: cfg.company,
      overallScore,
      boardScore,
      shareholderRightsScore,
      compensationScore,
      auditScore,
      rating,
    };
  });
}

function generateProxyVotingData(): ProxyVotingResponse {
  const rng = seededRandom('proxy-voting');

  const upcomingMeetings = generateUpcomingMeetings(rng);
  const hotContests = generateHotContests(rng);
  const votingResults = generateVotingResults(rng);
  const esgProposals = generateESGProposals(rng);
  const sayOnPay = generateSayOnPay(rng);
  const boardMetrics = generateBoardMetrics(rng);
  const compensationTrends = generateCompensationTrends(rng);
  const governanceScores = generateGovernanceScores(rng);

  return {
    upcomingMeetings,
    hotContests,
    votingResults,
    esgProposals,
    sayOnPay,
    boardMetrics,
    compensationTrends,
    governanceScores,
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

    const data = generateProxyVotingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ProxyVoting] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate proxy voting data' });
  }
});

export default router;
