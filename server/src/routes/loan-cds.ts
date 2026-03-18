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

const SINGLE_NAMES = [
  { name: 'Caesars Entertainment', sector: 'Gaming', rating: 'B+', baseLcds: 285, baseCds: 380, baseLoanPrice: 98.5, baseBondPrice: 94.0, assumedRecovery: 70 },
  { name: 'First Data (Fiserv)', sector: 'Technology', rating: 'B+', baseLcds: 210, baseCds: 305, baseLoanPrice: 99.2, baseBondPrice: 96.5, assumedRecovery: 70 },
  { name: 'Asurion', sector: 'Insurance', rating: 'B', baseLcds: 340, baseCds: 455, baseLoanPrice: 96.8, baseBondPrice: 91.5, assumedRecovery: 70 },
  { name: 'Uber Technologies', sector: 'Technology', rating: 'B+', baseLcds: 195, baseCds: 280, baseLoanPrice: 99.5, baseBondPrice: 97.0, assumedRecovery: 70 },
  { name: 'Dell Technologies', sector: 'Technology', rating: 'B+', baseLcds: 175, baseCds: 260, baseLoanPrice: 99.8, baseBondPrice: 97.5, assumedRecovery: 70 },
  { name: 'Sprint (T-Mobile)', sector: 'Telecom', rating: 'B', baseLcds: 310, baseCds: 420, baseLoanPrice: 97.5, baseBondPrice: 92.8, assumedRecovery: 70 },
  { name: 'Hilton Worldwide', sector: 'Hospitality', rating: 'B+', baseLcds: 220, baseCds: 315, baseLoanPrice: 99.0, baseBondPrice: 96.0, assumedRecovery: 70 },
  { name: 'Clear Channel Outdoor', sector: 'Media', rating: 'B-', baseLcds: 480, baseCds: 625, baseLoanPrice: 93.0, baseBondPrice: 85.5, assumedRecovery: 70 },
  { name: 'Hertz Corporation', sector: 'Transportation', rating: 'B', baseLcds: 365, baseCds: 490, baseLoanPrice: 96.0, baseBondPrice: 90.0, assumedRecovery: 70 },
  { name: 'US Foods', sector: 'Consumer', rating: 'B+', baseLcds: 230, baseCds: 330, baseLoanPrice: 99.0, baseBondPrice: 95.5, assumedRecovery: 70 },
  { name: 'Albertsons', sector: 'Retail', rating: 'B+', baseLcds: 205, baseCds: 295, baseLoanPrice: 99.3, baseBondPrice: 96.8, assumedRecovery: 70 },
  { name: 'TransDigm Group', sector: 'Aerospace', rating: 'B', baseLcds: 295, baseCds: 405, baseLoanPrice: 98.0, baseBondPrice: 93.5, assumedRecovery: 70 },
  { name: 'Reynolds Group', sector: 'Packaging', rating: 'B-', baseLcds: 420, baseCds: 560, baseLoanPrice: 94.5, baseBondPrice: 87.5, assumedRecovery: 70 },
  { name: 'Numericable (Altice)', sector: 'Telecom', rating: 'CCC+', baseLcds: 580, baseCds: 750, baseLoanPrice: 88.0, baseBondPrice: 78.0, assumedRecovery: 70 },
  { name: 'Intelsat', sector: 'Satellite', rating: 'B-', baseLcds: 450, baseCds: 595, baseLoanPrice: 93.5, baseBondPrice: 86.0, assumedRecovery: 70 },
];

