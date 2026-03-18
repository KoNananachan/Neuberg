import { useCallback, useRef, useEffect } from 'react';
import { Layout, Model, type IJsonModel, type TabNode, type Action, Actions, DockLocation } from 'flexlayout-react';
// CSS imported via index.css to avoid duplication

import { lazy, Suspense } from 'react';
import { NewsFeed } from '../panels/news-feed';
import { StockPanel } from '../panels/stock-panel';
import { AiInsights } from '../panels/ai-insights';
import { TerminalLog } from '../layout/terminal-log';
import { PanelErrorBoundary } from '../common/error-boundary';
import { useAppStore } from '../../stores/use-app-store';
import { translations, type TranslationKey } from '../../i18n/translations';

// Lazy load heavy panels
const WorldMapPanel = lazy(() => import('../panels/world-map-panel').then(m => ({ default: m.WorldMapPanel })));
const TradingPanel = lazy(() => import('../panels/trading-panel').then(m => ({ default: m.TradingPanel })));
const EconomicCalendarPanel = lazy(() => import('../panels/economic-calendar-panel').then(m => ({ default: m.EconomicCalendarPanel })));
const AlertsPanel = lazy(() => import('../panels/alerts-panel').then(m => ({ default: m.AlertsPanel })));
const SentimentPanel = lazy(() => import('../panels/sentiment-panel').then(m => ({ default: m.SentimentPanel })));
const RiskCalculator = lazy(() => import('../panels/risk-calculator').then(m => ({ default: m.RiskCalculator })));
const SectorRotationPanel = lazy(() => import('../panels/sector-rotation-panel').then(m => ({ default: m.SectorRotationPanel })));
const EarningsCalendarPanel = lazy(() => import('../panels/earnings-calendar-panel').then(m => ({ default: m.EarningsCalendarPanel })));
const OptionsFlowPanel = lazy(() => import('../panels/options-flow-panel').then(m => ({ default: m.OptionsFlowPanel })));
const InsiderTradesPanel = lazy(() => import('../panels/insider-trades-panel').then(m => ({ default: m.InsiderTradesPanel })));
const CorrelationMatrixPanel = lazy(() => import('../panels/correlation-matrix-panel').then(m => ({ default: m.CorrelationMatrixPanel })));
const LiveStreamsPanel = lazy(() => import('../panels/live-streams-panel').then(m => ({ default: m.LiveStreamsPanel })));
const PredictionTradingPanel = lazy(() => import('../panels/prediction-trading-panel').then(m => ({ default: m.PredictionTradingPanel })));
const MissedOpportunitiesPanel = lazy(() => import('../panels/missed-opportunities-panel').then(m => ({ default: m.MissedOpportunitiesPanel })));
const MarketMoversPanel = lazy(() => import('../panels/market-movers-panel').then(m => ({ default: m.MarketMoversPanel })));
const ForexPanel = lazy(() => import('../panels/forex-panel').then(m => ({ default: m.ForexPanel })));
const BondsPanel = lazy(() => import('../panels/bonds-panel').then(m => ({ default: m.BondsPanel })));
const CommoditiesPanel = lazy(() => import('../panels/commodities-panel').then(m => ({ default: m.CommoditiesPanel })));
const CryptoPanel = lazy(() => import('../panels/crypto-panel').then(m => ({ default: m.CryptoPanel })));
const GlobalDashboardPanel = lazy(() => import('../panels/global-dashboard-panel').then(m => ({ default: m.GlobalDashboardPanel })));
const ScannerPanel = lazy(() => import('../panels/scanner-panel').then(m => ({ default: m.ScannerPanel })));
const ScreenerPanel = lazy(() => import('../panels/screener-panel').then(m => ({ default: m.ScreenerPanel })));
const HeatMapPanel = lazy(() => import('../panels/heat-map-panel').then(m => ({ default: m.HeatMapPanel })));
const ETFPanel = lazy(() => import('../panels/etf-panel').then(m => ({ default: m.ETFPanel })));
const DividendPanel = lazy(() => import('../panels/dividend-panel').then(m => ({ default: m.DividendPanel })));
const IPOPanel = lazy(() => import('../panels/ipo-panel').then(m => ({ default: m.IPOPanel })));
const AnalystPanel = lazy(() => import('../panels/analyst-panel').then(m => ({ default: m.AnalystPanel })));
const BreadthPanel = lazy(() => import('../panels/breadth-panel').then(m => ({ default: m.BreadthPanel })));
const FinancialsPanel = lazy(() => import('../panels/financials-panel').then(m => ({ default: m.FinancialsPanel })));
const FuturesPanel = lazy(() => import('../panels/futures-panel').then(m => ({ default: m.FuturesPanel })));
const ComparisonPanel = lazy(() => import('../panels/comparison-panel').then(m => ({ default: m.ComparisonPanel })));
const ShortInterestPanel = lazy(() => import('../panels/short-interest-panel').then(m => ({ default: m.ShortInterestPanel })));
const OptionsCalcPanel = lazy(() => import('../panels/options-calc-panel').then(m => ({ default: m.OptionsCalcPanel })));
const FXConverterPanel = lazy(() => import('../panels/fx-converter-panel').then(m => ({ default: m.FXConverterPanel })));
const BondCalcPanel = lazy(() => import('../panels/bond-calc-panel').then(m => ({ default: m.BondCalcPanel })));
const CompanyProfilePanel = lazy(() => import('../panels/company-profile-panel').then(m => ({ default: m.CompanyProfilePanel })));
const PivotPointsPanel = lazy(() => import('../panels/pivot-points-panel').then(m => ({ default: m.PivotPointsPanel })));
const MarketHoursPanel = lazy(() => import('../panels/market-hours-panel').then(m => ({ default: m.MarketHoursPanel })));
const MarketCalendarPanel = lazy(() => import('../panels/market-calendar-panel').then(m => ({ default: m.MarketCalendarPanel })));
const PairsPanel = lazy(() => import('../panels/pairs-panel').then(m => ({ default: m.PairsPanel })));
const VolatilityPanel = lazy(() => import('../panels/volatility-panel').then(m => ({ default: m.VolatilityPanel })));
const FibonacciPanel = lazy(() => import('../panels/fibonacci-panel').then(m => ({ default: m.FibonacciPanel })));
const MortgageCalcPanel = lazy(() => import('../panels/mortgage-calc-panel').then(m => ({ default: m.MortgageCalcPanel })));
const InvestmentCalcPanel = lazy(() => import('../panels/investment-calc-panel').then(m => ({ default: m.InvestmentCalcPanel })));
const RelativeStrengthPanel = lazy(() => import('../panels/relative-strength-panel').then(m => ({ default: m.RelativeStrengthPanel })));
const WatchlistPanel = lazy(() => import('../panels/watchlist-panel').then(m => ({ default: m.WatchlistPanel })));
const EconomicIndicatorsPanel = lazy(() => import('../panels/economic-indicators-panel').then(m => ({ default: m.EconomicIndicatorsPanel })));
const FXCrossPanel = lazy(() => import('../panels/fx-cross-panel').then(m => ({ default: m.FxCrossPanel })));
const PortfolioAnalyticsPanel = lazy(() => import('../panels/portfolio-analytics-panel').then(m => ({ default: m.PortfolioAnalyticsPanel })));
const FearGreedPanel = lazy(() => import('../panels/fear-greed-panel').then(m => ({ default: m.FearGreedPanel })));
const SentimentHeatmapPanel = lazy(() => import('../panels/sentiment-heatmap-panel').then(m => ({ default: m.SentimentHeatmapPanel })));
const YieldCurvePanel = lazy(() => import('../panels/yield-curve-panel').then(m => ({ default: m.YieldCurvePanel })));
const CurrencyStrengthPanel = lazy(() => import('../panels/currency-strength-panel').then(m => ({ default: m.CurrencyStrengthPanel })));
const MoneyFlowPanel = lazy(() => import('../panels/money-flow-panel').then(m => ({ default: m.MoneyFlowPanel })));
const TechnicalChartPanel = lazy(() => import('../panels/technical-chart-panel').then(m => ({ default: m.TechnicalChartPanel })));
const EarningsEstimatesPanel = lazy(() => import('../panels/earnings-estimates-panel').then(m => ({ default: m.EarningsEstimatesPanel })));
const WorldEconomyPanel = lazy(() => import('../panels/world-economy-panel').then(m => ({ default: m.WorldEconomyPanel })));
const CrossAssetPanel = lazy(() => import('../panels/cross-asset-panel').then(m => ({ default: m.CrossAssetPanel })));
const HoldingsPanel = lazy(() => import('../panels/holdings-panel').then(m => ({ default: m.HoldingsPanel })));
const SectorPerformancePanel = lazy(() => import('../panels/sector-performance-panel').then(m => ({ default: m.SectorPerformancePanel })));
const ETFHoldingsPanel = lazy(() => import('../panels/etf-holdings-panel').then(m => ({ default: m.ETFHoldingsPanel })));
const DrawdownPanel = lazy(() => import('../panels/drawdown-panel').then(m => ({ default: m.DrawdownPanel })));
const MarketRegimePanel = lazy(() => import('../panels/market-regime-panel').then(m => ({ default: m.MarketRegimePanel })));
const RelativeValuationPanel = lazy(() => import('../panels/relative-valuation-panel').then(m => ({ default: m.RelativeValuationPanel })));
const ConfluencePanel = lazy(() => import('../panels/confluence-panel').then(m => ({ default: m.ConfluencePanel })));
const IVSurfacePanel = lazy(() => import('../panels/iv-surface-panel').then(m => ({ default: m.IVSurfacePanel })));
const SeasonalityPanel = lazy(() => import('../panels/seasonality-panel').then(m => ({ default: m.SeasonalityPanel })));
const OrderFlowPanel = lazy(() => import('../panels/order-flow-panel').then(m => ({ default: m.OrderFlowPanel })));
const PortfolioOptimizerPanel = lazy(() => import('../panels/portfolio-optimizer-panel').then(m => ({ default: m.PortfolioOptimizerPanel })));

