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

// Pipeline borrowers with PE sponsors and sectors
const PIPELINE_BORROWERS = [
  { borrower: 'Medline Industries', sponsor: 'Blackstone', sector: 'Healthcare' },
  { borrower: 'Finastra', sponsor: 'Vista Equity Partners', sector: 'Fintech' },
  { borrower: 'Asurion', sponsor: 'Corporate', sector: 'Insurance Services' },
  { borrower: 'Infor', sponsor: 'Koch Equity Development', sector: 'Enterprise Software' },
  { borrower: 'SS&C Technologies', sponsor: 'Corporate', sector: 'Financial Technology' },
  { borrower: 'Dun & Bradstreet', sponsor: 'Clearlake Capital', sector: 'Data & Analytics' },
  { borrower: 'Epicor Software', sponsor: 'Clayton Dubilier & Rice', sector: 'Enterprise Software' },
  { borrower: 'Cloudera', sponsor: 'Clayton Dubilier & Rice', sector: 'Data Infrastructure' },
  { borrower: 'Solera', sponsor: 'Vista Equity Partners', sector: 'Insurance Technology' },
  { borrower: 'Veritas Technologies', sponsor: 'Carlyle Group', sector: 'Data Management' },
  { borrower: 'Cotiviti', sponsor: 'Veritas Capital', sector: 'Healthcare IT' },
  { borrower: 'Athenahealth', sponsor: 'Bain Capital', sector: 'Healthcare IT' },
  { borrower: 'McAfee', sponsor: 'Advent International', sector: 'Cybersecurity' },
  { borrower: 'Zendesk', sponsor: 'Hellman & Friedman', sector: 'SaaS' },
  { borrower: 'Worldpay', sponsor: 'GTCR', sector: 'Payments' },
  { borrower: 'Qualtrics', sponsor: 'Silver Lake', sector: 'Software' },
];

// Recently priced deal templates
const PRICED_DEAL_TEMPLATES = [
  { borrower: 'Ceridian HCM', sponsor: 'Thomas H. Lee Partners', sector: 'HR Technology' },
  { borrower: 'Alteryx', sponsor: 'Clearlake Capital', sector: 'Analytics' },
  { borrower: 'Avalara', sponsor: 'Vista Equity Partners', sector: 'Tax Software' },
  { borrower: 'Citrix Systems', sponsor: 'Vista Equity Partners', sector: 'Technology' },
  { borrower: 'RealPage', sponsor: 'Thoma Bravo', sector: 'PropTech' },
  { borrower: 'Cornerstone OnDemand', sponsor: 'Clearlake Capital', sector: 'HR Software' },
  { borrower: 'Apttus (Conga)', sponsor: 'Thoma Bravo', sector: 'Revenue Management' },
  { borrower: 'Coupa Software', sponsor: 'Thoma Bravo', sector: 'Procurement' },
  { borrower: 'Anaplan', sponsor: 'Thoma Bravo', sector: 'Planning Software' },
  { borrower: 'ForgeRock', sponsor: 'Thoma Bravo', sector: 'Identity Management' },
  { borrower: 'Ping Identity', sponsor: 'Thoma Bravo', sector: 'Cybersecurity' },
  { borrower: 'Sailpoint Technologies', sponsor: 'Thoma Bravo', sector: 'Identity Security' },
];

// Calendar launch templates
const CALENDAR_TEMPLATES = [
  { borrower: 'Proofpoint', sponsor: 'Thoma Bravo', sector: 'Cybersecurity' },
  { borrower: 'Aprio', sponsor: 'Charlesbank Capital', sector: 'Professional Services' },
  { borrower: 'LogRhythm', sponsor: 'Thoma Bravo', sector: 'Security Analytics' },
  { borrower: 'Imperva', sponsor: 'Thales Group', sector: 'Cybersecurity' },
  { borrower: 'Ivanti', sponsor: 'Clearlake Capital', sector: 'IT Management' },
  { borrower: 'BMC Software', sponsor: 'KKR', sector: 'Enterprise IT' },
  { borrower: 'Hyland Software', sponsor: 'Thoma Bravo', sector: 'Content Services' },
  { borrower: 'Planview', sponsor: 'Thoma Bravo', sector: 'Project Management' },
  { borrower: 'DigiCert', sponsor: 'Clearlake Capital', sector: 'Digital Security' },
  { borrower: 'SolarWinds', sponsor: 'Silver Lake', sector: 'IT Management' },
];

