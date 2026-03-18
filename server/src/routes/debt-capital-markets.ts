import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const ISSUERS = [
  { name: 'Apple Inc', ticker: 'AAPL', sector: 'Technology' },
  { name: 'Microsoft Corp', ticker: 'MSFT', sector: 'Technology' },
  { name: 'JPMorgan Chase & Co', ticker: 'JPM', sector: 'Financials' },
  { name: 'Goldman Sachs Group', ticker: 'GS', sector: 'Financials' },
  { name: 'Bank of America Corp', ticker: 'BAC', sector: 'Financials' },
  { name: 'Citigroup Inc', ticker: 'C', sector: 'Financials' },
  { name: 'Morgan Stanley', ticker: 'MS', sector: 'Financials' },
  { name: 'Wells Fargo & Co', ticker: 'WFC', sector: 'Financials' },
  { name: 'AT&T Inc', ticker: 'T', sector: 'Telecom' },
  { name: 'Verizon Communications', ticker: 'VZ', sector: 'Telecom' },
  { name: 'Toyota Motor Credit', ticker: 'TM', sector: 'Autos' },
  { name: 'Volkswagen Intl Finance', ticker: 'VOW3', sector: 'Autos' },
  { name: 'BMW Finance NV', ticker: 'BMW', sector: 'Autos' },
  { name: 'TotalEnergies Capital', ticker: 'TTE', sector: 'Energy' },
  { name: 'Shell International Finance', ticker: 'SHEL', sector: 'Energy' },
  { name: 'BP Capital Markets', ticker: 'BP', sector: 'Energy' },
  { name: 'Pfizer Inc', ticker: 'PFE', sector: 'Healthcare' },
  { name: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare' },
  { name: 'Procter & Gamble Co', ticker: 'PG', sector: 'Consumer' },
  { name: 'Nestle Holdings Inc', ticker: 'NESN', sector: 'Consumer' },
  { name: 'Berkshire Hathaway Finance', ticker: 'BRK', sector: 'Diversified' },
  { name: 'Amazon.com Inc', ticker: 'AMZN', sector: 'Technology' },
  { name: 'Meta Platforms Inc', ticker: 'META', sector: 'Technology' },
  { name: 'NVIDIA Corp', ticker: 'NVDA', sector: 'Technology' },
  { name: 'Intel Corp', ticker: 'INTC', sector: 'Technology' },
  { name: 'Comcast Corp', ticker: 'CMCSA', sector: 'Media' },
  { name: 'Walt Disney Co', ticker: 'DIS', sector: 'Media' },
  { name: 'Union Pacific Corp', ticker: 'UNP', sector: 'Industrials' },
  { name: 'Caterpillar Inc', ticker: 'CAT', sector: 'Industrials' },
  { name: 'Deere & Co', ticker: 'DE', sector: 'Industrials' },
] as const;

const RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'] as const;
const BOND_TYPES = ['senior', 'subordinated', 'secured', 'green'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
const BOOKRUNNERS = [
  'JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'BofA Securities', 'Citi',
  'Barclays', 'Deutsche Bank', 'HSBC', 'BNP Paribas', 'UBS',
] as const;
const ISSUE_STATUSES = ['announced', 'bookbuilding', 'priced', 'allocated'] as const;
const TENORS = [2, 3, 5, 7, 10, 15, 20, 30] as const;
const REGIONS = ['North America', 'EMEA', 'Asia Pacific', 'Latin America'] as const;
const PIPELINE_SECTORS = ['Financials', 'Technology', 'Healthcare', 'Energy', 'Industrials', 'Telecom', 'Utilities', 'Consumer'] as const;
const PIPELINE_TIMINGS = ['This Week', 'Next Week', '2-3 Weeks', 'Post-Earnings'] as const;

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('dcm-' + day));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Spread by rating tier: higher rating = tighter spread
  const spreadForRating = (rating: string): number => {
    const igSpreads: Record<string, [number, number]> = {
      'AAA': [40, 70], 'AA+': [50, 80], 'AA': [55, 90], 'AA-': [60, 100],
      'A+': [70, 120], 'A': [80, 140], 'A-': [90, 160],
      'BBB+': [110, 180], 'BBB': [130, 200], 'BBB-': [150, 220],
    };
    const range = igSpreads[rating] || [100, 160];
    return Math.round(range[0] + rng() * (range[1] - range[0]));
  };

  // --- New Issues (10 recent/upcoming bond issuances) ---
  const shuffledIssuers = [...ISSUERS].sort(() => rng() - 0.5);
  const newIssues = shuffledIssuers.slice(0, 10).map((issuer, idx) => {
    const rating = pick(RATINGS);
    const tenor = pick(TENORS);
    const spread = spreadForRating(rating);
    const coupon = round2(3.5 + (spread / 100) + (rng() - 0.5) * 0.8);
    const size = Math.round((500 + rng() * 3500) / 25) * 25;
    const type = pick(BOND_TYPES);
    const currency = pick(CURRENCIES);
    const bookrunner = pick(BOOKRUNNERS);
    const status = ISSUE_STATUSES[Math.min(idx % 4, 3)];
    const isActive = status === 'bookbuilding' || status === 'announced';
    const orderBook = isActive
      ? Math.round(size * (2 + rng() * 4))
      : status === 'priced' || status === 'allocated'
        ? Math.round(size * (2.5 + rng() * 3.5))
        : 0;
    const oversubscription = orderBook > 0 ? round2(orderBook / size) : 0;

    return {
      issuer: issuer.name,
      ticker: issuer.ticker,
      rating,
      coupon,
      maturity: tenor,
      spread,
      size,
      type,
      currency,
      bookrunner,
      status,
      orderBook,
      oversubscription,
    };
  });

  // --- Pricing Summary (last 8 priced deals) ---
  const pricingIssuers = [...ISSUERS].sort(() => rng() - 0.5).slice(0, 8);
  const pricingSummary = pricingIssuers.map(issuer => {
    const initialGuidance = Math.round(100 + rng() * 150);
    const tightening = Math.round(5 + rng() * 30);
    const finalSpread = initialGuidance - tightening;
    const coupon = round2(3.0 + (finalSpread / 100) + (rng() - 0.5) * 0.6);
    const newIssuePremium = Math.round(5 + rng() * 10);
    const aftermarketPerformance = round2(-3 + rng() * 8);
    const aftermarketSpread = Math.round(finalSpread - aftermarketPerformance);
    const daysToBreakeven = Math.round(5 + rng() * 25);

    return {
      issuer: issuer.name,
      coupon,
      initialGuidance,
      finalSpread,
      tightening,
      newIssuePremium,
      aftermarketSpread,
      aftermarketPerformance,
      daysToBreakeven,
    };
  });

  // --- Pipeline (next 5 mandated but unannounced deals) ---
  const pipelineIssuers = [...ISSUERS].sort(() => rng() - 0.5).slice(0, 5);
  const pipeline = pipelineIssuers.map(issuer => {
    const expectedTenor = pick(TENORS);
    const expectedSize = Math.round((500 + rng() * 3000) / 25) * 25;
    return {
      issuer: issuer.name,
      expectedRating: pick(RATINGS),
      expectedSize,
      expectedTenor: `${expectedTenor}Y`,
      sector: pick(PIPELINE_SECTORS),
      region: pick(REGIONS),
      expectedTiming: pick(PIPELINE_TIMINGS),
    };
  });

  // --- Market Stats ---
  const avgSpread = Math.round(jitter(135, 0.15));
  const avgOversubscription = round2(2.5 + rng() * 2);
  const avgNIP = round2(5 + rng() * 10);
  const spreadTrendOptions = ['tighter', 'wider', 'stable'] as const;
  const spreadTrend = spreadTrendOptions[rng() < 0.4 ? 0 : rng() < 0.7 ? 1 : 2];
  const windowOptions = ['open', 'selective', 'closed'] as const;
  const windowIdx = rng() < 0.55 ? 0 : rng() < 0.85 ? 1 : 2;
  const windowStatus = windowOptions[windowIdx];
  const investorDemandIndex = Math.round(1 + rng() * 9);

  const marketStats = {
    ytdVolume: round2(jitter(520, 0.2)),
    weeklyVolume: round2(jitter(32, 0.3)),
    avgSpread,
    avgOversubscription,
    avgNIP,
    spreadTrend,
    windowStatus,
    investorDemandIndex,
  };

  return {
    newIssues,
    pricingSummary,
    pipeline,
    marketStats,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DCM] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate debt capital markets data' });
  }
});

export default router;
