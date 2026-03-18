import { useState, useMemo } from 'react';
import {
  useGlobalRates,
  type CountryRate,
  type RateSpreadPair,
} from '../../api/hooks/use-global-rates';
import { useT } from '../../i18n';
import { Globe, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

type Region = 'ALL' | 'Americas' | 'Europe' | 'Asia Pacific' | 'Emerging';
type View = 'MATRIX' | 'CURVES' | 'SPREADS';

const REGIONS: { key: Region; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'Americas', label: 'AMERICAS' },
  { key: 'Europe', label: 'EUROPE' },
  { key: 'Asia Pacific', label: 'ASIA PAC' },
  { key: 'Emerging', label: 'EMERGING' },
];

const VIEWS: View[] = ['MATRIX', 'CURVES', 'SPREADS'];

const CURVE_COLORS = ['#06b6d4', '#22c55e', '#eab308', '#ef4444', '#a855f7'];

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtSpread(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}`;
}

// ── Color helpers ──

function yieldHeatColor(rate: number): string {
  // Gradient: low yields (0-1%) green-ish, mid (2-4%) yellow, high (5+%) red
  if (rate <= 0.5) return 'bg-green-500/20 text-green-400';
  if (rate <= 1.5) return 'bg-green-500/10 text-green-400';
  if (rate <= 2.5) return 'bg-yellow-500/10 text-yellow-300';
  if (rate <= 4.0) return 'bg-orange-500/10 text-orange-300';
  if (rate <= 6.0) return 'bg-red-500/10 text-red-400';
  return 'bg-red-500/20 text-red-300';
}

function spread2s10sColor(bps: number): string {
  if (bps > 20) return 'text-green-400 bg-green-500/10';
  if (bps > 0) return 'text-green-400/70 bg-green-500/5';
  if (bps > -20) return 'text-red-400/70 bg-red-500/5';
  return 'text-red-400 bg-red-500/10';
}

function changeColor(n: number): string {
  if (n > 1) return 'text-red-400';
  if (n > 0) return 'text-red-400/60';
  if (n < -1) return 'text-green-400';
  if (n < 0) return 'text-green-400/60';
  return 'text-neutral-500';
}

function spreadBarColor(bps: number): string {
  if (Math.abs(bps) > 300) return '#ef4444';
  if (Math.abs(bps) > 200) return '#f97316';
  if (Math.abs(bps) > 100) return '#eab308';
  return '#06b6d4';
}

// ── Main Panel ──

export function GlobalRatesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useGlobalRates();
  const [region, setRegion] = useState<Region>('ALL');
  const [view, setView] = useState<View>('MATRIX');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'DE', 'JP', 'GB', 'CN']);

  const filteredCountries = useMemo(() => {
    if (!data) return [];
    if (region === 'ALL') return data.countries;
    return data.countries.filter((c) => c.region === region);
  }, [data, region]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'grTitle', 'Global Rates')}
          </span>
          {data && (
            <span className="px-1.5 py-0.5 text-[7px] font-black font-mono bg-cyan-400/10 border border-cyan-400/30 text-cyan-400">
              AVG 10Y {fmtRate(data.globalAvg10y)}%
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Region filter + View tabs */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/20 shrink-0 bg-[#030303]">
        <div className="flex items-center gap-0.5">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRegion(r.key)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
                region === r.key
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
                view === v
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'grNoData', 'No data available')}
          </div>
        )}

        {data && view === 'MATRIX' && (
          <MatrixView countries={filteredCountries} t={t} />
        )}

        {data && view === 'CURVES' && (
          <CurvesView
            countries={data.countries}
            selectedCountries={selectedCountries}
            onToggle={(code) => {
              setSelectedCountries((prev) =>
                prev.includes(code) ? prev.filter((c) => c !== code) : prev.length < 5 ? [...prev, code] : prev,
              );
            }}
            t={t}
          />
        )}

        {data && view === 'SPREADS' && (
          <SpreadsView spreads={data.spreads} countries={filteredCountries} t={t} />
        )}
      </div>
    </div>
  );
}

// ── MATRIX VIEW ──

function MatrixView({
  countries,
  t,
}: {
  countries: CountryRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-[72px_52px_48px_48px_48px_48px_48px_52px_44px_44px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'grCountry', 'Country')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grPolicy', 'Policy')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">ON</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">2Y</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">5Y</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">10Y</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">30Y</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">2s10s</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grReal', 'Real')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">CPI</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grChg1D', '\u03941D')}
        </span>
      </div>

      {/* Country rows */}
      {countries.map((c) => (
        <div
          key={c.code}
          className="grid grid-cols-[72px_52px_48px_48px_48px_48px_48px_52px_44px_44px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          {/* Country */}
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono font-bold text-cyan-400">{c.code}</span>
            <span className="text-[7px] font-mono text-neutral-600 truncate">{c.country.length > 6 ? c.country.slice(0, 6) : c.country}</span>
          </div>

          {/* Policy */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.policyRate)}`}>
            {fmtRate(c.policyRate)}
          </span>

          {/* Overnight */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.overnight)}`}>
            {fmtRate(c.overnight)}
          </span>

          {/* 2Y */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.rate2y)}`}>
            {fmtRate(c.rate2y)}
          </span>

          {/* 5Y */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.rate5y)}`}>
            {fmtRate(c.rate5y)}
          </span>

          {/* 10Y */}
          <span className={`text-[8px] font-mono font-bold text-right px-0.5 ${yieldHeatColor(c.rate10y)}`}>
            {fmtRate(c.rate10y)}
          </span>

          {/* 30Y */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.rate30y)}`}>
            {fmtRate(c.rate30y)}
          </span>

          {/* 2s10s spread */}
          <span className={`text-[8px] font-mono font-bold text-right px-0.5 ${spread2s10sColor(c.spread2s10s)}`}>
            {fmtSpread(c.spread2s10s)}
          </span>

          {/* Real rate */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${c.realRate10y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtRate(c.realRate10y)}
          </span>

          {/* CPI */}
          <span className={`text-[8px] font-mono text-right px-0.5 ${yieldHeatColor(c.inflation)}`}>
            {fmtRate(c.inflation)}
          </span>

          {/* 10Y 1D change badge */}
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(c.change10y1d)}`}>
            {fmtBps(c.change10y1d)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CURVES VIEW ──

function CurvesView({
  countries,
  selectedCountries,
  onToggle,
  t,
}: {
  countries: CountryRate[];
  selectedCountries: string[];
  onToggle: (code: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const selected = useMemo(
    () => countries.filter((c) => selectedCountries.includes(c.code)),
    [countries, selectedCountries],
  );

  return (
    <div>
      {/* Country checkboxes */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border/20">
        {countries.map((c, idx) => {
          const isSelected = selectedCountries.includes(c.code);
          const colorIdx = isSelected ? selectedCountries.indexOf(c.code) : -1;
          return (
            <button
              key={c.code}
              onClick={() => onToggle(c.code)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase transition-colors ${
                isSelected
                  ? 'bg-cyan-400/10 border border-cyan-400/30'
                  : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
              }`}
              style={isSelected && colorIdx >= 0 ? { color: CURVE_COLORS[colorIdx] } : undefined}
            >
              {c.code}
            </button>
          );
        })}
      </div>

      {/* Yield curve SVG */}
      <div className="px-3 py-2">
        <YieldCurveSVG countries={selected} selectedCodes={selectedCountries} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-3 pb-2">
        {selected.map((c, idx) => (
          <div key={c.code} className="flex items-center gap-1">
            <div className="w-3 h-[2px]" style={{ backgroundColor: CURVE_COLORS[selectedCountries.indexOf(c.code)] }} />
            <span className="text-[7px] font-mono text-neutral-400">
              {c.code} ({fmtRate(c.rate10y)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldCurveSVG({
  countries,
  selectedCodes,
}: {
  countries: CountryRate[];
  selectedCodes: string[];
}) {
  const W = 400;
  const H = 180;
  const PAD = { top: 15, right: 15, bottom: 25, left: 35 };
  const TENORS = ['ON', '2Y', '5Y', '10Y', '30Y'];
  const tenorX = TENORS.map((_, i) => PAD.left + (i / (TENORS.length - 1)) * (W - PAD.left - PAD.right));

  // Get all yields to determine Y range
  const allYields = countries.flatMap((c) => [c.overnight, c.rate2y, c.rate5y, c.rate10y, c.rate30y]);
  const minY = allYields.length > 0 ? Math.floor(Math.min(...allYields) * 2) / 2 : 0;
  const maxY = allYields.length > 0 ? Math.ceil(Math.max(...allYields) * 2) / 2 + 0.5 : 5;
  const rangeY = maxY - minY || 1;

  const scaleY = (v: number) => PAD.top + ((maxY - v) / rangeY) * (H - PAD.top - PAD.bottom);

  // Grid lines
  const gridLines: number[] = [];
  for (let y = Math.ceil(minY); y <= maxY; y += 1) {
    gridLines.push(y);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid */}
      {gridLines.map((y) => (
        <g key={y}>
          <line
            x1={PAD.left}
            y1={scaleY(y)}
            x2={W - PAD.right}
            y2={scaleY(y)}
            stroke="#333"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
          <text x={PAD.left - 4} y={scaleY(y) + 3} fill="#666" fontSize={7} fontFamily="monospace" textAnchor="end">
            {y}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {TENORS.map((label, i) => (
        <text
          key={label}
          x={tenorX[i]}
          y={H - 5}
          fill="#666"
          fontSize={7}
          fontFamily="monospace"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      {/* Curves */}
      {countries.map((c) => {
        const colorIdx = selectedCodes.indexOf(c.code);
        const color = CURVE_COLORS[colorIdx >= 0 ? colorIdx : 0];
        const yields = [c.overnight, c.rate2y, c.rate5y, c.rate10y, c.rate30y];
        const path = yields
          .map((y, i) => `${i === 0 ? 'M' : 'L'} ${tenorX[i].toFixed(1)},${scaleY(y).toFixed(1)}`)
          .join(' ');

        return (
          <g key={c.code}>
            <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
            {yields.map((y, i) => (
              <circle key={i} cx={tenorX[i]} cy={scaleY(y)} r={2} fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── SPREADS VIEW ──

function SpreadsView({
  spreads,
  countries,
  t,
}: {
  spreads: RateSpreadPair[];
  countries: CountryRate[];
  t: ReturnType<typeof useT>;
}) {
  // Spreads vs US 10Y
  const usRate = countries.find((c) => c.code === 'US');
  const spreadVsUS = useMemo(() => {
    if (!usRate) return [];
    return countries
      .filter((c) => c.code !== 'US')
      .map((c) => ({
        code: c.code,
        country: c.country,
        spread: Math.round((c.rate10y - usRate.rate10y) * 100), // bps
      }))
      .sort((a, b) => b.spread - a.spread);
  }, [countries, usRate]);

  const maxAbsSpread = useMemo(
    () => Math.max(...spreadVsUS.map((s) => Math.abs(s.spread)), 1),
    [spreadVsUS],
  );

  return (
    <div>
      {/* Key spread pairs table */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'grKeySpreads', 'Key Spread Pairs')}
        </span>
      </div>

      {/* Spread pairs header */}
      <div className="grid grid-cols-[120px_72px_56px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'grPair', 'Pair')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grChg1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'grChg1W', '\u03941W')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">
          {tr(t, 'grTrend', 'Trend')}
        </span>
      </div>

      {spreads.map((sp) => (
        <div
          key={sp.name}
          className="grid grid-cols-[120px_72px_56px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{sp.name}</span>
          <span className="text-[9px] font-mono font-bold text-cyan-400 text-right">
            {fmtSpread(sp.spread)} bps
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(sp.change1d)}`}>
            {fmtBps(sp.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(sp.change1w)}`}>
            {fmtBps(sp.change1w)}
          </span>
          <div className="flex justify-end pr-1">
            <MiniSparkline data={sp.history} />
          </div>
        </div>
      ))}

      {/* Horizontal bar chart: 10Y Spreads vs US */}
      <div className="px-3 py-1 border-b border-border/10 border-t border-border/10 mt-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'grSpreadVsUS', '10Y Spread vs US (bps)')}
        </span>
      </div>

      <div className="px-2 py-1">
        {spreadVsUS.map((s) => {
          const pct = (Math.abs(s.spread) / maxAbsSpread) * 100;
          const isPositive = s.spread >= 0;

          return (
            <div
              key={s.code}
              className="flex items-center gap-1 py-[2px] hover:bg-cyan-400/[0.02] transition-colors"
            >
              <span className="text-[7px] font-mono font-bold text-neutral-400 w-8 text-right shrink-0">
                {s.code}
              </span>
              <div className="flex-1 flex items-center h-[10px] relative">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-800" />
                {/* Bar */}
                <div
                  className="absolute h-[8px] top-[1px]"
                  style={{
                    backgroundColor: spreadBarColor(s.spread),
                    width: `${pct * 0.45}%`,
                    left: isPositive ? '50%' : undefined,
                    right: !isPositive ? '50%' : undefined,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span
                className="text-[7px] font-mono font-bold w-10 text-right shrink-0"
                style={{ color: spreadBarColor(s.spread) }}
              >
                {fmtSpread(s.spread)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini Sparkline (SVG) ──

function MiniSparkline({ data }: { data: number[] }) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const W = 48;
    const H = 14;
    const PAD = 1;

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    return { linePath, W, H };
  }, [data]);

  if (!path) return null;

  // Color based on trend: last > first = rising = cyan, else = yellow
  const rising = data[data.length - 1] > data[0];
  const color = rising ? '#06b6d4' : '#eab308';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={48} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}
