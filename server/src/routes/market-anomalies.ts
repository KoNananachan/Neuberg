import { Router } from 'express';
import { getHistory } from '../services/stocks/yahoo-finance.js';

const router = Router();

// ── Types ──

interface Finding {
  label: string;
  avgReturn: number;
  winRate: number;
  sampleSize: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
}

interface Anomaly {
  name: string;
  category: 'calendar' | 'time' | 'structural';
  description: string;
  currentlyActive: boolean;
  findings: Finding[];
  insight: string;
}

interface MarketAnomaliesResponse {
  timestamp: string;
  anomalies: Anomaly[];
  activeNow: string[];
  summary: string;
}

// ── Cache ──

let cache: { data: MarketAnomaliesResponse | null; expiresAt: number } = { data: null, expiresAt: 0 };
const CACHE_TTL = 30 * 60_000; // 30 minutes

// ── Helpers ──

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcStrength(avgReturn: number, sampleSize: number, winRate: number): 'strong' | 'moderate' | 'weak' | 'none' {
  // Simple heuristic combining effect size, sample, and win rate deviation from 50%
  const absReturn = Math.abs(avgReturn);
  const winDeviation = Math.abs(winRate - 50);

  if (sampleSize < 10) return 'none';
  if (absReturn > 0.08 && winDeviation > 5 && sampleSize >= 30) return 'strong';
  if (absReturn > 0.04 && winDeviation > 3 && sampleSize >= 20) return 'moderate';
  if (absReturn > 0.02 || winDeviation > 2) return 'weak';
  return 'none';
}

function stats(returns: number[]): { avg: number; winRate: number; size: number } {
  if (returns.length === 0) return { avg: 0, winRate: 0, size: 0 };
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const wins = returns.filter((r) => r > 0).length;
  return { avg, winRate: (wins / returns.length) * 100, size: returns.length };
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Bar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
}

// ── Route ──

