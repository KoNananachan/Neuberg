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

// ── Static definitions ──

interface PipelineEntry {
  assetClass: string;
  pendingTrades: number;
  pendingValue: number;
  dueToday: number;
  failedToday: number;
  failedValue: number;
  settlementRate: number;
  avgSettlementTime: number;
}

interface CLSEntry {
  pair: string;
  dailyVolume: number;
  netted: number;
  nettingEfficiency: number;
  pvpSettlements: number;
  timelySettlement: number;
}

interface AgingBucket {
  bucket: string;
  count: number;
  value: number;
  trend: 'improving' | 'deteriorating' | 'stable';
  topReason: string;
}

interface DvPAnalysis {
  totalDvpTransactions: number;
  autoMatchedPct: number;
  manualMatchedPct: number;
  failedPct: number;
  avgMatchingTime: number;
  stpRate: number;
}

const ASSET_CLASSES = [
  { name: 'Equities', basePending: 42500, basePendingVal: 18.4, baseDueToday: 8.2, baseFailedCount: 185, baseFailedVal: 42.5, baseRate: 98.8, baseTime: 2.1 },
  { name: 'Fixed Income', basePending: 18200, basePendingVal: 85.6, baseDueToday: 32.1, baseFailedCount: 95, baseFailedVal: 128.3, baseRate: 98.2, baseTime: 3.8 },
  { name: 'FX', basePending: 28600, basePendingVal: 245.8, baseDueToday: 112.4, baseFailedCount: 42, baseFailedVal: 85.2, baseRate: 99.3, baseTime: 1.2 },
  { name: 'Derivatives', basePending: 12400, basePendingVal: 32.5, baseDueToday: 14.8, baseFailedCount: 128, baseFailedVal: 65.8, baseRate: 97.6, baseTime: 5.2 },
  { name: 'Repo', basePending: 8900, basePendingVal: 142.3, baseDueToday: 68.5, baseFailedCount: 35, baseFailedVal: 95.4, baseRate: 99.1, baseTime: 1.5 },
  { name: 'Securities Lending', basePending: 6200, basePendingVal: 28.7, baseDueToday: 12.3, baseFailedCount: 72, baseFailedVal: 18.9, baseRate: 97.8, baseTime: 4.6 },
];

const CLS_PAIRS = [
  { pair: 'EUR/USD', baseVol: 285.4, baseNetted: 271.5, baseEff: 95.1, basePvp: 48200, baseTimely: 99.2 },
  { pair: 'USD/JPY', baseVol: 198.2, baseNetted: 187.8, baseEff: 94.8, basePvp: 35800, baseTimely: 99.1 },
  { pair: 'GBP/USD', baseVol: 142.6, baseNetted: 135.9, baseEff: 95.3, basePvp: 28400, baseTimely: 99.4 },
  { pair: 'USD/CHF', baseVol: 82.5, baseNetted: 78.8, baseEff: 95.5, basePvp: 16200, baseTimely: 99.3 },
  { pair: 'AUD/USD', baseVol: 68.3, baseNetted: 64.8, baseEff: 94.9, basePvp: 12800, baseTimely: 99.0 },
  { pair: 'USD/CAD', baseVol: 72.1, baseNetted: 68.5, baseEff: 95.0, basePvp: 13500, baseTimely: 99.2 },
  { pair: 'EUR/GBP', baseVol: 45.8, baseNetted: 43.6, baseEff: 95.2, basePvp: 9200, baseTimely: 99.5 },
  { pair: 'USD/CNH', baseVol: 52.4, baseNetted: 49.2, baseEff: 93.9, basePvp: 8600, baseTimely: 98.5 },
];

