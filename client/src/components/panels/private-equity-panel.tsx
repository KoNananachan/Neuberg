import { usePrivateEquity } from '../../api/hooks/use-private-equity';
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

function fmtB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtM(n: number): string {
  return '$' + n.toFixed(0) + 'M';
}

function fmtX(n: number): string {
  return n.toFixed(1) + 'x';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtYr(n: number): string {
  return n.toFixed(1) + 'y';
}

// ── Section header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20 bg-[#030303]">
      <div className="w-[2px] h-3 bg-purple-400" />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PrivateEquityPanel() {
  const t = useT();
  const { data, isLoading } = usePrivateEquity();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-purple-400/40 uppercase tracking-widest animate-pulse">
          {tr(t, 'loading', 'Loading...')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="w-[3px] h-4 bg-purple-400" />
        <span className="text-[10px] font-black font-mono uppercase tracking-tighter text-purple-400">
          {tr(t, 'peTitle', 'PRIVATE EQUITY')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── 1. Market Overview ── */}
        <MarketOverviewSection data={data} />

        {/* ── 2. Top PE Firms ── */}
        <TopFirmsSection firms={data?.topFirms} />

        {/* ── 3. Exit Activity ── */}
        <ExitActivitySection exits={data?.exitActivity} />

        {/* ── 4. Sector Breakdown ── */}
        <SectorBreakdownSection sectors={data?.sectorBreakdown} />
      </div>
    </div>
  );
}

// ── 1. Market Overview ──

function MarketOverviewSection({ data }: { data: any }) {
  const stats = [
    { label: 'DRY POWDER', value: data?.dryPowder != null ? fmtB(data.dryPowder) : '--', accent: true },
    { label: 'DEAL VOLUME', value: data?.dealVolume != null ? fmtB(data.dealVolume) : '--', accent: true },
    { label: 'AVG MULTIPLE', value: data?.avgMultiple != null ? fmtX(data.avgMultiple) : '--', accent: false },
    { label: 'FUNDRAISING YTD', value: data?.fundraisingYtd != null ? fmtB(data.fundraisingYtd) : '--', accent: true },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Market Overview" />
      <div className="grid grid-cols-4 gap-px bg-purple-400/[0.06]">
        {stats.map((s) => (
          <div key={s.label} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">{s.label}</div>
            <div className={`text-[11px] font-black ${s.accent ? 'text-purple-400' : 'text-white/60'}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Top PE Firms ──

function TopFirmsSection({ firms }: { firms: any[] | undefined }) {
  if (!firms || firms.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Top PE Firms" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_36px_44px_44px_40px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">FIRM</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">AUM</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DRY PWD</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DEALS</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">IRR</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">TVPI</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DPI</span>
      </div>

      {/* Rows */}
      {firms.map((f: any, i: number) => (
        <div
          key={f.firm ?? f.name ?? i}
          className="grid grid-cols-[1fr_56px_56px_36px_44px_44px_40px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-purple-400 truncate">
            {f.firm ?? f.name}
          </span>
          <span className="text-[8px] font-bold text-white/60 text-right">
            {f.aum != null ? fmtB(f.aum) : '--'}
          </span>
          <span className="text-[8px] text-white/40 text-right">
            {f.dryPowder != null ? fmtB(f.dryPowder) : '--'}
          </span>
          <span className="text-[8px] text-white/50 text-right">
            {f.deals ?? '--'}
          </span>
          <span className={`text-[8px] font-bold text-right ${(f.irr ?? 0) >= 15 ? 'text-green-400' : (f.irr ?? 0) >= 10 ? 'text-yellow-400' : 'text-white/50'}`}>
            {f.irr != null ? fmtPct(f.irr) : '--'}
          </span>
          <span className="text-[8px] text-white/50 text-right">
            {f.tvpi != null ? fmtX(f.tvpi) : '--'}
          </span>
          <span className="text-[8px] text-white/40 text-right">
            {f.dpi != null ? fmtX(f.dpi) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Exit Activity ──

function ExitActivitySection({ exits }: { exits: any[] | undefined }) {
  if (!exits || exits.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Exit Activity" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_44px_56px_56px_44px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">TYPE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">COUNT</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">VALUE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">HOLD PER</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">MOIC</span>
      </div>

      {/* Rows */}
      {exits.map((e: any, i: number) => (
        <div
          key={e.type ?? e.exitType ?? i}
          className="grid grid-cols-[1fr_44px_56px_56px_44px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">
            {e.type ?? e.exitType}
          </span>
          <span className="text-[8px] text-white/50 text-right">
            {e.count ?? '--'}
          </span>
          <span className="text-[8px] font-bold text-purple-400 text-right">
            {e.value != null ? fmtB(e.value) : e.totalValue != null ? fmtB(e.totalValue) : '--'}
          </span>
          <span className="text-[8px] text-white/40 text-right">
            {e.holdingPeriod != null ? fmtYr(e.holdingPeriod) : '--'}
          </span>
          <span className={`text-[8px] font-bold text-right ${(e.moic ?? 0) >= 2.5 ? 'text-green-400' : (e.moic ?? 0) >= 1.5 ? 'text-yellow-400' : 'text-white/50'}`}>
            {e.moic != null ? fmtX(e.moic) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4. Sector Breakdown ──

function SectorBreakdownSection({ sectors }: { sectors: any[] | undefined }) {
  if (!sectors || sectors.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Sector Breakdown" />

      {/* Table header */}
      <div className="grid grid-cols-[1fr_44px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        <span className="text-[7px] text-white/20 uppercase tracking-wider">SECTOR</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">DEALS</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">VALUE</span>
        <span className="text-[7px] text-white/20 uppercase tracking-wider text-right">MULT</span>
      </div>

      {/* Rows */}
      {sectors.map((s: any, i: number) => {
        const maxValue = Math.max(...sectors.map((x: any) => x.value ?? x.totalValue ?? 0), 1);
        const barWidth = Math.min(((s.value ?? s.totalValue ?? 0) / maxValue) * 100, 100);

        return (
          <div
            key={s.sector ?? s.name ?? i}
            className="grid grid-cols-[1fr_44px_56px_48px] gap-0 px-2 py-[3px] border-b border-white/[0.02] hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[8px] font-bold text-white truncate">
                {s.sector ?? s.name}
              </span>
              <div className="w-full h-[2px] bg-white/[0.04]">
                <div
                  className="h-full bg-purple-400/40"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <span className="text-[8px] text-white/50 text-right">
              {s.deals ?? s.dealCount ?? '--'}
            </span>
            <span className="text-[8px] font-bold text-purple-400 text-right">
              {s.value != null ? fmtB(s.value) : s.totalValue != null ? fmtB(s.totalValue) : '--'}
            </span>
            <span className="text-[8px] text-white/40 text-right">
              {s.multiple != null ? fmtX(s.multiple) : s.avgMultiple != null ? fmtX(s.avgMultiple) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
