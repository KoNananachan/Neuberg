import { useState } from 'react';
import { GlassCard } from '../common/glass-card';
import { useCompanyProfile, type CompanyProfile } from '../../api/hooks/use-company-profile';
import { useAppStore } from '../../stores/use-app-store';
import { Building2, RefreshCw, ExternalLink, Users, MapPin, Globe } from 'lucide-react';
import { useT } from '../../i18n';

function formatLargeNumber(value: number | null): string {
  if (value == null) return '-';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number | null): string {
  if (value == null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function formatCompensation(value: number | null): string {
  if (value == null) return '-';
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function ratingColor(key: string | null): string {
  switch (key) {
    case 'strong_buy': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    case 'buy': return 'text-green-400 bg-green-500/20 border-green-500/40';
    case 'hold': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    case 'underperform': return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    case 'sell': return 'text-red-400 bg-red-500/20 border-red-500/40';
    default: return 'text-neutral/50 bg-neutral/10 border-neutral/20';
  }
}

function ratingLabel(key: string | null): string {
  switch (key) {
    case 'strong_buy': return 'STRONG BUY';
    case 'buy': return 'BUY';
    case 'hold': return 'HOLD';
    case 'underperform': return 'UNDERPERFORM';
    case 'sell': return 'SELL';
    default: return '-';
  }
}

function LocationText({ profile }: { profile: CompanyProfile }) {
  const parts = [profile.city, profile.state, profile.country].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-1 text-neutral/50 text-[9px]">
      <MapPin size={9} className="text-neutral/30 shrink-0" />
      <span>{parts.join(', ')}</span>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] px-2 py-1.5 rounded">
      <div className="text-[8px] text-neutral/40 uppercase tracking-wider font-mono mb-0.5">{label}</div>
      <div className="text-[11px] text-neutral/90 font-mono font-bold">{value}</div>
      {sub && <div className="text-[8px] text-neutral/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProfileContent({ profile }: { profile: CompanyProfile }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex-1 overflow-auto min-h-0 px-3 py-2 space-y-3">
      {/* Company Header */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-bold text-white font-mono truncate">
              {profile.name || profile.symbol}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {profile.industry && (
                <span className="inline-block px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded">
                  {profile.industry}
                </span>
              )}
              {profile.sector && (
                <span className="inline-block px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded">
                  {profile.sector}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[9px]">
          <LocationText profile={profile} />
          {profile.fullTimeEmployees != null && (
            <div className="flex items-center gap-1 text-neutral/50">
              <Users size={9} className="text-neutral/30" />
              <span>{profile.fullTimeEmployees.toLocaleString()} {t('cpEmployees').toLowerCase()}</span>
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400/80 hover:text-blue-400 transition-colors"
            >
              <Globe size={9} />
              <span className="truncate max-w-[140px]">
                {profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </span>
              <ExternalLink size={7} />
            </a>
          )}
        </div>
      </div>

      {/* Business Summary */}
      {profile.longBusinessSummary && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-wider">{t('cpSummary')}</div>
          <div className="relative">
            <p className={`text-[10px] text-neutral/60 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
              {profile.longBusinessSummary}
            </p>
            {profile.longBusinessSummary.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[9px] text-blue-400/80 hover:text-blue-400 font-mono mt-0.5 transition-colors"
              >
                {expanded ? t('cpShowLess') : t('cpShowMore')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="space-y-1">
        <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-wider">{t('cpMetrics')}</div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5">
          <MetricCard
            label="Revenue"
            value={formatLargeNumber(profile.totalRevenue)}
            sub={profile.revenueGrowth != null ? `Growth: ${formatPercent(profile.revenueGrowth)}` : undefined}
          />
          <MetricCard label="Gross Margin" value={formatPercent(profile.grossMargins)} />
          <MetricCard label="Op. Margin" value={formatPercent(profile.operatingMargins)} />
          <MetricCard label="Profit Margin" value={formatPercent(profile.profitMargins)} />
          <MetricCard label="ROE" value={formatPercent(profile.returnOnEquity)} />
          <MetricCard label="ROA" value={formatPercent(profile.returnOnAssets)} />
          <MetricCard label="Free Cash Flow" value={formatLargeNumber(profile.freeCashflow)} />
          <MetricCard
            label="Earnings Growth"
            value={formatPercent(profile.earningsGrowth)}
          />
          <MetricCard
            label="Analyst Target"
            value={profile.targetMeanPrice != null ? `$${profile.targetMeanPrice.toFixed(2)}` : '-'}
            sub={profile.numberOfAnalysts != null ? `${profile.numberOfAnalysts} analysts` : undefined}
          />
        </div>

        {/* Recommendation Badge */}
        {profile.recommendationKey && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] text-neutral/40 font-mono uppercase">Consensus:</span>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded border ${ratingColor(profile.recommendationKey)}`}>
              {ratingLabel(profile.recommendationKey)}
            </span>
          </div>
        )}
      </div>

      {/* Key Officers Table */}
      {profile.officers.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono text-neutral/40 uppercase tracking-wider">{t('cpOfficers')}</div>
          <div className="border border-white/[0.04] rounded overflow-hidden">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                  <th className="text-left px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider">Name</th>
                  <th className="text-left px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider">Title</th>
                  <th className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider">Age</th>
                  <th className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider">Comp.</th>
                </tr>
              </thead>
              <tbody>
                {profile.officers.map((officer, i) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td className="px-2 py-1 text-neutral/80">{officer.name}</td>
                    <td className="px-2 py-1 text-neutral/50 truncate max-w-[140px]">{officer.title}</td>
                    <td className="text-right px-2 py-1 text-neutral/50">{officer.age ?? '-'}</td>
                    <td className="text-right px-2 py-1 text-neutral/70">{formatCompensation(officer.totalPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function CompanyProfilePanel() {
  const t = useT();
  const symbol = useAppStore((s) => s.selectedSymbol);
  const { data, isLoading, refetch, dataUpdatedAt } = useCompanyProfile();

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-blue-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {t('panelCompanyProfile')}
          </span>
          {symbol && (
            <span className="text-[10px] font-mono font-bold text-blue-400 ml-1">
              {symbol}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[9px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-blue-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!symbol ? (
        <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {t('cpNoSymbol')}
        </div>
      ) : isLoading && !data ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
          {t('cpNoData')}
        </div>
      ) : (
        <ProfileContent profile={data} />
      )}
    </GlassCard>
  );
}
