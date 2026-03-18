import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface BalanceSheetEntry {
  name: string;
  code: string;
  totalAssets: number;
  change1m: number;
  change1y: number;
  qePace: number;
  treasuries: number;
  mbs: number;
  otherAssets: number;
  reserves: number;
  percentGdp: number;
}

interface AssetCompositionEntry {
  bank: string;
  category: string;
  amount: number;
  share: number;
  change3m: number;
}

interface QTTimelineEntry {
  date: string;
  fedTotal: number;
  ecbTotal: number;
  bojTotal: number;
  boeTotal: number;
  combinedChange: number;
}

interface BalanceSheetSummary {
  combinedAssets: number;
  combinedChangeYtd: number;
  fastestQtPace: string;
  avgPercentGdp: number;
  timestamp: string;
}

interface CentralBankBalanceSheetResponse {
  balanceSheets: BalanceSheetEntry[];
  assetComposition: AssetCompositionEntry[];
  qtTimeline: QTTimelineEntry[];
  summary: BalanceSheetSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: CentralBankBalanceSheetResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Central bank configuration ──

interface CentralBankConfig {
  name: string;
  code: string;
  baseTotalAssets: number;
  baseTreasuries: number;
  baseMbs: number;
  baseOtherAssets: number;
  baseReserves: number;
  basePercentGdp: number;
  baseQePace: number;
  compositionCategories: { category: string; baseAmount: number }[];
}

const CENTRAL_BANK_CONFIGS: CentralBankConfig[] = [
  {
    name: 'Federal Reserve',
    code: 'FED',
    baseTotalAssets: 7.48,
    baseTreasuries: 4.62,
    baseMbs: 2.32,
    baseOtherAssets: 0.38,
    baseReserves: 0.16,
    basePercentGdp: 26.8,
    baseQePace: -62,
    compositionCategories: [
      { category: 'Treasuries', baseAmount: 4620 },
      { category: 'MBS', baseAmount: 2320 },
      { category: 'Agency Debt', baseAmount: 42 },
      { category: 'Lending Facilities', baseAmount: 145 },
      { category: 'Other', baseAmount: 353 },
    ],
  },
  {
    name: 'European Central Bank',
    code: 'ECB',
    baseTotalAssets: 6.82,
    baseTreasuries: 3.42,
    baseMbs: 0.28,
    baseOtherAssets: 2.65,
    baseReserves: 0.47,
    basePercentGdp: 45.2,
    baseQePace: -38,
    compositionCategories: [
      { category: 'Govt Bonds (PSPP)', baseAmount: 3420 },
      { category: 'Covered Bonds (CBPP3)', baseAmount: 280 },
      { category: 'Corporate (CSPP)', baseAmount: 325 },
      { category: 'TLTRO III', baseAmount: 1580 },
      { category: 'Other', baseAmount: 1215 },
    ],
  },
  {
    name: 'Bank of Japan',
    code: 'BOJ',
    baseTotalAssets: 5.22,
    baseTreasuries: 3.85,
    baseMbs: 0.0,
    baseOtherAssets: 1.10,
    baseReserves: 0.27,
    basePercentGdp: 127.5,
    baseQePace: -8,
    compositionCategories: [
      { category: 'JGBs', baseAmount: 3850 },
      { category: 'ETFs', baseAmount: 480 },
      { category: 'Corporate Bonds', baseAmount: 78 },
      { category: 'Lending', baseAmount: 520 },
      { category: 'Other', baseAmount: 292 },
    ],
  },
  {
    name: 'Bank of England',
    code: 'BOE',
    baseTotalAssets: 0.82,
    baseTreasuries: 0.68,
    baseMbs: 0.0,
    baseOtherAssets: 0.09,
    baseReserves: 0.05,
    basePercentGdp: 27.4,
    baseQePace: -9.5,
    compositionCategories: [
      { category: 'Gilts', baseAmount: 680 },
      { category: 'Corporate Bonds', baseAmount: 12 },
      { category: 'Lending (TFS)', baseAmount: 82 },
      { category: 'Other', baseAmount: 46 },
    ],
  },
];

// ── Data generation ──

function generateBalanceSheets(rng: () => number): BalanceSheetEntry[] {
  return CENTRAL_BANK_CONFIGS.map((cfg) => {
    const assetJitter = (rng() - 0.5) * 0.12;
    const totalAssets = Math.round((cfg.baseTotalAssets + assetJitter) * 100) / 100;

    const treasuryRatio = cfg.baseTreasuries / cfg.baseTotalAssets;
    const mbsRatio = cfg.baseMbs / cfg.baseTotalAssets;
    const otherRatio = cfg.baseOtherAssets / cfg.baseTotalAssets;
    const reservesRatio = cfg.baseReserves / cfg.baseTotalAssets;

    const treasuries = Math.round(totalAssets * treasuryRatio * 100) / 100;
    const mbs = Math.round(totalAssets * mbsRatio * 100) / 100;
    const otherAssets = Math.round(totalAssets * otherRatio * 100) / 100;
    const reserves = Math.round(totalAssets * reservesRatio * 100) / 100;

    // Monthly change: QT-driven, slight randomization
    const change1m = Math.round((cfg.baseQePace / (cfg.baseTotalAssets * 1000) * 100 + (rng() - 0.5) * 0.3) * 100) / 100;
    // Annual change: accumulated QT
    const change1y = Math.round((change1m * 10 + (rng() - 0.5) * 2) * 100) / 100;

    const qePaceJitter = (rng() - 0.5) * 12;
    const qePace = Math.round((cfg.baseQePace + qePaceJitter) * 10) / 10;

    const gdpJitter = (rng() - 0.5) * 1.5;
    const percentGdp = Math.round((cfg.basePercentGdp + gdpJitter) * 10) / 10;

    return {
      name: cfg.name,
      code: cfg.code,
      totalAssets,
      change1m,
      change1y,
      qePace,
      treasuries,
      mbs,
      otherAssets,
      reserves,
      percentGdp,
    };
  });
}

function generateAssetComposition(rng: () => number): AssetCompositionEntry[] {
  const entries: AssetCompositionEntry[] = [];

  for (const cfg of CENTRAL_BANK_CONFIGS) {
    const totalBaseAmount = cfg.compositionCategories.reduce((sum, c) => sum + c.baseAmount, 0);

    for (const cat of cfg.compositionCategories) {
      const amountJitter = (rng() - 0.5) * cat.baseAmount * 0.04;
      const amount = Math.round((cat.baseAmount + amountJitter) * 10) / 10;

      const share = Math.round((amount / totalBaseAmount) * 1000) / 10;

      // 3-month change: generally negative during QT, with variance
      const change3m = Math.round(((rng() - 0.6) * 4.5) * 100) / 100;

      entries.push({
        bank: cfg.code,
        category: cat.category,
        amount,
        share,
        change3m,
      });
    }
  }

  return entries;
}

function generateQTTimeline(rng: () => number, balanceSheets: BalanceSheetEntry[]): QTTimelineEntry[] {
  const entries: QTTimelineEntry[] = [];
  const now = new Date();

  // Base totals from generated balance sheets (in $T)
  const fedBase = balanceSheets.find((b) => b.code === 'FED')?.totalAssets ?? 7.48;
  const ecbBase = balanceSheets.find((b) => b.code === 'ECB')?.totalAssets ?? 6.82;
  const bojBase = balanceSheets.find((b) => b.code === 'BOJ')?.totalAssets ?? 5.22;
  const boeBase = balanceSheets.find((b) => b.code === 'BOE')?.totalAssets ?? 0.82;

  for (let i = 7; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = date.toISOString().slice(0, 7); // YYYY-MM

    // Each month slightly higher going back (because QT is reducing)
    const monthsBack = i;
    const fedMonthlyDelta = 0.055 + (rng() - 0.5) * 0.015;
    const ecbMonthlyDelta = 0.035 + (rng() - 0.5) * 0.010;
    const bojMonthlyDelta = 0.008 + (rng() - 0.5) * 0.006;
    const boeMonthlyDelta = 0.009 + (rng() - 0.5) * 0.004;

    const fedTotal = Math.round((fedBase + monthsBack * fedMonthlyDelta) * 100) / 100;
    const ecbTotal = Math.round((ecbBase + monthsBack * ecbMonthlyDelta) * 100) / 100;
    const bojTotal = Math.round((bojBase + monthsBack * bojMonthlyDelta) * 100) / 100;
    const boeTotal = Math.round((boeBase + monthsBack * boeMonthlyDelta) * 100) / 100;

    const currentCombined = fedTotal + ecbTotal + bojTotal + boeTotal;
    const prevCombined = i < 7
      ? entries[entries.length - 1]
        ? (entries[entries.length - 1].fedTotal + entries[entries.length - 1].ecbTotal + entries[entries.length - 1].bojTotal + entries[entries.length - 1].boeTotal)
        : currentCombined
      : currentCombined;

    const combinedChange = entries.length > 0
      ? Math.round((currentCombined - prevCombined) * 1000) / 1000
      : 0;

    entries.push({
      date: dateStr,
      fedTotal,
      ecbTotal,
      bojTotal,
      boeTotal,
      combinedChange,
    });
  }

  return entries;
}

function generateSummary(
  balanceSheets: BalanceSheetEntry[],
  qtTimeline: QTTimelineEntry[]
): BalanceSheetSummary {
  const combinedAssets = Math.round(
    balanceSheets.reduce((sum, b) => sum + b.totalAssets, 0) * 100
  ) / 100;

  // YTD change: sum of monthly changes over ~3 months
  const ytdMonths = Math.min(qtTimeline.length, 3);
  const recentEntries = qtTimeline.slice(-ytdMonths);
  const combinedChangeYtd = Math.round(
    recentEntries.reduce((sum, e) => sum + e.combinedChange, 0) * 100
  ) / 100;

  // Fastest QT pace: the bank with the most negative qePace
  const fastestQtBank = balanceSheets.reduce((fastest, b) =>
    b.qePace < fastest.qePace ? b : fastest
  );
  const fastestQtPace = fastestQtBank.code;

  const avgPercentGdp = Math.round(
    (balanceSheets.reduce((sum, b) => sum + b.percentGdp, 0) / balanceSheets.length) * 10
  ) / 10;

  return {
    combinedAssets,
    combinedChangeYtd,
    fastestQtPace,
    avgPercentGdp,
    timestamp: new Date().toISOString(),
  };
}

function generateCentralBankBalanceSheetData(): CentralBankBalanceSheetResponse {
  const rng = seededRandom('central-bank-balance-sheet');

  const balanceSheets = generateBalanceSheets(rng);
  const assetComposition = generateAssetComposition(rng);
  const qtTimeline = generateQTTimeline(rng, balanceSheets);
  const summary = generateSummary(balanceSheets, qtTimeline);

  return {
    balanceSheets,
    assetComposition,
    qtTimeline,
    summary,
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

    const data = generateCentralBankBalanceSheetData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CentralBankBalanceSheet] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate central bank balance sheet data' });
  }
});

export default router;
