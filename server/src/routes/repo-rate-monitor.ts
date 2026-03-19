import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Cache ──

let cache: { data: RepoRateMonitorResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface OvernightRate {
  name: string;
  code: string;
  rate: number;
  change: number;
  weekAvg: number;
  monthAvg: number;
  high: number;
  low: number;
  volume: number;
}

interface TermRepoRate {
  tenor: string;
  gcRate: number;
  spreadToSOFR: number;
  bidRate: number;
  offerRate: number;
  volume: number;
  change: number;
}

interface CollateralBreakdown {
  collateral: string;
  overnightRate: number;
  termRate: number;
  rateDifferential: number;
  haircut: number;
  volumeShare: number;
  availability: 'AMPLE' | 'TIGHT' | 'SCARCE';
}

interface SpecialVsGC {
  issue: string;
  tenor: string;
  specialRate: number;
  gcRate: number;
  spread: number;
  specialness: number;
  direction: 'RICH' | 'CHEAP' | 'FAIR';
}

interface RepoVolumeOutstanding {
  segment: string;
  dailyVolume: number;
  outstanding: number;
  change1d: number;
  change1w: number;
  shareOfTotal: number;
}

interface HistoricalRatePoint {
  date: string;
  sofr: number;
  fedFunds: number;
  triPartyGC: number;
  gcfRepo: number;
  bilateral: number;
}

interface QuarterEndIndicator {
  date: string;
  label: string;
  daysUntil: number;
  expectedSpikeBps: number;
  historicalAvgSpikeBps: number;
  isApproaching: boolean;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

interface FedRRPFacility {
  usage: number;
  change1d: number;
  change1w: number;
  counterparties: number;
  awardRate: number;
  peak: number;
  peakDate: string;
  percentOfPeak: number;
}

interface MarketSummary {
  totalVolume: number;
  totalOutstanding: number;
  avgGCRate: number;
  gcFfSpread: number;
  dayOverDayChange: number;
  quarterEndPressure: string;
}

interface RepoRateMonitorResponse {
  overnightRates: OvernightRate[];
  termRepoRates: TermRepoRate[];
  collateralBreakdown: CollateralBreakdown[];
  specialVsGC: SpecialVsGC[];
  volumeOutstanding: RepoVolumeOutstanding[];
  historicalRates: HistoricalRatePoint[];
  quarterEndIndicators: QuarterEndIndicator[];
  fedRRPFacility: FedRRPFacility;
  marketSummary: MarketSummary;
  generatedAt: string;
}

// ── Static configs ──

const OVERNIGHT_CONFIGS = [
  { name: 'Secured Overnight Financing Rate', code: 'SOFR', base: 4.31, baseVol: 2100 },
  { name: 'Fed Funds Effective Rate', code: 'FF Effective', base: 4.33, baseVol: 95 },
  { name: 'Tri-Party General Collateral Rate', code: 'TGCR', base: 4.30, baseVol: 5200 },
  { name: 'GCF Repo Rate', code: 'GCF', base: 4.31, baseVol: 310 },
  { name: 'Bilateral Repo Rate', code: 'Bilateral', base: 4.32, baseVol: 2800 },
];

const TERM_CONFIGS = [
  { tenor: '1W', baseGC: 4.33, baseVol: 185 },
  { tenor: '2W', baseGC: 4.35, baseVol: 92 },
  { tenor: '1M', baseGC: 4.38, baseVol: 128 },
  { tenor: '3M', baseGC: 4.44, baseVol: 65 },
  { tenor: '6M', baseGC: 4.50, baseVol: 34 },
];

const COLLATERAL_CONFIGS = [
  { collateral: 'Treasury', baseON: 4.30, baseTerm: 4.38, baseHaircut: 2.0, baseShare: 62 },
  { collateral: 'Agency', baseON: 4.33, baseTerm: 4.42, baseHaircut: 3.0, baseShare: 15 },
  { collateral: 'MBS', baseON: 4.36, baseTerm: 4.46, baseHaircut: 4.5, baseShare: 13 },
  { collateral: 'Corporate', baseON: 4.52, baseTerm: 4.62, baseHaircut: 8.0, baseShare: 10 },
];

const SPECIAL_CONFIGS = [
  { issue: 'On-the-Run 2Y UST', tenor: '2Y', baseSpecial: 3.95, baseGC: 4.30 },
  { issue: 'On-the-Run 5Y UST', tenor: '5Y', baseSpecial: 3.88, baseGC: 4.30 },
  { issue: 'On-the-Run 10Y UST', tenor: '10Y', baseSpecial: 3.80, baseGC: 4.30 },
  { issue: 'On-the-Run 30Y UST', tenor: '30Y', baseSpecial: 4.05, baseGC: 4.30 },
  { issue: 'CT2 (Current 2Y)', tenor: '2Y', baseSpecial: 4.10, baseGC: 4.30 },
  { issue: 'CT10 (Current 10Y)', tenor: '10Y', baseSpecial: 3.92, baseGC: 4.30 },
];

const VOLUME_SEGMENTS = [
  { segment: 'Tri-Party', baseDailyVol: 5400, baseOutstanding: 4800 },
  { segment: 'Bilateral (Fixed)', baseDailyVol: 2800, baseOutstanding: 2200 },
  { segment: 'Bilateral (Floating)', baseDailyVol: 800, baseOutstanding: 650 },
  { segment: 'GCF', baseDailyVol: 310, baseOutstanding: 290 },
  { segment: 'Fed RRP', baseDailyVol: 450, baseOutstanding: 450 },
  { segment: 'FHLB Advances', baseDailyVol: 680, baseOutstanding: 1100 },
];

// ── Helpers ──

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

// ── Data generation ──

function generate(): RepoRateMonitorResponse {
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-repo-rate-monitor'));

  const jitter = (base: number, bps: number) =>
    round4(base + (rng() - 0.5) * 2 * (bps / 10000));
  const volJitter = (base: number, pct: number) =>
    round1(base * (1 + (rng() - 0.5) * 2 * pct));

  // 1. Overnight Rates
  const overnightRates: OvernightRate[] = OVERNIGHT_CONFIGS.map((cfg) => {
    const rate = jitter(cfg.base, 3);
    const change = round4((rng() - 0.5) * 0.006);
    const weekAvg = jitter(cfg.base, 2);
    const monthAvg = jitter(cfg.base, 4);
    const high = round4(rate + rng() * 0.05);
    const low = round4(rate - rng() * 0.05);
    const volume = volJitter(cfg.baseVol, 0.08);
    return { name: cfg.name, code: cfg.code, rate, change, weekAvg, monthAvg, high, low, volume };
  });

  const sofrRate = overnightRates[0].rate;
  const ffRate = overnightRates[1].rate;

  // 2. Term Repo Rates
  const termRepoRates: TermRepoRate[] = TERM_CONFIGS.map((cfg) => {
    const gcRate = jitter(cfg.baseGC, 4);
    const spreadToSOFR = round2((gcRate - sofrRate) * 100); // bps
    const bidOffer = 0.5 + rng() * 1.5; // bps bid-offer spread
    const bidRate = round4(gcRate - bidOffer / 10000);
    const offerRate = round4(gcRate + bidOffer / 10000);
    const volume = volJitter(cfg.baseVol, 0.12);
    const change = round4((rng() - 0.5) * 0.008);
    return { tenor: cfg.tenor, gcRate, spreadToSOFR, bidRate, offerRate, volume, change };
  });

  // 3. Collateral Type Breakdown
  const collateralBreakdown: CollateralBreakdown[] = COLLATERAL_CONFIGS.map((cfg) => {
    const overnightRate = jitter(cfg.baseON, 4);
    const termRate = jitter(cfg.baseTerm, 5);
    const rateDifferential = round2((overnightRate - sofrRate) * 100); // bps vs SOFR
    const haircut = round1(cfg.baseHaircut + (rng() - 0.5) * 1.0);
    const volumeShare = round1(cfg.baseShare + (rng() - 0.5) * 4);

    const spread = overnightRate - sofrRate;
    let availability: 'AMPLE' | 'TIGHT' | 'SCARCE';
    if (spread > 0.15) availability = 'SCARCE';
    else if (spread > 0.05) availability = 'TIGHT';
    else availability = 'AMPLE';

    return { collateral: cfg.collateral, overnightRate, termRate, rateDifferential, haircut, volumeShare, availability };
  });

  // 4. Special vs GC Spread
  const specialVsGC: SpecialVsGC[] = SPECIAL_CONFIGS.map((cfg) => {
    const specialRate = jitter(cfg.baseSpecial, 8);
    const gcRate = jitter(cfg.baseGC, 3);
    const spread = round2((specialRate - gcRate) * 100); // bps (negative = trading special)
    const specialness = round1(Math.abs(spread)); // bps magnitude

    let direction: 'RICH' | 'CHEAP' | 'FAIR';
    if (spread < -10) direction = 'RICH';
    else if (spread > 5) direction = 'CHEAP';
    else direction = 'FAIR';

    return { issue: cfg.issue, tenor: cfg.tenor, specialRate, gcRate, spread, specialness, direction };
  });

  // 5. Repo Volume and Outstanding
  const totalDailyVol = VOLUME_SEGMENTS.reduce((s, v) => s + v.baseDailyVol, 0);
  const volumeOutstanding: RepoVolumeOutstanding[] = VOLUME_SEGMENTS.map((cfg) => {
    const dailyVolume = volJitter(cfg.baseDailyVol, 0.08);
    const outstanding = volJitter(cfg.baseOutstanding, 0.06);
    const change1d = round2((rng() - 0.5) * 6);
    const change1w = round2((rng() - 0.5) * 12);
    const shareOfTotal = round1((cfg.baseDailyVol / totalDailyVol) * 100);
    return { segment: cfg.segment, dailyVolume, outstanding, change1d, change1w, shareOfTotal };
  });

  // 6. Historical Rate Series (30 days)
  const historicalRates: HistoricalRatePoint[] = [];
  for (let d = 29; d >= 0; d--) {
    const histDate = new Date(today);
    histDate.setDate(histDate.getDate() - d);
    // Skip weekends
    const dow = histDate.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = histDate.toISOString().slice(0, 10);
    const dayRng = mulberry32(hashSeed(dateStr + '-repo-hist'));

    const dayJitter = (base: number, bps: number) =>
      round4(base + (dayRng() - 0.5) * 2 * (bps / 10000));

    // Check if near quarter-end for spike effect
    const month = histDate.getMonth();
    const dayOfMonth = histDate.getDate();
    const daysInMonth = new Date(histDate.getFullYear(), month + 1, 0).getDate();
    const isQEnd = (month % 3 === 2) && (daysInMonth - dayOfMonth <= 3);
    const spikeBps = isQEnd ? 5 + dayRng() * 15 : 0;

    historicalRates.push({
      date: dateStr,
      sofr: round4(dayJitter(4.31, 3) + spikeBps / 10000),
      fedFunds: round4(dayJitter(4.33, 2) + spikeBps / 20000),
      triPartyGC: round4(dayJitter(4.30, 3) + spikeBps / 10000),
      gcfRepo: round4(dayJitter(4.31, 4) + spikeBps / 8000),
      bilateral: round4(dayJitter(4.32, 4) + spikeBps / 10000),
    });
  }

  // 7. Quarter-End / Year-End Rate Spikes Indicator
  const quarterEnds: { month: number; day: number; label: string }[] = [
    { month: 2, day: 31, label: 'Q1 End' },
    { month: 5, day: 30, label: 'Q2 End' },
    { month: 8, day: 30, label: 'Q3 End' },
    { month: 11, day: 31, label: 'Q4 / Year End' },
  ];

  const quarterEndIndicators: QuarterEndIndicator[] = [];
  for (const qe of quarterEnds) {
    // Find next occurrence
    let qeDate = new Date(today.getFullYear(), qe.month, qe.day);
    if (qeDate < today) {
      qeDate = new Date(today.getFullYear() + 1, qe.month, qe.day);
    }
    const daysUntil = Math.ceil((qeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const isYearEnd = qe.month === 11;
    const baseSpike = isYearEnd ? 18 : 10;
    const expectedSpikeBps = round1(baseSpike + rng() * 8);
    const historicalAvgSpikeBps = round1(isYearEnd ? 22 : 12 + rng() * 4);

    const isApproaching = daysUntil <= 14;
    let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    if (daysUntil <= 3) severity = isYearEnd ? 'CRITICAL' : 'HIGH';
    else if (daysUntil <= 7) severity = isYearEnd ? 'HIGH' : 'MODERATE';
    else if (daysUntil <= 14) severity = 'MODERATE';
    else severity = 'LOW';

    quarterEndIndicators.push({
      date: qeDate.toISOString().slice(0, 10),
      label: qe.label,
      daysUntil,
      expectedSpikeBps,
      historicalAvgSpikeBps,
      isApproaching,
      severity,
    });
  }

  // 8. Fed RRP Facility Usage
  const rrpUsage = round2(450 + (rng() - 0.5) * 200);
  const rrpChange1d = round2((rng() - 0.5) * 30);
  const rrpChange1w = round2((rng() - 0.5) * 60);
  const rrpCounterparties = Math.round(60 + rng() * 40);
  const rrpAwardRate = round4(4.30 + (rng() - 0.5) * 0.02);
  const rrpPeak = 2554.3; // Dec 2022 historical peak
  const rrpPeakDate = '2022-12-30';
  const percentOfPeak = round1((rrpUsage / rrpPeak) * 100);

  const fedRRPFacility: FedRRPFacility = {
    usage: rrpUsage,
    change1d: rrpChange1d,
    change1w: rrpChange1w,
    counterparties: rrpCounterparties,
    awardRate: rrpAwardRate,
    peak: rrpPeak,
    peakDate: rrpPeakDate,
    percentOfPeak,
  };

  // 9. Market Summary
  const totalVolume = round1(
    volumeOutstanding.reduce((sum, v) => sum + v.dailyVolume, 0),
  );
  const totalOutstanding = round1(
    volumeOutstanding.reduce((sum, v) => sum + v.outstanding, 0),
  );
  const gcRates = overnightRates.filter((r) =>
    ['TGCR', 'GCF'].includes(r.code),
  );
  const avgGCRate = round4(
    gcRates.reduce((sum, r) => sum + r.rate, 0) / (gcRates.length || 1),
  );
  const gcFfSpread = round2((avgGCRate - ffRate) * 100); // bps
  const dayOverDayChange = round4((rng() - 0.5) * 0.008);

  const nearestQE = quarterEndIndicators.reduce((a, b) =>
    a.daysUntil < b.daysUntil ? a : b,
  );
  const quarterEndPressure =
    nearestQE.daysUntil <= 7
      ? `${nearestQE.label} in ${nearestQE.daysUntil}d — elevated pressure`
      : nearestQE.daysUntil <= 14
        ? `${nearestQE.label} in ${nearestQE.daysUntil}d — watch for tightening`
        : 'Normal';

  const marketSummary: MarketSummary = {
    totalVolume,
    totalOutstanding,
    avgGCRate,
    gcFfSpread,
    dayOverDayChange,
    quarterEndPressure,
  };

  return {
    overnightRates,
    termRepoRates,
    collateralBreakdown,
    specialVsGC,
    volumeOutstanding,
    historicalRates,
    quarterEndIndicators,
    fedRRPFacility,
    marketSummary,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RepoRateMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to generate repo rate monitor data' });
  }
});

export default router;
