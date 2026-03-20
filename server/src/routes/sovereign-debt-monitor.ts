import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface CountryProfile {
  country: string;
  debtToGdpPct: number;
  fiscalDeficitGdpPct: number;
  externalDebtB: number;
  tenYearYield: number;
  cdsSpread: number;
  spRating: string;
  moodysRating: string;
  outlook: 'STABLE' | 'POSITIVE' | 'NEGATIVE';
}

interface DebtSustainability {
  country: string;
  interestExpenseRevenuePct: number;
  primaryBalanceGdpPct: number;
  debtServiceExportsPct: number;
  grossFinancingNeedsGdpPct: number;
}

interface IssuanceCalendarEntry {
  country: string;
  nextAuctionDate: string;
  instrument: string;
  amountB: number;
  wiYield: number;
}

interface GlobalSummary {
  avgG7DebtToGdp: number;
  avgEmDebtToGdp: number;
  totalGlobalDebtT: number;
  yoyChangePct: number;
}

// ── Seed Data ──

interface CountrySeed {
  country: string;
  debtToGdpBase: number;
  fiscalDeficitBase: number;
  externalDebtBase: number;
  tenYearYieldBase: number;
  cdsSpreadBase: number;
  spRating: string;
  moodysRating: string;
  outlook: 'STABLE' | 'POSITIVE' | 'NEGATIVE';
  isG7: boolean;
  isEm: boolean;
  interestExpRevBase: number;
  primaryBalanceBase: number;
  debtServiceExportsBase: number;
  grossFinancingBase: number;
  instruments: string[];
  auctionAmountBase: number;
  wiYieldBase: number;
}

