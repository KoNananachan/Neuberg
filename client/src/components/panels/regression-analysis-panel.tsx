import { useState, useMemo } from 'react';
import {
  useRegressionAnalysis,
  type RegressionAsset,
  type RegressionAnalysisData,
} from '../../api/hooks/use-regression-analysis';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#34d399'; // emerald-400
const ACCENT_DIM = 'rgba(52,211,153,0.15)';

type ViewMode = 'FACTORS' | 'DETAIL' | 'ROLLING';
type DetailTab = 'CAPM' | 'FF3' | 'CARHART';

// ── Color Helpers ──

function heatColor(value: number, min: number, max: number): string {
  // Normalize value to 0..1 range
  const range = max - min;
  if (range === 0) return 'transparent';
  const norm = (value - min) / range;
  // Red (high) -> dim (mid) -> Blue (low)
  if (norm >= 0.5) {
    const intensity = (norm - 0.5) * 2;
    return `rgba(239,68,68,${0.05 + intensity * 0.35})`;
  }
  const intensity = (0.5 - norm) * 2;
  return `rgba(59,130,246,${0.05 + intensity * 0.35})`;
}

function r2Color(r2: number): string {
  if (r2 >= 0.85) return '#22c55e';
  if (r2 >= 0.60) return '#84cc16';
  if (r2 >= 0.40) return '#eab308';
  if (r2 >= 0.20) return '#f97316';
  return '#ef4444';
}

function pValueColor(p: number): string {
  if (p < 0.01) return '#22c55e';
  if (p < 0.05) return '#84cc16';
  if (p < 0.10) return '#eab308';
  return '#71717a';
}

function signColor(value: number): string {
  if (value > 0) return '#22c55e';
  if (value < 0) return '#ef4444';
  return '#71717a';
}

function fmtNum(n: number, decimals: number = 4): string {
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function r2Badge(r2: number): string {
  if (r2 >= 0.85) return 'HIGH';
  if (r2 >= 0.60) return 'MED';
  if (r2 >= 0.40) return 'LOW';
  return 'WEAK';
}

// ── Main Panel ──

export function RegressionAnalysisPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useRegressionAnalysis();
  const [view, setView] = useState<ViewMode>('FACTORS');
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');

  const selectedAsset = useMemo(() => {
    if (!data) return null;
    return data.assets.find((a) => a.ticker === selectedTicker) ?? data.assets[0] ?? null;
  }, [data, selectedTicker]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <line x1="2" y1="14" x2="14" y2="2" stroke={ACCENT} strokeWidth="1.5" opacity="0.8" />
            <circle cx="4" cy="11" r="1.2" fill={ACCENT} opacity="0.6" />
            <circle cx="6" cy="9" r="1.2" fill={ACCENT} opacity="0.7" />
            <circle cx="8" cy="8" r="1.2" fill={ACCENT} opacity="0.8" />
            <circle cx="10" cy="5" r="1.2" fill={ACCENT} opacity="0.9" />
            <circle cx="12" cy="4" r="1.2" fill={ACCENT} />
            <circle cx="5" cy="6" r="1.2" fill={ACCENT} opacity="0.5" />
            <circle cx="11" cy="7" r="1.2" fill={ACCENT} opacity="0.6" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'raTitle', 'Regression Analysis')}
          </span>
          {selectedAsset && (
            <span
              className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px]"
              style={{ background: ACCENT_DIM, color: ACCENT }}
            >
              {selectedAsset.ticker}
            </span>
          )}
          {selectedAsset && (
            <span
              className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px]"
              style={{ background: `${r2Color(selectedAsset.capm.rSquared)}22`, color: r2Color(selectedAsset.capm.rSquared) }}
            >
              R2 {r2Badge(selectedAsset.capm.rSquared)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* View tabs */}
          {(['FACTORS', 'DETAIL', 'ROLLING'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-all"
              style={{
                background: view === v ? ACCENT_DIM : 'transparent',
                color: view === v ? ACCENT : '#71717a',
              }}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-emerald-400 transition-colors ml-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'raNoData', 'No data available')}
          </div>
        )}

        {data && view === 'FACTORS' && (
          <FactorsView data={data} onSelectTicker={setSelectedTicker} selectedTicker={selectedTicker} />
        )}
        {data && view === 'DETAIL' && selectedAsset && (
          <DetailView asset={selectedAsset} allTickers={data.assets.map((a) => a.ticker)} onSelectTicker={setSelectedTicker} />
        )}
        {data && view === 'ROLLING' && selectedAsset && (
          <RollingView asset={selectedAsset} allTickers={data.assets.map((a) => a.ticker)} onSelectTicker={setSelectedTicker} />
        )}
      </div>
    </div>
  );
}

