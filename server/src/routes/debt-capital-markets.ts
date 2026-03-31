import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();


let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

const ISSUERS = [
  { name: 'Apple Inc', ticker: 'AAPL', sector: 'Technology', ratingMoodys: 'Aaa', ratingSP: 'AA+' },
  { name: 'Microsoft Corp', ticker: 'MSFT', sector: 'Technology', ratingMoodys: 'Aaa', ratingSP: 'AAA' },
  { name: 'Amazon.com Inc', ticker: 'AMZN', sector: 'Technology', ratingMoodys: 'A1', ratingSP: 'AA' },
  { name: 'JPMorgan Chase & Co', ticker: 'JPM', sector: 'Financials', ratingMoodys: 'A1', ratingSP: 'A+' },
  { name: 'Goldman Sachs Group', ticker: 'GS', sector: 'Financials', ratingMoodys: 'A2', ratingSP: 'BBB+' },
  { name: 'AT&T Inc', ticker: 'T', sector: 'Telecom', ratingMoodys: 'Baa2', ratingSP: 'BBB' },
  { name: 'Verizon Communications', ticker: 'VZ', sector: 'Telecom', ratingMoodys: 'Baa1', ratingSP: 'BBB+' },
  { name: 'Bank of America Corp', ticker: 'BAC', sector: 'Financials', ratingMoodys: 'A1', ratingSP: 'A-' },
  { name: 'Wells Fargo & Co', ticker: 'WFC', sector: 'Financials', ratingMoodys: 'A1', ratingSP: 'A-' },
  { name: 'Toyota Motor Credit', ticker: 'TM', sector: 'Autos', ratingMoodys: 'A1', ratingSP: 'A+' },
  { name: 'Pfizer Inc', ticker: 'PFE', sector: 'Healthcare', ratingMoodys: 'A2', ratingSP: 'A' },
  { name: 'Johnson & Johnson', ticker: 'JNJ', sector: 'Healthcare', ratingMoodys: 'Aaa', ratingSP: 'AAA' },
] as const;

const STATUSES = ['PRICED', 'MARKETED', 'MANDATED'] as const;
const TENORS = [2, 3, 5, 7, 10, 20, 30] as const;
const BOOKRUNNER_BANKS = [
  'JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'BofA Securities', 'Citi',
  'Barclays', 'Deutsche Bank', 'HSBC', 'BNP Paribas', 'Wells Fargo Securities',
] as const;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('dcm-' + day));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const rand = (min: number, max: number) => min + rng() * (max - min);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Spread by Moody's rating tier
  const spreadForRating = (rating: string): number => {
    const ranges: Record<string, [number, number]> = {
      'Aaa': [35, 65], 'Aa1': [45, 75], 'Aa2': [50, 85], 'Aa3': [55, 95],
      'A1': [65, 110], 'A2': [80, 135], 'A3': [95, 155],
      'Baa1': [115, 175], 'Baa2': [135, 210], 'Baa3': [160, 250],
    };
    const range = ranges[rating] || [100, 170];
    return Math.round(range[0] + rng() * (range[1] - range[0]));
  };

  // --- New Issuance Pipeline ---
  const shuffled = [...ISSUERS].sort(() => rng() - 0.5);
  const pipeline = shuffled.map((issuer) => {
    const tenor = pick(TENORS);
    const spread = spreadForRating(issuer.ratingMoodys);
    const coupon = round2(3.0 + spread / 100 + (rng() - 0.5) * 0.6);
    const size = Math.round(rand(500, 4000) / 25) * 25;
    const status = pick(STATUSES);
    const bookrunner = pick(BOOKRUNNER_BANKS);

    const maturityYear = new Date().getFullYear() + tenor;
    const maturityDate = `${maturityYear}-${String(Math.floor(rand(1, 13))).padStart(2, '0')}-15`;

    return {
      issuer: issuer.name,
      ticker: issuer.ticker,
      sector: issuer.sector,
      ratingMoodys: issuer.ratingMoodys,
      ratingSP: issuer.ratingSP,
      sizeMM: size,
      coupon,
      maturity: maturityDate,
      tenor: `${tenor}Y`,
      spreadBps: spread,
      bookrunner,
      status,
    };
  });

  // --- Market Summary ---
  const igWTD = round2(rand(8, 25));
  const igMTD = round2(rand(30, 80));
  const igYTD = round2(rand(400, 750));
  const hyWTD = round2(rand(2, 10));
  const hyMTD = round2(rand(10, 35));
  const hyYTD = round2(rand(100, 280));
  const avgIGSpread = Math.round(rand(85, 145));
  const avgHYSpread = Math.round(rand(320, 480));
  const dealsPricedToday = Math.round(rand(3, 14));

  const marketSummary = {
    igNewIssueVolume: { wtdBn: igWTD, mtdBn: igMTD, ytdBn: igYTD },
    hyNewIssueVolume: { wtdBn: hyWTD, mtdBn: hyMTD, ytdBn: hyYTD },
    avgIGSpreadBps: avgIGSpread,
    avgHYSpreadBps: avgHYSpread,
    dealsPricedToday,
  };

  // --- Spread Trends ---
  const igIndex = Math.round(rand(90, 140));
  const hyIndex = Math.round(rand(340, 500));
  const igBB = Math.round(rand(160, 250));
  const change = (base: number) => ({
    current: base,
    change1D: Math.round(rand(-5, 5)),
    change1W: Math.round(rand(-12, 12)),
    change1M: Math.round(rand(-25, 25)),
  });

  const spreadTrends = {
    igIndexSpread: change(igIndex),
    hyIndexSpread: change(hyIndex),
    igBBSpread: change(igBB),
  };

  // --- Bookrunner League Table ---
  const leagueTable = BOOKRUNNER_BANKS.map((bank) => {
    const deals = Math.round(rand(15, 85));
    const volumeBn = round2(rand(8, 65));
    return { bank, deals, volumeBn, marketSharePct: 0 };
  }).sort((a, b) => b.volumeBn - a.volumeBn);

  const totalVolume = leagueTable.reduce((s, r) => s + r.volumeBn, 0);
  leagueTable.forEach((row) => {
    row.marketSharePct = round2((row.volumeBn / totalVolume) * 100);
  });

  return {
    pipeline,
    marketSummary,
    spreadTrends,
    bookrunnerLeagueTable: leagueTable,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[DCM] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate debt capital markets data' });
  }
});

export default router;
