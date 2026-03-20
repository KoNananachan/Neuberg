import { useState, useMemo, useCallback } from 'react';
import { useT, tr, TFn } from '../../i18n';
import { PieChart, Plus, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Holding {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
}

// ---------------------------------------------------------------------------
// Hardcoded market data (current prices & betas for top stocks)
// ---------------------------------------------------------------------------

const STOCK_DATA: Record<string, { price: number; beta: number; annualReturn: number; annualVol: number }> = {
  AAPL:  { price: 227.50, beta: 1.20, annualReturn: 0.28, annualVol: 0.24 },
  MSFT:  { price: 420.80, beta: 0.90, annualReturn: 0.32, annualVol: 0.22 },
  GOOGL: { price: 175.30, beta: 1.06, annualReturn: 0.25, annualVol: 0.26 },
  NVDA:  { price: 138.00, beta: 1.65, annualReturn: 0.55, annualVol: 0.48 },
  AMZN:  { price: 208.40, beta: 1.15, annualReturn: 0.30, annualVol: 0.28 },
  META:  { price: 610.20, beta: 1.22, annualReturn: 0.42, annualVol: 0.35 },
  TSLA:  { price: 255.30, beta: 2.05, annualReturn: 0.18, annualVol: 0.55 },
  JPM:   { price: 245.60, beta: 1.10, annualReturn: 0.22, annualVol: 0.22 },
  V:     { price: 340.10, beta: 0.95, annualReturn: 0.20, annualVol: 0.18 },
  JNJ:   { price: 162.40, beta: 0.55, annualReturn: 0.08, annualVol: 0.14 },
  WMT:   { price: 92.50,  beta: 0.52, annualReturn: 0.15, annualVol: 0.16 },
  XOM:   { price: 108.20, beta: 0.80, annualReturn: 0.12, annualVol: 0.25 },
  BRK:   { price: 485.00, beta: 0.60, annualReturn: 0.18, annualVol: 0.16 },
  UNH:   { price: 520.30, beta: 0.70, annualReturn: 0.16, annualVol: 0.20 },
  SPY:   { price: 570.00, beta: 1.00, annualReturn: 0.12, annualVol: 0.15 },
};

const DEFAULT_BETA = 1.0;
const DEFAULT_VOL = 0.25;
const DEFAULT_RETURN = 0.10;
const RISK_FREE_RATE = 0.045;

const DONUT_COLORS = [
  '#818cf8', // indigo-400
  '#6366f1', // indigo-500
  '#a78bfa', // violet-400
  '#c084fc', // purple-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#facc15', // yellow-400
  '#34d399', // emerald-400
  '#22d3ee', // cyan-400
  '#60a5fa', // blue-400
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function getStockData(symbol: string) {
  const upper = symbol.toUpperCase().replace(/\s/g, '');
  return STOCK_DATA[upper] ?? null;
}

function fmtCurrency(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

// Translated string helper — keys don't exist yet so we cast and provide fallback
// ---------------------------------------------------------------------------
// Default portfolio
// ---------------------------------------------------------------------------

function defaultHoldings(): Holding[] {
  return [
    { id: genId(), symbol: 'AAPL',  shares: 50,  avgCost: 185.00 },
    { id: genId(), symbol: 'MSFT',  shares: 30,  avgCost: 350.00 },
    { id: genId(), symbol: 'GOOGL', shares: 40,  avgCost: 140.00 },
    { id: genId(), symbol: 'NVDA',  shares: 25,  avgCost: 95.00 },
    { id: genId(), symbol: 'AMZN',  shares: 20,  avgCost: 170.00 },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PortfolioAnalyticsPanel() {
  const t = useT();
  const [holdings, setHoldings] = useState<Holding[]>(defaultHoldings);

  // Form state
  const [formSymbol, setFormSymbol] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formCost, setFormCost] = useState('');

  const addHolding = useCallback(() => {
    const sym = formSymbol.trim().toUpperCase();
    const shares = parseFloat(formShares);
    const cost = parseFloat(formCost);
    if (!sym || isNaN(shares) || shares <= 0 || isNaN(cost) || cost <= 0) return;
    setHoldings((prev) => [...prev, { id: genId(), symbol: sym, shares, avgCost: cost }]);
    setFormSymbol('');
    setFormShares('');
    setFormCost('');
  }, [formSymbol, formShares, formCost]);

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Metrics computation
  // ---------------------------------------------------------------------------

  const metrics = useMemo(() => {
    if (holdings.length === 0) return null;

    let totalValue = 0;
    let totalCost = 0;

    const enriched = holdings.map((h) => {
      const data = getStockData(h.symbol);
      const price = data?.price ?? h.avgCost; // fallback to cost if unknown
      const beta = data?.beta ?? DEFAULT_BETA;
      const vol = data?.annualVol ?? DEFAULT_VOL;
      const ret = data?.annualReturn ?? DEFAULT_RETURN;
      const value = h.shares * price;
      const cost = h.shares * h.avgCost;
      totalValue += value;
      totalCost += cost;
      return { ...h, price, beta, vol, ret, value, cost };
    });

    const totalPL = totalValue - totalCost;
    const plPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    // Weighted metrics
    let weightedBeta = 0;
    let weightedReturn = 0;
    let weightedVolSq = 0; // simplified: sum(wi^2 * sigma_i^2) — ignores correlation
    let hhi = 0; // Herfindahl-Hirschman Index

    const holdingDetails = enriched.map((h) => {
      const weight = totalValue > 0 ? h.value / totalValue : 0;
      weightedBeta += weight * h.beta;
      weightedReturn += weight * h.ret;
      weightedVolSq += weight * weight * h.vol * h.vol;
      hhi += weight * weight;
      const riskContrib = totalValue > 0 ? (weight * weight * h.vol * h.vol) : 0;
      return { ...h, weight, riskContrib };
    });

    const portfolioVol = Math.sqrt(weightedVolSq);
    const sharpe = portfolioVol > 0 ? (weightedReturn - RISK_FREE_RATE) / portfolioVol : 0;

    // Estimated max drawdown (approximation: -2.5 * annualized vol)
    const maxDrawdown = portfolioVol * -2.5;

    // Diversification score: 1 - HHI, scaled to 0-100
    // HHI of 1 = single stock (score 0), HHI of 1/n = perfect (score 100)
    const n = holdings.length;
    const minHHI = n > 0 ? 1 / n : 1;
    const diversification = n > 1
      ? Math.max(0, Math.min(100, ((1 - hhi) / (1 - minHHI)) * 100))
      : 0;

    // Normalize risk contributions for display
    const totalRiskContrib = holdingDetails.reduce((s, h) => s + h.riskContrib, 0);
    const detailsWithPct = holdingDetails.map((h) => ({
      ...h,
      riskContribPct: totalRiskContrib > 0 ? (h.riskContrib / totalRiskContrib) * 100 : 0,
    }));

    return {
      totalValue,
      totalCost,
      totalPL,
      plPct,
      weightedBeta,
      sharpe,
      maxDrawdown,
      diversification,
      portfolioVol,
      holdings: detailsWithPct,
    };
  }, [holdings]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'pfTitle', 'Portfolio Analytics')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar p-3 space-y-3">
        {/* Input section */}
        <AddHoldingForm
          symbol={formSymbol}
          shares={formShares}
          cost={formCost}
          onSymbolChange={setFormSymbol}
          onSharesChange={setFormShares}
          onCostChange={setFormCost}
          onAdd={addHolding}
        />

        {/* Holdings list */}
        <HoldingsList holdings={holdings} onRemove={removeHolding} />

        {metrics && (
          <>
            {/* Summary metrics */}
            <SummaryMetrics metrics={metrics} />

            {/* Donut chart */}
            <DonutChart holdings={metrics.holdings} />

            {/* Risk grid */}
            <RiskGrid holdings={metrics.holdings} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AddHoldingForm({
  symbol, shares, cost,
  onSymbolChange, onSharesChange, onCostChange, onAdd,
}: {
  symbol: string; shares: string; cost: string;
  onSymbolChange: (v: string) => void;
  onSharesChange: (v: string) => void;
  onCostChange: (v: string) => void;
  onAdd: () => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">
        {tr(t, 'pfAddHolding', 'Add Holding')}
      </div>
      <div className="flex gap-1.5 items-end">
        <CalcInput label={tr(t, 'pfSymbol', 'Symbol')} value={symbol} onChange={onSymbolChange} placeholder="AAPL" />
        <CalcInput label={tr(t, 'pfShares', 'Shares')} value={shares} onChange={onSharesChange} placeholder="100" />
        <CalcInput label={tr(t, 'pfAvgCost', 'Avg Cost')} value={cost} onChange={onCostChange} prefix="$" placeholder="150" />
        <button
          onClick={onAdd}
          className="shrink-0 px-2 py-[3px] border border-indigo-400/40 bg-indigo-400/10 text-indigo-400 text-[8px] font-black uppercase tracking-wider hover:bg-indigo-400/20 transition-colors flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" />
          {tr(t, 'pfAdd', 'Add')}
        </button>
      </div>
    </div>
  );
}

function HoldingsList({ holdings, onRemove }: { holdings: Holding[]; onRemove: (id: string) => void }) {
  const t = useT();
  if (holdings.length === 0) return null;
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">
        {tr(t, 'pfHoldings', 'Holdings')} ({holdings.length})
      </div>
      <div className="space-y-0.5 max-h-[120px] overflow-auto no-scrollbar">
        {holdings.map((h) => {
          const data = getStockData(h.symbol);
          const price = data?.price ?? h.avgCost;
          const value = h.shares * price;
          const pl = (price - h.avgCost) * h.shares;
          return (
            <div key={h.id} className="flex items-center justify-between px-2 py-0.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-indigo-400 w-12">{h.symbol}</span>
                <span className="text-[8px] font-mono text-neutral/40">{h.shares} @ ${h.avgCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-white">{fmtCurrency(value)}</span>
                <span className={`text-[8px] font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtPct((pl / (h.shares * h.avgCost)) * 100)}
                </span>
                <button
                  onClick={() => onRemove(h.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral/30 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MetricsSummary {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  plPct: number;
  weightedBeta: number;
  sharpe: number;
  maxDrawdown: number;
  diversification: number;
  portfolioVol: number;
}

function SummaryMetrics({ metrics }: { metrics: MetricsSummary }) {
  const t = useT();
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">
        {tr(t, 'pfSummary', 'Summary')}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <ResultBox label={tr(t, 'pfTotalValue', 'Total Value')} value={fmtCurrency(metrics.totalValue)} accent />
        <ResultBox label={tr(t, 'pfTotalCost', 'Total Cost')} value={fmtCurrency(metrics.totalCost)} />
        <ResultBox
          label={tr(t, 'pfTotalPL', 'Total P&L')}
          value={fmtCurrency(metrics.totalPL)}
          color={metrics.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <ResultBox
          label={tr(t, 'pfPLPct', 'P&L %')}
          value={fmtPct(metrics.plPct)}
          color={metrics.plPct >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
        <ResultBox label={tr(t, 'pfBeta', 'Beta')} value={metrics.weightedBeta.toFixed(2)} accent />
        <ResultBox label={tr(t, 'pfSharpe', 'Sharpe')} value={metrics.sharpe.toFixed(2)} accent />
        <ResultBox
          label={tr(t, 'pfMaxDD', 'Max DD Est.')}
          value={fmtPct(metrics.maxDrawdown * 100)}
          color="text-red-400"
        />
        <ResultBox
          label={tr(t, 'pfDiversification', 'Diversification')}
          value={metrics.diversification.toFixed(0) + '/100'}
          accent
        />
      </div>
    </div>
  );
}

interface DonutHolding {
  symbol: string;
  weight: number;
  value: number;
}

function DonutChart({ holdings }: { holdings: DonutHolding[] }) {
  const t = useT();
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 58;
  const innerR = 36;

  const slices = useMemo(() => {
    let cumAngle = -Math.PI / 2; // start from top
    return holdings.map((h, i) => {
      const angle = h.weight * Math.PI * 2;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      cumAngle = endAngle;

      const largeArc = angle > Math.PI ? 1 : 0;

      const x1Outer = cx + outerR * Math.cos(startAngle);
      const y1Outer = cy + outerR * Math.sin(startAngle);
      const x2Outer = cx + outerR * Math.cos(endAngle);
      const y2Outer = cy + outerR * Math.sin(endAngle);

      const x1Inner = cx + innerR * Math.cos(endAngle);
      const y1Inner = cy + innerR * Math.sin(endAngle);
      const x2Inner = cx + innerR * Math.cos(startAngle);
      const y2Inner = cy + innerR * Math.sin(startAngle);

      const d = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
        'Z',
      ].join(' ');

      return { d, color: DONUT_COLORS[i % DONUT_COLORS.length], symbol: h.symbol, weight: h.weight };
    });
  }, [holdings, cx, cy]);

  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">
        {tr(t, 'pfAllocation', 'Allocation')}
      </div>
      <div className="flex items-center gap-3">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} opacity={0.85} />
          ))}
          {/* Center label */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="monospace" fontWeight="900">
            {holdings.length}
          </text>
          <text x={cx} y={cy + 7} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">
            STOCKS
          </text>
        </svg>
        {/* Legend */}
        <div className="flex-1 space-y-0.5 max-h-[120px] overflow-auto no-scrollbar">
          {holdings.map((h, i) => (
            <div key={h.symbol} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 shrink-0"
                style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="text-[8px] font-mono font-bold text-white w-10">{h.symbol}</span>
              <span className="text-[8px] font-mono text-neutral/40">{(h.weight * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RiskHolding {
  symbol: string;
  weight: number;
  beta: number;
  vol: number;
  riskContribPct: number;
}

function RiskGrid({ holdings }: { holdings: RiskHolding[] }) {
  const t = useT();
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 uppercase mb-1">
        {tr(t, 'pfRiskMetrics', 'Risk Metrics')}
      </div>
      {/* Header */}
      <div className="grid grid-cols-5 gap-1 px-2 py-0.5 border-b border-border/20">
        {[
          tr(t, 'pfSymbol', 'Symbol'),
          tr(t, 'pfWeight', 'Weight'),
          tr(t, 'pfBeta', 'Beta'),
          tr(t, 'pfVol', 'Vol'),
          tr(t, 'pfRiskContrib', 'Risk %'),
        ].map((label) => (
          <span key={label} className="text-[7px] font-mono font-bold text-neutral/40 uppercase">{label}</span>
        ))}
      </div>
      {/* Rows */}
      <div className="max-h-[140px] overflow-auto no-scrollbar">
        {holdings.map((h) => (
          <div key={h.symbol} className="grid grid-cols-5 gap-1 px-2 py-0.5 hover:bg-white/[0.02] transition-colors">
            <span className="text-[8px] font-mono font-bold text-indigo-400">{h.symbol}</span>
            <span className="text-[8px] font-mono text-white">{(h.weight * 100).toFixed(1)}%</span>
            <span className={`text-[8px] font-mono ${h.beta > 1.3 ? 'text-red-400' : h.beta < 0.7 ? 'text-emerald-400' : 'text-white'}`}>
              {h.beta.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono text-white">{(h.vol * 100).toFixed(0)}%</span>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1 bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-indigo-400/60"
                  style={{ width: `${Math.min(h.riskContribPct, 100)}%` }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral/40 w-8 text-right">{h.riskContribPct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI primitives (matching investment-calc-panel style)
// ---------------------------------------------------------------------------

function CalcInput({ label, value, onChange, prefix, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; placeholder?: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[7px] font-mono text-neutral/40 mb-0.5">{label}</div>
      <div className="flex items-center">
        {prefix && <span className="text-[8px] font-mono text-neutral/30 mr-0.5">{prefix}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-black border border-border/30 px-1.5 py-0.5 text-[9px] font-mono text-white placeholder:text-neutral/20"
        />
      </div>
    </div>
  );
}

function ResultBox({ label, value, accent, color }: {
  label: string; value: string; accent?: boolean; color?: string;
}) {
  return (
    <div className={`px-2 py-1.5 border ${accent ? 'border-indigo-400/30 bg-indigo-400/5' : 'border-border/20'}`}>
      <div className="text-[7px] font-mono text-neutral/40 uppercase">{label}</div>
      <div className={`text-[10px] font-mono font-bold ${color ?? (accent ? 'text-indigo-400' : 'text-white')}`}>{value}</div>
    </div>
  );
}
