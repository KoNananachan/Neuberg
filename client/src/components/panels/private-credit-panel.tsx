import { usePrivateCredit } from '../../api/hooks/use-private-credit';
import { useT } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number, d = 2): string {
  return `${n.toFixed(d)}%`;
}

function fmtBp(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtX(n: number): string {
  return `${n.toFixed(1)}x`;
}

function fmtMoic(n: number): string {
  return `${n.toFixed(2)}x`;
}

function fmtDollarB(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtDollarM(n: number): string {
  return `$${n.toFixed(0)}M`;
}

function fmtOid(n: number): string {
  return `${n.toFixed(1)}`;
}

// ── Color helpers ──

function premiumDiscountColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function perfColor(n: number, threshHigh: number, threshLow: number): string {
  if (n >= threshHigh) return 'text-green-400';
  if (n >= threshLow) return 'text-yellow-400';
  return 'text-red-400';
}

function lossColor(n: number): string {
  if (n <= 1) return 'text-green-400';
  if (n <= 3) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/10 bg-[#030303]">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-emerald-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PrivateCreditPanel() {
  const t = useT();
  const { data, isLoading, error } = usePrivateCredit();
  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
        <span className="ml-2 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
          {t('loading')}
        </span>
      </div>
    );
  }

  if (error && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono uppercase tracking-wider">
          FAILED TO LOAD
        </span>
      </div>
    );
  }

  if (!d) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* 1. Direct Lending */}
        <DirectLendingSection items={d.directLending} />

        {/* 2. BDC Monitor */}
        <BdcMonitorSection items={d.bdcMonitor ?? d.bdcPerformance} />

        {/* 3. Market Terms */}
        <MarketTermsSection terms={d.marketTerms ?? d.marketSummary} />

        {/* 4. Vintage Performance */}
        <VintagePerformanceSection items={d.vintagePerformance} />

        {/* 5. Deal Pipeline */}
        <DealPipelineSection items={d.dealPipeline} />

        {/* 6. Market Stats */}
        <MarketStatsSection stats={d.marketStats ?? d.marketSummary} />
      </div>
    </div>
  );
}

// ── 1. Direct Lending ──

