import { Router } from 'express';

const router = Router();

// ── Types ──

interface FngApiEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FngApiResponse {
  data: FngApiEntry[];
}

interface FearGreedCurrent {
  value: number;
  classification: string;
  timestamp: string;
}

interface FearGreedHistory {
  value: number;
  classification: string;
  date: string;
}

interface FearGreedData {
  current: FearGreedCurrent;
  history: FearGreedHistory[];
}

// ── In-memory cache (15min TTL) ──

let cache: { data: FearGreedData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ── Route ──

// GET /api/fear-greed
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const response = await fetch('https://api.alternative.me/fng/?limit=30&format=json');
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const json = (await response.json()) as FngApiResponse;

    if (!json.data || json.data.length === 0) {
      throw new Error('No data returned from Fear & Greed API');
    }

    const current: FearGreedCurrent = {
      value: parseInt(json.data[0].value, 10),
      classification: json.data[0].value_classification,
      timestamp: new Date(parseInt(json.data[0].timestamp, 10) * 1000).toISOString(),
    };

    const history: FearGreedHistory[] = json.data.map((entry) => ({
      value: parseInt(entry.value, 10),
      classification: entry.value_classification,
      date: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString().split('T')[0],
    }));

    const data: FearGreedData = { current, history };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FearGreed] Error fetching data:', message);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to fetch Fear & Greed Index' });
  }
});

export default router;
