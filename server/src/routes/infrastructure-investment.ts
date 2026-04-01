import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['PAVE', 'IFRA', 'CAT', 'DE', 'VMC', 'MLM', 'URI', 'PWR', 'EME', 'MTZ', 'NEE', 'AEP', 'XEL', 'AMT', 'CCI'];

const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const segMap: Record<string, string> = { CAT: 'Heavy Equipment', DE: 'Heavy Equipment', VMC: 'Materials', MLM: 'Materials', URI: 'Equipment Rental', PWR: 'Engineering', EME: 'Engineering', MTZ: 'Engineering', NEE: 'Grid/Utility', AEP: 'Grid/Utility', XEL: 'Grid/Utility', AMT: 'Digital Infrastructure', CCI: 'Digital Infrastructure' };

  const stocks = SYMBOLS.filter(s => !['PAVE', 'IFRA'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), pe: r1(q?.trailingPE || 0), marketCap: r1((q?.marketCap || 0) / 1e9) };
  });

  const pave = qMap.get('PAVE');
  return { stocks, summary: { pavePrice: r2(pave?.regularMarketPrice || 0), paveChange: r2(pave?.regularMarketChangePercent || 0), totalMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)) }, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[InfrastructureInvestment] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
