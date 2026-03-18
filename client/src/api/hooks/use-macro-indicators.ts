import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMacroIndicators() {
  return useQuery({
    queryKey: ['macro-indicators'],
    queryFn: () => api.get<any>('/macro-indicators'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
