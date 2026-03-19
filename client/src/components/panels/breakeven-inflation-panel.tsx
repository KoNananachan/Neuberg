import { useBreakevenInflation } from '../../api/hooks/use-breakeven-inflation';
import { Loader2 } from 'lucide-react';

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(2) + '%';
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(3);
}

function fmtBn(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `$${(n / 1e9).toFixed(1)}B`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function inflationVsTarget(value: number | null | undefined, target: number): string {
  if (value == null) return 'text-neutral-500';
  if (value > target) return 'text-red-400';
  return 'text-green-400';
}

function yieldChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Section header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-[#080808] border-b border-border/20">
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function BreakevenInflationPanel() {
  const { data, isLoading, error } = useBreakevenInflation();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono">
          Failed to load breakeven inflation data
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* 1. Summary Bar */}
        <SummaryBar d={data} />

        {/* 2. Forward Inflation */}
        <ForwardInflationSection forwards={data.forwardInflation} />

        {/* 3a. US Breakevens */}
        <USBreakevensTable breakevens={data.usBreakevens} />

        {/* 3b. Global Breakevens */}
        <GlobalBreakevensTable globals={data.globalBreakevens} />

        {/* 3c. TIPS Market */}
        <TIPSMarketTable tips={data.tipsMarket} />

        {/* 3d. Inflation Swaps */}
        <InflationSwapsSection swaps={data.inflationSwaps} />

        {/* 3e. Inflation Indicators */}
        <InflationIndicatorsTable indicators={data.inflationIndicators} />

        {/* 3f. Commodity Inflation Proxy */}
        <CommodityProxyTable commodities={data.commodityProxy} />
      </div>
    </div>
  );
}

// ── 1. Summary Bar ──

