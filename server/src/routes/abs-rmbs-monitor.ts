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

const PREPAY_SECTORS = [
  { sector: 'FNMA 30Y 2.0', cprMin: 3, cprMax: 8 },
  { sector: 'FNMA 30Y 2.5', cprMin: 4, cprMax: 10 },
  { sector: 'FNMA 30Y 3.0', cprMin: 8, cprMax: 15 },
  { sector: 'FNMA 30Y 3.5', cprMin: 12, cprMax: 25 },
  { sector: 'GNMA 30Y 2.5', cprMin: 5, cprMax: 11 },
  { sector: 'FNMA 15Y 2.0', cprMin: 3, cprMax: 8 },
  { sector: 'FNMA 15Y 2.5', cprMin: 5, cprMax: 12 },
  { sector: 'GNMA 15Y 2.0', cprMin: 3, cprMax: 9 },
];

const DQ_CATEGORIES = [
  { category: 'Prime RMBS', totalBase: 2.0, fcBase: 0.3, reoBase: 0.1 },
  { category: 'Subprime Legacy', totalBase: 12.0, fcBase: 3.5, reoBase: 1.8 },
  { category: 'Alt-A Legacy', totalBase: 8.0, fcBase: 2.5, reoBase: 1.2 },
  { category: 'Auto ABS', totalBase: 3.0, fcBase: 0, reoBase: 0 },
  { category: 'Student Loan ABS', totalBase: 5.5, fcBase: 0, reoBase: 0 },
  { category: 'Credit Card ABS', totalBase: 2.5, fcBase: 0, reoBase: 0 },
];

const LOSS_SECTORS = [
  { sector: 'Agency MBS', lsBase: 5, rrBase: 95, tlBase: 8, clBase: 0.02, plBase: 0.03 },
  { sector: 'Non-Agency Prime', lsBase: 22, rrBase: 78, tlBase: 18, clBase: 1.2, plBase: 1.5 },
  { sector: 'Non-Agency Alt-A', lsBase: 38, rrBase: 62, tlBase: 22, clBase: 4.5, plBase: 5.0 },
  { sector: 'Auto ABS AAA', lsBase: 35, rrBase: 65, tlBase: 6, clBase: 0.1, plBase: 0.12 },
  { sector: 'Auto ABS BBB', lsBase: 48, rrBase: 52, tlBase: 8, clBase: 2.5, plBase: 3.0 },
  { sector: 'Student Loan', lsBase: 55, rrBase: 45, tlBase: 24, clBase: 3.0, plBase: 3.5 },
];

