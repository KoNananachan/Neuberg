import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();
const FUTURES = [
  { sym: 'ZC=F', name: 'Corn', unit: '$/bu', exchange: 'CBOT' },
  { sym: 'ZS=F', name: 'Soybeans', unit: '$/bu', exchange: 'CBOT' },
  { sym: 'ZW=F', name: 'Wheat', unit: '$/bu', exchange: 'CBOT' },
  { sym: 'ZR=F', name: 'Rice', unit: '$/cwt', exchange: 'CBOT' },
  { sym: 'ZO=F', name: 'Oats', unit: '$/bu', exchange: 'CBOT' },
  { sym: 'ZL=F', name: 'Soybean Oil', unit: '$/lb', exchange: 'CBOT' },
  { sym: 'ZM=F', name: 'Soybean Meal', unit: '$/ton', exchange: 'CBOT' },
  { sym: 'KC=F', name: 'Coffee', unit: '$/lb', exchange: 'ICE' },
  { sym: 'SB=F', name: 'Sugar', unit: '$/lb', exchange: 'ICE' },
  { sym: 'CC=F', name: 'Cocoa', unit: '$/ton', exchange: 'ICE' },
  { sym: 'CT=F', name: 'Cotton', unit: '$/lb', exchange: 'ICE' },
  { sym: 'OJ=F', name: 'Orange Juice', unit: '$/lb', exchange: 'ICE' },
  { sym: 'LE=F', name: 'Live Cattle', unit: '$/lb', exchange: 'CME' },
  { sym: 'HE=F', name: 'Lean Hogs', unit: '$/lb', exchange: 'CME' },
  { sym: 'GF=F', name: 'Feeder Cattle', unit: '$/lb', exchange: 'CME' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(FUTURES.map(f => f.sym));
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const futures = FUTURES.map(f => {
    const q = qMap.get(f.sym);
    const price = q?.regularMarketPrice || 0;
    return {
      commodity: f.name, symbol: f.sym, unit: f.unit, exchange: f.exchange,
      price: r2(price), change: r2(q?.regularMarketChange || 0), changePct: r2(q?.regularMarketChangePercent || 0),
      high52w: r2(q?.fiftyTwoWeekHigh || price * 1.2), low52w: r2(q?.fiftyTwoWeekLow || price * 0.8),
      volume: q?.regularMarketVolume || 0,
      percentile52w: r1((q?.fiftyTwoWeekHigh || 0) !== (q?.fiftyTwoWeekLow || 0) ? ((price - (q?.fiftyTwoWeekLow || 0)) / ((q?.fiftyTwoWeekHigh || 1) - (q?.fiftyTwoWeekLow || 0))) * 100 : 50),
    };
  });

  const grains = futures.filter(f => ['Corn', 'Soybeans', 'Wheat', 'Rice', 'Oats', 'Soybean Oil', 'Soybean Meal'].includes(f.commodity));
  const softs = futures.filter(f => ['Coffee', 'Sugar', 'Cocoa', 'Cotton', 'Orange Juice'].includes(f.commodity));
  const livestock = futures.filter(f => ['Live Cattle', 'Lean Hogs', 'Feeder Cattle'].includes(f.commodity));

  const summary = {
    topGainer: [...futures].sort((a, b) => b.changePct - a.changePct)[0]?.commodity || 'N/A',
    topLoser: [...futures].sort((a, b) => a.changePct - b.changePct)[0]?.commodity || 'N/A',
    grainsAvg: r2(grains.reduce((s, f) => s + f.changePct, 0) / (grains.length || 1)),
    softsAvg: r2(softs.reduce((s, f) => s + f.changePct, 0) / (softs.length || 1)),
    livestockAvg: r2(livestock.reduce((s, f) => s + f.changePct, 0) / (livestock.length || 1)),
  };

  return { futures, grains, softs, livestock, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try { const now = Date.now(); if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data); const data = await fetchData(); cache = { data, ts: now }; res.json(data); }
  catch (err) { console.error('[AgriculturalFutures] Error:', (err as Error).message); if (cache) return res.json(cache.data); res.status(500).json({ error: 'Failed to fetch data' }); }
});
export default router;
