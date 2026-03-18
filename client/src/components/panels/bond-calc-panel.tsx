import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useT } from '../../i18n';
import { Landmark } from 'lucide-react';

// --- Bond math utilities ---

interface BondParams {
  faceValue: number;
  couponRate: number;  // annual, as decimal (e.g. 0.05)
  marketPrice: number;
  yearsToMaturity: number;
  frequency: number;   // 1, 2, or 4
}

interface CashFlowRow {
  period: number;
  date: string;
  coupon: number;
  principal: number;
  totalCF: number;
  pvCF: number;
}

interface BondResults {
  ytm: number;
  currentYield: number;
  macaulayDuration: number;
  modifiedDuration: number;
  convexity: number;
  dv01: number;
  cleanPrice: number;
  cashFlows: CashFlowRow[];
}

/** Calculate bond price given a yield */
function bondPrice(fv: number, couponRate: number, ytm: number, n: number, freq: number): number {
  const c = (couponRate * fv) / freq;
  const y = ytm / freq;
  const periods = n * freq;
  if (Math.abs(y) < 1e-10) {
    // Zero yield edge case
    return c * periods + fv;
  }
  let price = 0;
  for (let t = 1; t <= periods; t++) {
    price += c / Math.pow(1 + y, t);
  }
  price += fv / Math.pow(1 + y, periods);
  return price;
}

/** First derivative of price with respect to yield (for Newton-Raphson) */
function bondPriceDeriv(fv: number, couponRate: number, ytm: number, n: number, freq: number): number {
  const c = (couponRate * fv) / freq;
  const y = ytm / freq;
  const periods = n * freq;
  let deriv = 0;
  for (let t = 1; t <= periods; t++) {
    deriv -= (t / freq) * c / Math.pow(1 + y, t + 1);
  }
  deriv -= (periods / freq) * fv / Math.pow(1 + y, periods + 1);
  return deriv;
}

/** YTM via Newton-Raphson */
function calcYTM(fv: number, couponRate: number, price: number, n: number, freq: number): number | null {
  if (price <= 0 || fv <= 0 || n <= 0) return null;

  // Initial guess: coupon rate adjusted for price
  let y = couponRate > 0 ? couponRate : 0.05;
  if (price < fv) y = couponRate + (fv - price) / (fv * n);
  else if (price > fv) y = couponRate - (price - fv) / (fv * n);

  for (let i = 0; i < 100; i++) {
    const calcPrice = bondPrice(fv, couponRate, y, n, freq);
    const diff = calcPrice - price;
    if (Math.abs(diff) < 0.0001) return y;
    const deriv = bondPriceDeriv(fv, couponRate, y, n, freq);
    if (Math.abs(deriv) < 1e-12) break;
    const newY = y - diff / deriv;
    // Clamp to reasonable range
    y = Math.max(-0.5, Math.min(newY, 2.0));
  }

  // Final check
  const finalDiff = Math.abs(bondPrice(fv, couponRate, y, n, freq) - price);
  return finalDiff < 1 ? y : null;
}

/** Calculate full bond analytics */
function calculateBond(params: BondParams, mode: 'price-to-ytm' | 'ytm-to-price', inputYTM?: number): BondResults | null {
  const { faceValue, couponRate, marketPrice, yearsToMaturity, frequency } = params;
  if (faceValue <= 0 || yearsToMaturity <= 0 || frequency <= 0) return null;

  let ytm: number;
  let price: number;

  if (mode === 'price-to-ytm') {
    if (marketPrice <= 0) return null;
    price = marketPrice;
    const result = calcYTM(faceValue, couponRate, price, yearsToMaturity, frequency);
    if (result === null) return null;
    ytm = result;
  } else {
    if (inputYTM === undefined || inputYTM === null) return null;
    ytm = inputYTM;
    price = bondPrice(faceValue, couponRate, ytm, yearsToMaturity, frequency);
  }

  const periods = yearsToMaturity * frequency;
  const y = ytm / frequency;
  const c = (couponRate * faceValue) / frequency;

  // Current yield
  const annualCoupon = couponRate * faceValue;
  const currentYield = price > 0 ? (annualCoupon / price) : 0;

  // Cash flows, Macaulay duration, convexity
  const cashFlows: CashFlowRow[] = [];
  let macDurNum = 0;
  let convexityNum = 0;
  const today = new Date();

  for (let t = 1; t <= periods; t++) {
    const couponPayment = c;
    const principal = t === periods ? faceValue : 0;
    const totalCF = couponPayment + principal;
    const discFactor = Math.pow(1 + y, t);
    const pvCF = totalCF / discFactor;

    const timeInYears = t / frequency;
    macDurNum += timeInYears * pvCF;
    convexityNum += t * (t + 1) * pvCF;

    // Approximate date
    const monthsAhead = (t / frequency) * 12;
    const cfDate = new Date(today);
    cfDate.setMonth(cfDate.getMonth() + Math.round(monthsAhead));

    cashFlows.push({
      period: t,
      date: cfDate.toISOString().slice(0, 10),
      coupon: couponPayment,
      principal,
      totalCF,
      pvCF,
    });
  }

  const macaulayDuration = price > 0 ? macDurNum / price : 0;
  const modifiedDuration = macaulayDuration / (1 + y);
  const convexity = price > 0 ? convexityNum / (price * Math.pow(1 + y, 2)) : 0;
  const dv01 = modifiedDuration * price * 0.0001;

  return {
    ytm,
    currentYield,
    macaulayDuration,
    modifiedDuration,
    convexity,
    dv01,
    cleanPrice: price,
    cashFlows,
  };
}

