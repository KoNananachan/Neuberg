import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

type Signal = 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down';
type Category = 'equity' | 'rate' | 'credit' | 'fx' | 'vol' | 'commodity' | 'crypto';
type Sentiment = 'bullish' | 'neutral' | 'bearish';
type GlobalSentiment = 'risk_on' | 'mixed' | 'risk_off';

interface Indicator {
  name: string;
  symbol: string;
  price: number;
  changePct: number;
  change5d: number;
  signal: Signal;
  category: Category;
}

interface Region {
  name: string;
  indicators: Indicator[];
  avgChange: number;
  sentiment: Sentiment;
}

interface MacroHeatmapResponse {
  timestamp: string;
  regions: Region[];
  globalSentiment: GlobalSentiment;
  riskScore: number;
}

// ── Region definitions ──

interface SymbolDef {
  symbol: string;
  name: string;
  category: Category;
}

interface RegionDef {
  name: string;
  symbols: SymbolDef[];
}

const REGION_DEFS: RegionDef[] = [
  {
    name: 'US',
    symbols: [
      { symbol: '^GSPC', name: 'S&P 500', category: 'equity' },
      { symbol: 'QQQ', name: 'Nasdaq 100', category: 'equity' },
      { symbol: 'IWM', name: 'Russell 2000', category: 'equity' },
      { symbol: '^TNX', name: '10Y Yield', category: 'rate' },
      { symbol: '^TYX', name: '30Y Yield', category: 'rate' },
      { symbol: 'TLT', name: '20Y+ Bond', category: 'rate' },
      { symbol: 'HYG', name: 'High Yield', category: 'credit' },
      { symbol: 'LQD', name: 'IG Credit', category: 'credit' },
      { symbol: 'DX-Y.NYB', name: 'USD Index', category: 'fx' },
      { symbol: '^VIX', name: 'VIX', category: 'vol' },
    ],
  },
  {
    name: 'Europe',
    symbols: [
      { symbol: 'EZU', name: 'Eurozone', category: 'equity' },
      { symbol: 'VGK', name: 'Europe', category: 'equity' },
      { symbol: '^STOXX50E', name: 'STOXX 50', category: 'equity' },
      { symbol: 'IGOV', name: 'Intl Govt Bond', category: 'rate' },
      { symbol: 'FXE', name: 'EUR/USD', category: 'fx' },
    ],
  },
  {
    name: 'Asia',
    symbols: [
      { symbol: 'EWJ', name: 'Japan ETF', category: 'equity' },
      { symbol: '^N225', name: 'Nikkei 225', category: 'equity' },
      { symbol: 'FXI', name: 'China Large', category: 'equity' },
      { symbol: 'MCHI', name: 'China', category: 'equity' },
      { symbol: 'KWEB', name: 'China Tech', category: 'equity' },
      { symbol: 'EEM', name: 'EM ETF', category: 'equity' },
      { symbol: '^HSI', name: 'Hang Seng', category: 'equity' },
    ],
  },
  {
    name: 'Commodities',
    symbols: [
      { symbol: 'CL=F', name: 'Crude Oil', category: 'commodity' },
      { symbol: 'NG=F', name: 'Natural Gas', category: 'commodity' },
      { symbol: 'GC=F', name: 'Gold', category: 'commodity' },
      { symbol: 'HG=F', name: 'Copper', category: 'commodity' },
      { symbol: 'DBA', name: 'Agriculture', category: 'commodity' },
    ],
  },
  {
    name: 'Crypto',
    symbols: [
      { symbol: 'BTC-USD', name: 'Bitcoin', category: 'crypto' },
      { symbol: 'ETH-USD', name: 'Ethereum', category: 'crypto' },
    ],
  },
];

// ── Helpers ──

function classifySignal(changePct: number): Signal {
  if (changePct > 2) return 'strong_up';
  if (changePct > 0.5) return 'up';
  if (changePct < -2) return 'strong_down';
  if (changePct < -0.5) return 'down';
  return 'flat';
}

function classifySentiment(avgChange: number): Sentiment {
  if (avgChange > 0.3) return 'bullish';
  if (avgChange < -0.3) return 'bearish';
  return 'neutral';
}

function computeRiskScore(regions: Region[]): number {
  // Weighted scoring: equity regions drive sentiment, VIX inverts
  let score = 50; // neutral baseline

  for (const region of regions) {
    for (const ind of region.indicators) {
      const chg = ind.changePct;
      if (ind.category === 'equity') {
        score += chg * 2.5;
      } else if (ind.category === 'credit') {
        score += chg * 2;
      } else if (ind.category === 'vol') {
        // VIX up = risk off
        score -= chg * 3;
      } else if (ind.category === 'crypto') {
        score += chg * 1.5;
      } else if (ind.category === 'commodity') {
        score += chg * 0.5;
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyGlobalSentiment(riskScore: number): GlobalSentiment {
  if (riskScore >= 60) return 'risk_on';
  if (riskScore <= 40) return 'risk_off';
  return 'mixed';
}

// ── Cache (3 min TTL) ──

let cache: { data: MacroHeatmapResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 180_000;

// ── Fetch logic ──

async function fetchMacroHeatmap(): Promise<MacroHeatmapResponse> {
  // Collect all symbols
  const allSymbols = REGION_DEFS.flatMap((r) => r.symbols.map((s) => s.symbol));

  // Fetch all quotes in a single batch
  const quotes = await getQuotes(allSymbols);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  const regions: Region[] = REGION_DEFS.map((def) => {
    const indicators: Indicator[] = def.symbols.map((symDef) => {
      const q = quoteMap.get(symDef.symbol);
      const changePct = q?.changePercent ?? 0;
      // Estimate 5-day change: not directly available from quote endpoint,
      // approximate using daily change * sqrt(5) scaling or use 0 as fallback
      const change5d = changePct * 2.2; // rough weekly extrapolation from daily momentum

      return {
        name: symDef.name,
        symbol: symDef.symbol,
        price: q?.price ?? 0,
        changePct,
        change5d: Math.round(change5d * 100) / 100,
        signal: classifySignal(changePct),
        category: symDef.category,
      };
    });

    const validChanges = indicators.filter((i) => i.price > 0);
    const avgChange =
      validChanges.length > 0
        ? Math.round(
            (validChanges.reduce((sum, i) => sum + i.changePct, 0) / validChanges.length) * 100,
          ) / 100
        : 0;

    return {
      name: def.name,
      indicators,
      avgChange,
      sentiment: classifySentiment(avgChange),
    };
  });

  const riskScore = computeRiskScore(regions);

  return {
    timestamp: new Date().toISOString(),
    regions,
    globalSentiment: classifyGlobalSentiment(riskScore),
    riskScore,
  };
}

// ── Route handler ──

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = await fetchMacroHeatmap();

    if (data.regions.length > 0) {
      cache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: unknown) {
    console.error('[MacroHeatmap] Error:', err instanceof Error ? err.message : err);
    // Return stale cache if available
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch macro heatmap data' });
  }
});

export default router;
