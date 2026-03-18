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

// ── Static configs ──

const COUPON_LEVELS = [
  { coupon: 2.0, basePrice: 80.5,  baseSpread: 285, baseOAS: 210, baseDuration: 8.2, baseCPR: 3.5,  baseConvexity: -3.8 },
  { coupon: 2.5, basePrice: 84.25, baseSpread: 260, baseOAS: 190, baseDuration: 7.8, baseCPR: 4.2,  baseConvexity: -3.4 },
  { coupon: 3.0, basePrice: 88.0,  baseSpread: 235, baseOAS: 170, baseDuration: 7.2, baseCPR: 5.0,  baseConvexity: -3.0 },
  { coupon: 3.5, basePrice: 91.5,  baseSpread: 210, baseOAS: 150, baseDuration: 6.5, baseCPR: 5.8,  baseConvexity: -2.6 },
  { coupon: 4.0, basePrice: 94.75, baseSpread: 185, baseOAS: 130, baseDuration: 5.9, baseCPR: 7.0,  baseConvexity: -2.2 },
  { coupon: 4.5, basePrice: 97.5,  baseSpread: 165, baseOAS: 112, baseDuration: 5.3, baseCPR: 8.5,  baseConvexity: -1.9 },
  { coupon: 5.0, basePrice: 99.75, baseSpread: 148, baseOAS: 95,  baseDuration: 4.8, baseCPR: 10.5, baseConvexity: -1.5 },
  { coupon: 5.5, basePrice: 101.5, baseSpread: 138, baseOAS: 82,  baseDuration: 4.2, baseCPR: 13.0, baseConvexity: -1.2 },
];

const SETTLEMENT_MONTHS = 3;

const PREPAY_CONFIGS = [
  { vintage: 2020, coupon: 2.5, baseCPR1m: 3.8,  baseCPR3m: 4.0,  baseCPR6m: 4.2,  baseCPR12m: 4.5,  baseFactor: 0.72 },
  { vintage: 2020, coupon: 3.0, baseCPR1m: 5.5,  baseCPR3m: 5.8,  baseCPR6m: 6.0,  baseCPR12m: 6.5,  baseFactor: 0.65 },
  { vintage: 2021, coupon: 2.5, baseCPR1m: 4.2,  baseCPR3m: 4.5,  baseCPR6m: 4.8,  baseCPR12m: 5.0,  baseFactor: 0.75 },
  { vintage: 2021, coupon: 3.0, baseCPR1m: 6.0,  baseCPR3m: 6.3,  baseCPR6m: 6.5,  baseCPR12m: 7.0,  baseFactor: 0.68 },
  { vintage: 2022, coupon: 4.5, baseCPR1m: 7.2,  baseCPR3m: 7.5,  baseCPR6m: 7.8,  baseCPR12m: 8.2,  baseFactor: 0.88 },
  { vintage: 2023, coupon: 5.5, baseCPR1m: 9.5,  baseCPR3m: 9.8,  baseCPR6m: 10.2, baseCPR12m: 10.8, baseFactor: 0.93 },
  { vintage: 2023, coupon: 6.0, baseCPR1m: 12.0, baseCPR3m: 12.5, baseCPR6m: 13.0, baseCPR12m: 14.0, baseFactor: 0.95 },
  { vintage: 2024, coupon: 6.0, baseCPR1m: 8.0,  baseCPR3m: 8.5,  baseCPR6m: 9.0,  baseCPR12m: 9.5,  baseFactor: 0.97 },
];

