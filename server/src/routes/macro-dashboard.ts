import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Symbols ──

const INDEX_SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^RUT'];
const BOND_SYMBOLS = ['^TNX', '^TYX', '^IRX', 'TLT'];
const COMMODITY_SYMBOLS = ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F'];
const FX_SYMBOLS = ['DX-Y.NYB', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X'];
const EXTRA_SYMBOLS = ['^VIX', 'BTC-USD', 'VNQ', 'TIP'];

const ALL_SYMBOLS = [
  ...INDEX_SYMBOLS,
  ...BOND_SYMBOLS,
  ...COMMODITY_SYMBOLS,
  ...FX_SYMBOLS,
  ...EXTRA_SYMBOLS,
];

// ── Name map (fallback when Yahoo short name is unavailable) ──

const NAME_MAP: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^DJI': 'Dow Jones',
  '^IXIC': 'Nasdaq',
  '^RUT': 'Russell 2000',
  '^TNX': '10Y Yield',
  '^TYX': '30Y Yield',
  '^IRX': '3M Yield',
  'TLT': 'Long Bond ETF',
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'CL=F': 'Crude Oil',
  'NG=F': 'Natural Gas',
  'HG=F': 'Copper',
  'DX-Y.NYB': 'Dollar Index',
  'EURUSD=X': 'EUR/USD',
  'USDJPY=X': 'USD/JPY',
  'GBPUSD=X': 'GBP/USD',
  '^VIX': 'VIX',
  'BTC-USD': 'Bitcoin',
  'VNQ': 'REIT ETF',
  'TIP': 'TIPS ETF',
};

// ── Interfaces ──

interface QuoteItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

interface DerivedMetrics {
  yieldSpread: number | null;
  yieldCurveStatus: string;
  dollarIndex: number | null;
  goldOilRatio: number | null;
  copperGoldRatio: number | null;
  realYieldEstimate: number | null;
  riskAppetite: 'Risk On' | 'Neutral' | 'Risk Off';
}

interface MacroDashboardData {
  timestamp: string;
  indices: QuoteItem[];
  bonds: QuoteItem[];
  commodities: QuoteItem[];
  fx: QuoteItem[];
  volatility: {
    vix: number;
    change: number;
    changePct: number;
    percentile: number;
  };
  crypto: QuoteItem[];
  realEstate: QuoteItem[];
  derived: DerivedMetrics;
}

// ── Cache (3min TTL) ──

