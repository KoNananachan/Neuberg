import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^TNX', '^TYX', 'TLT', 'MBB', 'AGG', 'DXY=X', '^GSPC', 'GLD'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  // Fed balance sheet context from bond market signals
  const fedSignals = {
    tenYearYield: r2(tnx), yieldChange: r2(qMap.get('^TNX')?.regularMarketChange || 0),
    tltChange: r2(qMap.get('TLT')?.regularMarketChangePercent || 0), mbbChange: r2(qMap.get('MBB')?.regularMarketChangePercent || 0),
    qtPace: 'Active ($60B/month Treasury, $35B/month MBS)', // Known QT pace
    balanceSheetSize: 6.8, // Approximate in $T — declining from peak ~8.9T
  };
  // Global central banks
  const globalBanks = [
    { bank: 'Federal Reserve', balanceSheetT: 6.8, trend: 'Shrinking (QT)', peakT: 8.9 },
    { bank: 'ECB', balanceSheetT: 6.2, trend: 'Shrinking', peakT: 8.8 },
    { bank: 'Bank of Japan', balanceSheetT: 5.1, trend: 'Stable/Growing', peakT: 5.2 },
    { bank: 'Bank of England', balanceSheetT: 0.85, trend: 'Shrinking', peakT: 1.1 },
    { bank: 'PBOC', balanceSheetT: 5.8, trend: 'Growing', peakT: 5.8 },
  ];
  const marketImpact = { spxChange: r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0), dollarIndex: r2(qMap.get('DXY=X')?.regularMarketPrice || 104), goldChange: r2(qMap.get('GLD')?.regularMarketChangePercent || 0), liquiditySignal: (qMap.get('TLT')?.regularMarketChangePercent || 0) > 0 ? 'Easing expectations' : 'Tightening expectations' };
  return { fedSignals, globalBanks, marketImpact, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[CentralBankBalanceSheet] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
