import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMacroIndicators() {
  return useQuery({
    queryKey: ['macro-indicators'],
    queryFn: () => api.get<any>('/macro-indicators'),
    staleTime: 60 * 60 * 1000,
  });
}
