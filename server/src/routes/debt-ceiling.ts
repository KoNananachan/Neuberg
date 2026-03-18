import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface ExtraordinaryMeasure {
  name: string;
  capacity: number;
  used: number;
  remaining: number;
}

interface TimelineEvent {
  date: string;
  event: string;
  type: 'PAST' | 'PROJECTED';
}

interface DailyBorrowing {
  date: string;
  amount: number;
  instrument: string;
}

interface HistoricalCeiling {
  date: string;
  oldLimit: number;
  newLimit: number;
}

interface MarketImpact {
  tbill1mYield: number;
  tbill3mYield: number;
  tbillSpread1m3m: number;
  cds1ySpread: number;
  cds5ySpread: number;
  cdsChange1w: number;
  mmfFlows7d: number;
  mmfAum: number;
  repoRateSpread: number;
}

interface DebtCeilingSummary {
  utilizationPct: number;
  daysToXDate: number;
  measuresExhaustedPct: number;
  riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  timestamp: string;
}

interface DebtCeilingResponse {
  currentDebt: number;
  debtLimit: number;
  headroom: number;
  xDate: string;
  extraordinaryMeasures: ExtraordinaryMeasure[];
  timeline: TimelineEvent[];
  dailyBorrowing: DailyBorrowing[];
  historicalCeilings: HistoricalCeiling[];
  marketImpact: MarketImpact;
  summary: DebtCeilingSummary;
  timestamp: string;
}

// ── Cache ──

let cache: { data: DebtCeilingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Extraordinary measures configuration ──

interface MeasureConfig {
  name: string;
  baseCapacity: number;
  baseUsedPct: number;
  volatility: number;
}

const MEASURE_CONFIGS: MeasureConfig[] = [
  { name: 'CSRDF Suspension', baseCapacity: 235, baseUsedPct: 72, volatility: 8 },
  { name: 'G Fund Reinvestment Suspension', baseCapacity: 312, baseUsedPct: 68, volatility: 10 },
  { name: 'Exchange Stabilization Fund', baseCapacity: 23, baseUsedPct: 85, volatility: 5 },
  { name: 'Federal Financing Bank', baseCapacity: 15, baseUsedPct: 90, volatility: 4 },
  { name: 'Postal Service Retiree Health Benefits Fund', baseCapacity: 18, baseUsedPct: 60, volatility: 12 },
  { name: 'Federal Employees Retirement System G Fund', baseCapacity: 198, baseUsedPct: 65, volatility: 9 },
];

// ── Historical ceilings configuration ──

const HISTORICAL_CEILINGS: HistoricalCeiling[] = [
  { date: '2021-12-16', oldLimit: 28.9e12, newLimit: 31.4e12 },
  { date: '2023-06-03', oldLimit: 31.4e12, newLimit: 34.0e12 },
  { date: '2024-01-02', oldLimit: 34.0e12, newLimit: 34.6e12 },
  { date: '2025-03-15', oldLimit: 34.6e12, newLimit: 36.1e12 },
];

// ── Daily borrowing instrument configuration ──

interface BorrowingInstrumentConfig {
  instrument: string;
  baseAmount: number;
  volatility: number;
}

const BORROWING_INSTRUMENT_CONFIGS: BorrowingInstrumentConfig[] = [
  { instrument: '4-Week T-Bill', baseAmount: 65, volatility: 15 },
  { instrument: '8-Week T-Bill', baseAmount: 55, volatility: 12 },
  { instrument: '13-Week T-Bill', baseAmount: 80, volatility: 18 },
  { instrument: '26-Week T-Bill', baseAmount: 70, volatility: 14 },
  { instrument: '2-Year Note', baseAmount: 42, volatility: 8 },
  { instrument: '5-Year Note', baseAmount: 35, volatility: 7 },
  { instrument: '10-Year Note', baseAmount: 25, volatility: 5 },
  { instrument: '30-Year Bond', baseAmount: 18, volatility: 4 },
];

// ── Data generation ──

function generateExtraordinaryMeasures(rng: () => number): ExtraordinaryMeasure[] {
  return MEASURE_CONFIGS.map((cfg) => {
    const capacityJitter = (rng() - 0.5) * cfg.baseCapacity * 0.05;
    const capacity = Math.round((cfg.baseCapacity + capacityJitter) * 10) / 10;

    const usedPctJitter = (rng() - 0.5) * cfg.volatility * 2;
    const usedPct = Math.max(0, Math.min(100, cfg.baseUsedPct + usedPctJitter));
    const used = Math.round(capacity * usedPct / 100 * 10) / 10;
    const remaining = Math.round((capacity - used) * 10) / 10;

    return {
      name: cfg.name,
      capacity,
      used,
      remaining,
    };
  });
}

function generateTimeline(rng: () => number, xDate: string): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { date: '2025-01-02', event: 'Debt ceiling reinstated after suspension', type: 'PAST' },
    { date: '2025-01-21', event: 'Treasury begins extraordinary measures', type: 'PAST' },
    { date: '2025-02-14', event: 'First CSRDF suspension executed', type: 'PAST' },
    { date: '2025-03-15', event: 'Debt limit raised to $36.1T', type: 'PAST' },
    { date: '2025-04-15', event: 'Tax receipts seasonal inflow peak', type: 'PAST' },
    { date: '2025-06-15', event: 'Quarterly estimated tax payments received', type: 'PAST' },
  ];

  // Add some projected events with RNG-based variation
  const projectedBaseMonth = 7 + Math.floor(rng() * 4); // July - October range
  const projectedDay = 1 + Math.floor(rng() * 28);
  const measuresExhaustedDate = `2025-${String(projectedBaseMonth).padStart(2, '0')}-${String(projectedDay).padStart(2, '0')}`;

  events.push(
    { date: measuresExhaustedDate, event: 'Projected extraordinary measures exhaustion', type: 'PROJECTED' },
    { date: xDate, event: 'Projected X-date (cash exhaustion)', type: 'PROJECTED' },
  );

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function generateDailyBorrowing(rng: () => number): DailyBorrowing[] {
  const entries: DailyBorrowing[] = [];
  const today = new Date();

  for (let i = 9; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);

    // Pick 2-3 instruments per day
    const numInstruments = 2 + Math.floor(rng() * 2);
    const shuffled = [...BORROWING_INSTRUMENT_CONFIGS].sort(() => rng() - 0.5);
    const selected = shuffled.slice(0, numInstruments);

    for (const cfg of selected) {
      const jitter = (rng() - 0.5) * cfg.volatility * 2;
      const amount = Math.round((cfg.baseAmount + jitter) * 10) / 10;

      entries.push({
        date: dateStr,
        amount,
        instrument: cfg.instrument,
      });
    }
  }

  return entries;
}

