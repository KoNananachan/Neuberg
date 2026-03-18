import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useT } from '../../i18n';
import { Home, ChevronDown, ChevronRight } from 'lucide-react';

// --- Types ---

interface MortgageInputs {
  homePrice: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
  propertyTax: number;
  insurance: number;
  pmiRate: number;
  extraPayment: number;
}

interface MonthlyBreakdown {
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  total: number;
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface LoanSummary {
  monthlyBreakdown: MonthlyBreakdown;
  totalPaid: number;
  totalInterest: number;
  interestToRatio: number;
  payoffDate: Date;
  totalMonths: number;
  loanAmount: number;
  schedule: AmortRow[];
}

interface ExtraPaymentComparison {
  withoutExtra: { months: number; totalPaid: number; totalInterest: number };
  withExtra: { months: number; totalPaid: number; totalInterest: number };
  monthsSaved: number;
  interestSaved: number;
}

// --- Mortgage math ---

function calcMonthlyPayment(principal: number, monthlyRate: number, totalMonths: number): number {
  if (principal <= 0) return 0;
  if (totalMonths <= 0) return 0;
  // Handle 0% interest rate
  if (monthlyRate <= 0) return principal / totalMonths;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  return principal * (monthlyRate * factor) / (factor - 1);
}

function buildSchedule(
  principal: number,
  monthlyRate: number,
  totalMonths: number,
  extraPayment: number,
): AmortRow[] {
  if (principal <= 0 || totalMonths <= 0) return [];

  const basePayment = calcMonthlyPayment(principal, monthlyRate, totalMonths);
  const rows: AmortRow[] = [];
  let balance = principal;

  for (let m = 1; balance > 0.01; m++) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const basePrincipal = basePayment - interest;
    const totalPrincipal = Math.min(basePrincipal + extraPayment, balance);
    const payment = interest + totalPrincipal;

    balance = Math.max(0, balance - totalPrincipal);
    rows.push({
      month: m,
      payment,
      principal: totalPrincipal,
      interest,
      balance,
    });

    // Safety: prevent infinite loops for edge cases
    if (m > totalMonths * 2 && extraPayment === 0) break;
    if (m > 10000) break;
  }
  return rows;
}

function calculateMortgage(inputs: MortgageInputs): LoanSummary {
  const { homePrice, downPaymentPct, interestRate, termYears, propertyTax, insurance, pmiRate, extraPayment } = inputs;

  const downPayment = homePrice * (downPaymentPct / 100);
  const loanAmount = homePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = termYears * 12;

  const monthlyPI = calcMonthlyPayment(loanAmount, monthlyRate, totalMonths);
  const monthlyTax = propertyTax / 12;
  const monthlyInsurance = insurance / 12;
  const needsPMI = downPaymentPct < 20;
  const monthlyPMI = needsPMI ? (loanAmount * (pmiRate / 100)) / 12 : 0;

  const schedule = buildSchedule(loanAmount, monthlyRate, totalMonths, extraPayment);

  const totalPaid = schedule.reduce((sum, r) => sum + r.payment, 0);
  const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);

  // Add tax/insurance/PMI to total
  const totalTaxIns = schedule.length * (monthlyTax + monthlyInsurance);
  // PMI drops off when equity reaches 20% (balance <= 80% of home price)
  const pmiThreshold = homePrice * 0.80;
  let pmiMonths = 0;
  if (needsPMI) {
    for (const row of schedule) {
      // PMI applies when remaining balance > 80% of home price
      if (row.balance + row.principal > pmiThreshold) {
        pmiMonths++;
      }
    }
  }
  const totalPMI = pmiMonths * monthlyPMI;

  const grandTotalPaid = totalPaid + totalTaxIns + totalPMI;

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + schedule.length);

  return {
    monthlyBreakdown: {
      principalAndInterest: monthlyPI + extraPayment,
      propertyTax: monthlyTax,
      insurance: monthlyInsurance,
      pmi: monthlyPMI,
      total: monthlyPI + extraPayment + monthlyTax + monthlyInsurance + monthlyPMI,
    },
    totalPaid: grandTotalPaid,
    totalInterest,
    interestToRatio: loanAmount > 0 ? totalInterest / loanAmount : 0,
    payoffDate,
    totalMonths: schedule.length,
    loanAmount,
    schedule,
  };
}

