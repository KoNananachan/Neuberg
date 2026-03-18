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

// ── Seed Data ──

const PRODUCTS = ['IRS', 'CDS', 'FX', 'Equity'] as const;

const PRODUCT_BASE_NOTIONAL: Record<string, { submitted: number; ratio: number }> = {
  IRS: { submitted: 245, ratio: 0.78 },
  CDS: { submitted: 8.4, ratio: 0.72 },
  FX: { submitted: 32, ratio: 0.65 },
  Equity: { submitted: 12.5, ratio: 0.68 },
};

const COUNTERPARTIES = [
  { name: 'JPMorgan Chase', baseGross: 285, baseNetting: 0.88, agreement: 'CSA' as const, baseCollateral: 42 },
  { name: 'Goldman Sachs', baseGross: 248, baseNetting: 0.86, agreement: 'CSA' as const, baseCollateral: 38 },
  { name: 'Citigroup', baseGross: 215, baseNetting: 0.84, agreement: 'CSA' as const, baseCollateral: 32 },
  { name: 'Bank of America', baseGross: 198, baseNetting: 0.82, agreement: 'CSA' as const, baseCollateral: 28 },
  { name: 'Morgan Stanley', baseGross: 185, baseNetting: 0.85, agreement: 'CSA' as const, baseCollateral: 26 },
  { name: 'Barclays', baseGross: 162, baseNetting: 0.80, agreement: 'ISDA' as const, baseCollateral: 22 },
  { name: 'Deutsche Bank', baseGross: 148, baseNetting: 0.78, agreement: 'ISDA' as const, baseCollateral: 18 },
  { name: 'UBS', baseGross: 132, baseNetting: 0.76, agreement: 'ISDA' as const, baseCollateral: 15 },
  { name: 'HSBC', baseGross: 118, baseNetting: 0.74, agreement: 'ISDA' as const, baseCollateral: 14 },
  { name: 'BNP Paribas', baseGross: 105, baseNetting: 0.72, agreement: 'ISDA' as const, baseCollateral: 12 },
] as const;

const PORTFOLIO_BUCKETS = [
  { product: 'IRS', baseGross: 218.5, baseNet: 28.4, baseTrades: 184500, baseLines: 312000, baseMaturity: 5.8, baseDV01: 485 },
  { product: 'CDS', baseGross: 8.2, baseNet: 1.8, baseTrades: 42300, baseLines: 68500, baseMaturity: 4.2, baseDV01: 125 },
  { product: 'FX', baseGross: 35.6, baseNet: 5.2, baseTrades: 128000, baseLines: 195000, baseMaturity: 1.4, baseDV01: 62 },
  { product: 'Equity', baseGross: 14.8, baseNet: 3.1, baseTrades: 56200, baseLines: 82000, baseMaturity: 2.6, baseDV01: 95 },
] as const;

const STATUSES = ['completed', 'in-progress', 'scheduled'] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-trade-compression'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // ── 1. Compression Cycles (last 8) ──

  const compressionCycles = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const cycleDate = new Date(today);
    cycleDate.setDate(today.getDate() - i * 14 - Math.floor(rng() * 5));
    const product = PRODUCTS[i % PRODUCTS.length];
    const baseNotional = PRODUCT_BASE_NOTIONAL[product];
    const submittedNotional = roundTo(jitter(baseNotional.submitted, 0.12), 1);
    const compressionRatio = roundTo(Math.min(92, Math.max(55, jitter(baseNotional.ratio * 100, 0.1))), 1);
    const eliminatedNotional = roundTo(submittedNotional * compressionRatio / 100, 1);
    const participantCount = Math.round(jitter(18, 0.25));

    let status: typeof STATUSES[number];
    if (i === 0) {
      const roll = rng();
      status = roll < 0.4 ? 'in-progress' : roll < 0.7 ? 'scheduled' : 'completed';
    } else {
      status = 'completed';
    }

    compressionCycles.push({
      date: cycleDate.toISOString().slice(0, 10),
      product,
      submittedNotional,
      eliminatedNotional,
      compressionRatio,
      participantCount,
      status,
    });
  }

  // ── 2. Portfolio Summary ──

  const portfolioSummary = PORTFOLIO_BUCKETS.map(bucket => {
    const grossNotional = roundTo(jitter(bucket.baseGross, 0.08), 1);
    const netNotional = roundTo(jitter(bucket.baseNet, 0.1), 1);
    const tradeCount = Math.round(jitter(bucket.baseTrades, 0.06));
    const lineItems = Math.round(jitter(bucket.baseLines, 0.06));
    const avgMaturity = roundTo(jitter(bucket.baseMaturity, 0.08), 1);
    const dv01 = roundTo(jitter(bucket.baseDV01, 0.1), 1);

    return {
      product: bucket.product,
      grossNotional,
      netNotional,
      tradeCount,
      lineItems,
      avgMaturity,
      dv01,
    };
  });

  // ── 3. Counterparty Netting (top 10) ──

  const counterpartyNetting = COUNTERPARTIES.map(cp => {
    const grossExposure = roundTo(jitter(cp.baseGross, 0.1), 1);
    const nettingRatio = roundTo(Math.min(95, Math.max(65, jitter(cp.baseNetting * 100, 0.06))), 1);
    const netExposure = roundTo(grossExposure * (1 - nettingRatio / 100), 1);
    const collateralPosted = roundTo(jitter(cp.baseCollateral, 0.12), 1);

    return {
      name: cp.name,
      grossExposure,
      netExposure,
      nettingRatio,
      bilateralAgreement: cp.agreement,
      collateralPosted,
    };
  });

  // ── 4. Efficiency Metrics ──

  const totalGrossPreCompression = roundTo(
    portfolioSummary.reduce((s, b) => s + b.grossNotional, 0),
    1,
  );
  const avgCompressionRate = roundTo(
    compressionCycles
      .filter(c => c.status === 'completed')
      .reduce((s, c) => s + c.compressionRatio, 0) /
    Math.max(1, compressionCycles.filter(c => c.status === 'completed').length),
    1,
  );
  const totalGrossPostCompression = roundTo(
    totalGrossPreCompression * (1 - avgCompressionRate / 100),
    1,
  );

  const totalTradesPreCompression = portfolioSummary.reduce((s, b) => s + b.tradeCount, 0);
  const tradeCountReduction = roundTo(jitter(62, 0.08), 1);
  const capitalSavings = roundTo(jitter(2850, 0.12), 0);
  const marginRelief = roundTo(jitter(1420, 0.1), 0);
  const operationalSavings = roundTo(jitter(185, 0.15), 1);

  const efficiencyMetrics = {
    preCompressionNotional: totalGrossPreCompression,
    postCompressionNotional: totalGrossPostCompression,
    tradeCountReduction,
    capitalSavings,
    marginRelief,
    operationalSavings,
  };

  return {
    compressionCycles,
    portfolioSummary,
    counterpartyNetting,
    efficiencyMetrics,
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
    console.error('[TradeCompression] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate trade compression data' });
  }
});

export default router;
