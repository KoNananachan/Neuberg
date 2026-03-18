import { Router } from 'express';
import { getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface MonthlyEntry {
  month: number;
  name: string;
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  bestYear: { year: number; return: number };
  worstYear: { year: number; return: number };
}

interface WeekdayEntry {
  day: number;
  name: string;
  avgReturn: number;
  winRate: number;
}

interface YearMonthEntry {
  year: number;
  returns: (number | null)[];
}

interface SellInMay {
  mayOct: number;
  novApr: number;
}

interface SeasonalityResponse {
  symbol: string;
  years: number;
  dataYears: number;
  monthly: MonthlyEntry[];
  weekday: WeekdayEntry[];
  yearMonth: YearMonthEntry[];
  sellInMay: SellInMay;
}

// ── Cache ──

const cache = new Map<string, { data: SeasonalityResponse; expiresAt: number }>();
const CACHE_TTL = 60 * 60_000; // 1 hour
const MAX_CACHE_SIZE = 100;

// ── Helpers ──

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const VALID_YEARS = new Set([5, 10, 20]);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rangeForYears(years: number): string {
  if (years <= 5) return '5y';
  if (years <= 10) return '10y';
  return '20y';
}

// ── Route ──

// GET /api/seasonality/:symbol?years=10
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const yearsParam = parseInt(req.query.years as string) || 10;
    const years = VALID_YEARS.has(yearsParam) ? yearsParam : 10;

    // Check cache
    const cacheKey = `${symbol}:${years}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return res.json(cached.data);
    }

    // Fetch historical daily data
    const range = rangeForYears(years);
    const history = await getHistory(symbol, { range, interval: '1d' });

    if (!history || history.length < 20) {
      return res.status(404).json({ error: 'Insufficient historical data' });
    }

    // Parse into structured bars with date objects
    const bars: Array<{ date: Date; dateStr: string; open: number; close: number }> = [];
    for (const h of history) {
      if (h.open == null || h.close == null || h.open <= 0 || h.close <= 0) continue;
      const dateStr = typeof h.date === 'number'
        ? new Date(h.date * 1000).toISOString().slice(0, 10)
        : String(h.date);
      bars.push({
        date: new Date(dateStr),
        dateStr,
        open: h.open as number,
        close: h.close as number,
      });
    }

    if (bars.length < 20) {
      return res.status(404).json({ error: 'Insufficient historical data' });
    }

    // ── Monthly returns ──
    // Group bars by year-month, compute monthly return from first open to last close
    const monthlyBuckets = new Map<string, { year: number; month: number; firstOpen: number; lastClose: number }>();

    for (const bar of bars) {
      const y = bar.date.getFullYear();
      const m = bar.date.getMonth(); // 0-11
      const key = `${y}-${m}`;
      const existing = monthlyBuckets.get(key);
      if (!existing) {
        monthlyBuckets.set(key, { year: y, month: m, firstOpen: bar.open, lastClose: bar.close });
      } else {
        existing.lastClose = bar.close;
      }
    }

    // monthReturns[month] = array of { year, return% }
    const monthReturns: Array<Array<{ year: number; ret: number }>> = Array.from({ length: 12 }, () => []);

    for (const bucket of monthlyBuckets.values()) {
      if (bucket.firstOpen > 0) {
        const ret = ((bucket.lastClose - bucket.firstOpen) / bucket.firstOpen) * 100;
        monthReturns[bucket.month].push({ year: bucket.year, ret: round2(ret) });
      }
    }

    const monthly: MonthlyEntry[] = monthReturns.map((entries, i) => {
      if (entries.length === 0) {
        return {
          month: i + 1,
          name: MONTH_NAMES[i],
          avgReturn: 0,
          medianReturn: 0,
          winRate: 0,
          bestYear: { year: 0, return: 0 },
          worstYear: { year: 0, return: 0 },
        };
      }

      const rets = entries.map((e) => e.ret);
      const avg = rets.reduce((a, b) => a + b, 0) / rets.length;
      const med = median(rets);
      const wins = rets.filter((r) => r > 0).length;
      const winRate = (wins / rets.length) * 100;

      const sorted = [...entries].sort((a, b) => b.ret - a.ret);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      return {
        month: i + 1,
        name: MONTH_NAMES[i],
        avgReturn: round2(avg),
        medianReturn: round2(med),
        winRate: round2(winRate),
        bestYear: { year: best.year, return: best.ret },
        worstYear: { year: worst.year, return: worst.ret },
      };
    });

    // ── Day-of-week returns ──
    // day 0=Sun ... 6=Sat; we want Mon(1) through Fri(5)
    const weekdayReturns: Array<number[]> = [[], [], [], [], []]; // Mon-Fri

    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1];
      const curr = bars[i];
      const dow = curr.date.getDay(); // 0=Sun, 1=Mon ... 5=Fri, 6=Sat
      if (dow >= 1 && dow <= 5 && prev.close > 0) {
        const dailyRet = ((curr.close - prev.close) / prev.close) * 100;
        weekdayReturns[dow - 1].push(dailyRet);
      }
    }

    const weekday: WeekdayEntry[] = weekdayReturns.map((rets, i) => {
      if (rets.length === 0) {
        return { day: i + 1, name: WEEKDAY_NAMES[i], avgReturn: 0, winRate: 0 };
      }
      const avg = rets.reduce((a, b) => a + b, 0) / rets.length;
      const wins = rets.filter((r) => r > 0).length;
      return {
        day: i + 1,
        name: WEEKDAY_NAMES[i],
        avgReturn: round2(avg),
        winRate: round2((wins / rets.length) * 100),
      };
    });

    // ── Year-by-month matrix ──
    const allYears = [...new Set(bars.map((b) => b.date.getFullYear()))].sort();
    const yearMonth: YearMonthEntry[] = allYears.map((year) => {
      const returns: (number | null)[] = Array.from({ length: 12 }, (_, m) => {
        const entry = monthReturns[m].find((e) => e.year === year);
        return entry ? entry.ret : null;
      });
      return { year, returns };
    });

    // ── Sell-in-May effect ──
    // May-Oct (months 4-9) vs Nov-Apr (months 10-11, 0-3)
    const mayOctReturns: number[] = [];
    const novAprReturns: number[] = [];

    for (const entries of monthReturns) {
      // This iterates by month index (0-11)
      // We need per-month returns
    }

    // Recalculate: average monthly returns for each period
    for (let m = 0; m < 12; m++) {
      const avgRet = monthReturns[m].length > 0
        ? monthReturns[m].reduce((a, e) => a + e.ret, 0) / monthReturns[m].length
        : 0;

      if (m >= 4 && m <= 9) {
        // May(4) through Oct(9)
        mayOctReturns.push(avgRet);
      } else {
        // Nov(10), Dec(11), Jan(0), Feb(1), Mar(2), Apr(3)
        novAprReturns.push(avgRet);
      }
    }

    const mayOctTotal = mayOctReturns.reduce((a, b) => a + b, 0);
    const novAprTotal = novAprReturns.reduce((a, b) => a + b, 0);

    const sellInMay: SellInMay = {
      mayOct: round2(mayOctTotal),
      novApr: round2(novAprTotal),
    };

    // Determine actual data range
    const firstYear = bars[0].date.getFullYear();
    const lastYear = bars[bars.length - 1].date.getFullYear();
    const dataYears = lastYear - firstYear + 1;

    const data: SeasonalityResponse = {
      symbol,
      years,
      dataYears,
      monthly,
      weekday,
      yearMonth,
      sellInMay,
    };

    // Update cache
    cache.set(cacheKey, { data, expiresAt: now + CACHE_TTL });

    // Evict stale entries
    if (cache.size > MAX_CACHE_SIZE) {
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key);
      }
    }

    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Seasonality] Error:', msg);
    res.status(500).json({ error: 'Failed to fetch seasonality data' });
  }
});

export default router;
