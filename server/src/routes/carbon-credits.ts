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

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

interface Market {
  id: string;
  name: string;
  region: string;
  currency: string;
  currencySymbol: string;
  price: number;
  priceUSD: number;
  change1d: number;
  change1w: number;
  changeYTD: number;
  volume24h: number;
  openInterest: number;
  allocationCap: number;
  complianceYear: number;
}

const MARKETS_CONFIG = [
  { id: 'eu-ets', name: 'EU ETS', region: 'European Union', currency: 'EUR', symbol: '\u20ac', basePrice: 75, rangeLow: 65, rangeHigh: 85, baseVolume: 42, allocationCap: 1386, complianceYear: 2026 },
  { id: 'uk-ets', name: 'UK ETS', region: 'United Kingdom', currency: 'GBP', symbol: '\u00a3', basePrice: 47, rangeLow: 40, rangeHigh: 55, baseVolume: 8.5, allocationCap: 147, complianceYear: 2026 },
  { id: 'cca', name: 'CCA (California Cap-and-Trade)', region: 'California, USA', currency: 'USD', symbol: '$', basePrice: 34, rangeLow: 30, rangeHigh: 38, baseVolume: 12, allocationCap: 320, complianceYear: 2026 },
  { id: 'rggi', name: 'RGGI', region: 'Northeast USA', currency: 'USD', symbol: '$', basePrice: 15.5, rangeLow: 13, rangeHigh: 18, baseVolume: 5.2, allocationCap: 91, complianceYear: 2026 },
  { id: 'nz-ets', name: 'NZ ETS', region: 'New Zealand', currency: 'NZD', symbol: 'NZ$', basePrice: 62, rangeLow: 55, rangeHigh: 70, baseVolume: 2.8, allocationCap: 33, complianceYear: 2026 },
  { id: 'k-ets', name: 'K-ETS', region: 'South Korea', currency: 'KRW', symbol: '\u20a9', basePrice: 15000, rangeLow: 12000, rangeHigh: 18000, baseVolume: 3.5, allocationCap: 589, complianceYear: 2026 },
  { id: 'cn-ets', name: 'China National ETS', region: 'China', currency: 'CNY', symbol: '\u00a5', basePrice: 68, rangeLow: 55, rangeHigh: 80, baseVolume: 18, allocationCap: 4500, complianceYear: 2026 },
];

const FX_RATES: Record<string, number> = {
  EUR: 1.09,
  GBP: 1.27,
  USD: 1.0,
  NZD: 0.61,
  KRW: 0.00076,
  CNY: 0.14,
};

const OFFSET_TYPES = [
  { id: 'nature-based', name: 'Nature-Based (REDD+, Afforestation)', standard: 'VCS (Verra)', basePriceUSD: 12.5, vintageStart: 2020, vintageEnd: 2025, baseVolume: 185 },
  { id: 'renewable-energy', name: 'Renewable Energy', standard: 'Gold Standard', basePriceUSD: 5.8, vintageStart: 2019, vintageEnd: 2025, baseVolume: 240 },
  { id: 'methane-capture', name: 'Methane Capture', standard: 'ACR (American Carbon Registry)', basePriceUSD: 9.2, vintageStart: 2021, vintageEnd: 2025, baseVolume: 78 },
  { id: 'direct-air-capture', name: 'Direct Air Capture (DAC)', standard: 'Puro.earth', basePriceUSD: 450, vintageStart: 2023, vintageEnd: 2025, baseVolume: 2.1 },
  { id: 'blue-carbon', name: 'Blue Carbon (Mangrove, Seagrass)', standard: 'VCS + CCB', basePriceUSD: 18.5, vintageStart: 2021, vintageEnd: 2025, baseVolume: 12 },
];

