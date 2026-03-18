import { useState } from 'react';
import { useT } from '../../i18n';
import type { TranslationKey } from '../../i18n/translations';
import { BarChart3, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// --- Static reference data (curated) ---

type IndicatorStatus = 'above' | 'below' | 'at';
type Direction = 'up' | 'down' | 'flat';

interface Indicator {
  key: string;
  nameKey: TranslationKey;
  current: string;
  previous: string;
  direction: Direction;
  status: IndicatorStatus;
  unit: string;
}

interface CentralBankRate {
  bank: string;
  nameKey: TranslationKey;
  rate: number;
  color: string;
}

const LAST_UPDATED = '2026-03-14';

const US_INDICATORS: Indicator[] = [
  { key: 'gdp', nameKey: 'econUsGdp', current: '2.3', previous: '2.8', direction: 'down', status: 'above', unit: '%' },
  { key: 'cpi', nameKey: 'econUsCpi', current: '2.8', previous: '3.0', direction: 'down', status: 'above', unit: '%' },
  { key: 'unemp', nameKey: 'econUsUnemployment', current: '4.1', previous: '4.0', direction: 'up', status: 'below', unit: '%' },
  { key: 'ffr', nameKey: 'econUsFedFunds', current: '4.50', previous: '4.75', direction: 'down', status: 'above', unit: '%' },
  { key: '10y', nameKey: 'econUs10y', current: '4.28', previous: '4.35', direction: 'down', status: 'at', unit: '%' },
  { key: 'cci', nameKey: 'econUsConsumerConf', current: '98.3', previous: '105.7', direction: 'down', status: 'below', unit: '' },
];

const EU_INDICATORS: Indicator[] = [
  { key: 'eugdp', nameKey: 'econEuGdp', current: '0.9', previous: '0.7', direction: 'up', status: 'below', unit: '%' },
  { key: 'eucpi', nameKey: 'econEuCpi', current: '2.4', previous: '2.6', direction: 'down', status: 'above', unit: '%' },
  { key: 'ecb', nameKey: 'econEuEcbRate', current: '2.65', previous: '2.90', direction: 'down', status: 'above', unit: '%' },
];

const CN_INDICATORS: Indicator[] = [
  { key: 'cngdp', nameKey: 'econCnGdp', current: '5.0', previous: '5.2', direction: 'down', status: 'at', unit: '%' },
  { key: 'cncpi', nameKey: 'econCnCpi', current: '0.5', previous: '0.7', direction: 'down', status: 'below', unit: '%' },
  { key: 'cnpmi', nameKey: 'econCnPmi', current: '50.2', previous: '49.8', direction: 'up', status: 'above', unit: '' },
];

const CENTRAL_BANK_RATES: CentralBankRate[] = [
  { bank: 'FED', nameKey: 'econCbFed', rate: 4.50, color: '#38bdf8' },
  { bank: 'ECB', nameKey: 'econCbEcb', rate: 2.65, color: '#facc15' },
  { bank: 'BOJ', nameKey: 'econCbBoj', rate: 0.50, color: '#f87171' },
  { bank: 'BOE', nameKey: 'econCbBoe', rate: 4.50, color: '#a78bfa' },
  { bank: 'PBOC', nameKey: 'econCbPboc', rate: 3.10, color: '#fb923c' },
  { bank: 'RBA', nameKey: 'econCbRba', rate: 4.10, color: '#34d399' },
];

type Tab = 'indicators' | 'rates';

export function EconomicIndicatorsPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('indicators');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {t('econPanelTitle')}
          </span>
        </div>
        <span className="text-[7px] font-mono text-neutral/30">
          {t('econLastUpdated')}: {LAST_UPDATED}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['indicators', 'rates'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(`econTab_${t_}` as TranslationKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'indicators' && <IndicatorsView />}
        {tab === 'rates' && <RatesView />}
      </div>
    </div>
  );
}

// --- Indicators Tab ---

function IndicatorsView() {
  const t = useT();

  return (
    <div>
      <RegionSection
        titleKey="econRegionUs"
        flag="US"
        indicators={US_INDICATORS}
      />
      <RegionSection
        titleKey="econRegionEu"
        flag="EU"
        indicators={EU_INDICATORS}
      />
      <RegionSection
        titleKey="econRegionCn"
        flag="CN"
        indicators={CN_INDICATORS}
      />

      {/* Footer note */}
      <div className="px-3 py-2 border-t border-border/20">
        <p className="text-[7px] font-mono text-neutral/25 leading-relaxed">
          {t('econDisclaimer')}
        </p>
      </div>
    </div>
  );
}

function RegionSection({
  titleKey,
  flag,
  indicators,
}: {
  titleKey: TranslationKey;
  flag: string;
  indicators: Indicator[];
}) {
  const t = useT();

  return (
    <div>
      {/* Region header */}
      <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border-b border-border/20">
        <span className="text-[8px] font-mono font-bold text-neutral/50">{flag}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-sky-400/60">
          {t(titleKey)}
        </span>
      </div>

      {/* Indicators grid */}
      <div className="grid grid-cols-2 gap-px bg-border/5">
        {indicators.map((ind) => (
          <IndicatorTile key={ind.key} indicator={ind} />
        ))}
      </div>
    </div>
  );
}

