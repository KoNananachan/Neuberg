import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { lazyRoute } from './lib/lazy-route.js';
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
import centralBankRouter from './routes/central-bank.js';
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
  max: 120,              // 120 requests per minute (matches CLAUDE.md spec)
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

  app.use(compression({ threshold: 1024 })); // Gzip responses > 1KB
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' })); // Cap body size
  app.use(attachUser);
  app.use(globalLimiter);

  // ── Cache-Control for data API routes ──
  // Most data routes use date-seeded PRNG (data changes daily, not per-request).
  // Cache aggressively to reduce Cloud Run compute and bandwidth.
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for auth, mutations, and streaming endpoints
    const skip = ['/api/auth', '/api/billing', '/api/alpaca', '/api/streams', '/api/audit', '/api/chat', '/api/scrape', '/api/export'];
    if (req.method !== 'GET' || skip.some(p => req.path.startsWith(p))) {
      return next();
    }
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
    next();
  });

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
  app.use('/api/central-bank', centralBankRouter);

  // ── Lazy-loaded panel routes (loaded on first request to save startup memory) ──
  const panelRoutes: [string, () => Promise<{ default: any }>][] = [
    ['earnings-estimates', () => import('./routes/earnings-estimates.js')],
    ['cross-asset', () => import('./routes/cross-asset.js')],
    ['holdings', () => import('./routes/holdings.js')],
    ['sector-performance', () => import('./routes/sector-performance.js')],
    ['etf-holdings', () => import('./routes/etf-holdings.js')],
    ['drawdown', () => import('./routes/drawdown.js')],
    ['market-regime', () => import('./routes/market-regime.js')],
    ['relative-valuation', () => import('./routes/relative-valuation.js')],
    ['confluence', () => import('./routes/confluence.js')],
    ['iv-surface', () => import('./routes/iv-surface.js')],
    ['seasonality', () => import('./routes/seasonality.js')],
    ['order-flow', () => import('./routes/order-flow.js')],
    ['portfolio-optimizer', () => import('./routes/portfolio-optimizer.js')],
    ['backtest', () => import('./routes/backtest.js')],
    ['macro-dashboard', () => import('./routes/macro-dashboard.js')],
    ['earnings-surprise', () => import('./routes/earnings-surprise.js')],
    ['futures-curve', () => import('./routes/futures-curve.js')],
    ['credit-spreads', () => import('./routes/credit-spreads.js')],
    ['intermarket', () => import('./routes/intermarket.js')],
    ['sector-heatmap', () => import('./routes/sector-heatmap.js')],
    ['economic-surprises', () => import('./routes/economic-surprises.js')],
    ['dispersion', () => import('./routes/dispersion.js')],
    ['fund-flows', () => import('./routes/fund-flows.js')],
    ['vol-term-structure', () => import('./routes/vol-term-structure.js')],
    ['macro-heatmap', () => import('./routes/macro-heatmap.js')],
    ['factor-exposure', () => import('./routes/factor-exposure.js')],
    ['capital-flows', () => import('./routes/capital-flows.js')],
    ['tail-risk', () => import('./routes/tail-risk.js')],
    ['liquidity', () => import('./routes/liquidity.js')],
    ['commodity-spreads', () => import('./routes/commodity-spreads.js')],
    ['sentiment-dashboard', () => import('./routes/sentiment-dashboard.js')],
    ['risk-parity', () => import('./routes/risk-parity.js')],
    ['market-anomalies', () => import('./routes/market-anomalies.js')],
    ['carry-trade', () => import('./routes/carry-trade.js')],
    ['cot-report', () => import('./routes/cot-report.js')],
    ['iv-rank', () => import('./routes/iv-rank.js')],
    ['performance-attribution', () => import('./routes/performance-attribution.js')],
    ['market-microstructure', () => import('./routes/market-microstructure.js')],
    ['positioning', () => import('./routes/positioning.js')],
    ['repo-rates', () => import('./routes/repo-rates.js')],
    ['xccy-basis', () => import('./routes/xccy-basis.js')],
    ['style-box', () => import('./routes/style-box.js')],
    ['swap-rates', () => import('./routes/swap-rates.js')],
    ['earnings-calendar', () => import('./routes/earnings-calendar.js')],
    ['corporate-cds', () => import('./routes/corporate-cds.js')],
    ['event-driven', () => import('./routes/event-driven.js')],
    ['debt-maturity', () => import('./routes/debt-maturity.js')],
    ['equity-risk-premium', () => import('./routes/equity-risk-premium.js')],
    ['central-banks', () => import('./routes/central-banks.js')],
    ['vol-skew', () => import('./routes/vol-skew.js')],
    ['global-rates', () => import('./routes/global-rates.js')],
    ['supply-chain', () => import('./routes/supply-chain.js')],
    ['gamma-exposure', () => import('./routes/gamma-exposure.js')],
    ['sovereign-spreads', () => import('./routes/sovereign-spreads.js')],
    ['earnings-revisions', () => import('./routes/earnings-revisions.js')],
    ['dividend-forecast', () => import('./routes/dividend-forecast.js')],
    ['credit-ratings', () => import('./routes/credit-ratings.js')],
    ['volatility-cone', () => import('./routes/volatility-cone.js')],
    ['term-structure', () => import('./routes/term-structure.js')],
    ['institutional-ownership', () => import('./routes/institutional-ownership.js')],
    ['implied-correlation', () => import('./routes/implied-correlation.js')],
    ['earnings-quality', () => import('./routes/earnings-quality.js')],
    ['vol-surface', () => import('./routes/vol-surface.js')],
    ['global-flows', () => import('./routes/global-flows.js')],
    ['regression-analysis', () => import('./routes/regression-analysis.js')],
    ['covenant-monitor', () => import('./routes/covenant-monitor.js')],
    ['market-internals', () => import('./routes/market-internals.js')],
    ['valuation-multiples', () => import('./routes/valuation-multiples.js')],
    ['fixed-income-analytics', () => import('./routes/fixed-income-analytics.js')],
    ['insider-sentiment', () => import('./routes/insider-sentiment.js')],
    ['custom-index', () => import('./routes/custom-index.js')],
    ['mbs-analytics', () => import('./routes/mbs-analytics.js')],
    ['cdx-index', () => import('./routes/cdx-index.js')],
    ['muni-bonds', () => import('./routes/muni-bonds.js')],
    ['clo-analytics', () => import('./routes/clo-analytics.js')],
    ['onchain-analytics', () => import('./routes/onchain-analytics.js')],
    ['private-credit', () => import('./routes/private-credit.js')],
    ['vol-risk-premium', () => import('./routes/vol-risk-premium.js')],
    ['esg-ratings', () => import('./routes/esg-ratings.js')],
    ['freight-indices', () => import('./routes/freight-indices.js')],
    ['alternative-data', () => import('./routes/alternative-data.js')],
    ['trade-ideas', () => import('./routes/trade-ideas.js')],
    ['debt-issuance', () => import('./routes/debt-issuance.js')],
    ['fx-options', () => import('./routes/fx-options.js')],
    ['multi-factor', () => import('./routes/multi-factor.js')],
    ['treasury-auctions', () => import('./routes/treasury-auctions.js')],
    ['commodity-curves', () => import('./routes/commodity-curves.js')],
    ['em-bonds', () => import('./routes/em-bonds.js')],
    ['reit-monitor', () => import('./routes/reit-monitor.js')],
    ['money-market', () => import('./routes/money-market.js')],
    ['convertible-bonds', () => import('./routes/convertible-bonds.js')],
    ['global-pmi', () => import('./routes/global-pmi.js')],
    ['leveraged-loans', () => import('./routes/leveraged-loans.js')],
    ['swaption-vol', () => import('./routes/swaption-vol.js')],
    ['distressed-debt', () => import('./routes/distressed-debt.js')],
    ['rate-caps-floors', () => import('./routes/rate-caps-floors.js')],
    ['dividend-swaps', () => import('./routes/dividend-swaps.js')],
    ['securities-lending', () => import('./routes/securities-lending.js')],
    ['variance-swaps', () => import('./routes/variance-swaps.js')],
    ['carbon-credits', () => import('./routes/carbon-credits.js')],
    ['weather-derivatives', () => import('./routes/weather-derivatives.js')],
    ['dark-pool', () => import('./routes/dark-pool.js')],
    ['total-return-swaps', () => import('./routes/total-return-swaps.js')],
    ['cat-bonds', () => import('./routes/cat-bonds.js')],
    ['inflation-linked-bonds', () => import('./routes/inflation-linked-bonds.js')],
    ['equity-basket-swaps', () => import('./routes/equity-basket-swaps.js')],
    ['cross-currency-swaps', () => import('./routes/cross-currency-swaps.js')],
    ['commodity-options', () => import('./routes/commodity-options.js')],
    ['loan-cds', () => import('./routes/loan-cds.js')],
    ['convertible-arb', () => import('./routes/convertible-arb.js')],
    ['shipping-rates', () => import('./routes/shipping-rates.js')],
    ['credit-auction', () => import('./routes/credit-auction.js')],
    ['muni-yield-curves', () => import('./routes/muni-yield-curves.js')],
    ['structured-products', () => import('./routes/structured-products.js')],
    ['pension-fund', () => import('./routes/pension-fund.js')],
    ['swap-spread-monitor', () => import('./routes/swap-spread-monitor.js')],
    ['equity-linked-notes', () => import('./routes/equity-linked-notes.js')],
    ['trade-finance', () => import('./routes/trade-finance.js')],
    ['repo-market', () => import('./routes/repo-market.js')],
    ['commodity-inventory', () => import('./routes/commodity-inventory.js')],
    ['sovereign-wealth', () => import('./routes/sovereign-wealth.js')],
    ['agency-mbs-tba', () => import('./routes/agency-mbs-tba.js')],
    ['etf-flows', () => import('./routes/etf-flows.js')],
    ['credit-flow', () => import('./routes/credit-flow.js')],
    ['commodity-seasonality', () => import('./routes/commodity-seasonality.js')],
    ['fx-volatility', () => import('./routes/fx-volatility.js')],
    ['primary-dealer', () => import('./routes/primary-dealer.js')],
    ['real-estate-capital', () => import('./routes/real-estate-capital.js')],
    ['electricity-markets', () => import('./routes/electricity-markets.js')],
    ['syndicated-loans', () => import('./routes/syndicated-loans.js')],
    ['emissions-trading', () => import('./routes/emissions-trading.js')],
    ['insurance-linked', () => import('./routes/insurance-linked.js')],
    ['metals-forward', () => import('./routes/metals-forward.js')],
    ['central-bank-watch', () => import('./routes/central-bank-watch.js')],
    ['freight-derivatives', () => import('./routes/freight-derivatives.js')],
    ['inflation-breakevens', () => import('./routes/inflation-breakevens.js')],
    ['muni-bond-auction', () => import('./routes/muni-bond-auction.js')],
    ['commodity-curve-analytics', () => import('./routes/commodity-curve-analytics.js')],
    ['collateral-monitor', () => import('./routes/collateral-monitor.js')],
    ['sovereign-cds', () => import('./routes/sovereign-cds.js')],
    ['cross-asset-momentum', () => import('./routes/cross-asset-momentum.js')],
    ['crypto-derivatives', () => import('./routes/crypto-derivatives.js')],
    ['bond-relative-value', () => import('./routes/bond-relative-value.js')],
    ['volatility-arbitrage', () => import('./routes/volatility-arbitrage.js')],
    ['systematic-strategy', () => import('./routes/systematic-strategy.js')],
    ['funding-rate-monitor', () => import('./routes/funding-rate-monitor.js')],
    ['em-local-rates', () => import('./routes/em-local-rates.js')],
    ['portfolio-risk-analytics', () => import('./routes/portfolio-risk-analytics.js')],
    ['credit-index-monitor', () => import('./routes/credit-index-monitor.js')],
    ['equity-financing', () => import('./routes/equity-financing.js')],
    ['global-macro-dashboard', () => import('./routes/global-macro-dashboard.js')],
    ['abs-rmbs-monitor', () => import('./routes/abs-rmbs-monitor.js')],
    ['liquidity-risk-monitor', () => import('./routes/liquidity-risk-monitor.js')],
    ['fi-attribution', () => import('./routes/fi-attribution.js')],
    ['repo-rate-heatmap', () => import('./routes/repo-rate-heatmap.js')],
    ['trade-compression', () => import('./routes/trade-compression.js')],
    ['regulatory-capital', () => import('./routes/regulatory-capital.js')],
    ['settlement-risk', () => import('./routes/settlement-risk.js')],
    ['swap-valuation', () => import('./routes/swap-valuation.js')],
    ['commodity-storage', () => import('./routes/commodity-storage.js')],
    ['counterparty-exposure', () => import('./routes/counterparty-exposure.js')],
    ['market-impact-model', () => import('./routes/market-impact-model.js')],
    ['structured-notes', () => import('./routes/structured-notes.js')],
    ['securities-finance', () => import('./routes/securities-finance.js')],
    ['credit-curve-builder', () => import('./routes/credit-curve-builder.js')],
    ['execution-analytics', () => import('./routes/execution-analytics.js')],
    ['bond-auction-calendar', () => import('./routes/bond-auction-calendar.js')],
    ['fx-carry-monitor', () => import('./routes/fx-carry-monitor.js')],
    ['equity-capital-markets', () => import('./routes/equity-capital-markets.js')],
    ['debt-capital-markets', () => import('./routes/debt-capital-markets.js')],
    ['hedge-fund-monitor', () => import('./routes/hedge-fund-monitor.js')],
    ['risk-dashboard', () => import('./routes/risk-dashboard.js')],
    ['benchmark-tracker', () => import('./routes/benchmark-tracker.js')],
    ['liquidity-coverage', () => import('./routes/liquidity-coverage.js')],
    ['market-sentiment-index', () => import('./routes/market-sentiment-index.js')],
    ['portfolio-stress-test', () => import('./routes/portfolio-stress-test.js')],
    ['global-liquidity-monitor', () => import('./routes/global-liquidity-monitor.js')],
    ['trade-recap', () => import('./routes/trade-recap.js')],
    ['macro-surprise-tracker', () => import('./routes/macro-surprise-tracker.js')],
    ['fx-volatility-surface', () => import('./routes/fx-volatility-surface.js')],
    ['commodity-fundamental', () => import('./routes/commodity-fundamental.js')],
    ['etf-flow-monitor', () => import('./routes/etf-flow-monitor.js')],
    ['equity-factor-monitor', () => import('./routes/equity-factor-monitor.js')],
    ['rates-strategy', () => import('./routes/rates-strategy.js')],
    ['credit-portfolio', () => import('./routes/credit-portfolio.js')],
    ['macro-regime-monitor', () => import('./routes/macro-regime-monitor.js')],
    ['dividend-calendar', () => import('./routes/dividend-calendar.js')],
    ['convertible-arbitrage', () => import('./routes/convertible-arbitrage.js')],
    ['realtime-pnl', () => import('./routes/realtime-pnl.js')],
    ['market-breadth-advanced', () => import('./routes/market-breadth-advanced.js')],
    ['volatility-dashboard', () => import('./routes/volatility-dashboard.js')],
    ['fi-relative-value', () => import('./routes/fi-relative-value.js')],
    ['equity-screen-results', () => import('./routes/equity-screen-results.js')],
    ['cross-asset-correlation', () => import('./routes/cross-asset-correlation.js')],
    ['portfolio-attribution', () => import('./routes/portfolio-attribution.js')],
    ['ipo-calendar', () => import('./routes/ipo-calendar.js')],
    ['municipal-bond-monitor', () => import('./routes/municipal-bond-monitor.js')],
    ['structured-credit', () => import('./routes/structured-credit.js')],
    ['currency-options', () => import('./routes/currency-options.js')],
    ['swap-curve-monitor', () => import('./routes/swap-curve-monitor.js')],
    ['fund-flow-analytics', () => import('./routes/fund-flow-analytics.js')],
    ['trade-cost-analysis', () => import('./routes/trade-cost-analysis.js')],
    ['warrant-convertible', () => import('./routes/warrant-convertible.js')],
    ['global-trade-flow', () => import('./routes/global-trade-flow.js')],
    ['real-estate-analytics', () => import('./routes/real-estate-analytics.js')],
    ['inflation-monitor', () => import('./routes/inflation-monitor.js')],
    ['merger-arbitrage', () => import('./routes/merger-arbitrage.js')],
    ['sovereign-debt', () => import('./routes/sovereign-debt.js')],
    ['etf-premium', () => import('./routes/etf-premium.js')],
    ['etf-creation-redemption', () => import('./routes/etf-creation-redemption.js')],
    ['commodity-demand', () => import('./routes/commodity-demand.js')],
    ['global-dividend', () => import('./routes/global-dividend.js')],
    ['cds-index-monitor', () => import('./routes/cds-index-monitor.js')],
    ['macro-risk', () => import('./routes/macro-risk.js')],
    ['fi-attribution-analysis', () => import('./routes/fi-attribution-analysis.js')],
    ['equity-style', () => import('./routes/equity-style.js')],
    ['currency-forecast', () => import('./routes/currency-forecast.js')],
    ['bond-ladder', () => import('./routes/bond-ladder.js')],
    ['sector-credit-spread', () => import('./routes/sector-credit-spread.js')],
    ['global-pmi-dashboard', () => import('./routes/global-pmi-dashboard.js')],
    ['earnings-whisper', () => import('./routes/earnings-whisper.js')],
    ['portfolio-hedging', () => import('./routes/portfolio-hedging.js')],
    ['market-depth', () => import('./routes/market-depth.js')],
    ['irs-monitor', () => import('./routes/irs-monitor.js')],
    ['equity-capital-raise', () => import('./routes/equity-capital-raise.js')],
    ['volatility-smile', () => import('./routes/volatility-smile.js')],
    ['trade-blotter', () => import('./routes/trade-blotter.js')],
    ['country-risk', () => import('./routes/country-risk.js')],
    ['central-bank-balance-sheet', () => import('./routes/central-bank-balance-sheet.js')],
    ['corporate-buyback', () => import('./routes/corporate-buyback.js')],
    ['corporate-actions', () => import('./routes/corporate-actions.js')],
    ['margin-debt', () => import('./routes/margin-debt.js')],
    ['fiscal-policy', () => import('./routes/fiscal-policy.js')],
    ['basis-trade', () => import('./routes/basis-trade.js')],
    ['flow-of-funds', () => import('./routes/flow-of-funds.js')],
    ['global-supply-chain', () => import('./routes/global-supply-chain.js')],
    ['treasury-analytics', () => import('./routes/treasury-analytics.js')],
    ['curve-trade', () => import('./routes/curve-trade.js')],
    ['private-equity', () => import('./routes/private-equity.js')],
    ['capital-structure', () => import('./routes/capital-structure.js')],
    ['cross-border-ma', () => import('./routes/cross-border-ma.js')],
    ['credit-risk-transfer', () => import('./routes/credit-risk-transfer.js')],
    ['swap-execution', () => import('./routes/swap-execution.js')],
    ['debt-ceiling', () => import('./routes/debt-ceiling.js')],
    ['securitization', () => import('./routes/securitization.js')],
    ['municipal-credit', () => import('./routes/municipal-credit.js')],
    ['commodity-spread', () => import('./routes/commodity-spread.js')],
    ['inflation-swap', () => import('./routes/inflation-swap.js')],
    ['credit-default-index', () => import('./routes/credit-default-index.js')],
    ['sovereign-wealth-fund', () => import('./routes/sovereign-wealth-fund.js')],
    ['collateral-management', () => import('./routes/collateral-management.js')],
    ['prime-brokerage', () => import('./routes/prime-brokerage.js')],
    ['election-risk', () => import('./routes/election-risk.js')],
    ['cva-monitor', () => import('./routes/cva-monitor.js')],
    ['algo-execution', () => import('./routes/algo-execution.js')],
    ['securities-class-action', () => import('./routes/securities-class-action.js')],
    ['proxy-voting', () => import('./routes/proxy-voting.js')],
    ['index-rebalance', () => import('./routes/index-rebalance.js')],
    ['shareholder-activism', () => import('./routes/shareholder-activism.js')],
    ['fund-flow-tracker', () => import('./routes/fund-flow-tracker.js')],
    ['insider-transaction', () => import('./routes/insider-transaction.js')],
    ['short-squeeze', () => import('./routes/short-squeeze.js')],
    ['spac-monitor', () => import('./routes/spac-monitor.js')],
    ['block-trade', () => import('./routes/block-trade.js')],
    ['regulatory-filing', () => import('./routes/regulatory-filing.js')],
    ['tax-loss-harvest', () => import('./routes/tax-loss-harvest.js')],
    ['dividend-capture', () => import('./routes/dividend-capture.js')],
    ['credit-rating-migration', () => import('./routes/credit-rating-migration.js')],
    ['merger-arb-monitor', () => import('./routes/merger-arb-monitor.js')],
    ['market-making', () => import('./routes/market-making.js')],
    ['rate-probability', () => import('./routes/rate-probability.js')],
    ['fx-forward', () => import('./routes/fx-forward.js')],
    ['credit-event', () => import('./routes/credit-event.js')],
    ['portfolio-margin', () => import('./routes/portfolio-margin.js')],
    ['corporate-governance', () => import('./routes/corporate-governance.js')],
    ['treasury-bill', () => import('./routes/treasury-bill.js')],
    ['equity-lending', () => import('./routes/equity-lending.js')],
    ['trade-settlement', () => import('./routes/trade-settlement.js')],
    ['index-arbitrage', () => import('./routes/index-arbitrage.js')],
    ['asset-allocation', () => import('./routes/asset-allocation.js')],
    ['bond-futures-basis', () => import('./routes/bond-futures-basis.js')],
    ['risk-budgeting', () => import('./routes/risk-budgeting.js')],
    ['market-surveillance', () => import('./routes/market-surveillance.js')],
    ['duration-management', () => import('./routes/duration-management.js')],
    ['swap-pricing', () => import('./routes/swap-pricing.js')],
    ['option-strategy-builder', () => import('./routes/option-strategy-builder.js')],
    ['currency-basket', () => import('./routes/currency-basket.js')],
    ['liquidity-stress-test', () => import('./routes/liquidity-stress-test.js')],
    ['trade-repository', () => import('./routes/trade-repository.js')],
    ['sovereign-risk-score', () => import('./routes/sovereign-risk-score.js')],
    ['collateral-optimization', () => import('./routes/collateral-optimization.js')],
    ['cross-margining', () => import('./routes/cross-margining.js')],
    ['fund-manager-ranking', () => import('./routes/fund-manager-ranking.js')],
    ['price-discovery', () => import('./routes/price-discovery.js')],
    ['operational-risk', () => import('./routes/operational-risk.js')],
    ['transition-management', () => import('./routes/transition-management.js')],
    ['securities-valuation', () => import('./routes/securities-valuation.js')],
    ['benchmark-analytics', () => import('./routes/benchmark-analytics.js')],
    ['counterparty-risk', () => import('./routes/counterparty-risk.js')],
    ['equity-valuation', () => import('./routes/equity-valuation.js')],
    ['macro-indicators', () => import('./routes/macro-indicators.js')],
    ['volatility-skew', () => import('./routes/volatility-skew.js')],
    ['order-book', () => import('./routes/order-book.js')],
    ['fixed-income-ladder', () => import('./routes/fixed-income-ladder.js')],
    ['cds-monitor', () => import('./routes/cds-monitor.js')],
    ['sovereign-debt-monitor', () => import('./routes/sovereign-debt-monitor.js')],
    ['liquidity-dashboard', () => import('./routes/liquidity-dashboard.js')],
    ['precious-metals', () => import('./routes/precious-metals.js')],
    ['bank-capital', () => import('./routes/bank-capital.js')],
    ['agricultural-commodities', () => import('./routes/agricultural-commodities.js')],
    ['energy-transition', () => import('./routes/energy-transition.js')],
    ['geopolitical-risk', () => import('./routes/geopolitical-risk.js')],
    ['labor-market', () => import('./routes/labor-market.js')],
    ['housing-market', () => import('./routes/housing-market.js')],
    ['supply-chain-stress', () => import('./routes/supply-chain-stress.js')],
    ['credit-impulse', () => import('./routes/credit-impulse.js')],
    ['consumer-confidence', () => import('./routes/consumer-confidence.js')],
    ['sovereign-yield', () => import('./routes/sovereign-yield.js')],
    ['trade-balance', () => import('./routes/trade-balance.js')],
    ['semiconductor', () => import('./routes/semiconductor.js')],
    ['infrastructure-investment', () => import('./routes/infrastructure-investment.js')],
    ['insurance-market', () => import('./routes/insurance-market.js')],
    ['shipping-index', () => import('./routes/shipping-index.js')],
    ['venture-capital', () => import('./routes/venture-capital.js')],
    ['demographic-trends', () => import('./routes/demographic-trends.js')],
    ['economic-forecast', () => import('./routes/economic-forecast.js')],
    ['global-index-monitor', () => import('./routes/global-index-monitor.js')],
    ['league-tables', () => import('./routes/league-tables.js')],
    ['gdp-nowcast', () => import('./routes/gdp-nowcast.js')],
    ['recession-probability', () => import('./routes/recession-probability.js')],
    ['financial-conditions', () => import('./routes/financial-conditions.js')],
    ['commodity-fundamentals', () => import('./routes/commodity-fundamentals.js')],
    ['wage-growth', () => import('./routes/wage-growth.js')],
    ['fiscal-deficit', () => import('./routes/fiscal-deficit.js')],
    ['central-clearing', () => import('./routes/central-clearing.js')],
    ['money-velocity', () => import('./routes/money-velocity.js')],
    ['productivity-monitor', () => import('./routes/productivity-monitor.js')],
    ['balance-of-payments', () => import('./routes/balance-of-payments.js')],
    ['global-tax-rates', () => import('./routes/global-tax-rates.js')],
    ['sanctions-monitor', () => import('./routes/sanctions-monitor.js')],
    ['climate-risk', () => import('./routes/climate-risk.js')],
    ['sovereign-default', () => import('./routes/sovereign-default.js')],
    ['bank-stress-test', () => import('./routes/bank-stress-test.js')],
    ['equity-derivatives', () => import('./routes/equity-derivatives.js')],
    ['money-market-rates', () => import('./routes/money-market-rates.js')],
    ['money-market-fund', () => import('./routes/money-market-fund.js')],
    ['global-ma', () => import('./routes/global-ma.js')],
    ['credit-default-swaps', () => import('./routes/credit-default-swaps.js')],
    ['real-estate-investment', () => import('./routes/real-estate-investment.js')],
    ['global-debt-clock', () => import('./routes/global-debt-clock.js')],
    ['ai-tech-capex', () => import('./routes/ai-tech-capex.js')],
    ['critical-minerals', () => import('./routes/critical-minerals.js')],
    ['nuclear-energy', () => import('./routes/nuclear-energy.js')],
    ['water-market', () => import('./routes/water-market.js')],
    ['space-economy', () => import('./routes/space-economy.js')],
    ['cybersecurity', () => import('./routes/cybersecurity.js')],
    ['global-food-price', () => import('./routes/global-food-price.js')],
    ['pharma-pipeline', () => import('./routes/pharma-pipeline.js')],
    ['etf-flow', () => import('./routes/etf-flow.js')],
    ['volatility-surface', () => import('./routes/volatility-surface.js')],
    ['credit-spread', () => import('./routes/credit-spread.js')],
    ['earnings-revision', () => import('./routes/earnings-revision.js')],
    ['swap-spread', () => import('./routes/swap-spread.js')],
    ['breakeven-inflation', () => import('./routes/breakeven-inflation.js')],
    ['fx-carry', () => import('./routes/fx-carry.js')],
    ['options-skew', () => import('./routes/options-skew.js')],
    ['quant-factor', () => import('./routes/quant-factor.js')],
    ['cross-currency-basis', () => import('./routes/cross-currency-basis.js')],
    ['fund-flow', () => import('./routes/fund-flow.js')],
    ['leveraged-loan', () => import('./routes/leveraged-loan.js')],
    ['structured-product', () => import('./routes/structured-product.js')],
    ['merger-arb', () => import('./routes/merger-arb.js')],
    ['green-bond', () => import('./routes/green-bond.js')],
    ['market-breadth', () => import('./routes/market-breadth.js')],
    ['liquidity-monitor', () => import('./routes/liquidity-monitor.js')],
    ['covered-bond', () => import('./routes/covered-bond.js')],
    ['inflation-linked-bond', () => import('./routes/inflation-linked-bond.js')],
    ['correlation-risk', () => import('./routes/correlation-risk.js')],
    ['subordinated-debt', () => import('./routes/subordinated-debt.js')],
    ['smart-beta', () => import('./routes/smart-beta.js')],
    ['factor-rotation', () => import('./routes/factor-rotation.js')],
    ['endowment', () => import('./routes/endowment.js')],
    ['family-office', () => import('./routes/family-office.js')],
    ['hedge-fund-replication', () => import('./routes/hedge-fund-replication.js')],
    ['infrastructure-debt', () => import('./routes/infrastructure-debt.js')],
    ['supply-chain-finance', () => import('./routes/supply-chain-finance.js')],
    ['cds', () => import('./routes/cds.js')],
    ['clo', () => import('./routes/clo.js')],
    ['interest-rate-swap', () => import('./routes/interest-rate-swap.js')],
    ['shipping-freight', () => import('./routes/shipping-freight.js')],
    ['abs', () => import('./routes/abs.js')],
    ['total-return-swap', () => import('./routes/total-return-swap.js')],
    ['variance-swap', () => import('./routes/variance-swap.js')],
    ['convertible-bond', () => import('./routes/convertible-bond.js')],
    ['credit-index', () => import('./routes/credit-index.js')],
    ['dividend-swap', () => import('./routes/dividend-swap.js')],
    ['commercial-paper', () => import('./routes/commercial-paper.js')],
    ['fx-reserves', () => import('./routes/fx-reserves.js')],
    ['equity-index-futures', () => import('./routes/equity-index-futures.js')],
    ['preferred-stock', () => import('./routes/preferred-stock.js')],
    ['treasury-strips', () => import('./routes/treasury-strips.js')],
    ['commodity-warehouse', () => import('./routes/commodity-warehouse.js')],
    ['agency-debt', () => import('./routes/agency-debt.js')],
    ['loan-syndication-pipeline', () => import('./routes/loan-syndication-pipeline.js')],
    ['sovereign-bond-auction', () => import('./routes/sovereign-bond-auction.js')],
    ['cross-currency-basis-swap', () => import('./routes/cross-currency-basis-swap.js')],
    ['securities-borrowing-lending', () => import('./routes/securities-borrowing-lending.js')],
    ['equity-total-return-index', () => import('./routes/equity-total-return-index.js')],
    ['global-credit-monitor', () => import('./routes/global-credit-monitor.js')],
    ['bond-index-monitor', () => import('./routes/bond-index-monitor.js')],
    ['fx-option-vol-matrix', () => import('./routes/fx-option-vol-matrix.js')],
    ['equity-swap-pricing', () => import('./routes/equity-swap-pricing.js')],
    ['credit-valuation-adjustment', () => import('./routes/credit-valuation-adjustment.js')],
    ['interest-rate-vol-surface', () => import('./routes/interest-rate-vol-surface.js')],
    ['municipal-credit-analysis', () => import('./routes/municipal-credit-analysis.js')],
    ['structured-products-analyzer', () => import('./routes/structured-products-analyzer.js')],
    ['risk-scenario-analysis', () => import('./routes/risk-scenario-analysis.js')],
    ['convertible-bond-analyzer', () => import('./routes/convertible-bond-analyzer.js')],
    ['commodities-forward-curve', () => import('./routes/commodities-forward-curve.js')],
    ['variance-swap-monitor', () => import('./routes/variance-swap-monitor.js')],
    ['securities-lending-revenue', () => import('./routes/securities-lending-revenue.js')],
    ['equity-market-microstructure', () => import('./routes/equity-market-microstructure.js')],
    ['fx-carry-trade-monitor', () => import('./routes/fx-carry-trade-monitor.js')],
    ['private-credit-dashboard', () => import('./routes/private-credit-dashboard.js')],
    ['sovereign-cds-monitor', () => import('./routes/sovereign-cds-monitor.js')],
    ['equity-dividend-forecast', () => import('./routes/equity-dividend-forecast.js')],
    ['clo-tranche-analytics', () => import('./routes/clo-tranche-analytics.js')],
    ['equity-pairs-trading', () => import('./routes/equity-pairs-trading.js')],
    ['treasury-futures-basis', () => import('./routes/treasury-futures-basis.js')],
    ['credit-index-tranches', () => import('./routes/credit-index-tranches.js')],
    ['mortgage-prepayment', () => import('./routes/mortgage-prepayment.js')],
    ['option-skew-surface', () => import('./routes/option-skew-surface.js')],
    ['equity-short-interest', () => import('./routes/equity-short-interest.js')],
    ['warrant-pricing', () => import('./routes/warrant-pricing.js')],
    ['trade-execution-quality', () => import('./routes/trade-execution-quality.js')],
    ['freight-rate-monitor', () => import('./routes/freight-rate-monitor.js')],
    ['power-market', () => import('./routes/power-market.js')],
    ['special-situations', () => import('./routes/special-situations.js')],
    ['industrial-metals', () => import('./routes/industrial-metals.js')],
    ['securitization-pipeline', () => import('./routes/securitization-pipeline.js')],
    ['equity-analyst-revisions', () => import('./routes/equity-analyst-revisions.js')],
    ['natural-gas-storage', () => import('./routes/natural-gas-storage.js')],
    ['precious-metals-lease', () => import('./routes/precious-metals-lease.js')],
    ['corporate-action-calendar', () => import('./routes/corporate-action-calendar.js')],
    ['sovereign-debt-maturity', () => import('./routes/sovereign-debt-maturity.js')],
    ['agricultural-futures', () => import('./routes/agricultural-futures.js')],
    ['bank-earnings', () => import('./routes/bank-earnings.js')],
    ['private-equity-secondaries', () => import('./routes/private-equity-secondaries.js')],
    ['sukuk-monitor', () => import('./routes/sukuk-monitor.js')],
    ['frontier-market-debt', () => import('./routes/frontier-market-debt.js')],
    ['aircraft-finance', () => import('./routes/aircraft-finance.js')],
    ['rare-earth-battery-metals', () => import('./routes/rare-earth-battery-metals.js')],
    ['data-center-infrastructure', () => import('./routes/data-center-infrastructure.js')],
    ['sports-media-rights', () => import('./routes/sports-media-rights.js')],
    ['luxury-collectibles-index', () => import('./routes/luxury-collectibles-index.js')],
    ['fintech-digital-payments', () => import('./routes/fintech-digital-payments.js')],
    ['cyber-risk-insurance', () => import('./routes/cyber-risk-insurance.js')],
  ];
  for (const [routePath, importFn] of panelRoutes) {
    app.use(`/api/${routePath}`, lazyRoute(importFn));
  }

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
    immutable: isProd, // Content-hashed filenames never change
    etag: true,
  }));

  // SPA fallback — serve index.html for all non-API routes
  // index.html must NOT be cached long-term (it references hashed JS/CSS bundles)
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