const REGULATORY_EVENTS_POOL = [
  { market: 'EU ETS', event: 'Phase 4 Annual Allocation Announcement', impact: 'Neutral' as const },
  { market: 'EU ETS', event: 'EUA Auction — EEX Platform', impact: 'Neutral' as const },
  { market: 'EU ETS', event: 'CBAM Transitional Period Review Deadline', impact: 'Bullish' as const },
  { market: 'UK ETS', event: 'UK Authority Annual Cap Adjustment', impact: 'Bullish' as const },
  { market: 'UK ETS', event: 'Free Allocation Review Publication', impact: 'Bearish' as const },
  { market: 'CCA (California)', event: 'CARB Quarterly Auction', impact: 'Neutral' as const },
  { market: 'CCA (California)', event: 'Compliance Surrender Deadline', impact: 'Bullish' as const },
  { market: 'RGGI', event: 'RGGI Quarterly CO2 Allowance Auction', impact: 'Neutral' as const },
  { market: 'NZ ETS', event: 'NZ EPA Unit Surrender Deadline', impact: 'Bullish' as const },
  { market: 'K-ETS', event: 'Korean Ministry Allocation Plan Release', impact: 'Bearish' as const },
  { market: 'China National ETS', event: 'MEE Compliance Verification Window Opens', impact: 'Bullish' as const },
  { market: 'China National ETS', event: 'National ETS Expansion Announcement (Cement Sector)', impact: 'Bullish' as const },
  { market: 'Voluntary Market', event: 'ICVCM CCP Label Review Update', impact: 'Neutral' as const },
  { market: 'EU ETS', event: 'MSR Intake Rate Annual Review', impact: 'Bearish' as const },
];

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-carbon-credits'));
  const year = new Date().getFullYear();

  const jitter = (base: number, low: number, high: number) => {
    const range = high - low;
    return Math.round((low + rng() * range) * 100) / 100;
  };

  const pctChange = (magnitude: number) => Math.round((rng() - 0.48) * magnitude * 100) / 100;

  // --- Markets ---
  const markets: Market[] = MARKETS_CONFIG.map(m => {
    const price = jitter(m.basePrice, m.rangeLow, m.rangeHigh);
    const priceUSD = Math.round(price * (FX_RATES[m.currency] || 1) * 100) / 100;
    const volumeMultiplier = 0.7 + rng() * 0.6;
    const volume24h = Math.round(m.baseVolume * volumeMultiplier * 1000) / 1000;
    const openInterest = Math.round(volume24h * (2.5 + rng() * 3) * 1000) / 1000;
    return {
      id: m.id,
      name: m.name,
      region: m.region,
      currency: m.currency,
      currencySymbol: m.symbol,
      price,
      priceUSD,
      change1d: pctChange(3),
      change1w: pctChange(6),
      changeYTD: pctChange(25),
      volume24h,
      openInterest,
      allocationCap: m.allocationCap,
      complianceYear: m.complianceYear,
    };
  });

  // --- Summary ---
  const totalMarketValueB = Math.round((680 + rng() * 220) * 10) / 10;
  const avgCarbonPrice = Math.round(markets.reduce((sum, m) => sum + m.priceUSD, 0) / markets.length * 100) / 100;
  const ytdPriceChange = pctChange(20);
  const totalVolumeMtCO2e = Math.round(markets.reduce((sum, m) => sum + m.volume24h, 0) * 100) / 100;
  const summary = {
    globalMarketValueBillionUSD: totalMarketValueB,
    avgCarbonPriceUSD: avgCarbonPrice,
    ytdPriceChangePct: ytdPriceChange,
    totalDailyVolumeMtCO2e: totalVolumeMtCO2e,
    activeMarkets: markets.length,
  };

  // --- EU ETS Futures Curve ---
  const euPrice = markets.find(m => m.id === 'eu-ets')!.price;
  const futuresCurve = Array.from({ length: 5 }, (_, i) => {
    const contractYear = year + i + 1;
    const spread = (i + 1) * (1.2 + rng() * 2.5);
    const isContango = rng() > 0.3;
    const futurePrice = Math.round((euPrice + (isContango ? spread : -spread * 0.4)) * 100) / 100;
    const change = pctChange(4);
    const volume = Math.round((15000 - i * 2500 + rng() * 3000) * 10) / 10;
    return {
      contract: `EU ETS Dec ${contractYear}`,
      expiryMonth: `${contractYear}-12`,
      price: futurePrice,
      currency: 'EUR',
      changePct: change,
      volume,
      structure: isContango ? 'Contango' : 'Backwardation',
      spreadVsSpot: Math.round((futurePrice - euPrice) * 100) / 100,
    };
  });

  // --- Offset Credits (Voluntary Market) ---
  const offsetCredits = OFFSET_TYPES.map(o => {
    const price = Math.round((o.basePriceUSD * (0.85 + rng() * 0.3)) * 100) / 100;
    const volume = Math.round(o.baseVolume * (0.8 + rng() * 0.4) * 10) / 10;
    const change1d = pctChange(4);
    const changeYTD = pctChange(30);
    return {
      id: o.id,
      name: o.name,
      standard: o.standard,
      avgPriceUSD: price,
      change1dPct: change1d,
      changeYTDPct: changeYTD,
      volumeMtCO2e: volume,
      vintageYearRange: `${o.vintageStart}-${o.vintageEnd}`,
    };
  });

  // --- Regulatory Calendar ---
  const shuffled = [...REGULATORY_EVENTS_POOL].sort(() => rng() - 0.5);
  const selectedEvents = shuffled.slice(0, 5);
  const regulatoryCalendar = selectedEvents.map((ev, i) => {
    const daysAhead = 5 + Math.floor(rng() * 85) + i * 15;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + daysAhead);
    return {
      market: ev.market,
      date: eventDate.toISOString().slice(0, 10),
      event: ev.event,
      expectedImpact: ev.impact,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary,
    markets,
    futuresCurve,
    offsetCredits,
    regulatoryCalendar,
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
    console.error('[CarbonCredits] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate carbon credits data' });
  }
});

export default router;
