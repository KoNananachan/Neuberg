import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Static definitions ──

interface BankSeed {
  name: string;
  ticker: string;
  cet1Base: number;
  tier1Base: number;
  totalCapBase: number;
  leverageBase: number;
  gsibSurcharge: number;
  creditRwaBase: number;
  marketRwaBase: number;
  opRwaBase: number;
  cvaRwaBase: number;
  ccarCet1Min: number;
  ccarPeakDecline: number;
  ccarLosses: number;
  ccarPpnr: number;
}

const BANK_SEEDS: BankSeed[] = [
  {
    name: 'JPMorgan Chase', ticker: 'JPM',
    cet1Base: 15.1, tier1Base: 16.8, totalCapBase: 19.2, leverageBase: 6.8, gsibSurcharge: 350,
    creditRwaBase: 892, marketRwaBase: 218, opRwaBase: 385, cvaRwaBase: 42,
    ccarCet1Min: 11.2, ccarPeakDecline: 3.9, ccarLosses: 52.8, ccarPpnr: 38.5,
  },
  {
    name: 'Bank of America', ticker: 'BAC',
    cet1Base: 13.5, tier1Base: 15.2, totalCapBase: 17.8, leverageBase: 6.2, gsibSurcharge: 250,
    creditRwaBase: 785, marketRwaBase: 168, opRwaBase: 312, cvaRwaBase: 35,
    ccarCet1Min: 10.1, ccarPeakDecline: 3.4, ccarLosses: 44.2, ccarPpnr: 32.1,
  },
  {
    name: 'Citigroup', ticker: 'C',
    cet1Base: 13.8, tier1Base: 15.5, totalCapBase: 18.1, leverageBase: 6.0, gsibSurcharge: 300,
    creditRwaBase: 682, marketRwaBase: 195, opRwaBase: 298, cvaRwaBase: 48,
    ccarCet1Min: 10.5, ccarPeakDecline: 3.3, ccarLosses: 41.5, ccarPpnr: 28.8,
  },
  {
    name: 'Wells Fargo', ticker: 'WFC',
    cet1Base: 12.8, tier1Base: 14.5, totalCapBase: 17.1, leverageBase: 5.8, gsibSurcharge: 150,
    creditRwaBase: 725, marketRwaBase: 82, opRwaBase: 268, cvaRwaBase: 18,
    ccarCet1Min: 9.5, ccarPeakDecline: 3.3, ccarLosses: 38.5, ccarPpnr: 30.2,
  },
  {
    name: 'Goldman Sachs', ticker: 'GS',
    cet1Base: 14.8, tier1Base: 16.5, totalCapBase: 18.9, leverageBase: 6.5, gsibSurcharge: 250,
    creditRwaBase: 385, marketRwaBase: 248, opRwaBase: 195, cvaRwaBase: 55,
    ccarCet1Min: 10.8, ccarPeakDecline: 4.0, ccarLosses: 32.5, ccarPpnr: 22.8,
  },
  {
    name: 'Morgan Stanley', ticker: 'MS',
    cet1Base: 15.5, tier1Base: 17.2, totalCapBase: 19.6, leverageBase: 6.9, gsibSurcharge: 250,
    creditRwaBase: 312, marketRwaBase: 215, opRwaBase: 178, cvaRwaBase: 42,
    ccarCet1Min: 11.5, ccarPeakDecline: 4.0, ccarLosses: 28.2, ccarPpnr: 20.5,
  },
  {
    name: 'BNP Paribas', ticker: 'BNP',
    cet1Base: 13.2, tier1Base: 15.0, totalCapBase: 17.5, leverageBase: 5.5, gsibSurcharge: 200,
    creditRwaBase: 548, marketRwaBase: 142, opRwaBase: 225, cvaRwaBase: 38,
    ccarCet1Min: 9.8, ccarPeakDecline: 3.4, ccarLosses: 36.8, ccarPpnr: 25.2,
  },
  {
    name: 'HSBC Holdings', ticker: 'HSBC',
    cet1Base: 14.2, tier1Base: 16.0, totalCapBase: 18.5, leverageBase: 5.9, gsibSurcharge: 200,
    creditRwaBase: 612, marketRwaBase: 135, opRwaBase: 245, cvaRwaBase: 32,
    ccarCet1Min: 10.2, ccarPeakDecline: 4.0, ccarLosses: 42.1, ccarPpnr: 30.8,
  },
];

