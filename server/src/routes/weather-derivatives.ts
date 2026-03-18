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

const CITIES = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.006, avgWinterTemp: 33, avgSummerTemp: 76, normalAnnualHDD: 4800, normalAnnualCDD: 1100 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298, avgWinterTemp: 26, avgSummerTemp: 73, normalAnnualHDD: 6200, normalAnnualCDD: 830 },
  { city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388, avgWinterTemp: 44, avgSummerTemp: 80, normalAnnualHDD: 2800, normalAnnualCDD: 1700 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797, avgWinterTemp: 47, avgSummerTemp: 86, normalAnnualHDD: 2300, normalAnnualCDD: 2500 },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398, avgWinterTemp: 48, avgSummerTemp: 92, normalAnnualHDD: 2200, normalAnnualCDD: 3100 },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784, avgWinterTemp: 40, avgSummerTemp: 68, normalAnnualHDD: 4400, normalAnnualCDD: 350 },
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265, avgWinterTemp: 18, avgSummerTemp: 72, normalAnnualHDD: 7600, normalAnnualCDD: 700 },
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458, avgWinterTemp: 26, avgSummerTemp: 72, normalAnnualHDD: 6300, normalAnnualCDD: 750 },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function getSeason(month: number): 'Heating' | 'Cooling' | 'Transition' {
  if (month >= 10 || month <= 2) return 'Heating';
  if (month >= 5 && month <= 8) return 'Cooling';
  return 'Transition';
}

