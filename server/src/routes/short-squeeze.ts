import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Helpers ──

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ── Types ──

interface HighRiskStock {
  ticker: string;
  name: string;
  shortInterestPct: number;
  daysToCover: number;
  costToBorrow: number;
  utilizationPct: number;
  freeFloat: number;
  siChange1W: number;
  siChange1M: number;
  squeezeScore: number;
}

interface MostShortedStock {
  ticker: string;
  name: string;
  shortInterestPct: number;
  sharesShort: number;
  avgVolume: number;
  daysToCover: number;
  change1W: number;
}

interface CostToBorrowEntry {
  ticker: string;
  name: string;
  status: 'GC' | 'Special';
  feeRate: number;
  availableShares: number;
  utilizationPct: number;
}

interface ShortInterestChange {
  ticker: string;
  name: string;
  previousSI: number;
  currentSI: number;
  changePct: number;
  direction: 'INCREASE' | 'DECREASE';
}

interface SqueezeCandidate {
  ticker: string;
  name: string;
  squeezeScore: number;
  siPct: number;
  daysToCover: number;
  costToBorrow: number;
  gammaExposure: string;
  socialScore: number;
  catalyst: string;
}

interface HistoricalSqueeze {
  ticker: string;
  name: string;
  date: string;
  peakMovePct: number;
  durationDays: number;
  siBefore: number;
  siAfter: number;
  peakPrice: number;
  trigger: string;
}

interface OptionsGammaEntry {
  ticker: string;
  name: string;
  netGammaExposure: number;
  gammaFlip: number;
  currentPrice: number;
  callOI: number;
  putOI: number;
  pcRatio: number;
  dealerPosition: 'SHORT_GAMMA' | 'LONG_GAMMA';
}

interface SocialSentimentEntry {
  ticker: string;
  name: string;
  mentions24h: number;
  mentionChange: number;
  sentimentScore: number;
  topPlatform: string;
  narrative: string;
  trendingRank: number;
}

