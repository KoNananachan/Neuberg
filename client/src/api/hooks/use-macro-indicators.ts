import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMacroIndicators() {
  return useQuery({
    queryKey: ['macro-indicators'],
    queryFn: () => api.get<any>('/macro-indicators'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
