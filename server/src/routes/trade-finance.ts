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

const CORRIDORS = [
  { corridor: 'China\u2192US', baseVolume: 52, baseLcRate: 85, baseTenor: 90, primaryCommodity: 'Electronics', baseRisk: 4 },
  { corridor: 'China\u2192EU', baseVolume: 48, baseLcRate: 78, baseTenor: 85, primaryCommodity: 'Machinery', baseRisk: 3 },
  { corridor: 'MEast\u2192Asia', baseVolume: 38, baseLcRate: 65, baseTenor: 60, primaryCommodity: 'Crude Oil', baseRisk: 5 },
  { corridor: 'US\u2192EU', baseVolume: 32, baseLcRate: 55, baseTenor: 45, primaryCommodity: 'Pharma', baseRisk: 2 },
  { corridor: 'Japan\u2192China', baseVolume: 22, baseLcRate: 62, baseTenor: 75, primaryCommodity: 'Auto Parts', baseRisk: 3 },
  { corridor: 'Korea\u2192US', baseVolume: 18, baseLcRate: 70, baseTenor: 70, primaryCommodity: 'Semiconductors', baseRisk: 3 },
  { corridor: 'India\u2192UAE', baseVolume: 14, baseLcRate: 110, baseTenor: 95, primaryCommodity: 'Refined Products', baseRisk: 5 },
  { corridor: 'Brazil\u2192China', baseVolume: 16, baseLcRate: 95, baseTenor: 80, primaryCommodity: 'Soybeans', baseRisk: 4 },
  { corridor: 'Germany\u2192US', baseVolume: 20, baseLcRate: 52, baseTenor: 50, primaryCommodity: 'Vehicles', baseRisk: 2 },
  { corridor: 'ASEAN\u2192Japan', baseVolume: 12, baseLcRate: 88, baseTenor: 72, primaryCommodity: 'Electronics', baseRisk: 4 },
];

const INSTRUMENTS = [
  { type: 'Letter of Credit', baseOutstanding: 420, baseRate: 1.15, baseTenor: 90 },
  { type: 'Standby L/C', baseOutstanding: 185, baseRate: 0.85, baseTenor: 365 },
  { type: 'Bank Guarantee', baseOutstanding: 290, baseRate: 0.95, baseTenor: 180 },
  { type: 'Documentary Collection', baseOutstanding: 95, baseRate: 0.35, baseTenor: 60 },
  { type: 'Forfaiting', baseOutstanding: 65, baseRate: 2.80, baseTenor: 270 },
  { type: 'Supply Chain Finance', baseOutstanding: 310, baseRate: 1.45, baseTenor: 120 },
];

const COMMODITY_FLOWS = [
  { commodity: 'Crude Oil', baseVolume: 145, topRoute: 'MEast\u2192Asia', baseFinRate: 1.20 },
  { commodity: 'LNG', baseVolume: 62, topRoute: 'Qatar\u2192Asia', baseFinRate: 1.35 },
  { commodity: 'Iron Ore', baseVolume: 38, topRoute: 'Australia\u2192China', baseFinRate: 1.10 },
  { commodity: 'Copper', baseVolume: 22, topRoute: 'Chile\u2192China', baseFinRate: 1.45 },
  { commodity: 'Soybeans', baseVolume: 18, topRoute: 'Brazil\u2192China', baseFinRate: 1.25 },
  { commodity: 'Gold', baseVolume: 28, topRoute: 'Switzerland\u2192India', baseFinRate: 0.65 },
  { commodity: 'Coal', baseVolume: 32, topRoute: 'Indonesia\u2192China', baseFinRate: 1.50 },
  { commodity: 'Wheat', baseVolume: 12, topRoute: 'US\u2192MEast', baseFinRate: 1.80 },
];