interface ShortSqueezeResponse {
  highRiskStocks: HighRiskStock[];
  mostShorted: MostShortedStock[];
  costToBorrow: CostToBorrowEntry[];
  shortInterestChanges: ShortInterestChange[];
  squeezeCandidates: SqueezeCandidate[];
  historicalSqueezes: HistoricalSqueeze[];
  optionsGamma: OptionsGammaEntry[];
  socialSentiment: SocialSentimentEntry[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: ShortSqueezeResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Stock universe ──

interface StockConfig {
  ticker: string;
  name: string;
  baseSI: number;
  baseDTC: number;
  baseCTB: number;
  baseUtil: number;
  freeFloat: number;
  avgVolume: number;
}

const STOCK_UNIVERSE: StockConfig[] = [
  { ticker: 'GME', name: 'GameStop Corp', baseSI: 24.5, baseDTC: 3.8, baseCTB: 32.5, baseUtil: 91.2, freeFloat: 305.2, avgVolume: 8200000 },
  { ticker: 'AMC', name: 'AMC Entertainment', baseSI: 21.3, baseDTC: 2.1, baseCTB: 18.7, baseUtil: 85.4, freeFloat: 516.8, avgVolume: 25100000 },
  { ticker: 'BBBY', name: 'Bed Bath & Beyond', baseSI: 42.8, baseDTC: 5.2, baseCTB: 65.3, baseUtil: 98.1, freeFloat: 79.6, avgVolume: 4500000 },
  { ticker: 'CVNA', name: 'Carvana Co', baseSI: 36.2, baseDTC: 4.5, baseCTB: 48.9, baseUtil: 94.7, freeFloat: 106.3, avgVolume: 7800000 },
  { ticker: 'BYND', name: 'Beyond Meat Inc', baseSI: 38.7, baseDTC: 6.1, baseCTB: 55.2, baseUtil: 96.3, freeFloat: 63.8, avgVolume: 3200000 },
  { ticker: 'FFIE', name: 'Faraday Future', baseSI: 31.5, baseDTC: 1.8, baseCTB: 142.5, baseUtil: 99.2, freeFloat: 42.1, avgVolume: 12500000 },
  { ticker: 'MARA', name: 'Marathon Digital', baseSI: 19.8, baseDTC: 2.4, baseCTB: 12.3, baseUtil: 78.6, freeFloat: 162.5, avgVolume: 18700000 },
  { ticker: 'RIVN', name: 'Rivian Automotive', baseSI: 15.2, baseDTC: 3.1, baseCTB: 8.5, baseUtil: 72.3, freeFloat: 845.6, avgVolume: 22400000 },
  { ticker: 'SPCE', name: 'Virgin Galactic', baseSI: 28.4, baseDTC: 3.9, baseCTB: 35.8, baseUtil: 89.5, freeFloat: 261.3, avgVolume: 6100000 },
  { ticker: 'UPST', name: 'Upstart Holdings', baseSI: 33.6, baseDTC: 4.7, baseCTB: 42.1, baseUtil: 93.8, freeFloat: 83.4, avgVolume: 5600000 },
  { ticker: 'LCID', name: 'Lucid Group', baseSI: 14.8, baseDTC: 1.9, baseCTB: 6.2, baseUtil: 65.4, freeFloat: 1820.5, avgVolume: 31200000 },
  { ticker: 'PLUG', name: 'Plug Power Inc', baseSI: 17.6, baseDTC: 2.8, baseCTB: 9.8, baseUtil: 74.1, freeFloat: 596.2, avgVolume: 14800000 },
  { ticker: 'COIN', name: 'Coinbase Global', baseSI: 12.4, baseDTC: 2.2, baseCTB: 5.3, baseUtil: 58.7, freeFloat: 194.3, avgVolume: 9800000 },
  { ticker: 'NKLA', name: 'Nikola Corp', baseSI: 26.1, baseDTC: 3.3, baseCTB: 28.7, baseUtil: 87.2, freeFloat: 478.9, avgVolume: 8900000 },
  { ticker: 'WKHS', name: 'Workhorse Group', baseSI: 29.3, baseDTC: 4.1, baseCTB: 38.4, baseUtil: 91.8, freeFloat: 168.7, avgVolume: 3800000 },
  { ticker: 'SKLZ', name: 'Skillz Inc', baseSI: 22.7, baseDTC: 3.5, baseCTB: 22.4, baseUtil: 82.6, freeFloat: 388.4, avgVolume: 5200000 },
  { ticker: 'WISH', name: 'ContextLogic Inc', baseSI: 18.9, baseDTC: 2.6, baseCTB: 14.2, baseUtil: 76.3, freeFloat: 625.1, avgVolume: 7100000 },
  { ticker: 'CLOV', name: 'Clover Health', baseSI: 16.5, baseDTC: 2.3, baseCTB: 10.8, baseUtil: 71.5, freeFloat: 412.6, avgVolume: 9400000 },
  { ticker: 'GOEV', name: 'Canoo Inc', baseSI: 34.8, baseDTC: 5.5, baseCTB: 58.7, baseUtil: 97.1, freeFloat: 55.2, avgVolume: 2800000 },
  { ticker: 'OPEN', name: 'Opendoor Technologies', baseSI: 20.4, baseDTC: 3.0, baseCTB: 15.6, baseUtil: 79.8, freeFloat: 612.8, avgVolume: 11300000 },
  { ticker: 'ASTS', name: 'AST SpaceMobile', baseSI: 25.6, baseDTC: 4.2, baseCTB: 30.1, baseUtil: 88.4, freeFloat: 175.3, avgVolume: 4700000 },
  { ticker: 'IRNT', name: 'IronNet Cybersecurity', baseSI: 31.2, baseDTC: 5.8, baseCTB: 72.4, baseUtil: 97.8, freeFloat: 28.9, avgVolume: 1900000 },
  { ticker: 'MVIS', name: 'MicroVision Inc', baseSI: 23.1, baseDTC: 3.4, baseCTB: 19.5, baseUtil: 83.9, freeFloat: 196.4, avgVolume: 6700000 },
  { ticker: 'BGFV', name: 'Big 5 Sporting Goods', baseSI: 35.4, baseDTC: 7.2, baseCTB: 45.3, baseUtil: 95.6, freeFloat: 22.1, avgVolume: 1200000 },
  { ticker: 'PROG', name: 'Progenity Inc', baseSI: 27.8, baseDTC: 2.9, baseCTB: 25.6, baseUtil: 86.1, freeFloat: 142.7, avgVolume: 8600000 },
  { ticker: 'SDC', name: 'SmileDirectClub', baseSI: 30.5, baseDTC: 4.8, baseCTB: 52.1, baseUtil: 96.2, freeFloat: 118.5, avgVolume: 4100000 },
  { ticker: 'SOS', name: 'SOS Limited', baseSI: 19.2, baseDTC: 1.5, baseCTB: 11.4, baseUtil: 73.8, freeFloat: 285.6, avgVolume: 15200000 },
  { ticker: 'TTCF', name: 'Tattooed Chef Inc', baseSI: 32.9, baseDTC: 5.9, baseCTB: 61.8, baseUtil: 97.5, freeFloat: 81.3, avgVolume: 2600000 },
  { ticker: 'ATER', name: 'Aterian Inc', baseSI: 37.1, baseDTC: 6.4, baseCTB: 78.3, baseUtil: 98.4, freeFloat: 34.5, avgVolume: 3100000 },
  { ticker: 'BBIG', name: 'Vinco Ventures', baseSI: 26.8, baseDTC: 3.6, baseCTB: 33.2, baseUtil: 90.3, freeFloat: 205.4, avgVolume: 7400000 },
];

// ── Catalysts for squeeze candidates ──

const CATALYSTS = [
  'Options gamma ramp approaching',
  'FTD cycle T+35 due',
  'Earnings surprise potential',
  'Reg SHO threshold list',
  'High CTB + low availability',
  'Social media momentum building',
  'Institutional accumulation detected',
  'Short ladder attack exhaustion',
  'Unusual call option volume',
  'Share buyback announced',
  'Insider buying cluster',
  'Sector rotation catalyst',
  'Technical breakout imminent',
  'DRS movement reducing float',
  'Convertible note deadline approaching',
];

// ── Social platforms & narratives ──

const PLATFORMS = ['Reddit/WSB', 'Twitter/FinTwit', 'StockTwits', 'Discord', 'TikTok', 'Reddit/Superstonk'];

const NARRATIVES = [
  'Squeeze play - high SI and rising CTB',
  'DRS reducing available float',
  'FTD cycle approaching settlement',
  'Gamma squeeze setup with OI ramp',
  'Retail accumulation vs institutional shorts',
  'Turnaround story attracting new longs',
  'Sector sympathy play',
  'Meme stock revival momentum',
  'Options chain loaded with near-money calls',
  'Short seller report rebuttal rally',
];

// ── Data generation ──

function generateHighRiskStocks(rng: () => number): HighRiskStock[] {
  // Select top 12 by base squeeze potential and add jitter
  const sorted = [...STOCK_UNIVERSE].sort((a, b) => {
    const scoreA = a.baseSI * 0.3 + a.baseDTC * 5 + a.baseCTB * 0.1 + a.baseUtil * 0.2;
    const scoreB = b.baseSI * 0.3 + b.baseDTC * 5 + b.baseCTB * 0.1 + b.baseUtil * 0.2;
    return scoreB - scoreA;
  });

  return sorted.slice(0, 12).map((cfg) => {
    const siJitter = (rng() - 0.5) * cfg.baseSI * 0.15;
    const shortInterestPct = round(cfg.baseSI + siJitter, 1);

    const dtcJitter = (rng() - 0.5) * cfg.baseDTC * 0.2;
    const daysToCover = round(Math.max(0.5, cfg.baseDTC + dtcJitter), 1);

    const ctbJitter = (rng() - 0.5) * cfg.baseCTB * 0.2;
    const costToBorrow = round(Math.max(0.5, cfg.baseCTB + ctbJitter), 1);

    const utilJitter = (rng() - 0.5) * 6;
    const utilizationPct = round(Math.min(100, Math.max(40, cfg.baseUtil + utilJitter)), 1);

    const floatJitter = (rng() - 0.5) * cfg.freeFloat * 0.05;
    const freeFloat = round(cfg.freeFloat + floatJitter, 1);

    const siChange1W = round((rng() - 0.4) * 5, 1); // slight upward bias
    const siChange1M = round((rng() - 0.4) * 12, 1);

    // Squeeze score: composite of SI%, DTC, CTB, utilization
    const rawScore = shortInterestPct * 0.25 + daysToCover * 6 + Math.min(costToBorrow, 100) * 0.15 + utilizationPct * 0.3;
    const squeezeScore = Math.round(Math.min(100, Math.max(0, rawScore + (rng() - 0.5) * 10)));

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      shortInterestPct,
      daysToCover,
      costToBorrow,
      utilizationPct,
      freeFloat,
      siChange1W,
      siChange1M,
      squeezeScore,
    };
  });
}

function generateMostShorted(rng: () => number): MostShortedStock[] {
  const sorted = [...STOCK_UNIVERSE].sort((a, b) => b.baseSI - a.baseSI);

  return sorted.slice(0, 20).map((cfg) => {
    const siJitter = (rng() - 0.5) * cfg.baseSI * 0.12;
    const shortInterestPct = round(cfg.baseSI + siJitter, 1);

    const sharesShortM = cfg.freeFloat * (shortInterestPct / 100);
    const sharesShort = Math.round(sharesShortM * 1_000_000);

    const volJitter = (rng() - 0.5) * cfg.avgVolume * 0.2;
    const avgVolume = Math.round(cfg.avgVolume + volJitter);

    const daysToCover = round(sharesShort / avgVolume, 1);
    const change1W = round((rng() - 0.45) * 6, 1);

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      shortInterestPct,
      sharesShort,
      avgVolume,
      daysToCover,
      change1W,
    };
  });
}

