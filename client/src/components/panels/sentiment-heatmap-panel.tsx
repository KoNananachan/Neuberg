import { useState, useMemo } from 'react';
import { useT } from '../../i18n';
import { Flame, ChevronLeft, Newspaper, TrendingUp, TrendingDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SectorInfo {
  name: string;
  etf: string;
  keywords: string[];
}

/* ------------------------------------------------------------------ */
/*  Sector configuration with realistic keyword themes                 */
/* ------------------------------------------------------------------ */

const SECTORS: SectorInfo[] = [
  { name: 'Technology', etf: 'XLK', keywords: ['AI chips', 'cloud revenue', 'semiconductor shortage', 'SaaS growth', 'antitrust regulation'] },
  { name: 'Healthcare', etf: 'XLV', keywords: ['FDA approval', 'drug pricing', 'biotech pipeline', 'hospital earnings', 'Medicare expansion'] },
  { name: 'Finance', etf: 'XLF', keywords: ['rate decision', 'loan growth', 'credit risk', 'bank earnings', 'fintech disruption'] },
  { name: 'Energy', etf: 'XLE', keywords: ['oil supply', 'OPEC cuts', 'renewable transition', 'LNG demand', 'refinery margins'] },
  { name: 'Consumer', etf: 'XLY', keywords: ['retail sales', 'consumer confidence', 'e-commerce growth', 'inflation impact', 'brand loyalty'] },
  { name: 'Industrial', etf: 'XLI', keywords: ['manufacturing PMI', 'supply chain', 'infrastructure bill', 'defense spending', 'automation'] },
  { name: 'Utilities', etf: 'XLU', keywords: ['grid modernization', 'rate hike impact', 'renewable capacity', 'dividend yield', 'weather events'] },
  { name: 'Real Estate', etf: 'XLRE', keywords: ['REIT earnings', 'office vacancy', 'housing starts', 'mortgage rates', 'commercial leasing'] },
  { name: 'Materials', etf: 'XLB', keywords: ['copper prices', 'steel demand', 'mining output', 'chemical margins', 'lithium supply'] },
  { name: 'Communication', etf: 'XLC', keywords: ['ad revenue', 'streaming subs', 'content spend', 'telecom capex', '5G rollout'] },
];

/* ------------------------------------------------------------------ */
/*  Deterministic mock data generator (hash-based)                     */
/* ------------------------------------------------------------------ */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Returns a deterministic float in [min, max) */
function seededRandom(seed: number, min: number, max: number): number {
  // Simple LCG step
  const x = Math.abs(((seed * 1103515245 + 12345) | 0) & 0x7fffffff);
  const t = (x % 10000) / 10000; // 0..1
  return min + t * (max - min);
}

interface SectorSentiment {
  info: SectorInfo;
  score: number; // -1 to 1
  articleCount: number;
}

function generateSectorData(): SectorSentiment[] {
  return SECTORS.map((info) => {
    const h = hashStr(info.name);
    const score = seededRandom(h, -0.85, 0.92);
    const articleCount = Math.floor(seededRandom(h ^ 0xbeef, 12, 87));
    return { info, score: Math.round(score * 100) / 100, articleCount };
  });
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

/** Map sentiment score (-1..1) to background color */
function getSentimentColor(score: number): string {
  const clamped = Math.max(-1, Math.min(1, score));
  const intensity = Math.abs(clamped);

  if (clamped >= 0) {
    // Green gradient
    const s = 20 + intensity * 55; // 20-75%
    const l = 8 + intensity * 20;  // 8-28%
    return `hsl(142, ${s}%, ${l}%)`;
  } else {
    // Red gradient
    const s = 20 + intensity * 55;
    const l = 8 + intensity * 20;
    return `hsl(0, ${s}%, ${l}%)`;
  }
}

function getSentimentLabel(score: number): string {
  if (score > 0.5) return 'Very Bullish';
  if (score > 0.15) return 'Bullish';
  if (score > -0.15) return 'Neutral';
  if (score > -0.5) return 'Bearish';
  return 'Very Bearish';
}

function getSentimentTextClass(score: number): string {
  if (score > 0.15) return 'text-emerald-400';
  if (score < -0.15) return 'text-red-400';
  return 'text-zinc-400';
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function ColorLegend() {
  const t = useT();
  const stops = 11;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-[8px] font-mono text-red-400 uppercase shrink-0">
        {(t as any)('shBearish') ?? 'Bearish'}
      </span>
      <div className="flex flex-1 h-2 rounded-sm overflow-hidden">
        {Array.from({ length: stops }).map((_, i) => {
          const score = -1 + (2 * i) / (stops - 1);
          return (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: getSentimentColor(score) }}
            />
          );
        })}
      </div>
      <span className="text-[8px] font-mono text-emerald-400 uppercase shrink-0">
        {(t as any)('shBullish') ?? 'Bullish'}
      </span>
    </div>
  );
}

