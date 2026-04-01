import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['FXI', 'EWJ', 'EWG', 'EWU', 'EWZ', 'INDA', 'EWY', 'EWW', 'EEM', '^GSPC'];
const CACHE_TTL = 30 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  // Static tax rates with real market context
  const countries = [{ country: 'United States', corpRate: 21, topIncome: 37, vat: 0, etf: null }, { country: 'China', corpRate: 25, topIncome: 45, vat: 13, etf: 'FXI' }, { country: 'Japan', corpRate: 23.2, topIncome: 45, vat: 10, etf: 'EWJ' }, { country: 'Germany', corpRate: 29.8, topIncome: 45, vat: 19, etf: 'EWG' }, { country: 'UK', corpRate: 25, topIncome: 45, vat: 20, etf: 'EWU' }, { country: 'Brazil', corpRate: 34, topIncome: 27.5, vat: 0, etf: 'EWZ' }, { country: 'India', corpRate: 22, topIncome: 30, vat: 18, etf: 'INDA' }, { country: 'South Korea', corpRate: 24, topIncome: 45, vat: 10, etf: 'EWY' }, { country: 'Mexico', corpRate: 30, topIncome: 35, vat: 16, etf: 'EWW' }].map(c => ({ ...c, marketChange: c.etf ? r2(qMap.get(c.etf)?.regularMarketChangePercent || 0) : r2(qMap.get('^GSPC')?.regularMarketChangePercent || 0) }));
  return { countries, summary: { avgCorpRate: r2(countries.reduce((s, c) => s + c.corpRate, 0) / countries.length), lowestCorp: countries.sort((a, b) => a.corpRate - b.corpRate)[0]?.country || 'N/A' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalTaxRates]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