function getMonthlyNormalTemp(city: typeof CITIES[number], month: number): number {
  // Sinusoidal approximation: coldest in Jan (month 0), warmest in Jul (month 6)
  const amplitude = (city.avgSummerTemp - city.avgWinterTemp) / 2;
  const midpoint = (city.avgSummerTemp + city.avgWinterTemp) / 2;
  return midpoint + amplitude * Math.cos(((month - 6) / 12) * 2 * Math.PI);
}

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-weather-derivatives'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const season = getSeason(currentMonth);
  const seasonLabel = season === 'Transition' ? 'Heating' : season; // March transition leans heating

  // Calculate YTD progress fraction (0-1) through the year
  const dayOfYear = Math.floor((now.getTime() - new Date(currentYear, 0, 1).getTime()) / 86400000) + 1;
  const ytdFraction = dayOfYear / 365;

  // Generate city data
  const cities = CITIES.map(c => {
    const normalTemp = Math.round(getMonthlyNormalTemp(c, currentMonth) * 10) / 10;
    const currentTemp = Math.round(jitter(normalTemp, 0.08) * 10) / 10;
    const departure = Math.round((currentTemp - normalTemp) * 10) / 10;

    // HDD/CDD cumulative YTD (scaled by fraction of year elapsed)
    const hddNormal = Math.round(c.normalAnnualHDD * ytdFraction);
    const cddNormal = Math.round(c.normalAnnualCDD * ytdFraction);
    const hddCumulative = Math.round(jitter(hddNormal, 0.06));
    const cddCumulative = Math.round(jitter(cddNormal, 0.08));

    return {
      city: c.city,
      state: c.state,
      lat: c.lat,
      lng: c.lng,
      currentTemp,
      normalTemp,
      departure,
      hddCumulative,
      cddCumulative,
      hddNormal,
      cddNormal,
    };
  });

  // Generate futures contracts for each city (current month + next 5 months)
  const contracts = CITIES.map(c => {
    const cityContracts = Array.from({ length: 6 }, (_, i) => {
      const contractMonth = (currentMonth + i) % 12;
      const contractYear = currentYear + Math.floor((currentMonth + i) / 12);
      const tenor = `${MONTH_NAMES[contractMonth]} ${contractYear}`;

      const contractSeason = getSeason(contractMonth);
      const type = (contractSeason === 'Cooling' || (contractSeason === 'Transition' && contractMonth >= 3)) ? 'CDD' : 'HDD';

      const monthNormalTemp = getMonthlyNormalTemp(c, contractMonth);
      const daysInMonth = new Date(contractYear, contractMonth + 1, 0).getDate();

      let baseDD: number;
      if (type === 'HDD') {
        baseDD = Math.max(0, 65 - monthNormalTemp) * daysInMonth;
      } else {
        baseDD = Math.max(0, monthNormalTemp - 65) * daysInMonth;
      }

      const strike = Math.round(jitter(baseDD, 0.05));
      const lastPrice = Math.round(jitter(baseDD, 0.08));
      const change1d = Math.round((rng() - 0.5) * baseDD * 0.03);
      const volume = Math.round(jitter(800 / (1 + i * 0.4), 0.3));
      const openInterest = Math.round(jitter(3500 / (1 + i * 0.25), 0.2));

      // Implied temperature from the last price
      let impliedTemp: number;
      if (type === 'HDD') {
        impliedTemp = Math.round((65 - lastPrice / daysInMonth) * 10) / 10;
      } else {
        impliedTemp = Math.round((65 + lastPrice / daysInMonth) * 10) / 10;
      }

      return { tenor, type, strike, lastPrice, change1d, volume, openInterest, impliedTemp };
    });

    return { city: c.city, state: c.state, contracts: cityContracts };
  });

  // Seasonal strips
  // Winter strip: Nov-Mar HDD
  // Summer strip: May-Sep CDD
  const winterMonths = [10, 11, 0, 1, 2]; // Nov, Dec, Jan, Feb, Mar
  const summerMonths = [4, 5, 6, 7, 8]; // May, Jun, Jul, Aug, Sep

  const seasonalStrips = CITIES.map(c => {
    // Winter strip
    const winterStripYear = currentMonth >= 6 ? currentYear : currentYear - 1;
    const winterHDDs = winterMonths.map(m => {
      const yr = m >= 10 ? winterStripYear : winterStripYear + 1;
      const daysInMonth = new Date(yr, m + 1, 0).getDate();
      const normalTemp = getMonthlyNormalTemp(c, m);
      return Math.max(0, 65 - normalTemp) * daysInMonth;
    });
    const winterStripBase = winterHDDs.reduce((a, b) => a + b, 0);
    const winterStripPrice = Math.round(jitter(winterStripBase, 0.06));
    const winterStripChange = Math.round((rng() - 0.5) * winterStripBase * 0.02);
    const winterImpliedAvgTemp = Math.round((65 - winterStripPrice / 151) * 10) / 10; // ~151 days Nov-Mar

    // Summer strip
    const summerStripYear = currentMonth <= 9 ? currentYear : currentYear + 1;
    const summerCDDs = summerMonths.map(m => {
      const daysInMonth = new Date(summerStripYear, m + 1, 0).getDate();
      const normalTemp = getMonthlyNormalTemp(c, m);
      return Math.max(0, normalTemp - 65) * daysInMonth;
    });
    const summerStripBase = summerCDDs.reduce((a, b) => a + b, 0);
    const summerStripPrice = Math.round(jitter(summerStripBase, 0.07));
    const summerStripChange = Math.round((rng() - 0.5) * summerStripBase * 0.02);
    const summerImpliedAvgTemp = Math.round((65 + summerStripPrice / 153) * 10) / 10; // ~153 days May-Sep

    return {
      city: c.city,
      state: c.state,
      winterStrip: {
        season: `Winter ${winterStripYear}/${winterStripYear + 1}`,
        type: 'HDD',
        price: winterStripPrice,
        change1d: winterStripChange,
        impliedAvgTemp: winterImpliedAvgTemp,
      },
      summerStrip: {
        season: `Summer ${summerStripYear}`,
        type: 'CDD',
        price: summerStripPrice,
        change1d: summerStripChange,
        impliedAvgTemp: summerImpliedAvgTemp,
      },
    };
  });

  // CAT (Cumulative Average Temperature) indices
  const indices = CITIES.map(c => {
    // CAT index = sum of daily average temperatures for the month so far
    const dayOfMonth = now.getDate();
    const normalTemp = getMonthlyNormalTemp(c, currentMonth);
    const catNormal = Math.round(normalTemp * dayOfMonth * 10) / 10;
    const catCurrent = Math.round(jitter(catNormal, 0.04) * 10) / 10;
    const catDeviation = Math.round((catCurrent - catNormal) * 10) / 10;

    // Monthly projected CAT
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const projectedCAT = Math.round((catCurrent / dayOfMonth) * daysInCurrentMonth * 10) / 10;
    const normalMonthlyCAT = Math.round(normalTemp * daysInCurrentMonth * 10) / 10;

    return {
      city: c.city,
      state: c.state,
      catCurrent,
      catNormal,
      catDeviation,
      projectedCAT,
      normalMonthlyCAT,
      dayOfMonth,
      daysInMonth: daysInCurrentMonth,
    };
  });

  // Summary
  const totalNotional = Math.round(jitter(4.2, 0.1) * 10) / 10;
  const activeContracts = contracts.reduce((sum, c) => sum + c.contracts.reduce((s, ct) => s + ct.openInterest, 0), 0);
  const mostActiveCity = contracts.reduce((best, c) => {
    const vol = c.contracts.reduce((s, ct) => s + ct.volume, 0);
    const bestVol = best.contracts.reduce((s: number, ct: { volume: number }) => s + ct.volume, 0);
    return vol > bestVol ? c : best;
  });

  const summary = {
    totalMarketNotional: totalNotional,
    totalMarketNotionalUnit: 'B USD',
    activeContracts,
    mostActiveCity: mostActiveCity.city,
    currentSeason: seasonLabel,
    currentMonth: MONTH_NAMES[currentMonth],
  };

  return { summary, cities, contracts, seasonalStrips, indices, generatedAt: new Date().toISOString() };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[WeatherDerivatives] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate weather derivatives data' });
  }
});

export default router;
