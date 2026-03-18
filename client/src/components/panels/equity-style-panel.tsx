import { useState, useMemo } from 'react';
import { useEquityStyle } from '../../api/hooks/use-equity-style';
import { useT } from '../../i18n';
import { RefreshCw, ArrowRight } from 'lucide-react';

// ── Constants ──

const ACCENT = '#c084fc'; // purple-400
const ACCENT_DIM = 'rgba(192,132,252,0.08)';

type Tab = 'factors' | 'stocks' | 'returns' | 'rotation';

// ── Types ──

interface Factor {
  name: string;
  currentReturn1M: number;
  return3M: number;
  returnYTD: number;
  returnYear: number;
  sharpe: number;
  zscore: number;
  crowding: string;
  description: string;
}

interface StyleReturn {
  month: string;
  value: number;
  growth: number;
  momentum: number;
  quality: number;
  size: number;
  lowVol: number;
}

interface Stock {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  valueScore: number;
  growthScore: number;
  momentumScore: number;
  qualityScore: number;
  sizeScore: number;
  lowVolScore: number;
  primaryStyle: string;
  return1M: number;
  returnYTD: number;
}

interface RotationSignal {
  date: string;
  fromStyle: string;
  toStyle: string;
  signal: string;
  confidence: number;
}

interface Summary {
  bestFactor: string;
  worstFactor: string;
  mostCrowded: string;
  valueVsGrowthSpread: number;
  momentumStrength: number;
}

interface EquityStyleData {
  factors: Factor[];
  styleReturns: StyleReturn[];
  stocks: Stock[];
  rotation: RotationSignal[];
  summary: Summary;
}

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Color helpers ──

