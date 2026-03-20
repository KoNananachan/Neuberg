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

const TENORS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'] as const;
const TENOR_YEARS: Record<string, number> = {
  '1Y': 1, '2Y': 2, '3Y': 3, '5Y': 5, '7Y': 7, '10Y': 10, '15Y': 15, '20Y': 20, '30Y': 30,
};

const RATINGS = ['AAA', 'AA', 'A', 'BBB'] as const;

// Base yields by rating and tenor (AAA 2.5-4.0%, BBB 3.5-5.5%)
const BASE_YIELDS: Record<string, Record<string, number>> = {
  AAA: { '1Y': 2.50, '2Y': 2.60, '3Y': 2.72, '5Y': 2.90, '7Y': 3.08, '10Y': 3.25, '15Y': 3.55, '20Y': 3.78, '30Y': 3.95 },
  AA:  { '1Y': 2.70, '2Y': 2.82, '3Y': 2.95, '5Y': 3.15, '7Y': 3.35, '10Y': 3.52, '15Y': 3.82, '20Y': 4.05, '30Y': 4.22 },
  A:   { '1Y': 3.00, '2Y': 3.15, '3Y': 3.28, '5Y': 3.50, '7Y': 3.70, '10Y': 3.90, '15Y': 4.18, '20Y': 4.40, '30Y': 4.58 },
  BBB: { '1Y': 3.50, '2Y': 3.68, '3Y': 3.82, '5Y': 4.05, '7Y': 4.28, '10Y': 4.50, '15Y': 4.82, '20Y': 5.10, '30Y': 5.35 },
};

// Treasury base yields for ratio calculation
const TREASURY_BASE: Record<string, number> = {
  '1Y': 4.20, '2Y': 4.10, '3Y': 4.05, '5Y': 3.95, '7Y': 3.90, '10Y': 3.88, '15Y': 4.00, '20Y': 4.15, '30Y': 4.30,
};

const SECTORS = [
  { name: 'General Obligation', abbr: 'GO', baseYield: 3.20, baseSpread: 0, issuancePct: 28 },
  { name: 'Revenue', abbr: 'REV', baseYield: 3.45, baseSpread: 25, issuancePct: 22 },
  { name: 'Transportation', abbr: 'TRANS', baseYield: 3.55, baseSpread: 35, issuancePct: 14 },
  { name: 'Water/Sewer', abbr: 'W&S', baseYield: 3.30, baseSpread: 10, issuancePct: 12 },
  { name: 'Education', abbr: 'EDU', baseYield: 3.40, baseSpread: 20, issuancePct: 11 },
  { name: 'Healthcare', abbr: 'HC', baseYield: 3.65, baseSpread: 45, issuancePct: 8 },
  { name: 'Housing', abbr: 'HSG', baseYield: 3.50, baseSpread: 30, issuancePct: 5 },
];

const ISSUERS = [
  { name: 'State of California', state: 'CA', rating: 'AA-', sector: 'General Obligation' },
  { name: 'NYC Municipal Water Finance Authority', state: 'NY', rating: 'AA+', sector: 'Water/Sewer' },
  { name: 'Texas Transportation Commission', state: 'TX', rating: 'AAA', sector: 'Transportation' },
  { name: 'Illinois Finance Authority', state: 'IL', rating: 'BBB+', sector: 'Healthcare' },
  { name: 'Massachusetts Bay Transportation Authority', state: 'MA', rating: 'AA', sector: 'Transportation' },
  { name: 'Florida Board of Education', state: 'FL', rating: 'AAA', sector: 'Education' },
  { name: 'New Jersey Turnpike Authority', state: 'NJ', rating: 'A+', sector: 'Revenue' },
  { name: 'Los Angeles Dept of Water & Power', state: 'CA', rating: 'AA', sector: 'Water/Sewer' },
  { name: 'Chicago O\'Hare International Airport', state: 'IL', rating: 'A', sector: 'Revenue' },
  { name: 'Metropolitan Transportation Authority', state: 'NY', rating: 'A', sector: 'Transportation' },
  { name: 'Pennsylvania Turnpike Commission', state: 'PA', rating: 'AA-', sector: 'Revenue' },
  { name: 'Georgia Housing & Finance Authority', state: 'GA', rating: 'AA+', sector: 'Housing' },
  { name: 'Washington State GO', state: 'WA', rating: 'AA+', sector: 'General Obligation' },
  { name: 'Ohio Water Development Authority', state: 'OH', rating: 'AA', sector: 'Water/Sewer' },
  { name: 'Virginia Public Building Authority', state: 'VA', rating: 'AAA', sector: 'General Obligation' },
];

