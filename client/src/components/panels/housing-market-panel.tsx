import { useHousingMarket } from '../../api/hooks/use-housing-market';
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

// ── Fallback mock data ──

interface HomePriceIndex {
  name: string;
  value: number;
  yoy: number;
  mom: number;
  peak: number;
  fromPeak: number;
}

interface MortgageRate {
  type: string;
  rate: number;
  change1w: number;
  change1m: number;
  yearAgo: number;
}

interface HousingActivity {
  metric: string;
  value: string;
  change: number;
  period: string;
  prior: string;
}

interface InventoryData {
  metric: string;
  value: string;
  change: number;
  level: 'low' | 'normal' | 'high';
}

interface HomebuilderStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  ytd: number;
  pe: number;
}

interface AffordabilityEntry {
  region: string;
  index: number;
  change: number;
  medianPrice: string;
  medianIncome: string;
  ratio: number;
}

interface HousingMarketData {
  homePrices: HomePriceIndex[];
  mortgageRates: MortgageRate[];
  housingActivity: HousingActivity[];
  inventory: InventoryData[];
  homebuilderStocks: HomebuilderStock[];
  affordability: AffordabilityEntry[];
  lastUpdated: string;
}

const MOCK_DATA: HousingMarketData = {
  homePrices: [
    { name: 'S&P/CS 20-City', value: 330.45, yoy: 4.68, mom: 0.32, peak: 332.10, fromPeak: -0.50 },
    { name: 'S&P/CS National', value: 318.72, yoy: 5.12, mom: 0.41, peak: 320.50, fromPeak: -0.56 },
    { name: 'FHFA HPI', value: 424.30, yoy: 5.74, mom: 0.38, peak: 426.00, fromPeak: -0.40 },
    { name: 'Median Existing', value: 407.60, yoy: 3.82, mom: -0.65, peak: 413.80, fromPeak: -1.50 },
    { name: 'Median New Home', value: 420.30, yoy: 2.15, mom: 0.28, peak: 496.80, fromPeak: -15.40 },
    { name: 'Zillow ZHVI', value: 362.48, yoy: 3.24, mom: 0.18, peak: 365.20, fromPeak: -0.75 },
  ],
  mortgageRates: [
    { type: '30Y Fixed', rate: 6.87, change1w: 0.05, change1m: -0.12, yearAgo: 7.22 },
    { type: '15Y Fixed', rate: 6.12, change1w: 0.03, change1m: -0.08, yearAgo: 6.51 },
    { type: '5/1 ARM', rate: 6.38, change1w: -0.02, change1m: -0.15, yearAgo: 6.74 },
    { type: 'Jumbo 30Y', rate: 7.14, change1w: 0.04, change1m: -0.09, yearAgo: 7.48 },
    { type: 'FHA 30Y', rate: 6.42, change1w: 0.03, change1m: -0.10, yearAgo: 6.78 },
  ],
  housingActivity: [
    { metric: 'Existing Home Sales', value: '4.15M', change: -1.2, period: 'Feb 2026', prior: '4.20M' },
    { metric: 'New Home Sales', value: '0.664M', change: 3.8, period: 'Feb 2026', prior: '0.640M' },
    { metric: 'Pending Home Sales', value: '77.4', change: -2.1, period: 'Feb 2026', prior: '79.1' },
    { metric: 'Housing Starts', value: '1.388M', change: 5.2, period: 'Feb 2026', prior: '1.320M' },
    { metric: 'Building Permits', value: '1.456M', change: 1.9, period: 'Feb 2026', prior: '1.429M' },
    { metric: 'NAHB Housing Idx', value: '42', change: -4.5, period: 'Mar 2026', prior: '44' },
  ],
  inventory: [
    { metric: 'Total Listings', value: '1.24M', change: 12.8, level: 'low' },
    { metric: 'Months of Supply', value: '3.5', change: 8.3, level: 'low' },
    { metric: 'New Listings', value: '412K', change: 5.2, level: 'normal' },
    { metric: 'Days on Market', value: '54', change: 14.9, level: 'normal' },
    { metric: 'Active Inventory YoY', value: '+17.2%', change: 17.2, level: 'normal' },
    { metric: 'Price Reductions', value: '36.8%', change: 4.1, level: 'high' },
  ],
  homebuilderStocks: [
    { symbol: 'DHI', name: 'D.R. Horton', price: 148.32, changePct: 1.24, ytd: 8.7, pe: 10.2 },
    { symbol: 'LEN', name: 'Lennar', price: 162.85, changePct: -0.38, ytd: 5.3, pe: 9.8 },
    { symbol: 'NVR', name: 'NVR Inc', price: 7842.50, changePct: 0.72, ytd: 12.1, pe: 18.4 },
    { symbol: 'PHM', name: 'PulteGroup', price: 118.64, changePct: 1.85, ytd: 10.4, pe: 8.6 },
    { symbol: 'TOL', name: 'Toll Brothers', price: 124.18, changePct: -0.92, ytd: -2.1, pe: 7.9 },
    { symbol: 'KBH', name: 'KB Home', price: 72.34, changePct: 0.54, ytd: 4.8, pe: 8.1 },
    { symbol: 'MTH', name: 'Meritage Homes', price: 185.40, changePct: 2.12, ytd: 14.6, pe: 9.3 },
    { symbol: 'ITB', name: 'iShares Home ETF', price: 102.56, changePct: 0.68, ytd: 7.2, pe: 11.5 },
  ],
  affordability: [
    { region: 'National', index: 98.2, change: -3.4, medianPrice: '$407,600', medianIncome: '$78,500', ratio: 5.19 },
    { region: 'Northeast', index: 85.6, change: -4.1, medianPrice: '$462,300', medianIncome: '$82,100', ratio: 5.63 },
    { region: 'Midwest', index: 128.4, change: -1.8, medianPrice: '$298,400', medianIncome: '$72,800', ratio: 4.10 },
    { region: 'South', index: 104.7, change: -2.9, medianPrice: '$372,100', medianIncome: '$74,200', ratio: 5.01 },
    { region: 'West', index: 72.3, change: -5.2, medianPrice: '$598,700', medianIncome: '$86,400', ratio: 6.93 },
  ],
  lastUpdated: new Date().toISOString(),
};