const ISSUANCE_CONFIGS = [
  { issuer: 'FNMA', coupon: 5.5, type: '30Y', baseSize: 4.2 },
  { issuer: 'FNMA', coupon: 6.0, type: '30Y', baseSize: 6.8 },
  { issuer: 'FHLMC', coupon: 5.5, type: '30Y', baseSize: 3.1 },
  { issuer: 'FHLMC', coupon: 6.0, type: '30Y', baseSize: 4.5 },
  { issuer: 'GNMA', coupon: 5.5, type: '30Y', baseSize: 5.2 },
  { issuer: 'GNMA', coupon: 6.0, type: '30Y', baseSize: 3.8 },
  { issuer: 'FNMA', coupon: 5.0, type: '15Y', baseSize: 2.1 },
  { issuer: 'FHLMC', coupon: 5.5, type: '20Y', baseSize: 1.5 },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function toPrice32nds(decimal: number): string {
  const handle = Math.floor(decimal);
  const remainder = decimal - handle;
  const thirtySeconds = Math.round(remainder * 32);
  const ts = thirtySeconds < 10 ? '0' + thirtySeconds : '' + thirtySeconds;
  return `${handle}-${ts}`;
}

// ── Data generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-agency-mbs-tba'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Summary
  const currentCoupon = Math.round(jitter(6.02, 0.04) * 100) / 100;
  const ccSpread = Math.round(jitter(150, 0.08));
  const avgCPR = Math.round(jitter(8.5, 0.12) * 10) / 10;
  const tbaVolume = Math.round(jitter(275, 0.10) * 10) / 10;
  const rollSpecial = Math.round(jitter(4.5, 0.20) * 10) / 10;

  const summary = { currentCoupon, ccSpread, avgCPR, tbaVolume, rollSpecial };

  // Coupons
  const coupons = COUPON_LEVELS.map(cfg => {
    const priceDecimal = Math.round(jitter(cfg.basePrice, 0.015) * 1000) / 1000;
    const price = toPrice32nds(priceDecimal);
    const change1dTicks = Math.round((rng() - 0.5) * 12);
    const change1d = change1dTicks > 0 ? `+${change1dTicks}` : `${change1dTicks}`;
    const spread = Math.round(jitter(cfg.baseSpread, 0.06));
    const oas = Math.round(jitter(cfg.baseOAS, 0.08));
    const duration = Math.round(jitter(cfg.baseDuration, 0.05) * 100) / 100;
    const prepaySpeed = Math.round(jitter(cfg.baseCPR, 0.12) * 10) / 10;
    const convexity = Math.round(jitter(cfg.baseConvexity, 0.10) * 100) / 100;

    return {
      coupon: cfg.coupon,
      price,
      priceDecimal: Math.round(priceDecimal * 1000) / 1000,
      change1d,
      spread,
      oas,
      duration,
      prepaySpeed,
      convexity,
    };
  });

  // Roll Analysis (3 settlement months)
  const rollAnalysis = [];
  const now = new Date();
  for (let m = 0; m < SETTLEMENT_MONTHS; m++) {
    const settleDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 1);
    const monthName = settleDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const coupon = currentCoupon > 5.75 ? 6.0 : 5.5;
    const dropTicks = Math.round(jitter(5 + m * 1.5, 0.15) * 10) / 10;
    const impliedFinancing = Math.round(jitter(4.8 - m * 0.3, 0.08) * 100) / 100;
    const specialness = Math.round(jitter(3.5 + m * 0.8, 0.20) * 10) / 10;
    // Day count between settlement months
    const nextSettle = new Date(now.getFullYear(), now.getMonth() + m + 2, 1);
    const dayCount = Math.round((nextSettle.getTime() - settleDate.getTime()) / (1000 * 60 * 60 * 24));

    rollAnalysis.push({
      month: monthName,
      coupon,
      dropPrice: dropTicks,
      impliedFinancing,
      specialness,
      dayCount,
    });
  }

  // Prepayment Speeds
  const prepaymentSpeeds = PREPAY_CONFIGS.map(cfg => {
    const cpr1m = Math.round(jitter(cfg.baseCPR1m, 0.10) * 10) / 10;
    const cpr3m = Math.round(jitter(cfg.baseCPR3m, 0.08) * 10) / 10;
    const cpr6m = Math.round(jitter(cfg.baseCPR6m, 0.06) * 10) / 10;
    const cpr12m = Math.round(jitter(cfg.baseCPR12m, 0.05) * 10) / 10;
    const factor = Math.round(jitter(cfg.baseFactor, 0.03) * 10000) / 10000;

    return {
      vintage: cfg.vintage,
      coupon: cfg.coupon,
      cpr1m,
      cpr3m,
      cpr6m,
      cpr12m,
      factor,
    };
  });

  // New Issuance (pick 6)
  const shuffled = [...ISSUANCE_CONFIGS].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 6);
  const newIssuance = selected.map((cfg, idx) => {
    const settleDate = new Date(now);
    settleDate.setDate(settleDate.getDate() + Math.round(7 + idx * 5 + rng() * 10));
    // Skip weekends
    const dow = settleDate.getDay();
    if (dow === 0) settleDate.setDate(settleDate.getDate() + 1);
    if (dow === 6) settleDate.setDate(settleDate.getDate() + 2);

    const size = Math.round(jitter(cfg.baseSize, 0.15) * 100) / 100;
    const basePrice = cfg.coupon >= 6.0 ? 100.5 : cfg.coupon >= 5.5 ? 99.75 : 98.5;
    const price = Math.round(jitter(basePrice, 0.008) * 1000) / 1000;

    return {
      issuer: cfg.issuer,
      coupon: cfg.coupon,
      settlementDate: settleDate.toISOString().slice(0, 10),
      size,
      type: cfg.type,
      price,
    };
  });

  return {
    summary,
    coupons,
    rollAnalysis,
    prepaymentSpeeds,
    newIssuance,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[AgencyMBSTBA] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate agency MBS TBA data' });
  }
});

export default router;
