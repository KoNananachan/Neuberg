import { useState } from 'react';
import { useInterestRateSwap } from '../../api/hooks/use-interest-rate-swap';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.12)';

type Tab = 'CURVE' | 'XCCY' | 'FORWARDS' | 'VOLATILITY';

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtVol(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function basisColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n < 0) return 'text-blue-400';
  if (n > 0) return 'text-red-400';
  return 'text-neutral-400';
}

function hikesColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── SVG Icon ──

function SwapCurveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 11C3.5 11 5 4 7 4C9 4 10.5 9 12 9" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 5C3.5 5 5 10 7 10C9 10 10.5 5 12 5" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <circle cx="7" cy="7" r="1" fill={ACCENT} opacity="0.6" />
    </svg>
  );
}

// ── Main Panel ──

export function InterestRateSwapPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInterestRateSwap();
  const [tab, setTab] = useState<Tab>('CURVE');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'CURVE', label: 'CURVE' },
    { key: 'XCCY', label: 'XCCY' },
    { key: 'FORWARDS', label: 'FORWARDS' },
    { key: 'VOLATILITY', label: 'VOLATILITY' },
  ];

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <SwapCurveIcon />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'irsMonitorTitle', 'IRS Monitor')}
          </span>
        </div>

        <div className="flex items-center gap-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider transition-colors"
              style={{
                color: tab === tb.key ? ACCENT : 'rgba(255,255,255,0.3)',
                borderBottom: tab === tb.key ? `1px solid ${ACCENT}` : '1px solid transparent',
                background: tab === tb.key ? ACCENT_DIM : 'transparent',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-[9px] font-mono uppercase animate-pulse" style={{ color: ACCENT }}>
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'irsSwapNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'CURVE' && <CurveTab data={data} t={t} />}
        {data && tab === 'XCCY' && <XccyTab data={data} t={t} />}
        {data && tab === 'FORWARDS' && <ForwardsTab data={data} t={t} />}
        {data && tab === 'VOLATILITY' && <VolatilityTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── CURVE Tab ──

function CurveTab({ data, t }: { data: any; t: TFn }) {
  const curve = data?.swapCurve ?? [];
  const overnightRates = data?.overnightRates ?? [];
  const metrics = data?.marketMetrics;

  return (
    <>
      {/* USD Swap Curve */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'irsCurveUsd', 'USD Swap Curve')}
          </span>
        </div>

        <div className="grid grid-cols-[52px_60px_48px_48px_60px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'irsTenor', 'Tenor')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsRate', 'Rate %')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irs1DChg', '\u03941D')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irs1WChg', '\u03941W')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsSwapSprd', 'Sprd bps')}
          </span>
        </div>

        {curve.map((r: any) => (
          <div
            key={r.tenor}
            className="grid grid-cols-[52px_60px_48px_48px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white uppercase">{r.tenor}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(r.rate)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1d)}`}>
              {fmtBps(r.change1d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1w)}`}>
              {fmtBps(r.change1w)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.swapSpread)}`}>
              {fmtSpread(r.swapSpread)}
            </span>
          </div>
        ))}

        {curve.length === 0 && (
          <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
        )}
      </div>

      {/* Overnight Rates */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'irsOvernightRates', 'Overnight Rates')}
          </span>
        </div>

        <div className="grid grid-cols-[56px_56px_44px_56px_60px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'irsIndex', 'Index')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsCurrent', 'Current')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsChg', 'Chg')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsEffective', 'Eff Date')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsVolume', 'Vol $B')}
          </span>
        </div>

        {overnightRates.map((r: any) => (
          <div
            key={r.name}
            className="grid grid-cols-[56px_56px_44px_56px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{r.name}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(r.rate)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change)}`}>
              {fmtBps(r.change)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{r.effective ?? '--'}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{r.volume ?? '--'}</span>
          </div>
        ))}

        {overnightRates.length === 0 && (
          <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
        )}
      </div>

      {/* Market Metrics Summary */}
      {metrics && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'irsMetrics', 'Market Metrics')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px">
            {[
              { label: '2S10S SLOPE', value: metrics.slope2s10s, unit: 'bps' },
              { label: '5S30S SLOPE', value: metrics.slope5s30s, unit: 'bps' },
              { label: 'BUTTERFLY', value: metrics.butterfly, unit: 'bps' },
              { label: 'TERM PREMIUM', value: metrics.termPremium, unit: 'bps' },
              { label: 'AVG SPREAD', value: metrics.avgSwapSpread, unit: 'bps' },
              { label: 'DV01 $M', value: metrics.dv01, unit: '' },
            ].map((m) => (
              <div key={m.label} className="px-3 py-1.5 bg-black hover:bg-purple-400/[0.02] transition-colors">
                <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{m.label}</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-[10px] font-mono font-bold ${changeColor(m.value)}`}>
                    {fmtSpread(m.value)}
                  </span>
                  {m.unit && <span className="text-[7px] font-mono text-neutral-600">{m.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── XCCY Tab ──

function XccyTab({ data, t }: { data: any; t: TFn }) {
  const pairs = data?.xccyBasis ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'irsXccyBasis', 'Cross-Currency Basis Swaps')}
        </span>
      </div>

      <div className="grid grid-cols-[64px_56px_48px_48px_52px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsXccyPair', 'Pair')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsXccy5Y', '5Y Basis')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsXccy1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsXccy1M', '\u03941M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsXccyDir', 'Dir')}
        </span>
      </div>

      {pairs.map((p: any) => (
        <div
          key={p.pair}
          className="grid grid-cols-[64px_56px_48px_48px_52px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{p.pair}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${basisColor(p.basis5y)}`}>
            {fmtSpread(p.basis5y)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(p.change1d)}`}>
            {fmtBps(p.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(p.change1m)}`}>
            {fmtBps(p.change1m)}
          </span>
          <span className="text-right">
            {p.direction && (
              <span
                className={`text-[7px] font-mono font-bold px-1.5 py-0.5 uppercase ${
                  p.direction === 'WIDENING'
                    ? 'text-red-400 bg-red-500/10'
                    : p.direction === 'TIGHTENING'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-neutral-400 bg-neutral-500/10'
                }`}
              >
                {p.direction}
              </span>
            )}
          </span>
        </div>
      ))}

      {pairs.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}
    </div>
  );
}

