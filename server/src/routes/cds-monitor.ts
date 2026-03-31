import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface EntitySeed {
  entity: string;
  rating: string;
  spread1yBase: number;
  spread3yBase: number;
  spread5yBase: number;
  spread10yBase: number;
  recoveryRate: number;
}

interface SingleNameCds {
  entity: string;
  rating: string;
  spread1y: number;
  spread3y: number;
  spread5y: number;
  spread10y: number;
  change1d: number;
  change1w: number;
  recoveryRate: number;
  impliedDefaultProb: number;
}

interface IndexCds {
  name: string;
  level: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface MarketSummary {
  avgIgSpread: number;
  avgHySpread: number;
  widestIg: { entity: string; spread5y: number };
  tightestIg: { entity: string; spread5y: number };
  mostActive: string;
}

interface CreditEvent {
  entity: string;
  eventType: string;
  date: string;
  description: string;
  recoveryRate: number;
}

// ── Seed Data ──

const ENTITY_SEEDS: EntitySeed[] = [
  // Banks
  { entity: 'JPMorgan',         rating: 'A+',   spread1yBase: 25,  spread3yBase: 40,  spread5yBase: 55,  spread10yBase: 72,  recoveryRate: 40 },
  { entity: 'Goldman Sachs',    rating: 'A+',   spread1yBase: 32,  spread3yBase: 48,  spread5yBase: 65,  spread10yBase: 82,  recoveryRate: 40 },
  { entity: 'Bank of America',  rating: 'A',    spread1yBase: 28,  spread3yBase: 44,  spread5yBase: 60,  spread10yBase: 78,  recoveryRate: 40 },
  { entity: 'Citigroup',        rating: 'A',    spread1yBase: 35,  spread3yBase: 52,  spread5yBase: 68,  spread10yBase: 88,  recoveryRate: 40 },
  { entity: 'Morgan Stanley',   rating: 'A',    spread1yBase: 30,  spread3yBase: 46,  spread5yBase: 62,  spread10yBase: 80,  recoveryRate: 40 },
  { entity: 'Deutsche Bank',    rating: 'BBB+', spread1yBase: 55,  spread3yBase: 78,  spread5yBase: 95,  spread10yBase: 115, recoveryRate: 40 },
  { entity: 'Barclays',         rating: 'A',    spread1yBase: 38,  spread3yBase: 55,  spread5yBase: 72,  spread10yBase: 90,  recoveryRate: 40 },
  { entity: 'HSBC',             rating: 'A+',   spread1yBase: 22,  spread3yBase: 36,  spread5yBase: 48,  spread10yBase: 62,  recoveryRate: 40 },
  // Corporates
  { entity: 'Ford Motor',       rating: 'BB+',  spread1yBase: 95,  spread3yBase: 145, spread5yBase: 190, spread10yBase: 235, recoveryRate: 35 },
  { entity: 'General Electric', rating: 'BBB+', spread1yBase: 42,  spread3yBase: 62,  spread5yBase: 80,  spread10yBase: 98,  recoveryRate: 40 },
  { entity: 'AT&T',             rating: 'BBB',  spread1yBase: 58,  spread3yBase: 85,  spread5yBase: 112, spread10yBase: 138, recoveryRate: 40 },
  { entity: 'Verizon',          rating: 'BBB+', spread1yBase: 45,  spread3yBase: 68,  spread5yBase: 88,  spread10yBase: 108, recoveryRate: 40 },
  { entity: 'Apple',            rating: 'AA+',  spread1yBase: 12,  spread3yBase: 22,  spread5yBase: 32,  spread10yBase: 42,  recoveryRate: 40 },
  { entity: 'Tesla',            rating: 'BBB-', spread1yBase: 72,  spread3yBase: 108, spread5yBase: 140, spread10yBase: 172, recoveryRate: 35 },
  { entity: 'Meta',             rating: 'AA-',  spread1yBase: 18,  spread3yBase: 30,  spread5yBase: 42,  spread10yBase: 55,  recoveryRate: 40 },
];

const INDEX_SEEDS = [
  { name: 'CDX IG',            levelBase: 58  },
  { name: 'CDX HY',            levelBase: 395 },
  { name: 'iTraxx Europe',     levelBase: 62  },
  { name: 'iTraxx Crossover',  levelBase: 320 },
  { name: 'iTraxx Asia',       levelBase: 88  },
];

const CREDIT_EVENT_POOL = [
  { entity: 'Bed Bath & Beyond',   eventType: 'Bankruptcy',      description: 'Chapter 11 filing after failed turnaround; liquidation of all stores', recoveryBase: 3.2 },
  { entity: 'Silicon Valley Bank',  eventType: 'Failure to Pay',  description: 'FDIC receivership following deposit run and HTM portfolio losses', recoveryBase: 72.0 },
  { entity: 'Yellow Corporation',   eventType: 'Bankruptcy',      description: 'Trucking firm ceases operations amid Teamsters dispute and debt load', recoveryBase: 12.5 },
  { entity: 'Rite Aid Corp',        eventType: 'Bankruptcy',      description: 'Chapter 11 filing under $8.6B debt burden; store closures accelerate', recoveryBase: 5.8 },
  { entity: 'Envision Healthcare',  eventType: 'Restructuring',   description: 'Distressed exchange on $7B debt; KKR-backed entity negotiates with creditors', recoveryBase: 22.0 },
  { entity: 'Diamond Sports Group', eventType: 'Bankruptcy',      description: 'Regional sports network operator files Ch 11 amid cord-cutting pressure', recoveryBase: 8.5 },
  { entity: 'Mallinckrodt Pharma',  eventType: 'Restructuring',   description: 'Second restructuring to address opioid settlement liabilities', recoveryBase: 18.0 },
  { entity: 'Cineworld Group',      eventType: 'Restructuring',   description: 'Cinema chain emerges from Ch 11 with reduced debt and lease obligations', recoveryBase: 31.0 },
];

// ── Cache ──

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

const IG_RATINGS = new Set(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']);

function isIgRating(rating: string): boolean {
  return IG_RATINGS.has(rating);
}

// ── Generator ──

function generate() {
  const seed = hashSeed('cds-monitor-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);

  const jitter = (base: number, pct: number): number => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  const round1 = (v: number): number => Math.round(v * 10) / 10;

  // ── Single-Name CDS ──
  const singleName: SingleNameCds[] = ENTITY_SEEDS.map(s => {
    const spread1y = round1(jitter(s.spread1yBase, 0.10));
    const spread3y = round1(jitter(s.spread3yBase, 0.09));
    const spread5y = round1(jitter(s.spread5yBase, 0.08));
    const spread10y = round1(jitter(s.spread10yBase, 0.08));

    const change1d = round1((rng() - 0.48) * s.spread5yBase * 0.03);
    const change1w = round1((rng() - 0.46) * s.spread5yBase * 0.06);

    const recoveryRate = round1(jitter(s.recoveryRate, 0.03));

    // Implied default probability: CDS spread / (1 - recovery) annualized over 5Y horizon
    const impliedDefaultProb = round2(
      (spread5y / 10000) / (1 - s.recoveryRate / 100) * 5 * 100
    );

    return {
      entity: s.entity,
      rating: s.rating,
      spread1y,
      spread3y,
      spread5y,
      spread10y,
      change1d,
      change1w,
      recoveryRate,
      impliedDefaultProb,
    };
  });

  // ── Index CDS ──
  const indexCds: IndexCds[] = INDEX_SEEDS.map(idx => {
    const level = round1(jitter(idx.levelBase, 0.08));
    const change1d = round2((rng() - 0.48) * idx.levelBase * 0.02);
    const change1w = round2((rng() - 0.46) * idx.levelBase * 0.05);
    const change1m = round2((rng() - 0.44) * idx.levelBase * 0.10);

    return {
      name: idx.name,
      level,
      change1d,
      change1w,
      change1m,
    };
  });

  // ── Market Summary ──
  const igEntities = singleName.filter(s => isIgRating(s.rating));
  const hyEntities = singleName.filter(s => !isIgRating(s.rating));

  const avgIgSpread = igEntities.length > 0
    ? round1(igEntities.reduce((sum, e) => sum + e.spread5y, 0) / igEntities.length)
    : 0;
  const avgHySpread = hyEntities.length > 0
    ? round1(hyEntities.reduce((sum, e) => sum + e.spread5y, 0) / hyEntities.length)
    : 0;

  const igSorted = [...igEntities].sort((a, b) => b.spread5y - a.spread5y);
  const widestIg = igSorted[0]
    ? { entity: igSorted[0].entity, spread5y: igSorted[0].spread5y }
    : { entity: 'N/A', spread5y: 0 };
  const tightestIg = igSorted[igSorted.length - 1]
    ? { entity: igSorted[igSorted.length - 1].entity, spread5y: igSorted[igSorted.length - 1].spread5y }
    : { entity: 'N/A', spread5y: 0 };

  // Most active: pick the entity with the largest absolute daily change
  const sortedByActivity = [...singleName].sort(
    (a, b) => Math.abs(b.change1d) - Math.abs(a.change1d)
  );
  const mostActive = sortedByActivity[0]?.entity ?? 'N/A';

  const marketSummary: MarketSummary = {
    avgIgSpread,
    avgHySpread,
    widestIg,
    tightestIg,
    mostActive,
  };

  // ── Credit Events ──
  const today = new Date();
  const shuffled = [...CREDIT_EVENT_POOL].sort(() => rng() - 0.5);
  const selectedEvents = shuffled.slice(0, 5);

  const creditEvents: CreditEvent[] = selectedEvents.map((evt, i) => {
    const daysAgo = Math.floor(rng() * 90) + i * 7 + 1;
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() - daysAgo);

    return {
      entity: evt.entity,
      eventType: evt.eventType,
      date: eventDate.toISOString().slice(0, 10),
      description: evt.description,
      recoveryRate: round1(jitter(evt.recoveryBase, 0.12)),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  return {
    singleName,
    indexCds,
    marketSummary,
    creditEvents,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[CDSMonitor] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate CDS monitor data' });
  }
});

export default router;