function getReturnColor(val: number): string {
  if (val > 0) return '#22c55e';
  if (val < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

function getScoreColor(score: number): string {
  if (score >= 1.5) return '#22c55e';
  if (score >= 0.5) return '#4ade80';
  if (score > -0.5) return '#71717a';
  if (score > -1.5) return '#f87171';
  return '#ef4444';
}

function getScoreBg(score: number): string {
  if (score >= 1.5) return 'rgba(34,197,94,0.15)';
  if (score >= 0.5) return 'rgba(74,222,128,0.1)';
  if (score > -0.5) return 'rgba(113,113,122,0.05)';
  if (score > -1.5) return 'rgba(248,113,113,0.1)';
  return 'rgba(239,68,68,0.15)';
}

function getCrowdingColor(crowding: string): { bg: string; text: string } {
  switch (crowding?.toLowerCase()) {
    case 'high':
      return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' };
    case 'medium':
      return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
    case 'low':
      return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
    default:
      return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
  }
}

function getStyleBadgeColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() ?? '';
  if (s.includes('value')) return { bg: 'rgba(96,165,250,0.2)', text: '#60a5fa' };
  if (s.includes('growth')) return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
  if (s.includes('momentum')) return { bg: 'rgba(251,146,60,0.2)', text: '#fb923c' };
  if (s.includes('quality')) return { bg: 'rgba(192,132,252,0.2)', text: '#c084fc' };
  if (s.includes('size') || s.includes('small')) return { bg: 'rgba(234,179,8,0.2)', text: '#eab308' };
  if (s.includes('low') || s.includes('vol')) return { bg: 'rgba(45,212,191,0.2)', text: '#2dd4bf' };
  return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#22c55e';
  if (confidence >= 0.6) return '#eab308';
  return '#ef4444';
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(0);
}

// ── Main Panel ──

export function EquityStylePanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEquityStyle();
  const [activeTab, setActiveTab] = useState<Tab>('factors');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'factors', label: 'FACTORS' },
    { key: 'stocks', label: 'STOCKS' },
    { key: 'returns', label: 'RETURNS' },
    { key: 'rotation', label: 'ROTATION' },
  ];

  const esData = data as EquityStyleData | undefined;

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div
          className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
          style={{ color: ACCENT }}
        >
          LOADING...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="text-[8px] font-mono uppercase px-2 py-1 border border-border/20 text-purple-400/60 hover:text-purple-400 hover:border-purple-400/30 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-purple-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="9" width="3" height="6" fill={ACCENT} opacity="0.4" />
            <rect x="5" y="5" width="3" height="10" fill={ACCENT} opacity="0.6" />
            <rect x="9" y="2" width="3" height="13" fill={ACCENT} opacity="0.8" />
            <rect x="13" y="7" width="2" height="8" fill={ACCENT} />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'esTitle', 'Equity Style Analysis')}
          </span>
          {esData?.summary && (
            <>
              <span className="text-[6px] font-mono font-black uppercase px-1 py-[1px] bg-green-500/20 text-green-400">
                {esData.summary.bestFactor}
              </span>
              <span className="text-[6px] font-mono font-black uppercase px-1 py-[1px] bg-red-500/20 text-red-400">
                {esData.summary.worstFactor}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Bar */}
      {esData?.summary && (
        <div className="flex items-center gap-4 px-3 py-1 border-b border-purple-400/30 bg-[#030303] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">CROWDED</span>
            <span className="text-[8px] font-bold text-red-400">
              {esData.summary.mostCrowded}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">V/G SPREAD</span>
            <span
              className="text-[8px] font-bold tabular-nums"
              style={{ color: getReturnColor(esData.summary.valueVsGrowthSpread) }}
            >
              {fmtPct(esData.summary.valueVsGrowthSpread)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">MOM STR</span>
            <span className="text-[8px] font-bold tabular-nums" style={{ color: ACCENT }}>
              {fmtNum(esData.summary.momentumStrength, 1)}
            </span>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-purple-400/30 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab.key ? ACCENT : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === tab.key ? `1px solid ${ACCENT}` : '1px solid transparent',
              background: activeTab === tab.key ? ACCENT_DIM : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {activeTab === 'factors' && <FactorsTab data={esData} />}
        {activeTab === 'stocks' && <StocksTab data={esData} />}
        {activeTab === 'returns' && <ReturnsTab data={esData} />}
        {activeTab === 'rotation' && <RotationTab data={esData} />}
      </div>
    </div>
  );
}

// ── 1. Factors Tab ──

function FactorsTab({ data }: { data: EquityStyleData | undefined }) {
  const t = useT();
  const [sortCol, setSortCol] = useState<string>('currentReturn1M');
  const [sortAsc, setSortAsc] = useState(false);

  const factors = useMemo(() => {
    if (!data?.factors) return [];
    const arr = [...data.factors];

    // Determine best/worst for highlighting
    arr.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortCol] ?? 0;
      const vb = (b as unknown as Record<string, unknown>)[sortCol] ?? 0;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const { bestIdx, worstIdx } = useMemo(() => {
    if (!data?.factors || data.factors.length === 0) return { bestIdx: -1, worstIdx: -1 };
    let best = 0;
    let worst = 0;
    for (let i = 1; i < data.factors.length; i++) {
      if (data.factors[i].currentReturn1M > data.factors[best].currentReturn1M) best = i;
      if (data.factors[i].currentReturn1M < data.factors[worst].currentReturn1M) worst = i;
    }
    return { bestIdx: best, worstIdx: worst };
  }, [data]);

  const bestName = data?.factors?.[bestIdx]?.name;
  const worstName = data?.factors?.[worstIdx]?.name;

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-2 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'esFactorPerf', 'Factor Performance Summary')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-purple-400/30">
          <tr>
            <SortHeader col="name" label="Factor" />
            <SortHeader col="currentReturn1M" label="1M" right />
            <SortHeader col="return3M" label="3M" right />
            <SortHeader col="returnYTD" label="YTD" right />
            <SortHeader col="returnYear" label="1Y" right />
            <SortHeader col="sharpe" label="Sharpe" right />
            <th className="px-2 py-1.5 text-center font-bold">Z-Score</th>
            <SortHeader col="crowding" label="Crowding" right />
          </tr>
        </thead>
        <tbody>
          {factors.map((factor) => {
            const isBest = factor.name === bestName;
            const isWorst = factor.name === worstName;
            const rowBg = isBest
              ? 'rgba(34,197,94,0.04)'
              : isWorst
                ? 'rgba(239,68,68,0.04)'
                : 'transparent';
            const crowdColor = getCrowdingColor(factor.crowding);

            return (
              <tr
                key={factor.name}
                className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
                style={{ background: rowBg }}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: ACCENT }}>{factor.name}</span>
                    {isBest && (
                      <span className="text-[6px] font-black uppercase px-1 py-[0.5px] bg-green-500/20 text-green-400">
                        BEST
                      </span>
                    )}
                    {isWorst && (
                      <span className="text-[6px] font-black uppercase px-1 py-[0.5px] bg-red-500/20 text-red-400">
                        WORST
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(factor.currentReturn1M) }}>
                    {fmtPct(factor.currentReturn1M)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(factor.return3M) }}>
                    {fmtPct(factor.return3M)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(factor.returnYTD) }}>
                    {fmtPct(factor.returnYTD)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(factor.returnYear) }}>
                    {fmtPct(factor.returnYear)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <span
                    className="font-bold"
                    style={{ color: factor.sharpe >= 1 ? '#22c55e' : factor.sharpe < 0 ? '#ef4444' : '#71717a' }}
                  >
                    {fmtNum(factor.sharpe)}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex justify-center">
                    <ZScoreBar value={factor.zscore} />
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <span
                    className="text-[7px] font-black uppercase px-1.5 py-[1px]"
                    style={{ background: crowdColor.bg, color: crowdColor.text }}
                  >
                    {factor.crowding}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Z-Score Bar ──

function ZScoreBar({ value }: { value: number }) {
  const W = 40;
  const H = 10;
  const CENTER = W / 2;
  const maxZ = 3;
  const clampedZ = Math.max(-maxZ, Math.min(maxZ, value));
  const barWidth = (Math.abs(clampedZ) / maxZ) * (W / 2 - 2);
  const isPositive = clampedZ >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
      <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
      <rect x={barX} y={1} width={Math.max(barWidth, 0.5)} height={H - 2} fill={color} opacity={0.7} />
      <text
        x={isPositive ? barX + barWidth + 1.5 : barX - 1.5}
        y={H / 2 + 0.5}
        textAnchor={isPositive ? 'start' : 'end'}
        dominantBaseline="middle"
        fill={color}
        fontSize={5.5}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </text>
    </svg>
  );
}

// ── 2. Stocks Tab ──

function StocksTab({ data }: { data: EquityStyleData | undefined }) {
  const t = useT();
  const [sortCol, setSortCol] = useState<string>('returnYTD');
  const [sortAsc, setSortAsc] = useState(false);

  const stocks = useMemo(() => {
    if (!data?.stocks) return [];
    const arr = [...data.stocks];
    arr.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortCol] ?? 0;
      const vb = (b as unknown as Record<string, unknown>)[sortCol] ?? 0;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [data, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const SortHeader = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={`px-1.5 py-1.5 font-bold cursor-pointer hover:text-white/80 transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}{sortCol === col ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
    </th>
  );

  const ScoreCell = ({ score }: { score: number }) => (
    <td className="px-1.5 py-1 text-center tabular-nums">
      <span
        className="text-[8px] font-bold px-1 py-[0.5px] inline-block min-w-[28px]"
        style={{
          color: getScoreColor(score),
          background: getScoreBg(score),
        }}
      >
        {score > 0 ? '+' : ''}{fmtNum(score, 1)}
      </span>
    </td>
  );

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'esStockStyles', 'Stock Style Scores')}
        </span>
      </div>
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-purple-400/30">
          <tr>
            <SortHeader col="ticker" label="Ticker" />
            <SortHeader col="sector" label="Sector" />
            <SortHeader col="marketCap" label="MCap" right />
            <th className="px-1.5 py-1.5 text-center font-bold">VAL</th>
            <th className="px-1.5 py-1.5 text-center font-bold">GRW</th>
            <th className="px-1.5 py-1.5 text-center font-bold">MOM</th>
            <th className="px-1.5 py-1.5 text-center font-bold">QUAL</th>
            <th className="px-1.5 py-1.5 text-center font-bold">SIZE</th>
            <th className="px-1.5 py-1.5 text-center font-bold">LVOL</th>
            <th className="px-1.5 py-1.5 text-left font-bold">STYLE</th>
            <SortHeader col="return1M" label="1M" right />
            <SortHeader col="returnYTD" label="YTD" right />
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const badgeColor = getStyleBadgeColor(stock.primaryStyle);
            return (
              <tr
                key={stock.ticker}
                className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1">
                  <div className="flex flex-col">
                    <span className="font-bold" style={{ color: ACCENT }}>{stock.ticker}</span>
                    <span className="text-[6px] text-neutral-600 truncate max-w-[60px]">{stock.name}</span>
                  </div>
                </td>
                <td className="px-1.5 py-1 text-neutral-500 text-[7px]">{stock.sector}</td>
                <td className="px-1.5 py-1 text-right tabular-nums text-neutral-400">
                  {fmtMarketCap(stock.marketCap)}
                </td>
                <ScoreCell score={stock.valueScore} />
                <ScoreCell score={stock.growthScore} />
                <ScoreCell score={stock.momentumScore} />
                <ScoreCell score={stock.qualityScore} />
                <ScoreCell score={stock.sizeScore} />
                <ScoreCell score={stock.lowVolScore} />
                <td className="px-1.5 py-1">
                  <span
                    className="text-[6px] font-black uppercase px-1.5 py-[1px]"
                    style={{ background: badgeColor.bg, color: badgeColor.text }}
                  >
                    {stock.primaryStyle}
                  </span>
                </td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(stock.return1M) }}>
                    {fmtPct(stock.return1M)}
                  </span>
                </td>
                <td className="px-1.5 py-1 text-right tabular-nums">
                  <span className="font-bold" style={{ color: getReturnColor(stock.returnYTD) }}>
                    {fmtPct(stock.returnYTD)}
                  </span>
                </td>
              </tr>
            );
          })}
          {stocks.length === 0 && (
            <tr>
              <td colSpan={12} className="px-2 py-4 text-center text-neutral-600 uppercase">
                No stock data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── 3. Returns Tab ──

function ReturnsTab({ data }: { data: EquityStyleData | undefined }) {
  const t = useT();

  const styleReturns = data?.styleReturns ?? [];
  const styleKeys = ['value', 'growth', 'momentum', 'quality', 'size', 'lowVol'] as const;

  const styleLabels: Record<string, string> = {
    value: 'VALUE',
    growth: 'GROWTH',
    momentum: 'MOM',
    quality: 'QUAL',
    size: 'SIZE',
    lowVol: 'LVOL',
  };

  const styleColors: Record<string, string> = {
    value: '#60a5fa',
    growth: '#22c55e',
    momentum: '#fb923c',
    quality: '#c084fc',
    size: '#eab308',
    lowVol: '#2dd4bf',
  };

  return (
    <div>
      <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'esStyleReturns', 'Monthly Style Returns')}
        </span>
      </div>
      <table className="w-full text-[8px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-[7px] font-black uppercase tracking-wider text-neutral-600 border-b border-purple-400/30">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Month</th>
            {styleKeys.map((key) => (
              <th key={key} className="px-2 py-1.5 text-right font-bold">
                <span style={{ color: styleColors[key] }}>{styleLabels[key]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {styleReturns.map((row) => (
            <tr
              key={row.month}
              className="border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5 text-neutral-400 font-bold">{row.month}</td>
              {styleKeys.map((key) => {
                const val = row[key];
                return (
                  <td key={key} className="px-2 py-1.5 text-right tabular-nums">
                    <span className="font-bold" style={{ color: getReturnColor(val) }}>
                      {fmtPct(val)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          {styleReturns.length === 0 && (
            <tr>
              <td colSpan={7} className="px-2 py-4 text-center text-neutral-600 uppercase">
                No return data
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Style color legend */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-border/20 mt-1">
        {styleKeys.map((key) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ background: styleColors[key] }} />
            <span className="text-[6px] font-mono text-neutral-600 uppercase">{styleLabels[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Rotation Tab ──

function RotationTab({ data }: { data: EquityStyleData | undefined }) {
  const t = useT();

  const rotation = data?.rotation ?? [];

  return (
    <div className="px-3 py-2">
      <div className="mb-2">
        <span className="text-[7px] font-black uppercase tracking-wider text-neutral-600">
          {tr(t, 'esRotation', 'Style Rotation Signals')}
        </span>
      </div>

      {rotation.length === 0 ? (
        <div className="text-center py-8 text-[9px] font-mono text-neutral-600 uppercase">
          No rotation signals detected
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {rotation.map((signal, i) => {
            const fromColor = getStyleBadgeColor(signal.fromStyle);
            const toColor = getStyleBadgeColor(signal.toStyle);
            const confColor = getConfidenceColor(signal.confidence);

            return (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 border border-border/20 hover:bg-purple-400/[0.02] transition-colors"
              >
                {/* Date */}
                <span className="text-[7px] font-mono text-neutral-600 shrink-0 w-[60px]">
                  {signal.date}
                </span>

                {/* From -> To */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[7px] font-black uppercase px-1.5 py-[1px]"
                    style={{ background: fromColor.bg, color: fromColor.text }}
                  >
                    {signal.fromStyle}
                  </span>
                  <ArrowRight className="w-3 h-3 text-neutral-600" />
                  <span
                    className="text-[7px] font-black uppercase px-1.5 py-[1px]"
                    style={{ background: toColor.bg, color: toColor.text }}
                  >
                    {signal.toStyle}
                  </span>
                </div>

                {/* Signal description */}
                <span className="text-[7px] font-mono text-neutral-500 truncate flex-1">
                  {signal.signal}
                </span>

                {/* Confidence */}
                <div className="flex items-center gap-1 shrink-0">
                  <ConfidenceBar value={signal.confidence} />
                  <span
                    className="text-[7px] font-mono font-bold tabular-nums w-[32px] text-right"
                    style={{ color: confColor }}
                  >
                    {(signal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Confidence Bar ──

function ConfidenceBar({ value }: { value: number }) {
  const W = 40;
  const H = 6;
  const clamped = Math.max(0, Math.min(1, value));
  const color = getConfidenceColor(value);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.05)" />
      <rect x={0} y={0} width={clamped * W} height={H} fill={color} opacity={0.7} />
    </svg>
  );
}
