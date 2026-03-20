import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Interfaces --

interface MarketOverview {
  totalGlobalSportsMediaRightsBillions: number;
  yearOverYearGrowthPct: number;
  liveSportsPremiumOverScriptedPct: number;
  totalFranchiseValuationsTrackedBillions: number;
  totalLeagueDealsTracked: number;
  streamingShareOfRightsPct: number;
}

interface LeagueMediaDeal {
  league: string;
  sport: string;
  currentDealTotalBillions: number;
  annualValueBillions: number;
  broadcasters: string[];
  contractPeriod: string;
  nextRenewalYear: number;
  yoyEscalationPct: number;
}

interface FranchiseValuation {
  team: string;
  league: string;
  estimatedValueBillions: number;
  revenueBillions: number;
  operatingIncomeMillions: number;
  owner: string;
  yoyValueChangePct: number;
}

interface StreamingPlatform {
  platform: string;
  sportsContentSpendBillions: number;
  subscribersMillions: number;
  keyRightsHeld: string[];
  liveEventHoursPerYear: number;
}

interface RecentDeal {
  title: string;
  parties: string[];
  valueBillions: number;
  date: string;
  premiumToPreviousDealPct: number;
  type: 'media-rights' | 'franchise-sale' | 'equity-stake';
}

interface RegionalBreakdown {
  region: string;
  shareOfGlobalRightsPct: number;
  estimatedValueBillions: number;
  keyDrivers: string[];
}

interface SportsMediaRightsResponse {
  marketOverview: MarketOverview;
  leagueMediaDeals: LeagueMediaDeal[];
  franchiseValuations: FranchiseValuation[];
  streamingWars: StreamingPlatform[];
  recentDeals: RecentDeal[];
  regionalBreakdown: RegionalBreakdown[];
  generatedAt: string;
}

// -- Seed Data --

const LEAGUE_DEAL_SEEDS = [
  { league: 'NFL', sport: 'American Football', baseTotalBillions: 113, contractYears: 11, broadcasters: ['ESPN/ABC', 'NBC', 'CBS', 'Fox', 'Amazon Prime Video'], contractPeriod: '2023-2033', nextRenewal: 2033, baseEscalation: 8.5 },
  { league: 'NBA', sport: 'Basketball', baseTotalBillions: 76, contractYears: 11, broadcasters: ['ESPN/ABC', 'NBC', 'Amazon Prime Video'], contractPeriod: '2025-2036', nextRenewal: 2036, baseEscalation: 12.0 },
  { league: 'English Premier League', sport: 'Soccer', baseTotalBillions: 8.4, contractYears: 3, broadcasters: ['Sky Sports', 'TNT Sports', 'Amazon Prime Video'], contractPeriod: '2025-2028', nextRenewal: 2028, baseEscalation: 5.0 },
  { league: 'La Liga', sport: 'Soccer', baseTotalBillions: 5.3, contractYears: 5, broadcasters: ['DAZN', 'Movistar+'], contractPeriod: '2022-2027', nextRenewal: 2027, baseEscalation: 3.8 },
  { league: 'Bundesliga', sport: 'Soccer', baseTotalBillions: 5.1, contractYears: 4, broadcasters: ['Sky Deutschland', 'DAZN'], contractPeriod: '2025-2029', nextRenewal: 2029, baseEscalation: 4.2 },
  { league: 'Serie A', sport: 'Soccer', baseTotalBillions: 4.5, contractYears: 5, broadcasters: ['DAZN', 'Sky Italia'], contractPeriod: '2024-2029', nextRenewal: 2029, baseEscalation: 3.5 },
  { league: 'MLB', sport: 'Baseball', baseTotalBillions: 12.4, contractYears: 7, broadcasters: ['ESPN', 'Fox', 'TBS/TNT', 'Apple TV+'], contractPeriod: '2022-2028', nextRenewal: 2028, baseEscalation: 4.8 },
  { league: 'NHL', sport: 'Ice Hockey', baseTotalBillions: 6.6, contractYears: 7, broadcasters: ['ESPN/ABC', 'TNT Sports'], contractPeriod: '2021-2028', nextRenewal: 2028, baseEscalation: 4.0 },
  { league: 'Formula 1', sport: 'Motorsport', baseTotalBillions: 1.1, contractYears: 1, broadcasters: ['ESPN', 'Sky Sports', 'DAZN', 'Canal+'], contractPeriod: '2025-2025 (annual)', nextRenewal: 2026, baseEscalation: 10.5 },
  { league: 'UFC/MMA', sport: 'Mixed Martial Arts', baseTotalBillions: 1.8, contractYears: 5, broadcasters: ['ESPN/ESPN+', 'DAZN'], contractPeriod: '2023-2028', nextRenewal: 2028, baseEscalation: 7.0 },
];

