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

const REFERENCE_ASSETS = [
  { ticker: 'SPX', name: 'S&P 500 Index', assetType: 'Equity Index' as const, baseNotional: 400, baseSpread: 20 },
  { ticker: 'NDX', name: 'Nasdaq 100 Index', assetType: 'Equity Index' as const, baseNotional: 350, baseSpread: 25 },
  { ticker: 'AAPL', name: 'Apple Inc', assetType: 'Single Stock' as const, baseNotional: 200, baseSpread: 35 },
  { ticker: 'MSFT', name: 'Microsoft Corp', assetType: 'Single Stock' as const, baseNotional: 180, baseSpread: 30 },
  { ticker: 'NVDA', name: 'NVIDIA Corp', assetType: 'Single Stock' as const, baseNotional: 250, baseSpread: 55 },
  { ticker: 'AMZN', name: 'Amazon.com Inc', assetType: 'Single Stock' as const, baseNotional: 220, baseSpread: 40 },
  { ticker: 'TSLA', name: 'Tesla Inc', assetType: 'Single Stock' as const, baseNotional: 150, baseSpread: 75 },
  { ticker: 'META', name: 'Meta Platforms Inc', assetType: 'Single Stock' as const, baseNotional: 190, baseSpread: 45 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co', assetType: 'Single Stock' as const, baseNotional: 160, baseSpread: 28 },
  { ticker: 'GS', name: 'Goldman Sachs Group', assetType: 'Single Stock' as const, baseNotional: 120, baseSpread: 32 },
  { ticker: 'SX5E', name: 'Euro Stoxx 50 Index', assetType: 'Equity Index' as const, baseNotional: 300, baseSpread: 22 },
  { ticker: 'NKY', name: 'Nikkei 225 Index', assetType: 'Equity Index' as const, baseNotional: 280, baseSpread: 28 },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', assetType: 'ETF' as const, baseNotional: 100, baseSpread: 30 },
  { ticker: 'HYG', name: 'iShares iBoxx HY Corporate Bond', assetType: 'Credit Index' as const, baseNotional: 130, baseSpread: 45 },
  { ticker: 'LQD', name: 'iShares iBoxx IG Corporate Bond', assetType: 'Credit Index' as const, baseNotional: 110, baseSpread: 35 },
];

const TENORS = ['3M', '6M', '1Y', '18M', '2Y'];
const TENOR_DAYS = [90, 180, 365, 548, 730];
const DIRECTIONS = ['Long', 'Short'] as const;
const COLLATERAL_TYPES = ['Cash', 'UST', 'Equity'] as const;
const RESET_FREQUENCIES = ['Monthly', 'Quarterly'] as const;

const COUNTERPARTIES = [
  { name: 'Goldman Sachs', baseNotional: 1.8 },
  { name: 'Morgan Stanley', baseNotional: 1.5 },
  { name: 'JP Morgan', baseNotional: 2.1 },
  { name: 'Barclays', baseNotional: 1.2 },
  { name: 'UBS', baseNotional: 1.0 },
];

const SOFR_RATE = 4.30;

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('total-return-swaps-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // Generate 15 active TRS
  const activeSwaps = REFERENCE_ASSETS.map((asset, i) => {
    const id = `TRS-${String(i + 1).padStart(3, '0')}`;
    const notional = Math.round(jitter(asset.baseNotional, 0.25));
    const direction = pick(DIRECTIONS);
    const financingSpread = Math.round(jitter(asset.baseSpread, 0.2));
    const tenorIdx = Math.floor(rng() * TENORS.length);
    const tenor = TENORS[tenorIdx];
    const tenorDays = TENOR_DAYS[tenorIdx];

    // Generate start and maturity dates
    const today = new Date();
    const elapsedDays = Math.floor(rng() * tenorDays * 0.7);
    const startDate = new Date(today.getTime() - elapsedDays * 86400000);
    const maturityDate = new Date(startDate.getTime() + tenorDays * 86400000);

    const totalReturnLeg = `Total return on ${asset.ticker} (price + dividends) vs SOFR + ${financingSpread}bp`;
    const currentMTM = Math.round((rng() - 0.45) * notional * 0.08 * 10) / 10;
    const marginRequirement = Math.round((asset.assetType === 'Equity Index' ? jitter(8, 0.15) :
      asset.assetType === 'Single Stock' ? jitter(15, 0.2) :
      asset.assetType === 'ETF' ? jitter(10, 0.15) :
      jitter(12, 0.15)) * 10) / 10;
    const collateralPosted = Math.round(notional * marginRequirement / 100 * jitter(1.1, 0.1) * 10) / 10;
    const collateralType = pick(COLLATERAL_TYPES);
    const resetFrequency = pick(RESET_FREQUENCIES);

    return {
      id,
      referenceAsset: asset.ticker,
      referenceAssetName: asset.name,
      assetType: asset.assetType,
      notional,
      notionalUnit: 'M USD',
      direction,
      financingSpread,
      financingSpreadUnit: 'bps over SOFR',
      totalReturnLeg,
      startDate: startDate.toISOString().slice(0, 10),
      maturityDate: maturityDate.toISOString().slice(0, 10),
      tenor,
      currentMTM,
      mtmUnit: 'M USD',
      collateralPosted,
      collateralUnit: 'M USD',
      collateralType,
      marginRequirement,
      resetFrequency,
    };
  });

  // Summary
  const totalNotional = Math.round(activeSwaps.reduce((a, s) => a + s.notional, 0) / 100) / 10;
  const avgFinancingSpread = Math.round(activeSwaps.reduce((a, s) => a + s.financingSpread, 0) / activeSwaps.length);
  const tenorCounts: Record<string, number> = {};
  for (const s of activeSwaps) { tenorCounts[s.tenor] = (tenorCounts[s.tenor] || 0) + 1; }
  const mostCommonTenor = Object.entries(tenorCounts).sort((a, b) => b[1] - a[1])[0][0];
  const totalCollateral = Math.round(activeSwaps.reduce((a, s) => a + s.collateralPosted, 0) / 100) / 10;

  const summary = {
    totalNotionalOutstanding: totalNotional,
    totalNotionalUnit: 'B USD',
    avgFinancingSpread,
    avgFinancingSpreadUnit: 'bps over SOFR',
    avgTenor: mostCommonTenor,
    activeSwaps: activeSwaps.length,
    totalCollateralPosted: totalCollateral,
    totalCollateralUnit: 'B USD',
    sofrRate: SOFR_RATE,
  };

  // Financing rates by asset type
  const assetTypes = ['Equity Index', 'Single Stock', 'ETF', 'Credit Index'] as const;
  const spreadRanges: Record<string, [number, number]> = {
    'Equity Index': [15, 30],
    'Single Stock': [25, 80],
    'ETF': [20, 50],
    'Credit Index': [30, 60],
  };
  const financingRates = assetTypes.map(type => {
    const swaps = activeSwaps.filter(s => s.assetType === type);
    const [minBase, maxBase] = spreadRanges[type];
    const avgSpread = swaps.length > 0
      ? Math.round(swaps.reduce((a, s) => a + s.financingSpread, 0) / swaps.length)
      : Math.round((minBase + maxBase) / 2);
    return {
      assetType: type,
      sofrRate: SOFR_RATE,
      spreadRangeLow: minBase,
      spreadRangeHigh: maxBase,
      spreadRangeUnit: 'bps',
      currentAvgSpread: avgSpread,
      allInRateLow: Math.round((SOFR_RATE + minBase / 100) * 100) / 100,
      allInRateHigh: Math.round((SOFR_RATE + maxBase / 100) * 100) / 100,
      allInRateUnit: '%',
      activeCount: swaps.length,
    };
  });

  // Collateral summary
  const cashCollateral = activeSwaps
    .filter(s => s.collateralType === 'Cash')
    .reduce((a, s) => a + s.collateralPosted, 0);
  const ustCollateral = activeSwaps
    .filter(s => s.collateralType === 'UST')
    .reduce((a, s) => a + s.collateralPosted, 0);
  const equityCollateral = activeSwaps
    .filter(s => s.collateralType === 'Equity')
    .reduce((a, s) => a + s.collateralPosted, 0);
  const totalCollateralM = cashCollateral + ustCollateral + equityCollateral;
  const requiredCollateralM = activeSwaps.reduce((a, s) => a + s.notional * s.marginRequirement / 100, 0);
  const excessCollateral = Math.round((totalCollateralM - requiredCollateralM) * 10) / 10;
  const marginCallsPending = Math.round(jitter(2, 0.8));

  const collateralSummary = {
    totalPosted: Math.round(totalCollateralM * 10) / 10,
    totalPostedUnit: 'M USD',
    byType: {
      cash: Math.round(cashCollateral * 10) / 10,
      ust: Math.round(ustCollateral * 10) / 10,
      equity: Math.round(equityCollateral * 10) / 10,
    },
    byTypeUnit: 'M USD',
    excessCollateral,
    excessCollateralUnit: 'M USD',
    marginCallsPending: Math.max(0, marginCallsPending),
  };

  // Counterparty exposure
  const counterpartyExposure = COUNTERPARTIES.map(cp => {
    const notional = Math.round(jitter(cp.baseNotional, 0.15) * 100) / 100;
    const mtmExposure = Math.round((rng() - 0.4) * notional * 0.05 * 1000 * 100) / 100;
    const collateralReceived = Math.round(Math.abs(mtmExposure) * jitter(1.2, 0.15) * 100) / 100;
    const netExposure = Math.round((mtmExposure - collateralReceived) * 100) / 100;
    return {
      counterparty: cp.name,
      notional,
      notionalUnit: 'B USD',
      mtmExposure,
      mtmExposureUnit: 'M USD',
      collateralReceived,
      collateralReceivedUnit: 'M USD',
      netExposure,
      netExposureUnit: 'M USD',
    };
  });

  return {
    summary,
    activeSwaps,
    financingRates,
    collateralSummary,
    counterpartyExposure,
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
    console.error('[TotalReturnSwaps] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate total return swap data' });
  }
});

export default router;