// ── 1. FACTORS View: Matrix of all assets x factor loadings ──

function FactorsView({
  data,
  onSelectTicker,
  selectedTicker,
}: {
  data: RegressionAnalysisData;
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
}) {
  const t = useT();

  // Compute min/max for heat-map columns
  const ranges = useMemo(() => {
    const alphas = data.assets.map((a) => a.capm.alpha);
    const betas = data.assets.map((a) => a.capm.beta);
    const smbs = data.assets.map((a) => a.famaFrench3.smb);
    const hmls = data.assets.map((a) => a.famaFrench3.hml);
    const umds = data.assets.map((a) => a.carhart4.umd);
    const r2s = data.assets.map((a) => a.capm.rSquared);
    const ff3r2s = data.assets.map((a) => a.famaFrench3.rSquared);
    const c4r2s = data.assets.map((a) => a.carhart4.rSquared);

    const minMax = (arr: number[]): [number, number] => [Math.min(...arr), Math.max(...arr)];
    return {
      alpha: minMax(alphas),
      beta: minMax(betas),
      smb: minMax(smbs),
      hml: minMax(hmls),
      umd: minMax(umds),
      r2: minMax(r2s),
      ff3r2: minMax(ff3r2s),
      c4r2: minMax(c4r2s),
    };
  }, [data]);

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'raFactorMatrix', 'Factor Loading Matrix')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[64px_42px_42px_42px_42px_42px_38px_38px_38px] gap-0 px-1 mb-0.5">
        {['Ticker', 'Alpha', 'Beta', 'SMB', 'HML', 'UMD', 'R2', 'FF3 R2', 'C4 R2'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-center">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {data.assets.map((asset) => {
        const isSelected = asset.ticker === selectedTicker;
        return (
          <div
            key={asset.ticker}
            onClick={() => onSelectTicker(asset.ticker)}
            className="grid grid-cols-[64px_42px_42px_42px_42px_42px_38px_38px_38px] gap-0 px-1 py-[3px] cursor-pointer border-b border-border/10 items-center transition-colors"
            style={{ background: isSelected ? 'rgba(52,211,153,0.06)' : undefined }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(52,211,153,0.02)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ''; }}
          >
            {/* Ticker + name */}
            <div className="flex flex-col min-w-0">
              <span
                className="text-[8px] font-mono font-bold truncate"
                style={{ color: isSelected ? ACCENT : '#e4e4e7' }}
              >
                {asset.ticker}
              </span>
              <span className="text-[6px] font-mono text-neutral-600 truncate">
                {asset.name.length > 12 ? asset.name.slice(0, 12) + '..' : asset.name}
              </span>
            </div>

            {/* Alpha */}
            <HeatCell value={asset.capm.alpha} range={ranges.alpha} format={(v) => fmtNum(v, 3)} />
            {/* Beta */}
            <HeatCell value={asset.capm.beta} range={ranges.beta} format={(v) => fmtNum(v, 2)} />
            {/* SMB */}
            <HeatCell value={asset.famaFrench3.smb} range={ranges.smb} format={(v) => fmtNum(v, 2)} />
            {/* HML */}
            <HeatCell value={asset.famaFrench3.hml} range={ranges.hml} format={(v) => fmtNum(v, 2)} />
            {/* UMD */}
            <HeatCell value={asset.carhart4.umd} range={ranges.umd} format={(v) => fmtNum(v, 2)} />
            {/* R2 */}
            <div className="text-center">
              <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: r2Color(asset.capm.rSquared) }}>
                {fmtNum(asset.capm.rSquared, 2)}
              </span>
            </div>
            {/* FF3 R2 */}
            <div className="text-center">
              <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: r2Color(asset.famaFrench3.rSquared) }}>
                {fmtNum(asset.famaFrench3.rSquared, 2)}
              </span>
            </div>
            {/* C4 R2 */}
            <div className="text-center">
              <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: r2Color(asset.carhart4.rSquared) }}>
                {fmtNum(asset.carhart4.rSquared, 2)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      <div className="mt-2 text-[6px] font-mono text-neutral-700 uppercase px-1">
        {tr(t, 'raGenerated', 'Generated')}: {new Date(data.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ── Heat-colored cell ──

function HeatCell({
  value,
  range,
  format,
}: {
  value: number;
  range: [number, number];
  format: (v: number) => string;
}) {
  return (
    <div
      className="text-center py-[1px] mx-[1px]"
      style={{ background: heatColor(value, range[0], range[1]) }}
    >
      <span
        className="text-[7px] font-mono font-bold tabular-nums"
        style={{ color: signColor(value) }}
      >
        {format(value)}
      </span>
    </div>
  );
}

// ── 2. DETAIL View: Asset selector with CAPM/FF3/Carhart tabs ──

function DetailView({
  asset,
  allTickers,
  onSelectTicker,
}: {
  asset: RegressionAsset;
  allTickers: string[];
  onSelectTicker: (ticker: string) => void;
}) {
  const t = useT();
  const [detailTab, setDetailTab] = useState<DetailTab>('CAPM');

  return (
    <div className="px-2 py-2">
      {/* Asset selector */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {allTickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => onSelectTicker(ticker)}
            className="px-1.5 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-all"
            style={{
              background: ticker === asset.ticker ? ACCENT_DIM : 'transparent',
              color: ticker === asset.ticker ? ACCENT : '#71717a',
              borderBottom: ticker === asset.ticker ? `1px solid ${ACCENT}` : '1px solid transparent',
            }}
          >
            {ticker}
          </button>
        ))}
      </div>

      {/* Detail tabs */}
      <div className="flex items-center gap-0.5 mb-2 border-b border-border/20 pb-1">
        {(['CAPM', 'FF3', 'CARHART'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setDetailTab(tab)}
            className="px-2 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-all"
            style={{
              background: detailTab === tab ? 'rgba(52,211,153,0.1)' : 'transparent',
              color: detailTab === tab ? ACCENT : '#52525b',
            }}
          >
            {tab === 'FF3' ? 'Fama-French 3' : tab === 'CARHART' ? 'Carhart 4' : tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {detailTab === 'CAPM' && <CAPMDetail asset={asset} />}
      {detailTab === 'FF3' && <FF3Detail asset={asset} />}
      {detailTab === 'CARHART' && <CarhartDetail asset={asset} />}

      {/* Residual diagnostics */}
      <ResidualDiagnostics asset={asset} />

      {/* Benchmark metrics */}
      <BenchmarkMetricsSection asset={asset} />
    </div>
  );
}

// ── CAPM Detail ──

function CAPMDetail({ asset }: { asset: RegressionAsset }) {
  const t = useT();
  const { capm } = asset;

  const rows: Array<{ label: string; value: string; tStat: string; pValue: number }> = [
    { label: 'Alpha', value: fmtNum(capm.alpha, 4), tStat: fmtNum(capm.tStatAlpha, 2), pValue: capm.pValueAlpha },
    { label: 'Beta (Mkt-Rf)', value: fmtNum(capm.beta, 4), tStat: fmtNum(capm.tStatBeta, 2), pValue: capm.pValueBeta },
  ];

  return (
    <div className="mb-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'raCAPM', 'Capital Asset Pricing Model')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[80px_70px_60px_60px_60px] gap-0 px-1 mb-0.5">
        {['Variable', 'Coefficient', 'Std Error', 't-Stat', 'p-Value'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">{h}</span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[80px_70px_60px_60px_60px] gap-0 px-1 py-[3px] border-b border-border/10 items-center"
          style={{ background: undefined }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
          <span className="text-[8px] font-mono font-bold text-neutral-300">{row.label}</span>
          <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: signColor(parseFloat(row.value)) }}>
            {row.value}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 tabular-nums">{fmtNum(capm.stdError, 4)}</span>
          <span className="text-[7px] font-mono font-bold tabular-nums text-neutral-300">{row.tStat}</span>
          <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: pValueColor(row.pValue) }}>
            {row.pValue < 0.0001 ? '<0.0001' : fmtNum(row.pValue, 4)}
          </span>
        </div>
      ))}

      {/* Model stats */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <ModelStatBadge label="R-Squared" value={fmtNum(capm.rSquared, 4)} color={r2Color(capm.rSquared)} />
        <ModelStatBadge label="Std Error" value={fmtNum(capm.stdError, 4)} color="#a1a1aa" />
      </div>
    </div>
  );
}

// ── Fama-French 3 Detail ──

function FF3Detail({ asset }: { asset: RegressionAsset }) {
  const t = useT();
  const { famaFrench3: ff3 } = asset;

  const rows: Array<{ label: string; value: number }> = [
    { label: 'Alpha', value: ff3.alpha },
    { label: 'Mkt-Rf', value: ff3.mktRf },
    { label: 'SMB', value: ff3.smb },
    { label: 'HML', value: ff3.hml },
  ];

  return (
    <div className="mb-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'raFF3', 'Fama-French Three-Factor Model')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[80px_1fr] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase">Variable</span>
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase">Coefficient</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[80px_1fr] gap-0 px-1 py-[3px] border-b border-border/10 items-center"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
          <span className="text-[8px] font-mono font-bold text-neutral-300">{row.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: signColor(row.value) }}>
              {fmtNum(row.value, 4)}
            </span>
            <CoefficientBar value={row.value} maxAbs={2.0} />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 mt-2 px-1">
        <ModelStatBadge label="R-Squared" value={fmtNum(ff3.rSquared, 4)} color={r2Color(ff3.rSquared)} />
        <ModelStatBadge label="Adj R-Squared" value={fmtNum(ff3.adjRSquared, 4)} color={r2Color(ff3.adjRSquared)} />
      </div>
    </div>
  );
}

