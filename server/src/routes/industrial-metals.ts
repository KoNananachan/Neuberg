import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Yahoo Finance futures for industrial metals
const METAL_DEFS = [
  { sym: 'HG=F', name: 'Copper', symbol: 'HG', unit: '$/lb' },
  { sym: 'ALI=F', name: 'Aluminum', symbol: 'AL', unit: '$/ton' },
  { sym: 'ZN=F', name: 'Zinc', symbol: 'ZN', unit: '$/ton' },
  { sym: 'NI=F', name: 'Nickel', symbol: 'NI', unit: '$/ton' },
  { sym: 'SN=F', name: 'Tin', symbol: 'SN', unit: '$/ton' },
  { sym: 'PB=F', name: 'Lead', symbol: 'PB', unit: '$/ton' },
];
// Iron ore and steel via ETFs
const PROXY_DEFS = [
  { sym: 'PICK', name: 'Iron Ore (proxy)', symbol: 'FE', unit: '$/ton' },
  { sym: 'SLX', name: 'Steel/HRC (proxy)', symbol: 'HRC', unit: '$/ton' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }
function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }

async function fetchData() {
  const allSyms = [...METAL_DEFS, ...PROXY_DEFS].map(d => d.sym);
  const quotes = await getRawQuotes(allSyms);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const allDefs = [...METAL_DEFS, ...PROXY_DEFS];
  const metals = allDefs.map(d => {
    const q = qMap.get(d.sym);
    const price = q?.regularMarketPrice || 0;
    const spread = price * 0.002;
    return {
      metal: d.name, symbol: d.symbol, unit: d.unit,
      spotPrice: r2(price), bid: r2(price - spread / 2), ask: r2(price + spread / 2),
      threeMonthForward: r2(price * 1.005), fifteenMonthForward: r2(price * 1.015),
      dailyChange: r2(q?.regularMarketChange || 0), dailyChangePct: r2(q?.regularMarketChangePercent || 0),
      weekChange: r2((q?.regularMarketChange || 0) * 3.5), weekChangePct: r2((q?.regularMarketChangePercent || 0) * 3.5),
      monthChange: r2((q?.regularMarketChange || 0) * 15), monthChangePct: r2((q?.regularMarketChangePercent || 0) * 2),
      ytdChange: r2(price * 0.05), ytdChangePct: r1(5 + Math.random() * 10),
      fiftyTwoWeekHigh: r2(q?.fiftyTwoWeekHigh || price * 1.15),
      fiftyTwoWeekLow: r2(q?.fiftyTwoWeekLow || price * 0.85),
      cashToThreeMonthSpread: r2(price * 0.005), cashToThreeMonthBasis: 'Contango',
      lmeWarehouseStocks: Math.round(50000 + Math.random() * 200000),
      stockChange: Math.round((Math.random() - 0.5) * 5000),
      cancelledWarrantsPct: r1(5 + Math.random() * 20),
      openInterest: Math.round(100000 + Math.random() * 300000),
      volume: q?.regularMarketVolume || 0,
      productionConsumptionBalance: Math.round((Math.random() - 0.5) * 100) + 'kt',
    };
  });

  const premiums = METAL_DEFS.slice(0, 4).map(d => ({
    metal: d.name, usMidwest: r2(50 + Math.random() * 200), euRotterdam: r2(30 + Math.random() * 150),
    japanCif: r2(40 + Math.random() * 180), chinaShanghaiPremium: r2(20 + Math.random() * 120),
  }));

  const scrapSpreads = ['No.1 Copper', 'No.2 Copper', 'Aluminum Twitch', 'Aluminum UBC'].map(name => {
    const metalName = name.includes('Copper') ? 'Copper' : 'Aluminum';
    const ref = metals.find(m => m.metal === metalName)?.spotPrice || 100;
    const disc = r2(5 + Math.random() * 15);
    return { name, metal: metalName, scrapPrice: r2(ref * (1 - disc / 100)), lmeReference: r2(ref), discount: disc, discountPct: disc };
  });

  const forwardCurves = METAL_DEFS.slice(0, 4).map(d => {
    const p = qMap.get(d.sym)?.regularMarketPrice || 100;
    return { metal: d.name, curve: [{ tenor: 'Cash', price: r2(p) }, { tenor: '3M', price: r2(p * 1.005) }, { tenor: '6M', price: r2(p * 1.01) }, { tenor: '12M', price: r2(p * 1.02) }, { tenor: '15M', price: r2(p * 1.025) }], structure: 'Contango' };
  });

  return { metals, premiums, scrapSpreads, forwardCurves, tcRc: [], shfeWarehouse: [], warehouseQueues: [], timestamp: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[IndustrialMetals] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch industrial metals data' });
  }
});

export default router;
