import { useAgriculturalCommodities } from '../../api/hooks/use-agricultural-commodities';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Formatting helpers --

function fmtNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

// -- Accent --

const ACCENT = '#a3e635'; // lime-400

// -- Fallback data --

const FALLBACK_GRAINS = [
  { name: 'Corn', symbol: 'ZC', price: 4.52, unit: '$/bu', change: -0.08, changePct: -1.74 },
  { name: 'Soybeans', symbol: 'ZS', price: 12.38, unit: '$/bu', change: 0.15, changePct: 1.23 },
  { name: 'Wheat (SRW)', symbol: 'ZW', price: 5.89, unit: '$/bu', change: -0.12, changePct: -2.00 },
  { name: 'Wheat (HRW)', symbol: 'KE', price: 6.15, unit: '$/bu', change: -0.09, changePct: -1.44 },
  { name: 'Soybean Oil', symbol: 'ZL', price: 46.32, unit: '\u00A2/lb', change: 0.58, changePct: 1.27 },
  { name: 'Soybean Meal', symbol: 'ZM', price: 348.60, unit: '$/st', change: -2.40, changePct: -0.68 },
  { name: 'Oats', symbol: 'ZO', price: 3.78, unit: '$/bu', change: 0.04, changePct: 1.07 },
  { name: 'Rice (Rough)', symbol: 'ZR', price: 17.25, unit: '$/cwt', change: 0.22, changePct: 1.29 },
];

const FALLBACK_SOFTS = [
  { name: 'Coffee (Arabica)', symbol: 'KC', price: 1.9500, unit: '$/lb', change: 0.0345, changePct: 1.80 },
  { name: 'Sugar #11', symbol: 'SB', price: 26.50, unit: '\u00A2/lb', change: -0.38, changePct: -1.41 },
  { name: 'Cocoa', symbol: 'CC', price: 6800, unit: '$/mt', change: 125, changePct: 1.87 },
  { name: 'Cotton #2', symbol: 'CT', price: 82.45, unit: '\u00A2/lb', change: -0.72, changePct: -0.87 },
  { name: 'Orange Juice', symbol: 'OJ', price: 4.25, unit: '$/lb', change: 0.08, changePct: 1.92 },
  { name: 'Lumber', symbol: 'LBS', price: 548.00, unit: '$/mbf', change: -8.50, changePct: -1.53 },
];

const FALLBACK_USDA = [
  { commodity: 'Corn', globalProd: 1210.5, globalConsumption: 1195.8, endingStocks: 312.4, stocksToUse: 25.2, prodChange: 1.8 },
  { commodity: 'Soybeans', globalProd: 398.2, globalConsumption: 386.5, endingStocks: 114.6, stocksToUse: 28.8, prodChange: 2.3 },
  { commodity: 'Wheat', globalProd: 789.4, globalConsumption: 795.1, endingStocks: 265.3, stocksToUse: 33.4, prodChange: -0.6 },
  { commodity: 'Rice', globalProd: 520.8, globalConsumption: 518.2, endingStocks: 172.5, stocksToUse: 33.1, prodChange: 0.9 },
  { commodity: 'Cotton', globalProd: 25.4, globalConsumption: 26.1, endingStocks: 17.8, stocksToUse: 68.2, prodChange: -1.2 },
];

const FALLBACK_EXPORTS = [
  { commodity: 'Corn', weeklyInspections: 1245, prevWeek: 1180, marketYear: 22450, prevYear: 20890, yearPct: 7.5 },
  { commodity: 'Soybeans', weeklyInspections: 680, prevWeek: 725, marketYear: 41250, prevYear: 39800, yearPct: 3.6 },
  { commodity: 'Wheat', weeklyInspections: 385, prevWeek: 410, marketYear: 15680, prevYear: 16200, yearPct: -3.2 },
  { commodity: 'Sorghum', weeklyInspections: 142, prevWeek: 128, marketYear: 4580, prevYear: 3950, yearPct: 15.9 },
];