// ── Carhart 4-Factor Detail ──

function CarhartDetail({ asset }: { asset: RegressionAsset }) {
  const t = useT();
  const { carhart4: c4 } = asset;

  const rows: Array<{ label: string; value: number }> = [
    { label: 'Alpha', value: c4.alpha },
    { label: 'Mkt-Rf', value: c4.mktRf },
    { label: 'SMB', value: c4.smb },
    { label: 'HML', value: c4.hml },
    { label: 'UMD (Mom)', value: c4.umd },
  ];

  return (
    <div className="mb-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'raCarhart', 'Carhart Four-Factor Model')}
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase">Variable</span>
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase">Coefficient</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[80px_1fr] gap-0 px-1 py-[3px] border-b border-border/10 items-center"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
          <span className="text-[8px] font-mono font-bold text-neutral-300">{row.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: signColor(row.value) }}>
              {fmtNum(row.value, 4)}
            </span>
            <CoefficientBar value={row.value} maxAbs={2.0} />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 mt-2 px-1">
        <ModelStatBadge label="R-Squared" value={fmtNum(c4.rSquared, 4)} color={r2Color(c4.rSquared)} />
      </div>
    </div>
  );
}

// ── Coefficient bar (horizontal inline) ──

function CoefficientBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const W = 80;
  const H = 8;
  const CENTER = W / 2;
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, value));
  const barWidth = (Math.abs(clamped) / maxAbs) * (W / 2 - 1);
  const isPositive = clamped >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = signColor(value);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
      <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
      <rect x={barX} y={1} width={Math.max(barWidth, 0.5)} height={H - 2} fill={color} opacity={0.6} />
    </svg>
  );
}