const FACILITIES = ['Term Loan B', 'Term Loan B-2', 'Revolver', 'Delayed Draw TL', 'First Lien TL', 'Second Lien TL'];
const STATUSES: ('launched' | 'priced' | 'allocated' | 'closed')[] = ['launched', 'priced', 'allocated', 'closed'];
const RATINGS_B = ['B3/B-', 'B2/B', 'B1/B+'];
const RATINGS_BB = ['Ba3/BB-', 'Ba2/BB', 'Ba1/BB+'];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-loan-syndication-pipeline'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Helper to pick from array
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // Helper to generate a date string offset from today
  const dateOffset = (daysBack: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().slice(0, 10);
  };

  const dateFuture = (daysForward: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysForward);
    return d.toISOString().slice(0, 10);
  };

  // --- Pipeline: active loans in syndication ---
  const shuffledBorrowers = [...PIPELINE_BORROWERS].sort(() => rng() - 0.5);
  const pipeline = shuffledBorrowers.slice(0, 12).map(b => {
    const isLeveraged = b.sponsor !== 'Corporate';
    const ratingPool = isLeveraged ? RATINGS_B : RATINGS_BB;
    const rating = pick(ratingPool);
    const isBRated = rating.startsWith('B') && !rating.startsWith('Ba');

    // Spreads: 250-450 bps for B-rated, 175-300 bps for BB-rated
    const spread = isBRated
      ? Math.round(250 + rng() * 200)
      : Math.round(175 + rng() * 125);

    // OID: 97.0-99.5
    const oid = Math.round((97.0 + rng() * 2.5) * 100) / 100;

    // Deal sizes: $500M-$5B
    const amount = Math.round(500 + rng() * 4500);

    const facility = pick(FACILITIES);
    const status = pick(STATUSES);
    const launchDaysBack = Math.floor(1 + rng() * 14);
    const launchDate = dateOffset(launchDaysBack);
    const pricingDaysBack = status === 'launched' ? null : Math.floor(rng() * launchDaysBack);
    const pricingDate = pricingDaysBack !== null ? dateOffset(pricingDaysBack) : null;

    return {
      borrower: b.borrower,
      sponsor: isLeveraged ? b.sponsor : null,
      amount,
      facility,
      spread,
      oid,
      rating,
      sector: b.sector,
      status,
      launchDate,
      pricingDate,
    };
  });

  // --- Stats: pipeline statistics ---
  const totalVolume = pipeline.reduce((sum, d) => sum + d.amount, 0);
  const numberOfDeals = pipeline.length;
  const avgSpread = Math.round(pipeline.reduce((sum, d) => sum + d.spread, 0) / numberOfDeals);
  const avgOID = Math.round(pipeline.reduce((sum, d) => sum + d.oid, 0) / numberOfDeals * 100) / 100;
  // Oversubscription rate: 1.5x-4.0x
  const oversubscriptionRate = Math.round((1.5 + rng() * 2.5) * 10) / 10;

  const stats = {
    totalVolume,
    numberOfDeals,
    avgSpread,
    avgOID,
    oversubscriptionRate,
    ytdVolume: Math.round(jitter(285, 0.08) * 10) / 10,
    ytdDealCount: Math.round(jitter(142, 0.1)),
    leveragedPct: Math.round(jitter(72, 0.06) * 10) / 10,
    investmentGradePct: Math.round(jitter(28, 0.06) * 10) / 10,
  };

  // --- Recently Priced: last 10 priced deals ---
  const shuffledPriced = [...PRICED_DEAL_TEMPLATES].sort(() => rng() - 0.5);
  const recentlyPriced = shuffledPriced.slice(0, 10).map(d => {
    const isBRated = rng() > 0.35;
    const rating = isBRated ? pick(RATINGS_B) : pick(RATINGS_BB);

    const guidanceSpreadLow = isBRated
      ? Math.round(275 + rng() * 150)
      : Math.round(185 + rng() * 100);
    const guidanceSpreadHigh = guidanceSpreadLow + Math.round(25 + rng() * 25);

    // Final pricing can tighten or widen vs guidance
    const tightenBps = Math.round((rng() - 0.3) * 40);
    const finalSpread = Math.max(guidanceSpreadLow - tightenBps, 150);

    const guidanceOIDLow = Math.round((97.0 + rng() * 1.5) * 100) / 100;
    const guidanceOIDHigh = Math.round((guidanceOIDLow + 0.5 + rng() * 1.0) * 100) / 100;
    const finalOID = Math.round((guidanceOIDHigh + (rng() - 0.3) * 0.5) * 100) / 100;

    const amount = Math.round(500 + rng() * 4500);
    // Oversubscription: 1.5x-4.0x
    const oversubscription = Math.round((1.5 + rng() * 2.5) * 10) / 10;

    const pricedDaysBack = Math.floor(1 + rng() * 10);

    return {
      borrower: d.borrower,
      sponsor: d.sponsor,
      sector: d.sector,
      amount,
      rating,
      guidanceSpread: `${guidanceSpreadLow}-${guidanceSpreadHigh}`,
      finalSpread,
      guidanceOID: `${guidanceOIDLow}-${guidanceOIDHigh}`,
      finalOID,
      oversubscription,
      pricingDate: dateOffset(pricedDaysBack),
      facility: pick(FACILITIES),
    };
  });

  // --- Market Color: current market indicators ---
  const marketColor = {
    clearingSpreadByRating: {
      'Ba1/BB+': Math.round(jitter(185, 0.06)),
      'Ba2/BB': Math.round(jitter(215, 0.06)),
      'Ba3/BB-': Math.round(jitter(250, 0.06)),
      'B1/B+': Math.round(jitter(295, 0.06)),
      'B2/B': Math.round(jitter(350, 0.06)),
      'B3/B-': Math.round(jitter(420, 0.06)),
    },
    investorDemand: {
      level: rng() > 0.6 ? 'Strong' : rng() > 0.3 ? 'Moderate' : 'Soft',
      cloFormation: Math.round(jitter(32, 0.12) * 10) / 10,
      retailFundFlows: Math.round((rng() - 0.4) * 2.5 * 100) / 100,
      separateAccountDemand: rng() > 0.5 ? 'Active' : 'Selective',
    },
    flexActivity: {
      tightenCount: Math.round(jitter(8, 0.2)),
      widenCount: Math.round(jitter(3, 0.25)),
      avgTightenBps: Math.round(jitter(20, 0.15)),
      avgWidenBps: Math.round(jitter(30, 0.2)),
      recentFlexes: Array.from({ length: 4 }, () => {
        const direction = rng() > 0.35 ? 'tighten' : 'widen';
        const bps = direction === 'tighten'
          ? Math.round(10 + rng() * 25)
          : Math.round(15 + rng() * 35);
        return {
          borrower: pick(shuffledBorrowers).borrower,
          direction,
          bps,
          component: rng() > 0.5 ? 'spread' : 'OID',
        };
      }),
    },
    technicals: {
      sofrRate: Math.round(jitter(5.33, 0.02) * 100) / 100,
      lsta100Price: Math.round(jitter(96.8, 0.008) * 100) / 100,
      lsta100Spread: Math.round(jitter(348, 0.04)),
      trailingDefaultRate: Math.round(jitter(1.6, 0.15) * 100) / 100,
    },
  };

  // --- Calendar: upcoming syndication launches for next 2 weeks ---
  const shuffledCalendar = [...CALENDAR_TEMPLATES].sort(() => rng() - 0.5);
  const calendar = shuffledCalendar.slice(0, 8).map(c => {
    const daysForward = Math.floor(1 + rng() * 13);
    const isBRated = rng() > 0.4;
    const rating = isBRated ? pick(RATINGS_B) : pick(RATINGS_BB);

    const expectedSpreadLow = isBRated
      ? Math.round(270 + rng() * 160)
      : Math.round(180 + rng() * 110);
    const expectedSpreadHigh = expectedSpreadLow + Math.round(20 + rng() * 30);

    const amount = Math.round(500 + rng() * 4500);

    return {
      borrower: c.borrower,
      sponsor: c.sponsor,
      sector: c.sector,
      amount,
      facility: pick(FACILITIES),
      expectedSpread: `${expectedSpreadLow}-${expectedSpreadHigh}`,
      rating,
      expectedLaunchDate: dateFuture(daysForward),
      bookrunners: pickBookrunners(rng),
      purpose: pick(['LBO Financing', 'Refinancing', 'Dividend Recap', 'Add-on Acquisition', 'Repricing']),
    };
  }).sort((a, b) => a.expectedLaunchDate.localeCompare(b.expectedLaunchDate));

  return {
    pipeline,
    stats,
    recentlyPriced,
    marketColor,
    calendar,
    generatedAt: new Date().toISOString(),
  };
}

// Helper to pick 2-4 bookrunner banks
function pickBookrunners(rng: () => number): string[] {
  const banks = [
    'JP Morgan', 'Goldman Sachs', 'Bank of America', 'Morgan Stanley',
    'Barclays', 'Citigroup', 'Deutsche Bank', 'Credit Suisse',
    'Wells Fargo', 'RBC Capital Markets', 'Jefferies', 'BMO Capital Markets',
  ];
  const count = 2 + Math.floor(rng() * 3);
  const shuffled = [...banks].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[LoanSyndicationPipeline] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate loan syndication pipeline data' });
  }
});

export default router;
