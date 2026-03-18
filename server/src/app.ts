import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import newsRouter from './routes/news.js';
import stocksRouter from './routes/stocks.js';
import recommendationsRouter from './routes/recommendations.js';
import categoriesRouter from './routes/categories.js';
import mapEventsRouter from './routes/map-events.js';
import watchlistRouter from './routes/watchlist.js';
import auditRouter from './routes/audit.js';
import chatRouter from './routes/chat.js';
import conflictsRouter from './routes/conflicts.js';
import sentimentRouter from './routes/sentiment.js';
import sectorsRouter from './routes/sectors.js';
import calendarRouter from './routes/calendar.js';
import alertsRouter from './routes/alerts.js';
import clustersRouter from './routes/clusters.js';
import optionsRouter from './routes/options.js';
import insidersRouter from './routes/insiders.js';
import correlationsRouter from './routes/correlations.js';
import authRouter from './routes/auth.js';
import billingRouter, { billingWebhookHandler } from './routes/billing.js';
import alpacaRouter from './routes/alpaca.js';
import streamsRouter from './routes/streams.js';
import polymarketRouter from './routes/polymarket.js';
import hyperliquidRouter from './routes/hyperliquid.js';
import missedOpportunitiesRouter from './routes/missed-opportunities.js';
import marketMoversRouter from './routes/market-movers.js';
import forexRouter from './routes/forex.js';
import bondsRouter from './routes/bonds.js';
import commoditiesRouter from './routes/commodities.js';
import cryptoRouter from './routes/crypto.js';
import globalMarketsRouter from './routes/global-markets.js';
import scannerRouter from './routes/scanner.js';
import screenerRouter from './routes/screener.js';
import heatMapRouter from './routes/heat-map.js';
import etfRouter from './routes/etf.js';
import dividendsRouter from './routes/dividends.js';
import ipoRouter from './routes/ipo.js';
import breadthRouter from './routes/breadth.js';
import analystRouter from './routes/analyst.js';
import financialsRouter from './routes/financials.js';
import futuresRouter from './routes/futures.js';
import comparisonRouter from './routes/comparison.js';
import shortInterestRouter from './routes/short-interest.js';
import fxConverterRouter from './routes/fx-converter.js';
import pivotPointsRouter from './routes/pivot-points.js';
import companyProfileRouter from './routes/company-profile.js';
import pairsRouter from './routes/pairs.js';
import fibonacciRouter from './routes/fibonacci.js';
import volatilityRouter from './routes/volatility.js';
import relativeStrengthRouter from './routes/relative-strength.js';
import fxCrossRouter from './routes/fx-cross.js';
import fearGreedRouter from './routes/fear-greed.js';
import yieldCurveRouter from './routes/yield-curve.js';
import currencyStrengthRouter from './routes/currency-strength.js';
import moneyFlowRouter from './routes/money-flow.js';
import chartRouter from './routes/chart.js';
import earningsEstimatesRouter from './routes/earnings-estimates.js';
import crossAssetRouter from './routes/cross-asset.js';
import holdingsRouter from './routes/holdings.js';
import sectorPerformanceRouter from './routes/sector-performance.js';
import etfHoldingsRouter from './routes/etf-holdings.js';
import drawdownRouter from './routes/drawdown.js';
import marketRegimeRouter from './routes/market-regime.js';
import { attachUser } from './middleware/auth.js';
import { runScrapeAndAnalyze } from './services/scraper/scraper-scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

// ── CORS allowlist (configure via ALLOWED_ORIGINS env var in production) ──
const ALLOWED_ORIGINS: (string | RegExp)[] = isProd
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

// ── Rate limiters ──
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 300,              // 300 requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // 10 auth attempts per 15 min
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // 10 AI chat messages per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit reached for AI chat, please try again shortly' },
});

