import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalDebtClock() {
  return useQuery({
    queryKey: ['global-debt-clock'],
    queryFn: () => api.get<any>('/global-debt-clock'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
