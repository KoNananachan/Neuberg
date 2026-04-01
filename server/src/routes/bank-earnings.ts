import { Router } from 'express';
import { getRawQuotes, getExtendedProfile } from '../services/stocks/yahoo-finance.js';

const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'SCHW', 'BK', 'STT'];
const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const [quotes, ...profiles] = await Promise.all([
    getRawQuotes(SYMBOLS),
    ...SYMBOLS.slice(0, 6).map(s => getExtendedProfile(s).catch(() => null)),
  ]);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const profMap = new Map<string, any>();
  SYMBOLS.slice(0, 6).forEach((s, i) => { if (profiles[i]) profMap.set(s, profiles[i]); });

  const banks = quotes.filter(q => q?.symbol).map(q => {
    const prof = profMap.get(q.symbol!);
    const history = prof?.earningsHistory || [];
    const lastQ = history[history.length - 1];
    return {
      ticker: q.symbol!, name: q.shortName || q.symbol!,
      price: r2(q.regularMarketPrice || 0), change: r2(q.regularMarketChangePercent || 0),
      marketCap: r1((q.marketCap || 0) / 1e9), pe: r1(q.trailingPE || 0),
      eps: r2(q.epsTrailingTwelveMonths || 0), epsForward: r2(q.epsForward || 0),
      dividendYield: r2((q.trailingAnnualDividendYield || 0) * 100),
      priceToBook: r2(q.priceToBook || 0),
      lastEpsSurprise: lastQ ? r2(lastQ.surprisePercent || 0) : 0,
      earningsDate: q.earningsTimestamp ? new Date(q.earningsTimestamp * 1000).toISOString().slice(0, 10) : 'TBD',
      beatRate: history.length > 0 ? Math.round(history.filter((h: any) => (h.epsDifference || 0) > 0).length / history.length * 100) : 75,
    };
  });

  const summary = {
    avgPE: r1(banks.filter(b => b.pe > 0).reduce((s, b) => s + b.pe, 0) / banks.filter(b => b.pe > 0).length),
    avgPB: r2(banks.filter(b => b.priceToBook > 0).reduce((s, b) => s + b.priceToBook, 0) / banks.filter(b => b.priceToBook > 0).length),
    avgDividendYield: r2(banks.reduce((s, b) => s + b.dividendYield, 0) / banks.length),
    avgBeatRate: Math.round(banks.reduce((s, b) => s + b.beatRate, 0) / banks.length),
    totalMarketCap: r1(banks.reduce((s, b) => s + b.marketCap, 0)),
  };

  return { banks, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[BankEarnings] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
