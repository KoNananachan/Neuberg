import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityValuation() {
  return useQuery({
    queryKey: ['equity-valuation'],
    queryFn: () => api.get<any>('/equity-valuation'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
