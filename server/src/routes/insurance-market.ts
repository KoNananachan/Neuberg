import { Router } from 'express';

const router = Router();

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

// -- Static Data --

const INSURER_STOCKS = [
  { ticker: 'BRK.B', name: 'Berkshire Hathaway B', basePrice: 420, baseCap: 780, basePE: 22, baseCR: 87, baseROE: 15.2 },
  { ticker: 'AIG', name: 'American International Group', basePrice: 72, baseCap: 52, basePE: 11, baseCR: 93, baseROE: 10.8 },
  { ticker: 'MET', name: 'MetLife', basePrice: 74, baseCap: 52, basePE: 10, baseCR: 91, baseROE: 13.1 },
  { ticker: 'PRU', name: 'Prudential Financial', basePrice: 112, baseCap: 42, basePE: 9, baseCR: 89, baseROE: 12.5 },
  { ticker: 'ALL', name: 'Allstate', basePrice: 168, baseCap: 44, basePE: 12, baseCR: 95, baseROE: 18.3 },
  { ticker: 'TRV', name: 'Travelers Companies', basePrice: 215, baseCap: 51, basePE: 13, baseCR: 92, baseROE: 16.7 },
  { ticker: 'CB', name: 'Chubb Limited', basePrice: 258, baseCap: 110, basePE: 14, baseCR: 86, baseROE: 14.9 },
  { ticker: 'AFL', name: 'Aflac', basePrice: 85, baseCap: 50, basePE: 11, baseCR: 88, baseROE: 17.2 },
  { ticker: 'PGR', name: 'Progressive Corp', basePrice: 198, baseCap: 115, basePE: 19, baseCR: 90, baseROE: 28.5 },
  { ticker: 'HIG', name: 'Hartford Financial', basePrice: 104, baseCap: 32, basePE: 10, baseCR: 91, baseROE: 15.8 },
  { ticker: 'CINF', name: 'Cincinnati Financial', basePrice: 128, baseCap: 20, basePE: 15, baseCR: 94, baseROE: 11.2 },
  { ticker: 'WRB', name: 'W.R. Berkley', basePrice: 62, baseCap: 20, basePE: 12, baseCR: 89, baseROE: 19.4 },
];

const PREMIUM_LINES = [
  { line: 'Property', baseGWP: 285, baseNWP: 210, baseRate: 8.5, baseLoss: 62, baseExpense: 28 },
  { line: 'Casualty', baseGWP: 320, baseNWP: 245, baseRate: 5.2, baseLoss: 65, baseExpense: 30 },
  { line: 'Auto', baseGWP: 310, baseNWP: 275, baseRate: 3.8, baseLoss: 68, baseExpense: 26 },
  { line: 'Health', baseGWP: 520, baseNWP: 480, baseRate: 6.1, baseLoss: 82, baseExpense: 14 },
  { line: 'Life', baseGWP: 410, baseNWP: 360, baseRate: 2.5, baseLoss: 55, baseExpense: 32 },
  { line: 'Specialty', baseGWP: 145, baseNWP: 110, baseRate: 12.3, baseLoss: 58, baseExpense: 33 },
];

