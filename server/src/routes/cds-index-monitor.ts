import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Static Definitions --

interface IndexDef {
  name: string;
  ticker: string;
  region: string;
  series: number;
  maturity: string;
  coupon: number;
  baseSpread: number;
  baseRecovery: number;
  baseVolume: number;
  baseOpenInterest: number;
}

const INDEX_DEFS: IndexDef[] = [
  { name: 'CDX North America Investment Grade', ticker: 'CDX.NA.IG', region: 'North America', series: 42, maturity: '5Y', coupon: 100, baseSpread: 58, baseRecovery: 40, baseVolume: 28.5, baseOpenInterest: 142.0 },
  { name: 'CDX North America High Yield', ticker: 'CDX.NA.HY', region: 'North America', series: 42, maturity: '5Y', coupon: 500, baseSpread: 395, baseRecovery: 35, baseVolume: 12.3, baseOpenInterest: 68.0 },
  { name: 'CDX Emerging Markets', ticker: 'CDX.EM', region: 'Emerging Markets', series: 41, maturity: '5Y', coupon: 500, baseSpread: 210, baseRecovery: 25, baseVolume: 6.8, baseOpenInterest: 32.5 },
  { name: 'iTraxx Europe Main', ticker: 'ITRAXX.EUR', region: 'Europe', series: 41, maturity: '5Y', coupon: 100, baseSpread: 62, baseRecovery: 40, baseVolume: 22.0, baseOpenInterest: 118.0 },
  { name: 'iTraxx Europe Crossover', ticker: 'ITRAXX.XOVER', region: 'Europe', series: 41, maturity: '5Y', coupon: 500, baseSpread: 320, baseRecovery: 35, baseVolume: 8.5, baseOpenInterest: 45.0 },
  { name: 'iTraxx Asia ex-Japan', ticker: 'ITRAXX.ASIA', region: 'Asia', series: 41, maturity: '5Y', coupon: 100, baseSpread: 88, baseRecovery: 35, baseVolume: 4.2, baseOpenInterest: 21.0 },
];

interface TrancheDef {
  attachment: number;
  detachment: number;
  baseSpread: number;
  isUpfront: boolean;
  baseCorrelation: number;
  baseDelta: number;
}

const TRANCHE_DEFS: TrancheDef[] = [
  { attachment: 0, detachment: 3, baseSpread: 0, isUpfront: true, baseCorrelation: 22.5, baseDelta: 15.8 },
  { attachment: 3, detachment: 7, baseSpread: 185, isUpfront: false, baseCorrelation: 34.0, baseDelta: 8.2 },
  { attachment: 7, detachment: 15, baseSpread: 42, isUpfront: false, baseCorrelation: 48.5, baseDelta: 3.6 },
  { attachment: 15, detachment: 100, baseSpread: 8, isUpfront: false, baseCorrelation: 72.0, baseDelta: 0.5 },
];

interface CreditEventDef {
  entity: string;
  eventType: 'Bankruptcy' | 'Restructuring' | 'Failure to Pay';
  sector: string;
  baseRecovery: number;
  baseNotional: number;
}