// GET /api/market-anomalies
router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Fetch 2 years of SPY daily history
    const history = await getHistory('SPY', { range: '2y', interval: '1d' });

    if (!history || history.length < 100) {
      return res.status(502).json({ error: 'Insufficient historical data for SPY' });
    }

    // Parse into structured bars
    const bars: Bar[] = [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (h.open == null || h.close == null || h.high == null || h.low == null ||
          h.open <= 0 || h.close <= 0 || h.high <= 0 || h.low <= 0) continue;

      const dateStr = typeof h.date === 'number'
        ? new Date(h.date * 1000).toISOString().slice(0, 10)
        : String(h.date);

      const prevClose = i > 0 && history[i - 1].close != null && (history[i - 1].close as number) > 0
        ? history[i - 1].close as number
        : h.open as number;

      bars.push({
        date: new Date(dateStr),
        open: h.open as number,
        high: h.high as number,
        low: h.low as number,
        close: h.close as number,
        prevClose,
      });
    }

    if (bars.length < 100) {
      return res.status(502).json({ error: 'Insufficient valid data points' });
    }

    const today = new Date();
    const todayDow = today.getDay(); // 0=Sun, 1=Mon ... 5=Fri
    const todayMonth = today.getMonth(); // 0-11
    const todayDate = today.getDate();
    const anomalies: Anomaly[] = [];

    // ── 1. Day-of-Week Effect ──
    {
      const dowReturns: number[][] = [[], [], [], [], [], [], []]; // Sun-Sat
      for (const bar of bars) {
        const dow = bar.date.getDay();
        const dailyRet = ((bar.close - bar.prevClose) / bar.prevClose) * 100;
        dowReturns[dow].push(dailyRet);
      }

      const findings: Finding[] = [];
      for (let d = 1; d <= 5; d++) { // Mon=1 through Fri=5
        const s = stats(dowReturns[d]);
        findings.push({
          label: WEEKDAY_NAMES[d],
          avgReturn: round4(s.avg),
          winRate: round2(s.winRate),
          sampleSize: s.size,
          strength: calcStrength(s.avg, s.size, s.winRate),
        });
      }

      const monAvg = findings[0].avgReturn;
      const friAvg = findings[4].avgReturn;
      const best = [...findings].sort((a, b) => b.avgReturn - a.avgReturn)[0];
      const worst = [...findings].sort((a, b) => a.avgReturn - b.avgReturn)[0];

      anomalies.push({
        name: 'Day-of-Week Effect',
        category: 'calendar',
        description: 'Historical tendency for certain weekdays to outperform others. Monday is traditionally weakest, Friday strongest.',
        currentlyActive: todayDow >= 1 && todayDow <= 5,
        findings,
        insight: `Best: ${best.label} (${best.avgReturn >= 0 ? '+' : ''}${best.avgReturn.toFixed(3)}%), Worst: ${worst.label} (${worst.avgReturn >= 0 ? '+' : ''}${worst.avgReturn.toFixed(3)}%). Today is ${WEEKDAY_NAMES[todayDow]}.`,
      });
    }

    // ── 2. Month-of-Year Effect ──
    {
      // Group bars by year-month, compute monthly return
      const monthBuckets = new Map<string, { month: number; firstOpen: number; lastClose: number }>();
      for (const bar of bars) {
        const m = bar.date.getMonth();
        const y = bar.date.getFullYear();
        const key = `${y}-${m}`;
        const existing = monthBuckets.get(key);
        if (!existing) {
          monthBuckets.set(key, { month: m, firstOpen: bar.open, lastClose: bar.close });
        } else {
          existing.lastClose = bar.close;
        }
      }

      const monthReturns: number[][] = Array.from({ length: 12 }, () => []);
      for (const bucket of monthBuckets.values()) {
        if (bucket.firstOpen > 0) {
          const ret = ((bucket.lastClose - bucket.firstOpen) / bucket.firstOpen) * 100;
          monthReturns[bucket.month].push(ret);
        }
      }

      const findings: Finding[] = monthReturns.map((rets, i) => {
        const s = stats(rets);
        return {
          label: MONTH_NAMES[i],
          avgReturn: round4(s.avg),
          winRate: round2(s.winRate),
          sampleSize: s.size,
          strength: calcStrength(s.avg, s.size, s.winRate),
        };
      });

      const currentMonthData = findings[todayMonth];

      anomalies.push({
        name: 'Month-of-Year Effect',
        category: 'calendar',
        description: 'January effect, sell-in-May, and other monthly seasonal tendencies in S&P 500 returns.',
        currentlyActive: true,
        findings,
        insight: `Current month (${MONTH_NAMES[todayMonth]}): avg ${currentMonthData.avgReturn >= 0 ? '+' : ''}${currentMonthData.avgReturn.toFixed(2)}%, win rate ${currentMonthData.winRate.toFixed(0)}%.`,
      });
    }

    // ── 3. Turn-of-Month Effect ──
    {
      const tomReturns: number[] = [];
      const restReturns: number[] = [];

      for (const bar of bars) {
        const d = bar.date.getDate();
        const daysInMonth = new Date(bar.date.getFullYear(), bar.date.getMonth() + 1, 0).getDate();
        const dailyRet = ((bar.close - bar.prevClose) / bar.prevClose) * 100;

        // Last 2 days of month or first 3 days of month
        if (d >= daysInMonth - 1 || d <= 3) {
          tomReturns.push(dailyRet);
        } else {
          restReturns.push(dailyRet);
        }
      }

      const tomStats = stats(tomReturns);
      const restStats = stats(restReturns);

      const daysInCurrentMonth = new Date(today.getFullYear(), todayMonth + 1, 0).getDate();
      const isTom = todayDate >= daysInCurrentMonth - 1 || todayDate <= 3;

      anomalies.push({
        name: 'Turn-of-Month Effect',
        category: 'calendar',
        description: 'Returns tend to be higher in the last 2 and first 3 trading days of each month, driven by institutional fund flows.',
        currentlyActive: isTom,
        findings: [
          {
            label: 'Turn of Month',
            avgReturn: round4(tomStats.avg),
            winRate: round2(tomStats.winRate),
            sampleSize: tomStats.size,
            strength: calcStrength(tomStats.avg, tomStats.size, tomStats.winRate),
          },
          {
            label: 'Rest of Month',
            avgReturn: round4(restStats.avg),
            winRate: round2(restStats.winRate),
            sampleSize: restStats.size,
            strength: calcStrength(restStats.avg, restStats.size, restStats.winRate),
          },
        ],
        insight: isTom
          ? `Turn-of-month window is ACTIVE. Historical avg: ${tomStats.avg >= 0 ? '+' : ''}${tomStats.avg.toFixed(3)}% vs ${restStats.avg >= 0 ? '+' : ''}${restStats.avg.toFixed(3)}% rest.`
          : `Mid-month period. Turn-of-month avg: ${tomStats.avg >= 0 ? '+' : ''}${tomStats.avg.toFixed(3)}% vs ${restStats.avg >= 0 ? '+' : ''}${restStats.avg.toFixed(3)}% rest.`,
      });
    }

    // ── 4. Holiday Effect ──
    {
      // Simplified: detect 3-day weekends (Friday before, or Monday after)
      // If gap between consecutive bars > 1 calendar day for Mon bars, it was a long weekend
      const preHolidayReturns: number[] = [];
      const normalReturns: number[] = [];

      for (let i = 1; i < bars.length; i++) {
        const curr = bars[i];
        const prev = bars[i - 1];
        const gapDays = Math.round((curr.date.getTime() - prev.date.getTime()) / (24 * 3600 * 1000));
        const dailyRet = ((curr.close - curr.prevClose) / curr.prevClose) * 100;

        if (gapDays >= 3) {
          // The bar before the long gap is the pre-holiday bar
          const prevRet = ((prev.close - prev.prevClose) / prev.prevClose) * 100;
          preHolidayReturns.push(prevRet);
        } else {
          normalReturns.push(dailyRet);
        }
      }

      const preStats = stats(preHolidayReturns);
      const normStats = stats(normalReturns);

      // Check if next trading day is a long gap (we can't fully know, so mark inactive)
      anomalies.push({
        name: 'Holiday Effect',
        category: 'calendar',
        description: 'Markets tend to rally on the last trading day before a long weekend or holiday, potentially due to short covering.',
        currentlyActive: false, // Would need a holiday calendar to determine
        findings: [
          {
            label: 'Pre-Holiday',
            avgReturn: round4(preStats.avg),
            winRate: round2(preStats.winRate),
            sampleSize: preStats.size,
            strength: calcStrength(preStats.avg, preStats.size, preStats.winRate),
          },
          {
            label: 'Normal Day',
            avgReturn: round4(normStats.avg),
            winRate: round2(normStats.winRate),
            sampleSize: normStats.size,
            strength: calcStrength(normStats.avg, normStats.size, normStats.winRate),
          },
        ],
        insight: `Pre-holiday avg: ${preStats.avg >= 0 ? '+' : ''}${preStats.avg.toFixed(3)}% (n=${preStats.size}) vs normal: ${normStats.avg >= 0 ? '+' : ''}${normStats.avg.toFixed(3)}%.`,
      });
    }

    // ── 5. Options Expiration Week ──
    {
      const opexReturns: number[] = [];
      const nonOpexReturns: number[] = [];

      for (const bar of bars) {
        const d = bar.date.getDate();
        const dow = bar.date.getDay();
        const dailyRet = ((bar.close - bar.prevClose) / bar.prevClose) * 100;

        // 3rd Friday of month: falls on dates 15-21 and is a Friday
        // 3rd week: days within +-2 of the 3rd Friday
        const thirdFriday = getThirdFriday(bar.date.getFullYear(), bar.date.getMonth());
        const diffFromOpex = d - thirdFriday;

        if (diffFromOpex >= -4 && diffFromOpex <= 0) {
          // Mon-Fri of opex week
          opexReturns.push(dailyRet);
        } else {
          nonOpexReturns.push(dailyRet);
        }
      }

      const opexStats = stats(opexReturns);
      const nonOpexStats = stats(nonOpexReturns);

      // Check if today is in opex week
      const currentThirdFriday = getThirdFriday(today.getFullYear(), todayMonth);
      const diffFromCurrentOpex = todayDate - currentThirdFriday;
      const isOpexWeek = diffFromCurrentOpex >= -4 && diffFromCurrentOpex <= 0;

      anomalies.push({
        name: 'Options Expiration Week',
        category: 'structural',
        description: 'Returns during the 3rd week of each month (options expiration) tend to differ due to gamma hedging and pin risk.',
        currentlyActive: isOpexWeek,
        findings: [
          {
            label: 'OpEx Week',
            avgReturn: round4(opexStats.avg),
            winRate: round2(opexStats.winRate),
            sampleSize: opexStats.size,
            strength: calcStrength(opexStats.avg, opexStats.size, opexStats.winRate),
          },
          {
            label: 'Non-OpEx',
            avgReturn: round4(nonOpexStats.avg),
            winRate: round2(nonOpexStats.winRate),
            sampleSize: nonOpexStats.size,
            strength: calcStrength(nonOpexStats.avg, nonOpexStats.size, nonOpexStats.winRate),
          },
        ],
        insight: isOpexWeek
          ? `Options expiration week is ACTIVE. OpEx avg: ${opexStats.avg >= 0 ? '+' : ''}${opexStats.avg.toFixed(3)}% vs non-OpEx: ${nonOpexStats.avg >= 0 ? '+' : ''}${nonOpexStats.avg.toFixed(3)}%.`
          : `Not in OpEx week. Historical OpEx avg: ${opexStats.avg >= 0 ? '+' : ''}${opexStats.avg.toFixed(3)}% vs ${nonOpexStats.avg >= 0 ? '+' : ''}${nonOpexStats.avg.toFixed(3)}%.`,
      });
    }

    // ── 6. End-of-Quarter Window Dressing ──
    {
      const eoqReturns: number[] = [];
      const nonEoqReturns: number[] = [];

      // Quarter-end months: 2 (Mar), 5 (Jun), 8 (Sep), 11 (Dec)
      const quarterEndMonths = new Set([2, 5, 8, 11]);

      for (const bar of bars) {
        const m = bar.date.getMonth();
        const d = bar.date.getDate();
        const dailyRet = ((bar.close - bar.prevClose) / bar.prevClose) * 100;
        const daysInMonth = new Date(bar.date.getFullYear(), m + 1, 0).getDate();

        if (quarterEndMonths.has(m) && d > daysInMonth - 5) {
          eoqReturns.push(dailyRet);
        } else {
          nonEoqReturns.push(dailyRet);
        }
      }

      const eoqStats = stats(eoqReturns);
      const nonEoqStats = stats(nonEoqReturns);

      const daysInCurrentMonth = new Date(today.getFullYear(), todayMonth + 1, 0).getDate();
      const isEoq = quarterEndMonths.has(todayMonth) && todayDate > daysInCurrentMonth - 5;

      anomalies.push({
        name: 'End-of-Quarter Window Dressing',
        category: 'structural',
        description: 'Fund managers buy recent winners and sell losers in the last 5 days of each quarter to improve portfolio appearance.',
        currentlyActive: isEoq,
        findings: [
          {
            label: 'Quarter End',
            avgReturn: round4(eoqStats.avg),
            winRate: round2(eoqStats.winRate),
            sampleSize: eoqStats.size,
            strength: calcStrength(eoqStats.avg, eoqStats.size, eoqStats.winRate),
          },
          {
            label: 'Other Days',
            avgReturn: round4(nonEoqStats.avg),
            winRate: round2(nonEoqStats.winRate),
            sampleSize: nonEoqStats.size,
            strength: calcStrength(nonEoqStats.avg, nonEoqStats.size, nonEoqStats.winRate),
          },
        ],
        insight: isEoq
          ? `Quarter-end window dressing ACTIVE. Avg: ${eoqStats.avg >= 0 ? '+' : ''}${eoqStats.avg.toFixed(3)}% vs normal: ${nonEoqStats.avg >= 0 ? '+' : ''}${nonEoqStats.avg.toFixed(3)}%.`
          : `Not in quarter-end window. Historical avg: ${eoqStats.avg >= 0 ? '+' : ''}${eoqStats.avg.toFixed(3)}% vs ${nonEoqStats.avg >= 0 ? '+' : ''}${nonEoqStats.avg.toFixed(3)}%.`,
      });
    }

    // ── 7. First Hour vs Last Hour Proxy ──
    {
      // Use (high - open) as proxy for early strength, (close - low) as proxy for late strength
      const earlyStrength: number[] = [];
      const lateStrength: number[] = [];

      for (const bar of bars) {
        const earlyPct = ((bar.high - bar.open) / bar.open) * 100;
        const latePct = ((bar.close - bar.low) / bar.low) * 100;
        earlyStrength.push(earlyPct);
        lateStrength.push(latePct);
      }

      const earlyStats = stats(earlyStrength);
      const lateStats = stats(lateStrength);

      anomalies.push({
        name: 'First Hour vs Last Hour (Proxy)',
        category: 'time',
        description: 'Proxy for intraday time effects: (High-Open)/Open estimates early session strength, (Close-Low)/Low estimates late session strength.',
        currentlyActive: todayDow >= 1 && todayDow <= 5,
        findings: [
          {
            label: 'Early Session',
            avgReturn: round4(earlyStats.avg),
            winRate: round2(earlyStats.winRate),
            sampleSize: earlyStats.size,
            strength: calcStrength(earlyStats.avg, earlyStats.size, earlyStats.winRate),
          },
          {
            label: 'Late Session',
            avgReturn: round4(lateStats.avg),
            winRate: round2(lateStats.winRate),
            sampleSize: lateStats.size,
            strength: calcStrength(lateStats.avg, lateStats.size, lateStats.winRate),
          },
        ],
        insight: `Early session avg move: +${earlyStats.avg.toFixed(3)}%, Late session avg move: +${lateStats.avg.toFixed(3)}%. ${earlyStats.avg > lateStats.avg ? 'Early' : 'Late'} session shows more strength.`,
      });
    }

    // ── 8. Overnight vs Intraday Returns ──
    {
      const overnightReturns: number[] = [];
      const intradayReturns: number[] = [];

      for (const bar of bars) {
        // Overnight: prev close -> today open
        const overnight = ((bar.open - bar.prevClose) / bar.prevClose) * 100;
        // Intraday: today open -> today close
        const intraday = ((bar.close - bar.open) / bar.open) * 100;
        overnightReturns.push(overnight);
        intradayReturns.push(intraday);
      }

      const overnightStats = stats(overnightReturns);
      const intradayStats = stats(intradayReturns);

      anomalies.push({
        name: 'Overnight vs Intraday Returns',
        category: 'time',
        description: 'Decomposing daily returns into overnight (close-to-open) and intraday (open-to-close) components reveals when value is created.',
        currentlyActive: todayDow >= 1 && todayDow <= 5,
        findings: [
          {
            label: 'Overnight',
            avgReturn: round4(overnightStats.avg),
            winRate: round2(overnightStats.winRate),
            sampleSize: overnightStats.size,
            strength: calcStrength(overnightStats.avg, overnightStats.size, overnightStats.winRate),
          },
          {
            label: 'Intraday',
            avgReturn: round4(intradayStats.avg),
            winRate: round2(intradayStats.winRate),
            sampleSize: intradayStats.size,
            strength: calcStrength(intradayStats.avg, intradayStats.size, intradayStats.winRate),
          },
        ],
        insight: `Overnight avg: ${overnightStats.avg >= 0 ? '+' : ''}${overnightStats.avg.toFixed(3)}%, Intraday avg: ${intradayStats.avg >= 0 ? '+' : ''}${intradayStats.avg.toFixed(3)}%. ${overnightStats.avg > intradayStats.avg ? 'Overnight' : 'Intraday'} contributes more.`,
      });
    }

    // ── 9. Gap Fade Effect ──
    {
      const gapUpFades: number[] = [];
      const gapDownFades: number[] = [];
      const gapUpContinues: number[] = [];
      const gapDownContinues: number[] = [];

      for (const bar of bars) {
        const gapPct = ((bar.open - bar.prevClose) / bar.prevClose) * 100;
        const intradayReturn = ((bar.close - bar.open) / bar.open) * 100;

        if (gapPct > 0.1) {
          // Gap up
          if (intradayReturn < 0) {
            gapUpFades.push(intradayReturn);
          } else {
            gapUpContinues.push(intradayReturn);
          }
        } else if (gapPct < -0.1) {
          // Gap down
          if (intradayReturn > 0) {
            gapDownFades.push(intradayReturn);
          } else {
            gapDownContinues.push(intradayReturn);
          }
        }
      }

      const totalGapUp = gapUpFades.length + gapUpContinues.length;
      const totalGapDown = gapDownFades.length + gapDownContinues.length;
      const gapUpFadeRate = totalGapUp > 0 ? (gapUpFades.length / totalGapUp) * 100 : 0;
      const gapDownFadeRate = totalGapDown > 0 ? (gapDownFades.length / totalGapDown) * 100 : 0;

      // Average intraday return after gap up / gap down
      const allGapUpIntraday = [...gapUpFades, ...gapUpContinues];
      const allGapDownIntraday = [...gapDownFades, ...gapDownContinues];
      const gapUpIntraStats = stats(allGapUpIntraday);
      const gapDownIntraStats = stats(allGapDownIntraday);

      // Check if today has a gap
      const lastBar = bars[bars.length - 1];
      const todayGap = lastBar ? ((lastBar.open - lastBar.prevClose) / lastBar.prevClose) * 100 : 0;
      const hasGap = Math.abs(todayGap) > 0.1;

      anomalies.push({
        name: 'Gap Fade Effect',
        category: 'structural',
        description: 'When the market gaps up or down at the open, does it tend to reverse (fade) during the session?',
        currentlyActive: hasGap,
        findings: [
          {
            label: 'After Gap Up',
            avgReturn: round4(gapUpIntraStats.avg),
            winRate: round2(100 - gapUpFadeRate), // win rate = continuation rate
            sampleSize: totalGapUp,
            strength: calcStrength(gapUpIntraStats.avg, totalGapUp, 100 - gapUpFadeRate),
          },
          {
            label: 'After Gap Down',
            avgReturn: round4(gapDownIntraStats.avg),
            winRate: round2(gapDownFadeRate), // win rate = bounce rate (positive after gap down)
            sampleSize: totalGapDown,
            strength: calcStrength(gapDownIntraStats.avg, totalGapDown, gapDownFadeRate),
          },
        ],
        insight: `Gap up fade rate: ${gapUpFadeRate.toFixed(0)}% (n=${totalGapUp}). Gap down bounce rate: ${gapDownFadeRate.toFixed(0)}% (n=${totalGapDown}).${hasGap ? ` Today gapped ${todayGap > 0 ? 'UP' : 'DOWN'} ${Math.abs(todayGap).toFixed(2)}%.` : ''}`,
      });
    }

    // Build response
    const activeNow = anomalies.filter((a) => a.currentlyActive).map((a) => a.name);

    const activeCount = activeNow.length;
    const strongCount = anomalies.reduce((c, a) => c + a.findings.filter((f) => f.strength === 'strong').length, 0);
    const summary = `${activeCount} anomalies active now. ${strongCount} findings show strong statistical significance across ${bars.length} trading days of SPY data.`;

    const data: MarketAnomaliesResponse = {
      timestamp: new Date().toISOString(),
      anomalies,
      activeNow,
      summary,
    };

    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[MarketAnomalies] Error:', msg);
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Failed to compute market anomalies' });
  }
});

// Helper: get the date (day of month) of the 3rd Friday
function getThirdFriday(year: number, month: number): number {
  // Find the first day of the month
  const first = new Date(year, month, 1);
  const firstDow = first.getDay(); // 0=Sun ... 6=Sat
  // First Friday: if firstDow <= 5, first Friday = 1 + (5 - firstDow) % 7
  // But Sunday = 0, so (5 - firstDow + 7) % 7
  let firstFriday = 1 + ((5 - firstDow + 7) % 7);
  // 3rd Friday = first Friday + 14
  return firstFriday + 14;
}

export default router;
