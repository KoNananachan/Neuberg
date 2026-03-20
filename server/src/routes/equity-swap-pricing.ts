import { Router } from 'express';

const router = Router();

// -- Deterministic seeded RNG --

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
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// -- Types --

interface EquitySwap {
  underlying: string;
  underlyingType: 'Index' | 'Single Stock';
  notional: number;
  tenor: string;
  fixedRate: number;
  floatingSpread: number;
  financingRate: number;
  totalReturnLeg: string;
  paymentFrequency: string;
  collateralType: string;
  counterparty: string;
}

interface PricingGridRow {
  underlying: string;
  underlyingType: 'Index' | 'Single Stock';
  '3m': number;
  '6m': number;
  '1y': number;
  '2y': number;
}

interface MarketRates {
  sofr: number;
  fedFunds: number;
  threeMTBill: number;
  repoRate: number;
  asOf: string;
}

interface RecentTrade {
  underlying: string;
  notional: number;
  tenor: string;
  spread: number;
  date: string;
  direction: 'Pay Total Return' | 'Receive Total Return';
}

interface IndexDividend {
  index: string;
  expectedYield: number;
  exDivMonth: string;
  annualDividendPoints: number;
  priorYearYield: number;
}

interface EquitySwapPricingResponse {
  swaps: EquitySwap[];
  pricingGrid: PricingGridRow[];
  marketRates: MarketRates;
  recentTrades: RecentTrade[];
  indexDividendSchedule: IndexDividend[];
  generatedAt: string;
}

// -- Configurations --

const INDEX_UNDERLYINGS = [
  { name: 'S&P 500', baseSpread: 18, divYield: 1.3 },
  { name: 'NASDAQ 100', baseSpread: 22, divYield: 0.7 },
  { name: 'Russell 2000', baseSpread: 35, divYield: 1.5 },
  { name: 'Euro Stoxx 50', baseSpread: 25, divYield: 2.8 },
  { name: 'FTSE 100', baseSpread: 20, divYield: 3.5 },
  { name: 'MSCI EM', baseSpread: 55, divYield: 2.4 },
];

const STOCK_UNDERLYINGS = [
  { name: 'AAPL', baseSpread: 35 },
  { name: 'MSFT', baseSpread: 32 },
  { name: 'AMZN', baseSpread: 40 },
  { name: 'NVDA', baseSpread: 55 },
  { name: 'TSLA', baseSpread: 90 },
];

const TENORS = ['3m', '6m', '1y', '2y'] as const;

const TENOR_MULTIPLIER: Record<string, number> = {
  '3m': 0.85,
  '6m': 1.0,
  '1y': 1.15,
  '2y': 1.35,
};

const COUNTERPARTIES = [
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan',
  'Barclays', 'BNP Paribas', 'Citi',
  'Deutsche Bank', 'UBS', 'Bank of America',
];

const PAYMENT_FREQUENCIES = ['Monthly', 'Quarterly'];

const COLLATERAL_TYPES = [
  'Cash (USD)', 'US Treasuries', 'Agency MBS',
  'Investment Grade Bonds', 'Letters of Credit',
];

// -- Cache --

