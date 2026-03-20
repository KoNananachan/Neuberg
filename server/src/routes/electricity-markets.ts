import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

interface RegionConfig {
  region: string;
  spotBase: number;
  spotVolatility: number;
  peakMultiplier: number;
  offPeakMultiplier: number;
  loadBase: number;
  capacityBase: number;
}

const REGIONS: RegionConfig[] = [
  { region: 'PJM', spotBase: 42, spotVolatility: 0.15, peakMultiplier: 1.45, offPeakMultiplier: 0.72, loadBase: 145, capacityBase: 185 },
  { region: 'ERCOT', spotBase: 48, spotVolatility: 0.35, peakMultiplier: 1.65, offPeakMultiplier: 0.55, loadBase: 52, capacityBase: 78 },
  { region: 'CAISO', spotBase: 52, spotVolatility: 0.20, peakMultiplier: 1.50, offPeakMultiplier: 0.68, loadBase: 32, capacityBase: 80 },
  { region: 'NYISO', spotBase: 45, spotVolatility: 0.18, peakMultiplier: 1.55, offPeakMultiplier: 0.70, loadBase: 30, capacityBase: 40 },
  { region: 'ISO-NE', spotBase: 48, spotVolatility: 0.22, peakMultiplier: 1.50, offPeakMultiplier: 0.65, loadBase: 22, capacityBase: 31 },
  { region: 'MISO', spotBase: 35, spotVolatility: 0.16, peakMultiplier: 1.40, offPeakMultiplier: 0.74, loadBase: 100, capacityBase: 130 },
  { region: 'SPP', spotBase: 30, spotVolatility: 0.20, peakMultiplier: 1.38, offPeakMultiplier: 0.76, loadBase: 42, capacityBase: 58 },
  { region: 'AESO', spotBase: 55, spotVolatility: 0.25, peakMultiplier: 1.42, offPeakMultiplier: 0.65, loadBase: 11, capacityBase: 17 },
];

const FORWARD_REGIONS = ['PJM', 'ERCOT', 'CAISO'];
const TENORS = ['M+1', 'M+2', 'Q+1', 'Q+2', 'Cal+1', 'Cal+2'];

const GEN_MIX: { source: string; shareBase: number; capacityBase: number; change1yBase: number }[] = [
  { source: 'Natural Gas', shareBase: 40.2, capacityBase: 550, change1yBase: -0.8 },
  { source: 'Nuclear', shareBase: 18.5, capacityBase: 95, change1yBase: -0.2 },
  { source: 'Wind', shareBase: 12.8, capacityBase: 148, change1yBase: 1.6 },
  { source: 'Solar', shareBase: 7.2, capacityBase: 110, change1yBase: 2.4 },
  { source: 'Coal', shareBase: 14.8, capacityBase: 190, change1yBase: -2.1 },
  { source: 'Hydro', shareBase: 6.5, capacityBase: 80, change1yBase: -0.3 },
];

