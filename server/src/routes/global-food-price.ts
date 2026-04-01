import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['DBA', 'WEAT', 'CORN', 'SOYB', 'ZC=F', 'ZW=F', 'ZS=F', 'KC=F', 'SB=F', 'CC=F', 'LE=F', 'HE=F'];
const CACHE_TTL = 5 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const names: Record<string, string> = { 'ZC=F': 'Corn', 'ZW=F': 'Wheat', 'ZS=F': 'Soybeans', 'KC=F': 'Coffee', 'SB=F': 'Sugar', 'CC=F': 'Cocoa', 'LE=F': 'Cattle', 'HE=F': 'Hogs' };
  const commodities = Object.entries(names).map(([sym, name]) => { const q = qMap.get(sym); return { commodity: name, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0), high52w: r2(q?.fiftyTwoWeekHigh || 0), low52w: r2(q?.fiftyTwoWeekLow || 0) }; });
  const dba = qMap.get('DBA');
  return { commodities, etfs: ['DBA', 'WEAT', 'CORN', 'SOYB'].map(sym => { const q = qMap.get(sym); return { ticker: sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; }), summary: { dbaChange: r2(dba?.regularMarketChangePercent || 0), foodInflation: (dba?.regularMarketChangePercent || 0) > 1 ? 'Rising' : 'Stable', topMover: [...commodities].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]?.commodity || 'N/A' }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[GlobalFoodPrice]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