function DirectLendingSection({ items }: { items: any[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Direct Lending" />

      <div className="grid grid-cols-[1fr_56px_60px_48px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Deal Size Tier</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">All-In</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">OID</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Lever</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
      </div>

      {items.map((item: any, idx: number) => (
        <div
          key={item.segment ?? item.tier ?? idx}
          className="grid grid-cols-[1fr_56px_60px_48px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">
            {item.segment ?? item.tier}
          </span>
          <span className="text-[8px] font-bold text-emerald-400 text-right">
            {fmtBp(item.spread)}
          </span>
          <span className="text-[8px] font-bold text-white text-right">
            {fmtPct(item.allInYield)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {fmtOid(item.oid ?? item.OID ?? 0)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {fmtX(item.leverage)}
          </span>
          <span className={`text-[8px] font-bold text-right ${(item.change ?? item.weekChange ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(item.change ?? item.weekChange ?? 0) >= 0 ? '+' : ''}{(item.change ?? item.weekChange ?? 0).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 2. BDC Monitor ──

function BdcMonitorSection({ items }: { items: any[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="BDC Monitor" />

      <div className="grid grid-cols-[1fr_48px_48px_52px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">NAV</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Disc/Pm</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Yield</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">NonAcc</span>
      </div>

      {items.slice(0, 10).map((item: any, idx: number) => {
        const discPrem = item.premium ?? item.discountPremium ?? ((item.price / item.nav - 1) * 100);
        return (
          <div
            key={item.name ?? item.ticker ?? idx}
            className="grid grid-cols-[1fr_48px_48px_52px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white truncate">
              {item.name ?? item.ticker}
            </span>
            <span className="text-[8px] font-bold text-white text-right">
              {item.nav?.toFixed(2)}
            </span>
            <span className="text-[8px] font-bold text-white text-right">
              {item.price?.toFixed(2)}
            </span>
            <span className={`text-[8px] font-bold text-right ${premiumDiscountColor(discPrem)}`}>
              {discPrem >= 0 ? '+' : ''}{discPrem.toFixed(1)}%
            </span>
            <span className="text-[8px] text-emerald-400 text-right">
              {fmtPct(item.dividendYield ?? item.yield ?? 0)}
            </span>
            <span className={`text-[8px] font-bold text-right ${(item.nonAccruals ?? 0) > 3 ? 'text-red-400' : (item.nonAccruals ?? 0) > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {fmtPct(item.nonAccruals ?? 0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Market Terms ──

function MarketTermsSection({ terms }: { terms: any | undefined }) {
  if (!terms) return null;

  const rows = [
    { label: 'Avg All-In Yield', value: fmtPct(terms.avgYield ?? terms.avgSpread ?? 0), accent: true },
    { label: 'Avg Leverage', value: fmtX(terms.avgLeverage ?? 0), accent: false },
    { label: 'EBITDA Floor', value: terms.ebitdaFloor != null ? fmtDollarM(terms.ebitdaFloor) : 'N/A', accent: false },
    { label: 'Cov-Lite %', value: fmtPct(terms.covLitePct ?? terms.covLite ?? 0, 0), accent: false },
    { label: 'Avg OID', value: terms.avgOid != null ? fmtOid(terms.avgOid) : 'N/A', accent: false },
    { label: 'Avg Spread', value: fmtBp(terms.avgSpread ?? 0), accent: true },
    { label: 'Default Rate', value: fmtPct(terms.trailingDefaultRate ?? terms.defaultRate ?? 0), accent: false },
    { label: 'Dry Powder', value: terms.dryPowder != null ? fmtDollarB(terms.dryPowder) : 'N/A', accent: false },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Market Terms" />

      <div className="grid grid-cols-2 gap-0">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`flex items-center justify-between px-2 py-[3px] hover:bg-emerald-400/[0.02] transition-colors ${i < rows.length - 2 ? 'border-b border-border/5' : ''}`}
          >
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">{r.label}</span>
            <span className={`text-[8px] font-bold text-right ${r.accent ? 'text-emerald-400' : 'text-white'}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Vintage Performance ──

function VintagePerformanceSection({ items }: { items: any[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Vintage Performance" />

      <div className="grid grid-cols-[56px_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Year</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">IRR</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">MOIC</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Def %</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Loss %</span>
      </div>

      {items.map((item: any, idx: number) => (
        <div
          key={item.year ?? item.vintage ?? idx}
          className="grid grid-cols-[56px_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">
            {item.year ?? item.vintage}
          </span>
          <span className={`text-[8px] font-bold text-right ${perfColor(item.irr ?? item.IRR ?? 0, 10, 6)}`}>
            {fmtPct(item.irr ?? item.IRR ?? 0, 1)}
          </span>
          <span className={`text-[8px] font-bold text-right ${perfColor(item.moic ?? item.MOIC ?? 0, 1.3, 1.1)}`}>
            {fmtMoic(item.moic ?? item.MOIC ?? 0)}
          </span>
          <span className={`text-[8px] font-bold text-right ${lossColor(item.defaultRate ?? item.defaults ?? 0)}`}>
            {fmtPct(item.defaultRate ?? item.defaults ?? 0, 1)}
          </span>
          <span className={`text-[8px] font-bold text-right ${lossColor(item.lossRate ?? item.losses ?? 0)}`}>
            {fmtPct(item.lossRate ?? item.losses ?? 0, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 5. Deal Pipeline ──

function DealPipelineSection({ items }: { items: any[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Deal Pipeline" />

      <div className="grid grid-cols-[1fr_56px_56px_52px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Borrower</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Size</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Lever</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Status</span>
      </div>

      {items.map((item: any, idx: number) => (
        <div
          key={item.borrower ?? item.issuer ?? item.name ?? idx}
          className="grid grid-cols-[1fr_56px_56px_52px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">
            {item.borrower ?? item.issuer ?? item.name}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {fmtDollarM(item.size ?? item.dealSize ?? 0)}
          </span>
          <span className="text-[8px] font-bold text-emerald-400 text-right">
            {fmtBp(item.spread ?? 0)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {fmtX(item.leverage ?? 0)}
          </span>
          <span className="text-right">
            <span className={`text-[7px] font-bold px-1 py-0 ${
              (item.status ?? '').toLowerCase() === 'closed' ? 'bg-green-500/15 text-green-400' :
              (item.status ?? '').toLowerCase() === 'pricing' ? 'bg-yellow-500/15 text-yellow-400' :
              (item.status ?? '').toLowerCase() === 'in market' ? 'bg-emerald-500/15 text-emerald-400' :
              'bg-white/10 text-white/50'
            }`}>
              {item.status ?? 'TBD'}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 6. Market Stats ──

function MarketStatsSection({ stats }: { stats: any | undefined }) {
  if (!stats) return null;

  const rows = [
    { label: 'Total AUM', value: stats.totalAUM != null ? fmtDollarB(stats.totalAUM) : stats.aum != null ? fmtDollarB(stats.aum) : 'N/A' },
    { label: 'Fundraising YTD', value: stats.fundraising != null ? fmtDollarB(stats.fundraising) : 'N/A' },
    { label: 'Deployment YTD', value: stats.deployment != null ? fmtDollarB(stats.deployment) : 'N/A' },
    { label: 'Dry Powder', value: stats.dryPowder != null ? fmtDollarB(stats.dryPowder) : 'N/A' },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Market Stats" />

      <div className="grid grid-cols-2 gap-0">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-2 py-1 hover:bg-emerald-400/[0.02] transition-colors border-b border-border/5"
          >
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">{r.label}</span>
            <span className="text-[10px] font-bold text-white text-right">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
