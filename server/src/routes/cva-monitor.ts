import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'BCS', 'HSBC', 'HYG', 'LQD', '^VIX', '^TNX', 'KRE', 'XLF'];
const CACHE_TTL = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q])); const vix = qMap.get('^VIX')?.regularMarketPrice || 20;
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const hygYld = (qMap.get('HYG')?.trailingAnnualDividendYield || 0) * 100;
  const counterparties = ['JPM', 'BAC', 'C', 'GS', 'MS', 'WFC', 'DB', 'UBS', 'BCS', 'HSBC'].map(sym => {
    const q = qMap.get(sym); const pb = q?.priceToBook || 1;
    const cvaCharge = r2(Math.max(0, (1 - pb * 0.3) * 100 + (vix > 25 ? 20 : 0)));
    return { institution: q?.shortName || sym, ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), priceToBook: r2(pb), marketCap: r1((q?.marketCap || 0) / 1e9), cvaChargeBps: Math.round(cvaCharge), creditQuality: cvaCharge < 30 ? 'Strong' : cvaCharge < 60 ? 'Adequate' : 'Elevated' };
  });
  return { counterparties, summary: { avgCvaBps: Math.round(counterparties.reduce((s, c) => s + c.cvaChargeBps, 0) / counterparties.length), vix: r2(vix), creditSpread: r2(hygYld - tnx), sectorHealth: r2(qMap.get('XLF')?.regularMarketChangePercent || 0), systemicStress: vix > 30 ? 'High' : vix > 22 ? 'Moderate' : 'Low' }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CVAMonitor] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
