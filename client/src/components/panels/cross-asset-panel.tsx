import { useMemo } from 'react';
import { useCrossAsset, type CrossAssetQuote } from '../../api/hooks/use-cross-asset';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtPrice(n: number, decimals?: number): string {
  if (decimals != null) return n.toFixed(decimals);
  if (Math.abs(n) >= 10000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const bps = n * 100; // change is already in percentage points for yields
  const sign = bps >= 0 ? '+' : '';
  return `${sign}${bps.toFixed(1)}bp`;
}

// Yield symbols show yield% and basis point changes
const YIELD_SYMBOLS = new Set(['^TNX', '^TYX', '^IRX']);

// Commodity color mapping
function commodityColor(symbol: string): string {
  if (symbol === 'GC=F' || symbol === 'SI=F') return '#f59e0b'; // amber
  if (symbol === 'CL=F' || symbol === 'NG=F') return '#3b82f6'; // blue
  if (symbol === 'HG=F') return '#06b6d4'; // cyan
  return '#22c55e'; // green for grains
}

// ── Risk Sentiment Logic ─────────────────────────────────────────────

interface SentimentResult {
  label: 'RISK ON' | 'RISK OFF' | 'MIXED';
  color: string;
  bgColor: string;
}

function computeSentiment(assets: CrossAssetQuote[]): SentimentResult {
  const bySymbol = new Map(assets.map(a => [a.symbol, a]));

  // Equities: count how many of the major indices are up
  const equitySymbols = ['^GSPC', '^IXIC', '^DJI', '^RUT', '^STOXX50E', '^N225', '^HSI', '^FTSE', '000001.SS'];
  const equitiesUp = equitySymbols.filter(s => (bySymbol.get(s)?.changePct ?? 0) > 0).length;
  const equitiesMostlyUp = equitiesUp > equitySymbols.length / 2;

  // HYG up = risk on signal
  const hygUp = (bySymbol.get('HYG')?.changePct ?? 0) > 0;
  // TLT up = flight to safety
  const tltUp = (bySymbol.get('TLT')?.changePct ?? 0) > 0;
  // Gold up = flight to safety
  const goldUp = (bySymbol.get('GC=F')?.changePct ?? 0) > 0;

  let riskOnScore = 0;
  if (equitiesMostlyUp) riskOnScore += 2;
  if (hygUp) riskOnScore += 1;
  if (!goldUp) riskOnScore += 1;
  if (!tltUp) riskOnScore += 1;

  if (riskOnScore >= 4) {
    return { label: 'RISK ON', color: '#22c55e', bgColor: 'rgba(34,197,94,0.08)' };
  } else if (riskOnScore <= 1) {
    return { label: 'RISK OFF', color: '#ef4444', bgColor: 'rgba(239,68,68,0.08)' };
  }
  return { label: 'MIXED', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)' };
}

// ── Category Performance ─────────────────────────────────────────────

interface CategoryPerf {
  name: string;
  avgPct: number;
  color: string;
}

function computeCategoryPerf(assets: CrossAssetQuote[]): CategoryPerf[] {
  const categories: Record<string, { name: string; pcts: number[]; color: string }> = {
    equity: { name: 'Equities', pcts: [], color: '#3b82f6' },
    fixed_income: { name: 'Fixed Inc', pcts: [], color: '#8b5cf6' },
    commodity: { name: 'Commodities', pcts: [], color: '#f59e0b' },
    currency: { name: 'FX', pcts: [], color: '#06b6d4' },
    crypto: { name: 'Crypto', pcts: [], color: '#a855f7' },
  };

  for (const a of assets) {
    if (a.symbol === '^VIX') continue; // Exclude VIX from equity average
    const cat = categories[a.category];
    if (cat) cat.pcts.push(a.changePct);
  }

  return Object.values(categories)
    .map(c => ({
      name: c.name,
      avgPct: c.pcts.length > 0 ? c.pcts.reduce((a, b) => a + b, 0) / c.pcts.length : 0,
      color: c.color,
    }))
    .sort((a, b) => b.avgPct - a.avgPct);
}

// ── Components ───────────────────────────────────────────────────────

function ChangeText({ value, isBps }: { value: number; isBps?: boolean }) {
  const color = value >= 0 ? 'text-bullish' : 'text-bearish';
  return (
    <span className={`text-[9px] font-mono font-bold ${color}`}>
      {isBps ? fmtBps(value) : fmtPct(value)}
    </span>
  );
}

function TrendArrow({ positive }: { positive: boolean }) {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" className="shrink-0 inline-block ml-0.5">
      {positive ? (
        <path d="M4 0 L8 6 L0 6 Z" fill="#22c55e" />
      ) : (
        <path d="M4 6 L8 0 L0 0 Z" fill="#ef4444" />
      )}
    </svg>
  );
}

