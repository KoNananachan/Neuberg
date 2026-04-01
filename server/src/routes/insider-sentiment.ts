import { Router } from 'express';
import { getInsiderTransactions, getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const TRACKED = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'JNJ', 'V', 'WMT', 'XOM', 'PG', 'UNH', 'HD',
];

const CACHE_TTL = 30 * 60_000; // 30 min — insider data doesn't change often
let cache: { data: unknown; ts: number } | null = null;

const TX_TYPE_MAP: Record<string, string> = {
  P: 'Purchase', S: 'Sale', A: 'Award', G: 'Gift', X: 'Exercise',
};

async function fetchData() {
  // Fetch insider transactions for all tracked symbols in parallel (batches of 5)
  const allTransactions: any[] = [];
  for (let i = 0; i < TRACKED.length; i += 5) {
    const batch = TRACKED.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(sym => getInsiderTransactions(sym))
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) {
        for (const tx of r.value) {
          allTransactions.push({ ...tx, ticker: batch[j] });
        }
      }
    }
    if (i + 5 < TRACKED.length) await new Promise(r => setTimeout(r, 300));
  }

  // Get company names
  const quotes = await getRawQuotes(TRACKED);
  const nameMap = new Map<string, string>();
  if (quotes) {
    for (const q of quotes) {
      if (q?.symbol) nameMap.set(q.symbol, q.shortName || q.longName || q.symbol);
    }
  }

  // Normalize transactions
  const transactions = allTransactions
    .filter(tx => tx.transactionType)
    .map(tx => {
      const isBuy = tx.transactionType === 'P';
      const isSale = tx.transactionType === 'S';
      return {
        ticker: tx.ticker,
        company: nameMap.get(tx.ticker) || tx.ticker,
        insiderName: tx.name || 'Unknown',
        title: tx.relation || 'Officer',
        transactionType: TX_TYPE_MAP[tx.transactionType] || tx.transactionType,
        formType: 'Form 4',
        shares: Math.abs(tx.shares || 0),
        pricePerShare: tx.price || 0,
        totalValue: Math.abs((tx.shares || 0) * (tx.price || 0)),
        sharesOwned: tx.sharesOwned || 0,
        date: tx.date || '',
        filingDate: tx.filingDate || tx.date || '',
        sentimentScore: isBuy ? 75 : isSale ? 25 : 50,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

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
      ticker,
      company: txs[0].company,
      buyCount: buys.length,
      sellCount: sells.length,
      buyVolume, sellVolume, netVolume,
      buySellRatio: ratio,
      avgSentiment,
      uniqueInsiders,
      recentTransactions: txs.slice(0, 5),
    };
  });

  aggregated.sort((a, b) => b.netVolume - a.netVolume);

  const allBuys = transactions.filter(t => t.transactionType === 'Purchase');
  const allSells = transactions.filter(t => t.transactionType === 'Sale');

  const summary = {
    totalBuys: allBuys.length,
    totalSells: allSells.length,
    totalBuyVolume: allBuys.reduce((a, b) => a + b.totalValue, 0),
    totalSellVolume: allSells.reduce((a, b) => a + b.totalValue, 0),
    avgSentiment: transactions.length > 0
      ? Math.round(transactions.reduce((a, b) => a + b.sentimentScore, 0) / transactions.length * 10) / 10
      : 50,
    topBuyers: aggregated.filter(a => a.netVolume > 0).slice(0, 5).map(a => ({ ticker: a.ticker, netVolume: a.netVolume })),
    topSellers: aggregated.filter(a => a.netVolume < 0).slice(0, 5).map(a => ({ ticker: a.ticker, netVolume: a.netVolume })),
  };

  return { transactions: transactions.slice(0, 50), aggregated, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[InsiderSentiment] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch insider sentiment data' });
  }
});

export default router;
