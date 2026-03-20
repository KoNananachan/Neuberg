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
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', baseE: 72, baseS: 68, baseG: 75 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', baseE: 82, baseS: 78, baseG: 80 },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology', baseE: 70, baseS: 60, baseG: 55 },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Technology', baseE: 55, baseS: 45, baseG: 50 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', baseE: 65, baseS: 72, baseG: 70 },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Disc.', baseE: 78, baseS: 35, baseG: 30 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', baseE: 65, baseS: 70, baseG: 75 },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', baseE: 50, baseS: 65, baseG: 72 },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', baseE: 25, baseS: 55, baseG: 65 },
  { ticker: 'CVX', name: 'Chevron', sector: 'Energy', baseE: 30, baseS: 58, baseG: 68 },
  { ticker: 'NEE', name: 'NextEra Energy', sector: 'Utilities', baseE: 88, baseS: 72, baseG: 78 },
  { ticker: 'JPM', name: 'JPMorgan', sector: 'Financials', baseE: 60, baseS: 62, baseG: 70 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', baseE: 58, baseS: 60, baseG: 65 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', baseE: 70, baseS: 75, baseG: 80 },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', baseE: 62, baseS: 72, baseG: 78 },
  { ticker: 'CAT', name: 'Caterpillar', sector: 'Industrials', baseE: 55, baseS: 65, baseG: 72 },
  { ticker: 'LMT', name: 'Lockheed Martin', sector: 'Industrials', baseE: 45, baseS: 40, baseG: 68 },
  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer Staples', baseE: 52, baseS: 48, baseG: 60 },
  { ticker: 'DIS', name: 'Walt Disney', sector: 'Communication', baseE: 60, baseS: 70, baseG: 55 },
  { ticker: 'CRM', name: 'Salesforce', sector: 'Technology', baseE: 75, baseS: 70, baseG: 65 },
];

const CONTROVERSY_TYPES = ['Labor Practices', 'Environmental Violation', 'Data Privacy', 'Supply Chain', 'Product Safety', 'Governance Failure', 'Tax Avoidance', 'Anti-Competitive', 'Human Rights'];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-esg-ratings'));
  const jitter = (base: number, pct: number) => Math.min(100, Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct)));

  const ratings = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
  const scoreToRating = (s: number) => {
    if (s >= 80) return 'AAA';
    if (s >= 70) return 'AA';
    if (s >= 60) return 'A';
    if (s >= 50) return 'BBB';
    if (s >= 40) return 'BB';
    if (s >= 30) return 'B';
    return 'CCC';
  };

  const companies = COMPANIES.map(c => {
    const e = Math.round(jitter(c.baseE, 0.08));
    const s = Math.round(jitter(c.baseS, 0.08));
    const g = Math.round(jitter(c.baseG, 0.08));
    const total = Math.round((e * 0.35 + s * 0.35 + g * 0.3));
    const rating = scoreToRating(total);
    const carbonIntensity = Math.round((c.sector === 'Energy' ? 300 + rng() * 200 : 20 + rng() * 100) * 10) / 10;
    const controversyLevel = Math.floor(rng() * 5);
    const controversyCount = Math.floor(rng() * 4);
    const controversies = Array.from({ length: controversyCount }, () => {
      const type = CONTROVERSY_TYPES[Math.floor(rng() * CONTROVERSY_TYPES.length)];
      const severity = ['Low', 'Medium', 'High', 'Critical'][Math.floor(rng() * 4)];
      const daysAgo = Math.floor(rng() * 180);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return { type, severity, date: d.toISOString().slice(0, 10) };
    });

    const peerRank = Math.round(1 + rng() * 99);
    const trend = Array.from({ length: 4 }, (_, i) => ({
      quarter: `Q${4 - i} ${new Date().getFullYear() - (i > 1 ? 1 : 0)}`,
      total: Math.round(jitter(total, 0.05)),
      e: Math.round(jitter(c.baseE, 0.06)),
      s: Math.round(jitter(c.baseS, 0.06)),
      g: Math.round(jitter(c.baseG, 0.06)),
    })).reverse();

    return {
      ticker: c.ticker, name: c.name, sector: c.sector,
      scores: { environmental: e, social: s, governance: g, total },
      rating, carbonIntensity, controversyLevel, controversies,
      peerRank, trend,
    };
  });

  const sectorAverages = [...new Set(COMPANIES.map(c => c.sector))].map(sector => {
    const sectorCos = companies.filter(c => c.sector === sector);
    return {
      sector,
      avgTotal: Math.round(sectorCos.reduce((a, c) => a + c.scores.total, 0) / sectorCos.length),
      avgE: Math.round(sectorCos.reduce((a, c) => a + c.scores.environmental, 0) / sectorCos.length),
      avgS: Math.round(sectorCos.reduce((a, c) => a + c.scores.social, 0) / sectorCos.length),
      avgG: Math.round(sectorCos.reduce((a, c) => a + c.scores.governance, 0) / sectorCos.length),
      avgCarbon: Math.round(sectorCos.reduce((a, c) => a + c.carbonIntensity, 0) / sectorCos.length * 10) / 10,
      count: sectorCos.length,
    };
  });

  const ratingDist = ratings.map(r => ({ rating: r, count: companies.filter(c => c.rating === r).length }));

  return { companies, sectorAverages, ratingDist, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ESGRatings] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate ESG ratings data' });
  }
});

export default router;
