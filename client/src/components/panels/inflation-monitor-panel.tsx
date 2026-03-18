import { useInflationMonitor } from '../../api/hooks/use-inflation-monitor';
import { useT } from '../../i18n';

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2) + '%';
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

// ── Color helpers ──

/** High inflation = red, low = green */
function inflationColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 3.5) return 'text-red-400';
  if (n > 2.5) return 'text-yellow-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-blue-400';
  return 'text-neutral-500';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

/** Gap from target: above = red, below = green, at = neutral */
function gapColor(gap: number | null | undefined): string {
  if (gap == null) return 'text-neutral-500';
  if (Math.abs(gap) < 0.3) return 'text-neutral-400';
  if (gap > 0) return 'text-red-400';
  return 'text-green-400';
}

function trendArrow(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return '\u2191';
  if (trend === 'falling' || trend === 'down') return '\u2193';
  if (trend === 'stable' || trend === 'flat') return '\u2192';
  return '\u2192';
}

function trendColor(trend: string | null | undefined): string {
  if (trend === 'rising' || trend === 'up') return 'text-red-400';
  if (trend === 'falling' || trend === 'down') return 'text-green-400';
  return 'text-neutral-500';
}

// ── Section header component ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#080808] border-b border-border/20 sticky top-0 z-10">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-red-400">
        {title}
      </span>
    </div>
  );
}

// ── CPI Breakdown ──