// ── Format helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtValue(n: number): string {
  if (Math.abs(n) >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function levelColor(level: 'low' | 'normal' | 'high'): { text: string; bg: string } {
  switch (level) {
    case 'low':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    case 'high':
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
    default:
      return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  }
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15">
      <div className="w-1 h-1 shrink-0 bg-rose-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-rose-400">
        {title}
      </span>
    </div>
  );
}

// ── Home Prices Section ──

function HomePricesSection({ data, t }: { data: HomePriceIndex[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmHomePrices', 'Home Prices')} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className="text-left text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmIndex', 'Index')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmValue', 'Value')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmYoY', 'YoY')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmMoM', 'MoM')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmFromPeak', 'From Peak')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.name} className="hover:bg-rose-400/[0.02] transition-colors">
              <td className="text-[8px] font-mono font-bold text-white/80 px-2 py-1 border-b border-border/10 truncate max-w-[120px]">
                {item.name}
              </td>
              <td className="text-right text-[9px] font-mono font-bold text-white tabular-nums px-2 py-1 border-b border-border/10">
                {fmtValue(item.value)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(item.yoy)}`}>
                {fmtPct(item.yoy)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(item.mom)}`}>
                {fmtPct(item.mom)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(item.fromPeak)}`}>
                {fmtPct(item.fromPeak)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mortgage Rates Section ──

function MortgageRatesSection({ data, t }: { data: MortgageRate[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmMortgageRates', 'Mortgage Rates')} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className="text-left text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmType', 'Type')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmRate', 'Rate')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmChg1W', '1W Chg')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmChg1M', '1M Chg')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmYearAgo', 'Year Ago')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.type} className="hover:bg-rose-400/[0.02] transition-colors">
              <td className="text-[8px] font-mono font-bold text-white/80 px-2 py-1 border-b border-border/10">
                {item.type}
              </td>
              <td className="text-right text-[9px] font-mono font-bold text-rose-400 tabular-nums px-2 py-1 border-b border-border/10">
                {fmtRate(item.rate)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(-item.change1w)}`}>
                {fmtChange(item.change1w)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(-item.change1m)}`}>
                {fmtChange(item.change1m)}
              </td>
              <td className="text-right text-[8px] font-mono text-neutral-500 tabular-nums px-2 py-1 border-b border-border/10">
                {fmtRate(item.yearAgo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Housing Activity Section ──

function HousingActivitySection({ data, t }: { data: HousingActivity[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmHousingActivity', 'Housing Activity')} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className="text-left text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmMetric', 'Metric')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmActual', 'Actual')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmChange', 'Change')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmPrior', 'Prior')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmPeriod', 'Period')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.metric} className="hover:bg-rose-400/[0.02] transition-colors">
              <td className="text-[8px] font-mono font-bold text-white/80 px-2 py-1 border-b border-border/10 truncate max-w-[130px]">
                {item.metric}
              </td>
              <td className="text-right text-[9px] font-mono font-bold text-white tabular-nums px-2 py-1 border-b border-border/10">
                {item.value}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(item.change)}`}>
                {fmtPct(item.change)}
              </td>
              <td className="text-right text-[8px] font-mono text-neutral-500 tabular-nums px-2 py-1 border-b border-border/10">
                {item.prior}
              </td>
              <td className="text-right text-[7px] font-mono text-neutral-600 px-2 py-1 border-b border-border/10">
                {item.period}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Inventory & Supply Section ──

