// Canonical StockCard — shared by all investor panels
// Source annotations: FETCHED = Yahoo Finance, DERIVED = computed locally, MANUAL = user input

export type ValuationStatus = 'STRONG_BUY' | 'BUY' | 'WATCH' | 'EXPENSIVE';

export interface StockCard {
  // ── Identity ──────────────────────────────────────────────── FETCHED
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;

  // ── Market Data ───────────────────────────────────────────── FETCHED
  price_current: number;
  price_52w_high: number;
  price_52w_low: number;
  market_cap: number | null;
  avg_volume: number | null;

  // ── Fundamentals ─────────────────────────────────────────── FETCHED
  pe_ttm: number | null;
  pe_forward: number | null;
  ps_ttm: number | null;
  pb: number | null;
  dividend_yield: number | null;
  roe: number | null;
  roic: number | null;
  revenue_growth_5y: number | null;   // annualised 5-yr CAGR
  eps_growth_5y: number | null;

  // ── Valuation ─────────────────────────────────────────────── MANUAL + DERIVED
  fair_value_estimate: number;        // MANUAL — user's DCF / analyst target
  valuation_method: string;           // MANUAL — e.g. "DCF", "EV/EBITDA", "Analyst consensus"
  margin_of_safety_low: number;       // MANUAL — e.g. 0.20 (20% below FV → Buy)
  margin_of_safety_high: number;      // MANUAL — e.g. 0.30 (30% below FV → Strong Buy)
  buy_zone_low: number;               // DERIVED
  buy_zone_high: number;              // DERIVED
  discount_pct: number;               // DERIVED
  valuation_status: ValuationStatus;  // DERIVED

  // ── Portfolio ─────────────────────────────────────────────── MANUAL
  current_shares: number;
  current_value: number;              // DERIVED from price × shares, or MANUAL override
  portfolio_weight_current: number;   // DERIVED from current_value / total_portfolio
  portfolio_weight_target_max: number; // MANUAL — max allocation %
  room_to_add: number;                // DERIVED

  // ── Qualitative ───────────────────────────────────────────── MANUAL
  thesis_summary: string;
  key_risks: string;
  time_horizon: string;               // e.g. "3–5 years"
  conviction_score: 1 | 2 | 3 | 4 | 5;

  // ── Scores ────────────────────────────────────────────────── DERIVED
  valuation_score: number;            // 0–1
  room_score: number;                 // 0–1
  risk_penalty: number;               // 0–1 (higher = riskier)
  priority_score: number;             // weighted composite

  // ── DCA Module (Tom Nash) ─────────────────────────────────── MANUAL + DERIVED
  dca_amount_monthly: number;         // MANUAL
  double_down_threshold_pct: number;  // MANUAL — default 0.20
  drop_from_52w_high_pct: number;     // DERIVED
  is_double_down_active: boolean;     // DERIVED
  double_down_signal: boolean;        // DERIVED (also requires fundamentals intact)
  dca_recommendation_text: string;    // DERIVED

  // ── Meta ──────────────────────────────────────────────────── MANUAL
  last_updated: string;               // ISO date
  notes_updated: string;
}

export type StockCardInput = Pick<
  StockCard,
  | 'ticker'
  | 'fair_value_estimate'
  | 'valuation_method'
  | 'margin_of_safety_low'
  | 'margin_of_safety_high'
  | 'current_shares'
  | 'portfolio_weight_target_max'
  | 'thesis_summary'
  | 'key_risks'
  | 'time_horizon'
  | 'conviction_score'
  | 'dca_amount_monthly'
  | 'double_down_threshold_pct'
  | 'notes_updated'
>;

export const DEFAULT_CARD_INPUT: Omit<StockCardInput, 'ticker'> = {
  fair_value_estimate: 0,
  valuation_method: 'Manual',
  margin_of_safety_low: 0.20,
  margin_of_safety_high: 0.30,
  current_shares: 0,
  portfolio_weight_target_max: 0.05,
  thesis_summary: '',
  key_risks: '',
  time_horizon: '3–5 years',
  conviction_score: 3,
  dca_amount_monthly: 0,
  double_down_threshold_pct: 0.20,
  notes_updated: new Date().toISOString(),
};
