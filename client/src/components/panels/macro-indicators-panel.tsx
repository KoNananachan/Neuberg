import { useMacroIndicators } from '../../api/hooks/use-macro-indicators';
import { useT } from '../../i18n';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ACCENT = '#4ade80'; // green-400
const ACCENT_DIM = 'rgba(74,222,128,0.08)';

// ── Color Helpers ──

function surpriseColor(val: number): string {
  if (val > 0) return 'text-green-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function surpriseColorHex(val: number): string {
  if (val > 0) return '#4ade80';
  if (val < 0) return '#f87171';
  return '#737373';
}

function fmtSigned(n: number, decimals = 2): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
}

function importanceBadge(level: string): { text: string; cls: string } {
  switch (level?.toUpperCase()) {
    case 'HIGH': return { text: 'HIGH', cls: 'text-red-400 bg-red-500/15' };
    case 'MED': case 'MEDIUM': return { text: 'MED', cls: 'text-yellow-400 bg-yellow-500/15' };
    default: return { text: 'LOW', cls: 'text-neutral-500 bg-neutral-500/10' };
  }
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20">
      <div className="w-1 h-2.5 shrink-0 bg-green-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-wider text-green-400">
        {title}
      </span>
    </div>
  );
}

// ── Key Indicators Section ──

function KeyIndicatorsSection({ indicators }: { indicators: any[] }) {
  const t = useT();

  if (!indicators || indicators.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'miKeyIndicators', 'Key Indicators')} />

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'miIndicator', 'Indicator')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miActual', 'Actual')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miForecast', 'Fcst')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miPrevious', 'Prev')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miSurprise', 'Surprise')}
        </span>
      </div>

      {/* Rows */}
      {indicators.map((ind: any, i: number) => {
        const surprise = ind.surprise ?? (ind.actual != null && ind.forecast != null ? ind.actual - ind.forecast : null);
        const beat = surprise != null && surprise > 0;
        const miss = surprise != null && surprise < 0;

        return (
          <div
            key={`${ind.name}-${i}`}
            className="grid grid-cols-[1fr_52px_52px_52px_52px] gap-0 px-2 py-[3px] hover:bg-green-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[9px] font-mono font-bold text-neutral-200 truncate">
              {ind.name || '--'}
            </span>

            <span className="text-[9px] font-mono font-black text-white text-right tabular-nums">
              {ind.actual != null ? ind.actual : '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-500 text-right tabular-nums">
              {ind.forecast != null ? ind.forecast : '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-500 text-right tabular-nums">
              {ind.previous != null ? ind.previous : '--'}
            </span>

            <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
              beat ? 'text-green-400' : miss ? 'text-red-400' : 'text-neutral-500'
            }`}>
              {surprise != null ? fmtSigned(surprise) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Country Comparison Section ──

function CountryComparisonSection({ countries }: { countries: any[] }) {
  const t = useT();

  if (!countries || countries.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'miCountryComparison', 'Country Comparison')} />

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'miCountry', 'Country')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miGdp', 'GDP')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miInflation', 'CPI')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miUnemployment', 'Unemp')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miPmi', 'PMI')}
        </span>
      </div>

      {/* Rows */}
      {countries.map((c: any, i: number) => (
        <div
          key={`${c.country}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-0 px-2 py-[3px] hover:bg-green-400/[0.02] border-b border-border/20 items-center"
        >
          <span className="text-[9px] font-mono font-bold text-neutral-200 truncate">
            {c.country || c.name || '--'}
          </span>

          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            c.gdp != null && c.gdp > 0 ? 'text-green-400' : c.gdp != null && c.gdp < 0 ? 'text-red-400' : 'text-neutral-400'
          }`}>
            {c.gdp != null ? `${c.gdp}%` : '--'}
          </span>

          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            c.inflation != null && c.inflation > 3 ? 'text-red-400' : c.inflation != null && c.inflation <= 2 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {c.inflation != null ? `${c.inflation}%` : '--'}
          </span>

          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            c.unemployment != null && c.unemployment > 6 ? 'text-red-400' : c.unemployment != null && c.unemployment <= 4 ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {c.unemployment != null ? `${c.unemployment}%` : '--'}
          </span>

          <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${
            c.pmi != null && c.pmi >= 50 ? 'text-green-400' : c.pmi != null && c.pmi < 50 ? 'text-red-400' : 'text-neutral-400'
          }`}>
            {c.pmi != null ? c.pmi.toFixed(1) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Upcoming Releases Section ──

function UpcomingReleasesSection({ releases }: { releases: any[] }) {
  const t = useT();

  if (!releases || releases.length === 0) return null;

  return (
    <div>
      <SectionHeader title={tr(t, 'miUpcomingReleases', 'Upcoming Releases')} />

      {/* Header */}
      <div className="grid grid-cols-[48px_36px_1fr_44px_44px_36px] gap-0 px-2 py-1 border-b border-border/20">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'miDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'miTime', 'Time')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider">
          {tr(t, 'miIndicator', 'Indicator')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miForecast', 'Fcst')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-right">
          {tr(t, 'miPrevious', 'Prev')}
        </span>
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider text-center">
          {tr(t, 'miImportance', 'Imp')}
        </span>
      </div>

      {/* Rows */}
      {releases.map((r: any, i: number) => {
        const imp = importanceBadge(r.importance || r.impact || 'low');

        return (
          <div
            key={`${r.date}-${r.indicator}-${i}`}
            className="grid grid-cols-[48px_36px_1fr_44px_44px_36px] gap-0 px-2 py-[3px] hover:bg-green-400/[0.02] border-b border-border/20 items-center"
          >
            <span className="text-[9px] font-mono text-neutral-500 tabular-nums truncate">
              {r.date ? String(r.date).slice(5) : '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-400 tabular-nums">
              {r.time || '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-200 font-bold truncate">
              {r.indicator || r.name || '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-400 text-right tabular-nums">
              {r.forecast != null ? r.forecast : '--'}
            </span>

            <span className="text-[9px] font-mono text-neutral-500 text-right tabular-nums">
              {r.previous != null ? r.previous : '--'}
            </span>

            <div className="flex justify-center">
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${imp.cls}`}>
                {imp.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function MacroIndicatorsPanel() {
  const t = useT();
  const { data, isLoading } = useMacroIndicators();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="9" width="3" height="6" fill={ACCENT} opacity="0.5" />
            <rect x="5" y="6" width="3" height="9" fill={ACCENT} opacity="0.65" />
            <rect x="9" y="3" width="3" height="12" fill={ACCENT} opacity="0.8" />
            <rect x="13" y="1" width="2" height="14" fill={ACCENT} opacity="0.95" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-green-400">
            {tr(t, 'miTitle', 'Macro Indicators')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600 tabular-nums">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-green-400 uppercase tracking-wider animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* No data */}
      {!data && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'miNoData', 'No data available')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {data && (
        <div className="flex-1 overflow-auto no-scrollbar text-[9px] font-mono">
          <KeyIndicatorsSection indicators={data?.keyIndicators} />
          <CountryComparisonSection countries={data?.countries} />
          <UpcomingReleasesSection releases={data?.upcomingReleases} />

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