function SectorTile({
  sector,
  onClick,
}: {
  sector: SectorSentiment;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 border border-border/20 transition-all hover:brightness-125 hover:border-border/50 cursor-pointer min-h-[72px]"
      style={{ backgroundColor: getSentimentColor(sector.score) }}
    >
      <span className="text-[9px] font-mono font-black text-white uppercase tracking-wider leading-tight text-center">
        {sector.info.name}
      </span>
      <span className="text-[8px] font-mono text-white/50 leading-tight">
        {sector.info.etf}
      </span>
      <span
        className={`text-[11px] font-mono font-bold mt-0.5 ${getSentimentTextClass(sector.score)}`}
      >
        {sector.score >= 0 ? '+' : ''}
        {sector.score.toFixed(2)}
      </span>
      <div className="flex items-center gap-0.5 mt-0.5">
        <Newspaper className="w-2.5 h-2.5 text-white/30" />
        <span className="text-[7px] font-mono text-white/30">
          {sector.articleCount}
        </span>
      </div>
    </button>
  );
}

function SectorDetail({
  sector,
  onBack,
}: {
  sector: SectorSentiment;
  onBack: () => void;
}) {
  const t = useT();
  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Back header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2 w-full hover:bg-white/[0.03] transition-colors border-b border-border/20"
      >
        <ChevronLeft className="w-3 h-3 text-rose-400" />
        <span className="text-[9px] font-mono font-bold text-rose-400 uppercase">
          {(t as any)('shBackToGrid') ?? 'Back to grid'}
        </span>
      </button>

      {/* Sector info */}
      <div className="px-3 py-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-black text-white uppercase tracking-wider">
              {sector.info.name}
            </span>
            <span className="text-[9px] font-mono text-neutral/40 ml-2">
              {sector.info.etf}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {sector.score >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={`text-[12px] font-mono font-bold ${getSentimentTextClass(sector.score)}`}>
              {sector.score >= 0 ? '+' : ''}
              {sector.score.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-[8px] font-mono font-bold uppercase ${getSentimentTextClass(sector.score)}`}>
            {getSentimentLabel(sector.score)}
          </span>
          <span className="text-[8px] font-mono text-neutral/30">
            {sector.articleCount} {(t as any)('shArticles') ?? 'articles'}
          </span>
        </div>
      </div>

      {/* Keywords */}
      <div className="px-3 py-2">
        <span className="text-[8px] font-mono font-bold text-neutral/50 uppercase tracking-wider">
          {(t as any)('shTopThemes') ?? 'Top Themes'}
        </span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sector.info.keywords.map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 text-[8px] font-mono font-bold bg-white/[0.05] border border-border/30 text-neutral/60 rounded-sm"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Sentiment bar visualization */}
      <div className="px-3 py-3 border-t border-border/20 mt-2">
        <span className="text-[8px] font-mono font-bold text-neutral/50 uppercase tracking-wider">
          {(t as any)('shSentimentBar') ?? 'Sentiment Distribution'}
        </span>
        <div className="mt-2 flex h-3 rounded-sm overflow-hidden">
          <div
            className="bg-red-500/70 transition-all"
            style={{ width: `${Math.max(2, (1 - sector.score) * 50)}%` }}
          />
          <div
            className="bg-emerald-500/70 transition-all"
            style={{ width: `${Math.max(2, (1 + sector.score) * 50)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px] font-mono text-red-400/60">
            {(t as any)('shBearish') ?? 'Bearish'}
          </span>
          <span className="text-[7px] font-mono text-emerald-400/60">
            {(t as any)('shBullish') ?? 'Bullish'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function SentimentHeatmapPanel() {
  const t = useT();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const sectors = useMemo(() => generateSectorData(), []);

  const mostBullish = useMemo(
    () => sectors.reduce((a, b) => (a.score > b.score ? a : b)),
    [sectors],
  );
  const mostBearish = useMemo(
    () => sectors.reduce((a, b) => (a.score < b.score ? a : b)),
    [sectors],
  );
  const overallSentiment = useMemo(() => {
    const avg = sectors.reduce((sum, s) => sum + s.score, 0) / sectors.length;
    return Math.round(avg * 100) / 100;
  }, [sectors]);

  const selectedData = selectedSector
    ? sectors.find((s) => s.info.name === selectedSector) ?? null
    : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {(t as any)('shTitle') ?? 'Sentiment Heatmap'}
          </span>
        </div>
      </div>

      {/* Summary stats bar */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-border/20 bg-black/40 shrink-0 text-[8px] font-mono">
        <span className="text-neutral/40">
          {(t as any)('shOverall') ?? 'Overall'}:{' '}
          <span className={`font-bold ${getSentimentTextClass(overallSentiment)}`}>
            {overallSentiment >= 0 ? '+' : ''}
            {overallSentiment.toFixed(2)}
          </span>
        </span>
        <span className="text-neutral/40">
          <TrendingUp className="w-2.5 h-2.5 inline text-emerald-400 mr-0.5" />
          {mostBullish.info.name}
        </span>
        <span className="text-neutral/40">
          <TrendingDown className="w-2.5 h-2.5 inline text-red-400 mr-0.5" />
          {mostBearish.info.name}
        </span>
      </div>

      {/* Color legend */}
      <div className="border-b border-border/20 shrink-0">
        <ColorLegend />
      </div>

      {/* Main content */}
      {selectedData ? (
        <SectorDetail
          sector={selectedData}
          onBack={() => setSelectedSector(null)}
        />
      ) : (
        <div className="flex-1 overflow-auto no-scrollbar p-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            {sectors.map((sector) => (
              <SectorTile
                key={sector.info.etf}
                sector={sector}
                onClick={() => setSelectedSector(sector.info.name)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
