import { useState, useMemo } from 'react';
import { useT } from '../../i18n';
import { TrendingUp } from 'lucide-react';

type Tab = 'compound' | 'cagr' | 'dca';

export function InvestmentCalcPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('compound');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {t('panelInvestCalc')}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 shrink-0">
        {(['compound', 'cagr', 'dca'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider transition-colors ${
              tab === key ? 'text-emerald-400 border-b border-emerald-400 bg-emerald-400/5' : 'text-neutral/40 hover:text-neutral/60'
            }`}
          >
            {t(key === 'compound' ? 'invCompound' : key === 'cagr' ? 'invCAGR' : 'invDCA')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar p-3">
        {tab === 'compound' && <CompoundTab />}
        {tab === 'cagr' && <CAGRTab />}
        {tab === 'dca' && <DCATab />}
      </div>
    </div>
  );
}

function CompoundTab() {
  const t = useT();
  const [principal, setPrincipal] = useState('10000');
  const [monthly, setMonthly] = useState('500');
  const [rate, setRate] = useState('8');
  const [years, setYears] = useState('20');
  const [compound, setCompound] = useState<'12' | '4' | '1'>('12');

  const result = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const PMT = parseFloat(monthly) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const n = parseInt(compound);
    const yr = parseFloat(years) || 0;
    const rn = r / n;
    const nt = n * yr;

    // FV of lump sum: P * (1 + r/n)^(nt)
    const fvLump = P * Math.pow(1 + rn, nt);
    // FV of annuity: PMT * [((1 + r/n)^(nt) - 1) / (r/n)]
    const fvAnnuity = rn > 0 ? PMT * ((Math.pow(1 + rn, nt) - 1) / rn) : PMT * nt;
    const total = fvLump + fvAnnuity;
    const totalContributed = P + PMT * n * yr;
    const totalInterest = total - totalContributed;

    // Year-by-year breakdown for chart
    const breakdown: { year: number; balance: number; contributions: number }[] = [];
    for (let y = 0; y <= yr; y++) {
      const t = n * y;
      const fv1 = P * Math.pow(1 + rn, t);
      const fv2 = rn > 0 ? PMT * ((Math.pow(1 + rn, t) - 1) / rn) : PMT * t;
      breakdown.push({ year: y, balance: fv1 + fv2, contributions: P + PMT * n * y });
    }

    return { total, totalContributed, totalInterest, breakdown };
  }, [principal, monthly, rate, years, compound]);

  const maxBal = Math.max(...result.breakdown.map(b => b.balance), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <CalcInput label={t('invInitial')} value={principal} onChange={setPrincipal} prefix="$" />
        <CalcInput label={t('invMonthly')} value={monthly} onChange={setMonthly} prefix="$" />
        <CalcInput label={t('invRate')} value={rate} onChange={setRate} suffix="%" />
        <CalcInput label={t('invYears')} value={years} onChange={setYears} suffix="yr" />
      </div>
      <div className="flex gap-1">
        {[['12', 'Monthly'], ['4', 'Quarterly'], ['1', 'Annually']] .map(([val, label]) => (
          <button key={val} onClick={() => setCompound(val as '12' | '4' | '1')}
            className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              compound === val ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/10' : 'border-border/20 text-neutral/30'
            }`}>{label}</button>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/20">
        <ResultBox label={t('invFutureValue')} value={fmtCurrency(result.total)} accent />
        <ResultBox label={t('invContributed')} value={fmtCurrency(result.totalContributed)} />
        <ResultBox label={t('invInterestEarned')} value={fmtCurrency(result.totalInterest)} />
      </div>

      {/* SVG Chart */}
      <div className="mt-2">
        <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">{t('invGrowthChart')}</div>
        <svg viewBox="0 0 300 120" className="w-full">
          {result.breakdown.length > 1 && result.breakdown.map((b, i) => {
            const x = (i / (result.breakdown.length - 1)) * 280 + 10;
            const hBal = (b.balance / maxBal) * 100;
            const hCon = (b.contributions / maxBal) * 100;
            const barW = Math.max(280 / result.breakdown.length - 1, 2);
            return (
              <g key={i}>
                <rect x={x - barW / 2} y={110 - hBal} width={barW} height={hBal} fill="rgba(16,185,129,0.3)" />
                <rect x={x - barW / 2} y={110 - hCon} width={barW} height={hCon} fill="rgba(16,185,129,0.7)" />
              </g>
            );
          })}
          <line x1="10" y1="110" x2="290" y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        </svg>
        <div className="flex gap-3 mt-1">
          <span className="flex items-center gap-1 text-[7px] font-mono text-neutral/40">
            <span className="w-2 h-2 bg-emerald-500/70 inline-block" /> {t('invContributed')}
          </span>
          <span className="flex items-center gap-1 text-[7px] font-mono text-neutral/40">
            <span className="w-2 h-2 bg-emerald-500/30 inline-block" /> {t('invInterestEarned')}
          </span>
        </div>
      </div>
    </div>
  );
}