const VINTAGES = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', 'All'];
const VINTAGE_BASES: Record<string, { wac: number; wam: number; fico: number; ltv: number; dq60: number; cl: number; factor: number }> = {
  '2018': { wac: 4.8, wam: 280, fico: 745, ltv: 76, dq60: 1.8, cl: 0.35, factor: 0.55 },
  '2019': { wac: 4.2, wam: 295, fico: 748, ltv: 75, dq60: 1.5, cl: 0.28, factor: 0.62 },
  '2020': { wac: 3.2, wam: 310, fico: 760, ltv: 72, dq60: 0.9, cl: 0.12, factor: 0.78 },
  '2021': { wac: 3.0, wam: 325, fico: 755, ltv: 74, dq60: 0.7, cl: 0.08, factor: 0.85 },
  '2022': { wac: 5.2, wam: 338, fico: 740, ltv: 78, dq60: 1.2, cl: 0.15, factor: 0.90 },
  '2023': { wac: 6.5, wam: 348, fico: 738, ltv: 80, dq60: 0.8, cl: 0.05, factor: 0.95 },
  '2024': { wac: 6.8, wam: 355, fico: 735, ltv: 81, dq60: 0.3, cl: 0.01, factor: 0.98 },
  'All':  { wac: 4.8, wam: 320, fico: 746, ltv: 76, dq60: 1.1, cl: 0.18, factor: 0.75 },
};

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-abs-rmbs-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // 1. Prepayment Speeds
  const trends: Array<'Accelerating' | 'Decelerating' | 'Stable'> = ['Accelerating', 'Decelerating', 'Stable'];
  const prepaymentSpeeds = PREPAY_SECTORS.map(p => {
    const range = p.cprMax - p.cprMin;
    const cpr1m = round1(p.cprMin + rng() * range);
    const cpr3m = round1(p.cprMin + rng() * range);
    const cpr6m = round1(p.cprMin + rng() * range);
    const cpr12m = round1(p.cprMin + rng() * range);
    const cprLong = round1(p.cprMin + rng() * range * 0.7);
    const model = round1(p.cprMin + rng() * range * 0.8);
    const surprise = round1(cpr1m - model);
    const trend = pick(trends);
    return { sector: p.sector, cpr1m, cpr3m, cpr6m, cpr12m, cprLong, model, surprise, trend };
  });

  // 2. Delinquency Data
  const delinquencyData = DQ_CATEGORIES.map(d => {
    const totalDQ = round2(jitter(d.totalBase, 0.15));
    const dq30 = round2(totalDQ * (0.45 + rng() * 0.1));
    const dq60 = round2(totalDQ * (0.2 + rng() * 0.08));
    const dq90plus = round2(totalDQ - dq30 - dq60);
    const foreclosure = d.fcBase > 0 ? round2(jitter(d.fcBase, 0.2)) : 0;
    const reo = d.reoBase > 0 ? round2(jitter(d.reoBase, 0.2)) : 0;
    const current = round2(100 - totalDQ - foreclosure - reo);
    const change = round2((rng() - 0.5) * 0.6);
    return { category: d.category, current, dq30, dq60, dq90plus, foreclosure, reo, totalDQ, change };
  });

  // 3. Loss Severity
  const lossSeverity = LOSS_SECTORS.map(l => {
    const ls = round2(jitter(l.lsBase, 0.1));
    const rr = round2(jitter(l.rrBase, 0.05));
    const avgTimeline = Math.round(jitter(l.tlBase, 0.15));
    const cumulativeLoss = round2(jitter(l.clBase, 0.12));
    const projectedLoss = round2(jitter(l.plBase, 0.1));
    const cushion = round2(projectedLoss > 0 ? (projectedLoss - cumulativeLoss) / projectedLoss * 100 : 0);
    return { sector: l.sector, lossSeverity: ls, recoveryRate: rr, avgTimeline, cumulativeLoss, projectedLoss, cushion };
  });

  // 4. Vintage Analysis
  const vintageAnalysis = VINTAGES.map(v => {
    const b = VINTAGE_BASES[v];
    const wac = round2(jitter(b.wac, 0.03));
    const wam = Math.round(jitter(b.wam, 0.02));
    const fico = Math.round(jitter(b.fico, 0.01));
    const ltv = round1(jitter(b.ltv, 0.03));
    const dq60plus = round2(jitter(b.dq60, 0.15));
    const cumulativeLoss = round2(jitter(b.cl, 0.15));
    const factor = round2(jitter(b.factor, 0.03));
    return { vintage: v, wac, wam, fico, ltv, dq60plus, cumulativeLoss, factor };
  });

  // 5. Market Summary
  const avgCPR = round1(prepaymentSpeeds.reduce((a, p) => a + p.cpr1m, 0) / prepaymentSpeeds.length);
  const totalDelinquencyRate = round2(delinquencyData.reduce((a, d) => a + d.totalDQ, 0) / delinquencyData.length);
  const avgLossSeverity = round2(lossSeverity.reduce((a, l) => a + l.lossSeverity, 0) / lossSeverity.length);
  const newIssuanceYTD = round1(50 + rng() * 200);
  const spreadToTreasury = Math.round(40 + rng() * 100);

  const dominantTrendOptions: Array<'Tightening Prepays' | 'Rising DQ' | 'Stable'> = ['Tightening Prepays', 'Rising DQ', 'Stable'];
  const dominantTrend = pick(dominantTrendOptions);

  const marketSummary = { avgCPR, totalDelinquencyRate, avgLossSeverity, newIssuanceYTD, spreadToTreasury, dominantTrend };

  return { prepaymentSpeeds, delinquencyData, lossSeverity, vintageAnalysis, marketSummary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ABSRMBSMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ABS/RMBS monitor data' });
  }
});

export default router;
