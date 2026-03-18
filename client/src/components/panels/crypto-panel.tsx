import { useState, useMemo } from 'react';
import { useCrypto, type CryptoQuote } from '../../api/hooks/use-crypto';
import { useT } from '../../i18n';
import { Bitcoin, RefreshCw, Search } from 'lucide-react';

export function CryptoPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCrypto();
  const [filter, setFilter] = useState('');

  const coins = useMemo(() => {
    if (!data?.coins) return [];
    if (!filter) return data.coins;
    const q = filter.toLowerCase();
    return data.coins.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [data, filter]);

  const global = data?.global;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Bitcoin className="w-4 h-4 text-yellow-500" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-500">
            {t('panelCrypto')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-yellow-500 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Global stats */}
      {global && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0 text-[8px] font-mono overflow-x-auto no-scrollbar">
          <Stat label={t('cryptoMcap')} value={`$${fmtLarge(global.totalMarketCap)}`}
            change={global.marketCapChange24h} />
          <Stat label={t('cryptoVol')} value={`$${fmtLarge(global.totalVolume24h)}`} />
          <Stat label="BTC" value={`${global.btcDominance.toFixed(1)}%`} />
          <Stat label="ETH" value={`${global.ethDominance.toFixed(1)}%`} />
        </div>
      )}

      {/* Search */}
      <div className="px-2 py-1 border-b border-border/20 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral/50" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('cryptoSearch')}
            className="w-full bg-black/60 border border-border/30 pl-7 pr-2 py-1 text-[10px] font-mono text-white placeholder:text-neutral/30"
          />
        </div>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[0.4fr_1.2fr_0.8fr_0.6fr_0.6fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider shrink-0">
        <span>#</span>
        <span>{t('cmdName')}</span>
        <span className="text-right">{t('price')}</span>
        <span className="text-right">24h</span>
        <span className="text-right">7d</span>
        <span className="text-right">{t('cryptoMcap')}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-500 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {coins.map((coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </div>
    </div>
  );
}

function CoinRow({ coin: c }: { coin: CryptoQuote }) {
  return (
    <div className="grid grid-cols-[0.4fr_1.2fr_0.8fr_0.6fr_0.6fr_0.8fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono text-neutral/30">{c.rank}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <img src={c.image} alt="" className="w-4 h-4 shrink-0" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="min-w-0">
          <span className="text-[10px] font-mono font-bold text-white">{c.symbol}</span>
          <span className="text-[7px] font-mono text-neutral/30 ml-1 truncate">{c.name}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-white text-right">
        {fmtPrice(c.price)}
      </span>
      <span className={`text-[9px] font-mono font-bold text-right ${
        c.change24h >= 0 ? 'text-bullish' : 'text-bearish'
      }`}>
        {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(1)}%
      </span>
      <span className={`text-[9px] font-mono font-bold text-right ${
        (c.change7d ?? 0) >= 0 ? 'text-bullish' : 'text-bearish'
      }`}>
        {c.change7d != null ? `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(1)}%` : '—'}
      </span>
      <div className="flex items-center justify-end gap-1">
        <span className="text-[8px] font-mono text-neutral/50">${fmtLarge(c.marketCap)}</span>
        {c.sparkline7d.length > 2 && (
          <Sparkline data={c.sparkline7d} positive={c.change7d != null ? c.change7d >= 0 : c.change24h >= 0} />
        )}
      </div>
    </div>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  // Downsample to ~20 points
  const step = Math.max(1, Math.floor(data.length / 20));
  const pts = data.filter((_, i) => i % step === 0);

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const W = 32;
  const H = 12;

  const points = pts
    .map((v, i) => `${(i / (pts.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');

  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#22c55e' : '#ef4444'}
        strokeWidth={1}
      />
    </svg>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-neutral/40">{label}</span>
      <span className="text-white font-bold">{value}</span>
      {change != null && (
        <span className={`${change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function fmtPrice(n: number): string {
  if (n >= 1000) return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
}

function fmtLarge(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}
