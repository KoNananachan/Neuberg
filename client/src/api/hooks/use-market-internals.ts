import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface AdvanceDecline {
  advancing: number;
  declining: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  adLine5dMA: number;
  adLine20dMA: number;
}

export interface NewHighsLows {
  newHighs: number;
  newLows: number;
  hlRatio: number;
  hlDiff: number;
  hlDiff10dMA: number;
}

export interface VolumeData {
  upVolume: number;
  downVolume: number;
  unchangedVolume: number;
  uvdvRatio: number;
}

export interface McClellan {
  oscillator: number;
  summationIndex: number;
  signal: number;
  divergence: 'Bullish' | 'Bearish' | 'None';
}

export interface Trin {
  value: number;
  interpretation: 'Oversold' | 'Neutral' | 'Overbought';
  ma5d: number;
}

export interface TickIndex {
  current: number;
  high: number;
  low: number;
  close: number;
}

export interface PercentAboveMA {
  above20dMA: number;
  above50dMA: number;
  above200dMA: number;
}

export interface BreadthThrust {
  value: number;
  thrustSignal: boolean;
  lastThrustDate: string | null;
}

export interface ExchangeData {
  exchange: string;
  advanceDecline: AdvanceDecline;
  newHighsLows: NewHighsLows;
  volume: VolumeData;
  mcclellan: McClellan;
  trin: Trin;
  tickIndex: TickIndex;
  percentAboveMA: PercentAboveMA;
  breadthThrust: BreadthThrust;
}

export interface HistoryEntry {
  date: string;
  adRatio: number;
  mcclellanOsc: number;
  trin: number;
  pctAbove200MA: number;
}

export interface MarketInternalsData {
  exchanges: ExchangeData[];
  history: HistoryEntry[];
  generatedAt: string;
}

export function useMarketInternals() {
  return useQuery({
    queryKey: ['market-internals'],
    queryFn: () => api.get<MarketInternalsData>('/market-internals'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