// ── Residual Diagnostics ──

function ResidualDiagnostics({ asset }: { asset: RegressionAsset }) {
  const t = useT();
  const { residualStats: rs } = asset;

  const items: Array<{ label: string; value: string; note: string }> = [
    { label: 'Mean', value: rs.mean.toFixed(6), note: 'Should be ~0' },
    { label: 'Std Dev', value: rs.stdDev.toFixed(4), note: 'Daily' },
    { label: 'Skewness', value: rs.skewness.toFixed(4), note: Math.abs(rs.skewness) < 0.5 ? 'Normal' : 'Skewed' },
    { label: 'Kurtosis', value: rs.kurtosis.toFixed(4), note: rs.kurtosis > 3.5 ? 'Fat tails' : 'Normal' },
    { label: 'Jarque-Bera', value: rs.jarqueBera.toFixed(2), note: rs.jarqueBera > 5.99 ? 'Non-normal' : 'Normal' },
    { label: 'Durbin-Watson', value: rs.durbinWatson.toFixed(4), note: rs.durbinWatson > 1.5 && rs.durbinWatson < 2.5 ? 'No autocorr' : 'Autocorr' },
  ];

  return (
    <div className="mb-3">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'raResiduals', 'Residual Diagnostics')}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => (
          <div key={item.label} className="px-1.5 py-1 border border-border/20">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{item.label}</div>
            <div className="text-[9px] font-mono font-bold text-neutral-200 tabular-nums">{item.value}</div>
            <div className="text-[6px] font-mono text-neutral-600">{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Benchmark Metrics Section ──

function BenchmarkMetricsSection({ asset }: { asset: RegressionAsset }) {
  const t = useT();
  const { benchmarkMetrics: bm } = asset;

  const items: Array<{ label: string; value: string; color: string }> = [
    { label: 'Correlation', value: fmtNum(bm.correlation, 4), color: bm.correlation > 0.7 ? '#22c55e' : bm.correlation > 0.4 ? '#eab308' : '#ef4444' },
    { label: 'Tracking Error', value: fmtPct(bm.trackingError), color: '#a1a1aa' },
    { label: 'Information Ratio', value: fmtNum(bm.informationRatio, 4), color: signColor(bm.informationRatio) },
    { label: 'Treynor Ratio', value: fmtNum(bm.treynorRatio, 4), color: signColor(bm.treynorRatio) },
    { label: 'Sortino Ratio', value: fmtNum(bm.sortinoRatio, 4), color: signColor(bm.sortinoRatio) },
  ];

  return (
    <div className="mb-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'raBenchmark', 'Benchmark Metrics (vs SPY)')}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => (
          <div key={item.label} className="px-1.5 py-1 border border-border/20">
            <div className="text-[6px] font-mono text-neutral-600 uppercase">{item.label}</div>
            <div className="text-[9px] font-mono font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Model stat badge ──

function ModelStatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[6px] font-mono text-neutral-600 uppercase">{label}:</span>
      <span
        className="text-[8px] font-mono font-black tabular-nums px-1 py-[1px]"
        style={{ background: `${color}22`, color }}
      >
        {value}
      </span>
    </div>
  );
}

// ── 3. ROLLING View: Rolling beta as horizontal bars per month ──

function RollingView({
  asset,
  allTickers,
  onSelectTicker,
}: {
  asset: RegressionAsset;
  allTickers: string[];
  onSelectTicker: (ticker: string) => void;
}) {
  const t = useT();
  const { rollingBeta } = asset;

  // Compute global min/max for scaling
  const allValues = useMemo(() => {
    const vals: number[] = [];
    for (const pt of rollingBeta) {
      vals.push(pt.beta60d, pt.beta120d, pt.beta252d);
    }
    return vals;
  }, [rollingBeta]);

  const minBeta = useMemo(() => Math.min(...allValues, 0), [allValues]);
  const maxBeta = useMemo(() => Math.max(...allValues, 0), [allValues]);
  const absMax = Math.max(Math.abs(minBeta), Math.abs(maxBeta), 0.5);

  return (
    <div className="px-2 py-2">
      {/* Asset selector */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {allTickers.map((ticker) => (
          <button
            key={ticker}
            onClick={() => onSelectTicker(ticker)}
            className="px-1.5 py-0.5 text-[7px] font-mono font-black uppercase tracking-wider transition-all"
            style={{
              background: ticker === asset.ticker ? ACCENT_DIM : 'transparent',
              color: ticker === asset.ticker ? ACCENT : '#71717a',
              borderBottom: ticker === asset.ticker ? `1px solid ${ACCENT}` : '1px solid transparent',
            }}
          >
            {ticker}
          </button>
        ))}
      </div>

      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'raRollingBeta', 'Rolling Beta')} - {asset.ticker}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5" style={{ background: ACCENT }} />
          <span className="text-[6px] font-mono text-neutral-500">60d</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5" style={{ background: '#60a5fa' }} />
          <span className="text-[6px] font-mono text-neutral-500">120d</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-1.5" style={{ background: '#c084fc' }} />
          <span className="text-[6px] font-mono text-neutral-500">252d</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-[1px] h-3 bg-neutral-700" />
          <span className="text-[6px] font-mono text-neutral-600">Beta = 0</span>
        </div>
      </div>

      {/* Rolling beta bars */}
      <div className="space-y-0.5">
        {rollingBeta.map((pt) => (
          <RollingBetaRow key={pt.date} point={pt} absMax={absMax} />
        ))}
      </div>

      {/* Current values */}
      {rollingBeta.length > 0 && (
        <div className="mt-3 px-1">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">
            {tr(t, 'raCurrentBeta', 'Current Values')}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(() => {
              const latest = rollingBeta[rollingBeta.length - 1];
              return [
                { label: '60-Day Beta', value: latest.beta60d, color: ACCENT },
                { label: '120-Day Beta', value: latest.beta120d, color: '#60a5fa' },
                { label: '252-Day Beta', value: latest.beta252d, color: '#c084fc' },
              ].map((item) => (
                <div key={item.label} className="px-2 py-1.5 border border-border/20" style={{ borderTopColor: item.color, borderTopWidth: 2 }}>
                  <div className="text-[6px] font-mono text-neutral-600 uppercase">{item.label}</div>
                  <div className="text-[11px] font-mono font-black tabular-nums" style={{ color: item.color }}>
                    {item.value.toFixed(3)}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rolling Beta Row ──

function RollingBetaRow({ point, absMax }: { point: { date: string; beta60d: number; beta120d: number; beta252d: number }; absMax: number }) {
  const W = 220;
  const H = 18;
  const CENTER = W / 2;
  const LABEL_W = 40;

  const bars: Array<{ value: number; color: string; y: number; h: number }> = [
    { value: point.beta60d, color: ACCENT, y: 1, h: 4 },
    { value: point.beta120d, color: '#60a5fa', y: 6.5, h: 4 },
    { value: point.beta252d, color: '#c084fc', y: 12, h: 4 },
  ];

  return (
    <div
      className="flex items-center gap-0 border-b border-border/10"
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.02)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      <span className="text-[7px] font-mono text-neutral-500 tabular-nums shrink-0" style={{ width: LABEL_W }}>
        {point.date}
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-1">
        {/* Center line (beta = 0) */}
        <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        {/* Beta = 1 reference */}
        {absMax >= 1 && (
          <>
            <line
              x1={CENTER + (1 / absMax) * (W / 2 - 2)}
              y1={0}
              x2={CENTER + (1 / absMax) * (W / 2 - 2)}
              y2={H}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={0.5}
              strokeDasharray="1,2"
            />
          </>
        )}
        {bars.map((bar, i) => {
          const barW = (Math.abs(bar.value) / absMax) * (W / 2 - 2);
          const isPositive = bar.value >= 0;
          const barX = isPositive ? CENTER : CENTER - barW;
          return (
            <rect key={i} x={barX} y={bar.y} width={Math.max(barW, 0.5)} height={bar.h} fill={bar.color} opacity={0.7} />
          );
        })}
      </svg>
      <div className="flex flex-col items-end shrink-0" style={{ width: 35 }}>
        <span className="text-[6px] font-mono tabular-nums" style={{ color: ACCENT }}>{point.beta60d.toFixed(2)}</span>
        <span className="text-[6px] font-mono tabular-nums" style={{ color: '#60a5fa' }}>{point.beta120d.toFixed(2)}</span>
        <span className="text-[6px] font-mono tabular-nums" style={{ color: '#c084fc' }}>{point.beta252d.toFixed(2)}</span>
      </div>
    </div>
  );
}
