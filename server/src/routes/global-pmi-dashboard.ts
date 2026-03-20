import { Router, Request, Response } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Types --

interface CountryConfig {
  name: string;
  isoCode: string;
  region: 'Americas' | 'EMEA' | 'Asia-Pacific';
  mfgBase: number;
  svcBase: number;
}

interface CountryPMI {
  name: string;
  isoCode: string;
  region: 'Americas' | 'EMEA' | 'Asia-Pacific';
  manufacturing: number;
  services: number;
  composite: number;
  manufacturingPrev: number;
  servicesPrev: number;
  compositePrev: number;
  manufacturingChange: number;
  servicesChange: number;
  compositeChange: number;
  newOrders: number;
  employment: number;
  outputPrices: number;
  trend: 'Expanding' | 'Contracting' | 'Stagnating';
  consecutiveMonths: number;
}

interface GlobalComposite {
  manufacturing: number;
  services: number;
  composite: number;
  change: number;
  trend: 'Expanding' | 'Contracting' | 'Stagnating';
}

interface TrendEntry {
  month: string;
  manufacturing: number;
  services: number;
  composite: number;
}

interface Summary {
  globalManufacturing: number;
  globalServices: number;
  countriesExpanding: number;
  countriesContracting: number;
  strongestPMI: { country: string; value: number };
  weakestPMI: { country: string; value: number };
  avgChange: number;
}

interface DashboardData {
  countries: CountryPMI[];
  globalComposite: GlobalComposite;
  trends: TrendEntry[];
  summary: Summary;
  generatedAt: string;
}

// -- Country definitions --
// Realistic PMI base values reflecting current economic conditions:
// US: moderate expansion, China: borderline, Germany: weak manufacturing,
// India: strong expansion, Japan: mild contraction in manufacturing, etc.

const COUNTRIES: CountryConfig[] = [
  { name: 'United States',  isoCode: 'US', region: 'Americas',      mfgBase: 51.5, svcBase: 53.2 },
  { name: 'China',          isoCode: 'CN', region: 'Asia-Pacific',  mfgBase: 50.1, svcBase: 51.8 },
  { name: 'Eurozone',       isoCode: 'EZ', region: 'EMEA',          mfgBase: 46.2, svcBase: 51.5 },
  { name: 'Germany',        isoCode: 'DE', region: 'EMEA',          mfgBase: 43.8, svcBase: 50.3 },
  { name: 'France',         isoCode: 'FR', region: 'EMEA',          mfgBase: 44.5, svcBase: 49.6 },
  { name: 'United Kingdom', isoCode: 'GB', region: 'EMEA',          mfgBase: 47.5, svcBase: 52.1 },
  { name: 'Japan',          isoCode: 'JP', region: 'Asia-Pacific',  mfgBase: 49.2, svcBase: 51.5 },
  { name: 'India',          isoCode: 'IN', region: 'Asia-Pacific',  mfgBase: 56.5, svcBase: 58.2 },
  { name: 'South Korea',    isoCode: 'KR', region: 'Asia-Pacific',  mfgBase: 49.5, svcBase: 51.0 },
  { name: 'Australia',      isoCode: 'AU', region: 'Asia-Pacific',  mfgBase: 48.2, svcBase: 51.3 },
  { name: 'Canada',         isoCode: 'CA', region: 'Americas',      mfgBase: 49.8, svcBase: 51.2 },
  { name: 'Brazil',         isoCode: 'BR', region: 'Americas',      mfgBase: 50.8, svcBase: 51.5 },
  { name: 'Mexico',         isoCode: 'MX', region: 'Americas',      mfgBase: 51.2, svcBase: 52.3 },
  { name: 'Turkey',         isoCode: 'TR', region: 'EMEA',          mfgBase: 50.3, svcBase: 52.0 },
  { name: 'Indonesia',      isoCode: 'ID', region: 'Asia-Pacific',  mfgBase: 52.8, svcBase: 53.5 },
  { name: 'Taiwan',         isoCode: 'TW', region: 'Asia-Pacific',  mfgBase: 51.5, svcBase: 53.2 },
  { name: 'Vietnam',        isoCode: 'VN', region: 'Asia-Pacific',  mfgBase: 53.2, svcBase: 52.0 },
  { name: 'Thailand',       isoCode: 'TH', region: 'Asia-Pacific',  mfgBase: 48.0, svcBase: 50.8 },
  { name: 'Italy',          isoCode: 'IT', region: 'EMEA',          mfgBase: 48.5, svcBase: 51.2 },
  { name: 'Spain',          isoCode: 'ES', region: 'EMEA',          mfgBase: 50.5, svcBase: 53.8 },
];

// -- Cache --


