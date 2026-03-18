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

const BDCS = [
  { ticker: 'ARCC', name: 'Ares Capital', baseNAV: 20.5, baseDivYield: 9.8, aum: 22.5 },
  { ticker: 'MAIN', name: 'Main Street Capital', baseNAV: 28.0, baseDivYield: 6.5, aum: 7.8 },
  { ticker: 'FSK', name: 'FS KKR Capital', baseNAV: 23.5, baseDivYield: 13.2, aum: 15.2 },
  { ticker: 'BXSL', name: 'Blackstone Secured', baseNAV: 26.0, baseDivYield: 10.5, aum: 10.5 },
  { ticker: 'OBDC', name: 'Blue Owl Capital', baseNAV: 15.0, baseDivYield: 11.0, aum: 13.0 },
  { ticker: 'GSBD', name: 'Goldman Sachs BDC', baseNAV: 14.5, baseDivYield: 12.5, aum: 3.8 },
  { ticker: 'HTGC', name: 'Hercules Capital', baseNAV: 17.0, baseDivYield: 10.0, aum: 3.5 },
  { ticker: 'TPVG', name: 'TriplePoint Venture', baseNAV: 9.5, baseDivYield: 14.5, aum: 1.2 },
  { ticker: 'OCSL', name: 'Oaktree Specialty', baseNAV: 20.0, baseDivYield: 11.5, aum: 3.2 },
  { ticker: 'PSEC', name: 'Prospect Capital', baseNAV: 8.5, baseDivYield: 12.0, aum: 7.5 },
];

const LOAN_INDICES = [
  { id: 'LSTA', name: 'S&P/LSTA Leveraged Loan Index', baseLevel: 97.5, baseYield: 9.2 },
  { id: 'ELLI', name: 'S&P European Leveraged Loan Index', baseLevel: 96.8, baseYield: 8.8 },
  { id: 'CSLLI', name: 'CS Leveraged Loan Index', baseLevel: 97.2, baseYield: 9.0 },
  { id: 'BKLN', name: 'Invesco Senior Loan ETF', baseLevel: 21.2, baseYield: 8.5 },
];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-private-credit'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const bdcs = BDCS.map(b => {
    const nav = Math.round(jitter(b.baseNAV, 0.04) * 100) / 100;
    const price = Math.round(nav * (0.85 + rng() * 0.25) * 100) / 100;
    const premDisc = Math.round((price / nav - 1) * 100 * 10) / 10;
    const divYield = Math.round(jitter(b.baseDivYield, 0.08) * 100) / 100;
    const totalReturn1y = Math.round((divYield + (rng() - 0.4) * 10) * 100) / 100;
    const nonAccrual = Math.round((0.5 + rng() * 4) * 10) / 10;
    const leverage = Math.round((0.8 + rng() * 0.6) * 100) / 100;
    const weightedAvgYield = Math.round(jitter(11.5, 0.1) * 100) / 100;
    const pctFloating = Math.round((80 + rng() * 18) * 10) / 10;
    const pctFirstLien = Math.round((60 + rng() * 30) * 10) / 10;

    return {
      ticker: b.ticker, name: b.name, aum: Math.round(jitter(b.aum, 0.05) * 10) / 10,
      nav, price, premDisc, divYield, totalReturn1y,
      portfolio: { nonAccrual, leverage, weightedAvgYield, pctFloating, pctFirstLien },
    };
  });

  const loanIndices = LOAN_INDICES.map(l => {
    const level = Math.round(jitter(l.baseLevel, 0.02) * 1000) / 1000;
    const yld = Math.round(jitter(l.baseYield, 0.05) * 100) / 100;
    const change1d = Math.round((rng() - 0.5) * 0.3 * 1000) / 1000;
    const change1m = Math.round((rng() - 0.45) * 1.5 * 100) / 100;
    const change3m = Math.round((rng() - 0.4) * 3 * 100) / 100;
    const spreadToSOFR = Math.round(350 + rng() * 150);

    const history = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        date: d.toISOString().slice(0, 7),
        level: Math.round(jitter(l.baseLevel, 0.015) * 1000) / 1000,
        yield: Math.round(jitter(l.baseYield, 0.04) * 100) / 100,
      };
    });

    return { id: l.id, name: l.name, level, yield: yld, change1d, change1m, change3m, spreadToSOFR, history };
  });

  const defaultTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return {
      date: d.toISOString().slice(0, 7),
      leveragedLoanDefault: Math.round((1.0 + rng() * 2.5) * 100) / 100,
      highYieldDefault: Math.round((1.5 + rng() * 3) * 100) / 100,
      recoveryRate: Math.round((45 + rng() * 25) * 10) / 10,
    };
  });

  const marketMetrics = {
    totalPrivateCreditAUM: Math.round(jitter(1.7, 0.05) * 10) / 10,
    avgBDCDivYield: Math.round(bdcs.reduce((a, b) => a + b.divYield, 0) / bdcs.length * 100) / 100,
    avgBDCPremDisc: Math.round(bdcs.reduce((a, b) => a + b.premDisc, 0) / bdcs.length * 10) / 10,
    avgLoanYield: Math.round(loanIndices.reduce((a, l) => a + l.yield, 0) / loanIndices.length * 100) / 100,
    currentDefaultRate: defaultTrend[defaultTrend.length - 1].leveragedLoanDefault,
    sofrRate: Math.round(jitter(5.3, 0.02) * 100) / 100,
  };

  return { bdcs, loanIndices, defaultTrend, marketMetrics, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PrivateCredit] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate private credit data' });
  }
});

export default router;
