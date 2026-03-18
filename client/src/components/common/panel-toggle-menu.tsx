import { useState, useMemo, useEffect, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { ALL_PANEL_IDS, PANEL_IDS, getLocalizedPanelName, showPanelInLayout, hidePanelInLayout, resetLayout } from '../layout/dock-layout';
import { Eye, EyeOff, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { TranslationKey } from '../../i18n/translations';

/** Panels hidden from the toggle menu (not ready for release) */
const HIDDEN_FROM_MENU: Set<string> = new Set([PANEL_IDS.AI_CHAT]);

interface PanelCategory {
  key: TranslationKey;
  panels: string[];
}

const PANEL_CATEGORIES: PanelCategory[] = [
  {
    key: 'catMarkets',
    panels: [
      PANEL_IDS.STOCKS, PANEL_IDS.MARKET_MOVERS, PANEL_IDS.FOREX, PANEL_IDS.BONDS,
      PANEL_IDS.COMMODITIES, PANEL_IDS.CRYPTO, PANEL_IDS.FUTURES, PANEL_IDS.GLOBAL_DASHBOARD,
      PANEL_IDS.FX_CROSS, PANEL_IDS.WATCHLIST, PANEL_IDS.FEAR_GREED,
      PANEL_IDS.YIELD_CURVE, PANEL_IDS.CURRENCY_STRENGTH, PANEL_IDS.MONEY_FLOW,
      PANEL_IDS.CROSS_ASSET, PANEL_IDS.SECTOR_PERFORMANCE, PANEL_IDS.MARKET_REGIME, PANEL_IDS.MACRO_DASHBOARD,
      PANEL_IDS.FUTURES_CURVE, PANEL_IDS.CREDIT_SPREADS, PANEL_IDS.SECTOR_HEATMAP,
      PANEL_IDS.FUND_FLOWS, PANEL_IDS.VOL_TERM_STRUCTURE, PANEL_IDS.MACRO_HEATMAP,
      PANEL_IDS.COUNTRY_RISK,
      PANEL_IDS.REPO_RATES, PANEL_IDS.XCCY_BASIS, PANEL_IDS.SWAP_RATES,
      PANEL_IDS.INFLATION_BREAKEVEN, PANEL_IDS.CORPORATE_CDS,
      PANEL_IDS.DEBT_MATURITY, PANEL_IDS.CENTRAL_BANKS, PANEL_IDS.GLOBAL_RATES,
      PANEL_IDS.SOVEREIGN_SPREADS, PANEL_IDS.CREDIT_RATINGS,
      PANEL_IDS.TERM_STRUCTURE, PANEL_IDS.COVENANT_MONITOR,
      PANEL_IDS.FIXED_INCOME_ANALYTICS,
      PANEL_IDS.MBS_ANALYTICS, PANEL_IDS.CDX_INDEX,
      PANEL_IDS.MUNI_BONDS, PANEL_IDS.CLO_ANALYTICS, PANEL_IDS.PRIVATE_CREDIT, PANEL_IDS.FREIGHT_INDICES, PANEL_IDS.DEBT_ISSUANCE,
      PANEL_IDS.TREASURY_AUCTIONS, PANEL_IDS.COMMODITY_CURVES, PANEL_IDS.EM_BONDS,
      PANEL_IDS.MONEY_MARKET, PANEL_IDS.CONVERTIBLE_BONDS,
      PANEL_IDS.LEVERAGED_LOANS, PANEL_IDS.SWAPTION_VOL,
      PANEL_IDS.DISTRESSED_DEBT, PANEL_IDS.RATE_CAPS_FLOORS,
      PANEL_IDS.SECURITIES_LENDING, PANEL_IDS.CARBON_CREDITS,
      PANEL_IDS.WEATHER_DERIVATIVES, PANEL_IDS.TOTAL_RETURN_SWAPS,
      PANEL_IDS.CAT_BONDS, PANEL_IDS.INFLATION_LINKED_BONDS,
      PANEL_IDS.CROSS_CURRENCY_SWAPS, PANEL_IDS.LOAN_CDS,
      PANEL_IDS.SHIPPING_RATES, PANEL_IDS.CREDIT_AUCTION,
      PANEL_IDS.MUNI_YIELD_CURVES, PANEL_IDS.STRUCTURED_PRODUCTS,
      PANEL_IDS.SWAP_SPREAD_MONITOR, PANEL_IDS.EQUITY_LINKED_NOTES, PANEL_IDS.TRADE_FINANCE,
      PANEL_IDS.REPO_MARKET, PANEL_IDS.COMMODITY_INVENTORY,
      PANEL_IDS.AGENCY_MBS_TBA, PANEL_IDS.CREDIT_FLOW,
      PANEL_IDS.PRIMARY_DEALER,
      PANEL_IDS.REAL_ESTATE_CAPITAL, PANEL_IDS.ELECTRICITY_MARKETS, PANEL_IDS.SYNDICATED_LOANS,
      PANEL_IDS.EMISSIONS_TRADING, PANEL_IDS.INSURANCE_LINKED, PANEL_IDS.METALS_FORWARD,
      PANEL_IDS.CENTRAL_BANK_WATCH, PANEL_IDS.FREIGHT_DERIVATIVES,
      PANEL_IDS.INFLATION_BREAKEVENS, PANEL_IDS.MUNI_BOND_AUCTION, PANEL_IDS.COMMODITY_CURVE_ANALYTICS,
      PANEL_IDS.COLLATERAL_MONITOR, PANEL_IDS.SOVEREIGN_CDS, PANEL_IDS.CROSS_ASSET_MOMENTUM,
      PANEL_IDS.CRYPTO_DERIVATIVES, PANEL_IDS.BOND_RELATIVE_VALUE,
      PANEL_IDS.VOLATILITY_ARBITRAGE, PANEL_IDS.SYSTEMATIC_STRATEGY,
      PANEL_IDS.FUNDING_RATE_MONITOR, PANEL_IDS.EM_LOCAL_RATES, PANEL_IDS.PORTFOLIO_RISK_ANALYTICS,
      PANEL_IDS.CREDIT_INDEX_MONITOR, PANEL_IDS.EQUITY_FINANCING, PANEL_IDS.GLOBAL_MACRO_DASHBOARD,
      PANEL_IDS.ABS_RMBS_MONITOR, PANEL_IDS.LIQUIDITY_RISK_MONITOR, PANEL_IDS.FI_ATTRIBUTION,
      PANEL_IDS.REPO_RATE_HEATMAP, PANEL_IDS.TRADE_COMPRESSION, PANEL_IDS.REGULATORY_CAPITAL,
      PANEL_IDS.SETTLEMENT_RISK, PANEL_IDS.SWAP_VALUATION, PANEL_IDS.COMMODITY_STORAGE,
      PANEL_IDS.COUNTERPARTY_EXPOSURE, PANEL_IDS.MARKET_IMPACT_MODEL, PANEL_IDS.STRUCTURED_NOTES,
      PANEL_IDS.SECURITIES_FINANCE, PANEL_IDS.CREDIT_CURVE_BUILDER, PANEL_IDS.EXECUTION_ANALYTICS,
      PANEL_IDS.BOND_AUCTION_CALENDAR, PANEL_IDS.FX_CARRY_MONITOR, PANEL_IDS.EQUITY_CAPITAL_MARKETS,
      PANEL_IDS.DEBT_CAPITAL_MARKETS, PANEL_IDS.HEDGE_FUND_MONITOR, PANEL_IDS.RISK_DASHBOARD,
      PANEL_IDS.BENCHMARK_TRACKER, PANEL_IDS.LIQUIDITY_COVERAGE, PANEL_IDS.MARKET_SENTIMENT_INDEX,
      PANEL_IDS.PORTFOLIO_STRESS_TEST, PANEL_IDS.GLOBAL_LIQUIDITY_MONITOR, PANEL_IDS.TRADE_RECAP,
      PANEL_IDS.MACRO_SURPRISE_TRACKER, PANEL_IDS.FX_VOLATILITY_SURFACE, PANEL_IDS.COMMODITY_FUNDAMENTAL,
      PANEL_IDS.ETF_FLOW_MONITOR, PANEL_IDS.EQUITY_FACTOR_MONITOR, PANEL_IDS.RATES_STRATEGY,
      PANEL_IDS.CREDIT_PORTFOLIO, PANEL_IDS.MACRO_REGIME_MONITOR, PANEL_IDS.DIVIDEND_CALENDAR,
      PANEL_IDS.CONVERTIBLE_ARBITRAGE, PANEL_IDS.REALTIME_PNL, PANEL_IDS.MARKET_BREADTH_ADVANCED,
      PANEL_IDS.VOLATILITY_DASHBOARD, PANEL_IDS.FI_RELATIVE_VALUE, PANEL_IDS.EQUITY_SCREEN_RESULTS,
    ],
  },
  {
    key: 'catAnalysis',
    panels: [
      PANEL_IDS.TECHNICAL_CHART, PANEL_IDS.AI, PANEL_IDS.SENTIMENT, PANEL_IDS.CORRELATIONS, PANEL_IDS.HEAT_MAP,
      PANEL_IDS.BREADTH, PANEL_IDS.SCANNER, PANEL_IDS.SCREENER, PANEL_IDS.VOLATILITY,
      PANEL_IDS.RELATIVE_STRENGTH, PANEL_IDS.SENTIMENT_HEATMAP, PANEL_IDS.DRAWDOWN,
      PANEL_IDS.CONFLUENCE, PANEL_IDS.SEASONALITY, PANEL_IDS.ORDER_FLOW, PANEL_IDS.INTERMARKET,
      PANEL_IDS.ECONOMIC_SURPRISES, PANEL_IDS.DISPERSION, PANEL_IDS.FACTOR_EXPOSURE,
      PANEL_IDS.CAPITAL_FLOWS, PANEL_IDS.TAIL_RISK, PANEL_IDS.LIQUIDITY,
      PANEL_IDS.COMMODITY_SPREADS, PANEL_IDS.SENTIMENT_DASHBOARD,
      PANEL_IDS.RISK_PARITY, PANEL_IDS.MARKET_ANOMALIES, PANEL_IDS.CARRY_TRADE,
      PANEL_IDS.COT_REPORT,
      PANEL_IDS.MARKET_MICROSTRUCTURE, PANEL_IDS.POSITIONING,
      PANEL_IDS.EVENT_DRIVEN, PANEL_IDS.EQUITY_RISK_PREMIUM, PANEL_IDS.SUPPLY_CHAIN,
      PANEL_IDS.VOLATILITY_CONE, PANEL_IDS.IMPLIED_CORRELATION,
      PANEL_IDS.GLOBAL_FLOWS, PANEL_IDS.REGRESSION_ANALYSIS,
      PANEL_IDS.MARKET_INTERNALS, PANEL_IDS.VOL_RISK_PREMIUM, PANEL_IDS.ALTERNATIVE_DATA, PANEL_IDS.MULTI_FACTOR,
      PANEL_IDS.GLOBAL_PMI, PANEL_IDS.DARK_POOL,
      PANEL_IDS.PENSION_FUND, PANEL_IDS.SOVEREIGN_WEALTH,
      PANEL_IDS.ETF_FLOWS, PANEL_IDS.COMMODITY_SEASONALITY,
    ],
  },
  {
    key: 'catEquities',
    panels: [
      PANEL_IDS.COMPANY_PROFILE, PANEL_IDS.FINANCIALS, PANEL_IDS.ANALYST, PANEL_IDS.EARNINGS,
      PANEL_IDS.EARNINGS_ESTIMATES, PANEL_IDS.HOLDINGS, PANEL_IDS.ETF_HOLDINGS, PANEL_IDS.DIVIDENDS, PANEL_IDS.INSIDERS, PANEL_IDS.SHORT_INTEREST, PANEL_IDS.IPO,
      PANEL_IDS.ETF, PANEL_IDS.PAIRS_TRADING, PANEL_IDS.PERFORMANCE, PANEL_IDS.RELATIVE_VALUATION, PANEL_IDS.EARNINGS_SURPRISE,
      PANEL_IDS.PERFORMANCE_ATTRIBUTION, PANEL_IDS.STYLE_BOX,
      PANEL_IDS.EARNINGS_REVISIONS, PANEL_IDS.DIVIDEND_FORECAST,
      PANEL_IDS.INSTITUTIONAL_OWNERSHIP, PANEL_IDS.EARNINGS_QUALITY,
      PANEL_IDS.VALUATION_MULTIPLES, PANEL_IDS.INSIDER_SENTIMENT,
      PANEL_IDS.CUSTOM_INDEX, PANEL_IDS.ONCHAIN_ANALYTICS, PANEL_IDS.ESG_RATINGS,
      PANEL_IDS.REIT_MONITOR, PANEL_IDS.DIVIDEND_SWAPS,
    ],
  },
  {
    key: 'catOptions',
    panels: [
      PANEL_IDS.OPTIONS, PANEL_IDS.OPTIONS_CALC, PANEL_IDS.PIVOT_POINTS, PANEL_IDS.FIBONACCI, PANEL_IDS.IV_SURFACE,
      PANEL_IDS.IV_RANK, PANEL_IDS.VOL_SKEW, PANEL_IDS.GAMMA_EXPOSURE,
      PANEL_IDS.VOL_SURFACE, PANEL_IDS.FX_OPTIONS, PANEL_IDS.VARIANCE_SWAPS,
      PANEL_IDS.COMMODITY_OPTIONS, PANEL_IDS.FX_VOLATILITY,
    ],
  },
  {
    key: 'catNews',
    panels: [
      PANEL_IDS.NEWS, PANEL_IDS.ECON_CALENDAR, PANEL_IDS.ECON_INDICATORS, PANEL_IDS.WORLD_ECONOMY, PANEL_IDS.LIVE_STREAMS, PANEL_IDS.MAP,
    ],
  },
  {
    key: 'catTrading',
    panels: [
      PANEL_IDS.TRADING, PANEL_IDS.PREDICTION, PANEL_IDS.MISSED_OPP,
      PANEL_IDS.RISK, PANEL_IDS.ALERTS, PANEL_IDS.SECTORS, PANEL_IDS.PORTFOLIO, PANEL_IDS.PORTFOLIO_OPTIMIZER, PANEL_IDS.BACKTEST,
      PANEL_IDS.TRADE_BLOTTER, PANEL_IDS.TRADE_IDEAS, PANEL_IDS.EQUITY_BASKET_SWAPS,
      PANEL_IDS.CONVERTIBLE_ARB,
    ],
  },
  {
    key: 'catCalculators',
    panels: [
      PANEL_IDS.INVESTMENT_CALC, PANEL_IDS.BOND_CALC, PANEL_IDS.FX_CONVERTER,
      PANEL_IDS.MORTGAGE_CALC, PANEL_IDS.MARKET_HOURS, PANEL_IDS.MARKET_CALENDAR,
    ],
  },
  {
    key: 'catSystem',
    panels: [PANEL_IDS.LOG],
  },
];

interface PanelToggleMenuProps {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function PanelToggleMenu({ open, onClose, containerRef }: PanelToggleMenuProps) {
  const t = useT();
  const hiddenPanels = useAppStore((s) => s.hiddenPanels);
  const hidePanel = useAppStore((s) => s.hidePanel);
  const showPanel = useAppStore((s) => s.showPanel);
  useAppStore((s) => s.locale);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, containerRef]);

  const togglePanel = (panelId: string) => {
    const isHidden = hiddenPanels.includes(panelId);
    if (isHidden) {
      showPanel(panelId);
      showPanelInLayout(panelId);
    } else {
      hidePanel(panelId);
      hidePanelInLayout(panelId);
    }
  };

  const toggleCategory = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PANEL_CATEGORIES.map(cat => ({
      ...cat,
      panels: cat.panels
        .filter(id => !HIDDEN_FROM_MENU.has(id))
        .filter(id => !q || getLocalizedPanelName(id).toLowerCase().includes(q)),
    })).filter(cat => cat.panels.length > 0);
  }, [search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
          className="absolute right-0 top-full mt-1 w-64 bg-zinc-900 border border-border/80 shadow-2xl z-50 max-h-[80vh] flex flex-col"
        >
          {/* Header + search */}
          <div className="px-3 py-2 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-accent">
                {t('catPanels')}
              </span>
              <span className="text-[8px] font-mono text-neutral/30">
                {ALL_PANEL_IDS.filter(id => !HIDDEN_FROM_MENU.has(id)).length - hiddenPanels.length} / {ALL_PANEL_IDS.filter(id => !HIDDEN_FROM_MENU.has(id)).length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/60 border border-border/20 px-2 py-1">
              <Search className="w-3 h-3 text-neutral/30 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="w-full bg-transparent text-[9px] font-mono text-white placeholder:text-neutral/20 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-auto no-scrollbar py-1">
            {filteredCategories.map((cat) => {
              const isCollapsed = collapsed.has(cat.key) && !search;
              const activeCount = cat.panels.filter(id => !hiddenPanels.includes(id)).length;
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-neutral/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-neutral/40 shrink-0" />
                    )}
                    <span className="text-[8px] font-black uppercase tracking-wider text-accent/80 flex-1">
                      {t(cat.key)}
                    </span>
                    <span className="text-[7px] font-mono text-neutral/30">
                      {activeCount}/{cat.panels.length}
                    </span>
                  </button>
                  {!isCollapsed && cat.panels.map((panelId) => {
                    const isHidden = hiddenPanels.includes(panelId);
                    return (
                      <button
                        key={panelId}
                        onClick={() => togglePanel(panelId)}
                        className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-left hover:bg-white/5 transition-colors ${
                          isHidden ? 'opacity-40' : ''
                        }`}
                      >
                        {isHidden ? (
                          <EyeOff className="w-3 h-3 text-neutral/50 shrink-0" />
                        ) : (
                          <Eye className="w-3 h-3 text-accent shrink-0" />
                        )}
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                          isHidden ? 'text-neutral/50' : 'text-white'
                        }`}>
                          {getLocalizedPanelName(panelId)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <div className="border-t border-border/30 px-3 py-2 shrink-0">
            <button
              onClick={resetLayout}
              className="w-full flex items-center gap-2.5 px-0 py-1 text-left text-neutral/60 hover:text-bearish transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                {t('catReset')}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