let cache: { data: DashboardData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;

function determineTrend(composite: number): 'Expanding' | 'Contracting' | 'Stagnating' {
  if (composite >= 50.5) return 'Expanding';
  if (composite <= 49.5) return 'Contracting';
  return 'Stagnating';
}

// -- Data generation --

function generate(): DashboardData {
  const rng = seededRandom('global-pmi-dashboard');
  const rngPrev = seededRandom('global-pmi-dashboard-prev');
  const jitter = (base: number, spread: number): number => base + (rng() - 0.5) * 2 * spread;
  const jitterPrev = (base: number, spread: number): number => base + (rngPrev() - 0.5) * 2 * spread;

  // Generate country data
  const countries: CountryPMI[] = COUNTRIES.map(c => {
    const manufacturing = round1(jitter(c.mfgBase, 2.0));
    const services = round1(jitter(c.svcBase, 2.0));
    const composite = round1(manufacturing * 0.35 + services * 0.65);

    const manufacturingPrev = round1(jitterPrev(c.mfgBase, 1.8));
    const servicesPrev = round1(jitterPrev(c.svcBase, 1.8));
    const compositePrev = round1(manufacturingPrev * 0.35 + servicesPrev * 0.65);

    const manufacturingChange = round1(manufacturing - manufacturingPrev);
    const servicesChange = round1(services - servicesPrev);
    const compositeChange = round1(composite - compositePrev);

    // Sub-indices derived from manufacturing PMI with realistic offsets
    const newOrders = round1(jitter(manufacturing + 0.8, 1.5));
    const employment = round1(jitter(manufacturing - 0.5, 1.2));
    const outputPrices = round1(jitter(52.5, 2.5));

    const trend = determineTrend(composite);

    // Consecutive months above/below 50 (seeded for consistency)
    const consecutiveMonths = Math.max(1, Math.floor(rng() * 12) + 1);

    return {
      name: c.name,
      isoCode: c.isoCode,
      region: c.region,
      manufacturing,
      services,
      composite,
      manufacturingPrev,
      servicesPrev,
      compositePrev,
      manufacturingChange,
      servicesChange,
      compositeChange,
      newOrders,
      employment,
      outputPrices,
      trend,
      consecutiveMonths,
    };
  });

  // Global composite (GDP-weighted approximation via simple average)
  const globalMfg = round1(countries.reduce((s, c) => s + c.manufacturing, 0) / countries.length);
  const globalSvc = round1(countries.reduce((s, c) => s + c.services, 0) / countries.length);
  const globalComp = round1(globalMfg * 0.35 + globalSvc * 0.65);
  const globalMfgPrev = round1(countries.reduce((s, c) => s + c.manufacturingPrev, 0) / countries.length);
  const globalSvcPrev = round1(countries.reduce((s, c) => s + c.servicesPrev, 0) / countries.length);
  const globalCompPrev = round1(globalMfgPrev * 0.35 + globalSvcPrev * 0.65);
  const globalChange = round1(globalComp - globalCompPrev);

  const globalComposite: GlobalComposite = {
    manufacturing: globalMfg,
    services: globalSvc,
    composite: globalComp,
    change: globalChange,
    trend: determineTrend(globalComp),
  };

  // 6 months of global composite trend data
  const trends: TrendEntry[] = Array.from({ length: 6 }, (_, i) => {
    const m = new Date();
    m.setMonth(m.getMonth() - (5 - i));
    const monthTag = m.toISOString().slice(0, 7);
    const trendRng = seededRandom('pmi-trend-' + monthTag);
    const tMfg = round1(globalMfg + (trendRng() - 0.5) * 3.0);
    const tSvc = round1(globalSvc + (trendRng() - 0.5) * 2.5);
    const tComp = round1(tMfg * 0.35 + tSvc * 0.65);
    return {
      month: monthTag,
      manufacturing: tMfg,
      services: tSvc,
      composite: tComp,
    };
  });

  // Summary statistics
  const expanding = countries.filter(c => c.composite >= 50.0);
  const contracting = countries.filter(c => c.composite < 50.0);

  const strongest = countries.reduce((best, c) => c.composite > best.composite ? c : best, countries[0]);
  const weakest = countries.reduce((worst, c) => c.composite < worst.composite ? c : worst, countries[0]);

  const avgChange = round1(
    countries.reduce((s, c) => s + c.compositeChange, 0) / countries.length
  );

  const summary: Summary = {
    globalManufacturing: globalMfg,
    globalServices: globalSvc,
    countriesExpanding: expanding.length,
    countriesContracting: contracting.length,
    strongestPMI: { country: strongest.name, value: strongest.composite },
    weakestPMI: { country: weakest.name, value: weakest.composite },
    avgChange,
  };

  return {
    countries,
    globalComposite,
    trends,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[GlobalPMIDashboard] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate global PMI dashboard data' });
  }
});

export default router;