function LazyWrap({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full bg-black gap-2">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent animate-spin" />
        <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">{translations[useAppStore.getState().locale]?.loading ?? 'Loading...'}</span>
      </div>
    }>
      {children}
    </Suspense>
  );
}

const STORAGE_KEY = 'terminal-layout';
const LAYOUT_VERSION_KEY = 'terminal-layout-version';
const LAYOUT_VERSION = 25; // bump this when default layout changes to force reset

export const PANEL_IDS = {
  NEWS: 'news-feed',
  MAP: 'world-map',
  STOCKS: 'market-watch',
  AI: 'ai-insights',
  LOG: 'terminal-log',
  TRADING: 'trading',
  AI_CHAT: 'ai-chat',
  ECON_CALENDAR: 'econ-calendar',
  ALERTS: 'alerts',
  SENTIMENT: 'sentiment',
  RISK: 'risk-calculator',
  SECTORS: 'sector-rotation',
  EARNINGS: 'earnings-calendar',
  OPTIONS: 'options-flow',
  INSIDERS: 'insider-trades',
  CORRELATIONS: 'correlation-matrix',
  LIVE_STREAMS: 'live-streams',
  PREDICTION: 'prediction-trading',
  MISSED_OPP: 'missed-opportunities',
  MARKET_MOVERS: 'market-movers',
  FOREX: 'forex',
  BONDS: 'bonds-rates',
  COMMODITIES: 'commodities',
  CRYPTO: 'crypto-overview',
  GLOBAL_DASHBOARD: 'global-dashboard',
  SCANNER: 'tech-scanner',
  SCREENER: 'stock-screener',
  HEAT_MAP: 'heat-map',
  ETF: 'etf-explorer',
  DIVIDENDS: 'dividends',
  IPO: 'ipo-calendar',
  ANALYST: 'analyst-ratings',
  BREADTH: 'market-breadth',
  FINANCIALS: 'financials',
  FUTURES: 'futures',
  PERFORMANCE: 'performance',
  SHORT_INTEREST: 'short-interest',
  OPTIONS_CALC: 'options-calc',
  FX_CONVERTER: 'fx-converter',
  BOND_CALC: 'bond-calc',
  COMPANY_PROFILE: 'company-profile',
  PIVOT_POINTS: 'pivot-points',
  MARKET_HOURS: 'market-hours',
  MARKET_CALENDAR: 'market-calendar',
  PAIRS_TRADING: 'pairs-trading',
  VOLATILITY: 'volatility',
  FIBONACCI: 'fibonacci',
  MORTGAGE_CALC: 'mortgage-calc',
  INVESTMENT_CALC: 'investment-calc',
  RELATIVE_STRENGTH: 'relative-strength',
  WATCHLIST: 'watchlist',
  ECON_INDICATORS: 'econ-indicators',
  FX_CROSS: 'fx-cross-rates',
  PORTFOLIO: 'portfolio-analytics',
  FEAR_GREED: 'fear-greed',
  SENTIMENT_HEATMAP: 'sentiment-heatmap',
  YIELD_CURVE: 'yield-curve',
  CURRENCY_STRENGTH: 'currency-strength',
  MONEY_FLOW: 'money-flow',
  TECHNICAL_CHART: 'technical-chart',
  EARNINGS_ESTIMATES: 'earnings-estimates',
  WORLD_ECONOMY: 'world-economy',
  CROSS_ASSET: 'cross-asset',
  HOLDINGS: 'holdings',
  SECTOR_PERFORMANCE: 'sector-performance',
  ETF_HOLDINGS: 'etf-holdings',
  DRAWDOWN: 'drawdown',
  MARKET_REGIME: 'market-regime',
  RELATIVE_VALUATION: 'relative-valuation',
  CONFLUENCE: 'technical-confluence',
  IV_SURFACE: 'iv-surface',
  SEASONALITY: 'seasonality',
  ORDER_FLOW: 'order-flow',
  PORTFOLIO_OPTIMIZER: 'portfolio-optimizer',
} as const;