function CAGRTab() {
  const t = useT();
  const [beginVal, setBeginVal] = useState('10000');
  const [endVal, setEndVal] = useState('25000');
  const [years, setYears] = useState('5');

  const result = useMemo(() => {
    const bv = parseFloat(beginVal) || 0;
    const ev = parseFloat(endVal) || 0;
    const n = parseFloat(years) || 0;
    if (bv <= 0 || ev <= 0 || n <= 0) return { cagr: 0, totalReturn: 0, multiplier: 0 };
    const cagr = (Math.pow(ev / bv, 1 / n) - 1) * 100;
    const totalReturn = ((ev - bv) / bv) * 100;
    const multiplier = ev / bv;
    return { cagr, totalReturn, multiplier };
  }, [beginVal, endVal, years]);

  // Doubling time: 72 / CAGR
  const doublingTime = result.cagr > 0 ? 72 / result.cagr : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <CalcInput label={t('invBeginVal')} value={beginVal} onChange={setBeginVal} prefix="$" />
        <CalcInput label={t('invEndVal')} value={endVal} onChange={setEndVal} prefix="$" />
        <CalcInput label={t('invYears')} value={years} onChange={setYears} suffix="yr" />
      </div>

      <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/20">
        <ResultBox label="CAGR" value={result.cagr.toFixed(2) + '%'} accent />
        <ResultBox label={t('invTotalReturn')} value={result.totalReturn.toFixed(1) + '%'} />
        <ResultBox label={t('invMultiplier')} value={result.multiplier.toFixed(2) + 'x'} />
        <ResultBox label={t('invDoubling')} value={doublingTime > 0 ? doublingTime.toFixed(1) + ' yr' : '—'} />
      </div>

      {/* Comparison table: What if different rates? */}
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">{t('invWhatIf')}</div>
      <div className="space-y-0.5">
        {[5, 7, 8, 10, 12, 15].map((r) => {
          const bv = parseFloat(beginVal) || 0;
          const n = parseFloat(years) || 0;
          const fv = bv * Math.pow(1 + r / 100, n);
          const isActive = Math.abs(r - result.cagr) < 0.5;
          return (
            <div key={r} className={`flex justify-between px-2 py-0.5 ${isActive ? 'bg-emerald-400/10 text-emerald-400' : 'text-neutral/40'}`}>
              <span className="text-[8px] font-mono font-bold">{r}%</span>
              <span className="text-[8px] font-mono">{fmtCurrency(fv)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DCATab() {
  const t = useT();
  const [amount, setAmount] = useState('500');
  const [months, setMonths] = useState('24');
  const [startPrice, setStartPrice] = useState('150');
  const [endPrice, setEndPrice] = useState('200');
  const [volatility, setVolatility] = useState('20');

  const result = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const m = parseInt(months) || 0;
    const sp = parseFloat(startPrice) || 0;
    const ep = parseFloat(endPrice) || 0;
    const vol = (parseFloat(volatility) || 0) / 100;
    if (amt <= 0 || m <= 0 || sp <= 0 || ep <= 0) return null;

    // Simulate DCA with linear trend + deterministic volatility pattern
    let totalShares = 0;
    let totalInvested = 0;
    const history: { month: number; price: number; shares: number; value: number; costBasis: number }[] = [];

    for (let i = 0; i < m; i++) {
      const progress = i / (m - 1 || 1);
      const trend = sp + (ep - sp) * progress;
      // Use sine wave for deterministic "volatility" pattern
      const noise = trend * vol * Math.sin(i * 1.5) * 0.5;
      const price = Math.max(trend + noise, sp * 0.1);
      const sharesBought = amt / price;
      totalShares += sharesBought;
      totalInvested += amt;
      const costBasis = totalInvested / totalShares;
      history.push({ month: i + 1, price, shares: totalShares, value: totalShares * price, costBasis });
    }

    const finalPrice = history[history.length - 1]?.price ?? ep;
    const finalValue = totalShares * finalPrice;
    const avgCost = totalInvested / totalShares;
    const gainPct = ((finalValue - totalInvested) / totalInvested) * 100;

    // Compare with lump sum
    const lumpShares = (amt * m) / sp;
    const lumpValue = lumpShares * ep;
    const lumpGain = ((lumpValue - amt * m) / (amt * m)) * 100;

    return { totalShares, totalInvested, finalValue, avgCost, gainPct, history, lumpValue, lumpGain };
  }, [amount, months, startPrice, endPrice, volatility]);

  const maxVal = result ? Math.max(...result.history.map(h => Math.max(h.value, h.month * (parseFloat(amount) || 0)))) : 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <CalcInput label={t('invDCAAmount')} value={amount} onChange={setAmount} prefix="$" />
        <CalcInput label={t('invDCAMonths')} value={months} onChange={setMonths} suffix="mo" />
        <CalcInput label={t('invDCAStart')} value={startPrice} onChange={setStartPrice} prefix="$" />
        <CalcInput label={t('invDCAEnd')} value={endPrice} onChange={setEndPrice} prefix="$" />
      </div>
      <CalcInput label={t('invDCAVol')} value={volatility} onChange={setVolatility} suffix="%" />

      {result && (
        <>
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/20">
            <ResultBox label={t('invFutureValue')} value={fmtCurrency(result.finalValue)} accent />
            <ResultBox label={t('invAvgCost')} value={'$' + result.avgCost.toFixed(2)} />
            <ResultBox label={t('invReturn')} value={result.gainPct.toFixed(1) + '%'} />
          </div>

          {/* DCA vs Lump Sum comparison */}
          <div className="flex gap-2">
            <div className="flex-1 border border-emerald-400/20 bg-emerald-400/5 px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral/40 uppercase">DCA</div>
              <div className="text-[10px] font-mono font-bold text-emerald-400">{fmtCurrency(result.finalValue)}</div>
              <div className="text-[7px] font-mono text-neutral/40">{result.gainPct.toFixed(1)}%</div>
            </div>
            <div className="flex-1 border border-border/20 px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral/40 uppercase">{t('invLumpSum')}</div>
              <div className="text-[10px] font-mono font-bold text-white">{fmtCurrency(result.lumpValue)}</div>
              <div className="text-[7px] font-mono text-neutral/40">{result.lumpGain.toFixed(1)}%</div>
            </div>
          </div>

          {/* SVG growth chart */}
          <svg viewBox="0 0 300 100" className="w-full mt-2">
            {result.history.length > 1 && (() => {
              const pts = result.history.map((h, i) => {
                const x = (i / (result.history.length - 1)) * 280 + 10;
                const y = 90 - (h.value / maxVal) * 80;
                return `${x},${y}`;
              });
              const costPts = result.history.map((h, i) => {
                const x = (i / (result.history.length - 1)) * 280 + 10;
                const invested = h.month * (parseFloat(amount) || 0);
                const y = 90 - (invested / maxVal) * 80;
                return `${x},${y}`;
              });
              return (
                <>
                  <polyline points={costPts.join(' ')} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <polyline points={pts.join(' ')} fill="none" stroke="rgba(16,185,129,0.8)" strokeWidth="1.5" />
                </>
              );
            })()}
            <line x1="10" y1="90" x2="290" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          </svg>
        </>
      )}
    </div>
  );
}

function CalcInput({ label, value, onChange, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 mb-0.5">{label}</div>
      <div className="flex items-center">
        {prefix && <span className="text-[8px] font-mono text-neutral/30 mr-0.5">{prefix}</span>}
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black border border-border/30 px-1.5 py-0.5 text-[9px] font-mono text-white placeholder:text-neutral/20" />
        {suffix && <span className="text-[7px] font-mono text-neutral/30 ml-0.5 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function ResultBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`px-2 py-1.5 border ${accent ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-border/20'}`}>
      <div className="text-[7px] font-mono text-neutral/40 uppercase">{label}</div>
      <div className={`text-[10px] font-mono font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function fmtCurrency(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(2);
}
