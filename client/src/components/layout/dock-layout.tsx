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
const BacktestPanel = lazy(() => import('../panels/backtest-panel').then(m => ({ default: m.BacktestPanel })));
const MacroDashboardPanel = lazy(() => import('../panels/macro-dashboard-panel').then(m => ({ default: m.MacroDashboardPanel })));
const EarningsSurprisePanel = lazy(() => import('../panels/earnings-surprise-panel').then(m => ({ default: m.EarningsSurprisePanel })));
const FuturesCurvePanel = lazy(() => import('../panels/futures-curve-panel').then(m => ({ default: m.FuturesCurvePanel })));
const CreditSpreadsPanel = lazy(() => import('../panels/credit-spreads-panel').then(m => ({ default: m.CreditSpreadsPanel })));
const IntermarketPanel = lazy(() => import('../panels/intermarket-panel').then(m => ({ default: m.IntermarketPanel })));
const SectorHeatmapPanel = lazy(() => import('../panels/sector-heatmap-panel').then(m => ({ default: m.SectorHeatmapPanel })));
const EconomicSurprisesPanel = lazy(() => import('../panels/economic-surprises-panel').then(m => ({ default: m.EconomicSurprisesPanel })));
const DispersionPanel = lazy(() => import('../panels/dispersion-panel').then(m => ({ default: m.DispersionPanel })));
const FundFlowsPanel = lazy(() => import('../panels/fund-flows-panel').then(m => ({ default: m.FundFlowsPanel })));
const VolTermStructurePanel = lazy(() => import('../panels/vol-term-structure-panel').then(m => ({ default: m.VolTermStructurePanel })));
const MacroHeatmapPanel = lazy(() => import('../panels/macro-heatmap-panel').then(m => ({ default: m.MacroHeatmapPanel })));
const FactorExposurePanel = lazy(() => import('../panels/factor-exposure-panel').then(m => ({ default: m.FactorExposurePanel })));
const CapitalFlowsPanel = lazy(() => import('../panels/capital-flows-panel').then(m => ({ default: m.CapitalFlowsPanel })));
const TailRiskPanel = lazy(() => import('../panels/tail-risk-panel').then(m => ({ default: m.TailRiskPanel })));
const LiquidityPanel = lazy(() => import('../panels/liquidity-panel').then(m => ({ default: m.LiquidityPanel })));
const CommoditySpreadsPanel = lazy(() => import('../panels/commodity-spreads-panel').then(m => ({ default: m.CommoditySpreadsPanel })));
const SentimentDashboardPanel = lazy(() => import('../panels/sentiment-dashboard-panel').then(m => ({ default: m.SentimentDashboardPanel })));
const RiskParityPanel = lazy(() => import('../panels/risk-parity-panel').then(m => ({ default: m.RiskParityPanel })));
const MarketAnomaliesPanel = lazy(() => import('../panels/market-anomalies-panel').then(m => ({ default: m.MarketAnomaliesPanel })));
const CarryTradePanel = lazy(() => import('../panels/carry-trade-panel').then(m => ({ default: m.CarryTradePanel })));
const CotReportPanel = lazy(() => import('../panels/cot-report-panel').then(m => ({ default: m.CotReportPanel })));
const IvRankPanel = lazy(() => import('../panels/iv-rank-panel').then(m => ({ default: m.IvRankPanel })));
const PerformanceAttributionPanel = lazy(() => import('../panels/performance-attribution-panel').then(m => ({ default: m.PerformanceAttributionPanel })));
const MarketMicrostructurePanel = lazy(() => import('../panels/market-microstructure-panel').then(m => ({ default: m.MarketMicrostructurePanel })));
const CountryRiskPanel = lazy(() => import('../panels/country-risk-panel').then(m => ({ default: m.CountryRiskPanel })));
const PositioningPanel = lazy(() => import('../panels/positioning-panel').then(m => ({ default: m.PositioningPanel })));
const RepoRatesPanel = lazy(() => import('../panels/repo-rates-panel').then(m => ({ default: m.RepoRatesPanel })));
const XccyBasisPanel = lazy(() => import('../panels/xccy-basis-panel').then(m => ({ default: m.XccyBasisPanel })));
const StyleBoxPanel = lazy(() => import('../panels/style-box-panel').then(m => ({ default: m.StyleBoxPanel })));
const SwapRatesPanel = lazy(() => import('../panels/swap-rates-panel').then(m => ({ default: m.SwapRatesPanel })));
const TradeBlotterPanel = lazy(() => import('../panels/trade-blotter-panel').then(m => ({ default: m.TradeBlotterPanel })));
const InflationBreakevenPanel = lazy(() => import('../panels/inflation-breakeven-panel').then(m => ({ default: m.InflationBreakevenPanel })));
const CorporateCdsPanel = lazy(() => import('../panels/corporate-cds-panel').then(m => ({ default: m.CorporateCdsPanel })));
const EventDrivenPanel = lazy(() => import('../panels/event-driven-panel').then(m => ({ default: m.EventDrivenPanel })));
const DebtMaturityPanel = lazy(() => import('../panels/debt-maturity-panel').then(m => ({ default: m.DebtMaturityPanel })));
const EquityRiskPremiumPanel = lazy(() => import('../panels/equity-risk-premium-panel').then(m => ({ default: m.EquityRiskPremiumPanel })));
const CentralBanksPanel = lazy(() => import('../panels/central-banks-panel').then(m => ({ default: m.CentralBanksPanel })));
const VolSkewPanel = lazy(() => import('../panels/vol-skew-panel').then(m => ({ default: m.VolSkewPanel })));
const GlobalRatesPanel = lazy(() => import('../panels/global-rates-panel').then(m => ({ default: m.GlobalRatesPanel })));
const SupplyChainPanel = lazy(() => import('../panels/supply-chain-panel').then(m => ({ default: m.SupplyChainPanel })));
const GammaExposurePanel = lazy(() => import('../panels/gamma-exposure-panel').then(m => ({ default: m.GammaExposurePanel })));
const SovereignSpreadsPanel = lazy(() => import('../panels/sovereign-spreads-panel').then(m => ({ default: m.SovereignSpreadsPanel })));
const EarningsRevisionsPanel = lazy(() => import('../panels/earnings-revisions-panel').then(m => ({ default: m.EarningsRevisionsPanel })));
const DividendForecastPanel = lazy(() => import('../panels/dividend-forecast-panel').then(m => ({ default: m.DividendForecastPanel })));
const CreditRatingsPanel = lazy(() => import('../panels/credit-ratings-panel').then(m => ({ default: m.CreditRatingsPanel })));
const VolatilityConePanel = lazy(() => import('../panels/volatility-cone-panel').then(m => ({ default: m.VolatilityConePanel })));
const TermStructurePanel = lazy(() => import('../panels/term-structure-panel').then(m => ({ default: m.TermStructurePanel })));
const InstitutionalOwnershipPanel = lazy(() => import('../panels/institutional-ownership-panel').then(m => ({ default: m.InstitutionalOwnershipPanel })));
const ImpliedCorrelationPanel = lazy(() => import('../panels/implied-correlation-panel').then(m => ({ default: m.ImpliedCorrelationPanel })));
const EarningsQualityPanel = lazy(() => import('../panels/earnings-quality-panel').then(m => ({ default: m.EarningsQualityPanel })));
const VolSurfacePanel = lazy(() => import('../panels/vol-surface-panel').then(m => ({ default: m.VolSurfacePanel })));
const GlobalFlowsPanel = lazy(() => import('../panels/global-flows-panel').then(m => ({ default: m.GlobalFlowsPanel })));
const RegressionAnalysisPanel = lazy(() => import('../panels/regression-analysis-panel').then(m => ({ default: m.RegressionAnalysisPanel })));
const CovenantMonitorPanel = lazy(() => import('../panels/covenant-monitor-panel').then(m => ({ default: m.CovenantMonitorPanel })));
const MarketInternalsPanel = lazy(() => import('../panels/market-internals-panel').then(m => ({ default: m.MarketInternalsPanel })));
const ValuationMultiplesPanel = lazy(() => import('../panels/valuation-multiples-panel').then(m => ({ default: m.ValuationMultiplesPanel })));
const FixedIncomeAnalyticsPanel = lazy(() => import('../panels/fixed-income-analytics-panel').then(m => ({ default: m.FixedIncomeAnalyticsPanel })));
const InsiderSentimentPanel = lazy(() => import('../panels/insider-sentiment-panel').then(m => ({ default: m.InsiderSentimentPanel })));
const CustomIndexPanel = lazy(() => import('../panels/custom-index-panel').then(m => ({ default: m.CustomIndexPanel })));
const MbsAnalyticsPanel = lazy(() => import('../panels/mbs-analytics-panel').then(m => ({ default: m.MbsAnalyticsPanel })));
const CdxIndexPanel = lazy(() => import('../panels/cdx-index-panel').then(m => ({ default: m.CdxIndexPanel })));
const MuniBondsPanel = lazy(() => import('../panels/muni-bonds-panel').then(m => ({ default: m.MuniBondsPanel })));
const CloAnalyticsPanel = lazy(() => import('../panels/clo-analytics-panel').then(m => ({ default: m.CloAnalyticsPanel })));
const OnchainAnalyticsPanel = lazy(() => import('../panels/onchain-analytics-panel').then(m => ({ default: m.OnchainAnalyticsPanel })));
const PrivateCreditPanel = lazy(() => import('../panels/private-credit-panel').then(m => ({ default: m.PrivateCreditPanel })));
const VolRiskPremiumPanel = lazy(() => import('../panels/vol-risk-premium-panel').then(m => ({ default: m.VolRiskPremiumPanel })));
const EsgRatingsPanel = lazy(() => import('../panels/esg-ratings-panel').then(m => ({ default: m.EsgRatingsPanel })));
const FreightIndicesPanel = lazy(() => import('../panels/freight-indices-panel').then(m => ({ default: m.FreightIndicesPanel })));
const AlternativeDataPanel = lazy(() => import('../panels/alternative-data-panel').then(m => ({ default: m.AlternativeDataPanel })));
const TradeIdeasPanel = lazy(() => import('../panels/trade-ideas-panel').then(m => ({ default: m.TradeIdeasPanel })));
const DebtIssuancePanel = lazy(() => import('../panels/debt-issuance-panel').then(m => ({ default: m.DebtIssuancePanel })));
const FxOptionsPanel = lazy(() => import('../panels/fx-options-panel').then(m => ({ default: m.FxOptionsPanel })));
const MultiFactorPanel = lazy(() => import('../panels/multi-factor-panel').then(m => ({ default: m.MultiFactorPanel })));
const TreasuryAuctionsPanel = lazy(() => import('../panels/treasury-auctions-panel').then(m => ({ default: m.TreasuryAuctionsPanel })));
const CommodityCurvesPanel = lazy(() => import('../panels/commodity-curves-panel').then(m => ({ default: m.CommodityCurvesPanel })));
const EmBondsPanel = lazy(() => import('../panels/em-bonds-panel').then(m => ({ default: m.EmBondsPanel })));
const ReitMonitorPanel = lazy(() => import('../panels/reit-monitor-panel').then(m => ({ default: m.ReitMonitorPanel })));
const MoneyMarketPanel = lazy(() => import('../panels/money-market-panel').then(m => ({ default: m.MoneyMarketPanel })));
const ConvertibleBondsPanel = lazy(() => import('../panels/convertible-bonds-panel').then(m => ({ default: m.ConvertibleBondsPanel })));
const GlobalPmiPanel = lazy(() => import('../panels/global-pmi-panel').then(m => ({ default: m.GlobalPmiPanel })));
const LeveragedLoansPanel = lazy(() => import('../panels/leveraged-loans-panel').then(m => ({ default: m.LeveragedLoansPanel })));
const SwaptionVolPanel = lazy(() => import('../panels/swaption-vol-panel').then(m => ({ default: m.SwaptionVolPanel })));
const DistressedDebtPanel = lazy(() => import('../panels/distressed-debt-panel').then(m => ({ default: m.DistressedDebtPanel })));
const RateCapsFloorsPanel = lazy(() => import('../panels/rate-caps-floors-panel').then(m => ({ default: m.RateCapsFloorsPanel })));
const DividendSwapsPanel = lazy(() => import('../panels/dividend-swaps-panel').then(m => ({ default: m.DividendSwapsPanel })));
const SecuritiesLendingPanel = lazy(() => import('../panels/securities-lending-panel').then(m => ({ default: m.SecuritiesLendingPanel })));
const VarianceSwapsPanel = lazy(() => import('../panels/variance-swaps-panel').then(m => ({ default: m.VarianceSwapsPanel })));
const CarbonCreditsPanel = lazy(() => import('../panels/carbon-credits-panel').then(m => ({ default: m.CarbonCreditsPanel })));
const WeatherDerivativesPanel = lazy(() => import('../panels/weather-derivatives-panel').then(m => ({ default: m.WeatherDerivativesPanel })));
const DarkPoolPanel = lazy(() => import('../panels/dark-pool-panel').then(m => ({ default: m.DarkPoolPanel })));
const TotalReturnSwapsPanel = lazy(() => import('../panels/total-return-swaps-panel').then(m => ({ default: m.TotalReturnSwapsPanel })));
const CatBondsPanel = lazy(() => import('../panels/cat-bonds-panel').then(m => ({ default: m.CatBondsPanel })));
const InflationLinkedBondsPanel = lazy(() => import('../panels/inflation-linked-bonds-panel').then(m => ({ default: m.InflationLinkedBondsPanel })));
const EquityBasketSwapsPanel = lazy(() => import('../panels/equity-basket-swaps-panel').then(m => ({ default: m.EquityBasketSwapsPanel })));
const CrossCurrencySwapsPanel = lazy(() => import('../panels/cross-currency-swaps-panel').then(m => ({ default: m.CrossCurrencySwapsPanel })));
const CommodityOptionsPanel = lazy(() => import('../panels/commodity-options-panel').then(m => ({ default: m.CommodityOptionsPanel })));
const LoanCdsPanel = lazy(() => import('../panels/loan-cds-panel').then(m => ({ default: m.LoanCdsPanel })));
const ConvertibleArbPanel = lazy(() => import('../panels/convertible-arb-panel').then(m => ({ default: m.ConvertibleArbPanel })));
const ShippingRatesPanel = lazy(() => import('../panels/shipping-rates-panel').then(m => ({ default: m.ShippingRatesPanel })));
const CreditAuctionPanel = lazy(() => import('../panels/credit-auction-panel').then(m => ({ default: m.CreditAuctionPanel })));
const MuniYieldCurvesPanel = lazy(() => import('../panels/muni-yield-curves-panel').then(m => ({ default: m.MuniYieldCurvesPanel })));
const StructuredProductsPanel = lazy(() => import('../panels/structured-products-panel').then(m => ({ default: m.StructuredProductsPanel })));
const PensionFundPanel = lazy(() => import('../panels/pension-fund-panel').then(m => ({ default: m.PensionFundPanel })));
const SwapSpreadMonitorPanel = lazy(() => import('../panels/swap-spread-monitor-panel').then(m => ({ default: m.SwapSpreadMonitorPanel })));
const EquityLinkedNotesPanel = lazy(() => import('../panels/equity-linked-notes-panel').then(m => ({ default: m.EquityLinkedNotesPanel })));
const TradeFinancePanel = lazy(() => import('../panels/trade-finance-panel').then(m => ({ default: m.TradeFinancePanel })));
const RepoMarketPanel = lazy(() => import('../panels/repo-market-panel').then(m => ({ default: m.RepoMarketPanel })));
const CommodityInventoryPanel = lazy(() => import('../panels/commodity-inventory-panel').then(m => ({ default: m.CommodityInventoryPanel })));
const SovereignWealthPanel = lazy(() => import('../panels/sovereign-wealth-panel').then(m => ({ default: m.SovereignWealthPanel })));
const AgencyMbsTbaPanel = lazy(() => import('../panels/agency-mbs-tba-panel').then(m => ({ default: m.AgencyMbsTbaPanel })));
const EtfFlowsPanel = lazy(() => import('../panels/etf-flows-panel').then(m => ({ default: m.EtfFlowsPanel })));
const CreditFlowPanel = lazy(() => import('../panels/credit-flow-panel').then(m => ({ default: m.CreditFlowPanel })));
const CommoditySeasonalityPanel = lazy(() => import('../panels/commodity-seasonality-panel').then(m => ({ default: m.CommoditySeasonalityPanel })));
const FxVolatilityPanel = lazy(() => import('../panels/fx-volatility-panel').then(m => ({ default: m.FxVolatilityPanel })));
const PrimaryDealerPanel = lazy(() => import('../panels/primary-dealer-panel').then(m => ({ default: m.PrimaryDealerPanel })));
const RealEstateCapitalPanel = lazy(() => import('../panels/real-estate-capital-panel').then(m => ({ default: m.RealEstateCapitalPanel })));
const ElectricityMarketsPanel = lazy(() => import('../panels/electricity-markets-panel').then(m => ({ default: m.ElectricityMarketsPanel })));
const SyndicatedLoansPanel = lazy(() => import('../panels/syndicated-loans-panel').then(m => ({ default: m.SyndicatedLoansPanel })));
const EmissionsTradingPanel = lazy(() => import('../panels/emissions-trading-panel').then(m => ({ default: m.EmissionsTradingPanel })));
const InsuranceLinkedPanel = lazy(() => import('../panels/insurance-linked-panel').then(m => ({ default: m.InsuranceLinkedPanel })));
const MetalsForwardPanel = lazy(() => import('../panels/metals-forward-panel').then(m => ({ default: m.MetalsForwardPanel })));
const CentralBankWatchPanel = lazy(() => import('../panels/central-bank-watch-panel').then(m => ({ default: m.CentralBankWatchPanel })));
const FreightDerivativesPanel = lazy(() => import('../panels/freight-derivatives-panel').then(m => ({ default: m.FreightDerivativesPanel })));
const InflationBreakevensPanel = lazy(() => import('../panels/inflation-breakevens-panel').then(m => ({ default: m.InflationBreakevensPanel })));
const MuniBondAuctionPanel = lazy(() => import('../panels/muni-bond-auction-panel').then(m => ({ default: m.MuniBondAuctionPanel })));
const CommodityCurveAnalyticsPanel = lazy(() => import('../panels/commodity-curve-analytics-panel').then(m => ({ default: m.CommodityCurveAnalyticsPanel })));
const CollateralMonitorPanel = lazy(() => import('../panels/collateral-monitor-panel').then(m => ({ default: m.CollateralMonitorPanel })));
const SovereignCdsPanel = lazy(() => import('../panels/sovereign-cds-panel').then(m => ({ default: m.SovereignCdsPanel })));
const CrossAssetMomentumPanel = lazy(() => import('../panels/cross-asset-momentum-panel').then(m => ({ default: m.CrossAssetMomentumPanel })));
const CryptoDerivativesPanel = lazy(() => import('../panels/crypto-derivatives-panel').then(m => ({ default: m.CryptoDerivativesPanel })));
const BondRelativeValuePanel = lazy(() => import('../panels/bond-relative-value-panel').then(m => ({ default: m.BondRelativeValuePanel })));
const VolatilityArbitragePanel = lazy(() => import('../panels/volatility-arbitrage-panel').then(m => ({ default: m.VolatilityArbitragePanel })));
const SystematicStrategyPanel = lazy(() => import('../panels/systematic-strategy-panel').then(m => ({ default: m.SystematicStrategyPanel })));
const FundingRateMonitorPanel = lazy(() => import('../panels/funding-rate-monitor-panel').then(m => ({ default: m.FundingRateMonitorPanel })));
const EmLocalRatesPanel = lazy(() => import('../panels/em-local-rates-panel').then(m => ({ default: m.EmLocalRatesPanel })));
const PortfolioRiskAnalyticsPanel = lazy(() => import('../panels/portfolio-risk-analytics-panel').then(m => ({ default: m.PortfolioRiskAnalyticsPanel })));
const CreditIndexMonitorPanel = lazy(() => import('../panels/credit-index-monitor-panel').then(m => ({ default: m.CreditIndexMonitorPanel })));
const EquityFinancingPanel = lazy(() => import('../panels/equity-financing-panel').then(m => ({ default: m.EquityFinancingPanel })));
const GlobalMacroDashboardPanel = lazy(() => import('../panels/global-macro-dashboard-panel').then(m => ({ default: m.GlobalMacroDashboardPanel })));
const AbsRmbsMonitorPanel = lazy(() => import('../panels/abs-rmbs-monitor-panel').then(m => ({ default: m.AbsRmbsMonitorPanel })));
const LiquidityRiskMonitorPanel = lazy(() => import('../panels/liquidity-risk-monitor-panel').then(m => ({ default: m.LiquidityRiskMonitorPanel })));
const FiAttributionPanel = lazy(() => import('../panels/fi-attribution-panel').then(m => ({ default: m.FiAttributionPanel })));
const RepoRateHeatmapPanel = lazy(() => import('../panels/repo-rate-heatmap-panel').then(m => ({ default: m.RepoRateHeatmapPanel })));
const TradeCompressionPanel = lazy(() => import('../panels/trade-compression-panel').then(m => ({ default: m.TradeCompressionPanel })));
const RegulatoryCapitalPanel = lazy(() => import('../panels/regulatory-capital-panel').then(m => ({ default: m.RegulatoryCapitalPanel })));
const SettlementRiskPanel = lazy(() => import('../panels/settlement-risk-panel').then(m => ({ default: m.SettlementRiskPanel })));
const SwapValuationPanel = lazy(() => import('../panels/swap-valuation-panel').then(m => ({ default: m.SwapValuationPanel })));
const CommodityStoragePanel = lazy(() => import('../panels/commodity-storage-panel').then(m => ({ default: m.CommodityStoragePanel })));
const CounterpartyExposurePanel = lazy(() => import('../panels/counterparty-exposure-panel').then(m => ({ default: m.CounterpartyExposurePanel })));
const MarketImpactModelPanel = lazy(() => import('../panels/market-impact-model-panel').then(m => ({ default: m.MarketImpactModelPanel })));
const StructuredNotesPanel = lazy(() => import('../panels/structured-notes-panel').then(m => ({ default: m.StructuredNotesPanel })));
const SecuritiesFinancePanel = lazy(() => import('../panels/securities-finance-panel').then(m => ({ default: m.SecuritiesFinancePanel })));
const CreditCurveBuilderPanel = lazy(() => import('../panels/credit-curve-builder-panel').then(m => ({ default: m.CreditCurveBuilderPanel })));
const ExecutionAnalyticsPanel = lazy(() => import('../panels/execution-analytics-panel').then(m => ({ default: m.ExecutionAnalyticsPanel })));
const BondAuctionCalendarPanel = lazy(() => import('../panels/bond-auction-calendar-panel').then(m => ({ default: m.BondAuctionCalendarPanel })));
const FxCarryMonitorPanel = lazy(() => import('../panels/fx-carry-monitor-panel').then(m => ({ default: m.FxCarryMonitorPanel })));
const EquityCapitalMarketsPanel = lazy(() => import('../panels/equity-capital-markets-panel').then(m => ({ default: m.EquityCapitalMarketsPanel })));
const DebtCapitalMarketsPanel = lazy(() => import('../panels/debt-capital-markets-panel').then(m => ({ default: m.DebtCapitalMarketsPanel })));
const HedgeFundMonitorPanel = lazy(() => import('../panels/hedge-fund-monitor-panel').then(m => ({ default: m.HedgeFundMonitorPanel })));
const RiskDashboardPanel = lazy(() => import('../panels/risk-dashboard-panel').then(m => ({ default: m.RiskDashboardPanel })));
const BenchmarkTrackerPanel = lazy(() => import('../panels/benchmark-tracker-panel').then(m => ({ default: m.BenchmarkTrackerPanel })));
const LiquidityCoveragePanel = lazy(() => import('../panels/liquidity-coverage-panel').then(m => ({ default: m.LiquidityCoveragePanel })));
const MarketSentimentIndexPanel = lazy(() => import('../panels/market-sentiment-index-panel').then(m => ({ default: m.MarketSentimentIndexPanel })));
const PortfolioStressTestPanel = lazy(() => import('../panels/portfolio-stress-test-panel').then(m => ({ default: m.PortfolioStressTestPanel })));
const GlobalLiquidityMonitorPanel = lazy(() => import('../panels/global-liquidity-monitor-panel').then(m => ({ default: m.GlobalLiquidityMonitorPanel })));
const TradeRecapPanel = lazy(() => import('../panels/trade-recap-panel').then(m => ({ default: m.TradeRecapPanel })));
const MacroSurpriseTrackerPanel = lazy(() => import('../panels/macro-surprise-tracker-panel').then(m => ({ default: m.MacroSurpriseTrackerPanel })));
const FxVolatilitySurfacePanel = lazy(() => import('../panels/fx-volatility-surface-panel').then(m => ({ default: m.FxVolatilitySurfacePanel })));
const CommodityFundamentalPanel = lazy(() => import('../panels/commodity-fundamental-panel').then(m => ({ default: m.CommodityFundamentalPanel })));
const EtfFlowMonitorPanel = lazy(() => import('../panels/etf-flow-monitor-panel').then(m => ({ default: m.EtfFlowMonitorPanel })));
const EquityFactorMonitorPanel = lazy(() => import('../panels/equity-factor-monitor-panel').then(m => ({ default: m.EquityFactorMonitorPanel })));
const RatesStrategyPanel = lazy(() => import('../panels/rates-strategy-panel').then(m => ({ default: m.RatesStrategyPanel })));
const CreditPortfolioPanel = lazy(() => import('../panels/credit-portfolio-panel').then(m => ({ default: m.CreditPortfolioPanel })));
const MacroRegimeMonitorPanel = lazy(() => import('../panels/macro-regime-monitor-panel').then(m => ({ default: m.MacroRegimeMonitorPanel })));
const DividendCalendarPanel = lazy(() => import('../panels/dividend-calendar-panel').then(m => ({ default: m.DividendCalendarPanel })));
const ConvertibleArbitragePanel = lazy(() => import('../panels/convertible-arbitrage-panel').then(m => ({ default: m.ConvertibleArbitragePanel })));
const RealtimePnlPanel = lazy(() => import('../panels/realtime-pnl-panel').then(m => ({ default: m.RealtimePnlPanel })));
const MarketBreadthAdvancedPanel = lazy(() => import('../panels/market-breadth-advanced-panel').then(m => ({ default: m.MarketBreadthAdvancedPanel })));
const VolatilityDashboardPanel = lazy(() => import('../panels/volatility-dashboard-panel').then(m => ({ default: m.VolatilityDashboardPanel })));
const FiRelativeValuePanel = lazy(() => import('../panels/fi-relative-value-panel').then(m => ({ default: m.FiRelativeValuePanel })));
const EquityScreenResultsPanel = lazy(() => import('../panels/equity-screen-results-panel').then(m => ({ default: m.EquityScreenResultsPanel })));
const CrossAssetCorrelationPanel = lazy(() => import('../panels/cross-asset-correlation-panel').then(m => ({ default: m.CrossAssetCorrelationPanel })));
const PortfolioAttributionPanel = lazy(() => import('../panels/portfolio-attribution-panel').then(m => ({ default: m.PortfolioAttributionPanel })));
const MunicipalBondMonitorPanel = lazy(() => import('../panels/municipal-bond-monitor-panel').then(m => ({ default: m.MunicipalBondMonitorPanel })));
const StructuredCreditPanel = lazy(() => import('../panels/structured-credit-panel').then(m => ({ default: m.StructuredCreditPanel })));
const CurrencyOptionsPanel = lazy(() => import('../panels/currency-options-panel').then(m => ({ default: m.CurrencyOptionsPanel })));
const SwapCurveMonitorPanel = lazy(() => import('../panels/swap-curve-monitor-panel').then(m => ({ default: m.SwapCurveMonitorPanel })));
const FundFlowAnalyticsPanel = lazy(() => import('../panels/fund-flow-analytics-panel').then(m => ({ default: m.FundFlowAnalyticsPanel })));
const TradeCostAnalysisPanel = lazy(() => import('../panels/trade-cost-analysis-panel').then(m => ({ default: m.TradeCostAnalysisPanel })));
const WarrantConvertiblePanel = lazy(() => import('../panels/warrant-convertible-panel').then(m => ({ default: m.WarrantConvertiblePanel })));
const GlobalTradeFlowPanel = lazy(() => import('../panels/global-trade-flow-panel').then(m => ({ default: m.GlobalTradeFlowPanel })));
const RealEstateAnalyticsPanel = lazy(() => import('../panels/real-estate-analytics-panel').then(m => ({ default: m.RealEstateAnalyticsPanel })));
const InflationMonitorPanel = lazy(() => import('../panels/inflation-monitor-panel').then(m => ({ default: m.InflationMonitorPanel })));
const MergerArbitragePanel = lazy(() => import('../panels/merger-arbitrage-panel').then(m => ({ default: m.MergerArbitragePanel })));
const SovereignDebtPanel = lazy(() => import('../panels/sovereign-debt-panel').then(m => ({ default: m.SovereignDebtPanel })));
const EtfPremiumPanel = lazy(() => import('../panels/etf-premium-panel').then(m => ({ default: m.EtfPremiumPanel })));
const CommodityDemandPanel = lazy(() => import('../panels/commodity-demand-panel').then(m => ({ default: m.CommodityDemandPanel })));
const GlobalDividendPanel = lazy(() => import('../panels/global-dividend-panel').then(m => ({ default: m.GlobalDividendPanel })));
const CdsIndexMonitorPanel = lazy(() => import('../panels/cds-index-monitor-panel').then(m => ({ default: m.CdsIndexMonitorPanel })));
const MacroRiskPanel = lazy(() => import('../panels/macro-risk-panel').then(m => ({ default: m.MacroRiskPanel })));
const FiAttributionAnalysisPanel = lazy(() => import('../panels/fi-attribution-analysis-panel').then(m => ({ default: m.FiAttributionAnalysisPanel })));
const EquityStylePanel = lazy(() => import('../panels/equity-style-panel').then(m => ({ default: m.EquityStylePanel })));
const CurrencyForecastPanel = lazy(() => import('../panels/currency-forecast-panel').then(m => ({ default: m.CurrencyForecastPanel })));
const BondLadderPanel = lazy(() => import('../panels/bond-ladder-panel').then(m => ({ default: m.BondLadderPanel })));
const SectorCreditSpreadPanel = lazy(() => import('../panels/sector-credit-spread-panel').then(m => ({ default: m.SectorCreditSpreadPanel })));
const GlobalPmiDashboardPanel = lazy(() => import('../panels/global-pmi-dashboard-panel').then(m => ({ default: m.GlobalPmiDashboardPanel })));
const EarningsWhisperPanel = lazy(() => import('../panels/earnings-whisper-panel').then(m => ({ default: m.EarningsWhisperPanel })));
const PortfolioHedgingPanel = lazy(() => import('../panels/portfolio-hedging-panel').then(m => ({ default: m.PortfolioHedgingPanel })));
const MarketDepthPanel = lazy(() => import('../panels/market-depth-panel').then(m => ({ default: m.MarketDepthPanel })));
const IrsMonitorPanel = lazy(() => import('../panels/irs-monitor-panel').then(m => ({ default: m.IrsMonitorPanel })));
const EquityCapitalRaisePanel = lazy(() => import('../panels/equity-capital-raise-panel').then(m => ({ default: m.EquityCapitalRaisePanel })));
const VolatilitySmilePanel = lazy(() => import('../panels/volatility-smile-panel').then(m => ({ default: m.VolatilitySmilePanel })));
const RepoRatePanel = lazy(() => import('../panels/repo-rate-panel').then(m => ({ default: m.RepoRatePanel })));
const CentralBankBalanceSheetPanel = lazy(() => import('../panels/central-bank-balance-sheet-panel').then(m => ({ default: m.CentralBankBalanceSheetPanel })));
const CorporateBuybackPanel = lazy(() => import('../panels/corporate-buyback-panel').then(m => ({ default: m.CorporateBuybackPanel })));
const MarginDebtPanel = lazy(() => import('../panels/margin-debt-panel').then(m => ({ default: m.MarginDebtPanel })));
const CorporateActionsPanel = lazy(() => import('../panels/corporate-actions-panel').then(m => ({ default: m.CorporateActionsPanel })));
const FiscalPolicyPanel = lazy(() => import('../panels/fiscal-policy-panel').then(m => ({ default: m.FiscalPolicyPanel })));
const BasisTradePanel = lazy(() => import('../panels/basis-trade-panel').then(m => ({ default: m.BasisTradePanel })));
const FlowOfFundsPanel = lazy(() => import('../panels/flow-of-funds-panel').then(m => ({ default: m.FlowOfFundsPanel })));
const GlobalSupplyChainPanel = lazy(() => import('../panels/global-supply-chain-panel').then(m => ({ default: m.GlobalSupplyChainPanel })));
const TreasuryAnalyticsPanel = lazy(() => import('../panels/treasury-analytics-panel').then(m => ({ default: m.TreasuryAnalyticsPanel })));

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
  BACKTEST: 'backtest',
  MACRO_DASHBOARD: 'macro-dashboard',
  EARNINGS_SURPRISE: 'earnings-surprise',
  FUTURES_CURVE: 'futures-curve',
  CREDIT_SPREADS: 'credit-spreads',
  INTERMARKET: 'intermarket',
  SECTOR_HEATMAP: 'sector-heatmap',
  ECONOMIC_SURPRISES: 'economic-surprises',
  DISPERSION: 'dispersion',
  FUND_FLOWS: 'fund-flows',
  VOL_TERM_STRUCTURE: 'vol-term-structure',
  MACRO_HEATMAP: 'macro-heatmap',
  FACTOR_EXPOSURE: 'factor-exposure',
  CAPITAL_FLOWS: 'capital-flows',
  TAIL_RISK: 'tail-risk',
  LIQUIDITY: 'liquidity',
  COMMODITY_SPREADS: 'commodity-spreads',
  SENTIMENT_DASHBOARD: 'sentiment-dashboard',
  RISK_PARITY: 'risk-parity',
  MARKET_ANOMALIES: 'market-anomalies',
  CARRY_TRADE: 'carry-trade',
  COT_REPORT: 'cot-report',
  IV_RANK: 'iv-rank',
  PERFORMANCE_ATTRIBUTION: 'performance-attribution',
  MARKET_MICROSTRUCTURE: 'market-microstructure',
  COUNTRY_RISK: 'country-risk',
  POSITIONING: 'positioning',
  REPO_RATES: 'repo-rates',
  XCCY_BASIS: 'xccy-basis',
  STYLE_BOX: 'style-box',
  SWAP_RATES: 'swap-rates',
  TRADE_BLOTTER: 'trade-blotter',
  INFLATION_BREAKEVEN: 'inflation-breakeven',
  CORPORATE_CDS: 'corporate-cds',
  EVENT_DRIVEN: 'event-driven',
  DEBT_MATURITY: 'debt-maturity',
  EQUITY_RISK_PREMIUM: 'equity-risk-premium',
  CENTRAL_BANKS: 'central-banks',
  VOL_SKEW: 'vol-skew',
  GLOBAL_RATES: 'global-rates',
  SUPPLY_CHAIN: 'supply-chain',
  GAMMA_EXPOSURE: 'gamma-exposure',
  SOVEREIGN_SPREADS: 'sovereign-spreads',
  EARNINGS_REVISIONS: 'earnings-revisions',
  DIVIDEND_FORECAST: 'dividend-forecast',
  CREDIT_RATINGS: 'credit-ratings',
  VOLATILITY_CONE: 'volatility-cone',
  TERM_STRUCTURE: 'term-structure',
  INSTITUTIONAL_OWNERSHIP: 'institutional-ownership',
  IMPLIED_CORRELATION: 'implied-correlation',
  EARNINGS_QUALITY: 'earnings-quality',
  VOL_SURFACE: 'vol-surface',
  GLOBAL_FLOWS: 'global-flows',
  REGRESSION_ANALYSIS: 'regression-analysis',
  COVENANT_MONITOR: 'covenant-monitor',
  MARKET_INTERNALS: 'market-internals',
  VALUATION_MULTIPLES: 'valuation-multiples',
  FIXED_INCOME_ANALYTICS: 'fixed-income-analytics',
  INSIDER_SENTIMENT: 'insider-sentiment',
  CUSTOM_INDEX: 'custom-index',
  MBS_ANALYTICS: 'mbs-analytics',
  CDX_INDEX: 'cdx-index',
  MUNI_BONDS: 'muni-bonds',
  CLO_ANALYTICS: 'clo-analytics',
  ONCHAIN_ANALYTICS: 'onchain-analytics',
  PRIVATE_CREDIT: 'private-credit',
  VOL_RISK_PREMIUM: 'vol-risk-premium',
  ESG_RATINGS: 'esg-ratings',
  FREIGHT_INDICES: 'freight-indices',
  ALTERNATIVE_DATA: 'alternative-data',
  TRADE_IDEAS: 'trade-ideas',
  DEBT_ISSUANCE: 'debt-issuance',
  FX_OPTIONS: 'fx-options',
  MULTI_FACTOR: 'multi-factor',
  TREASURY_AUCTIONS: 'treasury-auctions',
  COMMODITY_CURVES: 'commodity-curves',
  EM_BONDS: 'em-bonds',
  REIT_MONITOR: 'reit-monitor',
  MONEY_MARKET: 'money-market',
  CONVERTIBLE_BONDS: 'convertible-bonds',
  GLOBAL_PMI: 'global-pmi',
  LEVERAGED_LOANS: 'leveraged-loans',
  SWAPTION_VOL: 'swaption-vol',
  DISTRESSED_DEBT: 'distressed-debt',
  RATE_CAPS_FLOORS: 'rate-caps-floors',
  DIVIDEND_SWAPS: 'dividend-swaps',
  SECURITIES_LENDING: 'securities-lending',
  VARIANCE_SWAPS: 'variance-swaps',
  CARBON_CREDITS: 'carbon-credits',
  WEATHER_DERIVATIVES: 'weather-derivatives',
  DARK_POOL: 'dark-pool',
  TOTAL_RETURN_SWAPS: 'total-return-swaps',
  CAT_BONDS: 'cat-bonds',
  INFLATION_LINKED_BONDS: 'inflation-linked-bonds',
  EQUITY_BASKET_SWAPS: 'equity-basket-swaps',
  CROSS_CURRENCY_SWAPS: 'cross-currency-swaps',
  COMMODITY_OPTIONS: 'commodity-options',
  LOAN_CDS: 'loan-cds',
  CONVERTIBLE_ARB: 'convertible-arb',
  SHIPPING_RATES: 'shipping-rates',
  CREDIT_AUCTION: 'credit-auction',
  MUNI_YIELD_CURVES: 'muni-yield-curves',
  STRUCTURED_PRODUCTS: 'structured-products',
  PENSION_FUND: 'pension-fund',
  SWAP_SPREAD_MONITOR: 'swap-spread-monitor',
  EQUITY_LINKED_NOTES: 'equity-linked-notes',
  TRADE_FINANCE: 'trade-finance',
  REPO_MARKET: 'repo-market',
  COMMODITY_INVENTORY: 'commodity-inventory',
  SOVEREIGN_WEALTH: 'sovereign-wealth',
  AGENCY_MBS_TBA: 'agency-mbs-tba',
  ETF_FLOWS: 'etf-flows',
  CREDIT_FLOW: 'credit-flow',
  COMMODITY_SEASONALITY: 'commodity-seasonality',
  FX_VOLATILITY: 'fx-volatility',
  PRIMARY_DEALER: 'primary-dealer',
  REAL_ESTATE_CAPITAL: 'real-estate-capital',
  ELECTRICITY_MARKETS: 'electricity-markets',
  SYNDICATED_LOANS: 'syndicated-loans',
  EMISSIONS_TRADING: 'emissions-trading',
  INSURANCE_LINKED: 'insurance-linked',
  METALS_FORWARD: 'metals-forward',
  CENTRAL_BANK_WATCH: 'central-bank-watch',
  FREIGHT_DERIVATIVES: 'freight-derivatives',
  INFLATION_BREAKEVENS: 'inflation-breakevens',
  MUNI_BOND_AUCTION: 'muni-bond-auction',
  COMMODITY_CURVE_ANALYTICS: 'commodity-curve-analytics',
  COLLATERAL_MONITOR: 'collateral-monitor',
  SOVEREIGN_CDS: 'sovereign-cds',
  CROSS_ASSET_MOMENTUM: 'cross-asset-momentum',
  CRYPTO_DERIVATIVES: 'crypto-derivatives',
  BOND_RELATIVE_VALUE: 'bond-relative-value',
  VOLATILITY_ARBITRAGE: 'volatility-arbitrage',
  SYSTEMATIC_STRATEGY: 'systematic-strategy',
  FUNDING_RATE_MONITOR: 'funding-rate-monitor',
  EM_LOCAL_RATES: 'em-local-rates',
  PORTFOLIO_RISK_ANALYTICS: 'portfolio-risk-analytics',
  CREDIT_INDEX_MONITOR: 'credit-index-monitor',
  EQUITY_FINANCING: 'equity-financing',
  GLOBAL_MACRO_DASHBOARD: 'global-macro-dashboard',
  ABS_RMBS_MONITOR: 'abs-rmbs-monitor',
  LIQUIDITY_RISK_MONITOR: 'liquidity-risk-monitor',
  FI_ATTRIBUTION: 'fi-attribution',
  REPO_RATE_HEATMAP: 'repo-rate-heatmap',
  TRADE_COMPRESSION: 'trade-compression',
  REGULATORY_CAPITAL: 'regulatory-capital',
  SETTLEMENT_RISK: 'settlement-risk',
  SWAP_VALUATION: 'swap-valuation',
  COMMODITY_STORAGE: 'commodity-storage',
  COUNTERPARTY_EXPOSURE: 'counterparty-exposure',
  MARKET_IMPACT_MODEL: 'market-impact-model',
  STRUCTURED_NOTES: 'structured-notes',
  SECURITIES_FINANCE: 'securities-finance',
  CREDIT_CURVE_BUILDER: 'credit-curve-builder',
  EXECUTION_ANALYTICS: 'execution-analytics',
  BOND_AUCTION_CALENDAR: 'bond-auction-calendar',
  FX_CARRY_MONITOR: 'fx-carry-monitor',
  EQUITY_CAPITAL_MARKETS: 'equity-capital-markets',
  DEBT_CAPITAL_MARKETS: 'debt-capital-markets',
  HEDGE_FUND_MONITOR: 'hedge-fund-monitor',
  RISK_DASHBOARD: 'risk-dashboard',
  BENCHMARK_TRACKER: 'benchmark-tracker',
  LIQUIDITY_COVERAGE: 'liquidity-coverage',
  MARKET_SENTIMENT_INDEX: 'market-sentiment-index',
  PORTFOLIO_STRESS_TEST: 'portfolio-stress-test',
  GLOBAL_LIQUIDITY_MONITOR: 'global-liquidity-monitor',
  TRADE_RECAP: 'trade-recap',
  MACRO_SURPRISE_TRACKER: 'macro-surprise-tracker',
  FX_VOLATILITY_SURFACE: 'fx-volatility-surface',
  COMMODITY_FUNDAMENTAL: 'commodity-fundamental',
  ETF_FLOW_MONITOR: 'etf-flow-monitor',
  EQUITY_FACTOR_MONITOR: 'equity-factor-monitor',
  RATES_STRATEGY: 'rates-strategy',
  CREDIT_PORTFOLIO: 'credit-portfolio',
  MACRO_REGIME_MONITOR: 'macro-regime-monitor',
  DIVIDEND_CALENDAR: 'dividend-calendar',
  CONVERTIBLE_ARBITRAGE: 'convertible-arbitrage',
  REALTIME_PNL: 'realtime-pnl',
  MARKET_BREADTH_ADVANCED: 'market-breadth-advanced',
  VOLATILITY_DASHBOARD: 'volatility-dashboard',
  FI_RELATIVE_VALUE: 'fi-relative-value',
  EQUITY_SCREEN_RESULTS: 'equity-screen-results',
  CROSS_ASSET_CORRELATION: 'cross-asset-correlation',
  PORTFOLIO_ATTRIBUTION: 'portfolio-attribution',
  MUNICIPAL_BOND_MONITOR: 'municipal-bond-monitor',
  STRUCTURED_CREDIT: 'structured-credit',
  CURRENCY_OPTIONS: 'currency-options',
  SWAP_CURVE_MONITOR: 'swap-curve-monitor',
  FUND_FLOW_ANALYTICS: 'fund-flow-analytics',
  TRADE_COST_ANALYSIS: 'trade-cost-analysis',
  WARRANT_CONVERTIBLE: 'warrant-convertible',
  GLOBAL_TRADE_FLOW: 'global-trade-flow',
  REAL_ESTATE_ANALYTICS: 'real-estate-analytics',
  INFLATION_MONITOR: 'inflation-monitor',
  MERGER_ARBITRAGE: 'merger-arbitrage',
  SOVEREIGN_DEBT: 'sovereign-debt',
  ETF_PREMIUM: 'etf-premium',
  COMMODITY_DEMAND: 'commodity-demand',
  GLOBAL_DIVIDEND: 'global-dividend',
  CDS_INDEX_MONITOR: 'cds-index-monitor',
  MACRO_RISK: 'macro-risk',
  FI_ATTRIBUTION_ANALYSIS: 'fi-attribution-analysis',
  EQUITY_STYLE: 'equity-style',
  CURRENCY_FORECAST: 'currency-forecast',
  BOND_LADDER: 'bond-ladder',
  SECTOR_CREDIT_SPREAD: 'sector-credit-spread',
  GLOBAL_PMI_DASHBOARD: 'global-pmi-dashboard',
  EARNINGS_WHISPER: 'earnings-whisper',
  PORTFOLIO_HEDGING: 'portfolio-hedging',
  MARKET_DEPTH: 'market-depth',
  IRS_MONITOR: 'irs-monitor',
  EQUITY_CAPITAL_RAISE: 'equity-capital-raise',
  VOLATILITY_SMILE: 'volatility-smile',
  REPO_RATE: 'repo-rate',
  CENTRAL_BANK_BALANCE_SHEET: 'central-bank-balance-sheet',
  CORPORATE_BUYBACK: 'corporate-buyback',
  MARGIN_DEBT: 'margin-debt',
  CORPORATE_ACTIONS: 'corporate-actions',
  FISCAL_POLICY: 'fiscal-policy',
  BASIS_TRADE: 'basis-trade',
  FLOW_OF_FUNDS: 'flow-of-funds',
  GLOBAL_SUPPLY_CHAIN: 'global-supply-chain',
  TREASURY_ANALYTICS: 'treasury-analytics',
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
  [PANEL_IDS.BACKTEST]: 'STRATEGY BACKTEST',
  [PANEL_IDS.MACRO_DASHBOARD]: 'MACRO DASHBOARD',
  [PANEL_IDS.EARNINGS_SURPRISE]: 'EARNINGS SURPRISE',
  [PANEL_IDS.FUTURES_CURVE]: 'FUTURES CURVE',
  [PANEL_IDS.CREDIT_SPREADS]: 'CREDIT SPREADS',
  [PANEL_IDS.INTERMARKET]: 'INTERMARKET DIVERGENCE',
  [PANEL_IDS.SECTOR_HEATMAP]: 'SECTOR HEATMAP',
  [PANEL_IDS.ECONOMIC_SURPRISES]: 'ECONOMIC SURPRISES',
  [PANEL_IDS.DISPERSION]: 'DISPERSION MONITOR',
  [PANEL_IDS.FUND_FLOWS]: 'FUND FLOWS',
  [PANEL_IDS.VOL_TERM_STRUCTURE]: 'VOL TERM STRUCTURE',
  [PANEL_IDS.MACRO_HEATMAP]: 'GLOBAL MACRO HEATMAP',
  [PANEL_IDS.FACTOR_EXPOSURE]: 'FACTOR EXPOSURE',
  [PANEL_IDS.CAPITAL_FLOWS]: 'GLOBAL CAPITAL FLOWS',
  [PANEL_IDS.TAIL_RISK]: 'TAIL RISK MONITOR',
  [PANEL_IDS.LIQUIDITY]: 'LIQUIDITY MONITOR',
  [PANEL_IDS.COMMODITY_SPREADS]: 'COMMODITY SPREADS',
  [PANEL_IDS.SENTIMENT_DASHBOARD]: 'SENTIMENT DASHBOARD',
  [PANEL_IDS.RISK_PARITY]: 'RISK PARITY',
  [PANEL_IDS.MARKET_ANOMALIES]: 'MARKET ANOMALIES',
  [PANEL_IDS.CARRY_TRADE]: 'CARRY TRADE',
  [PANEL_IDS.COT_REPORT]: 'COT REPORT',
  [PANEL_IDS.IV_RANK]: 'IV RANK',
  [PANEL_IDS.PERFORMANCE_ATTRIBUTION]: 'PERFORMANCE ATTRIBUTION',
  [PANEL_IDS.MARKET_MICROSTRUCTURE]: 'MARKET MICROSTRUCTURE',
  [PANEL_IDS.COUNTRY_RISK]: 'COUNTRY RISK',
  [PANEL_IDS.POSITIONING]: 'POSITIONING & FLOWS',
  [PANEL_IDS.REPO_RATES]: 'REPO RATE MONITOR',
  [PANEL_IDS.XCCY_BASIS]: 'XCCY BASIS',
  [PANEL_IDS.STYLE_BOX]: 'EQUITY STYLE BOX',
  [PANEL_IDS.SWAP_RATES]: 'SWAP RATES',
  [PANEL_IDS.TRADE_BLOTTER]: 'TRADE BLOTTER',
  [PANEL_IDS.INFLATION_BREAKEVEN]: 'INFLATION BREAKEVENS',
  [PANEL_IDS.CORPORATE_CDS]: 'CORPORATE CDS',
  [PANEL_IDS.EVENT_DRIVEN]: 'EVENT-DRIVEN MONITOR',
  [PANEL_IDS.DEBT_MATURITY]: 'DEBT MATURITY PROFILE',
  [PANEL_IDS.EQUITY_RISK_PREMIUM]: 'EQUITY RISK PREMIUM',
  [PANEL_IDS.CENTRAL_BANKS]: 'CENTRAL BANK MONITOR',
  [PANEL_IDS.VOL_SKEW]: 'VOL SKEW MONITOR',
  [PANEL_IDS.GLOBAL_RATES]: 'GLOBAL RATES',
  [PANEL_IDS.SUPPLY_CHAIN]: 'SUPPLY CHAIN MONITOR',
  [PANEL_IDS.GAMMA_EXPOSURE]: 'GAMMA EXPOSURE',
  [PANEL_IDS.SOVEREIGN_SPREADS]: 'SOVEREIGN SPREADS',
  [PANEL_IDS.EARNINGS_REVISIONS]: 'EARNINGS REVISIONS',
  [PANEL_IDS.DIVIDEND_FORECAST]: 'DIVIDEND FORECAST',
  [PANEL_IDS.CREDIT_RATINGS]: 'CREDIT RATINGS',
  [PANEL_IDS.VOLATILITY_CONE]: 'VOLATILITY CONE',
  [PANEL_IDS.TERM_STRUCTURE]: 'TERM STRUCTURE',
  [PANEL_IDS.INSTITUTIONAL_OWNERSHIP]: 'INSTITUTIONAL OWNERSHIP',
  [PANEL_IDS.IMPLIED_CORRELATION]: 'IMPLIED CORRELATION',
  [PANEL_IDS.EARNINGS_QUALITY]: 'EARNINGS QUALITY',
  [PANEL_IDS.VOL_SURFACE]: 'VOL SURFACE',
  [PANEL_IDS.GLOBAL_FLOWS]: 'GLOBAL FLOWS',
  [PANEL_IDS.REGRESSION_ANALYSIS]: 'REGRESSION ANALYSIS',
  [PANEL_IDS.COVENANT_MONITOR]: 'COVENANT MONITOR',
  [PANEL_IDS.MARKET_INTERNALS]: 'MARKET INTERNALS',
  [PANEL_IDS.VALUATION_MULTIPLES]: 'VALUATION MULTIPLES',
  [PANEL_IDS.FIXED_INCOME_ANALYTICS]: 'FIXED INCOME ANALYTICS',
  [PANEL_IDS.INSIDER_SENTIMENT]: 'INSIDER SENTIMENT',
  [PANEL_IDS.CUSTOM_INDEX]: 'CUSTOM INDEX BUILDER',
  [PANEL_IDS.MBS_ANALYTICS]: 'MBS ANALYTICS',
  [PANEL_IDS.CDX_INDEX]: 'CDX / ITRAXX INDEX',
  [PANEL_IDS.MUNI_BONDS]: 'MUNICIPAL BONDS',
  [PANEL_IDS.CLO_ANALYTICS]: 'CLO ANALYTICS',
  [PANEL_IDS.ONCHAIN_ANALYTICS]: 'ON-CHAIN ANALYTICS',
  [PANEL_IDS.PRIVATE_CREDIT]: 'PRIVATE CREDIT',
  [PANEL_IDS.VOL_RISK_PREMIUM]: 'VOL RISK PREMIUM',
  [PANEL_IDS.ESG_RATINGS]: 'ESG RATINGS',
  [PANEL_IDS.FREIGHT_INDICES]: 'FREIGHT INDICES',
  [PANEL_IDS.ALTERNATIVE_DATA]: 'ALTERNATIVE DATA',
  [PANEL_IDS.TRADE_IDEAS]: 'TRADE IDEAS',
  [PANEL_IDS.DEBT_ISSUANCE]: 'DEBT ISSUANCE',
  [PANEL_IDS.FX_OPTIONS]: 'FX OPTIONS',
  [PANEL_IDS.MULTI_FACTOR]: 'MULTI-FACTOR MODEL',
  [PANEL_IDS.TREASURY_AUCTIONS]: 'TREASURY AUCTIONS',
  [PANEL_IDS.COMMODITY_CURVES]: 'COMMODITY CURVES',
  [PANEL_IDS.EM_BONDS]: 'EM BONDS',
  [PANEL_IDS.REIT_MONITOR]: 'REIT MONITOR',
  [PANEL_IDS.MONEY_MARKET]: 'MONEY MARKET',
  [PANEL_IDS.CONVERTIBLE_BONDS]: 'CONVERTIBLE BONDS',
  [PANEL_IDS.GLOBAL_PMI]: 'GLOBAL PMI',
  [PANEL_IDS.LEVERAGED_LOANS]: 'LEVERAGED LOANS',
  [PANEL_IDS.SWAPTION_VOL]: 'SWAPTION VOL',
  [PANEL_IDS.DISTRESSED_DEBT]: 'DISTRESSED DEBT',
  [PANEL_IDS.RATE_CAPS_FLOORS]: 'RATE CAPS/FLOORS',
  [PANEL_IDS.DIVIDEND_SWAPS]: 'DIVIDEND SWAPS',
  [PANEL_IDS.SECURITIES_LENDING]: 'SECURITIES LENDING',
  [PANEL_IDS.VARIANCE_SWAPS]: 'VARIANCE SWAPS',
  [PANEL_IDS.CARBON_CREDITS]: 'CARBON CREDITS',
  [PANEL_IDS.WEATHER_DERIVATIVES]: 'WEATHER DERIVATIVES',
  [PANEL_IDS.DARK_POOL]: 'DARK POOL ANALYTICS',
  [PANEL_IDS.TOTAL_RETURN_SWAPS]: 'TOTAL RETURN SWAPS',
  [PANEL_IDS.CAT_BONDS]: 'CATASTROPHE BONDS',
  [PANEL_IDS.INFLATION_LINKED_BONDS]: 'INFLATION LINKERS',
  [PANEL_IDS.EQUITY_BASKET_SWAPS]: 'EQUITY BASKET SWAPS',
  [PANEL_IDS.CROSS_CURRENCY_SWAPS]: 'CROSS-CURRENCY SWAPS',
  [PANEL_IDS.COMMODITY_OPTIONS]: 'COMMODITY OPTIONS',
  [PANEL_IDS.LOAN_CDS]: 'LOAN CDS',
  [PANEL_IDS.CONVERTIBLE_ARB]: 'CONVERTIBLE ARB',
  [PANEL_IDS.SHIPPING_RATES]: 'SHIPPING RATES',
  [PANEL_IDS.CREDIT_AUCTION]: 'CREDIT AUCTION',
  [PANEL_IDS.MUNI_YIELD_CURVES]: 'MUNI YIELD CURVES',
  [PANEL_IDS.STRUCTURED_PRODUCTS]: 'STRUCTURED PRODUCTS',
  [PANEL_IDS.PENSION_FUND]: 'PENSION FUND',
  [PANEL_IDS.SWAP_SPREAD_MONITOR]: 'SWAP SPREAD MONITOR',
  [PANEL_IDS.EQUITY_LINKED_NOTES]: 'EQUITY LINKED NOTES',
  [PANEL_IDS.TRADE_FINANCE]: 'TRADE FINANCE',
  [PANEL_IDS.REPO_MARKET]: 'REPO MARKET',
  [PANEL_IDS.COMMODITY_INVENTORY]: 'COMMODITY INVENTORY',
  [PANEL_IDS.SOVEREIGN_WEALTH]: 'SOVEREIGN WEALTH',
  [PANEL_IDS.AGENCY_MBS_TBA]: 'AGENCY MBS TBA',
  [PANEL_IDS.ETF_FLOWS]: 'ETF FLOWS',
  [PANEL_IDS.CREDIT_FLOW]: 'CREDIT FLOW',
  [PANEL_IDS.COMMODITY_SEASONALITY]: 'COMMODITY SEASONALITY',
  [PANEL_IDS.FX_VOLATILITY]: 'FX VOLATILITY',
  [PANEL_IDS.PRIMARY_DEALER]: 'PRIMARY DEALER',
  [PANEL_IDS.REAL_ESTATE_CAPITAL]: 'REAL ESTATE CAPITAL',
  [PANEL_IDS.ELECTRICITY_MARKETS]: 'ELECTRICITY MARKETS',
  [PANEL_IDS.SYNDICATED_LOANS]: 'SYNDICATED LOANS',
  [PANEL_IDS.EMISSIONS_TRADING]: 'EMISSIONS TRADING',
  [PANEL_IDS.INSURANCE_LINKED]: 'INSURANCE LINKED',
  [PANEL_IDS.METALS_FORWARD]: 'METALS FORWARD',
  [PANEL_IDS.CENTRAL_BANK_WATCH]: 'CENTRAL BANK WATCH',
  [PANEL_IDS.FREIGHT_DERIVATIVES]: 'FREIGHT DERIVATIVES',
  [PANEL_IDS.INFLATION_BREAKEVENS]: 'INFLATION BREAKEVENS',
  [PANEL_IDS.MUNI_BOND_AUCTION]: 'MUNI BOND AUCTION',
  [PANEL_IDS.COMMODITY_CURVE_ANALYTICS]: 'COMMODITY CURVE ANALYTICS',
  [PANEL_IDS.COLLATERAL_MONITOR]: 'COLLATERAL MONITOR',
  [PANEL_IDS.SOVEREIGN_CDS]: 'SOVEREIGN CDS',
  [PANEL_IDS.CROSS_ASSET_MOMENTUM]: 'CROSS-ASSET MOMENTUM',
  [PANEL_IDS.CRYPTO_DERIVATIVES]: 'CRYPTO DERIVATIVES',
  [PANEL_IDS.BOND_RELATIVE_VALUE]: 'BOND RELATIVE VALUE',
  [PANEL_IDS.VOLATILITY_ARBITRAGE]: 'VOLATILITY ARBITRAGE',
  [PANEL_IDS.SYSTEMATIC_STRATEGY]: 'SYSTEMATIC STRATEGY',
  [PANEL_IDS.FUNDING_RATE_MONITOR]: 'FUNDING RATE MONITOR',
  [PANEL_IDS.EM_LOCAL_RATES]: 'EM LOCAL RATES',
  [PANEL_IDS.PORTFOLIO_RISK_ANALYTICS]: 'PORTFOLIO RISK ANALYTICS',
  [PANEL_IDS.CREDIT_INDEX_MONITOR]: 'CREDIT INDEX MONITOR',
  [PANEL_IDS.EQUITY_FINANCING]: 'EQUITY FINANCING',
  [PANEL_IDS.GLOBAL_MACRO_DASHBOARD]: 'GLOBAL MACRO DASHBOARD',
  [PANEL_IDS.ABS_RMBS_MONITOR]: 'ABS/RMBS MONITOR',
  [PANEL_IDS.LIQUIDITY_RISK_MONITOR]: 'LIQUIDITY RISK MONITOR',
  [PANEL_IDS.FI_ATTRIBUTION]: 'FI ATTRIBUTION',
  [PANEL_IDS.REPO_RATE_HEATMAP]: 'REPO RATE HEATMAP',
  [PANEL_IDS.TRADE_COMPRESSION]: 'TRADE COMPRESSION',
  [PANEL_IDS.REGULATORY_CAPITAL]: 'REGULATORY CAPITAL',
  [PANEL_IDS.SETTLEMENT_RISK]: 'SETTLEMENT RISK',
  [PANEL_IDS.SWAP_VALUATION]: 'SWAP VALUATION',
  [PANEL_IDS.COMMODITY_STORAGE]: 'COMMODITY STORAGE',
  [PANEL_IDS.COUNTERPARTY_EXPOSURE]: 'COUNTERPARTY EXPOSURE',
  [PANEL_IDS.MARKET_IMPACT_MODEL]: 'MARKET IMPACT MODEL',
  [PANEL_IDS.STRUCTURED_NOTES]: 'STRUCTURED NOTES',
  [PANEL_IDS.SECURITIES_FINANCE]: 'SECURITIES FINANCE',
  [PANEL_IDS.CREDIT_CURVE_BUILDER]: 'CREDIT CURVE BUILDER',
  [PANEL_IDS.EXECUTION_ANALYTICS]: 'EXECUTION ANALYTICS',
  [PANEL_IDS.BOND_AUCTION_CALENDAR]: 'BOND AUCTION CALENDAR',
  [PANEL_IDS.FX_CARRY_MONITOR]: 'FX CARRY MONITOR',
  [PANEL_IDS.EQUITY_CAPITAL_MARKETS]: 'EQUITY CAPITAL MARKETS',
  [PANEL_IDS.DEBT_CAPITAL_MARKETS]: 'DEBT CAPITAL MARKETS',
  [PANEL_IDS.HEDGE_FUND_MONITOR]: 'HEDGE FUND MONITOR',
  [PANEL_IDS.RISK_DASHBOARD]: 'RISK DASHBOARD',
  [PANEL_IDS.BENCHMARK_TRACKER]: 'BENCHMARK TRACKER',
  [PANEL_IDS.LIQUIDITY_COVERAGE]: 'LIQUIDITY COVERAGE',
  [PANEL_IDS.MARKET_SENTIMENT_INDEX]: 'MARKET SENTIMENT INDEX',
  [PANEL_IDS.PORTFOLIO_STRESS_TEST]: 'PORTFOLIO STRESS TEST',
  [PANEL_IDS.GLOBAL_LIQUIDITY_MONITOR]: 'GLOBAL LIQUIDITY MONITOR',
  [PANEL_IDS.TRADE_RECAP]: 'TRADE RECAP',
  [PANEL_IDS.MACRO_SURPRISE_TRACKER]: 'MACRO SURPRISE TRACKER',
  [PANEL_IDS.FX_VOLATILITY_SURFACE]: 'FX VOLATILITY SURFACE',
  [PANEL_IDS.COMMODITY_FUNDAMENTAL]: 'COMMODITY FUNDAMENTAL',
  [PANEL_IDS.ETF_FLOW_MONITOR]: 'ETF FLOW MONITOR',
  [PANEL_IDS.EQUITY_FACTOR_MONITOR]: 'EQUITY FACTOR MONITOR',
  [PANEL_IDS.RATES_STRATEGY]: 'RATES STRATEGY',
  [PANEL_IDS.CREDIT_PORTFOLIO]: 'CREDIT PORTFOLIO',
  [PANEL_IDS.MACRO_REGIME_MONITOR]: 'MACRO REGIME MONITOR',
  [PANEL_IDS.DIVIDEND_CALENDAR]: 'DIVIDEND CALENDAR',
  [PANEL_IDS.CONVERTIBLE_ARBITRAGE]: 'CONVERTIBLE ARBITRAGE',
  [PANEL_IDS.REALTIME_PNL]: 'REAL-TIME P&L',
  [PANEL_IDS.MARKET_BREADTH_ADVANCED]: 'MARKET BREADTH ADV',
  [PANEL_IDS.VOLATILITY_DASHBOARD]: 'VOLATILITY DASHBOARD',
  [PANEL_IDS.FI_RELATIVE_VALUE]: 'FI RELATIVE VALUE',
  [PANEL_IDS.EQUITY_SCREEN_RESULTS]: 'EQUITY SCREEN RESULTS',
  [PANEL_IDS.CROSS_ASSET_CORRELATION]: 'CROSS-ASSET CORRELATION',
  [PANEL_IDS.PORTFOLIO_ATTRIBUTION]: 'PORTFOLIO ATTRIBUTION',
  [PANEL_IDS.MUNICIPAL_BOND_MONITOR]: 'MUNICIPAL BOND MONITOR',
  [PANEL_IDS.STRUCTURED_CREDIT]: 'STRUCTURED CREDIT',
  [PANEL_IDS.CURRENCY_OPTIONS]: 'CURRENCY OPTIONS',
  [PANEL_IDS.SWAP_CURVE_MONITOR]: 'SWAP CURVE MONITOR',
  [PANEL_IDS.FUND_FLOW_ANALYTICS]: 'FUND FLOW ANALYTICS',
  [PANEL_IDS.TRADE_COST_ANALYSIS]: 'TRADE COST ANALYSIS',
  [PANEL_IDS.WARRANT_CONVERTIBLE]: 'WARRANT & CONVERTIBLE',
  [PANEL_IDS.GLOBAL_TRADE_FLOW]: 'GLOBAL TRADE FLOW',
  [PANEL_IDS.REAL_ESTATE_ANALYTICS]: 'REAL ESTATE ANALYTICS',
  [PANEL_IDS.INFLATION_MONITOR]: 'INFLATION MONITOR',
  [PANEL_IDS.MERGER_ARBITRAGE]: 'MERGER ARBITRAGE',
  [PANEL_IDS.SOVEREIGN_DEBT]: 'SOVEREIGN DEBT',
  [PANEL_IDS.ETF_PREMIUM]: 'ETF PREMIUM/DISCOUNT',
  [PANEL_IDS.COMMODITY_DEMAND]: 'COMMODITY DEMAND',
  [PANEL_IDS.GLOBAL_DIVIDEND]: 'GLOBAL DIVIDEND',
  [PANEL_IDS.CDS_INDEX_MONITOR]: 'CDS INDEX MONITOR',
  [PANEL_IDS.MACRO_RISK]: 'MACRO RISK',
  [PANEL_IDS.FI_ATTRIBUTION_ANALYSIS]: 'FI ATTRIBUTION',
  [PANEL_IDS.EQUITY_STYLE]: 'EQUITY STYLE',
  [PANEL_IDS.CURRENCY_FORECAST]: 'CURRENCY FORECAST',
  [PANEL_IDS.BOND_LADDER]: 'BOND LADDER',
  [PANEL_IDS.SECTOR_CREDIT_SPREAD]: 'SECTOR CREDIT SPREAD',
  [PANEL_IDS.GLOBAL_PMI_DASHBOARD]: 'GLOBAL PMI',
  [PANEL_IDS.EARNINGS_WHISPER]: 'EARNINGS WHISPER',
  [PANEL_IDS.PORTFOLIO_HEDGING]: 'PORTFOLIO HEDGING',
  [PANEL_IDS.MARKET_DEPTH]: 'MARKET DEPTH',
  [PANEL_IDS.IRS_MONITOR]: 'IRS MONITOR',
  [PANEL_IDS.EQUITY_CAPITAL_RAISE]: 'EQUITY CAPITAL RAISE',
  [PANEL_IDS.VOLATILITY_SMILE]: 'VOLATILITY SMILE',
  [PANEL_IDS.REPO_RATE]: 'REPO RATE MONITOR',
  [PANEL_IDS.CENTRAL_BANK_BALANCE_SHEET]: 'CB BALANCE SHEET',
  [PANEL_IDS.CORPORATE_BUYBACK]: 'CORPORATE BUYBACK',
  [PANEL_IDS.MARGIN_DEBT]: 'MARGIN DEBT',
  [PANEL_IDS.CORPORATE_ACTIONS]: 'CORPORATE ACTIONS',
  [PANEL_IDS.FISCAL_POLICY]: 'FISCAL POLICY',
  [PANEL_IDS.BASIS_TRADE]: 'BASIS TRADE',
  [PANEL_IDS.FLOW_OF_FUNDS]: 'FLOW OF FUNDS',
  [PANEL_IDS.GLOBAL_SUPPLY_CHAIN]: 'SUPPLY CHAIN',
  [PANEL_IDS.TREASURY_ANALYTICS]: 'TREASURY ANALYTICS',
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
  [PANEL_IDS.BACKTEST]: 'panelBacktest',
  [PANEL_IDS.MACRO_DASHBOARD]: 'panelMacroDashboard',
  [PANEL_IDS.EARNINGS_SURPRISE]: 'panelEarningsSurprise',
  [PANEL_IDS.FUTURES_CURVE]: 'panelFuturesCurve',
  [PANEL_IDS.CREDIT_SPREADS]: 'panelCreditSpreads',
  [PANEL_IDS.INTERMARKET]: 'panelIntermarket',
  [PANEL_IDS.SECTOR_HEATMAP]: 'panelSectorHeatmap',
  [PANEL_IDS.ECONOMIC_SURPRISES]: 'panelEconomicSurprises',
  [PANEL_IDS.DISPERSION]: 'panelDispersion',
  [PANEL_IDS.FUND_FLOWS]: 'panelFundFlows',
  [PANEL_IDS.VOL_TERM_STRUCTURE]: 'panelVolTermStructure',
  [PANEL_IDS.MACRO_HEATMAP]: 'panelMacroHeatmap',
  [PANEL_IDS.FACTOR_EXPOSURE]: 'panelFactorExposure',
  [PANEL_IDS.CAPITAL_FLOWS]: 'panelCapitalFlows',
  [PANEL_IDS.TAIL_RISK]: 'panelTailRisk',
  [PANEL_IDS.LIQUIDITY]: 'panelLiquidity',
  [PANEL_IDS.COMMODITY_SPREADS]: 'panelCommoditySpreads',
  [PANEL_IDS.SENTIMENT_DASHBOARD]: 'panelSentimentDashboard',
  [PANEL_IDS.RISK_PARITY]: 'panelRiskParity',
  [PANEL_IDS.MARKET_ANOMALIES]: 'panelMarketAnomalies',
  [PANEL_IDS.CARRY_TRADE]: 'panelCarryTrade',
  [PANEL_IDS.COT_REPORT]: 'panelCotReport',
  [PANEL_IDS.IV_RANK]: 'panelIvRank',
  [PANEL_IDS.PERFORMANCE_ATTRIBUTION]: 'panelPerformanceAttribution',
  [PANEL_IDS.MARKET_MICROSTRUCTURE]: 'panelMarketMicrostructure',
  [PANEL_IDS.COUNTRY_RISK]: 'panelCountryRisk',
  [PANEL_IDS.POSITIONING]: 'panelPositioning',
  [PANEL_IDS.REPO_RATES]: 'panelRepoRates',
  [PANEL_IDS.XCCY_BASIS]: 'panelXccyBasis',
  [PANEL_IDS.STYLE_BOX]: 'panelStyleBox',
  [PANEL_IDS.SWAP_RATES]: 'panelSwapRates',
  [PANEL_IDS.TRADE_BLOTTER]: 'panelTradeBlotter',
  [PANEL_IDS.INFLATION_BREAKEVEN]: 'panelInflationBreakeven',
  [PANEL_IDS.CORPORATE_CDS]: 'panelCorporateCds',
  [PANEL_IDS.EVENT_DRIVEN]: 'panelEventDriven',
  [PANEL_IDS.DEBT_MATURITY]: 'panelDebtMaturity',
  [PANEL_IDS.EQUITY_RISK_PREMIUM]: 'panelEquityRiskPremium',
  [PANEL_IDS.CENTRAL_BANKS]: 'panelCentralBanks',
  [PANEL_IDS.VOL_SKEW]: 'panelVolSkew',
  [PANEL_IDS.GLOBAL_RATES]: 'panelGlobalRates',
  [PANEL_IDS.SUPPLY_CHAIN]: 'panelSupplyChain',
  [PANEL_IDS.GAMMA_EXPOSURE]: 'panelGammaExposure',
  [PANEL_IDS.SOVEREIGN_SPREADS]: 'panelSovereignSpreads',
  [PANEL_IDS.EARNINGS_REVISIONS]: 'panelEarningsRevisions',
  [PANEL_IDS.DIVIDEND_FORECAST]: 'panelDividendForecast',
  [PANEL_IDS.CREDIT_RATINGS]: 'panelCreditRatings',
  [PANEL_IDS.VOLATILITY_CONE]: 'panelVolatilityCone',
  [PANEL_IDS.TERM_STRUCTURE]: 'panelTermStructure',
  [PANEL_IDS.INSTITUTIONAL_OWNERSHIP]: 'panelInstitutionalOwnership',
  [PANEL_IDS.IMPLIED_CORRELATION]: 'panelImpliedCorrelation',
  [PANEL_IDS.EARNINGS_QUALITY]: 'panelEarningsQuality',
  [PANEL_IDS.VOL_SURFACE]: 'panelVolSurface',
  [PANEL_IDS.GLOBAL_FLOWS]: 'panelGlobalFlows',
  [PANEL_IDS.REGRESSION_ANALYSIS]: 'panelRegressionAnalysis',
  [PANEL_IDS.COVENANT_MONITOR]: 'panelCovenantMonitor',
  [PANEL_IDS.MARKET_INTERNALS]: 'panelMarketInternals',
  [PANEL_IDS.VALUATION_MULTIPLES]: 'panelValuationMultiples',
  [PANEL_IDS.FIXED_INCOME_ANALYTICS]: 'panelFixedIncomeAnalytics',
  [PANEL_IDS.INSIDER_SENTIMENT]: 'panelInsiderSentiment',
  [PANEL_IDS.CUSTOM_INDEX]: 'panelCustomIndex',
  [PANEL_IDS.MBS_ANALYTICS]: 'panelMbsAnalytics',
  [PANEL_IDS.CDX_INDEX]: 'panelCdxIndex',
  [PANEL_IDS.MUNI_BONDS]: 'panelMuniBonds',
  [PANEL_IDS.CLO_ANALYTICS]: 'panelCloAnalytics',
  [PANEL_IDS.ONCHAIN_ANALYTICS]: 'panelOnchainAnalytics',
  [PANEL_IDS.PRIVATE_CREDIT]: 'panelPrivateCredit',
  [PANEL_IDS.VOL_RISK_PREMIUM]: 'panelVolRiskPremium',
  [PANEL_IDS.ESG_RATINGS]: 'panelEsgRatings',
  [PANEL_IDS.FREIGHT_INDICES]: 'panelFreightIndices',
  [PANEL_IDS.ALTERNATIVE_DATA]: 'panelAlternativeData',
  [PANEL_IDS.TRADE_IDEAS]: 'panelTradeIdeas',
  [PANEL_IDS.DEBT_ISSUANCE]: 'panelDebtIssuance',
  [PANEL_IDS.FX_OPTIONS]: 'panelFxOptions',
  [PANEL_IDS.MULTI_FACTOR]: 'panelMultiFactor',
  [PANEL_IDS.TREASURY_AUCTIONS]: 'panelTreasuryAuctions',
  [PANEL_IDS.COMMODITY_CURVES]: 'panelCommodityCurves',
  [PANEL_IDS.EM_BONDS]: 'panelEmBonds',
  [PANEL_IDS.REIT_MONITOR]: 'panelReitMonitor',
  [PANEL_IDS.MONEY_MARKET]: 'panelMoneyMarket',
  [PANEL_IDS.CONVERTIBLE_BONDS]: 'panelConvertibleBonds',
  [PANEL_IDS.GLOBAL_PMI]: 'panelGlobalPmi',
  [PANEL_IDS.LEVERAGED_LOANS]: 'panelLeveragedLoans',
  [PANEL_IDS.SWAPTION_VOL]: 'panelSwaptionVol',
  [PANEL_IDS.DISTRESSED_DEBT]: 'panelDistressedDebt',
  [PANEL_IDS.RATE_CAPS_FLOORS]: 'panelRateCapsFloors',
  [PANEL_IDS.DIVIDEND_SWAPS]: 'panelDividendSwaps',
  [PANEL_IDS.SECURITIES_LENDING]: 'panelSecuritiesLending',
  [PANEL_IDS.VARIANCE_SWAPS]: 'panelVarianceSwaps',
  [PANEL_IDS.CARBON_CREDITS]: 'panelCarbonCredits',
  [PANEL_IDS.WEATHER_DERIVATIVES]: 'panelWeatherDerivatives',
  [PANEL_IDS.DARK_POOL]: 'panelDarkPool',
  [PANEL_IDS.TOTAL_RETURN_SWAPS]: 'panelTotalReturnSwaps',
  [PANEL_IDS.CAT_BONDS]: 'panelCatBonds',
  [PANEL_IDS.INFLATION_LINKED_BONDS]: 'panelInflationLinkedBonds',
  [PANEL_IDS.EQUITY_BASKET_SWAPS]: 'panelEquityBasketSwaps',
  [PANEL_IDS.CROSS_CURRENCY_SWAPS]: 'panelCrossCurrencySwaps',
  [PANEL_IDS.COMMODITY_OPTIONS]: 'panelCommodityOptions',
  [PANEL_IDS.LOAN_CDS]: 'panelLoanCds',
  [PANEL_IDS.CONVERTIBLE_ARB]: 'panelConvertibleArb',
  [PANEL_IDS.SHIPPING_RATES]: 'panelShippingRates',
  [PANEL_IDS.CREDIT_AUCTION]: 'panelCreditAuction',
  [PANEL_IDS.MUNI_YIELD_CURVES]: 'panelMuniYieldCurves',
  [PANEL_IDS.STRUCTURED_PRODUCTS]: 'panelStructuredProducts',
  [PANEL_IDS.PENSION_FUND]: 'panelPensionFund',
  [PANEL_IDS.SWAP_SPREAD_MONITOR]: 'panelSwapSpreadMonitor',
  [PANEL_IDS.EQUITY_LINKED_NOTES]: 'panelEquityLinkedNotes',
  [PANEL_IDS.TRADE_FINANCE]: 'panelTradeFinance',
  [PANEL_IDS.REPO_MARKET]: 'panelRepoMarket',
  [PANEL_IDS.COMMODITY_INVENTORY]: 'panelCommodityInventory',
  [PANEL_IDS.SOVEREIGN_WEALTH]: 'panelSovereignWealth',
  [PANEL_IDS.AGENCY_MBS_TBA]: 'panelAgencyMbsTba',
  [PANEL_IDS.ETF_FLOWS]: 'panelEtfFlows',
  [PANEL_IDS.CREDIT_FLOW]: 'panelCreditFlow',
  [PANEL_IDS.COMMODITY_SEASONALITY]: 'panelCommoditySeasonality',
  [PANEL_IDS.FX_VOLATILITY]: 'panelFxVolatility',
  [PANEL_IDS.PRIMARY_DEALER]: 'panelPrimaryDealer',
  [PANEL_IDS.REAL_ESTATE_CAPITAL]: 'panelRealEstateCapital',
  [PANEL_IDS.ELECTRICITY_MARKETS]: 'panelElectricityMarkets',
  [PANEL_IDS.SYNDICATED_LOANS]: 'panelSyndicatedLoans',
  [PANEL_IDS.EMISSIONS_TRADING]: 'panelEmissionsTrading',
  [PANEL_IDS.INSURANCE_LINKED]: 'panelInsuranceLinked',
  [PANEL_IDS.METALS_FORWARD]: 'panelMetalsForward',
  [PANEL_IDS.CENTRAL_BANK_WATCH]: 'panelCentralBankWatch',
  [PANEL_IDS.FREIGHT_DERIVATIVES]: 'panelFreightDerivatives',
  [PANEL_IDS.INFLATION_BREAKEVENS]: 'panelInflationBreakevens',
  [PANEL_IDS.MUNI_BOND_AUCTION]: 'panelMuniBondAuction',
  [PANEL_IDS.COMMODITY_CURVE_ANALYTICS]: 'panelCommodityCurveAnalytics',
  [PANEL_IDS.COLLATERAL_MONITOR]: 'panelCollateralMonitor',
  [PANEL_IDS.SOVEREIGN_CDS]: 'panelSovereignCds',
  [PANEL_IDS.CROSS_ASSET_MOMENTUM]: 'panelCrossAssetMomentum',
  [PANEL_IDS.CRYPTO_DERIVATIVES]: 'panelCryptoDerivatives',
  [PANEL_IDS.BOND_RELATIVE_VALUE]: 'panelBondRelativeValue',
  [PANEL_IDS.VOLATILITY_ARBITRAGE]: 'panelVolatilityArbitrage',
  [PANEL_IDS.SYSTEMATIC_STRATEGY]: 'panelSystematicStrategy',
  [PANEL_IDS.FUNDING_RATE_MONITOR]: 'panelFundingRateMonitor',
  [PANEL_IDS.EM_LOCAL_RATES]: 'panelEmLocalRates',
  [PANEL_IDS.PORTFOLIO_RISK_ANALYTICS]: 'panelPortfolioRiskAnalytics',
  [PANEL_IDS.CREDIT_INDEX_MONITOR]: 'panelCreditIndexMonitor',
  [PANEL_IDS.EQUITY_FINANCING]: 'panelEquityFinancing',
  [PANEL_IDS.GLOBAL_MACRO_DASHBOARD]: 'panelGlobalMacroDashboard',
  [PANEL_IDS.ABS_RMBS_MONITOR]: 'panelAbsRmbsMonitor',
  [PANEL_IDS.LIQUIDITY_RISK_MONITOR]: 'panelLiquidityRiskMonitor',
  [PANEL_IDS.FI_ATTRIBUTION]: 'panelFiAttribution',
  [PANEL_IDS.REPO_RATE_HEATMAP]: 'panelRepoRateHeatmap',
  [PANEL_IDS.TRADE_COMPRESSION]: 'panelTradeCompression',
  [PANEL_IDS.REGULATORY_CAPITAL]: 'panelRegulatoryCapital',
  [PANEL_IDS.SETTLEMENT_RISK]: 'panelSettlementRisk',
  [PANEL_IDS.SWAP_VALUATION]: 'panelSwapValuation',
  [PANEL_IDS.COMMODITY_STORAGE]: 'panelCommodityStorage',
  [PANEL_IDS.COUNTERPARTY_EXPOSURE]: 'panelCounterpartyExposure',
  [PANEL_IDS.MARKET_IMPACT_MODEL]: 'panelMarketImpactModel',
  [PANEL_IDS.STRUCTURED_NOTES]: 'panelStructuredNotes',
  [PANEL_IDS.SECURITIES_FINANCE]: 'panelSecuritiesFinance',
  [PANEL_IDS.CREDIT_CURVE_BUILDER]: 'panelCreditCurveBuilder',
  [PANEL_IDS.EXECUTION_ANALYTICS]: 'panelExecutionAnalytics',
  [PANEL_IDS.BOND_AUCTION_CALENDAR]: 'panelBondAuctionCalendar',
  [PANEL_IDS.FX_CARRY_MONITOR]: 'panelFxCarryMonitor',
  [PANEL_IDS.EQUITY_CAPITAL_MARKETS]: 'panelEquityCapitalMarkets',
  [PANEL_IDS.DEBT_CAPITAL_MARKETS]: 'panelDebtCapitalMarkets',
  [PANEL_IDS.HEDGE_FUND_MONITOR]: 'panelHedgeFundMonitor',
  [PANEL_IDS.RISK_DASHBOARD]: 'panelRiskDashboard',
  [PANEL_IDS.BENCHMARK_TRACKER]: 'panelBenchmarkTracker',
  [PANEL_IDS.LIQUIDITY_COVERAGE]: 'panelLiquidityCoverage',
  [PANEL_IDS.MARKET_SENTIMENT_INDEX]: 'panelMarketSentimentIndex',
  [PANEL_IDS.PORTFOLIO_STRESS_TEST]: 'panelPortfolioStressTest',
  [PANEL_IDS.GLOBAL_LIQUIDITY_MONITOR]: 'panelGlobalLiquidityMonitor',
  [PANEL_IDS.TRADE_RECAP]: 'panelTradeRecap',
  [PANEL_IDS.MACRO_SURPRISE_TRACKER]: 'panelMacroSurpriseTracker',
  [PANEL_IDS.FX_VOLATILITY_SURFACE]: 'panelFxVolatilitySurface',
  [PANEL_IDS.COMMODITY_FUNDAMENTAL]: 'panelCommodityFundamental',
  [PANEL_IDS.ETF_FLOW_MONITOR]: 'panelEtfFlowMonitor',
  [PANEL_IDS.EQUITY_FACTOR_MONITOR]: 'panelEquityFactorMonitor',
  [PANEL_IDS.RATES_STRATEGY]: 'panelRatesStrategy',
  [PANEL_IDS.CREDIT_PORTFOLIO]: 'panelCreditPortfolio',
  [PANEL_IDS.MACRO_REGIME_MONITOR]: 'panelMacroRegimeMonitor',
  [PANEL_IDS.DIVIDEND_CALENDAR]: 'panelDividendCalendar',
  [PANEL_IDS.CONVERTIBLE_ARBITRAGE]: 'panelConvertibleArbitrage',
  [PANEL_IDS.REALTIME_PNL]: 'panelRealtimePnl',
  [PANEL_IDS.MARKET_BREADTH_ADVANCED]: 'panelMarketBreadthAdvanced',
  [PANEL_IDS.VOLATILITY_DASHBOARD]: 'panelVolatilityDashboard',
  [PANEL_IDS.FI_RELATIVE_VALUE]: 'panelFiRelativeValue',
  [PANEL_IDS.EQUITY_SCREEN_RESULTS]: 'panelEquityScreenResults',
  [PANEL_IDS.CROSS_ASSET_CORRELATION]: 'panelCrossAssetCorrelation',
  [PANEL_IDS.PORTFOLIO_ATTRIBUTION]: 'panelPortfolioAttribution',
  [PANEL_IDS.MUNICIPAL_BOND_MONITOR]: 'panelMunicipalBondMonitor',
  [PANEL_IDS.STRUCTURED_CREDIT]: 'panelStructuredCredit',
  [PANEL_IDS.CURRENCY_OPTIONS]: 'panelCurrencyOptions',
  [PANEL_IDS.SWAP_CURVE_MONITOR]: 'panelSwapCurveMonitor',
  [PANEL_IDS.FUND_FLOW_ANALYTICS]: 'panelFundFlowAnalytics',
  [PANEL_IDS.TRADE_COST_ANALYSIS]: 'panelTradeCostAnalysis',
  [PANEL_IDS.WARRANT_CONVERTIBLE]: 'panelWarrantConvertible',
  [PANEL_IDS.GLOBAL_TRADE_FLOW]: 'panelGlobalTradeFlow',
  [PANEL_IDS.REAL_ESTATE_ANALYTICS]: 'panelRealEstateAnalytics',
  [PANEL_IDS.INFLATION_MONITOR]: 'panelInflationMonitor',
  [PANEL_IDS.MERGER_ARBITRAGE]: 'panelMergerArbitrage',
  [PANEL_IDS.SOVEREIGN_DEBT]: 'panelSovereignDebt',
  [PANEL_IDS.ETF_PREMIUM]: 'panelEtfPremium',
  [PANEL_IDS.COMMODITY_DEMAND]: 'panelCommodityDemand',
  [PANEL_IDS.GLOBAL_DIVIDEND]: 'panelGlobalDividend',
  [PANEL_IDS.CDS_INDEX_MONITOR]: 'panelCdsIndexMonitor',
  [PANEL_IDS.MACRO_RISK]: 'panelMacroRisk',
  [PANEL_IDS.FI_ATTRIBUTION_ANALYSIS]: 'panelFiAttributionAnalysis',
  [PANEL_IDS.EQUITY_STYLE]: 'panelEquityStyle',
  [PANEL_IDS.CURRENCY_FORECAST]: 'panelCurrencyForecast',
  [PANEL_IDS.BOND_LADDER]: 'panelBondLadder',
  [PANEL_IDS.SECTOR_CREDIT_SPREAD]: 'panelSectorCreditSpread',
  [PANEL_IDS.GLOBAL_PMI_DASHBOARD]: 'panelGlobalPmiDashboard',
  [PANEL_IDS.EARNINGS_WHISPER]: 'panelEarningsWhisper',
  [PANEL_IDS.PORTFOLIO_HEDGING]: 'panelPortfolioHedging',
  [PANEL_IDS.MARKET_DEPTH]: 'panelMarketDepth',
  [PANEL_IDS.IRS_MONITOR]: 'panelIrsMonitor',
  [PANEL_IDS.EQUITY_CAPITAL_RAISE]: 'panelEquityCapitalRaise',
  [PANEL_IDS.VOLATILITY_SMILE]: 'panelVolatilitySmile',
  [PANEL_IDS.REPO_RATE]: 'panelRepoRate',
  [PANEL_IDS.CENTRAL_BANK_BALANCE_SHEET]: 'panelCentralBankBalanceSheet',
  [PANEL_IDS.CORPORATE_BUYBACK]: 'panelCorporateBuyback',
  [PANEL_IDS.MARGIN_DEBT]: 'panelMarginDebt',
  [PANEL_IDS.CORPORATE_ACTIONS]: 'panelCorporateActions',
  [PANEL_IDS.FISCAL_POLICY]: 'panelFiscalPolicy',
  [PANEL_IDS.BASIS_TRADE]: 'panelBasisTrade',
  [PANEL_IDS.FLOW_OF_FUNDS]: 'panelFlowOfFunds',
  [PANEL_IDS.GLOBAL_SUPPLY_CHAIN]: 'panelGlobalSupplyChain',
  [PANEL_IDS.TREASURY_ANALYTICS]: 'panelTreasuryAnalytics',
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
      case PANEL_IDS.BACKTEST: content = <LazyWrap><BacktestPanel /></LazyWrap>; break;
      case PANEL_IDS.MACRO_DASHBOARD: content = <LazyWrap><MacroDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS_SURPRISE: content = <LazyWrap><EarningsSurprisePanel /></LazyWrap>; break;
      case PANEL_IDS.FUTURES_CURVE: content = <LazyWrap><FuturesCurvePanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_SPREADS: content = <LazyWrap><CreditSpreadsPanel /></LazyWrap>; break;
      case PANEL_IDS.INTERMARKET: content = <LazyWrap><IntermarketPanel /></LazyWrap>; break;
      case PANEL_IDS.SECTOR_HEATMAP: content = <LazyWrap><SectorHeatmapPanel /></LazyWrap>; break;
      case PANEL_IDS.ECONOMIC_SURPRISES: content = <LazyWrap><EconomicSurprisesPanel /></LazyWrap>; break;
      case PANEL_IDS.DISPERSION: content = <LazyWrap><DispersionPanel /></LazyWrap>; break;
      case PANEL_IDS.FUND_FLOWS: content = <LazyWrap><FundFlowsPanel /></LazyWrap>; break;
      case PANEL_IDS.VOL_TERM_STRUCTURE: content = <LazyWrap><VolTermStructurePanel /></LazyWrap>; break;
      case PANEL_IDS.MACRO_HEATMAP: content = <LazyWrap><MacroHeatmapPanel /></LazyWrap>; break;
      case PANEL_IDS.FACTOR_EXPOSURE: content = <LazyWrap><FactorExposurePanel /></LazyWrap>; break;
      case PANEL_IDS.CAPITAL_FLOWS: content = <LazyWrap><CapitalFlowsPanel /></LazyWrap>; break;
      case PANEL_IDS.TAIL_RISK: content = <LazyWrap><TailRiskPanel /></LazyWrap>; break;
      case PANEL_IDS.LIQUIDITY: content = <LazyWrap><LiquidityPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_SPREADS: content = <LazyWrap><CommoditySpreadsPanel /></LazyWrap>; break;
      case PANEL_IDS.SENTIMENT_DASHBOARD: content = <LazyWrap><SentimentDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.RISK_PARITY: content = <LazyWrap><RiskParityPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_ANOMALIES: content = <LazyWrap><MarketAnomaliesPanel /></LazyWrap>; break;
      case PANEL_IDS.CARRY_TRADE: content = <LazyWrap><CarryTradePanel /></LazyWrap>; break;
      case PANEL_IDS.COT_REPORT: content = <LazyWrap><CotReportPanel /></LazyWrap>; break;
      case PANEL_IDS.IV_RANK: content = <LazyWrap><IvRankPanel /></LazyWrap>; break;
      case PANEL_IDS.PERFORMANCE_ATTRIBUTION: content = <LazyWrap><PerformanceAttributionPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_MICROSTRUCTURE: content = <LazyWrap><MarketMicrostructurePanel /></LazyWrap>; break;
      case PANEL_IDS.COUNTRY_RISK: content = <LazyWrap><CountryRiskPanel /></LazyWrap>; break;
      case PANEL_IDS.POSITIONING: content = <LazyWrap><PositioningPanel /></LazyWrap>; break;
      case PANEL_IDS.REPO_RATES: content = <LazyWrap><RepoRatesPanel /></LazyWrap>; break;
      case PANEL_IDS.XCCY_BASIS: content = <LazyWrap><XccyBasisPanel /></LazyWrap>; break;
      case PANEL_IDS.STYLE_BOX: content = <LazyWrap><StyleBoxPanel /></LazyWrap>; break;
      case PANEL_IDS.SWAP_RATES: content = <LazyWrap><SwapRatesPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_BLOTTER: content = <LazyWrap><TradeBlotterPanel /></LazyWrap>; break;
      case PANEL_IDS.INFLATION_BREAKEVEN: content = <LazyWrap><InflationBreakevenPanel /></LazyWrap>; break;
      case PANEL_IDS.CORPORATE_CDS: content = <LazyWrap><CorporateCdsPanel /></LazyWrap>; break;
      case PANEL_IDS.EVENT_DRIVEN: content = <LazyWrap><EventDrivenPanel /></LazyWrap>; break;
      case PANEL_IDS.DEBT_MATURITY: content = <LazyWrap><DebtMaturityPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_RISK_PREMIUM: content = <LazyWrap><EquityRiskPremiumPanel /></LazyWrap>; break;
      case PANEL_IDS.CENTRAL_BANKS: content = <LazyWrap><CentralBanksPanel /></LazyWrap>; break;
      case PANEL_IDS.VOL_SKEW: content = <LazyWrap><VolSkewPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_RATES: content = <LazyWrap><GlobalRatesPanel /></LazyWrap>; break;
      case PANEL_IDS.SUPPLY_CHAIN: content = <LazyWrap><SupplyChainPanel /></LazyWrap>; break;
      case PANEL_IDS.GAMMA_EXPOSURE: content = <LazyWrap><GammaExposurePanel /></LazyWrap>; break;
      case PANEL_IDS.SOVEREIGN_SPREADS: content = <LazyWrap><SovereignSpreadsPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS_REVISIONS: content = <LazyWrap><EarningsRevisionsPanel /></LazyWrap>; break;
      case PANEL_IDS.DIVIDEND_FORECAST: content = <LazyWrap><DividendForecastPanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_RATINGS: content = <LazyWrap><CreditRatingsPanel /></LazyWrap>; break;
      case PANEL_IDS.VOLATILITY_CONE: content = <LazyWrap><VolatilityConePanel /></LazyWrap>; break;
      case PANEL_IDS.TERM_STRUCTURE: content = <LazyWrap><TermStructurePanel /></LazyWrap>; break;
      case PANEL_IDS.INSTITUTIONAL_OWNERSHIP: content = <LazyWrap><InstitutionalOwnershipPanel /></LazyWrap>; break;
      case PANEL_IDS.IMPLIED_CORRELATION: content = <LazyWrap><ImpliedCorrelationPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS_QUALITY: content = <LazyWrap><EarningsQualityPanel /></LazyWrap>; break;
      case PANEL_IDS.VOL_SURFACE: content = <LazyWrap><VolSurfacePanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_FLOWS: content = <LazyWrap><GlobalFlowsPanel /></LazyWrap>; break;
      case PANEL_IDS.REGRESSION_ANALYSIS: content = <LazyWrap><RegressionAnalysisPanel /></LazyWrap>; break;
      case PANEL_IDS.COVENANT_MONITOR: content = <LazyWrap><CovenantMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_INTERNALS: content = <LazyWrap><MarketInternalsPanel /></LazyWrap>; break;
      case PANEL_IDS.VALUATION_MULTIPLES: content = <LazyWrap><ValuationMultiplesPanel /></LazyWrap>; break;
      case PANEL_IDS.FIXED_INCOME_ANALYTICS: content = <LazyWrap><FixedIncomeAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.INSIDER_SENTIMENT: content = <LazyWrap><InsiderSentimentPanel /></LazyWrap>; break;
      case PANEL_IDS.CUSTOM_INDEX: content = <LazyWrap><CustomIndexPanel /></LazyWrap>; break;
      case PANEL_IDS.MBS_ANALYTICS: content = <LazyWrap><MbsAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.CDX_INDEX: content = <LazyWrap><CdxIndexPanel /></LazyWrap>; break;
      case PANEL_IDS.MUNI_BONDS: content = <LazyWrap><MuniBondsPanel /></LazyWrap>; break;
      case PANEL_IDS.CLO_ANALYTICS: content = <LazyWrap><CloAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.ONCHAIN_ANALYTICS: content = <LazyWrap><OnchainAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.PRIVATE_CREDIT: content = <LazyWrap><PrivateCreditPanel /></LazyWrap>; break;
      case PANEL_IDS.VOL_RISK_PREMIUM: content = <LazyWrap><VolRiskPremiumPanel /></LazyWrap>; break;
      case PANEL_IDS.ESG_RATINGS: content = <LazyWrap><EsgRatingsPanel /></LazyWrap>; break;
      case PANEL_IDS.FREIGHT_INDICES: content = <LazyWrap><FreightIndicesPanel /></LazyWrap>; break;
      case PANEL_IDS.ALTERNATIVE_DATA: content = <LazyWrap><AlternativeDataPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_IDEAS: content = <LazyWrap><TradeIdeasPanel /></LazyWrap>; break;
      case PANEL_IDS.DEBT_ISSUANCE: content = <LazyWrap><DebtIssuancePanel /></LazyWrap>; break;
      case PANEL_IDS.FX_OPTIONS: content = <LazyWrap><FxOptionsPanel /></LazyWrap>; break;
      case PANEL_IDS.MULTI_FACTOR: content = <LazyWrap><MultiFactorPanel /></LazyWrap>; break;
      case PANEL_IDS.TREASURY_AUCTIONS: content = <LazyWrap><TreasuryAuctionsPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_CURVES: content = <LazyWrap><CommodityCurvesPanel /></LazyWrap>; break;
      case PANEL_IDS.EM_BONDS: content = <LazyWrap><EmBondsPanel /></LazyWrap>; break;
      case PANEL_IDS.REIT_MONITOR: content = <LazyWrap><ReitMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.MONEY_MARKET: content = <LazyWrap><MoneyMarketPanel /></LazyWrap>; break;
      case PANEL_IDS.CONVERTIBLE_BONDS: content = <LazyWrap><ConvertibleBondsPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_PMI: content = <LazyWrap><GlobalPmiPanel /></LazyWrap>; break;
      case PANEL_IDS.LEVERAGED_LOANS: content = <LazyWrap><LeveragedLoansPanel /></LazyWrap>; break;
      case PANEL_IDS.SWAPTION_VOL: content = <LazyWrap><SwaptionVolPanel /></LazyWrap>; break;
      case PANEL_IDS.DISTRESSED_DEBT: content = <LazyWrap><DistressedDebtPanel /></LazyWrap>; break;
      case PANEL_IDS.RATE_CAPS_FLOORS: content = <LazyWrap><RateCapsFloorsPanel /></LazyWrap>; break;
      case PANEL_IDS.DIVIDEND_SWAPS: content = <LazyWrap><DividendSwapsPanel /></LazyWrap>; break;
      case PANEL_IDS.SECURITIES_LENDING: content = <LazyWrap><SecuritiesLendingPanel /></LazyWrap>; break;
      case PANEL_IDS.VARIANCE_SWAPS: content = <LazyWrap><VarianceSwapsPanel /></LazyWrap>; break;
      case PANEL_IDS.CARBON_CREDITS: content = <LazyWrap><CarbonCreditsPanel /></LazyWrap>; break;
      case PANEL_IDS.WEATHER_DERIVATIVES: content = <LazyWrap><WeatherDerivativesPanel /></LazyWrap>; break;
      case PANEL_IDS.DARK_POOL: content = <LazyWrap><DarkPoolPanel /></LazyWrap>; break;
      case PANEL_IDS.TOTAL_RETURN_SWAPS: content = <LazyWrap><TotalReturnSwapsPanel /></LazyWrap>; break;
      case PANEL_IDS.CAT_BONDS: content = <LazyWrap><CatBondsPanel /></LazyWrap>; break;
      case PANEL_IDS.INFLATION_LINKED_BONDS: content = <LazyWrap><InflationLinkedBondsPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_BASKET_SWAPS: content = <LazyWrap><EquityBasketSwapsPanel /></LazyWrap>; break;
      case PANEL_IDS.CROSS_CURRENCY_SWAPS: content = <LazyWrap><CrossCurrencySwapsPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_OPTIONS: content = <LazyWrap><CommodityOptionsPanel /></LazyWrap>; break;
      case PANEL_IDS.LOAN_CDS: content = <LazyWrap><LoanCdsPanel /></LazyWrap>; break;
      case PANEL_IDS.CONVERTIBLE_ARB: content = <LazyWrap><ConvertibleArbPanel /></LazyWrap>; break;
      case PANEL_IDS.SHIPPING_RATES: content = <LazyWrap><ShippingRatesPanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_AUCTION: content = <LazyWrap><CreditAuctionPanel /></LazyWrap>; break;
      case PANEL_IDS.MUNI_YIELD_CURVES: content = <LazyWrap><MuniYieldCurvesPanel /></LazyWrap>; break;
      case PANEL_IDS.STRUCTURED_PRODUCTS: content = <LazyWrap><StructuredProductsPanel /></LazyWrap>; break;
      case PANEL_IDS.PENSION_FUND: content = <LazyWrap><PensionFundPanel /></LazyWrap>; break;
      case PANEL_IDS.SWAP_SPREAD_MONITOR: content = <LazyWrap><SwapSpreadMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_LINKED_NOTES: content = <LazyWrap><EquityLinkedNotesPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_FINANCE: content = <LazyWrap><TradeFinancePanel /></LazyWrap>; break;
      case PANEL_IDS.REPO_MARKET: content = <LazyWrap><RepoMarketPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_INVENTORY: content = <LazyWrap><CommodityInventoryPanel /></LazyWrap>; break;
      case PANEL_IDS.SOVEREIGN_WEALTH: content = <LazyWrap><SovereignWealthPanel /></LazyWrap>; break;
      case PANEL_IDS.AGENCY_MBS_TBA: content = <LazyWrap><AgencyMbsTbaPanel /></LazyWrap>; break;
      case PANEL_IDS.ETF_FLOWS: content = <LazyWrap><EtfFlowsPanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_FLOW: content = <LazyWrap><CreditFlowPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_SEASONALITY: content = <LazyWrap><CommoditySeasonalityPanel /></LazyWrap>; break;
      case PANEL_IDS.FX_VOLATILITY: content = <LazyWrap><FxVolatilityPanel /></LazyWrap>; break;
      case PANEL_IDS.PRIMARY_DEALER: content = <LazyWrap><PrimaryDealerPanel /></LazyWrap>; break;
      case PANEL_IDS.REAL_ESTATE_CAPITAL: content = <LazyWrap><RealEstateCapitalPanel /></LazyWrap>; break;
      case PANEL_IDS.ELECTRICITY_MARKETS: content = <LazyWrap><ElectricityMarketsPanel /></LazyWrap>; break;
      case PANEL_IDS.SYNDICATED_LOANS: content = <LazyWrap><SyndicatedLoansPanel /></LazyWrap>; break;
      case PANEL_IDS.EMISSIONS_TRADING: content = <LazyWrap><EmissionsTradingPanel /></LazyWrap>; break;
      case PANEL_IDS.INSURANCE_LINKED: content = <LazyWrap><InsuranceLinkedPanel /></LazyWrap>; break;
      case PANEL_IDS.METALS_FORWARD: content = <LazyWrap><MetalsForwardPanel /></LazyWrap>; break;
      case PANEL_IDS.CENTRAL_BANK_WATCH: content = <LazyWrap><CentralBankWatchPanel /></LazyWrap>; break;
      case PANEL_IDS.FREIGHT_DERIVATIVES: content = <LazyWrap><FreightDerivativesPanel /></LazyWrap>; break;
      case PANEL_IDS.INFLATION_BREAKEVENS: content = <LazyWrap><InflationBreakevensPanel /></LazyWrap>; break;
      case PANEL_IDS.MUNI_BOND_AUCTION: content = <LazyWrap><MuniBondAuctionPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_CURVE_ANALYTICS: content = <LazyWrap><CommodityCurveAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.COLLATERAL_MONITOR: content = <LazyWrap><CollateralMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.SOVEREIGN_CDS: content = <LazyWrap><SovereignCdsPanel /></LazyWrap>; break;
      case PANEL_IDS.CROSS_ASSET_MOMENTUM: content = <LazyWrap><CrossAssetMomentumPanel /></LazyWrap>; break;
      case PANEL_IDS.CRYPTO_DERIVATIVES: content = <LazyWrap><CryptoDerivativesPanel /></LazyWrap>; break;
      case PANEL_IDS.BOND_RELATIVE_VALUE: content = <LazyWrap><BondRelativeValuePanel /></LazyWrap>; break;
      case PANEL_IDS.VOLATILITY_ARBITRAGE: content = <LazyWrap><VolatilityArbitragePanel /></LazyWrap>; break;
      case PANEL_IDS.SYSTEMATIC_STRATEGY: content = <LazyWrap><SystematicStrategyPanel /></LazyWrap>; break;
      case PANEL_IDS.FUNDING_RATE_MONITOR: content = <LazyWrap><FundingRateMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EM_LOCAL_RATES: content = <LazyWrap><EmLocalRatesPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO_RISK_ANALYTICS: content = <LazyWrap><PortfolioRiskAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_INDEX_MONITOR: content = <LazyWrap><CreditIndexMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_FINANCING: content = <LazyWrap><EquityFinancingPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_MACRO_DASHBOARD: content = <LazyWrap><GlobalMacroDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.ABS_RMBS_MONITOR: content = <LazyWrap><AbsRmbsMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.LIQUIDITY_RISK_MONITOR: content = <LazyWrap><LiquidityRiskMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.FI_ATTRIBUTION: content = <LazyWrap><FiAttributionPanel /></LazyWrap>; break;
      case PANEL_IDS.REPO_RATE_HEATMAP: content = <LazyWrap><RepoRateHeatmapPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_COMPRESSION: content = <LazyWrap><TradeCompressionPanel /></LazyWrap>; break;
      case PANEL_IDS.REGULATORY_CAPITAL: content = <LazyWrap><RegulatoryCapitalPanel /></LazyWrap>; break;
      case PANEL_IDS.SETTLEMENT_RISK: content = <LazyWrap><SettlementRiskPanel /></LazyWrap>; break;
      case PANEL_IDS.SWAP_VALUATION: content = <LazyWrap><SwapValuationPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_STORAGE: content = <LazyWrap><CommodityStoragePanel /></LazyWrap>; break;
      case PANEL_IDS.COUNTERPARTY_EXPOSURE: content = <LazyWrap><CounterpartyExposurePanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_IMPACT_MODEL: content = <LazyWrap><MarketImpactModelPanel /></LazyWrap>; break;
      case PANEL_IDS.STRUCTURED_NOTES: content = <LazyWrap><StructuredNotesPanel /></LazyWrap>; break;
      case PANEL_IDS.SECURITIES_FINANCE: content = <LazyWrap><SecuritiesFinancePanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_CURVE_BUILDER: content = <LazyWrap><CreditCurveBuilderPanel /></LazyWrap>; break;
      case PANEL_IDS.EXECUTION_ANALYTICS: content = <LazyWrap><ExecutionAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.BOND_AUCTION_CALENDAR: content = <LazyWrap><BondAuctionCalendarPanel /></LazyWrap>; break;
      case PANEL_IDS.FX_CARRY_MONITOR: content = <LazyWrap><FxCarryMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_CAPITAL_MARKETS: content = <LazyWrap><EquityCapitalMarketsPanel /></LazyWrap>; break;
      case PANEL_IDS.DEBT_CAPITAL_MARKETS: content = <LazyWrap><DebtCapitalMarketsPanel /></LazyWrap>; break;
      case PANEL_IDS.HEDGE_FUND_MONITOR: content = <LazyWrap><HedgeFundMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.RISK_DASHBOARD: content = <LazyWrap><RiskDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.BENCHMARK_TRACKER: content = <LazyWrap><BenchmarkTrackerPanel /></LazyWrap>; break;
      case PANEL_IDS.LIQUIDITY_COVERAGE: content = <LazyWrap><LiquidityCoveragePanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_SENTIMENT_INDEX: content = <LazyWrap><MarketSentimentIndexPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO_STRESS_TEST: content = <LazyWrap><PortfolioStressTestPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_LIQUIDITY_MONITOR: content = <LazyWrap><GlobalLiquidityMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_RECAP: content = <LazyWrap><TradeRecapPanel /></LazyWrap>; break;
      case PANEL_IDS.MACRO_SURPRISE_TRACKER: content = <LazyWrap><MacroSurpriseTrackerPanel /></LazyWrap>; break;
      case PANEL_IDS.FX_VOLATILITY_SURFACE: content = <LazyWrap><FxVolatilitySurfacePanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_FUNDAMENTAL: content = <LazyWrap><CommodityFundamentalPanel /></LazyWrap>; break;
      case PANEL_IDS.ETF_FLOW_MONITOR: content = <LazyWrap><EtfFlowMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_FACTOR_MONITOR: content = <LazyWrap><EquityFactorMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.RATES_STRATEGY: content = <LazyWrap><RatesStrategyPanel /></LazyWrap>; break;
      case PANEL_IDS.CREDIT_PORTFOLIO: content = <LazyWrap><CreditPortfolioPanel /></LazyWrap>; break;
      case PANEL_IDS.MACRO_REGIME_MONITOR: content = <LazyWrap><MacroRegimeMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.DIVIDEND_CALENDAR: content = <LazyWrap><DividendCalendarPanel /></LazyWrap>; break;
      case PANEL_IDS.CONVERTIBLE_ARBITRAGE: content = <LazyWrap><ConvertibleArbitragePanel /></LazyWrap>; break;
      case PANEL_IDS.REALTIME_PNL: content = <LazyWrap><RealtimePnlPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_BREADTH_ADVANCED: content = <LazyWrap><MarketBreadthAdvancedPanel /></LazyWrap>; break;
      case PANEL_IDS.VOLATILITY_DASHBOARD: content = <LazyWrap><VolatilityDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.FI_RELATIVE_VALUE: content = <LazyWrap><FiRelativeValuePanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_SCREEN_RESULTS: content = <LazyWrap><EquityScreenResultsPanel /></LazyWrap>; break;
      case PANEL_IDS.CROSS_ASSET_CORRELATION: content = <LazyWrap><CrossAssetCorrelationPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO_ATTRIBUTION: content = <LazyWrap><PortfolioAttributionPanel /></LazyWrap>; break;
      case PANEL_IDS.MUNICIPAL_BOND_MONITOR: content = <LazyWrap><MunicipalBondMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.STRUCTURED_CREDIT: content = <LazyWrap><StructuredCreditPanel /></LazyWrap>; break;
      case PANEL_IDS.CURRENCY_OPTIONS: content = <LazyWrap><CurrencyOptionsPanel /></LazyWrap>; break;
      case PANEL_IDS.SWAP_CURVE_MONITOR: content = <LazyWrap><SwapCurveMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.FUND_FLOW_ANALYTICS: content = <LazyWrap><FundFlowAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.TRADE_COST_ANALYSIS: content = <LazyWrap><TradeCostAnalysisPanel /></LazyWrap>; break;
      case PANEL_IDS.WARRANT_CONVERTIBLE: content = <LazyWrap><WarrantConvertiblePanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_TRADE_FLOW: content = <LazyWrap><GlobalTradeFlowPanel /></LazyWrap>; break;
      case PANEL_IDS.REAL_ESTATE_ANALYTICS: content = <LazyWrap><RealEstateAnalyticsPanel /></LazyWrap>; break;
      case PANEL_IDS.INFLATION_MONITOR: content = <LazyWrap><InflationMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.MERGER_ARBITRAGE: content = <LazyWrap><MergerArbitragePanel /></LazyWrap>; break;
      case PANEL_IDS.SOVEREIGN_DEBT: content = <LazyWrap><SovereignDebtPanel /></LazyWrap>; break;
      case PANEL_IDS.ETF_PREMIUM: content = <LazyWrap><EtfPremiumPanel /></LazyWrap>; break;
      case PANEL_IDS.COMMODITY_DEMAND: content = <LazyWrap><CommodityDemandPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_DIVIDEND: content = <LazyWrap><GlobalDividendPanel /></LazyWrap>; break;
      case PANEL_IDS.CDS_INDEX_MONITOR: content = <LazyWrap><CdsIndexMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.MACRO_RISK: content = <LazyWrap><MacroRiskPanel /></LazyWrap>; break;
      case PANEL_IDS.FI_ATTRIBUTION_ANALYSIS: content = <LazyWrap><FiAttributionAnalysisPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_STYLE: content = <LazyWrap><EquityStylePanel /></LazyWrap>; break;
      case PANEL_IDS.CURRENCY_FORECAST: content = <LazyWrap><CurrencyForecastPanel /></LazyWrap>; break;
      case PANEL_IDS.BOND_LADDER: content = <LazyWrap><BondLadderPanel /></LazyWrap>; break;
      case PANEL_IDS.SECTOR_CREDIT_SPREAD: content = <LazyWrap><SectorCreditSpreadPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_PMI_DASHBOARD: content = <LazyWrap><GlobalPmiDashboardPanel /></LazyWrap>; break;
      case PANEL_IDS.EARNINGS_WHISPER: content = <LazyWrap><EarningsWhisperPanel /></LazyWrap>; break;
      case PANEL_IDS.PORTFOLIO_HEDGING: content = <LazyWrap><PortfolioHedgingPanel /></LazyWrap>; break;
      case PANEL_IDS.MARKET_DEPTH: content = <LazyWrap><MarketDepthPanel /></LazyWrap>; break;
      case PANEL_IDS.IRS_MONITOR: content = <LazyWrap><IrsMonitorPanel /></LazyWrap>; break;
      case PANEL_IDS.EQUITY_CAPITAL_RAISE: content = <LazyWrap><EquityCapitalRaisePanel /></LazyWrap>; break;
      case PANEL_IDS.VOLATILITY_SMILE: content = <LazyWrap><VolatilitySmilePanel /></LazyWrap>; break;
      case PANEL_IDS.REPO_RATE: content = <LazyWrap><RepoRatePanel /></LazyWrap>; break;
      case PANEL_IDS.CENTRAL_BANK_BALANCE_SHEET: content = <LazyWrap><CentralBankBalanceSheetPanel /></LazyWrap>; break;
      case PANEL_IDS.CORPORATE_BUYBACK: content = <LazyWrap><CorporateBuybackPanel /></LazyWrap>; break;
      case PANEL_IDS.MARGIN_DEBT: content = <LazyWrap><MarginDebtPanel /></LazyWrap>; break;
      case PANEL_IDS.CORPORATE_ACTIONS: content = <LazyWrap><CorporateActionsPanel /></LazyWrap>; break;
      case PANEL_IDS.FISCAL_POLICY: content = <LazyWrap><FiscalPolicyPanel /></LazyWrap>; break;
      case PANEL_IDS.BASIS_TRADE: content = <LazyWrap><BasisTradePanel /></LazyWrap>; break;
      case PANEL_IDS.FLOW_OF_FUNDS: content = <LazyWrap><FlowOfFundsPanel /></LazyWrap>; break;
      case PANEL_IDS.GLOBAL_SUPPLY_CHAIN: content = <LazyWrap><GlobalSupplyChainPanel /></LazyWrap>; break;
      case PANEL_IDS.TREASURY_ANALYTICS: content = <LazyWrap><TreasuryAnalyticsPanel /></LazyWrap>; break;
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
