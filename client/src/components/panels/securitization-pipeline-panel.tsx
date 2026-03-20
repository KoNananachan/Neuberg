import { useState } from 'react';
import { useSecuritizationPipeline } from '../../api/hooks/use-securitization-pipeline';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

const ACCENT = '#c084fc'; // violet-400

// ── Formatting helpers ──

function fmtB(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtWal(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(1)}y`;
}

// ── Color helpers ──

function statusColor(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'priced' || s === 'closed') return 'text-green-400';
  if (s === 'announced' || s === 'filed') return 'text-amber-400';
  if (s === 'pricing' || s === 'marketing') return 'text-cyan-400';
  return 'text-neutral-400';
}

function statusBg(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'priced' || s === 'closed') return 'bg-green-500/10 border-green-500/30';
  if (s === 'announced' || s === 'filed') return 'bg-amber-500/10 border-amber-500/30';
  if (s === 'pricing' || s === 'marketing') return 'bg-cyan-500/10 border-cyan-500/30';
  return 'bg-neutral-500/10 border-neutral-500/30';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n <= 50) return 'text-green-400';
  if (n <= 100) return 'text-cyan-400';
  if (n <= 200) return 'text-amber-400';
  return 'text-red-400';
}

function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function ratingColor(rating: string | null | undefined): string {
  const r = (rating ?? '').toUpperCase();
  if (r === 'AAA') return 'text-green-400';
  if (r === 'AA' || r === 'AA+' || r === 'AA-') return 'text-emerald-400';
  if (r === 'A' || r === 'A+' || r === 'A-') return 'text-cyan-400';
  if (r === 'BBB' || r === 'BBB+' || r === 'BBB-') return 'text-blue-400';
  if (r === 'BB' || r === 'BB+' || r === 'BB-') return 'text-amber-400';
  if (r === 'B' || r === 'B+' || r === 'B-') return 'text-orange-400';
  if (r === 'EQUITY' || r === 'NR' || r === 'EQ') return 'text-violet-400';
  return 'text-neutral-400';
}

function volumeChangeColor(curr: number | null | undefined, prev: number | null | undefined): string {
  if (curr == null || prev == null || prev === 0) return 'text-neutral-500';
  const pct = ((curr - prev) / prev) * 100;
  if (pct > 10) return 'text-green-400';
  if (pct < -10) return 'text-red-400';
  return 'text-neutral-400';
}

// ── Tab type ──

type Tab = 'PIPELINE' | 'TRANCHES' | 'VOLUME' | 'SPREADS' | 'CALENDAR';

// ── SVG Icon (layered pipeline motif) ──

function PipelineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1" y="1" width="14" height="3" rx="0.5" fill="#c084fc" opacity="0.9" />
      <rect x="2" y="5" width="12" height="2.5" rx="0.5" fill="#c084fc" opacity="0.65" />
      <rect x="3" y="8.5" width="10" height="2.5" rx="0.5" fill="#c084fc" opacity="0.4" />
      <rect x="4" y="12" width="8" height="2.5" rx="0.5" fill="#c084fc" opacity="0.2" />
    </svg>
  );
}

// ── Main Panel ──

export function SecuritizationPipelinePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSecuritizationPipeline();
  const [tab, setTab] = useState<Tab>('PIPELINE');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <PipelineIcon />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'securitizationPipeline', 'Securitization Pipeline')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {(['PIPELINE', 'TRANCHES', 'VOLUME', 'SPREADS', 'CALENDAR'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-violet-400 text-violet-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'secPipelineNoData', 'No pipeline data available')}
          </div>
        )}

        {data && tab === 'PIPELINE' && (
          <PipelineTab data={data} t={t} selectedDealId={selectedDealId} onSelectDeal={setSelectedDealId} />
        )}
        {data && tab === 'TRANCHES' && (
          <TranchesTab data={data} t={t} selectedDealId={selectedDealId} onSelectDeal={setSelectedDealId} />
        )}
        {data && tab === 'VOLUME' && <VolumeTab data={data} t={t} />}
        {data && tab === 'SPREADS' && <SpreadsTab data={data} t={t} />}
        {data && tab === 'CALENDAR' && <CalendarTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── PIPELINE TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PipelineTab({
  data,
  t,
  selectedDealId,
  onSelectDeal,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: TFn;
  selectedDealId: string | null;
  onSelectDeal: (id: string | null) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals: any[] = data?.pipeline ?? data?.deals ?? [];

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'secNoPipeline', 'No deals in pipeline')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secDealPipeline', 'Deal Pipeline')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Deal</th>
            <th className="px-2 py-1.5 text-left font-bold">Type</th>
            <th className="px-2 py-1.5 text-right font-bold">Size</th>
            <th className="px-2 py-1.5 text-center font-bold">Status</th>
            <th className="px-2 py-1.5 text-right font-bold">Price Date</th>
            <th className="px-2 py-1.5 text-left font-bold">Lead Mgrs</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {deals.map((d: any, i: number) => {
            const dealId = d?.id ?? d?.dealName ?? `deal-${i}`;
            const isSelected = selectedDealId === dealId;
            return (
              <tr
                key={dealId}
                onClick={() => onSelectDeal(isSelected ? null : dealId)}
                className={`border-b border-border/5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-violet-400/[0.06]' : 'hover:bg-violet-400/[0.02]'
                }`}
              >
                <td className="px-2 py-1.5 font-bold truncate max-w-[120px]" style={{ color: ACCENT }}>
                  {d?.dealName ?? d?.name ?? '--'}
                </td>
                <td className="px-2 py-1.5">
                  <span className="px-1 py-0.5 text-[7px] font-black uppercase tracking-wider border border-violet-500/30 bg-violet-500/10 text-violet-400">
                    {d?.type ?? d?.assetType ?? '--'}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                  {fmtB(d?.size ?? d?.dealSize)}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span
                    className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider border ${statusColor(d?.status)} ${statusBg(d?.status)}`}
                  >
                    {d?.status ?? '--'}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right text-neutral-400">
                  {d?.pricingDate ?? d?.priceDate ?? '--'}
                </td>
                <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[140px]">
                  {Array.isArray(d?.leadManagers)
                    ? d.leadManagers.join(', ')
                    : d?.leadManagers ?? d?.leads ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pipeline summary */}
      {deals.length > 0 && (
        <div className="px-3 py-2 border-t border-border/20">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Deals</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">{deals.length}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Total Volume</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">
                {fmtB(
                  deals.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, d: any) => sum + (d?.size ?? d?.dealSize ?? 0),
                    0,
                  ),
                )}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Priced</span>
              <span className="text-[9px] font-mono font-bold text-green-400 ml-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {deals.filter((d: any) => (d?.status ?? '').toLowerCase() === 'priced').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TRANCHES TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TranchesTab({
  data,
  t,
  selectedDealId,
  onSelectDeal,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: TFn;
  selectedDealId: string | null;
  onSelectDeal: (id: string | null) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals: any[] = data?.pipeline ?? data?.deals ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedDeal = deals.find((d: any) => (d?.id ?? d?.dealName) === selectedDealId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tranches: any[] = selectedDeal?.tranches ?? data?.tranches ?? [];

  return (
    <div>
      {/* Deal selector */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'secTrancheStructure', 'Tranche Structure')}
          </span>
          {selectedDeal && (
            <span className="text-[8px] font-mono font-bold text-violet-400">
              {selectedDeal?.dealName ?? selectedDeal?.name ?? '--'}
            </span>
          )}
        </div>
      </div>

      {!selectedDeal && deals.length > 0 && (
        <div>
          <div className="px-3 py-1 border-b border-border/20">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">
              {tr(t, 'secSelectDeal', 'Select a deal to view tranches')}
            </span>
          </div>
          <div className="divide-y divide-border/5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {deals.map((d: any, i: number) => {
              const dealId = d?.id ?? d?.dealName ?? `deal-${i}`;
              return (
                <button
                  key={dealId}
                  onClick={() => onSelectDeal(dealId)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-violet-400/[0.03] transition-colors text-left"
                >
                  <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
                    {d?.dealName ?? d?.name ?? '--'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-white/70">{fmtB(d?.size ?? d?.dealSize)}</span>
                    <span
                      className={`px-1 py-0.5 text-[7px] font-black uppercase tracking-wider border ${statusColor(d?.status)} ${statusBg(d?.status)}`}
                    >
                      {d?.status ?? '--'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDeal && deals.length === 0 && tranches.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          {tr(t, 'secNoTranches', 'No tranche data available')}
        </div>
      )}

      {(selectedDeal || tranches.length > 0) && (
        <div>
          {selectedDeal && (
            <button
              onClick={() => onSelectDeal(null)}
              className="w-full px-3 py-1 text-left text-[7px] font-mono text-violet-400 hover:text-violet-300 uppercase border-b border-border/20"
            >
              &larr; {tr(t, 'secBackToList', 'Back to deal list')}
            </button>
          )}
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Tranche</th>
                <th className="px-2 py-1.5 text-center font-bold">Rating</th>
                <th className="px-2 py-1.5 text-right font-bold">Size</th>
                <th className="px-2 py-1.5 text-right font-bold">Spread</th>
                <th className="px-2 py-1.5 text-right font-bold">WAL</th>
                <th className="px-2 py-1.5 text-right font-bold">Coupon</th>
                <th className="px-2 py-1.5 text-right font-bold">Subord</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tranches.map((tr_: any, i: number) => (
                <tr
                  key={`${tr_?.name ?? tr_?.tranche}-${i}`}
                  className="border-b border-border/5 hover:bg-violet-400/[0.02]"
                >
                  <td className={`px-2 py-1.5 font-bold ${ratingColor(tr_?.rating ?? tr_?.name)}`}>
                    {tr_?.name ?? tr_?.tranche ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-[8px] font-bold ${ratingColor(tr_?.rating)}`}>
                      {tr_?.rating ?? '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/80">
                    {fmtB(tr_?.size ?? tr_?.amount)}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${spreadColor(tr_?.spread)}`}>
                    {fmtBps(tr_?.spread)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70">
                    {fmtWal(tr_?.wal ?? tr_?.weightedAverageLife)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-white/70">
                    {fmtPct(tr_?.coupon)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-neutral-400">
                    {fmtPct(tr_?.subordination)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tranche structure visual bar */}
          {tranches.length > 0 && (
            <div className="px-3 py-2 border-t border-border/20">
              <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1">Structure</div>
              <div className="flex h-3 overflow-hidden">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {tranches.map((tr_: any, i: number) => {
                  const totalSize = tranches.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (s: number, t_: any) => s + (t_?.size ?? t_?.amount ?? 0),
                    0,
                  );
                  const pct = totalSize > 0 ? ((tr_?.size ?? tr_?.amount ?? 0) / totalSize) * 100 : 0;
                  const rating = (tr_?.rating ?? tr_?.name ?? '').toUpperCase();
                  let bg = 'bg-neutral-600';
                  if (rating === 'AAA') bg = 'bg-green-500';
                  else if (rating.startsWith('AA')) bg = 'bg-emerald-500';
                  else if (rating.startsWith('A')) bg = 'bg-cyan-500';
                  else if (rating.startsWith('BBB')) bg = 'bg-blue-500';
                  else if (rating.startsWith('BB')) bg = 'bg-amber-500';
                  else if (rating.startsWith('B')) bg = 'bg-orange-500';
                  else if (rating === 'EQUITY' || rating === 'NR' || rating === 'EQ') bg = 'bg-violet-500';
                  return (
                    <div
                      key={`bar-${i}`}
                      className={`${bg} opacity-60 ${i > 0 ? 'border-l border-black' : ''}`}
                      style={{ width: `${pct}%` }}
                      title={`${tr_?.name ?? tr_?.tranche ?? ''}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── VOLUME TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VolumeTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volume: any[] = data?.volume ?? data?.issuanceVolume ?? [];
  const summary = data?.volumeSummary ?? data?.issuanceSummary;

  if (volume.length === 0 && !summary) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'secNoVolume', 'No volume data available')}
      </div>
    );
  }

  return (
    <div>
      {/* YTD Summary */}
      {summary && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/20">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'secIssuanceSummary', 'Issuance Summary')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-border/10">
            <MetricCard
              label="YTD Total"
              value={fmtB(summary?.ytdTotal ?? summary?.ytd)}
            />
            <MetricCard
              label="This Week"
              value={fmtB(summary?.thisWeek ?? summary?.weekVolume)}
            />
            <MetricCard
              label="Last Week"
              value={fmtB(summary?.lastWeek ?? summary?.lastWeekVolume)}
            />
          </div>
        </div>
      )}

      {/* Volume by type */}
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secVolumeByType', 'Volume by Type')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Type</th>
            <th className="px-2 py-1.5 text-right font-bold">This Wk</th>
            <th className="px-2 py-1.5 text-right font-bold">Last Wk</th>
            <th className="px-2 py-1.5 text-right font-bold">Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">YTD</th>
            <th className="px-2 py-1.5 text-right font-bold"># Deals</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {volume.map((v: any, i: number) => {
            const thisWk = v?.thisWeek ?? v?.weekVolume ?? 0;
            const lastWk = v?.lastWeek ?? v?.lastWeekVolume ?? 0;
            const chgPct = lastWk > 0 ? ((thisWk - lastWk) / lastWk) * 100 : null;
            return (
              <tr key={`${v?.type}-${i}`} className="border-b border-border/5 hover:bg-violet-400/[0.02]">
                <td className="px-2 py-1.5 font-bold" style={{ color: ACCENT }}>
                  {v?.type ?? v?.assetType ?? '--'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/80 font-bold">{fmtB(thisWk)}</td>
                <td className="px-2 py-1.5 text-right text-white/60">{fmtB(lastWk)}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${volumeChangeColor(thisWk, lastWk)}`}>
                  {chgPct != null ? `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(0)}%` : '--'}
                </td>
                <td className="px-2 py-1.5 text-right text-white/70">
                  {fmtB(v?.ytd ?? v?.ytdVolume)}
                </td>
                <td className="px-2 py-1.5 text-right text-neutral-400">
                  {v?.dealCount ?? v?.deals ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Volume bar chart */}
      {volume.length > 0 && (
        <div className="px-3 py-2 border-t border-border/20">
          <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1">Weekly Comparison</div>
          <div className="space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {volume.map((v: any, i: number) => {
              const thisWk = v?.thisWeek ?? v?.weekVolume ?? 0;
              const lastWk = v?.lastWeek ?? v?.lastWeekVolume ?? 0;
              const maxVal = Math.max(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...volume.map((vi: any) =>
                  Math.max(vi?.thisWeek ?? vi?.weekVolume ?? 0, vi?.lastWeek ?? vi?.lastWeekVolume ?? 0),
                ),
              );
              const thisPct = maxVal > 0 ? (thisWk / maxVal) * 100 : 0;
              const lastPct = maxVal > 0 ? (lastWk / maxVal) * 100 : 0;
              return (
                <div key={`bar-${i}`} className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-neutral-500 w-12 truncate">
                    {v?.type ?? '--'}
                  </span>
                  <div className="flex-1 space-y-px">
                    <div className="h-1.5 bg-violet-500/60" style={{ width: `${thisPct}%` }} />
                    <div className="h-1.5 bg-neutral-600/40" style={{ width: `${lastPct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-1.5 bg-violet-500/60" />
                <span className="text-[7px] font-mono text-neutral-600">This Wk</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-1.5 bg-neutral-600/40" />
                <span className="text-[7px] font-mono text-neutral-600">Last Wk</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SPREADS TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spreads: any[] = data?.spreads ?? data?.spreadTrends ?? [];

  if (spreads.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'secNoSpreads', 'No spread data available')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secSpreadTrends', 'Benchmark Spread Trends (bp)')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Tranche</th>
            <th className="px-2 py-1.5 text-left font-bold">Sector</th>
            <th className="px-2 py-1.5 text-right font-bold">Current</th>
            <th className="px-2 py-1.5 text-right font-bold">1M Ago</th>
            <th className="px-2 py-1.5 text-right font-bold">3M Ago</th>
            <th className="px-2 py-1.5 text-right font-bold">1M Chg</th>
            <th className="px-2 py-1.5 text-right font-bold">3M Chg</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {spreads.map((s: any, i: number) => {
            const current = s?.current ?? s?.spread ?? null;
            const oneM = s?.oneMonthAgo ?? s?.spread1m ?? null;
            const threeM = s?.threeMonthAgo ?? s?.spread3m ?? null;
            const chg1m = current != null && oneM != null ? current - oneM : null;
            const chg3m = current != null && threeM != null ? current - threeM : null;
            return (
              <tr key={`${s?.tranche}-${s?.sector}-${i}`} className="border-b border-border/5 hover:bg-violet-400/[0.02]">
                <td className={`px-2 py-1.5 font-bold ${ratingColor(s?.tranche ?? s?.rating)}`}>
                  {s?.tranche ?? s?.rating ?? '--'}
                </td>
                <td className="px-2 py-1.5 text-neutral-400">
                  {s?.sector ?? s?.type ?? '--'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${spreadColor(current)}`}>
                  {fmtBps(current)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {fmtBps(oneM)}
                </td>
                <td className="px-2 py-1.5 text-right text-white/60">
                  {fmtBps(threeM)}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${spreadChangeColor(chg1m)}`}>
                  {chg1m != null ? `${chg1m >= 0 ? '+' : ''}${chg1m.toFixed(0)}` : '--'}
                </td>
                <td className={`px-2 py-1.5 text-right font-bold ${spreadChangeColor(chg3m)}`}>
                  {chg3m != null ? `${chg3m >= 0 ? '+' : ''}${chg3m.toFixed(0)}` : '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Spread range indicator */}
      {spreads.length > 0 && (
        <div className="px-3 py-2 border-t border-border/20">
          <div className="text-[7px] font-mono text-neutral-600 uppercase mb-1">Spread Range (3M)</div>
          <div className="space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {spreads.slice(0, 6).map((s: any, i: number) => {
              const current = s?.current ?? s?.spread ?? 0;
              const threeM = s?.threeMonthAgo ?? s?.spread3m ?? current;
              const min = Math.min(current, threeM);
              const max = Math.max(current, threeM);
              const rangeMax = Math.max(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...spreads.slice(0, 6).map((si: any) => {
                  const c = si?.current ?? si?.spread ?? 0;
                  const t3 = si?.threeMonthAgo ?? si?.spread3m ?? c;
                  return Math.max(c, t3);
                }),
              );
              const leftPct = rangeMax > 0 ? (min / rangeMax) * 100 : 0;
              const widthPct = rangeMax > 0 ? ((max - min) / rangeMax) * 100 : 0;
              return (
                <div key={`range-${i}`} className="flex items-center gap-2">
                  <span className={`text-[7px] font-mono w-8 ${ratingColor(s?.tranche ?? s?.rating)}`}>
                    {s?.tranche ?? s?.rating ?? '--'}
                  </span>
                  <div className="flex-1 relative h-2 bg-neutral-900">
                    <div
                      className="absolute top-0 h-full bg-violet-500/30"
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                    />
                    <div
                      className="absolute top-0 w-0.5 h-full bg-violet-400"
                      style={{ left: `${rangeMax > 0 ? (current / rangeMax) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-neutral-500 w-8 text-right">
                    {fmtBps(current)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CALENDAR TAB ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CalendarTab({ data, t }: { data: any; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendar: any[] = data?.calendar ?? data?.upcomingDeals ?? [];

  if (calendar.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'secNoCalendar', 'No upcoming deals this week')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'secUpcomingDeals', 'Upcoming Deals — Expected to Price This Week')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Date</th>
            <th className="px-2 py-1.5 text-left font-bold">Deal</th>
            <th className="px-2 py-1.5 text-left font-bold">Type</th>
            <th className="px-2 py-1.5 text-right font-bold">Size</th>
            <th className="px-2 py-1.5 text-center font-bold">Status</th>
            <th className="px-2 py-1.5 text-left font-bold">Lead Mgrs</th>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {calendar.map((d: any, i: number) => (
            <tr key={`cal-${i}`} className="border-b border-border/5 hover:bg-violet-400/[0.02]">
              <td className="px-2 py-1.5 text-neutral-300 font-bold">
                {d?.pricingDate ?? d?.date ?? d?.expectedDate ?? '--'}
              </td>
              <td className="px-2 py-1.5 font-bold truncate max-w-[120px]" style={{ color: ACCENT }}>
                {d?.dealName ?? d?.name ?? '--'}
              </td>
              <td className="px-2 py-1.5">
                <span className="px-1 py-0.5 text-[7px] font-black uppercase tracking-wider border border-violet-500/30 bg-violet-500/10 text-violet-400">
                  {d?.type ?? d?.assetType ?? '--'}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right text-white/80 font-bold">
                {fmtB(d?.size ?? d?.dealSize)}
              </td>
              <td className="px-2 py-1.5 text-center">
                <span
                  className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider border ${statusColor(d?.status)} ${statusBg(d?.status)}`}
                >
                  {d?.status ?? '--'}
                </span>
              </td>
              <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[140px]">
                {Array.isArray(d?.leadManagers)
                  ? d.leadManagers.join(', ')
                  : d?.leadManagers ?? d?.leads ?? '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Weekly supply total */}
      {calendar.length > 0 && (
        <div className="px-3 py-2 border-t border-border/20">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Expected Deals</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">{calendar.length}</span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Est. Supply</span>
              <span className="text-[9px] font-mono font-bold text-white ml-1.5">
                {fmtB(
                  calendar.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, d: any) => sum + (d?.size ?? d?.dealSize ?? 0),
                    0,
                  ),
                )}
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Pricing</span>
              <span className="text-[9px] font-mono font-bold text-cyan-400 ml-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {calendar.filter((d: any) => (d?.status ?? '').toLowerCase() === 'pricing').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      {data?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            Last update: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Metric Card ──

function MetricCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number;
}) {
  return (
    <div className="px-2 py-1.5 bg-black hover:bg-violet-400/[0.02]">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-[10px] font-mono font-bold text-white">
          {value}
        </span>
        {change != null && (
          <span
            className={`text-[8px] font-mono font-bold ${
              change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-neutral-500'
            }`}
          >
            {`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
          </span>
        )}
      </div>
    </div>
  );
}
