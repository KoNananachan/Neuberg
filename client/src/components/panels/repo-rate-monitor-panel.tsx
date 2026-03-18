import { useRepoRateMonitor } from '../../api/hooks/use-repo-rate-monitor';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(3)}`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtVolume(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadColor(n: number): string {
  if (n < -50) return 'text-red-400';
  if (n < -20) return 'text-yellow-400';
  if (n < 0) return 'text-neutral-400';
  return 'text-neutral-500';
}

function specialnessColor(n: number): string {
  if (n >= 80) return 'text-red-400';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 20) return 'text-sky-400';
  return 'text-neutral-400';
}

// ── Interfaces ──

interface OvernightRate {
  name: string;
  rate: number;
  change: number;
  avg1w: number;
  avg1m: number;
}

interface TermRepo {
  tenor: string;
  gcRate: number;
  spreadToSOFR: number;
  volume: number;
}

interface SpecialCollateral {
  security: string;
  repoRate: number;
  spreadToGC: number;
  specialness: number;
}

// ── Main Panel ──

export function RepoRateMonitorPanel() {
  const t = useT();
  const { data, isLoading } = useRepoRateMonitor();

  const overnightRates = data?.overnightRates as OvernightRate[] | undefined;
  const termRepo = data?.termRepo as TermRepo[] | undefined;
  const specialCollateral = data?.specialCollateral as SpecialCollateral[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="w-1.5 h-1.5 bg-sky-400" />
        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
          {tr(t, 'repoRateMonitorTitle', 'Repo Rate Monitor')}
        </span>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {data && (
          <>
            {/* Overnight Rates */}
            {overnightRates && overnightRates.length > 0 && (
              <OvernightRatesSection rates={overnightRates} t={t} />
            )}

            {/* Term Repo */}
            {termRepo && termRepo.length > 0 && (
              <TermRepoSection rates={termRepo} t={t} />
            )}

            {/* Special Collateral */}
            {specialCollateral && specialCollateral.length > 0 && (
              <SpecialCollateralSection items={specialCollateral} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Overnight Rates Section ──

function OvernightRatesSection({
  rates,
  t,
}: {
  rates: OvernightRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonOvernightRates', 'Overnight Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonRate', 'Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonChange', 'Change')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMon1wAvg', '1W Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMon1mAvg', '1M Avg')}
        </span>
      </div>

      {/* Rows */}
      {rates.map((rate) => (
        <div
          key={rate.name}
          className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400">{rate.name}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(rate.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.change)}`}>
            {fmtChange(rate.change)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(rate.avg1w)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtRate(rate.avg1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Term Repo Section ──

function TermRepoSection({
  rates,
  t,
}: {
  rates: TermRepo[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonTermRepo', 'Term Repo')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_72px_72px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonGcRate', 'GC Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSpreadSOFR', 'Sprd SOFR')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMonVolume', 'Volume')}
        </span>
      </div>

      {/* Rows */}
      {rates.map((rate) => (
        <div
          key={rate.tenor}
          className="grid grid-cols-[1fr_56px_72px_72px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{rate.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(rate.gcRate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.spreadToSOFR)}`}>
            {fmtBps(rate.spreadToSOFR)}bp
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtVolume(rate.volume)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Special Collateral Section ──

function SpecialCollateralSection({
  items,
  t,
}: {
  items: SpecialCollateral[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'repoMonSpecialCollateral', 'Special Collateral')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_72px_64px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'repoMonSecurity', 'Security')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonRepoRate', 'Repo Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'repoMonSpreadGC', 'Sprd GC')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'repoMonSpecialness', 'Specialness')}
        </span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.security}-${i}`}
          className="grid grid-cols-[1fr_56px_72px_64px] gap-0 px-2 py-[3px] border-b border-border/20 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
            {item.security}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(item.repoRate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(item.spreadToGC)}`}>
            {fmtBps(item.spreadToGC)}bp
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${specialnessColor(item.specialness)}`}>
            {item.specialness.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