const CONGESTION_NODES: { node: string; region: string; priceBase: number; frequencyBase: number; direction: string }[] = [
  { node: 'Western Hub', region: 'PJM', priceBase: 12.5, frequencyBase: 28, direction: 'Import constrained' },
  { node: 'Houston Zone', region: 'ERCOT', priceBase: 18.2, frequencyBase: 35, direction: 'Export constrained' },
  { node: 'SP-15', region: 'CAISO', priceBase: 15.8, frequencyBase: 32, direction: 'Import constrained' },
  { node: 'Zone J NYC', region: 'NYISO', priceBase: 22.4, frequencyBase: 42, direction: 'Import constrained' },
  { node: 'NE-MASS', region: 'ISO-NE', priceBase: 14.6, frequencyBase: 26, direction: 'Import constrained' },
  { node: 'Indiana Hub', region: 'MISO', priceBase: 8.3, frequencyBase: 18, direction: 'Export constrained' },
  { node: 'South Hub', region: 'SPP', priceBase: 6.9, frequencyBase: 15, direction: 'Export constrained' },
  { node: 'Alberta Internal', region: 'AESO', priceBase: 10.1, frequencyBase: 22, direction: 'Import constrained' },
];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-electricity-markets'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  // Seasonal factor: summer/winter peaks raise prices, shoulder months lower
  const month = now.getMonth();
  const seasonFactor = 1 + 0.15 * Math.cos(((month - 7) / 12) * 2 * Math.PI); // peaks in Jul/Aug

  // --- regions ---
  const regions = REGIONS.map(r => {
    const spotPrice = round2(jitter(r.spotBase * seasonFactor, r.spotVolatility));
    const change1d = round2((rng() - 0.5) * spotPrice * 0.08);
    const peakPrice = round2(spotPrice * r.peakMultiplier * (1 + (rng() - 0.5) * 0.06));
    const offPeakPrice = round2(spotPrice * r.offPeakMultiplier * (1 + (rng() - 0.5) * 0.06));
    const load = round1(jitter(r.loadBase * seasonFactor, 0.08));
    const capacity = round1(jitter(r.capacityBase, 0.03));
    const reserveMargin = round1(((capacity - load) / load) * 100);

    return { region: r.region, spotPrice, change1d, peakPrice, offPeakPrice, load, capacity, reserveMargin };
  });

  // --- summary ---
  const avgSpotPrice = round2(regions.reduce((s, r) => s + r.spotPrice, 0) / regions.length);
  const peakDemand = round1(regions.reduce((s, r) => s + r.load, 0));
  const renewableShare = round1(jitter(20.0, 0.08));
  const avgForwardPrice = round2(jitter(avgSpotPrice * 1.05, 0.06));
  const congestionCost = round1(jitter(85, 0.15));

  const summary = { avgSpotPrice, peakDemand, renewableShare, avgForwardPrice, congestionCost };

  // --- forwards ---
  const forwards = FORWARD_REGIONS.map(regionName => {
    const regionConfig = REGIONS.find(r => r.region === regionName)!;
    const baseSpot = regionConfig.spotBase * seasonFactor;
    const tenors = TENORS.map(tenor => {
      // Longer tenors converge toward mean, with slight contango
      let multiplier = 1.0;
      if (tenor === 'M+1') multiplier = 1.02;
      else if (tenor === 'M+2') multiplier = 1.04;
      else if (tenor === 'Q+1') multiplier = 1.06;
      else if (tenor === 'Q+2') multiplier = 1.08;
      else if (tenor === 'Cal+1') multiplier = 1.10;
      else if (tenor === 'Cal+2') multiplier = 1.12;

      const price = round2(jitter(baseSpot * multiplier, 0.08));
      const change1w = round2((rng() - 0.5) * price * 0.05);
      return { tenor, price, change1w };
    });
    return { region: regionName, tenors };
  });

  // --- generationMix ---
  const generationMix = GEN_MIX.map(g => {
    const share = round1(jitter(g.shareBase, 0.04));
    const capacity = round1(jitter(g.capacityBase, 0.03));
    const change1y = round1(g.change1yBase + (rng() - 0.5) * 0.6);
    return { source: g.source, share, capacity, change1y };
  });

  // Normalize shares to 100%
  const totalShare = generationMix.reduce((s, g) => s + g.share, 0);
  generationMix.forEach(g => { g.share = round1((g.share / totalShare) * 100); });

  // --- congestion ---
  const congestion = CONGESTION_NODES.map(n => {
    const congestionPrice = round2(jitter(n.priceBase, 0.20));
    const frequency = round1(jitter(n.frequencyBase, 0.12));
    const change1m = round2((rng() - 0.5) * n.priceBase * 0.25);
    return { node: n.node, region: n.region, congestionPrice, frequency, direction: n.direction, change1m };
  });

  return { summary, regions, forwards, generationMix, congestion, generatedAt: now.toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ElectricityMarkets] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate electricity markets data' });
  }
});

export default router;
