import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useAppStore } from '../../stores/use-app-store';
import { useStockDetail } from '../../api/hooks/use-stocks';
import { useT } from '../../i18n';
import { Calculator } from 'lucide-react';

// --- Black-Scholes math utilities ---

/** Standard normal PDF */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF using rational approximation
 * (Abramowitz and Stegun, formula 26.2.17)
 */
function normalCDF(x: number): number {
  if (x < -10) return 0;
  if (x > 10) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  const y = 1.0 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  d1: number;
  d2: number;
}

function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  isCall: boolean,
): BSResult | null {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) return null;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalCDF(d1);
  const nd2 = normalCDF(d2);
  const nNegd1 = normalCDF(-d1);
  const nNegd2 = normalCDF(-d2);
  const phiD1 = normalPDF(d1);
  const expRT = Math.exp(-r * T);

  let price: number;
  let delta: number;
  let rho: number;
  let thetaVal: number;

  if (isCall) {
    price = S * nd1 - K * expRT * nd2;
    delta = nd1;
    thetaVal = -(S * phiD1 * sigma) / (2 * sqrtT) - r * K * expRT * nd2;
    rho = K * T * expRT * nd2 / 100;
  } else {
    price = K * expRT * nNegd2 - S * nNegd1;
    delta = nd1 - 1;
    thetaVal = -(S * phiD1 * sigma) / (2 * sqrtT) + r * K * expRT * nNegd2;
    rho = -K * T * expRT * nNegd2 / 100;
  }

  const gamma = phiD1 / (S * sigma * sqrtT);
  const vega = S * phiD1 * sqrtT / 100;

  // Theta per calendar day
  const theta = thetaVal / 365;

  if (!isFinite(price) || isNaN(price)) return null;

  return { price, delta, gamma, theta, vega, rho, d1, d2 };
}

// --- Utility components ---