const RECOVERY_SECTORS = [
  { sector: 'Technology', historicalRecovery: 72.5 },
  { sector: 'Healthcare', historicalRecovery: 68.0 },
  { sector: 'Telecom', historicalRecovery: 65.5 },
  { sector: 'Gaming', historicalRecovery: 70.0 },
  { sector: 'Retail', historicalRecovery: 58.5 },
  { sector: 'Media', historicalRecovery: 55.0 },
  { sector: 'Aerospace', historicalRecovery: 74.0 },
  { sector: 'Consumer', historicalRecovery: 62.5 },
  { sector: 'Insurance', historicalRecovery: 71.0 },
  { sector: 'Hospitality', historicalRecovery: 66.5 },
  { sector: 'Transportation', historicalRecovery: 63.0 },
  { sector: 'Packaging', historicalRecovery: 60.0 },
  { sector: 'Satellite', historicalRecovery: 52.0 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-loan-cds'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Generate single names
  const singleNames = SINGLE_NAMES.map(sn => {
    const lcdsSpread = Math.round(jitter(sn.baseLcds, 0.08));
    const cdsSpread = Math.round(jitter(sn.baseCds, 0.08));
    const basisVsUnsecured = lcdsSpread - cdsSpread;
    const change1d = Math.round((rng() - 0.5) * sn.baseLcds * 0.04);
    const change1w = Math.round((rng() - 0.5) * sn.baseLcds * 0.08);
    const loanPrice = Math.round(jitter(sn.baseLoanPrice, 0.01) * 100) / 100;
    const bondPrice = Math.round(jitter(sn.baseBondPrice, 0.02) * 100) / 100;
    const assumedRecovery = sn.assumedRecovery;
    const impliedRecovery = Math.round((60 + rng() * 20) * 10) / 10;
    const recoveryLock = rng() > 0.65 ? Math.round((60 + rng() * 20) * 100) / 100 : null;

    return {
      name: sn.name,
      sector: sn.sector,
      rating: sn.rating,
      lcdsSpread,
      change1d,
      change1w,
      cdsSpread,
      basisVsUnsecured,
      impliedRecovery,
      assumedRecovery,
      recoveryLock,
      loanPrice,
      bondPrice,
    };
  });

  // LCDX index
  const lcdxBaseSpread = 275;
  const lcdxSpread = Math.round(jitter(lcdxBaseSpread, 0.06));
  const lcdxChange1d = Math.round((rng() - 0.5) * lcdxBaseSpread * 0.03);
  const lcdxChange1w = Math.round((rng() - 0.5) * lcdxBaseSpread * 0.06);
  const lcdxChange1m = Math.round((rng() - 0.5) * lcdxBaseSpread * 0.10);
  const lcdxPrice = Math.round((100 - lcdxSpread * 0.035) * 1000) / 1000;
  const lcdxCoupon = 250;
  const lcdxUpfront = Math.round((lcdxSpread - lcdxCoupon) * 4.5 / 100 * 1000) / 1000;
  const lcdxDV01 = Math.round((4200 + rng() * 600) * 100) / 100;

  // Intrinsic value from single names
  const avgSingleNameSpread = Math.round(singleNames.reduce((a, s) => a + s.lcdsSpread, 0) / singleNames.length);
  const lcdxIntrinsic = Math.round(avgSingleNameSpread * (0.95 + rng() * 0.10));

  const index = {
    name: 'LCDX.NA',
    series: 39,
    maturity: '5Y',
    spread: lcdxSpread,
    change1d: lcdxChange1d,
    change1w: lcdxChange1w,
    change1m: lcdxChange1m,
    price: lcdxPrice,
    coupon: lcdxCoupon,
    upfront: lcdxUpfront,
    dv01: lcdxDV01,
    intrinsicValue: lcdxIntrinsic,
  };

  // Summary
  const totalNotional = Math.round(jitter(45, 0.08) * 10) / 10;
  const avgRecoveryAssumption = 70;
  const summary = {
    lcdxSpread: index.spread,
    change1d: index.change1d,
    totalNotionalBn: totalNotional,
    avgSingleNameSpread,
    recoveryRateAssumption: avgRecoveryAssumption,
    activeNames: singleNames.length,
  };

  // Recovery rate analysis
  const recoveryDistribution = [
    { bucket: '60-65%', count: Math.floor(1 + rng() * 3), type: 'LCDS' as const },
    { bucket: '65-70%', count: Math.floor(2 + rng() * 4), type: 'LCDS' as const },
    { bucket: '70-75%', count: Math.floor(3 + rng() * 5), type: 'LCDS' as const },
    { bucket: '75-80%', count: Math.floor(1 + rng() * 3), type: 'LCDS' as const },
    { bucket: '35-40%', count: Math.floor(4 + rng() * 6), type: 'CDS' as const },
    { bucket: '40-45%', count: Math.floor(3 + rng() * 5), type: 'CDS' as const },
  ];

  const historicalRecoveryBySector = RECOVERY_SECTORS.map(rs => ({
    sector: rs.sector,
    loanRecovery: Math.round(jitter(rs.historicalRecovery, 0.05) * 10) / 10,
    bondRecovery: Math.round(jitter(rs.historicalRecovery * 0.58, 0.08) * 10) / 10,
  }));

  const recoveryAnalysis = {
    lcdsAssumption: 70,
    cdsAssumption: 40,
    recoveryDistribution,
    historicalRecoveryBySector,
  };

  // Relative value
  const relativeValue = singleNames.map(sn => {
    const spreadDiff = sn.lcdsSpread - sn.cdsSpread;
    const priceDiff = Math.round((sn.loanPrice - sn.bondPrice) * 100) / 100;
    const impliedBasis = Math.round(spreadDiff / sn.cdsSpread * 10000) / 100;

    let signal: 'Rich' | 'Fair' | 'Cheap';
    if (impliedBasis > -20) {
      signal = 'Rich';
    } else if (impliedBasis < -35) {
      signal = 'Cheap';
    } else {
      signal = 'Fair';
    }

    return {
      name: sn.name,
      lcdsSpread: sn.lcdsSpread,
      cdsSpread: sn.cdsSpread,
      spreadDiff,
      loanPrice: sn.loanPrice,
      bondPrice: sn.bondPrice,
      priceDiff,
      impliedBasis,
      signal,
    };
  });

  return {
    summary,
    index,
    singleNames,
    recoveryAnalysis,
    relativeValue,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LoanCDS] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate loan CDS data' });
  }
});

export default router;
