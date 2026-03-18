import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Treasury yield indices on Yahoo Finance
const YIELD_SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX'];

// Maturity labels for yield curve (maps Yahoo symbol → maturity)
const YIELD_META: Record<string, { maturity: string; years: number }> = {
  '^IRX': { maturity: '3M', years: 0.25 },
  '^FVX': { maturity: '5Y', years: 5 },
  '^TNX': { maturity: '10Y', years: 10 },
  '^TYX': { maturity: '30Y', years: 30 },
};

// Bond ETFs for fixed income overview
const BOND_ETFS = ['SHY', 'IEF', 'TLT', 'AGG', 'LQD', 'HYG', 'TIP', 'BNDX'];

interface YieldPoint {
  symbol: string;
  maturity: string;
  years: number;
  yield: number;
  change: number;
  changePercent: number;
}

interface BondEtf {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface BondsData {
  yields: YieldPoint[];
  etfs: BondEtf[];
  spreads: { name: string; value: number }[];
}

// Cache for 2 minutes
let bondsCache: { data: BondsData; expiresAt: number } = {
  data: { yields: [], etfs: [], spreads: [] },
  expiresAt: 0,
};
const CACHE_TTL = 120_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (bondsCache.data.yields.length > 0 && now < bondsCache.expiresAt) {
      return res.json(bondsCache.data);
    }

    const [yieldQuotes, etfQuotes] = await Promise.all([
      getQuotes(YIELD_SYMBOLS),
      getQuotes(BOND_ETFS),
    ]);

    const yields: YieldPoint[] = yieldQuotes
      .map((q: any) => {
        const meta = YIELD_META[q.symbol];
        if (!meta) return null;
        return {
          symbol: q.symbol,
          maturity: meta.maturity,
          years: meta.years,
          yield: q.price ?? 0,
          change: q.change ?? 0,
          changePercent: q.changePercent ?? 0,
        };
      })
      .filter(Boolean) as YieldPoint[];

    // Sort by maturity
    yields.sort((a, b) => a.years - b.years);

    const etfs: BondEtf[] = etfQuotes.map((q: any) => ({
      symbol: q.symbol,
      name: q.name || q.symbol,
      price: q.price ?? 0,
      change: q.change ?? 0,
      changePercent: q.changePercent ?? 0,
      volume: q.volume ?? 0,
    }));

    // Calculate key spreads
    const y5 = yields.find((y) => y.maturity === '5Y')?.yield ?? 0;
    const y10 = yields.find((y) => y.maturity === '10Y')?.yield ?? 0;
    const y30 = yields.find((y) => y.maturity === '30Y')?.yield ?? 0;
    const y3m = yields.find((y) => y.maturity === '3M')?.yield ?? 0;

    const spreads = [
      { name: '3m10s', value: Math.round((y10 - y3m) * 100) }, // in basis points
      { name: '5s10s', value: Math.round((y10 - y5) * 100) },
      { name: '10s30s', value: Math.round((y30 - y10) * 100) },
    ];

    const data: BondsData = { yields, etfs, spreads };

    if (yields.length > 0) {
      bondsCache = { data, expiresAt: now + CACHE_TTL };
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Bonds] Error:', err?.message || err);
    if (bondsCache.data.yields.length > 0) {
      return res.json(bondsCache.data);
    }
    res.status(500).json({ error: 'Failed to fetch bond data' });
  }
});

export default router;
