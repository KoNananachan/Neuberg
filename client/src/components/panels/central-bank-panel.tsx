import { useState, useMemo } from 'react';
import { useCentralBank } from '../../api/hooks/use-central-bank';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type Tab = 'RATES' | 'EXPECTATIONS' | 'BALANCE SHEET' | 'INFLATION';

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2) + '%';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(1) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}bp`;
}

function fmtDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '--';
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function fmtTrn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `$${(n / 1e12).toFixed(2)}T`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}$${(Math.abs(n) / 1e9).toFixed(0)}B`;
}

// ── Badge helpers ──

function biasBadge(bias: string | null | undefined): { text: string; cls: string } {
  const b = (bias || '').toUpperCase();
  if (b === 'HAWKISH') return { text: 'HAWKISH', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (b === 'DOVISH') return { text: 'DOVISH', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: 'NEUTRAL', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function qeBadge(status: string | null | undefined): { text: string; cls: string } {
  const s = (status || '').toUpperCase();
  if (s === 'QE' || s === 'EASING') return { text: 'QE', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  if (s === 'QT' || s === 'TIGHTENING') return { text: 'QT', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  return { text: 'HOLD', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function onTrackBadge(onTrack: boolean | null | undefined): { text: string; cls: string } {
  if (onTrack === true) return { text: 'ON TRACK', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  if (onTrack === false) return { text: 'OFF TRACK', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  return { text: '--', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function probColor(pct: number | null | undefined): string {
  if (pct == null) return 'text-neutral-500';
  if (pct >= 60) return 'text-amber-400';
  if (pct >= 30) return 'text-neutral-300';
  return 'text-neutral-600';
}

function gapColor(gap: number | null | undefined): string {
  if (gap == null) return 'text-neutral-500';
  if (Math.abs(gap) < 0.3) return 'text-neutral-400';
  if (gap > 0) return 'text-red-400';
  return 'text-green-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function CentralBankPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, refetch } = useCentralBank() as { data: any; isLoading: boolean; refetch: () => void };
  const [activeTab, setActiveTab] = useState<Tab>('RATES');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'cbpTitle', 'Central Bank Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.activeBanks != null && (
            <span className="text-[7px] font-mono text-neutral-600">
              {data.activeBanks} {tr(t, 'cbpBanks', 'BANKS')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/20 shrink-0">
        <div className="flex gap-px px-2 py-1 flex-1">
          {(['RATES', 'EXPECTATIONS', 'BALANCE SHEET', 'INFLATION'] as Tab[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
                activeTab === v
                  ? 'text-amber-400 border-b border-amber-400'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cbpNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'RATES' && <RatesView data={data} t={t} />}
        {data && activeTab === 'EXPECTATIONS' && <ExpectationsView data={data} t={t} />}
        {data && activeTab === 'BALANCE SHEET' && <BalanceSheetView data={data} t={t} />}
        {data && activeTab === 'INFLATION' && <InflationView data={data} t={t} />}
      </div>

      {/* Footer timestamp */}
      {data?.timestamp && (
        <div className="px-3 py-0.5 border-t border-border/20 bg-[#050505] shrink-0">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'cbpUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── RATES VIEW ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RatesView({ data, t }: { data: any; t: TFn }) {
  const banks = useMemo(
    () => [...(data?.policyRates || [])].sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => (b?.rate ?? 0) - (a?.rate ?? 0),
    ),
    [data?.policyRates],
  );

  return (
    <div>
      {/* Policy Rates Table */}
      <div className="px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'cbpPolicyRates', 'Policy Rates')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[52px_44px_48px_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbpBank', 'Bank')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpRate', 'Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpLastChg', 'Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpChgDate', 'Date')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpNextMtg', 'Next Mtg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpImplied', 'Implied')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">{tr(t, 'cbpBias', 'Bias')}</span>
      </div>

      {/* Rows */}
      {banks.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'cbpNoRates', 'No rate data')}
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {banks.map((bank: any, i: number) => {
        const bias = biasBadge(bank?.bias);
        return (
          <div
            key={bank?.code || i}
            className="grid grid-cols-[52px_44px_48px_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {bank?.code || '--'}
            </span>
            <span className="text-[8px] font-mono font-bold text-amber-400 text-right">
              {fmtRate(bank?.rate)}
            </span>
            <span className={`text-[8px] font-mono text-right ${changeColor(bank?.lastChangeBps)}`}>
              {fmtBps(bank?.lastChangeBps)}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 text-right">
              {fmtDate(bank?.lastChangeDate)}
            </span>
            <span className="text-[7px] font-mono text-neutral-400 text-right">
              {fmtDate(bank?.nextMeetingDate)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtRate(bank?.marketImpliedRate)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${bias.cls}`}>
                {bias.text}
              </span>
            </div>
          </div>
        );
      })}

      {/* Market Impact Metrics */}
      {data?.marketImpact && (
        <>
          <div className="px-2 py-1 border-b border-border/20 bg-[#030303] mt-0">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
              {tr(t, 'cbpMarketImpact', 'Market Impact')}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-px px-2 py-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.marketImpact as any[]).map((metric: any, i: number) => (
              <div
                key={metric?.label || i}
                className="px-2 py-1.5 border border-border/20"
                style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}
              >
                <div className="text-[6px] font-mono text-neutral-500 uppercase tracking-wider">
                  {metric?.label || '--'}
                </div>
                <div className="text-[10px] font-mono font-bold text-amber-400 mt-0.5">
                  {metric?.value ?? '--'}
                </div>
                {metric?.change != null && (
                  <div className={`text-[7px] font-mono ${changeColor(metric.change)}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── EXPECTATIONS VIEW ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ExpectationsView({ data, t }: { data: any; t: TFn }) {
  const meetings = data?.rateExpectations?.meetings || [];
  const banks = data?.rateExpectations?.banks || ['FED', 'ECB', 'BOE'];

  return (
    <div>
      {/* Rate Expectations Table */}
      <div className="px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'cbpRateExpectations', 'Rate Expectations')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbpBank', 'Bank')}</span>
        {meetings.slice(0, 4).map((mtg: any, i: number) => (
          <span key={mtg?.date || i} className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
            {fmtDate(mtg?.date) || `Mtg ${i + 1}`}
          </span>
        ))}
        {meetings.length === 0 && (
          <>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 1</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 2</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 3</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 4</span>
          </>
        )}
      </div>

      {/* Implied rates per bank */}
      {banks.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'cbpNoExpectations', 'No expectations data')}
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(banks as any[]).map((bankCode: any, bi: number) => {
        const bankName = typeof bankCode === 'string' ? bankCode : bankCode?.code || '--';
        const impliedRates = typeof bankCode === 'string'
          ? meetings.slice(0, 4).map((m: any) => m?.impliedRates?.[bankCode])
          : meetings.slice(0, 4).map((m: any) => m?.impliedRates?.[bankCode?.code]);

        return (
          <div
            key={bankName + bi}
            className="grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{bankName}</span>
            {impliedRates.map((rate: any, ri: number) => (
              <span key={ri} className="text-[8px] font-mono text-amber-400 text-center">
                {fmtRate(rate)}
              </span>
            ))}
            {impliedRates.length === 0 && (
              <>
                <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
                <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
                <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
                <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
              </>
            )}
          </div>
        );
      })}

      {/* Probabilities */}
      <div className="px-2 py-1 border-b border-border/20 bg-[#030303] mt-0">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'cbpProbabilities', 'Cut / Hike / Hold Probabilities')}
        </span>
      </div>

      <div className="grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbpAction', 'Action')}</span>
        {meetings.slice(0, 4).map((mtg: any, i: number) => (
          <span key={mtg?.date || i} className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
            {fmtDate(mtg?.date) || `Mtg ${i + 1}`}
          </span>
        ))}
        {meetings.length === 0 && (
          <>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 1</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 2</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 3</span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">MTG 4</span>
          </>
        )}
      </div>

      {['CUT', 'HIKE', 'HOLD'].map((action) => (
        <div
          key={action}
          className="grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className={`text-[8px] font-mono font-bold ${
            action === 'CUT' ? 'text-green-400' : action === 'HIKE' ? 'text-red-400' : 'text-neutral-400'
          }`}>
            {action}
          </span>
          {meetings.slice(0, 4).map((mtg: any, i: number) => {
            const prob = action === 'CUT' ? mtg?.probCut
              : action === 'HIKE' ? mtg?.probHike
              : mtg?.probHold;
            return (
              <span key={i} className={`text-[8px] font-mono text-center ${probColor(prob)}`}>
                {fmtPct(prob)}
              </span>
            );
          })}
          {meetings.length === 0 && (
            <>
              <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
              <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
              <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
              <span className="text-[8px] font-mono text-neutral-600 text-center">--</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── BALANCE SHEET VIEW ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BalanceSheetView({ data, t }: { data: any; t: TFn }) {
  const sheets = data?.balanceSheets || [];

  return (
    <div>
      {/* Balance Sheets Table */}
      <div className="px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'cbpBalanceSheets', 'Balance Sheets')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_64px_56px_44px_52px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbpBank', 'Bank')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpTotalAssets', 'Assets')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbp1MChg', '1M Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">{tr(t, 'cbpStatus', 'Status')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpPace', 'Pace/Mo')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpGdp', 'A/GDP')}</span>
      </div>

      {/* Rows */}
      {sheets.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'cbpNoSheets', 'No balance sheet data')}
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(sheets as any[]).map((sheet: any, i: number) => {
        const status = qeBadge(sheet?.status);
        return (
          <div
            key={sheet?.bank || i}
            className="grid grid-cols-[48px_64px_56px_44px_52px_48px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {sheet?.bank || '--'}
            </span>
            <span className="text-[8px] font-mono text-amber-400 text-right">
              {fmtTrn(sheet?.totalAssets)}
            </span>
            <span className={`text-[8px] font-mono text-right ${changeColor(sheet?.monthlyChange)}`}>
              {fmtBn(sheet?.monthlyChange)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${status.cls}`}>
                {status.text}
              </span>
            </div>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtBn(sheet?.monthlyPace)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtPct(sheet?.assetGdpRatio)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── INFLATION VIEW ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InflationView({ data, t }: { data: any; t: TFn }) {
  const targets = data?.inflationTargets || [];
  const guidance = data?.forwardGuidance || [];

  return (
    <div>
      {/* Inflation Targets Table */}
      <div className="px-2 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
          {tr(t, 'cbpInflationTargets', 'Inflation Targets')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_44px_48px_48px_44px_52px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{tr(t, 'cbpBank', 'Bank')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpTarget', 'Target')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpCpi', 'CPI')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpCore', 'Core')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{tr(t, 'cbpGap', 'Gap')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">{tr(t, 'cbpOnTrack', 'Status')}</span>
      </div>

      {/* Rows */}
      {targets.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono">
          {tr(t, 'cbpNoInflation', 'No inflation data')}
        </div>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(targets as any[]).map((row: any, i: number) => {
        const track = onTrackBadge(row?.onTrack);
        const gap = row?.gap ?? (row?.currentCpi != null && row?.target != null ? row.currentCpi - row.target : null);
        return (
          <div
            key={row?.bank || i}
            className="grid grid-cols-[48px_44px_48px_48px_44px_52px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {row?.bank || '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtRate(row?.target)}
            </span>
            <span className="text-[8px] font-mono text-amber-400 text-right">
              {fmtRate(row?.currentCpi)}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right">
              {fmtRate(row?.coreCpi)}
            </span>
            <span className={`text-[8px] font-mono text-right ${gapColor(gap)}`}>
              {gap != null ? (gap > 0 ? '+' : '') + gap.toFixed(1) : '--'}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${track.cls}`}>
                {track.text}
              </span>
            </div>
          </div>
        );
      })}

      {/* Forward Guidance Cards */}
      {guidance.length > 0 && (
        <>
          <div className="px-2 py-1 border-b border-border/20 bg-[#030303] mt-0">
            <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
              {tr(t, 'cbpForwardGuidance', 'Forward Guidance')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px px-2 py-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(guidance as any[]).map((card: any, i: number) => {
              const bias = biasBadge(card?.tone);
              return (
                <div
                  key={card?.bank || i}
                  className="px-2 py-1.5 border border-border/20"
                  style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono font-bold text-white">
                      {card?.bank || '--'}
                    </span>
                    <span className={`px-1 py-0 text-[6px] font-black font-mono uppercase ${bias.cls}`}>
                      {bias.text}
                    </span>
                  </div>
                  <div className="text-[7px] font-mono text-neutral-400 leading-tight">
                    {card?.summary || '--'}
                  </div>
                  {card?.date && (
                    <div className="text-[6px] font-mono text-neutral-600 mt-1">
                      {fmtDate(card.date)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
