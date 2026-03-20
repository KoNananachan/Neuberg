import { useCrossAssetCorrelation } from '../../api/hooks/use-cross-asset-correlation';
import { useT, tr, TFn } from '../../i18n';

// i18n fallback helper
// ── Color Helpers ──

function getCorrelationColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'rgba(34,211,238,0.08)';
  if (value > 0) {
    // Positive: white -> deep cyan/green
    const intensity = Math.min(Math.abs(value), 1);
    if (intensity < 0.3) return `rgba(34,211,238,${intensity * 0.15})`;
    return `rgba(34,211,238,${intensity * 0.45})`;
  }
  if (value < 0) {
    // Negative: white -> deep red
    const intensity = Math.min(Math.abs(value), 1);
    if (intensity < 0.3) return `rgba(239,68,68,${intensity * 0.15})`;
    return `rgba(239,68,68,${intensity * 0.45})`;
  }
  return 'transparent';
}

function getCorrelationTextColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return '#22d3ee';
  const abs = Math.abs(value);
  if (abs > 0.7) return '#ffffff';
  if (abs > 0.4) return '#e4e4e7';
  return '#a1a1aa';
}

function getValueColor(value: number): string {
  if (value > 0) return '#22c55e';
  if (value < 0) return '#ef4444';
  return '#a1a1aa';
}

function getRegimeBadge(regime: string): { color: string; bg: string } {
  switch (regime?.toLowerCase()) {
    case 'risk-on': return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    case 'risk-off': return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    case 'transition': return { color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
    case 'decorrelation': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    default: return { color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' };
  }
}

function getZScoreColor(z: number): string {
  const abs = Math.abs(z);
  if (abs >= 3) return '#ef4444';
  if (abs >= 2) return '#f97316';
  if (abs >= 1.5) return '#eab308';
  return '#a1a1aa';
}

// ── Main Panel ──

export function CrossAssetCorrelationPanel() {
  const t = useT();
  const { data, isLoading, error } = useCrossAssetCorrelation();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <rect x="7" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />
            <rect x="1" y="7" width="5" height="5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />
            <rect x="7" y="7" width="5" height="5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <line x1="3.5" y1="3.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'panelCrossAssetCorrelation', 'CROSS-ASSET CORRELATION')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <span className="text-[10px] font-mono text-cyan-400/40 uppercase tracking-widest">
              {tr(t, 'loading', 'LOADING...')}
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
              FAILED TO LOAD
            </span>
          </div>
        )}

        {!isLoading && !error && d && (
          <>
            {/* 1. Regime Analysis */}
            {d.regime && <RegimeAnalysis regime={d.regime} />}

            {/* 2. Correlation Matrix */}
            {d.matrix && <CorrelationMatrix matrix={d.matrix} />}

            {/* 3. Breakdown Alerts */}
            {d.breakdownAlerts && d.breakdownAlerts.length > 0 && (
              <BreakdownAlerts alerts={d.breakdownAlerts} />
            )}

            {/* 4. Rolling Comparison */}
            {d.rollingComparison && d.rollingComparison.length > 0 && (
              <RollingComparison pairs={d.rollingComparison} />
            )}

            {/* 5. PCA Analysis */}
            {d.pca && d.pca.length > 0 && <PCAAnalysis components={d.pca} />}

            {/* Bottom padding */}
            <div className="h-2" />
          </>
        )}
      </div>
    </div>
  );
}

// ── Regime Analysis ──