const CAT_BOND_TEMPLATES = [
  { name: 'Residential Re 2024-1', peril: 'hurricane' as const, trigger: 'indemnity' as const },
  { name: 'Citrus Re 2025-A', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Kilimanjaro Re 2024-2', peril: 'earthquake' as const, trigger: 'parametric' as const },
  { name: 'Matterhorn Re 2025-1', peril: 'earthquake' as const, trigger: 'indemnity' as const },
  { name: 'Pelican Re 2024-3', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Sakura Re 2025-1', peril: 'earthquake' as const, trigger: 'parametric' as const },
  { name: 'Everglades Re 2024-1', peril: 'hurricane' as const, trigger: 'indemnity' as const },
  { name: 'Atlas Re 2025-2', peril: 'wildfire' as const, trigger: 'industry-loss' as const },
  { name: 'Cascade Re 2024-1', peril: 'wildfire' as const, trigger: 'parametric' as const },
  { name: 'Frontline Re 2025-1', peril: 'flood' as const, trigger: 'indemnity' as const },
  { name: 'Galileo Re 2024-2', peril: 'hurricane' as const, trigger: 'industry-loss' as const },
  { name: 'Torrey Pines Re 2025-1', peril: 'wildfire' as const, trigger: 'parametric' as const },
];

const LOSS_EVENT_TEMPLATES = [
  { name: 'Hurricane Marlene', type: 'Hurricane', region: 'US Gulf Coast', baseLoss: 18, baseInsured: 12 },
  { name: 'Midwest Derecho Complex', type: 'Severe Convective Storm', region: 'US Midwest', baseLoss: 5.5, baseInsured: 3.8 },
  { name: 'LA Wildfire Season', type: 'Wildfire', region: 'US West Coast', baseLoss: 8.2, baseInsured: 5.1 },
  { name: 'Tohoku M6.9 Earthquake', type: 'Earthquake', region: 'Japan', baseLoss: 12, baseInsured: 6.5 },
  { name: 'Storm Xander', type: 'European Windstorm', region: 'Northern Europe', baseLoss: 7.4, baseInsured: 5.8 },
  { name: 'Texas Flooding', type: 'Flood', region: 'US South Central', baseLoss: 4.2, baseInsured: 1.9 },
  { name: 'Typhoon Kanto', type: 'Typhoon', region: 'Japan', baseLoss: 9.8, baseInsured: 5.2 },
  { name: 'Chile Earthquake Swarm', type: 'Earthquake', region: 'South America', baseLoss: 6.1, baseInsured: 2.3 },
];

const REINSURANCE_REGIONS = ['US', 'Europe', 'Japan', 'Emerging'] as const;

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// -- Helpers --

function rangef(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function jitter(base: number, pct: number, rng: () => number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

function round(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// -- Generator --

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day));

  // 1. Insurer Stocks
  const insurerStocks = INSURER_STOCKS.map(s => {
    const price = round(jitter(s.basePrice, 0.06, rng), 2);
    const change = round((rng() - 0.45) * 4, 2);
    const marketCap = round(jitter(s.baseCap, 0.05, rng), 1);
    const pe = round(jitter(s.basePE, 0.08, rng), 1);
    const combinedRatio = round(jitter(s.baseCR, 0.04, rng), 1);
    const returnOnEquity = round(jitter(s.baseROE, 0.1, rng), 1);

    return {
      ticker: s.ticker,
      name: s.name,
      price,
      priceUnit: 'USD',
      change,
      changeUnit: '%',
      marketCap,
      marketCapUnit: 'B USD',
      pe,
      combinedRatio,
      combinedRatioUnit: '%',
      returnOnEquity,
      returnOnEquityUnit: '%',
    };
  });

  // 2. Premium Data by Line of Business
  const premiumData = PREMIUM_LINES.map(l => {
    const grossWrittenPremium = round(jitter(l.baseGWP, 0.08, rng), 1);
    const netWrittenPremium = round(jitter(l.baseNWP, 0.08, rng), 1);
    const rateChange = round(jitter(l.baseRate, 0.25, rng), 1);
    const lossRatio = round(jitter(l.baseLoss, 0.06, rng), 1);
    const expenseRatio = round(jitter(l.baseExpense, 0.05, rng), 1);
    const combinedRatio = round(lossRatio + expenseRatio, 1);

    return {
      line: l.line,
      grossWrittenPremium,
      grossWrittenPremiumUnit: 'B USD',
      netWrittenPremium,
      netWrittenPremiumUnit: 'B USD',
      rateChange,
      rateChangeUnit: '%',
      lossRatio,
      lossRatioUnit: '%',
      expenseRatio,
      expenseRatioUnit: '%',
      combinedRatio,
      combinedRatioUnit: '%',
    };
  });

  // 3. Catastrophe Bonds
  const statuses = ['outstanding', 'triggered', 'expired'] as const;
  const catastropheBonds = CAT_BOND_TEMPLATES.map(tmpl => {
    const couponSpread = Math.round(rangef(250, 900, rng));
    const expectedLoss = round(rangef(0.8, 7.5, rng), 2);
    const outstandingAmount = Math.round(rangef(100, 500, rng));
    const maturityYear = now.getFullYear() + Math.floor(rangef(1, 4, rng));

    // Weight status: most bonds are outstanding
    const statusRoll = rng();
    let status: typeof statuses[number];
    if (statusRoll < 0.75) status = 'outstanding';
    else if (statusRoll < 0.90) status = 'triggered';
    else status = 'expired';

    return {
      name: tmpl.name,
      peril: tmpl.peril,
      trigger: tmpl.trigger,
      couponSpread,
      couponSpreadUnit: 'bps',
      expectedLoss,
      expectedLossUnit: '%',
      outstandingAmount,
      outstandingAmountUnit: 'M USD',
      maturityYear,
      status,
    };
  });

  // 4. Reinsurance Pricing
  const baseROLIndex = round(jitter(7.8, 0.1, rng), 1);
  const basePropCatChange = round(jitter(8.5, 0.2, rng), 1);
  const baseCasualtyChange = round(jitter(4.2, 0.15, rng), 1);
  const baseRetroPricing = round(jitter(12.5, 0.12, rng), 1);

  const byRegion = REINSURANCE_REGIONS.map(region => {
    let propCatMult: number;
    let casualtyMult: number;
    let rolMult: number;
    switch (region) {
      case 'US':
        propCatMult = 1.0;
        casualtyMult = 1.0;
        rolMult = 1.0;
        break;
      case 'Europe':
        propCatMult = 0.7;
        casualtyMult = 0.85;
        rolMult = 0.8;
        break;
      case 'Japan':
        propCatMult = 0.9;
        casualtyMult = 0.65;
        rolMult = 0.85;
        break;
      case 'Emerging':
        propCatMult = 1.3;
        casualtyMult = 1.1;
        rolMult = 1.15;
        break;
      default:
        propCatMult = 1.0;
        casualtyMult = 1.0;
        rolMult = 1.0;
    }

    return {
      region,
      propertyCatRateChange: round(basePropCatChange * jitter(propCatMult, 0.08, rng), 1),
      propertyCatRateChangeUnit: '%',
      casualtyRateChange: round(baseCasualtyChange * jitter(casualtyMult, 0.08, rng), 1),
      casualtyRateChangeUnit: '%',
      rateOnLine: round(baseROLIndex * jitter(rolMult, 0.06, rng), 1),
      rateOnLineUnit: '%',
    };
  });

  const reinsurancePricing = {
    guyCarpenterROLIndex: baseROLIndex,
    guyCarpenterROLIndexUnit: '%',
    propertyCatRateChange: basePropCatChange,
    propertyCatRateChangeUnit: '%',
    casualtyRateChange: baseCasualtyChange,
    casualtyRateChangeUnit: '%',
    retroPricing: baseRetroPricing,
    retroPricingUnit: '% rate-on-line',
    byRegion,
  };

  // 5. Loss Events
  const lossEvents = LOSS_EVENT_TEMPLATES.map(evt => {
    const daysAgo = Math.floor(rangef(5, 180, rng));
    const eventDate = new Date(now.getTime() - daysAgo * 86400000);
    const estimatedLoss = round(jitter(evt.baseLoss, 0.2, rng), 1);
    const insuredLoss = round(jitter(evt.baseInsured, 0.2, rng), 1);

    return {
      event: evt.name,
      type: evt.type,
      estimatedLoss,
      estimatedLossUnit: 'B USD',
      insuredLoss,
      insuredLossUnit: 'B USD',
      date: eventDate.toISOString().slice(0, 10),
      region: evt.region,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // 6. Market Metrics
  const globalPremiumVolume = round(jitter(7.1, 0.05, rng), 2);
  const protectionGap = round(jitter(1.8, 0.08, rng), 2);

  const insurancePenetration = [
    { region: 'US', penetration: round(jitter(11.2, 0.04, rng), 1) },
    { region: 'Europe', penetration: round(jitter(7.5, 0.04, rng), 1) },
    { region: 'Japan', penetration: round(jitter(8.8, 0.04, rng), 1) },
    { region: 'China', penetration: round(jitter(4.5, 0.06, rng), 1) },
    { region: 'India', penetration: round(jitter(3.8, 0.06, rng), 1) },
    { region: 'Latin America', penetration: round(jitter(3.1, 0.06, rng), 1) },
    { region: 'Middle East & Africa', penetration: round(jitter(2.4, 0.07, rng), 1) },
    { region: 'Southeast Asia', penetration: round(jitter(3.5, 0.06, rng), 1) },
  ];

  const solvencyRatios = [
    { segment: 'US P&C', ratio: round(jitter(310, 0.05, rng), 0) },
    { segment: 'US Life', ratio: round(jitter(420, 0.05, rng), 0) },
    { segment: 'EU Solvency II (median)', ratio: round(jitter(215, 0.06, rng), 0) },
    { segment: 'Bermuda Reinsurers', ratio: round(jitter(280, 0.05, rng), 0) },
    { segment: 'Lloyd\'s Market', ratio: round(jitter(195, 0.06, rng), 0) },
  ];

  const marketMetrics = {
    globalPremiumVolume,
    globalPremiumVolumeUnit: 'T USD',
    protectionGap,
    protectionGapUnit: 'T USD',
    insurancePenetration,
    insurancePenetrationUnit: '% of GDP',
    solvencyRatios,
    solvencyRatioUnit: '%',
  };

  return {
    insurerStocks,
    premiumData,
    catastropheBonds,
    reinsurancePricing,
    lossEvents,
    marketMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[InsuranceMarket] Error:', (err as Error)?.message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate insurance market data' });
  }
});

export default router;
