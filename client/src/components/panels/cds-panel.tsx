import { useState } from 'react';
import { useCDS } from '../../api/hooks/use-cds';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type Tab = 'SOVEREIGN' | 'CORPORATE' | 'INDICES' | 'EVENTS';

// ── Color helpers ──

function spreadColor(spread: number): string {
  if (spread > 300) return 'text-red-400';
  if (spread > 150) return 'text-orange-400';
  if (spread > 80) return 'text-yellow-400';
  return 'text-emerald-400';
}

function changeColor(n: number): string {
  // For CDS: positive = widening = bad (red), negative = tightening = good (green)
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string): string {
  if (rating === 'AAA') return 'text-emerald-300';
  if (rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-blue-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function riskBadgeStyle(level: string): string {
  if (level === 'LOW' || level === 'STABLE') return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30';
  if (level === 'ELEVATED') return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30';
  if (level === 'HIGH') return 'text-orange-400 bg-orange-400/10 border border-orange-400/30';
  return 'text-red-400 bg-red-400/10 border border-red-400/30';
}

function eventTypeStyle(type: string): string {
  if (type === 'BANKRUPTCY' || type === 'FAILURE_TO_PAY') return 'text-red-400 bg-red-400/15';
  if (type === 'RESTRUCTURING') return 'text-orange-400 bg-orange-400/15';
  if (type === 'SUCCESSION') return 'text-blue-400 bg-blue-400/15';
  return 'text-neutral-400 bg-neutral-400/10';
}

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtNotional(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

// ── SVG Icon ──

function ShieldCreditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M8 1L2 3.5V7C2 10.87 4.56 14.47 8 15.5C11.44 14.47 14 10.87 14 7V3.5L8 1Z"
        stroke="#f87171"
        strokeWidth="1.2"
        fill="rgba(248,113,113,0.12)"
      />
      <path
        d="M5.5 8H10.5M5.5 6H10.5M6.5 10H9.5"
        stroke="#f87171"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Main Panel ──

export function CDSPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCDS();
  const [tab, setTab] = useState<Tab>('SOVEREIGN');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCreditIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'cdsTitle', 'CDS MONITOR')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.systemic?.riskLevel && (
            <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${riskBadgeStyle(data.systemic.riskLevel)}`}>
              {data.systemic.riskLevel}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-red-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['SOVEREIGN', 'CORPORATE', 'INDICES', 'EVENTS'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cdsNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'SOVEREIGN' && <SovereignTab data={data} t={t} />}
        {data && tab === 'CORPORATE' && <CorporateTab data={data} t={t} />}
        {data && tab === 'INDICES' && <IndicesTab data={data} t={t} />}
        {data && tab === 'EVENTS' && <EventsTab data={data} t={t} />}

        {/* Timestamp */}
        {data?.timestamp && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'cdsLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SOVEREIGN Tab ──

function SovereignTab({ data, t }: { data: any; t: TFn }) {
  const sovereigns = data?.sovereigns ?? [];

  if (sovereigns.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cdsNoSovereign', 'No sovereign CDS data')}
      </div>
    );
  }

  return (
    <div>
      {/* Market metrics summary bar */}
      {data?.sovereignMetrics && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/20 bg-[#060606]">
          {data.sovereignMetrics.totalNotional != null && (
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-neutral-600 uppercase">
                {tr(t, 'cdsTotalNotional', 'Total Notional')}
              </span>
              <span className="text-[8px] font-mono font-bold text-white">
                {fmtNotional(data.sovereignMetrics.totalNotional)}
              </span>
            </div>
          )}
          {data.sovereignMetrics.weeklyVolume != null && (
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-mono text-neutral-600 uppercase">
                {tr(t, 'cdsWeeklyVol', 'Wk Vol')}
              </span>
              <span className="text-[8px] font-mono font-bold text-white">
                {fmtNotional(data.sovereignMetrics.weeklyVolume)}
              </span>
            </div>
          )}
          {data.sovereignMetrics.systemic && (
            <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 ${riskBadgeStyle(data.sovereignMetrics.systemic)}`}>
              {tr(t, 'cdsSystemic', 'SYSTEMIC')}: {data.sovereignMetrics.systemic}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'cdsCountry', 'Country')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'cds5YSpread', '5Y Sprd')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {'\u0394'}1D
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {'\u0394'}1W
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {'\u0394'}1M
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'cdsRating', 'Rating')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'cdsImpliedPD', 'Impl PD')}
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                {tr(t, 'cdsRecovery', 'Recovery')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sovereigns.map((s: any, i: number) => (
              <tr key={s?.country ?? i} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className="text-white font-bold">{s?.country}</span>
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${spreadColor(s?.spread5y ?? 0)}`}>
                  {fmtBps(s?.spread5y ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${changeColor(s?.change1d ?? 0)}`}>
                  {fmtChange(s?.change1d ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(s?.change1w ?? 0)}`}>
                  {fmtChange(s?.change1w ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(s?.change1m ?? 0)}`}>
                  {fmtChange(s?.change1m ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${ratingColor(s?.rating ?? '')}`}>
                  {s?.rating}
                </td>
                <td className="px-1.5 py-1 text-right whitespace-nowrap text-neutral-300">
                  {fmtPct(s?.impliedPd ?? 0)}
                </td>
                <td className="px-1.5 py-1 text-right whitespace-nowrap text-neutral-400">
                  {fmtPct(s?.recovery ?? 40)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CORPORATE Tab ──

function CorporateTab({ data, t }: { data: any; t: TFn }) {
  const corporates = data?.corporates ?? [];

  if (corporates.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cdsNoCorporate', 'No corporate CDS data')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsEntity', 'Entity')}
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsTicker', 'Ticker')}
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsSector', 'Sector')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cds5YSpread', '5Y Sprd')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {'\u0394'}1D
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {'\u0394'}1M
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsRating', 'Rating')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsImpliedPD', 'Impl PD')}
            </th>
            <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              {tr(t, 'cdsBasis', 'Basis')}
            </th>
          </tr>
        </thead>
        <tbody>
          {corporates.map((c: any, i: number) => {
            const spread = c?.spread5y ?? 0;
            const spreadBg = spread > 300
              ? 'bg-red-400/[0.06]'
              : spread > 150
                ? 'bg-red-400/[0.03]'
                : '';

            return (
              <tr
                key={c?.ticker ?? i}
                className={`border-b border-border/10 hover:bg-red-400/[0.02] transition-colors ${spreadBg}`}
              >
                <td className="px-1.5 py-1 whitespace-nowrap">
                  <span className="text-white font-bold truncate max-w-[120px] inline-block align-bottom">
                    {c?.entity}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-red-400 font-bold">
                  {c?.ticker}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-neutral-500 text-[8px]">
                  {c?.sector}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${spreadColor(spread)}`}>
                  {fmtBps(spread)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${changeColor(c?.change1d ?? 0)}`}>
                  {fmtChange(c?.change1d ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(c?.change1m ?? 0)}`}>
                  {fmtChange(c?.change1m ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${ratingColor(c?.rating ?? '')}`}>
                  {c?.rating}
                </td>
                <td className="px-1.5 py-1 text-right whitespace-nowrap text-neutral-300">
                  {fmtPct(c?.impliedPd ?? 0)}
                </td>
                <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${
                  (c?.basis ?? 0) < 0 ? 'text-blue-400' : 'text-neutral-400'
                }`}>
                  {fmtChange(c?.basis ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── INDICES Tab ──

function IndicesTab({ data, t }: { data: any; t: TFn }) {
  const indices = data?.indices ?? [];
  const termStructure = data?.termStructure ?? [];

  return (
    <div>
      {/* CDS Indices Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cdsIndicesTitle', 'CDS Indices')}
          </span>
        </div>

        {indices.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cdsNoIndices', 'No index data')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsName', 'Name')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsSpread', 'Spread')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {'\u0394'}1D
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {'\u0394'}1W
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsSeries', 'Series')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsMaturity', 'Maturity')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsRoll', 'Roll')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {indices.map((idx: any, i: number) => (
                  <tr key={idx?.name ?? i} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                    <td className="px-1.5 py-1 whitespace-nowrap">
                      <span className="text-white font-bold">{idx?.name}</span>
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${spreadColor(idx?.spread ?? 0)}`}>
                      {fmtBps(idx?.spread ?? 0)}
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${changeColor(idx?.change1d ?? 0)}`}>
                      {fmtChange(idx?.change1d ?? 0)}
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(idx?.change1w ?? 0)}`}>
                      {fmtChange(idx?.change1w ?? 0)}
                    </td>
                    <td className="px-1.5 py-1 text-right whitespace-nowrap text-neutral-400">
                      {idx?.series}
                    </td>
                    <td className="px-1.5 py-1 text-right whitespace-nowrap text-neutral-400">
                      {idx?.maturity}
                    </td>
                    <td className="px-1.5 py-1 text-right whitespace-nowrap">
                      {idx?.roll && (
                        <span className="text-[7px] font-bold px-1 py-0.5 text-red-400 bg-red-400/10">
                          {idx.roll}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Term Structure Table */}
      <div>
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'cdsTermStructure', 'Term Structure')}
          </span>
        </div>

        {termStructure.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cdsNoTermStructure', 'No term structure data')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead className="sticky top-0 bg-[#080808] z-10">
                <tr className="border-b border-border/20">
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsTenor', 'Tenor')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsIGSpread', 'IG Sprd')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsHYSpread', 'HY Sprd')}
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    {tr(t, 'cdsSlopeVs5Y', 'Slope vs 5Y')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {termStructure.map((ts: any, i: number) => (
                  <tr key={ts?.tenor ?? i} className="border-b border-border/10 hover:bg-red-400/[0.02] transition-colors">
                    <td className="px-1.5 py-1 whitespace-nowrap text-white font-bold">
                      {ts?.tenor}
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${spreadColor(ts?.igSpread ?? 0)}`}>
                      {fmtBps(ts?.igSpread ?? 0)}
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap font-bold ${spreadColor(ts?.hySpread ?? 0)}`}>
                      {fmtBps(ts?.hySpread ?? 0)}
                    </td>
                    <td className={`px-1.5 py-1 text-right whitespace-nowrap ${changeColor(ts?.slopeVs5y ?? 0)}`}>
                      {fmtChange(ts?.slopeVs5y ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── EVENTS Tab ──

function EventsTab({ data, t }: { data: any; t: TFn }) {
  const events = data?.creditEvents ?? [];

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'cdsNoEvents', 'No recent credit events')}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1">
      <div className="mb-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'cdsRecentEvents', 'Recent Credit Events')}
        </span>
      </div>

      {events.map((ev: any, i: number) => (
        <div
          key={ev?.entity ?? i}
          className="border border-border/20 bg-[#060606] px-2.5 py-2 hover:bg-red-400/[0.02] transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-white">
                {ev?.entity}
              </span>
              <span className={`text-[7px] font-bold px-1 py-0.5 ${eventTypeStyle(ev?.eventType ?? '')}`}>
                {ev?.eventType}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-600">
              {ev?.date}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {ev?.notionalAffected != null && (
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">
                  {tr(t, 'cdsNotional', 'Notional')}
                </span>
                <span className="text-[8px] font-mono font-bold text-red-400">
                  {fmtNotional(ev.notionalAffected)}
                </span>
              </div>
            )}
            {ev?.recoveryAuction != null && (
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">
                  {tr(t, 'cdsRecoveryAuction', 'Recovery Auction')}
                </span>
                <span className="text-[8px] font-mono font-bold text-yellow-400">
                  {fmtPct(ev.recoveryAuction)}
                </span>
              </div>
            )}
            {ev?.sector && (
              <span className="text-[7px] font-mono text-neutral-600">
                {ev.sector}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