export const PANEL_NAMES: Record<string, string> = {
  [PANEL_IDS.NEWS]: 'NEWS FEED',
  [PANEL_IDS.MAP]: 'WORLD MAP',
  [PANEL_IDS.STOCKS]: 'MARKET WATCH',
  [PANEL_IDS.AI]: 'AI INSIGHTS',
  [PANEL_IDS.LOG]: 'TERMINAL LOG',
  [PANEL_IDS.TRADING]: 'STOCK TRADING',
  [PANEL_IDS.AI_CHAT]: 'AI CHAT',
  [PANEL_IDS.ECON_CALENDAR]: 'ECONOMIC CALENDAR',
  [PANEL_IDS.ALERTS]: 'ALERTS',
  [PANEL_IDS.SENTIMENT]: 'SENTIMENT',
  [PANEL_IDS.RISK]: 'RISK CALCULATOR',
  [PANEL_IDS.SECTORS]: 'SECTOR ROTATION',
  [PANEL_IDS.EARNINGS]: 'EARNINGS CALENDAR',
  [PANEL_IDS.OPTIONS]: 'OPTIONS FLOW',
  [PANEL_IDS.INSIDERS]: 'INSIDER TRADES',
  [PANEL_IDS.CORRELATIONS]: 'CORRELATIONS',
  [PANEL_IDS.LIVE_STREAMS]: 'LIVE STREAMS',
  [PANEL_IDS.PREDICTION]: 'PREDICTION TRADING',
  [PANEL_IDS.MISSED_OPP]: 'MISSED OPPORTUNITIES',
  [PANEL_IDS.MARKET_MOVERS]: 'MARKET MOVERS',
  [PANEL_IDS.FOREX]: 'FOREX',
  [PANEL_IDS.BONDS]: 'BONDS & RATES',
  [PANEL_IDS.COMMODITIES]: 'COMMODITIES',
  [PANEL_IDS.CRYPTO]: 'CRYPTO OVERVIEW',
  [PANEL_IDS.GLOBAL_DASHBOARD]: 'GLOBAL DASHBOARD',
  [PANEL_IDS.SCANNER]: 'TECHNICAL SCANNER',
  [PANEL_IDS.SCREENER]: 'STOCK SCREENER',
  [PANEL_IDS.HEAT_MAP]: 'HEAT MAP',
  [PANEL_IDS.ETF]: 'ETF EXPLORER',
  [PANEL_IDS.DIVIDENDS]: 'DIVIDENDS',
  [PANEL_IDS.IPO]: 'IPO CALENDAR',
  [PANEL_IDS.ANALYST]: 'ANALYST RATINGS',
  [PANEL_IDS.BREADTH]: 'MARKET BREADTH',
  [PANEL_IDS.FINANCIALS]: 'FINANCIALS',
  [PANEL_IDS.FUTURES]: 'FUTURES',
  [PANEL_IDS.PERFORMANCE]: 'PERFORMANCE',
  [PANEL_IDS.SHORT_INTEREST]: 'SHORT INTEREST',
  [PANEL_IDS.OPTIONS_CALC]: 'OPTIONS CALC',
  [PANEL_IDS.FX_CONVERTER]: 'FX CONVERTER',
  [PANEL_IDS.BOND_CALC]: 'BOND CALC',
  [PANEL_IDS.COMPANY_PROFILE]: 'COMPANY PROFILE',
  [PANEL_IDS.PIVOT_POINTS]: 'PIVOT POINTS',
  [PANEL_IDS.MARKET_HOURS]: 'MARKET HOURS',
  [PANEL_IDS.MARKET_CALENDAR]: 'MARKET CALENDAR',
  [PANEL_IDS.PAIRS_TRADING]: 'PAIRS TRADING',
  [PANEL_IDS.VOLATILITY]: 'VOLATILITY',
  [PANEL_IDS.FIBONACCI]: 'FIBONACCI',
  [PANEL_IDS.MORTGAGE_CALC]: 'MORTGAGE CALC',
  [PANEL_IDS.INVESTMENT_CALC]: 'INVESTMENT CALC',
  [PANEL_IDS.RELATIVE_STRENGTH]: 'RELATIVE STRENGTH',
  [PANEL_IDS.WATCHLIST]: 'WATCHLIST',
  [PANEL_IDS.ECON_INDICATORS]: 'ECONOMIC INDICATORS',
  [PANEL_IDS.FX_CROSS]: 'FX CROSS RATES',
  [PANEL_IDS.PORTFOLIO]: 'PORTFOLIO ANALYTICS',
  [PANEL_IDS.FEAR_GREED]: 'FEAR & GREED',
  [PANEL_IDS.SENTIMENT_HEATMAP]: 'SENTIMENT HEATMAP',
  [PANEL_IDS.YIELD_CURVE]: 'YIELD CURVE',
  [PANEL_IDS.CURRENCY_STRENGTH]: 'CURRENCY STRENGTH',
  [PANEL_IDS.MONEY_FLOW]: 'MONEY FLOW',
  [PANEL_IDS.TECHNICAL_CHART]: 'TECHNICAL CHART',
  [PANEL_IDS.EARNINGS_ESTIMATES]: 'EARNINGS ESTIMATES',
  [PANEL_IDS.WORLD_ECONOMY]: 'WORLD ECONOMY',
  [PANEL_IDS.CROSS_ASSET]: 'CROSS-ASSET',
  [PANEL_IDS.HOLDINGS]: 'INSTITUTIONAL HOLDINGS',
  [PANEL_IDS.SECTOR_PERFORMANCE]: 'SECTOR PERFORMANCE',
  [PANEL_IDS.ETF_HOLDINGS]: 'ETF HOLDINGS',
  [PANEL_IDS.DRAWDOWN]: 'DRAWDOWN ANALYSIS',
  [PANEL_IDS.MARKET_REGIME]: 'MARKET REGIME',
  [PANEL_IDS.RELATIVE_VALUATION]: 'RELATIVE VALUATION',
  [PANEL_IDS.CONFLUENCE]: 'TECHNICAL CONFLUENCE',
  [PANEL_IDS.IV_SURFACE]: 'IV SURFACE',
  [PANEL_IDS.SEASONALITY]: 'SEASONALITY',
  [PANEL_IDS.ORDER_FLOW]: 'ORDER FLOW',
  [PANEL_IDS.PORTFOLIO_OPTIMIZER]: 'PORTFOLIO OPTIMIZER',
};

