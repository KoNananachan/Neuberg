import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['NVDA', 'AMD', 'AVGO', 'MRVL', 'TSM', 'ASML', 'AMAT', 'LRCX', 'MSFT', 'GOOGL', 'AMZN', 'META', 'ORCL', 'CRM', 'NOW', 'PLTR', 'AI', 'SOXX', 'SMH'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const segMap: Record<string, string> = { NVDA: 'AI Chips', AMD: 'AI Chips', AVGO: 'AI Networking', MRVL: 'AI Networking', TSM: 'Foundry', ASML: 'Equipment', AMAT: 'Equipment', LRCX: 'Equipment', MSFT: 'Cloud/AI', GOOGL: 'Cloud/AI', AMZN: 'Cloud/AI', META: 'AI Infrastructure', ORCL: 'Cloud/AI', CRM: 'AI Software', NOW: 'AI Software', PLTR: 'AI Software', AI: 'AI Pure-Play' };
  const stocks = SYMBOLS.filter(s => !['SOXX', 'SMH'].includes(s)).map(sym => {
    const q = qMap.get(sym);
    return { ticker: sym, name: q?.shortName || sym, segment: segMap[sym] || 'Other', price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), marketCap: r1((q?.marketCap || 0) / 1e9), pe: r1(q?.trailingPE || 0), forwardPE: r1(q?.forwardPE || 0) };
  });
  const segmentMap = new Map<string, typeof stocks>();
  for (const s of stocks) { if (!segmentMap.has(s.segment)) segmentMap.set(s.segment, []); segmentMap.get(s.segment)!.push(s); }
  const segments = [...segmentMap.entries()].map(([segment, items]) => ({ segment, count: items.length, avgChange: r2(items.reduce((s, i) => s + i.change, 0) / items.length), totalMarketCap: r1(items.reduce((s, i) => s + i.marketCap, 0)) }));
  const soxx = qMap.get('SOXX');
  return { stocks, segments, summary: { soxxChange: r2(soxx?.regularMarketChangePercent || 0), totalAIMarketCap: r1(stocks.reduce((s, st) => s + st.marketCap, 0)), topPerformer: [...stocks].sort((a, b) => b.change - a.change)[0]?.ticker || 'N/A' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AITechCapex] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
