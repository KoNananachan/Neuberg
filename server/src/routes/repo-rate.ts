import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface OvernightRate {
  name: string;
  code: string;
  rate: number;
  change1d: number;
  change1w: number;
  percentile90d: number;
}

interface TermRepoRate {
  tenor: string;
  collateral: 'Treasury' | 'MBS';
  rate: number;
  spreadToON: number;
  change1d: number;
}

interface RepoSpecial {
  cusip: string;
  maturity: string;
  issueType: 'T-Note' | 'T-Bond' | 'T-Bill';
  specialRate: number;
  generalCollateralRate: number;
  spread: number;
  reason: string;
}

interface RepoRateSummary {
  sofrRate: number;
  sofr1dChange: number;
  avgTermPremium: number;
  specialsCount: number;
  marketStress: 'LOW' | 'MODERATE' | 'ELEVATED';
  timestamp: string;
}

interface RepoRateResponse {
  overnightRates: OvernightRate[];
  termRepoRates: TermRepoRate[];
  repoSpecials: RepoSpecial[];
  summary: RepoRateSummary;
}

// ── Cache ──

let cache: { data: RepoRateResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Overnight rate configuration ──

interface OvernightRateConfig {
  name: string;
  code: string;
  baseRate: number;
  volatility: number;
}

const OVERNIGHT_CONFIGS: OvernightRateConfig[] = [
  { name: 'Secured Overnight Financing Rate', code: 'SOFR', baseRate: 4.31, volatility: 0.03 },
  { name: 'Effective Federal Funds Rate', code: 'EFFR', baseRate: 4.33, volatility: 0.02 },
  { name: 'Overnight Bank Funding Rate', code: 'OBFR', baseRate: 4.32, volatility: 0.02 },
  { name: 'Tri-Party General Collateral Rate', code: 'TGCR', baseRate: 4.30, volatility: 0.03 },
  { name: 'Broad General Collateral Rate', code: 'BGCR', baseRate: 4.30, volatility: 0.03 },
  { name: 'Sterling Overnight Index Average', code: 'SONIA', baseRate: 4.45, volatility: 0.02 },
  { name: 'Euro Short-Term Rate', code: 'ESTR', baseRate: 3.65, volatility: 0.02 },
  { name: 'Tokyo Overnight Average Rate', code: 'TONAR', baseRate: 0.228, volatility: 0.015 },
];

// ── Term repo tenor configuration ──

const TERM_TENORS = ['1W', '2W', '1M', '2M', '3M', '6M'] as const;

interface TenorSpreadConfig {
  tenor: string;
  treasurySpreadBps: number;
  mbsAddonBps: number;
}

const TENOR_SPREAD_CONFIGS: TenorSpreadConfig[] = [
  { tenor: '1W', treasurySpreadBps: 1.5, mbsAddonBps: 4.0 },
  { tenor: '2W', treasurySpreadBps: 2.5, mbsAddonBps: 5.0 },
  { tenor: '1M', treasurySpreadBps: 4.0, mbsAddonBps: 7.0 },
  { tenor: '2M', treasurySpreadBps: 6.5, mbsAddonBps: 9.0 },
  { tenor: '3M', treasurySpreadBps: 9.0, mbsAddonBps: 12.0 },
  { tenor: '6M', treasurySpreadBps: 15.0, mbsAddonBps: 18.0 },
];

// ── Repo specials configuration ──

interface SpecialConfig {
  cusip: string;
  maturity: string;
  issueType: 'T-Note' | 'T-Bond' | 'T-Bill';
  baseSpecialSpreadBps: number;
  reason: string;
}

const SPECIALS_CONFIGS: SpecialConfig[] = [
  { cusip: '91282CKN6', maturity: '2026-11-30', issueType: 'T-Note', baseSpecialSpreadBps: -45, reason: 'Heavy short interest' },
  { cusip: '91282CKP1', maturity: '2027-02-28', issueType: 'T-Note', baseSpecialSpreadBps: -30, reason: 'CTD for futures' },
  { cusip: '91282CKQ9', maturity: '2034-02-15', issueType: 'T-Note', baseSpecialSpreadBps: -55, reason: 'Auction settlement' },
  { cusip: '912810TW8', maturity: '2054-02-15', issueType: 'T-Bond', baseSpecialSpreadBps: -35, reason: 'Heavy short interest' },
  { cusip: '912797KR1', maturity: '2026-06-19', issueType: 'T-Bill', baseSpecialSpreadBps: -20, reason: 'Collateral demand' },
  { cusip: '91282CKL0', maturity: '2028-11-15', issueType: 'T-Note', baseSpecialSpreadBps: -40, reason: 'CTD for futures' },
  { cusip: '912810TV0', maturity: '2053-11-15', issueType: 'T-Bond', baseSpecialSpreadBps: -25, reason: 'Strip demand' },
  { cusip: '91282CKM8', maturity: '2033-11-15', issueType: 'T-Note', baseSpecialSpreadBps: -50, reason: 'Auction settlement' },
  { cusip: '912797KP5', maturity: '2026-05-22', issueType: 'T-Bill', baseSpecialSpreadBps: -15, reason: 'Money fund demand' },
  { cusip: '91282CKJ5', maturity: '2031-08-15', issueType: 'T-Note', baseSpecialSpreadBps: -38, reason: 'Heavy short interest' },
];

// ── Data generation ──

function generateOvernightRates(rng: () => number): OvernightRate[] {
  return OVERNIGHT_CONFIGS.map((cfg) => {
    const jitter = (rng() - 0.5) * cfg.volatility * 2;
    const rate = Math.round((cfg.baseRate + jitter) * 10000) / 10000;

    const isJpy = cfg.code === 'TONAR';
    const scaleFactor = isJpy ? 0.2 : 1;

    const change1d = Math.round((rng() - 0.5) * 2 * scaleFactor * 100) / 100;
    const change1w = Math.round((rng() - 0.5) * 5 * scaleFactor * 100) / 100;

    // Percentile: how current rate compares over past 90 days (0-100)
    const rawPercentile = 40 + rng() * 50; // bias toward upper range in tightening cycle
    const percentile90d = Math.round(Math.max(1, Math.min(99, rawPercentile)));

    return {
      name: cfg.name,
      code: cfg.code,
      rate,
      change1d,
      change1w,
      percentile90d,
    };
  });
}

function generateTermRepoRates(rng: () => number, sofrRate: number): TermRepoRate[] {
  const entries: TermRepoRate[] = [];

  for (const cfg of TENOR_SPREAD_CONFIGS) {
    // Treasury collateral
    const tsySpreadJitter = (rng() - 0.5) * 3; // +/- 1.5bps
    const tsySpreadBps = cfg.treasurySpreadBps + tsySpreadJitter;
    const tsyRate = Math.round((sofrRate + tsySpreadBps / 100) * 10000) / 10000;
    const tsyChange1d = Math.round((rng() - 0.5) * 3 * 100) / 100;

    entries.push({
      tenor: cfg.tenor,
      collateral: 'Treasury',
      rate: tsyRate,
      spreadToON: Math.round(tsySpreadBps * 10) / 10,
      change1d: tsyChange1d,
    });

    // MBS collateral (trades wider)
    const mbsSpreadJitter = (rng() - 0.5) * 4; // +/- 2bps
    const mbsTotalSpreadBps = cfg.treasurySpreadBps + cfg.mbsAddonBps + mbsSpreadJitter;
    const mbsRate = Math.round((sofrRate + mbsTotalSpreadBps / 100) * 10000) / 10000;
    const mbsChange1d = Math.round((rng() - 0.5) * 4 * 100) / 100;

    entries.push({
      tenor: cfg.tenor,
      collateral: 'MBS',
      rate: mbsRate,
      spreadToON: Math.round(mbsTotalSpreadBps * 10) / 10,
      change1d: mbsChange1d,
    });
  }

  return entries;
}

function generateRepoSpecials(rng: () => number, gcRate: number): RepoSpecial[] {
  return SPECIALS_CONFIGS.map((cfg) => {
    const spreadJitter = (rng() - 0.5) * 15; // +/- 7.5bps
    const specialSpreadBps = cfg.baseSpecialSpreadBps + spreadJitter;
    const specialRate = Math.round((gcRate + specialSpreadBps / 100) * 10000) / 10000;

    // GC rate with minor issue-level variation
    const gcJitter = (rng() - 0.5) * 0.02;
    const generalCollateralRate = Math.round((gcRate + gcJitter) * 10000) / 10000;

    const spread = Math.round((specialRate - generalCollateralRate) * 10000) / 10;

    return {
      cusip: cfg.cusip,
      maturity: cfg.maturity,
      issueType: cfg.issueType,
      specialRate,
      generalCollateralRate,
      spread,
      reason: cfg.reason,
    };
  });
}

function generateRepoRateData(): RepoRateResponse {
  const rng = seededRandom('repo-rate');

  const overnightRates = generateOvernightRates(rng);

  // Extract SOFR and TGCR for downstream calculations
  const sofrEntry = overnightRates.find((r) => r.code === 'SOFR')!;
  const tgcrEntry = overnightRates.find((r) => r.code === 'TGCR')!;

  const termRepoRates = generateTermRepoRates(rng, sofrEntry.rate);
  const repoSpecials = generateRepoSpecials(rng, tgcrEntry.rate);

  // Summary
  const treasuryTermRates = termRepoRates.filter((r) => r.collateral === 'Treasury');
  const avgTermPremium = treasuryTermRates.length > 0
    ? Math.round(
        (treasuryTermRates.reduce((sum, r) => sum + r.spreadToON, 0) / treasuryTermRates.length) * 10
      ) / 10
    : 0;

  const specialsCount = repoSpecials.length;

  // Market stress assessment based on specials spread magnitude and term premium
  const avgSpecialSpread = repoSpecials.reduce((sum, s) => sum + Math.abs(s.spread), 0) / repoSpecials.length;
  let marketStress: 'LOW' | 'MODERATE' | 'ELEVATED';
  if (avgSpecialSpread > 40 || avgTermPremium > 12) {
    marketStress = 'ELEVATED';
  } else if (avgSpecialSpread > 25 || avgTermPremium > 8) {
    marketStress = 'MODERATE';
  } else {
    marketStress = 'LOW';
  }

  const summary: RepoRateSummary = {
    sofrRate: sofrEntry.rate,
    sofr1dChange: sofrEntry.change1d,
    avgTermPremium,
    specialsCount,
    marketStress,
    timestamp: new Date().toISOString(),
  };

  return {
    overnightRates,
    termRepoRates,
    repoSpecials,
    summary,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateRepoRateData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[RepoRate] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate repo rate data' });
  }
});

export default router;
