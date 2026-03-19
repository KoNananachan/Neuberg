import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface GSIBCapitalRatio {
  bank: string;
  country: string;
  cet1Ratio: number;
  tier1Ratio: number;
  totalCapitalRatio: number;
  leverageRatio: number;
  cet1Change: number;
}

interface StressTestResult {
  bank: string;
  scenario: string;
  minCet1: number;
  actualCet1: number;
  buffer: number;
  pass: boolean;
}

interface TLACEntry {
  bank: string;
  tlacRatio: number;
  mrelRatio: number;
  requirement: number;
  surplus: number;
}

interface LiquidityRatio {
  bank: string;
  lcr: number;
  nsfr: number;
  lcrChange: number;
  nsfrChange: number;
}

interface AT1Bond {
  issuer: string;
  coupon: number;
  callDate: string;
  price: number;
  yield: number;
  spread: number;
  triggerLevel: number;
}

interface Summary {
  avgCet1: number;
  minCet1: number;
  maxCet1: number;
  banksAboveMin: number;
  totalGSIBAssets: number;
}

// ── Seed Data ──

interface BankSeed {
  bank: string;
  country: string;
  cet1Base: number;
  tier1Spread: number;
  totalCapitalSpread: number;
  leverageBase: number;
  assetsT: number;
  at1Coupon: number;
  at1CallYear: number;
  triggerLevel: number;
}

const BANK_SEEDS: BankSeed[] = [
  { bank: 'JPMorgan Chase', country: 'US', cet1Base: 15.0, tier1Spread: 1.8, totalCapitalSpread: 3.5, leverageBase: 6.8, assetsT: 3.87, at1Coupon: 6.75, at1CallYear: 2027, triggerLevel: 7.0 },
  { bank: 'Bank of America', country: 'US', cet1Base: 11.8, tier1Spread: 1.6, totalCapitalSpread: 3.2, leverageBase: 6.0, assetsT: 3.18, at1Coupon: 7.25, at1CallYear: 2028, triggerLevel: 7.0 },
  { bank: 'Citigroup', country: 'US', cet1Base: 13.4, tier1Spread: 1.7, totalCapitalSpread: 3.4, leverageBase: 5.8, assetsT: 2.41, at1Coupon: 7.38, at1CallYear: 2026, triggerLevel: 7.0 },
  { bank: 'Goldman Sachs', country: 'US', cet1Base: 14.8, tier1Spread: 2.0, totalCapitalSpread: 3.8, leverageBase: 6.5, assetsT: 1.57, at1Coupon: 6.50, at1CallYear: 2029, triggerLevel: 7.0 },
  { bank: 'Morgan Stanley', country: 'US', cet1Base: 15.2, tier1Spread: 1.9, totalCapitalSpread: 3.6, leverageBase: 6.9, assetsT: 1.19, at1Coupon: 6.88, at1CallYear: 2028, triggerLevel: 7.0 },
  { bank: 'Wells Fargo', country: 'US', cet1Base: 11.1, tier1Spread: 1.5, totalCapitalSpread: 3.1, leverageBase: 7.2, assetsT: 1.93, at1Coupon: 7.63, at1CallYear: 2027, triggerLevel: 7.0 },
  { bank: 'HSBC', country: 'GB', cet1Base: 14.7, tier1Spread: 1.8, totalCapitalSpread: 3.5, leverageBase: 5.5, assetsT: 2.99, at1Coupon: 8.00, at1CallYear: 2027, triggerLevel: 7.0 },
  { bank: 'Barclays', country: 'GB', cet1Base: 13.8, tier1Spread: 1.6, totalCapitalSpread: 3.3, leverageBase: 5.2, assetsT: 1.59, at1Coupon: 8.88, at1CallYear: 2026, triggerLevel: 7.0 },
  { bank: 'Deutsche Bank', country: 'DE', cet1Base: 13.6, tier1Spread: 1.5, totalCapitalSpread: 3.1, leverageBase: 4.7, assetsT: 1.43, at1Coupon: 10.00, at1CallYear: 2028, triggerLevel: 5.125 },
  { bank: 'BNP Paribas', country: 'FR', cet1Base: 13.2, tier1Spread: 1.7, totalCapitalSpread: 3.4, leverageBase: 4.5, assetsT: 2.67, at1Coupon: 7.75, at1CallYear: 2029, triggerLevel: 5.125 },
  { bank: 'UBS', country: 'CH', cet1Base: 14.3, tier1Spread: 2.1, totalCapitalSpread: 4.0, leverageBase: 5.0, assetsT: 1.72, at1Coupon: 9.25, at1CallYear: 2027, triggerLevel: 7.0 },
  { bank: 'Credit Agricole', country: 'FR', cet1Base: 11.5, tier1Spread: 1.4, totalCapitalSpread: 2.9, leverageBase: 4.3, assetsT: 2.35, at1Coupon: 7.50, at1CallYear: 2028, triggerLevel: 5.125 },
  { bank: 'Mitsubishi UFJ', country: 'JP', cet1Base: 12.4, tier1Spread: 1.6, totalCapitalSpread: 3.2, leverageBase: 5.3, assetsT: 3.07, at1Coupon: 6.25, at1CallYear: 2029, triggerLevel: 5.125 },
  { bank: 'Sumitomo Mitsui', country: 'JP', cet1Base: 11.9, tier1Spread: 1.5, totalCapitalSpread: 3.0, leverageBase: 5.1, assetsT: 2.14, at1Coupon: 6.50, at1CallYear: 2027, triggerLevel: 5.125 },
  { bank: 'Industrial & Commercial Bank of China', country: 'CN', cet1Base: 13.7, tier1Spread: 1.3, totalCapitalSpread: 2.7, leverageBase: 7.8, assetsT: 5.74, at1Coupon: 6.00, at1CallYear: 2026, triggerLevel: 5.125 },
];

