import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMacroRisk() {
  return useQuery({
    queryKey: ['macro-risk'],
    queryFn: () => api.get<any>('/macro-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
