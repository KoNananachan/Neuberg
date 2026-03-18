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

const ISSUERS = [
  'Apple Inc', 'Microsoft Corp', 'Amazon.com Inc', 'JPMorgan Chase', 'Goldman Sachs',
  'Bank of America', 'Citigroup', 'Wells Fargo', 'Morgan Stanley', 'AT&T Inc',
  'Verizon Comms', 'Toyota Motor', 'Volkswagen AG', 'BMW Finance', 'TotalEnergies',
  'BP Capital', 'Shell International', 'Nestle Holdings', 'Unilever Capital',
  'Procter & Gamble', 'Johnson & Johnson', 'Pfizer Inc', 'Berkshire Hathaway',
  'Meta Platforms', 'Alphabet Inc', 'NVIDIA Corp', 'Intel Corp',
  'Republic of Italy', 'Kingdom of Spain', 'Republic of France', 'Federal Republic of Germany',
  'United Kingdom', 'Republic of Korea', 'United Mexican States', 'Republic of Brazil',
];

const DEAL_TYPES = ['Investment Grade', 'High Yield', 'Sovereign', 'Supranational', 'Emerging Market', 'Leveraged Loan', 'Convertible'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'];
const STRUCTURES = ['Fixed Rate', 'Floating Rate', 'Zero Coupon', 'Callable', 'Puttable', 'Green Bond', 'Sustainability-Linked'];
const LEAD_MANAGERS = ['JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'BofA Securities', 'Citi', 'Barclays', 'Deutsche Bank', 'HSBC', 'BNP Paribas', 'UBS'];
const RATINGS_MAP = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'B+', 'B', 'NR'];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-debt-issuance'));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const dealCount = 15 + Math.floor(rng() * 10);
  const deals = Array.from({ length: dealCount }, (_, idx) => {
    const issuer = pick(ISSUERS);
    const dealType = pick(DEAL_TYPES);
    const currency = pick(CURRENCIES);
    const structure = pick(STRUCTURES);
    const maturityYears = [2, 3, 5, 7, 10, 15, 20, 30][Math.floor(rng() * 8)];
    const size = Math.round((100 + rng() * 4900) / 50) * 50;
    const coupon = Math.round((1.5 + rng() * 6.5) * 100) / 100;
    const spread = Math.round(30 + rng() * 350);
    const benchmark = maturityYears <= 5 ? `${maturityYears}Y Treasury` : `${maturityYears}Y UST`;
    const initialPriceThoughts = `T+${Math.round(spread + 15 + rng() * 20)}`;
    const finalSpread = `T+${spread}`;
    const rating = pick(RATINGS_MAP);
    const bookSize = Math.round(size * (1.5 + rng() * 4));
    const oversubscription = Math.round((bookSize / size) * 10) / 10;
    const leadManagers = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => pick(LEAD_MANAGERS));
    const uniqueManagers = [...new Set(leadManagers)];

    const daysAgo = Math.floor(rng() * 14);
    const pricingDate = new Date();
    pricingDate.setDate(pricingDate.getDate() - daysAgo);
    const maturityDate = new Date(pricingDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + maturityYears);

    const status = daysAgo === 0 ? 'Pricing Today' : daysAgo <= 1 ? 'Just Priced' : daysAgo <= 3 ? 'Recently Priced' : 'Priced';

    return {
      id: idx + 1, issuer, dealType, currency, structure, maturityYears,
      size, coupon, spread, benchmark, initialPriceThoughts, finalSpread,
      rating, bookSize, oversubscription, leadManagers: uniqueManagers,
      pricingDate: pricingDate.toISOString().slice(0, 10),
      maturityDate: maturityDate.toISOString().slice(0, 10),
      status,
    };
  }).sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime());

  const pipeline = Array.from({ length: 5 + Math.floor(rng() * 5) }, (_, idx) => ({
    id: dealCount + idx + 1,
    issuer: pick(ISSUERS),
    dealType: pick(DEAL_TYPES),
    currency: pick(CURRENCIES),
    expectedSize: `${Math.round((200 + rng() * 3000) / 100) * 100}`,
    expectedTiming: ['This Week', 'Next Week', '2-3 Weeks', 'This Month'][Math.floor(rng() * 4)],
    rating: pick(RATINGS_MAP),
    status: 'Mandated',
  }));

  const volumeByType = DEAL_TYPES.map(t => {
    const typeDeals = deals.filter(d => d.dealType === t);
    return { type: t, count: typeDeals.length, volume: typeDeals.reduce((a, d) => a + d.size, 0) };
  }).filter(v => v.count > 0).sort((a, b) => b.volume - a.volume);

  const volumeByCurrency = CURRENCIES.map(c => {
    const cDeals = deals.filter(d => d.currency === c);
    return { currency: c, count: cDeals.length, volume: cDeals.reduce((a, d) => a + d.size, 0) };
  }).filter(v => v.count > 0).sort((a, b) => b.volume - a.volume);

  const weeklyVolume = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (11 - i) * 7);
    return {
      week: d.toISOString().slice(0, 10),
      igVolume: Math.round(jitter(15000, 0.25)),
      hyVolume: Math.round(jitter(4000, 0.3)),
      leveragedLoan: Math.round(jitter(6000, 0.3)),
    };
  });

  const summary = {
    totalDeals: deals.length,
    totalVolume: deals.reduce((a, d) => a + d.size, 0),
    avgOversubscription: Math.round(deals.reduce((a, d) => a + d.oversubscription, 0) / deals.length * 10) / 10,
    pipelineCount: pipeline.length,
    todayPricing: deals.filter(d => d.status === 'Pricing Today').length,
  };

  return { deals, pipeline, volumeByType, volumeByCurrency, weeklyVolume, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DebtIssuance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate debt issuance data' });
  }
});

export default router;