const FRANCHISE_VALUATION_SEEDS = [
  { team: 'Dallas Cowboys', league: 'NFL', baseValue: 9.2, baseRevenue: 1.14, baseOperatingIncome: 460, owner: 'Jerry Jones', baseYoYChange: 12.5 },
  { team: 'New York Yankees', league: 'MLB', baseValue: 7.1, baseRevenue: 0.71, baseOperatingIncome: 120, owner: 'Steinbrenner Family', baseYoYChange: 8.0 },
  { team: 'Real Madrid', league: 'La Liga', baseValue: 6.6, baseRevenue: 0.92, baseOperatingIncome: 155, owner: 'Florentino Perez (Socios)', baseYoYChange: 10.2 },
  { team: 'Manchester United', league: 'Premier League', baseValue: 6.3, baseRevenue: 0.78, baseOperatingIncome: 75, owner: 'INEOS / Glazer Family', baseYoYChange: 6.5 },
  { team: 'Golden State Warriors', league: 'NBA', baseValue: 7.7, baseRevenue: 0.77, baseOperatingIncome: 185, owner: 'Joe Lacob', baseYoYChange: 11.0 },
  { team: 'Paris Saint-Germain', league: 'Ligue 1', baseValue: 4.6, baseRevenue: 0.85, baseOperatingIncome: -45, owner: 'QSI (Nasser Al-Khelaifi)', baseYoYChange: 5.0 },
  { team: 'Bayern Munich', league: 'Bundesliga', baseValue: 5.0, baseRevenue: 0.87, baseOperatingIncome: 100, owner: 'FC Bayern eV (Member-owned)', baseYoYChange: 7.5 },
  { team: 'Scuderia Ferrari', league: 'Formula 1', baseValue: 4.8, baseRevenue: 0.52, baseOperatingIncome: 95, owner: 'Ferrari NV (RACE)', baseYoYChange: 18.0 },
  { team: 'Liverpool FC', league: 'Premier League', baseValue: 5.4, baseRevenue: 0.72, baseOperatingIncome: 85, owner: 'Fenway Sports Group', baseYoYChange: 9.0 },
  { team: 'New York Knicks', league: 'NBA', baseValue: 7.5, baseRevenue: 0.58, baseOperatingIncome: 175, owner: 'James Dolan (MSG)', baseYoYChange: 13.0 },
  { team: 'Los Angeles Lakers', league: 'NBA', baseValue: 7.1, baseRevenue: 0.56, baseOperatingIncome: 160, owner: 'Buss Family Trust', baseYoYChange: 10.5 },
  { team: 'FC Barcelona', league: 'La Liga', baseValue: 5.6, baseRevenue: 0.90, baseOperatingIncome: 20, owner: 'Joan Laporta (Socios)', baseYoYChange: 8.5 },
  { team: 'Manchester City', league: 'Premier League', baseValue: 5.1, baseRevenue: 0.82, baseOperatingIncome: 110, owner: 'City Football Group (Sheikh Mansour)', baseYoYChange: 11.5 },
  { team: 'Los Angeles Dodgers', league: 'MLB', baseValue: 5.5, baseRevenue: 0.64, baseOperatingIncome: 130, owner: 'Guggenheim Baseball', baseYoYChange: 9.5 },
  { team: 'Las Vegas Raiders', league: 'NFL', baseValue: 6.2, baseRevenue: 0.60, baseOperatingIncome: 145, owner: 'Mark Davis', baseYoYChange: 14.0 },
];

