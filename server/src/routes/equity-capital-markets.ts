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

const SECTORS = ['Tech', 'Healthcare', 'Energy', 'Consumer', 'Fintech', 'Biotech', 'AI', 'EV'] as const;
const EXCHANGES = ['NYSE', 'NASDAQ'] as const;
const BOOKRUNNERS = ['Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'BofA Securities', 'Citi'] as const;

const IPO_COMPANIES = [
  { company: 'Nextera Robotics', ticker: 'NXTR', sector: 'AI' },
  { company: 'Ionova Energy Systems', ticker: 'IONV', sector: 'Energy' },
  { company: 'ClearPath Therapeutics', ticker: 'CPTH', sector: 'Biotech' },
  { company: 'Vantage Digital Holdings', ticker: 'VDGH', sector: 'Tech' },
  { company: 'PulsePoint Health', ticker: 'PPHT', sector: 'Healthcare' },
  { company: 'Ember Motors', ticker: 'EMBR', sector: 'EV' },
  { company: 'QuantumLeap Financial', ticker: 'QLFI', sector: 'Fintech' },
  { company: 'SkyBridge Consumer Brands', ticker: 'SKBR', sector: 'Consumer' },
  { company: 'Axiom Cloud Infrastructure', ticker: 'AXCL', sector: 'Tech' },
  { company: 'Meridian BioSciences', ticker: 'MRDB', sector: 'Biotech' },
  { company: 'Lumos Semiconductor', ticker: 'LMSM', sector: 'Tech' },
  { company: 'Horizon Payments', ticker: 'HZPY', sector: 'Fintech' },
];

const SECONDARY_COMPANIES = [
  { company: 'Datadog Inc', ticker: 'DDOG' },
  { company: 'CrowdStrike Holdings', ticker: 'CRWD' },
  { company: 'Snowflake Inc', ticker: 'SNOW' },
  { company: 'Palantir Technologies', ticker: 'PLTR' },
  { company: 'Unity Software', ticker: 'U' },
  { company: 'Cloudflare Inc', ticker: 'NET' },
  { company: 'Block Inc', ticker: 'SQ' },
  { company: 'Rivian Automotive', ticker: 'RIVN' },
  { company: 'Confluent Inc', ticker: 'CFLT' },
  { company: 'SentinelOne Inc', ticker: 'S' },
];

const BLOCK_TRADE_COMPANIES = [
  { company: 'Tesla Inc', ticker: 'TSLA' },
  { company: 'NVIDIA Corp', ticker: 'NVDA' },
  { company: 'Apple Inc', ticker: 'AAPL' },
  { company: 'Amazon.com Inc', ticker: 'AMZN' },
  { company: 'Microsoft Corp', ticker: 'MSFT' },
  { company: 'Meta Platforms', ticker: 'META' },
  { company: 'Alphabet Inc', ticker: 'GOOGL' },
  { company: 'AMD Inc', ticker: 'AMD' },
];

const BLOCK_SELLERS = [
  'SoftBank Group', 'Tiger Global', 'Coatue Management', 'D1 Capital Partners',
  'ARK Invest', 'Baillie Gifford', 'Capital Group', 'Fidelity Management',
  'T. Rowe Price', 'Wellington Management',
];

const OFFER_TYPES = ['follow-on', 'block', 'ATM', 'convertible'] as const;
const IPO_STATUSES = ['filed', 'roadshow', 'priced', 'trading'] as const;

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('ecm-' + day));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // --- IPO Pipeline (8 entries) ---
  const shuffledIPOs = [...IPO_COMPANIES].sort(() => rng() - 0.5).slice(0, 8);
  const ipoPipeline = shuffledIPOs.map((ipo, idx) => {
    const status = IPO_STATUSES[Math.min(idx, 3)];
    const isTrading = status === 'trading';
    const isPriced = status === 'priced' || isTrading;

    const daysOffset = status === 'filed' ? Math.floor(rng() * 30) + 15
      : status === 'roadshow' ? Math.floor(rng() * 14) + 5
      : status === 'priced' ? -Math.floor(rng() * 3)
      : -Math.floor(rng() * 14) - 1;

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + daysOffset);

    const midPrice = Math.round(15 + rng() * 45);
    const spread = Math.round(2 + rng() * 4);
    const priceLow = midPrice - spread;
    const priceHigh = midPrice + spread;

    // Deal size between $200M and $2B
    const dealSize = Math.round(jitter(800, 0.6));
    const clampedDealSize = Math.max(200, Math.min(2000, dealSize));

    const oversubscription = round2(1.5 + rng() * 8.5);

    // First day return: -5% to +30% (only if trading)
    const firstDayReturn = isTrading ? round2(-5 + rng() * 35) : null;

    // Current vs IPO: includes drift after first day (only if trading)
    const currentVsIPO = isTrading
      ? round2((firstDayReturn ?? 0) + (rng() - 0.4) * 15)
      : null;

    return {
      company: ipo.company,
      ticker: ipo.ticker,
      sector: ipo.sector,
      exchange: pick(EXCHANGES),
      expectedDate: expectedDate.toISOString().slice(0, 10),
      priceRange: `$${priceLow} - $${priceHigh}`,
      dealSize: clampedDealSize,
      bookrunner: pick(BOOKRUNNERS),
      status,
      firstDayReturn,
      currentVsIPO,
      oversubscription,
    };
  });

  // --- Secondary Offerings (6 entries) ---
  const shuffledSecondaries = [...SECONDARY_COMPANIES].sort(() => rng() - 0.5).slice(0, 6);
  const secondaryOfferings = shuffledSecondaries.map(s => {
    const offerType = pick(OFFER_TYPES);
    const shares = round2(5 + rng() * 35);
    const offerPrice = round2(30 + rng() * 170);
    const discount = round2(2 + rng() * 6);
    const dealSize = Math.round(shares * offerPrice);

    const daysAgo = Math.floor(rng() * 21);
    const pricingDate = new Date();
    pricingDate.setDate(pricingDate.getDate() - daysAgo);

    const postPricingReturn = round2(-8 + rng() * 16);

    return {
      company: s.company,
      ticker: s.ticker,
      offerType,
      shares: round2(shares),
      offerPrice,
      discount,
      dealSize,
      bookrunner: pick(BOOKRUNNERS),
      pricingDate: pricingDate.toISOString().slice(0, 10),
      postPricingReturn,
    };
  });

  // --- Block Trades (5 entries) ---
  const shuffledBlocks = [...BLOCK_TRADE_COMPANIES].sort(() => rng() - 0.5).slice(0, 5);
  const blockTrades = shuffledBlocks.map(b => {
    const shares = round2(2 + rng() * 18);
    const price = round2(80 + rng() * 320);
    const discount = round2(2 + rng() * 3);
    const totalValue = Math.round(shares * price);

    const hoursAgo = Math.floor(rng() * 72);
    const executionTime = new Date();
    executionTime.setHours(executionTime.getHours() - hoursAgo);

    // Price impact in basis points (typically 20-120 bps)
    const priceImpact = Math.round(20 + rng() * 100);

    return {
      company: b.company,
      ticker: b.ticker,
      seller: pick(BLOCK_SELLERS),
      shares,
      price,
      discount,
      totalValue,
      executionTime: executionTime.toISOString(),
      priceImpact,
    };
  });

  // --- Market Summary ---
  const ytdIPOCount = Math.round(45 + rng() * 60);
  const ytdIPOVolume = round2(jitter(42, 0.3));
  const ytdSecondaryVolume = round2(jitter(68, 0.25));
  const avgFirstDayReturn = round2(jitter(12, 0.4));
  const avgIPODiscount = round2(jitter(15, 0.3));
  const pipelineValue = round2(jitter(28, 0.35));

  // Sector breakdown: top 3 by volume
  const sectorVolumes = SECTORS.map(sector => ({
    sector,
    volume: round2(jitter(8, 0.7)),
  })).sort((a, b) => b.volume - a.volume).slice(0, 3);

  const windowOptions = ['open', 'cautious', 'closed'] as const;
  const windowIdx = rng() < 0.5 ? 0 : rng() < 0.8 ? 1 : 2;
  const windowStatus = windowOptions[windowIdx];

  const marketSummary = {
    ytdIPOCount,
    ytdIPOVolume,
    ytdSecondaryVolume,
    avgFirstDayReturn,
    avgIPODiscount,
    pipelineValue,
    sectorBreakdown: sectorVolumes,
    windowStatus,
  };

  return {
    ipoPipeline,
    secondaryOfferings,
    blockTrades,
    marketSummary,
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
    console.error('[ECM] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity capital markets data' });
  }
});

export default router;