// ── Yield direction: yield up = red (bearish for bonds), down = green ──
function YieldChangeText({ value }: { value: number }) {
  // Invert color logic: yield up = red, yield down = green
  const color = value <= 0 ? 'text-bullish' : 'text-bearish';
  return (
    <span className={`text-[9px] font-mono font-bold ${color}`}>
      {fmtBps(value)}
    </span>
  );
}

// ── Asset Card ───────────────────────────────────────────────────────

function AssetCard({
  asset,
  accentColor,
  isYield,
  isBondETF,
}: {
  asset: CrossAssetQuote;
  accentColor?: string;
  isYield?: boolean;
  isBondETF?: boolean;
}) {
  const isPositive = asset.changePct >= 0;

  return (
    <div
      className="flex flex-col gap-0.5 px-2 py-1.5 border border-border/20 bg-black/40 hover:bg-white/[0.03] transition-colors min-w-[80px]"
      style={accentColor ? { borderTopColor: accentColor, borderTopWidth: '2px' } : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[7px] font-mono font-black text-neutral/50 uppercase tracking-tight truncate">
          {asset.name}
        </span>
        <TrendArrow positive={isYield ? !isPositive : isPositive} />
      </div>
      <span className="text-[11px] font-mono font-bold text-white leading-none">
        {isYield ? `${fmtPrice(asset.price, 2)}%` : fmtPrice(asset.price)}
      </span>
      {isYield ? (
        <YieldChangeText value={asset.change} />
      ) : isBondETF ? (
        // Bond ETFs: price up = green (normal), but with inverted yield interpretation
        <ChangeText value={asset.changePct} />
      ) : (
        <ChangeText value={asset.changePct} />
      )}
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────────────

function SectionHeader({ title, color, count }: { title: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-border/15">
      <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider" style={{ color }}>
        {title}
      </span>
      <span className="text-[7px] font-mono text-neutral/30">{count}</span>
    </div>
  );
}

// ── Summary Bar ──────────────────────────────────────────────────────

function SummaryBar({ assets }: { assets: CrossAssetQuote[] }) {
  const sentiment = useMemo(() => computeSentiment(assets), [assets]);
  const categoryPerf = useMemo(() => computeCategoryPerf(assets), [assets]);
  const vix = assets.find(a => a.symbol === '^VIX');

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/30 bg-[#050505] overflow-x-auto no-scrollbar">
      {/* Risk sentiment badge */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 shrink-0 border"
        style={{
          borderColor: sentiment.color,
          backgroundColor: sentiment.bgColor,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: sentiment.color }} />
        <span className="text-[9px] font-black font-mono tracking-tight" style={{ color: sentiment.color }}>
          {sentiment.label}
        </span>
      </div>

      {/* VIX level */}
      {vix && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral/40">VIX</span>
          <span className={`text-[9px] font-mono font-bold ${
            vix.price >= 30 ? 'text-bearish' : vix.price >= 20 ? 'text-yellow-500' : 'text-bullish'
          }`}>
            {vix.price.toFixed(1)}
          </span>
          <ChangeText value={vix.changePct} />
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* Category performance ranking */}
      {categoryPerf.map(c => (
        <div key={c.name} className="flex items-center gap-1 shrink-0">
          <span className="text-[7px] font-mono text-neutral/40">{c.name}</span>
          <span
            className="text-[8px] font-mono font-bold"
            style={{ color: c.avgPct >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {fmtPct(c.avgPct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────

export function CrossAssetPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCrossAsset();

  const sections = useMemo(() => {
    if (!data?.assets) return null;

    const bySymbol = new Map(data.assets.map(a => [a.symbol, a]));

    // Filter out VIX from the equity display (used in summary bar only)
    const equities = ['^GSPC', '^IXIC', '^DJI', '^RUT', '^STOXX50E', '^N225', '^HSI', '^FTSE', '000001.SS']
      .map(s => bySymbol.get(s))
      .filter(Boolean) as CrossAssetQuote[];

    const fixedIncome = ['^TNX', '^TYX', '^IRX', 'TLT', 'HYG', 'LQD']
      .map(s => bySymbol.get(s))
      .filter(Boolean) as CrossAssetQuote[];

    const commodities = ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'ZC=F', 'ZW=F']
      .map(s => bySymbol.get(s))
      .filter(Boolean) as CrossAssetQuote[];

    const currencies = ['DX-Y.NYB', 'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCNH=X', 'AUDUSD=X']
      .map(s => bySymbol.get(s))
      .filter(Boolean) as CrossAssetQuote[];

    const crypto = ['BTC-USD', 'ETH-USD', 'SOL-USD']
      .map(s => bySymbol.get(s))
      .filter(Boolean) as CrossAssetQuote[];

    return { equities, fixedIncome, commodities, currencies, crypto };
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <rect x="0" y="0" width="4" height="14" rx="0.5" fill="#94a3b8" opacity="0.8" />
            <rect x="5" y="3" width="4" height="11" rx="0.5" fill="#94a3b8" opacity="0.6" />
            <rect x="10" y="6" width="4" height="8" rx="0.5" fill="#94a3b8" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-neutral/80">
            {t('panelCrossAsset')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.updatedAt && (
            <span className="text-[7px] font-mono text-neutral/30">
              {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-neutral/80 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {data?.assets && data.assets.length > 0 && <SummaryBar assets={data.assets} />}

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral/40 uppercase animate-pulse">
            {t('loading')}
          </span>
        </div>
      )}

      {/* Scrollable sections */}
      {sections && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Equities */}
          <SectionHeader title="Equities" color="#3b82f6" count={sections.equities.length} />
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            {sections.equities.map(a => (
              <AssetCard key={a.symbol} asset={a} accentColor="#3b82f6" />
            ))}
          </div>

          {/* Fixed Income */}
          <SectionHeader title="Fixed Income" color="#8b5cf6" count={sections.fixedIncome.length} />
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            {sections.fixedIncome.map(a => (
              <AssetCard
                key={a.symbol}
                asset={a}
                accentColor="#8b5cf6"
                isYield={YIELD_SYMBOLS.has(a.symbol)}
                isBondETF={!YIELD_SYMBOLS.has(a.symbol)}
              />
            ))}
          </div>

          {/* Commodities */}
          <SectionHeader title="Commodities" color="#f59e0b" count={sections.commodities.length} />
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            {sections.commodities.map(a => (
              <AssetCard key={a.symbol} asset={a} accentColor={commodityColor(a.symbol)} />
            ))}
          </div>

          {/* Currencies */}
          <SectionHeader title="Currencies" color="#06b6d4" count={sections.currencies.length} />
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            {sections.currencies.map(a => (
              <AssetCard key={a.symbol} asset={a} accentColor="#06b6d4" />
            ))}
          </div>

          {/* Crypto */}
          <SectionHeader title="Crypto" color="#a855f7" count={sections.crypto.length} />
          <div className="flex flex-wrap gap-1 px-2 py-1.5">
            {sections.crypto.map(a => (
              <CryptoCard key={a.symbol} asset={a} />
            ))}
          </div>

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}

// ── Crypto Card (with mini sparkline placeholder via SVG bar) ─────────

function CryptoCard({ asset }: { asset: CrossAssetQuote }) {
  const isPositive = asset.changePct >= 0;
  const barColor = isPositive ? '#22c55e' : '#ef4444';

  // Generate deterministic mini-bar visualization from price digits
  const bars = useMemo(() => {
    const digits = Math.abs(Math.round(asset.price * 100)).toString().slice(-8).padStart(8, '0');
    return digits.split('').map((d, i) => ({
      x: i * 4,
      h: (parseInt(d) + 1) * 1.1,
    }));
  }, [asset.price]);

  return (
    <div className="flex flex-col gap-0.5 px-2 py-1.5 border border-border/20 bg-black/40 hover:bg-white/[0.03] transition-colors min-w-[100px]"
      style={{ borderTopColor: '#a855f7', borderTopWidth: '2px' }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[7px] font-mono font-black text-neutral/50 uppercase tracking-tight">
          {asset.name}
        </span>
        <svg width="32" height="12" viewBox="0 0 32 12" className="shrink-0">
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y={12 - b.h} width="3" height={b.h} fill={barColor} opacity={0.5 + (i / 16)} />
          ))}
        </svg>
      </div>
      <span className="text-[11px] font-mono font-bold text-white leading-none">
        {fmtPrice(asset.price)}
      </span>
      <div className="flex items-center gap-1">
        <ChangeText value={asset.changePct} />
        <TrendArrow positive={isPositive} />
      </div>
    </div>
  );
}