const REGULATORY_EVENTS = [
  { event: 'Basel III.1 Final Rule Implementation', impactCategory: 'RWA Methodology', baseImpact: 18.5 },
  { event: 'FRTB Go-Live (IMA Approval Deadline)', impactCategory: 'Market Risk', baseImpact: 12.2 },
  { event: 'GSIB Surcharge Annual Recalibration', impactCategory: 'Capital Surcharge', baseImpact: 8.4 },
  { event: 'CCAR/DFAST Stress Test Submission', impactCategory: 'Stress Testing', baseImpact: 5.8 },
  { event: 'SCB (Stress Capital Buffer) Update', impactCategory: 'Capital Buffer', baseImpact: 7.2 },
  { event: 'SA-CCR Compliance Deadline', impactCategory: 'Counterparty Risk', baseImpact: 4.5 },
  { event: 'TLAC/MREL Recalibration Review', impactCategory: 'Loss Absorption', baseImpact: 9.8 },
  { event: 'Operational Risk (SMA) Transition', impactCategory: 'Operational Risk', baseImpact: 6.1 },
  { event: 'Output Floor Phase-In (65%)', impactCategory: 'RWA Floor', baseImpact: 15.3 },
  { event: 'CVA Risk Framework Review', impactCategory: 'CVA Capital', baseImpact: 3.8 },
];
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-regulatory-capital'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 1. Capital Ratios
  const capitalRatios = BANK_SEEDS.map(seed => {
    const cet1 = round2(jitter(seed.cet1Base, 0.03));
    const tier1 = round2(jitter(seed.tier1Base, 0.03));
    const totalCapital = round2(jitter(seed.totalCapBase, 0.03));
    const leverage = round2(jitter(seed.leverageBase, 0.04));
    const gsibSurcharge = Math.round(jitter(seed.gsibSurcharge, 0.05));

    // CET1 minimum = 4.5% + CCB 2.5% + GSIB surcharge
    const minimumCet1 = 4.5 + 2.5 + gsibSurcharge / 100;
    const bufferDistance = Math.round((cet1 - minimumCet1) * 100);

    return {
      bank: seed.name,
      ticker: seed.ticker,
      cet1Ratio: cet1,
      tier1Ratio: tier1,
      totalCapitalRatio: totalCapital,
      leverageRatio: leverage,
      gsibSurcharge,
      bufferDistanceBps: bufferDistance,
    };
  });

  // 2. RWA Breakdown
  const rwaBreakdown = BANK_SEEDS.map(seed => {
    const creditRwa = round1(jitter(seed.creditRwaBase, 0.04));
    const marketRwa = round1(jitter(seed.marketRwaBase, 0.06));
    const opRwa = round1(jitter(seed.opRwaBase, 0.04));
    const cvaRwa = round1(jitter(seed.cvaRwaBase, 0.08));
    const totalRwa = round1(creditRwa + marketRwa + opRwa + cvaRwa);

    // RWA density: total RWA / estimated total assets (approx 3-4x RWA for large banks)
    const assetMultiplier = 2.8 + rng() * 1.4;
    const totalAssets = totalRwa * assetMultiplier;
    const rwaDensity = round1((totalRwa / totalAssets) * 100);

    return {
      bank: seed.name,
      ticker: seed.ticker,
      creditRiskRwa: creditRwa,
      marketRiskRwa: marketRwa,
      operationalRiskRwa: opRwa,
      cvaRiskRwa: cvaRwa,
      totalRwa,
      rwaDensity,
    };
  });

  // 3. Stress Test Results
  const scenarios = ['Severely Adverse', 'Adverse', 'Baseline'] as const;
  const stressTestResults = BANK_SEEDS.map(seed => {
    const results = scenarios.map(scenario => {
      let severityMult: number;
      if (scenario === 'Severely Adverse') severityMult = 1.0;
      else if (scenario === 'Adverse') severityMult = 0.55;
      else severityMult = 0.15;

      const projectedCet1Min = round2(jitter(seed.ccarCet1Min, 0.04) + (1 - severityMult) * 2.5);
      const peakToTroughDecline = round2(jitter(seed.ccarPeakDecline, 0.06) * severityMult + (severityMult < 0.5 ? 0.3 : 0));
      const projectedLosses = round1(jitter(seed.ccarLosses, 0.05) * severityMult);
      const ppnr = round1(jitter(seed.ccarPpnr, 0.04) * (1 - severityMult * 0.3));

      return {
        scenario,
        projectedCet1Min,
        peakToTroughDecline,
        projectedLosses,
        preProvisionNetRevenue: ppnr,
      };
    });

    return {
      bank: seed.name,
      ticker: seed.ticker,
      scenarios: results,
    };
  });

  // 4. Regulatory Timeline — next 6 upcoming events
  const baseDate = new Date(day);
  const shuffled = [...REGULATORY_EVENTS].sort((a, b) => {
    const ha = hashSeed(day + a.event);
    const hb = hashSeed(day + b.event);
    return ha - hb;
  });
  const selectedEvents = shuffled.slice(0, 6);

  const regulatoryTimeline = selectedEvents.map((evt, i) => {
    const daysAhead = Math.round(15 + i * 45 + rng() * 30);
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + daysAhead);

    return {
      date: eventDate.toISOString().slice(0, 10),
      event: evt.event,
      impactCategory: evt.impactCategory,
      estimatedCapitalImpact: round1(jitter(evt.baseImpact, 0.10)),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    capitalRatios,
    rwaBreakdown,
    stressTestResults,
    regulatoryTimeline,
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
    console.error('[RegulatoryCapital] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate regulatory capital data' });
  }
});

export default router;
