import { useStructuredProduct } from '../../api/hooks/use-structured-product';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtSize(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtPctPlain(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPrice(n: number): string {
  return n.toFixed(3);
}

function fmtReturn(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// ── Color helpers ──

function spreadColor(change: number): string {
  if (change > 0) return 'text-red-400';
  if (change < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function returnColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function delinquencyColor(rate: number): string {
  if (rate >= 5) return 'text-red-400';
  if (rate >= 3) return 'text-red-400/80';
  if (rate >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return 'text-lime-400';
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return 'text-green-400';
  if (rating.startsWith('A')) return 'text-green-300';
  if (rating.startsWith('BBB') || rating.startsWith('Baa')) return 'text-yellow-400';
  if (rating.startsWith('BB') || rating.startsWith('Ba')) return 'text-orange-400';
  if (rating.startsWith('B')) return 'text-orange-300';
  return 'text-red-400';
}

function riskBadgeStyle(level: string): string {
  const l = level.toUpperCase();
  if (l === 'LOW') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (l === 'ELEVATED') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  if (l === 'HIGH') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function trancheBarColor(level: string): string {
  const t = level.toUpperCase();
  if (t === 'AAA') return 'bg-green-500';
  if (t === 'AA') return 'bg-emerald-500';
  if (t === 'A') return 'bg-cyan-500';
  if (t === 'BBB') return 'bg-blue-500';
  if (t === 'BB') return 'bg-amber-500';
  if (t === 'B') return 'bg-orange-500';
  if (t === 'EQUITY' || t === 'EQ') return 'bg-red-500';
  return 'bg-neutral-500';
}

function trancheTextColor(level: string): string {
  const t = level.toUpperCase();
  if (t === 'AAA') return 'text-green-400';
  if (t === 'AA') return 'text-emerald-400';
  if (t === 'A') return 'text-cyan-400';
  if (t === 'BBB') return 'text-blue-400';
  if (t === 'BB') return 'text-amber-400';
  if (t === 'B') return 'text-orange-400';
  if (t === 'EQUITY' || t === 'EQ') return 'text-red-400';
  return 'text-neutral-400';
}

// ── Static mock data ──

const SUMMARY = {
  totalAbsOutstanding: 4.28e12,
  ytdIssuance: 482e9,
  avgSpread: 128,
  spreadTrend: -4,
  riskLevel: 'MODERATE',
};

const RISK_INDICATORS = [
  { name: 'CMBS Delinquency', rate: 4.82 },
  { name: 'Auto Loan Delinquency', rate: 2.48 },
  { name: 'Credit Card Delinquency', rate: 1.95 },
  { name: 'Student Loan Delinquency', rate: 4.15 },
  { name: 'Mortgage Delinquency', rate: 3.21 },
  { name: 'CLO Default Rate', rate: 1.85 },
];

const ABS_MARKET = [
  { type: 'Auto Loan', spread: 85, change1w: 3, yield: 5.42, aum: 1.42e12, delinquency: 2.48, prepayment: 1.45 },
  { type: 'Credit Card', spread: 62, change1w: -2, yield: 5.18, aum: 980e9, delinquency: 1.95, prepayment: 18.2 },
  { type: 'Student Loan', spread: 45, change1w: 1, yield: 4.92, aum: 1.76e12, delinquency: 4.15, prepayment: 5.8 },
  { type: 'Equipment', spread: 78, change1w: -5, yield: 5.35, aum: 320e9, delinquency: 1.22, prepayment: 8.4 },
  { type: 'Floorplan', spread: 92, change1w: 4, yield: 5.48, aum: 185e9, delinquency: 0.85, prepayment: 42.1 },
  { type: 'Cell Tower', spread: 68, change1w: -1, yield: 5.12, aum: 145e9, delinquency: 0.12, prepayment: 2.1 },
  { type: 'Data Center', spread: 72, change1w: -3, yield: 5.22, aum: 98e9, delinquency: 0.08, prepayment: 1.8 },
  { type: 'Whole Business', spread: 142, change1w: 6, yield: 5.95, aum: 52e9, delinquency: 1.45, prepayment: 3.2 },
];

const MBS_MARKET = [
  { name: 'Agency 30Y', coupon: 5.50, price: 101.234, spread: 68, oas: 52, duration: 6.2, prepayment: 8.2 },
  { name: 'Agency 15Y', coupon: 5.00, price: 100.875, spread: 48, oas: 38, duration: 3.8, prepayment: 12.4 },
  { name: 'GNMA 30Y', coupon: 5.50, price: 101.562, spread: 58, oas: 45, duration: 5.8, prepayment: 9.4 },
  { name: 'Non-Agency', coupon: 6.25, price: 99.875, spread: 185, oas: 162, duration: 4.5, prepayment: 6.1 },
];

const TRANCHE_ANALYSIS = [
  { level: 'AAA', typicalSpread: 118, subordination: 38.5, expectedLoss: 0.01, rating: 'Aaa/AAA' },
  { level: 'AA', typicalSpread: 175, subordination: 26.8, expectedLoss: 0.08, rating: 'Aa2/AA' },
  { level: 'A', typicalSpread: 225, subordination: 18.2, expectedLoss: 0.35, rating: 'A2/A' },
  { level: 'BBB', typicalSpread: 340, subordination: 12.5, expectedLoss: 1.42, rating: 'Baa2/BBB' },
  { level: 'BB', typicalSpread: 520, subordination: 7.8, expectedLoss: 4.85, rating: 'Ba2/BB' },
  { level: 'B', typicalSpread: 780, subordination: 4.2, expectedLoss: 12.30, rating: 'B2/B' },
  { level: 'Equity', typicalSpread: 0, subordination: 0, expectedLoss: 42.50, rating: 'NR' },
];

const PERFORMANCE = [
  { type: 'ABS Index', return1m: 0.42, return3m: 1.28, returnYtd: 2.15, volatility: 1.85, sharpe: 1.42 },
  { type: 'CMBS Index', return1m: -0.18, return3m: 0.65, returnYtd: 1.42, volatility: 3.12, sharpe: 0.68 },
  { type: 'CLO AAA', return1m: 0.38, return3m: 1.15, returnYtd: 1.98, volatility: 0.92, sharpe: 2.15 },
  { type: 'CLO BB', return1m: 0.85, return3m: 2.42, returnYtd: 4.28, volatility: 4.85, sharpe: 1.08 },
  { type: 'Agency MBS', return1m: -0.12, return3m: 0.48, returnYtd: 1.05, volatility: 2.45, sharpe: 0.52 },
  { type: 'Non-Agency', return1m: 0.62, return3m: 1.85, returnYtd: 3.42, volatility: 3.68, sharpe: 1.12 },
];

const RECENT_ISSUANCE = [
  { issuer: 'JP Morgan', type: 'Auto ABS', size: 1.5e9, tranche: 'AAA/AA/A', rating: 'Aaa', spread: 42, wal: 2.8, collateral: 'Prime Auto' },
  { issuer: 'Citigroup', type: 'Credit Card', size: 2.0e9, tranche: 'AAA/A/BBB', rating: 'Aaa', spread: 38, wal: 3.2, collateral: 'Revolving' },
  { issuer: 'Goldman Sachs', type: 'CRT', size: 850e6, tranche: 'M1/M2/B1', rating: 'BBB', spread: 155, wal: 5.1, collateral: 'Residential' },
  { issuer: 'BofA', type: 'CMBS', size: 1.2e9, tranche: 'A/AS/B', rating: 'AAA', spread: 118, wal: 4.8, collateral: 'Diversified' },
  { issuer: 'Morgan Stanley', type: 'CLO', size: 600e6, tranche: 'AAA-Eq', rating: 'Aaa', spread: 125, wal: 5.5, collateral: 'Lev Loans' },
  { issuer: 'Barclays', type: 'Student', size: 750e6, tranche: 'A/B/C', rating: 'AAA', spread: 35, wal: 4.2, collateral: 'FFELP' },
  { issuer: 'Wells Fargo', type: 'Auto ABS', size: 1.1e9, tranche: 'AAA/AA', rating: 'Aaa', spread: 48, wal: 2.5, collateral: 'Subprime Auto' },
  { issuer: 'Deutsche Bank', type: 'CMBS', size: 950e6, tranche: 'A/B/C', rating: 'AA', spread: 135, wal: 5.2, collateral: 'Office/Retail' },
  { issuer: 'Credit Suisse', type: 'CLO', size: 520e6, tranche: 'AAA-BB', rating: 'Aaa', spread: 132, wal: 5.8, collateral: 'Broadly Synd' },
  { issuer: 'RBC', type: 'Equipment', size: 480e6, tranche: 'A/B', rating: 'AAA', spread: 52, wal: 3.1, collateral: 'Industrial Equip' },
];

// ── Main Panel ──

export function StructuredProductPanel() {
  const { data, isLoading, error, refetch } = useStructuredProduct();
  const d = data as any;

  const summary = d?.summary ?? SUMMARY;
  const riskIndicators = d?.riskIndicators ?? RISK_INDICATORS;
  const absMarket = d?.absMarket ?? ABS_MARKET;
  const mbsMarket = d?.mbsMarket ?? MBS_MARKET;
  const tranches = d?.trancheAnalysis ?? TRANCHE_ANALYSIS;
  const performance = d?.performance ?? PERFORMANCE;
  const issuance = d?.recentIssuance ?? RECENT_ISSUANCE;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-pink-400">
            Structured Product Monitor
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING STRUCTURED PRODUCT DATA...
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8">
            <div className="text-red-400 text-[9px] font-mono uppercase mb-2">
              FAILED TO LOAD DATA
            </div>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-mono text-pink-400 hover:text-pink-300 uppercase tracking-wider"
            >
              RETRY
            </button>
          </div>
        )}

        {(d || summary) && (
          <>
            <SummaryBar summary={summary} />
            <RiskIndicators indicators={riskIndicators} />
            <ABSMarketTable rows={absMarket} />
            <MBSMarketTable rows={mbsMarket} />
            <TrancheAnalysisSection tranches={tranches} />
            <PerformanceTable rows={performance} />
            <RecentIssuanceTable rows={issuance} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: typeof SUMMARY }) {
  const trendIcon = summary.spreadTrend < 0 ? '\u25BC' : summary.spreadTrend > 0 ? '\u25B2' : '\u25CF';
  const trendColor = spreadColor(summary.spreadTrend);

  return (
    <div className="border-b border-border/20 bg-pink-400/[0.02]">
      <div className="grid grid-cols-5 gap-px">
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            TOTAL ABS OUTSTANDING
          </div>
          <div className="text-[11px] font-mono font-bold text-white">{fmtSize(summary.totalAbsOutstanding)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            YTD ISSUANCE
          </div>
          <div className="text-[11px] font-mono font-bold text-pink-400">{fmtSize(summary.ytdIssuance)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            AVG SPREAD
          </div>
          <div className="text-[11px] font-mono font-bold text-white">{fmtBps(summary.avgSpread)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            SPREAD TREND
          </div>
          <div className={`text-[11px] font-mono font-bold ${trendColor}`}>
            {trendIcon} {summary.spreadTrend > 0 ? '+' : ''}{summary.spreadTrend}bp
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            RISK LEVEL
          </div>
          <span className={`inline-block mt-0.5 px-1.5 py-px text-[8px] font-mono font-bold uppercase border ${riskBadgeStyle(summary.riskLevel)}`}>
            {summary.riskLevel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Risk Indicators ──

function RiskIndicators({ indicators }: { indicators: typeof RISK_INDICATORS }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          RISK INDICATORS
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {indicators.map((ind) => (
          <div key={ind.name} className="bg-black px-2.5 py-1.5 hover:bg-pink-400/[0.02] transition-colors">
            <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">{ind.name}</div>
            <div className={`text-[10px] font-mono font-bold ${delinquencyColor(ind.rate)}`}>
              {fmtPctPlain(ind.rate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ABS Market Table ──

function ABSMarketTable({ rows }: { rows: typeof ABS_MARKET }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          ABS MARKET
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">TYPE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">CHG 1W</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">YIELD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">AUM</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">DELINQ</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">PREPAY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.type}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-pink-400">{fmtBps(row.spread)}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${spreadColor(row.change1w)}`}>
                  {row.change1w > 0 ? '+' : ''}{row.change1w}bp
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtPctPlain(row.yield)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">{fmtSize(row.aum)}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(row.delinquency)}`}>
                  {fmtPctPlain(row.delinquency)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-cyan-400">{fmtPctPlain(row.prepayment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MBS Market Table ──

function MBSMarketTable({ rows }: { rows: typeof MBS_MARKET }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          MBS MARKET
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">NAME</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">COUPON</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">PRICE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">OAS</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">DUR</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">PREPAY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.name}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{row.coupon.toFixed(2)}%</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtPrice(row.price)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-pink-400">{fmtBps(row.spread)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-pink-400/70">{fmtBps(row.oas)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">{row.duration.toFixed(1)}y</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-cyan-400">{fmtPctPlain(row.prepayment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tranche Analysis ──

function TrancheAnalysisSection({ tranches }: { tranches: typeof TRANCHE_ANALYSIS }) {
  const maxSubordination = Math.max(...tranches.map((t) => t.subordination));

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TRANCHE ANALYSIS
        </span>
      </div>

      {/* Stacked bar visual */}
      <div className="px-3 py-2 border-b border-border/10">
        <div className="flex h-4 w-full overflow-hidden">
          {tranches.filter((t) => t.subordination > 0).map((t) => (
            <div
              key={t.level}
              className={`${trancheBarColor(t.level)} opacity-60 flex items-center justify-center`}
              style={{ width: `${(t.subordination / (maxSubordination + 5)) * 100}%` }}
            >
              <span className="text-[6px] font-mono font-bold text-white truncate px-0.5">
                {t.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">TRANCHE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">TYP SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SUBORD %</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">EXP LOSS %</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">RATING</th>
            </tr>
          </thead>
          <tbody>
            {tranches.map((t) => (
              <tr key={t.level} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className={`px-2 py-1 text-[9px] font-mono font-bold ${trancheTextColor(t.level)}`}>
                  {t.level.toUpperCase()}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-pink-400">
                  {t.typicalSpread > 0 ? fmtBps(t.typicalSpread) : 'N/A'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">
                  {t.subordination > 0 ? fmtPctPlain(t.subordination) : '--'}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${t.expectedLoss >= 5 ? 'text-red-400' : t.expectedLoss >= 1 ? 'text-orange-400' : 'text-green-400'}`}>
                  {fmtPctPlain(t.expectedLoss)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${ratingColor(t.rating)}`}>
                  {t.rating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Performance Table ──

function PerformanceTable({ rows }: { rows: typeof PERFORMANCE }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          PERFORMANCE
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">TYPE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">1M</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">3M</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">YTD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">VOL</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SHARPE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.type}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${returnColor(row.return1m)}`}>
                  {fmtReturn(row.return1m)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${returnColor(row.return3m)}`}>
                  {fmtReturn(row.return3m)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${returnColor(row.returnYtd)}`}>
                  {fmtReturn(row.returnYtd)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">
                  {fmtPctPlain(row.volatility)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${row.sharpe >= 1.5 ? 'text-green-400' : row.sharpe >= 1.0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {row.sharpe.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Recent Issuance Table ──

function RecentIssuanceTable({ rows }: { rows: typeof RECENT_ISSUANCE }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          RECENT ISSUANCE
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">ISSUER</th>
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">TYPE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SIZE</th>
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">TRANCHE</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">RATING</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">WAL</th>
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">COLLATERAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/5 hover:bg-pink-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.issuer}</td>
                <td className="px-2 py-1">
                  <TypeBadge type={row.type} />
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtSize(row.size)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">{row.tranche}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${ratingColor(row.rating)}`}>
                  {row.rating}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-pink-400">+{row.spread}bp</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">{row.wal.toFixed(1)}y</td>
                <td className="px-2 py-1 text-[9px] font-mono text-neutral-400">{row.collateral}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Type Badge ──

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    'Auto ABS': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Credit Card': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    CRT: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    CMBS: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    CLO: 'bg-green-500/15 text-green-400 border-green-500/30',
    Student: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Equipment: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  };
  const cls = colorMap[type] || 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
  return (
    <span className={`px-1 py-px text-[7px] font-mono font-bold uppercase border ${cls}`}>
      {type}
    </span>
  );
}
