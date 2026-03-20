import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalDebtClock() {
  return useQuery({
    queryKey: ['global-debt-clock'],
    queryFn: () => api.get<any>('/global-debt-clock'),
    staleTime: 60 * 60 * 1000,
  });
}
