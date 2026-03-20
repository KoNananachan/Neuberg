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

const PRESET_INDICES = [
  {
    id: 'mega-cap-tech', name: 'Mega-Cap Tech', description: 'Top 6 technology companies by market cap',
    components: [
      { ticker: 'AAPL', name: 'Apple', weight: 22, sector: 'Technology' },
      { ticker: 'MSFT', name: 'Microsoft', weight: 21, sector: 'Technology' },
      { ticker: 'NVDA', name: 'NVIDIA', weight: 19, sector: 'Technology' },
      { ticker: 'GOOGL', name: 'Alphabet', weight: 15, sector: 'Technology' },
      { ticker: 'AMZN', name: 'Amazon', weight: 13, sector: 'Technology' },
      { ticker: 'META', name: 'Meta', weight: 10, sector: 'Technology' },
    ],
  },
  {
    id: 'dividend-kings', name: 'Dividend Kings', description: '25+ years consecutive dividend increases',
    components: [
      { ticker: 'JNJ', name: 'Johnson & Johnson', weight: 15, sector: 'Healthcare' },
      { ticker: 'PG', name: 'Procter & Gamble', weight: 15, sector: 'Consumer Staples' },
      { ticker: 'KO', name: 'Coca-Cola', weight: 14, sector: 'Consumer Staples' },
      { ticker: 'MMM', name: '3M', weight: 12, sector: 'Industrials' },
      { ticker: 'EMR', name: 'Emerson Electric', weight: 12, sector: 'Industrials' },
      { ticker: 'CL', name: 'Colgate-Palmolive', weight: 11, sector: 'Consumer Staples' },
      { ticker: 'SWK', name: 'Stanley Black & Decker', weight: 10, sector: 'Industrials' },
      { ticker: 'LOW', name: "Lowe's", weight: 11, sector: 'Consumer Disc.' },
    ],
  },
  {
    id: 'financials-core', name: 'Financials Core', description: 'Major US financial institutions',
    components: [
      { ticker: 'JPM', name: 'JPMorgan', weight: 20, sector: 'Banks' },
      { ticker: 'BAC', name: 'Bank of America', weight: 15, sector: 'Banks' },
      { ticker: 'GS', name: 'Goldman Sachs', weight: 12, sector: 'Banks' },
      { ticker: 'MS', name: 'Morgan Stanley', weight: 10, sector: 'Banks' },
      { ticker: 'BRK.B', name: 'Berkshire Hathaway', weight: 18, sector: 'Insurance' },
      { ticker: 'V', name: 'Visa', weight: 13, sector: 'Payments' },
      { ticker: 'MA', name: 'Mastercard', weight: 12, sector: 'Payments' },
    ],
  },
  {
    id: 'clean-energy', name: 'Clean Energy', description: 'Renewable energy and EV leaders',
    components: [
      { ticker: 'TSLA', name: 'Tesla', weight: 22, sector: 'EV' },
      { ticker: 'ENPH', name: 'Enphase Energy', weight: 15, sector: 'Solar' },
      { ticker: 'FSLR', name: 'First Solar', weight: 14, sector: 'Solar' },
      { ticker: 'NEE', name: 'NextEra Energy', weight: 18, sector: 'Utilities' },
      { ticker: 'PLUG', name: 'Plug Power', weight: 8, sector: 'Hydrogen' },
      { ticker: 'SEDG', name: 'SolarEdge', weight: 10, sector: 'Solar' },
      { ticker: 'RUN', name: 'Sunrun', weight: 13, sector: 'Solar' },
    ],
  },
  {
    id: 'healthcare-biotech', name: 'Healthcare & Biotech', description: 'Major pharma and biotech',
    components: [
      { ticker: 'UNH', name: 'UnitedHealth', weight: 18, sector: 'Insurance' },
      { ticker: 'LLY', name: 'Eli Lilly', weight: 17, sector: 'Pharma' },
      { ticker: 'ABBV', name: 'AbbVie', weight: 14, sector: 'Pharma' },
      { ticker: 'MRK', name: 'Merck', weight: 13, sector: 'Pharma' },
      { ticker: 'TMO', name: 'Thermo Fisher', weight: 12, sector: 'Life Sciences' },
      { ticker: 'AMGN', name: 'Amgen', weight: 13, sector: 'Biotech' },
      { ticker: 'GILD', name: 'Gilead', weight: 13, sector: 'Biotech' },
    ],
  },
];

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-custom-index'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const indices = PRESET_INDICES.map(idx => {
    const baseLevel = 1000 + rng() * 4000;
    const components = idx.components.map(c => {
      const price = Math.round(jitter(100 + rng() * 400, 0.05) * 100) / 100;
      const change1d = Math.round((rng() - 0.48) * 4 * 100) / 100;
      const change1w = Math.round((rng() - 0.45) * 8 * 100) / 100;
      const change1m = Math.round((rng() - 0.42) * 15 * 100) / 100;
      const changeYtd = Math.round((rng() - 0.35) * 40 * 100) / 100;
      const volume = Math.round(jitter(5e6, 0.5));
      const contribution1d = Math.round(change1d * c.weight / 100 * 100) / 100;

      return {
        ...c,
        price, change1d, change1w, change1m, changeYtd, volume, contribution1d,
        beta: Math.round((0.6 + rng() * 1.2) * 100) / 100,
        correlation: Math.round((0.3 + rng() * 0.65) * 100) / 100,
      };
    });

    const indexChange1d = Math.round(components.reduce((a, c) => a + c.contribution1d, 0) * 100) / 100;
    const indexChange1dPct = Math.round(indexChange1d / baseLevel * 10000 * 100) / 100;
    const indexChangeYtd = Math.round(components.reduce((a, c) => a + c.changeYtd * c.weight / 100, 0) * 100) / 100;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        level: Math.round(jitter(baseLevel, 0.02) * 100) / 100,
      };
    });

    const sectorBreakdown: Record<string, number> = {};
    for (const c of components) {
      sectorBreakdown[c.sector] = (sectorBreakdown[c.sector] || 0) + c.weight;
    }

    return {
      id: idx.id,
      name: idx.name,
      description: idx.description,
      level: Math.round(baseLevel * 100) / 100,
      change1d: indexChange1d,
      change1dPct: indexChange1dPct,
      changeYtd: indexChangeYtd,
      components,
      history,
      sectorBreakdown: Object.entries(sectorBreakdown).map(([sector, weight]) => ({ sector, weight })),
      stats: {
        sharpeRatio: Math.round((0.5 + rng() * 2) * 100) / 100,
        volatility: Math.round((10 + rng() * 20) * 100) / 100,
        maxDrawdown: Math.round((-5 - rng() * 30) * 100) / 100,
        beta: Math.round((0.7 + rng() * 0.8) * 100) / 100,
        trackingError: Math.round((1 + rng() * 8) * 100) / 100,
        infoRatio: Math.round((rng() - 0.3) * 2 * 100) / 100,
      },
    };
  });

  return { indices, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CustomIndex] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate custom index data' });
  }
});

export default router;