const STREAMING_PLATFORM_SEEDS = [
  { platform: 'ESPN+', baseSpend: 3.5, baseSubscribers: 26, keyRights: ['UFC', 'NHL (select)', 'MLB (select)', 'La Liga', 'F1', 'PGA Tour', 'College Sports'], baseLiveHours: 25000 },
  { platform: 'Peacock (NBC)', baseSpend: 2.8, baseSubscribers: 35, keyRights: ['NFL Sunday Night', 'Premier League', 'Olympics', 'NASCAR', 'WWE'], baseLiveHours: 12000 },
  { platform: 'Paramount+ (CBS)', baseSpend: 2.2, baseSubscribers: 72, keyRights: ['NFL (AFC)', 'UEFA Champions League', 'Serie A', 'NWSL', 'PGA Championship', 'March Madness'], baseLiveHours: 8000 },
  { platform: 'Amazon Prime Video', baseSpend: 3.8, baseSubscribers: 200, keyRights: ['NFL Thursday Night', 'NBA', 'Premier League (select)', 'French Open', 'MLS'], baseLiveHours: 4000 },
  { platform: 'Apple TV+', baseSpend: 1.5, baseSubscribers: 45, keyRights: ['MLS Season Pass', 'MLB Friday Night', 'F1 (select markets)'], baseLiveHours: 3500 },
  { platform: 'DAZN', baseSpend: 2.5, baseSubscribers: 20, keyRights: ['Serie A (intl)', 'La Liga', 'Bundesliga (select)', 'Boxing', 'J-League', 'UFC (select markets)'], baseLiveHours: 18000 },
  { platform: 'YouTube TV', baseSpend: 1.8, baseSubscribers: 8, keyRights: ['NFL Sunday Ticket', 'MLB.TV (bundle)', 'NBA League Pass (bundle)', 'MLS Season Pass (bundle)'], baseLiveHours: 15000 },
  { platform: 'Fubo', baseSpend: 0.9, baseSubscribers: 1.8, keyRights: ['Liga MX', 'Serie A (select)', 'Ligue 1', 'MLB (regional)', 'College Sports'], baseLiveHours: 42000 },
];

const RECENT_DEAL_SEEDS: {
  title: string;
  parties: string[];
  valueBillions: number;
  daysAgo: number;
  premiumPct: number;
  type: 'media-rights' | 'franchise-sale' | 'equity-stake';
}[] = [
  { title: 'NBA 11-Year Global Media Rights Package', parties: ['NBA', 'ESPN/ABC', 'NBC', 'Amazon Prime Video'], valueBillions: 76, daysAgo: 120, premiumPct: 175, type: 'media-rights' },
  { title: 'Buffalo Bills Sale (Minority Stake)', parties: ['Buffalo Bills', 'Arctos Partners'], valueBillions: 0.65, daysAgo: 45, premiumPct: 32, type: 'equity-stake' },
  { title: 'Premier League 2025-28 Domestic TV Cycle', parties: ['Premier League', 'Sky Sports', 'TNT Sports', 'Amazon Prime Video'], valueBillions: 8.4, daysAgo: 90, premiumPct: 22, type: 'media-rights' },
  { title: 'Chelsea FC Full Acquisition', parties: ['Chelsea FC', 'Clearlake Capital / Todd Boehly'], valueBillions: 5.3, daysAgo: 200, premiumPct: 48, type: 'franchise-sale' },
  { title: 'Bundesliga 2025-29 Domestic Media Rights', parties: ['DFL', 'Sky Deutschland', 'DAZN'], valueBillions: 5.1, daysAgo: 150, premiumPct: 18, type: 'media-rights' },
];

const REGIONAL_BREAKDOWN_SEEDS = [
  { region: 'North America', baseShare: 55, keyDrivers: ['NFL, NBA mega-deals', 'Streaming platform bidding wars', 'College sports media consolidation', 'Regional sports network restructuring'] },
  { region: 'Europe', baseShare: 30, keyDrivers: ['Premier League global appeal', 'UEFA Champions League reform', 'Bundesliga/Serie A/La Liga renewals', 'Sky/DAZN platform competition'] },
  { region: 'Asia-Pacific', baseShare: 10, keyDrivers: ['IPL cricket rights explosion', 'J-League and K-League growth', 'China Super League recovery', 'Southeast Asia digital-first distribution'] },
  { region: 'Rest of World', baseShare: 5, keyDrivers: ['Middle East sports investment (Saudi Pro League)', 'African football rights growth', 'Latin America digital transition', 'Emerging market OTT platforms'] },
];