const COUNTRY_SEEDS: CountrySeed[] = [
  {
    country: 'United States', debtToGdpBase: 123.0, fiscalDeficitBase: -6.3,
    externalDebtBase: 7800, tenYearYieldBase: 4.25, cdsSpreadBase: 32,
    spRating: 'AA+', moodysRating: 'Aaa', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 14.2, primaryBalanceBase: -3.1, debtServiceExportsBase: 22.5, grossFinancingBase: 18.4,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 42, wiYieldBase: 4.28,
  },
  {
    country: 'Japan', debtToGdpBase: 260.1, fiscalDeficitBase: -5.8,
    externalDebtBase: 4700, tenYearYieldBase: 0.92, cdsSpreadBase: 28,
    spRating: 'A+', moodysRating: 'A1', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 7.8, primaryBalanceBase: -2.4, debtServiceExportsBase: 35.1, grossFinancingBase: 52.3,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 28, wiYieldBase: 0.95,
  },
  {
    country: 'United Kingdom', debtToGdpBase: 101.2, fiscalDeficitBase: -4.8,
    externalDebtBase: 3200, tenYearYieldBase: 4.12, cdsSpreadBase: 35,
    spRating: 'AA', moodysRating: 'Aa3', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 8.5, primaryBalanceBase: -1.9, debtServiceExportsBase: 12.3, grossFinancingBase: 14.6,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 8, wiYieldBase: 4.15,
  },
  {
    country: 'Germany', debtToGdpBase: 64.3, fiscalDeficitBase: -1.6,
    externalDebtBase: 2850, tenYearYieldBase: 2.35, cdsSpreadBase: 18,
    spRating: 'AAA', moodysRating: 'Aaa', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 2.1, primaryBalanceBase: 0.8, debtServiceExportsBase: 5.2, grossFinancingBase: 8.1,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 6, wiYieldBase: 2.38,
  },
  {
    country: 'France', debtToGdpBase: 111.8, fiscalDeficitBase: -5.5,
    externalDebtBase: 3210, tenYearYieldBase: 3.05, cdsSpreadBase: 42,
    spRating: 'AA-', moodysRating: 'Aa2', outlook: 'NEGATIVE',
    isG7: true, isEm: false,
    interestExpRevBase: 5.6, primaryBalanceBase: -2.3, debtServiceExportsBase: 9.8, grossFinancingBase: 16.2,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 10, wiYieldBase: 3.08,
  },
  {
    country: 'Italy', debtToGdpBase: 140.6, fiscalDeficitBase: -7.2,
    externalDebtBase: 2980, tenYearYieldBase: 3.85, cdsSpreadBase: 105,
    spRating: 'BBB', moodysRating: 'Baa3', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 8.9, primaryBalanceBase: -3.8, debtServiceExportsBase: 15.4, grossFinancingBase: 22.7,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 9, wiYieldBase: 3.88,
  },
  {
    country: 'Spain', debtToGdpBase: 107.5, fiscalDeficitBase: -3.6,
    externalDebtBase: 1620, tenYearYieldBase: 3.28, cdsSpreadBase: 62,
    spRating: 'A', moodysRating: 'Baa1', outlook: 'POSITIVE',
    isG7: false, isEm: false,
    interestExpRevBase: 5.2, primaryBalanceBase: -0.9, debtServiceExportsBase: 11.2, grossFinancingBase: 15.8,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 7, wiYieldBase: 3.31,
  },
  {
    country: 'Canada', debtToGdpBase: 106.4, fiscalDeficitBase: -1.1,
    externalDebtBase: 1870, tenYearYieldBase: 3.45, cdsSpreadBase: 25,
    spRating: 'AAA', moodysRating: 'Aaa', outlook: 'STABLE',
    isG7: true, isEm: false,
    interestExpRevBase: 6.8, primaryBalanceBase: 1.2, debtServiceExportsBase: 8.4, grossFinancingBase: 12.3,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 5, wiYieldBase: 3.48,
  },
  {
    country: 'Australia', debtToGdpBase: 52.1, fiscalDeficitBase: -1.4,
    externalDebtBase: 720, tenYearYieldBase: 4.15, cdsSpreadBase: 20,
    spRating: 'AAA', moodysRating: 'Aaa', outlook: 'STABLE',
    isG7: false, isEm: false,
    interestExpRevBase: 3.4, primaryBalanceBase: 0.5, debtServiceExportsBase: 4.8, grossFinancingBase: 7.6,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 3, wiYieldBase: 4.18,
  },
  {
    country: 'Brazil', debtToGdpBase: 74.4, fiscalDeficitBase: -8.1,
    externalDebtBase: 1420, tenYearYieldBase: 11.85, cdsSpreadBase: 165,
    spRating: 'BB', moodysRating: 'Ba2', outlook: 'STABLE',
    isG7: false, isEm: true,
    interestExpRevBase: 22.5, primaryBalanceBase: -4.6, debtServiceExportsBase: 28.3, grossFinancingBase: 19.8,
    instruments: ['2Y', '5Y', '10Y'], auctionAmountBase: 4, wiYieldBase: 11.92,
  },
  {
    country: 'India', debtToGdpBase: 83.1, fiscalDeficitBase: -6.4,
    externalDebtBase: 2680, tenYearYieldBase: 7.18, cdsSpreadBase: 98,
    spRating: 'BBB-', moodysRating: 'Baa3', outlook: 'POSITIVE',
    isG7: false, isEm: true,
    interestExpRevBase: 26.1, primaryBalanceBase: -2.8, debtServiceExportsBase: 18.7, grossFinancingBase: 11.5,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 5, wiYieldBase: 7.22,
  },
  {
    country: 'China', debtToGdpBase: 83.6, fiscalDeficitBase: -7.1,
    externalDebtBase: 14690, tenYearYieldBase: 2.68, cdsSpreadBase: 68,
    spRating: 'A+', moodysRating: 'A1', outlook: 'NEGATIVE',
    isG7: false, isEm: true,
    interestExpRevBase: 5.9, primaryBalanceBase: -3.5, debtServiceExportsBase: 7.2, grossFinancingBase: 14.8,
    instruments: ['2Y', '5Y', '10Y', '30Y'], auctionAmountBase: 18, wiYieldBase: 2.71,
  },
  {
    country: 'South Korea', debtToGdpBase: 54.3, fiscalDeficitBase: -2.6,
    externalDebtBase: 930, tenYearYieldBase: 3.52, cdsSpreadBase: 38,
    spRating: 'AA', moodysRating: 'Aa2', outlook: 'STABLE',
    isG7: false, isEm: false,
    interestExpRevBase: 3.8, primaryBalanceBase: -0.4, debtServiceExportsBase: 6.1, grossFinancingBase: 9.2,
    instruments: ['2Y', '5Y', '10Y'], auctionAmountBase: 4, wiYieldBase: 3.55,
  },
  {
    country: 'Mexico', debtToGdpBase: 52.8, fiscalDeficitBase: -3.9,
    externalDebtBase: 740, tenYearYieldBase: 9.45, cdsSpreadBase: 118,
    spRating: 'BBB', moodysRating: 'Baa2', outlook: 'NEGATIVE',
    isG7: false, isEm: true,
    interestExpRevBase: 12.4, primaryBalanceBase: -1.2, debtServiceExportsBase: 14.6, grossFinancingBase: 10.1,
    instruments: ['5Y', '10Y', '30Y'], auctionAmountBase: 3, wiYieldBase: 9.52,
  },
  {
    country: 'South Africa', debtToGdpBase: 72.8, fiscalDeficitBase: -5.5,
    externalDebtBase: 260, tenYearYieldBase: 10.25, cdsSpreadBase: 225,
    spRating: 'BB-', moodysRating: 'Ba2', outlook: 'NEGATIVE',
    isG7: false, isEm: true,
    interestExpRevBase: 18.7, primaryBalanceBase: -2.1, debtServiceExportsBase: 21.4, grossFinancingBase: 13.9,
    instruments: ['5Y', '10Y'], auctionAmountBase: 2, wiYieldBase: 10.32,
  },
];

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
  const rng = mulberry32(hashSeed('sovereign-debt-monitor-' + day));

  // ── Country Debt Profiles ──
  const countryProfiles: CountryProfile[] = COUNTRY_SEEDS.map(s => ({
    country: s.country,
    debtToGdpPct: roundTo(jitter(rng, s.debtToGdpBase, 0.02), 1),
    fiscalDeficitGdpPct: roundTo(jitter(rng, s.fiscalDeficitBase, 0.04), 1),
    externalDebtB: roundTo(jitter(rng, s.externalDebtBase, 0.03), 1),
    tenYearYield: roundTo(jitter(rng, s.tenYearYieldBase, 0.05), 2),
    cdsSpread: roundTo(jitter(rng, s.cdsSpreadBase, 0.08), 1),
    spRating: s.spRating,
    moodysRating: s.moodysRating,
    outlook: s.outlook,
  }));

  // ── Debt Sustainability ──
  const debtSustainability: DebtSustainability[] = COUNTRY_SEEDS.map(s => ({
    country: s.country,
    interestExpenseRevenuePct: roundTo(jitter(rng, s.interestExpRevBase, 0.05), 1),
    primaryBalanceGdpPct: roundTo(jitter(rng, s.primaryBalanceBase, 0.06), 1),
    debtServiceExportsPct: roundTo(jitter(rng, s.debtServiceExportsBase, 0.04), 1),
    grossFinancingNeedsGdpPct: roundTo(jitter(rng, s.grossFinancingBase, 0.05), 1),
  }));

  // ── Issuance Calendar ──
  const today = new Date();
  const issuanceCalendar: IssuanceCalendarEntry[] = [];
  for (const s of COUNTRY_SEEDS) {
    const instrument = s.instruments[Math.floor(rng() * s.instruments.length)];
    const daysUntilAuction = 1 + Math.floor(rng() * 14);
    const auctionDate = new Date(today);
    auctionDate.setDate(auctionDate.getDate() + daysUntilAuction);
    // Skip weekends
    const dow = auctionDate.getDay();
    if (dow === 0) auctionDate.setDate(auctionDate.getDate() + 1);
    if (dow === 6) auctionDate.setDate(auctionDate.getDate() + 2);

    issuanceCalendar.push({
      country: s.country,
      nextAuctionDate: auctionDate.toISOString().slice(0, 10),
      instrument,
      amountB: roundTo(jitter(rng, s.auctionAmountBase, 0.15), 1),
      wiYield: roundTo(jitter(rng, s.wiYieldBase, 0.03), 3),
    });
  }
  issuanceCalendar.sort((a, b) => a.nextAuctionDate.localeCompare(b.nextAuctionDate));

  // ── Global Summary ──
  const g7Countries = COUNTRY_SEEDS.filter(s => s.isG7);
  const emCountries = COUNTRY_SEEDS.filter(s => s.isEm);

  const g7Profiles = countryProfiles.filter(p => g7Countries.some(g => g.country === p.country));
  const emProfiles = countryProfiles.filter(p => emCountries.some(e => e.country === p.country));

  const avgG7DebtToGdp = roundTo(
    g7Profiles.reduce((sum, p) => sum + p.debtToGdpPct, 0) / g7Profiles.length, 1
  );
  const avgEmDebtToGdp = roundTo(
    emProfiles.reduce((sum, p) => sum + p.debtToGdpPct, 0) / emProfiles.length, 1
  );

  const totalGlobalDebtT = roundTo(307.4 + (rng() - 0.5) * 8, 1);
  const yoyChangePct = roundTo(2.5 + (rng() - 0.5) * 3, 1);

  const globalSummary: GlobalSummary = {
    avgG7DebtToGdp,
    avgEmDebtToGdp,
    totalGlobalDebtT,
    yoyChangePct,
  };

  return {
    countryProfiles,
    debtSustainability,
    issuanceCalendar,
    globalSummary,
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
    console.error('[SovereignDebtMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate sovereign debt monitor data' });
  }
});

export default router;
