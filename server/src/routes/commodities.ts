import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Commodity futures on Yahoo Finance
const COMMODITY_SYMBOLS = [
  // Energy
  'CL=F', 'BZ=F', 'NG=F', 'HO=F', 'RB=F',
  // Precious Metals
  'GC=F', 'SI=F', 'PL=F', 'PA=F',
  // Base Metals
  'HG=F', 'ALI=F',
  // Agriculture
  'ZC=F', 'ZS=F', 'ZW=F', 'KC=F', 'CT=F', 'SB=F', 'CC=F',
  // Livestock
  'LE=F', 'HE=F',
];

const COMMODITY_META: Record<string, { name: string; category: string; unit: string }> = {
  'CL=F': { name: 'WTI Crude Oil', category: 'energy', unit: '$/bbl' },
  'BZ=F': { name: 'Brent Crude', category: 'energy', unit: '$/bbl' },
  'NG=F': { name: 'Natural Gas', category: 'energy', unit: '$/MMBtu' },
  'HO=F': { name: 'Heating Oil', category: 'energy', unit: '$/gal' },
  'RB=F': { name: 'RBOB Gasoline', category: 'energy', unit: '$/gal' },
  'GC=F': { name: 'Gold', category: 'metals', unit: '$/oz' },
  'SI=F': { name: 'Silver', category: 'metals', unit: '$/oz' },
  'PL=F': { name: 'Platinum', category: 'metals', unit: '$/oz' },
  'PA=F': { name: 'Palladium', category: 'metals', unit: '$/oz' },
  'HG=F': { name: 'Copper', category: 'metals', unit: '$/lb' },
  'ALI=F': { name: 'Aluminum', category: 'metals', unit: '$/t' },
  'ZC=F': { name: 'Corn', category: 'agriculture', unit: '¢/bu' },
  'ZS=F': { name: 'Soybeans', category: 'agriculture', unit: '¢/bu' },
  'ZW=F': { name: 'Wheat', category: 'agriculture', unit: '¢/bu' },
  'KC=F': { name: 'Coffee', category: 'agriculture', unit: '¢/lb' },
  'CT=F': { name: 'Cotton', category: 'agriculture', unit: '¢/lb' },
  'SB=F': { name: 'Sugar', category: 'agriculture', unit: '¢/lb' },
  'CC=F': { name: 'Cocoa', category: 'agriculture', unit: '$/t' },
  'LE=F': { name: 'Live Cattle', category: 'agriculture', unit: '¢/lb' },
  'HE=F': { name: 'Lean Hogs', category: 'agriculture', unit: '¢/lb' },
};

interface CommodityQuote {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

// Cache for 60 seconds
let cache: { data: CommodityQuote[]; expiresAt: number } = { data: [], expiresAt: 0 };
const CACHE_TTL = 60_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data.length > 0 && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const quotes = await getQuotes(COMMODITY_SYMBOLS);

    const commodities: CommodityQuote[] = quotes
      .map((q: any) => {
        const meta = COMMODITY_META[q.symbol];
        if (!meta) return null;
        return {
          symbol: q.symbol,
          name: meta.name,
          category: meta.category,
          unit: meta.unit,
          price: q.price ?? 0,
          change: q.change ?? 0,
          changePercent: q.changePercent ?? 0,
          volume: q.volume ?? 0,
          dayHigh: q.dayHigh ?? null,
          dayLow: q.dayLow ?? null,
          previousClose: q.previousClose ?? null,
        };
      })
      .filter(Boolean) as CommodityQuote[];

    if (commodities.length > 0) {
      cache = { data: commodities, expiresAt: now + CACHE_TTL };
    }

    res.json(commodities);
  } catch (err: any) {
    console.error('[Commodities] Error:', err?.message || err);
    if (cache.data.length > 0) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch commodity data' });
  }
});

export default router;