// --- Input component ---

function BondInput({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step,
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  step?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-black/40 border border-border/50 focus-within:border-emerald-400/50 transition-colors">
        {prefix && <span className="text-[10px] font-mono text-neutral/40 pl-2">{prefix}</span>}
        <input
          type={type}
          step={step ?? 'any'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent px-2 py-1 text-[11px] font-mono text-gray-200 outline-none w-full min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-[10px] font-mono text-neutral/40 pr-2">{suffix}</span>}
      </div>
    </div>
  );
}

// --- Price Sensitivity Chart (SVG) ---

function PriceSensitivityChart({
  faceValue,
  couponRate,
  currentYTM,
  currentPrice,
  yearsToMaturity,
  frequency,
}: {
  faceValue: number;
  couponRate: number;
  currentYTM: number;
  currentPrice: number;
  yearsToMaturity: number;
  frequency: number;
}) {
  const width = 360;
  const height = 160;
  const pad = { top: 16, right: 20, bottom: 28, left: 50 };

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  // Generate price/yield curve: current yield +/- 3%
  const yieldRange = 0.03;
  const minYield = Math.max(0.001, currentYTM - yieldRange);
  const maxYield = currentYTM + yieldRange;

  const steps = 60;
  const points: { x: number; y: number }[] = [];
  let minP = Infinity;
  let maxP = -Infinity;

  for (let i = 0; i <= steps; i++) {
    const yld = minYield + (maxYield - minYield) * (i / steps);
    const p = bondPrice(faceValue, couponRate, yld, yearsToMaturity, frequency);
    points.push({ x: yld, y: p });
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }

  const pPad = (maxP - minP) * 0.1 || 10;
  const yMin = minP - pPad;
  const yMax = maxP + pPad;

  const scaleX = (v: number) => pad.left + ((v - minYield) / (maxYield - minYield)) * innerW;
  const scaleY = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x).toFixed(1)},${scaleY(p.y).toFixed(1)}`).join(' ');

  // Fill area under curve
  const fillPath = linePath +
    ` L${scaleX(points[points.length - 1].x).toFixed(1)},${(pad.top + innerH).toFixed(1)}` +
    ` L${scaleX(points[0].x).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const curX = scaleX(currentYTM);
  const curY = scaleY(currentPrice);

  // X axis tick values
  const xTicks = [minYield, minYield + (maxYield - minYield) * 0.25, minYield + (maxYield - minYield) * 0.5, minYield + (maxYield - minYield) * 0.75, maxYield];
  // Y axis tick values
  const yTicks = [yMin, yMin + (yMax - yMin) * 0.33, yMin + (yMax - yMin) * 0.67, yMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {xTicks.map((v, i) => (
        <line key={`xg${i}`} x1={scaleX(v)} y1={pad.top} x2={scaleX(v)} y2={pad.top + innerH} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      {yTicks.map((v, i) => (
        <line key={`yg${i}`} x1={pad.left} y1={scaleY(v)} x2={pad.left + innerW} y2={scaleY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}

      {/* Fill under curve */}
      <path d={fillPath} fill="rgba(16,185,129,0.08)" />

      {/* Price/yield curve */}
      <path d={linePath} fill="none" stroke="rgb(16,185,129)" strokeWidth="1.5" />

      {/* Par value line */}
      {faceValue >= yMin && faceValue <= yMax && (
        <>
          <line x1={pad.left} y1={scaleY(faceValue)} x2={pad.left + innerW} y2={scaleY(faceValue)} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={pad.left + innerW + 2} y={scaleY(faceValue) + 3} fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">Par</text>
        </>
      )}

      {/* Current point */}
      <circle cx={curX} cy={curY} r="3.5" fill="rgb(16,185,129)" stroke="rgb(0,0,0)" strokeWidth="1" />
      <line x1={curX} y1={pad.top} x2={curX} y2={pad.top + innerH} stroke="rgba(16,185,129,0.3)" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={pad.left} y1={curY} x2={pad.left + innerW} y2={curY} stroke="rgba(16,185,129,0.3)" strokeWidth="0.5" strokeDasharray="2,2" />

      {/* X axis labels */}
      {xTicks.map((v, i) => (
        <text key={`xl${i}`} x={scaleX(v)} y={height - pad.bottom + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">
          {(v * 100).toFixed(1)}%
        </text>
      ))}
      <text x={pad.left + innerW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">Yield</text>

      {/* Y axis labels */}
      {yTicks.map((v, i) => (
        <text key={`yl${i}`} x={pad.left - 4} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">
          {v.toFixed(0)}
        </text>
      ))}

      {/* Axes */}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    </svg>
  );
}

// --- Main Panel ---

type CalcMode = 'price-to-ytm' | 'ytm-to-price';

export function BondCalcPanel() {
  const t = useT();

  const [faceValueStr, setFaceValueStr] = useState('1000');
  const [couponRateStr, setCouponRateStr] = useState('5.0');
  const [marketPriceStr, setMarketPriceStr] = useState('980');
  const [yearsStr, setYearsStr] = useState('10');
  const [frequency, setFrequency] = useState(2);
  const [mode, setMode] = useState<CalcMode>('price-to-ytm');
  const [ytmInputStr, setYtmInputStr] = useState('5.0');

  const result = useMemo(() => {
    const faceValue = parseFloat(faceValueStr);
    const couponRate = parseFloat(couponRateStr) / 100;
    const marketPrice = parseFloat(marketPriceStr);
    const yearsToMaturity = parseFloat(yearsStr);

    if (isNaN(faceValue) || isNaN(couponRate) || isNaN(yearsToMaturity)) return null;

    const params: BondParams = {
      faceValue,
      couponRate,
      marketPrice: mode === 'price-to-ytm' ? marketPrice : 0,
      yearsToMaturity,
      frequency,
    };

    if (mode === 'price-to-ytm') {
      if (isNaN(marketPrice) || marketPrice <= 0) return null;
      return calculateBond(params, 'price-to-ytm');
    } else {
      const inputYTM = parseFloat(ytmInputStr) / 100;
      if (isNaN(inputYTM)) return null;
      return calculateBond(params, 'ytm-to-price', inputYTM);
    }
  }, [faceValueStr, couponRateStr, marketPriceStr, yearsStr, frequency, mode, ytmInputStr]);

  const freqOptions = [
    { value: 1, label: 'Annual' },
    { value: 2, label: 'Semi-Annual' },
    { value: 4, label: 'Quarterly' },
  ];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">{t('panelBondCalc')}</span>
        </span>
      }
    >
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
          {/* Left: Inputs */}
          <div className="space-y-2">
            <BondInput
              label={t('bcFaceValue')}
              value={faceValueStr}
              onChange={setFaceValueStr}
              prefix="$"
            />

            <BondInput
              label={t('bcCouponRate')}
              value={couponRateStr}
              onChange={setCouponRateStr}
              suffix="%"
              step="0.1"
            />

            {/* Calculate Mode Toggle */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">Mode</label>
              <div className="flex border border-border/50 bg-black/40">
                <button
                  onClick={() => setMode('price-to-ytm')}
                  className={`flex-1 px-2 py-1.5 text-[9px] font-mono font-bold tracking-wider transition-colors ${
                    mode === 'price-to-ytm'
                      ? 'bg-emerald-500/20 text-emerald-400 border-r border-border/50'
                      : 'text-neutral/40 hover:text-neutral/60 border-r border-border/50'
                  }`}
                >
                  Price &rarr; YTM
                </button>
                <button
                  onClick={() => setMode('ytm-to-price')}
                  className={`flex-1 px-2 py-1.5 text-[9px] font-mono font-bold tracking-wider transition-colors ${
                    mode === 'ytm-to-price'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-neutral/40 hover:text-neutral/60'
                  }`}
                >
                  YTM &rarr; Price
                </button>
              </div>
            </div>

            {mode === 'price-to-ytm' ? (
              <BondInput
                label={t('bcMarketPrice')}
                value={marketPriceStr}
                onChange={setMarketPriceStr}
                prefix="$"
              />
            ) : (
              <BondInput
                label={t('bcYTM')}
                value={ytmInputStr}
                onChange={setYtmInputStr}
                suffix="%"
                step="0.1"
              />
            )}

            <BondInput
              label={t('bcMaturity')}
              value={yearsStr}
              onChange={setYearsStr}
              step="0.5"
            />

            {/* Frequency selector */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{t('bcFrequency')}</label>
              <div className="flex border border-border/50 bg-black/40">
                {freqOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFrequency(opt.value)}
                    className={`flex-1 px-2 py-1.5 text-[9px] font-mono transition-colors ${
                      frequency === opt.value
                        ? 'bg-emerald-400/20 text-emerald-400'
                        : 'text-neutral/40 hover:text-neutral/60'
                    } ${opt.value < 4 ? 'border-r border-border/50' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-3">
            {/* Yield Metrics */}
            <div className="bg-black/30 border border-border/30 p-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Yield Metrics</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('bcYTM')}</div>
                  <div className="text-xl font-mono font-bold text-emerald-400">
                    {result ? `${(result.ytm * 100).toFixed(3)}%` : '\u2014'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('bcCurrentYield')}</div>
                  <div className="text-xl font-mono font-bold text-emerald-300">
                    {result ? `${(result.currentYield * 100).toFixed(3)}%` : '\u2014'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('bcCouponRate')}</div>
                  <div className="text-xl font-mono font-bold text-emerald-200/70">
                    {couponRateStr ? `${parseFloat(couponRateStr).toFixed(3)}%` : '\u2014'}
                  </div>
                </div>
              </div>
              {mode === 'ytm-to-price' && result && (
                <div className="mt-2 pt-2 border-t border-border/20">
                  <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('bcMarketPrice')}</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">
                    ${result.cleanPrice.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Risk Metrics */}
            <div className="bg-black/30 border border-border/30 p-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Risk Metrics</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-mono text-neutral/50">{t('bcDuration')}</span>
                  <span className="text-[12px] font-mono font-bold text-blue-400">
                    {result ? `${result.macaulayDuration.toFixed(4)} yrs` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-mono text-neutral/50">{t('bcModDuration')}</span>
                  <span className="text-[12px] font-mono font-bold text-purple-400">
                    {result ? result.modifiedDuration.toFixed(4) : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-mono text-neutral/50">{t('bcConvexity')}</span>
                  <span className="text-[12px] font-mono font-bold text-cyan-400">
                    {result ? result.convexity.toFixed(4) : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-mono text-neutral/50">{t('bcDV01')}</span>
                  <span className="text-[12px] font-mono font-bold text-orange-400">
                    {result ? `$${result.dv01.toFixed(4)}` : '\u2014'}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Sensitivity Chart */}
            {result && (
              <div className="bg-black/30 border border-border/30 p-2">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{t('bcPriceSensitivity')}</div>
                <PriceSensitivityChart
                  faceValue={parseFloat(faceValueStr) || 1000}
                  couponRate={parseFloat(couponRateStr) / 100 || 0}
                  currentYTM={result.ytm}
                  currentPrice={result.cleanPrice}
                  yearsToMaturity={parseFloat(yearsStr) || 10}
                  frequency={frequency}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cash Flow Table */}
        {result && result.cashFlows.length > 0 && (
          <div className="mt-3 bg-black/30 border border-border/30 p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">{t('bcCashFlows')}</div>
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-[9px] font-mono border-collapse">
                <thead className="sticky top-0 bg-black/80 z-10">
                  <tr>
                    <th className="text-neutral/40 text-left p-1 border-b border-border/20">#</th>
                    <th className="text-neutral/40 text-left p-1 border-b border-border/20">Date</th>
                    <th className="text-neutral/40 text-right p-1 border-b border-border/20">Coupon</th>
                    <th className="text-neutral/40 text-right p-1 border-b border-border/20">Principal</th>
                    <th className="text-neutral/40 text-right p-1 border-b border-border/20">Total CF</th>
                    <th className="text-neutral/40 text-right p-1 border-b border-border/20">PV of CF</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cashFlows.map((cf, i) => (
                    <tr key={cf.period} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="text-neutral/50 p-1 border-b border-border/10">{cf.period}</td>
                      <td className="text-neutral/60 p-1 border-b border-border/10">{cf.date}</td>
                      <td className="text-emerald-400/70 text-right p-1 border-b border-border/10">{cf.coupon.toFixed(2)}</td>
                      <td className={`text-right p-1 border-b border-border/10 ${cf.principal > 0 ? 'text-amber-400' : 'text-neutral/30'}`}>
                        {cf.principal > 0 ? cf.principal.toFixed(2) : '\u2014'}
                      </td>
                      <td className="text-gray-200 text-right p-1 border-b border-border/10">{cf.totalCF.toFixed(2)}</td>
                      <td className="text-blue-400/70 text-right p-1 border-b border-border/10">{cf.pvCF.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
