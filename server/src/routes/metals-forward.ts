import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['GC=F', 'SI=F', 'HG=F', 'PL=F', 'PA=F', 'GLD', 'SLV', 'CPER', 'PPLT', '^TNX', '^IRX', 'DXY=X'];
const CACHE_TTL = 10 * 60_000; let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r4(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10000) / 10000 : 0; }
async function fetchData() { const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data'); const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const metals = [{ sym: 'GC=F', etf: 'GLD', name: 'Gold', unit: '$/oz' }, { sym: 'SI=F', etf: 'SLV', name: 'Silver', unit: '$/oz' }, { sym: 'HG=F', etf: 'CPER', name: 'Copper', unit: '$/lb' }, { sym: 'PL=F', etf: 'PPLT', name: 'Platinum', unit: '$/oz' }, { sym: 'PA=F', etf: null, name: 'Palladium', unit: '$/oz' }].map(m => { const q = qMap.get(m.sym); const e = m.etf ? qMap.get(m.etf) : null; return { metal: m.name, unit: m.unit, spot: r2(q?.regularMarketPrice), change: r2(q?.regularMarketChangePercent), dayHigh: r2(q?.regularMarketDayHigh), dayLow: r2(q?.regularMarketDayLow), prevClose: r2(q?.regularMarketPreviousClose), etf: m.etf ? { ticker: m.etf, price: r2(e?.regularMarketPrice), change: r2(e?.regularMarketChangePercent) } : null }; });
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const dxy = qMap.get('DXY=X')?.regularMarketPrice || 104;
  const goldSpot = metals.find(m => m.metal === 'Gold')?.spot || 2000;
  const silverSpot = metals.find(m => m.metal === 'Silver')?.spot || 25;
  return { metals, ratios: { goldSilver: r2(silverSpot > 0 ? goldSpot / silverSpot : 0), realRate: r2(tnx - 2.5) }, macro: { tenYear: r2(tnx), tbill3m: r2(irx), dollarIndex: r2(dxy) }, generatedAt: new Date().toISOString() }; }
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[MetalsForward]', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