function generateCostToBorrow(rng: () => number): CostToBorrowEntry[] {
  const sorted = [...STOCK_UNIVERSE].sort((a, b) => b.baseCTB - a.baseCTB);

  return sorted.slice(0, 15).map((cfg) => {
    const ctbJitter = (rng() - 0.5) * cfg.baseCTB * 0.2;
    const feeRate = round(Math.max(0.25, cfg.baseCTB + ctbJitter), 1);

    const status: 'GC' | 'Special' = feeRate > 20 ? 'Special' : 'GC';

    const utilJitter = (rng() - 0.5) * 5;
    const utilizationPct = round(Math.min(100, Math.max(30, cfg.baseUtil + utilJitter)), 1);

    // Available shares inversely related to utilization
    const totalShares = cfg.freeFloat * 1_000_000;
    const availablePct = (100 - utilizationPct) / 100;
    const availableShares = Math.round(totalShares * availablePct * (0.1 + rng() * 0.15));

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      status,
      feeRate,
      availableShares,
      utilizationPct,
    };
  });
}

function generateShortInterestChanges(rng: () => number): ShortInterestChange[] {
  // Shuffle the universe and pick 16 stocks (8 increases, 8 decreases)
  const shuffled = [...STOCK_UNIVERSE].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 16);

  return selected.map((cfg, idx) => {
    const isIncrease = idx < 8;
    const changeMagnitude = (rng() * 8 + 1.5) * (isIncrease ? 1 : -1);
    const previousSI = round(cfg.baseSI - changeMagnitude / 2, 1);
    const currentSI = round(cfg.baseSI + changeMagnitude / 2, 1);
    const changePct = round(currentSI - previousSI, 1);

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      previousSI: round(Math.max(0.5, previousSI), 1),
      currentSI: round(Math.max(0.5, currentSI), 1),
      changePct,
      direction: changePct >= 0 ? 'INCREASE' as const : 'DECREASE' as const,
    };
  }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

