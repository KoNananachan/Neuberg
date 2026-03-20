import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Commodity configuration ──

const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

interface CommodityConfig {
  name: string;
  base: string;
  exchange: string;
  unit: string;
}

const COMMODITY_CONFIG: Record<string, CommodityConfig> = {
  crude: { name: 'Crude Oil (WTI)', base: 'CL', exchange: 'NYM', unit: '$/bbl' },
  gold: { name: 'Gold', base: 'GC', exchange: 'CMX', unit: '$/oz' },
  silver: { name: 'Silver', base: 'SI', exchange: 'CMX', unit: '$/oz' },
  natgas: { name: 'Natural Gas', base: 'NG', exchange: 'NYM', unit: '$/MMBtu' },
  copper: { name: 'Copper', base: 'HG', exchange: 'CMX', unit: '$/lb' },
  corn: { name: 'Corn', base: 'ZC', exchange: 'CBT', unit: '\u00a2/bu' },
  wheat: { name: 'Wheat', base: 'ZW', exchange: 'CBT', unit: '\u00a2/bu' },
  soybeans: { name: 'Soybeans', base: 'ZS', exchange: 'CBT', unit: '\u00a2/bu' },
};

// Front-month future symbol for each commodity
const FRONT_MONTH_SYMBOLS: Record<string, string> = {
  crude: 'CL=F',
  gold: 'GC=F',
  silver: 'SI=F',
  natgas: 'NG=F',
  copper: 'HG=F',
  corn: 'ZC=F',
  wheat: 'ZW=F',
  soybeans: 'ZS=F',
};

interface CurvePoint {
  month: string;
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  daysToExpiry: number;
}

interface SpreadEntry {
  pair: string;
  spread: number;
}

interface FuturesCurveResponse {
  commodity: string;
  name: string;
  unit: string;
  spotSymbol: string;
  spotPrice: number | null;
  spotChange: number | null;
  spotChangePct: number | null;
  curve: CurvePoint[];
  shape: 'contango' | 'backwardation' | 'mixed' | 'flat';
  frontBackSpread: number | null;
  spreads: SpreadEntry[];
  updatedAt: string;
}

// ── In-memory cache (5-minute TTL) ──
const cache = new Map<string, { data: FuturesCurveResponse; expiresAt: number }>();
const CACHE_TTL = 60 * 60_000;

/**
 * Generate 12 monthly futures ticker symbols starting from next month.
 * Format: {BASE}{MONTH_CODE}{YY}.{EXCHANGE}
 * e.g. CLN26.NYM = Crude Oil July 2026
 */
function generateFuturesSymbols(base: string, exchange: string): { symbol: string; month: string; expiry: Date }[] {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  const symbols: { symbol: string; month: string; expiry: Date }[] = [];

  for (let i = 1; i <= 12; i++) {
    const totalMonths = currentMonth + i;
    const month = totalMonths % 12;
    const year = currentYear + Math.floor(totalMonths / 12);
    const yy = year % 100;

    const code = MONTH_CODES[month];
    const symbol = `${base}${code}${yy < 10 ? '0' + yy : yy}.${exchange}`;
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    // Approximate expiry as 3rd Friday of the contract month
    const expiry = new Date(year, month, 15);

    symbols.push({ symbol, month: monthLabel, expiry });
  }

  return symbols;
}

/**
 * Determine curve shape from prices.
 */
function determineCurveShape(prices: number[]): 'contango' | 'backwardation' | 'mixed' | 'flat' {
  if (prices.length < 2) return 'flat';

  let ups = 0;
  let downs = 0;
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0.001) ups++;
    else if (diff < -0.001) downs++;
  }

  const total = ups + downs;
  if (total === 0) return 'flat';
  if (ups > total * 0.7) return 'contango';
  if (downs > total * 0.7) return 'backwardation';
  return 'mixed';
}

// GET /api/futures-curve/:commodity
router.get('/:commodity', async (req, res) => {
  try {
    const commodity = req.params.commodity.toLowerCase();
    const config = COMMODITY_CONFIG[commodity];

    if (!config) {
      return res.status(400).json({
        error: `Invalid commodity. Valid options: ${Object.keys(COMMODITY_CONFIG).join(', ')}`,
      });
    }

    // Check cache
    const now = Date.now();
    const cached = cache.get(commodity);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Generate symbols for the next 12 months
    const futuresTickers = generateFuturesSymbols(config.base, config.exchange);
    const frontMonthSymbol = FRONT_MONTH_SYMBOLS[commodity];

    // Fetch all quotes in a single batch: front-month + 12 forward months
    const allSymbols = [frontMonthSymbol, ...futuresTickers.map((t) => t.symbol)];
    const quotes = await getQuotes(allSymbols);

    // Build lookup map
    const quoteMap = new Map<string, { price: number; change: number | null; changePct: number | null }>();
    for (const q of quotes) {
      if (q.price != null && q.price > 0) {
        quoteMap.set(q.symbol, {
          price: q.price,
          change: q.change ?? null,
          changePct: q.changePercent ?? null,
        });
      }
    }

    // Spot / front-month data
    const spotData = quoteMap.get(frontMonthSymbol);
    const spotPrice = spotData?.price ?? null;

    // Build curve from forward months (filter out any that didn't return data)
    const todayMs = Date.now();
    const curve: CurvePoint[] = [];

    for (const ticker of futuresTickers) {
      const data = quoteMap.get(ticker.symbol);
      if (!data) continue;

      const daysToExpiry = Math.max(0, Math.round((ticker.expiry.getTime() - todayMs) / (1000 * 60 * 60 * 24)));

      curve.push({
        month: ticker.month,
        symbol: ticker.symbol,
        price: data.price,
        change: data.change,
        changePct: data.changePct,
        daysToExpiry,
      });
    }

    // Calculate month-to-month spreads
    const spreads: SpreadEntry[] = [];
    for (let i = 1; i < curve.length; i++) {
      const spread = Math.round((curve[i].price - curve[i - 1].price) * 100) / 100;
      const prevLabel = curve[i - 1].month.split(' ')[0];
      const currLabel = curve[i].month.split(' ')[0];
      spreads.push({ pair: `${prevLabel}-${currLabel}`, spread });
    }

    // Front-back spread
    const frontBackSpread =
      curve.length >= 2
        ? Math.round((curve[curve.length - 1].price - curve[0].price) * 100) / 100
        : null;

    // Determine curve shape
    const allPrices = curve.map((c) => c.price);
    const shape = determineCurveShape(allPrices);

    const data: FuturesCurveResponse = {
      commodity,
      name: config.name,
      unit: config.unit,
      spotSymbol: frontMonthSymbol,
      spotPrice,
      spotChange: spotData?.change ?? null,
      spotChangePct: spotData?.changePct ?? null,
      curve,
      shape,
      frontBackSpread,
      spreads,
      updatedAt: new Date().toISOString(),
    };

    cache.set(commodity, { data, expiresAt: now + CACHE_TTL });
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FuturesCurve] Error:', message);

    // Return stale cache if available
    const commodity = req.params.commodity?.toLowerCase();
    const stale = commodity ? cache.get(commodity) : undefined;
    if (stale) return res.json(stale.data);

    res.status(500).json({ error: 'Failed to fetch futures curve data' });
  }
});

// GET /api/futures-curve — List available commodities
router.get('/', (_req, res) => {
  const commodities = Object.entries(COMMODITY_CONFIG).map(([key, cfg]) => ({
    key,
    name: cfg.name,
    symbol: FRONT_MONTH_SYMBOLS[key],
    unit: cfg.unit,
  }));
  res.json(commodities);
});

export default router;
