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

const COMPANIES = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Tech', baseTraffic: 85, baseApp: 92, baseSat: 78 },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Tech', baseTraffic: 95, baseApp: 88, baseSat: 82 },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Tech', baseTraffic: 98, baseApp: 75, baseSat: 70 },
  { ticker: 'META', name: 'Meta', sector: 'Tech', baseTraffic: 80, baseApp: 85, baseSat: 65 },
  { ticker: 'NFLX', name: 'Netflix', sector: 'Media', baseTraffic: 70, baseApp: 90, baseSat: 55 },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Auto', baseTraffic: 65, baseApp: 72, baseSat: 88 },
  { ticker: 'WMT', name: 'Walmart', sector: 'Retail', baseTraffic: 75, baseApp: 68, baseSat: 80 },
  { ticker: 'TGT', name: 'Target', sector: 'Retail', baseTraffic: 55, baseApp: 60, baseSat: 62 },
  { ticker: 'SBUX', name: 'Starbucks', sector: 'F&B', baseTraffic: 60, baseApp: 78, baseSat: 72 },
  { ticker: 'NKE', name: 'Nike', sector: 'Retail', baseTraffic: 50, baseApp: 65, baseSat: 58 },
  { ticker: 'DIS', name: 'Disney', sector: 'Media', baseTraffic: 68, baseApp: 82, baseSat: 60 },
  { ticker: 'UBER', name: 'Uber', sector: 'Tech', baseTraffic: 72, baseApp: 88, baseSat: 45 },
  { ticker: 'ABNB', name: 'Airbnb', sector: 'Travel', baseTraffic: 58, baseApp: 70, baseSat: 50 },
  { ticker: 'CRM', name: 'Salesforce', sector: 'Tech', baseTraffic: 45, baseApp: 55, baseSat: 42 },
  { ticker: 'SHOP', name: 'Shopify', sector: 'Tech', baseTraffic: 48, baseApp: 62, baseSat: 38 },
];

const SENTIMENT_SOURCES = ['Twitter/X', 'Reddit', 'StockTwits', 'News Media', 'Analyst Reports'];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-alternative-data'));
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));

  const companies = COMPANIES.map(c => {
    const webTraffic = {
      indexScore: Math.round(jitter(c.baseTraffic, 0.1)),
      uniqueVisitors: Math.round(jitter(c.baseTraffic * 1.2, 0.12) * 100000),
      change7d: Math.round((rng() - 0.45) * 15 * 10) / 10,
      change30d: Math.round((rng() - 0.4) * 25 * 10) / 10,
      trend: Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (11 - i) * 7);
        return { date: d.toISOString().slice(0, 10), score: Math.round(jitter(c.baseTraffic, 0.08)) };
      }),
    };

    const appMetrics = {
      downloadRank: Math.round(1 + rng() * 200),
      ratingScore: Math.round((3.5 + rng() * 1.5) * 10) / 10,
      reviewCount: Math.round(jitter(c.baseApp * 500, 0.15)),
      dailyActiveUsers: Math.round(jitter(c.baseApp * 50000, 0.1)),
      change7d: Math.round((rng() - 0.45) * 12 * 10) / 10,
      engagementIndex: Math.round(jitter(c.baseApp, 0.1)),
    };

    const satelliteProxy = {
      activityIndex: Math.round(jitter(c.baseSat, 0.12)),
      parkingLotFill: Math.round(40 + rng() * 55),
      shippingVolume: Math.round(jitter(70, 0.15)),
      constructionActivity: Math.round(jitter(50, 0.2)),
      change30d: Math.round((rng() - 0.4) * 20 * 10) / 10,
    };

    const socialSentiment = {
      overallScore: Math.round((rng() * 2 - 1) * 100) / 100,
      volume24h: Math.round(jitter(5000, 0.3)),
      volumeChange: Math.round((rng() - 0.45) * 50 * 10) / 10,
      sources: SENTIMENT_SOURCES.map(src => ({
        source: src,
        sentiment: Math.round((rng() * 2 - 1) * 100) / 100,
        volume: Math.round(jitter(1000, 0.4)),
      })),
    };

    const jobPostings = {
      totalActive: Math.round(jitter(500, 0.2)),
      change30d: Math.round((rng() - 0.45) * 30 * 10) / 10,
      engineeringPct: Math.round(20 + rng() * 40),
      topCategory: ['Engineering', 'Sales', 'Marketing', 'Operations', 'Data Science'][Math.floor(rng() * 5)],
    };

    const compositeScore = Math.round(
      (webTraffic.indexScore * 0.25 + appMetrics.engagementIndex * 0.25 +
       satelliteProxy.activityIndex * 0.2 + (socialSentiment.overallScore + 1) * 50 * 0.15 +
       Math.min(100, jobPostings.totalActive / 10) * 0.15)
    );

    return {
      ticker: c.ticker, name: c.name, sector: c.sector,
      compositeScore, webTraffic, appMetrics, satelliteProxy, socialSentiment, jobPostings,
    };
  });

  const sectorAgg = [...new Set(COMPANIES.map(c => c.sector))].map(sector => {
    const sectorCos = companies.filter(c => c.sector === sector);
    return {
      sector,
      avgComposite: Math.round(sectorCos.reduce((a, c) => a + c.compositeScore, 0) / sectorCos.length),
      avgWebTraffic: Math.round(sectorCos.reduce((a, c) => a + c.webTraffic.indexScore, 0) / sectorCos.length),
      avgAppEngagement: Math.round(sectorCos.reduce((a, c) => a + c.appMetrics.engagementIndex, 0) / sectorCos.length),
      avgSentiment: Math.round(sectorCos.reduce((a, c) => a + c.socialSentiment.overallScore, 0) / sectorCos.length * 100) / 100,
      count: sectorCos.length,
    };
  });

  return { companies, sectorAgg, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[AlternativeData] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate alternative data' });
  }
});

export default router;
