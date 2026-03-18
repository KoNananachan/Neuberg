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
import relativeValuationRouter from './routes/relative-valuation.js';
import confluenceRouter from './routes/confluence.js';
import ivSurfaceRouter from './routes/iv-surface.js';
import seasonalityRouter from './routes/seasonality.js';
import orderFlowRouter from './routes/order-flow.js';
import portfolioOptimizerRouter from './routes/portfolio-optimizer.js';
import backtestRouter from './routes/backtest.js';
import macroDashboardRouter from './routes/macro-dashboard.js';
import earningsSurpriseRouter from './routes/earnings-surprise.js';
import futuresCurveRouter from './routes/futures-curve.js';
import creditSpreadsRouter from './routes/credit-spreads.js';
import intermarketRouter from './routes/intermarket.js';
import sectorHeatmapRouter from './routes/sector-heatmap.js';
import economicSurprisesRouter from './routes/economic-surprises.js';
import dispersionRouter from './routes/dispersion.js';
import fundFlowsRouter from './routes/fund-flows.js';
import volTermStructureRouter from './routes/vol-term-structure.js';
import macroHeatmapRouter from './routes/macro-heatmap.js';
import factorExposureRouter from './routes/factor-exposure.js';
import capitalFlowsRouter from './routes/capital-flows.js';
import tailRiskRouter from './routes/tail-risk.js';
import liquidityRouter from './routes/liquidity.js';
import commoditySpreadsRouter from './routes/commodity-spreads.js';
import sentimentDashboardRouter from './routes/sentiment-dashboard.js';
import riskParityRouter from './routes/risk-parity.js';
import marketAnomaliesRouter from './routes/market-anomalies.js';
import carryTradeRouter from './routes/carry-trade.js';
import cotReportRouter from './routes/cot-report.js';
import ivRankRouter from './routes/iv-rank.js';
import performanceAttributionRouter from './routes/performance-attribution.js';
import marketMicrostructureRouter from './routes/market-microstructure.js';
import positioningRouter from './routes/positioning.js';
import repoRatesRouter from './routes/repo-rates.js';
import xccyBasisRouter from './routes/xccy-basis.js';
import styleBoxRouter from './routes/style-box.js';
import swapRatesRouter from './routes/swap-rates.js';
import earningsCalendarRouter from './routes/earnings-calendar.js';
import inflationBreakevenRouter from './routes/inflation-breakeven.js';
import corporateCdsRouter from './routes/corporate-cds.js';
import eventDrivenRouter from './routes/event-driven.js';
import debtMaturityRouter from './routes/debt-maturity.js';
import equityRiskPremiumRouter from './routes/equity-risk-premium.js';
import centralBanksRouter from './routes/central-banks.js';
import volSkewRouter from './routes/vol-skew.js';
import globalRatesRouter from './routes/global-rates.js';
import supplyChainRouter from './routes/supply-chain.js';
import gammaExposureRouter from './routes/gamma-exposure.js';
import sovereignSpreadsRouter from './routes/sovereign-spreads.js';
import earningsRevisionsRouter from './routes/earnings-revisions.js';
import dividendForecastRouter from './routes/dividend-forecast.js';
import creditRatingsRouter from './routes/credit-ratings.js';
import volatilityConeRouter from './routes/volatility-cone.js';
import termStructureRouter from './routes/term-structure.js';
import institutionalOwnershipRouter from './routes/institutional-ownership.js';
import impliedCorrelationRouter from './routes/implied-correlation.js';
import earningsQualityRouter from './routes/earnings-quality.js';
import volSurfaceRouter from './routes/vol-surface.js';
import globalFlowsRouter from './routes/global-flows.js';
import regressionAnalysisRouter from './routes/regression-analysis.js';
import covenantMonitorRouter from './routes/covenant-monitor.js';
import marketInternalsRouter from './routes/market-internals.js';
import valuationMultiplesRouter from './routes/valuation-multiples.js';
import fixedIncomeAnalyticsRouter from './routes/fixed-income-analytics.js';
import insiderSentimentRouter from './routes/insider-sentiment.js';
import customIndexRouter from './routes/custom-index.js';
import mbsAnalyticsRouter from './routes/mbs-analytics.js';
import cdxIndexRouter from './routes/cdx-index.js';
import muniBondsRouter from './routes/muni-bonds.js';
import cloAnalyticsRouter from './routes/clo-analytics.js';
import onchainAnalyticsRouter from './routes/onchain-analytics.js';
import privateCreditRouter from './routes/private-credit.js';
import volRiskPremiumRouter from './routes/vol-risk-premium.js';
import esgRatingsRouter from './routes/esg-ratings.js';
import freightIndicesRouter from './routes/freight-indices.js';
import alternativeDataRouter from './routes/alternative-data.js';
import tradeIdeasRouter from './routes/trade-ideas.js';
import debtIssuanceRouter from './routes/debt-issuance.js';
import fxOptionsRouter from './routes/fx-options.js';
import multiFactorRouter from './routes/multi-factor.js';
import treasuryAuctionsRouter from './routes/treasury-auctions.js';
import commodityCurvesRouter from './routes/commodity-curves.js';
import emBondsRouter from './routes/em-bonds.js';
import reitMonitorRouter from './routes/reit-monitor.js';
import moneyMarketRouter from './routes/money-market.js';
import convertibleBondsRouter from './routes/convertible-bonds.js';
import globalPmiRouter from './routes/global-pmi.js';
import leveragedLoansRouter from './routes/leveraged-loans.js';
import swaptionVolRouter from './routes/swaption-vol.js';
import distressedDebtRouter from './routes/distressed-debt.js';
import rateCapsFloorsRouter from './routes/rate-caps-floors.js';
import dividendSwapsRouter from './routes/dividend-swaps.js';
import securitiesLendingRouter from './routes/securities-lending.js';
import varianceSwapsRouter from './routes/variance-swaps.js';
import carbonCreditsRouter from './routes/carbon-credits.js';
import weatherDerivativesRouter from './routes/weather-derivatives.js';
import darkPoolRouter from './routes/dark-pool.js';
import totalReturnSwapsRouter from './routes/total-return-swaps.js';
import catBondsRouter from './routes/cat-bonds.js';
import inflationLinkedBondsRouter from './routes/inflation-linked-bonds.js';
import equityBasketSwapsRouter from './routes/equity-basket-swaps.js';
import crossCurrencySwapsRouter from './routes/cross-currency-swaps.js';
import commodityOptionsRouter from './routes/commodity-options.js';
import loanCdsRouter from './routes/loan-cds.js';
import convertibleArbRouter from './routes/convertible-arb.js';
import shippingRatesRouter from './routes/shipping-rates.js';
import creditAuctionRouter from './routes/credit-auction.js';
import muniYieldCurvesRouter from './routes/muni-yield-curves.js';
import structuredProductsRouter from './routes/structured-products.js';
import pensionFundRouter from './routes/pension-fund.js';
import swapSpreadMonitorRouter from './routes/swap-spread-monitor.js';
import equityLinkedNotesRouter from './routes/equity-linked-notes.js';
import tradeFinanceRouter from './routes/trade-finance.js';
import repoMarketRouter from './routes/repo-market.js';
import commodityInventoryRouter from './routes/commodity-inventory.js';
import sovereignWealthRouter from './routes/sovereign-wealth.js';
import agencyMbsTbaRouter from './routes/agency-mbs-tba.js';
import etfFlowsRouter from './routes/etf-flows.js';
import creditFlowRouter from './routes/credit-flow.js';
import commoditySeasonalityRouter from './routes/commodity-seasonality.js';
import fxVolatilityRouter from './routes/fx-volatility.js';
import primaryDealerRouter from './routes/primary-dealer.js';
import realEstateCapitalRouter from './routes/real-estate-capital.js';
import electricityMarketsRouter from './routes/electricity-markets.js';
import syndicatedLoansRouter from './routes/syndicated-loans.js';
import emissionsTradingRouter from './routes/emissions-trading.js';
import insuranceLinkedRouter from './routes/insurance-linked.js';
import metalsForwardRouter from './routes/metals-forward.js';
import centralBankWatchRouter from './routes/central-bank-watch.js';
import freightDerivativesRouter from './routes/freight-derivatives.js';
import inflationBreakevensRouter from './routes/inflation-breakevens.js';
import muniBondAuctionRouter from './routes/muni-bond-auction.js';
import commodityCurveAnalyticsRouter from './routes/commodity-curve-analytics.js';
import collateralMonitorRouter from './routes/collateral-monitor.js';
import sovereignCdsRouter from './routes/sovereign-cds.js';
import crossAssetMomentumRouter from './routes/cross-asset-momentum.js';
import cryptoDerivativesRouter from './routes/crypto-derivatives.js';
import bondRelativeValueRouter from './routes/bond-relative-value.js';
import volatilityArbitrageRouter from './routes/volatility-arbitrage.js';
import systematicStrategyRouter from './routes/systematic-strategy.js';
import fundingRateMonitorRouter from './routes/funding-rate-monitor.js';
import emLocalRatesRouter from './routes/em-local-rates.js';
import portfolioRiskAnalyticsRouter from './routes/portfolio-risk-analytics.js';
import creditIndexMonitorRouter from './routes/credit-index-monitor.js';
import equityFinancingRouter from './routes/equity-financing.js';
import globalMacroDashboardRouter from './routes/global-macro-dashboard.js';
import absRmbsMonitorRouter from './routes/abs-rmbs-monitor.js';
import liquidityRiskMonitorRouter from './routes/liquidity-risk-monitor.js';
import fiAttributionRouter from './routes/fi-attribution.js';
import repoRateHeatmapRouter from './routes/repo-rate-heatmap.js';
import tradeCompressionRouter from './routes/trade-compression.js';
import regulatoryCapitalRouter from './routes/regulatory-capital.js';
import settlementRiskRouter from './routes/settlement-risk.js';
import swapValuationRouter from './routes/swap-valuation.js';
import commodityStorageRouter from './routes/commodity-storage.js';
import counterpartyExposureRouter from './routes/counterparty-exposure.js';
import marketImpactModelRouter from './routes/market-impact-model.js';
import structuredNotesRouter from './routes/structured-notes.js';
import securitiesFinanceRouter from './routes/securities-finance.js';
import creditCurveBuilderRouter from './routes/credit-curve-builder.js';
import executionAnalyticsRouter from './routes/execution-analytics.js';
import bondAuctionCalendarRouter from './routes/bond-auction-calendar.js';
import fxCarryMonitorRouter from './routes/fx-carry-monitor.js';
import equityCapitalMarketsRouter from './routes/equity-capital-markets.js';
import debtCapitalMarketsRouter from './routes/debt-capital-markets.js';
import hedgeFundMonitorRouter from './routes/hedge-fund-monitor.js';
import riskDashboardRouter from './routes/risk-dashboard.js';
import benchmarkTrackerRouter from './routes/benchmark-tracker.js';
import liquidityCoverageRouter from './routes/liquidity-coverage.js';
import marketSentimentIndexRouter from './routes/market-sentiment-index.js';
import portfolioStressTestRouter from './routes/portfolio-stress-test.js';
import globalLiquidityMonitorRouter from './routes/global-liquidity-monitor.js';
import tradeRecapRouter from './routes/trade-recap.js';
import macroSurpriseTrackerRouter from './routes/macro-surprise-tracker.js';
import fxVolatilitySurfaceRouter from './routes/fx-volatility-surface.js';
import commodityFundamentalRouter from './routes/commodity-fundamental.js';
import etfFlowMonitorRouter from './routes/etf-flow-monitor.js';
import equityFactorMonitorRouter from './routes/equity-factor-monitor.js';
import ratesStrategyRouter from './routes/rates-strategy.js';
import creditPortfolioRouter from './routes/credit-portfolio.js';
import macroRegimeMonitorRouter from './routes/macro-regime-monitor.js';
import dividendCalendarRouter from './routes/dividend-calendar.js';
import convertibleArbitrageRouter from './routes/convertible-arbitrage.js';
import realtimePnlRouter from './routes/realtime-pnl.js';
import marketBreadthAdvancedRouter from './routes/market-breadth-advanced.js';
import volatilityDashboardRouter from './routes/volatility-dashboard.js';
import fiRelativeValueRouter from './routes/fi-relative-value.js';
import equityScreenResultsRouter from './routes/equity-screen-results.js';
import crossAssetCorrelationRouter from './routes/cross-asset-correlation.js';
import portfolioAttributionRouter from './routes/portfolio-attribution.js';
import ipoCalendarRouter from './routes/ipo-calendar.js';
import municipalBondMonitorRouter from './routes/municipal-bond-monitor.js';
import structuredCreditRouter from './routes/structured-credit.js';
import currencyOptionsRouter from './routes/currency-options.js';
import swapCurveMonitorRouter from './routes/swap-curve-monitor.js';
import fundFlowAnalyticsRouter from './routes/fund-flow-analytics.js';
import tradeCostAnalysisRouter from './routes/trade-cost-analysis.js';
import warrantConvertibleRouter from './routes/warrant-convertible.js';
import globalTradeFlowRouter from './routes/global-trade-flow.js';
import realEstateAnalyticsRouter from './routes/real-estate-analytics.js';
import inflationMonitorRouter from './routes/inflation-monitor.js';
import mergerArbitrageRouter from './routes/merger-arbitrage.js';
import sovereignDebtRouter from './routes/sovereign-debt.js';
import etfPremiumRouter from './routes/etf-premium.js';
import commodityDemandRouter from './routes/commodity-demand.js';
import globalDividendRouter from './routes/global-dividend.js';
import cdsIndexMonitorRouter from './routes/cds-index-monitor.js';
import macroRiskRouter from './routes/macro-risk.js';
import fiAttributionAnalysisRouter from './routes/fi-attribution-analysis.js';
import equityStyleRouter from './routes/equity-style.js';
import currencyForecastRouter from './routes/currency-forecast.js';
import bondLadderRouter from './routes/bond-ladder.js';
import sectorCreditSpreadRouter from './routes/sector-credit-spread.js';
import globalPmiDashboardRouter from './routes/global-pmi-dashboard.js';
import earningsWhisperRouter from './routes/earnings-whisper.js';
import portfolioHedgingRouter from './routes/portfolio-hedging.js';
import marketDepthRouter from './routes/market-depth.js';
import irsMonitorRouter from './routes/irs-monitor.js';
import equityCapitalRaiseRouter from './routes/equity-capital-raise.js';
import volatilitySmileRouter from './routes/volatility-smile.js';
import tradeBlotterRouter from './routes/trade-blotter.js';
import repoRateRouter from './routes/repo-rate.js';
import countryRiskRouter from './routes/country-risk.js';
import centralBankBalanceSheetRouter from './routes/central-bank-balance-sheet.js';
import corporateBuybackRouter from './routes/corporate-buyback.js';
import corporateActionsRouter from './routes/corporate-actions.js';
import marginDebtRouter from './routes/margin-debt.js';
import fiscalPolicyRouter from './routes/fiscal-policy.js';
import basisTradeRouter from './routes/basis-trade.js';
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
  app.use('/api/relative-valuation', relativeValuationRouter);
  app.use('/api/confluence', confluenceRouter);
  app.use('/api/iv-surface', ivSurfaceRouter);
  app.use('/api/seasonality', seasonalityRouter);
  app.use('/api/order-flow', orderFlowRouter);
  app.use('/api/portfolio-optimizer', portfolioOptimizerRouter);
  app.use('/api/backtest', backtestRouter);
  app.use('/api/macro-dashboard', macroDashboardRouter);
  app.use('/api/earnings-surprise', earningsSurpriseRouter);
  app.use('/api/futures-curve', futuresCurveRouter);
  app.use('/api/credit-spreads', creditSpreadsRouter);
  app.use('/api/intermarket', intermarketRouter);
  app.use('/api/sector-heatmap', sectorHeatmapRouter);
  app.use('/api/economic-surprises', economicSurprisesRouter);
  app.use('/api/dispersion', dispersionRouter);
  app.use('/api/fund-flows', fundFlowsRouter);
  app.use('/api/vol-term-structure', volTermStructureRouter);
  app.use('/api/macro-heatmap', macroHeatmapRouter);
  app.use('/api/factor-exposure', factorExposureRouter);
  app.use('/api/capital-flows', capitalFlowsRouter);
  app.use('/api/tail-risk', tailRiskRouter);
  app.use('/api/liquidity', liquidityRouter);
  app.use('/api/commodity-spreads', commoditySpreadsRouter);
  app.use('/api/sentiment-dashboard', sentimentDashboardRouter);
  app.use('/api/risk-parity', riskParityRouter);
  app.use('/api/market-anomalies', marketAnomaliesRouter);
  app.use('/api/carry-trade', carryTradeRouter);
  app.use('/api/cot-report', cotReportRouter);
  app.use('/api/iv-rank', ivRankRouter);
  app.use('/api/performance-attribution', performanceAttributionRouter);
  app.use('/api/market-microstructure', marketMicrostructureRouter);
  app.use('/api/positioning', positioningRouter);
  app.use('/api/repo-rates', repoRatesRouter);
  app.use('/api/xccy-basis', xccyBasisRouter);
  app.use('/api/style-box', styleBoxRouter);
  app.use('/api/swap-rates', swapRatesRouter);
  app.use('/api/earnings-calendar', earningsCalendarRouter);
  app.use('/api/inflation-breakeven', inflationBreakevenRouter);
  app.use('/api/corporate-cds', corporateCdsRouter);
  app.use('/api/event-driven', eventDrivenRouter);
  app.use('/api/debt-maturity', debtMaturityRouter);
  app.use('/api/equity-risk-premium', equityRiskPremiumRouter);
  app.use('/api/central-banks', centralBanksRouter);
  app.use('/api/vol-skew', volSkewRouter);
  app.use('/api/global-rates', globalRatesRouter);
  app.use('/api/supply-chain', supplyChainRouter);
  app.use('/api/gamma-exposure', gammaExposureRouter);
  app.use('/api/sovereign-spreads', sovereignSpreadsRouter);
  app.use('/api/earnings-revisions', earningsRevisionsRouter);
  app.use('/api/dividend-forecast', dividendForecastRouter);
  app.use('/api/credit-ratings', creditRatingsRouter);
  app.use('/api/volatility-cone', volatilityConeRouter);
  app.use('/api/term-structure', termStructureRouter);
  app.use('/api/institutional-ownership', institutionalOwnershipRouter);
  app.use('/api/implied-correlation', impliedCorrelationRouter);
  app.use('/api/earnings-quality', earningsQualityRouter);
  app.use('/api/vol-surface', volSurfaceRouter);
  app.use('/api/global-flows', globalFlowsRouter);
  app.use('/api/regression-analysis', regressionAnalysisRouter);
  app.use('/api/covenant-monitor', covenantMonitorRouter);
  app.use('/api/market-internals', marketInternalsRouter);
  app.use('/api/valuation-multiples', valuationMultiplesRouter);
  app.use('/api/fixed-income-analytics', fixedIncomeAnalyticsRouter);
  app.use('/api/insider-sentiment', insiderSentimentRouter);
  app.use('/api/custom-index', customIndexRouter);
  app.use('/api/mbs-analytics', mbsAnalyticsRouter);
  app.use('/api/cdx-index', cdxIndexRouter);
  app.use('/api/muni-bonds', muniBondsRouter);
  app.use('/api/clo-analytics', cloAnalyticsRouter);
  app.use('/api/onchain-analytics', onchainAnalyticsRouter);
  app.use('/api/private-credit', privateCreditRouter);
  app.use('/api/vol-risk-premium', volRiskPremiumRouter);
  app.use('/api/esg-ratings', esgRatingsRouter);
  app.use('/api/freight-indices', freightIndicesRouter);
  app.use('/api/alternative-data', alternativeDataRouter);
  app.use('/api/trade-ideas', tradeIdeasRouter);
  app.use('/api/debt-issuance', debtIssuanceRouter);
  app.use('/api/fx-options', fxOptionsRouter);
  app.use('/api/multi-factor', multiFactorRouter);
  app.use('/api/treasury-auctions', treasuryAuctionsRouter);
  app.use('/api/commodity-curves', commodityCurvesRouter);
  app.use('/api/em-bonds', emBondsRouter);
  app.use('/api/reit-monitor', reitMonitorRouter);
  app.use('/api/money-market', moneyMarketRouter);
  app.use('/api/convertible-bonds', convertibleBondsRouter);
  app.use('/api/global-pmi', globalPmiRouter);
  app.use('/api/leveraged-loans', leveragedLoansRouter);
  app.use('/api/swaption-vol', swaptionVolRouter);
  app.use('/api/distressed-debt', distressedDebtRouter);
  app.use('/api/rate-caps-floors', rateCapsFloorsRouter);
  app.use('/api/dividend-swaps', dividendSwapsRouter);
  app.use('/api/securities-lending', securitiesLendingRouter);
  app.use('/api/variance-swaps', varianceSwapsRouter);
  app.use('/api/carbon-credits', carbonCreditsRouter);
  app.use('/api/weather-derivatives', weatherDerivativesRouter);
  app.use('/api/dark-pool', darkPoolRouter);
  app.use('/api/total-return-swaps', totalReturnSwapsRouter);
  app.use('/api/cat-bonds', catBondsRouter);
  app.use('/api/inflation-linked-bonds', inflationLinkedBondsRouter);
  app.use('/api/equity-basket-swaps', equityBasketSwapsRouter);
  app.use('/api/cross-currency-swaps', crossCurrencySwapsRouter);
  app.use('/api/commodity-options', commodityOptionsRouter);
  app.use('/api/loan-cds', loanCdsRouter);
  app.use('/api/convertible-arb', convertibleArbRouter);
  app.use('/api/shipping-rates', shippingRatesRouter);
  app.use('/api/credit-auction', creditAuctionRouter);
  app.use('/api/muni-yield-curves', muniYieldCurvesRouter);
  app.use('/api/structured-products', structuredProductsRouter);
  app.use('/api/pension-fund', pensionFundRouter);
  app.use('/api/swap-spread-monitor', swapSpreadMonitorRouter);
  app.use('/api/equity-linked-notes', equityLinkedNotesRouter);
  app.use('/api/trade-finance', tradeFinanceRouter);
  app.use('/api/repo-market', repoMarketRouter);
  app.use('/api/commodity-inventory', commodityInventoryRouter);
  app.use('/api/sovereign-wealth', sovereignWealthRouter);
  app.use('/api/agency-mbs-tba', agencyMbsTbaRouter);
  app.use('/api/etf-flows', etfFlowsRouter);
  app.use('/api/credit-flow', creditFlowRouter);
  app.use('/api/commodity-seasonality', commoditySeasonalityRouter);
  app.use('/api/fx-volatility', fxVolatilityRouter);
  app.use('/api/primary-dealer', primaryDealerRouter);
  app.use('/api/real-estate-capital', realEstateCapitalRouter);
  app.use('/api/electricity-markets', electricityMarketsRouter);
  app.use('/api/syndicated-loans', syndicatedLoansRouter);
  app.use('/api/emissions-trading', emissionsTradingRouter);
  app.use('/api/insurance-linked', insuranceLinkedRouter);
  app.use('/api/metals-forward', metalsForwardRouter);
  app.use('/api/central-bank-watch', centralBankWatchRouter);
  app.use('/api/freight-derivatives', freightDerivativesRouter);
  app.use('/api/inflation-breakevens', inflationBreakevensRouter);
  app.use('/api/muni-bond-auction', muniBondAuctionRouter);
  app.use('/api/commodity-curve-analytics', commodityCurveAnalyticsRouter);
  app.use('/api/collateral-monitor', collateralMonitorRouter);
  app.use('/api/sovereign-cds', sovereignCdsRouter);
  app.use('/api/cross-asset-momentum', crossAssetMomentumRouter);
  app.use('/api/crypto-derivatives', cryptoDerivativesRouter);
  app.use('/api/bond-relative-value', bondRelativeValueRouter);
  app.use('/api/volatility-arbitrage', volatilityArbitrageRouter);
  app.use('/api/systematic-strategy', systematicStrategyRouter);
  app.use('/api/funding-rate-monitor', fundingRateMonitorRouter);
  app.use('/api/em-local-rates', emLocalRatesRouter);
  app.use('/api/portfolio-risk-analytics', portfolioRiskAnalyticsRouter);
  app.use('/api/credit-index-monitor', creditIndexMonitorRouter);
  app.use('/api/equity-financing', equityFinancingRouter);
  app.use('/api/global-macro-dashboard', globalMacroDashboardRouter);
  app.use('/api/abs-rmbs-monitor', absRmbsMonitorRouter);
  app.use('/api/liquidity-risk-monitor', liquidityRiskMonitorRouter);
  app.use('/api/fi-attribution', fiAttributionRouter);
  app.use('/api/repo-rate-heatmap', repoRateHeatmapRouter);
  app.use('/api/trade-compression', tradeCompressionRouter);
  app.use('/api/regulatory-capital', regulatoryCapitalRouter);
  app.use('/api/settlement-risk', settlementRiskRouter);
  app.use('/api/swap-valuation', swapValuationRouter);
  app.use('/api/commodity-storage', commodityStorageRouter);
  app.use('/api/counterparty-exposure', counterpartyExposureRouter);
  app.use('/api/market-impact-model', marketImpactModelRouter);
  app.use('/api/structured-notes', structuredNotesRouter);
  app.use('/api/securities-finance', securitiesFinanceRouter);
  app.use('/api/credit-curve-builder', creditCurveBuilderRouter);
  app.use('/api/execution-analytics', executionAnalyticsRouter);
  app.use('/api/bond-auction-calendar', bondAuctionCalendarRouter);
  app.use('/api/fx-carry-monitor', fxCarryMonitorRouter);
  app.use('/api/equity-capital-markets', equityCapitalMarketsRouter);
  app.use('/api/debt-capital-markets', debtCapitalMarketsRouter);
  app.use('/api/hedge-fund-monitor', hedgeFundMonitorRouter);
  app.use('/api/risk-dashboard', riskDashboardRouter);
  app.use('/api/benchmark-tracker', benchmarkTrackerRouter);
  app.use('/api/liquidity-coverage', liquidityCoverageRouter);
  app.use('/api/market-sentiment-index', marketSentimentIndexRouter);
  app.use('/api/portfolio-stress-test', portfolioStressTestRouter);
  app.use('/api/global-liquidity-monitor', globalLiquidityMonitorRouter);
  app.use('/api/trade-recap', tradeRecapRouter);
  app.use('/api/macro-surprise-tracker', macroSurpriseTrackerRouter);
  app.use('/api/fx-volatility-surface', fxVolatilitySurfaceRouter);
  app.use('/api/commodity-fundamental', commodityFundamentalRouter);
  app.use('/api/etf-flow-monitor', etfFlowMonitorRouter);
  app.use('/api/equity-factor-monitor', equityFactorMonitorRouter);
  app.use('/api/rates-strategy', ratesStrategyRouter);
  app.use('/api/credit-portfolio', creditPortfolioRouter);
  app.use('/api/macro-regime-monitor', macroRegimeMonitorRouter);
  app.use('/api/dividend-calendar', dividendCalendarRouter);
  app.use('/api/convertible-arbitrage', convertibleArbitrageRouter);
  app.use('/api/realtime-pnl', realtimePnlRouter);
  app.use('/api/market-breadth-advanced', marketBreadthAdvancedRouter);
  app.use('/api/volatility-dashboard', volatilityDashboardRouter);
  app.use('/api/fi-relative-value', fiRelativeValueRouter);
  app.use('/api/equity-screen-results', equityScreenResultsRouter);
  app.use('/api/cross-asset-correlation', crossAssetCorrelationRouter);
  app.use('/api/portfolio-attribution', portfolioAttributionRouter);
  app.use('/api/ipo-calendar', ipoCalendarRouter);
  app.use('/api/municipal-bond-monitor', municipalBondMonitorRouter);
  app.use('/api/structured-credit', structuredCreditRouter);
  app.use('/api/currency-options', currencyOptionsRouter);
  app.use('/api/swap-curve-monitor', swapCurveMonitorRouter);
  app.use('/api/fund-flow-analytics', fundFlowAnalyticsRouter);
  app.use('/api/trade-cost-analysis', tradeCostAnalysisRouter);
  app.use('/api/warrant-convertible', warrantConvertibleRouter);
  app.use('/api/global-trade-flow', globalTradeFlowRouter);
  app.use('/api/real-estate-analytics', realEstateAnalyticsRouter);
  app.use('/api/inflation-monitor', inflationMonitorRouter);
  app.use('/api/merger-arbitrage', mergerArbitrageRouter);
  app.use('/api/sovereign-debt', sovereignDebtRouter);
  app.use('/api/etf-premium', etfPremiumRouter);
  app.use('/api/commodity-demand', commodityDemandRouter);
  app.use('/api/global-dividend', globalDividendRouter);
  app.use('/api/cds-index-monitor', cdsIndexMonitorRouter);
  app.use('/api/macro-risk', macroRiskRouter);
  app.use('/api/fi-attribution-analysis', fiAttributionAnalysisRouter);
  app.use('/api/equity-style', equityStyleRouter);
  app.use('/api/currency-forecast', currencyForecastRouter);
  app.use('/api/bond-ladder', bondLadderRouter);
  app.use('/api/sector-credit-spread', sectorCreditSpreadRouter);
  app.use('/api/global-pmi-dashboard', globalPmiDashboardRouter);
  app.use('/api/earnings-whisper', earningsWhisperRouter);
  app.use('/api/portfolio-hedging', portfolioHedgingRouter);
  app.use('/api/market-depth', marketDepthRouter);
  app.use('/api/irs-monitor', irsMonitorRouter);
  app.use('/api/equity-capital-raise', equityCapitalRaiseRouter);
  app.use('/api/volatility-smile', volatilitySmileRouter);
  app.use('/api/trade-blotter', tradeBlotterRouter);
  app.use('/api/repo-rate', repoRateRouter);
  app.use('/api/country-risk', countryRiskRouter);
  app.use('/api/central-bank-balance-sheet', centralBankBalanceSheetRouter);
  app.use('/api/corporate-buyback', corporateBuybackRouter);
  app.use('/api/corporate-actions', corporateActionsRouter);
  app.use('/api/margin-debt', marginDebtRouter);
  app.use('/api/fiscal-policy', fiscalPolicyRouter);
  app.use('/api/basis-trade', basisTradeRouter);

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
