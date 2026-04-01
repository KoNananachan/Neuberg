import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'AVAX-USD', 'MATIC-USD', 'LINK-USD', 'DOT-USD', 'COIN', 'MARA', 'RIOT', 'MSTR', 'GBTC', 'ETHE'];
const CACHE_TTL = 2 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const chains = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'AVAX-USD', 'MATIC-USD', 'LINK-USD', 'DOT-USD'].map(sym => { const q = qMap.get(sym); return { id: sym.replace('-USD', ''), name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), marketCap: r1((q?.marketCap || 0) / 1e9), volume24h: r1((q?.regularMarketVolume || 0) * (q?.regularMarketPrice || 0) / 1e9), dayHigh: r2(q?.regularMarketDayHigh), dayLow: r2(q?.regularMarketDayLow) }; });
  const cryptoStocks = ['COIN', 'MARA', 'RIOT', 'MSTR'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const cryptoEtfs = ['GBTC', 'ETHE'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent) }; });
  const btc = qMap.get('BTC-USD'); const eth = qMap.get('ETH-USD');
  return { chains, cryptoStocks, cryptoEtfs, summary: { btcDominance: r1(btc && eth ? (btc.marketCap || 0) / ((btc.marketCap || 0) + (eth.marketCap || 0)) * 100 : 0), totalMarketCapB: r1(chains.reduce((s, c) => s + c.marketCap, 0)) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[OnchainAnalytics]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