function RegimeAnalysis({ regime }: { regime: any }) {
  const badge = getRegimeBadge(regime.current);

  return (
    <div className="px-3 py-2 border-b border-border/20" style={{ background: badge.bg }}>
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        REGIME ANALYSIS
      </div>

      <div className="flex items-center gap-3">
        {/* Regime badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 border shrink-0"
          style={{ borderColor: badge.color, backgroundColor: badge.bg }}
        >
          <div
            className="w-1.5 h-1.5 animate-pulse"
            style={{ backgroundColor: badge.color }}
          />
          <span
            className="text-[10px] font-black font-mono uppercase tracking-tight"
            style={{ color: badge.color }}
          >
            {regime.current || 'UNKNOWN'}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-neutral-600 uppercase">AVG CORR</span>
            <span className="text-[9px] font-mono font-bold text-white tabular-nums text-right">
              {typeof regime.avgCorrelation === 'number' ? regime.avgCorrelation.toFixed(2) : '--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-neutral-600 uppercase">DISPERSION</span>
            <span className="text-[9px] font-mono font-bold text-white tabular-nums text-right">
              {typeof regime.dispersion === 'number' ? regime.dispersion.toFixed(2) : '--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-neutral-600 uppercase">DAYS IN</span>
            <span className="text-[9px] font-mono font-bold text-white tabular-nums text-right">
              {regime.daysInRegime ?? '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Correlation Matrix (Centerpiece) ──

function CorrelationMatrix({ matrix }: { matrix: any }) {
  const assets: string[] = matrix.assets || [];
  const values: number[][] = matrix.values || [];

  if (assets.length === 0) return null;

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        CORRELATION MATRIX
      </div>

      <div className="overflow-auto no-scrollbar">
        <table className="border-collapse" style={{ minWidth: assets.length * 42 + 52 }}>
          <thead>
            <tr>
              <th className="p-0.5 text-[7px] font-mono text-neutral-600 w-[52px] sticky left-0 bg-black z-10" />
              {assets.map((asset: string) => (
                <th
                  key={asset}
                  className="p-0.5 text-[7px] font-mono font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap text-center"
                  style={{ minWidth: 42 }}
                >
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row: number[], i: number) => (
              <tr key={assets[i]} className="hover:bg-cyan-400/[0.02]">
                <td className="p-0.5 text-[7px] font-mono font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-black z-10">
                  {assets[i]}
                </td>
                {row.map((val: number, j: number) => {
                  const isDiagonal = i === j;
                  return (
                    <td
                      key={j}
                      className="p-0.5 text-center border border-border/10"
                      style={{ backgroundColor: getCorrelationColor(val, isDiagonal) }}
                    >
                      <span
                        className="text-[8px] font-mono font-bold tabular-nums"
                        style={{ color: getCorrelationTextColor(val, isDiagonal) }}
                      >
                        {val.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-8 h-2" style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.45), transparent)' }} />
          <span className="text-[6px] font-mono text-neutral-500 uppercase">-1.0</span>
        </div>
        <span className="text-[6px] font-mono text-neutral-600">0</span>
        <div className="flex items-center gap-1">
          <span className="text-[6px] font-mono text-neutral-500 uppercase">+1.0</span>
          <div className="w-8 h-2" style={{ background: 'linear-gradient(to left, rgba(34,211,238,0.45), transparent)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Breakdown Alerts ──

function BreakdownAlerts({ alerts }: { alerts: any[] }) {
  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        BREAKDOWN ALERTS
      </div>

      <div className="flex flex-col gap-1">
        {alerts.map((alert: any, i: number) => {
          const zColor = getZScoreColor(alert.zScore || 0);
          const direction = alert.direction === 'up' ? '+' : alert.direction === 'down' ? '-' : '';
          const dirArrow = alert.direction === 'up' ? '\u25B2' : alert.direction === 'down' ? '\u25BC' : '';

          return (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 border border-border/15 bg-red-500/[0.03] hover:bg-red-500/[0.06] transition-colors"
            >
              {/* Direction indicator */}
              <span
                className="text-[10px] font-mono font-bold shrink-0"
                style={{ color: alert.direction === 'up' ? '#22c55e' : '#ef4444' }}
              >
                {dirArrow}
              </span>

              {/* Pair */}
              <span className="text-[8px] font-mono font-bold text-white flex-1 truncate">
                {alert.pair || alert.name || `ALERT ${i + 1}`}
              </span>

              {/* Z-Score */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[6px] font-mono text-neutral-600 uppercase">Z</span>
                <span
                  className="text-[9px] font-mono font-bold tabular-nums"
                  style={{ color: zColor }}
                >
                  {direction}{Math.abs(alert.zScore || 0).toFixed(2)}
                </span>
              </div>

              {/* Current vs Historical */}
              {alert.current != null && (
                <span className="text-[7px] font-mono text-neutral-500 shrink-0 tabular-nums">
                  {alert.current.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rolling Comparison ──

function RollingComparison({ pairs }: { pairs: any[] }) {
  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        ROLLING COMPARISON
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_50px_50px_50px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">PAIR</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">30D</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">60D</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">90D</span>
      </div>

      {/* Rows */}
      {pairs.map((pair: any, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_50px_50px_50px] gap-0 px-1 py-[3px] hover:bg-cyan-400/[0.02] border-b border-border/10 items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {pair.pair || pair.name || '--'}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: getValueColor(pair.corr30d ?? pair['30d'] ?? 0) }}
          >
            {(pair.corr30d ?? pair['30d'] ?? 0).toFixed(2)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: getValueColor(pair.corr60d ?? pair['60d'] ?? 0) }}
          >
            {(pair.corr60d ?? pair['60d'] ?? 0).toFixed(2)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: getValueColor(pair.corr90d ?? pair['90d'] ?? 0) }}
          >
            {(pair.corr90d ?? pair['90d'] ?? 0).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── PCA Analysis ──

function PCAAnalysis({ components }: { components: any[] }) {
  // Show top 3 components max
  const top = components.slice(0, 3);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        PCA ANALYSIS
      </div>

      <div className="flex flex-col gap-2">
        {top.map((comp: any, i: number) => {
          const variance = comp.varianceExplained ?? comp.variance ?? 0;
          const loadings: { asset: string; weight: number }[] = comp.topLoadings || comp.loadings || [];

          return (
            <div key={i} className="border border-border/15 bg-black/40 px-2 py-1.5">
              {/* Component header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase">
                  PC{i + 1}
                </span>
                <span className="text-[8px] font-mono font-bold text-white tabular-nums">
                  {(variance * 100).toFixed(1)}%
                </span>
              </div>

              {/* Variance bar */}
              <div className="w-full h-1.5 bg-border/10 mb-1.5">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(variance * 100, 100)}%`,
                    backgroundColor: i === 0 ? '#22d3ee' : i === 1 ? '#a78bfa' : '#f59e0b',
                    opacity: 0.7,
                  }}
                />
              </div>

              {/* Top loadings */}
              {loadings.length > 0 && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {loadings.slice(0, 5).map((loading: any, j: number) => (
                    <div key={j} className="flex items-center gap-0.5">
                      <span className="text-[7px] font-mono text-neutral-500">
                        {loading.asset || loading.name}
                      </span>
                      <span
                        className="text-[7px] font-mono font-bold tabular-nums"
                        style={{ color: getValueColor(loading.weight ?? loading.value ?? 0) }}
                      >
                        {(loading.weight ?? loading.value ?? 0) >= 0 ? '+' : ''}
                        {(loading.weight ?? loading.value ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
