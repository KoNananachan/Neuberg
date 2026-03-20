import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface ActiveCase {
  defendant: string;
  ticker: string;
  leadPlaintiff: string;
  lawFirm: string;
  filingDate: string;
  allegedViolation: string;
  classPeriodStart: string;
  classPeriodEnd: string;
  status: 'Filed' | 'Consolidated' | 'Settled' | 'Dismissed';
  estimatedDamages: number;
}

interface RecentFiling {
  defendant: string;
  ticker: string;
  filingDate: string;
  court: string;
  allegedViolation: string;
  summary: string;
}

interface Settlement {
  defendant: string;
  ticker: string;
  settlementAmount: number;
  perShareRecovery: number;
  claimsDeadline: string;
  approvalDate: string;
}

interface SectorConcentration {
  sector: string;
  activeCases: number;
  percentOfTotal: number;
  avgDamages: number;
}

interface TopDefendant {
  company: string;
  ticker: string;
  activeCases: number;
  totalExposure: number;
  latestFiling: string;
}

interface TopPlaintiffFirm {
  firm: string;
  activeCases: number;
  totalRecoveries: number;
  avgRecovery: number;
  winRate: number;
}

interface TriggerEvent {
  trigger: string;
  caseCount: number;
  percentOfTotal: number;
  avgDamages: number;
}

interface Statistics {
  annualFilings: number;
  filingsTrend: 'UP' | 'DOWN' | 'FLAT';
  avgSettlementSize: number;
  medianSettlementSize: number;
  dismissalRate: number;
  avgCaseDurationMonths: number;
  totalSettlementsYTD: number;
  pendingCases: number;
}

interface SecuritiesClassActionResponse {
  activeCases: ActiveCase[];
  recentFilings: RecentFiling[];
  settlements: Settlement[];
  sectorConcentration: SectorConcentration[];
  topDefendants: TopDefendant[];
  topPlaintiffFirms: TopPlaintiffFirm[];
  triggerEvents: TriggerEvent[];
  statistics: Statistics;
  timestamp: string;
}

// ── Cache ──

