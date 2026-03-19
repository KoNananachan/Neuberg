import { Router } from 'express';

const router = Router();

// ── Deterministic seeded PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Static data templates ──

const DISTRESSED_ISSUERS_TEMPLATE = [
  { name: 'Rite Aid Corp', sector: 'retail', baseCoupon: 7.5, baseMaturity: '2027-07-01', basePrice: 12, baseYield: 58.2, baseSpread: 5390, rating: 'D' as const, distressReason: 'restructuring' as const },
  { name: 'Envision Healthcare', sector: 'healthcare', baseCoupon: 8.75, baseMaturity: '2028-10-15', basePrice: 8, baseYield: 72.5, baseSpread: 6820, rating: 'D' as const, distressReason: 'restructuring' as const },
  { name: 'Mallinckrodt Pharma', sector: 'healthcare', baseCoupon: 10.0, baseMaturity: '2029-04-15', basePrice: 22, baseYield: 38.4, baseSpread: 3410, rating: 'CCC' as const, distressReason: 'liquidity' as const },
  { name: 'Carvana Co', sector: 'retail', baseCoupon: 5.625, baseMaturity: '2029-10-01', basePrice: 65, baseYield: 14.8, baseSpread: 1050, rating: 'CCC+' as const, distressReason: 'covenant' as const },
  { name: 'AMC Entertainment', sector: 'media', baseCoupon: 7.5, baseMaturity: '2029-02-15', basePrice: 42, baseYield: 24.6, baseSpread: 2030, rating: 'CCC' as const, distressReason: 'liquidity' as const },
  { name: 'WeWork Inc', sector: 'real estate', baseCoupon: 7.875, baseMaturity: '2027-05-01', basePrice: 5, baseYield: 148.0, baseSpread: 14370, rating: 'D' as const, distressReason: 'restructuring' as const },
  { name: 'Spirit Airlines', sector: 'retail', baseCoupon: 8.0, baseMaturity: '2028-09-15', basePrice: 28, baseYield: 34.2, baseSpread: 2990, rating: 'CC' as const, distressReason: 'operational' as const },
  { name: 'Lumen Technologies', sector: 'telecom', baseCoupon: 5.125, baseMaturity: '2029-12-15', basePrice: 55, baseYield: 15.6, baseSpread: 1130, rating: 'CCC+' as const, distressReason: 'covenant' as const },
  { name: 'Community Health Systems', sector: 'healthcare', baseCoupon: 8.0, baseMaturity: '2030-03-15', basePrice: 38, baseYield: 26.8, baseSpread: 2250, rating: 'CCC' as const, distressReason: 'liquidity' as const },
  { name: 'Diebold Nixdorf', sector: 'technology', baseCoupon: 9.375, baseMaturity: '2027-07-15', basePrice: 15, baseYield: 55.0, baseSpread: 5070, rating: 'D' as const, distressReason: 'restructuring' as const },
  { name: 'Hertz Global Holdings', sector: 'retail', baseCoupon: 4.625, baseMaturity: '2029-12-01', basePrice: 58, baseYield: 13.2, baseSpread: 895, rating: 'CCC+' as const, distressReason: 'operational' as const },
  { name: 'Revlon Inc', sector: 'retail', baseCoupon: 6.25, baseMaturity: '2028-02-15', basePrice: 6, baseYield: 96.5, baseSpread: 9220, rating: 'D' as const, distressReason: 'restructuring' as const },
  { name: 'Frontier Communications', sector: 'telecom', baseCoupon: 5.875, baseMaturity: '2030-10-15', basePrice: 48, baseYield: 17.8, baseSpread: 1350, rating: 'CCC' as const, distressReason: 'covenant' as const },
  { name: 'Cineworld Group', sector: 'media', baseCoupon: 8.5, baseMaturity: '2028-08-01', basePrice: 18, baseYield: 42.3, baseSpread: 3800, rating: 'CC' as const, distressReason: 'liquidity' as const },
  { name: 'LifePoint Health', sector: 'healthcare', baseCoupon: 9.875, baseMaturity: '2030-06-15', basePrice: 62, baseYield: 18.9, baseSpread: 1460, rating: 'CCC+' as const, distressReason: 'operational' as const },
  { name: 'Talen Energy Supply', sector: 'energy', baseCoupon: 6.625, baseMaturity: '2029-01-15', basePrice: 45, baseYield: 21.0, baseSpread: 1670, rating: 'CCC' as const, distressReason: 'liquidity' as const },
  { name: 'Windstream Holdings', sector: 'telecom', baseCoupon: 6.375, baseMaturity: '2028-08-01', basePrice: 32, baseYield: 28.5, baseSpread: 2420, rating: 'CC' as const, distressReason: 'covenant' as const },
  { name: 'Diamond Sports Group', sector: 'media', baseCoupon: 5.375, baseMaturity: '2028-08-15', basePrice: 10, baseYield: 65.0, baseSpread: 6070, rating: 'C' as const, distressReason: 'restructuring' as const },
];

