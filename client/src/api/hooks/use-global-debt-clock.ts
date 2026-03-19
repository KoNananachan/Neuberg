import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalDebtClock() {
  return useQuery({
    queryKey: ['global-debt-clock'],
    queryFn: () => api.get<any>('/global-debt-clock'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