let cache: { data: MacroDashboardData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 3 * 60_000;

// ── Helpers ──

function toQuoteItem(raw: Record<string, unknown>, symbol: string): QuoteItem {
  return {
    symbol,
    name: (raw.name as string) || NAME_MAP[symbol] || symbol,
    price: (raw.price as number) ?? 0,
    change: (raw.change as number) ?? 0,
    changePct: (raw.changePercent as number) ?? 0,
  };
}

function pick(
  bySymbol: Map<string, Record<string, unknown>>,
  symbols: string[],
): QuoteItem[] {
  return symbols
    .map((s) => {
      const raw = bySymbol.get(s);
      return raw ? toQuoteItem(raw, s) : null;
    })
    .filter(Boolean) as QuoteItem[];
}

function computeVixPercentile(vix: number): number {
  // Historical VIX percentile approximation based on long-term distribution
  // VIX median ~17, 25th percentile ~14, 75th ~21, 90th ~28
  if (vix <= 12) return 5;
  if (vix <= 14) return 20;
  if (vix <= 16) return 35;
  if (vix <= 18) return 50;
  if (vix <= 21) return 65;
  if (vix <= 25) return 80;
  if (vix <= 30) return 90;
  return 95;
}

function computeDerived(bySymbol: Map<string, Record<string, unknown>>): DerivedMetrics {
  const tnx = bySymbol.get('^TNX');
  const tyx = bySymbol.get('^TYX');
  const irx = bySymbol.get('^IRX');
  const gold = bySymbol.get('GC=F');
  const oil = bySymbol.get('CL=F');
  const copper = bySymbol.get('HG=F');
  const vix = bySymbol.get('^VIX');
  const dxy = bySymbol.get('DX-Y.NYB');
  const tip = bySymbol.get('TIP');
  const spx = bySymbol.get('^GSPC');

  const tenYield = (tnx?.price as number) ?? null;
  const threeMonthYield = (irx?.price as number) ?? null;

  // 2Y estimate: approximate as midpoint between 3M and 10Y (no direct 2Y symbol)
  const twoYieldEst = tenYield != null && threeMonthYield != null
    ? (threeMonthYield + tenYield) / 2
    : null;

  // Yield spread: 10Y - 2Y estimate
  const yieldSpread = tenYield != null && twoYieldEst != null
    ? +(tenYield - twoYieldEst).toFixed(2)
    : null;

  const yieldCurveStatus = yieldSpread != null
    ? yieldSpread < -0.1
      ? 'Inverted'
      : yieldSpread < 0.1
        ? 'Flat'
        : 'Normal'
    : 'Unknown';

  const goldPrice = (gold?.price as number) ?? 0;
  const oilPrice = (oil?.price as number) ?? 0;
  const copperPrice = (copper?.price as number) ?? 0;

  const goldOilRatio = oilPrice > 0 ? +(goldPrice / oilPrice).toFixed(1) : null;
  const copperGoldRatio = goldPrice > 0 ? +(copperPrice / goldPrice).toFixed(6) : null;

  // Real yield estimate: 10Y nominal - breakeven inflation (approximated from TIP)
  // TIP ETF changePct as proxy for inflation expectations shift is too noisy,
  // so use simple: 10Y - 2.5% long-run inflation assumption, adjusted by TIP move
  const tipChangePct = (tip?.changePercent as number) ?? 0;
  const inflationEstimate = 2.5 + tipChangePct * 0.1; // slight adjustment
  const realYieldEstimate = tenYield != null ? +(tenYield - inflationEstimate).toFixed(2) : null;

  // Risk appetite: composite of inverse VIX percentile, equity performance, copper/gold
  const vixPrice = (vix?.price as number) ?? 20;
  const vixPctile = computeVixPercentile(vixPrice);
  const spxChangePct = (spx?.changePercent as number) ?? 0;

  // Score: 0 = max risk off, 100 = max risk on
  const vixComponent = (100 - vixPctile); // low VIX = risk on
  const equityComponent = Math.min(Math.max(50 + spxChangePct * 20, 0), 100);
  const copperGoldComponent = copperGoldRatio != null
    ? copperGoldRatio > 0.0005 ? 70 : copperGoldRatio > 0.0003 ? 50 : 30
    : 50;

  const riskScore = (vixComponent + equityComponent + copperGoldComponent) / 3;
  const riskAppetite: 'Risk On' | 'Neutral' | 'Risk Off' =
    riskScore >= 60 ? 'Risk On' : riskScore >= 40 ? 'Neutral' : 'Risk Off';

  return {
    yieldSpread,
    yieldCurveStatus,
    dollarIndex: (dxy?.price as number) ?? null,
    goldOilRatio,
    copperGoldRatio,
    realYieldEstimate,
    riskAppetite,
  };
}

// ── Route ──

// GET /api/macro-dashboard
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const rawQuotes = await getQuotes(ALL_SYMBOLS);

    const bySymbol = new Map<string, Record<string, unknown>>();
    for (const q of rawQuotes) {
      bySymbol.set(q.symbol, q as unknown as Record<string, unknown>);
    }

    const vixRaw = bySymbol.get('^VIX');
    const vixPrice = (vixRaw?.price as number) ?? 0;
    const vixChange = (vixRaw?.change as number) ?? 0;
    const vixChangePct = (vixRaw?.changePercent as number) ?? 0;

    const data: MacroDashboardData = {
      timestamp: new Date().toISOString(),
      indices: pick(bySymbol, INDEX_SYMBOLS),
      bonds: pick(bySymbol, BOND_SYMBOLS),
      commodities: pick(bySymbol, COMMODITY_SYMBOLS),
      fx: pick(bySymbol, FX_SYMBOLS),
      volatility: {
        vix: vixPrice,
        change: vixChange,
        changePct: vixChangePct,
        percentile: computeVixPercentile(vixPrice),
      },
      crypto: pick(bySymbol, ['BTC-USD']),
      realEstate: pick(bySymbol, ['VNQ']),
      derived: computeDerived(bySymbol),
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MacroDashboard] Error:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch macro dashboard data' });
  }
});

export default router;
