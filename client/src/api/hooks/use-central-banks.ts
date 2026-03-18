import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CentralBank {
  name: string;
  code: string;
  currency: string;
  currentRate: number;
  previousRate: number;
  lastChangeDate: string;
  lastChangeDirection: string;
  lastChangeBps: number;
  nextMeetingDate: string;
  daysToMeeting: number;
  marketExpectedRate: number;
  marketExpectedChange: number;
  marketProbHike: number;
  marketProbCut: number;
  marketProbHold: number;
  yearEndExpected: number;
  totalCutsExpected: number;
  inflationTarget: number;
  currentInflation: number;
  rateHistory: number[];
  bias: string;
}

export interface CentralBankResponse {
  banks: CentralBank[];
  globalAvgRate: number;
  globalBias: string;
  nextMajorMeeting: { bank: string; date: string; daysAway: number };
  timestamp: string;
}

export function useCentralBanks() {
  return useQuery<CentralBankResponse>({
    queryKey: ['central-banks'],
    queryFn: () => api.get<CentralBankResponse>('/central-banks'),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}