const FALLBACK_CROP_CONDITIONS = [
  { crop: 'Corn', excellent: 12, good: 53, fair: 25, poor: 7, veryPoor: 3, goodExcellent: 65, prevWeek: 64, prevYear: 61 },
  { crop: 'Soybeans', excellent: 10, good: 52, fair: 26, poor: 8, veryPoor: 4, goodExcellent: 62, prevWeek: 63, prevYear: 59 },
  { crop: 'Winter Wheat', excellent: 8, good: 42, fair: 30, poor: 13, veryPoor: 7, goodExcellent: 50, prevWeek: 51, prevYear: 48 },
  { crop: 'Spring Wheat', excellent: 11, good: 47, fair: 28, poor: 10, veryPoor: 4, goodExcellent: 58, prevWeek: 57, prevYear: 55 },
  { crop: 'Cotton', excellent: 7, good: 38, fair: 32, poor: 15, veryPoor: 8, goodExcellent: 45, prevWeek: 46, prevYear: 42 },
];

const FALLBACK_WEATHER = [
  { region: 'US Corn Belt', condition: 'Favorable', severity: 'low', temp: 'Normal', precip: 'Adequate', impact: 'Above-avg soil moisture supporting emergence' },
  { region: 'US Southern Plains', condition: 'Drought Stress', severity: 'high', temp: 'Above Normal', precip: 'Below Normal', impact: 'HRW wheat yields at risk, D2-D3 drought' },
  { region: 'Brazil (Mato Grosso)', condition: 'Mostly Favorable', severity: 'low', temp: 'Normal', precip: 'Above Normal', impact: 'Safrinha corn planting on track' },
  { region: 'Argentina (Pampas)', condition: 'Moderate Concern', severity: 'moderate', temp: 'Above Normal', precip: 'Below Normal', impact: 'Soybean pod fill under heat stress' },
  { region: 'EU (France/Germany)', condition: 'Mixed', severity: 'moderate', temp: 'Below Normal', precip: 'Above Normal', impact: 'Cool wet spring delaying wheat development' },
  { region: 'Black Sea (Ukraine)', condition: 'Favorable', severity: 'low', temp: 'Normal', precip: 'Adequate', impact: 'Winter wheat breaking dormancy normally' },
  { region: 'India (Punjab)', condition: 'Heat Risk', severity: 'high', temp: 'Well Above Normal', precip: 'Below Normal', impact: 'Wheat harvest accelerated, terminal heat threat' },
  { region: 'Australia (NSW/VIC)', condition: 'Favorable', severity: 'low', temp: 'Normal', precip: 'Normal', impact: 'Early planting window open, good subsoil moisture' },
];

// -- Main Panel --