// -- Data Generation --

function generate(): SportsMediaRightsResponse {
  const rng = seededRandom('sports-media-rights');

  // -- Market Overview --
  const totalGlobalValue = roundTo(jitter(rng, 62.5, 0.06), 1);
  const marketOverview: MarketOverview = {
    totalGlobalSportsMediaRightsBillions: totalGlobalValue,
    yearOverYearGrowthPct: roundTo(jitter(rng, 9.2, 0.15), 1),
    liveSportsPremiumOverScriptedPct: roundTo(jitter(rng, 85, 0.08), 0),
    totalFranchiseValuationsTrackedBillions: roundTo(jitter(rng, 92, 0.06), 1),
    totalLeagueDealsTracked: LEAGUE_DEAL_SEEDS.length,
    streamingShareOfRightsPct: roundTo(jitter(rng, 28, 0.1), 1),
  };

  // -- League Media Deals --
  const leagueMediaDeals: LeagueMediaDeal[] = LEAGUE_DEAL_SEEDS.map(ld => {
    const totalVal = roundTo(jitter(rng, ld.baseTotalBillions, 0.04), 2);
    return {
      league: ld.league,
      sport: ld.sport,
      currentDealTotalBillions: totalVal,
      annualValueBillions: roundTo(totalVal / ld.contractYears, 2),
      broadcasters: ld.broadcasters,
      contractPeriod: ld.contractPeriod,
      nextRenewalYear: ld.nextRenewal,
      yoyEscalationPct: roundTo(jitter(rng, ld.baseEscalation, 0.15), 1),
    };
  });

  // -- Franchise Valuations --
  const franchiseValuations: FranchiseValuation[] = FRANCHISE_VALUATION_SEEDS.map(fv => ({
    team: fv.team,
    league: fv.league,
    estimatedValueBillions: roundTo(jitter(rng, fv.baseValue, 0.06), 2),
    revenueBillions: roundTo(jitter(rng, fv.baseRevenue, 0.08), 3),
    operatingIncomeMillions: Math.round(jitter(rng, Math.abs(fv.baseOperatingIncome), 0.12)) * (fv.baseOperatingIncome < 0 ? -1 : 1),
    owner: fv.owner,
    yoyValueChangePct: roundTo(jitter(rng, fv.baseYoYChange, 0.2), 1),
  }));

  // -- Streaming Wars --
  const streamingWars: StreamingPlatform[] = STREAMING_PLATFORM_SEEDS.map(sp => ({
    platform: sp.platform,
    sportsContentSpendBillions: roundTo(jitter(rng, sp.baseSpend, 0.1), 2),
    subscribersMillions: roundTo(jitter(rng, sp.baseSubscribers, 0.06), 1),
    keyRightsHeld: sp.keyRights,
    liveEventHoursPerYear: Math.round(jitter(rng, sp.baseLiveHours, 0.08)),
  }));

  // -- Recent Deals --
  const recentDeals: RecentDeal[] = RECENT_DEAL_SEEDS.map((rd, i) => {
    const dealDate = new Date();
    dealDate.setDate(dealDate.getDate() - Math.round(jitter(rng, rd.daysAgo, 0.15)));
    return {
      title: rd.title,
      parties: rd.parties,
      valueBillions: roundTo(jitter(rng, rd.valueBillions, 0.03), 2),
      date: dealDate.toISOString().slice(0, 10),
      premiumToPreviousDealPct: roundTo(jitter(rng, rd.premiumPct, 0.1), 1),
      type: rd.type,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // -- Regional Breakdown --
  const regionalBreakdown: RegionalBreakdown[] = REGIONAL_BREAKDOWN_SEEDS.map(rb => {
    const share = roundTo(jitter(rng, rb.baseShare, 0.05), 1);
    return {
      region: rb.region,
      shareOfGlobalRightsPct: share,
      estimatedValueBillions: roundTo(totalGlobalValue * share / 100, 2),
      keyDrivers: rb.keyDrivers,
    };
  });

  return {
    marketOverview,
    leagueMediaDeals,
    franchiseValuations,
    streamingWars,
    recentDeals,
    regionalBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: SportsMediaRightsResponse | null = null;
let cacheTime = 0;


// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[SportsMediaRights] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate sports media rights data' });
  }
});

export default router;
