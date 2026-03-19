import { useStructuredProducts } from '../../api/hooks/use-structured-products';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtBn(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtPrice(n: number): string {
  return n.toFixed(3);
}

function delinquencyColor(rate: number): string {
  if (rate >= 5) return 'text-red-400';
  if (rate >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating.startsWith('AAA') || rating.startsWith('Aaa')) return 'text-lime-400';
  if (rating.startsWith('AA') || rating.startsWith('Aa')) return 'text-green-400';
  if (rating.startsWith('A')) return 'text-green-300';
  if (rating.startsWith('BBB') || rating.startsWith('Baa')) return 'text-yellow-400';
  if (rating.startsWith('BB') || rating.startsWith('Ba')) return 'text-orange-400';
  return 'text-red-400';
}

// ── Static mock data (replaced by API when available) ──

const MARKET_OVERVIEW = {
  totalOutstanding: 12.8e12,
  ytdIssuance: 1.42e12,
  avgSpread: 142,
  delinquencyRate: 2.31,
};

const RMBS_AGENCY = [
  { issuer: 'FNMA', coupon: 5.5, price: 101.234, spread: 68, cpr: 8.2, delinquency: 1.12 },
  { issuer: 'FNMA', coupon: 6.0, price: 103.456, spread: 52, cpr: 12.4, delinquency: 0.98 },
  { issuer: 'FNMA', coupon: 6.5, price: 105.012, spread: 41, cpr: 18.6, delinquency: 0.87 },
  { issuer: 'FHLMC', coupon: 5.5, price: 101.187, spread: 70, cpr: 7.9, delinquency: 1.15 },
  { issuer: 'FHLMC', coupon: 6.0, price: 103.389, spread: 54, cpr: 11.8, delinquency: 1.01 },
  { issuer: 'GNMA', coupon: 5.5, price: 101.562, spread: 58, cpr: 9.4, delinquency: 2.34 },
  { issuer: 'GNMA', coupon: 6.0, price: 103.891, spread: 45, cpr: 14.1, delinquency: 2.18 },
];

const RMBS_NON_AGENCY = [
  { name: 'CAS 2024-R08', coupon: 6.25, price: 99.875, spread: 185, cpr: 6.1, delinquency: 3.42 },
  { name: 'STACR 2024-HQA3', coupon: 5.95, price: 100.125, spread: 162, cpr: 5.8, delinquency: 2.87 },
  { name: 'AGATE 2025-1', coupon: 6.50, price: 98.750, spread: 210, cpr: 4.2, delinquency: 4.15 },
];

const CMBS_DEALS = [
  { name: 'BANK 2024-BNK48', vintage: 2024, collateral: 'Diversified', balance: 1.2e9, delinquency: 1.45, wal: 4.8, spread: 125, rating: 'AAA' },
  { name: 'BBCMS 2024-C28', vintage: 2024, collateral: 'Office', balance: 890e6, delinquency: 4.82, wal: 5.2, spread: 195, rating: 'AA' },
  { name: 'BMARK 2024-V9', vintage: 2024, collateral: 'Retail', balance: 1.05e9, delinquency: 3.21, wal: 4.5, spread: 168, rating: 'AA-' },
  { name: 'WFCM 2023-C57', vintage: 2023, collateral: 'Hotel', balance: 750e6, delinquency: 6.15, wal: 3.8, spread: 245, rating: 'A' },
  { name: 'CSAIL 2024-C8', vintage: 2024, collateral: 'Industrial', balance: 680e6, delinquency: 0.92, wal: 5.6, spread: 108, rating: 'AAA' },
  { name: 'JPMCC 2024-CBM2', vintage: 2024, collateral: 'Multifamily', balance: 1.1e9, delinquency: 1.08, wal: 4.1, spread: 112, rating: 'AAA' },
];

const CLO_DATA = [
  {
    name: 'ARES CLO XXIV',
    manager: 'Ares Management',
    aum: 4.2e9,
    defaultRate: 1.85,
    recovery: 68.2,
    tranches: { AAA: 118, AA: 175, A: 225, BBB: 340, BB: 520, equity: 12.4 },
  },
  {
    name: 'CARLYLE US CLO 2024-3',
    manager: 'Carlyle Group',
    aum: 3.8e9,
    defaultRate: 2.12,
    recovery: 65.8,
    tranches: { AAA: 122, AA: 182, A: 238, BBB: 365, BB: 548, equity: 11.8 },
  },
  {
    name: 'KKR CLO 42',
    manager: 'KKR Credit',
    aum: 5.1e9,
    defaultRate: 1.52,
    recovery: 71.4,
    tranches: { AAA: 112, AA: 168, A: 218, BBB: 328, BB: 495, equity: 13.2 },
  },
  {
    name: 'BAIN CAPITAL CLO 2024-6',
    manager: 'Bain Capital',
    aum: 2.9e9,
    defaultRate: 2.35,
    recovery: 62.1,
    tranches: { AAA: 128, AA: 192, A: 248, BBB: 382, BB: 575, equity: 10.5 },
  },
];

const ABS_SECTORS = [
  { sector: 'Auto', outstanding: 1.42e12, spread: 85, delinquency: 2.48, chargeOff: 1.82 },
  { sector: 'Credit Card', outstanding: 980e9, spread: 62, delinquency: 1.95, chargeOff: 3.15 },
  { sector: 'Student', outstanding: 1.76e12, spread: 45, delinquency: 4.82, chargeOff: 0.95 },
  { sector: 'Equipment', outstanding: 320e9, spread: 78, delinquency: 1.22, chargeOff: 0.68 },
];

const RECENT_ISSUANCE = [
  { name: 'AMCAR 2025-1', type: 'Auto ABS', size: 1.5e9, date: '2025-03-14', lead: 'JP Morgan', topSpread: 42 },
  { name: 'CITICC 2025-A2', type: 'Credit Card', size: 2.0e9, date: '2025-03-13', lead: 'Citigroup', topSpread: 38 },
  { name: 'STACR 2025-DNA2', type: 'CRT', size: 850e6, date: '2025-03-12', lead: 'Goldman Sachs', topSpread: 155 },
  { name: 'BANK 2025-BNK50', type: 'CMBS', size: 1.2e9, date: '2025-03-11', lead: 'BofA', topSpread: 118 },
  { name: 'TPVG 2025-1', type: 'CLO', size: 600e6, date: '2025-03-10', lead: 'Morgan Stanley', topSpread: 125 },
  { name: 'NAVSL 2025-A', type: 'Student', size: 750e6, date: '2025-03-07', lead: 'Barclays', topSpread: 35 },
];

const PREPAYMENT_COUPONS = [
  { coupon: 4.0, cpr: 3.2, change1m: -0.4 },
  { coupon: 4.5, cpr: 4.8, change1m: -0.2 },
  { coupon: 5.0, cpr: 6.5, change1m: 0.3 },
  { coupon: 5.5, cpr: 8.2, change1m: 0.8 },
  { coupon: 6.0, cpr: 12.4, change1m: 1.5 },
  { coupon: 6.5, cpr: 18.6, change1m: 2.8 },
  { coupon: 7.0, cpr: 26.1, change1m: 4.2 },
  { coupon: 7.5, cpr: 32.4, change1m: 3.1 },
];

// ── Collateral badge ──

function CollateralBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Office: 'bg-red-500/15 text-red-400 border-red-500/30',
    Retail: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    Hotel: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    Industrial: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Multifamily: 'bg-green-500/15 text-green-400 border-green-500/30',
    Diversified: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  const cls = colorMap[type] || 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
  return (
    <span className={`px-1 py-px text-[7px] font-mono font-bold uppercase border ${cls}`}>
      {type}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    'Auto ABS': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Credit Card': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    CRT: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    CMBS: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    CLO: 'bg-green-500/15 text-green-400 border-green-500/30',
    Student: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  };
  const cls = colorMap[type] || 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
  return (
    <span className={`px-1 py-px text-[7px] font-mono font-bold uppercase border ${cls}`}>
      {type}
    </span>
  );
}

