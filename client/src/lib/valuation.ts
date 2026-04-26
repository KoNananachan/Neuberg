import type { StockCard, StockCardInput, ValuationStatus } from '../types/stock-card';
import type { StockQuote, StockProfile } from '../api/hooks/use-stocks';

// ── Core formulas ────────────────────────────────────────────────────────────

export function calcBuyZoneLow(fv: number, mosLow: number): number {
  return fv * (1 - mosLow);
}

export function calcBuyZoneHigh(fv: number, mosHigh: number): number {
  return fv * (1 - mosHigh);
}

export function calcDiscountPct(fv: number, price: number): number {
  if (fv <= 0) return 0;
  return (fv - price) / fv;
}

export function calcValuationStatus(
  price: number,
  fv: number,
  bzLow: number,
  bzHigh: number,
): ValuationStatus {
  if (price <= bzHigh) return 'STRONG_BUY';
  if (price <= bzLow) return 'BUY';
  if (price <= fv) return 'WATCH';
  return 'EXPENSIVE';
}

export function calcDropFrom52wHigh(high52w: number, price: number): number {
  if (high52w <= 0) return 0;
  return (high52w - price) / high52w;
}

export function calcRoomToAdd(targetMax: number, currentWeight: number): number {
  return Math.max(0, targetMax - currentWeight);
}

// ── Score normalisation ───────────────────────────────────────────────────────

export function calcValuationScore(discountPct: number): number {
  // Clamp to [0, 1]. discount=0.4+ → score≈1, discount<0 → 0
  return Math.min(1, Math.max(0, discountPct / 0.4));
}

export function calcRoomScore(room: number, targetMax: number): number {
  if (targetMax <= 0) return 0;
  return Math.min(1, room / targetMax);
}

export function calcRiskPenalty(convictionScore: 1 | 2 | 3 | 4 | 5): number {
  // Higher conviction → lower risk penalty
  return (5 - convictionScore) / 4;
}

export function calcPriorityScore(
  valScore: number,
  convNorm: number,
  roomScore: number,
  riskPenalty: number,
): number {
  return 0.5 * valScore + 0.3 * convNorm + 0.3 * roomScore - 0.3 * riskPenalty;
}

// ── DCA / Tom Nash ────────────────────────────────────────────────────────────

export function calcDoubleDownSignal(
  dropFrom52wHigh: number,
  threshold: number,
  fundamentalsIntact: boolean,
): boolean {
  return fundamentalsIntact && dropFrom52wHigh >= threshold;
}

export function calcDcaText(
  signal: boolean,
  dcaAmount: number,
  drop: number,
  threshold: number,
): string {
  if (dcaAmount <= 0) return 'Set a monthly DCA amount to see recommendation.';
  if (signal) {
    return `Double-down active: price is ${(drop * 100).toFixed(1)}% below 52-week high (threshold ${(threshold * 100).toFixed(0)}%). Consider investing $${(dcaAmount * 2).toLocaleString()} this month.`;
  }
  return `Standard DCA: invest $${dcaAmount.toLocaleString()} this month. Price is ${(drop * 100).toFixed(1)}% below 52-week high — threshold not reached.`;
}

// ── Fundamentals-intact heuristic ─────────────────────────────────────────────

export function isFundamentalsIntact(profile: StockProfile | null | undefined): boolean {
  if (!profile) return false;
  const roe = profile.returnOnEquity ?? 0;
  const revenueGrowth = profile.revenueGrowth ?? 0;
  // Very minimal sanity check — positive ROE and non-collapsing revenue
  return roe > 0 && revenueGrowth > -0.3;
}

// ── Assembler — combine fetched data + manual input into a full StockCard ─────

export function buildStockCard(
  input: StockCardInput,
  quote: StockQuote,
  profile: StockProfile | null | undefined,
  totalPortfolioValue: number,
): StockCard {
  const price = quote.price;
  const high52w = quote.fiftyTwoWeekHigh ?? price;
  const low52w = quote.fiftyTwoWeekLow ?? price;
  const shares = input.current_shares;
  const currentValue = price * shares;
  const portWeight = totalPortfolioValue > 0 ? currentValue / totalPortfolioValue : 0;

  const bZoneLow = calcBuyZoneLow(input.fair_value_estimate, input.margin_of_safety_low);
  const bZoneHigh = calcBuyZoneHigh(input.fair_value_estimate, input.margin_of_safety_high);
  const discount = calcDiscountPct(input.fair_value_estimate, price);
  const status = calcValuationStatus(price, input.fair_value_estimate, bZoneLow, bZoneHigh);

  const room = calcRoomToAdd(input.portfolio_weight_target_max, portWeight);
  const valScore = calcValuationScore(discount);
  const roomScore = calcRoomScore(room, input.portfolio_weight_target_max);
  const convNorm = input.conviction_score / 5;
  const riskPenalty = calcRiskPenalty(input.conviction_score);
  const priorityScore = calcPriorityScore(valScore, convNorm, roomScore, riskPenalty);

  const drop52 = calcDropFrom52wHigh(high52w, price);
  const fundIntact = isFundamentalsIntact(profile);
  const ddSignal = calcDoubleDownSignal(drop52, input.double_down_threshold_pct, fundIntact);
  const dcaText = calcDcaText(ddSignal, input.dca_amount_monthly, drop52, input.double_down_threshold_pct);

  const revenueGrowth = profile?.revenueGrowth ?? null;
  const earningsGrowth = profile?.earningsGrowth ?? null;

  return {
    ticker: quote.symbol,
    name: quote.name ?? quote.symbol,
    exchange: '',
    sector: profile?.sector ?? '',
    industry: profile?.industry ?? '',

    price_current: price,
    price_52w_high: high52w,
    price_52w_low: low52w,
    market_cap: quote.marketCap ?? null,
    avg_volume: quote.avgVolume ?? null,

    pe_ttm: quote.pe ?? null,
    pe_forward: quote.forwardPE ?? null,
    ps_ttm: null,
    pb: quote.priceToBook ?? null,
    dividend_yield: quote.dividendYield ?? null,
    roe: profile?.returnOnEquity ?? null,
    roic: null,
    revenue_growth_5y: revenueGrowth,
    eps_growth_5y: earningsGrowth,

    fair_value_estimate: input.fair_value_estimate,
    valuation_method: input.valuation_method,
    margin_of_safety_low: input.margin_of_safety_low,
    margin_of_safety_high: input.margin_of_safety_high,
    buy_zone_low: bZoneLow,
    buy_zone_high: bZoneHigh,
    discount_pct: discount,
    valuation_status: status,

    current_shares: shares,
    current_value: currentValue,
    portfolio_weight_current: portWeight,
    portfolio_weight_target_max: input.portfolio_weight_target_max,
    room_to_add: room,

    thesis_summary: input.thesis_summary,
    key_risks: input.key_risks,
    time_horizon: input.time_horizon,
    conviction_score: input.conviction_score,

    valuation_score: valScore,
    room_score: roomScore,
    risk_penalty: riskPenalty,
    priority_score: priorityScore,

    dca_amount_monthly: input.dca_amount_monthly,
    double_down_threshold_pct: input.double_down_threshold_pct,
    drop_from_52w_high_pct: drop52,
    is_double_down_active: drop52 >= input.double_down_threshold_pct,
    double_down_signal: ddSignal,
    dca_recommendation_text: dcaText,

    last_updated: new Date().toISOString(),
    notes_updated: input.notes_updated,
  };
}