/** Maps panel IDs to i18n translation keys */
export const PANEL_NAME_KEYS: Record<string, TranslationKey> = {
  [PANEL_IDS.NEWS]: 'panelNewsFeed',
  [PANEL_IDS.MAP]: 'panelWorldMap',
  [PANEL_IDS.STOCKS]: 'panelMarketWatch',
  [PANEL_IDS.AI]: 'panelAiInsights',
  [PANEL_IDS.LOG]: 'panelTerminalLog',
  [PANEL_IDS.TRADING]: 'panelStockTrading',
  [PANEL_IDS.AI_CHAT]: 'panelAiChat',
  [PANEL_IDS.ECON_CALENDAR]: 'panelEconCalendar',
  [PANEL_IDS.ALERTS]: 'panelAlerts',
  [PANEL_IDS.SENTIMENT]: 'panelSentiment',
  [PANEL_IDS.RISK]: 'panelRiskCalc',
  [PANEL_IDS.SECTORS]: 'panelSectorRotation',
  [PANEL_IDS.EARNINGS]: 'panelEarningsCalendar',
  [PANEL_IDS.OPTIONS]: 'panelOptionsFlow',
  [PANEL_IDS.INSIDERS]: 'panelInsiderTrades',
  [PANEL_IDS.CORRELATIONS]: 'panelCorrelations',
  [PANEL_IDS.LIVE_STREAMS]: 'panelLiveStreams',
  [PANEL_IDS.PREDICTION]: 'panelPredictionTrading',
  [PANEL_IDS.MISSED_OPP]: 'panelMissedOpportunities',
  [PANEL_IDS.MARKET_MOVERS]: 'panelMarketMovers',
  [PANEL_IDS.FOREX]: 'panelForex',
  [PANEL_IDS.BONDS]: 'panelBonds',
  [PANEL_IDS.COMMODITIES]: 'panelCommodities',
  [PANEL_IDS.CRYPTO]: 'panelCrypto',
  [PANEL_IDS.GLOBAL_DASHBOARD]: 'panelGlobalDashboard',
  [PANEL_IDS.SCANNER]: 'panelScanner',
  [PANEL_IDS.SCREENER]: 'panelScreener',
  [PANEL_IDS.HEAT_MAP]: 'panelHeatMap',
  [PANEL_IDS.ETF]: 'panelETF',
  [PANEL_IDS.DIVIDENDS]: 'panelDividends',
  [PANEL_IDS.IPO]: 'panelIPO',
  [PANEL_IDS.ANALYST]: 'panelAnalyst',
  [PANEL_IDS.BREADTH]: 'panelBreadth',
  [PANEL_IDS.FINANCIALS]: 'panelFinancials',
  [PANEL_IDS.FUTURES]: 'panelFutures',
  [PANEL_IDS.PERFORMANCE]: 'panelPerformance',
  [PANEL_IDS.SHORT_INTEREST]: 'panelShortInterest',
  [PANEL_IDS.OPTIONS_CALC]: 'panelOptionsCalc',
  [PANEL_IDS.FX_CONVERTER]: 'panelFXConverter',
  [PANEL_IDS.BOND_CALC]: 'panelBondCalc',
  [PANEL_IDS.COMPANY_PROFILE]: 'panelCompanyProfile',
  [PANEL_IDS.PIVOT_POINTS]: 'panelPivotPoints',
  [PANEL_IDS.MARKET_HOURS]: 'panelMarketHours',
  [PANEL_IDS.MARKET_CALENDAR]: 'panelMarketCalendar',
  [PANEL_IDS.PAIRS_TRADING]: 'panelPairs',
  [PANEL_IDS.VOLATILITY]: 'panelVolatility',
  [PANEL_IDS.FIBONACCI]: 'panelFibonacci',
  [PANEL_IDS.MORTGAGE_CALC]: 'panelMortgage',
  [PANEL_IDS.INVESTMENT_CALC]: 'panelInvestCalc',
  [PANEL_IDS.RELATIVE_STRENGTH]: 'panelRelStrength',
  [PANEL_IDS.WATCHLIST]: 'panelWatchlist',
  [PANEL_IDS.ECON_INDICATORS]: 'panelEconIndicators',
  [PANEL_IDS.FX_CROSS]: 'panelFXCross',
  [PANEL_IDS.PORTFOLIO]: 'panelPortfolio',
  [PANEL_IDS.FEAR_GREED]: 'panelFearGreed',
  [PANEL_IDS.SENTIMENT_HEATMAP]: 'panelSentimentHeatmap',
  [PANEL_IDS.YIELD_CURVE]: 'panelYieldCurve',
  [PANEL_IDS.CURRENCY_STRENGTH]: 'panelCurrencyStrength',
  [PANEL_IDS.MONEY_FLOW]: 'panelMoneyFlow',
  [PANEL_IDS.TECHNICAL_CHART]: 'panelTechnicalChart',
  [PANEL_IDS.EARNINGS_ESTIMATES]: 'panelEarningsEstimates',
  [PANEL_IDS.WORLD_ECONOMY]: 'panelWorldEconomy',
  [PANEL_IDS.CROSS_ASSET]: 'panelCrossAsset',
  [PANEL_IDS.HOLDINGS]: 'panelHoldings',
  [PANEL_IDS.SECTOR_PERFORMANCE]: 'panelSectorPerformance',
  [PANEL_IDS.ETF_HOLDINGS]: 'panelETFHoldings',
  [PANEL_IDS.DRAWDOWN]: 'panelDrawdown',
  [PANEL_IDS.MARKET_REGIME]: 'panelMarketRegime',
  [PANEL_IDS.RELATIVE_VALUATION]: 'panelRelativeValuation',
  [PANEL_IDS.CONFLUENCE]: 'panelConfluence',
  [PANEL_IDS.IV_SURFACE]: 'panelIVSurface',
  [PANEL_IDS.SEASONALITY]: 'panelSeasonality',
  [PANEL_IDS.ORDER_FLOW]: 'panelOrderFlow',
  [PANEL_IDS.PORTFOLIO_OPTIMIZER]: 'panelPortfolioOptimizer',
};

