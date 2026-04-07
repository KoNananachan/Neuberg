import { prisma } from '../../lib/prisma.js';
import { getInsiderTransactions } from './yahoo-finance.js';

const POLL_INTERVAL = 30 * 60_000; // 30 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

async function pollInsiderTrades() {
  try {
    const trackedStocks = await prisma.trackedStock.findMany({
      select: { symbol: true },
      take: 20,
    });

    if (trackedStocks.length === 0) return;

    console.log(`[InsiderTracker] Checking insider trades for ${trackedStocks.length} symbols`);

    // Pre-fetch existing trade keys for batch dedup (avoids N+1 findFirst queries)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60_000);
    const existingTrades = await prisma.insiderTrade.findMany({
      where: { tradeDate: { gte: ninetyDaysAgo } },
      select: { symbol: true, ownerName: true, tradeDate: true, shares: true, transactionType: true },
    });
    const existingKeys = new Set(
      existingTrades.map(t => `${t.symbol}|${t.ownerName}|${t.tradeDate.getTime()}|${t.shares}|${t.transactionType}`),
    );

    for (const stock of trackedStocks) {
      const txns = await getInsiderTransactions(stock.symbol);
      const newTrades: Parameters<typeof prisma.insiderTrade.create>[0]['data'][] = [];

      for (const t of txns) {
        const tradeDate = new Date(t.transactionDate);

        // Skip trades older than 90 days
        if (tradeDate < ninetyDaysAgo) continue;

        const key = `${stock.symbol}|${t.ownerName}|${tradeDate.getTime()}|${t.shares}|${t.transactionType}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key); // Prevent duplicates within this batch

        const pricePerShare = t.value && t.shares ? Math.round((t.value / t.shares) * 100) / 100 : null;
        const filingDate = t.filingDate ? new Date(t.filingDate) : tradeDate;

        newTrades.push({
          symbol: stock.symbol,
          filingDate,
          tradeDate,
          ownerName: t.ownerName,
          ownerTitle: t.ownerTitle,
          transactionType: t.transactionType,
          shares: t.shares,
          pricePerShare,
          totalValue: t.value,
          secFilingUrl: null,
        });
      }

      // Batch create all new trades for this symbol
      if (newTrades.length > 0) {
        await prisma.$transaction(
          newTrades.map(data => prisma.insiderTrade.create({ data })),
        );
      }

      // Small delay between symbols to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Omit success log to reduce Cloud Logging costs
  } catch (err) {
    console.error('[InsiderTracker] Error polling insider trades:', err instanceof Error ? err.message : err);
  }
}

export function startInsiderTracker() {
  console.log('[InsiderTracker] Starting insider tracker (30min interval)');
  pollInsiderTrades();
  intervalId = setInterval(pollInsiderTrades, POLL_INTERVAL);
}

export function stopInsiderTracker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
