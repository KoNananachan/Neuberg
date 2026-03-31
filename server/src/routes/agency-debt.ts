import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Helpers ──

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function jitter(rng: () => number, base: number, spread: number): number {
  return base + (rng() - 0.5) * 2 * spread;
}

// ── Types ──

interface DebtTypeBreakdown {
  bullets: number;
  callables: number;
  floaters: number;
  discountNotes: number;
}

interface AgencyIssuer {
  name: string;
  ticker: string;
  totalOutstandingBillions: number;
  avgCoupon: number;
  avgYield: number;
  avgSpreadBps: number;
  rating: string;
  debtTypes: DebtTypeBreakdown;
}

interface RecentIssuance {
  issuer: string;
  coupon: number;
  maturity: string;
  sizeBillions: number;
  spreadBps: number;
  type: string;
  date: string;
}

interface SpreadCurvePoint {
  issuer: string;
  twoYear: number;
  threeYear: number;
  fiveYear: number;
  sevenYear: number;
  tenYear: number;
}

interface CallScheduleEntry {
  issuer: string;
  coupon: number;
  callDate: string;
  maturityDate: string;
  sizeBillions: number;
  currentPrice: number;
}

interface DiscountNoteRates {
  issuer: string;
  oneMonth: number;
  twoMonth: number;
  threeMonth: number;
  sixMonth: number;
}

interface AgencyDebtResponse {
  timestamp: string;
  issuers: AgencyIssuer[];
  recentIssuance: RecentIssuance[];
  spreadCurve: SpreadCurvePoint[];
  callSchedule: CallScheduleEntry[];
  discountNotes: DiscountNoteRates[];
}

// ── Cache ──

let cache: { data: AgencyDebtResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};


// ── Data Generation ──