const CREDIT_EVENT_POOL: CreditEventDef[] = [
  { entity: 'Rite Aid Corp', eventType: 'Bankruptcy', sector: 'Retail', baseRecovery: 3.5, baseNotional: 420 },
  { entity: 'Envision Healthcare', eventType: 'Bankruptcy', sector: 'Healthcare', baseRecovery: 12.0, baseNotional: 680 },
  { entity: 'Incora (Wesco Aircraft)', eventType: 'Restructuring', sector: 'Aerospace & Defense', baseRecovery: 28.5, baseNotional: 310 },
  { entity: 'Diamond Sports Group', eventType: 'Bankruptcy', sector: 'Media & Entertainment', baseRecovery: 5.2, baseNotional: 520 },
  { entity: 'Lumen Technologies', eventType: 'Failure to Pay', sector: 'Telecommunications', baseRecovery: 42.0, baseNotional: 890 },
  { entity: 'Mallinckrodt Pharmaceuticals', eventType: 'Bankruptcy', sector: 'Pharmaceuticals', baseRecovery: 18.0, baseNotional: 560 },
  { entity: 'Hertz Global Holdings', eventType: 'Restructuring', sector: 'Transportation', baseRecovery: 55.0, baseNotional: 740 },
  { entity: 'Revlon Inc', eventType: 'Bankruptcy', sector: 'Consumer Products', baseRecovery: 8.3, baseNotional: 280 },
  { entity: 'Voyager Aviation', eventType: 'Failure to Pay', sector: 'Aviation Leasing', baseRecovery: 22.0, baseNotional: 450 },
  { entity: 'Cineworld Group', eventType: 'Restructuring', sector: 'Entertainment', baseRecovery: 31.0, baseNotional: 380 },
];

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const rng = seededRandom('cds-index-monitor');
  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  const round1 = (n: number): number => Math.round(n * 10) / 10;

  // 1. Indices
  const indices = INDEX_DEFS.map((def) => {
    const spread = round2(jitter(def.baseSpread, 0.08));
    const change1d = round2((rng() - 0.5) * def.baseSpread * 0.04);
    const change1w = round2((rng() - 0.5) * def.baseSpread * 0.08);
    const change1m = round2((rng() - 0.5) * def.baseSpread * 0.14);
    // Implied default probability: simplified from spread / (1 - recovery) / 10000 * maturityYears
    const maturityYears = def.maturity === '5Y' ? 5 : 10;
    const impliedDefault = round2((spread / 10000) / (1 - def.baseRecovery / 100) * maturityYears * 100);
    const recovery = round1(jitter(def.baseRecovery, 0.03));
    const volume = round1(jitter(def.baseVolume, 0.2));
    const openInterest = round1(jitter(def.baseOpenInterest, 0.05));

    return {
      name: def.name,
      ticker: def.ticker,
      region: def.region,
      spread,
      change1d,
      change1w,
      change1m,
      series: def.series,
      maturity: def.maturity,
      coupon: def.coupon,
      impliedDefault,
      recovery,
      volume,
      openInterest,
    };
  });

  // 2. CDX.NA.IG Tranches
  const tranches = TRANCHE_DEFS.map((def) => {
    const label = `${def.attachment}-${def.detachment}%`;
    const correlation = round2(jitter(def.baseCorrelation, 0.06));
    const delta = round2(jitter(def.baseDelta, 0.08));

    if (def.isUpfront) {
      // Equity tranche quoted as upfront %
      const upfrontPct = round2(25 + rng() * 20);
      return {
        label,
        attachment: def.attachment,
        detachment: def.detachment,
        spread: 500,
        upfrontPct,
        correlation,
        delta,
      };
    }

    const spread = round2(jitter(def.baseSpread, 0.1));
    return {
      label,
      attachment: def.attachment,
      detachment: def.detachment,
      spread,
      upfrontPct: 0,
      correlation,
      delta,
    };
  });

  // 3. Recent Credit Events
  // Pick 5 from the pool deterministically
  const shuffled = [...CREDIT_EVENT_POOL].sort((a, b) => {
    return rng() - 0.5;
  });
  const selectedEvents = shuffled.slice(0, 5);

  const recentEvents = selectedEvents.map((ev, i) => {
    const daysAgo = Math.floor(rng() * 60) + 1;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - daysAgo);
    const recoveryRate = round1(jitter(ev.baseRecovery, 0.15));
    const notionalAffected = round1(jitter(ev.baseNotional, 0.1));

    return {
      entity: ev.entity,
      date: eventDate.toISOString().slice(0, 10),
      eventType: ev.eventType,
      sector: ev.sector,
      recoveryRate: Math.max(0, Math.min(100, recoveryRate)),
      notionalAffected,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // 4. Summary
  const igIdx = indices.find((idx) => idx.ticker === 'CDX.NA.IG');
  const hyIdx = indices.find((idx) => idx.ticker === 'CDX.NA.HY');
  const emIdx = indices.find((idx) => idx.ticker === 'CDX.EM');

  const igSpread = igIdx?.spread ?? 0;
  const hySpread = hyIdx?.spread ?? 0;
  const emSpread = emIdx?.spread ?? 0;
  const igChange1w = igIdx?.change1w ?? 0;
  const hyChange1w = hyIdx?.change1w ?? 0;
  const avgImpliedDefault = round2(
    indices.reduce((sum, idx) => sum + idx.impliedDefault, 0) / indices.length
  );

  const summary = {
    igSpread,
    hySpread,
    emSpread,
    igChange1w,
    hyChange1w,
    avgImpliedDefault,
  };

  return {
    indices,
    tranches,
    recentEvents,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CDSIndexMonitor] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate CDS index monitor data' });
  }
});

export default router;