export function AgriculturalCommoditiesPanel() {
  const t = useT();
  const { data, isLoading } = useAgriculturalCommodities();

  const grains = data?.grains ?? FALLBACK_GRAINS;
  const softs = data?.softs ?? FALLBACK_SOFTS;
  const usda = data?.usda ?? FALLBACK_USDA;
  const exports = data?.exports ?? FALLBACK_EXPORTS;
  const cropConditions = data?.cropConditions ?? FALLBACK_CROP_CONDITIONS;
  const weather = data?.weather ?? FALLBACK_WEATHER;

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2">
          <div className="w-4 h-4 border border-amber-400/40 border-t-amber-400 animate-spin" />
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
            {tr(t, 'loadingAgriculturalData', 'LOADING AGRICULTURAL DATA...')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
          {tr(t, 'agriculturalCommodities', 'AGRICULTURAL COMMODITIES')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {tr(t, 'usdaCftc', 'USDA / CFTC')}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">

        {/* ── GRAIN PRICES ── */}
        <SectionHeader label={tr(t, 'grainPrices', 'GRAIN PRICES')} />
        <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.5fr] px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <ColHeader>CONTRACT</ColHeader>
          <ColHeader align="right">PRICE</ColHeader>
          <ColHeader align="right">CHG</ColHeader>
          <ColHeader align="right">CHG%</ColHeader>
          <ColHeader align="right">UNIT</ColHeader>
        </div>
        {grains.map((g: any) => (
          <div
            key={g.symbol}
            className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.5fr] px-2 py-1 border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold text-white leading-tight">{g.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 leading-tight">{g.symbol}</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-white/80 text-right self-center">{fmtPrice(g.price)}</span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${g.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {g.change >= 0 ? '+' : ''}{g.change.toFixed(2)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${g.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(g.changePct)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right self-center">{g.unit}</span>
          </div>
        ))}

        {/* ── SOFT COMMODITIES ── */}
        <SectionHeader label={tr(t, 'softCommodities', 'SOFT COMMODITIES')} />
        <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.5fr] px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <ColHeader>CONTRACT</ColHeader>
          <ColHeader align="right">PRICE</ColHeader>
          <ColHeader align="right">CHG</ColHeader>
          <ColHeader align="right">CHG%</ColHeader>
          <ColHeader align="right">UNIT</ColHeader>
        </div>
        {softs.map((s: any) => (
          <div
            key={s.symbol}
            className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.5fr] px-2 py-1 border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold text-white leading-tight">{s.name}</span>
              <span className="text-[7px] font-mono text-neutral-600 leading-tight">{s.symbol}</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-white/80 text-right self-center">{fmtPrice(s.price)}</span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {s.change >= 0 ? '+' : ''}{typeof s.change === 'number' && Math.abs(s.change) < 1 ? s.change.toFixed(4) : s.change.toFixed(2)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${s.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(s.changePct)}
            </span>
            <span className="text-[8px] font-mono text-neutral-500 text-right self-center">{s.unit}</span>
          </div>
        ))}

        {/* ── USDA SUPPLY/DEMAND ── */}
        <SectionHeader label={tr(t, 'usdaSupplyDemand', 'USDA SUPPLY / DEMAND (WASDE)')} />
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1 text-left">COMMODITY</th>
              <th className="px-2 py-1 text-right">PROD (M MT)</th>
              <th className="px-2 py-1 text-right">CONSUMP</th>
              <th className="px-2 py-1 text-right">END STOCKS</th>
              <th className="px-2 py-1 text-right">STK/USE %</th>
              <th className="px-2 py-1 text-right">PROD CHG</th>
            </tr>
          </thead>
          <tbody>
            {usda.map((u: any) => {
              const isTight = u.stocksToUse < 20;
              const isLoose = u.stocksToUse > 35;
              return (
                <tr key={u.commodity} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                  <td className="px-2 py-1 font-bold" style={{ color: ACCENT }}>{u.commodity}</td>
                  <td className="px-2 py-1 text-right text-white/80">{fmtNumber(u.globalProd)}</td>
                  <td className="px-2 py-1 text-right text-white/60">{fmtNumber(u.globalConsumption)}</td>
                  <td className="px-2 py-1 text-right text-white/60">{fmtNumber(u.endingStocks)}</td>
                  <td className={`px-2 py-1 text-right font-bold ${isTight ? 'text-red-400' : isLoose ? 'text-green-400' : 'text-amber-400'}`}>
                    {u.stocksToUse.toFixed(1)}%
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${u.prodChange >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {u.prodChange >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(u.prodChange)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── EXPORT INSPECTIONS ── */}
        <SectionHeader label={tr(t, 'exportInspections', 'EXPORT INSPECTIONS (THOUSAND MT)')} />
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1 text-left">COMMODITY</th>
              <th className="px-2 py-1 text-right">WEEKLY</th>
              <th className="px-2 py-1 text-right">PREV WK</th>
              <th className="px-2 py-1 text-right">MKT YEAR</th>
              <th className="px-2 py-1 text-right">PREV YR</th>
              <th className="px-2 py-1 text-right">YOY %</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((e: any) => (
              <tr key={e.commodity} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                <td className="px-2 py-1 font-bold" style={{ color: ACCENT }}>{e.commodity}</td>
                <td className="px-2 py-1 text-right text-white/80 font-bold">{fmtNumber(e.weeklyInspections)}</td>
                <td className="px-2 py-1 text-right text-white/40">{fmtNumber(e.prevWeek)}</td>
                <td className="px-2 py-1 text-right text-white/80">{fmtNumber(e.marketYear)}</td>
                <td className="px-2 py-1 text-right text-white/40">{fmtNumber(e.prevYear)}</td>
                <td className={`px-2 py-1 text-right font-bold ${e.yearPct >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                  {e.yearPct >= 0 ? '\u25B2' : '\u25BC'} {fmtPct(e.yearPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── CROP CONDITIONS ── */}
        <SectionHeader label={tr(t, 'cropConditions', 'CROP CONDITIONS (% OF PLANTED AREA)')} />
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-[7px] font-black text-neutral-500 uppercase tracking-wider border-b border-border/10">
            <tr>
              <th className="px-2 py-1 text-left">CROP</th>
              <th className="px-2 py-1 text-right">EXCL</th>
              <th className="px-2 py-1 text-right">GOOD</th>
              <th className="px-2 py-1 text-right">FAIR</th>
              <th className="px-2 py-1 text-right">POOR</th>
              <th className="px-2 py-1 text-right">V.POOR</th>
              <th className="px-2 py-1 text-right">G/E %</th>
              <th className="px-2 py-1 text-right">WK CHG</th>
              <th className="px-2 py-1 text-right">YOY</th>
            </tr>
          </thead>
          <tbody>
            {cropConditions.map((c: any) => {
              const geChange = c.goodExcellent - c.prevWeek;
              const yoyChange = c.goodExcellent - c.prevYear;
              return (
                <tr key={c.crop} className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors">
                  <td className="px-2 py-1 font-bold" style={{ color: ACCENT }}>{c.crop}</td>
                  <td className="px-2 py-1 text-right text-green-400/80">{c.excellent}%</td>
                  <td className="px-2 py-1 text-right text-green-400/60">{c.good}%</td>
                  <td className="px-2 py-1 text-right text-amber-400/60">{c.fair}%</td>
                  <td className="px-2 py-1 text-right text-red-400/60">{c.poor}%</td>
                  <td className="px-2 py-1 text-right text-red-400/80">{c.veryPoor}%</td>
                  <td className="px-2 py-1 text-right font-bold text-white/90">{c.goodExcellent}%</td>
                  <td className={`px-2 py-1 text-right font-bold ${geChange >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {geChange >= 0 ? '+' : ''}{geChange}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${yoyChange >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                    {yoyChange >= 0 ? '+' : ''}{yoyChange}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── WEATHER IMPACT ── */}
        <SectionHeader label={tr(t, 'weatherImpact', 'WEATHER IMPACT')} />
        <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_1.5fr] px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <ColHeader>REGION</ColHeader>
          <ColHeader>CONDITION</ColHeader>
          <ColHeader>TEMP</ColHeader>
          <ColHeader>PRECIP</ColHeader>
          <ColHeader>IMPACT</ColHeader>
        </div>
        {weather.map((w: any) => {
          const severityColor = w.severity === 'high' ? 'text-red-400' : w.severity === 'moderate' ? 'text-amber-400' : 'text-green-400';
          const severityBg = w.severity === 'high' ? 'bg-red-500/10 border-red-500/20' : w.severity === 'moderate' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20';
          return (
            <div
              key={w.region}
              className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_1.5fr] px-2 py-1.5 border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>{w.region}</span>
              <div className="flex items-center">
                <span className={`px-1 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider border ${severityBg} ${severityColor}`}>
                  {w.condition}
                </span>
              </div>
              <span className="text-[8px] font-mono text-white/60 self-center">{w.temp}</span>
              <span className="text-[8px] font-mono text-white/60 self-center">{w.precip}</span>
              <span className="text-[8px] font-mono text-neutral-400 self-center leading-tight">{w.impact}</span>
            </div>
          );
        })}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// -- Shared sub-components --

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 py-1.5 bg-[#080808] border-y border-border/20 mt-0 first:mt-0">
      <span className="text-[8px] font-mono font-black uppercase tracking-wider text-lime-400/80">
        {label}
      </span>
    </div>
  );
}

function ColHeader({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <span className={`text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    }`}>
      {children}
    </span>
  );
}
