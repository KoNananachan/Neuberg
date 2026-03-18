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

const PAIRS = [
  { id: 'EURUSD', name: 'EUR/USD', spot: 1.0850, baseATM: 7.2 },
  { id: 'USDJPY', name: 'USD/JPY', spot: 149.50, baseATM: 9.5 },
  { id: 'GBPUSD', name: 'GBP/USD', spot: 1.2650, baseATM: 7.8 },
  { id: 'USDCHF', name: 'USD/CHF', spot: 0.8750, baseATM: 7.0 },
  { id: 'AUDUSD', name: 'AUD/USD', spot: 0.6520, baseATM: 9.8 },
  { id: 'USDCAD', name: 'USD/CAD', spot: 1.3580, baseATM: 6.5 },
  { id: 'NZDUSD', name: 'NZD/USD', spot: 0.6080, baseATM: 10.2 },
  { id: 'EURGBP', name: 'EUR/GBP', spot: 0.8580, baseATM: 6.8 },
  { id: 'EURJPY', name: 'EUR/JPY', spot: 162.20, baseATM: 10.0 },
  { id: 'GBPJPY', name: 'GBP/JPY', spot: 189.10, baseATM: 11.5 },
  { id: 'USDMXN', name: 'USD/MXN', spot: 17.15, baseATM: 13.5 },
  { id: 'USDBRL', name: 'USD/BRL', spot: 4.95, baseATM: 14.0 },
  { id: 'USDCNH', name: 'USD/CNH', spot: 7.24, baseATM: 5.5 },
  { id: 'USDTRY', name: 'USD/TRY', spot: 32.50, baseATM: 22.0 },
  { id: 'USDZAR', name: 'USD/ZAR', spot: 18.60, baseATM: 15.0 },
];

const TENORS = ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y', '2Y'];
const DELTAS = ['10P', '25P', 'ATM', '25C', '10C'];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-options'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const pairs = PAIRS.map(p => {
    const spot = Math.round(jitter(p.spot, 0.005) * 10000) / 10000;
    const spotChange = Math.round((rng() - 0.5) * p.spot * 0.005 * 10000) / 10000;

    const volMatrix = TENORS.map(tenor => {
      const tenorIdx = TENORS.indexOf(tenor);
      const termFactor = 0.85 + tenorIdx * 0.03;
      const atmVol = Math.round(jitter(p.baseATM * termFactor, 0.06) * 100) / 100;

      const deltas: Record<string, number> = {};
      DELTAS.forEach(delta => {
        if (delta === 'ATM') {
          deltas[delta] = atmVol;
        } else if (delta === '25C') {
          deltas[delta] = Math.round((atmVol - 0.2 - rng() * 0.5) * 100) / 100;
        } else if (delta === '10C') {
          deltas[delta] = Math.round((atmVol + 0.3 + rng() * 0.8) * 100) / 100;
        } else if (delta === '25P') {
          deltas[delta] = Math.round((atmVol + 0.3 + rng() * 0.6) * 100) / 100;
        } else {
          deltas[delta] = Math.round((atmVol + 1.0 + rng() * 1.5) * 100) / 100;
        }
      });

      const rr25 = Math.round((deltas['25C'] - deltas['25P']) * 100) / 100;
      const bf25 = Math.round(((deltas['25C'] + deltas['25P']) / 2 - atmVol) * 100) / 100;
      const rr10 = Math.round((deltas['10C'] - deltas['10P']) * 100) / 100;
      const bf10 = Math.round(((deltas['10C'] + deltas['10P']) / 2 - atmVol) * 100) / 100;

      return { tenor, atmVol, deltas, rr25, bf25, rr10, bf10 };
    });

    const atmChange1d = Math.round((rng() - 0.5) * 0.8 * 100) / 100;
    const atmChange1w = Math.round((rng() - 0.48) * 1.5 * 100) / 100;
    const impliedBreakeven1m = Math.round(spot * (volMatrix.find(v => v.tenor === '1M')?.atmVol ?? p.baseATM) / 100 / Math.sqrt(12) * 10000) / 10000;

    const history = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: d.toISOString().slice(0, 10),
        atm1m: Math.round(jitter(p.baseATM, 0.1) * 100) / 100,
        rr25_1m: Math.round((rng() - 0.5) * 2 * 100) / 100,
        spot: Math.round(jitter(p.spot, 0.008) * 10000) / 10000,
      };
    });

    return {
      id: p.id, name: p.name, spot, spotChange,
      volMatrix, atmChange1d, atmChange1w, impliedBreakeven1m, history,
    };
  });

  const summary = {
    avgG10Vol: Math.round(pairs.slice(0, 8).reduce((a, p) => {
      const m1 = p.volMatrix.find(v => v.tenor === '1M');
      return a + (m1?.atmVol ?? 0);
    }, 0) / 8 * 100) / 100,
    avgEMVol: Math.round(pairs.slice(10).reduce((a, p) => {
      const m1 = p.volMatrix.find(v => v.tenor === '1M');
      return a + (m1?.atmVol ?? 0);
    }, 0) / Math.max(1, pairs.slice(10).length) * 100) / 100,
    highestVol: { pair: '', vol: 0 },
    lowestVol: { pair: '', vol: Infinity },
  };
  for (const p of pairs) {
    const m1 = p.volMatrix.find(v => v.tenor === '1M');
    const vol = m1?.atmVol ?? 0;
    if (vol > summary.highestVol.vol) summary.highestVol = { pair: p.id, vol };
    if (vol < summary.lowestVol.vol) summary.lowestVol = { pair: p.id, vol };
  }

  return { pairs, summary, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FXOptions] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX options data' });
  }
});

export default router;