// ── Main Panel ──

export function StructuredProductsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useStructuredProducts();

  // Use API data if available, otherwise fall back to static data
  const overview = data?.overview ?? MARKET_OVERVIEW;
  const rmbsAgency = data?.rmbsAgency ?? RMBS_AGENCY;
  const rmbsNonAgency = data?.rmbsNonAgency ?? RMBS_NON_AGENCY;
  const cmbs = data?.cmbs ?? CMBS_DEALS;
  const clo = data?.clo ?? CLO_DATA;
  const abs = data?.abs ?? ABS_SECTORS;
  const issuance = data?.recentIssuance ?? RECENT_ISSUANCE;
  const prepayment = data?.prepayment ?? PREPAYMENT_COUPONS;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'panelStructuredProducts', 'Structured Products')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-lime-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING STRUCTURED PRODUCTS DATA...
          </div>
        )}

        {!isLoading && !data && !overview && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            NO DATA AVAILABLE
          </div>
        )}

        {overview && (
          <>
            <MarketOverviewBanner overview={overview} t={t} />
            <RMBSSection agency={rmbsAgency} nonAgency={rmbsNonAgency} t={t} />
            <CMBSSection deals={cmbs} t={t} />
            <CLOSection data={clo} t={t} />
            <ABSGrid sectors={abs} t={t} />
            <RecentIssuanceSection issuance={issuance} t={t} />
            <PrepaymentMonitor coupons={prepayment} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Market Overview Banner ──

function MarketOverviewBanner({
  overview,
  t,
}: {
  overview: typeof MARKET_OVERVIEW;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20 bg-lime-400/[0.02]">
      <div className="grid grid-cols-4 gap-px">
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'spTotalOutstanding', 'Total Outstanding')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white">{fmtBn(overview.totalOutstanding)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'spYtdIssuance', 'YTD Issuance')}
          </div>
          <div className="text-[11px] font-mono font-bold text-lime-400">{fmtBn(overview.ytdIssuance)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'spAvgSpread', 'Avg Spread')}
          </div>
          <div className="text-[11px] font-mono font-bold text-white">{fmtBps(overview.avgSpread)}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'spDelinquencyRate', 'Delinquency Rate')}
          </div>
          <div className={`text-[11px] font-mono font-bold ${delinquencyColor(overview.delinquencyRate)}`}>
            {fmtPct(overview.delinquencyRate)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RMBS Section ──

function RMBSSection({
  agency,
  nonAgency,
  t,
}: {
  agency: typeof RMBS_AGENCY;
  nonAgency: typeof RMBS_NON_AGENCY;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spRmbs', 'RMBS - Residential Mortgage-Backed Securities')}
        </span>
      </div>

      {/* Agency sub-header */}
      <div className="px-3 py-0.5 border-b border-border/10 bg-lime-400/[0.02]">
        <span className="text-[7px] font-mono uppercase tracking-wider text-lime-400/60">
          {tr(t, 'spAgency', 'Agency (Fannie Mae / Freddie Mac / Ginnie Mae)')}
        </span>
      </div>

      {/* Agency table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/10">
            <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">Issuer</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Coupon</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Price</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Spread</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">CPR</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Delinq</th>
          </tr>
        </thead>
        <tbody>
          {agency.map((row, i) => (
            <tr key={i} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.issuer}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{row.coupon.toFixed(1)}%</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtPrice(row.price)}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-lime-400">{fmtBps(row.spread)}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-cyan-400">{fmtPct(row.cpr)}</td>
              <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(row.delinquency)}`}>
                {fmtPct(row.delinquency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Non-Agency sub-header */}
      <div className="px-3 py-0.5 border-b border-border/10 border-t border-border/10 bg-orange-400/[0.02]">
        <span className="text-[7px] font-mono uppercase tracking-wider text-orange-400/60">
          {tr(t, 'spNonAgency', 'Non-Agency')}
        </span>
      </div>

      {/* Non-Agency table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/10">
            <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">Deal</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Coupon</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Price</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Spread</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">CPR</th>
            <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Delinq</th>
          </tr>
        </thead>
        <tbody>
          {nonAgency.map((row, i) => (
            <tr key={i} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
              <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.name}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{row.coupon.toFixed(2)}%</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtPrice(row.price)}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-orange-400">{fmtBps(row.spread)}</td>
              <td className="px-2 py-1 text-[9px] font-mono text-right text-cyan-400">{fmtPct(row.cpr)}</td>
              <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(row.delinquency)}`}>
                {fmtPct(row.delinquency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CMBS Section ──

function CMBSSection({
  deals,
  t,
}: {
  deals: typeof CMBS_DEALS;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spCmbs', 'CMBS - Commercial Mortgage-Backed Securities')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">Deal</th>
              <th className="px-2 py-1 text-center text-[7px] font-mono uppercase tracking-wider text-neutral-600">Vintage</th>
              <th className="px-2 py-1 text-center text-[7px] font-mono uppercase tracking-wider text-neutral-600">Collateral</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Balance</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Delinq</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">WAL</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Spread</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Rating</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <tr key={i} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{deal.name}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-center text-neutral-400">{deal.vintage}</td>
                <td className="px-2 py-1 text-center">
                  <CollateralBadge type={deal.collateral} />
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtBn(deal.balance)}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(deal.delinquency)}`}>
                  {fmtPct(deal.delinquency)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">{deal.wal.toFixed(1)}y</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-lime-400">{fmtBps(deal.spread)}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${ratingColor(deal.rating)}`}>
                  {deal.rating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CLO Section ──

function CLOSection({
  data,
  t,
}: {
  data: typeof CLO_DATA;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spClo', 'CLO - Collateralized Loan Obligations')}
        </span>
      </div>

      {data.map((clo, idx) => (
        <div key={idx} className={`border-b border-border/10 ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
          {/* CLO header row */}
          <div className="px-3 py-1.5 flex items-center justify-between hover:bg-lime-400/[0.02] transition-colors">
            <div className="flex-1">
              <div className="text-[9px] font-mono font-bold text-white">{clo.name}</div>
              <div className="text-[7px] font-mono text-neutral-500">{clo.manager}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">AUM</div>
                <div className="text-[9px] font-mono font-bold text-white">{fmtBn(clo.aum)}</div>
              </div>
              <div className="text-right">
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Default</div>
                <div className={`text-[9px] font-mono font-bold ${delinquencyColor(clo.defaultRate)}`}>
                  {fmtPct(clo.defaultRate)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Recovery</div>
                <div className="text-[9px] font-mono font-bold text-green-400">{fmtPct(clo.recovery)}</div>
              </div>
            </div>
          </div>

          {/* Tranche spreads */}
          <div className="px-3 pb-1.5 flex items-center gap-1 flex-wrap">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mr-1">Tranches:</span>
            {Object.entries(clo.tranches).map(([tranche, value]) => {
              const isEquity = tranche === 'equity';
              return (
                <span
                  key={tranche}
                  className={`px-1.5 py-px text-[7px] font-mono border ${
                    isEquity
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-lime-400/[0.05] border-lime-400/20 text-lime-400'
                  }`}
                >
                  {tranche.toUpperCase()} {isEquity ? `${value}%` : `+${value}`}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ABS Grid ──

function ABSGrid({
  sectors,
  t,
}: {
  sectors: typeof ABS_SECTORS;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spAbs', 'ABS - Asset-Backed Securities')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {sectors.map((s) => (
          <div key={s.sector} className="bg-black px-3 py-2 hover:bg-lime-400/[0.02] transition-colors">
            <div className="text-[9px] font-mono font-bold text-white mb-1">{s.sector}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <div>
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Outstanding</div>
                <div className="text-[9px] font-mono text-white">{fmtBn(s.outstanding)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Spread</div>
                <div className="text-[9px] font-mono text-lime-400">{fmtBps(s.spread)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Delinquency</div>
                <div className={`text-[9px] font-mono ${delinquencyColor(s.delinquency)}`}>{fmtPct(s.delinquency)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">Charge-Off</div>
                <div className={`text-[9px] font-mono ${delinquencyColor(s.chargeOff)}`}>{fmtPct(s.chargeOff)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Issuance ──

function RecentIssuanceSection({
  issuance,
  t,
}: {
  issuance: typeof RECENT_ISSUANCE;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spRecentIssuance', 'Recent Issuance')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px]">
          <thead>
            <tr className="border-b border-border/10">
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">Name</th>
              <th className="px-2 py-1 text-center text-[7px] font-mono uppercase tracking-wider text-neutral-600">Type</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Size</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Date</th>
              <th className="px-2 py-1 text-left text-[7px] font-mono uppercase tracking-wider text-neutral-600">Lead</th>
              <th className="px-2 py-1 text-right text-[7px] font-mono uppercase tracking-wider text-neutral-600">Top Spread</th>
            </tr>
          </thead>
          <tbody>
            {issuance.map((deal, i) => (
              <tr key={i} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{deal.name}</td>
                <td className="px-2 py-1 text-center">
                  <TypeBadge type={deal.type} />
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtBn(deal.size)}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-400">{deal.date}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-left text-neutral-300">{deal.lead}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-lime-400">+{deal.topSpread}bp</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Prepayment Monitor ──

function PrepaymentMonitor({
  coupons,
  t,
}: {
  coupons: typeof PREPAYMENT_COUPONS;
  t: ReturnType<typeof useT>;
}) {
  const maxCpr = Math.max(...coupons.map((c) => c.cpr));

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spPrepaymentMonitor', 'Prepayment Monitor - CPR by Coupon')}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {coupons.map((c) => {
          const barWidth = maxCpr > 0 ? (c.cpr / maxCpr) * 100 : 0;
          const isUp = c.change1m > 0;
          const isDown = c.change1m < 0;

          return (
            <div key={c.coupon} className="flex items-center gap-2 hover:bg-lime-400/[0.02] transition-colors px-1 py-0.5">
              <span className="text-[9px] font-mono text-white w-10 shrink-0">{c.coupon.toFixed(1)}%</span>
              <div className="flex-1 h-3 bg-neutral-900 relative">
                <div
                  className="h-full bg-lime-400/30 border-r border-lime-400"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="absolute left-1 top-0 text-[7px] font-mono text-white leading-3">
                  {fmtPct(c.cpr)}
                </span>
              </div>
              <span className={`text-[8px] font-mono w-12 text-right shrink-0 ${changeColor(c.change1m)}`}>
                {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'} {c.change1m > 0 ? '+' : ''}{c.change1m.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
