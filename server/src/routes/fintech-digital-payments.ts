import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['IPAY', 'FINX', 'V', 'MA', 'PYPL', 'SQ', 'AFRM', 'SOFI', 'ADYEN', 'NU', 'COIN', 'HOOD', 'BILL', 'FOUR'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const segMap: Record<string, string> = { V: 'Card Networks', MA: 'Card Networks', PYPL: 'Digital Wallets', SQ: 'Digital Wallets', AFRM: 'BNPL', SOFI: 'Neobanks', NU: 'Neobanks', COIN: 'Crypto', HOOD: 'Trading', BILL: 'B2B Payments', FOUR: 'Embedded Finance' };
  const stocks = SYMBOLS.filter(s => !['IPAY', 'FINX'].includes(s)).map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0) }; });
  const ipay = qMap.get('IPAY');
  return { stocks, etfs: [{ ticker: 'IPAY', change: r2(ipay?.regularMarketChangePercent || 0) }, { ticker: 'FINX', change: r2(qMap.get('FINX')?.regularMarketChangePercent || 0) }], summary: { totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)), avgChange: r2(stocks.reduce((s, st) => s + st.change, 0) / stocks.length), topPerformer: [...stocks].sort((a, b) => b.change - a.change)[0]?.ticker || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[FintechDigitalPayments] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
