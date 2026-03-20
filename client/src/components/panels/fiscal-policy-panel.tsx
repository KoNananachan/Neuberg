import { useState } from 'react';
import { useFiscalPolicy } from '../../api/hooks/use-fiscal-policy';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtSignedPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function fmtTrillions(n: number): string {
  return '$' + n.toFixed(1) + 'T';
}

// ── Color helpers ──

function balanceColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-400';
}

function debtIntensityColor(debtToGdp: number): string {
  if (debtToGdp >= 120) return 'text-red-400';
  if (debtToGdp >= 90) return 'text-orange-400';
  if (debtToGdp >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

function debtIntensityBg(debtToGdp: number): string {
  if (debtToGdp >= 120) return 'bg-red-400/15';
  if (debtToGdp >= 90) return 'bg-orange-400/10';
  if (debtToGdp >= 60) return 'bg-yellow-400/10';
  return 'bg-green-400/10';
}

function fiscalStatusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'EXPANSIONARY' || s === 'STIMULUS') return 'text-green-400';
  if (s === 'CONTRACTIONARY' || s === 'AUSTERITY') return 'text-red-400';
  if (s === 'NEUTRAL') return 'text-neutral-400';
  return 'text-amber-400';
}

function fiscalStatusBg(status: string): string {
  const s = status.toUpperCase();
  if (s === 'EXPANSIONARY' || s === 'STIMULUS') return 'bg-green-400/10';
  if (s === 'CONTRACTIONARY' || s === 'AUSTERITY') return 'bg-red-400/10';
  if (s === 'NEUTRAL') return 'bg-neutral-400/10';
  return 'bg-amber-400/10';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Spending category colors ──

const SPENDING_COLORS: Record<string, string> = {
  defense: '#f87171',
  healthcare: '#34d399',
  education: '#60a5fa',
  socialSecurity: '#fbbf24',
  infrastructure: '#a78bfa',
  interest: '#f472b6',
};

const SPENDING_LABELS: Record<string, string> = {
  defense: 'DEF',
  healthcare: 'HLTH',
  education: 'EDU',
  socialSecurity: 'SOC',
  infrastructure: 'INFRA',
  interest: 'INT',
};

// ── Interfaces ──

interface FiscalSummary {
  globalAvgDeficit: number;
  totalDebtLevels: number;
  countriesTracked: number;
  avgDebtToGdp: number;
}

interface FiscalCountry {
  country: string;
  countryCode: string;
  budgetBalance: number;
  taxRevenue: number;
  govtSpending: number;
  debtToGdp: number;
  fiscalStatus: string;
  spending: {
    defense: number;
    healthcare: number;
    education: number;
    socialSecurity: number;
    infrastructure: number;
    interest: number;
  };
  revenue: {
    incomeTax: number;
    corporateTax: number;
    vat: number;
    socialContributions: number;
  };
  quarterlyTrend: number[];
}

// ── Main Panel ──

export function FiscalPolicyPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useFiscalPolicy();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const summary = data?.summary as FiscalSummary | undefined;
  const countries = data?.countries as FiscalCountry[] | undefined;

  const selectedCountry = countries?.find((c) => c.country === hoveredCountry) ?? countries?.[0];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-emerald-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'panelFiscalPolicy', 'Fiscal Policy Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING FISCAL DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            ERROR LOADING FISCAL DATA
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} />}
            {countries && countries.length > 0 && (
              <CountryTableSection
                countries={countries}
                hoveredCountry={hoveredCountry}
                onHover={setHoveredCountry}
              />
            )}
            {selectedCountry && (
              <SpendingBreakdownSection country={selectedCountry} />
            )}
            {selectedCountry && (
              <RevenueBreakdownSection country={selectedCountry} />
            )}
            {countries && countries.length > 0 && (
              <QuarterlyTrendSection countries={countries} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: FiscalSummary }) {
  return (
    <div className="border-b border-emerald-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-emerald-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Global Avg Deficit
          </div>
          <div className={`text-[10px] font-mono font-bold ${balanceColor(summary.globalAvgDeficit)}`}>
            {fmtSignedPct(summary.globalAvgDeficit)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Total Debt
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtTrillions(summary.totalDebtLevels)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Countries
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-400">
            {summary.countriesTracked}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            Avg Debt/GDP
          </div>
          <div className={`text-[10px] font-mono font-bold ${debtIntensityColor(summary.avgDebtToGdp)}`}>
            {fmtPct(summary.avgDebtToGdp)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Country Table Section ──

function CountryTableSection({
  countries,
  hoveredCountry,
  onHover,
}: {
  countries: FiscalCountry[];
  hoveredCountry: string | null;
  onHover: (country: string | null) => void;
}) {
  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Country Fiscal Overview
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_52px_52px_56px_64px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Country
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Budget %
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Tax Rev
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Spend
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          Debt/GDP
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">
          Status
        </span>
      </div>

      {/* Rows */}
      {countries.map((c, i) => (
        <div
          key={`${c.country}-${i}`}
          className={`grid grid-cols-[1fr_56px_52px_52px_56px_64px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center cursor-pointer ${
            hoveredCountry === c.country ? 'bg-emerald-400/[0.04]' : ''
          }`}
          onMouseEnter={() => onHover(c.country)}
          onMouseLeave={() => onHover(null)}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-neutral-600">
              {c.countryCode}
            </span>
            <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
              {c.country}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right ${balanceColor(c.budgetBalance)}`}>
            {fmtSignedPct(c.budgetBalance)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(c.taxRevenue)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(c.govtSpending)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${debtIntensityColor(c.debtToGdp)}`}>
            <span className={`inline-block px-1 py-0.5 ${debtIntensityBg(c.debtToGdp)}`}>
              {fmtPct(c.debtToGdp)}
            </span>
          </span>
          <span className="flex items-center justify-center pr-2">
            <span
              className={`px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider ${fiscalStatusColor(c.fiscalStatus)} ${fiscalStatusBg(c.fiscalStatus)}`}
            >
              {c.fiscalStatus}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Spending Breakdown Mini Bar Chart ──

function SpendingBreakdownSection({ country }: { country: FiscalCountry }) {
  const spending = country.spending;
  const entries = Object.entries(spending) as [string, number][];
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Spending Breakdown
          </span>
          <span className="text-[7px] font-mono text-emerald-400">
            {country.country}
          </span>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-end gap-1 h-12">
          {entries.map(([key, value]) => {
            const height = maxVal > 0 ? (value / maxVal) * 100 : 0;
            const color = SPENDING_COLORS[key] || '#6b7280';
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[6px] font-mono text-neutral-500">
                  {fmtPct(value)}
                </span>
                <div className="w-full relative" style={{ height: '32px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      minHeight: value > 0 ? '2px' : '0px',
                    }}
                  />
                </div>
                <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
                  {SPENDING_LABELS[key] || key.slice(0, 4).toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Revenue Breakdown Section ──

function RevenueBreakdownSection({ country }: { country: FiscalCountry }) {
  const revenue = country.revenue;
  const entries: [string, string, number][] = [
    ['incomeTax', 'Income Tax', revenue.incomeTax],
    ['corporateTax', 'Corporate Tax', revenue.corporateTax],
    ['vat', 'VAT / Sales Tax', revenue.vat],
    ['socialContributions', 'Social Contrib.', revenue.socialContributions],
  ];
  const total = entries.reduce((sum, [, , v]) => sum + v, 0);

  return (
    <div className="border-b border-emerald-400/30">
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            Revenue Breakdown
          </span>
          <span className="text-[7px] font-mono text-emerald-400">
            {country.country}
          </span>
        </div>
      </div>

      {entries.map(([key, label, value]) => {
        const barWidth = total > 0 ? Math.min((value / total) * 100, 100) : 0;
        return (
          <div
            key={key}
            className="px-3 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-mono text-neutral-400 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-[8px] font-mono font-bold text-white">
                {fmtPct(value)}
              </span>
            </div>
            <div className="w-full h-1 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-emerald-400"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Quarterly Trend Section ──

function QuarterlyTrendSection({ countries }: { countries: FiscalCountry[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-emerald-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Quarterly Budget Balance Trend
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_40px] gap-0 px-2 py-0.5 border-b border-emerald-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          Country
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          Trend (4Q)
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          Dir
        </span>
      </div>

      {countries.map((c, i) => {
        const trend = c.quarterlyTrend || [];
        const lastVal = trend.length > 0 ? trend[trend.length - 1] : 0;
        const firstVal = trend.length > 0 ? trend[0] : 0;
        const direction = lastVal - firstVal;

        return (
          <div
            key={`trend-${c.country}-${i}`}
            className="grid grid-cols-[1fr_120px_40px] gap-0 px-2 py-[3px] border-b border-emerald-400/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
              {c.country}
            </span>
            <div className="flex items-center justify-center">
              <MiniSparkline data={trend} />
            </div>
            <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(direction)}`}>
              {trendArrow(direction)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini Sparkline SVG ──

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) {
    return (
      <span className="text-[7px] font-mono text-neutral-600">--</span>
    );
  }

  const width = 100;
  const height = 16;
  const padding = 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const zeroY = padding + (1 - (0 - min) / range) * (height - padding * 2);
  const clampedZeroY = Math.max(padding, Math.min(height - padding, zeroY));

  const lastVal = data[data.length - 1];
  const lineColor = lastVal >= 0 ? '#34d399' : '#f87171';

  return (
    <svg width={width} height={height} className="block">
      {/* Zero line */}
      <line
        x1={padding}
        y1={clampedZeroY}
        x2={width - padding}
        y2={clampedZeroY}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.5}
        strokeDasharray="2,2"
      />
      {/* Sparkline */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* End dot */}
      {points.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r={1.5}
          fill={lineColor}
        />
      )}
    </svg>
  );
}