const AGING_BUCKETS = [
  { bucket: 'T+1', baseCount: 285, baseVal: 142.5, baseReasons: ['SSI mismatch', 'Insufficient securities', 'Late affirmation'] },
  { bucket: 'T+2', baseCount: 165, baseVal: 98.2, baseReasons: ['Counterparty funding delay', 'Documentation pending', 'CSD processing error'] },
  { bucket: 'T+3-5', baseCount: 92, baseVal: 68.4, baseReasons: ['Corporate action pending', 'Regulatory hold', 'Custody transfer delay'] },
  { bucket: 'T+6-10', baseCount: 48, baseVal: 35.8, baseReasons: ['Bilateral dispute', 'Cross-border settlement delay', 'Collateral substitution'] },
  { bucket: 'T+11-30', baseCount: 22, baseVal: 18.5, baseReasons: ['Legal review required', 'Restructuring event', 'Sanctions screening hold'] },
  { bucket: 'T+30+', baseCount: 8, baseVal: 12.2, baseReasons: ['Litigation hold', 'Insolvency proceeding', 'Force majeure event'] },
];

const TRENDS: Array<'improving' | 'deteriorating' | 'stable'> = ['improving', 'deteriorating', 'stable'];

// ── Cache ──

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-settlement-risk'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // 1. Settlement Pipeline
  const settlementPipeline: PipelineEntry[] = ASSET_CLASSES.map(ac => {
    const pendingTrades = Math.round(jitter(ac.basePending, 0.08));
    const pendingValue = round1(jitter(ac.basePendingVal, 0.10));
    const dueToday = round1(jitter(ac.baseDueToday, 0.12));
    const failedToday = Math.round(jitter(ac.baseFailedCount, 0.15));
    const failedValue = round1(jitter(ac.baseFailedVal, 0.12));
    const settlementRate = round2(Math.min(99.9, Math.max(95.0, jitter(ac.baseRate, 0.008))));
    const avgSettlementTime = round1(Math.max(0.5, jitter(ac.baseTime, 0.10)));

    return {
      assetClass: ac.name,
      pendingTrades,
      pendingValue,
      dueToday,
      failedToday,
      failedValue,
      settlementRate,
      avgSettlementTime,
    };
  });

  // 2. CLS Settlement
  const clsSettlement: CLSEntry[] = CLS_PAIRS.map(cp => {
    const dailyVolume = round1(jitter(cp.baseVol, 0.08));
    const nettingEfficiency = round2(Math.min(99.0, Math.max(92.0, jitter(cp.baseEff, 0.008))));
    const netted = round1(dailyVolume * nettingEfficiency / 100);
    const pvpSettlements = Math.round(jitter(cp.basePvp, 0.06));
    const timelySettlement = round2(Math.min(99.9, Math.max(97.0, jitter(cp.baseTimely, 0.004))));

    return {
      pair: cp.pair,
      dailyVolume,
      netted,
      nettingEfficiency,
      pvpSettlements,
      timelySettlement,
    };
  });

  // 3. Failed Trades Aging
  const failedTradesAging: AgingBucket[] = AGING_BUCKETS.map(ab => {
    const count = Math.round(jitter(ab.baseCount, 0.15));
    const value = round1(jitter(ab.baseVal, 0.12));
    const trendIdx = Math.floor(rng() * 3);
    const trend = TRENDS[trendIdx];
    const reasonIdx = Math.floor(rng() * ab.baseReasons.length);
    const topReason = ab.baseReasons[reasonIdx];

    return {
      bucket: ab.bucket,
      count,
      value,
      trend,
      topReason,
    };
  });

  // 4. DvP Analysis
  const totalDvpTransactions = Math.round(jitter(125400, 0.06));
  const autoMatchedPct = round2(Math.min(99.0, Math.max(88.0, jitter(92.8, 0.015))));
  const failedPct = round2(Math.min(5.0, Math.max(0.5, jitter(1.8, 0.15))));
  const manualMatchedPct = round2(Math.max(0.5, 100 - autoMatchedPct - failedPct));
  const avgMatchingTime = round1(Math.max(1.0, jitter(8.5, 0.12)));
  const stpRate = round2(Math.min(99.5, Math.max(85.0, jitter(94.2, 0.012))));

  const dvpAnalysis: DvPAnalysis = {
    totalDvpTransactions,
    autoMatchedPct,
    manualMatchedPct,
    failedPct,
    avgMatchingTime,
    stpRate,
  };

  return {
    settlementPipeline,
    clsSettlement,
    failedTradesAging,
    dvpAnalysis,
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
    console.error('[SettlementRisk] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate settlement risk data' });
  }
});

export default router;