function generateSqueezeCandidates(rng: () => number): SqueezeCandidate[] {
  const sorted = [...STOCK_UNIVERSE].sort((a, b) => {
    const scoreA = a.baseSI * 0.2 + a.baseDTC * 8 + a.baseCTB * 0.15 + a.baseUtil * 0.25;
    const scoreB = b.baseSI * 0.2 + b.baseDTC * 8 + b.baseCTB * 0.15 + b.baseUtil * 0.25;
    return scoreB - scoreA;
  });

  return sorted.slice(0, 10).map((cfg) => {
    const siJitter = (rng() - 0.5) * cfg.baseSI * 0.1;
    const siPct = round(cfg.baseSI + siJitter, 1);

    const dtcJitter = (rng() - 0.5) * cfg.baseDTC * 0.15;
    const daysToCover = round(Math.max(0.5, cfg.baseDTC + dtcJitter), 1);

    const ctbJitter = (rng() - 0.5) * cfg.baseCTB * 0.15;
    const costToBorrow = round(Math.max(0.5, cfg.baseCTB + ctbJitter), 1);

    const gammaVal = round((rng() * 80 + 10) * (rng() > 0.5 ? 1 : -1), 0);
    const gammaExposure = (gammaVal > 0 ? '+' : '') + '$' + Math.abs(gammaVal) + 'M';

    const socialScore = round(rng() * 60 + 40, 0);

    const rawScore = siPct * 0.2 + daysToCover * 7 + Math.min(costToBorrow, 100) * 0.12 + socialScore * 0.15 + (gammaVal < 0 ? 10 : 0);
    const squeezeScore = Math.round(Math.min(100, Math.max(10, rawScore + (rng() - 0.5) * 8)));

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      squeezeScore,
      siPct,
      daysToCover,
      costToBorrow,
      gammaExposure,
      socialScore,
      catalyst: pick(rng, CATALYSTS),
    };
  }).sort((a, b) => b.squeezeScore - a.squeezeScore);
}