const MIN_CET1_REQUIREMENT = 4.5;

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('bank-capital-monitor-' + day));

  // ── 1. G-SIB Capital Ratios ──
  const gsibCapitalRatios: GSIBCapitalRatio[] = BANK_SEEDS.map(s => {
    const cet1 = roundTo(jitter(rng, s.cet1Base, 0.03), 2);
    const tier1 = roundTo(cet1 + jitter(rng, s.tier1Spread, 0.08), 2);
    const totalCapital = roundTo(tier1 + jitter(rng, s.totalCapitalSpread - s.tier1Spread, 0.10) + s.tier1Spread, 2);
    const leverage = roundTo(jitter(rng, s.leverageBase, 0.04), 2);
    const cet1Change = roundTo((rng() - 0.45) * 0.8, 2);
    return { bank: s.bank, country: s.country, cet1Ratio: cet1, tier1Ratio: tier1, totalCapitalRatio: totalCapital, leverageRatio: leverage, cet1Change };
  });

  // ── 2. Stress Test Results ──
  const stressTestResults: StressTestResult[] = BANK_SEEDS.map(s => {
    const actualCet1 = roundTo(jitter(rng, s.cet1Base, 0.03), 2);
    const drawdown = roundTo(2.5 + rng() * 5.5, 2);
    const minCet1 = roundTo(actualCet1 - drawdown, 2);
    const buffer = roundTo(minCet1 - MIN_CET1_REQUIREMENT, 2);
    return { bank: s.bank, scenario: 'Severely Adverse', minCet1, actualCet1, buffer, pass: minCet1 > MIN_CET1_REQUIREMENT };
  });

  // ── 3. TLAC/MREL ──
  const tlacMrel: TLACEntry[] = BANK_SEEDS.map(s => {
    const requirement = roundTo(18.0 + rng() * 4.0, 2);
    const tlacRatio = roundTo(jitter(rng, 24 + s.cet1Base * 0.5, 0.06), 2);
    const mrelRatio = roundTo(jitter(rng, 28 + s.cet1Base * 0.4, 0.05), 2);
    const surplus = roundTo(tlacRatio - requirement, 2);
    return { bank: s.bank, tlacRatio, mrelRatio, requirement, surplus };
  });

  // ── 4. Liquidity Ratios ──
  const liquidityRatios: LiquidityRatio[] = BANK_SEEDS.map(s => {
    const lcr = roundTo(110 + rng() * 50, 1);
    const nsfr = roundTo(105 + rng() * 35, 1);
    const lcrChange = roundTo((rng() - 0.5) * 10, 1);
    const nsfrChange = roundTo((rng() - 0.5) * 8, 1);
    return { bank: s.bank, lcr, nsfr, lcrChange, nsfrChange };
  });

  // ── 5. AT1/CoCo Bonds ──
  const at1Bonds: AT1Bond[] = BANK_SEEDS.map(s => {
    const coupon = roundTo(s.at1Coupon, 3);
    const callYear = s.at1CallYear;
    const callMonth = 1 + Math.floor(rng() * 12);
    const callDay = 1 + Math.floor(rng() * 28);
    const callDate = `${callYear}-${String(callMonth).padStart(2, '0')}-${String(callDay).padStart(2, '0')}`;
    const yieldVal = roundTo(6 + rng() * 6, 3);
    const price = roundTo(85 + rng() * 18, 2);
    const spread = Math.round(300 + rng() * 500);
    return { issuer: s.bank, coupon, callDate, price, yield: yieldVal, spread, triggerLevel: s.triggerLevel };
  });

  // ── 6. Summary ──
  const cet1Values = gsibCapitalRatios.map(r => r.cet1Ratio);
  const avgCet1 = roundTo(cet1Values.reduce((a, b) => a + b, 0) / cet1Values.length, 2);
  const minCet1 = roundTo(Math.min(...cet1Values), 2);
  const maxCet1 = roundTo(Math.max(...cet1Values), 2);
  const banksAboveMin = cet1Values.filter(v => v > MIN_CET1_REQUIREMENT).length;
  const totalGSIBAssets = roundTo(BANK_SEEDS.reduce((sum, s) => sum + s.assetsT, 0), 2);

  const summary: Summary = { avgCet1, minCet1, maxCet1, banksAboveMin, totalGSIBAssets };

  return {
    gsibCapitalRatios,
    stressTestResults,
    tlacMrel,
    liquidityRatios,
    at1Bonds,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[BankCapital] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate bank capital monitor data' });
  }
});

export default router;