/** Get localized panel name (non-hook, reads locale from store directly) */
export function getLocalizedPanelName(panelId: string): string {
  const locale = useAppStore.getState().locale;
  const key = PANEL_NAME_KEYS[panelId];
  if (key) {
    return translations[locale]?.[key] ?? translations.en[key];
  }
  return PANEL_NAMES[panelId] || panelId;
}

export const ALL_PANEL_IDS = Object.values(PANEL_IDS);

/** Panel IDs that exist in the DEFAULT_LAYOUT (core panels shown on first load) */
const DEFAULT_PANEL_IDS: Set<string> = new Set([
  PANEL_IDS.TECHNICAL_CHART, PANEL_IDS.CROSS_ASSET, PANEL_IDS.SECTOR_PERFORMANCE,
  PANEL_IDS.HEAT_MAP, PANEL_IDS.YIELD_CURVE, PANEL_IDS.MONEY_FLOW,
  PANEL_IDS.CURRENCY_STRENGTH, PANEL_IDS.HOLDINGS, PANEL_IDS.EARNINGS_ESTIMATES,
  PANEL_IDS.STOCKS, PANEL_IDS.NEWS, PANEL_IDS.FEAR_GREED,
  PANEL_IDS.FX_CROSS, PANEL_IDS.WORLD_ECONOMY,
]);

/*
 * Pro layout — maximum information density, showcasing advanced analytics:
 *
 * +------ 30% ------+---------- 40% ----------+------- 30% --------+
 * |                  | SECTOR PERF  (tab)      | CROSS-ASSET  (tab) |
 * | TECHNICAL CHART  | HEAT MAP     (tab)      | CURRENCY STR (tab) |
 * | (55%)            | YIELD CURVE  (tab)      | WORLD ECONOMY(tab) |
 * |                  | FX CROSS     (tab)      | (45%)              |
 * |                  |         (55%)           +--------------------+
 * +------------------+                         | HOLDINGS     (tab) |
 * | MARKET WATCH     +---------+---------------+ EARNINGS EST (tab) |
 * | (tab)            | MONEY   | FEAR &        | (55%)              |
 * | NEWS FEED  (tab) | FLOW    | GREED         |                    |
 * | (45%)            | (45%)   | (45%)         |                    |
 * +------------------+---------+---------------+--------------------+
 */