function InputField({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-black/40 border border-border/50 focus-within:border-amber-400/50 transition-colors">
        {prefix && <span className="text-[10px] font-mono text-neutral/40 pl-2">{prefix}</span>}
        <input
          type="number"
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

type ExpiryUnit = 'days' | 'months' | 'years';

function toYears(value: number, unit: ExpiryUnit): number {
  switch (unit) {
    case 'days': return value / 365;
    case 'months': return value / 12;
    case 'years': return value;
  }
}

// --- SVG Payoff Diagram ---

function PayoffDiagram({
  K,
  premium,
  isCall,
}: {
  K: number;
  premium: number;
  isCall: boolean;
}) {
  const width = 300;
  const height = 120;
  const pad = { top: 12, right: 16, bottom: 20, left: 36 };

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const minS = K * 0.5;
  const maxS = K * 1.5;

  const breakeven = isCall ? K + premium : K - premium;

  // Calculate payoff at expiry for a range of stock prices
  const steps = 80;
  const points: { x: number; y: number }[] = [];
  let minY = 0;
  let maxY = 0;

  for (let i = 0; i <= steps; i++) {
    const s = minS + (maxS - minS) * (i / steps);
    let pnl: number;
    if (isCall) {
      pnl = Math.max(s - K, 0) - premium;
    } else {
      pnl = Math.max(K - s, 0) - premium;
    }
    points.push({ x: s, y: pnl });
    if (pnl < minY) minY = pnl;
    if (pnl > maxY) maxY = pnl;
  }

  // Add some vertical padding
  const yRange = Math.max(maxY - minY, premium * 2, 1);
  const yPad = yRange * 0.15;
  const yMin = minY - yPad;
  const yMax = maxY + yPad;

  const scaleX = (v: number) => pad.left + ((v - minS) / (maxS - minS)) * innerW;
  const scaleY = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const zeroY = scaleY(0);

  // Build the path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x).toFixed(1)},${scaleY(p.y).toFixed(1)}`).join(' ');

  // Fill areas above and below zero
  const greenParts: string[] = [];
  const redParts: string[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const x1 = scaleX(p1.x);
    const x2 = scaleX(p2.x);
    const y1 = scaleY(p1.y);
    const y2 = scaleY(p2.y);

    if (p1.y >= 0 && p2.y >= 0) {
      greenParts.push(`M${x1.toFixed(1)},${zeroY.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x2.toFixed(1)},${zeroY.toFixed(1)} Z`);
    } else if (p1.y <= 0 && p2.y <= 0) {
      redParts.push(`M${x1.toFixed(1)},${zeroY.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x2.toFixed(1)},${zeroY.toFixed(1)} Z`);
    } else {
      // Crossing zero: split at the crossing point
      const ratio = Math.abs(p1.y) / (Math.abs(p1.y) + Math.abs(p2.y));
      const cx = x1 + (x2 - x1) * ratio;
      if (p1.y > 0) {
        greenParts.push(`M${x1.toFixed(1)},${zeroY.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${cx.toFixed(1)},${zeroY.toFixed(1)} Z`);
        redParts.push(`M${cx.toFixed(1)},${zeroY.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x2.toFixed(1)},${zeroY.toFixed(1)} Z`);
      } else {
        redParts.push(`M${x1.toFixed(1)},${zeroY.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} L${cx.toFixed(1)},${zeroY.toFixed(1)} Z`);
        greenParts.push(`M${cx.toFixed(1)},${zeroY.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x2.toFixed(1)},${zeroY.toFixed(1)} Z`);
      }
    }
  }

  const beX = scaleX(Math.max(minS, Math.min(maxS, breakeven)));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Green fill (profit) */}
      {greenParts.length > 0 && (
        <path d={greenParts.join(' ')} fill="rgba(34,197,94,0.15)" />
      )}
      {/* Red fill (loss) */}
      {redParts.length > 0 && (
        <path d={redParts.join(' ')} fill="rgba(239,68,68,0.15)" />
      )}
      {/* Zero line */}
      <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />
      {/* Payoff line */}
      <path d={linePath} fill="none" stroke="rgb(251,191,36)" strokeWidth="1.5" />
      {/* Strike line */}
      <line x1={scaleX(K)} y1={pad.top} x2={scaleX(K)} y2={height - pad.bottom} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
      <text x={scaleX(K)} y={pad.top - 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">K</text>
      {/* Breakeven line */}
      {breakeven > minS && breakeven < maxS && (
        <>
          <line x1={beX} y1={pad.top} x2={beX} y2={height - pad.bottom} stroke="rgba(251,191,36,0.4)" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x={beX} y={height - pad.bottom + 10} textAnchor="middle" fill="rgb(251,191,36)" fontSize="7" fontFamily="monospace">BE</text>
        </>
      )}
      {/* X axis labels */}
      <text x={pad.left} y={height - 2} fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">{minS.toFixed(0)}</text>
      <text x={width - pad.right} y={height - 2} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">{maxS.toFixed(0)}</text>
      <text x={pad.left + innerW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">{K.toFixed(0)}</text>
      {/* Y axis labels */}
      <text x={pad.left - 4} y={scaleY(maxY)} textAnchor="end" fill="rgba(34,197,94,0.6)" fontSize="7" fontFamily="monospace">{maxY.toFixed(1)}</text>
      <text x={pad.left - 4} y={scaleY(minY)} textAnchor="end" fill="rgba(239,68,68,0.6)" fontSize="7" fontFamily="monospace">{minY.toFixed(1)}</text>
      <text x={pad.left - 4} y={zeroY + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">0</text>
    </svg>
  );
}

// --- Sensitivity Table ---

function SensitivityTable({
  S,
  K,
  T,
  r,
  sigma,
  isCall,
  currentPrice,
}: {
  S: number;
  K: number;
  T: number;
  r: number;
  sigma: number;
  isCall: boolean;
  currentPrice: number;
}) {
  const stockOffsets = [-0.05, -0.025, 0, 0.025, 0.05];
  const ivOffsets = [-0.10, -0.05, 0, 0.05, 0.10];

  const rows = stockOffsets.map((so) => {
    const stockPrice = S * (1 + so);
    return {
      stockPrice,
      offset: so,
      cells: ivOffsets.map((ivo) => {
        const iv = sigma + ivo;
        if (iv <= 0) return null;
        const res = blackScholes(stockPrice, K, T, r, iv, isCall);
        return res?.price ?? null;
      }),
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono border-collapse">
        <thead>
          <tr>
            <th className="text-neutral/40 text-left p-1 border-b border-border/20">S \ IV</th>
            {ivOffsets.map((ivo) => (
              <th key={ivo} className={`text-right p-1 border-b border-border/20 ${ivo === 0 ? 'text-amber-400' : 'text-neutral/40'}`}>
                {ivo === 0 ? `${(sigma * 100).toFixed(0)}%` : `${ivo > 0 ? '+' : ''}${(ivo * 100).toFixed(0)}pp`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.offset}>
              <td className={`p-1 border-b border-border/10 ${row.offset === 0 ? 'text-amber-400' : 'text-neutral/50'}`}>
                {row.offset === 0 ? row.stockPrice.toFixed(2) : `${row.offset > 0 ? '+' : ''}${(row.offset * 100).toFixed(1)}%`}
              </td>
              {row.cells.map((val, ci) => {
                const isCurrent = row.offset === 0 && ivOffsets[ci] === 0;
                const diff = val !== null ? val - currentPrice : 0;
                let colorCls = 'text-neutral/50';
                if (val !== null && !isCurrent) {
                  colorCls = diff > 0.005 ? 'text-green-400' : diff < -0.005 ? 'text-red-400' : 'text-neutral/50';
                }
                if (isCurrent) colorCls = 'text-amber-400 font-bold';
                return (
                  <td key={ci} className={`text-right p-1 border-b border-border/10 ${colorCls} ${isCurrent ? 'bg-amber-400/5' : ''}`}>
                    {val !== null ? val.toFixed(2) : '\u2014'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Intrinsic / Time Value Bar ---

function ValueBreakdown({
  intrinsic,
  timeValue,
  total,
  t,
}: {
  intrinsic: number;
  timeValue: number;
  total: number;
  t: (k: any) => string;
}) {
  const intrPct = total > 0 ? (intrinsic / total) * 100 : 0;
  const timePct = total > 0 ? (timeValue / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[9px] font-mono">
        <span className="text-neutral/50">{t('opcIntrinsic')}</span>
        <span className="text-amber-400">${intrinsic.toFixed(2)}</span>
        <span className="text-neutral/30">|</span>
        <span className="text-neutral/50">{t('opcTimeValue')}</span>
        <span className="text-cyan-400">${timeValue.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-black/40 border border-border/30 flex overflow-hidden">
        {intrPct > 0 && (
          <div className="bg-amber-400/40 h-full" style={{ width: `${intrPct}%` }} />
        )}
        {timePct > 0 && (
          <div className="bg-cyan-400/30 h-full" style={{ width: `${timePct}%` }} />
        )}
      </div>
    </div>
  );
}

// --- Main Panel ---

export function OptionsCalcPanel() {
  const t = useT();
  const selectedSymbol = useAppStore((s) => s.selectedSymbol);
  const { data: stockData } = useStockDetail(selectedSymbol);

  const currentStockPrice = stockData?.quote?.price;

  const [stockPriceStr, setStockPriceStr] = useState('');
  const [strikePriceStr, setStrikePriceStr] = useState('');
  const [expiryStr, setExpiryStr] = useState('30');
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>('days');
  const [riskFreeStr, setRiskFreeStr] = useState('4.5');
  const [ivStr, setIvStr] = useState('30');
  const [isCall, setIsCall] = useState(true);

  // Auto-populate stock price from selected symbol
  const effectiveStockPrice = stockPriceStr !== '' ? stockPriceStr : (currentStockPrice ? currentStockPrice.toFixed(2) : '');

  const handleStockPriceChange = useCallback((v: string) => {
    setStockPriceStr(v);
  }, []);

  const result = useMemo(() => {
    const S = parseFloat(effectiveStockPrice);
    const K = parseFloat(strikePriceStr);
    const expiryVal = parseFloat(expiryStr);
    const r = parseFloat(riskFreeStr) / 100;
    const sigma = parseFloat(ivStr) / 100;

    if (!S || !K || !expiryVal || isNaN(r) || !sigma) return null;
    if (S <= 0 || K <= 0 || expiryVal <= 0 || sigma <= 0) return null;

    const T = toYears(expiryVal, expiryUnit);
    if (T <= 0) return null;

    const bs = blackScholes(S, K, T, r, sigma, isCall);
    if (!bs) return null;

    const intrinsic = isCall ? Math.max(S - K, 0) : Math.max(K - S, 0);
    const timeVal = Math.max(bs.price - intrinsic, 0);
    const breakeven = isCall ? K + bs.price : K - bs.price;

    return {
      ...bs,
      S,
      K,
      T,
      r,
      sigma,
      intrinsic,
      timeVal,
      breakeven,
    };
  }, [effectiveStockPrice, strikePriceStr, expiryStr, expiryUnit, riskFreeStr, ivStr, isCall]);

  const greeks = [
    { label: 'Delta', value: result?.delta, color: 'text-blue-400', fmt: (v: number) => v.toFixed(4) },
    { label: 'Gamma', value: result?.gamma, color: 'text-purple-400', fmt: (v: number) => v.toFixed(4) },
    { label: 'Theta', value: result?.theta, color: 'text-red-400', fmt: (v: number) => v.toFixed(4) },
    { label: 'Vega', value: result?.vega, color: 'text-green-400', fmt: (v: number) => v.toFixed(4) },
    { label: 'Rho', value: result?.rho, color: 'text-orange-400', fmt: (v: number) => v.toFixed(4) },
  ];

  const unitOptions: { value: ExpiryUnit; label: string }[] = [
    { value: 'days', label: 'D' },
    { value: 'months', label: 'M' },
    { value: 'years', label: 'Y' },
  ];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400">{t('panelOptionsCalc')}</span>
        </span>
      }
    >
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
          {/* Left: Inputs */}
          <div className="space-y-2">
            <InputField
              label={t('opcStockPrice')}
              value={effectiveStockPrice}
              onChange={handleStockPriceChange}
              prefix="$"
            />
            {selectedSymbol && currentStockPrice && stockPriceStr === '' && (
              <div className="text-[8px] font-mono text-amber-400/60 -mt-1">
                {selectedSymbol} @ ${currentStockPrice.toFixed(2)}
              </div>
            )}

            <InputField
              label={t('opcStrikePrice')}
              value={strikePriceStr}
              onChange={setStrikePriceStr}
              prefix="$"
            />

            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{t('opcExpiry')}</label>
              <div className="flex items-center gap-1">
                <div className="flex-1 flex items-center bg-black/40 border border-border/50 focus-within:border-amber-400/50 transition-colors">
                  <input
                    type="number"
                    step="any"
                    value={expiryStr}
                    onChange={(e) => setExpiryStr(e.target.value)}
                    className="flex-1 bg-transparent px-2 py-1 text-[11px] font-mono text-gray-200 outline-none w-full min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex border border-border/50 bg-black/40">
                  {unitOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExpiryUnit(opt.value)}
                      className={`px-2 py-1 text-[9px] font-mono transition-colors ${
                        expiryUnit === opt.value
                          ? 'bg-amber-400/20 text-amber-400'
                          : 'text-neutral/40 hover:text-neutral/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <InputField
              label={t('opcRiskFree')}
              value={riskFreeStr}
              onChange={setRiskFreeStr}
              suffix="%"
              step="0.1"
            />

            <InputField
              label={t('opcIV')}
              value={ivStr}
              onChange={setIvStr}
              suffix="%"
              step="1"
            />

            {/* Call/Put toggle */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">Type</label>
              <div className="flex border border-border/50 bg-black/40">
                <button
                  onClick={() => setIsCall(true)}
                  className={`flex-1 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-colors ${
                    isCall
                      ? 'bg-green-500/20 text-green-400 border-r border-border/50'
                      : 'text-neutral/40 hover:text-neutral/60 border-r border-border/50'
                  }`}
                >
                  {t('opcCall')}
                </button>
                <button
                  onClick={() => setIsCall(false)}
                  className={`flex-1 px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-colors ${
                    !isCall
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-neutral/40 hover:text-neutral/60'
                  }`}
                >
                  {t('opcPut')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-3">
            {/* Option Price */}
            <div className="bg-black/30 border border-border/30 p-3">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{t('opcPrice')}</div>
              <div className="text-2xl font-mono font-bold text-amber-400">
                {result ? `$${result.price.toFixed(4)}` : '\u2014'}
              </div>
              {result && (
                <div className="text-[9px] font-mono text-neutral/40 mt-1">
                  {t('opcBreakeven')}: ${result.breakeven.toFixed(2)}
                </div>
              )}
            </div>

            {/* Greeks */}
            <div className="bg-black/30 border border-border/30 p-2">
              <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">{t('opcGreeks')}</div>
              <div className="grid grid-cols-5 gap-1">
                {greeks.map((g) => (
                  <div key={g.label} className="text-center">
                    <div className={`text-[8px] font-mono uppercase ${g.color} opacity-70`}>{g.label}</div>
                    <div className={`text-[11px] font-mono font-bold ${g.color}`}>
                      {g.value !== undefined && g.value !== null ? g.fmt(g.value) : '\u2014'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intrinsic vs Time Value */}
            {result && (
              <div className="bg-black/30 border border-border/30 p-2">
                <ValueBreakdown
                  intrinsic={result.intrinsic}
                  timeValue={result.timeVal}
                  total={result.price}
                  t={t}
                />
              </div>
            )}

            {/* Payoff Diagram */}
            {result && (
              <div className="bg-black/30 border border-border/30 p-2">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{t('opcPayoff')}</div>
                <PayoffDiagram K={result.K} premium={result.price} isCall={isCall} />
              </div>
            )}
          </div>
        </div>

        {/* Sensitivity Table */}
        {result && (
          <div className="mt-3 bg-black/30 border border-border/30 p-2">
            <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">{t('opcSensitivity')}</div>
            <SensitivityTable
              S={result.S}
              K={result.K}
              T={result.T}
              r={result.r}
              sigma={result.sigma}
              isCall={isCall}
              currentPrice={result.price}
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