function generateHistoricalSqueezes(): HistoricalSqueeze[] {
  return [
    {
      ticker: 'GME',
      name: 'GameStop Corp',
      date: '2021-01-28',
      peakMovePct: 1740,
      durationDays: 18,
      siBefore: 140.0,
      siAfter: 30.2,
      peakPrice: 483.0,
      trigger: 'Reddit/WSB retail short squeeze; brokers halted buying',
    },
    {
      ticker: 'AMC',
      name: 'AMC Entertainment',
      date: '2021-06-02',
      peakMovePct: 536,
      durationDays: 12,
      siBefore: 28.7,
      siAfter: 14.5,
      peakPrice: 72.62,
      trigger: 'Meme stock sympathy rally; retail coordination',
    },
    {
      ticker: 'TSLA',
      name: 'Tesla Inc',
      date: '2020-01-13',
      peakMovePct: 264,
      durationDays: 45,
      siBefore: 18.4,
      siAfter: 7.1,
      peakPrice: 968.99,
      trigger: 'S&P 500 inclusion anticipation; earnings beat',
    },
    {
      ticker: 'VW',
      name: 'Volkswagen AG',
      date: '2008-10-28',
      peakMovePct: 382,
      durationDays: 4,
      siBefore: 12.8,
      siAfter: 1.2,
      peakPrice: 1005.0,
      trigger: 'Porsche disclosed 74% ownership; free float collapsed',
    },
    {
      ticker: 'DGAZF',
      name: 'VelocityShares 3x Inv NG',
      date: '2020-08-24',
      peakMovePct: 11950,
      durationDays: 3,
      siBefore: 85.0,
      siAfter: 5.0,
      peakPrice: 24000.0,
      trigger: 'Issuer delisting announcement; shorts trapped',
    },
    {
      ticker: 'OSTK',
      name: 'Overstock.com',
      date: '2020-08-19',
      peakMovePct: 1350,
      durationDays: 25,
      siBefore: 37.5,
      siAfter: 8.3,
      peakPrice: 128.5,
      trigger: 'Digital dividend via tZERO; naked shorts forced to cover',
    },
    {
      ticker: 'KBIO',
      name: 'KaloBios Pharmaceuticals',
      date: '2015-11-18',
      peakMovePct: 800,
      durationDays: 5,
      siBefore: 45.2,
      siAfter: 3.1,
      peakPrice: 45.0,
      trigger: 'Martin Shkreli hostile takeover; shares recalled from lending',
    },
    {
      ticker: 'AAOI',
      name: 'Applied Optoelectronics',
      date: '2017-05-09',
      peakMovePct: 285,
      durationDays: 60,
      siBefore: 41.3,
      siAfter: 18.7,
      peakPrice: 93.36,
      trigger: 'Multiple earnings beats; analyst upgrades cascade',
    },
  ];
}