const DEFAULT_LAYOUT: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabSetEnableClose: false,
    splitterSize: 2,
    splitterExtra: 6,
    tabSetMinHeight: 80,
    tabSetMinWidth: 80,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // Left column: Technical Chart on top, Market Watch + News on bottom
      {
        type: 'row',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 55,
            children: [
              { type: 'tab', name: 'TECHNICAL CHART', component: PANEL_IDS.TECHNICAL_CHART, id: PANEL_IDS.TECHNICAL_CHART },
            ],
          },
          {
            type: 'tabset',
            weight: 45,
            children: [
              { type: 'tab', name: 'MARKET WATCH', component: PANEL_IDS.STOCKS, id: PANEL_IDS.STOCKS },
              { type: 'tab', name: 'NEWS FEED', component: PANEL_IDS.NEWS, id: PANEL_IDS.NEWS },
            ],
          },
        ],
      },
      // Center column: Sector Perf/Heat Map/Yield Curve/FX Cross on top, Money Flow + Fear&Greed on bottom
      {
        type: 'row',
        weight: 40,
        children: [
          {
            type: 'tabset',
            weight: 55,
            children: [
              { type: 'tab', name: 'SECTOR PERFORMANCE', component: PANEL_IDS.SECTOR_PERFORMANCE, id: PANEL_IDS.SECTOR_PERFORMANCE },
              { type: 'tab', name: 'HEAT MAP', component: PANEL_IDS.HEAT_MAP, id: PANEL_IDS.HEAT_MAP },
              { type: 'tab', name: 'YIELD CURVE', component: PANEL_IDS.YIELD_CURVE, id: PANEL_IDS.YIELD_CURVE },
              { type: 'tab', name: 'FX CROSS RATES', component: PANEL_IDS.FX_CROSS, id: PANEL_IDS.FX_CROSS },
            ],
          },
          {
            type: 'row',
            weight: 45,
            children: [
              {
                type: 'tabset',
                weight: 55,
                children: [
                  { type: 'tab', name: 'MONEY FLOW', component: PANEL_IDS.MONEY_FLOW, id: PANEL_IDS.MONEY_FLOW },
                ],
              },
              {
                type: 'tabset',
                weight: 45,
                children: [
                  { type: 'tab', name: 'FEAR & GREED', component: PANEL_IDS.FEAR_GREED, id: PANEL_IDS.FEAR_GREED },
                ],
              },
            ],
          },
        ],
      },
      // Right column: Cross-Asset/Currency/World on top, Holdings/Earnings on bottom
      {
        type: 'row',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 45,
            children: [
              { type: 'tab', name: 'CROSS-ASSET', component: PANEL_IDS.CROSS_ASSET, id: PANEL_IDS.CROSS_ASSET },
              { type: 'tab', name: 'CURRENCY STRENGTH', component: PANEL_IDS.CURRENCY_STRENGTH, id: PANEL_IDS.CURRENCY_STRENGTH },
              { type: 'tab', name: 'WORLD ECONOMY', component: PANEL_IDS.WORLD_ECONOMY, id: PANEL_IDS.WORLD_ECONOMY },
            ],
          },
          {
            type: 'tabset',
            weight: 55,
            children: [
              { type: 'tab', name: 'INSTITUTIONAL HOLDINGS', component: PANEL_IDS.HOLDINGS, id: PANEL_IDS.HOLDINGS },
              { type: 'tab', name: 'EARNINGS ESTIMATES', component: PANEL_IDS.EARNINGS_ESTIMATES, id: PANEL_IDS.EARNINGS_ESTIMATES },
            ],
          },
        ],
      },
    ],
  },
};

/** Build a layout from default, excluding hidden panels */
function buildLayout(hiddenPanels: string[]): IJsonModel {
  if (hiddenPanels.length === 0) return DEFAULT_LAYOUT;

  const layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as IJsonModel;

  function prune(node: any): boolean {
    if (!node.children) return true;
    node.children = node.children.filter((child: any) => {
      // Remove hidden tabs
      if (child.type === 'tab' && hiddenPanels.includes(child.id)) return false;
      // Recurse
      return prune(child);
    });
    // Remove empty tabsets or rows
    if ((node.type === 'tabset' || node.type === 'row') && node.children.length === 0) return false;
    return true;
  }

  prune(layout.layout);
  return layout;
}

function loadModel(): Model {
  // Check if a reset was requested
  if (localStorage.getItem(RESET_FLAG)) {
    localStorage.removeItem(RESET_FLAG);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(LAYOUT_VERSION_KEY, String(LAYOUT_VERSION));
    const hiddenPanels = useAppStore.getState().hiddenPanels;
    return Model.fromJson(buildLayout(hiddenPanels));
  }

  // Force reset when layout version changes (e.g. new panels added)
  const savedVersion = parseInt(localStorage.getItem(LAYOUT_VERSION_KEY) || '0', 10);
  if (savedVersion < LAYOUT_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(LAYOUT_VERSION_KEY, String(LAYOUT_VERSION));
    // New panels not in DEFAULT_LAYOUT start hidden
    const nonDefaultPanels = ALL_PANEL_IDS.filter(id => !DEFAULT_PANEL_IDS.has(id));
    useAppStore.setState({ hiddenPanels: nonDefaultPanels });
    return Model.fromJson(buildLayout(nonDefaultPanels));
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const json = JSON.parse(saved) as IJsonModel;
      if (json.global) json.global.tabEnableClose = true;
      return Model.fromJson(json);
    }
  } catch {
    // corrupt data, fall through
  }
  const hiddenPanels = useAppStore.getState().hiddenPanels;
  return Model.fromJson(buildLayout(hiddenPanels));
}

// Module-level model ref
let _modelRef: Model | null = null;

export function getModel(): Model | null {
  return _modelRef;
}

/**
 * Show a panel: if it exists in the model, select it; otherwise add it dynamically.
 * For panels in DEFAULT_LAYOUT, falls back to rebuild + reload.
 */
export function showPanelInLayout(panelId: string) {
  const model = _modelRef;
  if (!model) {
    localStorage.setItem(RESET_FLAG, '1');
    window.location.reload();
    return;
  }

  // If panel already exists in model, just select it
  const existingNode = model.getNodeById(panelId);
  if (existingNode) {
    model.doAction(Actions.selectTab(panelId));
    return;
  }

  // For default panels that were pruned, rebuild from DEFAULT_LAYOUT
  if (DEFAULT_PANEL_IDS.has(panelId)) {
    localStorage.setItem(RESET_FLAG, '1');
    window.location.reload();
    return;
  }

  // Dynamically add the panel as a new tab in the active tabset
  const activeTabset = model.getActiveTabset();
  if (activeTabset) {
    model.doAction(Actions.addNode(
      { type: 'tab', name: getLocalizedPanelName(panelId), component: panelId, id: panelId },
      activeTabset.getId(),
      DockLocation.CENTER,
      -1,
    ));
  }
}