function generate(): AgencyDebtResponse {
  const rng = seededRandom('agency-debt');
  const today = new Date();

  // ── 1. Agency Issuers ──

  const issuerDefs = [
    { name: 'Federal Home Loan Banks',    ticker: 'FHLB', baseOutstanding: 1200, baseCoupon: 4.85, baseYield: 4.90, baseSpread: 12, rating: 'AA+' },
    { name: 'Fannie Mae',                 ticker: 'FNMA', baseOutstanding: 800,  baseCoupon: 4.75, baseYield: 4.82, baseSpread: 15, rating: 'AA+' },
    { name: 'Freddie Mac',                ticker: 'FHLMC', baseOutstanding: 600, baseCoupon: 4.78, baseYield: 4.85, baseSpread: 16, rating: 'AA+' },
    { name: 'Federal Farm Credit Banks',   ticker: 'FFCB', baseOutstanding: 380, baseCoupon: 4.70, baseYield: 4.76, baseSpread: 10, rating: 'AA+' },
    { name: 'Tennessee Valley Authority',  ticker: 'TVA',  baseOutstanding: 120, baseCoupon: 4.55, baseYield: 4.62, baseSpread: 18, rating: 'AAA' },
  ];

  const issuers: AgencyIssuer[] = issuerDefs.map(def => {
    const outstanding = round(jitter(rng, def.baseOutstanding, def.baseOutstanding * 0.05), 1);
    const coupon = round(jitter(rng, def.baseCoupon, 0.15), 3);
    const yld = round(jitter(rng, def.baseYield, 0.12), 3);
    const spread = round(jitter(rng, def.baseSpread, 4), 1);

    // Debt type breakdown as percentages summing to 100
    const bulletsBase = 35 + rng() * 15;
    const callablesBase = 20 + rng() * 15;
    const floatersBase = 15 + rng() * 10;
    const total = bulletsBase + callablesBase + floatersBase;
    const discountNotesBase = 100 - total;

    return {
      name: def.name,
      ticker: def.ticker,
      totalOutstandingBillions: outstanding,
      avgCoupon: coupon,
      avgYield: yld,
      avgSpreadBps: spread,
      rating: def.rating,
      debtTypes: {
        bullets: round(bulletsBase / 100 * outstanding, 1),
        callables: round(callablesBase / 100 * outstanding, 1),
        floaters: round(floatersBase / 100 * outstanding, 1),
        discountNotes: round(discountNotesBase / 100 * outstanding, 1),
      },
    };
  });

  // ── 2. Recent Issuance ──

  const issuanceTypes = ['Bullet', 'Callable', 'Floater', 'Discount Note'];
  const maturities = ['2027-03-15', '2028-06-15', '2029-09-15', '2031-03-15', '2034-06-15', '2026-06-15', '2026-09-15'];

  const recentIssuance: RecentIssuance[] = [];
  for (let i = 0; i < 12; i++) {
    const issuerIdx = Math.floor(rng() * issuerDefs.length);
    const issuer = issuerDefs[issuerIdx];
    const typeIdx = Math.floor(rng() * issuanceTypes.length);
    const type = issuanceTypes[typeIdx];

    const isDiscountNote = type === 'Discount Note';
    const coupon = isDiscountNote ? 0 : round(3.5 + rng() * 2.5, 3);
    const maturity = isDiscountNote
      ? (() => {
          const mat = new Date(today);
          mat.setDate(mat.getDate() + Math.floor(30 + rng() * 150));
          return mat.toISOString().slice(0, 10);
        })()
      : maturities[Math.floor(rng() * maturities.length)];

    const sizeBillions = round(0.5 + rng() * 4.5, 2);
    const spreadBps = round(jitter(rng, 14, 8), 1);

    const daysAgo = Math.floor(rng() * 7);
    const issueDate = new Date(today);
    issueDate.setDate(issueDate.getDate() - daysAgo);

    recentIssuance.push({
      issuer: issuer.ticker,
      coupon,
      maturity,
      sizeBillions,
      spreadBps,
      type,
      date: issueDate.toISOString().slice(0, 10),
    });
  }

  recentIssuance.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.sizeBillions - a.sizeBillions;
  });

  // ── 3. Spread Curve (vs Treasury) ──

  const spreadCurve: SpreadCurvePoint[] = issuerDefs.map(def => {
    // Spreads widen with maturity; base spread varies by issuer
    const base = def.baseSpread;
    return {
      issuer: def.ticker,
      twoYear: round(jitter(rng, base - 3, 2), 1),
      threeYear: round(jitter(rng, base - 1, 2), 1),
      fiveYear: round(jitter(rng, base, 2.5), 1),
      sevenYear: round(jitter(rng, base + 3, 3), 1),
      tenYear: round(jitter(rng, base + 6, 3.5), 1),
    };
  });

  // ── 4. Call Schedule ──

  const callSchedule: CallScheduleEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const issuerIdx = Math.floor(rng() * issuerDefs.length);
    const issuer = issuerDefs[issuerIdx];

    const coupon = round(3.5 + rng() * 2.5, 3);

    // Call date within next 90 days
    const callOffset = Math.floor(7 + rng() * 83);
    const callDate = new Date(today);
    callDate.setDate(callDate.getDate() + callOffset);

    // Maturity 1-5 years after call date
    const maturityOffset = Math.floor(365 + rng() * 1460);
    const maturityDate = new Date(callDate);
    maturityDate.setDate(maturityDate.getDate() + maturityOffset);

    const sizeBillions = round(0.25 + rng() * 3.75, 2);
    // Price near par, slightly above or below
    const currentPrice = round(jitter(rng, 100, 2.5), 3);

    callSchedule.push({
      issuer: issuer.ticker,
      coupon,
      callDate: callDate.toISOString().slice(0, 10),
      maturityDate: maturityDate.toISOString().slice(0, 10),
      sizeBillions,
      currentPrice,
    });
  }

  // Sort by call date ascending
  callSchedule.sort((a, b) => a.callDate.localeCompare(b.callDate));

  // ── 5. Discount Note Rates ──

  const discountNotes: DiscountNoteRates[] = issuerDefs.map(def => {
    // Short-term rates in the 4.5-5.5% range, increasing with tenor
    const baseRate = 4.80 + rng() * 0.30;
    return {
      issuer: def.ticker,
      oneMonth: round(jitter(rng, baseRate, 0.15), 3),
      twoMonth: round(jitter(rng, baseRate + 0.05, 0.15), 3),
      threeMonth: round(jitter(rng, baseRate + 0.10, 0.15), 3),
      sixMonth: round(jitter(rng, baseRate + 0.20, 0.18), 3),
    };
  });

  return {
    timestamp: new Date().toISOString(),
    issuers,
    recentIssuance,
    spreadCurve,
    callSchedule,
    discountNotes,
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();

    cache = { data, expiresAt: now + CACHE_TTL };
    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[AgencyDebt] Error:', message);

    // Stale fallback
    if (cache.data) {
      return res.json(cache.data);
    }

    return res.status(500).json({ error: 'Failed to generate agency debt data' });
  }
});

export default router;
