import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';
const router = Router();
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'SHY', 'IEF', 'TLT', 'ZN=F', 'ZB=F', '^VIX'];
const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }
async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS); if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));
  const irx = qMap.get('^IRX')?.regularMarketPrice || 5; const fvx = qMap.get('^FVX')?.regularMarketPrice || 4.2;
  const tnx = qMap.get('^TNX')?.regularMarketPrice || 4.5; const tyx = qMap.get('^TYX')?.regularMarketPrice || 4.8;
  const trades = [
    { name: '2s5s Flattener', shortLeg: '2Y', longLeg: '5Y', spread: r3(fvx - irx * 0.95), signal: (fvx - irx * 0.95) < 0 ? 'Inverted' : 'Normal' },
    { name: '2s10s Steepener', shortLeg: '2Y', longLeg: '10Y', spread: r3(tnx - irx * 0.95), signal: (tnx - irx * 0.95) > 0.5 ? 'Steep' : (tnx - irx * 0.95) < 0 ? 'Inverted' : 'Flat' },
    { name: '5s30s Steepener', shortLeg: '5Y', longLeg: '30Y', spread: r3(tyx - fvx), signal: (tyx - fvx) > 0.5 ? 'Steep' : 'Flat' },
    { name: '10s30s Butterfly', shortLeg: '10Y', longLeg: '30Y', spread: r3(tyx - tnx), signal: (tyx - tnx) > 0.3 ? 'Positive' : 'Flat' },
  ];
  const etfs = ['SHY', 'IEF', 'TLT'].map(sym => { const q = qMap.get(sym); return { ticker: sym, name: q?.shortName || sym, price: r2(q?.regularMarketPrice || 0), change: r2(q?.regularMarketChangePercent || 0) }; });
  return { trades, etfs, yieldCurve: [{ tenor: '3M', yield: r3(irx) }, { tenor: '5Y', yield: r3(fvx) }, { tenor: '10Y', yield: r3(tnx) }, { tenor: '30Y', yield: r3(tyx) }], summary: { curveShape: (tyx - irx) > 0.3 ? 'Normal' : (tyx - irx) < -0.1 ? 'Inverted' : 'Flat', vix: r2(qMap.get('^VIX')?.regularMarketPrice || 20) }, generatedAt: new Date().toISOString() };
}
router.get('/', async (_req, res) => { try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); } catch (err) { console.error('[CurveTrade] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed' }); } });
export default router;