const BOOK_RUNNERS = [
  'Citi', 'J.P. Morgan', 'BofA Securities', 'Morgan Stanley', 'Goldman Sachs',
  'Wells Fargo', 'Barclays', 'RBC Capital Markets', 'Raymond James', 'Stifel',
  'Piper Sandler', 'UBS', 'Jefferies',
];

const STATE_NAMES_FOR_MOVERS = [
  { name: 'California', abbr: 'CA', rating: 'AA-' },
  { name: 'New York', abbr: 'NY', rating: 'AA' },
  { name: 'Texas', abbr: 'TX', rating: 'AAA' },
  { name: 'Illinois', abbr: 'IL', rating: 'BBB+' },
  { name: 'Florida', abbr: 'FL', rating: 'AAA' },
  { name: 'New Jersey', abbr: 'NJ', rating: 'A-' },
  { name: 'Pennsylvania', abbr: 'PA', rating: 'AA-' },
  { name: 'Ohio', abbr: 'OH', rating: 'AA' },
  { name: 'Massachusetts', abbr: 'MA', rating: 'AA+' },
  { name: 'Connecticut', abbr: 'CT', rating: 'A+' },
  { name: 'Michigan', abbr: 'MI', rating: 'AA-' },
  { name: 'Georgia', abbr: 'GA', rating: 'AAA' },
  { name: 'Virginia', abbr: 'VA', rating: 'AAA' },
  { name: 'Minnesota', abbr: 'MN', rating: 'AAA' },
  { name: 'Colorado', abbr: 'CO', rating: 'AA+' },
  { name: 'Maryland', abbr: 'MD', rating: 'AAA' },
  { name: 'Washington', abbr: 'WA', rating: 'AA+' },
  { name: 'Oregon', abbr: 'OR', rating: 'AA+' },
  { name: 'Nevada', abbr: 'NV', rating: 'AA+' },
  { name: 'Arizona', abbr: 'AZ', rating: 'AA' },
];

const CACHE_TTL = 60 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