/**
 * Hide a panel: remove its tab from the model.
 */
export function hidePanelInLayout(panelId: string) {
  const model = _modelRef;
  if (!model) return;
  const node = model.getNodeById(panelId);
  if (node) {
    model.doAction(Actions.deleteTab(panelId));
  }
}

// Component registry
type PanelFactory = (node: TabNode) => React.ReactNode;
const extraFactories: Map<string, PanelFactory> = new Map();

export function addPanelFactory(id: string, factory: PanelFactory) {
  extraFactories.set(id, factory);
}

export function DockLayout() {
  const modelRef = useRef<Model>(loadModel());
  const hidePanel = useAppStore((s) => s.hidePanel);
  const locale = useAppStore((s) => s.locale);

  useEffect(() => {
    _modelRef = modelRef.current;
    return () => { _modelRef = null; };
  }, []);

  const saveLayout = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modelRef.current.toJson()));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', saveLayout);
    return () => window.removeEventListener('beforeunload', saveLayout);
  }, [saveLayout]);

  const handleAction = useCallback((action: Action): Action | undefined => {
    if (action.type === Actions.DELETE_TAB) {
      const tabId = (action as any).data?.node;
      if (tabId && ALL_PANEL_IDS.includes(tabId)) {
        hidePanel(tabId);
      }
    }
    return action;
  }, [hidePanel]);

  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    let content: React.ReactNode;
    switch (component) {
      case PANEL_IDS.NEWS: content = <NewsFeed />; break;
      case PANEL_IDS.MAP: content = <LazyWrap><WorldMapPanel /></LazyWrap>; break;
      case PANEL_IDS.STOCKS: content = <StockPanel />; break;
      case PANEL_IDS.AI: content = <AiInsights />; break;
      case PANEL_IDS.LOG: content = <TerminalLog />; break;
      case PANEL_IDS.TRADING: content = <LazyWrap><TradingPanel /></LazyWrap>; break;
      case PANEL_IDS.AI_CHAT: content = <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">{translations[locale]?.comingSoon ?? 'Coming soon...'}</div>; break;
      case PANEL_IDS.ECON_CALENDAR: content = <LazyWrap><EconomicCalendarPanel /></LazyWrap>; break;
      case PANEL_IDS.ALERTS: content = <LazyWrap><AlertsPanel /></LazyWrap>; break;
      case PANEL_IDS.SENTIMENT: content = <LazyWrap><SentimentPanel /></LazyWrap>; break;
      case PANEL_IDS.RISK: content = <LazyWrap><RiskCalculator /></LazyWrap>; break;
      case PANEL_IDS.SECTORS: content = <LazyWrap><SectorRotationPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS: content = <LazyWrap><EarningsCalendarPanel /></LazyWrap>; break;
      case PANEL_IDS.OPTIONS: content = <LazyWrap><OptionsFlowPanel /></LazyWrap>; break;
      case PANEL_IDS.INSIDERS: content = <LazyWrap><InsiderTradesPanel /></LazyWrap>; break;
      case PANEL_IDS.CORRELATIONS: content = <LazyWrap><CorrelationMatrixPanel /></LazyWrap>; break;
      case PANEL_IDS.LIVE_STREAMS: content = <LazyWrap><LiveStreamsPanel /></LazyWrap>; break;
      case PANEL_IDS.PREDICTION: content = <LazyWrap><PredictionTradingPanel /></LazyWrap>; break;
      case PANEL_IDS.MISSED_OPP: content = <LazyWrap><MissedOpportunitiesPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_MOVERS: content = <LazyWrap><MarketMoversPanel /></LazyWrap>; break;
      case PANEL_IDS.FOREX: content = <LazyWrap><ForexPanel /></LazyWrap>; break;
      case PANEL_IDS.BONDS: content = <LazyWrap><BondsPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITIES: content = <LazyWrap><CommoditiesPanel /></LazyWrap>; break;
      case PANEL_IDS.CRYPTO: content = <LazyWrap><CryptoPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_DASHBOARD: content = <LazyWrap><GlobalDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.SCANNER: content = <LazyWrap><ScannerPanel /></LazyWrap>; break;
      case PANEL_IDS.SCREENER: content = <LazyWrap><ScreenerPanel /></LazyWrap>; break;
      case PANEL_IDS.HEAT_MAP: content = <LazyWrap><HeatMapPanel /></LazyWrap>; break;
      case PANEL_IDS.ETF: content = <LazyWrap><ETFPanel /></LazyWrap>; break;
      case PANEL_IDS.DIVIDENDS: content = <LazyWrap><DividendPanel /></LazyWrap>; break;
      case PANEL_IDS.IPO: content = <LazyWrap><IPOPanel /></LazyWrap>; break;
      case PANEL_IDS.ANALYST: content = <LazyWrap><AnalystPanel /></LazyWrap>; break;
      case PANEL_IDS.BREADTH: content = <LazyWrap><BreadthPanel /></LazyWrap>; break;
      case PANEL_IDS.FINANCIALS: content = <LazyWrap><FinancialsPanel /></LazyWrap>; break;
      case PANEL_IDS.FUTURES: content = <LazyWrap><FuturesPanel /></LazyWrap>; break;
      case PANEL_IDS.PERFORMANCE: content = <LazyWrap><ComparisonPanel /></LazyWrap>; break;
      case PANEL_IDS.SHORT_INTEREST: content = <LazyWrap><ShortInterestPanel /></LazyWrap>; break;
      case PANEL_IDS.OPTIONS_CALC: content = <LazyWrap><OptionsCalcPanel /></LazyWrap>; break;
      case PANEL_IDS.FX_CONVERTER: content = <LazyWrap><FXConverterPanel /></LazyWrap>; break;
      case PANEL_IDS.BOND_CALC: content = <LazyWrap><BondCalcPanel /></LazyWrap>; break;
      case PANEL_IDS.COMPANY_PROFILE: content = <LazyWrap><CompanyProfilePanel /></LazyWrap>; break;
      case PANEL_IDS.PIVOT_POINTS: content = <LazyWrap><PivotPointsPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_HOURS: content = <LazyWrap><MarketHoursPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_CALENDAR: content = <LazyWrap><MarketCalendarPanel /></LazyWrap>; break;
      case PANEL_IDS.PAIRS_TRADING: content = <LazyWrap><PairsPanel /></LazyWrap>; break;
      case PANEL_IDS.VOLATILITY: content = <LazyWrap><VolatilityPanel /></LazyWrap>; break;
      case PANEL_IDS.FIBONACCI: content = <LazyWrap><FibonacciPanel /></LazyWrap>; break;
      case PANEL_IDS.MORTGAGE_CALC: content = <LazyWrap><MortgageCalcPanel /></LazyWrap>; break;
      case PANEL_IDS.INVESTMENT_CALC: content = <LazyWrap><InvestmentCalcPanel /></LazyWrap>; break;
      case PANEL_IDS.RELATIVE_STRENGTH: content = <LazyWrap><RelativeStrengthPanel /></LazyWrap>; break;
      case PANEL_IDS.WATCHLIST: content = <LazyWrap><WatchlistPanel /></LazyWrap>; break;
      case PANEL_IDS.ECON_INDICATORS: content = <LazyWrap><EconomicIndicatorsPanel /></LazyWrap>; break;
      case PANEL_IDS.FX_CROSS: content = <LazyWrap><FXCrossPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO: content = <LazyWrap><PortfolioAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.FEAR_GREED: content = <LazyWrap><FearGreedPanel /></LazyWrap>; break;
      case PANEL_IDS.SENTIMENT_HEATMAP: content = <LazyWrap><SentimentHeatmapPanel /></LazyWrap>; break;
      case PANEL_IDS.YIELD_CURVE: content = <LazyWrap><YieldCurvePanel /></LazyWrap>; break;
      case PANEL_IDS.CURRENCY_STRENGTH: content = <LazyWrap><CurrencyStrengthPanel /></LazyWrap>; break;
      case PANEL_IDS.MONEY_FLOW: content = <LazyWrap><MoneyFlowPanel /></LazyWrap>; break;
      case PANEL_IDS.TECHNICAL_CHART: content = <LazyWrap><TechnicalChartPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS_ESTIMATES: content = <LazyWrap><EarningsEstimatesPanel /></LazyWrap>; break;
      case PANEL_IDS.WORLD_ECONOMY: content = <LazyWrap><WorldEconomyPanel /></LazyWrap>; break;
      case PANEL_IDS.CROSS_ASSET: content = <LazyWrap><CrossAssetPanel /></LazyWrap>; break;
      case PANEL_IDS.HOLDINGS: content = <LazyWrap><HoldingsPanel /></LazyWrap>; break;
      case PANEL_IDS.SECTOR_PERFORMANCE: content = <LazyWrap><SectorPerformancePanel /></LazyWrap>; break;
      case PANEL_IDS.ETF_HOLDINGS: content = <LazyWrap><ETFHoldingsPanel /></LazyWrap>; break;
      case PANEL_IDS.DRAWDOWN: content = <LazyWrap><DrawdownPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_REGIME: content = <LazyWrap><MarketRegimePanel /></LazyWrap>; break;
      case PANEL_IDS.RELATIVE_VALUATION: content = <LazyWrap><RelativeValuationPanel /></LazyWrap>; break;
      case PANEL_IDS.CONFLUENCE: content = <LazyWrap><ConfluencePanel /></LazyWrap>; break;
      case PANEL_IDS.IV_SURFACE: content = <LazyWrap><IVSurfacePanel /></LazyWrap>; break;
      case PANEL_IDS.SEASONALITY: content = <LazyWrap><SeasonalityPanel /></LazyWrap>; break;
      case PANEL_IDS.ORDER_FLOW: content = <LazyWrap><OrderFlowPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO_OPTIMIZER: content = <LazyWrap><PortfolioOptimizerPanel /></LazyWrap>; break;
      default: {
        const extra = extraFactories.get(component ?? '');
        if (extra) return <PanelErrorBoundary>{extra(node)}</PanelErrorBoundary>;
        return <div className="flex items-center justify-center h-full text-neutral text-xs font-mono uppercase">Unknown panel: {component}</div>;
      }
    }
    return <PanelErrorBoundary>{content}</PanelErrorBoundary>;
  }, []);

  const onRenderTab = useCallback((node: TabNode, renderValues: { leading: React.ReactNode; content: React.ReactNode; buttons: React.ReactNode[] }) => {
    const panelId = node.getComponent();
    if (panelId) {
      const key = PANEL_NAME_KEYS[panelId];
      if (key) {
        renderValues.content = translations[locale]?.[key] ?? translations.en[key];
      }
    }
  }, [locale]);

  return (
    <Layout
      model={modelRef.current}
      factory={factory}
      onRenderTab={onRenderTab}
      onAction={handleAction}
      onModelChange={saveLayout}
    />
  );
}

const RESET_FLAG = 'terminal-layout-reset';

export function resetLayout() {
  localStorage.setItem(RESET_FLAG, '1');
  const nonDefaultPanels = ALL_PANEL_IDS.filter(id => !DEFAULT_PANEL_IDS.has(id));
  useAppStore.setState({ hiddenPanels: nonDefaultPanels });
  window.location.reload();
}