function calculateComparison(inputs: MortgageInputs): ExtraPaymentComparison | null {
  if (inputs.extraPayment <= 0) return null;

  const withExtra = calculateMortgage(inputs);
  const withoutExtra = calculateMortgage({ ...inputs, extraPayment: 0 });

  return {
    withoutExtra: {
      months: withoutExtra.totalMonths,
      totalPaid: withoutExtra.totalPaid,
      totalInterest: withoutExtra.totalInterest,
    },
    withExtra: {
      months: withExtra.totalMonths,
      totalPaid: withExtra.totalPaid,
      totalInterest: withExtra.totalInterest,
    },
    monthsSaved: withoutExtra.totalMonths - withExtra.totalMonths,
    interestSaved: withoutExtra.totalInterest - withExtra.totalInterest,
  };
}

// --- Formatting ---

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDec(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// --- Input component ---

function MortgageInput({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step,
  note,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  step?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{label}</label>
      <div className="flex items-center bg-black/40 border border-border/50 focus-within:border-teal-400/50 transition-colors">
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
      {note && <span className="text-[8px] font-mono text-neutral/30">{note}</span>}
    </div>
  );
}

// --- Donut Chart (SVG) ---

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, centerLabel, centerValue }: { segments: DonutSegment[]; centerLabel: string; centerValue: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const innerR = 48;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total <= 0) return null;

  let cumAngle = -Math.PI / 2;
  const paths: React.ReactNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.value <= 0) continue;
    const angle = (seg.value / total) * Math.PI * 2;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)}`,
      `L ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i.toFixed(2)} ${y2i.toFixed(2)}`,
      'Z',
    ].join(' ');

    paths.push(
      <path key={i} d={d} fill={seg.color} opacity={0.85} />
    );

    cumAngle = endAngle;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px] h-auto">
        {paths}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">{centerLabel}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgb(45,212,191)" fontSize="16" fontFamily="monospace" fontWeight="bold">{centerValue}</text>
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: seg.color }} />
            <span className="text-[8px] font-mono text-neutral/50">{seg.label}: ${fmt(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Amortization Chart (SVG) ---

function AmortizationChart({
  schedule,
  extraSchedule,
}: {
  schedule: AmortRow[];
  extraSchedule?: AmortRow[];
}) {
  const width = 500;
  const height = 200;
  const pad = { top: 16, right: 16, bottom: 30, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (schedule.length === 0) return null;

  const maxBalance = schedule[0].balance + schedule[0].principal;
  const maxMonths = schedule.length;
  const displayMaxMonths = extraSchedule ? Math.max(maxMonths, extraSchedule.length) : maxMonths;

  const scaleX = (m: number) => pad.left + (m / displayMaxMonths) * innerW;
  const scaleY = (v: number) => pad.top + (1 - v / maxBalance) * innerH;

  // Downsample for large schedules
  const step = Math.max(1, Math.floor(schedule.length / 120));

  // Build stacked area: principal portion and interest portion of each payment
  // Also build balance line
  const balancePath: string[] = [];
  const principalAreaTop: string[] = [];
  const interestAreaTop: string[] = [];

  for (let i = 0; i < schedule.length; i += step) {
    const row = schedule[i];
    const x = scaleX(row.month);

    // Balance line
    balancePath.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${scaleY(row.balance + row.principal).toFixed(1)}`);

    // Stacked: principal on bottom, interest on top
    const principalY = scaleY(row.principal);
    const totalY = scaleY(row.payment);

    principalAreaTop.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${principalY.toFixed(1)}`);
    interestAreaTop.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${totalY.toFixed(1)}`);
  }

  // Build balance path for display
  const balanceLinePath = schedule
    .filter((_, i) => i % step === 0)
    .map((row, i) => `${i === 0 ? 'M' : 'L'}${scaleX(row.month).toFixed(1)},${scaleY(row.balance).toFixed(1)}`)
    .join(' ');

  // If extra payment overlay
  let extraBalancePath = '';
  if (extraSchedule && extraSchedule.length > 0) {
    const noExtraSchedule = extraSchedule;
    extraBalancePath = noExtraSchedule
      .filter((_, i) => i % step === 0)
      .map((row, i) => `${i === 0 ? 'M' : 'L'}${scaleX(row.month).toFixed(1)},${scaleY(row.balance).toFixed(1)}`)
      .join(' ');
  }

  // X-axis labels (years)
  const yearTicks: number[] = [];
  const yearInterval = displayMaxMonths <= 120 ? 12 : displayMaxMonths <= 240 ? 24 : 60;
  for (let m = 0; m <= displayMaxMonths; m += yearInterval) {
    if (m > 0) yearTicks.push(m);
  }

  // Y-axis labels
  const yTicks: number[] = [];
  const yStep = maxBalance > 0 ? maxBalance / 4 : 1;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(i * yStep);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid */}
      {yearTicks.map((m, i) => (
        <line key={`xg${i}`} x1={scaleX(m)} y1={pad.top} x2={scaleX(m)} y2={pad.top + innerH} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      {yTicks.map((v, i) => (
        <line key={`yg${i}`} x1={pad.left} y1={scaleY(v)} x2={pad.left + innerW} y2={scaleY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}

      {/* Balance area fill */}
      {balanceLinePath && (
        <path
          d={`${balanceLinePath} L${scaleX(schedule[schedule.length - 1].month).toFixed(1)},${scaleY(0).toFixed(1)} L${scaleX(schedule[0].month).toFixed(1)},${scaleY(0).toFixed(1)} Z`}
          fill="rgba(45,212,191,0.08)"
        />
      )}

      {/* Balance line */}
      <path d={balanceLinePath} fill="none" stroke="rgb(45,212,191)" strokeWidth="1.5" />

      {/* Extra payment balance line (original schedule without extra, for comparison) */}
      {extraBalancePath && (
        <path d={extraBalancePath} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4,3" />
      )}

      {/* Payoff marker */}
      {schedule.length > 0 && (
        <circle
          cx={scaleX(schedule[schedule.length - 1].month)}
          cy={scaleY(0)}
          r="3"
          fill="rgb(45,212,191)"
          stroke="black"
          strokeWidth="1"
        />
      )}

      {/* X-axis labels */}
      {yearTicks.map((m, i) => (
        <text key={`xl${i}`} x={scaleX(m)} y={height - pad.bottom + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">
          {Math.round(m / 12)}y
        </text>
      ))}
      <text x={pad.left + innerW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">Years</text>

      {/* Y-axis labels */}
      {yTicks.map((v, i) => (
        <text key={`yl${i}`} x={pad.left - 4} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="monospace">
          ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
        </text>
      ))}

      {/* Axes */}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

      {/* Legend */}
      <line x1={pad.left + innerW - 100} y1={pad.top + 4} x2={pad.left + innerW - 82} y2={pad.top + 4} stroke="rgb(45,212,191)" strokeWidth="1.5" />
      <text x={pad.left + innerW - 78} y={pad.top + 7} fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace">Balance</text>
      {extraBalancePath && (
        <>
          <line x1={pad.left + innerW - 100} y1={pad.top + 16} x2={pad.left + innerW - 82} y2={pad.top + 16} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4,3" />
          <text x={pad.left + innerW - 78} y={pad.top + 19} fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">No Extra</text>
        </>
      )}
    </svg>
  );
}

// --- Amortization Table ---

interface YearSummary {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  endBalance: number;
  months: AmortRow[];
}

function AmortizationTable({ schedule }: { schedule: AmortRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Group by year
  const yearSummaries = useMemo(() => {
    const years: YearSummary[] = [];
    let currentYear: YearSummary | null = null;

    for (const row of schedule) {
      const yearNum = Math.ceil(row.month / 12);
      if (!currentYear || currentYear.year !== yearNum) {
        currentYear = { year: yearNum, totalPayment: 0, totalPrincipal: 0, totalInterest: 0, endBalance: 0, months: [] };
        years.push(currentYear);
      }
      currentYear.totalPayment += row.payment;
      currentYear.totalPrincipal += row.principal;
      currentYear.totalInterest += row.interest;
      currentYear.endBalance = row.balance;
      currentYear.months.push(row);
    }
    return years;
  }, [schedule]);

  const toggleYear = useCallback((year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  if (schedule.length === 0) return null;

  // Totals
  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
  const totalPrincipal = schedule.reduce((s, r) => s + r.principal, 0);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);

  return (
    <div className="bg-black/30 border border-border/30 p-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1 text-[8px] font-mono text-neutral/40 uppercase tracking-wider hover:text-neutral/60 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Amortization Table ({yearSummaries.length} years)
      </button>

      {expanded && (
        <div className="mt-2 overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-[9px] font-mono border-collapse">
            <thead className="sticky top-0 bg-black/90 z-10">
              <tr>
                <th className="text-neutral/40 text-left p-1 border-b border-border/20">Year</th>
                <th className="text-neutral/40 text-left p-1 border-b border-border/20">Month</th>
                <th className="text-neutral/40 text-right p-1 border-b border-border/20">Payment</th>
                <th className="text-neutral/40 text-right p-1 border-b border-border/20">Principal</th>
                <th className="text-neutral/40 text-right p-1 border-b border-border/20">Interest</th>
                <th className="text-neutral/40 text-right p-1 border-b border-border/20">Balance</th>
              </tr>
            </thead>
            <tbody>
              {yearSummaries.map((ys) => {
                const isOpen = expandedYears.has(ys.year);
                return (
                  <YearRow
                    key={ys.year}
                    summary={ys}
                    isOpen={isOpen}
                    onToggle={() => toggleYear(ys.year)}
                  />
                );
              })}
              {/* Totals row */}
              <tr className="bg-teal-500/5 border-t border-teal-500/20">
                <td className="text-teal-400 font-bold p-1" colSpan={2}>TOTAL</td>
                <td className="text-teal-400 font-bold text-right p-1">${fmt(totalPayment)}</td>
                <td className="text-teal-400 font-bold text-right p-1">${fmt(totalPrincipal)}</td>
                <td className="text-teal-400 font-bold text-right p-1">${fmt(totalInterest)}</td>
                <td className="text-teal-400 font-bold text-right p-1">$0</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function YearRow({ summary, isOpen, onToggle }: { summary: YearSummary; isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        className="bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors"
        onClick={onToggle}
      >
        <td className="text-teal-400/70 p-1 border-b border-border/10 flex items-center gap-0.5">
          {isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          Year {summary.year}
        </td>
        <td className="text-neutral/40 p-1 border-b border-border/10">{summary.months.length}mo</td>
        <td className="text-gray-200 text-right p-1 border-b border-border/10">${fmt(summary.totalPayment)}</td>
        <td className="text-emerald-400/70 text-right p-1 border-b border-border/10">${fmt(summary.totalPrincipal)}</td>
        <td className="text-red-400/70 text-right p-1 border-b border-border/10">${fmt(summary.totalInterest)}</td>
        <td className="text-gray-300 text-right p-1 border-b border-border/10">${fmt(summary.endBalance)}</td>
      </tr>
      {isOpen && summary.months.map((row) => (
        <tr key={row.month} className="bg-black/20">
          <td className="text-neutral/30 p-1 border-b border-border/5 pl-5" />
          <td className="text-neutral/50 p-1 border-b border-border/5">{row.month}</td>
          <td className="text-gray-300 text-right p-1 border-b border-border/5">${fmtDec(row.payment)}</td>
          <td className="text-emerald-400/60 text-right p-1 border-b border-border/5">${fmtDec(row.principal)}</td>
          <td className="text-red-400/60 text-right p-1 border-b border-border/5">${fmtDec(row.interest)}</td>
          <td className="text-gray-400 text-right p-1 border-b border-border/5">${fmtDec(row.balance)}</td>
        </tr>
      ))}
    </>
  );
}

// --- Main Panel ---

export function MortgageCalcPanel() {
  const t = useT();

  const [homePriceStr, setHomePriceStr] = useState('500000');
  const [downPaymentStr, setDownPaymentStr] = useState('20');
  const [rateStr, setRateStr] = useState('6.5');
  const [termYears, setTermYears] = useState(30);
  const [taxStr, setTaxStr] = useState('5000');
  const [insuranceStr, setInsuranceStr] = useState('1500');
  const [pmiStr, setPmiStr] = useState('0.5');
  const [extraStr, setExtraStr] = useState('0');

  const inputs = useMemo((): MortgageInputs => ({
    homePrice: parseFloat(homePriceStr) || 0,
    downPaymentPct: parseFloat(downPaymentStr) || 0,
    interestRate: parseFloat(rateStr) || 0,
    termYears,
    propertyTax: parseFloat(taxStr) || 0,
    insurance: parseFloat(insuranceStr) || 0,
    pmiRate: parseFloat(pmiStr) || 0,
    extraPayment: parseFloat(extraStr) || 0,
  }), [homePriceStr, downPaymentStr, rateStr, termYears, taxStr, insuranceStr, pmiStr, extraStr]);

  const result = useMemo(() => {
    if (inputs.homePrice <= 0) return null;
    return calculateMortgage(inputs);
  }, [inputs]);

  const comparison = useMemo(() => {
    if (inputs.homePrice <= 0) return null;
    return calculateComparison(inputs);
  }, [inputs]);

  // For chart comparison: build schedule without extra payment
  const noExtraSchedule = useMemo(() => {
    if (inputs.extraPayment <= 0 || inputs.homePrice <= 0) return undefined;
    const noExtra = calculateMortgage({ ...inputs, extraPayment: 0 });
    return noExtra.schedule;
  }, [inputs]);

  const downPaymentDollars = (inputs.homePrice * inputs.downPaymentPct / 100);
  const loanAmount = inputs.homePrice - downPaymentDollars;
  const needsPMI = inputs.downPaymentPct < 20;

  const termOptions = [
    { value: 15, label: '15 yr' },
    { value: 20, label: '20 yr' },
    { value: 30, label: '30 yr' },
  ];

  // Donut segments
  const donutSegments: DonutSegment[] = result ? [
    { label: 'P&I', value: result.monthlyBreakdown.principalAndInterest, color: 'rgb(45,212,191)' },
    { label: t('mtgTax'), value: result.monthlyBreakdown.propertyTax, color: 'rgb(59,130,246)' },
    { label: t('mtgInsurance'), value: result.monthlyBreakdown.insurance, color: 'rgb(168,85,247)' },
    ...(result.monthlyBreakdown.pmi > 0
      ? [{ label: t('mtgPMI'), value: result.monthlyBreakdown.pmi, color: 'rgb(251,146,60)' }]
      : []),
  ] : [];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-teal-400">{t('panelMortgage')}</span>
        </span>
      }
    >
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3">
          {/* Left: Inputs */}
          <div className="space-y-2">
            <MortgageInput
              label={t('mtgHomePrice')}
              value={homePriceStr}
              onChange={setHomePriceStr}
              prefix="$"
              step="10000"
            />

            <MortgageInput
              label={t('mtgDownPayment')}
              value={downPaymentStr}
              onChange={setDownPaymentStr}
              suffix="%"
              step="1"
              note={`= $${fmt(downPaymentDollars)}`}
            />

            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{t('mtgLoanAmount')}</label>
              <div className="bg-black/40 border border-border/30 px-2 py-1 text-[11px] font-mono text-teal-400 font-bold">
                ${fmt(loanAmount)}
              </div>
            </div>

            <MortgageInput
              label={t('mtgRate')}
              value={rateStr}
              onChange={setRateStr}
              suffix="%"
              step="0.125"
            />

            {/* Term selector */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-mono text-neutral/50 uppercase tracking-wider">{t('mtgTerm')}</label>
              <div className="flex border border-border/50 bg-black/40">
                {termOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTermYears(opt.value)}
                    className={`flex-1 px-2 py-1.5 text-[9px] font-mono font-bold tracking-wider transition-colors ${
                      termYears === opt.value
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'text-neutral/40 hover:text-neutral/60'
                    } ${opt.value < 30 ? 'border-r border-border/50' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <MortgageInput
              label={t('mtgTax')}
              value={taxStr}
              onChange={setTaxStr}
              prefix="$"
              suffix="/yr"
              step="100"
            />

            <MortgageInput
              label={t('mtgInsurance')}
              value={insuranceStr}
              onChange={setInsuranceStr}
              prefix="$"
              suffix="/yr"
              step="100"
            />

            {needsPMI && (
              <MortgageInput
                label={t('mtgPMI')}
                value={pmiStr}
                onChange={setPmiStr}
                suffix="%"
                step="0.1"
                note="Drops off at 20% equity"
              />
            )}

            <MortgageInput
              label={t('mtgExtra')}
              value={extraStr}
              onChange={setExtraStr}
              prefix="$"
              suffix="/mo"
              step="50"
            />
          </div>

          {/* Right: Results */}
          <div className="space-y-3">
            {/* Monthly Payment Breakdown */}
            {result && (
              <div className="bg-black/30 border border-border/30 p-3">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">{t('mtgMonthly')}</div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-2">
                    <div>
                      <div className="text-[8px] font-mono text-neutral/50 uppercase">Total Monthly</div>
                      <div className="text-2xl font-mono font-bold text-teal-400">
                        ${fmtDec(result.monthlyBreakdown.total)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-mono text-neutral/50">P&I</span>
                        <span className="text-[11px] font-mono text-teal-300">${fmtDec(result.monthlyBreakdown.principalAndInterest)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-mono text-neutral/50">{t('mtgTax')}</span>
                        <span className="text-[11px] font-mono text-blue-400">${fmtDec(result.monthlyBreakdown.propertyTax)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-mono text-neutral/50">{t('mtgInsurance')}</span>
                        <span className="text-[11px] font-mono text-purple-400">${fmtDec(result.monthlyBreakdown.insurance)}</span>
                      </div>
                      {result.monthlyBreakdown.pmi > 0 && (
                        <div className="flex justify-between items-baseline">
                          <span className="text-[9px] font-mono text-neutral/50">{t('mtgPMI')}</span>
                          <span className="text-[11px] font-mono text-orange-400">${fmtDec(result.monthlyBreakdown.pmi)}</span>
                        </div>
                      )}
                    </div>
                    {result.monthlyBreakdown.pmi > 0 && (
                      <div className="text-[8px] font-mono text-orange-400/50 mt-1">
                        PMI drops off when equity reaches 20%
                      </div>
                    )}
                  </div>
                  {/* Donut */}
                  <DonutChart
                    segments={donutSegments}
                    centerLabel="MONTHLY"
                    centerValue={`$${fmt(result.monthlyBreakdown.total)}`}
                  />
                </div>
              </div>
            )}

            {/* Loan Summary */}
            {result && (
              <div className="bg-black/30 border border-border/30 p-3">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Loan Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('mtgTotalPaid')}</div>
                    <div className="text-base font-mono font-bold text-gray-200">${fmt(result.totalPaid)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('mtgTotalInterest')}</div>
                    <div className="text-base font-mono font-bold text-red-400">${fmt(result.totalInterest)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-neutral/50 uppercase">Interest / Principal</div>
                    <div className="text-base font-mono font-bold text-amber-400">{fmtDec(result.interestToRatio, 2)}x</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-neutral/50 uppercase">{t('mtgPayoff')}</div>
                    <div className="text-base font-mono font-bold text-teal-300">
                      {fmtDate(result.payoffDate)}
                      <span className="text-[9px] text-neutral/40 ml-1">({Math.ceil(result.totalMonths / 12)}y)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Table (if extra payment > 0) */}
            {comparison && (
              <div className="bg-black/30 border border-border/30 p-3">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-2">Extra Payment Impact</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px] font-mono border-collapse">
                    <thead>
                      <tr>
                        <th className="text-neutral/40 text-left p-1 border-b border-border/20" />
                        <th className="text-neutral/40 text-right p-1 border-b border-border/20">Term</th>
                        <th className="text-neutral/40 text-right p-1 border-b border-border/20">{t('mtgTotalPaid')}</th>
                        <th className="text-neutral/40 text-right p-1 border-b border-border/20">{t('mtgTotalInterest')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white/[0.02]">
                        <td className="text-neutral/50 p-1 border-b border-border/10">Without Extra</td>
                        <td className="text-gray-300 text-right p-1 border-b border-border/10">{Math.ceil(comparison.withoutExtra.months / 12)}y {comparison.withoutExtra.months % 12}mo</td>
                        <td className="text-gray-300 text-right p-1 border-b border-border/10">${fmt(comparison.withoutExtra.totalPaid)}</td>
                        <td className="text-red-400/70 text-right p-1 border-b border-border/10">${fmt(comparison.withoutExtra.totalInterest)}</td>
                      </tr>
                      <tr>
                        <td className="text-teal-400 p-1 border-b border-border/10">With Extra</td>
                        <td className="text-teal-300 text-right p-1 border-b border-border/10">{Math.ceil(comparison.withExtra.months / 12)}y {comparison.withExtra.months % 12}mo</td>
                        <td className="text-teal-300 text-right p-1 border-b border-border/10">${fmt(comparison.withExtra.totalPaid)}</td>
                        <td className="text-emerald-400 text-right p-1 border-b border-border/10">${fmt(comparison.withExtra.totalInterest)}</td>
                      </tr>
                      <tr className="bg-teal-500/5 border-t border-teal-500/20">
                        <td className="text-teal-400 font-bold p-1">{t('mtgSaved')}</td>
                        <td className="text-teal-400 font-bold text-right p-1">{comparison.monthsSaved}mo</td>
                        <td className="text-teal-400 font-bold text-right p-1">${fmt(comparison.withoutExtra.totalPaid - comparison.withExtra.totalPaid)}</td>
                        <td className="text-emerald-400 font-bold text-right p-1">${fmt(comparison.interestSaved)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Amortization Chart */}
            {result && result.schedule.length > 0 && (
              <div className="bg-black/30 border border-border/30 p-2">
                <div className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1">{t('mtgAmortization')}</div>
                <AmortizationChart
                  schedule={result.schedule}
                  extraSchedule={noExtraSchedule}
                />
              </div>
            )}
          </div>
        </div>

        {/* Amortization Table (collapsed by default) */}
        {result && result.schedule.length > 0 && (
          <div className="mt-3">
            <AmortizationTable schedule={result.schedule} />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
