import { Router, Request, Response } from 'express';

const router = Router();

// -- PRNG --

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededRandom(tag: string): () => number {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// -- Types --

interface MajorProject {
  name: string;
  country: string;
  sector: 'transport' | 'energy' | 'water' | 'digital' | 'social';
  totalInvestment: number;
  completionYear: number;
  status: 'planning' | 'construction' | 'operational';
  fundingType: 'public' | 'PPP' | 'private';
}

interface SectorSpending {
  sector: string;
  annualSpending: number;
  growth: number;
  publicShare: number;
  privateShare: number;
}

interface RegionalBreakdown {
  region: string;
  totalInvestment: number;
  topSector: string;
  outlook: 'positive' | 'neutral' | 'negative';
}

interface InfrastructureETF {
  ticker: string;
  name: string;
  price: number;
  change: number;
  ytdReturn: number;
  aum: number;
  expenseRatio: number;
}

interface ConstructionActivity {
  housingStarts: number;
  buildingPermits: number;
  constructionSpendingTotal: number;
  nonresidential: number;
  materialCostsIndex: number;
}

interface PPPDeal {
  project: string;
  country: string;
  value: number;
  sector: string;
  stage: 'awarded' | 'financial-close' | 'construction';
}

interface InfrastructureInvestmentData {
  majorProjects: MajorProject[];
  sectorSpending: SectorSpending[];
  regionalBreakdown: RegionalBreakdown[];
  infrastructureETFs: InfrastructureETF[];
  constructionActivity: ConstructionActivity;
  pppDeals: PPPDeal[];
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: InfrastructureInvestmentData | null = null;
let cacheTime = 0;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Data generation --

function generate(): InfrastructureInvestmentData {
  const rng = seededRandom('infrastructure-investment');

  // 1. Major Projects
  const projectConfigs: { name: string; country: string; sector: MajorProject['sector']; investBase: number; investSpread: number; yearBase: number; yearSpread: number; statusPool: MajorProject['status'][]; fundingPool: MajorProject['fundingType'][] }[] = [
    { name: 'California High-Speed Rail', country: 'United States', sector: 'transport', investBase: 105, investSpread: 10, yearBase: 2033, yearSpread: 2, statusPool: ['construction'], fundingPool: ['public'] },
    { name: 'Crossrail 2', country: 'United Kingdom', sector: 'transport', investBase: 42, investSpread: 5, yearBase: 2035, yearSpread: 2, statusPool: ['planning'], fundingPool: ['PPP'] },
    { name: 'Grand Paris Express', country: 'France', sector: 'transport', investBase: 38, investSpread: 4, yearBase: 2032, yearSpread: 1, statusPool: ['construction'], fundingPool: ['public'] },
    { name: 'NEOM City Infrastructure', country: 'Saudi Arabia', sector: 'social', investBase: 150, investSpread: 20, yearBase: 2035, yearSpread: 3, statusPool: ['construction', 'planning'], fundingPool: ['public', 'PPP'] },
    { name: 'Mumbai-Ahmedabad HSR', country: 'India', sector: 'transport', investBase: 18, investSpread: 2, yearBase: 2032, yearSpread: 2, statusPool: ['construction'], fundingPool: ['PPP'] },
    { name: 'Hinkley Point C Nuclear', country: 'United Kingdom', sector: 'energy', investBase: 33, investSpread: 3, yearBase: 2031, yearSpread: 2, statusPool: ['construction'], fundingPool: ['private'] },
    { name: 'Great Sea Interconnector', country: 'Cyprus/Greece', sector: 'energy', investBase: 2.5, investSpread: 0.3, yearBase: 2030, yearSpread: 1, statusPool: ['construction'], fundingPool: ['PPP'] },
    { name: 'Thames Tideway Tunnel', country: 'United Kingdom', sector: 'water', investBase: 5.5, investSpread: 0.5, yearBase: 2028, yearSpread: 1, statusPool: ['construction', 'operational'], fundingPool: ['PPP'] },
    { name: 'Singapore-KL HSR Revival', country: 'Malaysia/Singapore', sector: 'transport', investBase: 22, investSpread: 3, yearBase: 2037, yearSpread: 2, statusPool: ['planning'], fundingPool: ['PPP'] },
    { name: 'National Broadband Network Phase 3', country: 'Australia', sector: 'digital', investBase: 8, investSpread: 1, yearBase: 2029, yearSpread: 1, statusPool: ['construction'], fundingPool: ['public'] },
    { name: 'East Coast Rail Link', country: 'Malaysia', sector: 'transport', investBase: 12, investSpread: 1.5, yearBase: 2030, yearSpread: 1, statusPool: ['construction'], fundingPool: ['PPP'] },
    { name: 'Copenhagen Metro Expansion', country: 'Denmark', sector: 'transport', investBase: 4.2, investSpread: 0.4, yearBase: 2031, yearSpread: 1, statusPool: ['planning', 'construction'], fundingPool: ['public'] },
    { name: 'Gordie Howe International Bridge', country: 'Canada', sector: 'transport', investBase: 6.4, investSpread: 0.5, yearBase: 2028, yearSpread: 1, statusPool: ['construction'], fundingPool: ['PPP'] },
    { name: 'Dogger Bank Wind Farm', country: 'United Kingdom', sector: 'energy', investBase: 11, investSpread: 1, yearBase: 2029, yearSpread: 1, statusPool: ['construction', 'operational'], fundingPool: ['private'] },
    { name: 'Jakarta MRT Phase 3', country: 'Indonesia', sector: 'transport', investBase: 3.5, investSpread: 0.4, yearBase: 2032, yearSpread: 2, statusPool: ['planning'], fundingPool: ['PPP'] },
  ];

  const majorProjects: MajorProject[] = projectConfigs.map(cfg => {
    const totalInvestment = round1(cfg.investBase + (rng() - 0.5) * 2 * cfg.investSpread);
    const completionYear = cfg.yearBase + Math.round((rng() - 0.5) * 2 * cfg.yearSpread);
    const status = cfg.statusPool[Math.floor(rng() * cfg.statusPool.length)];
    const fundingType = cfg.fundingPool[Math.floor(rng() * cfg.fundingPool.length)];
    return { name: cfg.name, country: cfg.country, sector: cfg.sector, totalInvestment, completionYear, status, fundingType };
  });

  // 2. Sector Spending (in $ billions)
  const sectorConfigs: { sector: string; spendBase: number; spendSpread: number; growthBase: number; growthSpread: number; pubBase: number; pubSpread: number }[] = [
    { sector: 'Transport', spendBase: 820, spendSpread: 40, growthBase: 4.5, growthSpread: 1.5, pubBase: 62, pubSpread: 5 },
    { sector: 'Energy', spendBase: 680, spendSpread: 35, growthBase: 7.2, growthSpread: 2.0, pubBase: 38, pubSpread: 6 },
    { sector: 'Water', spendBase: 320, spendSpread: 20, growthBase: 3.8, growthSpread: 1.0, pubBase: 72, pubSpread: 5 },
    { sector: 'Digital', spendBase: 450, spendSpread: 30, growthBase: 12.5, growthSpread: 3.0, pubBase: 25, pubSpread: 6 },
    { sector: 'Social', spendBase: 390, spendSpread: 25, growthBase: 3.2, growthSpread: 1.2, pubBase: 68, pubSpread: 5 },
  ];

  const sectorSpending: SectorSpending[] = sectorConfigs.map(cfg => {
    const annualSpending = round1(cfg.spendBase + (rng() - 0.5) * 2 * cfg.spendSpread);
    const growth = round1(cfg.growthBase + (rng() - 0.5) * 2 * cfg.growthSpread);
    const publicShare = round1(cfg.pubBase + (rng() - 0.5) * 2 * cfg.pubSpread);
    const privateShare = round1(100 - publicShare);
    return { sector: cfg.sector, annualSpending, growth, publicShare, privateShare };
  });

  // 3. Regional Breakdown (in $ trillions)
  const regionConfigs: { region: string; investBase: number; investSpread: number; topSectors: string[] }[] = [
    { region: 'North America', investBase: 2.8, investSpread: 0.3, topSectors: ['Transport', 'Digital'] },
    { region: 'Europe', investBase: 2.2, investSpread: 0.2, topSectors: ['Energy', 'Transport'] },
    { region: 'Asia-Pacific', investBase: 5.5, investSpread: 0.5, topSectors: ['Transport', 'Energy', 'Digital'] },
    { region: 'Middle East', investBase: 1.2, investSpread: 0.2, topSectors: ['Social', 'Energy'] },
    { region: 'Latin America', investBase: 0.8, investSpread: 0.1, topSectors: ['Transport', 'Water'] },
    { region: 'Africa', investBase: 0.5, investSpread: 0.08, topSectors: ['Energy', 'Water', 'Transport'] },
  ];

  const regionalBreakdown: RegionalBreakdown[] = regionConfigs.map(cfg => {
    const totalInvestment = round2(cfg.investBase + (rng() - 0.5) * 2 * cfg.investSpread);
    const topSector = cfg.topSectors[Math.floor(rng() * cfg.topSectors.length)];
    const outlookVal = rng();
    let outlook: 'positive' | 'neutral' | 'negative';
    if (outlookVal > 0.55) outlook = 'positive';
    else if (outlookVal < 0.2) outlook = 'negative';
    else outlook = 'neutral';
    return { region: cfg.region, totalInvestment, topSector, outlook };
  });

  // 4. Infrastructure ETFs
  const etfConfigs: { ticker: string; name: string; priceBase: number; priceSpread: number; aumBase: number; aumSpread: number; expenseRatio: number }[] = [
    { ticker: 'PAVE', name: 'Global X U.S. Infrastructure Development ETF', priceBase: 38, priceSpread: 3, aumBase: 7.8, aumSpread: 0.8, expenseRatio: 0.47 },
    { ticker: 'IFRA', name: 'iShares U.S. Infrastructure ETF', priceBase: 42, priceSpread: 3, aumBase: 3.2, aumSpread: 0.4, expenseRatio: 0.30 },
    { ticker: 'IGF', name: 'iShares Global Infrastructure ETF', priceBase: 48, priceSpread: 3, aumBase: 4.5, aumSpread: 0.5, expenseRatio: 0.40 },
    { ticker: 'NFRA', name: 'FlexShares STOXX Global Broad Infrastructure ETF', priceBase: 55, priceSpread: 3, aumBase: 2.8, aumSpread: 0.3, expenseRatio: 0.47 },
    { ticker: 'TOLZ', name: 'ProShares DJ Brookfield Global Infrastructure ETF', priceBase: 44, priceSpread: 3, aumBase: 1.1, aumSpread: 0.2, expenseRatio: 0.46 },
  ];

  const infrastructureETFs: InfrastructureETF[] = etfConfigs.map(cfg => {
    const price = round2(cfg.priceBase + (rng() - 0.5) * 2 * cfg.priceSpread);
    const change = round2((rng() - 0.45) * 3);
    const ytdReturn = round2((rng() - 0.3) * 20);
    const aum = round1(cfg.aumBase + (rng() - 0.5) * 2 * cfg.aumSpread);
    return { ticker: cfg.ticker, name: cfg.name, price, change, ytdReturn, aum, expenseRatio: cfg.expenseRatio };
  });

  // 5. Construction Activity
  const constructionActivity: ConstructionActivity = {
    housingStarts: Math.round(1380 + (rng() - 0.5) * 200),
    buildingPermits: Math.round(1480 + (rng() - 0.5) * 200),
    constructionSpendingTotal: round1(2050 + (rng() - 0.5) * 150),
    nonresidential: round1(1120 + (rng() - 0.5) * 80),
    materialCostsIndex: round1(245 + (rng() - 0.5) * 30),
  };

  // 6. PPP Deals
  const pppConfigs: { project: string; country: string; valueBase: number; valueSpread: number; sector: string; stagePool: PPPDeal['stage'][] }[] = [
    { project: 'I-495 Express Lanes Extension', country: 'United States', valueBase: 3.6, valueSpread: 0.4, sector: 'Transport', stagePool: ['financial-close', 'construction'] },
    { project: 'A7 Motorway Widening', country: 'Germany', valueBase: 2.1, valueSpread: 0.3, sector: 'Transport', stagePool: ['awarded', 'financial-close'] },
    { project: 'Riyadh Metro Line 3', country: 'Saudi Arabia', valueBase: 5.8, valueSpread: 0.6, sector: 'Transport', stagePool: ['construction'] },
    { project: 'Manila Water Concession Renewal', country: 'Philippines', valueBase: 1.4, valueSpread: 0.2, sector: 'Water', stagePool: ['awarded', 'financial-close'] },
    { project: 'Bucharest Hospital Complex', country: 'Romania', valueBase: 0.9, valueSpread: 0.1, sector: 'Social', stagePool: ['awarded'] },
    { project: 'Lagos-Ibadan Expressway', country: 'Nigeria', valueBase: 1.8, valueSpread: 0.2, sector: 'Transport', stagePool: ['financial-close', 'construction'] },
    { project: 'Queensland Renewable Energy Hub', country: 'Australia', valueBase: 4.2, valueSpread: 0.5, sector: 'Energy', stagePool: ['awarded', 'financial-close'] },
    { project: 'Santiago Airport Expansion', country: 'Chile', valueBase: 2.5, valueSpread: 0.3, sector: 'Transport', stagePool: ['construction'] },
    { project: 'Istanbul 5G Backbone', country: 'Turkey', valueBase: 1.2, valueSpread: 0.15, sector: 'Digital', stagePool: ['awarded'] },
    { project: 'Accra Desalination Plant', country: 'Ghana', valueBase: 0.6, valueSpread: 0.08, sector: 'Water', stagePool: ['financial-close'] },
  ];

  const pppDeals: PPPDeal[] = pppConfigs.map(cfg => {
    const value = round2(cfg.valueBase + (rng() - 0.5) * 2 * cfg.valueSpread);
    const stage = cfg.stagePool[Math.floor(rng() * cfg.stagePool.length)];
    return { project: cfg.project, country: cfg.country, value, sector: cfg.sector, stage };
  });

  return {
    majorProjects,
    sectorSpending,
    regionalBreakdown,
    infrastructureETFs,
    constructionActivity,
    pppDeals,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      res.json(cacheData);
      return;
    }
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    const error = err as Error | undefined;
    console.error('[InfrastructureInvestment] Error:', error?.message);
    if (cacheData) {
      res.json(cacheData);
      return;
    }
    res.status(500).json({ error: 'Failed to generate infrastructure investment data' });
  }
});

export default router;