function generateOptionsGamma(rng: () => number): OptionsGammaEntry[] {
  const selected = [...STOCK_UNIVERSE]
    .sort((a, b) => b.baseSI - a.baseSI)
    .slice(0, 15)
    .sort(() => rng() - 0.5)
    .slice(0, 10);

  return selected.map((cfg) => {
    // Notional gamma exposure in $M (negative = dealer short gamma = amplifies moves)
    const netGamma = round((rng() * 120 - 80), 1); // bias toward short gamma
    const netGammaExposure = round(netGamma, 1);

    const currentPrice = round(5 + rng() * 195, 2);
    const gammaFlip = round(currentPrice * (0.85 + rng() * 0.35), 2);

    const callOI = Math.round(50000 + rng() * 450000);
    const putOI = Math.round(30000 + rng() * 300000);
    const pcRatio = round(putOI / callOI, 2);

    const dealerPosition: 'SHORT_GAMMA' | 'LONG_GAMMA' = netGammaExposure < 0 ? 'SHORT_GAMMA' : 'LONG_GAMMA';

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      netGammaExposure,
      gammaFlip,
      currentPrice,
      callOI,
      putOI,
      pcRatio,
      dealerPosition,
    };
  });
}

function generateSocialSentiment(rng: () => number): SocialSentimentEntry[] {
  const selected = [...STOCK_UNIVERSE]
    .sort(() => rng() - 0.5)
    .slice(0, 12);

  return selected.map((cfg, idx) => {
    const mentions24h = Math.round(500 + rng() * 24500);
    const mentionChange = round((rng() - 0.3) * 200, 0); // bias toward positive change
    const sentimentScore = round(rng() * 60 + 30, 0); // 30-90 range
    const topPlatform = pick(rng, PLATFORMS);
    const narrative = pick(rng, NARRATIVES);
    const trendingRank = idx + 1;

    return {
      ticker: cfg.ticker,
      name: cfg.name,
      mentions24h,
      mentionChange,
      sentimentScore,
      topPlatform,
      narrative,
      trendingRank,
    };
  }).sort((a, b) => b.mentions24h - a.mentions24h);
}

function generateShortSqueezeData(): ShortSqueezeResponse {
  const rng = seededRandom('short-squeeze');

  const highRiskStocks = generateHighRiskStocks(rng);
  const mostShorted = generateMostShorted(rng);
  const costToBorrow = generateCostToBorrow(rng);
  const shortInterestChanges = generateShortInterestChanges(rng);
  const squeezeCandidates = generateSqueezeCandidates(rng);
  const historicalSqueezes = generateHistoricalSqueezes();
  const optionsGamma = generateOptionsGamma(rng);
  const socialSentiment = generateSocialSentiment(rng);

  return {
    highRiskStocks,
    mostShorted,
    costToBorrow,
    shortInterestChanges,
    squeezeCandidates,
    historicalSqueezes,
    optionsGamma,
    socialSentiment,
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

    const data = generateShortSqueezeData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ShortSqueeze] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate short squeeze data' });
  }
});

export default router;