function IndicatorTile({ indicator }: { indicator: Indicator }) {
  const t = useT();
  const { nameKey, current, previous, direction, status, unit } = indicator;

  const DirectionIcon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  const directionColor =
    direction === 'up' ? 'text-bullish' : direction === 'down' ? 'text-bearish' : 'text-neutral/40';

  const statusLabel =
    status === 'above'
      ? t('econStatusAbove')
      : status === 'below'
        ? t('econStatusBelow')
        : t('econStatusAt');

  const statusColor =
    status === 'above' ? 'text-sky-400/50' : status === 'below' ? 'text-amber-400/50' : 'text-neutral/30';

  return (
    <div className="px-3 py-2 bg-black hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono text-neutral/50 uppercase truncate">
          {t(nameKey)}
        </span>
        <span className={`text-[7px] font-mono ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-[16px] font-mono font-black text-white">
          {current}{unit}
        </span>
        <DirectionIcon className={`w-3 h-3 ${directionColor}`} />
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[7px] font-mono text-neutral/30">
          {t('econPrevious')}: {previous}{unit}
        </span>
      </div>
    </div>
  );
}

// --- Rates Comparison Tab ---

function RatesView() {
  const t = useT();

  const maxRate = Math.max(...CENTRAL_BANK_RATES.map((r) => r.rate));
  const chartWidth = 260;
  const barHeight = 22;
  const gap = 6;
  const labelWidth = 50;
  const valueWidth = 40;
  const barAreaWidth = chartWidth - labelWidth - valueWidth;
  const svgHeight = CENTRAL_BANK_RATES.length * (barHeight + gap) + gap;

  return (
    <div>
      {/* Chart header */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-sky-400/60">
          {t('econRateComparison')}
        </span>
      </div>

      {/* SVG bar chart */}
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${chartWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: 220 }}>
          {CENTRAL_BANK_RATES.map((cbr, i) => {
            const y = gap + i * (barHeight + gap);
            const barW = maxRate > 0 ? (cbr.rate / maxRate) * barAreaWidth : 0;

            return (
              <g key={cbr.bank}>
                {/* Label */}
                <text
                  x={labelWidth - 4}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.45)"
                  fontSize={8}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cbr.bank}
                </text>

                {/* Bar background */}
                <rect
                  x={labelWidth}
                  y={y + 2}
                  width={barAreaWidth}
                  height={barHeight - 4}
                  rx={2}
                  fill="rgba(255,255,255,0.03)"
                />

                {/* Bar fill */}
                <rect
                  x={labelWidth}
                  y={y + 2}
                  width={barW}
                  height={barHeight - 4}
                  rx={2}
                  fill={cbr.color}
                  opacity={0.7}
                />

                {/* Value */}
                <text
                  x={labelWidth + barAreaWidth + 4}
                  y={y + barHeight / 2 + 4}
                  textAnchor="start"
                  fill={cbr.color}
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cbr.rate.toFixed(2)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Rate details table */}
      <div className="px-3 pb-2">
        <div className="grid grid-cols-[1fr_0.6fr_1.2fr] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
          <span>{t('econRateBank')}</span>
          <span className="text-right">{t('econRateValue')}</span>
          <span className="text-right">{t('econRateBar')}</span>
        </div>
        {CENTRAL_BANK_RATES.map((cbr) => {
          const pct = maxRate > 0 ? (cbr.rate / maxRate) * 100 : 0;
          return (
            <div
              key={cbr.bank}
              className="grid grid-cols-[1fr_0.6fr_1.2fr] px-2 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center"
            >
              <div>
                <span className="text-[9px] font-mono font-bold text-white">{cbr.bank}</span>
                <span className="text-[7px] font-mono text-neutral/30 ml-1.5">{t(cbr.nameKey)}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-right" style={{ color: cbr.color }}>
                {cbr.rate.toFixed(2)}%
              </span>
              <div className="flex items-center justify-end gap-1">
                <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: cbr.color, opacity: 0.6 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 px-3 py-2 border-t border-border/20">
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{t('econRateHighest')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {(() => {
              const highest = CENTRAL_BANK_RATES.reduce((a, b) => (a.rate > b.rate ? a : b));
              return `${highest.bank} ${highest.rate.toFixed(2)}%`;
            })()}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{t('econRateLowest')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {(() => {
              const lowest = CENTRAL_BANK_RATES.reduce((a, b) => (a.rate < b.rate ? a : b));
              return `${lowest.bank} ${lowest.rate.toFixed(2)}%`;
            })()}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral/30 uppercase">{t('econRateAvg')}</div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {(CENTRAL_BANK_RATES.reduce((s, r) => s + r.rate, 0) / CENTRAL_BANK_RATES.length).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/20">
        <p className="text-[7px] font-mono text-neutral/25 leading-relaxed">
          {t('econRateDisclaimer')}
        </p>
      </div>
    </div>
  );
}
