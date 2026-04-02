import { scrapeArticles, createNewsSource } from './neuberg-scraper.js';
import { analyzeUnprocessedArticles } from '../ai/news-analyzer.js';
import { clusterRecentNews } from '../ai/news-clusterer.js';
import { getClientCount } from '../websocket/ws-server.js';
import type { NewsSource } from './news-source.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds (halved API calls vs 30s)
const IDLE_POLL_INTERVAL_MS = 5 * 60_000; // 5 minutes when no users connected
const CLUSTER_INTERVAL_MS = 10 * 60_000; // 10 minutes
let lastClusterTime = 0;
let newsSource: NewsSource | null = null;

export function startScraperScheduler() {
  newsSource = createNewsSource();
  if (!newsSource) {
    console.log('[Scheduler] No news source configured — only AI analysis will run');
  } else {
    console.log(`[Scheduler] Polling ${newsSource.name} every ${POLL_INTERVAL_MS / 1000}s`);
  }

  // Run immediately on start
  runScrapeAndAnalyze();

  // Adaptive polling: fast when users connected, slow when idle
  setInterval(() => {
    const interval = getClientCount() > 0 ? POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
    const elapsed = Date.now() - lastScrapeTime;
    if (elapsed >= interval) {
      runScrapeAndAnalyze();
    }
  }, POLL_INTERVAL_MS); // Check every 60s, but only scrape if interval elapsed
}

let lastScrapeTime = 0;

async function runScrapeAndAnalyze() {
  lastScrapeTime = Date.now();
  try {
    const newCount = await scrapeArticles(newsSource);
    if (newCount > 0) {
      await analyzeUnprocessedArticles();
    }

    // Re-cluster periodically (every 10 minutes)
    const now = Date.now();
    if (now - lastClusterTime > CLUSTER_INTERVAL_MS) {
      lastClusterTime = now;
      await clusterRecentNews().catch(err =>
        console.error('[Scheduler] Clustering error:', err)
      );
    }
  } catch (err) {
    console.error('[Scheduler] Error in scrape cycle:', err);
  }
}

export { runScrapeAndAnalyze };