const LEVERAGED_LOANS_TEMPLATE = [
  { borrower: 'Medline Industries', baseSpread: 325, basePrice: 97.5, facilitySize: 5800, baseMaturity: '2029-10-15', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'Asurion LLC', baseSpread: 400, basePrice: 95.2, facilitySize: 4200, baseMaturity: '2028-08-01', rating: 'B-' as const, type: 'TLB' as const },
  { borrower: 'Caesars Entertainment', baseSpread: 275, basePrice: 99.0, facilitySize: 3800, baseMaturity: '2030-02-15', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'TransDigm Group', baseSpread: 300, basePrice: 99.5, facilitySize: 6500, baseMaturity: '2031-03-15', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'Bausch Health', baseSpread: 475, basePrice: 90.5, facilitySize: 3200, baseMaturity: '2027-06-01', rating: 'CCC+' as const, type: 'TLB' as const },
  { borrower: 'Citrix Systems', baseSpread: 425, basePrice: 93.0, facilitySize: 4100, baseMaturity: '2029-03-01', rating: 'B-' as const, type: 'TLB' as const },
  { borrower: 'Finastra Ltd', baseSpread: 450, basePrice: 91.5, facilitySize: 2800, baseMaturity: '2028-09-15', rating: 'B-' as const, type: 'TLC' as const },
  { borrower: 'Epicor Software', baseSpread: 350, basePrice: 97.0, facilitySize: 2500, baseMaturity: '2029-07-01', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'McAfee Corp', baseSpread: 375, basePrice: 96.5, facilitySize: 3400, baseMaturity: '2029-03-01', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'PetSmart LLC', baseSpread: 400, basePrice: 96.0, facilitySize: 4800, baseMaturity: '2028-02-15', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'UKG Inc', baseSpread: 300, basePrice: 99.0, facilitySize: 5200, baseMaturity: '2031-05-01', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'Carnival Corp', baseSpread: 275, basePrice: 99.2, facilitySize: 5500, baseMaturity: '2028-10-15', rating: 'B' as const, type: 'revolver' as const },
  { borrower: 'Dun & Bradstreet', baseSpread: 325, basePrice: 98.0, facilitySize: 2900, baseMaturity: '2029-01-15', rating: 'B' as const, type: 'TLB' as const },
  { borrower: 'Athenahealth Inc', baseSpread: 375, basePrice: 96.5, facilitySize: 3100, baseMaturity: '2029-06-01', rating: 'B-' as const, type: 'TLB' as const },
  { borrower: 'Weber-Stephen Products', baseSpread: 450, basePrice: 89.5, facilitySize: 1800, baseMaturity: '2027-10-15', rating: 'CCC+' as const, type: 'TLC' as const },
];

const DEFAULT_TRACKER_TEMPLATE = [
  { company: 'Rite Aid Corp', sector: 'retail', debtAmount: 1800, defaultType: 'bankruptcy' as const, dateOffset: -15, expectedRecovery: 12.5 },
  { company: 'WeWork Inc', sector: 'real estate', debtAmount: 2300, defaultType: 'bankruptcy' as const, dateOffset: -32, expectedRecovery: 5.0 },
  { company: 'Envision Healthcare', sector: 'healthcare', debtAmount: 3500, defaultType: 'distressed-exchange' as const, dateOffset: -48, expectedRecovery: 8.2 },
  { company: 'Diebold Nixdorf', sector: 'technology', debtAmount: 900, defaultType: 'bankruptcy' as const, dateOffset: -62, expectedRecovery: 15.0 },
  { company: 'Revlon Inc', sector: 'retail', debtAmount: 1700, defaultType: 'missed-payment' as const, dateOffset: -78, expectedRecovery: 6.0 },
  { company: 'Diamond Sports Group', sector: 'media', debtAmount: 2100, defaultType: 'bankruptcy' as const, dateOffset: -95, expectedRecovery: 10.5 },
  { company: 'Bed Bath & Beyond', sector: 'retail', debtAmount: 850, defaultType: 'bankruptcy' as const, dateOffset: -112, expectedRecovery: 3.0 },
  { company: 'Party City Holdco', sector: 'retail', debtAmount: 1050, defaultType: 'bankruptcy' as const, dateOffset: -128, expectedRecovery: 7.5 },
];

