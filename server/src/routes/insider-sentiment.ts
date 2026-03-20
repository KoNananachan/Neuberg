import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const INSIDERS = [
  { ticker: 'AAPL', company: 'Apple', officers: ['Tim Cook', 'Luca Maestri', 'Jeff Williams', 'Deirdre O\'Brien'] },
  { ticker: 'MSFT', company: 'Microsoft', officers: ['Satya Nadella', 'Amy Hood', 'Brad Smith', 'Judson Althoff'] },
  { ticker: 'GOOGL', company: 'Alphabet', officers: ['Sundar Pichai', 'Ruth Porat', 'Prabhakar Raghavan', 'Kent Walker'] },
  { ticker: 'AMZN', company: 'Amazon', officers: ['Andy Jassy', 'Brian Olsavsky', 'Adam Selipsky', 'Dave Clark'] },
  { ticker: 'NVDA', company: 'NVIDIA', officers: ['Jensen Huang', 'Colette Kress', 'Debora Shoquist', 'Jay Puri'] },
  { ticker: 'META', company: 'Meta Platforms', officers: ['Mark Zuckerberg', 'Susan Li', 'Chris Cox', 'Andrew Bosworth'] },
  { ticker: 'TSLA', company: 'Tesla', officers: ['Elon Musk', 'Vaibhav Taneja', 'Tom Zhu', 'Andrew Baglino'] },
  { ticker: 'JPM', company: 'JPMorgan', officers: ['Jamie Dimon', 'Jeremy Barnum', 'Mary Erdoes', 'Daniel Pinto'] },
  { ticker: 'JNJ', company: 'Johnson & Johnson', officers: ['Joaquin Duato', 'Joseph Wolk', 'Jennifer Taubert', 'Kathryn Wengel'] },
  { ticker: 'V', company: 'Visa', officers: ['Ryan McInerney', 'Chris Suh', 'Vasant Prabhu', 'Paul Fabara'] },
  { ticker: 'WMT', company: 'Walmart', officers: ['Doug McMillon', 'John David Rainey', 'Judith McKenna', 'Kath McLay'] },
  { ticker: 'XOM', company: 'Exxon Mobil', officers: ['Darren Woods', 'Kathryn Mikells', 'Neil Chapman', 'Jack Williams'] },
  { ticker: 'PG', company: 'Procter & Gamble', officers: ['Jon Moeller', 'Andre Schulten', 'Shailesh Jejurikar', 'Ma. Fatima Francisco'] },
  { ticker: 'UNH', company: 'UnitedHealth', officers: ['Andrew Witty', 'John Rex', 'Brian Thompson', 'Dirk McMahon'] },
  { ticker: 'HD', company: 'Home Depot', officers: ['Ted Decker', 'Richard McPhail', 'Ann-Marie Campbell', 'Jeff Kinnaird'] },
];

const TITLES = ['CEO', 'CFO', 'COO', 'SVP', 'EVP', 'Director', 'VP Operations', 'General Counsel', 'CTO', 'President'];
const FORM_TYPES = ['Form 4', 'Form 4', 'Form 4', 'Form 4', 'Form 144', '13D', '13G'];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-insider-sentiment'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const transactions: {
    ticker: string; company: string; insiderName: string; title: string;
    transactionType: string; formType: string; shares: number; pricePerShare: number;
    totalValue: number; sharesOwned: number; date: string; filingDate: string;
    sentimentScore: number;
  }[] = [];

  for (const co of INSIDERS) {
    const numTx = 2 + Math.floor(rng() * 5);
    for (let i = 0; i < numTx; i++) {
      const officer = co.officers[Math.floor(rng() * co.officers.length)];
      const title = TITLES[Math.floor(rng() * TITLES.length)];
      const isBuy = rng() > 0.65;
      const formType = FORM_TYPES[Math.floor(rng() * FORM_TYPES.length)];
      const daysAgo = Math.floor(rng() * 90);
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - daysAgo);
      const fileDate = new Date(txDate);
      fileDate.setDate(fileDate.getDate() + Math.floor(rng() * 3) + 1);

      const basePrice = 50 + rng() * 400;
      const shares = Math.round((500 + rng() * 50000) / 100) * 100;
      const price = Math.round(jitter(basePrice, 0.05) * 100) / 100;
      const total = Math.round(shares * price);
      const owned = Math.round(shares * (5 + rng() * 50));

      transactions.push({
        ticker: co.ticker, company: co.company, insiderName: officer, title,
        transactionType: isBuy ? 'Purchase' : 'Sale',
        formType, shares, pricePerShare: price, totalValue: total,
        sharesOwned: owned,
        date: txDate.toISOString().slice(0, 10),
        filingDate: fileDate.toISOString().slice(0, 10),
        sentimentScore: isBuy ? Math.round((50 + rng() * 50) * 10) / 10 : Math.round(rng() * 50 * 10) / 10,
      });
    }
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date));

  // Aggregate by ticker
  const tickerMap = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    if (!tickerMap.has(tx.ticker)) tickerMap.set(tx.ticker, []);
    tickerMap.get(tx.ticker)!.push(tx);
  }

  const aggregated = [...tickerMap.entries()].map(([ticker, txs]) => {
    const buys = txs.filter(t => t.transactionType === 'Purchase');
    const sells = txs.filter(t => t.transactionType === 'Sale');
    const buyVolume = buys.reduce((a, b) => a + b.totalValue, 0);
    const sellVolume = sells.reduce((a, b) => a + b.totalValue, 0);
    const netVolume = buyVolume - sellVolume;
    const ratio = sellVolume > 0 ? Math.round(buyVolume / sellVolume * 100) / 100 : buyVolume > 0 ? 99.99 : 0;
    const avgSentiment = Math.round(txs.reduce((a, b) => a + b.sentimentScore, 0) / txs.length * 10) / 10;
    const uniqueInsiders = new Set(txs.map(t => t.insiderName)).size;

    return {
      ticker, company: txs[0].company,
      buyCount: buys.length, sellCount: sells.length,
      buyVolume, sellVolume, netVolume, buySellRatio: ratio,
      avgSentiment, uniqueInsiders,
      recentTransactions: txs.slice(0, 5),
    };
  });

  aggregated.sort((a, b) => b.netVolume - a.netVolume);

  const summary = {
    totalBuys: transactions.filter(t => t.transactionType === 'Purchase').length,
    totalSells: transactions.filter(t => t.transactionType === 'Sale').length,
    totalBuyVolume: transactions.filter(t => t.transactionType === 'Purchase').reduce((a, b) => a + b.totalValue, 0),
    totalSellVolume: transactions.filter(t => t.transactionType === 'Sale').reduce((a, b) => a + b.totalValue, 0),
    avgSentiment: Math.round(transactions.reduce((a, b) => a + b.sentimentScore, 0) / transactions.length * 10) / 10,
    topBuyers: aggregated.filter(a => a.netVolume > 0).slice(0, 5).map(a => ({ ticker: a.ticker, netVolume: a.netVolume })),
    topSellers: aggregated.filter(a => a.netVolume < 0).slice(0, 5).map(a => ({ ticker: a.ticker, netVolume: a.netVolume })),
  };

  return { transactions: transactions.slice(0, 50), aggregated, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[InsiderSentiment] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate insider sentiment data' });
  }
});

export default router;