const CACHE_TTL = 12 * 60 * 60_000;
let cache: { data: EquitySwapPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): EquitySwapPricingResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-swap-pricing-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. Market Rates --

  const sofr = round(lerp(4.50, 5.00), 4);
  const fedFunds = round(sofr + lerp(-0.10, 0.05), 4);
  const threeMTBill = round(sofr + lerp(-0.30, -0.05), 4);
  const repoRate = round(sofr + lerp(-0.08, 0.12), 4);

  const marketRates: MarketRates = {
    sofr,
    fedFunds,
    threeMTBill,
    repoRate,
    asOf: today,
  };

  // -- 2. Pricing Grid (financing spreads in bps over SOFR by underlying x tenor) --

  const allUnderlyings = [
    ...INDEX_UNDERLYINGS.map(u => ({ name: u.name, baseSpread: u.baseSpread, type: 'Index' as const })),
    ...STOCK_UNDERLYINGS.map(u => ({ name: u.name, baseSpread: u.baseSpread, type: 'Single Stock' as const })),
  ];

  const pricingGrid: PricingGridRow[] = allUnderlyings.map(u => {
    const jitter = () => lerp(-5, 5);
    const row: PricingGridRow = {
      underlying: u.name,
      underlyingType: u.type,
      '3m': round(u.baseSpread * TENOR_MULTIPLIER['3m'] + jitter(), 1),
      '6m': round(u.baseSpread * TENOR_MULTIPLIER['6m'] + jitter(), 1),
      '1y': round(u.baseSpread * TENOR_MULTIPLIER['1y'] + jitter(), 1),
      '2y': round(u.baseSpread * TENOR_MULTIPLIER['2y'] + jitter(), 1),
    };
    return row;
  });

  // -- 3. Equity Swaps --

  const swaps: EquitySwap[] = [];

  for (const u of allUnderlyings) {
    const numSwaps = Math.floor(lerp(1, 4));
    for (let i = 0; i < numSwaps; i++) {
      const tenor = pick(TENORS);
      const gridRow = pricingGrid.find(r => r.underlying === u.name)!;
      const floatingSpread = round(gridRow[tenor] + lerp(-3, 3), 1);

      // Notional: indices $200M-$2B, single stocks $50M-$500M
      const notionalMin = u.type === 'Index' ? 200 : 50;
      const notionalMax = u.type === 'Index' ? 2000 : 500;
      const notional = round(lerp(notionalMin, notionalMax), 0);

      const financingRate = round(sofr + floatingSpread / 100, 4);
      const fixedRate = round(financingRate + lerp(-0.15, 0.15), 4);

      swaps.push({
        underlying: u.name,
        underlyingType: u.type,
        notional,
        tenor,
        fixedRate,
        floatingSpread,
        financingRate,
        totalReturnLeg: `${u.name} Total Return`,
        paymentFrequency: pick(PAYMENT_FREQUENCIES),
        collateralType: pick(COLLATERAL_TYPES),
        counterparty: pick(COUNTERPARTIES),
      });
    }
  }

  // -- 4. Recent Trades --

  const tradeCount = Math.floor(lerp(12, 20));
  const baseDate = new Date();
  const recentTrades: RecentTrade[] = [];

  for (let i = 0; i < tradeCount; i++) {
    const u = pick(allUnderlyings);
    const tenor = pick(TENORS);
    const gridRow = pricingGrid.find(r => r.underlying === u.name)!;
    const spread = round(gridRow[tenor] + lerp(-5, 5), 1);

    const notionalMin = u.type === 'Index' ? 100 : 50;
    const notionalMax = u.type === 'Index' ? 1500 : 400;
    const notional = round(lerp(notionalMin, notionalMax), 0);

    const daysBack = Math.floor(lerp(0, 14));
    const tradeDate = new Date(baseDate.getTime() - daysBack * 86400000);

    recentTrades.push({
      underlying: u.name,
      notional,
      tenor,
      spread,
      date: tradeDate.toISOString().slice(0, 10),
      direction: rng() > 0.5 ? 'Pay Total Return' : 'Receive Total Return',
    });
  }

  // Sort by date descending
  recentTrades.sort((a, b) => b.date.localeCompare(a.date));

  // -- 5. Index Dividend Schedule --

  const exDivMonths = ['Mar', 'Jun', 'Sep', 'Dec'];

  const indexDividendSchedule: IndexDividend[] = INDEX_UNDERLYINGS.map(idx => {
    const expectedYield = round(idx.divYield + lerp(-0.15, 0.15), 2);
    const priorYearYield = round(idx.divYield + lerp(-0.25, 0.05), 2);

    // Annual dividend points approximate based on yield and a notional index level
    let indexLevel: number;
    switch (idx.name) {
      case 'S&P 500': indexLevel = lerp(5200, 5600); break;
      case 'NASDAQ 100': indexLevel = lerp(18500, 20500); break;
      case 'Russell 2000': indexLevel = lerp(2000, 2300); break;
      case 'Euro Stoxx 50': indexLevel = lerp(4800, 5200); break;
      case 'FTSE 100': indexLevel = lerp(7800, 8200); break;
      case 'MSCI EM': indexLevel = lerp(1050, 1150); break;
      default: indexLevel = 5000;
    }

    const annualDividendPoints = round(indexLevel * expectedYield / 100, 1);

    return {
      index: idx.name,
      expectedYield,
      exDivMonth: pick(exDivMonths),
      annualDividendPoints,
      priorYearYield,
    };
  });

  return {
    swaps,
    pricingGrid,
    marketRates,
    recentTrades,
    indexDividendSchedule,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[EquitySwapPricing] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate equity swap pricing data' });
  }
});

export default router;