const BANKS = [
  { bank: 'HSBC', baseShare: 14.2, baseLcVolume: 68, baseRate: 0.82, corridorStrength: 'China\u2192EU' },
  { bank: 'Citi', baseShare: 10.8, baseLcVolume: 52, baseRate: 0.90, corridorStrength: 'US\u2192EU' },
  { bank: 'Standard Chartered', baseShare: 11.5, baseLcVolume: 55, baseRate: 0.88, corridorStrength: 'MEast\u2192Asia' },
  { bank: 'JPMorgan', baseShare: 9.2, baseLcVolume: 44, baseRate: 0.95, corridorStrength: 'US\u2192EU' },
  { bank: 'BNP Paribas', baseShare: 7.8, baseLcVolume: 37, baseRate: 1.02, corridorStrength: 'China\u2192EU' },
  { bank: 'Deutsche Bank', baseShare: 6.5, baseLcVolume: 31, baseRate: 1.05, corridorStrength: 'Germany\u2192US' },
  { bank: 'MUFG', baseShare: 7.2, baseLcVolume: 34, baseRate: 0.92, corridorStrength: 'Japan\u2192China' },
  { bank: 'DBS', baseShare: 5.4, baseLcVolume: 26, baseRate: 0.98, corridorStrength: 'ASEAN\u2192Japan' },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-trade-finance'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Summary
  const globalTradeVolume = Math.round(jitter(28.4, 0.06) * 10) / 10;
  const lcOutstanding = Math.round(jitter(820, 0.08));
  const avgLcRate = Math.round(jitter(1.15, 0.10) * 100) / 100;
  const topCorridor = 'China-US';
  const tradeFinanceGap = Math.round(jitter(1700, 0.05));

  const summary = { globalTradeVolume, lcOutstanding, avgLcRate, topCorridor, tradeFinanceGap };

  // Trade corridors
  const corridors = CORRIDORS.map(c => {
    const volume = Math.round(jitter(c.baseVolume, 0.12) * 10) / 10;
    const change1m = Math.round((rng() - 0.48) * 12 * 100) / 100;
    const lcRate = Math.round(jitter(c.baseLcRate, 0.10));
    const avgTenor = Math.round(jitter(c.baseTenor, 0.08));
    const riskScore = Math.min(10, Math.max(1, Math.round(jitter(c.baseRisk, 0.15))));
    return {
      corridor: c.corridor,
      volume,
      change1m,
      lcRate,
      avgTenor,
      primaryCommodity: c.primaryCommodity,
      riskScore,
    };
  });

  // Instruments
  const instruments = INSTRUMENTS.map(inst => {
    const outstanding = Math.round(jitter(inst.baseOutstanding, 0.08));
    const avgRate = Math.round(jitter(inst.baseRate, 0.10) * 100) / 100;
    const avgTenor = Math.round(jitter(inst.baseTenor, 0.06));
    const change1q = Math.round((rng() - 0.47) * 8 * 100) / 100;
    return { type: inst.type, outstanding, avgRate, avgTenor, change1q };
  });

  // Commodity flows
  const commodityFlows = COMMODITY_FLOWS.map(cf => {
    const tradeVolume = Math.round(jitter(cf.baseVolume, 0.12) * 10) / 10;
    const avgFinancingRate = Math.round(jitter(cf.baseFinRate, 0.10) * 100) / 100;
    const change1m = Math.round((rng() - 0.48) * 10 * 100) / 100;
    return {
      commodity: cf.commodity,
      tradeVolume,
      topRoute: cf.topRoute,
      avgFinancingRate,
      change1m,
    };
  });

  // Bank rankings
  const bankRankings = BANKS.map(b => {
    const marketShare = Math.round(jitter(b.baseShare, 0.08) * 10) / 10;
    const lcVolume = Math.round(jitter(b.baseLcVolume, 0.10) * 10) / 10;
    const avgRate = Math.round(jitter(b.baseRate, 0.08) * 100) / 100;
    return {
      bank: b.bank,
      marketShare,
      lcVolume,
      avgRate,
      corridorStrength: b.corridorStrength,
    };
  });

  return { summary, corridors, instruments, commodityFlows, bankRankings, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[TradeFinance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade finance data' });
  }
});

export default router;