function SummaryBar({ d }: { d: any }) {
  const summary = d.summary;
  if (!summary) return null;

  const items = [
    { label: 'US 10Y BE', value: fmtPct(summary.us10yBreakeven) },
    { label: '5Y5Y FWD', value: fmtPct(summary.fiveYearFiveYearForward) },
    { label: 'REAL RATE', value: fmtPct(summary.realRate) },
    { label: 'INFL RISK PREM', value: fmtPct(summary.inflationRiskPremium) },
    { label: 'TIPS AUM', value: fmtBn(summary.tipsAum) },
    { label: 'MKT-IMPL CPI', value: fmtPct(summary.marketImpliedCpi) },
  ];

  return (
    <div className="grid grid-cols-6 border-b border-border/20">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-2 py-1.5 ${i < items.length - 1 ? 'border-r border-border/20' : ''}`}
        >
          <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
            {item.label}
          </div>
          <div className="text-[10px] font-bold text-amber-400">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── 2. Forward Inflation ──

function ForwardInflationSection({ forwards }: { forwards: any[] | undefined }) {
  if (!forwards || forwards.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Forward Inflation Rates" />
      <div className="grid grid-cols-[72px_64px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Currency</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">5Y5Y Fwd</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
      </div>
      {forwards.map((row: any) => (
        <div
          key={row.currency}
          className="grid grid-cols-[72px_64px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.currency}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.rate)}</span>
          <span className={`text-[8px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3a. US Breakevens Table ──

function USBreakevensTable({ breakevens }: { breakevens: any[] | undefined }) {
  if (!breakevens || breakevens.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="US Breakeven Rates" />
      <div className="grid grid-cols-[40px_52px_52px_52px_44px_44px_44px_44px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE%</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Nom%</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real%</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1M</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">52W Range</span>
      </div>
      {breakevens.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[40px_52px_52px_52px_44px_44px_44px_44px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] font-bold text-amber-400 text-right">{fmtPct(row.breakeven)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.nominalYield)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.realYield)}</span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1d)}`}>
            {fmtChange(row.change1d)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1w)}`}>
            {fmtChange(row.change1w)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.change1m)}`}>
            {fmtChange(row.change1m)}
          </span>
          <span className={`text-[7px] font-bold text-right ${changeColor(row.changeYtd)}`}>
            {fmtChange(row.changeYtd)}
          </span>
          <span className="text-[7px] text-neutral-400 text-right pr-1">
            {row.low52w != null && row.high52w != null
              ? `${fmtRate(row.low52w)}-${fmtRate(row.high52w)}`
              : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3b. Global Breakevens Table ──

function GlobalBreakevensTable({ globals }: { globals: any[] | undefined }) {
  if (!globals || globals.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Global Breakevens" />
      <div className="grid grid-cols-[64px_56px_48px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">10Y BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">CPI</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Core</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Target</span>
      </div>
      {globals.map((row: any) => {
        const target = row.inflationTarget ?? 2.0;
        return (
          <div
            key={row.country}
            className="grid grid-cols-[64px_56px_48px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white truncate">{row.country}</span>
            <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.breakeven10y)}</span>
            <span className={`text-[7px] font-bold text-right ${changeColor(row.change)}`}>
              {fmtChange(row.change)}
            </span>
            <span className={`text-[8px] text-right ${inflationVsTarget(row.latestCpi, target)}`}>
              {fmtPct(row.latestCpi)}
            </span>
            <span className={`text-[8px] text-right ${inflationVsTarget(row.coreCpi, target)}`}>
              {fmtPct(row.coreCpi)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right pr-1">{fmtPct(row.inflationTarget)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3c. TIPS Market Table ──

function TIPSMarketTable({ tips }: { tips: any[] | undefined }) {
  if (!tips || tips.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="TIPS Market" />
      <div className="grid grid-cols-[72px_56px_44px_52px_52px_44px_44px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">CUSIP</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Maturity</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Cpn</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Dur</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Idx Ratio</span>
      </div>
      {tips.map((row: any) => (
        <div
          key={row.cusip}
          className="grid grid-cols-[72px_56px_44px_52px_52px_44px_44px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-amber-400/80 tracking-wide">{row.cusip}</span>
          <span className="text-[8px] text-neutral-300 text-right">{row.maturity}</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.coupon)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.realYield)}</span>
          <span className="text-[8px] text-white text-right">{fmtPrice(row.price)}</span>
          <span className={`text-[7px] font-bold text-right ${yieldChangeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.duration)}</span>
          <span className="text-[8px] text-neutral-300 text-right pr-1">{fmtPrice(row.indexRatio)}</span>
        </div>
      ))}
    </div>
  );
}

// ── 3d. Inflation Swaps ──

function InflationSwapsSection({ swaps }: { swaps: any | undefined }) {
  if (!swaps) return null;

  const usdSwaps: any[] = swaps.usd ?? [];
  const eurSwaps: any[] = swaps.eur ?? [];

  if (usdSwaps.length === 0 && eurSwaps.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Inflation Swaps" />

      {/* USD */}
      {usdSwaps.length > 0 && (
        <>
          <div className="px-2 py-0.5 bg-[#050505] border-b border-border/10">
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">USD</span>
          </div>
          <div className="grid grid-cols-[48px_64px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
          </div>
          {usdSwaps.map((row: any) => (
            <div
              key={`usd-${row.tenor}`}
              className="grid grid-cols-[48px_64px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white">{row.tenor}</span>
              <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.rate)}</span>
              <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
                {fmtChange(row.change)}
              </span>
            </div>
          ))}
        </>
      )}

      {/* EUR */}
      {eurSwaps.length > 0 && (
        <>
          <div className="px-2 py-0.5 bg-[#050505] border-b border-border/10">
            <span className="text-[7px] text-neutral-500 uppercase tracking-wider">EUR</span>
          </div>
          <div className="grid grid-cols-[48px_64px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
            <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
          </div>
          {eurSwaps.map((row: any) => (
            <div
              key={`eur-${row.tenor}`}
              className="grid grid-cols-[48px_64px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-bold text-white">{row.tenor}</span>
              <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.rate)}</span>
              <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
                {fmtChange(row.change)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── 3e. Inflation Indicators Table ──

function InflationIndicatorsTable({ indicators }: { indicators: any[] | undefined }) {
  if (!indicators || indicators.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Inflation Indicators" />
      <div className="grid grid-cols-[120px_56px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Indicator</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Chg</span>
      </div>
      {indicators.map((row: any) => (
        <div
          key={row.name}
          className="grid grid-cols-[120px_56px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.name}</span>
          <span className={`text-[8px] text-right ${row.target != null ? inflationVsTarget(row.value, row.target) : 'text-neutral-300'}`}>
            {fmtPct(row.value)}
          </span>
          <span className={`text-[7px] font-bold text-right pr-1 ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3f. Commodity Inflation Proxy Table ──

function CommodityProxyTable({ commodities }: { commodities: any[] | undefined }) {
  if (!commodities || commodities.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Commodity Inflation Proxy" />
      <div className="grid grid-cols-[80px_64px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Commodity</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1M Chg%</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">YoY Chg%</span>
      </div>
      {commodities.map((row: any) => (
        <div
          key={row.name}
          className="grid grid-cols-[80px_64px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.name}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPrice(row.price)}</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change1m)}`}>
            {fmtChange(row.change1m)}%
          </span>
          <span className={`text-[8px] font-bold text-right pr-1 ${changeColor(row.changeYoy)}`}>
            {fmtChange(row.changeYoy)}%
          </span>
        </div>
      ))}
    </div>
  );
}