// ── FORWARDS Tab ──

function ForwardsTab({ data, t }: { data: any; t: TFn }) {
  const forwards = data?.forwardRates ?? [];
  const policyPath = data?.impliedPolicyPath ?? [];

  return (
    <>
      {/* Forward Rates Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
            {tr(t, 'irsForwardRates', 'Forward Rates')}
          </span>
        </div>

        <div className="grid grid-cols-[56px_56px_48px_56px_52px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'irsFwdLabel', 'Forward')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsFwdRate', 'Rate %')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsFwd1D', '\u03941D')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsFwdHikes', 'Impl Hikes')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
            {tr(t, 'irsFwdVsSpot', 'vs Spot')}
          </span>
        </div>

        {forwards.map((f: any) => (
          <div
            key={f.label}
            className="grid grid-cols-[56px_56px_48px_56px_52px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{f.label}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtRate(f.rate)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.change1d)}`}>
              {fmtBps(f.change1d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${hikesColor(f.impliedHikes)}`}>
              {f.impliedHikes != null ? (f.impliedHikes > 0 ? '+' : '') + f.impliedHikes.toFixed(1) : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f.vsSpot)}`}>
              {fmtBps(f.vsSpot)}
            </span>
          </div>
        ))}

        {forwards.length === 0 && (
          <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
        )}
      </div>

      {/* Implied Policy Rate Path */}
      {policyPath.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'irsPolicyPath', 'Implied Policy Rate Path')}
            </span>
          </div>

          <div className="px-3 py-2">
            <div className="flex items-end gap-2 h-16">
              {policyPath.map((p: any) => {
                const maxRate = Math.max(...policyPath.map((x: any) => x.rate ?? 0));
                const minRate = Math.min(...policyPath.map((x: any) => x.rate ?? 0));
                const range = maxRate - minRate || 1;
                const h = ((p.rate - minRate) / range) * 100;
                return (
                  <div key={p.meeting} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: '48px' }}>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          width: '100%',
                          height: `${Math.max(h, 4)}%`,
                          background: ACCENT,
                          opacity: 0.25,
                        }}
                      />
                    </div>
                    <div className="text-[6px] font-mono text-neutral-500 mt-0.5 truncate w-full text-center">
                      {p.meeting}
                    </div>
                    <div className="text-[7px] font-mono font-bold" style={{ color: ACCENT }}>
                      {fmtRate(p.rate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── VOLATILITY Tab ──

function VolatilityTab({ data, t }: { data: any; t: TFn }) {
  const volGrid = data?.swaptionVol ?? [];
  const tails = data?.volTails ?? [];

  const volColor = (vol: number | null | undefined): string => {
    if (vol == null) return 'text-neutral-500';
    if (vol >= 120) return 'text-red-400';
    if (vol >= 100) return 'text-orange-400';
    if (vol >= 80) return 'text-yellow-400';
    if (vol >= 60) return 'text-green-400';
    return 'text-sky-400';
  };

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
          {tr(t, 'irsSwaptionVol', 'Swaption Volatility')}
        </span>
      </div>

      {/* Grid-style vol table */}
      {tails.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr className="border-b border-border/10 bg-[#030303]">
                <th className="px-2 py-1 text-left text-[7px] text-neutral-600 uppercase tracking-wider font-bold">
                  {tr(t, 'irsVolExpTail', 'Exp \\ Tail')}
                </th>
                {tails.map((tail: string) => (
                  <th key={tail} className="px-2 py-1 text-right text-[7px] text-neutral-600 uppercase tracking-wider font-bold">
                    {tail}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {volGrid.map((row: any) => (
                <tr key={row.expiry} className="border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors">
                  <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>{row.expiry}</td>
                  {tails.map((tail: string) => {
                    const cell = row[tail];
                    return (
                      <td key={tail} className="px-2 py-1.5 text-right">
                        {cell ? (
                          <div>
                            <span className={`font-bold ${volColor(cell.normalVol)}`}>
                              {fmtVol(cell.normalVol)}
                            </span>
                            {cell.change1d != null && (
                              <div className={`text-[6px] ${changeColor(cell.change1d)}`}>
                                {fmtBps(cell.change1d)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-600">--</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {volGrid.length === 0 && tails.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">NO DATA</div>
      )}

      {/* Detailed swaption rows with log-normal and skew */}
      {data?.swaptionDetail && data.swaptionDetail.length > 0 && (
        <>
          <div className="px-3 py-1 border-b border-border/10 border-t border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
              {tr(t, 'irsVolDetail', 'Volatility Detail')}
            </span>
          </div>

          <div className="grid grid-cols-[72px_52px_48px_52px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'irsVolPoint', 'Point')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'irsNormVol', 'Norm bp')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'irsVol1D', '\u03941D')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'irsLogVol', 'Log %')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'irsSkew', 'Skew')}
            </span>
          </div>

          {data.swaptionDetail.map((s: any) => (
            <div
              key={s.point}
              className="grid grid-cols-[72px_52px_48px_52px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold" style={{ color: ACCENT }}>{s.point}</span>
              <span className={`text-[8px] font-mono font-bold text-right ${volColor(s.normalVol)}`}>
                {fmtVol(s.normalVol)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change1d)}`}>
                {fmtBps(s.change1d)}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right">
                {s.logNormalVol != null ? s.logNormalVol.toFixed(1) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.skew)}`}>
                {fmtBps(s.skew)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