function generate() {
  const seed = hashSeed('municipal-bond-monitor-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const FED_TAX_RATE = 0.37;

  // --- Yield Curves ---
  const yieldCurves = RATINGS.map(rating => {
    const tenors = TENORS.map(tenor => {
      const baseYield = BASE_YIELDS[rating][tenor];
      const muniYield = Math.round(jitter(baseYield, 0.04) * 1000) / 1000;
      const treasuryYield = Math.round(jitter(TREASURY_BASE[tenor], 0.02) * 1000) / 1000;
      const change1d = Math.round((rng() - 0.5) * 6 * 10) / 10;
      const change1w = Math.round((rng() - 0.5) * 12 * 10) / 10;

      return {
        tenor,
        yield: muniYield,
        change1d,
        change1w,
        treasuryYield,
      };
    });

    return { rating, tenors };
  });

  // --- Tax Equivalent Yields ---
  const taxEquivalent = RATINGS.map(rating => {
    const curve = yieldCurves.find(c => c.rating === rating)!;
    const tenors = curve.tenors.map(t => {
      const taxEquivalentYield = Math.round((t.yield / (1 - FED_TAX_RATE)) * 1000) / 1000;
      const muniToTreasuryRatio = Math.round((t.yield / t.treasuryYield) * 1000) / 10;

      return {
        tenor: t.tenor,
        muniYield: t.yield,
        taxEquivalentYield,
        treasuryYield: t.treasuryYield,
        muniToTreasuryRatio,
      };
    });

    return { rating, tenors };
  });

  // --- Sector Breakdown ---
  const sectorBreakdown = SECTORS.map(sector => {
    const avgYield = Math.round(jitter(sector.baseYield, 0.06) * 1000) / 1000;
    const avgSpread = Math.round(jitter(sector.baseSpread === 0 ? 5 : sector.baseSpread, 0.15));
    const issuance30d = Math.round(jitter(sector.issuancePct * 0.18, 0.2) * 100) / 100;
    const percentOfMarket = Math.round(jitter(sector.issuancePct, 0.08) * 10) / 10;

    return {
      sector: sector.name,
      avgYield,
      avgSpread,
      issuance30d,
      percentOfMarket,
    };
  });

  // --- New Issuance ---
  const dealCount = 8 + Math.floor(rng() * 3);
  const statuses = ['priced', 'expected', 'negotiating'] as const;
  const newIssuance = Array.from({ length: dealCount }, () => {
    const issuerData = ISSUERS[Math.floor(rng() * ISSUERS.length)];
    const maturityYears = [5, 7, 10, 15, 20, 25, 30][Math.floor(rng() * 7)];
    const matDate = new Date();
    matDate.setFullYear(matDate.getFullYear() + maturityYears);
    const amount = Math.round(jitter(300, 0.6));
    const clampedAmount = Math.max(50, Math.min(2500, amount));
    const coupon = Math.round(jitter(4.25 + (maturityYears > 15 ? 0.5 : 0), 0.1) * 100) / 100;
    const statusIdx = rng();
    const status = statusIdx < 0.45 ? statuses[0] : statusIdx < 0.75 ? statuses[1] : statuses[2];
    const numBookRunners = 1 + Math.floor(rng() * 3);
    const bookRunners: string[] = [];
    for (let i = 0; i < numBookRunners; i++) {
      const br = BOOK_RUNNERS[Math.floor(rng() * BOOK_RUNNERS.length)];
      if (!bookRunners.includes(br)) bookRunners.push(br);
    }

    return {
      issuer: issuerData.name,
      state: issuerData.state,
      amount: clampedAmount,
      coupon,
      maturity: matDate.toISOString().slice(0, 10),
      rating: issuerData.rating,
      sector: issuerData.sector,
      status,
      bookRunners,
    };
  });

  // --- Market Stats ---
  const totalOutstanding = Math.round(jitter(4.05, 0.03) * 100) / 100;
  const issuance30d = Math.round(jitter(38.5, 0.12) * 10) / 10;
  const ytdIssuance = Math.round(jitter(285, 0.08) * 10) / 10;
  const weeklyFundFlows = Math.round((rng() - 0.4) * 3 * 100) / 100;
  const monthlyFundFlows = Math.round((rng() - 0.35) * 10 * 100) / 100;
  const advDecTotal = 800 + Math.floor(rng() * 400);
  const advancers = Math.floor(advDecTotal * (0.35 + rng() * 0.3));
  const decliners = advDecTotal - advancers;
  const advDeclineRatio = Math.round((advancers / Math.max(1, decliners)) * 100) / 100;
  const avgDailyTradingVolume = Math.round(jitter(12.5, 0.15) * 100) / 100;

  const marketStats = {
    totalOutstanding,
    issuance30d,
    ytdIssuance,
    fundFlows: {
      weekly: weeklyFundFlows,
      monthly: monthlyFundFlows,
    },
    advancers,
    decliners,
    advDeclineRatio,
    avgDailyTradingVolume,
  };

  // --- Top Movers ---
  const shuffled = [...STATE_NAMES_FOR_MOVERS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const wideners = shuffled.slice(0, 5).map(st => {
    const spreadChange = Math.round((3 + rng() * 15) * 10) / 10;
    const currentSpread = Math.round((40 + rng() * 80) * 10) / 10;
    return {
      name: st.name,
      state: st.abbr,
      rating: st.rating,
      spreadChange,
      currentSpread,
      direction: 'wider' as const,
    };
  });

  const tighteners = shuffled.slice(5, 10).map(st => {
    const spreadChange = Math.round((-3 - rng() * 12) * 10) / 10;
    const currentSpread = Math.round((20 + rng() * 60) * 10) / 10;
    return {
      name: st.name,
      state: st.abbr,
      rating: st.rating,
      spreadChange,
      currentSpread,
      direction: 'tighter' as const,
    };
  });

  const topMovers = {
    wideners,
    tighteners,
  };

  return {
    yieldCurves,
    taxEquivalent,
    sectorBreakdown,
    newIssuance,
    marketStats,
    topMovers,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[MunicipalBondMonitor] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate municipal bond monitor data' });
  }
});

export default router;
