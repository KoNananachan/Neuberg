import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CorporateEvent {
  id: string;
  type: string;
  headline: string;
  target: string;
  targetTicker: string;
  acquirer: string | null;
  acquirerTicker: string | null;
  sector: string;
  announcedDate: string;
  expectedCloseDate: string | null;
  status: string;
  dealValue: number | null;
  premium: number | null;
  currentSpread: number | null;
  annualizedReturn: number | null;
  probability: number | null;
  targetPrice: number;
  offerPrice: number | null;
  daysToClose: number | null;
  catalyst: string;
  catalystDate: string | null;
  riskLevel: string;
  signal: string | null;
  spreadHistory: number[];
}

export interface EventDrivenSummary {
  totalDeals: number;
  avgSpread: number;
  avgAnnualizedReturn: number;
  newThisWeek: number;
  closedThisMonth: number;
  atRisk: number;
}

export interface SectorBreakdown {
  sector: string;
  count: number;
  avgPremium: number;
}

export interface EventDrivenData {
  events: CorporateEvent[];
  summary: EventDrivenSummary;
  sectorBreakdown: SectorBreakdown[];
  timestamp: string;
}

export function useEventDriven() {
  return useQuery<EventDrivenData>({
    queryKey: ['event-driven'],
    queryFn: () => api.get<EventDrivenData>('/event-driven'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}
