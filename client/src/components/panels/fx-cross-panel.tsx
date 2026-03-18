import { useState, useCallback } from 'react';
import { useFxCross } from '../../api/hooks/use-fx-cross';
import { useT } from '../../i18n';
import { Grid3X3, RefreshCw, X } from 'lucide-react';

/** Format rate with appropriate decimal places */
function formatRate(value: number): string {
  if (value === 0) return '---';
  if (value >= 1000) return value.toFixed(2);
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(4);
}

/** Cell background color based on rate value */
function getCellBg(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return 'rgba(30,58,138,0.15)'; // blue-900 tint for diagonal
  if (value === 0) return 'transparent';
  if (value > 1) {
    // Green tint — intensity scales with distance from 1
    const intensity = Math.min((value - 1) / 10, 0.5);
    return `rgba(34,197,94,${0.05 + intensity * 0.25})`;
  }
  if (value < 1) {
    // Red tint — intensity scales with distance from 1
    const intensity = Math.min((1 - value) / 0.5, 0.5);
    return `rgba(239,68,68,${0.05 + intensity * 0.25})`;
  }
  return 'transparent';
}

/** Text color for rate values */
function getTextColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return '#60a5fa'; // blue-400
  if (value === 0) return '#52525b';
  if (value > 1) return '#4ade80'; // green-400
  if (value < 1) return '#f87171'; // red-400
  return '#a1a1aa';
}

interface PairDetail {
  base: string;
  quote: string;
  rate: number;
  row: number;
  col: number;
}

export function FxCrossPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useFxCross();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedPair, setSelectedPair] = useState<PairDetail | null>(null);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!data || row === col) return;
      setSelectedPair({
        base: data.currencies[row],
        quote: data.currencies[col],
        rate: data.rates[row][col],
        row,
        col,
      });
    },
    [data],
  );

  const handleCellHover = useCallback((row: number | null, col: number | null) => {
    setHoveredRow(row);
    setHoveredCol(col);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-blue-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {t('fxcTitle')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.updatedAt && (
            <span className="text-[7px] font-mono text-neutral/30">
              {t('fxcUpdated')}: {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar p-2">
        {/* Loading */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              {t('fxcLoading')}
            </span>
          </div>
        )}

        {/* Error */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
              {t('fxcError')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[9px] font-mono text-blue-400 hover:text-white border border-blue-400/30 px-2 py-0.5 transition-colors"
            >
              {t('fxcRetry')}
            </button>
          </div>
        )}

        {/* Matrix */}
        {data && data.currencies.length > 0 && (
          <>
            <div className="overflow-auto">
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    {/* Corner cell with base/quote label */}
                    <th className="p-1 text-[7px] font-mono text-neutral/20 w-10 sticky left-0 bg-black z-10">
                      <div className="flex flex-col">
                        <span>{t('fxcBase')}</span>
                        <span className="text-[6px]">\ {t('fxcQuote')}</span>
                      </div>
                    </th>
                    {data.currencies.map((ccy, j) => (
                      <th
                        key={ccy}
                        className={`p-1 text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                          hoveredCol === j ? 'text-white bg-blue-400/10' : 'text-blue-400'
                        }`}
                      >
                        {ccy}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rates.map((row, i) => (
                    <tr key={data.currencies[i]}>
                      {/* Row header */}
                      <td
                        className={`p-1 text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 bg-black z-10 transition-colors ${
                          hoveredRow === i ? 'text-white bg-blue-400/10' : 'text-blue-400'
                        }`}
                      >
                        {data.currencies[i]}
                      </td>
                      {row.map((val, j) => {
                        const isDiagonal = i === j;
                        const isHighlighted =
                          hoveredRow === i || hoveredCol === j;
                        const isIntersection =
                          hoveredRow === i && hoveredCol === j;
                        return (
                          <td
                            key={j}
                            className={`p-1 text-center border border-border/10 cursor-pointer transition-all ${
                              isDiagonal ? 'cursor-default' : ''
                            } ${isHighlighted && !isDiagonal ? 'ring-1 ring-inset ring-blue-400/20' : ''} ${
                              isIntersection ? 'ring-1 ring-inset ring-blue-400/40' : ''
                            }`}
                            style={{ backgroundColor: getCellBg(val, isDiagonal) }}
                            onClick={() => handleCellClick(i, j)}
                            onMouseEnter={() => handleCellHover(i, j)}
                            onMouseLeave={() => handleCellHover(null, null)}
                          >
                            <span
                              className="text-[9px] font-mono font-bold tabular-nums"
                              style={{ color: getTextColor(val, isDiagonal) }}
                            >
                              {isDiagonal ? '1.0000' : formatRate(val)}
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
            <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-border/10">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-border/20" style={{ backgroundColor: 'rgba(34,197,94,0.2)' }} />
                <span className="text-[7px] font-mono text-neutral/40">{t('fxcLegendBuy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-border/20" style={{ backgroundColor: 'rgba(30,58,138,0.15)' }} />
                <span className="text-[7px] font-mono text-neutral/40">{t('fxcLegendPar')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-border/20" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }} />
                <span className="text-[7px] font-mono text-neutral/40">{t('fxcLegendSell')}</span>
              </div>
            </div>
          </>
        )}

        {/* No data */}
        {!isLoading && !error && (!data || data.currencies.length === 0) && (
          <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            {t('fxcNoData')}
          </div>
        )}
      </div>

      {/* Pair detail overlay */}
      {selectedPair && data && (
        <div className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center">
          <div className="bg-[#0a0a0a] border border-border/30 p-4 min-w-[220px] max-w-[280px]">
            {/* Detail header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black font-mono text-blue-400 uppercase tracking-wider">
                {selectedPair.base}/{selectedPair.quote}
              </span>
              <button
                onClick={() => setSelectedPair(null)}
                className="p-0.5 text-neutral/40 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Rate info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono text-neutral/50 uppercase">
                  {t('fxcRate')}
                </span>
                <span
                  className="text-[13px] font-mono font-bold tabular-nums"
                  style={{ color: getTextColor(selectedPair.rate, false) }}
                >
                  {formatRate(selectedPair.rate)}
                </span>
              </div>

              <div className="border-t border-border/20 pt-2">
                <div className="text-[7px] font-mono text-neutral/30 mb-1">
                  1 {selectedPair.base} = {formatRate(selectedPair.rate)} {selectedPair.quote}
                </div>
              </div>

              {/* Inverse rate */}
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono text-neutral/50 uppercase">
                  {t('fxcInverse')}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral/70 tabular-nums">
                  {selectedPair.rate > 0 ? formatRate(1 / selectedPair.rate) : '---'}
                </span>
              </div>

              <div className="border-t border-border/20 pt-2">
                <div className="text-[7px] font-mono text-neutral/30">
                  1 {selectedPair.quote} ={' '}
                  {selectedPair.rate > 0 ? formatRate(1 / selectedPair.rate) : '---'}{' '}
                  {selectedPair.base}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedPair(null)}
              className="mt-3 w-full text-[8px] font-mono text-blue-400 hover:text-white border border-blue-400/30 hover:border-blue-400/60 px-2 py-1 transition-colors uppercase tracking-wider"
            >
              {t('fxcClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
