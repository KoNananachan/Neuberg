import { Router } from 'express';

const router = Router();

// ── Types ──

interface MarketOverview {
  totalOutstanding: number;
  issuanceYTD: number;
  avgSpread: number;
  avgSpreadChange: number;
  avgYield: number;
  maturityWall: string;
}

interface TierBreakdown {
  tier: 'AT1' | 'Tier 2' | 'Legacy T1' | 'Senior Non-Preferred';
  outstanding: number;
  avgSpread: number;
  avgYield: number;
  extensionRisk: 'low' | 'moderate' | 'high';
  callProbability: number;
}

interface BankIssuer {
  issuer: string;
  ticker: string;
  tier: 'AT1' | 'T2';
  coupon: number;
  spread: number;
  spreadChange: number;
  price: number;
  yieldToCall: number;
  callDate: string;
  rating: 'BB+' | 'BBB-' | 'BBB' | 'A-';
  signal: 'attractive' | 'fair' | 'rich' | 'avoid';
}

interface RiskMetrics {
  at1ConversionRisk: number;
  writedownProbability: number;
  maxDistributableAmount: number;
  couponCancellationRisk: 'low' | 'moderate' | 'elevated';
  regulatoryCapitalRatio: number;
  cetBuffer: number;
}

interface SpreadCurvePoint {
  maturity: '2Y' | '3Y' | '5Y' | '7Y' | '10Y';
  at1Spread: number;
  tier2Spread: number;
  seniorSpread: number;
}

interface RecentEvent {
  date: string;
  event: string;
  impact: 'positive' | 'negative' | 'neutral';
  spreadImpact: number;
}

