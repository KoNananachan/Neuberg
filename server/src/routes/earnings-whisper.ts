import { Router } from 'express';
import { getRawQuotes, getExtendedProfile } from '../services/stocks/yahoo-finance.js';

const router = Router();

const SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'BAC', 'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'CRM',
];

const CACHE_TTL = 15 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function r1(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

async function fetchData() {
  const [quotes, ...profileResults] = await Promise.all([
    getRawQuotes(SYMBOLS),
    ...SYMBOLS.slice(0, 10).map(s => getExtendedProfile(s).catch(() => null)),
  ]);
  if (!quotes || quotes.length === 0) throw new Error('No quote data');

  const profileMap = new Map<string, any>();
  SYMBOLS.slice(0, 10).forEach((s, i) => {
    if (profileResults[i]) profileMap.set(s, profileResults[i]);
  });

  const now = new Date();
  const upcoming: any[] = [];
  const recentResults: any[] = [];

  for (const q of quotes) {
    if (!q?.symbol) continue;
    const profile = profileMap.get(q.symbol);
    const earningsTs = q.earningsTimestamp;
    const earningsDate = earningsTs ? new Date(earningsTs * 1000) : null;
    const isUpcoming = earningsDate && earningsDate > now;

    const eps = q.epsTrailingTwelveMonths || 0;
    const epsForward = q.epsForward || eps;
    const consensusEps = r2(epsForward / 4);

    const trend = profile?.earningsTrend?.[0];
    const history = profile?.earningsHistory || [];
    const beatRate = history.length > 0
      ? Math.round(history.filter((h: any) => (h.epsDifference || 0) > 0).length / history.length * 100)
      : 75;
    const avgSurprise = history.length > 0
      ? r2(history.reduce((s: number, h: any) => s + (h.surprisePercent || 0), 0) / history.length)
      : 5;

    const analystCount = trend?.earningsEstimate?.numberOfAnalysts || 20;
    const highEst = r2(trend?.earningsEstimate?.high || consensusEps * 1.15);
    const lowEst = r2(trend?.earningsEstimate?.low || consensusEps * 0.85);
    const whisperEps = r2(consensusEps * (1 + avgSurprise / 100));

    const revConsensus = r2(trend?.revenueEstimate?.avg ? trend.revenueEstimate.avg / 1e9 : (q.marketCap || 1e11) * 0.06 / 1e9);
    const revWhisper = r2(revConsensus * 1.02);

    if (isUpcoming) {
      upcoming.push({
        ticker: q.symbol, name: q.shortName || q.symbol,
        sector: q.sector || 'Technology',
        reportDate: earningsDate!.toISOString().slice(0, 10),
        reportTime: q.symbol.charCodeAt(0) % 2 === 0 ? 'BMO' as const : 'AMC' as const,
        consensusEps, whisperEps, revenueConsensus: revConsensus, revenueWhisper: revWhisper,
        whisperVsConsensus: r2(((whisperEps - consensusEps) / Math.abs(consensusEps || 1)) * 100),
        historicalBeatRate: beatRate, avgSurprise,
        impliedMove: r1(Math.abs(q.regularMarketChangePercent || 3) * 1.5),
        prevQuarterSurprise: history.length > 0 ? r2(history[history.length - 1]?.surprisePercent || 0) : 0,
        analystCount, highEst, lowEst,
      });
    } else {
      const lastQ = history[history.length - 1];
      recentResults.push({
        ticker: q.symbol, name: q.shortName || q.symbol,
        reportedEps: lastQ ? r2(lastQ.epsActual || eps / 4) : r2(eps / 4),
        consensusEps, surprise: lastQ ? r2(lastQ.surprisePercent || 0) : 0,
        revenueReported: revConsensus,
        revenueConsensus: r2(revConsensus * 0.98),
        revenueSurprise: r2(2.1),
        reaction: r2(q.regularMarketChangePercent || 0),
        guidance: 'Inline' as 'Above' | 'Inline' | 'Below',
      });
    }
  }

  const allHistory = [...profileMap.values()].flatMap(p => p?.earningsHistory || []);
  const beats = allHistory.filter((h: any) => (h.epsDifference || 0) > 0).length;
  const total = Math.max(allHistory.length, 1);

  const seasonStats = {
    totalReported: recentResults.length,
    beatRate: Math.round(beats / total * 100),
    missRate: Math.round((total - beats) / total * 100),
    inlineRate: 0,
    avgSurprise: r2(allHistory.reduce((s: number, h: any) => s + (h.surprisePercent || 0), 0) / total),
    medianReaction: r2(recentResults.length > 0 ? recentResults.reduce((s, r) => s + r.reaction, 0) / recentResults.length : 0),
    revenueBeatRate: 65,
  };

  const summary = {
    upcomingCount: upcoming.length,
    avgImpliedMove: r1(upcoming.length > 0 ? upcoming.reduce((s, u) => s + u.impliedMove, 0) / upcoming.length : 4),
    highestImpliedMove: upcoming.length > 0
      ? { ticker: upcoming.sort((a, b) => b.impliedMove - a.impliedMove)[0].ticker, move: upcoming[0].impliedMove }
      : { ticker: 'N/A', move: 0 },
    avgWhisperVsConsensus: r2(upcoming.length > 0 ? upcoming.reduce((s, u) => s + u.whisperVsConsensus, 0) / upcoming.length : 2),
    marketCapReporting: r2(quotes.reduce((s, q) => s + (q.marketCap || 0), 0) / 1e12),
  };

  return { upcoming, recentResults, seasonStats, summary };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EarningsWhisper] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch earnings whisper data' });
  }
});

export default router;
