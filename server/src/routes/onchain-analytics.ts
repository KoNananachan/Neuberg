import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

const CHAINS = [
  { id: 'BTC', name: 'Bitcoin', basePrice: 95000, baseActive: 900000, baseTxVol: 12e9, baseFees: 2.5e6, baseHashrate: 650, baseNVT: 45 },
  { id: 'ETH', name: 'Ethereum', basePrice: 3200, baseActive: 550000, baseTxVol: 8e9, baseFees: 4.5e6, baseHashrate: 0, baseNVT: 32 },
  { id: 'SOL', name: 'Solana', basePrice: 180, baseActive: 1200000, baseTxVol: 2.5e9, baseFees: 0.8e6, baseHashrate: 0, baseNVT: 55 },
  { id: 'BNB', name: 'BNB Chain', basePrice: 620, baseActive: 800000, baseTxVol: 3e9, baseFees: 0.5e6, baseHashrate: 0, baseNVT: 40 },
  { id: 'AVAX', name: 'Avalanche', basePrice: 38, baseActive: 120000, baseTxVol: 0.5e9, baseFees: 0.2e6, baseHashrate: 0, baseNVT: 60 },
  { id: 'MATIC', name: 'Polygon', basePrice: 0.95, baseActive: 350000, baseTxVol: 0.8e9, baseFees: 0.1e6, baseHashrate: 0, baseNVT: 70 },
];

const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'Bitfinex'];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-onchain'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const chains = CHAINS.map(ch => {
    const price = Math.round(jitter(ch.basePrice, 0.05) * 100) / 100;
    const activeAddresses = Math.round(jitter(ch.baseActive, 0.1));
    const txVolume24h = Math.round(jitter(ch.baseTxVol, 0.15));
    const fees24h = Math.round(jitter(ch.baseFees, 0.2));
    const nvtRatio = Math.round(jitter(ch.baseNVT, 0.12) * 10) / 10;
    const nvtSignal = nvtRatio < 35 ? 'Undervalued' : nvtRatio > 65 ? 'Overvalued' : 'Fair';
    const mvrvRatio = Math.round((1.2 + rng() * 2.5) * 100) / 100;
    const mvrvSignal = mvrvRatio > 3.5 ? 'Overheated' : mvrvRatio < 1.0 ? 'Undervalued' : 'Neutral';
    const sopr = Math.round((0.95 + rng() * 0.15) * 1000) / 1000;

    const exchangeInflow = Math.round(jitter(txVolume24h * 0.08, 0.2));
    const exchangeOutflow = Math.round(jitter(txVolume24h * 0.07, 0.2));
    const netExchangeFlow = exchangeInflow - exchangeOutflow;
    const exchangeReserves = Math.round(jitter(txVolume24h * 2.5, 0.1));
    const exchangeReserveChange = Math.round((rng() - 0.5) * 4 * 100) / 100;

    const whaleTransactions = Math.round(20 + rng() * 80);
    const whaleBuyVolume = Math.round(jitter(txVolume24h * 0.03, 0.3));
    const whaleSellVolume = Math.round(jitter(txVolume24h * 0.025, 0.3));

    const supplyInProfit = Math.round((55 + rng() * 35) * 10) / 10;
    const supplyOnExchanges = Math.round((8 + rng() * 12) * 10) / 10;
    const hodlWaves = {
      lt1m: Math.round((5 + rng() * 15) * 10) / 10,
      m1to3: Math.round((8 + rng() * 12) * 10) / 10,
      m3to6: Math.round((10 + rng() * 10) * 10) / 10,
      m6to12: Math.round((12 + rng() * 10) * 10) / 10,
      y1to2: Math.round((15 + rng() * 10) * 10) / 10,
      gt2y: 0,
    };
    hodlWaves.gt2y = Math.round((100 - hodlWaves.lt1m - hodlWaves.m1to3 - hodlWaves.m3to6 - hodlWaves.m6to12 - hodlWaves.y1to2) * 10) / 10;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        activeAddresses: Math.round(jitter(ch.baseActive, 0.08)),
        txVolume: Math.round(jitter(ch.baseTxVol, 0.12)),
        fees: Math.round(jitter(ch.baseFees, 0.15)),
        nvt: Math.round(jitter(ch.baseNVT, 0.1) * 10) / 10,
      };
    });

    return {
      id: ch.id, name: ch.name, price,
      network: { activeAddresses, txVolume24h, fees24h, hashrate: ch.baseHashrate > 0 ? Math.round(jitter(ch.baseHashrate, 0.05) * 10) / 10 : null },
      valuation: { nvtRatio, nvtSignal, mvrvRatio, mvrvSignal, sopr },
      exchange: { inflow: exchangeInflow, outflow: exchangeOutflow, netFlow: netExchangeFlow, reserves: exchangeReserves, reserveChange: exchangeReserveChange },
      whales: { transactions: whaleTransactions, buyVolume: whaleBuyVolume, sellVolume: whaleSellVolume },
      supply: { inProfit: supplyInProfit, onExchanges: supplyOnExchanges, hodlWaves },
      history,
    };
  });

  const exchangeFlows = EXCHANGES.map(ex => ({
    exchange: ex,
    btcBalance: Math.round(jitter(150000, 0.15)),
    ethBalance: Math.round(jitter(2000000, 0.15)),
    btcNetFlow24h: Math.round((rng() - 0.5) * 5000),
    ethNetFlow24h: Math.round((rng() - 0.5) * 40000),
    volumeShare: Math.round((8 + rng() * 25) * 10) / 10,
  }));

  return { chains, exchangeFlows, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[OnchainAnalytics] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate on-chain analytics data' });
  }
});

export default router;