interface SubordinatedDebtResponse {
  marketOverview: MarketOverview;
  tierBreakdown: TierBreakdown[];
  bankIssuers: BankIssuer[];
  riskMetrics: RiskMetrics;
  spreadCurve: SpreadCurvePoint[];
  recentEvents: RecentEvent[];
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Helpers ──

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ── Constants ──

const BANK_ISSUERS = [
  { issuer: 'JPMorgan Chase', ticker: 'JPM' },
  { issuer: 'HSBC Holdings', ticker: 'HSBA' },
  { issuer: 'Deutsche Bank', ticker: 'DBK' },
  { issuer: 'BNP Paribas', ticker: 'BNP' },
  { issuer: 'UBS Group', ticker: 'UBSG' },
  { issuer: 'Barclays', ticker: 'BARC' },
  { issuer: 'Santander', ticker: 'SAN' },
  { issuer: 'ING Group', ticker: 'INGA' },
  { issuer: 'Credit Agricole', ticker: 'ACA' },
  { issuer: 'Societe Generale', ticker: 'GLE' },
  { issuer: 'Standard Chartered', ticker: 'STAN' },
  { issuer: 'Mitsubishi UFJ', ticker: 'MUFG' },
] as const;

const TIER_NAMES: ('AT1' | 'Tier 2' | 'Legacy T1' | 'Senior Non-Preferred')[] = [
  'AT1', 'Tier 2', 'Legacy T1', 'Senior Non-Preferred',
];

const MATURITY_POINTS: ('2Y' | '3Y' | '5Y' | '7Y' | '10Y')[] = [
  '2Y', '3Y', '5Y', '7Y', '10Y',
];

const RATINGS: ('BB+' | 'BBB-' | 'BBB' | 'A-')[] = ['BB+', 'BBB-', 'BBB', 'A-'];

const SIGNALS: ('attractive' | 'fair' | 'rich' | 'avoid')[] = ['attractive', 'fair', 'rich', 'avoid'];

const RECENT_EVENT_TEMPLATES = [
  { event: 'ECB raises countercyclical capital buffer requirements by 50bps', impact: 'negative' as const },
  { event: 'Deutsche Bank AT1 coupon reset at 8.75%, above market expectations', impact: 'positive' as const },
  { event: 'Barclays announces $2B Tier 2 issuance, well oversubscribed at 3.5x', impact: 'positive' as const },
  { event: 'Swiss regulator proposes stricter TLAC requirements for G-SIBs', impact: 'negative' as const },
  { event: 'UBS completes AT1 call at par, reinforcing market confidence', impact: 'positive' as const },
  { event: 'EBA publishes stress test results showing improved capital buffers', impact: 'positive' as const },
  { event: 'Italian bank subordinated spreads widen on fiscal concerns', impact: 'negative' as const },
  { event: 'Fed signals potential Basel III endgame implementation delay', impact: 'positive' as const },
  { event: 'Santander skips AT1 call, extending bond to next reset date', impact: 'negative' as const },
  { event: 'Asian bank AT1 supply surges with $5B in new issuance this week', impact: 'neutral' as const },
  { event: 'MREL shortfall identified for two mid-tier European banks', impact: 'negative' as const },
  { event: 'Credit Suisse AT1 writedown litigation reaches EU court hearing', impact: 'neutral' as const },
];

// ── Data generation ──

function generate(): SubordinatedDebtResponse {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('subordinated-debt-' + today);
  const rng = mulberry32(seed);

  // 1. Market Overview
  const totalOutstanding = round(clamp(2.5 + rng() * 2.0, 2.5, 4.5), 2);
  const issuanceYTD = round(clamp(180 + rng() * 170, 180, 350), 1);
  const avgSpread = round(clamp(200 + rng() * 250, 200, 450), 0);
  const avgSpreadChange = round((rng() - 0.5) * 30, 1);
  const avgYield = round(clamp(5 + rng() * 4, 5, 9), 2);

  const wallStartYear = 2028 + Math.floor(rng() * 3);
  const maturityWall = `${wallStartYear}-${wallStartYear + 2}`;

  const marketOverview: MarketOverview = {
    totalOutstanding,
    issuanceYTD,
    avgSpread,
    avgSpreadChange,
    avgYield,
    maturityWall,
  };

  // 2. Tier Breakdown
  // Base outstanding (billions): AT1 ~250-400, Tier 2 ~800-1200, Legacy T1 ~80-150, SNP ~600-900
  const tierBaseOutstanding = [320, 1000, 110, 750];
  const tierBaseSpread = [380, 220, 300, 150]; // AT1 widest, SNP tightest
  const tierBaseYield = [8.2, 6.1, 7.0, 5.5];

  const tierBreakdown: TierBreakdown[] = TIER_NAMES.map((tier, i) => {
    const outstanding = round(clamp(
      tierBaseOutstanding[i] + (rng() - 0.5) * tierBaseOutstanding[i] * 0.3,
      tierBaseOutstanding[i] * 0.6,
      tierBaseOutstanding[i] * 1.4
    ), 1);

    const tierAvgSpread = round(clamp(
      tierBaseSpread[i] + (rng() - 0.5) * 80,
      tierBaseSpread[i] * 0.7,
      tierBaseSpread[i] * 1.4
    ), 0);

    const tierAvgYield = round(clamp(
      tierBaseYield[i] + (rng() - 0.5) * 1.5,
      tierBaseYield[i] * 0.8,
      tierBaseYield[i] * 1.2
    ), 2);

    const riskVal = rng();
    let extensionRisk: 'low' | 'moderate' | 'high';
    if (tier === 'AT1') {
      extensionRisk = riskVal < 0.3 ? 'low' : riskVal < 0.7 ? 'moderate' : 'high';
    } else if (tier === 'Legacy T1') {
      extensionRisk = riskVal < 0.2 ? 'low' : riskVal < 0.5 ? 'moderate' : 'high';
    } else {
      extensionRisk = riskVal < 0.5 ? 'low' : riskVal < 0.85 ? 'moderate' : 'high';
    }

    const callProbability = round(clamp(
      tier === 'AT1' ? 0.7 + (rng() - 0.5) * 0.4 :
      tier === 'Tier 2' ? 0.85 + (rng() - 0.5) * 0.2 :
      tier === 'Legacy T1' ? 0.5 + (rng() - 0.5) * 0.5 :
      0.9 + (rng() - 0.5) * 0.15,
      0, 1
    ), 2);

    return { tier, outstanding, avgSpread: tierAvgSpread, avgYield: tierAvgYield, extensionRisk, callProbability };
  });

  // 3. Bank Issuers (12 entries)
  const bankIssuers: BankIssuer[] = BANK_ISSUERS.map((bank) => {
    const tier: 'AT1' | 'T2' = rng() < 0.55 ? 'AT1' : 'T2';
    const isAT1 = tier === 'AT1';

    const coupon = round(clamp(
      isAT1 ? 6.5 + (rng() - 0.5) * 4 : 4.5 + (rng() - 0.5) * 3,
      isAT1 ? 4.5 : 3.0,
      isAT1 ? 10.5 : 7.5
    ), 3);

    const spread = round(clamp(
      isAT1 ? 350 + (rng() - 0.5) * 200 : 180 + (rng() - 0.5) * 120,
      isAT1 ? 250 : 120,
      isAT1 ? 550 : 320
    ), 0);

    const spreadChange = round((rng() - 0.5) * 24, 1);

    const price = round(clamp(
      isAT1 ? 92 + (rng() - 0.5) * 16 : 96 + (rng() - 0.5) * 14,
      85, 105
    ), 2);

    const yieldToCall = round(clamp(
      coupon + (100 - price) * 0.15 + (rng() - 0.5) * 0.8,
      isAT1 ? 5.5 : 4.0,
      isAT1 ? 11.0 : 8.0
    ), 2);

    // Call date: 1-5 years from today
    const callYearsOut = 1 + Math.floor(rng() * 5);
    const callDate = new Date();
    callDate.setFullYear(callDate.getFullYear() + callYearsOut);
    // Set to a realistic quarterly date
    const callMonth = [3, 6, 9, 12][Math.floor(rng() * 4)];
    callDate.setMonth(callMonth - 1);
    callDate.setDate(15);
    const callDateStr = callDate.toISOString().slice(0, 10);

    const rating = RATINGS[Math.floor(rng() * RATINGS.length)];

    // Signal based on spread vs historical and price
    const spreadRichness = spread / (isAT1 ? 380 : 200);
    let signal: 'attractive' | 'fair' | 'rich' | 'avoid';
    if (spreadRichness > 1.15 && price < 95) {
      signal = 'attractive';
    } else if (spreadRichness > 1.05) {
      signal = 'fair';
    } else if (spreadRichness < 0.85) {
      signal = 'rich';
    } else {
      const sigRng = rng();
      signal = SIGNALS[Math.floor(sigRng * SIGNALS.length)];
    }

    return {
      issuer: bank.issuer,
      ticker: bank.ticker,
      tier,
      coupon,
      spread,
      spreadChange,
      price,
      yieldToCall,
      callDate: callDateStr,
      rating,
      signal,
    };
  });

  // 4. Risk Metrics
  const at1ConversionRisk = round(clamp(rng() * 0.3 + 0.05, 0, 1), 3);
  const writedownProbability = round(clamp(rng() * 0.12 + 0.01, 0, 0.15), 4);
  const maxDistributableAmount = round(clamp(250 + rng() * 350, 200, 650), 0);

  const cancellationRng = rng();
  let couponCancellationRisk: 'low' | 'moderate' | 'elevated';
  if (cancellationRng < 0.5) couponCancellationRisk = 'low';
  else if (cancellationRng < 0.85) couponCancellationRisk = 'moderate';
  else couponCancellationRisk = 'elevated';

  const regulatoryCapitalRatio = round(clamp(11 + rng() * 5, 11, 16), 2);
  const cetBuffer = round(clamp(200 + rng() * 300, 200, 500), 0);

  const riskMetrics: RiskMetrics = {
    at1ConversionRisk,
    writedownProbability,
    maxDistributableAmount,
    couponCancellationRisk,
    regulatoryCapitalRatio,
    cetBuffer,
  };

  // 5. Spread Curve (5 maturity points)
  // Realistic base spreads: AT1 (300-500), Tier 2 (150-280), Senior (80-160)
  const baseCurveSpreads = {
    at1:    [280, 310, 370, 410, 460],
    tier2:  [140, 160, 200, 240, 270],
    senior: [ 70,  85, 110, 135, 155],
  };

  const spreadCurve: SpreadCurvePoint[] = MATURITY_POINTS.map((maturity, i) => {
    const at1Spread = round(clamp(
      baseCurveSpreads.at1[i] + (rng() - 0.5) * 60,
      baseCurveSpreads.at1[i] * 0.8,
      baseCurveSpreads.at1[i] * 1.25
    ), 0);

    const tier2Spread = round(clamp(
      baseCurveSpreads.tier2[i] + (rng() - 0.5) * 40,
      baseCurveSpreads.tier2[i] * 0.8,
      baseCurveSpreads.tier2[i] * 1.25
    ), 0);

    const seniorSpread = round(clamp(
      baseCurveSpreads.senior[i] + (rng() - 0.5) * 25,
      baseCurveSpreads.senior[i] * 0.75,
      baseCurveSpreads.senior[i] * 1.3
    ), 0);

    return { maturity, at1Spread, tier2Spread, seniorSpread };
  });

  // 6. Recent Events (3 entries)
  // Shuffle and pick 3 events
  const shuffledEvents = [...RECENT_EVENT_TEMPLATES];
  for (let i = shuffledEvents.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledEvents[i], shuffledEvents[j]] = [shuffledEvents[j], shuffledEvents[i]];
  }

  const recentEvents: RecentEvent[] = shuffledEvents.slice(0, 3).map((tmpl, i) => {
    const daysAgo = i * 2 + Math.floor(rng() * 3) + 1;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - daysAgo);
    const dateStr = eventDate.toISOString().slice(0, 10);

    let spreadImpact: number;
    if (tmpl.impact === 'positive') {
      spreadImpact = round(-(5 + rng() * 15), 1);
    } else if (tmpl.impact === 'negative') {
      spreadImpact = round(5 + rng() * 20, 1);
    } else {
      spreadImpact = round((rng() - 0.5) * 6, 1);
    }

    return {
      date: dateStr,
      event: tmpl.event,
      impact: tmpl.impact,
      spreadImpact,
    };
  });

  return {
    marketOverview,
    tierBreakdown,
    bankIssuers,
    riskMetrics,
    spreadCurve,
    recentEvents,
    generatedAt: new Date().toISOString(),
  };
}

// ── Cache (5 min TTL) ──

let cacheData: SubordinatedDebtResponse | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[SubordinatedDebt] Error:', (err as Error).message);
    // Stale fallback
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate subordinated debt data' });
  }
});

export default router;
