import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInterestRateSwap() {
  return useQuery({
    queryKey: ['interest-rate-swap'],
    queryFn: () => api.get<any>('/interest-rate-swap'),
    staleTime: 60 * 60 * 1000,
  });
}
