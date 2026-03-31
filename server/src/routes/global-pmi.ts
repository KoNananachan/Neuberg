import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const COUNTRIES = [
  { id: 'US', name: 'United States', region: 'Americas', mfgBase: 51.5, svcBase: 53.2 },
  { id: 'CN', name: 'China', region: 'Asia-Pacific', mfgBase: 50.8, svcBase: 52.5 },
  { id: 'JP', name: 'Japan', region: 'Asia-Pacific', mfgBase: 49.5, svcBase: 51.8 },
  { id: 'DE', name: 'Germany', region: 'Europe', mfgBase: 43.5, svcBase: 50.2 },
  { id: 'GB', name: 'United Kingdom', region: 'Europe', mfgBase: 47.8, svcBase: 52.0 },
  { id: 'FR', name: 'France', region: 'Europe', mfgBase: 44.2, svcBase: 49.8 },
  { id: 'IT', name: 'Italy', region: 'Europe', mfgBase: 48.5, svcBase: 51.0 },
  { id: 'ES', name: 'Spain', region: 'Europe', mfgBase: 50.3, svcBase: 53.5 },
  { id: 'KR', name: 'South Korea', region: 'Asia-Pacific', mfgBase: 49.8, svcBase: 51.2 },
  { id: 'IN', name: 'India', region: 'Asia-Pacific', mfgBase: 56.5, svcBase: 58.0 },
  { id: 'BR', name: 'Brazil', region: 'Americas', mfgBase: 50.5, svcBase: 51.5 },
  { id: 'MX', name: 'Mexico', region: 'Americas', mfgBase: 51.0, svcBase: 52.0 },
  { id: 'CA', name: 'Canada', region: 'Americas', mfgBase: 49.5, svcBase: 51.0 },
  { id: 'AU', name: 'Australia', region: 'Asia-Pacific', mfgBase: 48.0, svcBase: 51.5 },
  { id: 'SE', name: 'Sweden', region: 'Europe', mfgBase: 47.0, svcBase: 50.5 },
  { id: 'PL', name: 'Poland', region: 'Europe', mfgBase: 48.5, svcBase: 51.8 },
  { id: 'TR', name: 'Turkey', region: 'Europe', mfgBase: 50.0, svcBase: 52.2 },
  { id: 'TW', name: 'Taiwan', region: 'Asia-Pacific', mfgBase: 51.2, svcBase: 53.0 },
  { id: 'ID', name: 'Indonesia', region: 'Asia-Pacific', mfgBase: 52.5, svcBase: 53.5 },
  { id: 'VN', name: 'Vietnam', region: 'Asia-Pacific', mfgBase: 53.0, svcBase: 52.0 },
  { id: 'RU', name: 'Russia', region: 'Europe', mfgBase: 52.5, svcBase: 54.0 },
  { id: 'ZA', name: 'South Africa', region: 'Africa', mfgBase: 48.5, svcBase: 49.0 },
  { id: 'SA', name: 'Saudi Arabia', region: 'Middle East', mfgBase: 56.0, svcBase: 57.5 },
  { id: 'TH', name: 'Thailand', region: 'Asia-Pacific', mfgBase: 48.0, svcBase: 50.5 },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-global-pmi'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const countries = COUNTRIES.map(c => {
    const mfgPmi = Math.round(jitter(c.mfgBase, 0.04) * 10) / 10;
    const svcPmi = Math.round(jitter(c.svcBase, 0.04) * 10) / 10;
    const compositePmi = Math.round((mfgPmi * 0.35 + svcPmi * 0.65) * 10) / 10;
    const mfgPrev = Math.round(jitter(c.mfgBase, 0.03) * 10) / 10;
    const svcPrev = Math.round(jitter(c.svcBase, 0.03) * 10) / 10;
    const mfgChange = Math.round((mfgPmi - mfgPrev) * 10) / 10;
    const svcChange = Math.round((svcPmi - svcPrev) * 10) / 10;

    // Sub-indices for manufacturing
    const newOrders = Math.round(jitter(mfgPmi + 1, 0.04) * 10) / 10;
    const output = Math.round(jitter(mfgPmi + 0.5, 0.04) * 10) / 10;
    const employment = Math.round(jitter(mfgPmi - 0.5, 0.05) * 10) / 10;
    const deliveryTimes = Math.round(jitter(49.5, 0.04) * 10) / 10;
    const inputPrices = Math.round(jitter(55, 0.06) * 10) / 10;
    const outputPrices = Math.round(jitter(52, 0.05) * 10) / 10;

    // 6-month trend
    const trend = Array.from({ length: 6 }, (_, i) => {
      const m = new Date();
      m.setMonth(m.getMonth() - (5 - i));
      return {
        month: m.toISOString().slice(0, 7),
        mfg: Math.round(jitter(c.mfgBase, 0.035) * 10) / 10,
        svc: Math.round(jitter(c.svcBase, 0.035) * 10) / 10,
      };
    });

    const zone = mfgPmi >= 52 ? 'expansion' : mfgPmi >= 50 ? 'neutral' : mfgPmi >= 47 ? 'slowdown' : 'contraction';

    return {
      id: c.id, name: c.name, region: c.region,
      mfgPmi, svcPmi, compositePmi,
      mfgPrev, svcPrev, mfgChange, svcChange,
      newOrders, output, employment, deliveryTimes,
      inputPrices, outputPrices, trend, zone,
    };
  });

  const regions = ['Americas', 'Europe', 'Asia-Pacific', 'Africa', 'Middle East'].map(region => {
    const rc = countries.filter(c => c.region === region);
    if (rc.length === 0) return null;
    return {
      region, count: rc.length,
      avgMfg: Math.round(rc.reduce((a, c) => a + c.mfgPmi, 0) / rc.length * 10) / 10,
      avgSvc: Math.round(rc.reduce((a, c) => a + c.svcPmi, 0) / rc.length * 10) / 10,
      avgComposite: Math.round(rc.reduce((a, c) => a + c.compositePmi, 0) / rc.length * 10) / 10,
    };
  }).filter(Boolean);

  const globalMfg = Math.round(countries.reduce((a, c) => a + c.mfgPmi, 0) / countries.length * 10) / 10;
  const globalSvc = Math.round(countries.reduce((a, c) => a + c.svcPmi, 0) / countries.length * 10) / 10;
  const globalComposite = Math.round((globalMfg * 0.35 + globalSvc * 0.65) * 10) / 10;

  const expansion = countries.filter(c => c.mfgPmi >= 50).length;
  const contraction = countries.filter(c => c.mfgPmi < 50).length;

  const summary = { globalMfg, globalSvc, globalComposite, expansion, contraction, totalCountries: countries.length };

  return { countries, regions, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[GlobalPMI] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate global PMI data' });
  }
});

export default router;