export function createApp() {
  const app = express();

  // ── Trust Cloud Run proxy ──
  app.set('trust proxy', isProd ? 1 : false);

  // Support BigInt serialization in JSON responses
  app.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? Number(value) : value,
  );

  // Stripe webhook must come BEFORE express.json() — needs raw body
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingWebhookHandler);

  // ── Security headers ──
  app.use(helmet({
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://www.youtube.com", "https://s.ytimg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://api.hyperliquid.xyz", "wss://api.hyperliquid.xyz",
          "https://accounts.google.com",
          "https://basemaps.cartocdn.com", "https://*.basemaps.cartocdn.com",
          "https://*.cartocdn.com",
        ],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "https://accounts.google.com", "https://www.youtube.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  }));

  // ── CORS ──
  app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600, // Cache preflight for 1h
  }));

  // ── Domain redirect — old domains → neuberg.ai ──
  if (isProd) {
    app.use((req, res, next) => {
      const host = req.hostname;
      if (host && host !== 'neuberg.ai') {
        return res.redirect(301, `https://neuberg.ai${req.originalUrl}`);
      }
      next();
    });
  }

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' })); // Cap body size
  app.use(attachUser);
  app.use(globalLimiter);

  // ── Routes ──

  // Auth routes with stricter rate limiting
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/alpaca', alpacaRouter);
  app.use('/api/streams', streamsRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/stocks', stocksRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/map-events', mapEventsRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/chat', chatLimiter, chatRouter);
  app.use('/api/conflicts', conflictsRouter);
  app.use('/api/sentiment', sentimentRouter);
  app.use('/api/sectors', sectorsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/clusters', clustersRouter);
  app.use('/api/options', optionsRouter);
  app.use('/api/insiders', insidersRouter);
  app.use('/api/correlations', correlationsRouter);
  app.use('/api/missed-opportunities', missedOpportunitiesRouter);
  app.use('/api/polymarket', polymarketRouter);
  app.use('/api/hyperliquid', hyperliquidRouter);
  app.use('/api/market-movers', marketMoversRouter);
  app.use('/api/forex', forexRouter);
  app.use('/api/bonds', bondsRouter);
  app.use('/api/commodities', commoditiesRouter);
  app.use('/api/crypto', cryptoRouter);
  app.use('/api/global-markets', globalMarketsRouter);
  app.use('/api/scanner', scannerRouter);
  app.use('/api/screener', screenerRouter);
  app.use('/api/heat-map', heatMapRouter);
  app.use('/api/etf', etfRouter);
  app.use('/api/dividends', dividendsRouter);
  app.use('/api/ipo', ipoRouter);
  app.use('/api/breadth', breadthRouter);
  app.use('/api/analyst', analystRouter);
  app.use('/api/financials', financialsRouter);
  app.use('/api/futures', futuresRouter);
  app.use('/api/comparison', comparisonRouter);
  app.use('/api/short-interest', shortInterestRouter);
  app.use('/api/fx-rates', fxConverterRouter);
  app.use('/api/pivot-points', pivotPointsRouter);
  app.use('/api/company-profile', companyProfileRouter);
  app.use('/api/pairs', pairsRouter);
  app.use('/api/fibonacci', fibonacciRouter);
  app.use('/api/volatility', volatilityRouter);
  app.use('/api/relative-strength', relativeStrengthRouter);
  app.use('/api/fx-cross', fxCrossRouter);
  app.use('/api/fear-greed', fearGreedRouter);
  app.use('/api/yield-curve', yieldCurveRouter);
  app.use('/api/currency-strength', currencyStrengthRouter);
  app.use('/api/money-flow', moneyFlowRouter);
  app.use('/api/chart', chartRouter);
  app.use('/api/earnings-estimates', earningsEstimatesRouter);
  app.use('/api/cross-asset', crossAssetRouter);
  app.use('/api/holdings', holdingsRouter);
  app.use('/api/sector-performance', sectorPerformanceRouter);
  app.use('/api/etf-holdings', etfHoldingsRouter);
  app.use('/api/drawdown', drawdownRouter);
  app.use('/api/market-regime', marketRegimeRouter);

  // Manual scrape trigger
  const scrapeLimiter = rateLimit({ windowMs: 60_000, max: 1, message: { error: 'Too many scrape requests' } });
  app.post('/api/scrape', scrapeLimiter, async (_req, res) => {
    try {
      runScrapeAndAnalyze();
      res.json({ message: 'Scrape triggered' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to trigger scrape' });
    }
  });

  // Health check (excluded from rate limit above)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Global error handler ──
  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    if (status >= 500) {
      console.error(`[Error] ${status} — ${message}`);
    }
    res.status(status).json({
      error: isProd && status >= 500 ? 'Internal server error' : message,
    });
  });

  // Static files — serve client build in production
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist, {
    maxAge: isProd ? '1y' : 0,
    etag: true,
  }));

  // SPA fallback — serve index.html for all non-API routes
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