function CpiSection({ d }: { d: any }) {
  const cpi = d?.cpi;
  if (!cpi) return null;

  const components: any[] = cpi?.components ?? [];

  return (
    <div>
      <SectionHeader title="CPI Breakdown" />

      {/* Headline / Core summary */}
      <div className="grid grid-cols-2 gap-0 border-b border-border/10">
        <div className="px-3 py-2 border-r border-border/10">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Headline CPI</div>
          <div className={`text-[14px] font-mono font-black ${inflationColor(cpi.headline)}`}>
            {fmtPct(cpi.headline)}
          </div>
          <div className={`text-[8px] font-mono ${changeColor(cpi.headlineMom)}`}>
            MoM {fmtChange(cpi.headlineMom)}%
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Core CPI</div>
          <div className={`text-[14px] font-mono font-black ${inflationColor(cpi.core)}`}>
            {fmtPct(cpi.core)}
          </div>
          <div className={`text-[8px] font-mono ${changeColor(cpi.coreMom)}`}>
            MoM {fmtChange(cpi.coreMom)}%
          </div>
        </div>
      </div>

      {/* Components table */}
      {components.length > 0 && (
        <div>
          <div className="grid grid-cols-[1fr_44px_48px_48px_28px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Component</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Wgt</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YoY</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">MoM</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Trd</span>
          </div>
          {components.map((c: any, i: number) => (
            <div
              key={c.name ?? i}
              className="grid grid-cols-[1fr_44px_48px_48px_28px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white truncate">{c.name ?? '--'}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtNum(c.weight, 1)}%</span>
              <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(c.yoy)}`}>{fmtPct(c.yoy)}</span>
              <span className={`text-[8px] font-mono text-right ${changeColor(c.mom)}`}>{fmtChange(c.mom)}%</span>
              <span className={`text-[9px] font-mono font-bold text-center ${trendColor(c.trend)}`}>{trendArrow(c.trend)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PPI Data ──

function PpiSection({ d }: { d: any }) {
  const ppi = d?.ppi;
  if (!ppi) return null;

  const components: any[] = ppi?.components ?? [];

  return (
    <div>
      <SectionHeader title="PPI Data" />

      <div className="grid grid-cols-2 gap-0 border-b border-border/10">
        <div className="px-3 py-2 border-r border-border/10">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Headline PPI</div>
          <div className={`text-[12px] font-mono font-black ${inflationColor(ppi.headline)}`}>
            {fmtPct(ppi.headline)}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Core PPI</div>
          <div className={`text-[12px] font-mono font-black ${inflationColor(ppi.core)}`}>
            {fmtPct(ppi.core)}
          </div>
        </div>
      </div>

      {components.length > 0 && (
        <div>
          <div className="grid grid-cols-[1fr_48px_48px_28px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Sub-Component</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">YoY</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">MoM</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Trd</span>
          </div>
          {components.map((c: any, i: number) => (
            <div
              key={c.name ?? i}
              className="grid grid-cols-[1fr_48px_48px_28px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white truncate">{c.name ?? '--'}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(c.yoy)}`}>{fmtPct(c.yoy)}</span>
              <span className={`text-[8px] font-mono text-right ${changeColor(c.mom)}`}>{fmtChange(c.mom)}%</span>
              <span className={`text-[9px] font-mono font-bold text-center ${trendColor(c.trend)}`}>{trendArrow(c.trend)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PCE Data ──

function PceSection({ d }: { d: any }) {
  const pce = d?.pce;
  if (!pce) return null;

  const FED_TARGET = 2.0;

  const metrics = [
    { label: 'Headline PCE', value: pce.headline },
    { label: 'Core PCE', value: pce.core },
    { label: 'Supercore PCE', value: pce.supercore },
  ];

  return (
    <div>
      <SectionHeader title="PCE Data" />

      <div className="grid grid-cols-3 gap-0 border-b border-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-2 border-r border-border/10 last:border-r-0">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{m.label}</div>
            <div className={`text-[12px] font-mono font-black ${inflationColor(m.value)}`}>
              {fmtPct(m.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Fed target reference */}
      <div className="px-3 py-1.5 border-b border-border/10 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px border-b border-dashed border-red-400/60" />
          <span className="text-[7px] font-mono text-neutral-500">
            Fed Target: {FED_TARGET.toFixed(1)}%
          </span>
        </div>
        {pce.core != null && (
          <span className={`text-[7px] font-mono font-bold ${gapColor(pce.core - FED_TARGET)}`}>
            Gap: {fmtChange(pce.core - FED_TARGET)}%
          </span>
        )}
      </div>

      {/* MoM details if available */}
      {(pce.headlineMom != null || pce.coreMom != null) && (
        <div className="grid grid-cols-3 gap-0 border-b border-border/10">
          <div className="px-3 py-1.5 border-r border-border/10">
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Headline MoM</div>
            <div className={`text-[9px] font-mono font-bold ${changeColor(pce.headlineMom)}`}>{fmtChange(pce.headlineMom)}%</div>
          </div>
          <div className="px-3 py-1.5 border-r border-border/10">
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Core MoM</div>
            <div className={`text-[9px] font-mono font-bold ${changeColor(pce.coreMom)}`}>{fmtChange(pce.coreMom)}%</div>
          </div>
          <div className="px-3 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase">Supercore MoM</div>
            <div className={`text-[9px] font-mono font-bold ${changeColor(pce.supercoreMom)}`}>{fmtChange(pce.supercoreMom)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inflation Expectations ──

function ExpectationsSection({ d }: { d: any }) {
  const exp = d?.expectations;
  if (!exp) return null;

  const breakevens: any[] = exp?.breakevens ?? [];
  const surveys: any[] = exp?.surveys ?? [];
  const nowcast = exp?.clevelandNowcast;

  return (
    <div>
      <SectionHeader title="Inflation Expectations" />

      {/* TIPS Breakevens */}
      {breakevens.length > 0 && (
        <div>
          <div className="px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">TIPS Breakevens</span>
          </div>
          <div className="grid grid-cols-[1fr_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Current</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M Ago</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M Ago</span>
          </div>
          {breakevens.map((b: any, i: number) => (
            <div
              key={b.tenor ?? i}
              className="grid grid-cols-[1fr_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white">{b.tenor ?? '--'}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(b.current)}`}>{fmtPct(b.current)}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(b.oneMonthAgo)}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(b.threeMonthAgo)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Surveys */}
      {surveys.length > 0 && (
        <div>
          <div className="px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">Surveys</span>
          </div>
          <div className="grid grid-cols-[1fr_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Source</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Current</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M Ago</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M Ago</span>
          </div>
          {surveys.map((s: any, i: number) => (
            <div
              key={s.name ?? i}
              className="grid grid-cols-[1fr_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white truncate">{s.name ?? '--'}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(s.current)}`}>{fmtPct(s.current)}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(s.oneMonthAgo)}</span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(s.threeMonthAgo)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cleveland Nowcast */}
      {nowcast != null && (
        <div className="px-3 py-1.5 border-b border-border/10 flex items-center gap-3">
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Cleveland Fed Nowcast:</span>
          <span className={`text-[9px] font-mono font-black ${inflationColor(nowcast.current)}`}>
            {fmtPct(nowcast.current)}
          </span>
          {nowcast.oneMonthAgo != null && (
            <span className="text-[7px] font-mono text-neutral-500">
              1M: {fmtPct(nowcast.oneMonthAgo)}
            </span>
          )}
          {nowcast.threeMonthAgo != null && (
            <span className="text-[7px] font-mono text-neutral-500">
              3M: {fmtPct(nowcast.threeMonthAgo)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Global Comparison ──

function GlobalSection({ d }: { d: any }) {
  const countries: any[] = d?.global ?? [];
  if (countries.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Global Comparison" />

      <div className="grid grid-cols-[1fr_44px_44px_44px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPI</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Core</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Gap</span>
      </div>

      {countries.map((c: any, i: number) => {
        const gap = c.cpi != null && c.target != null ? c.cpi - c.target : null;
        return (
          <div
            key={c.country ?? i}
            className="grid grid-cols-[1fr_44px_44px_44px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{c.country ?? '--'}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(c.cpi)}`}>{fmtPct(c.cpi)}</span>
            <span className={`text-[8px] font-mono text-right ${inflationColor(c.core)}`}>{fmtPct(c.core)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(c.target)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${gapColor(gap)}`}>
              {gap != null ? fmtChange(gap) + '%' : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Trimmed Means / Alternative Measures ──

function TrimmedMeansSection({ d }: { d: any }) {
  const alt = d?.trimmedMeans;
  if (!alt) return null;

  const measures = [
    { label: 'Trimmed Mean', value: alt.trimmedMean, prev: alt.trimmedMeanPrev },
    { label: 'Median CPI', value: alt.median, prev: alt.medianPrev },
    { label: 'Sticky CPI', value: alt.sticky, prev: alt.stickyPrev },
    { label: 'Flexible CPI', value: alt.flexible, prev: alt.flexiblePrev },
  ];

  return (
    <div>
      <SectionHeader title="Alternative Measures" />

      <div className="grid grid-cols-[1fr_52px_52px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Measure</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Current</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Prev</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
      </div>

      {measures.map((m) => {
        const chg = m.value != null && m.prev != null ? m.value - m.prev : null;
        return (
          <div
            key={m.label}
            className="grid grid-cols-[1fr_52px_52px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{m.label}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(m.value)}`}>{fmtPct(m.value)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(m.prev)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(chg)}`}>
              {chg != null ? fmtChange(chg) + '%' : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function InflationMonitorPanel() {
  const t = useT();
  const { data, isLoading, error } = useInflationMonitor();
  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest animate-pulse">
          {t('loading')}
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
          Inflation Monitor
        </span>
        {d.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <CpiSection d={d} />
        <PpiSection d={d} />
        <PceSection d={d} />
        <ExpectationsSection d={d} />
        <GlobalSection d={d} />
        <TrimmedMeansSection d={d} />
      </div>
    </div>
  );
}
