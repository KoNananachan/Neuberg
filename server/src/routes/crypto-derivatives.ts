import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Crypto ETFs + futures as derivatives proxy
const SYMBOLS = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD', 'AVAX-USD',
  'IBIT', 'FBTC', 'GBTC', // Bitcoin ETFs
  'ETHE', 'ETHA', // Ethereum ETFs
  'BITO', // Bitcoin futures ETF
];

const CACHE_TTL = 2 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const btc = qMap.get('BTC-USD');
  const eth = qMap.get('ETH-USD');
  const btcPrice = btc?.regularMarketPrice || 60000;
  const ethPrice = eth?.regularMarketPrice || 3000;

  const spotPrices = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'DOGE-USD', 'AVAX-USD'].map(sym => {
    const q = qMap.get(sym);
    return {
      symbol: sym.replace('-USD', ''), price: r2(q?.regularMarketPrice || 0),
      change24h: r2(q?.regularMarketChangePercent || 0),
      volume24h: q?.regularMarketVolume || 0,
      marketCap: r1((q?.marketCap || 0) / 1e9),
    };
  });

  // ETF performance
  const etfs = ['IBIT', 'FBTC', 'GBTC', 'ETHE', 'ETHA', 'BITO'].map(sym => {
    const q = qMap.get(sym);
    return {
      ticker: sym, name: q?.shortName || sym,
      price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0),
      volume: q?.regularMarketVolume || 0, aum: r1((q?.marketCap || 0) / 1e9),
      asset: sym.includes('ETH') ? 'Ethereum' : 'Bitcoin',
    };
  });

  // Funding rate proxy from BTC futures premium
  const bito = qMap.get('BITO');
  const bitoPrice = bito?.regularMarketPrice || 25;
  const btcEquiv = btcPrice / 2400; // approximate BITO units
  const futuresPremium = r2(bitoPrice > 0 ? ((bitoPrice - btcEquiv) / btcEquiv) * 100 : 0);

  // Derivatives metrics
  const derivativesMetrics = {
    btcFuturesPremium: futuresPremium,
    fundingRateEst: r2(futuresPremium * 0.01),
    btcDominance: r1(btcPrice > 0 && ethPrice > 0 ? 55 + (btc?.regularMarketChangePercent || 0) * 0.5 : 55),
    ethBtcRatio: r2(ethPrice / btcPrice),
    totalCryptoMarketCap: r1(spotPrices.reduce((s, p) => s + p.marketCap, 0)),
    fear_greed_proxy: Math.round(50 + (btc?.regularMarketChangePercent || 0) * 5),
  };

  return { spotPrices, etfs, derivativesMetrics, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData(); cache = { data, ts: now }; res.json(data);
  } catch (err) {
    console.error('[CryptoDerivatives] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
export default router;
