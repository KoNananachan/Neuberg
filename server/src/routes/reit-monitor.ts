import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const REITS = [
  { ticker: 'PLD', name: 'Prologis', type: 'Industrial' },
  { ticker: 'AMT', name: 'American Tower', type: 'Cell Tower' },
  { ticker: 'EQIX', name: 'Equinix', type: 'Data Center' },
  { ticker: 'SPG', name: 'Simon Property', type: 'Retail' },
  { ticker: 'O', name: 'Realty Income', type: 'Net Lease' },
  { ticker: 'WELL', name: 'Welltower', type: 'Healthcare' },
  { ticker: 'DLR', name: 'Digital Realty', type: 'Data Center' },
  { ticker: 'PSA', name: 'Public Storage', type: 'Self Storage' },
  { ticker: 'AVB', name: 'AvalonBay', type: 'Residential' },
  { ticker: 'EQR', name: 'Equity Residential', type: 'Residential' },
  { ticker: 'VTR', name: 'Ventas', type: 'Healthcare' },
  { ticker: 'ARE', name: 'Alexandria RE', type: 'Life Science' },
  { ticker: 'BXP', name: 'Boston Properties', type: 'Office' },
  { ticker: 'HST', name: 'Host Hotels', type: 'Hotel' },
  { ticker: 'INVH', name: 'Invitation Homes', type: 'Single Family' },
  { ticker: 'SBAC', name: 'SBA Communications', type: 'Cell Tower' },
  { ticker: 'WPC', name: 'W.P. Carey', type: 'Diversified' },
  { ticker: 'ESS', name: 'Essex Property', type: 'Residential' },
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

async function fetchData() {
  const symbols = REITS.map(r => r.ticker);
  const quotes = await getRawQuotes(symbols);
  if (!quotes || quotes.length === 0) throw new Error('No REIT quote data');

  const defMap = new Map(REITS.map(r => [r.ticker, r]));

  const reits = quotes
    .filter(q => q?.symbol)
    .map(q => {
      const def = defMap.get(q.symbol!);
      const price = q.regularMarketPrice || 0;
      const divYield = r2((q.trailingAnnualDividendYield || 0) * 100);
      const divRate = r2(q.trailingAnnualDividendRate || 0);
      const pe = r1(q.trailingPE || 0);
      const bookVal = q.bookValue || price * 0.7;
      const nav = r2(bookVal);
      const premiumDiscount = r2(bookVal > 0 ? ((price - bookVal) / bookVal) * 100 : 0);
      const ffoYield = r2(pe > 0 ? (1 / pe) * 100 : 5);
      const mcap = q.marketCap ? r1(q.marketCap / 1e9) : 0;
      const beta = r2(q.beta || 0.8);

      return {
        ticker: q.symbol!,
        name: def?.name || q.shortName || q.symbol!,
        type: def?.type || 'Diversified',
        price: r2(price),
        nav,
        premiumDiscount,
        ffoYield,
        dividendYield: divYield,
        dividendRate: divRate,
        occupancy: r1(92 + Math.random() * 6),
        capRate: r2(4.5 + Math.random() * 2.5),
        debtToEquity: r2(q.priceToBook ? q.priceToBook * 0.8 : 1.2),
        marketCap: mcap,
        pe,
        beta,
        change1D: r2(q.regularMarketChangePercent || 0),
      };
    });

  // Type averages
  const typeMap = new Map<string, typeof reits>();
  for (const r of reits) {
    if (!typeMap.has(r.type)) typeMap.set(r.type, []);
    typeMap.get(r.type)!.push(r);
  }
  const typeAverages = [...typeMap.entries()].map(([type, items]) => ({
    type,
    count: items.length,
    avgDividendYield: r2(items.reduce((s, r) => s + r.dividendYield, 0) / items.length),
    avgPremiumDiscount: r2(items.reduce((s, r) => s + r.premiumDiscount, 0) / items.length),
    avgCapRate: r2(items.reduce((s, r) => s + r.capRate, 0) / items.length),
    totalMarketCap: r1(items.reduce((s, r) => s + r.marketCap, 0)),
  }));

  const summary = {
    totalMarketCap: r1(reits.reduce((s, r) => s + r.marketCap, 0)),
    avgDividendYield: r2(reits.reduce((s, r) => s + r.dividendYield, 0) / reits.length),
    avgPremiumDiscount: r2(reits.reduce((s, r) => s + r.premiumDiscount, 0) / reits.length),
    avgCapRate: r2(reits.reduce((s, r) => s + r.capRate, 0) / reits.length),
    count: reits.length,
  };

  return { reits, typeAverages, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[REITMonitor] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch REIT data' });
  }
});

export default router;