const SECTOR_KEYS = ['energy', 'retail', 'healthcare', 'telecom', 'media', 'real estate', 'technology'] as const;

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Data generation ──

function generate() {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(today));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Index data
  const indexData = {
    hyOasSpread: Math.round(jitter(420, 0.08)),
    cccSpread: Math.round(jitter(980, 0.10)),
    distressedRatio: Math.round(jitter(8.5, 0.15) * 10) / 10,
    defaultRate: Math.round(jitter(3.2, 0.12) * 100) / 100,
    recoveryRate: Math.round(jitter(38.5, 0.10) * 10) / 10,
    leveragedLoanIndex: Math.round(jitter(96.8, 0.008) * 100) / 100,
  };

  // Distressed issuers
  const distressedIssuers = DISTRESSED_ISSUERS_TEMPLATE.map(tmpl => {
    const price = Math.round(jitter(tmpl.basePrice, 0.12) * 100) / 100;
    const yieldVal = Math.round(jitter(tmpl.baseYield, 0.08) * 100) / 100;
    const spread = Math.round(jitter(tmpl.baseSpread, 0.10));
    return {
      name: tmpl.name,
      sector: tmpl.sector,
      coupon: tmpl.baseCoupon,
      maturity: tmpl.baseMaturity,
      price,
      yield: yieldVal,
      spread,
      rating: tmpl.rating,
      distressReason: tmpl.distressReason,
    };
  });

  // Sector breakdown
  const sectorBreakdown = SECTOR_KEYS.map(sector => {
    const sectorIssuers = distressedIssuers.filter(i => i.sector === sector);
    const distressedCount = Math.max(sectorIssuers.length, Math.round(jitter(4, 0.3)));
    const avgSpread = sectorIssuers.length > 0
      ? Math.round(sectorIssuers.reduce((sum, i) => sum + i.spread, 0) / sectorIssuers.length)
      : Math.round(jitter(2200, 0.20));
    return {
      sector,
      distressedCount,
      avgSpread,
      defaultRate: Math.round(jitter(3.5, 0.25) * 100) / 100,
      recoveryRate: Math.round(jitter(36.0, 0.15) * 10) / 10,
    };
  });

  // Leveraged loans
  const leveragedLoans = LEVERAGED_LOANS_TEMPLATE.map(tmpl => {
    const spread = Math.round(jitter(tmpl.baseSpread, 0.06));
    const price = Math.round(jitter(tmpl.basePrice, 0.012) * 100) / 100;
    return {
      borrower: tmpl.borrower,
      spread,
      price,
      facilitySize: tmpl.facilitySize,
      maturity: tmpl.baseMaturity,
      rating: tmpl.rating,
      type: tmpl.type,
    };
  });

  // Default tracker
  const now = new Date();
  const defaultTracker = DEFAULT_TRACKER_TEMPLATE.map(tmpl => {
    const d = new Date(now);
    d.setDate(d.getDate() + tmpl.dateOffset + Math.floor((rng() - 0.5) * 6));
    return {
      company: tmpl.company,
      sector: tmpl.sector,
      debtAmount: tmpl.debtAmount,
      defaultType: tmpl.defaultType,
      date: d.toISOString().slice(0, 10),
      expectedRecovery: Math.round(jitter(tmpl.expectedRecovery, 0.15) * 10) / 10,
    };
  });

  // Monthly trend (last 12 months of HY spread)
  const monthlyTrend: { month: string; hySpread: number }[] = [];
  let trendBase = jitter(380, 0.05);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    trendBase += (rng() - 0.48) * 30;
    trendBase = Math.max(280, Math.min(600, trendBase));
    monthlyTrend.push({
      month,
      hySpread: Math.round(trendBase),
    });
  }

  return {
    indexData,
    distressedIssuers,
    sectorBreakdown,
    leveragedLoans,
    defaultTracker,
    monthlyTrend,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[DistressedDebt] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate distressed debt data' });
  }
});

export default router;