function InventorySection({ data, t }: { data: InventoryData[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmInventorySupply', 'Inventory & Supply')} />
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {data.map((item) => {
          const style = levelColor(item.level);
          return (
            <div key={item.metric} className="bg-black px-2 py-1.5 hover:bg-rose-400/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
                  {item.metric}
                </span>
                <span className={`text-[6px] font-mono font-bold uppercase px-1 py-px ${style.bg} ${style.text}`}>
                  {item.level}
                </span>
              </div>
              <div className="text-[11px] font-mono font-bold text-white tabular-nums">
                {item.value}
              </div>
              <div className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(item.change)}`}>
                {fmtPct(item.change)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Homebuilder Stocks Section ──

function HomebuilderStocksSection({ data, t }: { data: HomebuilderStock[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmHomebuilderStocks', 'Homebuilder Stocks')} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className="text-left text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmSymbol', 'Symbol')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmPrice', 'Price')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmChgPct', 'Chg%')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmYTD', 'YTD')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmPE', 'P/E')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((stock) => (
            <tr key={stock.symbol} className="hover:bg-rose-400/[0.02] transition-colors">
              <td className="px-2 py-1 border-b border-border/10">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-bold text-white">{stock.symbol}</span>
                  <span className="text-[6px] font-mono text-neutral-600 truncate max-w-[80px]">{stock.name}</span>
                </div>
              </td>
              <td className="text-right text-[9px] font-mono font-bold text-white tabular-nums px-2 py-1 border-b border-border/10">
                ${fmtValue(stock.price)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(stock.changePct)}`}>
                {fmtPct(stock.changePct)}
              </td>
              <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(stock.ytd)}`}>
                {fmtPct(stock.ytd)}
              </td>
              <td className="text-right text-[8px] font-mono text-neutral-400 tabular-nums px-2 py-1 border-b border-border/10">
                {stock.pe.toFixed(1)}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Affordability Index Section ──

function AffordabilitySection({ data, t }: { data: AffordabilityEntry[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'hmAffordabilityIndex', 'Affordability Index')} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#0a0a0a]">
            <th className="text-left text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmRegion', 'Region')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmAIIndex', 'Index')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmChg', 'Chg')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmMedianPrice', 'Med Price')}
            </th>
            <th className="text-right text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-border/10">
              {tr(t, 'hmPriceIncome', 'P/I Ratio')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => {
            const affordable = entry.index >= 100;
            return (
              <tr key={entry.region} className="hover:bg-rose-400/[0.02] transition-colors">
                <td className="text-[8px] font-mono font-bold text-white/80 px-2 py-1 border-b border-border/10">
                  {entry.region}
                </td>
                <td className={`text-right text-[9px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${affordable ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.index.toFixed(1)}
                </td>
                <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${changeColor(entry.change)}`}>
                  {fmtPct(entry.change)}
                </td>
                <td className="text-right text-[8px] font-mono text-neutral-400 tabular-nums px-2 py-1 border-b border-border/10">
                  {entry.medianPrice}
                </td>
                <td className={`text-right text-[8px] font-mono font-bold tabular-nums px-2 py-1 border-b border-border/10 ${entry.ratio > 5 ? 'text-red-400' : entry.ratio > 4 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {entry.ratio.toFixed(2)}x
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Legend */}
      <div className="px-2 py-1 flex items-center gap-3 border-t border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'hmAffordNote', 'Index >100 = Affordable')}
        </span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'hmPINote', 'P/I <4x = Healthy')}
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function HousingMarketPanel() {
  const t = useT();
  const { data: hookData, isLoading, refetch } = useHousingMarket();

  const data: HousingMarketData = hookData ?? MOCK_DATA;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'hmHousingMarket', 'Housing Market')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 30Y rate badge */}
          {data.mortgageRates.length > 0 && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30">
              30Y: {fmtRate(data.mortgageRates[0].rate)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !hookData && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!hookData && !isLoading && (
          <>
            <HomePricesSection data={data.homePrices} t={t} />
            <MortgageRatesSection data={data.mortgageRates} t={t} />
            <HousingActivitySection data={data.housingActivity} t={t} />
            <InventorySection data={data.inventory} t={t} />
            <HomebuilderStocksSection data={data.homebuilderStocks} t={t} />
            <AffordabilitySection data={data.affordability} t={t} />
            {/* Timestamp */}
            <div className="px-3 py-1.5 border-t border-border/10">
              <span className="text-[7px] font-mono text-neutral-700">
                {tr(t, 'hmMockData', 'Displaying sample data')} &mdash; {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}

        {hookData && (
          <>
            <HomePricesSection data={data.homePrices} t={t} />
            <MortgageRatesSection data={data.mortgageRates} t={t} />
            <HousingActivitySection data={data.housingActivity} t={t} />
            <InventorySection data={data.inventory} t={t} />
            <HomebuilderStocksSection data={data.homebuilderStocks} t={t} />
            <AffordabilitySection data={data.affordability} t={t} />
            {/* Timestamp */}
            <div className="px-3 py-1.5 border-t border-border/10">
              <span className="text-[7px] font-mono text-neutral-700">
                {tr(t, 'hmLastUpdate', 'Last update')}: {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
