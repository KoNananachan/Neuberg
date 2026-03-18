import { Router } from 'express';
import { getQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

type AssetCategory = 'equity' | 'fixed_income' | 'commodity' | 'currency' | 'crypto';

interface AssetMeta {
  name: string;
  category: AssetCategory;
}

// All symbols fetched in a single batch call
const ASSET_SYMBOLS: string[] = [
  // Equities (9)
  '^GSPC', '^IXIC', '^DJI', '^RUT', '^STOXX50E', '^N225', '^HSI', '^FTSE', '000001.SS',
  // Fixed Income (6)
  '^TNX', '^TYX', '^IRX', 'TLT', 'HYG', 'LQD',
  // Commodities (7)
  'GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'ZC=F', 'ZW=F',
  // Currencies (6)
  'DX-Y.NYB', 'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCNH=X', 'AUDUSD=X',
  // Crypto (3)
  'BTC-USD', 'ETH-USD', 'SOL-USD',
  // VIX for risk sentiment
  '^VIX',
];

const ASSET_META: Record<string, AssetMeta> = {
  // Equities
  '^GSPC': { name: 'S&P 500', category: 'equity' },
  '^IXIC': { name: 'Nasdaq', category: 'equity' },
  '^DJI': { name: 'Dow Jones', category: 'equity' },
  '^RUT': { name: 'Russell 2000', category: 'equity' },
  '^STOXX50E': { name: 'Euro Stoxx 50', category: 'equity' },
  '^N225': { name: 'Nikkei 225', category: 'equity' },
  '^HSI': { name: 'Hang Seng', category: 'equity' },
  '^FTSE': { name: 'FTSE 100', category: 'equity' },
  '000001.SS': { name: 'Shanghai', category: 'equity' },
  // Fixed Income
  '^TNX': { name: '10Y Treasury', category: 'fixed_income' },
  '^TYX': { name: '30Y Treasury', category: 'fixed_income' },
  '^IRX': { name: '3M T-Bill', category: 'fixed_income' },
  'TLT': { name: 'Long Bond ETF', category: 'fixed_income' },
  'HYG': { name: 'High Yield ETF', category: 'fixed_income' },
  'LQD': { name: 'IG Bond ETF', category: 'fixed_income' },
  // Commodities
  'GC=F': { name: 'Gold', category: 'commodity' },
  'SI=F': { name: 'Silver', category: 'commodity' },
  'CL=F': { name: 'Crude Oil', category: 'commodity' },
  'NG=F': { name: 'Natural Gas', category: 'commodity' },
  'HG=F': { name: 'Copper', category: 'commodity' },
  'ZC=F': { name: 'Corn', category: 'commodity' },
  'ZW=F': { name: 'Wheat', category: 'commodity' },
  // Currencies
  'DX-Y.NYB': { name: 'Dollar Index', category: 'currency' },
  'EURUSD=X': { name: 'EUR/USD', category: 'currency' },
  'GBPUSD=X': { name: 'GBP/USD', category: 'currency' },
  'USDJPY=X': { name: 'USD/JPY', category: 'currency' },
  'USDCNH=X': { name: 'USD/CNH', category: 'currency' },
  'AUDUSD=X': { name: 'AUD/USD', category: 'currency' },
  // Crypto
  'BTC-USD': { name: 'Bitcoin', category: 'crypto' },
  'ETH-USD': { name: 'Ethereum', category: 'crypto' },
  'SOL-USD': { name: 'Solana', category: 'crypto' },
  // VIX (treated as equity for sentiment)
  '^VIX': { name: 'VIX', category: 'equity' },
};

interface CrossAssetQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  category: AssetCategory;
}

interface CrossAssetResponse {
  assets: CrossAssetQuote[];
  updatedAt: string;
}

// Cache for 2 minutes
let cache: { data: CrossAssetResponse; expiresAt: number } | null = null;
const CACHE_TTL = 120_000;

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const quotes = await getQuotes(ASSET_SYMBOLS);

    const assets: CrossAssetQuote[] = quotes
      .map((q: any) => {
        const meta = ASSET_META[q.symbol];
        if (!meta) return null;
        return {
          symbol: q.symbol,
          name: meta.name,
          price: q.price ?? 0,
          change: q.change ?? 0,
          changePct: q.changePercent ?? 0,
          category: meta.category,
        };
      })
      .filter(Boolean) as CrossAssetQuote[];

    const response: CrossAssetResponse = {
      assets,
      updatedAt: new Date().toISOString(),
    };

    if (assets.length > 0) {
      cache = { data: response, expiresAt: now + CACHE_TTL };
    }

    res.json(response);
  } catch (err: any) {
    console.error('[CrossAsset] Error:', err?.message || err);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch cross-asset data' });
  }
});

export default router;