function generateMarketImpact(rng: () => number): MarketImpact {
  // T-Bill yields near ceiling stress tend to elevate short-term yields
  const tbill1mYield = Math.round((4.25 + (rng() - 0.3) * 0.5) * 1000) / 1000;
  const tbill3mYield = Math.round((4.35 + (rng() - 0.5) * 0.3) * 1000) / 1000;
  const tbillSpread1m3m = Math.round((tbill1mYield - tbill3mYield) * 1000) / 1000;

  // CDS spreads widen under ceiling stress
  const cds1ySpread = Math.round((35 + (rng() - 0.3) * 30) * 10) / 10;
  const cds5ySpread = Math.round((25 + (rng() - 0.3) * 20) * 10) / 10;
  const cdsChange1w = Math.round((rng() - 0.4) * 15 * 10) / 10;

  // Money market fund flows (billions)
  const mmfFlows7d = Math.round(((rng() - 0.4) * 80) * 10) / 10;
  const mmfAum = Math.round((6150 + (rng() - 0.5) * 200) * 10) / 10;

  // Repo rate spread to SOFR (bps)
  const repoRateSpread = Math.round(((rng() - 0.3) * 10) * 10) / 10;

  return {
    tbill1mYield,
    tbill3mYield,
    tbillSpread1m3m,
    cds1ySpread,
    cds5ySpread,
    cdsChange1w,
    mmfFlows7d,
    mmfAum,
    repoRateSpread,
  };
}

function generateDebtCeilingData(): DebtCeilingResponse {
  const rng = seededRandom('debt-ceiling');

  // Core debt figures (in dollars)
  const baseDebt = 34.5e12;
  const debtJitter = (rng() - 0.5) * 0.3e12;
  const currentDebt = Math.round(baseDebt + debtJitter);
  const debtLimit = 36.1e12;
  const headroom = debtLimit - currentDebt;

  // X-date calculation
  const xDateMonth = 8 + Math.floor(rng() * 4); // August - November range
  const xDateDay = 1 + Math.floor(rng() * 28);
  const xDate = `2025-${String(xDateMonth).padStart(2, '0')}-${String(xDateDay).padStart(2, '0')}`;

  const extraordinaryMeasures = generateExtraordinaryMeasures(rng);
  const timeline = generateTimeline(rng, xDate);
  const dailyBorrowing = generateDailyBorrowing(rng);
  const marketImpact = generateMarketImpact(rng);

  // Summary calculations
  const utilizationPct = Math.round((currentDebt / debtLimit) * 10000) / 100;

  const today = new Date();
  const xDateObj = new Date(xDate);
  const daysToXDate = Math.max(0, Math.round((xDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const totalCapacity = extraordinaryMeasures.reduce((sum, m) => sum + m.capacity, 0);
  const totalUsed = extraordinaryMeasures.reduce((sum, m) => sum + m.used, 0);
  const measuresExhaustedPct = Math.round((totalUsed / totalCapacity) * 10000) / 100;

  // Risk level based on headroom and days to X-date
  let riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  if (daysToXDate < 30 || measuresExhaustedPct > 95) {
    riskLevel = 'CRITICAL';
  } else if (daysToXDate < 60 || measuresExhaustedPct > 85) {
    riskLevel = 'ELEVATED';
  } else if (daysToXDate < 120 || measuresExhaustedPct > 70) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  const timestamp = new Date().toISOString();

  const summary: DebtCeilingSummary = {
    utilizationPct,
    daysToXDate,
    measuresExhaustedPct,
    riskLevel,
    timestamp,
  };

  return {
    currentDebt,
    debtLimit,
    headroom,
    xDate,
    extraordinaryMeasures,
    timeline,
    dailyBorrowing,
    historicalCeilings: HISTORICAL_CEILINGS,
    marketImpact,
    summary,
    timestamp,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateDebtCeilingData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[DebtCeiling] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate debt ceiling data' });
  }
});

export default router;