let cache: { data: SecuritiesClassActionResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 60 * 60_000; // 5 minutes

// ── Active cases configuration ──

interface CaseConfig {
  defendant: string;
  ticker: string;
  leadPlaintiff: string;
  lawFirm: string;
  filingDaysAgo: number;
  allegedViolation: string;
  classPeriodLengthDays: number;
  baseStatus: 'Filed' | 'Consolidated' | 'Settled' | 'Dismissed';
  baseDamages: number;
}

const CASE_CONFIGS: CaseConfig[] = [
  { defendant: 'NovaTech Holdings Inc.', ticker: 'NVTH', leadPlaintiff: 'Ontario Teachers Pension Plan', lawFirm: 'Bernstein Litowitz Berger & Grossmann', filingDaysAgo: 45, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 365, baseStatus: 'Filed', baseDamages: 2800 },
  { defendant: 'Meridian Pharmaceuticals Corp.', ticker: 'MRDP', leadPlaintiff: 'City of Detroit Retirement Systems', lawFirm: 'Robbins Geller Rudman & Dowd', filingDaysAgo: 120, allegedViolation: 'Sections 11 and 12(a)(2)', classPeriodLengthDays: 540, baseStatus: 'Consolidated', baseDamages: 4200 },
  { defendant: 'Apex Digital Solutions Inc.', ticker: 'APXD', leadPlaintiff: 'Arkansas Teacher Retirement System', lawFirm: 'Pomerantz LLP', filingDaysAgo: 200, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 730, baseStatus: 'Consolidated', baseDamages: 1950 },
  { defendant: 'Solaris Energy Group', ticker: 'SLRE', leadPlaintiff: 'CalSTRS', lawFirm: 'Labaton Sucharow', filingDaysAgo: 85, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 450, baseStatus: 'Filed', baseDamages: 3600 },
  { defendant: 'CrestView Financial Holdings', ticker: 'CVFH', leadPlaintiff: 'Public Employees Retirement System of Mississippi', lawFirm: 'Scott+Scott Attorneys at Law', filingDaysAgo: 310, allegedViolation: 'Sections 11, 12(a)(2), and 15', classPeriodLengthDays: 365, baseStatus: 'Consolidated', baseDamages: 5100 },
  { defendant: 'Pinnacle Cloud Technologies', ticker: 'PCLD', leadPlaintiff: 'Teamsters Local 677 Health Services', lawFirm: 'Kessler Topaz Meltzer & Check', filingDaysAgo: 30, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 270, baseStatus: 'Filed', baseDamages: 1200 },
  { defendant: 'Vanguard BioSciences Ltd.', ticker: 'VGBS', leadPlaintiff: 'New York State Common Retirement Fund', lawFirm: 'Bernstein Litowitz Berger & Grossmann', filingDaysAgo: 540, allegedViolation: 'Sections 10(b) and 20(a)', classPeriodLengthDays: 600, baseStatus: 'Settled', baseDamages: 6800 },
  { defendant: 'Atlas Semiconductor Inc.', ticker: 'ATLS', leadPlaintiff: 'State of Oregon Treasury', lawFirm: 'Grant & Eisenhofer', filingDaysAgo: 150, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 365, baseStatus: 'Filed', baseDamages: 2100 },
  { defendant: 'GlobalReach Media Corp.', ticker: 'GRMC', leadPlaintiff: 'Louisiana Municipal Police Employees Retirement System', lawFirm: 'Robbins Geller Rudman & Dowd', filingDaysAgo: 420, allegedViolation: 'Sections 11 and 15', classPeriodLengthDays: 480, baseStatus: 'Dismissed', baseDamages: 890 },
  { defendant: 'TrueNorth Data Systems', ticker: 'TNDS', leadPlaintiff: 'Employees Retirement System of the City of St. Louis', lawFirm: 'Pomerantz LLP', filingDaysAgo: 60, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 330, baseStatus: 'Filed', baseDamages: 1750 },
  { defendant: 'Horizon Therapeutics plc', ticker: 'HZTX', leadPlaintiff: 'Plymouth County Retirement Association', lawFirm: 'Labaton Sucharow', filingDaysAgo: 270, allegedViolation: 'Sections 14(a) and 20(a)', classPeriodLengthDays: 180, baseStatus: 'Consolidated', baseDamages: 3200 },
  { defendant: 'Pacific Logistics Holdings', ticker: 'PCLG', leadPlaintiff: 'Iron Workers Local 580 Pension Fund', lawFirm: 'Glancy Prongay & Murray', filingDaysAgo: 15, allegedViolation: 'Section 10(b) / Rule 10b-5', classPeriodLengthDays: 400, baseStatus: 'Filed', baseDamages: 920 },
];

// ── Recent filings configuration ──

interface RecentFilingConfig {
  defendant: string;
  ticker: string;
  filingDaysAgo: number;
  court: string;
  allegedViolation: string;
  summary: string;
}

const RECENT_FILING_CONFIGS: RecentFilingConfig[] = [
  { defendant: 'Pacific Logistics Holdings', ticker: 'PCLG', filingDaysAgo: 3, court: 'S.D.N.Y.', allegedViolation: 'Section 10(b) / Rule 10b-5', summary: 'Alleges material misrepresentations regarding supply chain disruptions and revenue recognition practices during the class period.' },
  { defendant: 'Pinnacle Cloud Technologies', ticker: 'PCLD', filingDaysAgo: 8, court: 'N.D. Cal.', allegedViolation: 'Section 10(b) / Rule 10b-5', summary: 'Claims company concealed significant cybersecurity vulnerabilities and customer data breach affecting 12M accounts.' },
  { defendant: 'Quantum Robotics Inc.', ticker: 'QRBT', filingDaysAgo: 12, court: 'D. Del.', allegedViolation: 'Sections 11 and 12(a)(2)', summary: 'IPO-related claims alleging prospectus contained materially false statements about autonomous vehicle testing safety data.' },
  { defendant: 'Redstone Mining Corp.', ticker: 'RDMN', filingDaysAgo: 18, court: 'D. Colo.', allegedViolation: 'Section 10(b) / Rule 10b-5', summary: 'Alleges defendants inflated ore reserve estimates by approximately 40%, resulting in $1.2B market cap decline upon disclosure.' },
  { defendant: 'Elysium Health Sciences', ticker: 'ELHS', filingDaysAgo: 22, court: 'D.N.J.', allegedViolation: 'Sections 10(b) and 20(a)', summary: 'Claims company failed to disclose adverse clinical trial results for lead drug candidate prior to FDA Complete Response Letter.' },
  { defendant: 'Sterling Bank Corp.', ticker: 'STBK', filingDaysAgo: 27, court: 'S.D.N.Y.', allegedViolation: 'Section 10(b) / Rule 10b-5', summary: 'Alleges systematic understatement of commercial real estate loan loss provisions in quarterly reports over 18-month period.' },
];

// ── Settlement configuration ──

interface SettlementConfig {
  defendant: string;
  ticker: string;
  baseSettlementAmount: number;
  basePerShareRecovery: number;
  deadlineDaysFromNow: number;
  approvalDaysAgo: number;
}

const SETTLEMENT_CONFIGS: SettlementConfig[] = [
  { defendant: 'Vanguard BioSciences Ltd.', ticker: 'VGBS', baseSettlementAmount: 425, basePerShareRecovery: 3.82, deadlineDaysFromNow: 45, approvalDaysAgo: 30 },
  { defendant: 'CoreLogic Data Corp.', ticker: 'CLDC', baseSettlementAmount: 187.5, basePerShareRecovery: 1.45, deadlineDaysFromNow: 60, approvalDaysAgo: 15 },
  { defendant: 'Emerald Fintech Holdings', ticker: 'EMFT', baseSettlementAmount: 92, basePerShareRecovery: 0.78, deadlineDaysFromNow: 30, approvalDaysAgo: 45 },
  { defendant: 'Northwind Aerospace Inc.', ticker: 'NWAI', baseSettlementAmount: 310, basePerShareRecovery: 2.55, deadlineDaysFromNow: 90, approvalDaysAgo: 10 },
  { defendant: 'Cascade Retail Group', ticker: 'CSRG', baseSettlementAmount: 56.5, basePerShareRecovery: 0.42, deadlineDaysFromNow: 20, approvalDaysAgo: 60 },
];

// ── Sector concentration configuration ──

interface SectorConfig {
  sector: string;
  baseCases: number;
  baseAvgDamages: number;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  { sector: 'Technology', baseCases: 68, baseAvgDamages: 2450 },
  { sector: 'Pharmaceuticals & Biotech', baseCases: 52, baseAvgDamages: 3100 },
  { sector: 'Financial Services', baseCases: 41, baseAvgDamages: 3800 },
  { sector: 'Energy & Utilities', baseCases: 24, baseAvgDamages: 2200 },
  { sector: 'Healthcare', baseCases: 19, baseAvgDamages: 1850 },
  { sector: 'Consumer Discretionary', baseCases: 16, baseAvgDamages: 1400 },
  { sector: 'Industrials', baseCases: 12, baseAvgDamages: 1650 },
  { sector: 'Real Estate', baseCases: 9, baseAvgDamages: 980 },
  { sector: 'Communications', baseCases: 8, baseAvgDamages: 2100 },
  { sector: 'Materials', baseCases: 5, baseAvgDamages: 750 },
];

// ── Top defendants configuration ──

interface TopDefendantConfig {
  company: string;
  ticker: string;
  baseCases: number;
  baseExposure: number;
  latestFilingDaysAgo: number;
}

const TOP_DEFENDANT_CONFIGS: TopDefendantConfig[] = [
  { company: 'CrestView Financial Holdings', ticker: 'CVFH', baseCases: 5, baseExposure: 8200, latestFilingDaysAgo: 30 },
  { company: 'Meridian Pharmaceuticals Corp.', ticker: 'MRDP', baseCases: 4, baseExposure: 6500, latestFilingDaysAgo: 45 },
  { company: 'NovaTech Holdings Inc.', ticker: 'NVTH', baseCases: 3, baseExposure: 4800, latestFilingDaysAgo: 20 },
  { company: 'Solaris Energy Group', ticker: 'SLRE', baseCases: 3, baseExposure: 5100, latestFilingDaysAgo: 60 },
  { company: 'Atlas Semiconductor Inc.', ticker: 'ATLS', baseCases: 2, baseExposure: 3200, latestFilingDaysAgo: 90 },
  { company: 'Horizon Therapeutics plc', ticker: 'HZTX', baseCases: 2, baseExposure: 4100, latestFilingDaysAgo: 75 },
  { company: 'TrueNorth Data Systems', ticker: 'TNDS', baseCases: 2, baseExposure: 2400, latestFilingDaysAgo: 40 },
  { company: 'Pinnacle Cloud Technologies', ticker: 'PCLD', baseCases: 1, baseExposure: 1200, latestFilingDaysAgo: 10 },
];

// ── Top plaintiff firms configuration ──

interface PlaintiffFirmConfig {
  firm: string;
  baseCases: number;
  baseRecoveries: number;
  baseWinRate: number;
}

const PLAINTIFF_FIRM_CONFIGS: PlaintiffFirmConfig[] = [
  { firm: 'Bernstein Litowitz Berger & Grossmann', baseCases: 42, baseRecoveries: 18500, baseWinRate: 72.5 },
  { firm: 'Robbins Geller Rudman & Dowd', baseCases: 38, baseRecoveries: 15200, baseWinRate: 68.3 },
  { firm: 'Pomerantz LLP', baseCases: 35, baseRecoveries: 9800, baseWinRate: 61.7 },
  { firm: 'Labaton Sucharow', baseCases: 28, baseRecoveries: 12100, baseWinRate: 65.4 },
  { firm: 'Kessler Topaz Meltzer & Check', baseCases: 26, baseRecoveries: 11400, baseWinRate: 70.1 },
  { firm: 'Scott+Scott Attorneys at Law', baseCases: 22, baseRecoveries: 7600, baseWinRate: 58.9 },
  { firm: 'Grant & Eisenhofer', baseCases: 18, baseRecoveries: 8900, baseWinRate: 66.2 },
  { firm: 'Glancy Prongay & Murray', baseCases: 31, baseRecoveries: 5400, baseWinRate: 54.8 },
];

// ── Trigger events configuration ──

interface TriggerConfig {
  trigger: string;
  baseCaseCount: number;
  baseAvgDamages: number;
}

const TRIGGER_CONFIGS: TriggerConfig[] = [
  { trigger: 'Earnings Restatement', baseCaseCount: 48, baseAvgDamages: 3200 },
  { trigger: 'Earnings Miss / Guidance Cut', baseCaseCount: 62, baseAvgDamages: 1850 },
  { trigger: 'FDA Rejection / CRL', baseCaseCount: 34, baseAvgDamages: 2900 },
  { trigger: 'Data Breach / Cybersecurity', baseCaseCount: 22, baseAvgDamages: 1600 },
  { trigger: 'Accounting Irregularities', baseCaseCount: 38, baseAvgDamages: 4100 },
  { trigger: 'Merger Objection', baseCaseCount: 28, baseAvgDamages: 950 },
  { trigger: 'Regulatory Investigation', baseCaseCount: 18, baseAvgDamages: 3500 },
  { trigger: 'Product Safety / Recall', baseCaseCount: 12, baseAvgDamages: 2200 },
  { trigger: 'Insider Trading Allegations', baseCaseCount: 8, baseAvgDamages: 2750 },
  { trigger: 'Environmental Violations', baseCaseCount: 6, baseAvgDamages: 1950 },
];

// ── Helper ──

function formatDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// ── Data generation ──

function generateActiveCases(rng: () => number): ActiveCase[] {
  return CASE_CONFIGS.map((cfg) => {
    const damagesJitter = (rng() - 0.5) * cfg.baseDamages * 0.2;
    const estimatedDamages = Math.round(cfg.baseDamages + damagesJitter);

    const filingDate = formatDate(-cfg.filingDaysAgo);
    const classPeriodEnd = formatDate(-cfg.filingDaysAgo - Math.floor(rng() * 30));
    const classPeriodStartDate = new Date(classPeriodEnd);
    classPeriodStartDate.setDate(classPeriodStartDate.getDate() - cfg.classPeriodLengthDays);
    const classPeriodStart = classPeriodStartDate.toISOString().slice(0, 10);

    return {
      defendant: cfg.defendant,
      ticker: cfg.ticker,
      leadPlaintiff: cfg.leadPlaintiff,
      lawFirm: cfg.lawFirm,
      filingDate,
      allegedViolation: cfg.allegedViolation,
      classPeriodStart,
      classPeriodEnd,
      status: cfg.baseStatus,
      estimatedDamages,
    };
  });
}

function generateRecentFilings(rng: () => number): RecentFiling[] {
  return RECENT_FILING_CONFIGS.map((cfg) => {
    const jitterDays = Math.floor(rng() * 3) - 1;
    const adjustedDaysAgo = Math.max(1, cfg.filingDaysAgo + jitterDays);
    const filingDate = formatDate(-adjustedDaysAgo);

    return {
      defendant: cfg.defendant,
      ticker: cfg.ticker,
      filingDate,
      court: cfg.court,
      allegedViolation: cfg.allegedViolation,
      summary: cfg.summary,
    };
  });
}

function generateSettlements(rng: () => number): Settlement[] {
  return SETTLEMENT_CONFIGS.map((cfg) => {
    const amountJitter = (rng() - 0.5) * cfg.baseSettlementAmount * 0.15;
    const settlementAmount = Math.round((cfg.baseSettlementAmount + amountJitter) * 10) / 10;

    const perShareJitter = (rng() - 0.5) * cfg.basePerShareRecovery * 0.1;
    const perShareRecovery = Math.round((cfg.basePerShareRecovery + perShareJitter) * 100) / 100;

    const deadlineJitter = Math.floor(rng() * 10) - 5;
    const claimsDeadline = formatDate(cfg.deadlineDaysFromNow + deadlineJitter);
    const approvalDate = formatDate(-(cfg.approvalDaysAgo + Math.floor(rng() * 5)));

    return {
      defendant: cfg.defendant,
      ticker: cfg.ticker,
      settlementAmount,
      perShareRecovery,
      claimsDeadline,
      approvalDate,
    };
  });
}

function generateSectorConcentration(rng: () => number): SectorConcentration[] {
  const sectors = SECTOR_CONFIGS.map((cfg) => {
    const caseJitter = Math.floor((rng() - 0.5) * cfg.baseCases * 0.15);
    const activeCases = Math.max(1, cfg.baseCases + caseJitter);

    const damagesJitter = (rng() - 0.5) * cfg.baseAvgDamages * 0.2;
    const avgDamages = Math.round(cfg.baseAvgDamages + damagesJitter);

    return { sector: cfg.sector, activeCases, avgDamages, percentOfTotal: 0 };
  });

  const totalCases = sectors.reduce((sum, s) => sum + s.activeCases, 0);
  for (const s of sectors) {
    s.percentOfTotal = Math.round((s.activeCases / totalCases) * 1000) / 10;
  }

  return sectors;
}

function generateTopDefendants(rng: () => number): TopDefendant[] {
  return TOP_DEFENDANT_CONFIGS.map((cfg) => {
    const caseJitter = Math.floor(rng() * 2);
    const activeCases = cfg.baseCases + caseJitter;

    const exposureJitter = (rng() - 0.5) * cfg.baseExposure * 0.15;
    const totalExposure = Math.round(cfg.baseExposure + exposureJitter);

    const filingJitter = Math.floor(rng() * 10) - 5;
    const latestFiling = formatDate(-(cfg.latestFilingDaysAgo + filingJitter));

    return {
      company: cfg.company,
      ticker: cfg.ticker,
      activeCases,
      totalExposure,
      latestFiling,
    };
  });
}

function generateTopPlaintiffFirms(rng: () => number): TopPlaintiffFirm[] {
  return PLAINTIFF_FIRM_CONFIGS.map((cfg) => {
    const caseJitter = Math.floor((rng() - 0.5) * cfg.baseCases * 0.1);
    const activeCases = Math.max(1, cfg.baseCases + caseJitter);

    const recoveryJitter = (rng() - 0.5) * cfg.baseRecoveries * 0.12;
    const totalRecoveries = Math.round(cfg.baseRecoveries + recoveryJitter);

    const avgRecovery = Math.round((totalRecoveries / activeCases) * 10) / 10;

    const winRateJitter = (rng() - 0.5) * 4;
    const winRate = Math.round(Math.max(40, Math.min(85, cfg.baseWinRate + winRateJitter)) * 10) / 10;

    return {
      firm: cfg.firm,
      activeCases,
      totalRecoveries,
      avgRecovery,
      winRate,
    };
  });
}

function generateTriggerEvents(rng: () => number): TriggerEvent[] {
  const triggers = TRIGGER_CONFIGS.map((cfg) => {
    const caseJitter = Math.floor((rng() - 0.5) * cfg.baseCaseCount * 0.15);
    const caseCount = Math.max(1, cfg.baseCaseCount + caseJitter);

    const damagesJitter = (rng() - 0.5) * cfg.baseAvgDamages * 0.2;
    const avgDamages = Math.round(cfg.baseAvgDamages + damagesJitter);

    return { trigger: cfg.trigger, caseCount, avgDamages, percentOfTotal: 0 };
  });

  const totalCases = triggers.reduce((sum, t) => sum + t.caseCount, 0);
  for (const t of triggers) {
    t.percentOfTotal = Math.round((t.caseCount / totalCases) * 1000) / 10;
  }

  return triggers;
}

function generateStatistics(rng: () => number): Statistics {
  const baseAnnualFilings = 218;
  const filingsJitter = Math.floor((rng() - 0.5) * 30);
  const annualFilings = baseAnnualFilings + filingsJitter;

  const trendRoll = rng();
  const filingsTrend: 'UP' | 'DOWN' | 'FLAT' = trendRoll < 0.45 ? 'UP' : trendRoll < 0.75 ? 'FLAT' : 'DOWN';

  const baseAvgSettlement = 42.5;
  const avgSettlementJitter = (rng() - 0.5) * 10;
  const avgSettlementSize = Math.round((baseAvgSettlement + avgSettlementJitter) * 10) / 10;

  const baseMedianSettlement = 12.8;
  const medianJitter = (rng() - 0.5) * 4;
  const medianSettlementSize = Math.round((baseMedianSettlement + medianJitter) * 10) / 10;

  const baseDismissalRate = 43.5;
  const dismissalJitter = (rng() - 0.5) * 6;
  const dismissalRate = Math.round(Math.max(30, Math.min(60, baseDismissalRate + dismissalJitter)) * 10) / 10;

  const baseDuration = 36;
  const durationJitter = Math.floor((rng() - 0.5) * 8);
  const avgCaseDurationMonths = baseDuration + durationJitter;

  const baseSettlementsYTD = 78;
  const ytdJitter = Math.floor((rng() - 0.5) * 15);
  const totalSettlementsYTD = baseSettlementsYTD + ytdJitter;

  const basePending = 442;
  const pendingJitter = Math.floor((rng() - 0.5) * 40);
  const pendingCases = basePending + pendingJitter;

  return {
    annualFilings,
    filingsTrend,
    avgSettlementSize,
    medianSettlementSize,
    dismissalRate,
    avgCaseDurationMonths,
    totalSettlementsYTD,
    pendingCases,
  };
}

function generateSecuritiesClassActionData(): SecuritiesClassActionResponse {
  const rng = seededRandom('securities-class-action');

  const activeCases = generateActiveCases(rng);
  const recentFilings = generateRecentFilings(rng);
  const settlements = generateSettlements(rng);
  const sectorConcentration = generateSectorConcentration(rng);
  const topDefendants = generateTopDefendants(rng);
  const topPlaintiffFirms = generateTopPlaintiffFirms(rng);
  const triggerEvents = generateTriggerEvents(rng);
  const statistics = generateStatistics(rng);

  return {
    activeCases,
    recentFilings,
    settlements,
    sectorConcentration,
    topDefendants,
    topPlaintiffFirms,
    triggerEvents,
    statistics,
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

    const data = generateSecuritiesClassActionData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SecuritiesClassAction] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate securities class action data' });
  }
});

export default router;
